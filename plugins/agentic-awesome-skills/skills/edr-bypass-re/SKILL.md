---
name: edr-bypass-re
description: "Reverse engineer EDR internals (user-mode hook tables, ETW, AMSI) and study bypass techniques such as direct syscalls, Hell's Gate, and call-stack spoofing. Lab-only red-team research."
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

## When to Use

- Studying EDR telemetry surfaces in an authorized red-team lab.
- Evaluating detection coverage against known bypass technique classes.

## 适用范围

红队 / 对抗模拟在已获授权的目标主机投递 implant 并躲避现代 EDR 时使用本 skill。

1. **红队 / Purple team / 对抗演练** — 客户希望评估 SOC 与 EDR 的真实检测能力
2. **自研 implant / C2 框架研发** — 开发针对自家产品测试的载荷，需要绕过自家或目标 EDR
3. **EDR 产品评估** — 在合规边界已确认的前提下，客观评测某款 EDR 的检测覆盖
4. **CTF / 攻防演练的 Windows 端突破** — 比赛中需要在加固主机上稳定执行

**不适用场景**：

- 杀毒厂商对自家产品做完整 RE 给客户出商业评估报告（找厂商正式合作）
- 未授权目标的免杀对抗（违法）
- 普通病毒木马的免杀（本 skill 关注红队 OPSEC，不教恶意代码写法）

### 与其他 skill 的分工

| 场景 | 用什么 |
|------|--------|
| 全链路攻防（从外网打到域控） | `attack-chain/` |
| 内网横向 / AD 攻击 | `pentest-tools/network-attack-defense.md` |
| 在某个特定主机上要过 EDR 投递 implant | **本 skill** |
| 单纯静态免杀（混淆 / 加壳） | `malware-analysis/`（反向视角） |

`attack-chain` 关注完整 kill chain，本 skill 只聚焦 **EDR 这一个对手** 的内部机制和针对性绕法。

## 核心原理

```text
EDR 的四个主要监控面               红队的对策
─────────────────────              ─────────────────────
用户态 ntdll hook       ◄──►   unhook (Peruns Fart / fresh ntdll)
                                  间接 syscall / Hell's Gate
                                  hardware breakpoint Blindside

kernel callback         ◄──►   call stack spoof
(Ps/Cm/Ob 系列)                   走合法触发链（不直接绕，配合上游隐身）

ETW telemetry           ◄──►   EtwEventWrite patch
(Microsoft-Windows-Threat-          NtTraceControl 关 provider
 Intelligence 等)                  AmsiContext 同步处理

AMSI 扫描               ◄──►   AmsiScanBuffer patch (mov eax,0x80070057; ret)
(amsi.dll)                       hardware breakpoint 旁路
                                  reflective 加载副本 amsi.dll
```

关键认知：

- **EDR 不是黑盒** — 关键 hook / callback / provider 都能用 IDA + windbg 逆出来
- **绕过技术要组合使用** — 单独一个 unhook 解决不了 ETW 告警，单独 AMSI patch 解决不了 syscall hook
- **顺序很重要** — 先 ETW patch → 再 AMSI patch → 再 unhook；顺序错了 EDR 先收到 unhook 告警
- **现代 EDR 已经把 ETW + kernel callback 当主战场**，单纯用户态 unhook 早已不够

## 工作流

### Step 1：识别目标主机的 EDR

```powershell
# 列出常见 EDR / AV 驱动
Get-Service | Where-Object {$_.Name -match 'CSAgent|SentinelAgent|elasticendpoint|esets|ekrn|MsMpEng|wdsvc|cyserver|sysmon|aswbidsagent'}

# 列出加载的 minifilter
fltmc filters

# 列出已注册的内核 callback（需 windbg + 内核调试 / 或用 PChunter / DRVHV）
# !object \Callback
# !pnpcallback / Process / Thread / Image
```

EDR 指纹表见 `references/hook-survey.md` 顶部。

### Step 2：从 EDR DLL 提 hook 表

1. attach 到一个被注入 EDR 用户态组件的进程（任何已落地进程）
2. 在 windbg 中 dump 当前 `ntdll.dll` 的 `.text` 段
3. 与磁盘上干净的 `C:\Windows\System32\ntdll.dll` 做 diff
4. 不一致的地方就是 hook 点

或者直接用 `pe-sieve`：

```powershell
pe-sieve64.exe /pid 1234 /shellc 3 /modules 3 /dir hooks_dump
```

详细方法见 `references/hook-survey.md`。

### Step 3：选绕过技术组合

| 防御点 | 推荐绕法 |
|--------|---------|
| ntdll inline hook | indirect syscall + 动态 SSN (Halo's Gate) |
| ETW-TI provider | EtwEventWrite head patch |
| AMSI（PowerShell / .NET） | AmsiScanBuffer patch 或 HWBP |
| kernel callback | call stack spoof + 走 legit gadget |
| Sysmon ProcessCreate | PPID spoof + unbacked memory |

### Step 4：在 implant 中实现

代码骨架见 `references/unhook-techniques.md` 与 `references/telemetry-blinding.md`。

### Step 5：本地 sandbox 验证

```powershell
# 在隔离环境部署目标 EDR 试用版（Defender 默认即可起步）
# 启用 Sysmon + olaf-config
sysmon64.exe -i sysmonconfig.xml

# 跑 implant，看是否触发以下告警源：
#   - Defender AMSI
#   - ETW-TI
#   - Sysmon Event ID 1/7/8/10
#   - EDR 控制台
```

### Step 6：投递

- 文件落地路径用合法软件目录
- PPID spoof 到 explorer.exe
- 配合 `attack-chain` 中的 initial access 节

## 典型场景

### 场景 1：投递 cobalt-strike-alike beacon 过 Defender + Sysmon

```text
目标：Windows 11 Enterprise + Defender (云查杀开) + Sysmon (olaf 配置)
要求：beacon 落地后能 callback 且不触发任何告警

组合拳：
  1. shellcode 加密存储，运行时解密
  2. AMSI patch（如果走 PowerShell 投递）
  3. EtwEventWrite patch（消 ETW-TI）
  4. 间接 syscall + Halo's Gate（消 ntdll hook 告警）
  5. PPID spoof 到 explorer.exe
  6. sleep 阶段用 Ekko / Foliage 加密自身内存
```

### 场景 2：在已落地的低权限 shell 上做 EDR sleep mask

```text
前置：已经通过 phishing 拿到 medium IL shell，EDR 正在监控
风险：长时间驻留容易被内存扫描发现 beacon 特征

解法：
  1. 不再申请新 RWX 内存
  2. sleep 期间用 Ekko：
       - WaitForSingleObjectEx + CreateTimerQueueTimer
       - 在定时器里加密自身 .text + 把堆栈刷成全 0
  3. wake 时用 ROP 还原
  4. 配合 call stack spoof 让 RtlCaptureStackBackTrace 看不到信标地址
```

## 按需自举（On-Demand Bootstrap）

### 工具依赖

| 工具 | 用途 | 可自动安装 |
|------|------|-----------|
| pe-sieve | 检测进程中的 hook / 注入 | ✓ |
| API Monitor v2 | 动态观察 API 调用与 hook | 半自动（手动下载） |
| SysWhispers3 | 生成直接 / 间接 syscall stub | ✓（git clone + python） |
| Hell's Gate POC | 动态 SSN 解析参考实现 | ✓（git clone） |
| windbg + IDA | 静态逆 EDR DLL / 内核 callback | ✗（自己装） |
| Sysmon + olaf config | 本地验证环境 | ✓ |

### 自举命令

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File "&lt;SKILL_ROOT&gt;\skills\scripts\bootstrap-reverse.ps1" -Capability @('pe-sieve','syswhispers3','sysmon') -StartServices
```

## 路由上下文

**上游入口**：

- `reverse-engineering/` — 需要先理解 EDR DLL / 驱动的实现
- `attack-chain/` — 决定在 kill chain 的哪个阶段引入本 skill

**同级关联**：

- `pentest-tools/network-attack-defense.md` — 内网横向时如何与本 skill 联动
- `malware-analysis/` — 反向视角，看检测方怎么写规则
- `field-journal/` — 每次实战后回写经验

**下游交付**：

- 生成报告时引用 MITRE ATT&CK **T1562 (Impair Defenses)**、T1562.001 (Disable or Modify Tools)、T1562.006 (Indicator Blocking)、T1055 (Process Injection)、T1027 (Obfuscated Files or Information)

## 法律边界声明

- 仅限合法授权的红队 / 对抗演练 / 自有产品测试
- 操作前必须取得书面授权（SoW / 测试合同 / SRC 范围说明）
- 不得用于未授权目标，不得超出授权范围
- 发现高危问题立即向客户报告，遵循负责任披露
- 所有报告中真实目标信息必须脱敏（IP / 主机名 / 域名 / 凭证占位）

## 参考资料

- 详细 hook 调研：`references/hook-survey.md`
- unhook / syscall 技术：`references/unhook-techniques.md`
- ETW / AMSI / 反取证：`references/telemetry-blinding.md`
- MITRE ATT&CK T1562：<https://attack.mitre.org/techniques/T1562/>


## 任务完成自检（声称完成前 MUST 通过）

- [ ] 我是否执行了工作流中的每一步（而不是只阅读）？
- [ ] 我是否基于 `tool-index` 使用了真实工具路径？
- [ ] 我是否产出了可复现证据（命令/脚本/截图/报告）？
- [ ] 我是否完成并回写了 RULES 要求的 Checklist 项？

## Limitations

- Lab environment only: deploying bypasses against monitored production systems is out of scope and illegal without authorization.
- Technique descriptions age quickly as EDR vendors adapt.

> Adapted from [zhaoxuya520/reverse-skill](https://github.com/zhaoxuya520/reverse-skill) (MIT).
