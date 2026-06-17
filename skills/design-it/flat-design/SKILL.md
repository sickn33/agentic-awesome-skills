---
name: flat-design
description: Web and App implementation guide for the Flat Design style. Trigger when the user wants no shadows, simple shapes, and bold colors.
date_added: "2026-06-17"
risk: safe
source: self
source_type: self
---

# Flat Design

> "Digital surfaces should look digital. Embrace the 2D plane."


## When to Use
Use this sub-style when the user's request matches the aesthetic described above. This is a child reference of the `design-it` skill and is not meant to be triggered directly.

## Core Principles
1. **Zero Depth**: Absolutely no drop shadows, bevels, gradients, or 3D effects. Everything sits on the same z-axis.
2. **Sharp & Simple Geometries**: Perfect circles, sharp rectangles. No complex organic shapes.
3. **High Contrast Solid Colors**: Rely on stark contrast between solid blocks of color to delineate space.

## Visual DNA
- **Colors**: Pairs well with **Industrial Chic** or **Modern Editorial**. Avoid gradients entirely.
- **Typography**: Strong, highly legible sans-serifs (e.g., `Roboto`, `Open Sans`). Keep it medium to bold.
- **Icons**: Solid, monochromatic, glyph-style icons without intricate details.

## Web Implementation
- Rely entirely on background colors and borders for structure.
- **CSS Example**:
```css
.flat-card {
  background-color: var(--secondary-base);
  border: 2px solid var(--primary-text);
  border-radius: 0; /* Sharp corners preferred */
  padding: 32px;
  /* NO box-shadow */
}
.flat-btn {
  background-color: var(--cta-highlight);
  color: #fff;
  border: none;
  padding: 16px 32px;
  font-weight: 700;
  text-transform: uppercase;
  transition: opacity 0.2s;
}
.flat-btn:hover {
  opacity: 0.8; /* Only change opacity or solid color on hover, no lifting */
}
```

## App Implementation

### SwiftUI
```swift
struct FlatCard: View {
    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            Text("Card Title")
                .font(.system(size: 18, weight: .bold))
            
            Text("Content without any depth effects.")
                .font(.system(size: 15))
                .foregroundColor(.secondary)
            
            Button(action: {}) {
                Text("ACTION")
                    .font(.system(size: 14, weight: .bold))
                    .foregroundColor(.white)
                    .padding(.horizontal, 24)
                    .padding(.vertical, 12)
                    .background(Color.blue)
                    // No cornerRadius — sharp edges
            }
        }
        .padding(24)
        .background(Color(.secondarySystemBackground))
        // NO .shadow() — ever
        // NO .cornerRadius() — sharp rectangles
        .overlay(
            Rectangle().stroke(Color.primary.opacity(0.2), lineWidth: 1)
        )
    }
}
```
- Never use `.shadow()` or `.cornerRadius()`. Elements are flat rectangles.
- Use `.overlay(Rectangle().stroke(...))` for visible borders instead of shadows to delineate space.
- Hover/tap states should only change `opacity` or swap a solid background color.

### Flutter
```dart
class FlatCard extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        color: Colors.grey[100],
        border: Border.all(color: Colors.black26, width: 1),
        // borderRadius: NONE — sharp corners
        // boxShadow: NONE — zero depth
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text('Card Title',
            style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
          const SizedBox(height: 16),
          const Text('Content without any depth effects.',
            style: TextStyle(fontSize: 15, color: Colors.black54)),
          const SizedBox(height: 16),
          ElevatedButton(
            onPressed: () {},
            style: ElevatedButton.styleFrom(
              elevation: 0,           // Critical: no shadow
              backgroundColor: Colors.blue,
              foregroundColor: Colors.white,
              shape: const RoundedRectangleBorder(
                borderRadius: BorderRadius.zero, // Sharp corners
              ),
              padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
            ),
            child: const Text('ACTION',
              style: TextStyle(fontWeight: FontWeight.bold, letterSpacing: 1)),
          ),
        ],
      ),
    );
  }
}
```
- Override `ThemeData` globally to kill all elevation:
  ```dart
  ThemeData(
    cardTheme: const CardTheme(elevation: 0, shape: RoundedRectangleBorder()),
    appBarTheme: const AppBarTheme(elevation: 0),
    floatingActionButtonTheme: const FloatingActionButtonThemeData(elevation: 0),
  )
  ```
- Use `Container` with `BoxDecoration` instead of `Card` widget to avoid default elevation.

### React Native
```jsx
const FlatCard = () => (
  <View style={{
    padding: 24,
    backgroundColor: '#F0F0F0',
    borderWidth: 1,
    borderColor: '#CCCCCC',
    // NO borderRadius
    // NO elevation or shadow properties
  }}>
    <Text style={{ fontSize: 18, fontWeight: '700', marginBottom: 16 }}>
      Card Title
    </Text>
    <Text style={{ fontSize: 15, color: '#666', marginBottom: 16 }}>
      Content without any depth effects.
    </Text>
    <TouchableOpacity
      style={{
        backgroundColor: '#2196F3',
        paddingHorizontal: 24,
        paddingVertical: 12,
        alignSelf: 'flex-start',
        // NO borderRadius, NO elevation
      }}
      activeOpacity={0.7}
    >
      <Text style={{ color: '#FFF', fontWeight: '700', letterSpacing: 1 }}>
        ACTION
      </Text>
    </TouchableOpacity>
  </View>
);
```
- Explicitly set `elevation: 0` and remove ALL shadow properties (`shadowColor`, `shadowOffset`, etc.).
- If using React Native Paper, override the theme: `const theme = { ...DefaultTheme, roundness: 0, }`.
- Tap feedback should change `backgroundColor` directly, not add glow or lift.

### Jetpack Compose
```kotlin
@Composable
fun FlatCard() {
    Column(
        modifier = Modifier
            .background(Color(0xFFF0F0F0))
            .border(1.dp, Color(0xFFCCCCCC))
            .padding(24.dp)
    ) {
        Text("Card Title", fontSize = 18.sp, fontWeight = FontWeight.Bold)
        Spacer(Modifier.height(16.dp))
        Text("Content without any depth effects.",
            fontSize = 15.sp, color = Color(0xFF666666))
        Spacer(Modifier.height(16.dp))
        Button(
            onClick = {},
            shape = RectangleShape,  // Sharp corners
            elevation = ButtonDefaults.buttonElevation(
                defaultElevation = 0.dp,  // No shadow
                pressedElevation = 0.dp,
            ),
            colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF2196F3)),
            contentPadding = PaddingValues(horizontal = 24.dp, vertical = 12.dp),
        ) {
            Text("ACTION", fontWeight = FontWeight.Bold, letterSpacing = 1.sp)
        }
    }
}
```
- Override `MaterialTheme` shapes: `shapes = Shapes(small = RectangleShape, medium = RectangleShape, large = RectangleShape)`.
- Set all elevation to `0.dp` on `Card`, `TopAppBar`, and `FloatingActionButton`.
- Use `Modifier.border()` instead of elevation to separate UI regions.

## Do's and Don'ts
- **DO**: Use solid, contrasting borders to separate overlapping elements.
- **DON'T**: Use any transparency (rgba) or blur effects.
