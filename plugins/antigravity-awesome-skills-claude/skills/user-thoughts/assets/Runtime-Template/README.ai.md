# .ustht/ 运行时目录

> 本目录由 user-thoughts.SKILL 在首次使用时自动创建。用于存储用户想法的完整生命周期数据。

---

## 目录说明

| 目录 | 用途 |
|------|------|
| `raw/` | 用户原始发言，按日期分片存储。即时计划模式下自动写入，sortin 处理后标记 `<!-- processed -->` |
| `ignored/` | 被用户主动忽略的发言。通过 `ignore --last`、`ignore <想法描述>`、`ignore start/end` 区间移入 |
| `mdbase/` | 整理后的用户想法库，按维度组织。由 sortin（追加）或 resort（优化结构）维护 |
| `export/` | 从 mdbase 导出的内容，用于跨项目复用 |

---

## 状态文件

`define.ini` 存储 SKILL 运行状态：

- `SKILL_STATUS`：技能启用状态（on/off）
- `INSTANT_STATUS`：即时计划启用状态（on/off）
- `LAST_SORTIN`：上次 sortin 时间戳
