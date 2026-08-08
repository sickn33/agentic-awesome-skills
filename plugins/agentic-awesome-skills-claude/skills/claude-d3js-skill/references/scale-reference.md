# D3.js Scale Reference

Comprehensive guide to all d3 scale types with examples and use cases.

## Continuous scales

### Linear scale

Maps continuous input domain to continuous output range with linear interpolation.

```javascript
const scale = d3.scaleLinear()
  .domain([0, 100])
  .range([0, 500]);

scale(50);  // Returns 250
scale(0);   // Returns 0
scale(100); // Returns 500

// Invert scale (get input from output)
scale.invert(250); // Returns 50
```

**Use cases:**
- Most common scale for quantitative data
- Axes, bar lengths, position encoding
- Temperature, prices, counts, measurements

**Methods:**
- `.domain([min, max])` - Set input domain
- `.range([min, max])` - Set output range
- `.invert(value)` - Get domain value from range value
- `.clamp(true)` - Restrict output to range bounds
- `.nice()` - Extend domain to nice round values

### Power scale

Maps continuous input to continuous output with exponential transformation.

```javascript
const sqrtScale = d3.scalePow()
  .exponent(0.5)  // Square root
  .domain([0, 100])
  .range([0, 500]);

const squareScale = d3.scalePow()
  .exponent(2)  // Square
  .domain([0, 100])
  .range([0, 500]);

// Shorthand for square root
const sqrtScale2 = d3.scaleSqrt()
  .domain([0, 100])
  .range([0, 500]);
```

**Use cases:**
- Perceptual scaling (human perception is non-linear)
- Area encoding (use square root to map values to circle radii)
- Emphasising differences in small or large values

### Logarithmic scale

Maps continuous input to continuous output with logarithmic transformation.

```javascript
const logScale = d3.scaleLog()
  .domain([1, 1000])  // Must be positive
  .range([0, 500]);

logScale(1);    // Returns 0
logScale(10);   // Returns ~167
logScale(100);  // Returns ~333
logScale(1000); // Returns 500
```

**Use cases:**
- Data spanning multiple orders of magnitude
- Population, GDP, wealth distributions
- Logarithmic axes
- Exponential growth visualisations

**Important:** Domain values must be strictly positive (>0).

### Time scale

Specialised linear scale for temporal data.

```javascript
const timeScale = d3.scaleTime()
  .domain([new Date(2020, 0, 1), new Date(2024, 0, 1)])
  .range([0, 800]);

timeScale(new Date(2022, 0, 1)); // Returns 400

// Invert to get date
timeScale.invert(400); // Returns Date object for mid-2022
```

**Use cases:**
- Time series visualisations
- Timeline axes
- Temporal animations
- Date-based interactions

**Methods:**
- `.nice()` - Extend domain to nice time intervals
- `.ticks(count)` - Generate nicely-spaced tick values
- All linear scale methods apply

### Quantize scale

Maps continuous input to discrete output buckets.

```javascript
const quantizeScale = d3.scaleQuantize()
  .domain([0, 100])
  .range(['low', 'medium', 'high']);

quantizeScale(25);  // Returns 'low'
quantizeScale(50);  // Returns 'medium'
quantizeScale(75);  // Returns 'high'

// Get the threshold values
quantizeScale.thresholds(); // Returns [33.33, 66.67]
```

**Use cases:**
- Binning continuous data
- Heat map colours
- Risk categories (low/medium/high)
- Age groups, income brackets

### Quantile scale

Maps continuous input to discrete output based on quantiles.

```javascript
const quantileScale = d3.scaleQuantile()
  .domain([3, 6, 7, 8, 8, 10, 13, 15, 16, 20, 24]) // Sample data
  .range(['low', 'medium', 'high']);

quantileScale(8);  // Returns based on quantile position
quantileScale.quantiles(); // Returns quantile thresholds
```

**Use cases:**
- Equal-size groups regardless of distribution
- Percentile-based categorisation
- Handling skewed distributions

### Threshold scale

Maps continuous input to discrete output with custom thresholds.

```javascript
const thresholdScale = d3.scaleThreshold()
  .domain([0, 10, 20])
  .range(['freezing', 'cold', 'warm', 'hot']);

thresholdScale(-5);  // Returns 'freezing'
thresholdScale(5);   // Returns 'cold'
thresholdScale(15);  // Returns 'warm'
thresholdScale(25);  // Returns 'hot'
```

**Use cases:**
- Custom breakpoints
- Grade boundaries (A, B, C, D, F)
- Temperature categories
- Air quality indices

## Sequential scales

### Sequential colour scale

Maps continuous input to continuous colour gradient.

```javascript
const colourScale = d3.scaleSequential(d3.interpolateBlues)
  .domain([0, 100]);

colourScale(0);   // Returns lightest blue
colourScale(50);  // Returns mid blue
colourScale(100); // Returns darkest blue
```

**Available interpolators:**

**Single hue:**
- `d3.interpolateBlues`, `d3.interpolateGreens`, `d3.interpolateReds`
- `d3.interpolateOranges`, `d3.interpolatePurples`, `d3.interpolateGreys`

**Multi-hue:**
- `d3.interpolateViridis`, `d3.interpolateInferno`, `d3.interpolateMagma`
- `d3.interpolatePlasma`, `d3.interpolateWarm`, `d3.interpolateCool`
- `d3.interpolateCubehelixDefault`, `d3.interpolateTurbo`

**Use cases:**
- Heat maps, choropleth maps
- Continuous data visualisation
- Temperature, elevation, density

### Diverging colour scale

Maps continuous input to diverging colour gradient with a midpoint.

```javascript
const divergingScale = d3.scaleDiverging(d3.interpolateRdBu)
  .domain([-10, 0, 10]);

divergingScale(-10); // Returns red
divergingScale(0);   // Returns white/neutral
divergingScale(10);  // Returns blue
```

**Available interpolators:**
- `d3.interpolateRdBu` - Red to blue
- `d3.interpolateRdYlBu` - Red, yellow, blue
- `d3.interpolateRdYlGn` - Red, yellow, green
- `d3.interpolatePiYG` - Pink, yellow, green
- `d3.interpolateBrBG` - Brown, blue-green
- `d3.interpolatePRGn` - Purple, green
- `d3.interpolatePuOr` - Purple, orange
- `d3.interpolateRdGy` - Red, grey
- `d3.interpolateSpectral` - Rainbow spectrum

**Use cases:**
- Data with meaningful midpoint (zero, average, neutral)
- Positive/negative values
- Above/below comparisons
- Correlation matrices

### Sequential quantile scale

Combines sequential colour with quantile mapping.

```javascript
const sequentialQuantileScale = d3.scaleSequentialQuantile(d3.interpolateBlues)
  .domain([3, 6, 7, 8, 8, 10, 13, 15, 16, 20, 24]);

// Maps based on quantile position
```

**Use cases:**
- Perceptually uniform binning
- Handling outliers
- Skewed distributions

## Ordinal scales

### Band scale

Maps discrete input to continuous bands (rectangles) with optional padding.

```javascript
const bandScale = d3.scaleBand()
  .domain(['A', 'B', 'C', 'D'])
  .range([0, 400])
  .padding(0.1);

bandScale('A');           // Returns start position (e.g., 0)
bandScale('B');           // Returns start position (e.g., 110)
bandScale.bandwidth();    // Returns width of each band (e.g., 95)
bandScale.step();         // Returns total step including padding
bandScale.paddingInner(); // Returns inner padding (between bands)
bandScale.paddingOuter(); // Returns outer padding (at edges)
```

**Use cases:**
- Bar charts (most common use case)
- Grouped elements
- Categorical axes
- Heat map cells

**Padding options:**
- `.padding(value)` - Sets both inner and outer padding (0-1)
- `.paddingInner(value)` - Padding between bands (0-1)
- `.paddingOuter(value)` - Padding at edges (0-1)
- `.align(value)` - Alignment of bands (0-1, default 0.5)

### Point scale

Maps discrete input to continuous points (no width).

```javascript
const pointScale = d3.scalePoint()
  .domain(['A', 'B', 'C', 'D'])
  .range([0, 400])
  .padding(0.5);

pointScale('A'); // Returns position (e.g., 50)
pointScale('B'); // Returns position (e.g., 150)
pointScale('C'); // Returns position (e.g., 250)
pointScale('D'); // Returns position (e.g., 350)
pointScale.step(); // Returns distance between points
```

**Use cases:**
- Line chart categorical x-axis
- Scatter plot with categorical axis
- Node positions in network graphs
- Any point positioning for categories

### Ordinal colour scale

Maps discrete input to discrete output (colours, shapes, etc.).

```javascript
const colourScale = d3.scaleOrdinal(d3.schemeCategory10);

colourScale('apples');  // Returns first colour
colourScale('oranges'); // Returns second colour
colourScale('apples');  // Returns same first colour (consistent)

// Custom range
const customScale = d3.scaleOrdinal()
  .domain(['cat1', 'cat2', 'cat3'])
  .range(['#FF6B6B', '#4ECDC4', '#45B7D1']);
```

**Built-in colour schemes:**

**Categorical:**
- `d3.schemeCategory10` - 10 colours
- `d3.schemeAccent` - 8 colours
- `d3.schemeDark2` - 8 colours
- `d3.schemePaired` - 12 colours
- `d3.schemePastel1` - 9 colours
- `d3.schemePastel2` - 8 colours
- `d3.schemeSet1` - 9 colours
- `d3.schemeSet2` - 8 colours
- `d3.schemeSet3` - 12 colours
- `d3.schemeTableau10` - 10 colours

**Use cases:**
- Category colours
- Legend items
- Multi-series charts
- Network node types

## Scale utilities

### Nice domain

Extend domain to nice round values.

```javascript
const scale = d3.scaleLinear()
  .domain([0.201, 0.996])
  .nice();

scale.domain(); // Returns [0.2, 1.0]

// With count (approximate tick count)
const scale2 = d3.scaleLinear()
  .domain([0.201, 0.996])
  .nice(5);
```

### Clamping

Restrict output to range bounds.

```javascript
const scale = d3.scaleLinear()
  .domain([0, 100])
  .range([0, 500])
  .clamp(true);

scale(-10); // Returns 0 (clamped)
scale(150); // Returns 500 (clamped)
```

### Copy scales

Create independent copies.

```javascript
const scale1 = d3.scaleLinear()
  .domain([0, 100])
  .range([0, 500]);

const scale2 = scale1.copy();
// scale2 is independent of scale1
```

### Tick generation

Generate nice tick values for axes.

```javascript
const scale = d3.scaleLinear()
  .domain([0, 100])
  .range([0, 500]);

scale.ticks(10);        // Generate ~10 ticks
scale.tickFormat(10);   // Get format function for ticks
scale.tickFormat(10, ".2f"); // Custom format (2 decimal places)

// Time scale ticks
const timeScale = d3.scaleTime()
  .domain([new Date(2020, 0, 1), new Date(2024, 0, 1)]);

timeScale.ticks(d3.timeYear);      // Yearly ticks
timeScale.ticks(d3.timeMonth, 3);  // Every 3 months
timeScale.tickFormat(5, "%Y-%m");  // Format as year-month
```

## Colour spaces and interpolation

### RGB interpolation

```javascript
const scale = d3.scaleLinear()
  .domain([0, 100])
  .range(["blue", "red"]);
// Default: RGB interpolation
```

### HSL interpolation

```javascript
const scale = d3.scaleLinear()
  .domain([0, 100])
  .range(["blue", "red"])
  .interpolate(d3.interpolateHsl);
// Smoother colour transitions
```

### Lab interpolation

```javascript
const scale = d3.scaleLinear()
  .domain([0, 100])
  .range(["blue", "red"])
  .interpolate(d3.interpolateLab);
// Perceptually uniform
```

### HCL interpolation

```javascript
const scale = d3.scaleLinear()
  .domain([0, 100])
  .range(["blue", "red"])
  .interpolate(d3.interpolateHcl);
// Perceptually uniform with hue
```

## Common patterns

### Diverging scale with custom midpoint

```javascript
const scale = d3.scaleLinear()
  .domain([min, midpoint, max])
  .range(["red", "white", "blue"])
  .interpolate(d3.interpolateHcl);
```

### Multi-stop gradient scale

```javascript
const scale = d3.scaleLinear()
  .domain([0, 25, 50, 75, 100])
  .range(["#d53e4f", "#fc8d59", "#fee08b", "#e6f598", "#66c2a5"]);
```

### Radius scale for circles (perceptual)

```javascript
const radiusScale = d3.scaleSqrt()
  .domain([0, d3.max(data, d => d.value)])
  .range([0, 50]);

// Use with circles
circle.attr("r", d => radiusScale(d.value));
```

### Adaptive scale based on data range

```javascript
function createAdaptiveScale(data) {
  const extent = d3.extent(data);
  const range = extent[1] - extent[0];
  
  // Use log scale if data spans >2 orders of magnitude
  if (extent[1] / extent[0] > 100) {
    return d3.scaleLog()
      .domain(extent)
      .range([0, width]);
  }
  
  // Otherwise use linear
  return d3.scaleLinear()
    .domain(extent)
    .range([0, width]);
}
```

### Colour scale with explicit categories

```javascript
const colourScale = d3.scaleOrdinal()
  .domain(['Low Risk', 'Medium Risk', 'High Risk'])
  .range(['#2ecc71', '#f39c12', '#e74c3c'])
  .unknown('#95a5a6'); // Fallback for unknown values
```