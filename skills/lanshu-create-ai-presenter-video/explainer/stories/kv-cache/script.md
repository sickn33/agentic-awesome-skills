---
title: KV cache
subtitle: 用显存换速度，只算新的那一个
voice: Chinese (Mandarin)_Reliable_Executive
speed: 1.1
---

## problem | 问题：越写越慢
大模型回答问题，是一个 token 一个 token 往外蹦的。
每蹦出一个新 token，都要回头看一遍前面所有的 token。
要是每次都把前面重新算一遍，就会越写越慢。
> 一个 token 一个 token 地出：自回归
> 新 token 回头看前面每一个：注意力
> 不缓存：第 n 步把前面 n 个全部重算（三角形）

## method | 方法：存起来，只算新的
KV cache 的办法是：每个 token 的 Key 和 Value 只算一次，存起来；
之后只算新来的那一个，再去缓存里查。
> 每个 token 的 K、V 算一次，存进缓存
> 新 token 只算自己，用 Q 去查缓存里的 K，取回 V

## cost | 代价：显存
代价是显存：缓存跟着上下文一起涨。
拿 Llama 2 7B 来说，每个 token 大约占 0.5 MB，4K 上下文就要 2 GB。
> 显存随上下文线性上涨
> Llama 2 7B 的账：2 × 32 层 × 4096 × 2 字节 ≈ 0.5 MB/token，× 4096 ≈ 2 GB

## fixes | 优化：省显存
所以才有 GQA 共用 K 和 V，PagedAttention 按页分配，还有量化压缩。
> 三种省法，每种都让缓存明显变小

## end
emphasis: 显存 / 速度 / 新的那一个
一句话：用显存换速度，只算新的那一个。

## recap
center: KV cache
tagline: 用显存换速度
length: 4.7
- 问题 | 每出一个 token 都要回看前面全部，重算越来越慢
- 方法 | 每个 token 的 K、V 只算一次，存进缓存；新 token 只算自己，再查缓存
- 代价 | 显存随上下文线性增长：Llama 2 7B 约 0.5 MB/token，4K ≈ 2 GB
- 优化 | GQA 共用 K/V · PagedAttention 按页分配 · 量化压缩

## facts
```json
{
 "llama2_7b": {
  "layers": 32,
  "hidden": 4096,
  "heads": 32,
  "head_dim": 128,
  "bytes_per_value": 2,
  "note": "FP16, multi-head attention (no GQA in Llama 2 7B)"
 },
 "per_token_bytes": "2 (K,V) × 32 layers × 4096 × 2 B = 524,288 B = 0.5 MiB",
 "context_4k": "4096 tokens × 0.5 MiB = 2 GiB, per request (batch multiplies it)",
 "gqa_example": "Llama 3 8B: 32 query heads share 8 KV heads → KV cache ÷4 vs full multi-head",
 "paged_attention": "vLLM: KV cache stored in fixed-size blocks allocated on demand; little waste from reserved or fragmented space",
 "quantization": "store K/V in fewer bits, e.g. FP8 or INT8 instead of FP16"
}
```
