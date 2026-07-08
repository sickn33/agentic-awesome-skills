# Refactor and Clean Code Implementation Playbook

This file contains detailed patterns, checklists, and code samples referenced by the skill.

## Instructions

### 1. Code Analysis
First, analyze the current code for:
- **Code Smells**
  - Long methods/functions (>20 lines)
  - Large classes (>200 lines)
  - Duplicate code blocks
  - Dead code and unused variables
  - Complex conditionals and nested loops
  - Magic numbers and hardcoded values
  - Poor naming conventions
  - Tight coupling between components
  - Missing abstractions

- **SOLID Violations**
  - Single Responsibility Principle violations
  - Open/Closed Principle issues
  - Liskov Substitution problems
  - Interface Segregation concerns
  - Dependency Inversion violations

- **Performance Issues**
  - Inefficient algorithms (O(n²) or worse)
  - Unnecessary object creation
  - Memory leaks potential
  - Blocking operations
  - Missing caching opportunities

### 2. Refactoring Strategy

Create a prioritized refactoring plan:

**Immediate Fixes (High Impact, Low Effort)**
- Extract magic numbers to constants
- Improve variable and function names
- Remove dead code
- Simplify boolean expressions
- Extract duplicate code to functions

**Method Extraction**
```
# Before
def process_order(order):
    # 50 lines of validation
    # 30 lines of calculation
    # 40 lines of notification

# After
def process_order(order):
    validate_order(order)
    total = calculate_order_total(order)
    send_order_notifications(order, total)
```

**Class Decomposition**
- Extract responsibilities to separate classes
- Create interfaces for dependencies
- Implement dependency injection
- Use composition over inheritance

**Pattern Application**
- Factory pattern for object creation
- Strategy pattern for algorithm variants
- Observer pattern for event handling
- Repository pattern for data access
- Decorator pattern for extending behavior

### 3. SOLID Principles in Action

Provide concrete examples of applying each SOLID principle:

**Single Responsibility Principle (SRP)**
```python
# BEFORE: Multiple responsibilities in one class
class UserManager:
    def create_user(self, data):
        # Validate data
        # Save to database
        # Send welcome email
        # Log activity
        # Update cache
        pass

# AFTER: Each class has one responsibility
class UserValidator:
    def validate(self, data): pass

class UserRepository:
    def save(self, user): pass

class EmailService:
    def send_welcome_email(self, user): pass

class UserActivityLogger:
    def log_creation(self, user): pass

class UserService:
    def __init__(self, validator, repository, email_service, logger):
        self.validator = validator
        self.repository = repository
        self.email_service = email_service
        self.logger = logger

    def create_user(self, data):
        self.validator.validate(data)
        user = self.repository.save(data)
        self.email_service.send_welcome_email(user)
        self.logger.log_creation(user)
        return user
```

**Open/Closed Principle (OCP)**
```python
# BEFORE: Modification required for new discount types
class DiscountCalculator:
    def calculate(self, order, discount_type):
        if discount_type == "percentage":
            return order.total * 0.1
        elif discount_type == "fixed":
            return 10
        elif discount_type == "tiered":
            # More logic
            pass

# AFTER: Open for extension, closed for modification
from abc import ABC, abstractmethod

class DiscountStrategy(ABC):
    @abstractmethod
    def calculate(self, order): pass

class PercentageDiscount(DiscountStrategy):
    def __init__(self, percentage):
        self.percentage = percentage

    def calculate(self, order):
        return order.total * self.percentage

class FixedDiscount(DiscountStrategy):
    def __init__(self, amount):
        self.amount = amount

    def calculate(self, order):
        return self.amount

class TieredDiscount(DiscountStrategy):
    def calculate(self, order):
        if order.total > 1000: return order.total * 0.15
        if order.total > 500: return order.total * 0.10
        return order.total * 0.05

class DiscountCalculator:
    def calculate(self, order, strategy: DiscountStrategy):
        return strategy.calculate(order)
```

**Liskov Substitution Principle (LSP)**
```typescript
// BEFORE: Violates LSP - Square changes Rectangle behavior
class Rectangle {
    constructor(protected width: number, protected height: number) {}

    setWidth(width: number) { this.width = width; }
    setHeight(height: number) { this.height = height; }
    area(): number { return this.width * this.height; }
}

class Square extends Rectangle {
    setWidth(width: number) {
        this.width = width;
        this.height = width; // Breaks LSP
    }
    setHeight(height: number) {
        this.width = height;
        this.height = height; // Breaks LSP
    }
}

// AFTER: Proper abstraction respects LSP
interface Shape {
    area(): number;
}

class Rectangle implements Shape {
    constructor(private width: number, private height: number) {}
    area(): number { return this.width * this.height; }
}

class Square implements Shape {
    constructor(private side: number) {}
    area(): number { return this.side * this.side; }
}
```

**Interface Segregation Principle (ISP)**
```java
// BEFORE: Fat interface forces unnecessary implementations
interface Worker {
    void work();
    void eat();
    void sleep();
}

class Robot implements Worker {
    public void work() { /* work */ }
    public void eat() { /* robots don't eat! */ }
    public void sleep() { /* robots don't sleep! */ }
}

// AFTER: Segregated interfaces
interface Workable {
    void work();
}

interface Eatable {
    void eat();
}

interface Sleepable {
    void sleep();
}

class Human implements Workable, Eatable, Sleepable {
    public void work() { /* work */ }
    public void eat() { /* eat */ }
    public void sleep() { /* sleep */ }
}

class Robot implements Workable {
    public void work() { /* work */ }
}
```

**Dependency Inversion Principle (DIP)**
```go
// BEFORE: High-level module depends on low-level module
type MySQLDatabase struct{}

func (db *MySQLDatabase) Save(data string) {}

type UserService struct {
    db *MySQLDatabase // Tight coupling
}

func (s *UserService) CreateUser(name string) {
    s.db.Save(name)
}

// AFTER: Both depend on abstraction
type Database interface {
    Save(data string)
}

type MySQLDatabase struct{}
func (db *MySQLDatabase) Save(data string) {}

type PostgresDatabase struct{}
func (db *PostgresDatabase) Save(data string) {}

type UserService struct {
    db Database // Depends on abstraction
}

func NewUserService(db Database) *UserService {
    return &UserService{db: db}
}

func (s *UserService) CreateUser(name string) {
    s.db.Save(name)
}
```

### 4. Complete Refactoring Scenarios

**Scenario 1: Legacy Monolith to Clean Modular Architecture**

```python
# BEFORE: 500-line monolithic file
class OrderSystem:
    def process_order(self, order_data):
        # Validation (100 lines)
        if not order_data.get('customer_id'):
            return {'error': 'No customer'}
        if not order_data.get('items'):
            return {'error': 'No items'}
        # Database operations mixed in (150 lines)
        conn = mysql.connector.connect(host='localhost', user='root')
        cursor = conn.cursor()
        cursor.execute("INSERT INTO orders...")
        # Business logic (100 lines)
        total = 0
        for item in order_data['items']:
            total += item['price'] * item['quantity']
        # Email notifications (80 lines)
        smtp = smtplib.SMTP('smtp.gmail.com')
        smtp.sendmail(...)
        # Logging and analytics (70 lines)
        log_file = open('/var/log/orders.log', 'a')
        log_file.write(f"Order processed: {order_data}")

# AFTER: Clean, modular architecture
# domain/entities.py
from dataclasses import dataclass
from typing import List
from decimal import Decimal

@dataclass
class OrderItem:
    product_id: str
    quantity: int
    price: Decimal

@dataclass
class Order:
    customer_id: str
    items: List[OrderItem]

    @property
    def total(self) -> Decimal:
        return sum(item.price * item.quantity for item in self.items)

# domain/repositories.py
from abc import ABC, abstractmethod

class OrderRepository(ABC):
    @abstractmethod
    def save(self, order: Order) -> str: pass

    @abstractmethod
    def find_by_id(self, order_id: str) -> Order: pass

# infrastructure/mysql_order_repository.py
class MySQLOrderRepository(OrderRepository):
    def __init__(self, connection_pool):
        self.pool = connection_pool

    def save(self, order: Order) -> str:
        with self.pool.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                "INSERT INTO orders (customer_id, total) VALUES (%s, %s)",
                (order.customer_id, order.total)
            )
            return cursor.lastrowid

# application/validators.py
class OrderValidator:
    def validate(self, order: Order) -> None:
        if not order.customer_id:
            raise ValueError("Customer ID is required")
        if not order.items:
            raise ValueError("Order must contain items")
        if order.total <= 0:
            raise ValueError("Order total must be positive")

# application/services.py
class OrderService:
    def __init__(
        self,
        validator: OrderValidator,
        repository: OrderRepository,
        email_service: EmailService,
        logger: Logger
    ):
        self.validator = validator
        self.repository = repository
        self.email_service = email_service
        self.logger = logger

    def process_order(self, order: Order) -> str:
        self.validator.validate(order)
        order_id = self.repository.save(order)
        self.email_service.send_confirmation(order)
        self.logger.info(f"Order {order_id} processed successfully")
        return order_id
```

**Scenario 2: Code Smell Resolution Catalog**

```typescript
// SMELL: Long Parameter List
// BEFORE
function createUser(
    firstName: string,
    lastName: string,
    email: string,
    phone: string,
    address: string,
    city: string,
    state: string,
    zipCode: string
) {}

// AFTER: Parameter Object
interface UserData {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    address: Address;
}

interface Address {
    street: string;
    city: string;
    state: string;
    zipCode: string;
}

function createUser(userData: UserData) {}

// SMELL: Feature Envy (method uses another class's data more than its own)
// BEFORE
class Order {
    calculateShipping(customer: Customer): number {
        if (customer.isPremium) {
            return customer.address.isInternational ? 0 : 5;
        }
        return customer.address.isInternational ? 20 : 10;
    }
}

// AFTER: Move method to the class it envies
class Customer {
    calculateShippingCost(): number {
        if (this.isPremium) {
            return this.address.isInternational ? 0 : 5;
        }
        return this.address.isInternational ? 20 : 10;
    }
}

class Order {
    calculateShipping(customer: Customer): number {
        return customer.calculateShippingCost();
    }
}

// SMELL: Primitive Obsession
// BEFORE
function validateEmail(email: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

let userEmail: string = "test@example.com";

// AFTER: Value Object
class Email {
    private readonly value: string;

    constructor(email: string) {
        if (!this.isValid(email)) {
            throw new Error("Invalid email format");
        }
        this.value = email;
    }

    private isValid(email: string): boolean {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    }

    toString(): string {
        return this.value;
    }
}

let userEmail = new Email("test@example.com"); // Validation automatic
```

### 5. Decision Frameworks

**Code Quality Metrics Interpretation Matrix**

| Metric | Good | Warning | Critical | Action |
|--------|------|---------|----------|--------|
| Cyclomatic Complexity | <10 | 10-15 | >15 | Split into smaller methods |
| Method Lines | <20 | 20-50 | >50 | Extract methods, apply SRP |
| Class Lines | <200 | 200-500 | >500 | Decompose into multiple classes |
| Test Coverage | >80% | 60-80% | <60% | Add unit tests immediately |
| Code Duplication | <3% | 3-5% | >5% | Extract common code |
| Comment Ratio | 10-30% | <10% or >50% | N/A | Improve naming or reduce noise |
| Dependency Count | <5 | 5-10 | >10 | Apply DIP, use facades |

**Refactoring ROI Analysis**

```
Priority = (Business Value × Technical Debt) / (Effort × Risk)

Business Value (1-10):
- Critical path code: 10
- Frequently changed: 8
- User-facing features: 7
- Internal tools: 5
- Legacy unused: 2

Technical Debt (1-10):
- Causes production bugs: 10
- Blocks new features: 8
- Hard to test: 6
- Style issues only: 2

Effort (hours):
- Rename variables: 1-2
- Extract methods: 2-4
- Refactor class: 4-8
- Architecture change: 40+

Risk (1-10):
- No tests, high coupling: 10
- Some tests, medium coupling: 5
- Full tests, loose coupling: 2
```

**Technical Debt Prioritization Decision Tree**

```
Is it causing production bugs?
├─ YES → Priority: CRITICAL (Fix immediately)
└─ NO → Is it blocking new features?
    ├─ YES → Priority: HIGH (Schedule this sprint)
    └─ NO → Is it frequently modified?
        ├─ YES → Priority: MEDIUM (Next quarter)
        └─ NO → Is code coverage < 60%?
            ├─ YES → Priority: MEDIUM (Add tests)
            └─ NO → Priority: LOW (Backlog)
```

### 6. Modern Code Quality Practices (2024-2025)

**AI-Assisted Code Review Integration**

```yaml
# .github/workflows/ai-review.yml
name: AI Code Review
on: [pull_request]

jobs:
  ai-review:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      # GitHub Copilot Autofix
      - uses: github/copilot-autofix@v1
        with:
          languages: 'python,typescript,go'

      # CodeRabbit AI Review
      - uses: coderabbitai/action@v1
        with:
          review_type: 'comprehensive'
          focus: 'security,performance,maintainability'

      # Codium AI PR-Agent
      - uses: codiumai/pr-agent@v1
        with:
          commands: '/review --pr_reviewer.num_code_suggestions=5'
```

**Static Analysis Toolchain**

```python
# pyproject.toml
[tool.ruff]
line-length = 100
select = [
    "E",   # pycodestyle errors
    "W",   # pycodestyle warnings
    "F",   # pyflakes
    "I",   # isort
    "C90", # mccabe complexity
    "N",   # pep8-naming
    "UP",  # pyupgrade
    "B",   # flake8-bugbear
    "A",   # flake8-builtins
    "C4",  # flake8-comprehensions
    "SIM", # flake8-simplify
    "RET", # flake8-return
]

[tool.mypy]
strict = true
warn_unreachable = true
warn_unused_ignores = true

[tool.coverage]
fail_under = 80
```

```javascript
// .eslintrc.json
{
  "extends": [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended-type-checked",
    "plugin:sonarjs/recommended",
    "plugin:security/recommended"
  ],
  "plugins": ["sonarjs", "security", "no-loops"],
  "rules": {
    "complexity": ["error", 10],
    "max-lines-per-function": ["error", 20],
    "max-params": ["error", 3],
    "no-loops/no-loops": "warn",
    "sonarjs/cognitive-complexity": ["error", 15]
  }
}
```

**Automated Refactoring Suggestions**

```python
# Use Sourcery for automatic refactoring suggestions
# sourcery.yaml
rules:
  - id: convert-to-list-comprehension
  - id: merge-duplicate-blocks
  - id: use-named-expression
  - id: inline-immediately-returned-variable

# Example: Sourcery will suggest
# BEFORE
result = []
for item in items:
    if item.is_active:
        result.append(item.name)

# AFTER (auto-suggested)
result = [item.name for item in items if item.is_active]
```

**Code Quality Dashboard Configuration**

```yaml
# sonar-project.properties
sonar.projectKey=my-project
sonar.sources=src
sonar.tests=tests
sonar.coverage.exclusions=**/*_test.py,**/test_*.py
sonar.python.coverage.reportPaths=coverage.xml

# Quality Gates
sonar.qualitygate.wait=true
sonar.qualitygate.timeout=300

# Thresholds
sonar.coverage.threshold=80
sonar.duplications.threshold=3
sonar.maintainability.rating=A
sonar.reliability.rating=A
sonar.security.rating=A
```

**Security-Focused Refactoring**

```python
# Use Semgrep for security-aware refactoring
# .semgrep.yml
rules:
  - id: sql-injection-risk
    pattern: execute($QUERY)
    message: Potential SQL injection
    severity: ERROR
    fix: Use parameterized queries

  - id: hardcoded-secrets
    pattern: password = "..."
    message: Hardcoded password detected
    severity: ERROR
    fix: Use environment variables or secret manager

# CodeQL security analysis
# .github/workflows/codeql.yml
- uses: github/codeql-action/analyze@v3
  with:
    category: "/language:python"
    queries: security-extended,security-and-quality
```

### 7. Refactored Implementation

Provide the complete refactored code with:

**Clean Code Principles**
- Meaningful names (searchable, pronounceable, no abbreviations)
- Functions do one thing well
- No side effects
- Consistent abstraction levels
- DRY (Don't Repeat Yourself)
- YAGNI (You Aren't Gonna Need It)

**Error Handling**
```python
# Use specific exceptions
class OrderValidationError(Exception):
    pass

class InsufficientInventoryError(Exception):
    pass

# Fail fast with clear messages
def validate_order(order):
    if not order.items:
        raise OrderValidationError("Order must contain at least one item")

    for item in order.items:
        if item.quantity <= 0:
            raise OrderValidationError(f"Invalid quantity for {item.name}")
```

**Documentation**
```python
def calculate_discount(order: Order, customer: Customer) -> Decimal:
    """
    Calculate the total discount for an order based on customer tier and order value.

    Args:
        order: The order to calculate discount for
        customer: The customer making the order

    Returns:
        The discount amount as a Decimal

    Raises:
        ValueError: If order total is negative
    """
```

### 8. Testing Strategy

Generate comprehensive tests for the refactored code:

**Unit Tests**
```python
class TestOrderProcessor:
    def test_validate_order_empty_items(self):
        order = Order(items=[])
        with pytest.raises(OrderValidationError):
            validate_order(order)

    def test_calculate_discount_vip_customer(self):
        order = create_test_order(total=1000)
        customer = Customer(tier="VIP")
        discount = calculate_discount(order, customer)
        assert discount == Decimal("100.00")  # 10% VIP discount
```

**Test Coverage**
- All public methods tested
- Edge cases covered
- Error conditions verified
- Performance benchmarks included

### 9. Before/After Comparison

Provide clear comparisons showing improvements:

**Metrics**
- Cyclomatic complexity reduction
- Lines of code per method
- Test coverage increase
- Performance improvements

**Example**
```
Before:
- processData(): 150 lines, complexity: 25
- 0% test coverage
- 3 responsibilities mixed

After:
- validateInput(): 20 lines, complexity: 4
- transformData(): 25 lines, complexity: 5
- saveResults(): 15 lines, complexity: 3
- 95% test coverage
- Clear separation of concerns
```

### 10. Migration Guide

If breaking changes are introduced:

**Step-by-Step Migration**
1. Install new dependencies
2. Update import statements
3. Replace deprecated methods
4. Run migration scripts
5. Execute test suite

**Backward Compatibility**
```python
# Temporary adapter for smooth migration
class LegacyOrderProcessor:
    def __init__(self):
        self.processor = OrderProcessor()

    def process(self, order_data):
        # Convert legacy format
        order = Order.from_legacy(order_data)
        return self.processor.process(order)
```

### 11. Performance Optimizations

Include specific optimizations:

**Algorithm Improvements**
```python
# Before: O(n²)
for item in items:
    for other in items:
        if item.id == other.id:
            # process

# After: O(n)
item_map = {item.id: item for item in items}
for item_id, item in item_map.items():
    # process
```

**Caching Strategy**
```python
from functools import lru_cache

@lru_cache(maxsize=128)
def calculate_expensive_metric(data_id: str) -> float:
    # Expensive calculation cached
    return result
```

### 12. Code Quality Checklist

Ensure the refactored code meets these criteria:

- [ ] All methods < 20 lines
- [ ] All classes < 200 lines
- [ ] No method has > 3 parameters
- [ ] Cyclomatic complexity < 10
- [ ] No nested loops > 2 levels
- [ ] All names are descriptive
- [ ] No commented-out code
- [ ] Consistent formatting
- [ ] Type hints added (Python/TypeScript)
- [ ] Error handling comprehensive
- [ ] Logging added for debugging
- [ ] Performance metrics included
- [ ] Documentation complete
- [ ] Tests achieve > 80% coverage
- [ ] No security vulnerabilities
- [ ] AI code review passed
- [ ] Static analysis clean (SonarQube/CodeQL)
- [ ] No hardcoded secrets

## Severity Levels

Rate issues found and improvements made:

**Critical**: Security vulnerabilities, data corruption risks, memory leaks
**High**: Performance bottlenecks, maintainability blockers, missing tests
**Medium**: Code smells, minor performance issues, incomplete documentation
**Low**: Style inconsistencies, minor naming issues, nice-to-have features

## Output Format

1. **Analysis Summary**: Key issues found and their impact
2. **Refactoring Plan**: Prioritized list of changes with effort estimates
3. **Refactored Code**: Complete implementation with inline comments explaining changes
4. **Test Suite**: Comprehensive tests for all refactored components
5. **Migration Guide**: Step-by-step instructions for adopting changes
6. **Metrics Report**: Before/after comparison of code quality metrics
7. **AI Review Results**: Summary of automated code review findings
8. **Quality Dashboard**: Link to SonarQube/CodeQL results

Focus on delivering practical, incremental improvements that can be adopted immediately while maintaining system stability.
