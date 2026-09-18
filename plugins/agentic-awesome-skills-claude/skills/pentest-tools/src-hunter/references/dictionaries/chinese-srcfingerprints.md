# 国产组件指纹 + 路径 + 高频参数字典

> 区别于 H1 / SecLists / OWASP 等英文字典——本目录补 CN 战场缺口：
> 1. 国产 OA / CMS / 中间件指纹（如何识别）
> 2. 国产编辑器 / OA / 网管的高危默认路径
> 3. 27,732 个 WooYun SQLi 案例提炼的高频参数 = 国产 SRC 参数字典

---

## 1. 国产 OA / 中间件指纹

### 1.1 致远 OA（Seeyon）

```
HTTP 头：
  Server: SEEYON-OA
  Set-Cookie: JSESSIONID=...
  X-Powered-By: SEEYON

URL 特征：
  /seeyon/                      默认根路径
  /seeyon/main.do                登录后主页
  /seeyon/management/index.jsp   管理控制台
  /seeyon/htmlofficeservlet      A8 RCE 端点
  /seeyon/common/                公共资源

页面特征：
  <title>致远协同管理软件</title>
  COMMON.NEED_LOGIN
  ctp.* 命名空间

日志泄露：
  /ctp.log（23 例命中）
  /seeyon/logs/ctp.log
```

### 1.2 通达 OA（Tongda）

```
URL 特征：
  /general/                  默认根路径
  /general/login.php         登录入口
  /mobile/auth_mobi.php      移动端鉴权
  /ispirit/                  早期版本根路径
  /Pda/                      移动 PDA 接口

页面特征：
  <title>通达OA</title>
  Set-Cookie: PHPSESSID=...
  历史漏洞：/ispirit/interface/gateway.php

文件结构：
  /general/skin/             皮肤资源
  /general/templates/        模板
```

### 1.3 万户 ezOffice（Wanhu）

```
URL 特征：
  /defaultroot/             根路径
  /defaultroot/login.jsp    登录
  /defaultroot/dragpage/    任意上传点
  /defaultroot/codesettree.jsp 信息泄露
  /defaultroot/upload.jsp   上传接口

页面特征：
  <title>万户ezOFFICE</title>
  万户网络 logo
```

### 1.4 泛微 e-cology / e-office（Weaver）

```
URL 特征：
  /login/Login.jsp                       e-cology 登录
  /weaver/bsh.servlet.BshServlet         BeanShell RCE 端点
  /mobile/                               移动端
  /api/                                  API 网关
  /workflow/                             工作流

页面特征：
  e-cology 字样
  Set-Cookie: JSESSIONID=...; ecology_JSessionId=...
```

### 1.5 用友 / 金蝶 / 蓝凌

```
用友 NC：
  /nc/                  根路径
  /nc/servlet/          servlet 路径
  /portal/              门户
  指纹: <title>用友NC</title>

用友 协作 OA：
  /oaerp/
  /oaerp/ui/sync/excelUpload.jsp 任意上传

金蝶 GSiS / EAS：
  /kdgs/                根路径
  /kdgs/core/upload/    上传点
  /eas/                 EAS 主路径
  指纹: KingdeeApp / kdgs

蓝凌 LandrayOA：
  /sys/login/login.do
  /sys/web/index.jsp
  指纹: 蓝凌
```

### 1.6 国产中间件 / 框架

```
Druid（阿里）：
  /druid/index.html         监控面板
  /druid/sql.html           SQL 监控
  /druid/weburi.html        URL 监控
  /druid/login.html         登录
  指纹: <title>Druid</title>

Apache Dubbo Admin：
  /dubbo-admin/             管理面板
  指纹: dubbo

Nacos：
  /nacos/v1/auth/users      用户接口
  /nacos/                   控制台
  指纹: <title>Nacos</title>

XXL-JOB：
  /xxl-job-admin/           调度中心
  指纹: <title>任务调度中心</title>

Apollo 配置中心：
  /portal/                  门户
  /eureka/apps              服务列表
  指纹: apollo / Apollo

Skywalking：
  /graphql                  GraphQL 接口
  /                         UI
  指纹: <title>SkyWalking</title>

RuoYi / JeecgBoot：
  /login                    通用登录
  /system/user              用户管理
  /jeecg-boot/              JeecgBoot 前缀
  指纹: ruoyi / jeecg-boot
```

---

## 2. 国产高危默认路径

### 2.1 OA / 协同（高频文件上传 / SQL 注入入口）

| 路径 | 系统 | 漏洞类型 |
|------|------|---------|
| `/seeyon/htmlofficeservlet` | 致远 OA | RCE |
| `/seeyon/thirdpartyController.do` | 致远 OA | SSRF / 信息泄露 |
| `/general/login.php` | 通达 OA | 弱口令 |
| `/mobile/auth_mobi.php` | 通达 OA | 任意用户登录 |
| `/ispirit/interface/gateway.php` | 通达 OA | RCE（历史漏洞）|
| `/defaultroot/dragpage/upload.jsp` | 万户 OA | 任意文件上传 |
| `/weaver/bsh.servlet.BshServlet` | 泛微 e-cology | RCE |
| `/oaerp/ui/sync/excelUpload.jsp` | 用友协作 | 任意文件上传 |
| `/kdgs/core/upload/upload.jsp` | 金蝶 GSiS | 任意文件上传 |

### 2.2 富文本编辑器（占文件上传案例 42% 案例）

```
FCKeditor（占 48%）：
  /FCKeditor/editor/filemanager/browser/default/connectors/test.html
  /FCKeditor/editor/filemanager/browser/default/connectors/jsp/connector
  /FCKeditor/editor/filemanager/upload/test.html
  /FCKeditor/UserFiles/                 ← 上传后路径

eWebEditor（占 28%）：
  /ewebeditor/admin/default.jsp
  /ewebeditor/admin_login.asp
  /ewebeditor/admin_uploadfile.asp
  /ewebeditor/php/upload.php
  /ewebeditor/uploadfile/                ← 上传后路径

UEditor（占 12%）：
  /ueditor/controller.jsp?action=config
  /ueditor/jsp/controller.jsp
  /ueditor/net/controller.ashx
  /ueditor/php/controller.php
  /ueditor/php/upload/                   ← 上传后路径

KindEditor（占 8%）：
  /kindeditor/php/upload_json.php
  /kindeditor/jsp/upload_json.jsp
  /kindeditor/asp/upload_json.asp
  /kindeditor/attached/                  ← 上传后路径
```

### 2.3 信息泄露专用路径（按 WooYun 案例命中率）

```
版本控制泄露（560 例）：
  /.git/config                          Git 远程地址
  /.git/HEAD                            分支
  /.git/index                           索引
  /.svn/entries                         SVN 1.6
  /.svn/wc.db                           SVN 1.7+

备份压缩包（530 例 wwwroot.rar）：
  /wwwroot.rar         /wwwroot.zip      /www.zip
  /web.rar             /web.zip          /backup.zip
  /site.tar.gz         /db.sql.gz        /{域名}.zip
  /{域名}.rar          /backup.sql.gz

SQL 备份（136 例 backup.sql）：
  /backup.sql          /database.sql     /db.sql
  /dump.sql            /{库名}.sql       /data.sql

配置备份（101 例 config.php.bak）：
  /config.php.bak      /web.config.bak   /.env.bak
  /config_global.php.bak                 /uc_server/data/config.inc.php.bak

PHP 探针（47/38/34 例）：
  /phpinfo.php         /info.php         /test.php
  /1.php               /t.php            /probe.php
  /i.php               /debug.php

日志（23 例致远 ctp.log）：
  /ctp.log             /logs/ctp.log     /debug.log
  /error.log           /access.log       /application.log
  /runtime/logs/                         /storage/logs/

.NET 配置（36 例 web.config）：
  /web.config          /App_Data/        /bin/
  /connectionStrings.config
```

### 2.4 国产中间件管理面（弱口令必扫）

```
Druid 监控：
  /druid/index.html         /druid/sql.html
  /druid/weburi.html        /druid/login.html

Nacos：
  /nacos/                   /nacos/v1/auth/users

Apollo：
  /portal/                  /openapi/

Sentinel：
  /                         /resource/machineResource.json

XXL-JOB：
  /xxl-job-admin/           /xxl-job-admin/jobinfo

DolphinScheduler：
  /dolphinscheduler/ui/     /dolphinscheduler/login

RuoYi（必爆破，几乎裸奔）：
  /admin/                   /system/user
  /monitor/                 /tool/swagger

JeecgBoot：
  /jeecg-boot/              /sys/user

阿里云 SLS / 腾讯 CLS 控制台（云上 SaaS 偶有自部署）：
  /cls/                     /sls/
```

### 2.5 网管 / 运营商系统

```
华为：
  /web/                     /eMaster/    /U2000/
  /uweb/                    /system/login.do

中兴：
  /netnumen/                /web-portal/

烽火：
  /OTNM2000_ch/             /OTNM2000/

电信营业系统：
  /BOSS/                    /CRM/      /AAA/
  /CSM/                     /partner/

省分公司接入：
  /webCompAction.do         参数 PARENTTYPEID
  /sso-server/
  /LoginLBS/
```

### 2.6 监控 / 工单 / 内部系统

```
zabbix：
  /zabbix/                  /zabbix/api_jsonrpc.php

蓝鲸智云（腾讯）：
  /console/                 /uac/login

Grafana：
  /login                    /api/datasources

Prometheus：
  /                         /metrics

Jaeger / Skywalking：
  /jaeger/                  /api/

国产工单：
  /smartbi/                 SmartBI 报表
  /finereport/              帆软 FineReport
  /webroot/decision/        FineReport 决策平台
```

---

## 3. 高频参数字典（基于 27,732 SQLi + 业务案例）

### 3.1 SQL 注入高频参数（直接抄入 fuzz 字典）

```
id (12 例)        action (5 例)     aid (3 例)        typeid (2 例)
typeId (2 例)     username (2 例)   act (2 例)        m (2 例)
y (2 例)          a (2 例)          method (1 例)     bid (1 例)
mid (1 例)        out_trade_no (1 例)
fileName (1 例)   siteId (1 例)     dir (1 例)        systemID (1 例)
PARENTTYPEID (1 例)  Channel (1 例) sameName (1 例)   selfilePath (1 例)
token (1 例)      ObjName (1 例)    MODE (1 例)       Target (1 例)
Title (1 例)      rd (1 例)         version (1 例)    newsid (1 例)
categoryid (1 例) puid (1 例)       c (1 例)          k (1 例)
o (1 例)          cmd (1 例)        trueName (1 例)
```

> 用法：把以上参数名灌入 sqlmap `--param-filter` 或自写 fuzzer 优先扫。命中率比通用 `id/name/q` 高一档。

### 3.2 业务逻辑高频参数

```
密码重置：
  phone / mobile / username / userName / userAccount
  code / smsCode / verifyCode / captcha / authCode
  token / step / reset_token

越权 / IDOR：
  id / uid / userId / user_id / oid / orderId / order_id
  addrid / hotelid / file_id / msg_id / doc_id
  account_id / tenant_id / cust_id / employeeid

支付 / 订单：
  amount / price / total / fee / total_fee
  quantity / count / num
  productId / sku / goodsId
  status / payStatus / orderStatus
  out_trade_no / trade_no / nonce_str
  mch_id / appid / sign / signature
  notify_url / return_url / callback_url

授权篡改：
  role / role_id / isAdmin / is_admin / level
  permissions / authorities / aid

回调 / 重定向：
  url / redirect / redirect_uri / callback
  jumpurl / next / continue / returnUrl

文件操作：
  fileName / file / path / dir / filepath
  filename / file_path / fileLocation

电信特化：
  phone / mobile / mob / acc_nbr
  cust_id / serv_id / pkg_id
  cardId / iccid / imsi / imei

日志 / 调试：
  debug / test / sandbox / env
```

### 3.3 任意 X 子授权高频字段

```
注册时塞 admin：
  role=admin          is_admin=true       admin=1
  level=9             role_id=1           permissions=["*"]
  authorities=["ROLE_ADMIN"]              userType=0

登录时改账号：
  username=admin      userAccount=admin
  X-User-Id: 1        X-Real-User: admin  X-Original-User: admin
  Cookie: userId=1; isAdmin=1; role=admin

签名绕过：
  sign=""             sign=null           sign 字段删除
  signature=00000000  signature=anything

伪造内网：
  X-Forwarded-For: 127.0.0.1
  X-Real-IP: 127.0.0.1
  X-Originating-IP: 127.0.0.1
  X-Client-IP: 127.0.0.1
  X-Remote-IP: 127.0.0.1
  Forwarded: for=127.0.0.1
```

---

## 4. 高频 URL 路径模式（fuzzing 字典）

### 4.1 后台路径（中文站常见）

```
/admin/             /admin.php          /admin/index.php
/manage/            /manage.php         /manager/
/houtai/            /admincp/           /system/login
/console/           /web-console/       /jmx-console/
/admin_login.aspx   /admin/Login.aspx   /Admin/Default.aspx
/login.do           /Login.jsp          /index.jsp?login
/web/login          /api/admin/login

中文常见但易被忽略的：
/houtai             /guanli             /backstage
/bgmanage           /control            /portal/admin
/agent/             /shop/admin         /merchant/
/dealer/            /partner/login
```

### 4.2 API 文档 / 调试

```
/swagger-ui.html    /swagger-ui/        /v2/api-docs
/v3/api-docs        /api-docs           /openapi.json
/swagger/           /swagger.json
/api/swagger
/druid/             /actuator/          /debug/
/test/              /dev/               /staging/
/api/v1/admin_is_login                  /api/configs
/api/debug          /api/version
```

### 4.3 国产移动端 H5 / 小程序接入

```
/wechat/            /weixin/            /mp/
/applet/            /miniapp/           /xcx/
/h5/                /m/                 /mobile/
/app/               /api/app/           /api/h5/
/wxLogin            /wx/login           /wechat/auth
/openid             /unionid
```

### 4.4 SP / CP / 物联网（电信特化）

```
/sp/                /cp/                /sp-cp/
/sms/               /smsgw/             /sendSms
/iot/               /m2m/               /iot-card/
/billing/           /recharge/          /payment/
/order/charge       /api/charge

参数：phone / mobile / iccid / imsi / cardId / spid / appid
```

---

## 5. 文件指纹检测一行命令

```bash
# 检 OA / 中间件指纹
for path in /seeyon/ /general/login.php /defaultroot/login.jsp \
            /login/Login.jsp /oaerp/ /kdgs/ /sys/login/login.do \
            /druid/index.html /nacos/ /xxl-job-admin/ \
            /jeecg-boot/ /admin/ ; do
  curl -s -o /dev/null -w "%{http_code} $path\n" http://target$path
done

# 检信息泄露
for path in /.git/config /.svn/entries /wwwroot.rar /backup.sql \
            /config.php.bak /phpinfo.php /web.config.bak /ctp.log ; do
  curl -s -o /dev/null -w "%{http_code} $path\n" http://target$path
done

# 检编辑器
for path in /FCKeditor/editor/filemanager/browser/default/connectors/test.html \
            /ewebeditor/admin/default.jsp \
            /ueditor/controller.jsp?action=config \
            /kindeditor/php/upload_json.php ; do
  curl -s -o /dev/null -w "%{http_code} $path\n" http://target$path
done
```

---

## 6. 与 playbook / industry 链接

```
playbooks/file-upload.md       →  本字典补充国产编辑器 / OA 上传路径
playbooks/info-disclosure.md   →  本字典补充国产命中率最高的备份/日志路径
playbooks/sqli.md              →  本字典补充 27,732 SQLi 案例的高频参数
playbooks/unauth-access.md     →  本字典补充国产中间件 / OA 默认路径
industry/banking-finance.md    →  金融常用 OA 指纹（致远 / 用友 / 金蝶）
industry/telecom-isp.md        →  电信常用网管 / SP 平台路径
```

---

## 7. 红线

- **指纹 ≠ 漏洞**。识别出致远 OA 不等于直接打 RCE，仍需走对应 playbook 走完证据链。
- **路径请求** 速率 ≤ 5 rps，避免 fuzzing 触发 WAF / SOC。
- **登录后** 不进行写操作（建用户、上传文件、调命令）。
- **指纹库** 不做大规模互联网爆扫——仅在 SRC 授权资产 / HVV 演练范围内使用。
