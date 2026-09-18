# Frida + Objection 深度用法

## Frida 核心 API

### Java 运行时 (Android)

```javascript
Java.perform(function() {
    // 获取类实例
    var String = Java.use("java.lang.String");

    // Hook 静态方法
    var System = Java.use("java.lang.System");
    System.getProperty.overload('java.lang.String').implementation = function(key) {
        console.log("System.getProperty: " + key);
        return this.getProperty(key);
    };

    // Hook 构造函数
    var File = Java.use("java.io.File");
    File.$init.overload('java.lang.String').implementation = function(path) {
        console.log("File opened: " + path);
        return this.$init(path);
    };

    // 枚举已加载类
    Java.enumerateLoadedClasses({
        onMatch: function(className) { console.log(className); },
        onComplete: function() {}
    });

    // 修改返回值
    var RootDetector = Java.use("com.app.security.RootDetector");
    RootDetector.isDeviceRooted.implementation = function() {
        return false;
    };
});
```

### Native 层 (Android + iOS)

```javascript
// Hook 导出函数
Interceptor.attach(Module.findExportByName(null, "open"), {
    onEnter: function(args) {
        this.path = Memory.readUtf8String(args[0]);
    },
    onLeave: function(retval) {
        console.log("open(" + this.path + ") = " + retval);
    }
});

// Hook 任意地址（通过偏移）
var base = Module.findBaseAddress("libnative.so");
var target = base.add(0x12345);
Interceptor.attach(target, {
    onEnter: function(args) {
        console.log("Function called from: " + Thread.backtrace(this.context, Backtracer.ACCURATE)
            .map(DebugSymbol.fromAddress).join('\n'));
    }
});

// 修改返回值
Interceptor.attach(Module.findExportByName(null, "strcmp"), {
    onLeave: function(retval) {
        if (retval.toInt32() === 0) return; // strings equal, skip
        // Force match
        retval.replace(0);
    }
});
```

### ObjC 运行时 (iOS)

```javascript
// Hook ObjC 方法
var hook = ObjC.classes.ViewController["- viewDidLoad"];
Interceptor.attach(hook.implementation, {
    onEnter: function(args) {
        console.log("viewDidLoad called");
    }
});

// 枚举所有类
ObjC.enumerateLoadedClasses({
    onMatch: function(className) { console.log(className); },
    onComplete: function() {}
});

// 调用 ObjC 方法
var NSString = ObjC.classes.NSString;
var str = NSString.stringWithString_("Hello from Frida");
```

## Objection 命令速查

### 通用

```bash
objection -g "com.app" explore           # 启动
objection -g "com.app" explore -q        # 静默启动（只注入不等待）
objection patchapk --source app.apk      # 自动注入 Frida Gadget
objection signapk --source app.apk       # 仅签名

# 文件系统
env              # 应用数据目录
ls               # 列出文件
file download /path/to/file  # 下载文件
file upload local.txt /remote/path  # 上传文件

# SQLite
sqlite connect /path/to/db.sqlite
.tables          # 列出表
select * from users;  # 查询
```

### Android 专用

```bash
android root disable              # 绕过 Root 检测
android sslpinning disable        # 绕过 SSL Pinning
android hooking list classes      # 枚举类
android hooking list class_methods com.app.Main  # 枚举方法
android hooking watch class com.app.Main  # Hook 所有方法
android intent launch_activity com.app.MainActivity  # 启动 Activity
android heap search instances com.app.User  # 堆搜索
android keystore list             # Keystore 条目
```

### iOS 专用

```bash
ios jailbreak disable             # 绕过越狱检测
ios sslpinning disable            # 绕过 SSL Pinning
ios keychain dump                 # 导出 Keychain
ios nsuserdefaults get            # NSUserDefaults
ios nsurlcache dump               # HTTP 缓存
ios cookies get                   # 读取 Cookies
ios pasteboard monitor            # 监听剪贴板
ios ui dump                       # UI 层次结构
ios plist cat Info.plist          # 读取 plist
```

## 免 Root/越狱部署

### Android — Frida Gadget 注入

```bash
# 1. 解包 APK
apktool d app.apk -o app_unpacked

# 2. 下载 frida-gadget 并放入 lib 目录
cp frida-gadget-17.x.x-android-arm64.so \
   app_unpacked/lib/arm64-v8a/libfrida-gadget.so

# 3. 在 smali 中注入 System.loadLibrary("frida-gadget")
# 修改主 Activity 的 onCreate 或 attachBaseContext

# 4. 重建并签名
apktool b app_unpacked -o app_patched.apk
uber-apk-signer -a app_patched.apk

# 5. Objection 自动化
objection patchapk --source app.apk --skip-resources
```

### iOS — Frida Gadget 注入

```bash
# 1. 解密 App Store IPA
python3 frida-ios-dump.py -u -p com.app.target

# 2. 注入 FridaGadget.dylib
# 修改 Mach-O Load Commands，添加 @executable_path/FridaGadget.dylib

# 3. 重签名
codesign -f -s "Apple Development" Payload/App.app

# 4. 通过 Xcode sideload 或 AltStore 安装
```

## SSL Pinning 绕过进阶

### 多层绕过（Android）

```javascript
// 1. OkHttp CertificatePinner
var CertificatePinner = Java.use("okhttp3.CertificatePinner");
CertificatePinner.check.overload('java.lang.String', 'java.util.List').implementation = function() {};

// 2. TrustManager 自定义
var TrustManagerImpl = Java.use("com.android.org.conscrypt.TrustManagerImpl");
TrustManagerImpl.verifyChain.implementation = function() { return []; };

// 3. WebView SSL Error
var SslErrorHandler = Java.use("android.webkit.SslErrorHandler");
SslErrorHandler.proceed.implementation = function() { return this.proceed(); };

// 4. Network Security Config
// 需要修改 AndroidManifest.xml → android:networkSecurityConfig="@xml/network_security_config"
// xml 中添加信任用户证书
```

### 多层绕过（iOS）

```javascript
// 1. NSURLSession
var SecTrustEvaluate = Module.findExportByName("Security", "SecTrustEvaluate");
Interceptor.replace(SecTrustEvaluate, new NativeCallback(function(trust, result) {
    Memory.writeU32(result, 1); // kSecTrustResultProceed = 1
    return 0; // errSecSuccess
}, 'int', ['pointer', 'pointer']));

// 2. Alamofire
// Hook ServerTrustManager.evaluate → 始终返回 success
```

Source: Frida docs, Objection wiki, OWASP MSTG
