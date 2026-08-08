# Zafiro Reactive Shortcuts

Use these Zafiro extension methods to replace standard, more verbose Reactive and DynamicData patterns.

## General Observable Helpers

| Standard Pattern | Zafiro Shortcut |
| :--- | :--- |
| `Replay(1).RefCount()` | `ReplayLastActive()` |
| `Select(_ => Unit.Default)` | `ToSignal()` |
| `Select(b => !b)` | `Not()` |
| `Where(b => b).ToSignal()` | `Trues()` |
| `Where(b => !b).ToSignal()` | `Falses()` |
| `Select(x => x is null)` | `Null()` |
| `Select(x => x is not null)` | `NotNull()` |
| `Select(string.IsNullOrWhiteSpace)` | `NullOrWhitespace()` |
| `Select(s => !string.IsNullOrWhiteSpace(s))` | `NotNullOrEmpty()` |

## Result & Maybe Extensions

| Standard Pattern | Zafiro Shortcut |
| :--- | :--- |
| `Where(r => r.IsSuccess).Select(r => r.Value)` | `Successes()` |
| `Where(r => r.IsFailure).Select(r => r.Error)` | `Failures()` |
| `Where(m => m.HasValue).Select(m => m.Value)` | `Values()` |
| `Where(m => !m.HasValue).ToSignal()` | `Empties()` |

## Lifecycle Management

| Description | Method |
| :--- | :--- |
| Dispose previous item before emitting new one | `DisposePrevious()` |
| Manage lifecycle within a disposable | `DisposeWith(disposables)` |

## Command & Interaction

| Description | Method |
| :--- | :--- |
| Add metadata/text to a ReactiveCommand | `Enhance(text, name)` |
| Automatically show errors in UI | `HandleErrorsWith(notificationService)` |

> [!TIP]
> Always check `Zafiro.Reactive.ObservableMixin` and `Zafiro.CSharpFunctionalExtensions.ObservableExtensions` before writing custom Rx logic.
