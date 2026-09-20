---
name: career-ops
description: 'Multi-CLI job-search command center: evaluate offers, scan portals,
  tailor CVs, track applications, prep interviews. Invoke per mode.'
category: productivity
risk: safe
source: https://github.com/career-ops-hq/career-ops
source_repo: career-ops-hq/career-ops
source_type: community
date_added: '2026-09-20'
license: MIT
license_source: https://github.com/career-ops-hq/career-ops/blob/main/LICENSE
compatibility: Docs-only; the upstream Node runtime helpers are not bundled. Portal
  scans need network access and the user's own credentials; never submit applications
  without explicit approval.
arguments: mode
user_invocable: true
user-invocable: true
argument-hint: '[scan | discover | deep | pdf | text | latex | latex-tex | cover |
  email | add | expand | eu-swe | oferta | ofertas | apply | batch | tracker | agent-inbox
  | pipeline | contacto | training | project | interview-prep | interview | interview/plan
  | interview/practice | interview/debrief | interview-redflag | patterns | offer-prep
  | titles | upskill | followup | reply-watch | outcome | update]'
---

# career-ops -- Router

career-ops is a multi-CLI job-search command center. The routing below is shared across supported agent CLIs even when the invocation surface differs.

## Project Root Resolution

This catalog ships a **docs-only** router. Do not require the upstream `modes/`, `config/`, or `data/` tree. Use the routing table and discovery menu below. For the full Node runtime (PDF, portal scans, Playwright), clone [career-ops-hq/career-ops](https://github.com/career-ops-hq/career-ops).

## Mode Routing

Determine the mode from `$mode`:

| Input | Mode |
|-------|------|
| (empty / no args) | `discovery` -- Show command menu |
| JD text or URL (no sub-command) | **`auto-pipeline`** |
| `oferta` | `oferta` |
| `ofertas` | `ofertas` |
| `contacto` | `contacto` |
| `deep` | `deep` |
| `interview-prep` | `interview-prep` |
| `interview` | `interview` |
| `eu-swe` | `regional/eu-swe` |
| `eu-fintech` | `regional/eu-fintech` |
| `interview/plan` | `interview/plan` |
| `interview/practice` | `interview/practice` |
| `interview/debrief` | `interview/debrief` |
| `pdf` | `pdf` |
| `text` | `text` |
| `latex` | `latex` |
| `latex-tex` | `latex-tex` |
| `email` | `email` |
| `add` | `add` |
| `expand` | `expand` |
| `training` | `training` |
| `project` | `project` |
| `tracker` | `tracker` |
| `agent-inbox` | `agent-inbox` |
| `inbox` | `agent-inbox` |
| `pipeline` | `pipeline` |
| `apply` | `apply` |
| `scan` | `scan` |
| `discover` | `discover` |
| `batch` | `batch` |
| `patterns` | `patterns` |
| `offer-prep` | `offer-prep` |
| `titles` | `titles` |
| `upskill` | `upskill` |
| `followup` | `followup` |
| `reply-watch` | `reply-watch` |
| `outcome` | `outcome` |
| `interview-redflag` | `interview-redflag` |
| `update` | `update` |
| `cover` | `cover` |

**Auto-pipeline detection:** If `$mode` is not a known sub-command AND contains JD text (keywords: "responsibilities", "requirements", "qualifications", "about the role", "we're looking for", company name + role) or a URL to a JD, execute `auto-pipeline`.

If `$mode` is not a sub-command AND doesn't look like a JD, show discovery.

---

## Output Language Directive

Before executing any mode, read `config/profile.yml` if it exists and resolve:

- `language.output` → ISO language code for human-facing output. Default: `en`.
- `language.modes_dir` → optional market-mode directory. This controls market vocabulary and local evaluation rules only.

Inject this directive after loading the mode instructions and before producing any user-visible content:

> Write all human-facing output in `{language.output}` regardless of the language of these instructions or of the job description. This includes reports, tracker notes, PDFs, cover letters, outreach, interview prep, form answers, and summaries. If `language.modes_dir` supplies market-specific vocabulary, keep the market logic but explain terms in `{language.output}` when needed.

`language.output` is authoritative for prose. `modes_dir` is market context; it must not force the prose language.

---

## Discovery Mode (no arguments)

If your CLI supports `/career-ops`, show this menu. In Codex, surface the same options in plain text and map the requested mode the same way.

Concrete equivalents for Codex prompt-driven sessions:

```text
/career-ops {JD}           ↔ "Evaluate this JD with career-ops auto-pipeline: {JD or URL}"
/career-ops scan           ↔ "Run the career-ops scan mode and summarize new matches."
/career-ops pipeline       ↔ "Run the career-ops pipeline mode for data/pipeline.md."
/career-ops pdf            ↔ "Run the career-ops pdf mode for the latest evaluated role."
/career-ops email          ↔ "Run the career-ops email mode for the latest evaluated role."
/career-ops tracker        ↔ "Run the career-ops tracker mode and summarize the current statuses."
```

Show this menu:

```
career-ops -- Command Center

Available commands:
  /career-ops {JD}      → AUTO-PIPELINE: evaluate + report + PDF + tracker (paste text or URL)
  /career-ops pipeline  → Process pending URLs from inbox (data/pipeline.md)
  /career-ops oferta    → Evaluation only A-F (no auto PDF)
  /career-ops ofertas   → Compare and rank multiple offers
  /career-ops contacto  → LinkedIn power move: find contacts + draft message
  /career-ops deep      → Deep research prompt about company
  /career-ops interview-prep → Generate company-specific interview prep doc
  /career-ops interview    → Interactive profile/CV onboarding interview
  /career-ops eu-swe    → Calibrate a European SWE application before CV/apply/interview
  /career-ops eu-fintech → Scan 21 EU fintech portals for Product Manager roles (zero-token)
  /career-ops interview/plan → Time-blocked prep plan for an upcoming interview
  /career-ops interview/practice → Practice interview, one question at a time with feedback
  /career-ops interview/debrief → Post-interview debrief: close gaps, predict next round
  /career-ops pdf       → PDF only, ATS-optimized CV
  /career-ops text      → Tailored markdown CV (mirrors cv.md, no PDF)
  /career-ops latex     → Export CV as LaTeX/Overleaf .tex
  /career-ops latex-tex → Tailor your own resume.tex in place (opt-in; cv.md stays default)
  /career-ops cover     → Cover letter: standalone JD paste or /career-ops cover {slug}
  /career-ops email     → Formal application email draft (draft-only; never sends, submits, or clicks)
  /career-ops add       → Add a project/paper/role to your CV (fetch + preview + confirm)
  /career-ops expand    → Auto-discover and add missing competencies from profile links
  /career-ops training  → Evaluate course/cert against North Star
  /career-ops project   → Evaluate portfolio project idea
  /career-ops tracker   → Application status overview
  /career-ops agent-inbox → Queue/drain requests for the next session (data/agent-inbox.md)
  /career-ops apply     → Live application assistant (reads form + generates answers)
  /career-ops scan      → Scan portals and discover new offers
  /career-ops discover  → Resolve a company list to scannable ATS boards + append to portals.yml (zero-token)
  /career-ops batch     → Batch processing with parallel workers
  /career-ops patterns  → Analyze rejection patterns and improve targeting
  /career-ops offer-prep → Read a received offer/contract with the candidate: clause walk + lawyer questions (not legal advice)
  /career-ops titles    → Suggest adjacent job titles from your CV to broaden the search
  /career-ops upskill   → Aggregate skill-gap analysis from your evaluated reports
  /career-ops followup  → Follow-up cadence tracker: flag overdue, generate drafts
  /career-ops outcome   → Record application outcome & archive artifacts
  /career-ops update    → Update career-ops system files with diff preview + compat check

Inbox: add URLs to data/pipeline.md → /career-ops pipeline
Or paste a JD directly to run the full pipeline.
```

---

## Context Loading by Mode

Docs-only bundle: do not read `modes/*.md` from disk. Follow the routing table and mode summaries in this skill using general agent capabilities.

## When to Use

- The user pastes a job URL or description, asks to scan portals, tailor a CV, track applications, prep for interviews, or run another career-ops mode.

## Limitations

- Docs-only import: the upstream runtime helpers are not bundled, so modes that depend on them need the user's own installation.
- Portal scans are read-only; never submit applications, send outreach, or share personal data without explicit per-action approval.
- Job-market advice is general information, not professional career counseling.

### Example

```markdown
Evaluate this job description against my profile and list matched and missing requirements.
```

> Adapted from [career-ops-hq/career-ops](https://github.com/career-ops-hq/career-ops) (MIT); frontmatter, When to Use/Limitations, and safety boundaries added for upstream compliance. Docs-only import: upstream runtime helpers not bundled.
