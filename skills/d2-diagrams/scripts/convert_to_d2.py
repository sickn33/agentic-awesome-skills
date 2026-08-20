#!/usr/bin/env python3
"""
convert_to_d2.py - Convert standard Mermaid flowchart and diagram snippets to D2 syntax.
"""

import sys
import re

def convert_mermaid_to_d2(mermaid_code: str) -> str:
    lines = mermaid_code.splitlines()
    d2_lines = []

    for line in lines:
        stripped = line.strip()
        if not stripped or stripped.startswith("%%"):
            continue

        # Check flowchart direction
        if stripped.startswith("graph") or stripped.startswith("flowchart"):
            if "TD" in stripped or "TB" in stripped:
                d2_lines.append("direction: down\n")
            elif "LR" in stripped:
                d2_lines.append("direction: right\n")
            continue

        # Convert simple Mermaid connections: A[Label A] -->|text| B(Label B)
        converted = stripped.replace("-->", "->")
        converted = converted.replace("---", "--")

        # Convert pipe labels: |label| to : label
        pipe_match = re.search(r"->\s*\|([^|]+)\|\s*", converted)
        if pipe_match:
            label = pipe_match.group(1).strip()
            converted = re.sub(r"->\s*\|[^|]+\|\s*", "-> ", converted)
            converted += f": {label}"

        # Handle bracket shapes: A[Name] -> A: Name
        bracket_match = re.match(r"([\w\-]+)\[([^\]]+)\]", converted)
        if bracket_match:
            node_id, label = bracket_match.groups()
            converted = converted.replace(f"{node_id}[{label}]", f"{node_id}")
            d2_lines.append(f"{node_id}: {label}")

        d2_lines.append(converted)

    return "\n".join(d2_lines)

def main():
    if len(sys.argv) < 2:
        print("Usage: convert_to_d2.py <mermaid_file_or_snippet>")
        sys.exit(1)

    file_path = sys.argv[1]
    with open(file_path, "r", encoding="utf-8") as f:
        content = f.read()

    d2_output = convert_mermaid_to_d2(content)
    print(d2_output)

if __name__ == "__main__":
    main()
