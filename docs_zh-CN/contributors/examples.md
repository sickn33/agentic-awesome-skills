# 💡 实际示例 - 查看技能的实际应用

**通过示例学习！**本指南向您展示使用不同技能的真实对话。

---

## 示例 1：使用 @brainstorming 设计功能

### 场景
您想为您的应用添加"暗黑模式"功能，但不确定如何实现。

### 对话

```
您：@brainstorming 我想为我的 React 应用添加暗黑模式

AI：太好了！让我帮您思考这个方案。首先，让我检查您当前的
    项目结构...

    [AI 检查您的文件]

    我看到您正在使用 React 和 Tailwind CSS。现在，让我们了解
    您的需求：

    暗黑模式的主要目标是什么？
    a) 用户偏好（在设置中切换）
    b) 系统偏好（跟随操作系统设置）
    c) 两者都有（可手动覆盖）

您：c) 两者都有

AI：完美！这是最佳用户体验。下一个问题：

    暗黑模式切换按钮应该放在哪里？
    a) 在主导航中
    b) 在设置页面中
    c) 在下拉菜单中
    d) 多个位置

您：a) 在主导航中

AI：很好的可访问性选择。还有一个问题：

    暗黑模式偏好是否应该跨会话保持？
    a) 是的，保存到 localStorage
    b) 是的，保存到用户账户（需要后端）
    c) 不，每次会话重置

您：a) 是的，保存到 localStorage

AI：太好了！现在我有了清晰的图景。让我展示设计方案...

    ## 暗黑模式实现设计

    ### 架构概述
    我们将使用 React Context 进行状态管理，Tailwind 的暗黑模式
    工具，以及 localStorage 进行持久化。系统将：
    1. 首次访问时检查操作系统偏好
    2. 允许通过切换按钮手动覆盖
    3. 在 localStorage 中保存偏好

    这个方法看起来可以吗？

您：可以，继续

AI：[继续详细的设计部分...]

    [设计完成后]

    我已将设计保存到 docs/plans/2026-01-20-dark-mode-design.md

    准备好开始实施了吗？

您：是的

AI：我将使用 git worktrees 创建一个独立的工作区并编写
    实施计划。稍等...
```

### 发生了什么
- ✅ AI 一次问一个有针对性的问题
- ✅ 探索了您的具体上下文
- ✅ 分部分展示设计
- ✅ 保存文档
- ✅ 准备实施

---

## 示例 2：使用 @systematic-debugging 调试

### 场景
您的测试失败了，但不知道为什么。

### 对话

```
您：@systematic-debugging 我的测试失败了，提示"Cannot read property
     'map' of undefined"

AI：让我帮您系统地调试这个问题。首先，我会收集信息：

    1. 运行失败的测试以查看完整错误...

    [AI 运行：npm test]

    我看到错误发生在 UserList.test.tsx 的第 45 行。让我检查
    测试文件和组件...

    [AI 读取两个文件]

    ## 假设
    测试失败是因为 `users` 属性在组件渲染时未定义。这表明
    mock 数据没有正确传递。

    ## 验证
    让我检查测试设置...

    [AI 检查测试]

    找到了！测试调用的是：
    ```typescript
    render(<UserList />)
    ```

    但 UserList 需要一个 `users` 属性。组件期望：
    ```typescript
    interface UserListProps {
      users: User[];
    }
    ```

    ## 解决方案
    测试应该传递 users 属性：
    ```typescript
    const mockUsers = [
      { id: 1, name: 'Alice' },
      { id: 2, name: 'Bob' }
    ];

    render(<UserList users={mockUsers} />)
    ```

    我应该应用这个修复吗？

您：是的

AI：[应用修复并运行测试]

    ✅ 所有测试通过！

    ## 根本原因
    测试缺少必需的属性。这是组件被重构为需要以前可选属性时
    的常见问题。

    ## 预防
    考虑添加 TypeScript 严格模式以在编译时捕获这些问题：
    ```json
    "strict": true,
    "strictNullChecks": true
    ```

    您想让我将此添加到您的 tsconfig.json 吗？
```

### 发生了什么
- ✅ 系统性调查
- ✅ 清晰的假设
- ✅ 修复前验证
- ✅ 根本原因分析
- ✅ 预防建议

---

## 示例 3：使用 @stripe-integration 添加支付功能

### 场景
您需要为 SaaS 应用添加订阅计费功能。

### 对话

```
您：@stripe-integration 我需要添加月度订阅计费

AI：我会帮您实现 Stripe 订阅。让我了解您的需求：

    检测到的当前技术栈：
    - Next.js 14（App Router）
    - TypeScript
    - Prisma 和 PostgreSQL

    对于订阅计费，我们需要：

    1. **Stripe 设置**
       - Stripe 账户和 API 密钥
       - 事件的 webhook 端点
       - 产品和价格 ID

    2. **后端实现**
       - 结账的 API 路由
       - Webhook 处理程序
       - 订阅的数据库架构

    3. **前端实现**
       - 定价页面
       - 结账流程
       - 订阅管理

    让我们从后端开始。首先，安装依赖项：

    ```bash
    npm install stripe @stripe/stripe-js
    ```

    现在，让我们创建数据库架构...

    [AI 提供 Prisma 架构]

    ```prisma
    model User {
      id                 String    @id @default(cuid())
      email              String    @unique
      stripeCustomerId   String?   @unique
      subscriptions      Subscription[]
    }

    model Subscription {
      id                 String    @id @default(cuid())
      userId             String
      user               User      @relation(fields: [userId], references: [id])
      stripeSubscriptionId String  @unique
      status             String
      priceId            String
      currentPeriodEnd   DateTime
      createdAt          DateTime  @default(now())
      updatedAt          DateTime  @updatedAt
    }
    ```

    接下来，让我们创建结账 API 路由...

    [AI 提供完整的实现，包括：]
    - 创建结账会话的 API 路由
    - 订阅事件的 webhook 处理程序
    - Stripe 操作的辅助函数
    - 错误处理和日志记录
    - TypeScript 类型

    现在是前端...

    [AI 提供：]
    - 定价页面组件
    - 结账按钮组件
    - 订阅状态显示
    - Tailwind 样式

    最后，让我们设置 webhook：

    1. 在 Stripe Dashboard 中，添加 webhook 端点：
       `https://yourdomain.com/api/webhooks/stripe`

    2. 选择这些事件：
       - customer.subscription.created
       - customer.subscription.updated
       - customer.subscription.deleted
       - invoice.payment_succeeded
       - invoice.payment_failed

    3. 将 webhook 密钥复制到您的 .env：
       ```
       STRIPE_WEBHOOK_SECRET=whsec_...
       ```

    ## 测试

    使用 Stripe CLI 在本地测试：
    ```bash
    stripe listen --forward-to localhost:3000/api/webhooks/stripe
    stripe trigger customer.subscription.created
    ```

    ## 安全检查清单
    - ✅ 环境变量中的 API 密钥
    - ✅ Webhook 签名验证
    - ✅ 服务器端价格验证
    - ✅ 操作的幂等性密钥

    准备好测试实现了吗？
```

### 发生了什么
- ✅ 检测到现有技术栈
- ✅ 提供完整实现
- ✅ 包含数据库架构
- ✅ 添加安全最佳实践
- ✅ 包含测试说明

---

## 示例 4：使用 @copywriting 撰写文案

### 场景
您需要为 SaaS 落地页撰写有吸引力的文案。

### 对话

```
您：@copywriting 为我的项目管理工具撰写主页文案

AI：我会帮您创建有吸引力的主页文案。首先，让我了解您的产品：

    您的项目管理工具与 Asana、Trello 或 Monday.com 等竞争对手相比
    有什么不同之处？

您：它专为远程团队构建，内置视频站会和异步通信功能

AI：优秀的差异化！谁是您的目标受众？
    a) 初创公司和小团队（2-20 人）
    b) 中型公司（20-200 人）
    c) 企业（200+ 人）
    d) 自由职业者和代理商

您：a) 初创公司和小团队

AI：完美。您解决的主要痛点是什么？

您：远程团队在不必要的会议中浪费时间，在异步通信中丢失上下文

AI：太好了！现在我有了所需的信息。这是您的主页文案：

    ---

    ## 英雄区块

    **标题：**
    在无会议过载的情况下运行您的远程团队

    **副标题：**
    专为分布式团队构建的项目管理工具。用异步视频站会替代
    状态会议，让所有人保持同步，而无需 Zoom 疲劳。

    **行动号召：**
    开始免费试用 → （无需信用卡）

    ---

    ## 问题区块

    **标题：**
    远程工作不应意味着更多会议

    **正文：**
    您的团队分布在不同的时区。您花费数小时在状态会议上
    仅为了保持一致。异步更新在 Slack 中丢失。
    上下文消失。生产力下降。

    听起来很熟悉？

    ---

    ## 解决方案区块

    **标题：**
    无会议马拉松即可保持一致

    **功能：**

    📹 **异步视频站会**
    按您的计划录制快速视频更新。您的团队在适合他们的时间观看。
    不再为东京的队友在上午 9 点打电话。

    💬 **上下文丰富的通信**
    每个任务、评论和决策都保持连接。不再在 Slack 线程或
    电子邮件链中寻找。

    📊 **可视化进度跟踪**
    一目了然地查看正在发生的事情。看板、时间线和
    实际上有意义的仪表板。

    🔔 **智能通知**
    获得关于重要事项的通知。忽略其余的。您的专注时间是
    神圣的。

    ---

    ## 社会证明区块

    **标题：**
    受全球远程团队信赖

    [带有结构的推荐占位符]

    ---

    ## 行动号召区块

    **标题：**
    准备好重新掌控您的日历了吗？

    **正文：**
    加入 500 多个远程团队，他们将会议时间减少了 60%，同时
    保持前所未有的高度一致。

    **行动号召：**
    开始您的 14 天免费试用 →

    无需信用卡。随时取消。

    ---

    ## 文案说明

    **语气：** 专业但对话式
    **重点：** 痛点（太多会议）→ 解决方案（异步视频）
    **差异化：** 专为远程团队构建
    **社会证明：** 量化利益（减少 60% 的会议）

    您想让我：
    1. 撰写替代版本用于 A/B 测试？
    2. 为特定功能页面撰写文案？
    3. 撰写用于入门的电子邮件序列？
```

### 发生了什么
- ✅ 询问了澄清性问题
- ✅ 确定了独特的价值主张
- ✅ 创建了以利益为重点的文案
- ✅ 包含了清晰的行动号召
- ✅ 提供了一致性的文案说明

---

## 示例 5：使用 @test-driven-development 进行测试驱动开发

### 场景
您需要实现一个新功能：用户身份验证。

### 对话

```
您：@test-driven-development 我需要实现用户登录功能

AI：完美！让我们使用 TDD 来构建这个。遵循红-绿-重构
    周期，我们将先编写测试，然后实现。

    ## 步骤 1：编写第一个测试（红色）

    让我们从最简单的情况开始 - 成功登录：

    ```typescript
    // auth.test.ts
    import { login } from './auth';

    describe('login', () => {
      it('should return user data for valid credentials', async () => {
        const result = await login({
          email: 'user@example.com',
          password: 'correct-password'
        });

        expect(result.success).toBe(true);
        expect(result.user).toHaveProperty('id');
        expect(result.user).toHaveProperty('email');
        expect(result.token).toBeDefined();
      });
    });
    ```

    让我们运行这个测试以看到它失败：

    [AI 运行：npm test]

    ✅ 测试按预期失败（auth.ts 尚不存在）

    ## 步骤 2：编写最小实现（绿色）

    现在让我们编写足够的代码以使此测试通过：

    ```typescript
    // auth.ts
    interface LoginCredentials {
      email: string;
      password: string;
    }

    interface LoginResult {
      success: boolean;
      user?: {
        id: string;
        email: string;
      };
      token?: string;
    }

    export async function login(
      credentials: LoginCredentials
    ): Promise<LoginResult> {
      // 使测试通过的最小实现
      return {
        success: true,
        user: {
          id: '1',
          email: credentials.email
        },
        token: 'fake-token'
      };
    }
    ```

    [AI 运行：npm test]

    ✅ 测试通过！

    ## 步骤 3：添加下一个测试（红色）

    现在让我们测试失败情况：

    ```typescript
    it('should return error for invalid credentials', async () => {
      const result = await login({
        email: 'user@example.com',
        password: 'wrong-password'
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid credentials');
      expect(result.user).toBeUndefined();
      expect(result.token).toBeUndefined();
    });
    ```

    [AI 运行：npm test]

    ❌ 测试失败（总是返回成功）

    ## 步骤 4：实现真实逻辑（绿色）

    现在让我们添加实际的身份验证：

    ```typescript
    import bcrypt from 'bcrypt';
    import jwt from 'jsonwebtoken';
    import { db } from './db';

    export async function login(
      credentials: LoginCredentials
    ): Promise<LoginResult> {
      // 查找用户
      const user = await db.user.findUnique({
        where: { email: credentials.email }
      });

      if (!user) {
        return {
          success: false,
          error: 'Invalid credentials'
        };
      }

      // 验证密码
      const validPassword = await bcrypt.compare(
        credentials.password,
        user.passwordHash
      );

      if (!validPassword) {
        return {
          success: false,
          error: 'Invalid credentials'
        };
      }

      // 生成令牌
      const token = jwt.sign(
        { userId: user.id },
        process.env.JWT_SECRET!,
        { expiresIn: '7d' }
      );

      return {
        success: true,
        user: {
          id: user.id,
          email: user.email
        },
        token
      };
    }
    ```

    [AI 运行：npm test]

    ✅ 所有测试通过！

    ## 步骤 5：添加边缘情况

    让我们为边缘情况添加更多测试：

    ```typescript
    it('should handle missing email', async () => {
      const result = await login({
        email: '',
        password: 'password'
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Email is required');
    });

    it('should handle missing password', async () => {
      const result = await login({
        email: 'user@example.com',
        password: ''
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Password is required');
    });

    it('should handle database errors gracefully', async () => {
      // 模拟数据库错误
      jest.spyOn(db.user, 'findUnique').mockRejectedValue(
        new Error('Database connection failed')
      );

      const result = await login({
        email: 'user@example.com',
        password: 'password'
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('An error occurred');
    });
    ```

    [AI 实现验证和错误处理]

    ## 步骤 6：重构（重构）

    现在所有测试都通过了，让我们为了更好的代码质量进行重构：

    ```typescript
    // 提取验证
    function validateCredentials(credentials: LoginCredentials): string | null {
      if (!credentials.email) return 'Email is required';
      if (!credentials.password) return 'Password is required';
      return null;
    }

    // 提取用户验证
    async function verifyUser(
      email: string,
      password: string
    ): Promise<User | null> {
      const user = await db.user.findUnique({ where: { email } });
      if (!user) return null;

      const valid = await bcrypt.compare(password, user.passwordHash);
      return valid ? user : null;
    }

    // 主函数现在更清晰
    export async function login(
      credentials: LoginCredentials
    ): Promise<LoginResult> {
      try {
        const validationError = validateCredentials(credentials);
        if (validationError) {
          return { success: false, error: validationError };
        }

        const user = await verifyUser(
          credentials.email,
          credentials.password
        );

        if (!user) {
          return { success: false, error: 'Invalid credentials' };
        }

        const token = generateToken(user.id);

        return {
          success: true,
          user: { id: user.id, email: user.email },
          token
        };
      } catch (error) {
        console.error('Login error:', error);
        return { success: false, error: 'An error occurred' };
      }
    }
    ```

    [AI 运行：npm test]

    ✅ 重构后所有测试仍然通过！

    ## 总结

    我们使用 TDD 实现了登录功能：
    - ✅ 5 个测试覆盖正常路径、错误和边缘情况
    - ✅ 干净、可测试的代码
    - ✅ 适当的错误处理
    - ✅ TypeScript 类型安全

    下一步：
    1. 添加速率限制测试
    2. 添加会话管理测试
    3. 添加登出功能

    我应该继续这些吗？
```

### 发生了什么
- ✅ 遵循红-绿-重构周期
- ✅ 在实现之前编写测试
- ✅ 覆盖边缘情况
- ✅ 有信心地重构
- ✅ 保持测试覆盖率

---

## 主要收获

### 使这些示例有效的原因是什么？

1. **技能在跳转到解决方案之前会询问澄清性问题**
2. **技能根据您的项目提供上下文相关的帮助**
3. **技能遵循其领域的最佳实践**
4. **技能包括完整的示例，而不仅仅是片段**
5. **技能解释"为什么"，而不仅仅是"如何"**

### 如何获得类似的结果

1. **具体说明**您的请求
2. **提供上下文**关于您的项目
3. **回答**技能提出的问题
4. **在应用之前审查**建议
5. **根据结果迭代**

---

## 自己尝试这些！

选择一个技能并用自己的项目尝试：

- **规划：** `@brainstorming` 或 `@writing-plans`
- **开发：** `@test-driven-development` 或 `@react-best-practices`
- **调试：** `@systematic-debugging` 或 `@test-fixing`
- **集成：** `@stripe-integration` 或 `@firebase`
- **营销：** `@copywriting` 或 `@seo-audit`

---

**想要更多示例？**查看各个技能文件夹以获取其他示例和用例！
