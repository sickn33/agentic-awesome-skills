# RE Agent 工作流门闩（静态↔动态）

> 来源启发：binary-re 阶段划分、社区 RE skill（Frida/r2/Ghidra/IDA 循环）、Cerberus 三头环（静/动/插桩）  
> Issue #65 增量：IAT 修复铁律、六阶段映射、.NET/DLL·SYS 等价路径；用户指令可行性门闩；旁路补丁 6–10；反调试/混淆菜谱 A–T；非 PE 多格式菜谱 U–AV（2026-08-12）  
> 适用：`reverse-engineering/`、`ida-reverse/`、`radare2/`、`malware-analysis/`、与 cre 角色交接

## 0. 启动

```text
□ scope.md：offline 样本路径 或 授权设备/靶机
□ tool-index：file/strings/r2/ida/frida 等实际路径
□ 角色：cre（ops/role-map）
```

## 0.1 Transition handoff（decision delta）

阶段之间不重新注入完整 case context。`scope.md` / `workitems.md` / Evidence 保持 authoritative；`timeline.md` 只承载 transition delta：

1. stage/turn 结束时只写真正改变后续动作的 `decision_delta`；无变化写 `[]`。
2. unchanged route/auth/scope/network profile/tool state/hypothesis 只放 `carry_forward_refs`，consumer 依引用读取，不重新 serialize / emit。
3. `decision_delta` 不是完整 state；consumer 必须先继承 refs，再应用 delta。
4. 只有两个或以上 evidence-supported 分支会导致不同下一动作时才停在 next-step menu；确定性 gate 直接推进。

例：Triage 完成且唯一合法下一步是 Static 时，transition 只需 `decision_delta: [phase=triage->static]` + `carry_forward_refs: [scope.md, evidence/E-triage.md]`。

## 0.5 用户指令可行性门闩（Issue #65）

**原则**：服从用户**目标**，不盲从用户**步骤顺序**。跳步前必须说明前提并请确认；确认后的强制步骤必须做，且诚实标注 Evidence 质量。

| 情况 | Agent MUST |
|------|------------|
| 用户要做 X，且当前状态可得到**有效** Evidence | 执行 X，更新 Evidence |
| 用户要做 X，但存在**已知阻塞前提**（例：已判定加壳且静态 IAT 不可读） | **禁止**假装完成有意义的 IAT；① 一句话说清阻塞；② 给出推荐顺序（先脱壳/修 IAT，或直接动态抓 API）；③ **请用户确认**是「仍强制看当前花表」还是「按推荐顺序」 |
| 用户明确**强制**当前步骤（如未脱壳也要看 IAT） | 执行并记 Evidence，MUST 标注 `quality=unreadable` / `packed`（或等价）；**禁止**据此下「无网络能力」等结论 |
| 用户接受推荐顺序 | 先做前提步骤；完成后自动或再应要求做 X；**禁止**用前提步骤（如脱壳）**冒充**「已完成导入表检查」 |

**与「重做 X」的关系**：重做 X 仍 = 重做被点名步骤（或其经确认的合法前提协商结果），禁止偷换成无关步骤。脱壳是导入表的**前提**，不是导入表的**替代品**。

典型冲突：用户在加壳样本上说「先不要脱壳，先看导入表」→ 壳常篡改导入目录/加密描述符，静态表花且无意义 → 走本表「阻塞前提」行，不得默默脱壳冒充，也不得默默交出花表当完成。

## 1. Triage（5–15 分钟 · 强制起点）

```text
□ 计算样本 Hash（MD5/SHA256）→ 唯一 ID
□ 识别文件类型：EXE / DLL / SYS / ELF / Mach-O / .NET / 脚本(bat/ps1/vba) / JS / APK 等
□ 非 PE/脚本/APK/驱动专项：见 §3.4 与 `references/nonpe-format-cookbook.md`（U–AV）
□ file / DIE / 熵 / 壳特征（PEiD / DIE / Exeinfo 等）
□ 架构：x86 / x64 / ARM；编译语言线索（VC++ / Delphi / .NET / Go / Rust）
□ 加壳类型线索：UPX / ASPack / VMProtect / Themida / 未知混淆
□ strings / rabin2 -z 捡漏
□ MUST 导入/导出锚点（见下方「导入表硬门与等价路径」）；若用户抢跑且有壳 → 先走 §0.5
□ 产出：E-triage（MUST 含 imports 或等价锚点分类摘要，含 quality 标注如适用）+ 假设清单
```

**阶段门闩（Triage → Static/Dynamic）**：E-triage 中未记录 imports **或** 合法等价锚点摘要前，MUST NOT 进入 Dynamic（除非已记录 IAT 修复失败并选择动态旁路，见 §1.2），也 MUST NOT 声称「基础分诊完成」。解析失败时仍 MUST 把失败输出写入 Evidence，不得跳过。用户要求「重做导入表检查」时 MUST 重做 imports/等价步骤本身（或先完成 §0.5 协商后的前提），禁止改换其他分析步骤冒充。

### 1.1 导入表硬门与等价路径

| 样本类型 | MUST 锚点（Evidence） | 说明 |
|----------|----------------------|------|
| 原生 PE/ELF/Mach-O（IAT 可读） | `E-imports` / `E-triage-imports`：导入分类摘要 | `rabin2 -i` / IDA imports / 等价 |
| DLL / SYS / 共享库 | **并列** `E-imports` + `E-exports`（`rabin2 -i` + `rabin2 -E`） | 导出表优先级等同导入表（对外入口） |
| .NET 托管（无传统 IAT） | **等价路径**：dnSpy/IL/元数据/程序集引用与敏感 API 摘要 → 仍写入 `E-imports` 或 `E-triage-imports` 语义槽 | **禁止** 因「没有 IAT」而空过硬门；dnSpy 查看 = 原生「查导入表」 |
| 导入表解析失败 / 为空 / 加壳花表 | 仍记失败或花表输出为 Evidence，并标 `quality` | 不得静默跳过；花表不得支撑能力否定结论 |

**干净导入表警告（MUST 提醒）**：若导入表「过干净」（仅 kernel32/ntdll 等基础 DLL、几乎无业务 API），高度怀疑 `LoadLibrary` + `GetProcAddress` 动态加载 → 在 Evidence 注明嫌疑，并 **SHOULD** 转入 Dynamic 抓取内存 API；不得仅凭静态 IAT 宣称「无网络/无文件能力」。

**高危 API 组合（补丁 8 · SHOULD）**：导入表过长时，优先输出**恶意组合聚类**，过滤纯系统基础调用。示例（非穷尽）：

- 高危簇：`FindWindowA/W` + `WriteProcessMemory` + `CreateRemoteThread`（注入）
- 高危簇：`CryptEncrypt` / `CryptAcquireContext` + 大量 `FindFirstFile` / `DeleteFile`（勒索倾向）
- 高危簇：`InternetOpen` / `WinHttp` / `URLDownloadToFile` + 持久化 API（`RegSetValue` / `CreateService`）
- 单独 `CreateFile` / `ReadFile` 等多为良性噪声，除非与上簇共现

### 1.2 脱壳与 IAT 处理（高风险分岔 · Issue #65）

```text
分支 A：无壳 / .NET 托管
  → 直接进入 §2 Static（.NET 走等价锚点）

分支 B：有壳 / 强混淆
  Step 1：尝试脱壳（自动脱壳机 / 手动找 OEP）— 须在授权与隔离环境
  Step 2：尝试修复 IAT
    工具：x86 → ImportREC（或等价）；x64 → Scylla（或等价）。禁止 64 位样本死磕 ImportREC。
    情况 B1：修复成功且可解析 → 记 E-imports（修复后）→ §2 Static
    情况 B2：ImportREC/Scylla 报错、修复后无法运行、或 IAT 全乱码（VMP/加密壳）
      → 【IAT 修复铁律】立即终止继续静态 IAT 修复
      → MUST 记录 E-iat-repair-fail（命令、工具、失败现象、决定转动态）
      → 直接进入 §3 Dynamic：API 断点 / 硬件执行断点 / 内存搜索抓取导入
      → 这不算「跳过导入表」：导入表路径已尝试并记 Evidence
    情况 B3（补丁 6）：脱壳并修 IAT 后双击闪退 / 蓝屏（疑文件 CRC/大小自校验）
      → 放弃继续静态修文件；记 E-self-check-crash 或并入 E-iat-repair-fail
      → 转入 §3 Dynamic：对 CreateFile / GetFileSize / 哈希相关 API 下断，定位校验绕过点
```

**IAT 修复铁律（MUST）**：优先尝试自动/半自动修复；一旦修复工具报错或修复后程序无法运行，**立即停止**在静态导入表上死磕，切换动态调试，用 API 断点（如 `bp CreateFile` / 关键网络 API）在运行时捕获导入函数。

## 2. Static（基础静态锚点 → 深挖）

| 工具 | 何时 |
|------|------|
| radare2 / rabin2 | 快速函数/导入/字符串（imports 已在 Triage MUST 完成或已记失败旁路） |
| IDA / Ghidra（MCP 或 headless） | 深挖、交叉引用、类型；survey 阶段复核 imports 分类 |
| jadx / dnSpy | Android / .NET |
| OLLVM 文档 | 控制流平坦化怀疑 |

```text
□ 确认 E-imports / E-triage 已含导入表或等价锚点 Evidence（缺失则先补，禁止后置）
□ 若 DLL/SYS：确认 E-exports 已记录
□ 敏感 API 分组 + 高危组合聚类（补丁 8）
□ 硬编码域名/IP/URL 字符串；资源节是否藏 Payload
□ 定位关键函数（加密/校验/网络/授权）→ 地址/符号写入 Evidence
□ 一条路不通 → 换工具（IDA↔r2↔Ghidra）
□ 时间盒（补丁 9 · SHOULD 默认）：静态深挖约 15 分钟仍无关键路径 → 强制转入 §3 Dynamic（用户/任务可覆盖时长）
```

**无 MCP 时**：可用导出反编译文本再分析（对照 P4nda0s reverse-skills / IDA-NO-MCP 思路），仍写 Evidence 路径。

## 3. Dynamic（交叉验证循环区）

核心理念：**静态提供线索 → 动态验证 → 验证卡壳 → 回静态重审**（无固定唯一顺序）。

### 3.0 断点起手式（补丁 7 + 10 · MUST 顺序）

在用户态调试器（x64dbg 等）启动样本前，按「四级火箭」预置断点（可因架构/工具略名不同，顺序不变）：

1. **TLS 回调**断点（调试器 EP 之前可能已跑）
2. **入口点 EP** 断点
3. **敏感 API** 断点（如 `CreateRemoteThread` / 网络 / 文件写）
4. **保底**：`ExitProcess` / 进程退出路径断点（补丁 10）— 一旦因反调试直接退出，**不急着重启**；立即 dump memory，将崩溃前镜像路径写入 Evidence，供字符串/数据恢复

```text
□ Frida / x64dbg / gdb / emulator：验证静态假设
□ 按 §3.0 预置断点后再跑；单步跟踪栈/寄存器（白盒）
□ 行为监控：沙箱 / Procmon / RegShot（黑盒）
□ IAT 修复失败 / 自校验闪退样本：硬件执行断点或内存搜索强行捕捉 API；CreateFile/GetFileSize 查 CRC
□ 反调试/反 Frida → reverse-engineering/anti-analysis
□ Android：root 检测 / SSL pinning 绕过脚本按需生成，**须在授权设备**
□ 崩溃日志驱动下一轮 hook（自适应循环）
□ 时间盒（补丁 9 · SHOULD 默认）：单步跟踪约 200 条指令仍无恶意行为线索 → 强制回静态搜字符串/换锚点（可覆盖）
```

### 3.1 沙箱 / 动态无行为应急分支（MUST）

```text
无行为或立刻退出 / 无限休眠
  → 检查反调试 / 反虚拟机例程（CPUID、高精度计时、沙箱特征等）
  → 尝试硬件断点绕过、修补检测点、或换物理机/更高保真环境
  → 将「无行为 + 疑似 anti-VM」写入 Evidence，禁止写成「样本无害」而不加条件
```

### 3.2 时间盒策略（补丁 9 · SHOULD）

| 阶段 | 默认阈值（可被用户/任务覆盖） | 动作 |
|------|------------------------------|------|
| Static 深挖无关键路径 | ~15 分钟 | 转入 Dynamic |
| Dynamic 单步无进展 | ~200 条指令 | 回 Static 字符串/交叉引用重锚 |
| 任一路径重复失败 | 记 Evidence 后换工具或旁路 | 禁止同一失败手法空转 |


### 3.3 反调试 / 混淆旁路速查（Issue #65 补丁 A–T · 高频）

完整索引与动作细节见 `reverse-engineering/anti-analysis.md`「Agent 响应菜谱 A–T」。此处只列 **P0 必查 + 常见转场**。默认 **授权隔离 lab**；patch/改标志位不是未授权生产动作。

| 触发特征 | 首选动作（摘要） | Evidence |
|----------|------------------|----------|
| `cpuid` 后 jz/jnz（A） | lab：改标志位或 patch 走真实分支；记检测点地址 | `E-anti-debug-cpuid` |
| `rdtsc` + sub/cmp（B） | bp rdtsc 或 hook 时间源；禁止无限空转等沙箱超时当「无害」 | `E-anti-debug-rdtsc` |
| PEB BeingDebugged / NtGlobalFlag（K） | ScyllaHide 或手改 PEB；patch 条件跳 | `E-anti-debug-peb` |
| `NtQueryInformationProcess` DebugPort/Flags/Object（P） | ScyllaHide / hook 返回值；记 class 参数 | `E-anti-debug-ntqip` |
| 导入极少但行为丰富 → API 哈希（N） | bp GetProcAddress；哈希反查回注 IDA | `E-api-hash` |
| strings 空但有网/文件行为 → 串加密（I） | 找 decode 例程 xref；解密后 dump 回注 | `E-string-decrypt` |
| 有签名但来源可疑（F） | SigCheck：有效/吊销/时间；**无效不降**威胁等级 | `E-sig-forge` |
| 标准 strings 无 IOC → 试宽字符（T） | `strings -el` / UTF-16LE；Alt+A unicode | `E-wide-strings` |
| 调试器名字符串 / Toolhelp 扫描（C） | bp CreateToolhelp32Snapshot 链 | `E-anti-debug-procscan` |
| AddVectoredExceptionHandler + 故意异常（D） | bp VEH 注册；分析 handler | `E-anti-debug-veh` |
| int3 / DR0–DR7（M） | patch int3；软断点或 ScyllaHide 藏硬件 BP | `E-anti-debug-bp` |
| 多 PE 头/重叠节（G） | 节表真实映射 + 熵；不信节名 | `E-pe-anomaly` |
| 文件尾 > 节总和 Overlay（J） | 提取 overlay；file/熵；找加载偏移 xref | `E-overlay` |
| .rsrc 异常大/高熵 RT_RCDATA（Q） | 提取资源；FindResource 链 + 解密 dump | `E-rsrc-payload` |
| 运行时才加载 DLL（R） | 查 Delay Import；bp delay-load helper | `E-delay-import` |
| while+switch 星形 CFG（H） | **See** `ollvm-deobfuscation.md`；插件失败则动态路径 | `E-cff` |
| 恒真/恒假分支（S） | **See** ollvm / 符号执行；动态为准 | `E-opaque-pred` |
| `/proc/self/status` TracerPid（L） | **Linux/ELF**；hook 或 patch；Windows 主路径不强制 | `E-anti-debug-tracerpid` |

**约束**：绕过失败也记 Evidence；禁止把「反调试触发退出」写成「样本无害」。完整 A–T 与 P2（E 编译时间、O 花指令）见 anti-analysis 菜谱节。

### 3.4 非 PE / 多格式旁路（Issue #65 补丁 U–AV · 路由）

完整索引：`reverse-engineering/references/nonpe-format-cookbook.md`。此处只列 **类型 → 入口**；动作细节在 cookbook / 对应 skill。

| 类型 | 跳转 | P0 Evidence 锚点（示例） |
|------|------|---------------------------|
| BAT/CMD | cookbook §1 + malware | `E-batch-deobf` |
| PowerShell | cookbook §2 + malware | `E-ps-decode-layer-N` |
| VBA 宏 | cookbook §3 + malware | `E-vba-pcode` |
| JS 强混淆 / JSVMP | **js-reverse** + cookbook §4 | `E-js-vmp` / `E-js-deobf` |
| SYS 驱动 | kernel-driver-reverse + cookbook §5 | `E-driver-irp-handlers` / `E-driver-ioctl` |
| DLL 侧重点 | cookbook §6（AM≡A–T **R**） | `E-dll-tls-dllmain` / `E-exports` |
| Android 格机/隐藏图标 | **apk-reverse** + cookbook §7–8 | `E-android-wiper-*` / `E-android-hidden-icon-*` |

**约束**：不另起「非 PE 六阶段」；与 §3.3 A–T 分工（PE 反调试 vs 多格式）。授权 lab；格机/BYOVD/反射 = 检测取证表述。


## 4. Synthesis（IOC / 攻击链 / 报告）

### Decision quality overlay (Issue #77)

Before closing Synthesis, apply [analysis-decision-framework.md](../../ops/analysis-decision-framework.md) **P0 checklist**: R41 grounded claims, R4* validated sufficiency, R1 confidence->dynamic, R2 hypothesis exit, R43 deadlock replan (under feasibility gate), R8/R23 no default malice/IOC. Multi-module -> R50; anti-analysis effort -> R51 + A-T cookbook.

Blindspots (Rust/Go/VMP/injection/OLE/PDF/agent-meta): [analysis-blindspot-cookbook.md](../../ops/analysis-blindspot-cookbook.md) R52-R81 — detection-oriented; not a parallel master flow.



```text
□ Finding：算法/校验逻辑/可利用点 / 行为结论
□ Path：callflow 或 solve 步骤挂 E-*
□ IOC：网络指纹 + 主机指纹（有则表；无则 n/a+原因）
□ 报告 docs-generator（malware/apt/null/vuln overlay 按任务选型）+ 可选图
□ 可选：YARA / Snort·Suricata 规则化沉淀
□ field-journal 脱敏
```

## 5. 六阶段实战映射（Issue #65 思维导图 → 本文件）

| 实战阶段 | 本文件章节 | 硬门 / 铁律 |
|----------|------------|-------------|
| 1 初步快速研判 | §0–§1 Triage | Hash、架构、文件类型、查壳；imports/等价锚点；§0.5 指令门闩 |
| 2 脱壳与 IAT | §1.2 | IAT 铁律；失败/自校验闪退 → Evidence → Dynamic |
| 3 基础静态锚点 | §2 Static | 高危 API 组合；时间盒 SHOULD |
| 4 深度交叉验证 | §3 Dynamic | 断点四级火箭；无行为应急；时间盒；§3.3 A–T；§3.4 U–AV 类型路由 |
| 5 提取 IoC 与攻击链 | §4 Synthesis | IOC + Kill Chain / Path |
| 6 归档与规则化 | §4 + docs-generator / YARA | 结构化报告；规则可选 |

## 6. 与「堆 RE skill 插件」的差异

- 本包用 **阶段门闩 + tool-index**，不默认启用 Hex-Rays「unsafe 全自动执行」类插件  
- 动态插桩默认 **offline/lab** network_profile  
- IAT/导入表：**尝试 + 记录** 优先于「无限静态死磕」或「静默跳过」  
- 用户指令：**目标优先 + 前提协商**，禁止用无关步骤冒充被点名步骤