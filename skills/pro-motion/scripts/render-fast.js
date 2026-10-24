// render-fast.js — deterministic canvas film → MP4, rendered by N parallel headless tabs, audio muxed in a separate pass.
// usage:
//   node tools/render-fast.js <page?query> <out.mp4> [--fps 60] [--dur 20] [--audio music/track.mp3] [--workers 6]
//   node tools/render-fast.js <page?query> <out_dir> --stills 1.2,3.4      # PNG style frames / checks at given seconds
//   node tools/render-fast.js --find-chrome                                 # print the browser that will be used
// The page must define window.READY (promise), window.render(t) and window.DUR, and draw into <canvas id="c">.
// Never uses ffmpeg -shortest (it truncated audio with slow image pipes); frames go to JPEGs first, then one mux.
const http = require('http'), fs = require('fs'), path = require('path'), os = require('os'), { spawnSync } = require('child_process');
const ROOT = path.resolve(__dirname, '..');
const args = process.argv.slice(2), opt = k => { const i = args.indexOf('--' + k); return i >= 0 ? args[i + 1] : null; };

function findChrome() {
  if (process.env.CHROME && fs.existsSync(process.env.CHROME)) return process.env.CHROME;
  const c = ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/Applications/Chromium.app/Contents/MacOS/Chromium', '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
    '/usr/bin/google-chrome', '/usr/bin/google-chrome-stable', '/usr/bin/chromium', '/usr/bin/chromium-browser', '/snap/bin/chromium',
    'C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe'];
  return c.find(p => fs.existsSync(p)) || null; // null → puppeteer's own download (if installed without PUPPETEER_SKIP_DOWNLOAD)
}
if (args[0] === '--find-chrome') { const c = findChrome(); console.log(c || '(none found — puppeteer bundled browser will be tried)'); process.exit(c ? 0 : 1); }

const puppeteer = require('puppeteer'), ffmpeg = require('ffmpeg-static');
const [page, out] = args;
const FPS = +(opt('fps') || 60), WORKERS = +(opt('workers') || Math.max(2, Math.min(8, os.cpus().length - 2))), AUDIO = opt('audio') || 'music/track.mp3', STILLS = opt('stills');
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.ttf': 'font/ttf', '.otf': 'font/otf', '.woff2': 'font/woff2', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.mp3': 'audio/mpeg', '.wav': 'audio/wav' };

(async () => {
  const t0 = Date.now();
  const srv = http.createServer((q, r) => { const f = path.join(ROOT, decodeURIComponent(q.url.split('?')[0])); fs.readFile(f, (e, d) => { if (e) { r.writeHead(404); r.end(); } else { r.writeHead(200, { 'content-type': MIME[path.extname(f).toLowerCase()] || 'application/octet-stream' }); r.end(d); } }); }).listen(0);
  const url = `http://127.0.0.1:${srv.address().port}/${page}${page.includes('?') ? '&' : '?'}render=1`;
  const exe = findChrome(), browser = await puppeteer.launch({ headless: 'new', ...(exe ? { executablePath: exe } : {}) });
  const open = async () => { const p = await browser.newPage(); p.on('pageerror', e => console.log('[err]', e.message)); await p.goto(url); await p.evaluate(() => window.READY); return p; };
  const grab = (p, t, type = 'image/jpeg') => p.evaluate((t, type) => { window.render(t); return document.getElementById('c').toDataURL(type, .92).split(',')[1]; }, t, type);

  if (STILLS) {
    const p = await open(), dir = path.resolve(ROOT, out); fs.mkdirSync(dir, { recursive: true });
    for (const t of STILLS.split(',').map(Number)) fs.writeFileSync(path.join(dir, `still_${t.toFixed(2)}.png`), Buffer.from(await grab(p, t, 'image/png'), 'base64'));
    await browser.close(); srv.close(); console.log(`stills → ${dir}`); return;
  }

  const pages = await Promise.all(Array.from({ length: WORKERS }, open));
  const DUR = +(opt('dur') || await pages[0].evaluate(() => window.DUR)), N = Math.round(DUR * FPS);
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'mgfilm-frames-'));
  await Promise.all(pages.map(async (p, k) => { for (let i = k; i < N; i += WORKERS) fs.writeFileSync(path.join(tmp, `f${String(i).padStart(6, '0')}.jpg`), Buffer.from(await grab(p, i / FPS), 'base64')); }));
  await browser.close(); srv.close();
  const tr = Date.now(), dest = path.resolve(ROOT, out); fs.mkdirSync(path.dirname(dest), { recursive: true });
  const hasAudio = fs.existsSync(path.join(ROOT, AUDIO));
  const r = spawnSync(ffmpeg, ['-y', '-loglevel', 'error', '-framerate', String(FPS), '-i', path.join(tmp, 'f%06d.jpg'), ...(hasAudio ? ['-i', path.join(ROOT, AUDIO), '-map', '0:v', '-map', '1:a', '-c:a', 'aac', '-b:a', '256k'] : []),
    '-t', String(DUR), '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '19', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', dest], { stdio: 'inherit' });
  fs.rmSync(tmp, { recursive: true, force: true });
  console.log(`${out}: ${N} frames @${FPS}fps, ${WORKERS} tabs, render ${((tr - t0) / 1000).toFixed(1)}s, encode ${((Date.now() - tr) / 1000).toFixed(1)}s${hasAudio ? '' : ' (no audio found)'}, exit ${r.status}`);
  process.exit(r.status || 0);
})();
