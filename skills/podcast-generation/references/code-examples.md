# Code Examples

## Backend service integration sketch (adapters omitted)

```python
async def generate_audio_narrative(
    self,
    source_type: str,
    source_id: Optional[Union[int, str]] = None,
    custom_query: Optional[str] = None,
    voice_name: str = "alloy",
    style: str = "podcast"
) -> Dict[str, Any]:
    """Generate podcast-style audio using gpt-realtime-mini"""

    # 1. Validate configuration
    if not settings.azure_openai_audio_api_key:
        raise ValueError("AZURE_OPENAI_AUDIO_API_KEY not configured")

    # 2. Gather content based on source
    if source_type == "tag":
        tag = await db.get_tag(source_id)
        bookmarks = tag.bookmarks
        title = f"Exploring {tag.name}"
    elif source_type == "bookmark":
        bookmark = await db.get_bookmark(source_id)
        bookmarks = [bookmark]
        title = f"Deep Dive: {bookmark.title}"
    elif source_type == "custom" and custom_query:
        bookmarks = await db.get_recent_bookmarks(limit=10)
        title = f"Research Summary: {custom_query[:50]}"

    else:
        raise ValueError("Invalid source type/custom query")
    if style not in STYLE_INSTRUCTIONS:
        raise ValueError("Unsupported style")

    # 3. Build prompt with style
    content = "\n".join([f"**{b.title}**\n{b.summary}" for b in bookmarks[:10]])
    prompt = f"""Create a {style} narrative from these sources:
{content}

{STYLE_INSTRUCTIONS[style]}
Make it 1-2 minutes (150-250 words). Speak naturally."""

    # 4. Connect to Realtime API
    ws_url = settings.azure_openai_audio_endpoint.rstrip("/").replace("https://", "wss://", 1) + "/openai/v1"
    client = AsyncOpenAI(websocket_base_url=ws_url, api_key=settings.azure_openai_audio_api_key)

    audio_chunks, transcript_parts = [], []

    async with client.realtime.connect(model=settings.azure_openai_audio_deployment) as conn:
        await conn.session.update(session={
            "type": "realtime",
        "audio": {"output": {"voice": voice_name, "format": {"type": "audio/pcm", "rate": 24000}}},
        "output_modalities": ["audio"],
            "instructions": f"Narrator creating {style}-style content. Speak naturally, don't ask questions."
        })

        await conn.conversation.item.create(item={
            "type": "message",
            "role": "user",
            "content": [{"type": "input_text", "text": prompt}]
        })

        await conn.response.create()

        async for event in conn:
            if event.type == "response.output_audio.delta":
                audio_chunks.append(base64.b64decode(event.delta))
            elif event.type == "response.output_audio_transcript.delta":
                transcript_parts.append(event.delta)
            elif event.type == "response.done":
                if event.response.status != "completed":
                    raise RuntimeError("Incomplete audio response")
                break
            elif event.type == "error":
                raise RuntimeError("Realtime service error; inspect redacted private diagnostics")

    # 5. Process audio
    pcm_audio = b''.join(audio_chunks)
    wav_audio = pcm_to_wav(pcm_audio, sample_rate=24000)
    audio_base64 = base64.b64encode(wav_audio).decode('utf-8')
    duration = len(pcm_audio) // (24000 * 2)  # 24kHz, 16-bit

    # 6. Save and return
    narrative = AudioNarrative(
        source_type=source_type,
        title=title,
        script=''.join(transcript_parts),
        audio_data=audio_base64,
        duration_seconds=duration,
        voice_name=voice_name
    )
    db.add(narrative)
    await db.commit()

    return {
        "id": narrative.id,
        "title": title,
        "script": narrative.script,
        "audio_data": audio_base64,
        "audio_url": f"/api/v1/ai/audio/{narrative.id}/stream",
        "duration_seconds": duration,
        "voice_name": voice_name
    }
```

## FastAPI Endpoints

```python
@router.post("/audio", response_model=AudioNarrativeResponse)
async def generate_audio(request: AudioNarrativeRequest, db: AsyncSession = Depends(get_db)):
    ai_service = AIService(db)
    result = await ai_service.generate_audio_narrative(
        source_type=request.source_type,
        source_id=request.source_id,
        custom_query=request.custom_query,
        voice_name=request.voice_name,
        style=request.style
    )
    return AudioNarrativeResponse(**result)

@router.get("/audio/{narrative_id}/stream")
async def stream_audio(narrative_id: int, db: AsyncSession = Depends(get_db)):
    ai_service = AIService(db)
    narrative = await ai_service.get_audio_narrative_by_id(narrative_id)
    if not narrative:
        raise HTTPException(404, "Not found")

    audio_bytes = base64.b64decode(narrative["audio_data"])
    return Response(
        content=audio_bytes,
        media_type="audio/wav",
        headers={"Content-Disposition": f'filename="narrative-{narrative_id}.wav"'}
    )
```

## React Component Pattern

```jsx
function AudioPlayer({ sourceType, sourceId }) {
  const [narrative, setNarrative] = useState(null);
  const [loading, setLoading] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef(null);

  const generate = async () => {
    setLoading(true);
    const response = await aiAPI.generateAudio(sourceType, sourceId, null, 'alloy', 'podcast');
    setNarrative(response.data);
    setLoading(false);
  };

  const play = () => {
    if (!narrative?.audio_data) return;

    const blob = base64ToBlob(narrative.audio_data, 'audio/wav');
    const url = URL.createObjectURL(blob);

    if (!audioRef.current) audioRef.current = new Audio();
    audioRef.current.src = url;
    audioRef.current.onended = () => setIsPlaying(false);
    audioRef.current.play();
    setIsPlaying(true);
  };

  return (
    <div>
      {!narrative && <button onClick={generate} disabled={loading}>Generate Podcast</button>}
      {narrative && (
        <>
          <button onClick={play}>{isPlaying ? 'Pause' : 'Play'}</button>
          <p>{narrative.script}</p>
        </>
      )}
    </div>
  );
}
```

## Frontend API Service

```javascript
export const aiAPI = {
  generateAudio: (sourceType, sourceId = null, customQuery = null,
                  voiceName = 'alloy', style = 'podcast') =>
    api.post('/ai/audio', {
      source_type: sourceType,
      source_id: sourceId,
      custom_query: customQuery,
      voice_name: voiceName,
      style
    }),

  listAudioNarratives: (limit = 10) => api.get(`/ai/audio?limit=${limit}`),
};
```

## Generation boundaries

Unexecuted SDK/service sketches: deployment name, available voices, GA versus preview
session/auth format and SDK versions must match the actual Azure resource. The voice
table is not a current Realtime support list. Configure explicit PCM output before
interpreting bytes as 24kHz signed 16-bit mono; reject incomplete/empty output.
The examples omit a mandatory total generation timeout (e.g. 60 seconds), per-event
and accumulated audio/text limits (e.g. 32 MiB), cancel/close paths and spend quotas;
implement them before serving requests. A response.done event alone does not mean
success. Do not store partial output as a complete narrative.

Authorize source objects AND audio generation/list/stream ownership per tenant; IDs
are not access control. The DB methods/models/routes, settings and frontend API are
application adapters, not bundled implementations. Treat source text as data, preserve
source attribution, verify narration accuracy and obtain rights/consent before sending
private text to Azure or publishing synthetic speech. Never impersonate a real person
without permission; disclose generated speech where required. Store keys backend-only
and audio/transcripts privately with retention limits. Model-generated text is not
HTML. Frontend play/pause requires actual pause handling, promise errors, finally
loading reset, URL revocation and teardown; the React sketch omits those controls.
