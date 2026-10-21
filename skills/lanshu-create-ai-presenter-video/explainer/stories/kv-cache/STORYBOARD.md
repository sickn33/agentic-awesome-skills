# KV cache — storyboard (shared by all nine styles)

45.0 s, 1920×1080. Narration 0.4–39.7 s (MiniMax speech-2.8-hd, `audio/narration.wav`), then a 4.7 s unvoiced recap.
Word times live in `story.json` (`lines[i].words`); get them with `story.at(line, unit)` / `story.phrase(line, text)`.
The table gives approximate times so you can plan; **code must use the story calls**.

Every style performs the same beats in its own language (V9: an analogy town; V8: chalk; V7: drawing sheet; V6: a
3D one-take; …). The teaching content of each beat is fixed; how it looks is yours.

## The protagonists

- **Tokens**: the model answers 「天空为什么是蓝的？」 one token at a time:
  `因为 | 空气 | 把 | 蓝光 | 散射 | 得 | 更 | 多` (8 tokens; use as many as the beat needs).
- **K and V**: every token yields a Key (used for matching — draw it as a key / tag / label) and a Value (the content
  that gets taken — a card / jar / block). A new token also has a Query **Q** (the question it asks).
- **The cache**: a store with two columns K | V, one row per token (drawer, ledger, shelf, table, buffer…).
- **显存 (GPU memory)**: a container with a fill level.

## Beats

| # | time (≈) | line · words | what must be understood on screen |
| --- | --- | --- | --- |
| 1 | 0.4–3.9 | L1 大模型回答问题，是一个 token 一个 token 往外蹦的 | the prompt 「天空为什么是蓝的？」 → the model emits tokens **one at a time** (pops on `token`@2.2, `token`@2.8, `蹦`@3.4). Note: 「自回归：每次只生成 1 个 token」 |
| 2 | 4.2–7.3 | L2 每蹦出一个新 token，都要回头看一遍前面所有的 token | a new token appears (`新`/`token`@4.8–5.0, highlighted); on `回头看`@5.5–5.7 it looks back: one link to each earlier token, sweeping left; on `所有`@6.35 every earlier token lights. Note: 「注意力：新 token 要和前面每一个比一比」 |
| 3 | 7.6–10.9 | L3 要是每次都把前面重新算一遍，就会越写越慢 | **without a cache**: step n recomputes the K/V of all n tokens → build the triangle row by row (row 1 = 1 cell … row 8 = 8 cells) from `每次`@7.8; on `重新算`@8.6 the repeated cells flash as waste (warn colour); on `越写越慢`@9.8–10.4 a per-step cost bar / timer grows step by step. Note: 「第 n 步要把前面 n 个全部重算」 |
| 4 | 11.4–16.5 | L4 KV cache 的办法是：每个 token 的 Key 和 Value 只算一次，存起来 | title moment `KV cache`@11.4 — the cache appears (two columns K \| V); on `Key`@13.7 each token yields its K, on `Value`@14.3 its V; on `只算一次`@14.7–15.4 a 「×1」 mark; on `存起来`@15.6–16.3 the K/V pairs slide into the cache rows. Note: 「K 用来匹配，V 是被取走的内容」 |
| 5 | 16.8–19.7 | L5 之后只算新来的那一个，再去缓存里查 | a new token arrives (`新`@17.35); **only it** computes (the others stay dark); its K,V append as a new row (`那一个`@17.8–18.05); on `再去缓存里查`@18.2–19.3 its **Q** scans the K column, relevance weights appear per row, and the matching V's flow back. Contrast with beat 3: the triangle collapses to one new cell per step (cost bar: 不缓存 n 份 / 缓存 1 份) |
| 6 | 20.3–23.9 | L6 代价是显存：缓存跟着上下文一起涨 | a 显存 container appears on `显存`@20.9; as the context grows (counter 1K → 2K → 3K → 4K) the cache rows / fill level grow **linearly** (`跟着上下文`@21.8–22.8); on `涨`@23.5 a visible bump. Note: 「显存占用 ∝ 上下文长度」 |
| 7 | 24.2–29.9 | L7 拿 Llama 2 7B 来说，每个 token 大约占 0.5 MB，4K 上下文就要 2 GB | badge `Llama 2 · 7B` (`Llama`@24.4); the per-token bill builds as a formula: `2 (K、V) × 32 层 × 4096 维 × 2 字节 (FP16)` → `≈ 0.5 MB` (`0.5`@26.9, `MB`@27.1); then `× 4096 个 token` on `4K`@27.7 → **`≈ 2 GB`** on `2 GB`@29.3–29.5, filling a 2 GB block of the 显存 container. Footnote: 「单条请求；并发越多，乘得越多」 |
| 8 | 30.5–35.5 | L8 所以才有 GQA 共用 K 和 V，PagedAttention 按页分配，还有量化压缩 | three quick fixes, ≈1.5 s each, each **shrinking the cache visibly**: **GQA**@31.3 — several query heads (Q1–Q4) share one K/V pair (`共用 K 和 V`@31.5–32.3), the cache shrinks ÷4 (note: 「Llama 3 8B：32 个头共用 8 份 K/V」); **PagedAttention**@32.8 — a long reserved block with empty waste becomes fixed-size pages filled on demand (`按页分配`@33.0–33.5); **量化**@34.4 — each K/V cell shrinks (`FP16 → INT8`), the fill level halves (`压缩`@34.9) |
| 9 | 36.0–39.7 | L9 一句话：用显存换速度，只算新的那一个 | the closing line, word-timed (`Kit.title`): a balance / trade between 显存 and 速度 on `用显存换速度`@36.7–37.7; on `只算新的那一个`@38.0–39.4 the spotlight is on the newest token |
| R | 40.3–45.0 | (no voice) | `Kit.recap(story)`: ONE composed frame — center 「KV cache · 用显存换速度」 + the four recap points from `story.recap.points` (问题 / 方法 / 代价 / 优化). Gentle motion only (slow push or drift) so it never freezes |

Chapters (chip, from `story.chapters`): 1 问题：越写越慢 (0–11.2) · 2 方法：存起来，只算新的 (11.2–20.1) ·
3 代价：显存 (20.1–30.3) · 4 优化：省显存 (30.3–35.8). No chip during the closing line and recap.

## Facts you may show (and nothing beyond them)

- Autoregressive: one token per step; each new token attends to all earlier tokens.
- Without a cache, step n recomputes the K/V of all earlier tokens (total work grows like a triangle, ~n²/2).
- With a KV cache: each token's K and V are computed once and stored; a new token computes only its own Q, K, V and
  attends over the cached K/V. Compute saved, memory spent.
- Memory grows linearly with context length (and with batch size).
- Llama 2 7B, FP16: 32 layers × hidden 4096 (32 heads × 128), K and V → 2 × 32 × 4096 × 2 B = 524,288 B ≈ 0.5 MB per token;
  4K (4096) tokens ≈ 2 GB, for one request.
- GQA: groups of query heads share one K/V head (e.g. Llama 3 8B: 32 query heads, 8 KV heads → cache ÷4).
- PagedAttention (vLLM): the cache is stored in fixed-size blocks allocated on demand, so little space is reserved or wasted.
- Quantization: store K/V in fewer bits (e.g. FP16 → INT8 halves it).
- Do **not** add speed-up numbers, latency figures, or other model sizes.
