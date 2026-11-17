# Deliverability 2026: bulk-sender compliance walk

last-verified: 2026-09-02 · ttl-days: 90 · refresh: search "Gmail bulk sender requirements" + "Microsoft Outlook sender requirements high volume" + "Yahoo sender requirements" on the official postmaster pages (postmaster.google.com, senders.yahooinc.com, Microsoft's sender support docs); update thresholds, dates, and enforcement notes below.
changes: 2026-09-02. Gmail enforcement ramped to temporary + permanent rejections from Nov 2025 (Google's FAQ); Microsoft's high-volume rule re-dated to 2025-05-05 with the `550 5.7.515` reject code and no formal RFC 8058 requirement; Yahoo's stated complaint line is 0.3% and DKIM minimum 1024-bit; Resend unsubscribe note rewritten to match its docs.

Load this file when running the deliverability preflight (Phase 2 of SKILL.md) or whenever
a check FAILs and you need the fix instruction.

## Who enforces what (state of play, September 2026)

- **Gmail + Yahoo**: bulk-sender rules announced Oct 2023, rolled out through 2024, now
  **fully enforced**. Google's FAQ states that from November 2025 non-compliant traffic
  gets "temporary and permanent rejections", not just throttling. "Bulk" = 5,000+
  messages/day to that provider (Gmail: once crossed, always a bulk sender), but Gmail
  applies the authentication rules to everyone; treat the bar as universal.
- **Microsoft Outlook** (outlook.com / hotmail / live / msn): for senders of 5,000+/day,
  enforcement began **May 5, 2025**: SPF + DKIM + DMARC (p=none minimum, aligned)
  required; non-compliant mail was junk-foldered first and is now rejected with
  `550 5.7.515 ... does not meet the required authentication level`. Microsoft recommends
  but does not formally require RFC 8058 one-click headers; it does want a reply-capable
  From/Reply-To and a working unsubscribe. The big three consumer inboxes share one rulebook.
- **Apple Mail Privacy Protection** (since 2021): pre-fetches tracking pixels for most
  Apple Mail users → open rates are inflated and unusable as a success metric. This is why
  all testing guidance in this skill scores **clicks, replies, and conversions**, never opens.

## The compliance checklist (in enforcement order)

### 1. SPF: `dig TXT <domain>`
Exactly ONE record starting `v=spf1`, containing your ESP's include, ending `~all` or `-all`.

- **Missing** → add the TXT record your ESP's domain-settings page specifies, e.g.
  `v=spf1 include:<esp-include> ~all`.
- **Multiple v=spf1 records** → permerror; receivers treat it as no SPF at all. Merge the
  includes into one record.
- **`+all`** → open spoofing invitation, fix immediately. `?all` → weak, upgrade.
- **>10 DNS lookups** (nested includes count) → permerror. Flatten or drop unused includes.

### 2. DKIM: `dig TXT <selector>._domainkey.<domain>`
A `v=DKIM1` key at the selector your ESP signs with. Selectors are arbitrary. Find the
real one in the ESP's sending-domain settings or the `s=` tag of a received email's
DKIM-Signature header. Common selectors: `google` (Workspace), `selector1/2` (Microsoft 365),
`k1-k3` (Mailchimp), `s1/s2` (SendGrid; Beehiiv sends via SendGrid infrastructure),
`resend` (Resend), `hs1/hs2` (HubSpot), `mandrill`, `pm` (Postmark).

- **Missing** → your ESP's "verify domain" flow generates the exact TXT/CNAME records.
  Until DKIM passes on YOUR domain, the ESP signs with a shared domain and your mail can't
  achieve DMARC alignment, which Gmail/Yahoo/Outlook require for bulk.
- **1024-bit is the stated minimum** (Gmail and Yahoo); use **2048-bit** if the ESP offers
  the choice; rotate if a key is years old.

### 3. DMARC: `dig TXT _dmarc.<domain>`
At minimum `v=DMARC1; p=none; rua=mailto:<inbox>`. `p=none` satisfies the bulk-sender
requirement. The From: domain must **align** with the SPF or DKIM domain (this is the part
that actually fails for people: sending "from" yourdomain.com while only the ESP's shared
domain signs).

- **Missing** → publish the starter record above. Watch rua reports for 2-4 weeks, then
  ratchet `p=none` → `p=quarantine` → `p=reject` as legitimate mail stays aligned.
- **Never send bulk from `@gmail.com`**: gmail.com's own DMARC policy will kill it.
  Bulk mail requires your own domain.

### 4. One-click unsubscribe: RFC 8058
Bulk senders must include `List-Unsubscribe:` (https URI) + `List-Unsubscribe-Post:
List-Unsubscribe=One-Click` headers, and **honor the unsubscribe within 2 days** (Google's
FAQ says 48 hours; Yahoo says 2 days). Kit, Beehiiv, Mailchimp, HubSpot, and Loops add
these automatically on broadcast/automation sends; Resend handles unsubscribes on
Broadcasts and Automations when the body includes `{{{RESEND_UNSUBSCRIBE_URL}}}`, and its
docs show raw `/emails` calls adding `List-Unsubscribe` + `List-Unsubscribe-Post` by hand.
Don't ship marketing through a transactional endpoint. Custom SMTP pipelines must add the
headers themselves. A visible unsubscribe link in the footer is still required separately.

### 5. Complaint rate: Google Postmaster Tools
Spam-complaint rate must stay **below 0.10%**; **0.30%+ is a hard fail**: Gmail drops you
from mitigation eligibility until you sit under 0.3% for 7 consecutive days; Yahoo's stated
line is also 0.3%. Set up Postmaster Tools before the first big send. Complaint hygiene
that keeps you under the line:

- **Sunset policy**: suppress or win-back subscribers with no clicks in 90-180 days before
  big sends. Mailing the dead is the #1 complaint generator.
- **Match the opt-in promise**: a list built on a free PDF that suddenly gets daily pitch
  emails generates complaints regardless of content quality.
- Double opt-in is a judgment call: use it for cold-traffic lead magnets and giveaway-prone
  niches; single opt-in is fine for warm traffic where friction costs more than bad signups.

### 6. Infrastructure basics
Sending IPs need valid forward + reverse DNS (PTR) and TLS. ESPs handle this; flag it only
for custom SMTP. The From: domain should accept replies (MX present): no-reply patterns
waste the highest-signal engagement (replies) and bounced replies hurt reputation.

## New domain / new list warm-up
A fresh domain blasting 5,000 emails on day one looks exactly like a spammer. Ramp: start
in the hundreds/day to the most-engaged segment, roughly double every 2-3 days while
complaint and bounce rates stay clean, reach full volume over 2-4 weeks. If a sequence
launch coincides with a brand-new sending domain, say so and schedule the ramp into the
send plan.

## Running the preflight

```
bash ${CLAUDE_SKILL_DIR}/scripts/deliverability_check.sh <domain> [dkim_selector ...]
```

Exit 0 = no hard failures; 1 = at least one FAIL (fix before shipping); 2 = no DNS tool
available (the script prints manual lookup instructions; walk the user through them).
The script checks DNS only; items 4-6 above must be verified in the ESP/Postmaster UI and
belong on the pass/fix list you present.
