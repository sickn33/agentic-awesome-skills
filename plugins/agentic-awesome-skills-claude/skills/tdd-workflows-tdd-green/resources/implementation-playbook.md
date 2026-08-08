# Green Phase: Simple function Implementation Playbook

This file contains detailed patterns, checklists, and code samples referenced by the skill.

Implement minimal code to make failing tests pass in TDD green phase:

[Extended thinking: This tool uses the test-automator agent to implement the minimal code necessary to make tests pass. It focuses on simplicity, avoiding over-engineering while ensuring all tests become green.]

## Use this skill when

- Moving from red to green in a TDD cycle
- Implementing minimal behavior to satisfy tests
- You want to keep implementation intentionally simple

## Do not use this skill when

- You are refactoring for design or performance
- Tests are already passing and you need new requirements
- You need a full architectural redesign

## Instructions

1. Review failing tests and identify the smallest fix.
2. Implement the minimal change to pass the next test.
3. Run tests after each change to confirm progress.
4. Record shortcuts or debt for the refactor phase.

## Safety

- Avoid bypassing tests to make them pass.
- Keep changes scoped to the failing behavior only.

## Implementation Process

Use Task tool with subagent_type="unit-testing::test-automator" to implement minimal passing code.

Prompt: "Implement MINIMAL code to make these failing tests pass: $ARGUMENTS. Follow TDD green phase principles:

1. **Pre-Implementation Analysis**
   - Review all failing tests and their error messages
   - Identify the simplest path to make tests pass
   - Map test requirements to minimal implementation needs
   - Avoid premature optimization or over-engineering
   - Focus only on making tests green, not perfect code

2. **Implementation Strategy**
   - **Fake It**: Return hard-coded values when appropriate
   - **Obvious Implementation**: When solution is trivial and clear
   - **Triangulation**: Generalize only when multiple tests require it
   - Start with the simplest test and work incrementally
   - One test at a time - don't try to pass all at once

3. **Code Structure Guidelines**
   - Write the minimal code that could possibly work
   - Avoid adding functionality not required by tests
   - Use simple data structures initially
   - Defer architectural decisions until refactor phase
   - Keep methods/functions small and focused
   - Don't add error handling unless tests require it

4. **Language-Specific Patterns**
   - **JavaScript/TypeScript**: Simple functions, avoid classes initially
   - **Python**: Functions before classes, simple returns
   - **Java**: Minimal class structure, no patterns yet
   - **C#**: Basic implementations, no interfaces yet
   - **Go**: Simple functions, defer goroutines/channels
   - **Ruby**: Procedural before object-oriented when possible

5. **Progressive Implementation**
   - Make first test pass with simplest possible code
   - Run tests after each change to verify progress
   - Add just enough code for next failing test
   - Resist urge to implement beyond test requirements
   - Keep track of technical debt for refactor phase
   - Document assumptions and shortcuts taken

6. **Common Green Phase Techniques**
   - Hard-coded returns for initial tests
   - Simple if/else for limited test cases
   - Basic loops only when iteration tests require
   - Minimal data structures (arrays before complex objects)
   - In-memory storage before database integration
   - Synchronous before asynchronous implementation

7. **Success Criteria**
   ✓ All tests pass (green)
   ✓ No extra functionality beyond test requirements
   ✓ Code is readable even if not optimal
   ✓ No broken existing functionality
   ✓ Implementation time is minimized
   ✓ Clear path to refactoring identified

8. **Anti-Patterns to Avoid**
   - Gold plating or adding unrequested features
   - Implementing design patterns prematurely
   - Complex abstractions without test justification
   - Performance optimizations without metrics
   - Adding tests during green phase
   - Refactoring during implementation
   - Ignoring test failures to move forward

9. **Implementation Metrics**
   - Time to green: Track implementation duration
   - Lines of code: Measure implementation size
   - Cyclomatic complexity: Keep it low initially
   - Test pass rate: Must reach 100%
   - Code coverage: Verify all paths tested

10. **Validation Steps**
    - Run all tests and confirm they pass
    - Verify no regression in existing tests
    - Check that implementation is truly minimal
    - Document any technical debt created
    - Prepare notes for refactoring phase

Output should include:
- Complete implementation code
- Test execution results showing all green
- List of shortcuts taken for later refactoring
- Implementation time metrics
- Technical debt documentation
- Readiness assessment for refactor phase"

## Post-Implementation Checks

After implementation:
1. Run full test suite to confirm all tests pass
2. Verify no existing tests were broken
3. Document areas needing refactoring
4. Check implementation is truly minimal
5. Record implementation time for metrics

## Recovery Process

If tests still fail:
- Review test requirements carefully
- Check for misunderstood assertions
- Add minimal code to address specific failures
- Avoid the temptation to rewrite from scratch
- Consider if tests themselves need adjustment

## Integration Points

- Follows from tdd-red.md test creation
- Prepares for tdd-refactor.md improvements
- Updates test coverage metrics
- Triggers CI/CD pipeline verification
- Documents technical debt for tracking

## Best Practices

- Embrace "good enough" for this phase
- Speed over perfection (perfection comes in refactor)
- Make it work, then make it right, then make it fast
- Trust that refactoring phase will improve code
- Keep changes small and incremental
- Celebrate reaching green state!

## Complete Implementation Examples

### Example 1: Minimal → Production-Ready (User Service)

**Test Requirements:**
```typescript
describe('UserService', () => {
  it('should create a new user', async () => {
    const user = await userService.create({ email: 'test@example.com', name: 'Test' });
    expect(user.id).toBeDefined();
    expect(user.email).toBe('test@example.com');
  });

  it('should find user by email', async () => {
    await userService.create({ email: 'test@example.com', name: 'Test' });
    const user = await userService.findByEmail('test@example.com');
    expect(user).toBeDefined();
  });
});
```

**Stage 1: Fake It (Minimal)**
```typescript
class UserService {
  create(data: { email: string; name: string }) {
    return { id: '123', email: data.email, name: data.name };
  }

  findByEmail(email: string) {
    return { id: '123', email: email, name: 'Test' };
  }
}
```
*Tests pass. Implementation is obviously fake but validates test structure.*

**Stage 2: Simple Real Implementation**
```typescript
class UserService {
  private users: Map<string, User> = new Map();
  private nextId = 1;

  create(data: { email: string; name: string }) {
    const user = { id: String(this.nextId++), ...data };
    this.users.set(user.email, user);
    return user;
  }

  findByEmail(email: string) {
    return this.users.get(email) || null;
  }
}
```
*In-memory storage. Tests pass. Good enough for green phase.*

**Stage 3: Production-Ready (Refactor Phase)**
```typescript
class UserService {
  constructor(private db: Database) {}

  async create(data: { email: string; name: string }) {
    const existing = await this.db.query('SELECT * FROM users WHERE email = ?', [data.email]);
    if (existing) throw new Error('User exists');

    const id = await this.db.insert('users', data);
    return { id, ...data };
  }

  async findByEmail(email: string) {
    return this.db.queryOne('SELECT * FROM users WHERE email = ?', [email]);
  }
}
```
*Database integration, error handling, validation - saved for refactor phase.*

### Example 2: API-First Implementation (Express)

**Test Requirements:**
```javascript
describe('POST /api/tasks', () => {
  it('should create task and return 201', async () => {
    const res = await request(app)
      .post('/api/tasks')
      .send({ title: 'Test Task' });

    expect(res.status).toBe(201);
    expect(res.body.id).toBeDefined();
    expect(res.body.title).toBe('Test Task');
  });
});
```

**Stage 1: Hardcoded Response**
```javascript
app.post('/api/tasks', (req, res) => {
  res.status(201).json({ id: '1', title: req.body.title });
});
```
*Tests pass immediately. No logic needed yet.*

**Stage 2: Simple Logic**
```javascript
let tasks = [];
let nextId = 1;

app.post('/api/tasks', (req, res) => {
  const task = { id: String(nextId++), title: req.body.title };
  tasks.push(task);
  res.status(201).json(task);
});
```
*Minimal state management. Ready for more tests.*

**Stage 3: Layered Architecture (Refactor)**
```javascript
// Controller
app.post('/api/tasks', async (req, res) => {
  try {
    const task = await taskService.create(req.body);
    res.status(201).json(task);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Service layer
class TaskService {
  constructor(private repository: TaskRepository) {}

  async create(data: CreateTaskDto): Promise<Task> {
    this.validate(data);
    return this.repository.save(data);
  }
}
```
*Proper separation of concerns added during refactor phase.*

### Example 3: Database Integration (Django)

**Test Requirements:**
```python
def test_product_creation():
    product = Product.objects.create(name="Widget", price=9.99)
    assert product.id is not None
    assert product.name == "Widget"

def test_product_price_validation():
    with pytest.raises(ValidationError):
        Product.objects.create(name="Widget", price=-1)
```

**Stage 1: Model Only**
```python
class Product(models.Model):
    name = models.CharField(max_length=200)
    price = models.DecimalField(max_digits=10, decimal_places=2)
```
*First test passes. Second test fails - validation not implemented.*

**Stage 2: Add Validation**
```python
class Product(models.Model):
    name = models.CharField(max_length=200)
    price = models.DecimalField(max_digits=10, decimal_places=2)

    def clean(self):
        if self.price < 0:
            raise ValidationError("Price cannot be negative")

    def save(self, *args, **kwargs):
        self.clean()
        super().save(*args, **kwargs)
```
*All tests pass. Minimal validation logic added.*

**Stage 3: Rich Domain Model (Refactor)**
```python
class Product(models.Model):
    name = models.CharField(max_length=200)
    price = models.DecimalField(max_digits=10, decimal_places=2)
    category = models.ForeignKey(Category, on_delete=models.CASCADE)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        indexes = [models.Index(fields=['category', '-created_at'])]

    def clean(self):
        if self.price < 0:
            raise ValidationError("Price cannot be negative")
        if self.price > 10000:
            raise ValidationError("Price exceeds maximum")

    def apply_discount(self, percentage: float) -> Decimal:
        return self.price * (1 - percentage / 100)
```
*Additional features, indexes, business logic added when needed.*

### Example 4: React Component Implementation

**Test Requirements:**
```typescript
describe('UserProfile', () => {
  it('should display user name', () => {
    render(<UserProfile user={{ name: 'John', email: 'john@test.com' }} />);
    expect(screen.getByText('John')).toBeInTheDocument();
  });

  it('should display email', () => {
    render(<UserProfile user={{ name: 'John', email: 'john@test.com' }} />);
    expect(screen.getByText('john@test.com')).toBeInTheDocument();
  });
});
```

**Stage 1: Minimal JSX**
```typescript
interface UserProfileProps {
  user: { name: string; email: string };
}

const UserProfile: React.FC<UserProfileProps> = ({ user }) => (
  <div>
    <div>{user.name}</div>
    <div>{user.email}</div>
  </div>
);
```
*Tests pass. No styling, no structure.*

**Stage 2: Basic Structure**
```typescript
const UserProfile: React.FC<UserProfileProps> = ({ user }) => (
  <div className="user-profile">
    <h2>{user.name}</h2>
    <p>{user.email}</p>
  </div>
);
```
*Added semantic HTML, className for styling hook.*

**Stage 3: Production Component (Refactor)**
```typescript
const UserProfile: React.FC<UserProfileProps> = ({ user }) => {
  const [isEditing, setIsEditing] = useState(false);

  return (
    <div className="user-profile" role="article" aria-label="User profile">
      <header>
        <h2>{user.name}</h2>
        <button onClick={() => setIsEditing(true)} aria-label="Edit profile">
          Edit
        </button>
      </header>
      <section>
        <p>{user.email}</p>
        {user.bio && <p>{user.bio}</p>}
      </section>
    </div>
  );
};
```
*Accessibility, interaction, additional features added incrementally.*

## Decision Frameworks

### Framework 1: Fake vs. Real Implementation

**When to Fake It:**
- First test for a new feature
- Complex external dependencies (payment gateways, APIs)
- Implementation approach is still uncertain
- Need to validate test structure first
- Time pressure to see all tests green

**When to Go Real:**
- Second or third test reveals pattern
- Implementation is obvious and simple
- Faking would be more complex than real code
- Need to test integration points
- Tests explicitly require real behavior

**Decision Matrix:**
```
Complexity Low     | High
         ↓         | ↓
Simple   → REAL    | FAKE first, real later
Complex  → REAL    | FAKE, evaluate alternatives
```

### Framework 2: Complexity Trade-off Analysis

**Simplicity Score Calculation:**
```
Score = (Lines of Code) + (Cyclomatic Complexity × 2) + (Dependencies × 3)

< 20  → Simple enough, implement directly
20-50 → Consider simpler alternative
> 50  → Defer complexity to refactor phase
```

**Example Evaluation:**
```typescript
// Option A: Direct implementation (Score: 45)
function calculateShipping(weight: number, distance: number, express: boolean): number {
  let base = weight * 0.5 + distance * 0.1;
  if (express) base *= 2;
  if (weight > 50) base += 10;
  if (distance > 1000) base += 20;
  return base;
}

// Option B: Simplest for green phase (Score: 15)
function calculateShipping(weight: number, distance: number, express: boolean): number {
  return express ? 50 : 25; // Fake it until more tests drive real logic
}
```
*Choose Option B for green phase, evolve to Option A as tests require.*

### Framework 3: Performance Consideration Timing

**Green Phase: Focus on Correctness**
```
❌ Avoid:
- Caching strategies
- Database query optimization
- Algorithmic complexity improvements
- Premature memory optimization

✓ Accept:
- O(n²) if it makes code simpler
- Multiple database queries
- Synchronous operations
- Inefficient but clear algorithms
```

**When Performance Matters in Green Phase:**
1. Performance is explicit test requirement
2. Implementation would cause timeout in test suite
3. Memory leak would crash tests
4. Resource exhaustion prevents testing

**Performance Testing Integration:**
```typescript
// Add performance test AFTER functional tests pass
describe('Performance', () => {
  it('should handle 1000 users within 100ms', () => {
    const start = Date.now();
    for (let i = 0; i < 1000; i++) {
      userService.create({ email: `user${i}@test.com`, name: `User ${i}` });
    }
    expect(Date.now() - start).toBeLessThan(100);
  });
});
```

## Framework-Specific Patterns

### React Patterns

**Simple Component → Hooks → Context:**
```typescript
// Green Phase: Props only
const Counter = ({ count, onIncrement }) => (
  <button onClick={onIncrement}>{count}</button>
);

// Refactor: Add hooks
const Counter = () => {
  const [count, setCount] = useState(0);
  return <button onClick={() => setCount(c => c + 1)}>{count}</button>;
};

// Refactor: Extract to context
const Counter = () => {
  const { count, increment } = useCounter();
  return <button onClick={increment}>{count}</button>;
};
```

### Django Patterns

**Function View → Class View → Generic View:**
```python
# Green Phase: Simple function
def product_list(request):
    products = Product.objects.all()
    return JsonResponse({'products': list(products.values())})

# Refactor: Class-based view
class ProductListView(View):
    def get(self, request):
        products = Product.objects.all()
        return JsonResponse({'products': list(products.values())})

# Refactor: Generic view
class ProductListView(ListView):
    model = Product
    context_object_name = 'products'
```

### Express Patterns

**Inline → Middleware → Service Layer:**
```javascript
// Green Phase: Inline logic
app.post('/api/users', (req, res) => {
  const user = { id: Date.now(), ...req.body };
  users.push(user);
  res.json(user);
});

// Refactor: Extract middleware
app.post('/api/users', validateUser, (req, res) => {
  const user = userService.create(req.body);
  res.json(user);
});

// Refactor: Full layering
app.post('/api/users',
  validateUser,
  asyncHandler(userController.create)
);
```

## Refactoring Resistance Patterns

### Pattern 1: Test Anchor Points

Keep tests green during refactoring by maintaining interface contracts:

```typescript
// Original implementation (tests green)
function calculateTotal(items: Item[]): number {
  return items.reduce((sum, item) => sum + item.price, 0);
}

// Refactoring: Add tax calculation (keep interface)
function calculateTotal(items: Item[]): number {
  const subtotal = items.reduce((sum, item) => sum + item.price, 0);
  const tax = subtotal * 0.1;
  return subtotal + tax;
}

// Tests still green because return type/behavior unchanged
```

### Pattern 2: Parallel Implementation

Run old and new implementations side by side:

```python
def process_order(order):
    # Old implementation (tests depend on this)
    result_old = legacy_process(order)

    # New implementation (testing in parallel)
    result_new = new_process(order)

    # Verify they match
    assert result_old == result_new, "Implementation mismatch"

    return result_old  # Keep tests green
```

### Pattern 3: Feature Flags for Refactoring

```javascript
class PaymentService {
  processPayment(amount) {
    if (config.USE_NEW_PAYMENT_PROCESSOR) {
      return this.newPaymentProcessor(amount);
    }
    return this.legacyPaymentProcessor(amount);
  }
}
```

## Performance-First Green Phase Strategies

### Strategy 1: Type-Driven Development

Use types to guide minimal implementation:

```typescript
// Types define contract
interface UserRepository {
  findById(id: string): Promise<User | null>;
  save(user: User): Promise<void>;
}

// Green phase: In-memory implementation
class InMemoryUserRepository implements UserRepository {
  private users = new Map<string, User>();

  async findById(id: string) {
    return this.users.get(id) || null;
  }

  async save(user: User) {
    this.users.set(user.id, user);
  }
}

// Refactor: Database implementation (same interface)
class DatabaseUserRepository implements UserRepository {
  constructor(private db: Database) {}

  async findById(id: string) {
    return this.db.query('SELECT * FROM users WHERE id = ?', [id]);
  }

  async save(user: User) {
    await this.db.insert('users', user);
  }
}
```

### Strategy 2: Contract Testing Integration

```typescript
// Define contract
const userServiceContract = {
  create: {
    input: { email: 'string', name: 'string' },
    output: { id: 'string', email: 'string', name: 'string' }
  }
};

// Green phase: Implementation matches contract
class UserService {
  create(data: { email: string; name: string }) {
    return { id: '123', ...data }; // Minimal but contract-compliant
  }
}

// Contract test ensures compliance
describe('UserService Contract', () => {
  it('should match create contract', () => {
    const result = userService.create({ email: 'test@test.com', name: 'Test' });
    expect(typeof result.id).toBe('string');
    expect(typeof result.email).toBe('string');
    expect(typeof result.name).toBe('string');
  });
});
```

### Strategy 3: Continuous Refactoring Workflow

**Micro-Refactoring During Green Phase:**

```python
# Test passes with this
def calculate_discount(price, customer_type):
    if customer_type == 'premium':
        return price * 0.8
    return price

# Immediate micro-refactor (tests still green)
DISCOUNT_RATES = {
    'premium': 0.8,
    'standard': 1.0
}

def calculate_discount(price, customer_type):
    rate = DISCOUNT_RATES.get(customer_type, 1.0)
    return price * rate
```

**Safe Refactoring Checklist:**
- ✓ Tests green before refactoring
- ✓ Change one thing at a time
- ✓ Run tests after each change
- ✓ Commit after each successful refactor
- ✓ No behavior changes, only structure

## Modern Development Practices (2024/2025)

### Type-Driven Development

**Python Type Hints:**
```python
from typing import Optional, List
from dataclasses import dataclass

@dataclass
class User:
    id: str
    email: str
    name: str

class UserService:
    def create(self, email: str, name: str) -> User:
        return User(id="123", email=email, name=name)

    def find_by_email(self, email: str) -> Optional[User]:
        return None  # Minimal implementation
```

**TypeScript Strict Mode:**
```typescript
// Enable strict mode in tsconfig.json
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true
  }
}

// Implementation guided by types
interface CreateUserDto {
  email: string;
  name: string;
}

class UserService {
  create(data: CreateUserDto): User {
    // Type system enforces contract
    return { id: '123', email: data.email, name: data.name };
  }
}
```

### AI-Assisted Green Phase

**Using Copilot/AI Tools:**
1. Write test first (human-driven)
2. Let AI suggest minimal implementation
3. Verify suggestion passes tests
4. Accept if truly minimal, reject if over-engineered
5. Iterate with AI for refactoring phase

**AI Prompt Pattern:**
```
Given these failing tests:
[paste tests]

Provide the MINIMAL implementation that makes tests pass.
Do not add error handling, validation, or features beyond test requirements.
Focus on simplicity over completeness.
```

### Cloud-Native Patterns

**Local → Container → Cloud:**
```javascript
// Green Phase: Local implementation
class CacheService {
  private cache = new Map();

  get(key) { return this.cache.get(key); }
  set(key, value) { this.cache.set(key, value); }
}

// Refactor: Redis-compatible interface
class CacheService {
  constructor(private redis) {}

  async get(key) { return this.redis.get(key); }
  async set(key, value) { return this.redis.set(key, value); }
}

// Production: Distributed cache with fallback
class CacheService {
  constructor(private redis, private fallback) {}

  async get(key) {
    try {
      return await this.redis.get(key);
    } catch {
      return this.fallback.get(key);
    }
  }
}
```

### Observability-Driven Development

**Add observability hooks during green phase:**
```typescript
class OrderService {
  async createOrder(data: CreateOrderDto): Promise<Order> {
    console.log('[OrderService] Creating order', { data }); // Simple logging

    const order = { id: '123', ...data };

    console.log('[OrderService] Order created', { orderId: order.id }); // Success log

    return order;
  }
}

// Refactor: Structured logging
class OrderService {
  constructor(private logger: Logger) {}

  async createOrder(data: CreateOrderDto): Promise<Order> {
    this.logger.info('order.create.start', { data });

    const order = await this.repository.save(data);

    this.logger.info('order.create.success', {
      orderId: order.id,
      duration: Date.now() - start
    });

    return order;
  }
}
```

Tests to make pass: $ARGUMENTS
