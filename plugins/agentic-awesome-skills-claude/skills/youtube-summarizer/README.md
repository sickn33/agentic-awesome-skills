# 🎥 youtube-summarizer

> Extract transcripts from YouTube videos and generate comprehensive, detailed summaries

**Version:** 1.2.0
**Status:** ✨ Zero-Config | 🌍 Universal
**Platforms:** GitHub Copilot CLI, Claude Code

---

## Overview

The **youtube-summarizer** skill automates the extraction of YouTube video transcripts and generates verbose, structured summaries using the STAR + R-I-S-E framework. Perfect for documenting educational content, lectures, tutorials, or any informational videos without rewatching them.

---

## Features

- 🎯 **Automatic transcript extraction** using `youtube-transcript-api`
- ✅ **Video validation** - Checks if video is accessible and has transcripts
- 🌍 **Multi-language support** - Prefers Portuguese, falls back to English
- 📊 **Comprehensive summaries** - Prioritizes detail and completeness
- 📝 **Structured output** - Markdown with headers, sections, insights
- 🔍 **Metadata included** - Video title, channel, duration, URL
- ⚡ **Error handling** - Clear messages for all failure scenarios
- 🛠️ **Dependency management** - Offers to install requirements automatically
- 📊 **Progress gauge** - Visual processing tracker across all steps
- 💾 **Flexible save options** - Summary-only, summary+transcript, or transcript-only (NEW v1.2.0)

---

## Quick Start

### Triggers

Activate this skill with any of these phrases:

```bash
# English
copilot> summarize this video: https://www.youtube.com/watch?v=VIDEO_ID
copilot> summarize youtube video https://youtu.be/VIDEO_ID
copilot> extract youtube transcript https://youtube.com/watch?v=VIDEO_ID

# Portuguese (also supported)
copilot> resume este video: https://www.youtube.com/watch?v=VIDEO_ID
```

### First-Time Setup

The skill will automatically check for dependencies and offer to install them:

```bash
⚠️  youtube-transcript-api not installed

Would you like me to install it now?
- [x] Yes - Install with pip
- [ ] No - I'll install manually
```

Select "Yes" and the skill handles installation automatically.

---

## Use Cases

### 1. **Educational Video Documentation**

```bash
copilot> summarize this video: https://www.youtube.com/watch?v=abc123
```

**Output:**
- Comprehensive summary of lecture content
- Key concepts and terminology
- Examples and practical applications
- Resources mentioned in the video

### 2. **Technical Tutorial Analysis**

```bash
copilot> summarize youtube video https://youtu.be/xyz789
```

**Output:**
- Step-by-step breakdown of tutorial
- Code snippets and commands mentioned
- Best practices highlighted
- Troubleshooting tips documented

### 3. **Conference Talk Reference**

```bash
copilot> extract youtube transcript https://youtube.com/watch?v=def456
```

**Output:**
- Speaker insights and arguments
- Statistics and data points
- Case studies and examples
- Q&A session summary

### 4. **Language Learning Content**

```bash
copilot> summarize youtube video https://youtu.be/ghi789
```

**Output:**
- Vocabulary and expressions used
- Grammar points explained
- Cultural references
- Practice exercises mentioned

### 5. **Research and Investigation**

```bash
copilot> summarize youtube video https://www.youtube.com/watch?v=jkl012
```

**Output:**
- Research findings presented
- Methodology explained
- Results and conclusions
- Future work suggestions

---

## Output Structure

Every summary follows this comprehensive structure:

```markdown
# [Video Title]

**Canal:** [Channel Name]
**Duração:** [Duration]
**URL:** [Video URL]
**Data de Publicação:** [Date]

---

## 📊 Síntese Executiva
[High-level overview, 2-3 paragraphs]

---

## 📝 Resumo Detalhado
### [Topic 1]
[Detailed analysis with examples, data, quotes]

### [Topic 2]
[Continued breakdown...]

---

## 💡 Principais Insights
- **Insight 1:** [Explanation]
- **Insight 2:** [Explanation]

---

## 📚 Conceitos e Terminologia
- **Term 1:** [Definition]
- **Term 2:** [Definition]

---

## 🔗 Recursos Mencionados
- [Resource 1]
- [Resource 2]

---

## 📌 Conclusão
[Final synthesis and key takeaways]
```

---

## Requirements

- **Python 3.x** (usually pre-installed on macOS/Linux)
- **pip** (Python package manager)
- **[youtube-transcript-api](https://github.com/jdepoix/youtube-transcript-api)** by [Julien Depoix](https://github.com/jdepoix) (installed automatically by the skill)

### Manual Installation (Optional)

If you prefer to install dependencies manually:

```bash
pip install youtube-transcript-api
```

---

## Supported URL Formats

The skill recognizes these YouTube URL formats:

- `https://www.youtube.com/watch?v=VIDEO_ID`
- `https://youtube.com/watch?v=VIDEO_ID`
- `https://youtu.be/VIDEO_ID`
- `https://m.youtube.com/watch?v=VIDEO_ID`

---

## Limitations

### Videos That Work

✅ Public videos with auto-generated captions  
✅ Videos with manual subtitles/captions  
✅ Videos with transcripts in any supported language

### Videos That Don't Work

❌ Private or unlisted videos  
❌ Videos with transcripts disabled  
❌ Age-restricted videos (may require authentication)  
❌ Videos without any captions/subtitles

---

## Error Messages

### No Transcript Available

```
❌ No transcript available for this video

This skill requires videos with auto-generated captions or manual subtitles.
Unfortunately, transcripts are not enabled for this video.
```

**Solution:** Try a different video that has captions enabled.

### Invalid URL

```
❌ Invalid YouTube URL format

Expected format examples:
- https://www.youtube.com/watch?v=VIDEO_ID
- https://youtu.be/VIDEO_ID
```

**Solution:** Ensure you're providing a complete, valid YouTube URL.

### Video Not Accessible

```
❌ Unable to access video

Possible reasons:
1. Video is private or unlisted
2. Video has been removed
3. Invalid video ID
```

**Solution:** Verify the URL and ensure the video is public.

---

## FAQ

### Q: How long does it take to generate a summary?

**A:** Depends on video length:
- Short videos (5-10 min): 30-60 seconds
- Medium videos (20-40 min): 1-2 minutes
- Long videos (60+ min): 2-5 minutes

### Q: Can I summarize videos in languages other than English/Portuguese?

**A:** Yes! The skill attempts to extract transcripts in the video's original language. If unavailable, it falls back to English.

### Q: Will this work with YouTube Music videos?

**A:** Only if the music video has captions/transcripts enabled. Most music videos don't have transcripts.

### Q: Can I customize the summary length?

**A:** The skill prioritizes completeness by design (verbose summaries). If you need shorter summaries, you can ask the AI to condense the output afterward.

### Q: Does this download the video?

**A:** No. Only the text transcript is extracted via YouTube's API. No video files are downloaded.

### Q: Can I save the summary to a file?

**A:** Yes! After the summary is generated, the skill offers flexible save options:
- **Summary only** - Markdown file with structured summary
- **Summary + transcript** - Markdown file with summary and raw transcript appended
- **Transcript only** - Plain text file with raw transcript (NEW in v1.2.0)
- **Display only** - No files saved, summary shown in terminal

Files are saved as `resumo-{VIDEO_ID}-{YYYY-MM-DD}.md` (summary) or `transcript-{VIDEO_ID}-{YYYY-MM-DD}.txt` (transcript-only).

### Q: When should I save just the transcript?

**A:** Use the transcript-only option when you:
- Need raw content for further analysis
- Want to process the text with other tools
- Prefer to create your own summary later
- Need the transcript for documentation or archival purposes

---

## Installation

### Global Installation (Recommended)

Install the skill globally to use it across all projects:

```bash
# Clone the repository
git clone https://github.com/ericgandrade/cli-ai-skills.git
cd cli-ai-skills

# Run the install script
./scripts/install-skills.sh $(pwd)
```

This creates symlinks in:
- `~/.copilot/skills/youtube-summarizer/` (GitHub Copilot CLI)
- `~/.claude/skills/youtube-summarizer/` (Claude Code)

### Repository Installation

Add to a specific project:

```bash
# Copy skill to your project
cp -r cli-ai-skills/.github/skills/youtube-summarizer .github/skills/
```

---

## Contributing

Found a bug or have a feature request? Contributions welcome!

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/youtube-enhancement`
3. Commit changes: `git commit -m "feat(youtube-summarizer): add feature X"`
4. Push and create a Pull Request

---

## License

MIT License - see LICENSE for details.

---

## Acknowledgments

- **[youtube-transcript-api](https://github.com/jdepoix/youtube-transcript-api)** by [Julien Depoix](https://github.com/jdepoix) - Python library for extracting YouTube video transcripts
- **Anthropic STAR/R-I-S-E frameworks** - For structured summarization

---

**Built with ❤️ by Eric Andrade**

*Version 1.1.0 | Last updated: February 2026*
