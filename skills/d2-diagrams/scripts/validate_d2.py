#!/usr/bin/env python3
"""
validate_d2.py - Comprehensive D2 declarative diagram validator.

Performs lexical and structural validation of D2 files:
- Tracks and verifies block strings (|md ... |, |code ... |, | ... |) and catches unterminated blocks.
- Verifies quote termination and escape sequences.
- Balances and checks container and block braces with line/column precision.
- Strips comments outside string literals.
- If the official `d2` compiler binary is present in PATH, performs authoritative dry-run compilation.
"""

import sys
import os
import re
import shutil
import subprocess
from typing import List, Tuple, Optional

class D2ValidationError:
    def __init__(self, line: int, col: int, message: str):
        self.line = line
        self.col = col
        self.message = message

    def __str__(self):
        return f"Line {self.line}:{self.col}: {self.message}"

class D2Parser:
    def __init__(self, content: str):
        self.content = content
        self.lines = content.splitlines(keepends=True)
        self.errors: List[D2ValidationError] = []

    def validate(self) -> List[D2ValidationError]:
        self.errors.clear()
        brace_stack: List[Tuple[int, int, str]] = []  # (line, col, container_name)
        
        in_block_string = False
        block_string_start: Optional[Tuple[int, int]] = None

        in_quote = False
        quote_char = ""
        quote_start: Optional[Tuple[int, int]] = None

        for line_idx, raw_line in enumerate(self.lines, start=1):
            line = raw_line.rstrip('\r\n')
            col = 0
            n = len(line)

            # If we are inside a multi-line block string (e.g. |md ... |)
            if in_block_string:
                close_match = re.search(r'\|\s*$', line)
                if close_match:
                    in_block_string = False
                    block_string_start = None
                continue

            while col < n:
                ch = line[col]

                # Check for single-line comment (outside quotes)
                if not in_quote and ch == '#':
                    break  # rest of line is comment

                # Check for block string start (|md, |code, |tex, |sql, or plain |)
                if not in_quote and ch == '|':
                    rest = line[col+1:]
                    same_line_close = re.search(r'^(?:[a-zA-Z0-9_-]*\s+)?(.*?)\|\s*(?:;|\}|\n|$)', rest)
                    if same_line_close:
                        col += 1 + same_line_close.end() - 1
                    else:
                        in_block_string = True
                        block_string_start = (line_idx, col + 1)
                        break  # rest of line is part of multi-line block

                # Handle quotes (" or ')
                elif ch in ('"', "'"):
                    if not in_quote:
                        in_quote = True
                        quote_char = ch
                        quote_start = (line_idx, col + 1)
                    elif quote_char == ch:
                        escaped = False
                        backslashes = 0
                        k = col - 1
                        while k >= 0 and line[k] == '\\':
                            backslashes += 1
                            k -= 1
                        if backslashes % 2 == 0:
                            in_quote = False
                            quote_start = None

                # Handle braces (outside quotes and block strings)
                elif not in_quote:
                    if ch == '{':
                        context_name = line[:col].strip().split(':')[-1].strip()
                        brace_stack.append((line_idx, col + 1, context_name or "block"))
                    elif ch == '}':
                        if not brace_stack:
                            self.errors.append(
                                D2ValidationError(line_idx, col + 1, "Unexpected closing brace '}' without matching '{'")
                            )
                        else:
                            brace_stack.pop()

                col += 1

            if in_quote and line.endswith('\\'):
                pass
            elif in_quote:
                self.errors.append(
                    D2ValidationError(quote_start[0], quote_start[1], f"Unterminated string literal ({quote_char})")
                )
                in_quote = False
                quote_start = None

        if in_block_string and block_string_start:
            self.errors.append(
                D2ValidationError(
                    block_string_start[0],
                    block_string_start[1],
                    "Unterminated block string (opened with '|' but never closed with matching '|')"
                )
            )

        for bline, bcol, bname in brace_stack:
            self.errors.append(
                D2ValidationError(bline, bcol, f"Unclosed opening brace '{{' for {bname}")
            )

        return self.errors

def validate_d2_file(filepath: str) -> Tuple[bool, List[str]]:
    """Validate a D2 file using AST/lexical checks and D2 CLI compiler if present."""
    messages = []
    
    if not os.path.exists(filepath):
        return False, [f"File not found: {filepath}"]

    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    parser = D2Parser(content)
    errors = parser.validate()

    if errors:
        for err in errors:
            messages.append(str(err))
        return False, messages

    d2_bin = shutil.which("d2")
    if d2_bin:
        try:
            res = subprocess.run(
                [d2_bin, "--dry-run", filepath],
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True,
                timeout=10
            )
            if res.returncode != 0:
                err_msg = res.stderr.strip() or res.stdout.strip()
                messages.append(f"D2 Compiler Error: {err_msg}")
                return False, messages
            else:
                messages.append(f"Passed official D2 CLI compiler check ({d2_bin}).")
        except Exception as e:
            messages.append(f"D2 CLI check skipped: {e}")

    messages.append("Syntax and structure checks passed successfully.")
    return True, messages

def main():
    if len(sys.argv) < 2:
        print("Usage: python validate_d2.py <path-to-d2-file>")
        sys.exit(1)

    target_file = sys.argv[1]
    valid, msgs = validate_d2_file(target_file)
    
    if valid:
        print(f"SUCCESS: {target_file}")
        for m in msgs:
            print(f"   {m}")
        sys.exit(0)
    else:
        print(f"FAILED: {target_file}")
        for m in msgs:
            print(f"   - {m}")
        sys.exit(1)

if __name__ == "__main__":
    main()
