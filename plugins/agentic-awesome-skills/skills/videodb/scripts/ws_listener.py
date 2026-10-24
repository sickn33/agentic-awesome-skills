#!/usr/bin/env python3
"""
WebSocket event listener for VideoDB with auto-reconnect and graceful shutdown.

Usage:
  python scripts/ws_listener.py [OPTIONS] [output_dir]

Arguments:
  output_dir  Directory for output files (default: XDG_STATE_HOME/videodb-events or VIDEODB_EVENTS_DIR env var)

Options:
  --clear     Clear the events file before starting (use when starting a new session)
  --max-seconds SECONDS   Maximum listener duration (default 3600)
  --max-bytes BYTES       Maximum event file bytes (default 52428800)

Output files:
  <output_dir>/videodb_events.jsonl  - All WebSocket events (JSONL format)
  <output_dir>/videodb_ws_id         - WebSocket connection ID
  <output_dir>/videodb_ws_pid        - Process ID for easy termination

Output (after first connection):
  WS_ID_FILE=<private_file_path>

Examples:
  python scripts/ws_listener.py &                             # Run in background
  python scripts/ws_listener.py --clear                       # Clear events and start fresh
  python scripts/ws_listener.py --clear /path/mydir          # Custom dir with clear
  kill $(cat ~/.local/state/videodb-events/videodb_ws_pid)   # Stop the listener
"""
import os
import sys
import json
import stat
import signal
import argparse
import time
import fcntl
import logging
import asyncio
from datetime import datetime, timezone
from pathlib import Path


def normalize_output_dir(path_value):
    """Normalize the user-selected state directory without resolving symlinks."""
    return Path(os.path.abspath(os.path.expanduser(str(path_value))))

from dotenv import load_dotenv
load_dotenv()

import videodb
# The SDK may otherwise log credential-bearing URLs or raw non-JSON events.
logging.getLogger("videodb.websocket_client").disabled = True

# Retry config
MAX_RETRIES = 10
INITIAL_BACKOFF = 1  # seconds
MAX_BACKOFF = 60     # seconds
FILE_MODE = 0o600
DIR_MODE = 0o700

# Parse arguments
def parse_args():
    parser = argparse.ArgumentParser(description="Persist authorized VideoDB events privately; does not start capture.")
    parser.add_argument("--clear", action="store_true")
    parser.add_argument("--max-seconds", type=int, default=3600)
    parser.add_argument("--max-bytes", type=int, default=50 * 1024 * 1024)
    parser.add_argument("output_dir", nargs="?")
    options = parser.parse_args()
    if options.max_seconds <= 0 or options.max_bytes <= 0:
        parser.error("limits must be positive")
    global MAX_SECONDS, MAX_BYTES
    MAX_SECONDS, MAX_BYTES = options.max_seconds, options.max_bytes
    output_dir = options.output_dir or os.environ.get("VIDEODB_EVENTS_DIR")
    if output_dir is None:
        state_root = Path(os.environ.get("XDG_STATE_HOME", Path.home() / ".local" / "state"))
        output_dir = str(state_root / "videodb-events")
    return options.clear, normalize_output_dir(output_dir)

CLEAR_EVENTS, OUTPUT_DIR = parse_args()
EVENTS_FILE = OUTPUT_DIR / "videodb_events.jsonl"
WS_ID_FILE = OUTPUT_DIR / "videodb_ws_id"
PID_FILE = OUTPUT_DIR / "videodb_ws_pid"

# Track if this is the first connection (for clearing events)
_first_connection = True


def log(msg: str):
    """Log with timestamp."""
    ts = datetime.now().strftime("%H:%M:%S")
    print(f"[{ts}] {msg}", flush=True)


def ensure_output_dir():
    """Create the output directory if needed and reject symlinked paths."""
    # Only standard OS aliases are accepted; reject user-controlled symlink parents.
    for parent in reversed((OUTPUT_DIR, *OUTPUT_DIR.parents)):
        if parent.is_symlink() and str(parent) not in {"/var", "/tmp", "/etc"}:
            raise OSError("Refusing symlinked output directory or ancestor")
    OUTPUT_DIR.mkdir(parents=True, mode=DIR_MODE, exist_ok=True)
    info = OUTPUT_DIR.stat()
    if not stat.S_ISDIR(info.st_mode) or info.st_uid != os.getuid():
        raise OSError("Output directory must be owned by this user")
    if stat.S_IMODE(info.st_mode) & 0o077:
        raise OSError("Output directory must be private (mode 0700)")


def safe_output_path(path_value):
    """Resolve a generated output file under the configured output directory."""
    candidate = Path(path_value)
    if not candidate.is_absolute():
        candidate = OUTPUT_DIR / candidate
    candidate = Path(os.path.abspath(candidate))
    try:
        candidate.relative_to(OUTPUT_DIR)
    except ValueError as exc:
        raise ValueError(f"Path escapes output directory: {path_value}") from exc
    if candidate.is_symlink():
        raise OSError(f"Refusing to use symlinked output file: {candidate}")

    output_root = OUTPUT_DIR.resolve()
    resolved_path = candidate.resolve(strict=False)
    try:
        resolved_path.relative_to(output_root)
    except ValueError as exc:
        raise ValueError(f"Path escapes output directory: {path_value}") from exc
    return resolved_path


def secure_open(path: Path, *, append: bool):
    """Open a regular file without following symlinks."""
    ensure_output_dir()
    flags = os.O_WRONLY | os.O_CREAT
    flags |= os.O_APPEND if append else 0
    flags |= getattr(os, "O_NONBLOCK", 0)
    flags |= getattr(os, "O_NOFOLLOW", 0)

    fd = os.open(safe_output_path(path), flags, FILE_MODE)
    try:
        file_stat = os.fstat(fd)
        if not stat.S_ISREG(file_stat.st_mode):
            raise OSError(f"Refusing to write non-regular file: {path}")
        if file_stat.st_nlink != 1:
            raise OSError(f"Refusing to write multiply linked file: {path}")
        if hasattr(os, "fchmod"):
            os.fchmod(fd, FILE_MODE)
        else:
            os.chmod(path, FILE_MODE)
        if not append:
            os.ftruncate(fd, 0)
        return fd
    except Exception:
        os.close(fd)
        raise


def secure_write_text(path: Path, content: str):
    """Write text to a regular file with private permissions."""
    fd = secure_open(path, append=False)
    with os.fdopen(fd, "w", encoding="utf-8") as handle:
        handle.write(content)


def secure_append_text(path: Path, content: str):
    """Append text to a regular file with private permissions."""
    fd = secure_open(path, append=True)
    with os.fdopen(fd, "a", encoding="utf-8") as handle:
        handle.write(content)


def append_event(event: dict):
    """Append event to JSONL file with timestamps."""
    if not isinstance(event, dict):
        raise ValueError("Expected an event object")
    event = dict(event)
    event["ts"] = datetime.now(timezone.utc).isoformat()
    event["unix_ts"] = datetime.now(timezone.utc).timestamp()
    line = json.dumps(event, allow_nan=False) + "\n"
    if len(line.encode("utf-8")) > 1024 * 1024:
        raise ValueError("Event exceeds the 1 MiB per-event limit")
    fd = secure_open(EVENTS_FILE, append=True)
    with os.fdopen(fd, "a", encoding="utf-8") as handle:
        if os.fstat(handle.fileno()).st_size + len(line.encode("utf-8")) > MAX_BYTES:
            raise OverflowError("Event byte limit reached; stopping listener")
        handle.write(line)


def write_pid():
    """Write PID file for easy process management."""
    secure_write_text(PID_FILE, str(os.getpid()))


def cleanup_pid():
    """Remove PID file on exit."""
    try:
        PID_FILE.unlink(missing_ok=True)
    except Exception:
        pass


async def listen_with_retry():
    """Main listen loop with auto-reconnect and exponential backoff."""
    global _first_connection
    
    retry_count = 0
    backoff = INITIAL_BACKOFF
    
    while retry_count < MAX_RETRIES:
        ws_wrapper = None
        try:
            conn = videodb.connect()
            ws_wrapper = conn.connect_websocket()
            ws = await ws_wrapper.connect()
            ws_id = ws.connection_id
            if not isinstance(ws_id, str) or not ws_id or len(ws_id) > 1024:
                raise ValueError("Invalid WebSocket connection identifier")
            
            # Ensure output directory exists
            ensure_output_dir()
            
            # Clear events file only on first connection if --clear flag is set
            if _first_connection and CLEAR_EVENTS:
                EVENTS_FILE.unlink(missing_ok=True)
                log("Cleared events file")
            _first_connection = False
            
            # Write ws_id to file for easy retrieval
            secure_write_text(WS_ID_FILE, ws_id)
            
            # Print ws_id (parseable format for LLM)
            if retry_count == 0:
                print("WS_ID_FILE=" + str(WS_ID_FILE), flush=True)
            log("Connected; identifier stored privately")
            
            # Retry budget is total, including repeated successful handshakes then disconnects.
            
            # Listen for messages
            async for msg in ws.receive():
                append_event(msg)
                # Event content stays in the private file, not terminal logs.
            
            # If we exit the loop normally, connection was closed
            raise ConnectionError("Connection closed by server")
            
        except asyncio.CancelledError:
            log("Shutdown requested")
            raise
        except (OverflowError, ValueError, OSError) as exc:
            if not isinstance(exc, ConnectionError):
                raise
            retry_count += 1
            log("Connection ended; retrying within the bounded budget")
        except Exception:
            retry_count += 1
            log("Connection failed; details omitted to protect credentials and event content")
        finally:
            if ws_wrapper is not None:
                try:
                    await asyncio.wait_for(ws_wrapper.close(), timeout=5)
                except Exception:
                    log("WebSocket cleanup incomplete; details omitted")

        if retry_count >= MAX_RETRIES:
            raise ConnectionError("WebSocket retry budget exhausted")
        await asyncio.sleep(backoff)
        backoff = min(backoff * 2, MAX_BACKOFF)



async def main_async():
    """Async main with signal handling."""
    loop = asyncio.get_running_loop()
    shutdown_event = asyncio.Event()
    
    def handle_signal():
        log("Received shutdown signal")
        shutdown_event.set()
    
    # Register signal handlers
    for sig in (signal.SIGINT, signal.SIGTERM):
        loop.add_signal_handler(sig, handle_signal)
    
    # Run listener with cancellation support
    listen_task = asyncio.create_task(listen_with_retry())
    shutdown_task = asyncio.create_task(shutdown_event.wait())
    
    deadline_task = asyncio.create_task(asyncio.sleep(MAX_SECONDS))
    done, pending = await asyncio.wait(
        [listen_task, shutdown_task, deadline_task],
        return_when=asyncio.FIRST_COMPLETED,
    )
    
    # Cancel remaining tasks
    for task in pending:
        task.cancel()
        try:
            await task
        except asyncio.CancelledError:
            pass
    
    for task in done:
        task.result()
    log("Listener stopped; separately stop any capture and AI pipelines")


def main():
    ensure_output_dir()
    lock_fd = secure_open(OUTPUT_DIR / "listener.lock", append=True)
    try:
        fcntl.flock(lock_fd, fcntl.LOCK_EX | fcntl.LOCK_NB)
    except OSError:
        os.close(lock_fd)
        raise RuntimeError("A listener already owns this output directory") from None
    write_pid()
    try:
        asyncio.run(main_async())
    finally:
        cleanup_pid()
        os.close(lock_fd)


if __name__ == "__main__":
    main()
