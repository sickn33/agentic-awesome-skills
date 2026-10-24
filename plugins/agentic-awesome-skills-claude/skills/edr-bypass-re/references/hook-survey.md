# Hook evidence review

Adapted from zhaoxuya520/reverse-skill (MIT); revised for defensive evidence analysis.

## What to record

For each observed module or driver, record product/build, file path, signature verification result, hash, architecture and acquisition method. Names such as `MsMpEng.exe` or vendor-prefixed drivers are investigative clues: names can be reused, and component sets change. Obtain the authoritative product inventory from the owner.

A memory-versus-disk comparison must account for PE image mapping, section alignment, relocations, imports, architecture and legitimate runtime changes. A jump instruction at an export is insufficient attribution. Never assume the disk file is clean merely because it is on disk. Compare with a trusted matching build, retaining the original evidence.

## Monitoring surfaces

User-mode instrumentation, image/thread/process notifications, handle-access callbacks, registry callbacks and ETW provide different visibility. No single hook table describes all EDR coverage. Kernel symbol names and private debugger extensions are build-dependent; do not assume an unverified command or third-party driver can enumerate them safely.

## Example evidence table

| Observation | Supporting evidence | Alternative explanation | Next defensive check |
|---|---|---|---|
| Export bytes differ | Build-matched memory/disk captures and acquisition hashes | Relocation, hotpatch, instrumentation, corruption | Validate layout and signed module ownership offline |
| Expected module absent | Timestamped process/module inventory | Product version or protected-process visibility | Confirm policy and component health with owner console |
| Expected event absent | Bounded query and collector health records | Filtering, retention, dropped events | Compare endpoint and collector records |

Use approved offline tooling and verify its options against that exact tool release. Dumps can expose secrets; avoid sending them to public scanners. Do not automatically trigger unhooking based on a scan result.

See Microsoft's [ETW model](https://learn.microsoft.com/en-us/windows/win32/etw/about-event-tracing) and [Sysmon documentation](https://learn.microsoft.com/en-us/sysinternals/downloads/sysmon). Return to the parent skill's evidence/reporting steps, not an implant workflow.
