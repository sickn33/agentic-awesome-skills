# Package Registration

Use current configuration and the closest package in the same family as the
sources of truth. A package-local build does not prove repository registration.
Classify every row as applicable or not applicable.

## Workspace And TypeScript

| Surface                  | Check                                                                                                                                                                                        |
| ------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm-workspace.yaml`    | Its globs cover the package path and exact-name pnpm selection discovers it.                                                                                                                 |
| `pnpm-lock.yaml`         | The current importer, name, and dependencies exist; renamed or moved importers are gone.                                                                                                     |
| `tsconfig.packages.json` | Packages intended to participate in the root TypeScript project-reference graph are referenced. Follow neighboring package policy; buildable private tools are not automatically included.   |
| `tsconfig.tests.json`    | Broad test globs cover the path. Add source aliases only when tests require workspace source routing or would otherwise create a dependency cycle. Preserve intentional platform exclusions. |

## Tests And Documentation

| Surface              | Check                                                                                                                          |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `vitest.config.ts`   | A package with runtime tests has the intended project, environment, setup, and inclusion rules.                                |
| `tstyche.json`       | Type-test discovery covers the package depth; current globs cover one- and two-level package layouts.                          |
| `vitest.docs.ts`     | Doctest source discovery covers packages with runnable JSDoc examples; current globs cover one- and two-level package layouts. |
| `jsdocs.config.json` | Public source is included in JSDoc checks and exclusions by package family remain intentional.                                 |
| `deno.json`          | Deno checks cover the package family, or its exclusion is intentional.                                                         |

## Release And Discovery

| Surface                                           | Check                                                                                                                                        |
| ------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| `.changeset/config.json`                          | Published fixed-group membership uses the current name; private tooling is not added solely because it builds.                               |
| `README.md`                                       | Public catalog entries have the current name, path, description, and documentation link.                                                     |
| AI documentation copy tooling and package `files` | Published payloads include required generated documentation. Continue with [publishing.md](publishing.md) for the full packed-surface audit. |
| Snapshot publishing workflows                     | Snapshot publishing selects the package path. Existing globs may already cover it; apply root workflow requirements before editing.          |
| Runtime-specific CI workflows                     | Runtime-specific packages participate in applicable runtime jobs; apply root workflow requirements before editing.                           |

## Paths And Consumers

Audit explicit workspace package names in root tooling manifests. Search scripts
for the package family, old name, and old path to find path-sensitive clean,
codemod, circularity, copy, and related behavior. Explain every remaining old
reference after a rename or move.
