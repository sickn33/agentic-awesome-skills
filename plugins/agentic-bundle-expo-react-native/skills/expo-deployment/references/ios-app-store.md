# Submitting to iOS App Store

## Contents

- [Prerequisites](#prerequisites)
- [Credential Setup](#credential-setup)
- [Submission Commands](#submission-commands)
- [App Store Connect Configuration](#app-store-connect-configuration)
- [TestFlight vs App Store](#testflight-vs-app-store)
- [App Review Process](#app-review-process)
- [Version and Build Numbers](#version-and-build-numbers)
- [Release Options](#release-options)
- [Certificates and Provisioning](#certificates-and-provisioning)
- [App Store Metadata](#app-store-metadata)
- [Troubleshooting](#troubleshooting)
- [CI/CD Integration](#cicd-integration)
- [Tips](#tips)

## Prerequisites

1. **Apple Developer Account** - Enroll at [developer.apple.com](https://developer.apple.com)
2. **App Store Connect App** - Create your app record before first submission
3. **Apple Credentials** - Configure via EAS or environment variables

## Credential Setup

### Using EAS Credentials

```bash
eas credentials -p ios
```

This interactive flow helps you:
- Create or select a distribution certificate
- Create or select a provisioning profile
- Configure App Store Connect API key (recommended)

### App Store Connect API Key (Recommended)

API keys avoid 2FA prompts in CI/CD:

1. Go to App Store Connect → Users and Access → Keys
2. Click "+" to create a new key
3. Select "App Manager" role (minimum for submissions)
4. Download the `.p8` key file

Configure in `eas.json`:

```json
{
  "submit": {
    "production": {
      "ios": {
        "ascApiKeyPath": "./AuthKey_XXXXX.p8",
        "ascApiKeyIssuerId": "xxxxx-xxxx-xxxx-xxxx-xxxxx",
        "ascApiKeyId": "XXXXXXXXXX"
      }
    }
  }
}
```

Or use environment variables:

```bash
EXPO_ASC_API_KEY_PATH=./AuthKey.p8
EXPO_ASC_API_KEY_ISSUER_ID=xxxxx-xxxx-xxxx-xxxx-xxxxx
EXPO_ASC_API_KEY_ID=XXXXXXXXXX
```

### Apple ID Authentication (Alternative)

For manual submissions, you can use Apple ID:

```bash
EXPO_APPLE_ID=your@email.com
EXPO_APPLE_TEAM_ID=XXXXXXXXXX
```

Note: Requires app-specific password for accounts with 2FA.

## Submission Commands

```bash
# Build and submit to App Store Connect
eas build -p ios --profile production --submit

# Submit latest build
eas submit -p ios --latest

# Submit specific build
eas submit -p ios --id BUILD_ID

# Quick TestFlight submission
npx testflight
```

## App Store Connect Configuration

### First-Time Setup

Before submitting, complete in App Store Connect:

1. **App Information**
   - Primary language
   - Bundle ID (must match `app.json`)
   - SKU (unique identifier)

2. **Pricing and Availability**
   - Price tier
   - Available countries

3. **App Privacy**
   - Privacy policy URL
   - Data collection declarations

4. **App Review Information**
   - Contact information
   - Demo account (if login required)
   - Notes for reviewers

### EAS Configuration

```json
{
  "cli": {
    "version": ">= 16.0.1",
    "appVersionSource": "remote"
  },
  "build": {
    "production": {
      "ios": {
        "resourceClass": "m-medium",
        "autoIncrement": true
      }
    }
  },
  "submit": {
    "production": {
      "ios": {
        "appleId": "your@email.com",
        "ascAppId": "1234567890",
        "appleTeamId": "XXXXXXXXXX"
      }
    }
  }
}
```

Find `ascAppId` in App Store Connect → App Information → Apple ID.

## TestFlight vs App Store

### TestFlight (Beta Testing)

- Builds go to TestFlight automatically after submission
- Internal testers (up to 100) - immediate access
- External testers (up to 10,000) - requires beta review
- Builds expire after 90 days

### App Store (Production)

- Requires passing App Review
- Submit for review from App Store Connect
- Choose release timing (immediate, scheduled, manual)

## App Review Process

### What Reviewers Check

1. **Functionality** - App works as described
2. **UI/UX** - Follows Human Interface Guidelines
3. **Content** - Appropriate and accurate
4. **Privacy** - Data handling matches declarations
5. **Legal** - Complies with local laws

### Common Rejection Reasons

| Issue | Solution |
|-------|----------|
| Crashes/bugs | Test thoroughly before submission |
| Incomplete metadata | Fill all required fields |
| Placeholder content | Remove "lorem ipsum" and test data |
| Missing login credentials | Provide demo account |
| Privacy policy missing | Add URL in App Store Connect |
| Guideline 4.2 (minimum functionality) | Ensure app provides value |

### Expedited Review

Request expedited review for:
- Critical bug fixes
- Time-sensitive events
- Security issues

Go to App Store Connect → your app → App Review → Request Expedited Review.

## Version and Build Numbers

iOS uses two version identifiers:

- **Version** (`CFBundleShortVersionString`): User-facing, e.g., "1.2.3"
- **Build Number** (`CFBundleVersion`): Internal, must increment for each upload

Configure in `app.json`:

```json
{
  "expo": {
    "version": "1.2.3",
    "ios": {
      "buildNumber": "1"
    }
  }
}
```

With `autoIncrement: true`, EAS handles build numbers automatically.

## Release Options

### Automatic Release

Release immediately when approved:

```json
{
  "apple": {
    "release": {
      "automaticRelease": true
    }
  }
}
```

### Scheduled Release

```json
{
  "apple": {
    "release": {
      "automaticRelease": "2025-03-01T10:00:00Z"
    }
  }
}
```

### Phased Release

Gradual rollout over 7 days:

```json
{
  "apple": {
    "release": {
      "phasedRelease": true
    }
  }
}
```

Rollout: Day 1 (1%) → Day 2 (2%) → Day 3 (5%) → Day 4 (10%) → Day 5 (20%) → Day 6 (50%) → Day 7 (100%)

## Certificates and Provisioning

### Distribution Certificate

- Required for App Store submissions
- Limited to 3 per Apple Developer account
- Valid for 1 year
- EAS manages automatically

### Provisioning Profile

- Links app, certificate, and entitlements
- App Store profiles don't include device UDIDs
- EAS creates and manages automatically

### Check Current Credentials

```bash
eas credentials -p ios

# Sync with Apple Developer Portal
eas credentials -p ios --sync
```

## App Store Metadata

Use EAS Metadata to manage App Store listing from code:

```bash
# Pull existing metadata
eas metadata:pull

# Push changes
eas metadata:push
```

See ./app-store-metadata.md for detailed configuration.

## Troubleshooting

### "No suitable application records found"

Create the app in App Store Connect first with matching bundle ID.

### "The bundle version must be higher"

Increment build number. With `autoIncrement: true`, this is automatic.

### "Missing compliance information"

Add export compliance to `app.json`:

```json
{
  "expo": {
    "ios": {
      "config": {
        "usesNonExemptEncryption": false
      }
    }
  }
}
```

### "Invalid provisioning profile"

```bash
eas credentials -p ios --sync
```

### Build stuck in "Processing"

App Store Connect processing can take 5-30 minutes. Check status in App Store Connect → TestFlight.

## CI/CD Integration

For automated submissions in CI/CD:

```yaml
# .eas/workflows/release.yml
name: Release to App Store

on:
  push:
    tags: ['v*']

jobs:
  build:
    type: build
    params:
      platform: ios
      profile: production

  submit:
    type: submit
    needs: [build]
    params:
      platform: ios
      profile: production
```

## Tips

- Submit to TestFlight early and often for feedback
- Use beta app review for external testers to catch issues before App Store review
- Respond to reviewer questions promptly in App Store Connect
- Keep demo account credentials up to date
- Monitor App Store Connect notifications for review updates
- Use phased release for major updates to catch issues early
