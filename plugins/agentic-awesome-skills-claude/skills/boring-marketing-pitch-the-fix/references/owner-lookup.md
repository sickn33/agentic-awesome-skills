# Finding the owner and a real address

Load at Phase 3. Facts last checked 2026-11-13; registries and tools change their pages, so if a source below stops showing what it says, note it and move to the next one.

## Who to email

In a local business with under about 30 people, the owner decides on marketing. Above that, a general manager or office manager often does, and the owner still signs. Default: the owner. Second choice: the person who signs the review replies, because that person is already watching how customers see the business.

## Sources, in the order that usually works

| Source | What it gives | Cost | How to read it |
|---|---|---|---|
| The site's About, Team or Our Story page | Owner's name, often a photo and the founding story | Free | "Founded by", "owner", "president". A family name in the business name is a hint, not proof. |
| Owner replies on Google reviews | A first name signed under replies | Free | "Thanks, Dana" on forty replies is a strong signal. A reply signed "The Team" tells you nothing. |
| State license lookup | The license holder for the trade | Free | For a one-license shop, that's usually the owner. Bigger shops list a qualifier who may be an employee. |
| State business registry | Officers, managers, registered agent | Usually free to search; some states charge per search or per document | The registered agent is sometimes the owner and sometimes a filing service. Officers and managers are the better read. |
| BBB profile | "Business Management" and "Contact Information" names | Free | Often the owner, sometimes stale. Check the date on the profile. |
| LinkedIn | Title and tenure | Free, by hand | A person searches it. The agent never fetches it (login-walled) and nothing scrapes it. |
| Local news, Chamber pages, award write-ups | Owner quoted by name | Free | Good second source to confirm a name. |

**Texas example.** The Comptroller's Taxable Entity Search is free and shows the registered agent plus the officers or managers from the company's Public Information Report. The plumbing board's free license lists name a Responsible Master Plumber for each plumbing company. Two free sources that agree make a name confirmed.

## Confidence

- **Confirmed:** two independent sources agree (the registry and the review replies, the site and the license).
- **Likely:** one good source (the site says "owner", or the registry lists one manager).
- **Guess:** inferred (a family name in the business name). Write "Hi there", not a name.

## The address

Free path, in order:

1. Published on the site: the contact page, the footer, the privacy policy, a PDF form, the careers page.
2. Published elsewhere: directory listings, the registry filing, a press release, a trade association listing.
3. `dig MX {domain}` tells you whether the domain receives email at all and who hosts it. It does not tell you whether a person's mailbox exists. Run it only for a real domain the user gave, never a placeholder, and report it in one line at most.

Paid options, when the free path runs out: Hunter, Apollo, Snov.io and Clay all find and verify work emails, priced by credits or a monthly plan, most with a small free allowance. They differ in coverage for very small businesses, so test one on ten known owners before buying a plan.

Never send to a guessed pattern (first@domain) without verification. A bounce costs the sending domain's reputation for every email after it.

## What not to do

- Don't call the business pretending to be a customer to get the owner's name.
- Don't scrape LinkedIn or use tools that log into it as you.
- Don't buy a list and blast it. One owner, one email, one thing.
