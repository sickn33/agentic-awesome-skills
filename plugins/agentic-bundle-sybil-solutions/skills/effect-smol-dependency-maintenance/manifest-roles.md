# Manifest Roles

Inspect the nearest package with the same integration shape, then justify each
added or moved entry:

| Role                                     | Use when                                                                                         | Completion check                                                                                                        |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------- |
| `dependencies`                           | Published runtime code requires its own installed copy.                                          | A packed consumer receives it without adding an undeclared package.                                                     |
| `peerDependencies`                       | Consumers provide a compatible shared package or the public contract integrates with their copy. | The range states supported consumer versions; add a development entry when local build or tests need an installed copy. |
| `devDependencies`                        | Only repository build, test, type, benchmark, or code-generation work needs it.                  | Published runtime code and declarations do not require consumers to install it.                                         |
| `optionalDependencies`                   | A runtime feature handles absence and installation failure must not block the base package.      | Focused tests cover present and absent behavior.                                                                        |
| Optional peer via `peerDependenciesMeta` | A consumer-provided integration is genuinely optional.                                           | The peer remains in `peerDependencies`, and code requires it only when selected.                                        |

Role selection is complete when every changed entry has one justified role and
peer compatibility remains independent from repository validation versions.
