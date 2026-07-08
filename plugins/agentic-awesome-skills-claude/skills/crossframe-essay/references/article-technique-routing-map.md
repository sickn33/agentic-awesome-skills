# 文章类型与写作技法路由表

本文件把文章类型映射到《文章写作技法》操作卡片。每次默认最多读取 3 个核心技法 + 2 个辅助技法。技法只改变表达结构，不改变 CrossFrame 的事实边界、判断档位、连续联读包、证据责任和声口规则。

## 读取规则

1. 先完成结构洞察底稿，并在底稿后确认 `article_type`。
2. 用户选择文章类型或采用推荐项后，读取该类型的 3 个核心技法。
3. 若题材需要，再从该文章类型的“辅助候选”或“按问题追加”中选 0-2 个辅助技法。
4. 任一成文任务读取技法文件总数不得超过 5 个。
5. 读取单张技法卡时，必须看 `好句类型`、`段落前后关系`、`文章类型微用法` 和 `失败示例（转述）`，不能只读定义或操作步骤。
6. 本路由表的候选池必须覆盖 50 个技法文件；覆盖不等于每次全读，单次仍按上限读取。
7. 技法选择必须写入结构洞察底稿的“文章类型与写作技法选择”小节；该小节在用户选择后补全。

## 技法落地顺序

1. 先定主心骨：从底稿中心命题提炼一句判断或一个关键词，禁止为了漂亮句子改变判断档位。
2. 再定入口技法：决定首段用具体场景、细节、类比、事件或问题进入，不用术语墙开头。
3. 再定结构技法：决定 3-5 个递进段如何串联材料、机制、责任链、证据边界和反向条件。
4. 再定批判技法：只批评行为、论据根基、责任转嫁或程序失灵，不把批判写成人格审判或动员口号。
5. 最后定结尾技法：收束到余味、边界或未竟问题，不喊口号，不把开放断言写成最终判决。
6. 对每个被读取技法，先把 `好句类型` 转成具体句子任务，再把 `段落前后关系` 转成段落位置，最后用 `文章类型微用法` 决定该文章类型下的轻重。
7. 技法执行摘要必须写入底稿，明确每个被读取技法负责首段、递进、批判、边界或结尾中的哪一类段落动作。
8. 写正文前用每张卡的 `失败示例（转述）` 反查一次：凡是技法制造新事实、越过来源台账、抬高判断档位、用隐喻证明现实因果或让点睛句先于证据，都必须删改或降档。
9. 写正文后必须补“技法落地证据表”。每个技法都要对应一个正文短摘或段落编号；没有短摘时，只能说“读取了技法”，不能说“技法已落地”。

## 技法落地证据表

```markdown
| 技法 | 负责段落动作 | 正文对应短摘/段落编号 | 它不能证明什么 | 越界反查 |
| --- | --- | --- | --- | --- |
|  |  |  |  |  |
```

- `负责段落动作` 只能写入口、递进、结构转折、批判/反驳、边界或结尾，不写“增强文采”这种泛化描述。
- `正文对应短摘/段落编号` 必须能让 review 找到实际落点。
- `它不能证明什么` 必须写清技法不能新增事实、不能证明因果、不能抬高判断档位、不能冒充来源。
- `越界反查` 至少回答：这句是否越过胶囊、来源台账或源锚点；若越界，处理为删除、降档或表达转译。

## 弱类型加严规则

- 组织复盘/案例分析：必须有一个具体高成本事实入口；修复建议不能只以清单替代结尾；技法证据表必须覆盖责任链、授权链或反馈写回段。
- 趋势推演：凡使用“更可能、主流、长期存在、必然”等排序词，必须标明依据是来源事实、机制推断还是开放断言。
- 中性分析长文：第一或第二段必须有具体人、具体流程、具体错误或具体材料之一，避免直接进入制度抽象。
- 公共评论：统计数字只能作为入口或待检验证据，不能直接当治理有效证明；点睛句必须回指来源台账和降档边界。
- 答复体文章：现实关系建议若涉及创伤、控制、无法退出或低权力主体，必须回扫 `v5-love-trapped-trauma-pack`、`v5-low-power-protection-pack` 或显式降档为安全提醒。

## 文章类型默认技法

| 文章类型 | 核心技法 | 辅助候选（按题最多选 2 个） |
| --- | --- | --- |
| 答复体文章 | `point-spirit`, `scene-emotion`, `final-reveal` | `direct-emotion`, `meaning-beyond-words`, `event-association`, `sparse-outline`, `less-is-more`, `stream-consciousness` |
| 公共评论文章 | `finishing-touch`, `layered-argument`, `positive-negative-contrast` | `remove-foundation`, `meaning-beyond-words`, `praise-blame-interlace`, `split-wood-reasoning`, `virtual-to-real` |
| 思想/概念阐释文章 | `one-word-spine`, `object-reason`, `analogical-reasoning` | `final-reveal`, `ancient-modern-global`, `clouds-moon`, `virtual-to-real`, `form-by-object` |
| 组织复盘/修复文章 | `thread-beads`, `point-surface`, `layered-argument` | `guest-host-contrast`, `retreat-to-advance`, `vertical-narration`, `narration-commentary`, `motion-for-stillness` |
| 案例叙事/案例分析文章 | `one-stone-many-birds`, `point-surface`, `thread-beads` | `hide-before-reveal`, `fine-carving`, `vertical-narration`, `coincidence-structure`, `personified-object`, `moving-viewpoint` |
| 论辩/反驳文章 | `retreat-to-advance`, `remove-foundation`, `positive-negative-contrast` | `feint-attack`, `strongest-counterposition`, `split-wood-reasoning`, `release-to-capture`, `praise-blame-interlace` |
| 读书互读/吸收文章 | `ancient-modern-global`, `guest-host-contrast`, `layered-argument` | `object-reason`, `meaning-beyond-words`, `double-bridge`, `event-association`, `sparse-outline` |
| 趋势推演文章 | `multi-edge-extension`, `same-different`, `winding-path` | `suspense`, `final-reveal`, `life-from-dead`, `surprise-victory`, `fixed-point-changing-scenes` |
| 中性分析长文 | `one-word-spine`, `layered-argument`, `point-surface` | `finishing-touch`, `meaning-beyond-words`, `less-is-more`, `clouds-moon`, `fixed-point-changing-scenes` |

`strongest-counterposition` 不是独立技法文件；它由 CrossFrame debate/review 规则提供。若路由选中它，不计入写作技法文件上限。

## 按问题追加

- 开篇抽象、读者难进入：追加 `point-spirit`、`object-reason` 或 `small-water-waves`。
- 材料多而散：追加 `thread-beads` 或 `stars-moon`。
- 判断太平：追加 `finishing-touch`、`language-momentum` 或 `raise-high-drop-heavy`。
- 需要含蓄和余味：追加 `meaning-beyond-words`、`symbolic-meaning` 或 `final-reveal`。
- 需要反驳：追加 `remove-foundation`、`retreat-to-advance` 或 `feint-attack`。
- 需要复杂关系：追加 `point-surface`、`one-stone-many-birds` 或 `same-different`。
- 需要按时间线复原过程：追加 `vertical-narration` 或 `narration-commentary`。
- 需要双线互读、两套材料互照：追加 `double-bridge`。
- 需要由事件引出上位判断：追加 `event-association`。
- 需要少量材料承载更多意味：追加 `less-is-more`、`clouds-moon` 或 `virtual-to-real`。
- 需要把抽象结构落实到对象形态：追加 `form-by-object` 或 `personified-object`。
- 需要观察视角变化：追加 `moving-viewpoint` 或 `fixed-point-changing-scenes`。
- 需要从停滞、僵局或绝境中找转机：追加 `life-from-dead`。
- 需要出人意料地破题：追加 `surprise-victory` 或 `release-to-capture`。
- 需要巧合、呼应或结构回环：追加 `coincidence-structure`。
- 需要抑扬转换，既肯定又批评：追加 `praise-blame-interlace`。
- 需要把复杂道理劈开讲透：追加 `split-wood-reasoning`。
- 需要心理流或内在摇摆进入正文：追加 `stream-consciousness`。
- 需要用动态衬出稳定结构或安静状态：追加 `motion-for-stillness`。
