// The energy check (references/review.md): how much is going on in a cut, so "more action" is a number.
//
//   node scripts/energy.mjs <video.mp4> [--cuts 360,720] [--hold-end 60] [--fps 60]
//
// Measured on frames scaled to 270x216 grey, against the bar of a launch video people shared (make-font part two:
// 54% of frames with visible motion, 1.6% of pixels moving in the median frame, its end card left out). A spec cut
// reviewers called flat measured 27% and 0.68%.
//
// - Visible motion: the share of frames whose mean difference from the frame before is over 0.3 levels. Under 40%
//   fails: too much of the video is standing still.
// - Moving pixels: in the median frame, the share of pixels that change by 4 levels or more. Under 1% fails: things
//   move, but they're small.
// - Dead time: any stretch over 1 s with nothing moving (mean difference under 0.08) fails, except the last
//   --hold-end frames, where the end card may rest; those frames don't count in the two shares either.
// Each scene (split at --cuts) is reported too, so a weak scene shows even when the whole passes. Exit 1 on a fail.
import {execFileSync} from 'node:child_process';

const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
const file = args.find((a, i) => !a.startsWith('--') && !['--cuts', '--hold-end', '--fps'].includes(args[i - 1]));
if (!file) throw new Error('Name a video: node scripts/energy.mjs <video.mp4> [--cuts 360,720]');
const cuts = (opt('--cuts', '') || '').split(',').filter(Boolean).map(Number);
const fps = Number(opt('--fps', 60));
const holdEnd = Number(opt('--hold-end', fps));
const VISIBLE = 0.3, MOVING = 4, BAR = {visible: 0.4, moving: 0.01};
const W = 270, H = 216, N = W * H;
const raw = execFileSync('ffmpeg', ['-v', 'error', '-i', file, '-vf', `scale=${W}:${H},format=gray`, '-f', 'rawvideo', '-'], {maxBuffer: 1 << 30});
const n = raw.length / N;

const diff = [0], moving = [0];
for (let f = 1; f < n; f++) {
  let s = 0, k = 0;
  for (let i = 0; i < N; i++) {
    const d = Math.abs(raw[(f - 1) * N + i] - raw[f * N + i]);
    s += d;
    if (d >= MOVING) k++;
  }
  diff.push(s / N);
  moving.push(k / N);
}
const median = (v) => { const s = [...v].sort((a, b) => a - b); return s.length ? s[Math.floor(s.length / 2)] : 0; };
const share = (v) => v.filter((d) => d > VISIBLE).length / Math.max(1, v.length);
// Planned cuts are single-frame spikes, not motion; leave them out.
const skip = new Set(cuts.flatMap((c) => [c, c + 1]));
const keep = (lo, hi) => Array.from({length: hi - lo}, (_, i) => lo + i).filter((f) => f > 0 && !skip.has(f));

const still = [];
let run = 0, start = 0;
for (let f = 1; f <= n; f++) {
  if (f < n && diff[f] < 0.08) { if (!run) start = f; run++; continue; }
  // Only the part before the end card's hold counts, so a freeze that runs on into the hold is still caught.
  const stop = Math.min(start + run, n - holdEnd);
  if (run && stop - start > fps) still.push([start, stop]);
  run = 0;
}

// The end card's last hold may rest (--hold-end), so it isn't counted against the video.
const all = keep(1, n - holdEnd);
const visible = share(all.map((f) => diff[f]));
const movingMedian = median(all.map((f) => moving[f]));
const pct = (v, d = 0) => `${(v * 100).toFixed(d)}%`;
console.log(`${n} frames`);
console.log(`${visible >= BAR.visible ? 'ok  ' : 'FAIL'} visible motion in ${pct(visible)} of frames (bar ${pct(BAR.visible)})`);
console.log(`${movingMedian >= BAR.moving ? 'ok  ' : 'FAIL'} ${pct(movingMedian, 2)} of pixels moving in the median frame (bar ${pct(BAR.moving)})`);
console.log(still.length ? `FAIL dead time:\n${still.map(([a, b]) => `       frames ${a}-${b}, ${((b - a) / fps).toFixed(2)} s with nothing moving`).join('\n')}` : 'ok   no stretch over 1 s with nothing moving');
const bounds = [0, ...cuts, n];
for (let k = 0; k < bounds.length - 1; k++) {
  const fr = keep(bounds[k], bounds[k + 1]);
  const v = share(fr.map((f) => diff[f])), m = median(fr.map((f) => moving[f]));
  const weak = v < BAR.visible || m < BAR.moving;
  console.log(`  scene ${bounds[k]}-${bounds[k + 1]}: motion in ${pct(v)} of frames, ${pct(m, 2)} of pixels moving${weak ? '   <- under the bar' : ''}`);
}
process.exitCode = visible >= BAR.visible && movingMedian >= BAR.moving && !still.length ? 0 : 1;
