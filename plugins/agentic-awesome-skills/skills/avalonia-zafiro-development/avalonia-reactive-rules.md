# Avalonia, Zafiro & Reactive Rules

## Avalonia UI Rules

- **Strict Avalonia**: Never use `System.Drawing`; always use Avalonia types.
- **Pure ViewModels**: ViewModels must **never** reference Avalonia types.
- **Bindings Over Code-Behind**: Logic should be driven by bindings.
- **DataTemplates**: Prefer explicit `DataTemplate`s and typed `DataContext`s.
- **VisualStates**: Avoid using `VisualStates` unless absolutely required.

## Zafiro Guidelines

- **Prefer Abstractions**: Always look for existing Zafiro helpers, extension methods, and abstractions before re-implementing logic.
- **Validation**: Use Zafiro's `ValidationRule` and validation extensions instead of ad-hoc reactive logic.

## DynamicData & Reactive Rules

### The Mandatory Approach

- **Operator Preference**: Always prefer **DynamicData** operators (`Connect`, `Filter`, `Transform`, `Sort`, `Bind`, `DisposeMany`) over plain Rx operators when working with collections.
- **Readable Pipelines**: Build and maintain pipelines as a single, readable chain.
- **Lifecycle**: Use `DisposeWith` for lifecycle management.
- **Minimal Subscriptions**: Subscriptions should be minimal, centralized, and strictly for side-effects.

### Forbidden Anti-Patterns

- **Ad-hoc Sources**: Do NOT create new `SourceList` / `SourceCache` on the fly for local problems.
- **Logic in Subscribe**: Do NOT place business logic inside `Subscribe`.
- **Operator Mismatch**: Do NOT use `System.Reactive` operators if a DynamicData equivalent exists.

### Canonical Patterns

**Validation of Dynamic Collections:**
```csharp
this.ValidationRule(
        StagesSource
            .Connect()
            .FilterOnObservable(stage => stage.IsValid)
            .IsEmpty(),
        b => !b,
        _ => "Stages are not valid")
    .DisposeWith(Disposables);
```

**Filtering Nulls:**
Use `WhereNotNull()` in reactive pipelines.
```csharp
this.WhenAnyValue(x => x.DurationPreset).WhereNotNull()
```
