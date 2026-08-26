# .NET 混淆器脱混淆详解

主流 .NET 混淆器的识别、脱壳、anti-tamper 绕过。核心工具：**de4dot**（自动识别大多数壳）+ **dnSpyEx**（手动 patch）+ **dnlib**（脚本化）。

## 总决策表

| 混淆器 | de4dot type | 典型特征 | 自动脱壳 | 手动要点 |
|--------|-------------|---------|---------|---------|
| ConfuserEx 1.x/2.x | `cfze` | anti-tamper、控制流变形、字符串加密、反调试 | ✅ 多数自动 | 新版需先 patch anti-tamper |
| ConfuserEx 3.x / 私改 | `cfze` | 同上 + 自定义 protector | ⚠️ 部分 | dump 运行时 / dnlib |
| SmartAssembly | `sa` | 字符串编码、资源压缩、方法调用隐藏 | ✅ 自动 | 资源解压 |
| Babel.NET | `babel` | 方法体加密、控制流、字符串 | ✅ 自动 | — |
| Eazfuscator.NET | `eaz` | 字符串/资源加密、表达式混淆 | ⚠️ 部分 | 字符串解密器 |
| .NET Reactor | `reactor` | necrobit (代码段加密) + anti-tamper | ⚠️ 新版难 | dump + 重建 metadata |
| Themida .NET | — | 外壳 + 虚拟化 | ❌ de4dot 不行 | dump 内存，走 native 思路 |
| Agile.NET / CliSecure | `agile` | 方法体加密 | ✅ 自动 | — |

## de4dot 标准用法

```powershell
# 自动识别（多数情况够用）
de4dot target.exe -o target-clean.exe

# 显式指定 type（自动识别失败）
de4dot --type cfze target.exe -o target-clean.exe

# 先探测壳类型
de4dot --detect target.exe

# 批量
de4dot *.exe

# 只解字符串，不动控制流（最小干预）
de4dot --strtyp delegate --strtok METHOD_TOKEN target.exe
```

de4dot 的 `--strtyp` / `strtok` 模式：只解字符串解密器（指定解密方法 token），保留原控制流。适合"只想看明文字符串但不想碰 anti-tamper"的场景。

---

## ConfuserEx（最常见）

### 特征识别

- 入口模块 `<module>` 类带 `[MethodImpl(NoInlining)]` 的 anti-tamper 检查
- 大量 `Dictionary<string, T>` 的字符串解密器调用
- 控制流平坦化（switch dispatch + state 变量）
- 资源里嵌 `.cmp` 压缩资源
- dnSpyEx C# 视图：类名/方法名乱码（`\uXXXX` 或无意义字符），方法体里满屏 `int num = ...; switch(num)`

### 脱壳流程

```powershell
# 1. 标准脱壳
de4dot target.exe -o target-clean.exe

# 2. 如果 de4dot 报 "unknown" 或脱壳后打不开 → 新版/私改 ConfuserEx
#    先确认 anti-tamper：
dnSpyEx 打开 → 找 Module .cctor 或 Main 里的完整性校验
```

### anti-tamper 绕过（新版 ConfuserEx 常见）

ConfuserEx 的 `anti tamper` 会在运行时校验方法体哈希，被改就崩。de4dot 通常能处理旧版，新版需手动：

```text
方法 A — dnSpyEx 直接 patch 校验函数：
  1. 找 anti-tamper 校验方法（通常在 <module> 的静态构造里调用）
  2. IL 编辑：把校验方法体改成 ret（直接返回）
  3. 保存 → 再喂给 de4dot

方法 B — 运行时 dump：
  1. 用 MegaDumper / ExtremeDumper 跑起来 dump 内存中的 assembly
  2. dump 出来的已经解密，再用 de4dot 清理残留
```

### 控制流还原后

de4dot 会把平坦化的 switch dispatch 还原成正常 if/while。如果没完全还原（看到残留 state 机），可再跑一次 de4dot 或手动跟 IL。

---

## SmartAssembly

```powershell
de4dot --type sa target.exe -o target-clean.exe
```

特征：
- 字符串用 `SmartAssembly.Runtime.Strong` 系列编码
- 资源压缩（`{assembly}.Resources`）
- 方法调用隐藏（`ProcessCaller` / 间接 call）

de4dot 对 SmartAssembly 兼容性最好，基本一键搞定。

---

## .NET Reactor（necrobit）

`.NET Reactor` 的 **necrobit** 把真实方法体加密存到资源，运行时解密注入，原方法体是空壳。de4dot 对老版本有效，新版本（4.x+）常失败。

```text
当 de4dot 失败时：
1. 让程序跑起来（dotnet target.exe 或直接双击）
2. MegaDumper / ExtremeDumper dump 进程内存 → 导出解密后的 assembly
3. 用 de4dot 清理 dump 产物的残留混淆
4. 如果 metadata 损坏，用 dnlib 重建（见 common-workflow.md）
```

---

## 字符串解密器手动提取

混淆器把字符串加密，运行时调用解密方法还原。de4dot 多数能自动识别解密器，识别失败时手动：

```text
1. dnSpyEx 找到解密方法（通常签名固定：static string Decrypt(int) 或 Decrypt(string, int)）
   - 特征：被大量调用、参数是数字常量、返回 string
2. 记下方法 token（如 0x06000012）
3. de4dot 指定解密器：
   de4dot --strtyp delegate --strtok 0x06000012 target.exe -o target-clean.exe
```

如果连解密方法本身也被混淆（控制流平坦化），需要先脱控制流再定位解密器。

## anti-debug 常见手法

| 手法 | 位置 | 绕过 |
|------|------|------|
| `Debugger.IsAttached` 检查 | 任意方法 | IL 改 `ldc.i4.0; ret` 或 patch getter |
| `Debugger.IsLogging` | — | 同上 |
| 时间检测 (`DateTime.Now` 差值) | 方法入口 | patch 掉差值比较 |
| `CheckRemoteDebuggerPresent` P/Invoke | — | nop 掉调用 |
| 异常驱动控制流（try/catch 路径选择）| 主逻辑 | 不能简单 nop，要分析 catch 块真实路径 |

> .NET anti-debug 比 native 简单 —— 多数是托管 API 调用，dnSpyEx IL 改一行即可。

## de4dot 失败时的退路

1. **de4dot --detect** 看识别结果，对照上表
2. **运行时 dump**（MegaDumper / ExtremeDumper / Process Hacker 导出模块）
3. **dnlib 脚本** 手动解（见 common-workflow.md 的 dnlib 段）
4. **动态优先**：跑起来在解密点下断，直接看明文，不脱壳也能拿情报

社区参考：Washi 博客《misconceptions-about-dotnet》（IL 分析的常见误区）、看雪 .NET 逆向版块、Guided Hacking《Top 5 .NET RE Tools》。
