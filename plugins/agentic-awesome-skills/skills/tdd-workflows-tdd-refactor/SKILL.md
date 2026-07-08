---
name: tdd-workflows-tdd-refactor
description: "Use when working with tdd workflows tdd refactor"
risk: unknown
source: community
date_added: "2026-02-27"
---

## Use this skill when

- Working on tdd workflows tdd refactor tasks or workflows
- Needing guidance, best practices, or checklists for tdd workflows tdd refactor

## Do not use this skill when

- The task is unrelated to tdd workflows tdd refactor
- You need a different domain or tool outside this scope

## Instructions

- Clarify goals, constraints, and required inputs.
- Apply relevant best practices and validate outcomes.
- Provide actionable steps and verification.
- If detailed examples are required, open `resources/implementation-playbook.md`.

Refactor code with confidence using comprehensive test safety net:

[Extended thinking: This tool uses the tdd-orchestrator agent (opus model) for sophisticated refactoring while maintaining all tests green. It applies design patterns, improves code quality, and optimizes performance with the safety of comprehensive test coverage.]

## Usage

Use Task tool with subagent_type="tdd-orchestrator" to perform safe refactoring.

Prompt: "Refactor this code while keeping all tests green: $ARGUMENTS. Apply TDD refactor phase:

## Core Process

**1. Pre-Assessment**
- Run tests to establish green baseline
- Analyze code smells and test coverage
- Document current performance metrics
- Create incremental refactoring plan

**2. Code Smell Detection**
- Duplicated code → Extract methods/classes
- Long methods → Decompose into focused functions
- Large classes → Split responsibilities
- Long parameter lists → Parameter objects
- Feature Envy → Move methods to appropriate classes
- Primitive Obsession → Value objects
- Switch statements → Polymorphism
- Dead code → Remove

**3. Design Patterns**
- Apply Creational (Factory, Builder, Singleton)
- Apply Structural (Adapter, Facade, Decorator)
- Apply Behavioral (Strategy, Observer, Command)
- Apply Domain (Repository, Service, Value Objects)
- Use patterns only where they add clear value

**4. SOLID Principles**
- Single Responsibility: One reason to change
- Open/Closed: Open for extension, closed for modification
- Liskov Substitution: Subtypes substitutable
- Interface Segregation: Small, focused interfaces
- Dependency Inversion: Depend on abstractions

**5. Refactoring Techniques**
- Extract Method/Variable/Interface
- Inline unnecessary indirection
- Rename for clarity
- Move Method/Field to appropriate classes
- Replace Magic Numbers with constants
- Encapsulate fields
- Replace Conditional with Polymorphism
- Introduce Null Object

**6. Performance Optimization**
- Profile to identify bottlenecks
- Optimize algorithms and data structures
- Implement caching where beneficial
- Reduce database queries (N+1 elimination)
- Lazy loading and pagination
- Always measure before and after

**7. Incremental Steps**
- Make small, atomic changes
- Run tests after each modification
- Commit after each successful refactoring
- Keep refactoring separate from behavior changes
- Use scaffolding when needed

**8. Architecture Evolution**
- Layer separation and dependency management
- Module boundaries and interface definition
- Event-driven patterns for decoupling
- Database access pattern optimization

**9. Safety Verification**
- Run full test suite after each change
- Performance regression testing
- Mutation testing for test effectiveness
- Rollback plan for major changes

**10. Advanced Patterns**
- Strangler Fig: Gradual legacy replacement
- Branch by Abstraction: Large-scale changes
- Parallel Change: Expand-contract pattern
- Mikado Method: Dependency graph navigation

## Output Requirements

- Refactored code with improvements applied
- Test results (all green)
- Before/after metrics comparison
- Applied refactoring techniques list
- Performance improvement measurements
- Remaining technical debt assessment

## Safety Checklist

Before committing:
- ✓ All tests pass (100% green)
- ✓ No functionality regression
- ✓ Performance metrics acceptable
- ✓ Code coverage maintained/improved
- ✓ Documentation updated

## Recovery Protocol

If tests fail:
- Immediately revert last change
- Identify breaking refactoring
- Apply smaller incremental changes
- Use version control for safe experimentation

## Example: Extract Method Pattern

**Before:**
```typescript
class OrderProcessor {
  processOrder(order: Order): ProcessResult {
    // Validation
    if (!order.customerId || order.items.length === 0) {
      return { success: false, error: "Invalid order" };
    }

    // Calculate totals
    let subtotal = 0;
    for (const item of order.items) {
      subtotal += item.price * item.quantity;
    }
    let total = subtotal + (subtotal * 0.08) + (subtotal > 100 ? 0 : 15);

    // Process payment...
    // Update inventory...
    // Send confirmation...
  }
}
```

**After:**
```typescript
class OrderProcessor {
  async processOrder(order: Order): Promise<ProcessResult> {
    const validation = this.validateOrder(order);
    if (!validation.isValid) return ProcessResult.failure(validation.error);

    const orderTotal = OrderTotal.calculate(order);
    const inventoryCheck = await this.inventoryService.checkAvailability(order.items);
    if (!inventoryCheck.available) return ProcessResult.failure(inventoryCheck.reason);

    await this.paymentService.processPayment(order.paymentMethod, orderTotal.total);
    await this.inventoryService.reserveItems(order.items);
    await this.notificationService.sendOrderConfirmation(order, orderTotal);

    return ProcessResult.success(order.id, orderTotal.total);
  }

  private validateOrder(order: Order): ValidationResult {
    if (!order.customerId) return ValidationResult.invalid("Customer ID required");
    if (order.items.length === 0) return ValidationResult.invalid("Order must contain items");
    return ValidationResult.valid();
  }
}
```

**Applied:** Extract Method, Value Objects, Dependency Injection, Async patterns

Code to refactor: $ARGUMENTS"

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.
