---
name: neo-brutalism
description: Web and App implementation guide for Neo-Brutalism. Trigger when user wants thick borders, hard shadows, bright colors, and a playful yet structured look.
---

# Neo-Brutalism

> "Brutalism, but make it pop. Hard lines, stark shadows, and vibrant, unashamed colors."

## Core Principles
1. **Hard Drop Shadows**: Solid black shadows with no blur. Usually offset by a few pixels down and to the right.
2. **Thick Outlines**: Everything has a heavy, solid black border (usually 2px-4px).
3. **Flat, High-Contrast Colors**: Bright, saturated pastels or primary colors contrasting against pure white or black.

## Visual DNA
- **Colors**: Start with an off-white background (like `#FDF8F5`), add stark black borders `#000000`, and use saturated accents like lemon yellow, bright cyan, or coral.
- **Typography**: Very bold, geometric sans-serifs (e.g., `Space Grotesk`, `Archivo Black`, `Inter Black`).
- **Shapes**: Sharp rectangles or completely rounded pill shapes, but always with a heavy stroke.

## Web Implementation
- The defining feature is the `box-shadow` with `0` blur.
- **CSS Example**:
```css
:root {
  --neo-border: 3px solid #000000;
  --neo-shadow: 6px 6px 0px #000000;
  --neo-bg: #F4F4F0;
  --neo-accent: #FF3366;
}

body {
  background-color: var(--neo-bg);
  font-family: 'Space Grotesk', sans-serif;
}

.neo-card {
  background-color: #ffffff;
  border: var(--neo-border);
  box-shadow: var(--neo-shadow);
  border-radius: 8px; /* Optional, sharp is fine too */
  padding: 32px;
  transition: transform 0.1s, box-shadow 0.1s;
}

.neo-btn {
  background-color: var(--neo-accent);
  color: #000;
  font-weight: 800;
  text-transform: uppercase;
  border: var(--neo-border);
  box-shadow: 4px 4px 0px #000000;
  padding: 16px 32px;
  cursor: pointer;
  transition: all 0.1s ease;
}

.neo-btn:active {
  /* The "press" effect is removing the shadow and moving it down */
  transform: translate(4px, 4px);
  box-shadow: 0px 0px 0px #000000;
}
```

## App Implementation

### SwiftUI
```swift
struct NeoCard: View {
    @State private var isPressed = false
    let neoBorder: CGFloat = 3
    let neoShadow: CGFloat = 6
    
    var body: some View {
        Button(action: {}) {
            VStack(alignment: .leading, spacing: 16) {
                Text("NEO-BRUTALISM")
                    .font(.system(size: 24, weight: .black, design: .default))
                    .foregroundColor(.black)
                Text("Stark shadows, bright colors.")
                    .font(.system(size: 16, weight: .bold))
                    .foregroundColor(.black)
            }
            .padding(24)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(Color(red: 1.0, green: 0.2, blue: 0.4)) // Bright Coral
            // Neo-brutalist solid outline
            .overlay(
                Rectangle()
                    .stroke(Color.black, lineWidth: neoBorder)
            )
        }
        .buttonStyle(.plain)
        // Hard drop shadow (0 blur)
        .shadow(color: .black, radius: 0, x: isPressed ? 0 : neoShadow, y: isPressed ? 0 : neoShadow)
        // Translate the button physically when pressed to cover the shadow
        .offset(x: isPressed ? neoShadow : 0, y: isPressed ? neoShadow : 0)
        .simultaneousGesture(
            DragGesture(minimumDistance: 0)
                .onChanged { _ in isPressed = true }
                .onEnded { _ in isPressed = false }
        )
        // Instant pop, no smooth animation
        .animation(.none, value: isPressed)
    }
}
```
- `.shadow(radius: 0)` is the secret. Set an offset (e.g. `x: 6, y: 6`).
- For interactions, remove the shadow and translate the element by the same offset amounts using `.offset()`.
- Ensure `.animation(.none)` — Neo-brutalism interactions should be instant, snapping like physical switches.

### Flutter
```dart
class NeoCard extends StatefulWidget {
  @override
  State<NeoCard> createState() => _NeoCardState();
}

class _NeoCardState extends State<NeoCard> {
  bool _isPressed = false;
  final double neoOffset = 6.0;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTapDown: (_) => setState(() => _isPressed = true),
      onTapUp: (_) => setState(() => _isPressed = false),
      onTapCancel: () => setState(() => _isPressed = false),
      child: Transform.translate(
        // Move the container when pressed
        offset: Offset(_isPressed ? neoOffset : 0, _isPressed ? neoOffset : 0),
        child: Container(
          padding: const EdgeInsets.all(24),
          decoration: BoxDecoration(
            color: const Color(0xFFFF3366), // Bright coral
            border: Border.all(color: Colors.black, width: 3),
            // Sharp shadow disappears on press
            boxShadow: _isPressed ? [] : [
              BoxShadow(
                color: Colors.black,
                blurRadius: 0,     // Critical: 0 blur
                spreadRadius: 0,
                offset: Offset(neoOffset, neoOffset),
              ),
            ],
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisSize: MainAxisSize.min,
            children: const [
              Text('NEO-BRUTALISM',
                style: TextStyle(fontSize: 24, fontWeight: FontWeight.w900, color: Colors.black)),
              SizedBox(height: 16),
              Text('Stark shadows, bright colors.',
                style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Colors.black)),
            ],
          ),
        ),
      ),
    );
  }
}
```
- `blurRadius: 0` inside `BoxShadow` creates the solid block color.
- Remove the shadow array entirely when `_isPressed` is true, and simultaneously use `Transform.translate` to shift the widget down-right.

### React Native
```jsx
const NeoCard = () => {
  const [pressed, setPressed] = useState(false);
  const offset = 6;

  return (
    <Pressable
      onPressIn={() => setPressed(true)}
      onPressOut={() => setPressed(false)}
      style={{
        backgroundColor: '#FF3366',
        padding: 24,
        borderWidth: 3,
        borderColor: '#000',
        transform: [
          { translateX: pressed ? offset : 0 },
          { translateY: pressed ? offset : 0 }
        ],
        // iOS Hard Shadow
        shadowColor: '#000',
        shadowOffset: { width: pressed ? 0 : offset, height: pressed ? 0 : offset },
        shadowOpacity: pressed ? 0 : 1,
        shadowRadius: 0,
        // Android elevation cannot do 0-blur offset shadows natively
        // elevation: 0
      }}
    >
      <Text style={{ fontSize: 24, fontWeight: '900', color: '#000' }}>
        NEO-BRUTALISM
      </Text>
    </Pressable>
  );
};
```
- **Android Limitation**: Standard `elevation` CANNOT create an unblurred, offset drop shadow. 
- **Solution**: To make this work on Android, you MUST use the `react-native-drop-shadow` library or fake it by rendering an identical black `<View>` absolutely positioned directly behind the main card.

### Jetpack Compose
```kotlin
@Composable
fun NeoCard() {
    var isPressed by remember { mutableStateOf(false) }
    val neoOffset = 6.dp
    
    // Compose Modifier.shadow() always blurs. 
    // To get a solid hard shadow, we use Modifier.drawBehind.
    Box(
        modifier = Modifier
            .padding(16.dp)
            .offset(
                x = if (isPressed) neoOffset else 0.dp,
                y = if (isPressed) neoOffset else 0.dp
            )
            .drawBehind {
                if (!isPressed) {
                    drawRect(
                        color = Color.Black,
                        topLeft = Offset(neoOffset.toPx(), neoOffset.toPx()),
                        size = size
                    )
                }
            }
            .background(Color(0xFFFF3366))
            .border(3.dp, Color.Black)
            .pointerInput(Unit) {
                detectTapGestures(
                    onPress = {
                        isPressed = true
                        tryAwaitRelease()
                        isPressed = false
                    }
                )
            }
            .padding(24.dp)
    ) {
        Column {
            Text("NEO-BRUTALISM",
                fontSize = 24.sp, fontWeight = FontWeight.Black, color = Color.Black)
            Spacer(Modifier.height(16.dp))
            Text("Stark shadows, bright colors.",
                fontSize = 16.sp, fontWeight = FontWeight.Bold, color = Color.Black)
        }
    }
}
```
- **Compose Limitation**: Native `Modifier.shadow()` applies ambient blur which breaks the neo-brutalist aesthetic.
- Use `Modifier.drawBehind { drawRect(...) }` with an offset to manually draw the solid shadow block behind the container.
- Shift the container using `Modifier.offset` on press, while hiding the shadow layer.

## Do's and Don'ts
- **DO**: Make the active/pressed state visually translate the button to cover its shadow, creating a physical "click" feel.
- **DON'T**: Use gradients or blurred shadows. The aesthetic relies entirely on flat, sharp vectors.
