# Coordinated Upgrades

Select every applicable row and derive commands from the cited current source.

| Change                                    | Synchronize                                                                                                        | Validation source                                             |
| ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------- |
| Shared dependency or test/build tool      | Owning manifests, peer/development pairs, configs, and generated artifacts owned by that tool                      | Root/package scripts and affected Vitest projects             |
| pnpm                                      | Root `packageManager`, workspace settings, setup/cache assumptions, workflows, and lockfile format                 | Current install, lint, check, build, and focused test scripts |
| Node, Deno, or Bun                        | Setup inputs, workflow jobs, engines, runtime metadata, compatibility docs, and runtime config                     | Current runtime workflow jobs and test configuration          |
| TypeScript support or compiler            | Compiler/tooling dependencies, `test-types` target, CI target, tool peer ranges, compatibility docs, and typetests | Targeted typetests; typeperf protocol for measured paths      |
| Native package or install policy          | Owning manifests and `pnpm-workspace.yaml#allowBuilds`                                                             | Fresh install plus focused package build and tests            |
| Patched dependency                        | Manifest/range, `patchedDependencies`, patch file, and lockfile patch hash                                         | Fresh install and the behavior that required the patch        |
| Container image or Testcontainers package | Workflow pre-pulls, image call sites, manifests, and integration project names                                     | Current integration workflow and Vitest configuration         |

For a patched dependency, test the new release without the patch when feasible.
Remove obsolete registration and patch files. Otherwise refresh the patch using
the current pnpm workflow and verify both that it applies and that the original
patched behavior still requires it.

When an upgraded component lies on a measured path, use the repository's
runtimeperf or typeperf comparison protocol rather than inventing a benchmark.
