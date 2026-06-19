---
name: pipecat-friday-agent
description: "Build a low-latency, Iron Man-inspired tactical voice assistant (F.R.I.D.A.Y.) using Pipecat, Gemini, and OpenAI."
category: voice-agents
risk: safe
source: community
date_added: "2026-03-10"
tags: [pipecat, voice, gemini, openai, python]
tools: [pipecat]
---

# Pipecat Friday Agent

## Overview

This skill provides a blueprint for building **F.R.I.D.A.Y.** (Replacement Integrated Digital Assistant Youth), a local voice assistant inspired by the tactical AI from the Iron Man films. It uses the **Pipecat** framework to orchestrate a low-latency pipeline:
- **STT**: OpenAI Whisper (`whisper-1`) or `gpt-4o-transcribe`
- **LLM**: Google Gemini 2.5 Flash (via a compatibility shim)
- **TTS**: OpenAI TTS (`nova` voice)
- **Transport**: Local Audio (Hardware Mic/Speakers)

## When to Use This Skill

- Use when you want to build a real-time, conversational voice agent.
- Use when working with the Pipecat framework for pipeline-based AI.
- Use when you need to integrate multiple providers (Google and OpenAI) into a single voice loop.
- Use when building Iron Man-themed or tactical-themed voice applications.

## How It Works

### Step 1: Install Dependencies

You will need the Pipecat framework and its service providers installed:
```bash
pip install pipecat-ai[openai,google,silero] python-dotenv
```

### Step 2: Configure Environment

Create a `.env` file with your API keys:
```env
OPENAI_API_KEY=your_openai_key
GOOGLE_API_KEY=your_google_key
```

### Step 3: Run the Agent

Execute the provided Python script to start the interface:
```bash
python scripts/friday_agent.py
```

## Core Concepts

### Pipeline Architecture
The agent follows a linear pipeline: `Mic -> VAD -> STT -> LLM -> TTS -> Speaker`. This allows for granular control over each stage, unlike end-to-end speech-to-speech models.

### Google Compatibility Shim
Since Google's Gemini API has a different message format than OpenAI's standard (which Pipecat aggregators expect), the script includes a `GoogleSafeContext` and `GoogleSafeMessage` class to bridge the gap.

## Best Practices

- ✅ **Use Silero VAD**: It is robust for local hardware and prevents background noise from triggering the LLM.
- ✅ **Concise Prompts**: Tactical agents should give short, data-dense responses to minimize latency.
- ✅ **Sample Rate Match**: OpenAI TTS outputs at 24kHz; ensure your `audio_out_sample_rate` matches to avoid high-pitched or slowed audio.
- ❌ **No Polite Fillers**: Avoid "Hello, how can I help you today?" Instead, use "Systems nominal. Ready for commands."

## Troubleshooting

- **Problem:** Audio is choppy or delayed.
  - **Solution:** Check your `OUTPUT_DEVICE` index. Run a script like `test_audio_output.py` to find the correct hardware index for your OS.
- **Problem:** "Validation error" for message format.
  - **Solution:** Ensure the `GoogleSafeContext` shim is correctly translating OpenAI-style dicts to Gemini-style schema.

## Related Skills

- `@voice-agents` - General principles of voice AI.
- `@agent-tool-builder` - Add tools (Search, Lights, etc.) to your Friday agent.
- `@llm-architect` - Optimizing the LLM layer.

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.
