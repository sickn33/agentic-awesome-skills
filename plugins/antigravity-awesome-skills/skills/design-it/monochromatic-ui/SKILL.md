---
name: monochromatic-ui
description: Web and App implementation guide for Monochromatic UI. Trigger when user wants a single-color palette, high elegance, and strict color discipline.
date_added: "2026-06-17"
risk: safe
source: self
source_type: self
---

# Monochromatic UI

> "Elegance through constraint. A single hue, explored through all its tints, tones, and shades."


## When to Use
Use this sub-style when the user's request matches the aesthetic described above. This is a child reference of the `design-it` skill and is not meant to be triggered directly.

## Core Principles
1. **Single Hue**: Choose one base color (e.g., deep blue). The entire UI is built using lighter (tints) and darker (shades) versions of that exact hue.
2. **High Contrast for Legibility**: The darkest shade and the lightest tint must have enough contrast to pass accessibility standards when placed together.
3. **Texture over Color**: Since color is restricted, use subtle textures, patterns, or varying opacities to differentiate sections.

## Visual DNA
- **Colors**: **Monochromatic Brown** or pick one dominant hue from **Earth-Grounded Elegance** and extrapolate it.
- **Typography**: Clean and unobtrusive. The layout relies heavily on font weights to establish hierarchy since color cannot.
- **Shadows**: Shadows must be tinted with the base hue, never pure black.

## Web Implementation
- Use HSL (Hue, Saturation, Lightness) heavily in CSS to make building the palette easy.
- **CSS Example**:
```css
:root {
  /* Base Hue: Deep Blue (210) */
  --mono-900: hsl(210, 80%, 10%); /* Very dark */
  --mono-700: hsl(210, 70%, 30%); /* Dark */
  --mono-500: hsl(210, 60%, 50%); /* Base */
  --mono-300: hsl(210, 50%, 80%); /* Light */
  --mono-100: hsl(210, 40%, 95%); /* Very light background */
}

body {
  background-color: var(--mono-100);
  color: var(--mono-900);
  font-family: 'Inter', sans-serif;
}

.mono-card {
  background-color: #ffffff; /* Or mono-100 */
  border: 1px solid var(--mono-300);
  border-radius: 8px;
  padding: 32px;
  /* Tinted shadow */
  box-shadow: 0 10px 25px hsla(210, 80%, 10%, 0.05);
}

.mono-btn {
  background-color: var(--mono-500);
  color: #ffffff;
  border: none;
  border-radius: 4px;
  padding: 12px 24px;
  transition: background-color 0.2s;
}

.mono-btn:hover {
  background-color: var(--mono-700);
}

.mono-subtext {
  color: var(--mono-500); /* Use mid-tones for secondary text */
  font-weight: 500;
}
```

## App Implementation

### SwiftUI
```swift
struct MonochromaticView: View {
    // Base Hue: Deep Blue (210 in 360-degree HSB/HSL)
    // In SwiftUI, hue is 0.0 to 1.0 (210/360 = 0.58)
    let mono900 = Color(hue: 0.58, saturation: 0.80, brightness: 0.10)
    let mono700 = Color(hue: 0.58, saturation: 0.70, brightness: 0.30)
    let mono500 = Color(hue: 0.58, saturation: 0.60, brightness: 0.50)
    let mono300 = Color(hue: 0.58, saturation: 0.50, brightness: 0.80)
    let mono100 = Color(hue: 0.58, saturation: 0.40, brightness: 0.95)
    
    var body: some View {
        VStack(spacing: 24) {
            // Card
            VStack(alignment: .leading, spacing: 12) {
                Text("Monochromatic Elegance")
                    .font(.title2).fontWeight(.semibold)
                    .foregroundColor(mono900)
                
                Text("Using only variations in saturation and brightness of a single hue.")
                    .foregroundColor(mono500)
            }
            .padding(32)
            .background(Color.white)
            .border(mono300, width: 1)
            .shadow(color: mono900.opacity(0.1), radius: 15, y: 5) // Tinted shadow
            
            // Button
            Button(action: {}) {
                Text("Primary Action")
                    .fontWeight(.bold)
                    .foregroundColor(.white)
                    .frame(maxWidth: .infinity)
                    .padding()
                    .background(mono500)
                    .cornerRadius(8)
            }
        }
        .padding()
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(mono100)
    }
}
```
- Define your colors using `Color(hue: saturation: brightness:)`. This ensures math-perfect monochromatic harmony.
- *Always* tint your drop shadows with your `mono900` color. Pure black shadows look dirty in a strict monochromatic UI.

### Flutter
```dart
class MonochromaticScreen extends StatelessWidget {
  // Base Hue: Deep Blue (210)
  // Flutter HSVColor uses Hue 0-360, Saturation 0.0-1.0, Value 0.0-1.0
  final Color mono900 = const HSVColor.fromAHSV(1.0, 210, 0.80, 0.10).toColor();
  final Color mono500 = const HSVColor.fromAHSV(1.0, 210, 0.60, 0.50).toColor();
  final Color mono300 = const HSVColor.fromAHSV(1.0, 210, 0.50, 0.80).toColor();
  final Color mono100 = const HSVColor.fromAHSV(1.0, 210, 0.40, 0.95).toColor();

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: mono100,
      body: Center(
        child: Padding(
          padding: const EdgeInsets.all(24.0),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              // Card
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(32),
                decoration: BoxDecoration(
                  color: Colors.white,
                  border: Border.all(color: mono300),
                  borderRadius: BorderRadius.circular(8),
                  boxShadow: [
                    BoxShadow(color: mono900.withOpacity(0.1), blurRadius: 15, offset: const Offset(0, 5))
                  ],
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('Monochromatic', style: TextStyle(fontSize: 24, fontWeight: FontWeight.w600, color: mono900)),
                    const SizedBox(height: 12),
                    Text('Variations of a single hue.', style: TextStyle(fontSize: 16, color: mono500)),
                  ],
                ),
              ),
              const SizedBox(height: 24),
              // Button
              ElevatedButton(
                onPressed: () {},
                style: ElevatedButton.styleFrom(
                  backgroundColor: mono500,
                  foregroundColor: Colors.white,
                  minimumSize: const Size(double.infinity, 56),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                  elevation: 0,
                ),
                child: const Text('Primary Action', style: TextStyle(fontWeight: FontWeight.bold)),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
```
- Flutter's `HSVColor.fromAHSV()` is the best way to explicitly code a monochromatic palette without guessing hex codes.

### React Native
```jsx
// Base Hue: Deep Blue (210)
const theme = {
  mono900: 'hsl(210, 80%, 10%)',
  mono700: 'hsl(210, 70%, 30%)',
  mono500: 'hsl(210, 60%, 50%)',
  mono300: 'hsl(210, 50%, 80%)',
  mono100: 'hsl(210, 40%, 95%)',
};

const MonochromaticScreen = () => {
  return (
    <View style={{ flex: 1, backgroundColor: theme.mono100, padding: 24, justifyContent: 'center' }}>
      
      <View style={{
        backgroundColor: '#FFFFFF',
        borderColor: theme.mono300,
        borderWidth: 1,
        borderRadius: 8,
        padding: 32,
        marginBottom: 24,
        // Tinted shadow (iOS)
        shadowColor: theme.mono900, shadowOffset: { width: 0, height: 5 },
        shadowOpacity: 0.1, shadowRadius: 15,
      }}>
        <Text style={{ fontSize: 24, fontWeight: '600', color: theme.mono900, marginBottom: 12 }}>
          Monochromatic
        </Text>
        <Text style={{ fontSize: 16, color: theme.mono500 }}>
          Using HSL strings in React Native makes palette generation trivial.
        </Text>
      </View>

      <TouchableOpacity style={{
        backgroundColor: theme.mono500,
        padding: 16,
        borderRadius: 8,
        alignItems: 'center'
      }}>
        <Text style={{ fontWeight: 'bold', color: '#FFFFFF', fontSize: 16 }}>
          Primary Action
        </Text>
      </TouchableOpacity>
      
    </View>
  );
};
```
- React Native's StyleSheet accepts CSS `hsl()` strings natively. Use them! It makes debugging and tweaking a monochromatic palette a million times easier than using hex codes.

### Jetpack Compose
```kotlin
@Composable
fun MonochromaticScreen() {
    // Base Hue: Deep Blue (210)
    // Compose Color.hsv requires Hue 0-360f, Saturation 0-1f, Value 0-1f
    val mono900 = Color.hsv(210f, 0.80f, 0.10f)
    val mono500 = Color.hsv(210f, 0.60f, 0.50f)
    val mono300 = Color.hsv(210f, 0.50f, 0.80f)
    val mono100 = Color.hsv(210f, 0.40f, 0.95f)

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(mono100)
            .padding(24.dp),
        verticalArrangement = Arrangement.Center
    ) {
        // Card
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .shadow(15.dp, RoundedCornerShape(8.dp), spotColor = mono900.copy(alpha = 0.2f))
                .background(Color.White, RoundedCornerShape(8.dp))
                .border(1.dp, mono300, RoundedCornerShape(8.dp))
                .padding(32.dp)
        ) {
            Column {
                Text("Monochromatic", fontSize = 24.sp, fontWeight = FontWeight.SemiBold, color = mono900)
                Spacer(Modifier.height(12.dp))
                Text("Strictly enforced hue discipline.", color = mono500)
            }
        }
        
        Spacer(Modifier.height(24.dp))
        
        // Button
        Button(
            onClick = { },
            colors = ButtonDefaults.buttonColors(containerColor = mono500, contentColor = Color.White),
            shape = RoundedCornerShape(8.dp),
            modifier = Modifier.fillMaxWidth().height(56.dp)
        ) {
            Text("Primary Action", fontWeight = FontWeight.Bold)
        }
    }
}
```
- Use `Color.hsv()` to define the palette.
- Set the `spotColor` in your `Modifier.shadow` to `mono900` to keep the shadows from looking muddy or disjointed from the design system.

## Do's and Don'ts
- **DO**: Use pure white or pure black as absolute extremes if needed for text legibility.
- **DON'T**: Sneak in an accent color. If you add a red error button to a blue monochromatic UI, it immediately breaks the aesthetic and becomes "duotone" or standard UI. Find a way to signify errors using bold text or dark shades of the base hue.

## Limitations
- This is a styling reference and does not replace environment-specific validation, accessibility testing, or expert review.
- Ensure appropriate contrast ratios and responsive behaviors are verified separately.
