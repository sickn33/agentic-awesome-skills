# Native Android — Java Reference

## When to Use Java

Java remains fully supported by Android and Google. Use it when:
- Maintaining or extending an existing Java codebase
- Team is Java-fluent without Kotlin experience
- Integrating Java-only SDKs or legacy modules
- Gradual migration: new Kotlin modules alongside old Java modules

> **Java + Kotlin interop is seamless** — you can have both in the same project. New files can be Kotlin while legacy files stay Java.

---

## Project Structure

```
app/src/main/java/com/example/app/
├── MyApp.java                   # Application class
├── MainActivity.java            # Host activity
├── ui/
│   └── home/
│       ├── HomeActivity.java    # OR Fragment-based
│       ├── HomeFragment.java
│       └── HomeAdapter.java
├── viewmodel/
│   └── HomeViewModel.java
├── repository/
│   └── ItemRepository.java
├── data/
│   ├── remote/
│   │   ├── ApiService.java      # Retrofit interface
│   │   ├── ApiClient.java       # OkHttp + Retrofit setup
│   │   └── dto/ItemDto.java
│   └── local/
│       ├── AppDatabase.java     # Room database
│       ├── ItemDao.java
│       └── entity/ItemEntity.java
├── model/
│   └── Item.java                # Domain model
└── di/                          # Manual DI or Hilt
```

---

## ViewModel (Java + LiveData)

```java
public class HomeViewModel extends ViewModel {

    private final MutableLiveData<UiState<List<Item>>> _uiState =
        new MutableLiveData<>(UiState.loading());

    public LiveData<UiState<List<Item>>> uiState = _uiState;

    private final ItemRepository repository;
    private final ExecutorService executor = Executors.newSingleThreadExecutor();

    // Constructor injection (Hilt or manual)
    public HomeViewModel(ItemRepository repository) {
        this.repository = repository;
        loadItems();
    }

    public void loadItems() {
        _uiState.setValue(UiState.loading());
        executor.execute(() -> {
            try {
                List<Item> items = repository.getItems();
                _uiState.postValue(UiState.success(items));
            } catch (Exception e) {
                _uiState.postValue(UiState.error(e.getMessage()));
            }
        });
    }

    @Override
    protected void onCleared() {
        super.onCleared();
        executor.shutdown();
    }
}
```

---

## UiState Wrapper

```java
public class UiState<T> {
    public enum Status { LOADING, SUCCESS, ERROR }

    public final Status status;
    public final T data;
    public final String errorMessage;

    private UiState(Status status, T data, String errorMessage) {
        this.status = status;
        this.data = data;
        this.errorMessage = errorMessage;
    }

    public static <T> UiState<T> loading() {
        return new UiState<>(Status.LOADING, null, null);
    }

    public static <T> UiState<T> success(T data) {
        return new UiState<>(Status.SUCCESS, data, null);
    }

    public static <T> UiState<T> error(String message) {
        return new UiState<>(Status.ERROR, null, message);
    }

    public boolean isLoading() { return status == Status.LOADING; }
    public boolean isSuccess() { return status == Status.SUCCESS; }
    public boolean isError()   { return status == Status.ERROR; }
}
```

---

## Fragment Observing ViewModel

```java
public class HomeFragment extends Fragment {

    private HomeViewModel viewModel;
    private FragmentHomeBinding binding; // ViewBinding

    @Override
    public View onCreateView(@NonNull LayoutInflater inflater,
                             ViewGroup container, Bundle savedInstanceState) {
        binding = FragmentHomeBinding.inflate(inflater, container, false);
        return binding.getRoot();
    }

    @Override
    public void onViewCreated(@NonNull View view, @Nullable Bundle savedInstanceState) {
        super.onViewCreated(view, savedInstanceState);

        viewModel = new ViewModelProvider(this,
            new HomeViewModelFactory(new ItemRepository(requireContext())))
            .get(HomeViewModel.class);

        viewModel.uiState.observe(getViewLifecycleOwner(), state -> {
            binding.progressBar.setVisibility(state.isLoading() ? View.VISIBLE : View.GONE);
            binding.recyclerView.setVisibility(state.isSuccess() ? View.VISIBLE : View.GONE);
            binding.errorView.setVisibility(state.isError() ? View.VISIBLE : View.GONE);

            if (state.isSuccess()) {
                adapter.submitList(state.data);
            }
            if (state.isError()) {
                binding.errorText.setText(state.errorMessage);
            }
        });

        binding.retryButton.setOnClickListener(v -> viewModel.loadItems());
    }

    @Override
    public void onDestroyView() {
        super.onDestroyView();
        binding = null; // CRITICAL — avoid memory leak
    }
}
```

---

## Room Database (Java)

```java
// Entity
@Entity(tableName = "items")
public class ItemEntity {
    @PrimaryKey
    @NonNull
    public String id;
    public String title;
    public long updatedAt;

    public ItemEntity(@NonNull String id, String title, long updatedAt) {
        this.id = id;
        this.title = title;
        this.updatedAt = updatedAt;
    }
}

// DAO
@Dao
public interface ItemDao {
    @Query("SELECT * FROM items ORDER BY updatedAt DESC")
    LiveData<List<ItemEntity>> observeAll();

    @Query("SELECT * FROM items ORDER BY updatedAt DESC")
    List<ItemEntity> getAll(); // blocking — call off main thread

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    void insertAll(List<ItemEntity> items);

    @Query("DELETE FROM items")
    void deleteAll();
}

// Database
@Database(entities = {ItemEntity.class}, version = 1, exportSchema = true)
public abstract class AppDatabase extends RoomDatabase {
    private static volatile AppDatabase INSTANCE;

    public abstract ItemDao itemDao();

    public static AppDatabase getInstance(Context context) {
        if (INSTANCE == null) {
            synchronized (AppDatabase.class) {
                if (INSTANCE == null) {
                    INSTANCE = Room.databaseBuilder(
                        context.getApplicationContext(),
                        AppDatabase.class,
                        "app_database"
                    ).build();
                }
            }
        }
        return INSTANCE;
    }
}
```

---

## Retrofit API Client (Java)

```java
// Interface
public interface ApiService {
    @GET("items")
    Call<List<ItemDto>> getItems();

    @GET("items/{id}")
    Call<ItemDto> getItemById(@Path("id") String id);

    @POST("items")
    Call<ItemDto> createItem(@Body ItemDto item);
}

// Client setup
public class ApiClient {
    private static final String BASE_URL = BuildConfig.API_BASE_URL;
    private static ApiService INSTANCE;

    public static ApiService getInstance() {
        if (INSTANCE == null) {
            OkHttpClient client = new OkHttpClient.Builder()
                .connectTimeout(10, TimeUnit.SECONDS)
                .readTimeout(10, TimeUnit.SECONDS)
                .addInterceptor(new AuthInterceptor())
                .addInterceptor(new HttpLoggingInterceptor()
                    .setLevel(BuildConfig.DEBUG
                        ? HttpLoggingInterceptor.Level.BODY
                        : HttpLoggingInterceptor.Level.NONE))
                .build();

            Retrofit retrofit = new Retrofit.Builder()
                .baseUrl(BASE_URL)
                .client(client)
                .addConverterFactory(GsonConverterFactory.create())
                .build();

            INSTANCE = retrofit.create(ApiService.class);
        }
        return INSTANCE;
    }
}

// Auth interceptor
public class AuthInterceptor implements Interceptor {
    @NonNull
    @Override
    public Response intercept(@NonNull Chain chain) throws IOException {
        String token = TokenStorage.getInstance().getToken();
        Request request = chain.request().newBuilder()
            .addHeader("Authorization", "Bearer " + token)
            .build();
        return chain.proceed(request);
    }
}
```

---

## Repository (Java)

```java
public class ItemRepository {
    private final ItemDao itemDao;
    private final ApiService apiService;
    private final ExecutorService executor = Executors.newSingleThreadExecutor();

    public ItemRepository(Context context) {
        AppDatabase db = AppDatabase.getInstance(context);
        this.itemDao = db.itemDao();
        this.apiService = ApiClient.getInstance();
    }

    // Synchronous fetch for ViewModel executor
    public List<Item> getItems() throws Exception {
        Response<List<ItemDto>> response = apiService.getItems().execute();
        if (response.isSuccessful() && response.body() != null) {
            return response.body().stream()
                .map(ItemMapper::toDomain)
                .collect(Collectors.toList());
        } else {
            throw new IOException("HTTP " + response.code());
        }
    }

    // Observe cached data (returns LiveData — auto updates UI)
    public LiveData<List<Item>> observeItems() {
        return Transformations.map(itemDao.observeAll(), entities ->
            entities.stream().map(ItemMapper::toDomain).collect(Collectors.toList())
        );
    }

    // Refresh from network (call from background thread or executor)
    public void refreshItems(Callback<Void> callback) {
        executor.execute(() -> {
            try {
                Response<List<ItemDto>> response = apiService.getItems().execute();
                if (response.isSuccessful() && response.body() != null) {
                    List<ItemEntity> entities = response.body().stream()
                        .map(ItemMapper::toEntity)
                        .collect(Collectors.toList());
                    itemDao.deleteAll();
                    itemDao.insertAll(entities);
                    callback.onSuccess(null);
                } else {
                    callback.onError(new IOException("HTTP " + response.code()));
                }
            } catch (IOException e) {
                callback.onError(e);
            }
        });
    }

    public interface Callback<T> {
        void onSuccess(T result);
        void onError(Exception e);
    }
}
```

---

## RecyclerView Adapter (Java)

```java
public class ItemAdapter extends ListAdapter<Item, ItemAdapter.ItemViewHolder> {

    private final OnItemClickListener listener;

    public interface OnItemClickListener {
        void onItemClick(Item item);
    }

    public ItemAdapter(OnItemClickListener listener) {
        super(new DiffUtil.ItemCallback<Item>() {
            @Override
            public boolean areItemsTheSame(@NonNull Item a, @NonNull Item b) {
                return a.getId().equals(b.getId());
            }

            @Override
            public boolean areContentsTheSame(@NonNull Item a, @NonNull Item b) {
                return a.equals(b);
            }
        });
        this.listener = listener;
    }

    @NonNull
    @Override
    public ItemViewHolder onCreateViewHolder(@NonNull ViewGroup parent, int viewType) {
        ItemRowBinding binding = ItemRowBinding.inflate(
            LayoutInflater.from(parent.getContext()), parent, false);
        return new ItemViewHolder(binding);
    }

    @Override
    public void onBindViewHolder(@NonNull ItemViewHolder holder, int position) {
        holder.bind(getItem(position), listener);
    }

    static class ItemViewHolder extends RecyclerView.ViewHolder {
        private final ItemRowBinding binding;

        ItemViewHolder(ItemRowBinding binding) {
            super(binding.getRoot());
            this.binding = binding;
        }

        void bind(Item item, OnItemClickListener listener) {
            binding.titleText.setText(item.getTitle());
            binding.getRoot().setOnClickListener(v -> listener.onItemClick(item));
        }
    }
}
```

---

## XML Layout Best Practices (Java projects)

```xml
<!-- Use ConstraintLayout — flat hierarchy = better performance -->
<androidx.constraintlayout.widget.ConstraintLayout
    android:layout_width="match_parent"
    android:layout_height="match_parent">

    <!-- Always use ?attr/ tokens from MaterialTheme, never hardcoded colors -->
    <TextView
        android:id="@+id/titleText"
        android:textColor="?attr/colorOnSurface"
        android:textAppearance="?attr/textAppearanceTitleMedium"
        android:layout_width="0dp"
        android:layout_height="wrap_content"
        app:layout_constraintStart_toStartOf="parent"
        app:layout_constraintEnd_toEndOf="parent"
        app:layout_constraintTop_toTopOf="parent" />

</androidx.constraintlayout.widget.ConstraintLayout>
```

- Always use **ViewBinding** (not `findViewById`, not DataBinding for simple cases)
- Enable in `build.gradle.kts`: `viewBinding { enable = true }`
- Null `binding` in `onDestroyView()` to prevent Fragment memory leaks

---

## Error Handling (Java)

```java
// Checked exceptions: always handle explicitly
public Result<List<Item>> getItemsSafe() {
    try {
        Response<List<ItemDto>> response = apiService.getItems().execute();
        if (!response.isSuccessful()) {
            return Result.failure(new HttpException(response));
        }
        List<Item> items = Objects.requireNonNull(response.body())
            .stream().map(ItemMapper::toDomain).collect(Collectors.toList());
        return Result.success(items);
    } catch (IOException e) {
        return Result.failure(new NetworkException("Network error", e));
    } catch (NullPointerException e) {
        return Result.failure(new ParseException("Empty response body", e));
    }
}

// Custom exception hierarchy
public class AppException extends Exception {
    public AppException(String message) { super(message); }
    public AppException(String message, Throwable cause) { super(message, cause); }
}
public class NetworkException extends AppException { ... }
public class ParseException extends AppException { ... }
public class AuthException extends AppException { ... }
```

---

## Hilt DI (Java)

```java
// Application
@HiltAndroidApp
public class MyApp extends Application {}

// Activity / Fragment — annotate for injection
@AndroidEntryPoint
public class HomeFragment extends Fragment {
    @Inject
    ItemRepository repository; // injected by Hilt
}

// ViewModel
@HiltViewModel
public class HomeViewModel extends ViewModel {
    private final ItemRepository repository;

    @Inject
    public HomeViewModel(ItemRepository repository) {
        this.repository = repository;
    }
}

// Module
@Module
@InstallIn(SingletonComponent.class)
public class DatabaseModule {
    @Provides
    @Singleton
    public AppDatabase provideDatabase(@ApplicationContext Context context) {
        return AppDatabase.getInstance(context);
    }

    @Provides
    public ItemDao provideItemDao(AppDatabase db) {
        return db.itemDao();
    }
}
```

---

## Unit Testing (Java)

```java
@ExtendWith(MockitoExtension.class)
class HomeViewModelTest {

    @Mock
    ItemRepository mockRepository;

    HomeViewModel viewModel;

    @BeforeEach
    void setup() {
        viewModel = new HomeViewModel(mockRepository);
    }

    @Test
    void loadItems_success_emitsSuccessState() throws Exception {
        List<Item> items = Arrays.asList(new Item("1", "Test"));
        when(mockRepository.getItems()).thenReturn(items);

        viewModel.loadItems();

        // Wait for executor — use CountDownLatch or InstantExecutorRule
        UiState<List<Item>> state = viewModel.uiState.getValue();
        assertNotNull(state);
        assertTrue(state.isSuccess());
        assertEquals(items, state.data);
    }

    @Test
    void loadItems_failure_emitsErrorState() throws Exception {
        when(mockRepository.getItems()).thenThrow(new IOException("Network error"));

        viewModel.loadItems();

        UiState<List<Item>> state = viewModel.uiState.getValue();
        assertNotNull(state);
        assertTrue(state.isError());
    }
}
```

---

## Java → Kotlin Migration Path

When migrating a Java project to Kotlin incrementally:

1. **New files in Kotlin** — Java and Kotlin coexist seamlessly
2. **Convert utilities first** — `@JvmStatic`, `@JvmField` for interop
3. **Convert data models** — Java POJOs → Kotlin `data class`
4. **Convert DAOs and Repositories** — add `suspend` + `Flow`
5. **Convert ViewModels last** — swap `LiveData` + `MutableLiveData` for `StateFlow`
6. **Convert Activities/Fragments** — migrate to Compose screen by screen
7. Annotate Kotlin with `@JvmOverloads`, `@JvmName` where Java callers exist

```kotlin
// Kotlin data class replacing a Java POJO
data class Item(
    val id: String,
    val title: String,
    val updatedAt: Long = System.currentTimeMillis()
)

// Kotlin extension to consume Java LiveData from Kotlin cleanly
fun <T> LiveData<T>.observeNonNull(owner: LifecycleOwner, observer: (T) -> Unit) {
    observe(owner) { it?.let(observer) }
}
```