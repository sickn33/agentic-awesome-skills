# 技能结构指南

## 什么是技能？

技能是专门的教学文档，指导AI助手（如Claude Code、Gemini、Cursor）如何完美执行特定任务。

每个技能都是一个自包含的markdown文件，包含AI理解上下文所需的所有必要信息、分步指导和相关代码示例。

---

## 技能文件结构

### 目录结构

```
skills/
├── skill-name/                    # 技能目录
│   ├── SKILL.md                  # 主要技能文件（必需）
│   ├── examples/                  # 示例目录（可选）
│   │   ├── basic-usage.md        # 基础使用示例
│   │   └── advanced-scenarios.md  # 高级场景示例
│   ├── resources/                 # 资源目录（可选）
│   │   ├── templates/            # 代码模板
│   │   ├── checklists/           # 检查清单
│   │   └── references/          # 参考资料
│   └── scripts/                  # 辅助脚本（可选）
│       ├── validate.py           # 验证脚本
│       └── helper.sh            # 辅助脚本
```

### 文件命名规则

- **目录名**：小写字母，连字符分隔（如：`react-patterns`）
- **主文件**：总是命名为 `SKILL.md`（大写）
- **示例文件**：使用有意义的名称，`.md` 扩展名
- **脚本文件**：使用适合文件扩展名（`.py`、`.sh`、`.js`）

---

## SKILL.md 文件格式

### 1. 前置内容（YAML Frontmatter）

```yaml
---
name: skill-name                    # 必需：技能名称
description: "简要技能描述"         # 必需：一句话描述，200字符以内
category: development               # 必需：技能分类
risk: safe                         # 必需：风险级别（none/safe/critical/offensive/unknown）
source: community                   # 必需：来源（community/official/self）
source_repo: owner/repo             # 外部 GitHub 来源必需：上游仓库
source_type: community              # 外部 GitHub 来源必需：official/community/self
date_added: "2024-01-15"         # 必需：添加日期，YYYY-MM-DD格式
author: your-username              # 可选：作者
tags: [react, frontend, patterns]  # 可选：标签列表，最多5个
tools: [claude, cursor, gemini]   # 可选：支持工具列表
---
```

**字段说明：**

| 字段 | 必需 | 格式 | 说明 |
|------|------|------|------|
| `name` | ✅ | 小写+连字符 | 技能标识符，用于`@skill-name`调用 |
| `description` | ✅ | 引号字符串 | 简洁描述，说明技能用途 |
| `category` | ✅ | 小写字符串 | 技能分类（见分类列表） |
| `risk` | ✅ | none/safe/critical/offensive/unknown | 风险级别，影响使用警告 |
| `source` | ✅ | community/official/self | 来源标识，官方、社区或本仓库原创 |
| `source_repo` | 外部来源必需 | OWNER/REPO | 外部 GitHub 来源仓库 |
| `source_type` | 外部来源必需 | official/community/self | README 来源致谢分组 |
| `date_added` | ✅ | YYYY-MM-DD | 技能添加日期 |
| `author` | ❌ | 字符串 | 贡献者用户名 |
| `tags` | ❌ | 数组 | 搜索和分类标签 |
| `tools` | ❌ | 数组 | 支持的AI工具列表 |

### 2. 技能内容结构

```markdown
# 技能标题

## 概述
2-4句话解释这个技能的作用和为什么存在。

## 何时使用此技能
- 当您需要[具体场景1]时使用
- 在处理[具体场景2]时使用
- 当用户询问[具体场景3]时使用

## 工作原理

### 步骤1：[操作名称]
详细的操作说明...

### 步骤2：[操作名称]
更多的操作说明...

## 示例

### 示例1：[用例标题]
```javascript
// 代码示例或配置
```

### 示例2：[用例标题]
```python
# Python示例代码
```

## 最佳实践
- 实践建议1
- 实践建议2
- 避免的陷阱

## 相关技能
- `@related-skill-1` - 关系说明
- `@related-skill-2` - 关系说明

## 常见问题
**Q: 常见问题？**
A: 详细回答...

## 限制和注意事项
- 技能限制1
- 使用注意事项1
```

---

## 技能分类系统

### 开发类（Development）

**前端开发（Frontend）**
- `frontend` - 通用前端开发
- `react` - React框架
- `vue` - Vue框架
- `angular` - Angular框架
- `css` - CSS和样式
- `javascript` - JavaScript语言

**后端开发（Backend）**
- `backend` - 通用后端开发
- `api` - API设计和开发
- `database` - 数据库相关
- `microservices` - 微服务架构
- `nodejs` - Node.js开发
- `python` - Python后端

**移动开发（Mobile）**
- `mobile` - 通用移动开发
- `react-native` - React Native
- `flutter` - Flutter框架
- `ios` - iOS开发
- `android` - Android开发

**测试（Testing）**
- `testing` - 通用测试
- `unit-testing` - 单元测试
- `e2e-testing` - 端到端测试
- `performance-testing` - 性能测试
- `security-testing` - 安全测试

### DevOps和基础设施（DevOps & Infrastructure）

**部署（Deployment）**
- `deployment` - 通用部署
- `docker` - 容器化
- `kubernetes` - 容器编排
- `ci-cd` - 持续集成/部署
- `cloud` - 云服务

**监控（Monitoring）**
- `monitoring` - 系统监控
- `logging` - 日志管理
- `observability` - 可观测性
- `performance` - 性能优化

### 安全类（Security）

**安全审计（Security Audit）**
- `security` - 通用安全
- `pen-testing` - 渗透测试
- `vulnerability` - 漏洞扫描
- `compliance` - 合规检查

**安全实施（Security Implementation）**
- `authentication` - 身份认证
- `authorization` - 授权控制
- `encryption` - 加密技术
- `secure-coding` - 安全编码

### AI和机器学习（AI & Machine Learning）

**AI开发（AI Development）**
- `ai` - 通用AI开发
- `llm` - 大语言模型
- `prompt-engineering` - 提示工程
- `ai-safety` - AI安全和伦理

**机器学习（Machine Learning）**
- `machine-learning` - 机器学习
- `data-science` - 数据科学
- `ml-ops` - 机器学习运维
- `model-training` - 模型训练

### 业务和产品（Business & Product）

**产品管理（Product Management）**
- `product` - 产品管理
- `planning` - 项目规划
- `requirements` - 需求分析
- `user-research` - 用户研究

**商业分析（Business Analysis）**
- `analytics` - 数据分析
- `metrics` - 指标分析
- `reporting` - 报告生成
- `business-intelligence` - 商业智能

### 工具和效率（Tools & Productivity）

**开发工具（Dev Tools）**
- `git` - 版本控制
- `editor` - 编辑器配置
- `terminal` - 终端和CLI
- `productivity` - 生产力工具

**文档（Documentation）**
- `documentation` - 文档编写
- `technical-writing` - 技术写作
- `api-docs` - API文档
- `tutorials` - 教程编写

---

## 质量标准

### 内容质量

**✅ 必须满足：**
- 描述清晰准确，无歧义
- 示例可运行，代码正确
- 步骤完整，逻辑清晰
- 涵盖常见使用场景

**🎯 鼓励添加：**
- 高级用法示例
- 常见错误处理
- 性能优化建议
- 最佳实践总结

### 格式规范

**✅ 必须遵守：**
- 前置内容完整且有效
- 正确的分类和标签
- 一致的代码块格式
- 正确的技能引用（`@skill-name`）

**🎯 推荐实践：**
- 添加目录结构说明
- 包含相关技能链接
- 提供故障排除指南
- 添加性能指标

### 技术质量

**✅ 安全要求：**
- 代码安全，无已知漏洞
- 输入验证完整
- 错误处理适当
- 不包含敏感信息

**✅ 性能要求：**
- 算法高效，复杂度合理
- 资源使用优化
- 内存泄漏防护
- 扩展性考虑

---

## 技能示例

### 简单技能示例

```yaml
---
name: git-commit-check
description: "检查Git提交消息格式和内容质量"
category: git
risk: safe
source: community
date_added: "2024-01-15"
tags: [git, commit, quality]
tools: [claude, cursor, gemini]
---
```

```markdown
# Git提交检查

## 概述
此技能用于检查Git提交消息的格式规范和内容质量，确保提交历史清晰可读。

## 何时使用此技能
- 当您需要验证提交消息格式时使用
- 在提交前进行质量检查时使用
- 当团队需要统一提交标准时使用

## 工作原理

### 步骤1：格式检查
验证提交消息是否遵循规范格式：
- 类型标签（feat/fix/docs等）
- 空行分隔
- 简洁标题（50字符内）
- 详细描述（如需要）

### 步骤2：内容检查
检查提交内容的质量：
- 是否包含必要信息
- 语法是否正确
- 是否有拼写错误

## 示例

### 示例1：标准提交
```
feat: 添加用户认证功能

- 实现JWT认证
- 添加登录/登出页面
- 更新用户模型
```

### 示例2：修复提交
```
fix: 修复登录页面重定向问题

解决用户登录后不能正确跳转到首页的bug
```

## 最佳实践
- 使用约定式提交格式
- 保持消息简洁明了
- 包含相关Issue编号
- 避免敏感信息泄露
```

### 复杂技能示例

```yaml
---
name: react-performance-optimization
description: "React应用性能优化和调试"
category: frontend
risk: safe
source: community
source_repo: owner/repo
source_type: community
date_added: "2024-01-15"
tags: [react, performance, optimization]
tools: [claude, cursor, gemini]
---
```

```markdown
# React性能优化

## 概述
此技能提供React应用性能优化的系统性方法，包括识别瓶颈、应用优化策略和验证改进效果。

## 何时使用此技能
- 当React应用加载缓慢时使用
- 在用户体验需要优化时使用
- 当进行性能评估时使用
- 当准备生产部署时使用

## 工作原理

### 步骤1：性能评估
识别性能瓶颈：
- 使用React DevTools Profiler
- 分析组件渲染时间
- 检查内存使用情况
- 识别重渲染问题

### 步骤2：优化策略
应用优化技术：
- 组件懒加载
- React.memo优化
- 状态结构优化
- 副作用优化

### 步骤3：验证改进
确认优化效果：
- 重新运行性能测试
- 对比优化前后指标
- 确保功能完整性
- 监控生产表现

## 示例

### 示例1：组件优化
```javascript
// 优化前
function TodoList({ todos, onToggle }) {
  return (
    <div>
      {todos.map(todo => (
        <TodoItem 
          key={todo.id}
          todo={todo}
          onToggle={onToggle}
        />
      ))}
    </div>
  )
}

// 优化后
const TodoItem = React.memo(({ todo, onToggle }) => {
  return <div onClick={() => onToggle(todo.id)}>{todo.text}</div>
})

function TodoList({ todos, onToggle }) {
  const memoizedToggle = useCallback(onToggle, [])
  
  return (
    <div>
      {todos.map(todo => (
        <TodoItem 
          key={todo.id}
          todo={todo}
          onToggle={memoizedToggle}
        />
      ))}
    </div>
  )
}
```

### 示例2：路由懒加载
```javascript
// 优化前
import Home from './pages/Home'
import Profile from './pages/Profile'
import Settings from './pages/Settings'

// 优化后
const Home = lazy(() => import('./pages/Home'))
const Profile = lazy(() => import('./pages/Profile'))
const Settings = lazy(() => import('./pages/Settings'))

function App() {
  return (
    <Router>
      <Suspense fallback={<div>Loading...</div>}>
        <Route path="/" element={<Home />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/settings" element={<Settings />} />
      </Suspense>
    </Router>
  )
}
```

## 最佳实践
- 先测量，再优化
- 专注于用户感知的性能
- 避免过早优化
- 持续监控性能指标
- 平衡优化和代码可维护性
```

---

## 贡献指南

### 创建新技能

1. **选择分类**：参考分类系统确定合适分类
2. **创建目录**：遵循命名规范创建技能目录
3. **编写内容**：按照格式要求编写SKILL.md
4. **添加示例**：提供实际可运行的示例代码
5. **验证质量**：运行质量检查工具

### 验证命令

```bash
# 验证技能格式
npm run validate:skill skills/your-skill-name/

# 验证前置内容
npm run validate:frontmatter skills/your-skill-name/

# 生成技能索引
npm run index
```

### 提交流程

1. Fork仓库
2. 创建特性分支
3. 添加技能文件
4. 运行验证测试
5. 提交Pull Request

---

## 质量保证

### 自动化检查

- **格式验证**：确保前置内容格式正确
- **链接检查**：验证内部链接有效
- **分类验证**：检查分类和标签合规
- **重复检测**：避免技能重复

### 人工审核

- **内容准确性**：确保技术信息正确
- **实用性评估**：评估技能实用价值
- **用户体验**：确保易于理解和使用
- **社区价值**：评估对社区的贡献

### 持续改进

- **用户反馈**：收集使用反馈
- **性能监控**：监控技能使用效果
- **定期更新**：根据技术发展更新内容
- **质量提升**：持续改进技能质量

---

这个结构指南确保了技能的一致性、可维护性和高质量。遵循这些指导方针，您可以创建出对AI开发社区有价值的实用技能。

如果您有任何疑问或需要指导，请随时联系维护团队。🚀
