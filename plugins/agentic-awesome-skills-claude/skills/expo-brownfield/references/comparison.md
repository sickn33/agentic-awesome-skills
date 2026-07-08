# Brownfield: Isolated vs. Integrated

Use this reference to choose between the two ways of adding React Native + Expo to an existing native app. If the team and constraints are already known, jump to one of:

- [./brownfield-isolated.md](./brownfield-isolated.md) — RN as a prebuilt AAR / XCFramework.
- [./brownfield-integrated.md](./brownfield-integrated.md) — RN added directly to existing Gradle / CocoaPods.

## Quick decision rules

- **Choose isolated** if the native team must consume React Native as a regular library (AAR or XCFramework) without installing Node, Yarn, or RN tooling.
- **Choose isolated** if React Native and the native app live in **separate repositories**, or release on **different cadences**.
- **Choose isolated** if the existing native build is heavily customized (Tuist, Bazel, Buck, custom Gradle plugins) and adding the React Native Gradle plugin or CocoaPods autolinking would be disruptive.
- **Choose integrated** if a **single team** owns the native and React Native code and is willing to maintain the RN build chain inside the native project.
- **Choose integrated** if you want **hot reload, JS source maps, and devtools** to "just work" inside the existing native build with no extra orchestration.
- **Choose integrated** if you expect to add many Expo modules and want them autolinked by the standard Expo tooling rather than rebuilt into a fresh artifact each time.

When in doubt — and especially when the question is "can the native team avoid React Native tooling?" — pick **isolated**.

## Comparison

| Dimension                                            | Isolated                                                                | Integrated                                                            |
| ---------------------------------------------------- | ----------------------------------------------------------------------- | --------------------------------------------------------------------- |
| What ships to the native app                         | Prebuilt AAR + XCFramework                                              | React Native + Expo sources, autolinked into the existing build       |
| Native team needs Node / Yarn / RN CLI               | **No**                                                                  | **Yes**                                                               |
| Build-system footprint                               | Minimal — one Maven dependency, two embedded XCFrameworks               | Pervasive — React Native Gradle plugin, Podfile, autolinking, codegen |
| Iteration speed for RN devs                          | Fast in isolation; native rebuild needed to pick up new artifact        | Fast end-to-end; one combined build                                   |
| Dev-time hot reload                                  | Yes (via Metro, when running the consumer app in debug)                 | Yes (native build embeds Metro detection)                             |
| Production JS bundle location                        | Embedded in the AAR/XCFramework                                         | Embedded in the APK/IPA by the RN Gradle plugin / Xcode build phase   |
| Maintenance ownership                                | RN team owns the artifact pipeline; native team owns the consumer build | One team owns the unified build                                       |
| Suitability for incremental adoption                 | High — easy to slot into one screen of an existing app                  | High, but with more setup before the first screen renders             |
| Suitability for multi-repo / multi-team setups       | High                                                                    | Low — tends to require a monorepo                                     |
| Risk of build-system conflicts with existing tooling | Low                                                                     | Higher (RN Gradle plugin, codegen, Podfile assumptions)               |
| Re-publish workflow for RN changes                   | `npx expo-brownfield build:*` then bump the dependency                  | Rebuild the native app                                                |

## Common scenarios

**"React Native code is in `xyz-react` and the native apps are in `xyz-ios` and `xyz-android`. Each ships independently."**
→ **Isolated.** Build versioned artifacts (`com.xyz:onboarding:1.4.0`, `Onboarding.xcframework`). Native apps pin a version like any other dependency.

**"Our app uses a heavily customized Gradle setup with multiple variants and flavors."**
→ **Isolated.** The RN Gradle plugin is opinionated about variant naming and bundle output paths; integrating cleanly with non-standard variants is non-trivial.

**"We don't know yet whether RN will stay — we want to be able to remove it cheaply."**
→ **Isolated.** Removing the dependency removes the framework; the native build is barely touched.

**"Our iOS team uses Tuist and refuses to add Node to the iOS build."**
→ **Isolated.** Ship an XCFramework. The iOS team adds two `.xcframework` files and one call to `ReactNativeHostManager.shared.initialize()` in `AppDelegate`. No Node, no CocoaPods changes to Expo.

**"We have one repo, one team, and we want to deeply integrate React Native with the onboarding flow to an existing Android app."**
→ **Integrated.** Move the existing `android-project` into `my-project/android/`, add the React Native Gradle plugin to `settings.gradle`, register `MainApplication`, and host the flow in a `ReactActivity`. One build pipeline.

**"We want to use CNG on the RN code and not worry about manual RN upgrades."**
→ **Isolated.** The AAR/XCFramework approach decouples the Expo RN version from the native app's build, so you can upgrade Expo and React Native independently of the native app's release cycle. The integrated approach requires more coordination between the RN version and the native app's build.

## What is identical between the approaches

- The React Native + Expo source code itself — the same Expo project, the same `app.json`, the same modules — only differs in **how** it is shipped.
- The JavaScript module registered with `AppRegistry.registerComponent("main", () => App)` is the same; the native side passes the same `moduleName` string in both flows.

## What is different at runtime

- **Isolated** uses Expo's brownfield runtime wrappers — `ReactNativeHostManager`, `BrownfieldActivity`, `ReactNativeViewController`, `ReactNativeView`. These are generated by `npx expo-brownfield build:*` and bundled into the artifact.
- **Integrated** uses the standard React Native runtime — `ReactActivity`, `ReactActivityDelegate`, `RCTReactNativeFactory`, `ExpoReactNativeFactory` — exposed by `react-native` and `expo` directly.
