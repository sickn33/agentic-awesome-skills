import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { getDocsMetadata } from './docs-metadata.js';

export const DOCS_RUNTIME_SLOT = '<!--aas:docs-runtime-->';
const scriptPattern = /<script id="aas-docs-runtime">globalThis\.__AAS_DOCS_METADATA__=(.*?);<\/script>/g;
const appRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

export function renderDocsRuntime(metadata) {
  // Prevent HTML/script termination even if a future metadata field contains markup.
  const json = JSON.stringify(metadata).replace(/[<>&\u2028\u2029]/g,
    character => `\\u${character.charCodeAt(0).toString(16).padStart(4, '0')}`);
  return `<script id="aas-docs-runtime">globalThis.__AAS_DOCS_METADATA__=${json};</script>`;
}

export function applyDocsRuntime(html, metadata) {
  const slots = html.split(DOCS_RUNTIME_SLOT).length - 1;
  const scripts = [...html.matchAll(scriptPattern)].length;
  if (slots + scripts !== 1) throw new Error('Expected exactly one docs runtime metadata slot');
  return slots ? html.replace(DOCS_RUNTIME_SLOT, () => renderDocsRuntime(metadata))
    : html.replace(scriptPattern, () => renderDocsRuntime(metadata));
}

export function docsRuntimePlugin() {
  return {
    name: 'aas-docs-runtime',
    transformIndexHtml(html, context) {
      if (html.split('</head>').length !== 2) throw new Error('Expected one document head');
      const content = context.server ? renderDocsRuntime(getDocsMetadata()) : DOCS_RUNTIME_SLOT;
      return html.replace('</head>', () => `${content}\n</head>`);
    },
  };
}

export function verifyDocsRuntime(dist, metadata) {
  let checked = 0;
  const expected = JSON.stringify(metadata);
  function visit(directory) {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const filename = path.join(directory, entry.name);
      if (entry.isSymbolicLink()) throw new Error('Symlink in web output');
      if (entry.isDirectory()) visit(filename);
      else if (entry.name.endsWith('.html')) {
        const html = fs.readFileSync(filename, 'utf8');
        // Standalone public verification HTML is not a catalog application entry.
        if (filename !== path.join(dist, 'index.html') && !html.includes('aas-docs-runtime') && !/type="module"[^>]*src="[^\"]*assets\//.test(html)) continue;
        const scripts = [...html.matchAll(scriptPattern)];
        if (html.includes(DOCS_RUNTIME_SLOT) || scripts.length !== 1
            || JSON.stringify(JSON.parse(scripts[0][1])) !== expected) {
          throw new Error(`Missing or stale docs runtime metadata: ${path.relative(dist, filename)}`);
        }
        checked += 1;
      }
    }
  }
  visit(dist);
  if (!checked) throw new Error('No catalog runtime metadata verified');
  for (const [slug, current] of Object.entries(metadata)) {
    const html = fs.readFileSync(path.join(dist, 'docs', slug, 'index.html'), 'utf8');
    const articles = [...html.matchAll(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/g)]
      .map(match => JSON.parse(match[1])).flat().filter(entry => [entry['@type']].flat().includes('TechArticle'));
    if (articles.length !== 1 || articles[0].version !== current.commit || articles[0].dateModified !== current.modified) {
      throw new Error(`Missing or stale prerendered guide provenance: ${slug}`);
    }
  }
  return checked;
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const dist = path.join(appRoot, 'dist');
  const metadata = getDocsMetadata();
  if (process.argv[2] === 'verify') {
    console.log(`Verified current-commit docs runtime metadata in ${verifyDocsRuntime(dist, metadata)} pages`);
  } else if (process.argv.length === 2) {
    const filename = path.join(dist, 'index.html');
    fs.writeFileSync(filename, applyDocsRuntime(fs.readFileSync(filename, 'utf8'), metadata));
  } else throw new Error('Usage: node scripts/docs-runtime.js [verify]');
}
