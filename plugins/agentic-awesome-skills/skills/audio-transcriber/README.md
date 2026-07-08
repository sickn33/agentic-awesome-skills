# Audio Transcriber Skill v1.1.0

Transform audio recordings into professional Markdown documentation with **intelligent atas/summaries using LLM integration** (Claude/Copilot CLI) and automatic prompt engineering.

## 🆕 What's New in v1.1.0

- **🧠 LLM Integration** - Claude CLI (primary) or GitHub Copilot CLI (fallback) for intelligent processing
- **✨ Smart Prompts** - Automatic integration with prompt-engineer skill
  - User-provided prompts → automatically improved → user chooses version
  - No prompt → analyzes transcript → suggests format → generates structured prompt
- **📊 Progress Indicators** - Visual progress bars (tqdm) and spinners (rich)
- **📁 Timestamp Filenames** - `transcript-YYYYMMDD-HHMMSS.md` + `ata-YYYYMMDD-HHMMSS.md`
- **🧹 Auto-Cleanup** - Removes temporary `metadata.json` and `transcription.json`
- **🎨 Rich Terminal UI** - Beautiful formatted output with panels and colors

See **[CHANGELOG.md](./CHANGELOG.md)** for complete v1.1.0 details.

## 🎯 Core Features

- **📝 Rich Markdown Output** - Structured reports with metadata tables, timestamps, and formatting
- **🎙️ Speaker Diarization** - Automatically identifies and labels different speakers
- **📊 Technical Metadata** - Extracts file size, duration, language, processing time
- **📋 Intelligent Atas/Summaries** - Generated via LLM (Claude/Copilot) with customizable prompts
- **💡 Executive Summaries** - AI-generated structured summaries with topics, decisions, action items
- **🌍 Multi-language** - Supports 99 languages with auto-detection
- **⚡ Zero Configuration** - Auto-discovers Faster-Whisper/Whisper installation
- **🔒 Privacy-First** - 100% local Whisper processing, no cloud uploads
- **🚀 Flexible Modes** - Transcript-only or intelligent processing with LLM

## 📦 Installation

### Quick Install (NPX)

```bash
npx cli-ai-skills@latest install audio-transcriber
```

This automatically:
- Downloads the skill
- Installs Python dependencies (faster-whisper, tqdm, rich)
- Installs ffmpeg (macOS via Homebrew)
- Sets up the skill globally

### Manual Installation

#### 1. Install Transcription Engine

**Recommended (fastest):**
```bash
pip install faster-whisper tqdm rich
```

**Alternative (original Whisper):**
```bash
pip install openai-whisper tqdm rich
```

#### 2. Install Audio Tools (Optional)

For format conversion support:
```bash
# macOS
brew install ffmpeg

# Linux
apt install ffmpeg
```

#### 3. Install LLM CLI (Optional - for intelligent summaries)

**Claude CLI (recommended):**
```bash
# Follow: https://docs.anthropic.com/en/docs/claude-cli
```

**GitHub Copilot CLI (alternative):**
```bash
gh extension install github/gh-copilot
```

#### 4. Install Skill

**Global installation (auto-updates with git pull):**
```bash
cd /path/to/cli-ai-skills
./scripts/install-skills.sh $(pwd)
```

**Repository only:**
```bash
# Skill is already available if you cloned the repo
```

## 🚀 Usage

### Basic Transcription

```bash
copilot> transcribe audio to markdown: meeting.mp3
```

**Output:**
- `meeting.md` - Full Markdown report with metadata, transcription, minutes, summary

### With Subtitles

```bash
copilot> convert audio file to text with subtitles: interview.wav
```

**Generates:**
- `interview.md` - Markdown report
- `interview.srt` - Subtitle file

### Batch Processing

```bash
copilot> transcreva estes áudios: recordings/*.mp3
```

**Processes all MP3 files in the directory.**

### Trigger Phrases

Activate the skill with any of these phrases:

- "transcribe audio to markdown"
- "transcreva este áudio"
- "convert audio file to text"
- "extract speech from audio"
- "áudio para texto com metadados"

## 📋 Use Cases

### 1. Team Meetings
Record standups, planning sessions, or retrospectives and automatically generate:
- Participant list
- Discussion topics with timestamps
- Decisions made
- Action items assigned

### 2. Client Calls
Transcribe client conversations with:
- Speaker identification
- Key agreements documented
- Follow-up tasks extracted

### 3. Interviews
Convert interviews to text with:
- Question/answer attribution
- Subtitle generation for video
- Searchable transcript

### 4. Lectures & Training
Document educational content with:
- Timestamped notes
- Topic breakdown
- Key concepts summary

### 5. Content Creation
Analyze podcasts, videos, YouTube content:
- Full transcription
- Chapter markers (timestamps)
- Summary for show notes

## 📊 Output Example

```markdown
# Audio Transcription Report

## 📊 Metadata

| Field | Value |
|-------|-------|
| **File Name** | team-standup.mp3 |
| **File Size** | 3.2 MB |
| **Duration** | 00:12:47 |
| **Language** | English (en) |
| **Processed Date** | 2026-02-02 14:35:21 |
| **Speakers Identified** | 5 |
| **Transcription Engine** | Faster-Whisper (model: base) |

---

## 🎙️ Full Transcription

**[00:00:12 → 00:00:45]** *Speaker 1*  
Good morning everyone. Let's start with updates from the frontend team.

**[00:00:46 → 00:01:23]** *Speaker 2*  
We completed the dashboard redesign and deployed to staging yesterday.

---

## 📋 Meeting Minutes

### Participants
- Speaker 1 (Meeting Lead)
- Speaker 2 (Frontend Developer)
- Speaker 3 (Backend Developer)
- Speaker 4 (Designer)
- Speaker 5 (Product Manager)

### Topics Discussed
1. **Dashboard Redesign** (00:00:46)
   - Completed and deployed to staging
   - Positive feedback from QA team

2. **API Performance Issues** (00:03:12)
   - Database query optimization needed
   - Target response time < 200ms

### Decisions Made
- ✅ Approved dashboard for production deployment
- ✅ Allocated 2 sprint points for API optimization

### Action Items
- [ ] **Deploy dashboard to production** - Assigned to: Speaker 2 - Due: 2026-02-05
- [ ] **Optimize database queries** - Assigned to: Speaker 3
- [ ] **Schedule user testing session** - Assigned to: Speaker 5

---

## 📝 Executive Summary

The team standup covered progress on the dashboard redesign, which has been successfully completed and is ready for production deployment. The frontend team received positive feedback from QA and the design aligns with user requirements.

Backend performance concerns were raised regarding API response times. The team decided to prioritize query optimization in the current sprint, with a target of sub-200ms response times.

Next steps include production deployment of the dashboard by end of week and scheduling user testing sessions to validate the new design with real users.

### Key Points
- 🔹 Dashboard redesign complete and staging-approved
- 🔹 API performance optimization prioritized
- 🔹 User testing scheduled for next week

### Next Steps
1. Production deployment (Speaker 2)
2. Database optimization (Speaker 3)
3. User testing coordination (Speaker 5)
```

## ⚙️ Configuration

No configuration needed! The skill automatically:
- Detects Faster-Whisper or Whisper installation
- Chooses the fastest available engine
- Selects appropriate model based on file size
- Auto-detects language

## 🔧 Troubleshooting

### "No transcription tool found"
**Solution:** Install Whisper:
```bash
pip install faster-whisper
```

### "Unsupported format"
**Solution:** Install ffmpeg:
```bash
brew install ffmpeg  # macOS
apt install ffmpeg   # Linux
```

### Slow processing
**Solution:** Use a smaller Whisper model:
```bash
# Edit the skill to use "tiny" or "base" model instead of "medium"
```

### Poor speaker identification
**Solution:** 
- Ensure clear audio with minimal background noise
- Use a better microphone for recordings
- Try the "medium" or "large" Whisper model

## 🛠️ Advanced Usage

### Custom Model Selection

Edit `SKILL.md` Step 2 to change model:
```python
model = WhisperModel("small", device="cpu")  # Change "base" to "small", "medium", etc.
```

### Output Language Control

Force output in specific language:
```bash
# Edit Step 3 to set language explicitly
```

### Batch Settings

Process specific file types only:
```bash
copilot> transcribe audio: recordings/*.wav  # Only WAV files
```

## 📚 FAQ

**Q: Does this work offline?**  
A: Yes! 100% local processing, no internet required after initial model download.

**Q: What's the difference between Whisper and Faster-Whisper?**  
A: Faster-Whisper is 4-5x faster with same quality. Always prefer it if available.

**Q: Can I transcribe YouTube videos?**  
A: Not directly. Use a YouTube downloader first, then transcribe the audio file. Or use the `youtube-summarizer` skill instead.

**Q: How accurate is speaker identification?**  
A: Accuracy depends on audio quality. Clear recordings with distinct voices work best. Currently uses simple estimation; future versions will use advanced diarization.

**Q: What languages are supported?**  
A: 99 languages including English, Portuguese, Spanish, French, German, Chinese, Japanese, Arabic, and more.

**Q: Can I edit the meeting minutes format?**  
A: Yes! Edit the Markdown template in SKILL.md Step 3.

## 🔗 Related Skills

- **youtube-summarizer** - Extract and summarize YouTube video transcripts
- **prompt-engineer** - Optimize prompts for better AI summaries

## 📄 License

This skill is part of the cli-ai-skills repository.  
MIT License - See repository LICENSE file.

## 🤝 Contributing

Found a bug or have a feature request?  
Open an issue in the [cli-ai-skills repository](https://github.com/yourusername/cli-ai-skills).

---

**Version:** 1.0.0  
**Author:** Eric Andrade  
**Created:** 2026-02-02
