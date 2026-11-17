# Deep foundation: four research agents (opt-in, about 15 minutes)

Load this on "deep", "go deep", "full foundation" or an explicit ask for full research.
The lite read (SKILL.md, First run) is the default; deep upgrades its files. A brand with
no lite files yet runs the scaffold steps (SKILL.md, First run, step 1) first.

## Before dispatch

1. Run Tool detection (SKILL.md) and refresh `./brand/stack.md` if it is missing.
2. **Check the web:** one WebSearch yourself (the business name). Denied or erroring?
   The agents would be blocked too. Don't dispatch; keep the lite files, say why, and
   stop.
3. Hand the agents any local evidence the scan found (`README.md`, `MARKETING.md`,
   `docs/`, site source), tagged as local docs inside the working files, and the lite
   files as a starting point to verify, not to copy.

## Dispatch

Dispatch **four Task agents in one parallel batch** using the plugin's
`boring-marketing:research` agent type (tools limited to files and web, no connectors).
If that type is unavailable (another agent, or a non-plugin install), use
`general-purpose` and rely on the brief. Each brief carries the research budget: at most
40 fetches, 8 minutes, no sub-agents. Exactly four agents.

**Never idle waiting for completion notifications** (a hung fetch would stall you):
after dispatch, check on the files in short waits. Run `sleep 90; ls ./brand/` and repeat
until about 8 minutes have passed (each call stays under Bash's default 2-minute timeout,
and some agents block long foreground sleeps). If any of the four files is not yet
rewritten, wait up to 4 more minutes the same way, then present IMMEDIATELY with what
exists, marking a missing upgrade as partial in its file and naming the skill to run
directly. Late notifications after you have presented only update `brand.yaml`.

Each agent gets this brief, adapted per row:

> Read `${CLAUDE_SKILL_DIR}/../<skill>/SKILL.md` (the sibling skill folder) and execute
> its method for <URL>, non-interactively: never ask the user anything; make the
> senior-operator call and star it. Start from the lite file in `./brand/` and replace
> it with the full version. Data boundary (hard): read ONLY files inside this workspace
> and the public web, never the home directory, other repos, notes or memory folders,
> drives, mail or MCP connectors unless a path in this brief names them; label local
> files LOCAL DOCS. Budget: at most 40 fetches, 8 minutes, no sub-agents; never fetch
> login-walled hosts (instagram, facebook, linkedin posts, x.com, threads); skip and
> label. Scrape, don't guess (Firecrawl if available, else WebFetch/WebSearch). Write
> your files to `./brand/`, never `brand.yaml`; never write client facts to assistant
> memory or notes. Return a summary of at most 10 lines: found, files, confidence, one
> thing to verify with the user.

| Agent | Skill method | Writes |
|---|---|---|
| Voice extraction | /boring-marketing-brand-voice Auto-Scrape mode | voice-profile.md |
| Positioning landscape | /boring-marketing-positioning-angles competitive fan-out, 3-5 angles, star one | positioning.md |
| Audience and customer words | /boring-marketing-audience-research review and community mining | audience.md, voc.md |
| Competitor scan | /boring-marketing-competitive-intel teardown of 3-6 competitors from the category | competitors.md |

For a local business, add to the briefs: the competitor set is the map pack and top
results for `<trade> <town>`; the review mining covers the business and those
competitors (what customers praise and complain about locally).

If an agent can't spawn its own sub-agents, it runs its skill's research sequentially
inside itself; the four top-level agents still carry the parallelism.

## After all four return

1. Verify each expected file exists and no longer says `Depth: lite`; update the
   `brand.yaml` `files:` entries yourself (four parallel writers would race on the
   manifest) and set `depth: deep`.
2. Present the **Brand Foundation Report**: voice summary in the brand's own voice, the
   starred angle and runners-up, audience segments with 2-3 verbatim quotes, the
   competitor gaps worth taking, stack status, files saved. Close with one short Sources
   and assumptions note (3 lines at most: what was read live, what was partial or
   estimated). Each agent's data label stays inside its brand file.
3. **One correction pass:** "What did I get wrong? Name anything off (voice, angle,
   audience, competitors) and I'll fix the file now. Otherwise we build." Apply
   corrections directly and move on. Do not loop. Standing rules ("we don't do TikTok")
   also land in `preferences.md`.
4. Offer the standing brief once (`MARKETING.md`, at most 60 lines: goal, offer,
   audience in one line, constraints, do-not-do list). No → never ask again.
5. Route by the goal on line 1 of `stack.md` with `route.py --goal <goal>`.

Wall-clock: about 15 minutes, the slowest agent, not the sum.
