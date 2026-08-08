# SOLID — the five principles

Source: Robert C. Martin. The five principles were collected on Uncle Bob's "Principles of OOD" page on objectmentor.com (mirrored at butunclebob.com) and updated on blog.cleancoder.com. Original papers from *C++ Report* circa 1995–1996.

## Contents

- S: Single Responsibility Principle
- O: Open/Closed Principle
- L: Liskov Substitution Principle
- I: Interface Segregation Principle
- D: Dependency Inversion Principle
- How AI-generated code typically breaks SOLID
- Self-check for SOLID

---

## S — Single Responsibility Principle

**Definition (Martin 2014, hardened from the original).** *"A module should be responsible to one, and only one, actor."*

Older form: "A class should have only one reason to change."

Source: blog.cleancoder.com — SRP, 2014.

### Why

The axis is *people*. Different stakeholders (Accounting, HR, DBA) want different things from the same class. When their needs change, they edit the same file, conflict, and break each other.

### Smells to flag

- One class contains methods touching unrelated subsystems (persistence + presentation + business rules).
- Methods on the class serve disjoint stakeholder groups.
- Git history shows two distinct clusters of co-changing methods inside one class.

### Common misinterpretation

*"A class should do one thing."* No. SRP is about **cohesion around an actor**, not method count. A 12-method `InvoiceRepository` answerable only to the data-access layer satisfies SRP. A 3-method class with one HTTP call, one Jinja render, and one DB write does not.

### Bad

```text
EmployeeReport
  calculatePay()    // Accounting
  reportHours()     // HR
  save()            // Data storage owner
```

### Good

```text
PayCalculator       // Accounting
HoursReporter       // HR
EmployeeRepository  // Data storage owner
```

---

## O — Open/Closed Principle

**Definition.** *"Software entities (classes, modules, functions) should be open for extension, but closed for modification."*

Originally Bertrand Meyer (1988, *Object-Oriented Software Construction*); Martin refocused it on polymorphic abstraction rather than implementation inheritance.

Source: blog.cleancoder.com — OCP, 2014; Martin's 1996 paper PDF (Duke mirror).

### Why

Protect stable high-level policy from churn in low-level variants. New behavior should arrive as new code, not edits to working code.

### Smells to flag

- Branch dispatching on a type tag or runtime type check — every new type requires editing the same function.
- Adding a feature requires modifying N existing files instead of adding one.
- `match`/`enum` switches that cross module boundaries (policy reaching into details).

### Common misinterpretation

*"Never modify code."* The principle is that *modules containing high-level policy* should not be modified to accommodate new variants. Leaf code changes freely.

### Bad

```text
export(record, kind):
  if kind == "pdf":  return toPdf(record)
  if kind == "csv":  return toCsv(record)
  if kind == "json": return toJson(record)
  // adding "xml" requires editing this function
```

### Good

```text
exporters = {
  "pdf":  toPdf,
  "csv":  toCsv,
  "json": toJson,
}

export(record, kind):
  return exporters[kind](record)
// adding "xml" is one line in the table
```

---

## L — Liskov Substitution Principle

**Definition (Liskov & Wing, 1994).** *"If for each object o1 of type S there is an object o2 of type T such that for all programs P defined in terms of T, the behavior of P is unchanged when o1 is substituted for o2, then S is a subtype of T."*

Source: Martin's LSP paper PDF (LaBRI mirror).

### Why

Substitutability. Callers written against a base type must continue to work when handed a subtype — otherwise polymorphism leaks abstraction.

### Smells to flag

- A subclass overrides a method to signal "not implemented" or "unsupported operation."
- A subclass **strengthens preconditions** (rejects inputs the parent accepts).
- A subclass **weakens postconditions** (returns something the parent guarantees against).
- Callers perform runtime subtype checks to decide whether to call a method.

### Common misinterpretation

*"Subclasses must have the same methods."* That's signature compatibility, which is just type-checking. LSP is **behavioral**:
- Preconditions can only **weaken** in the subtype.
- Postconditions and invariants can only **strengthen**.
- Parameter types are contravariant; return types covariant.

### The Rectangle/Square classic

```text
Rectangle
  setWidth(width)
  setHeight(height)
  area()

Square extends Rectangle
  setWidth(width):
    this.width = width
    this.height = width   // invariant: width == height
  setHeight(height):
    this.width = height   // invariant: width == height
    this.height = height
```
A caller holding a `Rectangle` reference does `r.set_width(5); r.set_height(4); assert r.area() == 20`. With a `Square`, the assertion fails — LSP violated.

The fix is *not* to fix the methods. The fix is that `Square is-not-a Rectangle` in the behavioral sense. Compose, don't inherit.

---

## I — Interface Segregation Principle

**Definition.** *"Clients should not be forced to depend on methods they do not use."* Equivalently: many client-specific interfaces beat one general-purpose interface.

Source: Martin's 1996 ISP paper, catalogued at butunclebob.com/ArticleS.UncleBob.PrinciplesOfOod.

### Why

Fat interfaces create transitive coupling. Clients are dragged into recompiles and test-fixtures for methods they never call.

### Smells to flag

- A `Service` / `Manager` / `Repository` interface with 10+ methods, where any given caller uses one or two.
- Implementations that stub half the methods with no-op bodies, null/empty placeholders, or unimplemented failures (usually co-occurs with an LSP violation).
- One mock object reconfigured differently across tests because the interface is too broad.

### Common misinterpretation

*"Make interfaces small."* As a count rule, no. ISP is **client-centric** — segregation is driven by *the set of methods a particular client uses*, not by an arbitrary method-count ceiling. Two clients with identical method needs can share one interface even if it has 20 methods.

### Bad

```text
UserService
  create(...)
  read(...)
  update(...)
  delete(...)
  email(...)
  notify(...)
  audit(...)
  export(...)
```
The audit logger only needs `audit`. It now depends transitively on the email and export subsystems.

### Good

```text
UserAuditor
  audit(...)

UserNotifier
  notify(...)
```

Implementations can satisfy multiple protocols. Callers depend only on what they use.

---

## D — Dependency Inversion Principle

**Definition (verbatim, two clauses).**
*(a) High-level modules should not depend on low-level modules. Both should depend on abstractions.*
*(b) Abstractions should not depend on details. Details should depend on abstractions.*

Source: Martin's 1996 *C++ Report* paper, archived at Wayback / objectmentor.com.

### Why

Control the direction of the import graph. Policy must not transitively `import` mechanism, or policy becomes un-reusable and untestable.

### Smells to flag

- A high-level module imports a concrete low-level client inside business logic.
- A constructor that `new`/instantiates concrete collaborators instead of accepting them as parameters.
- Abstractions defined in the *low-level* package (the interface lives next to its database or service implementation) — ownership reversed. The interface should live in the **client's** package.
- Function signatures typed against concrete classes instead of interfaces, protocols, or abstract contracts.

### Common misinterpretation

*"DIP means use a DI container."* No. DIP is about **the direction of source-code dependencies**. You can satisfy DIP with plain constructor injection and no framework; you can violate DIP while using Spring.

### Bad

```text
// billing/charge — high-level policy
import SqlUserRepository  // concrete import

chargeUser(userId, amount):
  repository = new SqlUserRepository()  // concrete instantiation
  user = repository.get(userId)
  ...
```

### Good

```text
// billing/user-repository — abstraction lives WITH the client (billing)
UserRepository
  get(userId) -> User

// billing/charge
chargeUser(userId, amount, repository: UserRepository):
  user = repository.get(userId)
  ...

// sql/user-repository — detail depends on the abstraction
SqlUserRepository satisfies UserRepository
  get(userId) -> User
```

The import arrows go: `sql → billing` (detail → abstraction). They do not go `billing → sql`.

---

## How AI-generated code typically breaks SOLID

Mapped to the principle each breaks:

1. **God-module** from "do everything in one file" prompts — SRP + DIP + usually OCP.
2. **Type-tag dispatch chains** (`if kind == "pdf": ...`) — OCP.
3. **Unsupported-operation stubs in subclasses** when asked to "implement only the methods we need" — LSP + ISP.
4. **Concrete SDK/client imports at module load time** — DIP, hard to test without patching the runtime.
5. **Mega-`Service` interfaces** with create/read/update/delete/email/notify/audit/export — ISP, usually SRP too.
6. **Silent precondition strengthening on override** — defensive-looking, breaks LSP because callers holding the base type now crash on previously-valid inputs.
7. **Invariant-breaking "convenience" subclasses** (e.g., `ReadOnlyList(list)` overriding `append` to no-op) — LSP.
8. **Inverted ownership of abstractions** — putting the interface/protocol/abstract contract in the same file as the concrete implementation. Cosmetic DIP fix, real dependency graph unchanged.

---

## Self-check for SOLID

Before you ship code:

1. (SRP) Does any class in the diff answer to more than one stakeholder group?
2. (OCP) Does any change require a type-tag branch added to an existing function? Could it be data-driven (registry/strategy) instead?
3. (LSP) Does any new subclass signal "not implemented", tighten preconditions, or weaken postconditions?
4. (ISP) Does any interface have a method your concrete client doesn't use?
5. (DIP) Does the high-level package import the low-level concrete? Where do new abstractions live — with the client or with the implementation?
