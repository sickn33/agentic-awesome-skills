# Native App Clip detection

Create a local Expo module so JS can detect when the app is running inside an App Clip and present the install prompt for the full app.

```sh
bunx create-expo-module --local
```

## Swift module

```swift
import ExpoModulesCore
import StoreKit

internal class MissingCurrentWindowSceneException: Exception {
  override var reason: String {
    "Cannot determine the current window scene in which to present the modal for requesting a review."
  }
}

internal class MissingContainerURLException: Exception {
  override var reason: String {
    "Cannot determine the container URL."
  }
}

public class AppClipModule: Module {
  private static let isAppClip: Bool = {
    if let infoPlist = Bundle.main.infoDictionary, let _ = infoPlist["NSAppClip"] as? [String: Any] {
      return true
    }
    return false
  }()

  public func definition() -> ModuleDefinition {
    Name("AppClip")

    Constant("isAppClip") {
      AppClipModule.isAppClip
    }

    // Display overlay to advertise full app.
    // https://developer.apple.com/documentation/app_clips/recommending_your_app_to_app_clip_users
    AsyncFunction("prompt") {
      if #available(iOS 16, *) {
        guard let currentScene = UIApplication.shared.connectedScenes.first as? UIWindowScene else {
          throw MissingCurrentWindowSceneException()
        }

        let config = SKOverlay.AppClipConfiguration(position: .bottom)
        let overlay = SKOverlay(configuration: config)
        overlay.present(in: currentScene)
      }
    }.runOnQueue(DispatchQueue.main)
  }
}
```

## TypeScript interface

```ts
import { NativeModule, requireOptionalNativeModule } from "expo";

declare class AppClipModule extends NativeModule<{}> {
  prompt(): void;
  isAppClip?: boolean;
}

const AppClipNative = requireOptionalNativeModule<AppClipModule>("AppClip");

if (AppClipNative?.isAppClip) {
  navigator.appClip = {
    prompt: AppClipNative.prompt,
  };
}

declare global {
  interface Navigator {
    /**
     * Only available in an App Clip context.
     * @expo
     */
    appClip?: {
      /** Open the SKOverlay */
      prompt: () => void;
    };
  }
}

export {};
```

## Usage

- Detect App Clip context: `if (navigator.appClip) { ... }`
- Prompt to install the full app: `navigator.appClip?.prompt()`
