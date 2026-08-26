---
name: ot-ics
description: "Authorized OT/ICS security assessment: Purdue-model zoning review, PLC/SCADA exposure, industrial protocol discovery, and passive-first evaluation discipline."
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

# OT / ICS Security
## When to Use

- Passive assessment of industrial networks within an approved scope.
- Documenting PLC/SCADA exposure and zoning violations.


## 适用场景

- 工控/SCADA/DCS 安全评估（授权）
- Purdue 模型分区与跨区通道
- Modbus/DNP3/S7/EtherNet/IP 等协议暴露
- 工程师站、HMI、历史库、跳板主机
- IT/OT 融合边界（防火墙规则、单向闸）

## 安全铁律（MUST）

```text
MUST NOT 在未明确允许时：
- 对 PLC 写线圈/寄存器
- 全网高速率扫描生产 OT
- 中断安全仪表系统（SIS）相关路径
优先：只读识别、流量镜像、离线固件/配置分析
```

## 工作流

### Phase 1 — 分区与资产

```text
□ Purdue L0–L5 草图：现场设备 → 控制 → 监督 → 站点 DMZ → 企业
□ 资产清单：PLC/RTU/HMI/工程师站/历史库/Jump host
□ 协议与端口基线（仅授权网段）
```

### Phase 2 — 被动与只读

```text
□ SPAN/镜像 PCAP → protocol-reverse / Wireshark 工控解析器
□ 配置与工程文件离线审计（TIA/RSLogix 导出等）
□ 默认口令与明文协议（Modbus 无认证）记录为 Finding，不写盘改值
```

### Phase 3 — 受限主动（仅授权）

```text
□ 低速识别，维护窗口
□ 只读功能码优先
□ 每步 Evidence；异常立即停止并通报
```

### Phase 4 — 固件/补丁面

```text
□ 控制器固件版本 → CVE 映射（不盲刷固件）
□ 联合 firmware-pentest 做离线镜像分析
```

## 工具链

| 工具 | 用途 | 注意 |
|------|------|------|
| Wireshark 工控 dissectors | 被动解析 | 镜像流量 |
| Nmap NSE（受限） | 识别 | 速率与时间窗 |
| Claroty/Nozomi 等 | 资产发现 | 商业/现场 |
| PLC 厂商工程软件 | 配置审计 | 离线优先 |
| binwalk / Ghidra | 固件 | 离线 |

## 参考

- `references/ot-safe-assessment.md`
- `../firmware-pentest/` `../protocol-reverse/` `../network` via pentest-tools

## 路由上下文

**上游**: MASTER R28  
**下游**: 固件深挖 `firmware-pentest`；协议 `protocol-reverse`；IT 横向 `windows-ad`/`attack-chain`  
**同级**: 不要用普通 Web 扫默认参数打 OT

## 任务完成自检

- [ ] 是否默认被动/只读并记录授权边界？
- [ ] 是否避免对控制回路写操作（除非明确允许）？
- [ ] Finding 是否含物理/过程影响说明？
- [ ] Checklist / journal？

## Limitations

- Active scanning can crash PLCs; default to passive capture.
- Specialized protocols need vendor documentation rarely available publicly.

> Adapted from [zhaoxuya520/reverse-skill](https://github.com/zhaoxuya520/reverse-skill) (MIT).
