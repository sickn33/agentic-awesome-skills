---
name: radio-sdr
description: "Authorized RF/SDR security research: signal identification, replay-feasibility study in shielded labs, and wireless protocol analysis outside regulated bands."
risk: offensive
source: "https://github.com/zhaoxuya520/reverse-skill"
source_repo: "zhaoxuya520/reverse-skill"
source_type: community
date_added: "2026-08-25"
license: "MIT"
license_source: "https://github.com/zhaoxuya520/reverse-skill/blob/main/LICENSE"
---
> **⚠️ AUTHORIZED USE ONLY**
> This skill is for educational purposes or authorized security assessments only.
> You must have explicit, written permission from the system owner before using this tool.
> Misuse of this tool is illegal and strictly prohibited.

> **Mandatory confirmation gate**
> Before running any command that probes, exploits, changes, persists on, extracts data from, or attempts credential access against a target:
> 1. Ask the user to state the exact target URL, IP, account, or resource.
> 2. Ask the user to confirm written authorization and the permitted scope.
> 3. Show the exact command(s) and explain their expected effect.
> 4. Wait for explicit confirmation in the current conversation.
>
> Without that confirmation, remain read-only and provide defensive guidance only. Prefer a sandbox, disposable VM, or controlled lab.

# RF / SDR Security Research
## When to Use

- Lab study of wireless protocols with your own devices.
- Feasibility checks for replay attacks in RF-isolated environments.


## 适用场景

- 无线遥控/传感器等非 Wi-Fi RF（授权）
- ADS-B/遥控等协议研究（合法接收）
- 与 wifi-wireless 分工：本 skill 偏 **SDR 通用 RF**；Wi-Fi 攻防走 R29

## 工作流

```text
□ 法规与许可确认
□ 只收：识别中心频率与调制
□ GNU Radio / URH 分析
□ 重放仅屏蔽室且书面允许
□ 结论侧重：是否可未授权控制 / 加固建议
```

## 工具链

| 工具 | 用途 |
|------|------|
| RTL-SDR / HackRF（合规） | 收发硬件 |
| URH / GNU Radio | 分析 |
| Inspectrum | 信号 |

## 参考

- `references/sdr-lab-rules.md`
- `../wifi-wireless/` `../ot-ics/` `../hardware-security/`

## 路由上下文

**上游**: MASTER R38  
**MUST NOT**: 干扰公共通信、未授权发射

## 任务完成自检

- [ ] 是否默认只收并记录法规边界？
- [ ] Checklist？

## Limitations

- Transmitting on licensed frequencies is illegal without permits; shield and stay low-power.
- Protocol analysis quality depends on SDR bandwidth and sampling.

> Adapted from [zhaoxuya520/reverse-skill](https://github.com/zhaoxuya520/reverse-skill) (MIT).
