import path from 'node:path';
import { readFileSync, lstatSync } from 'node:fs';
import { createHash } from 'node:crypto';
import coreCli from '../../../tools/lib/aas-v1/cli/main.js';
import core from '../../../tools/lib/aas-v1/index.js';

// Only user-invoked offline artifact operations are exposed; no registry or host setup.
const allowed = ['stack init', 'stack create', 'stack audit', 'stack plan', 'stack doctor'];
const argv = process.argv.slice(2);
function resolveBundledRuntime({ options, expected }) {
  const root = path.resolve(__dirname, '..');
  const closure = JSON.parse(readFileSync(path.join(root, 'runtime-closure.json'), 'utf8'));
  const digest = core.sha256(core.canonicalJson({ digestVersion: 'aas-local-plugin-v1', assets: closure.assets }));
  const integrity = `sha512-${createHash('sha512').update(core.canonicalJson(closure.assets)).digest('base64')}`;
  if (digest !== closure.identity.closureDigest || integrity !== closure.identity.integrity) throw new Error('Local runtime closure mismatch');
  for (const asset of closure.assets) {
    const absolute = path.resolve(root, asset.path);
    if (!absolute.startsWith(`${root}${path.sep}`)) throw new Error('Unsafe local runtime asset');
    const stat = lstatSync(absolute);
    if (!stat.isFile() || stat.isSymbolicLink() || stat.size !== asset.size || core.sha256(readFileSync(absolute)) !== asset.sha256) throw new Error('Local runtime asset mismatch');
  }
  if (options['runtime-version'] !== undefined && options['runtime-version'] !== closure.identity.version) throw new Error('Local runtime version mismatch');
  if (options['runtime-integrity'] !== undefined && options['runtime-integrity'] !== integrity) throw new Error('Local runtime integrity mismatch');
  if (expected && Object.entries(expected).some(([key, value]) => closure.identity[key] !== value)) throw new Error('Local plan runtime mismatch');
  return { identity: closure.identity, sourceRoot: path.join(root, 'core') };
}
if (!allowed.includes(argv.slice(0, 2).join(' '))) {
  process.stderr.write('The bundled CLI supports offline stack init/create/audit/plan/doctor only. No downloads, host configuration or automatic installation.\n');
  process.exitCode = 2;
} else coreCli.main(argv, { dependencies: { resolveVerifiedRuntime: resolveBundledRuntime } }).then((code) => { process.exitCode = code; });
