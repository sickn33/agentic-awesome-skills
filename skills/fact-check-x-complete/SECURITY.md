# Security policy

## Supported versions

There is no supported public version until the first immutable GitHub Release is published. After that point, the latest minor line receives security fixes unless a release note states otherwise.

## Reporting a vulnerability

Do not disclose credentials, browser data, private evidence or an exploitable vulnerability in a public issue.

After the repository becomes public, use GitHub's private **Report a vulnerability** flow. Include only the minimum information required to reproduce the problem:

- affected version and artifact SHA256;
- affected component and platform;
- security impact;
- minimal reproduction using synthetic data;
- whether the issue is already being exploited.

The maintainers should acknowledge a report within seven calendar days, provide a triage decision within fourteen days, and coordinate disclosure after a fix is available. These are response targets, not a warranty.

## Security boundaries

- Browser credentials and Cookies stay in the user's local browser profile.
- The trusted-search Key stays in the local credential store and must never be pasted into an issue or report.
- Skills can execute scripts and control a browser. Review `SKILL.md`, permissions and scripts before installation.
- Fact-Check-X does not make third-party AI services safer and cannot override their account, regional, rate-limit or data-retention policies.
- A provenance attestation proves how an artifact was built; it does not prove that the artifact is vulnerability-free.
