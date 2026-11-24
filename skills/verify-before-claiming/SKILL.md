---
name: 'verify-before-claiming'
description: 'Check whether a claim is supported before publishing it: gates seen red at least once, controls an echo cannot satisfy, verdicts read from exit codes, old examples re-run after a fix, falsifiers written down first. Use before publishing any measurement or 'we fixed it' claim.'
risk: safe
source: community
date_added: '2026-11-24'
author: linghe4-guibiaohe
tags:
- verification
- evidence
- testing
- claims
- falsification
tools:
- claude-code
- codex-cli
- cursor
- gemini-cli
---

# Verify before claiming

Review boundary: this skill changes how you report, not what you build. It adds no permissions and touches no external system. Every check below is local and read-only unless you also choose to run the artefact's own tests.

## When to use this skill

Before any sentence of the form "it works", "0 false positives", "we fixed it", "the gate passes", "28 alerts, none real". If the sentence would be quoted by someone who cannot see your terminal, it needs one of these checks first.

## The five checks

1. **Has the gate been seen red?** Run it against an input you know must fail. A check that has never failed is a hypothesis. Inject into the *behaviour under test*, never into an assertion about it: deleting an assertion still passes, breaking the code it checks does not.

2. **Does the check run on the subject you named?** Two ways this fails silently:
   - the path or argument is split, interpolated, or truncated before the check sees it (an unquoted `--dir "/a /b"` validates `/a`);
   - the subject is inferred from where the value lives rather than what it is (a real-format secret under `tests/` dismissed as a fixture).
   Control: run the check on a deliberately wrong subject and confirm it says so, and compare the subject printed in the output with the one you passed.

3. **Read the verdict, not the description.** `cmd | head` makes `$?` report head's status. A JSON `pass: true` that disagrees with its exit code is read as green by everything downstream. The exit code is the verdict; stdout is a description.

4. **After a fix, re-run the old example.** A fix can pass the test written for it and still move behaviour that was already working. Compare the artefact's aggregate numbers, not just the new test: a bucket moving from 33 to 0 is a different product even when every new assertion is green.

5. **Write the falsifier down first.** Before measuring, state the observation that would refute the claim and the date it is due. Record interim evidence against it without moving the criterion. A claim that survives only because the refuting test was never built is marked as such.

## Worked example

A secret-triage tool reported "33 candidates, 0 real leaks". The claim was true and empty: all 33 rows were rule files, and a classifier answering `rulefile` to everything reproduces the table exactly. Two planted files - a real-format key in `src/config.js` and a fake one in `tests/fixture.js` - turned it into a test; the test then failed in **both** directions, and the resulting row pair is the first evidence that the judging can fire at all.

## Reporting template

```
Claim: <one sentence>
Evidence: <command; exit code; the number>
Controls run: <bad input that must fail; bogus path; old fixture>
Not verified: <what you could not test, and why>
Falsifier: <observation that would refute this, and when it is due>
```

Omit a line only if you write "not verified" on it. An honest gap costs one sentence; an unsupported claim costs the reader's trust in everything else you said.
