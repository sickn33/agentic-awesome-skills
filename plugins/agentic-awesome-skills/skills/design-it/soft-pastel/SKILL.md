---
name: soft-pastel
description: Web and App implementation guide for Soft Pastel Design. Trigger when user wants gentle colors, calming UI, baby/lifestyle branding, or low-contrast aesthetics.
date_added: "2026-06-17"
risk: safe
source: self
source_type: self
---

# Soft Pastel Design

> "Calm, airy, and gentle. A low-stress interface built on washed-out, cheerful hues."


## When to Use
Use this sub-style when the user's request matches the aesthetic described above. This is a child reference of the `design-it` skill and is not meant to be triggered directly.

## Core Principles
1. **Desaturated, High-Lightness Colors**: Every color is mixed with a heavy amount of white.
2. **Soft, Rounded Edges**: Border radii are large and friendly.
3. **Airy Spacing**: Generous whitespace prevents the soft colors from feeling muddy or crowded.

## Visual DNA
- **Colors**: Mint green, baby blue, blush pink, lavender, and buttercream yellow. Use a warm, slightly off-white background (e.g., `#FFFBF7`) rather than clinical `#FFFFFF`.
- **Typography**: Soft, rounded sans-serifs (`Quicksand`, `Nunito`) or elegant, low-contrast serifs. Avoid aggressive, ultra-bold fonts.
- **Shadows**: Very soft, large-spread shadows, often tinted with the pastel color rather than black.

## Web Implementation
- **CSS Example**:
```css
:root {
  --pastel-bg: #FFFBF7;
  --pastel-pink: #FFD1DC;
  --pastel-blue: #AEC6CF;
  --pastel-green: #B7E4C7;
  --pastel-text: #4A4A4A; /* Soft dark grey, NOT pure black */
}

body {
  background-color: var(--pastel-bg);
  color: var(--pastel-text);
  font-family: 'Nunito', sans-serif;
  line-height: 1.6;
}

.pastel-card {
  background-color: #ffffff;
  border-radius: 24px;
  padding: 40px;
  /* Tinted, very soft shadow */
  box-shadow: 0 20px 40px rgba(174, 198, 207, 0.15); 
}

.pastel-pill {
  background-color: var(--pastel-pink);
  color: #a05a6c; /* Darker version of the pink for contrast */
  border-radius: 50px;
  padding: 8px 24px;
  font-weight: 700;
  display: inline-block;
}

.pastel-btn {
  background-color: var(--pastel-blue);
  color: #2b5563; /* Darker text */
  border: none;
  border-radius: 12px;
  padding: 16px 32px;
  transition: transform 0.2s;
}
.pastel-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 10px 20px rgba(174, 198, 207, 0.4);
}
```

## App Implementation

### SwiftUI
```swift
struct SoftPastelView: View {
    // Pastel Palette
    let bg = Color(hex: "FFFBF7")
    let pink = Color(hex: "FFD1DC")
    let blue = Color(hex: "AEC6CF")
    let textDark = Color(hex: "4A4A4A")
    
    var body: some View {
        ScrollView {
            VStack(spacing: 32) {
                // Pastel Card
                VStack(alignment: .leading, spacing: 16) {
                    Text("Calm & Airy")
                        .font(.custom("Nunito-Bold", size: 28))
                        .foregroundColor(textDark)
                    
                    Text("Generous whitespace and soft corners prevent the desaturated colors from feeling muddy.")
                        .font(.custom("Nunito-Regular", size: 16))
                        .foregroundColor(textDark.opacity(0.8))
                        .lineSpacing(6)
                }
                .padding(40)
                .frame(maxWidth: .infinity, alignment: .leading)
                .background(Color.white)
                .cornerRadius(32) // Soft, large radius
                // Tinted pastel shadow instead of black/gray
                .shadow(color: blue.opacity(0.2), radius: 30, y: 15)
                
                // Pastel Button
                Button(action: {}) {
                    Text("Gentle Action")
                        .font(.custom("Nunito-Bold", size: 18))
                        .foregroundColor(Color(hex: "2B5563")) // Darker contrast of the blue
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 20)
                        .background(blue)
                        .cornerRadius(20)
                }
            }
            .padding(24)
        }
        .background(bg.ignoresSafeArea())
    }
}
```
- A custom font like Nunito or Quicksand is practically required. System fonts are often too rigid.
- The `shadow(color:)` must be tinted with one of your pastel palette colors, never black or gray.
- Corner radii should be very large (20-32).

### Flutter
```dart
class SoftPastelScreen extends StatelessWidget {
  final Color bg = const Color(0xFFFFFBF7);
  final Color pink = const Color(0xFFFFD1DC);
  final Color blue = const Color(0xFFAEC6CF);
  final Color textDark = const Color(0xFF4A4A4A);

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: bg,
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(24.0),
        child: Column(
          children: [
            // Pastel Card
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(40),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(32), // Soft edges
                boxShadow: [
                  // Tinted shadow
                  BoxShadow(color: blue.withOpacity(0.2), blurRadius: 30, offset: const Offset(0, 15))
                ],
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('Calm & Airy', style: TextStyle(fontFamily: 'Nunito', fontSize: 28, fontWeight: FontWeight.bold, color: textDark)),
                  const SizedBox(height: 16),
                  Text('Generous whitespace and soft corners.', style: TextStyle(fontFamily: 'Nunito', fontSize: 16, height: 1.6, color: textDark.withOpacity(0.8))),
                ],
              ),
            ),
            const SizedBox(height: 32),
            
            // Pastel Button
            ElevatedButton(
              onPressed: () {},
              style: ElevatedButton.styleFrom(
                backgroundColor: blue,
                foregroundColor: const Color(0xFF2B5563), // Darker text for contrast
                minimumSize: const Size(double.infinity, 60),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
                elevation: 0, // Remove default harsh shadow
              ),
              child: const Text('Gentle Action', style: TextStyle(fontFamily: 'Nunito', fontSize: 18, fontWeight: FontWeight.bold)),
            ),
          ],
        ),
      ),
    );
  }
}
```
- Disable `elevation` on Flutter buttons and cards if you want to apply custom tinted drop shadows. Default elevations cast black shadows.

### React Native
```jsx
const SoftPastelScreen = () => {
  const colors = {
    bg: '#FFFBF7',
    blue: '#AEC6CF',
    textDark: '#4A4A4A'
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.bg, padding: 24 }}>
      
      {/* Pastel Card */}
      <View style={{
        backgroundColor: '#FFFFFF',
        borderRadius: 32,
        padding: 40,
        marginBottom: 32,
        // iOS tinted shadow
        shadowColor: colors.blue, shadowOffset: { width: 0, height: 15 },
        shadowOpacity: 0.2, shadowRadius: 30,
        // Android tinted shadow (Requires Android 9+)
        elevation: 10, shadowColor: colors.blue,
      }}>
        <Text style={{ fontFamily: 'Nunito-Bold', fontSize: 28, color: colors.textDark, marginBottom: 16 }}>
          Calm & Airy
        </Text>
        <Text style={{ fontFamily: 'Nunito-Regular', fontSize: 16, lineHeight: 26, color: colors.textDark, opacity: 0.8 }}>
          Generous whitespace and soft corners prevent the desaturated colors from feeling muddy.
        </Text>
      </View>

      {/* Pastel Button */}
      <TouchableOpacity style={{
        backgroundColor: colors.blue,
        borderRadius: 20,
        paddingVertical: 20,
        alignItems: 'center'
      }}>
        <Text style={{ fontFamily: 'Nunito-Bold', fontSize: 18, color: '#2B5563' }}>
          Gentle Action
        </Text>
      </TouchableOpacity>
      
    </ScrollView>
  );
};
```
- Make sure you are using a soft, non-pure-white background (`#FFFBF7`) so that pure `#FFFFFF` cards pop nicely against it without harsh borders.
- Tinted shadows work on Android 9+ via `shadowColor` combined with `elevation`.

### Jetpack Compose
```kotlin
@Composable
fun SoftPastelScreen() {
    val bg = Color(0xFFFFFBF7)
    val blue = Color(0xFFAEC6CF)
    val textDark = Color(0xFF4A4A4A)

    Column(
        modifier = Modifier.fillMaxSize().background(bg).verticalScroll(rememberScrollState()).padding(24.dp)
    ) {
        // Pastel Card
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .shadow(
                    elevation = 20.dp, 
                    shape = RoundedCornerShape(32.dp), 
                    ambientColor = blue, // Tinted shadow
                    spotColor = blue
                )
                .background(Color.White, RoundedCornerShape(32.dp))
                .padding(40.dp)
        ) {
            Column {
                Text(
                    text = "Calm & Airy",
                    fontSize = 28.sp,
                    fontWeight = FontWeight.Bold,
                    color = textDark,
                    fontFamily = FontFamily.SansSerif // Replace with Nunito
                )
                Spacer(Modifier.height(16.dp))
                Text(
                    text = "Generous whitespace and soft corners.",
                    fontSize = 16.sp,
                    lineHeight = 26.sp,
                    color = textDark.copy(alpha = 0.8f),
                    fontFamily = FontFamily.SansSerif
                )
            }
        }
        
        Spacer(Modifier.height(32.dp))
        
        // Pastel Button
        Button(
            onClick = { },
            colors = ButtonDefaults.buttonColors(containerColor = blue, contentColor = Color(0xFF2B5563)),
            shape = RoundedCornerShape(20.dp),
            modifier = Modifier.fillMaxWidth().height(60.dp),
            elevation = null
        ) {
            Text("Gentle Action", fontSize = 18.sp, fontWeight = FontWeight.Bold)
        }
    }
}
```
- The `shadow` modifier in Compose takes `ambientColor` and `spotColor`. Set both to your pastel accent color to achieve the soft tinted glow.

## Do's and Don'ts
- **DO**: Use illustrative assets that match the pastel vibe (flat vectors, soft gradients).
- **DON'T**: Use stark black borders, sharp corners, or high-saturation primary colors.

## Limitations
- This is a styling reference and does not replace environment-specific validation, accessibility testing, or expert review.
- Ensure appropriate contrast ratios and responsive behaviors are verified separately.
