# Swift Sharp Edges

> Catalog correction (CC-BY-SA-4.0 adaptation; original attribution/license in UPSTREAM-NOTICE.md): snippets are isolated teaching fragments, not production implementations or an assertion of exploitability. Confirm the installed language/library version, trust boundary, reachable input and impact. Use inert local fixtures only; do not execute the intentionally unsafe snippets, untrusted audited code or destructive payloads. No network attack or configuration change is authorized by this guide.


## Force Unwrapping

```swift
// DANGEROUS: Crashes on nil
let value = optionalValue!  // Runtime crash if nil

// Common in:
let cell = tableView.dequeueReusableCell(...)!
let url = URL(string: userInput)!
let data = try! JSONDecoder().decode(...)

// DANGEROUS: Implicitly Unwrapped Optionals
var name: String!  // IUO - crashes if accessed while nil

class ViewController: UIViewController {
    @IBOutlet weak var label: UILabel!  // Nil before viewDidLoad
}
```

**Fix**: Use optional binding or nil-coalescing:
```swift
if let value = optionalValue {
    use(value)
}
let value = optionalValue ?? defaultValue
guard let value = optionalValue else { return }
```

## try! and try?

```swift
// DANGEROUS: try! crashes on error
let data = try! Data(contentsOf: url)

// DANGEROUS: try? silently converts error to nil
let data = try? Data(contentsOf: url)
// No way to know if failure was "file not found" or "permission denied"

// DANGEROUS: Ignoring error completely
do {
    try riskyOperation()
} catch {
    // Error swallowed
}
```

**Fix**: Handle errors explicitly:
```swift
do {
    let data = try Data(contentsOf: url)
} catch let error as NSError where error.code == NSFileNoSuchFileError {
    // Handle file not found
} catch {
    // Handle other errors
}
```

## as! Force Cast

```swift
// DANGEROUS: Crashes if cast fails
let user = object as! User

// Common antipattern:
let cell = tableView.dequeueReusableCell(...) as! CustomCell
// Crashes if wrong identifier or wrong class
```

**Fix**: Use conditional cast:
```swift
if let user = object as? User {
    use(user)
}
guard let user = object as? User else {
    return  // or handle error
}
```

## String/NSString Bridging

```swift
// DANGEROUS: Different indexing semantics
let nsString: NSString = "cafe\u{301}"  // decomposed accent
let swiftString = nsString as String

nsString.length        // 5 (UTF-16 code units)
swiftString.count      // 4 (extended grapheme clusters)

// Range confusion:
let range = nsString.range(of: "é")  // NSRange (UTF-16)
// Can't directly use with String (uses String.Index)

// DANGEROUS: Emoji handling
let emoji = "👨‍👩‍👧‍👦"  // Family emoji
emoji.count           // 1 (grapheme cluster)
emoji.utf16.count     // 11 (UTF-16)
(emoji as NSString).length  // 11
```

## Reference Cycles

```swift
// DANGEROUS: Strong reference cycles cause memory leaks
class Person {
    var apartment: Apartment?
}
class Apartment {
    var tenant: Person?  // Strong reference
}

let john = Person()
let apt = Apartment()
john.apartment = apt
apt.tenant = john  // Cycle! Neither deallocated

// DANGEROUS: Closures capture self strongly
class MyClass {
    var callback: (() -> Void)?

    func setup() {
        callback = {
            self.doSomething()  // Strong capture of self
        }
    }
}
```

**Fix**: Use weak references, or unowned only when the referred object is guaranteed to outlive the reference:
```swift
class Apartment {
    weak var tenant: Person?  // Weak breaks cycle
}

callback = { [weak self] in
    self?.doSomething()
}
```

## Array/Dictionary Thread Safety

```swift
// DANGEROUS: Collections are not thread-safe
var array = [Int]()

// Thread 1:
array.append(1)

// Thread 2:
array.append(2)

// Crash or corruption possible!
```

**Fix**: Use serial dispatch queue, locks, or actors (Swift 5.5+):
```swift
actor SafeStorage {
    private var items = [Int]()

    func add(_ item: Int) {
        items.append(item)
    }
}
```

## Numeric Overflow

```swift
// In debug: crashes (overflow check)
// In release: also crashes by default (unlike C)
let x: Int8 = 127
let y = x + 1  // Fatal error: arithmetic overflow

// BUT: If using &+ operators, wraps silently
let y = x &+ 1  // -128 (wrapping)
```

This is safer than C, but `&+` operators can still cause issues.

## Uninitialized Properties

```swift
// DANGEROUS: Accessing before initialization
class MyClass {
    var value: Int

    init() {
        print(value)  // Compile error in Swift, thankfully
        value = 42
    }
}

// BUT: @objc interop can bypass
// AND: Unsafe pointers have no initialization guarantees
```

## Protocol Witness Table Issues

```swift
// DANGEROUS: Protocol with Self requirement
protocol Equatable {
    static func ==(lhs: Self, rhs: Self) -> Bool
}

// Can't use heterogeneously:
var items: [Equatable] = [...]  // Error!
// Must use type erasure or existentials
```

## KeyPath Subscript Confusion

```swift
// DANGEROUS: Similar syntax, different behavior
struct User {
    var name: String
    subscript(key: String) -> String? { ... }
}

user["name"]       // Calls subscript
user[keyPath: \.name]  // Uses KeyPath

// Easy to confuse when debugging
```

## Codable Pitfalls

```swift
// Decoding throws for a wrong type; silence comes only from caller error swallowing
struct User: Codable {
    var id: Int
}

// JSON: {"id": "123"}  // String, not Int
// Throws DecodingError, but often caught broadly

// DANGEROUS: Missing keys
struct User: Codable {
    var id: Int
    var name: String  // Required
}

// JSON: {"id": 1}  // Missing "name"
// Throws, but error message may not be clear
```

**Fix**: Use explicit CodingKeys and handle errors:
```swift
struct User: Codable {
    var id: Int
    var name: String?  // Optional for missing keys

    enum CodingKeys: String, CodingKey {
        case id
        case name
    }
}
```

## Objective-C Interop

```swift
// DANGEROUS: Objective-C returns nullable even when Swift sees non-optional
@objc func legacyMethod() -> NSString  // May actually return nil

// DANGEROUS: Objective-C exceptions not caught by Swift
// NSException bypasses Swift error handling

// DANGEROUS: Objective-C performSelector
let result = obj.perform(NSSelectorFromString(userInput))
// Invokes a dynamically selected selector supported by the receiver; allowlist permitted operations.
```

## Detection Patterns

| Pattern | Risk |
|---------|------|
| `!` force unwrap | Crash on nil |
| `as!` force cast | Crash on type mismatch |
| `try!` | Crash on error |
| `try?` without handling nil | Silent failure |
| `String!` IUO types | Deferred crash |
| Closure capturing `self` without `[weak self]` | Memory leak |
| Collections modified from multiple threads | Race condition |
| NSString/String conversion with ranges | Index mismatch |
| `&+`, `&-`, `&*` operators | Silent overflow |
| `@objc` methods returning non-optional | Nil bridge issues |
