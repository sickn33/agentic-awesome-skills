import type { RawToken } from './tokens.js';

/**
 * Static reader for StyleX token files (`*.stylex.ts`): finds `defineVars`, `defineConsts` and
 * `createTheme` calls and reads the literal values of their object arguments. Nothing is executed;
 * values that are not literals (references, function calls, template expressions) are skipped.
 */

type Literal = string | number;
type Node = Literal | { [key: string]: Node } | undefined;

class Reader {
  i = 0;
  constructor(
    readonly s: string,
    /** Top-level string constants, for computed keys like `[DARK]`. */
    readonly consts: Map<string, string> = new Map(),
  ) {}

  ws(): void {
    for (;;) {
      const c = this.s[this.i];
      if (c === ' ' || c === '\n' || c === '\t' || c === '\r') this.i++;
      else if (c === '/' && this.s[this.i + 1] === '/') {
        const end = this.s.indexOf('\n', this.i);
        this.i = end < 0 ? this.s.length : end + 1;
      } else if (c === '/' && this.s[this.i + 1] === '*') {
        const end = this.s.indexOf('*/', this.i + 2);
        this.i = end < 0 ? this.s.length : end + 2;
      } else return;
    }
  }

  peek(): string | undefined {
    this.ws();
    return this.s[this.i];
  }

  string(): string | undefined {
    const quote = this.s[this.i];
    let out = '';
    this.i++;
    while (this.i < this.s.length) {
      const c = this.s[this.i++];
      if (c === '\\') {
        out += this.s[this.i++] ?? '';
        continue;
      }
      if (quote === '`' && c === '$' && this.s[this.i] === '{') {
        this.skipBalanced('{', '}');
        // keep consuming to the closing backtick, but the value is not a literal
        while (this.i < this.s.length && this.s[this.i] !== '`') this.i++;
        this.i++;
        return undefined;
      }
      if (c === quote) return out;
      out += c;
    }
    return undefined;
  }

  skipBalanced(open: string, close: string): void {
    let depth = 0;
    while (this.i < this.s.length) {
      const c = this.s[this.i];
      if (c === '"' || c === "'" || c === '`') {
        this.string();
        continue;
      }
      this.i++;
      if (c === open) depth++;
      else if (c === close && --depth <= 0) return;
    }
  }

  /** Skips one expression up to a top-level `,` or closing bracket. */
  skipExpression(): void {
    while (this.i < this.s.length) {
      const c = this.peek();
      if (c === undefined || c === ',' || c === '}' || c === ')' || c === ']') return;
      if (c === '{') this.skipBalanced('{', '}');
      else if (c === '(') this.skipBalanced('(', ')');
      else if (c === '[') this.skipBalanced('[', ']');
      else if (c === '"' || c === "'" || c === '`') this.string();
      else this.i++;
    }
  }

  key(): string | undefined {
    const c = this.peek();
    if (c === '"' || c === "'") return this.string();
    if (c === '[') {
      this.i++;
      const inner = this.peek();
      let k: string | undefined;
      if (inner === '"' || inner === "'" || inner === '`') k = this.string();
      else {
        const ident = /^[A-Za-z_$][\w$]*/.exec(this.s.slice(this.i, this.i + 200))?.[0];
        if (ident) {
          k = this.consts.get(ident);
          this.i += ident.length;
        }
      }
      this.skipExpression();
      if (this.peek() === ']') this.i++;
      return k;
    }
    const m = /^[A-Za-z_$][\w$]*|^\d+(?:\.\d+)?/.exec(this.s.slice(this.i, this.i + 200));
    if (!m) return undefined;
    this.i += m[0].length;
    return m[0];
  }

  value(): Node {
    const c = this.peek();
    if (c === '{') return this.object();
    if (c === '"' || c === "'" || c === '`') {
      const start = this.i;
      const str = this.string();
      const after = this.peek();
      if (str !== undefined && (after === ',' || after === '}' || after === ')' || after === undefined)) return str;
      this.i = start;
      this.skipExpression();
      return undefined;
    }
    const m = /^-?\d*\.?\d+(?:e[+-]?\d+)?/i.exec(this.s.slice(this.i, this.i + 40));
    if (m) {
      const start = this.i;
      this.i += m[0].length;
      const after = this.peek();
      if (after === ',' || after === '}' || after === ')' || after === undefined) return Number(m[0]);
      this.i = start;
    }
    this.skipExpression();
    return undefined;
  }

  object(): { [key: string]: Node } {
    const out: { [key: string]: Node } = {};
    this.i++; // {
    while (this.i < this.s.length) {
      const c = this.peek();
      if (c === '}') {
        this.i++;
        return out;
      }
      if (c === ',') {
        this.i++;
        continue;
      }
      if (c === '.' && this.s.startsWith('...', this.i)) {
        this.i += 3;
        this.skipExpression();
        continue;
      }
      const start = this.i;
      const key = this.key();
      if (key === undefined || this.peek() !== ':') {
        // shorthand property or method: no literal value to read
        if (this.i === start) this.i++;
        this.skipExpression();
        continue;
      }
      this.i++; // :
      out[key] = this.value();
    }
    return out;
  }
}

/** Conditional values: `{ default: '#fff', '@media (prefers-color-scheme: dark)': '#000' }`. */
function isConditional(node: { [key: string]: Node }): boolean {
  const keys = Object.keys(node);
  return keys.includes('default') && keys.every((k) => k === 'default' || k.startsWith('@') || k.startsWith(':'));
}

function emit(out: RawToken[], name: string, node: Node, source: string): void {
  if (node === undefined) return;
  if (typeof node === 'string' || typeof node === 'number') {
    out.push({ name, value: String(node), source });
    return;
  }
  if (isConditional(node)) {
    emit(out, name, node.default, source);
    for (const [k, v] of Object.entries(node)) if (k !== 'default') emit(out, `${name}[${k}]`, v, source);
    return;
  }
  for (const [k, v] of Object.entries(node)) emit(out, `${name}.${k}`, v, source);
}

function topLevelObjects(text: string): Map<string, number> {
  const objects = new Map<string, number>();
  for (const m of text.matchAll(/(?:^|[\s;])(?:export\s+)?(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*(?::[^=]+)?=\s*\{/g)) {
    objects.set(m[1], m.index! + m[0].length - 1);
  }
  return objects;
}

function topLevelStrings(text: string): Map<string, string> {
  const strings = new Map<string, string>();
  for (const m of text.matchAll(/(?:^|[\s;])(?:export\s+)?const\s+([A-Za-z_$][\w$]*)\s*(?::[^=]+)?=\s*(['"])((?:(?!\2)[^\\\n]|\\.)*)\2/g)) strings.set(m[1], m[3]);
  return strings;
}

export function parseStylexTokens(text: string, source: string): RawToken[] {
  const out: RawToken[] = [];
  const objects = topLevelObjects(text);
  const consts = topLevelStrings(text);
  const calls = /(?:^|[\s;])(?:export\s+)?(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*(?::[^=]+)?=\s*(?:[A-Za-z_$][\w$]*\.)?(defineVars|defineConsts|createTheme)\s*(?:<[^>]*>)?\s*\(/g;
  for (const m of text.matchAll(calls)) {
    const [, exportName, fn] = m;
    const r = new Reader(text, consts);
    r.i = m.index! + m[0].length;
    if (fn === 'createTheme') {
      r.skipExpression(); // the vars being themed
      if (r.peek() !== ',') continue;
      r.i++;
    }
    let node: Node;
    if (r.peek() === '{') {
      node = r.object();
    } else {
      const ident = /^[A-Za-z_$][\w$]*/.exec(text.slice(r.i, r.i + 200))?.[0];
      const at = ident ? objects.get(ident) : undefined;
      if (at === undefined) continue;
      const ref = new Reader(text, consts);
      ref.i = at;
      node = ref.object();
    }
    emit(out, exportName, node, source);
  }
  return out;
}

/** True for files that look like StyleX token definitions. */
export function isStylexTokenSource(text: string): boolean {
  return /\b(?:defineVars|defineConsts)\s*(?:<[^>]*>)?\s*\(/.test(text);
}
