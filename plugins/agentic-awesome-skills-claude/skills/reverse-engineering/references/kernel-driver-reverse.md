# 内核驱动逆向参考

> 覆盖 Windows/Linux 内核驱动逆向、Rootkit 分析、C/C++ 二进制模式识别。

---

## Windows 驱动逆向

### 驱动类型

| 类型 | 特征 | 分析重点 |
|------|------|---------|
| WDM (Windows Driver Model) | 老式驱动，手动管理 IRP | DriverEntry → 设备创建 → Dispatch 例程 |
| KMDF (Kernel Mode Driver Framework) | 现代框架，事件驱动 | EvtDriverDeviceAdd → Queue → I/O 回调 |
| WDF (Windows Driver Foundation) | KMDF + UMDF 统称 | 看 WdfDriverCreate 调用 |
| Minifilter | 文件系统过滤驱动 | FltRegisterFilter → Pre/Post 回调 |

### WDM 驱动分析流程

```text
1. 找 DriverEntry（入口点）
   - IDA 自动识别，或搜索 IoCreateDevice / IoCreateSymbolicLink

2. 找设备名和符号链接
   - IoCreateDevice → DeviceName（如 \Device\MyDriver）
   - IoCreateSymbolicLink → SymLink（如 \DosDevices\MyDriver）

3. 找 Dispatch 例程
   - DriverObject->MajorFunction[IRP_MJ_DEVICE_CONTROL] = DispatchIoctl
   - 这是用户态通过 DeviceIoControl 调用的入口

4. 分析 IOCTL 处理
   - switch(IoControlCode) 分发不同功能
   - IOCTL 编码：CTL_CODE(DeviceType, Function, Method, Access)
   - Method: METHOD_BUFFERED / METHOD_IN_DIRECT / METHOD_OUT_DIRECT / METHOD_NEITHER

5. 找漏洞
   - 用户可控缓冲区未验证长度 → 溢出
   - METHOD_NEITHER 直接使用用户指针 → 任意读写
   - 未检查 IOCTL 权限 → 非特权用户可调用
```

### IOCTL 编码解析

```python
# 解析 IOCTL code
def decode_ioctl(code):
    device_type = (code >> 16) & 0xFFFF
    access = (code >> 14) & 0x3
    function = (code >> 2) & 0xFFF
    method = code & 0x3
    
    methods = {0: "BUFFERED", 1: "IN_DIRECT", 2: "OUT_DIRECT", 3: "NEITHER"}
    access_types = {0: "ANY", 1: "READ", 2: "WRITE", 3: "READ|WRITE"}
    
    return f"DevType=0x{device_type:X} Func=0x{function:X} Method={methods[method]} Access={access_types[access]}"

# 示例
decode_ioctl(0x80002034)
# DevType=0x8000 Func=0x80D Method=BUFFERED Access=ANY
```

### IDA 插件

| 插件 | 用途 | 链接 |
|------|------|------|
| **Driver Buddy Reloaded** | 自动识别 IOCTL、Dispatch、设备名 | https://github.com/VoidSec/DriverBuddyReloaded |
| **WinDbg + IDA** | 内核调试 + 静态分析配合 | 内置 |
| **FLIRT/Lumina** | 识别 WDK 库函数 | IDA 内置 |

### 参考文章

- [Windows Drivers RE Methodology (VoidSec)](https://voidsec.com/windows-drivers-reverse-engineering-methodology/) — 最完整的 WDM 驱动逆向方法论
- [Driver Reversing 101](https://eversinc33.com/posts/driver-reversing.html) — WDM vs KMDF 对比
- [Methodology of Reversing Vulnerable Killer Drivers](https://whiteknightlabs.com/2025/10/28/methodology-of-reversing-vulnerable-killer-drivers/) — 漏洞驱动分析

---

## Linux 内核模块逆向

### LKM (Loadable Kernel Module) 结构

```text
关键函数：
- init_module / module_init → 模块加载时执行
- cleanup_module / module_exit → 模块卸载时执行

关键结构：
- struct file_operations → 字符设备的 open/read/write/ioctl
- struct net_device_ops → 网络设备操作
- struct block_device_operations → 块设备操作
```

### 分析流程

```text
1. 确认是内核模块
   file module.ko → "ELF 64-bit ... relocatable"（注意是 relocatable 不是 executable）

2. 找 init/exit 函数
   readelf -s module.ko | grep -E "init_module|cleanup_module"
   或在 .modinfo section 找模块信息

3. 找 file_operations 结构
   搜索 register_chrdev / cdev_add / misc_register
   → 找到 fops 结构体 → 定位 ioctl/read/write 处理函数

4. 分析 ioctl 处理
   unlocked_ioctl / compat_ioctl 函数
   → switch(cmd) 分发

5. 找 Rootkit 行为
   - 修改 sys_call_table → syscall hook
   - 修改 /proc 文件系统 → 隐藏进程/文件
   - 注册 netfilter hook → 隐藏网络连接
   - 修改 VFS 层 → 隐藏文件
```

### Rootkit 常见技术

| 技术 | 特征 | 检测方法 |
|------|------|---------|
| syscall table hook | 修改 `sys_call_table` 条目 | 对比内存中的表与磁盘上的 vmlinux |
| VFS hook | 修改 `file_operations` 函数指针 | 检查 fops 指针是否指向内核代码段外 |
| Netfilter hook | `nf_register_net_hook` | 遍历 netfilter hook 链表 |
| kprobe/ftrace hook | 注册 kprobe 或 ftrace 回调 | 检查 ftrace 注册列表 |
| eBPF rootkit | 加载恶意 BPF 程序 | `bpftool prog list` |
| DKOM | 直接修改内核对象（进程链表） | 遍历 task_struct 链表对比 /proc |

### 工具

| 工具 | 用途 |
|------|------|
| `crash` | 内核 dump 分析 |
| `volatility3` | 内存取证（Linux profile） |
| `dmesg` / `journalctl` | 内核日志 |
| `lsmod` / `/proc/modules` | 已加载模块列表 |
| `modinfo` | 模块元信息 |
| `strace` | 系统调用跟踪（用户态视角） |

---

## C/C++ 逆向模式识别

### C 语言常见模式

| 源码模式 | 反汇编特征 |
|---------|-----------|
| `if-else` | `cmp` + `jcc`（条件跳转） |
| `switch-case` | 跳转表（`jmp [rax*8 + table]`）或连续 `cmp` |
| `for` 循环 | `cmp` + `jl/jle` + 循环体 + `inc/add` + `jmp` 回跳 |
| `while` 循环 | 条件判断在循环顶部 |
| `do-while` | 条件判断在循环底部 |
| 函数指针调用 | `call rax` 或 `call [reg+offset]` |
| `struct` 访问 | `[reg+固定偏移]`（如 `[rdi+0x10]`） |
| `malloc` + 使用 | `call malloc` → 返回值存入寄存器 → 后续用该寄存器+偏移访问 |
| 字符串比较 | `call strcmp` 或 `repe cmpsb` |

### C++ 特有模式

| 源码模式 | 反汇编特征 |
|---------|-----------|
| **虚函数调用** | `mov rax, [rcx]`（取 vtable）→ `call [rax+offset]`（调用虚函数） |
| **构造函数** | 分配内存 → 写入 vtable 指针 → 初始化成员 |
| **析构函数** | 清理成员 → 可能调用 `operator delete` |
| **this 指针** | 第一个参数（rcx/rdi）是对象指针 |
| **继承** | vtable 中包含父类虚函数 + 子类覆盖 |
| **多重继承** | 对象内有多个 vtable 指针（偏移不同） |
| **RTTI** | vtable 前面有 `type_info` 指针 |
| **异常处理** | `__cxa_throw` / `_CxxThrowException` |
| **STL 容器** | `std::vector`: `{begin, end, capacity}` 三指针结构 |
| **std::string** | 小字符串优化（SSO）：短串内联，长串堆分配 |

### vtable 逆向方法

```text
1. 找 vtable
   - 搜索连续的函数指针数组（在 .rodata 或 .rdata 段）
   - 构造函数中 `mov [rcx], offset vtable` 写入 vtable 指针

2. 确定类层次
   - vtable 前 -8 偏移处通常是 RTTI 指针（如果未 strip）
   - 多个 vtable 共享前几个条目 → 继承关系

3. 标注虚函数
   - vtable[0] 通常是析构函数（或 deleting destructor）
   - 后续按偏移标注：vtable[1] = func1, vtable[2] = func2...

4. IDA 中操作
   - 在 vtable 地址创建 struct（每个字段是函数指针）
   - 对 `call [rax+offset]` 添加注释标明调用的虚函数
```

### 结构体恢复

```text
方法 1：从访问模式推断
  mov eax, [rdi+0x00]  → field_0: int/ptr (4/8 bytes)
  mov ecx, [rdi+0x08]  → field_8: int/ptr
  movss xmm0, [rdi+0x10] → field_10: float

方法 2：从 sizeof 推断
  call malloc(0x30) → 结构体大小 0x30 (48 bytes)
  
方法 3：从构造函数推断
  构造函数会初始化所有字段 → 字段类型和偏移一目了然

方法 4：用 IDA 的 "Create struct" 功能
  选中访问模式 → Edit → Struct → Create struct from selection
```

---

## 常见编译器特征

| 编译器 | 识别特征 |
|--------|---------|
| MSVC | `_security_cookie` 检查、`__fastcall` 调用约定、Rich Header |
| GCC | `__stack_chk_fail`、`-fstack-protector`、`.note.GNU-stack` |
| Clang/LLVM | 类似 GCC 但优化模式不同、`__asan_*`（如果开了 sanitizer） |
| MinGW | GCC 特征 + Windows API 调用 |
| AOSP Clang | Android 特有的 `__android_log_print`、PGO 标记 |

### 优化级别识别

| 优化级别 | 特征 |
|---------|------|
| -O0 | 大量冗余 mov、每个变量都在栈上、函数不内联 |
| -O1 | 基本优化、部分变量在寄存器 |
| -O2 | 循环展开、函数内联、尾调用优化 |
| -O3 / -Os | 激进内联、向量化（SIMD）、代码难读 |
| PGO | 热路径优化、冷代码分离到 `.text.cold` |
| LTO | 跨模块内联、全局死代码消除 |

---

## 内核调试环境

### Windows

```text
调试器：WinDbg Preview
连接方式：网络调试（推荐）或串口

被调试机设置：
bcdedit /debug on
bcdedit /dbgsettings net hostip:192.168.x.x port:50000

调试机连接：
WinDbg → File → Attach to Kernel → Net → Port:50000 Key:xxx

常用命令：
!analyze -v          # 自动分析崩溃
lm                   # 列出已加载模块
!drvobj \Driver\xxx  # 查看驱动对象
dt nt!_DRIVER_OBJECT # 显示结构体
bp module!function   # 下断点
```

### Linux

```text
调试器：GDB + QEMU 或 kgdb

QEMU 内核调试：
qemu-system-x86_64 -kernel bzImage -s -S ...
gdb vmlinux -ex "target remote :1234"

常用命令：
info threads         # 内核线程
lx-symbols           # 加载内核符号（需要 scripts/gdb/）
p init_task          # 查看 init 进程
lx-dmesg             # 内核日志
```

---

## Agent 动作锚点（Issue #65 U–AV）

与 `references/nonpe-format-cookbook.md` §5 对齐（短表，不替代上文流程）：

| ID | 动作 | Evidence |
|----|------|----------|
| AG | `DriverEntry` 短 → 扫 `MajorFunction` 非空槽，优先 DEVICE_CONTROL/CREATE | `E-driver-irp-handlers` |
| AH | 建立 IOCTL 控制码 → handler 表与 METHOD_* | `E-driver-ioctl` |
| AI | 疑 BYOVD：对照公开脆弱驱动列表；记名/哈希/签名与调用意图；**不写 exploit 步骤** | `E-driver-byovd` |

## 参考资源

| 资源 | 说明 | 链接 |
|------|------|------|
| VoidSec 驱动逆向方法论 | Windows WDM 驱动完整分析流程 | https://voidsec.com/windows-drivers-reverse-engineering-methodology/ |
| Elastic Rootkit 系列 | Linux Rootkit 分类+检测 | https://security-labs.elastic.co/security-labs/linux-rootkits-1-hooked-on-linux |
| Driver Buddy Reloaded | IDA 驱动分析插件 | https://github.com/VoidSec/DriverBuddyReloaded |
| LOLDrivers | 已知漏洞驱动列表 | https://www.loldrivers.io/ |
| Windows Driver Samples | 微软官方驱动示例 | https://github.com/microsoft/Windows-driver-samples |
| Linux Kernel Module Programming | 内核模块开发教程 | https://sysprog21.github.io/lkmpg/ |
| Trail of Bits - Devirtualizing C++ | vtable 逆向方法 | https://blog.trailofbits.com/2017/02/13/devirtualizing-c-with-binary-ninja/ |
