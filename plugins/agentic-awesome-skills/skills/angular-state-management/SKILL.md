---
name: angular-state-management
description: "Master modern Angular state management with Signals, NgRx, and RxJS. Use when setting up global state, managing component stores, choosing between state solutions, or migrating from legacy patterns."
risk: safe
source: self
date_added: "2026-02-27"
---

# Angular State Management

Comprehensive guide to modern Angular state management patterns, from Signal-based local state to global stores and server state synchronization.

## When to Use This Skill

- Setting up global state management in Angular
- Choosing between Signals, NgRx, or Akita
- Managing component-level stores
- Implementing optimistic updates
- Debugging state-related issues
- Migrating from legacy state patterns

## Do Not Use This Skill When

- The task is unrelated to Angular state management
- You need React state management → use `react-state-management`

---

## Core Concepts

### State Categories

| Type             | Description                  | Solutions             |
| ---------------- | ---------------------------- | --------------------- |
| **Local State**  | Component-specific, UI state | Signals, `signal()`   |
| **Shared State** | Between related components   | Signal services       |
| **Global State** | App-wide, complex            | NgRx, Akita, Elf      |
| **Server State** | Remote data, caching         | NgRx Query, RxAngular |
| **URL State**    | Route parameters             | ActivatedRoute        |
| **Form State**   | Input values, validation     | Reactive Forms        |

### Selection Criteria

```
Small app, simple state → Signal Services
Medium app, moderate state → Component Stores
Large app, complex state → NgRx Store
Heavy server interaction → NgRx Query + Signal Services
Real-time updates → RxAngular + Signals
```

---

## Quick Start: Signal-Based State

### Pattern 1: Simple Signal Service

```typescript
// services/counter.service.ts
import { Injectable, signal, computed } from "@angular/core";

@Injectable({ providedIn: "root" })
export class CounterService {
  // Private writable signals
  private _count = signal(0);

  // Public read-only
  readonly count = this._count.asReadonly();
  readonly doubled = computed(() => this._count() * 2);
  readonly isPositive = computed(() => this._count() > 0);

  increment() {
    this._count.update((v) => v + 1);
  }

  decrement() {
    this._count.update((v) => v - 1);
  }

  reset() {
    this._count.set(0);
  }
}

// Usage in component
@Component({
  template: `
    <p>Count: {{ counter.count() }}</p>
    <p>Doubled: {{ counter.doubled() }}</p>
    <button (click)="counter.increment()">+</button>
  `,
})
export class CounterComponent {
  counter = inject(CounterService);
}
```

### Pattern 2: Feature Signal Store

```typescript
// stores/user.store.ts
import { Injectable, signal, computed, inject } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { toSignal } from "@angular/core/rxjs-interop";

interface User {
  id: string;
  name: string;
  email: string;
}

interface UserState {
  user: User | null;
  loading: boolean;
  error: string | null;
}

@Injectable({ providedIn: "root" })
export class UserStore {
  private http = inject(HttpClient);

  // State signals
  private _user = signal<User | null>(null);
  private _loading = signal(false);
  private _error = signal<string | null>(null);

  // Selectors (read-only computed)
  readonly user = computed(() => this._user());
  readonly loading = computed(() => this._loading());
  readonly error = computed(() => this._error());
  readonly isAuthenticated = computed(() => this._user() !== null);
  readonly displayName = computed(() => this._user()?.name ?? "Guest");

  // Actions
  async loadUser(id: string) {
    this._loading.set(true);
    this._error.set(null);

    try {
      const user = await fetch(`/api/users/${id}`).then((r) => r.json());
      this._user.set(user);
    } catch (e) {
      this._error.set("Failed to load user");
    } finally {
      this._loading.set(false);
    }
  }

  updateUser(updates: Partial<User>) {
    this._user.update((user) => (user ? { ...user, ...updates } : null));
  }

  logout() {
    this._user.set(null);
    this._error.set(null);
  }
}
```

### Pattern 3: SignalStore (NgRx Signals)

```typescript
// stores/products.store.ts
import {
  signalStore,
  withState,
  withMethods,
  withComputed,
  patchState,
} from "@ngrx/signals";
import { inject } from "@angular/core";
import { ProductService } from "./product.service";

interface ProductState {
  products: Product[];
  loading: boolean;
  filter: string;
}

const initialState: ProductState = {
  products: [],
  loading: false,
  filter: "",
};

export const ProductStore = signalStore(
  { providedIn: "root" },

  withState(initialState),

  withComputed((store) => ({
    filteredProducts: computed(() => {
      const filter = store.filter().toLowerCase();
      return store
        .products()
        .filter((p) => p.name.toLowerCase().includes(filter));
    }),
    totalCount: computed(() => store.products().length),
  })),

  withMethods((store, productService = inject(ProductService)) => ({
    async loadProducts() {
      patchState(store, { loading: true });

      try {
        const products = await productService.getAll();
        patchState(store, { products, loading: false });
      } catch {
        patchState(store, { loading: false });
      }
    },

    setFilter(filter: string) {
      patchState(store, { filter });
    },

    addProduct(product: Product) {
      patchState(store, ({ products }) => ({
        products: [...products, product],
      }));
    },
  })),
);

// Usage
@Component({
  template: `
    <input (input)="store.setFilter($event.target.value)" />
    @if (store.loading()) {
      <app-spinner />
    } @else {
      @for (product of store.filteredProducts(); track product.id) {
        <app-product-card [product]="product" />
      }
    }
  `,
})
export class ProductListComponent {
  store = inject(ProductStore);

  ngOnInit() {
    this.store.loadProducts();
  }
}
```

---

## NgRx Store (Global State)

### Setup

```typescript
// store/app.state.ts
import { ActionReducerMap } from "@ngrx/store";

export interface AppState {
  user: UserState;
  cart: CartState;
}

export const reducers: ActionReducerMap<AppState> = {
  user: userReducer,
  cart: cartReducer,
};

// main.ts
bootstrapApplication(AppComponent, {
  providers: [
    provideStore(reducers),
    provideEffects([UserEffects, CartEffects]),
    provideStoreDevtools({ maxAge: 25 }),
  ],
});
```

### Feature Slice Pattern

```typescript
// store/user/user.actions.ts
import { createActionGroup, props, emptyProps } from "@ngrx/store";

export const UserActions = createActionGroup({
  source: "User",
  events: {
    "Load User": props<{ userId: string }>(),
    "Load User Success": props<{ user: User }>(),
    "Load User Failure": props<{ error: string }>(),
    "Update User": props<{ updates: Partial<User> }>(),
    Logout: emptyProps(),
  },
});
```

```typescript
// store/user/user.reducer.ts
import { createReducer, on } from "@ngrx/store";
import { UserActions } from "./user.actions";

export interface UserState {
  user: User | null;
  loading: boolean;
  error: string | null;
}

const initialState: UserState = {
  user: null,
  loading: false,
  error: null,
};

export const userReducer = createReducer(
  initialState,

  on(UserActions.loadUser, (state) => ({
    ...state,
    loading: true,
    error: null,
  })),

  on(UserActions.loadUserSuccess, (state, { user }) => ({
    ...state,
    user,
    loading: false,
  })),

  on(UserActions.loadUserFailure, (state, { error }) => ({
    ...state,
    loading: false,
    error,
  })),

  on(UserActions.logout, () => initialState),
);
```

```typescript
// store/user/user.selectors.ts
import { createFeatureSelector, createSelector } from "@ngrx/store";
import { UserState } from "./user.reducer";

export const selectUserState = createFeatureSelector<UserState>("user");

export const selectUser = createSelector(
  selectUserState,
  (state) => state.user,
);

export const selectUserLoading = createSelector(
  selectUserState,
  (state) => state.loading,
);

export const selectIsAuthenticated = createSelector(
  selectUser,
  (user) => user !== null,
);
```

```typescript
// store/user/user.effects.ts
import { Injectable, inject } from "@angular/core";
import { Actions, createEffect, ofType } from "@ngrx/effects";
import { switchMap, map, catchError, of } from "rxjs";

@Injectable()
export class UserEffects {
  private actions$ = inject(Actions);
  private userService = inject(UserService);

  loadUser$ = createEffect(() =>
    this.actions$.pipe(
      ofType(UserActions.loadUser),
      switchMap(({ userId }) =>
        this.userService.getUser(userId).pipe(
          map((user) => UserActions.loadUserSuccess({ user })),
          catchError((error) =>
            of(UserActions.loadUserFailure({ error: error.message })),
          ),
        ),
      ),
    ),
  );
}
```

### Component Usage

```typescript
@Component({
  template: `
    @if (loading()) {
      <app-spinner />
    } @else if (user(); as user) {
      <h1>Welcome, {{ user.name }}</h1>
      <button (click)="logout()">Logout</button>
    }
  `,
})
export class HeaderComponent {
  private store = inject(Store);

  user = this.store.selectSignal(selectUser);
  loading = this.store.selectSignal(selectUserLoading);

  logout() {
    this.store.dispatch(UserActions.logout());
  }
}
```

---

## RxJS-Based Patterns

### Component Store (Local Feature State)

```typescript
// stores/todo.store.ts
import { Injectable } from "@angular/core";
import { ComponentStore } from "@ngrx/component-store";
import { switchMap, tap, catchError, EMPTY } from "rxjs";

interface TodoState {
  todos: Todo[];
  loading: boolean;
}

@Injectable()
export class TodoStore extends ComponentStore<TodoState> {
  constructor(private todoService: TodoService) {
    super({ todos: [], loading: false });
  }

  // Selectors
  readonly todos$ = this.select((state) => state.todos);
  readonly loading$ = this.select((state) => state.loading);
  readonly completedCount$ = this.select(
    this.todos$,
    (todos) => todos.filter((t) => t.completed).length,
  );

  // Updaters
  readonly addTodo = this.updater((state, todo: Todo) => ({
    ...state,
    todos: [...state.todos, todo],
  }));

  readonly toggleTodo = this.updater((state, id: string) => ({
    ...state,
    todos: state.todos.map((t) =>
      t.id === id ? { ...t, completed: !t.completed } : t,
    ),
  }));

  // Effects
  readonly loadTodos = this.effect<void>((trigger$) =>
    trigger$.pipe(
      tap(() => this.patchState({ loading: true })),
      switchMap(() =>
        this.todoService.getAll().pipe(
          tap({
            next: (todos) => this.patchState({ todos, loading: false }),
            error: () => this.patchState({ loading: false }),
          }),
          catchError(() => EMPTY),
        ),
      ),
    ),
  );
}
```

---

## Server State with Signals

### HTTP + Signals Pattern

```typescript
// services/api.service.ts
import { Injectable, signal, inject } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { toSignal } from "@angular/core/rxjs-interop";

interface ApiState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

@Injectable({ providedIn: "root" })
export class ProductApiService {
  private http = inject(HttpClient);

  private _state = signal<ApiState<Product[]>>({
    data: null,
    loading: false,
    error: null,
  });

  readonly products = computed(() => this._state().data ?? []);
  readonly loading = computed(() => this._state().loading);
  readonly error = computed(() => this._state().error);

  async fetchProducts(): Promise<void> {
    this._state.update((s) => ({ ...s, loading: true, error: null }));

    try {
      const data = await firstValueFrom(
        this.http.get<Product[]>("/api/products"),
      );
      this._state.update((s) => ({ ...s, data, loading: false }));
    } catch (e) {
      this._state.update((s) => ({
        ...s,
        loading: false,
        error: "Failed to fetch products",
      }));
    }
  }

  // Optimistic update
  async deleteProduct(id: string): Promise<void> {
    const previousData = this._state().data;

    // Optimistically remove
    this._state.update((s) => ({
      ...s,
      data: s.data?.filter((p) => p.id !== id) ?? null,
    }));

    try {
      await firstValueFrom(this.http.delete(`/api/products/${id}`));
    } catch {
      // Rollback on error
      this._state.update((s) => ({ ...s, data: previousData }));
    }
  }
}
```

---

## Best Practices

### Do's

| Practice                           | Why                                |
| ---------------------------------- | ---------------------------------- |
| Use Signals for local state        | Simple, reactive, no subscriptions |
| Use `computed()` for derived data  | Auto-updates, memoized             |
| Colocate state with feature        | Easier to maintain                 |
| Use NgRx for complex flows         | Actions, effects, devtools         |
| Prefer `inject()` over constructor | Cleaner, works in factories        |

### Don'ts

| Anti-Pattern                      | Instead                                               |
| --------------------------------- | ----------------------------------------------------- |
| Store derived data                | Use `computed()`                                      |
| Mutate signals directly           | Use `set()` or `update()`                             |
| Over-globalize state              | Keep local when possible                              |
| Mix RxJS and Signals chaotically  | Choose primary, bridge with `toSignal`/`toObservable` |
| Subscribe in components for state | Use template with signals                             |

---

## Migration Path

### From BehaviorSubject to Signals

```typescript
// Before: RxJS-based
@Injectable({ providedIn: "root" })
export class OldUserService {
  private userSubject = new BehaviorSubject<User | null>(null);
  user$ = this.userSubject.asObservable();

  setUser(user: User) {
    this.userSubject.next(user);
  }
}

// After: Signal-based
@Injectable({ providedIn: "root" })
export class UserService {
  private _user = signal<User | null>(null);
  readonly user = this._user.asReadonly();

  setUser(user: User) {
    this._user.set(user);
  }
}
```

### Bridging Signals and RxJS

```typescript
import { toSignal, toObservable } from '@angular/core/rxjs-interop';

// Observable → Signal
@Component({...})
export class ExampleComponent {
  private route = inject(ActivatedRoute);

  // Convert Observable to Signal
  userId = toSignal(
    this.route.params.pipe(map(p => p['id'])),
    { initialValue: '' }
  );
}

// Signal → Observable
export class DataService {
  private filter = signal('');

  // Convert Signal to Observable
  filter$ = toObservable(this.filter);

  filteredData$ = this.filter$.pipe(
    debounceTime(300),
    switchMap(filter => this.http.get(`/api/data?q=${filter}`))
  );
}
```

---

## Resources

- [Angular Signals Guide](https://angular.dev/guide/signals)
- [NgRx Documentation](https://ngrx.io/)
- [NgRx SignalStore](https://ngrx.io/guide/signals)
- [RxAngular](https://www.rx-angular.io/)

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.
