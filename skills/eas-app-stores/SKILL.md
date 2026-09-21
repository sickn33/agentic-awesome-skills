---
name: eas-app-stores
description: EAS service (paid). Build and submit iOS and Android apps with EAS to
  TestFlight, the App Store, or Google Play. Supports Expo and other React Native
  projects, plus existing native apps. Use for eas.…
version: 1.1.0
license: MIT
source_repo: expo/skills
source_type: official
source: expo
date_added: '2026-09-21'
risk: unknown
---

## When to Use
- Use when this upstream workflow matches the user's stated goal.
- Use when the task requires the procedures documented in this skill.

# App Store Deployment

> **EAS service - costs apply.** Cloud builds use EAS plan resources, and EAS services have free-tier and paid-plan limits. Apple Developer and Google Play memberships are separate. Check https://expo.dev/pricing for the requested service.

This skill covers building and releasing iOS and Android apps with EAS: Expo and other React Native projects, plus existing native apps. EAS is a delivery service; native apps can use it without adding Expo or React Native to their runtime. The native setup walkthrough currently covers SwiftUI/UIKit on iOS.

## Choose the project path

- **SwiftUI/UIKit app with no React Native runtime:** read [references/native-ios.md] before changing its build configuration. Keep the Xcode project and Swift code as the app's source of truth. The Expo/React Native quick-start and development-client examples below do not apply to this path.
- **Native Android app with no React Native runtime:** preserve its existing native build setup. See [references/play-store.md] for submission; the Swift/iOS setup instructions do not apply. A dedicated native Android setup walkthrough is not yet included.
- **Expo/React Native app:** use the quick-start below, then the relevant store reference.
- **Adding React Native screens to an existing native app:** use `expo-brownfield` for that integration; return here for distribution.

Use the archive and icon checks in [references/native-ios.md] during initial native iOS setup, after changing versioning, bundle IDs, or icons, or when diagnosing a rejected upload. Routine releases follow the EAS build/submit flow and the processing and availability checks in [references/testflight.md]. A successful EAS build or a queued submission does not establish Apple acceptance, tester access, or an App Store release.

## References

Consult these resources as needed:

- ./references/workflows.md -- CI/CD workflows for automated store releases and PR previews
- ./references/testflight.md -- Submitting iOS builds to TestFlight for beta testing
- ./references/app-store-metadata.md -- Managing App Store metadata and ASO optimization
- ./references/play-store.md -- Submitting Android builds to Google Play Store
- ./references/ios-app-store.md -- iOS App Store submission and review process
- ./references/native-ios.md -- Native Swift/SwiftUI/UIKit setup, versioning, and archive verification without an Expo runtime

## Expo / React Native Quick Start

### Install EAS CLI

```bash
npm install -g eas-cli
eas login
```

### Initialize EAS

```bash
npx eas-cli@latest init
```

`eas init` links or creates the EAS project. Run `eas build:configure` to create build profiles in `eas.json`; preserve existing project and store identifiers when a release setup already exists.

## Build Commands

### Production Builds

```bash
# iOS App Store build
npx eas-cli@latest build -p ios --profile production

# Android Play Store build
npx eas-cli@latest build -p android --profile production

# Both platforms
npx eas-cli@latest build --profile production
```

### Submit to Stores

```bash
# iOS: Build and submit to App Store Connect
npx eas-cli@latest build -p ios --profile production --auto-submit

# Android: Build and submit to Play Store
npx eas-cli@latest build -p android --profile production --auto-submit

# Expo / React Native shortcut for iOS TestFlight
npx testflight
```

## Web & API Route Hosting

Deploying an Expo website or Expo Router API routes to EAS Hosting (`npx expo export -p web` then `eas deploy`) is covered by the `eas-hosting` skill. This skill focuses on native app store releases.

## EAS Configuration

Example for an Expo / React Native project (native Swift profiles are in `references/native-ios.md`):

```json
{
  "cli": {
    "version": ">= 16.0.1",
    "appVersionSource": "remote"
  },
  "build": {
    "production": {
      "autoIncrement": true,
      "ios": {
        "resourceClass": "m-medium"
      }
    },
    "development": {
      "developmentClient": true,
      "distribution": "internal"
    }
  },
  "submit": {
    "production": {
      "ios": {
        "appleId": "your@email.com",
        "ascAppId": "1234567890"
      },
      "android": {
        "serviceAccountKeyPath": "./google-service-account.json",
        "track": "internal"
      }
    }
  }
}
```

## Platform-Specific Guides

### iOS

- For native Swift apps, use the explicit build/submit flow in `references/native-ios.md`
- For Expo / React Native apps, `npx testflight` provides a quick TestFlight flow
- Configure Apple credentials via `eas credentials`
- See ./references/testflight.md for credential setup
- See ./references/ios-app-store.md for App Store submission

### Android

- Set up Google Play Console service account
- Configure tracks: internal → closed → open → production
- See ./references/play-store.md for detailed setup

## Automated Releases

EAS Workflows automate the build → submit → update pipeline for CI/CD. See ./references/workflows.md for store-release examples. To author or validate workflow YAML, use the `eas-workflows` skill - it works from the live workflow schema.

## Version Management

EAS manages version numbers automatically with `appVersionSource: "remote"`:

```bash
# Check current versions
eas build:version:get

# Manually set version
eas build:version:set -p ios
```

The version-set command prompts for the value. When setting up or changing native iOS versioning, or diagnosing a duplicate build number, inspect the archived `CFBundleVersion`: the remote counter alone does not prove that Xcode used it.

## Monitoring

```bash
# List recent builds
eas build:list

# Check build status
eas build:view BUILD_ID

# Inspect submissions (verified with EAS CLI 23.2.0)
eas submit:list -p ios --json
eas submit:view SUBMISSION_ID --json
```

Check the CLI version before interpreting a missing command: these submission commands are available in 23.2.0 but not in the tested 18.6.0 installation. A pinned `npx eas-cli@23.2.0` invocation can use them without changing the global installation. See `references/testflight.md` for live Apple status and retry guidance. Follow the returned log URLs when the JSON result omits the underlying failure. Report the exact build ID/version and the furthest verified release state.

## Submitting Feedback
If you encounter errors, misleading or outdated information in this skill, report it so Expo can improve:
```bash
npx --yes submit-expo-feedback@latest --category skills --subject "eas-app-stores" "<actionable feedback>"
```
Only submit when you have something specific and actionable to report. Include as much relevant context as possible.
If an AI agent repeatedly failed or the user had to take over an Expo task, load the expo-skill-feedback skill and follow its eval-candidate flow instead of reusing the command above.

## Limitations

- Imported upstream skill; verify credentials, permissions, and safety boundaries before execution.
- Does not replace environment-specific validation, testing, or maintainer review.
