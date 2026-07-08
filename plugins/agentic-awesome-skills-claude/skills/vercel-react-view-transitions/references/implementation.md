# Implementation Workflow

Follow these steps in order when adding view transitions to an app. Each step builds on the previous one.

## Step 1: Audit the App

Before writing any code, scan the codebase thoroughly. Search for:

- **Every `<Link>` and `router.push`** — these are your navigation triggers. Open every file that contains one.
- **Every `<Suspense>` boundary** — each one is a candidate for a reveal animation. Check what its fallback renders.
- **Every page/route component** — list them all. Each page needs a VT placement decision.
- **Persistent elements** — headers, navbars, sidebars, sticky controls that stay on screen across navigations. These need `viewTransitionName` isolation.
- **Shared visual elements** — images, cards, or avatars that appear on both a source and target view (e.g., a thumbnail in a list and the same image on a detail page).
- **Skeleton-to-content control pairs** — if a Suspense fallback renders a control (search input, tab bar) that also exists in the real content, both need a matching `viewTransitionName`.

Then classify every navigation and produce a navigation map:

```
| Route           | Navigates to         | Direction    | VT pattern            |
|-----------------|----------------------|--------------|-----------------------|
| /               | /detail/[id]         | forward      | directional slide     |
| /detail/[id]    | /                    | back         | directional slide     |
| /detail/[id]    | /detail/[other]      | sequential   | directional slide (ordered prev/next) or key+share crossfade |
| /tab/[a]        | /tab/[b]             | lateral      | key+share crossfade   |
| (Suspense)      | (content loads)      | —            | slide-up reveal       |
```

For each shared element (`name` prop), note every navigation where a pair forms and where it doesn't — this determines whether you need `enter`/`exit` as a fallback alongside `share`.

## Step 2: Add CSS Recipes

Copy the **complete** CSS recipe set from `css-recipes.md` into your global stylesheet. This includes timing variables, shared keyframes, fade, slide (vertical), directional navigation (forward/back), shared element morph, persistent element isolation, and reduced motion.

Do not write your own animation CSS — the recipes handle staggered timing, motion blur on morphs, and reduced motion that are easy to get wrong. You can customize timing variables (`--duration-exit`, `--duration-enter`, `--duration-move`) after the initial setup.

## Step 3: Isolate Persistent Elements

For every persistent element identified in Step 1, add a `viewTransitionName` style to pull it out of the page content's transition snapshot:

```jsx
<header style={{ viewTransitionName: "site-header" }}>...</header>
```

Then add the persistent element isolation CSS from `css-recipes.md` (prevents the element from animating during page transitions). If the element uses `backdrop-blur` or `backdrop-filter`, use the backdrop-blur workaround from `css-recipes.md` instead.

If a Suspense fallback mirrors a persistent control (e.g., a skeleton search input), give both the real control and the skeleton the same `viewTransitionName` so they morph in place.

## Step 4: Add Directional Page Transitions

For hierarchical navigations identified in Step 1, tag the navigation direction using `addTransitionType` inside `startTransition`:

```jsx
startTransition(() => {
  addTransitionType('nav-forward');
  router.push('/detail/1');
});
```

Then wrap each **page component** (not layout) in a type-keyed `<ViewTransition>`:

```jsx
<ViewTransition
  enter={{
    "nav-forward": "nav-forward",
    "nav-back": "nav-back",
    default: "none",
  }}
  exit={{
    "nav-forward": "nav-forward",
    "nav-back": "nav-back",
    default: "none",
  }}
  default="none"
>
  <div>...page content...</div>
</ViewTransition>
```

The `nav-forward` and `nav-back` CSS classes from `css-recipes.md` produce horizontal slides. For simpler apps where directional motion isn't needed, a bare `<ViewTransition default="none">` wrapper with `enter="fade-in"` / `exit="fade-out"` works too.

Extract this into a reusable component so every page doesn't repeat the verbose type map:

```jsx
export function DirectionalTransition({ children }: { children: React.ReactNode }) {
  return (
    <ViewTransition
      enter={{ 'nav-forward': 'nav-forward', 'nav-back': 'nav-back', default: 'none' }}
      exit={{ 'nav-forward': 'nav-forward', 'nav-back': 'nav-back', default: 'none' }}
      default="none"
    >
      {children}
    </ViewTransition>
  );
}
```

This also becomes the single place to adjust if you add new transition types later.

**Rules:**
- Always pair `enter` with `exit` — without an exit animation, the old page disappears instantly while the new one animates in.
- Always include `default: "none"` in type map objects and `default="none"` on the component — otherwise it fires on every transition.
- Place the directional `<ViewTransition>` in each page component, not in a layout. Layouts persist across navigations and never trigger enter/exit.
- Only use directional slides for hierarchical navigation or ordered sequences (prev/next). Lateral/sibling navigation (tab-to-tab) should use a bare `<ViewTransition>` (cross-fade) or `default="none"`.

## Step 5: Add Suspense Reveals

For every `<Suspense>` boundary identified in Step 1, wrap the fallback and content in separate `<ViewTransition>`s:

```jsx
<Suspense
  fallback={
    <ViewTransition exit="slide-down">
      <Skeleton />
    </ViewTransition>
  }
>
  <ViewTransition enter="slide-up" default="none">
    <AsyncContent />
  </ViewTransition>
</Suspense>
```

This example uses `slide-down` / `slide-up` for directional vertical motion. For a simpler reveal, a bare `<ViewTransition>` around the `<Suspense>` gives a cross-fade with zero configuration. Choose based on the spatial meaning — consult the "Choosing the Right Animation Style" table in the main skill file.

**Rules:**
- Always use `default="none"` on the content `<ViewTransition>` to prevent re-animation on revalidation or unrelated transitions.
- Use simple string props (not type maps) on Suspense `<ViewTransition>`s — Suspense resolves fire as separate transitions with no type, so type-keyed props won't match.

## Step 6: Add Shared Element Transitions

For every shared visual element identified in Step 1, add matching named `<ViewTransition>` wrappers on both the source and target views:

```jsx
// On the source view (e.g., list/grid page)
<ViewTransition name={`photo-${photo.id}`} share="morph" default="none">
  <Image src={photo.src} ... />
</ViewTransition>

// On the target view (e.g., detail page) — same name
<ViewTransition name={`photo-${photo.id}`} share="morph">
  <Image src={photo.src} ... />
</ViewTransition>
```

The `share="morph"` class uses the morph recipe from `css-recipes.md` (controlled duration + motion blur). For a simpler cross-fade, use `share="auto"` (browser default).

When list items contain shared elements, compose both patterns with two nested `<ViewTransition>` layers — see "Composing Shared Elements with List Identity" in `SKILL.md`.

**Rules:**
- Names must be globally unique — use prefixes like `photo-${id}`.
- Add `default="none"` on list-side shared elements to prevent per-item cross-fades on filter/search updates.

## Step 7: Verify Each Navigation Path

Walk through every row in the navigation map from Step 1 and confirm:

- Does the VT mount/unmount on this navigation, or does it stay mounted (same-route)?
- For named VTs: does a shared pair form? If not, does `enter`/`exit` provide a fallback?
- Does `default="none"` block an animation you actually want?
- Do persistent elements stay static (not sliding with page content)?
- Do Suspense reveals animate independently from directional navigations?

If any path produces no animation or competing animations, revisit the relevant step.

---

## Common Mistakes

- **Bare `<ViewTransition>` without props** — without `default="none"`, it fires the browser's default cross-fade on every transition (every navigation, every Suspense resolve, every revalidation). Always set `default="none"` and explicitly enable only the triggers you want.
- **Directional `<ViewTransition>` in a layout** — layouts persist across navigations and never unmount/remount. `enter`/`exit` props won't fire on route changes. Place the outer type-keyed `<ViewTransition>` in each page component.
- **Fade-out exit with shared element morphs** — the page dissolving conflicts with the morph. Use a directional slide exit instead.
- **Writing custom animation CSS** — the recipes in `css-recipes.md` handle staggered timing, motion blur on morphs, and reduced motion. Copy them; don't reinvent them.
- **Missing `default: "none"` in type-keyed objects** — TypeScript requires a `default` key, and without it the fallback is `"auto"` which fires on every transition.
- **Type maps on Suspense reveals** — Suspense resolves fire as separate transitions with no type. Type-keyed props won't match — use simple string props instead.
- **Raw `viewTransitionName` CSS to trigger animations** — React only calls `document.startViewTransition` when `<ViewTransition>` components are in the tree. A bare `viewTransitionName` style is for isolating elements from a parent's snapshot, not for triggering animations.
- **`update` trigger for same-route navigations** — nested VTs inside the content steal the mutation from the parent, so `update` never fires on the outer VT. Use `key` + `name` + `share` instead.
- **Named VT in a reusable component** — if a component with a named VT is rendered in both a modal/popover *and* a page, both mount simultaneously and break the morph. Make the name conditional or move it to the specific consumer.
- **`router.back()` for back navigation** — `router.back()` triggers synchronous `popstate`, incompatible with view transitions. Use `router.push()` with an explicit URL.

---

For Next.js-specific implementation steps (config flag, `transitionTypes` on `<Link>`, same-route dynamic segments), see `nextjs.md`.
