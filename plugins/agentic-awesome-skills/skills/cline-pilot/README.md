# cline-pilot

**An Agent Skill: drive Cline CLI coding tasks as the user's proxy.**

Dispatch tasks → run Cline non-interactively or interactively → monitor progress from
session files + hard evidence (git / test reports) → relay decision points back to the
user in a fixed 4-part format → verify against a checklist before reporting done —
while **learning the user's per-project-tag preferences and gradually making the
decisions for them**.

Follows the [Agent Skills open specification](https://agentskills.io/specification).
Works with any agent that supports the standard: Hermes, Cline, Claude Code, Codex,
Cursor, OpenCode, and more. (Chinese docs: [README.zh.md](https://github.com/gongdear/cline-pilot/blob/main/README.zh.md))

## What it does / does NOT do

| DOES (this skill's job) | DOES NOT |
|---|---|
| Dispatch user tasks to Cline CLI (context + constraints, nothing dropped) | Know/hold project architecture (that lives in the project's own memory bank + clinerules) |
| Launch Cline inside the user's dev environment (conda env, pinned branch) | Make unilateral technical decisions — hard-constraint actions always go back to the user first |
| Monitor long background jobs via session files + `git`/test-report evidence, not self-reports | Push, delete, write to DB, spend money, change global config — always asks first |
| Relay Cline's decision points in a fixed 4-element format, with learned preference stated or "no precedent" | |
| Verify against a 6-item acceptance checklist before reporting "done" | |
| Log every correction/decision **by project tag class** and distill stable preferences over time | |

## Install

```bash
# Option 1: npx skills CLI (generic)
npx skills add https://github.com/gongdear/cline-pilot

# Option 2: copy the skill folder into your agent's skills dir
#   Hermes:      ~/.hermes/skills/
#   Cline:       ~/.cline/skills/
#   Claude Code: ~/.claude/skills/
#   Codex:       ~/.codex/skills/
mkdir -p ~/.hermes/skills && cp -r cline-pilot ~/.hermes/skills/
```

## Quick start

1. **First use**: the agent will ask for your dev environment (conda/python env name,
   how the toolchain reaches PATH, task branch naming) and write
   `references/local-config.md` (see `references/local-config.example.md`). That file is
   **private** and git-ignored.
2. **Give the agent a coding task** targeting Cline CLI. The skill activates, picks the
   right mode, injects the prompt (fixed first line: `active memory bank`), runs in the
   background, and monitors via `scripts/session_report.py`.
3. **Verify**:
   ```bash
   python3 scripts/session_report.py 15 /path/to/repo
   ```

## Layout (progressive disclosure)

```
cline-pilot/
├── SKILL.md                          # core workflow (<150 lines, loaded on activation)
├── README.md / README.zh.md
├── LICENSE                           # MIT
├── scripts/
│   └── session_report.py             # read-only monitor: session messages + git/surefire evidence (stdlib only)
├── references/
│   ├── cold-start.md                 # cold-start handbook (new projects: no clinerules/memory-bank)
│   ├── local-config.example.md       # template → private local-config.md
│   ├── project-profiles.example.md   # template → private project-profiles.md
│   └── decision-log.example.md       # template → private decision-log.md
└── assets/
    └── global-memory-bank-prompt.md  # verbatim global memory-bank prompt (must be in place before any memory bank)
```

`SKILL.md` loads only when activated; `references/*` on demand; the script is
deterministic code — the agent doesn't improvise monitoring each time.

## Design principles

- **Cold-start gate** — before any memory bank is activated, the default global
  memory-bank prompt must already be in place (`assets/global-memory-bank-prompt.md`,
  verbatim template)
- **Two cold-start paths** — no code yet: rules are assembled by asking the user
  dimension by dimension; legacy code: rules are grounded in a code scan
- **No architecture in the skill** — project technical facts belong to the project's
  memory bank / clinerules; the skill holds intro + tags + learned preferences only
- **Deterministic first** — anything that must be right every time is a script, not a
  prompt the model re-derives per run
- **Evidence over self-report** — completion is proved by git status, test-report
  numbers, and non-empty artifacts, never by the agent's own claim
- **Learning loop** — correction → `decision-log.md` (per tag class) → ≥2 consistent
  samples → distilled into the preference section of SKILL.md
- **Privacy by layer** — public files (SKILL.md, scripts, templates) carry zero
  user-specific secrets; private state stays in git-ignored `references/*.md`

## Best practice: two-tier model strategy

Cline's cost/quality balance changes dramatically between the **cold-start** and the
**steady-state** phases. Recommended setup (validated on a production Java backend):

1. **Initialization — use a strong long-context (paid) model.**
   Give it the full weight: whole-project codebase scan, writing project rules
   (`clinerules` / memory-bank seed) grounded in what the code actually does, and
   authoring one or two **template test/code patterns** representative of the
   project (assertion style, mock granularity, naming, edge-case coverage).
   This phase is read-heavy and long-context-heavy — exactly where frontier
   models pay for themselves. A single good cold start prevents most
   rework later: every batch after it is constrained by the rules it wrote.

2. **Steady state — switch to a small local model for the task loop.**
   Once the rules + templates exist, each batch is a small, tightly-scoped
   task with an explicit spec (target class, test file path, mock list,
   assertion requirements). That shape is ideal for a local, low-parameter
   model: the skill's task-spec granularity, the anti-hallucination protocol,
   and per-batch verification carry the discipline, so model quality can be
   traded against cost/privacy/throughput. (The maintainer runs
   `qwen3.8:27b` locally via Ollama for all batch execution — 50+ test
   classes delivered against a 7-module Java backend on that setup.)

Rule of thumb: **frontier model buys the rules once; the local model runs the
discipline every day.** If a local batch fails the same assertion 3 times in a
row, that is a signal the template/rules are the gap — escalate *that batch*
back to the stronger model, don't keep burning local retries.

## Validate

```bash
npx @anthropics/skills-ref validate .   # or: skills-ref validate ./cline-pilot
python3 -m py_compile scripts/session_report.py
python3 scripts/session_report.py 5 /path/to/repo
```

## Contributing

- New pitfalls / patterns → PR into `SKILL.md` (keep it under 500 lines)
- New scripts → `scripts/`, stdlib only, independently runnable
- Follow the spec: https://agentskills.io/specification

## License

MIT — see [LICENSE](https://github.com/gongdear/cline-pilot/blob/main/LICENSE)
