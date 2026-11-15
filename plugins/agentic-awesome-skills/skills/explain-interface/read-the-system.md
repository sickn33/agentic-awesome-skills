# Reading the whole system

Use this where no specific effect was named and the question is how the interface is built in general. For one named thing, use [find-the-effect.md](find-the-effect.md).

Every recipe is a function that returns its data, so the result comes back whole. Run the stack first and tokens second, because a page that hands you its custom properties has already told you most of the answer.

## Cross-origin sheets throw

`sheet.cssRules` throws on a cross-origin stylesheet. Every recipe that walks stylesheets wraps the access and returns the `href` it could not read. Fetch those sheets as in [no-browser.md](no-browser.md), or name them as unread. An explanation that silently skipped the main stylesheet describes a page nobody is looking at.

## The stack first

"How was this site built" wants the frontend named before a type scale. Report each hit with the evidence that fired it.

```js
() => {
  const html = document.documentElement;
  const res = performance.getEntriesByType('resource').map(r => r.name);
  const any = re => res.some(n => re.test(n));
  const attr = sel => !!document.querySelector(sel);
  const classes = [...document.querySelectorAll('[class]')].map(e => e.getAttribute('class'));
  return {
    framework: {
      next: !!window.__NEXT_DATA__ || any(/\/_next\/static/),
      nextAppRouter: typeof self.__next_f !== 'undefined',
      nuxt: !!window.__NUXT__ || any(/\/_nuxt\//),
      remix: !!window.__remixContext,
      gatsby: !!window.___gatsby,
      astro: attr('astro-island, [data-astro-cid]'),
      svelte: attr('[class*="svelte-"]') || any(/\/_app\/immutable\//),
      angular: attr('[ng-version]'),
      reactFiber: Object.keys(document.body.firstElementChild ?? {}).some(k => k.startsWith('__react')),
    },
    styling: {
      tailwind: getComputedStyle(html).getPropertyValue('--tw-ring-offset-width') !== ''
                || attr('[class*="bg-linear-to"], [class*="bg-gradient-to"]'),
      tailwindV4: attr('[class*="bg-linear-to"]'),
      cssModules: classes.some(c => /\b[A-Za-z]+_[A-Za-z0-9]+__[A-Za-z0-9_-]{5}\b/.test(c)),
      styledComponents: attr('[class^="sc-"]') || attr('style[data-styled]'),
      emotion: attr('[class^="css-"]'),
    },
    components: {
      radix: attr('[data-radix-popper-content-wrapper], [data-radix-scroll-area-viewport]')
             || attr('[data-slot], [data-state][data-side]'),
      baseUi: attr('[data-base-ui-portal], [class*="base-ui"]'),
      headlessUi: attr('[data-headlessui-state]'),
      mui: attr('[class*="Mui"]'),
      arkOrChakra: attr('[data-scope][data-part]'),
    },
    motion: { animationsRunning: document.getAnimations().length, gsap: !!window.gsap },
    images: {
      nextImage: any(/\/_next\/image\?/),
      modernFormats: [...document.images].some(i => /\.(avif|webp)/.test(i.currentSrc)),
      srcset: [...document.images].filter(i => i.srcset).length,
    },
    fonts: {
      count: document.fonts.size,
      variable: [...document.fonts].some(f => String(f.weight).includes(' ')),
      googleFonts: any(/fonts\.g(oogleapis|static)\.com/),
    },
  };
}
```

## Tokens

The walk recurses into `@layer`, `@media` and `@supports`, since Tailwind v4 writes its tokens as `:root, :host` inside `@layer theme`.

```js
() => {
  const tokens = {}; const unreadable = [];
  const root = /(^|,)\s*(:root|html|:host)\s*(,|$)/;
  const walk = list => { for (const r of list ?? []) {
    if (r.selectorText && root.test(r.selectorText)) {
      for (const prop of r.style) if (prop.startsWith('--')) tokens[prop] = r.style.getPropertyValue(prop).trim();
    }
    if (r.cssRules) walk(r.cssRules);
  }};
  for (const sheet of document.styleSheets) {
    let rules; try { rules = sheet.cssRules } catch { unreadable.push(sheet.href); continue }
    walk(rules);
  }
  return { tokens, unreadable, count: Object.keys(tokens).length };
}
```

Group the result by prefix, since the prefixes are the system's own layer names. A two-tier structure, `--blue-500` feeding `--color-text-primary`, is what `better-colors` calls primitives and semantic tokens.

## The type scale

Leaf text nodes only, so a wrapper's inherited size is not counted as its own step.

```js
() => {
  const seen = new Map();
  for (const el of document.querySelectorAll('*')) {
    if (el.children.length || !el.textContent?.trim()) continue;
    const s = getComputedStyle(el);
    const key = `${parseFloat(s.fontSize)}px  w${s.fontWeight}  lh ${s.lineHeight}  ls ${s.letterSpacing}`;
    seen.set(key, (seen.get(key) ?? 0) + 1);
  }
  return [...seen].sort((a, b) => b[1] - a[1]);
}
```

Sorted by usage, so the body size usually comes first and the one-offs last. Derive the ratio between adjacent sizes. A consistent ratio is a scale, and scattered values are hard-coded sizes.

## The spacing rhythm

```js
() => {
  const vals = new Map();
  for (const el of document.querySelectorAll('*')) {
    const s = getComputedStyle(el);
    for (const p of ['paddingTop', 'paddingLeft', 'marginTop', 'marginLeft', 'gap', 'rowGap']) {
      const v = parseFloat(s[p]);
      if (v > 0) vals.set(v, (vals.get(v) ?? 0) + 1);
    }
  }
  return [...vals].sort((a, b) => a[0] - b[0]);
}
```

Find the base unit that divides most values. Then measure the gap between groups against the gap within one. `better-layout` sets the yardstick at 2× or more for space to carry the grouping on its own.

## Radii, shadows, borders

```js
() => {
  const grab = (prop, skip) => {
    const m = new Map();
    for (const el of document.querySelectorAll('*')) {
      const v = getComputedStyle(el)[prop];
      if (v && v !== skip) m.set(v, (m.get(v) ?? 0) + 1);
    }
    return [...m].sort((a, b) => b[1] - a[1]);
  };
  return { radius: grab('borderRadius', '0px'), shadow: grab('boxShadow', 'none') };
}
```

Report the count of distinct values and how often each is used. A few values reused everywhere is derived evidence of a shared scale. Whether anyone designed it is an inference.

## Motion

```js
() => {
  const t = new Map();
  for (const el of document.querySelectorAll('*')) {
    const s = getComputedStyle(el);
    if (s.transitionDuration === '0s') continue;
    const key = `${s.transitionProperty}  ${s.transitionDuration}  ${s.transitionTimingFunction}`;
    t.set(key, (t.get(key) ?? 0) + 1);
  }
  return [...t].sort((a, b) => b[1] - a[1]);
}
```

`transition: all` shows up here as `all`. Custom curves arrive as `cubic-bezier(...)`, and keywords such as `ease` are the browser's built-in curves.

## Breakpoints

```js
() => {
  const bp = new Set(); const unreadable = [];
  const re = /(min|max)-width:\s*[\d.]+(px|r?em)|width\s*[<>]=?\s*[\d.]+(px|r?em)/g;
  const walk = list => { for (const r of list ?? []) {
    for (const m of (r.media?.mediaText ?? '').matchAll(re)) bp.add(m[0]);
    if (r.cssRules) walk(r.cssRules);
  }};
  for (const sheet of document.styleSheets) {
    let rules; try { rules = sheet.cssRules } catch { unreadable.push(sheet.href); continue }
    walk(rules);
  }
  return { breakpoints: [...bp].sort(), unreadable };
}
```

Compare against the framework defaults. Tailwind v3 ships `640px`, `768px`, `1024px`, `1280px` and `1536px` as `min-width`. Tailwind v4 ships `40rem`, `48rem`, `64rem`, `80rem` and `96rem` as `width >= 40rem`. A match is derived. Whether anyone chose to keep the defaults is an inference.

## Fonts and theming

```js
() => ({
  loaded: [...document.fonts].map(f => `${f.family} ${f.weight} ${f.style} ${f.status}`),
  bodyStack: getComputedStyle(document.body).fontFamily,
  variable: [...document.fonts].some(f => String(f.weight).includes(' ')),
  themeClass: document.documentElement.className || '(none)',
  colorScheme: getComputedStyle(document.documentElement).colorScheme,
})
```

`variable: true` means one file covers a weight range. A class on `<html>` beside a `prefers-color-scheme` query means a toggle that can override the system setting.

## Reading a second state

Everything above reads one state at one width. Before writing the explanation, at minimum:

- Resize to 375px and re-run the spacing and breakpoint recipes. The values that change are what is fluid.
- Toggle the theme and re-run the token recipe. The tokens that change are the themed layer, and the ones that do not are the primitives.
- Tab to the first interactive control and read its `:focus-visible` styles, which a page at rest never shows.
