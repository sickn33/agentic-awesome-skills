---
name: skeuomorphism
description: Web and App implementation guide for Skeuomorphism. Trigger when user wants UI to mimic real-world objects, realistic textures, or physical metaphors.
date_added: "2026-06-17"
risk: safe
source: self
source_type: self
---

# Skeuomorphism

> "Digital interfaces that look and behave like their physical counterparts."


## When to Use
Use this sub-style when the user's request matches the aesthetic described above. This is a child reference of the `design-it` skill and is not meant to be triggered directly.

## Core Principles
1. **Realistic Textures**: Leather, brushed metal, wood grain, paper. The UI should feel like a physical object you can touch.
2. **Physical Lighting & Depth**: Intense attention to specular highlights, drop shadows, inner shadows, bevels, and ambient occlusion.
3. **Real-world Metaphors**: Switches that look like hardware toggles, dials with physical notches, notepads with binding rings.

## Visual DNA
- **Colors**: Highly dependent on the material being simulated. For rich, classic skeuomorphism, use the **Industrial Chic** (for metal/hardware) or **Monochromatic Brown** (for wood/leather) palettes.
- **Typography**: Fonts that match the physical object (e.g., typewriter fonts for paper, LCD fonts for digital screens, embossed sans-serifs for hardware buttons).
- **Details**: Screws, stitching, glare, and gradients are your primary tools.

## Web Implementation
- Heavy use of layered background images (textures), complex gradients, and multiple box-shadows.
- **CSS Example**:
```css
.skeuo-button {
  /* Brushed metal effect */
  background: linear-gradient(180deg, #e0e0e0 0%, #a0a0a0 100%),
              url('brushed-metal-texture.png');
  background-blend-mode: overlay;
  
  border: 1px solid #7a7a7a;
  border-radius: 50%;
  width: 80px;
  height: 80px;
  
  /* Bevel, inner highlight, and drop shadow */
  box-shadow: 
    inset 0 2px 4px rgba(255,255,255,0.8), /* Top highlight */
    inset 0 -2px 4px rgba(0,0,0,0.4),      /* Bottom shading */
    0 4px 6px rgba(0,0,0,0.5),             /* Drop shadow */
    0 1px 1px rgba(0,0,0,0.2);
}

.skeuo-button:active {
  /* Pressing the physical button */
  box-shadow: 
    inset 0 4px 8px rgba(0,0,0,0.6),
    inset 0 -1px 2px rgba(255,255,255,0.4),
    0 1px 1px rgba(0,0,0,0.2);
  transform: translateY(2px);
}
```

## App Implementation

### SwiftUI
```swift
struct SkeuoButton: View {
    @State private var isPressed = false
    
    var body: some View {
        Button(action: {}) {
            Text("POWER")
                .font(.system(size: 14, weight: .bold))
                .foregroundColor(.white)
                .textCase(.uppercase)
        }
        .frame(width: 80, height: 80)
        .background(
            ZStack {
                // Brushed metal base
                Circle()
                    .fill(
                        LinearGradient(
                            colors: [Color(white: 0.88), Color(white: 0.63)],
                            startPoint: .top,
                            endPoint: .bottom
                        )
                    )
                // Inner highlight (top bevel)
                Circle()
                    .stroke(
                        LinearGradient(
                            colors: [.white.opacity(0.8), .clear],
                            startPoint: .top,
                            endPoint: .center
                        ),
                        lineWidth: 2
                    )
                    .padding(1)
            }
        )
        .clipShape(Circle())
        // Outer bezel ring
        .overlay(Circle().stroke(Color(white: 0.5), lineWidth: 1))
        // Physical drop shadow
        .shadow(color: .black.opacity(isPressed ? 0.2 : 0.5), radius: isPressed ? 2 : 6,
                x: 0, y: isPressed ? 1 : 4)
        .scaleEffect(isPressed ? 0.96 : 1.0)
        .animation(.easeOut(duration: 0.1), value: isPressed)
        .simultaneousGesture(
            DragGesture(minimumDistance: 0)
                .onChanged { _ in isPressed = true }
                .onEnded { _ in isPressed = false }
        )
    }
}
```
- Stack multiple shapes (`Circle`, `RoundedRectangle`) with different gradients to build up realistic depth.
- Use `.overlay()` with stroked shapes for highlight bezels along the edges.
- The pressed state should reduce shadow AND scale — simulating a physical push.

### Flutter
```dart
class SkeuoButton extends StatefulWidget {
  @override
  State<SkeuoButton> createState() => _SkeuoButtonState();
}

class _SkeuoButtonState extends State<SkeuoButton> {
  bool _isPressed = false;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTapDown: (_) => setState(() => _isPressed = true),
      onTapUp: (_) => setState(() => _isPressed = false),
      onTapCancel: () => setState(() => _isPressed = false),
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 100),
        width: 80,
        height: 80,
        decoration: BoxDecoration(
          shape: BoxShape.circle,
          // Brushed metal gradient
          gradient: LinearGradient(
            colors: [Colors.grey[300]!, Colors.grey[600]!],
            begin: Alignment.topCenter,
            end: Alignment.bottomCenter,
          ),
          border: Border.all(color: Colors.grey[500]!, width: 1),
          boxShadow: [
            // Outer drop shadow
            BoxShadow(
              color: Colors.black.withOpacity(_isPressed ? 0.2 : 0.5),
              blurRadius: _isPressed ? 4 : 12,
              offset: Offset(0, _isPressed ? 2 : 6),
            ),
            // Inner top highlight (faked with a light inset)
            BoxShadow(
              color: Colors.white.withOpacity(0.6),
              blurRadius: 1,
              offset: const Offset(0, -1),
              spreadRadius: -1,
            ),
          ],
        ),
        transform: Matrix4.identity()..scale(_isPressed ? 0.96 : 1.0),
        alignment: Alignment.center,
        child: const Text('POWER',
          style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold,
            fontSize: 14, shadows: [
              Shadow(color: Colors.black54, offset: Offset(0, 1), blurRadius: 2),
            ])),
      ),
    );
  }
}
```
- Use `AnimatedContainer` for smooth press transitions. Adjust `boxShadow`, `transform`, and gradient on tap.
- Layer `BoxShadow` entries: one for the outer drop shadow, one for the inner top-edge highlight.
- For complex textures (leather, wood), use `DecorationImage` with an asset file inside `BoxDecoration`.

### React Native
```jsx
const SkeuoButton = () => {
  const [pressed, setPressed] = useState(false);
  
  return (
    <Pressable
      onPressIn={() => setPressed(true)}
      onPressOut={() => setPressed(false)}
      style={{
        width: 80,
        height: 80,
        borderRadius: 40,
        alignItems: 'center',
        justifyContent: 'center',
        // Metal gradient must be done via an image or LinearGradient component
        backgroundColor: '#A0A0A0',
        borderWidth: 1,
        borderColor: '#7A7A7A',
        // Shadow changes on press
        shadowColor: '#000',
        shadowOffset: { width: 0, height: pressed ? 1 : 4 },
        shadowOpacity: pressed ? 0.2 : 0.5,
        shadowRadius: pressed ? 2 : 6,
        elevation: pressed ? 2 : 8,
        transform: [{ scale: pressed ? 0.96 : 1 }],
      }}
    >
      <Text style={{
        color: '#FFF',
        fontWeight: '700',
        fontSize: 14,
        textShadowColor: 'rgba(0,0,0,0.5)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 2,
      }}>
        POWER
      </Text>
    </Pressable>
  );
};
```
- For realistic textures, use `ImageBackground` with exported texture assets (leather.png, brushed-metal.png).
- Use `Pressable` with `onPressIn`/`onPressOut` to animate shadow depth, scale, and opacity changes.
- Complex gradient bevels require `react-native-linear-gradient` or `expo-linear-gradient`.

### Jetpack Compose
```kotlin
@Composable
fun SkeuoButton() {
    var isPressed by remember { mutableStateOf(false) }
    val scale by animateFloatAsState(if (isPressed) 0.96f else 1f)
    val elevation by animateDpAsState(if (isPressed) 2.dp else 8.dp)
    
    Box(
        modifier = Modifier
            .size(80.dp)
            .graphicsLayer { scaleX = scale; scaleY = scale }
            .shadow(elevation, CircleShape)
            .clip(CircleShape)
            .background(
                Brush.verticalGradient(
                    colors = listOf(Color(0xFFE0E0E0), Color(0xFFA0A0A0))
                )
            )
            .border(1.dp, Color(0xFF7A7A7A), CircleShape)
            .pointerInput(Unit) {
                detectTapGestures(
                    onPress = {
                        isPressed = true
                        tryAwaitRelease()
                        isPressed = false
                    }
                )
            },
        contentAlignment = Alignment.Center,
    ) {
        Text("POWER",
            color = Color.White,
            fontWeight = FontWeight.Bold,
            fontSize = 14.sp,
            style = TextStyle(shadow = Shadow(
                color = Color.Black.copy(alpha = 0.5f),
                offset = Offset(0f, 2f),
                blurRadius = 4f,
            )))
    }
}
```
- Use `Brush.verticalGradient()` for metallic surfaces and `Modifier.border()` with `CircleShape` for bezels.
- Animate `shadow` elevation and `graphicsLayer { scaleX/scaleY }` on press for realistic physical push.
- For textures, use `Modifier.paint(painterResource(R.drawable.brushed_metal))` as a background.

## Do's and Don'ts
- **DO**: Ensure the metaphor makes sense for the user's task.
- **DON'T**: Overuse it to the point of clutter. Keep the interactive elements highly realistic, but let the structural layout remain clean.
