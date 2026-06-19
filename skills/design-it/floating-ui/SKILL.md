---
name: floating-ui
description: Web and App implementation guide for Floating UI. Trigger when user wants detached cards, elevated components, and a light, airy feel.
date_added: "2026-06-17"
risk: safe
source: self
source_type: self
---

# Floating UI

> "Defying gravity. Elements that hover effortlessly above the surface."


## When to Use
Use this sub-style when the user's request matches the aesthetic described above. This is a child reference of the `design-it` skill and is not meant to be triggered directly.

## Core Principles
1. **Detachment**: UI elements (like nav bars, sidebars, or main content cards) do not touch the edges of the screen. They float with margins on all sides.
2. **Soft, Diffuse Shadows**: Large, highly blurred shadows directly beneath elements.
3. **Pill Shapes & Rounds**: Fully rounded corners (pill shapes) enhance the floating, bubble-like aesthetic.

## Visual DNA
- **Colors**: **Earth-Grounded Elegance** or **Minimalist Slate**. Use a slightly tinted background (off-white or very light gray) so the floating white elements pop.
- **Typography**: Clean, airy sans-serifs with generous line height.
- **Layout**: The "floating island" pattern for navigation (a pill-shaped nav bar centered at the bottom or top of the screen).

## Web Implementation
- Focus on large margins and specific shadow styles.
- **CSS Example**:
```css
body {
  background-color: var(--bg-primary); /* e.g., #F4F4F9 */
  padding: 24px; /* Ensure nothing touches the edge */
}

.floating-nav {
  position: fixed;
  bottom: 32px;
  left: 50%;
  transform: translateX(-50%);
  background: white;
  border-radius: 50px; /* Pill shape */
  padding: 12px 32px;
  
  /* Large, soft shadow */
  box-shadow: 0 16px 40px rgba(0,0,0,0.08);
  
  display: flex;
  gap: 24px;
}

.floating-card {
  background: white;
  border-radius: 24px;
  padding: 32px;
  margin-bottom: 24px;
  box-shadow: 0 10px 30px rgba(0,0,0,0.05);
}
```

## App Implementation

### SwiftUI
```swift
struct FloatingUIView: View {
    var body: some View {
        ZStack {
            // Very light background
            Color(red: 0.95, green: 0.95, blue: 0.97).ignoresSafeArea()
            
            ScrollView {
                VStack(spacing: 24) {
                    // Floating Content Card
                    VStack(alignment: .leading, spacing: 12) {
                        Text("Floating Card")
                            .font(.title2).fontWeight(.bold)
                        Text("This card hovers above the background, with massive soft shadows and completely rounded corners.")
                            .foregroundColor(.secondary)
                    }
                    .padding(32)
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .background(Color.white)
                    .cornerRadius(32) // Very large radius
                    // Large, highly blurred shadow
                    .shadow(color: Color.black.opacity(0.05), radius: 30, x: 0, y: 15)
                    .padding(.horizontal, 24) // Keeps it detached from edges
                }
                .padding(.top, 40)
            }
            
            // Floating Pill Navigation
            VStack {
                Spacer()
                HStack(spacing: 40) {
                    Image(systemName: "house.fill").foregroundColor(.blue)
                    Image(systemName: "magnifyingglass").foregroundColor(.gray)
                    Image(systemName: "bell.fill").foregroundColor(.gray)
                    Image(systemName: "person.fill").foregroundColor(.gray)
                }
                .padding(.vertical, 16)
                .padding(.horizontal, 32)
                .background(Color.white)
                .clipShape(Capsule()) // Pill shape
                .shadow(color: Color.black.opacity(0.1), radius: 25, x: 0, y: 10)
                .padding(.bottom, 32) // Detached from bottom edge
            }
        }
    }
}
```
- A `.clipShape(Capsule())` with a massive `.shadow()` creates the perfect floating pill navigation bar.
- Push the `.shadow(radius: ...)` up to 25 or 30 with a very low opacity (0.05) to get the soft, diffuse hover effect.

### Flutter
```dart
class FloatingUIScreen extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF4F4F9),
      body: Stack(
        children: [
          ListView(
            padding: const EdgeInsets.all(24),
            children: [
              // Floating Content Card
              Container(
                margin: const EdgeInsets.only(bottom: 24),
                padding: const EdgeInsets.all(32),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(32), // Large radius
                  boxShadow: [
                    BoxShadow(
                      color: Colors.black.withOpacity(0.05),
                      blurRadius: 30,
                      offset: const Offset(0, 15),
                    )
                  ],
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: const [
                    Text('Floating Card', style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold)),
                    SizedBox(height: 12),
                    Text('This card hovers above the background.', style: TextStyle(color: Colors.grey)),
                  ],
                ),
              ),
            ],
          ),
          
          // Floating Bottom Nav
          Align(
            alignment: Alignment.bottomCenter,
            child: Container(
              margin: const EdgeInsets.only(bottom: 32),
              padding: const EdgeInsets.symmetric(horizontal: 32, vertical: 16),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(50), // Pill shape
                boxShadow: [
                  BoxShadow(color: Colors.black.withOpacity(0.1), blurRadius: 25, offset: const Offset(0, 10))
                ],
              ),
              child: Row(
                mainAxisSize: MainAxisSize.min, // Wrap content
                children: const [
                  Icon(Icons.home, color: Colors.blue),
                  SizedBox(width: 40),
                  Icon(Icons.search, color: Colors.grey),
                  SizedBox(width: 40),
                  Icon(Icons.person, color: Colors.grey),
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
- Avoid the native `BottomNavigationBar`. Instead, use a `Stack` and `Align(alignment: Alignment.bottomCenter)` with a `Container` to build the floating pill menu.
- Use `blurRadius: 30` in `BoxShadow` for the diffuse look.

### React Native
```jsx
const FloatingUIScreen = () => {
  return (
    <View style={{ flex: 1, backgroundColor: '#F4F4F9' }}>
      <ScrollView contentContainerStyle={{ padding: 24 }}>
        {/* Floating Card */}
        <View style={styles.floatingCard}>
          <Text style={{ fontSize: 24, fontWeight: 'bold', marginBottom: 12 }}>Floating Card</Text>
          <Text style={{ color: '#666' }}>This card hovers above the background, detached from all edges.</Text>
        </View>
      </ScrollView>

      {/* Floating Pill Nav */}
      <View style={styles.floatingNav}>
        <Text style={{ fontSize: 20 }}>🏠</Text>
        <Text style={{ fontSize: 20, opacity: 0.5 }}>🔍</Text>
        <Text style={{ fontSize: 20, opacity: 0.5 }}>👤</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  floatingCard: {
    backgroundColor: '#FFF',
    borderRadius: 32,
    padding: 32,
    marginBottom: 24,
    // iOS shadow
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 15 },
    shadowOpacity: 0.05,
    shadowRadius: 30,
    // Android shadow
    elevation: 8,
  },
  floatingNav: {
    position: 'absolute',
    bottom: 40,
    alignSelf: 'center',
    flexDirection: 'row',
    backgroundColor: '#FFF',
    borderRadius: 50,
    paddingVertical: 16,
    paddingHorizontal: 32,
    gap: 40, // Needs RN 0.71+
    
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 25,
    elevation: 10,
  }
});
```
- `position: 'absolute'` with `alignSelf: 'center'` is the easiest way to place the pill nav in React Native.
- Android's `elevation` doesn't support massive blur radii very well, so the effect is stronger and softer on iOS.

### Jetpack Compose
```kotlin
@Composable
fun FloatingUIScreen() {
    Box(modifier = Modifier.fillMaxSize().background(Color(0xFFF4F4F9))) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(24.dp)
        ) {
            // Floating Card
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .shadow(15.dp, RoundedCornerShape(32.dp), spotColor = Color.Black.copy(alpha = 0.05f))
                    .background(Color.White, RoundedCornerShape(32.dp))
                    .padding(32.dp)
            ) {
                Column {
                    Text("Floating Card", fontSize = 24.sp, fontWeight = FontWeight.Bold)
                    Spacer(Modifier.height(12.dp))
                    Text("This card hovers above the background.", color = Color.Gray)
                }
            }
        }
        
        // Floating Pill Nav
        Row(
            modifier = Modifier
                .align(Alignment.BottomCenter)
                .padding(bottom = 32.dp)
                .shadow(20.dp, CircleShape, spotColor = Color.Black.copy(alpha = 0.1f))
                .background(Color.White, CircleShape)
                .padding(horizontal = 32.dp, vertical = 16.dp),
            horizontalArrangement = Arrangement.spacedBy(40.dp)
        ) {
            Icon(Icons.Default.Home, contentDescription = null, tint = Color.Blue)
            Icon(Icons.Default.Search, contentDescription = null, tint = Color.Gray)
            Icon(Icons.Default.Person, contentDescription = null, tint = Color.Gray)
        }
    }
}
```
- Use `CircleShape` for the pill nav background.
- Crucially, lower the `alpha` of the `spotColor` in `Modifier.shadow` to achieve the soft, diffuse shadow look, otherwise Compose defaults to a harsh, dark shadow.

## Do's and Don'ts
- **DO**: Animate floating elements! A slow, continuous 2px up/down translateY animation makes them feel truly buoyant.
- **DON'T**: Pin elements to the screen edges (except perhaps background images).

## Limitations
- This is a styling reference and does not replace environment-specific validation, accessibility testing, or expert review.
- Ensure appropriate contrast ratios and responsive behaviors are verified separately.
