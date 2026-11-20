// Finds jumps in a rendered video: a value that steps between two frames instead of moving smoothly. Decodes the video
// to small greyscale frames, takes the mean difference between each frame and the next, and prints every frame whose
// change is far above its neighbours' median. Smooth motion prints no spikes. See references/review.md, "Measured checks".
//
//   node scripts/frame-jumps.mjs <video.mp4> [--scripted 420,810,...]
//
// --scripted names the frames where the video's script steps on purpose (a hard cut, a row stepping in, a state that
// cuts): a spike on one of those is listed as scripted and doesn't fail the check. Every other spike does.
import {execFileSync} from 'node:child_process';

const args = process.argv.slice(2);
const at = args.indexOf('--scripted');
const scripted = new Set(at >= 0 ? args[at + 1].split(',').map(Number) : []);
const file = args.find((a, i) => !a.startsWith('--') && (at < 0 || i !== at + 1));
if (!file) throw new Error('Name a video: node scripts/frame-jumps.mjs <video.mp4> [--scripted 420,810]');
const W = 270, H = 216;
const raw = execFileSync('ffmpeg', ['-v', 'error', '-i', file, '-vf', `scale=${W}:${H},format=gray`, '-f', 'rawvideo', '-'], {maxBuffer: 1 << 30});
const n = raw.length / (W * H);
// A step that only moves pixels by a level or two is 8-bit rounding (a blur stack fading, a colour easing), invisible
// and not a jump, even when it covers the whole frame. A real jump (text re-rasterising, a layout snapping, a colour
// cutting) moves pixels by many levels. So the measure is the mean of the strong changes only (STRONG levels or more):
// rounding adds nothing to it, while motion on the same frame still sets the neighbours' level.
const STRONG = 3;
const diffs = [0];
for (let f = 1; f < n; f++) {
  let s = 0;
  const a = (f - 1) * W * H, b = f * W * H;
  for (let i = 0; i < W * H; i++) {
    const d = Math.abs(raw[a + i] - raw[b + i]);
    if (d >= STRONG) s += d;
  }
  diffs.push(s / (W * H));
}
const spikes = [], planned = [];
for (let f = 2; f < n - 2; f++) {
  const around = [diffs[f - 2], diffs[f - 1], diffs[f + 1], diffs[f + 2]].sort((x, y) => x - y);
  const median = (around[1] + around[2]) / 2;
  if (diffs[f] > 0.4 && diffs[f] > median * 2.5 + 0.15) (scripted.has(f) ? planned : spikes).push(`frame ${f}: ${diffs[f].toFixed(2)} (around it ${median.toFixed(2)})`);
}
console.log(`${n} frames, ${spikes.length} jump${spikes.length === 1 ? '' : 's'}${spikes.length ? `:\n${spikes.join('\n')}` : ''}`);
if (planned.length) console.log(`${planned.length} scripted:\n${planned.join('\n')}`);
process.exitCode = spikes.length ? 1 : 0;
