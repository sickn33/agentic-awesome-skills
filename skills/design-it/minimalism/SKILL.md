---
name: minimalism
description: Web and App implementation guide for the Minimalism design style. Trigger when the user wants simple layouts, lots of whitespace, few colors, and clear hierarchy.
date_added: "2026-06-17"
---

# Minimalism

> "Less is more. Remove until nothing is left but the essential."

## Core Principles
1. **Extreme Whitespace**: Margins and padding should be double what you initially think is appropriate.
2. **Strict Typography**: Rely on font weights and sizes to establish hierarchy, not colors or boxes.
3. **Absence of Decor**: No borders, no drop shadows, no background textures.

## Visual DNA
- **Colors**: Best paired with **Minimalist Slate** or **Modern Editorial** palettes. Backgrounds must be absolute (pure or off-white/black).
- **Typography**: Sans-serif, geometric. (e.g., `Inter`, `Helvetica Neue`, `SF Pro`). Use extreme contrast in weights (Thin vs Black).
- **Spacing**: Use a generous baseline grid (e.g., multiples of 8px, heavily favoring 48px to 120px padding).

## Web Implementation
- Use Flexbox/Grid with large `gap` properties.
- **CSS Example**:
```css
.minimal-container {
  max-width: 800px;
  margin: 0 auto;
  padding: 120px 24px;
  background-color: var(--bg-primary);
}
.minimal-title {
  font-size: 3rem;
  font-weight: 300;
  letter-spacing: -0.02em;
  margin-bottom: 48px;
}
.minimal-btn {
  background: transparent;
  border: 1px solid var(--text-primary);
  padding: 16px 32px;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  transition: all 0.3s ease;
}
```

## App Implementation

### SwiftUI
```swift
struct MinimalView: View {
    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 48) {
                Text("Headline")
                    .font(.system(size: 34, weight: .light))
                    .tracking(-0.5)
                
                Text("Body text sits quietly with generous space around it. Let the content breathe.")
                    .font(.system(size: 17, weight: .regular))
                    .foregroundColor(.secondary)
                    .lineSpacing(6)
                
                // Minimal button — just a thin border, no fill
                Button(action: {}) {
                    Text("Continue")
                        .font(.system(size: 14, weight: .medium))
                        .tracking(1.5)
                        .textCase(.uppercase)
                        .padding(.horizontal, 32)
                        .padding(.vertical, 16)
                        .overlay(
                            RoundedRectangle(cornerRadius: 0)
                                .stroke(Color.primary, lineWidth: 1)
                        )
                }
            }
            .padding(.horizontal, 24)
            .padding(.vertical, 80)
        }
        .background(Color(.systemBackground))
    }
}
```
- Use `VStack(spacing: 40...64)` for generous separation between elements.
- Never use `.shadow()` or `Card`-like containers. Let whitespace define grouping.
- Use `Divider()` sparingly — only when two adjacent sections need separation.

### Flutter
```dart
class MinimalScreen extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.white,
      body: SingleChildScrollView(
        padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 80),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Headline',
              style: TextStyle(
                fontSize: 34,
                fontWeight: FontWeight.w300,
                letterSpacing: -0.5,
                color: Colors.black87,
              ),
            ),
            const SizedBox(height: 48),
            Text(
              'Body text sits quietly with generous space around it.',
              style: TextStyle(
                fontSize: 17,
                fontWeight: FontWeight.w400,
                height: 1.6,
                color: Colors.black54,
              ),
            ),
            const SizedBox(height: 48),
            // Minimal button — outlined, no elevation
            OutlinedButton(
              onPressed: () {},
              style: OutlinedButton.styleFrom(
                side: const BorderSide(color: Colors.black87, width: 1),
                shape: const RoundedRectangleBorder(borderRadius: BorderRadius.zero),
                padding: const EdgeInsets.symmetric(horizontal: 32, vertical: 16),
              ),
              child: Text(
                'CONTINUE',
                style: TextStyle(
                  fontSize: 14,
                  fontWeight: FontWeight.w500,
                  letterSpacing: 1.5,
                  color: Colors.black87,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
```
- Set `elevation: 0` on **all** Material widgets (`AppBar`, `Card`, `FloatingActionButton`).
- Use `SizedBox(height: 48)` or larger for vertical spacing. Avoid tight layouts.
- Override `ThemeData` to remove all default shadows: `cardTheme: CardTheme(elevation: 0)`.

### React Native
```jsx
const MinimalScreen = () => (
  <ScrollView
    style={{ flex: 1, backgroundColor: '#FFFFFF' }}
    contentContainerStyle={{ paddingHorizontal: 24, paddingVertical: 80 }}
  >
    <Text style={{
      fontSize: 34,
      fontWeight: '300',
      letterSpacing: -0.5,
      color: '#1A1A1A',
      marginBottom: 48,
    }}>
      Headline
    </Text>

    <Text style={{
      fontSize: 17,
      fontWeight: '400',
      lineHeight: 28,
      color: '#666666',
      marginBottom: 48,
    }}>
      Body text sits quietly with generous space around it.
    </Text>

    <TouchableOpacity
      style={{
        borderWidth: 1,
        borderColor: '#1A1A1A',
        paddingHorizontal: 32,
        paddingVertical: 16,
        alignSelf: 'flex-start',
      }}
      activeOpacity={0.6}
    >
      <Text style={{
        fontSize: 14,
        fontWeight: '500',
        letterSpacing: 1.5,
        color: '#1A1A1A',
        textTransform: 'uppercase',
      }}>
        Continue
      </Text>
    </TouchableOpacity>
  </ScrollView>
);
```
- Use `paddingVertical: 80` for screen-level spacing. Double what feels natural.
- Avoid all `elevation` and `shadowColor` properties. No `borderRadius` on cards.
- If using a UI library (e.g., React Native Paper), strip default elevations.

### Jetpack Compose
```kotlin
@Composable
fun MinimalScreen() {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(Color.White)
            .verticalScroll(rememberScrollState())
            .padding(horizontal = 24.dp, vertical = 80.dp)
    ) {
        Text(
            text = "Headline",
            fontSize = 34.sp,
            fontWeight = FontWeight.Light,
            letterSpacing = (-0.5).sp,
            color = Color(0xFF1A1A1A),
        )
        Spacer(modifier = Modifier.height(48.dp))
        Text(
            text = "Body text sits quietly with generous space around it.",
            fontSize = 17.sp,
            fontWeight = FontWeight.Normal,
            lineHeight = 28.sp,
            color = Color(0xFF666666),
        )
        Spacer(modifier = Modifier.height(48.dp))
        // Minimal outlined button
        OutlinedButton(
            onClick = {},
            shape = RectangleShape,
            border = BorderStroke(1.dp, Color(0xFF1A1A1A)),
            colors = ButtonDefaults.outlinedButtonColors(containerColor = Color.Transparent),
            contentPadding = PaddingValues(horizontal = 32.dp, vertical = 16.dp),
        ) {
            Text(
                text = "CONTINUE",
                fontSize = 14.sp,
                fontWeight = FontWeight.Medium,
                letterSpacing = 1.5.sp,
                color = Color(0xFF1A1A1A),
            )
        }
    }
}
```
- Set `elevation = 0.dp` on all `Card`, `TopAppBar`, and `FloatingActionButton` composables.
- Use `Spacer(modifier = Modifier.height(48.dp))` consistently for generous vertical gaps.
- Override `MaterialTheme` shape and shadow defaults to remove all depth cues.

## Do's and Don'ts
- **DO**: Focus intensely on alignment. A 1px misalignment breaks the illusion of minimalism.
- **DON'T**: Use "card" wrappers for content. Let the whitespace define the grouping.
