---
name: social-media-setup
description: 'Social media register: platforms and handles, post captions and hashtags, publishing cadence, approval status and profile checklist. Use for social account setup.'
category: business
risk: safe
source: self
source_type: self
date_added: "2026-09-27"
author: WHOISABHISHEKADHIKARI
tags: [sme, social-media, facebook, linkedin, tiktok, facebook-page, content-calendar, profile, cadence, brand-voice, csv, sql, notion]
tools: []
source_repo: WHOISABHISHEKADHIKARI/sme-ops-system-builder
---

# Social Media Setup

**What it is:** the business on the channels it can actually sustain - Facebook Page,
LinkedIn company page, TikTok - with each profile completed, each channel's format and
limits recorded, and a content cadence small enough to keep.

## Overview

Works out the smallest useful channel set for the business in front of it, then builds it
only when asked. The default output is a short recommendation, not a content calendar. The
channel and content register - CSV, SQL DDL, JSON Schema, Notion mapping - is produced on
request, from one field list so the four cannot drift apart.

Layer: Layer 6: Engage. Fits: Starter stage. Table code: n/a.

**The rule this table exists to enforce:** a channel and a post are different rows, and a
`Row Type` discriminator keeps them apart. A channel is a permanent configuration; a post
is a dated event that is published once. Merging them means the channel settings change
every time something is posted, and the profile checklist can never be marked complete
against a post.

**The second rule:** the cadence has to be one the business can keep with the people it
has. A daily plan on one founder is a plan that stops in week three, and an abandoned
account is worse than no account. Two posts a week beats five a week for one month.

## When to Use This Skill

- Facebook, Facebook Page, LinkedIn, LinkedIn company page, TikTok
- social media setup, profiles, bios, avatars, cover images
- "we are not on social media", "we should be on Instagram"
- content calendar, posting schedule, what to post
- "nobody engages with our posts"
- brand voice on social, tone of voice
- social profiles for recruitment, or for a local customer base

Do not use it for: the link page every bio points to (`linktree-link-hub`), the
presentation (`presentation-deck`), a paid advertising campaign, or a content marketing or
guest-posting plan (`seo-directory-backlinks` for the citation side).

## How It Works

Follow the shared execution contract. The module-specific rules below define only domain fields, decisions, calculations, and safety constraints.

### Step 1 - Identify intent

Read the request and pick the intent before asking anything.

- "set up" / "start" / "we are not on" -> artifacts wanted; go to Step 2.
- "we have them, nothing happens" / "fix" -> something exists; capture the current state,
  then Step 2.
- "which platform should we be on" / "review" -> a decision question, not a build.
- "audit" / "check" -> a check, not a build.

Ask only if this is the highest-value missing fact; otherwise proceed without an opener:

> **Q:** What is the business called, and what does one line of it actually do?

### Step 2 - Ask only what is missing

Treat ambiguous replies as unanswered and ask which explicit option the user means. Record unknown values as `Unknown`; `Unknown` is not zero. A record must not be `Done` when a required check fails.

Skip anything already answered. Ask the rest one at a time, and stop as soon as the
remaining answers would not change the channel set.

- **Audience** - Who are the customers - local walk-ins, online, business buyers, job
  candidates, or a mix? / Where are they already - which platform do they use?
- **Current** - Are any accounts open, even dormant? / Who has the logins, and are they
  personal accounts or business pages? / Any customer or staff photos already used?
- **Capacity** - Who will post, and how many hours a week are genuinely available? / Is
  there anyone who can respond to a comment within an hour?
- **Content** - Is there anything to post - finished work, stock, the team, an opening,
  a tip, an offer? / Can photos be taken on a phone at the premises? / Is anyone willing
  to be on camera?
- **Purpose** - What is the channel for - enquiries, recruitment, credibility, community,
  or advertising? / Is there a website to send people to yet?

Never invent an answer. Handles, follower counts, engagement rates, post volumes, platform
names, account URLs and metrics the user has not supplied are `Unknown`. A follower count
is a measurement, never an estimate.

### Step 3 - Hold the internal context

```yaml
module: social-media-setup
intent: null            # set up | fix | review | report | import
scale: null             # Starter | Growth | Scale, only if the answer changes it
areas:
  "Audience": null
  "Current": null
  "Capacity": null
  "Content": null
  "Purpose": null
requested_outputs: []
confirmed_facts: []
open_questions: []
```

### Step 4 - Recommend the smallest workflow

Build an already requested artifact without asking again. For advice-only requests, give a short recommendation and offer the relevant artifact.

**Recommended approach:** Two channels, not five. A Facebook Page for a local customer base
and a LinkedIn company page for credibility and recruitment - both low-effort, both
tolerate text and photos, both work with a phone camera. Add TikTok only if there is
someone who will genuinely make video, because an empty TikTok is worse than none. Three
posts a week: one finished job, one behind the scenes, one useful tip. Every bio points at
the same one page.

**Why this one:** The channel that decides the outcome is the one with people who will
reply. Facebook Page and LinkedIn company page need a phone and an hour a week; TikTok
needs a person who will be filmed. Starting with the two that can be sustained, and adding
the third when there is someone to run it, is the difference between a channel and a
dormant profile.

**Workflow:** Audience and platform confirmed → One canonical bio written → Profiles
completed - name, category, address, hours, contact → Avatars and covers cut from the
master mark → Website and link page connected → Three-post weekly pattern agreed →
Approval and response ownership set → First fortnight scheduled → Comments answered within
the hour → Reviewed at 30 days against the stated purpose

### Step 5 - Build only on request

Once the user asks for it, derive the fields from the confirmed context and emit the
requested artifacts. For machine-readable text, keep prose outside the data; for files,
provide a usable link. Report material validation failures or limitations separately.

**A selected Notion output is rendered by `notion-manual-import`, so route the
Notion step there.** When the user selects Notion, hand that step to
@notion-manual-import: it holds the CSV, the property
mapping, the import steps and the verification checklist, and it renders the Field
Reference below instead of defining a table of its own. Do not restate the mapping
here and do not improvise the import steps. Manual CSV and mapping outputs need no
connection. For requested workspace changes, follow the shared contract: verify actual
tool access and the target before writing. A user saying "connected" is not tool evidence.
Never ask for a Notion password or token.

```csv
Row ID,Row Type,Platform,Account Handle,Account Type,Audience,Posting Cadence,Post Format,Post Caption,Hashtag Set,Media Asset,Link Destination,Publish Date,Publish Time,Call To Action,Approval Status,Owner,Brand Voice,Profile Checklist Complete,Review Date,Status,Notes
,Channel,Facebook Page,Unknown,Business page,Local customers within the service area,Three posts a week,"Photo or short video with a caption","Behind-the-scenes, a finished job, or one useful tip - one idea per post",Not used,"One photo per post, shot on a phone",https://example.com/,2026-09-27,,Reply within one hour,Not required,Unknown,Plain and direct,Not started,2026-10-27,Draft,Example row - replace every value before use.
```

```sql
-- Engine assumption: PostgreSQL. For another engine use the engine's auto-increment
-- equivalent and keep the rest portable.
CREATE TABLE social_record (
  row_id BIGINT PRIMARY KEY,
  row_type VARCHAR(50) NOT NULL,
  platform VARCHAR(100) NOT NULL,
  account_handle VARCHAR(255),
  account_type VARCHAR(100) NOT NULL,
  audience VARCHAR(100) NOT NULL,
  posting_cadence VARCHAR(100) NOT NULL,
  post_format VARCHAR(100) NOT NULL,
  post_caption TEXT,
  hashtag_set VARCHAR(255),
  media_asset VARCHAR(255),
  link_destination TEXT,
  publish_date DATE,
  publish_time VARCHAR(20),
  call_to_action VARCHAR(100) NOT NULL,
  approval_status VARCHAR(100) NOT NULL,
  owner VARCHAR(255),
  brand_voice VARCHAR(100) NOT NULL,
  profile_checklist_complete BOOLEAN NOT NULL,
  review_date DATE,
  status VARCHAR(50) NOT NULL,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT social_row_type CHECK (row_type IN ('Channel','Post','Comment','Bio','Media')),
  CONSTRAINT social_approval_status CHECK (approval_status IN ('Not required','Draft','In review','Approved','Rejected','Published')),
  CONSTRAINT social_checklist_applies CHECK (row_type <> 'Channel' OR profile_checklist_complete IS NOT NULL)
);

CREATE INDEX idx_social_record_row_type ON social_record (row_type);
CREATE INDEX idx_social_record_platform ON social_record (platform);
CREATE INDEX idx_social_record_status ON social_record (status);
```

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "Social Media Setup",
  "type": "object",
  "additionalProperties": false,
  "properties": {
      "Row ID": { "type": "integer" },
      "Row Type": { "type": "string" },
      "Platform": { "type": "string" },
      "Account Handle": { "type": "string" },
      "Account Type": { "type": "string" },
      "Audience": { "type": "string" },
      "Posting Cadence": { "type": "string" },
      "Post Format": { "type": "string" },
      "Post Caption": { "type": "string" },
      "Hashtag Set": { "type": "string" },
      "Media Asset": { "type": "string" },
      "Link Destination": { "type": "string", "format": "uri" },
      "Publish Date": { "type": "string", "format": "date" },
      "Publish Time": { "type": "string" },
      "Call To Action": { "type": "string" },
      "Approval Status": { "type": "string" },
      "Owner": { "type": "string" },
      "Brand Voice": { "type": "string" },
      "Profile Checklist Complete": { "type": "boolean" },
      "Review Date": { "type": "string", "format": "date" },
      "Status": { "type": "string" },
      "Notes": { "type": "string" }
  },
  "required": [
      "Row Type",
      "Platform",
      "Account Type",
      "Audience",
      "Posting Cadence",
      "Post Format",
      "Call To Action",
      "Approval Status",
      "Brand Voice",
      "Profile Checklist Complete",
      "Status"
  ]
}
```

```markdown
| CSV column | Notion property | Set after import |
|---|---|---|
| Row ID | Text (preserve source ID) | Keep imported IDs as Text; optionally add a separate Unique ID property |
| Row Type | Select (add options after import) | Convert to Select, add options: "Channel", "Post", "Comment", "Bio", "Media" |
| Platform | Select (add options after import) | Convert to Select, add options: "Facebook Page", "LinkedIn Company Page", "TikTok", "Instagram", "YouTube", "X", "Pinterest", "Google Business Profile", "Other" |
| Account Handle | Text | Leave as Text. No @ - store the bare handle. Leave blank for a Channel row the business has not claimed |
| Account Type | Select (add options after import) | Convert to Select, add options: "Business page", "Personal profile", "Creator account", "Group", "Community" |
| Audience | Text | Leave as Text. Who this channel is for, in customer words |
| Posting Cadence | Text | Leave as Text. A number the business has agreed to, e.g. "Three posts a week" |
| Post Format | Text | Leave as Text. What a post looks like on this platform |
| Post Caption | Title | Use as the database title |
| Hashtag Set | Text | Leave as Text. "Not used" is a valid and often correct entry |
| Media Asset | Text | Leave as Text. Filename or asset reference from the asset register, not a pasted file |
| Link Destination | URL | Convert to URL |
| Publish Date | Date | Convert to Date. Blank for a Channel row |
| Publish Time | Text | Leave as Text. Local time with the zone, e.g. "18:30 IST". Blank for a Channel row |
| Call To Action | Text | Leave as Text. What the reader should do |
| Approval Status | Select (add options after import) | Convert to Select, add options: "Not required", "Draft", "In review", "Approved", "Rejected", "Published" |
| Owner | Text | Leave as Text. A person, not a department. This is the column that makes the cadence real |
| Brand Voice | Select (add options after import) | Convert to Select, add options: "Plain and direct", "Formal", "Warm", "Technical", "Playful" |
| Profile Checklist Complete | Checkbox | Convert to Checkbox. True only when name, category, address, hours, contact, avatar, cover and bio are all done |
| Review Date | Date | Convert to Date. The 30-day review for a channel; the publish check for a post |
| Status | Select (add options after import) | Convert to Select, add options: "Planned", "In progress", "Live", "Needs update", "Retired" |
| Notes | Text | Leave as Text |
```

The rows above are documentation examples only. Emit empty templates unless the user explicitly requests examples. A `Channel` row has no caption, no media and no
publish date - those belong on a `Post` row, and putting them on both is how a profile ends
up with a stranger's draft caption in its bio field.

## Field Reference

| # | Field | Type | SQL | JSON Schema | Notion | CSV example |
|---:|---|---|---|---|---|---|
| 1 | Row ID | `id` | `BIGINT PRIMARY KEY` | `integer` | Text or Notion auto-ID | `(blank)` |
| 2 | Row Type | `select` | `VARCHAR(50)` | `string` | Select | `Channel` |
| 3 | Platform | `select` | `VARCHAR(100)` | `string` | Select | `Facebook Page` |
| 4 | Account Handle | `text` | `VARCHAR(255)` | `string` | Text | *(blank)* |
| 5 | Account Type | `select` | `VARCHAR(100)` | `string` | Select | `Business page` |
| 6 | Audience | `text` | `VARCHAR(100)` | `string` | Text | *(blank)* |
| 7 | Posting Cadence | `text` | `VARCHAR(100)` | `string` | Text | *(blank)* |
| 8 | Post Format | `text` | `VARCHAR(100)` | `string` | Text | *(blank)* |
| 9 | Post Caption | `long_text` | `TEXT` | `string` | Text | *(blank)* |
| 10 | Hashtag Set | `text` | `VARCHAR(255)` | `string` | Text | *(blank)* |
| 11 | Media Asset | `text` | `VARCHAR(255)` | `string` | Text | *(blank)* |
| 12 | Link Destination | `url` | `TEXT` | `string, format: uri` | URL | *(blank)* |
| 13 | Publish Date | `date` | `DATE` | `string, format: date` | Date | *(blank)* |
| 14 | Publish Time | `text` | `VARCHAR(20)` | `string` | Text | *(blank)* |
| 15 | Call To Action | `text` | `VARCHAR(100)` | `string` | Text | *(blank)* |
| 16 | Approval Status | `select` | `VARCHAR(100)` | `string` | Select | `Not required` |
| 17 | Owner | `text` | `VARCHAR(255)` | `string` | Text | `Unknown` |
| 18 | Brand Voice | `select` | `VARCHAR(100)` | `string` | Select | `Plain and direct` |
| 19 | Profile Checklist Complete | `boolean` | `BOOLEAN` | `boolean` | Checkbox | `false` |
| 20 | Review Date | `date` | `DATE` | `string, format: date` | Date | *(blank)* |
| 21 | Status | `select` | `VARCHAR(50)` | `string` | Select | `Draft` |
| 22 | Notes | `long_text` | `TEXT` | `string` | Text | *(blank)* |

## Select Options

**Row Type** - four kinds of row. `Bio` and `Comment` exist because the bio is a piece of
copy that needs owning and versioning, and because the comment-response rule is a
standing commitment rather than a one-off post.

```
Channel | Post | Comment | Bio | Media
```

**Platform** - a starting set, restricted to the three this module is asked about most.
`Google Business Profile` is included because the same photo and caption often serves the
profile and the Facebook Page, and the owner needs to know it is being reused.

```
Facebook Page | LinkedIn Company Page | TikTok | Instagram | YouTube | X | Pinterest | Google Business Profile | Other
```

**Account Type** - business pages and personal profiles behave differently for
reach, for contact details and for who can edit them. `Personal profile` on a
`Facebook Page` row is a mistake worth catching early.

```
Business page | Personal profile | Creator account | Group | Community
```

**Posting Cadence** - free text, because the honest answer is a number the business has
agreed to, not a category. A cadence nobody can keep is a cadence of zero by month two.

**Brand Voice** - a starting set. Set it once and hold it across every channel; the same
business sounding different on Facebook and LinkedIn reads as two businesses.

```
Plain and direct | Formal | Warm | Technical | Playful
```

**Approval Status** - `Not required` is legitimate for a small business with one poster,
and `Published` closes the loop so the register shows what actually went out.

```
Not required | Draft | In review | Approved | Rejected | Published
```

**Status**

```
Planned | In progress | Live | Needs update | Retired
```

## Relations

None standalone. `Media Asset` names an asset from the register in `logo-image-design`;
confirm whether the business wants those two joined. `Owner` names a person from the
operational pack's people register, which is not in this artifact set, so it stays Text
with a note naming the intended target.

## The profile checklist

This is the completion test for `Profile Checklist Complete`. Every box, on every channel,
before the box is ticked.

| # | Item | Notes |
|---:|---|---|
| 1 | Account name is the exact business name | Same as the canonical NAP. No keywords, no emoji, no second brand name |
| 2 | Category set to the most specific true one | Matches the Google Business Profile primary category where they agree |
| 3 | Address or service area set correctly | Hiding the address on a service-area business is correct; showing a virtual address is not |
| 4 | Opening hours, including special hours | Wrong hours generate one-star reviews and lost customers |
| 5 | Phone number, correctly formatted for the country | The same number as the website and the directories |
| 6 | Website URL | The canonical domain, no tracking parameters |
| 7 | Avatar from the master mark | Square crop, legible at the size the platform shows |
| 8 | Cover image from the brand kit | Never a stock photo. The premises, the work, or the mark on a brand background |
| 9 | Bio written, with the one action and one link | The same wording the print collateral uses |
| 10 | Two-factor authentication on, and named page admins | Not one person's personal login |
| 11 | A post scheduled and a person named to reply | A profile with no reply owner gets no enquiries |

## Examples

**Prompt**

```
We have a Facebook page from 2019 with 300 followers, most of them our own family. We
want to be on TikTok because our competitor is. Nobody here has ever posted on it.
```

**Context first** - one question per message, nothing already answered:

> **Q:** What is the business called, and what does one line of it actually do?
> **A:** Example Retail, home and kitchen goods in Example City.
>
> **Q:** Where are your customers - local walk-ins, online, or both?
> **A:** Mostly local. People drive past and come in.
>
> **Q:** Who will post, and how many hours a week are genuinely available?
> **A:** The founder, maybe two hours a week.
>
> **Q:** Is anyone willing to be on camera?
> **A:** No, definitely not.
>
> **Q:** Is there a website to point people at yet?
> **A:** A very old one, mostly a phone number.

**Recommended next step** - offered, not built:

> Fix the Facebook Page first - it is where the local customers already are, and a
> complete profile with a photo a week beats an active TikTok with no videos. Add a
> LinkedIn company page next, because it costs the same two hours and is where suppliers
> and recruits look. Skip TikTok until there is someone who will be filmed; an empty
> account with six followers is worse for a new business than no account. Two posts a week,
> both on the phone, both pointing at one page.
>
> Workflow: Audience and platform confirmed → One canonical bio written → Profiles
> completed → Avatars and covers cut from the master mark → Website and link page connected
> → Two-post weekly pattern agreed → Reply ownership set → First fortnight scheduled →
> Comments answered within the hour → Reviewed at 30 days
>
> Want the CSV, SQL DDL, JSON Schema and Notion mapping for this?

## Best Practices

- Build when requested; recommend and offer a build for advice-only requests.
- One question per message. A batched intake reads as a form and gets guessed at.
- Two channels with a named owner beat five channels nobody maintains. An abandoned profile
  is a worse signal than an absent one.
- Start with the platform the customers are already on, not the one that looks modern.
- A Facebook Page and a LinkedIn company page tolerate a phone camera. TikTok requires
  video. Choose accordingly, and do not open a video channel without a person to film.
- Use the exact business name everywhere. No emoji in the name, no keyword, no tagline
  appended. It is the same NAP rule as the directories.
- Write the bio once. One sentence on what the business does, one clear action, one link.
  The identical wording goes on the letterhead, the website and the directories.
- Set the category to the most specific true one, matching the Google Business Profile.
- Post the same caption and photo to the profile and the Facebook Page deliberately, and
  know that you have done it. Silent cross-posting is how three different versions of a
  caption end up in public.
- Three posts a week is a real cadence. Five a day is a plan that ends in week three.
- Content that needs no production: the work just finished, the stock that arrived, the
  team, an answer to a question a customer actually asked, an opening, a closure.
- Answer within the hour during opening hours. For a local business, a fast reply to a
  comment converts better than the post itself.
- Never buy followers or likes. Inexpensive, obviously non-local, and it distorts the only
  signal - local relevance - that these channels exist to send.
- Keep a handle that matches the domain, and keep the same handle on every platform. People
  search for a name, and consistency is why they find it.
- Set two-factor authentication and named page admins on day one. The loss of a founder's
  personal account is how businesses lose their pages.
- Review at 30 days against the stated purpose - calls, enquiries, recruitment - and cut
  the channel that produced nothing rather than posting to it out of habit.
- Derive all four artifacts from the field list in this file, never by hand.
- If the user requests an example row, keep it obviously fake so nobody imports it as a real post.

## Limitations

- This is a plan and a register. It does not create an account, publish a post, or call any
  platform API.
- It has no access to any platform, so it cannot see follower counts, reach, engagement
  rates, best posting times or a competitor's activity. All of those are `Unknown` until
  the business supplies them, and they must never be estimated.
- Platform features, limits, formats and algorithms change frequently - character limits,
  caption support, bio links, image aspect ratios, eligibility rules for a link in a bio.
  Confirm each against the platform's own current documentation at the time of setup.
- The platforms do not all behave alike, and the differences are not stable. A rule stated
  here is a starting point, not a guarantee.
- Video production, editing, subtitles and thumbnails are a separate skill and are not
  covered.
- Paid advertising, boosting, influencer work and lead ads are commercial decisions with a
  budget. They are out of scope.
- Community management - moderation, private groups, a crisis - is a people problem and not
  modelled here.
- A social profile is not a ranking asset for organic search. A business with no website
  can post for years and still not rank. Say so when it applies.
- Accessibility on social: alt text on every image, captions on every video, and
  readable contrast in any graphic. Those are obligations in some markets, and none of
  them is verifiable from this table.
- Legal and regulatory requirements differ by sector and by country - advertising rules,
  claims, promotions and endorsements. This skill asks what applies and never supplies the
  wording.


See the [Security & Safety Notes](references/security-safety-notes.md) reference for the full guidance.

