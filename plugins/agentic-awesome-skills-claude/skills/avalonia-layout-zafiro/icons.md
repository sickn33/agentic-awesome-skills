# Icon Usage

`Zafiro.Avalonia` simplifies icon management using a specialized markup extension and styling options.

## 🛠️ IconExtension

Use the `{Icon}` markup extension to easily include icons from libraries like FontAwesome.

```xml
<!-- Positional parameter -->
<Button Content="{Icon fa-wallet}" />

<!-- Named parameter -->
<ContentControl Content="{Icon Source=fa-gear}" />
```

## 🎨 IconOptions

`IconOptions` allows you to customize icons without manually wrapping them in other controls. It's often used in styles to provide a consistent look.

```xml
<Style Selector="HeaderedContainer /template/ ContentPresenter#Header EdgePanel /template/ ContentControl#StartContent">
    <Setter Property="IconOptions.Size" Value="20" />
    <Setter Property="IconOptions.Fill" Value="{DynamicResource Accent}" />
    <Setter Property="IconOptions.Padding" Value="10" />
    <Setter Property="IconOptions.CornerRadius" Value="10" />
</Style>
```

### Common Properties:
- `IconOptions.Size`: Sets the width and height of the icon.
- `IconOptions.Fill`: The color/brush of the icon.
- `IconOptions.Background`: Background brush for the icon container.
- `IconOptions.Padding`: Padding inside the icon container.
- `IconOptions.CornerRadius`: Corner radius if a background is used.

## 📁 Shared Icon Resources

Define icons as resources for reuse across the application.

```xml
<ResourceDictionary xmlns="https://github.com/avaloniaui">
    <Icon x:Key="fa-wallet" Source="fa-wallet" />
</ResourceDictionary>
```

Then use them with `StaticResource` if they are already defined:

```xml
<Button Content="{StaticResource fa-wallet}" />
```

However, the `{Icon ...}` extension is usually preferred for its brevity and ability to create new icon instances on the fly.
