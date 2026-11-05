const assert = require('node:assert/strict'), fs = require('node:fs'), os = require('node:os'), path = require('node:path'), vm = require('node:vm');
const build = require('./build-viewer.cjs');
const root = fs.mkdtempSync(path.join(os.tmpdir(), 'drawing-builder-'));
try {
  const files = {
    'vendor/jspdf/dist/jspdf.umd.min.js': 'globalThis.jspdf={loaded:true};',
    'vendor/svg2pdf.js/dist/svg2pdf.umd.min.js': 'globalThis.svg2pdf={loaded:true};',
    'vendor/@fontsource-variable/inter/LICENSE': 'Fixture font license',
    'vendor/@fontsource-variable/inter/files/inter-latin-wght-normal.woff2': 'font-fixture',
    'model.js':
      'self.DrawingModels={fixture:()=>({markup:"<g data-item=\\"one\\"><path data-line-role=\\"edge\\" d=\\"M0 0L1 1\\"/></g>"})};'
  };
  for (const [name, contents] of Object.entries(files)) {
    fs.mkdirSync(path.dirname(path.join(root, name)), {recursive: true});
    fs.writeFileSync(path.join(root, name), contents);
  }
  const title = 'Fixture </script><script>unexpected()</script>';
  const config = {
    dependencies: 'vendor',
    modelScripts: ['model.js'],
    drawings: [{id: 'fixture', title, description: 'Fixture geometry', parts: [{id: 'one', name: 'One'}], parameters: []}]
  };
  const configPath = path.join(root, 'drawing.json'), output = path.join(root, 'dist/index.html');
  fs.writeFileSync(configPath, JSON.stringify(config));
  build(configPath, output);
  const html = fs.readFileSync(output, 'utf8'), scripts = [...html.matchAll(/<script([^>]*)>([\s\S]*?)<\/script>/g)];
  const data = JSON.parse(scripts.find(s => s[1].includes('id="drawing-data"'))[2]);
  assert.equal(data[0].title, title, 'Embedding must preserve text without creating script elements');
  const executable = scripts.filter(s => !s[1].includes('type='));
  assert.equal(executable.length, 8, 'Only the intended theme, libraries, sheet, queue, flipbook and viewer scripts execute');
  assert.ok(executable[0][2].includes('globalThis.DrawingTheme ='));
  assert.ok(html.indexOf(executable[0][0]) < html.indexOf('<style>'), 'Appearance must initialize before the page paints');
  const environment = {};
  vm.runInNewContext(executable[1][2], environment);
  vm.runInNewContext(executable[2][2], environment);
  assert.equal(environment.jspdf.loaded, true);
  assert.equal(environment.svg2pdf.loaded, true, 'PDF export dependency must be embedded');
  for (const s of executable) new vm.Script(s[2]);
  const worker = JSON.parse(scripts.find(s => s[1].includes('id="drawing-worker"'))[2]), context = {};
  context.self = context;
  context.postMessage = value => (context.result = value);
  vm.runInNewContext(worker, context);
  context.onmessage({data: {request: 1, id: 'fixture', parameters: {}, explosion: 0, isolated: null}});
  assert.equal(context.result.request, 1);
  assert.ok(context.result.result.markup.includes('data-item="one"'));
  config.drawings[0].initialView = 'assembled';
  fs.writeFileSync(configPath, JSON.stringify(config));
  build(configPath, output);
  assert.ok(fs.readFileSync(output, 'utf8').includes('"initialView":"assembled"'));
  config.drawings[0].initialView = 'unknown';
  fs.writeFileSync(configPath, JSON.stringify(config));
  assert.throws(() => build(configPath, output), /Initial view/);
  delete config.drawings[0].initialView;
  config.drawings[0].parameters = [{key: 'length', label: 'Length', min: 10, max: 1, default: 5}];
  fs.writeFileSync(configPath, JSON.stringify(config));
  assert.throws(() => build(configPath, output), /Invalid parameter range/);
  console.log('Passed embedded text safety, library loading, script parsing, worker dispatch and parameter validation.');
} finally {
  fs.rmSync(root, {recursive: true, force: true});
}
