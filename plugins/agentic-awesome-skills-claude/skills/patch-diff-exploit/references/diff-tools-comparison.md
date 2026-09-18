# 二进制差分工具对比

补丁差分的核心工具是二进制 diff 引擎。本文档对比当前主流工具的强项、安装、典型命令、输出解读，以及组合工作流。

---

## 工具总览

| 工具 | 作者/厂商 | 底座 | License | 强项 | 弱项 |
|------|---------|------|---------|------|------|
| **BinDiff** | Google (zynamics) | IDA Pro / Ghidra / Binary Ninja | 免费 | 业界标杆，函数级匹配最稳，GUI 视图清晰 | 需要 IDA 才能玩到极致 |
| **Diaphora** | Joxean Koret | IDA Pro | GPL | 老牌、活跃维护、SQLite 持久化、支持伪代码 diff | 重度依赖 IDA Pro，对超大二进制慢 |
| **ghidriff** | Clearbluejar | Ghidra headless | Apache 2.0 | 纯 CLI，CI 友好，输出 markdown，免费开源 | 准确度依赖 Ghidra 反编译 |
| **DeepDiff** (Karambit) | Karambit.AI | 自带 | 商业 | LLM 辅助、变量名重命名感知 | 商业授权 |
| **radiff2** | radare2 项目 | radare2 | LGPL | 全开源、嵌入 r2 工作流 | 函数匹配能力弱于 BinDiff |
| **patchdiff2** | tetrane | IDA | GPL | IDA 老插件，年代久 | 已基本被 BinDiff/Diaphora 取代 |

---

## BinDiff

### 安装

Linux:
```bash
wget https://github.com/google/bindiff/releases/latest/download/bindiff_8-amd64.deb
sudo dpkg -i bindiff_8-amd64.deb
```

Windows:
```powershell
# 从 https://github.com/google/bindiff/releases 下 .msi
msiexec /i bindiff_8.msi /quiet
# 自动注册到 IDA Pro 插件目录
```

### IDA 内使用

1. 在 IDA 里加载 unpatched 二进制，分析完，`File → Produce file → BinExport` 导出 `old.BinExport`
2. 加载 patched 二进制，同样导出 `new.BinExport`
3. `Edit → Plugins → BinDiff` → 选 new.BinExport 对比 → 输出 .BinDiff 数据库

### CLI 用法

```bash
# 直接两个二进制 diff（先用 binexport 提取）
bindiff old.exe new.exe

# 或显式给 BinExport
bindiff --primary=old.BinExport --secondary=new.BinExport \
        --output_dir=./bindiff_out/

# 输出: ./bindiff_out/old_vs_new.BinDiff (SQLite)
```

### 输出读法

打开 .BinDiff 文件后，关键列：
- `similarity` — 0.0 ~ 1.0，函数相似度
- `confidence` — 算法信心
- `algorithm` — 匹配算法 (name hash, function hash, MD index 等)

聚焦工作区：
- **similarity 1.0 + confidence 1.0** — 完全不变，跳过
- **similarity 0.0 (unmatched)** — 新增或重大重构，留意但通常是新功能
- **similarity 0.5 ~ 0.95** — 重点目标，多半是修了 bug
- **similarity 0.95 ~ 0.99** — 微调，可能是 mitigation 或 cleanup

GUI 内：双击函数 → 看 graph view 的 basic block 着色：
- 灰：完全相同
- 黄：相似但有指令差异
- 红：新增或删除
- 蓝：仅 patched 有的 block — **重点看这种**

---

## Diaphora

### 安装

```bash
cd ~/idapro/plugins/
git clone https://github.com/joxeankoret/diaphora.git
# 在 IDA 里 File → Script file → ~/idapro/plugins/diaphora/diaphora.py
```

### 工作流

1. IDA 打开 unpatched → 跑 `diaphora.py` → 选 "Export current database" → 保存 `old.sqlite`
2. IDA 打开 patched → 跑 `diaphora.py` → 选 "Diff against another database" → 选 `old.sqlite` → 输出对比报告

### 输出读法

Diaphora 输出多个 tab：
- **Best matches** — 高置信度匹配，跳过
- **Partial matches** — 部分匹配，**重点看这里**
- **Unreliable matches** — 算法不确定，可能误报
- **Unmatched in primary / secondary** — 单边出现的函数

每个函数支持 side-by-side 伪代码 diff（IDA 反编译输出）。

### 关键 SQL 查询

Diaphora 用 SQLite 存数据，可写 SQL 找目标：

```sql
-- 找出 diff 比例在中等区间的函数
SELECT f1.name, f2.name, ratio
  FROM results
 WHERE ratio BETWEEN 0.5 AND 0.9
 ORDER BY ratio DESC;
```

---

## ghidriff

### 安装

```bash
pip install ghidriff
# ghidriff 会自动下载 Ghidra 到 ~/.ghidra/ (首次运行需要联网)
# 或指定 Ghidra 路径:
export GHIDRA_INSTALL_DIR=/opt/ghidra_11.0
```

### 基础用法

```bash
# 最小命令
ghidriff old.so new.so

# 指定输出目录 + 引擎
ghidriff old.exe new.exe \
  -o ./diff_out/ \
  --engine VersionTrackingDiff \
  --threaded \
  --max-section-funcs-analyze 5000

# 看所有可用引擎
ghidriff --list-engines
# 常见: VersionTrackingDiff (默认), SimpleDiff, StructualGraphDiff
```

### 输出格式

ghidriff 默认输出三种产物：
1. **Markdown 报告** — 人类可读，包含 added / deleted / modified 函数清单 + 伪代码 diff 块
2. **JSON 报告** — 程序化消费
3. **GhidraProject** — 可以打开继续手工分析

报告关键章节：
- `## Summary` — 总体统计 (匹配率)
- `## Strings Diff` — 字符串变化（信息泄漏类 CVE 经常字符串变了）
- `## Functions` → `### Modified` — 重点
- 每个函数下: `before` / `after` 伪代码 + unified diff

### 推荐参数

```bash
# Windows 内核大文件：限制单 section 分析数量，避免 OOM
ghidriff ntoskrnl_old.exe ntoskrnl_new.exe \
  -o /tmp/nt_diff/ \
  --max-section-funcs-analyze 8000 \
  --max-section-funcs-full 800 \
  --threaded

# 大量小函数（驱动）：开启所有 diff
ghidriff afd_old.sys afd_new.sys -o /tmp/afd_diff/ --side-by-side
```

### 配 LLM 自动总结

ghidriff 支持插件式输出，可以喂给 LLM 自动生成根因分析（见 root-cause-and-poc.md 的 LLM 章节）。

```bash
# 输出 JSON 给下游 LLM 脚本消费
ghidriff old new -o out/ --json-format
python my-llm-summarizer.py out/diff.json
```

---

## radiff2

### 安装

```bash
# 通常随 radare2 安装
sudo apt install radare2
# 或源码
git clone https://github.com/radareorg/radare2 && radare2/sys/install.sh
```

### 用法

```bash
# 字节级 diff
radiff2 old.bin new.bin

# 函数级 diff (需要先各自 r2 分析)
radiff2 -A -C old.bin new.bin   # -A 分析, -C 函数级

# 输出 graph (Graphviz)
radiff2 -g main old new | dot -Tpng -o diff.png

# JSON 输出
radiff2 -j -A -C old new > diff.json
```

适合：与 radare2 工作流深度集成的场景，或者 BinDiff/Ghidra 跑不动的小文件。

---

## DeepDiff (Karambit.AI, 商业)

特点：
- 不依赖 IDA / Ghidra
- 自带反编译器
- 用 ML 模型做函数匹配，对 inline / rename / 控制流变化更鲁棒
- 自动生成 root cause 假设

适合资金充足的团队批量处理 Patch Tuesday。本文档不展开，因需要商业授权。

---

## 工具组合工作流

### 推荐组合（按场景）

```text
场景 A: 有 IDA Pro 授权，质量优先
    BinDiff (主) + Diaphora (副验证) + LLM 辅助根因

场景 B: 无 IDA，纯开源
    ghidriff (主) + LLM 辅助根因

场景 C: 批量 Patch Tuesday 流水线
    ghidriff CLI + JSON → 脚本筛选 → 人工 review top N

场景 D: 小型驱动 / 嵌入式 firmware
    radiff2 / ghidriff 都行
```

### 粗筛 → 精看 流程

```text
Step 1 (粗筛): 跑 ghidriff，过滤
   - 整体 matched 比例 < 90% → 警惕，多半对齐失败 (可能是不同编译器、不同混淆)
   - matched 比例 > 99% → 补丁很微小，可能只动 1-2 个函数
   - 列出 Modified 函数清单，按变更行数排序

Step 2 (优先级): 按以下加权
   - 函数名含敏感词 (Ioctl / DispatchIoCtrl / Probe / Copy / Length)  +5
   - 出现在已知攻击面驱动 (afd/clfs/win32k)                          +5
   - 变更涉及 if 边界 / lock / refcount                                +3
   - 仅做字符串 / 日志变更                                              -3

Step 3 (精看): 把 top 10 函数喂给 BinDiff GUI 或 IDA 手工，
   或贴 before/after 伪代码给 LLM 反推 bug class
```

---

## 常见坑

- **对齐失败**：matched 比例 < 90% 时不要继续。先确认两个二进制是同一编译器版本、同一架构、同一优化等级。常见原因：跨大版本编译器、PGO/LTO 不同、ASLR rebase 没对齐
- **inline 函数把 diff 撑大**：编译器决定 inline 的函数变了会让父函数大范围变红，但根本没改逻辑。要看真实控制流分支
- **switch table 重排**：编译器可能重排 case，看着像新增 block，其实只是顺序变化
- **Profile-Guided Optimization (PGO) 抖动**：连续两个版本的二进制即使源码一字不改也可能 layout 不同
- **stripped Linux 内核**：没 debuginfo 时所有函数名都是 `FUN_xxxx`，必须先吃 BTF / kallsyms 或用 binary-diff 迁移符号
