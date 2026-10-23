---
name: github-issue-creator
description: "Turn error logs, screenshots, voice notes, and rough bug reports into crisp, developer-ready GitHub issues with repro steps, impact, and evidence."
risk: critical
source: community
date_added: "2026-02-27"
---

# GitHub Issue Creator

Transform messy input (error logs, voice notes, screenshots) into clean, actionable GitHub issues.

## Output Template

````markdown
## Summary
[One-line description of the issue]

## Environment
- **Product/Service**: 
- **Region/Version**: 
- **Browser/OS**: (if relevant)

## Reproduction Steps
1. [Step]
2. [Step]
3. [Step]

## Expected Behavior
[What should happen]

## Actual Behavior
[What actually happens]

## Error Details
```
[Error message/code if applicable]
```

## Visual Evidence
[Reference to attached screenshots/GIFs]

## Impact
[Severity: Critical/High/Medium/Low + brief explanation]

## Additional Context
[Any other relevant details]
````

## Output Location

**Draft issues as Markdown files** in the project's existing issue-draft location (or `issues/` relative to the repository root when appropriate), not filesystem-root `/issues/`. Creating a public GitHub issue requires explicit publication authorization. Use naming convention: `YYYY-MM-DD-short-description.md`

## Guidelines

**Be crisp**: No fluff. Every word should add value.

**Extract structure from chaos**: Voice dictation and raw notes often contain the facts buried in casual language. Pull them out.

**Preserve uncertainty**: If user mentions "same project" or "the dashboard", use confirmed conversation context; label missing or inferred details instead of inventing a product, region, successful run or reproduction.

**Placeholder sensitive data**: Use `[PROJECT_NAME]`, `[USER_ID]`, etc. for anything that might be sensitive.

**Match severity to impact**:
- Critical: Service down, data loss, security issue
- High: Major feature broken, no workaround
- Medium: Feature impaired, workaround exists
- Low: Minor inconvenience, cosmetic

**Image/GIF handling**: Reference attachments inline. Format: `![Description](https://example.com/attachment.png)` (syntax example; replace with the actual attachment reference); never invent an attachment URL.

## Examples

**Input (voice dictation)**:
> so I was trying to deploy the agent and it just failed silently no error nothing the workflow ran but then poof gone from the list had to refresh and try again three times

**Output**:
````markdown
## Summary
Agent deployment fails silently - no error displayed, agent disappears from list

## Environment
- **Product/Service**: Unknown from supplied note
- **Region/Version**: Unknown

## Reproduction Steps
1. Navigate to agent deployment
2. Configure and deploy agent
3. Observe the reported workflow run (completion status unconfirmed)
4. Check agent list

## Expected Behavior
Agent appears in list with deployment status, errors shown if deployment fails

## Actual Behavior
Agent disappears from list. No error message. Requires page refresh and retry.

## Impact
**High** - Blocks agent deployment workflow, no feedback on failure cause

## Additional Context
Reporter refreshed and retried three times; final success is unconfirmed
````

---

**Input (error paste)**:
> Error: PERMISSION_DENIED when publishing to Teams channel. Code: 403. Was working yesterday.

**Output**:
````markdown
## Summary
403 PERMISSION_DENIED error when publishing to Teams channel

## Environment
- **Product/Service**: Teams integration; originating product unconfirmed
- **Region/Version**: [REGION]

## Reproduction Steps
1. Use the existing Teams publishing configuration (setup details unconfirmed)
2. Attempt to publish

## Expected Behavior
Agent publishes successfully to Teams channel

## Actual Behavior
Returns `PERMISSION_DENIED` with code 403

## Error Details
```
Error: PERMISSION_DENIED
Code: 403
```

## Impact
**High** - Blocks Teams integration, regression from previous working state

## Additional Context
Was working yesterday - possible permission/config change or service regression
````

## When to Use
Use this skill when you have unstructured bug input such as pasted errors, support notes, screenshots, or voice dictation and need to turn it into a clean GitHub issue with a summary, reproduction steps, expected vs actual behavior, impact, and attachment references.

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.
