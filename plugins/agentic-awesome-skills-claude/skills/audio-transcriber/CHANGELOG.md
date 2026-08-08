# Changelog - audio-transcriber

All notable changes to the audio-transcriber skill will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [1.1.0] - 2026-02-03

### ✨ Added

- **Intelligent Prompt Workflow** (Step 3b) - Complete integration with prompt-engineer skill
  - **Scenario A**: User-provided prompts are automatically improved with prompt-engineer
    - Displays both original and improved versions side-by-side
    - Single confirmation: "Usar versão melhorada? [s/n]"
  - **Scenario B**: Auto-generation when no prompt provided
    - Analyzes transcript and suggests document type (ata, resumo, notas)
    - Shows suggestion and asks confirmation
    - Generates complete structured prompt (RISEN/RODES/STAR)
    - Shows preview and asks final confirmation
    - Falls back to DEFAULT_MEETING_PROMPT if declined

- **LLM Integration** - Process transcripts with Claude CLI or GitHub Copilot CLI
  - Priority: Claude > GitHub Copilot > None (transcript-only mode)
  - Step 0b: CLI detection logic documented
  - Timeout handling (5 minutes default)
  - Graceful fallback if CLI unavailable

- **Progress Indicators** - Visual feedback during long operations
  - `tqdm` progress bar for Whisper transcription segments
  - `rich` spinner for LLM processing
  - Clear status messages at each step

- **Timestamp-based File Naming** - Avoid overwriting previous transcriptions
  - Format: `transcript-YYYYMMDD-HHMMSS.md`
  - Format: `ata-YYYYMMDD-HHMMSS.md`
  - Prevents data loss from repeated runs

- **Automatic Cleanup** - Remove temporary files after processing
  - Deletes `metadata.json` and `transcription.json` automatically
  - `--keep-temp` flag to preserve if needed
  - Clean output directory

- **Rich Terminal UI** - Beautiful output with `rich` library
  - Formatted panels for prompt previews
  - Color-coded status messages (green=success, yellow=warning, red=error)
  - Spinner animations for long-running tasks

- **Dual Output Support** - Generate both transcript and processed ata
  - `transcript-*.md` - Raw transcription with timestamps
  - `ata-*.md` - Intelligent summary/meeting minutes (if LLM available)
  - User can decline LLM processing to get transcript-only

### 🔧 Changed

- **SKILL.md** - Major documentation updates
  - Added Step 0b (CLI Detection)
  - Updated Step 2 (Progress Indicators)
  - Added Step 3b (Intelligent Prompt Workflow with 150+ lines)
  - Updated version to 1.1.0
  - Added detailed workflow diagrams for both scenarios

- **install-requirements.sh** - Added UI libraries
  - Now installs `tqdm` and `rich` packages
  - Graceful fallback if installation fails
  - Updated success messages

- **Python Implementation** - Complete refactor
  - Created `scripts/transcribe.py` (516 lines)
  - Functions: `detect_cli_tool()`, `invoke_prompt_engineer()`, `handle_prompt_workflow()`, `process_with_llm()`, `transcribe_audio()`, `save_outputs()`, `cleanup_temp_files()`
  - Command-line arguments: `--prompt`, `--model`, `--output-dir`, `--keep-temp`
  - Auto-installs `rich` and `tqdm` if missing

### 🐛 Fixed

- **User prompts no longer ignored** - v1.0.0 completely ignored custom prompts
  - Now processes all prompts (custom or auto-generated) with LLM
  - Improves simple prompts into structured frameworks

- **Temporary files cleanup** - v1.0.0 left `metadata.json` and `transcription.json` as trash
  - Now automatically removed after processing
  - Clean output directory

- **File overwriting** - v1.0.0 used same filename (e.g., `meeting.md`) every time
  - Now uses timestamp to prevent data loss
  - Each run creates unique files

- **Missing ata/summary** - v1.0.0 only generated raw transcript
  - Now generates intelligent ata/resumo using LLM
  - Respects user's prompt instructions

- **No progress feedback** - v1.0.0 had silent processing (users didn't know if it froze)
  - Now shows progress bar for transcription
  - Shows spinner for LLM processing
  - Clear status messages throughout

### 📝 Notes

- **Backward Compatibility:** Fully compatible with v1.0.0 workflows
- **Requires:** Python 3.8+, faster-whisper OR whisper, tqdm, rich
- **Optional:** Claude CLI or GitHub Copilot CLI for intelligent processing
- **Optional:** prompt-engineer skill for automatic prompt generation

### 🔗 Related Issues

- Fixes #1: Prompt do usuário RISEN ignorado
- Fixes #2: Arquivos temporários (metadata.json, transcription.json) deixados como lixo
- Fixes #3: Output incompleto (apenas transcript RAW, sem ata)
- Fixes #4: Falta de indicador de progresso visual
- Fixes #5: Formato de saída sem timestamp

---

## [1.0.0] - 2026-02-02

### ✨ Initial Release

- Audio transcription using Faster-Whisper or OpenAI Whisper
- Automatic language detection
- Speaker diarization (basic)
- Voice Activity Detection (VAD)
- Markdown output with metadata table
- Installation script for dependencies
- Example scripts for basic transcription
- Support for multiple audio formats (MP3, WAV, M4A, OGG, FLAC, WEBM)
- FFmpeg integration for format conversion
- Zero-configuration philosophy

### 📝 Known Limitations (Fixed in v1.1.0)

- User prompts ignored (no LLM integration)
- Only raw transcript generated (no ata/summary)
- Temporary files not cleaned up
- No progress indicators
- Files overwritten on repeated runs
