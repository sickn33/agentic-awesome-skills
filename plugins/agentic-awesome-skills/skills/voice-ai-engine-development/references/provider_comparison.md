# Provider selection and measurement

The former fixed prices, accuracy percentages, latency rankings and per-minute bundle estimates had no benchmark or billing basis. They must not be used as current quotes or quality guarantees. This bundle provides interface sketches; factory methods still raise NotImplementedError until adapters are implemented.

| Stage | Candidate services | Verify for the selected account and model |
| --- | --- | --- |
| Transcription | Deepgram, AssemblyAI, Azure Speech, Google Cloud Speech | Streaming API, language and accent coverage, endpointing, audio formats, region and retention |
| Response generation | OpenAI, Google Gemini, Anthropic Claude | Current available model, SDK and system-instruction fields, streaming, context limits, cancellation, tool authorization |
| Synthesis | ElevenLabs, Azure Speech, Google Cloud TTS, Amazon Polly, Play.ht | Current service availability, output codec/rate, alignment timestamps, voice rights, concurrency and region |

Changing a provider name alone is insufficient: implement the adapter, configure its secret through an approved secret store, normalize event and audio schemas, test cancellation/error paths, and verify compatibility across stages. A factory interface does not imply every vendor supports the same features.

Use the provider’s current official API and pricing documentation at execution time. [Google’s Gen AI SDK](https://googleapis.github.io/python-genai/) separates system instructions from user contents; do not emulate authority by inventing user/model turns. Do not assume historical names such as gemini-pro or older model-specific context/pricing figures are available.

Benchmark on the same representative, authorized synthetic or consented dataset: language, accent, noise, duration and hardware. Measure speech-end to first audio, steady-state latency, recognition error, tool/task success, interruption stop time and client-buffer flush behavior. Report sample size and distributions rather than a universal fastest/best claim.

Calculate cost from actual billed audio duration, input/output tokens, synthesized characters or audio, model/voice tier, retries, concurrency, storage and network. Report assumptions and timestamped source quotes; free tiers are account/region dependent and not a production-cost guarantee. Test budget caps and failure recovery before real traffic. Security, regulatory suitability and data residency require service-specific evidence, not vendor adjectives.
