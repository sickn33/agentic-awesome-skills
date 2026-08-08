## Concurrent programming updates in Swift 6.2

Concurrent programming is hard because sharing memory between multiple tasks is prone to mistakes that lead to unpredictable behavior.

## Data-race safety

 Data-race safety in Swift 6 prevents these mistakes at compile time, so you can write concurrent code without fear of introducing hard-to-debug runtime bugs. But in many cases, the most natural code to write is prone to data races, leading to compiler errors that you have to address. A class with mutable state, like this `PhotoProcessor` class, is safe as long as you don’t access it concurrently.

```swift
class PhotoProcessor {
  func extractSticker(data: Data, with id: String?) async -> Sticker? {     }
}

@MainActor
final class StickerModel {
  let photoProcessor = PhotoProcessor()

  func extractSticker(_ item: PhotosPickerItem) async throws -> Sticker? {
    guard let data = try await item.loadTransferable(type: Data.self) else {
      return nil
    }

    // Error: Sending 'self.photoProcessor' risks causing data races
    // Sending main actor-isolated 'self.photoProcessor' to nonisolated instance method 'extractSticker(data:with:)'
    // risks causing data races between nonisolated and main actor-isolated uses
    return await photoProcessor.extractSticker(data: data, with: item.itemIdentifier)
  }
}
```

 It has an async method to extract a `Sticker` by computing the subject of the given image data. But if you try to call `extractSticker` from UI code on the main actor, you’ll get an error that the call risks causing data races. This is because there are several places in the language that offload work to the background implicitly, even if you never needed code to run in parallel.

Swift 6.2 changes this philosophy to stay single threaded by default until you choose to introduce concurrency.

```swift
class PhotoProcessor {
  func extractSticker(data: Data, with id: String?) async -> Sticker? {     }
}

@MainActor
final class StickerModel {
  let photoProcessor = PhotoProcessor()

  func extractSticker(_ item: PhotosPickerItem) async throws -> Sticker? {
    guard let data = try await item.loadTransferable(type: Data.self) else {
      return nil
    }

    // No longer a data race error in Swift 6.2 because of Approachable Concurrency and default actor isolation
    return await photoProcessor.extractSticker(data: data, with: item.itemIdentifier)
  }
}
```

The language changes in Swift 6.2 make the most natural code to write data race free by default. This provides a more approachable path to introducing concurrency in a project.

When you choose to introduce concurrency because you want to run code in parallel, data-race safety will protect you.

First, we've made it easier to call async functions on types with mutable state. Instead of eagerly offloading async functions that aren't tied to a specific actor, the function will continue to run on the actor it was called from. This eliminates data races because the values passed into the async function are never sent outside the actor. Async functions can still offload work in their implementation, but clients don’t have to worry about their mutable state.

Next, we’ve made it easier to implement conformances on main actor types. Here I have a protocol called `Exportable`, and I’m trying to implement a conformance for my main actor `StickerModel` class. The export requirement doesn’t have actor isolation, so the language assumed that it could be called from off the main actor, and prevented `StickerModel` from using main actor state in its implementation.

```swift
protocol Exportable {
  func export()
}

extension StickerModel: Exportable { // error: Conformance of 'StickerModel' to protocol 'Exportable' crosses into main actor-isolated code and can cause data races
  func export() {
    photoProcessor.exportAsPNG()
  }
}
```

Swift 6.2 supports these conformances. A conformance that needs main actor state is called an *isolated* conformance. This is safe because the compiler ensures a main actor conformance is only used on the main actor.

```swift
// Isolated conformances

protocol Exportable {
  func export()
}

extension StickerModel: @MainActor Exportable {
  func export() {
    photoProcessor.exportAsPNG()
  }
}
```

 I can create an `ImageExporter` type that adds a `StickerModel` to an array of any `Exportable` items as long as it stays on the main actor.

```swift
 // Isolated conformances

@MainActor
struct ImageExporter {
  var items: [any Exportable]

  mutating func add(_ item: StickerModel) {
    items.append(item)
  }

  func exportAll() {
    for item in items {
      item.export()
    }
  }
}
```

But if I allow `ImageExporter` to be used from anywhere, the compiler prevents adding `StickerModel` to the array because it isn’t safe to call export on `StickerModel` from outside the main actor.

```swift
// Isolated conformances

nonisolated
struct ImageExporter {
  var items: [any Exportable]

  mutating func add(_ item: StickerModel) {
    items.append(item) // error: Main actor-isolated conformance of 'StickerModel' to 'Exportable' cannot be used in nonisolated context
  }

  func exportAll() {
    for item in items {
      item.export()
    }
  }
}
```

With isolated conformances, you only have to solve data race safety issues when the code indicates that it uses the conformance concurrently.

## Global State

Global and static variables are prone to data races because they allow mutable state to be accessed from anywhere.

```swift
final class StickerLibrary {
  static let shared: StickerLibrary = .init() // error: Static property 'shared' is not concurrency-safe because non-'Sendable' type 'StickerLibrary' may have shared mutable state
}
```

The most common way to protect global state is with the main actor.

```swift
final class StickerLibrary {
  @MainActor
  static let shared: StickerLibrary = .init()
}
```

 And it’s common to annotate an entire class with the main actor to protect all of its mutable state, especially in a project that doesn’t have a lot of concurrent tasks.

```swift
@MainActor
final class StickerLibrary {
  static let shared: StickerLibrary = .init()
}
```

You can model a program that's entirely single-threaded by writing `@MainActor` on everything in your project.

```swift
@MainActor
final class StickerLibrary {
  static let shared: StickerLibrary = .init()
}

@MainActor
final class StickerModel {
  let photoProcessor: PhotoProcessor

  var selection: [PhotosPickerItem]
}

extension StickerModel: @MainActor Exportable {
  func export() {
    photoProcessor.exportAsPNG()
  }
}
```

To make it easier to model single-threaded code, we’ve introduced a mode to infer main actor by default.

```swift
// Mode to infer main actor by default in Swift 6.2

final class StickerLibrary {
  static let shared: StickerLibrary = .init()
}

final class StickerModel {
  let photoProcessor: PhotoProcessor

  var selection: [PhotosPickerItem]
}

extension StickerModel: Exportable {
  func export() {
    photoProcessor.exportAsPNG()
  }
}
```

 This eliminates data-race safety errors about unsafe global and static variables, calls to other main actor functions like ones from the SDK, and more, because the main actor protects all mutable state by default. It also reduces concurrency annotations in code that’s mostly single-threaded. This mode is great for projects that do most of the work on the main actor, and concurrent code is encapsulated within specific types or files. It’s opt-in and it’s recommended for apps, scripts, and other executable targets.

## Offloading work to the background

Offloading work to the background is still important for performance, such as keeping apps responsive when performing CPU-intensive tasks.

Let’s look at the implementation of the `extractSticker` method on `PhotoProcessor`.

```swift
// Explicitly offloading async work

class PhotoProcessor {
  var cachedStickers: [String: Sticker]

  func extractSticker(data: Data, with id: String) async -> Sticker {
      if let sticker = cachedStickers[id] {
        return sticker
      }

      let sticker = await Self.extractSubject(from: data)
      cachedStickers[id] = sticker
      return sticker
  }

  // Offload expensive image processing using the @concurrent attribute.
  @concurrent
  static func extractSubject(from data: Data) async -> Sticker { }
}
```

It first checks whether it already extracted a sticker for an image, so it can return the cached sticker immediately. If the sticker hasn’t been cached, it extracts the subject from the image data and creates a new sticker. The `extractSubject` method performs expensive image processing that I don’t want to block the main actor or any other actor.

I can offload this work using the `@concurrent` attribute. `@concurrent` ensures that a function always runs on the concurrent thread pool, freeing up the actor to run other tasks at the same time.

### An example

Say you have a function called `process` that you would like to run on a background thread. To call that function on a background thread you need to:

- make sure the structure or class is `nonisolated`
- add the `@concurrent` attribute to the function you want to run in the background
- add the keyword `async` to the function if it is not already asynchronous
- and then add the keyword `await` to any callers

Like this:

```swift
nonisolated struct PhotoProcessor {

    @concurrent
    func process(data: Data) async -> ProcessedPhoto? { ... }
}

// Callers with the added await
processedPhotos[item.id] = await PhotoProcessor().process(data: data)
```


## Summary

These language changes work together to make concurrency more approachable.

You start by writing code that runs on the main actor by default, where there’s no risk of data races. When you start to use async functions, those functions run wherever they’re called from. There’s still no risk of data races because all of your code still runs on the main actor. When you’re ready to embrace concurrency to improve performance, it’s easy to offload specific code to the background to run in parallel.

Some of these language changes are opt-in because they require changes in your project to adopt. You can find and enable all of the approachable concurrency language changes under the Swift Compiler - Concurrency section of Xcode build settings. You can also enable these features in a Swift package manifest file using the SwiftSettings API.

 Swift 6.2 includes migration tooling to help you make the necessary code changes automatically. You can learn more about migration tooling at swift.org/migration.
