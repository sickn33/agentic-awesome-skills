# Local question sets and hand capture

Load in the /boring-marketing-ai-search Local branch before Phase 1. Hartline Plumbing, Dallas TX is a sample business.

## Rules for a local question set

- **Every question names the place.** City and state, or a neighborhood inside a big metro. The engine's guess about the user's location is not a measurement.
- **One city per set.** A business serving five towns gets one set for the main city, and the scope drill below for the others.
- **10 to 15 questions,** frozen verbatim. MONITOR repeats exactly these.
- **Customer words first.** Pull phrasings from call notes, texts, reviews and `voc.md` before inventing any.

## The six kinds, with the sample business

| Kind | Template | Sample |
|---|---|---|
| Category | best <service> in <city> | "best plumber in Dallas", "who's the most reliable water heater company in Dallas TX" |
| Urgent | emergency <service> <city> open now | "emergency plumber in Dallas open right now", "who can fix a burst pipe in Garland tonight" |
| Problem | <symptom>, who can fix it in <city> | "water heater leaking from the bottom, who can fix it today in Dallas" |
| Cost | how much does <job> cost in <city> | "how much does water heater replacement cost in Dallas" |
| Comparison | <business> vs <competitor> / <competitor> alternatives in <city> | "Hartline Plumbing vs <competitor>", "plumbers like <competitor> in Dallas" |
| Brand | is <business> good / reviews | "is Hartline Plumbing in Dallas any good", "Hartline Plumbing reviews" |

Default mix: 3 category, 2 urgent, 3 problem, 2 cost, 1 to 2 comparison, 2 brand.

## Capturing by hand

Engines don't share answers through a free API, so the most truthful capture is a person (or the agent with a browser) asking each question and pasting the answer.

| Surface | How | Record |
|---|---|---|
| ChatGPT | New chat, search on, signed-in state noted | Full answer, sources listed, businesses named in order |
| Perplexity | New thread | Answer, numbered sources |
| Gemini | New chat | Answer, any sources or map results |
| Google AI Overview / AI Mode | Search from the city, or with location set to it | Overview text, cited sources |
| Ask Maps (Google Maps app) | Phone in or near the city, Ask Maps button | Businesses recommended, the reason given for each |
| The business's own listing | Search the business name | Any AI summary shown, and what it says |

Capture each top question twice, on different days or in fresh sessions, before calling a result stable. Screenshots beat retyping.

## Recording sheet (one row per answer, saved in the notes file)

`date | engine | location | question (verbatim) | businesses named, in order | business state (CITED / MENTIONED / ABSENT / NOT OBSERVED) | sources cited | wrong facts`

## Wrong-facts check

For every answer that names the business, check each field against the truth and the Google profile:

| Field | Typical wrong answer | Where it usually comes from |
|---|---|---|
| Phone | An old number, or the number under another business's name | Old directory listings, copycat or scraper sites, an old number left in the profile's description |
| Location or service area | Wrong city, a storefront that doesn't exist | Old listings, a previous address |
| Hours | "24/7" the business doesn't offer, or closed when open | The profile, old listings, the business's own old pages |
| Services | Services they don't do, or missing their main one | Thin service pages, directory categories |
| Prices | Invented or national averages presented as theirs | The engine filling a gap, old pages |
| Name | Merged with a similarly named business elsewhere | Name collisions across cities |

Each wrong fact becomes a Local fix L1 item with the likely source named.

## Scope drill (optional, for multi-town businesses)

When the main city shows the business present but other towns matter, run a smaller set (the 3 to 4 category and urgent questions) for each of 2 to 4 more towns the business actually serves. The result maps where presence stops and who owns each town. Stop at the towns the business serves. A drill into towns it doesn't serve measures nothing it can use.
