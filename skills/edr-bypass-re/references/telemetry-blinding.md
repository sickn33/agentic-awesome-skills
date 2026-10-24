# Telemetry integrity review: ETW, AMSI and Sysmon

Adapted from zhaoxuya520/reverse-skill (MIT); revised for defensive analysis. Code that disables scanning, patches event APIs, erases evidence or conceals process activity has been removed.

## Distinct surfaces

[ETW](https://learn.microsoft.com/en-us/windows/win32/etw/about-event-tracing) separates controllers, providers and consumers. A change to one process's event-writing path does not establish that kernel-originated events or other providers stopped. Check the actual session configuration and event delivery, including lost-event statistics where available.

[AMSI](https://learn.microsoft.com/en-us/windows/win32/amsi/antimalware-scan-interface-portal) integrates applications with antimalware providers. Its presence does not mean every program or execution path is scanned. API failure is not equivalent to a clean scan result; inspect the documented return contract and the application's error handling.

[Sysmon](https://learn.microsoft.com/en-us/sysinternals/downloads/sysmon) records configured system activity and does not itself analyze events. Event availability depends on configuration; for example, image-load and network logging need explicit configuration. Process creation, remote thread, process access, DNS and process-tampering events offer different evidence. Missing one event type cannot prove an activity was invisible.

## Defensive procedure

1. Preserve endpoint and collector records before changing configuration. Record time synchronization, policy, source identity, query range, filters and retention.
2. Compare a benign vendor-supported test signal with both endpoint and downstream records. Determine whether a gap occurred at generation, collection, transport, indexing or alerting.
3. Investigate unexpected protection-policy changes, executable-page modifications, event-log clearing, timestamp changes or unusual parent/child relationships as hypotheses. Correlate independent sources and account for legitimate administration.
4. Report observed events separately from alerts. Include test scope, build/configuration and unresolved gaps; do not call absence of alerts a successful bypass.
5. Restore only separately approved lab changes and verify collection health. Keep logs and test artifacts under the agreed retention policy; do not clear history or alter timestamps to hide the test.

## Example result

“Test signal X was visible in the endpoint log at time T but not in collector query Q during the stated window. Collector transport is unresolved; this does not establish sensor evasion.”

## Limitations

Provider GUID lists, event schemas, undocumented internals and vendor behavior need exact-build verification. No universal telemetry-disabling sequence, guarantee of detection, or implant deployment procedure is supplied.
