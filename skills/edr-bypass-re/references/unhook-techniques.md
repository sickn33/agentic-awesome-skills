# Unhook and syscall technique classification

Adapted from zhaoxuya520/reverse-skill (MIT); revised for defensive analysis. Operational stubs, patch sequences and effectiveness rankings have been removed.

## Classes and review questions

| Class | Defensive question | Limitation |
|---|---|---|
| Restoring or replacing a loaded module's code | Are executable image pages modified or remapped relative to a trusted matching baseline? | Runtime changes can be legitimate; disk and mapped layouts differ |
| Direct or indirect system calls | Does the process behavior and memory provenance fit its expected role? | A call site alone is not maliciousness or a universal detection rule |
| Dynamic syscall-number discovery | Is unexpected export inspection correlated with suspicious behavior? | Undocumented numbering and layouts vary by Windows build and architecture |
| Debug-register or exception-handler abuse | Are unusual thread-context changes correlated with the process activity? | Legitimate debuggers and instrumentation use these mechanisms |
| Stack manipulation | Do stack, module and executable-memory observations disagree? | Unwinding can be incomplete or unreliable; absence of a frame is not proof |

## Evidence workflow

Record the observed behavior, process identity, module/build and source of each observation. Separate facts from inferred intent. Correlate with endpoint policy, memory provenance and other independent telemetry. Use vendor-supported benign test cases in a disposable lab to assess collection and alerting; retain the input and expected-result contract.

Do not infer that changing a user-mode hook disables kernel monitoring or that a technique is effective against a named vendor. The original catalog's broad vendor success claims, universal syscall values and fixed ordering assertions had no reproducible build-specific evidence. No replacement evasion recipe is provided.

## Limitations

This classification supports investigation and detection design. It does not implement or validate an evasion technique. Internals and sensor visibility must be established for the exact tested build; no supplied code has been compiled or executed as part of this review.
