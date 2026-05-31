---
name: doc2math
description: Convert any narrative document to a formal Mathematical Problem Specification (MPS) — activate when user provides a research paper, problem description, spec, or technical document and wants it formalized into variables, operators, constraints, objectives, and uncertainty. Uses Zero-Inference Protocol.
risk: safe
source: community
date_added: "2026-05-31"
---

# DOC2MATH — Document-to-Mathematics Problem Specification

## When to Use This Skill

- "Formalize this problem statement into math"
- "Extract the mathematical structure from this research paper section"
- "What variables, constraints, and objectives are in this spec?"
- "Convert this word problem to a structured MPS"
- "Find what's missing in this problem formulation"

## Zero-Inference Protocol (Mandatory)

1. **Closed World** — if it is not stated in the document, it does not exist in output
2. **Grounding Rule** — every element must cite the exact source phrase (`"evidence"` field)
3. **No Silent Filling** — unknown values use `null`; ambiguous types use `"ambiguous"`
4. **Inference Tagging** — structural inferences tagged `"inferred": true` with `"inference_basis"`
5. **MISSING Markers** — elements mentioned but insufficiently defined get `"status": "MISSING"` with `"missing_reason"`
6. **No Hallucinated Math** — never introduce equations or values not in the source text

## How It Works

### Step 1 — Receive Document

Accept the document text, research excerpt, problem description, or specification as input.

### Step 2 — Classify

Identify `problem_class`: `optimization | classification | simulation | proof | estimation | other`

### Step 3 — Extract MPS Components

**Variables** — `id`, `name`, `symbol`, `type`, `domain`, `units`, `role`, `evidence`, `inferred`, `status`

**Operators** — `id`, `name`, `symbol`, `arity`, `acts_on`, `produces`, `evidence`, `inferred`

**Constraints** — `id`, `type`, `expression`, `variables_involved`, `evidence`, `hardness`, `inferred`, `status`

**Objectives** — `id`, `direction` (minimize/maximize/satisfy/find/prove), `expression`, `variables_involved`, `evidence`, `inferred`

**Uncertainty** — `id`, `type` (stochastic/epistemic/measurement/model/none_stated), `affects`, `characterization`, `evidence`, `status`

### Step 4 — Surface Missing Information

Identify what the document implies but doesn't state: `missing_information[]` with `element`, `needed_for`, `missing_reason`.

### Step 5 — Validate and Score

`validation_flags`:
- `has_complete_objectives`: true/false/partial
- `has_bounded_variables`: true/false/partial
- `has_evidence_for_all_elements`: true/false/partial
- `inference_count`: integer
- `missing_count`: integer
- `overall_formalizability`: HIGH/MEDIUM/LOW

## Output Format

Produce the complete MPS as a JSON object:

```json
{
  "mps_version": "1.0",
  "source_title": "...",
  "problem_class": "optimization",
  "variables": [...],
  "operators": [...],
  "constraints": [...],
  "objectives": [...],
  "uncertainty": [...],
  "missing_information": [...],
  "validation_flags": {
    "overall_formalizability": "HIGH"
  }
}
```

## Best Practices

- ✅ Apply all 6 Zero-Inference Protocol rules before outputting any element
- ✅ Surface MISSING markers rather than silently inferring — incomplete formalization is valid output
- ✅ Cite the exact source phrase in every `evidence` field
- ❌ Never introduce mathematical relationships not grounded in the source text

## Additional Resources

- Repository: [thebrierfox/doc2math-skill](https://github.com/thebrierfox/doc2math-skill)
- Full BYOK tool: [ace-license-server-production.up.railway.app/byok/doc2math](https://ace-license-server-production.up.railway.app/byok/doc2math)
- Built by [IntuiTek¹](https://intuitek.ai) (~K¹) — MIT License
