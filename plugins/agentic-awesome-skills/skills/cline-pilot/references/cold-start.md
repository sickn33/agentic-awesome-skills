# 冷启动初始化手册（新工程）

## 前置核：全局默认 Memory Bank 提示词（必须先于任何 memory bank 开启确认到位）
检查 → 引导 → 降级，三步：

**第一步检查（跨 OS 通用，首选）**：CLI 与 VSCode 插件共用 `~/.cline/data`（Windows 为 `%USERPROFILE%\.cline\data`），一处配置两端生效。一行判定：
```bash
# macOS / Linux
python3 -c "import json;d=json.load(open('$HOME/.cline/data/globalState.json'));print(d.get('globalClineRulesToggles'))"
# Windows (PowerShell)
python -c "import os,json;d=json.load(open(os.path.expanduser('~/.cline/data/globalState.json')));print(d.get('globalClineRulesToggles'))"
```
值为 `{".../memory-bank.md": true}` 即已配置（key 是各 OS 的实际绝对路径）；再 `head`/`Get-Content` 该文件确认是 memory-bank 提示词。命中且内容完整 → 直达分支二/三。

**全局规则目录的默认落点（按 OS 对照）**：
| OS | 插件默认全局 Rules 目录 | 旧式全局文件（legacy，仍兼容） | HOME 变量 |
|----|--------------------------|--------------------------------|-----------|
| macOS / Linux | `~/Documents/Cline/Rules/` | `~/.clinerules` | `$HOME` |
| Windows | `%USERPROFILE%\Documents\Cline\Rules\` | `%USERPROFILE%\.clinerules` | `%USERPROFILE%` |

检测顺序：先查注册表（上）；未命中再 `ls` 上述两个落点有无 memory-bank 提示词文件（有文件但 toggle 未开 = 配了没勾，引导用户打开）；都没有 = 未配置 → 第二步引导。

2. **引导**（未配置时）：推荐用户配到**全局**（跨工程生效）——Cline 设置→自定义指令/Rules，粘贴 `assets/global-memory-bank-prompt.md` 全文（面向英文用户/工程给 `global-memory-bank-prompt.en.md`）；文件落点对应上表 OS 行；给用户明确操作说明后再继续
3. **降级**（用户暂不配）：**注入模式**——把所选语言版提示词全文直接写进本次任务 prompt 的上下文，**然后再发 `active memory bank`**（顺序固定：先提示词、后激活）

- 提示词全文 = `assets/global-memory-bank-prompt.md`（中文）/ `global-memory-bank-prompt.en.md`（英文），逐字模板勿改语义
- 来源：用户博客 https://gongdear.com/articles/2026/09/04/1788492620184.html 最后部分“自定义指令（完整版）”

## 分支 A：全新工程（连代码都没有）
代码事实为零 → **规则内容只能来自用户**，按 Cline 最佳实践逐维度问齐后让 Cline 落盘。**不要替用户编任何一条**。

### 逐维度询问清单（一次一块，别一次性全抛）
1. **projectbrief**：这个项目是什么、给谁用、范围多大、目标是什么（一句话 + 3-5 个要点就够，别问八股）
2. **productContext**：解决什么问题、现在怎么解决的、期望怎么工作
3. **techContext**：技术栈选型、运行环境、部署边界、已知技术约束
4. **systemPatterns**：计划采用的架构模式、分层约定、关键中间件（用户没想好就标“待定”）
5. **开发偏好**：语言规范、命名、错误处理、测试要求、分支策略、提交信息格式
6. **activeContext / progress**：当前起点是什么、第一步打算做什么（通常 = 脚手架初始化）

### 交给 Cline 的任务书要点
- 先写全局提示词核（前置硬前提）
- 再建工程级 `.clinerules` + `memory-bank/`（六文件），**内容逐条来自上面的用户回答**，用户没答的标“待确认”，禁止填充想象中的规范
- 只建规则/记忆文件，不产业务代码；一次性汇报后止步

## 分支 B：存量代码工程
代码事实存在 → **规则以扫描代码为基准**，用户背景信息只做补全。

### 交给 Cline 的任务书要点
- 先写全局提示词核（前置硬前提）
- 全量扫描现有代码：架构/模块划分/技术栈/既有命名与错误处理/测试现状/构建与分支约定
- 依据代码事实落 `.clinerules` + `memory-bank/` 六文件；用户提供的偏好（背景、习惯、约束）覆盖同冲突项时以用户为准
- 代码里看不出来且用户没说的 → 标“待确认”
- 只改规则/记忆文件，**禁止顺手重构业务代码**；一次性汇报后止步

## 两分支共同收尾
1. 我按验收清单核对：六文件存在且非空、内容可溯（用户话或代码行）、无业务代码改动
2. 向用户汇报：建了什么／每条依据是什么／哪些“待确认”
3. **停下等用户审阅**（他会逐轮纠偏，要求 Cline 同步改 rules/memory）→ 确认后才进正常转达工作流
