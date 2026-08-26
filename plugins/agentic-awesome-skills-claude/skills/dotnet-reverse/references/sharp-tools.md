# 红队 Sharp* 工具分析 & 工具安装矩阵 & dnSpy MCP

## 红队 Sharp* 工具分析

红队工具大量用 C# 写（Sharp* 系列），逆向它们是常见场景：理解检测逻辑、改特征、提取内嵌配置。

### 常见 Sharp* 工具速查

| 工具 | 功能 | 逆向关注点 |
|------|------|-----------|
| **Rubeus** | Kerberos 攻击（AS-REP roast / Kerberoast / S4U / pass-the-ticket）| Rubeus 工程结构固定，找 `Interop.*` P/Invoke 段看 native 调用 |
| **SharpHound** | BloodHound 数据采集器 | LDAP 查询逻辑、采集的属性集合 |
| **SharpShell / SharpWS** | 远程执行、横向 | WMI / WinRM 调用、命令混淆 |
| **Seatbelt** | 信息收集 | 收集项清单、判断逻辑 |
| **SharpRoast** | Kerberoasting | 票据请求/解析 |
| **Inveigh / SharpSploit** | 中间人 / 通用利用框架 | 反射加载、API 调用链 |

### 通用分析套路

```text
1. dnSpyEx 打开（通常没混淆，少数团队会加 ConfuserEx）
2. 看 Program.Main 或入口命令分发（Rubeus 是 switch(command) 结构）
3. 找目标命令的实现类/方法
4. 看 P/Invoke 段（Interop.* 命名空间）—— native API 调用在这里
5. 提取内嵌资源（有些工具嵌配置/模板）
6. 如需改特征（EDR 规避）：改命令字符串、API 调用、字符串常量
```

### Rubeus 结构示例

Rubeus 用命令分派，每个子命令一个类。找 Kerberoasting 逻辑：

```text
入口: Rubeus.CommandLineParser → 解析 args
分派: switch(command) → "kerberoast" → 执行 Ask.TGS(...)
P/Invoke: Rubeus.Interop.Lsa* / Native.cs → native Kerberos API
关键: LsaCallAuthenticationPackage (KERB_RETRIEVE_TKT_REQUEST)
```

改特征（规避）：把命令字符串 `"kerberoast"` 改成自定义名、把 `Rubeus` banner 字符串改掉、改 P/Invoke 调用顺序。

### 内嵌配置提取

很多 loader/工具把 C2、密钥、证书加密嵌在资源或字段：

```powershell
# dnSpyEx 里看 Resources（资源树）
# 或命令行
powershell -c "[System.Reflection.Assembly]::LoadFile('target.exe').GetManifestResourceNames()"
# 找到资源后 dnSpyEx 右键 → 提取 / Save
```

运行时解密的配置 → 动态断在解密方法返回点 dump 明文（见 `common-workflow.md`）。

---

## 工具安装矩阵

### Windows（首选，dnSpyEx 是 GUI）

```powershell
# 方式 A：Chocolatey
choco install dnspy ilspy de4dot detect-it-easy

# 方式 B：手动下载 release（推荐，版本可控）
# dnSpyEx:    https://github.com/dnSpyEx/dnSpy/releases
# de4dot:     https://github.com/de4dot/de4dot/releases
# ILSpy:      https://github.com/icsharpcode/ILSpy/releases
# DIE:        https://github.com/horsicq/Detect-It-Easy/releases
# dnlib:      dotnet add package dnlib  (NuGet)
```

### Linux / macOS（无 dnSpyEx GUI，用 CLI）

```bash
# ILSpy CLI 反编译
dotnet tool install -g ilspycmd
ilspycmd target.exe -p -o outdir/         # 反编译到目录

# de4dot 跨平台（需 mono 或 dotnet）
# 从 release 下载 de4dot 产物的 .dll，用 dotnet 跑
dotnet de4dot.dll target.exe -o target-clean.exe

# dnlib（脚本化，需 dotnet SDK）
dotnet new console -o dnclean && cd dnclean
dotnet add package dnlib

# DIE CLI (diec)
# Linux: 从 https://github.com/horsicq/Detect-It-Easy 装
diec target.exe
```

### .NET runtime 前置

```bash
# Linux
sudo apt install dotnet-runtime-8.0        # 或 6.0/7.0 看目标
# macOS
brew install --cask dotnet-sdk
```

> dnSpyEx（带 IL 编辑器 + 调试器）只有 Windows GUI 版。Linux/macOS 做 .NET 逆向只能用 `ilspycmd` 反编译 + `dnlib` 脚本 patch，没有等价的交互调试 GUI。需要 patch 时优先上 Windows。

---

## dnSpy MCP 集成

社区已有多个 dnSpy MCP 项目，把 dnSpy 的反编译/IL 检查暴露成 MCP 工具，AI 可直接调用 —— 和 reverse-skill 的 MCP 哲学完全一致。

### 主流 dnSpy MCP 项目

| 项目 | 特点 | 适配 |
|------|------|------|
| **soufianetahiri/dnspy-mcp** | 核心 MCP Server，暴露 decompile、IL inspection 等工具 | Claude Code / Cursor |
| **AgentSmithers/DnSpy-MCPserver-Extension** | 作为 dnSpyEx 扩展运行，深度集成 GUI | dnSpyEx 内加载 |
| **malwarecakefactory/dnspy-mcp-extension** | 33 个工具，覆盖 triage → deobfuscation 全流程 | 全流程自动化 |

### 注册到 Claude MCP 配置

按对应项目 README 装 dnSpyEx 扩展后，在 `~/.claude/mcp.json` 注册（具体 command/args 以项目 README 为准）：

```json
{
  "mcpServers": {
    "dnspy": {
      "command": "dotnet",
      "args": ["path/to/dnspy-mcp.dll"]
    }
  }
}
```

注册后本 skill 的 AI 联动路径：用户说"分析这个 .NET"→ 路由到 `dotnet-reverse/` → 优先调 `dnspy_decompile` / `dnspy_inspect_il` 工具面 → 不行再切 GUI。

> dnSpy MCP 不是 reverse-skill 内置 bootstrap 能力，需用户手动按项目 README 安装扩展并注册。后续可考虑加进 `bootstrap-manifest.json`。

---

## 社区资源索引

### 强烈推荐

- **Washi 博客** — .NET 逆向大佬：https://blog.washi.dev/posts/misconceptions-about-dotnet/
  - 核心观点：**不要过度依赖 dnSpy 的 C# 反编译器，要熟悉 IL 编辑器**（与本项目 IL 优先原则一致）
- **dnSpyEx** — dnSpy 的活跃维护分支：https://github.com/dnSpyEx/dnSpy
- **de4dot** — .NET 脱混淆：https://github.com/de4dot/de4dot
- **dnlib** — 元数据编程：https://github.com/dnlib/dnlib

### 实战教程

- Medium《De-obfuscating and reversing a .NET/C# spyware》— dnSpy + de4dot 实战 info-stealer 脱混淆
- YouTube《dnSpy Patch .NET EXEs & DLLs》— 手把手 patch + keygen
- 看雪论坛 .NET 逆向版块 — 搜 ".net 逆向" / "dnSpy" / "ConfuserEx" 有大量实战帖、Nuitka 逆向、免杀讨论
- Guided Hacking《Top 5 .NET Reverse Engineering Tools》— dnSpy 仍排第一
- StackExchange / Reverse Engineering — `DynamicMethod` 调试等进阶问题

### 本仓库已有 .NET 资源（联动）

- `reverse-engineering/tools.md` `.NET Analysis` 段 — dnSpy/ILSpy 工具速查 + Codegate 2013 两阶段 XOR+AES-CBC 模式
- `reverse-engineering/field-notes.md` `.NET` 段 — 工具速记
- `reverse-engineering/awesome-re-resources.md` — de4dot 入选
- `field-journal/seed-014_unity-il2cpp-reverse.md` — Unity IL2CPP（native 侧，与 .NET 托管层互补）

.NET 逆向深度内容统一收敛到本模块，`reverse-engineering/` 里保留速查索引即可。
