---
name: pwn-chain
description: "Go from reverse engineering to a working exploit: stack/heap/kernel pwn workflows with pwntools, libc-database, ROP, and stabilization from CTF to authorized remote targets."
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

- A binary vulnerability is understood and needs a reliable exploit.
- Porting a CTF-style exploit to an authorized real-world target.

## 适用范围

当任务属于以下场景时使用本 skill：

1. **拿到二进制 + 已知漏洞点** — 静态/审计/fuzz 已经找到溢出/UAF/double free，需要从触发到拿 shell
2. **CTF 题已经本地通了，远程打不通** — 远端环境差异导致脚本失效，需要稳定化
3. **真实目标的二进制利用** — SRC / 红队场景下，已经识别到内存损坏漏洞，需要构造 RCE
4. **Linux 内核驱动的 ioctl bug** — 用户态触发，目标是提权到 root

**前提**：你已经知道"哪里炸了"。本 skill 不负责发现漏洞（那是 fuzzing / 审计），只负责"从漏洞点写出 exploit"。

### 与其他 skill 的分工

| 场景 | 用什么 |
|------|--------|
| 识别 custom VM / anti-debug / 复杂 obfuscation | `reverse-engineering/` |
| 从零打开二进制做静态分析 | `ida-reverse/` 或 `radare2/` |
| **有漏洞点，写 exploit 打通远程** | **本 skill** |
| 把 pwn 拿到的 shell 整合进完整攻击链 | `attack-chain/`（下游） |

`reverse-engineering/` 关注"理解程序在干什么"（模式识别、协议还原、解 CTF 题里的奇怪机制）；本 skill 关注"把已经看懂的漏洞变成可执行的攻击"。两者经常配套使用，但分工清晰。

## 核心工作流

```text
Step 1: 确认漏洞类型 + 保护机制
   ├─ checksec ./vuln（NX / Canary / PIE / RELRO / Fortify）
   ├─ file ./vuln  + readelf -d ./vuln
   ├─ 漏洞分类：栈溢出 / 格式化字符串 / 堆 (UAF/DF/OF) / 整数 / 竞态 / 内核
   └─ → 决定走哪个 references/

Step 2: 选择利用策略
   ├─ NX 关 + 无 ASLR → 直接 shellcode
   ├─ NX 开 + 给 libc → ret2libc / one_gadget
   ├─ NX 开 + 不给 libc → leak 后 libc-database 反查
   ├─ 堆 → 按 glibc 版本对应技术 (tcache/fastbin/unsorted/large)
   └─ 内核 → commit_creds / modprobe_path / core_pattern

Step 3: 准备 libc + gadget
   ├─ libc-database：./find puts 0x6f0
   ├─ ROPgadget --binary ./libc.so.6 --only "pop|ret"
   ├─ one_gadget ./libc.so.6
   └─ 计算 base：leak_addr - libc.sym['puts']

Step 4: 写 pwntools 模板（本地 process）
   ├─ context.binary = ELF('./vuln')
   ├─ p = process('./vuln')  /  p = gdb.debug('./vuln','b *main+xx')
   ├─ payload = cyclic(N) + p64(ret) + ...
   └─ p.interactive()

Step 5: 本地通
   ├─ 反复 attach + 看寄存器 + 调 offset
   ├─ 用 pwndbg/GEF 的 vmmap / heap / bins / telescope
   └─ 跑通后切 remote()

Step 6: 远程稳定化
   ├─ libc 偏移：用 leak 反查 libc-database，不要拍脑袋
   ├─ 栈对齐：16-byte 不对齐 → movaps 崩 → 加一个 ret gadget
   ├─ 远程网络延迟 → recvuntil 精确锚字符串，禁用模糊 sleep
   ├─ 远程缓冲：sendlineafter 比 sendline 更稳
   ├─ 堆喷成功率：放大 spray 数量 + 留 padding chunk 防合并
   └─ 多次跑：写 while True 验证成功率 ≥ 95%
```

## 典型场景

### 场景 1：远程 64 位二进制 (NX+PIE+canary, 给了 libc)

```text
已有：./vuln（64-bit ELF, NX, PIE, canary）+ ./libc.so.6 + nc host port
漏洞：read(buf, 0x200) 但 buf 只有 0x40 字节 → 栈溢出
保护：canary 拦住，PIE 让 .text 随机化

策略：
1. 先 leak canary（栈/格式化字符串/部分读）
2. 再 leak 一个 libc 函数地址（puts@got）
3. 用 libc.address = leaked - libc.sym['puts'] 算 libc base
4. one_gadget ./libc.so.6 选一个约束能满足的 magic gadget
5. payload = padding + canary + saved_rbp + (pop_rdi + bin_sh + system) 或直接 one_gadget
6. 加一个 ret gadget 修栈对齐（关键！）
```

完整模板参见 `references/stack-pwn.md`。

### 场景 2：Linux 内核驱动 ioctl 越界写 → 拿 root

```text
已有：vmlinux + bzImage + initramfs.cpio.gz + 自定义 vuln.ko
漏洞：ioctl(0x1337, ptr) 里 copy_from_user 长度可控 → kernel heap overflow (kmalloc-64 slab)
保护：SMEP, SMAP, KASLR, KPTI

策略：
1. 改 init 脚本拿到 root shell（CTF）或先 leak KASLR base 再继续（真实）
2. 通过 /proc/kallsyms（可能限权）或未初始化堆喷 leak 内核基址
3. 在 kmalloc-64 slab 里喷 tty_struct / msg_msg / pipe_buffer
4. 覆盖 vtable 指针指向用户态 → 不行（SMEP），改走 stack pivot + 内核 ROP
5. ROP 链：prepare_kernel_cred(0) → commit_creds → swapgs+iretq → 用户态 execve("/bin/sh")
6. 或更省事：覆盖 modprobe_path 为 "/tmp/x"，写一个 /tmp/x，然后触发 modprobe
```

完整模板参见 `references/kernel-pwn.md`。

## 按需自举 (On-Demand Bootstrap)

### 工具依赖

| 工具 | 用途 | 安装方式 |
|------|------|---------|
| pwntools | exploit 编写框架 | `pip install pwntools` |
| GEF | gdb 增强（推荐内核 + 用户态） | `git clone https://github.com/bata24/gef` (fork 维护活跃) |
| pwndbg | gdb 增强（堆调试体验最好） | `git clone https://github.com/pwndbg/pwndbg && ./setup.sh` |
| ROPgadget | gadget 搜索 | `pip install ropgadget` |
| Ropper | gadget 搜索（备选，支持架构多） | `pip install ropper` |
| one_gadget | libc magic gadget 查找 | `gem install one_gadget`（需 ruby） |
| libc-database | libc 指纹反查 | `git clone https://github.com/niklasb/libc-database && ./get` |
| qemu-system-x86_64 | 内核题调试 | `apt install qemu-system-x86` |
| binwalk / cpio | initramfs 拆包 | `apt install binwalk cpio` |
| patchelf | 切换 libc 版本 | `apt install patchelf` |

### Bootstrap 检查脚本

```bash
# 一键检查 + 安装核心工具
for t in pwntools ropgadget ropper; do
  pip show $t >/dev/null 2>&1 || pip install $t
done

command -v one_gadget >/dev/null || gem install one_gadget

[ -d ~/tools/libc-database ] || git clone https://github.com/niklasb/libc-database ~/tools/libc-database
[ -d ~/tools/libc-database/db ] || (cd ~/tools/libc-database && ./get ubuntu debian)

[ -d ~/tools/pwndbg ] || (git clone https://github.com/pwndbg/pwndbg ~/tools/pwndbg && cd ~/tools/pwndbg && ./setup.sh)
```

### 同一工具自动安装失败 2 次后

停止重试，输出结构化手动安装步骤（pip 源 / gem 源 / git 国内镜像 / apt 源）让用户确认。

## 路由上下文

**上游入口**: `skills/SKILL.md`（总控）、`routing.md`
**触发条件**: 有二进制 + 已识别漏洞点，需要写 exploit

**上游 skill（先用它们再回到本 skill）**:
- 还没看懂二进制在干什么 → `reverse-engineering/`
- 需要静态详细分析 → `ida-reverse/`
- 快速侦察确认架构/保护机制 → `radare2/`

**下游 skill（拿到 shell 之后）**:
- 整合进完整攻击链（横向、提权、持久化）→ `attack-chain/`

**子模块导航**:
- 栈类利用（ret2libc / ret2csu / one_gadget / 栈对齐）→ `references/stack-pwn.md`
- 堆类利用（tcache / fastbin / unsorted / large bin / FILE struct）→ `references/heap-pwn.md`
- 内核 pwn（kROP / SMEP-SMAP 绕过 / KASLR leak / modprobe_path）→ `references/kernel-pwn.md`

## 注意事项

- **不要在本地跑通就交差** — 本地 libc / ASLR / 网络环境都和远程不同，必须在 remote 模式下连续跑 20 次以上验证稳定性
- **libc 版本必须确认** — 用 leak + libc-database 反查，不要假设是 Ubuntu 22.04 默认 libc
- **栈对齐是 64 位的常见坑** — `movaps xmm0, [rsp]` 在 rsp 未 16 字节对齐时段错误，加一个空 `ret` gadget 解决
- **堆利用对 glibc 版本极敏感** — tcache 在 2.27 引入，safe-linking 在 2.32 引入，2.34 移除 hooks，每个版本利用路径不同
- **内核 pwn 必须先确认 cpu 标志** — qemu 启动参数里有没有 +smep +smap +pku 直接决定 ROP 链怎么写
- **KASLR leak 一次就够** — 拿到一个内核地址后所有地址都算偏移，不要反复 leak

## 任务完成自检（声称完成前 MUST 通过）

- [ ] 我是否执行了工作流中的每一步（而不是只阅读）？
- [ ] 我是否基于 `tool-index` 使用了真实工具路径？
- [ ] 我是否产出了可复现证据（命令/脚本/截图/报告）？
- [ ] 我是否完成并回写了 RULES 要求的 Checklist 项？

## Limitations

- Exploit development only on systems you are authorized to attack.
- Mitigations (full RELRO, CFI, MTE) raise difficulty substantially.

> Adapted from [zhaoxuya520/reverse-skill](https://github.com/zhaoxuya520/reverse-skill) (MIT).
