---
name: content-creator
description: Draft and review audience-specific content using supplied brand examples, local text diagnostics, and adaptable channel templates.
metadata:
  aas-category: marketing
  aas-risk: critical
  aas-source: community
  aas-date-added: '2026-02-27'
---

# Content Creator

Draft and review audience-specific content using supplied brand examples, local text diagnostics, and adaptable channel templates.

## When to Use
Use this skill when writing blog posts, creating social media content, establishing brand voice, optimizing content for SEO, or planning content calendars.

## Keywords
content creation, blog posts, SEO, brand voice, social media, content calendar, marketing content, content strategy, content marketing, brand consistency, content optimization, social media marketing, content planning, blog writing, content frameworks, brand guidelines, social media strategy

## Inputs and boundaries

Obtain the audience, purpose, approved claims and sources, brand examples, channel,
and desired next action. Reuse supplied constraints; do not invent audience research.
Python 3 is sufficient for the optional local scripts. Run the examples from this
skill directory with a permitted UTF-8 input below the working directory (maximum
1 MiB); paths elsewhere are rejected. The scripts read that file and print diagnostics,
without calling an analytics service or editing it. Review any private text before
sharing the output. Drafting does not authorize scheduling, sending or publication.

## Quick Start

### For Brand Voice Development
1. Run `scripts/brand_voice_analyzer.py` on existing content to record rough lexical features
2. Review `references/brand_guidelines.md` to select voice attributes
3. Apply chosen voice consistently across all content

### For Blog Content Creation
1. Choose template from `references/content_frameworks.md`
2. Research keywords for topic
3. Write content following template structure
4. Run `scripts/seo_optimizer.py [file] [primary-keyword]` to optimize
5. Review suggestions against the audience and actual page before publishing

### For Social Media Content
1. Review platform best practices in `references/social_media_optimization.md`
2. Use appropriate template from `references/content_frameworks.md`
3. Optimize based on platform-specific guidelines
4. Schedule using `assets/content_calendar_template.md`

## Core Workflows

### Establishing Brand Voice (First Time Setup)

When creating content for a new brand or client:

1. **Analyze Existing Content** (if available)
   ```bash
   python scripts/brand_voice_analyzer.py existing_content.txt
   ```
   
2. **Define Voice Attributes**
   - Review brand personality archetypes in `references/brand_guidelines.md`
   - Select primary and secondary archetypes
   - Choose 3-5 tone attributes
   - Document in brand guidelines

3. **Create Voice Sample**
   - Write 3 sample pieces in chosen voice
   - Compare samples manually with approved examples; use the analyzer only for lexical clues
   - Refine based on results

### Creating SEO-Optimized Blog Posts

1. **Keyword Research**
   - Identify the reader question and relevant search intent from actual research
   - Record related questions that the piece needs to answer
   - Do not invent search volumes or treat word frequency as semantic research

2. **Content Structure**
   - Use blog template from `references/content_frameworks.md`
   - Use a descriptive title and headings; use the reader's terminology naturally
   - Use enough detail to answer the question; there is no universal SEO word count

3. **Optimization Check**
   ```bash
   python scripts/seo_optimizer.py blog_post.md "primary keyword" "secondary,keywords,list"
   ```

4. **Apply SEO Recommendations**
   - Remove repetition that hurts clarity; do not target a keyword-density percentage
   - Ensure proper heading structure
   - Add internal and external links
   - Optimize meta description

### Social Media Content Creation

1. **Platform Selection**
   - Identify primary platforms based on audience
   - Review platform-specific guidelines in `references/social_media_optimization.md`

2. **Content Adaptation**
   - Start with blog post or core message
   - Use repurposing matrix from `references/content_frameworks.md`
   - Adapt for each platform following templates

3. **Optimization Checklist**
   - Platform-appropriate length
   - Audience-informed posting time to test
   - Correct image dimensions
   - Platform-specific hashtags
   - Engagement elements (polls, questions)

### Content Calendar Planning

1. **Monthly Planning**
   - Copy `assets/content_calendar_template.md`
   - Set monthly goals and KPIs
   - Identify key campaigns/themes

2. **Weekly Distribution**
   - Choose a mix based on goals, production capacity and observed audience needs
   - Balance platforms throughout week
   - Label untested timing assumptions and compare results over a stated period

3. **Batch Creation**
   - Create all weekly content in one session
   - Maintain consistent voice across pieces
   - Prepare all visual assets together

## Key Scripts

### brand_voice_analyzer.py
Counts a small English vocabulary and estimates sentence length/readability. It cannot establish authentic brand voice or validate factual claims.

**Usage**: `python scripts/brand_voice_analyzer.py <file> [json|text]`

**Returns**:
- Voice profile (formality, tone, perspective)
- Readability score
- Sentence structure analysis
- Improvement recommendations

### seo_optimizer.py
Analyzes content for SEO optimization and provides actionable recommendations.

**Usage**: `python scripts/seo_optimizer.py <file> [primary_keyword] [secondary_keywords]`

**Returns**:
- Descriptive text diagnostics (no ranking or quality score)
- Keyword density analysis
- Structure assessment
- Meta tag suggestions
- Specific optimization recommendations

## Reference Guides

### When to Use Each Reference

**references/brand_guidelines.md**
- Setting up new brand voice
- Ensuring consistency across content
- Training new team members
- Resolving voice/tone questions

**references/content_frameworks.md**
- Starting any new content piece
- Structuring different content types
- Creating content templates
- Planning content repurposing

**references/social_media_optimization.md**
- Platform-specific optimization
- Hashtag strategy development
- Planning platform-specific checks without assuming ranking algorithms
- Setting up analytics tracking

## Best Practices

### Content Creation Process
1. Always start with audience need/pain point
2. Research before writing
3. Create outline using templates
4. Write first draft without editing
5. Optimize for SEO
6. Edit for brand voice
7. Proofread and fact-check
8. Optimize for platform
9. Schedule strategically

### Quality Indicators
- Claims supported by sources and the reader's question answered
- Readability appropriate for audience
- Consistent brand voice throughout
- Clear value proposition
- Actionable takeaways
- Proper visual formatting
- Platform-optimized

### Common Pitfalls to Avoid
- Writing before researching keywords
- Ignoring platform-specific requirements
- Inconsistent brand voice
- Over-optimizing for SEO (keyword stuffing)
- Missing clear CTAs
- Publishing without proofreading
- Ignoring analytics feedback

## Performance Metrics

Track these KPIs for content success:

### Content Metrics
- Organic traffic growth
- Average time on page
- Bounce rate
- Social shares
- Backlinks earned

### Engagement Metrics
- Comments and discussions
- Email click-through rates
- Social media engagement rate
- Content downloads
- Form submissions

### Business Metrics
- Leads generated
- Conversion rate
- Customer acquisition cost
- Revenue attribution
- ROI per content piece

## Integration Points

This skill works best with:
- Analytics platforms (Google Analytics, social media insights)
- SEO tools (for keyword research)
- Design tools (for visual content)
- Scheduling platforms (for content distribution)
- Email marketing systems (for newsletter content)

## Quick Commands

```bash
# Analyze brand voice
python scripts/brand_voice_analyzer.py content.txt

# Optimize for SEO
python scripts/seo_optimizer.py article.md "main keyword"

# Compare the draft manually with approved brand examples and prohibited claims

# Create monthly calendar
cp assets/content_calendar_template.md this_month_calendar.md
```

## Worked example: one source, two drafts

For an approved release note stating “CSV export is now available”, prepare a short
help article explaining where export lives and a social draft linking to that article.
Keep the exact supported formats and limitations from the source. Do not turn the
claim into “save hours” without measured evidence. Run the local text diagnostics,
then verify the instructions against the actual product and compare tone with two
approved posts. Return both drafts, source links, unresolved facts and a proposed
calendar slot. Expected result: reviewable copy; no posts have been sent.

## Limitations

- The bundled analyzer uses small English word lists and approximate syllables;
  ties or absent matches do not identify a brand personality. It is not a validated
  reading assessment and does not support multilingual scoring reliably.
- The SEO helper inspects simple Markdown patterns, not rendered pages, indexing,
  search demand, accessibility, ranking, or causality. Character lengths and word
  counts are observations, not quality thresholds.
- Templates contain illustrative placeholders, not testimonials, benchmarks or
  client facts. Confirm rights and approvals for quoted material and images.
- Channel features change. Check the current native composer and official help for
  the selected format; use account analytics to test timing instead of universal rules.

Google's [people-first content guidance](https://developers.google.com/search/docs/fundamentals/creating-helpful-content)
explains why satisfying reader needs matters more than filling a target word count.
