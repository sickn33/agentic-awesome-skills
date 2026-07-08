# Pattern Extraction Doctrine

Use this doctrine when a skill borrows ideas from GitHub repositories, products, papers, experts, or user-supplied references. The goal is to extract durable patterns, not copy surface style.

## Principle

A borrowed pattern must improve the current skill's reliability, clarity, or portability faster than it increases context cost.

## Four-Gate Pattern Test

Accept a pattern only when it passes enough of these gates for the skill's risk tier.

### 1. Recurrence

The pattern appears in more than one serious example, source, workflow, or usage scenario.

Use it to reject one-off tricks that look impressive but have no durable signal.

### 2. Generativity

The pattern can guide a new case, not just explain the original example.

Use it to prefer operating principles, decision rules, and workflow loops over anecdotes.

### 3. Distinctiveness

The pattern is more specific than generic good advice.

Use it to reject empty claims such as "be clear", "be useful", or "add quality" unless the reference shows how.

### 4. Boundary

The pattern has a known limit: when not to apply it, what not to borrow, or what cost it introduces.

Use it to prevent reference scans from becoming unbounded feature expansion.

## Acceptance Rule

- `Scaffold`: accept a pattern when it has generativity and boundary clarity.
- `Production`: require recurrence, generativity, and boundary clarity.
- `Library`: require recurrence, generativity, distinctiveness, and boundary clarity.
- `Governed`: require all four gates plus reviewer-visible evidence.

When the evidence is not strong enough, move the pattern into an iteration candidate instead of the first package.

## What To Borrow

Borrow:

- high-signal workflow loops
- evidence-backed quality gates
- repeatable review checkpoints
- crisp output shapes
- boundary language that prevents route confusion
- portability patterns that preserve meaning across environments

## What Not To Borrow

Do not borrow:

- source branding
- long prose
- roleplay style that does not match the target skill
- heavy research workflows for low-risk scaffolds
- platform-specific assumptions hidden inside a general method
- impressive examples that cannot be verified or generalized

## Reviewer Questions

Before accepting a borrowed pattern, ask:

- Where else does this pattern appear?
- What new case can it help solve?
- What makes it more specific than generic advice?
- When should this skill refuse to use it?
- What file, report, eval, or checklist proves it earned its weight?
