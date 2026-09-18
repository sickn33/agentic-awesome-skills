---
name: mobile-reverse
description: "Authorized Android/iOS application reverse engineering and security testing: APK/IPA analysis, runtime instrumentation (Frida/Objection), SSL-pinning and jailbreak/root-detection bypass, per OWASP MASTG."
risk: offensive
source: "https://github.com/zhaoxuya520/reverse-skill"
source_repo: "zhaoxuya520/reverse-skill"
source_type: community
date_added: "2026-08-25"
license: "MIT"
license_source: "https://github.com/zhaoxuya520/reverse-skill/blob/main/LICENSE"
---
> **⚠️ AUTHORIZED USE ONLY**
> This skill is for educational purposes or authorized security assessments only.
> You must have explicit, written permission from the system owner before using this tool.
> Misuse of this tool is illegal and strictly prohibited.

> **Mandatory confirmation gate**
> Before running any command that probes, exploits, changes, persists on, extracts data from, or attempts credential access against a target:
> 1. Ask the user to state the exact target URL, IP, account, or resource.
> 2. Ask the user to confirm written authorization and the permitted scope.
> 3. Show the exact command(s) and explain their expected effect.
> 4. Wait for explicit confirmation in the current conversation.
>
> Without that confirmation, remain read-only and provide defensive guidance only. Prefer a sandbox, disposable VM, or controlled lab.

# Mobile Reverse Engineering
## When to Use

- Assessing a mobile app's security posture within an approved scope.
- Instrumenting runtime behavior or bypassing transport protections in tests.


## 适用场景

- Android APK 逆向与安全测试
- iOS IPA 逆向与安全测试
- 移动应用运行时动态插桩
- SSL Pinning / Root 检测 / 越狱检测绕过
- 移动端加密算法提取（AES/RSA/HMAC 密钥）
- 移动应用渗透测试（OWASP MASTG）
- 非 Root/越狱环境下的应用测试

## 四阶段工作流

### Phase 1: 信息收集

```text
Android：
□ APK 获取（Google Play / APKMirror / adb pull）
□ Manifest 分析: 权限、导出组件、Intent Filter、backup 标志
□ androguard: androguard analyze APK → 组件/权限/签名
□ APKLeaks: 硬编码 API Key / Token / Secret 扫描
□ 加固检测: 是否加壳（360/腾讯/梆梆/爱加密）

iOS：
□ IPA 获取（App Store / ipatool / Apple Configurator）
□ 解密 App Store 二进制: frida-ios-dump / Clutch
□ Info.plist 分析: ATS 配置、URL Scheme、Queries Schemes
□ class-dump: 导出 ObjC 类结构
□ 加固检测: 是否使用 Swift/ObjC 混淆
```

### Phase 2: 静态分析

```text
跨平台：
□ JADX-GUI: APK → Java 源码（Android）
□ Ghidra / Hopper: .so / Mach-O 反编译
□ radare2 / Cutter: CLI 快速侦察

Android 专项：
□ apktool d app.apk → smali 代码 + 资源
□ dex2jar: DEX → JAR → JD-GUI
□ smali/baksmali: Dalvik 字节码修改

iOS 专项：
□ class-dump: 导出 ObjC 头文件
□ Swift 符号恢复: swift-demangle
□ dsymutil: 调试符号提取
□ otool -L: 查看动态库依赖
□ jtool2: Mach-O 分析
```

### Phase 3: 动态分析

```text
Frida — 通用动态插桩：
□ frida-ps -U: 列出设备进程
□ frida-trace -U -i "open*" com.app: 追踪函数调用
□ 自定义 Hook 脚本: 修改参数/返回值、调用私有方法

Objection — Frida 增强层（无需写脚本）：
□ objection -g "com.app" explore
□ android root disable / ios jailbreak disable
□ android sslpinning disable / ios sslpinning disable
□ android keystore list / ios keychain dump
□ env / ls / sqlite connect

Frida Gadget（免 Root/越狱）：
□ 注入 frida-gadget.so / FridaGadget.dylib 到 APK/IPA
□ 重新签名 → 安装 → 无需设备权限即可 Hook
□ objection patchapk --source app.apk（全自动）
```

### Phase 4: 网络分析

```text
□ Burp Suite: 拦截 HTTP/HTTPS，修改请求/响应
□ mitmproxy: 脚本化代理（Python API）
□ Wireshark: PCAP 抓包分析
□ 证书安装: Android 用户证书 → 系统证书（Magisk + MoveCert）
□ SSL Pinning 绕过: Frida/Objection/Xposed/SSL Kill Switch 2
□ WebSocket / gRPC 流量分析
```

## 常见绕过速查

### SSL Pinning

```bash
# Objection（最简）
objection -g "com.app" explore
android sslpinning disable

# Frida 通用脚本
frida -U -l ssl_pinning_bypass.js -f com.app

# Xposed（Android）
TrustMeAlready 模块 → 全局禁用证书校验
```

### Root / 越狱检测

```bash
# Objection
android root disable
ios jailbreak disable

# Frida 自定义（多层检测）
Java.perform(function() {
    var RootBeer = Java.use("com.scottyab.rootbeer.RootBeer");
    RootBeer.isRooted.implementation = function() { return false; };
    // 额外绕过: Magisk su 检测、frida-server 检测、/proc/self/maps 检测
});
```

### 反调试

```bash
# Android
frida -U -l anti_debug_bypass.js -f com.app
# 绕过: ptrace(TracerPid)、/proc/self/status、isDebuggerConnected()

# iOS
# 绕过: PT_DENY_ATTACH、sysctl CTL_KERN/KERN_PROC/KERN_PROC_PID
frida -U -l ios_anti_debug.js -f com.app
```

## 移动端加密提取

```javascript
// Android — Hook Cipher.getInstance 获取密钥+算法
Java.perform(function() {
    var Cipher = Java.use("javax.crypto.Cipher");
    Cipher.getInstance.overload('java.lang.String').implementation = function(algo) {
        console.log("[Cipher] Algorithm: " + algo);
        return this.getInstance(algo);
    };
    Cipher.init.overload('int', 'java.security.Key').implementation = function(mode, key) {
        console.log("[Cipher] Key: " + bytesToHex(key.getEncoded()));
        return this.init(mode, key);
    };
});

// iOS — Hook CCCrypt
Interceptor.attach(Module.findExportByName("libcommonCrypto.dylib", "CCCrypt"), {
    onEnter: function(args) {
        console.log("CCCrypt op: " + args[0] + " alg: " + args[1]);
        console.log("Key: " + hexdump(args[3], { length: args[4].toInt32() }));
    }
});
```

## 工具链

| 工具 | 平台 | 用途 |
|------|:--:|------|
| JADX-GUI | A | Java 反编译 |
| apktool | A | APK 解包/重建 |
| Ghidra | A+I | 多架构反编译 |
| Hopper | I | iOS 专用反汇编 |
| Frida | A+I | 动态插桩 |
| Objection | A+I | Frida REPL 增强 |
| MobSF | A+I | 自动化 SAST+DAST |
| class-dump | I | ObjC 类导出 |
| frida-ios-dump | I | IPA 解密 |
| jtool2 | I | Mach-O 分析 |
| Burp Suite | A+I | HTTP 拦截 |
| mitmproxy | A+I | 脚本化代理 |

> A=Android, I=iOS

## 参考

- `references/frida-objection-deep.md` — Frida + Objection 深度用法
- `references/ios-reverse-guide.md` — iOS 逆向专项
- `references/anti-detection-bypass.md` — Root/越狱/反调试/SSL Pinning 绕过


## 任务完成自检（声称完成前 MUST 通过）

- [ ] 我是否执行了工作流中的每一步（而不是只阅读）？
- [ ] 我是否基于 `tool-index` 使用了真实工具路径？
- [ ] 我是否产出了可复现证据（命令/脚本/截图/报告）？
- [ ] 我是否完成并回写了 RULES 要求的 Checklist 项？

## Limitations

- iOS instrumentation requires a jailbroken device or patched build.
- Bypass techniques break with app-shield vendor updates.

> Adapted from [zhaoxuya520/reverse-skill](https://github.com/zhaoxuya520/reverse-skill) (MIT).
