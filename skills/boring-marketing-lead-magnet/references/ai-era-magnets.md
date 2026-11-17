# AI-Era Lead Magnet Formats

last-verified: 2026-09-02 · ttl-days: 180 · refresh: web-search "lead magnet formats AI
marketing [current year]" + check that the platforms named below (Claude Code skills,
Claude projects, n8n, Make) still exist under these names; update examples, keep the bridge
logic.
changes: 2026-11-16 (a targeted fix; the rest of the file is as verified on 2026-09-02) removed the custom GPT route, because OpenAI is retiring custom GPTs (new creation is closed on personal plans and ended for Enterprise workspaces on 2026-10-26, standard retirement 2026-12-11), so hosted agents now point to Claude projects or a chat page you host. 2026-09-02 Agent Skills confirmed as an open cross-tool standard (agentskills.io); n8n and Make unchanged; format landscape unchanged (tools beat PDFs, AI-graded audits growing).

Load this when the audience builds with or buys AI: marketers, operators, agencies,
indie SaaS, creators in tech-adjacent niches. These are the formats this audience
actually trades, shares, and pays attention to. For audiences far from AI (local
services, traditional B2B), the classic catalog in the business-type files still wins.

The defensibility rule that governs this whole catalog (verified September 2026):
**information can be summarized away; tools, access, and personalization can't.** Every
format here survives the "paste it into ChatGPT" test in a way a gated PDF doesn't.

---

## Prompt packs

Curated, tested prompts for a specific job ("20 prompts that turn one webinar into a
month of content"), each with the use case, the prompt, and a note on what makes it work.

- **Why it converts:** zero learning curve, immediate use, and the prospect runs YOUR
  methodology every time they paste one.
- **Bridge logic:** each prompt encodes your framework. The pack is the methodology in
  executable form; the paid offer is the full system, the service that runs it for them,
  or the community where the prompts keep coming.
- **Defensibility:** medium. Generic prompts are trivially replicated, so they're defensible only
  when the prompts encode a genuinely non-obvious workflow or proprietary structure.
  Test every prompt before shipping; one broken prompt poisons the pack.
- **Build effort:** low. The work is curation and testing, not writing.

## Claude/agent skill packs

A working skill (SKILL.md + references) the prospect drops into Claude Code or any
Agent Skills-compatible tool (an open standard at agentskills.io, now supported by
Cursor, Codex, Gemini CLI, GitHub Copilot, and dozens more). Examples: "the cold-outreach
skill" or "the SEO-brief skill."

- **Why it converts:** it's a working tool, not content. The prospect installs your
  expertise and uses it daily, which makes it the highest-retention magnet format that exists.
- **Bridge logic:** the free skill does one job; the paid product is the full skill
  suite, the templates it depends on, or the done-for-you service. Put the upgrade path
  inside the skill's own output ("What's next"): distribution and pitch travel with the
  file.
- **Defensibility:** high. A skill that took real iteration to calibrate can't be
  summarized; it has to be used.
- **Build effort:** medium. You're shipping software. It must actually work in a clean
  session before it goes out.

## n8n / Make workflow bundles

Importable automation JSON ("the lead-enrichment workflow," "the content-repurposing
pipeline") with a setup README and the credentials placeholders clearly marked.

- **Why it converts:** delivers an outcome, not advice. Importing a working automation
  creates the strongest reciprocity in this catalog. You saved them a weekend.
- **Bridge logic:** the workflow exposes its own limits. It needs your data, your
  prompts, your maintenance. Paid offer = the full workflow library, customization
  service, or implementation retainer. Agencies: this IS your portfolio.
- **Defensibility:** high while it works. Test the import on a clean account; a workflow
  that errors on import converts negatively.
- **Build effort:** medium. Mostly QA and documentation if the workflow already exists
  internally.

## Hosted agents (Claude projects or a chat page you host)

A purpose-built assistant the prospect chats with: "the pricing-objection coach," "the
ad-angle generator." Host it as a shared Claude project, or as a simple chat page on your
own site with the system prompt and one LLM call behind a serverless function. Don't build
on custom GPTs: OpenAI is retiring them (standard retirement is 2026-12-11), and new ones
can't be created on personal plans.

- **Why it converts:** interactive and personalized; every conversation is about THEIR
  situation. Sessions run minutes, not the seconds a PDF gets.
- **Bridge logic:** the agent gives the diagnosis; the paid offer is the treatment.
  Instruct the agent to recommend the paid offer when the conversation reaches the
  limits of what free advice can fix. A bridge that fires at peak relevance.
- **Defensibility:** medium-high. The system prompt is the moat; a thin wrapper around a
  generic persona is replicated in minutes, a deeply calibrated one isn't.
- **Build effort:** low-medium. Caveat: an agent that lives in a chat app captures
  emails poorly. A chat page on your own site, with the email gate in front of it, fixes
  that; a shared Claude project is better as top-of-funnel awareness than list-building.

## AI-graded audits

The prospect pastes their URL (or uploads data) and gets a scored, personalized teardown, for example
"your landing page scored 61/100; here are the 3 things costing you conversions."

- **Why it converts:** combines the audit's high intent with software's zero marginal
  cost. Their data → their score → their gaps. The classic agency audit, unconstrained
  by hours.
- **Bridge logic:** the strongest in this catalog. The audit names the problems; the
  paid offer fixes exactly those problems, and follow-up email can reference their
  actual score and findings.
- **Defensibility:** highest. The output literally cannot be replicated by asking
  ChatGPT. It requires their data plus your scoring rubric. The rubric is the IP; the
  app is the delivery.
- **Build effort:** medium. This skill builds it (see `interactive-build.md`, audit
  skeleton). The rubric must encode real expert judgment; an LLM free-styling "feedback"
  without a rubric produces generic mush that reads as slop.

## Datasets / benchmarks

Original data nobody else has: "we analyzed 1,000 cold emails: here's what the top 5%
do," industry benchmark numbers, scraped-and-cleaned datasets, pricing surveys.

- **Why it converts:** genuine scarcity. AI can summarize the report but cannot generate
  the underlying data. It also earns citations and backlinks, and it's the only magnet format that
  compounds as an AEO asset (AI answers cite original first-party data heavily).
- **Bridge logic:** the data proves you've seen more of the market than anyone; the paid
  offer applies that pattern-recognition to the prospect's case. Benchmarks create
  instant self-comparison ("we're below median"), which is pain the offer resolves.
- **Defensibility:** highest, and it appreciates: each refresh resets the scarcity clock
  and gives the list a re-engagement event.
- **Build effort:** medium-high, front-loaded in collection. If the brand already has
  usage data, support tickets, or crawl output, the dataset may already exist.

---

## Choosing from this catalog

| Format | Email capture | Bridge strength | Defensibility | Effort |
|---|---|---|---|---|
| Prompt pack | gate the download | medium | medium | low |
| Skill pack | gate the download | strong | high | medium |
| Workflow bundle | gate the JSON | strong (agencies) | high | medium |
| Hosted agent (Claude project or own chat page) | weak in a shared project; strong on your own page | strong at limit-hit | medium-high | low-medium (an own page needs a small serverless function) |
| AI-graded audit | gate the results | strongest | highest | medium |
| Dataset/benchmark | gate the full report | medium-strong | highest | medium-high |

Two judgment calls that recur:

- **Tool vs. content when both fit:** pick the tool. A prompt pack and a guide can teach
  the same method; only the tool gets reopened next week, and reopening is what keeps
  the sender name warm when the nurture sequence lands.
- **Don't ship an AI-era format to a non-AI audience.** A workflow bundle sent to an
  audience that's never opened n8n converts worse than a checklist. The catalog is gated
  on audience capability, not on novelty.
