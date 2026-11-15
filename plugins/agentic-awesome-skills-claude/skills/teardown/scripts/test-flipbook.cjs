const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const source = fs.readFileSync(path.join(__dirname, '../assets/flipbook.js'), 'utf8');
const context = vm.createContext({Promise});
vm.runInContext(source, context);
const {create, easeInOutCubic} = context.DrawingFlipbook;

function fakeWorker({fail = false} = {}) {
  const listeners = new Set();
  const worker = {
    sent: [],
    addEventListener: (type, fn) => listeners.add(fn),
    removeEventListener: (type, fn) => listeners.delete(fn),
    postMessage(message) {
      worker.sent.push(message);
      queueMicrotask(() => {
        const data = fail ? {request: message.request, error: 'Invalid geometry'} : {request: message.request, result: {markup: `${message.explosion}|${message.labels}`}};
        for (const fn of [...listeners]) fn({data});
      });
    }
  };
  return worker;
}

const settle = () => new Promise(resolve => setTimeout(resolve, 0));

(async () => {
  const workers = [];
  const book = create(() => { const w = fakeWorker(); workers.push(w); return w; }, {frames: 5, size: 2});
  book.prepare('a', {id: 'fixture', fill: true});
  assert.equal(book.ready('a'), null, 'No frames are handed over while any is missing');
  await settle();
  const frames = book.ready('a');
  assert.equal(frames.length, 5, 'Every frame is rendered');
  assert.deepEqual([...frames], ['0|true', '0.25|false', '0.5|false', '0.75|false', '1|true'], 'Frames run in order and only the ends carry labels');
  const sent = workers.flatMap(w => w.sent);
  assert.ok(sent.every(m => m.fitExplosion === 1 && m.id === 'fixture' && m.fill), 'Every frame fits the expanded layout and keeps the subject');
  assert.equal(book.ready('b'), null, 'Frames belong to the key they were prepared for');

  book.prepare('a', {id: 'fixture'});
  assert.equal(sent.length, workers.flatMap(w => w.sent).length, 'Preparing the same key again renders nothing');

  book.prepare('b', {id: 'other'});
  book.prepare('c', {id: 'third'});
  await settle();
  assert.equal(book.ready('b'), null, 'A newer key cancels the older job');
  assert.equal(book.ready('c').length, 5, 'The newest key still completes');

  const failing = create(() => fakeWorker({fail: true}), {frames: 3, size: 1});
  failing.prepare('x', {id: 'fixture'});
  await settle();
  assert.equal(failing.ready('x'), null, 'A failed render leaves nothing to play');

  assert.equal(easeInOutCubic(0), 0);
  assert.equal(easeInOutCubic(1), 1);
  assert.equal(easeInOutCubic(.5), .5);
  assert.ok(easeInOutCubic(.1) < .1 && easeInOutCubic(.9) > .9, 'The ease starts and ends slowly');

  console.log('Passed ordered frames, end-only labels, shared fit, key cancellation, failures and the ease.');
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
