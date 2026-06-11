# Flutter Reference (Dart)

## Project Structure

```
lib/
├── main.dart                    # Entry point
├── app/
│   ├── app.dart                 # MaterialApp + router setup
│   ├── theme/                   # ThemeData, colors, typography, spacing
│   └── router/                  # go_router config, guards
├── features/
│   └── home/
│       ├── data/
│       │   ├── datasource/      # Remote + local data sources
│       │   ├── dto/             # JSON models (freezed)
│       │   └── repository/      # Repo implementations
│       ├── domain/
│       │   ├── model/           # Domain models (freezed)
│       │   ├── repository/      # Abstract repo interfaces
│       │   └── usecase/         # Use cases
│       └── presentation/
│           ├── bloc/            # Bloc/Cubit + state + event
│           └── screen/          # Widgets + page files
├── core/
│   ├── network/                 # Dio client, interceptors
│   ├── database/                # Drift DB setup
│   ├── widgets/                 # Shared design system widgets
│   └── error/                   # Failure types, error handling
└── injection.dart               # GetIt service locator setup
```

## State Management (BLoC)

```dart
// States
@freezed
class HomeState with _$HomeState {
  const factory HomeState.initial() = _Initial;
  const factory HomeState.loading() = _Loading;
  const factory HomeState.success(List<Item> items) = _Success;
  const factory HomeState.failure(String message) = _Failure;
}

// Events
@freezed
class HomeEvent with _$HomeEvent {
  const factory HomeEvent.loadItems() = _LoadItems;
  const factory HomeEvent.refreshItems() = _RefreshItems;
}

// Bloc
class HomeBloc extends Bloc<HomeEvent, HomeState> {
  final GetItemsUseCase _getItems;

  HomeBloc(this._getItems) : super(const HomeState.initial()) {
    on<_LoadItems>(_onLoad);
  }

  Future<void> _onLoad(_LoadItems event, Emitter<HomeState> emit) async {
    emit(const HomeState.loading());
    final result = await _getItems();
    result.fold(
      (failure) => emit(HomeState.failure(failure.message)),
      (items) => emit(HomeState.success(items)),
    );
  }
}
```

## State Management (Riverpod — alternative)

```dart
@riverpod
class HomeNotifier extends _$HomeNotifier {
  @override
  FutureOr<List<Item>> build() => _load();

  Future<List<Item>> _load() async {
    final repo = ref.read(itemRepositoryProvider);
    return repo.getItems().getOrThrow();
  }

  Future<void> refresh() async {
    state = const AsyncLoading();
    state = await AsyncValue.guard(_load);
  }
}
```

## Screen Widget Pattern

```dart
class HomeScreen extends StatelessWidget {
  const HomeScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return BlocProvider(
      create: (ctx) => sl<HomeBloc>()..add(const HomeEvent.loadItems()),
      child: const _HomeView(),
    );
  }
}

class _HomeView extends StatelessWidget {
  const _HomeView();

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: BlocConsumer<HomeBloc, HomeState>(
        listener: (ctx, state) {
          state.maybeWhen(
            failure: (msg) => ScaffoldMessenger.of(ctx)
                .showSnackBar(SnackBar(content: Text(msg))),
            orElse: () {},
          );
        },
        builder: (ctx, state) => state.when(
          initial: () => const SizedBox(),
          loading: () => const Center(child: CircularProgressIndicator()),
          success: (items) => _ItemList(items: items),
          failure: (msg) => ErrorView(message: msg,
              onRetry: () => ctx.read<HomeBloc>().add(
                const HomeEvent.loadItems())),
        ),
      ),
    );
  }
}
```

## go_router Setup

```dart
final router = GoRouter(
  initialLocation: '/home',
  redirect: (context, state) {
    final isLoggedIn = ref.read(authStateProvider).isLoggedIn;
    if (!isLoggedIn && !state.matchedLocation.startsWith('/auth')) {
      return '/auth/login';
    }
    return null;
  },
  routes: [
    GoRoute(
      path: '/home',
      name: AppRoutes.home,
      builder: (ctx, state) => const HomeScreen(),
      routes: [
        GoRoute(
          path: 'detail/:id',
          builder: (ctx, state) =>
              DetailScreen(id: state.pathParameters['id']!),
        ),
      ],
    ),
  ],
);
```

## Drift Database

```dart
@DriftDatabase(tables: [Items])
class AppDatabase extends _$AppDatabase {
  AppDatabase(QueryExecutor e) : super(e);

  @override
  int get schemaVersion => 1;

  Stream<List<Item>> watchAllItems() =>
      (select(items)..orderBy([(t) => OrderingTerm.desc(t.updatedAt)])).watch();

  Future<void> upsertItems(List<ItemsCompanion> rows) =>
      batch((b) => b.insertAllOnConflictUpdate(items, rows));
}
```

## Key pubspec.yaml Dependencies

```yaml
dependencies:
  flutter_bloc: ^8.1.5
  freezed_annotation: ^2.4.1
  riverpod: ^2.5.1                # alternative to bloc
  flutter_riverpod: ^2.5.1
  go_router: ^14.1.0
  dio: ^5.4.3
  drift: ^2.18.0
  sqflite: ^2.3.3
  get_it: ^7.7.0
  injectable: ^2.4.1
  dartz: ^0.10.1                  # Either/Option for FP error handling
  json_annotation: ^4.9.0

dev_dependencies:
  build_runner: ^2.4.9
  freezed: ^2.5.2
  json_serializable: ^6.8.0
  drift_dev: ^2.18.0
  mocktail: ^1.0.3
  bloc_test: ^9.1.7
```

## Error Handling (Either/Failure pattern)

```dart
abstract class Failure {
  final String message;
  const Failure(this.message);
}

class NetworkFailure extends Failure {
  const NetworkFailure([super.message = 'Network error occurred']);
}

class CacheFailure extends Failure {
  const CacheFailure([super.message = 'Cache error occurred']);
}

// Repository
Future<Either<Failure, List<Item>>> getItems() async {
  try {
    final remote = await _remoteSource.fetchItems();
    await _localSource.saveItems(remote);
    return Right(remote.map(_mapper.toDomain).toList());
  } on DioException catch (e) {
    return Left(NetworkFailure(e.message ?? 'Network error'));
  } on Exception {
    return const Left(CacheFailure());
  }
}
```

## Testing

```dart
void main() {
  group('HomeBloc', () {
    late HomeBloc bloc;
    late MockGetItemsUseCase mockUseCase;

    setUp(() {
      mockUseCase = MockGetItemsUseCase();
      bloc = HomeBloc(mockUseCase);
    });

    tearDown(() => bloc.close());

    blocTest<HomeBloc, HomeState>(
      'emits [loading, success] when loadItems succeeds',
      build: () {
        when(() => mockUseCase()).thenAnswer(
          (_) async => Right([Item(id: '1', title: 'Test')]),
        );
        return bloc;
      },
      act: (b) => b.add(const HomeEvent.loadItems()),
      expect: () => [
        const HomeState.loading(),
        isA<HomeState>().having((s) => s, 'success',
            const HomeState.success([Item(id: '1', title: 'Test')])),
      ],
    );
  });
}
```