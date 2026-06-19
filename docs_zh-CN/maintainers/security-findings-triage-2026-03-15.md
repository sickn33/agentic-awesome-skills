# 安全发现分类（2026-03-15）

- 基准：`origin/main@226f10c2a62fc182b4e93458bddea2e60f9b0cb9`
- 输入 CSV 仅作为分类输入，而非真实依据。
- 状态含义：`仍然存在且可利用`、`仍然存在但实际风险较低`、`在当前 HEAD 上已过时/不可复现`、`与其他发现重复`。

## 摘要

- 仍然存在且可利用：6
- 在当前 HEAD 上已过时/不可复现：6
- 仍然存在但实际风险较低：14
- 与其他发现重复：7

## 修复分类

- `codex/security-filesystem-trust-boundary`：发现 1、3、7、10、16、20、21、27、31、32、33 以及重复项 5、6、8、17、22、23。
- `codex/security-auth-integrity`：发现 12 和 19。
- `codex/security-shell-safety`：发现 4 和 24。
- `codex/security-robustness`：发现 9、14、15、18、29、30。
- `codex/security-runtime-exploitable`：在默认分支验证后没有独立的分类剩余；可操作的问题都符合上述文件系统/认证/Shell/稳健性分类。

## 详细发现

| # | 严重性 | 标题 | 当前路径 | 状态 | 分类 | 为什么在 `origin/main` 上有效/无效 | 最小安全修复 | 目标 PR |
|---|---|---|---|---|---|---|---|---|
| 1 | 高 | 未经过滤的前置元数据名称导致同步脚本中的路径遍历 | `tools/scripts/sync_microsoft_skills.py` | 仍然存在且可利用 | filesystem-trust-boundary | 在 origin/main 上，sync_microsoft_skills.py 直接在 TARGET_DIR 下使用解析的前置元数据名称，而 cleanup_previous_sync 重复使用了来自归因的 flat_name，且未将其约束到 skills/。 | 将 flat 名称过滤为单个安全路径段，并拒绝解析到克隆仓库之外或本地 skills/ 根目录的清理/复制目标。 | codex/security-filesystem-trust-boundary |
| 2 | 中 | 通过 rehype-raw 渲染技能 markdown 的存储型 XSS | `apps/web-app/src/pages/SkillDetail.tsx` | 在当前 HEAD 上已过时/不可复现 | n/a | 在 origin/main 上，SkillDetail 使用 react-markdown + remark-gfm + rehype-highlight 渲染 markdown；rehype-raw 不再被导入或启用。 | n/a | n/a |
| 3 | 中 | setup_web 中的符号链接跟随复制泄露主机文件 | `tools/scripts/setup_web.js` | 仍然存在且可利用 | filesystem-trust-boundary | 在 origin/main 上，setup_web.js 在 skills/ 上使用了 fs.statSync 和递归复制，因此 skills 内的符号链接可以解析为任意主机文件或目录，并被复制到 public assets 中。 | 仅当符号链接的真实路径保持在 skills/ 内时才解析它们；否则跳过它们并继续复制常规条目。 | codex/security-filesystem-trust-boundary |
| 4 | 中 | 不安全的安装指南允许远程脚本执行 | `skills/apify-actorization/SKILL.md` | 仍然存在但实际风险较低 | shell-safety | 在 origin/main 上，Apify actorization 技能仍然推荐 curl/irm 管道到 Shell 安装和 apify login -t，这虽然是文档级别的，但直接指示了不安全的执行和凭据处理。 | 将管道到 Shell 的命令替换为包管理器指南，并移除命令行令牌示例。 | codex/security-shell-safety |
| 5 | 中 | setup_web.js 现在跟随符号链接，启用文件泄露 | `tools/scripts/setup_web.js` | 与另一个发现重复 | filesystem-trust-boundary | 与发现 3 相同的 origin/main 行为：在 setup_web.js 中基于 fs.statSync 的递归复制在 public asset 设置期间跟随了符号链接目标。 | 在 setup_web.js 中修复一次，将符号链接解析约束到技能根目录。 | codex/security-filesystem-trust-boundary |
| 6 | 中 | Web asset 设置中的符号链接遍历复制任意文件 | `tools/scripts/setup_web.js` | 与另一个发现重复 | filesystem-trust-boundary | 与发现 3 相同的 origin/main 行为：setup_web 递归复制跟随了符号链接目标并复制了解析的内容。 | 在 setup_web.js 中修复一次，将符号链接解析约束到技能根目录。 | codex/security-filesystem-trust-boundary |
| 7 | 中 | .github/skills 同步中的符号链接文件复制泄露主机文件 | `tools/scripts/sync_microsoft_skills.py` | 仍然存在且可利用 | filesystem-trust-boundary | 在 origin/main 上，find_skills_in_directory 通过 item.resolve() 接受符号链接的技能目录，而复制循环接受来自已解析目录的常规文件，且不检查它们是否仍保持在克隆根目录下。 | 拒绝克隆根目录外的符号链接目标，仅复制解析路径保持在克隆根目录下的常规文件。 | codex/security-filesystem-trust-boundary |
| 8 | 中 | Microsoft 技能同步中的符号链接文件复制可泄露主机数据 | `tools/scripts/sync_microsoft_skills.py` | 与另一个发现重复 | filesystem-trust-boundary | 与发现 7 相同的 origin/main 行为：Microsoft 同步路径信任了解析的符号链接目标并从它们复制文件。 | 在 sync_microsoft_skills.py 中修复一次，将解析的路径约束到克隆根目录。 | codex/security-filesystem-trust-boundary |
| 9 | 中 | 提交的 Python 字节码可以隐藏恶意逻辑 | `skills/ui-ux-pro-max/scripts/__pycache__/core.cpython-314.pyc | skills/ui-ux-pro-max/scripts/__pycache__/design_system.cpython-314.pyc` | 仍然存在但实际风险较低 | robustness | 在 origin/main 上，跟踪的 __pycache__ 工件仍然存在于 skills/ui-ux-pro-max/scripts 下，这不利于审查，但无法独立利用。 | 移除跟踪的字节码工件，仅依赖源代码审查以及 .gitignore。 | codex/security-robustness |
| 10 | 中 | 符号链接的 SKILL.md 可通过索引脚本泄露主机文件 | `tools/scripts/generate_index.py` | 仍然存在但实际风险较低 | filesystem-trust-boundary | 在 origin/main 上，generate_index.py 打开它通过 os.walk 找到的每个 SKILL.md，且不跳过符号链接的 SKILL.md 文件，因此恶意的本地符号链接可以将另一个文件泄露到索引元数据生成中。 | 在索引期间跳过符号链接的 SKILL.md 文件。 | codex/security-filesystem-trust-boundary |
| 11 | 低 | 示例加载器信任清单路径，启用文件读取 | `docs/integrations/jetski-gemini-loader/loader.mjs` | 在当前 HEAD 上已过时/不可复现 | n/a | 在 origin/main 上，加载器示例解析请求的文件并拒绝任何 path.relative 逃逸配置的技能根目录的路径，因此报告的直接文件读取不再复现。 | n/a | n/a |
| 12 | 低 | 新爬虫中的 TLS 证书验证已禁用 | `skills/junta-leiloeiros/scripts/scraper/base_scraper.py | skills/junta-leiloeiros/scripts/web_scraper_fallback.py` | 仍然存在但实际风险较低 | auth-integrity | 在 origin/main 上，基础爬虫和直接回退客户端都使用 verify=False / ignore_https_errors=True 实例化 HTTP 客户端，这会削弱传输完整性，但这是本地运行爬虫的风险，而非应用程序 RCE。 | 默认启用 TLS 验证，并要求针对不安全目标进行显式环境选择退出。 | codex/security-auth-integrity |
| 13 | 低 | 完整捆绑包遗漏了有效的技能类别 | `tools/lib/skill-filter.js | tools/scripts/build-catalog.js | data/bundles.json` | 在当前 HEAD 上已过时/不可复现 | n/a | 在 origin/main 上，已发布的捆绑包数据由 tools/scripts/build-catalog.js 生成到 data/bundles.json 中；tools/lib/skill-filter.js 中报告的遗漏不驱动当前已发布的目录数据。 | n/a | n/a |
| 14 | 低 | 格式错误的前置元数据分隔符破坏了技能的 YAML 解析 | `skills/alpha-vantage/SKILL.md | tools/lib/skill-utils.js` | 仍然存在但实际风险较低 | robustness | 在 origin/main 上，skills/alpha-vantage/SKILL.md 仍然包含额外的分隔符标记（--- Unknown），这会导致解析器警告和损坏的元数据解释。 | 修复格式错误的前置元数据，使文件成为有效的 YAML 前置元数据文档。 | codex/security-robustness |
| 15 | 低 | ws_listener 将敏感事件写入可预测的 /tmp 文件 | `skills/videodb/scripts/ws_listener.py` | 仍然存在但实际风险较低 | robustness | 在 origin/main 上，ws_listener 默认将事件、pid 和 websocket-id 文件放在 /tmp 中，这是同主机本地保密性风险，而非远程利用。 | 当未提供显式输出目录时，默认为用户拥有的状态目录，而非共享的 /tmp。 | codex/security-robustness |
| 16 | 低 | 符号链接遍历使 /skills/ 提供任意本地文件 | `apps/web-app/refresh-skills-plugin.js` | 仍然存在但实际风险较低 | filesystem-trust-boundary | 在 origin/main 上，refresh-skills-plugin.js 使用了 path.resolve(filePath).startsWith(...) 和 fs.statSync(filePath)，因此 skills/ 内的符号链接仍然可以在本地开发中读取预期树之外的文件。 | 解析真实路径并仅提供解析路径保持在技能根目录内的文件。 | codex/security-filesystem-trust-boundary |
| 17 | 低 | Sync Skills 端点跟随来自下载存档的符号链接 | `apps/web-app/refresh-skills-plugin.js` | 与另一个发现重复 | filesystem-trust-boundary | 在 origin/main 上，过时的 Home.jsx 路径不再存在，但实时问题与发现 16 的插件根本原因相同：一旦符号链接的内容落在 skills/ 下，开发服务器就仅通过词法路径信任它。 | 在 refresh-skills-plugin.js 中修复一次，通过解析和约束真实路径。 | codex/security-filesystem-trust-boundary |
| 18 | 低 | 如果 YAML 前置元数据不是映射，验证崩溃 | `tools/scripts/validate_skills.py` | 仍然存在但实际风险较低 | robustness | 在 origin/main 上，validate_skills.parse_frontmatter 直接返回 yaml.safe_load 输出；在下游键访问之前，标量 YAML 值未被拒绝。 | 早期拒绝非映射前置元数据并返回验证错误，而非将标量值传递到下游。 | codex/security-robustness |
| 19 | 低 | 匿名 Supabase 写入允许技能星标篡改 | `apps/web-app/src/lib/supabase.ts | apps/web-app/src/hooks/useSkillStars.ts | apps/web-app/src/context/SkillContext.tsx` | 仍然存在且可利用 | auth-integrity | 从源代码推断：在 origin/main 上，useSkillStars 使用公共匿名客户端从前端代码直接向上插入到 skill_stars。仓库中没有服务器端门控或版本化策略证明写入受到约束。 | 默认禁用共享的前端写入，并仅保留本地星标，除非提供显式的部署时选择加入。 | codex/security-auth-integrity |
| 20 | 低 | 元数据修复器覆盖符号链接的 SKILL.md 目标 | `tools/scripts/fix_skills_metadata.py` | 仍然存在但实际风险较低 | filesystem-trust-boundary | 在 origin/main 上，fix_skills_metadata.py 打开并重写每个发现的 SKILL.md，且不跳过符号链接的文件，因此精心制作的符号链接可以修改另一个文件。 | 跳过符号链接的 SKILL.md 文件，并仅变更具有映射前置元数据的真实本地技能文件。 | codex/security-filesystem-trust-boundary |
| 21 | 低 | 安装程序在复制期间解引用符号链接 | `tools/bin/install.js` | 仍然存在且可利用 | filesystem-trust-boundary | 在 origin/main 上，copyRecursiveSync 在克隆的内容上使用 fs.statSync，因此仓库中的恶意符号链接可以将任意本地文件复制到安装目标中。 | 使用 lstat，仅当符号链接保持在克隆仓库根目录内时才解析它们，并跳过/忽略根目录外的链接。 | codex/security-filesystem-trust-boundary |
| 22 | 低 | 安装程序合并路径在复制时解引用符号链接 | `tools/bin/install.js` | 与另一个发现重复 | filesystem-trust-boundary | 与发现 21 相同的 origin/main 行为：install.js 在安装/合并复制期间解引用了符号链接。 | 在 install.js 中修复一次，通过约束或跳过符号链接解析。 | codex/security-filesystem-trust-boundary |
| 23 | 低 | 清理同步通过 flat_name 删除任意路径 | `tools/scripts/sync_microsoft_skills.py` | 与另一个发现重复 | filesystem-trust-boundary | 与发现 1 相同的 origin/main 根本原因：cleanup_previous_sync 使用了来自归因的 flat_name，且未将其约束到 skills/。 | 在 sync_microsoft_skills.py 中修复一次，通过在删除/复制操作之前过滤 flat 名称。 | codex/security-filesystem-trust-boundary |
| 24 | 低 | 音频转录示例允许 Python 代码注入 | `skills/audio-transcriber/examples/basic-transcription.sh` | 仍然存在但实际风险较低 | shell-safety | 在 origin/main 上，basic-transcription.sh 使用了未加引号的 heredoc，并将 $AUDIO_FILE/$MODEL/$TRANSCRIBER 直接嵌入到 Python 源代码中，因此精心制作的输入可以破坏引号并在本地示例脚本中注入代码。 | 使用带引号的 heredoc，并通过环境变量传递值，而非将它们插入到 Python 源代码中。 | codex/security-shell-safety |
| 25 | 低 | 无界的递归技能遍历可能使目录构建崩溃 | `tools/lib/skill-utils.js | tools/scripts/build-catalog.js` | 在当前 HEAD 上已过时/不可复现 | n/a | 在 origin/main 上，listSkillIdsRecursive 从 readdirSync({withFileTypes:true}) 遍历 Dirent 目录；符号链接条目不被视为目录，因此报告的无界符号链接递归不复现。 | n/a | n/a |
| 26 | 低 | 发布脚本仍使用根级 skills_index.json 路径 | `tools/scripts/update_readme.py | tools/scripts/generate_index.py | tools/scripts/release_cycle.sh` | 在当前 HEAD 上已过时/不可复现 | n/a | 在 origin/main 上，根级 skills_index.json 是规范生成的索引，而 release_cycle.sh 只是 release_workflow.js 的包装器，因此报告的路径不匹配不再作为缺陷复现。 | n/a | n/a |
| 27 | 低 | 技能规范化中的符号链接遍历允许文件覆盖 | `tools/lib/skill-utils.js | tools/scripts/normalize-frontmatter.js` | 仍然存在但实际风险较低 | filesystem-trust-boundary | 在 origin/main 上，listSkillIds 在子技能目录上使用 fs.statSync 和 fs.existsSync，因此 normalize-frontmatter 可能将符号链接的技能文件夹视为可写的本地技能。 | 使用基于 lstat 的发现，并在规范化之前跳过符号链接的技能目录/SKILL.md 条目。 | codex/security-filesystem-trust-boundary |
| 28 | 低 | last30days 技能将用户输入直接传递给 Bash 命令 | `skills/last30days/SKILL.md` | 在当前 HEAD 上已过时/不可复现 | n/a | 在 origin/main 上，文档中的命令将 "$ARGUMENTS" 作为带引号的参数传递给 Python，因此报告的直接 Bash 注入接收器不会从当前文本复现。 | n/a | n/a |
| 29 | 低 | 未验证的 YAML 前置元数据可能使索引生成崩溃 | `tools/scripts/generate_index.py` | 与另一个发现重复 | robustness | 与发现 18 相同的 origin/main 根本原因，但在 generate_index.py 中而非 validate_skills.py 中：标量 YAML 值在未经过映射检查的情况下被传递。 | 通过在两个解析器路径中拒绝非映射前置元数据来一次修复。 | codex/security-robustness |
| 30 | 低 | 可预测的 /tmp 计数器文件启用本地文件覆盖 | `skills/cc-skill-strategic-compact/suggest-compact.sh` | 仍然存在但实际风险较低 | robustness | 在 origin/main 上，suggest-compact.sh 将状态存储在 /tmp/claude-tool-count-$$ 中，这是可预测的且仅限共享主机的本地范围。 | 将计数器文件移动到用户拥有的状态目录中。 | codex/security-robustness |
| 31 | 低 | 新同步脚本中的符号链接遍历风险 | `tools/scripts/sync_recommended_skills.sh` | 仍然存在但实际风险较低 | filesystem-trust-boundary | 在 origin/main 上，sync_recommended_skills.sh 使用 cp -r 从仓库复制固定的允许列表，这仅限本地，但仍然信任源内容中的符号链接处理。 | 使用 cp -RP，以便保留符号链接而非解引用它们。 | codex/security-filesystem-trust-boundary |
| 32 | 低 | skills_manager 允许启用/禁用操作中的路径遍历 | `tools/scripts/skills_manager.py` | 仍然存在但实际风险较低 | filesystem-trust-boundary | 在 origin/main 上，enable_skill/disable_skill 在 skills/.disabled 和 skills/ 下直接连接用户提供的技能名称，因此 ../ 段可以逃逸预期的根目录。 | 解析请求的路径并拒绝逃逸预期技能目录的名称。 | codex/security-filesystem-trust-boundary |
| 33 | 低 | Office 解包脚本中的 Zip Slip 风险 | `skills/docx-official/ooxml/scripts/unpack.py | skills/pptx-official/ooxml/scripts/unpack.py` | 仍然存在且可利用 | filesystem-trust-boundary | 在 origin/main 上，两个 unpack.py 脚本都直接调用 ZipFile.extractall(output_path)，因此恶意的 Office 存档可以在请求的目录之外写入。 | 在解压之前验证每个存档成员路径并拒绝路径遍历条目。 | codex/security-filesystem-trust-boundary |
