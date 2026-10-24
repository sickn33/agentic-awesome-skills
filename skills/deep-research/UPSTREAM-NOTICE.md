# Deep Research upstream recovery

Recovered from [sanjay3290/ai-skills](https://github.com/sanjay3290/ai-skills), repository ID `1121296225`, immutable commit `281d88df199357e3091a3be5c743a0fca9a9ae1b`. Preserve **Copyright 2024 Sanjay** and the Apache-2.0 license in [UPSTREAM-LICENSE.txt](UPSTREAM-LICENSE.txt). No upstream/provider endorsement is implied.

| Local file | Original path | Original Git blob SHA | AAS changes |
| --- | --- | --- | --- |
| scripts/research.py | skills/deep-research/scripts/research.py | d5bdebe3afaae60fc7733a0fcd8dc2b9973c6be2 | Current documented agent/step/SSE schema, ID/input/wait boundaries, private atomic history without raw queries, no silent dotenv, truthful terminal/empty/drop states, generic provider errors; local individual review fixes split-CRLF/multiline SSE parsing, validates stream IDs, rejects unsupported flag combinations and routes polling progress to stderr |
| requirements.txt | skills/deep-research/requirements.txt | a177644d9707c5a149916739e83be0eb1cb45ddc | Remove unused automatic dotenv loading dependency; constrain major HTTP API compatibility and require caller lockfile review |
| UPSTREAM-LICENSE.txt | LICENSE | 32a397eb2a4d05cd614535713bb933f0b8befaca | License wording/copyright unchanged; trailing whitespace and EOF normalized |

The AAS entrypoint was individually corrected for real bundled availability, external account/data/budget authorization, mutable pricing, privacy, and the difference between local interruption and remote cancellation. Official API reference used: [Google Deep Research](https://ai.google.dev/gemini-api/docs/deep-research). Recovery downloads were checked against immutable original Git blob hashes before modification. No paid/provider request or user host configuration was performed. Local tests inspect actual pure functions/CLI parsing with synthetic data; they do not prove live-provider execution or a full transport-memory/spending cap.
