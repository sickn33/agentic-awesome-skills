# Upstream helpers for warp-delegate

The files listed below were recovered from [amElnagdy/delegate-skills](https://github.com/amElnagdy/delegate-skills) at commit `3aa72d681a79e2a9d09bd9a316353003ae1cb4a7`. The repository ID is `1269124956`.

They retain the upstream **MIT** license reproduced in [UPSTREAM-LICENSE.txt](UPSTREAM-LICENSE.txt). This notice applies to the listed support files; it does not replace the license metadata of other catalog files. Preserve the upstream license and this attribution when redistributing them.

License wording is unchanged; text-only trailing whitespace and EOF blank lines are normalized. Original license: https://github.com/amElnagdy/delegate-skills/blob/3aa72d681a79e2a9d09bd9a316353003ae1cb4a7/LICENSE

| Local file | Original upstream path | Original Git blob SHA | Import changes |
| --- | --- | --- | --- |
| `scripts/relay.mjs` | `skills/warp-delegate/scripts/relay.mjs` | `0b1d74eecad7ff51cc5c48e5c369085b431d7199` | local: private new run-directory permissions and refuse artifact overwrite |

The relay launches the user-installed, authenticated agent CLI. Write-capable modes can approve child tools automatically; they are not a host sandbox. Invoke only for explicitly authorized delegation, keep credentials out of task briefs, and review the child output and project changes before landing them. This import does not run the CLI.
