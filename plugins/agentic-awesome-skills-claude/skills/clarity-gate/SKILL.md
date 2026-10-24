---
# agentskills.io compliant frontmatter
name: clarity-gate
risk: critical
source: community
date_added: "2026-01-30"
version: 2.1.3
description: >
  Pre-ingestion verification for epistemic quality in RAG systems.
  Ensures documents are properly qualified before entering knowledge bases.
  Produces CGD (Clarity-Gated Documents) and validates SOT (Source of Truth) files.
author: Francesco Marinoni Moretto
license: CC-BY-4.0
repository: https://github.com/frmoretto/clarity-gate
triggers:
  - clarity gate
  - check for hallucination risks
  - can an LLM read this safely
  - review for equivocation
  - verify document clarity
  - pre-ingestion check
  - cgd verify
  - sot verify
capabilities:
  - document-verification
  - epistemic-quality
  - rag-preparation
  - cgd-generation
  - sot-validation
outputs:
  - type: cgd
    extension: .cgd.md
    spec: docs/CLARITY_GATE_FORMAT_SPEC.md
spec_version: "2.1"
---

# Clarity Gate v2.1

**Purpose:** Pre-ingestion verification system that enforces epistemic quality before documents enter RAG knowledge bases. Produces Clarity-Gated Documents (CGD) compliant with the Clarity Gate Format Specification v2.1.

**Core Question:** "If another LLM reads this document, will it mistake assumptions for facts?"

**Core Principle:** *"Detection finds what is; enforcement ensures what should be. In practice: find the missing uncertainty markers before they become confident hallucinations."*

---

## Detailed Guide

Read [the detailed guide](references/detailed-guide.md) before executing this skill. It retains the complete procedure and reference material. Treat its safety, prerequisites, and validation requirements as mandatory. For focused work, load the relevant sections; for end-to-end work, read the guide completely.

## Critical Limitation

> **Clarity Gate verifies FORM, not TRUTH.**
>
> This skill checks whether claims are properly marked as uncertain—it cannot verify if claims are actually true. 
>
> **Risk:** An LLM can hallucinate facts INTO a document, then "pass" Clarity Gate by adding source markers to false claims.
>
> **Solution:** HITL (Human-In-The-Loop) verification is **MANDATORY** before declaring PASS.

---

## When to Use
- Before ingesting documents into RAG systems
- Before sharing documents with other AI systems
- After writing specifications, state docs, or methodology descriptions
- When a document contains projections, estimates, or hypotheses
- Before publishing claims that haven't been validated
- When handing off documentation between LLM sessions

---

## What This Skill Does NOT Do

- Does not classify document types (use Stream Coding for that)
- Does not restructure documents 
- Does not add deep links or references
- Does not evaluate writing quality
- **Does not check factual accuracy autonomously** (requires HITL)

---

## Catalog availability and honest status

This copy is guidance only: neither the referenced normative specification nor claim-ID/hash/validator scripts are bundled. Do not run absent paths, reuse sample digests as actual integrity evidence, set computed ingestion flags, or certify v2.1 compliance from this prose alone. The field examples with REVIEWED/confirmed-by are fictional illustrations; preserve PENDING until actual identified human confirmation of the exact claims and document revision. Hashes detect byte/canonicalization changes, not truth, authenticity or review authority. Eight-hex-character IDs need duplicate detection; use longer IDs for scale.

Missing evidence cannot be repaired by adding a fabricated citation, precision or uncertain qualifier. Retain the original claim and source separately from annotations, preserve genuine historical dates, and report unverifiable facts as unverified. A source being called SOT does not establish reliability. Private source documents must not be sent to a RAG service without authorization. This AAS revision corrects availability, timestamp and status-authenticity guidance while preserving Francesco Marinoni Moretto's CC-BY-4.0 attribution.
