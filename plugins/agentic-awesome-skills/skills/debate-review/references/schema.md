# debate-review JSON contracts

Three documents flow through one run. Each implementer returns its document as the only fenced
```json block in its final message. The script extracts it and checks it against the contract below.
Anything that fails the check stops the run. Nothing gets posted.

The script reads sections 1, 2, and 3 below by heading order and pastes them into the briefs. Don't
reorder them or add a `##` heading above section 3.

## 1. `debate-review.findings.v1`, main reviewer to script

```json
{
  "schema": "debate-review.findings.v1",
  "head": "<head sha reviewed>",
  "verdict": "approve | needs-attention",
  "summary": "one-paragraph ship/no-ship read",
  "findings": [
    {
      "id": "F1",
      "file": "src/foo.py",
      "line_start": 42,
      "line_end": 48,
      "severity": "blocking | non-blocking",
      "axis": "correctness | security | spec | standards | tests | docs",
      "claim": "what is wrong, one sentence",
      "evidence": "why: the code path, the quoted line, the spec line",
      "recommendation": "concrete change",
      "confidence": 0.0
    }
  ]
}
```

- `id` is `F<n>` for the main reviewer and `D<n>` for findings the debate reviewer adds.
- `line_start` and `line_end` must be lines on the new side of the PR diff, because GitHub and GitLab
  can only anchor comments there. If the problem is outside the diff, anchor the nearest changed line
  and say so in `evidence`.
- `severity` follows babysit-pr. Blocking means it ships a defect, a security or data exposure, a spec
  violation, a migration hazard, or a failing check. Everything else is non-blocking.
- `confidence` is 0 to 1. Findings under `min_confidence` (default 0.5) are dropped before debate.

## 2. `debate-review.debate.v1`, debate reviewer to script

```json
{
  "schema": "debate-review.debate.v1",
  "head": "<same sha>",
  "verdicts": [
    { "id": "F1", "verdict": "confirm | refute | downgrade", "reason": "one sentence", "evidence": "file:line or quoted code" }
  ],
  "new_findings": [ /* same shape as findings[], ids D1, D2, ... */ ]
}
```

- Every `F*` id gets exactly one verdict. A missing id counts as `confirm` with reason "no objection".
- `downgrade` means the defect is real but severity or confidence was overstated.
- `refute` must carry evidence. A bare "I disagree" is recorded but weighted as `downgrade`.
- `new_findings` is a gap sweep, not a second review. Blocking only, with a named trigger. Entries
  below `min_confidence` are dropped the same way the main findings are. Zero new findings is the
  expected outcome on most PRs.

## 3. `debate-review.final.v1`, main reviewer (rebuttal pass) to script, then to the PR

```json
{
  "schema": "debate-review.final.v1",
  "head": "<same sha>",
  "summary": "final ship/no-ship read after debate",
  "findings": [
    {
      "id": "F1",
      "status": "agreed | contested | withdrawn",
      "severity": "blocking | non-blocking",
      "file": "...", "line_start": 0, "line_end": 0,
      "claim": "...", "evidence": "...", "recommendation": "...",
      "debate_note": "one line: what the challenge said and why the finding was kept, dropped, or changed"
    }
  ]
}
```

- `agreed`: both models stand behind it. Posted.
- `contested`: the debate reviewer refuted it and the main reviewer holds, with evidence. Posted with a
  `contested` tag, or dropped with `--contested drop`.
- `withdrawn`: the main reviewer accepts the refutation. Never posted, kept in the run log.
- `D*` findings can only end as `agreed` or `withdrawn`. A `D*` the main reviewer rejects with evidence
  is `withdrawn` with the objection in `debate_note`. It is never `contested`, so a rejected claim from
  the second model is never posted. A `D*` that duplicates an `F*` is `withdrawn` with `debate_note`
  "duplicate of F<n>".

## Run log

`<out-dir>/run.json` keeps all three documents plus timings, implementers, lanes, and the posted
comment ids, keyed by `owner/repo#N@head`. Re-running on the same head does nothing unless `--force`.
