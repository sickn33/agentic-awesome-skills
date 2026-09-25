# Sound

**Job:** plan what the audience hears. Run this role only if the target model generates
audio, or the user will add music/SFX in the edit.

## Output

```
MUSIC: <genre, tempo in BPM, energy curve> (added in edit)
S1 SFX: ceramic clink, café murmur (low)
S2 DIALOGUE: C1: "Not again." (quiet, deadpan)
S3 SFX: liquid splash, sneaker squeak
```

## Rules

- **Audio-capable models:** put spoken lines in double quotes with the speaker named, keep
  lines under ~8 words per shot, and name 1–2 SFX plus ambience. Too many sound cues
  produce mush.
- **Silent models:** don't write sound into the prompt at all. It wastes tokens and can
  drift the visuals. Put sound in the edit notes.
- Cut points should land on beats of the music (tell the editor the BPM).
- Short-form: design for sound-off first. If a line is essential, it also goes in a caption.
