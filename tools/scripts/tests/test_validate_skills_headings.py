import os
import sys
from pathlib import Path

sys.path.append(str(Path(__file__).resolve().parents[1]))
from validate_skills import has_when_to_use_section

SAMPLES = [
    ("## When to Use", True),
    ("## Use this skill when", True),
    ("## When to Use This Skill", True),
    ("## When to activate this skill", True),
    ("## Overview", False),
]

for heading, expected in SAMPLES:
    content = f"\n{heading}\n- item\n"
    assert has_when_to_use_section(content) is expected, heading

print("ok")
