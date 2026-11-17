# Social Graphics Mode

Platform-engineered graphics, not resized rectangles. Every platform has its own
ratios, safe zones, visual language, and failure modes. The craft here is knowing
which rules belong to which feed, and building a reusable template so post #40 is as
on-brand as post #1. This is the floor, not the ceiling. When the situation argues
for a better path, take it and say why.

**Before generating:** resolve roles in `references/MODEL_REGISTRY.md`: graphics run
on **image-default**; typography-dominant pieces (>6 words in-image, exact slogans) on
**image-text-render**; logo/icon/vector needs on **image-vector**. Follow
`references/api-workflow.md` for calls, saving, QA. Read `./brand/creative-kit.md`,
including any saved Social Graphics Templates.

---

## Platform specs and visual language

| Platform / placement | Ratio (px) | Safe zone | What its feed rewards |
|----------------------|-----------|-----------|----------------------|
| Instagram feed | 4:5 (1080×1350), default over 1:1 | full frame | Bold contrast, clean single focal point; carousels with a hook slide |
| Instagram Stories/Reels cover | 9:16 (1080×1920) | avoid the top ~14% (about 250px) and the bottom ~35% (about 670px) | Subject in the middle third; sticker/text room |
| YouTube thumbnail | 16:9 (1280×720) | right third gets timestamp | Face + exaggerated emotion, ≤3-5 words, colors that pop in a sidebar |
| LinkedIn | 1.91:1 (1200×627) or 1:1 | full frame | Professional-but-human; data visuals; dark-mode-friendly |
| X | 16:9 (1200×675) or 1:1 | full frame | High contrast for dark mode; bold graphic > photographic subtlety |
| TikTok cover | 9:16 | avoid bottom ~150px + right ~80px | Native phone-shot aesthetic; polish reads as ad |
| Pinterest | 2:3 (1000×1500) | full frame | Aspirational warmth; text overlays welcome (users read here) |
| Facebook | 1.91:1 or 1:1 | full frame | Broader-demo warmth; less edge than X |

Two judgments that outrank everything else: **ratio is non-negotiable** (wrong ratio =
wrong everything), and **visual language must match the platform's culture**: the same
concept is polished-minimal on LinkedIn, native-rough on TikTok, contrast-bold on X.

## Platform prompt templates

The platform clause does real work; these encode each feed's expectations:

```
INSTAGRAM FEED   [Subject], bold vibrant colors, clean composition, scroll-stopping
                 visual impact, high contrast, modern lifestyle aesthetic, 4:5
                 portrait, subject with breathing room for engagement UI

STORIES/REELS    [Subject], vertical 9:16, subject centered in the middle third
                 (clear of top and bottom UI), bold engaging visual, space for text
                 overlay or sticker, story-native aesthetic

YOUTUBE THUMB    [Subject/person] with [emotion] expression, high-contrast dramatic
                 lighting, bold colors, clean background zone on [left/right] for
                 text, face prominent, extreme visual clarity, reads at sidebar
                 size, 16:9

LINKEDIN         [Subject/concept], clean sophisticated aesthetic, professional but
                 not corporate-stock, thought-leadership tone, restrained palette
                 with one accent, space for headline, works in dark mode, 1.91:1

X                [Subject], high contrast for dark mode, bold simple composition,
                 punchy immediate appeal, graphic over photographic, 16:9

PINTEREST        [Subject] in aspirational setting, vertical 2:3, warm rich tones,
                 save-worthy editorial feel, clear space at top for text overlay

TIKTOK COVER     [Subject], native authentic aesthetic, NOT over-produced,
                 face-forward if person, content above bottom UI band, trend-aware,
                 high contrast at small size, 9:16
```

Variant modifiers: LinkedIn data post + "clean infographic aesthetic, one stat
dominant" · X hot-take + "provocative visual tension" · Pinterest how-to +
"step-preview composition".

## Text in graphics: render vs composite

The default image model renders short text well; the text-render role exists for when
typography IS the design.

- **≤6 words, decorative or integrated** (signs, packaging, stylized headline) →
  render in-image on image-default. Put the exact text in "quotes", describe the
  typeface style ("heavy condensed sans", "elegant serif"), placement ("lower third"),
  and contrast ("white on dark").
- **Typography-dominant designs, exact slogans, >6 words** → image-text-render role.
- **Legal text, phone numbers, anything letter-perfect** → generate the background
  with "clean space for text overlay" and composite in post. AI text is good, not
  pixel-guaranteed.

QA gate for any in-image text: every character correct at mobile size, or regenerate
(text errors are stochastic, same prompt often fixes itself).

Typography style vocabulary: bold geometric sans (announcements/CTAs) · elegant serif
(quotes, luxury) · condensed impact (thumbnails, urgency) · flowing script (personal,
lifestyle) · thin light sans (premium minimal) · monospace (tech).

## YouTube thumbnails: the highest-stakes graphic

Thumbnail ≈ half the click decision. Formula: **face + exaggerated emotion + ≤3 bold
colors + text space + readable at 120px wide**.

| Emotion | Prompt language | When |
|---------|-----------------|------|
| Shock | "shocked expression, wide eyes, raised eyebrows, open mouth" | reveals, drama |
| Excitement | "excited expression, big genuine smile, enthusiastic energy" | launches, wins |
| Curiosity | "intrigued expression, raised eyebrow, knowing look" | tutorials, secrets |
| Confidence | "confident expression, slight smirk, assured posture" | authority content |
| Concern | "concerned expression, worried, serious" | warnings, mistakes |

| Color | Carries | Why |
|-------|---------|-----|
| Yellow | most clicks | highest attention in the sidebar |
| Red | urgency, hot takes | drama signal |
| Blue | tech, education | trust/authority |
| Green | money, growth | finance association |
| Purple | creative, unique | stands out from the default palette |

Pick colors COMPLEMENTARY to the title text, not matching. Composition: subject
isolated by background blur/darkening, text zone in one third, curiosity gap (show the
result, hide the method), before/after splits for tutorial content. Arrows and circles
are worn out. Use sparingly. QA at thumbnail size: shrink mentally to sidebar scale;
if the concept needs a second look, it loses.

## Content type spines

```
QUOTE CARD      minimal background w/ soft gradient, text "[QUOTE]" in [style],
                centered, generous padding, [platform ratio]
ANNOUNCEMENT    celebration energy, text "[2-4 WORDS]" heavy condensed, top third,
                high contrast, [brand palette]
PRODUCT POST    product hero w/ lifestyle context, scroll-stopping contrast,
                space for caption-side message
BEHIND-SCENES   candid authentic aesthetic, real-moment capture, personality-forward,
                NOT polished
TESTIMONIAL     clean trustworthy layout, quote space, human element, brand colors
DATA/INSIGHT    one stat dominant, stark visualization, [LinkedIn/X] aesthetic
```

## The template system: consistency at scale

First project: explore (optional 5-direction per SKILL.md), pick a winner, then save a
named template to `./brand/creative-kit.md` under `## Social Graphics Templates`:

```markdown
### Template: <name>
Style family: <minimal/bold/warm/dark-premium/playful>
Palette: <hex + names>   Background: <treatment>   Mood: <one line>
Typography: <headline style / text color-contrast / placement preference>
Composition: <subject placement, negative space, hierarchy>
Platform notes: <per-platform adjustments>
Prompt prefix: "<fragment prepended to every generation>"
Prompt suffix: "<fragment appended>"
```

Every later graphic = prefix + concept + suffix + platform ratio. Update the template
when the brand evolves; all future content follows. Recurring brand with no saved
template → build one before batch work (or say why you're skipping it).

## Multi-platform adaptation

Generate the PRIMARY platform first, approve, then adapt. Adaptation is
re-composition, not cropping:

- Feed (4:5) → Stories (9:16): re-center subject in the middle third, add vertical air.
- Anything → LinkedIn: widen, strip casual/meme energy, add "professional,
  sophisticated".
- Anything → X: push contrast for dark mode, add punch.
- Anything → TikTok: remove polish ("native, authentic, not over-produced"), shift
  subject center-left (right edge UI).
- Anything → Pinterest: extend vertical, warm aspirational grade, text space top.
- Anything → 9:16 from landscape: full recomposition, never letterbox.

Generate adaptations in parallel; same template fragments throughout.

## Content calendar mode

Batch a week+ of on-brand posts in one session. Requirements: a saved template, target
platform(s), count, and (recommended) content pillars for variety: without pillars,
seven generations converge on seven near-identical posts.

| Pillar | Job | Shapes |
|--------|-----|--------|
| Educate | teach something useful | tips, how-tos, explainers |
| Inspire | motivate | quotes, success stories |
| Engage | start conversations | questions, hot takes |
| Promote | drive action | features, offers, CTAs; cap at ~2/week |
| Entertain | build affinity | behind-scenes, humor, trends |
| Connect | build community | user stories, team, values |

Default week: Mon educate · Tue inspire · Wed engage · Thu promote · Fri entertain ·
Sat connect · Sun inspire.

Per post: pillar → unique concept → template prefix + concept + suffix → platform ratio
→ generate → QA → caption with platform-appropriate hashtag discipline → save as
`day-N-pillar-concept-[ratio].png`. Write a `calendar-summary.md` table (day, pillar,
concept, file, caption) plus the campaign manifest per api-workflow.md. Batch in parallel
waves; the week costs well under $1. No confirmation ritual; actual spend is one line in the note.

## QA additions for this mode

Standard rubric plus: correct ratio and safe zones (nothing critical under platform
UI), scroll-stop test ("would this stop MY thumb in THIS feed?"), text legible at
mobile size, dark-mode check for X/LinkedIn, template fidelity (palette + typography
match the saved template), platform culture match (too polished for TikTok and too
casual for LinkedIn are both failures). Common fixes: generic → platform-specific
language; won't stop scroll → contrast + single focal point; garbled text → fewer
words or text-render role or composite.

## Output

`creative-output/social-graphics/<campaign>/<platform>/`, named
`[concept]-[ratio]-v[N].png` (calendar posts: `day-N-[pillar]-[concept]-[ratio].png`),
manifest + `./brand/assets.md` per asset. Delivery = standard contract with the graphics
and captions where written (QA scores stay in the manifest). Route onward: /boring-marketing-content-atomizer to spin approved
visuals into full platform posts; ad-creative mode when a graphic becomes a paid cell.
