# D3.js Colour Schemes and Palette Recommendations

Comprehensive guide to colour selection in data visualisation with d3.js.

## Built-in categorical colour schemes

### Category10 (default)

```javascript
d3.schemeCategory10
// ['#1f77b4', '#ff7f0e', '#2ca02c', '#d62728', '#9467bd',
//  '#8c564b', '#e377c2', '#7f7f7f', '#bcbd22', '#17becf']
```

**Characteristics:**
- 10 distinct colours
- Good colour-blind accessibility
- Default choice for most categorical data
- Balanced saturation and brightness

**Use cases:** General purpose categorical encoding, legend items, multiple data series

### Tableau10

```javascript
d3.schemeTableau10
```

**Characteristics:**
- 10 colours optimised for data visualisation
- Professional appearance
- Excellent distinguishability

**Use cases:** Business dashboards, professional reports, presentations

### Accent

```javascript
d3.schemeAccent
// 8 colours with high saturation
```

**Characteristics:**
- Bright, vibrant colours
- High contrast
- Modern aesthetic

**Use cases:** Highlighting important categories, modern web applications

### Dark2

```javascript
d3.schemeDark2
// 8 darker, muted colours
```

**Characteristics:**
- Subdued palette
- Professional appearance
- Good for dark backgrounds

**Use cases:** Dark mode visualisations, professional contexts

### Paired

```javascript
d3.schemePaired
// 12 colours in pairs of similar hues
```

**Characteristics:**
- Pairs of light and dark variants
- Useful for nested categories
- 12 distinct colours

**Use cases:** Grouped bar charts, hierarchical categories, before/after comparisons

### Pastel1 & Pastel2

```javascript
d3.schemePastel1 // 9 colours
d3.schemePastel2 // 8 colours
```

**Characteristics:**
- Soft, low-saturation colours
- Gentle appearance
- Good for large areas

**Use cases:** Background colours, subtle categorisation, calming visualisations

### Set1, Set2, Set3

```javascript
d3.schemeSet1 // 9 colours - vivid
d3.schemeSet2 // 8 colours - muted
d3.schemeSet3 // 12 colours - pastel
```

**Characteristics:**
- Set1: High saturation, maximum distinction
- Set2: Professional, balanced
- Set3: Subtle, many categories

**Use cases:** Varied based on visual hierarchy needs

## Sequential colour schemes

Sequential schemes map continuous data from low to high values using a single hue or gradient.

### Single-hue sequential

**Blues:**
```javascript
d3.interpolateBlues
d3.schemeBlues[9] // 9-step discrete version
```

**Other single-hue options:**
- `d3.interpolateGreens` / `d3.schemeGreens`
- `d3.interpolateOranges` / `d3.schemeOranges`
- `d3.interpolatePurples` / `d3.schemePurples`
- `d3.interpolateReds` / `d3.schemeReds`
- `d3.interpolateGreys` / `d3.schemeGreys`

**Use cases:**
- Simple heat maps
- Choropleth maps
- Density plots
- Single-metric visualisations

### Multi-hue sequential

**Viridis (recommended):**
```javascript
d3.interpolateViridis
```

**Characteristics:**
- Perceptually uniform
- Colour-blind friendly
- Print-safe
- No visual dead zones
- Monotonically increasing perceived lightness

**Other perceptually-uniform options:**
- `d3.interpolatePlasma` - Purple to yellow
- `d3.interpolateInferno` - Black to white through red/orange
- `d3.interpolateMagma` - Black to white through purple
- `d3.interpolateCividis` - Colour-blind optimised

**Colour-blind accessible:**
```javascript
d3.interpolateTurbo // Rainbow-like but perceptually uniform
d3.interpolateCool  // Cyan to magenta
d3.interpolateWarm  // Orange to yellow
```

**Use cases:**
- Scientific visualisation
- Medical imaging
- Any high-precision data visualisation
- Accessible visualisations

### Traditional sequential

**Yellow-Orange-Red:**
```javascript
d3.interpolateYlOrRd
d3.schemeYlOrRd[9]
```

**Yellow-Green-Blue:**
```javascript
d3.interpolateYlGnBu
d3.schemeYlGnBu[9]
```

**Other multi-hue:**
- `d3.interpolateBuGn` - Blue to green
- `d3.interpolateBuPu` - Blue to purple
- `d3.interpolateGnBu` - Green to blue
- `d3.interpolateOrRd` - Orange to red
- `d3.interpolatePuBu` - Purple to blue
- `d3.interpolatePuBuGn` - Purple to blue-green
- `d3.interpolatePuRd` - Purple to red
- `d3.interpolateRdPu` - Red to purple
- `d3.interpolateYlGn` - Yellow to green
- `d3.interpolateYlOrBr` - Yellow to orange-brown

**Use cases:** Traditional data visualisation, familiar colour associations (temperature, vegetation, water)

## Diverging colour schemes

Diverging schemes highlight deviations from a central value using two distinct hues.

### Red-Blue (temperature)

```javascript
d3.interpolateRdBu
d3.schemeRdBu[11]
```

**Characteristics:**
- Intuitive temperature metaphor
- Strong contrast
- Clear positive/negative distinction

**Use cases:** Temperature, profit/loss, above/below average, correlation

### Red-Yellow-Blue

```javascript
d3.interpolateRdYlBu
d3.schemeRdYlBu[11]
```

**Characteristics:**
- Three-colour gradient
- Softer transition through yellow
- More visual steps

**Use cases:** When extreme values need emphasis and middle needs visibility

### Other diverging schemes

**Traffic light:**
```javascript
d3.interpolateRdYlGn // Red (bad) to green (good)
```

**Spectral (rainbow):**
```javascript
d3.interpolateSpectral // Full spectrum
```

**Other options:**
- `d3.interpolateBrBG` - Brown to blue-green
- `d3.interpolatePiYG` - Pink to yellow-green
- `d3.interpolatePRGn` - Purple to green
- `d3.interpolatePuOr` - Purple to orange
- `d3.interpolateRdGy` - Red to grey

**Use cases:** Choose based on semantic meaning and accessibility needs

## Colour-blind friendly palettes

### General guidelines

1. **Avoid red-green combinations** (most common colour blindness)
2. **Use blue-orange diverging** instead of red-green
3. **Add texture or patterns** as redundant encoding
4. **Test with simulation tools**

### Recommended colour-blind safe schemes

**Categorical:**
```javascript
// Okabe-Ito palette (colour-blind safe)
const okabePalette = [
  '#E69F00', // Orange
  '#56B4E9', // Sky blue
  '#009E73', // Bluish green
  '#F0E442', // Yellow
  '#0072B2', // Blue
  '#D55E00', // Vermillion
  '#CC79A7', // Reddish purple
  '#000000'  // Black
];

const colourScale = d3.scaleOrdinal()
  .domain(categories)
  .range(okabePalette);
```

**Sequential:**
```javascript
// Use Viridis, Cividis, or Blues
d3.interpolateViridis  // Best overall
d3.interpolateCividis  // Optimised for CVD
d3.interpolateBlues    // Simple, safe
```

**Diverging:**
```javascript
// Use blue-orange instead of red-green
d3.interpolateBrBG
d3.interpolatePuOr
```

## Custom colour palettes

### Creating custom sequential

```javascript
const customSequential = d3.scaleLinear()
  .domain([0, 100])
  .range(['#e8f4f8', '#006d9c']) // Light to dark blue
  .interpolate(d3.interpolateLab); // Perceptually uniform
```

### Creating custom diverging

```javascript
const customDiverging = d3.scaleLinear()
  .domain([0, 50, 100])
  .range(['#ca0020', '#f7f7f7', '#0571b0']) // Red, grey, blue
  .interpolate(d3.interpolateLab);
```

### Creating custom categorical

```javascript
// Brand colours
const brandPalette = [
  '#FF6B6B', // Primary red
  '#4ECDC4', // Secondary teal
  '#45B7D1', // Tertiary blue
  '#FFA07A', // Accent coral
  '#98D8C8'  // Accent mint
];

const colourScale = d3.scaleOrdinal()
  .domain(categories)
  .range(brandPalette);
```

## Semantic colour associations

### Universal colour meanings

**Red:**
- Danger, error, negative
- High temperature
- Debt, loss

**Green:**
- Success, positive
- Growth, vegetation
- Profit, gain

**Blue:**
- Trust, calm
- Water, cold
- Information, neutral

**Yellow/Orange:**
- Warning, caution
- Energy, warmth
- Attention

**Grey:**
- Neutral, inactive
- Missing data
- Background

### Context-specific palettes

**Financial:**
```javascript
const financialColours = {
  profit: '#27ae60',
  loss: '#e74c3c',
  neutral: '#95a5a6',
  highlight: '#3498db'
};
```

**Temperature:**
```javascript
const temperatureScale = d3.scaleSequential(d3.interpolateRdYlBu)
  .domain([40, -10]); // Hot to cold (reversed)
```

**Traffic/Status:**
```javascript
const statusColours = {
  success: '#27ae60',
  warning: '#f39c12',
  error: '#e74c3c',
  info: '#3498db',
  neutral: '#95a5a6'
};
```

## Accessibility best practices

### Contrast ratios

Ensure sufficient contrast between colours and backgrounds:

```javascript
// Good contrast example
const highContrast = {
  background: '#ffffff',
  text: '#2c3e50',
  primary: '#3498db',
  secondary: '#e74c3c'
};
```

**WCAG guidelines:**
- Normal text: 4.5:1 minimum
- Large text: 3:1 minimum
- UI components: 3:1 minimum

### Redundant encoding

Never rely solely on colour to convey information:

```javascript
// Add patterns or shapes
const symbols = ['circle', 'square', 'triangle', 'diamond'];

// Add text labels
// Use line styles (solid, dashed, dotted)
// Use size encoding
```

### Testing

Test visualisations for colour blindness:
- Chrome DevTools (Rendering > Emulate vision deficiencies)
- Colour Oracle (free desktop application)
- Coblis (online simulator)

## Professional colour recommendations

### Data journalism

```javascript
// Guardian style
const guardianPalette = [
  '#005689', // Guardian blue
  '#c70000', // Guardian red
  '#7d0068', // Guardian pink
  '#951c75', // Guardian purple
];

// FT style
const ftPalette = [
  '#0f5499', // FT blue
  '#990f3d', // FT red
  '#593380', // FT purple
  '#262a33', // FT black
];
```

### Academic/Scientific

```javascript
// Nature journal style
const naturePalette = [
  '#0071b2', // Blue
  '#d55e00', // Vermillion
  '#009e73', // Green
  '#f0e442', // Yellow
];

// Use Viridis for continuous data
const scientificScale = d3.scaleSequential(d3.interpolateViridis);
```

### Corporate/Business

```javascript
// Professional, conservative
const corporatePalette = [
  '#003f5c', // Dark blue
  '#58508d', // Purple
  '#bc5090', // Magenta
  '#ff6361', // Coral
  '#ffa600'  // Orange
];
```

## Dynamic colour selection

### Based on data range

```javascript
function selectColourScheme(data) {
  const extent = d3.extent(data);
  const hasNegative = extent[0] < 0;
  const hasPositive = extent[1] > 0;
  
  if (hasNegative && hasPositive) {
    // Diverging: data crosses zero
    return d3.scaleSequentialSymlog(d3.interpolateRdBu)
      .domain([extent[0], 0, extent[1]]);
  } else {
    // Sequential: all positive or all negative
    return d3.scaleSequential(d3.interpolateViridis)
      .domain(extent);
  }
}
```

### Based on category count

```javascript
function selectCategoricalScheme(categories) {
  const n = categories.length;
  
  if (n <= 10) {
    return d3.scaleOrdinal(d3.schemeTableau10);
  } else if (n <= 12) {
    return d3.scaleOrdinal(d3.schemePaired);
  } else {
    // For many categories, use sequential with quantize
    return d3.scaleQuantize()
      .domain([0, n - 1])
      .range(d3.quantize(d3.interpolateRainbow, n));
  }
}
```

## Common colour mistakes to avoid

1. **Rainbow gradients for sequential data**
   - Problem: Not perceptually uniform, hard to read
   - Solution: Use Viridis, Blues, or other uniform schemes

2. **Red-green for diverging (colour blindness)**
   - Problem: 8% of males can't distinguish
   - Solution: Use blue-orange or purple-green

3. **Too many categorical colours**
   - Problem: Hard to distinguish and remember
   - Solution: Limit to 5-8 categories, use grouping

4. **Insufficient contrast**
   - Problem: Poor readability
   - Solution: Test contrast ratios, use darker colours on light backgrounds

5. **Culturally inconsistent colours**
   - Problem: Confusing semantic meaning
   - Solution: Research colour associations for target audience

6. **Inverted temperature scales**
   - Problem: Counterintuitive (red = cold)
   - Solution: Red/orange = hot, blue = cold

## Quick reference guide

**Need to show...**

- **Categories (≤10):** `d3.schemeCategory10` or `d3.schemeTableau10`
- **Categories (>10):** `d3.schemePaired` or group categories
- **Sequential (general):** `d3.interpolateViridis`
- **Sequential (scientific):** `d3.interpolateViridis` or `d3.interpolatePlasma`
- **Sequential (temperature):** `d3.interpolateRdYlBu` (inverted)
- **Diverging (zero):** `d3.interpolateRdBu` or `d3.interpolateBrBG`
- **Diverging (good/bad):** `d3.interpolateRdYlGn` (inverted)
- **Colour-blind safe (categorical):** Okabe-Ito palette (shown above)
- **Colour-blind safe (sequential):** `d3.interpolateCividis` or `d3.interpolateBlues`
- **Colour-blind safe (diverging):** `d3.interpolatePuOr` or `d3.interpolateBrBG`

**Always remember:**
1. Test for colour-blindness
2. Ensure sufficient contrast
3. Use semantic colours appropriately
4. Add redundant encoding (patterns, labels)
5. Keep it simple (fewer colours = clearer visualisation)