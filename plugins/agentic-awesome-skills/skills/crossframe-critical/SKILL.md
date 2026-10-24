---
name: crossframe-critical
description: "Use only when the user explicitly names crossframe-critical for a Chinese structural critique dossier, article plan, or long-form critical essay."
category: content
risk: safe
source: community
source_repo: xi-kari/crossframe-skill
source_type: community
date_added: 2026-06-16
author: xi-kari
license: MIT
license_source: https://github.com/xi-kari/crossframe-skill/blob/main/LICENSE
tools:
  - "Agent Skills"
  - Codex
  - Claude
tags:
  - crossframe
  - chinese
  - critique
  - essay
  - structural-analysis
---
# CrossFrame Critical



## When to Use This Skill

- Use only when the user explicitly names `crossframe-critical`, `$crossframe-critical`, or asks to test this critical parallel skill.
- Use for Chinese structural critique dossiers, critique matrices, article plans, and long-form critical essays.
- Do not include it in the default `crossframe-suite` route.

## Packaged Source Note

This AAS-ready copy preserves the original CrossFrame skill body below. Chinese remains the canonical semantic layer; English metadata is only for discovery, installation, and repository review.

## Limitations

- The skill body is intentionally Chinese-canonical; English metadata is for discovery and does not replace the original Chinese terms.
- Use only after explicit `crossframe-critical` invocation; do not add it to default `crossframe-suite` routing.
- It structures analysis, drafting, and review, but does not replace source verification, domain expertise, or legal, medical, or financial judgment.

> **本测试 skill 仅在用户显式点名 `crossframe-critical` 时触发。** 不纳入 `crossframe-suite` 默认路由；不得用通用 CrossFrame 请求代替显式调用。

This is a parallel local test skill. It does not replace `crossframe`, `crossframe-essay`, `crossframe-public`, or `crossframe-suite`.

## Position

`crossframe-critical` writes critical Chinese essays that first use CrossFrame to establish structure, evidence boundaries, scale, mechanism candidates, and judgment grade, then sharpen the output into critique.

The critique may absorb Marxist problem awareness: interests, cost transfer, alienation, commodification, ideology, naturalized domination, and reproduction of conditions. It must not mechanically force every topic into class/capital language.

## Required Reading

On every trigger, read:

1. `../crossframe/SKILL.md`
2. `../crossframe/references/read-routing-map.md`
3. If the critique touches high-responsibility, public, AI/process artifact, lifecycle, trapped-subject, or article-output scenarios, reuse `../crossframe/templates/read-state-capsule.md` as `v5-read-state-capsule` and run `../crossframe/worksheets/source-anchor-integrity-check.md`; if the capsule is missing, return to `../crossframe/SKILL.md` instead of inventing source routing here.
4. `protocols/critical-article-protocol.md`
5. `references/critical-matrix.md`
6. `references/example-and-evidence-rules.md`
7. 若涉及真实公共对象、最新事实、机构、平台、政策、人物、公司、数据、AI/过程性产物或强判断，读取 `../crossframe/references/source-ledger-workflow.md` 并建立来源台账。
8. `templates/critical-output-template.md`

If the topic needs long-form style control, also read `../crossframe-essay/SKILL.md` and reuse only its article discipline, not its whole output contract.

## Workflow

1. Build the CrossFrame base: object, fact boundary, scale window, mechanism candidates, judgment grade, and evidence gaps.
2. Apply the critical matrix: cost chain, benefit chain, power/resource distribution, concept concealment, reproduction mechanism, weak signals, and counterconditions.
3. Plan the article: central thesis, reader position, examples, section sequence, word allocation, and ending aftertaste.
4. Write the full essay from the dossier. Default body length is 1800-2800 Chinese characters unless the user overrides it.
5. Run a final boundary check: no personality judgment, no hat-labeling, no conspiracy claim, no unverified strong judgment, no slogan replacing analysis.

## Output

Default output has exactly three visible sections:

```text
# 批判底稿
# 篇章方案
# 正文
```

Do not collapse the result into a short answer, checklist, memo, or diagnosis summary unless the user explicitly asks for that.

## Hard Rules

- Start from CrossFrame structure, then become critical; do not begin from indignation and decorate it with structure words.
- Critique mechanisms, interests, rhetoric, institutions, and responsibility chains; do not turn structural critique into personal condemnation.
- A real or recent public event requires source checking before factual claims, with a visible source ledger summary. Unverified examples must be labeled as analogy, hypothesis, or common pattern.
- Use at least two concrete examples in the essay body unless the user provides a single narrowly bounded case and asks not to expand.
- Include at least one countercondition, evidence gap, or withdrawal condition.
- Do not use Marxist terms as prestige vocabulary. If a term cannot be translated into who pays, who benefits, what is hidden, and how the condition repeats, remove it.

## Example

For “使用 crossframe-critical 批判复盘越多越进步”, compare two hypothetical
organizations: one closes verified action items with owners/resources, another only
adds meetings. Label them hypothetical, distinguish meeting count from repair evidence,
and state that verified closure would weaken the critique. Do not invent company
names or completion data. The bundled smoke prompts are proposed evaluations, not
executed passing results. If sibling references are unavailable, identify the missing
path and provide a bounded draft rather than pretending the routing checks ran.
