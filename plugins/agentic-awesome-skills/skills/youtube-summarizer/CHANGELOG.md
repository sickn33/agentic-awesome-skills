# Changelog - youtube-summarizer

All notable changes to the youtube-summarizer skill will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [1.2.1] - 2026-02-04

### 🐛 Fixed

- **Exit code propagation in `--list` mode**
  - **Issue:** Script always exited with status 0 even when `list_available_transcripts()` failed
  - **Risk:** Broke automation pipelines that rely on exit codes to detect failures
  - **Root Cause:** Return value from `list_available_transcripts()` was ignored
  - **Solution:** Now properly checks return value and exits with code 1 on failure
  - **Impact:** Scripts in automation can now correctly detect when transcript listing fails (invalid video ID, network errors, etc.)

### 🔧 Changed

- `extract-transcript.py` (lines 58-60)
  - Before: `list_available_transcripts(video_id); sys.exit(0)`
  - After: `success = list_available_transcripts(video_id); sys.exit(0 if success else 1)`

### 📝 Notes

- **Breaking Change:** None - only affects error handling behavior
- **Backward Compatibility:** Scripts that check exit codes will now work correctly
- **Migration:** No changes needed for existing users

### 🔗 Related

- Identified by Codex automated review in agentic-awesome-skills PR #62
- Also fixed in the agentic-awesome-skills fork

---

## [1.2.0] - 2026-02-04

### ✨ Added

- Intelligent prompt workflow integration
- LLM processing with Claude CLI or GitHub Copilot CLI
- Progress indicators with rich terminal UI
- Multiple output formats
- Enhanced error handling

### 🔧 Changed

- Major refactor of transcript extraction logic
- Improved documentation in SKILL.md
- Updated installation requirements

---

## [1.0.0] - 2025-02-01

### ✨ Initial Release

- YouTube transcript extraction
- Language detection and selection
- Basic summarization
- Markdown output format
- Support for multiple languages
