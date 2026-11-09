#!/usr/bin/env node
const fs = require('node:fs'), os = require('node:os'), path = require('node:path'), {spawn} = require('node:child_process');
const {findChrome} = require('./commands.cjs');

const TIMEOUT = 60000;
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

async function connect(profile) {
  const portFile = path.join(profile, 'DevToolsActivePort'), start = Date.now();
  while (!fs.existsSync(portFile) || !fs.readFileSync(portFile, 'utf8').includes('\n')) {
    if (Date.now() - start > TIMEOUT) throw Error('Chrome did not open a debugging port');
    await sleep(100);
  }
  const port = fs.readFileSync(portFile, 'utf8').split('\n')[0];
  const page = (await (await fetch(`http://127.0.0.1:${port}/json/list`)).json()).find(t => t.type === 'page');
  const socket = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    socket.onopen = resolve;
    socket.onerror = reject;
  });
  let id = 0;
  const pending = new Map(), listeners = [];
  socket.onmessage = ({data}) => {
    const message = JSON.parse(data);
    if (message.id && pending.has(message.id)) {
      const {resolve, reject} = pending.get(message.id);
      pending.delete(message.id);
      if (message.error) reject(Error(message.error.message));
      else resolve(message.result);
    } else if (message.method) {
      listeners.forEach(listen => listen(message));
    }
  };
  const send = (method, params = {}) => new Promise((resolve, reject) => {
    pending.set(++id, {resolve, reject});
    socket.send(JSON.stringify({id, method, params}));
  });
  return {send, on: listen => listeners.push(listen), close: () => socket.close()};
}

async function check(htmlPath, outDir, {dark = false} = {}) {
  const chrome = findChrome();
  if (!chrome) throw Error('Chrome or Chromium is required for the viewer check');
  const page = path.resolve(htmlPath);
  if (!fs.existsSync(page)) throw Error(`No page at ${page}`);
  fs.mkdirSync(outDir, {recursive: true});
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'drawing-check-'));
  const browser = spawn(chrome, ['--headless=new', '--remote-debugging-port=0', `--user-data-dir=${profile}`, '--window-size=1400,900', '--no-first-run', 'about:blank'], {stdio: 'ignore'});
  const problems = [], requests = [];
  try {
    const cdp = await connect(profile);
    cdp.on(({method, params}) => {
      if (method === 'Runtime.exceptionThrown') problems.push('Page error: ' + (params.exceptionDetails.exception?.description ?? params.exceptionDetails.text));
      if (method === 'Runtime.consoleAPICalled' && params.type === 'error') problems.push('Console error: ' + params.args.map(a => a.value ?? a.description).join(' '));
      if (method === 'Network.requestWillBeSent' && !/^(file|data|blob|about):/.test(params.request.url)) requests.push(params.request.url);
    });
    await cdp.send('Runtime.enable');
    await cdp.send('Network.enable');
    await cdp.send('Page.enable');
    await cdp.send('Emulation.setEmulatedMedia', {features: [{name: 'prefers-color-scheme', value: dark ? 'dark' : 'light'}]});
    await cdp.send('Page.navigate', {url: 'file://' + page});
    const evaluate = async expression => (await cdp.send('Runtime.evaluate', {expression, returnByValue: true})).result.value;
    const settle = async () => {
      const start = Date.now();
      await sleep(300);
      for (;;) {
        const state = await evaluate(`({status: document.getElementById('render-status')?.textContent ?? '', busy: document.getElementById('viewport')?.getAttribute('aria-busy'), message: document.getElementById('message')?.textContent ?? '', parts: document.querySelectorAll('#drawing [data-item]').length})`);
        if (state && state.busy === 'false') return state;
        if (Date.now() - start > TIMEOUT) throw Error('The drawing did not finish rendering within a minute');
        await sleep(200);
      }
    };
    await settle();
    const drawings = await evaluate(`JSON.parse(document.getElementById('drawing-data').textContent).map(d => ({id: d.id, parts: d.parts.length}))`);
    const results = [];
    for (const d of drawings) {
      await evaluate(`(() => { const s = document.getElementById('subject'); if (s.value !== ${JSON.stringify(d.id)}) { s.value = ${JSON.stringify(d.id)}; s.dispatchEvent(new Event('change')); } })()`);
      const state = await settle();
      const ok = state.status === 'Drawing updated' && state.parts === d.parts;
      if (!ok) problems.push(`${d.id}: status "${state.status || state.message}", ${state.parts} of ${d.parts} parts drawn`);
      const shot = await cdp.send('Page.captureScreenshot', {format: 'png'});
      const file = path.resolve(outDir, `viewer-${d.id}${dark ? '-dark' : ''}.png`);
      fs.writeFileSync(file, Buffer.from(shot.data, 'base64'));
      results.push({id: d.id, ok, parts: state.parts, file});
    }
    cdp.close();
    for (const r of results) console.log(`${r.ok ? 'OK' : 'FAILED'} ${r.id}: ${r.parts} parts drawn, screenshot ${r.file}`);
    for (const url of requests) problems.push('Network request: ' + url);
    for (const p of problems) console.warn('PROBLEM ' + p);
    if (problems.length) process.exitCode = 1;
    return {results, problems};
  } finally {
    browser.kill();
    await sleep(200);
    fs.rmSync(profile, {recursive: true, force: true});
  }
}

if (require.main === module) {
  const args = process.argv.slice(2), [htmlPath, outDir] = args.filter(a => !a.startsWith('--'));
  if (!htmlPath || !outDir) {
    console.error('Usage: node check-viewer.cjs dist/index.html check/ [--dark]');
    process.exitCode = 1;
  } else {
    check(htmlPath, outDir, {dark: args.includes('--dark')}).catch(e => {
      console.error(e.stack);
      process.exitCode = 1;
    });
  }
}
module.exports = check;
