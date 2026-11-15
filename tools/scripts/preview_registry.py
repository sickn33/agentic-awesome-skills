#!/usr/bin/env python3
"""Generate the ordered preview registry using one fresh compatibility analysis.

No persisted cache: all skill bytes are analyzed anew on every invocation.
Standalone generators and their independent check modes remain unchanged.
"""
import json
import time
from _project_paths import find_repo_root
from plugin_compatibility import sync_plugin_compatibility
from generate_index import generate_index, mirror_canonical_index
from sync_editorial_bundles import sync_editorial_bundles


def preview(root):
    timings = []
    started = time.monotonic()
    report = sync_plugin_compatibility(root)
    timings.append({"stage": "compatibility", "elapsedMs": round((time.monotonic() - started) * 1000)})
    started = time.monotonic()
    generate_index(str(root / "skills"), str(root / "skills_index.json"), compatibility_report=report)
    mirror_canonical_index(root / "skills_index.json")
    timings.append({"stage": "index", "elapsedMs": round((time.monotonic() - started) * 1000)})
    started = time.monotonic()
    sync_editorial_bundles(root, compatibility_report=report)
    timings.append({"stage": "bundles", "elapsedMs": round((time.monotonic() - started) * 1000)})
    print("[registry:timing] " + json.dumps(timings))
    return timings


if __name__ == "__main__":
    preview(find_repo_root(__file__))
