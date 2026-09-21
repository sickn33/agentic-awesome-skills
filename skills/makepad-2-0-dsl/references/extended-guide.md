script_mod!{
    // This comment shifts error line info
    use mod.prelude.widgets.*
}

// CORRECT - start with real code immediately
script_mod!{
    use mod.prelude.widgets.*
    // Comments after first code are fine
}
```

### Additional Pitfalls

- **Cursor values**: Use `cursor: MouseCursor.Hand` not `cursor: Hand` or `cursor: @Hand`
- **Resource paths**: Use `crate_resource("self://path")` not `dep("crate://self/path")`
- **Texture declarations**: Use `tex: texture_2d(float)` not `tex: texture2d`
- **Shader `mod` vs `modf`**: Use `modf(a, b)` for float modulo, NOT `mod(a, b)`
- **Enum defaults**: Use `default: @off` with `@` prefix for enum default values
- **DefaultNone derive**: Don't use `DefaultNone` derive; use `#[derive(Default)]` with `#[default]` attribute
- **Method chaining in shaders**: Use `.method()` not `::method()` (e.g., `Sdf2d.viewport(...)`)
- **Color mixing**: Prefer `color1.mix(color2, hover)` chaining over nested `mix()` calls
- **Missing widget registration**: Call `crate::makepad_widgets::script_mod(vm)` in `App::run()` BEFORE your own modules

## Syntax Quick Reference

| Old (live_design!) | New (script_mod!) |
|--------------------|-------------------|
| `<BaseWidget>` | `mod.widgets.BaseWidget{}` or `BaseWidget{}` (if imported) |
| `{{StructName}}` | `#(Struct::register_widget(vm))` |
| `(THEME_COLOR_X)` | `theme.color_x` |
| `<THEME_FONT>` | `theme.font_regular` |
| `instance hover: 0.0` | `hover: instance(0.0)` |
| `uniform color: #fff` | `color: uniform(#fff)` |
| `draw_bg: {}` (replace) | `draw_bg +: {}` (merge) |
| `default: off` | `default: @off` |
| `fn pixel(self)` | `pixel: fn()` |
| `item.apply_over(cx, live!{...})` | `script_apply_eval!(cx, item, {...})` |

## Reference Files

- [DSL Syntax Reference] -- Complete syntax grammar and examples
- [Property System] -- Walk, Layout, Draw, and shader properties


## Examples

```text
User: Apply this skill to my current task.
Assistant: Follow the workflow in this skill, cite limitations, and ask before risky steps.
```

## Limitations

- Imported upstream skill; verify credentials, permissions, and safety boundaries before execution.
- Does not replace environment-specific validation, testing, or maintainer review.
