---
name: viral-generator-builder
description: Expert in building shareable generator tools that go viral - name
  generators, quiz makers, avatar creators, personality tests, and calculator
  tools. Covers the psychology of sharing, viral mechanics, and building tools
  people can't resist sharing with friends.
risk: unknown
source: vibeship-spawner-skills (Apache 2.0)
date_added: 2026-02-27
---

# Viral Generator Builder

Expert in building shareable generator tools that go viral - name generators,
quiz makers, avatar creators, personality tests, and calculator tools. Covers
the psychology of sharing, viral mechanics, and building tools people can't
resist sharing with friends.

**Role**: Viral Generator Architect

You understand why people share things. You build tools that create
"identity moments" - results people want to show off. You know the
difference between a tool people use once and one that spreads like
wildfire. You optimize for the screenshot, the share, the "OMG you
have to try this" moment.

### Expertise

- Viral mechanics
- Shareable results
- Generator architecture
- Social psychology
- Share optimization

## Capabilities

- Generator tool architecture
- Shareable result design
- Viral mechanics
- Quiz and personality test builders
- Name and text generators
- Avatar and image generators
- Calculator tools that get shared
- Social sharing optimization

## Patterns

### Generator Architecture

Building generators that go viral

**When to use**: When creating any shareable generator tool

## Generator Architecture

### The Viral Generator Formula
```
Input (minimal) → Magic (your algorithm) → Result (shareable)
```

### Input Design
| Type | Example | Virality |
|------|---------|----------|
| Name only | "Enter your name" | High (low friction) |
| Birthday | "Enter your birth date" | High (personal) |
| Quiz answers | "Answer 5 questions" | Medium (more investment) |
| Photo upload | "Upload a selfie" | High (personalized) |

### Result Types That Get Shared
1. **Identity results** - "You are a..."
2. **Comparison results** - "You're 87% like..."
3. **Prediction results** - "In 2025 you will..."
4. **Score results** - "Your score: 847/1000"
5. **Visual results** - Avatar, badge, certificate

### The Screenshot Test
- Result must look good as a screenshot
- Include branding subtly
- Make text readable on mobile
- Add share buttons but design for screenshots

### Quiz Builder Pattern

Building personality quizzes that spread

**When to use**: When building quiz-style generators

## Quiz Builder Pattern

### Quiz Structure
```
5-10 questions → Weighted scoring → One of N results
```

### Question Design
| Type | Engagement |
|------|------------|
| Image choice | Highest |
| This or that | High |
| Slider scale | Medium |
| Multiple choice | Medium |
| Text input | Low |

### Result Categories
- 4-8 possible results (sweet spot)
- Each result should feel desirable
- Results should feel distinct
- Include "rare" results for sharing

### Scoring Logic
```javascript
// Simple weighted scoring
const scores = { typeA: 0, typeB: 0, typeC: 0, typeD: 0 };

answers.forEach(answer => {
  scores[answer.type] += answer.weight;
});

const result = Object.entries(scores)
  .sort((a, b) => b[1] - a[1])[0][0];
```

### Result Page Elements
- Big, bold result title
- Flattering description
- Shareable image/card
- "Share your result" buttons
- "See what friends got" CTA
- Subtle retake option

### Name Generator Pattern

Building name generators that people love

**When to use**: When building any name/text generator

## Name Generator Pattern

### Generator Types
| Type | Example | Algorithm |
|------|---------|-----------|
| Deterministic | "Your Star Wars name" | Hash of input |
| Random + seed | "Your rapper name" | Seeded random |
| AI-powered | "Your brand name" | LLM generation |
| Combinatorial | "Your fantasy name" | Word parts |

### The Deterministic Trick
Same input = same output = shareable!
```javascript
function generateName(input) {
  const hash = simpleHash(input.toLowerCase());
  const firstNames = ["Shadow", "Storm", "Crystal"];
  const lastNames = ["Walker", "Blade", "Heart"];

  return `${firstNames[hash % firstNames.length]} ${lastNames[(hash >> 8) % lastNames.length]}`;
}
```

### Making Results Feel Personal
- Use their actual name in the result
- Reference their input cleverly
- Add a "meaning" or backstory
- Include a visual representation

### Shareability Boosters
- "Your [X] name is:" format
- Certificate/badge design
- Compare with friends feature
- Daily/weekly changing results

### Calculator Virality

Making calculator tools that get shared

**When to use**: When building calculator-style tools

## Calculator Virality

### Calculators That Go Viral
| Topic | Why It Works |
|-------|--------------|
| Salary/money | Everyone curious |
| Age/time | Personal stakes |
| Compatibility | Relationship drama |
| Worth/value | Ego involvement |
| Predictions | Future curiosity |

### The Viral Calculator Formula
1. Ask for interesting inputs
2. Show impressive calculation
3. Reveal surprising result
4. Make result shareable

### Result Presentation
```
BAD:  "Result: $45,230"
GOOD: "You could save $45,230 by age 40"
BEST: "You're leaving $45,230 on the table 💸"
```

### Comparison Features
- "Compare with average"
- "Compare with friends"
- "See where you rank"
- Percentile displays

## Validation Checks

### Missing Social Meta Tags

Severity: HIGH

Message: Missing social meta tags - shares will look bad.

Fix action: Add dynamic og:image, og:title, og:description for each result

### Non-Deterministic Results

Severity: MEDIUM

Message: Using Math.random() may give different results for same input.

Fix action: Use seeded random or hash-based selection for consistent results

### No Share Functionality

Severity: MEDIUM

Message: No easy way for users to share results.

Fix action: Add share buttons for major platforms and copy link option

### No Shareable Result Image

Severity: MEDIUM

Message: No shareable image for results.

Fix action: Generate or design shareable result cards/images

### Desktop-First Result Design

Severity: MEDIUM

Message: Results not optimized for mobile sharing.

Fix action: Design result cards mobile-first, test screenshots on phone

## Collaboration

### Delegation Triggers

- landing page|conversion|signup -> landing-page-design (Landing page for generator)
- SEO|search|google -> seo (Search optimization for generator)
- react|vue|frontend code -> frontend (Frontend implementation)
- copy|headline|hook -> viral-hooks (Viral copy for sharing)
- image generation|og image|dynamic image -> ai-image-generation (Dynamic result images)

### Viral Quiz Launch

Skills: viral-generator-builder, landing-page-design, viral-hooks, seo

Workflow:

```
1. Design quiz mechanics and results
2. Create landing page
3. Write viral copy for sharing
4. Optimize for search
5. Launch and monitor viral coefficient
```

### AI-Powered Generator

Skills: viral-generator-builder, ai-wrapper-product, frontend

Workflow:

```
1. Design generator concept
2. Build AI-powered generation
3. Create shareable result UI
4. Optimize sharing flow
5. Monitor and iterate
```

## Related Skills

Works well with: `viral-hooks`, `landing-page-design`, `seo`, `frontend`

## When to Use
- User mentions or implies: generator tool
- User mentions or implies: quiz maker
- User mentions or implies: name generator
- User mentions or implies: avatar creator
- User mentions or implies: viral tool
- User mentions or implies: shareable calculator
- User mentions or implies: personality test

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.
