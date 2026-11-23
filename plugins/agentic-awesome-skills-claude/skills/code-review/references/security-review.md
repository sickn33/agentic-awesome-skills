# Sub-case: security review

A specialisation of the parent engine. The anchor changes, and one refutation rule is **inverted**
relative to correctness — read that section before running this sub-case alongside another.

**Anchor:** source → trust boundary → sink, with an attacker who controls the source.

The agreement being tested is between what a component *trusts* and what an attacker can *supply*.
Where correctness asks "can this happen", security asks "can someone make this happen on purpose" —
and an adversary will construct the unlikely execution deliberately.

## Where the procedure lives

The `security-audit-static` skill owns the full specialised procedure — entry-point mapping, the four
high-value paths, the keep/drop rule with its attacker-and-victim test, the OWASP Top 10 coverage
backstop, and the high-miss checklist. **Run it rather than restating it.** This file exists to say
what changes when security is selected as a dimension of a code review, and to supply the part of the
engine that survives when the application has no web surface at all.

## The universal core

Applies to a CLI, a library, a daemon, a build tool — anything without an HTTP handler in sight.

- **Trust boundaries** — every point where data crosses from a less-trusted origin into a
  more-trusted context: arguments, environment, config files, stdin, filenames, archive members,
  network responses, plugin and extension surfaces, deserialised state, and model output.
- **Sinks** — where a value becomes an instruction rather than data: process execution, dynamic
  evaluation, query construction, path resolution, template rendering, deserialisation, outbound
  requests, permission and role writes, and logging.
- **Injection by representation confusion** — a value interpreted in the syntax of the sink rather
  than as an opaque datum. Encode for the *sink*, not at the input. This is the same disagreement as
  correctness lens 10 (representation and information loss), with an adversary steering it.
- **Validator/consumer differentials** — the check and the use disagree about what the value means:
  unanchored patterns, prefix allowlists, normalisation applied on one side only, validation on one
  representation and execution on another.
- **Fail-open paths** — error, timeout, cancellation, cache-miss and boundary branches that default
  to *allow*. Correctness lens 12 finds these; security decides what they cost.
- **Secrets and sensitive data in transit to the wrong place** — logs, traces, error bodies,
  temporary files, crash dumps, and anything an unprivileged local user can read.
- **Privilege and identity** — which principal an operation runs as, whether the check and the action
  name the same object, and what happens when they do not.

## The inverted refutation rule

Under correctness, a defect that harms only the person who triggered it is still a defect. Under
security it usually is **not** a finding: if the only victim is the attacker, on their own machine,
account, tenant or data, and no shared system or privilege boundary is crossed, drop it.

The carve-outs where that refutation is **forbidden** — outbound-network sinks, shared billing or
quota, data exposure, cross-tenant or cross-principal flows, and server-side execution or rendering —
are listed in the `security-audit-static` skill. Use its list; do not reinvent one.

**Do not let the two rules leak into each other.** Running both dimensions in one review, keep the
tests separate per finding: a defect dropped as a security finding may still be a correctness finding
with a real consequence, and should be reported as one.

## What makes a security finding

The parent skill's five requirements, with the trigger read adversarially:

1. A supported obligation — the trust assumption, and what establishes it.
2. A feasible execution — **including who the attacker is and what they control.**
3. A concrete contradiction — the boundary that fails to hold.
4. An observable consequence — **naming the victim**, who must not be only the attacker.
5. An examined counterargument — a real check at the sink, an unreachable path, an upstream
   validator, or a non-dangerous sink.

Findings are code-review results, not confirmed exploits. Say so.
