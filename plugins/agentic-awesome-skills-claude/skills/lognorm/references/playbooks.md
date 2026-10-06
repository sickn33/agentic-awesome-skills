# LogNorm playbooks

## Work this week's plan (orchestrator)

1. `search` (no query), then `execute`: `return await lognorm.plan.week()`. Include `carryOver` moves.
2. Skip moves another agent holds (`claimedBy` set and not `mine`). Group the rest:
   - **fix** and **improve** moves with `validate` or a `targetUrl` → fixer sub-agents (one per move or per rule).
   - **articles**, **commercial** and AI-gap content moves → writer sub-agents (one per move).
   - research-style work (competitor gaps, AI visibility) → a researcher sub-agent.
3. For each sub-agent: `register_worker({ purpose })` → give it the move id, its `workerId` and the matching playbook below. Run them in parallel.
4. Each sub-agent: `claim_move({ moveId, worker })` first, `set_status` while working, `comment_on_move` at milestones.
5. When all finish: `finish_worker` each, then post a short summary to the user (moves done, drafts in review, fixes waiting to validate, blockers).

## Fix audit issues (SEO and GEO)

1. `lognorm.moves.get({ id })` → `fix` (rule, why, how to fix) and `evidence`.
2. All affected URLs: `lognorm.audit.findings({ rule, limit: 500 })` (SEO) or `lognorm.geoAudit.findings({ check })` (GEO). Page details: `lognorm.pages.get({ url })`.
3. Find where those pages come from in this codebase (routes, templates, CMS content, metadata functions, robots/sitemap generation) and fix the cause, not each page by hand.
4. Run the project's checks (build, lint, tests). Open a PR or commit as the user prefers.
5. `comment_on_move`: what changed and where (files, PR link). Then `update_move` → `published` once it's deployed.
6. `validate_fix({ moveId })`, then read `lognorm.fixes.status({ moveId })` after a minute or two. Remaining findings → fix and validate again.

Rules with `validation: "none"` (orphan pages, crawl depth) need a full re-crawl; say so in the comment.

## Write a post or page

1. `lognorm.moves.get({ id })`: keyword, topic, evidence (SERP, competitor pages, Search Console queries, AI answers).
2. `lognorm.brain.search({ query })` for product facts and positioning; `lognorm.brain.writingRules()` for voice and rules. Follow them.
3. `lognorm.content.list({ search })` and `lognorm.pages.list({ type: "blog", search })` so you don't duplicate an existing post; link to related pages (`pages.list`) with real URLs only.
4. Write Markdown: one H1, clear H2 sections, answer-first intro, an FAQ when the evidence has questions. Cite only real sources; never invent statistics or customer quotes.
5. `save_draft({ moveId, title, markdown, metaTitle, metaDescription, targetKeyword })` → note the `contentId`.
6. Images: `lognorm.content.media({ id })` tells you if the workspace has an image model. Diagrams, charts and simple illustrations: write SVG and `add_image({ contentId, svg, alt, afterHeading })`. Photographic or illustrative art: `generate_image({ contentId, prompt, alt, afterHeading })` (house style, uses credits).
7. Cover: `set_hero_layout({ contentId, layout })` from `lognorm.content.heroLayouts()`; "type" is a brand-coloured typographic cover with no art; art layouts take cover art from `add_image`/`generate_image` with `asHero: true`.
8. Review the draft once, then `save_draft` again with `contentId` and `submitForReview: true`.
9. If the user's site keeps content in this repo (MDX, Markdown), you may also add the file in a branch, but the LogNorm draft is what the team reviews.

## Competitor and keyword research

- `lognorm.competitors.list()`, `lognorm.competitors.pages({ domain, pageType, newOnly: true })`
- `lognorm.keywords.list({ status: "targeted", striking: true })`, `lognorm.keywords.list({ unranked: true, sort: "volume" })`
- `lognorm.searchConsole.queries({ view: "striking" })`, `lognorm.searchConsole.pages({ view: "declining" })`
- Write findings as a comment on the related move (or a summary to the user) with the data you used.

## Improve AI visibility

- `lognorm.aiVisibility.summary()`, `.prompts()`, `.learnings()`, `.sources()`, `.answers({ promptId })`
- Learnings name the pages to change and why; `sources().missingFrom` lists third-party pages that cite competitors but not the user (outreach targets).
- GEO audit checks (`lognorm.geoAudit.summary()`) cover llms.txt, AI crawler access, structured data and agent discovery files: these are usually code fixes in this repo.
- Manage tracked prompts: `lognorm.aiVisibility.promptContext()` → `add_ai_prompts` (buyer questions that never name the brand); `lognorm.aiVisibility.promptsDetail()` + `update_ai_prompts` to pause, resume, edit or remove; `start_run({ kind: "ai_visibility" })` to check now.
- GEO assets: `lognorm.geoAudit.assetContext({ kind })` → `save_geo_asset`; rewrites: `lognorm.geoAudit.rewriteContext({ onlyMissing: true })` → `save_geo_rewrites` (quote the page verbatim).

## Plan a topic cluster

1. `lognorm.topics.list()` → pick the topic, or `create_topic` with its pillar and keywords; `keyword_lookup` for fresh ideas and `add_keywords` to track them.
2. `lognorm.topics.planningContext({ topic })`: plan a hub for the broadest keyword and 3-10 spokes, keywords copied exactly, a format from `formats`, an angle and a why with the numbers, up to 3 competitor URLs each.
3. `plan_topic({ topic, summary, hub, spokes, competitorTopics })`; fix anything in `rejected`. Its articles become ranked moves.
4. `lognorm.topics.ideaContext({ topic })` → `add_content_ideas({ topic, ideas, autoSchedule: true })`; `schedule_content` adjusts the calendar.

## Write a post the LogNorm way

1. `research_brief({ moveId })`, then `lognorm.content.research({ id })` and `lognorm.content.writingGuide()`.
2. Write the plan in the returned schema (cite only fact ids, keywords and internal pages from the research): `save_brief`.
3. Write the article in the house style: `save_draft`; images (`add_image` SVG/PNG or `generate_image`) and a cover (`set_hero_layout`); `comment_on_content` with your sources and choices; submit for review.
4. Feedback: `lognorm.content.feedback({ id })`, rewrite with `save_draft`, `apply_feedback` with a resolution per comment.

## Run a growth review

1. `start_review({ title: "Growth review · <date>", mode: "review" })`; work through `lognorm.strategist.reviewChecklist()`.
2. After each area, `post_update` with your research steps, the moves you created (`create_move`) and reports (`build_report`).
3. Ask the team when a decision is theirs (`question`); read replies in `lognorm.strategist.session({ id })` and answer with `post_update`.
4. `finish_review` with the state of the site and the five things that matter this week.

## Positioning and competitors

- `lognorm.site.insightContext()` → `save_site_insight` from the site's own words.
- `lognorm.competitors.context({ competitor })` → `save_competitor_summary`; `add_competitor` for new rivals; `keyword_lookup({ mode: "gap", domain })` for what they win.
