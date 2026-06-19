## v7.2.0 - 社区 PR 丰收与清理 (2026-03-08)

**合并了八个 PR：删除了 44 个损坏的技能，恢复了 zebbern 署名，中文文档，新技能（audit-skills、senior-frontend、shadcn、frontend-slides 更新、pakistan-payments-stack），以及可解释的自动分类。**

此版本清理了注册表（删除了 44 个仅包含"404: Not Found"的 SKILL.md 文件），将 `author: zebbern` 署名恢复到 29 个安全技能，并合并了社区贡献：简体中文文档、audit-skills、senior-frontend 和 shadcn 技能、frontend-slides 依赖项和格式化、pakistan-payments-stack 用于巴基斯坦 SaaS 支付，以及索引生成器中的可解释自动分类。捆绑包引用已更新以删除缺失的技能，以便引用验证通过。

### 新技能

- **audit-skills** — 审计安全技能 (PR #236)
- **senior-frontend** — React、Next.js、TypeScript、Tailwind (PR #233)
- **shadcn** — shadcn/ui 生态系统 (PR #233)
- **pakistan-payments-stack** — JazzCash、Easypaisa、PKR 计费 (PR #228)

### 改进

- **注册表清理**: 删除了 44 个损坏的"404: Not Found"技能文件 (PR #240)。
- **署名**: 为 29 个安全技能恢复了 `author: zebbern` (PR #238)。
- **文档**: 使用缺失的依赖项和格式更新了 frontend-slides (PR #234)；添加了简体中文文档 (PR #232)。
- **索引**: 在 `generate_index.py` 中实现可解释的自动分类 (PR #230)。
- **捆绑包**: 更新了 `data/bundles.json` 以删除对已删除或缺失技能的引用；`npm run validate:references` 通过。
- **注册表**: 现在跟踪 **1,232** 技能。

### 致谢

- **@munir-abbasi** 贡献中文文档 (PR #232)
- **@itsmeares** 贡献 senior-frontend、shadcn (PR #233)、frontend-slides 更新 (PR #234)
- **@zebbern** 贡献安全技能署名 (PR #238)
- PRs #228、#230、#236、#240 的贡献者

---

_升级: `git pull origin main` 或 `npx antigravity-awesome-skills`。_
