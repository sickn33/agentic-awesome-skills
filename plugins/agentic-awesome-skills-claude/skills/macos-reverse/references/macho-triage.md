# Mach-O 分诊

```bash
file ./app
otool -hv ./app
otool -l ./app | head
codesign -d --entitlements :- ./app
```

关注：`com.apple.security.*` entitlements、Library Validation、禁用库注入相关标志。