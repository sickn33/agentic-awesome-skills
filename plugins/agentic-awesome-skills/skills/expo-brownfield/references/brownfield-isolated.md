# Brownfield: Isolated Approach

Build the React Native + Expo code as a prebuilt native library, **AAR** on Android and **XCFramework** on iOS, and consume it from the existing native app like any other dependency.

## When to use

- Native and React Native are owned by different teams or release on different cadences.
- The native team must not be required to install Node.js, Yarn, or React Native tooling.
- React Native code lives in a separate repo or monorepo from the native app.
- You want the smallest possible footprint on the existing native build pipeline.

If a single team owns both layers, is comfortable with React Native tooling and needs deep integration, see [./brownfield-integrated.md](./brownfield-integrated.md).

## What you produce

| Platform | Artifact                                                                                                                                                                                            | Default location                                              |
| -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| Android  | `{group}:{libraryName}:{version}` AAR                                                                                                                                                               | Local Maven (`~/.m2`) by default; remote Maven also supported |
| iOS      | Set of `.xcframework`s — see [the iOS section below](#ios) for how `ios.buildReactNativeFromSource` (default `false` on SDK 56+) controls whether you get 5 frameworks or 2 — or a single Swift Package via `--package` | `./artifacts`                                                 |

The JavaScript bundle is **embedded inside the artifact** in release builds, so the native app does not need Metro at runtime in production.

## Prerequisites

- **Expo SDK 55 or later** — brownfield support, `expo-brownfield`, and the required runtime classes are only available on SDK 55+. Earlier SDKs will not work.
- **Node.js (LTS)** — runs JavaScript and the Expo CLI.
- **Yarn** — manages JavaScript dependencies.

Node and Yarn are only needed in the environment that _builds_ the artifact. The consuming native app does not need them.

---

## 1) Set up the Expo project

### Create a new Expo project

```sh
npx create-expo-app@latest my-project --template default@sdk-55
```

**Pin to SDK 55 or later — earlier SDKs do not support brownfield.** The project can live in a separate repo or alongside the native app in a monorepo; it does not need to be inside the native project.

### Install expo-brownfield

```sh
cd my-project
npx expo install expo-brownfield
```

The plugin self-registers in `app.json` with defaults derived from your app config.

### Configure the plugin (optional)

To override the auto-generated names, expand the plugin entry in `app.json`:

```json
{
  "expo": {
    "plugins": [
      [
        "expo-brownfield",
        {
          "ios": {
            "targetName": "MyBrownfield",
            "bundleIdentifier": "com.example.mybrownfield"
          },
          "android": {
            "libraryName": "mybrownfield",
            "group": "com.example",
            "package": "com.example.mybrownfield",
            "version": "1.0.0"
          }
        }
      ]
    ]
  }
}
```

**iOS options** — `targetName` (XCFramework target name), `bundleIdentifier` (framework bundle ID).

**Android options** — `libraryName` (AAR name), `group` (Maven group ID), `package` (Android package), `version` (library version), `publishing` (Maven publication targets — see [Publishing the Android AAR](#publishing-the-android-aar)).

### Speed up iOS builds with prebuilt Expo modules

Enable `expo-build-properties`'s `ios.usePrecompiledModules` so `pod install` downloads each Expo module as a prebuilt `.xcframework` instead of compiling it from source. `build:ios` detects those xcframeworks under `ios/Pods/` and bundles them into the Swift Package output alongside the brownfield framework, React, Hermes, and `ReactNativeDependencies`.

```json
{
  "expo": {
    "plugins": [
      ["expo-build-properties", { "ios": { "usePrecompiledModules": true } }],
      "expo-brownfield"
    ]
  }
}
```

When precompiled modules are detected, `build:ios` is pinned to a single flavor (`--debug` or `--release`) per package — Swift Package Manager has no per-configuration overload for `.binaryTarget(path:)`. Build once per flavor and distribute the two packages side by side.

---

## 2) Build the native libraries

### Android

```sh
npx expo-brownfield build:android
```

Produces an AAR and publishes it to the local Maven repository at `~/.m2`. The Maven coordinates come from the plugin config — e.g. `com.example:mybrownfield:1.0.0`.

#### Publishing the Android AAR

The plugin's `publishing` option controls where the AAR is published. When unset, it defaults to local Maven. To push to other targets (e.g. a shared CI Maven, an internal Artifactory/Nexus, or a folder pulled into another build), declare the publications explicitly:

```json
{
  "expo": {
    "plugins": [
      [
        "expo-brownfield",
        {
          "android": {
            "libraryName": "mybrownfield",
            "group": "com.example",
            "version": "1.0.0",
            "publishing": [
              { "type": "localMaven" },
              {
                "type": "localDirectory",
                "name": "build",
                "path": "./out/maven"
              },
              {
                "type": "remotePublic",
                "name": "company",
                "url": "https://maven.example.com/releases"
              },
              {
                "type": "remotePrivate",
                "name": "artifactory",
                "url": { "variable": "ARTIFACTORY_URL" },
                "username": { "variable": "ARTIFACTORY_USER" },
                "password": { "variable": "ARTIFACTORY_TOKEN" }
              }
            ]
          }
        }
      ]
    ]
  }
}
```

Supported `type` values: `localMaven`, `localDirectory`, `remotePublic`, `remotePrivate`. For private repos, credentials and URL accept either inline strings or `{ "variable": "ENV_VAR_NAME" }` to read from the environment at publish time.

By default, `build:android` runs every declared publication. To pick specific publications or repositories from the command line, use the CLI flags:

```sh
npx expo-brownfield build:android --task publishReleasePublicationToCompanyRepository
npx expo-brownfield tasks:android   # list available publish tasks and repositories
```

### iOS

```sh
npx expo-brownfield build:ios
```

Outputs to `./artifacts`. The set depends on the `ios.buildReactNativeFromSource` flag (set via `expo-build-properties`):

- **`buildReactNativeFromSource: false`** (default on SDK 56+) — React Native is consumed as a prebuilt binary, so `build:ios` emits five xcframeworks side-by-side: `{TargetName}.xcframework`, `React.xcframework`, `ReactNativeDependencies.xcframework`, `ExpoModulesJSI.xcframework`, and `hermesvm.xcframework`.
- **`buildReactNativeFromSource: true`** (default on SDK 55, opt-in on SDK 56+) — React Native is compiled from source and statically linked into the brownfield framework, leaving two xcframeworks: `{TargetName}.xcframework` and `hermesvm.xcframework`.

To force source builds on SDK 56+, add `expo-build-properties` to `app.json`:

```json
{
  "expo": {
    "plugins": [
      ["expo-build-properties", { "ios": { "buildReactNativeFromSource": true } }],
      "expo-brownfield"
    ]
  }
}
```

**Every xcframework in the produced set must be embedded in the consuming app** (Embed & Sign). The Swift Package output below (`--package`) wires this for you automatically.

> **iOS deployment target:** the brownfield artifact inherits the Expo project's iOS deployment target (16.4 on SDK 56+). The consuming app's deployment target must be set to 16.4 or higher; otherwise Xcode will refuse to link the embedded frameworks. If the host app is on an older floor (e.g. iOS 14.0), bump its `IPHONEOS_DEPLOYMENT_TARGET` before adding the artifact.

#### Ship as a Swift Package (recommended)

Pass `--package [name]` to bundle the output as a self-contained Swift Package instead of separate `.xcframework` directories. The host iOS app then consumes it via **Add Package Dependencies → Add Local** in Xcode and links every bundled framework automatically — no manual drag-and-drop, no per-framework "Embed & Sign" toggles.

```sh
npx expo-brownfield build:ios --release --package MyAppPackage
```

The flag accepts an optional name. If omitted, the package is named `{TargetName}Artifacts`. The resulting directory is a complete Swift Package:

```
artifacts/MyAppPackage/
├── Package.swift
└── xcframeworks/
    ├── MyAppPackage.xcframework
    ├── hermesvm.xcframework
    ├── React.xcframework
    └── ReactNativeDependencies.xcframework
```

When `usePrecompiledModules` is enabled, the package directory is suffixed with the build flavor (e.g. `MyAppPackage-release/`) and includes every prebuilt Expo module xcframework. Run `build:ios --debug --package …` and `build:ios --release --package …` separately, and point your host app at the matching package for each build configuration.

### Generate native projects for debugging

To inspect or debug the generated native code, run prebuild:

```sh
npx expo prebuild
```

This creates `android/` and `ios/` directories containing the brownfield wrappers:

**Android (Kotlin):** `ReactNativeHostManager`, `BrownfieldActivity`, `ReactNativeFragment`, `ReactNativeViewFactory`, `BrownfieldMessaging`.

**iOS (Swift):** `ReactNativeHostManager`, `ReactNativeViewController`, `ReactNativeView` (SwiftUI), `BrownfieldMessaging`, `ReactNativeDelegate`.

---

## 3) Consume from the native app

### Android

#### Add the Maven dependency

In `app/build.gradle.kts`:

```kotlin
dependencies {
  implementation("com.example:mybrownfield:1.0.0")
}
```

If consuming from the local Maven repo, register `mavenLocal()` in `settings.gradle.kts`:

```kotlin
dependencyResolutionManagement {
  repositories {
    google()
    mavenCentral()
    mavenLocal()
  }
}
```

> **Note:** `mavenLocal()` must be added under `dependencyResolutionManagement`, not the deprecated top-level `allprojects { repositories { ... } }` block.

If the artifact is published to a remote Maven, declare that repository in the same `dependencyResolutionManagement` block instead — credentials follow Gradle's standard `maven { url = uri(...); credentials { username = ...; password = ... } }` form.

#### Show a React Native screen

Extend `BrownfieldActivity` and call `showReactNativeFragment()`:

```kotlin
import android.os.Bundle
import com.example.mybrownfield.BrownfieldActivity
import com.example.mybrownfield.showReactNativeFragment

class ExpoActivity : BrownfieldActivity() {
  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)
    showReactNativeFragment()
  }
}
```

`BrownfieldActivity` extends `AppCompatActivity` and forwards configuration changes. `showReactNativeFragment()` registers the React Native root fragment and wires native back-button handling automatically.

Register the activity in `AndroidManifest.xml`:

```xml
<activity
  android:name=".ExpoActivity"
  android:theme="@style/Theme.AppCompat.Light.NoActionBar"
  android:configChanges="keyboard|keyboardHidden|orientation|screenLayout|screenSize|smallestScreenSize|uiMode"
/>
```

Launch it from native code:

```kotlin
startActivity(Intent(this, ExpoActivity::class.java))
```

### iOS

#### Add the artifacts to the Xcode project

If you built a **Swift Package** (`build:ios --package …`):

- In Xcode, **File → Add Package Dependencies… → Add Local…**, then select the generated package directory (e.g. `artifacts/MyAppPackage/`).
- Add the package's product to your app target. Xcode links every bundled XCFramework through the aggregate library product — no manual "Embed & Sign" step.
- If you produced both debug and release packages (because `usePrecompiledModules` is enabled), point the host app at the matching package per build configuration.

If you built **standalone XCFrameworks** (default output):

- Drag **every** `.xcframework` produced under `./artifacts` into the Xcode project navigator.
- In the import dialog, check **Copy items if needed** and add them to your app target.
- Under the app target's **General** tab → **Frameworks, Libraries, and Embedded Content**, set **every** framework to **Embed & Sign**. Forgetting one (commonly `hermesvm.xcframework`) is a leading cause of runtime "Library not loaded" crashes — see [./troubleshooting.md](./troubleshooting.md#ios-xcframework-signing-isolated-approach).

#### Initialize React Native at app launch

Call `ReactNativeHostManager.shared.initialize()` from `AppDelegate` **before any React Native view is created**. Initialization is asynchronous-friendly but must precede the first `ReactNativeViewController`/`ReactNativeView` instantiation.

```swift
import UIKit
import MyAppBrownfield // Replace with your target name

@main
class AppDelegate: UIResponder, UIApplicationDelegate {
  func application(
    _ application: UIApplication,
    didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?
  ) -> Bool {
    ReactNativeHostManager.shared.initialize()
    return true
  }
}
```

#### Present a React Native view (UIKit)

```swift
import UIKit
import MyAppBrownfield

class ViewController: UIViewController {
  @IBAction func openReactNative(_ sender: Any) {
    let rnViewController = ReactNativeViewController(moduleName: "main")
    navigationController?.pushViewController(rnViewController, animated: true)
  }
}
```

Pass props and launch options if needed:

```swift
let rnViewController = ReactNativeViewController(
  moduleName: "main",
  initialProps: ["userId": "123"],
  launchOptions: [:]
)
```

> **Note:** `moduleName` must match the name registered via `AppRegistry.registerComponent(...)` in the Expo project's JS entry point. The default Expo template registers `"main"`.

#### Present a React Native view (SwiftUI)

```swift
import SwiftUI
import MyAppBrownfield

struct ContentView: View {
  @State private var showReactNative = false

  var body: some View {
    Button("Open React Native") {
      showReactNative = true
    }
    .fullScreenCover(isPresented: $showReactNative) {
      ReactNativeView(moduleName: "main")
    }
  }
}
```

---

## Development vs. production

### Development (debug builds)

Start Metro in the Expo project:

```sh
npx expo start
```

Build and run the native app in debug. React Native screens load JS from the Metro dev server over HTTP with full hot reloading. The device or emulator must be able to reach the dev machine — see [./troubleshooting.md](./troubleshooting.md) if Metro connections fail.

### Production (release builds)

The JS bundle is embedded inside the AAR/XCFramework. Metro is not used. Build the native app in Release configuration and confirm the React Native screen loads.

---

## Related references

- [./brownfield-integrated.md](./brownfield-integrated.md) — Alternative: add RN directly to the native build.
- [./comparison.md](./comparison.md) — Decide between isolated and integrated.
- [./troubleshooting.md](./troubleshooting.md) — Common Metro, build, and integration issues.
