# Lifecycle Hooks Reference

## Module Lifecycle (in module definition)

```swift
OnCreate {
  // Module initialized - preferred over class initializers
}

OnDestroy {
  // Module deallocated - clean up resources
}

OnAppContextDestroys {
  // App context is being deallocated
}
```

## iOS App Lifecycle (in module definition)

```swift
OnAppEntersForeground { /* UIApplication.willEnterForegroundNotification */ }
OnAppEntersBackground { /* UIApplication.didEnterBackgroundNotification */ }
OnAppBecomesActive { /* UIApplication.didBecomeActiveNotification */ }
```

## Android Activity Lifecycle (in module definition)

```kotlin
OnActivityEntersForeground { /* Activity resumed */ }
OnActivityEntersBackground { /* Activity paused */ }
OnActivityDestroys { /* Activity destroyed */ }
OnNewIntent { intent -> /* Deep link received */ }
OnActivityResult { activity, result -> /* startActivityForResult callback */ }
OnUserLeavesActivity { /* User-initiated background transition */ }
RegisterActivityContracts { /* Modern activity result contracts */ }
```

---

## iOS AppDelegate Subscribers

For hooking into AppDelegate events without editing AppDelegate directly. Requires app's AppDelegate to extend `ExpoAppDelegate`.

```swift
import ExpoModulesCore

public class MyAppDelegateSubscriber: ExpoAppDelegateSubscriber {
  public func applicationDidBecomeActive(_ application: UIApplication) {}
  public func applicationWillResignActive(_ application: UIApplication) {}
  public func applicationDidEnterBackground(_ application: UIApplication) {}
  public func applicationWillEnterForeground(_ application: UIApplication) {}
  public func applicationWillTerminate(_ application: UIApplication) {}

  public func application(
    _ application: UIApplication,
    didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?
  ) -> Bool {
    return false  // Return true if handled
  }
}
```

Register in `expo-module.config.json`:

```json
{
  "apple": {
    "appDelegateSubscribers": ["MyAppDelegateSubscriber"]
  }
}
```

Result aggregation:
- `didFinishLaunchingWithOptions`: Returns `true` if **any** subscriber returns `true`
- `didReceiveRemoteNotification`: Priority: `failed` > `newData` > `noData`

---

## Android Lifecycle Listeners

For hooking into Activity/Application lifecycle outside module definitions. Useful for handling deep links, intents, and app-level initialization.

### ReactActivityLifecycleListener

Supported callbacks: `onCreate`, `onResume`, `onPause`, `onDestroy`, `onNewIntent`, `onBackPressed`.

> Note: `onStart` and `onStop` are **not supported** — the implementation hooks into `ReactActivityDelegate` which lacks these methods.

```kotlin
class MyPackage : Package {
  override fun createReactActivityLifecycleListeners(
    activityContext: Context
  ): List<ReactActivityLifecycleListener> {
    return listOf(MyActivityListener())
  }
}

class MyActivityListener : ReactActivityLifecycleListener {
  override fun onCreate(activity: Activity, savedInstanceState: Bundle?) { }
  override fun onResume(activity: Activity) { }
  override fun onPause(activity: Activity) { }
  override fun onDestroy(activity: Activity) { }
  override fun onNewIntent(intent: Intent?): Boolean { return false }
  override fun onBackPressed(): Boolean { return false }
}
```

### ApplicationLifecycleListener

Supported callbacks: `onCreate`, `onConfigurationChanged`.

```kotlin
class MyPackage : Package {
  override fun createApplicationLifecycleListeners(
    context: Context
  ): List<ApplicationLifecycleListener> {
    return listOf(MyAppListener())
  }
}

class MyAppListener : ApplicationLifecycleListener {
  override fun onCreate(application: Application) {
    // App-level initialization
  }
}
```
