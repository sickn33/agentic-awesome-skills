/**
 * Minimal glob matcher for repo-relative POSIX paths.
 *
 * Supports `**` (any number of directories), `*`, `?`, `[abc]` / `[!abc]`, `{a,b}` alternation and
 * `\` escapes. A pattern without a `/` matches the basename at any depth (like .gitignore).
 */

const cache = new Map<string, RegExp>();

function escapeRegExp(ch: string): string {
  return /[.*+?^${}()|[\]\\/]/.test(ch) ? `\\${ch}` : ch;
}

function splitTopLevel(input: string, sep: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let current = '';
  for (let i = 0; i < input.length; i++) {
    const ch = input[i];
    if (ch === '\\' && i + 1 < input.length) {
      current += ch + input[i + 1];
      i++;
      continue;
    }
    if (ch === '{') depth++;
    if (ch === '}') depth--;
    if (ch === sep && depth === 0) {
      parts.push(current);
      current = '';
      continue;
    }
    current += ch;
  }
  parts.push(current);
  return parts;
}

function convert(pattern: string): string {
  let re = '';
  let i = 0;
  while (i < pattern.length) {
    const ch = pattern[i];
    if (ch === '*') {
      if (pattern[i + 1] === '*') {
        const atSegmentStart = i === 0 || pattern[i - 1] === '/';
        const next = pattern[i + 2];
        if (atSegmentStart && next === '/') {
          re += '(?:[^/]*/)*';
          i += 3;
          continue;
        }
        if (atSegmentStart && next === undefined) {
          re += '.*';
          i += 2;
          continue;
        }
        re += '[^/]*';
        i += 2;
        continue;
      }
      re += '[^/]*';
      i++;
      continue;
    }
    if (ch === '?') {
      re += '[^/]';
      i++;
      continue;
    }
    if (ch === '[') {
      const end = pattern.indexOf(']', i + 2);
      if (end === -1) {
        re += '\\[';
        i++;
        continue;
      }
      let body = pattern.slice(i + 1, end);
      const negate = body.startsWith('!') || body.startsWith('^');
      if (negate) body = body.slice(1);
      body = body.replace(/\\/g, '\\\\').replace(/\//g, '');
      re += negate ? `[^/${body}]` : `[${body}]`;
      i = end + 1;
      continue;
    }
    if (ch === '{') {
      let depth = 0;
      let j = i;
      for (; j < pattern.length; j++) {
        if (pattern[j] === '\\') {
          j++;
          continue;
        }
        if (pattern[j] === '{') depth++;
        else if (pattern[j] === '}') {
          depth--;
          if (depth === 0) break;
        }
      }
      if (j >= pattern.length) {
        re += '\\{';
        i++;
        continue;
      }
      const alternatives = splitTopLevel(pattern.slice(i + 1, j), ',');
      re += `(?:${alternatives.map(convert).join('|')})`;
      i = j + 1;
      continue;
    }
    if (ch === '\\' && i + 1 < pattern.length) {
      re += escapeRegExp(pattern[i + 1]);
      i += 2;
      continue;
    }
    re += escapeRegExp(ch);
    i++;
  }
  return re;
}

export function normalizePattern(pattern: string): string {
  let p = pattern.trim();
  if (p.startsWith('./')) p = p.slice(2);
  if (p.startsWith('/')) return p.slice(1);
  if (!p.includes('/')) return `**/${p}`;
  return p;
}

export function globToRegExp(pattern: string): RegExp {
  const normalized = normalizePattern(pattern);
  let re = cache.get(normalized);
  if (!re) {
    re = new RegExp(`^${convert(normalized)}$`);
    cache.set(normalized, re);
  }
  return re;
}

export function matchGlob(filePath: string, pattern: string): boolean {
  return globToRegExp(pattern).test(filePath.replace(/^\.\//, ''));
}

/**
 * True when `filePath` matches the pattern list. Patterns starting with `!` exclude; later patterns
 * win, so `["src/**", "!src/**\/*.test.ts"]` matches src files except tests.
 */
export function matchAny(filePath: string, patterns: readonly string[]): boolean {
  let matched = false;
  for (const raw of patterns) {
    if (raw.startsWith('!')) {
      if (matched && matchGlob(filePath, raw.slice(1))) matched = false;
    } else if (!matched && matchGlob(filePath, raw)) {
      matched = true;
    }
  }
  return matched;
}

/** Returns the first non-negated pattern that matches, for "why was this picked" explanations. */
export function firstMatch(filePath: string, patterns: readonly string[]): string | undefined {
  if (!matchAny(filePath, patterns)) return undefined;
  return patterns.find((p) => !p.startsWith('!') && matchGlob(filePath, p));
}
