---
name: expo-dev-client
description: Build Expo app for development
license: MIT
metadata:
  aas-risk: critical
  aas-source: https://github.com/expo/skills/tree/main/plugins/expo/skills/expo-dev-client
  aas-source-repo: expo/skills
  aas-source-type: official
  aas-date-added: '2026-07-01'
  aas-license-source: https://github.com/expo/skills/blob/main/LICENSE
---

Use EAS Build to create development clients for testing native code changes on physical devices. Use this for creating custom Expo Go clients for testing branches of your app.

## Important: When Development Clients Are Needed

**Development clients are the recommended setup for any real or production app.** Expo Go is a playground for learning and quick experiments with the native libraries it bundles; most apps outgrow it and move to a development client. See [Expo Go vs. development builds](https://docs.expo.dev/develop/development-builds/introduction/) for the full reasoning.

You need a dev client ONLY when using:

- Local Expo modules (custom native code)
- Apple targets (widgets, app clips, extensions)
- Third-party native modules not in Expo Go
- Config plugins, or testing remote push notifications and App/Universal Links

## EAS Configuration

Ensure `eas.json` has a development profile:

```json
{
  "cli": {
    "version": ">= 16.0.1",
    "appVersionSource": "remote"
  },
  "build": {
    "production": {
      "autoIncrement": true
    },
    "development": {
      "autoIncrement": true,
      "developmentClient": true,
      "distribution": "internal"
    }
  },
  "submit": {
    "production": {},
    "development": {}
  }
}
```

Key settings:

- `developmentClient: true` - Bundles expo-dev-client for development builds
- `autoIncrement: true` - Automatically increments build numbers
- `appVersionSource: "remote"` - Uses EAS as the source of truth for version numbers

## Distribution choices

Development builds are normally installed through internal/ad hoc distribution (physical iOS devices must be registered) or an explicit simulator profile. For TestFlight, use a separate store distribution build/profile and follow current Expo/App Store Connect documentation; do not submit a development client profile as a routine dev-build step. Submission publishes an artifact to an external account and requires the user’s corresponding authorization.

For a simulator, add `ios: { "simulator": true }` to a separate selected development profile. A signed device `.ipa` is not a simulator `.app` archive. Verify the exact profile, target and output type before installation. Cloud builds may consume quota and signing credentials.

## Building Locally

Build a development client on your machine:

```bash
# iOS (requires Xcode)
eas build -p ios --profile development --local

# Android
eas build -p android --profile development --local
```

Local builds output:

- iOS: `.ipa` file
- Android: `.apk` or `.aab` file

## Installing Local Builds

Install iOS build on simulator:

```bash
# Find the .app in the .tar.gz output
tar -xzf build-*.tar.gz
xcrun simctl install booted ./path/to/App.app
```

Install iOS build on device (requires signing):

```bash
# Use Xcode Devices window or ideviceinstaller
ideviceinstaller -i build.ipa
```

Install Android build:

```bash
adb install build.apk
```

## Building for Specific Platform

```bash
# iOS only
eas build -p ios --profile development

# Android only
eas build -p android --profile development

# Both platforms
eas build --profile development
```

## Checking Build Status

```bash
# List recent builds
eas build:list

# View build details
eas build:view
```

## Using the Dev Client

Once installed, the dev client provides:

- **Development server connection** - Enter your Metro bundler URL or scan QR
- **Build information** - View native build details
- **Launcher UI** - Switch between development servers

Connect to local development:

```bash
# Start Metro bundler
npx expo start --dev-client

# Scan QR code with dev client or enter URL manually
```

## Troubleshooting

**Build fails with signing errors:**

```bash
eas credentials
```

**Clear build cache:**

```bash
eas build -p ios --profile development --clear-cache
```

**Check EAS CLI version:**

```bash
eas --version
# EAS Update publishes app updates; it is not a CLI version check.
```

## Limitations

- Use this skill only when the task clearly matches its upstream product or API scope.
- Verify commands, API behavior, pricing, quotas, credentials, and deployment effects against current official documentation before making changes.
- Do not treat generated examples as a substitute for environment-specific tests, security review, or user approval for destructive or costly actions.

## When to Use

Use when creating or troubleshooting an authorized Expo development build that needs native modules or development-client behavior.
