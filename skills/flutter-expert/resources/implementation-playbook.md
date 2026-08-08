# Flutter Implementation Playbook

Concrete, copy-adaptable patterns for the `flutter-expert` skill. Every snippet
targets **Flutter 3.x + Dart 3.x** with null safety. Use these as starting
points, then adapt to the project's architecture and constraints.

---

## 1. Recommended Project Structure (feature-first + clean layers)

```
lib/
  main.dart
  core/                 # cross-cutting: theme, router, errors, DI
    errors/failure.dart
    network/dio_client.dart
  features/
    products/
      data/             # models, DTOs, repositories impl
      domain/           # entities, repository contracts, use cases
      presentation/     # widgets, screens, providers/controllers
```

**Rule of thumb:** `presentation` may import `domain`; `data` implements
`domain` contracts; `domain` imports nothing from Flutter. This keeps business
logic testable without a widget tree.

---

## 2. State Management with Riverpod 2.x (recommended default)

Riverpod gives compile-time safety and easy testing. Prefer code-generation
(`riverpod_generator`) for new projects.

```dart
// products_controller.dart
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'products_controller.g.dart';

@riverpod
class ProductsController extends _$ProductsController {
  @override
  Future<List<Product>> build() async {
    // The return value is exposed as AsyncValue<List<Product>>.
    return ref.watch(productRepositoryProvider).fetchAll();
  }

  Future<void> refresh() async {
    state = const AsyncLoading();
    state = await AsyncValue.guard(
      () => ref.read(productRepositoryProvider).fetchAll(),
    );
  }
}
```

Consume it with explicit loading/error/data states — never assume data is
ready:

```dart
class ProductsScreen extends ConsumerWidget {
  const ProductsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final productsAsync = ref.watch(productsControllerProvider);

    return productsAsync.when(
      loading: () => const Center(child: CircularProgressIndicator()),
      error: (err, _) => ErrorView(message: err.toString()),
      data: (products) => ListView.builder(
        itemCount: products.length,
        itemBuilder: (_, i) => ProductTile(product: products[i]),
      ),
    );
  }
}
```

---

## 3. Repository + Dio with error mapping

Keep network failures out of the UI. Map them to a typed `Failure` in the data
layer.

```dart
sealed class Failure {
  const Failure(this.message);
  final String message;

  // Override toString so UI code that renders err.toString() shows the
  // mapped message instead of "Instance of 'NetworkFailure'".
  @override
  String toString() => message;
}

class NetworkFailure extends Failure {
  const NetworkFailure(super.message);
}

class ProductRepository {
  ProductRepository(this._dio);
  final Dio _dio;

  Future<List<Product>> fetchAll() async {
    try {
      final res = await _dio.get('/products');
      return (res.data as List)
          .map((json) => Product.fromJson(json as Map<String, dynamic>))
          .toList();
    } on DioException catch (e) {
      throw NetworkFailure('Failed to load products: ${e.message}');
    }
  }
}
```

---

## 4. Performance: rebuilds, const, and keys

- Mark widgets `const` whenever their inputs are compile-time constants — this
  lets Flutter skip rebuilds entirely.
- Split large `build` methods into smaller widgets so only the changing subtree
  rebuilds.
- Use `ListView.builder` / slivers for long or infinite lists (never map a huge
  list into a `Column`).
- Give list items stable `Key`s when their order can change.

```dart
// Good: const stops this subtree from rebuilding on parent changes.
const _Header(title: 'Products');

// Bad: rebuilding a giant Column holds every child in memory.
Column(children: products.map(ProductTile.new).toList());
```

Profile with **Flutter DevTools → Performance** and enable the "Rebuild
counts" overlay to find widgets rebuilding more than expected.

---

## 5. Widget & golden testing

```dart
void main() {
  testWidgets('shows product name', (tester) async {
    await tester.pumpWidget(
      const MaterialApp(home: ProductTile(product: Product(name: 'Seeds'))),
    );

    expect(find.text('Seeds'), findsOneWidget);
  });

  testWidgets('golden matches baseline', (tester) async {
    await tester.pumpWidget(
      const MaterialApp(home: ProductTile(product: Product(name: 'Seeds'))),
    );

    await expectLater(
      find.byType(ProductTile),
      matchesGoldenFile('goldens/product_tile.png'),
    );
  });
}
```

Run `flutter test --update-goldens` once to create the baseline, then commit the
PNG so CI can catch visual regressions.

---

## 6. Async & isolates for CPU-bound work

Never block the UI isolate with heavy work (parsing large JSON, image
processing). Offload with `compute`:

```dart
Future<List<Product>> parseProducts(String rawJson) {
  return compute(_decode, rawJson); // runs on a background isolate
}

List<Product> _decode(String rawJson) =>
    (jsonDecode(rawJson) as List)
        .map((e) => Product.fromJson(e as Map<String, dynamic>))
        .toList();
```

---

## 7. Common pitfalls

- **Problem:** `setState` called after `dispose` → `mounted` exception.
  **Solution:** guard with `if (!mounted) return;` after any `await`.
- **Problem:** Rebuilding the whole screen on every keystroke.
  **Solution:** isolate the changing widget or use a `select` on the provider.
- **Problem:** Memory leaks from uncancelled `StreamSubscription` / controllers.
  **Solution:** cancel/dispose in `dispose()`; with Riverpod use `ref.onDispose`.
- **Problem:** Blocking the UI thread with synchronous file/JSON work.
  **Solution:** move it to an isolate via `compute` (section 6).

---

## 8. Pre-ship checklist

- [ ] `flutter analyze` is clean (no warnings)
- [ ] `flutter test` passes, including golden tests
- [ ] Widgets use `const` where possible; long lists use builders/slivers
- [ ] All loading/error/empty states are handled in the UI
- [ ] Controllers, streams, and subscriptions are disposed
- [ ] Tested on a real device for both iOS and Android
- [ ] Accessibility: semantic labels on interactive widgets, adequate contrast
