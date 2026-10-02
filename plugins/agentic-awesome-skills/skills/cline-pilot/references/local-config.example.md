# Local Config — YOUR MACHINE (private, not tracked)

Copy this file to `local-config.md` and fill in YOUR values before first use.
本文件为模板；复制为 `local-config.md` 后填入你自己的值。

## Dev Environment 开发环境
| Item 项目 | Value 值 |
|----|-----|
| conda env | e.g. `dev-env` |
| Pre-launch | `source <your rc/env file> && conda activate <env>` |
| Dirty-stack fix | `unset CONDA_PREFIX CONDA_PREFIX_1 CONDA_PROMPT_MODIFIER CONDA_SHLVL CONDA_DEFAULT_ENV` (if your agent session inherits broken CONDA state) |
| Toolchain | e.g. `java` 21 / `mvn` 3.9+ / `node` |
| Branch rules | e.g. main is push-protected; feature branches only |

## Launch Template 启动模板
```bash
zsh -c '<unset CONDA_* if dirty>; source <env> && conda activate <env> && cd <project> && cline ...'
```
Self-check before launch: python points to target env / toolchain versions / `git branch --show-current` = task branch.

## LLM Endpoint
- base: `http://<your openai-compatible endpoint>/v1`, model: `<model-id>`
- Probe before launch: `curl -s -H 'Authorization: Bearer <key>' <base>/models | head -c 200`

## Scratch Workspace 临时工作区
`<path>/worktree/` — worktrees / subagent dirs / temp builds MUST stay here; never scatter into `~`.
