# Story

A launch video is a small story told in 20 seconds to someone scrolling with the sound off. Most of the "wow" is
decided here, before any motion.

## The pitch roast

Take the idea as the person gave it and push on it, in this order. Write the answers down; they become the script.

1. **The one sentence.** Problem, move, payoff, in under 15 words. "You find type you love, screenshot it, and ship
   it in your app as your own font." If it needs an "and also", there are two videos.
2. **The stranger test.** Someone who has never heard of the product watches the first 3 seconds, muted. Can they say
   what it is about? A logo, a title card or a feature list fails. A recognisable situation passes: a page, a problem,
   a hand on a cursor.
3. **The signature move.** The one thing on screen only this product can do. The font video's is a screenshot
   lifting off a page and flipping into a font. The design system video's is the real button built layer by layer.
   If you can't name one, the video will be a feature tour; go back to the product until you can.
4. **Cut.** List every scene and the second it costs. Cut any scene the one sentence doesn't need, even a good one.
   The font video lost its spacing and checking scenes this way and got better.
5. **Three hooks.** Write three openings that pass the stranger test, each a different kind: a situation ("you find
   type you love"), a before and after, a surprising number. Pick one and say why in a sentence.
6. **Add the layers.** Go through the list below and say where each one lands. These are what turn a clear video
   into one people share.

### The layers

- **Every screen reads at a glance.** A stranger watching muted gets each screen in under a second, because it's
  something they've seen before (a phone, a browser tab, a chat, a calendar, a receipt) doing one obvious thing.
  Show the outcome, never the machinery: no diagrams of your process, no pipelines, no cards of internal steps, no
  labels like "Picture" and "Sound". A launch video for make-motion that opened on "it writes the story first" over
  a row of beat cards lost everyone who hadn't read the skill.
- **A hook that is a story, not a title.** Two or three short captions that set up a problem the viewer has had.
- **Slow enough at the start, never still.** The first 6 to 8 seconds can be calmer; the viewer is still deciding.
  Calm means one story beat at a time, not one thing moving: the camera, the UI and the captions still move together.
  The pace rises once they know what they're watching.
- **One signature move,** given the most frames and the best motion.
- **Micro-interactions on every surface, three things alive in every scene.** A pointer that travels rather than
  appears, a lock that shakes no, a crop that leaves a hole, digits that scramble before they land, cards that fan one
  by one with a small overshoot. `references/motion.md`, "Energy" and "Micro-interactions", has the rules; the
  energy check measures them.
- **Big.** The subject fills the frame and the camera pushes in when it matters. A product shown small reads as a
  screenshot.
- **Real content.** Invent plausible prices, names, rows and messages for the UI. Grey placeholder bars read as
  unfinished, and a stock first name in a chat bubble reads as generated.
- **Sound locked to picture.** Cuts and arrivals on the beat, effects on the frame something happens, the beat
  dropping on the story's turn.
- **Real numbers.** A real measurement reads as proof; a neat invented one reads as marketing.
- **An ending that returns.** The opening's situation comes back changed (the screen that couldn't open the page
  now opens it); the first chord resolves. The end card keeps moving until its last beat.
- **The call to action is what to do next.** For a tool, the command typing itself (`/make-font`); for a product,
  the domain or the one action. Never a slogan, and never a click on a command: commands are typed.

## Script

`SCRIPT.md` has: the length and format, the one sentence, a table of scenes (frames, what happens), every word on
screen in order, the sound, and a "before posting" list (licences, anything not verified). `timing.ts` holds every
frame as a beat: `b(beats)`, beats times frames per beat, rounded to a whole frame. Ranges are `a-b`, a inclusive, b
exclusive. SCRIPT.md and timing.ts change together.

Shape that works for 20 to 24 s at 120 BPM (30 frames a beat):

| Part | Share | Does |
|-|-|-|
| Hook | 30 to 35% | the situation and the problem, told slowly |
| Turn | 5% | the beat drops; the product acts |
| Proof | 35 to 40% | the signature move and one or two scenes that show it is real |
| Payoff | 10 to 15% | the result in use |
| End | 10% | the name, the command, the domain |

## Captions

- One line per beat, in plain words, set big (66 to 76 px at 1350 wide) in the theme's display face.
- No punctuation, no exclamation marks: full stops and commas read as generated.
- Second person, present tense: "You find type you love". "But it isn't yours to ship".
- Never two captions saying the same thing in different words.
- Never caption what the picture already says. Caption the why.
- A caption sits clear of what moves; check it in the stills.

## Formats

| Where | Size | Notes |
|-|-|-|
| X, default | 1350x1080 (5:4), rendered at 2700x2160 | biggest a feed will show on desktop and phone |
| X, wide | 1920x1080 | for a product UI that is wide |
| Stories, Reels, TikTok | 1080x1920 | captions higher: the bottom 20% is covered by the app |

60 fps for anything with UI in it; at 24 it reads as choppy.
