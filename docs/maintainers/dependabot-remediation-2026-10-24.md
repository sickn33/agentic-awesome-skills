# Dependabot remediation — 2026-10-24

Scope: all 23 open alerts on main dda521de21f2cbcba0d8b8476e13f106fd7c3bdd: 10 high, 7 medium, 6 low. There are 17 canonical alerts and 6 alerts on five plugin lockfile replicas. Exact alert IDs/advisories, seven canonical lockfile hashes and audit receipts are recorded in the companion JSON.

Canonical repairs resolve body-parser 1.20.9/2.4.0, fast-uri 3.1.9, undici 8.12.3 and ip-address 10.7.4. The complete canonical lockfile audit also found Zod GHSA-mrhx-c7xc-m3w5; affected installed graphs now resolve 4.6.7. Updates retain existing major lines and introduce no application-code or runtime-version change.

All seven canonical npm audits report zero vulnerabilities (including development dependencies). The Loki backend, Telegram and WhatsApp template installs with lifecycle scripts disabled and TypeScript builds passed. These builds do not certify live provider, bot, native SQLite or production operation. Previous full-tree individual review is preserved; dependency diffs, declarations and changed execution context are reviewed for this repair.

Status: all 23 alert paths are patched. The five existing regular lockfile replicas are byte-identical to the corresponding audited canonical locks under the protected owner-only contract adopted in #2101. No alert is dismissed. Final exact-head checks and actual post-merge GitHub alert resolution remain required and are retained in external verification receipts. No release, tag, version bump, publication or deployment is authorized.
