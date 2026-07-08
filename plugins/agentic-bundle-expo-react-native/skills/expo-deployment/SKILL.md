---
name: expo-deployment
description: Deploy Expo apps to production with EAS — build and submit to the iOS App Store, Google Play Store, and TestFlight, configure eas.json build and submit profiles, manage app versions and build numbers, publish App Store metadata and ASO, and deploy web bundles and API routes via EAS...
risk: unknown
source: https://github.com/expo/skills/tree/main/plugins/expo/skills/expo-deployment
source_repo: expo/skills
source_type: official
date_added: 2026-07-01
license: MIT
license_source: https://github.com/expo/skills/blob/main/LICENSE
---

# Deployment
## When to Use

Use this skill when you need deploy Expo apps to production with EAS — build and submit to the iOS App Store, Google Play Store, and TestFlight, configure eas.json build and submit profiles, manage app versions and build numbers, publish App Store metadata and ASO, and deploy web bundles and API routes via EAS...


This skill covers deploying Expo applications across all platforms using EAS (Expo Application Services).

## References

Consult these resources as needed:

- ./references/workflows.md -- CI/CD workflows for automated deployments and PR previews
- ./references/testflight.md -- Submitting iOS builds to TestFlight for beta testing
- ./references/app-store-metadata.md -- Managing App Store metadata and ASO optimization
- ./references/play-store.md -- Submitting Android builds to Google Play Store
- ./references/ios-app-store.md -- iOS App Store submission and review process

## Quick Start

### Install EAS CLI

```bash
npm install -g eas-cli
eas login
```

### Initialize EAS

```bash
npx eas-cli@latest init
```

This creates `eas.json` with build profiles.

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
npx eas-cli@latest build -p ios --profile production --submit

# Android: Build and submit to Play Store
npx eas-cli@latest build -p android --profile production --submit

# Shortcut for iOS TestFlight
npx testflight
```

## Web Deployment

Deploy web apps using EAS Hosting:

```bash
# Deploy to production
npx expo export -p web
npx eas-cli@latest deploy --prod

# Deploy PR preview
npx eas-cli@latest deploy
```

Expo Router API routes deploy together with the web bundle on EAS Hosting — `eas deploy` ships both. To author or configure the API routes themselves, use the `expo-api-routes` skill.

## EAS Configuration

Standard `eas.json` for production deployments:

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

- Use `npx testflight` for quick TestFlight submissions
- Configure Apple credentials via `eas credentials`
- See ./references/testflight.md for credential setup
- See ./references/ios-app-store.md for App Store submission

### Android

- Set up Google Play Console service account
- Configure tracks: internal → closed → open → production
- See ./references/play-store.md for detailed setup

### Web

- EAS Hosting provides preview URLs for PRs
- Production deploys to your custom domain
- See ./references/workflows.md for CI/CD automation

## Automated Deployments

EAS Workflows automate the build → submit → update → deploy pipeline for CI/CD. See ./references/workflows.md for deployment-oriented examples. To author or validate workflow YAML, use the `expo-cicd-workflows` skill — it works from the live workflow schema.

## Version Management

EAS manages version numbers automatically with `appVersionSource: "remote"`:

```bash
# Check current versions
eas build:version:get

# Manually set version
eas build:version:set -p ios --build-number 42
```

## Monitoring

```bash
# List recent builds
eas build:list

# Check build status
eas build:view

# View submission status
eas submit:list
```

## Limitations

- Use this skill only when the task clearly matches its upstream product or API scope.
- Verify commands, API behavior, pricing, quotas, credentials, and deployment effects against current official documentation before making changes.
- Do not treat generated examples as a substitute for environment-specific tests, security review, or user approval for destructive or costly actions.
