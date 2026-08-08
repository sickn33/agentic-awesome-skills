# Anti-Rationalization Guide

Techniques for bulletproofing skills against agent rationalization.

## The Problem

Discipline-enforcing skills (like TDD) face a unique challenge: smart agents under pressure will find loopholes.

**Example**: Skill says "Write test first". Agent under deadline thinks:

- "This is too simple to test"
- "I'll test after, same result"
- "It's the spirit that matters, not ritual"

## Psychology Foundation

Understanding WHY persuasion works helps apply it systematically.

**Research basis**: Cialdini (2021), Meincke et al. (2025)

**Core principles**:

- **Authority**: "The TDD community agrees..."
- **Commitment**: "You already said you follow TDD..."
- **Scarcity**: "Missing tests now = bugs later"
- **Social Proof**: "All tested code passing CI proves value"
- **Unity**: "We're engineers who value quality"

## Technique 1: Close Every Loophole Explicitly

Don't just state the rule - forbid specific workarounds.

### Bad Example

```markdown
Write code before test? Delete it.
```

### Good Example

```markdown
Write code before test? Delete it. Start over.

**No exceptions**:

- Don't keep it as "reference"
- Don't "adapt" it while writing tests
- Don't look at it
- Delete means delete
```

**Why it works**: Agents try specific workarounds. Counter each explicitly.

## Technique 2: Address "Spirit vs Letter" Arguments

Add foundational principle early:

```markdown
**Violating the letter of the rules is violating the spirit of the rules.**
```

**Why it works**: Cuts off entire class of "I'm following the spirit" rationalizations.

## Technique 3: Build Rationalization Table

Capture excuses from baseline testing. Every rationalization goes in table:

```markdown
| Excuse                           | Reality                                                                 |
| -------------------------------- | ----------------------------------------------------------------------- |
| "Too simple to test"             | Simple code breaks. Test takes 30 seconds.                              |
| "I'll test after"                | Tests passing immediately prove nothing.                                |
| "Tests after achieve same goals" | Tests-after = "what does this do?" Tests-first = "what should this do?" |
| "It's about spirit not ritual"   | The letter IS the spirit. TDD's value comes from the specific sequence. |
```

**Why it works**: Agents read table, recognize their own thinking, see the counter-argument.

## Technique 4: Create Red Flags List

Make it easy for agents to self-check when rationalizing:

```markdown
## Red Flags - STOP and Start Over

- Code before test
- "I already manually tested it"
- "Tests after achieve the same purpose"
- "It's about spirit not ritual"
- "This is different because..."

**All of these mean**: Delete code. Start over with TDD.
```

**Why it works**: Simple checklist, clear action (delete & restart).

## Technique 5: Update Description for Violation Symptoms

Add to description: symptoms of when you're ABOUT to violate:

```yaml
# ❌ BAD: Only describes what skill does
description: TDD methodology for writing code

# ✅ GOOD: Includes pre-violation symptoms
description: Use when implementing any feature or bugfix, before writing implementation code
metadata:
  triggers: new feature, bug fix, code change
```

**Why it works**: Triggers skill BEFORE violation, not after.

## Technique 6: Use Strong Language

Weak language invites rationalization:

```markdown
# Weak

You should write tests first.
Generally, test before code.
It's better to test first.

# Strong

ALWAYS write test first.
NEVER write code before test.
Test-first is MANDATORY.
```

**Why it works**: No ambiguity, no wiggle room.

## Technique 7: Invoke Commitment & Consistency

Reference agent's own standards:

```markdown
You claimed to follow TDD.
TDD means test-first.
Code-first is NOT TDD.

**Either**:

- Follow TDD (test-first), or
- Admit you're not doing TDD

Don't redefine TDD to fit what you already did.
```

**Why it works**: Agents resist cognitive dissonance (Festinger, 1957).

## Technique 8: Provide Escape Hatch for Legitimate Cases

If there ARE valid exceptions, state them explicitly:

```markdown
## When NOT to Use TDD

- Spike solutions (throwaway exploratory code)
- One-time scripts deleting in 1 hour
- Generated boilerplate (verified via other means)

**Everything else**: Use TDD. No exceptions.
```

**Why it works**: Removes "but this is different" argument for non-exception cases.

## Complete Bulletproofing Checklist

For discipline-enforcing skills:

**Loophole Closing**:

- [ ] Forbidden each specific workaround explicitly?
- [ ] Added "spirit vs letter" principle?
- [ ] Built rationalization table from baseline tests?
- [ ] Created red flags list?

**Strength**:

- [ ] Used strong language (ALWAYS/NEVER)?
- [ ] Invoked commitment & consistency?
- [ ] Provided explicit escape hatch?

**Discovery**:

- [ ] Description includes pre-violation symptoms?
- [ ] Keywords target moment BEFORE violation?

**Testing**:

- [ ] Tested with combined pressures?
- [ ] Agent complied under maximum pressure?
- [ ] No new rationalizations found?

## Real-World Example: TDD Skill

### Baseline Rationalizations Found

1. "Too simple to test"
2. "I'll test after"
3. "Spirit not ritual"
4. "Already manually tested"
5. "This is different because..."

### Counters Applied

**Rationalization table**:

```markdown
| Excuse               | Reality                                                        |
| -------------------- | -------------------------------------------------------------- |
| "Too simple to test" | Simple code breaks. Test takes 30 seconds.                     |
| "I'll test after"    | Tests passing immediately prove nothing.                       |
| "Spirit not ritual"  | The letter IS the spirit. TDD's value comes from the sequence. |
| "Manually tested"    | Manual tests don't run automatically. They rot.                |
```

**Red flags**:

```markdown
## Red Flags - STOP

- Code before test
- "I already tested manually"
- "Spirit not ritual"
- "This is different..."

All mean: Delete code. Start over.
```

**Result**: Agent compliance under combined time + sunk cost pressure.

## Common Mistakes

| Mistake                                | Fix                                                            |
| -------------------------------------- | -------------------------------------------------------------- |
| Trust agents will "get the spirit"     | Close explicit loopholes. Agents are smart at rationalization. |
| Use weak language ("should", "better") | Use ALWAYS/NEVER for discipline rules.                         |
| Skip rationalization table             | Every excuse needs explicit counter.                           |
| No red flags list                      | Make self-checking easy.                                       |
| Generic description                    | Add pre-violation symptoms to trigger skill earlier.           |

## Meta-Strategy

**For each new rationalization**:

1. Document it verbatim (from failed test)
2. Add to rationalization table
3. Update red flags list
4. Re-test

**Iterate until**: Agent can't find ANY rationalization that works.

That's bulletproof.
