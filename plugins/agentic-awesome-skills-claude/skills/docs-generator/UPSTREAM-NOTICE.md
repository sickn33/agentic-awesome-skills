# Upstream helpers for docs-generator

The files listed below were recovered from [zhaoxuya520/reverse-skill](https://github.com/zhaoxuya520/reverse-skill) at commit `cab634bd855fc287f6e420c1f36fd1a6b9245960`. The repository ID is `1237819660`.

They retain the upstream **MIT** license reproduced in [UPSTREAM-LICENSE.txt](UPSTREAM-LICENSE.txt). This notice applies to the listed support files; it does not replace the license metadata of other catalog files. Preserve the upstream license and this attribution when redistributing them.

License wording is unchanged; text-only trailing whitespace and EOF blank lines are normalized. Original license: https://github.com/zhaoxuya520/reverse-skill/blob/cab634bd855fc287f6e420c1f36fd1a6b9245960/LICENSE

| Local file | Original upstream path | Original Git blob SHA | Import changes |
| --- | --- | --- | --- |
| `scripts/case-init.ps1` | `skills/scripts/case-init.ps1` | `413b895521ce2bfcea09be1af703050f7262b79c` | relocated; local review removes preset-derived authorization and validates scope/output ancestry |
| `scripts/lib/HostRuntime.ps1` | `skills/scripts/lib/HostRuntime.ps1` | `59dbece870de7ee5c01fa3597ede581a2b3bcf1b` | relocated inside this skill |
| `scripts/lib/WorkRoot.ps1` | `skills/scripts/lib/WorkRoot.ps1` | `ceadb65cf459367a404c7f343c33e586b25c6975` | relocated inside this skill |

The case initializer now refuses to reuse an existing case directory before creating its managed output files. Its optional upstream router is not bundled; without it the initializer uses its documented default routing metadata.
