---
name: vaporwave
description: Web and App implementation guide for Vaporwave. Trigger when user wants neon colors, retro digital aesthetics, 90s OS elements, and Roman statues.
date_added: "2026-06-17"
---

# Vaporwave

> "A surreal, nostalgic dream of 90s computing and pastel neon."

## Core Principles
1. **Windows 95 / Mac OS 9 Motifs**: UI elements designed to look explicitly like 1990s operating systems (grey boxes, hard bevels, blue title bars).
2. **Surreal Pastels & Neons**: A mix of soft pinks, cyans, and harsh neon overlays.
3. **Collage Aesthetic**: Mixing classical art (Roman busts), early 3D renders (checkerboard floors), and Japanese text (Kanji/Katakana).

## Visual DNA
- **Colors**: Cyan (`#00FFFF`), Magenta (`#FF00FF`), Lavender (`#E6E6FA`), and classic Windows Grey (`#C0C0C0`).
- **Typography**: `MS Sans Serif`, `Tahoma`, or pixel fonts. Fullwidth characters (ＡＥＳＴＨＥＴＩＣ) are highly encouraged for headers.
- **Styling**: Hard, 1px outsets and insets to simulate 90s 3D buttons.

## Web Implementation
- Use standard CSS borders to create the classic 90s button look.
- **CSS Example**:
```css
body {
  background: linear-gradient(180deg, #ff99cc 0%, #99ccff 100%);
  color: #000;
  font-family: 'Tahoma', sans-serif;
  min-height: 100vh;
}

/* Windows 95 Style Window */
.vapor-window {
  background-color: #C0C0C0;
  border: 2px outset #fff;
  border-right-color: #808080;
  border-bottom-color: #808080;
  width: 400px;
  padding: 2px;
}

.vapor-titlebar {
  background: linear-gradient(90deg, #000080, #1084d0);
  color: white;
  font-weight: bold;
  padding: 4px 8px;
  display: flex;
  justify-content: space-between;
}

.vapor-button {
  background-color: #C0C0C0;
  border: 2px outset #fff;
  border-right-color: #808080;
  border-bottom-color: #808080;
  padding: 4px 12px;
}
.vapor-button:active {
  border-style: inset;
}

/* The iconic vaporwave sun/grid */
.vapor-sun {
  width: 200px; height: 200px;
  background: linear-gradient(to bottom, #ff00ff, #ffff00);
  border-radius: 50%;
  box-shadow: 0 0 20px #ff00ff;
}
```

## App Implementation

### SwiftUI
```swift
struct VaporwaveView: View {
    var body: some View {
        ZStack {
            // Neon Gradient Background
            LinearGradient(colors: [Color(hex: "ff99cc"), Color(hex: "99ccff")], startPoint: .top, endPoint: .bottom)
                .ignoresSafeArea()
            
            // Win95 Window
            VStack(spacing: 0) {
                // Title Bar
                HStack {
                    Text("ＡＥＳＴＨＥＴＩＣ.exe")
                        .font(.system(size: 14, weight: .bold, design: .monospaced))
                        .foregroundColor(.white)
                    Spacer()
                    Text("X")
                        .font(.system(size: 12, weight: .bold))
                        .padding(.horizontal, 6)
                        .background(Color(hex: "C0C0C0"))
                        .border(.white, width: 1) // Faux 3D
                }
                .padding(4)
                .background(LinearGradient(colors: [Color(hex: "000080"), Color(hex: "1084d0")], startPoint: .leading, endPoint: .trailing))
                
                // Content
                VStack {
                    Text("It's all in your head.")
                        .font(.custom("Tahoma", size: 16))
                        .padding()
                    
                    // Win95 Button
                    Button(action: {}) {
                        Text("ＯＫ")
                            .foregroundColor(.black)
                            .padding(.horizontal, 24)
                            .padding(.vertical, 8)
                    }
                    .background(Color(hex: "C0C0C0"))
                    // Complex borders to simulate Outset
                    .overlay(
                        Rectangle().stroke(Color.black, lineWidth: 1) // Outer bottom/right
                    )
                    .overlay(
                        Rectangle().stroke(Color.white, lineWidth: 1).padding(1) // Inner top/left
                    )
                }
                .frame(maxWidth: .infinity)
                .padding(16)
                .background(Color(hex: "C0C0C0"))
            }
            .frame(width: 300)
            // Outset border for window
            .border(Color(hex: "808080"), width: 2)
            .padding()
        }
    }
}
```
- You cannot use `.cornerRadius()` anywhere in Vaporwave design.
- The Win95 3D bevel is achieved by stacking `.border()` and `.overlay(Rectangle().stroke())` with different colors (white for top/left, dark gray for bottom/right).

### Flutter
```dart
class VaporwaveScreen extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Container(
        decoration: const BoxDecoration(
          gradient: LinearGradient(begin: Alignment.topCenter, end: Alignment.bottomCenter, colors: [Color(0xFFFF99CC), Color(0xFF99CCFF)]),
        ),
        child: Center(
          child: Container(
            width: 300,
            decoration: const BoxDecoration(
              color: Color(0xFFC0C0C0),
              // Classic Win95 Outset Border
              border: Border(
                top: BorderSide(color: Colors.white, width: 2),
                left: BorderSide(color: Colors.white, width: 2),
                bottom: BorderSide(color: Color(0xFF808080), width: 2),
                right: BorderSide(color: Color(0xFF808080), width: 2),
              ),
            ),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                // Title Bar
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 2),
                  margin: const EdgeInsets.all(2),
                  decoration: const BoxDecoration(gradient: LinearGradient(colors: [Color(0xFF000080), Color(0xFF1084D0)])),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text('ＡＥＳＴＨＥＴＩＣ.exe', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
                      Container(color: const Color(0xFFC0C0C0), padding: const EdgeInsets.symmetric(horizontal: 4), child: const Text('X', style: TextStyle(fontWeight: FontWeight.bold))),
                    ],
                  ),
                ),
                // Content
                Padding(
                  padding: const EdgeInsets.all(16.0),
                  child: Column(
                    children: [
                      const Text('nostalgia.sys loaded.', style: TextStyle(fontFamily: 'Tahoma')),
                      const SizedBox(height: 16),
                      // Outset Button
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 8),
                        decoration: const BoxDecoration(
                          color: Color(0xFFC0C0C0),
                          border: Border(
                            top: BorderSide(color: Colors.white, width: 2), left: BorderSide(color: Colors.white, width: 2),
                            bottom: BorderSide(color: Color(0xFF808080), width: 2), right: BorderSide(color: Color(0xFF808080), width: 2),
                          ),
                        ),
                        child: const Text('ＯＫ'),
                      )
                    ],
                  ),
                )
              ],
            ),
          ),
        ),
      ),
    );
  }
}
```
- Flutter's `BoxDecoration` supports complex `Border` definitions where you can set `BorderSide` colors independently. This perfectly recreates CSS `outset` / `inset`.

### React Native
```jsx
const VaporwaveScreen = () => {
  return (
    <LinearGradient colors={['#ff99cc', '#99ccff']} style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      
      {/* Window */}
      <View style={{
        backgroundColor: '#C0C0C0', width: 300,
        borderTopWidth: 2, borderLeftWidth: 2, borderTopColor: '#FFF', borderLeftColor: '#FFF',
        borderBottomWidth: 2, borderRightWidth: 2, borderBottomColor: '#808080', borderRightColor: '#808080',
        padding: 2
      }}>
        
        {/* Title Bar */}
        <LinearGradient colors={['#000080', '#1084d0']} start={{x: 0, y: 0}} end={{x: 1, y: 0}} style={{ flexDirection: 'row', justifyContent: 'space-between', padding: 4 }}>
          <Text style={{ color: '#FFF', fontWeight: 'bold' }}>ＡＥＳＴＨＥＴＩＣ.exe</Text>
          <View style={{ backgroundColor: '#C0C0C0', paddingHorizontal: 4 }}><Text style={{ fontWeight: 'bold' }}>X</Text></View>
        </LinearGradient>

        <View style={{ padding: 16, alignItems: 'center' }}>
          <Text style={{ fontFamily: 'monospace', marginBottom: 16 }}>nostalgia.sys</Text>
          
          {/* Outset Button */}
          <TouchableOpacity style={{
            backgroundColor: '#C0C0C0', paddingHorizontal: 24, paddingVertical: 8,
            borderTopWidth: 2, borderLeftWidth: 2, borderTopColor: '#FFF', borderLeftColor: '#FFF',
            borderBottomWidth: 2, borderRightWidth: 2, borderBottomColor: '#808080', borderRightColor: '#808080',
          }}>
            <Text style={{ fontWeight: 'bold' }}>ＯＫ</Text>
          </TouchableOpacity>
        </View>

      </View>

    </LinearGradient>
  );
};
```
- Use independent border color styles (`borderTopColor: '#FFF'`, `borderBottomColor: '#808080'`) to build 90s OS chroming.
- Make sure to use Japanese fullwidth characters for text for maximum vaporwave aesthetic.

### Jetpack Compose
```kotlin
@Composable
fun VaporwaveScreen() {
    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(Brush.verticalGradient(listOf(Color(0xFFFF99CC), Color(0xFF99CCFF)))),
        contentAlignment = Alignment.Center
    ) {
        // Window
        Column(
            modifier = Modifier
                .width(300.dp)
                // Custom drawn Outset border
                .drawBehind {
                    val stroke = 4f
                    // Bottom/Right (Dark)
                    drawLine(Color(0xFF808080), Offset(0f, size.height), Offset(size.width, size.height), stroke)
                    drawLine(Color(0xFF808080), Offset(size.width, 0f), Offset(size.width, size.height), stroke)
                    // Top/Left (Light)
                    drawLine(Color.White, Offset(0f, 0f), Offset(size.width, 0f), stroke)
                    drawLine(Color.White, Offset(0f, 0f), Offset(0f, size.height), stroke)
                }
                .background(Color(0xFFC0C0C0))
                .padding(2.dp)
        ) {
            // Title Bar
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .background(Brush.horizontalGradient(listOf(Color(0xFF000080), Color(0xFF1084D0))))
                    .padding(4.dp),
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Text("ＡＥＳＴＨＥＴＩＣ.exe", color = Color.White, fontWeight = FontWeight.Bold)
                Box(modifier = Modifier.background(Color(0xFFC0C0C0)).padding(horizontal = 4.dp)) {
                    Text("X", fontWeight = FontWeight.Bold)
                }
            }
            
            // Content
            Column(modifier = Modifier.fillMaxWidth().padding(16.dp), horizontalAlignment = Alignment.CenterHorizontally) {
                Text("Welcome to the 90s.", fontFamily = FontFamily.Monospace)
                Spacer(Modifier.height(16.dp))
                
                // Win95 Button
                Box(
                    modifier = Modifier
                        .clickable { }
                        .drawBehind {
                            val stroke = 4f
                            drawLine(Color(0xFF808080), Offset(0f, size.height), Offset(size.width, size.height), stroke)
                            drawLine(Color(0xFF808080), Offset(size.width, 0f), Offset(size.width, size.height), stroke)
                            drawLine(Color.White, Offset(0f, 0f), Offset(size.width, 0f), stroke)
                            drawLine(Color.White, Offset(0f, 0f), Offset(0f, size.height), stroke)
                        }
                        .padding(horizontal = 24.dp, vertical = 8.dp)
                ) {
                    Text("ＯＫ", fontWeight = FontWeight.Bold)
                }
            }
        }
    }
}
```
- Compose's `Modifier.border` draws on all sides equally. To achieve the 90s outset look, you must use `Modifier.drawBehind` and manually draw the top/left lines in white and bottom/right lines in dark gray.

## Do's and Don'ts
- **DO**: Use authentic 90s icons (pixelated hourglasses, folders, error dialogs).
- **DON'T**: Use modern drop shadows or rounded corners. The 90s UI was sharp and jagged.
