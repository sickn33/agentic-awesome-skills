# Kotlin Multiplatform (KMM) Reference

## Project Structure

```
project/
├── shared/                          # Shared KMM module
│   ├── src/
│   │   ├── commonMain/kotlin/       # Business logic, domain, data
│   │   │   ├── domain/
│   │   │   │   ├── model/
│   │   │   │   ├── repository/      # Interfaces
│   │   │   │   └── usecase/
│   │   │   ├── data/
│   │   │   │   ├── remote/          # Ktor client + DTOs
│   │   │   │   ├── local/           # SQLDelight DAOs
│   │   │   │   └── repository/      # Implementations
│   │   │   └── di/                  # Koin modules
│   │   ├── androidMain/kotlin/      # Android-specific actual implementations
│   │   └── iosMain/kotlin/          # iOS-specific actual (if needed)
│   └── build.gradle.kts
├── androidApp/                      # Android app module
│   ├── src/main/java/
│   │   ├── ui/                      # Jetpack Compose screens
│   │   ├── presentation/            # Android ViewModels
│   │   └── di/                      # Android-specific DI
│   └── build.gradle.kts
└── build.gradle.kts
```

## Shared Module: Ktor HTTP Client

```kotlin
// commonMain
expect fun httpClient(config: HttpClientConfig<*>.() -> Unit): HttpClient

// androidMain
actual fun httpClient(config: HttpClientConfig<*>.() -> Unit): HttpClient =
    HttpClient(OkHttp) {
        config(this)
        engine { addInterceptor(/* logging, auth */) }
    }

// Shared usage
val client = httpClient {
    install(ContentNegotiation) { json() }
    install(HttpTimeout) { requestTimeoutMillis = 10_000 }
    defaultRequest {
        url(BuildKonfig.BASE_URL)
        header(HttpHeaders.ContentType, ContentType.Application.Json)
    }
}
```

## SQLDelight Setup

```sql
-- ItemEntity.sq
CREATE TABLE ItemEntity (
    id TEXT NOT NULL PRIMARY KEY,
    title TEXT NOT NULL,
    updatedAt INTEGER NOT NULL DEFAULT 0
);

selectAll:
SELECT * FROM ItemEntity ORDER BY updatedAt DESC;

upsertItem:
INSERT OR REPLACE INTO ItemEntity (id, title, updatedAt)
VALUES (?, ?, ?);
```

```kotlin
// commonMain — Database driver expect/actual
expect class DatabaseDriverFactory {
    fun createDriver(): SqlDriver
}

// androidMain
actual class DatabaseDriverFactory(private val context: Context) {
    actual fun createDriver(): SqlDriver =
        AndroidSqliteDriver(AppDatabase.Schema, context, "app.db")
}
```

## Shared Repository

```kotlin
// commonMain
class ItemRepositoryImpl(
    private val remoteSource: ItemRemoteDataSource,
    private val localSource: ItemLocalDataSource,
) : ItemRepository {

    override fun observeItems(): Flow<List<Item>> =
        localSource.observeAll().map { entities ->
            entities.map { it.toDomain() }
        }

    override suspend fun refreshItems(): Result<Unit> = runCatching {
        val items = remoteSource.fetchItems()
        localSource.upsertAll(items.map { it.toEntity() })
    }
}
```

## Android ViewModel consuming shared Flow

```kotlin
@HiltViewModel
class HomeViewModel @Inject constructor(
    private val observeItems: ObserveItemsUseCase,    // from shared module
    private val refreshItems: RefreshItemsUseCase     // from shared module
) : ViewModel() {

    val uiState = observeItems()
        .map { HomeUiState.Success(it) as HomeUiState }
        .stateIn(
            scope = viewModelScope,
            started = SharingStarted.WhileSubscribed(5_000),
            initialValue = HomeUiState.Loading
        )
}
```

## Koin DI (Shared + Android)

```kotlin
// commonMain — shared Koin modules
val sharedModule = module {
    single { DatabaseDriverFactory(get()) }
    single { AppDatabase(get<DatabaseDriverFactory>().createDriver()) }
    single<ItemRepository> { ItemRepositoryImpl(get(), get()) }
    factory { ObserveItemsUseCase(get()) }
    factory { RefreshItemsUseCase(get()) }
}

// androidApp — Android-specific module
val androidModule = module {
    single<Context> { androidApplication() }
    viewModel { HomeViewModel(get(), get()) }
}

// Application class
class MyApp : Application() {
    override fun onCreate() {
        super.onCreate()
        startKoin {
            androidContext(this@MyApp)
            modules(sharedModule, androidModule)
        }
    }
}
```

## Key Gradle Dependencies (shared/build.gradle.kts)

```kotlin
kotlin {
    androidTarget()
    // Add other targets as needed (jvm, iosArm64, etc.)

    sourceSets {
        commonMain.dependencies {
            implementation(libs.ktor.client.core)
            implementation(libs.ktor.client.content.negotiation)
            implementation(libs.ktor.serialization.kotlinx.json)
            implementation(libs.sqldelight.runtime)
            implementation(libs.koin.core)
            implementation(libs.kotlinx.coroutines.core)
            implementation(libs.kotlinx.serialization.json)
        }
        androidMain.dependencies {
            implementation(libs.ktor.client.okhttp)
            implementation(libs.sqldelight.android.driver)
            implementation(libs.koin.android)
        }
    }
}
```

## Compose Multiplatform (for shared UI)

Use when you want to share UI across Android + Desktop + Web:

```kotlin
// commonMain — shared composable
@Composable
fun HomeScreenContent(
    state: HomeUiState,
    onRetry: () -> Unit
) {
    when (state) {
        is HomeUiState.Loading -> CircularProgressIndicator()
        is HomeUiState.Success -> ItemList(state.items)
        is HomeUiState.Error -> ErrorView(state.message, onRetry)
    }
}

// androidApp — wraps with Android ViewModel
@Composable
fun HomeScreen(viewModel: HomeViewModel = koinViewModel()) {
    val state by viewModel.uiState.collectAsStateWithLifecycle()
    HomeScreenContent(state, onRetry = viewModel::refresh)
}
```