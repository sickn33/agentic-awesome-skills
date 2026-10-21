---
title: KV cache
subtitle: 案卷：为什么大模型越写越慢
voice: Chinese (Mandarin)_Reliable_Executive
speed: 1.05
pronounce: 重算/(chong2)(suan4); 重核/(chong2)(he2); 重复/(chong2)(fu4); 重新/(chong2)(xin1)
---

## case | 立案：越写越慢
异常：同一个模型、同一台机器，回答写得越长，后面每个字就出得越慢。
嫌疑有三个：机器太旧，模型累了，还是每一步都在做重复的事？
> 案卷封面 + 立案章；证物 A：耗时曲线一路往上（示意）
> 嫌疑名单三条，第三条打问号

## evidence | 取证：每一步算了什么
查过程：每出一个新 token，模型都要回看前面所有的 token。
再看现场：到了第 8 步，前面 7 个 token 的 Key 和 Value，又被重新算了一遍。
> 证物 B：现场照片，八个 token，圈出新来的「多」
> 红线从「回看前面」连到「又算一遍」

## verdict | 查明：重复计算
证据串起来了：不是机器旧，也不是模型累，是每一步都在重算早就算过的东西。
> 前两条嫌疑盖「排除」，第三条盖「已证实」

## fix | 修复：存起来查
修复办法叫 KV cache：每个 token 的 Key 和 Value 只算一次，存进缓存；
之后只算新来的那一个，再去缓存里查。
> 证物 C：KV 缓存登记卡，K、V 两列，盖「已存档」
> 结论便签：只算新来的，再查缓存

## cost | 结案：代价是显存
结案报告还要写上代价：缓存占显存，随长度线性增长；Llama 2 7B 跑 4K 上下文，要多占 2 GB。
> 结案报告：原因 / 修复 / 代价 / 教训，盖「结案」

## end
emphasis: 累 / 重复
一句话：慢不是因为累，是因为重复。

## recap
center: 案卷 · KV cache
tagline: 慢不是因为累，是因为重复
length: 4.5
- 现象 | 回答越长，后面每个 token 出得越慢
- 原因 | 每一步都重算前面所有 token 的 K、V
- 修复 | K、V 只算一次存进缓存，只算新来的那一个
- 代价 | 显存随长度线性增长：4K 上下文约 2 GB

## facts
```json
{
 "llama2_7b": {"layers": 32, "hidden": 4096, "bytes_per_value": 2, "note": "FP16, multi-head attention (no GQA in Llama 2 7B)"},
 "per_token_bytes": "2 (K,V) × 32 layers × 4096 × 2 B = 524,288 B = 0.5 MiB",
 "context_4k": "4096 tokens × 0.5 MiB = 2 GiB, per request (batch multiplies it)",
 "no_cache_counting": "without a cache, step n recomputes K and V for all n tokens: steps 1..8 compute 1+2+…+8 = 36 rows, 28 of them already computed before"
}
```
