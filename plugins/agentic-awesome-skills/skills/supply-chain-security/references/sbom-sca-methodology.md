# SBOM + SCA 方法论

## SBOM 标准对比

| 标准 | 格式 | 生态 | 推荐场景 |
|------|------|------|---------|
| SPDX | JSON/YAML/tag-value | Linux Foundation、Yocto | 许可证合规优先 |
| CycloneDX | JSON/XML | OWASP、Kubernetes | 安全分析优先 |
| SWID | XML | ISO 标准 | 企业资产管理 |

## SBOM 生成工具链

```bash
# cdxgen: 从源码生成 CycloneDX SBOM
cdxgen -o bom.json -t cyclonedx

# Syft: 从容器/文件系统生成
syft nginx:latest -o spdx-json > sbom.spdx.json

# SBOM-Tool: 微软工具链
sbom-tool generate -b ./build -bc ./src -pn MyApp -pv 1.0
```

## SCA 工具对比

| 工具 | 免费 | 速度 | 数据库 | 可达性 |
|------|:--:|------|--------|:--:|
| OSV-Scanner | ✅ | 极快 | OSV.dev | ❌ |
| Trivy | ✅ | 快 | 多源 | ❌ |
| Dependency-Track | ✅ | 中 | NVD+OSV+GitHub | ❌ (需插件) |
| Snyk | ❌ | 中 | 专有 | ✅ |
| CodeQL | ✅ | 慢 | 代码级 | ✅ |

## 漏洞优先级策略

```
CVSS ≥ 9.0 + 有公开 PoC + 可达 → P0 立即修复
CVSS ≥ 7.0 + 有 PoC + 可达 → P1 本周修复
CVSS ≥ 7.0 + 无 PoC 或不可达 → P2 下个迭代修复
其余 → 按常规流程
```

## 手工验证三步法

```bash
# 1. 确认版本（不要盲信 SBOM 字段）
# 容器内: dpkg -l | grep <package>
# Node: cat node_modules/<pkg>/package.json | jq .version
# Python: pip show <package>

# 2. 确认漏洞
# 搜索 CVE: https://osv.dev / https://nvd.nist.gov
# 查看受影响版本范围
# 找到 GitHub Advisory / oss-security 邮件列表

# 3. 验证影响
# 搜索公开 PoC: GitHub/Exploit-DB
# 分析利用条件: 是否需要认证/本地访问/特定配置
# 在隔离环境验证: docker run --rm -it vulnerable-image bash
```

## 持续监控

```yaml
# 每日 SBOM 更新 + 扫描
schedule:
  - cron: "0 6 * * *"  # 每天早上 6 点
    steps:
      - cdxgen -o bom.json
      - osv-scanner scan --sbom bom.json
      - trivy fs --exit-code 1 --severity CRITICAL .
```

Source: OWASP CycloneDX, SPDX, Google OSV, CISA SBOM Guidance
