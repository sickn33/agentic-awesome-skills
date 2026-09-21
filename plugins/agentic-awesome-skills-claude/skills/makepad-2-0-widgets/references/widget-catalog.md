# Makepad 2.0 Widget Catalog

Complete reference for all built-in widgets in Makepad 2.0. All widgets are defined using `script_mod!` blocks and used in Splash DSL syntax.

---

## View Containers

All View variants inherit from `ViewBase`. Views are the fundamental layout containers.

### Base View

| Widget | Background | Shape | Notes |
|--------|-----------|-------|-------|
| `View` | none | - | Invisible layout container. Setting `show_bg: true` shows an ugly green default; use SolidView instead for colored backgrounds |
| `SolidView` | flat color | rectangle | Basic colored rectangle |
| `RoundedView` | color | rounded rect | `draw_bg.border_radius` (uniform float, default 2.5) |
| `RoundedAllView` | color | per-corner radius | `draw_bg.border_radius` is `vec4` (top-left, top-right, bottom-right, bottom-left) |
| `RoundedXView` | color | left/right radius | `draw_bg.border_radius` is `vec2` (left radius, right radius) |
| `RoundedYView` | color | top/bottom radius | `draw_bg.border_radius` is `vec2` (top radius, bottom radius) |
| `RectView` | color | rectangle with border | Supports border_size, border_color, border_inset, gradient |
| `RectShadowView` | color + shadow | rectangle | clip_x/clip_y default false for shadow overflow |
| `RoundedShadowView` | color + shadow | rounded rect | clip_x/clip_y default false for shadow overflow |
| `CircleView` | color | circle | `draw_bg.border_radius` overrides auto-calculated radius |
| `HexagonView` | color | hexagon | `draw_bg.border_radius.x` sets explicit radius (vec2) |
| `GradientXView` | horizontal gradient | rectangle | Set `draw_bg.color` and `draw_bg.color_2` |
| `GradientYView` | vertical gradient | rectangle | Set `draw_bg.color` and `draw_bg.color_2` |
| `CachedView` | texture-cached | rectangle | `texture_caching: true`; renders children to texture |
| `CachedRoundedView` | texture-cached | rounded rect | Texture-cached with rounded corners and optional border |

### Scrollable Views

| Widget | Scrolls | Notes |
|--------|---------|-------|
| `ScrollXYView` | both axes | Horizontal and vertical scroll bars |
| `ScrollXView` | horizontal only | Horizontal scroll bar only |
| `ScrollYView` | vertical only | Vertical scroll bar only |

### View Properties (from ViewBase struct)

**Layout properties** (set directly on widget):
- `width`, `height` - Size values: `Fill`, `Fit`, fixed pixels (e.g., `100`), or `100.0`
- `flow` - Layout direction: `Down`, `Right`, `Overlay`, `Right {wrap: true}`
- `spacing` - Gap between children (pixels)
- `padding` - Inner padding: single value or `Inset{left: 0. right: 0. top: 0. bottom: 0.}`
- `margin` - Outer margin: same format as padding
- `align` - Child alignment: `Center`, `TopLeft`, `Align{x: 0.5 y: 0.5}`
- `clip_x`, `clip_y` - Clip overflow (default depends on widget)

**Display properties:**
- `show_bg` - Whether to draw the background (default `false` for View)
- `visible` - Widget visibility (default `true`)
- `new_batch` - Force new GPU draw batch (CRITICAL for text-over-background)
- `cursor` - Mouse cursor: `MouseCursor.Hand`, `MouseCursor.Default`, etc.
- `grab_key_focus` - Whether view captures keyboard focus (default `true`)
- `capture_overload` - Capture pointer events even when scrolling

**draw_bg properties (for views with show_bg: true):**
- `color` - Primary fill color (instance)
- `color_2` - Secondary color for gradients (instance, default `vec4(-1)` = disabled)
- `border_size` - Border thickness (uniform)
- `border_radius` - Corner rounding (type varies by widget)
- `border_color` - Border color (instance)
- `border_color_2` - Secondary border gradient color (instance)
- `border_inset` - Border inset (uniform vec4)
- `shadow_color` - Shadow color (instance, shadow views only)
- `shadow_radius` - Shadow blur radius (uniform, shadow views only)
- `shadow_offset` - Shadow offset (uniform vec2, shadow views only)
- `color_dither` - Dithering amount (uniform, default 1.0)
- `gradient_fill_horizontal` - Fill gradient direction: 0.0 = vertical, 1.0 = horizontal (uniform)
- `gradient_border_horizontal` - Border gradient direction (uniform)

---

## Text Widgets

### Labels and Headings

| Widget | Style | Notes |
|--------|-------|-------|
| `Label` | Regular text | Default: `width: Fit, height: Fit`. Does NOT support animator or cursor! |
| `Labelbold` | Bold text | Bold font variant of Label |
| `LabelGradientX` | Horizontal gradient text | Set `draw_text.color` and `draw_text.color_2` |
| `LabelGradientY` | Vertical gradient text | Set `draw_text.color` and `draw_text.color_2` |
| `TextBox` | Paragraph text | `width: Fill`, uses `theme.font_size_p` |
| `P` | Paragraph | Same as TextBox |
| `Pbold` | Bold paragraph | Bold font variant |
| `Pitalic` | Italic paragraph | Italic font variant |
| `Pbolditalic` | Bold italic paragraph | Combined bold italic |
| `H1` | Heading 1 | `width: Fill`, `theme.font_size_1`, bold, `theme.color_text_hl` |
| `H1italic` | Heading 1 italic | Bold italic variant |
| `H2` | Heading 2 | `theme.font_size_2`, bold |
| `H2italic` | Heading 2 italic | Bold italic variant |
| `H3` | Heading 3 | `theme.font_size_3`, bold |
| `H3italic` | Heading 3 italic | Bold italic variant |
| `H4` | Heading 4 | `theme.font_size_4`, bold |
| `H4italic` | Heading 4 italic | Bold italic variant |
| `IconSet` | Icon font | Uses `theme.font_icons`, font_size 100 |

**CRITICAL:** Default text color is WHITE (`theme.color_label_outer`). You MUST set `draw_text.color` explicitly on light backgrounds, or text will be invisible.

**draw_text properties:**
- `color` - Text color (default: `theme.color_label_outer`, which is white/light)
- `color_2` - Secondary text color for gradient (default disabled)
- `text_style` - Font style: `theme.font_regular{font_size: 11}`, `theme.font_bold{...}`, `theme.font_italic{...}`, `theme.font_bold_italic{...}`
- `color_dither` - Dithering amount (uniform)
- `gradient_fill_horizontal` - Gradient direction (0.0 = vertical, 1.0 = horizontal)

### Editable Text

| Widget | Notes |
|--------|-------|
| `TextInput` | Full-featured text input (themed with border and bevels) |
| `TextInputFlat` | Flat styled text input (base style) |

**TextInput properties:**
- `text` - The text content (String)
- `is_password` - Mask text as password (bool)
- `is_read_only` - Prevent editing (bool)
- `is_numeric_only` - Only allow numbers (bool)
- `empty_text` - Placeholder text when empty (String)
- `input_mode` - Keyboard input mode
- `autocapitalize` - Auto-capitalize behavior
- `autocorrect` - Auto-correct behavior
- `return_key_type` - Return key type

**TextInput draw_bg instances:** `hover`, `down`, `focus`, `disabled`, `empty`

### Rich Text and Links

| Widget | Notes |
|--------|-------|
| `LinkLabel` | Clickable text link with hover/press states |
| `TextFlow` | Rich text container for mixed content (base for Markdown/Html) |
| `Markdown` | Markdown rendering (feature-gated with `pulldown-cmark`; set `body` property) |
| `Html` | HTML rendering (feature-gated; set `body` property) |

---

## Button Widgets

| Widget | Style | Notes |
|--------|-------|-------|
| `Button` | Standard themed button | Beveled with gradient |
| `ButtonFlat` | Flat button | Base button style, rounded corners |
| `ButtonFlatter` | Minimal button | Invisible/minimal background |
| `ButtonGradientX` | Horizontal gradient button | Gradient fill |
| `ButtonGradientY` | Vertical gradient button | Gradient fill |
| `ButtonIcon` | Button with icon | Icon + text |
| `ButtonFlatIcon` | Flat button with icon | |
| `ButtonFlatterIcon` | Minimal button with icon | |
| `ButtonGradientXIcon` | Gradient X with icon | |
| `ButtonGradientYIcon` | Gradient Y with icon | |

**Button properties:**
- `text` - Button label text (String)
- `draw_bg` - Background drawing
- `draw_text` - Text drawing
- `draw_icon` - SVG icon drawing
- `icon_walk` - Walk for icon sizing (default `Walk{width: 22.0, height: Fit}`)
- `label_walk` - Walk for label sizing
- `animator` - Animation states

**Button draw_bg instance variables:** `hover`, `down`, `focus`, `disabled`

**Color uniforms (draw_bg):**
- `color`, `color_hover`, `color_down`, `color_focus`, `color_disabled`
- `color_2`, `color_2_hover`, `color_2_down`, `color_2_focus`, `color_2_disabled`
- `border_color`, `border_color_hover`, `border_color_down`, `border_color_focus`, `border_color_disabled`
- `border_color_2`, `border_color_2_hover`, `border_color_2_down`, `border_color_2_focus`, `border_color_2_disabled`
- `border_size`, `border_radius`

**Button draw_text color variants:**
- `color`, `color_hover`, `color_down`, `color_focus`, `color_disabled`

---

## Toggle Widgets (CheckBox, Toggle, RadioButton)

### CheckBox Variants

| Widget | Style | Notes |
|--------|-------|-------|
| `CheckBox` | Themed check box | Beveled, themed colors |
| `CheckBoxFlat` | Flat check box | Base style |
| `CheckBoxCustom` | Custom check box | For custom styling |

### Toggle Variants

| Widget | Style | Notes |
|--------|-------|-------|
| `Toggle` | Themed toggle switch | Pill-shaped switch |
| `ToggleFlat` | Flat toggle switch | Base style |

### RadioButton Variants

| Widget | Style | Notes |
|--------|-------|-------|
| `RadioButton` | Themed radio | Circular indicator |
| `RadioButtonFlat` | Flat radio | Base style |
| `RadioButtonFlatter` | Minimal radio | |
| `RadioButtonTabFlat` | Tab-style radio | Tab-like appearance |
| `RadioButtonTab` | Themed tab radio | |

**Toggle/CheckBox/RadioButton properties:**
- `text` - Label text
- `active` - Current on/off state (not directly settable; controlled by animator)
- `draw_bg` - Background drawing
- `draw_text` - Label text drawing
- `label_walk` - Label sizing
- `animator` - Animation states

**draw_bg instance variables:** `hover`, `down`, `focus`, `active`, `disabled`

**CheckBox-specific draw_bg uniforms:**
- `size` - Check box size in pixels (default 15.0)
- `mark_size` - Check mark scale (default 0.65)
- `mark_color`, `mark_color_hover`, `mark_color_down`, `mark_color_active`, `mark_color_active_hover`, `mark_color_focus`, `mark_color_disabled`
- Standard `color`, `border_color` variants (with `_hover`, `_down`, `_active`, `_focus`, `_disabled` suffixes)

---

## Input Widgets

### Slider Variants

| Widget | Style | Notes |
|--------|-------|-------|
| `Slider` | Themed slider | Full-featured with bevels |
| `SliderFlat` | Flat slider | Base flat style |
| `SliderMinimal` | Minimal slider | Simplest style |
| `SliderMinimalFlat` | Minimal flat slider | |
| `SliderGradientX` | Gradient X slider | Horizontal gradient fill |
| `SliderGradientY` | Gradient Y slider | Vertical gradient fill |
| `SliderRound` | Round handle slider | Circular handle |
| `SliderRoundFlat` | Round flat slider | |
| `SliderRoundGradientX` | Round gradient X | |
| `SliderRoundGradientY` | Round gradient Y | |
| `Rotary` | Rotary knob | Circular dial control |
| `RotaryFlat` | Flat rotary knob | |
| `RotaryGradientY` | Gradient rotary knob | |

**Slider properties:**
- `min` - Minimum value (f64, default 0.0)
- `max` - Maximum value (f64, default 1.0)
- `step` - Step increment (f64, default 0.0 = continuous)
- `default` - Default/initial value (f64)
- `precision` - Decimal places to display (usize, default 2)
- `axis` - Drag direction: `DragAxis.Horizontal` (default) or `DragAxis.Vertical`
- `text` - Label text
- `bind` - Data binding path (String)
- `draw_bg`, `draw_text`, `label_walk`, `label_align`

**Slider draw_bg instance variables:** `hover`, `focus`, `drag`, `disabled`

**Slider-specific draw_bg uniforms:**
- `val_color`, `val_color_hover`, `val_color_focus`, `val_color_drag`, `val_color_disabled`
- `handle_color`, `handle_color_hover`, `handle_color_focus`, `handle_color_drag`, `handle_color_disabled`
- `handle_size`, `offset_y`
- Standard `color`, `border_color` variants with state suffixes

### DropDown Variants

| Widget | Style | Notes |
|--------|-------|-------|
| `DropDown` | Themed dropdown | Full-featured with bevels |
| `DropDownFlat` | Flat dropdown | Base flat style |
| `DropDownGradientX` | Gradient X dropdown | |
| `DropDownGradientY` | Gradient Y dropdown | |

**DropDown properties:**
- `labels` - Array of string options (Vec<String>)
- `selected_item` - Currently selected index (usize)
- `bind` - Data binding path
- `bind_enum` - Enum data binding
- `popup_menu` - Popup menu configuration
- `draw_bg`, `draw_text`

**DropDown draw_bg instances:** `hover`, `focus`, `down`, `active`, `disabled`

---

## Media Widgets

| Widget | Notes |
|--------|-------|
| `Image` | Static/animated image. Default: `width: 100, height: 100` |
| `Video` | Video playback. Default: `width: 100, height: 100` |
| `Svg` | Renders external `.svg` files with optional animation and custom GPU shaders |
| `Icon` | SVG icon rendering |
| `IconGradientX` | Gradient X icon |
| `IconGradientY` | Gradient Y icon |
| `IconRotated` | Rotatable icon (draw_icon.rotation_angle) |
| `LoadingSpinner` | Animated circular loading indicator |
| `MathView` | LaTeX math rendering (requires `makepad_latex_math` crate) |
| `MapView` | Geographic map rendering (vector tile-based) |

### Image Properties
- `fit` - How image fits container: `ImageFit.Stretch` (default), `ImageFit.Horizontal`, `ImageFit.Vertical`, `ImageFit.Smallest`, `ImageFit.Biggest`, `ImageFit.Size`
- `width_scale` - Scale factor for width (f64, default 1.0)
- `src` - Image source: `http_resource("url")` or `crate_resource("self:path")`
- `animation` - Animation mode: `ImageAnimation.Loop` (default), `.Stop`, `.Once`, `.Bounce`, `.Frame(f64)`, `.Factor(f64)`, `.OnceFps(f64)`, `.LoopFps(f64)`, `.BounceFps(f64)`
- `draw_bg.opacity` - Image opacity (0.0 to 1.0)
- `draw_bg.image_scale` - Scale vec2
- `draw_bg.image_pan` - Pan offset vec2

### Svg Widget Properties

The `Svg{}` widget loads and renders external `.svg` files. It supports SVG gradients, filters, `<animate>` elements, and custom GPU shader effects.

**Properties:**
- `draw_svg` - The DrawSvg shader instance (inherits from DrawVector)
- `draw_svg.svg` - SVG resource: `crate_resource("self:path/to/file.svg")` or `http_resource("https://url/file.svg")`
- `draw_svg.color` - Tint color override. Default `vec4(-1,-1,-1,-1)` = use original SVG colors.
- `draw_svg.svg_scale` - GPU-side scale uniform `vec2` (default `1.0, 1.0`)
- `draw_svg.svg_offset` - GPU-side offset uniform `vec2` (default `0.0, 0.0`)
- `draw_svg.svg_time` - Animation time uniform (float, auto-updated when `animating: true`)
- `animating` - Enable per-frame time updates for SVG `<animate>` elements and custom shader effects (default `true`)
- `width`, `height` - Widget size (default `Fit`)

**Basic usage:**
```
Svg{
    width: 300 height: 300
    draw_svg +: { svg: crate_resource("self:resources/my_icon.svg") }
}
```

**Load from URL:**
```
Svg{
    width: 300 height: 100
    draw_svg +: { svg: http_resource("https://example.com/logo.svg") }
}
```

**With custom GPU shader effect:**
```
Svg{
    width: 600 height: 450
    animating: true
    draw_svg +: {
        svg: crate_resource("self:resources/scene.svg")
        get_color: fn() {
            let base = self.eval_gradient();
            let id = self.v_shape_id;
            let t = self.svg_time;
            if id < 0.5 { return base }
            return mix(base, vec4(1.0, 0.0, 0.0, 1.0), sin(t) * 0.5 + 0.5);
        }
    }
}
```

**Static SVG (no animation):**
```
Svg{
    width: 32 height: 32
    animating: false
    draw_svg +: { svg: crate_resource("self:resources/icons/icon_file.svg") }
}
```

**IMPORTANT:** Use `draw_svg +:` (merge operator) to set svg and shader properties.

### Icon Properties
- `draw_icon.svg` - SVG resource: `crate_resource("self:resources/icons/name.svg")`
- `draw_icon.color` - Icon tint color
- `icon_walk` - Walk for icon sizing (default `Walk{width: 17.5, height: Fit}`)
- `draw_bg.color` - Background color (instance)

### MathView Properties
- `text` - LaTeX math expression (String)
- `font_size` - Font size (f64, default 11.0)
- `color` - Text color (default `#fff`)
- `baseline_offset` - Vertical baseline adjustment (default -2.0)

### MapView Properties
- `center_lon` - Center longitude (f64, default 4.9041)
- `center_lat` - Center latitude (f64, default 52.3676)
- `zoom` - Zoom level (f64, default 14.0)
- `min_zoom` - Minimum zoom (f64, default 11.0)
- `max_zoom` - Maximum zoom (f64, default 17.0)
- `dark_theme` - Use dark map style (bool, default false)
- `use_network` - Enable network tile fetching (bool, default false)
- `use_local_mbtiles` - Use local mbtiles file (bool, default true)

**CRITICAL MapView rules:**
- MUST use fixed pixel height (e.g., `height: 400`). Never use `Fit` or `Fill` for height.
- MUST wrap in a container with `new_batch: true`.

---

## Layout Widgets

| Widget | Notes |
|--------|-------|
| `Hr` | Horizontal divider/rule. `width: Fill`, themed bevel line |
| `Vr` | Vertical divider/rule. `height: Fill`, themed bevel line |
| `Filler` | Empty spacer. `width: Fill, height: Fill` |
| `Splitter` | Resizable split pane with drag handle |
| `FoldHeader` | Collapsible section with header and body |
| `ScrollBar` | Scroll bar component (used internally by ScrollViews) |

### Splitter Properties
- `axis` - Split direction: `SplitterAxis.Horizontal` (default) or `SplitterAxis.Vertical`
- `align` - Split position:
  - `SplitterAlign.FromA(pixels)` - Fixed distance from start
  - `SplitterAlign.FromB(pixels)` - Fixed distance from end
  - `SplitterAlign.Weighted(ratio)` - Proportional (default 0.5)
- `a :=` / `b :=` - Named child slots for the two panes
- `size` - Splitter bar thickness (default 6.0)
- `min_horizontal`, `max_horizontal` - Horizontal drag limits (default 50.0)
- `min_vertical`, `max_vertical` - Vertical drag limits (default 50.0)

### FoldHeader Properties
- `header :=` / `body :=` - Named child slots
- `body_walk` - Walk for body (default: `Walk{width: Fill, height: Fit}`)
- `animator.active` - Controls open/close state (@on = open, @off = closed)
- `opened` - Animation value (0.0 = closed, 1.0 = open)

### ScrollBar Properties
- `bar_size` - Scroll bar width in pixels (default 10.0)
- `bar_side_margin` - Margin from edge (default 3.0)
- `min_handle_size` - Minimum handle size (default 30.0)

---

## List Widgets

| Widget | Notes |
|--------|-------|
| `PortalList` | Virtualized scrolling list (only renders visible items) |
| `FlatList` | Non-virtualized list (renders all items) |

### PortalList Properties
- `flow` - Default `Down` (vertical list)
- `scroll_bar` - Scroll bar configuration: `ScrollBar{}`
- `capture_overload` - Default `true`
- Templates defined with `:=` syntax are stored in templates HashMap
- Driven programmatically from Rust via `draw_walk()` loop

### FlatList Properties
- Similar to PortalList but renders all children
- Suitable for small, fixed-size lists

---

## Dock System

| Widget | Notes |
|--------|-------|
| `Dock` | Full-featured tabbed dock layout (themed with round corners) |
| `DockFlat` | Flat-styled dock layout |

### Dock Sub-Types (DSL only)

| Type | Notes |
|------|-------|
| `DockSplitter` | Splits dock into two regions. Properties: `axis`, `align`, `a`, `b` |
| `DockTabs` | Tab container. Properties: `tabs` (array of DockTab), `selected`, `closable` |
| `DockTab` | Individual tab. Properties: `name`, `template`, `kind` |

### Dock Properties
- `tab_bar` - Tab bar style (e.g., `TabBarGradientY{}`, `TabBarFlat{}`)
- `splitter` - Splitter style (e.g., `Splitter{}`)
- `root :=` - Root dock layout node (DockSplitter or DockTabs)
- Content templates defined with `:=` syntax

---

## Navigation Widgets

| Widget | Notes |
|--------|-------|
| `Modal` | Overlay dialog with dimmed background. Uses `content +:` for dialog content |
| `Tooltip` | Hover tooltip with positioned content |
| `PopupNotification` | Toast-style notification overlay (top-right aligned) |
| `SlidePanel` | Animated side panel with slide-in/out |
| `ExpandablePanel` | Draggable panel overlay with touch gesture |
| `PageFlip` | Page switching container (only one page visible at a time) |
| `StackNavigation` | iOS-style stack-based navigation with back button |

### Modal Properties
- `content :=` - Dialog content container (View, default: `width: Fit, height: Fit, flow: Down`)
- `bg_view :=` - Background overlay (default: semi-transparent black `#000000B3`)
- `flow: Overlay` (default)
- Emits `ModalAction::Dismissed` on background click

### SlidePanel Properties
- `side` - Slide direction: `SlideSide.Left` (default), `SlideSide.Right`, `SlideSide.Top`
- `active` - Animation position (0.0 = visible, 1.0 = hidden)
- `animator.active` - @on = slide in, @off = slide out

### PageFlip Properties
- `active_page` - Currently visible page (LiveId)
- `lazy_init` - Whether to lazily initialize pages (default false)
- Pages defined as templates with `:=` syntax

### StackNavigation
- Contains `StackNavigationView` children
- `StackViewHeader` - Pre-built header with back button and title
- `StackNavigationView` - Individual stack page (default: `visible: false`)

---

## Special Widgets

| Widget | Notes |
|--------|-------|
| `FileTree` | File hierarchy tree (programmatically driven from Rust) |
| `CachedWidget` | Cached rendering wrapper |
| `Vector` | SVG-like vector graphics drawing |
| `Window` | Application window container |
| `Root` | Root widget container |

---

## Draw Batching (new_batch)

Widgets using the same shader are batched into a single GPU draw call. This causes problems when text needs to appear on top of a background:

**Problem:** Text drawn in the same batch as a background quad will be rendered behind it, making text invisible.

**Solution:** Set `new_batch: true` on any View with `show_bg: true` that contains text children.

```
my_card := RoundedView{
    new_batch: true  // CRITICAL: forces new draw batch
    show_bg: true
    draw_bg.color: #333

    label := Label{
        text: "This text is now visible"
    }
}
```

**When new_batch is required:**
- Any View with `show_bg: true` that contains Label, H1-H4, TextBox, P, or other text widgets
- Views with hover effects (draw_bg instance variables that change) containing text
- MapView containers (MUST have new_batch on parent)

**When new_batch is NOT needed:**
- View without show_bg (invisible layout containers)
- Views that only contain other Views (no direct text children)
- The innermost text widgets themselves
