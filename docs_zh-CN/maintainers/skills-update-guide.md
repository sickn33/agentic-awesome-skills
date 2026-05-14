# 技能更新指南

本指南介绍如何在 Antigravity Awesome Skills Web 应用程序中更新技能。

## 自动更新（推荐）

`START_APP.bat` 文件会在运行时自动检查并更新技能。它使用多种方法:

1. **Git 方法**（如果安装了 Git）：快速高效
2. **PowerShell 下载**（备用方案）：在没有 Git 的情况下工作

## 手动更新选项

### 选项 1：使用 npm 脚本（推荐用于手动更新）
```bash
npm run update:skills
```

此命令会:
- 从技能目录生成最新的技能索引
- 将其复制到 Web 应用程序的公共目录
- 需要安装 Python 和 PyYAML

### 选项 2：使用 START_APP.bat（集成解决方案）
```bash
START_APP.bat
```

START_APP.bat 文件包含集成的更新功能:
- 启动时自动检查更新
- 如果可用则使用 Git（快速方法）
- 如果未安装 Git 则回退到 HTTPS 下载
- 自动处理所有依赖项
- 提供清晰的状态消息
- 无需任何额外设置即可工作

### 选项 3：手动步骤
```bash
# 1. 生成技能索引
python tools/scripts/generate_index.py

# 2. 复制到 Web 应用程序
copy skills_index.json apps\web-app\public\skills.json
```

## 前置要求

对于手动更新，您需要:

- **Python 3.x**：从 [python.org](https://python.org/) 下载
- **PyYAML**：使用 `pip install PyYAML` 安装

## 故障排除

### "无法识别 Python"
- 从 [python.org](https://python.org/) 安装 Python
- 确保在安装过程中勾选"将 Python 添加到 PATH"

### "未找到 PyYAML"
- 使用以下命令安装: `pip install PyYAML`
- 或运行更新脚本，它会自动安装

### "复制技能失败"
- 确保 `apps\web-app\public\` 目录存在
- 检查文件权限

## 更新内容

更新过程会刷新:
- 技能索引 (`skills_index.json`)
- Web 应用程序技能数据 (`apps\web-app\public\skills.json`)
- 技能目录中的所有 1,436+ 技能

## 更新时机

在以下情况下更新技能:
- 向仓库添加了新技能
- 您想要最新的技能描述
- Web 应用程序中的技能显示缺失或过时

## Git 用户

如果您安装了 Git 并想更新整个仓库:
```bash
git pull origin main
npm run update:skills
```

这将拉取最新代码并更新技能数据。
