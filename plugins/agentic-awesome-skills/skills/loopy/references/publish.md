# Prepare or Publish a Loop

Use this workflow when the user asks Loopy to share, submit, or publish a loop
to Loop Library. Preparing content is distinct from performing the external
submission.

## Prepare the candidate

1. Resolve the exact loop and its author or contributor attribution. Do not
   invent ownership, dates, source links, results, or claims.
2. Run the crafted-loop preflight in `SKILL.md`. Require a real feedback cycle,
   reproducible verification, bounded actions, explicit stops, and approval
   boundaries where needed.
3. Search the live catalog by outcome, trigger, verification, keywords, and
   related workflows. Prefer contributing an adaptation or improvement when a
   strong match already exists. If the catalog is unavailable, stop before
   submission because duplication cannot be checked.
4. Prepare the fields required by the current official submission surface or,
   when working in the Loop Library repository, the current schema and example
   record. Validate with repository tooling when available. Keep the public
   prompt compact; place optional long-form guidance in supported secondary
   fields rather than bloating the prompt.
5. Show the exact proposed record, destination, attribution, and requested
   state. Clearly distinguish a public suggestion, an owner-only draft, and a
   public publication. For a public suggestion, also show the exact current
   ownership and license attestation required by the official surface.

## Require approval and read back

- Do not send a suggestion, save an owner draft, or publish publicly without
  explicit approval of the preview.
- Never set a public suggestion's permission or attestation field from generic
  approval to submit. Require the user to explicitly confirm the exact current
  ownership and license terms shown in the preview.
- Use only official submission or authenticated owner tools already available
  in scope. Never expose owner credentials or bypass validation.
- Default an authorized owner action to a draft unless the user explicitly
  approves public publication. Approval to save a draft is not approval to
  publish it.
- For a public suggestion, treat the official surface's successful acceptance
  response as the receipt. Do not invent an identifier or claim that the
  owner-only suggestion was saved, reviewed, drafted, or published.
- For an owner draft, read back its identifier and draft status. For public
  publication, verify the live detail page and catalog entry before reporting
  success. Report validation, authorization, or required readback failures as
  blocked.

## Return the preview or receipt

Before approval, return:

```markdown
## Loopy publication preview

Destination: [official surface]
State: Suggestion | Draft | Public
Duplicate check: Clear | Possible overlap | Blocked
Attestation: [exact current ownership/license terms, or Not applicable]
Candidate: [exact record or concise field-by-field preview]
```

After an approved public suggestion, return the acceptance response and state
only that the suggestion was received. After an owner action, return the
resulting identifier, state, and required readback evidence. Do not call a
prepared preview or accepted suggestion “published.”
