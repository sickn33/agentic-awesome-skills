---
name: cyberpunk-ui
description: Web and App implementation guide for Cyberpunk UI. Trigger when user wants neon colors, dark backgrounds, high-tech dystopian aesthetics, and hacking interfaces.
date_added: "2026-06-17"
risk: safe
source: self
source_type: self
---

# Cyberpunk UI

> "High tech, low life. Neon signs cutting through the smog of a dystopian megacity."


## When to Use
Use this sub-style when the user's request matches the aesthetic described above. This is a child reference of the `design-it` skill and is not meant to be triggered directly.

## Core Principles
1. **Neon on Black**: The foundation is absolute black (`#000000`) or deep charcoal, cut by searingly bright neon accents.
2. **Angled Geometries**: Clipped corners (chamfers) rather than rounded corners. UI elements often look like they were cut from metal plates.
3. **Glitch and Data**: Random streams of hexadecimal data, barcode accents, and intentional visual tearing.

## Visual DNA
- **Colors**: Acid Yellow (`#FCE205`), Cyan (`#00FFFF`), Hot Pink (`#FF003C`), against Black. 
- **Typography**: Industrial, squared-off sans-serifs (like `Rajdhani`, `Blender Pro`, or `Teko`), mixed with small monospace fonts for data.
- **Styling**: Diagonal stripes, warning tape patterns, and heavy outer glows.

## Web Implementation
- Rely on `clip-path` for the angled cuts.
- **CSS Example**:
```css
body {
  background-color: #050505;
  color: #00FFFF;
  font-family: 'Rajdhani', sans-serif;
  background-image: repeating-linear-gradient(
    45deg,
    #050505,
    #050505 10px,
    #0a0a0a 10px,
    #0a0a0a 20px
  );
}

.cyberpunk-button {
  background-color: #FF003C; /* Cyberpunk Red/Pink */
  color: #FFF;
  font-size: 1.5rem;
  font-weight: bold;
  text-transform: uppercase;
  border: none;
  padding: 16px 32px;
  
  /* The signature clipped corner */
  clip-path: polygon(
    0 0, 
    calc(100% - 15px) 0, 
    100% 15px, 
    100% 100%, 
    15px 100%, 
    0 calc(100% - 15px)
  );
  
  position: relative;
  transition: all 0.2s ease;
}

/* The glitch/shadow effect */
.cyberpunk-button:hover {
  background-color: #FCE205; /* Acid Yellow */
  color: #000;
  box-shadow: 
    -4px 0 0 #00FFFF,
    4px 0 0 #FF003C;
}

.data-stream {
  font-family: monospace;
  font-size: 0.8rem;
  color: rgba(0, 255, 255, 0.5);
}
```

## App Implementation

### SwiftUI
```swift
struct CyberpunkShape: Shape {
    let cutSize: CGFloat = 15
    func path(in rect: CGRect) -> Path {
        var path = Path()
        // Top left
        path.move(to: CGPoint(x: 0, y: 0))
        // Top right (cut)
        path.addLine(to: CGPoint(x: rect.maxX - cutSize, y: 0))
        path.addLine(to: CGPoint(x: rect.maxX, y: cutSize))
        // Bottom right
        path.addLine(to: CGPoint(x: rect.maxX, y: rect.maxY))
        // Bottom left (cut)
        path.addLine(to: CGPoint(x: cutSize, y: rect.maxY))
        path.addLine(to: CGPoint(x: 0, y: rect.maxY - cutSize))
        path.closeSubpath()
        return path
    }
}

struct CyberButton: View {
    var body: some View {
        Button(action: {}) {
            Text("SYS.OVERRIDE")
                .font(.custom("Rajdhani", size: 24))
                .fontWeight(.bold)
                .foregroundColor(.white)
                .padding(.horizontal, 32)
                .padding(.vertical, 16)
        }
        .background(Color(red: 1.0, green: 0.0, blue: 0.24)) // Cyberpunk Red
        .clipShape(CyberpunkShape())
        .overlay(
            CyberpunkShape()
                .stroke(Color(red: 0.0, green: 1.0, blue: 1.0), lineWidth: 2) // Cyan border
        )
    }
}
```
- Define a custom `Shape` that physically cuts off the corners, bypassing standard `cornerRadius`.
- Use `.clipShape()` for the background, and `.overlay()` with `.stroke()` for high-tech borders.

### Flutter
```dart
class CyberpunkClipper extends CustomClipper<Path> {
  final double cutSize = 15.0;

  @override
  Path getClip(Size size) {
    Path path = Path();
    path.lineTo(size.width - cutSize, 0); // Top right cut start
    path.lineTo(size.width, cutSize);     // Top right cut end
    path.lineTo(size.width, size.height);
    path.lineTo(cutSize, size.height);    // Bottom left cut start
    path.lineTo(0, size.height - cutSize);// Bottom left cut end
    path.close();
    return path;
  }

  @override
  bool shouldReclip(CustomClipper<Path> oldClipper) => false;
}

class CyberButton extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return ClipPath(
      clipper: CyberpunkClipper(),
      child: Container(
        color: const Color(0xFFFF003C), // Cyberpunk Red
        padding: const EdgeInsets.symmetric(horizontal: 32, vertical: 16),
        child: const Text(
          'SYS.OVERRIDE',
          style: TextStyle(
            color: Colors.white,
            fontSize: 24,
            fontWeight: FontWeight.bold,
            fontFamily: 'Rajdhani',
          ),
        ),
      ),
    );
  }
}
```
- Extend `CustomClipper<Path>` to calculate the precise angular cuts.
- Wrap your containers in `ClipPath`. 
- For borders, you must use a `CustomPaint` with a `CustomPainter` that traces the exact same path.

### React Native
```jsx
import Svg, { Polygon } from 'react-native-svg';

const CyberButton = () => {
  return (
    <View style={{ alignItems: 'center', justifyContent: 'center', width: 200, height: 60 }}>
      {/* Background SVG to achieve the clipped corner look */}
      <View style={{ position: 'absolute', top: 0, bottom: 0, left: 0, right: 0 }}>
        <Svg height="100%" width="100%" viewBox="0 0 200 60" preserveAspectRatio="none">
          <Polygon 
            points="0,0 185,0 200,15 200,60 15,60 0,45"
            fill="#FF003C" 
            stroke="#00FFFF"
            strokeWidth="2"
          />
        </Svg>
      </View>
      
      <Text style={{ 
        color: '#FFF', 
        fontSize: 20, 
        fontWeight: 'bold',
        fontFamily: 'Rajdhani-Bold' 
      }}>
        SYS.OVERRIDE
      </Text>
    </View>
  );
};
```
- React Native does not natively support clipping paths on views easily.
- **Solution**: Use `react-native-svg` to draw a `<Polygon>` that acts as the absolute-positioned background behind transparent text.

### Jetpack Compose
```kotlin
class CyberpunkShape(private val cutSize: Dp) : Shape {
    override fun createOutline(
        size: Size,
        layoutDirection: LayoutDirection,
        density: Density
    ): Outline {
        val cutPx = with(density) { cutSize.toPx() }
        val path = Path().apply {
            moveTo(0f, 0f)
            lineTo(size.width - cutPx, 0f)
            lineTo(size.width, cutPx)
            lineTo(size.width, size.height)
            lineTo(cutPx, size.height)
            lineTo(0f, size.height - cutPx)
            close()
        }
        return Outline.Generic(path)
    }
}

@Composable
fun CyberButton() {
    Box(
        modifier = Modifier
            .clip(CyberpunkShape(15.dp))
            .background(Color(0xFFFF003C))
            .border(2.dp, Color(0xFF00FFFF), CyberpunkShape(15.dp))
            .clickable { }
            .padding(horizontal = 32.dp, vertical = 16.dp)
    ) {
        Text(
            text = "SYS.OVERRIDE",
            color = Color.White,
            fontSize = 24.sp,
            fontWeight = FontWeight.Bold,
            // Assuming custom font is loaded
        )
    }
}
```
- Create a custom `Shape` by overriding `createOutline` and tracing the `Path`.
- Pass this shape directly into `Modifier.clip()` and `Modifier.background()`.
- You can elegantly apply a border stroke directly to the custom shape using `Modifier.border()`.

## Do's and Don'ts
- **DO**: Include tiny, meaningless technical details (crosshairs, serial numbers, "SYS.OVERRIDE" text).
- **DON'T**: Use soft, organic curves or gradients. It must be sharp and aggressive.

## Limitations
- This is a styling reference and does not replace environment-specific validation, accessibility testing, or expert review.
- Ensure appropriate contrast ratios and responsive behaviors are verified separately.
