---
name: unreal-engine-cpp-pro
description: "Expert guide for Unreal Engine 5.x C++ development, covering UObject hygiene, performance patterns, and best practices."
risk: safe
source: self
date_added: "2026-02-27"
---

# Unreal Engine C++ Pro

This skill provides expert-level guidelines for developing with Unreal Engine 5 using C++. It focuses on writing robust, performant, and standard-compliant code.

## When to Use
Use this skill when:
- Developing C++ code for Unreal Engine 5.x projects
- Writing Actors, Components, or UObject-derived classes
- Optimizing performance-critical code in Unreal Engine
- Debugging memory leaks or garbage collection issues
- Implementing Blueprint-exposed functionality
- Following Epic Games' coding standards and conventions
- Working with Unreal's reflection system (UCLASS, USTRUCT, UFUNCTION)
- Managing asset loading and soft references

Do not use this skill when:
- Working with Blueprint-only projects (no C++ code)
- Developing for Unreal Engine versions prior to 5.x
- Working on non-Unreal game engines
- The task is unrelated to Unreal Engine development

## Core Principles

1.  **UObject & Garbage Collection**:
    *   Always use `UPROPERTY()` for `UObject*` member variables to ensure they are tracked by the Garbage Collector (GC).
    *   Use `TStrongObjectPtr<>` if you need to keep a root reference outside of a UObject graph, but prefer `addToRoot()` generally.
    *   Understand the `IsValid()` check vs `nullptr`. `IsValid()` handles pending kill state safely.

2.  **Unreal Reflection System**:
    *   Use `UCLASS()`, `USTRUCT()`, `UENUM()`, `UFUNCTION()` to expose types to the reflection system and Blueprints.
    *   Minimize `BlueprintReadWrite` when possible; prefer `BlueprintReadOnly` for state that shouldn't be trampled by logic in UI/Level BPs.

3.  **Performance First**:
    *   **Tick**: Disable Ticking (`bCanEverTick = false`) by default. Only enable it if absolutely necessary. Prefer timers (`GetWorldTimerManager()`) or event-driven logic.
    *   **Casting**: Avoid `Cast<T>()` in hot loops. Cache references in `BeginPlay`.
    *   **Structs vs Classes**: Use `F` structs for data-heavy, non-UObject types to reduce overhead.

## Naming Conventions (Strict)

Follow Epic Games' coding standard:

*   **Templates**: Prefix with `T` (e.g., `TArray`, `TMap`).
*   **UObject**: Prefix with `U` (e.g., `UCharacterMovementComponent`).
*   **AActor**: Prefix with `A` (e.g., `AMyGameMode`).
*   **SWidget**: Prefix with `S` (Slate widgets).
*   **Structs**: Prefix with `F` (e.g., `FVector`).
*   **Enums**: Prefix with `E` (e.g., `EWeaponState`).
*   **Interfaces**: Prefix with `I` (e.g., `IInteractable`).
*   **Booleans**: Prefix with `b` (e.g., `bIsDead`).

## Common Patterns

### 1. Robust Component Lookup
Avoid `GetComponentByClass` in `Tick`. Do it in `PostInitializeComponents` or `BeginPlay`.

```cpp
void AMyCharacter::PostInitializeComponents() {
    Super::PostInitializeComponents();
    HealthComp = FindComponentByClass<UHealthComponent>();
    check(HealthComp); // Fail hard in dev if missing
}
```

### 2. Interface Implementation
Use interfaces to decouple systems (e.g., Interaction system).

```cpp
// Interface call check
if (TargetActor->Implements<UInteractable>()) {
    IInteractable::Execute_OnInteract(TargetActor, this);
}
```

### 3. Async Loading (Soft References)
Avoid hard references (`UPROPERTY(EditDefaultsOnly) TSubclassOf<AActor>`) for massive assets which force load orders. Use `TSoftClassPtr` or `TSoftObjectPtr`.

```cpp
UPROPERTY(EditAnywhere, BlueprintReadWrite)
TSoftClassPtr<AWeapon> WeaponClassToLoad;

void AMyCharacter::Equip() {
    if (WeaponClassToLoad.IsPending()) {
        WeaponClassToLoad.LoadSynchronous(); // Or use StreamableManager for async
    }
}
```

## Debugging

*   **Logging**: Use `UE_LOG` with custom categories.
    ```cpp
    DEFINE_LOG_CATEGORY_STATIC(LogMyGame, Log, All);
    UE_LOG(LogMyGame, Warning, TEXT("Health is low: %f"), CurrentHealth);
    ```
*   **Screen Messages**:
    ```cpp
    if (GEngine) GEngine->AddOnScreenDebugMessage(-1, 5.f, FColor::Red, TEXT("Died!"));
    ```
*   **Visual Logger**: extremely useful for AI debugging. Implement `IVisualLoggerDebugSnapshotInterface`.

## Checklist before PR

- [ ] Does this Actor need to Tick? Can it be a Timer?
- [ ] Are all `UObject*` members wrapped in `UPROPERTY`?
- [ ] Are hard references (TSubclassOf) causing load chains? Can they be Soft Ptrs?
- [ ] Did you clean up verified delegates in `EndPlay`?

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.
