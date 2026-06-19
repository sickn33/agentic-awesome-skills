---
name: vibrant-maximalism
description: Web and App implementation guide for Vibrant Maximalism. Trigger when user wants rich colors, dense layouts, extreme sensory input, and "more is more".
date_added: "2026-06-17"
risk: safe
source: self
source_type: self
---

# Vibrant Maximalism

> "More is more. An explosion of color, pattern, and typography."


## When to Use
Use this sub-style when the user's request matches the aesthetic described above. This is a child reference of the `design-it` skill and is not meant to be triggered directly.

## Core Principles
1. **Sensory Overload**: Every pixel is doing something. Patterns on top of gradients on top of photos.
2. **Clashing Colors**: Forget the standard rules of color harmony. Pair neon green with hot pink, or bright orange with electric blue.
3. **Multiple Fonts**: Mix 3 or 4 completely different typefaces in the same layout.

## Visual DNA
- **Colors**: All of them. Highly saturated, unmuted hues. No calm neutrals allowed.
- **Typography**: A chaotic mix. A massive serif headline, a bubble-letter subhead, and a monospace body text.
- **Visuals**: Stickers, repeating patterns, emojis, 3D renders, and marquee scrolling text.

## Web Implementation
- **CSS Example**:
```css
body {
  /* Complex clashing background */
  background: 
    radial-gradient(circle at 20% 30%, #FF00FF 0%, transparent 40%),
    radial-gradient(circle at 80% 70%, #00FFFF 0%, transparent 40%),
    url('checkerboard-pattern.png') repeat;
  background-color: #FFFF00;
  color: #000;
  overflow-x: hidden;
}

.max-headline {
  font-family: 'Anton', sans-serif;
  font-size: 8rem;
  text-transform: uppercase;
  line-height: 0.8;
  color: #FF0000;
  /* Crazy shadow effect */
  text-shadow: 
    4px 4px 0px #000,
    8px 8px 0px #00FFFF,
    12px 12px 0px #FF00FF;
  transform: rotate(-3deg);
}

.max-sticker {
  position: absolute;
  background: #000;
  color: #00FF00;
  font-family: monospace;
  padding: 10px;
  border-radius: 50%;
  width: 100px;
  height: 100px;
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
  border: 4px dashed #FF00FF;
  animation: spin 10s linear infinite;
}

@keyframes spin { 100% { transform: rotate(360deg); } }

.max-card {
  background: rgba(255, 255, 255, 0.9);
  border: 5px solid #000;
  box-shadow: 10px 10px 0px #0000FF;
  padding: 40px;
  border-radius: 0 40px 0 40px; /* Weird asymmetrical corners */
}
```

## App Implementation

### SwiftUI
```swift
struct VibrantMaximalismView: View {
    var body: some View {
        ScrollView {
            ZStack {
                // Chaotic Layered Background
                Color(hex: "FFFF00").ignoresSafeArea() // Pure Yellow
                
                Circle()
                    .fill(RadialGradient(colors: [Color(hex: "FF00FF"), .clear], center: .center, startRadius: 0, endRadius: 200))
                    .frame(width: 400, height: 400)
                    .offset(x: -100, y: -200)
                
                Circle()
                    .fill(RadialGradient(colors: [Color(hex: "00FFFF"), .clear], center: .center, startRadius: 0, endRadius: 200))
                    .frame(width: 400, height: 400)
                    .offset(x: 150, y: 200)
                
                // Content
                VStack(spacing: 40) {
                    Text("OVERLOAD")
                        .font(.custom("Anton", size: 80))
                        .foregroundColor(Color(hex: "FF0000"))
                        .shadow(color: .black, radius: 0, x: 4, y: 4)
                        .shadow(color: Color(hex: "00FFFF"), radius: 0, x: 8, y: 8)
                        .rotationEffect(.degrees(-3))
                    
                    // Weird shaped card
                    VStack {
                        Text("More is more.")
                            .font(.system(size: 24, weight: .black, design: .monospaced))
                    }
                    .padding(40)
                    .background(Color.white.opacity(0.9))
                    .border(.black, width: 5)
                    .cornerRadius(40, corners: [.topRight, .bottomLeft]) // Custom corner radius extension needed
                    .shadow(color: Color(hex: "0000FF"), radius: 0, x: 10, y: 10)
                }
            }
        }
    }
}
```
- Layer multiple `RadialGradient`s in a `ZStack` behind the content to create the complex, clashing color blobs.
- Use multiple hard drop shadows (radius 0, but large X/Y offsets) in clashing colors to build the loud text effect.

### Flutter
```dart
class VibrantMaximalismScreen extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Stack(
        children: [
          // Background Color
          Container(color: const Color(0xFFFFFF00)),
          // Gradient Blob 1
          Positioned(
            top: -100, left: -100,
            child: Container(
              width: 400, height: 400,
              decoration: const BoxDecoration(
                shape: BoxShape.circle,
                gradient: RadialGradient(colors: [Color(0xFFFF00FF), Colors.transparent]),
              ),
            ),
          ),
          
          Center(
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Transform.rotate(
                  angle: -0.05, // Slight tilt
                  child: const Text(
                    'OVERLOAD',
                    style: TextStyle(
                      fontFamily: 'Anton', fontSize: 80, color: Color(0xFFFF0000),
                      shadows: [
                        Shadow(color: Colors.black, offset: Offset(4, 4)),
                        Shadow(color: Color(0xFF00FFFF), offset: Offset(8, 8)),
                      ]
                    ),
                  ),
                ),
                const SizedBox(height: 40),
                
                // Weird asymmetrical card
                Container(
                  padding: const EdgeInsets.all(40),
                  decoration: BoxDecoration(
                    color: Colors.white.withOpacity(0.9),
                    border: Border.all(color: Colors.black, width: 5),
                    borderRadius: const BorderRadius.only(topRight: Radius.circular(40), bottomLeft: Radius.circular(40)),
                    boxShadow: const [BoxShadow(color: Color(0xFF0000FF), offset: Offset(10, 10))],
                  ),
                  child: const Text('More is more.', style: TextStyle(fontFamily: 'Courier', fontSize: 24, fontWeight: FontWeight.bold)),
                )
              ],
            ),
          ),
        ],
      ),
    );
  }
}
```
- Flutter's `Stack` with `Positioned` widgets lets you throw clashing radial gradients anywhere on the screen easily.
- Apply `BorderRadius.only` to create bizarre, asymmetrical containers that break typical UI norms.

### React Native
```jsx
const VibrantMaximalismScreen = () => {
  return (
    <ScrollView style={{ flex: 1, backgroundColor: '#FFFF00' }}>
      
      {/* Emulating radial blobs in RN usually requires SVG or ImageBackground. For simplicity, we use absolute views here */}
      <View style={{ position: 'absolute', top: -50, left: -50, width: 300, height: 300, borderRadius: 150, backgroundColor: '#FF00FF', opacity: 0.5, filter: 'blur(50px)' }} />

      <View style={{ padding: 40, alignItems: 'center', marginTop: 100 }}>
        
        {/* Loud Text */}
        <Text style={{
          fontFamily: 'Anton-Regular', fontSize: 64, color: '#FF0000',
          transform: [{ rotate: '-3deg' }],
          textShadowColor: '#00FFFF', textShadowOffset: { width: 8, height: 8 }, textShadowRadius: 0
        }}>
          OVERLOAD
        </Text>

        {/* Asymmetrical Card */}
        <View style={{
          marginTop: 60, padding: 40, backgroundColor: 'rgba(255,255,255,0.9)',
          borderWidth: 5, borderColor: '#000',
          borderTopRightRadius: 40, borderBottomLeftRadius: 40,
          shadowColor: '#0000FF', shadowOffset: { width: 10, height: 10 }, shadowOpacity: 1, shadowRadius: 0, elevation: 10
        }}>
          <Text style={{ fontFamily: 'monospace', fontSize: 24, fontWeight: '900' }}>More is more.</Text>
        </View>

      </View>
    </ScrollView>
  );
};
```
- Use `textShadowRadius: 0` to create hard, offset, brutalist-style text shadows in clashing colors (e.g. Red text with a Cyan hard shadow).
- Apply `transform: [{ rotate: '-3deg' }]` to break alignment intentionally.

### Jetpack Compose
```kotlin
@Composable
fun VibrantMaximalismScreen() {
    Box(modifier = Modifier.fillMaxSize().background(Color(0xFFFFFF00))) {
        
        // Emulated Radial Gradients
        Box(modifier = Modifier.offset(x = (-100).dp, y = (-100).dp).size(400.dp).background(Brush.radialGradient(listOf(Color(0xFFFF00FF), Color.Transparent))))
        Box(modifier = Modifier.offset(x = 100.dp, y = 300.dp).size(400.dp).background(Brush.radialGradient(listOf(Color(0xFF00FFFF), Color.Transparent))))
        
        Column(
            modifier = Modifier.fillMaxSize().padding(40.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center
        ) {
            // Rotated Headline
            Text(
                text = "OVERLOAD",
                fontSize = 80.sp,
                fontFamily = FontFamily.SansSerif, // Replace with Anton
                color = Color(0xFFFF0000),
                modifier = Modifier.rotate(-3f),
                style = TextStyle(
                    shadow = Shadow(color = Color(0xFF00FFFF), offset = Offset(16f, 16f), blurRadius = 0f)
                )
            )
            
            Spacer(Modifier.height(60.dp))
            
            // Asymmetrical Card
            Box(
                modifier = Modifier
                    .shadow(elevation = 0.dp) // Reset default shadow
                    // Custom hard shadow trick: draw the shadow shape first
                    .offset(10.dp, 10.dp)
                    .background(Color(0xFF0000FF), RoundedCornerShape(topEnd = 40.dp, bottomStart = 40.dp))
                    .offset((-10).dp, (-10).dp)
                    .background(Color.White.copy(alpha = 0.9f), RoundedCornerShape(topEnd = 40.dp, bottomStart = 40.dp))
                    .border(5.dp, Color.Black, RoundedCornerShape(topEnd = 40.dp, bottomStart = 40.dp))
                    .padding(40.dp)
            ) {
                Text("More is more.", fontFamily = FontFamily.Monospace, fontSize = 24.sp, fontWeight = FontWeight.Black)
            }
        }
    }
}
```
- `Brush.radialGradient` works perfectly for dropping color blobs into the background.
- Compose's default `shadow` modifier blurs edges. To get a hard, brutalist shadow in Compose, render an identical shape offset behind the main shape with a solid color.

## Do's and Don'ts
- **DO**: Break the grid. Let elements overlap awkwardly.
- **DON'T**: Use whitespace. If there is an empty area, fill it with a pattern, a marquee, or a giant emoji.

## Limitations
- This is a styling reference and does not replace environment-specific validation, accessibility testing, or expert review.
- Ensure appropriate contrast ratios and responsive behaviors are verified separately.
