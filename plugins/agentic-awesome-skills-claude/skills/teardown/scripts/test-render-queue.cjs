const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const source = fs.readFileSync(path.join(__dirname, '../assets/render-queue.js'), 'utf8');

function boot() {
  const timers = new Map();
  let timerId = 0;
  const worker = {
    sent: [],
    postMessage(message) { this.sent.push(structuredClone(message)); },
    complete(index, result) { this.onmessage({data: {request: this.sent[index].request, result}}); },
    failModel(index) { this.onmessage({data: {request: this.sent[index].request, error: 'Invalid geometry'}}); }
  };
  const context = vm.createContext({
    structuredClone,
    setTimeout: callback => { timers.set(++timerId, callback); return timerId; },
    clearTimeout: id => timers.delete(id)
  });
  vm.runInContext(source, context);
  const queue = context.DrawingRenderQueue.create(worker);
  return {
    worker,
    send: (message, options) => queue.request(message, options),
    request: (length, options) => outcome(queue.request({id: 'fixture', parameters: {length}}, options)),
    elapse() {
      const callbacks = [...timers.values()];
      timers.clear();
      for (const callback of callbacks) callback();
    }
  };
}
const outcome = promise => promise.then(value => ({value}), error => ({error}));
const preview = {preview: true};
const debounced = {preview: true, delay: 120};

async function run() {
  {
    const {worker, request} = boot();
    const first = request(1, preview), stale = request(2, preview), latest = request(3, preview);
    assert.equal(worker.sent.length, 1, 'A busy worker must not receive queued obsolete previews');
    assert.equal((await stale).error.name, 'AbortError');
    assert.equal((await first).error.name, 'AbortError', 'A superseded running preview must never resolve');
    worker.complete(0, {markup: 'first'});
    assert.deepEqual(worker.sent.map(job => job.parameters.length), [1, 3]);
    worker.complete(1, {markup: 'latest'});
    assert.equal((await latest).value.markup, 'latest');
  }

  {
    const {worker, request, elapse} = boot();
    const typing = request(1, debounced), settled = request(2, debounced);
    assert.equal(worker.sent.length, 0, 'A debounced preview must wait for its delay');
    assert.equal((await typing).error.name, 'AbortError');
    elapse();
    assert.deepEqual(worker.sent.map(job => job.parameters.length), [2]);
    const during = request(3, debounced);
    worker.complete(0, {markup: 'settled'});
    assert.equal((await settled).error.name, 'AbortError');
    assert.equal(worker.sent.length, 1, 'A preview still inside its debounce must not start');
    elapse();
    worker.complete(1, {markup: 'during'});
    assert.equal((await during).value.markup, 'during');
  }

  {
    const {worker, request, send} = boot();
    const running = request(1, preview), queued = request(2, preview);
    const saved = {id: 'old-drawing', parameters: {length: 7}, isolated: 'part-a'};
    const exportResult = outcome(send(saved));
    saved.parameters.length = 99;
    const replacement = request(4, preview);
    assert.equal((await running).error.name, 'AbortError');
    assert.equal((await queued).error.name, 'AbortError');
    worker.complete(0, {markup: 'old preview'});
    assert.equal(worker.sent[1].parameters.length, 7, 'An export must retain its captured dimensions');
    assert.equal(worker.sent[1].isolated, 'part-a');
    worker.complete(1, {markup: 'export'});
    assert.equal((await exportResult).value.markup, 'export');
    assert.equal(worker.sent[2].parameters.length, 4);
    worker.complete(2, {markup: 'new preview'});
    assert.equal((await replacement).value.markup, 'new preview');
  }

  {
    const {worker, request} = boot();
    const failed = request(1);
    worker.failModel(0);
    assert.match((await failed).error.message, /Invalid geometry/);
    const next = request(2, preview);
    worker.complete(1, {markup: 'recovered'});
    assert.equal((await next).value.markup, 'recovered');
    const crash = request(3), waiting = request(4, debounced);
    worker.onerror({message: 'Worker crashed'});
    assert.match((await crash).error.message, /Worker crashed/);
    assert.match((await waiting).error.message, /Worker crashed/);
    assert.match((await request(5, preview)).error.message, /Worker crashed/);
  }
  console.log('Passed preview superseding, debouncing, export priority and snapshots, model errors and worker failure.');
}
run().catch(error => { console.error(error); process.exitCode = 1; });
