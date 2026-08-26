# OLLVM 反混淆 / Obfuscator-LLVM Deobfuscation

> 面向 APK .so、ELF 二进制和控制流平坦化场景的 OLLVM 脱密工作流。
> 工具与变种信息基于 2026 年社区活跃项目调研，非训练记忆。
> 适用：Android NDK 加固、CTF 逆向、加壳 .so 分析、商业混淆器对抗。

---

## 0. 快速决策：我该用哪个工具？

根据你的环境和对目标混淆类型的判断，直接对号入座：

| 你的情况 | 首选工具 | 备选 | 说明 |
|---------|---------|------|------|
| 有 IDA Pro 7.5-7.7 + Hex-Rays，想一键去平坦化 | **obpo-plugin** | d810-ng | obpo 用 microcode + 数据流 + 混合执行，效果最强，但是云插件（需联网，核心闭源） |
| 有 IDA Pro（任意较新版本），想本地一站式反混淆 | **d810-ng** | D-810 原版 | 本地、开源、集成 Z3，支持 OLLVM/Tigress/Hodur/Approov 多变种 |
| 有 Binary Ninja | **ollvm-breaker** | — | 针对 Android .so 实战（libvdog 等加固样本） |
| 无 IDA/BN，纯脚本，目标 x86/x64 | **ollvm-unflattener** (Miasm) | angr deflat | 基于 Miasm 符号执行，BFS 多层处理 |
| 无 IDA/BN，纯脚本，目标 x86/x64 | **ollvm-unflattener** (Miasm) | angr deflat | 基于 Miasm 符号执行，BFS 多层处理 |
| 纯 Python 符号执行，CTF 场景 | **angr** Deobfuscator | Triton | 不依赖 GUI，脚本化 |
| 目标是 ARM64 .so，无 IDA | **deollvm** (Unicorn) | angr | 基于 Unicorn 的 ARM64 deflat |
| 遇到 BR 混淆（间接分支） | **DeObfBR** | 设置数据段只读 | Goron/Arkari 风格的 BR 混淆可被数据段只读简单对抗 |
| 遇到 Tigress 混淆 | d810-ng `UnflattenerSwitchCase`/`UnflattenerTigressIndirect` | — | d810-ng 内置 Tigress 专用 unflattener |

> **核心建议：** 优先用 **d810-ng**（本地、维护活跃、变种覆盖广）。云服务可用时 **obpo-plugin** 效果最好。两者都失败再上 **angr/Miasm** 符号执行做定制化处理。

---

## 1. 现代 OLLVM 变种生态（2026 社区调研）

OLLVM 早已不只是 2017 年那个原始仓库。以下是目前活跃的混淆器分支，**脱密前必须先判断目标是哪个变种**，因为不同变种的对抗手段差异很大：

### 1.1 混淆器分支谱系

| 变种 | 基准 LLVM | 相比原始 OLLVM 的新增特性 | 对抗要点 |
|------|----------|----------------------|---------|
| **Obfuscator** (原始) | 3.3~4.0 | sub + bcf + fla（三大基础 pass） | 标准工具均可处理 |
| **Hikari** | 6~8 | Anti Class Dump、Function Call Obfuscate、Function Wrapper、Indirect Branching、Split BB、String Encryption | 需先解密字符串 + 修复间接跳转 |
| **Hikari-LLVM15** | 15~19 | + Anti Debugging、Anti Hook、Constant Encryption | 已闭源；Constant Encryption 增加静态分析难度 |
| **goron** | 7~10 | Indirect Branch/Call/GlobalVariable | ⚠️ Goron 风格间接混淆可被「设置数据段只读」简单对抗 |
| **Arkari** (komimoe/Hikari) | 14~latest | 基于 goron，持续维护 | 同 goron，数据段只读即可部分对抗 |
| **Pluto** | 14 | MBA Obfuscation、Random CF、Split BB、**Trap Angr**（专门坑 angr） | ⚠️ Trap Angr pass 会让 angr 符号执行失效，需换工具或绕陷阱 |
| **Polaris** (原 Pluto) | 16 | Alias Access、Indirect Branch/Call、String Encryption、Merge Function、Linear MBA、Dirty Bytes Insertion、Function Splitting、Junk Insertion | 综合 Hikari+Pluto，最棘手，需分层处理 |
| **O-MVLL** | open-obfuscator | Python 驱动 pass manager；Anti Hooking、Arithmetic(MBA)、BB Duplicate、CF Breaking、Function Outline、Indirect Branch/Call、Opaque Constants | 现代 Android 加固常用，Python 配置易定制 |
| **amice** (Rust) | Rust 实现 | 全套 + VM Flatten、Instruction Virtualization、Delayed Offset Loading、Parameter Aggregation | 含 VM 化，需 VM handler 还原而非单纯 deflat |
| **VMP 系** (SmallVmp/VMPilot/xVMP/VMPacker) | — | 指令虚拟化 | **不属于 OLLVM 范畴**，需 VM 逆向，参考 VM 专用工具 |

### 1.2 关键判断线索

- **Trap Angr**（Pluto/Polaris）：如果 angr 跑着跑着爆炸或路径爆炸，怀疑目标用了 Trap Angr pass → 改用 d810-ng 或 Unicorn 动态方法
- **Goron/Arkari 间接跳转**：如果分发器用间接跳转（BR x8 而非 switch），先尝试把相关数据段设为只读，间接跳转目标常变成可静态求解
- **Constant Encryption**（Hikari-LLVM15/Polaris/O-MVLL）：常量在运行期解密，纯静态看不到真实值 → 需要 Unicorn 动态执行解密 stub
- **VM Flatten**（amice）：控制流变成 VM dispatch loop，**不要当普通 fla 处理**，需要先识别 VM handler 表

---

## 2. OLLVM 混淆类型检测

OLLVM 三大核心 pass 的识别特征：

### 2.1 控制流平坦化 (Control Flow Flattening / `fla`)

**IDA 视图特征：**
- 函数入口先跳转到唯一的分发器（dispatcher）块
- 主逻辑被拆成多个基本块，每个块末尾跳回分发器
- 分发器通过**状态变量**（state variable）决定下一个要执行的块
- 巨大的 `switch` 结构，各 case 之间无逻辑关联

```
Original:             OLLVM flattened:
  block_A               entry -> dispatcher
  block_B                 ↓
  block_C              state_machine:
                         switch(state):
                           0 → block_A
                           1 → block_B
                           2 → block_C
```

**变种形态（d810-ng 识别的多种 dispatcher）：**
- O-LLVM：switch / if-chain + 状态变量
- Tigress：`m_jtbl`（switch-case）或 `m_ijmp`（间接跳转，需 `goto_table_info` 配置）
- Hodur (PlugX)：嵌套 `while(1)` 状态机，`jnz state, #CONST`，**无 switch 分发器**
- Approov：`while(v8 != C)`，状态常量集中在 `0xF6000–0xF6FFF`

### 2.2 虚假控制流 (Bogus Control Flow / `bcf`)

- 每个真实分支间插入**不可达假分支**
- 假分支用**不透明谓词**保护（条件恒真/恒假，但静态分析无法直接证明）
- 大量死代码膨胀函数体积

```c
// 经典不透明谓词：x(x+1) 必为偶数，编译器证明不了
if (x * (x + 1) % 2 == 0) {
    // 真实逻辑
} else {
    // 不可达垃圾代码
}
```

### 2.3 指令替换 (Instruction Substitution / `sub`) → MBA

- 简单算术/位运算替换为等价复杂表达式（MBA, Mixed Boolean-Arithmetic）

```
a + b  →  (a ^ b) + 2*(a & b)
a ^ b  →  (a | b) - (a & b)
a - b  →  a + (~b) + 1
```

### 2.4 快速分类表

| 混淆类型 | IDA 特征 | 主要对抗手段 |
|---------|---------|------------|
| fla (平坦化) | 巨大 switch + 分发器 | obpo / d810-ng / deflat |
| bcf (虚假控制流) | 不可达分支 + 死代码 | d810-ng opaque predicate removal / 符号执行 |
| sub/MBA | 复杂算术表达式 | d810-ng MBA simplifier / SiMBA (Z3) |
| fla + bcf + sub | 全上，极大膨胀 | **分层去混淆（先 bcf 再 fla 再 sub）** |

---

## 3. 主流工具详解（社区活跃项目）

### 3.1 obpo-plugin — 最强效果，云插件

> [obpo-project/obpo-plugin](https://github.com/obpo-project/obpo-plugin) · 629⭐ · 2026-06 活跃

基于 Hex-Rays **microcode** 的伪代码优化器，使用**数据流跟踪 + 程序切片 + 混合执行（concolic）**重建平坦化控制流。效果是社区公认最强之一。

**关键特性：**
- 在 microcode 层操作，直接优化反编译输出（不是改 ASM）
- 支持 IDA 7.5.0 / 7.6.0 / 7.7.0 + Hex-Rays
- 架构：ARM, ARM64, x86, x86_64, PowerPC, PowerPC64, MIPS（7.6/7.5）
- **云插件**：目标函数二进制会上传到 obpo-server 处理（核心闭源，插件免费开源）
- 服务器自费维护，超时 600s，**禁止多线程/恶意调用**

**安装与使用：**
```text
1. 下载 obpo_plugin.py 和 obpoplugin 目录
2. 复制到 IDA plugins 路径
3. 重启 IDA，打开目标二进制
4. 在 CFG 中定位分发块（dispatcher），通常长这样：
   [截图参考仓库 assets/dispatchblock.png]
5. 右键 → OBPO → Mark and process function
6. 处理完成后刷新反编译器
7. 可根据反编译变化继续标记新的分发块（迭代处理嵌套 fla）
```

**适用场景与限制：**
- ✅ 标准和嵌套 fla，效果好
- ⚠️ 需要联网，敏感样本（内部未公开漏洞、商业机密）慎用——二进制会上传
- ⚠️ 服务器可能宕机，依赖作者维护
- ❌ 不能解决所有混淆（作者明确声明）

### 3.2 d810-ng — 本地一站式首选

> [w00tzenheimer/d810-ng](https://github.com/w00tzenheimer/d810-ng) · 223⭐ · 2026-06-26 更新

D-810 的现代维护/重构版（Next Generation）。本地运行、开源、集成 **Z3 SMT** 求解器，变种覆盖最广。

**核心能力（按 d810-ng README 整理）：**

*指令级优化：*
| 类别 | 说明 |
|------|------|
| MBA simplification | `(a+b)-2*(a&b) => a^b`，Z3 验证的 DSL 规则 |
| Hacker's Delight | 位运算等价（来自 Hacker's Delight 一书） |
| O-LLVM patterns | Obfuscator-LLVM 专用 MBA 模式 |
| Constant folding | 22 条常量简化规则 |
| Predicate simplification | 不透明谓词去除（setz/setnz/lnot/smod） |
| Z3 rules | 模板匹配失败时用 SMT 求解 |
| Hodur-specific | PlugX (Hodur) 恶意软件的 MBA 模式 |

*控制流 Unflattener（按目标混淆分类）：*
| Unflattener | 目标 | 说明 |
|------------|------|------|
| `Unflattener` | O-LLVM | 标准 switch/if-chain + 状态变量 |
| `UnflattenerSwitchCase` | Tigress | Tigress switch-case 分发（`m_jtbl`） |
| `UnflattenerTigressIndirect` | Tigress | Tigress 间接跳转（`m_ijmp`），需 `goto_table_info` 配置 |
| `HodurUnflattener` | Hodur (PlugX) | 嵌套 `while(1)` + `jnz state, #CONST`，无 switch |
| `BadWhileLoop` | Approov | `while(v8 != C)`，状态常量在 0xF6000–0xF6FFF |
| `UnflattenerFakeJump` | 通用 | 去除恒真/恒假的条件跳转 |
| `SingleIterationLoopUnflattener` | 残留 | 清理 `INIT == CHECK` 且 `UPDATE != CHECK` 的单次循环 |
| `UnflattenControlFlowRule` (实验) | 通用 | 基于 path emulation 的 CFG unflattener |

**安装与使用：**
```text
1. clone d810-ng
2. 安装依赖（含 Z3）
3. 复制到 IDA plugins 目录
4. IDA 中按 Ctrl-Shift-D 加载插件
5. 在 GUI 中勾选要应用的规则集
6. 对目标函数应用
```

**为什么选 d810-ng 而非原版 D-810：**
- 原版 D-810 已较少维护
- d810-ng 有 CI 测试、重构代码、新增 Tigress/Hodur/Approov 专用 unflattener
- 集成 Z3，模板匹配失败时回退到 SMT 求解，成功率更高

### 3.3 ollvm-unflattener — Miasm 符号执行，纯脚本

> [cdong1012/ollvm-unflattener](https://github.com/cdong1012/ollvm-unflattener) · 265⭐ · 2026-06 活跃

基于 **Miasm** 符号执行引擎，不依赖 IDA/BN，纯 Python 命令行。

**特性：**
- 用 Miasm 符号执行恢复原始控制流（区别于 MODeflattener 的纯静态方法）
- **BFS 多层处理**：自动跟随目标函数的调用，递归去混淆
- 支持 Windows/Linux x86/x64
- 输出去混淆后的新二进制

**安装与使用：**
```bash
git clone https://github.com/cdong1012/ollvm-unflattener.git
cd ollvm-unflattener
pip install -r requirements.txt   # miasm, graphviz, keystone-engine

# 基本用法
python unflattener -i <input.bin> -o <output.bin> -t <function_addr> -a
# -a: 自动跟随调用做多层处理
```

**适用：** 无 IDA、目标 x86/x64、需要批量脚本化处理。

### 3.4 ollvm-breaker — Binary Ninja 实战

> [amimo/ollvm-breaker](https://github.com/amimo/ollvm-breaker) · 441⭐

使用 **Binary Ninja** 去平坦化，仓库自带 Android 加固样本 `libvdog.so` 作为测试用例，已修复 JNI_OnLoad、crazy::GetPackageName、prevent_attach_one 等函数。

**适用：** Binary Ninja 用户、Android .so 实战。

### 3.5 deollvm — ARM64 Unicorn

> [GeT1t/deollvm](https://github.com/GeT1t/deollvm) · 34⭐ · 2026-04

基于 **Unicorn** 的 ARM64 OLLVM deflat。无 IDA 时处理 ARM64 .so 的备选。

### 3.6 DeObfBR — BR 混淆专项

> [Mrack/DeObfBR](https://github.com/Mrack/DeObfBR) · 96⭐ · 2026-06-25

专门去除 **BR 混淆**（间接分支混淆，Goron/Arkari 风格）。

**⚠️ 简易对抗技巧（来自 awesome-ollvm）：** Goron/Arkari 风格的间接相关混淆，可以通过**设置数据段为只读**来简单对抗——间接跳转目标常依赖运行期可写的数据段，设只读后变成可静态求解。

### 3.7 angr — 符号执行通用框架

```python
import angr

proj = angr.Project("target.so", auto_load_libs=False)
cfg = proj.analyses.CFGFast()
func = proj.kb.functions[0x12345]

# 内置 Deobfuscator
deob = proj.analyses.Deobfuscator(func=func)
deob.normalize()
```

**⚠️ Pluto/Polaris 的 Trap Angr pass：** 这两个变种专门写了 trap 来坑 angr 符号执行。如果 angr 路径爆炸或异常，怀疑目标用了 Trap Angr → 改用 d810-ng 或 Unicorn 动态方法。

---

## 4. 完整脱密工作流（按场景）

### 4.1 通用决策树

```
目标二进制
  ↓
1. 识别 OLLVM 变种（看 1.2 节线索）
  ├── 原始 OLLVM / Hikari / O-MVLL  → 标准 fla/bcf/sub
  ├── Pluto / Polaris                → 注意 Trap Angr，避开 angr
  ├── Goron / Arkari                 → 先试数据段只读，再处理 BR
  ├── Tigress                        → d810-ng Tigress unflattener
  ├── Hodur (PlugX)                  → d810-ng HodurUnflattener
  └── amice (含 VM)                  → 不是单纯 fla，需 VM handler 还原
  ↓
2. 选择工具（看第 0 节决策表）
  ├── 有 IDA + 可联网 + 非敏感样本 → obpo-plugin
  ├── 有 IDA + 本地              → d810-ng
  ├── 有 Binary Ninja            → ollvm-breaker
  ├── 无 GUI + x86/x64           → ollvm-unflattener (Miasm)
  ├── 无 GUI + ARM64             → deollvm (Unicorn) / angr
  └── 纯符号执行 / CTF           → angr
  ↓
3. 分层去混淆（顺序很重要）
  a) 先去除不透明谓词 (bcf)   → d810-ng opaque predicate removal
  b) 再去除控制流平坦化 (fla) → unflattener
  c) 最后简化 MBA (sub)       → d810-ng MBA simplifier / SiMBA
  ↓
4. 验证
  ├── 函数体积显著减小？
  ├── CFG 从星形/放射状变为链形/树形？
  └── Frida hook 关键函数验证逻辑正确？
```

### 4.2 Android NDK .so 脱密专项

Android NDK 编译的 .so 经 OLLVM 加固是 APK 逆向最常见的场景。

**Step 1 — 提取 .so：**
```bash
adb pull /data/app/~~/lib/arm64/libnative.so
# 或从 APK 直接解压：unzip target.apk -d out/ ; find out -name "*.so"
```

**Step 2 — 识别 OLLVM 与变种：**
```bash
readelf -a libnative.so | grep -E "Size|text"   # .text 异常大但函数少 → 大概率 OLLVM
# IDA 打开看函数特征：
#   巨大 switch → fla
#   不可达分支 → bcf
#   复杂算术 → sub/MBA
#   间接跳转 BR x8 → Goron/Arkari，试数据段只读
#   while(1) + jnz state → Hodur，用 d810-ng HodurUnflattener
```

**Step 3 — 脱密（分层）：**
```
a) bcf: d810-ng opaque predicate removal  (或 obpo 自动处理)
b) fla: d810-ng Unflattener / obpo-plugin / deollvm(ARM64)
c) sub: d810-ng MBA simplifier
```

**Step 4 — Frida 动态验证：**
```javascript
// Trace OLLVM 状态变量，辅助 deflat 确定状态变量地址
const target = Module.findBaseAddress("libnative.so");
console.log("[+] libnative.so @", target);

// 在分发器入口下 hook，观察 state 变化序列
Interceptor.attach(target.add(0x1234), {  // dispatcher offset
    onEnter(args) {
        // 读取状态变量（需根据反编译确定寄存器/栈位置）
        console.log("[state]", this.context.x8);  // 假设 state 在 x8
    }
});
```

### 4.3 CTF 场景快速脱密

CTF 通常时间紧，优先用最快路径：

```python
#!/usr/bin/env python3
"""CTF OLLVM quick deflat with angr"""
import angr

proj = angr.Project("challenge", auto_load_libs=False)
cfg = proj.analyses.CFGFast()

# 找最大的几个函数（最可能是被混淆的）
funcs = sorted(cfg.functions.values(), key=lambda f: f.size, reverse=True)[:5]
for func in funcs:
    print(f"[*] {func.name} @ {hex(func.addr)} size={hex(func.size)}")
    try:
        deob = proj.analyses.Deobfuscator(func=func)
        deob.normalize()
        print(f"    [+] deobfuscated")
    except Exception as e:
        print(f"    [-] failed: {e}")
        # angr 失败 → 怀疑 Trap Angr → 换 d810-ng / Unicorn
```

---

## 5. MBA 表达式简化

### 5.1 常见 OLLVM MBA 模式

```python
# 这些等式是 OLLVM sub pass 生成表达式的化简目标
"(a | b) + (a & b)"        # → a + b
"(a | b) - (a & b)"        # → a ^ b
"(a ^ b) + 2*(a & b)"      # → a + b
"(a | b) & ~(a & b)"       # → a ^ b
"~(~a & ~b)"               # → a | b (De Morgan)
```

### 5.2 工具选择

| 工具 | 方式 | 适用 |
|------|------|------|
| **d810-ng MBA simplifier** | IDA 内批量，Z3 验证 | 首选，集成在反编译流程 |
| **SiMBA** (`pip install simba-simplifier`) | 命令行/库 | 纯表达式化简，批量处理 |
| **Arybo** | 符号位向量 | 大量 MBA 表达式 |
| **Z3 直接求解** | SMT | 最通用，模板匹配都失败时 |

```python
# SiMBA 示例
from simba import simplify_mba
exprs = ["(a | b) + (a & b)", "(a ^ b) + 2*(a & b)"]
for e in exprs:
    print(f"{e}  →  {simplify_mba(e)}")
```

---

## 6. 完整脱密案例脚本

```bash
#!/bin/bash
# OLLVM deobfuscation pipeline (2026 community tools)
# 适用标准 OLLVM / Hikari / O-MVLL 加固的 ELF/.so

BINARY=$1

echo "[*] Stage 0: 基本分析与变种识别"
file $BINARY
readelf -h $BINARY 2>/dev/null | head -5
echo "    → 在 IDA 中确认变种（参考第 1 节）"

echo "[*] Stage 1: d810-ng 本地反混淆（首选）"
echo "    IDA → Ctrl-Shift-D 加载 d810-ng"
echo "    勾选: MBA + Opaque predicate + Unflattener"
echo "    Apply to target functions"
echo "    保存 IDB"

echo "[*] Stage 2: obpo-plugin（如 d810-ng 效果不足且可联网）"
echo "    IDA → 右键 dispatcher → OBPO → Mark and process"
echo "    ⚠️ 敏感样本勿用（二进制上传云服务）"

echo "[*] Stage 3: 无 IDA 备选（x86/x64）"
echo "    python unflattener -i $BINARY -o deobf.bin -t <func_addr> -a"

echo "[*] Stage 4: ARM64 .so 无 IDA 备选"
echo "    deollvm (Unicorn) 或 angr Deobfuscator"

echo "[+] Done. 在 IDA 中重新分析验证。"
```

---

## 7. 常见陷坑（社区实战总结）

| 问题 | 原因 | 解决办法 |
|------|------|---------|
| angr 路径爆炸/异常退出 | Pluto/Polaris 的 **Trap Angr** pass | 换 d810-ng 或 Unicorn 动态方法 |
| obpo-plugin 联不上 | 服务器自费维护，可能宕机 | 转用本地 d810-ng；可在 obpo 仓库提 issue |
| Goron/Arkari 间接跳转 deflat 失败 | 分发器用 BR x8 而非 switch | 先把数据段设只读，再用 DeObfBR |
| d810-ng 处理后函数仍乱 | OLLVM 自定义了 pass 参数/seed | 先符号执行去不透明谓词，再 unflatten |
| 嵌套 fla（多层平坦化）一次没清干净 | obpo/d810-ng 单次只清一层 | **迭代处理**：每次标记新出现的 dispatcher |
| ARM64 .so 用 deflat 报错 | 老 deflat 脚本只支持 x86 | 用 d810-ng / obpo（支持 ARM64）/ deollvm |
| Hikari 字符串看不到 | String Encryption pass | 用 Unicorn 模拟解密 stub，dump 解密后字符串 |
| amice 目标 deflat 完全无效 | 含 VM Flatten / Instruction Virtualization | **不是 OLLVM fla**，需 VM handler 还原（参考 VM 逆向） |
| Hodur(PugX) 样本没有 switch 分发器 | 嵌套 while(1) + jnz state | 用 d810-ng **HodurUnflattener**，别用普通 Unflattener |
| Approov 样本状态常量看不出规律 | 常量集中在 0xF6000–0xF6FFF | 用 d810-ng **BadWhileLoop** unflattener |
| 敏感样本误用 obpo | 二进制上传云服务 | 涉密/未公开漏洞样本**只用本地工具**（d810-ng/angr） |
| Frida hook OLLVM 函数卡死 | 状态变量被改导致无限循环 | 在分发器入口加条件断点限制执行次数 |

---

## 8. 工具速查表（2026 社区活跃度）

| 工具 | 平台 | 方式 | Stars/价 | 最近更新 | 开源 | 备注 |
|------|------|------|---------|---------|------|------|
| **obpo-plugin** | IDA | microcode+concolic（云） | 629 | 2026-06 | 插件开源/核心闭源 | 效果最强，需联网 |
| **ollvm-breaker** | Binary Ninja | BN API | 441 | 2026-06 | ✅ | Android .so 实战 |
| **ollvm-unflattener** | CLI | Miasm 符号执行 | 265 | 2026-06 | ✅ | x86/x64，BFS 多层 |
| **d810-ng** | IDA | microcode+Z3 | 223 | 2026-06 | ✅ | **本地首选**，变种覆盖广 |
| **DeObfBR** | — | BR 混淆专项 | 96 | 2026-06 | ✅ | Goron/Arkari 间接分支 |
| **IDA_Ollvm-unflattener** | IDA | Miasm 插件版 | 90 | 2026-04 | ✅ | ollvm-unflattener 的 IDA 插件封装 |
| **deollvm** | CLI | Unicorn | 34 | 2026-04 | ✅ | ARM64 专项 |
| **angr** | CLI | 符号执行 | — | 活跃 | ✅ | 通用，被 Trap Angr 克制 |
| **SiMBA** | CLI/库 | MBA 化简 | — | — | ✅ | 表达式化简 |
| **Triton** | CLI | 符号执行+污点 | — | 活跃 | ✅ | 动态符号执行 |

---

## 9. 参考链接

**混淆器（用于理解对抗目标）：**
- [obfuscator-llvm/obfuscator](https://github.com/obfuscator-llvm/obfuscator) — 原始 OLLVM
- [HikariObfuscator/Hikari](https://github.com/HikariObfuscator/Hikari) — Hikari
- [komimoe/Hikari](https://github.com/komimoe/Hikari) — Arkari (基于 goron, LLVM 14+)
- [amimo/goron](https://github.com/amimo/goron) — goron
- [bluesadi/Pluto](https://github.com/bluesadi/Pluto) — Pluto
- [za233/Polaris-Obfuscator](https://github.com/za233/Polaris-Obfuscator) — Polaris (原 Pluto)
- [open-obfuscator/o-mvll](https://github.com/open-obfuscator/o-mvll) — O-MVLL
- [fuqiuluo/amice](https://github.com/fuqiuluo/amice) — Rust 实现 OLLVM passes
- [lich4/awesome-ollvm](https://github.com/lich4/awesome-ollvm) — **变种生态总览（强烈推荐先读）**

**反混淆工具：**
- [obpo-project/obpo-plugin](https://github.com/obpo-project/obpo-plugin) — 最强云插件
- [w00tzenheimer/d810-ng](https://github.com/w00tzenheimer/d810-ng) — 本地首选
- [cdong1012/ollvm-unflattener](https://github.com/cdong1012/ollvm-unflattener) — Miasm 纯脚本
- [amimo/ollvm-breaker](https://github.com/amimo/ollvm-breaker) — Binary Ninja
- [GeT1t/deollvm](https://github.com/GeT1t/deollvm) — ARM64 Unicorn
- [Mrack/DeObfBR](https://github.com/Mrack/DeObfBR) — BR 混淆专项
- [maskelihileci/IDA_Ollvm-unflattener](https://github.com/maskelihileci/IDA_Ollvm-unflattener) — IDA 插件版
- [angr](https://angr.io/) — 符号执行框架
- [SiMBA](https://github.com/tech-srl/simba) — MBA 化简

**学术/博客：**
- [Quarkslab: Deobfuscation: Recovering an OLLVM-protected program](https://blog.quarkslab.com/deobfuscation-recovering-an-ollvm-protected-program.html) — deflat 经典原理
- [MODeflattener](https://github.com/mrT4ntr4/MODeflattener) — 静态 deflat（ollvm-unflattener 的对照）

> 关联文档：[[anti-analysis.md]] (反调试/反分析总表)、[[tools-advanced.md]] (高级工具集)、[[elf-analysis.md]] (ELF 文件分析)、[[ai-assisted-re.md]] (AI 辅助逆向)
