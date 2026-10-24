# Upstream helpers for podcast-generation

The files listed below were recovered from [microsoft/skills](https://github.com/microsoft/skills) at commit `fc164ba1d7a0c10377dbcc1c9ac07253b9329fdb`. The repository ID is `1135891523`.

They retain the upstream **MIT** license reproduced in [UPSTREAM-LICENSE.txt](UPSTREAM-LICENSE.txt). This notice applies to the listed support files; it does not replace the license metadata of other catalog files. Preserve the upstream license and this attribution when redistributing them.

License wording is unchanged; text-only trailing whitespace and EOF blank lines are normalized. Original license: https://github.com/microsoft/skills/blob/fc164ba1d7a0c10377dbcc1c9ac07253b9329fdb/LICENSE

| Local file | Original upstream path | Original Git blob SHA | Import changes |
| --- | --- | --- | --- |
| `scripts/pcm_to_wav.py` | `.github/skills/podcast-generation/scripts/pcm_to_wav.py` | `6f296aa89974d462d7def65daba5b91915947ec2` | text-only trailing whitespace normalized |
| `references/architecture.md` | `.github/skills/podcast-generation/references/architecture.md` | `28e572aa1bc1b7189efdfe88fc5c8ee963c09494` | text-only trailing whitespace and EOF blank lines normalized |
| `references/code-examples.md` | `.github/skills/podcast-generation/references/code-examples.md` | `18bbdc306505cdb9a9afe1deec121d3da8ab45e4` | text-only trailing whitespace and EOF blank lines normalized |

Local review (2026-10-23): helper now bounds input, validates PCM frame/format, accounts for channels and refuses CLI overwrite; examples clarify authorization/session/error/resource limits. Original blob IDs above describe upstream provenance, not current local hashes. License unchanged.
