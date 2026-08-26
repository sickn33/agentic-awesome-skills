# 字典 / 凭据 / 指纹合集

> 区别于国际化的 H1 字典——本目录是**国产 SRC 战场**专用：CN 厂商默认凭据、CN 中间件 / OA / CMS 指纹与路径、CN 高频参数。
> 与 `playbooks/`、`industry/` 的关系：playbook 教方法，industry 教定向，dictionaries/ 给"开包即用"的弹药。

---

## 文件目录

| 文件 | 用途 | 适用场景 |
|------|------|---------|
| `default-credentials-cn.md` | 国产服务 / OA / CMS / 网络设备的默认凭据 + 路径 | 弱口令 / 默认配置探测 |
| `chinese-srcfingerprints.md` | 国产组件指纹 + 默认路径 + 高频参数字典 | 资产识别 / fuzzing / IDOR 参数枚举 |

---

## 与方法论 / playbook 的对应

```
playbooks/unauth-access.md   §2  →  本目录补充"国产中间件 / OA / 网管"维度
playbooks/info-disclosure.md      →  本目录补充"国产备份路径 / 日志路径"
playbooks/sqli.md                 →  本目录补充"国产高频注入参数"
playbooks/file-upload.md          →  本目录补充"国产编辑器 / OA 上传路径"
industry/banking-finance.md       →  本目录的金融组件指纹（致远 / 用友 / 金蝶）
industry/telecom-isp.md           →  本目录的电信组件指纹（U2000 / OTNM2000 / SP 平台）
```

---

## 使用边界

1. **限速**：default-credentials 用于爆破时，单目标 ≤ 4 并发，≤ 50 次/小时。SRC 平台多数对"高频爆破"零容忍。
2. **证据**：命中默认凭据后，**仅截图登录界面 + 看到核心功能名称**即停，不进入业务操作。
3. **数据**：发现指纹 ≠ 发现漏洞——指纹只是入口，仍需走 playbook 完整证明利用 + 业务影响。
4. **更新**：本目录的指纹基于 2010–2016 真实案例。某些组件（如 ActiveX、IE 控件、Flash 编辑器）已退役，不再可作主战场——仅在政企 / 老国企 / 老 OA 仍有残余。

---

## 字典扩展原则

- **不抄国际字典**：H1 / SecLists 已经覆盖。本目录只补 CN 战场缺口。
- **统计驱动**：每个条目尽量带"案例数"或"出现频率"。
- **可执行**：每个条目要么是路径、要么是凭据、要么是参数——拿来直接用。
- **不冗长**：不写解释、不写故事，只列表。
