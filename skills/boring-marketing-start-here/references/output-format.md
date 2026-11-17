# Output Format

Every skill follows this contract. It is short on purpose: the contract is four sections,
a Quick Pick block for choices, Quick Mode for specific requests, and the deliverable
hygiene rules below. Everything else is restraint.

---

## Principles

1. **Markdown-native.** Claude Code renders markdown. So do Notion, Slack exports, and
   every editor the deliverable lands in. Use headings, bold labels, tables, and lists.
   Never Unicode box-art, ASCII dividers, or fixed line widths. Output that needs a
   monospace font to look right is broken everywhere else.

2. **Files first, output second.** The deliverable lives on disk (`./brand/`,
   `./campaigns/<name>/`) BEFORE it is summarized in chat. Long content (full articles,
   complete sequences, detailed briefs) belongs in files; chat shows what was saved, the
   key decisions, and the route forward. Append one line per asset to `./brand/assets.md`
   (Quick Mode skips this and never creates `./brand/` for a one-off asset).

3. **Scannable in five seconds.** The deliverable name, the recommended option, and the
   next step are each findable without scrolling or hunting. Predictable section order
   does most of this work.

4. **Professional restraint.** No emoji. No exclamation marks. No "Great news!" filler.
   No preamble ("Here is your...", "I've created..."). The output starts at the header.
   The output is the deliverable; present it and move on.

5. **Recommended option visible immediately.** When presenting multiple options, the
   pick comes first (Quick Pick block), details after.

6. **The client reads the work, not the process.** What the agent did to get there stays
   out of the deliverable. See Deliverable hygiene.

---

## The four-section contract

Every skill output has these sections, in this order. If one is genuinely not applicable
(rare), include it with a one-line note saying why.

### 1. Header

```markdown
## LANDING PAGE COPY: Spring Launch
Jun 10, 2026 · for the spring plumbing promotion
```

An `##` heading naming the deliverable (the output type, not the skill name), then one
line: the date and what the work is for. Do not list which brand files, angles, modes or
tools shaped the run.

### 2. Content

The deliverable summary, or the deliverable itself if it is short, then the one short
"Sources and assumptions" note (see Deliverable hygiene). Clean markdown:
- Headings for structure, bold for labels, lists for items.
- Tables only for genuinely enumerable facts (keyword metrics, send schedules,
  variant comparisons), never for single-column status lists, and never the same table
  twice.
- Estimated numbers carry `~`. The data quality of the whole piece is said once, in the
  note, in plain words, never as a tag on every line or row.

### 3. Files saved

```markdown
**Files saved:**
- ./campaigns/spring-launch/landing-page.md (new)
- ./brand/positioning.md (updated)
- ./brand/assets.md (1 entry appended)
```

Exact relative paths with `(new)` / `(updated)` / `(n entries appended)` markers. Every
skill that writes files shows what it wrote: the user never hunts for output. If nothing
was written (analysis-only), say `No files written (analysis-only output).`

### 4. What's next

```markdown
**What's next:**
- /boring-marketing-email-sequences: turn this page into a 5-email welcome flow (~15 min)
- /boring-marketing-creative: hero image for the page from your creative kit (~10 min)
- /boring-marketing-content-atomizer: promote it across your 2 priority platforms (~10 min)

Or tell me what you're working on and I'll route you.
```

2 to 4 concrete `/skill` suggestions, each with a reason and a rough time estimate. End with
the routing fallback line. If this completes a workflow, say so and point at
`/boring-marketing-start-here` for a status review. Files saved and What's next sit after the deliverable,
not inside it: the saved file itself never carries skill names or next-skill routing.

**Conditional /boring-marketing-creative suggestion:** suggest a visual build step only when BOTH are
true: Replicate is connected (key present in `.env` / stack.md) AND the asset type
actually benefits from a visual (landing page hero, ad creative, social graphic; not a
keyword plan or an email sequence). When suggested, it is a listed option, never an
auto-advance.

---

## Deliverable hygiene

The client deliverable holds only the work: the finished copy, pages, plans and next
steps, in the order the client will use them, finished pieces first (the page, the
emails, the ads), then the plan to run them, then next steps. Process stays out.

**Never show in the deliverable:**
- Script paths (`${CLAUDE_SKILL_DIR}/...`, `start-here/scripts/...`) or any command the
  agent ran.
- Names of the tools, skills, connectors or capability tiers the agent used to produce
  the work ("routed through...", "enhanced tier", "Firecrawl run"). A tool the client
  should buy or use is a recommendation inside the plan, and that is fine.
- Self-scores, rubric or quality tables, score history, pass/fail checklists.
- Internal data-label bookkeeping: `Data: ...` tags on lines or rows, evidence IDs,
  source-quality codes.
- "Matrix status", cell IDs and fill states, ledgers, watermarks, routing receipts, and
  the line that says which brand files were loaded.

**Run quality checks silently.** Score, find the weak part, rewrite and rescore as
internal steps. Show only the passing work. If a weakness cannot be fixed, say what it is
in one line in the note.

**Sources and assumptions.** Evidence and assumptions go in one short note at the end of
the content, 10 lines at most: what the work rests on (sources and dates in a sentence),
the data quality in plain words, what the client should confirm, and what is missing. A
learning that changed the work gets one line, only if it did. When saved checks ran
(see `taste-loop.md`), one line may say so ("Checked against your 9 saved checks."). For the SEO and AI search
skills, the gap-aware receipt (what was checked, what could not be, what would unlock
the next step) is at most 3 of those lines. Anything longer goes in a working file.

**Working files.** Evidence packs, per-claim sources, score history, tool and routing
output, and matrix bookkeeping go in `./campaigns/<name>/notes.md` or the brand file they
belong to. They are saved, not pasted. The Files saved list names them at most once.

**Placeholder or missing inputs: one line.** Say what is missing ("No domain given, so
no DNS or deliverability check"). Never audit a placeholder (yourdomain.com,
[Business Name], example.com) at length or run checks against it.

**Say each thing once.** No duplicated tables, no summary that restates the body, no
recap of what the chat already showed or the file already holds.

**Length budgets by job type.**

| Job | Budget |
|---|---|
| Page or landing page | about 800 to 1,500 words of copy |
| Plan | about 1,200 to 2,500 words |
| Email or text sequence | the messages plus 200 words of notes |
| Ad set | the ads plus a short test plan |

Go longer only when the request explicitly asks for more pieces. Over budget with no
extra pieces asked for means cut, starting with anything that is process, not work.

---

## Quick Pick block

When a skill presents multiple options (angles, concepts, headline variants), the
recommendation appears at the top, before the detailed options:

```markdown
**Quick Pick: ★ Option 2: The Question Hook**
"What if your proposal template is the reason you're stuck at, say, $5k months?"
Best for: cold traffic, skeptical buyers. All options below.
```

One ★ pick, the option number so the user can find it in the full list, a one-line
rationale or copy excerpt. If there is no clear winner, skip the block: do not fake a
recommendation.

---

## Quick Mode

When the user makes a specific, single-asset request ("write me a LinkedIn post about
X", "give me 5 subject lines", "generate a product photo"), skip the ceremony and
deliver:

- No project status scan, no multi-step workflow proposal, no gap analysis, no
  missing-file warnings.
- Just the asset (still saved to disk per the files-first principle), then a one-line
  what's-next.

**Quick Mode wins over any "scan first" rule.** If a skill's own instructions say to
audit context, propose a plan, or check the brand foundation before generating, a
specific single-asset request overrides that. Deliver first.

**Not Quick Mode:** "help me with...", "where should I start", "set up my...", anything
exploratory gets the full experience.

---

## Status indicators

Three indicators, used sparingly inside content sections:

| Mark | Meaning |
|------|---------|
| ✓ | present / passed / saved |
| ✗ | missing / failed |
| ★ | recommended option |

That is the whole palette. No progress spinners, no circled numbers, no star-rating
rows, no tree-view glyphs. Status marks never become a status table of what the agent
checked.

---

## Anti-patterns

- **No box-drawing or divider art.** No `━━━`, `───`, `┌─┐` boxes, `├──` trees, or
  `①②③` numerals. Use markdown headings, lists, and ordered lists.
- **No character counting.** No fixed line widths, no aligned columns built from
  spaces, no indent diagrams. Write normal markdown and let the renderer work.
- **No preamble, no postamble.** Start at the header; end at what's-next.
- **No emoji**, anywhere in output.
- **No dumped deliverables.** A 2,000-word article pasted into chat instead of saved to
  `./campaigns/` is a bug, even if it is also saved.
- **No orphaned output.** Missing files-saved or what's-next sections are bugs.
- **No leaked process.** Script paths, score tables, per-line data tags, tool or tier
  names and matrix status inside the deliverable are bugs.
- **No fabricated metrics.** Examples that need numbers mark them as illustrative
  ("say 2.1%"); estimates carry `~` and the Sources and assumptions note says where they
  came from.

---

## Worked example (complete output shape)

```markdown
## SUBJECT LINE VARIANTS: Welcome Email 1
Jun 10, 2026 · for the welcome flow

**Quick Pick: ★ Option 1: proof + specificity**
"I booked 3 clients with this proposal template"

1. ★ "I booked 3 clients with this proposal template", proof + specificity
2. "Your proposal template is broken (here's mine)", curiosity + pattern interrupt
3. "The 3-email sequence that books calls", utility, clear value

Recommended A/B test: 1 vs 2.

**Sources and assumptions:**
- Written from your past sends and the current voice notes; no live research.
- Question subjects underperformed proof subjects for this list in May, so option 1 leads.

**Files saved:**
- ./campaigns/welcome-flow/subject-lines.md (new)
- ./brand/assets.md (1 entry appended)

**What's next:**
- /boring-marketing-email-sequences: write the full email behind the winner (~10 min)

Or tell me what you're working on and I'll route you.
```
