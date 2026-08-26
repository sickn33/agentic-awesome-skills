# AI 辅助逆向工程

> LLM 驱动反编译 / 多 Agent 验证 / 神经语义恢复
> 2025-2026 最大范式转变

## 核心工具与模型

### LLM4Decompile
- 首个将 LLM 用于二进制→源码反编译的开源框架
- 支持 x86/ARM/MIPS 多架构
- 输入: 汇编代码 → 输出: C 源码
- 训练数据: 百万级 源码-汇编 对

### Decaf (2026)
- **编译器反馈验证**: 将 LLM 生成的源码→编译→对比原始二进制
- 效果: 反编译率 26% → 83.9% (ExeBench Real -O2)
- 关键洞察: 反馈循环比更大模型更有效

### Constraint-Guided Multi-Agent (2026)
- 三级验证管道:
  1. 语法正确性 (解析)
  2. 可编译性 (GCC)
  3. 行为等价性 (LLM 生成测试用例)
- 84-97% 可重执行率，每次仅 $0.03-0.05

### REMEND (2026)
- 专项: 从二进制提取数学方程
- 89.8-92.4% 准确率 (跨 3 ISA × 3 优化级别 × 2 语言)
- 速度: 0.132s/函数, 仅 12M 参数

### Glaurung
- 开源 Ghidra 替代，Rust 内核 + Python 绑定
- **AI 原生架构**: LLM Agent 嵌入每个分析层
- 证据制品: plain/rich/JSON/JSONL 多格式输出供 LLM 消费
- 支持: ELF/PE/Mach-O、x86/ARM/RISC-V、IOC 检测、熵分析

## 工作流：AI 增强二进制分析

### 1. LLM 辅助快速侦察

```text
□ strings 提取 → LLM 语义分类（URL/密钥/路径/协议）
□ 导入表分析 → LLM 推断功能（加密=OpenSSL? 网络=libcurl?）
□ 反汇编片段 → LLM 识别模式（密码算法、反调试、虚拟机检测）
□ 错误消息 → LLM 推断上下文（"Invalid license" → 授权逻辑位置）
```

### 2. 神经反编译

```bash
# LLM4Decompile
python llm4decompile.py --binary target.so --arch arm64 --output target.c

# 验证结果（重编译 + 对比）
gcc -O2 -o target_recompiled target.c -fPIC -shared
# → 验证输出行为等价性
```

### 3. Multi-Agent 验证

```text
Agent 1 (语法): 检查生成的 C 代码是否可以 parse
  ↓ 失败 → 反馈错误信息给 LLM 重试
Agent 2 (编译): GCC 编译 → 检查 warnings/errors
  ↓ 失败 → 反馈编译错误给 LLM
Agent 3 (行为): LLM 生成输入 → 运行原始和重编译版本 → 对比输出
  ↓ 不一致 → 反馈差异给 LLM → 迭代修正
```

### 4. LLM 辅助静态分析

```text
□ 函数重命名: 输入反编译伪代码 → LLM 建议语义化名称
□ 类型恢复: 分析上下文 → LLM 推断结构体/类定义
□ 算法识别: 汇编片段 → LLM 识别密码算法（AES/TEA/RC4/自定义）
□ 协议逆向: 网络包序列 → LLM 推断协议格式
□ 注释生成: 反编译代码 → LLM 生成中文/英文注释
```

### 5. macOS/iOS 私有框架逆向 (MOTIF)

```text
问题: macOS 私有框架无文档，类型信息缺失
方案: LLM 分析使用模式 → 推断方法签名和参数类型
效果: ObjC 签名恢复 15% → 86% (vs 静态分析)
```

## LLM Prompt 模板

### 函数语义分析

```
You are a reverse engineering expert. Analyze this decompiled function:

[伪代码]

1. What does this function do? (one sentence)
2. Suggest a meaningful function name.
3. What are the input parameters and their likely types?
4. What is the return value?
5. What external APIs/functions does it depend on?
6. Any security-relevant operations (crypto, auth, network, file I/O)?
```

### 算法识别

```
Analyze this assembly/disassembly for cryptographic operations:

[汇编代码]

1. Is this a known cryptographic algorithm? (AES/DES/RC4/TEA/ChaCha20/custom?)
2. Identify the key schedule and round structure.
3. What is the key size?
4. Are there any hardcoded constants that identify the algorithm?
```

### 协议格式推断

```
Given this network packet sequence, infer the protocol structure:

[hex dump]

1. Identify magic bytes and length fields.
2. Propose a struct definition for the packet header.
3. What field(s) appear to be checksums/CRCs?
4. Is this a known protocol or custom?
```

## 工具选型

| 场景 | 推荐工具 | 成本 |
|------|---------|------|
| 快速反编译 | LLM4Decompile | 免费 (本地 GPU) |
| 高精度反编译 | Constraint-Guided Multi-Agent | ~$0.05/二进制 |
| 数学函数提取 | REMEND | 免费 |
| 全平台 RE | Glaurung (Rust) | 免费开源 |
| LLM 交互 | Claude API / GPT-4 / DeepSeek | ~$0.01-0.10/次 |

## 局限性

- **复杂控制流**: 虚拟化/混淆代码仍困难（控制流平坦化、VMProtect）
- **间接调用**: 虚函数表、函数指针难以恢复
- **内联函数**: 编译器内联后边界模糊
- **浮点运算**: 向量化指令的语义恢复有待提升
- **上下文窗口**: 大函数 (>1000 行) 超出 LLM 上下文限制

Source: Decaf (2026), REMEND (2026), Constraint-Guided Multi-Agent Decompilation (2026), LLM4Decompile, Glaurung
