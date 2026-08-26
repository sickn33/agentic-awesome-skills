# 加解密 / 编解码工具速查

> 逆向和 CTF 中经常遇到加密/编码/哈希数据。本文档按场景列出最实用的工具。

---

## 自动识别 + 解密（不知道用了什么加密时）

| 工具 | Stars | 用途 | 链接 |
|------|-------|------|------|
| **Ciphey** | 18k+ | AI 自动识别并解密（支持 50+ 编码/加密/哈希） | https://github.com/Ciphey/Ciphey |
| **CyberChef** | 29k+ | 在线/离线编解码瑞士军刀（拖拽式操作） | https://github.com/gchq/CyberChef |
| **dcode.fr** | — | 在线 900+ 密码/编码/数学工具 | https://www.dcode.fr/ |

### Ciphey 使用

```bash
pip install ciphey
# 自动检测并解密
ciphey -t "密文"
# 从文件读取
ciphey -f encrypted.txt
```

Ciphey 支持：Base64/32/16、Caesar、Vigenere、XOR、AES（弱密钥）、Morse、Binary、Hex、URL encoding、HTML entities、哈希识别等。

### CyberChef 使用

```text
在线版：https://gchq.github.io/CyberChef/
离线版：下载 GitHub Release 的 HTML 文件直接打开

常用 Recipe：
- From Base64 → 解 Base64
- XOR → 异或解密（可暴力尝试 key）
- AES Decrypt → AES 解密
- Magic → 自动检测编码类型
```

---

## 哈希识别与破解

| 工具 | 用途 | 链接 |
|------|------|------|
| **hashID** | 识别哈希类型（MD5/SHA/bcrypt 等） | https://github.com/psypanda/hashID |
| **hash-identifier** | 同上，Python 版 | https://github.com/blackploit/hash-identifier |
| **haiti** | 现代哈希识别工具（更准确） | `gem install haiti` |
| **Hashcat** | GPU 哈希破解 | https://hashcat.net/ |
| **John the Ripper** | CPU 哈希破解 | https://www.openwall.com/john/ |
| **hashes.com** | 在线哈希查询（彩虹表） | https://hashes.com/ |

```bash
# 识别哈希类型
hashid '5f4dcc3b5aa765d61d8327deb882cf99'
# 输出: [+] MD5

# haiti（更准确）
haiti '5f4dcc3b5aa765d61d8327deb882cf99'

# Hashcat 破解
hashcat -m 0 hash.txt rockyou.txt  # MD5
hashcat -m 1000 hash.txt rockyou.txt  # NTLM
```

---

## RSA 攻击

| 工具 | 用途 | 链接 |
|------|------|------|
| **RsaCtfTool** | RSA 自动攻击（20+ 攻击方式） | https://github.com/Ganapati/RsaCtfTool |
| **SageMath** | 数学计算（大数分解/椭圆曲线） | https://www.sagemath.org/ |
| **factordb.com** | 在线大数分解查询 | http://factordb.com/ |
| **yafu** | 本地大数分解 | https://github.com/bbuhrow/yafu |

```bash
# RsaCtfTool 自动攻击
python RsaCtfTool.py --publickey pub.pem --private
python RsaCtfTool.py --publickey pub.pem --uncipherfile cipher.txt

# 支持的攻击：
# Wiener、Boneh-Durfee、Fermat、Pollard p-1、Williams p+1
# Common modulus、Small q、Hastads、Noveltyprimes 等
```

---

## XOR 分析

| 工具 | 用途 | 链接 |
|------|------|------|
| **xortool** | XOR 密钥长度猜测 + 已知明文攻击 | https://github.com/hellman/xortool |
| **CyberChef XOR** | 可视化 XOR 操作 | CyberChef 内置 |

```bash
# 猜测 XOR key 长度
xortool encrypted_file
# 用猜测的 key 长度解密
xortool -l 4 -c 00 encrypted_file

# 已知明文攻击（知道部分明文）
xortool-xor -f encrypted -s "known_plaintext"
```

---

## 古典密码

| 密码类型 | 工具 | 说明 |
|---------|------|------|
| Caesar | CyberChef / dcode.fr | 暴力 25 种偏移 |
| Vigenere | dcode.fr / Ciphey | 需要猜 key 长度 |
| Substitution | quipqiup.com | 频率分析自动求解 |
| Enigma | dcode.fr | 在线模拟器 |
| Rail Fence | dcode.fr / CyberChef | 栅栏密码 |
| Playfair | dcode.fr | 需要 key |
| Morse | CyberChef | 点划转文字 |
| Bacon | dcode.fr | 二进制隐写 |
| ROT13/47 | CyberChef / `tr` | 简单替换 |

---

## 编码识别与转换

| 编码 | 识别特征 | 解码方式 |
|------|---------|---------|
| Base64 | 末尾 `=` 或 `==`，字符集 A-Za-z0-9+/ | `base64 -d` / CyberChef | <!-- security-allowlist: SEC008 -->
| Base32 | 大写字母 + 2-7，末尾 `=` | CyberChef |
| Base58 | 无 0/O/I/l，常见于短标识符编码 | CyberChef |
| Hex | 只有 0-9a-f，长度为偶数 | `xxd -r -p` / CyberChef |
| URL encoding | `%XX` 格式 | `urldecode` / CyberChef |
| HTML entities | `&#XX;` 或 `&amp;` 格式 | CyberChef |
| Unicode escape | `\uXXXX` 格式 | Python `decode('unicode_escape')` |
| JWT | `xxxxx.yyyyy.zzzzz`（三段 Base64URL） | jwt.io / CyberChef |
| Brainfuck | 只有 `><+-.,[]` 八个字符 | 在线解释器 |
| Ook! | 只有 `Ook.` `Ook!` `Ook?` | 在线解释器 |

---

## 逆向中的加密识别

### 通过常量识别算法

| 常量/特征 | 算法 |
|-----------|------|
| `0x67452301, 0xEFCDAB89, 0x98BADCFE, 0x10325476` | MD5 |
| `0x6A09E667, 0xBB67AE85, 0x3C6EF372` | SHA-256 |
| `0x63, 0x7C, 0x77, 0x7B` (S-Box 开头) | AES |
| `0x243F6A88` (π 的十六进制) | Blowfish |
| `0xB7E15163, 0x9E3779B9` | RC5/RC6/TEA |
| `0x61707865` ("expa") | ChaCha20/Salsa20 |
| `0xC6EF3720` | XTEA |

### 通过行为识别

| 行为特征 | 可能的算法 |
|---------|-----------|
| 256 字节查找表 + swap 操作 | RC4 |
| 16 字节块 + 多轮置换 | AES |
| Feistel 结构（左右交换） | DES/Blowfish/TEA |
| 大数乘法/模幂 | RSA |
| 椭圆曲线点运算 | ECDSA/ECDH |
| 固定 64 轮循环 | TEA/XTEA |
| 32 轮 + delta 常量 | XTEA |

---

## 自动化密码分析

| 工具 | 用途 | 链接 |
|------|------|------|
| **FeatherDuster** | 自动化密码分析框架 | https://github.com/nccgroup/featherduster |
| **PkCrack** | ZIP 已知明文攻击 | https://www.unix-ag.uni-kl.de/~conrad/krypto/pkcrack.html |
| **bkcrack** | ZIP 已知明文攻击（现代版） | https://github.com/kimci86/bkcrack |
| **z3** | SMT 求解器（约束求解） | https://github.com/Z3Prover/z3 |
| **angr** | 符号执行（自动求解输入） | https://angr.io/ |

---

## 快速决策树

```text
拿到一段未知数据：

1. 看长度和字符集
   - 只有 hex 字符 → 可能是 hex 编码或哈希
   - 末尾有 = → Base64
   - 三段点分 → JWT
   - 32/40/64 字符 hex → 哈希（MD5/SHA1/SHA256）

2. 用 Ciphey 自动尝试
   ciphey -t "数据"

3. 如果 Ciphey 失败 → 用 CyberChef Magic 模式

4. 如果是哈希 → hashID 识别类型 → Hashcat/John 破解

5. 如果是 RSA → RsaCtfTool 自动攻击

6. 如果是 XOR → xortool 分析 key

7. 如果是传统 ZIP 加密 → 优先使用 `bkcrack` 已知明文攻击，不要先做无证据的密码暴力

8. 如果是自定义加密 → IDA/Ghidra 逆向算法 → 手写解密脚本
```

---

## 在线资源

| 资源 | 链接 | 用途 |
|------|------|------|
| CyberChef | https://gchq.github.io/CyberChef/ | 万能编解码 |
| dcode.fr | https://www.dcode.fr/ | 900+ 密码工具 |
| quipqiup | https://quipqiup.com/ | 替换密码自动求解 |
| factordb | http://factordb.com/ | RSA 大数分解 |
| jwt.io | https://jwt.io/ | JWT 解码/验证 |
| hashes.com | https://hashes.com/ | 哈希反查 |
| crackstation | https://crackstation.net/ | 在线哈希破解 |
