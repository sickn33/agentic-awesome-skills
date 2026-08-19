#!/usr/bin/env python3
import sys
import re

def validate_d2_code(content: str):
    issues = []
    lines = content.splitlines()

    # Track open braces
    brace_stack = []
    in_block_string = False
    block_delimiter = ""

    for line_num, line in enumerate(lines, start=1):
        stripped = line.strip()

        # Ignore comments
        if stripped.startswith("#"):
            continue

        # Check block strings like |md ... | or |code ... |
        if "|md" in stripped or "|code" in stripped or "|tex" in stripped:
            in_block_string = not in_block_string
            continue
        elif in_block_string and stripped.endswith("|"):
            in_block_string = False
            continue

        if in_block_string:
            continue

        # Count braces outside quotes
        in_quote = False
        quote_char = ""
        for i, char in enumerate(stripped):
            if char in ('"', "'") and (i == 0 or stripped[i-1] != '\\'):
                if not in_quote:
                    in_quote = True
                    quote_char = char
                elif quote_char == char:
                    in_quote = False
            elif not in_quote:
                if char == '{':
                    brace_stack.append((line_num, '{'))
                elif char == '}':
                    if not brace_stack:
                        issues.append(f"Line {line_num}: Unexpected closing brace '}}'")
                    else:
                        brace_stack.pop()

    if brace_stack:
        for line_num, _ in brace_stack:
            issues.append(f"Line {line_num}: Unclosed opening brace '{{'")

    return issues

def main():
    if len(sys.argv) < 2:
        print("Usage: validate_d2.py <path_to_d2_file_or_snippet>")
        sys.exit(1)

    file_path = sys.argv[1]
    try:
        with open(file_path, "r", encoding="utf-8") as f:
            content = f.read()
    except Exception as e:
        print(f"Error reading file: {e}")
        sys.exit(1)

    issues = validate_d2_code(content)
    if issues:
        print(f"FAILED: Found {len(issues)} validation issue(s):")
        for issue in issues:
            print(f"  - {issue}")
        sys.exit(1)
    else:
        print("SUCCESS: D2 snippet passed basic syntax and structure checks.")

if __name__ == "__main__":
    main()
