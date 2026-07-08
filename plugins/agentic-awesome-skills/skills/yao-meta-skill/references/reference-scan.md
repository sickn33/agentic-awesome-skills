# Reference Scan Strategy

Use a short benchmark scan before deep authoring. The goal is to borrow durable patterns from strong reference objects without importing their prose, weight, or brand language into the new skill.

## Source Priority

Reference scan has two layers, and they must not be treated equally:

1. **External Benchmark Scan**
   - primary source of patterns
   - use high-star public GitHub repos, official docs, strong public examples, and world-class products
   - this layer defines the upper bound for quality
2. **User Reference Intake**
   - a taste-and-standard layer
   - ask whether the user has reference repos, products, pages, prompts, or systems they admire
   - learn only the pattern, structure, boundary, or quality bar; never copy wording or private material
3. **Local Fit Check**
   - secondary calibration layer
   - use local files only for naming, privacy, compatibility, migration, and library-fit constraints
   - this layer should not define the main design pattern

External sources should lead. User references should sharpen direction. Local files should calibrate.

## Default Visibility

Reference synthesis should be silent by default.

- do the benchmark scan and pattern synthesis in the background
- convert the result into a recommendation for the user
- surface the full evidence only to authors and reviewers
- only expose the underlying tradeoffs to the user when intent is still uncertain or a real design conflict needs a decision

## Why This Step Exists

A new skill often fails because it starts from an isolated idea instead of a proven pattern. A controlled reference scan improves the package before it grows:

- better boundary design
- cleaner folder and metadata choices
- more realistic quality gates
- stronger portability decisions
- better alignment with the user's own taste and quality bar

## The Rule

Reference scanning is mandatory for:

- `Production` skills
- `Library` skills
- `Governed` skills
- meta-skills or packaging-heavy skills

Reference scanning is optional for:

- `Scaffold` skills
- one-person exploratory skills

## Scope Limit

Do not turn this into open-ended research.

- scan at most `3-5` reference objects
- pick from no more than `3` categories
- extract patterns, not long copied content
- stop as soon as the borrow plan is clear
- prefer at least `2` external benchmark objects before treating the scan as complete
- if the user provides references, record what they admire and what should explicitly not be copied

## Pattern Acceptance

Borrowed ideas must pass a lightweight pattern test before they shape the first package.

- `recurrence`: the pattern appears in more than one serious context or source
- `generativity`: the pattern can guide new cases, not just explain one example
- `distinctiveness`: the pattern is more specific than generic good advice
- `boundary`: the pattern names where not to apply it or what cost it introduces

For low-risk scaffold work, generativity plus boundary clarity can be enough. For production, library, and governed work, require more evidence before the pattern changes the package shape.

See [Pattern Extraction Doctrine](pattern-extraction-doctrine.md).

## Reference Categories

Choose the smallest relevant set:

- `method`: loops, evaluation discipline, iteration structure
- `structure`: package anatomy, resource boundaries, metadata patterns
- `execution`: operator flow, scripts, initialization and validation experience
- `portability`: neutral metadata, adapters, degradation strategy
- `domain`: workflow-specific patterns from a top example in the same problem space

## Output Format

A good scan produces a short report with:

1. current skill anchor
2. scan focus
3. external benchmark objects
4. user-supplied references
5. local fit constraints
6. what to borrow
7. what not to borrow
8. a compact borrow plan

## What To Borrow

Borrow:

- repeatable loops
- clear boundary patterns
- proven gate choices
- portable metadata ideas
- clear operator-facing flows
- high-signal examples that show the finished experience, not just the internal method

Do not borrow:

- source-specific branding
- long copied prose
- unnecessary directories
- quality gates that exceed the skill's risk tier
- platform lock-in disguised as best practice
- local historical habits that are weaker than public top-tier benchmarks

## Design Principle

The scan is successful only if it raises skill quality faster than it raises context cost. If benchmark material makes the new skill heavier without making it more reliable, discard it.
