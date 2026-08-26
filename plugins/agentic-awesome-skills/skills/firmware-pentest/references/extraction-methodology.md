# 固件提取方法论（OWASP FSTM Stage 4）

参考：https://scriptingxss.gitbook.io/firmware-security-testing-methodology

固件提取是整条链的瓶颈。binwalk 一把成功是运气，多数固件需要换工具组合拳。

## 工具对比

| 工具 | 语言 | 优势 | 劣势 |
|------|------|------|------|
| binwalk v3 | Rust | 速度快、并发提取、内存稳 | 插件生态比 v2 小 |
| binwalk v2 | Python | 插件丰富、兼容性好 | 慢、易爆内存、维护暂停 |
| unblob | Python + 多语言 handler | 格式覆盖全（300+）、可作为库 | 安装依赖多 |
| jefferson | Python | 专攻 JFFS2 提取 | 单一用途 |
| ubi_reader | Python | UBI / UBIFS 标准方案 | 大镜像内存占用高 |
| 7z / unsquashfs / cramfsck | 原生 | 已知格式直接解 | 需要先确认偏移 |

选择策略：

```text
未知固件 → binwalk v3 → 失败 → unblob → 仍失败 → 手工 hexdump + 熵分段
已知 JFFS2 → jefferson 直接上
已知 UBI  → ubi_reader 直接上
已知 SquashFS 且偏移已知 → dd + unsquashfs
```

## 标准流程

### 1. 头部识别

```bash
binwalk firmware.bin
# 期望看到的关键字段：
#   uImage header / DECIMAL signature / TRX / CHK / SquashFS / JFFS2 / UBI

file firmware.bin
hexdump -C firmware.bin | head -32
```

vendor header 常见模式：

```text
TRX:  HDR0  (Asus / Linksys / Netgear 旧款)
CHK:  2A 23 24 5E  (TP-Link 部分)
DLOB: 4D 5A 4F 41  (D-Link 加密头)
uImage: 27 05 19 56
```

### 2. 熵分析

```bash
binwalk -E firmware.bin
# 输出 firmware.bin.png
```

判读：

| 熵区间 | 含义 |
|--------|------|
| 0.0 - 0.3 | 全 0 / 填充 / 未使用 flash 区 |
| 0.3 - 0.7 | 代码段 / 字符串 / 未压缩数据 |
| 0.7 - 0.95 | 压缩数据（gzip / lzma / xz / squashfs） |
| 0.95 - 1.0 | 加密 / 高熵压缩（注意：高熵不一定加密） |

### 3. 递归提取

```bash
# binwalk v3
binwalk -e firmware.bin                  # 单层提取
binwalk -Me firmware.bin                 # 递归提取（matryoshka）

# binwalk v2（旧版兼容）
binwalk2 --run-as=root -eM firmware.bin

# unblob
unblob -d out/ firmware.bin
unblob --depth 10 -d out/ firmware.bin   # 深度递归

# 输出结构（典型）
# _firmware.bin.extracted/
#   ├── 0.uImage
#   ├── 80.gzip
#   └── 1A0000.squashfs
#       └── squashfs-root/
#           ├── bin/  etc/  usr/  lib/  sbin/  ...
```

### 4. 文件系统分类处理

#### SquashFS

```bash
unsquashfs -d rootfs/ rootfs.squashfs

# squashfs 用了非标 magic？指定偏移
unsquashfs -d rootfs/ -offset 0x100 rootfs.squashfs

# LZMA 变种（老 Realtek SDK 常见）
sasquatch rootfs.squashfs            # squashfs-tools-ng 的兄弟项目
```

非标 SquashFS 是路由器固件最常见的坑，原版 unsquashfs 解不开时换 sasquatch。

#### JFFS2

```bash
jefferson rootfs.jffs2 -d rootfs/

# 大端 JFFS2
jefferson -v -b rootfs.jffs2 -d rootfs/

# 失败兜底：手工 mount
sudo modprobe mtdram total_size=32768 erase_size=128
sudo modprobe mtdblock
sudo dd if=rootfs.jffs2 of=/dev/mtdblock0
sudo mount -t jffs2 /dev/mtdblock0 /mnt/jffs2
```

#### UBI / UBIFS

```bash
# 提取 UBI volume
ubireader_extract_images rootfs.ubi -o out/

# 直接提文件
ubireader_extract_files rootfs.ubi -o rootfs/

# UBIFS 单独存在
ubireader_utils_info rootfs.ubifs
```

UBI 镜像常见坑：peb_size / leb_size 不标准，需要手工指定：

```bash
ubireader_extract_files -p 131072 -l 126976 rootfs.ubi -o rootfs/
```

#### CramFS

```bash
cramfsck -x rootfs/ rootfs.cramfs

# binwalk 自带的 sasquatch 也能解
```

#### YAFFS2（Android 老系统 / 部分嵌入式）

```bash
git clone https://github.com/ehlers/unyaffs2
unyaffs2 rootfs.yaffs2 rootfs/
```

#### 多 partition（A/B 分区固件）

```bash
binwalk firmware.bin
# 看到多个 SquashFS 偏移 0x100000 和 0x800000
dd if=firmware.bin of=part_a.bin bs=1 skip=$((0x100000)) count=$((0x700000))
dd if=firmware.bin of=part_b.bin bs=1 skip=$((0x800000))
```

## 加密固件兜底

### 判断是否真加密

```bash
binwalk -E firmware.bin
# 全段熵 ~0.99 且无 magic → 大概率加密 / 全段压缩

# 看是否有 vendor wrapper
xxd firmware.bin | head -8
# 看是否能找到任何已知 magic 在偏移 0x100 / 0x200 / 0x1000
binwalk --offset 256  firmware.bin
binwalk --offset 4096 firmware.bin
```

### 处理路径

```text
1. 找官方升级固件，对比加密 vs 明文版本
2. UART 拿到 U-Boot → 内存 dump 解密后的 image
3. SPI flash 物理 dump → 包含 bootloader 段
4. 逆 bootloader / 升级工具找密钥
5. 利用已公开同芯片解密方案
```

### 内存 dump（U-Boot）

```bash
# 串口接入
picocom -b 115200 /dev/ttyUSB0

# 启动时按键中断 → 进入 U-Boot
# 加载固件到内存
=> tftpboot 0x80000000 firmware.bin

# 等设备内部解密完，dump 解密后的镜像
=> md.b 0x80000000 0x800000          # 看一眼内容
=> save tftp 0x80000000 dump.bin 0x800000
```

## 失败兜底套路

### hexdump 找 magic

```bash
# 全文件搜常见 magic
binwalk --signature firmware.bin

# 手工搜 SquashFS magic
xxd firmware.bin | grep -E "(hsqs|sqsh)"

# 手工搜 gzip magic
xxd firmware.bin | grep -E "1f 8b 08"
```

### 按熵分段切片

```bash
# 输出熵 CSV
binwalk -E --save firmware.bin

# 手工切高熵段
dd if=firmware.bin of=segment_1.bin bs=4096 skip=256 count=512
file segment_1.bin
binwalk segment_1.bin
```

### 坏块处理

```bash
# SPI flash dump 有 ECC 错误 → ddrescue
ddrescue -d -r3 /dev/sdb dump.bin dump.log

# NAND flash dump 含 OOB → 剥离
nanddump --noecc --omitoob -f clean.bin /dev/mtd0
```

### 多次 dump 取多数票

```bash
# SPI flash 物理读不稳，dump 3 次取交集
flashrom -p ch341a_spi -r dump1.bin
flashrom -p ch341a_spi -r dump2.bin
flashrom -p ch341a_spi -r dump3.bin
sha256sum dump*.bin
# 不一致 → 重读 / 降速 / 换 clip
```

## 提取后立即做的事

```bash
cd squashfs-root/

# 1. 看根目录结构
ls -la
# 期望：bin/ etc/ lib/ sbin/ usr/ var/ proc/ ...

# 2. 找 init / 启动脚本
cat etc/inittab 2>/dev/null
cat etc/init.d/rcS 2>/dev/null
ls etc/init.d/

# 3. 找硬编码凭据
grep -rE "(password|passwd|admin|root):" etc/passwd etc/shadow 2>/dev/null

# 4. 找 Web 服务入口
find . -name "httpd" -o -name "lighttpd" -o -name "mini_httpd" -o -name "uhttpd"
find . -path "*cgi-bin*" -type f

# 5. 找 telnet / ssh / debug
find . -name "telnetd" -o -name "dropbear" -o -name "sshd"

# 6. 看 banner / 版本
cat etc/banner etc/issue etc/version 2>/dev/null
strings bin/busybox | head -3
```

## 引用

- OWASP FSTM Stage 4: https://scriptingxss.gitbook.io/firmware-security-testing-methodology
- binwalk v3: https://github.com/ReFirmLabs/binwalk
- unblob: https://github.com/onekey-sec/unblob
- jefferson: https://github.com/sviehb/jefferson
- ubi_reader: https://github.com/onekey-sec/ubi_reader
