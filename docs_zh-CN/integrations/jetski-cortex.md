---
title: Jetski/Cortex + Gemini 集成指南
description: "如何在不超出上下文窗口的情况下,在 Jetski/Cortex 中使用 antigravity-awesome-skills 的 1,436+ 技能。"
---

# Jetski/Cortex + Gemini:与 1,436+ 技能的安全集成

本指南展示如何将 `antigravity-awesome-skills` 仓库与基于 **Jetski/Cortex + Gemini** (或类似框架)的代理集成,**而不会超出模型的上下文窗口**。

在 Jetski/Cortex 中看到的典型错误是:

> `TrajectoryChatConverter: could not convert a single message before hitting truncation`

问题不在于技能本身,而在于**加载方式**。

---

## 1. 应避免的反模式

切勿:

- 在启动时读取**所有** `skills/*/SKILL.md` 目录;
- 将所有 `SKILL.md` 的内容连接到单个系统提示词中;
- 为**每次**请求重新注入整个库。

对于超过 1,436 个技能,这种方法在添加用户消息之前就填满了上下文窗口,导致截断错误。

---

## 2. 推荐模式

关键原则:

- **轻量级清单**: 使用 `data/skills_index.json` 来了解存在*哪些*技能,而无需加载完整文本。
- **延迟加载**: 仅针对对话中实际调用的技能(例如,当出现 `@skill-id` 时)读取 `SKILL.md`。
- **显式限制**: 对每轮加载的最大技能数/tokens数施加限制,并提供清晰的回退机制。
- **路径安全**: 在读取 `SKILL.md` 之前,验证清单中的路径是否保持在 `SKILLS_ROOT` 内。

推荐的流程是:

1. **引导**: 在代理启动时读取 `data/skills_index.json` 并构建 `id -> meta` 映射。
2. **消息解析**: 在调用模型之前,从用户/系统消息中提取所有 `@skill-id` 引用。
3. **解析**: 使用引导映射将找到的 id 映射到 `SkillMeta` 对象。
4. **延迟加载**: 仅针对这些 id 读取 `SKILL.md` 文件(最多可达可配置的最大值)。
5. **提示词构建**: 构建模型的系统消息,仅包含所选技能的定义。

---

## 3. `skills_index.json` 的结构

文件 `data/skills_index.json` 是一个对象数组,例如:

```json
{
  "id": "brainstorming",
  "path": "skills/brainstorming",
  "category": "planning",
  "name": "brainstorming",
  "description": "Use before any creative or constructive work.",
  "risk": "safe",
  "source": "official",
  "date_added": "2026-02-27"
}
```

关键字段:

- **`id`**: 在 `@id` 提及中使用的标识符(例如 `@brainstorming`)。
- **`path`**: 包含 `SKILL.md` 的目录(例如 `skills/brainstorming/`)。

要获取技能定义的路径:

- `fullPath = path.join(SKILLS_ROOT, meta.path, "SKILL.md")`。

> 注意: `SKILLS_ROOT` 是安装仓库的根目录(例如 `~/.agent/skills`)。

---

## 4. 集成伪代码 (TypeScript)

> 完整示例位于: [`docs/integrations/jetski-gemini-loader/`](../../docs/integrations/jetski-gemini-loader/)。

### 4.1. 基本类型

```ts
type SkillMeta = {
  id: string;
  path: string;
  name: string;
  description?: string;
  category?: string;
  risk?: string;
};
```

### 4.2. 引导:加载清单

```ts
function loadSkillIndex(indexPath: string): Map<string, SkillMeta> {
  const raw = fs.readFileSync(indexPath, "utf8");
  const arr = JSON.parse(raw) as SkillMeta[];
  const map = new Map<string, SkillMeta>();
  for (const meta of arr) {
    map.set(meta.id, meta);
  }
  return map;
}
```

### 4.3. 解析消息以查找 `@skill-id`

```ts
const SKILL_ID_REGEX = /@([a-zA-Z0-9-_./]+)/g;

function resolveSkillsFromMessages(
  messages: { role: string; content: string }[],
  index: Map<string, SkillMeta>,
  maxSkills: number
): SkillMeta[] {
  const found = new Set<string>();

  for (const msg of messages) {
    let match: RegExpExecArray | null;
    while ((match = SKILL_ID_REGEX.exec(msg.content)) !== null) {
      const id = match[1];
      if (index.has(id)) {
        found.add(id);
      }
    }
  }

  const metas: SkillMeta[] = [];
  for (const id of found) {
    const meta = index.get(id);
    if (meta) metas.push(meta);
    if (metas.length >= maxSkills) break;
  }

  return metas;
}
```

### 4.4. `SKILL.md` 文件的延迟加载

```ts
async function loadSkillBodies(
  skillsRoot: string,
  metas: SkillMeta[]
): Promise<string[]> {
  const bodies: string[] = [];

  for (const meta of metas) {
    const fullPath = path.join(skillsRoot, meta.path, "SKILL.md");
    const text = await fs.promises.readFile(fullPath, "utf8");
    bodies.push(text);
  }

  return bodies;
}
```

### 4.5. 构建 Jetski/Cortex 提示词

在 `TrajectoryChatConverter` 之前的预处理阶段的伪代码:

```ts
async function buildModelMessages(
  baseSystemMessages: { role: "system"; content: string }[],
  trajectory: { role: "user" | "assistant" | "system"; content: string }[],
  skillIndex: Map<string, SkillMeta>,
  skillsRoot: string,
  maxSkillsPerTurn: number,
  overflowBehavior: "truncate" | "error" = "truncate"
): Promise<{ role: string; content: string }[]> {
  const referencedSkills = resolveSkillsFromMessages(
    trajectory,
    skillIndex,
    Number.MAX_SAFE_INTEGER
  );
  if (
    overflowBehavior === "error" &&
    referencedSkills.length > maxSkillsPerTurn
  ) {
    throw new Error(
      `Too many skills requested in a single turn. Reduce @skill-id usage to ${maxSkillsPerTurn} or fewer.`
    );
  }

  const selectedMetas = resolveSkillsFromMessages(
    trajectory,
    skillIndex,
    maxSkillsPerTurn
  );

  const skillBodies = await loadSkillBodies(skillsRoot, selectedMetas);

  const skillMessages = skillBodies.map((body) => ({
    role: "system" as const,
    content: body,
  }));

  return [...baseSystemMessages, ...skillMessages, ...trajectory];
}
```

> 建议: 添加 token 估算以在上下文窗口接近限制时截断或总结 `SKILL.md`。
> 此仓库的参考加载器还支持显式回退: `overflowBehavior: "error"`。

---

## 5. 处理上下文溢出

为避免用户难以理解的错误,请设置:

- **安全阈值**(例如上下文窗口的 70-80%);
- **每轮最大技能数限制**(例如 5-10)。

超过阈值时的策略:

- 减少包含的技能数量(例如,根据最近使用或优先级);或
- 向用户返回明确的错误,例如:

> "在此轮中请求了太多技能。减少消息中的 `@skill-id` 数量或将其分为多个步骤。"

---

## 6. 推荐的测试场景

- **场景 1 - 简单消息 ("hi")**
  - 没有 `@skill-id` → 不加载 `SKILL.md` → 提示词保持较小 → 无错误。
- **场景 2 - 少量技能**
  - 包含 1-2 个 `@skill-id` 的消息 → 仅加载相关的 `SKILL.md` → 无溢出。
- **场景 3 - 大量技能**
  - 包含许多 `@skill-id` 的消息 → 激活 `maxSkillsPerTurn` 限制或 token 检查 → 无静默溢出。

---

## 7. 技能子集和捆绑包

进一步控制:

- 将不需要的技能移至 `skills/.disabled/` 以在某些环境中排除它们;
- 使用 [`docs/users/bundles.md`](../users/bundles.md) 中描述的**捆绑包**仅加载主题组。

## 8. 如果您已经在崩溃循环中,在 Windows 上恢复

如果主机在截断错误后继续重新打开相同的损坏轨迹:

- 删除有问题的技能或包;
- 删除 Antigravity 使用的本地存储 / 会话存储 / IndexedDB;
- 清空 `%TEMP%`;
- 使用延迟加载和显式限制重新启动。

完整指南:

- [`docs/users/windows-truncation-recovery.md`](../users/windows-truncation-recovery.md)

为防止问题再次出现:

- 当您更喜欢显式失败时,保持 `overflowBehavior: "error"`;
- 继续验证解析的路径是否保持在 `skillsRoot` 内。

---

## 9. 总结

- 切勿将所有 `SKILL.md` 连接到单个提示词中。
- 使用 `data/skills_index.json` 作为轻量级清单。
- 基于 `@skill-id` **按需**加载技能。
- 设置明确的限制(每轮最大技能数、token 阈值)。

遵循此模式,Jetski/Cortex + Gemini 可以安全、可扩展且与现代模型的上下文窗口兼容的方式使用整个 `antigravity-awesome-skills` 库。
