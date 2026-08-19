# D2 Styling and Customization Guide

Guidance on themes, palettes, styling properties, typography, and visual hierarchy in D2.

## 1. Built-In Themes

D2 comes with several built-in themes that can be enabled globally or per diagram.

### Common Theme IDs
- `0`: Default D2 theme (modern, balanced colors).
- `1`: Neutral Default (grayscale with subtle accents).
- `3`: Cool Classics (calm blues and teals).
- `4`: Mixed Berry (warm purples and magentas).
- `5`: Classic Milk (soft paper-like tones).
- `6`: Earth Tones (warm greens, browns, and ambers).
- `7`: Flagship Terracotta (warm orange and terracotta).
- `8`: Mint (fresh greens and soft mints).
- `100`: Grape (vibrant purples and violets).
- `300`: Terminal (dark mode with high-contrast neon accents).
- `301`: Terminal Grayscale (dark mode monochromatic).

### Theme Selection in CLI / Config
When compiling via D2 CLI:
```bash
d2 --theme 300 input.d2 output.svg
```

## 2. Element Styling Properties

You can style individual nodes, containers, or connections using the `style` block.

### Node and Container Properties
- `fill`: Background fill color (hex code or keyword).
- `stroke`: Border or outline color.
- `stroke-width`: Thickness of the border (integer, e.g., `1`, `2`, `3`).
- `stroke-dash`: Dashed border length (e.g., `5` for dashed line, `0` for solid).
- `border-radius`: Corner rounding in pixels (e.g., `6`, `12`).
- `shadow`: Enable drop shadow (`true` / `false`).
- `opacity`: Transparency value between `0.0` and `1.0`.
- `font-color`: Text label color.
- `font-size`: Text font size in points.
- `bold`: Make text bold (`true` / `false`).
- `italic`: Make text italic (`true` / `false`).
- `underline`: Underline text (`true` / `false`).

### Connection Properties
- `stroke`: Line color.
- `stroke-width`: Line thickness.
- `stroke-dash`: Line dash pattern (`5` for dashed, `2` for dotted).
- `animated`: Animates the connection stroke in SVG outputs (`true`).

```d2
node_sample: Sample Component {
  style: {
    fill: "#e8f0fe"
    stroke: "#1a73e8"
    stroke-width: 2
    border-radius: 8
    shadow: true
    font-color: "#202124"
    bold: true
  }
}
```

## 3. Reusable Classes

Define class presets under the root `classes` block to eliminate duplication.

```d2
classes: {
  microservice: {
    style: {
      fill: "#e8f0fe"
      stroke: "#1a73e8"
      border-radius: 6
      font-size: 14
    }
  }
  database: {
    shape: cylinder
    style: {
      fill: "#e6f4ea"
      stroke: "#137333"
    }
  }
  queue: {
    shape: queue
    style: {
      fill: "#fef7e0"
      stroke: "#b06000"
    }
  }
  alert: {
    style: {
      fill: "#fce8e6"
      stroke: "#c5221f"
      stroke-dash: 4
    }
  }
}

auth.class: microservice
payments.class: microservice
main_db.class: database
task_bus.class: queue
dead_letter.class: alert
```

## 4. Semantic Color Palettes

Consistent color semantics enhance visual readability:

- **Primary / Core Services**: Blues (`#e8f0fe` fill, `#1a73e8` border).
- **Data Stores & Caches**: Greens (`#e6f4ea` fill, `#137333` border).
- **Message Brokers & Async**: Yellows / Oranges (`#fef7e0` fill, `#b06000` border).
- **Security & Identity**: Purples (`#f3e8fd` fill, `#8430ce` border).
- **External / Third-Party**: Grays (`#f1f3f4` fill, `#5f6368` border).
- **Errors, DLQs & Fallbacks**: Reds (`#fce8e6` fill, `#c5221f` border).
