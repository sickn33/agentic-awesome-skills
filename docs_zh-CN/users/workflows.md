# Antigravity 工作流

> 工作流手册，以更少的摩擦协调多个技能。

## 什么是工作流？

工作流是一个指导性的、逐步执行路径，将多个技能组合起来实现一个具体目标。

- **包**告诉您哪些技能与某个角色相关。
- **工作流**告诉您如何按顺序使用这些技能来完成实际目标。

如果包是您的工具箱，工作流就是您的执行手册。

---

## 如何使用工作流

1. 安装一次仓库（`npx antigravity-awesome-skills`）。
2. 选择符合您即时目标的工作流。
3. 按顺序执行步骤，并在每个步骤中调用的列出的技能。
4. 在每个步骤保留输出成果（计划、决策、测试、验证证据）。

当您需要更广泛的覆盖范围时，可以将工作流与[bundles.md](bundles.md)中的包结合使用。

---

## 工作流：发布 SaaS MVP

构建并发布一个最小化但面向生产的 SaaS 产品。

**相关包：** `Essentials`、`Full-Stack Developer`、`QA & Testing`、`DevOps & Cloud`

### 前置条件

- 已配置本地仓库和运行时。
- 明确的用户问题和 MVP 范围。
- 已选择基本部署目标。

### 步骤

1. **规划范围**
   - **目标：** 定义 MVP 边界和验收标准。
   - **技能：** [`@brainstorming`](../../skills/brainstorming/)、[`@concise-planning`](../../skills/concise-planning/)、[`@writing-plans`](../../skills/writing-plans/)
   - **提示词示例：** `使用 @concise-planning 定义我的 SaaS MVP 的里程碑和验收标准。`

2. **构建后端和 API**
   - **目标：** 实现核心实体、API 和身份验证基线。
   - **技能：** [`@backend-dev-guidelines`](../../skills/backend-dev-guidelines/)、[`@api-patterns`](../../skills/api-patterns/)、[`@database-design`](../../skills/database-design/)
   - **提示词示例：** `使用 @backend-dev-guidelines 创建账单域的 API 和服务。`

3. **构建前端**
   - **目标：** 发布具有清晰 UX 状态的核心用户流程。
   - **技能：** [`@frontend-developer`](../../skills/frontend-developer/)、[`@react-patterns`](../../skills/react-patterns/)、[`@frontend-design`](../../skills/frontend-design/)
   - **提示词示例：** `使用 @frontend-developer 实现入门、空状态和初始仪表板。`

4. **测试和验证**
   - **目标：** 在发布前覆盖关键用户旅程。
   - **技能：** [`@test-driven-development`](../../skills/test-driven-development/)、[`@browser-automation`](../../skills/browser-automation/)、`@go-playwright`（可选，Go 栈）
   - **提示词示例：** `使用 @browser-automation 为注册和结账流程创建 E2E 测试。`
   - **Go 注意：** 如果项目 QA 和工具使用 Go，优先使用 `@go-playwright`。

5. **安全发布**
   - **目标：** 带有可观察性和回滚计划的发布。
   - **技能：** [`@deployment-procedures`](../../skills/deployment-procedures/)、[`@observability-engineer`](../../skills/observability-engineer/)
   - **提示词示例：** `使用 @deployment-procedures 创建带有回滚的发布检查清单。`

---

## 工作流：Web 应用安全审计

从范围定义到修复验证的集中安全审查。

**相关包：** `Security Engineer`、`Security Developer`、`Observability & Monitoring`

### 前置条件

- 测试的明确授权。
- 已记录的目标内范围。
- 可用的日志记录和环境详细信息。

### 步骤

1. **定义范围和威胁模型**
   - **目标：** 识别资产、信任边界和攻击路径。
   - **技能：** [`@ethical-hacking-methodology`](../../skills/ethical-hacking-methodology/)、[`@threat-modeling-expert`](../../skills/threat-modeling-expert/)、[`@attack-tree-construction`](../../skills/attack-tree-construction/)
   - **提示词示例：** `使用 @threat-modeling-expert 映射我的 Web 应用的关键资产和信任边界。`

2. **审查身份验证和访问控制**
   - **目标：** 检测账户接管和授权缺陷。
   - **技能：** [`@broken-authentication`](../../skills/broken-authentication/)、[`@auth-implementation-patterns`](../../skills/auth-implementation-patterns/)、[`@idor-testing`](../../skills/idor-testing/)
   - **提示词示例：** `使用 @idor-testing 验证多租户端点上的未授权访问。`

3. **评估 API 和输入安全**
   - **目标：** 发现高影响的 API 和注入漏洞。
   - **技能：** [`@api-security-best-practices`](../../skills/api-security-best-practices/)、[`@api-fuzzing-bug-bounty`](../../skills/api-fuzzing-bug-bounty/)、[`@top-web-vulnerabilities`](../../skills/top-web-vulnerabilities/)
   - **提示词示例：** `使用 @api-security-best-practices 审计身份验证、账单和管理端点。`

4. **加固和验证**
   - **目标：** 将发现转换为修复并验证缓解证据。
   - **技能：** [`@security-auditor`](../../skills/security-auditor/)、[`@sast-configuration`](../../skills/sast-configuration/)、[`@verification-before-completion`](../../skills/verification-before-completion/)
   - **提示词示例：** `使用 @verification-before-completion 证明缓解措施是有效的。`

---

## 工作流：构建 AI 代理系统

设计和交付具有可测量可靠性的生产级代理。

**相关包：** `Agent Architect`、`LLM Application Developer`、`Data Engineering`

### 前置条件

- 具有可测量结果的狭窄用例。
- 访问模型提供者和可观察性工具。
- 初始数据集或知识语料库。

### 步骤

1. **定义目标行为和 KPI**
   - **目标：** 设置质量、延迟和失败阈值。
   - **技能：** [`@ai-agents-architect`](../../skills/ai-agents-architect/)、[`@agent-evaluation`](../../skills/agent-evaluation/)、[`@product-manager-toolkit`](../../skills/product-manager-toolkit/)
   - **提示词示例：** `使用 @agent-evaluation 定义我的代理的基准和成功标准。`

2. **设计检索和记忆**
   - **目标：** 构建可靠的检索和上下文架构。
   - **技能：** [`@llm-app-patterns`](../../skills/llm-app-patterns/)、[`@rag-implementation`](../../skills/rag-implementation/)、[`@vector-database-engineer`](../../skills/vector-database-engineer/)
   - **提示词示例：** `使用 @rag-implementation 设计分块、嵌入和检索管道。`

3. **实现编排**
   - **目标：** 实现确定性编排和工具边界。
   - **技能：** [`@langgraph`](../../skills/langgraph/)、[`@mcp-builder`](../../skills/mcp-builder/)、[`@workflow-automation`](../../skills/workflow-automation/)
   - **提示词示例：** `使用 @langgraph 实现带有回退和人机回环的代理图。`

4. **评估和迭代**
   - **目标：** 通过结构化循环改进弱点。
   - **技能：** [`@agent-evaluation`](../../skills/agent-evaluation/)、[`@langfuse`](../../skills/langfuse/)、[`@kaizen`](../../skills/kaizen/)
   - **提示词示例：** `使用 @kaizen 根据测试发现的失败模式确定修复优先级。`

---

## 工作流：QA 和浏览器自动化

在 CI 中创建具有确定性执行的弹性浏览器自动化。

**相关包：** `QA & Testing`、`Full-Stack Developer`

### 前置条件

- 测试环境和稳定的凭据。
- 已识别的关键用户旅程。
- 可用的 CI 管道。

### 步骤

1. **准备测试策略**
   - **目标：** 范围旅程、装置和执行环境。
   - **技能：** [`@e2e-testing-patterns`](../../skills/e2e-testing-patterns/)、[`@test-driven-development`](../../skills/test-driven-development/)
   - **提示词示例：** `使用 @e2e-testing-patterns 定义最小但高影响的 E2E 套件。`

2. **实现浏览器测试**
   - **目标：** 使用稳定的选择器构建强大的测试覆盖。
   - **技能：** [`@browser-automation`](../../skills/browser-automation/)、`@go-playwright`（可选，Go 栈）
   - **提示词示例：** `使用 @go-playwright 在 Go 项目中实现浏览器自动化。`

3. **分类和加固**
   - **目标：** 消除不稳定行为并强制可重复性。
   - **技能：** [`@systematic-debugging`](../../skills/systematic-debugging/)、[`@test-fixing`](../../skills/test-fixing/)、[`@verification-before-completion`](../../skills/verification-before-completion/)
   - **提示词示例：** `使用 @systematic-debugging 分类和解决 CI 中的不稳定性。`

---

## 工作流：设计 DDD 核心域

连贯地对复杂领域建模，然后仅在合理的地方实现战术和事件模式。

**相关包：** `Architecture & Design`、`DDD & Evented Architecture`

### 前置条件

- 至少有一个领域专家或产品负责人代理的访问权限。
- 可用的当前系统上下文和集成环境。
- 对业务目标和关键领域成果的共识。

### 步骤

1. **评估 DDD 适用性和范围**
   - **目标：** 决定完整 DDD、部分 DDD 或简单模块化架构是否合适。
   - **技能：** [`@domain-driven-design`](../../skills/domain-driven-design/)、[`@architecture-decision-records`](../../skills/architecture-decision-records/)
   - **提示词示例：** `使用 @domain-driven-design 评估完整 DDD 对于我们的账单和履行平台是否合理。`

2. **创建战略模型**
   - **目标：** 定义子域、限界上下文和通用语言。
   - **技能：** [`@ddd-strategic-design`](../../skills/ddd-strategic-design/)
   - **提示词示例：** `使用 @ddd-strategic-design 分类子域并提出具有所有权的限界上下文。`

3. **映射上下文关系**
   - **目标：** 定义上游/下游合约和反腐败边界。
   - **技能：** [`@ddd-context-mapping`](../../skills/ddd-context-mapping/)
   - **提示词示例：** `使用 @ddd-context-mapping 建模 Checkout、Billing 和 Inventory 的交互，明确合约所有权。`

4. **实现战术模型**
   - **目标：** 使用聚合、值对象和领域事件编码不变量。
   - **技能：** [`@ddd-tactical-patterns`](../../skills/ddd-tactical-patterns/)、[`@test-driven-development`](../../skills/test-driven-development/)
   - **提示词示例：** `使用 @ddd-tactical-patterns 为订单生命周期转换设计聚合和不变量。`

5. **有选择地采用事件模式**
   - **目标：** 仅在复杂性和规模需要的地方应用 CQRS、事件存储、投影和 Saga。
   - **技能：** [`@cqrs-implementation`](../../skills/cqrs-implementation/)、[`@event-store-design`](../../skills/event-store-design/)、[`@projection-patterns`](../../skills/projection-patterns/)、[`@saga-orchestration`](../../skills/saga-orchestration/)
   - **提示词示例：** `使用 @cqrs-implementation 和 @projection-patterns 在不损害领域不变量的情况下扩展读端报告。`

---

## 机器可读的工作流

对于工具和自动化，工作流元数据可在[data/workflows.json](../../data/workflows.json)中获得。
