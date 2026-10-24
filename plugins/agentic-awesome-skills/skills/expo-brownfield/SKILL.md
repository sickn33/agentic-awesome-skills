---
name: expo-brownfield
description: Integrate Expo and React Native into an existing native iOS or Android app. Use when the user mentions brownfield, embedding React Native in a native app, AAR/XCFramework, or adding Expo to an existing Kotlin/Swift project. Covers both the isolated approach and the integrated approach.
risk: critical
source: https://github.com/expo/skills/tree/main/plugins/expo/skills/expo-brownfield
source_repo: expo/skills
source_type: official
date_added: 2026-07-01
license: MIT
license_source: https://github.com/expo/skills/blob/main/LICENSE
---

# Expo Brownfield
## When to Use

Use this skill when you need integrate Expo and React Native into an existing native iOS or Android app. Use when the user mentions brownfield, embedding React Native in a native app, AAR/XCFramework, or adding Expo to an existing Kotlin/Swift project. Covers both the isolated approach and the integrated approach.


A **brownfield** app is an existing native iOS or Android app that adopts React Native incrementally, as opposed to a **greenfield** app that is React Native from day one.

Expo supports two distinct ways to add React Native to a brownfield project:

| Approach       | What ships to the native app                                        | When to choose                                                                   |
| -------------- | ------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| **Isolated**   | Prebuilt AAR / XCFramework                                          | Native team doesn't need Node or RN tooling; RN code can live in a separate repo |
| **Integrated** | React Native sources added to the existing Gradle / CocoaPods build | One team owns everything; comfortable with RN tooling; wants a single build      |

For the full decision matrix, see [./references/comparison.md](./references/comparison.md).

## Pick an approach

Use these quick rules — fall through to `comparison.md` for anything ambiguous.

- **Choose isolated** if the iOS/Android team must consume RN as a regular library dependency (AAR or XCFramework), without installing Node, Yarn, or the React Native build toolchain.
- **Choose isolated** if RN code and native code live in separate repositories or release on independent cadences.
- **Choose integrated** if a single team owns both the native and RN code and is willing to add React Native + Expo to the native project's Gradle and CocoaPods setup.
- **Choose integrated** if you want hot reload and JS source maps to work seamlessly inside the existing native build process.

## References

- ./references/brownfield-isolated.md -- Build RN as AAR/XCFramework and consume from the native app (BrownfieldActivity, ReactNativeViewController, ReactNativeView)
- ./references/brownfield-integrated.md -- Add RN and Expo directly to existing Gradle and CocoaPods builds (ReactActivity, RCTRootView, Podfile)
- ./references/comparison.md -- Decision criteria, trade-offs, and scenario mapping for choosing an approach
- ./references/troubleshooting.md -- Metro connection, build, signing, and module-resolution issues common to both approaches

More information available at https://docs.expo.dev/brownfield/overview/

## Shared prerequisites

Both approaches require, in the environment that _builds_ the React Native side:

- **Node.js (LTS)** — runs the Expo CLI and JavaScript code.
- **Yarn** — manages JavaScript dependencies.

The integrated approach additionally requires **CocoaPods** on iOS, installed using the project’s supported Ruby/Bundler toolchain (avoid changing system Ruby with sudo). The isolated approach does **not** require CocoaPods or any RN tooling in the consuming native app.

## Versioning note

The examples below are SDK-55-era sketches, not a verified cross-version recipe. Choose a supported SDK/RN pair and use that exact SDK’s templates, native deployment targets, plugin APIs and build tool versions. The current official guide may target a newer SDK (SDK 58 at this review); do not combine its artifacts with the old code snippets blindly. A single minimum version for every approach/API is not established here. Historical pinned example:

```sh
npx create-expo-app@latest my-project --template default@sdk-55
```

Keep the RN/Expo native runtime and embedded module versions compatible. Isolated artifacts must not introduce a second conflicting RN runtime into a host that already embeds one.

## Preserve the native host

Take a clean baseline and apply integration changes on a topic branch. Never run prebuild --clean on hand-maintained host native projects; it can delete custom code. Use a separate generated Expo workspace for isolated artifacts and compare version-matched templates when manually adapting an integrated host. Building an Android artifact can publish to configured Maven targets: inspect publication config/tasks first and use only approved destinations. Verify both platforms’ release builds without Metro, host navigation/lifecycle, upgrade/rollback and bundle/dependency provenance before claiming integration complete.

## Limitations

- Use this skill only when the task clearly matches its upstream product or API scope.
- Verify commands, API behavior, pricing, quotas, credentials, and deployment effects against current official documentation before making changes.
- Do not treat generated examples as a substitute for environment-specific tests, security review, or user approval for destructive or costly actions.
