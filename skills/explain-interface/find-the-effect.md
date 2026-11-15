# Finding the layers behind an effect

Search by property signature, not by guessing the element. You rarely know the markup, but you always know which CSS properties could produce what you see.

## Three things that cost you the answer

**Pseudo-elements carry the effect more often than elements do.** A gradient, a noise overlay, a hairline border or a glow commonly lives on `::before` or `::after`. `getComputedStyle(el)` alone never sees them, so pass the pseudo as the second argument and read the element and both pseudos.

**Idle values are not effects.** `filter: blur(0px)`, `opacity: 1` and `transform: none` are what an animation library leaves on every element it touches. Filter them out first, or they bury the few hits that matter.

**A generated stop list is one technique, not twelve stops.** Stops at `0%, 9.99%, 19.07%, ...` came from a utility following an easing curve, and the extra stops keep the gradient from banding. Name the technique, never paste the stops.

## The layer search

```js
() => {
  const dead = v => !v || v === 'none' || v === 'normal' || v === '1' || v === 'blur(0px)';
  const PROPS = ['backgroundImage', 'filter', 'backdropFilter', 'mixBlendMode', 'maskImage', 'boxShadow', 'opacity'];
  const hits = [];
  for (const el of document.querySelectorAll('*')) {
    for (const pseudo of [null, '::before', '::after']) {
      const s = getComputedStyle(el, pseudo);
      const found = {};
      for (const p of PROPS) {
        const v = p === 'maskImage' ? (s.maskImage || s.webkitMaskImage) : s[p];
        if (!dead(v)) found[p] = String(v).slice(0, 200);
      }
      if (!Object.keys(found).length) continue;
      if (Object.keys(found).length === 1 && found.opacity) continue; // opacity alone is not an effect
      const r = el.getBoundingClientRect();
      const host = getComputedStyle(el);
      hits.push({
        tag: el.tagName.toLowerCase(), pseudo: pseudo ?? 'element',
        cls: (el.getAttribute('class') ?? '').slice(0, 90),
        position: host.position, z: host.zIndex,
        box: `${Math.round(r.width)}x${Math.round(r.height)} @ x${Math.round(r.left)} y${Math.round(r.top)}`,
        found,
      });
    }
  }
  return { viewport: innerWidth, total: hits.length, hits };
}
```

Read the result for the stack, not for one row:

- **Compare `box` against `viewport`.** An element wider than the viewport, or with a negative offset, is oversized on purpose so its edges never show.
- **Rows come back in DOM order.** Within one stacking context a later row roughly paints over an earlier one, and a positioned row with a higher `z` paints over both. Confirm the order at a pixel with **Narrowing to a region**.
- **`backdropFilter` on any row.** That layer frosts something beneath it, so the layer beneath is part of the answer.
- **`mixBlendMode` on any row.** The layer's color depends on what it covers, so you cannot explain it without naming what is underneath.

## When CSS is not the answer

Where the layer search comes back empty for the region you care about, the effect is not CSS. Run this after the page has drawn:

```js
() => ({
  libraries: performance.getEntriesByType('resource').map(r => r.name).filter(n => /three|ogl|pixi|regl|babylon/i.test(n)),
  three: !!window.THREE,
  media: [...document.querySelectorAll('canvas, svg, video, img')].map(el => {
    const r = el.getBoundingClientRect();
    return {
      tag: el.tagName.toLowerCase(),
      box: `${Math.round(r.width)}x${Math.round(r.height)} @ y${Math.round(r.top)}`,
      ctx: el.tagName === 'CANVAS' ? (el.getContext('2d') ? '2d-or-unused' : 'webgl-or-other') : null,
      src: (el.currentSrc || el.getAttribute('src') || '').slice(0, 90),
    };
  }),
})
```

A canvas returns `null` for a context type other than the one it already holds, so `webgl-or-other` means a WebGL context is likely. Probing an unused canvas creates a 2D context on it, which is why this runs only after the page has drawn. A WebGL canvas plus a matching library is a shader. Say so and describe roughly what it looks like, rather than describing CSS that is not there. An `svg` may carry `<filter>` primitives worth reading directly.

## Narrowing to a region

Where the page is large, sample what paints at one point instead of walking everything. Set `x` and `y` inside the function, since `evaluate_script` passes element references as arguments, not numbers:

```js
() => {
  const x = 720, y = 300;
  return document.elementsFromPoint(x, y).slice(0, 8).map(el => {
    const s = getComputedStyle(el);
    return {
      tag: el.tagName.toLowerCase(), cls: (el.getAttribute('class') ?? '').slice(0, 70),
      bg: s.backgroundImage.slice(0, 80), filter: s.filter, backdrop: s.backdropFilter, blend: s.mixBlendMode,
    };
  });
}
```

`elementsFromPoint` returns front to back, which is the paint stack at that pixel in reverse. It skips elements with `pointer-events: none`, and a pseudo-element comes back as its host. Decorative layers are often `pointer-events: none`, so a missing layer here is not an absent one. Fall back to the layer search and match on `box`.

## Is it animated?

```js
() => document.getAnimations().slice(0, 20).map(a => {
  const t = a.effect?.getTiming?.() ?? {};
  return {
    target: a.effect?.target?.tagName?.toLowerCase(),
    cls: (a.effect?.target?.getAttribute?.('class') ?? '').slice(0, 60),
    name: a.animationName ?? a.transitionProperty ?? '(js)',
    duration: t.duration, delay: t.delay, easing: t.easing,
    keyframes: (a.effect?.getKeyframes?.() ?? []).map(({ offset, easing, opacity, transform, filter }) =>
      ({ offset, easing, opacity, transform, filter })),
  };
})
```

`getAnimations()` catches CSS animations, transitions and Web Animations API playback in one call, which a stylesheet walk misses. Read `easing` on the keyframes as well as on the timing. A CSS animation carries its timing function on each keyframe, and its effect-level `easing` reads `linear`. `delay` across sibling targets is where a stagger shows.

It returns nothing on a page at rest, because a one-shot reveal has either finished or never started. Reload and run it at once, or scroll the target into view for a reveal on scroll. A headless page may not produce frames until something captures it, so where it stays empty, take a screenshot and run it again.
