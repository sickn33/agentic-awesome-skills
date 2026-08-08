# Styling Rules

## Approach: {{CSS_APPROACH}}

{{CSS_APPROACH_DESCRIPTION}}

## Rules

{{STYLING_RULES}}

## Themes / Design Tokens

{{THEME_SECTION}}

## Animations

{{ANIMATION_SECTION}}

## Generation Rules

- **CSS_APPROACH**: Detected approach name: "Tailwind CSS", "CSS Modules", "styled-components", "Emotion", "Sass/SCSS", "Plain CSS".
- **CSS_APPROACH_DESCRIPTION**: One sentence summarizing how styling works. E.g.: "Tailwind CSS v4 with utility-first classes. No separate CSS files except globals.css."
- **STYLING_RULES**: Approach-specific rules:
  - **Tailwind**:
    - No inline `style={{}}` — always Tailwind classes. Exception: dynamically computed values (mouse-position based).
    - `cn()` for combining conditional classes. If `lib/utils.ts` has `cn`, document it.
    - Responsive: mobile-first with `sm:`, `md:`, `lg:` breakpoints.
    - Dark mode: if using `class="dark"` or `prefers-color-scheme`.
    - shadcn/ui: components use `components/ui/`, theme via CSS variables.
  - **CSS Modules**:
    - `.module.css` files next to the component.
    - `import styles from "./Component.module.css"`.
    - No global classes (use `:global()` if needed).
  - **styled-components**:
    - `styled.div` / `styled(Component)` for styled components.
    - Theme provider with `ThemeProvider`.
    - Transient props with `$` prefix.
  - **Sass/SCSS**:
    - `.scss` files with variables, mixins, nesting.
    - No inline `style={{}}`.
- **THEME_SECTION**: If theming system exists (CSS variables, ThemeProvider, next-themes):
  - Where tokens are defined (globals.css, theme.ts).
  - How to switch between light/dark.
  - Whether it's dark-mode only or has a toggle.
- **ANIMATION_SECTION**: If using `tw-animate-css`, `framer-motion`, `react-spring`:
  - `animate-in`, `fade-in`, `slide-in-from-*` (tw-animate-css).
  - `motion.div`, `AnimatePresence` (framer-motion).
  - Accessibility: `prefers-reduced-motion`.
