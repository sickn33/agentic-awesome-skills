---
name: work-humanizer
description: '''Make this sound human'', ''less AI'': edit AI-sounding work writing so a careful person could have written it, without changing what it says.'
risk: safe
source: https://github.com/phuryn/product-engineering
source_repo: phuryn/product-engineering
source_type: official
license: MIT
license_source: https://github.com/phuryn/product-engineering/blob/8ebb50bb1b28dc9e8bc669199493e6020b808cc6/LICENSE.md
author: Pawel Huryn
upstream_commit: 8ebb50bb1b28dc9e8bc669199493e6020b808cc6
date_added: '2026-11-21'
category: development
---

# work-humanizer

## Operational boundaries

Keep the scope, sandbox, credentials and approval settings supplied by the user or host. Obtain authorization before delegating, exposing project files to another provider, enabling connectors or hooks, using paid services or deploying. Use synthetic or redacted inputs for examples. Keep security reviews static and defensive, with findings and fixes grounded in source inspection.

## When to Use

'Make this sound human', 'less AI': edit AI-sounding work writing so a careful person could have written it, without changing what it says.


Make the text read like a specific person wrote it for a specific reader. Keep every fact. Invent nothing.

Three things we measured shape everything below:

1. **Readers notice texture.** Emphasis with no information in it, uniform rhythm, generic claims, and sentences that do the reader's thinking for them. Those are fixable by editing.
2. **Detectors read composition, not words.** A human-written article stayed 99-100% human on a commercial detector after AI formatting, an AI copyedit, and a full AI sentence-by-sentence rephrase. The same piece composed by AI from its outline scored 68% human, and a style-targeted rewrite of that AI version moved it one point. In our October 2026 test, rewrites of AI drafts by this skill, by blader/humanizer, and by a bare prompt all stayed AI on that detector, while versions built from the writer's own sentences scored human roughly in proportion to how many of those sentences survived. An assistant model rewording a draft does not change who composed it. (A paraphrase model trained against detectors did flip the score, and in the same test it cost meaning and quality.) Never promise "undetectable". If the writer needs text that is genuinely theirs, use interview mode.
3. **Specifics carry the human signal.** Density of numbers, names, and dates was the one signal that tracked reader response across the creators we studied. You may only use specifics that are in the source or that the writer gives you.

## Pick the mode

**Rewrite mode** (default). The user gives you text; you edit it.

**Interview mode.** Use it when the user asks for it, or when the writer can answer and the text fails this test: *could anyone with the same one-line request have written it?* If yes, it is missing what only the writer knows (the real example, the number behind "significantly", what went wrong, what they actually think), and no edit can supply that. This is the usual case for posts, newsletters, essays, bios, talk abstracts, pitch emails, landing pages, job posts, and launch stories. Rewrite without asking when the text is operational and its facts are all present: a Slack update, a support answer, a release note, a policy, a doc.

## Interview mode

Ask one round of at most 5 questions, then write.

- **Each question fills a gap a reader would feel.** The real example, the number, the name, what happened, what the writer actually thinks, what they would tell a friend. Quote the line the answer will replace.
- **Ask for narration, not a form.** "In two or three sentences, the way you'd say it out loud: what happened the first time a customer used it?" beats "Please provide a customer example."
- **Make it cheap.** Each question answerable in under a minute. Say they can skip any.
- **Never ask about tone, audience, or format** unless you truly cannot infer it.

Then compose from their words:

- **Their sentences are the material.** Keep their phrasing, their order, their odd word choices. Edit only for clarity, grammar, and length. Rewording keeps the writer's fingerprint; recomposing replaces it with yours.
- **Use the AI draft as a checklist of points, not as the skeleton.** The draft's sentence skeletons carry its AI signature. Where the writer and the draft disagree, the writer wins.
- **A skipped question gets a plainer sentence or a cut**, never an invented detail.

### When the writer gives you notes or a voice memo

Notes, a voice-memo transcript, or a rough draft the writer wrote themselves are the main material, not background for an AI draft. They already carry the writer's reasoning, and readers and detectors recognize a writer by their reasoning: their claims, the order they make them in, their "because" and "so", their examples.

- **Their structure is the skeleton.** Their claim order, their because/so links, their examples where they put them. If they argue A because B, so C, the piece goes A, B, C, not an AI draft's order.
- **Their sentences stay whole where possible.** Edit only for clarity, grammar, and length; keep their odd word choices.
- **An AI draft, if there is one, is a checklist.** It may only add a point the writer's notes confirm, placed where it fits their argument. Never borrow its skeleton, transitions, or framing.
- **The notes are the source for the fact audit.** Every fact, commitment, and caveat in the writer's notes must survive. A fact that appears only in the AI draft is optional: keep it where it supports the writer's argument, drop it where it doesn't. It must still be accurate, and you may not add anything that is in neither.
- **Ask only what the notes leave open.** If they already cover the point, the example, and what the reader should do, write without asking.

## Rewrite mode

1. **Read for the job.** Genre, reader, and what the reader must know or do afterwards. Decide where the point goes and commit: answer-first for replies, emails, Slack, and announcements; evidence-first for explanations and arguments. A text that states its point in line 1 and builds to the same point at the end has done both. Cut one.
2. **List the facts, with their certainty.** Every number, name, date, claim, commitment, caveat, link, and call to action, plus the qualifier attached to each ("could", "typically", "about", "helped", "the remaining piece"). This list must survive intact.
3. **Write it fresh.** Put the draft aside. From your step 2 list, write the piece the way this writer would write it for this reader (see "Sound like a person"): their speaker, their register, plain spoken sentences in normal word order. Do not edit the AI sentences in place; a patched AI draft still reads like one. Reuse the draft's exact words only for names, the reader's own terms, and the wording of commitments and conditions. Fresh wording, same claims: every claim in the draft appears in your version at the same strength, no stronger and no weaker.
4. **Keep the claim, drop the formula.** A stock line (a generic moral, a value pitch, a gratitude formula, a vague benefit) still carries something the writer meant to say. Say that thing once, plainly, in the writer's voice: "Those visits helped us get here" becomes "We wouldn't have made it ten years without you coming in." Cut a stock line only when it repeats something already said.
5. **Cut and fix.** Now edit your version: delete filler, restatement, and hype; fix every tell below, strongest first (a colon reveal, a triad, a stock closer, a generic wrap-up line). Cutting must not leave it clipped: if the draft was not padded, your version should be about as long as the draft. Voice, concrete detail, connective words, and the warmth a genre needs are not padding. Let sentences breathe: use the small words people use when they talk (so, and, but, just, then), and never squeeze two ideas into one clipped clause.
6. **Fix rhythm and flow** (section E).
7. **Run the final checks**, including the fact audit against the original draft.

### What you must not change

- **Certainty.** Keep the level, not necessarily the words. "Could help reduce" is not "cuts", "typically" is not "always", "the remaining piece" is not "the only big piece". But one qualifier is enough to carry it: "can help spot changes before noticeable symptoms appear" can become "can catch changes before you'd notice symptoms".
- **Reasons and conditions.** Don't add an explanation, a cause, an eligibility rule, or a benefit the writer didn't state, even an obvious one.
- **Vague into vaguer.** When a claim is vague and you have nothing specific, keep the writer's words or cut the sentence whole. Never swap in a vaguer phrase ("Premium adds more to the app").
- **Who does what.** Keep the actor ("we'll email you" stays with "we" unless the writer is clearly one person).

## The tells, strongest first

### A. Staging: emphasis that adds no information

- **Contrast with a claim nobody made.** "It's not X, it's Y", "not just X but Y", "This isn't about X. It's about Y.", a clipped "no X, no Y" tail. State Y. Keep the contrast only when readers really believe X.
- **Pause-and-point.** "Here's the thing:", "Here's what matters:", "Let me be clear:", "Let's break it down.", the one-line colon reveal ("The best part: it learns."), and a count announced before a list ("This hurts in four ways:", "Three things changed:"). The point should simply be the next sentence.
- **Restating closers.** "The bottom line?", "Key takeaway:", "That's the real win.", "And that's why X is the future.", "What do you think?", "Thoughts?" End on the last concrete thing, or on one line of what the writer concludes.
- **Aphorisms and stacked parallel lines.** "Less clicking. More building." "Automation executes. Agency decides." Budget: at most one crafted, quotable line per piece, and zero is fine. Experienced writers average zero to one even in long posts. Flatten the rest into plain statements that keep the fact.
- **Fragment stacks in prose.** "No setup. No config. Just results." Merge into one sentence with a subject and a verb. Lists are exempt.
- **Invented metaphor labels.** A clever image that names nothing the reader can use ("a comfort blanket", "the operating system for your team"). Say the plain thing.

### B. Doing the reader's work

Six patterns. Test each sentence by deleting it: if the reader can still recover the meaning, leave it deleted.

1. Defining a word the reader knows ("Revoke the token, which invalidates the session.").
2. Spelling out the implication ("This means that...", "In other words..."), including the trailing -ing rider (", highlighting the team's commitment to...", ", underscoring...", ", reflecting a broader shift").
3. Stating the conclusion the facts already delivered ("So the lesson is...").
4. Pointing ("Notice how...", "As you can see...", "What this shows is...").
5. Telling the reader how to feel ("This is exciting.", "This should worry you.").
6. Narrating transitions ("Now let's look at...", "Moving on to..."). One signpost per major section is fine in a long, sectioned document.

### C. Inflation and generic claims

- **An adjective with no specific behind it** ("significant", "seamless", "powerful", "robust", "game-changing"). Attach the number, name, or mechanism the source gives, or cut the adjective. Never supply a number the source lacks.
- **Inflated significance.** "a pivotal moment", "a testament to", "reshaping the landscape", "the future looks bright". Keep the fact, drop the significance.
- **Marketing register outside marketing**, and stock AI vocabulary. Lists in `tells.md`. One hit is weak; several together are the tell.
- **Constructions nobody says out loud.** "The recommended approach is X" becomes "Do X". "Serves as" becomes "is". Nominalizations ("perform an evaluation of") become verbs. Op-ed verbs for sources ("posits", "contends", "asserts") become "says" or "writes". The test: would you say this sentence to a smart friend over coffee? If you'd say something plainer, write that.
- **Vague authority.** "Experts agree", "studies show", "many companies". Name who, if the source does. Otherwise cut or scope it ("in our tests").

### D. Hedges in the wrong place

People state facts flatly and hedge their opinions. AI text does the reverse, or hedges everything.

- Facts bare: don't add hedges to facts. A qualifier the writer chose ("typically", "about", "could") is part of the fact: keep one, cut the stack around it.
- An opinion gets one marker ("I think", "probably", "in my experience"), never two in a sentence.
- Cut filler hedges everywhere: "arguably", "it's worth noting", "it's important to note", "it could potentially".
- When a claim needs a qualifier, name the case where it doesn't hold instead of softening it: "For regulated teams, a manual review still wins."
- Never add an absolute ("everyone", "always", "nobody", "the first") the source cannot back.

### E. Rhythm by rule

- **Sentence length.** AI prose clusters in one band, usually 10-20 words. If more than about 70% of sentences sit within five words of the median, vary them, in the right direction. Uniformly long: split one or two and add a short sentence that lands a fact. Uniformly short and choppy, the usual result of removing dashes and fragments: merge into a longer sentence that breathes (25-40 words). The human writers we measured ranged from 12% to 66% in that band. A short sentence must carry something; "It works." carries nothing.
- **Openers.** AI starts too many sentences with The, It's, That's, This, and You. Vary them.
- **Triads by reflex.** Keep three items only when there are three things.
- **The shuffle test.** If you could reorder the sentences without losing meaning, the text is a stack of facts, not an argument. Rebuild the spine so each sentence leans on the one before (cause, contrast, example, consequence). Do not sprinkle connectors to fake it.
- **Filler transitions at the start of a sentence.** Additionally, Furthermore, Moreover, However, Importantly, Ultimately, In conclusion, That said. Cut or restructure. Plain "But", "So", and "And" are fine when they do work.
- **Synonym cycling.** If two words name the same thing (the tool, the report, the feature), use the same word every time. Readers stop to wonder whether "the platform" and "the solution" are two things.

### F. Punctuation and formatting

- **Em dashes and spaced en dashes:** remove them, unless the writer's own writing uses them. Pick the substitute by context: colon for label-then-description, period for two complete thoughts, parentheses for a real aside, comma for a light pause. **Not a semicolon:** AI edits reroute dashes into semicolons (we measured 2.9 per 1,000 words in AI-edited posts against 0.3-0.4 in the same writer's own prose). And not a colon reveal (section A).
- **Bold-label paragraph starts** ("**Speed.** The new engine..."), bold sprinkled on phrases, emoji bullets, Title Case Headings: remove.
- **Labels that say nothing.** If every item carries the same label ("Mitigation:", "Benefit:", "Impact:") or the label just repeats its sentence, drop the labels and write the items as sentences. Keep lists and headings where the reader will scan or come back: release notes, specs, steps, options to compare, a reference page.
- **Exclamation marks:** at most one, and only where a person would actually exclaim. Never to fake enthusiasm.

### G. Chat residue

"Great question!", "Certainly!", "I hope this helps", "Let me know if you'd like...", "Here's a revised version:", "As of my last update". Remove the wrapper, keep the content.

## Sound like a person, not a costume

Removing tells is half the job. Plain is not flat. Write the way a competent person in this role writes this genre for this reader, as if saying it to them across a table:

- **Contractions by default** (it's, we're, you'll, don't, that's). Drop them only in formal documents: policies, contracts, formal PRDs.
- **The speaker talks as themselves.** Keep the draft's speaker ("we" stays "we", "I" stays "I"), but let them speak in the first person instead of describing themselves from outside ("The team will review" becomes "We'll review" when the team is writing).
- **Talk to the reader as "you"** wherever the genre addresses a reader.
- **Everyday verbs**: use, help, start, need, fix, send. Not utilize, leverage, facilitate, ensure, enable.
- **Ownership**: "I'll send the tracking number", not "Tracking details will be provided".
- **Warmth where the genre is personal.** A thank-you, an apology, an invitation, a celebration, a note to customers: say the warm thing plainly, once ("Thanks for sticking with us."). One exclamation mark is fine where a person would actually exclaim.
- **Match the room.** Casual where the context is casual (Slack, a community newsletter, a shop's social post); plain and professional where it is formal (PRD, memo, policy). Formal still means plain verbs and complete, natural sentences.
- **Conversational, not colloquial.** Plain spoken English carries the voice. At most one idiom or slangy phrase per paragraph; a cluster of them ("pointy end up", "a natter", "the hard bit") reads as a humanizing pass.

Do not bolt on personality. "Honestly,", "Quick heads-up", "Not bad.", "On a happier note", a rhetorical question to sound chatty, a joke the writer didn't make: readers spot an inserted casual pass as fast as they spot AI polish.

## Keep what is already human

- Specific details, unusual word choices, opinions, asides, humor, doubt, mixed feelings. These are what you are protecting.
- The reader's working vocabulary: product names and technical terms they would type or search for. Cut jargon that performs expertise; keep terms that let the reader act.
- Genre conventions. A release note can be a list, a PRD can have headers, a support reply can be warm, a letter can have a sign-off.
- If the user gives a writing sample, match its sentence length, punctuation, openings, and register. The sample overrides the rules above.
- **No fake noise.** No planted typos, forced slang, lowercase costume, "lol", or invented "I remember when" stories. Human texture comes from specifics and decisions, not from imitated mistakes.

## Genre notes

- **Slack, DM, reply in a thread:** the answer or the ask goes first. Cut background the reader already has. One to four sentences is often enough.
- **Cold email:** one specific reason you are writing to this person, from the source, and one ask. No "I hope this finds you well".
- **Social post:** line 1 is the most concrete thing in the post. No engagement-bait closer, no hashtag pile.
- **Release note or product update:** what changed, who it is for, what to do, with the numbers. No "We're thrilled to announce".
- **Landing page:** the concrete outcome and how it happens. Cut empower, unlock, seamless, elevate.
- **Docs, PRDs, policies:** plain and precise; keep the structure; hedge only real uncertainty.

## Final checks (every time)

1. **Fact audit.** Recomposing is where facts slip, so check sentence by sentence against the original draft (when you wrote from the writer's notes, against their notes; see that section). Every number, name, date, price, quote, condition, commitment, benefit, and caveat is present, with the same value and the same certainty, and the speaker is unchanged. Watch the strength words: "can help" must not become "will", "might" must not become "would", "little" must not become "no", a proposal must not become a promise, and nothing gains "only", "every", "always", or "guaranteed". Do not make explicit what the draft left implied. Then the other direction: the rewrite adds no fact, example, anecdote, reason, benefit, opinion, or detail the writer did not give. Warmth and voice are allowed; new content is not.
2. **Mechanical sweep.** Search the final text for em dashes (U+2014), en dashes (U+2013), semicolons, and the lists in `tells.md`. Eyes miss them. If you can run code: `python check.py <file>`.
3. **Crafted lines:** one or none.
4. **Rhythm:** the band and the openers.
5. **Read it aloud as the writer.** Anything they would not say gets plainer.
6. **Length.** Shorter than a padded input; about the same as an input that was not padded. Never cut a fact, the voice, or the warmth the genre needs to get there.

## What to return

Rewrite mode: the final text. If the user wants notes, add up to five bullets on what changed, plus any spot where a real specific would help ("A real customer number would make this line land"). Interview mode: the numbered questions first; after the answers, the final text.

**Offer a shorter version on request or when there is a material cut.** Look for a repeated point, a generic opening or close, or a second argument that could move to a follow-up. Keep the proof and the stakes, including examples, numbers, commitments and disclosures. If proposing a cut, name it and say where any displaced fact could go. Write the shorter version in full when the writer asks.

## How you can tell it worked

A careful reader can't tell the text came from a model, and every claim, number and commitment in it is unchanged.

Adapted from [Pawel Huryn’s upstream skill](https://github.com/phuryn/product-engineering/tree/8ebb50bb1b28dc9e8bc669199493e6020b808cc6/work-humanizer/skills/work-humanizer).
