# 客户端 / 现代 Web 靶场 Playbook（DOM XSS · 原型污染 · agent-browser）

> 来源：Gin & Juice / Juice Shop 类合法靶场实战摩擦（2026-07）  
> 适用：PortSwigger scanner-eval、OWASP Juice Shop、BB 前端面  
> **MUST** 先 scope + case-guard；命中≠打穿

## 0. 何时读本文件

```text
□ 页面有大量前端 JS（React/Angular/Vue）
□ 漏洞清单写着 DOM XSS / prototype pollution / CSTI
□ curl 只能摸到 API，需要浏览器确认 sink
□ Windows 上 URL 带 [] 被 curl 吃掉（见下）
```

## 1. Windows curl 坑（`[]` 被当范围）

**错误：**

```bash
curl "https://target/?__proto__[x]=1"   # Windows curl: bad range in position ...
```

**正确（必须）：**

```bash
curl.exe --globoff -sS "https://target/?__proto__[test]=polluted"
curl.exe --globoff -sS -G "https://target/catalog" --data-urlencode "__proto__[test]=polluted"
```

PowerShell 里优先：

```powershell
curl.exe --globoff -sS --data-urlencode "q=test" "https://target/search"
```

## 2. 三阶段：Surface → Sink → Chain

| 阶段 | 做什么 | 产出 |
|------|--------|------|
| Surface | 抓 HTML/JS，列 src、表单 action、API | `recon/js-urls.txt` |
| Sink | 搜 `innerHTML` / `eval` / `location.hash` / `document.write` / `__proto__` | 候选 sink 列表 |
| Chain | 找可控 source 能否到 sink（需 200 非数字 / 未转义反射 / merge 对象） | E-* + 是否 validated |

### 2.1 静态 sink 扫（本机）

```powershell
# 下载页面脚本后
rg -n "innerHTML|outerHTML|document\.write|eval\(|location\.hash|__proto__|parseFromString" recon\js\
```

### 2.2 agent-browser 最小环

```powershell
agent-browser open "https://target/page"
agent-browser wait 2000
agent-browser snapshot -i
agent-browser screenshot work\case\screenshots\page.png
agent-browser eval "document.getElementById('stockCheckResult')?.innerHTML"
agent-browser close
```

**纪律：**

```text
□ 每次页面变化后重新 snapshot（ref 会失效）
□ 用 eval 验证 sink，不要只靠猜
□ 截图进 evidence/ 或 screenshots/
```

## 3. DOM XSS：库存类 `innerHTML = fetchBody` 模式

典型代码（Gin & Juice 类）：

```javascript
fetch(path, { method, headers: { 'Content-Type': window.contentType }, body: payload(data) })
  .then(res => res.status === 200
    ? res.text().then(t => isNaN(t) ? t : t + " units")
    : "Could not fetch stock levels!")
  .then(res => document.getElementById("stockCheckResult").innerHTML = res)
```

**门闩：**

| 条件 | 结果 |
|------|------|
| status ≠ 200 | 固定错误文案，**无 XSS** |
| status = 200 且 body 为数字 | 显示 `N units`，**无 XSS** |
| status = 200 且 body 非数字 | **raw HTML → sink** |

**验证 sink（浏览器）：**

```javascript
// agent-browser eval
var el = document.getElementById('stockCheckResult');
el.innerHTML = '<b id=xssmark>SINK</b>';
!!document.getElementById('xssmark');  // true => sink 实锤
```

**利用前提：** 找到使 API **200 + 非数字 body** 的输入（XXE 回显、错误被错误配置成 200、开放代理等）。  
**没到利用仍要写 Evidence：** `status=observed`，写清门闩，避免假阳性「已 XSS」。

## 4. 原型污染（快检）

```powershell
# URL 编码括号，且 --globoff
curl.exe --globoff -sS "https://target/?__proto__%5Bpolluted%5D=yes"

# 浏览器
agent-browser open "https://target/?__proto__%5Bpolluted%5D=yes"
agent-browser eval "({}.polluted || Object.prototype.polluted || 'not-polluted')"
```

```text
□ not-polluted → 该路由没有浅合并 gadget，换 hash/postMessage/库入口
□ polluted → 继续找 gadgets（script src、transport_url、isAdmin 等）
```

## 5. 公共 demo 不稳时

```text
□ Heroku demo 503 → 换本地 Docker / 另一合法靶 / 缩小请求速率
□ Docker Desktop 已安装但 daemon 未 ready → 等引擎或跳过本地容器，记入 timeline
□ 公开实例限流 → 优先读 JS 静态面，少打爆破
```

## 6. Evidence 写法（防误报）

```text
validated: 可复现利用（弹窗/读文件/越权成功）+ repro_command
observed:  sink/面存在，门闩未过（如仅 innerHTML 赋值能力、实体被拦）
```

```powershell
powershell -File skills\scripts\append-evidence.ps1 -CaseRoot work\case `
  -Id E-005 -Title "DOM XSS sink: #el.innerHTML = apiBody" `
  -ReproCommand "agent-browser eval ..." -Severity medium -Status observed `
  -RawExcerpt "status===200 && !isNaN gate"
```

## 7. 与其他 skill

| 发现 | 交接 |
|------|------|
| 前端签名/加密参数 | `js-reverse/` |
| 复杂 SPA 交互验证 | `browser-automation/` |
| BOLA 已登录 API | `api-security/` |

## 8. 诚实完成标准

```text
□ 未打穿 ≠ skill 无效：必须留下 surface + sink + 失败原因
□ 禁止把 observed sink 写成 validated exploit
□ timeline 写清：公网 demo 挂了 / Docker 未起 / curl [] 坑
```
