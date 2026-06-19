# 安全发现分类补充（2026-03-18）

本补充文件取代了之前在 `security-findings-triage-2026-03-15.md` 中的 Jetski 加载器评估。

## 更正

- 发现：`示例加载器信任清单路径，启用文件读取`
- 路径：`docs/integrations/jetski-gemini-loader/loader.mjs`
- 2026-03-15 之前的分类状态：`在当前 HEAD 上已过时/不可复现`
- 更正的评估：加载器仍然可以通过解析到 `skillsRoot` 之外的符号链接 `SKILL.md` 复现。本地验证成功读取了链接的文件内容。

## 当前状态

- 加载器现在拒绝符号链接的技能目录和符号链接的 `SKILL.md` 文件。
- 加载器现在解析 `SKILL.md` 的真实路径，并拒绝配置的 `skillsRoot` 之外的任何目标。
- 回归覆盖位于 `tools/scripts/tests/jetski_gemini_loader.test.js` 中。
