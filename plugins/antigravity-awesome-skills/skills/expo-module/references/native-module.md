# Native Module DSL Reference

Swift is shown as the primary language. Kotlin follows the same DSL structure (see SKILL.md for both). Kotlin-specific syntax is noted where it meaningfully differs.

## Name

Sets the module identifier used in JavaScript.

```swift
Name("MyModule")
```

## Constant

Computed once on first access, then cached.

```swift
Constant("PI") { 3.14159 }
```

## Function (Synchronous)

Blocks the JS thread until completion. Supports up to 8 arguments.

```swift
Function("add") { (a: Int, b: Int) -> Int in
  return a + b
}
```

## AsyncFunction

Returns a Promise. Runs on a background thread by default.

```swift
AsyncFunction("fetchData") { (url: URL) -> String in
  let data = try Data(contentsOf: url)
  return String(data: data, encoding: .utf8) ?? ""
}

// Force main queue execution
AsyncFunction("updateUI") { () -> Void in
  // UI work
}.runOnQueue(.main)
```

**Kotlin differences:**

```kotlin
// Supports Kotlin coroutines
AsyncFunction("fetchData") Coroutine { url: java.net.URL ->
  withContext(Dispatchers.IO) {
    url.readText()
  }
}
```

## Property

Getter/setter for JS object properties.

```swift
// Read-only
Property("version") { "1.0.0" }

// Read-write
Property("volume")
  .get { () -> Float in self.volume }
  .set { (newValue: Float) in self.volume = newValue }
```

## Events

Declares events the module can send to JS. Must be declared before using `sendEvent`.

```swift
// Declaration
Events("onChange", "onError")

// Sending from native (Swift)
sendEvent("onChange", ["value": newValue])
```

**Kotlin difference** — uses `bundleOf`:

```kotlin
sendEvent("onChange", bundleOf("value" to newValue))
```

**JS subscription:**

```typescript
import { useEvent } from "expo";
import MyModule from "./MyModule";

// Hook-based (recommended)
const event = useEvent(MyModule, "onChange");

// Manual subscription
const subscription = MyModule.addListener("onChange", (event) => {
  console.log(event.value);
});
// Clean up: subscription.remove()
```

### OnStartObserving / OnStopObserving

Called when the first listener attaches / last listener detaches. Can be scoped to specific events.

```swift
OnStartObserving("onChange") {
  // Start producing events
}

OnStopObserving("onChange") {
  // Stop producing events
}
```

---

## Type System

### Primitives

| Swift | Kotlin | JS |
|-------|--------|----|
| `Bool` | `Boolean` | `boolean` |
| `Int`, `Int32` | `Int` | `number` |
| `Int64` | `Long` | `number` |
| `Float`, `Float32` | `Float` | `number` |
| `Double` | `Double` | `number` |
| `String` | `String` | `string` |
| `URL` | `java.net.URL` / `android.net.Uri` | `string` |
| `CGPoint` | - | `{ x, y }` |
| `CGSize` | - | `{ width, height }` |
| `CGRect` | - | `{ x, y, width, height }` |
| `UIColor` / `CGColor` | `android.graphics.Color` | `string` (ProcessedColorValue) |
| `Data` | `kotlin.ByteArray` | `Uint8Array` |

### Records (Struct-like types)

```swift
struct UserRecord: Record {
  @Field var name: String = ""
  @Field var age: Int = 0
  @Field var email: String?
}

Function("createUser") { (user: UserRecord) -> Bool in
  return true
}
```

**Kotlin difference** — uses `class` instead of `struct`, optional fields need explicit `= null`:

```kotlin
class UserRecord : Record {
  @Field var name: String = ""
  @Field var age: Int = 0
  @Field var email: String? = null
}
```

### Enums (Enumerable)

```swift
enum Theme: String, Enumerable {
  case light
  case dark
  case system
}

Function("setTheme") { (theme: Theme) in
  // type-safe enum value
}
```

**Kotlin difference** — uses `enum class` with explicit `value` property:

```kotlin
enum class Theme(val value: String) : Enumerable {
  LIGHT("light"),
  DARK("dark"),
  SYSTEM("system")
}
```

### Either Types (Union types)

```swift
Function("process") { (input: Either<String, Int>) in
  if let str = input.get(String.self) {
    // handle string
  } else if let num = input.get(Int.self) {
    // handle number
  }
}
```

Also available: `EitherOfThree<A, B, C>`, `EitherOfFour<A, B, C, D>`.

### JavaScript Values (Direct JS manipulation)

For advanced use in synchronous functions running on JS thread:

```swift
Function("callback") { (fn: JavaScriptFunction<String>) in
  let result = fn("arg1", "arg2")
}
```

---

## Shared Objects

Bridge native class instances to JS with automatic lifecycle management. Instances are deallocated when neither JS nor native code holds a reference.

### Defining a Shared Object

```swift
class ImageContext: SharedObject {
  private var image: UIImage

  init(image: UIImage) {
    self.image = image
    super.init()
  }

  func rotate(degrees: Double) {
    image = image.rotated(degrees: degrees)
  }
}
```

**Kotlin difference** — takes `RuntimeContext` in constructor, override `sharedObjectDidRelease()` for cleanup:

```kotlin
class ImageContext(
  runtimeContext: RuntimeContext,
  private var bitmap: Bitmap
) : SharedObject(runtimeContext) {

  fun rotate(degrees: Float) { /* ... */ }

  override fun sharedObjectDidRelease() {
    if (!bitmap.isRecycled) bitmap.recycle()
  }
}
```

### Exposing via Class DSL

```swift
Class("Context", ImageContext.self) {
  Constructor { (path: String) -> ImageContext in
    return ImageContext(image: UIImage(contentsOfFile: path)!)
  }

  Function("rotate") { (ctx: ImageContext, degrees: Double) -> ImageContext in
    ctx.rotate(degrees: degrees)
    return ctx
  }

  Property("width")
    .get { (ctx: ImageContext) -> Int in ctx.width }
}
```

Other Class DSL components: `StaticFunction`, `StaticAsyncFunction`, `AsyncFunction`.

### SharedRef

Specialized shared reference for passing typed objects between modules:

```swift
final class ImageRef: SharedRef<UIImage> {}
```

### JS Usage

```typescript
const ctx = await ImageModule.create("/path/to/image.png");
ctx.rotate(90);
console.log(ctx.width);
```
