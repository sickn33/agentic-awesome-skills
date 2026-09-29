---
name: brand-growth-system-builder
description: 'Route requests across 13 brand and growth modules. Use when an SME needs help choosing branding, website, local SEO, content, or cloud-planning workflows.'
category: business
risk: safe
source: self
source_type: self
date_added: "2026-09-27"
author: WHOISABHISHEKADHIKARI
tags: [sme, brand, design-system, logo, print, website, gbp, local-seo, backlinks, citations, email, deck, social-media, code-of-conduct, observability, cloud, wcag, seo]
tools: []
source_repo: WHOISABHISHEKADHIKARI/sme-ops-system-builder
---

# Brand & Growth System Builder

Router for 13 brand and growth modules: the design theme, the logo and image library, the
print brand kit, the business website, the Google Business Profile, the backlink and
citation directories, the email templates, the presentation deck, the social channels, the
professional code of conduct, the observability and cloud plan, and the free design
resource map.

The 13 modules are published flat, as siblings at `skills/<slug>/`. This pack is a router
and a catalog and holds no modules of its own; it only places a request on the dependency
order and names the module to load.

It works out what the business actually needs, then hands off to the one module skill that
matches. It never builds anything itself.

## Overview

A small business does not need 13 brand systems. It needs the two or three that make
someone pick it: a theme it can build against, a profile Google can rank, and one asset
set it does not re-make every month. This skill identifies the intent, asks only what is
still missing one question at a time, stops as soon as the answers stop changing the
route, then recommends two or three modules and waits for the user to pick.

Each module skill then runs the same contract: context first, a recommendation, and
artifacts only on request. This skill never emits a schema, a CSV, a token file or a
Notion template.

## When to Use This Skill

- "Set up our branding and website"
- "I need a Google Business Profile that ranks"
- "Where do I list my business for backlinks?"
- "Design a logo, letterhead and visiting card"
- "Set up our Facebook, LinkedIn and TikTok"
- "I need a code of conduct and email templates"
- "Plan our cloud spend and monitoring"

Do not use it when the user has already named one specific asset and just wants it - go
straight to that module skill.

## How It Works

Follow the shared execution contract. The module-specific rules below define only domain fields, decisions, calculations, and safety constraints.

### Step 1 - Identify intent

Read the request and pick the intent before asking anything.

- "set up" / "build" / "create" -> artifacts wanted; go to Step 2.
- "review" / "is this right" / "audit" -> a check, not a build; answer from what they share.
- "how do I ..." -> advice question; answer directly, offer the build only if it helps.
- "fix" -> something already exists and is wrong; capture the current state, then Step 2.

### Step 2 - Ask only what is missing

One question per message. Skip anything already answered in any earlier message. The five
groups below are the only intake; take only the ones that change the answer.

- **Business** - What does the business do, in one line? / Who is the customer? / Physical
  address customers can visit, or service-area only? / City, country.
- **Brand** - Name as it must appear everywhere, spelling included? / One primary colour
  already decided? / Any logo, colours or documents in use today?
- **Digital** - Is there a website today, on which platform? / Who writes the copy? / Any
  social accounts already open?
- **Reach** - How many people, and how many locations or staff? / One office or several?
  / B2B, retail, service or mixed?
- **Outcome** - What has to exist in 30 days? / Who signs off on brand decisions?

Never invent a business fact. Names, addresses, phone numbers, colours, domains and
follower counts that the user has not supplied are `Unknown` and stay that way.

### Step 3 - Hold the internal context

```yaml
module: brand-growth-system-builder
intent: null            # set up | fix | review | report | import
scale: null             # Starter | Growth | Scale, only if it changes the answer
areas:
  "Business": null
  "Brand": null
  "Digital": null
  "Reach": null
  "Outcome": null
requested_outputs: []
confirmed_facts: []
open_questions: []
```

### Step 4 - Recommend two or three modules

Pick the smallest set that gets to a live profile and a usable asset set. Rank them by
what unblocks the rest. Then stop and wait for the user to choose. Examples of the shape
of a route:

- Nothing exists: `design-theme-guide` -> `gbp-local-seo-intent` -> `business-website-setup`
- Profile live, no assets: `logo-image-design` -> `brand-kit-print-collateral` -> `linktree-link-hub`
- Website live, not ranking: `gbp-local-seo-intent` -> `seo-directory-backlinks` -> `presentation-deck`
- Team growing: `code-of-conduct` -> `business-email-template` -> `observability-cloud-planning`

### Step 5 - Never build here

This router produces no files. When the user picks a module, read its sibling SKILL.md and continue the requested work. Each module
skill owns its own artifacts and its own field list.

For Notion, read the selected module and then the Notion helper. Manual artifacts need
no connection; live workspace changes follow the shared execution contract.

## Examples

**Prompt**

```
We are launching a local service business. We need a consistent identity, a website,
and a Google Business Profile, but nothing exists yet.
```

**Route**

```
design-theme-guide -> logo-image-design -> gbp-local-seo-intent
```

## The Dependency Order

Brand decisions travel one way. Nothing later can be built before the token set exists,
and nothing visual can be finalised before the logo does.

```
free-design-resources          (read-only research, safe to start at any time)
        |
design-theme-guide             (tokens: colour, type, space, contrast)
        |
logo-image-design              (mark, lockups, image library)
        |
brand-kit-print-collateral     (letterhead, visiting card, employee card, signature)
business-email-template        (templates + SPF/DKIM/DMARC)
linktree-link-hub              (single destination for every bio link)
        |
business-website-setup         (site structure, schema, NAP on every page)
gbp-local-seo-intent           (profile, categories, services, posts, reviews)
seo-directory-backlinks        (citations, directories, link profile)
social-media-setup            (Facebook, LinkedIn, TikTok, Facebook Page)
presentation-deck              (the 10-slide story built from all of the above)
        |
code-of-conduct                (independent, but needs the real role names)
observability-cloud-planning   (independent, needs real cost ceilings)
```

**Category map** - the modules are published flat, as siblings at
`skills/<slug>/`, not under this pack. Their categories describe the workflow
stage rather than adding a directory level. Counts are the 13 modules this
router hands off to.

## Module Catalog

### Layer 1: Foundation

The licensed inputs everything else is built from. Consult before an asset is made.

| Module | Code | Fits | Fields | Skill |
|---|---|---:|---:|---|
| Free Design Resources | - | Starter | 18 | `skills/free-design-resources/SKILL.md` |

### Layer 2: Brand Design

Tokens, then the mark, then what gets printed. This layer is upstream of all the others.

| Module | Code | Fits | Fields | Skill |
|---|---|---:|---:|---|
| Design Theme Guide | - | Starter | 24 | `skills/design-theme-guide/SKILL.md` |
| Logo & Image Design | - | Starter | 20 | `skills/logo-image-design/SKILL.md` |
| Brand Kit & Print Collateral | - | Starter | 23 | `skills/brand-kit-print-collateral/SKILL.md` |

### Layer 3: Acquire

Being found. The profile, the pages and the citations have to agree with each other.

| Module | Code | Fits | Fields | Skill |
|---|---|---:|---:|---|
| Business Website Setup | - | Growth | 24 | `skills/business-website-setup/SKILL.md` |
| GBP & Local SEO Intent | - | Starter | 26 | `skills/gbp-local-seo-intent/SKILL.md` |
| SEO Directories & Backlinks | - | Growth | 22 | `skills/seo-directory-backlinks/SKILL.md` |
| Link-in-Bio Hub | - | Starter | 16 | `skills/linktree-link-hub/SKILL.md` |

### Layer 5: Fulfil

The page register is the only module in this layer, and it is the handoff between brand and
acquire: it records what each page is for so the citations have something to point at.

### Layer 6: Engage

The channels that carry the identity outward.

| Module | Code | Fits | Fields | Skill |
|---|---|---:|---:|---|
| Business Email Templates | - | Starter | 22 | `skills/business-email-template/SKILL.md` |
| Presentation Deck | - | Growth | 18 | `skills/presentation-deck/SKILL.md` |
| Social Media Setup | - | Starter | 22 | `skills/social-media-setup/SKILL.md` |

### Layer 7: Protect

The rule, and the evidence that it was read and followed up.

| Module | Code | Fits | Fields | Skill |
|---|---|---:|---:|---|
| Professional Code of Conduct | - | Starter | 17 | `skills/code-of-conduct/SKILL.md` |

### Layer 8: Operate

What is critical, what is measured, and what wakes a human.

| Module | Code | Fits | Fields | Skill |
|---|---|---:|---:|---|
| Cloud and Observability Planning | - | Growth | 24 | `skills/observability-cloud-planning/SKILL.md` |

### Working categories

The 13 arrived under 8 working categories. They are published flat at `skills/<slug>/`,
so this grouping is recorded in the catalog rather than in a directory level.

| Working category | Modules | Count |
|---|---|---:|
| Foundation & reference | `free-design-resources` | 1 |
| Brand design | `design-theme-guide`, `logo-image-design`, `brand-kit-print-collateral` | 3 |
| Visibility & listings | `business-website-setup`, `gbp-local-seo-intent`, `seo-directory-backlinks`, `linktree-link-hub` | 4 |
| Channels & content | `business-email-template`, `presentation-deck`, `social-media-setup` | 3 |
| Governance | `code-of-conduct` | 1 |
| Operations | `observability-cloud-planning` | 1 |

### Build order

| # | Module | Depends on |
|--:|---:|---|
| 1 | Free Design Resources | - |
| 2 | Design Theme Guide | Free Design Resources |
| 3 | Logo & Image Design | Design Theme Guide |
| 4 | Brand Kit & Print Collateral | Logo & Image Design |
| 5 | Business Website Setup | Design Theme Guide |
| 6 | GBP & Local SEO Intent | Business Website Setup |
| 7 | SEO Directories & Backlinks | GBP & Local SEO Intent |
| 8 | Link-in-Bio Hub | Business Website Setup |
| 9 | Business Email Templates | Brand Kit & Print Collateral |
| 10 | Presentation Deck | Logo & Image Design |
| 11 | Social Media Setup | Link-in-Bio Hub |
| 12 | Professional Code of Conduct | - |
| 13 | Cloud and Observability Planning | - |

### Overall brand flow

| # | Module | Records |
|--:|---:|---|
| 1 | Free Design Resources | the licensed inputs available |
| 2 | Design Theme Guide | the tokens every asset inherits |
| 3 | Logo & Image Design | the mark, its lockups and the rights |
| 4 | Brand Kit & Print Collateral | the printed items derived from the mark |
| 5 | Business Website Setup | the page register and its SEO fields |
| 6 | GBP & Local SEO Intent | the profile elements and the searches they match |
| 7 | SEO Directories & Backlinks | the citations that must agree on NAP |
| 8 | Link-in-Bio Hub | the destinations posts and bios point at |
| 9 | Business Email Templates | outbound mail and its deliverability records |
| 10 | Presentation Deck | the ten-slide story with sources and sensitivity |
| 11 | Social Media Setup | the channels and the posting plan |
| 12 | Professional Code of Conduct | the policy version and the acknowledgements |
| 13 | Cloud and Observability Planning | what is critical and what wakes a human |
| 14 | Overall Brand Flow | this router, `brand-growth-system-builder` |

Three read-only evidence files sit behind the catalog -
`../../references/free-design-resource-map.md`, `../../references/print-brand-kit-specs.md`
and `../../references/backlink-directory-master-list.md`. Load one only when the module that
needs it is the module being run.

## Rules Every Module Holds To

- One name, one spelling, one phone number, one address, everywhere - the NAP rule. A
  variation is a defect, not a local preference.
- A design system is tokens first, components second, and never a one-off. If it is not
  written as a value, it is not part of the system.
- Contrast is a test, not an opinion. Body text 4.5:1, large text and UI components 3:1,
  per WCAG 2.2 AA - and the ratio gets recorded in the token file.
- A Google Business Profile is a completeness and accuracy problem before it is a keyword
  problem. Nobody can buy a better local rank.
- Never keyword-stuff the business name. Use the real name, and put the keywords in the
  description, the services and the posts.
- A directory link is worth nothing without a real listing. A fake listing is a liability.
- Never invent a business fact, a NAP value, a metric, a benchmark or a score.
- Selection, sign-off and legal conclusions stay with a human.

## Owner and Cadence

- Owner: whoever owns the brand and the website. Small businesses usually fold this into
  the founder or an operations lead.
- Cadence: the router runs per request. Each module reviews itself when the business
  changes - new location, new service, rebrand, headcount growth - not on a fixed date.

## Best Practices

- Start with the dependency that unlocks the requested downstream assets.
- Keep every recommendation tied to a confirmed business need.
- Run one module intake at a time and let that module own its artifacts.
- Keep unknown business facts unknown rather than filling them with plausible values.

## Limitations

- It routes work but does not create brand assets or operational records itself.
- It cannot guarantee rankings, directory approval, legal compliance, or platform availability.
- Local advertising, privacy, accessibility, and employment requirements need human review.
- The catalog is intentionally SME-focused and is not a full enterprise brand platform.

## Security & Safety Notes

- Do not request credentials, unpublished customer data, or unnecessary personal information.
- Treat domains, social accounts, DNS, analytics, and cloud resources as external systems that
  require explicit authorization before mutation.
- Never publish invented contact details, addresses, testimonials, metrics, or legal claims.
- Human approval is required before publishing, purchasing, changing DNS, or enabling services.

## Common Pitfalls

- Two modules look equally right - pick the one the others depend on, and say why.
- The user asks for everything at once - propose the first three, in the order above, and
  build those before the rest.
- The user has no logo yet but wants print collateral - route to `logo-image-design` first;
  letterhead without a mark is a rewrite later.
- GBP needs an address the business does not physically occupy - that is a service-area
  business, and the module records it as such. Never advise a virtual address for ranking.
- Social is requested before the website exists - acceptable for a launch page, but the
  module says the website is still the ranking asset.

## Related Skills

- [Module Catalog](https://github.com/sickn33/agentic-awesome-skills/blob/main/CATALOG.md) - find other operational modules.
- @accounting-audit-system-builder - the 16-module accounting cycle this pack feeds.
- `@company-email-accounts` (operational pack) - the account register behind the email
  templates in `business-email-template`.
- `@asset-it-management` (operational pack) - holds the issued laptops, cards and devices
  that carry the brand kit.

## Reusable Prompt

```
I want to set up the brand and online presence for my small business. Ask me one short
question at a time, only about what I have not already told you, and never invent
anything about my business. Then recommend the two or three modules that matter first, in
the order they depend on each other, and wait for me to pick before you build anything.
When I pick a module, output only the artifacts I asked for.
```
