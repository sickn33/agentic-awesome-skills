# Upstream helpers for constant-time-analysis

The files listed below were recovered from [trailofbits/skills](https://github.com/trailofbits/skills) at commit `695119c312e0eadbd953c30b9e051b7dfa4163dd`. The repository ID is `1134447175`.

They retain the upstream **CC-BY-SA-4.0** license reproduced in [UPSTREAM-LICENSE.txt](UPSTREAM-LICENSE.txt). This notice applies to the listed support files; it does not replace the license metadata of other catalog files. Preserve the upstream license and this attribution when redistributing them.

License wording is unchanged; text-only trailing whitespace and EOF blank lines are normalized. Original license: https://github.com/trailofbits/skills/blob/695119c312e0eadbd953c30b9e051b7dfa4163dd/LICENSE

| Local file | Original upstream path | Original Git blob SHA | Import changes |
| --- | --- | --- | --- |
| `references/compiled.md` | `plugins/constant-time-analysis/skills/constant-time-analysis/references/compiled.md` | `e02417e3dd7d76c3e5184c9113bc2845e1b769d5` | text-only trailing whitespace and EOF blank lines normalized |
| `references/swift.md` | `plugins/constant-time-analysis/skills/constant-time-analysis/references/swift.md` | `653f5e14b526bb038a69ebfd50dc7dcd94ac7a43` | text-only trailing whitespace and EOF blank lines normalized |
| `references/vm-compiled.md` | `plugins/constant-time-analysis/skills/constant-time-analysis/references/vm-compiled.md` | `2612c5da0cdf629237550c3743055721695c37aa` | text-only trailing whitespace and EOF blank lines normalized |
| `references/kotlin.md` | `plugins/constant-time-analysis/skills/constant-time-analysis/references/kotlin.md` | `a61dff866c83cc30db8aa477e28e63903e213c23` | text-only trailing whitespace and EOF blank lines normalized |
| `references/php.md` | `plugins/constant-time-analysis/skills/constant-time-analysis/references/php.md` | `698c5f14b2a0a121dc073a04375d96f5503cec9a` | text-only trailing whitespace and EOF blank lines normalized |
| `references/javascript.md` | `plugins/constant-time-analysis/skills/constant-time-analysis/references/javascript.md` | `f8454c778831bb8c951bc7f32105fa618fcd6134` | text-only trailing whitespace and EOF blank lines normalized |
| `references/python.md` | `plugins/constant-time-analysis/skills/constant-time-analysis/references/python.md` | `6530be6202601e2c3ae32db44d4153a1d2f98e28` | text-only trailing whitespace and EOF blank lines normalized |
| `references/ruby.md` | `plugins/constant-time-analysis/skills/constant-time-analysis/references/ruby.md` | `6e462470f4ed02882b77a5aaacf733154a4a8de0` | text-only trailing whitespace and EOF blank lines normalized |

Maintainer safety changes for 19.13.0: the PHP guide requires an existing reviewed VLD toolchain and removes the executing OPcache fallback and mutable installer commands. The JavaScript guide rejects automatic `npx` fallback. Original blob identities above describe upstream provenance, not current local byte equality.

2026-10-23 review adaptations (CC-BY-SA-4.0): corrected unsafe reciprocal/managed-runtime timing claims, comparison preconditions, Python opcode mapping, Swift API/overflow examples and result interpretation; retained upstream attribution and license. No analyzer runtime is bundled or tested.
