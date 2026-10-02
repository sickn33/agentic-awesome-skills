import { readFileSync, writeFileSync, mkdirSync, cpSync, lstatSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { build } from 'esbuild';
const require = createRequire(import.meta.url);
const YAML = require('yaml');
const root = fileURLToPath(new URL('../../../', import.meta.url));
const { loadBundledCatalog, canonicalJson, sha256 } = require('../../../tools/lib/aas-v1');
const skillIds = ['aas-discover', 'aas-compose-stack', 'aas-review-stack'];

export async function writePackage(destination) {
  if (lstatSafe(destination)) throw new Error('Use a fresh package destination');
  const catalog = loadBundledCatalog({ root }); // Verify every catalog asset before packaging.
  const manifest = JSON.parse(readFileSync(new URL('../plugin-source.json', import.meta.url), 'utf8'));
  mkdirSync(destination, { recursive: true });
  writeFileSync(path.join(destination, 'plugin.json'), `${JSON.stringify(manifest, null, 2)}\n`);
  const server = { type: 'stdio', command: 'node', args: ['${PLUGIN_ROOT}/runtime/aas-mcp.cjs', '${PLUGIN_ROOT}'], cwd: '${PLUGIN_ROOT}' };
  writeFileSync(path.join(destination, 'mcp.json'), `${JSON.stringify({ $schema: 'https://agent-plugins.org/schemas/1.0.0/mcp.schema.json', mcpServers: { aas: server } }, null, 2)}\n`);
  mkdirSync(path.join(destination, '.codex-plugin'));
  const compatibility = { ...manifest, skills: './skills/', mcpServers: './.mcp.json', interface: manifest.extensions['com.openai'].interface };
  writeFileSync(path.join(destination, '.codex-plugin/plugin.json'), `${JSON.stringify(compatibility, null, 2)}\n`);
  const { type, ...codexServer } = server;
  writeFileSync(path.join(destination, '.mcp.json'), `${JSON.stringify({ mcpServers: { aas: codexServer } }, null, 2)}\n`);
  for (const id of skillIds) {
    const source = path.join(root, 'skills', id);
    if (readdirSync(source).some((name) => name !== 'SKILL.md')) throw new Error('Inspect new bundled files before packaging');
    const match = /^---\n([\s\S]*?)\n---\n([\s\S]*)$/.exec(readFileSync(path.join(source, 'SKILL.md'), 'utf8'));
    if (!match) throw new Error('Invalid canonical frontmatter');
    const data = YAML.parse(match[1]);
    const metadata = Object.fromEntries(Object.entries(data).filter(([key]) => !['name', 'description'].includes(key)).map(([key, value]) => [key, typeof value === 'string' ? value : JSON.stringify(value)]));
    mkdirSync(path.join(destination, 'skills', id), { recursive: true });
    writeFileSync(path.join(destination, 'skills', id, 'SKILL.md'), `---\n${YAML.stringify({ name: data.name, description: data.description, metadata })}---\n${match[2]}`);
  }
  // Core has its own isolated data root, separate from the three native workflow skills.
  const coreRoot = path.join(destination, 'core');
  mkdirSync(coreRoot, { recursive: true });
  for (const file of ['package.json', 'skills_index.json', 'LICENSE', 'data/aas-v1/catalog-manifest.v1.json', ...JSON.parse(readFileSync(path.join(root, 'data/aas-v1/catalog-manifest.v1.json'), 'utf8')).assets.map((asset) => asset.path)]) {
    const target = path.join(coreRoot, file); mkdirSync(path.dirname(target), { recursive: true }); cpSync(path.join(root, file), target);
  }
  cpSync(path.join(root, 'schemas/aas-v1'), path.join(coreRoot, 'schemas/aas-v1'), { recursive: true });
  for (const skill of catalog.skills) {
    for (const file of skill.untrustedFiles ?? []) {
      if (file.type !== 'file') continue; // Core already reports symlink resources as unsupported.
      const source = path.join(root, path.dirname(skill.untrustedContentPath), file.path);
      const stat = lstatSync(source);
      if (!stat.isFile() || stat.isSymbolicLink()) throw new Error('Unsafe catalog support file');
      if (stat.size !== file.size || `sha256-${createHash('sha256').update(readFileSync(source)).digest('hex')}` !== file.sha256) throw new Error('Catalog support file integrity mismatch');
      const target = path.join(coreRoot, path.dirname(skill.untrustedContentPath), file.path);
      mkdirSync(path.dirname(target), { recursive: true }); cpSync(source, target);
    }
  }
  mkdirSync(path.join(destination, 'ui'));
  cpSync(path.join(root, '.tmp/aas-plugin/workbench.html'), path.join(destination, 'ui/workbench.html'));
  mkdirSync(path.join(coreRoot, 'ui'));
  cpSync(path.join(destination, 'ui/workbench.html'), path.join(coreRoot, 'ui/workbench.html'));
  mkdirSync(path.join(destination, 'assets'));
  cpSync(path.join(root, 'apps/web-app/public/agentic-skills-logo.png'), path.join(destination, 'assets/aas-mark.png'));
  const patch = { name: 'local-core-paths', setup(builder) {
    builder.onLoad({ filter: /tools\/lib\/aas-v1\/(schema-validator\.js|cli\/main\.js)$/ }, (args) => {
      let contents = readFileSync(args.path, 'utf8');
      contents = contents.replace('path.resolve(__dirname, "../../../schemas/aas-v1")', 'path.resolve(__dirname, "../core/schemas/aas-v1")');
      contents = contents.replace('path.resolve(__dirname, "../../../..")', 'path.resolve(__dirname, "../core")');
      contents = contents.replace('const result = await execute(argv);', 'const result = await execute(argv, io.dependencies || {});');
      return { contents, loader: 'js', resolveDir: path.dirname(args.path) };
    });
  } };
  const notices = new Map();
  for (const [entry, output] of [['stdio.mjs', 'aas-mcp.cjs'], ['local-cli.mjs', 'aas-core.cjs']]) {
    const bundled = await build({ metafile: true, entryPoints: [path.join(root, 'apps/aas-plugin/src', entry)], outfile: path.join(destination, 'runtime', output), bundle: true, platform: 'node', format: 'cjs', target: 'node22', plugins: [patch], logLevel: 'silent' });
    for (const input of [...Object.keys(bundled.metafile.inputs), ...(entry === 'stdio.mjs' ? JSON.parse(readFileSync(path.join(root, '.tmp/aas-plugin/ui-modules.json'), 'utf8')) : [])]) {
      let directory = path.dirname(path.resolve(input));
      while (directory !== path.dirname(directory)) {
        if (directory.includes('node_modules') && lstatSafe(path.join(directory, 'package.json'))) {
          const dependency = JSON.parse(readFileSync(path.join(directory, 'package.json'), 'utf8'));
          if (!dependency.name || !dependency.version) { directory = path.dirname(directory); continue; }
          if (!notices.has(dependency.name)) {
            const licenseFiles = readdirSync(directory).filter((name) => /^(license|copying|notice)([.-]|$)/i.test(name) && lstatSync(path.join(directory, name)).isFile());
            notices.set(dependency.name, `${dependency.name}@${dependency.version} (${dependency.license ?? 'see license'})\n${licenseFiles.map((name) => readFileSync(path.join(directory, name), 'utf8')).join('\n')}`);
          }
          break;
        }
        directory = path.dirname(directory);
      }
    }
  }
  const assets = [];
  function scan(directory) {
    for (const name of readdirSync(directory).sort()) {
      const file = path.join(directory, name); const stat = lstatSync(file);
      if (stat.isSymbolicLink()) throw new Error('Unsafe local runtime closure');
      if (stat.isDirectory()) scan(file);
      else if (stat.isFile()) assets.push({ path: path.relative(destination, file).split(path.sep).join('/'), size: stat.size, sha256: sha256(readFileSync(file)) });
    }
  }
  scan(coreRoot); scan(path.join(destination, 'runtime')); assets.sort((a,b) => a.path.localeCompare(b.path, 'en'));
  const identity = { package: catalog.package, version: catalog.version, integrity: `sha512-${createHash('sha512').update(canonicalJson(assets)).digest('base64')}`, closureDigest: sha256(canonicalJson({ digestVersion: 'aas-local-plugin-v1', assets })) };
  writeFileSync(path.join(destination, 'runtime-closure.json'), `${JSON.stringify({ identity, assets }, null, 2)}\n`);
  // This identity binds local plugin bytes, not a verified npm tarball. No network cache is needed.
  // Config passes the contained Core root; no npm/npx or runtime installation is needed.
  server.args[1] = '${PLUGIN_ROOT}/core'; codexServer.args[1] = '${PLUGIN_ROOT}/core';
  writeFileSync(path.join(destination, 'mcp.json'), `${JSON.stringify({ $schema: 'https://agent-plugins.org/schemas/1.0.0/mcp.schema.json', mcpServers: { aas: server } }, null, 2)}\n`);
  writeFileSync(path.join(destination, '.mcp.json'), `${JSON.stringify({ mcpServers: { aas: codexServer } }, null, 2)}\n`);
  writeFileSync(path.join(destination, 'THIRD-PARTY-NOTICES.txt'), [...notices.values()].join('\n\n----------------\n\n'));
  cpSync(path.join(root, 'LICENSE'), path.join(destination, 'LICENSE'));
  writeFileSync(path.join(destination, 'README.md'), '# AAS local plugin\n\nRequires Node.js 22 or later on the user computer. Catalog, supporting files, MCP runtime, offline Core artifact CLI and Workbench are bundled. No API keys, background cloud services, runtime downloads or hosted fallback. Open ui/workbench.html locally if the client cannot render MCP Apps. Native workflows are three entrypoints; the full catalog is read locally through MCP.\n');
  return { catalogDigest: catalog.digest, skillCount: catalog.skills.length };
}
function lstatSafe(file) { try { return lstatSync(file); } catch (error) { if (error.code === 'ENOENT') return null; throw error; } }

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  if (process.argv.length !== 2) throw new Error('Usage: npm run plugin:package (local stdio only; no endpoint flags)');
  const output = path.join(root, '.tmp/aas-plugin', `local-${Date.now()}`);
  const destination = path.join(output, 'plugins/agentic-awesome-skills');
  const verified = await writePackage(destination);
  mkdirSync(path.join(output, '.agents/plugins'), { recursive: true });
  writeFileSync(path.join(output, '.agents/plugins/marketplace.json'), `${JSON.stringify({ name: 'aas-local', interface: { displayName: 'AAS Local' }, plugins: [{ name: 'agentic-awesome-skills', source: { source: 'local', path: './plugins/agentic-awesome-skills' }, policy: { installation: 'AVAILABLE', authentication: 'ON_USE' }, category: 'Productivity' }] }, null, 2)}\n`);
  const archive = path.join(output, 'aas-local.zip');
  const zip = spawnSync('python3', ['-c', 'import pathlib,sys,zipfile\np=pathlib.Path(sys.argv[1])\nwith zipfile.ZipFile(sys.argv[2],"w",zipfile.ZIP_DEFLATED) as z:\n for f in sorted(p.rglob("*")):\n  if f.is_symlink(): raise ValueError("symlink in plugin")\n  if f.is_file(): z.write(f,f.relative_to(p))', destination, archive], { encoding: 'utf8' });
  if (zip.status !== 0) throw new Error('Archive creation failed');
  process.stdout.write(`${JSON.stringify({ marketplaceRoot: output, pluginRoot: destination, archive, ...verified, execution: 'user-local-stdio-only' }, null, 2)}\n`);
}
