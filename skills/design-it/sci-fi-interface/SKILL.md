---
name: sci-fi-interface
description: Web and App implementation guide for Sci-Fi Interface Design. Trigger when user wants HUDs, spacecraft dashboards, or tactical military readouts.
---

# Sci-Fi Interface Design (HUD)

> "Heads-Up Display. Tactical, precise, and highly analytical."

## Core Principles
1. **Wireframe and Outlines**: Interfaces are built almost entirely out of thin strokes rather than solid filled boxes.
2. **Circular Arrays & Radars**: Heavy use of concentric circles, radar sweeps, and curved progress bars.
3. **Monochrome + Warning**: Often entirely monochromatic (just blue, or just green) with a secondary color (red) used exclusively for alerts.

## Visual DNA
- **Colors**: Midnight background. UI is pure Cyan, Emerald Green, or Amber (like classic monochrome monitors). **Minimalist Slate** works if made dark.
- **Typography**: Strict, technical monospace fonts (`Share Tech Mono`, `VT323`, `Space Mono`). All caps.
- **Styling**: Tiny UI chroming details (target brackets `[ ]`, framing lines, precise pixel coordinates).

## Web Implementation
- Heavy use of SVG for circular dials, and CSS borders for the layout.
- **CSS Example**:
```css
body {
  background-color: #000b18; /* Deep space navy */
  color: #4df; /* Holographic cyan */
  font-family: 'Share Tech Mono', monospace;
  text-transform: uppercase;
}

/* The HUD Frame */
.hud-container {
  border: 1px solid rgba(68, 221, 255, 0.3);
  position: relative;
  padding: 30px;
}

/* Corner brackets */
.hud-container::before {
  content: '';
  position: absolute;
  top: -2px; left: -2px;
  width: 20px; height: 20px;
  border-top: 2px solid #4df;
  border-left: 2px solid #4df;
}
.hud-container::after {
  content: '';
  position: absolute;
  bottom: -2px; right: -2px;
  width: 20px; height: 20px;
  border-bottom: 2px solid #4df;
  border-right: 2px solid #4df;
}

.hud-value {
  font-size: 3rem;
  text-shadow: 0 0 10px rgba(68, 221, 255, 0.8);
}

.hud-warning {
  color: #ff3333;
  text-shadow: 0 0 10px rgba(255, 51, 51, 0.8);
  animation: blink 1s step-end infinite;
}

@keyframes blink { 50% { opacity: 0; } }
```

## App Implementation

### SwiftUI
```swift
struct SciFiHUDView: View {
    @State private var bootUp = false
    
    var body: some View {
        ZStack {
            Color(hex: "000b18").ignoresSafeArea() // Deep space navy
            
            VStack {
                // Circular Radar/Dial
                ZStack {
                    Circle()
                        .stroke(Color(hex: "4df").opacity(0.3), lineWidth: 1)
                    
                    Circle()
                        .trim(from: 0.0, to: bootUp ? 0.75 : 0.0)
                        .stroke(Color(hex: "4df"), style: StrokeStyle(lineWidth: 4, lineCap: .round))
                        .rotationEffect(.degrees(-90))
                    
                    Text("SYS.OK")
                        .font(.custom("Space Mono", size: 24))
                        .foregroundColor(Color(hex: "4df"))
                        .shadow(color: Color(hex: "4df"), radius: 5)
                }
                .frame(width: 200, height: 200)
                .padding(.bottom, 40)
                
                // HUD Data Frame
                HStack {
                    Text("COORD: 45.22, 12.8")
                    Spacer()
                    Text("[ LOCK ]")
                }
                .font(.custom("Space Mono", size: 16))
                .foregroundColor(Color(hex: "4df"))
                .padding()
                .border(Color(hex: "4df").opacity(0.5), width: 1)
                .overlay(
                    // Corner bracket accents
                    Path { path in
                        path.move(to: CGPoint(x: 0, y: 15)); path.addLine(to: CGPoint(x: 0, y: 0)); path.addLine(to: CGPoint(x: 15, y: 0))
                        path.move(to: CGPoint(x: 300, y: 15)); path.addLine(to: CGPoint(x: 300, y: 0)); path.addLine(to: CGPoint(x: 285, y: 0))
                    }
                    .stroke(Color(hex: "4df"), lineWidth: 2)
                )
            }
            .padding()
        }
        .onAppear {
            withAnimation(.easeInOut(duration: 2.0)) { bootUp = true }
        }
    }
}
```
- SwiftUI is uniquely fantastic for Sci-Fi HUDs. `Circle().trim(from: to:)` lets you build complex sweeping circular progress rings.
- Use `Path` overlays to draw the exact 90-degree corner brackets (`[ ]`) that define the HUD look.

### Flutter
```dart
class SciFiHUDScreen extends StatefulWidget {
  @override
  State<SciFiHUDScreen> createState() => _SciFiHUDScreenState();
}

class _SciFiHUDScreenState extends State<SciFiHUDScreen> with SingleTickerProviderStateMixin {
  late AnimationController _ctrl;

  @override
  void initState() {
    super.initState();
    _ctrl = AnimationController(vsync: this, duration: const Duration(seconds: 2))..forward();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF000B18),
      body: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            // Circular Radar
            SizedBox(
              width: 200, height: 200,
              child: Stack(
                fit: StackFit.expand,
                children: [
                  CircularProgressIndicator(value: 1.0, strokeWidth: 1, color: const Color(0xFF44DDFF).withOpacity(0.3)),
                  AnimatedBuilder(
                    animation: _ctrl,
                    builder: (context, _) => CircularProgressIndicator(
                      value: _ctrl.value * 0.75, // 75% full
                      strokeWidth: 4,
                      color: const Color(0xFF44DDFF),
                    ),
                  ),
                  const Center(
                    child: Text('SYS.OK', style: TextStyle(fontFamily: 'SpaceMono', color: Color(0xFF44DDFF), fontSize: 24, shadows: [Shadow(color: Color(0xFF44DDFF), blurRadius: 5)])),
                  )
                ],
              ),
            ),
            const SizedBox(height: 40),
            
            // HUD Data Frame (requires CustomPaint for true corner brackets)
            Container(
              width: 300,
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(border: Border.all(color: const Color(0xFF44DDFF).withOpacity(0.5))),
              child: const Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text('COORD: 45.22, 12.8', style: TextStyle(fontFamily: 'SpaceMono', color: Color(0xFF44DDFF))),
                  Text('[ LOCK ]', style: TextStyle(fontFamily: 'SpaceMono', color: Color(0xFF44DDFF))),
                ],
              ),
            )
          ],
        ),
      ),
    );
  }
}
```
- `CircularProgressIndicator` is an easy hack for circular HUD rings, but for true Sci-Fi interfaces in Flutter, you should build a `CustomPainter` to draw concentric stroked circles and arcs.
- Heavy use of monospace fonts and pure cyan (`#44DDFF`).

### React Native
```jsx
// Requires react-native-svg
import Svg, { Circle, Path } from 'react-native-svg';

const SciFiHUDScreen = () => {
  return (
    <View style={{ flex: 1, backgroundColor: '#000B18', justifyContent: 'center', alignItems: 'center' }}>
      
      {/* Circular Radar */}
      <View style={{ width: 200, height: 200, justifyContent: 'center', alignItems: 'center', marginBottom: 40 }}>
        <Svg height="200" width="200" style={{ position: 'absolute' }}>
          <Circle cx="100" cy="100" r="90" stroke="rgba(68, 221, 255, 0.3)" strokeWidth="1" fill="none" />
          <Circle cx="100" cy="100" r="90" stroke="#4df" strokeWidth="4" strokeDasharray="565" strokeDashoffset="140" fill="none" />
        </Svg>
        <Text style={{ fontFamily: 'monospace', color: '#4df', fontSize: 24, textShadowColor: '#4df', textShadowRadius: 5 }}>
          SYS.OK
        </Text>
      </View>

      {/* HUD Frame */}
      <View style={{ 
        width: 300, padding: 16, flexDirection: 'row', justifyContent: 'space-between',
        borderColor: 'rgba(68, 221, 255, 0.5)', borderWidth: 1 
      }}>
        <Text style={{ fontFamily: 'monospace', color: '#4df' }}>COORD: 45.22, 12.8</Text>
        <Text style={{ fontFamily: 'monospace', color: '#4df' }}>[ LOCK ]</Text>

        {/* Pseudo Corner Brackets using absolute views */}
        <View style={{ position: 'absolute', top: -2, left: -2, width: 15, height: 15, borderTopWidth: 2, borderLeftWidth: 2, borderColor: '#4df' }} />
        <View style={{ position: 'absolute', bottom: -2, right: -2, width: 15, height: 15, borderBottomWidth: 2, borderRightWidth: 2, borderColor: '#4df' }} />
      </View>

    </View>
  );
};
```
- You absolutely must use `react-native-svg` to draw circular HUD dials. Use `strokeDasharray` and `strokeDashoffset` on the `<Circle>` to draw arcs.
- The corner brackets are built easily by absolutely positioning small `View`s with 2 active borders over the corners of a container.

### Jetpack Compose
```kotlin
@Composable
fun SciFiHUDScreen() {
    // Animation for boot up
    val transition = rememberInfiniteTransition()
    val sweep by transition.animateFloat(initialValue = 0f, targetValue = 270f, animationSpec = infiniteRepeatable(tween(2000), RepeatMode.Restart))

    Column(
        modifier = Modifier.fillMaxSize().background(Color(0xFF000B18)),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center
    ) {
        // Circular Radar
        Box(contentAlignment = Alignment.Center, modifier = Modifier.size(200.dp)) {
            Canvas(modifier = Modifier.fillMaxSize()) {
                drawCircle(color = Color(0xFF44DDFF).copy(alpha = 0.3f), style = Stroke(width = 2f))
                drawArc(
                    color = Color(0xFF44DDFF),
                    startAngle = -90f,
                    sweepAngle = sweep,
                    useCenter = false,
                    style = Stroke(width = 8f, cap = StrokeCap.Round)
                )
            }
            Text("SYS.OK", color = Color(0xFF44DDFF), fontFamily = FontFamily.Monospace, fontSize = 24.sp)
        }
        
        Spacer(Modifier.height(40.dp))
        
        // HUD Frame
        Box(modifier = Modifier.width(300.dp)) {
            Row(
                modifier = Modifier.fillMaxWidth().border(1.dp, Color(0xFF44DDFF).copy(alpha = 0.5f)).padding(16.dp),
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Text("COORD: 45.22, 12.8", color = Color(0xFF44DDFF), fontFamily = FontFamily.Monospace)
                Text("[ LOCK ]", color = Color(0xFF44DDFF), fontFamily = FontFamily.Monospace)
            }
            
            // Corner brackets via Canvas
            Canvas(modifier = Modifier.fillMaxSize()) {
                val path = Path().apply {
                    moveTo(0f, 40f); lineTo(0f, 0f); lineTo(40f, 0f) // Top Left
                    moveTo(size.width, size.height - 40f); lineTo(size.width, size.height); lineTo(size.width - 40f, size.height) // Bottom Right
                }
                drawPath(path, color = Color(0xFF44DDFF), style = Stroke(width = 4f))
            }
        }
    }
}
```
- Jetpack Compose's `Canvas` is incredibly powerful here. Use `drawArc` for the circular HUD rings.
- Draw the corner brackets on a `Canvas` overlaying the Box using `Path().apply { moveTo... lineTo... }`.

## Do's and Don'ts
- **DO**: Animate elements entering the screen as if they are 'booting up' or 'calibrating' (drawing lines from 0 to 100%).
- **DON'T**: Use drop shadows. Light in a HUD is emitted, not blocked. Use `text-shadow` for glows instead.
