# 非 PE / 多格式 Agent 响应菜谱 U–AV + AW–DN

> ⚠️ Security notice: examples below may include download-and-execute patterns, shown for defensive understanding and authorized testing only. Never run them against systems you do not own.


> 与 PE 反调试菜谱 A–T（../anti-analysis.md）并列：按**文件类型**给出「触发 → 动作一行 → Evidence」。  
> **不是**第二套主流程。Triage 识别类型后跳转到对应 skill + 本表。  
> 默认 **授权隔离 lab / 已授权样本与设备**。格机、BYOVD、反射注入等写**检测与取证**，不写未授权破坏/利用教程。  
> 绕过或还原失败也 MUST 记 Evidence；禁止静默当「无害」。
>
> §1–§8 / U–AV = 原始规则（Issue #65）。§9–§23 / AW–DN = 扩展规则（Issue #87，去重后 + 语义增强 + edge-case 补丁）。

## 0. 路由速查

| 类型线索 | 主 skill | 本表章节 |
|----------|----------|----------|
| .bat / .cmd / 批处理 | malware-analysis | §1, §19 |
| .ps1 / PowerShell | malware-analysis | §2, §20 |
| Office 宏 / VBA / XLM / .docm/.xlsm | malware-analysis | §3 (含 DD OLE 提取, DJ XLM 宏) |
| .docx/.xlsx/.pptx OOXML 外链 / DDE / .rtf OLE | malware-analysis | §10 (含 DK RTF) |
| Web/前端 JS 混淆、JSVMP | js-reverse | §4, §21 (含 DE/DF) |
| .sys / 内核驱动 | reverse-engineering/kernel-driver-reverse.md + cre | §5 |
| .dll 侧重点 | malware-analysis / re-agent-workflow | §6（与 A–T 去重） |
| APK / Magisk / 隐藏图标 | apk-reverse | §7–§8, §23 |
| .pdf / PDF 文档 | malware-analysis | §9 |
| .wasm / WebAssembly | reverse-engineering | §11 |
| .jar/.class / Java 字节码 | reverse-engineering | §12 |
| .exe(AutoIt) / .au3 | malware-analysis | §13 |
| .hta / HTML Application | malware-analysis | §14 |
| .wsf/.jse/.vbe | malware-analysis | §15 |
| .msi / Windows Installer | malware-analysis | §16 |
| .reg / 注册表脚本 | malware-analysis | §17 |
| .vbs / VBScript | malware-analysis | §18 |
| Xposed/LSPosed 模块 | apk-reverse | §22 |
| ELF / Linux 二进制 | reverse-engineering | → elf-analysis.md, anti-analysis.md |
| Mach-O / macOS/iOS | reverse-engineering | → platforms.md |
| Python 字节码 | reverse-engineering | → languages.md |

## 1. BAT/CMD（U V W）

| ID | 触发 | 动作（摘要） | Evidence | 优先 |
|----|------|--------------|----------|------|
| **U** | 大量 SET 单字符变量 + %a%%b% 拼接，或 ^ 续行拆命令 | 逐行展开 SET；还原后命令列表；可用 batch 脱混淆工具；**禁止**未还原就当「无动作」 | E-batch-deobf | P0 |
| **V** | 文本打开乱码，HEX 头 FF FE（UTF-16 LE BOM） | 确认 BOM → 转 UTF-8 再解析；或 chcp 65001 + type | E-batch-encoding | P2 |
| **W** | 大量 REM/::、冗余 GOTO/标签淹没真实逻辑 | 去注释；梳 GOTO 真路径；隔离执行抓 cmd 实际命令日志 | E-batch-deadcode | P1 |

## 2. PowerShell（X Z）

> 编号保留提出者习惯：**无补丁 Y**。

| ID | 触发 | 动作（摘要） | Evidence | 优先 |
|----|------|--------------|----------|------|
| **X** | 多层 FromBase64String / Gzip / Compress / 嵌套 -replace | **逐层**解码；每层结果单独记；工具可选（PowerDecode 等），无工具则手工/脚本 | E-ps-decode-layer-N | P0 |
| **Z** | 字符串倒序、碎片 + 拼接后 Invoke-Expression/IEX | 还原完整串；对 IEX 下断或脚本块日志；明文命令入 Evidence | E-ps-string-restore | P1 | <!-- security-allowlist: SEC004 -->

## 3. VBA 宏 / XLM（AA AB AC DD DJ）

| ID | 触发 | 动作（摘要） | Evidence | 优先 |
|----|------|--------------|----------|------|
| **AA** | olevba/OLEDump 仅见 P-Code、源码流空（VBA Stomping） | P-Code 反编译工具；不全则 Word/Excel 宏调试观察；写清限制 | E-vba-pcode | P0 |
| **AB** | 大量 Chr() 拼接或 Base64 串，疑 shellcode/嵌套脚本 | 立即窗口/脚本还原串；解码后判类型；动态盯 CreateObject/Shell | E-vba-str-decode | P1 |
| **AC** | 无意义 If 1=2、或 InsertLines/DeleteLines 自修改 | 静跟真分支；动态 bp 自修改 API 并 dump 改后宏 | E-vba-selfmod | P2 |
| **DD** | olevba/oledump 检出 VBA 宏项目（vbaProject.bin）；扩展名 .docm/.xlsm/.pptm | oledump.py 检查 OLE 流结构；olevba 提取 VBA 源码检测可疑 API；检查 AutoOpen/Workbook_Open 等自动执行宏 | E-office-vba | P0 |
| **DJ** | .xls/.xlsm 含 Excel 4.0/XLM 宏（隐藏在单元格公式中，非 VBA 流）；olevba 检出 XLM 宏标记 | olevba --xlm 提取 XLM 宏公式；检查隐藏工作表中的 EXEC/CALL/REGISTER 函数；XLMMacroDeobfuscator 动态仿真还原 | E-office-xlm | P0 |

## 4. JavaScript（AD AE AF）→ 主路径 js-reverse

| ID | 触发 | 动作（摘要） | Evidence | 优先 |
|----|------|--------------|----------|------|
| **AD** | 自定义字节码数组 + while/switch 解释器（JSVMP） | 找 VM 入口与 opcode 分发；动态日志轨迹；AST+动态双轨；见 js-reverse DeepDive | E-js-vmp | P0 |
| **AE** | while(1){switch} + 大字符串数组下标 | AST/Babel 重构；数组下标还原字符串；wakaru 等可选；**勿**整份粘贴 PE ollvm-deobfuscation 长文 | E-js-deobf | P0 |
| **AF** | debugger、劫持 console、performance.now 差、DevTools 检测 | 停用断点/固定时间源/无头浏览器；patch 检测点；授权页面 | E-js-anti-debug | P1 |

## 5. SYS 内核驱动（AG AH AI）

| ID | 触发 | 动作（摘要） | Evidence | 优先 |
|----|------|--------------|----------|------|
| **AG** | DriverEntry 很短，逻辑不在入口 | 扫 MajorFunction[] 非空槽；优先 IRP_MJ_DEVICE_CONTROL/CREATE；地址列表入证 | E-driver-irp-handlers | P0 |
| **AH** | 存在 DeviceIoControl / IOCTL 分发 | 建控制码→处理函数表；标 METHOD_* 与缓冲方向；用户态通信面 | E-driver-ioctl | P0 |
| **AI** | 样本加载/投放知名脆弱驱动或异常签名驱动（BYOVD 模式） | 对照 LOLDrivers 等**公开**列表；记驱动名/哈希/签名；分析**调用意图**；**不**展开 exploit 步骤 | E-driver-byovd | P1 |

详见 kernel-driver-reverse.md 流程；本表只补 agent 动作锚点。

## 6. DLL（AJ–AQ）— 与 A–T / #72 去重

| ID | 触发 | 动作（摘要） | Evidence | 优先 |
|----|------|--------------|----------|------|
| **AJ** | DLL 分析只看了导出/EP，忽略 TLS 或 DllMain | **TLS 回调 + DllMain 都必须看**；动态断点顺序仍遵循四级火箭（TLS→EP/DllMain→API→ExitProcess） | E-dll-tls-dllmain | P0 |
| **AK** | 导出名前良后恶、错名、或导出与行为不符 | 导出表与实际调用交叉；异常导出列表 | E-exports-anomaly | P0 |
| **AL** | 无导出或导出极少，仍被加载 | 从入口、字符串、xrefs、调用方定位；不要因「无导出」放弃 | E-dll-noexport | P0 |
| **AM** | 静态 IAT 缺 DLL、运行时才用 | **See A–T 补丁 R**（Delay-Load / E-delay-import），此处不双写长文 | E-delay-import | P0 指针 |
| **AN** | 需还原导出函数参数与调用约定 | 交叉引用 + 动态看寄存器/栈；标注 stdcall/fastcall 等 | E-dll-export-abi | P1 |
| **AO** | 疑 DLL 劫持/侧加载 | 查应用目录同名 DLL、搜索路径、KnownDLLs；合法程序+异常 DLL 组合 | E-dll-sideload | P1 |
| **AP** | 无文件映射/反射加载线索 | 内存特征、加载器行为、无路径模块；授权环境取证 | E-dll-reflective | P1 |
| **AQ** | 仅因导出名「不像恶意」降风险 | **禁止**只凭导出名判安全；结合段权限、入口、字符串、动态行为 | E-dll-export-priority | P1 |

DLL/SYS 硬门仍：E-imports + E-exports（见 re-agent-workflow）。

## 7. Android 格机 / 持久化（AR AS AT）→ apk-reverse

> **仅授权样本、镜像或测试设备。** 动作是检测、提取 IOC 与持久化路径，不是实施破坏。

| ID | 触发 | 动作（摘要） | Evidence | 优先 |
|----|------|--------------|----------|------|
| **AR** | Magisk 模块/脚本含删库、刷写、批量 rm 系统分区等**格机特征命令** | 特征命令表 + 模块路径；标高危破坏能力；不执行格机命令 | E-android-wiper-cmd | P0 |
| **AS** | 循环 curl|sh / 远程拉脚本、非常规 C2 URL | 提 URL；分析下载体是否含格机命令；记临时路径 | E-android-wiper-backdoor | P0 | <!-- security-allowlist: curl-pipe-bash -->
| **AT** | /data/adb/service.d、post-fs-data.d、可疑 /system/priv-app 等 | 列持久化脚本/APK；内容摘要入证 | E-android-persistence | P1 |

## 8. Android 透明/隐藏图标（AU AV）→ apk-reverse

| ID | 触发 | 动作（摘要） | Evidence | 优先 |
|----|------|--------------|----------|------|
| **AU** | LAUNCHER 图标全透明/空 label、Theme.NoDisplay、无 LAUNCHER category、组件 disabled | aapt dump badging + manifest；反编译查图标像素；异常项入证 | E-android-hidden-icon-manifest | P0 |
| **AV** | 已装但桌面无图标，后台流量/自启/高危权限/动态恢复图标 | pm list vs 桌面；dumpsys package；广播与 device_admin；行为入证 | E-android-hidden-icon-behavior | P1 |

---

> **以下 §9–§23 为 Issue #87 扩展规则（AW–DC）。**
> 已去除与现有文件重复的 ELF（→ elf-analysis.md）、Mach-O（→ platforms.md）、Python（→ languages.md）章节。

## 9. PDF 恶意文档（AW AX AY AZ）

| ID | 触发 | 动作（摘要） | Evidence | 优先 |
|----|------|--------------|----------|------|
| **AW** | pdfid 检出 /JS、/JavaScript、/OpenAction、/AA、/Launch 计数 >0（含 hex 编码名称如 /4A#61#76#61... 的混淆计数） | pdfid -e 统计（对比 plain vs obfuscated 计数）；pdf-parser 提取可疑对象；peepdf 交互分析 + JS 仿真 | E-pdf-autoaction | P0 |
| **AX** | pdfid 检出 /EmbeddedFile >0；对象流含 FlateDecode/ASCIIHexDecode 级联过滤器链；或 /Annot 对象中隐藏编码载荷 | pdf-parser 提取流数据；peepdf 解码多层级联过滤器（含 AES 加密流 security handler r5/r6）；检查 Annotation 对象；file 识别解码结果类型 | E-pdf-embedded | P0 |
| **AY** | 提取的 PDF JS 含大量 eval、unescape、String.fromCharCode、atob | peepdf JS 仿真环境执行跟踪；逐层解码 Base64/Hex/ROT13；CyberChef 辅助 | E-pdf-js-deobf | P1 |
| **AZ** | PDF 结构异常：/JBIG2Decode、XREF 表被操纵、对象编号跳跃 | pdfid -d 重命名可疑关键字；检查已知 CVE 利用模式；提取 exploit 触发条件 | E-pdf-exploit | P1 |

## 10. Office OOXML / DDE / RTF（BA BB DK）→ 与 §3 VBA 互补

| ID | 触发 | 动作（摘要） | Evidence | 优先 |
|----|------|--------------|----------|------|
| **BA** | docx/xlsx/pptx ZIP 解压后 word/_rels/ 或 xl/_rels/ 中含可疑外部关系（含 remote template injection） | 检查 *.rels 外部链接；检查 vbaData.xml；提取嵌入 OLE 对象；检查协议处理器滥用（ms-msdt: / search-ms: / ms-officecmd:） | E-office-ooxml | P0 |
| **BB** | 文档含 DDEAUTO 或 DDEEXEC 域代码，通过域执行外部命令 | olevba --dde 扫描；提取 DDE 命令参数；检查是否指向 PowerShell/外部 exe | E-office-dde | P0 |
| **DK** | .rtf 文件含嵌入 OLE 对象（非 OOXML、非经典 OLE 复合文档） | rtfobj 提取嵌入 OLE 对象；oleobj 分析对象类型；检查 Equation Editor 漏洞利用（CVE-2017-11882 等）；file 识别提取物类型 | E-rtf-ole | P0 |

## 11. WebAssembly（BC BD BE）

| ID | 触发 | 动作（摘要） | Evidence | 优先 |
|----|------|--------------|----------|------|
| **BC** | 文件以 \x00asm 魔术字节开头；或 JS 代码含 WebAssembly 实例化逻辑 | wasm2wat 转文本；检查 import 段识别宿主环境导入函数；wasm-decompile 生成伪代码；检查 Emscripten 胶水签名（__wasm_call_ctors）判断是否由 JS 编译而来 | E-wasm-struct | P0 |
| **BD** | WASM 函数数量多但逻辑简单、函数体被拆分为微小函数；或存在无意义 block/loop 嵌套 | diswasm 评估函数最小化级别；JEB Pro / IDA WASM 插件深度分析；动态追踪执行日志 | E-wasm-obfuscation | P1 |
| **BE** | WASM 模块通过 JS 导入/导出函数与浏览器交互，存在 WebSocket、fetch、WebGL 调用 | 同时分析 JS 胶水代码和 WASM 模块；浏览器 DevTools 追踪数据交换；提取网络通信 URL/域名 | E-wasm-c2 | P1 |

## 12. Java JAR/Class（BF BG BH BI）

| ID | 触发 | 动作（摘要） | Evidence | 优先 |
|----|------|--------------|----------|------|
| **BF** | JD-GUI/jadx 打开 JAR 时类名/方法名为无意义短字符（a.a.a / _0x 前缀 / 数字类名）；或大量 while/switch 控制流混淆 | 识别混淆器类型（ProGuard / Allatori / ZKM）；Java Deobfuscator 静态反混淆；高强度时动态调试追踪关键逻辑 | E-java-obfuscation | P0 |
| **BG** | 大量 Class.forName()、Method.invoke()、Constructor.newInstance()；或自定义 ClassLoader + defineClass() 从字节数组内存加载类；导入表无害但运行时动态加载恶意类 | javap -c -v 查看反射调用细节；追踪 Class.forName 参数字符串；检查 defineClass() 字节数组来源；动态对 Method.invoke 下断 | E-java-reflection | P0 |
| **BH** | JAR 含 .so（Linux/Android）或 .dll（Windows）；或 System.loadLibrary() 调用 | 提取原生库文件；file 识别格式；转入 ELF/PE 独立分析流程 | E-java-native | P1 |
| **BI** | JAR/ZIP 解压后含嵌套 JAR/WAR/EAR；/resources、/assets 中存在高熵 .dat/.bin/.img 文件 | 递归解压所有嵌套归档；熵值分析判断加密/压缩；检查 META-INF/MANIFEST.MF 和 pom.xml | E-java-nested | P1 |

## 13. AutoIt（BJ BK BL DM）

| ID | 触发 | 动作（摘要） | Evidence | 优先 |
|----|------|--------------|----------|------|
| **BJ** | PE 字符串含 AutoIt / AU3 / EA05 / EA06 签名；或资源节含 AutoIt 脚本资源（注意与 AutoHotKey 区分，MITRE T1059.010 两者共用） | autoit-ripper 提取编译脚本；识别编码家族（EA05 = AutoIt3.00 / EA06 = AutoIt3.26）；EA06 头部后提取 8 字节解密密钥用于解密载荷；还原源码 | E-autoit-extract | P0 |
| **BK** | 提取脚本含大量 StringEncrypt/_StringEncrypt；或 Execute 动态执行 + 无意义变量名 | myAutToExe 静态反编译；识别反调试技术；分析混淆后控制流 | E-autoit-deobf | P1 |
| **BL** | 脚本含 RegWrite（注册表持久化）、FileInstall（文件释放）、InetGet（网络下载）、Run/RunWait | 标记敏感 API 调用序列；分析 InetGet URL；追踪 FileInstall 释放路径 | E-autoit-malicious | P0 |
| **DM** | AutoIt 作为 loader 执行进程空洞注入（process hollowing）：CallWindowProc/EnumWindows 回调 + shellcode + 注入合法进程（regsvcs.exe 等），释放 .NET 载荷（DarkGate / Snake Keylogger / ArechClient2 模式） | 检查 DllCall/DllCallbackRegister 对 kernel32 注入 API 的调用链；提取 shellcode 数据；识别被注入目标进程；提取 .NET 载荷独立分析 | E-autoit-hollowing | P0 |

## 14. HTA / HTML Application（BM BN BO）

| ID | 触发 | 动作（摘要） | Evidence | 优先 |
|----|------|--------------|----------|------|
| **BM** | HTML 含 HTA:APPLICATION 标签、window.execScript 或 CreateObject 调用 | 检查 HTA:APPLICATION 属性（Application、WindowState）；提取 script 标签中的 VBS/JS | E-hta-bypass | P0 |
| **BN** | HTA 通过 mshta.exe 启动后 XMLHttpRequest / ActiveXObject 远程拉 Payload 执行 | 提取网络请求 URL；跟踪 ActiveXObject 创建（ADODB.Stream 等）；还原完整下载执行链 | E-hta-download-chain | P0 |
| **BO** | HTA 仅含单行极长混淆字符串，经 eval / execScript 执行 | 提取 Base64/Hex 编码载荷解码；CyberChef 递归检测编码类型；还原载荷 | E-hta-oneline | P1 |

## 15. WSF / JSE / VBE（BP BQ BR BS）

| ID | 触发 | 动作（摘要） | Evidence | 优先 |
|----|------|--------------|----------|------|
| **BP** | .wsf 含 \<job\> + \<script language="..."\> 标签，混合 JScript/VBScript/Python | 按 \<script language\> 分割代码块；分别按对应语言规则分析 | E-wsf-multi | P0 |
| **BQ** | .jse/.vbe 开头含 #@~^ 签名，Microsoft Script Encoder 编码 | screnc-decoder 解码；无工具时动态执行 + dump 解码脚本 | E-jse-decode | P0 |
| **BR** | WSF 多 \<script\> 块 + \<package\> 引用外部资源 + \<component\> 引用 COM 组件 | 建立跨块调用图；追踪 \<script\> 之间函数调用；还原完整执行流程 | E-wsf-call-chain | P1 |
| **BS** | WSF 含 WshShell.SendKeys 绕过 UAC、WshShell.Run 配合 0 窗口隐藏、WScript.Sleep 延时绕过 | 检查用户模拟操作是否用于绕过安全提示；记录隐蔽执行参数 | E-wsf-anti-detect | P1 |

## 16. MSI 安装包（BT BU BV）

| ID | 触发 | 动作（摘要） | Evidence | 优先 |
|----|------|--------------|----------|------|
| **BT** | MSI 文件含 CustomAction 表（Binary / Script / DLL 类型自定义操作） | msiexec /a 或 lessmsi 提取内容；检查 CustomAction 表；提取自定义操作二进制文件 | E-msi-custom-action | P0 |
| **BU** | MSI Binary 表含 VBScript/JScript 自定义操作脚本 | 从 Binary 表提取脚本二进制解码为可读脚本；按 VBS/JS 规则分析 | E-msi-script | P1 |
| **BV** | MSI 通过 /quiet /passive /qn 静默安装；ALLUSERS=1 提权 | 记录安装命令行参数；分析 Property 表权限设置；标记静默+提权组合 | E-msi-privilege | P1 |

## 17. REG 注册表脚本（BW BX BY）

| ID | 触发 | 动作（摘要） | Evidence | 优先 |
|----|------|--------------|----------|------|
| **BW** | .reg 写入 HKCU\...\Run 或 HKLM\...\Run 等自动启动路径 | 提取所有路径；标记 Run 路径条目为持久化；记录完整路径和值 | E-reg-persistence | P0 |
| **BX** | .reg 修改 HKCR\...\shell\open\command（文件关联）或 HKCR\CLSID\{...}\InprocServer32（DLL 注入） | 检查 shell\open\command 是否为非常规 exe；检查 InprocServer32 DLL 路径 | E-reg-hijack | P0 |
| **BY** | .reg 修改 HKLM\...\Policies\System（UAC 级别）、EnableLUA、ConsentPromptBehaviorAdmin | 检查修改前默认安全配置；分析对 UAC 的影响；标记降级行为 | E-reg-uac-bypass | P1 |

## 18. VBScript（BZ CA CB CC DN）

| ID | 触发 | 动作（摘要） | Evidence | 优先 |
|----|------|--------------|----------|------|
| **BZ** | .vbs/.js 同时被 VBScript 和 JScript 解析；条件编译（@_win32）或语言特性交叉执行 | 分离 VBScript/JScript 代码块；分别语法分析；识别混合执行逻辑 | E-vbs-mixed | P1 |
| **CA** | 脚本含 CreateObject("WScript.Shell") / CreateObject("Shell.Application") / Scripting.FileSystemObject | 标注高危 COM 对象调用；跟踪 Run/Exec 参数；追踪 FSO 创建的文件路径 | E-vbs-com-abuse | P0 |
| **CB** | 脚本开头 #@~^ 签名，Microsoft Script Encoder 编码（VBS 专有） | screnc-decoder 解码；无工具时动态执行 + dump 解码脚本 | E-vbs-encoded | P0 |
| **CC** | VBA/VBScript 含 WScript.Shell.Run + cmd /c + PowerShell，后续进程注入 | 追踪 CreateObject COM 对象链；分析 Run 参数中注入特征；记录完整进程创建链 | E-vbs-inject-chain | P0 |
| **DN** | VBScript/JScript 通过 WMI ActiveScriptEventConsumer 实现无文件持久化（无启动文件夹/注册表 Run 键） | 检查 WMI 事件订阅（__EventFilter + __FilterToConsumerBinding + ActiveScriptEventConsumer）；提取绑定脚本内容；标记无文件持久化 | E-vbs-wmi-persist | P0 |

## 19. BAT/CMD 高级混淆（CD–CI）→ 与 §1 U–W 互补

| ID | 触发 | 动作（摘要） | Evidence | 优先 |
|----|------|--------------|----------|------|
| **CD** | setlocal enabledelayedexpansion + !var! + 动态变量名（!var_%i%!） | 启用延迟扩展后逐条展开；Batch-Dump --expand 自动展开 | E-bat-delayed-expand | P0 |
| **CE** | 通过 type/more/findstr 读取自身或文件的 :stream ADS 替代数据流执行 | 检查 : 后缀引用（file.bat:payload）；dir /r 列 ADS；type file:stream 提取 | E-bat-ads-hidden | P0 |
| **CF** | 大量 echo 逐行写入 .tmp/.cmd 临时文件再 call 执行 | 提取所有 echo 重定向还原临时文件内容；监控临时目录生成的脚本 | E-bat-temp-gen | P1 |
| **CG** | for %%i in (...) do set var=%%i 累加变量；for /f 逐行解析命令输出 | 逐条展开 for 循环记录每次迭代赋值；序列化还原 for /f 结果 | E-bat-for-expand | P1 |
| **CH** | 主批处理通过 %1 %* 接收参数，由父进程/下载器传入混淆指令 | 检查调用上下文记录传入参数；Base64 参数解码还原；还原完整调用链 | E-bat-param-call | P1 |
| **CI** | certutil -decode / powershell -Command / echo \| findstr 组合解码执行 | 提取 Base64/Hex 字符串解码；检查解码结果是否为可执行脚本/PE | E-bat-encoded-exec | P0 |

## 20. PowerShell 高级绕过（CJ–CO, DL）→ 与 §2 X–Z 互补

| ID | 触发 | 动作（摘要） | Evidence | 优先 |
|----|------|--------------|----------|------|
| **CJ** | [Ref].Assembly.GetType('...AmsiUtils') / amsiInitFailed / GetTypes() 等 AMSI 绕过（含硬件断点绕过：CPU 调试寄存器，无内存写入/VirtualProtect） | 识别绕过模式（Patch / 注册表 / 环境变量 / 硬件断点）；动态确认生效；标记绕过技术类型 | E-ps-amsi | P0 |
| **CK** | [PSConstraintLanguage] 类型操作或通过 DefaultRunspace 修改会话状态绕过 CLM | 识别 CLM 绕过模式；标记 bypass-clm；分析绕过后执行上下文 | E-ps-clm-bypass | P0 |
| **CL** | [ScriptBlock]::Create / $ExecutionContext.InvokeCommand 构造器；或覆盖 ScriptBlock 日志设置 | 检查脚本是否禁用日志记录；动态验证日志是否被绕过 | E-ps-sb-log-bypass | P1 |
| **CM** | IEX (New-Object Net.WebClient).DownloadString(...) 或 [Reflection.Assembly]::Load(FromBase64...) 无文件执行 | 提取下载 URL 检查域名/IP 信誉；PS 日志捕获内存加载代码；隔离网络模拟提取载荷 | E-ps-reflect-load | P0 | <!-- security-allowlist: SEC005 -->
| **CN** | 三层以上编码嵌套：外层 Base64 → Gzip → XOR → 明文（超出 §2 X 的两层范围） | 递归解码到明文或无法继续；每层记中间状态；PowerDecode 自动化；每层结果入证 | E-ps-multi-decode | P0 |
| **CO** | Set-Alias 将 IEX 映射为单字符别名；Get-ChildItem variable: 动态获取变量值 | 展开所有别名映射替换回原始命令名；AST 分析还原变量 | E-ps-alias-decode | P1 | <!-- security-allowlist: SEC005 -->
| **DL** | 脚本含 ntdll.dll EtwEventWrite 补丁（stomping）静默遥测；常与 AMSI 绕过组合使用 | 检查是否存在 EtwEventWrite 地址获取 + 内存补丁（ret 0xC3）；与 CJ AMSI 绕过同时检查；标记双绕过组合 | E-ps-etw-bypass | P0 |

## 21. JavaScript 高级混淆（CP CQ DE DF）→ 与 §4 AD–AF 互补

| ID | 触发 | 动作（摘要） | Evidence | 优先 |
|----|------|--------------|----------|------|
| **CP** | JS 使用 Proxy 对象拦截属性访问 + Reflect API 动态调用方法绕过静态分析 | 识别 Proxy get/set/apply 陷阱函数；追踪 Reflect.get 实际目标；标记动态拦截行为 | E-js-proxy | P1 |
| **CQ** | JS 含 _0x... 十六进制字符串数组 + while(!![]) 死循环 + for+switch 控制流（obfuscator.io 特征） | 识别 obfuscator.io 特征（字符串数组+死循环）；de4js / jsnice 自动反混淆；还原后代码入证 | E-js-obfuscator | P0 |
| **DE** | JS 主体为大型字节码数组 + VM 解释器循环（多 while/switch），入口指向 eval/Function 构造器；业务逻辑完全不可读（§4 AD 的深化） | 识别 VM 入口函数跟踪 opcode→处理函数映射；浏览器动态执行 Hook eval 输出；JSimplifier AST 重构；记录 opcode 映射表 | E-jsvmp-deep | P0 |
| **DF** | JS 含 eval 动态生成新代码并立即执行、document.write 重写页面、或 Function 构造器动态构造函数体 | Hook eval 和 Function 构造函数记录生成的代码；浏览器动态执行捕获自修改内容 | E-js-selfmod | P1 |

## 22. Xposed/LSPosed 模块分析（CR–CX）→ apk-reverse

> 分析 Xposed/LSPosed **模块本身**作为逆向目标（非工具使用场景）。

| ID | 触发 | 动作（摘要） | Evidence | 优先 |
|----|------|--------------|----------|------|
| **CR** | AndroidManifest.xml 无 android:name 入口 Activity；meta-data 指定 xposedmodule=true | 检查 assets/xposed_init 确定入口类；搜索 IXposedHookLoadPackage/ZygoteInit/CmdInit 接口实现 | E-xp-entry | P0 |
| **CS** | 代码含 XposedHelpers.findAndHookMethod / XposedBridge.hookMethod / findClass | 提取 findAndHookMethod 第一参数（目标类）+ 第二参数（目标方法）；建立目标应用清单 | E-xp-hook-targets | P0 |
| **CT** | 模块含 DexClassLoader/PathClassLoader 动态加载；或 Runtime.exec / ProcessBuilder 执行命令 | 追踪 DexClassLoader 构造参数；提取动态加载 DEX 独立分析；检查 exec 命令参数 | E-xp-dynamic-load | P0 |
| **CU** | Hook 目标涉及支付/生物识别/短信/通讯录/位置/加密密钥等敏感 API | 对 Hook 目标类/方法进行敏感度分类；标记支付类/生物识别类/短信通讯录类；汇总威胁等级 | E-xp-sensitive-hooks | P0 |
| **CV** | 代码含 XposedBridge 检测规避 / Zygote 注入痕迹清除 / 自定义网络通信 | 检查 stacktrace 修改 / XposedBridge 类引用清除；检查独立网络请求（OkHttp/Socket）；识别 C2 目标 | E-xp-anti-detection | P1 |
| **CW** | 代码含 Resources 动态替换 / View 绘制拦截 / AccessibilityService 声明 | 检查 AssetManager 替换 / Resources.updateConfiguration；检查 AccessibilityService 配置；识别 UI 劫持 | E-xp-ui-hijack | P1 |
| **CX** | AndroidManifest.xml 声明 lsposed xposedscope meta-data；或代码含包名白名单检查 | 解析 xposedscope 目标应用范围；检查动态白名单绕过（反射修改 scope）；识别全局 Hook 越权 | E-xp-scope-bypass | P1 |

## 23. Magisk 模块深度分析（CY–DC, DG–DI）→ 与 §7 AR–AT 互补

> §7 聚焦格机/破坏行为。本节覆盖非破坏性但可疑的模块行为：安装脚本分析、文件释放、Zygisk 注入、反检测、持久化、提权、横向感染。

| ID | 触发 | 动作（摘要） | Evidence | 优先 |
|----|------|--------------|----------|------|
| **DG** | Magisk 模块 ZIP 根目录含 config.sh / install.sh；META-INF/com/google/android/update-binary 为非标准安装器 | 提取 config.sh/install.sh 中 on_install/print_modname/set_permissions 函数；检查 update-binary 是否含额外载荷；标记 pm install / dd 块设备 / mount -o remount,rw 操作 | E-mg-install-script | P0 |
| **DH** | ZIP 内含 system/ / vendor/ / data/ 目录结构；或 post-fs-data.sh / service.sh 等开机执行脚本 | 提取释放文件路径识别是否释放 APK 到 /system/priv-app/；检查 service.sh + post-fs-data.sh 内容识别开机自启/后台保活/C2 通信；标记所有写入系统分区操作 | E-mg-file-drop | P0 |
| **CY** | 模块含 zygisk/ 目录（arm64-v8a.so 等原生库）；或 config.sh 声明 IS_ZYGISK=true | 提取 zygisk/ 原生库分析 ZygiskModule 回调（onLoad / preAppSpecialize / postAppSpecialize）；检查 JNI Hook | E-mg-zygisk | P0 |
| **DI** | 模块脚本写入 /data/adb/service.d/ 或 /data/adb/post-fs-data.d/；或修改 crontab/init.rc（§7 AT 的深化） | 提取写入 service.d + post-fs-data.d 的脚本内容；检查卸载时自动感染其他模块的逻辑（post-uninstall.sh / 模块目录监控）；检查 magisk --remove-modules 触发保护机制 | E-mg-persistence | P0 |
| **CZ** | 模块脚本含 resetprop 修改系统属性 / magiskhide / DenyList；或集成 Shamiko（隐藏 Zygisk 本身）/ TrickyStore（篡改证书链）/ PlayIntegrityFork（伪造 Play Integrity API） | 提取所有 resetprop 调用识别被修改属性（ro.debuggable / ro.build.tags 等）；检查 DenyList 隐藏自身；识别 Shamiko/TrickyStore/PlayIntegrityFork 模块级反检测 | E-mg-anti-detect | P0 |
| **DA** | 模块脚本含 setenforce 0 / mount -o rw,remount /system / chmod 777 敏感目录 | 检查 SELinux 操作（setenforce/chcon/restorecon）；检查系统分区挂载 + dm-verity 禁用；标记高危提权 | E-mg-privilege | P0 |
| **DB** | 释放 APK/脚本含 curl/wget/HTTP 客户端；或释放 APK 申请 INTERNET + READ_CONTACTS/SMS 等敏感权限 | 提取网络请求目标 URL/IP；分析释放 APK 权限声明；识别数据外传逻辑 | E-mg-c2 | P0 |
| **DC** | 脚本遍历 /data/adb/modules/ 目录、修改其他模块文件、或写入自身副本到其他模块 | 检查 module.prop 注入恶意指令；检查其他模块 service.sh 追加恶意代码；识别"寄生"逻辑 | E-mg-cross-infect | P0 |

---

## 24. 约束（全局）

1. **不平行主流程**：阶段门闩仍以 re-agent-workflow / 各 skill 为准。  
2. **Evidence 必记**：含失败、半还原、quality= 标注。  
3. **与 A–T 去重**：PE 反调试不重复；AM→R；AJ 补 DLL 视角不推翻 TLS 火箭。  
4. **工具缺失**：记 n/a + 手工等价，不假装已用商业套件。  
5. **授权**：破坏性/注入/驱动漏洞类只做防御分析与取证表述。
6. **扩展规则去重**：ELF → elf-analysis.md；Mach-O → platforms.md；Python → languages.md。本表不重复这些格式的规则。

## 25. P0 最小勾选（类型命中时）

```text
□ bat/cmd → U（+ 需要时 V/W；高级 CD–CI）
□ ps1 → X（+ Z；高级 CJ–CO + DL ETW）
□ vba/xlm → AA + DD + DJ（+ AB/AC）
□ office ooxml/rtf → BA + DK（+ BB 若疑 DDE）
□ js 强混淆 → AD 或 AE（+ AF；高级 CP/CQ/DE/DF）
□ sys → AG + AH（+ AI 若疑 BYOVD）
□ dll → AJ + AK/AL；Delay-Load 走 R
□ apk 破坏/隐藏 → AR/AS 或 AU（+ AT/AV）
□ pdf → AW + AX（+ AY/AZ）
□ wasm → BC（+ BD/BE）
□ jar/class → BF + BG（+ BH/BI）
□ autoit → BJ + BL + DM（+ BK）
□ hta → BM + BN（+ BO）
□ wsf/jse/vbe → BP + BQ（+ BR/BS）
□ msi → BT（+ BU/BV）
□ reg → BW + BX（+ BY）
□ vbs → CA + CB + CC + DN（+ BZ）
□ xposed 模块 → CR + CS + CT + CU（+ CV–CX）
□ magisk 深度 → DG + DH + CY + DI + CZ + DA（+ DB/DC）
```
