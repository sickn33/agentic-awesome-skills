# Kiro CLI 集成指南

## 概述

本指南说明如何将 Antigravity Awesome Skills 与 **Kiro CLI** 一起使用，Kiro CLI 是 AWS 的代理式 AI 驱动编码助手。

## 什么是 Kiro？

Kiro 是 AWS 的代理式 AI IDE，结合了：

- **自主编码代理**，可独立工作较长时间
- **上下文感知助手**，深入了解您的代码库
- **AWS 服务集成**，原生支持 CDK、SAM 和 Terraform
- **MCP（模型上下文协议）**，用于安全的外部 API 和数据库调用
- **规范驱动开发**，将自然语言转换为结构化规范

## 为什么使用 Kiro 技能？

Kiro 的代理能力通过以下技能得到增强：

- **领域专业知识**，涵盖 1,436+ 个专业领域
- **最佳实践**，来自 Anthropic、OpenAI、Google、Microsoft 和 AWS
- **工作流自动化**，用于常见开发任务
- **AWS 特定模式**，用于无服务器、基础设施和云架构

## 安装

### 快速安装

```bash
# 安装到 Kiro 的默认技能目录
npx antigravity-awesome-skills --kiro
```

这将把技能安装到 `~/.kiro/skills/`

### 手动安装

```bash
# 直接克隆到 Kiro 的技能目录
git clone https://github.com/sickn33/antigravity-awesome-skills.git ~/.kiro/skills
```

### 验证

```bash
# 验证安装
test -d ~/.kiro/skills && echo "✓ 技能安装成功"
ls ~/.kiro/skills/ | head -10
```

## 在 Kiro 中使用技能

### 基本调用

Kiro 使用自然语言提示来调用技能：

```
使用 @brainstorming 技能帮助我设计无服务器 API
```

```
将 @aws-serverless 模式应用于此 Lambda 函数
```

```
对我的 CDK 堆栈运行 @security-audit
```

### Kiro 用户推荐技能

#### AWS 和云基础设施

- `@aws-serverless` - 无服务器架构模式
- `@aws-cdk` - AWS CDK 最佳实践
- `@aws-sam` - SAM 模板模式
- `@terraform-expert` - Terraform 基础设施即代码
- `@docker-expert` - 容器优化
- `@kubernetes-expert` - K8s 部署模式

#### 架构和设计

- `@architecture` - 系统设计和 ADR
- `@c4-context` - C4 模型图
- `@senior-architect` - 可扩展架构模式
- `@microservices-patterns` - 微服务设计

#### 安全

- `@api-security-best-practices` - API 安全加固
- `@vulnerability-scanner` - 安全漏洞检测
- `@owasp-top-10` - OWASP 安全模式
- `@aws-security-best-practices` - AWS 安全配置

#### 开发

- `@typescript-expert` - TypeScript 最佳实践
- `@python-patterns` - Python 设计模式
- `@react-patterns` - React 组件模式
- `@test-driven-development` - TDD 工作流

#### DevOps 和自动化

- `@ci-cd-pipeline` - CI/CD 自动化
- `@github-actions` - GitHub Actions 工作流
- `@monitoring-observability` - 可观察性模式
- `@incident-response` - 事件管理

## Kiro 特定工作流

### 1. 无服务器应用程序开发

```
1. 使用 @brainstorming 设计应用程序架构
2. 应用 @aws-serverless 创建 Lambda 函数
3. 使用 @aws-cdk 生成基础设施代码
4. 运行 @test-driven-development 添加测试
5. 应用 @ci-cd-pipeline 设置部署
```

### 2. 基础设施即代码

```
1. 使用 @architecture 记录系统设计
2. 应用 @terraform-expert 编写 Terraform 模块
3. 运行 @security-audit 检查漏洞
4. 使用 @documentation 生成 README 和运行手册
```

### 3. API 开发

```
1. 使用 @api-design 规划端点
2. 应用 @typescript-expert 进行实现
3. 运行 @api-security-best-practices 进行加固
4. 使用 @openapi-spec 生成文档
```

## 高级功能

### MCP 集成

Kiro 的 MCP 支持允许技能：

- 安全调用外部 API
- 上下文查询数据库
- 与 AWS 服务集成
- 实时访问文档

利用 MCP 的技能：

- `@rag-engineer` - RAG 系统实现
- `@langgraph` - 代理工作流编排
- `@prompt-engineer` - LLM 提示优化

### 自主操作

Kiro 可以独立工作较长时间。使用技能指导长时间运行的任务：

```
使用 @systematic-debugging 调查并修复代码库中的所有 TypeScript 错误，
然后应用 @test-driven-development 添加缺失的测试，最后运行 @documentation
更新所有 README 文件。
```

### 上下文感知助手

Kiro 维护深度上下文。在复杂工作流中引用多个技能：

```
我正在构建一个 SaaS 应用程序。使用 @brainstorming 进行 MVP 计划，
@aws-serverless 用于后端，@react-patterns 用于前端，
@stripe-integration 用于支付，@security-audit 用于加固。
```

## Kiro 用户捆绑包

为常见 Kiro 用例优化的预策划技能集合：

### AWS 开发者捆绑包

- `@aws-serverless`
- `@aws-cdk`
- `@aws-sam`
- `@lambda-best-practices`
- `@dynamodb-patterns`
- `@api-gateway-patterns`

### 全栈 AWS 捆绑包

- `@aws-serverless`
- `@react-patterns`
- `@typescript-expert`
- `@api-design`
- `@test-driven-development`
- `@ci-cd-pipeline`

### DevOps 和基础设施捆绑包

- `@terraform-expert`
- `@docker-expert`
- `@kubernetes-expert`
- `@monitoring-observability`
- `@incident-response`
- `@security-audit`

完整捆绑包列表请参阅 [bundles.md](bundles.md)。

## 故障排除

### 技能未加载

```bash
# 检查安装路径
ls -la ~/.kiro/skills/

# 如需要则重新安装
rm -rf ~/.kiro/skills
npx antigravity-awesome-skills --kiro
```

### 技能未找到

确保使用正确的技能名称：

```bash
# 列出所有可用技能
ls ~/.kiro/skills/
```

### 权限问题

```bash
# 修复权限
chmod -R 755 ~/.kiro/skills/
```

## 最佳实践

1. **从捆绑包开始** - 为您的角色使用预策划的集合
2. **组合技能** - 在复杂任务中引用多个技能
3. **明确具体** - 清楚说明使用哪个技能以及做什么
4. **迭代** - 让 Kiro 自主工作，然后用其他技能细化
5. **记录** - 使用 `@documentation` 保持代码库的良好文档

## 示例

### 示例 1：构建无服务器 API

```
我需要使用 AWS Lambda 和 DynamoDB 为待办事项应用程序构建 REST API。

使用 @brainstorming 设计架构，然后应用 @aws-serverless
实现 Lambda 函数，@dynamodb-patterns 用于数据建模，
和 @api-security-best-practices 用于安全加固。

使用 @aws-cdk 生成基础设施，并使用 @test-driven-development 添加测试。
```

### 示例 2：迁移到微服务

```
我想将这个单体应用程序分解为微服务。

使用 @architecture 为迁移策略创建 ADR，
应用 @microservices-patterns 确定服务边界，
@docker-expert 用于容器化，@kubernetes-expert 用于编排。

使用 @documentation 记录迁移计划。
```

### 示例 3：安全审计

```
对此应用程序进行全面安全审计。

使用 @security-audit 扫描漏洞，@owasp-top-10 检查
常见问题，@api-security-best-practices 用于 API 加固，
和 @aws-security-best-practices 用于云配置。

生成包含发现和修复步骤的报告。
```

## 资源

- [Kiro 官方文档](https://kiro.dev)
- [AWS 博客：使用 Kiro 转变 DevOps](https://aws.amazon.com/blogs/publicsector/transform-devops-practice-with-kiro-ai-powered-agents/)
- [完整技能目录](../../CATALOG.md)
- [使用指南](usage.md)
- [工作流示例](workflows.md)

## 贡献

发现了 Kiro 特定的用例或工作流？为此指南做出贡献：

1. Fork 仓库
2. 将您的示例添加到此文件
3. 提交拉取请求

## 支持

- **问题**：[GitHub Issues](https://github.com/sickn33/antigravity-awesome-skills/issues)
- **讨论**：[GitHub Discussions](https://github.com/sickn33/antigravity-awesome-skills/discussions)
- **社区**：[社区指南](../contributors/community-guidelines.md)
