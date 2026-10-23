# Autonomous Multi-Agent Alignment & Boundary Governance Protocol

## 1. Executive Principle: An Alignment Harness for Machine Swarms

In modern software development driven by autonomous multi-agent teams (e.g. **1 Integrator/Admin + N Workers + 1 QC Auditor**), Product Design Harness serves as the **machine-readable boundary constitution**, rather than a bureaucratic form for human developers.

- **Human's Role**: Sole Judge and Strategic Founder (sets high-level intent, evaluates trade-offs, grants external permissions).
- **Integrator / Admin**: Deconstructs work packages, enforces path locks, and dispatches tasks bounded by the Harness contract.
- **Workers (Autonomous Coding Agents)**: Execute with maximum speed *strictly within* the `may_do` scope in isolated worktrees; zero scope expansion.
- **QC Auditor (Independent Review Agent)**: Read-only auditor validating code diffs against the Harness `must_not_do` boundaries and reporting scope violations.

---

## 2. Advisory Routing and Validated Execution Boundaries

Use the smallest responsible review mode without turning a heuristic into permission to execute.

1. **Routing is advisory**:
   - `scripts/jev_gate.py route` labels a task as routine, discovery, or commitment. It always returns `bypass: false` and `review_required: true`.
   - Routine words cannot establish actual scope or risk. A scope above five changed files takes priority over routine keywords when context is supplied to the Python classifier.
   - Reversibility lowers review mode, not the requirement for review. Reuse a still-valid context pack for an unchanged approved task instead of re-reviewing it.
2. **Baseline evaluation is advisory**:
   - `evaluate --task` accepts task metadata and produces a local heuristic assessment with `advisory: true`. It does not validate evidence truth or authorize implementation.
   - Missing evidence defaults to `t0`; unsupported tiers are rejected. Supported tiers are `t0`, `t1`, `t2`, `t3`, and `t4`. A `t0` assessment stops and reframes; `t1` supports at most verification.
   - The helper is offline. The unused live API client and ignored `--live` options have been removed. No model call or latency guarantee is part of this helper.
3. **Boundary extraction requires canonical inputs**:
   - `boundary --task` requires a JSON object with `review` containing a complete canonical review result. Raw prompts, evidence tiers, filenames, and proposed proof steps cannot create an execution boundary.
   - For `continue`, the same JSON object must also contain `context_pack`. The canonical handoff validator checks review/context-pack structure and equality of selected identifiers, evidence-ID lists, scope and control fields. It does not authenticate identities or resolve evidence IDs to real artifacts.
   - For `verify`, only the reviewed proof boundary and `proof_step` are returned. For `stop_reframe`, the reviewed boundary and `reframed_question` are returned. Neither branch gains implementation permissions from task filenames.
   - Output preserves `may_do`, `must_not_do`, `must_ask`, `stop_conditions`, `human_approval_gates`, and `high_risk_actions`. A valid handoff does not mean a listed human approval has been granted.
   - Invalid JSON, missing reviews, invalid evidence tiers, and mismatched handoffs fail with a nonzero exit status and no execution-boundary output. The helper uses `check_review.py`; it does not establish a second review contract.

---

## 3. Preserve Boundaries Across Handoffs

In long-running autonomous sessions (30~100+ turns), generative chat summaries often dilute or erase negative constraints (e.g. generalizing negative database constraints into broad feature summaries).

The runtime must preserve the original review and context pack while executing a task. The boundary helper copies their controls without rewriting or broadening them. The harness does not control a host agent's context compaction and cannot guarantee lossless retention across arbitrary runtimes. After compaction, restore and validate the original handoff before resuming work.

---

## 4. Role Mapping & Boundary Enforcement

| Role | Responsibility | Input Contract | Output Requirement |
|---|---|---|---|
| **Integrator / Admin** | Package slicing & lock enforcement | Product intent | Task Context Pack with digest locks |
| **Worker (Builder)** | Atomic implementation & local tests | `may_do` & `must_not_do` | Clean patch + unit test evidence |
| **QC Auditor** | Defect-first boundary audit | Git diff + Context Pack | PASS or Scope Drift Rejection |
| **Advisory Router** | Review-mode triage | Task prompt and optional scope | Routine, discovery, or commitment; no review bypass |
| **Boundary Helper** | Validate and preserve execution scope | Canonical review and matching context pack for continue | Reviewed boundary and unchanged human controls |

---

## 5. Verification Scope

The telemetry, authentication, and media-sync cases in `tests/test_multi_agent_alignment.py` are illustrative local fixtures. They do not establish production deployments, privacy outcomes, collision rates, or latency measurements.

`tests/test_gate_boundaries.py` exercises the actual repository and installable helper: routine classification cannot bypass review, unsupported evidence tiers fail closed, raw task metadata cannot grant execution permissions, invalid or expanded context packs are rejected, and valid canonical boundaries retain their exact scope and controls. Bundle tests also require every distributed runtime script to match its canonical source.
