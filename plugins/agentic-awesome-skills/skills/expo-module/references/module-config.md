# Module Configuration Reference

## expo-module.config.json

Use `expo-module.config.json` for autolinking and module registration.

File placement depends on the module type:

- **standalone module**: place it at the package root, next to `package.json`
- **local module**: place it at the module root inside the app's local modules directory (`expo.autolinking.nativeModulesDir`, or `modules/` by default)

Example:

```json
{
  "platforms": ["android", "apple", "web"],
  "apple": {
    "modules": ["MyModule"],
    "appDelegateSubscribers": ["MyAppDelegateSubscriber"]
  },
  "android": {
    "modules": ["expo.modules.mymodule.MyModule"]
  }
}
```

### Fields

| Field | Description |
|-------|-------------|
| `platforms` | Array of supported platforms. Valid values include `android`, `apple`, `web`, and `devtools`. You can also use granular Apple platforms such as `ios`, `macos`, and `tvos`, but `apple` is preferred when one Swift module supports multiple Apple targets. |
| `apple.modules` | Swift module class names |
| `apple.appDelegateSubscribers` | Swift AppDelegate subscriber class names |
| `android.modules` | Fully-qualified Kotlin module class names (package + class) |

## Autolinking

Expo autolinking automatically discovers and links modules that have `expo-module.config.json`. No manual native project configuration needed — install via npm, run `pod install`.

- standalone modules are resolved from dependencies and search paths.
- local modules are resolved from the `modules` directory or `nativeModulesDir` if defined.

### Resolution Order

1. Explicit dependencies in `react-native.config.js`
2. Custom `searchPaths` directories
3. Local `nativeModulesDir` (defaults to `./modules/`)
4. Recursive npm dependency resolution
