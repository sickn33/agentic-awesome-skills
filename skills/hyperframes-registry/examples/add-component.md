# Worked Example: Adding a Component

## Scenario

User wants to add a shimmer light sweep effect to their title text.

## Steps

### 1. Install the component

```bash
hyperframes add shimmer-sweep
```

### 2. Read the snippet

Open `compositions/components/shimmer-sweep.html` and read the comment header.

### 3. Wire into your composition

**HTML** — wrap target elements:

```html
<div class="shimmer-sweep-target" style="--shimmer-color: rgba(255, 255, 255, 0.5)">
  <h1 class="title">AI-Powered Video</h1>
</div>
```

**CSS** — paste the `.shimmer-sweep-target` and `.shimmer-mask` rules from the snippet.

**JS** — paste the auto-injection script (before timeline code):

```js
document.querySelectorAll(".shimmer-sweep-target").forEach((el) => {
  if (!el.querySelector(".shimmer-mask")) {
    const mask = document.createElement("div");
    mask.className = "shimmer-mask";
    el.appendChild(mask);
  }
});
```

**Timeline** — add the sweep:

```js
tl.fromTo(
  ".shimmer-sweep-target",
  {
    "--shimmer-pos": "-20%",
  },
  {
    "--shimmer-pos": "120%",
    duration: 1.2,
    ease: "power2.inOut",
    stagger: 0.15,
  },
  1.5,
);
```

### 4. Lint and preview

```bash
hyperframes lint
hyperframes preview
```

### 5. Customize

- `--shimmer-color`: highlight color per element
- `--shimmer-width`: light band width (default 20%)
- `--shimmer-angle`: sweep direction (default 120deg)
- Timeline `duration`, `ease`, `stagger`: control speed and feel
