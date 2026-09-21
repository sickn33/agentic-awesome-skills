# Makepad 2.0 Property System Reference

## Property Categories

Makepad properties fall into four main categories:

1. **Walk Properties** -- Sizing and positioning
2. **Layout Properties** -- Child arrangement and spacing
3. **Draw Properties** -- Visual rendering (shaders, colors, backgrounds)
4. **Shader Variable Types** -- Instance, Uniform, Texture, Varying

## Walk Properties

Walk properties control the size and margin of a widget.

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `width` | Size | `Fill` | Widget width |
| `height` | Size | `Fill` | Widget height |
| `margin` | Inset | `0.` | Outer spacing around widget |

### Size Values

```
Fill                        // fill available space (default for width AND height)
Fit                         // shrink-wrap to content
200                         // fixed 200px (bare number = Fixed)
Fill{min: 100 max: 500}    // constrained fill
Fit{max: Abs(300)}          // constrained fit
```

### Margin Values

```
margin: 0.                                          // uniform zero
margin: 10                                           // uniform 10px
margin: Inset{top: 5 bottom: 5 left: 10 right: 10}  // per-side
```

**CRITICAL**: Default `height` is `Fill`. Containers inside a `Fit` parent MUST set `height: Fit` or they will be invisible (0 height due to circular dependency).

## Layout Properties

Layout properties control how a container arranges its children.

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `flow` | Flow | `Right` | Direction children are laid out |
| `spacing` | f64 | `0` | Gap between children |
| `padding` | Inset | `0.` | Inner spacing inside container |
| `align` | Align | `TopLeft` | Child alignment within container |
| `clip_x` | bool | `true` | Clip horizontal overflow |
| `clip_y` | bool | `true` | Clip vertical overflow |

### Flow Values

```
flow: Right                      // left-to-right (default), no wrap
flow: Down                       // top-to-bottom
flow: Overlay                    // stacked on top of each other
flow: Flow.Right{wrap: true}     // wrapping horizontal (like CSS flexbox wrap)
flow: Flow.Down{wrap: true}      // wrapping vertical
```

### Spacing and Padding

```
spacing: 10                                              // gap between children
padding: 15                                              // uniform inner padding
padding: Inset{top: 5 bottom: 5 left: 10 right: 10}     // per-side padding
```

### Alignment Values

```
align: Center       // Align{x: 0.5 y: 0.5}  - center both axes
align: HCenter      // Align{x: 0.5 y: 0.0}  - horizontal center, top
align: VCenter      // Align{x: 0.0 y: 0.5}  - left, vertical center
align: TopLeft      // Align{x: 0.0 y: 0.0}  - top-left (default)
align: Align{x: 1.0 y: 0.0}   // top-right
align: Align{x: 0.0 y: 1.0}   // bottom-left
align: Align{x: 1.0 y: 1.0}   // bottom-right
```

## Draw Properties

Draw properties control visual rendering. The main draw properties are:

| Property | Type | Description |
|----------|------|-------------|
| `draw_bg` | DrawQuad | Background drawing (shape, color, shader) |
| `draw_text` | DrawText | Text rendering (color, font, style) |
| `draw_icon` | DrawSvg | SVG icon rendering |
| `show_bg` | bool | Enable background drawing (default: false for View) |
| `cursor` | MouseCursor | Mouse cursor on hover |
| `visible` | bool | Widget visibility |
| `new_batch` | bool | Start new GPU draw batch (for correct layering) |
| `grab_key_focus` | bool | Capture keyboard focus on click |

### draw_bg Properties (Background)

Common properties available on SolidView, RoundedView, and other view variants:

```
draw_bg +: {
    // Fill color
    color: instance(#334)                    // per-instance fill color

    // Gradient
    color_2: instance(vec4(-1))              // gradient end color (-1 = disabled)
    gradient_fill_horizontal: uniform(0.0)   // 0 = vertical gradient, 1 = horizontal

    // Border
    border_size: uniform(1.0)                // border width in pixels
    border_radius: uniform(5.0)              // corner radius (RoundedView only)
    border_color: instance(#888)             // border color
    border_inset: uniform(vec4(0))           // border inset

    // Shadow (shadow view variants only)
    shadow_color: instance(#0007)            // shadow color with alpha
    shadow_radius: uniform(10.0)             // shadow blur radius
    shadow_offset: uniform(vec2(0 0))        // shadow offset (x, y)

    // Animator-driven state (per-instance floats)
    hover: instance(0.0)                     // hover animation state
    down: instance(0.0)                      // press animation state
    focus: instance(0.0)                     // focus animation state
    disabled: instance(0.0)                  // disabled animation state

    // Pixel shader
    pixel: fn() {
        let sdf = Sdf2d.viewport(self.pos * self.rect_size)
        sdf.box(0. 0. self.rect_size.x self.rect_size.y self.border_radius)
        sdf.fill(self.color)
        return sdf.result
    }
}
```

### Button draw_bg Extended Properties

Buttons add state-variant color uniforms:

```
draw_bg +: {
    // Base colors (each has _hover, _down, _focus, _disabled variants)
    color: uniform(#334)
    color_hover: uniform(#449)
    color_down: uniform(#225)
    color_focus: uniform(#336)
    color_disabled: uniform(#222)

    // Secondary gradient colors
    color_2: uniform(vec4(-1))
    color_2_hover: uniform(vec4(-1))

    // Border colors (also with state variants)
    border_color: uniform(#555)
    border_color_hover: uniform(#777)

    // Shape
    border_size: uniform(1.0)
    border_radius: uniform(4.0)

    // Gradient control
    color_dither: uniform(1.0)
    gradient_fill_horizontal: uniform(0.0)
    gradient_border_horizontal: uniform(0.0)

    // Instance state (driven by animator)
    hover: instance(0.0)
    down: instance(0.0)
    focus: instance(0.0)
    disabled: instance(0.0)
}
```

### draw_text Properties (Text Rendering)

```
draw_text +: {
    color: #fff                                  // text color
    color_2: uniform(vec4(-1))                   // gradient end (-1 = disabled)
    color_dither: uniform(1.0)                   // dithering amount
    gradient_fill_horizontal: uniform(0.0)       // 0 = vertical, 1 = horizontal

    // Text style
    text_style: theme.font_regular{              // base font with overrides
        font_size: 11
    }

    // Animator-driven
    hover: instance(0.0)
    down: instance(0.0)
    focus: instance(0.0)
    disabled: instance(0.0)
}
```

### draw_icon Properties (SVG Icons)

```
draw_icon +: {
    color: #fff                                          // icon tint color
    svg: crate_resource("self://resources/icons/x.svg")  // SVG file path
}

icon_walk: Walk{width: 16 height: 16}                   // icon sizing
```

### CheckBox/Toggle draw_bg Properties

```
draw_bg +: {
    // Instance state (driven by animator)
    hover: instance(0.0)
    down: instance(0.0)
    focus: instance(0.0)
    active: instance(0.0)              // checked/on state
    disabled: instance(0.0)

    // Shape
    size: uniform(10.0)
    border_size: uniform(1.0)
    border_radius: uniform(3.0)

    // Colors (each with _hover, _down, _active, _focus, _disabled variants)
    color: uniform(#334)
    color_active: uniform(#07f)
    border_color: uniform(#555)
    mark_color: uniform(#fff)
    mark_color_active: uniform(#fff)
    mark_size: uniform(6.0)
}
```

## Shader Variable Types

### instance(value) -- Per-Draw-Call Variable

Each widget instance has its own value. Animatable by the Animator system.

```
hover: instance(0.0)            // float, varies per widget
color: instance(#334)           // vec4, per-instance color
down: instance(0.0)             // float, press state
```

**Use for**: State that varies per widget (hover, down, focus, active, disabled), per-widget colors, scale/pan values. Driven by the Animator system.

### uniform(value) -- Shared Variable

Shared across all instances using the same shader variant. NOT animatable.

```
border_radius: uniform(5.0)     // float, same for all instances
color: uniform(#fff)            // vec4, shared base color
border_size: uniform(1.0)       // float, shared border width
```

**Use for**: Theme constants, border sizes, radii, and other values shared by all instances. Cannot be animated.

### texture_2d(type) -- Texture Sampler

Declares a GPU texture sampler:

```
my_tex: texture_2d(float)       // standard 2D texture
image_texture: texture_2d(float)
```

Sampling in pixel shader:
```
pixel: fn() {
    let color = self.my_tex.sample(self.pos)
    return Pal.premul(color)
}
```

Alternative sampling:
```
sample2d(self.my_tex, uv)           // free-function form
sample2d_rt(self.image, uv)         // render-target texture (handles Y-flip)
```

### varying(value) -- Vertex-to-Pixel Interpolated

Set in vertex shader, interpolated to pixel shader:

```
my_scale: varying(vec2(0))           // vertex->pixel interpolated

vertex: fn() {
    let dpi = self.dpi_factor
    let ceil_size = ceil(self.rect_size * dpi) / dpi
    self.my_scale = self.rect_size / ceil_size
    return self.clip_and_transform_vertex(self.rect_pos self.rect_size)
}

pixel: fn() {
    // my_scale available here, interpolated from vertex shader
    return Pal.premul(self.color)
}
```

## Theme Access

All theme values use the `theme.` prefix:

### Colors

```
theme.color_bg_app              // app background
theme.color_fg_app              // app foreground
theme.color_bg_container        // container background
theme.color_bg_even             // even row background
theme.color_bg_odd              // odd row background
theme.color_text                // default text color
theme.color_text_hl             // highlighted text
theme.color_text_disabled       // disabled text
theme.color_shadow              // shadow color
theme.color_highlight           // highlight color
theme.color_makepad             // Makepad brand (#FF5C39)
theme.color_white               // white
theme.color_black               // black
theme.color_error               // error indicator
theme.color_warning             // warning indicator
theme.color_panic               // panic indicator

// Label colors (with state variants: _hover, _down, _focus, _active, _disabled)
theme.color_label_inner
theme.color_label_outer
theme.color_label_inner_hover
theme.color_label_outer_hover
// etc.

// Inset/outset/bevel colors (with state variants)
theme.color_inset
theme.color_outset
theme.color_bevel

// Scale colors
theme.color_u_1 .. theme.color_u_6    // light scale
theme.color_d_1 .. theme.color_d_5    // dark scale
theme.color_u_hidden                    // transparent light
theme.color_d_hidden                    // transparent dark

// Selection and cursor
theme.color_selection_focus
theme.color_cursor

// Slider colors (with _hover, _focus, _drag, _disabled variants)
theme.color_val
theme.color_handle

// Check/radio marks (with state variants)
theme.color_mark_off
theme.color_mark_active
```

### Typography

```
// Font sizes
theme.font_size_1               // heading 1 size
theme.font_size_2               // heading 2 size
theme.font_size_3               // heading 3 size
theme.font_size_4               // heading 4 size
theme.font_size_p               // paragraph size
theme.font_size_code            // code size
theme.font_size_base            // base font size

// Font families
theme.font_regular              // regular weight
theme.font_bold                 // bold weight
theme.font_italic               // italic style
theme.font_bold_italic          // bold + italic
theme.font_code                 // monospace
theme.font_icons                // icon font

// Line spacing
theme.font_wdgt_line_spacing    // widget line spacing
theme.font_longform_line_spacing // long-form text line spacing
```

### Spacing

```
theme.space_1                   // small spacing
theme.space_2                   // medium spacing
theme.space_3                   // large spacing

// Inset presets (padding/margin)
theme.mspace_1                  // uniform small
theme.mspace_2                  // uniform medium
theme.mspace_3                  // uniform large
theme.mspace_h_1                // horizontal small
theme.mspace_h_2                // horizontal medium
theme.mspace_h_3                // horizontal large
theme.mspace_v_1                // vertical small
theme.mspace_v_2                // vertical medium
theme.mspace_v_3                // vertical large
```

### Dimensions

```
theme.corner_radius             // standard corner radius
theme.beveling                  // bevel amount
theme.tab_height                // tab bar height
theme.splitter_size             // splitter handle size
theme.container_corner_radius   // container corner radius
theme.dock_border_size          // dock border size
```

## Built-in Shader Variables

Available in pixel and vertex shaders via `self.*`:

```
self.pos                // vec2: normalized position [0,1] within widget
self.rect_size          // vec2: pixel size of the drawn rect
self.rect_pos           // vec2: pixel position of the drawn rect
self.dpi_factor         // float: display DPI factor
self.draw_pass.time     // float: elapsed time in seconds (for continuous animation)
self.draw_pass.dpi_dilate  // float: DPI dilation factor
self.draw_depth         // float: base depth for z-ordering
self.draw_zbias         // float: z-bias offset
self.geom_pos           // vec2: raw geometry position [0,1] before clipping
```

## SDF Rendering System

### SDF Primitives

```
sdf.circle(cx cy radius)
sdf.rect(x y w h)
sdf.box(x y w h border_radius)
sdf.box_all(x y w h r_lt r_rt r_rb r_lb)      // per-corner radius
sdf.box_x(x y w h r_left r_right)
sdf.box_y(x y w h r_top r_bottom)
sdf.hexagon(cx cy radius)
sdf.hline(y half_height)
sdf.arc_round_caps(cx cy radius start end thickness)
sdf.arc_flat_caps(cx cy radius start end thickness)
```

### SDF Path Operations

```
sdf.move_to(x y)
sdf.line_to(x y)
sdf.close_path()
```

### SDF Combinators

```
sdf.union()            // merge shapes (min distance)
sdf.intersect()        // keep overlap only (max distance)
sdf.subtract()         // cut current from previous
sdf.gloop(k)           // smooth union with rounding factor k
sdf.blend(k)           // linear blend: 0.0 = previous, 1.0 = current
```

### SDF Drawing Operations

```
sdf.fill(color)            // fill and reset shape
sdf.fill_keep(color)       // fill, keep shape for stroke
sdf.fill_premul(color)     // fill with premultiplied color, reset
sdf.fill_keep_premul(color)// fill premul, keep shape
sdf.stroke(color width)    // stroke and reset
sdf.stroke_keep(color w)   // stroke, keep shape
sdf.glow(color width)      // additive glow, reset
sdf.glow_keep(color w)     // additive glow, keep
sdf.clear(color)           // clear result buffer
```

### SDF Transforms

```
sdf.translate(x y)
sdf.rotate(angle cx cy)
sdf.scale(factor cx cy)
```

### Color Operations

```
mix(color1 color2 factor)          // linear interpolation
color1.mix(color2 factor)          // method chaining form (preferred)
Pal.premul(color)                  // premultiply alpha (REQUIRED for pixel() returns)
Pal.hsv2rgb(vec4(h s v 1.0))      // HSV to RGB
Pal.rgb2hsv(color)                 // RGB to HSV
Pal.iq(t a b c d)                  // cosine color palette
Pal.iq0(t) .. Pal.iq7(t)          // pre-built cosine palettes
```

**CRITICAL**: Always wrap final color in `Pal.premul()` when returning from `pixel: fn()`, UNLESS returning `sdf.result` (which is already premultiplied).

### Shadow Rendering

```
GaussShadow.box_shadow(lower upper point sigma)
GaussShadow.rounded_box_shadow(lower upper point sigma corner)
```

### Math Utilities

```
// Makepad-specific
Math.random_2d(vec2)          // pseudo-random 0-1 from vec2 seed
Math.rotate_2d(v angle)       // 2D rotation

// Constants
PI  E  TORAD  GOLDEN

// Standard GLSL math
sin cos tan asin acos atan
pow sqrt exp exp2 log log2
abs sign floor ceil fract modf
min max clamp step smoothstep
length distance dot cross normalize
dFdx dFdy                    // fragment-only partial derivatives
```

**NOTE**: Use `modf(a, b)` for float modulo, NOT `mod(a, b)`. Use `atan2(y, x)` for two-argument arctangent.

## Widget-Specific Properties

### View / Container Properties

```
width: Fill              // Size
height: Fit              // Size (ALWAYS set Fit on containers!)
flow: Down               // Flow direction
spacing: 10              // gap between children
padding: 15              // Inset or bare number
margin: 0.               // Inset or bare number
align: Center            // Align preset or Align{x: y:}
show_bg: true            // enable background (false by default for View)
visible: true            // visibility
new_batch: true          // new GPU draw batch for correct layering
cursor: MouseCursor.Hand // mouse cursor
grab_key_focus: true     // capture keyboard on click
block_signal_event: false
capture_overload: false
clip_x: true             // horizontal clipping
clip_y: true             // vertical clipping
scroll_bars: ScrollBar{} // for scroll variants
```

### Label Properties

```
text: "Hello"
draw_text.color: #fff
draw_text.text_style: theme.font_regular
draw_text.text_style.font_size: 12
align: Center
flow: Down
padding: Inset{left: 5}
hover_actions_enabled: true
```

**NOTE**: Label does NOT support `animator` or `cursor`. Wrap in a View for hover effects.

### Button Properties

```
text: "Click"
draw_bg +: { ... }                 // background shader
draw_text +: { ... }               // text shader
draw_icon +: { ... }               // icon shader
icon_walk: Walk{width: 16 height: 16}
label_walk: Walk{...}
grab_key_focus: true
animator: Animator{ ... }
```

### TextInput Properties

```
width: Fill height: Fit
empty_text: "Placeholder"
is_password: true
is_read_only: true
is_numeric_only: true
draw_bg +: { ... }
draw_text +: { ... }
draw_selection +: { ... }
draw_cursor +: { ... }
label_align: Align{...}
```

### Image Properties

```
width: 200 height: 150
fit: ImageFit.Stretch    // Stretch | Horizontal | Vertical | Smallest | Biggest | Size
min_width: 100
min_height: 100
width_scale: 1.0
animation: ImageAnimation.Loop   // Stop | Once | Loop | Bounce | OnceFps(60) | LoopFps(25)
draw_bg +: {
    opacity: 1.0
    image_scale: vec2(1.0 1.0)
    image_pan: vec2(0.0 0.0)
    image_texture: texture_2d(float)
}
```

### Slider Properties

```
text: "Volume"
min: 0.0
max: 100.0
step: 1.0
default: 50.0
precision: 2
axis: DragAxis.Horizontal   // or Vertical
```

### DropDown Properties

```
labels: ["Option A" "Option B" "Option C"]
```

### PortalList Properties

```
width: Fill height: Fill
flow: Down
scroll_bar: ScrollBar{}
capture_overload: true
selectable: true
drag_scrolling: true
auto_tail: false

// Templates (named with :=)
Item := View{ height: Fit ... }
Header := View{ ... }
```

### Splitter Properties

```
axis: SplitterAxis.Horizontal   // Horizontal | Vertical
align: SplitterAlign.FromA(250.0)  // FromA(px) | FromB(px) | Weighted(0.5)
a := left_panel
b := right_panel
min_horizontal: 100.0
max_horizontal: 500.0
min_vertical: 100.0
max_vertical: 500.0
```

### Modal Properties

```
content +: {
    width: 300 height: Fit
    RoundedView{ ... }
}
```

### PageFlip Properties

```
active_page := page1
lazy_init: true
page1 := View{ ... }
page2 := View{ ... }
```

### SlidePanel Properties

```
side: SlideSide.Left    // Left | Right | Top
width: 200
height: Fill
```

## Enum Reference

### MouseCursor
`Default` `Hand` `Arrow` `Text` `Move` `Wait` `Help` `NotAllowed` `Crosshair` `Grab` `Grabbing` `NResize` `EResize` `SResize` `WResize` `NsResize` `EwResize` `ColResize` `RowResize` `Hidden`

Usage: `cursor: MouseCursor.Hand`

### ImageFit
`Stretch` `Horizontal` `Vertical` `Smallest` `Biggest` `Size`

### SplitterAxis
`Horizontal` `Vertical`

### SplitterAlign
`FromA(f64)` `FromB(f64)` `Weighted(f64)`

### SlideSide
`Left` `Right` `Top`

### Flow
`Right` `Down` `Overlay` `Flow.Right{wrap: true}` `Flow.Down{wrap: true}`

## Draw Batching

Set `new_batch: true` on any View that has `show_bg: true` AND contains text children. Without it, text from child Labels may render BEHIND the parent's background due to GPU draw call batching.

**CRITICAL for hover effects**: If a View has `show_bg: true` with a hover animator (background goes from transparent to opaque), you MUST set `new_batch: true` or text disappears on hover.

```
View{
    width: Fill height: Fit
    new_batch: true           // REQUIRED for correct layering
    show_bg: true
    draw_bg +: {
        color: uniform(#0000)
        color_hover: uniform(#fff2)
        hover: instance(0.0)
        pixel: fn(){
            return Pal.premul(self.color.mix(self.color_hover, self.hover))
        }
    }
    animator: Animator{ hover: { ... } }
    Label{ text: "This text stays visible on hover" draw_text.color: #fff }
}
```

## Rust Struct Attributes Reference

| Attribute | Purpose |
|-----------|---------|
| `#[source] source: ScriptObjectRef` | REQUIRED for Script-derived structs |
| `#[walk] walk: Walk` | Walk properties (width, height, margin) |
| `#[layout] layout: Layout` | Layout properties (flow, spacing, padding, align) |
| `#[live] field: Type` | Script-exposed property |
| `#[redraw] #[live] draw_bg: DrawQuad` | Draw property that triggers redraw |
| `#[rust] field: Type` | Runtime-only field, not in script |
| `#[deref] view: View` | Inherit from base widget |
| `#[apply_default] animator: Animator` | Animator with defaults |

### Derive Macros

| Derive | Purpose |
|--------|---------|
| `Script` | Script integration |
| `ScriptHook` | Script lifecycle hooks (on_after_apply, etc.) |
| `Widget` | Widget trait implementation |
| `Animator` | Animator support |
| `Default` | Standard default (use with `#[default]` on None variant) |

**Do NOT use `DefaultNone` derive** -- use `#[derive(Default)]` with `#[default]` attribute on the `None` variant.
