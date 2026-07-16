---
name: frontend-architecture
description: A portable, framework-agnostic architecture style for any React or React Native frontend. Organizes apps into feature modules with page/screen directories, a strict server-state vs UI-state split, barrel-only cross-module imports, co-located styles, and clear component-promotion rules....
risk: unknown
source: https://github.com/stareezy-1/frontend-architecture-skill/tree/main/skills/frontend-architecture
source_repo: stareezy-1/frontend-architecture-skill
source_type: community
date_added: 2026-07-01
license: MIT
license_source: https://github.com/stareezy-1/frontend-architecture-skill/blob/main/LICENSE
---

# Frontend Architecture (portable, module-based)
## When to Use

Use this skill when you need a portable, framework-agnostic architecture style for any React or React Native frontend. Organizes apps into feature modules with page/screen directories, a strict server-state vs UI-state split, barrel-only cross-module imports, co-located styles, and clear component-promotion rules....


> Portable skill — readable by Claude Code, OpenCode, Codex, Cursor, Windsurf, and others.
> This skill describes a **structure and a set of rules**, not a component library, a state library, or a visual style.
> It is deliberately global: the same module/page/state model maps onto
> **Next.js (App Router)**, **React + Vite (SPA)**, **Remix**, and **Expo / React Native**, and it works
> with **any** state-management and styling stack.

The goal: a codebase where any contributor can instantly answer three questions —
**"where does this code live?"**, **"what is allowed to import what?"**, and **"is this server state or UI state?"** —
without asking anyone. The structure makes the answers obvious.

---

## 0. The five core ideas

1. **Feature modules own their world.** Each feature is a self-contained `modules/{feature}/` folder with its own pages, components, hooks, state, types, and a single public barrel.
2. **Pages/screens are directories, not files.** A route is a folder that co-locates its component, its styles, and the components/hooks used only by it.
3. **State is split by origin.** Server data lives in a query/cache layer. UI/client state lives in a store. They never overlap — regardless of which libraries you pick.
4. **Imports cross boundaries only through barrels.** Reaching into another module's internals is forbidden; you import from `@/modules/{feature}` and nothing deeper.
5. **Code is promoted, not pre-placed.** It starts as local as possible and moves outward only when a second consumer appears.

Everything below is the mechanical application of these five ideas. None of it is tied to a specific library — pick your stack in Sections 4 and 6.

---

## 1. Directory layout

The shape is identical across frameworks; only the routing layer on top differs (see Section 7).

```
src/
├── app/ or routes/ or navigation/   ← framework routing layer (thin — see §7)
├── modules/                         ← feature modules (the heart of the app)
│   └── {feature}/
│       ├── index.ts                 ← PUBLIC BARREL — the only cross-module entry point
│       ├── README.md                ← what this module owns, its routes, its data deps
│       ├── components/              ← components reused by 2+ pages IN THIS MODULE
│       ├── pages/                   ← page/screen directories (one per route)
│       │   └── {page}/
│       │       ├── {page}.tsx               ← the page/screen component
│       │       ├── {page}.styles.ts         ← ALL styling for this page
│       │       ├── index.ts                 ← re-exports the page component
│       │       ├── components/              ← components used ONLY by this page
│       │       ├── hooks/                   ← hooks used ONLY by this page
│       │       ├── constants/
│       │       └── README.md                ← route, params, permissions, data deps
│       ├── hooks/                   ← data hooks (query/mutation) + module hooks
│       ├── stores/                  ← UI/client state store(s) — never server data
│       ├── services/                ← data-access (API calls) for this feature
│       ├── utils/                   ← pure module utilities (co-located *.test.ts)
│       ├── constants/
│       └── types/                   ← module request/response + view-model types
└── shared/                          ← cross-module building blocks
    ├── components/                  ← components used by 2+ MODULES
    ├── hooks/                       ← cross-cutting hooks
    ├── api-client/                  ← one typed client; the only place that talks to the network
    ├── store/                       ← root store wiring (if your state lib needs one — see §4)
    ├── utils/                       ← formatters, cn()/clsx, helpers
    ├── constants/
    └── types/
```

Every folder that can be empty at scaffold time keeps a `.gitkeep` so the structure is visible from day one.

---

## 2. Feature modules

A module is a vertical slice of the product (e.g. `auth`, `billing`, `dashboard`, `settings`). It contains everything that feature needs and exposes a deliberately small surface.

### 2.1 The barrel (`index.ts`) is the contract

`modules/{feature}/index.ts` is the **only** thing other modules and the routing layer may import from. It re-exports:

- Page/screen components the router mounts.
- Data hooks other features legitimately need.
- The store hook/slice and its public types.
- Shared constants / types other features depend on.

```ts
// CORRECT — consume the public surface
import { InvoiceListPage, useInvoiceList } from "@/modules/invoice";

// WRONG — reaching into internals couples you to private structure
import { InvoiceListPage } from "@/modules/invoice/pages/invoice-list/invoice-list";
```

Keep the barrel curated. If something isn't exported, it's private by design. Group exports with short comments (pages, hooks, store, types) — future readers use the barrel as the module's API docs.

### 2.2 One module = one bounded context

Don't create `utils` modules or `components` modules. Modules map to product capabilities, not to technical layers. Technical building blocks live in `shared/`.

### 2.3 Module README

Each module's `README.md` states: what it owns, which routes render its pages, its data dependencies (which endpoints/hooks), and any cross-module rules. This is the first thing a new contributor reads.

---

## 3. Pages/screens as directories

A page is a route the router mounts (a "screen" in React Native). It is **always a folder**, never a loose file — even when it starts as a single component. This keeps growth in place: when the page needs a sub-component or a hook, there is already a home for it.

```
pages/{page}/
├── {page}.tsx          ← the page/screen component
├── {page}.styles.ts    ← every style for this page (no inline styles — see §5)
├── index.ts            ← export { PageComponent } from "./{page}"
├── components/         ← used ONLY by this page
├── hooks/              ← used ONLY by this page
├── constants/
└── README.md           ← route, params, permissions, data deps
```

The page README is short and high-signal: route path, expected params, required permissions/auth, and the hooks it depends on. It is the contract between the page and the rest of the app.

**Why folders from the start:** a page that begins as one file inevitably grows a sub-row component, a derived-totals hook, a styles file. If the page is a file, those land in arbitrary places. If the page is a folder, they have an obvious home and the diff stays readable.

---

## 4. State: split by origin (non-negotiable, library-agnostic)

Two kinds of state, two homes. Mixing them is the most common architectural failure this skill exists to prevent. **The split is mandatory; the libraries are your choice.**

| State kind            | Examples                                                                          | Lives in                                                                                |
| --------------------- | --------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| **Server state**      | fetched entities, lists, aggregates — anything the API owns                       | a **query/cache layer** (e.g. TanStack Query, RTK Query, SWR, Apollo)                   |
| **UI / client state** | open dialogs, table filters/sort, wizard step, draft being typed, preview toggles | a **client store** (e.g. Zustand, Redux Toolkit, MobX, Jotai, Valtio, or React Context) |

### 4.1 Hard rules (independent of library)

- **Never mirror server responses into the client store.** No copying fetched entities into Zustand/Redux/MobX. The query/cache layer is the single source of truth for server data.
- **Never fetch inside components.** Components read server data from a data hook and UI state from a store selector. They don't call the network client directly.
- **Never drive continuous values through re-render state.** Scroll progress, pointer position, drag offset — use refs / animation values, not render state (it re-renders the tree every frame).
- **One store boundary per module.** Whatever library you use, give each module one cohesive store unit (a Zustand hook, a Redux slice, a MobX class, a Jotai atom group) accessed via the module barrel. Components subscribe to the smallest slice they need to avoid needless re-renders.

### 4.2 Choosing a client-state library — same shape, different syntax

Pick one per project and stay consistent. Each maps onto "one store unit per module" cleanly. Note the **`I` interface-naming convention**: state interfaces are prefixed with `I` (e.g. `IFeatureUiState`).

**Zustand** — `modules/{feature}/stores/{feature}.store.ts`

```ts
import { create } from "zustand";

export interface IFeatureUiState {
  isPreviewOpen: boolean;
  filter: string;
  togglePreview: () => void;
  setFilter: (filter: string) => void;
  reset: () => void;
}

const INITIAL_STATE = { isPreviewOpen: false, filter: "" } as const;

export const useFeatureUiStore = create<IFeatureUiState>()((set) => ({
  ...INITIAL_STATE,
  togglePreview: () => set((s) => ({ isPreviewOpen: !s.isPreviewOpen })),
  setFilter: (filter) => set({ filter }),
  reset: () => set({ ...INITIAL_STATE }),
}));
```

**Redux Toolkit** — `modules/{feature}/stores/{feature}.slice.ts` (registered in `shared/store/`)

```ts
import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

export interface IFeatureUiState {
  isPreviewOpen: boolean;
  filter: string;
}

const initialState: IFeatureUiState = { isPreviewOpen: false, filter: "" };

export const featureUiSlice = createSlice({
  name: "featureUi",
  initialState,
  reducers: {
    togglePreview: (s) => {
      s.isPreviewOpen = !s.isPreviewOpen;
    },
    setFilter: (s, action: PayloadAction<string>) => {
      s.filter = action.payload;
    },
    reset: () => initialState,
  },
});
```

**MobX** — `modules/{feature}/stores/{feature}.store.ts`

```ts
import { makeAutoObservable } from "mobx";

export interface IFeatureUiState {
  isPreviewOpen: boolean;
  filter: string;
}

export class FeatureUiStore implements IFeatureUiState {
  isPreviewOpen = false;
  filter = "";
  constructor() {
    makeAutoObservable(this);
  }
  togglePreview = () => {
    this.isPreviewOpen = !this.isPreviewOpen;
  };
  setFilter = (filter: string) => {
    this.filter = filter;
  };
  reset = () => {
    this.isPreviewOpen = false;
    this.filter = "";
  };
}
```

**Jotai** — `modules/{feature}/stores/{feature}.atoms.ts`

```ts
import { atom } from "jotai";
export const isPreviewOpenAtom = atom(false);
export const filterAtom = atom("");
```

> Whichever you choose, keep the rules in §4.1 constant. The skill cares that server and UI state are separated and that each module owns one store unit — not which library draws the box.

### 4.3 Data layer (server state)

All network access goes through **one typed client** in `shared/api-client/`. Modules wrap it in query/mutation hooks and a **key factory** so caches and invalidation stay consistent.

```ts
// modules/invoice/hooks/invoiceKeys.ts — hierarchical key factory (TanStack Query style)
export const invoiceKeys = {
  all: ["invoices"] as const,
  lists: () => [...invoiceKeys.all, "list"] as const,
  list: (params: IListParams) => [...invoiceKeys.lists(), params] as const,
  details: () => [...invoiceKeys.all, "detail"] as const,
  detail: (id: string) => [...invoiceKeys.details(), id] as const,
} as const;
```

Invalidating `lists()` refreshes every filtered page; `detail(id)` targets one entity. (RTK Query/SWR/Apollo express the same idea with tags/keys.) Components never write raw `fetch()` — they call `useInvoiceList()` / `useCreateInvoice()`.

---

## 5. Styling: co-located, no inline styles (styling-library agnostic)

Keep styling out of JSX and out of the component body. Each page or component has a **co-located styles file**. The rule is constant; the syntax follows your styling stack.

- **Tailwind (web):** `{name}.styles.ts` exports named class strings composed with `cn()` (clsx + tailwind-merge); variants via `cva`. JSX references `styles.header`.
- **CSS Modules / vanilla-extract:** a co-located `{name}.module.css` / `{name}.css.ts`; JSX references `styles.header`.
- **styled-components / Emotion:** a co-located `{name}.styles.ts` exporting styled components.
- **Tamagui (web + native):** a co-located `{name}.styles.ts` exporting `styled(...)` components or a `createStyledContext` / `useStyle` token set; reference Tamagui tokens (`$background`, `$space.4`) — never hardcoded values inline. Tamagui is the recommended choice when you target **both web and React Native** from one codebase.
- **React Native StyleSheet / Nativewind:** a co-located `{name}.styles.ts` exporting `StyleSheet.create({...})` (or Nativewind classnames). JSX references `styles.header`.

```ts
// invoice-list.styles.ts (Tailwind example)
export const invoiceListStyles = {
  page: "flex flex-col gap-8",
  header: "flex flex-col gap-1.5",
  title: "text-3xl font-semibold tracking-tight",
} as const;
```

```ts
// invoice-list.styles.ts (Tamagui example — works on web AND native)
import { styled, YStack, Text } from "tamagui";

export const InvoiceListPage = styled(YStack, { flex: 1, gap: "$8" });
export const InvoiceListHeader = styled(YStack, { gap: "$1.5" });
export const InvoiceListTitle = styled(Text, {
  fontSize: "$8",
  fontWeight: "600",
});
```

**No inline `style={{...}}` literals in the component body**, on any stack. Why: styling drifts and duplicates when it lives inline. A co-located styles file gives one place to audit spacing rhythm, theme correctness, and responsive behavior per surface. Document non-obvious choices (accent locks, breakpoints) in comments there.

This skill does not dictate the _visual_ design — pair it with a design/component skill for that. It dictates only _where styling lives_.

---

## 6. Naming conventions

Consistent naming makes the structure self-describing.

- **Interfaces are prefixed with `I`** — `IFeatureUiState`, `IInvoiceListParams`, `IUserProfile`. Type aliases (unions, mapped types, primitives) are **not** prefixed (`type SortDirection = "asc" | "desc"`).
- **Components**: `PascalCase` files and exports — `InvoiceListPage.tsx`, `LineItemRow.tsx`.
- **Pages/screens**: `kebab-case` directories, the component file matches — `pages/invoice-list/invoice-list.tsx`.
- **Hooks**: `useCamelCase` — `useInvoiceList`, `useFeatureUiStore`.
- **Stores**: `{feature}.store.ts` (Zustand/MobX), `{feature}.slice.ts` (Redux), `{feature}.atoms.ts` (Jotai). Hook is `use{Feature}{Purpose}Store`.
- **Styles**: `{name}.styles.ts` co-located with its owner.
- **Constants**: `SCREAMING_SNAKE_CASE` values; `kebab-case` or `camelCase` files.
- **Barrels**: always `index.ts`.

---

## 7. Framework adapters

The module/page/state model is constant. Only the thin routing layer on top changes. Pages always live in `modules/`; the routing layer just **mounts** them.

### 7.1 Next.js (App Router)

- `src/app/` holds route segments and route groups (`(marketing)`, `(app)`, `(public)`) for layout/auth boundaries. Route files are thin: import a page component from a module barrel and render it.
- Default to **Server Components**; mark interactive leaves `"use client"`. Providers (query client, store, theme) live in a `"use client"` boundary.

```tsx
// app/(app)/invoices/page.tsx — thin route file
import { InvoiceListPage } from "@/modules/invoice";
export default function Page() {
  return <InvoiceListPage />;
}
```

### 7.2 React + Vite (SPA)

- A `src/routes/` (or single `router.tsx`) declares the route table (React Router / TanStack Router) and maps paths to module page components. Everything is client-side. Wrap the tree once with the query-client and store/theme providers at the app root.

### 7.3 Remix

- Route modules in `app/routes/` stay thin and re-export/mount module page components; loaders/actions delegate to the module's `services/`. Module boundaries are unchanged.

### 7.4 Expo / React Native

- Routing is **Expo Router** (file-based, in `app/`) or React Navigation (`navigation/`). Route/screen files are thin and import screen components from module barrels.
- "Pages" are "screens" — same directory pattern: `pages/{screen}/{screen}.tsx` + `{screen}.styles.ts`.
- Query layer + client store run unchanged (TanStack Query, Zustand, Redux, MobX, Jotai all work in RN). The typed `api-client` is shared logic and works as-is.
- Styling uses **Tamagui** (recommended for shared web+native), `StyleSheet`, or Nativewind. Keep module logic DOM-free.

```tsx
// app/invoices/index.tsx (Expo Router) — thin screen file
import { InvoiceListScreen } from "@/modules/invoice";
export default InvoiceListScreen;
```

### 7.5 Sharing across web + native

If you target both web and Expo, push framework-free code (types, validators, formatters, the API client contract) into a shared package consumed by both apps, and prefer **Tamagui** for components that must render on both. Module boundaries stay the same on both sides.

---

## 8. Conventions checklist (enforce in review)

- [ ] New feature → new `modules/{feature}/` with `index.ts` + `README.md`, not files scattered into `shared/`.
- [ ] New route → a **page/screen directory** (`{page}.tsx` + `{page}.styles.ts` + `index.ts` + `README.md`), not a loose file.
- [ ] Cross-module imports go through the barrel (`@/modules/{feature}`) — no deep internal paths.
- [ ] Server data is in the query/cache layer; UI state is in the module store; **neither leaks into the other** (whatever libraries are chosen).
- [ ] No `fetch()` in components — only typed data hooks built on the shared client.
- [ ] No inline styles — co-located `{name}.styles.ts` (Tailwind/CSS Modules/Tamagui/StyleSheet/styled-components).
- [ ] Components/hooks/utils placed at the narrowest scope; promoted only when a 2nd consumer appears.
- [ ] One store unit per module, accessed via the barrel, with selectors and a `reset`.
- [ ] Interfaces use the `I` prefix; components/hooks/files follow §6.
- [ ] Query keys/tags come from a per-module factory; invalidation is hierarchical.
- [ ] Routing files are thin — they mount module pages and own only layout/auth boundaries.
- [ ] Module/page READMEs updated when routes, params, or data deps change.

---

## 9. Component promotion (start local, move outward)

A component is born in the narrowest scope that uses it and is **promoted** only when a second consumer appears. Never pre-place a component "because it might be reused."

| A component used by…   | Lives in                          | Imported as                        |
| ---------------------- | --------------------------------- | ---------------------------------- |
| Only one page          | `pages/{page}/components/`        | relative path within the page      |
| 2+ pages in one module | `modules/{feature}/components/`   | `@/modules/{feature}` (via barrel) |
| 2+ modules             | `shared/components/`              | `@/shared/...`                     |
| 2+ apps / repos        | a published design-system package | the package name                   |

The same ladder applies to **hooks**, **utils**, and **constants**: local → module → shared → package. Promotion is a deliberate move (update the import sites), not a guess made up front.

---

## 10. How to apply this skill

**Scaffolding a new app:** create `src/modules/`, `src/shared/`, and the framework routing layer (§7). Add the shared `api-client`, the query layer, and your chosen client-store provider. Drop a store template into the first module.

**Adding a feature:** create `modules/{feature}/` with the full subfolder set (`pages/ components/ hooks/ stores/ services/ utils/ constants/ types/`), a curated `index.ts`, and a `README.md`. Build the first screen as a page directory.

**Deciding where code goes:** ask "who consumes this?" → narrowest scope wins (§9). Ask "where did this data come from?" → server = query layer, UI = store (§4).

**Reviewing structure:** run the checklist in §8. The most valuable catches are state-origin leaks (server data in the client store) and deep cross-module imports (bypassing the barrel) — both erode the architecture fastest.

---

## Publishing / installing this skill

This skill follows the Anthropic `SKILL.md` format and is portable across agents. To make it installable and discoverable (e.g. on skills.sh / `npx skills`):

1. Put this folder under a `skills/` directory in a **public GitHub repo** (path like `skills/frontend-architecture/SKILL.md`).
2. Keep the frontmatter `name` and a high-signal `description` (above) — that description is what discovery indexes match against.
3. Install from any project with: `npx skills add <org>/<repo> --skill "frontend-architecture"`.
4. Non-`SKILL.md` agents can be pointed here from `AGENTS.md` / `CLAUDE.md`; Kiro can mirror it as a steering file.

## Limitations

- Use this skill only when the task clearly matches its upstream source and local project context.
- Verify commands, generated code, dependencies, credentials, and external service behavior before applying changes.
- Do not treat examples as a substitute for environment-specific tests, security review, or user approval for destructive or costly actions.
