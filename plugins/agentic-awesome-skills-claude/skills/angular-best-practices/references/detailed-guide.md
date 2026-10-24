# Angular Best Practices - Detailed Guide

> This file contains the detailed procedure and reference material extracted from `SKILL.md` for focused loading. The root skill defines activation, examples, safety constraints, and limitations.

Pin the Angular/CDK major versions and inspect the app’s existing change-detection and SSR setup first. Snippets are focused fragments with host services/imports assumed, not a complete runnable application. Measure bundle sizes and rendering profiles before/after; priority labels below are triage heuristics, not guaranteed gains.

## Rule Categories by Priority

| Priority | Category              | Impact     | Focus                           |
| -------- | --------------------- | ---------- | ------------------------------- |
| 1        | Change Detection      | CRITICAL   | Signals, OnPush, Zoneless       |
| 2        | Async Waterfalls      | CRITICAL   | RxJS patterns, SSR preloading   |
| 3        | Bundle Optimization   | CRITICAL   | Lazy loading, tree shaking      |
| 4        | Rendering Performance | HIGH       | @defer, trackBy, virtualization |
| 5        | Server-Side Rendering | HIGH       | Hydration, prerendering         |
| 6        | Template Optimization | MEDIUM     | Control flow, pipes             |
| 7        | State Management      | MEDIUM     | Signal patterns, selectors      |
| 8        | Memory Management     | LOW-MEDIUM | Cleanup, subscriptions          |

---


## 1. Change Detection (CRITICAL)

### Use OnPush Change Detection

```typescript
// CORRECT - OnPush with Signals
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<div>{{ count() }}</div>`,
})
export class CounterComponent {
  count = signal(0);
}

// Alternative - default strategy may be appropriate; profile before migration
@Component({
  template: `<div>{{ count }}</div>`, // Checked every cycle
})
export class CounterComponent {
  count = 0;
}
```

### Prefer Signals Over Mutable Properties

```typescript
// CORRECT - Signals trigger precise updates
@Component({
  template: `
    <h1>{{ title() }}</h1>
    <p>Count: {{ count() }}</p>
  `,
})
export class DashboardComponent {
  title = signal("Dashboard");
  count = signal(0);
}

// Plain properties can update through notified events; async updates need notification
@Component({
  template: `
    <h1>{{ title }}</h1>
    <p>Count: {{ count }}</p>
  `,
})
export class DashboardComponent {
  title = "Dashboard";
  count = 0;
}
```

### Enable Zoneless for New Projects

```typescript
// main.ts - opt-in for supported v20; zoneless is the default in v21+
bootstrapApplication(AppComponent, {
  providers: [provideZonelessChangeDetection()],
});
```

**Benefits:**

- No zone.js patches on async APIs
- Potentially smaller bundle; measure the actual build
- Clean stack traces for debugging
- Better micro-frontend compatibility

---


## 2. Async Operations & Waterfalls (CRITICAL)

### Eliminate Sequential Data Fetching

```typescript
// WRONG - Nested subscriptions create waterfalls
this.route.params.subscribe((params) => {
  // 1. Wait for params
  this.userService.getUser(params.id).subscribe((user) => {
    // 2. Wait for user
    this.postsService.getPosts(user.id).subscribe((posts) => {
      // 3. Wait for posts
    });
  });
});

// CORRECT - Parallel execution with forkJoin
forkJoin({
  user: this.userService.getUser(id),
  posts: this.postsService.getPosts(id),
}).subscribe((data) => {
  // Fetched in parallel
});

// CORRECT - Flatten dependent calls with switchMap
this.route.params
  .pipe(
    map((p) => p.id),
    switchMap((id) => this.userService.getUser(id)),
  )
  .subscribe();
```

### Avoid Client-Side Waterfalls in SSR

```typescript
// CORRECT - Use resolvers or blocking hydration for critical data
export const route: Route = {
  path: "profile/:id",
  resolve: { data: profileResolver }, // Resolves during navigation; runs server-side only when SSR is actually used
  component: ProfileComponent,
};

// WRONG - Component fetches data on init
class ProfileComponent implements OnInit {
  ngOnInit() {
    // May run on the server under SSR; avoid duplicate client requests with transfer caching
    this.http.get("/api/profile").subscribe();
  }
}
```

---


## 3. Bundle Optimization (CRITICAL)

### Lazy Load Routes

```typescript
// CORRECT - Lazy load feature routes
export const routes: Routes = [
  {
    path: "admin",
    loadChildren: () =>
      import("./admin/admin.routes").then((m) => m.ADMIN_ROUTES),
  },
  {
    path: "dashboard",
    loadComponent: () =>
      import("./dashboard/dashboard.component").then(
        (m) => m.DashboardComponent,
      ),
  },
];

// WRONG - Eager loading everything
import { AdminModule } from "./admin/admin.module";
export const routes: Routes = [
  { path: "admin", component: AdminComponent }, // In main bundle
];
```

### Use @defer for Heavy Components

```html
<!-- CORRECT - Heavy component loads on demand -->
@defer (on viewport) {
<app-analytics-chart [data]="data()" />
} @placeholder {
<div class="chart-skeleton"></div>
}

<!-- WRONG - Heavy component in initial bundle -->
<app-analytics-chart [data]="data()" />
```

### Avoid Barrel File Re-exports

```typescript
// Inspect side effects and package exports; a barrel does not inherently break tree-shaking
import { Button, Modal, Table } from "@shared/components";

// CORRECT - Direct imports
import { Button } from "@shared/components/button/button.component";
import { Modal } from "@shared/components/modal/modal.component";
```

### Dynamic Import Third-Party Libraries

```typescript
// CORRECT - Load heavy library on demand
async loadChart() {
  const { Chart } = await import('chart.js');
  this.chart = new Chart(this.canvas, config);
}

// WRONG - Bundle Chart.js in main chunk
import { Chart } from 'chart.js';
```

---


## 4. Rendering Performance (HIGH)

### Use Stable Identity with @for

```html
<!-- CORRECT - Efficient DOM updates -->
@for (item of items(); track item.id) {
<app-item-card [item]="item" />
}

<!-- For static never-reordered lists, $index can be suitable; avoid for mutable ordering -->
@for (item of items(); track $index) {
<app-item-card [item]="item" />
}
```

### Use Virtual Scrolling for Large Lists

```typescript
import { ScrollingModule } from '@angular/cdk/scrolling';

@Component({
  imports: [ScrollingModule],
  template: `
    <cdk-virtual-scroll-viewport [itemSize]="50" class="viewport" style="height: 300px">
      <div *cdkVirtualFor="let item of items" class="item" style="height: 50px">
        {{ item.name }}
      </div>
    </cdk-virtual-scroll-viewport>
  `
})
```

### Prefer Pure Pipes Over Methods

```typescript
// CORRECT - Pure pipe, memoized
@Pipe({ name: 'filterActive', standalone: true, pure: true })
export class FilterActivePipe implements PipeTransform {
  transform(items: Item[]): Item[] {
    return items.filter(i => i.active);
  }
}

// Template
@for (item of items() | filterActive; track item.id) { ... }

// WRONG - Method called every change detection
@for (item of getActiveItems(); track item.id) { ... }
```

### Use computed() for Derived Data

```typescript
// CORRECT - Computed, cached until dependencies change
export class ProductStore {
  products = signal<Product[]>([]);
  filter = signal('');

  filteredProducts = computed(() => {
    const f = this.filter().toLowerCase();
    return this.products().filter(p =>
      p.name.toLowerCase().includes(f)
    );
  });
}

// WRONG - Recalculates every access
get filteredProducts() {
  return this.products.filter(p =>
    p.name.toLowerCase().includes(this.filter)
  );
}
```

---


## 5. Server-Side Rendering (HIGH)

### Configure Incremental Hydration

For versions using an explicit withIncrementalHydration feature, event replay is already enabled by that feature. In current versions where provideClientHydration enables incremental hydration by default, use the documented default instead; do not mix version-specific APIs.

```typescript
// app.config.ts
import {
  provideClientHydration,
  withIncrementalHydration,
} from "@angular/platform-browser";

export const appConfig: ApplicationConfig = {
  providers: [
    provideClientHydration(withIncrementalHydration()),
  ],
};
```

### Defer Non-Critical Content

```html
<!-- Critical above-the-fold content -->
<app-header />
<app-hero />

<!-- Below-fold deferred with hydration triggers -->
@defer (hydrate on viewport) {
<app-product-grid />
}
@defer (hydrate on interaction) {
<app-chat-widget />
}
```

### Use TransferState for SSR Data

```typescript
@Injectable({ providedIn: "root" })
export class DataService {
  private http = inject(HttpClient);
  private transferState = inject(TransferState);
  private platformId = inject(PLATFORM_ID);

  getData(key: string): Observable<Data> {
    const stateKey = makeStateKey<Data>(key);

    if (isPlatformBrowser(this.platformId)) {
      const cached = this.transferState.get<Data | null>(stateKey, null);
      if (cached !== null) {
        this.transferState.remove(stateKey);
        return of(cached);
      }
    }

    return this.http.get<Data>(`/api/${encodeURIComponent(key)}`).pipe(
      tap((data) => {
        if (isPlatformServer(this.platformId)) {
          this.transferState.set(stateKey, data);
        }
      }),
    );
  }
}
```

---


## 6. Template Optimization (MEDIUM)

### Use New Control Flow Syntax

```html
<!-- CORRECT - New control flow (faster, smaller bundle) -->
@if (user()) {
<span>{{ user()!.name }}</span>
} @else {
<span>Guest</span>
} @for (item of items(); track item.id) {
<app-item [item]="item" />
} @empty {
<p>No items</p>
}

<!-- WRONG - Legacy structural directives -->
<span *ngIf="user; else guest">{{ user.name }}</span>
<ng-template #guest><span>Guest</span></ng-template>
```

### Avoid Complex Template Expressions

```typescript
// CORRECT - Precompute in component
class Component {
  items = signal<Item[]>([]);
  sortedItems = computed(() =>
    [...this.items()].sort((a, b) => a.name.localeCompare(b.name))
  );
}

// Template
@for (item of sortedItems(); track item.id) { ... }

// WRONG - Sorting in template every render
@for (item of items() | sort:'name'; track item.id) { ... }
```

---


## 7. State Management (MEDIUM)

### Use Selectors to Prevent Re-renders

```typescript
// CORRECT - Selective subscription
@Component({
  template: `<span>{{ userName() }}</span>`,
})
class HeaderComponent {
  private store = inject(Store);
  // Only re-renders when userName changes
  userName = this.store.selectSignal(selectUserName);
}

// WRONG - Subscribing to entire state
@Component({
  template: `<span>{{ state().user.name }}</span>`,
})
class HeaderComponent {
  private store = inject(Store);
  // Re-renders on ANY state change
  state = toSignal(this.store);
}
```

### Colocate State with Features

```typescript
// CORRECT - Feature-scoped store
@Injectable() // NOT providedIn: 'root'
export class ProductStore { ... }

@Component({
  providers: [ProductStore], // Scoped to component tree
})
export class ProductPageComponent {
  store = inject(ProductStore);
}

// WRONG - Everything in global store
@Injectable({ providedIn: 'root' })
export class GlobalStore {
  // Contains ALL app state - hard to tree-shake
}
```

---


## 8. Memory Management (LOW-MEDIUM)

### Use takeUntilDestroyed for Subscriptions

```typescript
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

@Component({...})
export class DataComponent {
  private destroyRef = inject(DestroyRef);

  constructor() {
    this.data$.pipe(
      takeUntilDestroyed(this.destroyRef)
    ).subscribe(data => this.process(data));
  }
}

// WRONG - Manual subscription management
export class DataComponent implements OnDestroy {
  private subscription!: Subscription;

  ngOnInit() {
    this.subscription = this.data$.subscribe(...);
  }

  ngOnDestroy() {
    this.subscription.unsubscribe(); // Easy to forget
  }
}
```

### Prefer Signals Over Subscriptions

```typescript
// CORRECT - No subscription needed
@Component({
  template: `<div>{{ data()?.name }}</div>`,
})
export class Component {
  data = toSignal(this.service.data$, { initialValue: null });
}

// WRONG - Manual subscription
@Component({
  template: `<div>{{ data?.name }}</div>`,
})
export class Component implements OnInit, OnDestroy {
  data: Data | null = null;
  private sub!: Subscription;

  ngOnInit() {
    this.sub = this.service.data$.subscribe((d) => (this.data = d));
  }

  ngOnDestroy() {
    this.sub.unsubscribe();
  }
}
```

---


## Quick Reference Checklist

### New Component

- [ ] `changeDetection: ChangeDetectionStrategy.OnPush`
- [ ] `standalone: true`
- [ ] Signals for reactive state (`signal()`, `input()`); `output()` emits events and is not a signal
- [ ] `inject()` for dependencies
- [ ] `@for` with `track` expression

### Performance Review

- [ ] No methods in templates (use pipes or computed)
- [ ] Large lists virtualized
- [ ] Heavy components deferred
- [ ] Routes lazy-loaded
- [ ] Third-party libs dynamically imported

### SSR Check

- [ ] Hydration configured
- [ ] Critical content renders first
- [ ] Non-critical content uses `@defer (hydrate on ...)`
- [ ] TransferState for server-fetched data

---


Pure pipes cache based on input identity; in-place array mutation can leave derived output stale. Use immutable updates or explicit signals, and avoid calling every template method “wrong”: pure inexpensive methods may be fine. Use forkJoin for independent completing requests, not endless streams; preserve dependent request order and cancellation. SSR transfer state is serialized to the client: never include secrets or cross-user cached data. Ensure per-request SSR services and user-specific cache keys, and check built-in HTTP transfer caching before adding manual state.

## Resources

- [Angular Performance Guide](https://angular.dev/best-practices/performance)
- [Zoneless Angular](https://angular.dev/guide/zoneless)
- [Angular SSR Guide](https://angular.dev/guide/ssr)
- [Change Detection Deep Dive](https://angular.dev/guide/change-detection)
