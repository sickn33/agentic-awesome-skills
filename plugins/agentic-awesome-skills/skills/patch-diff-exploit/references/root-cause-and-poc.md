# 根因反推与 PoC 编写

拿到 diff 报告只是第一步。真正的工作是看着 before/after 反推出 bug class，然后写出能稳定触发的 PoC。本文档给出反推模式表、LLM 辅助 prompt、PoC 编写模板、验证方法。

---

## 1. 补丁修复模式 → 漏洞类型反查

### 1.1 整数溢出 / 下溢

**新增模式**:
```c
// 加法溢出检查
if (a > UINT_MAX - b) goto error;
if (a + b < a) goto error;
__builtin_add_overflow(a, b, &sum);

// 乘法溢出检查
if (a != 0 && b > UINT_MAX / a) goto error;
__builtin_mul_overflow(a, b, &prod);

// 减法下溢检查
if (a < b) goto error;
```

**反推**:
- 看 `a` 和 `b` 是否来自用户态可控输入
- 通常前后会有 `kmalloc(a+b)` / `RtlAllocateHeap(size)` 等分配，溢出后分配过小 → 后续 memcpy → 堆 OOB 写

**PoC 思路**:
- 让 `a + b` 实际溢出回小值，但拷贝长度还按未溢出的算
- 边界值: `a = 0xFFFFFFF0, b = 0x100` (32 位) / `a = 0xFFFFFFFFFFFFFFF0, b = 0x100` (64 位)

---

### 1.2 越界读 / 越界写

**新增模式**:
```c
if (idx >= ARRAY_SIZE(arr)) return -EINVAL;
if (offset + len > buf_size) return STATUS_INVALID_PARAMETER;
if (len > sizeof(local_buf)) return -E2BIG;

// Windows 内核典型
if (InputBufferLength < sizeof(MY_STRUCT)) return STATUS_BUFFER_TOO_SMALL;
if (req->Length > KERNEL_MAX) return STATUS_INVALID_PARAMETER;
```

**反推**:
- 看新增 if 守护了哪个后续操作（memcpy / memmove / 数组下标）
- 没守护前的版本可以传超大 length / 超大 index

**PoC 思路**:
- 把 length 字段设成超过 buf 的值
- 把 index 字段设成 array_size + N
- 用 IOCTL InputBufferLength 调到刚好绕过旧检查但触发新检查

---

### 1.3 竞争条件 (Race / TOCTOU)

**新增模式**:
```c
// 加锁
KeAcquireSpinLockAtDpcLevel(&obj->Lock);
mutex_lock(&inode->i_mutex);
spin_lock(&list->lock);

// 引用计数原子化
InterlockedIncrement(&obj->RefCount);
ObReferenceObject(obj);
get_file(file);

// 检查 - 操作之间不再释放锁
```

**反推**:
- 加锁说明此前同一对象在并发场景下被改了
- 引用计数加 ref 说明此前对象可能在用的时候被释放
- 找两个 syscall 路径，其中一个会修改 / 释放对象，另一个会用对象

**PoC 思路**:
```c
// 经典 hammer
DWORD WINAPI thread_close(LPVOID arg) {
    while (running) CloseHandle((HANDLE)arg);
    return 0;
}
DWORD WINAPI thread_use(LPVOID arg) {
    while (running) DeviceIoControl((HANDLE)arg, IOCTL_X, ...);
    return 0;
}
// CreateThread 各开几个，sleep 30s 等崩
```

- 多线程绑核 (SetThreadAffinityMask) 提高竞争概率
- 用 `_mm_pause()` / `sched_yield()` 控制窗口
- 配合 syscall pinning（同一对象的两个不同入口）

---

### 1.4 未初始化内存信息泄漏

**新增模式**:
```c
// 字段清零
RtlZeroMemory(&output, sizeof(output));
memset(buf, 0, sizeof(buf));
output.reserved = 0;
output.padding = 0;
output._pad1 = 0;

// 整个结构归零再赋值
KeStackAttachProcess; output = (MY_STRUCT){0};
```

**反推**:
- 旧版从内核栈 / 内核堆拷数据到用户态时没清 padding / reserved 字段
- padding 内残留前一次函数调用的栈数据 → 内核地址泄漏 (绕 KASLR)

**PoC 思路**:
- 反复调 IOCTL 取 output buffer
- 把每个字节按 8 字节解析，找像内核地址的值（Windows: 0xFFFFxxxx / Linux: 0xFFFFFFFFxxxxxxxx）
- 找规律 → 推 kbase

---

### 1.5 UAF / 引用计数错误

**新增模式**:
```c
// Windows
if (InterlockedDecrement(&obj->RefCount) == 0) {
    Free(obj);
    return;
}

// Linux
if (refcount_dec_and_test(&obj->ref)) {
    kfree(obj);
}

// 或新增 ObReferenceObject 在某条路径上（之前漏加 ref）
```

**反推**:
- 旧版某条出错路径 free 了对象但调用者还会用
- 或者多路径同时持有指针，其中一条 free 后其他没感知

**PoC 思路**:
```c
// spray → free → reuse
HANDLE objs[1000];
for (int i = 0; i < 1000; i++) objs[i] = CreateObject(...);
trigger_free(objs[500]);                          // 触发漏洞 free
spray_kernel_pool(0xDEADBEEFDEADBEEF, target_sz); // 占住被 free 的洞
use_after_free(objs[500]);                        // 触发用 -> 控数据
```

- Windows 内核常用 `NtAllocateReserveObject` / Pipe 属性 / Window Class 名称喷
- Linux 常用 `msgsnd` / `setxattr` / `userfaultfd`-stalled vma 喷

---

### 1.6 用户态指针未校验

**新增模式**:
```c
// Windows
ProbeForRead(UserBuffer, Length, sizeof(ULONG));
ProbeForWrite(UserBuffer, Length, sizeof(ULONG));

// __try/__except 包裹访问
__try {
    Probe...
    RtlCopyMemory(KernelBuf, UserBuffer, Length);
} __except(EXCEPTION_EXECUTE_HANDLER) { ... }

// Linux
if (!access_ok(VERIFY_WRITE, ptr, size)) return -EFAULT;
copy_from_user(kbuf, uptr, len);
```

**反推**:
- 旧版直接 deref 用户态指针没 ProbeForRead/access_ok
- 用户态可以传内核地址 → 任意地址读 / 任意地址写

**PoC 思路**:
- 传一个内核空间指针（例如 ntoskrnl 某个全局变量地址）作为输入指针
- 内核执行 `*UserBuffer = X` 时实际写到内核地址 → 任意写

---

### 1.7 权限校验缺失

**新增模式**:
```c
if (!SeAccessCheck(...)) return STATUS_