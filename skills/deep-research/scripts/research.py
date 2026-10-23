#!/usr/bin/env python3
"""
Gemini Deep Research Skill - Execute autonomous multi-step research tasks.

Uses Google's Deep Research Agent for comprehensive, cited research reports.
AAS adaptation: explicit private cache, bounded inputs/streaming, current Interactions schema, no automatic credential loading. See UPSTREAM-NOTICE.md.
"""

import argparse
import asyncio
import json
import os
import re
import sys
import stat
import tempfile
from urllib.parse import quote
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, AsyncIterator, Callable, Dict, List, Optional

try:
    import httpx
except ImportError:
    httpx = None  # --help and local history do not require a network client



class DeepResearchError(Exception):
    """Custom exception for Deep Research API errors."""
    pass


def checked_interaction_id(value):
    if not isinstance(value, str) or not re.fullmatch(r"[A-Za-z0-9_-]{1,256}", value):
        raise DeepResearchError("Invalid or missing interaction ID")
    return value


def extract_report_text(data):
    """Read the final model-output step, with an explicit legacy outputs fallback."""
    if not isinstance(data, dict):
        raise DeepResearchError("Provider response is not an interaction object")
    steps = data.get("steps") or []
    if not isinstance(steps, list):
        raise DeepResearchError("Malformed interaction steps")
    output_steps = [step for step in steps if isinstance(step, dict) and step.get("type") == "model_output"]
    if output_steps:
        content = output_steps[-1].get("content") or []
        if not isinstance(content, list):
            raise DeepResearchError("Malformed model output content")
        return "\n".join(part["text"] for part in content if isinstance(part, dict) and part.get("type") == "text" and isinstance(part.get("text"), str))
    outputs = data.get("outputs") or []
    if not isinstance(outputs, list):
        raise DeepResearchError("Malformed legacy outputs")
    return "\n".join(part["text"] for part in outputs if isinstance(part, dict) and isinstance(part.get("text"), str))


class HistoryManager:
    """Manage local research history cache."""

    def __init__(self, cache_dir: Optional[str] = None):
        selected = cache_dir or os.getenv("DEEP_RESEARCH_CACHE_DIR")
        if not selected or not Path(selected).expanduser().is_absolute():
            raise DeepResearchError("Set DEEP_RESEARCH_CACHE_DIR to an explicit private absolute directory")
        self.cache_dir = Path(selected).expanduser()
        self.history_file = self.cache_dir / "history.json"
        self._ensure_cache_dir()

    def _ensure_cache_dir(self):
        """Create cache directory if it doesn't exist."""
        if self.cache_dir.is_symlink():
            raise DeepResearchError("Linked cache directory rejected")
        self.cache_dir.mkdir(parents=True, exist_ok=True, mode=0o700)
        if os.name != "nt" and self.cache_dir.stat().st_mode & 0o077:
            raise DeepResearchError("Cache directory permissions must be owner-only")

    def _load_history(self) -> Dict:
        """Load history from file."""
        if not self.history_file.exists() and not self.history_file.is_symlink():
            return {"interactions": []}
        try:
            fd = os.open(self.history_file, os.O_RDONLY | getattr(os, "O_NOFOLLOW", 0) | getattr(os, "O_NONBLOCK", 0))
            try:
                info = os.fstat(fd)
                if self.history_file.is_symlink() or not stat.S_ISREG(info.st_mode) or (os.name != "nt" and info.st_mode & 0o077):
                    raise DeepResearchError("History must be a private regular file")
                with os.fdopen(fd, "rb", closefd=False) as handle:
                    data = handle.read(512 * 1024 + 1)
            finally:
                os.close(fd)
            if len(data) > 512 * 1024:
                raise DeepResearchError("History exceeds byte limit")
            value = json.loads(data)
            rows = value.get("interactions") if isinstance(value, dict) else None
            if not isinstance(rows, list) or len(rows) > 50 or any(not isinstance(row, dict) or not isinstance(row.get("id"), str) for row in rows):
                raise DeepResearchError("Malformed research history; preserve and review it")
            for row in rows:
                checked_interaction_id(row["id"])
                row["query"] = "[not stored]"  # do not display legacy private query strings
            return value
        except (OSError, ValueError) as error:
            raise DeepResearchError("History unreadable or malformed; not silently discarded") from error

    def _save_history(self, history: Dict):
        """Atomically store bounded private history, without raw query text."""
        if self.history_file.is_symlink():
            raise DeepResearchError("Linked history file rejected")
        payload = json.dumps(history, indent=2)
        if len(payload.encode("utf-8")) > 512 * 1024:
            raise DeepResearchError("History exceeds byte limit")
        temporary = None
        try:
            with tempfile.NamedTemporaryFile("w", encoding="utf-8", dir=self.cache_dir, delete=False) as handle:
                temporary = handle.name
                handle.write(payload)
                handle.write("\n")
            os.replace(temporary, self.history_file)
        finally:
            if temporary and os.path.exists(temporary):
                os.unlink(temporary)

    def add_interaction(self, interaction_id: str, query: str, status: str = "started"):
        """Add or update an interaction in history."""
        history = self._load_history()

        # Check if interaction already exists
        for item in history["interactions"]:
            if item["id"] == interaction_id:
                item["status"] = status
                item["updated_at"] = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
                self._save_history(history)
                return

        # Add new interaction
        history["interactions"].insert(0, {
            "id": interaction_id,
            "query": "[not stored]",
            "started_at": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
            "status": status
        })

        # Keep only last 50 interactions
        history["interactions"] = history["interactions"][:50]
        self._save_history(history)

    def update_status(self, interaction_id: str, status: str):
        """Update the status of an interaction."""
        history = self._load_history()
        for item in history["interactions"]:
            if item["id"] == interaction_id:
                item["status"] = status
                item["updated_at"] = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
                if status == "completed":
                    item["completed_at"] = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
                break
        self._save_history(history)

    def get_recent(self, limit: int = 10) -> List[Dict]:
        """Get recent interactions."""
        history = self._load_history()
        if not 1 <= limit <= 50:
            raise DeepResearchError("History limit must be 1..50")
        return history["interactions"][:limit]

    def get_interaction(self, interaction_id: str) -> Optional[Dict]:
        """Get a specific interaction by ID."""
        history = self._load_history()
        for item in history["interactions"]:
            if item["id"] == interaction_id:
                return item
        return None


class DeepResearchClient:
    """Client for Gemini Deep Research API."""

    BASE_URL = "https://generativelanguage.googleapis.com/v1beta/interactions"
    AGENT = "deep-research-preview-04-2026"

    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key or os.getenv("GEMINI_API_KEY")
        if not self.api_key:
            raise DeepResearchError(
                "GEMINI_API_KEY not set. Inject it through the approved host environment; .env is not loaded."
            )
        self._client = None
        self.timeout = int(os.getenv("DEEP_RESEARCH_TIMEOUT", "600"))
        self.poll_interval = int(os.getenv("DEEP_RESEARCH_POLL_INTERVAL", "10"))
        if not 1 <= self.timeout <= 3600 or not 1 <= self.poll_interval <= 60:
            raise DeepResearchError("Timeout must be 1..3600 seconds and polling 1..60 seconds")
        self.history = HistoryManager()
        self.history._load_history()  # validate local state before any paid job is submitted

    async def _get_client(self):
        """Get or create the HTTP client."""
        if httpx is None:
            raise DeepResearchError("Install the reviewed httpx dependency before network use")
        if self._client is None or self._client.is_closed:
            self._client = httpx.AsyncClient(timeout=60.0, follow_redirects=False)
        return self._client

    async def close(self):
        """Close the HTTP client."""
        if self._client and not self._client.is_closed:
            await self._client.aclose()

    def _build_prompt(self, query: str, format_spec: Optional[str] = None) -> str:
        """Build the research prompt with optional format specification."""
        if not isinstance(query, str) or not query.strip() or len(query.encode("utf-8")) > 32 * 1024:
            raise DeepResearchError("Query must be nonempty and at most 32KiB")
        if format_spec and len(format_spec.encode("utf-8")) > 8 * 1024:
            raise DeepResearchError("Format specification exceeds 8KiB")
        prompt = query

        if format_spec:
            prompt += f"\n\nFormat the output with the following structure:\n{format_spec}"

        return prompt

    async def start_research(
        self,
        query: str,
        format_spec: Optional[str] = None,
        previous_interaction_id: Optional[str] = None
    ) -> str:
        """
        Start a research task.

        Args:
            query: The research query
            format_spec: Optional output format specification
            previous_interaction_id: Optional ID to continue from previous research

        Returns:
            Interaction ID for polling results
        """
        prompt = self._build_prompt(query, format_spec)
        client = await self._get_client()

        payload: Dict[str, Any] = {
            "input": prompt,
            "agent": self.AGENT,
            "background": True
        }

        if previous_interaction_id:
            payload["previous_interaction_id"] = checked_interaction_id(previous_interaction_id)

        try:
            response = await client.post(
                self.BASE_URL,
                headers={
                    "Content-Type": "application/json",
                    "x-goog-api-key": str(self.api_key)
                },
                json=payload
            )

            if response.status_code != 200:
                raise DeepResearchError(f"API error {response.status_code}; provider error body omitted")

            if len(response.content) > 2 * 1024 * 1024:
                raise DeepResearchError("Provider response exceeds 2MiB parsing limit")
            data = response.json()
            if not isinstance(data, dict):
                raise DeepResearchError("Provider response is not an interaction object")
            interaction_id = data.get("id") or data.get("name", "").split("/")[-1]

            interaction_id = checked_interaction_id(interaction_id)

            # Track in history
            self.history.add_interaction(interaction_id, query, "started")

            return interaction_id

        except (httpx.HTTPError, ValueError) as e:
            raise DeepResearchError("Request failed; submission may be indeterminate. Check existing interaction evidence before resubmitting") from e

    async def get_status(self, interaction_id: str) -> Dict[str, Any]:
        """
        Get the status of a research task.

        Returns:
            Dict with 'status' and optionally 'result' or 'error'
        """
        client = await self._get_client()

        try:
            response = await client.get(
                f"{self.BASE_URL}/{checked_interaction_id(interaction_id)}",
                headers={"x-goog-api-key": str(self.api_key)},
                timeout=30.0
            )

            if response.status_code != 200:
                return {"status": "error", "error": f"API error: {response.status_code}"}

            if len(response.content) > 2 * 1024 * 1024:
                raise DeepResearchError("Provider response exceeds 2MiB parsing limit")
            data = response.json()
            if not isinstance(data, dict):
                raise DeepResearchError("Provider response is not an interaction object")
            status = data.get("status", "unknown")

            if status == "completed":
                text = extract_report_text(data)
                if not text:
                    return {"status": "error", "error": "Completed interaction has no text report"}
                return {"status": "completed", "result": text, "raw": data}
            elif status in {"failed", "cancelled", "canceled", "expired"}:
                return {"status": status, "error": "Provider reported a terminal non-success state"}
            else:
                return {"status": status, "raw": data}

        except (httpx.HTTPError, ValueError, DeepResearchError):
            return {"status": "error", "error": "Status retrieval failed; preserve the existing interaction ID"}

    async def wait_for_completion(
        self,
        interaction_id: str,
        timeout: Optional[int] = None,
        poll_interval: Optional[int] = None,
        progress_callback: Optional[Callable[[int, float, str], None]] = None
    ) -> Dict[str, Any]:
        """
        Wait for research to complete with polling.

        Args:
            interaction_id: The interaction ID to poll
            timeout: Maximum wait time in seconds
            poll_interval: Seconds between polls
            progress_callback: Optional callback for progress updates

        Returns:
            Dict with research result or error
        """
        timeout = self.timeout if timeout is None else timeout
        poll_interval = self.poll_interval if poll_interval is None else poll_interval
        if not 1 <= timeout <= 3600 or not 1 <= poll_interval <= 60:
            raise DeepResearchError("Invalid timeout or polling interval")
        start_time = asyncio.get_event_loop().time()
        poll_count = 0

        while True:
            elapsed = asyncio.get_event_loop().time() - start_time
            if elapsed > timeout:
                self.history.update_status(interaction_id, "timeout")
                return {"status": "timeout", "error": f"Research timed out after {timeout}s; remote job is not cancelled"}

            result = await self.get_status(interaction_id)
            poll_count += 1

            if progress_callback:
                progress_callback(poll_count, elapsed, result.get("status", "unknown"))

            if result["status"] == "completed":
                self.history.update_status(interaction_id, "completed")
                return result
            elif result["status"] in ["failed", "error", "cancelled", "canceled", "expired"]:
                self.history.update_status(interaction_id, "failed")
                return result

            await asyncio.sleep(poll_interval)

    async def stream_research(
        self,
        query: str,
        format_spec: Optional[str] = None
    ) -> AsyncIterator[Dict[str, Any]]:
        """
        Stream research progress in real-time.

        Yields:
            Dict with event type and content
        """
        prompt = self._build_prompt(query, format_spec)
        client = await self._get_client()

        try:
            async with client.stream(
                "POST",
                f"{self.BASE_URL}?alt=sse",
                headers={
                    "Content-Type": "application/json",
                    "x-goog-api-key": str(self.api_key)
                },
                json={
                    "input": prompt,
                    "agent": self.AGENT,
                    "background": True,
                    "stream": True,
                    "agent_config": {
                        "type": "deep-research",
                        "thinking_summaries": "auto"
                    }
                },
                timeout=httpx.Timeout(float(self.timeout))  # finite read/connect limits; no automatic new paid submission
            ) as response:
                if response.status_code != 200:
                    yield {"type": "error", "error": f"Stream rejected (HTTP {response.status_code})"}
                    return
                interaction_id = None
                complete = False
                buffer = ""
                received = 0
                start = asyncio.get_event_loop().time()

                async for chunk in response.aiter_text():
                    received += len(chunk.encode("utf-8"))
                    if received > 4 * 1024 * 1024 or asyncio.get_event_loop().time() - start > self.timeout:
                        yield {"type": "error", "error": "Stream limit reached; remote job may continue. Query its existing ID"}
                        return
                    buffer = (buffer + chunk).replace("\r\n", "\n")
                    if len(buffer) > 1024 * 1024:
                        yield {"type": "error", "error": "SSE event exceeds limit"}
                        return

                    # Parse SSE events
                    while "\n\n" in buffer:
                        event_str, buffer = buffer.split("\n\n", 1)

                        if not event_str.strip():
                            continue

                        # Parse SSE format
                        data_lines = []
                        for line in event_str.split("\n"):
                            if line.startswith("data:"):
                                value = line[5:]
                                data_lines.append(value[1:] if value.startswith(" ") else value)
                        data_line = "\n".join(data_lines)
                        if not data_line:
                            continue

                        try:
                            event = json.loads(data_line)
                            if not isinstance(event, dict):
                                raise DeepResearchError("Malformed SSE event")
                        except (json.JSONDecodeError, DeepResearchError):
                            yield {"type": "error", "error": "Malformed provider stream; preserve its interaction ID"}
                            return

                        event_type = event.get("event_type", "")

                        if event_type in {"interaction.created", "interaction.start"}:
                            interaction = event.get("interaction")
                            if not isinstance(interaction, dict):
                                raise DeepResearchError("Malformed stream interaction")
                            interaction_id = checked_interaction_id(interaction.get("id"))
                            if interaction_id:
                                self.history.add_interaction(interaction_id, query, "streaming")
                            yield {"type": "start", "interaction_id": interaction_id}

                        elif event_type in {"step.delta", "content.delta"}:
                            delta = event.get("delta", {})
                            delta_type = delta.get("type")

                            if delta_type == "text":
                                yield {"type": "text", "content": delta.get("text", "")}
                            elif delta_type == "thought_summary":
                                content = delta.get("content", {})
                                yield {"type": "thought", "content": content.get("text", "")}

                        elif event_type in {"interaction.completed", "interaction.complete"}:
                            complete = True
                            if interaction_id:
                                self.history.update_status(interaction_id, "completed")
                            yield {"type": "complete"}

                        elif event_type in {"interaction.error", "error"}:
                            if interaction_id:
                                self.history.update_status(interaction_id, "failed")
                            yield {"type": "error", "error": "Provider stream error; preserve the existing interaction ID"}
                            return

                if not complete:
                    yield {"type": "error", "error": "Stream ended without completion; query the existing interaction ID, do not create a replacement job"}
        except (httpx.HTTPError, DeepResearchError, AttributeError, TypeError):
            yield {"type": "error", "error": "Stream transport failed; remote work may continue"}

    def parse_result(self, text: str) -> Optional[Dict]:
        """
        Parse research result text into structured data if JSON.

        Args:
            text: Raw text output from Gemini

        Returns:
            Parsed JSON data or None if not JSON
        """
        if not text:
            return None

        # Try direct JSON parsing
        try:
            return json.loads(text)
        except json.JSONDecodeError:
            pass

        # Try extracting JSON from markdown code blocks
        json_match = re.search(r'```(?:json)?\s*(\{.*?\})\s*```', text, re.DOTALL)
        if json_match:
            try:
                return json.loads(json_match.group(1))
            except json.JSONDecodeError:
                pass

        # Try finding JSON object pattern
        json_match = re.search(r'\{[^{}]*"[^"]+"\s*:[^{}]*\}', text, re.DOTALL)
        if json_match:
            try:
                return json.loads(json_match.group(0))
            except json.JSONDecodeError:
                pass

        return None


def print_progress(poll_count: int, elapsed: float, status: str):
    """Print progress update during polling."""
    mins = int(elapsed // 60)
    secs = int(elapsed % 60)
    print(f"\r[{mins:02d}:{secs:02d}] Poll #{poll_count} - Status: {status}", end="", flush=True, file=sys.stderr)


async def cmd_research(args):
    """Execute a research query."""
    client = DeepResearchClient()

    try:
        if args.stream:
            # Streaming mode
            print(f"Starting streaming research...\n")
            full_text = ""

            async for event in client.stream_research(args.query, args.format):
                if event["type"] == "start":
                    print(f"Interaction ID: {event['interaction_id']}\n")
                elif event["type"] == "thought":
                    print(f"\n[Thinking] {event['content']}\n", file=sys.stderr)
                elif event["type"] == "text":
                    print(event["content"], end="", flush=True)
                    full_text += event["content"]
                elif event["type"] == "complete":
                    print("\n\n[Research Complete]")
                elif event["type"] == "error":
                    print(f"\n[Error] {event['error']}", file=sys.stderr)
                    return 1

            # Output JSON if requested
            if args.json and full_text:
                parsed = client.parse_result(full_text)
                if parsed:
                    print("\n\n--- Parsed JSON ---")
                    print(json.dumps(parsed, indent=2))
        else:
            # Polling mode
            previous_id = args.continue_from if hasattr(args, 'continue_from') else None

            print("Starting research task...", file=sys.stderr)
            interaction_id = await client.start_research(
                args.query,
                args.format,
                previous_id
            )
            print(f"Interaction ID: {interaction_id}", file=sys.stderr)
            print("Duration and cost depend on current provider usage; local waiting is bounded\n", file=sys.stderr)

            if args.no_wait:
                print(f"Research started. Check status with: --status {interaction_id}")
                return 0

            print("Waiting for completion (Ctrl+C stops local waiting, not the remote job)...", file=sys.stderr)
            result = await client.wait_for_completion(
                interaction_id,
                progress_callback=print_progress
            )
            print(file=sys.stderr)  # New line after progress

            if result["status"] == "completed":
                text = result.get("result", "")

                if args.json:
                    parsed = client.parse_result(text)
                    if parsed:
                        print(json.dumps(parsed, indent=2))
                    else:
                        print(json.dumps({"text": text}, indent=2))
                elif args.raw:
                    print(json.dumps(result.get("raw", {}), indent=2))
                else:
                    print("\n--- Research Result ---\n")
                    print(text)

                return 0
            else:
                print(f"\nResearch failed: {result.get('error', 'Unknown error')}")
                return 1

    except DeepResearchError as e:
        print(f"Error: {e}", file=sys.stderr)
        return 1
    except KeyboardInterrupt:
        print("\n\nLocal waiting interrupted; the remote job may still be running.")
        return 130
    finally:
        await client.close()


async def cmd_status(args):
    """Check status of a research task."""
    client = DeepResearchClient()

    try:
        result = await client.get_status(args.interaction_id)

        if args.json:
            print(json.dumps(result, indent=2))
        else:
            print(f"Status: {result['status']}")

            if result["status"] == "completed":
                text = result.get("result", "")
                if text:
                    print(f"\n--- Result Preview ---\n{text[:500]}...")
            elif result["status"] in ["failed", "error", "cancelled", "canceled", "expired"]:
                print(f"Error: {result.get('error', 'Unknown')}")

        return 0 if result["status"] in {"completed", "in_progress", "queued"} else 1

    except DeepResearchError as e:
        print(f"Error: {e}", file=sys.stderr)
        return 1
    finally:
        await client.close()


async def cmd_wait(args):
    """Wait for a research task to complete."""
    client = DeepResearchClient()

    try:
        print(f"Waiting for {args.interaction_id}...", file=sys.stderr)
        result = await client.wait_for_completion(
            args.interaction_id,
            progress_callback=print_progress
        )
        print(file=sys.stderr)

        if result["status"] == "completed":
            text = result.get("result", "")

            if args.json:
                parsed = client.parse_result(text)
                if parsed:
                    print(json.dumps(parsed, indent=2))
                else:
                    print(json.dumps({"text": text}, indent=2))
            else:
                print("\n--- Research Result ---\n")
                print(text)

            return 0
        else:
            print(f"Research failed: {result.get('error', 'Unknown error')}")
            return 1

    except DeepResearchError as e:
        print(f"Error: {e}", file=sys.stderr)
        return 1
    except KeyboardInterrupt:
        print("\n\nLocal waiting interrupted; the remote job may still be running.")
        return 130
    finally:
        await client.close()


async def cmd_list(args):
    """List recent research tasks."""
    history = HistoryManager()
    interactions = history.get_recent(args.limit)

    if not interactions:
        print("No research history found.")
        return 0

    if args.json:
        print(json.dumps(interactions, indent=2))
    else:
        print(f"Recent research tasks (last {len(interactions)}):\n")
        for item in interactions:
            status_icon = {
                "completed": "[ok]",
                "failed": "[!!]",
                "started": "[..]",
                "streaming": "[>>]",
                "timeout": "[to]"
            }.get(item.get("status", ""), "[??]")

            print(f"{status_icon} {item['id'][:12]}...")
            print(f"    Query: {item['query'][:60]}{'...' if len(item['query']) > 60 else ''}")
            print(f"    Started: {item.get('started_at', 'N/A')}")
            if item.get("completed_at"):
                print(f"    Completed: {item['completed_at']}")
            print()

    return 0


def main():
    parser = argparse.ArgumentParser(
        description="Gemini Deep Research - Autonomous multi-step research agent",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Start a research task and wait for results
  %(prog)s --query "Research the history of Kubernetes"

  # With structured output format
  %(prog)s --query "Compare Python web frameworks" \\
    --format "1. Executive Summary\\n2. Comparison Table\\n3. Recommendations"

  # Stream progress in real-time
  %(prog)s --query "Analyze EV battery market" --stream

  # Start without waiting
  %(prog)s --query "Research topic" --no-wait

  # Check status of running research
  %(prog)s --status abc123

  # Continue from previous research
  %(prog)s --query "Elaborate on point 2" --continue abc123

  # List recent research
  %(prog)s --list

Note: Paid external research requires account/data/budget authorization. Timeout or Ctrl+C does not cancel remote work.
"""
    )

    # Main commands (mutually exclusive)
    cmd_group = parser.add_mutually_exclusive_group(required=True)
    cmd_group.add_argument("--query", "-q", help="Research query to execute")
    cmd_group.add_argument("--status", "-s", dest="interaction_id", metavar="ID",
                          help="Check status of a research task")
    cmd_group.add_argument("--wait", "-w", dest="wait_id", metavar="ID",
                          help="Wait for a research task to complete")
    cmd_group.add_argument("--list", "-l", action="store_true",
                          help="List recent research tasks")

    # Query options
    parser.add_argument("--format", "-f", metavar="SPEC",
                       help="Output format specification")
    parser.add_argument("--continue", dest="continue_from", metavar="ID",
                       help="Continue from previous research interaction")
    parser.add_argument("--stream", action="store_true",
                       help="Stream progress in real-time")
    parser.add_argument("--no-wait", action="store_true",
                       help="Start research without waiting for completion")

    # Output options
    parser.add_argument("--json", "-j", action="store_true",
                       help="Output results as JSON")
    parser.add_argument("--raw", "-r", action="store_true",
                       help="Output raw API response")

    # List options
    parser.add_argument("--limit", type=int, default=10,
                       help="Number of recent tasks to show (default: 10)")

    args = parser.parse_args()

    if args.json and args.raw:
        parser.error("--json and --raw are mutually exclusive")
    if args.stream and (args.continue_from or args.json or args.raw):
        parser.error("--stream does not support --continue, --json or --raw; use polling mode")
    if args.raw and (not args.query or args.no_wait):
        parser.error("--raw requires a waiting non-stream --query")
    if args.stream and args.no_wait:
        parser.error("--stream and --no-wait are mutually exclusive")
    if not args.query and (args.stream or args.no_wait or args.continue_from or args.format):
        parser.error("Query options require --query")

    try:
        # Route to appropriate command
        if args.query:
            exit_code = asyncio.run(cmd_research(args))
        elif args.interaction_id:
            exit_code = asyncio.run(cmd_status(args))
        elif args.wait_id:
            args.interaction_id = args.wait_id
            exit_code = asyncio.run(cmd_wait(args))
        elif args.list:
            exit_code = asyncio.run(cmd_list(args))
        else:
            parser.print_help()
            exit_code = 1
    except (DeepResearchError, ValueError, OSError) as error:
        print(f"Local configuration or response error: {error}", file=sys.stderr)
        exit_code = 1
    except KeyboardInterrupt:
        print("Local waiting interrupted; remote work may continue", file=sys.stderr)
        exit_code = 130

    sys.exit(exit_code)


if __name__ == "__main__":
    main()
