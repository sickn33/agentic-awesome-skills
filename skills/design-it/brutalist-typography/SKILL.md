---
name: brutalist-typography
description: Web and App implementation guide for Brutalist Typography. Trigger when user wants huge fonts, raw presentation, and aggressive layout decisions.
date_added: "2026-06-17"
risk: safe
source: self
source_type: self
---

# Brutalist Typography

> "Aggressive, unpolished, and unapologetic. Text that demands attention by breaking the rules."


## When to Use
Use this sub-style when the user's request matches the aesthetic described above. This is a child reference of the `design-it` skill and is not meant to be triggered directly.

## Core Principles
1. **Rule Breaking**: Text that overlaps, ignores margins, or deliberately clips off the edge of the screen.
2. **Anti-Design**: Intentional use of system fonts or "ugly" fonts (Times New Roman, Courier) in massive sizes.
3. **Harsh Contrast**: Clashing colors or stark monochrome.

## Visual DNA
- **Colors**: **Industrial Chic** (Black, White, Red) or aggressive neon clashing (e.g., pure blue on pure red).
- **Typography**: System default fonts (`Times New Roman`, `Arial`, `Courier New`) blown up to 150px.
- **Styling**: Marquees, blinking text, underlines that cut through descenders.

## Web Implementation
- Break the grid. Use absolute positioning or negative margins.
- **CSS Example**:
```css
body {
  background-color: #fff;
  color: #000;
  font-family: 'Times New Roman', serif;
}

.brutalist-headline {
  font-size: 15vw;
  line-height: 0.7;
  letter-spacing: -5px;
  margin-left: -10px; /* Bleeds off screen intentionally */
  word-wrap: break-word; /* Let words break awkwardly */
}

.brutalist-highlight {
  background-color: #ff0000;
  color: #fff;
  padding: 0 10px;
}

.marquee-container {
  border-top: 5px solid #000;
  border-bottom: 5px solid #000;
  overflow: hidden;
  white-space: nowrap;
  font-family: 'Courier New', monospace;
  font-size: 2rem;
  font-weight: bold;
  padding: 10px 0;
}

/* A nod to early 90s web */
.brutalist-link {
  color: #0000ee;
  text-decoration: underline;
  text-transform: uppercase;
}
.brutalist-link:hover {
  background-color: #0000ee;
  color: #fff;
}
```

## App Implementation

### SwiftUI
```swift
struct BrutalistTypeView: View {
    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: -20) {
                // Bleeds off the edge intentionally
                Text("BREAK")
                    .font(.custom("Times New Roman", size: 120))
                    .padding(.leading, -20) 
                
                Text("THE")
                    .font(.custom("Arial", size: 140))
                    .fontWeight(.black)
                    .foregroundColor(.clear)
                    .overlay(
                        Text("THE").stroke(Color.red, lineWidth: 3)
                    )
                    .offset(x: 40)
                
                Text("GRID.")
                    .font(.custom("Courier New", size: 100))
                    .background(Color.blue)
                    .foregroundColor(.white)
                    .rotationEffect(.degrees(-5))
                    .offset(y: -40)
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding(.top, 50)
        }
        .ignoresSafeArea() // Critical for Brutalist type
        .background(Color.white)
    }
}
```
- `.ignoresSafeArea()` is mandatory. Text must be allowed to clip into the notch and status bar.
- Use negative `spacing` in `VStack` or explicit negative `.offset()` to force text elements to overlap each other aggressively.
- Outline text is achieved by setting `.foregroundColor(.clear)` and overlaying a `.stroke()`.

### Flutter
```dart
class BrutalistTypeScreen extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    // Scaffold without SafeArea
    return Scaffold(
      backgroundColor: Colors.white,
      body: Stack(
        children: [
          Positioned(
            top: -20,
            left: -20,
            child: const Text(
              'BREAK',
              style: TextStyle(
                fontFamily: 'Times New Roman',
                fontSize: 150,
                height: 0.8, // Negative line-spacing
                color: Colors.black,
              ),
            ),
          ),
          Positioned(
            top: 100,
            left: 40,
            child: Text(
              'THE',
              style: TextStyle(
                fontFamily: 'Arial',
                fontSize: 140,
                fontWeight: FontWeight.w900,
                foreground: Paint()
                  ..style = PaintingStyle.stroke
                  ..strokeWidth = 3
                  ..color = Colors.red,
              ),
            ),
          ),
          Positioned(
            top: 220,
            left: 10,
            child: Transform.rotate(
              angle: -0.1,
              child: Container(
                color: Colors.blue,
                child: const Text(
                  'GRID.',
                  style: TextStyle(
                    fontFamily: 'Courier',
                    fontSize: 120,
                    color: Colors.white,
                  ),
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
- Do not use `SafeArea`.
- Absolute positioning via `Stack` and `Positioned` is the easiest way to break the grid and force overlaps.
- Use `height: 0.8` (or less than 1.0) in `TextStyle` to smash lines of text together.

### React Native
```jsx
const BrutalistTypeScreen = () => {
  return (
    <View style={{ flex: 1, backgroundColor: '#FFF' }}>
      {/* 
        Note: React Native text clipping can be tricky on Android. 
        Ensure parent views don't have overflow: 'hidden'.
      */}
      <Text style={{
        fontFamily: 'Times New Roman',
        fontSize: 130,
        lineHeight: 110,
        color: '#000',
        marginLeft: -15, // Bleed off edge
        marginTop: 40
      }}>
        BREAK
      </Text>
      
      <Text style={{
        fontFamily: 'Arial',
        fontSize: 140,
        fontWeight: '900',
        color: 'transparent',
        textShadowColor: '#FF0000',
        textShadowRadius: 1, // Fake stroke effect
        marginLeft: 40,
        marginTop: -30 // Overlap previous text
      }}>
        THE
      </Text>
      
      <Text style={{
        fontFamily: 'monospace',
        fontSize: 100,
        backgroundColor: '#0000FF',
        color: '#FFF',
        transform: [{ rotate: '-5deg' }],
        marginTop: -20,
        alignSelf: 'flex-start'
      }}>
        GRID.
      </Text>
    </View>
  );
};
```
- React Native doesn't have a native text-stroke property, so you either simulate it with text shadows or use `@shopify/react-native-skia` for true stroked text.
- Use negative `marginTop` and `marginLeft` to force the layout chaos.

### Jetpack Compose
```kotlin
@Composable
fun BrutalistTypeScreen() {
    // Use Box for absolute overlapping layouts
    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(Color.White)
    ) {
        Text(
            text = "BREAK",
            fontFamily = FontFamily.Serif, // Times New Roman equivalent
            fontSize = 130.sp,
            color = Color.Black,
            lineHeight = 100.sp,
            modifier = Modifier.offset(x = (-15).dp, y = (-20).dp)
        )
        
        Text(
            text = "THE",
            fontFamily = FontFamily.SansSerif,
            fontSize = 140.sp,
            fontWeight = FontWeight.Black,
            style = TextStyle(
                drawStyle = Stroke(width = 5f)
            ),
            color = Color.Red,
            modifier = Modifier.offset(x = 40.dp, y = 100.dp)
        )
        
        Text(
            text = "GRID.",
            fontFamily = FontFamily.Monospace,
            fontSize = 100.sp,
            color = Color.White,
            modifier = Modifier
                .offset(x = 10.dp, y = 220.dp)
                .rotate(-5f)
                .background(Color.Blue)
        )
    }
}
```
- A `Box` with explicit `Modifier.offset(x, y)` allows freeform overlapping placement, breaking away from standard `Column`/`Row` grids.
- Compose `TextStyle` supports `drawStyle = Stroke(width = 5f)`, making outline typography incredibly simple.

## Do's and Don'ts
- **DO**: Mix serif and monospace fonts aggressively.
- **DON'T**: Add drop shadows, gradients, or rounded corners. The design must look raw and unstyled.
