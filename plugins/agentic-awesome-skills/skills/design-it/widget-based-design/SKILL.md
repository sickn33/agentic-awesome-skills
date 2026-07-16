---
name: widget-based-design
description: Web and App implementation guide for Widget-Based Design. Trigger when user wants modular blocks, iOS Home Screen aesthetics, and customizable mini-apps.
date_added: "2026-06-17"
risk: safe
source: self
source_type: self
---

# Widget-Based Design

> "Miniature applications. Small, highly functional blocks of UI designed to be rearranged."


## When to Use
Use this sub-style when the user's request matches the aesthetic described above. This is a child reference of the `design-it` skill and is not meant to be triggered directly.

## Core Principles
1. **Strict Aspect Ratios**: Widgets usually follow strict sizes (1x1 square, 2x1 rectangle, 2x2 large square).
2. **Glanceability**: Widgets show the most important piece of data instantly. Deep interaction usually requires opening the full app.
3. **Corner Radius Match**: The inner content's border radius should perfectly nest within the widget's outer border radius.

## Visual DNA
- **Colors**: Widgets often use bright, solid color backgrounds or full-bleed photos to differentiate themselves.
- **Typography**: Large, bold numbers (like a clock or weather temp) paired with tiny sub-labels.
- **Layout**: Similar to Bento UI, but specifically focused on functional app-lets rather than just content layout.

## Web Implementation
- **CSS Example**:
```css
.widget-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
  grid-auto-rows: 160px; /* Force squares */
  gap: 16px;
  padding: 32px;
}

.widget {
  background-color: #ffffff;
  border-radius: 24px; /* Classic iOS widget radius */
  box-shadow: 0 8px 24px rgba(0,0,0,0.08);
  padding: 16px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  overflow: hidden;
  position: relative;
}

/* Specific Sizes */
.widget-small { grid-column: span 1; grid-row: span 1; }
.widget-medium { grid-column: span 2; grid-row: span 1; }
.widget-large { grid-column: span 2; grid-row: span 2; }

/* Weather Widget Example */
.widget.weather {
  background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
  color: white;
}
.weather-temp { font-size: 3rem; font-weight: 300; }
.weather-icon { position: absolute; top: 16px; right: 16px; font-size: 2rem; }
```

## App Implementation

### SwiftUI
```swift
struct WidgetDesignView: View {
    let columns = [GridItem(.flexible(), spacing: 16), GridItem(.flexible(), spacing: 16)]
    
    var body: some View {
        ScrollView {
            LazyVGrid(columns: columns, spacing: 16) {
                // 2x1 Widget
                WeatherWidget()
                    .frame(height: 160) // Base unit height
                
                // 1x1 Widget
                FitnessWidget()
                    .frame(height: 160)
                
                // 1x1 Widget
                MusicWidget()
                    .frame(height: 160)
            }
            .padding(24)
        }
        .background(Color(white: 0.95))
    }
}

struct WeatherWidget: View {
    var body: some View {
        ZStack(alignment: .topTrailing) {
            LinearGradient(colors: [Color(hex: "4facfe"), Color(hex: "00f2fe")], startPoint: .topLeading, endPoint: .bottomTrailing)
            
            Image(systemName: "cloud.sun.fill")
                .foregroundColor(.white)
                .font(.system(size: 40))
                .padding()
            
            VStack(alignment: .leading) {
                Spacer()
                Text("72°")
                    .font(.system(size: 48, weight: .thin))
                    .foregroundColor(.white)
                Text("San Francisco")
                    .font(.subheadline)
                    .foregroundColor(.white.opacity(0.8))
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding()
        }
        .cornerRadius(24) // Classic iOS widget radius
        .shadow(color: .black.opacity(0.1), radius: 10, y: 5)
    }
}
```
- SwiftUI is perfect for this. The `LazyVGrid` handles the layout, and `cornerRadius(24)` matches Apple's default widget styling perfectly.
- Use `ZStack` as the root of the widget to easily overlay content on top of complex gradients or images.

### Flutter
```dart
class WidgetDesignScreen extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF2F2F2),
      body: GridView.count(
        crossAxisCount: 2, // 2 columns for a typical phone
        padding: const EdgeInsets.all(24),
        mainAxisSpacing: 16,
        crossAxisSpacing: 16,
        childAspectRatio: 1.0, // 1x1 squares
        children: [
          // Note: Flutter GridView doesn't easily span rows/cols out of the box.
          // flutter_staggered_grid_view is highly recommended for real widget layouts.
          _buildWeatherWidget(),
          _buildFitnessWidget(),
          _buildMusicWidget(),
        ],
      ),
    );
  }

  Widget _buildWeatherWidget() {
    return Container(
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(24),
        gradient: const LinearGradient(colors: [Color(0xFF4FACFE), Color(0xFF00F2FE)]),
        boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.1), blurRadius: 10, offset: const Offset(0, 5))],
      ),
      padding: const EdgeInsets.all(16),
      child: Stack(
        children: [
          const Align(
            alignment: Alignment.topRight,
            child: Icon(Icons.cloud, color: Colors.white, size: 40),
          ),
          Align(
            alignment: Alignment.bottomLeft,
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text('72°', style: TextStyle(color: Colors.white, fontSize: 48, fontWeight: FontWeight.w300)),
                Text('San Francisco', style: TextStyle(color: Colors.white.withOpacity(0.8), fontSize: 14)),
              ],
            ),
          )
        ],
      ),
    );
  }
}
```
- A `Stack` inside a `Container` with `BorderRadius.circular(24)` is the blueprint for every widget.
- Standard `GridView` is too rigid for mixed 2x1 and 1x1 widgets. Use the `flutter_staggered_grid_view` package for production apps.

### React Native
```jsx
const WidgetDesignScreen = () => {
  return (
    <ScrollView style={{ flex: 1, backgroundColor: '#F2F2F2' }} contentContainerStyle={{ padding: 24 }}>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 16 }}>
        
        {/* 2x1 Widget (Full width minus padding) */}
        <View style={[styles.widget, { width: '100%' }]}>
          <LinearGradient colors={['#4facfe', '#00f2fe']} style={styles.widgetBg} />
          <Text style={styles.temp}>72°</Text>
          <Text style={styles.sub}>San Francisco</Text>
        </View>

        {/* 1x1 Widgets (Half width minus half gap) */}
        <View style={[styles.widget, { width: '47%' }]}><Text>Fitness</Text></View>
        <View style={[styles.widget, { width: '47%' }]}><Text>Music</Text></View>

      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  widget: {
    height: 160, // Fixed height forces square/rectangular aspect ratios
    borderRadius: 24,
    backgroundColor: '#FFF',
    padding: 16,
    justifyContent: 'flex-end',
    shadowColor: '#000', shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.1, shadowRadius: 10, elevation: 5,
    overflow: 'hidden'
  },
  widgetBg: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 24,
  },
  temp: { fontSize: 48, fontWeight: '300', color: '#FFF' },
  sub: { fontSize: 14, color: 'rgba(255,255,255,0.8)' }
});
```
- In React Native, `flexWrap: 'wrap'` combined with percentage widths (e.g., `47%` for 2 columns with a gap) is the cleanest way to build a responsive widget layout.
- If using `LinearGradient` from `expo-linear-gradient` or `react-native-linear-gradient`, apply `StyleSheet.absoluteFillObject` so it sits behind the text.

### Jetpack Compose
```kotlin
@Composable
fun WidgetDesignScreen() {
    LazyVerticalGrid(
        columns = GridCells.Fixed(2),
        modifier = Modifier.fillMaxSize().background(Color(0xFFF2F2F2)).padding(24.dp),
        horizontalArrangement = Arrangement.spacedBy(16.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        // 2x1 Widget (Spans both columns)
        item(span = { GridItemSpan(2) }) {
            WeatherWidget(Modifier.height(160.dp))
        }
        // 1x1 Widgets
        item { Box(Modifier.height(160.dp).background(Color.White, RoundedCornerShape(24.dp))) }
        item { Box(Modifier.height(160.dp).background(Color.White, RoundedCornerShape(24.dp))) }
    }
}

@Composable
fun WeatherWidget(modifier: Modifier = Modifier) {
    Box(
        modifier = modifier
            .fillMaxWidth()
            .shadow(10.dp, RoundedCornerShape(24.dp))
            .background(Brush.linearGradient(listOf(Color(0xFF4FACFE), Color(0xFF00F2FE))), RoundedCornerShape(24.dp))
            .padding(16.dp)
    ) {
        // Icon
        Icon(Icons.Filled.Cloud, contentDescription = null, tint = Color.White, modifier = Modifier.align(Alignment.TopEnd).size(40.dp))
        
        // Data
        Column(modifier = Modifier.align(Alignment.BottomStart)) {
            Text("72°", fontSize = 48.sp, fontWeight = FontWeight.Light, color = Color.White)
            Text("San Francisco", fontSize = 14.sp, color = Color.White.copy(alpha = 0.8f))
        }
    }
}
```
- `LazyVerticalGrid` with `GridCells.Fixed(2)` and `GridItemSpan` perfectly recreate iOS widget grids.
- `RoundedCornerShape(24.dp)` is essential to sell the look.

## Do's and Don'ts
- **DO**: Use full-bleed background colors to make different widgets stand out.
- **DON'T**: Put complex forms or scrollable lists inside a 1x1 widget.

## Limitations
- This is a styling reference and does not replace environment-specific validation, accessibility testing, or expert review.
- Ensure appropriate contrast ratios and responsive behaviors are verified separately.
