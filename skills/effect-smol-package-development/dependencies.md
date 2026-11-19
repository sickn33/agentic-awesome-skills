# Package Dependencies

Inspect the closest package with the same publication and integration shape.
Classify every manifest entry by the role it serves:

| Role                                     | Use when                                                                                         |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------ |
| `dependencies`                           | Published runtime code requires the package to receive its own installed copy.                   |
| `peerDependencies`                       | Consumers provide a compatible shared package or the public contract integrates with their copy. |
| `devDependencies`                        | Only repository build, test, type test, benchmark, or code generation needs the package.         |
| `optionalDependencies`                   | A runtime feature handles absence and installation failure must not block the base package.      |
| Optional peer via `peerDependenciesMeta` | A consumer-provided integration is genuinely optional. Keep its version in `peerDependencies`.   |

Use `workspace:^` for workspace packages unless neighboring packages establish a
different policy. When local build or tests need an installed peer, add the peer
to `devDependencies` at the repository's tested version while keeping the peer
range based on supported consumer versions.

Derive external versions from current consumers with the same integration
shape. Add only direct requirements; do not copy a neighboring manifest entry
that the new package's runtime, declarations, build, or tests do not use.

After editing manifests, run root `pnpm install`. Inspect warnings and the
package's `pnpm-lock.yaml` importer for intended specifiers and resolutions. If
a dependency has an install or native build, classify it under
`pnpm-workspace.yaml#allowBuilds` using current repository policy.

This branch is complete when every entry has one justified role, workspace and
peer ranges follow repository policy, the lockfile importer agrees with the
manifest, and install/build policy is explicit.
