#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const extensions = new Set(['.html', '.jsx', '.tsx', '.vue', '.astro', '.php']);
const ignored = new Set(['node_modules', '.git', '.next', 'dist']);
const voidTags = new Set('area base br col embed hr img input link meta param source track wbr'.split(' '));
const tracker = /(?:^|\.)(?:googletagmanager\.com|google-analytics\.com|analytics\.google\.com|connect\.facebook\.net|hotjar\.(?:com|io)|clarity\.ms)$/i;
const media = /(?:^|\.)(?:youtube(?:-nocookie)?\.com|vimeo\.com)$/i;
const nameKeys = ['aria-label', 'aria-labelledby', 'title'];
const inertType = /^(?:text\/plain|application\/(?:ld\+)?json|text\/(?:template|x-template))(?:\s*;.*)?$/i;
const counts = { BLOCKER: 0, HIGH: 0, MEDIUM: 0 };
let scanned = 0;
let clean = 0;

// Keep quoted '>' and JSX arrow functions inside their attribute.
function fieldEnd(source, start) {
  const first = source[start];
  const expression = first === '{';
  let depth = 1;
  let quote = expression ? '' : first;
  for (let i = start + 1; i < source.length; i++) {
    const c = source[i];
    if (quote) {
      if (expression && c === '\\') i++;
      else if (c === quote) {
        if (!expression) return i + 1;
        quote = '';
      }
    } else if ('"\'\x60'.includes(c)) quote = c;
    else if (c === '{') depth++;
    else if (c === '}' && --depth === 0) return i + 1;
  }
  return source.length;
}

function readTag(source, start) {
  const attr = /\s*([^\s"'<>/={}]+)\s*(=\s*)?/y;
  const attrs = new Map();
  let i = start;
  while (i < source.length) {
    attr.lastIndex = i;
    const match = attr.exec(source);
    if (!match) {
      if (source[i] === '>') break;
      if (source[i] === '<') return null;
      i = source[i] === '{' ? fieldEnd(source, i) : i + 1;
      continue;
    }
    i = attr.lastIndex;
    let value = '';
    if (match[2]) {
      if (/^["'{]$/.test(source[i])) {
        const end = fieldEnd(source, i);
        value = source.slice(i + 1, end - 1).trim();
        i = end;
      } else {
        const raw = /^[^\s>]+/.exec(source.slice(i));
        value = raw?.[0] ?? '';
        i += value.length;
      }
    }
    const key = match[1].toLowerCase().replace(/^(?:v-bind:|:)/, '');
    attrs.set(key, value.replace(/^(['"])([\s\S]*)\1$/, '$2'));
  }
  return i < source.length ? { attrs, end: i + 1, selfClosing: source[i - 1] === '/' } : null;
}

function urlOf(value) {
  if (!value || !/^(?:https?:)?\/\//i.test(value)) return null;
  try { return new URL(value, 'https://example.invalid'); }
  catch { return null; }
}

function inlineTracker(body) {
  // Match common bootstrap snippets. The vendor URL can be passed to an IIFE
  // separately from the assignment to script.src inside its body.
  if (!/\.src\s*=|\bimport\s*\(/.test(body)) return false;
  const urls = body.match(/(?:https?:)?\/\/[a-z0-9.-]+/gi) ?? [];
  return urls.some(url => tracker.test(urlOf(url)?.hostname ?? ''));
}

function scanFile(file, display) {
  const source = fs.readFileSync(file, 'utf8').replace(/\r\n?/g, '\n');
  const tokens = /<!--[\s\S]*?(?:-->|$)|\{\/\*[\s\S]*?\*\/\}|<(\/?)([a-z][\w.:-]*)(?=[\s/>])/gi;
  const stack = [];
  const findings = [];
  let cursor = 0;
  let match;
  function report(offset, code, message) {
    findings.push({ offset, code, message });
    counts[code.split('-')[1]]++;
  }
  function close() {
    const node = stack.pop();
    if (node.control && !node.named) {
      report(node.offset, 'EAA-BLOCKER', `Give <${node.tag}> an accessible name.`);
    }
    if (!node.hidden && node.named && stack.length) stack.at(-1).named = true;
  }
  while ((match = tokens.exec(source))) {
    const parent = stack.at(-1);
    if (parent && source.slice(cursor, match.index).replace(/&nbsp;|&#160;/gi, ' ').trim()) parent.named = true;
    cursor = tokens.lastIndex;
    if (!match[2]) continue;
    const tag = match[2].toLowerCase();
    const parsed = readTag(source, cursor);
    if (!parsed) continue;
    const { attrs, end, selfClosing } = parsed;
    cursor = tokens.lastIndex = end;
    if (match[1]) {
      let pos = stack.length - 1;
      while (pos >= 0 && stack[pos].tag !== tag) pos--;
      if (pos >= 0) while (stack.length > pos) close();
      continue;
    }

    const offset = match.index;
    const src = urlOf(attrs.get('src'));
    const href = urlOf(attrs.get('href'));
    const runnable = !inertType.test(attrs.get('type') ?? '');
    if (tag === 'script' && runnable && src && tracker.test(src.hostname)) {
      report(offset, 'GDPR-BLOCKER', 'Gate the tracking script before it can load.');
    }
    if (tag === 'iframe' && src && (media.test(src.hostname) ||
        (/(?:^|\.)google\.com$/.test(src.hostname) && /^\/maps(?:[/?]|$)/i.test(src.pathname)))) {
      report(offset, 'GDPR-HIGH', 'Replace the live embed with a consent facade.');
    }
    if (tag === 'link' && href?.hostname === 'fonts.googleapis.com') {
      report(offset, 'GDPR-HIGH', 'Self-host the font stylesheet and font files.');
    }
    if (tag === 'img' && !attrs.has('alt')) report(offset, 'EAA-BLOCKER', 'Add an alt attribute to <img>.');
    if (tag === 'input' && attrs.get('type')?.toLowerCase() !== 'hidden' &&
        !['id', 'aria-label', 'aria-labelledby'].some(key => attrs.get(key))) {
      report(offset, 'EAA-BLOCKER', 'Associate the input with a label.');
    }
    if (['div', 'span'].includes(tag) && ['onclick', '@click', 'v-on:click'].some(key => attrs.has(key)) &&
        !attrs.get('role') && !attrs.has('tabindex')) {
      report(offset, 'EAA-MEDIUM', 'Use a native keyboard-operable control.');
    }
    const node = {
      tag, offset, control: tag === 'button' || tag === 'a',
      hidden: attrs.has('hidden') || attrs.get('aria-hidden') === 'true',
      named: nameKeys.some(key => attrs.get(key)) || (tag === 'img' && Boolean(attrs.get('alt')))
    };
    stack.push(node);
    if (voidTags.has(tag) || selfClosing) close();
    else if (['script', 'style', 'textarea'].includes(tag)) {
      const closingTag = new RegExp('</' + tag + '\\s*>', 'ig');
      closingTag.lastIndex = end;
      const found = closingTag.exec(source);
      if (tag === 'script' && runnable && !attrs.has('src') &&
          inlineTracker(source.slice(end, found?.index ?? source.length))) {
        report(offset, 'GDPR-BLOCKER', 'Gate the inline tracking bootstrap.');
      }
      cursor = tokens.lastIndex = found ? closingTag.lastIndex : source.length;
      close();
    }
  }
  while (stack.length) close();
  scanned++;
  if (!findings.length) clean++;
  let line = 1;
  let nextBreak = source.indexOf('\n');
  for (const { offset, code, message } of findings.sort((a, b) => a.offset - b.offset)) {
    while (nextBreak !== -1 && nextBreak < offset) {
      line++;
      nextBreak = source.indexOf('\n', nextBreak + 1);
    }
    console.log(`${display}:${line} [${code}] ${message}`);
  }
}

function walk(root, dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name, 'en'));
  for (const entry of entries) {
    const file = path.join(dir, entry.name);
    if (entry.isDirectory() && !ignored.has(entry.name)) walk(root, file);
    if (entry.isFile() && extensions.has(path.extname(file).toLowerCase())) scanFile(file, path.relative(root, file));
  }
}

try {
  if (process.argv.length > 3) throw new Error('Usage: node audit-compliance.mjs [target-dir]');
  const root = path.resolve(process.argv[2] ?? '.');
  walk(root, root);
  const score = scanned ? `${Math.round(100 * clean / scanned)}% (${clean}/${scanned} files without findings)` : 'N/A (no supported files)';
  console.log(`Scanned: ${scanned} | Blocker: ${counts.BLOCKER} | High: ${counts.HIGH} | Medium: ${counts.MEDIUM}\nStatic score: ${score}`);
  process.exitCode = counts.BLOCKER ? 1 : 0;
} catch (error) {
  console.error(`Audit incomplete: ${error.message}`);
  process.exitCode = 2;
}
