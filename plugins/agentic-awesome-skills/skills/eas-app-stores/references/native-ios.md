# Native Swift iOS apps on EAS

Use this path when the app runs SwiftUI or UIKit and the task is to build or distribute it with EAS. Adding React Native screens is a different task. [EAS Build supports native projects without Expo or React Native](https://docs.expo.dev/build/introduction/), but the main setup tutorials assume a React Native project.

## Keep the delivery wrapper small

Inspect the Xcode project, shared scheme, Swift entry point, dependencies, signing settings, and current release configuration first. Keep hand-maintained native code checked in. Running `expo prebuild --clean` would regenerate native directories; it is not a setup step for this path.

The default EAS iOS pipeline expects a project beneath `ios/`. A typical layout is:

```text
app.json
eas.json
package.json
package-lock.json
ios/
  Podfile
  MyApp.xcodeproj/
  MyApp/
    MyApp.swift
    Info.plist
```

The package file is tooling metadata, not a JavaScript app. A project with no Node dependencies can use:

```json
{
  "name": "my-app",
  "version": "1.0.0",
  "private": true
}
```

Keep a matching lockfile for the chosen package manager. Do not add `expo`, `react`, `react-native`, an `index.js`, Metro, or `expo-dev-client` merely to use EAS. Preserve those dependencies if the app actually uses them. EAS CLI can read a minimal `app.json` without an installed Expo SDK:

```json
{
  "expo": {
    "name": "My App",
    "slug": "my-app",
    "ios": { "bundleIdentifier": "com.example.myapp" }
  }
}
```

`eas init` links the project and writes `extra.eas.projectId`. Reuse the existing ID when one exists. The `expo` JSON key is EAS configuration here, not evidence of an Expo runtime. Xcode's bundle identifier is authoritative for a checked-in native project; keep any duplicate app-config identifier consistent, particularly for GitHub-triggered builds.

The [default iOS worker](https://github.com/expo/eas-cli/blob/main/packages/build-tools/src/builders/ios.ts) skips prebuild for checked-in native projects but still runs `pod install`. For an app with no pods, a minimal `Podfile` can serve as an adapter:

```ruby
platform :ios, '17.0'

target 'MyApp' do
end
```

Use the app's real deployment target and target name. This does not add React Native pods. If the project must avoid CocoaPods or has a different layout, use a [custom EAS build](https://docs.expo.dev/custom-builds/get-started/) or archive/export with Xcode and submit the resulting IPA. Do not relocate an established native project just to match this example.

## Build and submit profiles

Select the actual shared scheme. Set `ios.image` from the [current build-image list](https://docs.expo.dev/build-reference/infrastructure/) when a particular Xcode/SDK is required. Use explicit build configurations; `developmentClient: true` configures Expo's development client, not generic Swift debugging.

```json
{
  "cli": { "appVersionSource": "remote" },
  "build": {
    "base": { "ios": { "scheme": "MyApp" } },
    "simulator": {
      "extends": "base",
      "ios": { "simulator": true, "buildConfiguration": "Debug" }
    },
    "testflight": {
      "extends": "base",
      "distribution": "store",
      "autoIncrement": true,
      "ios": { "buildConfiguration": "Release" }
    },
    "production": {
      "extends": "base",
      "distribution": "store",
      "autoIncrement": true,
      "ios": { "buildConfiguration": "Release" }
    }
  },
  "submit": {
    "testflight": { "ios": { "ascAppId": "1234567890" } },
    "production": { "ios": { "ascAppId": "1234567890" } }
  }
}
```

The IDs and target names above are examples. `ascAppId` is the numeric App Store Connect app ID, not the EAS project UUID, bundle ID, or Apple team ID. Verify the selected Apple team, the native bundle ID, and the app record together; one Apple login may belong to multiple organizations.

A pure Swift wrapper with neither Expo dependencies nor Expo SDK metadata needs no Expo Doctor or JavaScript-bundling skip flags. Existing native build phases and actual dependency integrations still need inspection. Avoid carrying unexplained environment overrides from a React Native template; keep native compiler settings in the Xcode project or xcconfig and retain Release debug symbols for crash reports.

For icon selection or other native build preparation, use an EAS lifecycle hook such as `eas-build-post-install` when necessary. An Expo config/prebuild plugin will not run on this native path. Preserve an existing hook rather than replacing its other work.

## Versioning and icon troubleshooting

These checks address two failures encountered while testing a SwiftUI release: a stale archive build number and a default icon with an alpha channel. Use the relevant check during initial setup, after changing versioning, bundle IDs, or icons, or to diagnose a rejected upload. Routine releases use the EAS build/submit flow below.

EAS remote versioning increments a counter. The [native version updater](https://github.com/expo/eas-cli/blob/main/packages/eas-cli/src/build/ios/version.ts) writes `CFBundleVersion` to the target's explicit `INFOPLIST_FILE`. A generated plist with a fixed `CURRENT_PROJECT_VERSION` can leave every archive reporting build 1 even while the EAS dashboard reports increasing numbers.

For the default pipeline, an explicit app plist is a tested approach:

```text
GENERATE_INFOPLIST_FILE = NO
INFOPLIST_FILE = MyApp/Info.plist
MARKETING_VERSION = 1.0.0
```

Include these entries in the complete app plist:

```xml
<key>CFBundleShortVersionString</key>
<string>$(MARKETING_VERSION)</string>
<key>CFBundleVersion</key>
<string>1</string>
```

That local build number is a starting value; EAS writes the remote value during the store build. Apply the settings to the app's relevant configurations and preserve the rest of its metadata: identity, privacy usage descriptions, scene/launch configuration, orientations and supported devices. Do not replace a full plist with this excerpt or change test targets indiscriminately. Review extension targets' version synchronization separately.

An existing generated-plist setup can also work if its build process explicitly sets `CURRENT_PROJECT_VERSION` before archiving. Keep it when verified; do not migrate every native project automatically. Changing only `app.json` or observing an incremented remote counter is insufficient evidence.

When setting up or changing versioning or the bundle ID, or diagnosing a rejected upload, inspect the built app's plist with macOS's built-in tools:

```bash
plutil -p "/path/to/MyApp.xcarchive/Products/Applications/MyApp.app/Info.plist"
```

For a downloaded `.ipa`, unzip it into a temporary directory and inspect `Payload/MyApp.app/Info.plist`; for a built `.app`, inspect its `Info.plist` directly. Compare `CFBundleIdentifier`, `CFBundleShortVersionString`, and `CFBundleVersion` with the intended release. Values must be resolved strings, and `CFBundleSupportedPlatforms` must contain `iPhoneOS`, not `iPhoneSimulator`. `eas build:view BUILD_ID --json` provides build details and the artifact URL; its reported version is not a substitute for checking the archive.

When adding or changing a default (Any/light) 1024px AppIcon PNG, or diagnosing an icon rejection, inspect the source selected by that build profile:

```bash
sips -g pixelWidth -g pixelHeight -g hasAlpha "/path/to/AppIcon.appiconset/icon.png"
```

The default icon should be 1024×1024 with no alpha channel, even if every pixel looks opaque. Preserve transparency in dark variants and Icon Composer layers; follow [Apple's guidance for each appearance](https://developer.apple.com/documentation/xcode/configuring-your-app-icon). These local checks help diagnose the artifact; use the EAS submission logs and Apple processing status to verify acceptance.

Check privacy usage descriptions against the features used by the app. Set the encryption declaration according to the app's actual encryption use; do not copy `false` solely to suppress an export-compliance prompt.

## Ship the exact build

Reuse established EAS/Apple credentials. For a new setup, configure signing with `eas credentials -p ios` and select the correct team. An App Store Connect API key supports unattended submission without changing the app's owner or bundle ID.

```bash
eas build --platform ios --profile testflight --no-wait --non-interactive
# Record the returned build ID; verify its result and source revision.
eas submit --platform ios --profile testflight --id BUILD_ID --non-interactive
```

For an IPA exported elsewhere:

```bash
eas submit --platform ios --profile testflight --path /path/to/MyApp.ipa
```

Use the explicit ID when multiple builds exist. Keep the distribution scope the user requested. Follow the submission's worker logs through Apple processing, then check tester availability in App Store Connect. A successful upload does not create tester access or release the app publicly.

For production, reuse an eligible uploaded build when it already has the intended release code, icon, configuration, and version. If the beta build uses a preview icon or different configuration, create and verify a production-profile build, then upload that exact archive. A second upload is not required solely to move an eligible tested build into App Review.

Complete the [public release steps in App Store Connect](ios-app-store.md#complete-the-public-release): select the processed build, finish the listing/privacy/review information, submit for App Review, and apply the requested release timing. The [official EAS Submit guide](https://docs.expo.dev/submit/ios/) describes this handoff. TestFlight distribution alone does not authorize publishing an App Store release.

## Verification scope

This approach was exercised with a SwiftUI app on EAS CLI 18.6.0 and Xcode 26.2: an isolated default-pipeline simulator build succeeded without Expo/React/React Native dependencies or skip flags. The explicit-plist and opaque-icon fixes were also verified by a signed device build accepted by Apple. Recheck worker/CLI behavior when updating tooling; project layout, custom hooks, extensions and signing requirements can differ.
