import path from 'node:path';

/** A dependency whose declared range or resolved version differs between base and head. */
export interface DependencyChange {
  name: string;
  /** Range (package.json) or resolved version(s) (lockfile) on base; absent when added. */
  from?: string;
  /** Same on head; absent when removed. */
  to?: string;
  /** Repo-relative file it was read from. */
  file: string;
  /** Matches detect.uiPackages, so it may change what pages look like. */
  ui: boolean;
}

export interface DependencyDiff {
  changes: DependencyChange[];
  /** Changed lockfiles whose packages could not be read (bun.lockb is binary). */
  unparsed: string[];
}

/** Packages that commonly change rendering: frameworks, CSS tooling, component, icon, font and animation libraries. */
export const DEFAULT_UI_PACKAGES = [
  'react',
  'react-dom',
  'next',
  'vue',
  'nuxt',
  'svelte',
  '@sveltejs/*',
  'astro',
  '@astrojs/*',
  'solid-js',
  'preact',
  '@angular/*',
  '@remix-run/*',
  'react-router',
  'react-router-dom',
  '@tanstack/react-router',
  'tailwindcss',
  '@tailwindcss/*',
  'postcss',
  'postcss-*',
  'autoprefixer',
  'lightningcss',
  'sass',
  'less',
  'styled-components',
  '@emotion/*',
  '@stylexjs/*',
  '@vanilla-extract/*',
  '@pandacss/*',
  'class-variance-authority',
  'tailwind-merge',
  '@radix-ui/*',
  '@headlessui/*',
  '@mui/*',
  '@chakra-ui/*',
  '@mantine/*',
  'antd',
  '@ant-design/*',
  'bootstrap',
  'daisyui',
  'lucide-react',
  '@heroicons/*',
  '@fortawesome/*',
  'framer-motion',
  'motion',
  '@fontsource/*',
  '@fontsource-variable/*',
];

const MANIFEST = 'package.json';
const LOCKFILES = new Set(['package-lock.json', 'npm-shrinkwrap.json', 'pnpm-lock.yaml', 'yarn.lock', 'bun.lock', 'bun.lockb']);

export function isDependencyFile(file: string): boolean {
  const base = path.posix.basename(file);
  return base === MANIFEST || LOCKFILES.has(base);
}

function patternRegex(pattern: string): RegExp {
  return new RegExp(`^${pattern.split('*').map((p) => p.replace(/[.+?^${}()|[\]\\/]/g, '\\$&')).join('.*')}$`);
}

export function isUiPackage(name: string, patterns: string[]): boolean {
  return patterns.some((p) => patternRegex(p).test(name));
}

/** Declared ranges of every dependency kind in a package.json. */
export function manifestDependencies(text: string): Map<string, string> {
  const out = new Map<string, string>();
  let pkg: Record<string, unknown>;
  try {
    pkg = JSON.parse(text) as Record<string, unknown>;
  } catch {
    return out;
  }
  for (const field of ['dependencies', 'devDependencies', 'peerDependencies', 'optionalDependencies']) {
    const deps = pkg[field];
    if (deps && typeof deps === 'object') for (const [name, range] of Object.entries(deps as Record<string, unknown>)) if (typeof range === 'string') out.set(name, range);
  }
  return out;
}

function add(map: Map<string, Set<string>>, name: string, version: string): void {
  if (!name || !version) return;
  let set = map.get(name);
  if (!set) map.set(name, (set = new Set()));
  set.add(version);
}

/** name@version entries such as "react@18.3.1" or "@scope/pkg@1.2.3" (pnpm keys, bun.lock). */
const NAME_AT_VERSION = /(?:^|[\s"'/(])(@[a-z0-9][\w.-]*\/[\w.-]+|[a-z0-9][\w.-]*)@(\d[\w.+-]*)/gim;

/** Resolved versions per package in a lockfile, or undefined when the format cannot be read. */
export function lockfileVersions(file: string, text: string): Map<string, Set<string>> | undefined {
  const base = path.posix.basename(file);
  const out = new Map<string, Set<string>>();
  if (base === 'bun.lockb') return undefined;
  if (base === 'package-lock.json' || base === 'npm-shrinkwrap.json') {
    let lock: { packages?: Record<string, { version?: string }>; dependencies?: Record<string, { version?: string }> };
    try {
      lock = JSON.parse(text);
    } catch {
      return undefined;
    }
    for (const [key, entry] of Object.entries(lock.packages ?? {})) {
      const at = key.lastIndexOf('node_modules/');
      if (at >= 0 && entry.version) add(out, key.slice(at + 'node_modules/'.length), entry.version);
    }
    if (!lock.packages) for (const [name, entry] of Object.entries(lock.dependencies ?? {})) if (entry.version) add(out, name, entry.version);
    return out;
  }
  if (base === 'yarn.lock') {
    // Blocks start with an unindented header listing "name@range" entries; the version follows indented.
    let names: string[] = [];
    for (const line of text.split('\n')) {
      if (/^\S.*:\s*$/.test(line) && !line.startsWith('#') && !line.startsWith('__metadata')) {
        names = line
          .replace(/:\s*$/, '')
          .split(',')
          .map((entry) => entry.trim().replace(/^"|"$/g, ''))
          .map((entry) => entry.slice(0, entry.indexOf('@', 1)))
          .filter(Boolean);
        continue;
      }
      const version = /^\s+version:?\s+"?([^"\s]+)"?/.exec(line)?.[1];
      if (version) for (const name of names) add(out, name, version);
    }
    return out;
  }
  for (const m of text.matchAll(NAME_AT_VERSION)) add(out, m[1], m[2]);
  return out;
}

function versions(set: Set<string> | undefined): string | undefined {
  return set && set.size ? [...set].sort().join(', ') : undefined;
}

/**
 * Dependency changes in the given files: ranges from package.json, resolved versions from
 * lockfiles. A package seen in both keeps the lockfile's versions (what is actually installed).
 */
export function diffDependencies(files: Array<{ file: string; base?: string; head?: string }>, uiPackages: string[]): DependencyDiff {
  const byName = new Map<string, DependencyChange>();
  const unparsed: string[] = [];
  const record = (change: Omit<DependencyChange, 'ui'>, fromLockfile: boolean) => {
    const existing = byName.get(change.name);
    if (existing && !fromLockfile) return;
    byName.set(change.name, { ...change, ui: isUiPackage(change.name, uiPackages) });
  };
  const ordered = [...files].sort((a, b) => Number(path.posix.basename(a.file) !== MANIFEST) - Number(path.posix.basename(b.file) !== MANIFEST));
  for (const { file, base = '', head = '' } of ordered) {
    if (path.posix.basename(file) === MANIFEST) {
      const [b, h] = [manifestDependencies(base), manifestDependencies(head)];
      for (const name of new Set([...b.keys(), ...h.keys()])) if (b.get(name) !== h.get(name)) record({ name, from: b.get(name), to: h.get(name), file }, false);
      continue;
    }
    const [b, h] = [lockfileVersions(file, base), lockfileVersions(file, head)];
    if (!b || !h) {
      unparsed.push(file);
      continue;
    }
    for (const name of new Set([...b.keys(), ...h.keys()])) {
      const [from, to] = [versions(b.get(name)), versions(h.get(name))];
      if (from !== to) record({ name, from, to, file }, true);
    }
  }
  const changes = [...byName.values()].sort((a, b) => Number(b.ui) - Number(a.ui) || a.name.localeCompare(b.name));
  return { changes, unparsed };
}

export function describeDependency(c: DependencyChange): string {
  if (c.from === undefined) return `${c.name} added (${c.to})`;
  if (c.to === undefined) return `${c.name} removed (was ${c.from})`;
  return `${c.name} ${c.from} → ${c.to}`;
}
