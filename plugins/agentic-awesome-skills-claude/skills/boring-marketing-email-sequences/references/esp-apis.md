# ESP API crib: Kit v4, Beehiiv v2, Resend (+ detection-only ESPs)

last-verified: 2026-09-02 (all endpoints re-checked against developers.kit.com, developers.beehiiv.com, resend.com/docs, loops.so/docs on this date) · ttl-days: 90 · refresh: re-fetch `developers.kit.com/llms.txt`, `developers.beehiiv.com/llms.txt`, `resend.com/docs/llms.txt`, and `loops.so/docs/llms.txt`; update paths/payloads below.
changes: 2026-09-02. Resend now has Automations (event-triggered flows, API-creatable), so the "no sequence engine" claim is gone and audiences became Contacts + Segments + Topics; Loops exposes campaign + workflow creation via API; Kit v3 is legacy-not-deprecated, `per_page` max 1000, enrollment by email 422s on inactive sequences, stats retention window from 2026-10-15; HubSpot marketing-email v1 is sunset and v3 publish is Enterprise-gated; Beehiiv unchanged (create-post still beta/Enterprise).

Load this file only when pushing a sequence to an ESP or pulling campaign stats (Phases 1
and 5 of SKILL.md). Every create call here is gated: show the user the exact payloads and
get an explicit "yes, create" before any POST. Never schedule or send live without a
separate, second confirmation.

## Kit (formerly ConvertKit; the brand has been "Kit" since Oct 2024)

- Base: `https://api.kit.com` · Auth header: `X-Kit-Api-Key: $KIT_API_KEY` (v4 key from
  Settings → Developer). A legacy `CONVERTKIT_API_KEY` is usually a v3 key. Kit labels
  v3 "legacy" (still works, no removal planned) but documents only v4; ask the user to
  generate a v4 key rather than building on v3.
- Pagination: cursor-based (`after`=end_cursor / `before`=start_cursor; `per_page`
  default 500, max 1000).

**Kit can build the ENTIRE sequence via API**: shell, then one call per email:

```bash
# 1. Create the sequence shell
curl -X POST https://api.kit.com/v4/sequences \
  -H "X-Kit-Api-Key: $KIT_API_KEY" -H "Content-Type: application/json" \
  -d '{"name":"<sequence name>","send_hour":9,"time_zone":"America/New_York","active":false}'
# Other fields: email_address, email_template_id, send_days [monday..sunday],
# repeat, hold, exclude_subscriber_sources [{"type":"tag|sequence|form|segment","ids":[..]}]

# 2. Add each email (one call per email, in order)
curl -X POST https://api.kit.com/v4/sequences/{sequence_id}/emails \
  -H "X-Kit-Api-Key: $KIT_API_KEY" -H "Content-Type: application/json" \
  -d '{"subject":"<subject A>","preview_text":"<preview>","content":"<html>",
       "delay_value":2,"delay_unit":"days","position":1,"published":false}'
```

- `delay_value`/`delay_unit` (`"days"`|`"hours"`) are relative to the previous email
  (entry, for the first). Only the first email may be immediate (`delay_value: 0`).
- `position` is zero-based order; `published: false` keeps each email in draft.
- **Push pattern:** create everything with `active: false` + `published: false`, give the
  user the Kit URL to review, let THEM flip it live. Never set `active: true` yourself.
- Broadcasts (one-off sends, e.g. launch emails): `POST /v4/broadcasts` with `subject`,
  `preview_text`, `content` (HTML), `description`, `public`, `published_at`,
  `subscriber_filter` (the docs mark all seven required); **`send_at: null` = draft**,
  ISO8601 `send_at` = scheduled.
- Enrollment: `POST /v4/sequences/{sequence_id}/subscribers/{subscriber_id}` (empty body),
  or `.../subscribers` with `{"email_address": ...}`. Subscriber must already exist
  (`POST /v4/subscribers`, an upsert), and the sequence must be active: enrollment by
  email returns 422 "Sequence is inactive" on a draft, so enrollment happens AFTER the
  user flips it live, never as part of the push.

**Stats pull (grounding):**
- `GET /v4/broadcasts` → ids; `GET /v4/broadcasts/{id}/stats` → `recipients`,
  `emails_opened`, `open_rate`, `total_clicks`, `click_rate`, `unsubscribes`,
  `unsubscribe_rate`. Batch: `GET /v4/broadcasts/stats?broadcast_ids[]=...`.
- Read `click_rate` per subject pattern; treat `open_rate` as MPP-inflated noise.
- From 2026-10-15 Kit serves stats via the API for the last 5 years only.

## Beehiiv

- Base: `https://api.beehiiv.com/v2` · Auth: `Authorization: Bearer $BEEHIIV_API_KEY`.
- First call: `GET /v2/publications` → grab the `pub_...` publication id.

**What Beehiiv can and cannot do via API** (this shapes the push offer):
- **Automation flows + their emails are built in the beehiiv UI, not the API.** The API
  can list automations (`GET .../automations`), list an automation's emails, and enroll
  subscribers, but it cannot create the flow or its email content. So the push for a
  sequence = deliver the per-email files for paste-in, then wire enrollment via API.
- Enrollment: `POST /v2/publications/{pubId}/automations/{automationId}/journeys` with
  `{"email": "..."}` or `{"subscription_id": "sub_..."}`. The automation must have an
  active **"Add by API"** trigger (tell the user to set this in the automation editor).
  New subscribers: `POST /v2/publications/{pubId}/subscriptions` with `email` +
  `automation_ids: ["aut_..."]` (also accepts `utm_source` etc. for attribution).
- One-off sends (launch broadcasts) CAN be created as posts:
  `POST /v2/publications/{pubId}/posts` with `title` (required), `body_content` (HTML) or
  `blocks`, `email_subject_line`, `email_preview_text`, `status: "draft"|"confirmed"`
  (defaults to confirmed, so **always pass "draft"**), `scheduled_at` (ISO8601),
  `recipients` (tier/segment targeting). Warning: create-post is still in beta and
  **Enterprise-plan gated** (re-confirmed 2026-09). If it 404/403s, the plan doesn't
  include it; fall back to file handoff. Creation is async: an immediate GET can 202.

**Stats pull (grounding):**
- `GET /v2/publications/{pubId}/posts?expand=stats&limit=<≤100>&order_by=publish_date&direction=desc`
  → per-post `stats.email`: `recipients`, `delivered`, `unique_opens`, `open_rate`,
  `unique_clicks`, `verified_clicks` (bot-filtered, so prefer this), `click_rate`,
  `unsubscribes`, `spam_reports`. `spam_reports / delivered` vs the 0.10% line is a free
  deliverability health check. Flag it if any post exceeds it.

## Resend

- Base: `https://api.resend.com` · Auth: `Authorization: Bearer $RESEND_API_KEY`.
- Resend now has **Automations**: event-triggered flows (trigger on a custom event such
  as `user.created` → delay / condition / wait-for-event / send_email steps, each
  send_email using a saved Template). A sequence = one automation with delay steps
  between emails; it fires per event, not per segment, so the app must emit the event.
  Build in the dashboard or `POST /automations` `{name, steps[], connections[],
  status}`. `status` defaults to `"disabled"`; leave it there, the user enables it.
  Templates must exist before the automation references their ids.
- Broadcasts stay the one-shot path (launch emails): `POST /broadcasts` with
  `segment_id` (required), `from` (`"Name <addr@domain>"`), `subject`, `html` (and/or
  `text`), `name`, `reply_to`, optional `topic_id`. Default is draft; `send: true`
  dispatches, `scheduled_at` (ISO8601 or "in 2 days") requires `send: true`.
  Draft-then-send later: `POST /broadcasts/{id}/send`.
- Segments: `GET /segments`. Audiences were replaced by global Contacts + Segments +
  Topics (migration guide in the docs); contact endpoints no longer need an `audience_id`.
- Unsubscribe: put `{{{RESEND_UNSUBSCRIBE_URL}}}` in every Broadcast/Automation body.
  Resend resolves and honors it. Never push marketing through the transactional
  `POST /emails` endpoint (there you add `List-Unsubscribe` headers by hand).

## Detection-only (no push wiring here)

- **Loops** (`LOOPS_API_KEY`, base `https://app.loops.so/api`, `Authorization: Bearer`):
  the API now creates campaigns (`POST /v1/campaigns` → Draft + an empty
  `emailMessageId` to fill) and workflows (`POST /v1/workflows` → Draft with a blank
  trigger + exit node; nodes added via the workflow-nodes endpoints; some teams get
  "workflow creation is unavailable"). Not wired here: offer file handoff +
  contact/event wiring, and fetch `loops.so/docs/llms.txt` if the user wants an API build.
- **Mailchimp** (`MAILCHIMP_API_KEY`; key suffix `-usX` is the server prefix, base
  `https://<usX>.api.mailchimp.com/3.0`): Customer Journeys are UI-built; the API only
  triggers a journey step (`POST /customer-journeys/journeys/{id}/steps/{step_id}/actions/trigger`).
  Campaigns are creatable. Point to `/campaigns` + `/reports` for stats; don't improvise
  journey payloads from memory; fetch the current docs if the user wants a real push.
- **HubSpot** (`HUBSPOT_ACCESS_TOKEN`, private-app token): Marketing Emails v3
  (`/marketing/v3/emails`, create/get/stats) is GA and v1 is sunset; publish/send needs
  Marketing Hub Enterprise or the transactional add-on, and workflows are
  enterprise-shaped. Offer file handoff unless the user asks, then fetch current docs.

## Stats → learnings format

When a pull grounds the sequence, append entries to `./brand/learnings.md` in the
standard learnings format, e.g.:
`- [2026-06-10] [email-sequences] subject-pattern=specific-number beat question 1.8x on click_rate (n=12 sends, source: beehiiv-api)`
Only write patterns with n ≥ 4 sends behind them; below that, mention in chat but don't
persist as a prior.
