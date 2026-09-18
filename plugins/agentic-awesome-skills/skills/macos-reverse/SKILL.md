---
name: macos-reverse
description: "Authorized macOS and Mach-O reverse engineering: codesign inspection, Objective-C/Swift recovery, endpoint-security surfaces, and Apple-platform malware analysis."
risk: safe
source: "https://github.com/zhaoxuya520/reverse-skill"
source_repo: "zhaoxuya520/reverse-skill"
source_type: community
date_added: "2026-08-25"
license: "MIT"
license_source: "https://github.com/zhaoxuya520/reverse-skill/blob/main/LICENSE"
---
# macOS / Mach-O Reverse Engineering
## When to Use

- Analyzing macOS binaries or suspected malware samples.
- Inspecting entitlements, signatures, and ObjC/Swift structures.


## 适用场景

- Mach-O 可执行文件 / dylib / framework
- .app bundle、LaunchAgent/Daemon
- Objective-C / Swift 符号与 runtime
- 公证/签名、Hardened Runtime、TCC 相关行为分析
- macOS 恶意软件静态/动态分析（联合 malware-analysis）

## 工作流

### 1. 包体与签名

```bash
file target
codesign -dv --verbose=4 target
spctl -a -vv target 2>&1
otool -L target
```

### 2. 静态

```text
□ class-dump / swift-demangle / Hopper / Ghidra / IDA
□ 字符串与 XPC 服务名、TCC 敏感 API
□ LC_LOAD_dylib 依赖与 rpath
```

### 3. 动态

```text
□ lldb / Frida
□ fs_usage / log stream 观察
□ 网络：联合 protocol-reverse 或代理
```

## 工具链

| 工具 | 用途 |
|------|------|
| otool / nm / codesign | 系统自带 |
| Hopper / Ghidra / IDA | 反编译 |
| class-dump / dsdump | ObjC |
| Frida / lldb | 动态 |
| jtool2 | Mach-O |

## 参考

- `references/macho-triage.md`
- `../mobile-reverse/`（iOS） `../ghidra-reverse/` `../malware-analysis/`

## 路由上下文

**上游**: MASTER R31  
**下游**: iOS → mobile-reverse；通用样本 → malware-analysis

## 任务完成自检

- [ ] 是否记录签名/Hardened Runtime 状态？
- [ ] 是否有地址级/符号级结论？
- [ ] Checklist？

## Limitations

- Apple Silicon and hardened runtime add unpacking complexity.
- Some analysis requires disabling SIP in a dedicated lab VM.

> Adapted from [zhaoxuya520/reverse-skill](https://github.com/zhaoxuya520/reverse-skill) (MIT).
