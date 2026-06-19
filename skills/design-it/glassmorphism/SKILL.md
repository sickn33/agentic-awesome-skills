---
name: glassmorphism
description: Web and App implementation guide for Glassmorphism. Trigger when user wants a frosted glass effect, blurred backgrounds, transparency, or a sleek MacOS-like feel.
date_added: "2026-06-17"
risk: safe
source: self
source_type: self
---

# Glassmorphism

> "Looking through a frosted window. Interfaces that blend seamlessly with vibrant backgrounds."


## When to Use
Use this sub-style when the user's request matches the aesthetic described above. This is a child reference of the `design-it` skill and is not meant to be triggered directly.

## Core Principles
1. **Background Blur (Backdrop Filter)**: The defining characteristic. Elements blur whatever is underneath them.
2. **Semi-transparent White/Dark Backgrounds**: Panels use rgba() colors to let the background shine through.
3. **Subtle Light Borders**: A 1px semi-transparent white (or light) border to simulate the glass edge catching the light.

## Visual DNA
- **Colors**: Requires a vibrant or textured background to work (e.g., gradients, abstract meshes, or photos). Works beautifully over **Yacht Club** or **Earth-Grounded Elegance** if there is underlying visual texture.
- **Typography**: Clean, geometric sans-serifs. High contrast text (pure white or pure black) is required for legibility against the glass.
- **Shadows**: Soft, subtle drop shadows to detach the glass pane from the background.

## Web Implementation
- Rely heavily on `backdrop-filter: blur()`.
- **CSS Example**:
```css
body {
  /* Requires a complex background to see the glass effect */
  background: url('abstract-mesh.jpg') cover; 
}

.glass-panel {
  background: rgba(255, 255, 255, 0.15); /* Light glass */
  /* OR background: rgba(0, 0, 0, 0.25); for Dark glass */
  
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  
  border: 1px solid rgba(255, 255, 255, 0.3); /* The glass edge */
  border-radius: 16px;
  box-shadow: 0 4px 30px rgba(0, 0, 0, 0.1);
  
  padding: 32px;
}
```

## App Implementation

### SwiftUI
```swift
struct GlassCard: View {
    var body: some View {
        ZStack {
            // Vibrant background required for glass to show
            LinearGradient(
                colors: [.purple, .blue, .cyan],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
            .ignoresSafeArea()
            
            // Glass panel
            VStack(alignment: .leading, spacing: 16) {
                Text("Glass Panel")
                    .font(.system(size: 22, weight: .semibold))
                    .foregroundColor(.white)
                Text("Content floating on frosted glass.")
                    .font(.system(size: 15))
                    .foregroundColor(.white.opacity(0.8))
                
                Button(action: {}) {
                    Text("Continue")
                        .font(.system(size: 15, weight: .semibold))
                        .foregroundColor(.white)
                        .padding(.horizontal, 24)
                        .padding(.vertical, 12)
                        .background(.ultraThinMaterial)
                        .cornerRadius(8)
                }
            }
            .padding(24)
            .background(.ultraThinMaterial)  // Built-in frosted glass
            .cornerRadius(16)
            .overlay(
                RoundedRectangle(cornerRadius: 16)
                    .stroke(.white.opacity(0.3), lineWidth: 1) // Glass edge highlight
            )
            .shadow(color: .black.opacity(0.1), radius: 20, x: 0, y: 10)
            .padding(24)
        }
    }
}
```
- Use `.ultraThinMaterial`, `.thinMaterial`, `.regularMaterial`, `.thickMaterial` — Apple built glassmorphism natively.
- Add `.overlay(RoundedRectangle().stroke(.white.opacity(0.3)))` for the light edge catch.
- Glass only works if there's a vibrant background visible behind it.

### Flutter
```dart
class GlassCard extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Stack(
      children: [
        // Vibrant background
        Container(
          decoration: const BoxDecoration(
            gradient: LinearGradient(
              colors: [Colors.purple, Colors.blue, Colors.cyan],
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
            ),
          ),
        ),
        // Glass panel
        Center(
          child: ClipRRect(
            borderRadius: BorderRadius.circular(16),
            child: BackdropFilter(
              filter: ImageFilter.blur(sigmaX: 16, sigmaY: 16),
              child: Container(
                padding: const EdgeInsets.all(24),
                decoration: BoxDecoration(
                  color: Colors.white.withOpacity(0.15),
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(
                    color: Colors.white.withOpacity(0.3),
                    width: 1,
                  ),
                  boxShadow: [
                    BoxShadow(
                      color: Colors.black.withOpacity(0.1),
                      blurRadius: 20,
                      offset: const Offset(0, 10),
                    ),
                  ],
                ),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text('Glass Panel',
                      style: TextStyle(fontSize: 22, fontWeight: FontWeight.w600,
                        color: Colors.white)),
                    const SizedBox(height: 16),
                    Text('Content floating on frosted glass.',
                      style: TextStyle(fontSize: 15,
                        color: Colors.white.withOpacity(0.8))),
                  ],
                ),
              ),
            ),
          ),
        ),
      ],
    );
  }
}
```
- **Critical**: `BackdropFilter` MUST be wrapped in `ClipRRect` — without clipping, the blur applies to the entire screen.
- Use `ImageFilter.blur(sigmaX: 10...20, sigmaY: 10...20)` for the frosted effect.
- Set the container color to `Colors.white.withOpacity(0.1...0.2)` — too opaque kills the glass look.

### React Native
```jsx
import { BlurView } from '@react-native-community/blur';

const GlassCard = () => (
  <View style={{ flex: 1 }}>
    {/* Vibrant background */}
    <LinearGradient
      colors={['#9B59B6', '#3498DB', '#1ABC9C']}
      style={StyleSheet.absoluteFill}
    />
    
    {/* Glass panel */}
    <View style={{
      margin: 24,
      borderRadius: 16,
      overflow: 'hidden', // Required for blur clipping
    }}>
      <BlurView
        blurType="light"
        blurAmount={16}
        style={{ padding: 24 }}
      >
        <View style={{
          // Glass border overlay
          borderRadius: 16,
          borderWidth: 1,
          borderColor: 'rgba(255,255,255,0.3)',
        }}>
          <Text style={{
            fontSize: 22, fontWeight: '600', color: '#FFF',
            marginBottom: 16,
          }}>
            Glass Panel
          </Text>
          <Text style={{
            fontSize: 15, color: 'rgba(255,255,255,0.8)',
          }}>
            Content floating on frosted glass.
          </Text>
        </View>
      </BlurView>
    </View>
  </View>
);
```
- Install `@react-native-community/blur` — React Native has NO native blur support.
- Wrap the `BlurView` parent in a `View` with `overflow: 'hidden'` and `borderRadius` to clip the blur.
- Use `blurType: 'light'` for light glass, `'dark'` for dark glass, `'chromeMaterial'` for iOS Chrome effect.
- **Android limitation**: `BlurView` performance varies on Android. Test thoroughly.

### Jetpack Compose
```kotlin
@Composable
fun GlassCard() {
    Box(modifier = Modifier.fillMaxSize()) {
        // Vibrant background
        Box(modifier = Modifier
            .fillMaxSize()
            .background(Brush.linearGradient(
                colors = listOf(Color(0xFF9B59B6), Color(0xFF3498DB), Color(0xFF1ABC9C)),
                start = Offset.Zero,
                end = Offset.Infinite,
            ))
        )
        
        // Glass panel — Compose lacks native backdrop-filter,
        // so use a semi-transparent surface with blur via Modifier.blur()
        Card(
            modifier = Modifier
                .padding(24.dp)
                .align(Alignment.Center),
            shape = RoundedCornerShape(16.dp),
            colors = CardDefaults.cardColors(
                containerColor = Color.White.copy(alpha = 0.15f),
            ),
            border = BorderStroke(1.dp, Color.White.copy(alpha = 0.3f)),
            elevation = CardDefaults.cardElevation(defaultElevation = 0.dp),
        ) {
            Column(modifier = Modifier.padding(24.dp)) {
                Text("Glass Panel",
                    fontSize = 22.sp,
                    fontWeight = FontWeight.SemiBold,
                    color = Color.White)
                Spacer(Modifier.height(16.dp))
                Text("Content floating on frosted glass.",
                    fontSize = 15.sp,
                    color = Color.White.copy(alpha = 0.8f))
            }
        }
    }
}
```
- **Compose limitation**: True `backdrop-filter` blur doesn't exist natively. Use `Modifier.blur()` (API 31+) on the background, or use `RenderEffect.createBlurEffect()` for lower APIs.
- Use the `haze` library (`dev.chrisbanes.haze`) for proper glassmorphism in Compose — it provides `Modifier.haze()` and `Modifier.hazeChild()`.
- Without native blur, fallback to `Color.White.copy(alpha = 0.15f)` with a strong `border` to simulate the glass edge.

## Do's and Don'ts
- **DO**: Ensure there is enough contrast between text and the blurred background. Accessibility is often a challenge with this style.
- **DON'T**: Use Glassmorphism on a solid white or solid black background—the effect will be completely invisible.

## Limitations
- This is a styling reference and does not replace environment-specific validation, accessibility testing, or expert review.
- Ensure appropriate contrast ratios and responsive behaviors are verified separately.
