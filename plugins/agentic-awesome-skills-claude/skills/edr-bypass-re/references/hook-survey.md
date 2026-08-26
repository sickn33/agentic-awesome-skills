# EDR Hook 调研速查

> 仅限授权红队 / 对抗演练 / 自有产品测试，禁止用于未授权目标。

本文档汇总主流 EDR / AV 在用户态与内核态的监控点，供红队侦察阶段快速定位"该处理什么"。

## 1. 主流 EDR 指纹与 hook 模式速查

| 厂商 / 产品 | 用户态组件 | 内核驱动 | 主要监控面 |
|------------|-----------|---------|-----------|
| CrowdStrike Falcon | `CSFalconService.exe`, `CSAgent.sys` 注入到目标进程 | `CSAgent.sys`, `CSBoot.sys` | 重内核 callback + ETW-TI；用户态 hook 较少（云查) |
| Microsoft Defender for Endpoint (MDE) | `MsMpEng.exe`, `MpClient.dll` | `WdFilter.sys`, `WdBoot.sys`, `WdNisDrv.sys` | AMSI + ETW-TI + ntdll inline hook + kernel callback 全面 |
| SentinelOne | `SentinelAgent.exe`, `SentinelHelperService.exe` | `SentinelMonitor.sys`, `SentinelDeviceControl.sys` | ntdll 用户态 hook 重 + 内核 callback + 自有 ETW provider |
| Elastic Defend (原 Endpoint Security) | `elastic-endpoint.exe` | `elastic-endpoint-driver.sys` | 主要 ETW + 少量 ntdll hook，配合 Elastic Agent 上传 |
| ESET | `ekrn.exe`, `eamsi.dll` | `eamonm.sys`, `epfwwfp.sys` | 用户态 hook 非常多（NtCreateFile / NtOpenProcess 等） |
| Sophos Intercept X | `SophosFileScanner.exe`, `SophosNtpService.exe` | `SophosED.sys`, `hmpalert.sys` | ntdll hook + HMPA 内存防护 + 内核 callback |
| Kaspersky | `avp.exe`, `klif.sys` | `klif.sys`, `klhk.sys` | 重用户态 hook + KLIF 自有微过滤 + 网络过滤驱动 |
| Trend Micro Apex One | `TmListen.exe`, `TmCCSF.dll` | `tmcomm.sys`, `tmactmon.sys` | 用户态 hook + 行为监控驱动 |
| Carbon Black | `RepMgr.exe`, `RepWAV.exe` | `ParityDriver.sys` | 偏内核 callback + ETW |

### 快速指纹脚本

```powershell
$edrSigs = @{
    'CSAgent'           = 'CrowdStrike Falcon'
    'SentinelAgent'     = 'SentinelOne'
    'elastic-endpoint'  = 'Elastic Defend'
    'ekrn'              = 'ESET'
    'MsMpEng'           = 'Microsoft Defender'
    'SophosFileScanner' = 'Sophos Intercept X'
    'avp'               = 'Kaspersky'
    'TmListen'          = 'Trend Micro Apex One'
    'cb'                = 'Carbon Black'
}

Get-Process | ForEach-Object {
    foreach ($k in $edrSigs.Keys) {
        if ($_.ProcessName -match $k) {
            "[+] $($edrSigs[$k]) detected: $($_.ProcessName) (PID $($_.Id))"
        }
    }
}

Get-ChildItem 'C:\Windows\System32\drivers\*.sys' |
    Where-Object { $_.Name -match 'CSAgent|Sentinel|elastic|eam|WdFilter|Sophos|klif|tmcomm|Parity' } |
    Select-Object Name, VersionInfo
```

## 2. 用户态 ntdll hook 重点函数

EDR 几乎一定 hook 的 `ntdll.dll` 导出（按 ATT&CK 行为分组）：

| 函数 | 监控的行为 | ATT&CK |
|------|-----------|--------|
| `NtCreateThreadEx` | 远程线程注入、QueueUserAPC 注入 | T1055.002 / T1055.004 |
| `NtAllocateVirtualMemory` | shellcode 申请 RWX 内存 | T1055 |
| `NtAllocateVirtualMemoryEx` | 跨进程内存申请（Win10+ 新 API） | T1055 |
| `NtProtectVirtualMemory` | 改页面权限 RW→RX | T1055 |
| `NtWriteVirtualMemory` | 跨进程写 shellcode | T1055.012 |
| `NtMapViewOfSection` | section-based 注入（Process Doppelganging / Ghosting） | T1055.013 |
| `NtCreateSection` | 配合 MapViewOfSection | T1055.013 |
| `NtOpenProcess` | 打开目标进程拿 handle | T1057 |
| `NtQueueApcThread` / `NtQueueApcThreadEx` | APC 注入 | T1055.004 |
| `NtCreateProcess` / `NtCreateProcessEx` / `NtCreateUserProcess` | 创建子进程（含 PPID spoof） | T1106 |
| `NtSetContextThread` | 改线程上下文（线程劫持注入） | T1055.003 |
| `NtResumeThread` | 注入完后恢复线程 | T1055 |
| `NtQuerySystemInformation` | 枚举进程 / 驱动 / handle | T1057 / T1082 |
| `NtAdjustPrivilegesToken` | 提权获取 SeDebugPrivilege 等 | T1134 |
| `NtLoadDriver` | 加载内核驱动（BYOVD） | T1543.003 |

### 验证 hook 是否存在

```powershell
# 简单：把磁盘 ntdll 和当前进程的 ntdll 反汇编 diff
# 1. 拿磁盘 ntdll
copy C:\Windows\System32\ntdll.dll C:\temp\ntdll_clean.dll

# 2. 在 windbg 中 attach 任意进程，导出当前 ntdll 的 .text 段
# .writemem c:\temp\ntdll_live.bin ntdll!.text L?<size>

# 3. 用 IDA / radare2 反汇编 NtAllocateVirtualMemory，正常应该是：
#    mov r10, rcx
#    mov eax, <SSN>
#    test byte ptr [...]
#    jne ...
#    syscall
#    ret
# 如果第一条变成 jmp <某地址>，那就是 hook
```

## 3. 内核 callback 监控点

EDR 注册的常见内核回调（一律可被 `attack-chain` 中的 BYOVD 路线 unregister，但代价高）：

| API | 注册的回调时机 | 防御方用途 |
|-----|--------------|-----------|
| `PsSetCreateProcessNotifyRoutineEx` | 进程创建 / 退出 | 拦截可疑 child process |
| `PsSetCreateThreadNotifyRoutine` | 线程创建 / 退出 | 检测远程线程注入 |
| `PsSetLoadImageNotifyRoutine` | DLL / EXE 加载到任意进程 | 模块完整性 / 未签名拦截 |
| `CmRegisterCallback` / `CmRegisterCallbackEx` | 注册表操作 | 持久化检测 |
| `ObRegisterCallbacks` | `OpenProcess` / `OpenThread` 句柄请求 | 防止 LSASS 句柄获取 (T1003.001) |
| `MmRegisterPhysicalMemoryCallback` | 物理内存映射 | 防 DMA / 内存取证 |
| `IoRegisterFsRegistrationChange` | 文件系统注册 | minifilter 协同 |
| `KeRegisterNmiCallback` | NMI（极少 EDR 用） | 异常监控 |
| `EtwRegister` (内核侧) | 内核 ETW 上报 | 跟 ETW-TI 共生 |

### 用 windbg 枚举已注册 callback

```text
0: kd> dx -r1 nt!PspCreateProcessNotifyRoutine
0: kd> dx -r1 nt!PspCreateThreadNotifyRoutine
0: kd> dx -r1 nt!PspLoadImageNotifyRoutine

0: kd> !object \Callback
0: kd> !object \Callback\ProcessObject
```

或用 PChunter / DRVHV 这类工具，普通用户可视化看 callback 列表。

## 4. 静态 dump hook 表（IDA + windbg 流程）

### 流程 A：单进程比对

```text
1. 找一个已被 EDR 注入用户态组件的进程（任意已存活进程）
2. windbg attach (-pn target.exe)
3. lm m ntdll  → 拿到模块基址
4. .writemem c:\temp\ntdll_live.bin ntdll+0x0 L?<image size>
5. 把 C:\Windows\System32\ntdll.dll 复制为 c:\temp\ntdll_disk.dll
6. 在 IDA 里加载两个文件，跳到 NtAllocateVirtualMemory：
     - disk：标准 prologue
     - live：第一条 jmp <0x7FFE000000xx>
7. 跟着 jmp 目标地址 → 那就是 EDR 的 trampoline，dump 出来
8. 进 trampoline 看它最终落到哪个 DLL，确认 EDR 模块名
```

### 流程 B：批量 hook 表生成

用 `HookHunter` 或自写脚本：

```powershell
# pseudo workflow，详见 references 提到的脚本
$disk = Get-Content C:\Windows\System32\ntdll.dll -Encoding Byte
$live = # 通过 OpenProcess + ReadProcessMemory 拿
# 对比 .text 段每个 export 的前 16 字节
```

## 5. pe-sieve 自动检测

`pe-sieve` 是侦察 EDR hook 与 implant 自检的首选：

```powershell
# 基本扫描
pe-sieve64.exe /pid 1234

# 推荐组合（含 shellcode 与 hook 检测）
pe-sieve64.exe /pid 1234 /shellc 3 /modules 3 /imp 3 /data 3 /dir hooks_dump

# 关键参数：
#   /shellc N    shellcode 扫描等级 (0-3)
#   /modules N   模块完整性检查 (0-3)
#   /imp N       IAT hook 检查
#   /data N      数据段扫描
#   /dir <path>  dump 输出目录
```

输出会在 `hooks_dump/<pid>.<name>/` 下产生 `*.tag` 文件，列出 hook 地址：

```text
modified_modules.tag 示例：
71f10000;ntdll.dll
71f1a3b0;hook;jmp_far
71f1c020;hook;jmp_near
```

可直接喂给 IDA 跳到对应 RVA 做后续分析。

### 在 implant 中嵌入 pe-sieve（自检）

实战中常把 `pe-sieve` 编译为 lib (`libpe-sieve`)，让 implant 启动时先自检：如果 ntdll 有 hook，就触发 unhook 流程；如果发现自己被 hook 反而要小心，可能在沙箱里。

## 6. API Monitor v2 动态观察

API Monitor v2（Rohitab）适合在 lab 里看 EDR 在何时何处插入 hook：

```text
1. 启动 API Monitor v2（管理员）
2. API Filter 勾选：
     - NT Native API → Memory Management
     - NT Native API → Process and Thread
     - Windows Defender / AMSI（如果可见）
3. Monitor New Process → 选择 implant 测试样本
4. 观察：
     - NtAllocateVirtualMemory 调用顺序
     - 是否被 EDR DLL 中转
5. 在 Modules tab 看哪些 EDR DLL 被 LoadLibrary 注入
```

## 7. 常见 EDR DLL（用户态）速查

| DLL | 厂商 | 备注 |
|-----|------|------|
| `umppc*.dll` | Microsoft Defender | MpClient userland |
| `mpoav.dll` | Microsoft Defender | AMSI provider |
| `aswAMSI.dll` | Avast | AMSI provider |
| `eamsi.dll` | ESET | AMSI provider |
| `IDPMServiceClient.dll` | Sophos | HMPA 注入 |
| `klsihk64.dll` | Kaspersky | 注入到目标进程 |
| `CrowdStrike.Sensor.dll` | CrowdStrike | 旧版本，新版主要靠内核 |
| `SentinelInjection64.dll` | SentinelOne | 用户态注入 |
| `TmUmEvt64.dll` | Trend Micro | 行为监控 |

确认目标 EDR 后，再决定逆向哪个 DLL 取 hook 表。

## 参考链接

- pe-sieve：<https://github.com/hasherezade/pe-sieve>
- HollowsHunter：<https://github.com/hasherezade/hollows_hunter>
- API Monitor v2：<http://www.rohitab.com/apimonitor>
- MITRE ATT&CK T1562：<https://attack.mitre.org/techniques/T1562/>
- MITRE ATT&CK T1055：<https://attack.mitre.org/techniques/T1055/>
- ired.team EDR notes：<https://www.ired.team/offensive-security/defense-evasion>

## 路由回调

完成 hook 调研后，回到 `SKILL.md` 的 Step 3 选择绕过技术组合，然后按 `references/unhook-techniques.md` 与 `references/telemetry-blinding.md` 执行。
