# IDA ↔ reverse-skill 对接（可移植）

本页是通用步骤，不含某台机器的绝对路径。本机就绪报告留在仓库根目录的 `LOCAL-READINESS.md`（已 gitignore）。

## 目标形态

| 项 | 约定 |
|----|------|
| IDA 安装目录 | 环境变量 `IDADIR`（目录内有 `ida.exe` 或 `ida.dll`） |
| HTTP MCP | `http://127.0.0.1:13337/mcp` |
| 客户端服务器名 | 只留 **`idapro`**（不要同时注册 `ida-pro-mcp`） |
| 启动 | `scripts/start.ps1`（`--unsafe`，无 `?ext=dbg`） |
| 开库 | 大文件优先 `scripts/open.ps1`，不要经部分客户端直调 `idb_open` |

两个 MCP 名字指向同一 13337 会把工具注册两遍，并和 idalib worker 抢端口。

## 安装

```powershell
setx IDADIR "<你的 IDA 安装目录>"

# 必须用 mrexodia/ida-pro-mcp，不要装 PyPI 的 ida-mcp
python -m pip install "git+https://github.com/mrexodia/ida-pro-mcp.git"

# 激活 idalib（路径按本机 IDA 调整）
python "<IDADIR>\idalib\python\py-activate-idalib.py" -d "<IDADIR>"

# 装插件 + 客户端配置
python -m ida_pro_mcp --install --transport streamable-http --scope global
```

## 启动与保活

`type: http` 的 MCP 条目不会代为拉起进程。13337 没监听时，客户端全部报 error。

| 脚本 | 作用 |
|------|------|
| `scripts/start.ps1` | 健康则 `OK:<n>:reuse`；端口在听但 RPC 超时视为忙，不杀；只在无人监听或缺 `py_eval` 时替换 managed supervisor；永不杀 `ida.exe` |
| `scripts/watchdog.ps1` | 每分钟巡检；忙/健康则 reuse；只有 down/stale 才调 `start.ps1` |
| `scripts/install-autostart.ps1` | 注册计划任务 `reverse-skill-ida-mcp`（登录 + 每分钟） |
| `scripts/start-gui.ps1` | idalib license 失败时开 GUI 插件 |
| `scripts/open.ps1` | HTTP 直调 `idb_open`，绕过部分客户端 schema 校验 |

日志：`%LOCALAPPDATA%\reverse-skill\ida-mcp\supervisor.log` 与 `watchdog.log`。

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File "skills\ida-reverse\scripts\start.ps1"
powershell -NoProfile -ExecutionPolicy Bypass -File "skills\ida-reverse\scripts\open.ps1" -Path "C:\path\to\target.exe" -TimeoutSeconds 600
powershell -NoProfile -ExecutionPolicy Bypass -File "skills\ida-reverse\scripts\install-autostart.ps1"
```

GUI 占用 13337 但一时没回包时，`start.ps1` 输出 `WARN:gui_busy` 并退出，避免把正在分析的 IDA 干掉。

## 客户端

全部指向 Streamable HTTP：`http://127.0.0.1:13337/mcp`，服务器名 `idapro`。

改配置后必须新开会话。Cursor 在启动时若端口未监听，事后把服务拉起来也**不会自动重连**，需要在 MCP 面板手动刷新。

## 已知注意点

1. System32 文件：`open.ps1` 会复制到临时路径（输出带 `(temp copy)`）
2. `idb_open` 勿经部分客户端 MCP 直调
3. `start.ps1` 优先 `python -m ida_pro_mcp.idalib_supervisor`，比 `.cmd` 包装更稳
4. 正式安装与桌面便携包并存时，以 `IDADIR` 为准
5. 不要加 `?ext=dbg`（默认不暴露调试器工具）
