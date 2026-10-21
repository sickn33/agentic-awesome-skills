# Choosing an explainer style · 选择讲解风格

Twelve styles, one contract: every style turns a `story.json` into a film with word-timed captions, a chapter chip, a
performed closing line and a one-frame recap. The first nine are **visual styles**: any script works in any of them,
they differ in how the ideas are acted out. The last three are **narrative styles**: the look comes with a way of
telling (a derivation, an investigation, a life-scene sitcom), with suggested arcs to adapt to the topic. All are
16:9, 1920×1080. The picture below is the same moment of the bundled KV cache film in the nine visual styles; the
three narrative styles have their own picture further down.

十二种风格共用一套接口：讲稿（`story.json`）在任何风格里都有逐字字幕、章节条、结尾金句和一帧复习图。前九种是**画风**，同一份讲稿换哪种都行，区别在于用什么画面把内容“演”出来；后三种是**讲法**，画面自带一种讲述方式（推演、查案、生活小剧场），写稿时可参考并调整它的叙事结构。全部为横屏 16:9（1920×1080）。下图是同一支 KV cache 讲解片在九种画风里的同一时刻；三种讲法的对比图在后面。

![The nine styles at the same moment of the KV cache film](gallery/nine-styles-kv-cache.jpg)

| key | 名称 | the look · 画面 | best for · 适合 | 3D |
| --- | --- | --- | --- | --- |
| `v1-editorial` | V1 设计师「留白」 | warm paper, ink, one vermilion accent, data blocks, page turns · 暖白纸、墨色、一抹朱红，大留白 | serious, premium explainers; business and product topics · 严肃、高级感、商业与产品 | no |
| `v2-signal` | V2 科技感「信号」 | dark HUD, acid-lime accent, labels decode in, packets on wires, glitch cuts · 暗色仪表盘、荧光绿、数据包流动 | AI / infra / networking, anything “system-like” · AI、基础设施、网络、系统类 | no |
| `v3-notebook` | V3 手写衬线「手帐」 | grid paper, a live pen writes every word, sticky notes, eraser · 方格纸上真笔书写、便利贴、橡皮擦 | teaching step by step, derivations, study notes · 一步步推导、学习笔记、教学 | no |
| `v4-paper` | V4 纸艺「立体书」 | kraft pop-up book, pieces fold up with soft shadows, parallax · 牛皮纸立体书、折起的纸片、视差 | warm stories, processes, consumer topics · 有温度的故事、流程、大众话题 | no |
| `v5-comic` | V5 波普漫画「爆款」 | halftone comic page, stickers slam on, bursts and sound words · 半调网点漫画、贴纸拍入、爆炸字 | punchy short videos, hot takes, myth vs fact · 节奏快的短视频、观点、辟谣 | no |
| `v6-cinematic` | V6 电影感 3D「一镜到底」 | Three.js one-take in a graphite studio, porcelain props, bloom · 一镜到底的 3D 影棚、瓷质道具、辉光 | flagship pieces, launches, big-picture concepts · 旗舰内容、发布、宏观概念 | yes |
| `v7-drafting` | V7 图纸与注脚 | one black drawing sheet, leader lines, ghost-letter karaoke, true footnotes · 黑色图纸、引线、注脚、卡拉OK式大字 | technical deep dives for practitioners · 面向从业者的技术深挖 | no |
| `v8-chalkboard` | V8 黑板报 | a wooden blackboard written live in chalk, felt eraser, chalk mind map · 木框黑板、粉笔现写、板擦、粉笔脑图复习 | classroom feel, beginners, memory-friendly recaps · 课堂感、入门、便于记忆 | no |
| `v9-clay` | V9 黏土小城「一仓」 | an isometric plasticine town, every analogy labelled with its real term · 等距黏土小城，比喻 + 真实术语标签 | analogies for non-experts, cute and friendly · 用比喻讲给外行、可爱亲和 | yes |

### The three narrative styles · 三种讲法风格

Each of these pairs a look with a suggested arc. Adapt the chapters to the explanation; the starter and KIT.md show
how scenes are performed. They were built from the same KV cache topic told three ways (bundled stories
`stories/kv-cache-reasoning`, `kv-cache-casefile`, `kv-cache-sitcom`; example projects in `examples/kv-cache/`).

这三种风格各自带一条可参考的讲述结构，章节数量、顺序和生活场景都可按话题调整。它们由同一个话题（KV cache）的三种讲法打磨而来，仓库附有三份讲稿和示范工程。

![The same KV cache topic told in the three narrative styles](gallery/three-narrative-styles-kv-cache.jpg)

| key | 名称 | the arc · 讲法 | the look · 画面 | best for · 适合 | 3D |
| --- | --- | --- | --- | --- | --- |
| `v10-reasoning` | V10 动态图解「推演」 | a question → the figure built step by step → the pattern it reveals → the result and its cost · 一个问题 → 图形一步步搭出来 → 看出规律 → 结论与代价 | an ink-blue canvas; formulas and geometry bound by colour (each symbol the colour of its shape), the camera gliding across one derivation · 深蓝画布，公式和图形用颜色绑在一起，镜头在一张推导图上移动 | principles, algorithms, maths and physics · 原理、算法、数学、物理 | no |
| `v11-casefile` | V11 调查复盘「案卷」 | an anomaly and suspects → evidence → the cause proven (wrong suspects ruled out) → the fix → the case closed with cost and lesson · 异常与嫌疑 → 取证 → 查明（排除错的、证实对的）→ 修复 → 结案 | a cork evidence board: pinned exhibits, red string, stamps, a timeline tape, a typed report · 软木调查板、证物、红线、印章、时间线、结案报告 | outages, incidents, post-mortems, myth-busting with sources · 故障复盘、安全事件、事故、有出处的辟谣 | no |
| `v12-sitcom` | V12 生活场景「小剧场」 | a character meets a misconception → a bill, a queue or an object comparison shows the cause → the new way → the analogy mapped to the real term in one sentence · 角色遇到误区 → 账单 / 队列 / 实物对照找到原因 → 新做法 → 比喻对上真名，一句话收束 | a flat, warm sitcom set (shop counter, queue, receipts), rounded characters, speech bubbles, analogy → term chips · 暖色平面情景剧场景、圆润角色、对话气泡、比喻 → 真名标签 | abstract terms for newcomers · 把抽象术语讲给新人 | no |

## 风格菜单 · the menu to show a user

Users rarely know the styles before they see them. Send this list (in the user's language) together with the two
gallery images above (the nine visual styles, and the three narrative styles), and mark the two or three that fit their
topic:

> 一共十二种风格，先看九种画风（第一张图是同一句讲解在九种画风里的样子）：
> 1. **留白**：暖白纸、墨色、一抹朱红，克制高级，适合商业、产品、严肃话题
> 2. **信号**：暗色仪表盘、荧光绿数据流，适合 AI、系统、网络类
> 3. **手帐**：方格纸上真笔现写、便利贴，适合一步步推导、学习笔记
> 4. **立体书**：牛皮纸立体书、纸片折起，温暖，适合讲故事、讲流程
> 5. **波普漫画**：网点漫画、贴纸拍入、爆炸字，节奏快，适合观点、辟谣
> 6. **一镜到底**：3D 影棚一镜到底，有电影感，适合大概念、重磅内容
> 7. **图纸与注脚**：黑色工程图纸、引线和注脚，硬核，适合技术深挖
> 8. **黑板报**：粉笔现写、结尾一张粉笔脑图，课堂感，适合入门、便于记忆
> 9. **黏土小城**：萌系黏土小镇，用比喻讲概念并标出真实术语，适合讲给小白
>
> 另外三种是“讲法”，画面和讲稿结构一起变（第二张图是同一个难题用三种讲法讲）：
> 10. **推演**：深色画布上，图形和公式一步步搭出来，从一个问题推出结论，适合原理、算法、数学
> 11. **案卷**：软木调查板、证物、红线、印章，从一起异常查到结案，适合故障复盘、安全事件、辟谣
> 12. **小剧场**：生活场景小剧场，角色先遇到误区，再用账单、队列或实物对照找到原因，一句话收束，适合把抽象术语讲给新人
>
> 拿不准的话，我可以前九种都先出一版草稿，你看完再选；后三种要按它的讲法写稿，选中后我按那种讲法写一版。

How to choose · 怎么选:

- Unsure? Build all nine as drafts (`tools/new_topic.sh <story>`, a few minutes, no extra API calls once the audio is
  locked, or with `--dry`) and compare them with
  `tools/still_grid.py` — then perform only the one you pick. 拿不准就先九种都出初稿对比，再只把选中的那一种做成成片。
- A narrative style (V10–V12) is chosen together with the way the story is told: settle it before the script is
  written, then adapt its suggested arc (table below). Any story still runs in any starter; a finished film needs
  scenes and narration suited to its chosen approach. 讲法风格要在写稿前定下来，再按话题调整参考结构；任意讲稿都能在模板里运行，成片时要让叙事和画面配合。
- The 3D styles (V6, V9) render slower and need a GPU-capable Chrome for snapshots; the others are pure DOM.
  3D 风格渲染更慢；其余十种是纯网页元素。
- The styles are 16:9 only for now. If the user asks for vertical (抖音 / 视频号 / 小红书), say so and let them choose:
  a 16:9 styled film, or the presenter route at 9:16 (needs an authorized portrait). Do not switch routes silently.
  目前只有横屏；用户要竖屏时说明限制，让用户在“横屏风格片”和“竖屏数字人（需要授权照片）”之间选，不要擅自换路线。

Common words → styles · 常见说法对应的风格:

| 用户说 | 推荐 |
| --- | --- |
| 手绘 / 手写 / 笔记 / 推导 | V3 手帐（或 V8 黑板报） |
| 黑板 / 粉笔 / 课堂 / 入门 | V8 黑板报 |
| 可爱 / 黏土 / 萌 / 讲给小白 | V9 黏土小城（或 V4 立体书） |
| 科技感 / 赛博 / 数据 / 系统 | V2 信号 |
| 高级 / 极简 / 商务 / 杂志 | V1 留白 |
| 电影感 / 3D / 大片 / 发布 | V6 一镜到底 |
| 漫画 / 爆款 / 有梗 / 辟谣 | V5 波普漫画 |
| 硬核 / 图纸 / 工程 / 技术深挖 | V7 图纸与注脚 |
| 温暖 / 故事 / 纸艺 / 流程 | V4 立体书 |
| 推导 / 原理 / 公式 / 数学 / 算法 | V10 推演（或 V3 手帐） |
| 复盘 / 事故 / 故障 / 排查 / 调查 / 安全事件 | V11 案卷 |
| 新人 / 生活例子 / 情景剧 / 打比方 / 讲给新同事 | V12 小剧场（或 V9 黏土小城） |

## Writing the narration for the chosen style · 按风格写稿

Pick the style before the script is locked: each style performs a different kind of sentence well, so write — and
voice — the narration for it. Set the voice speed with `speed:` in `script.md` and the recap with `length:` under
`## recap` (3.5–4.7 s all render cleanly; the default is 4.7). The style's `STARTER.md` shows what a line turns into on
screen.

选定风格后再定稿：每种风格擅长演绎的句子不一样，讲稿和配音要按风格来写。下面的结构、句长和语速供参考，可按话题调整或混用。语速写在 `script.md` 的 `speed:`，复习页时长写在
`## recap` 下的 `length:`（3.5–4.7 秒都能完整播完，默认 4.7）。

| 风格 | 讲稿怎么写 | 句子 | 语速 `speed` | 复习页 `length` |
| --- | --- | --- | --- | --- |
| V1 留白 | 冷静、准确，像杂志导语；每句落一个具体对象或数字（比例、计数、对比） | 中短句，少用口语和感叹 | 1.05 | 4–4.5 s |
| V2 信号 | 把概念讲成一个系统：谁输入、经过什么、输出什么；多用“传、查、算、存”这类动词，数字带单位 | 短句，一句一个动作 | 1.1 | 3.5–4 s |
| V3 手帐 | 一步步推导：“先……再……所以……”；适合列步骤、写公式、做对比表 | 中句，节奏稍慢，给笔留出书写时间 | 1.0–1.05 | 4.5 s |
| V4 立体书 | 讲成一个小故事或一条流程，每个环节是一个能“立起来”的东西；可以用“就像……”打比方 | 中句，语气温和 | 1.05 | 4 s |
| V5 波普漫画 | 先抛问题或反常识的结论，再揭晓；适合辟谣、“其实……”、拟声词；一句一个梗 | 很短，尽量每句 15 字以内 | 1.15 | 3.5 s |
| V6 一镜到底 | 句子少而重，适合讲大概念和揭晓时刻；前面铺垫，最后一句落点 | 中长句，句间留出停顿 | 1.0–1.05 | 4 s |
| V7 图纸与注脚 | 用准确术语，数字都带单位，适合补一条行内人才知道的真注脚；一张图讲 1–2 句 | 中句，信息密度高 | 1.1 | 4 s |
| V8 黑板报 | 课堂口吻：“我们来看……”“记住……”；分 3–5 个板块，每块一个要点，结尾总结成一句 | 中句，像老师讲课 | 1.05–1.1 | 4–4.7 s（要点多时取长） |
| V9 黏土小城 | 全程一个比喻世界：每个概念对应一个实物，说出比喻后紧接真实术语（“就像仓库……这就是缓存”） | 短中句，亲切 | 1.1 | 4 s |
| V10 推演 | 一个问题开场 → 一步步推，每句给图形加一笔 → 点出图里看出的规律 → 结论 + 代价；数字要能在图上数出来 | 中句：“那么……”“画出来……”“其中……” | 1.05 | 4.5 s |
| V11 案卷 | 立案（反常现象 + 嫌疑）→ 取证（一条证据一句）→ 查明（排除错的、证实对的）→ 修复 → 结案（原因 / 修复 / 代价 / 教训）；事实要有出处，示意数字标「示意」 | 中句，冷静的调查口吻 | 1.05 | 4.5 s |
| V12 小剧场 | 一个生活场景、一个角色：误区 → 用账单、队列或实物对照找到原因 → 新做法 → 比喻对上真名 → 一句话收束 | 短中句，口语、有画面 | 1.05 | 4.5 s |

Every style's details — tokens, components, idioms, do and don't — are in `kits/<style>/KIT.md` and
`kits/<style>/starter/STARTER.md`; the finished reference films are in `examples/kv-cache/<style>/`.
