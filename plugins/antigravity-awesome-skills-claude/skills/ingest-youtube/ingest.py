#!/usr/bin/env python3
"""
ingest.py: YouTube-to-vault normalizer for the ingest-youtube skill.

Takes a YouTube URL (and optional vault root), shells out to yt-dlp for
metadata + subtitles, cleans VTT timing markers into prose, and writes
External Inputs/YouTube/<channel-slug>/<YYYY-MM-DD>-<video-slug>.md.

Stdout: human-readable summary.
Exit non-zero on any failure (no silent partial writes).

Usage:
    python3 ingest.py <youtube-url> [--vault <path>] [--lang <code>]

Defaults:
    --vault: $VAULT_ROOT or current dir
    --lang:  en,es (try English first, then Spanish; matches a common
             EN+ES bilingual default for users with multilingual content)
    --whisper: accepted as a future fallback flag; this version writes a stub
               if subtitles are unavailable
"""
from __future__ import annotations

import argparse
import json
import os
import re
import shutil
import subprocess
import sys
import tempfile
from datetime import datetime, timezone
from pathlib import Path

VTT_TIMING_RE = re.compile(r"\d{2}:\d{2}:\d{2}\.\d{3} --> \d{2}:\d{2}:\d{2}\.\d{3}.*")
VTT_HEADER_RE = re.compile(r"^(WEBVTT|Kind:|Language:|NOTE\s|X-TIMESTAMP-MAP)", re.MULTILINE)
SLUG_RE = re.compile(r"[^a-z0-9]+")
SEED_KEYWORDS = (
    "decision", "framework", "model", "principle", "the lesson is",
    "playbook", "anti-pattern", "case study", "what i learned",
    "the trick is", "the insight is",
)


def slugify(text: str, max_len: int = 60) -> str:
    s = SLUG_RE.sub("-", text.lower()).strip("-")
    return s[:max_len].rstrip("-") or "untitled"


def require_bin(name: str) -> str:
    path = shutil.which(name)
    if not path:
        sys.stderr.write(
            f"Error: {name} not installed. Install with `brew install {name}` "
            f"(macOS) or `pip3 install --user {name}`.\n"
        )
        sys.exit(2)
    return path


def fetch_metadata(url: str, ytdlp: str) -> dict:
    proc = subprocess.run(
        [ytdlp, "--skip-download", "--print-json", "--no-warnings", url],
        capture_output=True, text=True, check=False,
    )
    if proc.returncode != 0:
        sys.stderr.write(f"yt-dlp metadata fetch failed:\n{proc.stderr}\n")
        sys.exit(3)
    return json.loads(proc.stdout)


def list_subs(url: str, ytdlp: str) -> str:
    proc = subprocess.run(
        [ytdlp, "--list-subs", "--skip-download", "--no-warnings", url],
        capture_output=True, text=True, check=False,
    )
    return proc.stdout


def parse_available_subs(listing: str) -> tuple[set[str], set[str]]:
    """Return (manual_langs, auto_langs) from --list-subs output."""
    manual: set[str] = set()
    auto: set[str] = set()
    section = None
    for line in listing.splitlines():
        low = line.strip().lower()
        if "available subtitles" in low:
            section = "manual"
            continue
        if "available automatic captions" in low:
            section = "auto"
            continue
        if not line.strip() or line.startswith("Language"):
            continue
        if section in ("manual", "auto"):
            code = line.split()[0] if line.split() else ""
            if re.fullmatch(r"[a-z]{2,3}(-[a-zA-Z0-9]+)?", code):
                (manual if section == "manual" else auto).add(code)
    return manual, auto


def pick_lang(prefs: list[str], manual: set[str], auto: set[str]) -> tuple[str, str] | None:
    """Return (lang_code, source) where source is 'manual' or 'auto', or None."""
    for code in prefs:
        if code in manual:
            return code, "manual"
    for code in prefs:
        if code in auto:
            return code, "auto"
    if manual:
        return next(iter(sorted(manual))), "manual"
    if auto:
        return next(iter(sorted(auto))), "auto"
    return None


def download_subs(url: str, lang: str, source: str, ytdlp: str, workdir: Path) -> Path:
    flag = "--write-sub" if source == "manual" else "--write-auto-sub"
    out_template = str(workdir / "%(id)s.%(ext)s")
    proc = subprocess.run(
        [ytdlp, flag, "--sub-lang", lang, "--skip-download",
         "--sub-format", "vtt", "-o", out_template, "--no-warnings", url],
        capture_output=True, text=True, check=False,
    )
    if proc.returncode != 0:
        sys.stderr.write(f"yt-dlp subtitle download failed:\n{proc.stderr}\n")
        sys.exit(4)
    matches = list(workdir.glob("*.vtt"))
    if not matches:
        sys.stderr.write("yt-dlp reported success but no .vtt file landed\n")
        sys.exit(5)
    return matches[0]


def clean_vtt(vtt_path: Path) -> str:
    raw = vtt_path.read_text(encoding="utf-8", errors="replace")
    lines = []
    seen_phrases: set[str] = set()
    for line in raw.splitlines():
        line = line.rstrip()
        if not line:
            continue
        if VTT_TIMING_RE.match(line) or VTT_HEADER_RE.match(line):
            continue
        if line.isdigit():
            continue
        cleaned = re.sub(r"<[^>]+>", "", line).strip()
        if not cleaned:
            continue
        if cleaned in seen_phrases:
            continue
        seen_phrases.add(cleaned)
        lines.append(cleaned)
    text = " ".join(lines)
    text = re.sub(r"\s+", " ", text).strip()
    sentences = re.split(r"(?<=[.!?])\s+(?=[A-ZÁÉÍÓÚÑ¿¡])", text)
    return "\n\n".join(s.strip() for s in sentences if s.strip())


def detect_seeds(transcript: str) -> list[str]:
    low = transcript.lower()
    return [kw for kw in SEED_KEYWORDS if kw in low]


def write_vault_file(
    vault_root: Path, channel_slug: str, upload_date: str,
    video_slug: str, frontmatter: dict, body: str,
) -> Path:
    target_dir = vault_root / "External Inputs" / "YouTube" / channel_slug
    target_dir.mkdir(parents=True, exist_ok=True)
    target = target_dir / f"{upload_date}-{video_slug}.md"
    yaml_lines = ["---"]
    for k, v in frontmatter.items():
        if isinstance(v, str) and ("\n" in v or ":" in v):
            v = v.replace('"', '\\"')
            yaml_lines.append(f'{k}: "{v}"')
        else:
            yaml_lines.append(f"{k}: {v}")
    yaml_lines.append("---")
    target.write_text("\n".join(yaml_lines) + "\n\n" + body + "\n", encoding="utf-8")
    return target


def write_seed_stub(
    vault_root: Path, upload_date: str, channel_slug: str, video_id: str,
    seeds: list[str], video_url: str, video_title: str,
) -> Path:
    captures_dir = vault_root / "Meta" / "Captures"
    captures_dir.mkdir(parents=True, exist_ok=True)
    fname = f"{upload_date}-youtube-{channel_slug}-{video_id}.md"
    target = captures_dir / fname
    body = (
        "---\n"
        "type: capture\n"
        "source: youtube\n"
        f"video_url: {video_url}\n"
        f"detected_at: {datetime.now(timezone.utc).isoformat()}\n"
        f"keywords: {', '.join(seeds)}\n"
        "status: open\n"
        "---\n\n"
        f"# Capture seed: {video_title}\n\n"
        f"Trigger keywords detected in transcript: {', '.join(seeds)}.\n\n"
        f"Source: {video_url}\n\n"
        "## Notes\n\n(fill in)\n"
    )
    target.write_text(body, encoding="utf-8")
    return target


def main() -> int:
    parser = argparse.ArgumentParser(description="Ingest a YouTube video transcript into the vault")
    parser.add_argument("url", help="YouTube video URL")
    parser.add_argument("--vault", default=None, help="Vault root path (default: $VAULT_ROOT or .)")
    parser.add_argument("--lang", default="en,es", help="Comma-separated language preference")
    parser.add_argument("--whisper", action="store_true", help="Enable Whisper fallback if no subs")
    args = parser.parse_args()

    vault_root = Path(args.vault or os.environ.get("VAULT_ROOT") or ".").resolve()
    if not vault_root.is_dir():
        sys.stderr.write(f"Vault root not a directory: {vault_root}\n")
        return 1

    ytdlp = require_bin("yt-dlp")
    prefs = [c.strip() for c in args.lang.split(",") if c.strip()]

    meta = fetch_metadata(args.url, ytdlp)
    video_id = meta.get("id", "unknown")
    title = meta.get("title", "Untitled")
    channel = meta.get("channel") or meta.get("uploader") or "unknown-channel"
    channel_slug = slugify(channel)
    video_slug = slugify(title)
    upload_date_raw = meta.get("upload_date", "")
    upload_date = (
        f"{upload_date_raw[:4]}-{upload_date_raw[4:6]}-{upload_date_raw[6:8]}"
        if len(upload_date_raw) == 8 else
        datetime.now().strftime("%Y-%m-%d")
    )

    listing = list_subs(args.url, ytdlp)
    manual, auto = parse_available_subs(listing)
    pick = pick_lang(prefs, manual, auto)

    sub_source = "none"
    transcript = ""
    lang_code = "und"

    if pick:
        lang_code, sub_source = pick
        with tempfile.TemporaryDirectory() as td:
            vtt = download_subs(args.url, lang_code, sub_source, ytdlp, Path(td))
            transcript = clean_vtt(vtt)
    elif args.whisper:
        sys.stderr.write("Whisper fallback requested but not yet implemented in v0.1.\n")
        sys.stderr.write("Install whisper-cpp + ggml model and re-run, or pre-add subs to the video.\n")
        sub_source = "none"
    else:
        sys.stderr.write("No subtitles available and --whisper not set. Writing stub.\n")
        sub_source = "none"

    word_count = len(transcript.split()) if transcript else 0
    seeds = detect_seeds(transcript) if transcript else []

    body = transcript or (
        f"# {title}\n\n"
        f"No subtitles or auto-captions available for this video.\n\n"
        "To capture this transcript, add captions to the source video or transcribe the audio "
        "with your local Whisper workflow and re-run ingest.\n\n"
        f"Source: {args.url}\n"
    )

    fm = {
        "type": "external-input",
        "source": "youtube",
        "video_id": video_id,
        "url": args.url,
        "channel": channel,
        "channel_url": meta.get("channel_url", ""),
        "title": title,
        "upload_date": upload_date,
        "duration_seconds": meta.get("duration", 0),
        "language": lang_code,
        "subtitle_source": sub_source,
        "word_count": word_count,
        "ingested_at": datetime.now(timezone.utc).isoformat(),
    }

    target = write_vault_file(vault_root, channel_slug, upload_date, video_slug, fm, body)
    seed_paths: list[Path] = []
    if seeds:
        seed_paths.append(
            write_seed_stub(vault_root, upload_date, channel_slug, video_id, seeds, args.url, title)
        )

    seed_str = f" Seeds at: {', '.join(str(p) for p in seed_paths)}." if seed_paths else ""
    print(
        f"Wrote {word_count} words to {target}. "
        f"Language: {lang_code}. Subtitle source: {sub_source}.{seed_str}"
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
