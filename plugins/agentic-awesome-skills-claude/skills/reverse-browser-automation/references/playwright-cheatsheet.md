# 浏览器与桌面自动化速查

> 覆盖 Playwright（浏览器自动化）和 OpenReverse（Windows 桌面自动化）的常用命令与模式。
> 面向渗透测试、逆向工程、自动化采集场景。

---

## Playwright / agent-browser 命令速查

### 导航与生命周期

```bash
# 打开页面
agent-browser open "https://target.com/login"

# 等待页面加载完成
agent-browser wait --load networkidle

# 关闭浏览器（必须执行，否则进程泄漏）
agent-browser close
```

### 页面快照

```bash
# 完整无障碍树（调试用）
agent-browser snapshot

# 仅可交互元素（推荐，返回 @e1, @e2... 引用）
agent-browser snapshot -i
```

### 元素交互

```bash
# 点击
agent-browser click @e1

# 填写文本框
agent-browser fill @e2 "admin"

# 逐字符输入（适合有 JS 监听的输入框）
agent-browser type @e2 "password123"

# 按键
agent-browser press Enter
agent-browser press Tab
agent-browser press Escape

# 滚动
agent-browser scroll down 500
agent-browser scroll up 300
```

### 信息获取

```bash
# 获取元素文本
agent-browser get text @e1

# 获取页面标题
agent-browser get title

# 获取当前 URL
agent-browser get url
```

### 等待策略

```bash
# 等待元素出现
agent-browser wait @e1

# 等待固定时间（毫秒）
agent-browser wait 2000

# 等待网络空闲
agent-browser wait --load networkidle

# 等待导航完成
agent-browser wait --load domcontentloaded
```

---

## 渗透测试常用模式

### 自动化登录

```bash
agent-browser open "https://target.com/login"
agent-browser snapshot -i
agent-browser fill @username "admin"
agent-browser fill @password "password123"
agent-browser click @login_button
agent-browser wait --load networkidle
agent-browser get url                    # 确认是否跳转到后台
```

### XSS Payload 注入

```bash
agent-browser open "https://target.com/search"
agent-browser snapshot -i
agent-browser fill @search_input "<script>alert(1)</script>"
agent-browser click @search_button
agent-browser wait --load networkidle
agent-browser snapshot                   # 检查 payload 是否被渲染
```

### 表单批量提交（配合脚本）

```powershell
$payloads = @("' OR 1=1--", "<img src=x onerror=alert(1)>", "{{7*7}}")
foreach ($p in $payloads) {
    agent-browser open "https://target.com/form"
    agent-browser snapshot -i
    agent-browser fill @input "$p"
    agent-browser click @submit
    agent-browser wait --load networkidle
    agent-browser snapshot              # 检查响应
}
agent-browser close
```

### Cookie / LocalStorage 提取

```bash
# 通过 Playwright API（Node.js 脚本模式）
# agent-browser 不直接暴露 cookie，需要用脚本模式
```

```javascript
// playwright-extract.js
const { chromium } = require('playwright');
(async () => {
    const browser = await chromium.launch();
    const context = await browser.newContext();
    const page = await context.newPage();
    await page.goto('https://target.com');
    
    // 提取 cookies
    const cookies = await context.cookies();
    console.log(JSON.stringify(cookies, null, 2));
    
    // 提取 localStorage
    const storage = await page.evaluate(() => JSON.stringify(localStorage));
    console.log(storage);
    
    await browser.close();
})();
```

### 截图取证

```bash
# agent-browser 模式
agent-browser open "https://target.com/admin"
agent-browser wait --load networkidle
# 截图功能取决于 agent-browser 版本
```

```javascript
// playwright 脚本模式
await page.screenshot({ path: 'evidence.png', fullPage: true });
```

---

## Playwright Node.js API 速查

### 基础模板

```javascript
const { chromium } = require('playwright');

(async () => {
    const browser = await chromium.launch({
        headless: true,           // 无头模式
        // proxy: { server: 'http://127.0.0.1:8080' }  // 走 Burp 代理
    });
    const context = await browser.newContext({
        ignoreHTTPSErrors: true,  // 忽略证书错误
        userAgent: 'Mozilla/5.0 ...',
    });
    const page = await context.newPage();
    
    await page.goto('https://target.com');
    // ... 操作 ...
    
    await browser.close();
})();
```

### 常用选择器

```javascript
// CSS 选择器
await page.click('#login-btn');
await page.fill('input[name="username"]', 'admin');

// 文本选择器
await page.click('text=Submit');
await page.click('button:has-text("Login")');

// XPath
await page.click('xpath=//button[@type="submit"]');

// 组合
await page.click('form >> input[type="submit"]');
```

### 网络拦截

```javascript
// 拦截请求
await page.route('**/api/**', route => {
    console.log('API call:', route.request().url());
    route.continue();
});

// 修改请求
await page.route('**/api/auth', route => {
    route.continue({
        headers: { ...route.request().headers(), 'X-Admin': 'true' }
    });
});

// 拦截响应
await page.route('**/api/user', async route => {
    const response = await route.fetch();
    const json = await response.json();
    json.role = 'admin';  // 篡改响应
    route.fulfill({ response, json });
});
```

### 等待与断言

```javascript
// 等待元素
await page.waitForSelector('#result');
await page.waitForSelector('.error', { state: 'visible' });

// 等待网络请求
const [response] = await Promise.all([
    page.waitForResponse('**/api/login'),
    page.click('#login-btn'),
]);
console.log(response.status(), await response.json());

// 等待导航
await Promise.all([
    page.waitForNavigation(),
    page.click('a[href="/admin"]'),
]);
```

---

## OpenReverse 桌面自动化速查

### 模式选择

| 模式 | 命令前缀 | 适合场景 |
|------|---------|---------|
| UIA | `openreverse uia ...` | 标准 Windows 控件（按钮、文本框、列表） |
| CUA | `openreverse cua ...` | 复杂/非标准 GUI（IDA 反汇编视图、自定义渲染界面） |

### UIA 模式（结构化控件操作）

```bash
# 启动应用
openreverse uia launch "C:\Tools\x64dbg\x64dbg.exe"

# 获取窗口树
openreverse uia tree

# 点击按钮
openreverse uia click "Button:Open"

# 填写文本框
openreverse uia fill "Edit:FilePath" "C:\sample.exe"

# 选择菜单
openreverse uia menu "File > Open"

# 获取控件文本
openreverse uia get-text "Edit:Output"
```

### CUA 模式（视觉驱动交互）

```bash
# 截图当前屏幕
openreverse cua screenshot

# 点击屏幕坐标
openreverse cua click 500 300

# 双击
openreverse cua dblclick 500 300

# 输入文本
openreverse cua type "search string"

# 按键
openreverse cua key "ctrl+g"    # IDA: Go to address
openreverse cua key "F5"        # IDA: Decompile
openreverse cua key "F9"        # x64dbg: Run
```

### 网络观察（mitmproxy）

```bash
# 启动代理模式观察
openreverse network start --mode proxy --port 8888

# 启动本地抓取模式
openreverse network start --mode local --filter "target.exe"

# 获取捕获的请求
openreverse network list

# 导出为 HAR
openreverse network export har output.har

# 停止观察
openreverse network stop
```

---

## 逆向工具自动化组合

### IDA Pro 自动化（OpenReverse + ida-reverse）

```text
场景：批量分析多个样本

1. openreverse cua launch "ida64.exe"
2. 对每个样本：
   a. openreverse cua key "ctrl+o"        # 打开文件对话框
   b. openreverse uia fill "Edit:FileName" "sample_N.exe"
   c. openreverse uia click "Button:Open"
   d. 等待分析完成（轮询 IDA 标题栏）
   e. 通过 ida-reverse MCP 工具提取结果
   f. openreverse cua key "ctrl+w"        # 关闭数据库
```

### x64dbg 自动化调试

```text
场景：自动化断点设置与数据采集

1. openreverse uia launch "x64dbg.exe"
2. openreverse cua key "F3"               # 打开文件
3. openreverse uia fill "Edit:FileName" "target.exe"
4. openreverse uia click "Button:Open"
5. openreverse cua key "ctrl+g"           # Go to address
6. openreverse cua type "0x401000"
7. openreverse cua key "F2"               # 设置断点
8. openreverse cua key "F9"               # 运行
9. openreverse cua screenshot             # 截图保存状态
```

---

## 常见问题与解决

| 问题 | 原因 | 解决 |
|------|------|------|
| agent-browser 无响应 | 进程泄漏 | 先 `agent-browser close`，再重新 open |
| 元素引用失效 | 页面已刷新 | 重新 `snapshot -i` 获取新引用 |
| 填表无效 | JS 监听 input 事件 | 用 `type` 代替 `fill` |
| HTTPS 证书错误 | 自签名证书 | Playwright: `ignoreHTTPSErrors: true` |
| 页面加载超时 | 网络慢/资源多 | 增加 timeout 或用 `domcontentloaded` |
| UIA 找不到控件 | 应用使用自绘控件 | 切换到 CUA 模式 |
| CUA 点击偏移 | 分辨率/DPI 不匹配 | 先 screenshot 确认坐标 |

---

## 安装与依赖

### Playwright

```powershell
# 安装 Node.js（如果没有）
winget install OpenJS.NodeJS.LTS

# 安装 Playwright
npm install -g playwright
npx playwright install          # 下载浏览器引擎

# 安装 agent-browser CLI
npm install -g agent-browser
```

### OpenReverse

```powershell
git clone https://github.com/zhexulong/openreverse.git
cd openreverse
npm install
npm run init:agents -- --target=all <项目路径>

# 可选：CUA 运行时
npm run install:cua-runtime
npm run doctor:cua-runtime

# 可选：网络观察
npm run install:mitmproxy
npm run doctor:network
```

---

## 相关资源

| 资源 | 说明 | 链接 |
|------|------|------|
| Playwright 官方文档 | API 参考 | https://playwright.dev/docs/intro |
| OpenReverse | 桌面自动化框架 | https://github.com/zhexulong/openreverse |
| mitmproxy | HTTP/HTTPS 代理 | https://mitmproxy.org/ |
| Windows UI Automation | UIA 文档 | https://learn.microsoft.com/en-us/windows/win32/winauto/entry-uiauto-win32 |
