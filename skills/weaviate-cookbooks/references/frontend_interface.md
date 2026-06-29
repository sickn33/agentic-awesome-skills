# Frontend Interface (Next.js + Weaviate Backend)

## Quick reference

| Item         | Value                                                                                       |
| ------------ | ------------------------------------------------------------------------------------------- |
| **Stack**    | Next.js (App Router), Tailwind v4, shadcn/ui, Framer Motion, react-icons, ai-sdk            |
| **Node**     | v25.3.0+                                                                                    |
| **Backend**  | `NEXT_PUBLIC_BACKEND_HOST` (default: `localhost:8000`)                                      |
| **App type** | Single-page app; main view updates in place, no full-page navigations                       |
| **Layout**   | shadcn Sidebar (left) + main content area; sidebar buttons switch the main view per feature |

---

## Setup (run in order)

### 1. Next.js

- **Command:** `npx create-next-app@latest . --yes` (run from repo root; may need `required_permissions: ["all"]` in sandbox)
- **Result:** TypeScript, ESLint, Tailwind v4, App Router, Turbopack, `@/*` → `./*`, no `src/`. App in `app/`, static in `public/`.
- **Scripts:** `dev` | `build` | `start` | `lint`. Dev server: http://localhost:3000.
- **Routes:** `app/layout.tsx`, `app/page.tsx`. Imports: `@/` = project root.
- **Ref:** [Next.js App Router Installation](https://nextjs.org/docs/app/getting-started/installation) — verify against current docs.

### 2. shadcn/ui

- **Requires:** Next.js + Tailwind v4 + App Router + `@/*`, no `src/`.
- **Init:** `npx shadcn@latest init -t next -y -b zinc --no-src-dir`
- **Add components:** `npx shadcn@latest add button -y` (e.g. `card`, `dialog`, `input`; `-o` overwrites).
- **Output:** `components.json`, `lib/utils.ts` (cn), `app/globals.css` (tw-animate, shadcn/tailwind.css, CSS vars). UI in `components/ui/<name>.tsx`. Import: `import { Button } from "@/components/ui/button"`.
- **Ref:** [shadcn Next.js](https://ui.shadcn.com/docs/installation/next) | [CLI](https://ui.shadcn.com/docs/cli).

### 3. Framer Motion

```bash
npm i framer-motion
```

- **Ref:** [Framer Motion](https://motion.dev/)

### 4. AI SDK (optional)

Note: Install only when create a conversational user interface for your chatbot application. It enables the streaming of chat messagesyou need to stream responses from the backend using useChat().

- **When:** Add this step only if the app needs a chat UI (e.g. query-agent or chatbot flows).
- **Stack:** Use the [Vercel AI SDK](https://ai-sdk.dev/docs/introduction) (`ai` + `@ai-sdk/*`). Use `useChat` and SDK UI primitives for the chat view.
- **Ref:** [AI SDK – useChat](https://ai-sdk.dev/docs/reference/ai-sdk-ui/use-chat) | [Next.js App Router setup](https://ai-sdk.dev/docs/getting-started/nextjs-app-router) — follow current docs for install and wiring.

```bash
npm i ai @ai-sdk/react zod
```

### 5. Environment

**Required:**

```bash
NEXT_PUBLIC_BACKEND_HOST="localhost:8000"
```

Use the actual backend host when not local.

---

## Rules (must follow)

### Stack and structure

- **UI:** Use **shadcn components only** for layout and interactive elements (buttons, cards, inputs, dialogs, etc.). Do not add another UI library.
- **Architecture:** **SPA** — one main page, update main view in place. Avoid full-page navigations unless necessary.
- **Icons:** Use **react-icons** only; prefer one set (e.g. `react-icons/fa` or `react-icons/hi`) for consistency.
- **Animation:** Use **Framer Motion** only. Do not add another animation library.

### Visual style

- **Goal:** Minimal, sleek, clean. No clutter, heavy borders, or noisy backgrounds.
- **Aesthetic:** “Liquid glass” — frosted, translucent; soft blur; light borders and shadows; depth without heaviness. Use `backdrop-blur`, semi-transparent fills, subtle gradients where they support this.

### Motion

- **Style:** Subtle, springy, purposeful (fade in, hover, enter/exit). Prefer spring physics over linear/ease-out.

### Layout

1. **Left:** shadcn **Sidebar** component.
2. **Right:** Main content area.
3. **Navigation:** One sidebar button per backend feature (e.g. data explorer, chat). Click switches the main view only.

### Responsiveness

- Layout and components must work on small and large screens.

---

## Docs (verify against current versions)

- [FastAPI](https://fastapi.tiangolo.com/) | [GitHub](https://github.com/fastapi/fastapi)
- [Node.js](https://nodejs.org/en)
- [Next.js](https://nextjs.org/docs)
- [Tailwind (Next.js)](https://tailwindcss.com/docs/installation/framework-guides/nextjs)
- [shadcn components](https://ui.shadcn.com/docs/components)
- [react-icons](https://react-icons.github.io/react-icons)
- [Framer Motion](https://motion.dev/)
- [AI SDK](https://ai-sdk.dev/docs/introduction)
