const assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
const source = fs.readFileSync(path.join(__dirname, '../assets/theme.js'), 'utf8');
function boot({dark = false, saved = null, blocked = false} = {}) {
  const root = {dataset: {}}, meta = {}, events = {}, storage = new Map(saved === null ? [] : [['teardown-appearance', saved]]);
  const system = {
    matches: dark,
    addEventListener(name, listener) {
      events.system = listener;
    }
  };
  const context = {
    document: {documentElement: root, querySelector: () => meta},
    matchMedia: () => system,
    window: {
      addEventListener(name, listener) {
        events[name] = listener;
      }
    },
    localStorage: {
      getItem(key) {
        if (blocked) throw Error('Storage unavailable');
        return storage.get(key) ?? null;
      },
      setItem(key, value) {
        if (blocked) throw Error('Storage unavailable');
        storage.set(key, value);
      },
      removeItem(key) {
        if (blocked) throw Error('Storage unavailable');
        storage.delete(key);
      }
    }
  };
  vm.runInNewContext(source, context);
  return {
    api: context.DrawingTheme,
    root,
    meta,
    storage,
    system(value) {
      system.matches = value;
      events.system();
    },
    external(value, key = 'teardown-appearance') {
      events.storage({key, newValue: value});
    }
  };
}
const page = boot();
assert.equal(page.api.mode, 'system');
assert.equal(page.root.dataset.theme, 'light');
page.system(true);
assert.equal(page.root.dataset.theme, 'dark');
assert.equal(page.meta.content, '#191919');
const updates = [];
const unsubscribe = page.api.subscribe((mode, theme) => updates.push([mode, theme]));
page.api.set('light');
assert.equal(page.storage.get('teardown-appearance'), 'light');
page.system(false);
page.system(true);
assert.equal(page.root.dataset.theme, 'light', 'Explicit choice must survive a system change');
assert.equal(
  boot({dark: true, saved: page.storage.get('teardown-appearance')}).root.dataset.theme,
  'light',
  'Saved choice must apply on reload'
);
page.api.set('system');
assert.equal(page.storage.size, 0);
assert.equal(page.root.dataset.theme, 'dark');
assert.deepEqual(updates, [['system', 'dark'], ['light', 'light'], ['system', 'dark']]);
unsubscribe();
page.external('light');
assert.equal(page.api.theme, 'light');
page.external(null);
assert.equal(page.api.mode, 'system');
assert.equal(page.api.theme, 'dark');
page.external('dark', 'unrelated-key');
assert.equal(page.api.mode, 'system');
page.api.set('invalid');
assert.equal(page.api.mode, 'system');
assert.equal(boot({dark: true, saved: 'invalid'}).api.theme, 'dark');
page.api.set('light');
page.external(null, null);
assert.equal(page.api.mode, 'system', 'Clearing storage restores the system choice');
const restricted = boot({dark: true, blocked: true});
restricted.api.set('light');
assert.equal(restricted.api.theme, 'light');
restricted.api.set('system');
assert.equal(restricted.api.theme, 'dark');
console.log('Passed system changes, explicit override, reload, reset, subscriptions, cross-tab updates and unavailable storage.');
