---
name: high-contrast
description: Web and App implementation guide for High Contrast Design. Trigger when user wants accessibility-focused design, extreme legibility, or stark visual impact.
---

# High Contrast Design

> "Maximum legibility. Stark, powerful, and universally accessible."

## Core Principles
1. **WCAG AAA Compliance**: Every color pairing must exceed a 7:1 contrast ratio.
2. **Clear Boundaries**: Interactive elements have highly visible borders and focus states.
3. **No Ambiguity**: Avoid subtle greys, low-opacity text, or purely decorative elements that distract from the core content.

## Visual DNA
- **Colors**: **Industrial Chic** (Black and White) or **Modern Editorial**. Often uses a single, highly luminous accent color (like pure Yellow `#FFFF00` or Cyan `#00FFFF`) against black.
- **Typography**: Highly legible, robust sans-serifs (`Atkinson Hyperlegible`, `Inter`, `Roboto`). Large base font sizes (18px+).
- **Styling**: Solid 2px borders around cards and buttons. Avoid drop shadows as they reduce edge clarity.

## Web Implementation
- Focus heavily on focus states (`:focus-visible`) and clear active states.
- **CSS Example**:
```css
:root {
  --hc-bg: #ffffff;
  --hc-text: #000000;
  --hc-accent: #0000FF; /* Pure blue */
  --hc-focus: #FF00FF; /* High visibility focus ring */
}

body {
  background-color: var(--hc-bg);
  color: var(--hc-text);
  font-family: 'Atkinson Hyperlegible', sans-serif;
  font-size: 18px; /* Larger default */
}

.hc-card {
  background-color: #ffffff;
  border: 3px solid #000000; /* Unmissable boundary */
  padding: 32px;
  border-radius: 8px;
}

.hc-btn {
  background-color: var(--hc-accent);
  color: #ffffff;
  border: 3px solid transparent; /* Reserve space for focus */
  border-radius: 4px;
  padding: 16px 32px;
  font-weight: 700;
  font-size: 1.1rem;
  cursor: pointer;
}

/* Crucial for high contrast / accessibility */
.hc-btn:focus-visible, a:focus-visible {
  outline: 4px solid var(--hc-focus);
  outline-offset: 4px;
}

a {
  color: var(--hc-accent);
  text-decoration: underline;
  text-decoration-thickness: 2px;
}
```

## App Implementation

### SwiftUI
```swift
struct HighContrastView: View {
    var body: some View {
        VStack(spacing: 32) {
            // High Contrast Card
            VStack(alignment: .leading, spacing: 16) {
                Text("Maximum Legibility")
                    .font(.custom("Atkinson Hyperlegible", size: 24))
                    .fontWeight(.bold)
                    .foregroundColor(.black)
                
                Text("Content is king. Borders are stark. Contrast ratios exceed 7:1.")
                    .font(.custom("Atkinson Hyperlegible", size: 18))
                    .foregroundColor(.black)
            }
            .padding(32)
            .background(Color.white)
            .overlay(
                RoundedRectangle(cornerRadius: 8)
                    .stroke(Color.black, lineWidth: 3)
            )
            
            // High Contrast Action Button
            Button(action: {}) {
                Text("CONFIRM ACTION")
                    .font(.custom("Atkinson Hyperlegible", size: 18))
                    .fontWeight(.black)
                    .foregroundColor(.white)
                    .padding(.vertical, 16)
                    .padding(.horizontal, 32)
                    .background(Color.blue) // Must be a high-contrast blue, e.g., #0000FF
                    .cornerRadius(4)
            }
        }
        .padding()
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(Color.white)
    }
}
```
- Rely on thick `.stroke(Color.black, lineWidth: 3)` overlays.
- Ensure text is pure `.black` on pure `.white`. Do not use `.secondary` colors if they drop below a 7:1 contrast ratio.
- Use fonts specifically designed for legibility, like Atkinson Hyperlegible.

### Flutter
```dart
class HighContrastScreen extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.white,
      body: Center(
        child: Padding(
          padding: const EdgeInsets.all(24.0),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              // High Contrast Card
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(32),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(color: Colors.black, width: 3), // Unmissable boundary
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: const [
                    Text('Maximum Legibility', 
                      style: TextStyle(fontFamily: 'Atkinson', fontSize: 24, fontWeight: FontWeight.bold, color: Colors.black)),
                    SizedBox(height: 16),
                    Text('Content is king. Borders are stark. Contrast ratios exceed 7:1.', 
                      style: TextStyle(fontFamily: 'Atkinson', fontSize: 18, color: Colors.black)),
                  ],
                ),
              ),
              const SizedBox(height: 32),
              
              // High Contrast Button
              ElevatedButton(
                onPressed: () {},
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFF0000FF), // Pure blue
                  foregroundColor: Colors.white,
                  padding: const EdgeInsets.symmetric(horizontal: 32, vertical: 16),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(4)),
                  elevation: 0, // No shadows
                ),
                child: const Text('CONFIRM ACTION', 
                  style: TextStyle(fontFamily: 'Atkinson', fontSize: 18, fontWeight: FontWeight.w900)),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
```
- Disable `elevation` on buttons; shadows blur the edges and reduce contrast.
- Use `Border.all(color: Colors.black, width: 3)` on containers to explicitly define spatial boundaries for users with low vision.

### React Native
```jsx
const HighContrastScreen = () => {
  return (
    <View style={{ flex: 1, backgroundColor: '#FFFFFF', padding: 24, justifyContent: 'center' }}>
      
      {/* High Contrast Card */}
      <View style={{
        backgroundColor: '#FFFFFF',
        borderColor: '#000000',
        borderWidth: 3,
        borderRadius: 8,
        padding: 32,
        marginBottom: 32
      }}>
        <Text style={{ fontFamily: 'Atkinson-Bold', fontSize: 24, color: '#000000', marginBottom: 16 }}>
          Maximum Legibility
        </Text>
        <Text style={{ fontFamily: 'Atkinson-Regular', fontSize: 18, color: '#000000' }}>
          Content is king. Borders are stark. Contrast ratios exceed 7:1.
        </Text>
      </View>

      {/* High Contrast Button */}
      <TouchableOpacity style={{
        backgroundColor: '#0000FF',
        paddingVertical: 16,
        paddingHorizontal: 32,
        borderRadius: 4,
        alignItems: 'center'
      }}>
        <Text style={{ fontFamily: 'Atkinson-Bold', fontSize: 18, color: '#FFFFFF', fontWeight: '900' }}>
          CONFIRM ACTION
        </Text>
      </TouchableOpacity>
      
    </View>
  );
};
```
- In React Native, accessibility relies heavily on high contrast. Ensure `borderWidth: 3` and explicit pure `#000000` text colors.
- Make sure to use accessible `<TouchableOpacity>` areas (minimum 48x48 padding for hit slop).

### Jetpack Compose
```kotlin
@Composable
fun HighContrastScreen() {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(Color.White)
            .padding(24.dp),
        verticalArrangement = Arrangement.Center
    ) {
        // High Contrast Card
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .background(Color.White, RoundedCornerShape(8.dp))
                .border(3.dp, Color.Black, RoundedCornerShape(8.dp))
                .padding(32.dp)
        ) {
            Column {
                Text(
                    text = "Maximum Legibility",
                    fontSize = 24.sp,
                    fontWeight = FontWeight.Bold,
                    color = Color.Black
                )
                Spacer(Modifier.height(16.dp))
                Text(
                    text = "Content is king. Borders are stark. Contrast ratios exceed 7:1.",
                    fontSize = 18.sp,
                    color = Color.Black
                )
            }
        }
        
        Spacer(Modifier.height(32.dp))
        
        // High Contrast Button
        Button(
            onClick = { },
            colors = ButtonDefaults.buttonColors(
                containerColor = Color(0xFF0000FF),
                contentColor = Color.White
            ),
            shape = RoundedCornerShape(4.dp),
            elevation = null, // Disable shadows for stark look
            modifier = Modifier.fillMaxWidth().height(56.dp)
        ) {
            Text("CONFIRM ACTION", fontSize = 18.sp, fontWeight = FontWeight.Black)
        }
    }
}
```
- Use `Modifier.border(3.dp, Color.Black)` around containers.
- Disable button elevations (`elevation = null`) to keep the design perfectly flat and sharp.

## Do's and Don'ts
- **DO**: Run your colors through a contrast checker. If it's below 7:1, adjust it.
- **DON'T**: Rely on color alone to convey meaning (e.g., don't just make an error state red; make it red AND add an error icon AND bold the text).
