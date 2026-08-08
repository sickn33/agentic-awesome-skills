# Config Plugins Reference

Config plugins customize native Android and iOS projects generated with `npx expo prebuild`. They are synchronous functions that accept an `ExpoConfig` and return a modified version.

## Plugin Structure

```
my-module/
  plugin/
    tsconfig.json
    src/
      index.ts
  app.plugin.js         # Entry: module.exports = require('./plugin/build');
```

## Writing a Plugin

Plugin functions follow the `with` prefix naming convention.

```typescript
import {
  ConfigPlugin,
  withInfoPlist,
  withAndroidManifest,
  AndroidConfig,
} from "expo/config-plugins";

const withMyConfig: ConfigPlugin<{ apiKey: string }> = (config, { apiKey }) => {
  // iOS: modify Info.plist
  config = withInfoPlist(config, (config) => {
    config.modResults["MY_API_KEY"] = apiKey;
    return config;
  });

  // Android: modify AndroidManifest.xml
  config = withAndroidManifest(config, (config) => {
    const mainApp =
      AndroidConfig.Manifest.getMainApplicationOrThrow(config.modResults);
    AndroidConfig.Manifest.addMetaDataItemToMainApplication(
      mainApp,
      "MY_API_KEY",
      apiKey
    );
    return config;
  });

  return config;
};

export default withMyConfig;
```

## Using in app.json

```json
{
  "expo": {
    "plugins": [["my-module", { "apiKey": "secret_key" }]]
  }
}
```

## Reading Config Values in Native Code

**Swift:**

```swift
Function("getApiKey") {
  return Bundle.main.object(forInfoDictionaryKey: "MY_API_KEY") as? String
}
```

**Kotlin:**

```kotlin
Function("getApiKey") {
  val appInfo = appContext?.reactContext?.packageManager?.getApplicationInfo(
    appContext?.reactContext?.packageName.toString(),
    PackageManager.GET_META_DATA
  )
  return@Function appInfo?.metaData?.getString("MY_API_KEY")
}
```

## Key Rules

- Plugins must be synchronous; return values must be serializable (except `mods`)
- `Mods` are async functions invoked during the prebuild "syncing" phase
- Use `npm run build plugin` to compile TypeScript plugins
- Test with `npx expo prebuild --clean`
