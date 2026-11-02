> AAS modification (2026-11-01): the Operational boundaries in SKILL.md govern this recipe. Do not conceal costs, auto-subscribe/top-up, bypass a refusal, or upload/generate likeness media without the existing task authorization and consent. Upstream billing guidance below is informational, not authorization.

# HeyGen from the HyperFrames CLI

`media-use generate` and `transcribe --engine heygen` call HeyGen directly with the HyperFrames sign-in; they need no `heygen` CLI. Every paid call carries a key derived from what it asks, so running the same command again picks up the same job instead of paying twice (a failed or refused one is sent as a new job), and each job is logged in the project's `.hyperframes/heygen-jobs.jsonl`.

## Signing in

`npx hyperframes auth status` says what is signed in. The credential is read in this order: `HEYGEN_API_KEY`, `HYPERFRAMES_API_KEY`, a host app's `HEYGEN_ACCESS_TOKEN`, then `~/.hyperframes/credentials`, which `npx hyperframes auth login` writes. `heygen auth login` is a separate sign-in that only the `heygen` CLI reads.

| Credential                 | Pays with                                    | Covers                                                                                 |
| -------------------------- | -------------------------------------------- | -------------------------------------------------------------------------------------- |
| API key                    | API credits                                  | everything below                                                                       |
| Sign-in (OAuth)            | the plan's allowance on subscription credits | avatar videos, video shots, images and voices; music and transcription take an API key |
| Inside the HyperFrames app | the app                                      | whatever the app allows; nothing to set up                                             |

A refusal names its fix: `api_key_required` needs an API key, `402` or `insufficient_credit` needs a top-up, `hf_usage_exhausted` means the plan's allowance is used up.

## Making media: `media-use generate`

Use the existing authorized payer and budget. Inspect `--plan` for a current estimate, explain costs honestly and use `--max-credits` to enforce the remaining limit. Retry only transient errors with a known billing outcome and valid task authorization; policy refusals must not be bypassed or reworded around. Stop on uncertain charges instead of risking duplicate jobs.

```bash
# a still, edited from a reference picture: a clean plate with the words removed
npx hyperframes media-use generate --type image --reference assets/frame.png --prompt "the same shot with no text or logos" --out assets/plate.png --plan
# a shot of 5–15 s, starting from a first frame; longer shots are shots chained from each one's last frame
npx hyperframes media-use generate --type video --first-frame assets/s03-first.png --prompt "slow push in" --seconds 8 --out assets/s03.mp4
# a person re-shot from a still over one shot of the original (never across a cut), saying that shot's voice with lips
# in sync and moving as the guide (the original shot itself) does; --mask x,y,w,h[,a-b] (repeatable, the guide's
# pixels and seconds) blanks text in the guide, which HeyGen would copy
npx hyperframes media-use generate --type video --reference assets/person.png --audio assets/s02-voice.m4a --motion assets/s02-original.mp4 --mask 110,615,390,165,0.4-2.0 --prompt "talks to camera, seated" --seconds 8 --aspect 9:16 --out assets/s02-person.mp4
# the same for a person who does not speak: no --audio, the guide clip carries the motion
npx hyperframes media-use generate --type video --reference assets/person.png --motion assets/s05-original.mp4 --prompt "holds up a jar, smiles" --seconds 6 --aspect 9:16 --out assets/s05-person.mp4
# a person in a photo speaking a script in a HeyGen voice
npx hyperframes media-use generate --type avatar --photo assets/person.png --script "…" --voice <voice-id> --out assets/person.mp4
# a voice reading text
npx hyperframes media-use generate --type voice --script "…" --voice <voice-id> --out assets/vo.mp3
# music, 30, 60, 120 or 180 s (instrumental unless --vocals), trimmed to length in the composition
npx hyperframes media-use generate --type music --prompt "warm lo-fi, soft keys" --seconds 30 --bpm 90 --out assets/music.mp3
```

The file lands at `--out` and the media ledger records it as generated, with the route, model, job, prompt and the files it was made from. Pictures and shots carry no text or logos: ask for clean plates and draw words in HyperFrames.

Provider models, rates and plan allowances change. Obtain the current supported model and quote from the installed CLI's `--plan` and provider documentation before spending; no fixed price table is endorsed by this import.

`--plan`'s `usd` is what an API key is charged (HeyGen rounds up to units of $1/60); its `credits` is what a HyperFrames plan charges, on the plan's own rates: a video shot's seconds and guide seconds, plus each picture past the first two. Voice ids come from `heygen voice list` or `npx hyperframes media-use resolve --type voice`; a cloned voice from `heygen voice clone create` (`operations.md`).

## Transcription: `transcribe --engine heygen`

```bash
npx hyperframes transcribe interview.mp4 --engine heygen --speakers
```

Word times from HeyGen's speech model, each word with its speaker under `--speakers`, in the same `transcript.json` local engines write. It takes an API key. The local engines (`--engine auto`) are free and good for one clear voice; HeyGen is the better choice for several speakers, noise or music under the voice.
