ButtonFlatter{text: "File"}
    ButtonFlatter{text: "Edit"}
    ButtonFlatter{text: "View"}
    Filler{}
    ButtonFlat{text: "Run"}
}
```

### Card Grid with Wrapping

```
use mod.prelude.widgets.*

let Card = RoundedView{
    width: 180 height: Fit
    padding: 12 flow: Down spacing: 6
    draw_bg.color: #334
    draw_bg.border_radius: 8.0
    title := Label{text: "Card" draw_text.color: #fff draw_text.text_style.font_size: 12}
    body := Label{text: "Content" draw_text.color: #aaa draw_text.text_style.font_size: 10}
}

View{
    width: Fill height: Fit
    flow: Flow.Right{wrap: true}
    spacing: 10 padding: 16
    Card{title.text: "Design" body.text: "UI mockups"}
    Card{title.text: "Backend" body.text: "API endpoints"}
    Card{title.text: "Testing" body.text: "Unit tests"}
    Card{title.text: "Deploy" body.text: "CI/CD pipeline"}
}
```

### Centered Content

```
use mod.prelude.widgets.*

View{
    width: Fill height: 400
    align: Center
    flow: Down spacing: 12
    Label{text: "Welcome" draw_text.color: #fff draw_text.text_style.font_size: 24}
    Label{text: "Click below to get started" draw_text.color: #aaa}
    Button{text: "Get Started"}
}
```

### Split Panel (Sidebar + Content)

```
use mod.prelude.widgets.*

// Simple approach with fixed sidebar
View{
    width: Fill height: Fill
    flow: Right
    SolidView{
        width: 250 height: Fill
        draw_bg.color: #1a1a2e
        flow: Down padding: 12 spacing: 8
        Label{text: "Navigation" draw_text.color: #fff draw_text.text_style.font_size: 14}
        Label{text: "Home" draw_text.color: #aaa}
        Label{text: "Settings" draw_text.color: #aaa}
        Label{text: "About" draw_text.color: #aaa}
    }
    View{
        width: Fill height: Fill
        flow: Down padding: 20 spacing: 10
        Label{text: "Main Content" draw_text.color: #fff draw_text.text_style.font_size: 16}
        Label{text: "Page body here" draw_text.color: #ddd}
    }
}

// Resizable approach with Splitter
Splitter{
    axis: SplitterAxis.Horizontal
    align: SplitterAlign.FromA(250.0)
    a := sidebar
    b := main_content
}
sidebar := SolidView{
    width: Fill height: Fill
    draw_bg.color: #1a1a2e
    flow: Down padding: 12
    Label{text: "Sidebar" draw_text.color: #fff}
}
main_content := View{
    width: Fill height: Fill
    flow: Down padding: 20
    Label{text: "Content" draw_text.color: #fff}
}
```

### Fixed Header + Scrollable Body + Fixed Footer

```
use mod.prelude.widgets.*

View{
    width: Fill height: Fill
    flow: Down

    // Fixed header
    SolidView{
        width: Fill height: Fit
        padding: Inset{top: 12 bottom: 12 left: 20 right: 20}
        draw_bg.color: #2a2a3d
        flow: Right
        align: Align{y: 0.5}
        Label{text: "App Title" draw_text.color: #fff draw_text.text_style.font_size: 16}
        Filler{}
        ButtonFlatter{text: "Settings"}
    }

    // Scrollable body (height: Fill takes remaining space)
    ScrollYView{
        width: Fill height: Fill
        flow: Down padding: 16 spacing: 10
        new_batch: true
        Label{text: "Scrollable content item 1" draw_text.color: #ddd}
        Label{text: "Scrollable content item 2" draw_text.color: #ddd}
        Label{text: "Scrollable content item 3" draw_text.color: #ddd}
        Label{text: "Scrollable content item 4" draw_text.color: #ddd}
        Label{text: "Scrollable content item 5" draw_text.color: #ddd}
    }

    // Fixed footer
    SolidView{
        width: Fill height: Fit
        padding: Inset{top: 8 bottom: 8 left: 20 right: 20}
        draw_bg.color: #1e1e2e
        flow: Right
        align: Align{y: 0.5}
        Label{text: "Status: Ready" draw_text.color: #888 draw_text.text_style.font_size: 10}
        Filler{}
        Label{text: "v1.0" draw_text.color: #666 draw_text.text_style.font_size: 10}
    }
}
```

### Overlay / Modal Positioning

```
use mod.prelude.widgets.*

View{
    width: Fill height: 400
    flow: Overlay

    // Base layer -- the page content
    View{
        width: Fill height: Fill
        flow: Down padding: 20
        Label{text: "Background page content" draw_text.color: #888}
    }

    // Overlay layer -- centered modal dialog
    View{
        width: Fill height: Fill
        align: Center
        RoundedView{
            width: 320 height: Fit
            padding: 20 flow: Down spacing: 12
            draw_bg.color: #2a2a3d
            draw_bg.border_radius: 12.0
            new_batch: true
            Label{text: "Confirm Action" draw_text.color: #fff draw_text.text_style.font_size: 16}
            Label{text: "Are you sure you want to proceed?" draw_text.color: #aaa}
            View{
                width: Fill height: Fit
                flow: Right spacing: 8
                align: Align{x: 1.0}
                ButtonFlat{text: "Cancel"}
                Button{text: "Confirm"}
            }
        }
    }
}
```

---

## Critical Rules Summary

### 1. height: Fit on ALL containers (the number one bug)

Every View, SolidView, RoundedView must have `height: Fit` unless inside a fixed-height
or Fill-height parent chain. Forgetting this makes the UI invisible (0px).

### 2. width: Fill on root container

Never use a fixed pixel width on the outermost container. It will not adapt to the
available space. Always use `width: Fill` on the root element.

### 3. new_batch: true when View has show_bg AND text children

When a container has `show_bg: true` (including SolidView, RoundedView, etc.) and
contains Labels or other text, set `new_batch: true` on the container. Without it,
text may render behind the background due to GPU draw call batching.

```
// CORRECT: new_batch ensures text draws on top of background
RoundedView{
    width: Fill height: Fit
    padding: 12 flow: Down
    draw_bg.color: #334
    draw_bg.border_radius: 8.0
    new_batch: true
    Label{text: "Visible text" draw_text.color: #fff}
}
```

### 4. Do not use Filler next to width: Fill siblings

Filler and `width: Fill` siblings compete for the same remaining space, causing 50/50
split and text clipping. Use Filler only between `width: Fit` siblings.

### 5. ScrollYView uses height: Fill, not height: Fit

Scrollable views need a fixed viewport. Use `height: Fill` on ScrollYView so it fills
the parent and scrolls its content within that space.

---

## Documentation

- Layout pattern examples and complete code: `./references/layout-patterns.md`
- Splash language manual: `/splash.md`
- Widget catalog: `/skills/makepad-2.0-widgets/references/widget-catalog.md`


## Examples

```text
User: Apply this skill to my current task.
Assistant: Follow the workflow in this skill, cite limitations, and ask before risky steps.
```

## Limitations

- Imported upstream skill; verify credentials, permissions, and safety boundaries before execution.
- Does not replace environment-specific validation, testing, or maintainer review.
