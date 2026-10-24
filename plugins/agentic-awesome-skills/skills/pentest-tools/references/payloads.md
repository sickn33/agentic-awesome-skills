# 自定义 Payload 目录

本目录用于存放你自己积累的高效 payload。AI 在执行渗透测试时会优先使用这里的 payload，再去尝试通用 payload。

## 建议的文件组织

```
payloads/
├── sql-injection/        # SQL 注入 payload
│   ├── mysql-union.txt
│   ├── mssql-stacked.txt
│   └── blind-time.txt
├── xss/                  # XSS payload
│   ├── reflected.txt
│   └── dom-based.txt
├── ssrf/                 # SSRF payload
├── lfi-rfi/              # 文件包含
├── auth-bypass/          # 认证绕过
├── command-injection/    # 命令注入
└── custom/               # 其他自定义
```

## 使用规则

- AI 测试时先用本目录的 payload，再用 SecLists 通用字典
- 每次发现新的有效 payload，回写到对应目录
- 文件名要有描述性，不要用 `1.txt`、`test.txt`

## 自动补充

本目录结构是建议布局，不代表实际存在的 payload 文件。不要自动下载或回写源技能；确需使用外部字典时，核对来源、许可证和固定版本，在任务工作目录保存审查过的最小子集。此 catalog 未附 bootstrap 下载器。
