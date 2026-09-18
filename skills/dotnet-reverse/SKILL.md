---
name: dotnet-reverse
description: ".NET/C# binary reverse engineering: managed PE analysis, dnSpyEx debugging, de4dot deobfuscation (ConfuserEx/SmartAssembly/Babel), IL patching, NativeAOT targets, and analysis of red-team Sharp* tooling."
risk: safe
source: "https://github.com/zhaoxuya520/reverse-skill"
source_repo: "zhaoxuya520/reverse-skill"
source_type: community
date_added: "2026-08-25"
license: "MIT"
license_source: "https://github.com/zhaoxuya520/reverse-skill/blob/main/LICENSE"
---
# .NET / C# 逆向作业规范
## When to Use

- Analyzing a .NET assembly, obfuscated C# product, or native-AOT binary.
- Understanding the internals of Sharp* red-team tools before use or defense.


## 适用范围

当任务属于以下场景时优先使用本 skill：

- 识别并逆向 .NET / C# 编译产物（托管 PE / .exe / .dll）
- 分析红队 Sharp* 工具链（Rubeus、SharpHound、SharpShell 等）
- 脱混淆 ConfuserEx / SmartAssembly / Babel / Eazfuscator / .NET Reactor 等壳
- 逆向 .NET loader / info-stealer / RAT 的解密与 C2 逻辑
- 对 C# 程序做 patch（改判断、改常量、keygen）
- 分析 IL2CPP 之前的 Mono/Unity 托管层（注意：IL2CPP 编译后是 native，走 `reverse-engineering/` + seed-014）

如果目标是纯 native 二进制（C/C++/Go/Rust 编译、无 CLR），请改用 `reverse-engineering/`、`ida-reverse/` 或 `radare2/`。

## 核心原则

- **先识别再下手**：先确认是 .NET 托管程序（PE 头 CLR + `#~` / `#Strings` 流 + mscoree `_CorExeMain`），再决定走 dnSpy 而非 IDA
- **IL 优先于 C#**：dnSpyEx 的 C# 反编译器会丢失/扭曲信息（编译器生成的状态机、async/await、yield），关键判断与 patch 必须切到 **IL 编辑器**，C# 视图只用于快速浏览
- **de4dot 先行**：遇到混淆器先 `de4dot` 脱一轮再做静态分析，否则字符串/控制流全是乱的
- **MCP 联动**：环境里若注册了 dnSpy MCP（`dnspy_*` 工具），优先走 MCP 面做 decompile / IL inspection，避免来回切 GUI
- **证据化输出**：脱混淆产物、提取的配置/C2/key、patch diff 都要落盘

## 工具链映射

| 能力 | 首选 | 备注 |
|------|------|------|
| 反编译 + 调试 + patch | **dnSpyEx** | 王牌，唯一带 IL 编辑器的 GUI；老 dnSpy 已停更，用 Ex 分支 |
| 轻量 CLI / headless 反编译 | **ILSpy** (`ilspycmd`) | 适合批量、脚本化、Linux/macOS |
| 脱混淆 | **de4dot** | ConfuserEx 全家桶、SmartAssembly 等主流壳的默认解 |
| 混淆器识别 | **Detect It Easy (DIE)** / **file** | 先判断壳类型再决定 de4dot 参数 |
| 编程化操作 IL | **dnlib** | 写 C# 脚本批量改 metadata / 字符串解密器 |
| AI 直接操作 | **dnSpy MCP** | `dnspy_decompile` / `dnspy_inspect_il` 等工具面 |

> 前置：Windows 主机装 dnSpyEx + de4dot（choco 或 release）；Linux/macOS 用 `ilspycmd` + `dotnet runtime`。详见 `references/sharp-tools.md` 的安装矩阵。

## 六阶段工作流

### 1. Identify（识别 .NET）

确认目标是托管程序，别把 native PE 当 .NET 分析：

```powershell
# Windows
file target.exe                       # "PE32 executable ... for MS Windows" 不够
# 关键：看有没有 CLR
powershell -c "[System.Reflection.AssemblyName]::GetAssemblyName('target.exe')"
# 或
dnSpyEx 直接拖进去 —— 能打开就是托管

# 通用
strings target.exe | grep -iE "mscoree|_CorExeMain|mscorlib|System\\."
```

**.NET 识别标志：**
- PE 头 `Data Directory[14]` (CLR Runtime Header) 非零
- `mscoree.dll` 导入 / `_CorExeMain` 入口
- `#~`、`#Strings`、`#US`、`#GUID`、`#Blob` metadata 流
- `mscorlib` / `System.Private.CoreLib` 字符串

**NativeAOT 例外：** 编译成 native，没有 CLR 头，但有 `System.Private.CoreLib` 字符串和重构过的类型元数据 —— 这类走 `reverse-engineering/`（IDA/r2），本 skill 仅做识别提示。

### 2. Detect（检测混淆器）

```powershell
# DIE 快速识别
diec target.exe                        # Detect It Easy CLI
# 或拖进 dnSpyEx，看是否大量乱码类名 / 控制流变形
```

常见混淆器 → 脱壳策略（详见 `references/obfuscators.md`）：

| 混淆器 | 特征 | de4dot 处理 |
|--------|------|------------|
| ConfuserEx (1.0.0 / 2.x) | `<module>` anti-tamper、控制流变形、字符串加密 | `de4dot target.exe` 通常自动识别 |
| SmartAssembly | `circular`/`string encoding`、资源压缩 | `de4dot target.exe` |
| Babel.NET | 方法体加密、控制流 | `de4dot target.exe` |
| Eazfuscator.NET | 字符串/资源加密 | `de4dot`，部分版本需手动 |
| .NET Reactor | anti-tamper + necrobit | `de4dot`，新版可能失败需手动 |

### 3. Deobfuscate（脱混淆）

```powershell
# de4dot 默认自动识别大多数壳
de4dot target.exe -o target-clean.exe

# 指定类型（自动识别失败时）
de4dot --type cfze target.exe          # ConfuserEx
de4dot --type sa target.exe            # SmartAssembly

# 多层混淆 / de4dot 报 unknown
de4dot --detect target.exe             # 看它识别成什么
# 可能要先 patch anti-tamper 再 de4dot（见 references/obfuscators.md）
```

产出：`target-clean.exe`，后续分析用它。**保留原始样本**做对照。

### 4. Static Analyze（静态分析）

dnSpyEx 加载脱壳后样本：

- **C# 视图**：快速浏览类结构、方法签名、字符串（用于定位）
- **IL 视图**：关键判断、加密逻辑、状态机必须看 IL（右键 → Edit IL 或 IL 视图）
- 找入口：`Main` / `Startup` / 模块初始化器 (`Module .cctor`)
- 找关键逻辑：搜 `flag`、`password`、`verify`、`check`、`encrypt`、`http`、`Config`

```text
定位字符串 → 反向引用 → 找到使用它的方法 → IL 视图看判断逻辑
```

### 5. Dynamic（动态调试）

dnSpyEx 调试器：附加进程 / 启动调试，在关键方法下断点，观察运行时：
- 解密后的明文字符串（很多混淆器的字符串在运行时才解密）
- C2 地址、配置解密结果
- 异常驱动的控制流（anti-debug 常用 `try/catch` 隐藏真实路径）

> .NET 动态调试比 native 友好得多 —— 能直接看到对象值、字符串内容。优先动态而非死磕静态。

### 6. Patch（按需修改）

```text
dnSpyEx → 右键方法 → Edit Method (C#) 或 Edit IL
  - 改判断：ldc.i4.0 → ldc.i4.1（false→true）
  - 改常量：直接编辑字符串/数字
  - 删除校验：nop 掉整段
File → Save Module → 替换原文件
```

**IL patch 可靠性 > C# patch**：C# 重编译可能失败（缺引用、语法不对），IL 编辑几乎不会失真。详见 `references/common-workflow.md`。

## 触发场景路由

用户说这些时进入本 skill：
- ".NET / C# 二进制逆向" / "C# 程序反编译"
- "dnSpy 分析" / "dnSpyEx patch"
- "ConfuserEx / SmartAssembly / Babel 脱混淆 / 脱壳"
- "Sharp* 工具分析"（Rubeus / SharpHound / SharpShell）
- ".NET malware / loader / info-stealer 逆向"
- "C# 程序 patch / keygen / 修改判断"

## 何时切出

- IL2CPP 编译的 Unity 游戏 → `reverse-engineering/` + `seed-014_unity-il2cpp-reverse.md`（IL2CPP 是 native，不走 dnSpy）
- NativeAOT 产物 → `reverse-engineering/`（同上，native）
- 纯 native PE（无 CLR）→ `reverse-engineering/` / `ida-reverse/`
- 需要符号/函数批量迁移到别的版本 → `binary-diff/`
- 需要画攻击路径 / 调用链图 → `diagram-generator/`

## 路由上下文

**上游入口**: `skills/SKILL.md`（总控）、`routing.md`
**下游出口**:
- IL2CPP / NativeAOT（native）→ `reverse-engineering/`
- 深度 native .so/.dll 段分析 → `ida-reverse/` / `radare2/`
- 需要 AI 直接操作 dnSpy → 注册并联动 dnSpy MCP（见 `references/sharp-tools.md`）

**同级关联模块**:
- `reverse-engineering/languages-compiled.md`（.NET 简介指向本模块）
- `apk-reverse/`（Xamarin/MAUI Android 逆向可切回本模块看 C# 层）

## 参考文档

- [references/obfuscators.md](references/obfuscators.md) — ConfuserEx / SmartAssembly / Babel / Eazfuscator / .NET Reactor 脱混淆详解 + anti-tamper 绕过
- [references/common-workflow.md](references/common-workflow.md) — 完整工作流、IL patch 可靠性、字符串解密器提取、状态机识别
- [references/sharp-tools.md](references/sharp-tools.md) — 红队 Sharp* 工具分析、工具安装矩阵、dnSpy MCP 集成、社区资源索引

## 任务完成自检

- [ ] 是否确认过 CLR / 托管身份（或已 SWITCH 出本 skill）？
- [ ] 混淆样本是否先 de4dot / 等价脱壳再深分析？
- [ ] 关键逻辑是否用 IL 视图验证（而非只看 C# 伪代码）？
- [ ] 产物（clean 样本 / 配置 / patch diff）是否落盘且可复现？
- [ ] 是否提供了下一步菜单或报告出口？

## Limitations

- NativeAOT and trimmed builds lose most metadata; expect native-style RE.
- Some commercial obfuscators require manual unpacking steps.

> Adapted from [zhaoxuya520/reverse-skill](https://github.com/zhaoxuya520/reverse-skill) (MIT).
