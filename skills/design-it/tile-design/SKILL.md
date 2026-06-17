---
name: tile-design
description: Web and App implementation guide for Tile Design. Trigger when user wants Microsoft Metro style, sharp square information units, and horizontal scrolling grids.
---

# Tile Design (Metro UI)

> "Authentically digital. Clean, sharp squares relying purely on typography and flat color."

## Core Principles
1. **Sharp Corners**: Absolutely no border-radius. Everything is a perfect square or sharp rectangle.
2. **Live Data**: Tiles flip, scroll, or fade internally to show live updates without the user interacting.
3. **Horizontal Panning**: The grid often expands infinitely to the right, encouraging horizontal scrolling.

## Visual DNA
- **Colors**: High saturation, flat colors. A dark background (pure black) with bright cyan, magenta, orange, and green tiles.
- **Typography**: Extremely clean, light sans-serifs (like `Segoe UI Light`). Text is almost always pure white.
- **Icons**: Simple, wireframe, monochromatic glyphs placed centrally or in the corner.

## Web Implementation
- **CSS Example**:
```css
body {
  background-color: #111;
  color: #fff;
  font-family: 'Segoe UI', sans-serif;
  overflow-x: auto; /* Horizontal scroll */
}

.tile-group {
  display: grid;
  grid-template-columns: repeat(4, 150px);
  grid-auto-rows: 150px;
  gap: 8px;
  padding: 40px;
}

.tile {
  background-color: #0078D7; /* Classic Windows Blue */
  padding: 12px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  cursor: pointer;
  
  /* The "tilt" click effect */
  transition: transform 0.1s;
  transform-origin: center;
}

.tile:active {
  transform: scale(0.95);
}

.tile-wide { grid-column: span 2; }
.tile-large { grid-column: span 2; grid-row: span 2; }

/* Live Tile Animation */
.tile-live-content {
  animation: slideUp 5s infinite;
}

@keyframes slideUp {
  0%, 45% { transform: translateY(0); }
  50%, 95% { transform: translateY(-100%); } /* Slides up to reveal next item */
  100% { transform: translateY(0); }
}
```

## App Implementation

### SwiftUI
```swift
struct TileDesignView: View {
    let rows = [GridItem(.fixed(150), spacing: 8), GridItem(.fixed(150), spacing: 8)]
    
    var body: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            LazyHGrid(rows: rows, spacing: 8) {
                TileView(title: "Mail", color: Color(hex: "0078D7"), icon: "envelope")
                TileView(title: "Photos", color: Color(hex: "00CC6A"), icon: "photo", isLarge: true)
                TileView(title: "Weather", color: Color(hex: "2D7D9A"), icon: "cloud.sun")
                TileView(title: "Calendar", color: Color(hex: "D13438"), icon: "calendar")
            }
            .padding(40)
        }
        .background(Color(hex: "111111").ignoresSafeArea())
    }
}

struct TileView: View {
    let title: String
    let color: Color
    let icon: String
    var isLarge: Bool = false
    
    @State private var isPressed = false
    
    var body: some View {
        VStack(alignment: .leading) {
            Image(systemName: icon)
                .font(.system(size: 32, weight: .light))
                .foregroundColor(.white)
            Spacer()
            Text(title)
                .font(.custom("Segoe UI", size: 16))
                .foregroundColor(.white)
        }
        .padding(16)
        // Sharp corners are mandatory
        .frame(width: isLarge ? 308 : 150, height: isLarge ? 308 : 150, alignment: .leading)
        .background(color)
        .scaleEffect(isPressed ? 0.95 : 1.0)
        .animation(.spring(response: 0.2, dampingFraction: 0.5), value: isPressed)
        .onLongPressGesture(minimumDuration: .infinity, maximumDistance: .infinity, pressing: { pressing in
            isPressed = pressing
        }, perform: {})
    }
}
```
- A `LazyHGrid` inside a horizontal `ScrollView` perfectly replicates the Windows Phone / Windows 8 start screen.
- Absolutely NO corner radius.
- The `isPressed` state triggering a `.scaleEffect(0.95)` replicates the physical "tilt" interaction of Metro tiles.

### Flutter
```dart
class TileDesignScreen extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF111111),
      body: SingleChildScrollView(
        scrollDirection: Axis.horizontal,
        padding: const EdgeInsets.all(40),
        child: SizedBox(
          height: 308, // Two rows of 150px + 8px spacing
          child: Wrap(
            direction: Axis.vertical,
            spacing: 8,
            runSpacing: 8,
            children: [
              _buildTile('Mail', const Color(0xFF0078D7), Icons.mail_outline),
              _buildTile('Weather', const Color(0xFF2D7D9A), Icons.cloud_outlined),
              _buildTile('Photos', const Color(0xFF00CC6A), Icons.photo_outlined, isLarge: true),
              _buildTile('Calendar', const Color(0xFFD13438), Icons.calendar_today),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildTile(String title, Color color, IconData icon, {bool isLarge = false}) {
    return StatefulBuilder(
      builder: (context, setState) {
        bool isPressed = false;
        return GestureDetector(
          onTapDown: (_) => setState(() => isPressed = true),
          onTapUp: (_) => setState(() => isPressed = false),
          onTapCancel: () => setState(() => isPressed = false),
          child: AnimatedScale(
            scale: isPressed ? 0.95 : 1.0,
            duration: const Duration(milliseconds: 100),
            child: Container(
              width: isLarge ? 308 : 150,
              height: isLarge ? 308 : 150,
              color: color, // Sharp corners
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Icon(icon, color: Colors.white, size: 32),
                  Text(title, style: const TextStyle(color: Colors.white, fontFamily: 'Segoe UI', fontSize: 16)),
                ],
              ),
            ),
          ),
        );
      }
    );
  }
}
```
- `Wrap` with `direction: Axis.vertical` inside a horizontally scrolling `SizedBox` is the easiest way to build a Metro grid that flows left-to-right.
- Wrap tiles in `GestureDetector` and `AnimatedScale` to handle the press animation.

### React Native
```jsx
const TileDesignScreen = () => {
  return (
    <ScrollView horizontal style={{ flex: 1, backgroundColor: '#111' }} contentContainerStyle={{ padding: 40 }}>
      <View style={{ flexDirection: 'column', flexWrap: 'wrap', height: 308, gap: 8 }}>
        
        <Tile title="Mail" color="#0078D7" />
        <Tile title="Weather" color="#2D7D9A" />
        <Tile title="Photos" color="#00CC6A" isLarge />
        <Tile title="Calendar" color="#D13438" />

      </View>
    </ScrollView>
  );
};

const Tile = ({ title, color, isLarge }) => {
  const scale = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => Animated.spring(scale, { toValue: 0.95, useNativeDriver: true }).start();
  const handlePressOut = () => Animated.spring(scale, { toValue: 1, useNativeDriver: true }).start();

  return (
    <TouchableWithoutFeedback onPressIn={handlePressIn} onPressOut={handlePressOut}>
      <Animated.View style={{
        width: isLarge ? 308 : 150, height: isLarge ? 308 : 150,
        backgroundColor: color, padding: 16, justifyContent: 'space-between',
        transform: [{ scale }] // The Metro tilt effect
      }}>
        <View style={{ width: 32, height: 32, backgroundColor: '#FFF', opacity: 0.5 }} />
        <Text style={{ color: '#FFF', fontFamily: 'Segoe UI', fontSize: 16 }}>{title}</Text>
      </Animated.View>
    </TouchableWithoutFeedback>
  );
};
```
- Use a `<ScrollView horizontal>` combined with a child `<View>` that has a fixed `height` and `flexWrap: 'wrap', flexDirection: 'column'`. This forces children to form columns and flow horizontally.
- Use `Animated.View` and `TouchableWithoutFeedback` to create the scale animation.

### Jetpack Compose
```kotlin
@Composable
fun TileDesignScreen() {
    LazyHorizontalGrid(
        rows = GridCells.Fixed(2),
        modifier = Modifier.fillMaxSize().background(Color(0xFF111111)),
        contentPadding = PaddingValues(40.dp),
        horizontalArrangement = Arrangement.spacedBy(8.dp),
        verticalArrangement = Arrangement.spacedBy(8.dp)
    ) {
        item(span = { GridItemSpan(1) }) { Tile("Mail", Color(0xFF0078D7)) }
        // Note: LazyHorizontalGrid doesn't easily support spanning multiple rows (2x2 tiles).
        // For a true Metro layout, you often have to build a custom Layout or use staggered grids.
        item(span = { GridItemSpan(2) }) { Tile("Photos Wide", Color(0xFF00CC6A)) } 
        item(span = { GridItemSpan(1) }) { Tile("Weather", Color(0xFF2D7D9A)) }
    }
}

@Composable
fun Tile(title: String, color: Color) {
    var isPressed by remember { mutableStateOf(false) }
    val scale by animateFloatAsState(if (isPressed) 0.95f else 1.0f)

    Box(
        modifier = Modifier
            .size(150.dp) // Or wide/large based on params
            .scale(scale)
            .background(color) // Sharp corners! No RoundedCornerShape
            .pointerInput(Unit) {
                detectTapGestures(
                    onPress = {
                        isPressed = true
                        tryAwaitRelease()
                        isPressed = false
                    }
                )
            }
            .padding(16.dp)
    ) {
        // Icon
        Box(modifier = Modifier.size(32.dp).background(Color.White.copy(alpha = 0.5f)).align(Alignment.TopStart))
        // Text
        Text(
            text = title,
            color = Color.White,
            fontFamily = FontFamily.SansSerif,
            modifier = Modifier.align(Alignment.BottomStart)
        )
    }
}
```
- `LazyHorizontalGrid` is the right tool, though building true 2x2 "Large" tiles requires custom layout math in Compose if mixing with 1x1 tiles.
- `Modifier.scale()` paired with `pointerInput` `detectTapGestures` handles the Metro interaction.

## Do's and Don'ts
- **DO**: Place the tile label text strictly in the bottom-left corner of the tile.
- **DON'T**: Add drop shadows or gradients to the tiles.
