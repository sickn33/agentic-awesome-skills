#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const functions = new Set([
  'get_field', 'the_field', 'get_sub_field', 'have_rows',
  'get_row_layout', 'acf_register_block_type',
]);
const fieldReaders = new Set(['get_field', 'the_field', 'get_sub_field', 'have_rows']);
const ignored = new Set(['node_modules', 'vendor', '.git']);
const usage = 'Usage: node scan-acf.mjs [theme-dir | file.php] [--json]';

// Keep PHP delimiters, names and arguments intact without executing the theme.
function tokenize(source) {
  const openingTag = /<\?(?:php(?=\s|$)|=)/gi;
  const lexeme = /\s+|\/\*[\s\S]*?(?:\*\/|$)|(?:\/\/|#(?!\[))(?:(?!\?>)[^\r\n])*|\?>|<<<[ \t]*(?:'(\w+)'|"(\w+)"|(\w+))[ \t]*\r?\n|'(?:\\[\s\S]|[^'\\])*'|"(?:\\[\s\S]|[^"\\])*"|`(?:\\[\s\S]|[^`\\])*`|\\?[a-zA-Z_\x80-\uffff][\w\x80-\uffff]*(?:\\[a-zA-Z_\x80-\uffff][\w\x80-\uffff]*)*|\?->|->|::|\.\.\.|[\s\S]/y;
  const tokens = [];
  let offset = 0;
  let line = 1;
  let inPhp = false;
  while (offset < source.length) {
    let value;
    let keep = false;
    if (!inPhp) {
      openingTag.lastIndex = offset;
      const open = openingTag.exec(source);
      if (!open) break;
      value = source.slice(offset, openingTag.lastIndex);
      inPhp = true;
    } else {
      lexeme.lastIndex = offset;
      const match = lexeme.exec(source);
      value = match[0];
      if (value === '?>') {
        inPhp = false;
      } else if (value.startsWith('<<<')) {
        const label = match[1] ?? match[2] ?? match[3];
        const closing = new RegExp('^[ \\t]*' + label + '(?![\\w\\x80-\\uffff])', 'gm');
        closing.lastIndex = lexeme.lastIndex;
        const end = closing.exec(source);
        value = source.slice(offset, end ? closing.lastIndex : source.length);
        keep = true;
      } else {
        keep = !/^(?:\s|\/\/|\/\*|#(?!\[))/.test(value);
      }
    }
    if (keep) tokens.push({ value, line });
    line += value.split('\n').length - 1;
    offset += value.length;
  }
  return tokens;
}

function fieldName(tokens, index) {
  // A quoted prefix in get_field('hero_' . $suffix) is not a field name.
  if (tokens[index]?.value.toLowerCase() === 'selector' && tokens[index + 1]?.value === ':') {
    index += 2;
  }
  const literal = tokens[index]?.value ?? '';
  if (![',', ')'].includes(tokens[index + 1]?.value)) return null;
  if (/^'[^'\\]*'$/.test(literal) || /^"[^"$\\]*"$/.test(literal)) return literal.slice(1, -1);
  return null;
}

function inspectFile(file, base) {
  const tokens = tokenize(fs.readFileSync(file, 'utf8'));
  const calls = [];
  const fields = new Map();
  for (let i = 0; i < tokens.length; i++) {
    const { value, line } = tokens[i];
    const name = value.replace(/^\\/, '').toLowerCase();
    if (!functions.has(name) || tokens[i + 1]?.value !== '(') continue;
    const prev = tokens[i - 1]?.value.toLowerCase();
    const before = tokens[i - 2]?.value.toLowerCase();
    if (['->', '?->', '::', '$', 'function', 'new'].includes(prev)) continue;
    if (prev === '&' && before === 'function') continue;
    if (tokens[i + 2]?.value === '...' && tokens[i + 3]?.value === ')') continue;
    const field = fieldReaders.has(name) ? fieldName(tokens, i + 2) : null;
    calls.push({ function: name, field, line });
    if (field !== null) fields.set(field, (fields.get(field) ?? 0) + 1);
  }
  const has = (name) => calls.some((call) => call.function === name);
  let complexity = 'Simple';
  if (has('have_rows') || has('get_sub_field')) complexity = 'Moderate (Repeater)';
  if (has('get_row_layout')) complexity = 'Complex (Flexible Content)';
  return { file: path.relative(base, file).split(path.sep).join('/'), complexity,
    fields: Object.fromEntries(fields), calls };
}

function* phpFiles(directory) {
  const names = fs.readdirSync(directory).sort();
  for (const name of names) {
    const file = path.join(directory, name);
    const stat = fs.lstatSync(file);
    if (stat.isDirectory() && !ignored.has(name)) yield* phpFiles(file);
    if (stat.isFile() && /\.php$/i.test(name)) yield file;
  }
}

function report(args) {
  if (args.includes('--help') || args.includes('-h')) return console.log(usage);
  const paths = args.filter((arg) => arg !== '--json');
  if (paths.length > 1 || paths.some((arg) => arg.startsWith('-'))) throw new Error(usage);
  const target = path.resolve(paths[0] ?? '.');
  const stat = fs.statSync(target);
  if (!stat.isDirectory() && !(stat.isFile() && /\.php$/i.test(target))) {
    throw new Error('Expected a theme directory or a PHP file.');
  }
  const base = stat.isDirectory() ? target : path.dirname(target);
  const candidates = stat.isDirectory() ? phpFiles(target) : [target];
  const files = [];
  let scanned = 0;
  let callCount = 0;
  for (const file of candidates) {
    scanned++;
    const result = inspectFile(file, base);
    if (result.calls.length) {
      files.push(result);
      callCount += result.calls.length;
    }
  }
  if (args.includes('--json')) {
    console.log(JSON.stringify({ scanned, matched: files.length, callCount, files }, null, 2));
    return;
  }
  console.log(`PHP files: ${scanned} | Matched: ${files.length} | ACF calls: ${callCount}`);
  if (files.length) console.table(files.map(({ file, complexity, fields, calls }) => ({
    File: file, Complexity: complexity, Calls: calls.length,
    Fields: Object.entries(fields).map(([name, count]) => `${name} ×${count}`).join(', ') || '—',
  })));
}

try {
  report(process.argv.slice(2));
} catch (error) {
  console.error(`scan-acf: ${error.message}`);
  process.exitCode = 1;
}
