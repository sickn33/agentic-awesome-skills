---
name: supply-chain-security
description: "Software supply-chain security assessment: SBOM generation, SCA scanning, CI/CD pipeline review, container image audit, build integrity, dependency provenance, and vulnerability reachability verification."
risk: safe
source: "https://github.com/zhaoxuya520/reverse-skill"
source_repo: "zhaoxuya520/reverse-skill"
source_type: community
date_added: "2026-08-25"
license: "MIT"
license_source: "https://github.com/zhaoxuya520/reverse-skill/blob/main/LICENSE"
---
# Supply Chain Security Testing
## When to Use

- Auditing how software is built, packaged, and depended upon.
- Verifying whether a disclosed CVE is actually reachable in a project.


## 适用场景

- 软件供应链安全评估
- 开源依赖漏洞扫描与验证
- CI/CD 管道安全审计
- 容器镜像安全分析
- 第三方组件合规审查
- 构建产物溯源与完整性验证

## 六层供应链治理框架

```text
Layer 1: 源码信任评估 → 上游仓库/维护者/发布历史审查
Layer 2: 构建管道集成 → CI/CD 安全门禁、签名验证
Layer 3: 制品分发完整性 → 签名、校验和、SBOM 附加
Layer 4: 运行时保护 → 容器扫描、准入控制
Layer 5: 持续监控 → CVE 实时追踪、漏洞可达性分析
Layer 6: 事件响应 → 供应链攻击应急、回滚策略
```

## 工作流

### 1. SBOM 生成与审计

```text
生成 SBOM：
□ CycloneDX 格式: cdxgen → bom.json
□ SPDX 格式: sbom-tool generate
□ Syft: syft <image|dir> -o spdx-json

审计要点：
□ 是否存在未知/未授权的依赖
□ 是否存在已废弃/停止维护的包
□ 许可证冲突检测
□ 直接依赖 vs 传递依赖清单
□ 每个组件的发布时间线和维护者状态
```

### 2. 软件组成分析（SCA）

```bash
# OSV-Scanner（免费、Google 维护）
osv-scanner scan -r . --format json

# OWASP Dependency-Track（企业级持续监控）
docker run -p 8080:8080 dependencytrack/apiserver
# → 上传 SBOM → 自动匹配 NVD/OSV/GitHub Advisory

# Snyk（商业）
snyk test --all-projects
snyk monitor  # 持续监控

# Trivy（容器 + 依赖 + IaC）
trivy fs .          # 文件系统扫描
trivy image nginx   # 容器镜像
trivy config .      # IaC 配置
```

### 3. 漏洞可达性验证

```text
SCA 告警 ≠ 实际风险！大多数 SCA 工具只有 ~15% 的告警是实际可达的。

验证步骤：
1. 用 Dependency-Track 或 Trivy 获取 CVE 列表
2. 筛选 CVSS ≥ 7.0 的漏洞
3. 对有 PoC 的 CVE 做可达性分析
   - Code Property Graph 切片: 追踪用户输入到漏洞函数的路径
   - DEPTEX 方法: EPD (Execution Path Dominance) + LLM 语义验证
4. 在隔离环境中验证 PoC
5. 对可达的漏洞按实际影响排序修复优先级
```

工具参考：
- CodeQL: GitHub 代码查询 → 数据流分析
- Snyk Code: 可达性标记
- DEPTEX: LLM 辅助上下文感知风险评估

### 4. CI/CD 管道安全

```text
安全检查点：
□ 代码提交 → pre-commit hook: gitleaks (密钥扫描)
□ PR 阶段 → SCA 扫描 (Trivy/OSV-Scanner)
□ 构建阶段 → 制品签名 (cosign)
□ 推送阶段 → SBOM 附加 (syft + attest)
□ 部署阶段 → 准入控制 (OPA/Kyverno + 镜像扫描)
□ 运行时 → 持续漏洞监控 (Dependency-Track)

管道自身安全：
□ Pipeline as Code 审计（GitHub Actions / GitLab CI 配置注入）
□ Runner 隔离（防止恶意构建突破容器）
□ 密钥管理（Actions Secrets / Vault，禁止硬编码）
□ 第三方 Action 审查（锁定 commit SHA，非 tag）
```

### 5. 容器镜像安全

```bash
# Dockerfile 审计
hadolint Dockerfile

# 镜像扫描（多层：OS + 应用依赖 + 配置）
trivy image --severity HIGH,CRITICAL nginx:latest

# 最小基础镜像
# 优先: distroless → alpine → slim → 避免 latest
docker scout quickview nginx:latest

# 镜像签名
cosign sign --key cosign.key myimage:tag
cosign verify --key cosign.pub myimage:tag
```

### 6. 第三方依赖审查

```text
新增依赖 Checklist：
□ 维护状态：最近 6 个月有提交？维护者活跃度？
□ 安全历史：过去有无被植入恶意代码？
□ 依赖树：引入后新增多少传递依赖？
□ 许可证：与项目许可证兼容？
□ 替代方案：有无更安全的替代（Snyk Advisor / Socket.dev 评分）？

风险评估矩阵：
  高维护 × 低依赖数 × 兼容许可证 → 低风险
  低维护 × 高依赖数 × 许可证冲突 → 高风险
```

## 工具链

| 工具 | 用途 | 获取 |
|------|------|------|
| OWASP Dependency-Track | 企业级持续 SCA | `docker pull dependencytrack/apiserver` |
| OSV-Scanner | 免费 SCA（OSV.dev 生态） | `go install github.com/google/osv-scanner` |
| Trivy | 镜像 + 依赖 + IaC 扫描 | `apt install trivy` |
| Syft | SBOM 生成 | `curl -sSfL https://raw.githubusercontent.com/anchore/syft/main/install.sh` |
| cdxgen | CycloneDX SBOM 生成 | `npm install -g @cyclonedx/cdxgen` |
| Cosign | 容器签名 | `go install github.com/sigstore/cosign/v2/cmd/cosign` |
| Gitleaks | 密钥/凭证扫描 | `go install github.com/gitleaks/gitleaks/v8` |
| Snyk | 商业 SCA + 可达性 | `npm install -g snyk` |
| CodeQL | 代码查询 + 数据流 | GitHub Actions 内置 |

## 参考

- `references/sbom-sca-methodology.md` — SBOM + SCA 方法论
- `references/cicd-pipeline-security.md` — CI/CD 管道安全审计


## 任务完成自检（声称完成前 MUST 通过）

- [ ] 我是否执行了工作流中的每一步（而不是只阅读）？
- [ ] 我是否基于 `tool-index` 使用了真实工具路径？
- [ ] 我是否产出了可复现证据（命令/脚本/截图/报告）？
- [ ] 我是否完成并回写了 RULES 要求的 Checklist 项？

## Limitations

- SBOM completeness depends on ecosystem tooling maturity.
- Reachability analysis is heuristic; manual confirmation advised.

> Adapted from [zhaoxuya520/reverse-skill](https://github.com/zhaoxuya520/reverse-skill) (MIT).
