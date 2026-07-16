# React Native Reference (TypeScript)

## Project Structure

```
src/
├── app/
│   ├── App.tsx                  # Root component, providers
│   ├── navigation/              # React Navigation stacks + types
│   └── store/                   # RTK store setup
├── features/
│   └── home/
│       ├── api/                 # RTK Query endpoints
│       ├── components/          # Screen-specific components
│       ├── hooks/               # Feature-level custom hooks
│       ├── screens/             # Screen components
│       ├── store/               # Zustand slice or RTK slice
│       └── types.ts             # Feature types
├── shared/
│   ├── components/              # Design system components
│   ├── hooks/                   # Shared hooks
│   ├── theme/                   # Colors, typography, spacing constants
│   └── utils/                   # Utilities
└── services/
    ├── api/                     # Axios/fetch client + interceptors
    └── storage/                 # MMKV wrapper
```

## Navigation Setup (React Navigation v7)

```typescript
export type RootStackParamList = {
  Auth: undefined;
  Home: undefined;
  Detail: { id: string };
  Settings: undefined;
};

export type RootStackScreenProps<T extends keyof RootStackParamList> =
  NativeStackScreenProps<RootStackParamList, T>;

const Stack = createNativeStackNavigator<RootStackParamList>();

export const RootNavigator = () => {
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn);

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {isLoggedIn ? (
        <>
          <Stack.Screen name="Home" component={HomeScreen} />
          <Stack.Screen name="Detail" component={DetailScreen} />
        </>
      ) : (
        <Stack.Screen name="Auth" component={AuthScreen} />
      )}
    </Stack.Navigator>
  );
};
```

## State Management (Zustand + React Query)

```typescript
// Client state — Zustand
// Do not persist bearer or refresh tokens in AsyncStorage/plain MMKV.
// Store secrets with a platform-backed module such as react-native-keychain
// or expo-secure-store, and persist only non-sensitive UI state here.
interface AuthState {
  isLoggedIn: boolean;
  setLoggedIn: (value: boolean) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      isLoggedIn: false,
      setLoggedIn: (value) => set({ isLoggedIn: value }),
      logout: () => set({ isLoggedIn: false }),
    }),
    { name: 'auth-ui-storage', storage: createJSONStorage(() => mmkvStorage) }
  )
);

// Keep tokens outside persisted app state.
const getSecureToken = () => Keychain.getGenericPassword().then((r) => (r ? r.password : null));
const saveSecureToken = (token: string) => Keychain.setGenericPassword('auth', token);
const clearSecureToken = () => Keychain.resetGenericPassword();

// Server state — React Query
export const useItems = () =>
  useQuery({
    queryKey: ['items'],
    queryFn: itemsApi.getAll,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

export const useRefreshItems = () =>
  useMutation({
    mutationFn: itemsApi.refresh,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['items'] }),
  });
```

## Screen Pattern

```typescript
type HomeScreenProps = RootStackScreenProps<'Home'>;

export const HomeScreen: FC<HomeScreenProps> = ({ navigation }) => {
  const { data: items, isLoading, isError, refetch } = useItems();

  if (isLoading) return <LoadingView />;
  if (isError) return <ErrorView onRetry={refetch} />;

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <ItemCard
            item={item}
            onPress={() => navigation.navigate('Detail', { id: item.id })}
          />
        )}
        ListEmptyComponent={<EmptyView />}
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={refetch} />
        }
      />
    </SafeAreaView>
  );
};
```

## API Client (Axios with interceptors)

```typescript
const apiClient = axios.create({
  baseURL: Config.API_BASE_URL,
  timeout: 10_000,
  headers: { 'Content-Type': 'application/json' },
});

// Auth token injection
apiClient.interceptors.request.use(async (config) => {
  const token = await getSecureToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Token refresh on 401
apiClient.interceptors.response.use(
  (res) => res,
  async (error: AxiosError) => {
    if (error.response?.status === 401) {
      const newToken = await refreshToken();
      if (newToken) {
        await saveSecureToken(newToken);
        useAuthStore.getState().setLoggedIn(true);
        return apiClient(error.config!);
      }
      await clearSecureToken();
      useAuthStore.getState().logout();
    }
    return Promise.reject(error);
  }
);
```

## API Response Validation (Zod)

```typescript
const ItemSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string().optional(),
  createdAt: z.string().datetime(),
});

const ItemsResponseSchema = z.array(ItemSchema);
type Item = z.infer<typeof ItemSchema>;

const getItems = async (): Promise<Item[]> => {
  const { data } = await apiClient.get('/items');
  return ItemsResponseSchema.parse(data); // throws ZodError on invalid shape
};
```

## Key Dependencies

```json
{
  "dependencies": {
    "react-native": "0.74.x",
    "@react-navigation/native": "^7.0.0",
    "@react-navigation/native-stack": "^7.0.0",
    "@tanstack/react-query": "^5.45.0",
    "zustand": "^4.5.4",
    "axios": "^1.7.2",
    "zod": "^3.23.8",
    "react-native-keychain": "^8.2.0",
    "react-native-mmkv": "^2.12.2",
    "react-native-safe-area-context": "^4.10.1",
    "react-native-screens": "^3.32.0"
  },
  "devDependencies": {
    "typescript": "^5.4.5",
    "@testing-library/react-native": "^12.5.1",
    "msw": "^2.3.1",
    "jest": "^29.7.0"
  }
}
```

## New Architecture (Bridgeless) Notes
- Enable New Architecture in `android/gradle.properties`: `newArchEnabled=true`
- Use TurboModules for native modules; avoid legacy NativeModules API
- Use Fabric for custom native views
- Test with Hermes JS engine always enabled

## Performance Tips
- Use `useCallback` + `memo` on `renderItem` / list item components
- `FlatList` `windowSize`, `initialNumToRender`, `maxToRenderPerBatch` tuned
- Avoid anonymous inline functions in JSX
- `InteractionManager.runAfterInteractions` for heavy post-navigation work
- `react-native-reanimated` for 60fps animations (runs on UI thread)

## Testing

```typescript
describe('HomeScreen', () => {
  it('shows items when query succeeds', async () => {
    server.use(
      http.get(`${API_URL}/items`, () =>
        HttpResponse.json([{ id: '1', title: 'Test Item' }])
      )
    );

    const { getByText } = render(
      <QueryClientProvider client={testQueryClient}>
        <HomeScreen navigation={mockNavigation} route={mockRoute} />
      </QueryClientProvider>
    );

    expect(await findByText('Test Item')).toBeTruthy();
  });
});
```
