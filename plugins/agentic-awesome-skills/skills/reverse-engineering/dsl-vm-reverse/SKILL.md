---
name: dsl-vm-reverse
description: "Reverse JavaScript-based custom DSL/VM interpreters and risk-control engines: identify IIFE/switch-based opcode dispatch, extract opcode tables, and capture runtime semantics."
risk: safe
source: "https://github.com/zhaoxuya520/reverse-skill"
source_repo: "zhaoxuya520/reverse-skill"
source_type: community
date_added: "2026-08-25"
license: "MIT"
license_source: "https://github.com/zhaoxuya520/reverse-skill/blob/main/LICENSE"
---
# 🔄 DSL 自定义虚拟机逆向（DSL VM Reverse Engineering）
## When to Use

- A protected web asset runs a custom bytecode VM (risk-control/captcha engines).
- Recovering opcode semantics from a JS interpreter loop.


## 目录

- [1. 适用范围](#1-适用范围)
- [2. DSL VM 识别特征](#2-dsl-vm-识别特征)
- [3. 通用逆向工作流](#3-通用逆向工作流)
- [4. Opcode 提取与分类](#4-opcode-提取与分类)
- [5. 运行时捕获方案](#5-运行时捕获方案)
- [6. 常见状态码](#6-常见状态码)
- [7. Skill 自检清单](#7-skill-自检清单)

---

## 1. 适用范围

当目标文件符合以下 **任意特征** 时使用本 skill：

| # | 特征 | 说明 |
|---|------|------|
| 1 | IIFE 开头 + 大量单字母变量名 | `!function(){var U=void 0,y=parseInt,E0=Function,...}` |
| 2 | 包含 `DG()` 或类似函数含 switch-case 循环 | 解释器主循环，`d[7]&31` 解码 opcode |
| 3 | 大文件（500KB+）但零字节占比 < 1% | 非标准 WASM，纯 JS |
| 4 | 包含 `C[number]` 常量表引用 | `C[9][xxx]` 函数表/字符串表 |
| 5 | 单行压缩代码 | 583KB 单行，混淆变量名 |

### 排除规则

| 条件 | 非本 skill | 转至 |
|------|-----------|------|
| 文件以 `\x00asm` 开头 | 标准 WASM 二进制 | `reverse-engineering/languages.md` |
| 文件以 `Uint8Array([0,97,115,109])` 含 WASM 魔术字 | WASM 嵌入式 | 提取 .wasm 后转 IDA/Ghidra |
| 标准 Webpack 打包（`function(e,t,n){...}`） | 普通 JS | `js-reverse/` |
| 零字节占比 > 20% | WASM 二进制 | `reverse-engineering/languages.md` |

---

## 2. DSL VM 识别特征

### 代码特征

```javascript
// 特征 1: IIFE 入口，单字母变量映射数字常量
!function(){
    var U=void 0, y=parseInt, E0=Function, AN=Uint8Array;
    var E=15, l=10, m=12, x=16, S=13, $=11;
    // 数字常量映射为变量名，替代原始数字
    ...
}

// 特征 2: 解释器主循环 DG()
function DG(C, d, ...) {
    var d = [];  // 数组模拟 WASM stack/locals
    for (d[7] = x; d[7] !== U;) {
        var aE = d[7] & 31;         // 低 5 位 = opcode
        var O = d[7] >> 5 & 31;      // 高 5 位 = sub-operation
        switch (aE) {
            case 0: /* ... */ d[7] = 612; break;
            case 1: /* ... */
            // ... N 个 case
        }
    }
}

// 特征 3: 常量表 C[9] 存储函数索引和字符串
// C[9][0] = ["pc"]      → 函数参数描述
// C[9][667] = "string"  → 字符串常量
// C[9][x] = number      → 函数索引

// 特征 4: W(C[index], null, ...) 调用模式
// W = Function.prototype.call.bind(call)
// 所有内置函数通过 C[index] 索引调用

// 特征 5: 指令编码格式
// d[7] = opcode(bit 0-4) | subop(bit 5-9) | operand(bit 10+)
```

### Opcode 编码格式

每条指令编码为 32 位整数：

```
bit 0-4:   opcode (0-N)
bit 5-9:   sub-operation (0-31)
bit 10-31: operand/立即数

解码:
  aE = d[7] & 31        → opcode
  O  = d[7] >> 5 & 31   → sub-operation
  d[other] = d[7] >> 10  → operand
```

---

## 3. 通用逆向工作流

### Phase 1: 文件分类（5 分钟）

```bash
# 检查是否为 DSL VM
python3 << 'EOF'
with open('target.js', 'rb') as f:
    head = f.read(100)

# 1. 检查 WASM 魔术字
if head[:4] == b'\x00asm':
    print("标准 WASM 二进制")
    exit()

# 2. 检查零字节占比
data = open('target.js', 'rb').read()
zero_pct = data.count(b'\x00') / len(data) * 100
print(f"零字节占比: {zero_pct:.1f}%")

if zero_pct > 20:
    print("WASM 二进制")
elif head[:2] == b'!f':
    # 检查单字母变量模式
    if b'var U=void 0' in head or b'U=void 0,y=parseInt' in head:
        print("→ DSL VM!")
    else:
        print("普通 JS IIFE")
EOF
```

### Phase 2: 变量映射表提取（10 分钟）

```python
import re

with open('target.js', 'r', errors='replace') as f:
    s = f.read()

# 提取开头 2000 字符的 var X=数字 映射
mappings = re.findall(r'var\s+(\w+)\s*=\s*(\d+)', s[:2000])
print('常量映射:')
for name, val in mappings:
    print(f"  {name:4s} = {val:3d} (0x{int(val):02x})")
```

### Phase 3: Opcode 提取与分类（15 分钟）

```python
# 1. 提取所有 case
all_cases = re.findall(r'case\s+(\d+):', s)
unique = sorted(set(int(c) for c in all_cases))

print(f"总 case: {len(all_cases)} 个")
print(f"唯一 opcode: {len(unique)} 个: {unique}")

# 2. 分类每个 opcode
for op in unique:
    idx = s.find(f'case {op}:')
    snippet = s[idx:idx+200]
    if 'd[7]=' in snippet:
        op_type = 'BRANCH'
    elif 'return' in snippet:
        op_type = 'RETURN'
    elif 'W(C[' in snippet:
        op_type = 'CALL'
    elif 'new' in snippet:
        op_type = 'ALLOC'
    elif 'try' in snippet or 'catch' in snippet:
        op_type = 'EXCEPTION'
    else:
        op_type = 'ARITH/STORE'
    print(f"  opcode {op:2d}: {op_type}")
```

### Phase 4: 常量表分析（30 分钟）

```python
const_refs = re.findall(r'C\[9\]\[(\d+)\]', s)
unique_refs = sorted(set(int(x) for x in const_refs))

print(f"C[9] 引用: {len(unique_refs)} 个索引")
print(f"范围: {min(unique_refs)} - {max(unique_refs)}")

# 对每个引用分析上下文
for ref in unique_refs[:20]:
    idx = s.find(f'C[9][{ref}]')
    ctx = s[max(0,idx-50):idx+80]
    clean = ''.join(c if c.isprintable() else ' ' for c in ctx)
    print(f"  C[9][{ref}] → {clean}")
```

### Phase 5: 导出函数追踪（1-2 小时）

导出函数（如 `getToken`）通过以下路径定位：

```
1. 找 AWSCInner.register() 或类似注册调用
2. 确定注册的模块和工厂函数
3. 找工厂函数返回的对象 → 导出函数定义位置
4. 若函数名不在 JS 中 → 在 C[9] 常量表中作字节码存储
5. 追踪调用链:
   AWSCInner._modules['fy'].getToken()
   → W(C[函数索引], null, ...)
   → DG() 解释器执行编码后的指令序列
```

### Phase 6: 运行时注入（若纯静态分析不够）

```javascript
// 注入最小 AWSC 兼容环境
const fakeEnv = {
    AWSCInner: {
        _modules: {},
        register(name, moduleName, factory) {
            this._modules[moduleName] = factory();
        }
    }
};

// 执行 DSL VM 代码
dslVmCode();

// 获取导出
const token = fakeEnv.AWSCInner._modules['fy'].getToken({});
```

---

## 4. Opcode 提取与分类

### 参考 opcode 对照表（基于已有案例）

| Opcode | 操作类型 | 特征 |
|--------|---------|------|
| 0 | **BRANCH** | `d[7]=xxx` 无条件跳转 |
| 1 | **CALL** | `W(C[Y],null,function(){...})` 嵌入函数调用 |
| 2 | **ARITH** | `d[4]=0`, `d[7]=72` 变量赋值 |
| 3 | **ARITH** | `d[0]=d[1][C[x]]`, `d[5]=d[0]<d[3]` 比较运算 |
| 4 | **STORE** | `d[8]=d[5]in d[4]` 属性访问/存在检查 |
| 5 | **ARITH** | `d[8]=d[4]-d[8]` 算术运算 |
| 6 | **RETURN** | `return gV`, `throw` 返回/抛出异常 |
| 7 | **ALLOC** | `d[6]=[]`, `d[6][C[8]] (...)` push 操作 |
| 8 | **BRANCH** | `d[7]=d[k]?512:425` 条件跳转 |
| 9 | **STRING** | `d[6][C[t]]=d[m]`, `new fh(...)` 正则 |
| 10 | **ALLOC** | 函数参数准备、调用栈创建 |
| 11 | **STRING** | `new fh("\\s",d[5])` 正则匹配 |
| 12 | **STORE** | `P[d[9]]=d[4][C[H]] (d[3])` 数据传递 |
| 13 | **CALL** | `C[9][113]=d[9]` 模块初始化 |
| 14 | **STRING** | `d[8]=d[9]+d[m]` 字符串拼接 |
| 15 | **RETURN** | `return EL;` 函数返回 |
| 16 | **ALLOC** | `var r,P,Z,B...` 局部变量声明 |
| 17 | **ALLOC** | `(Z=[])[C[8]] (69,T,445)` 静态数组初始化 |
| 18 | **TABLE** | 函数表/类型表初始化 |
| 19 | **EXCEPTION** | `try{for(var RK=x;...` try-catch 循环 |
| 20 | **DOM** | `Is[d[o]]` DOM 操作 |
| 21 | **STORE** | 安全获取全局/对象属性 |
| 22 | **STRING** | `new fh(r,v)` 字符串/正则处理 |
| 23 | **BRANCH** | `try...catch` 安全获取 + 条件跳转 |
| 24 | **CALL** | `W(C[2],null,8,z,FL)` 多参数函数调用 |
| 25 | **EXCEPTION** | `try{...}catch(C){...}` 异常捕获 + 跳转 |

---

## 5. 运行时捕获方案

### 方案 A: Selenium + CDP 原生事件（推荐，成功率最高）

```python
from selenium import webdriver

driver = webdriver.Chrome()

# 注入反检测
driver.execute_cdp_cmd("Page.addScriptToEvaluateOnNewDocument", {
    "source": r"""
        Object.defineProperty(navigator, 'webdriver', {get: () => false});
        Object.defineProperty(navigator, 'plugins', {get: () => [1,2,3,4,5]});
        Object.defineProperty(navigator, 'languages', {get: () => ['zh-CN','zh','en']});
    """
})

# 发送 CDP 原生鼠标事件
driver.execute_cdp_cmd("Input.dispatchMouseEvent", {
    "type": "mousePressed",
    "x": 549.5, "y": 441.2,
    "button": "left", "buttons": 1,
    "clickCount": 1, "pointerType": "mouse"
})
```

### 方案 B: Playwright 无头浏览器

```javascript
const { chromium } = require('playwright');

async function run() {
    const browser = await chromium.launch();
    const page = await browser.newPage();

    // 拦截网络请求
    await page.route('**/api/**', async route => {
        await route.continue_();
    });

    await page.goto('https://target-page.com');

    // 等待 DSL VM 初始化
    await page.waitForFunction(() => {
        return window.AWSCInner &&
               window.AWSCInner._modules &&
               window.AWSCInner._modules['fy'];
    });

    // 执行操作
    await page.mouse.move(500, 400);
    await page.mouse.down();
    // ... 操作序列
    await page.mouse.up();
}
```

### 方案 C: 纯协议验证（成功率极低）

> DSL VM 生成的 token 通常与浏览器上下文强绑定（TLS JA3 指纹、IP、Cookie、请求头等），脱离浏览器后服务端可检测到上下文不匹配。**不建议使用纯协议方案**。

---

## 6. 常见状态码

| Code | 含义 | 处理 |
|------|------|------|
| 0 | **验证通过** ✅ | 取出 sessionId + sig |
| 300 | **风控拦截** | 被拦截，无法通过 |
| 8778 | **验证失败，需重试** | 重试操作 |
| 8776 | **操作太快，需重试** | 增加延迟后重试 |
| 69634 | **通用失败** | 检查参数是否正确 |

---

## 7. Skill 自检清单

- [ ] 我是否完成了 DSL VM 识别（IIFE + 单字母变量 + DG() 解释器）？
- [ ] 我是否提取了变量映射表（`var X=数字`）？
- [ ] 我是否提取了 opcode 列表并分类？
- [ ] 我是否分析了常量表 C[9] 的引用范围？
- [ ] 我是否定位了导出函数注册点？
- [ ] 纯静态分析不够时，我是否尝试了运行时注入方案？
- [ ] 任务完成后是否回写了 field-journal？
- [ ] 是否发现新工具/新场景 → 更新 routing.md？

---

## 路由注册

| 类型 | 路由 |
|------|------|
| **目标类型**: WASM / DSL VM / 自定义指令集 | `reverse-engineering/dsl-vm-reverse/SKILL.md` |
| **用户意图**: "DSL VM / 风控引擎逆向" | 本 skill |
| **工具链**: Playwright / Selenium CDP | 浏览器注入方案 |

### 路径交叉

```
DSL VM 逆向路径:
  reverse-engineering/dsl-vm-reverse/ → Phase 1-6 工作流
  ↓ 若需要捕获运行时数据
  browser-automation/ → Playwright/Selenium CDP
  ↓ 若需要分析 API 协议层
  js-reverse/ → Observe→Capture→Rebuild
```

## Limitations

- Custom VMs vary wildly; methodology transfers but specifics do not.
- Runtime capture requires controlling the execution environment.

> Adapted from [zhaoxuya520/reverse-skill](https://github.com/zhaoxuya520/reverse-skill) (MIT).
