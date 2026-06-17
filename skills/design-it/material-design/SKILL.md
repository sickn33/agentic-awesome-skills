---
name: material-design
description: Web and App implementation guide for Material Design. Trigger when user wants Google's aesthetic, elevation, motion, and consistent components.
date_added: "2026-06-17"
---

# Material Design

> "Digital paper and ink. Interfaces built on the physical properties of stacked material."

## Core Principles
1. **Z-Axis Elevation**: Everything exists on a specific layer. Shadows communicate hierarchy and state.
2. **Meaningful Motion**: Animations are continuous, guiding the user's focus from one state to the next (e.g., ripple effects, shared element transitions).
3. **Structured Layout**: Strict adherence to an 8dp baseline grid and specific component anatomies (cards, FABs, app bars).

## Visual DNA
- **Colors**: Works excellently with **Desert Mirage** or **Minimalist Slate**. Utilize primary, secondary, surface, and error semantic mapping.
- **Typography**: `Roboto` or `Google Sans` (or equivalent clean geometric sans). Stick strictly to the Material Type Scale (H1-H6, Subtitle, Body, Caption, Overline).
- **Shapes**: Moderately rounded corners (4px to 16px).

## Web Implementation
- Do not reinvent the wheel: mimic standard Material elevations.
- **CSS Example**:
```css
.material-card {
  background: var(--bg-surface);
  border-radius: 8px;
  padding: 16px;
  /* Material Elevation 2 */
  box-shadow: 0 3px 1px -2px rgba(0,0,0,0.2), 
              0 2px 2px 0 rgba(0,0,0,0.14), 
              0 1px 5px 0 rgba(0,0,0,0.12);
  transition: box-shadow 0.28s cubic-bezier(0.4, 0, 0.2, 1);
}

.material-btn {
  text-transform: uppercase;
  font-weight: 500;
  letter-spacing: 1.25px;
  padding: 0 16px;
  height: 36px;
  border-radius: 4px;
  background: var(--cta-highlight);
  color: #fff;
  border: none;
  /* Ripple effect is usually handled via JS, but structure is key */
}
```

## App Implementation

### SwiftUI
```swift
struct MaterialCard: View {
    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Material Card")
                .font(.system(size: 20, weight: .medium))
            Text("Digital paper and ink. Shadows communicate where this surface sits.")
                .font(.system(size: 14))
                .foregroundColor(.secondary)
            HStack {
                Spacer()
                Button("ACTION") {}
                    .font(.system(size: 14, weight: .medium))
                    .foregroundColor(.accentColor)
                    .padding(.horizontal, 12)
                    .padding(.vertical, 8)
            }
        }
        .padding(16)
        .background(Color(.systemBackground))
        .cornerRadius(8)
        // Material Elevation 2 equivalent
        .shadow(color: Color.black.opacity(0.12), radius: 3, x: 0, y: 1)
        .shadow(color: Color.black.opacity(0.08), radius: 2, x: 0, y: 2)
    }
}

// Material FAB
struct MaterialFAB: View {
    var body: some View {
        Button(action: {}) {
            Image(systemName: "plus")
                .font(.system(size: 24))
                .foregroundColor(.white)
                .frame(width: 56, height: 56)
                .background(Color.accentColor)
                .cornerRadius(16)
                .shadow(color: Color.black.opacity(0.2), radius: 6, x: 0, y: 3)
                .shadow(color: Color.black.opacity(0.14), radius: 4, x: 0, y: 2)
        }
    }
}
```
- Emulate Material elevation levels by stacking multiple `.shadow()` modifiers at different blur/offset values.
- Use `.cornerRadius(8...16)` — Material Design 3 uses more rounded shapes than M2.
- Animate shadow changes using `.animation(.easeInOut(duration: 0.28))` — Material uses 280ms transitions.

### Flutter
```dart
// Flutter IS Material Design — use it natively
class MaterialScreen extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      theme: ThemeData(
        useMaterial3: true,
        colorSchemeSeed: const Color(0xFF6750A4), // Material You seed
        // Map your universal palette here
      ),
      home: Scaffold(
        appBar: AppBar(
          title: const Text('Material Design'),
          // M3 appbar elevation is 0 by default, scrolled = 3
        ),
        body: Padding(
          padding: const EdgeInsets.all(16),
          child: Card(
            elevation: 2,
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text('Material Card',
                    style: Theme.of(context).textTheme.titleLarge),
                  const SizedBox(height: 8),
                  Text('Digital paper and ink.',
                    style: Theme.of(context).textTheme.bodyMedium),
                  const SizedBox(height: 16),
                  Align(
                    alignment: Alignment.centerRight,
                    child: TextButton(
                      onPressed: () {},
                      child: const Text('ACTION'),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
        floatingActionButton: FloatingActionButton(
          onPressed: () {},
          child: const Icon(Icons.add),
          // M3 FAB automatically gets correct elevation & shape
        ),
      ),
    );
  }
}
```
- **Flutter is the native home of Material Design.** Use `MaterialApp`, `ThemeData(useMaterial3: true)`, and standard widgets.
- Map the universal palette via `colorSchemeSeed` or manually build a `ColorScheme`.
- Use the Material type scale via `Theme.of(context).textTheme`.
- Ripple effects come free with `InkWell` and `ElevatedButton`.

### React Native
```jsx
import { Provider as PaperProvider, Card, Button, Title, Paragraph } from 'react-native-paper';

const materialTheme = {
  ...DefaultTheme,
  roundness: 8,
  colors: {
    ...DefaultTheme.colors,
    primary: '#6750A4',    // Material You purple
    surface: '#FFFBFE',
    background: '#FFFBFE',
  },
};

const MaterialScreen = () => (
  <PaperProvider theme={materialTheme}>
    <ScrollView style={{ flex: 1, padding: 16 }}>
      <Card style={{ marginBottom: 16 }} elevation={2}>
        <Card.Content>
          <Title>Material Card</Title>
          <Paragraph>Digital paper and ink. Shadows communicate hierarchy.</Paragraph>
        </Card.Content>
        <Card.Actions>
          <Button mode="text" onPress={() => {}}>ACTION</Button>
        </Card.Actions>
      </Card>

      {/* Filled button — Material M3 style */}
      <Button
        mode="contained"
        onPress={() => {}}
        style={{ alignSelf: 'flex-start', borderRadius: 20 }}
        labelStyle={{ fontWeight: '500', letterSpacing: 1.25 }}
      >
        Filled Button
      </Button>
    </ScrollView>
  </PaperProvider>
);
```
- Use `react-native-paper` — it implements Material Design 3 natively for React Native.
- Configure the theme to map your universal palettes to Material semantic colors.
- Use `Card` (with `elevation` prop), `Button` (with `mode` prop), and `TextInput` for correct Material behavior.
- Ripple effects on Android come free via `Pressable`; on iOS, use `react-native-paper`'s `TouchableRipple`.

### Jetpack Compose
```kotlin
// Jetpack Compose IS Material Design — use it natively
@Composable
fun MaterialScreen() {
    MaterialTheme(
        colorScheme = lightColorScheme(
            primary = Color(0xFF6750A4),
            onPrimary = Color.White,
            surface = Color(0xFFFFFBFE),
        ),
        typography = Typography(
            titleLarge = TextStyle(fontSize = 22.sp, fontWeight = FontWeight.Medium),
            bodyMedium = TextStyle(fontSize = 14.sp, lineHeight = 20.sp),
        ),
    ) {
        Scaffold(
            topBar = {
                TopAppBar(title = { Text("Material Design") })
            },
            floatingActionButton = {
                FloatingActionButton(onClick = {}) {
                    Icon(Icons.Default.Add, contentDescription = "Add")
                }
            },
        ) { padding ->
            Column(modifier = Modifier.padding(padding).padding(16.dp)) {
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    elevation = CardDefaults.cardElevation(defaultElevation = 2.dp),
                    shape = RoundedCornerShape(12.dp),
                ) {
                    Column(modifier = Modifier.padding(16.dp)) {
                        Text("Material Card",
                            style = MaterialTheme.typography.titleLarge)
                        Spacer(Modifier.height(8.dp))
                        Text("Digital paper and ink.",
                            style = MaterialTheme.typography.bodyMedium)
                        Spacer(Modifier.height(16.dp))
                        TextButton(
                            onClick = {},
                            modifier = Modifier.align(Alignment.End),
                        ) { Text("ACTION") }
                    }
                }
            }
        }
    }
}
```
- **Jetpack Compose is Material Design.** Use `MaterialTheme`, `Card`, `Scaffold`, `TopAppBar`, and `FloatingActionButton` as-is.
- Map the universal palette into `lightColorScheme()` or `darkColorScheme()`.
- Use `MaterialTheme.typography` for the complete type scale.
- Motion uses `animateFloatAsState` with Material easing: `FastOutSlowInEasing` (equivalent to `cubic-bezier(0.4, 0.0, 0.2, 1)`).

## Do's and Don'ts
- **DO**: Use the standard Material easing curves for animations (`cubic-bezier(0.4, 0.0, 0.2, 1)`).
- **DON'T**: Mix overlapping shadows arbitrarily. Elements should clearly sit 'above' or 'below' others.
