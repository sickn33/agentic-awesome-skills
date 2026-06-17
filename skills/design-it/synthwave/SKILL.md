---
name: synthwave
description: Web and App implementation guide for Synthwave. Trigger when user wants 80s-inspired neon, dark backgrounds, outrun grids, and Miami Vice aesthetics.
---

# Synthwave (Outrun)

> "Driving a Ferrari through a neon-lit digital grid at midnight."

## Core Principles
1. **Dark Mode by Default**: Absolute pitch-black or deep purple backgrounds.
2. **Neon Glowing Vectors**: Bright magenta, cyan, and yellow wireframes, text, and grids. Heavy use of `box-shadow` and `text-shadow` for glow effects.
3. **The Perspective Grid**: The defining visual is a glowing grid that fades into a vanishing point on the horizon.

## Visual DNA
- **Colors**: Deep space backgrounds (`#0B0C10`, `#110022`). Glowing neon accents: Cyan (`#00FFFF`), Hot Pink (`#FF00FF`), Electric Yellow (`#FFFF00`).
- **Typography**: 80s chrome text, brush script (like a neon sign), and heavy italicized sans-serifs.
- **Shadows**: Drop shadows are not black; they are the same color as the element, heavily blurred, to create light emission.

## Web Implementation
- Rely on `text-shadow` for neon signs and 3D transforms for the floor grid.
- **CSS Example**:
```css
body {
  background-color: #090014;
  color: #fff;
  font-family: 'Montserrat', sans-serif;
  overflow-x: hidden;
}

/* Neon Text Glow */
.synth-neon-text {
  font-family: 'Mr Dafoe', cursive; /* A classic 80s script */
  font-size: 4rem;
  color: #fff;
  text-shadow: 
    0 0 5px #fff,
    0 0 10px #fff,
    0 0 20px #FF00FF,
    0 0 40px #FF00FF,
    0 0 80px #FF00FF;
}

/* The Perspective Grid Floor */
.synth-grid {
  position: absolute;
  bottom: 0; left: -50%;
  width: 200%; height: 50vh;
  background-image: 
    linear-gradient(rgba(0, 255, 255, 0.8) 2px, transparent 2px),
    linear-gradient(90deg, rgba(0, 255, 255, 0.8) 2px, transparent 2px);
  background-size: 50px 50px;
  
  /* Create the 3D horizon effect */
  transform: perspective(500px) rotateX(60deg);
  transform-origin: top center;
  
  /* Fade out towards the horizon */
  mask-image: linear-gradient(to bottom, transparent 0%, black 100%);
  -webkit-mask-image: linear-gradient(to bottom, transparent 0%, black 100%);
}
```

## App Implementation

### SwiftUI
```swift
struct NeonText: View {
    let text: String
    
    var body: some View {
        Text(text)
            .font(.custom("Mr Dafoe", size: 64))
            .foregroundColor(.white)
            // Layering shadows to create a glowing bloom
            .shadow(color: .white, radius: 2)
            .shadow(color: .pink, radius: 5)
            .shadow(color: .pink, radius: 10)
            .shadow(color: .pink, radius: 20)
    }
}

struct SynthwaveScreen: View {
    var body: some View {
        ZStack {
            Color(red: 0.03, green: 0.0, blue: 0.08).ignoresSafeArea() // #090014
            
            VStack {
                NeonText(text: "Outrun")
                Spacer()
            }
            
            // Note: A 3D perspective grid requires SceneKit or a pre-rendered image
            // Native SwiftUI 3D transforms apply to the view, but won't draw an infinite floor grid easily.
            Image("synth_grid")
                .resizable()
                .scaledToFill()
                .frame(height: 300)
                .offset(y: 200)
        }
    }
}
```
- Stack multiple `.shadow(color:radius:)` modifiers directly on the text to create a vibrant neon bloom effect.
- The 3D wireframe horizon grid is best achieved via a pre-rendered image background.

### Flutter
```dart
class NeonText extends StatelessWidget {
  final String text;
  const NeonText(this.text);

  @override
  Widget build(BuildContext context) {
    return Text(
      text,
      style: const TextStyle(
        fontFamily: 'Mr Dafoe', // Or any cursive 80s font
        fontSize: 64,
        color: Colors.white,
        shadows: [
          Shadow(color: Colors.white, blurRadius: 2),
          Shadow(color: Colors.pinkAccent, blurRadius: 5),
          Shadow(color: Colors.pinkAccent, blurRadius: 15),
          Shadow(color: Colors.pinkAccent, blurRadius: 30),
        ],
      ),
    );
  }
}

class SynthwaveScreen extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF090014),
      body: Stack(
        children: [
          // Background grid asset
          Positioned(
            bottom: 0,
            left: 0,
            right: 0,
            height: 300,
            child: Image.asset('assets/synth_grid.png', fit: BoxFit.cover),
          ),
          // Foreground UI
          const Center(child: NeonText('Outrun')),
        ],
      ),
    );
  }
}
```
- `TextStyle` accepts a list of `Shadow` objects. Stack them with exponentially increasing `blurRadius` values (e.g., 2, 5, 15, 30) to simulate light dispersal.
- Avoid rendering the perspective grid programmatically using `CustomPaint` unless you want to do the 3D math manually. Use an asset.

### React Native
```jsx
// React Native only supports ONE textShadow per Text element natively.
// To create a true neon glow, you must stack identical Text components.

const NeonText = ({ text }) => {
  const baseStyle = {
    fontFamily: 'MrDafoe',
    fontSize: 64,
    color: '#FFF',
    position: 'absolute',
  };

  return (
    <View style={{ alignItems: 'center', height: 80 }}>
      {/* Outer Glow */}
      <Text style={[baseStyle, { textShadowColor: '#FF00FF', textShadowRadius: 30 }]}>{text}</Text>
      {/* Mid Glow */}
      <Text style={[baseStyle, { textShadowColor: '#FF00FF', textShadowRadius: 15 }]}>{text}</Text>
      {/* Core Glow */}
      <Text style={[baseStyle, { textShadowColor: '#FFF', textShadowRadius: 5 }]}>{text}</Text>
      {/* Crisp White Core */}
      <Text style={baseStyle}>{text}</Text>
    </View>
  );
};

const SynthwaveScreen = () => (
  <View style={{ flex: 1, backgroundColor: '#090014', justifyContent: 'center' }}>
    <NeonText text="Outrun" />
    
    <Image 
      source={require('./synth_grid.png')}
      style={{ position: 'absolute', bottom: 0, width: '100%', height: 300, resizeMode: 'cover' }}
    />
  </View>
);
```
- **React Native limitation**: You cannot pass an array of shadows to `textShadow`.
- **Workaround**: Render the exact same `<Text>` component 3-4 times on top of each other using `position: 'absolute'`, each with a different `textShadowRadius` to build the bloom.

### Jetpack Compose
```kotlin
@Composable
fun NeonText(text: String) {
    Text(
        text = text,
        fontSize = 64.sp,
        color = Color.White,
        fontFamily = FontFamily.Cursive,
        // Compose only supports a single Shadow natively on TextStyle
        style = TextStyle(
            shadow = Shadow(
                color = Color(0xFFFF00FF),
                offset = Offset.Zero,
                blurRadius = 30f // Single large blur as fallback
            )
        ),
        // To get stacked blurs, we use Modifier.drawBehind to draw the text repeatedly
    )
}

// Advanced stacked glow approach
@Composable
fun AdvancedNeonText(text: String) {
    Box(contentAlignment = Alignment.Center) {
        // Render layers of text to build the glow
        val blurs = listOf(30f, 15f, 5f)
        blurs.forEach { blur ->
            Text(
                text = text,
                color = Color.Transparent,
                style = TextStyle(
                    shadow = Shadow(Color(0xFFFF00FF), Offset.Zero, blur)
                )
            )
        }
        // Top solid layer
        Text(text = text, color = Color.White)
    }
}
```
- **Compose Limitation**: Like React Native, `TextStyle` only accepts a single `Shadow`.
- **Workaround**: Stack multiple transparent `Text` composables inside a `Box`, each casting a shadow of varying size, topped by the solid white core text.

## Do's and Don'ts
- **DO**: Italicize fonts to give a sense of speed and forward momentum.
- **DON'T**: Use standard, subtle box shadows. If it casts a shadow, it must cast a neon glow instead.
