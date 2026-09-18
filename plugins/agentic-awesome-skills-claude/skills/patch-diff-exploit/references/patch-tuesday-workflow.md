# Patch Tuesday 工作流

每月第二个周二 (Pacific Time) 微软发布安全更新，俗称 Patch Tuesday。这是 N-day 研究最稳定的输入源：补丁数量大、价值高、披露口径统一。本文档给出从订阅公告到拿到可对比二进制的完整流程。

---

## 1. 信息源订阅

| 来源 | 用途 | 备注 |
|------|------|------|
| MSRC Security Update Guide | 当月所有 CVE 列表 + CVSS + 受影响产品 | https://msrc.microsoft.com/update-guide/ 有 API |
| MSRC CVRF API | 程序化拉当月 CVE JSON | `https://api.msrc.microsoft.com/cvrf/v3.0/cvrf/{YEAR}-{Mon}` |
| Microsoft Update Catalog | 下 MSU/MSP 实物 | https://www.catalog.update.microsoft.com/ |
| Patch Tuesday Dashboard (Tenable / Trend / Rapid7) | 第三方汇总优先级 | 看哪些标了 "exploited in the wild" |
| ZDI advisories | ZDI 提交的 CVE 详细描述 | 经常有比 MSRC 更详细的 root cause hint |
| Project Zero 周期性 issue tracker | 半年后会公开细节 | 可作为历史对照 |

### 拉当月 CVE 列表 (PowerShell)

```powershell
$year = '2026'; $mon = 'May'
$url = "https://api.msrc.microsoft.com/cvrf/v3.0/cvrf/$year-$mon"
Invoke-RestMethod $url | ConvertTo-Json -Depth 10 | Out-File "C:\patches\msrc-$year-$mon.json" -Encoding utf8
```

---

## 2. 锁定高价值补丁

按以下顺序过滤当月公告：

1. **CVSS >= 7.0**
2. **Exploitation: Exploitation Detected / More Likely**
3. **组件白名单**（高价值攻击面）：
   - `Windows Kernel` (ntoskrnl.exe)
   - `Win32k` (win32k.sys, win32kfull.sys, win32kbase.sys)
   - `Ancillary Function Driver for WinSock` (afd.sys) — 历史 LPE 大户
   - `Common Log File System` (clfs.sys) — 过去三年多次被野利用
   - `Print Spooler` (spoolsv.exe, win32spl.dll)
   - `Cloud Files Mini Filter Driver` (cldflt.sys)
   - `NTFS` (ntfs.sys)
   - `Hyper-V` (vmswitch.sys, hvix64.exe, hvax64.exe)
   - `Cryptography Services` / `NTLM` / `Kerberos`
   - `RDP` (rdpcorets.dll, rdpbase.dll)
4. **本地提权 (EoP) > RCE > Info Disclosure** — EoP 武器化门槛最低
5. **是否有 KB 直接对应** — 没有 KB 号的（例如纯 Defender 定义更新）跳过

---

## 3. 下载 patched / unpatched 二进制

### 3.1 Microsoft Update Catalog 手动下

```text
1. 访问 https://www.catalog.update.microsoft.com/Search.aspx?q=KB5052000
2. 按 Products 过滤 (Windows 11, Server 2022 等)
3. 选目标架构 (x64 / arm64)，下载 .msu
4. 同时下 N-1 版本 (上个月的 KB 号) 作为 unpatched 基线
```

### 3.2 程序化批量下

```powershell
# msdownload 第三方脚本
git clone https://github.com/JaschaUrbach/msu-downloader.git
python msu-downloader.py --kb KB5052000 --arch x64 --out C:\patches\
```

### 3.3 wsuspect-proxy 拦截真实流量取最新补丁

适用于：MSRC 还没在 Catalog 上架，但已通过 WU 推送给客户端的早期窗口。

```bash
git clone https://github.com/ctxis/wsuspect-proxy.git
cd wsuspect-proxy
# 在被测机器上手工设 WSUS = http://attacker:8530，触发 wuauclt /detectnow
python wsuspect-proxy.py --listen 0.0.0.0:8530 --dump-cabs C:\patches\dump\
```

### 3.4 Delta 包 vs Cumulative 包

- 微软现在主推 `.msu` cumulative update — 体积大但完整
- 也有 `.msu` Express / Delta 包 — 体积小但只含差异，对差分研究不友好
- 优先下 cumulative

---

## 4. 解包 MSU / CAB / MSP

### 4.1 MSU 解包（Windows）

```powershell
# Step 1: MSU 是 cab 套娃，先解外层
expand.exe Windows-KB5052000-x64.msu -F:* C:\patches\out\

# Step 2: 解里面的 .cab
expand.exe C:\patches\out\Windows-KB5052000-x64.cab -F:* C:\patches\out\

# Step 3: 关键文件在 amd64_microsoft-windows-{component}_*\ 下
# 例如 ntoskrnl.exe 在:
#   C:\patches\out\amd64_microsoft-windows-os-kernel_*\ntoskrnl.exe
```

### 4.2 用 dism 装到离线镜像（拿干净的 patched 二进制）

```powershell
# 挂载离线 WIM
dism /mount-image /imagefile:install.wim /index:1 /mountdir:C:\mnt

# 应用补丁
dism /image:C:\mnt /add-package /packagepath:Windows-KB5052000-x64.msu

# 提取目标二进制
copy C:\mnt\Windows\System32\ntoskrnl.exe C:\patches\patched\

# 卸载
dism /unmount-image /mountdir:C:\mnt /commit
```

### 4.3 MSP (Office 等) 解包

```powershell
# MSP 是 Windows Installer Patch
msiexec /a base.msi /p update.msp TARGETDIR=C:\patches\office_patched

# 或用 lessmsi (推荐, 不动注册表)
lessmsi x update.msp C:\patches\office_msp\
```

### 4.4 用第三方工具一站式拆包

```powershell
# PatchExtract by Greg Linares - 一条命令解多层
.\PatchExtract.ps1 -PatchFile Windows-KB5052000-x64.msu -ExtractedFolder C:\patches\extracted\
```

---

## 5. 取符号 (PDB)

```powershell
# Windows SDK 自带 symchk
symchk /v /r C:\patches\patched\ntoskrnl.exe /s SRV*C:\sym*https://msdl.microsoft.com/download/symbols
symchk /v /r C:\patches\unpatched\ntoskrnl.exe /s SRV*C:\sym*https://msdl.microsoft.com/download/symbols
```

注意：微软偶尔会延迟或下架某个版本 PDB。如果当前下不到 N-1 的 PDB，用 `binary-diff` skill 把 N-2 的 PDB 符号迁移到 N-1。

---

## 6. Windows 高价值二进制路径速查

| 文件 | 路径 | 关注组件 |
|------|------|---------|
| ntoskrnl.exe | System32\ | 内核核心、对象管理、Ob*、Ps*、Mm*、Io* |
| win32k.sys | System32\ | GUI 子系统入口 |
| win32kfull.sys | System32\ | GUI 完整版（桌面会话） |
| win32kbase.sys | System32\ | GUI 基础库 |
| afd.sys | System32\drivers\ | WinSock AFD，LPE 高发 |
| clfs.sys | System32\drivers\ | CLFS，0-day 高发 |
| cldflt.sys | System32\drivers\ | Cloud Files mini filter |
| spoolsv.exe | System32\ | Print Spooler |
| dwm.exe | System32\ | Desktop Window Manager |
| lsass.exe | System32\ | LSA 认证 |
| ntdll.dll | System32\ | syscall stub、PE loader |
| ksecdd.sys | System32\drivers\ | Kernel security driver |

---

## 7. Linux 等价流程

### 7.1 信息源

| 来源 | 适用 |
|------|------|
| Ubuntu USN | https://ubuntu.com/security/notices |
| Red Hat RHSA | https://access.redhat.com/security/security-updates/ |
| Debian DSA | https://www.debian.org/security/ |
| CentOS / Rocky / Alma announce list | 通常 mirror Red Hat |
| upstream kernel CVE list | https://cve.kernel.org/ |

### 7.2 拉补丁包

```bash
# Debian/Ubuntu
apt download linux-image-5.15.0-101-generic
apt download linux-image-5.15.0-100-generic
apt download linux-image-unsigned-5.15.0-101-generic-dbgsym

# CentOS/Rocky
dnf download --downloadonly --downloaddir=./patched kernel-5.14.0-362.18.1.el9_3
dnf download --downloadonly --downloaddir=./unpatched kernel-5.14.0-362.13.1.el9_3
```

### 7.3 解包

```bash
# .deb
dpkg-deb -x linux-image-5.15.0-101-generic_*.deb ./patched/

# .rpm
rpm2cpio kernel-5.14.0-362.18.1.el9_3.x86_64.rpm | cpio -idmv -D ./patched/
```

### 7.4 从 vmlinuz 还原 vmlinux

```bash
# 用内核自带 scripts/extract-vmlinux
wget https://raw.githubusercontent.com/torvalds/linux/master/scripts/extract-vmlinux
chmod +x extract-vmlinux
./extract-vmlinux ./patched/boot/vmlinuz-5.15.0-101-generic > vmlinux_5.15.0-101
./extract-vmlinux ./unpatched/boot/vmlinuz-5.15.0-100-generic > vmlinux_5.15.0-100
```

### 7.5 关注子系统路径

| 子系统 | 历史 N-day 高发函数前缀 |
|--------|----------------------|
| net/ | `__skb_*`、`sk_*`、`tcp_*`、`udp_*`、`nf_*` |
| fs/ | `do_*`、`vfs_*`、`__lookup_*` |
| io_uring/ | 整个子系统（近三年漏洞王） |
| netfilter/ | `nft_*`、`nf_tables_*` |
| net/sched/ | tc 各 qdisc |
| drivers/net/ | 各 NIC 驱动 |
| bpf/ | verifier 类 |

---

## 8. 真实公开 CVE 案例参考

| CVE | 组件 | 类型 | 用于练手原因 |
|------|------|------|------------|
| CVE-2025-62215 | Windows Kernel | race condition + double free | 2025-11 公开，公告说"race + double free"，差分入门题 |
| CVE-2023-28252 | CLFS | OOB write → LPE | 野外利用，PoC 已公开，可对照学习方法 |
| CVE-2022-37969 | CLFS | type confusion → LPE | 同样有公开分析 |
| CVE-2021-40449 | Win32k | UAF → LPE | 公开报告完整 |
| CVE-2022-21882 | Win32k | type confusion，由 CVE-2021-1732 不完整修复变出 | 经典"一鱼多吃"案例 |

练习建议：拿一个已经有公开分析的 CVE，按本流程独立差出来一次，再对照公开 writeup 校准方法论。

---

## 9. 速查清单

- [ ] MSRC 月度公告已读，筛出 CVSS≥7 且组件在白名单内的 CVE
- [ ] 从 Catalog 下到 unpatched (N-1) 和 patched (N) 的 MSU
- [ ] 用 expand / dism 取出目标 .exe / .sys / .dll
- [ ] symchk 把 PDB 都吃到（吃不到走 binary-diff 迁移）
- [ ] 用 BinaryNinja / IDA / Ghidra 各开两个工程
- [ ] 跑 BinDiff / ghidriff，导出 diff 报告
- [ ] 按相似度过滤函数，进 `references/root-cause-and-poc.md` 反推根因
- [ ] 写 PoC，验证 unpatched 崩、patched 不崩
- [ ] 回写 field-journal 记录复用经验
