# 授权侦察流水线（Bug Bounty / 渗透）

> 来源启发：社区 bug bounty recon 管线（subfinder→httpx→katana→nuclei→ffuf 等）、claude-bug-bounty 类 /recon 流程  
> 日期：2026-07-17（P0 ops：CF 浏览器头 / Windows nmap / Evidence append）  
> **MUST** 先满足 `ops/scope-contract.md`；禁止「只给一个域名就全网狂扫」

## 0. 门闩

```text
□ auth.status = granted（SRC/BB in-scope / 书面授权）
□ in_scope.assets 非空（域名/IP/URL 列表）
□ network_profile = authorized_target_only | lab_only
□ out_of_scope 已读（禁止 DoS、禁止超范围）
```

Ready case in one shot:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File skills\scripts\case-init.ps1 `
  -Hint "web pentest app.example" -CaseName "demo-case" `
  -AuthGranted -TargetUrl "https://app.example/" -NetworkProfile authorized_target_only

# ACT 前轻量门禁（未就绪 exit 2）
powershell -File skills\scripts\case-guard.ps1 -CaseRoot work\demo-case
```

## 0.1 Cloudflare / CDN 边缘：浏览器客户端头（MUST 先试）

很多 SaaS 在 **裸 curl / 数据中心 UA** 上返回 WAF `403 access-policy`（例如 `ap3`），但带浏览器 Origin/Referer 后 API 正常。

**默认先用可复制模板**（再谈目录爆破/nuclei）：

```bash
# Headers only
curl -sS -D - -o NUL --max-time 15 \
  -A "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36" \
  -H "Accept: application/json, text/plain, */*" \
  -H "Origin: https://app.example" \
  -H "Referer: https://app.example/" \
  "https://api.example/v1/health"

# Same-site style API call
curl -sS --max-time 15 \
  -A "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36" \
  -H "Accept: application/json" \
  -H "Origin: https://app.example" \
  -H "Referer: https://app.example/" \
  -H "Sec-Fetch-Site: same-site" \
  -H "Sec-Fetch-Mode: cors" \
  -H "Sec-Fetch-Dest: empty" \
  "https://api.example/app/v1/clock"
```

```text
□ 裸 curl 403 + JSON access-policy / CF-RAY → 换浏览器 UA + Origin/Referer 重试
□ 仍 403 且 HTML 含 Cf-Mitigated: challenge → 需要真实浏览器 / 登录会话，不要盲扫打爆
□ SPA 任意路径 200 + 相同 body 大小 → 多为前端路由，不是真实 API 命中
```

## 0.2 Windows curl：`[]` 被当成范围（原型污染 URL）

```text
curl: (3) bad range in position N: ... __proto__[test]=...
```

**MUST** 使用 `--globoff`，或 `--data-urlencode`：

```bash
curl.exe --globoff -sS "https://target/?__proto__%5Btest%5D=polluted"
curl.exe --globoff -sS -G "https://target/path" --data-urlencode "__proto__[test]=polluted"
```

客户端 / DOM 面进一步见 `client-side-lab-playbook.md`。

## 0.3 Windows nmap 坑（本机）

在部分 Windows 环境，默认 Nmap 可能报：

```text
dnet: Failed to open device eth0
QUITTING!
```

**处理：**

```text
□ 优先 TCP connect 扫描：nmap -sT -sV --top-ports 50 -Pn -T3 target
□ 目标在 Cloudflare/CDN 后：应用层（HTTPS/API/JS）优先，全端口 raw 扫描收益低
□ 仍失败：记录为环境限制，继续 http/curl 侦察，不要卡死在 nmap
```

## 1. 推荐阶段（可裁剪）

| 阶段 | 典型工具 | 产出 |
|------|----------|------|
| 1 被动子域 | subfinder / amass / crt | domains.txt |
| 2 存活 | httpx（注意：Windows 上 `httpx` 可能是 Python 库 CLI，不是 projectdiscovery） | live.txt + tech |
| 3 URL/爬虫 | katana / gau / wayback（按授权） | urls.txt |
| 4 指纹/模板 | nuclei -severity critical,high | candidates |
| 5 目录/参数 | ffuf / arjun | 隐藏面 |
| 6 验证 | 手工 / sqlmap / 专用 PoC | **E-*** 证据 |
| 7 报告 | docs-generator | F/P 链 |

工具未在 bootstrap-manifest 中的：**文档安装或 Kali 预装**，禁止假装可 bootstrap。

## 2. Evidence 门（降误报 — 本包特色）

```text
nuclei/ffuf 命中 ≠ Finding validated
□ 每条候选：复现命令 + 响应摘录（脱敏）→ E-id
□ 仅 validated 进报告 High+
□ timeline 每阶段至少 1 条
```

### 2.1 追加 Evidence（固定结构，禁止自创目录）

契约字段见 `skills/ops/evidence-finding-path.md`。  
一键写入 case 目录：

```powershell
# Prefer -RawExcerptFile when excerpt has quotes/spaces (nested powershell -File splits multi-word values)
Set-Content work\demo-case\excerpt.txt -Value '{"clock":"...","status":true}' -Encoding utf8
powershell -NoProfile -ExecutionPolicy Bypass -File skills\scripts\append-evidence.ps1 `
  -CaseRoot "work\demo-case" `
  -Id "E-001" `
  -Title "Public clock API returns 200" `
  -ReproCommand 'curl -s "https://api.example/app/v1/clock" -A "Mozilla/5.0" -H "Origin: https://app.example" -H "Referer: https://app.example/"' `
  -Severity info `
  -Status observed `
  -RawExcerptFile "work\demo-case\excerpt.txt" `
  -Location "https://api.example/app/v1/clock"
```

产物：

- `work/<case>/evidence/E-001.md`（含 title / repro_command / raw_excerpt / status）
- `work/<case>/evidence/INDEX.md` 索引行

社区「7-question gate / 检测与验证分离」思路：与我们的 Evidence→Finding 一致。

## 3. 与 src-hunter / api-security

深度漏洞类型 playbook → `pentest-tools/src-hunter/`。  
本流水线解决 **怎么从资产到候选**；playbook 解决 **怎么验某一类洞**。  
Web SaaS 未登录面 → 本流水线；拿到 token/会话后的 BOLA/IDOR → 可交接 `api-security/`。

## 4. 明确禁止

```text
□ 无 scope 的 masscan 全网段
□ 对 out_of_scope 子公司/第三方自动扩展
□ 把 scanner 输出直接当已确认漏洞写 HackerOne
□ 在 Cloudflare challenge 上硬刚爆破打崩边缘
```
