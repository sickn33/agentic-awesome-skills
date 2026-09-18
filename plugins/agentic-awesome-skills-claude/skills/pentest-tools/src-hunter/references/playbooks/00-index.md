# Playbooks 总目录

> 每个 playbook 的视角都是黑盒——假定只有 URL 和参数，无源码

---

## 阅读建议

按"SRC 价值 / 易出货"顺序读：

| 优先级 | Playbook | 一句话价值 |
|-------|---------|-----------|
| 🔴 P0 | `unauth-access.md` | 默认凭据 / Redis-Mongo-ES / Actuator / Swagger / .git——开局送的 P0 |
| 🔴 P0 | `rce.md` | Log4Shell / Spring4Shell / Fastjson / Struts2 / 命令注入指纹库 |
| 🔴 P0 | `file-upload.md` | 解析漏洞 + 编辑器漏洞 + 截断绕过 |
| 🔴 P0 | `path-traversal.md` | `../etc/passwd` 加 6 种编码 + WEB-INF / web.config |
| 🟠 P1 | `info-disclosure.md` | .git / .svn / 备份文件 / phpinfo / 日志 / OSS bucket |
| 🟠 P1 | `logic-flaws.md` | 密码重置 4 模式 / IDOR / 越权 / 验证码 / 支付 |
| 🟠 P1 | `arbitrary-x-authz.md` | 任意 X 子授权（任意账号 86.4% / 任意操作 72.5%）|
| 🟠 P1 | `oauth-saml-jwt.md` | redirect_uri / state / JWT alg / kid / SAML 包裹 |
| 🟠 P1 | `sqli.md` | 27,732 个真实案例提炼，含高频参数频率表 |
| 🟠 P1 | `ssrf-cache-host.md` | 内网探测 + 云元数据 + Host header / 缓存投毒 |
| 🟡 P1/P2 | `api-rest.md` | BOLA / Mass Assignment / 速率 / CORS |
| 🟡 P1/P2 | `graphql.md` | Introspection / 嵌套 IDOR / DoS |
| 🟡 P2 | `race-conditions.md` | 优惠券双花 / 余额超扣 / 限额绕过 |
| 🟡 P2 | `xss.md` | 7,532 真实案例，上下文绕过表 |
| 🟡 P2 | `http-smuggling.md` | CL.TE / TE.CL / H2→H1 |
| 🟡 P2 | `mobile.md` | 安卓导出组件 / Intent / WebView / Pinning |
| 🟡 P2 | `llm-prompt-injection.md` | Prompt 注入 / RAG 投毒 / Agent 工具 |

---

## 每个 playbook 的统一结构

```
1. 一句话说清是什么 + 为什么 SRC 关注
2. 高频入口点（参数名 / 路径 / Header），引用统计数字
3. 探测手法（Probe）—— payload + 响应特征 + 带外/延时/差异
4. Bypass 矩阵（编码、混淆、WAF、过滤器绕过）
5. 利用提权 / 横向（从触发到价值升级）
6. 真实案例指纹（CVE/wooyun ID + 1 句版本特征 + 检测 payload）
7. 复现/证据要点（HTTP 包、CVSS 关键 vector、影响段写法）
8. 不要做的事（合规边界 / 数据保护）
```

---

## 与方法论的关系

```
methodology/01-attack-priority   →  决定先打哪个 playbook
methodology/04-control-gap        →  端点归类 → 翻到对应 playbook
methodology/02-bypass-toolkit     →  payload 被拦时的通用绕过
methodology/03-evidence            →  写报告前的证据纪律
playbooks/<type>.md                →  具体类型的探测/利用细节
templates/report-submission.md     →  H1/Bugcrowd 三段式提交模板
```
