# Java Sharp Edges

> Catalog correction (CC-BY-SA-4.0 adaptation; original attribution/license in UPSTREAM-NOTICE.md): snippets are isolated teaching fragments, not production implementations or an assertion of exploitability. Confirm the installed language/library version, trust boundary, reachable input and impact. Use inert local fixtures only; do not execute the intentionally unsafe snippets, untrusted audited code or destructive payloads. No network attack or configuration change is authorized by this guide.


## Equality Confusion

```java
// DANGEROUS: == compares references, not values
String a = new String("hello");
String b = new String("hello");
a == b  // FALSE - different objects

// String interning makes this confusing:
String c = "hello";
String d = "hello";
c == d  // TRUE - string literals are interned

// DANGEROUS: Integer caching boundary
Integer x = 127;
Integer y = 127;
x == y  // TRUE - cached in range [-128, 127]

Integer p = 128;
Integer q = 128;
p == q  // Not guaranteed: implementations may cache values outside the minimum range.
```

**Fix**: Always use `.equals()` for object comparison:
```java
a.equals(b)  // TRUE
p.equals(q)  // TRUE
Objects.equals(a, b)  // Null-safe
```

## Type Erasure

```java
// DANGEROUS: Generic types erased at runtime
List<String> strings = new ArrayList<>();
List<Integer> ints = new ArrayList<>();

// At runtime, both are just "ArrayList"
strings.getClass() == ints.getClass()  // TRUE

// Can't do runtime type checks:
if (obj instanceof List<String>) { }  // Compile error!

// Can cast incorrectly:
List<?> raw = strings;
List<Integer> wrongType = (List<Integer>) raw;  // No runtime error!
wrongType.get(0);  // ClassCastException here, not at cast
```

## Serialization RCE

```java
// DANGEROUS: Like pickle, deserializes arbitrary objects
ObjectInputStream ois = new ObjectInputStream(untrustedInput);
Object obj = ois.readObject();

// During readObject, deserialization may invoke callbacks such as:
// - readObject() methods
// - readResolve() methods
// - implementation/class-specific callbacks; finalization availability is runtime-dependent

// "Gadget chains" in libraries enable RCE:
// - Commons Collections
// - Spring Framework
// - Apache libraries
// ysoserial tool generates payloads
```

**Fix**: Use JSON or implement `ObjectInputFilter` (Java 9+):
```java
ObjectInputFilter filter = ObjectInputFilter.Config.createFilter(
    "!*"  // Reject all classes
);
```

## Null Pointer Exceptions

```java
// DANGEROUS: Unboxing null throws NPE
Integer value = null;
int primitive = value;  // NPE!

// DANGEROUS: Chained calls
String name = user.getProfile().getSettings().getName();
// NPE if any intermediate is null

// Optional doesn't help if misused:
Optional.of(null);  // NPE!
optional.get();     // NoSuchElementException if empty
```

**Fix**: Use Optional correctly:
```java
Optional.ofNullable(value);
optional.orElse(default);
optional.map(x -> x.transform()).orElse(null);
```

## Checked Exception Swallowing

```java
// DANGEROUS: Empty catch blocks
try {
    sensitiveOperation();
} catch (Exception e) {
    // Silently swallowed - failure masked!
}

// DANGEROUS: Catch-and-log without action
try {
    authenticate();
} catch (AuthException e) {
    log.error("Auth failed", e);
    // Continues as if authentication succeeded!
}

// DANGEROUS: Over-broad catch
try {
    doWork();
} catch (Exception e) {  // Catches everything including bugs
    return defaultValue;
}
```

## String Operations

```java
// DANGEROUS: String concatenation in loops
String result = "";
for (String s : items) {
    result += s;  // Creates new String each iteration
}
// O(n²) time complexity, memory churn

// DANGEROUS: split() with regex
"a.b.c".split(".");  // Empty array! "." is regex for "any char"

// DANGEROUS: substring() memory (pre-Java 7u6)
String huge = loadGigabyteFile();
String small = huge.substring(0, 10);
// small holds reference to entire huge char[]
```

**Fix**: Use `StringBuilder`, `Pattern.quote(".")`, modern Java.

## Thread Safety

```java
// DANGEROUS: SimpleDateFormat is not thread-safe
static SimpleDateFormat fmt = new SimpleDateFormat("yyyy-MM-dd");

// Multiple threads calling fmt.parse() = corrupted results

// DANGEROUS: HashMap not thread-safe
Map<String, String> map = new HashMap<>();
// Concurrent put() can cause infinite loop!

// DANGEROUS: Double-checked locking (broken before Java 5)
if (instance == null) {
    synchronized (lock) {
        if (instance == null) {
            instance = new Singleton();  // May see partially constructed
        }
    }
}
```

**Fix**: Use `DateTimeFormatter` (immutable), `ConcurrentHashMap`, volatile.

## Resource Leaks

```java
// DANGEROUS: Resources not closed on exception
FileInputStream fis = new FileInputStream(file);
// Exception here = fis never closed
process(fis);
fis.close();

// DANGEROUS: Close in finally can mask exception
FileInputStream fis = null;
try {
    fis = new FileInputStream(file);
    throw new RuntimeException("oops");
} finally {
    fis.close();  // May throw, masking original exception
}
```

**Fix**: Use try-with-resources:
```java
try (FileInputStream fis = new FileInputStream(file)) {
    process(fis);
}  // Automatically closed, exceptions properly handled
```

## Floating Point

```java
// DANGEROUS: Float/double for money
double price = 0.1 + 0.2;  // 0.30000000000000004
if (price == 0.3) { }  // FALSE!

// DANGEROUS: BigDecimal from double
new BigDecimal(0.1);  // 0.1000000000000000055511151231257827...
```

**Fix**: Use `BigDecimal` with String constructor:
```java
new BigDecimal("0.1");  // Exactly 0.1
```

## Reflection

```java
// DANGEROUS: Bypasses access controls
Field field = obj.getClass().getDeclaredField("privateField");
field.setAccessible(true);  // Bypass private!
field.set(obj, maliciousValue);

// Can modify "final" fields (with caveats)
// Can invoke private methods
// Can break encapsulation entirely
```

## XML Processing (XXE)

```java
// DANGEROUS: Default XML parsers allow XXE
DocumentBuilderFactory factory = DocumentBuilderFactory.newInstance();
// Default allows: <!DOCTYPE foo [<!ENTITY xxe SYSTEM "file:///etc/passwd">]>

// Rejecting DOCTYPE prevents classic DTD entity expansion when the parser honors the feature.
// Also enforce external-access restrictions, secure processing and resource limits; fail if controls are unsupported.
```

**Fix**: Disable all external entities:
```java
factory.setFeature("http://apache.org/xml/features/disallow-doctype-decl", true);
factory.setFeature("http://xml.org/sax/features/external-general-entities", false);
factory.setFeature("http://xml.org/sax/features/external-parameter-entities", false);
factory.setAttribute(javax.xml.XMLConstants.ACCESS_EXTERNAL_DTD, "");
factory.setAttribute(javax.xml.XMLConstants.ACCESS_EXTERNAL_SCHEMA, "");
factory.setFeature(javax.xml.XMLConstants.FEATURE_SECURE_PROCESSING, true);
factory.setXIncludeAware(false);
factory.setExpandEntityReferences(false);
```

## Detection Patterns

| Pattern | Risk |
|---------|------|
| `==` with objects | Reference comparison |
| `Integer/Long` comparison with `==` | Cache boundary |
| `ObjectInputStream.readObject()` | Deserialization RCE |
| Empty `catch` block | Swallowed exception |
| `catch (Exception e)` | Over-broad catch |
| `String +=` in loop | Performance, memory |
| `split(".")` | Regex interpretation |
| `static SimpleDateFormat` | Thread safety |
| `HashMap` shared across threads | Race condition |
| Resources without try-with-resources | Resource leak |
| `new BigDecimal(double)` | Precision loss |
| `DocumentBuilderFactory.newInstance()` | XXE vulnerability |
