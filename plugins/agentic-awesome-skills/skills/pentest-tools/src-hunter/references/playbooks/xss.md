# XSS

> 视角：黑盒，目标是让脚本在受害者浏览器执行

原始 playbook 以 UTF-8 字节的 Base64 形式保存在 `xss.payloads.b64`。未编码的示例标签会在 Windows 克隆时触发 Defender 的启发式告警，因此 Markdown 入口只保留方法说明与安全边界。

## 验证边界

只在获授权的隔离页面和测试账户中验证执行。不得在公开评论、生产用户资料或第三方可见位置投放存储型载荷。第三方回调可能接收 URL、会话或页面数据；默认只使用本地合成标记，不收集真实 Cookie、键盘输入、会话或用户数据。

编码必须匹配解析上下文。HTML 实体不会在普通文本中自动变成标签，JavaScript 标识符不支持所有十六进制转义，URL 编码也不会在事件处理器中自动解码。CSP、JSONP、nonce、base 和目标版本都必须按实际环境验证。

## 解码

```bash
base64 --decode xss.payloads.b64 > /tmp/xss-playbook.md
```

PowerShell：

```powershell
[IO.File]::WriteAllBytes("$env:TEMP\xss-playbook.md", [Convert]::FromBase64String((Get-Content -Raw .\xss.payloads.b64)))
```

档案包含上下文识别、结构化历史载荷、DOM source/sink、CSP 组合、盲打边界与案例指纹。它不证明任何公开服务可利用；严重度和赏金范围取决于实际计划与已验证影响。
