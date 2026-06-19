# Distribution Registry Method

Registry metadata turns a local skill directory into an installable and reviewable package record.

## When To Use

Use registry audit for library, governed, team-distributed, or upgrade-sensitive skills. Scaffold skills can skip it until reuse is real.

## Required Evidence

- package name, version, owner, maturity, review cadence, and license
- Skill IR source and schema version
- trust level and package SHA256
- package verification status and archive SHA256 when a zip distribution is built
- install simulation status when an archive is meant to be installed locally or by a team
- adoption/drift aggregate status when local telemetry exists
- target compatibility matrix
- upgrade diff, recommended version bump, and breaking-change notes when a previous package baseline exists
- links to overview, Review Studio, trust report, conformance matrix, package verification, install simulation, adoption drift evidence, and review waivers

## Release Rule

Do not publish a team package when registry audit reports missing version, hash, owner, review cadence, license, valid Skill IR, or passing compatibility for declared targets.

For an installable archive, first build the distribution and run package verification:

```bash
python3 scripts/yao.py package . --platform openai --platform claude --platform generic --platform vscode --output-dir dist --zip
python3 scripts/yao.py package-verify . --package-dir dist --require-zip
python3 scripts/yao.py install-simulate . --package-dir dist
python3 scripts/yao.py registry-audit .
python3 scripts/yao.py upgrade-check . --previous-package-json registry/examples/yao-meta-skill-1.0.0.json
```

Do not claim archive readiness when package verification reports unsafe zip paths, missing target adapters, missing package manifest, registry metadata mismatch, or unreadable archive contents.

Do not claim install readiness when install simulation cannot extract the archive into a temporary skill root, load `SKILL.md` frontmatter, read `manifest.json`, read `agents/interface.yaml`, find the overview and Review Studio reports, or load each generated adapter.

Do not sync a local or active install from source until the same package has passed install preflight. `scripts/sync_local_install.py` must run install simulation against the configured package directory and fail before copying files when any target/capability pair lacks active permission approval or target-specific enforcement evidence. Use `--skip-install-preflight` only for isolated diagnostics, not for release or active install.

Do not include raw `reports/telemetry_events.jsonl` in a distributed package. Include only aggregate adoption drift reports, and block release review when telemetry contains raw prompts, outputs, transcripts, notes, or messages.

Review waiver evidence may be distributed as `reports/review_waivers.md/json` because it is metadata-only reviewer accountability. Do not store raw prompts, outputs, transcripts, credentials, or private customer detail in waiver reasons.

Do not claim upgrade readiness when upgrade check reports an insufficient version bump, target removal without a major bump, compatibility regression without a major bump, package name change, or invalid semver. Include `reports/upgrade_check.md` in the reviewer evidence bundle so release notes and migration guidance are tied to the exact registry diff.

## Reviewer Gate

A reviewer should be able to answer:

1. Which package version is being installed?
2. Who owns the package?
3. Which targets are compatible?
4. Which checksum identifies the reviewed package contents?
5. Which reports prove trust and runtime readiness?
6. Was the installable archive verified, and which checksum identifies it?
7. Was the archive install-simulated in a temporary local skill root?
8. Did local or active install sync preserve that preflight and installer permission gate?
9. What changed since the previous package, and does the declared version bump match the recommended bump?
10. Are adoption and drift signals summarized without packaging raw local telemetry?
