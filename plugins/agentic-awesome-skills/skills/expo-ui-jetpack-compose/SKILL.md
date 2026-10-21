---
name: expo-ui-jetpack-compose
description: Build Android-native Expo SDK 55 UI with Jetpack Compose views/modifiers, Host sizing and platform-specific integration.
risk: critical
source: community
date_added: "2026-03-06"
---


> The instructions in this skill apply to SDK 55 only. For other SDK versions, refer to the Expo UI Jetpack Compose docs for that version for the most accurate information.

## When to Use
- You need to build Android-native UI in Expo using `@expo/ui/jetpack-compose`.
- The task involves choosing Compose views or modifiers, embedding them in `Host`, or translating Jetpack Compose patterns into Expo UI code.
- You are working specifically against Expo SDK 55 behavior for Jetpack Compose integration.

## Installation

```bash
npx expo install @expo/ui
```

A native rebuild is required after installation (`npx expo run:android`).

## Instructions

- Expo UI's API mirrors Jetpack Compose's API. Use Jetpack Compose and Material Design 3 knowledge to decide which components or modifiers to use.
- Components are imported from `@expo/ui/jetpack-compose`, modifiers from `@expo/ui/jetpack-compose/modifiers`.
- When about to use a component, fetch its docs to confirm the API - https://docs.expo.dev/versions/v55.0.0/sdk/ui/jetpack-compose/{component-name}/index.md
- When unsure about a modifier's API, refer to the docs - https://docs.expo.dev/versions/v55.0.0/sdk/ui/jetpack-compose/modifiers/index.md
- Every Jetpack Compose tree must be wrapped in `Host`. Use `<Host matchContents>` for intrinsic sizing, or `<Host style={{ flex: 1 }}>` when you need explicit size (e.g. as a parent of `LazyColumn`). Example:

```jsx
import { Host, Column, Button, Text } from "@expo/ui/jetpack-compose";
import { fillMaxWidth, paddingAll } from "@expo/ui/jetpack-compose/modifiers";

<Host matchContents>
  <Column verticalArrangement={{ spacedBy: 8 }} modifiers={[fillMaxWidth(), paddingAll(16)]}>
    <Text style={{ typography: "titleLarge" }}>Hello</Text>
    <Button onPress={() => alert("Pressed!")}>Press me</Button>
  </Column>
</Host>;
```

## Key Components

- **LazyColumn** — Use for a Compose-native list when the platform-specific design calls for it; do not replace React Native lists universally. Wrap in `<Host style={{ flex: 1 }}>`.
- **Icon** — Use `<Icon source={require('./icon.xml')} size={24} />` with Android XML vector drawables from [Material Symbols](https://fonts.google.com/icons).

## Limitations
- APIs target SDK 55; check that version’s actual Expo docs and installed package before editing. Android/iOS examples are platform-specific, not interchangeable or proof of real-device behavior. Existing framework and user requirements take precedence.
- Native rebuilds install/execute dependencies and change the project; review the intended development target first. icon.xml and app code are application assets, not bundled files.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.
