---
name: requirements-writing
description: "Write and review verifiable requirements using EARS patterns, quality checks, defect review, and traceability."
risk: none
source: community
source_type: community
source_repo: jgsystemsconsulting/jgs-se-knowledge-packs
license: CC-BY-4.0
license_source: https://github.com/jgsystemsconsulting/jgs-se-knowledge-packs/blob/fd228690a3dec8c040cee49cff0534bfaa965127/packs/requirements-writing/LICENSE
date_added: "2026-10-29"
author: jgsystemsconsulting
tags: [requirements, ears, specification, quality, verification]
---

<!-- argument-hint: [topic, EARS pattern, or chapter number] -->

# Requirements Writing Guidance — EARS & Requirement Quality
**Source**: Original guidance by JG Systems Consulting Ltd. (methods cited: EARS / Mavin et al. 2009; quality & verification guidance per NASA public-domain SE guidance) | **Chapters**: 6

## When to use

Use this pack when you are **writing or reviewing requirements** and want them unambiguous, singular, and verifiable. It gives you the quality characteristics a requirement must pass, the EARS sentence patterns that remove most ambiguity, a defect catalogue for review, and how to make requirements verifiable and traceable. Best for behavioural/functional requirements; it points to the authoritative standards rather than reproducing them.

**Prerequisites:** none — this pack is plain Markdown; no MCP server, API key, or licence tier is needed at runtime.

## How to Use This Skill

- **Without arguments** — load the EARS patterns and the quality checklist below.
- **With a topic** — ask about `EARS event-driven`, `unambiguous`, `weak words`, `verifiability`.
- **With a chapter** — ask for `ch03` (the EARS patterns).

Supporting files: `glossary.md`, `patterns.md`, `cheatsheet.md` (the EARS pattern-picker + banned-words list).

## Core Frameworks & Mental Models

**The quality characteristics (Ch 1).** Every single requirement should be **necessary, appropriate (what not how), unambiguous, complete, singular, feasible, verifiable, correct, conforming**. The two-question gate that catches most damage: *is it necessary?* and *can I write a pass/fail test?*

**EARS — Easy Approach to Requirements Syntax (Ch 2–4).** A small set of natural-language templates (Mavin et al., 2009) that keep requirements in plain English while forcing a named system, an explicit trigger, and a single response. Choose the pattern by the **trigger**:

- **Ubiquitous** — always on: *The `<system>` shall `<response>`.*
- **Event-driven** (When) — *When `<trigger>`, the `<system>` shall `<response>`.*
- **State-driven** (While) — *While `<state>`, the `<system>` shall `<response>`.*
- **Optional-feature** (Where) — *Where `<feature>`, the `<system>` shall `<response>`.*
- **Unwanted-behaviour** (If/Then) — *If `<condition>`, then the `<system>` shall `<response>`.* (faults & safety)
- **Complex** — combinations, kept readable.

**The defect catalogue (Ch 5).** EARS fixes the *shape*; content defects need a separate pass: ambiguity, compound requirements, embedded design, weak/vague words, unverifiability, missing rationale — each with a standard remedy.

**Verifiability & traceability (Ch 6).** Assign a verification method (**Test / Analysis / Inspection / Demonstration**) as you write; make responses measurable (value + units + tolerance + condition); maintain bidirectional traceability up to the need and down to evidence. Keep **verification** ("thing right") distinct from **validation** ("right thing").

## Chapter Index

| # | Section | Key content |
|---|---------|-------------|
| [ch01](chapters/ch01-quality-characteristics.md) | What makes a good requirement | the nine quality characteristics; the necessary+verifiable gate |
| [ch02](chapters/ch02-ears-overview.md) | EARS overview | constrained natural language; why a small ruleset works |
| [ch03](chapters/ch03-ears-patterns.md) | The EARS patterns | Ubiquitous / When / While / Where / If-Then / Complex + examples |
| [ch04](chapters/ch04-applying-ears.md) | Applying EARS | pattern selection; convert-in-place; before/after examples |
| [ch05](chapters/ch05-defects-and-anti-patterns.md) | Defects & anti-patterns | ambiguity, compounding, embedded design, weak words, unverifiability |
| [ch06](chapters/ch06-verifiability-and-traceability.md) | Verifiability & traceability | T/A/I/D methods; measurable responses; bidirectional trace |

## Topic Index

- **EARS patterns (When/While/Where/If-Then)** → ch03, ch04
- **Complex pattern (state + event)** → ch03
- **Quality characteristics (necessary, unambiguous, singular…)** → ch01
- **Ambiguity / weak words / compound requirements** → ch05
- **Embedded design in requirements** → ch05, ch01
- **Verifiability / verification methods (T/A/I/D)** → ch06
- **Traceability / verification vs validation** → ch06
- **Converting legacy requirements** → ch04
- **Measurable response / tolerances** → ch06, ch03

## Supporting Files

- [glossary.md](glossary.md) — key terms (EARS patterns, quality characteristics, verification methods)
- [patterns.md](patterns.md) — the EARS patterns + review techniques, as when/how/trade-offs
- [cheatsheet.md](cheatsheet.md) — EARS pattern-picker table, quality checklist, decision rules, banned-words list, tells & smells

---

## Scope & Limits

This is **original guidance** written by JG Systems Consulting Ltd., synthesising widely-taught requirements practice. It **cites** its methods rather than reproducing them: the EARS patterns are credited to Mavin et al. (2009) and described in original words; the quality and verification material aligns with **NASA public-domain** SE guidance (NPR 7123.1 / SE Handbook). It is **not** a reproduction of ISO/IEC/IEEE 29148, the INCOSE Guide for Writing Requirements, or the EARS conference paper — for the authoritative text, consult those sources directly. The pack covers behavioural/functional requirement writing; it is not a full requirements-management or elicitation methodology.

Source: [JG Systems Consulting knowledge packs, v1.24.1](https://github.com/jgsystemsconsulting/jgs-se-knowledge-packs/tree/fd228690a3dec8c040cee49cff0534bfaa965127/packs/requirements-writing). The retained LICENSE refers to the upstream repository's [source vetting](https://github.com/jgsystemsconsulting/jgs-se-knowledge-packs/blob/fd228690a3dec8c040cee49cff0534bfaa965127/docs/SOURCE-VETTING.md), [licensing](https://github.com/jgsystemsconsulting/jgs-se-knowledge-packs/blob/fd228690a3dec8c040cee49cff0534bfaa965127/docs/LICENSING.md), and [tooling license](https://github.com/jgsystemsconsulting/jgs-se-knowledge-packs/blob/fd228690a3dec8c040cee49cff0534bfaa965127/LICENSE), not local files. This adaptation clarifies that structured syntax reduces but cannot eliminate ambiguity.
