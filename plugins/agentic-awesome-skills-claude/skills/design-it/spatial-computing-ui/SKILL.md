---
name: spatial-computing-ui
description: Web and App implementation guide for Spatial Computing UI. Trigger when user wants floating elements, environmental awareness, and Apple Vision Pro style.
date_added: "2026-06-17"
risk: safe
source: self
source_type: self
---

# Spatial Computing UI

> "A step beyond Spatial Design. Fully 3D windows floating in augmented reality."


## When to Use
Use this sub-style when the user's request matches the aesthetic described above. This is a child reference of the `design-it` skill and is not meant to be triggered directly.

## Core Principles
1. **Z-Space Hierarchy**: Not just drop shadows, but actual 3D distance. Modals float 10px *in front of* the main window.
2. **Gaze-Based Interaction Cues**: Elements highlight vividly when hovered, anticipating eye-tracking or precise pointer control.
3. **Glass and Light**: Windows are thick sheets of frosted glass that bend light and cast soft shadows onto the physical environment.

## Visual DNA
- **Colors**: Relies entirely on the background environment. Uses purely translucent whites (`rgba(255,255,255,0.x)`) and blacks. 
- **Typography**: `SF Pro`. Heavy use of varied font weights (Regular, Semibold, Bold) to create hierarchy.
- **Shapes**: High border radii (`24px`-`32px`). Everything is a rounded rectangle or a perfect circle.

## Web Implementation
- Best emulated using CSS 3D transforms to simulate the user's perspective.
- **CSS Example**:
```css
body {
  /* Simulate the physical room */
  background: url('living-room.jpg') center/cover;
  perspective: 1200px;
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100vh;
}

.spatial-window {
  width: 800px;
  height: 600px;
  border-radius: 32px;
  
  /* The Glass Material */
  background: rgba(255, 255, 255, 0.15);
  backdrop-filter: blur(50px) saturate(200%);
  -webkit-backdrop-filter: blur(50px) saturate(200%);
  
  /* Specular Highlights */
  border: 1px solid rgba(255, 255, 255, 0.4);
  box-shadow: 
    inset 0 1px 2px rgba(255, 255, 255, 0.8),
    0 30px 60px rgba(0, 0, 0, 0.3);
    
  /* 3D Positioning */
  transform: translateZ(-100px);
  transform-style: preserve-3d;
}

.spatial-modal {
  /* Floating in front of the main window */
  position: absolute;
  top: 50%; left: 50%;
  transform: translate(-50%, -50%) translateZ(50px);
  
  background: rgba(255, 255, 255, 0.6); /* More opaque */
  backdrop-filter: blur(30px);
  border-radius: 24px;
  padding: 30px;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.2);
}

.spatial-btn {
  /* Gaze/Hover interaction */
  background: rgba(0,0,0,0.05);
  transition: all 0.2s cubic-bezier(0.2, 0.8, 0.2, 1);
}
.spatial-btn:hover {
  background: rgba(255,255,255,0.4);
  transform: translateZ(10px) scale(1.05);
  box-shadow: 0 10px 20px rgba(0,0,0,0.1);
}
```

## App Implementation

### SwiftUI (visionOS Native / iOS emulation)
```swift
struct SpatialComputingView: View {
    var body: some View {
        ZStack {
            // Simulated room environment
            Image("living-room")
                .resizable()
                .aspectRatio(contentMode: .fill)
                .ignoresSafeArea()
            
            // Spatial Window
            VStack(spacing: 24) {
                Text("Spatial Window")
                    .font(.title).fontWeight(.bold)
                    .foregroundColor(.white)
                
                // Gaze-reactive button
                Button(action: {}) {
                    Text("Focus Me")
                        .fontWeight(.semibold)
                        .foregroundColor(.white)
                        .padding(.horizontal, 32)
                        .padding(.vertical, 16)
                        // .hoverEffect() is magic on visionOS/iPadOS
                        // .hoverEffect(.highlight)
                }
                .background(Color.black.opacity(0.2))
                .clipShape(Capsule())
            }
            .padding(60)
            // The magic glass material
            .background(.ultraThinMaterial)
            .cornerRadius(32)
            // Specular edge highlight
            .overlay(
                RoundedRectangle(cornerRadius: 32)
                    .stroke(Color.white.opacity(0.4), lineWidth: 1)
            )
            // Environmental shadow
            .shadow(color: .black.opacity(0.3), radius: 40, y: 30)
            
            // Z-Space Modal simulation (if on iOS)
            // On visionOS, this would be a separate window volume
            Text("Floating Modal")
                .foregroundColor(.white)
                .padding(30)
                .background(.thinMaterial)
                .cornerRadius(24)
                .shadow(color: .black.opacity(0.4), radius: 30, y: 20)
                .offset(x: 100, y: 100)
        }
    }
}
```
- Use `.ultraThinMaterial` for the base windows and `.thinMaterial` for floating popovers so they feel more opaque as they get closer to the eye.
- Use `.hoverEffect()` extensively if targeting iPadOS or visionOS.

### Flutter
```dart
import 'dart:ui';

class SpatialComputingScreen extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Stack(
        fit: StackFit.expand,
        children: [
          // Simulated Environment
          Image.asset('assets/living-room.jpg', fit: BoxFit.cover),
          
          Center(
            child: ClipRRect(
              borderRadius: BorderRadius.circular(32),
              child: BackdropFilter(
                filter: ImageFilter.blur(sigmaX: 40.0, sigmaY: 40.0), // Heavy blur
                child: Container(
                  width: 600, height: 400,
                  decoration: BoxDecoration(
                    color: Colors.white.withOpacity(0.15), // Glass tint
                    borderRadius: BorderRadius.circular(32),
                    border: Border.all(color: Colors.white.withOpacity(0.4), width: 1), // Specular highlight
                    // Note: BoxShadow won't render under BackdropFilter nicely unless wrapped in a separate PhysicalModel
                  ),
                  child: Center(
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        const Text('Spatial Window', style: TextStyle(color: Colors.white, fontSize: 32, fontWeight: FontWeight.bold)),
                        const SizedBox(height: 32),
                        // Simulated Gaze Button
                        InkWell(
                          onTap: () {},
                          borderRadius: BorderRadius.circular(50),
                          hoverColor: Colors.white.withOpacity(0.4), // Reacts to mouse/gaze
                          child: Container(
                            padding: const EdgeInsets.symmetric(horizontal: 32, vertical: 16),
                            decoration: BoxDecoration(color: Colors.black.withOpacity(0.2), borderRadius: BorderRadius.circular(50)),
                            child: const Text('Focus Me', style: TextStyle(color: Colors.white, fontSize: 18)),
                          ),
                        )
                      ],
                    ),
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
- You must wrap `BackdropFilter` inside a `ClipRRect` to give the blurred glass rounded corners.
- `hoverColor` on `InkWell` simulates the gaze-highlighting.

### React Native
```jsx
// REQUIRES: @react-native-community/blur
import { BlurView } from '@react-native-community/blur';

const SpatialComputingScreen = () => {
  return (
    <ImageBackground source={{uri: 'room_bg'}} style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      
      {/* Spatial Window */}
      <View style={{
        width: '90%', height: 400,
        shadowColor: '#000', shadowOffset: { width: 0, height: 30 },
        shadowOpacity: 0.3, shadowRadius: 40, elevation: 20
      }}>
        <BlurView
          style={{ flex: 1, borderRadius: 32, borderWidth: 1, borderColor: 'rgba(255,255,255,0.4)', padding: 40, justifyContent: 'center', alignItems: 'center' }}
          blurType="light"
          blurAmount={30}
          reducedTransparencyFallbackColor="gray"
        >
          <Text style={{ color: '#FFF', fontSize: 32, fontWeight: 'bold', marginBottom: 32 }}>
            Spatial Window
          </Text>

          {/* Touchable simulating Gaze */}
          <TouchableOpacity style={{
            backgroundColor: 'rgba(0,0,0,0.2)', paddingVertical: 16, paddingHorizontal: 32, borderRadius: 50
          }}>
            <Text style={{ color: '#FFF', fontSize: 18, fontWeight: '600' }}>Focus Me</Text>
          </TouchableOpacity>
        </BlurView>
      </View>

    </ImageBackground>
  );
};
```
- React Native's core cannot do background blur. You *must* install `@react-native-community/blur`.
- Apply shadows to a wrapper `View`, and put the `BlurView` inside it with `borderRadius` and `borderWidth`.

### Jetpack Compose
```kotlin
@Composable
fun SpatialComputingScreen() {
    Box(modifier = Modifier.fillMaxSize()) {
        // Environment
        Image(painterResource(R.drawable.living_room), contentDescription = null, contentScale = ContentScale.Crop, modifier = Modifier.fillMaxSize())
        
        // Spatial Window
        Box(
            modifier = Modifier
                .align(Alignment.Center)
                .size(600.dp, 400.dp)
                // Note: Native Android background blur requires Android 12+ (RenderEffect)
                .graphicsLayer {
                    renderEffect = RenderEffect.createBlurEffect(40f, 40f, Shader.TileMode.DECAL).asComposeRenderEffect()
                    clip = true
                    shape = RoundedCornerShape(32.dp)
                }
                .background(Color.White.copy(alpha = 0.15f))
                .border(1.dp, Color.White.copy(alpha = 0.4f), RoundedCornerShape(32.dp))
                .padding(40.dp),
            contentAlignment = Alignment.Center
        ) {
            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                Text("Spatial Window", color = Color.White, fontSize = 32.sp, fontWeight = FontWeight.Bold)
                Spacer(Modifier.height(32.dp))
                
                // Button
                Box(
                    modifier = Modifier
                        .background(Color.Black.copy(alpha = 0.2f), CircleShape)
                        .clickable { }
                        .padding(horizontal = 32.dp, vertical = 16.dp)
                ) {
                    Text("Focus Me", color = Color.White, fontSize = 18.sp, fontWeight = FontWeight.SemiBold)
                }
            }
        }
    }
}
```
- On Android 12+, use `RenderEffect.createBlurEffect` applied to the `graphicsLayer` to blur the UI *behind* the compose element.
- The `border` modifier applies the bright specular rim-light crucial to glass effects.

## Do's and Don'ts
- **DO**: Create a distinct visual pop (size increase and shadow depth increase) on hover/focus to simulate the gaze-tracking interaction of Spatial Computing.
- **DON'T**: Use flat, opaque colors for the main windows. They must be glass.

## Limitations
- This is a styling reference and does not replace environment-specific validation, accessibility testing, or expert review.
- Ensure appropriate contrast ratios and responsive behaviors are verified separately.
