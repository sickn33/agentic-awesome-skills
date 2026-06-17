---
name: flat-design-2
description: Web and App implementation guide for Flat Design 2.0 (Semi-Flat). Trigger when the user wants flat design with subtle shadows and improved usability.
date_added: "2026-06-17"
risk: safe
source: self
source_type: self
---

# Flat Design 2.0 (Semi-Flat)

> "Flat aesthetics, but with subtle hints of physics to communicate interactability."


## When to Use
Use this sub-style when the user's request matches the aesthetic described above. This is a child reference of the `design-it` skill and is not meant to be triggered directly.

## Core Principles
1. **Mostly Flat**: The primary aesthetic remains 2D and solid.
2. **Subtle Elevation**: Use extremely soft, large-spread shadows strictly to indicate interactable elements (buttons, floating action buttons) or layers (modals).
3. **Micro-Gradients**: Occasional, barely noticeable linear gradients to prevent large surfaces from feeling dead.

## Visual DNA
- **Colors**: Pairs well with **Warm Tech** or **Earth-Grounded Elegance**.
- **Typography**: Clean, readable sans-serifs.
- **Shadows**: Shadows must be low opacity, high blur, and usually tinted with the background color, not pure black.

## Web Implementation
- **CSS Example**:
```css
:root {
  --shadow-color: rgba(43, 48, 58, 0.08); /* Tinted shadow */
}

.flat2-card {
  background-color: var(--bg-primary);
  border-radius: 8px;
  padding: 32px;
  /* Very subtle, diffuse shadow */
  box-shadow: 0 10px 30px var(--shadow-color);
  transition: transform 0.3s ease, box-shadow 0.3s ease;
}

.flat2-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 20px 40px rgba(43, 48, 58, 0.12);
}

.flat2-btn {
  background: var(--cta-highlight);
  border-radius: 4px;
  padding: 12px 24px;
  color: white;
  border: none;
  box-shadow: 0 4px 12px rgba(0,0,0,0.1);
}
```

## App Implementation

### SwiftUI
```swift
struct SemiFlatCard: View {
    @State private var isPressed = false
    
    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            Text("Semi-Flat Card")
                .font(.system(size: 18, weight: .semibold))
            Text("Flat aesthetic with just enough depth to hint at interactivity.")
                .font(.system(size: 15))
                .foregroundColor(.secondary)
        }
        .padding(24)
        .background(Color(.systemBackground))
        .cornerRadius(8)
        // The key: very soft, tinted shadow — NOT harsh black
        .shadow(color: Color.black.opacity(0.06), radius: 12, x: 0, y: 4)
        .scaleEffect(isPressed ? 0.98 : 1.0)
        .animation(.easeOut(duration: 0.2), value: isPressed)
        .onLongPressGesture(minimumDuration: .infinity, pressing: { pressing in
            isPressed = pressing
        }, perform: {})
    }
}

struct SemiFlatButton: View {
    var body: some View {
        Button(action: {}) {
            Text("Continue")
                .font(.system(size: 15, weight: .semibold))
                .foregroundColor(.white)
                .padding(.horizontal, 24)
                .padding(.vertical, 12)
                .background(Color.accentColor)
                .cornerRadius(4)
                // Subtle button shadow
                .shadow(color: Color.accentColor.opacity(0.25), radius: 8, x: 0, y: 4)
        }
        .buttonStyle(.plain)
    }
}
```
- Shadow color should be tinted (e.g., `Color.accentColor.opacity(0.15)`), never pure black.
- Use `radius: 10...16` with `opacity: 0.05...0.08` — if you can immediately see the shadow, it's too heavy.
- Add subtle `scaleEffect` on press to hint at physical feedback.

### Flutter
```dart
class SemiFlatCard extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(8),
        // Very soft, tinted shadow
        boxShadow: [
          BoxShadow(
            color: const Color(0xFF2B303A).withOpacity(0.08),
            blurRadius: 24,
            offset: const Offset(0, 8),
            spreadRadius: 0,
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text('Semi-Flat Card',
            style: TextStyle(fontSize: 18, fontWeight: FontWeight.w600)),
          const SizedBox(height: 16),
          const Text('Flat aesthetic with just enough depth to hint at interactivity.',
            style: TextStyle(fontSize: 15, color: Colors.black54)),
          const SizedBox(height: 20),
          ElevatedButton(
            onPressed: () {},
            style: ElevatedButton.styleFrom(
              elevation: 2,  // Very low — just enough to feel clickable
              shadowColor: Theme.of(context).primaryColor.withOpacity(0.3),
              backgroundColor: Theme.of(context).primaryColor,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(4)),
              padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
            ),
            child: const Text('Continue', style: TextStyle(fontWeight: FontWeight.w600)),
          ),
        ],
      ),
    );
  }
}
```
- Use `elevation: 1` to `elevation: 4` max. Never exceed `elevation: 6`.
- Tint the `shadowColor` to match the card's background or the brand color.
- Use `InkWell` for ripple effects and a slight `Transform.translate` animation on press.

### React Native
```jsx
const SemiFlatCard = () => (
  <View style={{
    padding: 24,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    // Very subtle, diffuse shadow
    shadowColor: '#2B303A',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 24,
    // Android
    elevation: 3,
  }}>
    <Text style={{ fontSize: 18, fontWeight: '600', marginBottom: 16 }}>
      Semi-Flat Card
    </Text>
    <Text style={{ fontSize: 15, color: '#666', marginBottom: 20 }}>
      Flat aesthetic with just enough depth to hint at interactivity.
    </Text>
    <Pressable
      style={({ pressed }) => ({
        backgroundColor: '#4A90D9',
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 4,
        alignSelf: 'flex-start',
        transform: [{ scale: pressed ? 0.97 : 1 }],
        shadowColor: '#4A90D9',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 8,
      })}
    >
      <Text style={{ color: '#FFF', fontWeight: '600' }}>Continue</Text>
    </Pressable>
  </View>
);
```
- On iOS use `shadowOpacity: 0.05...0.10` with `shadowRadius: 16...24` for a diffuse spread.
- On Android, `elevation: 2...4` is equivalent. Avoid going above `elevation: 6`.
- Use `Pressable` with `({ pressed })` style callback for animated press states.

### Jetpack Compose
```kotlin
@Composable
fun SemiFlatCard() {
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(8.dp),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp),
        colors = CardDefaults.cardColors(containerColor = Color.White),
    ) {
        Column(modifier = Modifier.padding(24.dp)) {
            Text("Semi-Flat Card", fontSize = 18.sp, fontWeight = FontWeight.SemiBold)
            Spacer(Modifier.height(16.dp))
            Text("Flat aesthetic with just enough depth to hint at interactivity.",
                fontSize = 15.sp, color = Color(0xFF666666))
            Spacer(Modifier.height(20.dp))
            Button(
                onClick = {},
                shape = RoundedCornerShape(4.dp),
                elevation = ButtonDefaults.buttonElevation(defaultElevation = 2.dp),
                contentPadding = PaddingValues(horizontal = 24.dp, vertical = 12.dp),
            ) {
                Text("Continue", fontWeight = FontWeight.SemiBold)
            }
        }
    }
}
```
- Use `CardDefaults.cardElevation(defaultElevation = 2.dp)` — keep it under 4dp.
- On hover/press: `hoveredElevation = 4.dp, pressedElevation = 1.dp` for subtle physics.
- Tint shadows by using `Modifier.shadow(elevation, shape, ambientColor, spotColor)` with custom tinted colors.

## Do's and Don'ts
- **DO**: Keep shadows incredibly subtle. If you immediately notice the shadow, it's too dark.
- **DON'T**: Use inner shadows, heavy gradients, or skeuomorphic textures.
