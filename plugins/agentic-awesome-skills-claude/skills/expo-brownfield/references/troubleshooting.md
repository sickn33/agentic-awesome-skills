# Brownfield Troubleshooting

Cross-cutting issues that apply to both the isolated and integrated approaches. For approach-specific setup, see [./brownfield-isolated.md](./brownfield-isolated.md) or [./brownfield-integrated.md](./brownfield-integrated.md).

## Build failures

**Symptom:** Gradle or Xcode build fails after a config change, dependency upgrade, or Expo SDK bump.

- **Integrated approach** — regenerate native projects from scratch:
  ```sh
  npx expo prebuild --clean
  ```
  Then `cd ios && pod install` and re-open the `.xcworkspace`.
- **Isolated approach** — clear the local Maven cache and rebuild the artifact:
  ```sh
  rm -rf ~/.m2/repository/<group>/<libraryName>
  npx expo-brownfield build:android
  npx expo-brownfield build:ios
  ```
- For stubborn iOS issues, also delete `ios/build/`, `ios/Pods/`, and `ios/Podfile.lock`, then re-run `pod install`.
- For stubborn Android issues, `./gradlew clean` and delete the project's `.gradle/` and `build/` directories.

## Missing autolinked Expo modules

**Symptom:** Compilation succeeds but a module throws "Native module cannot be null" / "Cannot find native module 'X'" at runtime.

- Install with `npx expo install <package>` rather than plain `yarn add` — `expo install` picks the version compatible with the current SDK.
- After installing a new module, rebuild the native app. Autolinking runs at native build time, not at JS bundle time.
- For the **isolated approach**, you must re-run `npx expo-brownfield build:android|ios` after adding a module, and republish/re-embed the new artifact.

## Metro connection

**Symptom:** "Could not connect to development server" / red screen on launch in debug.

- Ensure the device or emulator can reach the dev machine. The Android emulator can talk to the host via `10.0.2.2`; physical devices need a reachable LAN IP.
- For physical Android devices on USB: `adb reverse tcp:8081 tcp:8081`.
- Confirm Metro is actually running: `npx expo start` from the Expo project (or `yarn start` from the workspace root).
- Verify the debug `AndroidManifest.xml` enables cleartext traffic — Android 9+ blocks HTTP by default. The debug variant should include `android:usesCleartextTraffic="true"` on `<application>`, or a `network_security_config` allowing the dev server.
- iOS simulator: Metro should be reachable at `localhost:8081`. If it is not, check that ATS exceptions are still in place in `Info.plist` for `localhost` (the Expo template ships this by default).

## iOS XCFramework signing (isolated approach)

**Symptom:** App launches but immediately crashes with "Library not loaded" or codesign errors during archive.

- **Every** xcframework produced by `build:ios` must be set to **Embed & Sign** in the app target's **Frameworks, Libraries, and Embedded Content** section. On SDK 56+ this is five frameworks: `{TargetName}.xcframework`, `React.xcframework`, `ReactNativeDependencies.xcframework`, `ExpoModulesJSI.xcframework`, and `hermesvm.xcframework`. On SDK 55 it's two: `{TargetName}.xcframework` and `hermesvm.xcframework`. Missing any of them is a common cause of runtime crashes.
- The frameworks must be added to the _app target_, not a framework or extension target.
- Prefer the Swift Package output (`build:ios --package`) — it links every bundled xcframework through one aggregate product, so you cannot forget one.

## iOS architecture / simulator mismatch

**Symptom:** "Building for iOS Simulator, but the linked library was built for iOS" or "Undefined symbols for architecture arm64".

- The XCFramework includes both device and simulator slices. If a slice is missing, rebuild on the missing platform. The `expo-brownfield build:ios` command produces both by default.
- On Apple Silicon simulators, do **not** set `EXCLUDED_ARCHS = arm64` for the simulator configuration — Apple Silicon simulators require `arm64`. The classic Rosetta-only exclusion is no longer correct.

## Android `mavenLocal()` not found (isolated approach)

**Symptom:** Gradle reports "Could not find com.example:mybrownfield:1.0.0" even after a successful `expo-brownfield build:android`.

- `mavenLocal()` must be declared under `dependencyResolutionManagement { repositories { ... } }` in `settings.gradle.kts`, not the deprecated top-level `allprojects { repositories { ... } }` block. The deprecated form is silently ignored when `dependencyResolutionManagement` is present.
- Confirm the artifact actually landed in `~/.m2`:
  ```sh
  find ~/.m2/repository -name "mybrownfield*"
  ```
- Verify the `group` and `libraryName` in the consumer's dependency line match what the plugin config emitted.

## Module name mismatch

**Symptom:** The native view loads but renders a blank screen, with "Application 'X' has not been registered" in the JS logs.

- The `moduleName` passed to `ReactNativeViewController(moduleName: "main")` (iOS) or returned from `getMainComponentName()` (Android) must equal the name passed to `AppRegistry.registerComponent("main", () => App)` in the JS entry point.
- The default Expo template registers `"main"`. If you changed the registration, update every native call site.

## Monorepo: autolinking can't find the Expo project

**Symptom:** Gradle or CocoaPods fails resolving Expo modules even though they are installed.

- **Android (integrated):** set `root = file("../../my-project")` (or the correct relative path) inside the `react { ... }` block in `app/build.gradle`, and explicitly set the project root in `settings.gradle` before `expoAutolinking.useExpoModules()`.
- **iOS (integrated):** set `:app_path` in `use_react_native!` to the absolute path of the Expo project root. Optionally pass `EXPO_PROJECT_ROOT=/abs/path` to `pod install`.
- Confirm `node_modules/` is installed at the workspace root (`yarn install` from the monorepo root, not from the Expo project subdirectory).

## After upgrading Expo SDK

If the brownfield setup stops building after an SDK upgrade:

- Re-run `npx expo install --fix` in the Expo project to align native module versions.
- Rebuild the artifact (isolated) or run `npx expo prebuild --clean` (integrated).
- Compare the new `templates/expo-template-bare-minimum` for the target SDK against your customized native files — Expo occasionally changes Gradle plugin names, Podfile helpers, or AppDelegate entry points across SDKs.
