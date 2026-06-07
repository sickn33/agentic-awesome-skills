---
name: video-content-extractor
description: "Extract key frames from MP4 videos at configurable intervals, run Tesseract OCR, and generate structured Markdown reports with video metadata and timestamped text transcripts."
category: media-processing
risk: safe
source: community
source_repo: 274326424/video-content-extractor
source_type: community
date_added: "2026-06-06"
author: 274326424
tags: [video, ocr, ffmpeg, tesseract, frame-extraction, media]
tools: [codex]
---

# Video Content Extractor

## Overview

Automatically extracts key frames from MP4 video files at configurable time intervals, performs OCR text recognition on each frame, and generates a structured Markdown report. The report includes video metadata (duration, resolution, codecs) and frame-by-frame OCR transcripts with timestamp references.

This skill is designed for Codex CLI and requires FFmpeg and Tesseract OCR installed on the local machine.

## When to Use This Skill

- Use when you need to extract text content from video presentations, lectures, or screencasts.
- Use when you want to create searchable transcripts from video files without embedded subtitles.
- Use when you need to analyze video content programmatically and generate structured summaries.
- Use when the user asks to "read what is on screen" or "extract the content from this video."

## How It Works

### Step 1: Analyze Video Metadata

The skill uses ffprobe to extract video metadata: duration, resolution, frame rate, codec information, and file size.

### Step 2: Extract Key Frames

Using FFmpeg, the skill captures frames at the configured interval (default: every 30 seconds). Each frame is saved as a timestamped JPEG image.

### Step 3: OCR Text Recognition

Each extracted frame is processed by Tesseract OCR. If the default PSM mode returns no meaningful text, it falls back to fully automatic page segmentation.

### Step 4: Generate Markdown Report

All extracted data is assembled into a structured Markdown document.

## Examples

### Example 1: Basic Extraction

Agent prompt:
Use the video-content-extractor skill to extract content from lecture.mp4

Output generates lecture.md and lecture_frames/ directory.

### Example 2: Custom Interval

Parameters: video_path, output_dir, interval(seconds), lang
Extract every 60 seconds with English-only OCR:
python scripts/extract_video.py recording.mp4 ./output 60 eng

### Example 3: Bilingual Content

Extract with default Chinese + English OCR:
python scripts/extract_video.py lecture.mp4 . 15 chi_sim+eng

## Best Practices

- Use shorter intervals (10-15s) for fast-paced content with frequent text changes.
- Use longer intervals (30-60s) for presentation slides or slow lectures to reduce duplicate frames.
- For Chinese content, ensure Tesseract Chinese language pack is installed (chi_sim).

## Limitations

- Requires FFmpeg and Tesseract OCR to be installed and accessible via PATH.
- Tesseract OCR accuracy depends on video quality, text size, and font clarity.
- Does not extract audio or perform speech-to-text transcription.
- Frame extraction is time-based (not scene-change-based), which may produce near-duplicate frames.
- Large videos with short intervals can generate many frames - ensure sufficient disk space.

## Security and Safety Notes

- This skill only reads video files and writes extracted frames and Markdown reports.
- It does NOT send any data over the network - all processing is local.
- FFmpeg and Tesseract are invoked with fixed, pre-vetted arguments.
- The skill does not modify or delete the original video file.

## Common Pitfalls

- Problem: Tesseract returns garbled text
  Solution: Ensure the correct language pack is installed. Run tesseract --list-langs to verify.

- Problem: FFmpeg fails with "not found"
  Solution: Make sure FFmpeg is on PATH. Run ffmpeg -version to verify.

- Problem: OCR is slow on large videos
  Solution: Increase the interval parameter to reduce frames processed.

## Related Skills

- @media-summarizer - For summarizing video content using visual and audio cues.
- @document-ocr - For OCR on static images or scanned documents without video processing.
