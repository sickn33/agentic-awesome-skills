# Changelog

## 1.0.0 — 2026-10-12

First tagged release of the presenter and styled explainer workflow.

### Added

- Twelve explainer styles: the original nine visual styles plus **推演 / Derivation** (`v10-reasoning`), **案卷 / Casefile** (`v11-casefile`), and **小剧场 / Sitcom** (`v12-sitcom`).
- Reusable kits, starters, KV cache examples, and a separate gallery for the three narrative styles.
- Optional narration pronunciation entries and pause markers, with regression coverage for engine word timestamps and plain narration.
- A release version file and bilingual README links to releases and this changelog.

### Fixed

- Windows / Git Bash temporary paths and native-tool CRLF output in smoke tests and delivery finalization, including portrait contact-sheet orientation ([#3](https://github.com/cclank/lanshu-create-ai-presenter-video/pull/3)).
- Windows npm cache lookup and Chrome executable suffixes for the notebook and chalkboard sound readers ([#4](https://github.com/cclank/lanshu-create-ai-presenter-video/pull/4)). The notebook reader retains its existing Chrome sandbox default.
- Edge cases in reusable starters, QA error reporting, and still-grid output directory creation.

### Validation

- Offline presenter and styled smoke suites, all twelve starter sync/stamp checks, and four narration timing/pronunciation regressions.
- Native macOS notebook/chalkboard cue extraction and simulated Windows CRLF, temporary-directory, cache, and executable-path checks.
- Native Windows end-to-end execution remains unverified; the GitHub workflow runs on Ubuntu.

### Thanks

Thanks to [@happysharegithub](https://github.com/happysharegithub) for the Windows compatibility contributions in #3 and #4.

### 中文说明

本版将讲解风格扩展到十二种，新增推演、案卷、小剧场及其风格包、起步模板、KV cache 示例和独立预览图；加入可选读音配置与停顿标记。合并了 Windows 路径、换行和声音读取器的兼容修复，并保留笔记本读取器的 Chrome 沙箱默认设置。

离线流程、十二种模板和四项配音时序回归检查通过。Windows 已完成条件模拟核验，完整实机流程仍待验证。
