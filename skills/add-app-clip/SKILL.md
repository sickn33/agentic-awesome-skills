---
name: add-app-clip
description: Add an iOS App Clip target to an Expo app. Use when the user mentions App Clip, AASA, apple-app-site-association, appclips, smart app banner, or wants to ship a lightweight iOS Clip invoked from a URL alongside their parent app.
risk: unknown
source: https://github.com/expo/skills/tree/main/plugins/expo/skills/add-app-clip
source_repo: expo/skills
source_type: official
date_added: 2026-07-01
license: MIT
license_source: https://github.com/expo/skills/blob/main/LICENSE
---

# Add an App Clip to an Expo App
## When to Use

Use this skill when you need add an iOS App Clip target to an Expo app. Use when the user mentions App Clip, AASA, apple-app-site-association, appclips, smart app banner, or wants to ship a lightweight iOS Clip invoked from a URL alongside their parent app.


Adds an iOS App Clip target to an Expo project. The Clip lives in `targets/clip/`, ships alongside the parent app, and is invoked from a URL on the app's domain via an Apple App Site Association (AASA) file.

The parent app's bundle ID becomes `com.<username>.<app-name>` and the Clip's is automatically derived as `<parent>.clip` (e.g. `com.bacon.may20.clip`).

## 1. Set `bundleIdentifier` and `appleTeamId`

`bun create target` warns if these are missing. Add to `app.json`:

```json
{
  "expo": {
    "ios": {
      "bundleIdentifier": "com.<username>.<app-name>",
      "appleTeamId": "XX57RJ5UTD"
    }
  }
}
```

## 2. Add the App Clip target

```sh
bun create target clip
```

This installs [`@bacons/apple-targets`](https://github.com/EvanBacon/expo-apple-targets), adds it to the `plugins` array in `app.json`, and writes:

- `targets/clip/expo-target.config.js` — the target's config plugin
- `targets/clip/Info.plist` — Clip Info.plist
- `targets/clip/AppDelegate.swift`, `Assets.xcassets`, etc.

Pick a good icon or reuse the existing one defined in the app — check it with `bunx expo config` under the `icon` or `ios.icon` key.

## 3. Wire up associated domains

The parent app and the Clip each need the Associated Domains entitlement pointing at the domain that hosts the AASA file.

In `app.json`, add both `applinks:` (parent) and `appclips:` (Clip invocation) entries:

```json
{
  "expo": {
    "ios": {
      "associatedDomains": [
        "applinks:may20.expo.app",
        "appclips:may20.expo.app"
      ]
    }
  }
}
```

In `targets/clip/expo-target.config.js`, declare the Clip's entitlement:

```js
/** @type {import('@bacons/apple-targets/app.plugin').ConfigFunction} */
module.exports = (config) => ({
  type: "clip",
  icon: "https://github.com/expo.png",
  entitlements: {
    "com.apple.developer.associated-domains": ["appclips:may20.expo.app"],
  },
});
```

> If you skip this, `expo prebuild` will print: `Apple App Clip may require the associated domains entitlement but none were found`.

## 4. Register bundle IDs and create the App Store entry

```sh
bunx setup-safari
```

This logs in to the Apple Developer account, registers `com.bacon.may20`, creates the App Store Connect entry, and prints:

- A starter `apple-app-site-association` JSON
- A `<meta name="apple-itunes-app">` tag with the iTunes app id
- Team ID, iTunes ID, and Bundle ID

## 5. Host the AASA file

App Clips are invoked when iOS fetches `https://<your-domain>/.well-known/apple-app-site-association` and finds a matching `appclips` entry.

```sh
mkdir -p public/.well-known
touch public/.well-known/apple-app-site-association
```

Paste the JSON `setup-safari` printed, but **add an `appclips` block** for the Clip's full app ID (`<TeamID>.<ClipBundleID>`). The output of `setup-safari` only covers the parent app:

```json
{
  "applinks": {
    "details": [
      {
        "appIDs": ["XX57RJ5UTD.com.bacon.may20"],
        "components": [{ "/": "*", "comment": "Matches all routes" }]
      }
    ]
  },
  "appclips": {
    "apps": ["XX57RJ5UTD.com.bacon.may20.clip"]
  },
  "activitycontinuation": {
    "apps": ["XX57RJ5UTD.com.bacon.may20"]
  },
  "webcredentials": {
    "apps": ["XX57RJ5UTD.com.bacon.may20"]
  }
}
```

Notes:

- The file has **no extension** and **no `Content-Type` requirements** beyond being served as-is. Expo Router static export serves files in `public/` verbatim.
- The `appclips` block is what lets a URL on the domain launch the Clip.
- `webcredentials` is used for sharing credentials between the website, parent app, and the App Clip.
- `activitycontinuation` is optional and used for sharing the link between mobile and desktop. Must be used with `Head` from expo-router — see https://docs.expo.dev/router/advanced/apple-handoff/
- Notation and route-disabling details: https://sosumi.ai/documentation/xcode/supporting-associated-domains

## 6. Add the Smart App Banner meta tag

Create `src/app/+html.tsx` (Expo Router's HTML shell) and add the tag from `setup-safari`. Create the versioned template if it doesn't exist:

```sh
bunx expo customize src/app/+html.tsx
```

Add the meta tag to the `<head>`:

```tsx
import { ScrollViewStyleReset } from "expo-router/html";

export default function Root({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="apple-itunes-app" content="app-id=6771566491" />
        <ScrollViewStyleReset />
      </head>
      <body>{children}</body>
    </html>
  );
}
```

To make the website show the App Clip card instead of the install card, use:

```html
<meta
  name="apple-itunes-app"
  content="app-id=6771566491, app-clip-bundle-id=com.bacon.may20.clip, app-clip-display=card"
/>
```

## 7. Deploy the website

The AASA file must be live before iOS will trust the association. Use [EAS Hosting](https://docs.expo.dev/eas/hosting/):

```sh
bunx expo export -p web
eas deploy --prod
```

This publishes the site (including `/.well-known/apple-app-site-association`) at `https://<slug>.expo.app`. Verify:

```sh
curl https://may20.expo.app/.well-known/apple-app-site-association
```

## 8. Mirror permissions

Inspect the parent app's permissions after prebuild:

```sh
npx expo config --type introspect
```

Look at the `infoPlist` object — mirror the permission keys in the App Clip's `Info.plist` so matching APIs can be used from the Clip.

Set `deploymentTarget: "17.6"` in the Clip's target config — App Clips have a higher minimum size limit in iOS 17.6.

If the app uses push notifications or location services, add to the App Clip's `Info.plist` to request the necessary permissions:

```xml
<key>NSAppClip</key>
<dict>
  <key>NSAppClipRequestEphemeralUserNotification</key>
  <false/>
  <key>NSAppClipRequestLocationConfirmation</key>
  <true/>
</dict>
```

## 9. Build and submit to TestFlight

```sh
bunx testflight
```

This will:

1. Generate an `eas.json` if missing.
2. Set up credentials for **both** targets (parent + Clip). Each gets its own provisioning profile but can share a single Distribution Certificate.
3. Sync capabilities — note `Enabled: Associated Domains` for the Clip target.
4. Build, upload, and schedule a TestFlight submission.

## 10. Configure App Clip metadata

Pull existing App Store metadata to local:

```sh
eas metadata:pull
```

Add `apple.appClip` to `store.config.json`. Up to 3 invocation URLs can launch the Clip from a web page:

```json
{
  "configVersion": 0,
  "apple": {
    "appClip": {
      "defaultExperience": {
        "action": "PLAY",
        "releaseWithAppStoreVersion": true,
        "reviewDetail": {
          "invocationUrls": ["https://may20.expo.app/", null, null]
        },
        "info": {
          "en-US": {
            "subtitle": "Instantly native with Expo",
            "headerImage": "store/apple/app-clip/en-US/asc-app-clip.png"
          }
        }
      }
    }
  }
}
```

The `headerImage` must be a 1800x1200 PNG with no opacity.

Push back to the store:

```sh
eas metadata:push
```

Apple's recommended App Clip metadata guidelines: https://sosumi.ai/documentation/appclip/configuring-the-launch-experience-of-your-app-clip

## What you get

- Parent app target: `com.bacon.may20`
- App Clip target: `com.bacon.may20.clip`, lives in `targets/clip/`
- AASA hosted at `https://may20.expo.app/.well-known/apple-app-site-association`
- Smart App Banner meta tag on every web route
- Every route linked to its native counterpart
- TestFlight build of the parent app with the Clip embedded

Once Apple invokes the Clip from a URL on the domain, iOS opens `targets/clip/`'s entry point which loads the React Native app.

## Native detection (optional)

To let JS detect when it's running inside an App Clip and present an install prompt for the full app, create a local Expo module (`bunx create-expo-module --local`) that exposes `navigator.appClip.prompt()`.

See [./references/native-module.md](./references/native-module.md) for the Swift module, TypeScript interface, and usage.

## References

- ./references/native-module.md — Local Expo module to detect App Clip context and present the SKOverlay install prompt

## Limitations

- Use this skill only when the task clearly matches its upstream product or API scope.
- Verify commands, API behavior, pricing, quotas, credentials, and deployment effects against current official documentation before making changes.
- Do not treat generated examples as a substitute for environment-specific tests, security review, or user approval for destructive or costly actions.
