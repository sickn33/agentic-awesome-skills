# Local service pages

**Load this when** LOCAL OFFERS has picked the page type (call-first, booking or quote)
and you're about to write `architecture.md`. It gives the section stack for each type,
the thank-you page, the build details that matter for local pages, and a worked example.
Everything else in the main skill (one job per section, proof placement, friction, the
build reference) still applies.

## Section stacks

Each stack is the default. Cut with the deletion test; add only with a reason.

**Call-first page** (urgent jobs)

| # | Section | Its one job |
|---|---|---|
| 1 | Slim header: logo, the number as a tap-to-call button | Let them call before reading anything |
| 2 | Hero: the promise headline (the ad's words), service + area, one proof line, the call button, "or text us" link | Confirm they're in the right place and get the call |
| 3 | What we fix today | Let them find their problem in their words ("water heater leaking", "no hot water") |
| 4 | How it works | Call, a tech on the way, the price before any work, the fix, clean-up. Removes the fear of the unknown bill |
| 5 | Pricing, honestly | The trip or dispatch fee, how quotes work, financing if real |
| 6 | Recent reviews | Three to five real Google reviews, recent, with first names; link to the profile |
| 7 | Service area | Towns and neighborhoods, so "do they come to me?" gets answered |
| 8 | FAQ | Real answers on price, timing, warranty, licensing |
| 9 | Closing call button, plus the sticky call bar throughout | Catch the scrollers |

**Booking page** (routine jobs)

Zip or address first (it qualifies the area and commits the visitor), then the service,
then a time slot, then contact details. The first screen holds the promise headline, the
proof line and the zip field. Price shown up front when it's fixed ("Drain cleaning,
$149"). The phone number stays visible for people who'd rather call.

**Quote page** (big jobs)

Promise headline about the outcome and the estimate ("Free roof inspection in Tampa, with
photos of what we find"), proof heavy (years, license, warranty, finished jobs with
photos), what happens at the estimate visit, financing if real, then a short form: name,
phone, address, one question about the job. Real price ranges for typical jobs help here;
an invented range does harm (see below).

## The thank-you page

After a form or booking, the visitor wonders whether it worked and keeps comparing. The
page confirms what happens next and when ("Sam will call you within 15 minutes, 7am to
7pm. Outside those hours, first thing next morning."), shows the number for anyone who
wants to call now, and lists what to have ready (photos of the leak, the model number).
No second offer, no newsletter signup.

## Build details that matter for local pages

The build reference (`references/landing-page-build.md`) is still the standard. Add:

- **Tap-to-call everywhere the number appears**: `<a href="tel:+12145550100">(214) 555-0100</a>`
  (sample number). The digits in the link match the digits shown, or the call tracking
  tool swaps both.
- **A sticky call bar on phones**, hidden on desktop:

```html
<a class="callbar" href="tel:+12145550100" data-cta="callbar">Call now: (214) 555-0100</a>
<style>
  .callbar { position: fixed; left: 0; right: 0; bottom: 0; padding: 14px; text-align: center;
             background: var(--accent); color: #fff; font-weight: 700; z-index: 50; }
  @media (min-width: 720px) { .callbar { display: none; } }
  body { padding-bottom: 56px; } /* keep the footer clear of the bar */
</style>
```

- **Tag calls like CTA clicks** (`data-cta="callbar|hero|closing"`) so the analytics stub
  can count call taps per placement. `/boring-marketing-google-ads-tracking` makes the ads count them.
- **Structured data, honestly.** One `LocalBusiness` block (or the trade subtype, like
  `Plumber` or `Dentist`) with the real name, address or service area, phone and hours.
  Never hardcode an `aggregateRating`: Google ignores a business's markup of its own
  reviews for star results, and a baked-in "5.0" that drifts from the live profile is a
  lie on the page. Show the live rating to people as text instead.
- **FAQ prices are real or absent.** FAQ text and its JSON-LD get quoted by AI answers.
  A range someone made up becomes the price customers expect.
- **Real photos over stock.** The truck, the crew, finished jobs. Stock photos of smiling
  models in clean uniforms are recognized instantly.

## Worked example (sample business)

Hartline Plumbing, Dallas TX (hartlineplumbing.com) is a sample business, not a real one.
Its Google Ads run three ad groups:

| Ad group | Ad promise (exact words) | Page type | Headline |
|---|---|---|---|
| Emergency | "24/7 Emergency Plumber. Same-Day Service in Dallas." | Call-first | "24/7 Emergency Plumber in Dallas. Same-Day Service." |
| Drain cleaning | "Drain Cleaning $149. Book Online Today." | Booking | "Drain Cleaning in Dallas, $149. Book Online Today." |
| Water heater replacement | "Free Water Heater Estimate. Installed Next Day." | Quote | "Free Water Heater Estimate. Installed Next Day in Dallas." |

Before, all three sent clicks to the homepage, whose first screen said "Quality Plumbing
Since 1998". None of the three promises appeared on it. After, each ad group opens its
own page, each headline repeats its ad's words, and the proof line under each one is the
same true sentence: "4.8 stars from 312 Google reviews. Licensed and insured in Texas."
(Numbers illustrative.)

`architecture.md` for the emergency page records: the page job (call-first), the ad text
verbatim, the second path (a "text me back" form with name, phone and what's wrong), the
sections kept from the call-first stack and the two cut (pricing folded into How it works,
FAQ cut to four questions), and the friction count (3 fields, 1 exit link to the reviews
profile).

## A non-local contrast

A software company running "Free for teams under 10" ads needs none of this section: no
call bar, no service area, no estimate visit. Its page follows the main skill's
cold-traffic or warm-list stack, and the promise-match rule still applies: "Free for teams
under 10" in the hero, word for word.
