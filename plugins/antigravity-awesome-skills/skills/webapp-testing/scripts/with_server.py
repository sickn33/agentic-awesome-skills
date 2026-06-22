#!/usr/bin/env python3
"""
Start one or more servers, wait for them to be ready, run a command, then clean up.

Usage:
    # Single server
    python scripts/with_server.py --server "npm run dev" --port 5173 -- python automation.py
    python scripts/with_server.py --server "npm start" --port 3000 -- python test.py

    # Multiple servers
    python scripts/with_server.py \
      --server "cd backend && python server.py" --port 3000 \
      --server "cd frontend && npm run dev" --port 5173 \
      -- python test.py
"""

import subprocess
import socket
import time
import sys
import argparse
import shlex
from pathlib import Path

ALLOWED_EXECUTABLES = {
    "npm", "npx", "pnpm", "yarn", "node", "python", "python3",
    "uv", "pytest", "vitest", "playwright",
}
SHELL_METACHARS = {";", "&&", "||", "|", "`", "$(", ">", "<"}


def validate_argv(parts):
    if not parts:
        raise ValueError("empty command")
    exe = Path(parts[0]).name
    if exe not in ALLOWED_EXECUTABLES:
        raise ValueError(f"unsupported executable: {parts[0]}")
    for part in parts:
        if any(token in part for token in SHELL_METACHARS):
            raise ValueError(f"unsupported shell metacharacter in argument: {part}")
    return parts


def is_server_ready(port, timeout=30):
    """Wait for server to be ready by polling the port."""
    start_time = time.time()
    while time.time() - start_time < timeout:
        try:
            with socket.create_connection(('localhost', port), timeout=1):
                return True
        except (socket.error, ConnectionRefusedError):
            time.sleep(0.5)
    return False


def parse_server_command(command):
    """Parse a server command without invoking a shell."""
    parts = shlex.split(command)
    cwd = None
    if len(parts) >= 4 and parts[0] == "cd" and parts[2] == "&&":
        cwd = Path(parts[1]).expanduser()
        parts = parts[3:]
    if not parts:
        raise ValueError("empty server command")
    return validate_argv(parts), cwd


def self_test():
    assert parse_server_command("npm run dev") == (["npm", "run", "dev"], None)
    cmd, cwd = parse_server_command("cd backend && python server.py")
    assert cmd == ["python", "server.py"]
    assert str(cwd) == "backend"
    try:
        validate_argv(["sh", "-c", "npm run dev"])
    except ValueError:
        pass
    else:
        raise AssertionError("shell launcher should be rejected")


def main():
    parser = argparse.ArgumentParser(description='Run command with one or more servers')
    parser.add_argument('--self-test', action='store_true', help='Run parser self-test and exit')
    parser.add_argument('--server', action='append', dest='servers', help='Server command (can be repeated)')
    parser.add_argument('--port', action='append', dest='ports', type=int, help='Port for each server (must match --server count)')
    parser.add_argument('--timeout', type=int, default=30, help='Timeout in seconds per server (default: 30)')
    parser.add_argument('command', nargs=argparse.REMAINDER, help='Command to run after server(s) ready')

    args = parser.parse_args()
    if args.self_test:
        self_test()
        return
    if not args.servers or not args.ports:
        print("Error: --server and --port are required")
        sys.exit(1)

    # Remove the '--' separator if present
    if args.command and args.command[0] == '--':
        args.command = args.command[1:]

    if not args.command:
        print("Error: No command specified to run")
        sys.exit(1)

    # Parse server configurations
    if len(args.servers) != len(args.ports):
        print("Error: Number of --server and --port arguments must match")
        sys.exit(1)

    servers = []
    for cmd, port in zip(args.servers, args.ports):
        servers.append({'cmd': cmd, 'port': port})

    server_processes = []

    try:
        # Start all servers
        for i, server in enumerate(servers):
            print(f"Starting server {i+1}/{len(servers)}: {server['cmd']}")

            server_cmd, server_cwd = parse_server_command(server['cmd'])
            process = subprocess.Popen(
                server_cmd,
                cwd=server_cwd,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE
            )
            server_processes.append(process)

            # Wait for this server to be ready
            print(f"Waiting for server on port {server['port']}...")
            if not is_server_ready(server['port'], timeout=args.timeout):
                raise RuntimeError(f"Server failed to start on port {server['port']} within {args.timeout}s")

            print(f"Server ready on port {server['port']}")

        print(f"\nAll {len(servers)} server(s) ready")

        # Run the command
        test_command = validate_argv(args.command)
        print(f"Running: {' '.join(test_command)}\n")
        result = subprocess.run(test_command)
        sys.exit(result.returncode)

    finally:
        # Clean up all servers
        print(f"\nStopping {len(server_processes)} server(s)...")
        for i, process in enumerate(server_processes):
            try:
                process.terminate()
                process.wait(timeout=5)
            except subprocess.TimeoutExpired:
                process.kill()
                process.wait()
            print(f"Server {i+1} stopped")
        print("All servers stopped")


if __name__ == '__main__':
    main()
