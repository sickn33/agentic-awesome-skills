---
name: aurora-ui
description: Web and App implementation guide for Aurora UI. Trigger when user wants gradient glows, color blobs, and atmospheric lighting effects.
date_added: "2026-06-17"
risk: safe
source: self
source_type: self
---

# Aurora UI

> "Ethereal, shifting lights. Like the Northern Lights trapped beneath a pane of frosted glass."


## When to Use
Use this sub-style when the user's request matches the aesthetic described above. This is a child reference of the `design-it` skill and is not meant to be triggered directly.

## Core Principles
1. **Blurred Color Orbs**: Large, out-of-focus, highly saturated color blobs floating in the background.
2. **Glassy Overlays**: Foreground elements are often semi-transparent (glassmorphism) to let the aurora effect shine through.
3. **Fluid Motion**: The background color orbs should slowly drift, expand, and contract.

## Visual DNA
- **Colors**: Requires dark, deep backgrounds with vibrant, luminous accents. **Midnight Luxury** or **Yacht Club** (modified to dark mode) work well, injecting bright cyan, magenta, or lime green as the glowing orbs.
- **Typography**: Thin, elegant sans-serifs or sophisticated serif fonts. High contrast white text.
- **Layout**: Keep foreground UI elements minimal to let the background remain the star.

## Web Implementation
- Best achieved with absolute-positioned, heavily blurred `div`s behind the main content.
- **CSS Example**:
```css
body {
  background-color: #0A0A0A;
  overflow-x: hidden;
  position: relative;
}

/* The Glowing Orb */
.aurora-blob {
  position: absolute;
  width: 400px;
  height: 400px;
  background: radial-gradient(circle, rgba(181,154,95,0.8) 0%, rgba(181,154,95,0) 70%);
  border-radius: 50%;
  filter: blur(80px);
  z-index: -1;
  animation: float 20s infinite ease-in-out alternate;
}

.aurora-blob.blue {
  background: radial-gradient(circle, rgba(92,107,115,0.8) 0%, rgba(0,0,0,0) 70%);
  top: 20%;
  left: 60%;
  animation-delay: -5s;
}

@keyframes float {
  0% { transform: translate(0, 0) scale(1); }
  50% { transform: translate(-50px, 100px) scale(1.2); }
  100% { transform: translate(100px, -50px) scale(0.9); }
}

/* Foreground content should be glassmorphic */
.aurora-card {
  background: rgba(255,255,255,0.03);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(255,255,255,0.05);
  border-radius: 24px;
}
```

## App Implementation

### SwiftUI
```swift
struct AuroraView: View {
    @State private var animate = false
    
    var body: some View {
        ZStack {
            // Dark background
            Color.black.ignoresSafeArea()
            
            // Animated Orbs
            Circle()
                .fill(Color(red: 0.71, green: 0.60, blue: 0.37)) // #B59A5F
                .blur(radius: 80)
                .frame(width: 300, height: 300)
                .offset(x: animate ? -50 : 50, y: animate ? -100 : 0)
            
            Circle()
                .fill(Color(red: 0.36, green: 0.42, blue: 0.45)) // #5C6B73
                .blur(radius: 80)
                .frame(width: 300, height: 300)
                .offset(x: animate ? 100 : -50, y: animate ? 100 : -50)
            
            // Glassy Foreground content
            VStack {
                Text("Aurora Interface")
                    .font(.largeTitle.bold())
                    .foregroundColor(.white)
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity)
            .background(.ultraThinMaterial)
        }
        .onAppear {
            withAnimation(.easeInOut(duration: 10).repeatForever(autoreverses: true)) {
                animate = true
            }
        }
    }
}
```
- Use `Circle().blur(radius: 80...120)` in a `ZStack` underneath the main content.
- Animate the `.offset()` with a very long `duration (10-20 seconds)`.
- Use `.background(.ultraThinMaterial)` on foreground containers to let the colored light bleed through nicely.

### Flutter
```dart
import 'dart:ui';

class AuroraView extends StatefulWidget {
  @override
  State<AuroraView> createState() => _AuroraViewState();
}

class _AuroraViewState extends State<AuroraView> with SingleTickerProviderStateMixin {
  late AnimationController _controller;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(vsync: this, duration: const Duration(seconds: 10))..repeat(reverse: true);
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.black,
      body: Stack(
        children: [
          // Animated orb
          AnimatedBuilder(
            animation: _controller,
            builder: (context, child) {
              return Positioned(
                top: 100 + (_controller.value * 100),
                left: -50 + (_controller.value * 100),
                child: Container(
                  width: 300,
                  height: 300,
                  decoration: const BoxDecoration(
                    shape: BoxShape.circle,
                    color: Color(0xFFB59A5F),
                  ),
                ),
              );
            },
          ),
          // Massive blur layer over the orbs
          Positioned.fill(
            child: BackdropFilter(
              filter: ImageFilter.blur(sigmaX: 80, sigmaY: 80),
              child: Container(color: Colors.transparent),
            ),
          ),
          // Glassy Foreground
          Center(
            child: ClipRRect(
              borderRadius: BorderRadius.circular(24),
              child: BackdropFilter(
                filter: ImageFilter.blur(sigmaX: 16, sigmaY: 16),
                child: Container(
                  padding: const EdgeInsets.all(32),
                  color: Colors.white.withOpacity(0.05),
                  child: const Text('Aurora Interface',
                    style: TextStyle(color: Colors.white, fontSize: 24, fontWeight: FontWeight.bold)),
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
- A massive full-screen `BackdropFilter` over moving solid circles is often more performant than blurring each circle individually.
- Layer a second, weaker `BackdropFilter` for the actual foreground glassmorphism panels.

### React Native
```jsx
// Requires @react-native-community/blur
import { BlurView } from '@react-native-community/blur';

const AuroraView = () => {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(anim, { toValue: 1, duration: 10000, useNativeDriver: true }),
        Animated.timing(anim, { toValue: 0, duration: 10000, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  const translateY = anim.interpolate({ inputRange: [0, 1], outputRange: [0, 100] });

  return (
    <View style={{ flex: 1, backgroundColor: '#000' }}>
      {/* Orb — note: React Native struggles with massive live blurs, 
          so pre-rendered blurred PNGs are highly recommended for production */}
      <Animated.Image 
        source={require('./blurred_orb_cyan.png')} 
        style={{
          position: 'absolute',
          top: -50, left: -50,
          width: 400, height: 400,
          opacity: 0.8,
          transform: [{ translateY }]
        }}
      />

      {/* Glass Foreground */}
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <BlurView blurType="dark" blurAmount={20} style={{ padding: 32, borderRadius: 24 }}>
          <Text style={{ color: '#FFF', fontSize: 24, fontWeight: '700' }}>
            Aurora Interface
          </Text>
        </BlurView>
      </View>
    </View>
  );
};
```
- **Performance Warning**: Do NOT use `BlurView` with huge amounts for moving background orbs on React Native — it will lag terribly, especially on Android.
- **Best Practice**: Create large, already-blurred PNG images in Figma/Photoshop and animate those using `Animated.Image`.

### Jetpack Compose
```kotlin
@Composable
fun AuroraView() {
    val infiniteTransition = rememberInfiniteTransition()
    val offsetY by infiniteTransition.animateFloat(
        initialValue = -50f,
        targetValue = 100f,
        animationSpec = infiniteRepeatable(
            animation = tween(10000, easing = LinearEasing),
            repeatMode = RepeatMode.Reverse
        )
    )

    Box(modifier = Modifier
        .fillMaxSize()
        .background(Color.Black)) {
        
        // Blurred Orb
        Box(
            modifier = Modifier
                .offset(x = (-50).dp, y = offsetY.dp)
                .size(300.dp)
                .blur(80.dp) // API 31+ only!
                .background(Color(0xFFB59A5F), CircleShape)
        )
        
        // Pre-API 31 fallback: use a radial gradient instead of blur
        Box(
            modifier = Modifier
                .offset(x = 150.dp, y = (offsetY * -1).dp)
                .size(300.dp)
                .background(
                    Brush.radialGradient(
                        colors = listOf(Color(0xFF5C6B73).copy(alpha = 0.8f), Color.Transparent)
                    )
                )
        )

        // Glass panel
        Card(
            modifier = Modifier.align(Alignment.Center).padding(32.dp),
            colors = CardDefaults.cardColors(containerColor = Color.White.copy(alpha = 0.05f)),
            shape = RoundedCornerShape(24.dp),
        ) {
            Text("Aurora Interface",
                color = Color.White, fontSize = 24.sp, fontWeight = FontWeight.Bold,
                modifier = Modifier.padding(32.dp))
        }
    }
}
```
- `Modifier.blur()` is only fully supported on Android 12 (API 31+).
- **Critical Fallback**: For older devices, use `Brush.radialGradient` fading from color to `Color.Transparent` to fake the glowing orb effect without needing expensive blur calculations.

## Do's and Don'ts
- **DO**: Ensure the foreground text remains legible. If a bright orb floats behind white text, the text will vanish. Use glassy panels to guarantee contrast.
- **DON'T**: Use sharp gradients. Everything in the background must be heavily blurred and diffuse.
