---
name: ida-reverse
description: "Reverse engineer binaries with IDA Pro: decompilation, disassembly, data-flow tracking, cross-references, and IDA MCP automation for deep static analysis of PE/ELF/Mach-O targets."
risk: safe
source: "https://github.com/zhaoxuya520/reverse-skill"
source_repo: "zhaoxuya520/reverse-skill"
source_type: community
date_added: "2026-08-25"
license: "MIT"
license_source: "https://github.com/zhaoxuya520/reverse-skill/blob/main/LICENSE"
---
# IDA Pro 逆向分析技能
## When to Use

- Deep static analysis of a compiled target where IDA is available.
- Tracking data flow or cross-references through large binaries.


## 已知问题与反思（必读）

### 踩过的坑

1. **`idb_open`（旧名 `idalib_open`）不要直接靠部分 AI 客户端 MCP 调用**
   - 部分代码 AI 客户端 的 MCP 客户端对 open 类工具的 output schema 校验有 BUG
   - 报错：`Structured content does not match the tool's output schema`
   - **解决办法**：使用 `scripts/open.ps1` 脚本通过 HTTP API 直调，绕过 MCP 校验层
   - 当前 ida-pro-mcp 2.x 工具名为 `idb_open` / `idb_list` / `idb_save`（不再是 `idalib_*`）
   - 文件打开后返回 `session_id`（database），后续工具调用需带该 session

2. **`C:\Windows\System32\` 文件无权限打开**
   - idalib 无法直接读取 System32 目录下的文件
   - **解决办法**：`open.ps1` 自动检测并复制到 `临时目录` 目录后再打开

3. **启动服务器命令阻塞对话**
   - `idalib-mcp` 启动后会持续输出 INFO 日志到控制台
   - **解决办法**：使用 `scripts/start.ps1`（`-WindowStyle Hidden` 后台静默启动）
   - 脚本会等待服务就绪后自动退出，不阻塞对话

4. **MCP 服务器名不能用横线**
   - 之前用 `ida-pro-mcp` 作为服务器名，可能引起工具注册问题
   - **当前配置**：服务器名 `idapro`，工具前缀 `idapro_*`

5. **Remote HTTP vs Local Stdio**
   - `type:"local"`（stdio）模式：`idalib_open` 同样有 schema 校验问题
   - `type:"remote"`（HTTP）模式：可以先用脚本直开文件，再用 MCP 工具
   - **当前方案**：Remote HTTP 模式

6. **PR #389 修复了部分 schema 问题**
   - 作者 mrexodia 在 issue #388 后通过 PR #389 合并了修复
   - 修复了 HTTP 模式下的 structuredContent schema，但 部分代码 AI 客户端 侧校验仍有问题
   - 已安装最新 `main` 分支版本

7. **idalib 超时留下孤儿 worker 进程锁文件**
   - 第一次 `open.ps1` 超时后，idalib 的 python worker 子进程可能变成孤儿，咬着 `.id0`/`.id1`/`.nam` 不放
   - 后续任何工具或手动拖入 IDA GUI 都会报"权限不足"
   - **禁止** `taskkill /F /T` 杀进程树——`/T` 会把 GUI `ida.exe` 子进程一起干掉
   - **解决办法**：`start.ps1` 只在端口无人监听、或 `tools/list` 快速返回但缺 `py_eval`（旧 supervisor）时替换 managed supervisor；RPC 超时且 13337 仍在听视为忙，不杀
   - **兜底**：`open.ps1` 检测到旧库被锁自动复制到 Temp 并加 GUID 前缀

8. **带自动分析打开看起来像卡死**
   - `idalib_open(run_auto_analysis=true)` 可能长时间不回包，但后端实际上仍在继续打开和分析
   - 之前用户侧看到的是“PowerShell 一直无输出”，容易误判成脚本卡死
   - **当前解决办法**：`open.ps1` 新增 `-TimeoutSeconds`，并改为后台请求 + 前台轮询 + 定时进度输出
   - 轮询到会话已就绪时会提前返回 `OK:文件名:session_id`，超时则返回 `ERR:open_timeout_xxs`

9. **HTTP MCP 会在登录后静默退出**
   - Cursor/Claude 的 `type: http` 不会代为拉起进程；旧计划任务只在登录时跑一次
   - `pythonw` 无控制台，崩溃时 Application 日志也是空的
   - **解决办法**：`start.ps1` 默认健康则复用；`watchdog.ps1` 每分钟巡检；日志在 `%LOCALAPPDATA%\reverse-skill\ida-mcp\`
   - 安装：`scripts/install-autostart.ps1`。Cursor 若启动时端口还没起来，仍需在 MCP 面板手动刷新一次

### 工作流程原则

| 步骤 | 做什么 | 用什么 |
|------|--------|--------|
| 1 | 确保 HTTP 服务器在运行 | `scripts/start.ps1`（无参数） |
| 2 | 打开目标二进制文件 | `scripts/open.ps1 -Path "xxx.exe"` |
| 3 | 使用 MCP 分析工具 | 直接调用 `idapro_*` / HTTP tools（约 65 个，视版本而定） |
| 4 | 分析完毕 | 工具自动可用 |

## 脚本资源

### start.ps1 — 启动 MCP HTTP 服务器

路径：`scripts/start.ps1`

- 自动解析 `IDADIR`（环境变量 / 便携版桌面路径 / 常见安装路径）
- 优先用 IDA 自带 `Python314\python.exe -m ida_pro_mcp.idalib_supervisor`
- 默认先探测 `http://127.0.0.1:13337/mcp`，健康则输出 `OK:<n>:reuse` 并退出
- 13337 在听但 `tools/list` 超时 → `WARN:busy` / `OK:busy:reuse`，**不杀**（supervisor 单线程，开库时无法回包）
- 仅在端口无人监听、或快速返回且缺 `py_eval` 时替换 managed supervisor；**永不杀 `ida.exe`，不用 `taskkill /T`**
- GUI 占用 13337 时输出 `WARN:gui_busy` 并退出，不另起 supervisor
- 成功输出 `OK:<工具数>`（当前约 66），失败输出 `ERR:timeout`
- supervisor 日志：`%LOCALAPPDATA%\reverse-skill\ida-mcp\supervisor.log`
- 服务器在后台运行，不阻塞对话

**调用方式**：
```
powershell -File "<skill-root>\ida-reverse\scripts\start.ps1"
```

### watchdog.ps1 / install-autostart.ps1 — 保活

- `watchdog.ps1`：探测 13337，健康则 `OK:<n>:reuse`，挂了才调用 `start.ps1`
- `install-autostart.ps1`：注册计划任务 `reverse-skill-ida-mcp`（登录 + 每分钟）
- 日志：`%LOCALAPPDATA%\reverse-skill\ida-mcp\watchdog.log`

### open.ps1 — 打开二进制文件

路径：`scripts/open.ps1`

- 通过 HTTP API 直调 `idb_open`，绕过 MCP schema 校验
- 自动检测 System32 路径并复制到临时目录
- 自动清理同名旧数据库文件（`.id0`/`.id1`/`.nam`/`.til`/`.i64`）
- 旧库被锁时自动降级：复制到 Temp 加 GUID 前缀后打开，不报错
- 将打开请求放到后台执行，避免长时间同步等待导致脚本无响应
- 支持 `-TimeoutSeconds`，超时后返回 `ERR:open_timeout_xxs`，不会无限卡住
- 每隔 10 秒输出一次 `INFO:opening:已用时/超时秒数`，便于判断仍在分析中
- 成功输出 `OK:文件名:session_id`，降级时加 `(temp copy)` 标记
- 失败时自动重试走 Temp 副本

**调用方式**：
```
powershell -File "<skill-root>\ida-reverse\scripts\open.ps1" -Path "C:\path\to\file.exe"
```

**可选参数**：
```
# 指定 SessionId
powershell -File "scripts\open.ps1" -Path "file.exe" -SessionId "my_session"

# 跳过自动分析（大文件推荐）
powershell -File "scripts\open.ps1" -Path "large.exe" -NoAutoAnalysis

# 设置超时，避免带自动分析时长时间无返回
powershell -File "scripts\open.ps1" -Path "file.exe" -TimeoutSeconds 600
```

**输出约定**：
```
# 分析进行中（每 10 秒输出一次）
INFO:opening:11/600s

# 成功打开
OK:sample.exe:abcd1234

# 成功打开，但因锁文件降级到 Temp 副本
OK:1234abcd-sample.exe:abcd1234 (temp copy)

# 达到超时上限
ERR:open_timeout_600s
```

**实测说明**：
- `Snipaste.exe` 带自动分析实测约 `324s` 才返回成功，属于“分析很久”而不是“脚本死锁”
- 因此遇到 GUI 程序或较复杂样本时，建议优先显式设置 `-TimeoutSeconds 600`

## 核心工具列表

### 概况分析（第一步）
- `idapro_survey_binary(detail_level="minimal")` — 快速概况：函数数、字符串、段、入口点、导入分类（加密/网络/文件IO）
- `idapro_list_funcs(queries)` — 列出函数（分页、按名称过滤）
- `idapro_list_globals(queries)` — 列出全局变量
- `idapro_entity_query(kind, filter)` — 统一查询：functions/globals/imports/strings/names

### 反编译与反汇编
- `idapro_decompile(addr)` — 反编译为伪代码
- `idapro_disasm(addr, max_instructions=N)` — 反汇编
- `idapro_analyze_function(addr, include_asm=false)` — 综合分析（伪代码+字符串+常量+调用者+被调用者+块）
- `idapro_func_profile(queries)` — 函数概要指标

### 交叉引用与数据流
- `idapro_xrefs_to(addrs)` — 查谁引用目标地址
- `idapro_xref_query(addr, direction)` — 高级 xref 查询（方向/类型过滤）
- `idapro_callees(addrs)` — 子函数列表
- `idapro_callgraph(roots, max_depth)` — 调用图
- `idapro_trace_data_flow(addr, direction, max_depth)` — 数据流追踪（forward/backward）

### 搜索
- `idapro_find_regex(pattern, limit)` — 正则搜字符串
- `idapro_search_text(pattern)` — 在反汇编列表中搜文本
- `idapro_find_bytes(patterns, limit)` — 字节模式搜索（支持 ?? 通配符）
- `idapro_find(type, targets)` — 高级搜索（立即数/字符串/引用）

### 内存与数据
- `idapro_get_bytes(addrs)` — 读原始字节
- `idapro_get_string(addrs)` — 读字符串
- `idapro_get_int(queries)` — 读整数值
- `idapro_get_global_value(queries)` — 读全局变量值
- `idapro_read_struct(queries)` — 读结构体字段值
- `idapro_search_structs(filter)` — 搜索结构体

### 修改操作
- `idapro_set_comments(items)` — 添加注释（反汇编+反编译双向同步）
- `idapro_append_comments(items)` — 追加注释
- `idapro_rename(batch)` — 批量重命名（函数/全局/局部/栈变量）
- `idapro_patch_asm(items)` — Patch 汇编指令
- `idapro_patch(patches)` — Patch 字节
- `idapro_define_func(items)` — 定义函数
- `idapro_undefine(items)` — 取消定义
- `idapro_define_code(items)` — 将字节转为代码

### 类型系统
- `idapro_declare_type(decls)` — 声明 C 结构体/枚举/联合体
- `idapro_set_type(edits)` — 应用类型到函数/全局/局部
- `idapro_infer_types(addrs)` — 推断类型
- `idapro_type_query(queries)` — 查询已声明类型
- `idapro_type_inspect(queries)` — 查看类型详情

### 栈帧
- `idapro_stack_frame(addrs)` — 查看栈帧变量
- `idapro_declare_stack(items)` — 声明栈变量
- `idapro_delete_stack(items)` — 删除栈变量

### 签名
- `idapro_make_signature(addrs)` — 为地址生成唯一字节签名
- `idapro_make_signature_for_function(addrs)` — 为函数生成签名
- `idapro_find_xref_signatures(addrs)` — 为引用地址的代码生成签名

### 调试器（需要 ?ext=dbg）
- `idapro_open_file(file_path)` — 在 GUI IDA 实例中打开文件
- 调试器工具默认隐藏，可通过 URL 参数 `?ext=dbg` 启用

### 会话管理（ida-pro-mcp 2.x）
- `idapro_idb_open` / HTTP `idb_open` — ⚠️ 建议用 `open.ps1` 打开
- `idapro_idb_list` / HTTP `idb_list` — 列出所有 session
- `idapro_idb_save` / HTTP `idb_save` — 保存数据库
- 多数分析工具需要 `database=<session_id>` 参数（open.ps1 输出的 session）

### 其他
- `idapro_int_convert(inputs)` — 进制转换（**必须用这个，不要自己算进制！**）
- `idapro_export_funcs(addrs, format)` — 导出函数（json/c_header/prototypes）
- `idapro_py_eval(code)` — 在 IDA 上下文执行 Python
- `idapro_server_health()` — 服务器健康检查
- `idapro_server_warmup()` — 预热子系统（字符串缓存、Hex-Rays 等）

## 逆向分析完整工作流

### Step 1: 启动服务器

**路径 A — Headless idalib（需要有效 license）**
```
powershell -File "scripts/start.ps1"
```
输出 `OK:<工具数>`（当前约 65）表示就绪。

**路径 B — GUI + 插件（idalib license 失败或需要交互分析时）**
```
powershell -File "scripts/start-gui.ps1" -Path "C:\目标.exe"
```
或双击便携版 `Launch-IDA-Pro.cmd`，在 IDA 中打开样本。

确认 Output 窗口出现 `[MCP] ... port=13337` 后，MCP 工具即可用。

通用对接步骤见 `LOCAL-SETUP.md`。

### Step 2: 打开文件

Headless：
```
powershell -File "scripts/open.ps1" -Path "C:\目标.exe" -TimeoutSeconds 600
```
输出 `OK:文件名:session_id` 表示成功（后带 `(temp copy)` 表示自动降级到临时副本）。

若出现 `ERR:idalib_license:...`，改用路径 B（GUI 模式），不要反复重试 open.ps1。

GUI 模式：在 IDA 里直接 Open 样本即可，无需 open.ps1。

### Step 3: 全局概览（含导入表硬门）
```
idapro_survey_binary(detail_level="minimal")
```
关注：
- 架构（x86/x64/ARM）
- 入口点（main/WinMain/DllMain）
- 有趣的字符串（URL、路径、错误消息）
- **导入分类（MUST）**：加密函数 / 网络 API / 文件操作 / 进程注入 / 注册表 — 必须落成 Evidence（建议 id：`E-imports`），可用 `idapro_entity_query(kind="imports")` 或 survey 输出中的 imports 段
- **DLL/SYS**：导出表与导入表并列（Evidence `E-exports`）
- **.NET**：无传统 IAT 时用模块/元数据/托管引用摘要作为等价锚点写入 E-imports 语义槽
- **干净导入表**：注明动态加载嫌疑，推动动态 API 断点验证
- 热门函数（高 xref 计数的函数通常是关键逻辑）

**硬门禁**：未将 imports 视图/分类摘要（或合法等价锚点）写入 Evidence 前，MUST NOT 进入 Step 4 深挖结论，MUST NOT 声称 survey 完成。导入表为空或查询失败时仍 MUST 记录失败现象。加壳 IAT 修复失败时 MUST 记 `E-iat-repair-fail` 并转动态调试抓 API，禁止静态死磕。用户要求重做导入表/IAT 检查时 MUST 重做被点名步骤（阻塞时可行性门闩：说明+确认；强制则标 quality=unreadable），禁止改换无关步骤。

### Step 4: 深入关键函数
```
idapro_analyze_function(addr="关键函数名")
```
或：
```
idapro_decompile(addr="函数名")
idapro_disasm(addr="函数名", max_instructions=50)
```

### Step 5: 数据流和交叉引用
```
idapro_xrefs_to(addrs="关键地址/字符串")
idapro_callgraph(roots=["关键函数"], max_depth=3)
idapro_trace_data_flow(addr="关键地址", direction="backward", max_depth=5)
```

### Step 6: 记录和优化
```
idapro_set_comments(items=[{"addr": "0x140001000", "comment": "你的理解"}])
idapro_rename(batch={"func": [{"addr": "函数地址", "name": "有意义的名字"}]})
```

### Step 7: 输出报告
分析完成后，生成 `report.md` 记录发现和步骤。

## Prompt 工程准则

1. **不要手动算进制** — 任何时候需要转换数字，用 `idapro_int_convert`
2. **先 survey 后深入** — 先看概况再针对性分析
3. **持续加注释和重命名** — 分析过程中不断更新函数名和变量名，提升后续分析的准确性
4. **跟踪交叉引用** — 发现有趣的数据/字符串，用 `xrefs_to` 看谁引用了它
5. **遇到混淆代码** — 先做字符串解密、导入哈希去除、控制流平坦化去除等预处理
6. **C++ STL 代码** — 用 FLIRT/Lumina 识别库函数后，再分析业务逻辑
7. **不要暴力破解** — 分析应从反汇编中推导解决方案，用简单 Python 辅助计算
8. **遇到 "No database bound"** — 还没有打开任何二进制文件，先执行 `open.ps1`
9. **遇到 "Failed to open database"** — 可能是旧数据库文件被锁，`open.ps1` 会自动降级到 Temp 副本（输出含 `(temp copy)` 标记）
10. **带自动分析打开 GUI/复杂样本时** — 默认加 `-TimeoutSeconds 600`，不要把长时间 `INFO:opening:...` 误判成脚本卡死

---

## 路由上下文

**上游入口**: `skills/SKILL.md`（总控）、`routing.md`
**上游备选**: `radare2/`（如果不想开 IDA，可以先 r2 快速侦察）
**下游出口**:
- 需 Frida 动态验证 → `reverse-engineering/tools-dynamic.md`
- 需符号执行/angr → `reverse-engineering/tools-dynamic.md`
- 需通用逆向方法论 → `reverse-engineering/SKILL.md`

**同级关联模块**: `radare2/`（IDA 不可用时替代方案）

---

## 按需自举（On-Demand Bootstrap）

本 skill 的入口脚本已接入统一自举系统。

### 自动化能力边界

| 工具 | 可自动安装 | 安装方式 | 说明 |
|------|-----------|---------|------|
| idalib-mcp | ✓ | pip install (from GitHub) | `start.ps1` 缺失时自动安装 |
| IDA Pro 本体 | ✗ | 商业软件，需手动安装 | 设置 `IDADIR` 环境变量指向安装目录 |

### 安装步骤（已验证）

```cmd
# 1. 设置 IDA 路径（替换为你的实际 IDA 安装目录）
setx IDADIR "<你的IDA安装目录>"

# 2. 从 GitHub 安装 ida-pro-mcp（PyPI 上的 ida-mcp 是另一个项目，不要装错！）
pip install git+https://github.com/mrexodia/ida-pro-mcp.git

# 3. 安装 IDA 插件（选择 Streamable HTTP + Global + 全选客户端）
ida-pro-mcp --install

# 4. 重启 IDA Pro，打开目标文件
# 插件自动监听 127.0.0.1:13337

# 5. 验证
ida-pro-mcp --config
```

> ⚠️ **注意**：PyPI 上的 `ida-mcp` 包（作者 jtsylve）是另一个项目，不是我们需要的。
> 必须从 GitHub 安装 `mrexodia/ida-pro-mcp`。

### 自举触发点

- `scripts/start.ps1`：缺 `idalib-mcp` 时自动调用 `bootstrap-reverse.ps1`
- MCP 注册：bootstrap 会自动把 `idapro` 写入 Claude MCP 配置

### 前置条件

- IDA Pro 已安装且 `IDADIR` 环境变量已设置（或脚本内默认路径正确）
- 推荐使用 IDA 自带 Python314 中的 `ida-pro-mcp`（便携版已内置）
- 常见本机配置：
  - User env `IDADIR` → IDA 安装目录（含 `ida.exe`）
  - 可选 `~\Tools\bin\idalib-mcp.cmd` / `ida-pro-mcp.cmd` 包装器
  - 客户端 MCP 服务器名只留 `idapro` → `http://127.0.0.1:13337/mcp`


## 任务完成自检（声称完成前 MUST 通过）

- [ ] 我是否执行了工作流中的每一步（而不是只阅读）？
- [ ] survey/imports 是否已写入 Evidence（E-imports 或等价）？DLL/SYS 是否含 E-exports？IAT 失败是否记 E-iat-repair-fail？
- [ ] 用户若要求重做导入表/IAT，是否重做了同一步？
- [ ] 我是否基于 `tool-index` 使用了真实工具路径？
- [ ] 我是否产出了可复现证据（命令/脚本/截图/报告）？
- [ ] 我是否完成并回写了 RULES 要求的 Checklist 项？

## Limitations

- Commercial license required; MCP automation adds setup overhead.
- Heavily obfuscated targets still demand manual deobfuscation work.

> Adapted from [zhaoxuya520/reverse-skill](https://github.com/zhaoxuya520/reverse-skill) (MIT).
