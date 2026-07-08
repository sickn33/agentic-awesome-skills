# Composition & Mapping

Ensuring your ViewModels are correctly instantiated and mapped to their corresponding Views is crucial for a maintainable application.

## ViewModel-to-View Mapping

Zafiro uses the `DataTypeViewLocator` to automatically map ViewModels to Views based on their data type.

### Integration in App.axaml

Register the `DataTypeViewLocator` in your application's data templates:

```xml
<Application.DataTemplates>
    <DataTypeViewLocator />
    <DataTemplateInclude Source="avares://Zafiro.Avalonia/DataTemplates.axaml" />
</Application.DataTemplates>
```

### Registration

Mappings can be registered globally or locally. Common practice in Zafiro projects is to use naming conventions or explicit registrations made by source generators.

## Composition Root

Use a central `CompositionRoot` to manage dependency injection and service registration.

```csharp
public static class CompositionRoot
{
    public static IShellViewModel CreateMainViewModel(Control topLevelView)
    {
        var services = new ServiceCollection();
        
        services
            .AddViewModels()
            .AddUIServices(topLevelView);
            
        var serviceProvider = services.BuildServiceProvider();
        return serviceProvider.GetRequiredService<IShellViewModel>();
    }
}
```

### Registering ViewModels

Register ViewModels with appropriate scopes (Transient, Scoped, or Singleton).

```csharp
public static IServiceCollection AddViewModels(this IServiceCollection services)
{
    return services
        .AddTransient<IHomeSectionViewModel, HomeSectionSectionViewModel>()
        .AddSingleton<IShellViewModel, ShellViewModel>();
}
```

## View Injection

Use the `Connect` helper (if available) or manual instantiation in `OnFrameworkInitializationCompleted`:

```csharp
public override void OnFrameworkInitializationCompleted()
{
    this.Connect(
        () => new ShellView(),
        view => CompositionRoot.CreateMainViewModel(view),
        () => new MainWindow());

    base.OnFrameworkInitializationCompleted();
}
```

> [!TIP]
> Use `ActivatorUtilities.CreateInstance` when you need to manually instantiate a class while still resolving its dependencies from the `IServiceProvider`.
