/**
 * File-system routing conventions: maps a path (relative to the app directory) to the route it
 * renders, or marks it as a layout / app-wide file.
 */

export interface ConventionHit {
  kind: 'page' | 'layout' | 'global';
  framework: string;
  /** Route for pages, or the route prefix a layout applies to. */
  route: string;
  dynamic: boolean;
}

const SCRIPT_EXT = '(?:jsx?|tsx?|mjs|cjs|mdx?)';

function joinRoute(segments: string[]): string {
  const clean = segments.filter((s) => s && s !== 'index');
  return `/${clean.join('/')}`;
}

function isDynamic(segments: string[]): boolean {
  return segments.some((s) => /^\[.*\]$/.test(s) || s.startsWith('$') || s.includes('['));
}

function stripGroups(segments: string[]): string[] {
  return segments.filter((s) => !/^\(.*\)$/.test(s) && !s.startsWith('@'));
}

export function inferFromPath(appRel: string): ConventionHit | undefined {
  const p = appRel.replace(/\\/g, '/');
  let m: RegExpExecArray | null;

  // Next.js app router
  m = new RegExp(`^(?:src/)?app/(?:(.*)/)?(page|layout|template)\\.${SCRIPT_EXT}$`).exec(p);
  if (m && !p.startsWith('app/routes/')) {
    const segments = stripGroups((m[1] ?? '').split('/').filter(Boolean));
    if (segments.some((s) => s.startsWith('_'))) return undefined;
    const route = joinRoute(segments);
    return { kind: m[2] === 'page' ? 'page' : 'layout', framework: 'next-app', route, dynamic: isDynamic(segments) };
  }
  if (/^(?:src\/)?app\/globals?\.(?:css|scss|sass|less)$/.test(p)) {
    return { kind: 'global', framework: 'next-app', route: '/', dynamic: false };
  }

  // Next.js pages router
  m = new RegExp(`^(?:src/)?pages/(.+)\\.${SCRIPT_EXT}$`).exec(p);
  if (m) {
    const rest = m[1];
    if (rest.startsWith('api/')) return undefined;
    if (/^_(app|document)$/.test(rest)) return { kind: 'global', framework: 'next-pages', route: '/', dynamic: false };
    if (rest.startsWith('_')) return undefined;
    const segments = rest.split('/');
    return { kind: 'page', framework: 'next-pages', route: joinRoute(segments), dynamic: isDynamic(segments) };
  }

  // SvelteKit
  m = /^src\/routes\/(?:(.*)\/)?\+(page|layout)(?:@[^.]*)?(?:\.server)?\.(?:svelte|ts|js)$/.exec(p);
  if (m) {
    const segments = stripGroups((m[1] ?? '').split('/').filter(Boolean));
    return { kind: m[2] === 'page' ? 'page' : 'layout', framework: 'sveltekit', route: joinRoute(segments), dynamic: isDynamic(segments) };
  }
  if (/^src\/app\.(?:html|css|pcss|scss)$/.test(p)) return { kind: 'global', framework: 'sveltekit', route: '/', dynamic: false };

  // TanStack Router / Start file routes (src/routes, directories and flat dot notation)
  m = /^src\/routes\/(.+)\.(?:tsx|jsx|ts|js)$/.exec(p);
  if (m) {
    const raw = m[1].replace(/\.lazy$/, '');
    const parts = raw.split('/');
    // "-" prefixed files and folders are excluded from routing; "+" files belong to SvelteKit.
    if (parts.some((s) => s.startsWith('-') || s.startsWith('+')) || /\.(?:test|spec)$/.test(raw)) return undefined;
    if (raw === '__root') return { kind: 'global', framework: 'tanstack-router', route: '/', dynamic: false };
    const tokens = parts.flatMap((s) => s.split('.'));
    const last = tokens[tokens.length - 1];
    let kind: ConventionHit['kind'] = 'page';
    if (last === 'route' || (last.startsWith('_') && last !== '_')) {
      // route.tsx configures its folder; _layout.tsx is a pathless layout around its siblings.
      kind = 'layout';
      tokens.pop();
    }
    const segments = tokens.filter((t) => t && !t.startsWith('_') && !/^\(.*\)$/.test(t)).map((t) => t.replace(/_$/, ''));
    return { kind, framework: 'tanstack-router', route: joinRoute(segments), dynamic: segments.some((s) => s.startsWith('$')) };
  }

  // Nuxt / Vue file routing
  m = /^(?:app\/)?pages\/(.+)\.vue$/.exec(p);
  if (m) {
    const segments = m[1].split('/');
    return { kind: 'page', framework: 'nuxt', route: joinRoute(segments), dynamic: isDynamic(segments) };
  }
  if (/^(?:app\/)?layouts\/.+\.vue$/.test(p)) return { kind: 'layout', framework: 'nuxt', route: '/', dynamic: false };
  if (/^(?:app\/)?(?:app|error)\.vue$/.test(p)) return { kind: 'global', framework: 'nuxt', route: '/', dynamic: false };

  // Astro
  m = /^src\/pages\/(.+)\.(?:astro|md|mdx|html)$/.exec(p);
  if (m) {
    const segments = m[1].split('/');
    return { kind: 'page', framework: 'astro', route: joinRoute(segments), dynamic: isDynamic(segments) };
  }
  if (/^src\/layouts\/.+\.astro$/.test(p)) return { kind: 'layout', framework: 'astro', route: '/', dynamic: false };

  // Remix / React Router flat routes
  m = new RegExp(`^app/routes/(.+?)(?:/route)?\\.${SCRIPT_EXT}$`).exec(p);
  if (m) {
    const segments = m[1]
      .split('.')
      .filter((s) => !(s.startsWith('_') && s !== '_index'))
      .map((s) => s.replace(/_$/, ''))
      .map((s) => (s === '_index' ? '' : s));
    const dynamic = segments.some((s) => s.startsWith('$'));
    return { kind: 'page', framework: 'remix', route: joinRoute(segments), dynamic };
  }
  if (new RegExp(`^app/root\\.${SCRIPT_EXT}$`).test(p)) return { kind: 'global', framework: 'remix', route: '/', dynamic: false };

  // Plain HTML
  m = /^(?:public\/)?(.+)\.html?$/.exec(p);
  if (m && !/(^|\/)(node_modules|dist|build|out)\//.test(p)) {
    const file = m[1];
    if (file === 'index') return { kind: 'page', framework: 'static', route: '/', dynamic: false };
    if (file.endsWith('/index')) return { kind: 'page', framework: 'static', route: `/${file.slice(0, -'index'.length)}`, dynamic: false };
    return { kind: 'page', framework: 'static', route: `/${p.replace(/^public\//, '')}`, dynamic: false };
  }

  return undefined;
}

/** True when `route` lives under the layout prefix `scope`. */
export function routeUnder(route: string, scope: string): boolean {
  if (scope === '/' || scope === '') return true;
  const prefix = scope.endsWith('/') ? scope : `${scope}/`;
  return route === scope || route.startsWith(prefix);
}
