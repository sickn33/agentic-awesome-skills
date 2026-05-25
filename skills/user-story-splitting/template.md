# User Story Splitting Template

Use this template to split a large story into smaller, independently deliverable user stories.

## Provenance
Adapted from `prompts/user-story-splitting-prompt-template.md` in the `https://github.com/deanpeters/product-manager-prompts` repo.

## Splitting Logic (Use in Order)
1. Workflow steps
2. Business rule variations
3. Data variations
4. Acceptance criteria complexity (multiple When/Then pairs)
5. Major effort milestones
6. External dependencies
7. DevOps steps
8. Tiny Acts of Discovery (TADs) if none apply

## Output Template
```markdown
### Original Story
[Story written using `skills/user-story/template.md`]

### Suggested Splits
1. Split 1 using **[rule name]**:
   - [Left split story, using `skills/user-story/template.md`]
   - [Right split story, using `skills/user-story/template.md`]
2. Split 2 using **[rule name]**:
   - [Left split story]
   - [Right split story]
3. Split 3 using **[rule name]**:
   - [Left split story]
   - [Right split story]
```

## Notes
- Each split should deliver user value on its own.
- If no rule applies, propose TADs to de-risk and clarify before writing stories.
