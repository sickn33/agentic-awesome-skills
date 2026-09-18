# APK 安全测试速查

> 基于 OWASP MASTG（Mobile Application Security Testing Guide）整理。
> 覆盖静态分析、动态分析、网络通信、数据存储、认证授权、代码保护六大维度。

---

## 静态分析检查清单

### Manifest 审计

```text
□ android:debuggable="true" → 可调试（生产环境不应出现）
□ android:allowBackup="true" → 数据可备份提取
□ android:exported="true" 的组件 → 暴露的 Activity/Service/Receiver/Provider
□ 自定义权限 protectionLevel → 是否为 normal（应为 signature）
□ intent-filter 中的 scheme → 自定义 deeplink 是否可被劫持
□ android:usesCleartextTraffic="true" → 允许明文 HTTP
□ minSdkVersion 过低 → 可能缺少安全特性
```

### 代码审计关键点

```text
□ 硬编码密钥/Token（搜索 "key"、"secret"、"password"、"api_key"）
□ 不安全的随机数（java.util.Random 而非 SecureRandom）
□ 不安全的加密（ECB 模式、DES、MD5 用于密码）
□ WebView 配置（setJavaScriptEnabled + addJavascriptInterface = RCE 风险）
□ SQL 注入（rawQuery 拼接用户输入）
□ 路径遍历（ContentProvider 的 openFile 未校验路径）
□ 日志泄露（Log.d/Log.i 输出敏感信息）
□ 剪贴板泄露（ClipboardManager 存储敏感数据）
□ 隐式 Intent 泄露（sendBroadcast 未指定包名）
```

### 第三方库审计

```text
□ 过时的 OkHttp/Retrofit 版本（已知漏洞）
□ 过时的 WebView 内核
□ 含已知漏洞的 SDK（检查 CVE）
□ 广告 SDK 数据收集范围
□ 推送 SDK 配置（是否泄露 token）
```

---

## 动态分析检查清单

### Frida Hook 优先目标

| 目标 | Hook 点 | 目的 |
|------|---------|------|
| 登录认证 | `LoginActivity.login()` | 观察凭证处理 |
| 签名生成 | `*Sign*`、`*sign*`、`*encrypt*` | 还原签名算法 |
| SSL Pinning | `CertificatePinner.check` | 绕过抓包 |
| Root 检测 | `*root*`、`*su*`、`*magisk*` | 绕过检测 |
| 加密操作 | `javax.crypto.Cipher` | 提取密钥/IV |
| Token 存储 | `SharedPreferences.getString` | 观察 token 读写 |
| 网络请求 | `OkHttpClient.newCall` | 观察请求构造 |

### 常用 Frida 一行命令

```bash
# 追踪所有加密操作
frida-trace -U -f com.target.app -j '*Cipher*!*'

# 追踪所有 HTTP 请求
frida-trace -U -f com.target.app -j '*OkHttp*!*'

# 追踪 SharedPreferences 读写
frida-trace -U -f com.target.app -j '*SharedPreferences*!*'

# 追踪所有 native 函数调用
frida-trace -U -f com.target.app -i 'Java_*'
```

### Objection 快速命令

```bash
# 连接
objection -g com.target.app explore

# 常用命令
android hooking list activities
android hooking list services
android sslpinning disable
android root disable
android clipboard monitor
env                              # 查看应用目录
sqlite connect <db_path>         # 连接数据库
```

---

## 网络通信安全

### 抓包配置

```text
方法 1: 系统代理 + Burp/mitmproxy
- 设置 WiFi 代理 → Burp 监听地址
- 安装 CA 证书到设备
- Android 7+ 需要 network_security_config 或 Frida 绕过

方法 2: VPN 模式（推荐）
- 使用 HttpCanary / Packet Capture
- 不需要 root，不需要配置代理
- 但无法解密 SSL Pinning 的流量

方法 3: Frida + r2frida
- 直接在进程内拦截网络调用
- 不受代理/VPN 限制
```

### 检查项

```text
□ 是否使用 HTTPS（所有 API 调用）
□ 是否有 SSL Pinning（证书绑定）
□ 证书验证是否正确（不接受自签名）
□ 是否有证书透明度（CT）检查
□ API 密钥是否在请求中明文传输
□ Token 是否有过期机制
□ 是否有请求签名防篡改
□ 是否有重放攻击防护（nonce/timestamp）
□ WebSocket 是否加密
□ 是否有敏感数据在 URL 参数中（会被日志记录）
```

---

## 数据存储安全

### 检查位置

| 位置 | 风险 | 检查命令 |
|------|------|---------|
| SharedPreferences | 明文存储 token/密码 | `adb shell cat /data/data/pkg/shared_prefs/*.xml` |
| SQLite 数据库 | 未加密的敏感数据 | `adb pull /data/data/pkg/databases/` |
| 外部存储 | 任何应用可读 | `adb shell ls /sdcard/Android/data/pkg/` |
| 应用日志 | 泄露调试信息 | `adb logcat \| grep pkg` |
| 备份文件 | allowBackup=true | `adb backup -f backup.ab pkg` |
| 键盘缓存 | 输入历史 | 检查 `inputType` 是否为 `textPassword` |
| 截图保护 | 敏感页面可截图 | 检查 `FLAG_SECURE` |

### 加密存储方案对比

| 方案 | 安全性 | 说明 |
|------|--------|------|
| SharedPreferences 明文 | ❌ | root 后直接读取 |
| EncryptedSharedPreferences | ✓ | AndroidX Security 库 |
| SQLCipher | ✓ | 加密 SQLite |
| Android Keystore | ✓✓ | 硬件级密钥保护 |
| 自定义 AES 加密 | ⚠️ | 取决于密钥管理 |

---

## 认证与授权

### 常见漏洞

| 漏洞 | 测试方法 |
|------|---------|
| 弱密码策略 | 尝试 123456、password 等 |
| 无锁定机制 | 暴力破解登录接口 |
| Token 不过期 | 登出后重放旧 token |
| 越权访问 | 修改请求中的 user_id |
| 短信验证码可爆破 | 4/6 位数字无频率限制 |
| OAuth 配置错误 | redirect_uri 可篡改 |
| 生物认证绕过 | Hook BiometricPrompt |
| 设备绑定绕过 | 修改 device_id |

### 测试 Payload

```bash
# 越权测试
curl -H "Authorization: Bearer USER_A_TOKEN" \
     "https://api.target.com/users/USER_B_ID/profile"

# Token 重放
# 1. 正常登录获取 token
# 2. 登出
# 3. 用旧 token 请求 → 应该返回 401

# 短信验证码爆破
for code in $(seq 0000 9999); do
    curl -X POST "https://api.target.com/verify" \
         -d "phone=13800138000&code=$code"
done
```

---

## 代码保护评估

| 保护措施 | 检测方法 | 绕过难度 |
|---------|---------|---------|
| ProGuard 混淆 | jadx 查看类名是否为 a/b/c | 低（只是重命名） |
| 字符串加密 | 搜索解密函数，Hook 获取明文 | 中 |
| 反调试 | 尝试 attach debugger | 中（Frida 可绕过） |
| Root 检测 | 在 root 设备上运行 | 中（通用脚本绕过） |
| 模拟器检测 | 在模拟器上运行 | 低-中 |
| 完整性校验 | 修改 APK 后安装 | 中（patch 校验函数） |
| 加固/壳 | 查看入口类和 .so | 中-高（需脱壳） |
| Native 保护 | 核心逻辑在 .so | 高（需 IDA 分析） |
| VMP 虚拟化 | 代码被虚拟化执行 | 极高 |

---

## 快速测试流程（30 分钟）

```text
1. [5min] 解包 + Manifest 审计
   apktool d app.apk
   检查 debuggable/allowBackup/exported/cleartext

2. [10min] 代码快速审计
   jadx -d out app.apk
   搜索: password, key, secret, token, http://

3. [5min] 网络测试
   配置代理 → 操作 APP → 检查是否有明文/弱加密

4. [5min] 存储检查
   adb shell → 检查 shared_prefs 和 databases

5. [5min] 动态验证
   Frida hook 关键函数 → 确认发现
```
