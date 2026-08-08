# Source References

Last verified: 2026-06-18.

Use this file when an answer depends on upstream Drizzle behavior, community scripts, or CI platform
behavior. Drizzle Kit migration internals can change, so prefer current official docs and the
project's installed `drizzle-kit` version over memory when resolving a real conflict.

## Official and semi-official Drizzle sources

| Source | Link | Use | Trust level |
| --- | --- | --- | --- |
| Discussion 1104 | https://github.com/drizzle-team/drizzle-orm/discussions/1104 | Original team-collaboration conflict thread for legacy `_journal.json` and snapshot conflicts. Useful for understanding why parallel generated migrations diverge. | Drizzle GitHub discussion; useful but may include outdated comments. |
| Discussion 2832 | https://github.com/drizzle-team/drizzle-orm/discussions/2832 | Migration folder structure redesign and reasoning. Use to understand why the old flat structure is git-hostile. | Drizzle GitHub discussion; design context may predate current release behavior. |
| Discussion 5005 | https://github.com/drizzle-team/drizzle-orm/discussions/5005 | Commutative migration checking, `drizzle-kit check`, and conflict behavior in newer Drizzle Kit versions. | High value for current direction; verify against installed version. |
| Discussion 5581 | https://github.com/drizzle-team/drizzle-orm/discussions/5581 | Practical parent-branch-as-source-of-truth repair workflow. | Community workflow; good playbook, still verify against repo state. |
| Generate docs | https://orm.drizzle.team/docs/drizzle-kit-generate | How Drizzle Kit derives migrations from schema and snapshots. | Official docs. |
| Check docs | https://orm.drizzle.team/docs/drizzle-kit-check | Migration consistency checking for team workflows. | Official docs. |
| Migration overview | https://orm.drizzle.team/docs/migrations | General migration concepts and current official migration overview. | Official docs. |

## Community scripts

These scripts are reference material only. Do not copy their destructive behavior into a generic
agent workflow without dry-run mode and explicit user confirmation.

| Source | Link | Use | Caveat |
| --- | --- | --- | --- |
| Legacy undo script | https://gist.github.com/anthonyjoeseph/102c0e3ea8496fe111029a8b8a95cc3a | Shows a merge-time undo workflow for legacy Drizzle migration artifacts. | Assumes legacy structure and uses git/file operations that can discard local generated files. |
| Legacy repair script | https://gist.github.com/anthonyjoeseph/6b99beb34d494acd1dfc83a192ed9388 | Detects duplicate legacy migration numbers and can repair by removing orphaned generated files. | `FORCE_FIX` is destructive; adapt only the read-only checks unless the user confirms. |
| Earlier repair variant | https://gist.github.com/gburtini/7e34842c567dd80ee834de74e7b79edd | Useful for historical context and comparing conflict-detection logic. | Earlier variant had caveats fixed by later forks; do not rely on it alone. |

## CI and merge queue sources

| Source | Link | Use | Caveat |
| --- | --- | --- | --- |
| GitHub merge queue docs | https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/configuring-pull-request-merges/managing-a-merge-queue | Explains merge queue behavior and why required checks must also run for `merge_group` events. | Merge queue serializes merging; it does not regenerate Drizzle migrations by itself. |

## Version-sensitive guidance

Before giving high-confidence advice for a live repository:

1. Check the local `drizzle-kit` version from `package.json` and the lockfile first.
2. Check whether the migration output uses the legacy flat structure or the folder-based structure.
3. If command execution is acceptable and dependencies are already installed, use a local-only
   package-manager command. Prefer `pnpm exec drizzle-kit --version`,
   `yarn exec drizzle-kit --version`, or `npm exec --no-install drizzle-kit -- --version`. Do not
   use plain `npx` for version probing because it can download or resolve a different package.
4. If online browsing is available and the user asks for current guidance, re-open the official docs
   and the discussion most relevant to the installed version.
5. If a local result conflicts with these sources, trust the local repository state and report the
   mismatch explicitly.
