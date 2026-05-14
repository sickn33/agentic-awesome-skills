# Jetski + Gemini 延迟技能加载器(示例)

此示例展示了一种将 **antigravity-awesome-skills** 与 Jetski/Cortex 风格代理集成的方法,使用基于 `@skill-id` 提及的**延迟加载**,而不是将每个 `SKILL.md` 连接到提示词中。

> 这**不是**生产就绪的库 - 它是一个最小参考,您可以适应自己的主机/代理实现。

---

## 此示例演示的内容

- 如何:
  - 在启动时加载全局清单 `data/skills_index.json`;
  - 扫描对话消息中的 `@skill-id` 模式;
  - 将这些 id 解析为清单中的条目;
  - 仅从磁盘读取相应的 `SKILL.md` 文件(延迟加载);
  - 构建提示词数组,包含:
    - 您的基本系统消息;
    - 每个选定技能一个系统消息;
    - 其余的轨迹。
- 如何通过 `maxSkillsPerTurn` 强制执行**每轮最大技能数**。
- 如何通过 `overflowBehavior` 选择在请求太多技能时是**截断还是报错**。

此模式避免了在安装 1,436+ 技能时的上下文溢出。

---

## 文件

- `loader.mjs`
  - 实现:
    - `loadSkillIndex(indexPath)`;
    - `resolveSkillsFromMessages(messages, index, maxSkills)`;
    - `loadSkillBodies(skillsRoot, metas)`;
    - `buildModelMessages({...})`。
- 另请参阅集成指南:
  - [`docs/integrations/jetski-cortex.md`](../../docs/integrations/jetski-cortex.md)

---

## 基本用法(伪代码)

```ts
import path from "path";
import {
  loadSkillIndex,
  buildModelMessages,
  Message,
} from "./loader.mjs";

const REPO_ROOT = "/path/to/antigravity-awesome-skills";
const SKILLS_ROOT = REPO_ROOT;
const INDEX_PATH = path.join(REPO_ROOT, "data", "skills_index.json");

// 1. 在代理启动时引导一次
const skillIndex = loadSkillIndex(INDEX_PATH);

// 2. 在调用模型之前,使用延迟加载的技能构建消息
async function runTurn(trajectory: Message[]) {
  const baseSystemMessages: Message[] = [
    {
      role: "system",
      content: "You are a helpful coding agent.",
    },
  ];

  const modelMessages = await buildModelMessages({
    baseSystemMessages,
    trajectory,
    skillIndex,
    skillsRoot: SKILLS_ROOT,
    maxSkillsPerTurn: 8,
    overflowBehavior: "error",
  });

  // 3. 将 `modelMessages` 传递给您的 Jetski/Cortex + Gemini 客户端
  // 例如 trajectoryChatConverter.convert(modelMessages)
}
```

使路径和模型调用适应您的环境。

---

## 重要说明

- **不要**遍历 `skills/*/SKILL.md` 并一次性加载所有内容。
- 此示例:
  - 假设技能与 `data/skills_index.json` 位于同一仓库根目录下;
  - 使用纯 Node.js ESM 模块,因此可以在没有 TypeScript 运行时的情况下直接导入。
- 在真实主机中:
  - 将 `buildModelMessages` 连接到您当前在 `TrajectoryChatConverter` 之前组装提示词的位置;
  - 如果您希望明确的用户可见失败而不是静默删除额外技能,请考虑 `overflowBehavior: "error"`;
  - 保持路径验证,以便清单条目无法逃脱您配置的技能根目录;
  - 如果您想要更严格的安全预算,请添加 token 计数/截断逻辑。
