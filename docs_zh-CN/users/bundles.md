# Antigravity 技能捆绑包

> **按角色和专业知识级别组织的精选技能集合。** 不知道从哪里开始？从下面的捆绑包中选择一个，为你的角色获取一套精选技能。

> 这些包是为人类提供的精选入门建议。`data/bundles.json` 中生成的捆绑包 ID 是更广泛的目录/工作流分组，不需要与下面的编辑包一一对应。

> **重要提示：** 捆绑包不是可调用的大型技能，如 `@web-wizard` 或 `/essentials-bundle`。使用包中列出的各个技能，或者如果你只想在实时 Antigravity 目录中激活该捆绑包的技能，请使用激活脚本。

## 快速开始

1. **安装仓库：**

   ```bash
   npx antigravity-awesome-skills
   # 或手动克隆
   git clone https://github.com/sickn33/antigravity-awesome-skills.git .agent/skills
   ```

2. **根据你的角色或兴趣**从下面的列表中选择你的捆绑包。

3. **在 AI 助手中引用技能**来使用它们：
   - Claude Code：`>> /skill-name 帮我...`
   - Cursor：在聊天中使用 `@skill-name`
   - Gemini CLI：`Use skill-name...`
   - Codex CLI：`Use skill-name...`

如果你希望捆绑包表现为一个专注的活动子集而不是阅读列表，请使用：

- macOS/Linux：`./scripts/activate-skills.sh --clear Essentials`
- macOS/Linux：`./scripts/activate-skills.sh --clear "Web Wizard"`
- Windows：`.\scripts\activate-skills.bat --clear Essentials`

---

## 基础与核心

### 🚀 "基础"入门包

_适用于所有人。先安装这些。_

- [`concise-planning`](../../skills/concise-planning/)：始终从计划开始。
- [`lint-and-validate`](../../skills/lint-and-validate/)：自动保持代码整洁。
- [`git-pushing`](../../skills/git-pushing/)：安全地保存你的工作。
- [`kaizen`](../../skills/kaizen/)：持续改进心态。
- [`systematic-debugging`](../../skills/systematic-debugging/)：像专业人士一样调试。

---

## 安全与合规

### 🛡️ "安全工程师"包

_用于渗透测试、审计和加固。_

- [`ethical-hacking-methodology`](../../skills/ethical-hacking-methodology/)：道德黑客的圣经。
- [`burp-suite-testing`](../../skills/burp-suite-testing/)：Web 漏洞扫描。
- [`top-web-vulnerabilities`](../../skills/top-web-vulnerabilities/)：符合 OWASP 标准的漏洞分类。
- [`linux-privilege-escalation`](../../skills/linux-privilege-escalation/)：高级 Linux 安全评估。
- [`cloud-penetration-testing`](../../skills/cloud-penetration-testing/)：AWS/Azure/GCP 安全。
- [`security-auditor`](../../skills/security-auditor/)：综合安全审计。
- [`vulnerability-scanner`](../../skills/vulnerability-scanner/)：高级漏洞分析。

### 🔐 "安全开发者"包

_用于构建安全应用程序。_

- [`api-security-best-practices`](../../skills/api-security-best-practices/)：安全的 API 设计模式。
- [`auth-implementation-patterns`](../../skills/auth-implementation-patterns/)：JWT、OAuth2、会话管理。
- [`backend-security-coder`](../../skills/backend-security-coder/)：安全的后端编码实践。
- [`frontend-security-coder`](../../skills/frontend-security-coder/)：XSS 防护和客户端安全。
- [`cc-skill-security-review`](../../skills/cc-skill-security-review/)：功能安全检查清单。
- [`pci-compliance`](../../skills/pci-compliance/)：支付卡安全标准。

---

## 🌐 Web 开发

### 🌐 "Web 向导"包

_用于构建现代高性能 Web 应用。_

- [`frontend-design`](../../skills/frontend-design/)：UI 指南和美学。
- [`react-best-practices`](../../skills/react-best-practices/)：React 和 Next.js 性能优化。
- [`react-patterns`](../../skills/react-patterns/)：现代 React 模式和原则。
- [`nextjs-best-practices`](../../skills/nextjs-best-practices/)：Next.js App Router 模式。
- [`tailwind-patterns`](../../skills/tailwind-patterns/)：Tailwind CSS v4 样式超能力。
- [`form-cro`](../../skills/form-cro/)：优化表单以提高转化率。
- [`seo-audit`](../../skills/seo-audit/)：在 Google 上被发现。

### 🖌️ "Web 设计师"包

_用于像素级完美体验。_

- [`ui-ux-pro-max`](../../skills/ui-ux-pro-max/)：高级设计系统和令牌。
- [`frontend-design`](../../skills/frontend-design/)：美学的基础层。
- [`3d-web-experience`](../../skills/3d-web-experience/)：Three.js 和 React Three Fiber 魔法。
- [`canvas-design`](../../skills/canvas-design/)：静态视觉和海报。
- [`mobile-design`](../../skills/mobile-design/)：移动优先的设计原则。
- [`scroll-experience`](../../skills/scroll-experience/)：沉浸式滚动驱动体验。

### ⚡ "全栈开发者"包

_用于端到端 Web 应用程序开发。_

- [`senior-fullstack`](../../skills/senior-fullstack/)：完整的全栈开发指南。
- [`frontend-developer`](../../skills/frontend-developer/)：React 19+ 和 Next.js 15+ 专业知识。
- [`backend-dev-guidelines`](../../skills/backend-dev-guidelines/)：Node.js/Express/TypeScript 模式。
- [`api-patterns`](../../skills/api-patterns/)：REST vs GraphQL vs tRPC 选择。
- [`database-design`](../../skills/database-design/)：架构设计 和 ORM 选择。
- [`stripe-integration`](../../skills/stripe-integration/)：支付和订阅。

---

## 🤖 AI 与代理

### 🤖 "代理架构师"包

_用于构建 AI 系统和自主代理。_

- [`agent-evaluation`](../../skills/agent-evaluation/)：测试和基准测试你的代理。
- [`langgraph`](../../skills/langgraph/)：构建有状态的代理工作流。
- [`mcp-builder`](../../skills/mcp-builder/)：创建你自己的 MCP 工具。
- [`prompt-engineering`](../../skills/prompt-engineering/)：掌握与 LLM 对话的艺术。
- [`ai-agents-architect`](../../skills/ai-agents-architect/)：设计自主 AI 代理。
- [`rag-engineer`](../../skills/rag-engineer/)：使用向量搜索构建 RAG 系统。

### 🧠 "LLM 应用开发者"包

_用于构建生产级 LLM 应用。_

- [`llm-app-patterns`](../../skills/llm-app-patterns/)：生产就绪的 LLM 模式。
- [`rag-implementation`](../../skills/rag-implementation/)：检索增强生成。
- [`prompt-caching`](../../skills/prompt-caching/)：LLM 提示词的缓存策略。
- [`context-window-management`](../../skills/context-window-management/)：高效管理 LLM 上下文。
- [`langfuse`](../../skills/langfuse/)：LLM 可观察性和追踪。

---

## 🎮 游戏开发

### 🎮 "独立游戏开发者"包

_用于使用 AI 助手构建游戏。_

- [`game-development/game-design`](../../skills/game-development/game-design/)：机制和循环。
- [`game-development/2d-games`](../../skills/game-development/2d-games/)：精灵和物理。
- [`game-development/3d-games`](../../skills/game-development/3d-games/)：模型和着色器。
- [`unity-developer`](../../skills/unity-developer/)：Unity 6 LTS 开发。
- [`godot-gdscript-patterns`](../../skills/godot-gdscript-patterns/)：Godot 4 GDScript 模式。
- [`algorithmic-art`](../../skills/algorithmic-art/)：使用代码生成资产。

---

## 🐍 后端与语言

### 🐍 "Python 专家"包

_用于后端重量级选手和数据科学家。_

- [`python-pro`](../../skills/python-pro/)：使用现代特性掌握 Python 3.12+。
- [`python-patterns`](../../skills/python-patterns/)：地道的 Python 代码。
- [`fastapi-pro`](../../skills/fastapi-pro/)：高性能异步 API。
- [`fastapi-templates`](../../skills/fastapi-templates/)：生产就绪的 FastAPI 项目。
- [`django-pro`](../../skills/django-pro/)：电池内置的框架。
- [`python-testing-patterns`](../../skills/python-testing-patterns/)：使用 pytest 进行综合测试。
- [`async-python-patterns`](../../skills/async-python-patterns/)：Python asyncio 精通。

### 🟦 "TypeScript 与 JavaScript"包

_用于现代 Web 开发。_

- [`typescript-expert`](../../skills/typescript-expert/)：TypeScript 精通和高级类型。
- [`javascript-pro`](../../skills/javascript-pro/)：使用 ES6+ 的现代 JavaScript。
- [`react-best-practices`](../../skills/react-best-practices/)：React 性能优化。
- [`nodejs-best-practices`](../../skills/nodejs-best-practices/)：Node.js 开发原则。
- [`nextjs-app-router-patterns`](../../skills/nextjs-app-router-patterns/)：Next.js 14+ App Router。

### 🦀 "系统编程"包

_用于低级和性能关键代码。_

- [`rust-pro`](../../skills/rust-pro/)：Rust 1.75+ 使用异步模式。
- [`go-concurrency-patterns`](../../skills/go-concurrency-patterns/)：Go 并发精通。
- [`golang-pro`](../../skills/golang-pro/)：Go 开发专业知识。
- [`memory-safety-patterns`](../../skills/memory-safety-patterns/)：内存安全编程。
- [`cpp-pro`](../../skills/cpp-pro/)：现代 C++ 开发。

---

## 🦄 产品与业务

### 🦄 "创业公司创始人"包

_用于构建产品，而不仅仅是代码。_

- [`product-manager-toolkit`](../../skills/product-manager-toolkit/)：RICE 优先级排序、PRD 模板。
- [`competitive-landscape`](../../skills/competitive-landscape/)：竞争对手分析。
- [`competitor-alternatives`](../../skills/competitor-alternatives/)：创建比较页面。
- [`launch-strategy`](../../skills/launch-strategy/)：产品发布规划。
- [`copywriting`](../../skills/copywriting/)：高转化的营销文案。
- [`stripe-integration`](../../skills/stripe-integration/)：从第一天开始获得收入。

### 📊 "业务分析师"包

_用于数据驱动的决策制定。_

- [`business-analyst`](../../skills/business-analyst/)：AI 驱动的分析和 KPI。
- [`startup-metrics-framework`](../../skills/startup-metrics-framework/)：SaaS 指标和单位经济。
- [`startup-financial-modeling`](../../skills/startup-financial-modeling/)：3-5 年财务预测。
- [`market-sizing-analysis`](../../skills/market-sizing-analysis/)：TAM/SAM/SOM 计算。
- [`kpi-dashboard-design`](../../skills/kpi-dashboard-design/)：有效的 KPI 仪表板。

### 📈 "营销与增长"包

_用于驱动用户获取和留存。_

- [`content-creator`](../../skills/content-creator/)：SEO 优化的营销内容。
- [`seo-audit`](../../skills/seo-audit/)：技术 SEO 健康检查。
- [`programmatic-seo`](../../skills/programmatic-seo/)：大规模创建页面。
- [`analytics-tracking`](../../skills/analytics-tracking/)：正确设置 GA4/PostHog。
- [`ab-test-setup`](../../skills/ab-test-setup/)：经过验证的学习实验。
- [`email-sequence`](../../skills/email-sequence/)：自动化电子邮件活动。

---

## DevOps 与基础设施

### 🌧️ "DevOps 与云"包

_用于基础设施和扩展。_

- [`docker-expert`](../../skills/docker-expert/)：掌握容器和多阶段构建。
- [`aws-serverless`](../../skills/aws-serverless/)：AWS 上的无服务器（Lambda、DynamoDB）。
- [`kubernetes-architect`](../../skills/kubernetes-architect/)：K8s 架构和 GitOps。
- [`terraform-specialist`](../../skills/terraform-specialist/)：基础设施即代码精通。
- [`environment-setup-guide`](../../skills/environment-setup-guide/)：团队标准化。
- [`deployment-procedures`](../../skills/deployment-procedures/)：安全发布策略。
- [`bash-linux`](../../skills/bash-linux/)：终端魔法。

### 📊 "可观察性与监控"包

_用于生产可靠性。_

- [`observability-engineer`](../../skills/observability-engineer/)：综合监控系统。
- [`distributed-tracing`](../../skills/distributed-tracing/)：跨微服务追踪请求。
- [`slo-implementation`](../../skills/slo-implementation/)：服务级别目标。
- [`incident-responder`](../../skills/incident-responder/)：快速事件响应。
- [`postmortem-writing`](../../skills/postmortem-writing/)：无责备事后分析。
- [`performance-engineer`](../../skills/performance-engineer/)：应用程序性能优化。

---

## 📊 数据与分析

### 📊 "数据与分析"包

_用于理解数字。_

- [`analytics-tracking`](../../skills/analytics-tracking/)：正确设置 GA4/PostHog。
- [`claude-d3js-skill`](../../skills/claude-d3js-skill/)：使用 D3.js 创建美丽的自定义可视化。
- [`sql-pro`](../../skills/sql-pro/)：使用云原生数据库的现代 SQL。
- [`postgres-best-practices`](../../skills/postgres-best-practices/)：Postgres 优化。
- [`ab-test-setup`](../../skills/ab-test-setup/)：经过验证的学习。
- [`database-architect`](../../skills/database-architect/)：从头开始设计数据库。

### 🔄 "数据工程"包

_用于构建数据管道。_

- [`data-engineer`](../../skills/data-engineer/)：数据管道架构。
- [`airflow-dag-patterns`](../../skills/airflow-dag-patterns/)：Apache Airflow DAG。
- [`dbt-transformation-patterns`](../../skills/dbt-transformation-patterns/)：分析工程。
- [`vector-database-engineer`](../../skills/vector-database-engineer/)：用于 RAG 的向量数据库。
- [`embedding-strategies`](../../skills/embedding-strategies/)：嵌入模型选择。

---

## 🎨 创意与内容

### 🎨 "创意总监"包

_用于视觉、内容和品牌。_

- [`canvas-design`](../../skills/canvas-design/)：生成海报和图表。
- [`frontend-design`](../../skills/frontend-design/)：UI 美学。
- [`content-creator`](../../skills/content-creator/)：SEO 优化的博客文章。
- [`copy-editing`](../../skills/copy-editing/)：润色你的散文。
- [`algorithmic-art`](../../skills/algorithmic-art/)：代码生成的杰作。
- [`interactive-portfolio`](../../skills/interactive-portfolio/)：能找到工作的作品集。

---

## 🐞 质量保证

### 🐞 "QA 与测试"包

_用于在用户之前发现问题。_

- [`test-driven-development`](../../skills/test-driven-development/)：红、绿、重构。
- [`systematic-debugging`](../../skills/systematic-debugging/)：像夏洛克·福尔摩斯一样调试。
- [`browser-automation`](../../skills/browser-automation/)：使用 Playwright 进行端到端测试。
- [`e2e-testing-patterns`](../../skills/e2e-testing-patterns/)：可靠的 E2E 测试套件。
- [`ab-test-setup`](../../skills/ab-test-setup/)：经过验证的实验。
- [`code-review-checklist`](../../skills/code-review-checklist/)：在 PR 中发现错误。
- [`test-fixing`](../../skills/test-fixing/)：系统性地修复失败的测试。

---

## 🔧 专业包

### 📱 "移动开发者"包

_用于 iOS、Android 和跨平台应用。_

- [`mobile-developer`](../../skills/mobile-developer/)：跨平台移动开发。
- [`react-native-architecture`](../../skills/react-native-architecture/)：使用 Expo 的 React Native。
- [`flutter-expert`](../../skills/flutter-expert/)：Flutter 多平台应用。
- [`ios-developer`](../../skills/ios-developer/)：使用 Swift 进行 iOS 开发。
- [`app-store-optimization`](../../skills/app-store-optimization/)：App Store 和 Play Store 的 ASO。

### 🔗 "集成与 API"包

_用于连接服务和构建集成。_

- [`stripe-integration`](../../skills/stripe-integration/)：支付和订阅。
- [`twilio-communications`](../../skills/twilio-communications/)：短信、语音、WhatsApp。
- [`hubspot-integration`](../../skills/hubspot-integration/)：CRM 集成。
- [`plaid-fintech`](../../skills/plaid-fintech/)：银行账户链接和 ACH。
- [`algolia-search`](../../skills/algolia-search/)：搜索实现。

### 🎯 "架构与设计"包

_用于系统设计和技术决策。_

- [`senior-architect`](../../skills/senior-architect/)：综合软件架构。
- [`architecture-patterns`](../../skills/architecture-patterns/)：整洁架构、DDD、六边形。
- [`microservices-patterns`](../../skills/microservices-patterns/)：微服务架构。
- [`event-sourcing-architect`](../../skills/event-sourcing-architect/)：事件溯源和 CQRS。
- [`architecture-decision-records`](../../skills/architecture-decision-records/)：记录技术决策。

### 🧱 "DDD 与事件架构"包

_用于为复杂领域建模并发展为事件系统的团队。_

- [`domain-driven-design`](../../skills/domain-driven-design/)：从战略建模到实现模式路由 DDD 工作。
- [`ddd-strategic-design`](../../skills/ddd-strategic-design/)：子域、限界上下文和通用语言。
- [`ddd-context-mapping`](../../skills/ddd-context-mapping/)：跨上下文集成和反腐败边界。
- [`ddd-tactical-patterns`](../../skills/ddd-tactical-patterns/)：聚合、值对象、仓储和领域事件。
- [`cqrs-implementation`](../../skills/cqrs-implementation/)：读写模型分离。
- [`event-store-design`](../../skills/event-store-design/)：事件持久化和重放架构。
- [`saga-orchestration`](../../skills/saga-orchestration/)：跨上下文长期运行事务协调。
- [`projection-patterns`](../../skills/projection-patterns/)：来自事件流的物化读模型。

### 🤖 "自动化构建器"包

_用于连接工具和构建可重复的自动化工作流。_

- [`workflow-automation`](../../skills/workflow-automation/)：为 AI 和业务系统设计持久的自动化流。
- [`mcp-builder`](../../skills/mcp-builder/)：创建代理可以可靠使用的工具接口。
- [`make-automation`](../../skills/make-automation/)：在 Make/Integromat 中构建自动化。
- [`airtable-automation`](../../skills/airtable-automation/)：自动化 Airtable 记录、数据库和视图。
- [`notion-automation`](../../skills/notion-automation/)：自动化 Notion 页面、数据库和块。
- [`slack-automation`](../../skills/slack-automation/)：自动化 Slack 消息和频道工作流。
- [`googlesheets-automation`](../../skills/googlesheets-automation/)：自动化电子表格更新和数据操作。

### 💼 "收入运营与 CRM 自动化"包

_用于收入运营、支持交接和重度 CRM 自动化。_

- [`hubspot-automation`](../../skills/hubspot-automation/)：自动化联系人、公司、交易和工单。
- [`sendgrid-automation`](../../skills/sendgrid-automation/)：自动化电子邮件发送、联系人和模板。
- [`zendesk-automation`](../../skills/zendesk-automation/)：自动化支持工单和回复工作流。
- [`google-calendar-automation`](../../skills/google-calendar-automation/)：安排事件和管理可用性。
- [`outlook-calendar-automation`](../../skills/outlook-calendar-automation/)：自动化 Outlook 会议和邀请。
- [`stripe-automation`](../../skills/stripe-automation/)：自动化账单、发票和订阅。
- [`shopify-automation`](../../skills/shopify-automation/)：自动化产品、订单、客户和库存。

### 💳 "商务与支付"包

_用于货币化、支付和商务工作流。_

- [`stripe-integration`](../../skills/stripe-integration/)：构建强大的结账、订阅和 Webhook 流。
- [`paypal-integration`](../../skills/paypal-integration/)：集成 PayPal 支付和相关流。
- [`plaid-fintech`](../../skills/plaid-fintech/)：链接银行账户和处理 ACH 相关用例。
- [`hubspot-integration`](../../skills/hubspot-integration/)：将 CRM 数据连接到产品和收入工作流。
- [`algolia-search`](../../skills/algolia-search/)：为商务体验添加搜索和发现。
- [`monetization`](../../skills/monetization/)：有意设计定价和货币化系统。

### 🏢 "Odoo ERP"包

_用于构建或围绕基于 Odoo 的业务系统运营的团队。_

- [`odoo-module-developer`](../../skills/odoo-module-developer/)：清晰地创建自定义 Odoo 模块。
- [`odoo-orm-expert`](../../skills/odoo-orm-expert/)：有效地使用 Odoo ORM 模式和性能。
- [`odoo-sales-crm-expert`](../../skills/odoo-sales-crm-expert/)：优化销售管道、线索和预测。
- [`odoo-ecommerce-configurator`](../../skills/odoo-ecommerce-configurator/)：配置店面、目录和订单流。
- [`odoo-performance-tuner`](../../skills/odoo-performance-tuner/)：诊断和改进慢速 Odoo 实例。
- [`odoo-security-rules`](../../skills/odoo-security-rules/)：应用安全访问控制和规则设计。
- [`odoo-docker-deployment`](../../skills/odoo-docker-deployment/)：在基于 Docker 的环境中部署和运行 Odoo。

### ☁️ "Azure AI 与云"包

_用于在 Azure 上跨云、AI 和平台服务构建。_

- [`azd-deployment`](../../skills/azd-deployment/)：使用 Azure Developer CLI 工作流发布 Azure 应用。
- [`azure-functions`](../../skills/azure-functions/)：使用 Azure Functions 构建无服务器工作负载。
- [`azure-ai-openai-dotnet`](../../skills/azure-ai-openai-dotnet/)：从 .NET 应用使用 Azure OpenAI。
- [`azure-search-documents-py`](../../skills/azure-search-documents-py/)：在 Python 中构建搜索、混合搜索和索引。
- [`azure-identity-py`](../../skills/azure-identity-py/)：在 Python 服务中处理 Azure 身份验证流。
- [`azure-monitor-opentelemetry-ts`](../../skills/azure-monitor-opentelemetry-ts/)：从 TypeScript 应用添加遥测和追踪。

### 📲 "Expo 与 React Native"包

_用于使用 Expo 和 React Native 发布移动应用。_

- [`react-native-architecture`](../../skills/react-native-architecture/)：良好地构建生产级 React Native 应用结构。
- [`expo-api-routes`](../../skills/expo-api-routes/)：在 Expo Router 和 EAS Hosting 中构建 API 路由。
- [`expo-dev-client`](../../skills/expo-dev-client/)：构建和分发 Expo 开发客户端。
- [`expo-tailwind-setup`](../../skills/expo-tailwind-setup/)：在 Expo 应用中设置 Tailwind 和 NativeWind。
- [`expo-cicd-workflows`](../../skills/expo-cicd-workflows/)：使用 EAS 工作流自动化构建和发布。
- [`expo-deployment`](../../skills/expo-deployment/)：部署 Expo 应用并管理发布流。
- [`app-store-optimization`](../../skills/app-store-optimization/)：提高 App Store 和 Play Store 的可发现性。

### 🍎 "Apple 平台设计"包

_用于设计原生感觉的 Apple 平台体验的团队。_

- [`hig-foundations`](../../skills/hig-foundations/)：学习核心 Apple 人机界面指南。
- [`hig-patterns`](../../skills/hig-patterns/)：正确应用 Apple 交互和 UX 模式。
- [`hig-components-layout`](../../skills/hig-components-layout/)：很好地使用 Apple 布局和导航组件。
- [`hig-inputs`](../../skills/hig-inputs/)：为手势、键盘、Apple Pencil、焦点和控制器设计。
- [`hig-components-system`](../../skills/hig-components-system/)：使用小部件、实时活动和系统表面。
- [`hig-platforms`](../../skills/hig-platforms/)：跨 Apple 设备系列适配体验。

### 🧩 "Makepad 构建器"包

_用于使用 Makepad 生态系统构建重度 UI 应用。_

- [`makepad-basics`](../../skills/makepad-basics/)：从 Makepad 基础知识和心智模型开始。
- [`makepad-layout`](../../skills/makepad-layout/)：处理大小、流、对齐和布局组合。
- [`makepad-widgets`](../../skills/makepad-widgets/)：从 Makepad 小部件构建界面。
- [`makepad-event-action`](../../skills/makepad-event-action/)：正确连接交互和事件处理。
- [`makepad-shaders`](../../skills/makepad-shaders/)：创建 GPU 驱动的视觉效果和自定义绘图。
- [`makepad-deployment`](../../skills/makepad-deployment/)：打包和发布 Makepad 项目。

### 🔎 "SEO 专家"包

_用于技术 SEO、内容结构和搜索增长。_

- [`seo-fundamentals`](../../skills/seo-fundamentals/)：基于合理的 SEO 原则和搜索约束构建。
- [`seo-content-planner`](../../skills/seo-content-planner/)：规划集群、日历和内容缺口。
- [`seo-content-writer`](../../skills/seo-content-writer/)：生成符合意图的搜索感知内容草稿。
- [`seo-structure-architect`](../../skills/seo-structure-architect/)：改进层次结构、内部链接和结构。
- [`seo-cannibalization-detector`](../../skills/seo-cannibalization-detector/)：发现竞争相同意图的重叠页面。
- [`seo-content-auditor`](../../skills/seo-content-auditor/)：审计现有内容质量和优化缺口。
- [`schema-markup`](../../skills/schema-markup/)：添加结构化数据以支持更丰富的搜索结果。

### 📄 "文档与演示"包

_用于重度文档工作流、电子表格、PDF 和演示。_

- [`office-productivity`](../../skills/office-productivity/)：协调文档、电子表格和演示工作流。
- [`docx-official`](../../skills/docx-official/)：创建和编辑 Word 兼容文档。
- [`pptx-official`](../../skills/pptx-official/)：创建和编辑 PowerPoint 兼容演示。
- [`xlsx-official`](../../skills/xlsx-official/)：使用公式和格式创建和分析电子表格文件。
- [`pdf-official`](../../skills/pdf-official/)：以编程方式提取、生成和操作 PDF。
- [`google-slides-automation`](../../skills/google-slides-automation/)：自动化 Google Slides 中的演示更新。
- [`google-sheets-automation`](../../skills/google-sheets-automation/)：自动化 Google Sheets 中的读写操作。

---

## 🧰 维护者与开源

### 🛠️ "OSS 维护者"包

_用于在公共仓库中发布清晰的更改。_

- [`commit`](../../skills/commit/)：高质量的约定式提交。
- [`create-pr`](../../skills/create-pr/)：创建具有审查就绪上下文的 PR。
- [`requesting-code-review`](../../skills/requesting-code-review/)：请求有针对性的高信号审查。
- [`receiving-code-review`](../../skills/receiving-code-review/)：以技术严谨性应用反馈。
- [`changelog-automation`](../../skills/changelog-automation/)：保持发布说明和变更日志一致。
- [`git-advanced-workflows`](../../skills/git-advanced-workflows/)：变基、拣选、二分、恢复。
- [`documentation-templates`](../../skills/documentation-templates/)：标准化文档和交接。

### 🧱 "技能作者"包

_用于创建和维护高质量的 SKILL.md 资产。_

- [`skill-creator`](../../skills/skill-creator/)：设计有效的新技能。
- [`skill-developer`](../../skills/skill-developer/)：实现触发器、钩子和技能生命周期。
- [`writing-skills`](../../skills/writing-skills/)：提高技能指令的清晰度和结构。
- [`documentation-generation-doc-generate`](../../skills/documentation-generation-doc-generate/)：生成可维护的技术文档。
- [`lint-and-validate`](../../skills/lint-and-validate/)：在编辑后验证质量。
- [`verification-before-completion`](../../skills/verification-before-completion/)：在声称完成之前确认更改。

---

## 📚 如何使用捆绑包

### 1) 根据即时目标选择

- 现在需要发布功能：`Essentials` + 一个域包（`Web Wizard`、`Python Pro`、`DevOps & Cloud`）。
- 需要可靠性和加固：添加 `QA & Testing` + `Security Developer`。
- 需要产品增长：添加 `Startup Founder` 或 `Marketing & Growth`。

### 2) 从 3-5 个技能开始，而不是 20 个

为你当前的里程碑选择最小集合。只有在遇到真正的缺口时才扩展。

### 3) 一致地调用技能

- **Claude Code**：`>> /skill-name 帮我...`
- **Cursor**：在聊天中使用 `@skill-name`
- **Gemini CLI**：`Use skill-name...`
- **Codex CLI**：`Use skill-name...`

### 4) 构建你的个人简短列表

保留一个小的高频技能列表，并在任务中重用它以减少上下文切换。

## 🧩 推荐的捆绑包组合

### 发布 SaaS MVP（2 周）

`Essentials` + `Full-Stack Developer` + `QA & Testing` + `Startup Founder`

### 加固现有的生产应用

`Essentials` + `Security Developer` + `DevOps & Cloud` + `Observability & Monitoring`

### 构建 AI 产品

`Essentials` + `Agent Architect` + `LLM Application Developer` + `Data Engineering`

### 增长流量和转化

`Web Wizard` + `Marketing & Growth` + `Data & Analytics`

### 启动和维护开源

`Essentials` + `OSS Maintainer` + `Architecture & Design`

---

## 学习路径

### 初学者 → 中级 → 高级

**Web 开发：**

1. 开始：`Essentials` → `Web Wizard`
2. 成长：`Full-Stack Developer` → `Architecture & Design`
3. 精通：`Observability & Monitoring` → `Security Developer`

**AI/ML：**

1. 开始：`Essentials` → `Agent Architect`
2. 成长：`LLM Application Developer` → `Data Engineering`
3. 精通：高级 RAG 和代理编排

**安全：**

1. 开始：`Essentials` → `Security Developer`
2. 成长：`Security Engineer` → 高级渗透测试
3. 精通：红队战术和威胁建模

**开源维护：**

1. 开始：`Essentials` → `OSS Maintainer`
2. 成长：`Architecture & Design` → `QA & Testing`
3. 精通：`Skill Author` + 发布自动化工作流

---

## 贡献

发现应该在捆绑包中的技能？或者想创建新的捆绑包？[提交 issue](https://github.com/sickn33/antigravity-awesome-skills/issues)或提交 PR！

---

## 相关文档

- [入门指南](getting-started.md)
- [完整技能目录](../../CATALOG.md)
- [贡献指南](../../CONTRIBUTING.md)

---

_最后更新：2026 年 3 月 | 总技能数：1,436+ | 总捆绑包数：37_
