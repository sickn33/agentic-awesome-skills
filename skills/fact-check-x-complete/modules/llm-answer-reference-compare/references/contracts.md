# 数据契约

`results.json` 必须使用 `schemaVersion=1`：

```json
{
  "schemaVersion": "1",
  "question": "用户原始问题",
  "createdAt": "2026-07-22T18:00:00+08:00",
  "platforms": [
    {
      "platform": "doubao",
      "label": "豆包",
      "url": "https://平台会话页",
      "status": "success",
      "answerMarkdown": "完整原答案[1]",
      "references": [
        {
          "title": "来源原始标题",
          "url": "https://平台实际给出的原始URL",
          "normalizedUrl": "仅用于去重的URL",
          "marker": "1",
          "citationScope": "inline",
          "snippet": "平台已展示或现场已捕获的正文",
          "content": "可选的完整正文",
          "contentAcquisition": "trusted_search_full_content | direct_pdf_extraction | direct_page_extraction",
          "resourceUrl": "可选；可信搜索或页面明确返回的官网原件回链",
          "platformUrl": "可选；深知可信搜索同源回填后保留的深知收录页",
          "originalUrl": "可选；与 platformUrl 同义的兼容字段",
          "originAttributionStatus": "trusted_search_official_url | trusted_search_no_source_url",
          "originAttributionReason": "原发网址核验结论",
          "sameMaterialVerified": true
        }
      ],
      "sourceMentions": [
        {
          "label": "页面显示的来源名称",
          "marker": "1",
          "occurrenceCount": 2
        }
      ],
      "artifacts": {
        "screenshot": "相对路径",
        "html": "相对路径",
        "trace": "相对路径"
      }
    }
  ]
}
```

`citationScope` 取 `inline`、`global`、`inline_and_global`。平台同时提供逐句脚标和全局检索来源时必须完整保留两类，不能因抓到脚标就提前结束。

豆包来源浮层只显示标题时，采集器先用可信搜索 `return_full_content=true` 补全与该标题或 URL 匹配的同一材料全文，再回退到页面或 PDF 直接提取，并以 `contentAcquisition` 记录正文取得方式。这属于引用存证，不得另找材料或替换 URL。已绑定 PDF 仍无法取得正文时必须失败关闭，不得继续产出平台幻觉结论。

深知晓引用优先用可信搜索 `return_full_content=true` 做同源回填。可信搜索返回的同一材料全文或段落直接写入 `content` 用于判断，不再访问源网址二次抓取正文；可信搜索返回的 `源网址` 直接作为官方来源主链接，写入 `url`、`officialUrl`、`resourceUrl` 与 `sourceUrl`，并用 `platformUrl` 与 `originalUrl` 保留深知收录页。可信搜索未返回源网址时使用 `trusted_search_no_source_url`，保留深知收录页作为兜底，不伪造外链。

`status=success` 时 `answerMarkdown` 必须非空。失败状态保留 `error`，引用可为空。普通平台引用的 `url` 是原始事实，不允许后续程序覆盖；深知可信搜索同源回填按上一段双链接契约处理。`sourceMentions` 只记录页面显示但未暴露 URL 的来源名称，不能作为可回溯参考文献或来源忠实性证据。

`dknowc-deep-research` 是独立平台 ID。其 `answerMarkdown`、`references` 和
`artifacts` 必须来自点击普通回答下方“深度研究”后新打开的
`/wlcb/SDSYbaogao/` 报告页，不能复用首轮普通回答冒充深度研究结果。该平台
不会因名称或页面来源自动获得 `dknowc-chat` 的权威锚点资格。

来源对外统一分为三类：

- 官方原站；
- 官方来源；
- 非官方来源。

深知晓可信搜索返回的 dknowc / `DT_DATA` 来源属于官方来源，即使对外只暴露内部库链接，也统一标为“官方来源”，可注明“由深知可信搜索收录”。`originUrl`、`resourceUrl`、`officialUrl` 或 `sourceUrl`（兼容 snake_case）仅作为可选官网回链，不作为官方性与直接准确的前置条件。

可见或交互采集使用 Playwright `launchPersistentContext` 直接启动系统 Chromium 浏览器；命令运行期间保留深知晓与豆包主页面，登录、验证码或人机验证交给用户本人处理，检测完成后自动续采。命令结束时关闭浏览器进程但保留独立配置目录中的登录状态。无头/CI 模式同样关闭浏览器，正文提取用的临时来源页始终关闭。

macOS 可见或交互采集依次选择
`FACT_CHECK_X_BROWSER_EXECUTABLE`、Google Chrome、Microsoft Edge、Brave、
Chromium。系统没有受支持浏览器时生成 Computer Use 恢复状态并停止在 1.0；
Chrome for Testing 默认仅用于无头/CI 回归。

`login` 或 `run` 在可见交互链路失败时必须写出
`schemaVersion=fact-check-x/capture-recovery@1`、`status=required`、
`action=computer_use`。运行载体具备 Computer Use 时用它恢复同一平台；不得
以无头浏览器、另一套 Chrome、锁文件清理、显示会话检查或启动参数诊断作为
恢复动作。载体缺少 Computer Use 时必须停止在 1.0。

两个命令必须前台直接执行并保留真实退出码；执行工具返回可轮询运行会话时
持续轮询，不得使用 shell 后台任务，亦不得通过 `tail`、`tee` 等管道把非零退出
覆盖为成功。只有 Playwright 已建立可见页面或 `results.json` 证明全部平台成功
后，才允许对用户声明启动或完成。
