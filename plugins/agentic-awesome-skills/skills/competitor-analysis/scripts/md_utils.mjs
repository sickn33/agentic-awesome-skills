import { lstatSync, existsSync } from 'node:fs';
import { resolve, parse, join, relative, isAbsolute } from 'node:path';

// Shared markdown parsing helpers for competitor-analysis scripts.
// Used by compile_report.mjs, merge_partials.mjs, and capture_screenshots.mjs.

// Parses YAML-ish frontmatter delimited by `---` lines.
// Returns an object of fields, or null if no frontmatter delimiter is found.
export function parseFrontmatter(content) {
  content = content.replace(/\r\n/g, '\n'); // tolerate CRLF — anchors below assume LF
  const m = content.match(/^---\n([\s\S]*?)\n---/);
  if (!m) return null;
  const fields = Object.create(null);
  for (const line of m[1].split('\n')) {
    const idx = line.indexOf(':');
    if (idx > 0) {
      const k = line.slice(0, idx).trim();
      let v = line.slice(idx + 1).trim();
      if (!/^[a-z][a-z0-9_]*$/i.test(k) || ['__proto__', 'constructor', 'prototype'].includes(k) || Object.hasOwn(fields, k)) throw new Error('Invalid or duplicate metadata field');
      if (v.startsWith('"')) { v = JSON.parse(v); if (typeof v !== 'string') throw new Error('Metadata must be strings'); }
      else if (v.startsWith("'")) { if (!v.endsWith("'")) throw new Error('Unclosed string'); v = v.slice(1,-1).replace(/''/g, "'"); }
      else if (/^[|>&*!\[{]/.test(v)) throw new Error('Only flat, single-line string metadata is supported');
      if (k && v) fields[k] = v;
    }
  }
  return fields;
}

// Returns the body text after the closing `---` of the frontmatter, trimmed.
// If no frontmatter is present, returns the full content trimmed — so callers
// that don't gate on parseFrontmatter still get usable text.
export function parseBody(content) {
  content = content.replace(/\r\n/g, '\n'); // tolerate CRLF — anchors below assume LF
  const m = content.match(/^---\n[\s\S]*?\n---\n([\s\S]*)/);
  return m ? m[1].trim() : content.trim();
}

// Splits a markdown body into sections keyed by `## Heading` line.
// Content before the first `## ` is dropped (matches existing behavior).
export function parseSections(body) {
  const sections = Object.create(null);
  const lines = body.replace(/\r\n/g, '\n').split('\n');
  let currentKey = null;
  let buffer = [];
  let fence = null;
  for (const line of lines) {
    const marker = line.match(/^\s*(`{3,}|~{3,})/);
    if (marker) { if (!fence) fence = marker[1][0]; else if (fence === marker[1][0]) fence = null; }
    const m = !fence && !marker ? line.match(/^## (.+)$/) : null;
    if (m) {
      if (currentKey !== null) sections[currentKey] = [sections[currentKey], buffer.join('\n').trim()].filter(Boolean).join('\n\n');
      currentKey = m[1].trim();
      buffer = [];
    } else if (currentKey !== null) {
      buffer.push(line);
    }
  }
  if (currentKey !== null) sections[currentKey] = [sections[currentKey], buffer.join('\n').trim()].filter(Boolean).join('\n\n');
  return sections;
}

// Explicit local research paths may be absolute. Reject traversal and symlink components,
// including output leaves; callers operate only inside the selected private run directory.
export function checkedPath(value, base = process.cwd()) {
  if (typeof value !== 'string' || !value || /[\x00-\x1f]/.test(value) || value.split(/[\\/]/).includes('..')) throw new Error('Unsafe research path');
  const target = resolve(base, value);
  let cursor = parse(target).root;
  for (const part of target.slice(cursor.length).split('/').filter(Boolean)) {
    cursor = join(cursor, part);
    if (existsSync(cursor)) { if (lstatSync(cursor).isSymbolicLink()) throw new Error('Symlink research path refused'); }
    else { try { if (lstatSync(cursor).isSymbolicLink()) throw new Error('Symlink research path refused'); } catch (e) { if (e.code !== 'ENOENT') throw e; } }
  }
  return target;
}
export function insidePath(base, ...parts) {
  if (parts.some(p => typeof p !== 'string' || isAbsolute(p))) throw new Error('Relative child path required');
  const root = checkedPath(base), target = checkedPath(parts.join('/'), root), rel = relative(root,target);
  if (rel === '..' || rel.startsWith('../') || isAbsolute(rel)) throw new Error('Path escapes research directory');
  return target;
}
export function publicURL(value) {
  const u = new URL(value);
  const host = u.hostname.toLowerCase();
  // Public DNS names only. The provider must additionally reject private DNS answers
  // and redirects; this lexical filter alone is not a complete SSRF defense.
  if (!['http:', 'https:'].includes(u.protocol) || u.username || u.password || !host.includes('.') || /[:\[\]]/.test(host) || /^[\d.]+$/.test(host) || /\.(localhost|local|internal|test|invalid)$/.test(host)) throw new Error('Public HTTP(S) URL required');
  return u.href;
}
