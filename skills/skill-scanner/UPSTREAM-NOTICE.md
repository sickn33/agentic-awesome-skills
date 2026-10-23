# Upstream helpers for skill-scanner

The files listed below were recovered from [getsentry/skills](https://github.com/getsentry/skills) at commit `d18b7aa8ba878354e5c348310230e652f7690f9c`. The repository ID is `1128612043`.

They retain the upstream **Apache-2.0** license reproduced in [UPSTREAM-LICENSE.txt](UPSTREAM-LICENSE.txt). This notice applies to the listed support files; it does not replace the license metadata of other catalog files. Preserve the upstream license and this attribution when redistributing them.

License wording is unchanged; text-only trailing whitespace and EOF blank lines are normalized. Original license: https://github.com/getsentry/skills/blob/d18b7aa8ba878354e5c348310230e652f7690f9c/LICENSE

| Local file | Original upstream path | Original Git blob SHA | Import changes |
| --- | --- | --- | --- |
| `scripts/scan_skill.py` | `skills/skill-scanner/scripts/scan_skill.py` | `14aaa7b059c659ea5c2719fa266f19641dfd9d3d` | AAS patches bounded no-follow reads, nested-tree coverage/error reporting, parsed URL hosts and locator-only reports without raw metadata, commands or decoded/source payloads. Original source remains linked for comparison. |
| `references/prompt-injection-patterns.md` | `skills/skill-scanner/references/prompt-injection-patterns.md` | `a675bd5f946b83abbdaba3a21c827214d88b0df7` | text-only trailing whitespace and EOF blank lines normalized |
| `references/dangerous-code-patterns.md` | `skills/skill-scanner/references/dangerous-code-patterns.md` | `974073260eb9fa199efcd9cd0f21b0f7f31fe694` | text-only trailing whitespace and EOF blank lines normalized |
| `references/permission-analysis.md` | `skills/skill-scanner/references/permission-analysis.md` | `ac33919098695e551faf5d478f5b4318ebc4721b` | text-only trailing whitespace and EOF blank lines normalized |

AAS review: clarified read-only data exposure and model-dependent Unicode handling.
