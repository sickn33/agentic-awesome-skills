# The first-screen checks, in detail

**Load this when** running Phase 3. Each check has: what the customer is asking, how to
verify it (screenshot first, HTML second), what passes, the edge cases that fool a quick
look, and the plain sentence for the report on why it costs calls. These are checks with
judgment, not a score. Two "almost" passes on the ad page matter more than five clean
passes on the About page.

## 1. Promise match

**Asking:** "Is this what the ad said?"

**Verify:** put the Phase 1 promise words next to the screenshot. In HTML-only mode, pass
each promise to `page_facts.py --promise "<words>"` and read its word position against the
H1's position.

**Passes:** the promise appears on the first screen in the same words, ideally in the
headline or the line right under it. "24/7" on the ad means "24/7" on the page, not "open
late" or "always here for you".

**Edge cases:**
- The promise is in a slider's second slide. Customers don't wait for slide two. Treat it
  as missing.
- The promise is in an image of text (a banner graphic). It counts for the customer if
  it's readable at phone size, but search engines and AI answers can't read it. Note it.
- The ad sends every keyword to the homepage. The fix is usually a page per promise (an
  emergency page, a free-estimate page) rather than cramming every promise into one
  headline.
- The page says the promise but the business can't keep it (no one answers at 2am). That
  is an operations problem wearing a marketing costume. Flag it to the owner and don't
  write the headline until it's true.

**Why it costs calls:** a click that doesn't see what the ad promised goes back to
Google, and the click is still paid for.

## 2. The number and one tap

**Asking:** "Can I call right now?"

**Verify:** the number is visible on the first screen and is a `tel:` link (the script
lists every `tel:` link and its position). Tap target: on the screenshot, the button or
number should be big enough to hit with a thumb, about the height of a line of large
text or more. Then scroll: does a call bar or header with the number stay on screen?

**Passes:** visible, tappable, dials the number shown, and stays reachable after scrolling.

**Edge cases:**
- A "Call Now" button whose link is `#` or opens a contact page. That's a broken call
  button. Read the href.
- `tel:` links with letters, spaces or a missing country code usually still dial on
  phones, but a link whose digits differ from the number shown is a real fault unless
  it's call tracking (see SKILL.md, Phase 2 traps).
- The number appears only in the header logo image. Not tappable, not readable by search.
- Desktop-first sites that hide the number behind the hamburger menu on phones.

**Why it costs calls:** most of a local business's money is calls, and a caller who can't
find the number rings the next business on Google. Once they scroll, calling means
scrolling all the way back up, and some don't.

## 3. A headline that says what and where

**Asking:** "Is this the right kind of business, near me?"

**Verify:** read the H1 and the biggest text on the first screen. They're often different;
the customer reads the biggest text.

**Passes:** names the service in the customer's words and the area. "Emergency Plumber in
Dallas" passes. "Your Comfort Is Our Mission" fails. The business name alone fails unless
the name says the trade.

**Edge cases:** a multi-trade company (plumbing, HVAC, electrical) can lead with the trade
the ad or search was about. That's one more reason ads need their own pages.

**Why it costs calls:** someone skimming from Google can't tell at a glance they're in the
right place.

## 4. Proof

**Asking:** "Are they any good, and safe to let into my house?"

**Verify:** look for the star rating with the review count and the source ("4.8 stars,
312 Google reviews"), years in business, licensed and insured (with the license number
where the trade has one), a guarantee. Compare the number on the page with the live
Google profile.

**Passes:** the strongest true proof sits on the first screen, near the call button. One
line is enough.

**Edge cases:**
- Rating widgets that load late or only on desktop. Trust the phone screenshot.
- A rating on the page that's higher or older than the live profile. Customers check.
  Update it or drop the count and link to the profile.
- Weak proof (under about 4.3 stars or a few dozen reviews). Don't advertise it; lead with
  years, license and guarantee and send the review problem to `/boring-marketing-reviews`.
- Logos of brands they install (Rheem, Carrier) are fine but aren't proof of the business.

**Why it costs calls:** their best proof never reaches the visitor who is choosing who to
call. Licensed, insured and guaranteed are what people look for before they let someone
into their home.

## 5. A way to act without calling

**Asking:** "I can't talk right now. Can I still book?"

**Verify:** a booking link or a short form reachable from the first screen (a button that
scrolls or opens it counts). Count the visible fields; the script prints them per form.

**Passes:** a booking button or a form of a few fields (name, phone, what's wrong, maybe
zip). Each field past what the next step needs is a reason to give up on a phone.

**Edge cases:** a form that only appears on the Contact page; a booking widget that takes
over the whole screen on load; "Request a quote" that opens a 15-field form. For urgent
trades, keep the call first and the form second. For routine services, booking can lead.

**Why it costs calls:** people who can't call from work book with whoever lets them, and
every extra question on a phone is a chance to give up and call someone else.

## 6. A reason to call today

**Asking:** "Why these people, and why now?"

**Verify:** availability ("Techs available today in Dallas"), a response time ("on site in
90 minutes"), a time-limited or first-visit offer, or a price anchor ("$79 trip fee,
credited to the repair").

**Passes:** at least one true, specific reason on the first screen.

**Edge cases:** fake urgency (a countdown that resets) costs trust once noticed. "Call
today!" with no reason is not a reason.

**Why it costs calls:** someone comparing three businesses calls the one that gives them a
reason to call now.

## 7. Nothing in the way

**Asking:** "What is this thing covering the page?"

**Verify:** the 3-second screenshot. The script lists chat, popup and cookie tools it
finds in the HTML, but only the screenshot shows whether they cover anything.

**Passes:** the headline and the number are visible without closing anything.

**Edge cases:** a cookie banner required by law in some regions can stay, but small and at
the bottom. A chat bubble sitting on top of the sticky call button is common and takes
five minutes to move.

**Why it costs calls:** the first thing someone sees after tapping through from Google is
something to close, not the business.

## 8. Speed on a phone

**Asking:** nothing. They just leave when the screen stays blank.

**Verify:** PageSpeed Insights (pagespeed.web.dev, mobile) for the overall read; the
script's image weights for the usual culprit; the HTML size line for page builders that
ship megabytes of markup.

**Passes:** the first screen appears quickly on a phone connection and the main image is
sized for a phone (well under 1 MB; a few hundred KB at most for a photo).

**Edge cases:** a background video in the hero. It rarely helps a local page and almost
always slows it. A desktop-size image (2,000+ pixels wide) served to phones.

**Why it costs calls:** someone who sees a blank screen taps back and calls the next result.
