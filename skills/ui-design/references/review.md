# Reviewing a built product's look

## Full phase visual checks

Run the walkthrough, the rendered-screen pass against `screens.md` § What to verify visually, the app-screen screenshot critique and the scored Impeccable-style audit. Critique at 1440, 768 and 390, with three rounds at most. Both critique and audit run from the `collections.md` checklists without installing the collections.

### The newcomer walkthrough

**Give a fresh session only the ordered screenshots and the user's job.** Never give the brief or code; alternatively, ask a person new to the domain. Ask the same questions for every screen: what is it for, what would you press next, and what is unclear? Fix any screen it cannot explain or next step it cannot find. Capture every route and dialog with a Playwright crawl at 1280 and 390. Crop pages taller than about 3,000px into ordered parts for reading without downscaling. For Clerk's test-user sign-in recipe, apply the `clerk-production` skill (`references/authenticated-mile.md`); other providers use their development test sessions.
(`2026-11-04`, an evals product: a fresh `claude -p` session using this recipe found in about 20 minutes that no screen said how often each failure happened, a gap three review rounds missed.)

## The owner's look review

When the owner judges what is built — "okay but not stunning", a product they admire, a question about borders, buttons or colour — or before a release's visual pass. **A design review produces decisions, not opinions.**
- Every claim is measured.
- Every recommendation the owner sees comes with a before/after built from the product's real tokens.
- Every change is sorted into one of two kinds:
  - **a fix:** an inconsistency, or a breach of the method or the product's kit. Fixes get built;
  - **the owner's call:** taste, or a change to a written rule. These wait for the owner.

That split is what let an owner answer seven questions in one message rather than in a conversation per adjective (`2026-10-22`).

## First: does every builder load the method?

Check that **every agent that builds the product's screens loads the method from `app-stack` installed in it** (`SKILL.md § Where the method lives`), never from a link. An older copy inside the product (`.claude/skills/design/` or `ui-design/`, or the method pasted into its design README) is stale: what it says that the pack doesn't is sorted as `SKILL.md § Where the method lives` says, and the copy is deleted.

A monitoring product's design README said the method "applies unchanged" and pointed at it in another repository, which no agent working in the product ever opened. The method already said "Cancel is always the secondary", and the product still shipped borderless Cancels in five places (`2026-10-22`). A rule another product already paid for costs the full price again when this one only points at it.

## The procedure

1. **Answer the owner's questions first, in their words.** Quote each one. Give a verdict in one sentence, the evidence, and the change as `file:line` before → after. Everything else in the review comes after those answers.
2. **Capture every main screen.** That means light and dark, at 1440 and at 390 wide, in the healthy state and in a problem state, plus close-ups of the components in question.
   - Data-dependent states come from the product's real components on a temporary local route with fake data.
   - **Never write to shared test accounts or the owner's workspaces** to stage a screenshot. A reviewer that seeded monitors into the test gate's account failed a gate run mid-review (`2026-10-22`).
3. **Measure, don't describe.**
   - Sample pixels from the owner's reference screenshots.
   - Run `scripts/color.py` on every colour in question, for OKLCH hue, chroma and lightness and WCAG contrast.
   - When the product the owner admires (the reference) is open source, read its theme and component source for the exact recipe. Supabase's UI is: `packages/ui/build/css/themes/light.css`, its card and radio-group components.
   - The session that presents the review recomputes the headline numbers itself, whoever wrote the report.
4. **Count the colours of a healthy day.** List the most saturated things on the main screen when nothing is wrong, and what each one says. If the loudest colours say "press" and "beware", the product can't feel reassuring however good its parts are. This one count explained most of "okay but not stunning" in a dashboard whose healthy overview's loudest colours were its blue button, a lavender nav item, and amber and red icons on tiles counting zero.
5. **Run every rule in `method.md`** against the screenshots and the code, and every check in `screens.md`. The ones past reviews caught:
   - tints that drifted off the accent's hue;
   - the accent on the current nav item;
   - alarm icons at zero;
   - borderless Cancels;
   - a left bar drawn as an inset shadow;
   - flag emoji;
   - mono URLs;
   - twelve boxes in three styles;
   - summaries of one state computed in several places.
6. **Build a specimen for every recommendation.**
   - Before and after, side by side, in the product's real token values.
   - Each specimen is scoped (one class prefix, its own variables), so a set of them assembles into one page.
   - Publish that page where the owner can open it on a phone, as an artifact. Specimens decide faster than prose.
7. **Sort fixes from owner's calls.** The test: does the change contradict something written, or is it taste? If either, it's the owner's call. Give each one a recommendation (do it / try it / don't) and what it goes against, and ask for the answers in one message, by number.
8. **Build the fixes, and hold each rule with a test** where one can be written: a source scan, as the colour-literal guard is, or a pinned pair in the token test. Write a rule for this product only into its kit README, and a general one as a change for this collection that names the file `SKILL.md § When something is learned` gives it (`method.md`, `screens.md` or `review.md`), each with its receipt; an edit to the installed pack is lost at its next update. A rule that only exists in a review report is gone by the next product.
9. **Review the change independently**, like any other code. Presentation changes misstate state.
   - A new green mark beside an existing all-clear headline showed for a monitor that hadn't been checked yet. Two more rounds each found another sentence on that screen disagreeing with it (`2026-10-22`).
   - When a change touches one sentence about state, the brief asks for an audit of **every** sentence on that screen about the same state.
10. **Record every owner decision, including a no, with its reason**: in the product's decision log, and, when it is a preference rather than a product choice, in the kit README or the owner's user-level agent instructions (`SKILL.md § The owner's standing preferences`). A rejected recommendation without its reason comes back in the next review.

## The report

Write `report.md` in this order:
1. **The short version:** the diagnosis in a paragraph.
2. **The owner's questions,** each with its verdict, evidence, change (before → after with `file:line`) and specimen.
3. **A comparison table:** where the reference does better, where we do, and what doesn't apply to us.
4. **Further recommendations,** ranked by impact on what the owner said, each with effort and its risk to the written rules.
5. **Owner decisions in one table:** the change, what it conflicts with, and the recommendation.
6. **What couldn't be checked, and why.**
7. **Sources,** marking which were verified first-hand.

Put the specimens in `mockups.md`, rendered together in one HTML page. Put the screenshots in `shots/`, named `<screen>-<light|dark>-<desktop|phone>.png`.

## Delegating it

- The reviewer is the strongest model available. This is judgement work.
- Give the reviewer the owner's screenshots, the repository, the product's design README, the questions in the owner's words, the location of a running dev server (read-only), and the no-writes rule for shared data.
- The session agent:
  - verifies the key numbers with `scripts/color.py`;
  - builds the owner-facing page from the specimens;
  - delegates the fixes as a separate build;
  - runs the independent review on that build.
