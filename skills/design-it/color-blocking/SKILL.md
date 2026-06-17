---
name: color-blocking
description: Web and App implementation guide for Color Blocking. Trigger when user wants large color sections, striking layout divisions, and Mondrian-style grids.
---

# Color Blocking

> "The grid made visible. Large, solid swaths of contrasting color defining the layout."

## Core Principles
1. **Geometric Division**: The viewport is divided into large rectangles or squares, each filled with a solid, distinct color.
2. **No Margins Between Blocks**: Blocks touch each other directly, often separated only by a stark, 1px or 2px black line (or no line at all, letting the colors clash).
3. **Typography as Texture**: Text is placed precisely within these blocks to balance the visual weight of the colors.

## Visual DNA
- **Colors**: Highly contrasting, bold pairings. Use 3 to 4 strong colors from palettes like **Industrial Chic** (Red, Black, Grey, White) or custom bold pairings (Yellow, Navy, Pink).
- **Typography**: Very clean, bold sans-serifs that can hold their own against massive blocks of color.
- **Borders**: Often uses thick black borders (`2px solid #000`) between blocks to emphasize the grid, reminiscent of Mondrian paintings.

## Web Implementation
- CSS Grid is the only way to effectively build this.
- **CSS Example**:
```css
body {
  margin: 0;
  font-family: 'Space Grotesk', sans-serif;
  color: #000;
}

.color-block-grid {
  display: grid;
  grid-template-columns: 1fr 2fr 1fr;
  grid-template-rows: 60vh 40vh;
  /* Thick black lines between blocks */
  gap: 4px;
  background-color: #000; 
  border: 4px solid #000;
  min-height: 100vh;
}

.block {
  padding: 40px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}

.block-yellow { background-color: #FACC15; }
.block-white  { background-color: #FFFFFF; }
.block-blue   { background-color: #2563EB; color: #FFF; }
.block-red    { background-color: #EF4444; }

.block-title {
  font-size: 3rem;
  font-weight: 900;
  text-transform: uppercase;
  margin: 0;
}
```

## App Implementation

### SwiftUI
```swift
struct ColorBlockingView: View {
    let gridSpacing: CGFloat = 4 // Thickness of the black lines
    
    var body: some View {
        // Black background acts as the grid lines between blocks
        VStack(spacing: gridSpacing) {
            // Top Row
            HStack(spacing: gridSpacing) {
                ColorBlock(color: .yellow, text: "CREATE", textColor: .black)
                ColorBlock(color: .blue, text: "VISION", textColor: .white)
            }
            .frame(height: 300)
            
            // Bottom Row
            HStack(spacing: gridSpacing) {
                ColorBlock(color: .red, text: "BOLD", textColor: .white)
                    .frame(width: 120) // Fixed narrow block
                ColorBlock(color: .white, text: "MINIMAL", textColor: .black)
            }
        }
        .background(Color.black) // The grid lines
        .border(Color.black, width: gridSpacing) // Outer border
        .ignoresSafeArea()
    }
}

struct ColorBlock: View {
    let color: Color
    let text: String
    let textColor: Color
    var body: some View {
        color
            .overlay(
                Text(text)
                    .font(.system(size: 32, weight: .black))
                    .foregroundColor(textColor)
                    .padding(),
                alignment: .bottomLeading
            )
    }
}
```
- In SwiftUI, the easiest way to create Mondrian-style thick black grid lines is to set `.background(Color.black)` on the parent stack and use `spacing: 4`. The background peeks through the gaps.
- `.ignoresSafeArea()` allows the blocks to bleed to the edge of the physical device.

### Flutter
```dart
class ColorBlockingScreen extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      // Black background creates the grid lines
      backgroundColor: Colors.black,
      body: SafeArea(
        bottom: false,
        child: Column(
          children: [
            // Top Row
            Expanded(
              flex: 3, // 3/5 of vertical space
              child: Row(
                children: [
                  Expanded(flex: 1, child: ColorBlock(color: const Color(0xFFFACC15), text: 'CREATE', textColor: Colors.black)),
                  const SizedBox(width: 4), // Grid line
                  Expanded(flex: 2, child: ColorBlock(color: const Color(0xFF2563EB), text: 'VISION', textColor: Colors.white)),
                ],
              ),
            ),
            const SizedBox(height: 4), // Horizontal grid line
            // Bottom Row
            Expanded(
              flex: 2, // 2/5 of vertical space
              child: Row(
                children: [
                  Expanded(flex: 1, child: ColorBlock(color: const Color(0xFFEF4444), text: 'BOLD', textColor: Colors.white)),
                  const SizedBox(width: 4),
                  Expanded(flex: 2, child: ColorBlock(color: Colors.white, text: 'MINIMAL', textColor: Colors.black)),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class ColorBlock extends StatelessWidget {
  final Color color;
  final String text;
  final Color textColor;
  const ColorBlock({required this.color, required this.text, required this.textColor});

  @override
  Widget build(BuildContext context) {
    return Container(
      color: color,
      padding: const EdgeInsets.all(24),
      alignment: Alignment.bottomLeft,
      child: Text(text, style: TextStyle(fontSize: 32, fontWeight: FontWeight.w900, color: textColor)),
    );
  }
}
```
- Use `Expanded` with varying `flex` factors to divide the screen geometrically.
- Insert `SizedBox(width: 4)` or `height: 4` between rows and columns to expose the black `Scaffold` background, creating the grid lines.

### React Native
```jsx
const ColorBlockingScreen = () => {
  return (
    <View style={{ flex: 1, backgroundColor: '#000', gap: 4 }}>
      {/* Top Row */}
      <View style={{ flex: 3, flexDirection: 'row', gap: 4 }}>
        <View style={[styles.block, { flex: 1, backgroundColor: '#FACC15' }]}>
          <Text style={[styles.text, { color: '#000' }]}>CREATE</Text>
        </View>
        <View style={[styles.block, { flex: 2, backgroundColor: '#2563EB' }]}>
          <Text style={[styles.text, { color: '#FFF' }]}>VISION</Text>
        </View>
      </View>
      
      {/* Bottom Row */}
      <View style={{ flex: 2, flexDirection: 'row', gap: 4 }}>
        <View style={[styles.block, { flex: 1, backgroundColor: '#EF4444' }]}>
          <Text style={[styles.text, { color: '#FFF' }]}>BOLD</Text>
        </View>
        <View style={[styles.block, { flex: 2, backgroundColor: '#FFF' }]}>
          <Text style={[styles.text, { color: '#000' }]}>MINIMAL</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  block: {
    justifyContent: 'flex-end',
    padding: 24,
  },
  text: {
    fontSize: 32,
    fontWeight: '900',
    fontFamily: 'SpaceGrotesk-Bold',
  }
});
```
- The `gap` property in React Native flexbox makes this trivial. Set a black background on the parent, set `gap: 4`, and the children automatically space out, revealing the thick black lines.
- Use `flex: 1`, `flex: 2` etc. to determine block proportions.

### Jetpack Compose
```kotlin
@Composable
fun ColorBlockingScreen() {
    val gridSpacing = 4.dp
    
    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(Color.Black) // Grid lines
    ) {
        // Top Row
        Row(
            modifier = Modifier.weight(3f),
            horizontalArrangement = Arrangement.spacedBy(gridSpacing)
        ) {
            ColorBlock(Color(0xFFFACC15), "CREATE", Color.Black, Modifier.weight(1f))
            ColorBlock(Color(0xFF2563EB), "VISION", Color.White, Modifier.weight(2f))
        }
        
        Spacer(Modifier.height(gridSpacing))
        
        // Bottom Row
        Row(
            modifier = Modifier.weight(2f),
            horizontalArrangement = Arrangement.spacedBy(gridSpacing)
        ) {
            ColorBlock(Color(0xFFEF4444), "BOLD", Color.White, Modifier.weight(1f))
            ColorBlock(Color.White, "MINIMAL", Color.Black, Modifier.weight(2f))
        }
    }
}

@Composable
fun ColorBlock(color: Color, text: String, textColor: Color, modifier: Modifier = Modifier) {
    Box(
        modifier = modifier
            .fillMaxHeight()
            .background(color)
            .padding(24.dp),
        contentAlignment = Alignment.BottomStart
    ) {
        Text(text, fontSize = 32.sp, fontWeight = FontWeight.Black, color = textColor)
    }
}
```
- Like other mobile frameworks, `Modifier.background(Color.Black)` combined with `Arrangement.spacedBy(4.dp)` perfectly creates the Mondrian grid.
- Use `Modifier.weight(Xf)` to mathematically divide the screen real estate.

## Do's and Don'ts
- **DO**: Ensure extreme contrast. Text on a yellow block should be black. Text on a dark blue block should be white.
- **DON'T**: Use drop shadows, rounded corners, or gradients. Keep it completely flat and sharp.
