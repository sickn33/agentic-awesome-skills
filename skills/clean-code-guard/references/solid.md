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

### Smells to flag

- One class contains methods touching unrelated subsystems
- Methods on the class serve disjoint stakeholder groups
- Git history shows two distinct clusters of co-changing methods inside one class

---

## O — Open/Closed Principle

**Definition.** *"Software entities (classes, modules, functions) should be open for extension, but closed for modification."*

### Smells to flag

- Branch dispatching on a type tag or runtime type check
- Adding a feature requires modifying N existing files
- `match`/`enum` switches that cross module boundaries

---

## L — Liskov Substitution Principle

**Definition (Liskov & Wing, 1994).** *"If for each object o1 of type S there is an object o2 of type T such that for all programs P defined in terms of T, the behavior of P is unchanged when o1 is substituted for o2, then S is a subtype of T."*

### Smells to flag

- A subclass overrides a method to signal "not implemented"
- A subclass strengthens preconditions
- A subclass weakens postconditions
- Callers perform runtime subtype checks

---

## I — Interface Segregation Principle

**Definition.** *"Clients should not be forced to depend on methods they do not use."*

### Smells to flag

- A `Service` / `Manager` / `Repository` interface with 10+ methods
- Implementations that stub half the methods
- One mock object reconfigured differently across tests

---

## D — Dependency Inversion Principle

**Definition (verbatim, two clauses).**
*(a) High-level modules should not depend on low-level modules. Both should depend on abstractions.*
*(b) Abstractions should not depend on details. Details should depend on abstractions.*

### Smells to flag

- A high-level module imports a concrete low-level client
- A constructor that `new`/instantiates concrete collaborators
- Abstractions defined in the low-level package
- Function signatures typed against concrete classes

---

## How AI-generated code typically breaks SOLID

1. **God-module** from "do everything in one file" prompts — SRP + DIP + usually OCP.
2. **Type-tag dispatch chains** — OCP.
3. **Unsupported-operation stubs in subclasses** — LSP + ISP.
4. **Concrete SDK/client imports at module load time** — DIP.
5. **Mega-`Service` interfaces** — ISP, usually SRP too.
6. **Silent precondition strengthening on override** — breaks LSP.
7. **Invariant-breaking "convenience" subclasses** — LSP.
8. **Inverted ownership of abstractions** — Cosmetic DIP fix.

---

## Self-check for SOLID

Before you ship code:

1. (SRP) Does any class in the diff answer to more than one stakeholder group?
2. (OCP) Does any change require a type-tag branch added to an existing function?
3. (LSP) Does any new subclass signal "not implemented", tighten preconditions, or weaken postconditions?
4. (ISP) Does any interface have a method your concrete client doesn't use?
5. (DIP) Does the high-level package import the low-level concrete?
