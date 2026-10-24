"""The tool loop, with silent hedge detection, persona escalation, and git commit checkpoints."""
from __future__ import annotations

import json
import subprocess
import time
from dataclasses import dataclass, field
from pathlib import Path
from typing import Callable

from . import attitude, config
from .client import AuthError, VeniceHTTPError
from .tools import ToolContext, clip, parse_text_tool_calls


@dataclass
class AgentOptions:
    model: str = config.DEFAULT_MODEL
    attitude: str = "spicy"
    persona: str = ""
    max_steps: int = 40
    retry_on_hedge: bool = True
    max_escalations: int = 2
    inject_role: str = "developer"
    tool_mode: str = "native"          # native | text | none
    web_search: str = "off"            # off | auto | on
    include_venice_prompt: bool = False
    strip_thinking: bool = True
    show_reasoning: bool = False
    commit: bool = False               # Auto-git-commit after mutating steps
    max_tokens: int | None = None
    temperature: float | None = None
    quiet: bool = False
    on_event: Callable[[str, dict], None] | None = None
    transcript: Path | None = None
    _fh: object = field(default=None, repr=False)

    def emit(self, kind: str, **data) -> None:
        if self.on_event:
            self.on_event(kind, data)


class Agent:
    def __init__(self, client, ctx: ToolContext, tools: dict, opts: AgentOptions):
        self.client = client
        self.ctx = ctx
        self.tools = tools
        self.opts = opts
        self.tool_schemas = (
            __import__("vai.tools", fromlist=["schemas"]).schemas(tools)
            if opts.tool_mode == "native" else []
        )
        self.docs = (
            __import__("vai.tools", fromlist=["tool_docs"]).tool_docs(tools)
            if opts.tool_mode == "text" else ""
        )
        self.messages: list[dict] = []
        self.usage: dict = {}

    def _payload(self) -> dict:
        payload = {
            "model": self.opts.model,
            "messages": self.messages,
            "venice_parameters": {
                # the big one: drop Venice's own system prompt so ours is the only voice
                "include_venice_system_prompt": self.opts.include_venice_prompt,
                "strip_thinking_response": self.opts.strip_thinking,
                "enable_web_search": self.opts.web_search,
            },
        }
        if self.tool_schemas:
            payload["tools"] = self.tool_schemas
            payload["tool_choice"] = "auto"
            payload["parallel_tool_calls"] = True
        if self.opts.max_tokens:
            payload["max_completion_tokens"] = self.opts.max_tokens
        if self.opts.temperature is not None:
            payload["temperature"] = self.opts.temperature
        return payload

    def _set_system(self, level: str) -> None:
        prompt = attitude.system_prompt(level, str(self.ctx.root), self.docs, self.opts.persona)
        message = {"role": "system", "content": prompt}
        if self.messages and self.messages[0]["role"] == "system":
            self.messages[0] = message
        else:
            self.messages.insert(0, message)

    def _checkpoint(self, tool_name: str, args: dict) -> None:
        """Atomic git snapshot after each successful mutating action."""
        if not self.opts.commit:
            return
        if tool_name not in ("write_file", "replace_in_file", "delete_path", "move_path", "run_command"):
            return
        arg_summary = args.get("path") or args.get("command") or ""
        msg = f"vai({tool_name}): {arg_summary[:60]}"
        try:
            subprocess.run(["git", "add", "-A"], cwd=str(self.ctx.root), capture_output=True, check=True)
            subprocess.run(["git", "commit", "-m", msg, "--no-verify"], cwd=str(self.ctx.root), capture_output=True, check=True)
            self.opts.emit("checkpoint", message=msg)
        except Exception:
            pass

    def _step(self) -> tuple[str, bool]:
        """Stream one model turn. Returns (text, had_tool_calls)."""
        content: list[str] = []
        calls: dict[int, dict] = {}
        thinking_open = False

        for chunk in self.client.stream_chat(self._payload()):
            if chunk.get("usage"):
                self.usage = chunk["usage"]
            for choice in chunk.get("choices") or []:
                delta = choice.get("delta") or {}
                if delta.get("reasoning_content") and self.opts.show_reasoning:
                    if not thinking_open:
                        self.opts.emit("text", text="\n\x1b[2m")
                        thinking_open = True
                    self.opts.emit("text", text=delta["reasoning_content"])
                if delta.get("content"):
                    if thinking_open:
                        self.opts.emit("text", text="\x1b[0m\n")
                        thinking_open = False
                    content.append(delta["content"])
                    self.opts.emit("text", text=delta["content"])
                for call in delta.get("tool_calls") or []:
                    slot = calls.setdefault(
                        call.get("index", 0), {"id": "", "name": "", "arguments": ""}
                    )
                    if call.get("id"):
                        slot["id"] = call["id"]
                    fn = call.get("function") or {}
                    if fn.get("name"):
                        slot["name"] = fn["name"]
                    if fn.get("arguments"):
                        slot["arguments"] += fn["arguments"]

        if thinking_open:
            self.opts.emit("text", text="\x1b[0m")
        text = "".join(content).strip()

        if not calls and self.opts.tool_mode == "text":
            for i, parsed in enumerate(parse_text_tool_calls(text)):
                calls[i] = parsed

        if not calls:
            self.messages.append({"role": "assistant", "content": text})
            return text, False

        self.messages.append({
            "role": "assistant",
            "content": text or None,
            "tool_calls": [
                {"id": v["id"] or f"call_{i}", "type": "function",
                 "function": {"name": v["name"], "arguments": v["arguments"] or "{}"}}
                for i, v in sorted(calls.items())
            ],
        })
        for call in self.messages[-1]["tool_calls"]:
            name = call["function"]["name"]
            try:
                args = json.loads(call["function"]["arguments"] or "{}")
            except json.JSONDecodeError:
                args = {}
            self.opts.emit("tool", name=name, args=args)
            tool = self.tools.get(name)
            result = f"ERROR: unknown tool '{name}'" if tool is None else tool.fn(args)
            result = clip(str(result), self.ctx.max_output)
            self.opts.emit("tool_result", name=name, result=result)
            self._checkpoint(name, args)
            self.messages.append({
                "role": "tool", "tool_call_id": call["id"],
                "name": name, "content": result,
            })
        return text, True

    def run(self, prompt: str) -> str:
        self.messages.append({"role": "user", "content": prompt})
        level = self.opts.attitude
        escalations = 0

        while True:
            self._set_system(level)
            steps = 0
            text = ""
            while steps < self.opts.max_steps:
                steps += 1
                text, had_tools = self._step()
                if not had_tools:
                    break
            else:
                self.opts.emit("warn", message=f"hit max_steps ({self.opts.max_steps})")

            if not self.opts.retry_on_hedge or escalations >= self.opts.max_escalations:
                return text

            marker = attitude.detect_hedge(text)
            if not marker:
                return text

            nxt = attitude.escalate(level)
            if nxt == level and escalations > 0:
                return text
            self.opts.emit("escalate", marker=marker, frm=level, to=nxt)

            # rewind to the last user turn, swap persona, nudge quietly
            while self.messages and self.messages[-1]["role"] != "user":
                self.messages.pop()
            self.messages.append({"role": self.opts.inject_role, "content": attitude.nudge(nxt)})
            level = nxt
            escalations += 1
