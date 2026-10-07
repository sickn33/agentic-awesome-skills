---
name: email-marketing-bible
description: "Data-backed email marketing for AI agents: automation flows, deliverability triage, copy de-slopping, AI email design, ESP control via MCP with send gates and compliance."
category: marketing
risk: critical
source: "https://github.com/CosmoBlk/email-marketing-bible"
source_repo: "CosmoBlk/email-marketing-bible"
source_type: official
date_added: "2026-10-06"
license: "MIT"
license_source: "https://github.com/CosmoBlk/email-marketing-bible/blob/main/LICENSE"
author: George Hartley
tags: [email-marketing, deliverability, copywriting, marketing-automation, email-design, ecommerce, saas, cold-email, mcp]
tools: [claude, codex, cursor, gemini]
---

# Email Marketing Bible

## Overview

The Email Marketing Bible turns an agent into an email marketing operator. It covers building automation flows, segmenting audiences, writing and de-slopping copy, directing email design, diagnosing deliverability, and operating an ESP through MCP or connectors behind hard pre-send gates. Part A is the operating manual for when the agent acts; Part B is the dense reference (metrics, flows, deliverability, compliance, platforms, benchmarks and 19 industry playbooks).

Adapted from the official skill at [CosmoBlk/email-marketing-bible](https://github.com/CosmoBlk/email-marketing-bible) (v2.7, 8 Sep 2026, MIT) by George Hartley, co-founder of Nitrosend. It is distilled from a 19-chapter guide built on 908 sources ([nitrosend.com/email-marketing-bible](https://nitrosend.com/email-marketing-bible)) and from running SmartrMail (about 12,000 customers, 6 billion emails). Figures are mid-2026; verify anything volatile (inbox rules, ESP features, pricing, model names) before acting.

## When to Use This Skill

- Use when building or editing email automation flows: welcome, abandoned cart, browse abandonment, post-purchase, win-back, sunset.
- Use when an agent drives an ESP through MCP, a connector or an API (Klaviyo, Mailchimp, Resend, Nitrosend and similar) to create segments, flows or campaigns.
- Use when diagnosing deliverability: spam or Promotions placement, bounce or complaint spikes, SPF, DKIM and DMARC problems, warm-up and ESP migrations.
- Use when writing, reviewing or de-slopping email copy, subject lines and CTAs.
- Use when directing AI email design or critiquing a rendered email.
- Use when choosing an ESP, pulling benchmarks, checking compliance (CAN-SPAM, GDPR, CASL, Australian Spam Act), or planning cold email, WhatsApp, SMS or RCS.

## How It Works

### Step 1: Apply the hard gates

Read section 0 before touching a real account. Every segment, draft, campaign, flow or staged send on a live ESP is real, and nothing goes to more than one recipient without explicit human approval in the conversation.

### Step 2: Route the task

Use the task router (section 1) to jump to the right section, and gather the listed inputs before acting.

### Step 3: Read, reason, act, verify

Read account state first (lists, flows, recent campaigns, deliverability, suppressions), change one thing at a time, and verify it against real counts.

### Step 4: Show the pre-send packet and wait

Run the pre-send checklist (section 3), show the packet (preview URL, audience size, suppressions, subject, preview text, send time, sender, unsubscribe, compliance risk) and wait for an explicit "send it".

## Part A: Operating Manual

### 0. AGENT OPERATING RULES

Every segment, draft, campaign, flow or staged send on a real ESP is live. **Hard gates, never skip:**
- **No send or schedule to more than one recipient without explicit human approval in this conversation** ("send it" or equivalent). Single-recipient test sends still need a yes.
- **Preview before asking; show the packet before any send:** preview URL, audience size, exclusions/suppressions applied, subject, preview text, send time, from-name + reply-to, unsubscribe present, compliance risk.
- **Block the send** if authentication is missing, unsubscribe or physical address is absent, complaint rate is at or above 0.1%, consent basis is unclear, or the audience includes suppressed, bounced or complained contacts.
- **Never probe unknown mutating endpoints on a live audience.** `/send`, `/dispatch`, `/trigger`, `/fire`, `/publish` paths can dispatch immediately; if the approve-scheduled path is unclear, ask the human to click it. Test on sandboxes or cloned campaigns with seed lists.
- **Separate the modes.** Transactional, marketing, lifecycle and cold outbound have different rules, domains and consent bases. Never mix them.
- **Log every autonomous action** (segment changed, flow edited, campaign created, send staged) so the human can audit it.

### 1. TASK ROUTER

| Intent | Go to | Gather first |
|---|---|---|
| Audit a programme | §2, then the reference | read access, recent sends |
| Build a flow | §7 + §2 | model, trigger, audience, offer, exclusions |
| Send a campaign | §3 | segment, consent basis, copy, sender, timing |
| Diagnose deliverability | §11 | domain, ESP, bounce + complaint rate, recent changes |
| Write or de-slop copy | §4 | audience, offer, voice, one real proof |
| Design an email | §5 + §16 | brand tokens, archetype, goal |
| Pick a platform | §15 | list size, use case, stack, budget, agent-driven? |
| Pull a benchmark | Appendix | industry, email type |
| Cold outbound | §14 | offer, ICP, domains, volume |
| WhatsApp / SMS / RCS | §Messaging | channel, consent basis, region |

### 2. AI EMAIL AUTOMATION (the operating model)

The marketer moved from operator to director: brief the agent, govern it, own the send button. Most major ESPs now ship a human-gated prompt-to-campaign agent, an MCP server or a Claude/ChatGPT app (§15); advise on the surface the user runs.

**The loop: read state → reason → act → verify.** Read the account first (lists, flows, recent campaigns, deliverability, suppressions), act on one thing, verify it. Opening prompt: "audit my account and tell me what is missing".

**Automate:** send-time optimisation, subject-line variants + A/B, cart/browse triggers, post-purchase cross-sell, first-draft copy. **Keep human:** brand voice, strategy (segment priority, flow order), creative direction, domain and deliverability, the final send.

**Autonomy dial.** Ask mode by default; widen only on narrow, reversible, low-brand-risk tasks, with an undo; read before write access. Supervised autonomy is the production stance. Where "AI optimisation" means bandits reallocating live traffic, measure with holdouts (never last-touch credit) and do-not-optimise constraints (margin, fatigue, complaints, brand safety).

**Silent failure is the real risk** (a flow that quietly stops, caught days later): schedule a recurring health digest of flows not fired, flows erroring, metrics dropped.

### 2b. FIELD NOTES: RUNNING AN ESP FROM AN AGENT (JUN-SEP 2026)

Three months running Nitrosend's own sending through agents; each rule cost a real mistake. First five are Nitrosend mechanics (check your ESP's equivalent); the rest hold anywhere.

- Optimistic-concurrency version (`if_version`) on every write; on conflict, re-read and retry with the fresh version, never guess.
- Re-assert brand or account before every write batch after idle; MCP context resets silently to the default brand while reporting a deliberate selection.
- Silent-parameter APIs default to send-to-all: pre-flight assert audience id and count, never probe a mutating endpoint on a live audience (one unknown body key mailed 1,003 contacts).
- Liquid merge defaults go unquoted inside `href`; inner quotes close the attribute and break the link.
- Animated WebP rather than GIF for heroes; then fetch the served URL and confirm it still animates (CDN variants can flatten to frame one).
- Set text and button text colours explicitly on every design; theme defaults drift (grey headlines, dark text on a coloured button).
- Decode tracking-wrapped CTA URLs before approving; the wrapper hides the target.
- Never backfill or re-dispatch failed sends without a human order; late sends look worse than none.
- Drafts by default; the literal "send it" in chat is the only thing that fires a blast.
- Every email gets a hero, a live-text headline and one button; secondary content gets inline links.
- Quote tiles come from HTML in headless Chrome, never an image model (garbled type, invented names).
- Migration opt-out state comes from the old ESP's API, never a list CSV; exports drop unsubscribes.

### 3. PRE-SEND CHECKLIST

Confirm every line, surface it, wait for "send it".

- [ ] Audience: size and segment logic verified against actual counts (AI segments run over-broad)
- [ ] Suppressions: unsubscribed, bounced, complained, globally suppressed, frequency-capped, open support issue
- [ ] Authentication: SPF, DKIM, DMARC aligned, p=quarantine or stronger (Outlook requires all three at 5K+/day)
- [ ] One-click unsubscribe (RFC 8058) + physical address present
- [ ] Copy: §4 pass, one CTA, subject ≤45 chars, preview text adds information
- [ ] Design: single column ≤600px, dark-mode safe, alt text, live-text headline, explicit text and button colours, images <200KB each and <800KB total, cross-client preview, spam score, hero animates at the served URL
- [ ] Links: wrapped CTAs decoded, no placeholder URLs, merge defaults render inside `href`
- [ ] Sender: correct from-name + monitored reply-to; brand and account re-asserted; send time set; consent basis valid for this audience and content
- [ ] Non-email: US SMS 10DLC brand + campaign registered; WhatsApp opt-in for the category + approved template; quiet hours per recipient local time (SMS 8am-9pm)
- [ ] Kill switch: batched or throttled send with a working pause and rollback plan
- [ ] Test send reviewed in a real inbox with real merge data
- [ ] Personalisation confidence, inventory and pricing freshness checked; kill plan named
- [ ] Human approval captured

### 4. ANTI-SLOP COPY PROTOCOL

Raw LLM copy is a deliverability liability, not only a quality one: Google filters high-AI-similarity text harder.

- **The deepest tell is the absence of stakes.** Put **one genuine, defensible opinion in every email.** Ask the draft where it is too safe.
- **Burstiness.** Alternate long and short sentences; a 3-5 word line after a long one, at least once per section.
- **Blacklist (lint before send):** delve, leverage, foster, ignite, empower, unleash, streamline, navigate, seamless, robust, cutting-edge, transformative, multifaceted, pivotal, dynamic, comprehensive, tapestry, landscape, beacon, realm, journey, furthermore, moreover, "in today's fast-paced", "I hope this email finds you well".
- **Syntax fingerprints (survive find-and-replace):** "it's not X, it's Y", rule-of-three padding, copula avoidance ("serves as" for "is"), em dashes.
- **Specificity is the cheapest humaniser.** Real numbers, names and dates. Pull one real metric from the brand's own data into every email.
- **Workflow:** human strategy → AI draft → human edit. High-personality formats (founder letter, welcome): rough human notes first, AI tightens. Never AI-first.

### 5. AI EMAIL DESIGN PROTOCOL

AI defaults to competent and generic; force it off its defaults.

- **Two readers: the human and the summariser.** Gmail's Gemini and Apple Intelligence summarise from the opening live text (rollout tiered). Front-load the offer in real text, semantic headings, never image-only; live text also wins accessibility and dark mode.
- **Context beats prompt.** Feed brand kit, design tokens, a tested module library and a rules file before iterating on wording.
- **Safe substrate.** Emit MJML, React Email or Maizzle (compile to inbox-safe HTML), never raw HTML from a prompt.
- **Anti-slop design rules:** own one colour (30-60% of the surface); restraint over decoration; real photography, never AI stock; bold live-text headlines; one message, real negative space. Ban the purple-to-blue gradient and the beige wash.
- **Compliant by default:** single column ≤600px, 44px tap targets, `role="presentation"` tables, dark-mode-safe colours (~#121212, never pure #000 backgrounds or #fff logos), alt text everywhere, explicit text and button colours.

**Direct the agent: Discover, Define, Deliver.** Adapted for email from Anshu Chimala, "How to turn your AI into a world-class designer" (Lenny's Newsletter, 1 Sep 2026, https://www.lennysnewsletter.com/p/how-to-turn-your-ai-into-a-world) via the design-director skill (command, counts and brief format are the skill's). LLMs predict the median; divergence has to come from outside the model.

- **Seed strings.** The agent generates a random string in a shell (`openssl rand -base64 48`), derives palette, layout and type from its patterns, never reveals it; new string per direction.
- **Broad before deep.** Ask for 12-20 directions as one-liners, "go broad, not deep". The human picks from text before any image or code exists. Reject anything guessable from the category alone.
- **Ambitious briefs.** One sentence naming a real reference (Graza's chartreuse drench, Aesop's restraint) plus two anti-references.
- **The critic loop.** Screenshot the rendered test send and hand it to a separate, stronger model in a fresh context (no code, history or earlier critiques). It names the aesthetic, imagines how a top studio would execute it, lists the biggest gaps and scores /10. Fix, re-screenshot, re-critique with the same prompt (target score kept out of it) until the critic scores 9/10, capped at four rounds. The critic is ~10% of output tokens and most of the taste.
- **Chain models.** Code model for structure, image model for stills, video model for a looping hero or state transition. As of Sep 2026 (verify): Claude Fable 5.1 as critic; Claude Opus 5 or Sonnet 5 (Claude Code) or GPT-6 Astra (Codex CLI) as implementer; gpt-image-2 for stills; Gemini Omni 1.1 for video.
- **Deliver by subtraction.** Cut glows, gradients, decorative containers and labels that repeat the visual, then a light anti-slop pass on copy (§4) and visuals (reflex fonts, centred hero + three cards, purple on dark).
- **Keep failed prompts**; retest on the next model generation.
- **Who to follow** (Chapter 18, 49 practitioners, five added in v2.7): Anshu Chimala @anshuc, Karri Saarinen @karrisaarinen, Ryo Lu @ryolu_, Jenny Wen @jenny_wen, Lee Munroe @leemunroe.

## Part B: Reference

### 6. FUNDAMENTALS & METRICS

Owned media at ~$36 per $1; 5K engaged beats 50K messy; flows before campaigns.

**Open rate is noise.** MPP pre-loads pixels and Gmail/Apple summaries auto-open mail (opens inflate while CTR falls). Judge on clicks, replies, conversions and revenue per recipient; label open-only reads low-confidence; never compare opens across ESPs.

| Metric | Good | Strong | Red flag |
|---|---|---|---|
| Click-through rate | 2-3% | 4%+ | <1% |
| Click-to-open rate | 10-15% | 20%+ | <5% |
| Unsubscribe rate | <0.2% | <0.1% | >0.5% |
| Bounce rate | <2% | <1% | >3% |
| Spam complaint rate | <0.1% | <0.05% | >0.3% |
| List growth rate | 3-5%/mo | 5%+/mo | Negative |
| Inbox placement | 85-94% | 94%+ | <70% |

**Lists vs tags vs segments:** one master list; tags are facts; segments are dynamic rules. Minimum segments: new (30d), engaged (clicked 60d), customer vs non-customer, lapsed (90d+).

### 7. CORE FLOW RECIPES (the revenue engine)

Flows out-earn campaigns ~30x per recipient. Build in this order (you specify trigger → wait → condition → send; the agent scaffolds; you review):

Welcome → Abandoned cart → Browse abandonment → Post-purchase → Win-back → Cross-sell → VIP → Sunset → Birthday → Replenishment → Back-in-stock → Price drop.

- **Welcome (4-6):** promise + reply ask + one segmenting question → brand story → social proof → best content by answer → soft sell → expectations. 51-55% opens.
- **Abandoned cart (3):** reminder, no discount (1-4h) → objections: reviews, shipping, guarantee (24h) → small incentive if margins allow, first-timers only (48h). ~17% recovery.
- **Post-purchase:** confirm → shipping → satisfaction check → review → cross-sell → replenishment.
- **Win-back (60-90d inactive):** "we miss you" → value offer → breakup (highest reply) → confirm + resubscribe.
- **BFCM:** build list (Sep-Oct) → warm volume (Oct-early Nov) → tease (2-3 wk out) → daily sends, engaged first → post-BFCM thanks, cross-sell, shipping deadline.
- **Consistency beats perfection:** a 20-minute weekly (Liz Wilcox) or 2-3 short sends beat one polished monthly (Ian Brodie).

### 8. COPYWRITING REFERENCE

- **Subject lines** decide the open: under ~25 chars opens highest; lowercase casual can beat title-case (~14%); first-person CTA beats second-person.
- **Body:** inverted pyramid, short paragraphs, write then cut 30%. 3:1 value-to-promo.
- **Frameworks:** AIDA (promo) · PAS (cold/B2B) · BAB (case studies) · Soap Opera Sequence (narrative) · 1-3-1 newsletter (one story, three items, one CTA).
- **CTAs:** buttons beat text links (+27%); one CTA beats several (+42%); above the fold and below the main content.

### 9. SEGMENTATION & LIST BUILDING

- **Personalisation hierarchy (high → low):** behavioural → lifecycle stage → dynamic blocks → send time → location → name. Above all: agent-generated 1:1 content from real behavioural data (clean data first; draft-and-approve).
- **Segments from natural language:** let the agent build the rules, then verify against actual counts before sending. A segment that jumps 10x between runs is a bug until proven otherwise.
- **Engagement-based sending (highest-impact lever):** clicked 30d → every send; 60d → 75%; 90d → best only; 90-180d → re-engagement only; 180d+ → sunset. Opens +15-30%, complaints -20-40%, revenue holds or rises.
- **List building:** lead magnets (templates convert best) · content upgrades (5-10x sidebar forms) · forms beat links (+20-50%). Popups 3-5% (top decile ~9%); exit-intent 4-7%; two-step beats one-step. Double opt-in for lead magnets, single for purchasers.
- **Hygiene:** lists decay 22-30%/yr. Sunset: reduce frequency → 2-3 re-engagement emails → suppress. Trap prevention: double opt-in, real-time validation, engagement-based sending.

### 10. ANALYTICS & MEASUREMENT

- **KPIs by type:** welcome → conversion/RPR (2.5x baseline) · cart → recovery/RPR ($3+ top decile) · promo → revenue/CTR (2-5%) · nurture → CTOR (>12%) · cold → positive reply (3-5%) · newsletter → clicks/replies.
- **Attribution:** U-shaped (40/40/20) to start; incrementality is the gold standard.
- **Ask your data** through MCP instead of building dashboards; AI for anomaly flags and A/B readouts.
- **Frequency:** track revenue per email sent. Ecommerce 2-4/wk to engaged; newsletter 1-3/wk; SaaS B2B 1-2/wk.

### 11. DELIVERABILITY TRIAGE

**Authentication (all required):** SPF (end `-all`, 10-lookup limit) · DKIM (2048-bit, rotate yearly, aligned) · DMARC (p=none → quarantine → reject; **Outlook: SPF, DKIM and aligned DMARC (p=none minimum) at 5K+/day, else a 550**). BIMI/VMC pays off once you have enforcement + a trademark.

**Reputation:** domain beats IP for Gmail (120-day memory). Dedicated IP only at 1M+/month. Separate marketing and transactional subdomains at 40K+/month.

**Diagnosis path:** symptom → auth → blocklists → reputation → bounce logs → sending patterns → content → test → fix root cause → monitor (2-4 weeks, Gmail up to 120 days).

**Thresholds with actions:**
- Complaint rate ≥0.1%: pause broad sends, restrict to clicked-30d, inspect acquisition source and expectation mismatch, confirm unsubscribe visibility.
- Engagement is a primary signal: auto-sunset the chronically unengaged.
- "Low bounce" ≠ "safe": consent and engagement signals can suspend an account at 0.1% bounce.

**AI-era deliverability:** Gmail's Gemini re-ranks Promotions and previews from the **first ~150-200 characters of live text**, overriding your preheader. Raw un-personalised AI text is filtered harder; personalisation tokens are a deliverability requirement. Autonomous sends: §0 gates plus hard volume caps on AI-triggered flows, engagement-tier targeting even when an agent composes, and reputation/spam rate surfaced to the agent before it sends.

**Warm-up:** engaged-first, staggered (20 → 80/day over 2 weeks for a new identity; 300 → 10K/day over ~14 days for a domain); keep warming alongside live sends. Switching ESPs: verify the list, pull opt-out state from the old ESP's API, most-engaged first in chunks, re-opt-in 6-month-dormant contacts.

### 12. TESTING & OPTIMISATION

- Highest-value tests: sender name (compounds), CTA format, template structure. ~1 in 7 tests yields a winner; use 95% confidence; test flows over campaigns.
- **AI-assisted email:** guard against homogenisation; test it explicitly on reply rate and Primary-tab placement, never opens.

### 13. COMPLIANCE GATES

Before any send: (1) type (transactional/lifecycle/marketing/newsletter/cold)? (2) recipient region? (3) consent basis? (4) unsubscribe + physical address? (5) suppressions applied? (6) content materially accurate? Any unclear answer: refuse or ask.

| Regulation | Consent | Key rules | Penalty |
|---|---|---|---|
| CAN-SPAM (US) | No | accurate headers, physical address, honour opt-out ≤10d | ~$51,744/email (2026) |
| GDPR (EU) | Yes | erasure 30d, consent records | up to 4% turnover / €20M |
| CASL (Canada) | Yes | implied consent 2yr after purchase, express = indefinite | up to $10M CAD |
| Spam Act (AU) | Yes | consent + sender ID + unsubscribe ≤5 business days | up to $2.22M AUD/day |

One-click unsubscribe (RFC 8058) required at 5K+/day to Gmail/Yahoo/Microsoft; honour within 48h. **AI does not transfer liability:** you own an agent's sends; never trust it to preserve the unsubscribe or footer when it edits a template. Cold email: B2B legal without consent in US/UK, consent required in Canada/Australia.

### 14. COLD EMAIL

- **Infrastructure:** never your primary domain. Separate domains, warm 2-4 weeks, 10-30/inbox/day, a dedicated cold tool kept legally and technically apart from marketing.
- **Writing:** 50-125 words. Personalised opening → observation → value → soft interest-based CTA (2-3x the replies of a meeting ask).
- **Follow-up:** 4 emails over 2-3 weeks, each adding value; the breakup gets 2-3x the reply rate.
- **AI in outbound:** prospecting and personalisation (2-3x reply vs templates) plus reply handling, under the same domain, suppression and consent guardrails. Founder-led 1:1 from a real inbox still beats cold blast on B2B reply and deliverability.

### MESSAGING CHANNELS: WHATSAPP, SMS & RCS

**WhatsApp Business.** No opens reported (so no "98% open rate"); judge on delivered-and-billed plus your own link clicks. Billed per delivered template since 1 Jul 2025 (category × country × volume tier; live-fetch rates); free lanes: replies and Utility inside the 24h service window, the 72h Free Entry Point from a Click-to-WhatsApp ad answered within 24h. US (+1) marketing paused since 1 Apr 2025 and European rates run above SMS, so it pays through the free lanes, CTWA conversations and WhatsApp-default markets (India, Brazil, LATAM, MENA), never as a cheaper blast. Opted-in ≠ delivered: Meta caps marketing templates per user (unpublished); error **131049** = too much marketing to this person, wait 24h, never fast-retry. Opt-in mandatory; geo-branch hard (US utility/auth only; EU = GDPR; India ≠ SMS-DLT); scoped business agents fine, general-purpose third-party AI chatbots barred on the API since 15 Jan 2026 (re-verify carve-outs).

**SMS (US).** TCPA prior express *written* consent for marketing ($500-$1,500/message); 8am-9pm recipient-local quiet hours; **10DLC** brand + campaign registration (necessary, not sufficient: content, SHAFT, links and volume are still filtered); CTIA STOP/HELP. Confirm by jurisdiction. SMS is the time-sensitive nudge (cart, back-in-stock, last chance) as a step inside high-intent email flows, never a duplicate broadcast; "great" conversion is ~2%, not the folklore 21-30%.

**RCS.** Testable in the US with mandatory SMS fallback; reach depends on carrier and provider provisioning. RBM (brand-sent) lacks person-to-person RCS's end-to-end encryption, so never claim it. Launch: agent vetting, reach check, fallback copy, rich-card degradation, opt-out handling, one measurement scheme across RCS and fallback.

**Unified consent:** per channel and category, read before any send; SMS and WhatsApp need explicit prior opt-in, email's floor in some regions is opt-out, consent never travels across channels; quiet hours, frequency caps and suppression apply per channel.

### 15. PLATFORM SELECTION

Factors: ecommerce depth · event/data model · **agent interface (MCP or app vs dashboard-only; AI-native vs bolted-on; multi-brand)** · deliverability + warm-up controls · consent/suppression controls · approval workflows + audit logs · transactional separation · cost at projected list size. Choose for 12 months out.

| Platform | Best for | Notes |
|---|---|---|
| Klaviyo | Shopify ecommerce | deep data; Composer builds from a prompt, human-gated |
| Mailchimp | Small business | app in Claude and ChatGPT |
| Customer.io | Lifecycle/B2C | AI Agent + LLM Actions |
| ActiveCampaign | Automation-heavy | early MCP/connector |
| HubSpot | B2B inbound | Breeze agents |
| Kit | Creators | in-app AI chat; free tier |
| Brevo | Multichannel | email + SMS; volume pricing |
| beehiiv | Newsletters | official MCP; ad network |
| Omnisend | Ecommerce multichannel | MCP + ChatGPT app |
| Resend | Developers/transactional | React Email + AI editor |
| Iterable | Enterprise lifecycle | open-source MCP, read-only by default |
| Postup | Enterprise/publishers | publisher-grade, not prompt-driven |
| Bento | Developers/SaaS | API-first; Ask vs YOLO autonomy + undo |
| **Nitrosend** | AI-native teams | MCP-first, no dashboard needed; runs from Claude, ChatGPT, Codex, Gemini or Cursor; approval + test gates built in. Disclosure: shares a founder with this guide. |

Agent-first with no dashboard: Nitrosend. Dashboard-first ecommerce or publisher tooling: Klaviyo or Postup.

### 16. EMAIL DESIGN: DECISION TABLE

47 curated 2026 designs, one rule: personality, restraint and point of view beat generic polish. Pick an archetype and commit; never minimal-lux by reflex.

| Situation | Archetype | The one rule | Exemplars |
|---|---|---|---|
| Boring category | Bold mono / punk | the more boring the product, the wilder the voice | Liquid Death, Frank Body |
| Premium | Minimal-lux | restraint signals quality; never discount-led; 472-520px | Aesop, Apple, Stripe |
| Visual product | Lookbook | the product is the design, full-bleed editorial photo | Dior, Clare Paint |
| Newsletter | Editorial | voice beats design; sell the moment | Patagonia, Tracksmith |
| Welcome / win-back | Founder letter | plain-text feel, first person, ask for a reply | Ugmonk, Superhuman |
| Cart abandonment | Conversation | objections in sequence or founder-personal; discount last | Tuft & Needle, Alo Yoga |
| Transactional | Brand moment | your most-opened email; design it | Stripe, Omsom |

Also: narrow width, one font family, personalise with unexpected data. Feed the collection to the agent as design context.

> Collection: https://emailmarketingskill.com/19-best-email-designs-2026/ · Repo: https://github.com/CosmoBlk/bestemaildesigns · Figma: https://www.figma.com/community/file/1626130771879679378

### 17. INDUSTRY PLAYBOOKS (19 verticals)

**Ecommerce DTC:** email = 25-40% of revenue; welcome, cart, post-purchase first; the profit sits in the flows nobody watches. **SaaS B2B:** behaviour-based onboarding, one CTA per email. **SaaS B2C:** re-engage at 7 days inactive. **Newsletter/Creator:** inflection ~10K subs; sponsorships → paid → affiliates → products; referral programmes grow 30-40% faster. **Nonprofit:** 3:1 value-to-ask; mission storytelling; start year-end in November. Plus Agency, Healthcare, Financial, Real Estate, Travel, Education, Professional Services, Retail, Events, B2B Manufacturing, Restaurant, Fitness, Media and Marketplace in the chapter.

### APPENDIX: BENCHMARKS (mid-2026)

**By industry** (open / CTR / unsub): Ecommerce 15-20% / 2-3% / 0.2% · SaaS 20-25% / 2-3% / 0.2% · Financial 20-25% / 2.5-3.5% / 0.15% · Healthcare 20-25% / 2-3% / 0.15% · Education 25-30% / 3-4% / 0.1% · Nonprofit 25-30% / 2.5-3.5% / 0.1% · Media 20-25% / 4-5% / 0.1% · Retail 15-20% / 2-3% / 0.2%. Opens directional only (§6).

**By email type** (open / CTR): Welcome 50-60% / 5-8% · Cart 40-50% / 5-10% · Transactional 60-80% / 5-15% · Promotional 15-20% / 2-3% · Newsletter 20-30% / 3-5% · Win-back 10-15% / 1-2%.

**ROI per $1:** Email $36-42 · SMS $20-25 · SEO $15-20 · Paid social $2-5.

**Thresholds:** bounce healthy <2% / critical >5% · complaint healthy <0.05% / critical >0.1% · unsub healthy <0.3% / critical >0.5% · list growth healthy >2%/mo.

**Frequency:** Ecommerce DTC 3-5x/wk · SaaS B2B 1-2x/wk · Newsletter daily-3x/wk · Nonprofit 1-2x/mo · Retail 3-5x/wk.

### CHAPTER SLUGS (https://emailmarketingskill.com/<slug>/)

01-fundamentals · 02-building-your-list · 03-segmentation-and-personalisation · 04-the-emails-that-make-money · 05-copywriting-that-converts · 06-design-and-technical · 07-deliverability · 08-testing-and-optimisation · 09-analytics-and-measurement · 10-compliance-and-privacy · 11-industry-playbooks · 12-choosing-your-platform · 13-cold-email-and-b2b-outbound · 14-whatsapp-business · 15-sms-and-rcs · 16-ai-and-agentic-marketing · 17-company-case-studies · 18-expert-directory · 19-best-email-designs-2026 · appendix-a-benchmarks · appendix-b-frequency-guide · appendix-c-calendar · appendix-d-methodology

## Examples

### Example 1: Audit an account

```text
Audit my Klaviyo account for a DTC skincare brand doing $2M a year. What am I missing?
```

Expected: a read-only pass over lists, flows and recent campaigns, then a prioritised gap list against the flow build order in section 7 and the metric thresholds in section 6. No writes.

### Example 2: Diagnose a deliverability drop

```text
My emails are landing in Gmail promotions and opens dropped from 22% to 14%. What is going on?
```

Expected: the section 11 diagnosis path (authentication, blocklists, reputation, bounce logs, sending patterns, content), a note that opens are noisy (section 6), and fixes with a 2-4 week monitoring plan.

### Example 3: De-slop a draft

```text
Here is a draft welcome email. Make it sound like a person, not an AI.
```

Expected: the section 4 protocol (one real opinion, burstiness, blacklist lint, syntax fingerprints, one real number) and a tightened draft with the changes listed.

### Example 4: Stage a campaign without sending

```text
Build next Tuesday's newsletter for engaged subscribers in our ESP, but do not send it.
```

Expected: a draft only, a verified segment count, the section 3 checklist and the pre-send packet. The send waits for an explicit "send it".

## Best Practices

- Do read the account before writing, and verify every AI-built segment against actual counts.
- Do build flows before campaigns, in the section 7 order.
- Do judge results on clicks, replies, conversions and revenue per recipient; treat opens as directional.
- Do keep transactional, marketing, lifecycle and cold outbound on separate rules and domains.
- Don't send or schedule to more than one recipient without explicit approval in the conversation.
- Don't probe unknown `/send`, `/dispatch`, `/trigger`, `/fire` or `/publish` endpoints on a live audience.
- Don't ship raw LLM copy, or raw HTML generated straight from a prompt.

## Limitations

- This is guidance, not a sending tool. Actions run through the ESP's own MCP server, connector or API, under that tool's permissions.
- Benchmarks, penalties, platform features, WhatsApp pricing and model names are mid-2026 figures and change; verify volatile facts before acting.
- Not legal advice. The compliance tables summarise CAN-SPAM, GDPR, CASL, the Australian Spam Act, TCPA and WhatsApp policy; confirm edge cases by jurisdiction.
- The field notes in section 2b come from running Nitrosend; map Nitrosend-specific mechanics (`if_version`, brand selection) to your ESP's equivalents.
- It does not replace a test send in a real inbox, or human ownership of brand voice, strategy and the final send.
- Stop and ask when the consent basis, audience, sender or approval is unclear.

## Security & Safety Notes

- `risk: critical` because the skill guides agents that create segments, flows and campaigns and can stage sends on live ESP accounts.
- Hard gate: no send or schedule to more than one recipient without explicit human approval in the current conversation; single-recipient test sends still need a yes.
- Block the send if authentication is missing, the unsubscribe link or physical address is absent, complaint rate is at or above 0.1%, consent is unclear, or the audience includes suppressed, bounced or complained contacts.
- Never probe unknown mutating endpoints on a live audience; test on sandboxes or cloned campaigns with seed lists.
- Keep ESP API keys out of prompts, templates and logs; use the ESP's MCP authentication or environment configuration.
- Log every autonomous action (segment changed, flow edited, campaign created, send staged) so a human can audit it.
- The only shell command in the skill is `openssl rand -base64 48`, a local random seed string for design divergence; it makes no network calls.

## Common Pitfalls

- **Problem:** A natural-language segment comes back 10x larger than expected.
  **Solution:** Treat it as a bug; check the rules and counts before any send (section 9).
- **Problem:** The agent's MCP context silently resets to a default brand or account after idle.
  **Solution:** Re-assert brand and account before every write batch (section 2b).
- **Problem:** An API with silent parameters defaults to send-to-all.
  **Solution:** Pre-flight assert the audience id and count, and never probe a mutating endpoint on a live audience.
- **Problem:** Opens jump while clicks fall.
  **Solution:** Apple MPP and inbox summaries auto-open mail; judge on clicks and revenue (section 6).
- **Problem:** Migrated contacts get mailed after unsubscribing.
  **Solution:** Pull opt-out state from the old ESP's API, never a CSV export.

## Related Skills

- `@email-sequence` - Drafting a single nurture sequence in depth.
- `@cold-email` - Focused B2B cold outreach copy; this skill covers the infrastructure and compliance around it.
- `@copywriting` - Landing page and general marketing copy beyond email.
- `@klaviyo-automation` - Klaviyo operations through Rube MCP; pair it with the gates here.
- `@mailtrap-sending-emails` - Mailtrap sending setup for transactional and bulk streams.

## Additional Resources

- [Email Marketing Bible, the full 19-chapter guide](https://nitrosend.com/email-marketing-bible)
- [Source skill repository (MIT)](https://github.com/CosmoBlk/email-marketing-bible)
