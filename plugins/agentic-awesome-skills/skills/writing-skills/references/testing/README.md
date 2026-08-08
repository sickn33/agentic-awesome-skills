# Testing Guide - TDD for Skills

Complete methodology for testing skills using RED-GREEN-REFACTOR cycle.

## Testing All Skill Types

Different skill types need different test approaches.

### Discipline-Enforcing Skills (rules/requirements)

**Examples**: TDD, verification-before-completion, designing-before-coding

**Test with**:

- Academic questions: Do they understand the rules?
- Pressure scenarios: Do they comply under stress?
- Multiple pressures combined: time + sunk cost + exhaustion
- Identify rationalizations and add explicit counters

**Success criteria**: Agent follows rule under maximum pressure

### Technique Skills (how-to guides)

**Examples**: condition-based-waiting, root-cause-tracing, defensive-programming

**Test with**:

- Application scenarios: Can they apply the technique correctly?
- Variation scenarios: Do they handle edge cases?
- Missing information tests: Do instructions have gaps?

**Success criteria**: Agent successfully applies technique to new scenario

### Pattern Skills (mental models)

**Examples**: reducing-complexity, information-hiding concepts

**Test with**:

- Recognition scenarios: Do they recognize when pattern applies?
- Application scenarios: Can they use the mental model?
- Counter-examples: Do they know when NOT to apply?

**Success criteria**: Agent correctly identifies when/how to apply pattern

### Reference Skills (documentation/APIs)

**Examples**: API documentation, command references, library guides

**Test with**:

- Retrieval scenarios: Can they find the right information?
- Application scenarios: Can they use what they found correctly?
- Gap testing: Are common use cases covered?

**Success criteria**: Agent finds and correctly applies reference information

## Pressure Types for Testing

### Time Pressure

"You have 5 minutes to complete this task"

### Sunk Cost Pressure

"You already spent 2 hours on this, just finish it quickly"

### Authority Pressure

"The senior developer said to skip tests for this quick bug fix"

### Exhaustion Pressure

"This is the 10th task today, let's wrap it up"

## RED Phase: Baseline Testing

**Goal**: Watch the agent fail WITHOUT the skill.

**Steps**:

1. Design pressure scenario (combine 2-3 pressures)
2. Give agent the task WITHOUT the skill loaded
3. Document EXACT behavior:
   - What rationalization did they use?
   - Which pressure triggered the violation?
   - How did they justify the shortcut?

**Critical**: Copy exact quotes. You'll need them for GREEN phase.

**Example Baseline**:

```
Scenario: Implement feature under time pressure
Pressure: "You have 10 minutes"
Agent response: "Since we're short on time, I'll implement the feature first
and add tests after. Testing later achieves the same goal."
```

## GREEN Phase: Minimal Implementation

**Goal**: Write skill that addresses SPECIFIC baseline failures.

**Steps**:

1. Review baseline rationalizations
2. Write skill sections that counter THOSE EXACT arguments
3. Re-run scenario WITH skill
4. Agent should now comply

**Bad (too general)**:

```markdown
## Testing

Always write tests.
```

**Good (addresses specific rationalization)**:

```markdown
## Common Rationalizations

| Excuse                              | Reality                                                                 |
| ----------------------------------- | ----------------------------------------------------------------------- |
| "Testing after achieves same goals" | Tests-after = "what does this do?" Tests-first = "what should this do?" |
| "Too simple to test"                | Simple code breaks. Test takes 30 seconds.                              |
```

## REFACTOR Phase: Loophole Closing

**Goal**: Find and plug new rationalizations.

**Steps**:

1. Agent found new workaround? Document it.
2. Add explicit counter to skill
3. Re-test same scenario
4. Repeat until bulletproof

**Pattern**:

```markdown
## Red Flags - STOP and Start Over

- Code before test
- "I already manually tested it"
- "Tests after achieve the same purpose"
- "It's about spirit not ritual"
- "This is different because..."

**All of these mean**: Delete code. Start over with TDD.
```

## Complete Test Checklist

Before deploying a skill:

**Baseline (RED)**:

- [ ] Designed 3+ pressure scenarios
- [ ] Ran scenarios WITHOUT skill
- [ ] Documented verbatim agent responses
- [ ] Identified pattern in rationalizations

**Implementation (GREEN)**:

- [ ] Skill addresses SPECIFIC baseline failures
- [ ] Re-ran scenarios WITH skill
- [ ] Agent complied in all scenarios
- [ ] No hand-waving or generic advice

**Bulletproofing (REFACTOR)**:

- [ ] Tested with combined pressures
- [ ] Found and documented new rationalizations
- [ ] Added explicit counters
- [ ] Re-tested until no more loopholes
- [ ] Created "Red Flags" section

## Common Testing Mistakes

| Mistake                        | Fix                                                       |
| ------------------------------ | --------------------------------------------------------- |
| "I'll test if problems emerge" | Problems = agents can't use skill. Test BEFORE deploying. |
| "Skill is obviously clear"     | Clear to you ≠ clear to agents. Test it.                  |
| "Testing is overkill"          | Untested skills have issues. Always.                      |
| "Academic review is enough"    | Reading ≠ using. Test application scenarios.              |

## Meta-Testing

**Test the test**: If agent passes too easily, your test is weak.

**Good test indicators**:

- Agent fails WITHOUT skill (proves skill is needed)
- Agent p asses WITH skill (proves skill works)
- Multiple pressures needed to trigger failure (proves realistic)

**Bad test indicators**:

- Agent passes even without skill (test is irrelevant)
- Agent fails even with skill (skill is unclear)
- Single obvious scenario (test is too simple)
