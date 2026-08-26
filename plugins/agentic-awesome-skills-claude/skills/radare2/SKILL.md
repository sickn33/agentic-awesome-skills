---
name: radare2
description: "Drive the radare2 CLI for binary reconnaissance, disassembly, analysis, function locating, export, and lightweight patching (r2/rabin2/rasm2/radiff2) without a GUI."
risk: safe
source: "https://github.com/zhaoxuya520/reverse-skill"
source_repo: "zhaoxuya520/reverse-skill"
source_type: community
date_added: "2026-08-25"
license: "MIT"
license_source: "https://github.com/zhaoxuya520/reverse-skill/blob/main/LICENSE"
---
# radare2
## When to Use

- Quick terminal-based analysis of a binary without a heavy IDE.
- Scriptable disassembly, diffing, or small binary patches.


面向 `radare2` CLI 的二进制分析技能。重点是直接用命令行完成侦察、分析、定位、导出和轻量修改，不依赖 GUI。

## 适用范围

当用户有这些意图时应优先使用本 skill：

- 要用 `r2` / `radare2` 分析 `exe`、`dll`、`so`、`elf`、`apk`、`dex`、`wasm` 等文件
- 询问 `rabin2`、`rasm2`、`radiff2`、`rahash2`、`rax2` 怎么用
- 需要命令行反汇编、看函数、看字符串、看导入导出、查交叉引用、做 patch
- 需要写 `radare2` 批处理命令、`-c` 自动化命令、或 `r2pipe` 脚本

如果用户明确要 GUI 逆向、Hex-Rays 风格伪代码、或 IDA 工作流，优先考虑 `ida-reverse`。如果是网页 JS 逆向，优先考虑 `reverse-engineering`。

## 先做环境确认

先不要假设 `r2` 可用。先检查：

```powershell
r2 -v
rabin2 -v
```

如果未安装，再检查常见安装位置或提示安装。

Windows 常见可执行文件：

- `radare2.exe`
- `rabin2.exe`
- `rasm2.exe`
- `radiff2.exe`
- `rahash2.exe`
- `rax2.exe`
- `r2pm.exe`

## 内置资源

这个 skill 自带两个资源，优先复用，不要每次临时组织一套重复命令。

### `scripts/recon.ps1`

标准侦察脚本，适合先做第一轮概况分析。会输出：

- 基本信息
- 节区
- 导入
- 导出
- 字符串
- 可选的 `r2 -A` 自动分析摘要

调用方式：

```powershell
powershell -File "<skill-root>\radare2\scripts\recon.ps1" -TargetPath "C:\path\to\sample.exe"
```

如果需要附带 `r2` 自动分析：

```powershell
powershell -File "<skill-root>\radare2\scripts\recon.ps1" -TargetPath "C:\path\to\sample.exe" -RunAnalysis
```

### `references/cheatsheet.md`

当需要更多命令细节、常见场景模板、或要快速回忆语法时，读取这个速查表，而不是凭记忆硬猜。

## 已知现象

### Windows 下偶发 `.sdb` 缺失告警

某些 PE 文件在 `rabin2` 侦察时，可能出现类似下面的告警：

```text
ERROR: Cannot find ...\share\format\dll\*.sdb
```

如果主体输出仍然正常返回，通常不影响基础侦察结论，先继续分析即可。不要因为这类附带告警就直接判定分析失败。

## 基本原则

### 1. 先侦察，后深挖

不要一上来就全量自动分析。先用轻量命令确认文件类型、架构、入口点、字符串、导入表，再决定是否做 `aaa`、`aaaa` 或定向分析。

### 2. 优先最小足够命令

`radare2` 命令非常多，用户通常只需要最短路径：

- 看文件信息：`rabin2 -I`
- 看字符串：`rabin2 -z`
- 看导入导出：`rabin2 -i` / `rabin2 -E`
- 交互分析：`r2 <file>` 后再执行局部命令

### 3. 修改前保持谨慎

如果用户要 patch 二进制：

- 默认先只读打开：`r2 <file>`
- 只有在明确需要修改时再用写模式：`r2 -w <file>` 或会话中 `oo+`
- 修改前先告知风险，避免无意覆盖原文件

## 常用工作流

## 工作流 1：快速侦察

适合刚拿到一个二进制文件时。

### 硬门禁（MUST — 未满足禁止进入工作流 2 及后续）

对 PE/ELF/Mach-O 等含导入表的二进制，**MUST** 先完成导入表检查并落成 Evidence，再进入函数级分析或动态步骤：

1. 执行 `rabin2 -i <sample>`（或 `recon.ps1` 输出中的 imports 段）；DLL/SYS 另 MUST `rabin2 -E` 并记 `E-exports`
2. 将完整/分类后的导入表结果写入 Evidence（建议 id：`E-imports` 或 `E-triage-imports`），至少包含：
   - 复现命令（`repro_command`）
   - 关键导入分类摘要：网络 / 文件 / 加密 / 进程注入 / 注册表 / 其他可疑 API
   - 若导入表为空、解析失败或工具报错：仍 MUST 记录失败现象与原始输出为 Evidence，**不得静默跳过**
   - 导入表「过干净」（仅基础 DLL）：MUST 注明动态加载嫌疑，SHOULD 转入动态抓 API
3. .NET 等无传统 IAT：MUST 走等价锚点（dnSpy/IL/元数据摘要）写入同一 Evidence 语义槽，禁止空过
4. 加壳样本 IAT 修复：x86 用 ImportREC（或等价）、x64 用 Scylla（或等价）。修复失败 MUST 记 `E-iat-repair-fail` 后转动态 API 断点；**禁止**在静态 IAT 上无限死磕（见 `reverse-engineering/references/re-agent-workflow.md` §1.2）
5. 用户明确要求「重做导入表检查 / 重新检查导入表 / 重做 IAT」时：MUST 重做被点名步骤本身（阻塞时先走可行性门闩：说明前提+请确认；强制则标 quality=unreadable），**禁止改换为无关步骤冒充完成**

未记录导入表（或合法等价锚点 / IAT 失败旁路）Evidence 前：MUST NOT 声称「基础侦察完成」，MUST NOT 进入工作流 2+ 的深挖结论。

优先直接运行内置脚本：

```powershell
powershell -File "<skill-root>\radare2\scripts\recon.ps1" -TargetPath "sample.exe"
```

如果只需要手动最小命令，则使用：

```powershell
rabin2 -I sample.exe
rabin2 -z sample.exe
rabin2 -i sample.exe
rabin2 -E sample.exe
```

关注点：

- 文件格式、位数、架构、平台
- 入口点地址
- 可疑字符串：URL、路径、报错、注册表、命令行参数
- 导入函数：网络、文件、加密、进程注入、注册表操作（**MUST 落 Evidence，见上方硬门禁**）

## 工作流 2：交互式分析函数

```powershell
r2 sample.exe
```

进入后常用：

```text
aaa          # 常规自动分析
afl          # 列出函数
iz           # 列出字符串
iS           # 列节区
is           # 列符号
s entry0     # 跳到入口点
pdf          # 反汇编当前函数
VV           # 进入可视化模式（如果终端适合）
q            # 退出
```

说明：

- 默认优先 `aaa`，不要一开始就用更重的 `aaaa`
- 如果样本很大或分析很慢，可以只分析入口附近，再手动扩展

## 工作流 3：定位 main / 关键逻辑

```text
afl~main
afl~sym.
iz~http
iz~error
axt <addr>
```

思路：

- 先从 `main`、入口点、字符串引用入手
- 用 `axt` 查谁引用了某个字符串或地址
- 找到引用点后再 `s <addr>`、`pdf`

## 工作流 4：十六进制与内存查看

```text
px 64        # 当前地址起 64 字节十六进制
pd 20        # 反汇编 20 条指令
psz          # 读取当前地址字符串
pxa          # 更友好的十六进制视图
```

## 工作流 5：二进制 patch

仅当用户明确要求修改文件时使用：

```powershell
r2 -w sample.exe
```

进入后例如：

```text
s 0x401000
wa nop
wa jmp 0x401050
wq
```

常见写操作：

- `wa <asm>`：写汇编
- `wx <hex>`：写原始字节
- `wq`：写入并退出

修改前最好先备份原文件。如果用户没提备份，至少提醒一次。

## 工作流 6：非交互自动化

适合一次性输出结果：

```powershell
r2 -A -q -c "afl;iz;ii;q" sample.exe
```

常用参数：

- `-A`：启动时自动分析
- `-q`：安静模式
- `-c`：执行命令串

如果命令很多，优先整理成易读顺序，不要塞入难以维护的超长串。

更推荐先用内置侦察脚本打底，再决定要不要补定制命令。

## 常用子工具

### `rabin2`

适合静态信息提取：

```powershell
rabin2 -I sample.exe   # 基本信息
rabin2 -S sample.exe   # 节区
rabin2 -s sample.exe   # 符号
rabin2 -i sample.exe   # 导入
rabin2 -E sample.exe   # 导出
rabin2 -z sample.exe   # 字符串
rabin2 -zz sample.exe  # 更详细字符串
```

### `rasm2`

适合快速汇编/反汇编：

```powershell
rasm2 -d "9090"
rasm2 -a x86 -b 64 "xor eax, eax"
```

### `radiff2`

适合对比两个二进制：

```powershell
radiff2 old.exe new.exe
radiff2 -C old.exe new.exe
```

### `rahash2`

适合算哈希：

```powershell
rahash2 -a md5 sample.exe
rahash2 -a sha256 sample.exe
```

### `rax2`

适合进制和编码转换：

```powershell
rax2 0x401000
rax2 4198400
rax2 -s hello
```

## 推荐分析顺序

遇到未知样本时，按这个顺序做：

1. `rabin2 -I` 看格式、架构、入口点
2. `rabin2 -z` 看字符串
3. `rabin2 -i` 看导入函数 — **MUST + Evidence（硬门，见工作流 1）**
4. 如需交互分析，再进 `r2`（仅当步骤 3 的 Evidence 已落盘）
5. 先 `aaa`，再 `afl` / `iz` / `pdf`
6. 通过字符串引用、导入调用、入口流程逐步定位关键函数

这个顺序的好处是噪音低，能尽快建立方向感。步骤 3 不是可选优化，是进入深挖前的硬门。

## Windows 注意事项

- 路径里有空格时，命令必须正确加引号
- 如果当前终端找不到 `r2`，可能是 `PATH` 刚更新，开一个新终端再试
- 有些样本需要管理员权限读取，但默认不要主动提升权限，除非用户明确需要
- 对可疑样本做动态调试前，要先确认用户意图，避免误操作

## 输出风格

当用户不是只要命令，而是要你实际分析文件时：

- 先给出侦察结果摘要
- 再列出关键证据：字符串、导入、函数、地址
- 最后给出下一步建议或继续深入分析

不要只罗列命令而不解释为什么这么做。

## 典型请求示例

### 示例 1：分析一个 exe

用户：`帮我看看这个 exe 干了什么，用 radare2 就行`

处理方式：

1. 先用 `rabin2 -I/-z/-i`
2. 判断是否需要进入 `r2`
3. 用 `aaa`、`afl`、`pdf` 深挖入口和关键字符串引用

### 示例 2：找字符串在哪被调用

用户：`这个报错字符串在哪个函数里触发的`

处理方式：

1. 用 `iz~关键字` 找字符串地址
2. 用 `axt <addr>` 找引用
3. 跳到引用点 `s <addr>` 后 `pdf`

### 示例 3：改掉跳转

用户：`把这个 jne 改成 je`

处理方式：

1. 先确认目标地址
2. 明确告知要进入写模式
3. 用 `wa je <target>` 或直接 `wx`
4. 修改后再次反汇编验证

## 避免的做法

- 不要把 `radare2` 当成只有 `aaa` 一个命令的工具
- 不要在未说明风险时直接写模式打开用户文件
- 不要在还没做基础侦察前就下结论
- **禁止跳过导入表检查**（`rabin2 -i` / recon imports）：未写入 Evidence 不得进入下一步；用户要求重做导入表时禁止改做其他步骤
- **禁止 IAT 修复失败后静态死磕**：记 `E-iat-repair-fail` 后转动态；禁止 64 位样本只用 ImportREC
- 不要把网页 JS 逆向误导到这个 skill；那是 `reverse-engineering` 的范围

## 参考资料

- 命令速查：`references/cheatsheet.md`
- 标准侦察脚本：`scripts/recon.ps1`

## radare2-skills 生态

radare2-skills 项目（radareorg/radare2-skills）提供了更完整的生态工具和工作流：

- **r2xsql**：SQL 查询二进制导入表 / 字符串 / 函数
- **r2mcp / r2http**：MCP 工具与 HTTP 状态化命令通道
- **radius2**：符号执行、符号动态分析
- **r2pm**：插件管理、扩展
- **decompiler plugins**：radare2 插件机制

**使用策略**：
- 当用户提到 `r2xsql`、`r2mcp`、`r2http`、`radius2`、`r2pm`、`rabin2`、`rasm2`、`radiff2`、`rahash2`、`rax2` 时，优先路由到本 skill（radare2/SKILL.md）
- 这些工具只是生态加速器，**不能绕过**：授权门禁、`tool-index` 校验、Evidence 导入、写模式确认
- 给出最小可复现命令示例：
  - `r2xsql -s <file> -q "SELECT ..."`
  - `curl.exe -sS --data-binary 'aaa' http://127.0.0.1:9393/cmd`
  - `radius2 -p <binary> ...`
  - `r2pm -ci <plugin>`

本 skill 保持原有硬门禁和证据链完整性，不允许跳过任何授权或 Evidence 步骤。

---

## 路由上下文

**上游入口**: `skills/SKILL.md`（总控）、`routing.md`
**上游备选**: `ida-reverse/`（需要反编译/伪代码时升级到 IDA）
**下游出口**:
- 需动态分析 → `reverse-engineering/tools-dynamic.md`（Frida/GDB）
- 需深度反编译 → `ida-reverse/`
- PAT 发现有趣字符串后需交叉引用 → `ida-reverse/`（IDA 的 xref 更强大）

**同级关联模块**: `ida-reverse/`（互补：r2 侦察快，IDA 反编译深）

## 按需自举（On-Demand Bootstrap）

本 skill 的入口脚本已接入统一自举系统。缺少 radare2 时不会直接报错，而是自动尝试安装。

### 自动化能力边界

| 工具 | 可自动安装 | 安装方式 | 说明 |
|------|-----------|---------|------|
| r2 | ✓ | GitHub Release ZIP (w64) | 自动下载解压到 `%USERPROFILE%\Tools\radare2\` |
| rabin2 | ✓ | 同上（包含在 radare2 发行包中） | — |
| rasm2 | ✓ | 同上 | — |
| radiff2 | ✓ | 同上 | — |
| rahash2 | ✓ | 同上 | — |
| rax2 | ✓ | 同上 | — |

### 自举触发点

- `scripts/recon.ps1`：缺 `rabin2` 或 `r2` 时自动调用 `bootstrap-reverse.ps1`

### 自举失败时

如果自动安装失败（网络不通、GitHub API 限流等），脚本会抛出明确错误并附带手动安装链接。

手动安装：从 https://github.com/radareorg/radare2/releases 下载 `radare2-*-w64.zip`，解压到 `%USERPROFILE%\Tools\radare2\` 并确保 `bin\` 目录在 PATH 中。


## 任务完成自检（声称完成前 MUST 通过）

- [ ] 我是否执行了工作流中的每一步（而不是只阅读）？
- [ ] 导入表检查是否已执行且写入 Evidence（E-imports / E-triage-imports 或 .NET 等价）？DLL/SYS 是否含 E-exports？
- [ ] IAT 修复失败是否记录 E-iat-repair-fail 并转动态？重做请求是否回到同一步？
- [ ] 我是否基于 `tool-index` 使用了真实工具路径？
- [ ] 我是否产出了可复现证据（命令/脚本/截图/报告）？
- [ ] 我是否完成并回写了 RULES 要求的 Checklist 项？

## Limitations

- Steep learning curve; terse commands reward experienced users.
- High-level decompilation needs r2ghidra/pdc plugins for readability.

> Adapted from [zhaoxuya520/reverse-skill](https://github.com/zhaoxuya520/reverse-skill) (MIT).
