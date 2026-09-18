# 权限提升

_3 条工具命令_

### Linux提权命令  `linux-privilege`
_Linux系统提权常用命令_

**Step 0**
> 获取系统版本信息
_platform: linux_
```
uname -a
cat /etc/issue
cat /etc/*-release
cat /proc/version
```

**Step 0**
> 获取用户信息
_platform: linux_
```
id
whoami
w
last
cat /etc/passwd
cat /etc/shadow
```

**Step 0**
> 查找SUID权限文件
_platform: linux_
```
find / -perm -4000 -type f 2>/dev/null
find / -perm -u=s -type f 2>/dev/null
```
**语法解析：**
- `-perm -4000` — SUID权限位 _parameter_
- `-type f` — 文件类型 _parameter_

**Step 0**
> 查看SUDO权限配置
_platform: linux_
```
sudo -l
cat /etc/sudoers
```

**Step 0**
> 查找可写目录
_platform: linux_
```
find / -writable -type d 2>/dev/null
find / -perm -222 -type d 2>/dev/null
```

**Step 0**
> 搜索内核漏洞
_platform: linux_
```
searchsploit linux kernel $(uname -r)
./linux-exploit-suggester.sh
```

**Step 0**
> 查看计划任务
_platform: linux_
```
cat /etc/crontab
ls -la /etc/cron*
crontab -l
```

**Step 0**
> 查看环境变量
_platform: linux_
```
env
set
echo $PATH
```

**Step 0**
> 查找敏感文件
_platform: linux_
```
cat /root/.bash_history
cat ~/.ssh/authorized_keys
cat /etc/shadow
find / -name "*.key" 2>/dev/null
```

**Step 0**
> 检测Docker环境
_platform: linux_
```
cat /proc/1/cgroup
fdisk -l
capsh --print
```

---

### WinPEAS  `winpeas-tool`
_Windows提权辅助工具_

**Step 0**
> 执行完整提权扫描
_platform: windows_
```
winpeas.exe
```

**Step 0**
> 快速扫描模式
_platform: windows_
```
winpeas.exe fast
```

**Step 0**
> 显示详细命令输出
_platform: windows_
```
winpeas.exe cmd
```

**Step 0**
> 保存扫描结果
_platform: windows_
```
winpeas.exe > output.txt
```

---

### LinPEAS  `linpeas-tool`
_Linux提权辅助工具_

**Step 0**
> 执行完整提权扫描
_platform: linux_
```
./linpeas.sh
```

**Step 0**
> 自动发现模式
_platform: linux_
```
./linpeas.sh -a
```

**Step 0**
> 检查密码策略
_platform: linux_
```
./linpeas.sh -P
```

**Step 0**
> 保存扫描结果
_platform: linux_
```
./linpeas.sh > output.txt
```

---
