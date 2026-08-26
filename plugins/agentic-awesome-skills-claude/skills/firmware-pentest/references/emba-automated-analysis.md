# EMBA 自动化分析

参考：https://github.com/e-m-b-a/emba

EMBA = Embedded Analyzer。开源固件自动化审计框架，一行命令跑完静态扫描 + 仿真 + CVE 比对 + 报告生成。

## 它能做什么

| 阶段 | 模块前缀 | 干的事 |
|------|---------|--------|
| 预检 | P-modules | 识别格式、提取、归类 |
| 静态分析 | S-modules | 二进制 checksec、字符串、敏感配置、硬编码凭据 |
| QEMU 仿真 | Q-modules | 用户态仿真 + 服务探测 |
| Live 动态 | L-modules | 跑起来后实时检查（网络服务、暴露接口） |
| 收尾 | F-modules | 聚合结果 |
| 报告 | R-modules | HTML / SBOM / JSON / CSV |

## 安装

```bash
# 系统要求：Ubuntu 22.04 / Debian 12 / Kali（必须 Linux）
git clone https://github.com/e-m-b-a/emba.git ~/tools/emba
cd ~/tools/emba

# 一键安装（会装 Docker、qemu、各类 scanner、CVE 数据库）
sudo ./installer.sh -d

# 验证
sudo ./emba --help
```

## 一行命令跑全套

```bash
sudo ./emba \
  -l ./logs/router_v1.2.3 \
  -f ./firmware/router_v1.2.3.bin \
  -p ./scan-profiles/default-scan.emba
```

参数：

| 参数 | 含义 |
|------|------|
| `-l` | log 输出目录 |
| `-f` | 固件文件路径 |
| `-p` | 扫描 profile |
| `-t` | threaded 模式（多核加速） |
| `-Q` | 启用 QEMU 仿真分析 |
| `-W` | 生成 web 报告 |
| `-g` | 生成 grep-able log |
| `-D` | 在 Docker 内运行（推荐，环境隔离） |

### 推荐组合

```bash
# 深度 + Docker + Web 报告
sudo ./emba -D -l ./logs/x -f ./firmware.bin \
  -p ./scan-profiles/default-scan.emba -t -Q -W

# 快速预扫（看看值不值得深挖）
sudo ./emba -D -l ./logs/x -f ./firmware.bin \
  -p ./scan-profiles/quick-scan.emba

# 离线模式（无网络环境）
sudo ./emba -D -l ./logs/x -f ./firmware.bin \
  -p ./scan-profiles/default-scan-no-notify.emba
```

### scan-profiles 选哪个

| profile | 用途 |
|---------|------|
| `default-scan.emba` | 标准全套 |
| `quick-scan.emba` | 快速预扫，跳过 QEMU |
| `default-scan-no-notify.emba` | 无网络环境，离线 CVE 库 |
| `default-scan-emulation.emba` | 加强仿真分析 |
| `default-with-tools.emba` | 启用更多外部 scanner |

## 集成的子工具

EMBA 内置 / 调度的扫描器：

| 工具 | 干什么 |
|------|--------|
| cve-bin-tool | 已知 CVE 比对（基于 NVD 数据库） |
| Semgrep | 源码 / 脚本静态规则扫描 |
| bandit | Python 源码安全扫描 |
| checksec | ELF 安全特性（NX / RELRO / PIE / Canary） |
| Trivy | SBOM 生成 + 漏洞匹配 |
| linter (shellcheck / yara) | 配置和脚本静态检查 |
| pixd | 二进制可视化（熵图） |
| binwalk + unblob | 提取后端 |
| EMBA 自家规则 | 硬编码密码、私钥、危险函数调用 |

## 输出报告解读

跑完后看 `./logs/router_v1.2.3/`：

```text
logs/router_v1.2.3/
├── html-report/
│   └── index.html              ← 主入口，浏览器打开
├── csv_logs/                   ← grep / awk 用
├── json_logs/                  ← 程序化处理用
├── s05_firmware_details.txt    ← 固件基本信息
├── s09_firmware_base_version_check.txt  ← 版本检测
├── s12_binary_protection.txt   ← checksec 汇总
├── s20_shell_check.txt         ← shell 脚本问题
├── s24_kernel_bin_identifier.txt
├── s40_weak_perm_check.txt     ← 权限问题
├── s108_stacs_password_search.txt  ← 密码 / 密钥泄漏
├── s109_jtr_local_pw_cracking.txt   ← shadow 破解结果
├── s115_usermode_emulator.txt  ← 用户态仿真结果
├── q02_openssl_bin_version_check.txt
├── l10_system_emulator.txt     ← 全系统仿真状态
├── l15_emulated_checks_init.txt
└── f50_base_aggregator.txt     ← 总聚合
```

### HTML 报告重点字段

打开 `html-report/index.html`，关注：

1. **Summary 块** — 风险评级（CRITICAL / HIGH / MEDIUM）+ CVE 数量
2. **Firmware details (S05)** — 内核版本、busybox 版本、SDK 厂商
3. **Version detection (S09)** — 所有识别出的二进制 + 版本，对比 CVE
4. **Binary protection (S12)** — 哪些二进制没开 NX / RELRO（fuzz / 利用容易）
5. **Password / Secrets (S108)** — 硬编码凭据直接看
6. **System emulation (L10)** — 仿真是否成功 + 跑起来的服务
7. **Aggregator (F50)** — 一页总结，先看这个

### CVE 比对优先级

报告里一堆 CVE 别全信，按这个顺序复核：

```text
1. CVE 评分 ≥ 7.5 + 影响网络服务（lighttpd / dropbear / 内置 httpd）
2. CVE 有公开 PoC（Exploit-DB / GitHub）
3. 二进制确实存在该版本（version string 命中）
4. 暴露在监听端口上（结合 L10 仿真结果看 netstat）
5. 不需要认证或认证容易绕（结合源码 / 反汇编看）
```

## 何时用 EMBA，何时手工

| 场景 | 用 EMBA | 手工分析 |
|------|---------|---------|
| 第一次接触某固件 | ✓ | |
| 大批量固件审计（>5 个） | ✓ | |
| 寻找已公开 CVE | ✓ | |
| 找 0day | 辅助 | ✓ 主力 |
| 加密 / 私有格式 | ✗（提不出来） | ✓ |
| 单个二进制深度逆向 | ✗ | ✓（用 IDA / Ghidra） |
| 协议 / 业务逻辑漏洞 | ✗ | ✓ |

EMBA 的强项是把 80% 的体力活包了，让你专注剩下 20% 真正需要脑子的部分。

## 二次开发 / 自定义规则

EMBA 模块化设计，可以塞自家规则：

```bash
# 自定义 yara 规则
cp my_rule.yar ~/tools/emba/external/yara/

# 自定义 Semgrep 规则
cp my_rule.yaml ~/tools/emba/config/semgrep_rules/

# 调整 CVE 严重性阈值
vim ~/tools/emba/config/emba_emulator_db.cfg
```

模块加载顺序在 `~/tools/emba/modules/` 下，文件名前缀决定执行阶段。

## 常见坑

```text
1. installer.sh 卡住 → 网络问题，开代理或换镜像源
2. CVE 数据库过期 → ./emba_db_update.sh 强制刷新
3. QEMU 仿真失败 → 改用 default-scan-emulation.emba profile
4. Docker 模式磁盘爆 → 清理 /var/lib/docker/overlay2
5. 报告里 CVE 全是 N/A → cve-bin-tool 数据库没下载完，重跑 installer
6. 内存不足 → 32GB+ 推荐，大固件 64GB
7. 在 WSL2 里跑 → 关 systemd-resolved，启用 cgroup v2
```

## 配套阅读

- EMBA paper / 用户手册：https://github.com/e-m-b-a/emba/blob/master/README.md
- 在线 demo 报告：https://e-m-b-a.github.io/emba/
- 自定义模块开发：https://github.com/e-m-b-a/emba/wiki
