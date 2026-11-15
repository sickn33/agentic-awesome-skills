# Icon transitions

Cross-fade recipes for an icon that swaps on a state change, with and without a motion library. Icon weight, color and direction live in [icons.md](icons.md).

## Which library

Check the project's `package.json`. Import from `"motion/react"` when `motion` is installed, or `"framer-motion"` when that is. Where both exist, follow the imports the component or its nearest peers already use. Where neither is present, use the CSS cross-fade and never add a dependency just for icon transitions.

## Motion

```tsx
import { AnimatePresence, motion } from "motion/react";

function IconButton({ isActive, icon: Icon }) {
  return (
    <button>
      <AnimatePresence initial={false} mode="popLayout">
        <motion.span
          key={isActive ? "active" : "inactive"}
          initial={{ opacity: 0, scale: 0.25, filter: "blur(4px)" }}
          animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
          exit={{ opacity: 0, scale: 0.25, filter: "blur(4px)" }}
          transition={{ type: "spring", duration: 0.3, bounce: 0 }}
        >
          <Icon />
        </motion.span>
      </AnimatePresence>
    </button>
  );
}
```

`initial={false}` keeps the default icon from animating in on mount.

## CSS, both icons in the DOM

Both icons stay mounted in one grid cell, so enter and exit both animate and the larger icon sets the size. The `motion-reduce:` classes leave only the opacity fade under reduced motion.

```tsx
const layer = cn(
  "[grid-area:1/1] transition-[opacity,filter,scale] duration-300",
  "ease-[cubic-bezier(0.2,0,0,1)]",
  "motion-reduce:scale-100 motion-reduce:blur-[0px]"
);
const shown = "scale-100 opacity-100 blur-[0px]";
const hidden = "scale-[0.25] opacity-0 blur-[4px]";

function IconButton({ isActive, ActiveIcon, InactiveIcon }) {
  return (
    <button>
      <span className="grid place-items-center">
        <span className={cn(layer, isActive ? shown : hidden)}>
          <ActiveIcon />
        </span>
        <span className={cn(layer, isActive ? hidden : shown)}>
          <InactiveIcon />
        </span>
      </span>
    </button>
  );
}
```

Tailwind 4's `scale-*` utilities write the `scale` property, so `transition-[...scale]` animates them. Tailwind 3's write `transform`, so name `transform` in the transition instead.

## Which icons animate

| Animate | Don't animate |
| --- | --- |
| Infrequent state swaps such as play to pause, like to liked or copy to copied | Hover-revealed actions in list rows |
| Icons in a toolbar that appears on selection | Tab and navigation icon swaps |
| Loading and success indicators | Decorative or always-visible icons |
