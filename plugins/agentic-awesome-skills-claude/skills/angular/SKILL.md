---
name: angular
description: Modern Angular (v20+) expert with deep knowledge of Signals, Standalone Components, Zoneless applications, SSR/Hydration, and reactive patterns.
risk: safe
source: self
date_added: '2026-02-27'
---

# Angular Expert

Master modern Angular development with Signals, Standalone Components, Zoneless applications, SSR/Hydration, and the latest reactive patterns.

## When to Use This Skill

- Building new Angular applications (v20+)
- Implementing Signals-based reactive patterns
- Creating Standalone Components and migrating from NgModules
- Configuring Zoneless Angular applications
- Implementing SSR, prerendering, and hydration
- Optimizing Angular performance
- Adopting modern Angular patterns and best practices

## Do Not Use This Skill When

- Migrating from AngularJS (1.x) → use `angular-migration` skill
- Working with legacy Angular apps that cannot upgrade
- General TypeScript issues → use `typescript-expert` skill

## Instructions

1. Assess the Angular version and project structure
2. Apply modern patterns (Signals, Standalone, Zoneless)
3. Implement with proper typing and reactivity
4. Validate with build and tests

## Safety

- Always test changes in development before production
- Gradual migration for existing apps (don't big-bang refactor)
- Keep backward compatibility during transitions

---

## Angular Version Timeline

| Version        | Release | Key Features                                           |
| -------------- | ------- | ------------------------------------------------------ |
| **Angular 20** | Q2 2025 | Signals stable, Zoneless stable, Incremental hydration |
| **Angular 21** | Q4 2025 | Signals-first default, Enhanced SSR                    |
| **Angular 22** | Q2 2026 | Signal Forms, Selectorless components                  |

---

## 1. Signals: The New Reactive Primitive

Signals are Angular's fine-grained reactivity system, replacing zone.js-based change detection.

### Core Concepts

```typescript
import { signal, computed, effect } from "@angular/core";

// Writable signal
const count = signal(0);

// Read value
console.log(count()); // 0

// Update value
count.set(5); // Direct set
count.update((v) => v + 1); // Functional update

// Computed (derived) signal
const doubled = computed(() => count() * 2);

// Effect (side effects)
effect(() => {
  console.log(`Count changed to: ${count()}`);
});
```

### Signal-Based Inputs and Outputs

```typescript
import { Component, input, output, model } from "@angular/core";

@Component({
  selector: "app-user-card",
  standalone: true,
  template: `
    <div class="card">
      <h3>{{ name() }}</h3>
      <span>{{ role() }}</span>
      <button (click)="select.emit(id())">Select</button>
    </div>
  `,
})
export class UserCardComponent {
  // Signal inputs (read-only)
  id = input.required<string>();
  name = input.required<string>();
  role = input<string>("User"); // With default

  // Output
  select = output<string>();

  // Two-way binding (model)
  isSelected = model(false);
}

// Usage:
// <app-user-card [id]="'123'" [name]="'John'" [(isSelected)]="selected" />
```

### Signal Queries (ViewChild/ContentChild)

```typescript
import {
  Component,
  viewChild,
  viewChildren,
  contentChild,
} from "@angular/core";

@Component({
  selector: "app-container",
  standalone: true,
  template: `
    <input #searchInput />
    <app-item *ngFor="let item of items()" />
  `,
})
export class ContainerComponent {
  // Signal-based queries
  searchInput = viewChild<ElementRef>("searchInput");
  items = viewChildren(ItemComponent);
  projectedContent = contentChild(HeaderDirective);

  focusSearch() {
    this.searchInput()?.nativeElement.focus();
  }
}
```

### When to Use Signals vs RxJS

| Use Case                | Signals         | RxJS                             |
| ----------------------- | --------------- | -------------------------------- |
| Local component state   | ✅ Preferred    | Overkill                         |
| Derived/computed values | ✅ `computed()` | `combineLatest` works            |
| Side effects            | ✅ `effect()`   | `tap` operator                   |
| HTTP requests           | ❌              | ✅ HttpClient returns Observable |
| Event streams           | ❌              | ✅ `fromEvent`, operators        |
| Complex async flows     | ❌              | ✅ `switchMap`, `mergeMap`       |

---

## 2. Standalone Components

Standalone components are self-contained and don't require NgModule declarations.

### Creating Standalone Components

```typescript
import { Component } from "@angular/core";
import { CommonModule } from "@angular/common";
import { RouterLink } from "@angular/router";

@Component({
  selector: "app-header",
  standalone: true,
  imports: [CommonModule, RouterLink], // Direct imports
  template: `
    <header>
      <a routerLink="/">Home</a>
      <a routerLink="/about">About</a>
    </header>
  `,
})
export class HeaderComponent {}
```

### Bootstrapping Without NgModule

```typescript
// main.ts
import { bootstrapApplication } from "@angular/platform-browser";
import { provideRouter } from "@angular/router";
import { provideHttpClient } from "@angular/common/http";
import { AppComponent } from "./app/app.component";
import { routes } from "./app/app.routes";

bootstrapApplication(AppComponent, {
  providers: [provideRouter(routes), provideHttpClient()],
});
```

### Lazy Loading Standalone Components

```typescript
// app.routes.ts
import { Routes } from "@angular/router";

export const routes: Routes = [
  {
    path: "dashboard",
    loadComponent: () =>
      import("./dashboard/dashboard.component").then(
        (m) => m.DashboardComponent,
      ),
  },
  {
    path: "admin",
    loadChildren: () =>
      import("./admin/admin.routes").then((m) => m.ADMIN_ROUTES),
  },
];
```

---

## 3. Zoneless Angular

Zoneless applications don't use zone.js, improving performance and debugging.

### Enabling Zoneless Mode

```typescript
// main.ts
import { bootstrapApplication } from "@angular/platform-browser";
import { provideZonelessChangeDetection } from "@angular/core";
import { AppComponent } from "./app/app.component";

bootstrapApplication(AppComponent, {
  providers: [provideZonelessChangeDetection()],
});
```

### Zoneless Component Patterns

```typescript
import { Component, signal, ChangeDetectionStrategy } from "@angular/core";

@Component({
  selector: "app-counter",
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div>Count: {{ count() }}</div>
    <button (click)="increment()">+</button>
  `,
})
export class CounterComponent {
  count = signal(0);

  increment() {
    this.count.update((v) => v + 1);
    // No zone.js needed - Signal triggers change detection
  }
}
```

### Key Zoneless Benefits

- **Performance**: No zone.js patches on async APIs
- **Debugging**: Clean stack traces without zone wrappers
- **Bundle size**: Smaller without zone.js (~15KB savings)
- **Interoperability**: Better with Web Components and micro-frontends

---

## 4. Server-Side Rendering & Hydration

### SSR Setup with Angular CLI

```bash
ng add @angular/ssr
```

### Hydration Configuration

```typescript
// app.config.ts
import { ApplicationConfig } from "@angular/core";
import {
  provideClientHydration,
  withEventReplay,
} from "@angular/platform-browser";

export const appConfig: ApplicationConfig = {
  providers: [provideClientHydration(withEventReplay())],
};
```

### Incremental Hydration (v20+)

```typescript
import { Component } from "@angular/core";

@Component({
  selector: "app-page",
  standalone: true,
  template: `
    <app-hero />

    @defer (hydrate on viewport) {
      <app-comments />
    }

    @defer (hydrate on interaction) {
      <app-chat-widget />
    }
  `,
})
export class PageComponent {}
```

### Hydration Triggers

| Trigger          | When to Use                             |
| ---------------- | --------------------------------------- |
| `on idle`        | Low-priority, hydrate when browser idle |
| `on viewport`    | Hydrate when element enters viewport    |
| `on interaction` | Hydrate on first user interaction       |
| `on hover`       | Hydrate when user hovers                |
| `on timer(ms)`   | Hydrate after specified delay           |

---

## 5. Modern Routing Patterns

### Functional Route Guards

```typescript
// auth.guard.ts
import { inject } from "@angular/core";
import { Router, CanActivateFn } from "@angular/router";
import { AuthService } from "./auth.service";

export const authGuard: CanActivateFn = (route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (auth.isAuthenticated()) {
    return true;
  }

  return router.createUrlTree(["/login"], {
    queryParams: { returnUrl: state.url },
  });
};

// Usage in routes
export const routes: Routes = [
  {
    path: "dashboard",
    loadComponent: () => import("./dashboard.component"),
    canActivate: [authGuard],
  },
];
```

### Route-Level Data Resolvers

```typescript
import { inject } from '@angular/core';
import { ResolveFn } from '@angular/router';
import { UserService } from './user.service';
import { User } from './user.model';

export const userResolver: ResolveFn<User> = (route) => {
  const userService = inject(UserService);
  return userService.getUser(route.paramMap.get('id')!);
};

// In routes
{
  path: 'user/:id',
  loadComponent: () => import('./user.component'),
  resolve: { user: userResolver }
}

// In component
export class UserComponent {
  private route = inject(ActivatedRoute);
  user = toSignal(this.route.data.pipe(map(d => d['user'])));
}
```

---

## 6. Dependency Injection Patterns

### Modern inject() Function

```typescript
import { Component, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { UserService } from './user.service';

@Component({...})
export class UserComponent {
  // Modern inject() - no constructor needed
  private http = inject(HttpClient);
  private userService = inject(UserService);

  // Works in any injection context
  users = toSignal(this.userService.getUsers());
}
```

### Injection Tokens for Configuration

```typescript
import { InjectionToken, inject } from "@angular/core";

// Define token
export const API_BASE_URL = new InjectionToken<string>("API_BASE_URL");

// Provide in config
bootstrapApplication(AppComponent, {
  providers: [{ provide: API_BASE_URL, useValue: "https://api.example.com" }],
});

// Inject in service
@Injectable({ providedIn: "root" })
export class ApiService {
  private baseUrl = inject(API_BASE_URL);

  get(endpoint: string) {
    return this.http.get(`${this.baseUrl}/${endpoint}`);
  }
}
```

---

## 7. Component Composition & Reusability

### Content Projection (Slots)

```typescript
@Component({
  selector: 'app-card',
  template: `
    <div class="card">
      <div class="header">
        <!-- Select by attribute -->
        <ng-content select="[card-header]"></ng-content>
      </div>
      <div class="body">
        <!-- Default slot -->
        <ng-content></ng-content>
      </div>
    </div>
  `
})
export class CardComponent {}

// Usage
<app-card>
  <h3 card-header>Title</h3>
  <p>Body content</p>
</app-card>
```

### Host Directives (Composition)

```typescript
// Reusable behaviors without inheritance
@Directive({
  standalone: true,
  selector: '[appTooltip]',
  inputs: ['tooltip'] // Signal input alias
})
export class TooltipDirective { ... }

@Component({
  selector: 'app-button',
  standalone: true,
  hostDirectives: [
    {
      directive: TooltipDirective,
      inputs: ['tooltip: title'] // Map input
    }
  ],
  template: `<ng-content />`
})
export class ButtonComponent {}
```

---

## 8. State Management Patterns

### Signal-Based State Service

```typescript
import { Injectable, signal, computed } from "@angular/core";

interface AppState {
  user: User | null;
  theme: "light" | "dark";
  notifications: Notification[];
}

@Injectable({ providedIn: "root" })
export class StateService {
  // Private writable signals
  private _user = signal<User | null>(null);
  private _theme = signal<"light" | "dark">("light");
  private _notifications = signal<Notification[]>([]);

  // Public read-only computed
  readonly user = computed(() => this._user());
  readonly theme = computed(() => this._theme());
  readonly notifications = computed(() => this._notifications());
  readonly unreadCount = computed(
    () => this._notifications().filter((n) => !n.read).length,
  );

  // Actions
  setUser(user: User | null) {
    this._user.set(user);
  }

  toggleTheme() {
    this._theme.update((t) => (t === "light" ? "dark" : "light"));
  }

  addNotification(notification: Notification) {
    this._notifications.update((n) => [...n, notification]);
  }
}
```

### Component Store Pattern with Signals

```typescript
import { Injectable, signal, computed, inject } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { toSignal } from "@angular/core/rxjs-interop";

@Injectable()
export class ProductStore {
  private http = inject(HttpClient);

  // State
  private _products = signal<Product[]>([]);
  private _loading = signal(false);
  private _filter = signal("");

  // Selectors
  readonly products = computed(() => this._products());
  readonly loading = computed(() => this._loading());
  readonly filteredProducts = computed(() => {
    const filter = this._filter().toLowerCase();
    return this._products().filter((p) =>
      p.name.toLowerCase().includes(filter),
    );
  });

  // Actions
  loadProducts() {
    this._loading.set(true);
    this.http.get<Product[]>("/api/products").subscribe({
      next: (products) => {
        this._products.set(products);
        this._loading.set(false);
      },
      error: () => this._loading.set(false),
    });
  }

  setFilter(filter: string) {
    this._filter.set(filter);
  }
}
```

---

## 9. Forms with Signals (Coming in v22+)

### Current Reactive Forms

```typescript
import { Component, inject } from "@angular/core";
import { FormBuilder, Validators, ReactiveFormsModule } from "@angular/forms";

@Component({
  selector: "app-user-form",
  standalone: true,
  imports: [ReactiveFormsModule],
  template: `
    <form [formGroup]="form" (ngSubmit)="onSubmit()">
      <input formControlName="name" placeholder="Name" />
      <input formControlName="email" type="email" placeholder="Email" />
      <button [disabled]="form.invalid">Submit</button>
    </form>
  `,
})
export class UserFormComponent {
  private fb = inject(FormBuilder);

  form = this.fb.group({
    name: ["", Validators.required],
    email: ["", [Validators.required, Validators.email]],
  });

  onSubmit() {
    if (this.form.valid) {
      console.log(this.form.value);
    }
  }
}
```

### Signal-Aware Form Patterns (Preview)

```typescript
// Future Signal Forms API (experimental)
import { Component, signal } from '@angular/core';

@Component({...})
export class SignalFormComponent {
  name = signal('');
  email = signal('');

  // Computed validation
  isValid = computed(() =>
    this.name().length > 0 &&
    this.email().includes('@')
  );

  submit() {
    if (this.isValid()) {
      console.log({ name: this.name(), email: this.email() });
    }
  }
}
```

---

## 10. Performance Optimization

### Change Detection Strategies

```typescript
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  // Only checks when:
  // 1. Input signal/reference changes
  // 2. Event handler runs
  // 3. Async pipe emits
  // 4. Signal value changes
})
```

### Defer Blocks for Lazy Loading

```typescript
@Component({
  template: `
    <!-- Immediate loading -->
    <app-header />

    <!-- Lazy load when visible -->
    @defer (on viewport) {
      <app-heavy-chart />
    } @placeholder {
      <div class="skeleton" />
    } @loading (minimum 200ms) {
      <app-spinner />
    } @error {
      <p>Failed to load chart</p>
    }
  `
})
```

### NgOptimizedImage

```typescript
import { NgOptimizedImage } from '@angular/common';

@Component({
  imports: [NgOptimizedImage],
  template: `
    <img
      ngSrc="hero.jpg"
      width="800"
      height="600"
      priority
    />

    <img
      ngSrc="thumbnail.jpg"
      width="200"
      height="150"
      loading="lazy"
      placeholder="blur"
    />
  `
})
```

---

## 11. Testing Modern Angular

### Testing Signal Components

```typescript
import { ComponentFixture, TestBed } from "@angular/core/testing";
import { CounterComponent } from "./counter.component";

describe("CounterComponent", () => {
  let component: CounterComponent;
  let fixture: ComponentFixture<CounterComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CounterComponent], // Standalone import
    }).compileComponents();

    fixture = TestBed.createComponent(CounterComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it("should increment count", () => {
    expect(component.count()).toBe(0);

    component.increment();

    expect(component.count()).toBe(1);
  });

  it("should update DOM on signal change", () => {
    component.count.set(5);
    fixture.detectChanges();

    const el = fixture.nativeElement.querySelector(".count");
    expect(el.textContent).toContain("5");
  });
});
```

### Testing with Signal Inputs

```typescript
import { ComponentFixture, TestBed } from "@angular/core/testing";
import { ComponentRef } from "@angular/core";
import { UserCardComponent } from "./user-card.component";

describe("UserCardComponent", () => {
  let fixture: ComponentFixture<UserCardComponent>;
  let componentRef: ComponentRef<UserCardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UserCardComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(UserCardComponent);
    componentRef = fixture.componentRef;

    // Set signal inputs via setInput
    componentRef.setInput("id", "123");
    componentRef.setInput("name", "John Doe");

    fixture.detectChanges();
  });

  it("should display user name", () => {
    const el = fixture.nativeElement.querySelector("h3");
    expect(el.textContent).toContain("John Doe");
  });
});
```

---

## Best Practices Summary

| Pattern              | ✅ Do                          | ❌ Don't                        |
| -------------------- | ------------------------------ | ------------------------------- |
| **State**            | Use Signals for local state    | Overuse RxJS for simple state   |
| **Components**       | Standalone with direct imports | Bloated SharedModules           |
| **Change Detection** | OnPush + Signals               | Default CD everywhere           |
| **Lazy Loading**     | `@defer` and `loadComponent`   | Eager load everything           |
| **DI**               | `inject()` function            | Constructor injection (verbose) |
| **Inputs**           | `input()` signal function      | `@Input()` decorator (legacy)   |
| **Zoneless**         | Enable for new projects        | Force on legacy without testing |

---

## Resources

- [Angular.dev Documentation](https://angular.dev)
- [Angular Signals Guide](https://angular.dev/guide/signals)
- [Angular SSR Guide](https://angular.dev/guide/ssr)
- [Angular Update Guide](https://angular.dev/update-guide)
- [Angular Blog](https://blog.angular.dev)

---

## Common Troubleshooting

| Issue                          | Solution                                            |
| ------------------------------ | --------------------------------------------------- |
| Signal not updating UI         | Ensure `OnPush` + call signal as function `count()` |
| Hydration mismatch             | Check server/client content consistency             |
| Circular dependency            | Use `inject()` with `forwardRef`                    |
| Zoneless not detecting changes | Trigger via signal updates, not mutations           |
| SSR fetch fails                | Use `TransferState` or `withFetch()`                |

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.
