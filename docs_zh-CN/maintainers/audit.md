# 仓库一致性和正确性审计

本文档总结了在 `apps/` + `tools/` + 分层 `docs/` 重构后执行的仓库一致性审计。

## 范围

- 计数和数字（README、package.json、CATALOG）
- 技能验证（frontmatter、风险、"When to Use"、链接）
- 交叉引用（workflows.json、bundles.json、`docs/users/bundles.md`）
- 文档（`docs/contributors/quality-bar.md`、`docs/contributors/skill-anatomy.md`、安全/许可证）
- 脚本和构建（validate、index、readme、catalog、test）
- 关于 data/ 和测试 YAML 的说明

## 结果

### 1. 计数

- `README.md`、`package.json` 和生成的工件应与当前集合大小（`1,936+` 技能）保持一致。
- `npm run sync:repo-state`、`npm run catalog` 和发布流程中的 `npm run sync:release-state` 是保持计数和生成文件同步的规范命令。

### 2. 技能验证

- `npm run validate` 是操作性的贡献者关卡。
- `npm run validate:strict` 目前是一个诊断强化通道：它仍然会在许多旧技能中显示仓库范围的遗留元数据/内容缺口。
- 验证器接受 `risk: unknown` 用于遗留/未分类的技能，同时仍然希望新技能具有具体的风险值。

### 3. 交叉引用

- 添加了 `tools/scripts/validate_references.py`（也作为 `npm run validate:references` 公开），它验证：
  - data/workflows.json 中的每个 `recommendedSkills` 都存在于 skills/ 中
  - 每个 `relatedBundles` 都存在于 data/bundles.json 中
  - data/bundles.json 中的每个 slug（技能列表）都存在于 skills/ 中
  - `docs/users/bundles.md` 中的每个技能链接都指向现有技能。
- 执行：`npm run validate:references`。结果：所有引用有效。

### 4. 文档

- 规范的贡献者文档现在位于 `docs/contributors/`。
- 规范的维护者文档现在位于 `docs/maintainers/`。
- README、安全文档、许可证和内部 markdown 链接在重构后已重新检查。

### 5. 脚本和构建

- `npm run test` 和 `npm run app:build` 在重构的布局上成功完成。
- `validate_skills_headings.test.js` 充当轻量级回归/冒烟测试，而不是完整元数据合规性的真实来源。
- 维护者文档现在需要与根 `package.json` 和重构的 `tools/scripts/*` 路径保持一致。

### 6. 可交付成果

- 计数与当前生成的注册表一致。
- 引用验证连接到重构的路径。
- 用户和维护者文档在布局更改后检查了路径漂移。
- 后续工作仍开放：需要仓库范围的清理以使 `validate:strict` 完全通过。

## 有用命令

```bash
npm run validate          # 技能验证（软）
npm run validate:strict   # 强化/诊断通道
npm run validate:references  # workflow、bundle 和 docs/users/bundles.md 引用
npm run build             # chain + catalog
npm test                  # 测试套件
```

## 未解决的问题/后续工作

- 逐步清理旧技能，以便 `npm run validate:strict` 可以在未来成为严格的 CI 关卡。
- 在规范英语文档稳定后，在单独的通道中保持翻译文档的一致性。
