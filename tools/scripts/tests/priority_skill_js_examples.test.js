const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '../../..');
function example(skill, symbol, context = {}) {
  const source = fs.readFileSync(path.join(root, 'skills', skill, 'SKILL.md'), 'utf8');
  const blocks = [...source.matchAll(/```javascript\n([\s\S]*?)\n```/g)].map(match => match[1]);
  const block = blocks.find(code => code.includes(`function ${symbol}(`));
  assert.ok(block, `published example ${symbol} missing`);
  return vm.runInNewContext(`${block}\n${symbol}`, context);
}
const interval = example('agent-evaluation', 'wilson95');
assert.ok(Math.abs(interval(10, 10)[0] - 0.7224672) < 0.000001);
assert.ok(interval(0, 10)[1] > 0.27);
for (const args of [[0, 0], [-1, 10], [11, 10], [true, 10]]) assert.throws(() => interval(...args));
const stringSchema = { trim() { return this; }, min() { return this; }, max() { return this; } };
const fakeZod = { z: { object: () => ({ strict: () => ({}) }), string: () => stringSchema } };
const id = example('api-security-best-practices', 'parsePositiveId', { require: () => fakeZod });
assert.equal(id('12'), 12);
for (const input of ['12abc', '1.0', '0', '-1', '1e3', '9007199254740992', '', 12, ' 12']) assert.equal(id(input), null);
const validate = example('api-security-best-practices', 'validateBody', { require: () => fakeZod });
const req = { body: { displayName: '  fixture  ' } }; let next = 0;
validate({ safeParse: () => ({ success: true, data: { displayName: 'fixture' } }) })(req, {}, () => next++);
assert.equal(req.validatedBody.displayName, 'fixture'); assert.equal(next, 1);
let code; let returned;
validate({ safeParse: () => ({ success: false }) })({}, { status(value) { code = value; return this; }, json(value) { returned = value; } }, () => next++);
assert.equal(code, 400); assert.equal(returned.error, 'Invalid request'); assert.equal(next, 1);
const policies = [];
let claims = { sub: 'user', tenantId: 'tenant', exp: 200, iat: 100 };
const verify = example('api-security-best-practices', 'verifyAccessToken', { require: () => ({ verify(token, key, policy) { policies.push(policy); return claims; } }) });
assert.equal(verify('token', 'key').subject, 'user');
assert.equal(policies[0].algorithms.join(','), 'HS256'); assert.equal(policies[0].audience, 'example-api');
for (const invalid of [{ sub: 'u', tenantId: 't', iat: 1 }, { sub: 'u', tenantId: 't', exp: 1, iat: 2 }, 'unverified']) {
  claims = invalid; assert.throws(() => verify('token', 'key'));
}
console.log('Published examples: Wilson uncertainty, strict IDs, parsed body and required token claims passed (synthetic provider adapter).');
