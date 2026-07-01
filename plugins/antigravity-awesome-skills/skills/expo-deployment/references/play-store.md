# Submitting to Google Play Store

## Prerequisites

1. **Google Play Console Account** - Register at [play.google.com/console](https://play.google.com/console)
2. **App Created in Console** - Create your app listing before first submission
3. **Service Account** - For automated submissions via EAS

## Service Account Setup

### 1. Create Service Account

1. Go to Google Cloud Console → IAM & Admin → Service Accounts
2. Create a new service account
3. Grant the "Service Account User" role
4. Create and download a JSON key

### 2. Link to Play Console

1. Go to Play Console → Setup → API access
2. Click "Link" next to your Google Cloud project
3. Under "Service accounts", click "Manage Play Console permissions"
4. Grant "Release to production" permission (or appropriate track permissions)

### 3. Configure EAS

Add the service account key path to `eas.json`:

```json
{
  "submit": {
    "production": {
      "android": {
        "serviceAccountKeyPath": "./google-service-account.json",
        "track": "internal"
      }
    }
  }
}
```

Store the key file securely and add it to `.gitignore`.

## Environment Variables

For CI/CD, use environment variables instead of file paths:

```bash
# Base64-encoded service account JSON
EXPO_ANDROID_SERVICE_ACCOUNT_KEY_BASE64=...
```

Or use EAS Secrets:

```bash
eas secret:create --name GOOGLE_SERVICE_ACCOUNT --value "$(cat google-service-account.json)" --type file
```

Then reference in `eas.json`:

```json
{
  "submit": {
    "production": {
      "android": {
        "serviceAccountKeyPath": "@secret:GOOGLE_SERVICE_ACCOUNT"
      }
    }
  }
}
```

## Release Tracks

Google Play uses tracks for staged rollouts:

| Track | Purpose |
|-------|---------|
| `internal` | Internal testing (up to 100 testers) |
| `alpha` | Closed testing |
| `beta` | Open testing |
| `production` | Public release |

### Track Configuration

```json
{
  "submit": {
    "production": {
      "android": {
        "track": "production",
        "releaseStatus": "completed"
      }
    },
    "internal": {
      "android": {
        "track": "internal",
        "releaseStatus": "completed"
      }
    }
  }
}
```

### Release Status Options

- `completed` - Immediately available on the track
- `draft` - Upload only, release manually in Console
- `halted` - Pause an in-progress rollout
- `inProgress` - Staged rollout (requires `rollout` percentage)

## Staged Rollout

```json
{
  "submit": {
    "production": {
      "android": {
        "track": "production",
        "releaseStatus": "inProgress",
        "rollout": 0.1
      }
    }
  }
}
```

This releases to 10% of users. Increase via Play Console or subsequent submissions.

## Submission Commands

```bash
# Build and submit to internal track
eas build -p android --profile production --submit

# Submit existing build to Play Store
eas submit -p android --latest

# Submit specific build
eas submit -p android --id BUILD_ID
```

## App Signing

### Google Play App Signing (Recommended)

EAS uses Google Play App Signing by default:

1. First upload: EAS creates upload key, Play Store manages signing key
2. Play Store re-signs your app with the signing key
3. Upload key can be reset if compromised

### Checking Signing Status

```bash
eas credentials -p android
```

## Version Codes

Android requires incrementing `versionCode` for each upload:

```json
{
  "build": {
    "production": {
      "autoIncrement": true
    }
  }
}
```

With `appVersionSource: "remote"`, EAS tracks version codes automatically.

## First Submission Checklist

Before your first Play Store submission:

- [ ] Create app in Google Play Console
- [ ] Complete app content declaration (privacy policy, ads, etc.)
- [ ] Set up store listing (title, description, screenshots)
- [ ] Complete content rating questionnaire
- [ ] Set up pricing and distribution
- [ ] Create service account with proper permissions
- [ ] Configure `eas.json` with service account path

## Common Issues

### "App not found"

The app must exist in Play Console before EAS can submit. Create it manually first.

### "Version code already used"

Increment `versionCode` in `app.json` or use `autoIncrement: true` in `eas.json`.

### "Service account lacks permission"

Ensure the service account has "Release to production" permission in Play Console → API access.

### "APK not acceptable"

Play Store requires AAB (Android App Bundle) for new apps:

```json
{
  "build": {
    "production": {
      "android": {
        "buildType": "app-bundle"
      }
    }
  }
}
```

## Internal Testing Distribution

For quick internal distribution without Play Store:

```bash
# Build with internal distribution
eas build -p android --profile development

# Share the APK link with testers
```

Or use EAS Update for OTA updates to existing installs.

## Monitoring Submissions

```bash
# Check submission status
eas submit:list -p android

# View specific submission
eas submit:view SUBMISSION_ID
```

## Tips

- Start with `internal` track for testing before production
- Use staged rollouts for production releases
- Keep service account key secure - never commit to git
- Set up Play Console notifications for review status
- Pre-launch reports in Play Console catch issues before review
