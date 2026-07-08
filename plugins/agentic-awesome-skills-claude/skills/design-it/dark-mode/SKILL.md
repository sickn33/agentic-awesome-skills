---
name: dark-mode
description: Web and App implementation guide for Dark Mode Design. Trigger when user wants dark surfaces, reduced eye strain, and premium sleek aesthetics.
date_added: "2026-06-17"
risk: safe
source: self
source_type: self
---

# Dark Mode Design

> "Not just inverted colors. A carefully constructed hierarchy of light on dark."


## When to Use
Use this sub-style when the user's request matches the aesthetic described above. This is a child reference of the `design-it` skill and is not meant to be triggered directly.

## Core Principles
1. **Never Pure Black**: True `#000000` causes smearing on OLED screens and extreme eye strain with white text. Use dark greys (e.g., `#121212` or `#0A0A0A`).
2. **Elevation via Lightness**: In light mode, shadows show elevation. In dark mode, shadows are invisible, so elevated surfaces must be lighter than the background.
3. **Desaturated Accents**: Saturated colors vibrate painfully against dark backgrounds. Tone down the saturation of brand colors.

## Visual DNA
- **Colors**: **Midnight Luxury** or **Minimalist Slate** (inverted). Background `#121212`. Elevated cards `#1E1E1E`, `#252525`. Primary text `#E1E1E1` (not `#FFFFFF`).
- **Typography**: Standard highly readable sans-serifs, but often dropped down one font weight compared to light mode, as light text on dark backgrounds appears optically thicker.
- **Shadows**: Pure black shadows, but with much lower opacity, mostly to separate slightly different shades of grey.

## Web Implementation
- **CSS Example**:
```css
:root {
  --bg-base: #121212;
  --bg-elevated-1: #1E1E1E;
  --bg-elevated-2: #242424;
  --text-high-emphasis: rgba(255, 255, 255, 0.87);
  --text-medium-emphasis: rgba(255, 255, 255, 0.60);
  
  /* Accent color: Desaturated purple instead of bright purple */
  --accent-color: #BB86FC; 
}

body {
  background-color: var(--bg-base);
  color: var(--text-high-emphasis);
  font-weight: 300; /* Thinner weight for dark mode */
}

.dark-card {
  background-color: var(--bg-elevated-1);
  border-radius: 8px;
  padding: 24px;
  
  /* Very subtle border can help separate dark surfaces */
  border: 1px solid rgba(255, 255, 255, 0.05);
}

.dark-card:hover {
  /* On hover, the element moves closer to the user, so it gets lighter */
  background-color: var(--bg-elevated-2);
}

.dark-btn {
  background-color: var(--accent-color);
  color: #000; /* Dark text on light accent is highly readable */
  font-weight: 600;
  border: none;
  padding: 12px 24px;
  border-radius: 4px;
}
```

## App Implementation

### SwiftUI
```swift
struct DarkModeView: View {
    // Force Dark Mode on this specific view (or use system settings)
    @Environment(\.colorScheme) var colorScheme
    
    var body: some View {
        ScrollView {
            VStack(spacing: 20) {
                // Primary elevated card
                VStack(alignment: .leading, spacing: 12) {
                    Text("Elevation via Lightness")
                        .font(.headline)
                        .foregroundColor(.primary) // Auto-adapts
                    Text("In dark mode, elevated surfaces are lighter grey, not shadowed.")
                        .font(.subheadline)
                        .foregroundColor(.secondary) // Auto-adapts
                }
                .padding()
                .frame(maxWidth: .infinity, alignment: .leading)
                // Use native semantic colors. .secondarySystemBackground is lighter than .systemBackground
                .background(Color(UIColor.secondarySystemBackground))
                .cornerRadius(12)
                
                // Desaturated Accent Button
                Button(action: {}) {
                    Text("Desaturated Accent")
                        .fontWeight(.semibold)
                        .foregroundColor(.black) // Dark text on light accent
                        .padding()
                        .frame(maxWidth: .infinity)
                        .background(Color(red: 0.73, green: 0.52, blue: 0.98)) // #BB86FC (Desaturated purple)
                        .cornerRadius(8)
                }
            }
            .padding()
        }
        // #121212 is the standard dark mode background, which systemBackground maps to closely
        .background(Color(UIColor.systemBackground))
    }
}
// .preferredColorScheme(.dark) to force
```
- **Rely on Semantics**: SwiftUI's `Color.primary`, `Color.secondary`, `Color(UIColor.systemBackground)` and `Color(UIColor.secondarySystemBackground)` handle perfect dark mode transitions automatically.
- Avoid forcing explicit hex codes for backgrounds unless you are building a custom-themed app.

### Flutter
```dart
import 'package:flutter/material.dart';

class DarkModeApp extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      // Configure the Dark Theme
      themeMode: ThemeMode.dark,
      darkTheme: ThemeData.dark().copyWith(
        scaffoldBackgroundColor: const Color(0xFF121212), // Standard dark background
        cardColor: const Color(0xFF1E1E1E), // Elevated surface
        colorScheme: const ColorScheme.dark().copyWith(
          primary: const Color(0xFFBB86FC), // Desaturated accent
          onPrimary: Colors.black, // Dark text on light accent
          surface: const Color(0xFF1E1E1E),
        ),
      ),
      home: Scaffold(
        appBar: AppBar(title: const Text('Dark Mode', style: TextStyle(color: Colors.white70))),
        body: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            Card(
              elevation: 0, // Shadows don't show well anyway
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(12),
                side: BorderSide(color: Colors.white.withOpacity(0.05)), // Subtle border
              ),
              child: const Padding(
                padding: EdgeInsets.all(16.0),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('Elevation via Lightness', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
                    SizedBox(height: 8),
                    Text('Elevated surfaces use lighter greys.', style: TextStyle(color: Colors.white60)),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 20),
            ElevatedButton(
              onPressed: () {},
              child: const Text('Desaturated Accent'),
            ),
          ],
        ),
      ),
    );
  }
}
```
- When using `ThemeData.dark()`, actively override `scaffoldBackgroundColor` to `#121212` and `cardColor` to `#1E1E1E`.
- Ensure your `colorScheme.onPrimary` is black so text is readable when placed on top of your desaturated primary accent button.

### React Native
```jsx
import { useColorScheme } from 'react-native';

const DarkModeScreen = () => {
  const isDark = useColorScheme() === 'dark';
  
  // Custom dark theme dictionary
  const theme = {
    bgBase: isDark ? '#121212' : '#FFFFFF',
    bgElevated: isDark ? '#1E1E1E' : '#F5F5F5',
    textHigh: isDark ? 'rgba(255, 255, 255, 0.87)' : 'rgba(0, 0, 0, 0.87)',
    textMedium: isDark ? 'rgba(255, 255, 255, 0.60)' : 'rgba(0, 0, 0, 0.60)',
    accent: isDark ? '#BB86FC' : '#6200EE', // Desaturated for dark, vibrant for light
    onAccent: isDark ? '#000' : '#FFF',
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.bgBase, padding: 16 }}>
      <View style={{
        backgroundColor: theme.bgElevated,
        padding: 24,
        borderRadius: 12,
        borderWidth: isDark ? 1 : 0,
        borderColor: 'rgba(255,255,255,0.05)',
        marginBottom: 20
      }}>
        <Text style={{ color: theme.textHigh, fontSize: 18, fontWeight: 'bold', marginBottom: 8 }}>
          Elevation via Lightness
        </Text>
        <Text style={{ color: theme.textMedium }}>
          Elevated surfaces use lighter greys.
        </Text>
      </View>

      <TouchableOpacity style={{
        backgroundColor: theme.accent,
        padding: 16,
        borderRadius: 8,
        alignItems: 'center'
      }}>
        <Text style={{ color: theme.onAccent, fontWeight: 'bold' }}>Desaturated Accent</Text>
      </TouchableOpacity>
    </View>
  );
};
```
- Rely on `useColorScheme()` hook from React Native.
- Define a strict dictionary of your color tokens. Notice how `theme.accent` shifts from a vibrant purple (`#6200EE`) in light mode to a desaturated pastel purple (`#BB86FC`) in dark mode.

### Jetpack Compose
```kotlin
@Composable
fun DarkModeScreen() {
    // Typically this logic lives in your Theme.kt
    val darkColors = darkColorScheme(
        background = Color(0xFF121212),
        surface = Color(0xFF1E1E1E),
        primary = Color(0xFFBB86FC),
        onPrimary = Color.Black,
        onBackground = Color.White.copy(alpha = 0.87f),
        onSurface = Color.White.copy(alpha = 0.87f)
    )

    MaterialTheme(colorScheme = darkColors) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .background(MaterialTheme.colorScheme.background)
                .padding(16.dp)
        ) {
            Card(
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                shape = RoundedCornerShape(12.dp),
                border = BorderStroke(1.dp, Color.White.copy(alpha = 0.05f))
            ) {
                Column(modifier = Modifier.padding(24.dp)) {
                    Text("Elevation via Lightness", 
                        style = MaterialTheme.typography.titleMedium, 
                        color = MaterialTheme.colorScheme.onSurface)
                    Spacer(Modifier.height(8.dp))
                    Text("Elevated surfaces use lighter greys.", 
                        style = MaterialTheme.typography.bodyMedium, 
                        color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f))
                }
            }
            
            Spacer(Modifier.height(20.dp))
            
            Button(
                onClick = {},
                colors = ButtonDefaults.buttonColors(
                    containerColor = MaterialTheme.colorScheme.primary,
                    contentColor = MaterialTheme.colorScheme.onPrimary
                ),
                modifier = Modifier.fillMaxWidth().height(50.dp)
            ) {
                Text("Desaturated Accent", fontWeight = FontWeight.Bold)
            }
        }
    }
}
```
- Material 3 handles Dark Mode semantics perfectly. Define your `darkColorScheme`.
- Use `Color(0xFF1E1E1E)` for `surface` and `Color(0xFF121212)` for `background`. Compose will automatically map these to `Card`s and Scaffolds.

## Do's and Don'ts
- **DO**: Meet WCAG contrast standards. Just because it's dark doesn't mean the text should be illegibly dim.
- **DON'T**: Use bright, highly saturated primary colors.

## Limitations
- This is a styling reference and does not replace environment-specific validation, accessibility testing, or expert review.
- Ensure appropriate contrast ratios and responsive behaviors are verified separately.
