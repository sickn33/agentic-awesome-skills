---
name: frutiger-aero
description: Web and App implementation guide for Frutiger Aero. Trigger when user wants glossy gradients, early 2000s nature-inspired tech, glass, and water motifs.
date_added: "2026-06-17"
---

# Frutiger Aero

> "The aesthetic of mid-2000s optimism. Glossy plastic, clear water, blue skies, and eco-friendly technology."

## Core Principles
1. **Hyper-Glossy Textures**: Buttons look like polished glass or wet plastic. Extensive use of convex gradients and specular highlights.
2. **Skeuomorphic Nature**: Motifs of green grass, blue skies, water droplets, and bubbles intersecting with sleek glass technology (think Windows Aero or early iOS).
3. **Translucency**: Frosted glass effects, but much more saturated and reflective than modern glassmorphism.

## Visual DNA
- **Colors**: Cyan, sky blue, lime green, and pure white. Avoid dark themes entirely.
- **Typography**: Clean, highly legible humanist sans-serifs (like the font *Frutiger*, `Segoe UI`, or `Myriad Pro`).
- **Styling**: Drop shadows are deep. Highlights are bright, sharp white lines at the top of buttons.

## Web Implementation
- Use multiple box-shadows (inset for the gloss, outset for depth) and linear-gradients.
- **CSS Example**:
```css
body {
  /* Classic blue sky / green grass gradient */
  background: linear-gradient(to bottom, #87CEEB 0%, #E0F6FF 60%, #98FB98 100%);
  font-family: 'Segoe UI', Tahoma, sans-serif;
}

.aero-btn {
  background: linear-gradient(to bottom, #73c8f8 0%, #1583d7 50%, #0361a3 50%, #299eef 100%);
  color: white;
  border: 1px solid #024b7f;
  border-radius: 20px;
  padding: 12px 32px;
  font-weight: 600;
  text-shadow: 0 -1px 1px rgba(0,0,0,0.5);
  
  /* The Glossy Highlight and Depth */
  box-shadow: 
    inset 0 1px 1px rgba(255,255,255,0.8), /* Top edge highlight */
    inset 0 15px 15px rgba(255,255,255,0.3), /* Convex plastic shine */
    0 4px 6px rgba(0,0,0,0.2); /* Drop shadow */
}

.aero-panel {
  /* Windows Vista/7 Aero Glass */
  background: rgba(255, 255, 255, 0.4);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.8);
  border-top-color: #ffffff; /* Brighter top edge */
  border-radius: 8px;
  box-shadow: 0 10px 20px rgba(0,0,0,0.1);
}
```

## App Implementation

### SwiftUI
```swift
struct FrutigerAeroView: View {
    var body: some View {
        ZStack {
            // Classic sky to grass gradient
            LinearGradient(
                colors: [Color(hex: "87CEEB"), Color(hex: "E0F6FF"), Color(hex: "98FB98")],
                startPoint: .top, endPoint: .bottom
            ).ignoresSafeArea()
            
            // Glossy Button
            Button(action: {}) {
                Text("Windows Vista")
                    .font(.headline)
                    .foregroundColor(.white)
                    .shadow(color: .black.opacity(0.5), radius: 1, y: -1) // Inset text shadow effect
                    .padding(.horizontal, 40)
                    .padding(.vertical, 16)
                    .background(
                        // Base gradient
                        LinearGradient(
                            stops: [
                                .init(color: Color(hex: "73c8f8"), location: 0.0),
                                .init(color: Color(hex: "1583d7"), location: 0.5),
                                .init(color: Color(hex: "0361a3"), location: 0.5), // Sharp color stop
                                .init(color: Color(hex: "299eef"), location: 1.0)
                            ],
                            startPoint: .top, endPoint: .bottom
                        )
                    )
                    .cornerRadius(25)
                    .overlay(
                        // Top white specular highlight
                        RoundedRectangle(cornerRadius: 25)
                            .stroke(
                                LinearGradient(colors: [.white, .clear], startPoint: .top, endPoint: .bottom),
                                lineWidth: 1.5
                            )
                    )
                    .shadow(color: .black.opacity(0.3), radius: 5, y: 4)
            }
        }
    }
}
// Note: Color(hex:) requires a custom extension in SwiftUI.
```
- The signature Frutiger Aero "gel" look requires a sharp color transition right in the middle. Set two gradient stops at `0.5` with different colors.
- An `.overlay` with a top-down white-to-clear gradient stroke creates the glass highlight edge.

### Flutter
```dart
class FrutigerAeroScreen extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Container(
        // Sky/Grass background
        decoration: const BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topCenter, end: Alignment.bottomCenter,
            colors: [Color(0xFF87CEEB), Color(0xFFE0F6FF), Color(0xFF98FB98)],
          ),
        ),
        child: Center(
          child: Container(
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(25),
              boxShadow: const [BoxShadow(color: Colors.black38, blurRadius: 6, offset: Offset(0, 4))],
              // Glossy Gel Button
              gradient: const LinearGradient(
                begin: Alignment.topCenter, end: Alignment.bottomCenter,
                stops: [0.0, 0.5, 0.5, 1.0], // Sharp transition at 50%
                colors: [
                  Color(0xFF73C8F8), // Light top
                  Color(0xFF1583D7), // Mid top
                  Color(0xFF0361A3), // Dark mid (creates the glass horizon)
                  Color(0xFF299EEF), // Bright bottom reflection
                ],
              ),
              border: Border.all(color: Colors.white.withOpacity(0.5), width: 1),
            ),
            child: Material(
              color: Colors.transparent,
              child: InkWell(
                borderRadius: BorderRadius.circular(25),
                onTap: () {},
                child: const Padding(
                  padding: EdgeInsets.symmetric(horizontal: 40, vertical: 16),
                  child: Text(
                    'Media Player',
                    style: TextStyle(
                      color: Colors.white,
                      fontWeight: FontWeight.bold,
                      shadows: [Shadow(color: Colors.black54, offset: Offset(0, -1))],
                    ),
                  ),
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}
```
- Flutter's `LinearGradient` `stops` array is perfect for this. Providing `0.5` twice creates a hard line that mimics a curved glass reflection.
- Use `Text` shadows with a negative `offset: Offset(0, -1)` to recreate the classic etched-text look of the 2000s.

### React Native
```jsx
import LinearGradient from 'react-native-linear-gradient';

const FrutigerAeroScreen = () => {
  return (
    <LinearGradient
      colors={['#87CEEB', '#E0F6FF', '#98FB98']}
      style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}
    >
      <View style={{
        shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, 
        shadowOpacity: 0.3, shadowRadius: 5, elevation: 8
      }}>
        <LinearGradient
          colors={['#73C8F8', '#1583D7', '#0361A3', '#299EEF']}
          locations={[0, 0.5, 0.5, 1]} // The sharp glass horizon
          style={{
            borderRadius: 25,
            paddingVertical: 16,
            paddingHorizontal: 40,
            borderWidth: 1,
            borderColor: 'rgba(255,255,255,0.6)',
            borderTopWidth: 2 // Stronger specular highlight on top
          }}
        >
          <Text style={{ 
            color: '#FFF', 
            fontWeight: 'bold', 
            textShadowColor: 'rgba(0,0,0,0.5)', 
            textShadowOffset: { width: 0, height: -1 }, 
            textShadowRadius: 1 
          }}>
            Glossy Button
          </Text>
        </LinearGradient>
      </View>
    </LinearGradient>
  );
};
```
- `react-native-linear-gradient` supports `locations`. Set them to `[0, 0.5, 0.5, 1]` to create the two-tone convex reflection.
- Setting `borderTopWidth: 2` with a white border color effectively simulates the bright white top-edge highlight of a shiny plastic object.

### Jetpack Compose
```kotlin
@Composable
fun FrutigerAeroScreen() {
    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(
                Brush.verticalGradient(listOf(Color(0xFF87CEEB), Color(0xFFE0F6FF), Color(0xFF98FB98)))
            ),
        contentAlignment = Alignment.Center
    ) {
        // Glossy Button
        val glassBrush = Brush.verticalGradient(
            0.0f to Color(0xFF73C8F8),
            0.49f to Color(0xFF1583D7),
            0.5f to Color(0xFF0361A3), // Sharp reflection line
            1.0f to Color(0xFF299EEF)
        )

        Box(
            modifier = Modifier
                .shadow(8.dp, RoundedCornerShape(25.dp))
                .background(glassBrush, RoundedCornerShape(25.dp))
                .border(
                    width = 1.dp,
                    brush = Brush.verticalGradient(listOf(Color.White, Color.Transparent)), // Top highlight
                    shape = RoundedCornerShape(25.dp)
                )
                .clickable { }
                .padding(horizontal = 40.dp, vertical = 16.dp)
        ) {
            Text(
                text = "Eco Tech",
                color = Color.White,
                fontWeight = FontWeight.Bold,
                style = TextStyle(
                    shadow = Shadow(color = Color.Black.copy(alpha = 0.5f), offset = Offset(0f, -2f), blurRadius = 2f)
                )
            )
        }
    }
}
```
- Compose's `Brush.verticalGradient` accepts `vararg colorStops: Pair<Float, Color>`. Use `0.49f` and `0.5f` to create the hard reflection line.
- A gradient border `Modifier.border(brush = ...)` transitioning from White to Transparent perfectly recreates the top-down specular highlight.

## Do's and Don'ts
- **DO**: Include imagery of lens flares, auroras, or water bubbles if appropriate.
- **DON'T**: Make it flat. Frutiger Aero is the ultimate antithesis of Flat Design. Everything must shine.
