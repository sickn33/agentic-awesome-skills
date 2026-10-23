# New Architecture

The New Architecture is enabled by default in Expo SDK 53+. It replaces the legacy bridge with a faster, synchronous communication layer between JavaScript and native code.

## Documentation

Full guide: https://docs.expo.dev/guides/new-architecture/

## What Changed

- **JSI (JavaScript Interface)** — Direct synchronous calls between JS and native
- **Fabric** — New rendering system with concurrent features
- **TurboModules** — Lazy-loaded native modules with type safety

## SDK Compatibility

| SDK Version | New Architecture Status |
| ----------- | ----------------------- |
| SDK 55+     | Required; cannot disable |
| SDK 53–54   | Enabled by default      |
| SDK 52      | Opt-in via app.json     |
| SDK 51-     | Experimental            |

## Configuration

Only SDK 54 or earlier can disable the New Architecture; SDK 55+ ignores this escape route because legacy support is removed. For supported older SDKs:

```json
{
  "expo": {
    "newArchEnabled": false
  }
}
```

## Expo Go

Expo Go only supports the New Architecture as of SDK 53. Apps using the old architecture must use development builds.

## Common Migration Issues

### Native Module Compatibility

Some older native modules may not support the New Architecture. Check:

1. Module documentation for New Architecture support
2. GitHub issues for compatibility discussions
3. Consider alternatives if module is unmaintained

### Reanimated

React Native Reanimated requires `react-native-worklets` in SDK 54+:

```bash
npx expo install react-native-worklets
```

### Layout Animations

Some layout animations behave differently. Test thoroughly after upgrading.

## Verifying New Architecture

Check if New Architecture is active:

```tsx
import { Platform } from "react-native";

// Returns true if Fabric is enabled
const isNewArch = global._IS_FABRIC === true; // internal diagnostic; not a stable public API
```

Verify from the command line if the currently running app uses the New Architecture: `bunx xcobra expo eval "_IS_FABRIC"` -> `true`

## Troubleshooting

1. **Clear caches** — `npx expo start --clear`
2. **Clean prebuild** — only for generated native projects after preserving changes; `--clean` deletes native directories
3. **Check native modules** — Ensure all dependencies support New Architecture
4. **Review console warnings** — Legacy modules log compatibility warnings
