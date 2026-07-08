# Suite Reasoning Outline

默认输出：

```text
调度提纲
- 任务类型：
- 输出模式与角色：
- 工作流：
- 必读 skill：
- 按需读取：
- 连续联读包：
- 读态胶囊：
- 源锚点检查：
- 主题敏感度：
- 正文声口：
- 文章类型：
- 输出档位：
- 不读取：
- 质量闸：
```

## 字段说明

- `任务类型`：用普通话说明用户真正要的交付物。
- `输出模式与角色`：写 `analysis_mode + role`，例如 `客观 + 学术专家`；若用户未选择，必须先展示模式与角色选择器。
- `工作流`：写 skill id 链路，例如 `crossframe -> crossframe-public -> crossframe-essay -> crossframe-review`。
- `必读 skill`：本次必须读取的 skill。
- `按需读取`：只列触发了条件的概念卡、专项协议或模板。
- `连续联读包`：只列 `continuity-bundles.md` 中本次触发的包名；未触发时写“未触发”。
- `读态胶囊`：写“由 crossframe 生成 / 复用已有胶囊 / 不需要”。suite 不生成胶囊。
- `源锚点检查`：写“需要 / 不需要”，需要时说明中心命题、机制候选、高风险概念或行动边界要回指胶囊。
- `主题敏感度`：写 `low / normal / vulnerable / high-stakes`；若为 `vulnerable` 或 `high-stakes`，说明先承接人或先审计的保护动作。
- `正文声口`：按角色和 `topic_sensitivity` 写“中性分析体 / 中性决定体 / 答复体 / 评论体”；显式要求编辑口吻时说明覆盖原因。
- `文章类型`：只有文章层开启时填写。用户未显式指定时，先生成结构洞察底稿，再完整展示文章类型选择器的九个选项，并给出推荐项和推荐理由；用户回复“默认/自动/都行”后写推荐项结果。
- `输出档位`：suite 默认写 `full-visible-v5-longform / 5.0混合长文`；只有用户显式要求短答、表格、清单、纯诊断或不要文章时写对应交付物。
- `不读取`：列 1-3 个容易误触发但本次不需要的 skill，防止全量加载。
- `质量闸`：完整评审、轻量自检或无需评审，并写原因。

只要用户没有显式关闭文章层，`输出档位` 默认写 `full-visible-v5-longform / 5.0混合长文`，`工作流` 默认在必要专项 skill 后追加 `crossframe-essay -> crossframe-review`。调度说明要保留顺序：v5-read-state-capsule -> 源锚点完整性检查 -> 结构洞察底稿 -> 文章类型选择器 -> 写作技法读取 -> 文章正文 -> 质量闸。

批量压测或控制器汇总时，不得把“文件级流程完整”写成总“通过”。必须拆开：

```text
- structural_pass：标题、底稿、正文、胶囊、来源台账、技法、质量闸是否存在
- substantive_pass：中心命题、来源台账、胶囊锚点、技法落地和正文是否互相支撑
- publish_boundary：内部压测 / 待核验分析 / 可发布需补证 / 不得用于强判断
```

若控制器只做结构 smoke check，只能写 `structural_pass=true`，不能写 `substantive_pass=true` 或笼统“全部通过”。

## 轻量版

当用户只要最终结果：

```text
本次按 `crossframe -> [needed sibling skills] -> crossframe-essay -> crossframe-review` 处理，输出档位为 `full-visible-v5-longform`：先完成必要专项判断，再给完整可见底稿和完整长文正文，最后过质量闸。
```

## 禁止写法

不要写：

```text
我会读取全部 CrossFrame skills 以确保完整。
```

应写：

```text
本次不读取 `crossframe-casebook` 和 `crossframe-teach`，因为目标是公共评论文章，不是案例沉淀或概念教学。
```
