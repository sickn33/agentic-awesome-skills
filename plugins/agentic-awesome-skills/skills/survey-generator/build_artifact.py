"""Generate a survey-paper-style HTML artifact with Kimi K2.6 via Fireworks.

The research collection and taxonomy (research_bundle.json) and the style spec
extracted from the RAG survey (style_spec.json) are prepared by the Claude Code
agent. This script sends that bundle to Kimi K2.6 on Fireworks and writes the
returned single-file HTML artifact to output/survey_v{N}.html.

Usage:
    export FIREWORKS_API_KEY=...  # already in zshrc
    python build_artifact.py
"""

from __future__ import annotations

import json
import os
import re
import sys
import time
from datetime import datetime
from pathlib import Path

import urllib.request
import urllib.error

HERE = Path(__file__).parent
BUNDLE_PATH = HERE / "research_bundle.json"
STYLE_PATH = HERE / "style_spec.json"
OUTPUT_DIR = HERE / "output"
RESULTS_PATH = HERE / "results.md"

DEFAULT_MODEL = "accounts/fireworks/models/kimi-k2p6"
MODEL = os.environ.get("FIREWORKS_MODEL", DEFAULT_MODEL)
ENDPOINT = "https://api.fireworks.ai/inference/v1/chat/completions"


def model_slug(model: str) -> str:
    """Turn a model path like accounts/fireworks/models/kimi-k2p5 into 'kimi-k2p5'."""
    return model.rsplit("/", 1)[-1]


SYSTEM_PROMPT = """You are a senior technical writer and HTML designer producing a single-file academic survey artifact.

You will receive two JSON payloads:
1. A research_bundle with the survey's title, taxonomy, sections, and a fixed bibliography of real papers.
2. A style_spec describing layout, typography, required figures, required tables, color palette, and hard rules.

Your job is to produce one self-contained HTML document that:
- Reads as an academic survey paper in style and structure.
- Uses only the bibliography entries provided. Never invent citations.
- Follows the section list from the research_bundle exactly.
- Renders all required figures as inline SVG.
- Obeys every rule in style_spec.hard_rules_for_generation.

Output the HTML document only. Do not include explanations, markdown fences, or commentary before or after the HTML. The first characters of your response must be <!DOCTYPE html> and the last characters must be </html>.
"""


USER_TEMPLATE = """Generate the survey artifact now.

=== research_bundle.json ===
{bundle}

=== style_spec.json ===
{style}

Requirements reminder:
- Single self-contained HTML file. Inline CSS and inline SVG only. No external assets.
- Body prose length target: 5000 to 6500 words across all sections. Each section should carry substantive discussion (at least 3 paragraphs) and integrate multiple cited works. Keep figures polished but simple. Prioritize finishing every section and the References list over figure elaboration.
- Cite only the bibliography entries above, using parenthetical citations like (Yao et al., 2022).
- Render Figure 1 (taxonomy tree), Figure 2 (three paradigm panels), and Figure 3 (harness stack) as inline SVG per style_spec.required_figures.
- Include Table 1 (representative systems) per style_spec.required_tables.
- End with a numbered References section listing every bibliography entry.
- Do not use em dashes or arrow symbols in body prose.

Output the HTML document now."""


def load_inputs() -> tuple[dict, dict]:
    if not BUNDLE_PATH.exists():
        raise SystemExit(
            "research_bundle.json not found next to build_artifact.py.\n"
            "Start by copying templates/research_bundle_template.json and filling it in,\n"
            "or adapt examples/agentic-engineering/research_bundle.json as a starting point."
        )
    bundle = json.loads(BUNDLE_PATH.read_text())
    style = json.loads(STYLE_PATH.read_text())
    return bundle, style


def build_messages(bundle: dict, style: dict) -> list[dict]:
    user = USER_TEMPLATE.format(
        bundle=json.dumps(bundle, indent=2),
        style=json.dumps(style, indent=2),
    )
    return [
        {"role": "system", "content": SYSTEM_PROMPT},
        {"role": "user", "content": user},
    ]


def call_fireworks(messages: list[dict], api_key: str) -> dict:
    payload = {
        "model": MODEL,
        "messages": messages,
        "temperature": 0.4,
        "top_p": 0.95,
        "max_tokens": 81920,
    }
    req = urllib.request.Request(
        ENDPOINT,
        data=json.dumps(payload).encode("utf-8"),
        headers={
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
            "Accept": "application/json",
        },
        method="POST",
    )
    t0 = time.time()
    try:
        with urllib.request.urlopen(req, timeout=600) as resp:
            raw = resp.read().decode("utf-8")
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8", errors="replace")
        print(f"HTTPError {e.code}: {body}", file=sys.stderr)
        raise
    elapsed = time.time() - t0
    data = json.loads(raw)
    data["_elapsed_sec"] = elapsed
    return data


def extract_html(content: str) -> str:
    """Strip any accidental markdown fences or stray prose around the HTML."""
    text = content.strip()
    # Remove leading ```html or ``` fences
    text = re.sub(r"^```(?:html)?\s*", "", text)
    text = re.sub(r"\s*```\s*$", "", text)
    # Find <!DOCTYPE html> start if present; else keep as is
    start = text.lower().find("<!doctype html")
    if start > 0:
        text = text[start:]
    return text.strip()


def next_version_path() -> Path:
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    slug = model_slug(MODEL)
    # Legacy compatibility: if unslugged files exist, leave them and use slugged names going forward.
    existing = sorted(OUTPUT_DIR.glob(f"survey_{slug}_v*.html"))
    n = len(existing) + 1
    return OUTPUT_DIR / f"survey_{slug}_v{n}.html"


def append_results(entry: str) -> None:
    header = "# Kimi K2.6 Agent Harness Survey - Run Log\n\n" if not RESULTS_PATH.exists() else ""
    with RESULTS_PATH.open("a") as f:
        if header:
            f.write(header)
        f.write(entry)


def main() -> int:
    api_key = os.environ.get("FIREWORKS_API_KEY")
    if not api_key:
        print("FIREWORKS_API_KEY is not set in the environment.", file=sys.stderr)
        return 2

    bundle, style = load_inputs()
    messages = build_messages(bundle, style)

    print(f"Calling Fireworks model {MODEL}...")
    print(f"Prompt size: {sum(len(m['content']) for m in messages)} chars")

    data = call_fireworks(messages, api_key)

    choice = data["choices"][0]
    content = choice["message"]["content"]
    html = extract_html(content)

    out_path = next_version_path()
    out_path.write_text(html)

    usage = data.get("usage", {})
    elapsed = data.get("_elapsed_sec", 0.0)

    entry = (
        f"\n## Run at {datetime.now().isoformat(timespec='seconds')}\n"
        f"- Output: `{out_path.relative_to(HERE)}`\n"
        f"- Model: `{MODEL}`\n"
        f"- Elapsed: {elapsed:.1f}s\n"
        f"- Prompt tokens: {usage.get('prompt_tokens', 'n/a')}\n"
        f"- Completion tokens: {usage.get('completion_tokens', 'n/a')}\n"
        f"- Total tokens: {usage.get('total_tokens', 'n/a')}\n"
        f"- Finish reason: {choice.get('finish_reason', 'n/a')}\n"
        f"- HTML length: {len(html)} chars\n"
        f"- HTML starts with: `{html[:60].replace(chr(10), ' ')}`\n"
    )
    append_results(entry)

    print(f"\nWrote {out_path}")
    print(f"Elapsed {elapsed:.1f}s, completion tokens {usage.get('completion_tokens', 'n/a')}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
