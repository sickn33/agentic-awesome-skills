import asyncio
import os
import sys
from dotenv import load_dotenv

from pipecat.pipeline.pipeline import Pipeline
from pipecat.pipeline.runner import PipelineRunner
from pipecat.pipeline.task import PipelineTask, PipelineParams
from pipecat.services.openai.stt import OpenAISTTService
from pipecat.services.openai.tts import OpenAITTSService
from pipecat.services.google.llm import GoogleLLMService
from pipecat.processors.aggregators.llm_response import LLMUserContextAggregator, LLMAssistantContextAggregator
from pipecat.audio.vad.silero import SileroVADAnalyzer
from pipecat.transports.local.audio import LocalAudioTransport, LocalAudioTransportParams

# ── Config ────────────────────────────────────────────────────────────────────
# run test_audio_output.py to find your device index
# [4]  Speaker (Realtek)              Windows default speakers
# [6]  Headphones (soundcore Space One)  Bluetooth headphones
OUTPUT_DEVICE  = 6

# "whisper-1" (classic) or "gpt-4o-transcribe" (GPT-4o powered, higher accuracy)
WHISPER_MODEL  = "whisper-1"

# OpenAI TTS voice — alloy, ash, coral, echo, fable, nova, onyx, sage, shimmer
# "nova" is calm and professional; "shimmer" is warm; "onyx" is deep
TTS_VOICE      = "nova"

# ── Google compatibility shim ─────────────────────────────────────────────────
# Pipecat's context aggregators use OpenAI-style {role, content} messages,
# but GoogleLLMService expects {role, parts: [{text}]}.
# These wrapper classes handle that translation.
class GoogleSafeMessage(dict):
    def __init__(self, role, content):
        super().__init__(role=role, content=content)
        self.role = role
        self.content = content
    def to_json_dict(self):
        return {"role": self.role, "parts": [{"text": self.content}]}

class GoogleSafeContext:
    def __init__(self, messages=None):
        self.messages = [GoogleSafeMessage(m['role'], m['content']) for m in messages] if messages else []
        self.tools = []
        self.tool_choice = None
    def add_message(self, message):
        if isinstance(message, dict):
            self.messages.append(GoogleSafeMessage(message.get("role", "user"), message.get("content", "")))
        elif hasattr(message, "text"):
            self.messages.append(GoogleSafeMessage("user", message.text))
    def get_messages(self, *args, **kwargs): return self.messages
    def get_messages_for_token_count(self): return self.messages
    def clear(self): self.messages = []

# ─────────────────────────────────────────────────────────────────────────────
load_dotenv()

async def main():
    print("\n" + "="*60)
    print("🛡️  F.R.I.D.A.Y. — FULL OPENAI EDITION")
    print(f"   STT: OpenAI {WHISPER_MODEL}")
    print("   LLM: Gemini 2.5 Flash")
    print(f"   TTS: OpenAI TTS ({TTS_VOICE})")
    print("="*60)

    # ── API key check ─────────────────────────────────────────────────────────
    openai_key  = os.getenv("OPENAI_API_KEY")
    google_key  = os.getenv("GOOGLE_API_KEY")

    if not openai_key:  print("❌ OPENAI_API_KEY missing in .env");  sys.exit(1)
    if not google_key:  print("❌ GOOGLE_API_KEY missing in .env");   sys.exit(1)
    print("✅ All API keys loaded\n")

    # ── 1. Transport ──────────────────────────────────────────────────────────
    transport = LocalAudioTransport(
        params=LocalAudioTransportParams(
            audio_in_enabled=True,
            audio_out_enabled=True,
            audio_in_sample_rate=16000,
            audio_out_sample_rate=24000,   # OpenAI TTS only outputs 24kHz
            output_device_index=OUTPUT_DEVICE,
            vad_enabled=True,
            vad_analyzer=SileroVADAnalyzer(),
            vad_audio_passthrough=True,
        )
    )

    # ── 2. STT — OpenAI Whisper ───────────────────────────────────────────────
    # Whisper receives the full audio segment (after VAD detects silence)
    # and returns a transcript. No streaming — waits for the full utterance.
    stt = OpenAISTTService(
        api_key=openai_key,
        model=WHISPER_MODEL,
    )

    # ── 3. LLM — Gemini 2.5 Flash ────────────────────────────────────────────
    llm = GoogleLLMService(
        api_key=google_key,
        model="gemini-2.5-flash",
    )

    # ── 4. TTS — OpenAI TTS ──────────────────────────────────────────────────
    # OpenAI TTS streams audio at 24kHz PCM. Change TTS_VOICE at the top of the file.
    tts = OpenAITTSService(
        api_key=openai_key,
        voice=TTS_VOICE,
        model="gpt-4o-mini-tts",
        sample_rate=24000,
    )

    # ── 5. Personality ────────────────────────────────────────────────────────
    system_prompt = (
        "You are F.R.I.D.A.Y., a tactical support AI replacing JARVIS. "
        "Address me as 'Boss'. "
        "Be concise, soft-spoken, and focus on situational awareness. "
        "Prioritize clear data over polite formalities. "
        "If asked about status, report 'Systems nominal'."
    )
    context      = GoogleSafeContext([{"role": "system", "content": system_prompt}])
    user_agg     = LLMUserContextAggregator(context)
    assistant_agg = LLMAssistantContextAggregator(context)

    # ── 6. Pipeline ───────────────────────────────────────────────────────────
    # Mic → VAD → Whisper STT → LLM → ElevenLabs TTS → Speaker
    pipeline = Pipeline([
        transport.input(),   # mic audio
        stt,                 # Whisper: audio → transcript
        user_agg,            # add transcript to context
        llm,                 # Gemini: context → response
        tts,                 # ElevenLabs: text → speech
        transport.output(),  # speaker
        assistant_agg,       # store response in context
    ])

    task   = PipelineTask(pipeline, params=PipelineParams(allow_interruptions=True))
    runner = PipelineRunner()

    print("🎤 Ready. Speak after silence — Whisper transcribes on each pause.")
    print("   Press Ctrl+C to stop.\n")
    await runner.run(task)

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\n👋 Systems offline.")
