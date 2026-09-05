---
name: internal-comms-anthropic
description: "Compatibility alias for internal-comms: draft status updates, newsletters and FAQs from approved sources."
risk: safe
source: community
date_added: "2026-02-27"
---

## Compatibility and maintenance

Compatibility alias of `internal-comms`; use that ID for new references when no existing contract requires this one. The full instructions and support files remain local so existing installations
continue to work offline. This is one shared procedure, not an additional capability.
Preserve the callable ID when an existing manifest or client configuration uses it.
Modified in AAS on 2026-09-05; original metadata and license notices are retained.

## When to use this skill
To write internal communications, use this skill for:
- 3P updates (Progress, Plans, Problems)
- Company newsletters
- FAQ responses
- Status reports
- Leadership updates
- Project updates
- Incident reports

## How to use this skill

To write any internal communication:

1. **Identify the communication type** from the request
2. **Load the appropriate guideline file** from the `examples/` directory:
    - `examples/3p-updates.md` - For Progress/Plans/Problems team updates
    - `examples/company-newsletter.md` - For company-wide newsletters
    - `examples/faq-answers.md` - For answering frequently asked questions
    - `examples/general-comms.md` - For anything else that doesn't explicitly match one of the above
3. **Follow the specific instructions** in that file for formatting, tone, and content gathering

For other formats, use the provided audience/purpose and the general guide. Ask only for missing information that materially changes the draft.

## Scope and example

Use the supplied audience, date range and approved sources. Read only relevant
accessible material; reactions, executive seniority and document views are not proof
of accuracy. A private source does not automatically belong in a company-wide update.
Drafting does not authorize sending, scheduling or publishing the communication.

For a weekly 3P update, turn two confirmed shipped items, one next-week task and one
open dependency into Progress/Plans/Problems. Preserve dates and uncertainty, link the
source where appropriate and leave unknown metrics out. Expected handoff is a draft
for the intended audience, not a claim that a message was sent.

## Keywords
3P updates, company newsletter, company comms, weekly update, faqs, common questions, updates, internal comms

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.
