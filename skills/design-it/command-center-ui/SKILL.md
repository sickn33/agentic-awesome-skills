---
name: command-center-ui
description: Web and App implementation guide for Command Center UI. Trigger when user wants monitoring systems, enterprise dashboards, NOCs, and global maps.
date_added: "2026-06-17"
---

# Command Center UI

> "Mission Control. Global monitoring, real-time alerts, and high-stakes data visualization."

## Core Principles
1. **Dark/Black Backgrounds**: Essential for a room full of glowing monitors (NOCs). It makes the data pop and reduces glare.
2. **Maps & Topologies**: The center of the UI is almost always a dark-mode geographical map or a node-based network topology.
3. **Alert Hierarchy**: 90% of the screen is calm and blue/grey. When a warning happens, it flashes bright amber or red to immediately draw the eye.

## Visual DNA
- **Colors**: Pure black (`#000000`) or deep navy (`#0B132B`). Accents are electric cyan (`#00FFFF`), amber (`#FFBF00`), and critical red (`#FF0000`).
- **Typography**: Clean, tech-focused sans-serifs (`Orbitron`, `Roboto`, `Share Tech`).
- **Styling**: Glowing borders, radar sweeps, and stark, data-driven charts.

## Web Implementation
- **CSS Example**:
```css
body {
  background-color: #030a16;
  color: #8ab4f8;
  font-family: 'Roboto', sans-serif;
  margin: 0;
  display: grid;
  grid-template-columns: 300px 1fr 300px;
  height: 100vh;
}

.panel {
  background-color: rgba(13, 27, 42, 0.8);
  border: 1px solid #1c355e;
  box-shadow: inset 0 0 20px rgba(0, 255, 255, 0.05);
  margin: 10px;
  display: flex;
  flex-direction: column;
}

.panel-header {
  background: linear-gradient(90deg, #1c355e, transparent);
  color: #00ffff;
  padding: 8px 16px;
  font-weight: bold;
  text-transform: uppercase;
  letter-spacing: 2px;
  border-bottom: 1px solid #00ffff;
}

/* The Map/Center view */
.main-view {
  /* Placeholder for a massive globe or map */
  background: radial-gradient(circle, #0d1b2a 0%, #030a16 100%);
  position: relative;
}

/* Critical Alert */
.alert-critical {
  background-color: rgba(255, 0, 0, 0.1);
  border: 1px solid #ff0000;
  color: #ff0000;
  box-shadow: 0 0 10px rgba(255, 0, 0, 0.5);
  animation: pulse-red 2s infinite;
}

@keyframes pulse-red {
  0% { box-shadow: 0 0 5px rgba(255, 0, 0, 0.2); }
  50% { box-shadow: 0 0 20px rgba(255, 0, 0, 0.8); }
  100% { box-shadow: 0 0 5px rgba(255, 0, 0, 0.2); }
}
```

## App Implementation

### SwiftUI
```swift
struct CommandCenterView: View {
    @State private var isAlerting = false
    
    var body: some View {
        VStack(spacing: 16) {
            // Header
            HStack {
                Text("GLOBAL_OPS // ALPHA")
                    .font(.custom("Orbitron", size: 20))
                    .foregroundColor(Color(red: 0.0, green: 1.0, blue: 1.0)) // Cyan
                Spacer()
                Text(Date(), style: .time).foregroundColor(.gray)
            }
            .padding()
            .border(Color(red: 0.0, green: 1.0, blue: 1.0), width: 1)
            
            // Map or main visual placeholder
            Circle()
                .strokeBorder(
                    LinearGradient(colors: [.cyan, .blue], startPoint: .top, endPoint: .bottom),
                    lineWidth: 2
                )
                .frame(height: 250)
                .overlay(Text("TOPOLOGY SCAN").foregroundColor(.cyan.opacity(0.5)))
            
            // Critical Alert Panel
            VStack(alignment: .leading) {
                Text("WARNING: SECTOR 7G")
                    .font(.headline)
                    .foregroundColor(.red)
                Text("Anomalous activity detected.")
                    .font(.subheadline)
                    .foregroundColor(.white)
            }
            .padding()
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(Color.red.opacity(0.1))
            .border(Color.red, width: 2)
            .shadow(color: isAlerting ? .red : .clear, radius: 10)
        }
        .padding()
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(Color(red: 0.01, green: 0.04, blue: 0.09)) // Very dark navy
        .onAppear {
            withAnimation(.easeInOut(duration: 1.0).repeatForever()) {
                isAlerting.toggle()
            }
        }
    }
}
```
- Rely heavily on `.border()` and `.strokeBorder()` combined with gradients to create technical, glowing wireframes.
- Use `.shadow()` animated continuously for pulse alerts.

### Flutter
```dart
class CommandCenterScreen extends StatefulWidget {
  @override
  State<CommandCenterScreen> createState() => _CommandCenterScreenState();
}

class _CommandCenterScreenState extends State<CommandCenterScreen> with SingleTickerProviderStateMixin {
  late AnimationController _pulseController;

  @override
  void initState() {
    super.initState();
    _pulseController = AnimationController(vsync: this, duration: const Duration(seconds: 1))..repeat(reverse: true);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF030A16), // Dark NOC background
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(16.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              // Panel Header
              Container(
                padding: const EdgeInsets.all(12),
                decoration: const BoxDecoration(
                  border: Border(bottom: BorderSide(color: Colors.cyan)),
                  gradient: LinearGradient(colors: [Color(0xFF1C355E), Colors.transparent]),
                ),
                child: const Text('GLOBAL_OPS // ALPHA', 
                  style: TextStyle(color: Colors.cyan, fontFamily: 'Orbitron', letterSpacing: 2)),
              ),
              const SizedBox(height: 24),
              // Map Placeholder
              Expanded(
                child: Container(
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    border: Border.all(color: Colors.cyan.withOpacity(0.5), width: 2),
                  ),
                  child: const Center(child: Text('RADAR ACTIVE', style: TextStyle(color: Colors.cyan))),
                ),
              ),
              const SizedBox(height: 24),
              // Animated Critical Alert
              AnimatedBuilder(
                animation: _pulseController,
                builder: (context, child) {
                  return Container(
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: Colors.red.withOpacity(0.1),
                      border: Border.all(color: Colors.red),
                      boxShadow: [
                        BoxShadow(color: Colors.red.withOpacity(_pulseController.value * 0.8), blurRadius: 20)
                      ],
                    ),
                    child: const Text('WARNING: SECTOR 7G', style: TextStyle(color: Colors.red, fontWeight: FontWeight.bold)),
                  );
                },
              ),
            ],
          ),
        ),
      ),
    );
  }
}
```
- A `Container` with a `LinearGradient` that fades to `Colors.transparent` is excellent for high-tech headers.
- Use `AnimatedBuilder` to manipulate the `blurRadius` and opacity of `BoxShadow` to create flashing alert panels.

### React Native
```jsx
const CommandCenterScreen = () => {
  const pulseAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1, duration: 1000, useNativeDriver: false }),
        Animated.timing(pulseAnim, { toValue: 0, duration: 1000, useNativeDriver: false })
      ])
    ).start();
  }, []);

  const shadowOpacity = pulseAnim.interpolate({ inputRange: [0, 1], outputRange: [0.2, 1] });

  return (
    <View style={{ flex: 1, backgroundColor: '#030A16', padding: 16 }}>
      {/* Header Panel */}
      <View style={{
        borderBottomWidth: 1, borderColor: '#00FFFF', padding: 12, backgroundColor: '#1C355E'
      }}>
        <Text style={{ color: '#00FFFF', fontFamily: 'monospace', letterSpacing: 2 }}>
          GLOBAL_OPS // ALPHA
        </Text>
      </View>

      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <View style={{
          width: 250, height: 250, borderRadius: 125, borderWidth: 2, borderColor: '#00FFFF',
          justifyContent: 'center', alignItems: 'center'
        }}>
          <Text style={{ color: '#00FFFF', opacity: 0.5 }}>SCANNING...</Text>
        </View>
      </View>

      {/* Critical Alert */}
      <Animated.View style={{
        backgroundColor: 'rgba(255,0,0,0.1)',
        borderWidth: 2, borderColor: '#FF0000', padding: 16,
        shadowColor: '#FF0000', shadowRadius: 15, shadowOpacity, elevation: 10
      }}>
        <Text style={{ color: '#FF0000', fontWeight: 'bold', fontSize: 18 }}>WARNING: SECTOR 7G</Text>
        <Text style={{ color: '#FFF' }}>Anomalous activity detected.</Text>
      </Animated.View>
    </View>
  );
};
```
- Rely on sharp 1px or 2px borders with bright hex values (`#00FFFF`, `#FF0000`) instead of border radii.
- Keep backgrounds extremely dark navy (`#030A16`) rather than pure black to avoid OLED smearing while maintaining the NOC feel.

### Jetpack Compose
```kotlin
@Composable
fun CommandCenterScreen() {
    val infiniteTransition = rememberInfiniteTransition()
    val pulseAlpha by infiniteTransition.animateFloat(
        initialValue = 0.2f,
        targetValue = 1.0f,
        animationSpec = infiniteRepeatable(
            animation = tween(1000, easing = LinearEasing),
            repeatMode = RepeatMode.Reverse
        )
    )

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(Color(0xFF030A16))
            .padding(16.dp)
    ) {
        // Header
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .background(Brush.horizontalGradient(listOf(Color(0xFF1C355E), Color.Transparent)))
                .border(width = 1.dp, color = Color.Cyan) // Simplified border
                .padding(12.dp)
        ) {
            Text("GLOBAL_OPS // ALPHA", color = Color.Cyan, fontFamily = FontFamily.Monospace, letterSpacing = 2.sp)
        }
        
        Spacer(Modifier.height(32.dp))
        
        // Main Visual
        Box(
            modifier = Modifier
                .weight(1f)
                .fillMaxWidth(),
            contentAlignment = Alignment.Center
        ) {
            Box(
                modifier = Modifier
                    .size(250.dp)
                    .border(2.dp, Color.Cyan.copy(alpha = 0.5f), CircleShape),
                contentAlignment = Alignment.Center
            ) {
                Text("SCANNING...", color = Color.Cyan.copy(alpha = 0.5f))
            }
        }
        
        Spacer(Modifier.height(32.dp))
        
        // Critical Alert
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .shadow(20.dp, spotColor = Color.Red.copy(alpha = pulseAlpha), ambientColor = Color.Red.copy(alpha = pulseAlpha))
                .background(Color.Red.copy(alpha = 0.1f))
                .border(2.dp, Color.Red)
                .padding(16.dp)
        ) {
            Text("WARNING: SECTOR 7G", color = Color.Red, fontWeight = FontWeight.Bold, fontSize = 18.sp)
            Text("Anomalous activity detected.", color = Color.White)
        }
    }
}
```
- Compose handles neon interfaces very well. Use `Modifier.border(..., CircleShape)` for radar rings.
- To make a container glow in Compose, you must use `Modifier.shadow` with the `spotColor` and `ambientColor` set to your neon color, bypassing the default black shadow.

## Do's and Don'ts
- **DO**: Create a distinct visual rhythm. The screen should feel calm until a specific alert requires attention.
- **DON'T**: Fill the screen with bright, solid white panels. A command center should glow softly, not blind the user.
