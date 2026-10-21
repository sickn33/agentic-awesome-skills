---
title: KV cache
subtitle: 小剧场：奶茶店的小本本
voice: Chinese (Mandarin)_Warm_Girl
speed: 1.05
pronounce: 重算/(chong2)(suan4); 重核/(chong2)(he2); 重复/(chong2)(fu4); 重新/(chong2)(xin1)
---

## myth | 误区：是我手太慢？
奶茶店新来的店员小林发现，客人越多，出单越慢。
他以为，是自己手太慢。
> 长队 + 叫号屏；小林满头汗，想：一定是我手太慢

## receipt | 账单：多核了几遍
店长拿起第 8 位客人的出单记录一看：前面 7 张单，小林又全部核对了一遍。
原来每来一位新客人，他都把前面所有人的单子重核一遍，越往后越慢。
> 小票举到镜头前：#001–#007 都标「又核一遍」，#008 是新单
> 小林：原来是这样！

## notebook | 对照：一个小本本
店长递给他一个小本本：每张单只记一次，单号用来对，内容用来取。
新客人来了，只写他自己这一张，前面的翻本子查就行。
> 实物对照：一堆重核的小票 vs 一个小本本
> 队伍变短，客人拿到奶茶

## term | 真名：KV cache
大模型写字也一样：前面每个 token 的 Key 和 Value 记进「小本本」，这就叫 KV cache；
代价是本子越记越厚，占的是显存。
> 比喻对上真名：小本本 = KV cache，单号 = K，单子内容 = V
> 本子越来越厚 = 显存随长度增长

## end
emphasis: 新来的 / 缓存
一句话：之后只算新来的那一个，再去缓存里查。

## recap
center: 小本本 = KV cache
tagline: 只算新来的，再查缓存
length: 4.5
- 误区 | 慢不是手慢，是每次都把前面的单子重核一遍
- 账单 | 第 8 位客人：前 7 张单又核了一遍
- 小本本 | 每张单只记一次：单号 = K，内容 = V
- 代价 | 本子越记越厚：KV cache 占显存

## facts
```json
{
 "llama2_7b": {"layers": 32, "hidden": 4096, "bytes_per_value": 2, "note": "FP16, multi-head attention (no GQA in Llama 2 7B)"},
 "per_token_bytes": "2 (K,V) × 32 layers × 4096 × 2 B = 524,288 B = 0.5 MiB",
 "context_4k": "4096 tokens × 0.5 MiB = 2 GiB, per request (batch multiplies it)",
 "no_cache_counting": "without a cache, step n recomputes K and V for all n tokens: steps 1..8 compute 1+2+…+8 = 36 rows, 28 of them already computed before"
}
```
