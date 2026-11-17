# Faults that break trust

**Load this when** running Phase 4. These faults sit in the page source, the redirects
or the site structure. Customers rarely see them directly, but they cost calls through
rankings, AI answers that repeat bad data, and customers who feel misled when the real
price or rating differs. The common versions below are described in general terms; check
each against the site in front of you.

## Made-up or stale prices

**Check:** read every price string on the page and in the structured data. The script
prints JSON-LD `priceRange` values and any FAQ answer containing a `$`. Then ask the owner
one question: "Is this what you charge?"

**Common version:** the FAQ structured data shows a price range the owner never charges.
The range was written by whoever built the site. AI answers and search snippets can
lift FAQ data word for word, so a wrong price travels further than the page.

**Fix:** state the real pricing model in words ("priced after we see the job, quoted before
we start"). If the owner won't publish numbers, describe how pricing works
instead of inventing a range. Keep the visible FAQ and its structured data saying the
same thing.

## Hardcoded review data

**Check:** compare any `aggregateRating` in the structured data with the live Google
profile. Read the `address` values the script prints; they should match where the
business really operates.

**Common version:** a perfect 5.0 rating hardcoded in the structured data, unchanged whatever the live profile says.

**Why it matters:** Google stopped showing review stars for a business's reviews of
itself in 2019. Its review snippet guidelines say pages where "the entity that's being
reviewed controls the reviews about itself" are ineligible for star results when they
use `LocalBusiness` or `Organization` markup, and that includes embedded Google or
Facebook review widgets. So hardcoded ratings earn nothing in search, and a number that drifts
from the live profile is a claim on the page that customers can check.

**Fix:** remove hardcoded ratings from the structured data. Keep one accurate
`LocalBusiness` (or trade subtype like `Plumber`) block with the real address or service
area. Show the live rating to people on the page instead, as text near the call button.

## Redirects that end on an error page

**Check:** collect every URL that sends people to the site (the Google profile's website
link, each ad's final URL, links on directories, old URLs from the sitemap or a site
crawl) and follow each one:

```bash
curl -sIL -A "Mozilla/5.0 (iPhone)" <url> | grep -iE "^HTTP|^location"
```

The last status should be 200. The script prints the same hops for one URL.

**Common version:** old URLs from an earlier version of the site redirect straight into a 404.

**Why it matters:** an ad or a profile link that lands on an error page wastes every click
on it, and links from other sites to dead pages stop counting.

**Fix:** point each old URL with one redirect at the closest live page. Re-run the curl
after deploying; redirect rules often interact with slash and www rules.

## Heavy images

**Check:** the script's first-images list (weights come from the server or a download),
or PageSpeed Insights' "properly size images" and "next-gen formats" items.

**Common version:** the homepage hero is a multi-megabyte desktop-size image served to every phone.

**Fix:** serve a phone-size WebP or AVIF for the hero, with the desktop version only at
desktop widths. On most site builders this is a setting or a plugin, not a rebuild.

## Duplicate town pages

**Check:** fetch two or three town pages and compare them with the town names removed:

```bash
python3 ${CLAUDE_SKILL_DIR}/scripts/page_facts.py <town-page-1> --compare <town-page-2> --compare <town-page-3> --town Plano --town Frisco --town Allen
```

Get the template floor first: compare one town page with a service page that you know is
unique. Shared menus, footers and calls to action make any two pages on a site partly the
same. Town pages far above that floor, with only the city swapped, are copies. A compared
page that redirects to another page isn't a page of its own; the script says so.

**Common version:** a set of town pages that are the same page with the city name swapped.

**Why it matters:** search engines treat near-copies as one page and pick which to show;
customers who land on one learn nothing about their town. The fix is fewer, better town
pages (real jobs, real drive times, the neighborhoods served) or folding thin towns into
one service-area page. `/boring-marketing-service-area-pages` and `/boring-marketing-local-seo-plan` cover how.

## Numbers that don't match

**Check:** list every phone number on the site (the script prints distinct numbers in the
text and the `telephone` values in structured data), on the Google profile (including
service descriptions and posts), and in directory listings. Each should be a line the
business answers and tracks.

**Common version:** an old or secondary number left in a corner of the Google profile or a directory listing sends calls to a line outside the call tracking, so those calls never show up in any report.

**Fix:** one main number everywhere a customer reads it, tracking numbers only where the
tracking tool swaps them in, and a quarterly look at the profile's text fields, which
are easy to forget.

## Reading the faults together

One fault is a fix. Several together (fake price, hardcoded rating, copied town pages)
usually mean the site was built from a template by someone who never asked the owner
anything. Say that plainly in the report: the cheapest fix may be one honest pass over
the whole site rather than a list of patches.
