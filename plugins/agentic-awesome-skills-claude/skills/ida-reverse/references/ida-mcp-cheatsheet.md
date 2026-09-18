# IDA Pro MCP 工具速查

> ida-pro-mcp 2.x 工具按功能分类，附常用参数和典型用法。
> 服务器名：`idapro`，工具前缀：`idapro_*`，HTTP 模式运行。工具数随版本变化（约 66，含 `py_eval`）。

---

## 启动与会话管理

### 服务器启动

```powershell
# 启动 MCP HTTP 服务器（后台静默；健康则 OK:<n>:reuse）
powershell -File "scripts/start.ps1"
# 输出 OK:<工具数> 表示就绪（约 66，含 py_eval）

# 打开目标文件（绕过 schema 校验）
powershell -File "scripts/open.ps1" -Path "C:\target.exe"
# 输出 OK:filename:session_id

# 大文件/GUI 程序建议加超时
powershell -File "scripts/open.ps1" -Path "C:\big.exe" -TimeoutSeconds 600

# 跳过自动分析（快速打开）
powershell -File "scripts/open.ps1" -Path "C:\huge.sys" -NoAutoAnalysis
```

### 会话工具

| 工具 | 用途 | 示例 |
|------|------|------|
| `idapro_idb_list()` / HTTP `idb_list` | 列出所有 session | — |
| `idapro_idb_open()` / HTTP `idb_open` | 打开数据库（优先用 `open.ps1`） | 大文件走脚本 |
| `idapro_idb_save(path)` / HTTP `idb_save` | 保存数据库 | 保存分析进度 |
| `idapro_idb_current()` | 当前绑定的 session（若版本提供） | — |
| `idapro_idb_switch(session_id)` | 切换 session | 多文件对比时 |
| `idapro_idb_close(session_id)` | 关闭 session | 释放资源 |
| `idapro_server_health()` | 服务器健康检查 | — |
| `idapro_server_warmup()` | 预热子系统 | 首次使用前 |

---

## 第一步：全局概览

### survey_binary — 快速概况

```
idapro_survey_binary(detail_level="minimal")
```

返回：
- 架构（x86/x64/ARM/MIPS）
- 入口点
- 函数总数
- 字符串统计
- 段信息
- 导入分类（加密/网络/文件IO/注册表）
- 高 xref 热门函数

**detail_level 选项**：
- `"minimal"` — 快速概况（推荐首选）
- `"standard"` — 包含更多细节
- `"full"` — 完整信息

### 函数列表

```
# 列出所有函数（分页）
idapro_list_funcs(queries=[{"offset": 0, "limit": 50}])

# 按名称过滤
idapro_list_funcs(queries=[{"filter": "crypt", "offset": 0, "limit": 20}])
idapro_list_funcs(queries=[{"filter": "main", "offset": 0, "limit": 10}])
```

### 统一查询

```
# 查询导入函数
idapro_entity_query(kind="imports", filter="Create")

# 查询字符串
idapro_entity_query(kind="strings", filter="http")

# 查询所有命名符号
idapro_entity_query(kind="names", filter="")
```

---

## 反编译与反汇编

### 反编译（伪代码）

```
# 按函数名
idapro_decompile(addr="main")
idapro_decompile(addr="sub_140001000")

# 按地址
idapro_decompile(addr="0x140001000")
```

### 反汇编

```
# 默认指令数
idapro_disasm(addr="main")

# 指定指令数量
idapro_disasm(addr="0x401000", max_instructions=100)
```

### 综合分析（推荐）

```
# 一次性获取：伪代码 + 字符串 + 常量 + 调用者 + 被调用者 + 基本块
idapro_analyze_function(addr="main", include_asm=false)

# 包含汇编
idapro_analyze_function(addr="sub_401000", include_asm=true)
```

### 函数概要

```
# 批量获取函数指标（大小、块数、xref 数）
idapro_func_profile(queries=["main", "sub_401000", "sub_402000"])
```

---

## 交叉引用与调用图

### 谁引用了目标

```
# 查看谁调用了某函数
idapro_xrefs_to(addrs=["sub_401000"])

# 查看谁引用了某字符串/数据
idapro_xrefs_to(addrs=["0x404000"])

# 批量查询
idapro_xrefs_to(addrs=["CreateFileW", "ReadFile", "WriteFile"])
```

### 高级 xref 查询

```
# 指定方向和类型
idapro_xref_query(addr="0x401000", direction="to")    # 谁引用我
idapro_xref_query(addr="0x401000", direction="from")  # 我引用谁
```

### 被调用函数列表

```
idapro_callees(addrs=["main"])
```

### 调用图

```
# 从 main 开始，深度 3
idapro_callgraph(roots=["main"], max_depth=3)

# 多个起点
idapro_callgraph(roots=["sub_401000", "sub_402000"], max_depth=2)
```

### 数据流追踪

```
# 向后追踪：这个值从哪来
idapro_trace_data_flow(addr="0x401050", direction="backward", max_depth=5)

# 向前追踪：这个值流向哪里
idapro_trace_data_flow(addr="0x401050", direction="forward", max_depth=5)
```

---

## 搜索

### 字符串搜索（正则）

```
# 搜索 URL
idapro_find_regex(pattern="https?://", limit=20)

# 搜索文件路径
idapro_find_regex(pattern="C:\\\\", limit=20)

# 搜索错误信息
idapro_find_regex(pattern="error|fail|invalid", limit=30)

# 搜索密钥/密码相关
idapro_find_regex(pattern="key|password|secret|token", limit=20)
```

### 反汇编文本搜索

```
# 在反汇编列表中搜索
idapro_search_text(pattern="call    sub_")
idapro_search_text(pattern="xor     eax, eax")
```

### 字节模式搜索

```
# 精确字节
idapro_find_bytes(patterns=["48 8B 05"], limit=10)

# 带通配符
idapro_find_bytes(patterns=["48 89 ?? 24 ??"], limit=10)

# 多个模式
idapro_find_bytes(patterns=["CC CC CC CC", "90 90 90 90"], limit=5)
```

### 高级搜索

```
# 搜索立即数
idapro_find(type="immediate", targets=["0xDEADBEEF"])

# 搜索字符串引用
idapro_find(type="string", targets=["password"])
```

---

## 内存与数据读取

### 读原始字节

```
idapro_get_bytes(addrs=[{"addr": "0x401000", "size": 64}])
```

### 读字符串

```
idapro_get_string(addrs=["0x404000", "0x404100"])
```

### 读整数

```
idapro_get_int(queries=[{"addr": "0x405000", "size": 4}])
```

### 读全局变量

```
idapro_get_global_value(queries=["g_flag", "g_key_size"])
```

### 读结构体

```
idapro_read_struct(queries=[{"addr": "0x405000", "type": "HEADER"}])
```

### 搜索结构体

```
idapro_search_structs(filter="FILE")
```

---

## 修改操作

### 添加注释

```
# 单个注释
idapro_set_comments(items=[{"addr": "0x401000", "comment": "解密函数入口"}])

# 批量注释
idapro_set_comments(items=[
    {"addr": "0x401000", "comment": "XOR 解密循环"},
    {"addr": "0x401050", "comment": "密钥初始化"},
    {"addr": "0x4010A0", "comment": "结果校验"}
])

# 追加注释（不覆盖已有）
idapro_append_comments(items=[{"addr": "0x401000", "comment": "补充：密钥长度 16"}])
```

### 重命名

```
# 重命名函数
idapro_rename(batch={"func": [
    {"addr": "sub_401000", "name": "decrypt_payload"},
    {"addr": "sub_402000", "name": "verify_license"}
]})

# 重命名全局变量
idapro_rename(batch={"global": [
    {"addr": "0x405000", "name": "g_encryption_key"}
]})

# 重命名局部变量
idapro_rename(batch={"local": [
    {"func": "decrypt_payload", "old": "v1", "name": "plaintext_buf"}
]})
```

### Patch 汇编

```
# NOP 掉检测代码
idapro_patch_asm(items=[{"addr": "0x401050", "asm": "nop"}])

# 修改跳转
idapro_patch_asm(items=[{"addr": "0x401060", "asm": "jmp 0x401080"}])

# 强制返回 true
idapro_patch_asm(items=[
    {"addr": "0x401000", "asm": "mov eax, 1"},
    {"addr": "0x401005", "asm": "ret"}
])
```

### Patch 字节

```
# 直接写字节
idapro_patch(patches=[{"addr": "0x401050", "bytes": "9090909090"}])
```

---

## 类型系统

### 声明结构体

```
idapro_declare_type(decls=[{
    "name": "PacketHeader",
    "decl": "struct PacketHeader { uint32_t magic; uint16_t type; uint16_t length; uint8_t data[0]; };"
}])
```

### 应用类型

```
# 给函数设置原型
idapro_set_type(edits=[{
    "addr": "sub_401000",
    "type": "int __fastcall decrypt(void *buf, int size, const char *key)"
}])

# 给全局变量设置类型
idapro_set_type(edits=[{
    "addr": "0x405000",
    "type": "PacketHeader"
}])
```

### 推断类型

```
idapro_infer_types(addrs=["sub_401000", "sub_402000"])
```

### 查询/查看类型

```
idapro_type_query(queries=["Packet"])
idapro_type_inspect(queries=["PacketHeader"])
```

---

## 栈帧分析

```
# 查看函数栈帧
idapro_stack_frame(addrs=["main", "sub_401000"])

# 声明栈变量
idapro_declare_stack(items=[{
    "func": "sub_401000",
    "offset": -0x20,
    "name": "local_buf",
    "type": "char [32]"
}])
```

---

## 签名生成

```
# 为地址生成唯一字节签名
idapro_make_signature(addrs=["0x401000"])

# 为整个函数生成签名
idapro_make_signature_for_function(addrs=["decrypt_payload"])

# 为引用某地址的代码生成签名
idapro_find_xref_signatures(addrs=["0x405000"])
```

---

## 进制转换

```
# 十六进制 → 十进制
idapro_int_convert(inputs=["0x401000"])

# 十进制 → 十六进制
idapro_int_convert(inputs=["4198400"])

# 批量转换
idapro_int_convert(inputs=["0xDEAD", "0xBEEF", "12345"])
```

> ⚠️ **永远用这个工具做进制转换，不要自己算！**

---

## 导出与脚本

### 导出函数

```
# JSON 格式
idapro_export_funcs(addrs=["main", "sub_401000"], format="json")

# C 头文件
idapro_export_funcs(addrs=["main", "sub_401000"], format="c_header")

# 函数原型
idapro_export_funcs(addrs=["main", "sub_401000"], format="prototypes")
```

### 执行 Python 脚本

```
# 在 IDA 上下文中执行 Python
idapro_py_eval(code="import idautils; print(list(idautils.Functions())[:10])")

# 获取段信息
idapro_py_eval(code="import idc; print(idc.get_segm_name(0x401000))")

# 批量操作
idapro_py_eval(code="import ida_funcs; f=ida_funcs.get_func(0x401000); print(f.size())")
```

---

## 典型分析流程

### 恶意软件分析

```text
1. survey_binary → 看导入（网络API? 加密? 注册表?）
2. find_regex("http|socket|connect") → 找网络相关字符串
3. xrefs_to(网络字符串地址) → 找引用函数
4. decompile(引用函数) → 看通信逻辑
5. trace_data_flow(加密参数, "backward") → 追踪密钥来源
6. set_comments + rename → 标注发现
```

### 注册验证破解

```text
1. find_regex("serial|license|register|valid") → 找验证相关字符串
2. xrefs_to(验证字符串) → 定位验证函数
3. analyze_function(验证函数) → 理解逻辑
4. callgraph(验证函数, 2) → 看调用链
5. patch_asm(条件跳转地址, "jmp always_pass") → patch
```

### CTF 逆向

```text
1. survey_binary → 确认架构和入口
2. decompile("main") → 看主逻辑
3. find_regex("flag|correct|wrong") → 找判断点
4. trace_data_flow(判断点, "backward") → 追踪输入变换
5. 用 Python 辅助计算/解密 → 得到 flag
```

### 漏洞分析

```text
1. entity_query(kind="imports", filter="strcpy|sprintf|gets") → 找危险函数
2. xrefs_to(危险函数) → 找调用点
3. analyze_function(调用点所在函数) → 看上下文
4. stack_frame(函数) → 确认缓冲区大小
5. trace_data_flow(危险参数, "backward") → 确认用户可控
```

---

## 常见错误与解决

| 错误 | 原因 | 解决 |
|------|------|------|
| "No database bound" | 没有打开文件 | 执行 `open.ps1` |
| "Failed to open database" | 旧库被锁 | `open.ps1` 自动降级到 Temp |
| schema 校验失败 | MCP 客户端 BUG | 用 `open.ps1` 代替 `idb_open` |
| 工具超时 | 大文件分析中 | 加 `-TimeoutSeconds 600` |
| "ERR:timeout" (start.ps1) | 服务器启动失败 | 检查 Python/idalib-mcp 安装 |
| 进制转换错误 | 手动计算出错 | 用 `idapro_int_convert` |
| 函数名找不到 | 名称不精确 | 用 `list_funcs` + filter 先搜索 |
