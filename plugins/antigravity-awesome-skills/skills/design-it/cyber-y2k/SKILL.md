---
name: cyber-y2k
description: Web and App implementation guide for Cyber Y2K. Trigger when user wants modern Y2K, holographic visuals, and glitch aesthetics.
date_added: "2026-06-17"
risk: safe
source: self
source_type: self
---

# Cyber Y2K

> "Y2K, but seen through a distorted, modern lens. Darker, glitchier, and highly holographic."


## When to Use
Use this sub-style when the user's request matches the aesthetic described above. This is a child reference of the `design-it` skill and is not meant to be triggered directly.

## Core Principles
1. **Holographic Gradients**: Iridescent, oil-slick color palettes that shift as you move.
2. **Glitch Art**: Text or images that appear corrupted, split into RGB channels, or stutter.
3. **Tribal & Tribal-Tech Vectors**: Sharp, aggressive vector graphics (think early 2000s tribal tattoos mixed with circuit boards).

## Visual DNA
- **Colors**: Deep black background. Highlights are holographic (purple, cyan, lime green, hot pink all mixed into fluid gradients).
- **Typography**: Extremely bold, stretched fonts, or highly technical monospace fonts.
- **Visuals**: CD-ROM reflections, barbed wire graphics, and heavy chromatic aberration.

## Web Implementation
- Use CSS animations for glitching and animated background gradients.
- **CSS Example**:
```css
body {
  background-color: #050505;
  color: #fff;
}

/* Holographic button */
.cyber-y2k-btn {
  background: linear-gradient(124deg, #ff2400, #e81d1d, #e8b71d, #e3e81d, #1de840, #1ddde8, #2b1de8, #dd00f3, #dd00f3);
  background-size: 1800% 1800%;
  animation: rainbow 18s ease infinite;
  
  color: #fff;
  font-weight: 900;
  text-transform: uppercase;
  border: 1px solid rgba(255,255,255,0.5);
  border-radius: 30px;
  padding: 16px 32px;
  mix-blend-mode: screen; /* Makes it interact with background */
}

@keyframes rainbow { 
  0%{background-position:0% 82%}
  50%{background-position:100% 19%}
  100%{background-position:0% 82%}
}

/* RGB Split text effect */
.glitch-text {
  position: relative;
  font-family: 'Courier New', monospace;
  font-size: 3rem;
  font-weight: bold;
}
.glitch-text::before, .glitch-text::after {
  content: attr(data-text);
  position: absolute;
  top: 0; left: 0;
  opacity: 0.8;
}
.glitch-text::before {
  color: #0ff;
  z-index: -1;
  transform: translate(-3px, 2px);
}
.glitch-text::after {
  color: #f0f;
  z-index: -2;
  transform: translate(3px, -2px);
}
```

## App Implementation

### SwiftUI
```swift
struct CyberY2KView: View {
    @State private var rotation: Double = 0
    
    var body: some View {
        ZStack {
            Color.black.ignoresSafeArea()
            
            VStack(spacing: 40) {
                // Glitch Text
                ZStack {
                    Text("SYSTEM.ERROR")
                        .font(.custom("Courier New", size: 40).bold())
                        .foregroundColor(.cyan)
                        .offset(x: -3, y: 2) // RGB split channel 1
                    
                    Text("SYSTEM.ERROR")
                        .font(.custom("Courier New", size: 40).bold())
                        .foregroundColor(.pink)
                        .offset(x: 3, y: -2) // RGB split channel 2
                    
                    Text("SYSTEM.ERROR")
                        .font(.custom("Courier New", size: 40).bold())
                        .foregroundColor(.white)
                }
                
                // Holographic Button
                Button(action: {}) {
                    Text("ENTER MATRIX")
                        .font(.headline.weight(.black))
                        .foregroundColor(.white)
                        .padding(.horizontal, 32)
                        .padding(.vertical, 16)
                        .background(
                            AngularGradient(
                                gradient: Gradient(colors: [.red, .yellow, .green, .cyan, .blue, .purple, .red]),
                                center: .center,
                                angle: .degrees(rotation)
                            )
                        )
                        .cornerRadius(30)
                        .overlay(RoundedRectangle(cornerRadius: 30).stroke(Color.white.opacity(0.5), lineWidth: 1))
                }
                .onAppear {
                    withAnimation(.linear(duration: 5).repeatForever(autoreverses: false)) {
                        rotation = 360
                    }
                }
            }
        }
    }
}
```
- The RGB Glitch effect is incredibly simple in SwiftUI: stack three identical `Text` views in a `ZStack`. Give the bottom ones `.cyan` and `.pink` colors and slightly `.offset()` them.
- Use an `AngularGradient` bound to a rotating `@State` variable to achieve the iridescent CD-ROM holographic effect.

### Flutter
```dart
class CyberY2KScreen extends StatefulWidget {
  @override
  State<CyberY2KScreen> createState() => _CyberY2KScreenState();
}

class _CyberY2KScreenState extends State<CyberY2KScreen> with SingleTickerProviderStateMixin {
  late AnimationController _controller;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(vsync: this, duration: const Duration(seconds: 5))..repeat();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.black,
      body: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            // Glitch Text
            Stack(
              children: [
                Transform.translate(offset: const Offset(-3, 2), child: const Text('SYSTEM.ERROR', style: TextStyle(color: Colors.cyan, fontSize: 40, fontFamily: 'Courier', fontWeight: FontWeight.bold))),
                Transform.translate(offset: const Offset(3, -2), child: const Text('SYSTEM.ERROR', style: TextStyle(color: Colors.pinkAccent, fontSize: 40, fontFamily: 'Courier', fontWeight: FontWeight.bold))),
                const Text('SYSTEM.ERROR', style: TextStyle(color: Colors.white, fontSize: 40, fontFamily: 'Courier', fontWeight: FontWeight.bold)),
              ],
            ),
            const SizedBox(height: 60),
            // Holographic Button via ShaderMask
            AnimatedBuilder(
              animation: _controller,
              builder: (context, child) {
                return ShaderMask(
                  shaderCallback: (Rect bounds) {
                    return SweepGradient(
                      colors: const [Colors.red, Colors.yellow, Colors.green, Colors.cyan, Colors.blue, Colors.purple, Colors.red],
                      transform: GradientRotation(_controller.value * 2 * 3.14159), // Rotate through 360 degrees
                    ).createShader(bounds);
                  },
                  child: Container(
                    decoration: BoxDecoration(
                      color: Colors.white, // Color to be masked by shader
                      borderRadius: BorderRadius.circular(30),
                      border: Border.all(color: Colors.white.withOpacity(0.5)),
                    ),
                    padding: const EdgeInsets.symmetric(horizontal: 32, vertical: 16),
                    child: const Text('ENTER MATRIX', style: TextStyle(color: Colors.black, fontWeight: FontWeight.w900)),
                  ),
                );
              },
            ),
          ],
        ),
      ),
    );
  }
}
```
- In Flutter, a `ShaderMask` with a `SweepGradient` attached to an `AnimationController` creates a perfect, performant oil-slick holographic effect over any widget.
- Use `Stack` and `Transform.translate` to build the RGB glitch text.

### React Native
```jsx
// Requires react-native-linear-gradient for complex gradients
import LinearGradient from 'react-native-linear-gradient';

const GlitchText = ({ text }) => {
  const baseStyle = { fontSize: 40, fontFamily: 'Courier', fontWeight: 'bold', position: 'absolute' };
  return (
    <View style={{ alignItems: 'center', height: 50, justifyContent: 'center' }}>
      <Text style={[baseStyle, { color: '#00FFFF', transform: [{ translateX: -3 }, { translateY: 2 }] }]}>{text}</Text>
      <Text style={[baseStyle, { color: '#FF00FF', transform: [{ translateX: 3 }, { translateY: -2 }] }]}>{text}</Text>
      <Text style={[baseStyle, { color: '#FFF' }]}>{text}</Text>
    </View>
  );
};

const CyberY2KScreen = () => {
  return (
    <View style={{ flex: 1, backgroundColor: '#050505', justifyContent: 'center', alignItems: 'center' }}>
      <GlitchText text="SYSTEM.ERROR" />
      
      <View style={{ marginTop: 60 }}>
        {/* React Native cannot easily animate gradient angles natively.
            Use a complex LinearGradient to simulate the iridescent shine. */}
        <LinearGradient
          colors={['#ff2400', '#e8b71d', '#1de840', '#1ddde8', '#dd00f3']}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          style={{
            borderRadius: 30, padding: 16, paddingHorizontal: 32,
            borderWidth: 1, borderColor: 'rgba(255,255,255,0.5)'
          }}
        >
          <Text style={{ color: '#FFF', fontWeight: '900' }}>ENTER MATRIX</Text>
        </LinearGradient>
      </View>
    </View>
  );
};
```
- Stacked absolute `<Text>` nodes handle the RGB split glitch well.
- True animating holographic gradients (like Sweep/Angular) require `@shopify/react-native-skia`. If Skia is unavailable, use a static multi-stop `LinearGradient` as a fallback.

### Jetpack Compose
```kotlin
@Composable
fun GlitchText(text: String) {
    Box(contentAlignment = Alignment.Center) {
        Text(text, color = Color.Cyan, fontSize = 40.sp, fontFamily = FontFamily.Monospace, fontWeight = FontWeight.Bold,
            modifier = Modifier.offset(x = (-3).dp, y = 2.dp))
        Text(text, color = Color.Magenta, fontSize = 40.sp, fontFamily = FontFamily.Monospace, fontWeight = FontWeight.Bold,
            modifier = Modifier.offset(x = 3.dp, y = (-2).dp))
        Text(text, color = Color.White, fontSize = 40.sp, fontFamily = FontFamily.Monospace, fontWeight = FontWeight.Bold)
    }
}

@Composable
fun CyberY2KScreen() {
    val infiniteTransition = rememberInfiniteTransition()
    val rotation by infiniteTransition.animateFloat(
        initialValue = 0f,
        targetValue = 360f,
        animationSpec = infiniteRepeatable(
            animation = tween(5000, easing = LinearEasing)
        )
    )

    Column(
        modifier = Modifier.fillMaxSize().background(Color.Black),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center
    ) {
        GlitchText("SYSTEM.ERROR")
        
        Spacer(Modifier.height(60.dp))
        
        // Holographic Button
        Box(
            modifier = Modifier
                .background(
                    brush = Brush.sweepGradient(
                        colors = listOf(Color.Red, Color.Yellow, Color.Green, Color.Cyan, Color.Blue, Color.Magenta, Color.Red),
                        center = Offset.Unspecified
                    ),
                    shape = RoundedCornerShape(30.dp)
                )
                .graphicsLayer { rotationZ = rotation } // Note: This rotates the whole button. 
                // To rotate ONLY the gradient brush requires custom ShaderBrush or drawing the rect manually in drawBehind with a rotating matrix.
                .border(1.dp, Color.White.copy(alpha = 0.5f), RoundedCornerShape(30.dp))
                .padding(horizontal = 32.dp, vertical = 16.dp)
        ) {
            Text("ENTER MATRIX", color = Color.White, fontWeight = FontWeight.Black)
        }
    }
}
```
- Like other frameworks, use a `Box` to stack text with `Modifier.offset()` for glitches.
- A `Brush.sweepGradient` creates the holographic CD-ROM colors, though rotating the brush *itself* (not the whole widget) in Compose requires a bit of advanced `Matrix` manipulation inside a `ShaderBrush`.

## Do's and Don'ts
- **DO**: Incorporate UI elements that look like raw HTML/CSS (like visible tables or marquee tags) as an ironic nod to early web.
- **DON'T**: Use clean, modern geometric layouts. Cyber Y2K is chaotic and rebellious.

## Limitations
- This is a styling reference and does not replace environment-specific validation, accessibility testing, or expert review.
- Ensure appropriate contrast ratios and responsive behaviors are verified separately.
