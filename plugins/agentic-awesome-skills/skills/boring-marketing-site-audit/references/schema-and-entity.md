# Structured data and the business entity

Load this before recommending any markup, and when a finding touches structured data,
the business name, or the phone number. The judgment here is that markup only helps
where the page already says the thing, and that a business which describes itself the
same way everywhere is easier for search engines and AI answers to recognize.

## Which markup is worth recommending

Recommend a type only when the page content supports it. Markup that claims something
the page doesn't show is worse than none.

| Type | Recommend when | Skip when |
|---|---|---|
| Organization, or LocalBusiness and its subtypes (Plumber, Dentist, RoofingContractor...) | Always, once, on the homepage (and the contact page for a local business) | Never skip; it's the one block worth adding everywhere it's missing |
| WebSite | The homepage; it names the site | Rarely matters on its own |
| BreadcrumbList | The site has real breadcrumbs on the page | No visible breadcrumb trail |
| Article / BlogPosting | Editorial pages with a headline, a date and an author | Service and product pages |
| Product with Offer | A page selling one product with a visible price | Category pages, service pages without set prices |
| Service | A service page that names the service, area and provider | As a substitute for real page content |
| FAQPage | The questions and answers are visible on that page | Questions hidden from visitors, or written only for the markup. Rich results for FAQ are gone, so its value is a clean Q&A structure, not a search feature |
| Event, Recipe, VideoObject, JobPosting | The page is that thing | Anything else |
| HowTo | Don't add it | Rich results ended in 2023; leave existing markup alone unless it's broken |
| AggregateRating / Review about the business itself | Don't add it | Google doesn't show stars for reviews a business publishes about itself, and a fixed rating that never changes looks fake |

Prefer fixing what's there over adding more. A page with broken JSON-LD gets nothing
from it; fix the syntax before anything else (Google's Rich Results Test and the Schema
Markup Validator both point at the failing line).

## The business block

The homepage block names the business once, the way it is named everywhere else. Fill
it only from facts the owner confirms or the site and Google Business Profile already
show. Never invent a profile, a founding date or an address.

```json
{
  "@context": "https://schema.org",
  "@type": "Plumber",
  "name": "<exact business name, as on the Google Business Profile>",
  "url": "https://<domain>/",
  "logo": "https://<domain>/<logo file>",
  "telephone": "<the main number>",
  "address": {"@type": "PostalAddress", "streetAddress": "<street>", "addressLocality": "<city>", "addressRegion": "<state>", "postalCode": "<zip>"},
  "areaServed": ["<town>", "<town>"],
  "sameAs": ["<Google Business Profile URL>", "<Facebook page>", "<other real profiles>"]
}
```

Service-area businesses that don't serve customers at an address can leave out the street
and keep the city. Software and online businesses use Organization and drop the address.

## Entity consistency

Search engines and AI answers decide which business a name refers to from the places it
appears. The audit flags the inconsistencies it can see on the site; the fix list should
ask the owner to check the rest.

- **One name.** The same spelling in the title tags, the business markup, the footer,
  the Google Business Profile and directory listings. For the sample business, "Hartline
  Plumbing" and "Hartline Plumbing & Drain LLC" read as two businesses to a machine.
- **One main phone number.** The audit lists every number it found in tap-to-call links
  and markup. Several numbers can be deliberate (call tracking, separate locations); ask
  before calling it a mistake. The number in the markup should match the Google Business
  Profile.
- **sameAs only to real profiles.** List the business's own Google Business Profile,
  social pages and directory listings that exist today. A sameAs to a profile that
  doesn't exist, or belongs to someone else, is the one way this markup can do harm.
- **Name collisions.** When the business shares its name with another company or a
  common word, consistent markup and an About page that states what the business is,
  where, and since when, matter more. Checking how AI answers resolve the name is
  `/boring-marketing-ai-search` work.
