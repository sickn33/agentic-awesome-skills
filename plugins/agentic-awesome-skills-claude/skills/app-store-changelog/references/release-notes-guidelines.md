# App Store Release Notes Guidelines

## Goals
- Produce user-facing release notes that describe visible changes since the last tag.
- Include all user-impacting changes; omit purely internal or refactor-only work.
- Keep language plain, short, and benefit-focused.

## Output Shape
- Prefer 5 to 10 bullets total for most releases.
- Group by theme if needed: New, Improved, Fixed.
- Each bullet should be one sentence and start with a verb.
- Avoid internal codenames, ticket IDs, or file paths.

## Filtering Rules
- Include: new features, UI changes, behavior changes, bug fixes users would notice, performance improvements with visible impact.
- Exclude: refactors, dependency bumps, CI changes, developer tooling, internal logging, analytics changes unless they affect user privacy or behavior.
- If a change is ambiguous, ask for clarification or describe it as a small improvement only if it is user-visible.

## Language Guidance
- Translate technical terms into user-facing descriptions.
- Avoid versions of "API", "refactor", "nil", "crash log", or "dependency".
- Prefer "Improved", "Added", "Fixed", "Updated" or action verbs like "Search", "Upload", "Sync".
- Keep tense present or past: "Added", "Improved", "Fixed".

## Examples
- "Added account switching from the profile menu."
- "Improved timeline loading speed on slow connections."
- "Fixed media attachments not opening in full screen."

## QA Checklist
- Every bullet ties to a real change in the range.
- No duplicate bullets that describe the same change.
- No internal jargon or file paths.
- Final list fits App Store text limits for the target storefront if provided.
