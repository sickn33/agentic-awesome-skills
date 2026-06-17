---
name: maximalism
description: Web and App implementation guide for Controlled Maximalism. Trigger when user wants lots of elements, dense content, but a highly curated and artistic presentation.
date_added: "2026-06-17"
risk: safe
source: self
source_type: self
---

# Controlled Maximalism

> "Dense and rich, but deeply intentional. Like an exquisitely curated museum of artifacts."


## When to Use
Use this sub-style when the user's request matches the aesthetic described above. This is a child reference of the `design-it` skill and is not meant to be triggered directly.

## Core Principles
1. **High Density**: The screen is packed with information, imagery, and interactive elements.
2. **Ornate Detailing**: Use of decorative borders, intricate textures, and classic design flourishes.
3. **Structured Chaos**: Unlike Vibrant Maximalism, the layout here is based on a strict underlying grid that holds the massive amount of content together.

## Visual DNA
- **Colors**: **Monochromatic Brown**, **Yacht Club**, or rich jewel tones (emerald, ruby, sapphire, gold).
- **Typography**: Ornate serifs (like `Cinzel` or `Playfair Display`) paired with dense, highly legible sans-serif body copy.
- **Borders & Dividers**: Extensive use of thin, elegant lines separating every piece of content.

## Web Implementation
- Use dense CSS Grid layouts.
- **CSS Example**:
```css
body {
  background-color: #0F172A; /* Deep slate */
  color: #E2E8F0;
  background-image: url('subtle-damask-pattern.png');
}

.max-grid {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: 16px;
  padding: 16px;
}

.max-item {
  background-color: rgba(30, 41, 59, 0.9); /* Semi-transparent over pattern */
  border: 1px solid #475569;
  padding: 24px;
}

/* Ornate decorative borders */
.max-feature {
  grid-column: span 3;
  border: 2px solid #D4AF37; /* Gold */
  position: relative;
}

.max-feature::before {
  content: '';
  position: absolute;
  top: 4px; left: 4px; right: 4px; bottom: 4px;
  border: 1px dashed #D4AF37;
}

.max-title {
  font-family: 'Cinzel', serif;
  color: #D4AF37;
  font-size: 2.5rem;
  text-align: center;
  border-bottom: 1px solid #475569;
  padding-bottom: 16px;
  margin-bottom: 16px;
}
```

## App Implementation

### SwiftUI
```swift
struct MaximalismView: View {
    let columns = [
        GridItem(.flexible(), spacing: 4),
        GridItem(.flexible(), spacing: 4),
        GridItem(.flexible(), spacing: 4)
    ]
    
    var body: some View {
        ScrollView {
            LazyVGrid(columns: columns, spacing: 4) {
                // Feature span
                MaxItem(title: "MUSEUM", isFeature: true)
                // Dense data blocks
                MaxItem(title: "1892")
                MaxItem(title: "Vol. II")
                MaxItem(title: "Arch")
                MaxItem(title: "Index")
            }
            .padding(16)
        }
        .background(Color(hex: "0F172A")) // Deep slate
    }
}

struct MaxItem: View {
    let title: String
    var isFeature: Bool = false
    
    var body: some View {
        VStack {
            Text(title)
                .font(.custom("Cinzel", size: isFeature ? 28 : 14))
                .foregroundColor(Color(hex: "D4AF37")) // Gold
                .padding()
        }
        .frame(maxWidth: .infinity, minHeight: isFeature ? 150 : 80)
        .background(Color(hex: "1E293B").opacity(0.9))
        .border(Color(hex: "475569"), width: 1)
        .overlay(
            // Ornate internal dashed border for the feature item
            Group {
                if isFeature {
                    Rectangle()
                        .stroke(style: StrokeStyle(lineWidth: 1, dash: [4]))
                        .foregroundColor(Color(hex: "D4AF37"))
                        .padding(4)
                }
            }
        )
    }
}
```
- A `LazyVGrid` with very tight `spacing` (e.g., `4`) creates the necessary density.
- Extensive use of `.border` and `.overlay(Rectangle().stroke(...))` to box in every piece of data, mimicking ornate framing.

### Flutter
```dart
class MaximalismScreen extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF0F172A),
      body: GridView.count(
        crossAxisCount: 3,
        padding: const EdgeInsets.all(16),
        mainAxisSpacing: 4,
        crossAxisSpacing: 4,
        children: [
          // Flutter's standard GridView doesn't span columns easily.
          // In a real app, use the `flutter_staggered_grid_view` package.
          _buildItem('1892'),
          _buildItem('Vol. II'),
          _buildItem('Arch'),
          _buildItem('Index', isOrnate: true),
          _buildItem('04'),
          _buildItem('XII'),
        ],
      ),
    );
  }

  Widget _buildItem(String title, {bool isOrnate = false}) {
    return Container(
      decoration: BoxDecoration(
        color: const Color(0xFF1E293B).withOpacity(0.9),
        border: Border.all(color: const Color(0xFF475569), width: 1),
      ),
      child: Stack(
        children: [
          if (isOrnate)
            Positioned.fill(
              child: Padding(
                padding: const EdgeInsets.all(4.0),
                // Requires path_drawing or custom painter for dashed borders natively
                child: Container(
                  decoration: BoxDecoration(border: Border.all(color: const Color(0xFFD4AF37), width: 1)),
                ),
              ),
            ),
          Center(
            child: Text(
              title,
              style: const TextStyle(fontFamily: 'Cinzel', color: Color(0xFFD4AF37), fontSize: 16),
            ),
          ),
        ],
      ),
    );
  }
}
```
- Use `flutter_staggered_grid_view` to create the complex, spanning "masonry" or architectural grid layouts typical of maximalism.
- Use `Stack` with `Positioned.fill` and `Padding` to create double-bordered framing effects.

### React Native
```jsx
const MaximalismScreen = () => {
  return (
    <ScrollView style={{ flex: 1, backgroundColor: '#0F172A' }}>
      <View style={{ padding: 16, flexDirection: 'row', flexWrap: 'wrap', gap: 4 }}>
        
        {/* Feature Item spanning full width */}
        <View style={[styles.item, styles.featureItem]}>
          <View style={styles.ornateInnerBorder}>
            <Text style={[styles.text, { fontSize: 32 }]}>MUSEUM</Text>
          </View>
        </View>

        {/* Small Dense Items */}
        <View style={[styles.item, { width: '32%' }]}><Text style={styles.text}>1892</Text></View>
        <View style={[styles.item, { width: '32%' }]}><Text style={styles.text}>Vol. II</Text></View>
        <View style={[styles.item, { width: '32%' }]}><Text style={styles.text}>Arch</Text></View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  item: {
    backgroundColor: 'rgba(30, 41, 59, 0.9)',
    borderColor: '#475569', borderWidth: 1,
    height: 100, justifyContent: 'center', alignItems: 'center'
  },
  featureItem: {
    width: '100%', height: 200, padding: 4,
  },
  ornateInnerBorder: {
    flex: 1, width: '100%',
    borderColor: '#D4AF37', borderWidth: 1, borderStyle: 'dashed',
    justifyContent: 'center', alignItems: 'center'
  },
  text: {
    fontFamily: 'Cinzel-Regular', color: '#D4AF37', fontSize: 16
  }
});
```
- A `flexWrap: 'wrap'` container with percentage widths (e.g., `32%` for 3 columns) is the easiest way to build complex, dense grids in React Native.
- Use `borderStyle: 'dashed'` combined with a solid outer border to create ornate framing.

### Jetpack Compose
```kotlin
@Composable
fun MaximalismScreen() {
    LazyVerticalGrid(
        columns = GridCells.Fixed(3),
        modifier = Modifier.fillMaxSize().background(Color(0xFF0F172A)).padding(16.dp),
        horizontalArrangement = Arrangement.spacedBy(4.dp),
        verticalArrangement = Arrangement.spacedBy(4.dp)
    ) {
        // Feature spanning all 3 columns
        item(span = { GridItemSpan(3) }) {
            MaxItem("MUSEUM", isFeature = true)
        }
        // Dense items
        items(6) { index ->
            MaxItem("Item $index")
        }
    }
}

@Composable
fun MaxItem(title: String, isFeature: Boolean = false) {
    Box(
        modifier = Modifier
            .height(if (isFeature) 200.dp else 100.dp)
            .background(Color(0xFF1E293B).copy(alpha = 0.9f))
            .border(1.dp, Color(0xFF475569))
            .padding(4.dp),
        contentAlignment = Alignment.Center
    ) {
        if (isFeature) {
            // Ornate inner border
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .border(1.dp, Color(0xFFD4AF37), shape = RoundedCornerShape(0.dp))
                    // Note: Dashed borders require a custom drawBehind modifier in Compose
            )
        }
        Text(
            text = title,
            color = Color(0xFFD4AF37),
            fontFamily = FontFamily.Serif, // Replace with custom Cinzel font
            fontSize = if (isFeature) 32.sp else 16.sp
        )
    }
}
```
- `LazyVerticalGrid` with `GridCells.Fixed(3)` is perfect.
- Use `GridItemSpan(3)` for the hero elements to make them span the full width, mimicking editorial or museum layouts.

## Do's and Don'ts
- **DO**: Treat every pixel as valuable real estate. Frame everything.
- **DON'T**: Let it become unreadable. The contrast between text and background must remain high despite the density.
