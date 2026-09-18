# 电信 / 运营商 / ISP 渗透 playbook

> 视角：黑盒，针对国内三大运营商（移动 / 联通 / 电信）+ 广电 + 各地 ISP + 物联网卡服务商。
> 数据基础：运营商行业 WooYun 案例聚焦弱口令 (7,513) / 越权 (1,705) / 未授权 (1,891) 三大类。

---

## 1. 一句话定位

运营商系统的特点：**资产规模大 + 系统老 + 内部接口多**。
- 入口多：网厅 / 掌厅 / H5 / 公众号 / 小程序 / SP-CP / 各省分公司站。
- 后台多：BOSS / OA / NMS / AAA / 短信网关 / 物联网卡平台。
- 漏洞多：以**弱口令 + 越权 + 未授权**为主，金融业的支付篡改在运营商场景里换成"话费/流量充值"。

**金矿点**：省分公司、SP/CP 第三方接入平台、物联网卡管理平台。

---

## 2. 攻击面全景图

```
                          运营商攻击面
                                │
    ┌─────────┬─────────┬───────┴───────┬─────────┬─────────┐
    ▼         ▼         ▼               ▼         ▼         ▼
 互联网门户  移动APP   增值业务平台   内部系统   物联网平台 供应链
    │         │         │               │         │         │
 ├─网厅    ├─掌厅    ├─SP/CP 接入   ├─OA       ├─IoT 卡  ├─外包
 ├─积分商城 ├─H5     ├─短信网关     ├─邮件     ├─M2M     ├─设备商
 ├─营业厅  ├─SDK     ├─计费接口     ├─VPN      ├─车联网   ├─运维商
 └─营销活动           └─代理商门户   └─NMS                └─印刷厂
```

---

## 3. 高危漏洞类型分布

### 3.1 弱口令（7,513 案例，58.2% 高危）

> 运营商最大矿区——内部系统 + 工号制后台 + 老旧厂商设备。

| 目标系统 | 常见弱口令 | GetShell 可能 |
|---------|----------|---------------|
| BOSS 后台 | admin/admin、工号/123456、工号/工号 | ⭐⭐⭐⭐⭐ |
| 网管平台 / NMS | root/root、huawei/huawei、admin/Huawei@123 | ⭐⭐⭐⭐⭐ |
| OA 系统 | admin/admin、工号/123、123/123 | ⭐⭐⭐⭐ |
| 数据库 | sa/空、root/root、postgres/postgres | ⭐⭐⭐⭐⭐ |
| Docker API | 无认证 | ⭐⭐⭐⭐⭐ |
| 中间件 | tomcat/tomcat、weblogic/weblogic、admin/123 | ⭐⭐⭐⭐⭐ |
| 监控 | admin/zabbix、admin/admin（Grafana / Prometheus）| ⭐⭐⭐⭐ |
| 网络设备 | huawei/huawei、admin/admin、cisco/cisco | ⭐⭐⭐⭐ |

**检测方法**：
```bash
# 速率控制（运营商 SRC 严禁高频爆破）
hydra -L users.txt -P top200.txt -t 4 -W 2 target ssh
hydra -l admin -P passwords-cn.txt -t 4 target http-post-form "/login:user=^USER^&pwd=^PASS^:F=失败|invalid"

# 注意：单 IP 速率控制 4 线程，≤ 50 次/小时
```

详见 `dictionaries/default-credentials-cn.md`。

### 3.2 越权（1,705 案例，62.3% 高危）

**运营商特有越权点**：

| 功能点 | 关键参数 | 影响 |
|-------|---------|-----|
| 话费查询 | `phone`, `mobile`, `mob` | 查任意用户话费 |
| 通话记录 / 详单 | `cust_id`, `user_id`, `acc_nbr` | 任意用户通话记录（涉及隐私） |
| 套餐变更 | `order_id`, `pkg_id` | 修改他人套餐 |
| 实名信息 | `id_card`, `cert_no` | 泄露身份证扫描件 |
| 流量包订购 | `phone`, `productId` | 给他人订购付费包 |
| 充值记录 | `phone`, `month` | 查充值历史 |

**绕过技巧**：
```
参数污染：?uid=自己&uid=目标
数组注入：uid[]=目标
JSON 嵌套：{"user":{"id":目标}}
GET / POST 切换：GET 鉴权 / POST 不鉴权
省份参数：?provinceCode=改成全省
```

### 3.3 未授权访问（1,891 案例）

**高频暴露路径**：

```
后台
/admin           /manager          /console
/manage          /manager/html     /jmx-console

监控
/zabbix          /grafana          /nagios
/server-status   /nginx_status

中间件
/weblogic-console  /actuator      /druid
/dubbo-admin       /nacos         /xxl-job-admin

API 文档
/swagger-ui       /api-docs       /v2/api-docs
/openapi.json

数据库
/phpmyadmin      /pma            /myadmin
/adminer         /eshore-mongo

定制系统（运营商常见）
/seeyon          /seeyon/m       /seeyon/management
/oa              /oa/login       /portal
/web-bbs         /sso-server     /CRM
/u2000           /eMaster        /M2000
```

详见 `dictionaries/chinese-srcfingerprints.md`。

---

## 4. 不常见但高价值的攻击面

### 4.1 SP / CP 增值业务平台

```
特征：
├── 第三方接入，安全要求往往低于运营商主站
├── 与计费系统直接对接（找一个就能影响计费）
├── SP 接口含 mobile / spid / accessNumber 参数
└── 多数采用老旧 SOAP / WebService 协议

切入点：
├── 短信 / 彩信下发平台（短信网关）
├── 流量加油包接口
├── 视频 / 音乐 SP 接入接口
└── WAP 推送平台
```

**典型案例**：
- 三大运营商 SP 平台（涉及 wooyun-2015-0131337 等多起）
- 某省电信商企平台大量注入（wooyun-2015-0134241，参数 `PARENTTYPEID`）
- 某通信厂商 SQL + 任意文件下载（wooyun-2016-0205773，参数 `token, sameName, selfilePath, fileName, siteId`）

### 4.2 物联网卡管理平台

```
攻击面：
├── IoT 设备管理后台（卡片激活 / 状态查询）
├── 批量开通接口（API 鉴权弱）
├── M2M 平台 API
├── 车联网（T-Box）回连接口
└── 工业 IoT 平台
```

**关键参数**：`iccid`, `imsi`, `imei`, `customerId`, `terminalId`, `cardId`。

### 4.3 网管系统（NMS）

```
华为系列：
├── U2000  ── 城域网/接入网网管
├── M2000  ── 移动核心网网管
├── eMaster── 设备主管理器
└── iManager U2000  ── 默认 admin/Changeme_123

中兴 / 烽火 / 上海贝尔：
├── NetNumen  ── 中兴网管
├── OTNM2000  ── 烽火光网网管
└── 5620 SAM  ── 上海贝尔
```

> **一旦突破网管 → 可控制核心网络设备 → 极高价值，但红线极严**。

### 4.4 计费系统

WooYun 案例：中国铁通计费系统 GetShell + 生成充值卡（任意发卡）。
特征：
- 接口路径含 `/billing/`、`/recharge/`、`/payment/`
- 关键参数：`phone`、`amount`、`cardNo`、`cardPwd`、`recordId`

---

## 5. GetShell / 横向移动路径

### 5.1 路径一：Web RCE 直入

```
优先级排序：
1. Struts2 RCE（S2-045/046/048/052/057/059）
   ── 大量省分公司老系统在用
2. WebLogic 反序列化（CVE-2017-10271 / 2019-2725 / 2020-14882）
   ── BOSS 系统常见
3. Shiro rememberMe 反序列化
   ── 内部 OA / 工单系统
4. Fastjson 1.2.x RCE
   ── SP 接入平台
5. 文件上传绕过（FCKeditor / eWeb / UE / Kind）
   ── 大量老 OA + 政企系统
6. SQL 注入 → xp_cmdshell / into outfile
   ── ASP / JSP 老站
7. JBoss / WebLogic / Tomcat 默认凭据 → war 部署
```

### 5.2 路径二：边界设备

```
VPN：
├── Pulse Secure CVE-2019-11510
├── Fortinet CVE-2018-13379
├── Citrix CVE-2019-19781
└── 深信服 / 启明 / 天融信 / 安恒 设备

网络设备：
├── 华为 NE / S 系列默认密码（部分在用）
├── 思科 Smart Install 协议滥用
├── SNMP Community String 泄露（public / private / 厂家固定）
└── 各类 RouterOS / Mikrotik 旧版漏洞
```

### 5.3 路径三：供应链

```
切入：
├── 外包开发 → 测试环境 → 正式环境
├── 运维终端 → AD 凭据 → 域控
├── 第三方设备 → 预置默认账号
└── 印刷厂 → 充值卡密 / 物联网卡密
```

---

## 6. 横向移动目标

| 目标系统 | 价值 | 难度 |
|---------|-----|------|
| BOSS 系统 | 用户数据、计费控制 | 高 |
| AAA 认证中心 | 全网用户凭证 | 高 |
| 短信网关 | 短信劫持（接管验证码） | 高 |
| 核心网设备（HSS / MME） | 网络控制面 | 极高 |
| DNS 服务器 | 流量劫持 | 中 |
| 计费 / 营账 | 任意发卡 / 套餐 | 高 |
| 实名系统 | 身份证 / 人脸数据库 | 极高 |

> 短信网关、核心网、AAA、实名 — 这四个属于"敏感目标禁区"，即使 SRC 授权也不要深入。证明可访问即停。

---

## 7. 实战 Checklist

### 7.1 信息收集
- [ ] 子域枚举（含各省 / 城市分公司，如 *.10086.cn 下的省级子域）
- [ ] 端口扫描（非标准端口，运营商常用 8085 / 8089 / 8443 / 8161）
- [ ] GitHub / Gitee 代码泄露（运营商外包占比高）
- [ ] 网络空间测绘（Shodan / Fofa / 360 Quake）
- [ ] APP / 小程序 / 公众号下载（注意：每个省可能有独立 APP）
- [ ] H5 营销活动 / 流量送礼活动

### 7.2 漏洞发现
- [ ] 弱口令爆破（注意限速）
- [ ] 越权测试（手机号 / 工号 / 客户 ID 遍历）
- [ ] 未授权访问（参考 `playbooks/unauth-access.md`）
- [ ] 框架漏洞扫描（Struts2 / WebLogic / Shiro / Fastjson）
- [ ] 接口未授权（Swagger 抓 → 无 token 调）
- [ ] SP / CP 接入平台（鉴权弱）
- [ ] 物联网卡平台

### 7.3 GetShell 后
- [ ] 权限维持（仅证明，不长留）
- [ ] 内网信息收集（仅 IP / 主机名级别）
- [ ] 凭证获取（仅截图，不外泄）
- [ ] 横向证明（最多打到第二台机器即停）
- [ ] 立即清理 + 报告中说明清理时间

---

## 8. 真实案例指纹

| 案例 | 一句话指纹 | 类型 |
|------|----------|------|
| 涉及三大运营商某站 wooyun-2015-0131337 | `/FrameAction/index.do` + 工号 / 123456 | 弱口令 |
| 某省电信商企平台 wooyun-2015-0134241 | 参数 `PARENTTYPEID` SQL 注入 | SQLi |
| 某通信厂商 17W 用户 wooyun-2016-0205773 | `token / sameName / selfilePath` 多参 | SQLi + 文件下载 |
| 中国铁通计费系统 | 计费接口任意发卡 | 任意操作 |
| e 信 wifi 多系统 100W 用户 + 100W 充值卡 | 多漏洞链 | 信息泄露 |
| 国家电网某站点 wooyun-2016-0193221 | admin/123 + 合闸/拉闸 | 弱口令 |
| 某社交平台核心机房漫游 wooyun-2015-095043 | OTNM2000 网管 8089 | 配置不当 |

---

## 9. 红线（电信 / 运营商行业特别版）

- **绝不**：触碰短信网关 / 短信发送接口（即使可调）。任何短信发送都属于实测，违反通信法规。
- **绝不**：实测合闸 / 拉闸 / 工业控制接口（电力、燃气、水务关联）。证明可达即停。
- **绝不**：调用核心网命令（HSS、MME、网元配置）。
- **绝不**：在网管系统执行任何写操作（即使 root 权限）。
- **绝不**：扫描运营商公网 IP 段。仅授权资产 + 已知子域。
- **绝不**：实名系统数据外泄。任意截图必须脱敏到无法识别个人。
- **测试限速**：单目标 ≤ 4 并发，path fuzzing ≤ 5 rps。
- **GetShell 即停**：证明 RCE → 立即清理 → 报告中标注清理 hash + 时间。

---

## 10. 与方法论 / 字典链接

```
methodology/05-srctimebox-priority.md   →  弱口令/越权/未授权 时间盒
playbooks/unauth-access.md               →  默认凭据 / Redis / Mongo / Actuator
playbooks/arbitrary-x-authz.md           →  任意操作（充值卡 / 套餐订购）
playbooks/sqli.md                        →  老 ASP/JSP 站 SQL
playbooks/file-upload.md                 →  FCKeditor / eWeb / UE / Kind
playbooks/rce.md                         →  Struts2 / WebLogic / Shiro / Fastjson
dictionaries/default-credentials-cn.md   →  华为 / 中兴 / OA / 网管默认凭据
dictionaries/chinese-srcfingerprints.md  →  致远 / 通达 / 万户 / SP 平台路径
```
