# Native Android Reference (Kotlin + Jetpack Compose)

## Project Structure

```
app/
├── src/
│   ├── main/
│   │   ├── AndroidManifest.xml
│   │   ├── java/com.example.app/
│   │   │   ├── MyApp.kt                     # Application class, Hilt entry point
│   │   │   ├── MainActivity.kt              # Single activity, NavHost host
│   │   │   ├── ui/
│   │   │   │   ├── theme/                   # MaterialTheme, Color, Type, Shape
│   │   │   │   ├── components/              # Shared design system composables
│   │   │   │   └── feature/
│   │   │   │       ├── home/
│   │   │   │       │   ├── HomeScreen.kt
│   │   │   │       │   ├── HomeViewModel.kt
│   │   │   │       │   └── HomeUiState.kt
│   │   │   ├── domain/
│   │   │   │   ├── model/                   # Domain models (pure Kotlin, no Android deps)
│   │   │   │   ├── repository/              # Interfaces only
│   │   │   │   └── usecase/                 # One class per use case
│   │   │   ├── data/
│   │   │   │   ├── remote/                  # Retrofit services, DTOs, mappers
│   │   │   │   ├── local/                   # Room DB, DAOs, entities
│   │   │   │   └── repository/              # Repository implementations
│   │   │   └── di/                          # Hilt modules
│   └── test/                                # Unit tests
│   └── androidTest/                         # Instrumented tests
├── build.gradle.kts
└── proguard-rules.pro
```

## ViewModel Pattern

```kotlin
// UiState — sealed class for exhaustive when()
sealed class HomeUiState {
    object Loading : HomeUiState()
    data class Success(val items: List<Item>) : HomeUiState()
    data class Error(val message: String) : HomeUiState()
}

// UiEvent — one-shot events (navigation, snackbars)
sealed class HomeUiEvent {
    data class NavigateTo(val route: String) : HomeUiEvent()
    data class ShowSnackbar(val message: String) : HomeUiEvent()
}

@HiltViewModel
class HomeViewModel @Inject constructor(
    private val getItemsUseCase: GetItemsUseCase
) : ViewModel() {

    private val _uiState = MutableStateFlow<HomeUiState>(HomeUiState.Loading)
    val uiState: StateFlow<HomeUiState> = _uiState.asStateFlow()

    private val _uiEvent = Channel<HomeUiEvent>()
    val uiEvent = _uiEvent.receiveAsFlow()

    init { loadItems() }

    fun loadItems() {
        viewModelScope.launch {
            _uiState.value = HomeUiState.Loading
            getItemsUseCase()
                .onSuccess { _uiState.value = HomeUiState.Success(it) }
                .onFailure { _uiState.value = HomeUiState.Error(it.message ?: "Unknown error") }
        }
    }
}
```

## Repository Pattern

```kotlin
// Interface in domain layer
interface ItemRepository {
    fun observeItems(): Flow<List<Item>>
    suspend fun refreshItems(): Result<Unit>
    suspend fun getItemById(id: String): Result<Item>
}

// Implementation in data layer
class ItemRepositoryImpl @Inject constructor(
    private val remoteSource: ItemRemoteDataSource,
    private val localSource: ItemLocalDataSource,
    private val mapper: ItemMapper
) : ItemRepository {

    override fun observeItems(): Flow<List<Item>> =
        localSource.observeAll().map { mapper.toDomain(it) }

    override suspend fun refreshItems(): Result<Unit> = runCatching {
        val dto = remoteSource.fetchItems()
        localSource.insertAll(mapper.toEntity(dto))
    }

    override suspend fun getItemById(id: String): Result<Item> = runCatching {
        // Example implementation fetching from local cache
        val entity = localSource.getById(id) ?: throw Exception("Item not found")
        mapper.toDomain(entity)
    }
}
```

## Compose Screen

```kotlin
@Composable
fun HomeScreen(
    viewModel: HomeViewModel = hiltViewModel(),
    onNavigate: (String) -> Unit
) {
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()
    val snackbarHostState = remember { SnackbarHostState() }

    // One-shot event handling
    LaunchedEffect(Unit) {
        viewModel.uiEvent.collect { event ->
            when (event) {
                is HomeUiEvent.NavigateTo -> onNavigate(event.route)
                is HomeUiEvent.ShowSnackbar -> snackbarHostState.showSnackbar(event.message)
            }
        }
    }

    Scaffold(snackbarHost = { SnackbarHost(snackbarHostState) }) { padding ->
        when (val state = uiState) {
            is HomeUiState.Loading -> LoadingContent()
            is HomeUiState.Success -> HomeContent(state.items, Modifier.padding(padding))
            is HomeUiState.Error -> ErrorContent(state.message, onRetry = viewModel::loadItems)
        }
    }
}
```

## Room Database

```kotlin
@Entity(tableName = "items")
data class ItemEntity(
    @PrimaryKey val id: String,
    val title: String,
    val updatedAt: Long = System.currentTimeMillis()
)

@Dao
interface ItemDao {
    @Query("SELECT * FROM items ORDER BY updatedAt DESC")
    fun observeAll(): Flow<List<ItemEntity>>

    @Upsert
    suspend fun upsertAll(items: List<ItemEntity>)

    @Query("DELETE FROM items")
    suspend fun deleteAll()
}

@Database(entities = [ItemEntity::class], version = 1, exportSchema = true)
abstract class AppDatabase : RoomDatabase() {
    abstract fun itemDao(): ItemDao
}
```

## Hilt DI Setup

```kotlin
@Module
@InstallIn(SingletonComponent::class)
object NetworkModule {
    @Provides @Singleton
    fun provideRetrofit(): Retrofit = Retrofit.Builder()
        .baseUrl(BuildConfig.API_BASE_URL)
        .addConverterFactory(GsonConverterFactory.create())
        .client(buildOkHttpClient())
        .build()
}

@Module
@InstallIn(SingletonComponent::class)
abstract class RepositoryModule {
    @Binds @Singleton
    abstract fun bindItemRepository(impl: ItemRepositoryImpl): ItemRepository
}
```

## Key Dependencies (libs.versions.toml)

```toml
[versions]
kotlin = "2.0.0"
compose-bom = "2024.06.00"
hilt = "2.51"
room = "2.6.1"
retrofit = "2.11.0"
coroutines = "1.8.1"
lifecycle = "2.8.2"

[libraries]
compose-bom = { group = "androidx.compose", name = "compose-bom", version.ref = "compose-bom" }
compose-ui = { group = "androidx.compose.ui", name = "ui" }
compose-material3 = { group = "androidx.compose.material3", name = "material3" }
hilt-android = { group = "com.google.dagger", name = "hilt-android", version.ref = "hilt" }
hilt-compiler = { group = "com.google.dagger", name = "hilt-android-compiler", version.ref = "hilt" }
room-runtime = { group = "androidx.room", name = "room-runtime", version.ref = "room" }
room-ktx = { group = "androidx.room", name = "room-ktx", version.ref = "room" }
room-compiler = { group = "androidx.room", name = "room-compiler", version.ref = "room" }
retrofit = { group = "com.squareup.retrofit2", name = "retrofit", version.ref = "retrofit" }
```

## Testing Setup

```kotlin
// ViewModel unit test
@OptIn(ExperimentalCoroutinesApi::class)
class HomeViewModelTest {
    @get:Rule val mainDispatcherRule = MainDispatcherRule()

    private val getItemsUseCase = mockk<GetItemsUseCase>()
    private lateinit var viewModel: HomeViewModel

    @BeforeEach
    fun setup() { viewModel = HomeViewModel(getItemsUseCase) }

    @Test
    fun `loadItems emits Success when use case succeeds`() = runTest {
        val items = listOf(Item("1", "Test"))
        coEvery { getItemsUseCase() } returns Result.success(items)

        viewModel.uiState.test {
            skipItems(1) // Loading
            assertThat(awaitItem()).isEqualTo(HomeUiState.Success(items))
        }
    }
}
```