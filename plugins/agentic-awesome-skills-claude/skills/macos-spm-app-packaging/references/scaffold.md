# Scaffold a SwiftPM macOS app (no Xcode)

## Steps
1) Create a repo and initialize SwiftPM:
```
mkdir MyApp
cd MyApp
swift package init --type executable
```

2) Update `Package.swift` to target macOS and define an executable target for the app.

3) Create the app entry point under `Sources/MyApp/`.
- Use SwiftUI if you want a windowed app with minimal AppKit glue.
- Use AppKit if you want a menu bar or accessory-style app.

4) If you need app resources, add:
```
resources: [.process("Resources")]
```
and create `Sources/MyApp/Resources/`.

5) Add a `version.env` file (used by packaging templates):
```
MARKETING_VERSION=0.1.0
BUILD_NUMBER=1
```

6) Copy script templates from `assets/templates/` into your repo (for example, `Scripts/`).

## Minimal Package.swift (example)
```
// swift-tools-version: 6.2
import PackageDescription

let package = Package(
    name: "MyApp",
    platforms: [.macOS(.v14)],
    targets: [
        .executableTarget(
            name: "MyApp",
            path: "Sources/MyApp",
            resources: [
                .process("Resources")
            ])
    ]
)
```

## Minimal SwiftUI entry point (example)
```
import SwiftUI

@main
struct MyApp: App {
    var body: some Scene {
        WindowGroup {
            Text("Hello")
        }
    }
}
```

## Minimal AppKit entry point (example)
```
import AppKit

final class AppDelegate: NSObject, NSApplicationDelegate {
    func applicationDidFinishLaunching(_ notification: Notification) {
        // Initialize app state here.
    }
}

let app = NSApplication.shared
let delegate = AppDelegate()
app.delegate = delegate
app.setActivationPolicy(.regular)
app.run()
```
