# Frida Bypass Kit — Android 通用安全绕过框架

> 来源：[FridaBypassKit](https://github.com/okankurtuluss/FridaBypassKit)（2025）
> 适用场景：APK 动态分析时需要绕过 root 检测、SSL pinning、模拟器检测、反调试

## 概述

FridaBypassKit 是一个集成了四大绕过能力的 Frida 脚本，无需针对特定 APP 定制，开箱即用。

## 四大绕过能力

### 1. Root 检测绕过

- Hook `File.exists()` 隐藏 su 二进制
- 拦截 `Runtime.exec()` 的 root 检查调用
- 从 PackageManager 隐藏 root 相关包（Magisk、SuperSU 等）
- 修改系统属性使设备看起来未 root

### 2. SSL Pinning 绕过

- Hook `TrustManagerImpl.verifyChain()`
- Hook `TrustManagerImpl.checkTrustedRecursive()`
- 绕过证书链验证
- 返回空证书链避免校验
- 兼容 OkHttp、Retrofit 和自定义实现

### 3. 模拟器检测绕过

- 伪造 TelephonyManager 返回值
- 返回假电话号码和运营商名称
- 修改 Build 属性

### 4. 反调试绕过

- Hook `Debug.isDebuggerConnected()`
- 阻止调试器检测
- 绕过反调试检查

## 使用方法

```bash
# 前置条件
pip install frida-tools
adb push frida-server /data/local/tmp/
adb shell chmod 755 /data/local/tmp/frida-server
adb shell su -c /data/local/tmp/frida-server &

# 注入目标 APP
frida -U -f com.example.app -l FridaBypassKit.js
```

## 其他推荐 Frida 绕过脚本

| 项目 | 特点 | 链接 |
|------|------|------|
| httptoolkit/frida-interception-and-unpinning | 直接 MitM 所有 HTTPS 流量 | [GitHub](https://github.com/httptoolkit/frida-interception-and-unpinning) |
| 0xCD4/SSL-bypass | 通用非定制 SSL 绕过 | [GitHub](https://github.com/0xCD4/SSL-bypass) |
| incogbyte/ssl-bypass gist | 绕过常见 SSL pinning 方法 | [Gist](https://gist.github.com/incogbyte/1e0e2f38b5602e72b1380f21ba04b15e) |
| Zero3141/Frida-OkHttp-Bypass | 专门针对 OkHttp CertificatePinner | [GitHub](https://github.com/Zero3141/Frida-OkHttp-Bypass) |

## 与本包的集成

在 `apk-reverse` 工作流中，当遇到以下情况时使用：

1. APP 检测到 root 拒绝运行 → 启用 Root Detection Bypass
2. 抓包时 HTTPS 请求看不到明文 → 启用 SSL Pinning Bypass
3. APP 检测到模拟器拒绝运行 → 启用 Emulator Detection Bypass
4. 附加 Frida 后 APP 崩溃 → 启用 Debug Detection Bypass

推荐组合使用：先跑完整 FridaBypassKit，再针对性调整。
