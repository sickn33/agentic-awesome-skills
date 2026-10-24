# Platform discovery and citation checks

The earlier imported ranking-weight percentages, fixed search-backend claims and universal schema uplifts lacked primary evidence. Use the following procedure instead of treating them as current ranking rules.

## Google Search AI features

[Google's official guide](https://developers.google.com/search/docs/appearance/ai-features) says normal SEO foundations apply. Supporting pages need indexing and snippet eligibility; no special AI schema or text file is required. Googlebot, robots.txt and snippet/index controls manage Search access. Google-Extended addresses other uses. Eligibility does not guarantee crawling, indexing or citation.

## ChatGPT search

[OpenAI's crawler documentation](https://developers.openai.com/api/docs/bots) separates OAI-SearchBot search crawling from GPTBot potential training and ChatGPT-User user-triggered visits. Do not describe GPTBot as the search crawler. Verify infrastructure allows the intended bot and inspect search observations; do not infer selection weights or a single permanent backend.

An illustrative policy allowing search while opting out of GPTBot training collection is:

```text
User-agent: OAI-SearchBot
Allow: /

User-agent: GPTBot
Disallow: /
```

Adapt to existing groups and sensitive paths; test effective rules before applying. Robots directives are not access control. User-triggered fetching has different documented behavior. This example is not a universal policy recommendation.

## Other platforms

For Perplexity, Claude, Gemini and Copilot, verify the current product/mode and official crawler documentation before describing indexing or training implications. Do not promise that allowing one bot guarantees a citation, that every response browses, or that a named third-party index is the only discovery route.

## Measurement procedure

1. Choose representative audience questions and preserve exact wording, geography, language, date and product/mode.
2. Record whether an answer appears, whether it mentions the brand, and whether it links to the owned page or a third party. These are distinct outcomes.
3. Capture cited URLs and evidence for content/technical gaps; do not infer causal ranking factors from competitor correlation alone.
4. Change a bounded set of pages using accurate, useful content and applicable markup matching visible text. Recheck the same conditions over repeated runs.
5. Report sample size, variance, missing observations and referral/conversion outcomes. Referral analytics do not count all citations or impressions.

## Limits

[GEO research](https://arxiv.org/abs/2311.09735) offers experimental methods and benchmark-specific visibility results. It does not establish stable current ranking formulas across all platforms. Third-party monitoring tools need separate verification of coverage, pricing, terms and methodology before purchase or recommendation.
