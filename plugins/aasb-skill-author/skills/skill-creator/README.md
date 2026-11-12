# Skill Creator

Modified for the AAS catalog: corrected bundled workflow, validation and packaging safeguards (2026-10-23).

Create a reusable skill as a reviewed local directory. This distribution includes three Python helpers and two writing references; it does not include the former cli-ai-skills shell validators, installer, version manager or external template tree.

From the project workspace, invoke the helpers using their absolute installed paths:

```bash
python3 <skill-dir>/scripts/init_skill.py my-skill --path skills
python3 <skill-dir>/scripts/quick_validate.py skills/my-skill
python3 <skill-dir>/scripts/package_skill.py skills/my-skill dist
```

Replace `<skill-dir>` with the folder containing this SKILL.md. Python 3.10+ is required; the validator and packager need PyYAML in the selected virtual environment. The initializer creates a draft with TODOs and placeholder resources. Complete or delete them before packaging. Helpers restrict paths to the current workspace and refuse an existing skill/output archive.

The quick validator checks a small generic frontmatter schema. It does not audit instructions, dependencies, references, scripts, provenance, host compatibility or behavior, and is not a substitute for this repository's validators. For AAS contributions, use the current repository template and required checks; AAS metadata may exceed this generic schema.

Packaging excludes symlinks, common environment/build/cache directories and obvious credential files; this is not a secret detector. Read every file, verify licenses, remove private information and review the archive inventory before distribution. A `.skill` ZIP is not an installer or a guarantee that any host accepts that archive format.

Choose local or global installation only when requested, using the target host's current official instructions. Preserve existing files/configuration and verify actual skill discovery. Do not force-replace links. Creation does not authorize installation, commits, publication or invoking another agent.

See [the workflow](references/detailed-guide.md), [output patterns](references/output-patterns.md) and [workflow patterns](references/workflows.md). Preserve [LICENSE.txt](LICENSE.txt) when redistributing covered material.
