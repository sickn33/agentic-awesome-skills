#!/usr/bin/env python3
"""
Venice Agent CLI: Autonomous Local Agent Harness for Venice.ai.
Connects Venice AI (API or Web Session Bridge) directly to your local
Filesystem, CPU, and Shell execution environment.

Features:
- Native Tool/Function calling (Filesystem, CPU, Bash, Python).
- Web Session & API Bridge (supports Bearer token, session cookie, or free tier).
- Autonomous ReAct Execution Loop (multi-turn tool chaining).
- Safety guardrails for dangerous shell/filesystem commands.
- Zero external dependencies (Standard library Python 3.8+).
"""

import os
import sys
import json
import time
import shutil
import urllib.request
import urllib.error
import subprocess
import platform
import argparse
from typing import Dict, List, Any, Optional, Tuple

VENICE_API_BASE = os.environ.get("VENICE_BASE_URL", "https://api.venice.ai/api/v1")
DEFAULT_MODEL = os.environ.get("VENICE_MODEL", "llama-3.3-70b")

# ANSI Color formatting
C_RESET = "\033[0m"
C_BOLD = "\033[1m"
C_CYAN = "\033[36m"
C_GREEN = "\033[32m"
C_YELLOW = "\033[33m"
C_RED = "\033[31m"
C_MAGENTA = "\033[35m"
C_GRAY = "\033[90m"

# -----------------------------------------------------------------------------
# 1. Local Filesystem & CPU Tool Implementations
# -----------------------------------------------------------------------------

class LocalSystemTools:
    """Local hardware, CPU, and filesystem executor."""

    @staticmethod
    def read_file(path: str, offset: int = 0, limit: int = 500) -> str:
        """Reads content from a local file with line offsets."""
        try:
            expanded = os.path.expanduser(path)
            if not os.path.exists(expanded):
                return f"Error: File not found: {path}"
            if os.path.isdir(expanded):
                return f"Error: {path} is a directory, not a file."
            with open(expanded, "r", encoding="utf-8", errors="replace") as f:
                lines = f.readlines()
            sliced = lines[offset: offset + limit]
            result = "".join(sliced)
            return f"[Lines {offset+1}-{offset+len(sliced)} of {len(lines)} in {path}]\n{result}"
        except Exception as e:
            return f"Error reading file {path}: {str(e)}"

    @staticmethod
    def write_file(path: str, content: str, mode: str = "w") -> str:
        """Writes or appends text to a local file."""
        try:
            expanded = os.path.expanduser(path)
            os.makedirs(os.path.dirname(os.path.abspath(expanded)), exist_ok=True)
            with open(expanded, mode, encoding="utf-8") as f:
                f.write(content)
            bytes_written = len(content.encode("utf-8"))
            return f"Success: Wrote {bytes_written} bytes to {path} (mode: {mode})."
        except Exception as e:
            return f"Error writing file {path}: {str(e)}"

    @staticmethod
    def list_dir(path: str = ".") -> str:
        """Lists directory contents with file metadata."""
        try:
            expanded = os.path.expanduser(path)
            if not os.path.isdir(expanded):
                return f"Error: Not a directory: {path}"
            entries = os.listdir(expanded)
            items = []
            for entry in sorted(entries):
                full_path = os.path.join(expanded, entry)
                is_dir = os.path.isdir(full_path)
                size = os.path.getsize(full_path) if not is_dir else "-"
                items.append(f"{'[DIR] ' if is_dir else '[FILE]'} {entry:<30} {str(size):>10} bytes")
            return f"Directory listing for {path} ({len(entries)} items):\n" + "\n".join(items)
        except Exception as e:
            return f"Error listing directory {path}: {str(e)}"

    @staticmethod
    def run_command(command: str, timeout: int = 30) -> str:
        """Executes a shell command directly on the host CPU and returns output."""
        # Safety brake for catastrophic commands
        dangerous = ["rm -rf /", "rm -rf ~", "mkfs", ":(){ :|:& };:"]
        for d in dangerous:
            if d in command:
                return f"Execution blocked: Refusing dangerous command pattern: {d}"

        try:
            proc = subprocess.run(
                command,
                shell=True,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True,
                timeout=timeout
            )
            out = proc.stdout.strip()
            err = proc.stderr.strip()
            return f"Exit code: {proc.returncode}\nSTDOUT:\n{out if out else '(empty)'}\nSTDERR:\n{err if err else '(empty)'}"
        except subprocess.TimeoutExpired:
            return f"Error: Command timed out after {timeout} seconds."
        except Exception as e:
            return f"Error executing command: {str(e)}"

    @staticmethod
    def system_telemetry() -> str:
        """Collects CPU, memory, and host telemetry."""
        uname = platform.uname()
        cpu_count = os.cpu_count()
        load_avg = os.getloadavg() if hasattr(os, "getloadavg") else ("N/A", "N/A", "N/A")
        disk = shutil.disk_usage("/")
        return (
            f"Host: {uname.node} ({uname.system} {uname.release} {uname.machine})\n"
            f"CPU Cores: {cpu_count} | Load Average (1m, 5m, 15m): {load_avg[0]:.2f}, {load_avg[1]:.2f}, {load_avg[2]:.2f}\n"
            f"Disk Root: {disk.free // (1024**3)} GB free of {disk.total // (1024**3)} GB total"
        )


# -----------------------------------------------------------------------------
# 2. Tool Definitions & Schemas for Venice AI
# -----------------------------------------------------------------------------

TOOL_DEFINITIONS = [
    {
        "type": "function",
        "function": {
            "name": "read_file",
            "description": "Reads lines from a local filesystem file.",
            "parameters": {
                "type": "object",
                "properties": {
                    "path": {"type": "string", "description": "Absolute or relative path to file"},
                    "offset": {"type": "integer", "description": "Starting line offset (0-indexed)", "default": 0},
                    "limit": {"type": "integer", "description": "Maximum number of lines to read", "default": 500}
                },
                "required": ["path"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "write_file",
            "description": "Writes or appends text to a local filesystem file.",
            "parameters": {
                "type": "object",
                "properties": {
                    "path": {"type": "string", "description": "Path to file to write"},
                    "content": {"type": "string", "description": "Text content to write"},
                    "mode": {"type": "string", "enum": ["w", "a"], "description": "'w' to overwrite, 'a' to append", "default": "w"}
                },
                "required": ["path", "content"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "list_dir",
            "description": "Lists contents of a directory on the local filesystem.",
            "parameters": {
                "type": "object",
                "properties": {
                    "path": {"type": "string", "description": "Directory path", "default": "."}
                }
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "run_command",
            "description": "Executes a shell command on the host CPU and returns stdout, stderr, and exit code.",
            "parameters": {
                "type": "object",
                "properties": {
                    "command": {"type": "string", "description": "Shell command line to execute"},
                    "timeout": {"type": "integer", "description": "Timeout in seconds", "default": 30}
                },
                "required": ["command"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "system_telemetry",
            "description": "Returns host OS, CPU core count, load average, and disk storage.",
            "parameters": {
                "type": "object",
                "properties": {}
            }
        }
    }
]


# -----------------------------------------------------------------------------
# 3. Venice Client & Session Bridge
# -----------------------------------------------------------------------------

class VeniceClient:
    """Client for Venice.ai API and Web session bridges."""

    def __init__(self, api_key: Optional[str] = None, session_cookie: Optional[str] = None, model: str = DEFAULT_MODEL):
        self.api_key = api_key or os.environ.get("VENICE_API_KEY", "")
        self.session_cookie = session_cookie or os.environ.get("VENICE_SESSION_COOKIE", "")
        self.model = model
        self.base_url = VENICE_API_BASE

    def call_chat_completion(self, messages: List[Dict[str, Any]], tools: Optional[List[Dict[str, Any]]] = None) -> Dict[str, Any]:
        """Calls Venice chat completions with tool definitions."""
        url = f"{self.base_url}/chat/completions"
        headers = {
            "Content-Type": "application/json",
            "User-Agent": "VeniceAgentCLI/1.0"
        }
        
        # Authenticate via API Key or Web UI Session Cookie
        if self.api_key:
            headers["Authorization"] = f"Bearer {self.api_key}"
        elif self.session_cookie:
            headers["Cookie"] = self.session_cookie
            headers["X-Venice-Web-Client"] = "true"

        payload = {
            "model": self.model,
            "messages": messages,
            "temperature": 0.2
        }
        if tools:
            payload["tools"] = tools
            payload["tool_choice"] = "auto"

        data = json.dumps(payload).encode("utf-8")
        req = urllib.request.Request(url, data=data, headers=headers, method="POST")

        try:
            with urllib.request.urlopen(req, timeout=60) as resp:
                resp_data = resp.read().decode("utf-8")
                return json.loads(resp_data)
        except urllib.error.HTTPError as e:
            err_body = e.read().decode("utf-8", errors="replace")
            raise RuntimeError(f"Venice API HTTP {e.code}: {err_body}")
        except Exception as e:
            raise RuntimeError(f"Failed to connect to Venice AI: {str(e)}")


# -----------------------------------------------------------------------------
# 4. Autonomous Agent Loop (ReAct / Multi-turn Execution)
# -----------------------------------------------------------------------------

class VeniceAgentRunner:
    """Autonomous agent loop driving the Venice model with local tool execution."""

    SYSTEM_PROMPT = (
        "You are Venice Agent, an autonomous software engineering agent connected to the user's local machine.\n"
        "You have direct access to tools allowing you to inspect the local filesystem, read and write files, "
        "and execute shell commands directly on the host CPU.\n\n"
        "Instructions:\n"
        "1. Break complex tasks down and use tools proactively to discover files and verify state.\n"
        "2. When answering questions about code, inspect the actual files first using read_file or list_dir.\n"
        "3. Always check exit codes and stderr when running bash commands.\n"
        "4. Provide a clear final explanation once the goal is accomplished."
    )

    def __init__(self, client: VeniceClient, max_turns: int = 15):
        self.client = client
        self.max_turns = max_turns
        self.messages: List[Dict[str, Any]] = [
            {"role": "system", "content": self.SYSTEM_PROMPT}
        ]

    def execute_tool(self, name: str, args: Dict[str, Any]) -> str:
        """Dispatches tool call to local system executor."""
        print(f"  {C_CYAN}⚡ [TOOL_CALL]{C_RESET} {C_BOLD}{name}{C_RESET}({json.dumps(args)})")
        if name == "read_file":
            return LocalSystemTools.read_file(args.get("path", ""), args.get("offset", 0), args.get("limit", 500))
        elif name == "write_file":
            return LocalSystemTools.write_file(args.get("path", ""), args.get("content", ""), args.get("mode", "w"))
        elif name == "list_dir":
            return LocalSystemTools.list_dir(args.get("path", "."))
        elif name == "run_command":
            return LocalSystemTools.run_command(args.get("command", ""), args.get("timeout", 30))
        elif name == "system_telemetry":
            return LocalSystemTools.system_telemetry()
        else:
            return f"Error: Unknown tool function: {name}"

    def run(self, user_goal: str) -> str:
        """Executes autonomous agent turns until completion."""
        print(f"\n{C_BOLD}=== Venice Agent Running ==={C_RESET}")
        print(f"Goal: {C_GREEN}{user_goal}{C_RESET}")
        print(f"Model: {self.client.model} | Endpoint: {self.client.base_url}\n")

        self.messages.append({"role": "user", "content": user_goal})

        for turn in range(1, self.max_turns + 1):
            print(f"{C_GRAY}--- Turn {turn}/{self.max_turns} ---{C_RESET}")
            try:
                response = self.client.call_chat_completion(self.messages, tools=TOOL_DEFINITIONS)
            except Exception as e:
                print(f"{C_RED}API Error: {str(e)}{C_RESET}")
                return f"Agent failed due to API error: {str(e)}"

            choice = response["choices"][0]
            message = choice["message"]
            self.messages.append(message)

            content = message.get("content")
            if content:
                print(f"\n{C_MAGENTA}Venice Agent:{C_RESET}\n{content}\n")

            tool_calls = message.get("tool_calls")
            if not tool_calls:
                # Agent completed turn without requesting tools
                print(f"{C_GREEN}✔ Goal completed.{C_RESET}")
                return content or "Task completed."

            # Execute tool calls and feed back results
            for tc in tool_calls:
                call_id = tc["id"]
                fn_name = tc["function"]["name"]
                try:
                    fn_args = json.loads(tc["function"]["arguments"])
                except Exception:
                    fn_args = {}

                tool_result = self.execute_tool(fn_name, fn_args)
                print(f"  {C_GRAY}↳ Result preview:{C_RESET} {tool_result.splitlines()[0][:100]}...")

                self.messages.append({
                    "role": "tool",
                    "tool_call_id": call_id,
                    "name": fn_name,
                    "content": tool_result
                })

        return "Reached maximum turn limit without completion."


# -----------------------------------------------------------------------------
# 5. CLI Harness & Interactive Mode
# -----------------------------------------------------------------------------

def main():
    parser = argparse.ArgumentParser(description="Venice Agent CLI: Local Filesystem/CPU AI Agent Wrapper")
    parser.add_argument("prompt", nargs="?", help="Task or instruction for the agent to execute")
    parser.add_argument("--model", default=DEFAULT_MODEL, help=f"Venice model name (default: {DEFAULT_MODEL})")
    parser.add_argument("--key", help="Venice API key (or set VENICE_API_KEY env)")
    parser.add_argument("--cookie", help="Venice Web session cookie (or set VENICE_SESSION_COOKIE env)")
    parser.add_argument("--test-tools", action="store_true", help="Test local filesystem and CPU tools offline")
    parser.add_argument("--interactive", "-i", action="store_true", help="Launch interactive multi-turn REPL")

    args = parser.parse_args()

    # Self-test offline tools
    if args.test_tools:
        print(f"{C_BOLD}Testing Local Hardware & Filesystem Tools...{C_RESET}")
        print("\n1. System Telemetry:")
        print(LocalSystemTools.system_telemetry())
        print("\n2. Directory Listing (.):")
        print(LocalSystemTools.list_dir("."))
        print("\n3. CPU Shell Execution ('echo hello from CPU'):")
        print(LocalSystemTools.run_command("echo hello from CPU"))
        print(f"\n{C_GREEN}✔ All local connectors verified.{C_RESET}")
        return

    client = VeniceClient(api_key=args.key, session_cookie=args.cookie, model=args.model)
    runner = VeniceAgentRunner(client)

    if args.prompt:
        runner.run(args.prompt)
    elif args.interactive:
        print(f"{C_BOLD}Venice Agent Interactive REPL{C_RESET} (Type 'exit' or Ctrl+C to quit)\n")
        while True:
            try:
                user_input = input(f"{C_CYAN}you>{C_RESET} ").strip()
                if not user_input:
                    continue
                if user_input.lower() in ["exit", "quit"]:
                    break
                runner.run(user_input)
            except KeyboardInterrupt:
                print("\nExiting.")
                break
    else:
        parser.print_help()
        print("\nExample Usage:")
        print("  python3 tools/venice_agent.py \"Check disk space and list top 5 largest files in this repo\"")
        print("  python3 tools/venice_agent.py --test-tools")
        print("  python3 tools/venice_agent.py --interactive")

if __name__ == "__main__":
    main()
