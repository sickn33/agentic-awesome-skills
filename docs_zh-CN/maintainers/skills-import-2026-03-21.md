# 技能导入 - 2026-03-21

此笔记记录了 2026-03-21 完成的技能导入和规范化工作。

## 摘要

- 从外部仓库导入新的技能目录
- 在需要时规范化导入技能的前置元数据
- 修复了未清晰映射到此仓库的导入的悬空链接
- 导入后重新生成派生工件

## 按来源导入的技能

### `anthropics/skills`

- `claude-api`
- `internal-comms`

注意:
- `docx`、`pdf`、`pptx` 和 `xlsx` 未作为单独目录重新导入，因为此仓库已经将这些别名作为符号链接暴露到 `*-official` 技能目录。

### `coreyhaines31/marketingskills`

- `ad-creative`
- `ai-seo`
- `churn-prevention`
- `cold-email`
- `content-strategy`
- `lead-magnets`
- `product-marketing-context`
- `revops`
- `sales-enablement`
- `site-architecture`

### `AgriciDaniel/claude-seo`

- `seo`
- `seo-competitor-pages`
- `seo-content`
- `seo-dataforseo`
- `seo-geo`
- `seo-hreflang`
- `seo-image-gen`
- `seo-images`
- `seo-page`
- `seo-plan`
- `seo-programmatic`
- `seo-schema`
- `seo-sitemap`
- `seo-technical`

### `kepano/obsidian-skills`

- `defuddle`
- `json-canvas`
- `obsidian-bases`
- `obsidian-cli`
- `obsidian-markdown`

## 未导入

在早期的比较工作中分析了这些仓库，但在这一批次中未从中导入新的主要技能:

- `obra/superpowers`
- `muratcankoylan/agent-skills-for-context-engineering`
- `PleasePrompto/notebooklm-skill`

## 验证

导入期间运行的命令:

```bash
npm run validate
npm run index
npm run catalog
```

结果:

- 规范化后验证通过
- 导入后生成的索引计数: `1304` 技能
