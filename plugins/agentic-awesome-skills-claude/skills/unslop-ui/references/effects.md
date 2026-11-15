# Effects

Code treatments that turn an image into something made for this page. They are optional. Use one only when it fits the character in the direction, on the main visual only, and never as decoration on other elements.

## Glyphs

Draw the image as a grid of characters, brightness picking the character. It works best when the characters come from the product's own material, so the image is literally made of what the product deals with.

- Money, invoices, finance: `. : 1 7 4 0 8 $ %`
- Code, developer tools: `. : / { } < > = #`
- Music: note names like `c d e g a` and `♭ ♯`
- Writing, reading: lowercase letters of a word from the product
- Data, monitoring: `. · : | + ▪`

Keep the cell between 6 and 10px, use the mono from the type choice, and color the glyphs from the image or from the ramp. Let a few cells change slowly over time so the picture feels alive.

### Implementation

```js
function glyphs(canvas, image, { cell = 8, chars = ". :1740$%", font = "Geist Mono", fps = 8 } = {}) {
  const ctx = canvas.getContext("2d");
  const columns = Math.floor(canvas.width / cell);
  const rows = Math.floor(canvas.height / cell);

  const sample = document.createElement("canvas");
  sample.width = columns;
  sample.height = rows;
  const sampler = sample.getContext("2d", { willReadFrequently: true });
  sampler.drawImage(image, 0, 0, columns, rows);
  const pixels = sampler.getImageData(0, 0, columns, rows).data;

  const atlas = document.createElement("canvas");
  atlas.width = cell * chars.length;
  atlas.height = cell;
  const pen = atlas.getContext("2d");
  pen.font = `500 ${cell + 1}px ${font}`;
  pen.textAlign = "center";
  pen.textBaseline = "middle";
  pen.fillStyle = "#fff";
  [...chars].forEach((char, index) => pen.fillText(char, index * cell + cell / 2, cell / 2));

  const cells = [];
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < columns; x++) {
      const i = (y * columns + x) * 4;
      const light = (0.2126 * pixels[i] + 0.7152 * pixels[i + 1] + 0.0722 * pixels[i + 2]) / 255;
      cells.push({ x, y, light, color: `rgb(${pixels[i]},${pixels[i + 1]},${pixels[i + 2]})`, seed: Math.random() });
    }
  }

  const tinted = document.createElement("canvas");
  tinted.width = cell;
  tinted.height = cell;
  const tint = tinted.getContext("2d");

  const draw = (step) => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (const c of cells) {
      if (c.light < 0.06) continue;
      const jitter = Math.sin(c.seed * 999 + step) > 0.92 ? 1 : 0;
      const pick = Math.min(chars.length - 1, Math.floor(c.light * chars.length) + jitter);
      tint.globalCompositeOperation = "copy";
      tint.drawImage(atlas, pick * cell, 0, cell, cell, 0, 0, cell, cell);
      tint.globalCompositeOperation = "source-in";
      tint.fillStyle = c.color;
      tint.fillRect(0, 0, cell, cell);
      ctx.drawImage(tinted, c.x * cell, c.y * cell);
    }
  };

  let frame = 0;
  let last = 0;
  let step = 0;
  let visible = true;
  new IntersectionObserver(([entry]) => (visible = entry.isIntersecting)).observe(canvas);
  const loop = (now) => {
    frame = requestAnimationFrame(loop);
    if (!visible || now - last < 1000 / fps) return;
    last = now;
    draw(step++);
  };
  frame = requestAnimationFrame(loop);
  return () => cancelAnimationFrame(frame);
}
```

For a large canvas, bake the tinted glyphs for each cell once into an offscreen canvas and only redraw the cells that change on a step.

## Halftone dots

Dots on a grid whose size follows brightness. Suits editorial, print and crafted characters. Same sampling as glyphs, but draw `arc` circles with a radius of `light * cell / 2` in one ink color on the page color.

## Dithering

An ordered or error diffusion dither into two or three colors from the ramp. Suits retro, technical and playful characters. Do it once when the image loads, not on every frame.

## Duotone

Map the image's brightness onto two colors, the darkest surface of the ramp and the accent or the primary text color. The simplest way to make any generated image belong to the palette. In CSS, a grayscale image under a `mix-blend-mode: color` layer of the accent, or an SVG `feColorMatrix` filter.

## Performance

These effects broke on weak laptops before, so keep to these rules.

- Read pixels once when the image loads. Never call `getImageData` inside the animation loop, it stalls the GPU and drops frames to single digits.
- Prepare glyph atlases and tinted cells ahead of time and draw them with `drawImage`.
- Animate at 8 to 12 steps per second, not 60, and change only a small share of cells per step.
- Pause when the canvas is off screen.
- Size the canvas for the device pixel ratio, but cap it at 2.

---

Part of unslop by Damir Sokolovsky ([@heydamir](https://x.com/heydamir)), CC BY 4.0. Keep this credit in copies and adaptations.
