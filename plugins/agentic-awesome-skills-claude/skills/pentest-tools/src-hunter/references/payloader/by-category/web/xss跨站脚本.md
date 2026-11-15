# XSS跨站脚本

_12 条 web payload_

原始载荷档案以 UTF-8 字节的 Base64 形式保存在同目录的 `xss跨站脚本.payloads.b64`。这样做是为了避免 Windows Defender 在克隆仓库时把未编码的示例标签误判为可执行载荷。

## 使用边界

- 仅在获授权的隔离测试环境中解码和使用。
- 不要在生产站点、公开评论或个人资料中投放存储型载荷。
- 只验证最小化影响；不要收集真实 Cookie、键盘输入、会话或第三方用户数据。
- 解码后的文件属于不可信安全测试素材；先审阅上下文，再依据具体 CSP、浏览器版本和解析上下文验证。

## 解码

```bash
base64 --decode xss跨站脚本.payloads.b64 > /tmp/xss-payloads.md
```

在 Windows PowerShell 中可使用：

```powershell
[IO.File]::WriteAllBytes("$env:TEMP\xss-payloads.md", [Convert]::FromBase64String((Get-Content -Raw .\xss跨站脚本.payloads.b64)))
```

## 内容覆盖

档案覆盖反射型、存储型、DOM、mXSS、事件处理器、上下文匹配、编码差异与 WAF/EDR 绕过研究。历史示例不是当前环境可直接利用的保证；有效性和影响必须由隔离环境中的实际执行证据决定。
