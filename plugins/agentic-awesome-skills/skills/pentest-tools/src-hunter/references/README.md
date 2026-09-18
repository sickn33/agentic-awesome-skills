**中文** · [English](README.en.md)

# src-hunter

这是一个给 SRC、众测和 Bug bounty 用的 Claude Code skill。

简单说，就是你给它一个目标，它会按一套固定流程帮你推进漏洞挖掘：先确认目标范围，再做信息收集和资产枚举，然后进入漏洞测试，最后整理报告。

```text
intake → recon → enum → hunt → report
```

项目内置了一批从公开来源整理的知识库，包括：

- 19 类攻击 playbook
- 305 个结构化 payload
- WAF / EDR 绕过变体
- HackerOne 已披露 High / Critical hacktivity 数据
- WooYun 历史案例统计残余
- 常见国产组件指纹和默认凭据

## 安装

Marketplace：

```bash
/plugin marketplace add MyuriKanao/src-hunter-skill
/plugin install src-hunter@src-hunter
```

Git：

```bash
git clone https://github.com/MyuriKanao/src-hunter-skill.git ~/.claude/skills/src-hunter
```

## 目录结构

```text
references/
  methodology/    五阶段流程、攻击优先级、绕过工具集、证据规则
  playbooks/      每类漏洞一个文件，包含真实 H1 案例和 payload
  industry/       银行/金融、电信/ISP 垂直场景 playbook
  dictionaries/   国产组件指纹和默认凭据
  templates/      CVSS 4.0 报告模板
  h1-reports/     2887 份已披露报告原始数据，并按 weakness 分组
  payloader/      305 个结构化 payload、263 个 WAF/EDR 绕过步骤、114 个工具命令
```

playbook 是主要入口。所有 playbook 都按黑盒视角编写，默认你只有 URL，没有源码。

每个 playbook 都围绕同一套问题展开：

- 去哪里找入口
- 用什么 payload 测
- 观察哪些响应特征
- 如何判断影响
- 如何提高漏洞价值
- 哪些行为不能做

整体思路不是堆 payload，而是把测试动作、证据留存和报告输出串起来。

## MCP 工具集成

本 skill 集成本地 MCP 服务器作为工具层，让 Claude 在 hunt 阶段能直接调用浏览器自动化、CDP 调试、网络拦截、JS hook、AST 反混淆、Frida 内存验证、WASM 逆向、Source map 重构、Android adb 桥接、SSL pinning 绕过等能力。

**当前主选**：[jshookmcp](https://github.com/vmoranv/jshookmcp) 0.3.0（134 工具精选 / 386 全集 / 36 域），完整索引与场景映射见 [`references/tools/mcp-jshook.md`](references/tools/mcp-jshook.md)。

7 个高关联 playbook（`xss` / `rce` / `ssrf-cache-host` / `mobile` / `oauth-saml-jwt` / `api-rest` / `file-upload`）末尾各有 `## 相关 MCP 工具` 反向锚点，指明该攻击面下应该调哪些 jshook 工具、何时调。

## TODO

- 支持引入更多 tools
- 多 agent 执行工作流

## 触发关键词

skill 内置触发词包括：

- bug bounty、HackerOne、SRC 挖洞、漏洞赏金、众测
- WAF bypass、绕过 WAF
- 如何测试某个 endpoint / API / 参数
- 任意账号、任意修改、任意删除
- 密码重置、找回密码
- 默认凭据、Actuator、暴露的管理后台

也可以显式调用：

```text
/src-hunter <target>
```

## Playbook 列表

| Playbook | 嵌入 H1 案例数 |
|---|---:|
| arbitrary-x-authz（IDOR / 任意账户 / 提权） | 465 |
| rce（反序列化 / SSTI / XXE / 框架） | 385 |
| xss | 335 |
| info-disclosure | 319 |
| oauth-saml-jwt | 240 |
| logic-flaws（CSRF / 点击劫持 / 支付） | 234 |
| path-traversal / LFI / RFI | 163 |
| sqli | 147 |
| dos | 138 |
| ssrf-cache-host | 108 |
| unauth-access（默认凭据 / Actuator / 暴露服务） | 46 |
| http-smuggling / CRLF | 38 |
| api-rest / WebSocket | 15 |
| file-upload | 8 |
| mobile（Android / iOS） | 8 |
| race-conditions | 5 |
| llm-prompt-injection | 1 |
| graphql | 1 |
| intranet-postexp（内网 / 后渗透速查） | — |

## 数据来源

- HackerOne hacktivity feed：2887 份已披露 High / Critical 报告，来源为公开数据。
- WooYun 历史档案：覆盖 88,636 条案例，仅保留参数频率、案例 ID 和 bypass 模式等统计残余。
- Payloader：305 条结构化 payload + 263 个 WAF / EDR 绕过步骤 + 114 条工具命令，原仓库为 `3516634930/Payloader`。

本项目只整理、翻译和重组公开资料，不包含专有数据，也不抓取需要认证的内容。

## 红线

每个 playbook 末尾都写了具体的边界，下面是抽出来的几个最常踩的点：

- **样本控制**：SQLi 探测到库名 / 版本即可证明，不要 dump 数据；IDOR、Mongo / ES 拉数据 1–3 条样本就够，别全量。
- **测试账号自演**：越权、密码重置、JWT 伪造、redirect_uri、XSS 盲打全部用自己注册的两个号互测，**不要碰陌生人的账号**——即使能。
- **只读，不写**：拿到 RCE 只跑 `id` / `whoami` / `uname -a`；Redis / Mongo 默认未授权只 `info` / `ping` / `db.version()`；任意文件读看到 `root:x:` 一行即停，不读 `/etc/shadow`。
- **不真做副作用动作**：不真发短信、不真扣款、不真发邮件、不真退款、不真覆盖文件、不真改公告 / 邮件模板。证明接口能调通 + 200 即停。
- **DoS / 并发**：单次复现 ≤ 60s，串行做 5 次足够。竞态并发 50–100，绝不 1000+。短信 / 邮件不限速这种，发到自己手机 5–10 次为止。
- **不留物**：webshell、heapdump、备份、dump 出来的源码——本地保存，报告后立即删除，不要 push 到 GitHub / 第三方网盘。
- **凭据：拿到不用**：泄露的 AWS / Stripe / 数据库凭据，仅 `sts get-caller-identity` / 看 banner 验证，绝不用来扣款 / 发邮件 / 连接生产库。
- **报告里所有 PII 脱敏**：手机号、邮箱、用户名、token、cookie 留前 2 + 后 2，必要时附 sha256 指纹证明拿到过原文。
- **OOB 验证**：不要使用公开的公共 DNSLog 平台，使用厂商提供的 SSRF 测试平台，或自架 interactsh / 自有 DNSLog。
- **没抓包就没发现**：所有断言都要有 HTTP 包 / 截图 / 视频，不要凭"应该"提交。

具体到每类漏洞还有更细的限制（DoS 类最敏感、上传不留 webshell、读类只读 1 条样本等），看对应 playbook 的最后一节。

## 友情链接
[linuxdo](https://linux.do/)
## License

MIT。

数据来源均为公开资料。本项目主要做资料整理、翻译、归类，并封装成适合黑盒漏洞挖掘使用的 Claude Code skill。
