# Example catalog (snapshot)

A categorized view of [expo/examples](https://github.com/expo/examples) for fast triage. Each entry is a **single-concern integration demo** (one library/service, managed project, usually one screen) — not a full app. This snapshot drifts — the **live repo is the source of truth**. Confirm the exact name against `gh api repos/expo/examples/contents` and check `meta.json` for aliases/deprecations (see SKILL.md step 1) before recommending or scaffolding.

Use any name with `npx create-expo --example <name>` (scaffold) or inspect it via `gh api repos/expo/examples/contents/<name>/<file>`.

Most are single-screen integrations; a few differ:

- **Full-stack** (include Expo Router `+api` routes — a backend too): `with-stripe`, `with-clerk`, `with-better-auth`, `with-openai`, `with-router-ai`, `with-graphql`, `with-s3`, `with-satori`.
- **Larger showcases:** `with-shadcn`, `with-router-tv`, `with-router-menus`, `with-react-navigation`, `with-webgpu`.
- **Starters (not integrations):** `blank`, `stickersmash`.

## Auth & identity
- `with-clerk` — Clerk authentication
- `with-auth0` — Auth0 login
- `with-better-auth` — Better Auth
- `with-magic` — Magic passwordless auth
- `with-facebook-auth` — Facebook login
- `with-firebase-saml-login` — Firebase SAML SSO

## Payments
- `with-stripe` — Stripe payments (native + web)

## Backend, data & storage
- `with-convex` — Convex realtime backend
- `with-legend-state-supabase` — Supabase + Legend-State sync
- `with-firebase-storage-upload` — Firebase Storage uploads
- `with-aws-storage-upload`, `with-s3` — AWS / S3 file uploads
- `with-apollo`, `with-graphql` — GraphQL clients
- `with-formdata-image-upload` — multipart image upload

## Local database & state
- `with-sqlite` — expo-sqlite
- `with-libsql` — libSQL / Turso
- `with-tinybase` — TinyBase local-first store
- `with-zustand` — Zustand state management

## Navigation & routing
- `with-router` — Expo Router basics
- `with-react-navigation` — React Navigation (stacks + tabs)
- `with-drawer-navigation` — drawer navigator
- `with-router-menus` — native context menus with Router
- `with-router-uniwind` — Router + Uniwind styling
- `with-router-ai` — Router + AI chat UI
- `with-router-tv` — Router on TV
- `with-react-router` — React Router (web)

## Styling & UI
- `with-tailwindcss` — Tailwind / NativeWind (see also `expo-tailwind-setup` skill)
- `with-styled-components` — styled-components
- `with-shadcn` — shadcn-style components
- `with-moti` — Moti animations
- `with-custom-font` — custom fonts
- `with-svg` — react-native-svg
- `with-icons` — icon sets
- `with-splash-screen` — custom splash screen
- `with-video-background` — full-screen video background

## Animation & graphics
- `with-reanimated` — Reanimated
- `with-skia` — React Native Skia 2D graphics
- `with-three`, `with-react-three-fiber` — three.js / R3F 3D
- `with-webgpu` — WebGPU
- `with-processing` — Processing-style sketches
- `with-react-flow` — node/flow diagrams
- `with-victory-native` — charts

## AI & ML
- `with-openai` — OpenAI API
- `with-router-ai` — AI chat app with Expo Router
- `with-google-vision` — Google Cloud Vision
- `with-tfjs-camera` — TensorFlow.js on the camera

## Media & device
- `with-camera` — expo-camera
- `with-maps` — react-native-maps
- `with-webrtc` — WebRTC
- `with-pdf` — render / view PDFs

## Web & rendering
- `with-nextjs` — Next.js + Expo
- `with-rsc` — React Server Components
- `with-react-strict-dom` — React Strict DOM
- `with-react-compiler` — React Compiler
- `with-html` — render raw HTML
- `with-satori` — OG image generation with Satori
- `with-workbox` — service worker / PWA
- `with-webbrowser-redirect` — expo-web-browser auth redirect

## Platform: TV, widgets
- `with-tv` — Apple TV / Android TV
- `with-widgets` — iOS / Android home-screen widgets

## Tooling, testing & monorepo
- `with-typescript` — TypeScript baseline
- `with-yarn-workspaces` — Yarn monorepo
- `with-storybook` — Storybook
- `with-maestro` — Maestro E2E tests
- `with-sentry` — Sentry error monitoring
- `with-socket-io` — Socket.IO realtime
- `with-github-remote-build-cache-provider` — remote build cache on GitHub

## Starters
- `blank` — minimal app
- `stickersmash` — the tutorial app
