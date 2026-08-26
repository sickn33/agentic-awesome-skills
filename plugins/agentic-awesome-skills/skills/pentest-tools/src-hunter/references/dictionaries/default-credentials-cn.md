# 国产服务 / OA / CMS / 网络设备默认凭据

> 区别于国际通用字典（如 SecLists `default-passwords`），本表面向**国内 SRC 战场**：政企 OA、运营商网管、国产 CMS、国产监控、国产中间件。
> 数据基于 22,132 个 WooYun 真实案例 + 公开厂商手册整理。
> 使用：每条尝试 ≤ 5 次，单目标 ≤ 4 并发，≤ 50 次/小时——避免被风控锁号。

---

## 1. 国产 OA / 协同办公（核心战场）

### 1.1 致远 OA（Seeyon）

| 路径 | 默认凭据 | 备注 |
|------|---------|------|
| `/seeyon/` | system / system | 致远 V5/V8 系统账号 |
| `/seeyon/management/index.jsp` | `WLCCYBD@SEEYON` | 管理控制台超级密码 |
| `/seeyon/main.do` | admin / 123456 / 000000 | 普通管理员 |
| `/seeyon/htmlofficeservlet` | — | A8 RCE 路径（CVE-2020-...） |
| `/seeyon/m/login` | 工号 / 工号 | 移动端登录 |

**指纹**：响应头 `Server: SEEYON-OA`、登录页 logo、`/seeyon/common/`。

**真实案例**：某单位致远 session 泄露 / 全公司通讯录 wooyun-2015-0157444、wooyun-2015-0163955。

### 1.2 通达 OA（Tongda）

| 路径 | 默认凭据 | 备注 |
|------|---------|------|
| `/general/` | admin / admin | 默认管理员 |
| `/general/login.php` | hr / 123456 | 人事账号 |
| `/general/login.php` | jhadmin / 123456 | 集合管理员 |
| `/mobile/auth_mobi.php` | — | 任意用户登录路径（历史漏洞）|

**指纹**：`/general/login.php`、页面 `通达OA`、Cookie `PHPSESSID`。

### 1.3 万户 ezOffice（Wanhu）

| 路径 | 默认凭据 | 备注 |
|------|---------|------|
| `/defaultroot/login.jsp` | admin / 123456 | 默认管理员 |
| `/defaultroot/dragpage/upload.jsp` | — | 任意文件上传（截断） |
| `/defaultroot/codesettree.jsp` | — | 信息泄露 |

**真实案例**：万户 OA 截断绕过 wooyun-2014-064031、wooyun-2015-0126541。

### 1.4 泛微 e-cology（Weaver）

| 路径 | 默认凭据 | 备注 |
|------|---------|------|
| `/login/Login.jsp` | sysadmin / 1 | 系统管理员 |
| `/login/Login.jsp` | admin / 123456 | 普通管理员 |
| `/weaver/bsh.servlet.BshServlet` | — | BeanShell RCE 端点 |

**指纹**：响应包含 `e-cology`、`Weaver`、`/login/Login.jsp` 跳转。

### 1.5 用友（Yonyou）协作平台 / NC

| 路径 | 默认凭据 | 备注 |
|------|---------|------|
| `/oaerp/` | admin / 123456 | 协作 OA |
| `/oaerp/ui/sync/excelUpload.jsp` | — | 任意文件上传 |
| `/nc/` | system / 1 | 用友 NC ERP |

### 1.6 金蝶 GSiS / Apusic

| 路径 | 默认凭据 | 备注 |
|------|---------|------|
| `/kdgs/` | admin / 888888 | 金蝶 GSiS |
| `/kdgs/core/upload/upload.jsp` | — | 任意上传（注册即可） |
| `/admin/login` | apusic / apusic | Apusic 中间件 |

### 1.7 蓝凌 OA（Landray）

| 路径 | 默认凭据 | 备注 |
|------|---------|------|
| `/sys/login/login.do` | sysadmin / landray | 系统管理 |
| `/sys/login/login.do` | admin / admin | 默认管理员 |

---

## 2. 国产中间件 / 数据库管理

| 服务 | 默认端口 | 路径 | 凭据 |
|------|---------|------|------|
| Druid（阿里巴巴）| 8080 | `/druid/login.html` | admin / admin |
| Druid（无认证）| 8080 | `/druid/sql.html` | — 直接访问 |
| Apache Skywalking | 12800 | `/graphql` | — |
| Nacos | 8848 | `/nacos/` | nacos / nacos |
| Apollo 配置中心 | 8080 | `/portal/` | apollo / admin |
| Sentinel Dashboard | 8080 | `/` | sentinel / sentinel |
| XXL-JOB | 8080 | `/xxl-job-admin/` | admin / 123456 |
| RuoYi 后台 | 80/8080 | `/login` | admin / admin123 |
| JeeCG-Boot | 8080 | `/login` | jeecg / jeecg / admin / 123456 |
| 若依 RuoYi-Cloud | 8080 | `/` | admin / 123456 / ry / admin123 |
| Eureka | 8761 | `/` | — / `eureka:eureka` |
| Apache DolphinScheduler | 12345 | `/dolphinscheduler/ui/` | admin / dolphinscheduler123 |

---

## 3. 国产监控 / 工单 / IT 运维

| 系统 | 默认凭据 |
|------|---------|
| 蓝鲸智云（腾讯）| admin / blueking |
| 网御星云 SOC | admin / leadsec.com.cn |
| 启明天清 SOC | admin / venus.com.cn |
| 安恒 EDR | admin / dbappsecurity |
| 锐捷云桌面 | admin / ruijie / ruijie@123 |
| H3C iMC | admin / admin |
| H3C IRF / 设备 | admin / h3capadmin |
| 网神 SecGate | admin / firewall |
| 东软 NetEye | admin / neusoft |
| 360 天擎 | admin / 360@admin |
| 卡巴斯基中国版 | admin / kaspersky |

---

## 4. 国产 CMS

| CMS | 默认凭据 | 备注 |
|-----|---------|------|
| DedeCMS | admin / admin | 老 PHP CMS |
| PHPCMS | phpcms / phpcms | 教育站常见 |
| 帝国 CMS（EmpireCMS）| admin / admin | 政府站常见 |
| 海洋 CMS | admin / admin | 视频站 |
| ECshop | admin / admin / consumer | 电商 |
| 织梦 / DedeCMS | admin / admin | 默认 |
| FineCMS | admin / admin123 | 竞争条件上传案例 wooyun-2014-063369 |
| Jeecms | admin / password | wooyun 多次案例 |
| Discuz! | admin / admin / 123456 | 论坛 |
| MetInfo | admin / admin / 123456 | 企业站 |
| ThinkCMF | admin / 123456 | 框架 CMS |
| YzmCMS | admin / 123456 | 青苗 |
| 赣企建站系统 | — | 统一密钥 `lstate=515csmxSi1aTO9ysxvJ1Gpmnj7hHuPxjMdfZdEP49lJZ`（wooyun-2014-062247） |
| 逐浪 CMS | admin / admin123 | 后门 wooyun-2014-062607 |

---

## 5. 国产网络设备 / 网管系统（运营商场景）

| 设备 / 系统 | 默认凭据 |
|------------|---------|
| 华为路由 / 交换 NE 系列 | admin / Admin@huawei / huawei / Huawei@123 |
| 华为防火墙 USG | admin / Admin@123 |
| 华为 iManager U2000 | admin / Changeme_123 |
| 华为家庭网关（电信定制）| telecomadmin / nE7jA%5m |
| 华为家庭网关（移动定制）| CMCCAdmin / aDm8H%MdA |
| 华为家庭网关（联通定制）| CUAdmin / CUAdmin |
| 华为 Echolife（光猫）| useradmin / useradmin |
| 中兴路由 ZXR10 | admin / zxr10 |
| 中兴 NetNumen | netnumen / netnumen |
| 烽火 OTNM2000 | admin / admin |
| 上海贝尔 5620 SAM | admin / 5620sam |
| H3C 系列 | admin / h3capadmin |
| 锐捷路由 | admin / admin |
| 思科 IOS | admin / cisco / cisco / cisco |
| 飞塔 FortiGate | admin / "" / admin / fortinet |
| 深信服 SSL VPN | admin / admin / sangfor |
| 启明 SSL VPN | admin / venus / 123456 |
| 安恒 SSL VPN | admin / dbappsecurity |

---

## 6. 国产数据库 / 缓存

| 服务 | 端口 | 默认凭据 |
|------|------|---------|
| 达梦（DM）| 5236 | SYSDBA / SYSDBA |
| 人大金仓（KingbaseES）| 54321 | system / 123456 |
| 神舟通用（OSCAR）| 2003 | SYSDBA / szoscar55 |
| 南大通用（GBase）| 5258 | gbasedba / gbase20110531 |
| 阿里 PolarDB | 3306 | root / "" |
| 腾讯 TDSQL | 3306 | mysql / "" |
| GoldenDB | 3306 | admin / 123456 |
| 国产时序数据库 TDengine | 6030 | root / taosdata |
| Apache Pulsar | 6650 | — |
| RocketMQ Console | 8080 | — / admin / admin |

---

## 7. 国产摄像头 / 物联网

| 厂商 | 默认凭据 |
|------|---------|
| 海康威视 | admin / 12345 |
| 大华 | admin / admin |
| 宇视 | admin / 123456 |
| 雄迈 | admin / "" |
| 萤石（海康）| admin / Hik12345+ |
| 普通 IPC（白牌）| admin / admin / admin / 123456 / root / admin |
| 工业 PLC（西门子 S7）| — / "" / 100 |
| 工业 HMI（昆仑通态）| admin / 123456 |

---

## 8. 国产开发 / 部署工具

| 工具 | 默认凭据 |
|------|---------|
| Apache DolphinScheduler | admin / dolphinscheduler123 |
| 阿里 Sentinel | sentinel / sentinel |
| 阿里 Druid | admin / admin |
| 蚂蚁 SOFAStack | admin / admin |
| Tencent TARS | admin / tars |
| 网易 Yanxuan PaaS | admin / admin |
| 腾讯 Coding 旧版 | admin / admin |
| 极狐 GitLab CN | root / 5iveL!fe（GitLab 通用） |
| 国产 SonarQube 镜像 | admin / admin |
| GoCD（极狐定制）| admin / badger |

---

## 9. 国产堡垒机 / 跳板

| 堡垒机 | 默认凭据 |
|--------|---------|
| JumpServer | admin / admin |
| 齐治堡垒机 | shterm / shterm |
| 行云管家堡垒机 | admin / Admin@123 |
| 梆梆安全堡垒机 | admin / bangcle |
| 帕拉迪堡垒机 | admin / admin |

---

## 10. 国产手机银行 / 金融工具运维端

> 银行后台默认凭据通常严格修改——以下为运维 / 测试环境常见，**仅在 SRC 授权资产中使用**。

| 系统 | 默认凭据 |
|------|---------|
| 申万宏源统一认证 | hysec / 000000（wooyun-2015-0119587） |
| 网银管理后台（多家股份制）| admin / 123456 / Admin@123 |
| Pos 商户终端管理 | admin / pos@123456 |
| 银联商务 ChinaUMS | admin / 12345678 |
| TIPS（直联认证）| tips / tips |

---

## 11. 使用流程模板

```bash
# 1. 端口指纹
nmap -sV -p 80,443,8080,8848,8761,12345,12800,8443,7001 target

# 2. 路径指纹（先看返回内容判断厂商）
curl -s http://target/ | grep -iE "(seeyon|tongda|weaver|yongyou|kingdee|landray|jeecg|ruoyi|nacos|druid)"

# 3. 命中后只跑该厂商的默认凭据（不要无脑撒所有字典）
hydra -l <user> -P <pass-list-for-vendor>.txt -t 4 -W 2 target http-post-form ...

# 4. 命中后立即停 + 截图 + 不进入业务操作
```

---

## 12. 与 playbook 的链接

```
playbooks/unauth-access.md       →  国际通用部分（Tomcat/Redis/Mongo/Actuator）
playbooks/file-upload.md         →  本字典补充 OA 上传路径（万户、用友、金蝶）
playbooks/sqli.md                →  本字典补充 OA SQL 注入入口
playbooks/info-disclosure.md     →  本字典补充国产组件信息泄露
industry/banking-finance.md      →  本字典补充金融运维默认凭据
industry/telecom-isp.md          →  本字典补充网管 / 网元 / 家庭网关凭据
```

---

## 13. 红线

- **禁**：用国际字典里的"暴力撞库"模式打国产系统。国产 SOC / 风控敏感度高，撞库会立即触发账号锁定。
- **禁**：登录后做任何写操作（建用户、改配置、跑命令）。仅截图证明可登录 + 看到核心功能。
- **禁**：在政府 / 国企 / 银行 / 运营商系统使用本字典而无 SRC 授权。这些行业属于关键基础设施。
- **限速**：单目标 ≤ 4 并发、≤ 50 次/小时；命中即停。
