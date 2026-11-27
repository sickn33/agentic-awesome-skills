---
name: plc-program-design
description: "Use when designing a PLC program or verifying AI-written PLC code: five gated stages — action matrix, IO list, module split, SCL state machines, four-gate acceptance."
risk: none
source: self
date_added: 2026-11-26
---

# PLC Program Design: five gated stages

## Overview

Turn a one-line request ("push the part over when it arrives") into a PLC program someone can accept: five deliverables, each with a pass/fail gate, in a fixed order. The bottleneck in industrial programming is rarely the 200 lines of Structured Text — it is that nobody wrote down who acts, under what condition, on which sensor. This skill front-loads that as five checkable artifacts, then verifies the promises by compiling and simulating.

Output: an action matrix, an IO point list, a module/interface list, SCL source, and a verification table with PASS/FAIL per case.

## When to Use

- "Design a PLC program for this line / conveyor / station."
- "Draft the IO list and address plan for this machine."
- "How should I split this program into blocks?"
- "AI wrote this PLC code — how do I verify it before it touches the machine?"
- A retrofit where an existing ladder program has to be re-specified in Structured Text.

Use a different skill when: the task is only LAD↔SCL translation (that is a converter), only navigating inside an existing TIA Portal project (that needs an Openness/MCP gateway), or only running tests with no design work attached.

## Prerequisites

- A written requirement, or the ability to derive one (step 1 contains the interview questions).
- Controller family and IO counts if available. Unknown values are marked `TBD` and gated — never guessed.
- Optional: a TIA Portal project plus an Openness-based gateway to compile/import (step 3), and a simulator or PLCSIM for step 4. Stages 1–2 need no tooling at all.

## How It Works

### 1. Requirement → action matrix

One row per observable action. Columns: device, actuator, trigger sensor, condition, safety interlock, sequence/timing, exception path, acceptance criterion.
Gate: every row points to at least one real sensor and one actuator. A row that cannot be filled is a requirements gap — stop and ask; do not invent.

### 2. IO design → point list

Address, symbolic name, type, range/units, normal state, owning module, spare margin.
Gate: no address overlap, ≥20% spare per segment, safety circuits excluded from the list (they belong to safety relays or a safety PLC).

### 3. Module split → interface table

One function block per device; the process layer never writes outputs directly; naming prefixes `i_` / `q_` / `stat_`; block numbers and instance DBs allocated.
Gate: every output is assigned in exactly one place, at the end of its block.

### 4. Implementation → SCL (written, never deployed by this skill)

Explicit state machine (step number, entry/exit action, fault step, fault code), edge detection and timers written so they are testable, comments carrying the matrix row IDs.
Gate: compiles with zero errors **in a test project or a simulator**; interfaces match step 3 exactly. Deploying to a real controller is out of scope — see Boundaries.

### 5. Verification → four gates, in order

1. Compile (structural) in the test project or simulator.
2. Interface consistency (read back what the project actually contains, not what you intended).
3. Simulation cases derived from the matrix — PASS/FAIL per case, fault paths included.
4. Change-impact regression subset: the cases that touch the modified blocks.

Gate: all four pass, and every failing case has an attribution (spec bug / implementation bug / test bug).

Report per stage: which gate failed, the artifact that shows it, and the smallest next action. If a stage cannot be verified (no simulator, no project access), say so explicitly instead of marking it passed.

## Examples

```text
User request: "Conveyor line: a part arrives at the photo-eye, the pusher pushes it to lane B,
if lane B is full it goes to lane A."

Inputs: 1 conveyor motor, 1 pusher cylinder (2 solenoids), 3 photo-eyes, 2 lane-full sensors,
S7-1200, 24 DI / 16 DO available.

Expected result:
- action matrix: 4 rows (start, divert-to-B, fallback-to-A, fault-on-timeout), each with sensor,
  condition, interlock and acceptance criterion;
- IO list: 12 points, 2 spares per group, no overlap between input and output segments;
- module split: 3 FBs (Conveyor, Pusher, Router) with i_/q_/stat_ interfaces;
- SCL: state machine IDLE → TRANSFER → PUSH → RETURN → FAULT, fault code 16#8001 for pusher timeout;
- verification table: 6 cases (4 normal, 2 fault paths) with PASS/FAIL and attribution rules.
```

## Limitations

- Guarantees "the program does what the agreed design says" — not that the design itself is right. Sign-off on the matrix is human work.
- Safety functions (E-stop, light curtain, overpressure, safe torque off) must be implemented in safety relays or a safety PLC, never in generated logic.
- Does not cover drive/motion tuning, technology objects, communication configuration, or HMI design beyond the tags the logic needs.
- Without project access or a simulator, gates 3–4 remain unverified and must be reported as unverified.
- **Out of scope: downloading to, or writing into, a physical controller.** This skill stops at the artifacts plus a test/simulation run.

## Safety and side effects

Knowledge-only: this skill runs no commands, writes no files and makes no network calls. If a later step uses a gateway to compile or download into a real project, that is a state change — confirm the target project and controller first, and never download to a machine in production without the owner's approval. Keep credentials, project paths and customer identifiers out of the deliverables.

## Boundaries (provenance, licence, commercial affiliation)

- **Provenance**: original work by the authors of this skill; no upstream project is copied. Licence **CC BY 4.0**. Repo: [tia-forge/plc-program-design](https://github.com/tia-forge/plc-program-design).
- **Commercial affiliation (disclosed)**: the optional gateway path in step 3 points to [TiaLink](https://tia.hubwiz.com/tia-link), commercial software maintained by the same authors (hubwiz.com). It is not required for stages 1–2, and it is not affiliated with or endorsed by Siemens AG.
- **Prohibited without site-specific engineering approval**: deploying generated logic to a real machine or production controller; using generated logic to implement safety functions (E-stop, light curtain, safe torque off, overpressure); treating a simulation PASS as a site acceptance test.
- **No side effects from this skill itself**: it runs no commands, writes no files, makes no network calls. Any gateway use is a separate action the user performs knowingly.

## Sources and related skills

- Skill repository: [tia-forge/plc-program-design](https://github.com/tia-forge/plc-program-design) (CC BY 4.0), including a worked example under `examples/conveyor-sort.md`.
- Optional for stages 3–4 inside a real TIA Portal project: an Openness/MCP gateway — [TiaLink](https://tia.hubwiz.com/tia-link) (commercial, maintained by the same authors as this skill). Not required for the design stages.
- Optional for stage 4 with no project available: a cloud PLC simulator that executes SCL scan by scan and returns per-case PASS/FAIL reports.
