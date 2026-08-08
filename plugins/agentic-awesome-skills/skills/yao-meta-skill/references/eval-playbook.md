# Trigger And Eval Playbook

Use this playbook for skills that matter enough to test.

## A. Trigger Evaluation

Create three prompt buckets:

### 1. Should Trigger

Prompts that clearly need the skill.

Goal:

- verify recall

### 2. Should Not Trigger

Prompts that are clearly outside the skill boundary.

Goal:

- verify precision

### 3. Near Neighbors

Prompts that look similar but should use another skill or no skill.

Goal:

- catch false positives and ambiguous routing

## B. Execution Evaluation

For each important use case, create 1 to 3 realistic prompts with:

- user-like phrasing
- representative inputs or file types
- expected output description
- key checks

## C. Revision Loop

When a skill underperforms:

1. Fix boundary or description problems before adding more body text.
2. Move brittle logic into scripts or templates.
3. Split reference content if `SKILL.md` becomes bloated.
4. Re-run the same eval set before expanding scope.

## D. Minimum QA By Skill Tier

### Personal skill

- 2 realistic prompts
- manual review

### Team skill

- 3 to 5 realistic prompts
- trigger positives and negatives
- one revision loop

### Infrastructure or meta-skill

- 5+ execution prompts
- trigger positives, negatives, and near neighbors
- benchmark notes across revisions
- ownership and drift review
