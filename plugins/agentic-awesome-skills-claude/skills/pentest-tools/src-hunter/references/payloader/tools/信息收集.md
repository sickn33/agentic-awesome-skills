# 信息收集

_20 条工具命令_

### Nmap  `nmap`
_网络扫描和安全审计工具_

**Step 0**
> 使用TCP连接方式进行端口扫描
```
nmap -sT target_ip
```
**语法解析：**
- `nmap` — Nmap扫描工具 _command_
- `-sT` — TCP连接扫描模式 _parameter_
- `target_ip` — 目标IP地址 _value_

**Step 0**
> 使用SYN包进行隐蔽扫描，需要root权限
_platform: linux_
```
nmap -sS target_ip
```
**语法解析：**
- `-sS` — SYN扫描(半开扫描)，更隐蔽 _parameter_

**Step 0**
> 扫描UDP端口
```
nmap -sU target_ip
```
**语法解析：**
- `-sU` — UDP扫描模式 _parameter_

**Step 0**
> 探测开放端口的服务版本信息
```
nmap -sV target_ip
```
**语法解析：**
- `-sV` — 服务版本探测 _parameter_

**Step 0**
> 尝试识别目标操作系统
```
nmap -O target_ip
```
**语法解析：**
- `-O` — 操作系统探测 _parameter_

**Step 0**
> 启用高级功能进行全面扫描
```
nmap -A target_ip
```
**语法解析：**
- `-A` — 启用OS检测、版本检测、脚本扫描和traceroute _parameter_

**Step 0**
> 只扫描指定的端口
```
nmap -p 22,80,443 target_ip
```
**语法解析：**
- `-p` — 指定端口 _parameter_
- `22,80,443` — 端口号列表 _value_

**Step 0**
> 扫描指定范围的端口
```
nmap -p 1-1000 target_ip
```
**语法解析：**
- `1-1000` — 端口范围 _value_

**Step 0**
> 使用Nmap脚本引擎进行漏洞扫描
```
nmap --script=vuln target_ip
```
**语法解析：**
- `--script=` — 指定Nmap脚本 _parameter_
- `vuln` — 漏洞检测脚本类别 _value_

**Step 0**
> 扫描SMB共享和用户信息
```
nmap --script=smb-enum-shares,smb-enum-users target_ip
```

**Step 0**
> HTTP服务漏洞扫描
```
nmap --script=http-enum,http-vuln* -p 80,443 target_ip
```

**Step 0**
> 快速扫描，只扫描常用端口
```
nmap -F target_ip
```
**语法解析：**
- `-F` — 快速模式，扫描常用100个端口 _parameter_

**Step 0**
> 扫描整个网段
```
nmap 192.168.1.0/24
```
**语法解析：**
- `192.168.1.0/24` — CIDR格式的网段 _value_

**Step 0**
> 将扫描结果保存到文件
```
nmap -oN output.txt target_ip
```
**语法解析：**
- `-oN` — 普通格式输出 _parameter_
- `-oX` — XML格式输出 _parameter_
- `-oG` — Grepable格式输出 _parameter_

---

### Gobuster  `gobuster`
_目录和子域名爆破工具_

**Step 0**
> 爆破网站目录
_platform: linux_
```
gobuster dir -u http://target.com -w wordlist.txt
```
**语法解析：**
- `gobuster` — Gobuster工具 _command_
- `dir` — 目录爆破模式 _value_
- `-u` — 目标URL _parameter_
- `-w` — 字典文件 _parameter_

**Step 0**
> 指定文件扩展名
_platform: linux_
```
gobuster dir -u http://target.com -w wordlist.txt -x php,html,txt
```
**语法解析：**
- `-x` — 文件扩展名 _parameter_

**Step 0**
> 爆破子域名
_platform: linux_
```
gobuster dns -d target.com -w subdomains.txt
```
**语法解析：**
- `dns` — DNS爆破模式 _value_
- `-d` — 目标域名 _parameter_

**Step 0**
> 使用Cookie认证
_platform: linux_
```
gobuster dir -u http://target.com -w wordlist.txt -c "PHPSESSID=xxx"
```
**语法解析：**
- `-c` — 设置Cookie _parameter_

**Step 0**
> 添加自定义Header
_platform: linux_
```
gobuster dir -u http://target.com -w wordlist.txt -H "Authorization: Bearer token"
```
**语法解析：**
- `-H` — 添加Header _parameter_

**Step 0**
> 设置线程数
_platform: linux_
```
gobuster dir -u http://target.com -w wordlist.txt -t 50
```
**语法解析：**
- `-t` — 线程数 _parameter_

**Step 0**
> 忽略特定状态码
_platform: linux_
```
gobuster dir -u http://target.com -w wordlist.txt -b 404,403
```
**语法解析：**
- `-b` — 黑名单状态码 _parameter_

---

### Nuclei  `nuclei`
_快速漏洞扫描工具_

**Step 0**
> 使用所有模板扫描
_platform: linux_
```
nuclei -u http://target.com
```

**Step 0**
> 使用CVE模板
_platform: linux_
```
nuclei -u http://target.com -t cves/
```

**Step 0**
> 指定漏洞严重级别
_platform: linux_
```
nuclei -u http://target.com -severity critical,high
```

**Step 0**
> 从文件读取目标
_platform: linux_
```
nuclei -l urls.txt
```

**Step 0**
> 更新模板库
_platform: linux_
```
nuclei -update-templates
```

**Step 0**
> 保存扫描结果
_platform: linux_
```
nuclei -u http://target.com -o results.txt
```

**Step 0**
> JSON格式输出
_platform: linux_
```
nuclei -u http://target.com -json -o results.json
```

---

### Seatbelt  `seatbelt-tool`
_Windows安全信息收集工具_

**Step 0**
> 收集所有信息
_platform: windows_
```
Seatbelt.exe -group=all
```

**Step 0**
> 收集系统信息
_platform: windows_
```
Seatbelt.exe -group=system
```

**Step 0**
> 收集用户信息
_platform: windows_
```
Seatbelt.exe -group=user
```

**Step 0**
> 收集安全配置
_platform: windows_
```
Seatbelt.exe -group=security
```

**Step 0**
> 收集网络信息
_platform: windows_
```
Seatbelt.exe -group=network
```

**Step 0**
> 远程信息收集
_platform: windows_
```
Seatbelt.exe -group=all -computername=TARGET -username=DOMAIN\user -password=password
```

---

### SearchSploit  `searchsploit-tool`
_漏洞搜索工具_

**Step 0**
> 搜索Apache漏洞
_platform: linux_
```
searchsploit apache 2.4
```

**Step 0**
> 精确匹配搜索
_platform: linux_
```
searchsploit -e "Apache 2.4"
```

**Step 0**
> 排除特定类型
_platform: linux_
```
searchsploit apache --exclude="DoS"
```

**Step 0**
> 查看漏洞代码
_platform: linux_
```
searchsploit -x exploits/xxx.py
```

**Step 0**
> 复制到当前目录
_platform: linux_
```
searchsploit -m exploits/xxx.py
```

**Step 0**
> 更新漏洞数据库
_platform: linux_
```
searchsploit -u
```

---

### Amass  `amass-tool`
_子域名枚举工具_

**Step 0**
> 枚举子域名
_platform: linux_
```
amass enum -d target.com
```

**Step 0**
> 被动信息收集
_platform: linux_
```
amass enum -passive -d target.com
```

**Step 0**
> 主动信息收集
_platform: linux_
```
amass enum -active -d target.com
```

**Step 0**
> 暴力破解子域名
_platform: linux_
```
amass enum -brute -d target.com -w wordlist.txt
```

**Step 0**
> 保存枚举结果
_platform: linux_
```
amass enum -d target.com -o output.txt
```

---

### Subfinder  `subfinder-tool`
_子域名发现工具_

**Step 0**
> 枚举子域名
_platform: linux_
```
subfinder -d target.com
```

**Step 0**
> 递归枚举
_platform: linux_
```
subfinder -d target.com -recursive
```

**Step 0**
> 保存结果
_platform: linux_
```
subfinder -d target.com -o output.txt
```

**Step 0**
> JSON格式输出
_platform: linux_
```
subfinder -d target.com -json -o output.json
```

**Step 0**
> 批量处理域名
_platform: linux_
```
subfinder -dL domains.txt
```

---

### HTTPX  `httpx-tool`
_HTTP探测工具_

**Step 0**
> 探测HTTP服务
_platform: linux_
```
cat urls.txt | httpx
```

**Step 0**
> 获取页面标题和状态码
_platform: linux_
```
cat urls.txt | httpx -title -status-code
```

**Step 0**
> 网页截图
_platform: linux_
```
cat urls.txt | httpx -screenshot
```

**Step 0**
> 技术栈识别
_platform: linux_
```
cat urls.txt | httpx -tech-detect
```

**Step 0**
> 保存结果
_platform: linux_
```
cat urls.txt | httpx -o output.txt
```

---

### Masscan  `masscan`
_最快的互联网端口扫描器，可在5分钟内扫描整个互联网_

**Step 0**
> 以每秒1000包的速率扫描目标所有端口
```
masscan -p1-65535 target_ip --rate=1000
```
**语法解析：**
- `masscan` — 高速端口扫描器 _command_
- `-p1-65535` — 扫描全部65535个端口 _parameter_
- `--rate=1000` — 每秒发送1000个数据包 _parameter_

**Step 0**
> 扫描常用Web和数据库端口
```
masscan -p80,443,8080,8443,3306,6379,27017 target_ip/24 --rate=500
```

**Step 0**
> 支持JSON/XML/Grepable格式输出
```
masscan -p1-65535 target_ip --rate=1000 -oJ result.json
masscan -p1-65535 target_ip --rate=1000 -oX result.xml
masscan -p1-65535 target_ip --rate=1000 -oG result.grep
```

**Step 0**
> 指定网卡并排除特定IP范围
_platform: linux_
```
masscan -p1-65535 10.0.0.0/8 --rate=10000 -e eth0 --excludefile exclude.txt
```

**Step 0**
> 获取服务Banner信息
```
masscan -p80,443 target_ip/24 --banners --rate=500
```

---

### Dirsearch  `dirsearch`
_高级Web目录和文件暴力破解工具_

**Step 0**
> 扫描指定扩展名的目录和文件
```
dirsearch -u https://target.com -e php,asp,aspx,jsp,html,js
```
**语法解析：**
- `-u` — 目标URL _parameter_
- `-e` — 指定扫描的文件扩展名 _parameter_

**Step 0**
> 使用自定义字典并设置请求延迟
```
dirsearch -u https://target.com -w /usr/share/wordlists/dirb/big.txt --delay=0.5
```

**Step 0**
> 递归扫描3层深度，排除403/404
```
dirsearch -u https://target.com -e php -r -R 3 --exclude-status=403,404
```

**Step 0**
> 20线程并发，携带认证信息
```
dirsearch -u https://target.com -t 20 --cookie="session=abc123" -H "Authorization: Bearer token"
```

**Step 0**
> 输出JSON格式结果
```
dirsearch -u https://target.com -o result.json --format=json
```

---

### FeroxBuster  `feroxbuster`
_用Rust编写的高性能递归目录发现工具_

**Step 0**
> 使用SecLists字典扫描目录
```
feroxbuster -u https://target.com -w /usr/share/seclists/Discovery/Web-Content/raft-medium-directories.txt
```
**语法解析：**
- `feroxbuster` — Rust编写的高速目录枚举工具 _command_
- `-u` — 目标URL _parameter_
- `-w` — 字典文件路径 _parameter_

**Step 0**
> 递归3层，过滤状态码，限制速率
```
feroxbuster -u https://target.com -d 3 -C 403,404,500 -x php,asp,html --rate-limit 50
```

**Step 0**
> 携带认证头，30线程并发
```
feroxbuster -u https://target.com -H "Cookie: session=abc" -H "Authorization: Bearer xxx" -t 30
```

**Step 0**
> 自动调整请求速率和过滤条件
```
feroxbuster -u https://target.com --auto-tune --smart
```

---

### MassDNS  `massdns`
_高性能DNS解析器，用于子域名暴力枚举_

**Step 0**
> 使用字典文件解析子域名
_platform: linux_
```
massdns -r resolvers.txt -t A -o S -w results.txt subdomains.txt
```
**语法解析：**
- `-r resolvers.txt` — DNS解析器列表 _parameter_
- `-t A` — 查询A记录 _parameter_
- `-o S` — 简洁输出模式 _parameter_

**Step 0**
> 批量生成子域名并JSON格式输出
_platform: linux_
```
cat subdomains.txt | sed "s/$/.target.com/" > full_subs.txt
massdns -r resolvers.txt -t A -o J full_subs.txt > results.json
```

**Step 0**
> 设置并发数和哈希表大小提高性能
_platform: linux_
```
massdns -r resolvers.txt -t A -o S -w output.txt --hashmap-size 10000 -s 10000 subs.txt
```

---

### Amass  `amass`
_OWASP出品的深度攻击面映射和资产发现工具_

**Step 0**
> 仅使用被动数据源枚举子域名
```
amass enum -passive -d target.com -o results.txt
```
**语法解析：**
- `enum` — 枚举模式 _command_
- `-passive` — 仅被动收集(不发送请求) _parameter_
- `-d` — 目标域名 _parameter_

**Step 0**
> 主动DNS枚举+字典暴力破解
```
amass enum -active -d target.com -brute -w /usr/share/amass/wordlists/subdomains-top1mil.txt
```

**Step 0**
> 收集WHOIS和组织相关域名情报
```
amass intel -d target.com -whois
amass intel -org "Target Corp" -max-dns-queries 2500
```

**Step 0**
> 生成D3.js可视化图表和查看历史数据
```
amass viz -d3 -d target.com
amass db -show -d target.com
```

---

### Subfinder  `subfinder`
_被动子域名发现工具，支持多种在线数据源_

**Step 0**
> 枚举子域名并输出到文件
```
subfinder -d target.com -o subs.txt
```
**语法解析：**
- `subfinder` — 被动子域名枚举工具 _command_
- `-d` — 目标域名 _parameter_

**Step 0**
> 使用所有数据源递归枚举
```
subfinder -d target.com -recursive -all -o subs.txt
```

**Step 0**
> 与httpx联动探测存活子域名
```
subfinder -d target.com -silent | httpx -silent -status-code -title
```

**Step 0**
> 从文件读取多个域名批量枚举
```
subfinder -dL domains.txt -o all_subs.txt -t 30
```

---

### HTTPX  `httpx`
_快速多功能HTTP探针工具，用于批量探测Web服务_

**Step 0**
> 批量探测URL存活状态、标题和技术栈
```
httpx -l urls.txt -status-code -title -tech-detect -o alive.txt
```
**语法解析：**
- `-status-code` — 显示HTTP状态码 _parameter_
- `-title` — 提取页面标题 _parameter_
- `-tech-detect` — 识别Web技术栈 _parameter_

**Step 0**
> 截图、提取favicon哈希和JARM指纹
```
httpx -l urls.txt -screenshot -favicon -hash md5 -jarm
```

**Step 0**
> 过滤指定状态码并显示服务器信息
```
cat subs.txt | httpx -silent -mc 200,301,302 -content-length -web-server
```

**Step 0**
> 批量探测指定路径
```
httpx -l urls.txt -path "/api/v1/health,/admin,/.env,/robots.txt" -mc 200
```

---

### WhatWeb  `whatweb`
_Web指纹识别工具，识别网站使用的技术栈_

**Step 0**
> 识别目标网站技术栈
```
whatweb https://target.com
```
**语法解析：**
- `whatweb` — Web技术指纹识别工具 _command_

**Step 0**
> 详细输出，攻击等级3(更深度探测)
```
whatweb -v https://target.com -a 3
```

**Step 0**
> 从文件读取URL批量扫描
```
whatweb --input-file=urls.txt --log-json=results.json
```

**Step 0**
> 列出或指定使用特定插件
```
whatweb --info-plugins
whatweb -p WordPress,Joomla,Drupal https://target.com
```

---

### WAFW00F  `wafw00f`
_Web应用防火墙(WAF)检测和指纹识别工具_

**Step 0**
> 检测目标是否部署WAF及WAF类型
```
wafw00f https://target.com
```
**语法解析：**
- `wafw00f` — WAF指纹识别工具 _command_

**Step 0**
> 详细模式，测试所有WAF签名
```
wafw00f https://target.com -v -a
```

**Step 0**
> 批量检测多个URL
```
wafw00f -i urls.txt -o results.csv
```

**Step 0**
> 列出所有可识别的WAF产品
```
wafw00f -l
```

---

### DNSRecon  `dnsrecon`
_DNS枚举和信息收集工具_

**Step 0**
> 标准DNS记录枚举(SOA/NS/A/MX/TXT等)
```
dnsrecon -d target.com -t std
```
**语法解析：**
- `-d` — 目标域名 _parameter_
- `-t std` — 标准记录枚举类型 _parameter_

**Step 0**
> 尝试DNS区域传送
```
dnsrecon -d target.com -t axfr
```

**Step 0**
> 使用字典暴力枚举子域名
```
dnsrecon -d target.com -t brt -D /usr/share/wordlists/subdomains.txt
```

**Step 0**
> 对IP段进行反向DNS查询
```
dnsrecon -r 192.168.1.0/24 -t rvl
```

---

### DNSEnum  `dnsenum`
_DNS信息收集工具，支持区域传送和子域名枚举_

**Step 0**
> 枚举DNS信息(NS/MX/A/区域传送等)
```
dnsenum target.com
```

**Step 0**
> 使用字典暴力枚举子域名
```
dnsenum --enum -f /usr/share/dnsenum/dns.txt --threads 10 target.com
```

**Step 0**
> 指定DNS服务器进行枚举
```
dnsenum --dnsserver 8.8.8.8 target.com
```

---

### theHarvester  `theharvester`
_邮箱、子域名、IP等OSINT信息收集工具_

**Step 0**
> 使用所有数据源收集信息
```
theHarvester -d target.com -b all -l 500
```
**语法解析：**
- `-d` — 目标域名 _parameter_
- `-b all` — 使用所有可用数据源 _parameter_
- `-l 500` — 最大结果数 _parameter_

**Step 0**
> 使用指定数据源搜集
```
theHarvester -d target.com -b google,bing,linkedin,shodan
```

**Step 0**
> 生成HTML格式报告
```
theHarvester -d target.com -b all -f report.html
```

---
