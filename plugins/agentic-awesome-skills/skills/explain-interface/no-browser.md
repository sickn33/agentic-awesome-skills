# Reading a site without a browser

Fetch the HTML, then the stylesheets it links, then grep. That answers most questions a scriptable browser answers and a few it cannot.

Do not use a markdown-converting fetch for this. It strips exactly what you came for, so fetch the raw bytes. Work in a temporary directory, never in the user's project.

```bash
cd "$(mktemp -d)"
curl -sL --max-time 25 "$URL" -o page.html
wc -c page.html
grep -oE 'href="[^"]*\.css[^"]*"' page.html | sed 's/href="//;s/"$//' | sort -u
```

Pull each stylesheet the same way into `style.css`, resolving protocol-relative and root-relative hrefs against the page's origin first.

## Utility CSS is self-describing

Where the site uses utility classes, the markup already contains the declarations and no stylesheet lookup is needed. Grep the class attribute for the effect:

```bash
grep -oE '(backdrop-)?blur-\[[^]]*\]|(backdrop-)?blur-[a-z0-9]+' page.html | sort | uniq -c | sort -rn
grep -oE 'class="[^"]*(gradient|blur|mask|mix-blend)[^"]*"' page.html | head -20
```

A class list carries every responsive and state variant at once. `blur-[50px] md:h-214 md:-translate-x-1/2` says the element changes shape at the `md` breakpoint.

Semantic CSS gives you a hashed class name instead, such as `Hero_glow__a1b2c`. Take that name to the stylesheet and grep it there.

## Inline styles carry the values utilities cannot express

A multi-stop gradient is usually too specific for a utility, so it lands in a `style` attribute:

```bash
grep -oE 'linear-gradient\([^)]*\)' page.html | sort -u | head
grep -oE 'radial-gradient\([^)]*\)' page.html | sort -u | head
grep -oE 'style="[^"]*(transform|filter|mask)[^"]*"' page.html | head
```

## The stylesheet, for tokens and generated utilities

```bash
grep -oE '(:root|:host)[^{]*\{[^}]*\}' style.css | head -3 | tr ';' '\n'   # the token layer
grep -oE '@layer [a-z, ]+' style.css | sort -u                             # Tailwind v4 emits theme, base, components, utilities
grep -oE '@media[^{]*\((m(in|ax)-width:|width *[<>])[^)]*\)' style.css | sort -u   # real breakpoints
grep -oE '@font-face\{[^}]*\}' style.css | head                           # families, weights, formats
grep -oE '@keyframes [a-zA-Z-]+' style.css | sort -u                      # named animations
```

To understand a custom utility, grep its class name in the stylesheet and read the declaration whole. That is how `gradient-ease-in-out` turns into its mechanism, a generated stop list built with `color-mix()` and relative color syntax.

## Stack fingerprints from the HTML alone

```bash
grep -ocE '__NEXT_DATA__|/_next/static' page.html          # Next.js
grep -oc 'self.__next_f' page.html                          # App Router with RSC payload
grep -ocE '__NUXT__|/_nuxt/' page.html                      # Nuxt
grep -ocE '__remixContext|___gatsby|astro-island' page.html  # Remix, Gatsby, Astro
grep -oc 'class="[^"]*svelte-' page.html                     # Svelte
grep -oc 'data-radix-' page.html                             # Radix primitives
grep -oc 'bg-linear-to' page.html                            # Tailwind v4, where v3 wrote bg-gradient-to
grep -oE '<meta name="generator"[^>]*>' page.html
```

## What this method cannot tell you

Say so rather than guessing past it:

- **Paint order and what is actually visible.** A declaration in the CSS may be overridden or never rendered.
- **Live animation state.** Whether an effect moves at all.
- **Resolved values.** A `rem` stays a `rem`, and you never learn the pixel size.
