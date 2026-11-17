# Talking Head Mode

Presenter videos, UGC-style testimonials, and lip-synced spokespeople. The two ideas
that make this mode work: a **consistent spokesperson pack** (generate the character
once, reuse it everywhere) and the **script → TTS → lip-sync pipeline** (iterate on
words without re-shooting anything). Plus the part that keeps customers out of trouble:
honest labeling of AI presenters is not optional. Everything else here is the floor, not the
ceiling. When the situation argues for a better path, take it and say why.

**Before generating:** resolve roles in `references/MODEL_REGISTRY.md`: presenter
video on **video-production** (or **video-draft** for archetype tests); character
consistency on **video-reference**; reference stills on **image-default**; lip-sync on
**lipsync-default** (studio), **lipsync-budget** (script tests), **lipsync-kling**
(Kling-generated sources), **digital-human** (animate a still photo). When the role
pick isn't obvious, the job→model judgment lives in `references/model-routing.md`.
Follow `references/api-workflow.md` for calls, QA, saving. Read `./brand/creative-kit.md`,
including any saved Approved Presenter spec.

---

## Presenter archetypes: pick the trust mechanism first

The archetype decision is "why will this audience believe this person," not casting
aesthetics:

| Archetype | Vibe | Fits | Delivery markers | Voice (TTS) |
|-----------|------|------|------------------|-------------|
| **Corporate Authority** | "Trust the expert" | B2B, finance, health, enterprise | measured pace, deliberate minimal gestures, modern office | deep/warm, 0.9-1.0× speed |
| **Relatable Friend (UGC)** | "Here's what worked for me" | DTC, wellness, beauty | conversational rhythm, natural pauses, kitchen/couch, window light | warm conversational, 1.0-1.1× |
| **Energetic Creator** | "You HAVE to try this" | Gen-Z products, apps, entertainment | fast, big expressions, ring-light studio | bright/dynamic, 1.1-1.3× |
| **Expert Educator** | "Let me explain how this works" | courses, B2B explainers | patient teaching rhythm, study/whiteboard | clear/patient, 0.9-1.0× |
| **Lifestyle Aspirational** | "This is what my life looks like" | luxury, high-ticket, travel | relaxed "I have time" energy, beautiful interior, golden hour | smooth/unhurried, 0.85-0.95× |

New brand with no saved presenter: generate 3-5 archetype tests on the draft tier
(draft-tier cost per the registry), present pre-ranked, pick, then BUILD THE PACK (below). Saved presenter
exists → load it and skip exploration entirely.

**Archetype visual formulas** (the SUBJECT + setting layers, ready to adapt):

```
CORPORATE     [Man/woman] in 30s-50s wearing tailored blazer, modern glass office
              with city view, warm professional lighting, confident composed
              expression, seated at desk, direct eye contact, subtle hand gestures

UGC FRIEND    Friendly [demographic] sitting at bright kitchen counter, natural
              window light, genuine excited expression, talking directly to camera
              like filming a selfie video, casual comfortable body language

CREATOR       Energetic creator 22-35 in trendy casual outfit, content studio with
              ring light visible, animated expressions, fast enthusiastic delivery,
              YouTube/TikTok creator aesthetic

EDUCATOR      Knowledgeable expert 30s-55, smart casual, home study with bookshelves,
              balanced lighting, thoughtful expression, explaining with purposeful
              gestures, patient instructive tone

ASPIRATIONAL  Elegant person 30s-50s, elevated casual linen attire, designer interior
              or balcony view, golden hour light, relaxed confident demeanor,
              speaking with quiet unhurried confidence
```

## Spokesperson packs: generate once, reuse forever

Character consistency is the difference between "a brand spokesperson" and "a
different AI person every video." The pack:

```
1 DESIGN    Lock the character in prose: demographics, look, wardrobe, setting,
            energy. Write it as a reusable paragraph.
2 STILLS    Generate a reference still SET on image-default with a fixed seed where
            supported: front portrait, 3/4 angle, full setting shot; same prompt
            skeleton, same lighting phrase. Iterate until the user approves the face.
3 PACK      Save to ./brand/creative-kit.md under "## Approved Presenter: <name>":
            the prose spec, the exact generation prompt, paths to the reference
            stills, the TTS voice_id + pace, and usage notes.
4 REUSE     Every future video passes the approved stills as reference images on the
            video-reference role (registry: which models take reference arrays and
            what the params are). Same face, new scene, new script.
5 UPDATE    Re-cast only on brand pivot or explicit request; archive the old spec,
            never delete (legacy content references it).
```

This is also the localization unlock: one approved presenter video + one TTS file and
lip-sync pass per language = the same spokesperson in five markets for a few dollars.

## Prompting presenters: 8-layer grammar, human edition

Use product-video mode's 8-layer grammar with the human-specific emphases:

- **SUBJECT:** specific demographic + wardrobe + the approved-presenter paragraph
  verbatim when one exists. "A person talking" = generic stock human.
- **EMOTION:** name the expression ("warm genuine smile mid-sentence", "confident
  neutral"). Unspecified faces drift uncanny.
- **OPTICS:** 35-50mm at f/2.0-2.8 reads like a real creator setup; 85mm for
  corporate polish.
- **MOTION:** keep it simple: "seated, subtle natural hand gestures, direct eye
  contact with camera". Walking + talking + gesturing = artifacts.
- **LIGHTING:** archetype-matched: window light (UGC), three-point (corporate), ring
  light (creator).
- **STYLE:** UGC wants "smartphone aesthetic, slightly imperfect framing"; corporate
  wants "shot on cinema camera, clean grade".
- **AUDIO:** usually OFF for the base video; speech comes from the lip-sync pass.
- **CONTINUITY:** the pack's locked phrases, verbatim, every time.

Keep takes 5-10s; faces morph on long single generations. Longer pieces = multiple
takes cut together, or one take extended by lip-syncing successive script segments.

## Script → TTS → lip-sync pipeline

```
SCRIPT (word-counted) → TTS audio (saved brand voice) → presenter video (silent)
→ lip-sync → disclosure check → platform package
```

### Script writing: duration first

~150 words/minute conversational. 15 words ≈ 5s hook · 30 ≈ 10s Reel · 45 ≈ 15s
TikTok · 90 ≈ 30s explainer · 150 ≈ 60s testimonial. Write to the target, count, trim.

Structures: **Hook-Value-CTA** (≤30s), **Problem-Agitate-Solve** (30-60s),
**Before-After** (15-30s). Tone follows archetype:

```
CORPORATE   "[Name] here with [Company]. Today I want to share how [insight] can
            help you [outcome]. Here's what you need to know…"
UGC         "Okay so I've been using [product] for [time] and honestly? Here's why
            [specific benefit]. If you [problem], you need this."
EDUCATOR    "One thing I see people get wrong about [topic] is [misconception].
            Here's what actually works…"
CREATOR     "Stop scrolling. [Product] just changed everything, [result] in
            [timeframe]. You HAVE to see this."
ASPIRATIONAL "I wanted to share something that's completely transformed [area].
            [Product] gave me [result]. Here's how it works…"
```

UGC patterns that read authentic: discovery ("I found this and I'm obsessed…"),
honest review ("been using it for [time], here's my real take…"), comparison ("I used
to use [old thing], then…"), transformation ("before: [problem]. now? [result]").
Authenticity markers: slightly imperfect framing, window light, casual wardrobe,
personal-space backdrop. Pull verbatim customer language from `./brand/voc.md` when it
exists. Real phrasing beats invented testimonial-speak (truthfulness rules still
apply: see disclosure section).

### TTS

External TTS for anything shipping: voice cloning, consistency, languages, pacing
control. We use ElevenLabs for this (free tier, then plans). Without it, any other
external TTS with cloning does the job. Built-in TTS on the Kling lip-sync model is
only for quick script tests. Selection: match gender/age-feel to the visual, archetype pace from the
table above, test 3-5 candidates on a sample line, save the winner's `voice_id` to the
presenter pack. Script-for-TTS: short sentences, punctuation as rhythm, "..." for
breaths, CAPS for emphasis, test brand-name pronunciation. Verify audio duration ≈
video duration before syncing. When voice quality/cloning or avatar volume becomes a
RECURRING need, see the dedicated-platform table (ElevenLabs / HeyGen) in
`references/model-routing.md` §6: subscriptions earn their keep on programs, not
one-offs.

### Lip-sync

Role routing:
- **lipsync-default**: studio-grade default for everything shipping.
- **lipsync-budget**: cheap passes while iterating scripts.
- **lipsync-kling**: when the source video came from the Kling family (pass
  `video_id`, skips re-upload) or for built-in-TTS quick tests. Hard constraints in
  the registry (2-10s, 720-1080p, audio <5MB).
- **digital-human**: no video at all: one still photo + audio → full talking human
  with body motion. The premium path for animating a founder photo or the pack's
  reference still directly.

Source-video quality rules (all models): face visible and front-facing 70%+ of the
time, minimal head turning, clean audio without background music, short sentences
sync better. Side profiles fail.

### Why this pipeline wins

Script change = new TTS + re-sync (lip-sync cost per the registry), not a re-shoot. One approved base video
becomes: A/B hook variants, per-audience personalization, multi-language versions,
each at lip-sync cost.

## Disclosure and honesty rules

Label AI-generated presenters. Platforms ask for it, and a presenter viewers later learn
was synthetic costs more trust than one they were told about up front. No single rule
says every AI presenter needs a label, but the FTC's rules against deceptive endorsements
and against fake reviews and testimonials apply to what the presenter says: an AI
presenter must never pose as a real customer or a real expert, and claims still need
substantiation. Platform rules differ and change, so check each one's current wording.

- **In-video:** small text overlay in the first 3 to 5 seconds ("AI-generated presenter")
  or a natural verbal line ("I'm [Brand]'s AI presenter."). Confident, not apologetic.
- **Platform labels:** Meta and TikTok have AI-content labels, so apply them at upload.
  YouTube has the altered or synthetic content declaration, and LinkedIn expects
  disclosure in the post. Check the platform's current rule each campaign.
- **Caption:** repeat the disclosure in the description.

Hard lines: never impersonate a real person; never present an AI presenter as a real
customer giving a real testimonial; claims still need substantiation regardless of who
"says" them. Build the disclosure into the script and overlay plan BEFORE generating, and
list disclosure status in the delivery summary.

Disclosure that doesn't kill the content, written as a feature:

```
UGC        "Quick transparency: I'm AI-generated. The results I'm about to show
           you come from [Brand]'s real customers, with sources below. Okay,
           let's go..."
CORPORATE  [text overlay "AI-generated presenter" first 3s] "Welcome. Today I'll
           walk you through..."
CREATOR    "Yes, I'm an AI presenter, built on real customer feedback. Here's
           what people are actually saying about [product]..."
```

## Platform packaging

| Platform | Ratio | Length | Energy notes |
|----------|-------|--------|--------------|
| TikTok / Reels | 9:16 | 15-30s | hook in 1-2s, jump cuts fine, casual; face/text in center 60% |
| YouTube | 16:9 | 30-120s | measured, room for lower-thirds; declaration at upload |
| LinkedIn | 1:1 / 16:9 | 30-60s | credible, value-first; disclosure in post text |
| Stories | 9:16 | ≤15s/segment | in-the-moment, single message |
| Paid (Meta/TikTok) | per placement | 15-30s | hook 0-3s, captions on (silent viewing), AI label in ads manager |

Square (1:1): check the registry cheat sheet for which video families support it;
otherwise crop in post.

## QA additions for this mode

Frame-extraction QA plus the human-specific gates: no uncanny-valley artifacts, face
consistent across the clip (morph check), expression matches script intent, presenter
matches the pack spec when one exists, **lip-sync accuracy** (mouth matches audio, no
drift at the end), voice-visual congruence (the voice plausibly belongs to this face),
disclosure present or explicitly planned for post. Common fixes: uncanny → switch
families or shorten take; sync drift → shorter sentences, front-facing source;
robotic voice → external TTS, slower pace; inconsistent character → reference stills
were skipped, use the pack.

## Output

`creative-output/talking-heads/<campaign>/{presenter-pack,generation,audio,lip-sync,approved}/`,
named `[purpose]-[model-shortname]-v[N].mp4` (localized: `-es`, `-de` suffixes),
manifest per asset (include `voice_id`), one line each to `./brand/assets.md`; new
presenter approved → pack saved to creative-kit.md (auto-version per the brand-memory
spec in `${CLAUDE_SKILL_DIR}/../boring-marketing-start-here/references/brand-memory.md`). Delivery = standard contract + disclosure status line. Route onward: ad cells →
ad-creative mode naming; distribution → /boring-marketing-content-atomizer.
