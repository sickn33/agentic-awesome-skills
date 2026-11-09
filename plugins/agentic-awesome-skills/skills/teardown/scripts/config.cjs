const fs = require('node:fs'), path = require('node:path');

const assets = path.resolve(__dirname, '../assets');
const RUNTIME = ['sheet.js', 'geometry.js', 'projection.js'].map(name => path.join(assets, name));

function validate(config) {
  if (!Array.isArray(config.drawings) || !config.drawings.length) throw Error('Provide at least one drawing');
  const ids = new Set();
  for (const d of config.drawings) {
    if (!/^[a-z][a-z0-9-]*$/.test(d.id) || ids.has(d.id)) throw Error('Drawing IDs must be unique slugs');
    ids.add(d.id);
    if (!d.title || !d.description || !Array.isArray(d.parts) || !d.parts.length) throw Error('Drawing metadata is incomplete');
    if (d.initialView !== undefined && !['assembled', 'exploded'].includes(d.initialView)) throw Error('Initial view must be assembled or exploded');
    d.parameters ??= [];

    const parts = new Set();
    for (const p of d.parts) {
      p.id = String(p.id);
      if (!/^[a-zA-Z0-9_-]+$/.test(p.id) || parts.has(p.id) || !p.name) throw Error('Part IDs must be unique safe identifiers');
      parts.add(p.id);
    }
    const keys = new Set();
    for (const p of d.parameters) {
      if (!/^[a-zA-Z][a-zA-Z0-9_]*$/.test(p.key) || keys.has(p.key) || !p.label) throw Error('Parameter keys must be unique safe identifiers');
      keys.add(p.key);
      const step = p.step ?? 1;
      if (![p.min, p.max, p.default, step].every(Number.isFinite) || p.max <= p.min || p.default < p.min || p.default > p.max || step <= 0) {
        throw Error('Invalid parameter range');
      }
    }
  }
  if (!Array.isArray(config.modelScripts) || !config.modelScripts.length) throw Error('Provide model scripts defining self.DrawingModels');
}

function load(configPath) {
  const base = path.dirname(path.resolve(configPath)), config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  validate(config);
  const resolve = file => path.resolve(base, file);
  return {config, resolve, modelScripts: config.modelScripts.map(resolve)};
}

module.exports = {assets, RUNTIME, load};
