# Interactive Magnet Build Spec

Load this in BUILD MODE for quiz, calculator, or AI-audit formats. The deliverable is a **working app the user can open in a browser**, not a spec for a quiz tool. "Done" means you opened the file and walked every path: each result profile reachable, formulas correct against a hand-calculated case, email gate fires the webhook stub.

## Target format decision

- **Default: single-file HTML:** one `index.html`, vanilla JS, CSS inline. No build step, no dependencies, deploys by dragging onto Netlify/Vercel or pasting into any site. Write to `./campaigns/{name}/app/index.html`.
- **Next.js component:** only when the user has an existing Next.js project and says they want it integrated. Write `LeadMagnet{Name}.tsx` (client component) + `app/api/subscribe/route.ts` so the ESP key stays server-side.
- **AI-audit** always needs a server piece for the LLM call: single-file HTML + a serverless function template, or the Next.js route. Never put an LLM or ESP API key in client code.

Design: mobile-first, system font stack or one Google font, one accent color (pull from creative-kit.md if it exists), generous whitespace, large tap targets. One screen at a time, never a wall of 12 questions. Progress indicator on quizzes. No stock-photo header, no emoji confetti: this app is the prospect's first product experience of the brand, and it should feel like the paid thing.

## Quiz skeleton

State machine: `intro → question[0..n] → email gate → result`. One question per screen, auto-advance on answer click, back button preserves answers.

```html
<script>
const QUIZ = {
  questions: [
    { text: "...", answers: [
      { label: "...", scores: { profileA: 2, profileB: 0, profileC: 1 } },
      // 3-5 answers; every answer scores ALL profiles (weighted), not just one
    ]},
    // 7-12 questions; under 7 feels thin, over 12 bleeds completions
  ],
  profiles: {
    profileA: { name: "...", headline: "...", description: "...",
                strengths: [...], gaps: [...],
                cta: { text: "...", url: "..." } },  // bridge tailored PER profile
    // 3-5 profiles
  }
};
// result = highest summed score; break ties with a declared priority order
</script>
```

Scoring judgment:
- **Weighted scoring beats bucket-counting.** Real people are mixes; letting every answer contribute to several profiles produces results that feel diagnosed rather than sorted.
- **Verify every profile is reachable:** sum the max possible score per profile; if one can never win, rebalance. Then click through one answer-path per profile to prove it.
- **Write result profiles like a flattering-but-honest diagnosis**: name (identity they'd claim), what they're good at, the 2-3 gaps holding them back, and a CTA that maps THOSE gaps to the paid offer. The profile copy is where conversion happens: spend the words there, not in the intro.
- Question copy comes from voc.md / audience pain language when available: answer options that quote how prospects actually describe their situation get the "how did you know?" effect.

## Calculator skeleton

Structure: inputs → live calculation → headline result → gated full breakdown.

- **Inputs:** 3-6 fields max, each with label, placeholder showing a realistic value, sensible default, and min/max validation. Sliders for ranges people estimate (hours/week), number fields for things they know exactly (price).
- **Formula:** real math, in one pure JS function, with each step commented in plain English. No invented constants. Every coefficient either comes from the user's stated business logic or is asked for during build. If an assumption is unavoidable, surface it in the UI ("assumes 22 working days/month").
- **Output:** one big headline number, then interpretation bands (e.g., below X / X-Y / above Y) each with a one-paragraph "what this means for you". The band copy is the bridge.
- **Gate placement:** show the headline number ungated (proof of value), gate the full breakdown / personalized report / emailed copy. Gating the number itself reads as bait-and-switch and kills shares.
- Sanity-check the formula with one hand-calculated case and one absurd input (zeros, maximums) before shipping.

## AI-audit skeleton

"Paste your URL, get a scored teardown." Two pieces:

1. **Page** (single-file HTML or component): URL input → loading state with honest copy ("analyzing your page, ~20s") → email gate → scored results: total score, per-dimension scores, top 3 prioritized findings, CTA.
2. **API route template** (`api/audit.js` serverless function or Next.js route):

```js
// POST { url, email } → { totalScore, dimensions: [{name, score, finding}], topFixes: [...] }
// 1. Fetch the prospect's page (server-side; handle non-200 and timeouts with a clear error)
// 2. Score it against the RUBRIC below: extract concrete evidence (title, h1, CTA text, word count)
// 3. One LLM call grades the evidence against the rubric and writes the findings
//    ANTHROPIC_API_KEY=   <- set in your host's env vars, never in client code
// 4. Add basic rate limiting (per-IP, e.g. 5/hour). This endpoint costs you money per call
const RUBRIC = [
  // 4-6 dimensions, each with: what to check, what scores 9+, what scores <4
  // THE RUBRIC IS THE PRODUCT. It must encode the user's actual expert criteria:
  // ask the user for their checklist if they have one; never let the LLM freestyle.
];
```

The rubric must be specific enough that two runs on the same page score within a couple of points. Findings must quote evidence from THEIR page ("your headline 'Welcome to our website' names no outcome"): that specificity is the entire conversion mechanism, and it's what no generic chatbot can fake.

## Email gate pattern

Placement: **after the questions/inputs, before the results.** That's peak curiosity: they've invested effort and the answer is one field away. Gating up front converts like a login wall.

```html
<form id="gate">
  <p>Your result is ready. Where should I send your full breakdown?</p>
  <input type="email" required placeholder="you@company.com">
  <button>Show my result</button>
  <!-- Optionally one more field (first name). Every extra field costs signups -->
</form>
<script>
document.getElementById('gate').addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = e.target.querySelector('input').value;
  try {
    await subscribe(email, computeResult());   // ESP stub below
  } catch (err) { /* swallow the error: NEVER block the result on ESP failure */ }
  showResult();                                // result renders regardless
});
</script>
```

Send the segment with the email. The result profile / score band becomes an ESP tag, and /boring-marketing-email-sequences can then write per-segment follow-up. That segmentation data is half the reason to build interactive in the first place.

## ESP webhook stub

Ship a working function with the wiring visible and the key location obvious:

```js
async function subscribe(email, result) {
  // === CONNECT YOUR EMAIL PROVIDER ===========================================
  // Kit (formerly ConvertKit):
  //   POST https://api.kit.com/v4/subscribers   header: X-Kit-Api-Key: YOUR_KEY
  // Beehiiv:
  //   POST https://api.beehiiv.com/v2/publications/{pubId}/subscriptions
  //   header: Authorization: Bearer YOUR_KEY
  // Loops:  POST https://app.loops.so/api/v1/contacts/create   Bearer YOUR_KEY
  // Mailchimp: POST /3.0/lists/{listId}/members on your dc endpoint
  // Single-file HTML: don't put the key here in the browser. Point ENDPOINT at a
  // 10-line serverless function (or n8n/Make/Zapier webhook URL) that holds the key.
  // Verify the exact path against your provider's current docs before launch.
  // ===========================================================================
  const ENDPOINT = "YOUR_WEBHOOK_OR_FUNCTION_URL";
  await fetch(ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, segment: result.profileName ?? result.band,
                           source: "{magnet-name}" }),
  });
}
```

If brand context shows a known ESP key in `.env` (Kit/Beehiiv/Loops/Mailchimp), offer to wire the real call into the serverless piece instead of leaving the stub.

## Pre-ship QA (do, don't ask)

Run this silently and log results in `notes.md`. The handoff shows the working app and the README, not the QA log.

1. Open the file in a browser (or run the dev server). Click through every question path; reach every profile / every band.
2. Hand-verify one scoring case and one formula case against the declared logic.
3. Submit the gate with a test email: confirm the stub fires (network tab / console log) and the result still renders if the request fails.
4. Resize to 375px width. No horizontal scroll, tap targets usable.
5. Read every line of result copy out loud against the voice profile.

Ship the app together with a `README.md` in the campaign folder: how to deploy (drag to Netlify/Vercel), where the ESP key goes, how to change questions/formulas/rubric without breaking scoring.
