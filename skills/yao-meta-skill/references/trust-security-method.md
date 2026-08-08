# Trust Security Method

Trust checks make skills safer to install and review, especially when they include scripts or are distributed to a team.

## When To Run

Run the trust report when:

- the skill contains scripts
- the skill will be shared with a team
- the package may be installed from a registry or plugin
- the skill reads external files, uses network access, or shells out
- the maturity tier is library or governed

## V0 Checks

- obvious secret patterns
- script help surface and interactive prompts
- execution-level `--help` smoke checks
- dependency pinning
- runtime trust metadata
- network-capable scripts
- bounded host policy for network-capable scripts
- reviewer-approved permission policy for high-permission capabilities
- packaged-target runtime permission probes for adapter contracts and metadata fallback limits
- source-contract integrity digest

## Script Interface Rule

Every Python file under `scripts/` is reviewed as part of the package trust surface.

- CLI scripts should use `argparse` so reviewers and installers can run `python3 scripts/name.py --help` before execution.
- The trust report executes `python3 scripts/name.py --help` for CLI scripts with `argparse`, with a short timeout, and records pass/fail evidence.
- Import-only modules should declare `SCRIPT_INTERFACE = "internal-module"` near the top of the file.
- Internal modules should also declare `SCRIPT_INTERFACE_REASON` with a short explanation of which CLI or renderer imports them.
- The trust report keeps internal modules in the script inventory, but excludes them from CLI help-surface warnings.
- A Python file without an explicit internal-module declaration is treated as a CLI script by default.
- CLI scripts without `argparse` are not smoke-executed; they remain visible as help-surface warnings.

## Network Policy Rule

Network-capable scripts must be bounded by a machine-readable policy before team distribution.

- Put the policy in `security/network_policy.json`.
- Add one entry per network-capable script under `scripts`.
- Declare `allowed_hosts`, `allowed_path_prefixes`, purpose, timeout, auth mode, and custom-host behavior.
- Default to HTTPS-only and deny custom hosts unless a CLI flag or environment variable makes the override explicit.
- The trust report compares HTTPS URL literals in each script with `allowed_hosts`; missing or mismatched entries remain reviewer-visible warnings.

## Permission Approval Rule

High-permission capabilities must be approved before governed release.

- Put approvals in `security/permission_policy.json`.
- Cover each required capability detected by the trust report: `network`, `file_write`, `subprocess`, and `interactive` when present.
- Each approval must include `decision: approved`, `reviewer`, `scope`, `reason`, `expires_at`, `evidence`, and `target_enforcement`.
- Review Studio surfaces these checks as the `permission-gates` gate.
- Missing, invalid, or expired approvals block governed mode. They remain visible warnings in lighter modes.

## Runtime Permission Probe Rule

Permission approval validates reviewer intent. Runtime permission probes validate the generated target adapters after packaging.

- Run `python3 scripts/probe_runtime_permissions.py . --package-dir dist` after `cross_packager.py`.
- The probe writes `reports/runtime_permission_probes.json` and `reports/runtime_permission_probes.md`.
- A passing probe requires every target adapter to carry `permission_contract`, `target_permission_contract`, declared capabilities, a native-enforcement boolean, representation notes, and operator notes.
- When `reports/install_simulation.json` matches the same package directory, the probe also reports installer enforcement counts from the install simulation. This proves the local package installer gate is wired, but it does not count as target-client native enforcement.
- If a target has no native enforcement, the probe must mark an explicit metadata fallback and keep residual risk reviewer-visible.
- Review Studio surfaces this as the `permission-runtime` gate.

## Release Rule

High-risk secrets or unrestricted remote inline execution block governed release. Warnings are reviewer-visible but do not block v0 unless the release owner decides the target environment requires stricter policy.

## Hash Scope

`package_sha256` is a stable source-contract digest, not a generated archive digest. It covers the skill entrypoint, metadata, scripts, references, evals, runtime, templates, security notes, Skill IR, and root control files. It deliberately excludes generated `reports/`, packaged `dist/` archives, and raw local telemetry so a report render or local adoption log cannot mutate the trust fingerprint.

Use the package verification or registry audit report for the distributable archive checksum.
