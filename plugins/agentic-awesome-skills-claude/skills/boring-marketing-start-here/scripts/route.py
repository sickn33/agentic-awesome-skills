#!/usr/bin/env python3
"""Route marketing work from a goal or a named skill using public toolsets.

Usage:
  route.py (--goal GOAL | --task SKILL | --request TEXT) [--brand SLUG] [--root DIR]
           [--skills-dir DIR] [--capabilities PATH] [--all-brands]

The router reads each skill's frontmatter at runtime, so its dependency checks
stay aligned with the skill files. It reports optional input gaps instead of
blocking work, and never includes credential values in its output.
Python 3 standard library only.
"""

import argparse
import datetime
import json
import re
import sys
from pathlib import Path


SKILL_PREFIX = "boring-marketing-"
SCRIPT_DIR = Path(__file__).resolve().parent
DEFAULT_SKILLS_DIR = SCRIPT_DIR.parent.parent / "skills"
if not DEFAULT_SKILLS_DIR.is_dir():  # running from a copy inside the skills folder
    DEFAULT_SKILLS_DIR = SCRIPT_DIR.parent.parent
if str(SCRIPT_DIR) not in sys.path:
    sys.path.insert(0, str(SCRIPT_DIR))
import capability


# Each tuple is a workflow name followed by ordered parallel stages. The stage
# structure is deliberately declarative; frontmatter supplies the inputs.
GOAL_SEQUENCES = {
    "traffic": (
        "Content Engine",
        [
            [
                (
                    "keyword-research",
                    "Find and prioritize what's worth ranking for before writing anything",
                )
            ],
            [
                (
                    "seo-content",
                    "Write the top-priority pillar so there's something to rank and distribute",
                )
            ],
            [
                (
                    "content-atomizer",
                    "Turn the pillar into platform-native social assets",
                ),
                (
                    "newsletter",
                    "Feature the pillar in an owned-audience edition",
                ),
            ],
        ],
    ),
    "leads": (
        "I Need Leads",
        [
            [
                (
                    "lead-magnet",
                    "Concept + build the opt-in offer the whole funnel hangs off",
                )
            ],
            [
                (
                    "landing-page",
                    "Landing page for the magnet: copy via direct-response-copy's method, then built + shipped",
                ),
                (
                    "email-sequences",
                    "Welcome sequence so new subscribers don't go cold",
                ),
            ],
            [
                (
                    "content-atomizer",
                    "Promo posts that drive traffic to the magnet",
                )
            ],
        ],
    ),
    "convert": (
        "Fix Conversion",
        [
            [
                (
                    "positioning-angles",
                    "Most conversion problems are positioning problems: re-find the angle",
                )
            ],
            [
                (
                    "direct-response-copy",
                    "Rewrite the conversion surface on the chosen angle, with score loop",
                )
            ],
            [
                (
                    "email-sequences",
                    "Nurture/conversion sequence to close the leads you already have",
                )
            ],
        ],
    ),
    "authority": (
        "Build Authority",
        [
            [
                (
                    "brand-voice",
                    "A falsifiable voice profile so authority content sounds like you",
                )
            ],
            [
                (
                    "social-content",
                    "Original posts build public authority fastest",
                ),
                (
                    "newsletter",
                    "Owned-audience editions compound authority over time",
                ),
            ],
            [
                (
                    "content-atomizer",
                    "Distribute each piece across the 2-3 platforms that matter",
                )
            ],
        ],
    ),
    "launch": (
        "Launch",
        [
            [
                (
                    "positioning-angles",
                    "The launch angle gates everything downstream",
                )
            ],
            [
                (
                    "landing-page",
                    "Launch landing page from the chosen angle. Copy via direct-response-copy's method, then built + shipped",
                ),
                ("creative", "Ad creative from the ad-matrix the angle produced"),
            ],
            [
                (
                    "email-sequences",
                    "Launch sequence (cart open → urgency → close)",
                ),
                ("content-atomizer", "Launch social from the landing page"),
                ("paid-ads", "Campaigns mapped to the ad-matrix cells"),
            ],
        ],
    ),
    "unsure": (
        "Foundation From Zero",
        [
            [
                ("brand-voice", "Extract/build the voice profile"),
                (
                    "positioning-angles",
                    "Competitive fan-out → 3-5 angles, star one",
                ),
                (
                    "audience-research",
                    "Mine reviews/communities → audience + verbatim VoC",
                ),
                ("competitive-intel", "Teardown of 3-6 competitors"),
            ]
        ],
    ),
    # Local-business pack: a plumber, a dentist, a roofer, or an agency serving them.
    "found": (
        "Get Found Locally",
        [
            [
                (
                    "google-business-profile",
                    "Close the profile gaps against the top 3 in the map pack, where most local calls start",
                )
            ],
            [
                (
                    "local-seo-plan",
                    "Decide which services and towns earn a page before writing any",
                )
            ],
            [
                (
                    "service-area-pages",
                    "Write the pages the plan approved, each with real local proof",
                )
            ],
        ],
    ),
    "chosen": (
        "Get Chosen",
        [
            [
                (
                    "reviews",
                    "Fix review pace and replies; rating and recency decide who gets the call",
                ),
                (
                    "first-screen-check",
                    "Check the phone view: number, promise and proof on the first screen",
                ),
            ],
            [
                (
                    "landing-page",
                    "Rebuild the page the check flagged: one service, one offer, phone first",
                )
            ],
        ],
    ),
    "calls": (
        "Make the Phone Ring",
        [
            [
                (
                    "google-ads-tracking",
                    "Count calls and forms first, so the ads bid on real leads",
                ),
                (
                    "speed-to-lead",
                    "Stop losing the leads you already get: missed calls and slow replies",
                ),
            ],
            [("paid-ads", "Write and structure the campaigns on clean tracking")],
            [
                (
                    "ads-incrementality-check",
                    "After a few weeks of spend, check the ads add calls instead of taking credit",
                )
            ],
        ],
    ),
    "clients": (
        "Win Clients",
        [
            [
                (
                    "find-local-clients",
                    "Pick a trade and a town, then rank the businesses losing the most customers",
                )
            ],
            [
                (
                    "pitch-the-fix",
                    "One broken thing per owner, with a fix you can sell",
                )
            ],
        ],
    ),
}


FOUNDATION_OWNER = {
    "voice-profile": "brand-voice",
    "positioning": "positioning-angles",
    "audience": "audience-research",
    "voc": "audience-research",
    "competitors": "competitive-intel",
}
OTHER_PRODUCER = {
    "keyword-plan": "keyword-research",
    "creative-kit": "creative",
    "social-canon": "social-content",
}
IGNORED_INPUTS = {
    "brand-manifest",
    "assets",
    "learnings",
    "stack",
    "algo-cache",
}
FOUNDATION_ORDER = [
    "brand-voice",
    "positioning-angles",
    "audience-research",
    "competitive-intel",
]
FRESH_DAYS = 30
STALE_DAYS = 90


CAP_ENHANCES = {
    "web-scrape": [
        "brand-voice",
        "positioning-angles",
        "audience-research",
        "competitive-intel",
        "keyword-research",
        "seo-content",
        "ai-search",
        "landing-page",
        "programmatic-seo",
        "start-here",
        "google-business-profile",
        "local-seo-plan",
        "service-area-pages",
        "reviews",
        "first-screen-check",
        "find-local-clients",
        "pitch-the-fix",
        "long-form-article",
        "site-audit",
    ],
    "web-search": [
        "keyword-research",
        "seo-content",
        "competitive-intel",
        "ai-search",
        "positioning-angles",
        "lead-magnet",
        "google-business-profile",
        "local-seo-plan",
        "reviews",
        "find-local-clients",
        "long-form-article",
    ],
    "social-data": [
        "audience-research",
        "competitive-intel",
        "social-content",
        "content-atomizer",
    ],
    "creative": ["creative", "paid-ads", "landing-page", "meta-ads"],
    "esp": ["email-sequences", "newsletter", "lead-magnet"],
    "analytics": ["performance-review", "keyword-research", "ads-incrementality-check"],
    "search-console": [
        "performance-review",
        "seo-content",
        "keyword-research",
        "local-seo-plan",
        "service-area-pages",
        "site-audit",
    ],
    "ads": [
        "paid-ads",
        "performance-review",
        "google-ads-tracking",
        "ads-incrementality-check",
        "meta-ads",
    ],
    "social-api": ["social-content", "performance-review"],
    "scheduling": ["content-atomizer", "social-content"],
}

ADVISOR_BY_GOAL = {
    "traffic": ["web-scrape", "search-console", "analytics"],
    "leads": ["esp", "web-scrape", "analytics"],
    "convert": ["web-scrape", "analytics", "esp"],
    "authority": ["social-data", "web-scrape", "social-api"],
    "launch": ["creative", "esp", "ads"],
    "unsure": ["web-scrape", "social-data", "esp"],
    "found": ["web-scrape", "search-console", "analytics"],
    "chosen": ["web-scrape", "analytics", "esp"],
    "calls": ["ads", "analytics", "web-scrape"],
    "clients": ["web-scrape", "social-data", "esp"],
}

ADVISOR_LINES = {
    "web-scrape": "For optimal results add FIRECRAWL_API_KEY: research pulls full pages instead of summaries (see TOOLS.md).",
    "social-data": "For optimal results add SCRAPECREATORS_API_KEY: audience and competitor research reads real posts and comments (see TOOLS.md).",
    "creative": "For optimal results add REPLICATE_API_TOKEN: /creative generates and scores images and video (see TOOLS.md).",
    "esp": "For optimal results add your ESP key (Kit or Beehiiv): sequences push straight to your list (see TOOLS.md).",
    "analytics": "For optimal results connect GA4 or PostHog: /performance-review learns from your real numbers (see TOOLS.md).",
    "search-console": "For optimal results connect Search Console: keyword and content work uses your real queries (see TOOLS.md).",
    "ads": "For optimal results add your Meta or Google Ads token: /paid-ads reads real campaign data (see TOOLS.md).",
    "social-api": "For optimal results add X_BEARER_TOKEN: /social-content learns from your post performance (see TOOLS.md).",
    "scheduling": "For optimal results add BUFFER_ACCESS_TOKEN: atomized posts can be scheduled directly (see TOOLS.md).",
    "web-search": "Web search is available in Claude Code by default; nothing to add.",
}


def _frontmatter(text):
    """Return the initial YAML frontmatter text, or an empty string."""
    lines = text.splitlines()
    if not lines or lines[0].strip() != "---":
        return ""
    for index, line in enumerate(lines[1:], 1):
        if line.strip() == "---":
            return "\n".join(lines[1:index])
    return ""


def _clean_list_item(value):
    return value.strip().strip("'\"")


def _frontmatter_list(frontmatter, key):
    """Read a simple YAML flow or block list from skill frontmatter."""
    lines = frontmatter.splitlines()
    heading = re.compile(r"^(?P<indent>\s*)" + re.escape(key) + r":\s*(?P<value>.*)$")
    for index, line in enumerate(lines):
        match = heading.match(line)
        if not match:
            continue
        indent = len(match.group("indent"))
        value = match.group("value").strip()
        if value.startswith("["):
            pieces = [value]
            cursor = index
            while "]" not in " ".join(pieces) and cursor + 1 < len(lines):
                cursor += 1
                pieces.append(lines[cursor].strip())
            joined = " ".join(pieces)
            end = joined.find("]")
            if end == -1:
                return []
            contents = joined[joined.find("[") + 1:end]
            return [_clean_list_item(item) for item in contents.split(",") if item.strip()]
        if value:
            return [_clean_list_item(value)]

        items = []
        for candidate in lines[index + 1:]:
            item = re.match(r"^(?P<indent>\s*)-\s*(?P<value>.+?)\s*$", candidate)
            if item and len(item.group("indent")) > indent:
                items.append(_clean_list_item(item.group("value")))
                continue
            if not candidate.strip():
                continue
            break
        return items
    return []


def _skill_file(skills_dir, skill):
    if not re.fullmatch(r"[a-z0-9]+(?:-[a-z0-9]+)*", skill):
        return None
    return Path(skills_dir) / (SKILL_PREFIX + skill.removeprefix(SKILL_PREFIX)) / "SKILL.md"


def skill_meta(skills_dir, skill):
    """Return reads and writes parsed from one installed skill at runtime."""
    skill_file = _skill_file(skills_dir, skill)
    if skill_file is None or not skill_file.is_file():
        return {"exists": False, "reads": [], "writes": []}
    try:
        frontmatter = _frontmatter(skill_file.read_text(encoding="utf-8"))
    except OSError:
        return {"exists": False, "reads": [], "writes": []}
    return {
        "exists": True,
        "reads": _frontmatter_list(frontmatter, "reads"),
        "writes": _frontmatter_list(frontmatter, "writes"),
    }


def _base_token(token):
    return str(token).partition("#")[0].strip()


def token_filename(token):
    """Map a skill token to its brand-memory filename."""
    base = _base_token(token)
    return "brand.yaml" if base == "brand-manifest" else base + ".md"


def _date(value):
    try:
        return datetime.date.fromisoformat(str(value).strip().strip("'\"")[:10])
    except (TypeError, ValueError):
        return None


def _manifest_file_dates(brand_dir):
    """Read file update dates from the small YAML subset used by brand.yaml."""
    manifest = Path(brand_dir) / "brand.yaml"
    try:
        lines = manifest.read_text(encoding="utf-8").splitlines()
    except OSError:
        return {}

    dates = {}
    in_files = False
    files_indent = 0
    entry_indent = None
    active_file = None
    active_indent = 0
    for line in lines:
        if not in_files:
            section = re.match(r"^(?P<indent>\s*)files:\s*$", line)
            if section:
                in_files = True
                files_indent = len(section.group("indent"))
            continue

        if line.strip() and len(line) - len(line.lstrip()) <= files_indent:
            break
        file_entry = re.match(
            r"^(?P<indent>\s*)(?P<name>[A-Za-z0-9_.-]+):\s*(?P<rest>.*)$",
            line,
        )
        entry_indent_here = (
            len(file_entry.group("indent")) if file_entry is not None else None
        )
        if (
            file_entry
            and entry_indent_here > files_indent
            and (entry_indent is None or entry_indent_here == entry_indent)
        ):
            entry_indent = entry_indent_here
            name = file_entry.group("name")
            rest = file_entry.group("rest")
            active_file = name
            active_indent = len(file_entry.group("indent"))
            inline = re.search(r"\bupdated:\s*([^,}\s]+)", rest)
            if inline:
                parsed = _date(inline.group(1))
                if parsed is not None:
                    dates[name] = parsed
            continue

        updated = re.match(r"^(?P<indent>\s*)updated:\s*(?P<value>\S+)", line)
        if (
            updated
            and active_file is not None
            and len(updated.group("indent")) > active_indent
        ):
            parsed = _date(updated.group("value"))
            if parsed is not None:
                dates[active_file] = parsed
    return dates


def file_state(brand_dir, token, manifest_dates=None):
    """Return whether a token file exists and its age in days when known."""
    filename = token_filename(token)
    path = Path(brand_dir) / filename
    if not path.is_file():
        return False, None
    dates = manifest_dates if manifest_dates is not None else _manifest_file_dates(brand_dir)
    updated = dates.get(filename)
    if updated is None:
        try:
            updated = datetime.date.fromtimestamp(path.stat().st_mtime)
        except OSError:
            return True, None
    return True, (datetime.date.today() - updated).days


def _available(manifest, toolset):
    capability_info = manifest.get("capabilities", {}).get(toolset, {})
    return bool(capability_info.get("available"))


def _providers(capability_info):
    values = capability_info.get("providers") or []
    if not isinstance(values, list):
        values = []
    if not values and capability_info.get("via"):
        values = [capability_info["via"]]
    return [str(value) for value in values if value]


def grounding_for(skill, manifest):
    """Describe optional public providers that improve this skill's grounding."""
    selected = []
    capabilities = manifest.get("capabilities", {})
    for toolset, affected_skills in CAP_ENHANCES.items():
        if skill not in affected_skills:
            continue
        info = capabilities.get(toolset, {})
        if not info.get("available"):
            continue
        for provider in _providers(info):
            if provider not in selected:
                selected.append(provider)
    return {"mode": "enhanced" if selected else "base", "via": selected}


def advisor_for(goal, manifest):
    """Return one highest-impact stack recommendation, or None."""
    missing = [
        toolset
        for toolset in ADVISOR_BY_GOAL[goal]
        if not _available(manifest, toolset)
    ]
    if missing:
        toolset = missing[0]
        return {"toolset": toolset, "line": ADVISOR_LINES[toolset]}
    return None


def _missing_inputs(metadata, brand_dir, manifest_dates, produced):
    """Find absent reads that were not written by an earlier plan stage."""
    self_writes = {_base_token(token) for token in metadata["writes"]}
    missing = []
    seen = set()
    for token in metadata["reads"]:
        base = _base_token(token)
        if base in IGNORED_INPUTS or base in self_writes or base in produced:
            continue
        exists, _ = file_state(brand_dir, base, manifest_dates)
        filename = token_filename(base)
        if not exists and filename not in seen:
            seen.add(filename)
            missing.append(filename)
    return missing


def _stage_copy(goal):
    return [list(stage) for stage in GOAL_SEQUENCES[goal][1]]


def _freshness_adjustments(goal, stages, brand_dir, metadata_for, manifest_dates):
    """Apply workflow freshness rules and return explanatory notes."""
    notes = []
    if goal == "launch":
        exists, age = file_state(brand_dir, "positioning", manifest_dates)
        if exists and age is not None and age < FRESH_DAYS:
            stages[:] = [
                [entry for entry in stage if entry[0] != "positioning-angles"]
                for stage in stages
            ]
            stages[:] = [stage for stage in stages if stage]
            notes.append(
                "positioning.md is fresh (<30d), skipped /positioning-angles per the Launch workflow."
            )

    if goal == "unsure":
        remaining = []
        for skill, why in stages[0]:
            outputs = metadata_for(skill)["writes"]
            output_states = [
                file_state(brand_dir, _base_token(output), manifest_dates)
                for output in outputs
            ]
            fresh = bool(output_states) and all(
                exists and (age is None or age < FRESH_DAYS)
                for exists, age in output_states
            )
            if fresh:
                notes.append(
                    "/{0} skipped: its outputs already exist and are fresh.".format(skill)
                )
            else:
                remaining.append((skill, why))
        stages[:] = [remaining] if remaining else []
        if not remaining:
            notes.append(
                "Foundation is complete and fresh: re-run with a concrete --goal (traffic|leads|convert|authority|launch)."
            )
    return notes


def _foundation_stage(stages, brand_dir, metadata_for, manifest_dates):
    """Build the recursive stage-zero foundation prerequisite group."""
    planned = {skill for stage in stages for skill, _ in stage}
    queue = [skill for stage in stages for skill, _ in stage]
    checked = set()
    requirements = {}

    while queue:
        consumer = queue.pop(0)
        if consumer in checked:
            continue
        checked.add(consumer)
        metadata = metadata_for(consumer)
        self_writes = {_base_token(token) for token in metadata["writes"]}
        for token in metadata["reads"]:
            base = _base_token(token)
            if base in IGNORED_INPUTS or base in self_writes:
                continue
            owner = FOUNDATION_OWNER.get(base)
            if owner is None or owner in planned:
                continue
            exists, _ = file_state(brand_dir, base, manifest_dates)
            if exists:
                continue
            filename = token_filename(base)
            requirements.setdefault(owner, {}).setdefault(filename, set()).add(consumer)
            if owner not in checked:
                queue.append(owner)

    stage = []
    for owner in FOUNDATION_ORDER:
        required_files = requirements.get(owner)
        if not required_files:
            continue
        detail = "; ".join(
            "{0} missing: needed by {1}".format(
                filename, ", ".join(sorted(consumers))
            )
            for filename, consumers in sorted(required_files.items())
        )
        stage.append((owner, "Foundation prerequisite: " + detail))
    return stage


def _emit_sequence(stages, brand_dir, manifest, metadata_for, manifest_dates):
    """Convert stage declarations to stable, annotated output entries."""
    sequence = []
    produced = set()
    for number, stage in enumerate(stages):
        names = [skill for skill, _ in stage]
        writes_this_stage = set()
        for skill, why in stage:
            metadata = metadata_for(skill)
            sequence.append(
                {
                    "skill": skill,
                    "stage": number,
                    "why": why,
                    "runs_parallel_with": [name for name in names if name != skill],
                    "inputs_missing": _missing_inputs(
                        metadata, brand_dir, manifest_dates, produced
                    ),
                    "grounding": grounding_for(skill, manifest),
                }
            )
            writes_this_stage.update(_base_token(token) for token in metadata["writes"])
        produced.update(writes_this_stage)
    return sequence


def build_goal_plan(goal, brand_dir, manifest, skills_dir):
    """Create an ordered goal plan, deriving requirements from SKILL.md files."""
    if goal not in GOAL_SEQUENCES:
        raise ValueError("unknown goal: {0}".format(goal))

    workflow = GOAL_SEQUENCES[goal][0]
    stages = _stage_copy(goal)
    dates = _manifest_file_dates(brand_dir)
    metadata_cache = {}

    def metadata_for(skill):
        if skill not in metadata_cache:
            metadata_cache[skill] = skill_meta(skills_dir, skill)
        return metadata_cache[skill]

    notes = _freshness_adjustments(goal, stages, brand_dir, metadata_for, dates)
    prerequisites = _foundation_stage(stages, brand_dir, metadata_for, dates)
    if prerequisites:
        stages.insert(0, prerequisites)
        notes.append(
            "Foundation steps prepended: required brand files are missing (dependency logic is automatic)."
        )

    return {
        "mode": "goal",
        "goal": goal,
        "workflow": workflow,
        "environment": manifest.get("environment", "unknown"),
        "brand_dir": str(brand_dir),
        "sequence": _emit_sequence(stages, brand_dir, manifest, metadata_for, dates),
        "advisor": advisor_for(goal, manifest),
        "notes": notes,
    }


def _known_skills(skills_dir):
    directory = Path(skills_dir)
    if not directory.is_dir():
        return []
    return sorted(
        child.name.removeprefix(SKILL_PREFIX) for child in directory.iterdir()
        if child.name.startswith(SKILL_PREFIX) and (child / "SKILL.md").is_file()
    )


_STOP = set(
    "a an and are as at be but by can do does for from get got have help how i if in into is it its "
    "me my need of on or our so that the their them this to up us want we what when where which who "
    "why will with you your".split()
)


def _words(text):
    """Lowercase content words with a crude plural strip, for phrase matching."""
    words = []
    for word in re.findall(r"[a-z0-9]+", str(text).lower().replace("'", "")):
        if word in _STOP:
            continue
        if len(word) > 4 and word.endswith("ies"):
            word = word[:-3] + "y"
        elif len(word) > 3 and word.endswith("s") and not word.endswith("ss"):
            word = word[:-1]
        words.append(word)
    return words


def _frontmatter_value(frontmatter, key):
    match = re.search(r"^" + re.escape(key) + r":\s*(.+)$", frontmatter, flags=re.M)
    return match.group(1).strip().strip("'\"") if match else ""


def match_request(text, skills_dir, top=3):
    """Rank skills for a plain request by their when_to_use trigger phrases.

    A hint for routing, not a decision: each phrase scores by how many of its
    words the request contains (more words matched, more specific), plus one
    when the whole phrase appears verbatim. The skill name counts as a phrase.
    """
    request_words = set(_words(text))
    request_flat = " ".join(_words(text))
    ranked = []
    for skill in _known_skills(skills_dir):
        try:
            frontmatter = _frontmatter(
                _skill_file(skills_dir, skill).read_text(encoding="utf-8")
            )
        except OSError:
            continue
        phrases = [skill.replace("-", " ")]
        phrases += _frontmatter_value(frontmatter, "when_to_use").split(",")
        best, best_phrase, strong = 0.0, "", 0
        for phrase in phrases:
            words = _words(phrase)
            if not words:
                continue
            hit = len(set(words) & request_words)
            if not hit:
                continue
            coverage = hit / len(set(words))
            score = coverage * (1 + 0.5 * (hit - 1))
            if " ".join(words) in request_flat:
                score += 1
            if coverage >= 0.5:
                strong += 1
            if score > best:
                best, best_phrase = score, phrase.strip()
        if best:
            ranked.append(
                {"skill": skill, "score": round(best + 0.05 * strong, 3), "matched": best_phrase}
            )
    ranked.sort(key=lambda entry: (-entry["score"], entry["skill"]))
    return ranked[:top]


def _producer_for_filename(filename):
    if filename == "brand.yaml":
        return None
    base = filename[:-3] if filename.endswith(".md") else filename
    return FOUNDATION_OWNER.get(base) or OTHER_PRODUCER.get(base)


def build_task_plan(task, brand_dir, manifest, skills_dir):
    """Create a non-blocking preflight for one directly requested skill."""
    metadata = skill_meta(skills_dir, task)
    if not metadata["exists"]:
        return {
            "mode": "task",
            "task": task,
            "error": "unknown skill: {0}".format(task),
            "known_skills": _known_skills(skills_dir),
            "advisor": None,
            "notes": [],
        }

    dates = _manifest_file_dates(brand_dir)
    missing = _missing_inputs(metadata, brand_dir, dates, set())
    preflight = []
    for filename in missing:
        owner = _producer_for_filename(filename)
        preflight.append(
            {
                "input": filename,
                "status": "missing",
                "fix": "/" + owner if owner else None,
                "note": "optional: the skill degrades gracefully without it; run the fix skill first only if quality matters more than speed",
            }
        )

    stale_seen = set(missing)
    self_writes = {_base_token(token) for token in metadata["writes"]}
    for token in metadata["reads"]:
        base = _base_token(token)
        if base in IGNORED_INPUTS or base in self_writes:
            continue
        exists, age = file_state(brand_dir, base, dates)
        filename = token_filename(base)
        if (
            exists
            and age is not None
            and age > STALE_DAYS
            and filename not in stale_seen
        ):
            stale_seen.add(filename)
            owner = _producer_for_filename(filename)
            preflight.append(
                {
                    "input": filename,
                    "status": "stale ({0}d)".format(age),
                    "fix": "/" + owner if owner else None,
                    "note": "refresh recommended, not required",
                }
            )

    notes = []
    if missing:
        notes.append(
            "Task mode never blocks: gaps are reported, and the skill proceeds at baseline."
        )
    return {
        "mode": "task",
        "task": task,
        "environment": manifest.get("environment", "unknown"),
        "brand_dir": str(brand_dir),
        "sequence": [
            {
                "skill": task,
                "stage": 0,
                "why": "user asked for this deliverable",
                "runs_parallel_with": [],
                "inputs_missing": missing,
                "grounding": grounding_for(task, manifest),
            }
        ],
        "advisor": None,
        "preflight": preflight,
        "notes": notes,
    }


def _read_capability_file(path):
    if not path:
        return None
    try:
        loaded = json.loads(Path(path).read_text(encoding="utf-8"))
    except (OSError, ValueError) as error:
        print(
            "warning: could not read capabilities file ({0}); detecting inline.".format(
                error
            ),
            file=sys.stderr,
        )
        return None
    if not isinstance(loaded, dict):
        print("warning: capabilities file is not a JSON object; detecting inline.", file=sys.stderr)
        return None
    return loaded


def _manifest_for(root, brand, brand_dir):
    try:
        return capability.build_manifest(
            root=str(root), brand=brand, brand_dir=str(brand_dir)
        )
    except Exception as error:
        print(
            "warning: capability detection failed ({0}); using base grounding.".format(error),
            file=sys.stderr,
        )
        return {"environment": "unknown", "capabilities": {}}


def _entry_is_available(entry):
    return isinstance(entry, dict) and bool(entry.get("available"))


def _prefer_detected_entry(base_entry, detected_entry):
    """Use client detection over a supplied base when it has a real provider."""
    if not _entry_is_available(detected_entry):
        return base_entry
    detected_via = detected_entry.get("via")
    if not _entry_is_available(base_entry):
        return detected_entry
    if detected_via not in ("webfetch", "websearch"):
        return detected_entry
    return base_entry


def _overlay_brand_manifest(base_manifest, detected_manifest):
    """Overlay a client's detected keys onto an optional shared manifest."""
    if base_manifest is None:
        return detected_manifest

    base_caps = base_manifest.get("capabilities", {})
    detected_caps = detected_manifest.get("capabilities", {})
    merged_caps = {}
    for toolset in capability.CAPABILITY_ORDER:
        base_entry = base_caps.get(toolset, {})
        detected_entry = detected_caps.get(toolset, {})
        preferred = _prefer_detected_entry(base_entry, detected_entry)
        providers = _providers(preferred)
        if "composio" in _providers(base_entry) or "composio" in _providers(
            detected_entry
        ):
            if "composio" not in providers:
                providers.append("composio")
        merged_caps[toolset] = {
            "available": _entry_is_available(preferred),
            "via": preferred.get("via") if isinstance(preferred, dict) else None,
            "providers": providers,
        }

    merged = dict(base_manifest)
    if detected_manifest.get("environment") != "unknown":
        merged["environment"] = detected_manifest["environment"]
    else:
        merged.setdefault("environment", "unknown")
    if "env_sources" in detected_manifest:
        merged["env_sources"] = detected_manifest["env_sources"]
    if "brand" in detected_manifest:
        merged["brand"] = detected_manifest["brand"]
    merged["capabilities"] = merged_caps
    return merged


def build_all_brands(goal_or_task, root, skills_dir, capabilities_path=None):
    """Build one isolated plan per configured client directory."""
    root = Path(root)
    supplied_manifest = _read_capability_file(capabilities_path)
    plans = []
    brands_root = root / "brands"
    if brands_root.is_dir():
        for brand_dir in sorted(brands_root.iterdir(), key=lambda entry: entry.name):
            if (
                not brand_dir.is_dir()
                or brand_dir.name == "active"
                or not (brand_dir / "brand.yaml").is_file()
            ):
                continue
            slug = brand_dir.name
            detected_manifest = _manifest_for(root, slug, "auto")
            manifest = _overlay_brand_manifest(
                supplied_manifest, detected_manifest
            )
            if goal_or_task in GOAL_SEQUENCES:
                plan = build_goal_plan(goal_or_task, brand_dir, manifest, skills_dir)
            else:
                plan = build_task_plan(goal_or_task, brand_dir, manifest, skills_dir)
            plan = dict(plan)
            plan["brand"] = slug
            plans.append(plan)
    return {"mode": "all-brands", "plans": plans}


def _normal_brand_dir(root, brand, requested_dir):
    if requested_dir and requested_dir != "auto":
        path = Path(requested_dir).expanduser()
        return path if path.is_absolute() else Path(root) / path
    return capability.resolve_brand_dir(root, brand)


def to_markdown(plan):
    """Render the JSON route result as a concise readable table."""
    if plan.get("mode") == "all-brands":
        lines = ["# Route: all brands"]
        for entry in plan["plans"]:
            lines.extend(["", "## " + entry["brand"], ""])
            lines.extend(to_markdown(entry).splitlines())
        return "\n".join(lines)
    if plan.get("error"):
        return "error: {0}\nknown skills: {1}".format(
            plan["error"], ", ".join(plan.get("known_skills", []))
        )

    target = plan.get("goal") or plan.get("task")
    heading = "# Route {0}: {1}".format(plan["mode"], target)
    if plan.get("workflow"):
        heading += " (workflow: {0})".format(plan["workflow"])
    lines = [
        heading,
        "brand dir: {0} · environment: {1}".format(
            plan["brand_dir"], plan["environment"]
        ),
        "",
        "| stage | skill | parallel with | missing inputs | grounding |",
        "|---|---|---|---|---|",
    ]
    for step in plan["sequence"]:
        grounding = step["grounding"]
        label = grounding["mode"]
        if grounding["via"]:
            label += " (" + ", ".join(grounding["via"]) + ")"
        lines.append(
            "| {0} | /{1} | {2} | {3} | {4} |".format(
                step["stage"],
                step["skill"],
                ", ".join(step["runs_parallel_with"]) or "none",
                ", ".join(step["inputs_missing"]) or "none",
                label,
            )
        )
    for step in plan["sequence"]:
        lines.append("- **/{0}**: {1}".format(step["skill"], step["why"]))
    if plan.get("advisor"):
        lines.extend(["", "## Stack advisor", plan["advisor"]["line"]])
    if plan.get("preflight"):
        lines.append("")
        lines.append("## Preflight")
        for item in plan["preflight"]:
            fix = " → " + item["fix"] if item.get("fix") else ""
            lines.append(
                "- {0}: {1}{2} ({3})".format(
                    item["input"], item["status"], fix, item["note"]
                )
            )
    if plan.get("notes"):
        lines.append("")
        lines.append("## Notes")
        lines.extend("- " + note for note in plan["notes"])
    return "\n".join(lines)


def main(argv=None):
    parser = argparse.ArgumentParser(
        prog="route.py",
        description="Build a deterministic public-toolset route for a goal or skill.",
    )
    request = parser.add_mutually_exclusive_group(required=True)
    request.add_argument(
        "--goal", choices=sorted(GOAL_SEQUENCES), help="marketing outcome to route"
    )
    request.add_argument("--task", metavar="SKILL", help="specific skill to preflight")
    request.add_argument(
        "--request",
        metavar="TEXT",
        help="plain user request; ranks the skills whose trigger phrases match it",
    )
    parser.add_argument("--brand", metavar="SLUG", help="client slug under ./brands/")
    parser.add_argument(
        "--brand-dir",
        metavar="PATH|auto",
        help="explicit brand directory; auto resolves active client then ./brand/",
    )
    parser.add_argument(
        "--root", default=".", metavar="DIR", help="workspace root (default: cwd)"
    )
    parser.add_argument(
        "--skills-dir",
        default=str(DEFAULT_SKILLS_DIR),
        metavar="DIR",
        help="directory containing skill folders",
    )
    parser.add_argument(
        "--capabilities",
        metavar="PATH",
        help="capability manifest JSON; detection runs inline when omitted",
    )
    parser.add_argument(
        "--all-brands",
        action="store_true",
        help="emit one isolated plan per ./brands/*/ directory with brand.yaml",
    )
    output = parser.add_mutually_exclusive_group()
    output.add_argument("--json", action="store_true", help="emit JSON (default)")
    output.add_argument("--markdown", action="store_true", help="emit a readable table")
    args = parser.parse_args(argv)

    root = Path(args.root).expanduser().resolve()
    skills_dir = Path(args.skills_dir).expanduser().resolve()
    if args.request:
        matches = match_request(args.request, skills_dir)
        print(json.dumps({"mode": "request", "request": args.request, "matches": matches}, indent=2))
        return 0
    if args.task:
        args.task = args.task.removeprefix(SKILL_PREFIX)
    target = args.goal or args.task
    if args.all_brands:
        plan = build_all_brands(target, root, skills_dir, args.capabilities)
    else:
        brand_dir = _normal_brand_dir(root, args.brand, args.brand_dir)
        detected_manifest = _manifest_for(root, args.brand, brand_dir)
        manifest = _overlay_brand_manifest(
            _read_capability_file(args.capabilities), detected_manifest
        )
        if args.goal:
            plan = build_goal_plan(args.goal, brand_dir, manifest, skills_dir)
        else:
            plan = build_task_plan(args.task, brand_dir, manifest, skills_dir)

    print(to_markdown(plan) if args.markdown else json.dumps(plan, indent=2))
    return 0


if __name__ == "__main__":
    sys.exit(main())
