# Interactions and Logic

To keep XAML clean and maintainable, minimize logic in views and avoid excessive use of converters.

## 🎭 Xaml.Interaction.Behaviors

Use `Interaction.Behaviors` to handle UI-related logic that doesn't belong in the ViewModel, such as focus management, animations, or specialized event handling.

```xml
<TextBox Text="{Binding Address}">
    <Interaction.Behaviors>
        <UntouchedClassBehavior />
    </Interaction.Behaviors>
</TextBox>
```

### Why use Behaviors?
- **Encapsulation**: UI logic is contained in a reusable behavior class.
- **Clean XAML**: Avoids code-behind and complex XAML triggers.
- **Testability**: Behaviors can be tested independently of the View.

## 🚫 Avoiding Converters

Converters often lead to "magical" logic hidden in XAML. Whenever possible, prefer:

1.  **ViewModel Properties**: Let the ViewModel provide the final data format (e.g., a `string` formatted for display).
2.  **MultiBinding**: Use for simple logic combinations (And/Or) directly in XAML.
3.  **Behaviors**: For more complex interactions that involve state or events.

### When to use Converters?
Only use them when the conversion is purely visual and highly reusable across different contexts (e.g., `BoolToOpacityConverter`).

## 🧩 Simplified Interactions

If you find yourself needing a complex converter or behavior, consider if the component can be simplified or if the data model can be adjusted to make the view binding more direct.
