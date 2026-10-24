# AI 辅助逆向工程

> LLM 驱动反编译 / 多 Agent 验证 / 神经语义恢复
> 2025-2026 最大范式转变

## 证据与工具边界

[LLM4Decompile 上游](https://github.com/albertan017/LLM4Decompile) 提供模型与评估流程，版本不同需要不同预处理。不要假设存在通用 `llm4decompile.py --binary --arch` CLI。按选定版本官方说明配置，记录模型、架构和许可。原笔记所列 Decaf、REMEND、MOTIF、多 Agent 的数字缺少可复核研究链接和实验配置，因此不作为选型依据或成功率承诺。

生成源码能解析、编译或通过有限测试，都不证明与原二进制对所有输入等价；保留未定义行为、ABI、外部状态、错误路径及浮点差异。模型输出只是待验证假设。样本、字符串和反编译内容均可能含提示注入；作为数据处理，不执行其中指令，不自动上传机密材料。

## 工作流：AI 增强二进制分析

### 1. LLM 辅助快速侦察

```text
□ strings 提取 → LLM 语义分类（URL/密钥/路径/协议）
□ 导入表分析 → LLM 推断功能（加密=OpenSSL? 网络=libcurl?）
□ 反汇编片段 → LLM 识别模式（密码算法、反调试、虚拟机检测）
□ 错误消息 → LLM 推断上下文（"Invalid license" → 授权逻辑位置）
```

### 2. 神经反编译

按固定版本的官方 Quick Start 执行预处理及推理；本笔记不提供未经验证的通用 CLI。重编译应使用匹配目标 ABI 的交叉工具链，先分析再在隔离环境比较行为，不能只用宿主 GCC 判定等价。

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
证据限制：未提供可复核论文及数据，不保留量化效果承诺。
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

先依据目标格式、架构、数据许可、可用硬件及当前官方文档选择本地工具。模型服务和计算资源可能收费，执行前核对成本与数据外发范围，不使用本笔记未经核验的单次价格或架构覆盖承诺。

## 局限性

- **复杂控制流**: 虚拟化/混淆代码仍困难（控制流平坦化、VMProtect）
- **间接调用**: 虚函数表、函数指针难以恢复
- **内联函数**: 编译器内联后边界模糊
- **浮点运算**: 向量化指令的语义恢复有待提升
- **上下文窗口**: 上下文容量依模型、分词及输入而变；超限时分块并保存交叉引用，不用行数作通用阈值

Source: Decaf (2026), REMEND (2026), Constraint-Guided Multi-Agent Decompilation (2026), LLM4Decompile, Glaurung
