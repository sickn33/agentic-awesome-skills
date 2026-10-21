# Finished examples: the KV cache explainer in twelve styles

Each folder is the performed KV cache film of one style (45 s for the nine visual styles; the three narrative styles
`v10-reasoning`, `v11-casefile`, `v12-sitcom` tell the same topic in their own arc, from the stories
`kv-cache-reasoning`, `kv-cache-casefile`, `kv-cache-sitcom`, 50–61 s) — the reference every `STARTER.md` idiom comes from.
Only the authored files are committed (`index.html`, `tools/sfx.py`, `fonts.json`, project files); `lib/`, fonts, and
audio are generated. To open one, copy it out of the skill and build it:

```bash
X=<skill>/explainer; S=v3-notebook
cp -R "$X/examples/kv-cache/$S" ./kv-$S
bash "$X/tools/sync.sh" ./kv-$S $S kv-cache      # no narration audio is committed: a silent track is used
python3 "$X/tools/fonts.py" ./kv-$S
(cd ./kv-$S && python3 tools/sfx.py && npx --yes hyperframes@0.8.81 preview)
```

The three narrative styles sync with their own story: `kv-cache-reasoning` (V10), `kv-cache-casefile` (V11),
`kv-cache-sitcom` (V12) in place of `kv-cache` above.

V3, V8 and V11 build their sound from a page log first: `node lib/kit/events.mjs .` (V3, V11) or
`node lib/kit/chalklog.mjs .` (V8) before `tools/sfx.py` (V11's example also has `bash tools/sfx.sh`, which runs both). To hear the voice, build the story with
`tools/story.py` (MiniMax key, or `--audio` with your own recording) and sync again.
