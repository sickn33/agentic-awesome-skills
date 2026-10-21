---
title: KV cache
subtitle: 推演：重复的不重算
voice: Chinese (Mandarin)_Reliable_Executive
speed: 1.05
pronounce: 重算/(chong2)(suan4); 重核/(chong2)(he2); 重复/(chong2)(fu4); 重新/(chong2)(xin1)
---

## question | 问题：每一步要算几份
大模型每出一个新 token，都要拿它的 q，和前面每个 token 的 k 比一比，再按比例取走它们的 v。
那么，第 n 个 token 出来时，一共要算几份 k 和 v？
> 式子：out = Σ softmax(q·k) v，q、k、v 三种颜色
> 第 n 步要用到前面 n 个 token 的 k、v

## derive | 推导：把每一步画出来
不缓存的话，第 1 步算 1 份，第 2 步算 2 份，第 8 步就要算 8 份。
画出来是一个三角形：8 步一共 36 份，其中 28 份，都是早就算过的。
> 三角形一行一行长出来：对角线是新的，左边全是重复
> 1+2+…+8 = 36，重复 28

## cache | 办法：算一次，存起来
那就让每个 token 的 k 和 v 只算一次，存进缓存；
之后只算新来的那一个，再去缓存里查。
> 旧的行收进缓存（k、v 两列）
> 只剩最后一行亮：q 和缓存里的 k 比，取回 v

## cost | 代价：用显存换速度
每一步从算 n 份，变成只算 1 份；代价是缓存随长度线性变大。
拿 Llama 2 7B 来说，每个 token 约占 0.5 MB，4K 上下文就是 2 GB。
> 两条线：不缓存 y=n，缓存 y=1
> 显存线性上涨：0.5 MB/token，4K ≈ 2 GB

## end
emphasis: 重复 / 存起来
一句话：重复的不重算，存起来查。

## recap
center: KV cache
tagline: 重复的不重算，存起来查
length: 4.5
- 问题 | 第 n 步要用到前面 n 个 token 的 k、v
- 推导 | 不缓存：1+2+…+8 = 36 份，28 份是重复
- 办法 | k、v 只算一次存进缓存，之后只算新来的
- 代价 | 显存随长度线性增长：约 0.5 MB/token，4K ≈ 2 GB

## facts
```json
{
 "llama2_7b": {"layers": 32, "hidden": 4096, "bytes_per_value": 2, "note": "FP16, multi-head attention (no GQA in Llama 2 7B)"},
 "per_token_bytes": "2 (K,V) × 32 layers × 4096 × 2 B = 524,288 B = 0.5 MiB",
 "context_4k": "4096 tokens × 0.5 MiB = 2 GiB, per request (batch multiplies it)",
 "no_cache_counting": "without a cache, step n recomputes K and V for all n tokens: steps 1..8 compute 1+2+…+8 = 36 rows, 28 of them already computed before"
}
```
