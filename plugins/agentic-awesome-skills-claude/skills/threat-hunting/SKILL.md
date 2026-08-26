---
name: threat-hunting
description: "Blue-team threat hunting: detection engineering with Sigma/YARA, SIEM query design, and validation of incident detections against known technique patterns."
risk: safe
source: "https://github.com/zhaoxuya520/reverse-skill"
source_repo: "zhaoxuya520/reverse-skill"
source_type: community
date_added: "2026-08-25"
license: "MIT"
license_source: "https://github.com/zhaoxuya520/reverse-skill/blob/main/LICENSE"
---
# Threat Hunting & Detection Engineering
## When to Use

- Proactively hunting for adversary activity in telemetry.
- Writing or validating detection rules mapped to ATT&CK techniques.


## 适用场景

- 威胁狩猎（hypothesis-driven）
- Sigma / YARA 检测工程
- 告警调优、误报分析
- 与 `malware-analysis/`：样本侧 IOC → 本 skill 落地检测
- 与 `digital-forensics/`：案件伪影 → 横向狩猎

## 工作流

### 1. 建假说

```text
例：攻击者用 living-off-the-land 做横向
→ 数据源：Sysmon 1/3/10、Windows Security 4624/4648
→ 成功标准：发现异常父进程或罕见账户日志源
```

### 2. 查询与堆叠

```text
□ 基线：正常管理员行为时段与主机
□ 异常：新服务、编码 PowerShell、异常出站
□ 关联：同账号多主机短时登录
```

### 3. 规则化

```yaml
# Sigma 骨架见 malware-analysis；本 skill 强调：
# - 误报面
# - 数据源字段映射
# - 响应 playbook 链接
```

### 4. 验证

```text
□ 原子测试（Atomic Red Team）仅在授权实验室
□ 回放历史日志验证召回
```

## 工具链

| 工具 | 用途 |
|------|------|
| Sigma CLI / sigmac | 规则转换 |
| YARA | 文件/内存 |
| SIEM（ELK/Splunk 等） | 查询 |
| osquery | 端点狩猎 |
| Atomic Red Team | 检测验证（实验室） |

## 参考

- `references/hunting-loop.md`
- `../malware-analysis/references/yara-sigma-rules.md`
- `../digital-forensics/`

## 路由上下文

**上游**: MASTER R27  
**下游**: 确认入侵 → forensics；恶意样本 → malware-analysis  
**MUST NOT**: 在无授权生产环境跑攻击模拟

## 任务完成自检

- [ ] 是否有明确假说与结论？
- [ ] 规则是否注明误报与数据源？
- [ ] Checklist？

## Limitations

- Hypothesis quality bounds results; weak telemetry yields weak hunts.
- Rule tuning is continuous; expect false positives initially.

> Adapted from [zhaoxuya520/reverse-skill](https://github.com/zhaoxuya520/reverse-skill) (MIT).
