# User Story Template

Use this template to write a single user story with Gherkin-style acceptance criteria.

## Provenance
Adapted from `prompts/user-story-prompt-template.md` in the `https://github.com/deanpeters/product-manager-prompts` repo.

## Template
```markdown
### User Story [ID]:

- **Summary:** [Brief, memorable title focused on user value]

#### Use Case:
- **As a** [user name if available, otherwise persona, otherwise role]
- **I want to** [action the user takes to get to the outcome]
- **so that** [desired outcome for the user]

#### Acceptance Criteria:
- **Scenario:** [Brief, human-readable scenario describing value]
- **Given:** [Initial context or precondition]
- **and Given:** [Additional context or preconditions]
- **and Given:** [Additional context as needed]
- **and Given:** [UI-focused context ensuring the When can happen]
- **and Given:** [Outcomes-focused context ensuring the Then is delivered]
- **When:** [Event that triggers the action]
- **Then:** [Expected outcome aligned to "so that"]
```

## Notes
- Use only one **When** and one **Then**. Multiple When/Then pairs usually mean the story should be split.
- If you need multiple outcomes, split the story with `skills/user-story-splitting/SKILL.md`.
