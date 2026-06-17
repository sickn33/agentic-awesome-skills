---
name: neumorphism
description: Web and App implementation guide for Neumorphism (Soft UI). Trigger when user wants soft shadows, extruded appearance, and light source simulation.
date_added: "2026-06-17"
---

# Neumorphism (Soft UI)

> "Elements extruded from the background material itself, shaped by a singular, persistent light source."

## Core Principles
1. **Unified Surface Color**: The background and the elements MUST share the exact same base color.
2. **Dual Shadows**: Elements are shaped by two shadows: a light shadow (highlight) on the side facing the light source, and a dark shadow on the opposite side.
3. **No Borders**: The shape is entirely defined by the shadows.

## Visual DNA
- **Colors**: Works best with mid-tone neutrals. **Desert Mirage**, **Earth-Grounded Elegance**, or **Sophisticated Neutral** are perfect. Avoid pure white or pure black (shadows/highlights won't show).
- **Typography**: Soft, rounded sans-serifs (e.g., `Nunito`, `Quicksand`).
- **Shapes**: Pill shapes, rounded rectangles. Sharp corners break the illusion of extruded material.

## Web Implementation
- The magic is entirely in `box-shadow` manipulating light and dark variants of the base color.
- **CSS Example**:
```css
:root {
  --base-color: #E6E2DD; /* From Sophisticated Neutral */
  --highlight: #ffffff;
  --shadow: #c4c0bc;
}

body {
  background-color: var(--base-color);
}

.neu-element {
  background-color: var(--base-color);
  border-radius: 20px;
  /* Top-left highlight, Bottom-right shadow */
  box-shadow:  9px 9px 18px var(--shadow),
              -9px -9px 18px var(--highlight);
  padding: 32px;
}

.neu-pressed {
  /* Inset shadows for pressed/active state */
  border-radius: 20px;
  background: var(--base-color);
  box-shadow: inset 9px 9px 18px var(--shadow),
              inset -9px -9px 18px var(--highlight);
}
```

## App Implementation

### SwiftUI
```swift
struct NeuCard: View {
    let baseColor = Color(red: 0.90, green: 0.89, blue: 0.87) // #E6E2DD
    
    var body: some View {
        VStack(spacing: 24) {
            Text("Neumorphic Card")
                .font(.system(size: 20, weight: .semibold, design: .rounded))
            
            Text("Extruded from the surface itself.")
                .font(.system(size: 15, design: .rounded))
                .foregroundColor(.secondary)
        }
        .padding(32)
        .background(baseColor)
        .cornerRadius(20)
        // Light shadow (top-left)
        .shadow(color: Color.white.opacity(0.7), radius: 10, x: -8, y: -8)
        // Dark shadow (bottom-right)
        .shadow(color: Color.black.opacity(0.15), radius: 10, x: 8, y: 8)
    }
}

// Pressed / inset neumorphic button
struct NeuButton: View {
    @State private var isPressed = false
    let baseColor = Color(red: 0.90, green: 0.89, blue: 0.87)
    
    var body: some View {
        Button(action: {}) {
            Text("Press Me")
                .font(.system(size: 16, weight: .semibold, design: .rounded))
                .foregroundColor(.primary)
                .padding(.horizontal, 32)
                .padding(.vertical, 16)
        }
        .background(
            Group {
                if isPressed {
                    // Inset effect using inner shadow (ZStack trick)
                    RoundedRectangle(cornerRadius: 16)
                        .fill(baseColor)
                        .overlay(
                            RoundedRectangle(cornerRadius: 16)
                                .stroke(baseColor, lineWidth: 4)
                                .shadow(color: Color.black.opacity(0.2), radius: 4, x: 4, y: 4)
                                .clipShape(RoundedRectangle(cornerRadius: 16))
                        )
                        .overlay(
                            RoundedRectangle(cornerRadius: 16)
                                .stroke(baseColor, lineWidth: 4)
                                .shadow(color: Color.white.opacity(0.7), radius: 4, x: -4, y: -4)
                                .clipShape(RoundedRectangle(cornerRadius: 16))
                        )
                } else {
                    RoundedRectangle(cornerRadius: 16)
                        .fill(baseColor)
                        .shadow(color: Color.white.opacity(0.7), radius: 10, x: -8, y: -8)
                        .shadow(color: Color.black.opacity(0.15), radius: 10, x: 8, y: 8)
                }
            }
        )
        .buttonStyle(.plain)
        .simultaneousGesture(
            DragGesture(minimumDistance: 0)
                .onChanged { _ in isPressed = true }
                .onEnded { _ in isPressed = false }
        )
    }
}
```
- The key trick: two `.shadow()` modifiers — one white (top-left), one dark (bottom-right).
- Inner shadow (pressed state) requires a ZStack/overlay hack since SwiftUI doesn't have native `inset` shadows. Clip stroked shapes to simulate.
- The view's background color MUST match its parent's background exactly.

### Flutter
```dart
class NeuCard extends StatelessWidget {
  final Color baseColor = const Color(0xFFE6E2DD);
  
  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(32),
      decoration: BoxDecoration(
        color: baseColor,
        borderRadius: BorderRadius.circular(20),
        boxShadow: [
          // Dark shadow (bottom-right)
          BoxShadow(
            color: Colors.black.withOpacity(0.15),
            offset: const Offset(8, 8),
            blurRadius: 16,
          ),
          // Light shadow (top-left)
          BoxShadow(
            color: Colors.white.withOpacity(0.7),
            offset: const Offset(-8, -8),
            blurRadius: 16,
          ),
        ],
      ),
      child: Column(
        children: [
          const Text('Neumorphic Card',
            style: TextStyle(fontSize: 20, fontWeight: FontWeight.w600)),
          const SizedBox(height: 16),
          Text('Extruded from the surface itself.',
            style: TextStyle(fontSize: 15, color: Colors.black54)),
        ],
      ),
    );
  }
}
```
- **Inner shadows** (for pressed state) are NOT natively supported in Flutter's `BoxShadow`.
- Use the `flutter_inset_box_shadow` package OR fake it with a layered `Stack`: place a `Container` with a dark gradient overlay on top and a light gradient below.
- Set the `Scaffold` background to the SAME `baseColor` so elements look extruded.

### React Native
```jsx
const NeuCard = () => (
  <View style={{
    padding: 32,
    backgroundColor: '#E6E2DD',
    borderRadius: 20,
    // Light shadow (top-left) — iOS only supports one shadow
    shadowColor: '#FFFFFF',
    shadowOffset: { width: -8, height: -8 },
    shadowOpacity: 0.7,
    shadowRadius: 10,
    // Android — use elevation for basic shadow
    elevation: 8,
  }}>
    <Text style={{ fontSize: 20, fontWeight: '600' }}>Neumorphic Card</Text>
    <Text style={{ fontSize: 15, color: '#888', marginTop: 16 }}>
      Extruded from the surface itself.
    </Text>
  </View>
);
```
- **Major limitation**: React Native only supports ONE shadow per view. True neumorphism requires TWO opposing shadows.
- **Workaround**: Use `react-native-shadow-2` or `react-native-neomorph-shadows` which provide multi-shadow support.
- Alternative: Wrap two nested `View`s — the outer one has the dark shadow, the inner one has the light shadow.
- Inner shadows for pressed states require SVG-based solutions or pre-rendered images.

### Jetpack Compose
```kotlin
@Composable
fun NeuCard() {
    val baseColor = Color(0xFFE6E2DD)
    
    Box(
        modifier = Modifier
            .padding(24.dp)
            .shadow(
                elevation = 8.dp,
                shape = RoundedCornerShape(20.dp),
                ambientColor = Color.Black.copy(alpha = 0.15f),
                spotColor = Color.Black.copy(alpha = 0.15f),
            )
            .background(baseColor, RoundedCornerShape(20.dp))
            .padding(32.dp)
    ) {
        Column {
            Text("Neumorphic Card",
                fontSize = 20.sp, fontWeight = FontWeight.SemiBold)
            Spacer(Modifier.height(16.dp))
            Text("Extruded from the surface itself.",
                fontSize = 15.sp, color = Color(0xFF888888))
        }
    }
}
```
- **Compose limitation**: Like React Native, Compose `Modifier.shadow()` only supports a single directional shadow.
- For true dual-shadow neumorphism, use a custom `Modifier.drawBehind { }` with `drawIntoCanvas` to paint two separate shadow paths (one light, one dark).
- The `neumorphic-compose` library provides a pre-built `Modifier.neumorphic()` that handles both shadows.
- Set the `Scaffold` background to the same `baseColor` — this is non-negotiable.

## Do's and Don'ts
- **DO**: Use inset shadows for "active" states (like pressed buttons or filled form fields).
- **DON'T**: Rely on Neumorphism for critical elements without secondary indicators. Contrast is inherently low, making it an accessibility nightmare if used improperly.
