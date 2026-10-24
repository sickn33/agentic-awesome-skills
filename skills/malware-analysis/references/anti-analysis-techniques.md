# 反分析技术检测

> 反分析技术分类示例；未提供完整规则库或独立验证证据
> Source: Anti-VM YARA Library (Journal of Cybersecurity and Privacy, April 2026)

## 九类反分析技术

### 1. 定时检测（12 种）

```text
技术原理: 恶意代码通过长时间睡眠等待，使沙箱超时退出。

常见实现:
□ Sleep(300000)  // 5 分钟睡眠
□ NtDelayExecution(60000)  // 直接 syscall
□ GetTickCount 循环等待
□ QueryPerformanceCounter 精确延时
□ SetTimer + 回调执行恶意代码
□ WaitForSingleObject 等待内核对象

YARA 检测难度: 低（时序行为需动态分析）
绕过方法: CAPE sleep_skip、加速时间流逝
```

### 2. CPU 指纹检测（8 种）

```text
□ CPUID 指令 → hypervisor 签名
  - hv: "VMwareVMware", "VBoxVBoxVBox"
  - leaf 0x40000000 → Hypervisor Vendor

□ 核心数检测: < 2 核心 → 可能是沙箱
□ AMD-V / Intel VT-x: 沙箱通常启用硬件虚拟化

YARA 检测: 中（CPUID 指令序列可被静态识别）
```

### 3. 固件/BIOS 检测（6 种）★ YARA 强项

```text
□ SMBIOS 字符串:
  - Manufacturer: "VMware, Inc.", "innotek GmbH"
  - Product: "VirtualBox", "KVM", "QEMU"
  - Serial: "0"（默认序列号）

□ ACPI 表: WAET / VRTUAL / BOCHS 签名

YARA 检测: 高（87% 精度） — 字符串字面量存在于二进制中
```

### 4. 硬件指纹（10 种）

```text
□ MAC 地址 OUI:
  - VMware: 00:0C:29, 00:50:56, 00:05:69
  - VirtualBox: 08:00:27
  - Hyper-V: 00:15:5D

□ 磁盘序列号: "VBOX HARDDISK", "VMware Virtual S"
□ 显卡名称: "VMware SVGA II", "VirtualBox Graphics Adapter"

GetAdapterInfo / NtQuerySystemInformation → 读取硬件信息
```

### 5. API Hook 枚举（5 种）

```text
□ 检测 EDR/AV 的 ntdll.dll hook
  - 读取 ntdll.dll 的磁盘副本 → 对比内存中的版本
  - 如果 syscall stub 被修改 → 有 hook

□ 检测 sandbox hook
  - LoadLibrary → 对比函数序言
  - WriteProcessMemory → 检测 inline hook
```

### 6. 进程检测（15 种）★ YARA 强项

```text
□ 安全工具进程名检查:
  - "wireshark.exe", "procmon.exe", "processhacker.exe"
  - "frida-server", "magiskd", "x64dbg.exe"
  - "ida64.exe", "ollydbg.exe", "windbg.exe"

□ 沙箱 Agent 检测:
  - "python.exe" (CAPE agent)
  - "VBoxTray.exe", "VBoxService.exe"

CreateToolhelp32Snapshot → Process32First/Next 遍历
```

### 7. 文件系统检测（12 种）★ YARA 强项

```text
□ 沙箱/VM 文件路径:
  - C:\Program Files\VMware\
  - C:\Program Files\Oracle\VirtualBox\
  - C:\agent\agent.pyw (CAPE)
  - /usr/bin/qemu-ga

□ 虚拟设备文件:
  - \\.\VBoxMiniRdrDN
  - \\.\HGFS (VMware Shared Folders)
  - \\.\pipe\vbox*

YARA 检测: 高 — 路径字符串明确
```

### 8. 注册表检测（8 种）★ YARA 强项

```text
□ VM 相关注册表键:
  - HKLM\SOFTWARE\VMware, Inc.\
  - HKLM\HARDWARE\ACPI\DSDT\VBOX__
  - HKLM\SYSTEM\ControlSet001\Services\VBoxSF

□ 沙箱检测:
  RegOpenKeyEx / RegQueryValueEx 组合检测
```

### 9. 窗口检测（8 种）★ YARA 强项

```text
□ 调试器窗口:
  - "x64dbg", "OllyDbg", "IDA", "WinDbg"
  - "Wireshark", "Process Hacker"

□ 沙箱窗口:
  FindWindow → 枚举顶级窗口 → 匹配已知安全工具窗口标题

YARA 检测: 高 — 窗口标题字符串存在于内存/二进制
```

## 性能证据边界

导入文档声称的规则数量、精度和论文来源未附 DOI、完整规则库或可复现实验，不能当作已验证性能。类别计数也不是本目录的完整检测覆盖。对每条规则记录数据集、正负样本标签、误报/漏报和工具版本；字符串命中只表示候选特征。

## 高级反分析技术

### 定时逃逸（Beyond Simple Sleep）

```c
// 检测时间加速
LARGE_INTEGER freq, start, end;
QueryPerformanceFrequency(&freq);
QueryPerformanceCounter(&start);
Sleep(1000);
QueryPerformanceCounter(&end);
double elapsed = (double)(end.QuadPart - start.QuadPart) / freq.QuadPart;
if (elapsed < 0.8) { /* candidate timing anomaly; scheduler noise is not proof */ } // 时间被加速 → 沙箱
```

### 基于异常的检测

```c
// 触发除零异常 → 检查 SEH 是否被 Hook
__try {
    volatile int x = 0;
    volatile int y = 1 / x;
} __except(EXCEPTION_EXECUTE_HANDLER) {
    // 正常: 异常被捕获
    // 不正常: EDR 的 vectored exception handler 先处理了 → 说明有 hook
}
```

### Return Address 完整性检查

```asm
; 调用前保存返回地址预期值
call    [ntdll.NtAllocateVirtualMemory]
; 返回后检查栈上返回地址是否被篡改
cmp     [rsp], expected_return_address
jne     edr_detected
```

## 最佳实践

1. **分层检测**: 静态 YARA + 动态行为 + 签名 (不要只依赖一种)
2. **定期更新规则**: 新 VM/沙箱版本需要新检测规则
3. **FP 验证**: 每条规则必须在良性样本集上验证（推荐: Assemblage 92,508 样本）
4. **组合条件**: 单一检测可能误报，多条件组合提高精度
5. **关注字符串模式**: 固件/BIOS/文件/注册表/窗口检测在 YARA 中最有效

Source: "Automating the Detection of Evasive Windows Malware" (April 2026), CAPE docs, Joe Sandbox Analysis Reports

---

## Agent 动作索引（Issue #65）

检测分类见上文九类；**触发后 agent 怎么做** 的 A–T 全表与 Evidence 标签见：

`skills/reverse-engineering/anti-analysis.md` → **Agent 响应菜谱 A–T**

主路径速查：`skills/reverse-engineering/references/re-agent-workflow.md` §3.3