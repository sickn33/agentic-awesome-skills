---
name: retro-design
description: Web and App implementation guide for Retro Design (60s-80s). Trigger when user wants vintage aesthetics, warm muted colors, and nostalgic layouts.
date_added: "2026-06-17"
risk: safe
source: self
source_type: self
---

# Retro Design

> "A warm, analog feeling. Nostalgia through muted tones, grain, and classic typography."


## When to Use
Use this sub-style when the user's request matches the aesthetic described above. This is a child reference of the `design-it` skill and is not meant to be triggered directly.

## Core Principles
1. **Warm, Analog Color Palettes**: Colors look faded by the sun or printed on aged paper.
2. **Texture and Noise**: A slight grain overlay to simulate film or old print media.
3. **Classic Typography Pairings**: Heavy, groovy display fonts paired with typewriter or classic serif body copy.

## Visual DNA
- **Colors**: **Monochromatic Brown** or warm, faded palettes (mustard yellow, burnt orange, sage green, off-white).
- **Typography**: Display fonts like `Cooper Black`, `Garamond`, or `Courier`.
- **Styling**: Badges, stamps, wavy borders, and halftone patterns.

## Web Implementation
- Use CSS filters and background noise images to create texture.
- **CSS Example**:
```css
body {
  background-color: #F4E8D1; /* Aged paper */
  color: #3E2723; /* Deep brown ink */
  font-family: 'Georgia', serif;
  
  /* Apply a subtle noise overlay using a pseudo-element or background image */
  background-image: url('noise-texture.png');
  background-blend-mode: multiply;
}

.retro-header {
  font-family: 'Cooper Black', serif;
  font-size: 4rem;
  color: #D35400; /* Burnt orange */
  text-shadow: 2px 2px 0px #F1C40F; /* Mustard yellow drop shadow */
  letter-spacing: -1px;
}

.retro-card {
  background-color: #FFF3E0;
  border: 2px solid #3E2723;
  border-radius: 12px;
  padding: 24px;
  
  /* Vintage offset shadow */
  box-shadow: 8px 8px 0px #795548;
}

.retro-badge {
  display: inline-block;
  background-color: #E74C3C;
  color: #F4E8D1;
  font-family: monospace;
  font-weight: bold;
  padding: 8px 16px;
  border-radius: 50%; /* Make it look like a sticker */
  transform: rotate(-10deg);
}
```

## App Implementation

### SwiftUI
```swift
struct RetroCard: View {
    let paperColor = Color(red: 0.96, green: 0.91, blue: 0.82) // #F4E8D1
    let inkColor = Color(red: 0.24, green: 0.15, blue: 0.14) // #3E2723
    
    var body: some View {
        ZStack {
            paperColor.ignoresSafeArea()
            
            // Optional: Noise texture
            Image("film_grain")
                .resizable()
                .blendMode(.multiply)
                .opacity(0.3)
                .ignoresSafeArea()
            
            VStack(alignment: .leading, spacing: 24) {
                Text("RETRO DESIGN")
                    .font(.custom("Cooper Black", size: 36))
                    .foregroundColor(Color(red: 0.83, green: 0.33, blue: 0.0)) // #D35400
                    .shadow(color: Color(red: 0.95, green: 0.77, blue: 0.06), radius: 0, x: 2, y: 2)
                
                Text("Analog warmth and classic typography.")
                    .font(.custom("Georgia", size: 18))
                    .foregroundColor(inkColor)
            }
            .padding(32)
            .background(Color(red: 1.0, green: 0.95, blue: 0.88))
            .cornerRadius(12)
            .overlay(
                RoundedRectangle(cornerRadius: 12)
                    .stroke(inkColor, lineWidth: 2)
            )
            // Vintage solid offset shadow
            .shadow(color: Color(red: 0.47, green: 0.33, blue: 0.28), radius: 0, x: 8, y: 8)
        }
    }
}
```
- A grain texture image can be overlaid using `.blendMode(.multiply)`. Be aware of memory usage with full-screen textures.
- Use `.shadow(radius: 0)` to create the hard offset shadows typical of 70s print media.
- Custom fonts like Cooper Black are absolutely required.

### Flutter
```dart
class RetroCard extends StatelessWidget {
  final Color paperColor = const Color(0xFFF4E8D1);
  final Color inkColor = const Color(0xFF3E2723);

  @override
  Widget build(BuildContext context) {
    return Container(
      color: paperColor,
      child: Stack(
        fit: StackFit.expand,
        children: [
          // Noise texture
          Opacity(
            opacity: 0.3,
            child: Image.asset('assets/film_grain.png', 
              fit: BoxFit.cover, 
              colorBlendMode: BlendMode.multiply),
          ),
          Center(
            child: Container(
              padding: const EdgeInsets.all(32),
              decoration: BoxDecoration(
                color: const Color(0xFFFFF3E0),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: inkColor, width: 2),
                boxShadow: const [
                  BoxShadow(
                    color: Color(0xFF795548),
                    blurRadius: 0, // Hard offset shadow
                    offset: Offset(8, 8),
                  ),
                ],
              ),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text('RETRO DESIGN',
                    style: TextStyle(
                      fontFamily: 'Cooper',
                      fontSize: 36,
                      color: Color(0xFFD35400),
                      shadows: [Shadow(color: Color(0xFFF1C40F), offset: Offset(2, 2))],
                    )),
                  const SizedBox(height: 24),
                  Text('Analog warmth and classic typography.',
                    style: TextStyle(fontFamily: 'Georgia', fontSize: 18, color: inkColor)),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}
```
- Wrap backgrounds in a `Stack` to place a semi-transparent film grain asset over the solid color.
- Drop shadows for text and containers must have `blurRadius: 0` to emulate offset misregistered ink prints.

### React Native
```jsx
const RetroCard = () => {
  return (
    <ImageBackground 
      source={require('./film_grain.png')}
      style={{ flex: 1, backgroundColor: '#F4E8D1', padding: 24, justifyContent: 'center' }}
      imageStyle={{ opacity: 0.3, tintColor: '#3E2723' }}
    >
      <View style={{
        backgroundColor: '#FFF3E0',
        padding: 32,
        borderRadius: 12,
        borderWidth: 2,
        borderColor: '#3E2723',
        // Hard drop shadow
        shadowColor: '#795548',
        shadowOffset: { width: 8, height: 8 },
        shadowOpacity: 1,
        shadowRadius: 0,
        elevation: 8, // Fallback for Android, though it blurs
      }}>
        <Text style={{
          fontFamily: 'CooperBlack',
          fontSize: 36,
          color: '#D35400',
          textShadowColor: '#F1C40F',
          textShadowOffset: { width: 2, height: 2 },
          textShadowRadius: 0,
          marginBottom: 24
        }}>
          RETRO DESIGN
        </Text>
        <Text style={{ fontFamily: 'Georgia', fontSize: 18, color: '#3E2723' }}>
          Analog warmth and classic typography.
        </Text>
      </View>
    </ImageBackground>
  );
};
```
- Use `ImageBackground` on the root view for the grain.
- Android's `elevation` cannot do unblurred offset shadows natively. Use `react-native-drop-shadow` for perfect retro shadows on Android.

### Jetpack Compose
```kotlin
@Composable
fun RetroCard() {
    val inkColor = Color(0xFF3E2723)
    
    Box(modifier = Modifier.fillMaxSize().background(Color(0xFFF4E8D1))) {
        // Noise Texture Overlay
        Image(
            painter = painterResource(id = R.drawable.film_grain),
            contentDescription = null,
            contentScale = ContentScale.Crop,
            modifier = Modifier.matchParentSize().alpha(0.3f),
            colorFilter = ColorFilter.tint(Color.Black, BlendMode.Multiply)
        )
        
        Box(
            modifier = Modifier
                .align(Alignment.Center)
                .padding(24.dp)
                // Fake hard shadow in compose by drawing behind
                .drawBehind {
                    drawRoundRect(
                        color = Color(0xFF795548),
                        topLeft = Offset(8.dp.toPx(), 8.dp.toPx()),
                        size = size,
                        cornerRadius = CornerRadius(12.dp.toPx())
                    )
                }
                .background(Color(0xFFFFF3E0), RoundedCornerShape(12.dp))
                .border(2.dp, inkColor, RoundedCornerShape(12.dp))
                .padding(32.dp)
        ) {
            Column {
                Text("RETRO DESIGN",
                    fontFamily = FontFamily(Font(R.font.cooper_black)),
                    fontSize = 36.sp,
                    color = Color(0xFFD35400),
                    style = TextStyle(shadow = Shadow(Color(0xFFF1C40F), Offset(4f, 4f), 0f))
                )
                Spacer(Modifier.height(24.dp))
                Text("Analog warmth and classic typography.",
                    fontFamily = FontFamily.Serif,
                    fontSize = 18.sp,
                    color = inkColor)
            }
        }
    }
}
```
- Native `Modifier.shadow` creates soft blurs. Use `Modifier.drawBehind` to draw an offset `drawRoundRect` for the hard retro shadow block.
- Text shadows support hard offsets perfectly via `Shadow(color, offset, blurRadius = 0f)`.

## Do's and Don'ts
- **DO**: Use slightly off-white backgrounds (cream, beige) instead of pure `#FFFFFF` to simulate aged paper.
- **DON'T**: Use sleek, modern geometric sans-serifs or tech-focused neon colors.
