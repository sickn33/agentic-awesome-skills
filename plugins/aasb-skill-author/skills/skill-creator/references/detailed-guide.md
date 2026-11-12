# Skill Creator Workflow

Modified for the AAS catalog: corrected bundled workflow, validation and packaging safeguards (2026-10-23).

## 1. Establish scope

Use the user's request and repository instructions to determine the skill name, purpose, activation examples, target host and output directory. Ask only for missing decisions that affect the result. Skill creation, global installation and publication are separate actions; honor the requested boundary. Do not infer host support from the existence of a configuration directory.

## 2. Create a draft

Read the repository's current contribution template first. If a generic scaffold is useful, invoke the bundled `scripts/init_skill.py` with Python 3.10+ from the intended workspace:

```bash
python3 <skill-dir>/scripts/init_skill.py my-skill --path skills
```

The skill ID must be lowercase hyphenated words, at most 64 characters. The output directory must be within the current workspace and must not already exist. The helper creates SKILL.md, one placeholder Python script, a reference and an asset placeholder. This is a draft, not a finished or validated skill.

Write YAML with a YAML serializer or carefully quoted static values; do not interpolate arbitrary user descriptions into shell `sed` programs. Add examples, prerequisites, dependencies, risk, provenance and limitations appropriate to the repository. Retain licenses and explain local changes to imported material. Remove template TODOs and unneeded placeholder files. Do not invent unavailable templates, scripts or successful outputs.

## 3. Review every bundled file

Keep concise activation/workflow instructions in SKILL.md and supporting details in references. Read every script before deciding whether to execute it. Inspect input validation, path handling, credentials, remote destinations, side effects, output overwrites, failure behavior and resource bounds. Distinguish deterministic checks from heuristic judgments. Do not run code merely to satisfy a template.

See [output-patterns.md](output-patterns.md) and [workflows.md](workflows.md) for authoring patterns. Other skills can be considered only when installed, relevant and authorized; no automatic dependency or delegation is implied.

## 4. Validate and exercise representative behavior

```bash
python3 <skill-dir>/scripts/quick_validate.py skills/my-skill
```

The generic quick validator requires PyYAML. Its allowed fields are deliberately small and may differ from a host or repository schema. Run the current repository's required validators separately. A frontmatter pass says nothing about semantic quality or runtime safety. Test representative user requests in the actual target host when available; state any unavailable checks honestly. Do not invent fixed word-count standards or portray style preferences as universal host requirements.

## 5. Package if requested

```bash
python3 <skill-dir>/scripts/package_skill.py skills/my-skill dist
```

Choose a new output archive outside the skill directory. Packaging does not run bundled scripts. The archive is a ZIP using the `.skill` suffix; target-host installation support must be verified separately. Inspect archive contents and remove secrets before sharing. Exclusions are convenience safeguards, not a complete secret scan.

## 6. Install or hand off within scope

For local/global installation, consult the selected host's current documented discovery paths rather than assuming `.codex/skills`, `.copilot/skills` or another path works everywhere. Inspect the destination and preserve existing work; do not force-overwrite a directory or symlink. Verify discovery with the actual host. If only a draft was requested, deliver its location and validation limits without installing, committing, publishing or contacting anyone.
