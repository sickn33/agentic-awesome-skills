---
name: identity-federation
description: "Authorized assessment of federated identity systems: SAML, OIDC, OAuth2 flows, SSO misconfiguration, and token-confusion issues."
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

# Identity Federation (SAML / OIDC / OAuth)
## When to Use

- Testing SSO/federation flows within an approved scope.
- Hunting signature-validation or audience-confusion flaws.


## 适用场景

- SAML Response 签名/断言篡改面（经典缺陷模式）
- OIDC 隐式/授权码 + PKCE 缺失
- redirect_uri / state / nonce 问题
- IdP 与 SP 元数据、多租户 issuer 混淆
- 与 `api-security` JWT 攻击互补（本 skill 偏联邦与 SSO 流）

## 工作流

```text
□ 画清：User → SP → IdP → Token → SP
□ 收集：/.well-known/openid-configuration、SAML metadata
□ 检查：redirect_uri 精确匹配、state 绑定、PKCE
□ 检查：SAML 签名覆盖范围、algorithm 降级
□ 会话固定与登出失效
```

## 工具链

| 工具 | 用途 |
|------|------|
| Burp + SAML Raider 等 | 断言编辑（授权） |
| jwt_tool | JWT 段 |
| 浏览器 DevTools | 重定向链 |
| IdP 管理日志 | 审计 |

## 参考

- `references/sso-flow-checklist.md`
- `../api-security/` `../windows-ad/`（企业 IdP）

## 路由上下文

**上游**: MASTER R37  
**下游**: 纯 API JWT → api-security；云 IdP → cloud-k8s

## 任务完成自检

- [ ] 是否映射完整 SSO 流？
- [ ] 每个 Finding 是否有复现与影响？
- [ ] Checklist？

## Limitations

- IdP-side testing is often out of scope; confirm boundaries first.
- Token replay tests can lock out real users; stage carefully.

> Adapted from [zhaoxuya520/reverse-skill](https://github.com/zhaoxuya520/reverse-skill) (MIT).
