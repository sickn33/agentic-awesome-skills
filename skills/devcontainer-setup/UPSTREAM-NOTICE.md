# Upstream helpers for devcontainer-setup

The files listed below were recovered from [trailofbits/skills](https://github.com/trailofbits/skills) at commit `8e54050ae63c2f62224c35b1616efe71865b4777`. The repository ID is `1134447175`.

They retain the upstream **CC-BY-SA-4.0** license reproduced in [UPSTREAM-LICENSE.txt](UPSTREAM-LICENSE.txt). This notice applies to the listed support files; it does not replace the license metadata of other catalog files. Preserve the upstream license and this attribution when redistributing them.

License wording is unchanged; text-only trailing whitespace and EOF blank lines are normalized. Original license: https://github.com/trailofbits/skills/blob/8e54050ae63c2f62224c35b1616efe71865b4777/LICENSE

| Local file | Original upstream path | Original Git blob SHA | Import changes |
| --- | --- | --- | --- |
| `references/dockerfile-best-practices.md` | `plugins/devcontainer-setup/skills/devcontainer-setup/references/dockerfile-best-practices.md` | `50287dbbe2edf38e1107257aceacca9401b3c0b5` | text-only trailing whitespace and EOF blank lines normalized; pipefail example uses a local producer/consumer |
| `references/features-vs-dockerfile.md` | `plugins/devcontainer-setup/skills/devcontainer-setup/references/features-vs-dockerfile.md` | `e2d9a174a7edc71b074a5522f4aadcac5e99b7fd` | text-only trailing whitespace and EOF blank lines normalized |

## Local review adaptations (2026-10-23)

Both listed references were modified: pipefail now selects a compatible shell, unverified image digest/architecture/template guarantees were removed, download extraction is staged, and Python installation timing was qualified. These adaptations retain CC-BY-SA-4.0. Original blob IDs above describe imported originals, not current file hashes.
