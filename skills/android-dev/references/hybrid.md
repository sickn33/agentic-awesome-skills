# Hybrid Android Reference (Capacitor + Ionic / React)

## When to Use Hybrid

✅ Good fit:
- Web team building a companion Android app
- Content-heavy apps (news, docs, forms)
- PWA upgrade to installable app
- Rapid prototyping

❌ Avoid for:
- Real-time games / heavy animations
- Deep native sensor / hardware access
- Apps requiring 60fps custom animations
- Bluetooth/NFC intensive apps (use plugins, but complex)

## Stack Options

| Option | UI Framework | Best For |
|--------|-------------|---------|
| Capacitor + Ionic | Ionic components | Full mobile-optimized UI |
| Capacitor + React | React + Tailwind | Web team reuse |
| Capacitor + Vue | Vue + Ionic | Vue teams |
| Capacitor + Angular | Angular + Ionic | Enterprise Angular teams |

## Project Structure (Capacitor + React)

```
src/
├── App.tsx
├── pages/                # Screen components
├── components/           # Shared UI components
├── hooks/                # Business logic hooks
├── services/             # API, storage services
└── store/                # State management
android/                  # Native Android project (generated)
├── app/src/main/
│   ├── AndroidManifest.xml
│   └── java/.../MainActivity.kt
capacitor.config.ts       # Capacitor configuration
```

## Capacitor Config

```typescript
// capacitor.config.ts
import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.example.app',
  appName: 'My App',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
  },
  android: {
    buildOptions: {
      releaseType: 'APK', // or AAB for Play Store
    },
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 0,
      backgroundColor: '#FFFFFF',
    },
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
  },
};
```

## Native Plugin Usage

```typescript
import { Camera, CameraResultType } from '@capacitor/camera';
import { Preferences } from '@capacitor/preferences';
import { PushNotifications } from '@capacitor/push-notifications';
import { Geolocation } from '@capacitor/geolocation';

// Camera
const takePhoto = async () => {
  const photo = await Camera.getPhoto({
    quality: 90,
    allowEditing: false,
    resultType: CameraResultType.Uri,
  });
  return photo.webPath;
};

// Secure storage: do not store auth tokens in Capacitor Preferences.
// Use a platform-backed secure storage plugin such as
// @aparajita/capacitor-secure-storage, Ionic Identity Vault, or an
// equivalent Android Keystore-backed plugin.
const saveToken = async (token: string) => {
  await SecureStorage.set({ key: 'auth_token', value: token });
};

const getToken = async (): Promise<string | null> => {
  const { value } = await SecureStorage.get({ key: 'auth_token' });
  return value;
};

// Push notifications
const initPush = async () => {
  const permission = await PushNotifications.requestPermissions();
  if (permission.receive === 'granted') {
    await PushNotifications.register();
  }
  PushNotifications.addListener('registration', ({ value: token }) => {
    console.log('FCM Token:', token);
  });
};
```

## Performance Best Practices

- Ensure hardware acceleration is enabled for the application in AndroidManifest.xml (default in Capacitor)
- Enable HTTP caching in Android WebView settings
- Lazy-load routes with React.lazy / dynamic imports
- Avoid `setTimeout`/`setInterval` for animations; use CSS transitions
- Use `@ionic/react` components — they handle mobile-specific touch handling
- Ionic virtual scroll for long lists

## Build & Deploy

```bash
# Build web assets
npm run build

# Sync to native
npx cap sync android

# Open in Android Studio
npx cap open android

# Build release APK/AAB via Android Studio or:
cd android && ./gradlew bundleRelease
```

## Custom Native Plugin (when built-in plugins don't cover it)

```kotlin
// android/app/src/main/java/.../MyPlugin.kt
@CapacitorPlugin(name = "MyPlugin")
class MyPlugin : Plugin() {
    @PluginMethod
    fun doNativeWork(call: PluginCall) {
        val value = call.getString("input") ?: return call.reject("No input")
        // Do native work
        val result = JSObject()
        result.put("output", "processed: $value")
        call.resolve(result)
    }
}

// TypeScript usage
import { registerPlugin } from '@capacitor/core';
const MyPlugin = registerPlugin<{ doNativeWork: (opts: { input: string }) => Promise<{ output: string }> }>('MyPlugin');
const result = await MyPlugin.doNativeWork({ input: 'hello' });
```
