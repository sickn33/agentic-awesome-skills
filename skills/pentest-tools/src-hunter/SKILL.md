---
name: src-hunter
description: "Bug-bounty/SRC vulnerability-hunting workflow: five-phase methodology (intake, recon, enumeration, hunt, report) with attack playbooks for SQLi, XSS, RCE, SSRF, IDOR, CSRF, path traversal, and file upload."
risk: offensive
source: "https://github.com/zhaoxuya520/reverse-skill"
source_repo: "zhaoxuya520/reverse-skill"
source_type: community
date_added: "2026-08-25"
license: "MIT"
license_source: "https://github.com/zhaoxuya520/reverse-skill/blob/main/LICENSE"
---
> **⚠️ AUTHORIZED USE ONLY**
> This skill is for educational purposes or authorized security assessments only.
> You must have explicit, written permission from the system owner before using this tool.
> Misuse of this tool is illegal and strictly prohibited.

> **Mandatory confirmation gate**
> Before running any command that probes, exploits, changes, persists on, extracts data from, or attempts credential access against a target:
> 1. Ask the user to state the exact target URL, IP, account, or resource.
> 2. Ask the user to confirm written authorization and the permitted scope.
> 3. Show the exact command(s) and explain their expected effect.
> 4. Wait for explicit confirmation in the current conversation.
>
> Without that confirmation, remain read-only and provide defensive guidance only. Prefer a sandbox, disposable VM, or controlled lab.

## When to Use

- Hunting vulnerabilities in bug-bounty programs within program policy.
- Following a disciplined methodology instead of ad-hoc testing.

## 何时使用本 skill

**关键词命中**：
- "src 挖洞" / "src 漏洞" / "src 测试" / "Security Response Center"
- "bug bounty" / "漏洞赏金" / "众测"
- "hackerone" / "h1" / "bugcrowd" / "intigriti" / "yeswehack"
- "如何挖 / 怎么测 / 怎么打 + 某目标 / 某接口 / 某参数"
- "WAF 绕过" / "绕过 WAF" / "WAF bypass"
- "任意账号 / 任意修改 / 任意删除 / 任意操作" 类越权
- "密码重置" / "找回密码" 类逻辑
- "未授权访问" / "默认凭据" / "Actuator" / "Spring 暴露" / "Redis 未授权"
- 用户给一个 URL 或 API endpoint 让你测

**不应使用本 skill**：
- 纯白盒源码审计（用 `code-audit` skill）
- 已知漏洞的修复 / 防御问答（用通用对话）
- 单独的 CTF 题目（这是真实环境工作流）

---

## 工作流 — 5 阶段

### Phase 1 · Intake（接单）

输入：程序名 / SRC 入口 URL / 子域。

要做的事：
- 抓 Scope（in-scope domains / IPs / mobile apps / API endpoints）
- 抓 Out-of-scope（禁测内容、第三方服务、cloud assets exclusions）
- 抓规则（payout tiers、disclosure window、retest policy、safe-harbor）
- 抓测试账号 / 测试 header（如 `X-Bug-Bounty: <handle>`）

**优先级判断**（基于命中类型预估命中率，参考 `references/methodology/05-srctimebox-priority.md`）：
- 6 小时窗口 → 跑高命中率类型（密码重置 88% / 任意账号 86.4% / 提现 83.1%）
- 单日窗口 → 加上信息泄露 + 资产暴露 + Actuator
- HVV / 重点期 → 全谱

→ 详见 [`references/methodology/00-index.md`](references/methodology/00-index.md)

### Phase 2 · Recon（被动侦察）

不发包给目标的情报收集：

- **CT 日志**：crt.sh / Censys（找子域）
- **历史快照**：Wayback / CommonCrawl
- **GitHub 搜索**：`org:target` + 关键词（password / api_key / SECRET）
- **搜索引擎 dorks**：`site:target.com inurl:/admin`、`filetype:env`、`intitle:Index of`
- **ASN / IP 段**：bgp.he.net 找 IP 块
- **Favicon hash**：FOFA / Shodan 找同 favicon 资产
- **DNS 历史**：SecurityTrails / Whoisxmlapi

### Phase 3 · Enum（主动探测）

**资产枚举**：
- 子域：amass / subfinder / puredns / dnsx
- 存活：httpx / naabu
- 截图：gowitness / aquatone
- 内容发现：ffuf / feroxbuster / dirsearch
- 技术指纹：wappalyzer / webanalyze（同时查 `references/dictionaries/chinese-srcfingerprints.md` 命中国产组件）
- JS 提取：linkfinder / subjs / gau / katana
- 子域接管指纹：subjack / subzy

### Phase 4 · Hunt（漏洞探测）

按攻击类型走对应 playbook，**每个 playbook 都包含**：方法论 + 参数频率表 + 真实 H1 案例 + 结构化 payload + WAF 绕过变体。

**优先级路径**（按命中率 + 价值排序）：

| Playbook | 入口提示 | 文件 |
|---|---|---|
| **未授权访问** | Actuator/Swagger/默认端口/弱密码 | `references/playbooks/unauth-access.md` |
| **信息泄露** | .git/.svn/.env/heapdump/路径列举 | `references/playbooks/info-disclosure.md` |
| **任意 X 越权** | 用户态 ID 可遍历/可修改 | `references/playbooks/arbitrary-x-authz.md` |
| **业务逻辑** | 密码重置/支付/订单/验证码 | `references/playbooks/logic-flaws.md` |
| **OAuth/SAML/JWT** | 认证流/redirect_uri/token | `references/playbooks/oauth-saml-jwt.md` |
| **API REST** | BOLA/Mass Assignment/速率 | `references/playbooks/api-rest.md` |
| **SQLi** | 任何用户输入进 DB | `references/playbooks/sqli.md` |
| **RCE** | 反序列化/SSTI/XXE/原型链/框架 | `references/playbooks/rce.md` |
| **SSRF** | URL 入参/缓存/Host 注入 | `references/playbooks/ssrf-cache-host.md` |
| **路径遍历** | 文件路径入参/LFI/RFI | `references/playbooks/path-traversal.md` |
| **文件上传** | 上传点 + 解析漏洞 | `references/playbooks/file-upload.md` |
| **XSS** | 任何用户输入进 HTML/JS | `references/playbooks/xss.md` |
| **HTTP 走私** | 反代 + Content-Length | `references/playbooks/http-smuggling.md` |
| **GraphQL** | introspection/嵌套 | `references/playbooks/graphql.md` |
| **竞态** | 并发请求 / TOCTOU | `references/playbooks/race-conditions.md` |
| **DoS** | ReDoS / 资源不限速 / 算法爆炸 | `references/playbooks/dos.md` |
| **移动端** | Android / iOS APK | `references/playbooks/mobile.md` |
| **LLM Agent** | Prompt 注入 / 工具调用 | `references/playbooks/llm-prompt-injection.md` |
| **内网后渗透** | 凭据 / 横向 / 域 | `references/playbooks/intranet-postexp.md` |

**通用方法论**（不分攻击类型）：

| 文档 | 关键内容 |
|---|---|
| [`methodology/01-attack-priority.md`](references/methodology/01-attack-priority.md) | RCE>文件写>认证绕过>注入>信息泄露 价值排序 |
| [`methodology/02-bypass-toolkit.md`](references/methodology/02-bypass-toolkit.md) | 通用绕过决策树 + 编码 / 混淆 / WAF |
| [`methodology/03-evidence-discipline.md`](references/methodology/03-evidence-discipline.md) | 黑盒证据规则 + 反幻觉 + 合规 |
| [`methodology/04-control-gap-hunting.md`](references/methodology/04-control-gap-hunting.md) | 9 类敏感操作 → 应有控制 → 探测缺失 |
| [`methodology/05-srctimebox-priority.md`](references/methodology/05-srctimebox-priority.md) | 6h / 单日 / HVV / 月度 时间盒模板 |

**行业垂直 playbook**（资产相关时优先看）：

| 行业 | 文档 | 何时用 |
|---|---|---|
| 银行 / 支付 / 金融 | [`industry/banking-finance.md`](references/industry/banking-finance.md) | 目标含支付 / 网银 / 第三方支付聚合 |
| 电信 / ISP | [`industry/telecom-isp.md`](references/industry/telecom-isp.md) | 目标是运营商 / BOSS / 网管 / 物联网卡 |

**字典 / 凭据**：

| 文档 | 用途 |
|---|---|
| [`dictionaries/default-credentials-cn.md`](references/dictionaries/default-credentials-cn.md) | 致远 / 通达 / 万户 / 泛微 / 用友 / 金蝶 / 华为 / 中兴 / 海康等国产凭据 |
| [`dictionaries/chinese-srcfingerprints.md`](references/dictionaries/chinese-srcfingerprints.md) | 国产 OA / 中间件指纹 + 高频参数 + 一键检测命令 |

### Phase 5 · Report（提交）

→ 用模板 [`templates/report-submission.md`](references/templates/report-submission.md)

**三段式骨架**：
1. **标题**：精确到 endpoint + 漏洞类型，不超过 80 字
2. **重现步骤**：每步可执行 / 截图 / HAR
3. **影响 + 修复建议**：CVSS 4.0 vector + 业务影响段

---

## MCP 工具集成

本 skill 支持调用本地 MCP 服务器作为工具层。**主选 jshookmcp**(134 工具精选 / 386 全集 / 36 域,内置 Burp Suite bridge / Frida / WASM / 反调试 / Android adb / sourcemap 重构)。完整索引与场景映射:

→ [`references/tools/mcp-jshook.md`](references/tools/mcp-jshook.md)

默认推荐 `search` profile(上下文成本 ~3K token),通过 `mcp__jshook__search_tools` + `mcp__jshook__activate_tools` 按需激活,避免 `full` profile 一次性加载 40K+ token。

---

## 数据资产规模

| 类别 | 量级 |
|---|---|
| 攻击类 playbook | 19 个 |
| 通用方法论文档 | 6 个 |
| 行业垂直 playbook | 2 个（银行 / 电信） |
| 字典 / 凭据 | 3 个 |
| 报告模板 | 1 个 |
| 结构化 payload | **305 条**（177 web + 128 内网） |
| WAF / EDR 绕过变体 | **263 个步骤**，覆盖 23 类 Web 攻击 |
| 工具命令速查 | 114 条（Nmap/SQLMap/Burp/MSF/...） |
| HackerOne 真实案例（已披露 High/Critical） | **2887 份**，按 weakness 分到 141 个分类 MD |
| WooYun 历史案例统计（不可再生） | 88,636 条 |

H1 真实案例已**直接嵌入对应 playbook 末尾**（每个 playbook 末尾有"H1 真实案例" Top 12 表 + 摘要）。

---

## 合规与合法红线

每个 playbook 末段都有"不要做的事"。通用红线（任何 SRC 都遵守）：

- ❌ 出 scope 的资产 / 域名 → 立即停手并报备
- ❌ 实际取走他人 PII → 仅证明可访问，立即销毁
- ❌ 持续负载 / DoS / 大流量 → 仅 1–3 个 PoC 包，立即停止
- ❌ 修改他人数据（即使有写权限）→ 仅在自己控制的对象上验证
- ❌ 在生产做钓鱼或社工 → 不做
- ❌ 提交未复现的猜测 → 必须有 HTTP 包 / 截图 / 视频证据
- ✅ 测试 header 标记自己（如 `X-Bug-Bounty: <handle>`）
- ✅ 用自己的两个账号自演越权场景
- ✅ 用 OOB 域名做 SSRF 探测，不要用别人的 DNSLog
- ✅ 提交前用 `references/templates/report-submission.md` 自查

---

## CLI 助记前缀

`srchunter`（如：`srchunter scope set <program>`、`srchunter recon run`、`srchunter findings new <type>`）。当前未实现 CLI，仅作命名约定。

---

## 引用 / 跨链结构

```
src-hunter/
├── SKILL.md                    # 本文件 — skill 入口
├── README.md                   # 项目说明
└── references/
    ├── methodology/   6 docs   # 通用打法
    ├── playbooks/    19 docs   # 攻击类 playbook（每个含 H1 案例 + Payload 库）
    ├── industry/      3 docs   # 行业垂直
    ├── dictionaries/  3 docs   # 字典 / 凭据
    ├── templates/     1 doc    # 报告模板
    ├── h1-reports/             # 2887 份 H1 报告原始数据 + 141 类 MD
    │   ├── raw/                # 原始 JSON（resume / 二次分析用）
    │   └── by-weakness/        # 按 CWE 分类的 Markdown
    └── payloader/              # 305 条结构化 payload 数据
        ├── raw/                # JSON（机读）
        ├── by-category/        # 按分类的 MD
        ├── tools/              # 工具命令
        └── waf-bypass.md       # 263 步骤 WAF 绕过集
```


## 任务完成自检（声称完成前 MUST 通过）

- [ ] 我是否执行了工作流中的每一步（而不是只阅读）？
- [ ] 我是否基于 `tool-index` 使用了真实工具路径？
- [ ] 我是否产出了可复现证据（命令/脚本/截图/报告）？
- [ ] 我是否完成并回写了 RULES 要求的 Checklist 项？

## Limitations

- Strictly respect each program's policy, scope, and rate limits.
- Playbook depth varies; novel logic flaws still require creativity.

> Adapted from [zhaoxuya520/reverse-skill](https://github.com/zhaoxuya520/reverse-skill) (MIT).
