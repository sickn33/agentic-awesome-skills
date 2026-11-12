---
name: twilio-communications
description: 'Build communication features with Twilio: SMS messaging, voice calls, WhatsApp Business API, and user verification (2FA). Covers the full spectrum from simple notifications to complex IVR systems and multi-channel authentication.'
metadata:
  aas-risk: critical
  aas-source: vibeship-spawner-skills (Apache 2.0)
  aas-date-added: '2026-02-27'
---

# Twilio Communications

Build communication features with Twilio: SMS messaging, voice calls,
WhatsApp Business API, and user verification (2FA). Covers the full
spectrum from simple notifications to complex IVR systems and multi-channel
authentication. Critical focus on compliance, rate limits, and error handling.

Catalog modification notice: qualified rate/segmentation and verification claims, repaired signature coverage, serialization and pacing examples. The imported Apache-2.0 source attribution is retained.

Use this to implement the requested integration, not to activate calls/campaigns by implication. Establish exact recipients/senders, approved message/purpose/spend and recording scope; use owned test numbers and preserve opt-outs. Verify current channel, region, sender-registration and recording requirements with official provider guidance before activation. SMS possession alone is not phishing-resistant authentication or proof of account ownership; bind OTP challenges to authenticated sessions/destination/purpose, limit attempts and prevent enumeration/pumping. All examples are partial: storage, opt-out and delivery handlers are stubs, and a successful create response means accepted/queued, not delivered.

## Detailed Guide

Read [the detailed guide](references/detailed-guide.md) before executing this skill. It retains the complete procedure and reference material. Treat its safety, prerequisites, and validation requirements as mandatory. For focused work, load the relevant sections; for end-to-end work, read the guide completely.

## When to Use
- User mentions or implies: twilio
- User mentions or implies: send SMS
- User mentions or implies: text message
- User mentions or implies: voice call
- User mentions or implies: phone verification
- User mentions or implies: 2FA SMS
- User mentions or implies: WhatsApp API
- User mentions or implies: programmable messaging
- User mentions or implies: IVR system
- User mentions or implies: TwiML
- User mentions or implies: phone number verification

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.
