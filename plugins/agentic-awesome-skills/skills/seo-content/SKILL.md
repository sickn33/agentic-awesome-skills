---
name: seo-content
description: >
  Content quality and E-E-A-T analysis with AI citation readiness assessment.
  Use when user says "content quality", "E-E-A-T", "content analysis",
  "readability check", "thin content", or "content audit".
risk: critical
source: "https://github.com/AgriciDaniel/claude-seo"
date_added: "2026-03-21"
user-invokable: true
argument-hint: "[url]"
allowed-tools:
  - Read
  - Grep
  - Glob
  - Bash
  - WebFetch
---
## Supporting material availability

This catalog copy contains the inline guidance below, but does not include the following supporting paths. They are external prerequisites, not bundled files:

- `seo/references/eeat-framework.md`

Obtain the required material from the [declared upstream source](https://github.com/AgriciDaniel/claude-seo), or from a user-provided installation of that source. Resolve each path relative to that installation, inspect its contents, and verify any applicable license and execution prerequisites. Do not run a command or claim a referenced procedure was followed until its required file exists. Do not fabricate the missing scripts or treat an unrelated file with the same name as equivalent. Independent steps fully documented here can proceed within the user’s authorized scope; report any dependent step as unavailable.


# Content Quality & E-E-A-T Analysis

## When to Use
- Use when auditing content quality, readability, thin content risk, or E-E-A-T signals.
- Use when the user wants a content-focused SEO review rather than a full technical audit.
- Use when checking whether content is structured and trustworthy enough for search and AI citation.

## E-E-A-T Framework (updated Sept 2025 QRG)

Read `seo/references/eeat-framework.md` for full criteria.

### Experience (first-hand signals)
- Original research, case studies, before/after results
- Personal anecdotes, process documentation
- Unique data, proprietary insights
- Photos/videos from direct experience

### Expertise
- Author credentials, certifications, bio
- Professional background relevant to topic
- Technical depth appropriate for audience
- Accurate, well-sourced claims

### Authoritativeness
- External citations, backlinks from authoritative sources
- Brand mentions, industry recognition
- Published in recognized outlets
- Cited by other experts

### Trustworthiness
- Contact information, physical address
- Privacy policy, terms of service
- Customer testimonials, reviews
- Date stamps, transparent corrections
- Secure site (HTTPS)

## Content Metrics

### Word Count Analysis
Assess whether the page fully answers its intended user need. There is no universal minimum word count per page type; do not pad useful short pages to meet a quota. See [Google people-first content guidance](https://developers.google.com/search/docs/fundamentals/creating-helpful-content).

### Readability
- Flesch Reading Ease: target 60-70 for general audience

> **Note:** Flesch Reading Ease is a useful proxy for content accessibility but is NOT a direct Google ranking factor. John Mueller has confirmed Google does not use basic readability scores for ranking. Yoast deprioritized Flesch scores in v19.3. Use readability analysis as a content quality indicator, not as an SEO metric to optimize directly.
- Grade level: match target audience
- Sentence length: average 15-20 words
- Paragraph length: 2-4 sentences

### Keyword Optimization
- Primary keyword in title, H1, first 100 words
- Natural terminology, without numeric keyword-density targets
- Semantic variations present
- No keyword stuffing

### Content Structure
- Logical heading hierarchy (H1 -> H2 -> H3)
- Scannable sections with descriptive headings
- Bullet/numbered lists where appropriate
- Table of contents for long-form content

### Multimedia
- Relevant images with proper alt text
- Videos where appropriate
- Infographics for complex data
- Charts/graphs for statistics

### Internal Linking
- Relevant internal links where they help the reader; no fixed per-word quota
- Descriptive anchor text
- Links to related content
- No orphan pages

### External Linking
- Cite authoritative sources
- Open in new tab for user experience
- Reasonable count (not excessive)

## AI Content Assessment (Sept 2025 QRG addition)

Assess factual accuracy, originality, usefulness and trust regardless of generation method; do not infer authorship from style alone.

### Acceptable AI Content
- Demonstrates genuine E-E-A-T
- Provides unique value
- Has human oversight and editing
- Contains original insights

### Low-Quality AI Content Markers
- Generic phrasing, lack of specificity
- No original insight
- Repetitive structure across pages
- No author attribution
- Factual inaccuracies

> **Helpful Content System (March 2024):** The Helpful Content System was merged into Google's core ranking algorithm during the March 2024 core update. It no longer operates as a standalone classifier. Helpfulness signals are now weighted within every core update. The same principles apply (people-first content, demonstrating E-E-A-T, satisfying user intent), but enforcement is continuous rather than through separate HCU updates.

## AI Citation Readiness (GEO signals)

Optimize for AI search engines (ChatGPT, Perplexity, Google AI Overviews):

- Clear, quotable statements with statistics/facts
- Structured data (especially for data points)
- Strong heading hierarchy (H1->H2->H3 flow)
- Answer-first formatting for key questions
- Tables and lists for comparative data
- Clear attribution and source citations

### AI Search Visibility & GEO (2025-2026)

AI search interfaces and availability change. Inspect the actual platform/region/query results; do not claim citations are the only possible visibility mechanism or promise selection from formatting.

**Key optimization strategies for AI citation:**
- **Structured answers:** Clear question-answer formats, definition patterns, and step-by-step instructions that AI systems can extract and cite
- **First-party data:** Original research, statistics, case studies, and unique datasets are highly cited by AI systems
- **Schema markup:** Article, FAQ (for non-Google AI platforms), and structured content schemas help AI systems parse and attribute content
- **Topical authority:** AI systems preferentially cite sources that demonstrate deep expertise. Build content clusters, not isolated pages
- **Entity clarity:** Ensure brand, authors, and key concepts are clearly defined with structured data (Organization, Person schema)
- **Multi-platform tracking:** Monitor visibility across Google AI Overviews, AI Mode, ChatGPT, Perplexity, and Bing Copilot, not just traditional rankings. Treat AI citation as a standalone KPI alongside organic rankings and traffic.

**Generative Engine Optimization (GEO):**
GEO is the emerging discipline of optimizing content specifically for AI-generated answers. Key GEO signals include: quotability (clear, concise extractable facts), attribution (source citations within your content), structure (well-organized heading hierarchy), and freshness (regularly updated data). Cross-reference the `seo-geo` skill for detailed GEO workflows.

## Content Freshness

- Publication date visible
- Last updated date if content has been revised
- Flag content older than 12 months without update for fast-changing topics

## Output

### Content Quality Score: XX/100

Optional qualitative rubric: disclose weights, evidence coverage and unavailable inputs. E-E-A-T observations and citation-readiness scores are not official search-engine metrics. Do not invent author credentials/testimonials or update dates without real changes.

### E-E-A-T Breakdown
| Factor | Score | Key Signals |
|--------|-------|-------------|
| Experience | XX/25 | ... |
| Expertise | XX/25 | ... |
| Authoritativeness | XX/25 | ... |
| Trustworthiness | XX/25 | ... |

### AI Citation Readiness: XX/100

### Issues Found
### Recommendations

## DataForSEO Integration (Optional)

If DataForSEO MCP tools are available, use `kw_data_google_ads_search_volume` for real keyword volume data, `dataforseo_labs_bulk_keyword_difficulty` for difficulty scores, `dataforseo_labs_search_intent` for intent classification, and `content_analysis_summary` for content quality analysis.

## Error Handling

| Scenario | Action |
|----------|--------|
| URL unreachable (DNS failure, connection refused) | Report the error clearly. Do not guess page content. Suggest the user verify the URL and try again. |
| Content behind paywall (402/403, login wall) | Report that the content is not publicly accessible. Analyze only the visible portion (meta tags, headers) and note the limitation. |
| Thin content (fewer than 100 words retrievable) | Report the findings as-is rather than guessing. Flag the page as potentially JavaScript-rendered or gated, and suggest the user provide the full text directly. |

## Example

**User request:**

> Audit content quality, readability, thin content risk, or E-E-A-T signals.

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.
