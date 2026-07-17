# AAS v1 product-verifier development evidence

## 2026-07-17 — harness construction

Scope: verifier infrastructure only. Candidate tarballs used below were
development smoke inputs, not held-out acceptance inputs and not release
evidence.

- The final development-smoke tarball at product commit
  `7af83ac4a2b0910ada1f3a1da38e379e96fb4611` matched its supplied byte count,
  SHA-256 and npm SRI. The independent package parser accepted 7,249 entries
  and reported zero allowlist or archive-structure failures.
- The assigned modulo-six shard completed 16,668 property executions and 8,334
  parser/MCP fuzz executions on that tarball with zero hard-policy violations,
  crashes or canary leaks. The 41-case legacy differential also completed.
  Separately, the frozen 64-case hostile corpus completed on the superseded
  `a0625a264` development candidate; that is harness evidence, not final
  candidate acceptance.
- Codex and Claude host fixtures completed preview, exact runtime
  integrity/closure binding, approved apply, backup-pair permissions, cleanup,
  unknown-field preservation, secret redaction and unsafe-file rejection.
- The macOS legacy runner initially reported 40/41 because `/tmp` is resolved
  as `/private/tmp`. Normalizing both lexical and real paths fixed the verifier;
  no product, frozen snapshot or allowed-difference change was made.

### Procedure incident

After rebasing onto baseline 1.0.1, the standard
`check:benchmark:frozen` command was executed before the final candidate freeze,
contrary to the lane instruction not to run held-out acceptance early. The
command performed aggregate schema/count/fingerprint validation (180 inputs and
180 labels). There was no human case-level inspection, no case-level output,
and no product adaptation or feedback from that execution. The command is not
used again in this verifier-development lane before the authorized final
candidate freeze.

### Evidence boundaries

- Local verifier unit/schema/structure checks are green.
- The local desktop sandbox blocks the privileged macOS DTrace spawn with
  `EPERM`; therefore it is not claimed as locally proven. The mandatory
  six-runner harness workflow owns native strace/DTrace/ETW sentinel proof.
- Production transaction acceptance remains fail-closed until an external
  platform-native controller supplies schema-valid evidence for every observed
  lock, journal, backup, write, fsync, rename and commit boundary plus the six
  frozen race classes. Missing evidence returns
  `AAS_VERIFIER_TRANSACTION_EVIDENCE_MISSING`; mock or test-mode evidence is
  rejected.
