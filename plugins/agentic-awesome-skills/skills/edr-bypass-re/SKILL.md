---
name: edr-bypass-re
description: "Review EDR telemetry and known defense-evasion classes using offline evidence and controlled defensive coverage assessments."
risk: offensive
source: "https://github.com/zhaoxuya520/reverse-skill"
source_repo: "zhaoxuya520/reverse-skill"
source_type: community
date_added: "2026-08-25"
license: "MIT"
license_source: "https://github.com/zhaoxuya520/reverse-skill/blob/main/LICENSE"
---
# EDR telemetry coverage review

> Adapted from [zhaoxuya520/reverse-skill](https://github.com/zhaoxuya520/reverse-skill) (MIT). This catalog revision replaces operational blinding, implant deployment, and evidence-erasure recipes with defensive review procedures. The skill ID is retained for compatibility.

> **⚠️ AUTHORIZED USE ONLY**
> This skill is for educational purposes or authorized security assessments only.
> You must have explicit, written permission from the system owner before using this tool.
> Misuse of this tool is illegal and strictly prohibited.

## Mandatory confirmation gate

Before each live assessment command, collect the exact target URL, IP, account, or resource, confirmation of written owner authorization, and permitted scope. Show the exact command and expected effect. Wait for explicit confirmation in the current conversation before executing that action. Offline evidence review can proceed within the already authorized task; this guide does not supply operational evasion commands.

## When to Use

- Analyze authorized, previously collected EDR evidence or an offline forensic image.
- Design a coverage assessment with the system owner and SOC in an isolated lab.
- Explain differences between user-mode instrumentation, kernel callbacks, ETW and AMSI without assuming a particular vendor implementation.

## Procedure

1. Define the asset, authorized evidence sources, product/build, Windows build, configuration, collection interval and retention restrictions. Installation or configuration changes need separate authorization; reading this skill does not grant it.
2. Preserve the original evidence and record hashes, acquisition time and tool versions. Process dumps can contain credentials and personal data; keep them in restricted storage and redact exported findings.
3. Compare observations with an architecture- and build-matched baseline. Disk and memory images have different layouts and relocations; a byte difference or leading jump alone is not proof of an EDR hook or compromise.
4. Use the bundled references to classify observations. Treat process/driver names as clues, not an authoritative product inventory. Confirm ownership and version through signed metadata and the owner's management console.
5. For coverage tests, agree on benign vendor-supported test signals, expected event sources, correlation IDs and a bounded window before execution. Keep protection and logging enabled. Correlate endpoint, collector and SOC records; distinguish collection failures, filtering, retention and alert-rule gaps.
6. Report each hypothesis with evidence and uncertainty. A missing alert does not establish successful evasion, and a single event does not establish complete detection coverage. Restore any separately approved lab configuration and verify normal telemetry delivery; preserve evidence rather than deleting logs.

## Examples

A process event is absent from the SIEM: first check whether the event type was enabled, the host clock and collector were healthy, and the query covered the correct host/time range. Record an unresolved collection gap rather than concluding the sensor was bypassed.

A memory image differs from the matching on-disk module: document the acquisition method, image layout and module signature/version before attributing the difference. Do not patch the running process to test that attribution.

## References

- [Hook evidence review](references/hook-survey.md)
- [Unhook and syscall technique classification](references/unhook-techniques.md)
- [Telemetry integrity review](references/telemetry-blinding.md)

## Limitations

- This is a static review and planning guide, not a bypass implementation or a vendor effectiveness benchmark.
- Undocumented internals and product behavior vary by build and configuration. No universal hook inventory, syscall number or safe bypass sequence is asserted.
- The upstream bootstrap script, tool index and broader attack-chain routes are not bundled. Do not invent their paths or execute substitute downloads.
