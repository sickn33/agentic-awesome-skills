---
name: dart
description: "Language-specific super-code guidelines for dart."
risk: safe
source: community
date_added: "2026-06-16"
---
# Dart: Idiomatic Efficiency Reference

## Table of Contents
1. [Null Safety](#nulls)
2. [Collections & Iteration](#collections)
3. [Classes & Records](#classes)
4. [Async/Await & Streams](#async)
5. [Error Handling](#errors)
6. [Flutter-Specific Patterns](#flutter)
7. [Anti-patterns specific to Dart](#antipatterns)

---

## 1. Null Safety {#nulls}

```dart
// ❌ Manual null check
String display;
if (user.name != null) {
  display = user.name!;
} else {
  display = 'Unknown';
}

// ✅
final display = user.name ?? 'Unknown';
```

```dart
// ❌ Nested null checks
if (user != null && user.address != null && user.address!.city != null) {
  print(user.address!.city!);
}

// ✅
final city = user?.address?.city;
if (city != null) print(city);
```

```dart
// ❌ Late field when nullable is correct
late String name; // crashes if accessed before assignment

// ✅ — use late only when you guarantee initialization before access
String? name; // honestly nullable
// late is fine for: late final _controller = TextEditingController();
```

```dart
// ❌ Bang operator (!) everywhere
final name = user.name!;
final city = user.address!.city!;

// ✅ — promote through null checks
final name = user.name;
if (name == null) return;
// name is now non-null (promoted)
```

---

## 2. Collections & Iteration {#collections}

```dart
// ❌ Imperative accumulation
final result = <String>[];
for (final item in items) {
  if (item.isActive) result.add(item.name.toUpperCase());
}

// ✅
final result = items
    .where((i) => i.isActive)
    .map((i) => i.name.toUpperCase())
    .toList();
```

```dart
// ❌ Manual map construction
final map = <String, List<Item>>{};
for (final item in items) {
  map.putIfAbsent(item.category, () => []).add(item);
}

// ✅ (using collection-if/for in a different way — but groupBy isn't built-in)
// The loop above is actually idiomatic Dart. Use package:collection for groupBy:
import 'package:collection/collection.dart';
final map = groupBy(items, (Item i) => i.category);
```

```dart
// ❌ Building list with add() calls
final widgets = <Widget>[];
widgets.add(Header());
if (showSubtitle) widgets.add(Subtitle());
widgets.add(Body());

// ✅ — collection-if
final widgets = [
  Header(),
  if (showSubtitle) Subtitle(),
  Body(),
];
```

```dart
// ❌ Spreading manually
final all = <int>[];
all.addAll(listA);
all.addAll(listB);

// ✅
final all = [...listA, ...listB];
```

---

## 3. Classes & Records {#classes}

```dart
// ❌ Manual data class boilerplate
class Point {
  final int x, y;
  const Point(this.x, this.y);
  @override bool operator ==(Object other) => ...
  @override int get hashCode => ...
  @override String toString() => 'Point($x, $y)';
}

// ✅ (Dart 3.0+)
typedef Point = ({int x, int y});
// or for named class semantics:
class Point {
  final int x, y;
  const Point(this.x, this.y);
}
// Use package:equatable or Dart records for equality
```

```dart
// ❌ Verbose constructor
class User {
  final String name;
  final int age;
  User(String name, int age) : name = name, age = age;
}

// ✅ — initializing formals
class User {
  final String name;
  final int age;
  const User(this.name, this.age);
}
```

```dart
// ❌ Mutable fields on an immutable object
class Config {
  String host;
  int port;
  Config(this.host, this.port);
}

// ✅
class Config {
  final String host;
  final int port;
  const Config(this.host, this.port);
}
```

```dart
// ❌ Switch on type with if-else chain
if (shape is Circle) {
  return (shape as Circle).radius * pi;
} else if (shape is Rectangle) { ... }

// ✅ (Dart 3.0+)
return switch (shape) {
  Circle(:final radius) => radius * radius * pi,
  Rectangle(:final width, :final height) => width * height,
};
```

---

## 4. Async/Await & Streams {#async}

```dart
// ❌ .then() chains
fetchUser()
    .then((user) => fetchPosts(user))
    .then((posts) => display(posts))
    .catchError((e) => log(e));

// ✅
try {
  final user = await fetchUser();
  final posts = await fetchPosts(user);
  display(posts);
} catch (e) {
  log(e);
}
```

```dart
// ❌ Sequential await for independent work
final a = await fetchA();
final b = await fetchB();

// ✅
final results = await Future.wait([fetchA(), fetchB()]);
// or with typed destructuring:
final (a, b) = await (fetchA(), fetchB()).wait; // Dart 3.0+ record
```

```dart
// ❌ StreamBuilder doing too much in build
StreamBuilder(
  stream: stream,
  builder: (ctx, snap) {
    if (snap.hasError) return Error();
    if (!snap.hasData) return Loading();
    final data = snap.data!;
    // 50 lines of widget tree...
  },
)

// ✅ — extract widget, or use listen + setState for simple cases
```

---

## 5. Error Handling {#errors}

```dart
// ❌ Catching Exception (too broad)
try { process(); }
on Exception catch (e) { print(e); }

// ✅ — catch specific types
try {
  process();
} on FormatException catch (e) {
  throw AppException('Invalid format', cause: e);
} on HttpException catch (e) {
  throw AppException('Network error', cause: e);
}
```

```dart
// ❌ Returning null for errors
Future<User?> fetchUser() async {
  try { return await api.getUser(); }
  catch (_) { return null; } // caller doesn't know why
}

// ✅ — let exceptions propagate, or use sealed Result type
sealed class Result<T> {}
class Success<T> extends Result<T> { final T value; Success(this.value); }
class Failure<T> extends Result<T> { final Object error; Failure(this.error); }
```

---

## 6. Flutter-Specific Patterns {#flutter}

```dart
// ❌ Rebuilding entire tree on state change
setState(() {
  // changes a single value, but the build() method builds 200 widgets
});

// ✅ — extract subtrees into separate widgets or use ValueListenableBuilder
ValueListenableBuilder<int>(
  valueListenable: counter,
  builder: (_, value, __) => Text('$value'),
)
```

```dart
// ❌ const-able widget without const
Container(color: Colors.blue)

// ✅
const ColoredBox(color: Colors.blue)
// Mark constructors const when possible; use `const` keyword at call site
```

```dart
// ❌ Navigator.push with MaterialPageRoute everywhere
Navigator.push(context, MaterialPageRoute(builder: (_) => DetailPage()));

// ✅ — named routes or GoRouter
context.go('/detail');
```

---

## 7. Anti-patterns specific to Dart {#antipatterns}

| Anti-pattern | Preferred |
|---|---|
| `!` (bang) operator liberally | null checks and promotion |
| `dynamic` everywhere | proper types |
| `as` cast without check | pattern matching or `is` check |
| Mutable fields on value objects | `final` fields |
| `print()` for logging | `package:logging` or structured logger |
| Manual `==`/`hashCode` | records, equatable, or code generation |
| `setState` for complex state | Riverpod / Bloc / Provider |
| Deep widget nesting | extract widgets into classes |
| String-based routing | typed routing (GoRouter) |
| `late` as escape hatch | nullable types or proper initialization |
| `Future.delayed` for debounce | `Timer` or proper debounce utility |



## Limitations
- These are language-specific guidelines and do not cover overall architectural decisions.
- Over-compression might reduce readability; apply judgement.
