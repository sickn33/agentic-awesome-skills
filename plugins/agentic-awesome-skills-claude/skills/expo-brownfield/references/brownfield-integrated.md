# Brownfield: Integrated Approach

Add React Native and Expo directly to the existing native project's build system — Gradle on Android, CocoaPods on iOS — the same way you would add any other library. The native project gains React Native capabilities while keeping a single, unified build.

## When to use

- A single team owns both the native and React Native code.
- The team is comfortable adding React Native and Expo to the native build (Gradle plugin, CocoaPods pods).
- You want hot reload, JS source maps, and a single Metro instance to "just work" inside the existing build.
- You prefer one repository and one build pipeline over shipping a prebuilt artifact.

If the native team must not need Node, Yarn, or React Native tooling, use [./brownfield-isolated.md](./brownfield-isolated.md) instead.

## Prerequisites

- **Expo SDK 54 or later** — the `ExpoReactHostFactory`, `ExpoReactNativeFactory`, and `ApplicationLifecycleDispatcher` entry points used below require SDK 54+. Earlier SDKs do not support this setup.
- **Node.js (LTS)** — runs JavaScript and the Expo CLI.
- **Yarn** — manages JavaScript dependencies.
- **CocoaPods** (iOS) — `sudo gem install cocoapods`.

---

## 1) Create an Expo project

Create the Expo project inside (or alongside) the existing native project. **Pin to SDK 55 or later — earlier SDKs do not support brownfield integration:**

```sh
npx create-expo-app@latest my-project --template default@sdk-55
```

The new project ships a TypeScript example app. The JS entry point registers a root component under the name `"main"` — this name must match the `moduleName` referenced from the native side later.

## 2) Place native projects under the Expo project

A standard React Native project keeps native code under `android/` and `ios/`. Move the existing native projects in:

```sh
mkdir my-project/android
mv /path/to/your/android-project my-project/android/
# repeat for ios/
```

### Monorepo alternative

If the native projects cannot be moved, set up a monorepo with the Expo project as a workspace. Create a root `package.json`:

```json
{
  "version": "1.0.0",
  "private": true,
  "workspaces": ["my-project"]
}
```

Run `yarn install` at the root. This installs `node_modules` at the workspace root so Gradle and CocoaPods scripts can resolve React Native and Expo dependencies.

> **Monorepo callout:** with a monorepo, the Expo project is not at `../../` from the native projects. You must set `projectRoot` explicitly in Gradle and pass the project root to CocoaPods so autolinking can find the Expo project.

---

## 3) Configure Android

### `settings.gradle`

Register the React Native Gradle plugin and Expo autolinking. Reference: [bare-minimum template `settings.gradle`](https://github.com/expo/expo/blob/main/templates/expo-template-bare-minimum/android/settings.gradle).

```groovy
pluginManagement {
  def reactNativeGradlePlugin = new File(
    providers.exec {
      workingDir(rootDir)
      commandLine("node", "--print", "require.resolve('@react-native/gradle-plugin/package.json', { paths: [require.resolve('react-native/package.json')] })")
    }.standardOutput.asText.get().trim()
  ).getParentFile().absolutePath
  includeBuild(reactNativeGradlePlugin)

  def expoPluginsPath = new File(
    providers.exec {
      workingDir(rootDir)
      commandLine("node", "--print", "require.resolve('expo-modules-autolinking/package.json', { paths: [require.resolve('expo/package.json')] })")
    }.standardOutput.asText.get().trim(),
    "../android/expo-gradle-plugin"
  ).absolutePath
  includeBuild(expoPluginsPath)
}

plugins {
  id("com.facebook.react.settings")
  id("expo-autolinking-settings")
}

extensions.configure(com.facebook.react.ReactSettingsExtension) { ex ->
  ex.autolinkLibrariesFromCommand(expoAutolinking.rnConfigCommand)
}
expoAutolinking.useExpoModules()
expoAutolinking.useExpoVersionCatalog()
includeBuild(expoAutolinking.reactNativeGradlePlugin)
```

> **Monorepo:** add an explicit project root before `expoAutolinking.useExpoModules()` so autolinking finds your Expo project's `node_modules`.

### Top-level `build.gradle`

Add the React Native Gradle plugin classpath and the Expo root-project plugin:

```groovy
buildscript {
  repositories {
    google()
    mavenCentral()
  }
  dependencies {
    classpath('com.android.tools.build:gradle')
    classpath('com.facebook.react:react-native-gradle-plugin')
    classpath('org.jetbrains.kotlin:kotlin-gradle-plugin')
  }
}

allprojects {
  repositories {
    google()
    mavenCentral()
    maven { url 'https://www.jitpack.io' }
  }
}

apply plugin: "expo-root-project"
apply plugin: "com.facebook.react.rootproject"
```

### `app/build.gradle`

Apply the React Native plugin and configure the `react { ... }` block. The full template is at [bare-minimum `app/build.gradle`](https://github.com/expo/expo/blob/main/templates/expo-template-bare-minimum/android/app/build.gradle); the minimum that must change in your existing module:

```groovy
apply plugin: "com.android.application"
apply plugin: "org.jetbrains.kotlin.android"
apply plugin: "com.facebook.react"

def projectRoot = rootDir.getAbsoluteFile().getParentFile().getAbsolutePath()

react {
  entryFile = file(["node", "-e", "require('expo/scripts/resolveAppEntry')", projectRoot, "android", "absolute"].execute(null, rootDir).text.trim())
  reactNativeDir = new File(["node", "--print", "require.resolve('react-native/package.json')"].execute(null, rootDir).text.trim()).getParentFile().getAbsoluteFile()
  codegenDir = new File(["node", "--print", "require.resolve('@react-native/codegen/package.json', { paths: [require.resolve('react-native/package.json')] })"].execute(null, rootDir).text.trim()).getParentFile().getAbsoluteFile()
  cliFile = new File(["node", "--print", "require.resolve('@expo/cli', { paths: [require.resolve('expo/package.json')] })"].execute(null, rootDir).text.trim())
  bundleCommand = "export:embed"
  autolinkLibrariesWithApp()
}
```

> **Monorepo:** set `root = file("../../")` (or wherever your Expo project lives) inside the `react { ... }` block.

### `gradle.properties`

```properties
reactNativeArchitectures=armeabi-v7a,arm64-v8a,x86,x86_64
newArchEnabled=true
hermesEnabled=true
```

`newArchEnabled` and `hermesEnabled` must match across all sub-modules in your build.

### `AndroidManifest.xml`

Add the `INTERNET` permission to your main manifest at `app/src/main/AndroidManifest.xml`:

```xml
<uses-permission android:name="android.permission.INTERNET" />
```

In the debug-variant manifest at `app/src/debug/AndroidManifest.xml`, enable cleartext traffic so the app can talk to the local Metro bundler over HTTP:

```xml
<application
  android:usesCleartextTraffic="true"
  tools:targetApi="28"
  tools:ignore="GoogleAppIndexingWarning">
  ...
</application>
```

### `MainApplication.kt`

Initialize React Native and Expo lifecycle dispatch in your `Application` class:

```kotlin
package com.example.myapp

import android.app.Application
import android.content.res.Configuration

import com.facebook.react.PackageList
import com.facebook.react.ReactApplication
import com.facebook.react.ReactNativeApplicationEntryPoint.loadReactNative
import com.facebook.react.ReactHost
import com.facebook.react.common.ReleaseLevel
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint

import expo.modules.ApplicationLifecycleDispatcher
import expo.modules.ExpoReactHostFactory

class MainApplication : Application(), ReactApplication {

  override val reactHost: ReactHost by lazy {
    ExpoReactHostFactory.getDefaultReactHost(
      context = applicationContext,
      packageList = PackageList(this).packages
    )
  }

  override fun onCreate() {
    super.onCreate()
    DefaultNewArchitectureEntryPoint.releaseLevel = try {
      ReleaseLevel.valueOf(BuildConfig.REACT_NATIVE_RELEASE_LEVEL.uppercase())
    } catch (_: IllegalArgumentException) {
      ReleaseLevel.STABLE
    }
    loadReactNative(this)
    ApplicationLifecycleDispatcher.onApplicationCreate(this)
  }

  override fun onConfigurationChanged(newConfig: Configuration) {
    super.onConfigurationChanged(newConfig)
    ApplicationLifecycleDispatcher.onConfigurationChanged(this, newConfig)
  }
}
```

### `ReactActivity`

Create an `Activity` that hosts a React Native screen. The `moduleName` returned by `getMainComponentName()` must match the name registered via `AppRegistry.registerComponent(...)` in your JS entry point (`"main"` for the default template).

```kotlin
package com.example.myapp

import com.facebook.react.ReactActivity
import com.facebook.react.ReactActivityDelegate
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint.fabricEnabled
import com.facebook.react.defaults.DefaultReactActivityDelegate

import expo.modules.ReactActivityDelegateWrapper

class MyReactActivity : ReactActivity() {

  override fun getMainComponentName(): String = "main"

  override fun createReactActivityDelegate(): ReactActivityDelegate {
    return ReactActivityDelegateWrapper(
      this,
      BuildConfig.IS_NEW_ARCHITECTURE_ENABLED,
      object : DefaultReactActivityDelegate(this, mainComponentName, fabricEnabled) {}
    )
  }
}
```

Register the activity in `AndroidManifest.xml` with a non-ActionBar theme:

```xml
<activity
  android:name=".MyReactActivity"
  android:theme="@style/Theme.AppCompat.Light.NoActionBar"
  android:configChanges="keyboard|keyboardHidden|orientation|screenLayout|screenSize|smallestScreenSize|uiMode"
/>
```

Launch it from existing native code:

```kotlin
startActivity(Intent(this, MyReactActivity::class.java))
```

---

## 4) Configure iOS

The integrated approach drives iOS through CocoaPods + Expo modules autolinking, exactly like a fresh Expo project. The key difference is that you are integrating into your existing Xcode project rather than starting from the template.

### `ios/Podfile`

Create (or update) `ios/Podfile` based on the [bare-minimum Podfile](https://github.com/expo/expo/blob/main/templates/expo-template-bare-minimum/ios/Podfile). The essential lines:

```ruby
require File.join(File.dirname(`node --print "require.resolve('expo/package.json')"`), "scripts/autolinking")
require File.join(File.dirname(`node --print "require.resolve('react-native/package.json')"`), "scripts/react_native_pods")

require 'json'
podfile_properties = JSON.parse(File.read(File.join(__dir__, 'Podfile.properties.json'))) rescue {}

platform :ios, podfile_properties['ios.deploymentTarget'] || '16.4'

prepare_react_native_project!

target 'MyApp' do
  use_expo_modules!

  config_command = [
    'node',
    '--no-warnings',
    '--eval',
    'require(\'expo/bin/autolinking\')',
    'expo-modules-autolinking',
    'react-native-config',
    '--json',
    '--platform',
    'ios'
  ]

  config = use_native_modules!(config_command)

  use_frameworks! :linkage => podfile_properties['ios.useFrameworks'].to_sym if podfile_properties['ios.useFrameworks']

  use_react_native!(
    :path => config[:reactNativePath],
    :hermes_enabled => podfile_properties['expo.jsEngine'] == nil || podfile_properties['expo.jsEngine'] == 'hermes',
    :app_path => "#{Pod::Config.instance.installation_root}/..",
    :privacy_file_aggregation_enabled => podfile_properties['apple.privacyManifestAggregationEnabled'] != 'false',
  )

  post_install do |installer|
    react_native_post_install(installer, config[:reactNativePath], :mac_catalyst_enabled => false)
  end
end
```

Replace `'MyApp'` with the existing Xcode target name. The `:app_path` value tells `use_react_native!` where the JS app lives — set it to the absolute path of your Expo project root if you are in a monorepo.

Create `ios/Podfile.properties.json` alongside the Podfile (defaults are fine):

```json
{
  "expo.jsEngine": "hermes",
  "EX_DEV_CLIENT_NETWORK_INSPECTOR": "true"
}
```

Install pods:

```sh
cd ios && pod install
```

Open the generated `.xcworkspace` (not the `.xcodeproj`) from now on.

### Xcode project changes

Three Xcode-side adjustments are required before the app can build and run a React Native screen. Skip any one and either CocoaPods scripts fail under sandboxing, the JS bundle never lands in the IPA (release crashes looking for `main.jsbundle`), or the status bar fights React Native at runtime.

#### 1. Disable user script sandboxing

In Xcode, select your project → app target → **Build Settings**, search for `ENABLE_USER_SCRIPT_SANDBOXING`, and set it to **No**. CocoaPods' Hermes scripts need to switch between debug and release engine binaries at build time, which sandboxing blocks.

#### 2. Add a Run Script phase to embed the JS bundle

On the app target's **Build Phases** tab, add a new **Run Script** phase **before** `[CP] Embed Pods Frameworks`. This phase bundles JS for release builds and is skipped automatically in debug (Metro serves the bundle then).

```sh
if [[ -f "$PODS_ROOT/../.xcode.env" ]]; then
  source "$PODS_ROOT/../.xcode.env"
fi
if [[ -f "$PODS_ROOT/../.xcode.env.local" ]]; then
  source "$PODS_ROOT/../.xcode.env.local"
fi

export PROJECT_ROOT="$PROJECT_DIR"/..

if [[ "$CONFIGURATION" = *Debug* ]]; then
  export SKIP_BUNDLING=1
fi
if [[ -z "$ENTRY_FILE" ]]; then
  export ENTRY_FILE="$("$NODE_BINARY" -e "require('expo/scripts/resolveAppEntry')" "$PROJECT_ROOT" ios absolute | tail -n 1)"
fi
if [[ -z "$CLI_PATH" ]]; then
  export CLI_PATH="$("$NODE_BINARY" --print "require.resolve('@expo/cli', { paths: [require.resolve('expo/package.json')] })")"
fi
if [[ -z "$BUNDLE_COMMAND" ]]; then
  export BUNDLE_COMMAND="export:embed"
fi

if [[ -f "$PODS_ROOT/../.xcode.env.updates" ]]; then
  source "$PODS_ROOT/../.xcode.env.updates"
fi
if [[ -f "$PODS_ROOT/../.xcode.env.local" ]]; then
  source "$PODS_ROOT/../.xcode.env.local"
fi

`"$NODE_BINARY" --print "require('path').dirname(require.resolve('react-native/package.json')) + '/scripts/react-native-xcode.sh'"`
```

> **Monorepo:** override `PROJECT_ROOT` to point at the Expo project (e.g. `export PROJECT_ROOT="$PROJECT_DIR"/../../my-project`). Without this, bundling looks for `node_modules` in the wrong directory.

This script writes `main.jsbundle` into the app's resources directory in release configurations. Without it, the `bundleURL()` fallback in `ReactNativeDelegate` resolves to `nil` and the React Native screen fails to load whenever Metro is not running.

#### 3. Update `Info.plist`

Set `UIViewControllerBasedStatusBarAppearance` to `NO` so React Native can manage the status bar:

```xml
<key>UIViewControllerBasedStatusBarAppearance</key>
<false/>
```

### `AppDelegate.swift`

Wire React Native into the app delegate via Expo's `ExpoReactNativeFactory`. The delegate's `bundleURL()` selects the Metro dev server in `DEBUG` and the embedded bundle in release.

```swift
internal import Expo
import React
import ReactAppDependencyProvider

@main
class AppDelegate: ExpoAppDelegate {
  var window: UIWindow?

  var reactNativeDelegate: ExpoReactNativeFactoryDelegate?
  var reactNativeFactory: RCTReactNativeFactory?

  public override func application(
    _ application: UIApplication,
    didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil
  ) -> Bool {
    let delegate = ReactNativeDelegate()
    let factory = ExpoReactNativeFactory(delegate: delegate)
    delegate.dependencyProvider = RCTAppDependencyProvider()

    reactNativeDelegate = delegate
    reactNativeFactory = factory

    window = UIWindow(frame: UIScreen.main.bounds)
    factory.startReactNative(
      withModuleName: "main",
      in: window,
      launchOptions: launchOptions
    )

    return super.application(application, didFinishLaunchingWithOptions: launchOptions)
  }
}

class ReactNativeDelegate: ExpoReactNativeFactoryDelegate {
  override func sourceURL(for bridge: RCTBridge) -> URL? {
    bridge.bundleURL ?? bundleURL()
  }

  override func bundleURL() -> URL? {
#if DEBUG
    return RCTBundleURLProvider.sharedSettings().jsBundleURL(forBundleRoot: ".expo/.virtual-metro-entry")
#else
    return Bundle.main.url(forResource: "main", withExtension: "jsbundle")
#endif
  }
}
```

The module name `"main"` must match what the JS side registers with `AppRegistry.registerComponent("main", () => App)`.

### Embedding RN inside an existing screen (not the root window)

If you do not want React Native to take over the whole window, instantiate the factory the same way but mount the produced root view inside an existing `UIViewController`:

```swift
import UIKit
import React
import Expo

class ReactNativeScreenViewController: UIViewController {
  private var reactNativeDelegate: ExpoReactNativeFactoryDelegate?
  private var reactNativeFactory: RCTReactNativeFactory?

  override func viewDidLoad() {
    super.viewDidLoad()

    let delegate = ReactNativeDelegate()
    let factory = ExpoReactNativeFactory(delegate: delegate)
    delegate.dependencyProvider = RCTAppDependencyProvider()
    self.reactNativeDelegate = delegate
    self.reactNativeFactory = factory

    let rootView = factory.rootViewFactory.view(
      withModuleName: "main",
      initialProperties: nil,
      launchOptions: nil
    )
    rootView.frame = view.bounds
    rootView.autoresizingMask = [.flexibleWidth, .flexibleHeight]
    view.addSubview(rootView)
  }
}
```

Present it like any other view controller:

```swift
navigationController?.pushViewController(ReactNativeScreenViewController(), animated: true)
```

> **Monorepo iOS:** `pod install` is run from `ios/`, but Node module resolution starts from the Expo project root. Pass `EXPO_PROJECT_ROOT=/absolute/path/to/expo-project` to the `pod install` invocation if autolinking cannot find the Expo project automatically.

---

## 5) Test the integration

Start Metro from the Expo project (or `yarn start` from the monorepo root):

```sh
yarn start
```

Build and run the native app normally (Android Studio / Xcode). Navigate to your React Native–powered Activity or screen — it loads JS from the Metro dev server with hot reloading.

### Development vs. production

- **Development** — Metro serves the JS bundle with hot reloading over HTTP. Debug builds use the Metro URL via `RCTBundleURLProvider` (iOS) or the dev server detection in `ReactActivity` (Android).
- **Production** — Metro is not used. Run `expo export:embed` (invoked automatically by the React Native Gradle plugin and the iOS build phase) to embed the bundle into the APK/IPA.

For Metro connection issues, build failures, missing modules, or arch mismatches, see [./troubleshooting.md](./troubleshooting.md).

---

## Related references

- [./brownfield-isolated.md](./brownfield-isolated.md) — Alternative: ship RN as a prebuilt AAR/XCFramework.
- [./comparison.md](./comparison.md) — Decide between isolated and integrated.
- [./troubleshooting.md](./troubleshooting.md) — Common Metro, build, and integration issues.
