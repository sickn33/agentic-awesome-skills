# Upstream helpers for hyperexecute-skill

The files listed below were recovered from [LambdaTest/agent-skills](https://github.com/LambdaTest/agent-skills) at commit `992638bccbc311f42c0bd8b2b3387a0d1ce6288d`. The repository ID is `1159911288`.

They retain the upstream **MIT** license reproduced in [UPSTREAM-LICENSE.txt](UPSTREAM-LICENSE.txt). This notice applies to the listed support files; it does not replace the license metadata of other catalog files. Preserve the upstream license and this attribution when redistributing them.

License wording is unchanged; text-only trailing whitespace and EOF blank lines are normalized. Original license: https://github.com/LambdaTest/agent-skills/blob/992638bccbc311f42c0bd8b2b3387a0d1ce6288d/LICENSE

| Local file | Original upstream path | Original Git blob SHA | Import changes |
| --- | --- | --- | --- |
| `scripts/doctor.js` | `hyperexecute-skill/scripts/doctor.js` | `33fee4233ecbf76bedc2e3f77b09208166d67f12` | stored without executable bit; invoke via its interpreter |
| `scripts/validate-config.js` | `hyperexecute-skill/scripts/validate-config.js` | `a81699ea8a2a8d860382700130d9264bcdf4aadd` | stored without executable bit; invoke via its interpreter |
| `scripts/build-command.js` | `hyperexecute-skill/scripts/build-command.js` | `e8cbdcc4fa6f39f4f004eb1d66201a88d2873d7b` | stored without executable bit; invoke via its interpreter |
| `scripts/summarize-artifacts.js` | `hyperexecute-skill/scripts/summarize-artifacts.js` | `6b36f2bc8e67383681e98ec0a261523d7ad259ef` | stored without executable bit; invoke via its interpreter |

`doctor.js --validate-cli` runs the user-installed HyperExecute CLI using provider credentials supplied by environment variables; the provider CLI receives those values in process arguments, where local process-inspection tools may expose them. Restrict use to an authorized account on a trusted host. Treat it as a remote account operation and verify current CLI behavior before invocation. No credentials were supplied during this restoration.

## Local review modifications (2026-10-23)

Original blob hashes above identify imported upstream bytes, not the modified files. Local changes bound doctor subprocess waiting, reject misleading download-only run construction and invalid concurrency, limit artifact traversal, and make text-config lint boundaries explicit. MIT attribution and license wording are preserved.
