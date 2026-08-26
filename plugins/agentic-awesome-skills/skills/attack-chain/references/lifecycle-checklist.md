# 渗透/攻击链生命周期检查单

> 对照社区 pentest skill 包（如 Orizon claude-code-pentest 六阶段）与本包 `attack-chain` + `ops` 整合。  
> 来源启发：公开 Claude pentest lifecycle skills（2026-07 检索）；**命令与授权以本包 scope 为准**。  
> 日期：2026-07-17

## 使用前

- [ ] `case-init` 完成，`auth.status=granted`
- [ ] `network_profile` ≠ 误用 unrestricted 打生产
- [ ] `lead` 已指定 specialist_roles（`ops/role-map.md`）

## 阶段门闩

| 阶段 | 角色 | 本包 skill | 完成标准 |
|------|------|------------|----------|
| 0 Scope | lead | ops/scope-contract | ready_for_act |
| 1 Recon | cie | pentest-tools | assets 列表 + timeline |
| 2 Enum/Vuln | cpe | pentest-tools / api-security | 候选 F-* 草稿 |
| 3 Validate | cpe | pentest-tools | E-* + validated Finding |
| 4 Post-ex（若授权） | cpe/lead | attack-chain 后半 | 不超 out_of_scope |
| 5 RE 辅助 | cre | ida/apk/js/… | 仅当需要客户端/二进制 |
| 6 Report | doc | docs-generator | Evidence→Finding→Path |
| 7 Journal | lead | field-journal | 脱敏 |

## 与「给一个域名全自动打穿」类 skill 的差异（特色）

| 外部自动化包常见 | reverse-skill |
|------------------|---------------|
| 默认对域名狂扫 | 必须 scope 资产列表 |
| 弱证据直接写报告 | 强制 E/F/P 链 |
| 单会话无角色 | role-map 交接 |
| 无工具索引 | tool-index + bootstrap |

## 每阶段 timeline 最少一条

格式见 `ops/timeline-workitem.md`。
