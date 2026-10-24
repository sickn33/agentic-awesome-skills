# Advanced AD trust-boundary reference

Use only within the root skill's explicit confirmation gate. This is a review checklist, not an instruction to extract credentials or deploy persistence. All active testing belongs in an owner-approved synthetic lab.

## Delegation

- Unconstrained delegation: inspect effective configuration and whether a delegatable principal actually authenticates to the service. A TGT is not guaranteed for every authentication; account protections and protocol behavior matter. Do not coerce a real controller or collect other users' tickets.
- Constrained delegation: inspect allowed service principals, protocol transition and the delegating identity's actual credentials/permissions. A listed target alone does not demonstrate arbitrary impersonation.
- Resource-based constrained delegation: inspect who can write the target's delegation descriptor and which principals are allowed. Creating a machine or changing the descriptor is a persistent directory mutation, not reconnaissance. Preserve the original descriptor and use a synthetic account if a lab change is authorized.

## GPO control

Trace effective edit/ownership rights, GPO links, filtering, target OU and policy application. A writable GPO can imply significant risk, but actual affected computers/users and resulting privileges must be established. Do not add admin users, immediate tasks or disguised update jobs as a routine proof. Use an inert lab policy marker and verify removal/application afterward.

## RODC

Inspect password-replication policy, filtered attribute set, cached/revealed principals and effective rights for the actual configuration. Do not assume all sensitive attributes or all users are automatically excluded or that every RODC key enables unrestricted domain impersonation. RODC key/credential disclosure is incident material; avoid acquiring it for a checklist.

## SCCM / Configuration Manager and WSUS

Review role permissions, target collections/groups, deployment approval, service identities, update signing and content paths. Management-plane access and machine-side policy/secret access are separate boundaries. Do not create malicious applications, approve fake critical updates, force fleet check-in or decrypt Network Access Account credentials as default validation. A successful read of configuration is not evidence of fleet execution.

## Certificate services

For template/CA attack paths, review enrollment rights, effective ACLs, enabled templates, subject supply, EKUs, approval/signature requirements and current certificate-to-account mapping controls. Authentication behavior depends on supported patches and policy; an ESC label is a candidate class, not proof. Certificate enrollment/revocation and template edits are durable side effects requiring owner-approved cleanup. Do not request a real administrator certificate, reset a template property to a guessed zero or insert shadow credentials as a routine assessment.

For web-enrollment relay, inspect authentication and extended protection/channel binding on the actual endpoint, not only HTTP/HTTPS availability. A reachable enrollment URL is not a relay exploit.

## Domain and forest trusts

Record trust direction/type, transitivity, selective authentication, SID filtering, allowed principals and target authorization. Child/parent and cross-forest paths differ. A forged SID or trust ticket is not automatically accepted. Never treat discovering a trust as permission to test the other domain/forest.

## AD FS / federation

Review signing-key protection, service account rights, relying-party claims, audience/issuer checks and monitoring. A signing-certificate reference is not possession of its private key. Do not dump token-signing keys or impersonate a real user; an isolated synthetic relying party can validate the intended trust checks without exposing production federation.

## Credential sources

- LAPS: distinguish actual Windows/legacy schema and policy; inspect who may read or decrypt passwords without printing values.
- gMSA: inspect allowed password retrieval principals and host rights; do not decode live managed-password blobs.
- Historical GPP secrets: identify the sensitive file/location with redacted evidence, then follow owner remediation/rotation procedures.
- DSRM: review recovery-account management and logon policy. Do not enable DSRM administrative logon or dump SAM hashes for a checklist.
- Linux integration: ticket caches, keytabs and SSSD stores are sensitive credentials, not ordinary logs. Listing metadata and reviewing configured permissions may suffice; do not reuse another session's cache or extract secret keys.

## Validation and cleanup

For every candidate write down observed preconditions, one minimal synthetic test, safe baseline, explicit stop condition, pre-state and cleanup verification. A failed test does not justify privilege escalation or a new technique outside scope. Preserve redacted evidence and uncertainty; no command in this reference demonstrates a live vulnerability.
