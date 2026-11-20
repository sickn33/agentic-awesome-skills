// Renders a video for review or for posting (references/pipeline.md). One bundle per run, then:
//
//   npm run stills <id>     every frame in STILLS, at scale 1          out/<id>/stills/<frame>.png
//   npm run review <id>     a silent cut at scale 1, and a contact sheet out/<id>/review.mp4, contact.png
//   npm run master <id>     scale 2, CRF 10, BT.709, with the music      out/<id>/master.mp4, thumbnail.png
//   npm run x <id>          the 1350x1080 lanczos cut X should get       out/<id>/x.mp4 (needs ffmpeg and a master)
//   npm run jumps <id>      the jump check on the review cut (or --file), with CUTS from timing.ts as planned cuts
//   npm run energy <id>     dead time and frame fill on the review cut (or --file), split at CUTS
//
// <id> is the composition id and its folder under src/. The stills and the thumbnail come from src/<id>/timing.ts.
import {execFileSync} from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {bundle} from '@remotion/bundler';
import {ensureBrowser, renderMedia, renderStill, selectComposition} from '@remotion/renderer';

const [mode, id] = process.argv.slice(2);
const MODES = ['stills', 'review', 'master', 'x', 'jumps', 'energy'];
if (!MODES.includes(mode) || !id) {
  console.error(`Usage: node --experimental-strip-types scripts/render.mjs <${MODES.join('|')}> <id>`);
  process.exit(1);
}
const root = process.cwd();
const out = path.join(root, 'out', id);
fs.mkdirSync(out, {recursive: true});
const timing = await import(pathToFileURL(path.join(root, 'src', id, 'timing.ts')).href);
const ffmpeg = (...args) => execFileSync('ffmpeg', ['-v', 'error', '-y', ...args], {stdio: 'inherit'});

if (mode === 'jumps' || mode === 'energy') {
  // Planned hard cuts come from timing.ts, so nobody types the list by hand.
  const at = process.argv.indexOf('--file');
  const video = at > 0 ? process.argv[at + 1] : path.join(out, 'review.mp4');
  if (!fs.existsSync(video)) throw new Error(`No ${video} yet: npm run review ${id}`);
  // Jumps skips the planned cuts and the designed steps (a number landing, a flash); energy splits scenes at the cuts.
  const cuts = (mode === 'jumps' ? [...(timing.CUTS ?? []), ...(timing.STEPS ?? [])] : timing.CUTS ?? []).join(',');
  const script = path.join(root, 'scripts', mode === 'jumps' ? 'frame-jumps.mjs' : 'energy.mjs');
  const flag = mode === 'jumps' ? '--scripted' : '--cuts';
  try {
    // The video's own frame rate, so a second of dead time and the end card's hold mean a second at any fps.
    const fps = String(timing.FPS ?? 60);
    const extra = mode === 'energy' ? ['--fps', fps, '--hold-end', fps] : [];
    execFileSync('node', [script, video, ...(cuts ? [flag, cuts] : []), ...extra], {stdio: 'inherit'});
  } catch {
    process.exit(1);
  }
  process.exit(0);
}

if (mode === 'x') {
  const master = path.join(out, 'master.mp4');
  if (!fs.existsSync(master)) throw new Error(`No master yet: npm run master ${id}`);
  // X plays about 1920x1200 at most, so it gets a lanczos downscale rather than the master. The audio is copied:
  // a second AAC encode raised a master's true peak from -2.4 to -0.6 dBTP and failed the audio check.
  ffmpeg('-i', master, '-vf', 'scale=1350:1080:flags=lanczos', '-c:v', 'libx264', '-preset', 'slow', '-crf', '14', '-profile:v', 'high',
    '-level', '4.2', '-pix_fmt', 'yuv420p', '-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709', '-color_range', 'tv',
    '-g', '120', '-c:a', 'copy', '-movflags', '+faststart', path.join(out, 'x.mp4'));
  console.log(`wrote ${path.relative(root, path.join(out, 'x.mp4'))}`);
  process.exit(0);
}

await ensureBrowser();
const serveUrl = await bundle({entryPoint: path.join(root, 'src/index.ts'), publicDir: path.join(root, 'public')});
const composition = await selectComposition({serveUrl, id});
const started = Date.now();
const done = (file) => console.log(`wrote ${path.relative(root, file)} in ${((Date.now() - started) / 1000).toFixed(1)} s`);

if (mode === 'stills') {
  const dir = path.join(out, 'stills');
  fs.mkdirSync(dir, {recursive: true});
  for (const frame of timing.STILLS) {
    const file = path.join(dir, `${String(frame).padStart(4, '0')}.png`);
    await renderStill({serveUrl, composition, frame, output: file, scale: 1});
    done(file);
  }
}

if (mode === 'review') {
  const file = path.join(out, 'review.mp4');
  await renderMedia({serveUrl, composition, codec: 'h264', outputLocation: file, scale: 1, muted: true, crf: 18, pixelFormat: 'yuv420p',
    onProgress: ({progress}) => process.stdout.write(`\r${Math.round(progress * 100)}%`)});
  process.stdout.write('\n');
  done(file);
  // Every 10th frame, 4 across: read it as a strip, with no sound.
  const rows = Math.ceil(composition.durationInFrames / 10 / 4);
  ffmpeg('-i', file, '-vf', `select='not(mod(n\\,10))',scale=338:-1,tile=4x${rows}`, '-frames:v', '1', path.join(out, 'contact.png'));
  done(path.join(out, 'contact.png'));
  console.log(`This cut is silent. Check it next: npm run jumps ${id} and npm run energy ${id}`);
}

if (mode === 'master') {
  const file = path.join(out, 'master.mp4');
  await renderMedia({serveUrl, composition, codec: 'h264', outputLocation: file, scale: 2, crf: 10, pixelFormat: 'yuv420p', colorSpace: 'bt709',
    x264Preset: 'slow', audioBitrate: '320k', onProgress: ({progress}) => process.stdout.write(`\r${Math.round(progress * 100)}%`)});
  process.stdout.write('\n');
  done(file);
  const thumb = path.join(out, 'thumbnail.png');
  await renderStill({serveUrl, composition, frame: timing.THUMBNAIL, output: thumb, scale: 2});
  done(thumb);
}
