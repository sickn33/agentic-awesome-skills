# Building Generic Components

Reducing nesting and complexity is achieved by breaking down views into generic, reusable components.

## 🧊 Generic Components

Instead of building large, complex views, extract recurring patterns into small `UserControl`s.

### Example: A generic "Summary Item"
Instead of repeating a `Grid` with labels and values:

```xml
<!-- ❌ BAD: Repeated Grid -->
<Grid ColumnDefinitions="*,Auto">
   <TextBlock Text="Total:" />
   <TextBlock Grid.Column="1" Text="{Binding Total}" />
</Grid>
```

Create a generic component (or use `EdgePanel` with a Style):

```xml
<!-- ✅ GOOD: Use a specialized control or style -->
<EdgePanel StartContent="Total:" EndContent="{Binding Total}" Classes="SummaryItem" />
```

## 📉 Flattening Layouts

Avoid deep nesting. Deeply nested XAML is hard to read and can impact performance.

- **StackPanel vs Grid**: Use `StackPanel` (with `Spacing`) for simple linear layouts.
- **EdgePanel**: Great for "Label - Value" or "Icon - Text - Action" rows.
- **UniformGrid**: Use for grids where all cells are the same size.

## 🔧 Component Granularity

- **Atomical**: Small controls like custom buttons or icons.
- **Molecular**: Groups of atoms like a `HeaderedContainer` with specific content.
- **Organisms**: Higher-level sections of a page.

Aim for components that are generic enough to be reused but specific enough to simplify the parent view significantly.
