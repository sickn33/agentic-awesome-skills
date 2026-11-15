const {execFileSync} = require('node:child_process');
const path = require('node:path');
const root = path.resolve(__dirname, '../../..');
for (const name of ['test-check-viewer.cjs', 'test-viewer-builder.cjs']) {
  execFileSync(process.execPath, [path.join(root, 'skills/teardown/scripts', name)], {stdio: 'inherit', timeout: 30000});
}
