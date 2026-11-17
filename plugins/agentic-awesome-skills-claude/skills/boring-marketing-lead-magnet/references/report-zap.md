# Worked Automation: The Free Report Zap

Load when the magnet is a personalized report delivered by email ("send us your website,
get a free review"), or when the user wants a lead magnet that runs without them. The
example is an agency or freelancer who markets local businesses: an owner enters their
website and email, and a few minutes later gets a short, specific report on their site.
The same shape works for any "your data in, your report out" magnet.

## The four steps

1. **Trigger: a new form entry or sheet row.** Any form that can feed Zapier works (Google
   Forms, Typeform, Tally, a form on the agency's site, or a Zapier Interfaces page), or a
   new row in a Google Sheet. Collect only what the report needs: website, email, first
   name, business type, city.
2. **Read the prospect's site.** A web-reading step fetches the page text (Zapier has
   built-in options; a scraping API through a webhook step also works). The homepage is
   enough for a short report. Some sites built on heavy scripts return little text, so the
   prompt must handle "couldn't read much".
3. **AI writes the report as HTML.** AI by Zapier, or an OpenAI or Anthropic step, takes the
   page text and writes one email-ready HTML body.
4. **Email it.** Gmail, Outlook, or a transactional email service, with the HTML from step 3
   as the body and the email from step 1 as the recipient.

## The prompt, in this order

```
[The site text field from step 2, first]

OUTPUT FORMAT (follow exactly):
- Return one HTML email body only. No markdown, no code fences, no commentary.
- Inline styles only. Max width 600px. Background #FFFFFF, text #1A1A1A, accent #____.
- Under 400 words.

TASK:
You are reviewing the website of {first name}'s {business type} in {city} as a customer
would see it on a phone. Write a short report with:
1. One sentence on what the business does well, quoted from the page.
2. The three changes most likely to get more calls, most important first. For each: what
   you saw (quote it), why it costs calls, and the fix in one sentence.
3. One next step: reply to this email to get the fixes done.

RULES:
- Only state what is on the page text above. If something wasn't visible (no phone
  number, no prices), say "I couldn't find..." rather than guessing.
- No statistics unless they are on the page. No made-up competitors.
- If the page text is nearly empty, say the site couldn't be read and offer a manual review.
```

The review method inside the TASK block is where the expertise lives. Swap in the
checklist from `/boring-marketing-first-screen-check` or the agency's own audit rubric.

## Lessons from building one

- **Format rules go before the long instructions.** When a long method block came first,
  the model followed the method's own output format and ignored an HTML instruction placed
  at the end.
- **Name the colors.** Without explicit hex values the first pass chose its own palette.
- **Delete auto-created output fields.** Zapier may infer several output fields from the
  prompt. To get one HTML blob for the email body, remove them.
- **Watch the prompt length.** The AI by Zapier prompt was silently cut at 50,000 characters on save (observed Sep 2026). Put the site field first and keep the prompt well under the limit.
- **Set the wait on the thank-you page.** Live runs took about 3 to 4 minutes and editor previews about 8, so "your report arrives in about 5 minutes" is honest.
- **Test with a real site** through the AI step's own preview before turning the Zap on.
- **Count the cost.** Each run uses several Zapier tasks plus the AI step. Check the plan
  before pointing paid traffic at it.

## Variations

- **Two deliverables.** Add a fifth step: the AI also writes a forwardable, business-branded
  asset (for example "The 12-Point Home Systems Check" for an HVAC company), and a second
  email sends it. The owner gets something useful to give their own customers, and the
  agency gets a reason to follow up.
- **A local business's own version.** A homeowner enters their address, system age and a
  photo; the report is a repair-or-replace read and a price range from the owner's rules.

## Deploying it

Put the form on a page with one promise ("A free 3-point review of your website, in your
inbox in 5 minutes"), and route replies to a person. Follow-up belongs to
`/boring-marketing-email-sequences`: the report's next step is a reply or a booked call, and a short
follow-up goes to anyone who didn't reply.

Only run it on sites people submit themselves. Running it on a scraped list and emailing
the results is cold outreach, with its own rules (in the US, CAN-SPAM), and it belongs to
`/boring-marketing-pitch-the-fix`.

## Building it

Two options, roughly equal in result:

- **By hand in the Zapier editor.** Straightforward for anyone who has built a
  multi-step Zap.
- **In Make or n8n** with the same shape: trigger, HTTP fetch, LLM call, email.
