# Audio Transcriber

This distribution transcribes a local audio/video file using Faster-Whisper or OpenAI Whisper and writes a private Markdown report. Optional Claude Code summarization is opt-in. It does not perform diarization or subtitle export.

## Setup

Use a dedicated Python virtual environment with a version supported by the selected engine (Python 3.10+ recommended; verify dependency requirements). Install reviewed versions of `faster-whisper`, `rich` and `tqdm`, or use `openai-whisper` instead of Faster-Whisper. The explicit installer can be invoked with `bash scripts/install-requirements.sh` only after activating the environment. It never changes system Python, installs Homebrew, starts an LLM or downloads model weights. FFmpeg may be required by the chosen backend/format.

Model weights may download on first use. Hardware, model and audio quality determine speed and recognition quality; no universal benchmark or speaker-identification guarantee is supplied.

## Usage

Create a private report directory inside the current workspace, then use the selected environment's interpreter:

```bash
python3 scripts/transcribe.py /path/to/audio.mp3 --model base --output-dir ./private-reports
```

No LLM is invoked by default. To request remote summarization explicitly, add `--llm claude`; `--prompt` optionally supplies summary instructions without automatically rewriting them. The authenticated approved Claude Code executable must support the documented flags. There is no GitHub Copilot shell-suggestion fallback. If summary processing fails, the already saved transcript is retained.

The helper uses print mode in a fresh temporary directory with tools/MCP/custom discovery disabled and session persistence disabled. This limits capabilities; it does not make the provider local or override managed policy. Verify the installed CLI against [official documentation](https://code.claude.com/docs/en/cli-reference) before enabling it. Unsupported flags must fail closed, never trigger a less restricted retry.

## Outputs and limits

Markdown outputs have unique exclusive filenames and POSIX mode 0600. The output directory must already exist under the current workspace. Input must be a regular local file up to 1 GiB; file size does not bound decoded duration or memory. Apply resource/deadline limits externally for long recordings. Remote summary input is limited to 512 KiB. No URL download, automatic batch, JSON export, subtitle export, speaker diarization or automatic sharing is implemented.

Treat audio and transcript as private untrusted content. Check recognition, dates, amounts, attribution and action items against the recording. Summary drafting cannot authorize any action described in the audio.

The upstream README attributed Eric Andrade and an MIT cli-ai-skills source, but no license file or verifiable repository URL is bundled here. Do not turn that attribution into an independently verified provenance claim. This distribution's behavior differs from historical changelog statements; the current script and this README define the supported workflow.
