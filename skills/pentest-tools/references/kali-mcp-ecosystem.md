# Kali Linux MCP 生态系统（2026 年）

> 来源：多个 GitHub 项目 + Kali 官方仓库（2025-2026）
> 适用场景：在 Kali 上通过 MCP 协议让 AI agent 直接调用安全工具

## 概述

MCP（Model Context Protocol）已成为 AI agent 调用安全工具的标准协议。Kali Linux 从 2025.4 开始官方收录 MCP 工具，2026.1 进一步扩展。以下是当前生态中最有价值的 MCP server。

## Kali 官方收录的 MCP 工具

### 1. mcp-kali-server（官方推荐）

- **包名**：`mcp-kali-server`
- **安装**：`apt install mcp-kali-server`
- **来源**：[Wh0am123/MCP-Kali-Server](https://github.com/Wh0am123/MCP-Kali-Server)
- **功能**：轻量 API 桥接，连接 MCP 客户端到 Kali 终端
- **能力**：运行 nmap、nxc、curl、wget、gobuster 等任意终端命令
- **用途**：AI 辅助渗透测试、CTF 解题、HTB/THM 靶机
- **启动**：
  ```bash
  kali-server-mcp --port 5000    # 启动 API server
  mcp-server --server http://localhost:5000  # 连接 MCP 客户端
  ```

### 2. MetasploitMCP

- **包名**：`metasploitmcp`
- **安装**：`apt install metasploitmcp`
- **来源**：[GH05TCREW/MetasploitMCP](https://github.com/GH05TCREW/MetasploitMCP)
- **功能**：Metasploit Framework 的 MCP 接口
- **传输模式**：HTTP（默认 8085）或 stdio
- **启动**：
  ```bash
  metasploitmcp --transport stdio           # stdio 模式（推荐）
  metasploitmcp --transport http --port 8085  # HTTP 模式
  ```

### 3. HexStrike AI

- **包名**：`hexstrike-ai`
- **安装**：`apt install hexstrike-ai`
- **来源**：[0x4m4/hexstrike-ai](https://github.com/0x4m4/hexstrike-ai)
- **功能**：150+ 安全工具通过 MCP 暴露给 AI agent
- **特点**：多 agent 架构，自动化渗透测试、漏洞发现、Bug Bounty

## 社区 MCP Server（非官方但高质量）

### 4. Pentest Swarm AI

- **安装**：`go install github.com/Armur-Ai/Pentest-Swarm-AI/cmd/pentestswarm@v0.1.0`
- **来源**：[Armur-Ai/Pentest-Swarm-AI](https://github.com/Armur-Ai/Pentest-Swarm-AI)
- **功能**：群体智能渗透框架，stigmergic blackboard 协调多 agent
- **MCP 模式**：`pentestswarm mcp serve`
- **特点**：真正的 swarm 架构（非流水线），pheromone 衰减机制

### 5. awsome_kali_MCPServers

- **来源**：[ccq1/awsome_kali_MCPServers](https://github.com/ccq1/awsome_kali_MCPServers)
- **功能**：专为 Kali 设计的 MCP server 集合
- **覆盖**：网络分析、目标嗅探、流量分析、二进制理解、自动化
- **特点**：面向逆向工程和安全测试的 AI 工作流

### 6. Pentest-Agent

- **来源**：[0xJaeg3r/Pentest-Agent](https://github.com/0xJaeg3r/Pentest-Agent)
- **功能**：AI 驱动的渗透测试 agent
- **工具**：nmap、gobuster、nikto、sqlmap、hydra、john、metasploit、enum4linux、wpscan
- **架构**：基于 agno 框架，CLI + FastAPI server

### 7. pentestMCP

- **来源**：[RamKansal/pentestMCP](https://github.com/ramkansal/pentestMCP)
- **功能**：专为渗透测试设计的 MCP server
- **特点**：Docker 化部署，20+ 工具集成

## MCP 使用优先级建议

根据场景选择最合适的 MCP：

| 场景 | 推荐 MCP | 原因 |
|------|---------|------|
| 通用终端操作 | mcp-kali-server | 可调用任意命令 |
| Metasploit 专用 | metasploitmcp | exploit/payload/session 管理 |
| 大规模自动化 | hexstrike-ai | 150+ 工具编排 |
| 群体渗透/Bug Bounty | pentestswarm | swarm 架构，适合大目标 |
| 逆向工程 | awsome_kali_MCPServers | 专注二进制和流量分析 |
| 快速单目标 | pentest-agent | 简单直接 |

## MCP 配置示例（Claude Code / Kiro）

```json
{
  "mcpServers": {
    "kali-server": {
      "command": "kali-server-mcp",
      "args": ["--port", "5000"]
    },
    "metasploit-mcp": {
      "command": "metasploitmcp",
      "args": ["--transport", "stdio"]
    },
    "hexstrike": {
      "command": "hexstrike-ai",
      "args": []
    },
    "pentestswarm": {
      "command": "pentestswarm",
      "args": ["mcp", "serve"]
    }
  }
}
```

## 参考资料

- [Kali & LLM: Claude Desktop 集成](https://www.kali.org/blog/kali-llm-claude-desktop/)（Kali 官方博客）
- [Kali & LLM: Ollama + 5ire 本地运行](https://www.kali.org/blog/kali-llm-ollama-5ire/)（Kali 官方博客）
- [Automating Penetration Testing via MCP-Kali-Server](https://medium.com/@linc89617/automating-penetration-testing-with-claude-lm-studio-anythingllm-via-mcp-kali-server-730cdaa65eab)（Medium）
