---
name: 3d-ui
description: Web and App implementation guide for 3D UI. Trigger when user wants actual 3D objects, perspective effects, and spatial depth.
date_added: "2026-06-17"
risk: safe
source: self
source_type: self
---

# 3D UI

> "Breaking the plane. Interfaces that exist in a three-dimensional, rotatable space."


## When to Use
Use this sub-style when the user's request matches the aesthetic described above. This is a child reference of the `design-it` skill and is not meant to be triggered directly.

## Core Principles
1. **True Depth (Z-Axis Translation)**: Elements don't just have shadows; they physically move closer to or further from the camera.
2. **Perspective**: Use CSS perspective or WebGL to create realistic vanishing points.
3. **Interactive Rotation**: Elements should respond to mouse movement or device gyroscope by tilting or rotating in 3D space.

## Visual DNA
- **Colors**: Bold, striking palettes like **Midnight Luxury** or **Industrial Chic**. 3D elements need high contrast to show their geometry.
- **Typography**: Bold, blocky, or extruded text.
- **Graphics**: Instead of flat icons, use rendered 3D assets (.glb, .gltf, or high-res PNGs of 3D objects).

## Web Implementation
- Rely heavily on `perspective`, `transform-style: preserve-3d`, and `rotateX`/`rotateY`.
- **CSS Example**:
```css
.perspective-container {
  perspective: 1000px;
  display: flex;
  justify-content: center;
  align-items: center;
}

.card-3d {
  width: 300px;
  height: 400px;
  transform-style: preserve-3d;
  transition: transform 0.5s ease;
  
  /* Initial slight rotation */
  transform: rotateX(15deg) rotateY(-15deg);
}

.card-3d:hover {
  /* Straighten out on hover */
  transform: rotateX(0) rotateY(0) translateZ(50px);
}

/* Inner elements popping out */
.card-content {
  transform: translateZ(30px); /* Pushes content 30px closer to viewer */
}
```

## App Implementation

### SwiftUI
```swift
struct Card3D: View {
    @State private var dragOffset = CGSize.zero
    
    var body: some View {
        VStack {
            Text("3D Card")
                .font(.largeTitle.bold())
                .foregroundColor(.white)
        }
        .frame(width: 300, height: 400)
        .background(
            LinearGradient(colors: [.blue, .purple], startPoint: .topLeading, endPoint: .bottomTrailing)
        )
        .cornerRadius(24)
        .shadow(radius: 20)
        // Magic 3D effect based on drag gesture
        .rotation3DEffect(
            .degrees(Double(dragOffset.width / 10)),
            axis: (x: 0, y: 1, z: 0),
            perspective: 0.5
        )
        .rotation3DEffect(
            .degrees(Double(-dragOffset.height / 10)),
            axis: (x: 1, y: 0, z: 0),
            perspective: 0.5
        )
        .gesture(
            DragGesture()
                .onChanged { value in
                    withAnimation(.interactiveSpring()) {
                        dragOffset = value.translation
                    }
                }
                .onEnded { _ in
                    withAnimation(.spring()) {
                        dragOffset = .zero
                    }
                }
        )
    }
}
```
- SwiftUI makes this incredibly easy with `.rotation3DEffect()`.
- Use the `perspective` parameter (default 1/6, higher = more distorted) to control the camera distance.
- Link the rotation axes (`x`, `y`) to drag gestures or CoreMotion (gyroscope) for interactive 3D UI.

### Flutter
```dart
class Card3D extends StatefulWidget {
  @override
  State<Card3D> createState() => _Card3DState();
}

class _Card3DState extends State<Card3D> {
  Offset _offset = Offset.zero;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onPanUpdate: (details) {
        setState(() => _offset += details.delta);
      },
      onPanEnd: (_) {
        setState(() => _offset = Offset.zero); // Snap back
      },
      child: TweenAnimationBuilder(
        tween: Tween<Offset>(begin: Offset.zero, end: _offset),
        duration: const Duration(milliseconds: 200),
        curve: Curves.easeOut,
        builder: (context, Offset offset, child) {
          // Perspective Matrix
          final transform = Matrix4.identity()
            ..setEntry(3, 2, 0.001) // perspective
            ..rotateX(-offset.dy * 0.01)
            ..rotateY(offset.dx * 0.01);

          return Transform(
            transform: transform,
            alignment: FractionalOffset.center,
            child: Container(
              width: 300,
              height: 400,
              decoration: BoxDecoration(
                gradient: const LinearGradient(colors: [Colors.blue, Colors.purple]),
                borderRadius: BorderRadius.circular(24),
                boxShadow: const [BoxShadow(color: Colors.black45, blurRadius: 20)],
              ),
              alignment: Alignment.center,
              child: const Text('3D Card', 
                style: TextStyle(color: Colors.white, fontSize: 32, fontWeight: FontWeight.bold)),
            ),
          );
        },
      ),
    );
  }
}
```
- The secret to perspective in Flutter is `Matrix4.identity()..setEntry(3, 2, 0.001)`.
- Wrap the target container in a `Transform` widget and apply rotations on the X and Y axes.
- Use `TweenAnimationBuilder` to smooth out the return-to-center physics.

### React Native
```jsx
const Card3D = () => {
  const pan = useRef(new Animated.ValueXY()).current;

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderMove: Animated.event([null, { dx: pan.x, dy: pan.y }], { useNativeDriver: false }),
      onPanResponderRelease: () => {
        Animated.spring(pan, { toValue: { x: 0, y: 0 }, useNativeDriver: false }).start();
      },
    })
  ).current;

  // Map drag distance to degrees
  const rotateX = pan.y.interpolate({ inputRange: [-200, 200], outputRange: ['20deg', '-20deg'] });
  const rotateY = pan.x.interpolate({ inputRange: [-200, 200], outputRange: ['-20deg', '20deg'] });

  return (
    <Animated.View
      {...panResponder.panHandlers}
      style={{
        width: 300, height: 400,
        backgroundColor: '#6b21a8',
        borderRadius: 24,
        justifyContent: 'center', alignItems: 'center',
        // Pseudo-3D transforms
        transform: [
          { perspective: 1000 },
          { rotateX },
          { rotateY }
        ]
      }}
    >
      <Text style={{ color: '#fff', fontSize: 32, fontWeight: '700' }}>3D Card</Text>
    </Animated.View>
  );
};
```
- True 3D models require `react-three-fiber`.
- For UI perspective transforms, use the `transform` array: `[{ perspective: 1000 }, { rotateX: '...' }, { rotateY: '...' }]`.
- `perspective` MUST be the first item in the transform array for the effect to render correctly.

### Jetpack Compose
```kotlin
@Composable
fun Card3D() {
    var offset by remember { mutableStateOf(Offset.Zero) }
    val animatedOffset by animateOffsetAsState(
        targetValue = offset,
        animationSpec = spring(dampingRatio = Spring.DampingRatioMediumBouncy)
    )

    Box(
        modifier = Modifier
            .size(300.dp, 400.dp)
            .pointerInput(Unit) {
                detectDragGestures(
                    onDrag = { change, dragAmount ->
                        change.consume()
                        offset += dragAmount
                    },
                    onDragEnd = { offset = Offset.Zero },
                    onDragCancel = { offset = Offset.Zero }
                )
            }
            .graphicsLayer {
                // Apply 3D rotation based on drag offset
                rotationX = -animatedOffset.y * 0.1f
                rotationY = animatedOffset.x * 0.1f
                cameraDistance = 8f * density // Sets the perspective
            }
            .shadow(20.dp, RoundedCornerShape(24.dp))
            .clip(RoundedCornerShape(24.dp))
            .background(Brush.linearGradient(listOf(Color.Blue, Color.Magenta)))
    ) {
        Text("3D Card",
            color = Color.White, fontSize = 32.sp, fontWeight = FontWeight.Bold,
            modifier = Modifier.align(Alignment.Center))
    }
}
```
- Apply 3D transformations inside `Modifier.graphicsLayer { }`.
- Set `rotationX` and `rotationY` for the tilt.
- **Critical**: Set `cameraDistance` to establish the Z-axis perspective vanishing point. Usually `8f * density` is a good starting point.

## Do's and Don'ts
- **DO**: Tie 3D rotation to user input (mouse move on web, device tilt on mobile) for maximum impact.
- **DON'T**: Make text itself 3D unless it's a massive headline. 3D text is generally unreadable at small sizes.
