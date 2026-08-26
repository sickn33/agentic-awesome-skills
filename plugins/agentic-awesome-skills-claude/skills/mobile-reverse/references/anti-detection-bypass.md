# Root / 越狱 / 反调试 / SSL Pinning 绕过

## 检测层次模型

```
Layer 1: 静态检测（安装时/启动时）
  ├─ 包管理器检测（Cydia, apt, Magisk）
  ├─ 文件检测（su, busybox, frida-server）
  └─ 权限检测（ro.debuggable, ro.secure）

Layer 2: 运行时检测（持续）
  ├─ 进程检测（frida-server, magiskd）
  ├─ 端口检测（27042 frida default）
  ├─ 内存检测（/proc/self/maps 注入痕迹）
  └─ 堆栈检测（Frida 调用帧）

Layer 3: 环境检测（按需触发）
  ├─ ptrace 检测（TracerPid）
  ├─ /proc/self/status 检测
  ├─ build.prop 检测（test-keys）
  └─ syscall 直接检测（绕过 libc）
```

## Android Root 检测绕过

### 常见检测库及绕过

| 检测库 | 检测方法 | 绕过方式 |
|--------|---------|---------|
| RootBeer | 8 种检测组合 | Hook 每个检测方法返回 false |
| SafetyNet | Google Play Services 远程认证 | 使用 Magisk Hide / Shamiko / Play Integrity Fix |
| Google Play Integrity | 替换 SafetyNet | Trickystore + PIF |
| 自定义 native 检测 | syscall 读取 /proc/self/status | Hook syscall 或修改 /proc 挂载 |

### Frida 综合绕过

```javascript
Java.perform(function() {
    // RootBeer
    var RootBeer = Java.use("com.scottyab.rootbeer.RootBeer");
    var methods = ["isRooted", "isRootedWithBusyBox", "checkSuExists",
        "detectRootManagementApps", "detectPotentiallyDangerousApps",
        "detectTestKeys", "checkForDangerousProps", "checkForRWPaths"];
    methods.forEach(function(m) {
        RootBeer[m].implementation = function() { return false; };
    });

    // 通用 Build.TAGS 检测
    var Build = Java.use("android.os.Build");
    var original = Build.TAGS.value;
    Build.TAGS.value = "release-keys";

    // PackageManager → 隐藏包名
    var PackageManager = Java.use("android.content.pm.PackageManager");
    PackageManager.getPackageInfo.overload('java.lang.String', 'int').implementation = function(pkg, flags) {
        if (pkg == "de.robv.android.xposed.installer" || 
            pkg.includes("magisk") || pkg.includes("frida")) {
            throw Java.use("android.content.pm.PackageManager$NameNotFoundException").$new();
        }
        return this.getPackageInfo(pkg, flags);
    };
});
```

## iOS 越狱检测绕过

### 多层 Frida Hook

```javascript
// 1. 文件系统检测
var NSFileManager = ObjC.classes.NSFileManager;
var paths = [
    "/Applications/Cydia.app", "/var/lib/apt", "/bin/bash",
    "/usr/sbin/sshd", "/etc/apt", "/Library/MobileSubstrate"
];
// Hook fileExistsAtPath 返回 NO

// 2. fork 检测（沙箱内禁止）
var fork_ptr = Module.findExportByName("libSystem.B.dylib", "fork");
Interceptor.replace(fork_ptr, new NativeCallback(function() {
    return -1;
}, 'int', []));

// 3. Scheme 检测
// 通过 MobileSubstrate hook
var LSApplicationWorkspace = ObjC.classes.LSApplicationWorkspace;
// Hook defaultWorkspace → canOpenURL → 对 cydia:// 返回 NO

// 4. 签名检测
var MISValidateSignature = Module.findExportByName(null, "MISValidateSignature");
Interceptor.attach(MISValidateSignature, {
    onLeave: function(retval) { retval.replace(0); }
});
```

## 反调试绕过

### Android

```javascript
// 1. ptrace 自身 → 防止附加
// Native: ptrace(PTRACE_TRACEME, 0, NULL, 0)
// 绕过: Hook ptrace → 返回 0

// 2. TracerPid 检测
// /proc/self/status → TracerPid: 0
var fopen = Module.findExportByName(null, "fopen");
Interceptor.attach(fopen, {
    onEnter: function(args) {
        this.path = Memory.readUtf8String(args[0]);
    },
    onLeave: function(retval) {
        if (this.path && this.path.includes("status")) {
            // 修改返回的 FILE*，返回伪造内容
        }
    }
});

// 3. isDebuggerConnected (Java)
var Debug = Java.use("android.os.Debug");
Debug.isDebuggerConnected.implementation = function() { return false; };
```

### iOS

```javascript
// 1. PT_DENY_ATTACH
// ptrace(PT_DENY_ATTACH, 0, NULL, 0) → 防止调试器附加
var ptrace = Module.findExportByName(null, "ptrace");
Interceptor.replace(ptrace, new NativeCallback(function(request, pid, addr, data) {
    if (request == 31) return 0; // PT_DENY_ATTACH → 忽略
    return ptrace(request, pid, addr, data);
}, 'int', ['int', 'int', 'pointer', 'int']));

// 2. sysctl 检测
var sysctl = Module.findExportByName(null, "sysctl");
Interceptor.attach(sysctl, {
    onLeave: function(retval) {
        // 修改 kinfo_proc 的 p_flag 字段 → 清除 P_TRACED
    }
});

// 3. getppid 检测（检查父进程是否为 launchd）
// 调试时 getppid() != 1
```

## SSL Pinning 绕过

### Android 五层绕过

```text
层 1 — TrustManager: 接受所有证书
层 2 — OkHttp CertificatePinner: Hook 清空 pins 列表
层 3 — WebView SSL Error Handler: 忽略证书错误
层 4 — Network Security Config: 修改 xml → 信任用户证书
层 5 — Native SSL (OpenSSL/BoringSSL): Hook SSL_get_verify_result → X509_V_OK
```

### iOS 四层绕过

```text
层 1 — NSURLSession: Hook SecTrustEvaluate → kSecTrustResultProceed
层 2 — Alamofire: Hook ServerTrustManager
层 3 — AFNetworking: Hook AFSecurityPolicy
层 4 — libcurl: LD_PRELOAD 替换 SSL 验证回调
```

### 通用 Objection 命令

```bash
# Android
objection -g "com.app" explore
android sslpinning disable
# 等价于: 自动 Hook 上述 5 层

# iOS
objection -g "com.app" explore
ios sslpinning disable
# 等价于: 自动 Hook 上述 4 层
```

Source: OWASP MSTG, Frida CodeShare, objection wiki
