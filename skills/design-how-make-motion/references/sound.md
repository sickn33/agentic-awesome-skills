# Sound

Music made in code fits the cut to the frame and raises no licensing question. Nobody in the loop can listen, so
every check here is a measurement. Say that to the person.

## The grid

The beat is tied to the frame rate so every beat lands on a whole frame: `BPM = fps * 60 / beatFrames`. At 60 fps,
120 BPM is 30 frames a beat, 100 BPM is 36, 80 BPM is 45. The music reads its anchors from the same `timing.ts` as the
picture; a re-timing moves both.

## The track

Built in a headless browser with the Web Audio API (`OfflineAudioContext`), rendered to WAV.

Both presets take any minor or major key. Everything is written in D and transposed, and the bar before the end card
is always V, so the card lands as a cadence, V to I. The top line is written per chord from that chord's own tones, so
whichever chord the drop puts under it, it never rubs.

`punchy`, swung half-time hip-hop, 120 BPM by default:
- A chord every 4 beats: in minor i9, iv9, VImaj9, V7b9 (Dm9 Gm9 Bbmaj9 A7b9); in major Imaj9, vi9, IVmaj9, V13
  (Dmaj9 Bm9 Gmaj9 A13).
- The story bars (the hook) are keys, vinyl crackle and soft hats only. The beat drops on the story's turn.
- A felt bar of 16 steps, odd steps 3 frames late (the swing). Kick on a pattern such as steps 0, 7, 10; clap and rim
  on 4 and 12; ghost rims on 9 and 15; hats on every step with uneven levels and an open hat on the last off-beat.
- A walking bass on chord tones with a pluck envelope, ducked under every kick.
- A bell line on chord tones with a slapback echo that follows the swing. The echo of a bar's last note lands on the
  next chord, so that note is a tone of the next chord too.
- The gate closes about 2 beats before the end card; the room rings into the break; the tonic chord, bass and a bell
  land on the card.

`calm`, lo-fi at 80 BPM (45 frames a beat at 60 fps):
- A straight 4/4 bar of 16 sixteenths, odd ones a fifteenth of a beat late (50 ms at 80 BPM), and a chord a bar: in
  minor i9, iv9, VII13, IIImaj9, with V7(b9 b13) forced before the card (Dm9 Gm9 C13 Fmaj9, A7); in major Imaj9, vi9,
  ii9, IVmaj9, with V13 (Dmaj9 Bm9 Em9 Gmaj9, A13).
- An FM electric piano, struck rolled and laid back on the one and pushed softer on the "and" of two, through a tape
  wobble of about 5 cents.
- An upright-style bass on the root, the fifth on three and a pickup a semitone under the next root on the "and" of
  four, ducked under every kick like punchy's.
- A soft, long kick on the one, the "a" of two and the "and" of three; a snare on 2 and 4, 3 percent of a beat late; swung
  shakers with uneven levels; ghost rims; a two-note snare drag into a fill; vinyl crackle a little louder than punchy's.
- A sparse tine line every other bar and on the V bar, ending on the leading tone or the b9 into the card.
- The gate closes one beat before the card, about the same 0.8 s of break as punchy's.

The template builds all of this from `MUSIC` in `audio/cues.mjs` (`template/audio/README.md` has the contract):
the grid derives from fps, BPM, the drop and the end, and the key transposes everything.

## Effects

Dry ticks and bells on picture events (a press, a land, a flip, a stamp), tuned to the track's key. No noise sweeps or
whooshes. A whoosh under a whip at about -7 dB is the one exception, and only in `calm`.

## Mastering

- -14 LUFS integrated.
- True peak under -1 dBTP; the file's ceiling at -2.8 dBTP, because AAC in the MP4 overshoots by up to 1.3 dB.
- One gain curve, applied to the music and to every effect, so the parts sum to the master.
- Record the glue and limiter gain reduction; over 4 dB on the kicks is pumping.

## Checks

`npm run audio:check src/<name>` runs the checks marked below and exits 1 on a failure. Each one was a real bug in a
shipped track. Energy bands are absolute dBFS on the preview mix.

| Check | Pass | How |
|-|-|-|
| Loudness | -14.0 LUFS ± 0.5 | audio:check, and again with `--mp4` on the master |
| True peak | at or under -2.8 dBTP in every file | audio:check |
| Limiter gain reduction | under 4 dB | audio:check |
| Kick onsets | within 4 ms of the grid, measured on the kick stem | audio:check |
| No kick before the drop | the kick stem silent before `drop` | audio:check |
| Sub under 30 Hz | under -40 dBFS (an FM sideband at 0 Hz showed up here) | audio:check |
| Highs over 5 kHz | above -45 dBFS, or the beat vanishes on a phone speaker | audio:check |
| Effects | every pitch in the track's scale (natural minor or major) | audio:check |
| Chords | no semitone or minor 9th between the bell or tine and any chord tone sounding with it; no two chord tones under 200 Hz closer than a whole tone | audio:check, statically from the synth's own note list (`notes()`) |
| Bass and kick | the bass at least 6 dB lower in the 30 ms after each kick than 120 ms later, or a held bass cancels the kick | audio:check, measured on the bass stem |
| Review cuts | silent, and the hand-off says so | by hand |
