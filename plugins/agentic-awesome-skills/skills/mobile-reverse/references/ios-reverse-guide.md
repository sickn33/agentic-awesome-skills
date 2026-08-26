# iOS 逆向工程专项

## IPA 获取与解密

```bash
# 从 App Store 下载
ipatool search "Target App"
ipatool purchase -b com.target.app
ipatool download -b com.target.app -o app.ipa

# 从设备提取已安装应用
# 越狱设备
scp root@device:/private/var/containers/Bundle/Application/*/Target.app .

# 解密（App Store 二进制为加密 FAT 格式）
# frida-ios-dump（推荐）
python3 dump.py com.target.app -o decrypted.ipa

# Clutch
Clutch -i  # 列出已安装
Clutch -d 1  # 解密第 1 个

# dumpdecrypted
DYLD_INSERT_LIBRARIES=dumpdecrypted.dylib /path/to/App
```

## Mach-O 分析

```bash
# 基本信息
otool -l TargetBinary | grep crypt    # 加密状态
otool -L TargetBinary                 # 动态库依赖
otool -hv TargetBinary                # 头部信息
jtool2 --pages TargetBinary           # 内存页信息

# Fat Binary 瘦身
lipo -info TargetBinary
lipo TargetBinary -thin arm64 -output TargetBinary_arm64

# 符号分析
nm -g TargetBinary                    # 导出符号
nm -a TargetBinary                    # 全部符号
swift-demangle <mangled_name>         # Swift 符号还原

# class-dump
class-dump -H TargetBinary -o headers/
# 导出 ObjC 类及方法声明到 headers/ 目录
```

## Objective-C 运行时分析

```text
消息传递机制：
objc_msgSend(id self, SEL op, ...)  →  动态方法派发
  ↓
运行时查找：
1. 类方法列表 cache
2. 类方法列表
3. 逐级父类查找
4. +resolveInstanceMethod / +resolveClassMethod
5. forwardingTargetForSelector
6. methodSignatureForSelector + forwardInvocation
```

### Frida ObjC Hook

```javascript
// Hook 实例方法
var hook = ObjC.classes.ClassName["- instanceMethod:"];
Interceptor.attach(hook.implementation, {
    onEnter: function(args) {
        // args[0] = self, args[1] = selector, args[2+] = method args
        console.log("self: " + new ObjC.Object(args[0]));
        console.log("arg: " + args[2].toInt32());
    }
});

// Hook 类方法
var hook = ObjC.classes.ClassName["+ classMethod:"];
Interceptor.attach(hook.implementation, { ... });

// 调用 ObjC 方法
var NSString = ObjC.classes.NSString;
var str = NSString.stringWithString_("test");
console.log(str.UTF8String());
```

## Swift 逆向

```text
Swift 名称修饰（Name Mangling）：
$s10ModuleName5ClassC6method3argSi_tF
  │ │         │     │ │      │  │   └─ 参数类型
  │ │         │     │ │      │  └───── 返回类型  
  │ │         │     │ │      └──────── 参数名
  │ │         │     │ └─────────────── 方法名
  │ │         │     └──────────────── 类名(长度+名称)
  │ │         └────────────────────── 模块名
  │ └──────────────────────────────── 标识符标识
  └────────────────────────────────── 全局标识

工具: swift-demangle, Hopper (自动还原)
```

## 越狱检测绕过

```text
检测方法分类：

1. 文件系统检查：
   □ /Applications/Cydia.app
   □ /var/lib/apt/
   □ /bin/bash
   □ /usr/sbin/sshd
   → Hook NSFileManager.fileExistsAtPath:

2. 沙箱逃逸检测：
   □ fork() 是否成功（沙箱内禁止）
   □ system() 调用
   → Hook fork → 返回 -1

3. Dyld 注入检测：
   □ _dyld_get_image_count > 限制值
   → 限制返回值在合理范围

4. Scheme 检测：
   □ cydia:// URL Scheme
   → Hook UIApplication.canOpenURL:

5. sysctl 检测：
   □ CTL_KERN/KERN_PROC/KERN_PROC_PID → kinfo_proc
   → Hook sysctl → 清空 p_flag P_TRACED 位
```

### Frida 统一绕过脚本

```javascript
// 文件检测绕过
var NSFileManager = ObjC.classes.NSFileManager;
var defaultManager = NSFileManager.defaultManager();
Interceptor.attach(defaultManager["- fileExistsAtPath:"].implementation, {
    onLeave: function(retval) {
        var path = ObjC.Object(args[2]).toString();
        if (path.includes("Cydia") || path.includes("apt") || 
            path.includes("sshd") || path.includes("bash")) {
            retval.replace(0); // false
        }
    }
});

// fork 绕过
Interceptor.replace(Module.findExportByName(null, "fork"), 
    new NativeCallback(function() { return -1; }, 'int', []));

// dyld 绕过
var _dyld_get_image_count = Module.findExportByName(null, "_dyld_get_image_count");
Interceptor.attach(_dyld_get_image_count, {
    onLeave: function(retval) {
        if (retval.toInt32() > 200) retval.replace(200);
    }
});
```

## 关键防护绕过清单

| 防护 | iOS 绕过方法 |
|------|-------------|
| App Store 加密 | frida-ios-dump / Clutch |
| SSL Pinning | Objection `ios sslpinning disable` / SSL Kill Switch 2 |
| 越狱检测 | Objection `ios jailbreak disable` / 自定义 Frida Hook |
| 反调试 (PT_DENY_ATTACH) | Frida 启动后注入 / debugserver |
| 完整性校验 | Hook MAC 检查 / 代码签名验证 |
| 反注入 | 修改 Mach-O 去除 __RESTRICT 段 |
| Swift 混淆 | swift-demangle + LLM 辅助语义恢复 |
| 屏幕截图防护 | Hook UIScreen.mainScreen.snapshotViewAfterScreenUpdates |

Source: OWASP MSTG, frida-ios-dump, The iPhone Wiki
