#!/usr/bin/env python3
"""Report the production state a job's evidence supports, and optionally record it."""

from __future__ import annotations

import argparse
import json
import shutil
import subprocess
import sys
from pathlib import Path
from typing import Any, Callable


STATES = (
    "intake",
    "content_locked",
    "audio_locked",
    "visual_plan_locked",
    "presenter_generated",
    "composition_checked",
    "rendered",
    "verified",
)
VIDEO_SUFFIXES = {".mp4", ".mov", ".m4v", ".mkv", ".webm"}


class Evidence:
    def __init__(self, job: dict[str, Any], job_dir: Path) -> None:
        self.job = job
        self.job_dir = job_dir

    def section(self, name: str) -> dict[str, Any]:
        value = self.job.get(name)
        return value if isinstance(value, dict) else {}

    def resolve(self, value: str) -> Path:
        return (self.job_dir / Path(value).expanduser()).resolve()

    def file(self, section: str, key: str) -> tuple[Path | None, str | None]:
        value = str(self.section(section).get(key) or "").strip()
        if not value:
            return None, f"{section}.{key} is not recorded"
        path = self.resolve(value)
        if not path.is_file() or path.stat().st_size == 0:
            return None, f"{section}.{key} is missing or empty: {portable_name(value)}"
        return path, None

    def document(self, section: str, key: str) -> list[str]:
        _, problem = self.file(section, key)
        return [problem] if problem else []

    def media(self, section: str, key: str, video: bool, audio: bool) -> list[str]:
        path, problem = self.file(section, key)
        if problem:
            return [problem]
        kinds = stream_kinds(path)
        missing = [
            kind
            for kind, needed in (("video", video), ("audio", audio))
            if needed and kind not in kinds
        ]
        if missing:
            return [f"{section}.{key} has no decodable {' or '.join(missing)} stream"]
        return []

    def report(self, key: str, fallback: str = "") -> tuple[dict[str, Any] | None, list[str]]:
        value = str(self.section("qa").get(key) or fallback).strip()
        if not value:
            return None, [f"qa.{key} is not recorded"]
        path = self.resolve(value)
        try:
            data = json.loads(path.read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError):
            return None, [f"qa.{key} is missing or not JSON: {portable_name(value)}"]
        return data, []


def portable_name(value: str) -> str:
    path = Path(value).expanduser()
    return path.name if path.is_absolute() else path.as_posix()


def stream_kinds(path: Path) -> set[str]:
    result = subprocess.run(
        ["ffprobe", "-v", "error", "-show_entries", "stream=codec_type", "-of", "json", str(path)],
        capture_output=True,
        text=True,
    )
    if result.returncode != 0:
        return set()
    try:
        streams = json.loads(result.stdout).get("streams", [])
    except json.JSONDecodeError:
        return set()
    return {stream.get("codec_type") for stream in streams}


def content_locked(evidence: Evidence) -> list[str]:
    missing = []
    preflight, problems = evidence.report("preflight_report", "qa/reports/preflight.json")
    missing += problems
    if preflight is not None and preflight.get("ok") is not True:
        missing.append("preflight report is not ok; fix its errors and rerun preflight.py")
    missing += evidence.document("artifacts", "script")
    missing += evidence.document("artifacts", "beat_sheet")
    return missing


def audio_locked(evidence: Evidence) -> list[str]:
    missing = evidence.media("artifacts", "final_audio", video=False, audio=True) + evidence.document(
        "qa", "asr_report"
    )
    if evidence.section("creative").get("route") == "styled":
        path, problem = evidence.file("artifacts", "story")
        if problem:
            missing.append(problem)
        else:
            try:
                story = json.loads(path.read_text(encoding="utf-8"))
            except (OSError, json.JSONDecodeError):
                story = {}
                missing.append("artifacts.story is not a readable story.json")
            if story.get("draft"):
                missing.append("artifacts.story is a --dry draft; voice it with story.py before locking audio")
    return missing


def visual_plan_locked(evidence: Evidence) -> list[str]:
    missing = evidence.document("artifacts", "timeline") + evidence.document("artifacts", "storyboard")
    if evidence.section("plan").get("status") != "approved":
        missing.append('plan.status must be "approved"')
    return missing


def styled_film_ready(evidence: Evidence) -> list[str]:
    """For the styled route (no presenter) this state means: the explainer film project exists and was reviewed."""
    missing = evidence.document("artifacts", "story")
    value = str(evidence.section("artifacts").get("film_project") or "").strip()
    if not value:
        missing.append("artifacts.film_project is not recorded (the explainer film's project directory)")
    elif not (evidence.resolve(value) / "index.html").is_file():
        missing.append(f"artifacts.film_project has no index.html: {portable_name(value)}")
    missing += evidence.document("qa", "manual_visual_review")
    return missing


def presenter_generated(evidence: Evidence) -> list[str]:
    if evidence.section("creative").get("route") == "styled":
        return styled_film_ready(evidence)
    missing = []
    if not evidence.section("capabilities").get("main_presenter"):
        missing.append("capabilities.main_presenter must record the provider, model, and task IDs")
    selected = evidence.job_dir / "assets" / "video" / "selected"
    candidates = sorted(
        path
        for path in (selected.iterdir() if selected.is_dir() else [])
        if path.suffix.lower() in VIDEO_SUFFIXES
    )
    if not any("video" in stream_kinds(path) for path in candidates):
        missing.append("assets/video/selected has no decodable presenter video")
    missing += evidence.document("qa", "manual_visual_review")
    return missing


def composition_checked(evidence: Evidence) -> list[str]:
    return evidence.document("qa", "composition_report")


def rendered(evidence: Evidence) -> list[str]:
    return evidence.media("artifacts", "rendered", video=True, audio=True)


def verified(evidence: Evidence) -> list[str]:
    missing = evidence.media("artifacts", "master", video=True, audio=True)
    missing += evidence.media("artifacts", "share", video=True, audio=True)
    delivery, problems = evidence.report("delivery_report")
    missing += problems
    if delivery is not None:
        if delivery.get("status") != "verified":
            missing.append('delivery report status is not "verified"')
        if delivery.get("loudness_passed") is not True:
            missing.append(
                "delivery report has no passing output loudness; rerun finalize_delivery.sh"
            )
    return missing


CHECKS: dict[str, Callable[[Evidence], list[str]]] = {
    "content_locked": content_locked,
    "audio_locked": audio_locked,
    "visual_plan_locked": visual_plan_locked,
    "presenter_generated": presenter_generated,
    "composition_checked": composition_checked,
    "rendered": rendered,
    "verified": verified,
}


def write_atomic(path: Path, text: str) -> None:
    temporary = path.with_suffix(path.suffix + ".tmp")
    temporary.write_text(text, encoding="utf-8")
    temporary.replace(path)


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("job", help="Path to job.json")
    parser.add_argument(
        "--write",
        action="store_true",
        help="Record the evidenced state in job.json, moving it back if evidence is missing",
    )
    args = parser.parse_args()

    if not shutil.which("ffprobe"):
        print("ERROR: ffprobe is required", file=sys.stderr)
        return 2
    job_path = Path(args.job).expanduser().resolve()
    try:
        job = json.loads(job_path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        print(f"ERROR: could not read job manifest {job_path.name}: {exc}", file=sys.stderr)
        return 2

    evidence = Evidence(job, job_path.parent)
    evidenced = STATES[0]
    blocking: dict[str, list[str]] = {}
    for state in STATES[1:]:
        missing = CHECKS[state](evidence)
        if missing:
            blocking[state] = missing
            break
        evidenced = state

    recorded = job.get("state")
    evidenced_index = STATES.index(evidenced)
    recorded_index = STATES.index(recorded) if recorded in STATES else None
    consistent = recorded_index is not None and recorded_index <= evidenced_index

    written = False
    if args.write and recorded != evidenced:
        job["state"] = evidenced
        write_atomic(job_path, json.dumps(job, ensure_ascii=False, indent=2) + "\n")
        written = True

    next_state = STATES[evidenced_index + 1] if evidenced_index + 1 < len(STATES) else None
    result = {
        "job": job_path.name,
        "recorded_state": recorded,
        "evidenced_state": evidenced,
        "consistent": consistent,
        "written": written,
        "next_state": next_state,
        "missing_for_next": blocking.get(next_state, []) if next_state else [],
    }
    print(json.dumps(result, ensure_ascii=False, indent=2))
    return 0 if consistent or written else 1


if __name__ == "__main__":
    raise SystemExit(main())
