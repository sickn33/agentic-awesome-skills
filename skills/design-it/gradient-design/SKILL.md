---
name: gradient-design
description: Web and App implementation guide for Gradient Design. Trigger when user wants heavy gradient usage, vibrant transitions, and modern energetic feels.
date_added: "2026-06-17"
risk: safe
source: self
source_type: self
---

# Gradient Design

> "Color in motion. Fluid transitions that add energy and depth to flat surfaces."


## When to Use
Use this sub-style when the user's request matches the aesthetic described above. This is a child reference of the `design-it` skill and is not meant to be triggered directly.

## Core Principles
1. **Gradients are the Primary Visual**: Backgrounds, buttons, text, and borders all use gradients instead of solid colors.
2. **Analogous or Complementary Blends**: Gradients must be carefully chosen so the transition colors don't become muddy (e.g., blending red to green creates a muddy brown in the middle. Blend red to yellow to green instead).
3. **Subtle Animation**: Background gradients should slowly shift and rotate.

## Visual DNA
- **Colors**: **Warm Tech** (blues to oranges) or create custom vibrant pairs (e.g., Purple to Coral, Deep Blue to Cyan).
- **Typography**: Clean, heavy sans-serifs that can be easily masked with a gradient fill.
- **Layout**: Keep the UI structure minimal (glass panels or white/black cards) to let the gradients breathe.

## Web Implementation
- **CSS Example**:
```css
body {
  /* Complex mesh-like animated gradient */
  background: linear-gradient(-45deg, #ee7752, #e73c7e, #23a6d5, #23d5ab);
  background-size: 400% 400%;
  animation: gradientBG 15s ease infinite;
  color: #fff;
}

@keyframes gradientBG {
  0% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
}

.gradient-text {
  background: linear-gradient(90deg, #F9D423 0%, #FF4E50 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  font-size: 4rem;
  font-weight: 900;
}

.gradient-border-card {
  background: #ffffff;
  color: #333;
  padding: 32px;
  border-radius: 12px;
  position: relative;
  /* Use a pseudo-element for the gradient border */
}
.gradient-border-card::before {
  content: '';
  position: absolute;
  top: -3px; left: -3px; right: -3px; bottom: -3px;
  background: linear-gradient(90deg, #8A2387, #E94057, #F27121);
  z-index: -1;
  border-radius: 15px;
}
```

## App Implementation

### SwiftUI
```swift
struct GradientDesignView: View {
    @State private var animateGradient = false
    
    var body: some View {
        ZStack {
            // Animated Background Gradient
            LinearGradient(
                colors: [Color(hex: "ee7752"), Color(hex: "e73c7e"), Color(hex: "23a6d5"), Color(hex: "23d5ab")],
                startPoint: animateGradient ? .topLeading : .bottomLeading,
                endPoint: animateGradient ? .bottomTrailing : .topTrailing
            )
            .ignoresSafeArea()
            .onAppear {
                withAnimation(.linear(duration: 5.0).repeatForever(autoreverses: true)) {
                    animateGradient.toggle()
                }
            }
            
            VStack(spacing: 40) {
                // Gradient Text
                Text("VIBRANT")
                    .font(.system(size: 60, weight: .black))
                    .foregroundStyle(
                        LinearGradient(
                            colors: [Color(hex: "F9D423"), Color(hex: "FF4E50")],
                            startPoint: .leading,
                            endPoint: .trailing
                        )
                    )
                
                // Gradient Border Card
                Text("Gradient Border")
                    .padding()
                    .frame(width: 250, height: 150)
                    .background(Color.white)
                    .cornerRadius(12)
                    .overlay(
                        RoundedRectangle(cornerRadius: 12)
                            .stroke(
                                LinearGradient(
                                    colors: [Color(hex: "8A2387"), Color(hex: "E94057"), Color(hex: "F27121")],
                                    startPoint: .leading, endPoint: .trailing
                                ),
                                lineWidth: 3
                            )
                    )
            }
        }
    }
}
```
- `.foregroundStyle(LinearGradient(...))` makes gradient text incredibly easy in modern SwiftUI.
- Use `.stroke(LinearGradient(...))` inside an `.overlay` to create gradient borders.

### Flutter
```dart
class GradientDesignScreen extends StatefulWidget {
  @override
  State<GradientDesignScreen> createState() => _GradientDesignScreenState();
}

class _GradientDesignScreenState extends State<GradientDesignScreen> with SingleTickerProviderStateMixin {
  late AnimationController _controller;
  late Animation<Alignment> _topAlignment;
  late Animation<Alignment> _bottomAlignment;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(vsync: this, duration: const Duration(seconds: 5))..repeat(reverse: true);
    _topAlignment = TweenSequence<Alignment>([
      TweenSequenceItem(tween: AlignmentTween(begin: Alignment.topLeft, end: Alignment.topRight), weight: 1),
    ]).animate(_controller);
    _bottomAlignment = TweenSequence<Alignment>([
      TweenSequenceItem(tween: AlignmentTween(begin: Alignment.bottomRight, end: Alignment.bottomLeft), weight: 1),
    ]).animate(_controller);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: AnimatedBuilder(
        animation: _controller,
        builder: (context, _) {
          return Container(
            width: double.infinity,
            decoration: BoxDecoration(
              // Animated Background Gradient
              gradient: LinearGradient(
                begin: _topAlignment.value,
                end: _bottomAlignment.value,
                colors: const [Color(0xFFee7752), Color(0xFFe73c7e), Color(0xFF23a6d5), Color(0xFF23d5ab)],
              ),
            ),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                // Gradient Text
                ShaderMask(
                  blendMode: BlendMode.srcIn,
                  shaderCallback: (bounds) => const LinearGradient(
                    colors: [Color(0xFFF9D423), Color(0xFFFF4E50)],
                  ).createShader(Rect.fromLTWH(0, 0, bounds.width, bounds.height)),
                  child: const Text('VIBRANT', style: TextStyle(fontSize: 60, fontWeight: FontWeight.w900, color: Colors.white)),
                ),
                const SizedBox(height: 40),
                // Gradient Border Card
                Container(
                  width: 250, height: 150,
                  decoration: BoxDecoration(
                    borderRadius: BorderRadius.circular(15),
                    gradient: const LinearGradient(colors: [Color(0xFF8A2387), Color(0xFFE94057), Color(0xFFF27121)]),
                  ),
                  padding: const EdgeInsets.all(3), // Border width
                  child: Container(
                    decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(12)),
                    alignment: Alignment.center,
                    child: const Text('Gradient Border'),
                  ),
                ),
              ],
            ),
          );
        },
      ),
    );
  }
}
```
- Flutter text gradients require `ShaderMask` with `BlendMode.srcIn`.
- To animate a gradient background, animate the `Alignment` values of the `LinearGradient`.

### React Native
```jsx
// REQUIRES: expo-linear-gradient OR react-native-linear-gradient
import { LinearGradient } from 'expo-linear-gradient';
import MaskedView from '@react-native-masked-view/masked-view';

const GradientDesignScreen = () => {
  return (
    <LinearGradient
      colors={['#ee7752', '#e73c7e', '#23a6d5', '#23d5ab']}
      start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
      style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}
    >
      {/* Gradient Text */}
      <MaskedView
        style={{ height: 80, width: '100%', flexDirection: 'row' }}
        maskElement={
          <View style={{ backgroundColor: 'transparent', flex: 1, justifyContent: 'center', alignItems: 'center' }}>
            <Text style={{ fontSize: 60, fontWeight: '900', color: 'black' }}>VIBRANT</Text>
          </View>
        }
      >
        <LinearGradient
          colors={['#F9D423', '#FF4E50']}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
          style={{ flex: 1 }}
        />
      </MaskedView>

      <View style={{ marginTop: 40 }}>
        {/* Gradient Border Card */}
        <LinearGradient
          colors={['#8A2387', '#E94057', '#F27121']}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
          style={{ padding: 3, borderRadius: 15 }}
        >
          <View style={{ backgroundColor: '#FFF', width: 250, height: 150, borderRadius: 12, justifyContent: 'center', alignItems: 'center' }}>
            <Text>Gradient Border</Text>
          </View>
        </LinearGradient>
      </View>
    </LinearGradient>
  );
};
```
- Gradient text in React Native is notoriously annoying. You must use `@react-native-masked-view/masked-view` to mask a `LinearGradient` with a `<Text>` node.
- Gradient borders are achieved by nesting a solid view inside a `LinearGradient` with a small padding (e.g., `padding: 3`).

### Jetpack Compose
```kotlin
@Composable
fun GradientDesignScreen() {
    // Animated Background
    val infiniteTransition = rememberInfiniteTransition()
    val offset by infiniteTransition.animateFloat(
        initialValue = 0f, targetValue = 1000f,
        animationSpec = infiniteRepeatable(tween(5000, easing = LinearEasing), RepeatMode.Reverse)
    )

    val bgBrush = Brush.linearGradient(
        colors = listOf(Color(0xFFee7752), Color(0xFFe73c7e), Color(0xFF23a6d5), Color(0xFF23d5ab)),
        start = Offset(offset, 0f), end = Offset(offset + 500f, 1000f)
    )

    Box(
        modifier = Modifier.fillMaxSize().background(bgBrush),
        contentAlignment = Alignment.Center
    ) {
        Column(horizontalAlignment = Alignment.CenterHorizontally) {
            // Gradient Text
            val textBrush = Brush.horizontalGradient(listOf(Color(0xFFF9D423), Color(0xFFFF4E50)))
            Text(
                text = "VIBRANT",
                style = TextStyle(brush = textBrush, fontSize = 60.sp, fontWeight = FontWeight.Black)
            )

            Spacer(Modifier.height(40.dp))

            // Gradient Border Card
            val borderBrush = Brush.horizontalGradient(listOf(Color(0xFF8A2387), Color(0xFFE94057), Color(0xFFF27121)))
            Box(
                modifier = Modifier
                    .size(250.dp, 150.dp)
                    .border(3.dp, borderBrush, RoundedCornerShape(12.dp))
                    .background(Color.White, RoundedCornerShape(12.dp)),
                contentAlignment = Alignment.Center
            ) {
                Text("Gradient Border")
            }
        }
    }
}
```
- Compose handles gradients beautifully via `Brush`.
- You can pass a `Brush` directly into a `TextStyle` for gradient text, or into a `Modifier.border()` for gradient borders.

## Do's and Don'ts
- **DO**: Use multi-stop gradients (3 or 4 colors) rather than just simple A-to-B gradients for a more modern, rich look.
- **DON'T**: Apply gradients to tiny text or thin icons, they will lose legibility immediately.
