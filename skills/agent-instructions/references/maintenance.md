# Keeping the instructions working

The instruction file is the agent's to manage: it edits it without asking, the way it edits code, except removing a rule's text, which it proposes and the owner decides (`SKILL.md`, budgets). What keeps a file that is edited by every session from rotting is two passes, a few filing rules, and a check that runs.

## The release pass

At every release, read the entry file top to bottom and ask of each part:

1. **Is it obsolete now that the code exists?** A rule written to steer a build that has since landed: name the test or doc line that now holds it, adding one if none does, then propose its text to the owner for removal (`SKILL.md`, budgets).
2. **Does it belong in a doc, with a pointer here?** Depth that only one area needs moves out, and the router gets the row.
3. **Is it needed in *every* session, or only when touching one area?** Only one area → the router is its home.
4. **What did this phase teach that the next session must know?** Add it, with its receipt.

Then, in the same pass:

- **Move the status out.** The plan holds the status; the entry file keeps at most three lines — the current stage, what is in production, what is waiting on whom — with a link. (A live Q&A product's status section grew until it was most of the file every session reads, and had to be moved out at least four times in four days.)
- **Move the release narrative to the history.** What the previous release shipped, what its rounds and gates found, goes to the release history; only the rules it taught stay, in Section 1.
- **Run the reachability check** (below), and route what it lists; what has nowhere to go, propose retiring.
- **Run the budgets check.** If the repository uses review dates, put each rule it lists as past its date to the owner (`SKILL.md` § Budgets).

In a release checklist this is one line: *the instruction file reviewed — obsolete parts proposed to the owner for removal, documented parts moved to docs with a pointer, this phase's lessons added; the status current, and its three lines with it.*

## The mistake pass

**When a mistake happens, and its cause was something the file should have said — or said badly — fix it in the file, in the moment, with the receipt**: the date and what went wrong, so the rule carries its reason. Not at the end of the session, and not in a note to fix later: the moment is when the cause is understood.

Then ask the two follow-up questions:

- **Which router row should have fired?** (`router.md` § When a row failed.)
- **Could this be code instead?** If compliance depends on the agent remembering the sentence at the decisive moment, it will be missed again (`prose-vs-code.md`).

## Progressive disclosure, as rules

1. **Every file in the knowledge layer is reachable** through a chain that starts at the entry file's router (entry file → operative file → sub-file), or at the docs' catalog.
2. **Every tool is referenced** from a tools index or from the doc that uses it.
3. **New files are routed immediately** — added to the right index or parent file when created, not later.
4. **The entry file's router is the entry layer.** It routes to doctrine and never summarizes it. A new file rarely needs a router row; it needs a reference from the right file in an existing chain.
5. **Memory is not a substitute for structure.** An agent's memory is for behaviour corrections, not for routing to tools or knowledge files: a route or owner choice that lives only in memory is invisible to another vendor's builder or reviewer and to the next machine. Standing choices go straight to the entry file or user-level instructions (`SKILL.md` § The entry file).
6. **Separate evidence from rules.** A file over about 200 lines where rules and their supporting data coexist splits: the rules stay where the router points, and the methodology, tables and postmortems move to an evidence file, opened only when revisiting a rule or running a new analysis. The rule file links to its evidence; the evidence file is never the one the router opens.

## Filing without accretion

The failure mode of an agent-maintained instruction file is not neglect; it is accretion — every lesson added as a rule until the file reads like a compliance checklist and the agent works from rules instead of principles.

- **Update proactively.** When the next move is obvious — a missing rule, an outdated pattern, a better framing, a gap caught mid-task — edit the file. Ask the owner only when the change needs the owner's judgement (a genuinely new principle, retiring a rule, a taste call: `SKILL.md`, budgets).
- **The default filing mode is evidence, not rules.** A new learning usually lands as a receipt or a calibration under a rule that already exists. **A genuinely new rule is rare**, and should usually replace or generalize one.
- **Rules earn their place with evidence.** Every rule is loaded into every future context. Before adding a rule or a check, cite the violation: which change, which incident, what failed. Patterns from an outside linter or style guide are idea sources, not rule sources — filter them through "does this repository actually do this?" (`2026-04-18`, a content repository declined four patterns from an external linter for lack of any violation.)
- **Choose deliberately between a codifiable rule and a judgement principle.** Ask whether the rule needs mechanical checking or judgement in context. Codifying judgement flattens it into checklist behaviour. Default to a principle when nuance is real; codify only when "is X present? yes/no" gives a useful answer. (`2026-04-26`, from a critique of over-codification in the same repository.)
- **Two lanes, never mixed.** *Judgement* lives in principles and must fit working memory at the moment of the work. *Lint* — mechanical checks — stays a short end-pass and never grows judgement.
- **If a check fires repeatedly, fix the upstream principle** instead of adding a check.
- **A rule that has never caught anything is sediment**, unless it guards an irreversible or outward-facing step, which works by preventing what it would catch. Rules earn their place by measured effect; one that has caught nothing across dozens of uses is put to the owner, who retires it (deleted, or moved to the history) or keeps it. The agent retires none on its own (`SKILL.md`, budgets).
- **When a session starts to feel rule-bound rather than principle-led, say so** to the owner; that is the signal for a consolidation pass.

## Memory → instructions: when a correction graduates

An agent's memory holds behaviour corrections and facts that vary by conversation. The instruction file holds rules that apply to all future work.

**Promote a memory into the instruction file (or the doc its row opens) when:**

- it states a factual rule that applies to every future task of a type, not just a preference for today;
- it has been confirmed twice, or survived a postmortem;
- losing it would cause a repeatable mistake, not just mild friction.

**When promoting**, move the rule text into the file where the router already finds it, and delete the memory — two copies drift.

**Keep in memory, don't promote:** conversation-specific facts about the user's role or preferences, rather than standing owner choices; project-state facts that decay ("the merge freeze begins on…"); pointers to external systems ("pipeline bugs are tracked in…"); tactical workarounds for ephemeral bugs.

## Orphans — the check that holds reachability

```bash
python <skill dir>/scripts/check_reachable.py <repo>
python <skill dir>/scripts/check_reachable.py <repo> --scope docs --scope .claude/skills
python <skill dir>/scripts/check_reachable.py <repo> --exclude "docs/screenshots/**" --exclude "knowledge/raw/**"
python <skill dir>/scripts/check_reachable.py <repo> --why docs/TESTS.md
```

It starts at the entry files (`AGENTS.md`, `CLAUDE.md`), follows every markdown link, backticked path and `@` import, and lists the markdown files under the scope that no chain reaches; exit 1 when there are any. `--why` prints the chain that reaches one file. Data files that are not instructions (captures, fixtures, raw exports) are left out with `--exclude`.

**Run it** after adding docs or tools, after any restructure, when you suspect a file is not being discovered, and at every release.

**Fix each orphan by routing it to the parent that owns its moment:**

| Orphan | Route it from |
|---|---|
| a doc holding a rule | a router row keyed by the moment it applies, or a link from the file that row opens |
| an evidence file | the rule file it supports |
| a case study or worked example | the docs' catalog (it has no moment) |
| a tool or script | the tools index, or the doc that tells the agent to run it |
| a new area of docs | its index, plus the entry chain — a router row only for a genuinely new task class |
| none of these | propose retiring it to the owner: deleted, or moved to the history |

A file nothing reaches is a rule nobody follows. Routing it is the fix; noting it is not.

## The chain, drawn

For a repository whose knowledge is deep enough to need it, draw the chain once in the maintenance doc, so a restructure can be checked against it:

```
entry file (always loaded, a few KB — a dispatcher)
├── router → one entry file or a few operative files per task class
│   ├── building or changing behaviour → test rules, the doc for the behaviour
│   ├── releasing → the release procedure
│   └── maintaining these instructions → this file
├── always-on rules (capped) → the files they route to
└── precedence → which file wins when two disagree

docs index = catalog + governance (what each file holds, which wins), NOT a second router
```
