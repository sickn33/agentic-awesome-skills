# Practical Data Transformations - Detailed Guide

> This file contains the detailed procedure and reference material extracted from `SKILL.md` for focused loading. The root skill defines activation, examples, safety constraints, and limitations.

## Table of Contents

1. [Array Operations](#1-array-operations)
2. [Object Transformations](#2-object-transformations)
3. [Data Normalization](#3-data-normalization)
4. [Grouping and Aggregation](#4-grouping-and-aggregation)
5. [Null-Safe Access](#5-null-safe-access)
6. [Real-World Examples](../SKILL.md#6-real-world-examples)
7. [When to Use What](../SKILL.md#7-when-to-use-what)

---


## 1. Array Operations

Array operations are the bread and butter of data transformation. Let's replace verbose loops with expressive, chainable operations.

### Map: Transform Every Element

**The Task**: Convert an array of prices from cents to dollars.

#### Imperative Approach

```typescript
const pricesInCents = [999, 1499, 2999, 4999];

function convertToDollars(prices: number[]): number[] {
  const result: number[] = [];
  for (let i = 0; i < prices.length; i++) {
    result.push(prices[i] / 100);
  }
  return result;
}

const dollars = convertToDollars(pricesInCents);
// [9.99, 14.99, 29.99, 49.99]
```

#### Functional Approach

```typescript
const pricesInCents = [999, 1499, 2999, 4999];

const toDollars = (cents: number): number => cents / 100;

const dollars = pricesInCents.map(toDollars);
// [9.99, 14.99, 29.99, 49.99]
```

**Why functional is better here**: The intent is immediately clear. `map` says "transform each element." The transformation logic (`toDollars`) is named and reusable. No index management, no manual array building.

### Filter: Keep What Matches

**The Task**: Get all active users from a list.

#### Imperative Approach

```typescript
interface User {
  id: string;
  name: string;
  isActive: boolean;
}

function getActiveUsers(users: User[]): User[] {
  const result: User[] = [];
  for (const user of users) {
    if (user.isActive) {
      result.push(user);
    }
  }
  return result;
}
```

#### Functional Approach

```typescript
const isActive = (user: User): boolean => user.isActive;

const activeUsers = users.filter(isActive);

// Or inline for simple predicates
const activeUsers = users.filter(user => user.isActive);
```

**Why functional is better here**: The predicate (`isActive`) is separated from the iteration logic. You can reuse, test, and compose predicates independently.

### Reduce: Accumulate Into Something New

**The Task**: Calculate the total price of items in a cart.

#### Imperative Approach

```typescript
interface CartItem {
  name: string;
  price: number;
  quantity: number;
}

function calculateTotal(items: CartItem[]): number {
  let total = 0;
  for (const item of items) {
    total += item.price * item.quantity;
  }
  return total;
}
```

#### Functional Approach

```typescript
const calculateTotal = (items: CartItem[]): number =>
  items.reduce(
    (total, item) => total + item.price * item.quantity,
    0
  );

// Or break out the line total calculation
const lineTotal = (item: CartItem): number => item.price * item.quantity;

const calculateTotal = (items: CartItem[]): number =>
  items.map(lineTotal).reduce((a, b) => a + b, 0);
```

**Honest assessment**: For simple sums, the imperative loop is actually quite readable. The functional version shines when you need to compose the accumulation with other transformations, or when the reduction logic is complex enough to benefit from being named.

### Chaining: Combine Operations

**The Task**: Get the names of all active premium users, sorted alphabetically.

#### Imperative Approach

```typescript
interface User {
  id: string;
  name: string;
  isActive: boolean;
  tier: 'free' | 'premium';
}

function getActivePremiumNames(users: User[]): string[] {
  const result: string[] = [];
  for (const user of users) {
    if (user.isActive && user.tier === 'premium') {
      result.push(user.name);
    }
  }
  result.sort((a, b) => a.localeCompare(b));
  return result;
}
```

#### Functional Approach

```typescript
const getActivePremiumNames = (users: User[]): string[] =>
  users
    .filter(user => user.isActive)
    .filter(user => user.tier === 'premium')
    .map(user => user.name)
    .sort((a, b) => a.localeCompare(b));

// Or with named predicates for reuse
const isActive = (user: User): boolean => user.isActive;
const isPremium = (user: User): boolean => user.tier === 'premium';
const getName = (user: User): string => user.name;
const alphabetically = (a: string, b: string): number => a.localeCompare(b);

const getActivePremiumNames = (users: User[]): string[] =>
  users
    .filter(isActive)
    .filter(isPremium)
    .map(getName)
    .sort(alphabetically);
```

**Why functional is better here**: Each step in the chain has a single responsibility. You can read the transformation as a series of steps: "filter active, filter premium, get names, sort." Adding or removing a step is trivial.

### Using fp-ts Array Module

fp-ts provides additional array utilities with better composition support:

```typescript
import * as A from 'fp-ts/Array';
import * as O from 'fp-ts/Option';
import { pipe } from 'fp-ts/function';

// Safe head (first element)
const first = pipe(
  [1, 2, 3],
  A.head
); // Some(1)

const firstOfEmpty = pipe(
  [] as number[],
  A.head
); // None

// Safe lookup by index
const third = pipe(
  ['a', 'b', 'c', 'd'],
  A.lookup(2)
); // Some('c')

// Find with predicate
const found = pipe(
  users,
  A.findFirst(user => user.id === 'abc123')
); // Option<User>

// Partition into two groups
const [inactive, active] = pipe(
  users,
  A.partition(user => user.isActive)
);

// Take first N elements
const topThree = pipe(
  sortedScores,
  A.takeLeft(3)
);

// Unique values
const uniqueTags = pipe(
  allTags,
  A.uniq({ equals: (a, b) => a === b })
);
```

---


## 2. Object Transformations

Objects need reshaping constantly: picking fields, omitting sensitive data, merging settings, and updating nested values.

### Pick: Select Specific Fields

**The Task**: Extract only the public fields from a user object.

#### Imperative Approach

```typescript
interface User {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  internalNotes: string;
}

function getPublicUser(user: User): { id: string; name: string; email: string } {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
  };
}
```

#### Functional Approach

```typescript
// Generic pick utility
const pick = <T extends object, K extends keyof T>(
  keys: K[]
) => (obj: T): Pick<T, K> =>
  keys.reduce(
    (result, key) => {
      result[key] = obj[key];
      return result;
    },
    {} as Pick<T, K>
  );

const getPublicUser = pick<User, 'id' | 'name' | 'email'>(['id', 'name', 'email']);

const publicUser = getPublicUser(user);
```

**Why functional is better here**: The `pick` utility is reusable across your codebase. Type safety ensures you can only pick keys that exist.

### Omit: Remove Specific Fields

**The Task**: Remove sensitive fields before logging.

#### Imperative Approach

```typescript
function sanitizeForLogging(user: User): Omit<User, 'passwordHash' | 'internalNotes'> {
  const { passwordHash, internalNotes, ...safe } = user;
  return safe;
}
```

#### Functional Approach

```typescript
// Generic omit utility
const omit = <T extends object, K extends keyof T>(
  keys: K[]
) => (obj: T): Omit<T, K> => {
  const result = { ...obj };
  for (const key of keys) {
    delete result[key];
  }
  return result as Omit<T, K>;
};

const sanitizeForLogging = omit<User, 'passwordHash' | 'internalNotes'>([
  'passwordHash',
  'internalNotes',
]);
```

**Honest assessment**: For one-off omits, destructuring (the imperative approach) is perfectly fine and very readable. The functional `omit` utility pays off when you have many such transformations or need to compose them.

### Merge: Combine Objects

**The Task**: Merge user settings with defaults.

#### Imperative Approach

```typescript
interface Settings {
  theme: 'light' | 'dark';
  fontSize: number;
  notifications: boolean;
  language: string;
}

function mergeSettings(
  defaults: Settings,
  userSettings: Partial<Settings>
): Settings {
  return {
    theme: userSettings.theme !== undefined ? userSettings.theme : defaults.theme,
    fontSize: userSettings.fontSize !== undefined ? userSettings.fontSize : defaults.fontSize,
    notifications: userSettings.notifications !== undefined
      ? userSettings.notifications
      : defaults.notifications,
    language: userSettings.language !== undefined ? userSettings.language : defaults.language,
  };
}
```

#### Functional Approach

```typescript
const mergeSettings = (
  defaults: Settings,
  userSettings: Partial<Settings>
): Settings => ({
  ...defaults,
  ...userSettings,
});

// Usage
const defaults: Settings = {
  theme: 'light',
  fontSize: 14,
  notifications: true,
  language: 'en',
};

const userPrefs: Partial<Settings> = {
  theme: 'dark',
  fontSize: 16,
};

const finalSettings = mergeSettings(defaults, userPrefs);
// { theme: 'dark', fontSize: 16, notifications: true, language: 'en' }
```

**Why functional is better here**: Spread syntax is concise and handles any number of keys. Later spreads override earlier ones, giving you natural "defaults with overrides" behavior.

### Deep Merge: Nested Object Combination

**The Task**: Merge nested configuration objects.

#### Imperative Approach

```typescript
interface Config {
  api: {
    baseUrl: string;
    timeout: number;
    retries: number;
  };
  ui: {
    theme: string;
    animations: boolean;
  };
}

function deepMerge(
  target: Config,
  source: Partial<Config>
): Config {
  const result = { ...target };

  if (source.api) {
    result.api = { ...target.api, ...source.api };
  }
  if (source.ui) {
    result.ui = { ...target.ui, ...source.ui };
  }

  return result;
}
```

#### Functional Approach

```typescript
// Generic deep merge for one level of nesting
const deepMerge = <T extends Record<string, object>>(
  target: T,
  source: { [K in keyof T]?: Partial<T[K]> }
): T => {
  const result = { ...target };

  for (const key of Object.keys(source) as Array<keyof T>) {
    if (source[key] !== undefined) {
      result[key] = { ...target[key], ...source[key] };
    }
  }

  return result;
};

// Usage
const defaultConfig: Config = {
  api: { baseUrl: 'https://api.example.com', timeout: 5000, retries: 3 },
  ui: { theme: 'light', animations: true },
};

const customConfig = deepMerge(defaultConfig, {
  api: { timeout: 10000 },
  ui: { theme: 'dark' },
});
// api.baseUrl preserved, api.timeout overridden
// ui.theme overridden, ui.animations preserved
```

### Immutable Updates: Change Nested Values

**The Task**: Update a deeply nested value without mutation.

#### Imperative (Mutating) Approach

```typescript
interface State {
  user: {
    profile: {
      settings: {
        theme: string;
      };
    };
  };
}

function updateTheme(state: State, newTheme: string): void {
  state.user.profile.settings.theme = newTheme; // Mutation!
}
```

#### Functional (Immutable) Approach

```typescript
// Manual spread nesting
const updateTheme = (state: State, newTheme: string): State => ({
  ...state,
  user: {
    ...state.user,
    profile: {
      ...state.user.profile,
      settings: {
        ...state.user.profile.settings,
        theme: newTheme,
      },
    },
  },
});

// With a lens-like helper
const updatePath = <T, V>(
  obj: T,
  path: string[],
  value: V
): T => {
  if (path.length === 0) return value as unknown as T;

  const [head, ...rest] = path;
  return {
    ...obj,
    [head]: updatePath((obj as Record<string, unknown>)[head], rest, value),
  } as T;
};

const newState = updatePath(state, ['user', 'profile', 'settings', 'theme'], 'dark');
```

**Honest assessment**: The spread nesting is verbose but explicit. For deeply nested updates, consider using a library like `immer` or fp-ts lenses. The verbosity of the functional approach is the price of immutability.

---


## 3. Data Normalization

API responses rarely match the shape your app needs. Normalization transforms nested, denormalized data into flat, indexed structures.

### API Response to App State

**The Task**: Transform a nested API response into a normalized state.

#### API Response (What You Get)

```typescript
interface ApiResponse {
  orders: Array<{
    id: string;
    customerId: string;
    customerName: string;
    customerEmail: string;
    items: Array<{
      productId: string;
      productName: string;
      quantity: number;
      price: number;
    }>;
    total: number;
    status: string;
  }>;
}
```

#### App State (What You Need)

```typescript
interface NormalizedState {
  orders: {
    byId: Record<string, Order>;
    allIds: string[];
  };
  customers: {
    byId: Record<string, Customer>;
    allIds: string[];
  };
  products: {
    byId: Record<string, Product>;
    allIds: string[];
  };
}

interface Order {
  id: string;
  customerId: string;
  itemIds: string[];
  total: number;
  status: string;
}

interface Customer {
  id: string;
  name: string;
  email: string;
}

interface Product {
  id: string;
  name: string;
  price: number;
}
```

#### Imperative Approach

```typescript
function normalizeApiResponse(response: ApiResponse): NormalizedState {
  const state: NormalizedState = {
    orders: { byId: {}, allIds: [] },
    customers: { byId: {}, allIds: [] },
    products: { byId: {}, allIds: [] },
  };

  for (const order of response.orders) {
    // Extract customer
    if (!state.customers.byId[order.customerId]) {
      state.customers.byId[order.customerId] = {
        id: order.customerId,
        name: order.customerName,
        email: order.customerEmail,
      };
      state.customers.allIds.push(order.customerId);
    }

    // Extract products and build item IDs
    const itemIds: string[] = [];
    for (const item of order.items) {
      if (!state.products.byId[item.productId]) {
        state.products.byId[item.productId] = {
          id: item.productId,
          name: item.productName,
          price: item.price,
        };
        state.products.allIds.push(item.productId);
      }
      itemIds.push(item.productId);
    }

    // Add normalized order
    state.orders.byId[order.id] = {
      id: order.id,
      customerId: order.customerId,
      itemIds,
      total: order.total,
      status: order.status,
    };
    state.orders.allIds.push(order.id);
  }

  return state;
}
```

#### Functional Approach

```typescript
import { pipe } from 'fp-ts/function';
import * as A from 'fp-ts/Array';
import * as R from 'fp-ts/Record';

// Helper to create normalized collection
interface NormalizedCollection<T extends { id: string }> {
  byId: Record<string, T>;
  allIds: string[];
}

const createNormalizedCollection = <T extends { id: string }>(
  items: T[]
): NormalizedCollection<T> => ({
  byId: pipe(
    items,
    A.reduce({} as Record<string, T>, (acc, item) => ({
      ...acc,
      [item.id]: item,
    }))
  ),
  allIds: items.map(item => item.id),
});

// Extract entities
const extractCustomers = (orders: ApiResponse['orders']): Customer[] =>
  pipe(
    orders,
    A.map(order => ({
      id: order.customerId,
      name: order.customerName,
      email: order.customerEmail,
    })),
    A.uniq({ equals: (a, b) => a.id === b.id })
  );

const extractProducts = (orders: ApiResponse['orders']): Product[] =>
  pipe(
    orders,
    A.flatMap(order => order.items),
    A.map(item => ({
      id: item.productId,
      name: item.productName,
      price: item.price,
    })),
    A.uniq({ equals: (a, b) => a.id === b.id })
  );

const extractOrders = (orders: ApiResponse['orders']): Order[] =>
  orders.map(order => ({
    id: order.id,
    customerId: order.customerId,
    itemIds: order.items.map(item => item.productId),
    total: order.total,
    status: order.status,
  }));

// Compose into final normalization
const normalizeApiResponse = (response: ApiResponse): NormalizedState => ({
  orders: createNormalizedCollection(extractOrders(response.orders)),
  customers: createNormalizedCollection(extractCustomers(response.orders)),
  products: createNormalizedCollection(extractProducts(response.orders)),
});
```

**Why functional is better here**: Each extraction is independent and testable. The `createNormalizedCollection` helper is reusable. Adding a new entity type means adding one new extraction function.

### Transform API Response to UI-Ready Data

**The Task**: Convert API data to what your components need.

```typescript
// API gives you this
interface ApiUser {
  user_id: string;
  first_name: string;
  last_name: string;
  email_address: string;
  created_at: string; // ISO string
  avatar_url: string | null;
}

// Components need this
interface DisplayUser {
  id: string;
  fullName: string;
  email: string;
  memberSince: string; // "Jan 2024"
  avatarUrl: string; // With fallback
}
```

#### Functional Approach

```typescript
const formatDate = (isoString: string): string => {
  const date = new Date(isoString);
  return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
};

const DEFAULT_AVATAR = 'https://example.com/default-avatar.png';

const toDisplayUser = (apiUser: ApiUser): DisplayUser => ({
  id: apiUser.user_id,
  fullName: `${apiUser.first_name} ${apiUser.last_name}`,
  email: apiUser.email_address,
  memberSince: formatDate(apiUser.created_at),
  avatarUrl: apiUser.avatar_url ?? DEFAULT_AVATAR,
});

// Transform array of users
const toDisplayUsers = (apiUsers: ApiUser[]): DisplayUser[] =>
  apiUsers.map(toDisplayUser);
```

---


## 4. Grouping and Aggregation

Grouping and aggregating data is essential for reports, dashboards, and analytics.

### GroupBy: Organize by Key

**The Task**: Group orders by customer.

#### Imperative Approach

```typescript
interface Order {
  id: string;
  customerId: string;
  total: number;
  date: string;
}

function groupByCustomer(orders: Order[]): Record<string, Order[]> {
  const result: Record<string, Order[]> = {};

  for (const order of orders) {
    if (!result[order.customerId]) {
      result[order.customerId] = [];
    }
    result[order.customerId].push(order);
  }

  return result;
}
```

#### Functional Approach

```typescript
// Generic groupBy utility
const groupBy = <T, K extends string | number>(
  getKey: (item: T) => K
) => (items: T[]): Record<K, T[]> =>
  items.reduce(
    (groups, item) => {
      const key = getKey(item);
      return {
        ...groups,
        [key]: [...(groups[key] || []), item],
      };
    },
    {} as Record<K, T[]>
  );

// Usage
const groupByCustomer = groupBy<Order, string>(order => order.customerId);
const ordersByCustomer = groupByCustomer(orders);

// Or inline
const ordersByStatus = groupBy((order: Order) => order.status)(orders);
```

**Using fp-ts NonEmptyArray.groupBy**:

```typescript
import * as NEA from 'fp-ts/NonEmptyArray';
import { pipe } from 'fp-ts/function';

// NEA.groupBy guarantees non-empty arrays in result
const ordersByCustomer = pipe(
  orders as NEA.NonEmptyArray<Order>, // Must be non-empty
  NEA.groupBy(order => order.customerId)
); // Record<string, NonEmptyArray<Order>>
```

### CountBy: Count Occurrences

**The Task**: Count orders by status.

#### Imperative Approach

```typescript
function countByStatus(orders: Order[]): Record<string, number> {
  const counts: Record<string, number> = {};

  for (const order of orders) {
    counts[order.status] = (counts[order.status] || 0) + 1;
  }

  return counts;
}
```

#### Functional Approach

```typescript
// Generic countBy utility
const countBy = <T, K extends string>(
  getKey: (item: T) => K
) => (items: T[]): Record<K, number> =>
  items.reduce(
    (counts, item) => {
      const key = getKey(item);
      return {
        ...counts,
        [key]: (counts[key] || 0) + 1,
      };
    },
    {} as Record<K, number>
  );

// Usage
const orderCountByStatus = countBy((order: Order) => order.status)(orders);
// { pending: 5, shipped: 12, delivered: 8 }
```

### SumBy: Aggregate Numeric Values

**The Task**: Calculate total revenue per product category.

#### Imperative Approach

```typescript
interface Sale {
  productId: string;
  category: string;
  amount: number;
}

function sumByCategory(sales: Sale[]): Record<string, number> {
  const totals: Record<string, number> = {};

  for (const sale of sales) {
    totals[sale.category] = (totals[sale.category] || 0) + sale.amount;
  }

  return totals;
}
```

#### Functional Approach

```typescript
// Generic sumBy utility
const sumBy = <T, K extends string>(
  getKey: (item: T) => K,
  getValue: (item: T) => number
) => (items: T[]): Record<K, number> =>
  items.reduce(
    (totals, item) => {
      const key = getKey(item);
      return {
        ...totals,
        [key]: (totals[key] || 0) + getValue(item),
      };
    },
    {} as Record<K, number>
  );

// Usage
const revenueByCategory = sumBy(
  (sale: Sale) => sale.category,
  (sale: Sale) => sale.amount
)(sales);
// { electronics: 15000, clothing: 8500, books: 3200 }
```

### Complex Aggregation Example

**The Task**: Calculate totals from line items with quantity and unit price.

```typescript
interface LineItem {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
}

interface Invoice {
  id: string;
  lineItems: LineItem[];
  taxRate: number;
}
```

#### Functional Approach

```typescript
const lineTotal = (item: LineItem): number =>
  item.quantity * item.unitPrice;

const subtotal = (items: LineItem[]): number =>
  items.reduce((sum, item) => sum + lineTotal(item), 0);

const calculateTax = (amount: number, rate: number): number =>
  amount * rate;

const calculateInvoiceTotal = (invoice: Invoice): {
  subtotal: number;
  tax: number;
  total: number;
} => {
  const sub = subtotal(invoice.lineItems);
  const tax = calculateTax(sub, invoice.taxRate);

  return {
    subtotal: sub,
    tax,
    total: sub + tax,
  };
};

// With fp-ts pipe for clarity
import { pipe } from 'fp-ts/function';

const calculateInvoiceTotal = (invoice: Invoice) => {
  const sub = pipe(
    invoice.lineItems,
    A.map(lineTotal),
    A.reduce(0, (a, b) => a + b)
  );

  return {
    subtotal: sub,
    tax: sub * invoice.taxRate,
    total: sub * (1 + invoice.taxRate),
  };
};
```

---


## 5. Null-Safe Access

Stop writing `if (x && x.y && x.y.z)`. Safely navigate nested structures without runtime errors.

### The Problem

```typescript
interface Config {
  database?: {
    connection?: {
      host?: string;
      port?: number;
    };
    pool?: {
      max?: number;
    };
  };
  features?: {
    experimental?: {
      enabled?: boolean;
    };
  };
}
```

#### Imperative (Verbose) Approach

```typescript
function getDatabaseHost(config: Config): string {
  if (
    config.database &&
    config.database.connection &&
    config.database.connection.host
  ) {
    return config.database.connection.host;
  }
  return 'localhost';
}
```

#### Optional Chaining (Modern TypeScript)

```typescript
const getDatabaseHost = (config: Config): string =>
  config.database?.connection?.host ?? 'localhost';
```

**Honest assessment**: For simple access patterns, optional chaining (`?.`) is perfect. It's built into the language and very readable. Use fp-ts Option when you need to compose operations on potentially missing values.

### When to Use Option Instead

Use fp-ts Option when:
- You need to chain multiple operations on potentially missing values
- You want to distinguish "missing" from other falsy values
- You're building a pipeline of transformations

```typescript
import * as O from 'fp-ts/Option';
import { pipe } from 'fp-ts/function';

// Safe property access that returns Option
const prop = <T, K extends keyof T>(key: K) =>
  (obj: T | null | undefined): O.Option<T[K]> =>
    obj != null && key in obj
      ? O.some(obj[key] as T[K])
      : O.none;

// Chain accesses with flatMap
const getDatabaseHost = (config: Config): O.Option<string> =>
  pipe(
    O.some(config),
    O.flatMap(prop('database')),
    O.flatMap(prop('connection')),
    O.flatMap(prop('host'))
  );

// Extract with default
const host = pipe(
  getDatabaseHost(config),
  O.getOrElse(() => 'localhost')
);
```

### Safe Array Access

```typescript
import * as A from 'fp-ts/Array';
import * as O from 'fp-ts/Option';
import { pipe } from 'fp-ts/function';

// Imperative: throws if array is empty
const first = items[0]; // Could be undefined!

// Safe: returns Option
const first = A.head(items); // Option<Item>

// Get first item's name, or default
const firstName = pipe(
  items,
  A.head,
  O.map(item => item.name),
  O.getOrElse(() => 'No items')
);

// Safe lookup by index
const third = pipe(
  items,
  A.lookup(2),
  O.map(item => item.name),
  O.getOrElse(() => 'Not found')
);
```

### Safe Record/Dictionary Access

```typescript
import * as R from 'fp-ts/Record';
import * as O from 'fp-ts/Option';
import { pipe } from 'fp-ts/function';

const users: Record<string, User> = {
  'user-1': { name: 'Alice', email: 'alice@example.com' },
  'user-2': { name: 'Bob', email: 'bob@example.com' },
};

// Imperative: could be undefined
const user = users['user-3']; // User | undefined

// Safe: returns Option
const user = R.lookup('user-3')(users); // Option<User>

// Get user email or default
const email = pipe(
  users,
  R.lookup('user-3'),
  O.map(u => u.email),
  O.getOrElse(() => 'unknown@example.com')
);
```

### Combining Multiple Optional Values

**The Task**: Get a user's display name, which requires both first and last name.

```typescript
interface Profile {
  firstName?: string;
  lastName?: string;
  nickname?: string;
}

// Imperative
function getDisplayName(profile: Profile): string {
  if (profile.firstName && profile.lastName) {
    return `${profile.firstName} ${profile.lastName}`;
  }
  if (profile.nickname) {
    return profile.nickname;
  }
  return 'Anonymous';
}

// Functional with Option
import * as O from 'fp-ts/Option';
import { pipe } from 'fp-ts/function';

const getDisplayName = (profile: Profile): string =>
  pipe(
    // Try full name first
    O.Do,
    O.bind('first', () => O.fromNullable(profile.firstName)),
    O.bind('last', () => O.fromNullable(profile.lastName)),
    O.map(({ first, last }) => `${first} ${last}`),
    // Fall back to nickname
    O.alt(() => O.fromNullable(profile.nickname)),
    // Finally, default to Anonymous
    O.getOrElse(() => 'Anonymous')
  );
```

---


## Summary

| Task | Imperative | Functional | Recommendation |
|------|-----------|------------|----------------|
| Transform array elements | for loop with push | `.map()` | Use map |
| Filter array | for loop with condition | `.filter()` | Use filter |
| Accumulate values | for loop with accumulator | `.reduce()` | Use reduce for complex, loop for simple |
| Group by key | for loop with object | `groupBy` utility | Create reusable utility |
| Pick object fields | manual property copy | `pick` utility | Use spread for one-off, utility for repeated |
| Merge objects | property-by-property | spread syntax | Use spread |
| Deep merge | nested conditionals | recursive utility | Use utility or library |
| Null-safe access | `if (x && x.y)` | `?.` or Option | Use `?.` for simple, Option for composition |
| Normalize API data | nested loops | extraction functions | Break into composable functions |

**The functional approach is better when:**
- You need to compose operations
- You want reusable transformations
- You value explicit data flow over implicit state
- Type safety for missing values matters

**The imperative approach is acceptable when:**
- The transformation is a one-off
- The logic is simple and linear
- Performance is critical and you've measured
- The team is more comfortable with it
