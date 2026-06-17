---
name: holographic-ui
description: Web and App implementation guide for Holographic UI. Trigger when user wants light-based appearance, projected interfaces, and transparent floating elements.
---

# Holographic UI

> "Made of light. Interfaces projected into thin air, visible but completely translucent."

## Core Principles
1. **Zero Opacity Backgrounds**: Elements are never fully solid. Everything is semi-transparent, allowing the background to show through.
2. **Scanlines and Interference**: The illusion of a projection is sold by horizontal scanlines, slight chromatic aberration, or flickering.
3. **Luminous Edges**: The borders of elements are brighter than the centers, mimicking how lasers or light projections focus at the edges.

## Visual DNA
- **Colors**: Almost exclusively monochrome Cyan, Blue, or Green, with white core highlights.
- **Typography**: Thin, technical sans-serifs. Must have a glowing `text-shadow`.
- **Styling**: Intensive use of `rgba()`, `mix-blend-mode: screen` or `add`, and CSS filters.

## Web Implementation
- **CSS Example**:
```css
body {
  background-color: #020202; /* Must be dark for holograms to show */
  background-image: url('dark-lab-background.jpg');
  background-size: cover;
  color: #88ffff;
}

.hologram-panel {
  background: rgba(0, 200, 255, 0.05); /* Extremely sheer */
  border: 1px solid rgba(136, 255, 255, 0.5);
  border-radius: 4px;
  padding: 30px;
  
  /* The glowing edge */
  box-shadow: 
    inset 0 0 20px rgba(0, 200, 255, 0.2),
    0 0 15px rgba(0, 200, 255, 0.3);
    
  /* Scanline effect */
  background-image: linear-gradient(
    rgba(136, 255, 255, 0.1) 1px, 
    transparent 1px
  );
  background-size: 100% 4px;
}

.holo-text {
  font-family: 'Rajdhani', sans-serif;
  text-transform: uppercase;
  text-shadow: 0 0 8px rgba(136, 255, 255, 0.8);
  mix-blend-mode: screen;
}

/* Subtle flicker */
.holo-flicker {
  animation: hologramFlicker 4s infinite;
}

@keyframes hologramFlicker {
  0%, 100% { opacity: 1; }
  92% { opacity: 1; }
  93% { opacity: 0.4; }
  94% { opacity: 0.9; }
  96% { opacity: 0.2; }
  98% { opacity: 1; }
}
```

## App Implementation

### SwiftUI
```swift
struct HolographicUIView: View {
    @State private var isFlickering = false
    
    var body: some View {
        ZStack {
            Color.black.ignoresSafeArea()
            
            VStack {
                Text("HOLOGRAM ACTIVE")
                    .font(.custom("Courier", size: 24))
                    .foregroundColor(Color(hex: "88FFFF"))
                    .shadow(color: Color(hex: "88FFFF"), radius: 10)
                    .blendMode(.screen) // Critical for light UI
                
                Spacer().frame(height: 40)
                
                VStack {
                    Text("SYSTEM DIAGNOSTICS")
                        .foregroundColor(Color(hex: "88FFFF"))
                }
                .padding(30)
                .frame(maxWidth: .infinity)
                .background(Color(hex: "88FFFF").opacity(0.05))
                .border(Color(hex: "88FFFF").opacity(0.5), width: 1)
                // The glowing edge effect
                .shadow(color: Color(hex: "88FFFF").opacity(0.5), radius: 15)
                .blendMode(.screen)
                .opacity(isFlickering ? 0.4 : 1.0)
            }
            .padding()
            
            // Scanline Overlay
            LinearGradient(
                stops: [
                    .init(color: Color(hex: "88FFFF").opacity(0.1), location: 0),
                    .init(color: .clear, location: 0.5)
                ],
                startPoint: .top, endPoint: .bottom
            )
            .frame(height: 4)
            .background(Color.clear)
            // You would tile this in a real app using an Image or custom shape
            .blendMode(.screen)
        }
        .onAppear {
            // Simulate flicker
            Timer.scheduledTimer(withTimeInterval: 0.1, repeats: true) { _ in
                if Int.random(in: 1...100) > 95 {
                    isFlickering.toggle()
                    DispatchQueue.main.asyncAfter(deadline: .now() + 0.1) {
                        isFlickering = false
                    }
                }
            }
        }
    }
}
```
- `.blendMode(.screen)` is absolutely critical. It makes elements act like projected light.
- Stack multiple `.shadow()` modifiers to create a bloom effect around text and borders.

### Flutter
```dart
class HolographicScreen extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.black, // Dark lab background
      body: Stack(
        children: [
          Padding(
            padding: const EdgeInsets.all(24.0),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                // Glowing Text
                const Text(
                  'HOLOGRAM ACTIVE',
                  style: TextStyle(
                    fontFamily: 'Courier',
                    fontSize: 24,
                    color: Color(0xFF88FFFF),
                    shadows: [Shadow(color: Color(0xFF88FFFF), blurRadius: 10)],
                  ),
                ),
                const SizedBox(height: 40),
                
                // Hologram Panel
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.all(30),
                  decoration: BoxDecoration(
                    color: const Color(0xFF88FFFF).withOpacity(0.05),
                    border: Border.all(color: const Color(0xFF88FFFF).withOpacity(0.5)),
                    boxShadow: [
                      BoxShadow(color: const Color(0xFF88FFFF).withOpacity(0.2), blurRadius: 15, spreadRadius: 5),
                    ],
                  ),
                  child: const Text(
                    'SYSTEM DIAGNOSTICS',
                    textAlign: TextAlign.center,
                    style: TextStyle(color: Color(0xFF88FFFF)),
                  ),
                ),
              ],
            ),
          ),
          // Scanlines (IgnorePointer so it doesn't block taps)
          IgnorePointer(
            child: ShaderMask(
              blendMode: BlendMode.screen, // Makes it act like light
              shaderCallback: (bounds) => const LinearGradient(
                begin: Alignment.topCenter, end: Alignment.bottomCenter,
                stops: [0.0, 0.5, 0.5, 1.0],
                colors: [Colors.black12, Colors.black12, Colors.transparent, Colors.transparent],
              ).createShader(bounds),
              // To actually tile in Flutter, you often need a CustomPainter.
              // Here we simulate the blend mode.
              child: Container(color: const Color(0xFF88FFFF).withOpacity(0.1)),
            ),
          ),
        ],
      ),
    );
  }
}
```
- The `Shadow` array inside `TextStyle` creates the glowing text.
- `BoxShadow` with `spreadRadius` creates the glowing panel border.
- `ShaderMask` with `BlendMode.screen` layered over the UI gives it that light-projection quality.

### React Native
```jsx
const HolographicScreen = () => {
  return (
    <View style={{ flex: 1, backgroundColor: '#020202', padding: 24, justifyContent: 'center' }}>
      
      <Text style={{
        fontFamily: 'monospace', fontSize: 24, textAlign: 'center', color: '#88FFFF',
        textShadowColor: '#88FFFF', textShadowRadius: 10, marginBottom: 40
      }}>
        HOLOGRAM ACTIVE
      </Text>

      <View style={{
        backgroundColor: 'rgba(0, 200, 255, 0.05)',
        borderWidth: 1, borderColor: 'rgba(136, 255, 255, 0.5)',
        padding: 30, borderRadius: 4,
        // The glowing edge
        shadowColor: '#88FFFF', shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.5, shadowRadius: 15, elevation: 10
      }}>
        <Text style={{ color: '#88FFFF', textAlign: 'center', fontFamily: 'monospace' }}>
          SYSTEM DIAGNOSTICS
        </Text>
      </View>

      {/* Pseudo-scanlines overlay. In a real app, use an repeating Image background. */}
      <View pointerEvents="none" style={{
        position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
        backgroundColor: 'rgba(136, 255, 255, 0.03)',
      }} />

    </View>
  );
};
```
- React Native doesn't support `mix-blend-mode` out of the box, so you must rely heavily on low-opacity backgrounds and intense `textShadow` / `shadowRadius`.
- Use `pointerEvents="none"` on scanline overlays so they don't block user interactions.

### Jetpack Compose
```kotlin
@Composable
fun HolographicScreen() {
    Box(modifier = Modifier.fillMaxSize().background(Color(0xFF020202))) {
        Column(
            modifier = Modifier.fillMaxSize().padding(24.dp),
            verticalArrangement = Arrangement.Center,
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            // Glowing Text
            Text(
                text = "HOLOGRAM ACTIVE",
                fontFamily = FontFamily.Monospace,
                fontSize = 24.sp,
                color = Color(0xFF88FFFF),
                style = TextStyle(
                    shadow = Shadow(color = Color(0xFF88FFFF), blurRadius = 10f)
                ),
                modifier = Modifier.graphicsLayer { blendMode = BlendMode.Screen }
            )
            
            Spacer(Modifier.height(40.dp))
            
            // Glowing Panel
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .graphicsLayer { blendMode = BlendMode.Screen }
                    .shadow(15.dp, ambientColor = Color(0xFF88FFFF), spotColor = Color(0xFF88FFFF))
                    .background(Color(0xFF88FFFF).copy(alpha = 0.05f))
                    .border(1.dp, Color(0xFF88FFFF).copy(alpha = 0.5f))
                    .padding(30.dp),
                contentAlignment = Alignment.Center
            ) {
                Text("SYSTEM DIAGNOSTICS", color = Color(0xFF88FFFF), fontFamily = FontFamily.Monospace)
            }
        }
        
        // Simulating scanlines overlay
        Box(
            modifier = Modifier
                .fillMaxSize()
                .background(Color(0xFF88FFFF).copy(alpha = 0.03f))
        )
    }
}
```
- `Modifier.graphicsLayer { blendMode = BlendMode.Screen }` is exactly what you need in Compose to make elements act like projected light.
- Use Compose's `shadow` modifier with `ambientColor` and `spotColor` set to cyan to make the panels emit light.

## Do's and Don'ts
- **DO**: Use `mix-blend-mode: screen` (web) or additive blending so overlapping holographic panels get brighter where they intersect.
- **DON'T**: Use any dark colors or drop shadows for the UI elements. Shadows don't exist in light projections.
