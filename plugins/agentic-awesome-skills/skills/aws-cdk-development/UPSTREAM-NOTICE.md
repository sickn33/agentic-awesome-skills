# Upstream helpers for aws-cdk-development

The files listed below were recovered from [zxkane/aws-skills](https://github.com/zxkane/aws-skills) at commit `68530c6f296ccd2f5e99c79782f3e0fbf962c51a`. The repository ID is `1080226559`.

They retain the upstream **MIT** license reproduced in [UPSTREAM-LICENSE.txt](UPSTREAM-LICENSE.txt). This notice applies to the listed support files; it does not replace the license metadata of other catalog files. Preserve the upstream license and this attribution when redistributing them.

License wording is unchanged; text-only trailing whitespace and EOF blank lines are normalized. Original license: https://github.com/zxkane/aws-skills/blob/68530c6f296ccd2f5e99c79782f3e0fbf962c51a/LICENSE

| Local file | Original upstream path | Original Git blob SHA | Import changes |
| --- | --- | --- | --- |
| `references/cdk-patterns.md` | `plugins/aws-iac/skills/aws-cdk-development/references/cdk-patterns.md` | `7c533a80e548956cc50e69233bdc2d1617175c47` | text-only trailing whitespace and EOF blank lines normalized |
| `scripts/validate-stack.sh` | `plugins/aws-iac/skills/aws-cdk-development/scripts/validate-stack.sh` | `54f9e0512b1b8a3e5aa54b3dd76e3bc56f0814c1` | stored without executable bit; invoke via its interpreter; AAS correctness and scope adaptation: resolves and synthesizes only the caller-selected CDK project root instead of the installed skill catalog |

`scripts/validate-stack.sh` runs the project's `cdk synth` and executes CDK application code; synthesis can write `cdk.out`, execute project dependencies, and contact AWS context providers if the project requires lookups. It now uses the caller's current directory or `CDK_PROJECT_ROOT` as the project root. Review the project and AWS context first. It does not deploy; deployment requires separate user authorization.

Local review changes (2026-10-23): corrected construct/autoscaling examples; helper requires jq and a CDK project, checks isolated current synthesis output, propagates JSON errors and avoids a deployment-readiness certification. Original source/blob identifiers above remain provenance for imported bytes.
