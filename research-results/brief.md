# Upstream credit audit (2026-09-21)

## Scope

- Parsed **260** GitHub repos linked from README **Official Sources** and **Community Contributors**.
- For each repo: list upstream `SKILL.md` directories (Git tree or code search when truncated).
- Compared upstream folder names to **catalog skill IDs** under `skills/` (not only `source_repo`, because many vendor skills omit `source_repo`).
- Excluded obvious catalog mirrors (`*/antigravity-awesome-skills`, `everything-claude-code`, `awesome-copilot`, opencode collection mirrors, etc.).

## Artifacts

| File | Purpose |
|------|---------|
| `summary.json` | Run stats |
| `results.json` | Per-repo upstream counts, errors, raw unmatched paths |
| `missing-by-catalog-id.json` | Actionable repos with skills absent from catalog by ID |
| `actionable-gaps.json` | Heuristic shallow-path gaps (no mirror filter on ID match) |

## README credit hygiene (fix separately)

**404 / not found (15):** `aptratcn/skill-audit`, `beatra-ai/beatra-skills`, `connerlambden/helium-mcp`, `elkidogz/technical-change-skill`, `jddavenport/context-kit`, `milkomida77/guardian-agent-prompts`, `morsechimwai/lemmaly`, `mrprewsh/seo-aeo-engine`, `nickdesi/zipai`, `openclaw/skills`, `pumanitro/global-chat`, `shpigford/skills`, `voidborne-d/humanize-chinese`, `voidborne-d/lambda-lang`, `whoisabhishekadhikari/lovable-cleanup`.

**No `SKILL.md` in repo (15):** includes `hasdata/hasdata-cli`, `buywhere/buywhere-mcp`, `pilot-protocol/pilotprotocol`, `voltagent/awesome-agent-skills` — may use non-standard layout; verify manually before removing credits.

## Suggested 18.0.0 import batches (maintainer review each skill)

### A — Official vendor catch-up (high user value)

| Repo | Missing / upstream | Examples |
|------|-------------------|----------|
| `microsoft/skills` | 48 / 201 | Azure AI, app onboarding, Kusto plugins |
| `expo/skills` | 20 / 26 | EAS hosting, observe, workflows, app clip |
| `browser-act/skills` | 100 / 103 | Marketplace automation skills (large batch) |
| `browserbase/skills` | 17 / 18 | Browser MCP, autobrowse, company research |
| `huggingface/skills` | 14 / 26 | HF CLI, SageMaker planners, community evals |
| `remotion-dev/skills` | 11 / 12 | remotion-create, captions, maps, render |
| `longbridge/skills` | 9 / 13 | derivatives, quant, research lanes |
| `orkas-ai/orkas-videostudio` | 12 / 14 | stage-compose, orchestration |
| `neondatabase/agent-skills` | 3 / 17 | `neon`, `neon-auth`, `score-eval` naming collisions to reconcile |
| `anthropics/skills` | 3 / 20 | Mostly already in catalog under different IDs; spot-check `academy-guide`, `discernment-nudge` |

### B — Community packs mostly not imported (small PR-friendly)

| Repo | Missing / upstream | Notes |
|------|-------------------|--------|
| `demo112/yunqu-ai-skills` | 15 / 15 upstream IDs | Catalog has 3 renamed skills; ~12 net-new after mapping |
| `zhanghandong/makepad-skills` | 14 / 14 | Makepad 2.0 suite (catalog has older makepad-* IDs) |
| `0xsarwagya/ontoly` | 13 / 14 | Only `ontoly-software-graph` today |
| `leonxlnx/taste-skill` | 13 / 13 | Design/taste generators |
| `monte-carlo-data/mc-agent-toolkit` | 18 / 20 | Data observability (README credits partial set) |
| `mishanefedov/skill-issue` | 12 / 13 | Billing/music/photo helpers |
| `aomi-labs/skills` | 11 / 13 | DeFi CLI family beyond `aomi-transact` |
| `emilkowalski/skills` | 10 / 13 | Motion/UI polish (catalog may overlap by theme) |

### C — Defer or curate (volume / overlap)

- `sandbaseai/sandbase-skills` (92 missing), `lambdatest/agent-skills` (49), `gooseworks-ai/goose-skills` (275 upstream — only 2 credited imports today).
- `nowork-studio/notfair` — upstream layout mixes app folders and skills; needs path filter before bulk import.

## Limitations

- Match is by **directory name ↔ catalog skill ID**; renames (e.g. yunqu numbered skills → descriptive IDs) inflate “missing”.
- Nested monorepo paths may produce non-skill folder names in samples (`assets`, `audit`).
- Truncated trees use GitHub code search (100 result cap).
- Does not run Tessl, security, or license gates — import still requires full maintainer review per skill.

## Reproduce

```bash
# Results already generated under this directory; re-run requires ~5 min GitHub API sweep.
python3 tools/scripts/...  # ad-hoc script used in maintainer session 2026-09-21
```
