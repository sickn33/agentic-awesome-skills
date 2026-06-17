---
name: isometric-design
description: Web and App implementation guide for Isometric Design. Trigger when user wants angled 3D appearances without vanishing points, often used for technical illustrations.
---

# Isometric Design

> "The architect's view. A parallel projection where depth is constant and parallel lines never converge."

## Core Principles
1. **Parallel Lines**: Unlike true 3D, isometric projection has no vanishing point. Everything is viewed from an exact 30-degree angle.
2. **Top-Down, Angled View**: The classic "SimCity" perspective.
3. **Blocky Architecture**: UI elements often look like city blocks or stacked tiles.

## Visual DNA
- **Colors**: **Warm Tech** or **Earth-Grounded Elegance**. Isometric designs often look like physical models, so slightly muted, realistic colors work well.
- **Typography**: Keep text flat to the screen, or map it perfectly to the isometric planes (top, left, right).
- **Shadows**: Hard, long drop shadows cast at an exact angle (usually -45 or 45 degrees).

## Web Implementation
- CSS transforms are perfect for this. Combine `rotateX(60deg)` and `rotateZ(-45deg)`.
- **CSS Example**:
```css
.isometric-grid {
  /* The foundation */
  transform-style: preserve-3d;
  transform: rotateX(60deg) rotateZ(-45deg);
}

.iso-block {
  width: 100px;
  height: 100px;
  background-color: var(--secondary-base);
  position: relative;
  transition: transform 0.3s;
}

/* Creating the 3D block with pseudo-elements */
.iso-block::before {
  content: '';
  position: absolute;
  width: 20px; /* Depth */
  height: 100%;
  background-color: var(--primary-text); /* Darker shade for side */
  right: 100%;
  transform-origin: right;
  transform: skewY(-45deg);
}

.iso-block::after {
  content: '';
  position: absolute;
  width: 100%;
  height: 20px; /* Depth */
  background-color: var(--cta-highlight); /* Lightest shade for top/bottom */
  top: 100%;
  transform-origin: top;
  transform: skewX(-45deg);
}

.iso-block:hover {
  transform: translateZ(20px) translate(-10px, -10px);
}
```

## App Implementation

### SwiftUI
```swift
struct IsometricView: View {
    var body: some View {
        ZStack {
            Color.white.ignoresSafeArea()
            
            // Isometric Stack
            VStack(spacing: 0) {
                // Top layer
                Rectangle()
                    .fill(Color.blue)
                    .frame(width: 150, height: 150)
                    .overlay(Text("TOP").foregroundColor(.white))
                
                // Shadow simulation
                Rectangle()
                    .fill(Color.black.opacity(0.2))
                    .frame(width: 150, height: 20)
            }
            // The exact 3D transformations for Isometric projection
            .rotationEffect(.degrees(-45))
            .rotation3DEffect(.degrees(60), axis: (x: 1, y: 0, z: 0))
        }
    }
}
```
- SwiftUI's `.rotation3DEffect` makes this surprisingly easy. Rotate Z by -45 degrees first (via `.rotationEffect`), then rotate X by 60 degrees.
- You can stack multiple views along the Z-axis (or simulate it with Y offsets before the 3D rotation) to create towering isometric city blocks.

### Flutter
```dart
import 'dart:math';

class IsometricScreen extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.white,
      body: Center(
        child: Transform(
          // The Isometric Matrix Math
          alignment: FractionalOffset.center,
          transform: Matrix4.identity()
            ..setEntry(3, 2, 0.001) // perspective
            ..rotateX(pi / 3) // 60 degrees
            ..rotateZ(-pi / 4), // -45 degrees
          child: Container(
            width: 150,
            height: 150,
            decoration: BoxDecoration(
              color: Colors.blue,
              boxShadow: [
                // Hard isometric drop shadow
                BoxShadow(
                  color: Colors.black.withOpacity(0.3),
                  offset: const Offset(20, 20),
                  blurRadius: 0, // No blur for isometric
                ),
              ],
            ),
            child: const Center(child: Text('ISO BLOCK', style: TextStyle(color: Colors.white))),
          ),
        ),
      ),
    );
  }
}
```
- `Transform` with `Matrix4` is required in Flutter. Applying `rotateX` and `rotateZ` yields the classic isometric grid.
- Isometric shadows are usually completely hard (0 `blurRadius`) and offset perfectly along the grid axes.

### React Native
```jsx
const IsometricScreen = () => {
  return (
    <View style={{ flex: 1, backgroundColor: '#FFF', justifyContent: 'center', alignItems: 'center' }}>
      
      <View style={{
        width: 150,
        height: 150,
        backgroundColor: '#2196F3',
        justifyContent: 'center',
        alignItems: 'center',
        
        // Isometric Transforms
        transform: [
          { rotateX: '60deg' },
          { rotateZ: '-45deg' }
        ],
        
        // Hard isometric shadow
        shadowColor: '#000',
        shadowOffset: { width: 20, height: 20 },
        shadowOpacity: 0.3,
        shadowRadius: 0, // Hard edge
        elevation: 10,
      }}>
        <Text style={{ color: '#FFF', fontWeight: 'bold' }}>ISO BLOCK</Text>
      </View>
      
    </View>
  );
};
```
- The `transform` array processes in order. Apply `rotateX` then `rotateZ`.
- Hard shadows (`shadowRadius: 0`) sell the illustration look.

### Jetpack Compose
```kotlin
@Composable
fun IsometricScreen() {
    Box(
        modifier = Modifier.fillMaxSize().background(Color.White),
        contentAlignment = Alignment.Center
    ) {
        Box(
            modifier = Modifier
                .graphicsLayer {
                    // Isometric Transforms
                    rotationX = 60f
                    rotationZ = -45f
                    // Add subtle scale if it gets clipped
                    scaleX = 0.8f
                    scaleY = 0.8f
                }
                .size(150.dp)
                // Draw a hard shadow behind the box
                .drawBehind {
                    drawRect(
                        color = Color.Black.copy(alpha = 0.3f),
                        topLeft = Offset(40f, 40f), // Isometric offset
                        size = size
                    )
                }
                .background(Color(0xFF2196F3)),
            contentAlignment = Alignment.Center
        ) {
            Text("ISO BLOCK", color = Color.White, fontWeight = FontWeight.Bold)
        }
    }
}
```
- Use `Modifier.graphicsLayer` to apply `rotationX` and `rotationZ`. 
- To get a true hard isometric drop shadow in Compose without elevation blurring, use `Modifier.drawBehind` to manually draw a dark rectangle offset from the main content.

## Do's and Don'ts
- **DO**: Use it for infographics, feature diagrams, or hero sections.
- **DON'T**: Build your entire app's functional UI in isometric projection. It's too hard to interact with.
