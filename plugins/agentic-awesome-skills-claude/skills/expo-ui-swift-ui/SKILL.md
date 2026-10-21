---
name: expo-ui-swift-ui
description: Build iOS-native Expo SDK 55 UI with SwiftUI views/modifiers, Host/RNHostView embedding and native rebuild prerequisites.
risk: critical
source: community
date_added: "2026-03-06"
---


> The instructions in this skill apply to SDK 55 only. For other SDK versions, refer to the Expo UI SwiftUI docs for that version for the most accurate information.

## When to Use
- You need to build iOS-native UI in Expo using `@expo/ui/swift-ui`.
- The task involves selecting SwiftUI views or modifiers, wrapping trees in `Host`, or embedding React Native components with `RNHostView`.
- You are targeting Expo SDK 55 behavior for SwiftUI integration and extension guidance.

## Installation

```bash
npx expo install @expo/ui
```

A native rebuild is required after installation (`npx expo run:ios`).

## Instructions

- Expo UI's API mirrors SwiftUI's API. Use SwiftUI knowledge to decide which components or modifiers to use.
- Components are imported from `@expo/ui/swift-ui`, modifiers from `@expo/ui/swift-ui/modifiers`.
- When about to use a component, fetch its docs to confirm the API - https://docs.expo.dev/versions/v55.0.0/sdk/ui/swift-ui/{component-name}/index.md
- When unsure about a modifier's API, refer to the docs - https://docs.expo.dev/versions/v55.0.0/sdk/ui/swift-ui/modifiers/index.md
- Every SwiftUI tree must be wrapped in `Host`.
- `RNHostView` is specifically for embedding RN components inside a SwiftUI tree. Example:

```jsx
import { Host, VStack, RNHostView } from "@expo/ui/swift-ui";
import { Pressable } from "react-native";

<Host matchContents>
  <VStack>
    <RNHostView matchContents>
      {/* Pressable is a React Native component, embedded through RNHostView. */}
      <Pressable />
    </RNHostView>
  </VStack>
</Host>;
```

- If a required modifier or View is missing in Expo UI, it can be extended via a local Expo module. See: https://docs.expo.dev/guides/expo-ui-swift-ui/extending/index.md. Confirm with the user before extending.

## Limitations
- APIs target SDK 55; check that version’s actual Expo docs and installed package before editing. Android/iOS examples are platform-specific, not interchangeable or proof of real-device behavior. Existing framework and user requirements take precedence.
- Native rebuilds install/execute dependencies and change the project; review the intended development target first. icon.xml and app code are application assets, not bundled files.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.
