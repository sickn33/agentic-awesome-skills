# Vendor Report Rules（专业厂商报告结构叠加层）

> Issue #65 问题 2。  
> **只抽结构与写法规则，禁止抄录任何厂商报告正文、图表、真实 IOC 实例或大段表述。**  
> 本文件是**叠加层**：不替换 `security-report-templates.md` 的任务模板，也不削弱 §0 Evidence→Finding→Path。

结构参考（公开样例，仅骨架）：

| Flavor | 主参考 | 场景 |
|--------|--------|------|
| `malware` | 火绒安全病毒/技术分析报告 | 明确的普通木马、白加黑、钓鱼投毒、恶意样本 |
| `apt` | 卡巴斯基 Securelist / APT 战役报告（如 MATA） | APT、团伙战役、多阶段感染链、行业定向 |

原则：**模板在精不在多** —— 仅 2 个厂商全文 flavor（`malware` / `apt`）+ Base 通用元素 + **可选 thin overlay**（如 `vuln` 漏洞技术分析）。普通逆向、渗透、CTF 和 JS 报告保持任务模板，不默认伪装成恶意软件报告；`vuln` **不是** 第 3 个默认全文 flavor。

---

## 0. 何时启用

在 `docs-generator` 生成**安全类**报告时（逆向 / 恶意软件 / 渗透收尾 / 用户明确要求「专业报告」「厂商风格」）**MUST** 读取本文件。只有任务证据或用户明确要求支持时才选择厂商 flavor；否则使用 `flavor = null`，仅叠加通用专业元素和原任务模板。

| 信号 | Flavor / Overlay |
|------|------------------|
| APT / 团伙 / 战役 / 多阶段 C2 / 行业定向 / ICS / spear-phish 战役 | `apt` |
| 明确恶意样本、木马、窃密、白加黑、仿冒站点 | `malware` |
| 用户明确要求漏洞/补丁/CVE 技术分析，或任务证据为 OS/组件漏洞研究 | `flavor = null` + **thin overlay `vuln`**（见 §3b） |
| 普通 APK/ELF/PE/Mach-O 逆向、算法分析、固件分析、渗透测试、CTF、JS 签名 | `flavor = null`；使用原任务模板和通用专业元素最小集 |

用户显式指定「按卡巴/APT」「按火绒/病毒报告」「按漏洞技术分析」时，覆盖自动选型。  
**禁止** 把普通 malware/APT/普通逆向默认套进 `vuln` 目录。

---

## 1. 通用专业元素（Base）

下列 Base 元素按报告类型应用。标 **MUST** 的不可省略；与特定 flavor 相关的元素不得为了填模板而出现在无关任务中。没有适用内容时，使用 `n/a` 并说明原因。

| # | 元素 | 要求 |
|---|------|------|
| G1 | 执行摘要 / 概述 | **MUST**：3–8 句：分析了什么、最严重结论、影响面、建议动作 |
| G2 | 范围与授权 | **MUST**：链到 case `scope.md`（见模板 §0.1） |
| G3 | Evidence→Finding→Path | **MUST**：见 `security-report-templates.md` §0 与 `skills/ops/evidence-finding-path.md` |
| G4 | IOC 表 | `malware` / `apt` **MUST**；其他任务仅在存在相关指标时出现 |
| G5 | 建议 / 处置 | `malware` / `apt` **MUST**：至少 1 条可执行建议；其他任务按原任务模板 |
| G6 | 附录元数据 | **SHOULD**：工具与版本、样本哈希、完整复现命令 |
| G7 | ATT&CK 映射 | **MUST**（`apt` 下；无适用技术时 `n/a` + 原因）；其他任务 **SHOULD** |

### 1.1 IOC 表最小列

```markdown
| 类型 | 值 | 上下文 | 首次/最后发现 | 来源证据 | 置信度 |
|------|----|--------|---------------|----------|--------|
| file_sha256 / file_md5 / domain / ip:port / url / mutex / path / registry | … | 何处发现 | YYYY-MM-DD / n/a | E-id | high/med/low |
```

### 1.2 版权与安全边界

- 不得粘贴厂商 PDF/网页正文段落或图注充作己方分析。
- 真实 token、内网 URL、客户标识用占位符。
- 未授权目标不得输出可直接利用的攻击步骤细节（遵循 case scope / RULES）。

---

## 2. Flavor：`malware`（火绒式 · 明确选择）

**叙事目标**：让读者 5 分钟内看懂「是什么 → 怎么来的 → 样本怎么干的 → 怎么处置 → 有哪些 IOC」。

### 2.1 推荐章节顺序

```markdown
# [标题：一句话威胁定性]

> 分析日期 / 分析方 / 样本标识（哈希）

## 1. 概述
（G1：发现渠道、伪装手法、核心技术点、产品侧可否查杀——若未知写 n/a）

## 2. 攻击 / 感染流程
（流程图：Mermaid 或分步列表；对应 Path `path_type=attack`）

## 3. 样本分析
### 3.1 样本溯源
### 3.2 静态分析
（**MUST** 纳入导入表 / 基础身份 Evidence：E-imports 或等价；见 radare2/ida/malware 硬门）
### 3.3 动态分析 / 行为
（无动态条件则 n/a + 原因）
### 3.4 核心发现（Findings 表或编号列表，挂 evidence_ids）

## 4. 应急处置方式
（仅在授权范围内执行：先确认 scope 并保全样本、内存、进程树、网络连接和日志等证据，再隔离主机；经负责人批准后再终止进程、隔离/清除文件、检查 hosts/启动项、全盘查杀并复核。不得在证据保全前直接删除文件。）

## 5. 总结说明
（给普通用户/运维的风险提醒与预防）

## 6. IOC 信息
（G4 表）

## 7. Evidence 链摘要
（§0：E / F / P / Timeline；可与 §3.4 合并但字段不省）

## 8. 附录
（工具版本、复现命令、脚本路径）
```

### 2.2 文风

- 中文用户默认中文；先结论后细节。
- 静态分析按「组件/阶段」分层，避免无结构的长日志粘贴。
- 处置步骤必须可独立执行，禁止「加强安全意识」空话充数。

---

## 3. Flavor：`apt`（卡巴斯基 Securelist 式）

**叙事目标**：讲清战役级故事——谁在何时用何链打了谁，调查如何推进，组件如何分工，防守方拿什么去检。

### 3.1 推荐章节顺序

```markdown
# [战役/集群名称]：[一句话影响]

> 日期 / 团队 / 行业与地区范围（若可知）

## 1. Executive summary
（G1：时间窗、受害者画像、入口、家族/集群归属、持续时长、最重要结论）

## 2. The infection chain
（分阶段：投递 → exploit/loader → 主马 → 后渗透/窃密；未知段明确 “limited visibility”
对应 Path；建议配链图）

## 3. Incident investigation
（调查叙事：关键转折、内网代理/C2 特征、如何扩大范围；挂 Timeline）

## 4. Interesting findings
（3–7 条非显而易见要点，每条尽量挂 E-id / F-id）

## 5. Technical analysis
### 5.1 组件总览表（loader / trojan / stealer / …）
### 5.2 分组件行为与配置
### 5.3 静态要点（含导入表/加壳/持久化 Evidence）
### 5.4 网络与 C2
（可附 ATT&CK 表 G7）

## 6. Detection and mitigation
（检测思路 / 狩猎线索 / 缓解优先级；非空泛口号）

## 7. IOC
（G4；按类型分组）

## 8. Evidence 链摘要
（§0 字段）

## 9. Appendix
（样本列表与哈希、工具版本、参考公开编号；不抄外部报告正文）
```

### 3.2 文风

- 时间线与「可见性限制」要诚实写。
- Interesting findings ≠ 重复概述；写调查中真正关键的异常点。
- 组件分析用表：角色 / 持久化 / C2 / 依赖，再展开。

---


## 3b. Thin overlay：`vuln`（漏洞技术分析 · 可选）

> Issue #65 补充。结构参考公开「操作系统/组件漏洞技术分析」类报告目录，**只抽章节骨架**，禁止抄录截图/正文中的 PoC 报文、利用细节或未授权攻击步骤。  
> **不是** 第 3 个默认厂商全文 flavor；仅在漏洞研究任务或用户明确要求时叠加。

**叙事目标**：读者能快速看到「影响谁 → 如何确认/复现（授权内）→ 根因与补丁差异 → 如何缓解」。

### 建议章节顺序

```markdown
## 1. 漏洞概述
### 1.1 影响范围（版本/组件/配置前提）
### 1.2 漏洞复现（授权环境；步骤可第三方重复；无武器化教程口吻）

## 2. 漏洞分析
### 2.1 崩溃 / 异常分析（Evidence：崩溃日志、触发条件）
### 2.2 补丁分析（diff/守卫条件/修复点 — 挂 E-*）
### 2.3 PoC 或触发器分析（仅授权范围内已有材料；协议/输入构造层次说明即可）

## 3. 防护建议
### 3.1 缓解措施（配置/缓解开关等）
### 3.2 官方补丁与验证

## 4. Evidence → Finding → Path（可并入各节或独立表）
```

### 硬约束

- **MUST** scope/授权：未授权目标禁止复现与 PoC 扩展
- **MUST** E/F/P：复现、崩溃、补丁结论均挂 evidence_ids
- **MUST NOT** 把 `vuln` 当作 malware/APT 默认壳
- **MUST NOT** 抄录外部报告/截图中的利用代码或完整攻击武器化步骤
- IOC 表：仅当存在网络/文件指示器时出现；否则 n/a 或省略

---
## 4. 与现有任务模板的挂接

| 任务模板（`security-report-templates.md`） | 叠加方式 |
|------------------------------------------|----------|
| 1. 逆向工程报告 | 默认 `flavor = null`，保留原「静态/动态/复现」骨架和导入表等硬门 Evidence；只有明确恶意样本才套 §2 |
| 2. 渗透测试报告 | `flavor = null`；补 Base 中适用的 G1–G3，攻击路径对齐 §0 Path，不强制 IOC |
| 3. CTF Writeup | `flavor = null`；保留原题目、解题思路和复现结构，不强制 IOC/ATT&CK |
| 4. JS/Web 签名逆向 | `flavor = null`；使用原概述 → 定位 → 算法 → 复现骨架，不套 malware |
| 恶意软件 / APT 专项 | 显式选 `malware` 或 `apt` 全文骨架 |

**冲突解决**：§0 Evidence 链字段与 scope 门禁 **永远优先**；flavor 只改叙事顺序与专业外壳，不得删除 E/F/P。

---

## 5. 选型伪代码

```
if user_requests_kaspersky or apt or threat_campaign:
    flavor = apt
elif user_requests_huorong or vir_report or explicit_malware:
    flavor = malware
else:
    flavor = null  # 原任务模板 + Base 中适用的元素
overlay = null
if user_requests_vuln_tech_report or cve_patch_analysis:
    overlay = vuln  # thin only; never a third default full flavor
emit(base_report)
if flavor in (malware, apt):
    emit(report with flavor outline)
elif overlay == vuln:
    emit(report with vuln thin outline)
```

---

## 6. 完成检查清单（写报告末自检）

- [ ] 已选 flavor 或显式「任务模板 + 最小集」
- [ ] G1 概述存在且非空话
- [ ] §0 E/F/P 字段完整
- [ ] `malware` / `apt` 报告有 IOC 表（或 n/a+原因）
- [ ] `malware` / `apt` 报告有可执行建议/处置
- [ ] 无 flavor 的任务没有被套入 malware/APT 专属章节
- [ ] uln 仅在漏洞任务启用；含概述/分析/防护骨架与 E/F/P；无未授权 PoC 武器化
- [ ] 无厂商原文粘贴、无 placeholder/TODO
- [ ] 导入表等硬门 Evidence 已进入静态/技术分析（若本任务做过二进制分析）

---

## 7. 来源登记

- Kaspersky Securelist, “Updated MATA attacks industrial companies in Eastern Europe”: <https://securelist.com/updated-mata-attacks-industrial-companies-in-eastern-europe/110829>（结构参考；访问日期：2026-08-11）
- 火绒安全公开技术文章入口：<https://www.huorong.cn/>（站点入口；访问日期：2026-08-11。具体文章 URL、标题和访问日期应在实际引用时登记）
- ATT&CK 技术编号仅作为规范化映射，必须由本次 Evidence 支撑；不得把外部报告中的 IOC 自动带入当前报告。

---

## 8. 非目标

- 不维护 Mandiant/CrowdStrike/奇安信等额外全文模板（结构已由双 flavor + 可选 thin overlay 覆盖常见需求）。
- 不把 `vuln` 升级为与 malware/apt 并列的默认全文 flavor。
- 不自动爬取厂商站点填报告。
- 不因 flavor 降低 Evidence 契约或授权范围。
