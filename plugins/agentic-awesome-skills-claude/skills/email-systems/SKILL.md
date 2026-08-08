---
name: email-systems
description: Email has the highest ROI of any marketing channel. $36 for every
  $1 spent. Yet most startups treat it as an afterthought - bulk blasts, no
  personalization, landing in spam folders.
risk: none
source: vibeship-spawner-skills (Apache 2.0)
date_added: 2026-02-27
---

# Email Systems

Email has the highest ROI of any marketing channel. $36 for every $1 spent.
Yet most startups treat it as an afterthought - bulk blasts, no personalization,
landing in spam folders.

This skill covers transactional email that works, marketing automation that
converts, deliverability that reaches inboxes, and the infrastructure decisions
that scale.

## Principles

- Transactional vs Marketing separation | Description: Transactional emails (password reset, receipts) need 100% delivery.
Marketing emails (newsletters, promos) have lower priority. Use separate
IP addresses and providers to protect transactional deliverability. | Examples: Good: Password resets via Postmark, marketing via ConvertKit | Bad: All emails through one SendGrid account
- Permission is everything | Description: Only email people who asked to hear from you. Double opt-in for marketing.
Easy unsubscribe. Clean your list ruthlessly. Bad lists destroy deliverability. | Examples: Good: Confirmed subscription + one-click unsubscribe | Bad: Scraped email list, hidden unsubscribe, bought contacts
- Deliverability is infrastructure | Description: SPF, DKIM, DMARC are not optional. Warm up new IPs. Monitor bounce rates.
Deliverability is earned through technical setup and good behavior. | Examples: Good: All DNS records configured, dedicated IP warmed for 4 weeks | Bad: Using free tier shared IP, no authentication records
- One email, one goal | Description: Each email should have exactly one purpose and one CTA. Multiple asks
means nothing gets clicked. Clear single action. | Examples: Good: "Click here to verify your email" (one button) | Bad: "Verify email, check out our blog, follow us on Twitter, refer a friend..."
- Timing and frequency matter | Description: Wrong time = low open rates. Too frequent = unsubscribes. Let users
set preferences. Test send times. Respect inbox fatigue. | Examples: Good: Weekly digest on Tuesday 10am user's timezone, preference center | Bad: Daily emails at random times, no way to reduce frequency

## Patterns

### Transactional Email Queue

Queue all transactional emails with retry logic and monitoring

**When to use**: Sending any critical email (password reset, receipts, confirmations)

// Don't block request on email send
await queue.add('email', {
  template: 'password-reset',
  to: user.email,
  data: { resetToken, expiresAt }
}, {
  attempts: 3,
  backoff: { type: 'exponential', delay: 2000 }
});

### Email Event Tracking

Track delivery, opens, clicks, bounces, and complaints

**When to use**: Any email campaign or transactional flow

# Track lifecycle:
- Queued: Email entered system
- Sent: Handed to provider
- Delivered: Reached inbox
- Opened: Recipient viewed
- Clicked: Recipient engaged
- Bounced: Permanent failure
- Complained: Marked as spam

### Template Versioning

Version email templates for rollback and A/B testing

**When to use**: Changing production email templates

templates/
  password-reset/
    v1.tsx (current)
    v2.tsx (testing 10%)
    v1-deprecated.tsx (archived)

# Deploy new version gradually
# Monitor metrics before full rollout

### Bounce Handling State Machine

Automatically handle bounces to protect sender reputation

**When to use**: Processing bounce and complaint webhooks

switch (bounceType) {
  case 'hard':
    await markEmailInvalid(email);
    break;
  case 'soft':
    await incrementBounceCount(email);
    if (count >= 3) await markEmailInvalid(email);
    break;
  case 'complaint':
    await unsubscribeImmediately(email);
    break;
}

### React Email Components

Build emails with reusable React components

**When to use**: Creating email templates

import { Button, Html } from '@react-email/components';

export default function WelcomeEmail({ userName }) {
  return (
    <Html>
      <h1>Welcome {userName}!</h1>
      <Button href="https://app.com/start">
        Get Started
      </Button>
    </Html>
  );
}

### Preference Center

Let users control email frequency and topics

**When to use**: Building marketing or notification systems

Preferences:
☑ Product updates (weekly)
☑ New features (monthly)
☐ Marketing promotions
☑ Account notifications (always)

# Respect preferences in all sends
# Required for GDPR compliance

## Sharp Edges

### Missing SPF, DKIM, or DMARC records

Severity: CRITICAL

Situation: Sending emails without authentication. Emails going to spam folder.
Low open rates. No idea why. Turns out DNS records were never set up.

Symptoms:
- Emails going to spam
- Low deliverability rates
- mail-tester.com score below 8
- No DMARC reports received

Why this breaks:
Email authentication (SPF, DKIM, DMARC) tells receiving servers you're
legit. Without them, you look like a spammer. Modern email providers
increasingly require all three.

Recommended fix:

# Required DNS records:

## SPF (Sender Policy Framework)
TXT record: v=spf1 include:_spf.google.com include:sendgrid.net ~all

## DKIM (DomainKeys Identified Mail)
TXT record provided by your email provider
Adds cryptographic signature to emails

## DMARC (Domain-based Message Authentication)
TXT record: v=DMARC1; p=quarantine; rua=mailto:dmarc@yourdomain.com

# Verify setup:
- Send test email to mail-tester.com
- Check MXToolbox for record validation
- Monitor DMARC reports

### Using shared IP for transactional email

Severity: HIGH

Situation: Password resets going to spam. Using free tier of email provider.
Some other customer on your shared IP got flagged for spam.
Your reputation is ruined by association.

Symptoms:
- Transactional emails in spam
- Inconsistent delivery
- Using same provider for marketing and transactional

Why this breaks:
Shared IPs share reputation. One bad actor affects everyone. For
critical transactional email, you need your own IP or a provider
with strict shared IP policies.

Recommended fix:

# Transactional email strategy:

## Option 1: Dedicated IP (high volume)
- Get dedicated IP from your provider
- Warm it up slowly (start with 100/day)
- Maintain consistent volume

## Option 2: Transactional-only provider
- Postmark (very strict, great reputation)
- Includes shared pool with high standards

### Separate concerns:
- Transactional: Postmark or Resend
- Marketing: ConvertKit or Customer.io
- Never mix marketing and transactional

### Not processing bounce notifications

Severity: HIGH

Situation: Emailing same dead addresses over and over. Bounce rate climbing.
Email provider threatening to suspend account. List is 40% dead.

Symptoms:
- Bounce rate above 2%
- No webhook handlers for bounces
- Same emails failing repeatedly

Why this breaks:
Bounces damage sender reputation. Email providers track bounce rates.
Above 2% and you start looking like a spammer. Dead addresses must
be removed immediately.

Recommended fix:

# Bounce handling requirements:

### Hard bounces:
Remove immediately on first occurrence
Invalid address, domain doesn't exist

### Soft bounces:
Retry 3 times over 72 hours
After 3 failures, treat as hard bounce

### Implementation:
```typescript
// Webhook handler for bounces
app.post('/webhooks/email', (req, res) => {
  const event = req.body;
  if (event.type === 'bounce') {
    await markEmailInvalid(event.email);
    await removeFromAllLists(event.email);
  }
});
```

### Monitor:
Track bounce rate by campaign
Alert if bounce rate exceeds 1%

### Missing or hidden unsubscribe link

Severity: CRITICAL

Situation: Users marking as spam because they cannot unsubscribe. Spam complaints
rising. CAN-SPAM violation. Email provider suspends account.

Symptoms:
- Hidden unsubscribe links
- Multi-step unsubscribe process
- No List-Unsubscribe header
- High spam complaint rate

Why this breaks:
Users who cannot unsubscribe will mark as spam. Spam complaints hurt
reputation more than unsubscribes. Also it is literally illegal.
CAN-SPAM, GDPR all require clear unsubscribe.

Recommended fix:

# Unsubscribe requirements:

### Visible:
- Above the fold in email footer
- Clear text, not hidden
- Not styled to be invisible

### One-click:
- Link directly unsubscribes
- No login required
- No "are you sure" hoops

### List-Unsubscribe header:
```
List-Unsubscribe: <mailto:unsubscribe@example.com>,
  <https://example.com/unsubscribe?token=xxx>
List-Unsubscribe-Post: List-Unsubscribe=One-Click
```

### Preference center:
Option to reduce frequency instead of full unsubscribe

### Sending HTML without plain text alternative

Severity: MEDIUM

Situation: Some users see blank emails. Spam filters flagging emails. Accessibility
issues for screen readers. Email clients that strip HTML show nothing.

Symptoms:
- No text/plain part in emails
- Blank emails for some users
- Lower engagement in some segments

Why this breaks:
Not everyone can render HTML. Screen readers work better with plain text.
Spam filters are suspicious of HTML-only. Multipart is the standard.

Recommended fix:

# Always send multipart:
```typescript
await resend.emails.send({
  from: 'you@example.com',
  to: 'user@example.com',
  subject: 'Welcome!',
  html: '<h1>Welcome!</h1><p>Thanks for signing up.</p>',
  text: 'Welcome!\n\nThanks for signing up.',
});
```

# Auto-generate text from HTML:
Use html-to-text library as fallback
But hand-crafted plain text is better

# Plain text should be readable:
Not just HTML stripped of tags
Actual formatted text content

### Sending high volume from new IP immediately

Severity: HIGH

Situation: Just switched providers. Started sending 50,000 emails/day immediately.
Massive deliverability issues. New IP has no reputation. Looks like spam.

Symptoms:
- New IP/provider
- Sending high volume immediately
- Sudden deliverability drop

Why this breaks:
New IPs have no reputation. Sending high volume immediately looks
like a spammer who just spun up. You need to gradually build trust.

Recommended fix:

# IP warm-up schedule:

Week 1: 50-100 emails/day
Week 2: 200-500 emails/day
Week 3: 500-1000 emails/day
Week 4: 1000-5000 emails/day
Continue doubling until at volume

# Best practices:
- Start with most engaged users
- Send to Gmail/Microsoft first (they set reputation)
- Maintain consistent volume
- Don't spike and drop

# During warm-up:
- Monitor deliverability closely
- Check feedback loops
- Adjust pace if issues arise

### Emailing people who did not opt in

Severity: CRITICAL

Situation: Bought an email list. Scraped emails from LinkedIn. Added conference
contacts. Spam complaints through the roof. Provider suspends account.
Maybe a lawsuit.

Symptoms:
- Purchased email lists
- Scraped contacts
- High unsubscribe rate on first send
- Spam complaints above 0.1%

Why this breaks:
Permission-based email is not optional. It is the law (CAN-SPAM, GDPR).
It is also effective - unwilling recipients hurt your metrics and
reputation more than they help.

Recommended fix:

# Permission requirements:

### Explicit opt-in:
- User actively chooses to receive email
- Not pre-checked boxes
- Clear what they are signing up for

### Double opt-in:
- Confirmation email with link
- Only add to list after confirmation
- Best practice for marketing lists

### What you cannot do:
- Buy email lists
- Scrape emails from websites
- Add conference contacts without consent
- Use partner/customer lists without consent

### Transactional exception:
Password resets, receipts, account alerts
do not need marketing opt-in

### Emails that are mostly or entirely images

Severity: MEDIUM

Situation: Beautiful designed email that is one big image. Users with images
blocked see nothing. Spam filters flag it. Mobile loading is slow.
No one can copy text.

Symptoms:
- Single image emails
- No text content visible
- Missing or generic alt text
- Low engagement when images blocked

Why this breaks:
Images are blocked by default in many clients. Spam filters are
suspicious of image-only emails. Accessibility suffers. Load times
increase.

Recommended fix:

# Balance images and text:

## 60/40 rule:
- At least 60% text content
- Images for enhancement, not content

### Always include:
- Alt text on every image
- Key message in text, not just image
- Fallback for images-off view

### Test:
- Preview with images disabled
- Should still be usable

# Example:
```html
<img
  src="hero.jpg"
  alt="Save 50% this week - use code SAVE50"
  style="max-width: 100%"
/>
<p>Use code <strong>SAVE50</strong> to save 50% this week.</p>
```

### Missing or default preview text

Severity: MEDIUM

Situation: Inbox shows "View this email in browser" or random HTML as preview.
Lower open rates. First impression wasted on boilerplate.

Symptoms:
- View in browser as preview
- HTML code visible in preview
- No preview component in template

Why this breaks:
Preview text is prime real estate - appears right after subject line.
Default or missing preview text wastes this space. Good preview text
increases open rates 10-30%.

Recommended fix:

# Add explicit preview text:

### In HTML:
```html
<div style="display:none;max-height:0;overflow:hidden;">
  Your preview text here. This appears in inbox preview.
  <!-- Add whitespace to push footer text out -->
  &nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;
</div>
```

### With React Email:
```tsx
<Preview>
  Your preview text here. This appears in inbox preview.
</Preview>
```

### Best practices:
- Complement the subject line
- 40-100 characters optimal
- Create curiosity or value
- Different from first line of email

### Not handling partial send failures

Severity: HIGH

Situation: Sending to 10,000 users. API fails at 3,000. No tracking of what sent.
Either double-send or lose 7,000. No way to know who got the email.

Symptoms:
- No per-recipient send logging
- Cannot tell who received email
- Double-sending issues
- No retry mechanism

Why this breaks:
Bulk sends fail partially. APIs timeout. Rate limits hit. Without
tracking individual send status, you cannot recover gracefully.

Recommended fix:

# Track each send individually:

```typescript
async function sendCampaign(emails: string[]) {
  const results = await Promise.allSettled(
    emails.map(async (email) => {
      try {
        const result = await resend.emails.send({ to: email, ... });
        await db.emailLog.create({
          email,
          status: 'sent',
          messageId: result.id,
        });
        return result;
      } catch (error) {
        await db.emailLog.create({
          email,
          status: 'failed',
          error: error.message,
        });
        throw error;
      }
    })
  );

  const failed = results.filter(r => r.status === 'rejected');
  // Retry failed sends or alert
}
```

# Best practices:
- Log every send attempt
- Include message ID for tracking
- Build retry queue for failures
- Monitor success rate per campaign

## Validation Checks

### Missing plain text email part

Severity: WARNING

Emails should always include a plain text alternative

Message: Email being sent with HTML but no plain text part. Add 'text:' property for accessibility and deliverability.

### Hardcoded from email address

Severity: WARNING

From addresses should come from environment variables

Message: From email appears hardcoded. Use environment variable for flexibility.

### Missing bounce webhook handler

Severity: WARNING

Email bounces should be handled to maintain list hygiene

Message: Email provider used but no bounce handling detected. Implement webhook handler for bounces.

### Missing List-Unsubscribe header

Severity: INFO

Marketing emails should include List-Unsubscribe header

Message: Marketing email detected without List-Unsubscribe header. Add header for better deliverability.

### Synchronous email send in request handler

Severity: WARNING

Email sends should be queued, not blocking

Message: Email sent synchronously in request handler. Consider queuing for better reliability.

### Email send without retry logic

Severity: INFO

Email sends should have retry mechanism for failures

Message: Email send without apparent retry logic. Add retry for transient failures.

### Email API key in code

Severity: ERROR

API keys should come from environment variables

Message: Email API key appears hardcoded in source code. Use environment variable.

### Bulk email without rate limiting

Severity: WARNING

Bulk sends should respect provider rate limits

Message: Bulk email sending without apparent rate limiting. Add throttling to avoid hitting limits.

### Email without preview text

Severity: INFO

Emails should include preview/preheader text

Message: Email template without preview text. Add hidden preheader for inbox preview.

### Email send without logging

Severity: WARNING

Email sends should be logged for debugging and auditing

Message: Email being sent without apparent logging. Log sends for debugging and compliance.

## Collaboration

### Delegation Triggers

- copy|subject|messaging|content -> copywriting (Email needs copy)
- design|template|visual|layout -> ui-design (Email needs design)
- track|analytics|measure|metrics -> analytics-architecture (Email needs tracking)
- infrastructure|deploy|server|queue -> devops (Email needs infrastructure)

### Email Marketing Stack

Skills: email-systems, copywriting, marketing, analytics-architecture

Workflow:

```
1. Infrastructure setup (email-systems)
2. Template creation (email-systems)
3. Copy writing (copywriting)
4. Campaign launch (marketing)
5. Performance tracking (analytics-architecture)
```

### Transactional Email

Skills: email-systems, backend, devops

Workflow:

```
1. Provider setup (email-systems)
2. Template coding (email-systems)
3. Queue integration (backend)
4. Monitoring (devops)
```

## When to Use
Use this skill when the request clearly matches the capabilities and patterns described above.

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.
