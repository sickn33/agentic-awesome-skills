# Go 二进制逆向指南

> Go 编译的二进制有独特的挑战：静态链接导致体积巨大、函数数量上万、字符串格式特殊、符号 strip 后恢复困难。
> 本文档覆盖工具链、恢复技巧和实战工作流。

---

## Go 二进制的特征识别

快速判断一个二进制是否是 Go 编译的：

```bash
# 字符串特征
strings binary | grep -E "runtime\.|go\.buildid|GOROOT"

# rabin2 侦察
rabin2 -z binary | grep -i "runtime"

# 文件大小异常大（静态链接 runtime）
# 典型 Hello World: C ~20KB, Go ~2MB
```

常见特征：
- 包含 `runtime.` 前缀的大量函数
- 包含 `go.buildid` section
- 包含 `GOROOT`、`GOPATH` 路径字符串
- 函数数量 5000-50000+（包含整个 runtime 和标准库）

---

## 核心工具链

### 符号恢复

| 工具 | 用途 | 链接 |
|------|------|------|
| **GoReSym** | Mandiant 出品，解析 Go 符号信息（pclntab/moduledata） | https://github.com/mandiant/GoReSym |
| **GoResolver** | Volexity 出品，用 CFG 相似度自动去混淆 Garble 二进制 | https://github.com/volexity/GoResolver |
| **redress** | 分析 stripped Go 二进制，恢复类型/接口/包结构 | https://github.com/goretk/redress |
| **GoStringUngarbler** | Google 出品，专门恢复 Garble 混淆的字符串 | https://github.com/mandiant/GoStringUngarbler |

### IDA 插件

| 工具 | 用途 | 链接 |
|------|------|------|
| **go_parser** | IDA 插件，解析 moduledata/pclntab/类型信息 | https://github.com/0xjiayu/go_parser |
| **IDAGolangHelper** | IDA 脚本集，解析 Go 类型信息 | https://github.com/sibears/IDAGolangHelper |
| **AlphaGolang** | SentinelLabs 的 IDAPython 脚本集 | https://github.com/SentineLabs/AlphaGolang |
| **IDA 9.2+ 原生支持** | Hex-Rays 官方 Go 反编译改进 | https://hex-rays.com/blog/stop-guessing-and-start-going |

### Ghidra 插件

| 工具 | 用途 | 链接 |
|------|------|------|
| **Ghidra + GoReSym 输出** | 用 GoReSym 导出符号后导入 Ghidra | 配合使用 |
| **golang_loader_assist** | Ghidra Go 加载辅助 | 社区脚本 |

### 独立分析工具

| 工具 | 用途 | 链接 |
|------|------|------|
| **gore** | Go 逆向工程库（redress 的底层） | https://github.com/goretk/gore |
| **garble** | Go 混淆工具（了解它才能对抗它） | https://github.com/burrowers/garble |

---

## Go 二进制的关键结构

### pclntab (PC Line Table)

Go 二进制中最重要的结构，包含：
- 所有函数名和地址映射
- 源文件路径
- 行号信息
- 栈帧大小

即使 strip 了符号，pclntab 通常仍然存在（Go runtime 依赖它）。

```text
定位方法：
1. 搜索 magic bytes: 0xFFFFFFF0 (Go 1.16+) 或 0xFFFFFFFB (Go 1.18+)
2. 用 GoReSym 自动定位
3. 用 go_parser IDA 插件自动解析
```

### moduledata

包含：
- pclntab 指针
- 类型信息表
- itab（接口表）
- 全局变量信息

### 字符串格式

Go 字符串不是 C 风格的 null-terminated，而是 `(pointer, length)` 结构：

```text
C 字符串:   "hello\0"
Go 字符串:  struct { ptr *byte; len int } → ptr 指向 "hello"（无 \0）
```

这导致 IDA/Ghidra 默认的字符串识别会漏掉大量 Go 字符串。

**解决方案**：
- 用 `go_parser` 自动识别 Go 字符串
- 用 GoReSym 导出字符串列表
- 手动：找到 `runtime.stringtable` 或通过交叉引用定位

---

## 实战工作流

### 场景 1：未 strip 的 Go 二进制

```text
1. GoReSym -t -d -p binary > symbols.json
   → 导出所有函数名、类型、源文件路径
2. 加载到 IDA/Ghidra
3. 导入 GoReSym 的符号信息
4. 过滤掉 runtime.* 和标准库函数，聚焦用户代码
5. 从 main.main 开始分析
```

### 场景 2：strip 后的 Go 二进制

```text
1. GoReSym -t -d -p binary > symbols.json
   → 即使 strip 了，pclntab 通常还在
2. 如果 GoReSym 失败 → 用 redress
   redress -src binary    # 恢复源文件路径
   redress -pkg binary    # 恢复包结构
   redress -type binary   # 恢复类型信息
3. 加载到 IDA + go_parser 插件
4. 运行 go_parser 自动恢复
5. 从恢复的 main.main 开始
```

### 场景 3：Garble 混淆的 Go 二进制

```text
Garble 会：
- 随机化函数名（main.main → main.a3f2b1c）
- 加密字符串
- 移除文件路径信息
- 混淆包名

对抗方法：
1. GoResolver（CFG 签名匹配）
   → 通过控制流图相似度恢复标准库函数名
2. GoStringUngarbler（字符串解密）
   → 自动识别 Garble 的字符串加密模式并解密
3. 动态分析（Frida/dlv）
   → Hook runtime 函数观察实际行为
4. 对比分析
   → 编译同版本 Go 的 Hello World，用 binary-diff 对比 runtime 部分
```

### 场景 4：CGo 混合编译

```text
1. 识别 CGo 边界（_cgo_* 函数）
2. Go 部分用 go_parser 恢复
3. C 部分用常规 IDA 分析
4. 关注 _cgo_topofstack、crosscall2 等桥接函数
```

---

## 常用命令速查

```bash
# GoReSym：导出符号
GoReSym -t -d -p binary > symbols.json
GoReSym -t -d -p binary -o ida_script.py  # 生成 IDA 脚本

# redress：分析 stripped 二进制
redress -src binary          # 源文件路径
redress -pkg binary          # 包结构
redress -type binary         # 类型信息
redress -interface binary    # 接口信息
redress -filepath binary     # 完整文件路径

# GoResolver：去混淆 Garble
GoResolver -binary binary -output resolved.json

# GoStringUngarbler：解密 Garble 字符串
GoStringUngarbler -i binary -o deobfuscated_binary

# 快速判断 Go 版本
strings binary | grep "go1\."
GoReSym -p binary | grep "Version"
```

---

## IDA 中的 Go 分析流程

```text
1. 加载二进制（选择正确的架构）
2. 等待自动分析完成
3. 运行 go_parser 插件：
   - File → Script File → go_parser.py
   - 或 Edit → Plugins → Go Parser
4. 插件会自动：
   - 解析 pclntab
   - 恢复函数名
   - 标记 Go 字符串
   - 解析类型信息
5. 过滤视图：
   - 隐藏 runtime.* 函数
   - 聚焦 main.* 和第三方包
6. 从 main.main 开始逆向
```

---

## 常见陷阱

| 陷阱 | 说明 | 解决 |
|------|------|------|
| 函数太多看不过来 | Go 静态链接导致 5000-50000 函数 | 用包名过滤，只看 main.* 和业务包 |
| 字符串识别不全 | Go 字符串不是 null-terminated | 用 go_parser 或 GoReSym 恢复 |
| 反编译结果难读 | Go 的 defer/goroutine/interface 让伪代码复杂 | IDA 9.2+ 有改进，或用动态分析辅助 |
| Garble 混淆 | 函数名/字符串全部随机化 | GoResolver + GoStringUngarbler |
| 版本差异 | 不同 Go 版本的 pclntab 格式不同 | GoReSym 支持 Go 1.2-1.23+ |
| CGo 边界 | Go 和 C 代码混合 | 识别 _cgo_* 函数作为分界线 |

---

## 与其他 skill 的配合

| 需求 | 用什么 |
|------|--------|
| IDA 深度分析 Go 二进制 | `ida-reverse/` + go_parser 插件 |
| Ghidra 分析（免费） | Ghidra + GoReSym 符号导入 |
| 快速侦察 | `radare2/` — `rabin2 -z` 看字符串 |
| 动态 Hook | Frida（Hook runtime 函数）或 dlv（Go 原生调试器） |
| 跨版本对比 | `binary-diff/` — 旧版有符号迁移到新版 |
| Garble 去混淆 | GoResolver + GoStringUngarbler |
