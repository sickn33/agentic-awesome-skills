---
name: spatial-design
description: Web and App implementation guide for Spatial Design. Trigger when user wants environment-aware layouts, Apple Vision Pro inspiration, and mixed reality aesthetics.
---

# Spatial Design

> "UI that belongs in the room with you. Transparent, glass-like panels that react to the lighting of the physical space."

## Core Principles
1. **Environmental Transparency**: The UI acts like a glass pane. It is deeply reliant on background blur, but specifically aims to let the environment (or a simulated environment image) dictate the mood.
2. **Dynamic Lighting**: Elements respond to cursor position as if a flashlight is shining on them.
3. **Subtle Volume**: Not flat, but not extremely 3D. Elements have a very thin rim of light around the edge (specular highlight).

## Visual DNA
- **Colors**: Almost exclusively uses `rgba()` white or black. The actual color comes entirely from the background environment.
- **Typography**: Extremely sharp, high legibility. Often uses varying font weights to establish hierarchy without relying on color. Apple's `SF Pro` is the gold standard here.
- **Icons**: Outlined, high-legibility glyphs.

## Web Implementation
- **CSS Example**:
```css
body {
  /* Needs a complex background to look right */
  background: url('room-environment.jpg') cover;
}

.spatial-panel {
  /* The core material */
  background: rgba(255, 255, 255, 0.2); /* Very sheer */
  backdrop-filter: blur(40px) saturate(150%);
  -webkit-backdrop-filter: blur(40px) saturate(150%);
  
  border-radius: 32px;
  padding: 40px;
  
  /* The specular rim light */
  box-shadow: 
    inset 0 1px 1px rgba(255,255,255,0.6),
    inset 0 0 1px 1px rgba(255,255,255,0.2),
    0 24px 48px rgba(0,0,0,0.1);
}

.spatial-btn {
  background: rgba(0,0,0,0.1);
  color: white;
  border-radius: 20px;
  padding: 12px 24px;
  backdrop-filter: blur(10px);
  transition: all 0.2s;
}

.spatial-btn:hover {
  background: rgba(255,255,255,0.2);
  /* Highlight effect */
  box-shadow: inset 0 0 20px rgba(255,255,255,0.4);
}
```

## App Implementation

### SwiftUI
```swift
struct SpatialDesignView: View {
    var body: some View {
        ZStack {
            // Environment background
            Image("room-environment")
                .resizable()
                .aspectRatio(contentMode: .fill)
                .ignoresSafeArea()
            
            // Spatial Panel
            VStack(spacing: 24) {
                Text("Environmental UI")
                    .font(.title).fontWeight(.bold)
                    .foregroundColor(.white)
                
                Button(action: {}) {
                    Text("Interact")
                        .foregroundColor(.white)
                        .padding(.horizontal, 32)
                        .padding(.vertical, 16)
                }
                .background(.ultraThinMaterial)
                .clipShape(Capsule())
                .overlay(Capsule().stroke(Color.white.opacity(0.3), lineWidth: 1))
            }
            .padding(40)
            .background(.ultraThinMaterial) // The core spatial material
            .cornerRadius(32)
            // Specular rim light
            .overlay(
                RoundedRectangle(cornerRadius: 32)
                    .stroke(
                        LinearGradient(
                            colors: [.white.opacity(0.6), .white.opacity(0.1)],
                            startPoint: .topLeading, endPoint: .bottomTrailing
                        ), 
                        lineWidth: 1
                    )
            )
            // Very soft, diffuse shadow
            .shadow(color: .black.opacity(0.1), radius: 40, y: 20)
        }
    }
}
```
- `.background(.ultraThinMaterial)` is exactly what Apple uses for this aesthetic.
- The specular highlight is critical. Use an `.overlay` with a `LinearGradient` stroke to simulate a light source hitting the top-left edge of the glass.

### Flutter
```dart
import 'dart:ui';

class SpatialDesignScreen extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Stack(
        fit: StackFit.expand,
        children: [
          Image.asset('assets/room-environment.jpg', fit: BoxFit.cover),
          
          Center(
            child: ClipRRect(
              borderRadius: BorderRadius.circular(32),
              child: BackdropFilter(
                filter: ImageFilter.blur(sigmaX: 30.0, sigmaY: 30.0),
                child: Container(
                  width: 350,
                  padding: const EdgeInsets.all(40),
                  decoration: BoxDecoration(
                    color: Colors.white.withOpacity(0.1),
                    borderRadius: BorderRadius.circular(32),
                    // Specular rim light
                    border: Border.all(color: Colors.white.withOpacity(0.4), width: 1),
                  ),
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      const Text('Environmental UI', style: TextStyle(color: Colors.white, fontSize: 28, fontWeight: FontWeight.bold)),
                      const SizedBox(height: 32),
                      
                      // Spatial Button
                      ClipRRect(
                        borderRadius: BorderRadius.circular(50),
                        child: BackdropFilter(
                          filter: ImageFilter.blur(sigmaX: 10.0, sigmaY: 10.0),
                          child: Container(
                            padding: const EdgeInsets.symmetric(horizontal: 32, vertical: 16),
                            decoration: BoxDecoration(
                              color: Colors.black.withOpacity(0.1),
                              border: Border.all(color: Colors.white.withOpacity(0.2)),
                              borderRadius: BorderRadius.circular(50),
                            ),
                            child: const Text('Interact', style: TextStyle(color: Colors.white)),
                          ),
                        ),
                      )
                    ],
                  ),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
```
- `BackdropFilter` is required to blur the background.
- Notice the button *inside* the panel also has a `BackdropFilter`. This creates nested glass, which is a hallmark of Spatial Design.

### React Native
```jsx
// REQUIRES: @react-native-community/blur
import { BlurView } from '@react-native-community/blur';

const SpatialDesignScreen = () => {
  return (
    <ImageBackground source={{uri: 'room_bg'}} style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      
      <View style={{ width: '85%', shadowColor: '#000', shadowOffset: { width: 0, height: 20 }, shadowOpacity: 0.1, shadowRadius: 40, elevation: 10 }}>
        <BlurView
          style={{ borderRadius: 32, borderWidth: 1, borderColor: 'rgba(255,255,255,0.4)', padding: 40, alignItems: 'center' }}
          blurType="light"
          blurAmount={20}
        >
          <Text style={{ color: '#FFF', fontSize: 28, fontWeight: 'bold', marginBottom: 32 }}>
            Environmental UI
          </Text>

          <View style={{ borderRadius: 50, overflow: 'hidden' }}>
            <BlurView blurType="dark" blurAmount={10} style={{ paddingVertical: 16, paddingHorizontal: 32, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' }}>
              <Text style={{ color: '#FFF', fontSize: 16 }}>Interact</Text>
            </BlurView>
          </View>
        </BlurView>
      </View>

    </ImageBackground>
  );
};
```
- `BlurView` from `@react-native-community/blur` is the only way to achieve this.
- Use `blurType="light"` for the main panel and `blurType="dark"` for the buttons to create contrast between the glass layers.

### Jetpack Compose
```kotlin
@Composable
fun SpatialDesignScreen() {
    Box(modifier = Modifier.fillMaxSize()) {
        Image(painterResource(R.drawable.room_environment), null, contentScale = ContentScale.Crop, modifier = Modifier.fillMaxSize())
        
        Box(
            modifier = Modifier
                .align(Alignment.Center)
                .width(350.dp)
                // Shadow goes on the outside
                .shadow(20.dp, RoundedCornerShape(32.dp), spotColor = Color.Black.copy(alpha = 0.1f))
                // Android 12+ Blur
                .graphicsLayer {
                    renderEffect = RenderEffect.createBlurEffect(30f, 30f, Shader.TileMode.DECAL).asComposeRenderEffect()
                    clip = true
                    shape = RoundedCornerShape(32.dp)
                }
                .background(Color.White.copy(alpha = 0.1f))
                .border(1.dp, Brush.linearGradient(listOf(Color.White.copy(alpha = 0.6f), Color.Transparent)), RoundedCornerShape(32.dp))
                .padding(40.dp),
            contentAlignment = Alignment.Center
        ) {
            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                Text("Environmental UI", color = Color.White, fontSize = 28.sp, fontWeight = FontWeight.Bold)
                Spacer(Modifier.height(32.dp))
                
                // Button
                Box(
                    modifier = Modifier
                        .background(Color.Black.copy(alpha = 0.1f), CircleShape)
                        .border(1.dp, Color.White.copy(alpha = 0.2f), CircleShape)
                        .padding(horizontal = 32.dp, vertical = 16.dp)
                ) {
                    Text("Interact", color = Color.White)
                }
            }
        }
    }
}
```
- The `Brush.linearGradient` applied to the `Modifier.border` perfectly simulates the top-down rim light hitting a thick pane of glass.

## Do's and Don'ts
- **DO**: Crank up the `saturate()` filter on the backdrop blur to make the background colors pop through the glass.
- **DON'T**: Use dark, opaque drop shadows. The UI should look like glass, which doesn't cast harsh shadows.
