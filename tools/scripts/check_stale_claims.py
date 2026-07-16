#!/usr/bin/env python3
from __future__ import annotations

import sys

from _project_paths import find_repo_root
from audit_consistency import find_local_consistency_issues
from update_readme import configure_utf8_output


def main() -> int:
    root = find_repo_root(__file__)
    issues = find_local_consistency_issues(root)
    if issues:
        for issue in issues:
            print(f"❌ {issue}")
        return 1

    print("✅ No stale claims detected in active docs.")
    return 0


if __name__ == "__main__":
    configure_utf8_output()
    sys.exit(main())
