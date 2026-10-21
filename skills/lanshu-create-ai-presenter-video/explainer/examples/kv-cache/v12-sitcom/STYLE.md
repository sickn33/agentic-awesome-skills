# V12「小剧场」· KV cache 奶茶店版

同一套小剧场 kit（`kits/v12-sitcom`），讲 KV cache。一条奶茶店长景：四个布景一字排开，镜头按章节横移；新店员小林先认定「是我手太慢」，
店长用出单记录和黑板上的台阶图找到真正的原因，再递给他一个小本本；最后隔壁的大模型做同样的事，比喻对上真名。复习是谢幕：幕布合上再拉开，
黑板 + 四张场记卡 + 三位演员鞠躬。用 `tools/new_film.sh v12-sitcom kv-cache-sitcom <dir>` 从 starter 生成，只写了 `beats.js` 和 `tools/sfx_beats.py`。

| 比喻（画面） | 真名（配音） |
| --- | --- |
| 客人越多、出单越慢，小林以为是自己手慢（红色「误区」） | 不加缓存时，生成越往后越慢 |
| 第 8 位客人的出单记录：前 7 张单都标「又核一遍」 | 第 n 步把前面所有 token 的 K、V 重算一遍 |
| 黑板台阶图：第 n 位客人核 n 张（红 = 重核，黄 = 新单），共 36 张、28 张是重核 | 不缓存时 1+2+…+8 = 36 次，其中 28 次是重复（story facts） |
| 一堆重核的小票 vs 一个小本本；每张单只记一次 | KV cache：每个 token 的 K、V 只算一次、存起来 |
| 单号拿来对，内容拿来取 | K 拿来匹配，V 是被取走的内容 |
| 新客人只写自己这一张，前面的翻本子查 | 新 token 只算自己的 K、V，其余查缓存 |
| 大模型写出 token 1–5，K / V 各一枚飞进本子；四枚名牌：一张单 = token、单号 = K、单子内容 = V、小本本 = KV cache | 大模型自回归生成；Key、Value 记进 KV cache |
| token 6–9 接着写，本子越来越厚，内存条一格格变红 | 代价：KV cache 随长度增长，占显存（例：Llama 2 7B 每个 token 约 0.5 MiB，story facts） |
| 结尾左右对照：小林的小本本 / 大模型的 KV cache，只写新来的一张 / 只算新 token，翻本子查 / 查缓存 | 之后只算新来的那一个，再去缓存里查 |

菜单价格、单子内容（珍珠奶茶等）只是布景，不是数据。声音：`tools/sfx.py`（starter 的场景音）+ `tools/sfx_beats.py`（逐拍音效），
都读 `lib/story.js` 的词时间。

构建（故事是 `stories/kv-cache-sitcom`，自带 MiniMax 配音）：

```bash
X=<skill>/explainer
cp -R "$X/examples/kv-cache/v12-sitcom" ./kv-v12-sitcom
bash "$X/tools/sync.sh" ./kv-v12-sitcom v12-sitcom kv-cache-sitcom && python3 "$X/tools/stamp.py" ./kv-v12-sitcom
python3 "$X/tools/fonts.py" ./kv-v12-sitcom
(cd ./kv-v12-sitcom && bash tools/sfx.sh && npx --yes hyperframes@0.8.81 preview)
```
