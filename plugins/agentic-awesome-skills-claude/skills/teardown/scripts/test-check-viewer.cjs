const assert = require('node:assert/strict');
const vm = require('node:vm');
const {selectDrawing} = require('./check-viewer.cjs');

async function main() {
  const calls = [];
  let value = 'first', changes = 0;
  const selector = {
    get value() { return value; },
    set value(next) { value = next; },
    dispatchEvent(event) { assert.equal(event.type, 'change'); changes++; }
  };
  const cdp = {async send(method, params) {
    calls.push({method, params});
    if (method === 'Runtime.evaluate') return {result: {objectId: 'selector'}};
    if (method === 'Runtime.callFunctionOn') {
      // Execute only the reviewed static function in an inert DOM fixture.
      const fn = vm.runInNewContext('(' + params.functionDeclaration + ')', {Event});
      fn.call(selector, params.arguments[0].value);
    }
    return {};
  }};
  await selectDrawing(cdp, 'second-drawing');
  assert.equal(value, 'second-drawing');
  assert.equal(changes, 1);
  const invocation = calls.find(c => c.method === 'Runtime.callFunctionOn');
  assert.deepEqual(invocation.params.arguments, [{value: 'second-drawing'}]);
  assert.ok(!invocation.params.functionDeclaration.includes('second-drawing'));
  assert.equal(calls.at(-1).method, 'Runtime.releaseObject');
  await selectDrawing(cdp, 'second-drawing');
  assert.equal(changes, 1, 'Selecting the current drawing must not trigger another render');
  for (const id of ['../escape', 'x/../../escape', 'x\\escape', 'x\n', 'x\";alert(1)//', '', null, {toString() { return 'safe'; }}]) {
    const count = calls.length;
    await assert.rejects(selectDrawing(cdp, id), /safe slugs/);
    assert.equal(calls.length, count, 'Reject invalid IDs before browser calls or screenshot writes');
  }
  await assert.rejects(selectDrawing({send: async () => ({result: {value: null}})}, 'safe'), /unavailable/);
  const failed = [];
  await assert.rejects(selectDrawing({async send(method) {
    failed.push(method);
    return method === 'Runtime.evaluate' ? {result: {objectId: 'selector'}} : {exceptionDetails: {text: 'fixture failure'}};
  }}, 'safe'), /Could not select/);
  assert.equal(failed.at(-1), 'Runtime.releaseObject', 'Release the remote object after a page exception');
  console.log('Passed drawing selection, argument transport, unsafe IDs and page errors.');
}
main().catch(error => { console.error(error); process.exitCode = 1; });
