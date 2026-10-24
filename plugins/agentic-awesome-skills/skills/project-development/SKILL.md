---
name: project-development
description: "This skill covers the principles for identifying tasks suited to LLM processing, designing effective project architectures, and iterating rapidly using agent-assisted development."
risk: critical
source: community
date_added: "2026-03-06"
---

# Project Development Methodology

This skill covers the principles for identifying tasks suited to LLM processing, designing effective project architectures, and iterating rapidly using agent-assisted development. The methodology applies whether building a batch processing pipeline, a multi-agent research system, or an interactive agent application.

## When to Use
Activate this skill when:
- Starting a new project that might benefit from LLM processing
- Evaluating whether a task is well-suited for agents versus traditional code
- Designing the architecture for an LLM-powered application
- Planning a batch processing pipeline with structured outputs
- Choosing between single-agent and multi-agent approaches
- Estimating costs and timelines for LLM-heavy projects

## Core Concepts

### Task-Model Fit Recognition

Not every problem benefits from LLM processing. The first step in any project is evaluating whether the task characteristics align with LLM strengths. This evaluation should happen before writing any code.

**LLM-suited tasks share these characteristics:**

| Characteristic | Why It Fits |
|----------------|-------------|
| Synthesis across sources | LLMs excel at combining information from multiple inputs |
| Subjective judgment with rubrics | LLMs handle grading, evaluation, and classification with criteria |
| Natural language output | When the goal is human-readable text, not structured data |
| Error tolerance | Individual failures do not break the overall system |
| Batch processing | No conversational state required between items |
| Domain knowledge in training | The model already has relevant context |

**LLM-unsuited tasks share these characteristics:**

| Characteristic | Why It Fails |
|----------------|--------------|
| Precise computation | Math, counting, and exact algorithms are unreliable |
| Real-time requirements | LLM latency is too high for sub-second responses |
| Perfect accuracy requirements | Hallucination risk makes 100% accuracy impossible |
| Proprietary data dependence | The model lacks necessary context |
| Sequential dependencies | Each step depends heavily on the previous result |
| Deterministic output requirements | Same input must produce identical output |

The evaluation should happen through manual prototyping: take one representative example and test it directly with the target model before building any automation.

### The Manual Prototype Step

Before investing in automation, validate task-model fit with a manual test. Use an authorized synthetic or minimized input in an approved model interface; do not upload proprietary data to an unapproved service. Evaluate the output quality. This takes minutes and prevents hours of wasted development.

This validation answers critical questions:
- Does the model have the knowledge required for this task?
- Can the model produce output in the format you need?
- What level of quality should you expect at scale?
- Are there obvious failure modes to address?

A failed prototype is a diagnosis point, not proof that every architecture fails. A successful example is a starting point, not scale validation; test representative and adversarial cases with held-out evaluation.

### Pipeline Architecture

LLM projects benefit from staged pipeline architectures where each stage is:
- **Discrete**: Clear boundaries between stages
- **Idempotent**: Repeating an operation does not duplicate its externally visible effects; identical LLM text is a separate determinism property
- **Cacheable**: Intermediate results persist to disk
- **Independent**: Each stage can run separately

**The canonical pipeline structure:**

```
acquire → prepare → process → parse → render
```

1. **Acquire**: Fetch raw data from sources (APIs, files, databases)
2. **Prepare**: Transform data into prompt format
3. **Process**: Execute LLM calls (the expensive, non-deterministic step)
4. **Parse**: Extract structured data from LLM outputs
5. **Render**: Generate final outputs (reports, files, visualizations)

Acquisition can change over time; preparation, parsing and rendering can be deterministic only with pinned inputs, versions and settings. Stage 3 is non-deterministic and expensive. This separation allows re-running the expensive LLM stage only when necessary, while iterating quickly on parsing and rendering.

### File System as State Machine

Use the file system to track pipeline state rather than databases or in-memory structures. Each processing unit gets a directory. Each stage completion is marked by file existence.

```
data/{id}/
├── raw.json         # acquire stage complete
├── prompt.md        # prepare stage complete
├── response.md      # process stage complete
├── parsed.json      # parse stage complete
```

File existence alone does not establish completion or idempotency. Write temporary files and atomically rename only after validation; record input hashes, model/prompt/tool versions, schema, status, output hash and request identifier in a manifest. Treat partial/stale outputs as incomplete, lock each item during mutation, and invalidate downstream caches when dependencies change. Do not delete evidence blindly to retry an uncertain paid or external action: reconcile using the persisted request ID. Use a database/queue when concurrent writers or transactional requirements exceed file-based coordination.

### Structured Output Design

When LLM outputs must be parsed programmatically, prompt design directly determines parsing reliability. The prompt must specify exact format requirements with examples.

**Effective structure specification includes:**

1. **Section markers**: Explicit headers or prefixes for parsing
2. **Format examples**: Show exactly what output should look like
3. **Rationale disclosure**: "I will be parsing this programmatically"
4. **Constrained values**: Enumerated options, score ranges, formats

**Example prompt structure:**
```
Analyze the following and provide your response in exactly this format:

## Summary
[Your summary here]

## Score
Rating: [1-10]

## Details
- Key point 1
- Key point 2

Follow this format exactly because I will be parsing it programmatically.
```

The parsing code must handle variations gracefully. LLMs do not follow instructions perfectly. Build parsers that:
- Use regex patterns flexible enough to handle minor formatting variations
- Reject or mark incomplete missing required fields; never invent a successful default score
- Log parsing failures for later review rather than crashing

### Agent-Assisted Development

Modern agent-capable models can accelerate development significantly. The pattern is:

1. Describe the project goal and constraints
2. Let the agent generate initial implementation
3. Test and iterate on specific failures
4. Refine prompts and architecture based on results

This is about rapid iteration: generate, test, fix, repeat. The agent handles boilerplate and initial structure while you focus on domain-specific requirements and edge cases.

Key practices for effective agent-assisted development:
- Provide clear, specific requirements upfront
- Break large projects into discrete components
- Test each component before moving to the next
- Keep the agent focused on one task at a time

### Cost and Scale Estimation

LLM processing has predictable costs that should be estimated before starting. The formula:

```
Total cost = input_tokens × input_rate + output_tokens × output_rate + reasoning/tool/media charges + retries + infrastructure
```

For batch processing:
- Estimate input tokens per item (prompt + context)
- Estimate output tokens per item (typical response length)
- Multiply by item count
- Add 20-30% buffer for retries and failures

Track actual costs during development. If costs exceed estimates significantly, re-evaluate the approach. Consider:
- Reducing context length through truncation
- Using smaller models for simpler items
- Caching and reusing partial results
- Parallel processing to reduce wall-clock time (not token cost)

## Detailed Topics

### Choosing Single vs Multi-Agent Architecture

Single-agent pipelines work for:
- Batch processing with independent items
- Tasks where items do not interact
- Simpler cost and complexity management

Multi-agent architectures work for:
- Parallel exploration of different aspects
- Tasks exceeding single context window capacity
- When specialized sub-agents improve quality

The primary reason for multi-agent is context isolation, not role anthropomorphization. Sub-agents get fresh context windows for focused subtasks. This prevents context degradation on long-running tasks.

See `multi-agent-patterns` skill for detailed architecture guidance.

### Architectural Reduction

Start with minimal architecture. Add complexity only when proven necessary. Evaluate whether fewer tools improve the actual task; broader shell/SQL primitives can expand permissions and failure impact.

The linked Vercel case study is one environment-specific example, not a general success-rate guarantee.

**When reduction outperforms complexity:**
- Your data layer is well-documented and consistently structured
- The model has sufficient reasoning capability
- Your specialized tools were constraining rather than enabling
- You are spending more time maintaining scaffolding than improving outcomes

**When complexity is necessary:**
- Your underlying data is messy, inconsistent, or poorly documented
- The domain requires specialized knowledge the model lacks
- Safety constraints require limiting agent capabilities
- Operations are truly complex and benefit from structured workflows

See `tool-design` skill for detailed tool architecture guidance.

### Iteration and Refactoring

Expect to refactor. Production agent systems at scale require multiple architectural iterations. The linked context-engineering experience is historical and environment-specific. The Bitter Lesson suggests that structures added for current model limitations become constraints as models improve.

Build for change:
- Keep architecture simple and unopinionated
- Test across model strengths to verify your harness is not limiting performance
- Design systems that benefit from model improvements rather than locking in limitations

## Practical Guidance

### Project Planning Template

1. **Task Analysis**
   - What is the input? What is the desired output?
   - Is this synthesis, generation, classification, or analysis?
   - What error rate is acceptable?
   - What is the value per successful completion?

2. **Manual Validation**
   - Test one example with target model
   - Evaluate output quality and format
   - Identify failure modes
   - Estimate tokens per item

3. **Architecture Selection**
   - Single pipeline vs multi-agent
   - Required tools and data sources
   - Storage and caching strategy
   - Parallelization approach

4. **Cost Estimation**
   - Items × tokens × price
   - Development time
   - Infrastructure requirements
   - Ongoing operational costs

5. **Development Plan**
   - Stage-by-stage implementation
   - Testing strategy per stage
   - Iteration milestones
   - Deployment approach

### Anti-Patterns to Avoid

**Skipping manual validation**: Building automation before verifying the model can do the task wastes significant time when the approach is fundamentally flawed.

**Monolithic pipelines**: Combining all stages into one script makes debugging and iteration difficult. Separate stages with persistent intermediate outputs.

**Over-constraining the model**: Remove redundant workflow complexity only after evaluation; retain deterministic authorization, input/output validation and safety boundaries outside the model.

**Ignoring costs until production**: Token costs compound quickly at scale. Estimate and track from the beginning.

**Perfect parsing requirements**: Expecting LLMs to follow format instructions perfectly. Build robust parsers that handle variations.

**Premature optimization**: Adding caching, parallelization, and optimization before the basic pipeline works correctly.

## Examples

**Example 1: Batch Analysis Pipeline (Karpathy's HN Time Capsule)**

Task: Analyze 930 HN discussions from 10 years ago with hindsight grading.

Architecture:
- 5-stage pipeline: fetch → prompt → analyze → parse → render
- File system state: data/{date}/{item_id}/ with stage output files
- Structured output: 6 sections with explicit format requirements
- Parallel execution: 15 workers for LLM calls

Historical case-study results require verification against the linked primary sources and their evaluation conditions. They are not cost, latency or success estimates for a new project. No Case Studies or Pipeline Patterns support files are bundled.

## Guidelines

1. Validate task-model fit with manual prototyping before building automation
2. Structure pipelines as discrete, idempotent, cacheable stages
3. Use the file system for state management and debugging
4. Design prompts for structured, parseable outputs with explicit format examples
5. Start with minimal architecture; add complexity only when proven necessary
6. Estimate costs early and track throughout development
7. Build robust parsers that handle LLM output variations
8. Expect and plan for multiple architectural iterations
9. Test whether scaffolding helps or constrains model performance
10. Use agent-assisted development for rapid iteration on implementation

## Integration

This skill connects to:
- context-fundamentals - Understanding context constraints for prompt design
- tool-design - Designing tools for agent systems within pipelines
- multi-agent-patterns - When to use multi-agent versus single pipelines
- evaluation - Evaluating pipeline outputs and agent performance
- context-compression - Managing context when pipelines exceed limits

## References

Internal references:
- Case Studies - Karpathy HN Capsule, Vercel d0, Manus patterns
- Pipeline Patterns - Detailed pipeline architecture guidance

Related skills in this collection:
- tool-design - Tool architecture and reduction patterns
- multi-agent-patterns - When to use multi-agent architectures
- evaluation - Output evaluation frameworks

External resources:
- Karpathy's HN Time Capsule project: https://github.com/karpathy/hn-time-capsule
- Vercel d0 architectural reduction: https://vercel.com/blog/we-removed-80-percent-of-our-agents-tools
- Manus context engineering: Peak Ji's blog on context engineering lessons
- Anthropic multi-agent research: How we built our multi-agent research system

---

## Skill Metadata

**Created**: 2025-12-25
**Last Updated**: 2025-12-25
**Author**: Agent Skills for Context Engineering Contributors
**Version**: 1.0.0

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.
