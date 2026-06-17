---
name: editorial-design
description: Web and App implementation guide for Editorial Design. Trigger when user wants a magazine-inspired layout, large headlines, and elegant typography pairing.
date_added: "2026-06-17"
---

# Editorial Design

> "The digital magazine. Sophisticated typography pairings and deliberate, elegant pacing."

## Core Principles
1. **Serif & Sans-Serif Pairing**: The hallmark of editorial design. A beautiful, high-contrast serif for headings, paired with a clean sans-serif for body copy.
2. **Large Drop Caps & Pull Quotes**: Typographic flourishes that guide the eye and break up long blocks of text.
3. **Columnar Layouts**: Content flows in distinct columns, often with fine lines (rules) separating them.

## Visual DNA
- **Colors**: **Modern Editorial** or **Yacht Club**. Warm, paper-like backgrounds with deep, ink-like blacks or navy blues.
- **Typography**: 
  - Headlines: `Playfair Display`, `Merriweather`, `Bodoni`.
  - Body: `Lato`, `Open Sans`, `Source Sans Pro`.
- **Borders**: Thin, elegant horizontal lines (hairlines) used to separate sections.

## Web Implementation
- **CSS Example**:
```css
body {
  background-color: #F9F9F9; /* Paper white */
  color: #121212; /* Ink black */
}

/* Typography Pairing */
.editorial-headline {
  font-family: 'Playfair Display', serif;
  font-size: 4rem;
  font-weight: 700;
  font-style: italic;
  margin-bottom: 24px;
  border-bottom: 1px solid #121212;
  padding-bottom: 24px;
}

.editorial-body {
  font-family: 'Lato', sans-serif;
  font-size: 1.1rem;
  line-height: 1.8;
  column-count: 2; /* Magazine columns */
  column-gap: 40px;
}

/* Drop Cap */
.editorial-body::first-letter {
  font-family: 'Playfair Display', serif;
  font-size: 4rem;
  float: left;
  line-height: 0.8;
  padding-right: 12px;
  color: var(--cta-highlight);
}

.pull-quote {
  font-family: 'Playfair Display', serif;
  font-size: 2rem;
  text-align: center;
  margin: 48px 0;
  padding: 24px 0;
  border-top: 2px solid #121212;
  border-bottom: 2px solid #121212;
}
```

## App Implementation

### SwiftUI
```swift
struct EditorialView: View {
    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 24) {
                // Editorial Headline
                Text("The Digital\nMagazine")
                    .font(.custom("Playfair Display", size: 48))
                    .fontWeight(.bold)
                    .italic()
                    .foregroundColor(Color(white: 0.05))
                    .padding(.bottom, 16)
                
                Divider().background(Color.black)
                
                // Drop Cap and Body
                HStack(alignment: .top, spacing: 8) {
                    Text("I")
                        .font(.custom("Playfair Display", size: 64))
                        .foregroundColor(Color(red: 0.7, green: 0.2, blue: 0.2))
                        // Negative padding to pull the body text tighter to the drop cap
                        .padding(.top, -10) 
                    
                    Text("n an era of sterile, flat interfaces, the return to elegant typography feels like a breath of fresh air. The interplay of serif and sans-serif...")
                        .font(.custom("Lato", size: 16))
                        .lineSpacing(6)
                        .foregroundColor(Color(white: 0.1))
                }
                
                // Pull Quote
                VStack {
                    Divider().background(Color.black)
                    Text("“Sophistication is in the spacing.”")
                        .font(.custom("Playfair Display", size: 28))
                        .italic()
                        .multilineTextAlignment(.center)
                        .padding(.vertical, 24)
                    Divider().background(Color.black)
                }
                .padding(.vertical, 24)
            }
            .padding(24)
        }
        .background(Color(red: 0.98, green: 0.98, blue: 0.96)) // Warm paper white
    }
}
```
- Extensive use of `.font(.custom())` is mandatory. System fonts look too app-like.
- Use `Divider()` to create the hairlines that are so common in print design.
- A fake "drop cap" can be achieved with an `HStack` aligning top.

### Flutter
```dart
class EditorialScreen extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF9F9F8), // Paper background
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(24.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const SizedBox(height: 40),
            const Text(
              'The Digital\nMagazine',
              style: TextStyle(fontFamily: 'PlayfairDisplay', fontSize: 48, fontWeight: FontWeight.bold, fontStyle: FontStyle.italic, height: 1.1),
            ),
            const SizedBox(height: 24),
            const Divider(color: Colors.black, thickness: 1),
            const SizedBox(height: 24),
            // Body with Drop Cap simulation using RichText is complex, 
            // a simpler Row approach works well enough for mobile.
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'I',
                  style: TextStyle(fontFamily: 'PlayfairDisplay', fontSize: 72, height: 1.0, color: Color(0xFF8B0000)),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: const Text(
                    'n an era of sterile, flat interfaces, the return to elegant typography feels like a breath of fresh air. The interplay of serif and sans-serif brings humanity back to the screen.',
                    style: TextStyle(fontFamily: 'Lato', fontSize: 16, height: 1.6, color: Colors.black87),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 48),
            // Pull Quote
            const Divider(color: Colors.black, thickness: 2),
            const Padding(
              padding: EdgeInsets.symmetric(vertical: 32.0),
              child: Center(
                child: Text(
                  '“Sophistication is in the spacing.”',
                  textAlign: TextAlign.center,
                  style: TextStyle(fontFamily: 'PlayfairDisplay', fontSize: 28, fontStyle: FontStyle.italic),
                ),
              ),
            ),
            const Divider(color: Colors.black, thickness: 2),
          ],
        ),
      ),
    );
  }
}
```
- Set `height` parameters in `TextStyle` (line-height). `1.6` is a good editorial body height.
- Use `Divider` with `thickness: 2` for the heavy rules around pull quotes.

### React Native
```jsx
const EditorialScreen = () => {
  return (
    <ScrollView style={{ flex: 1, backgroundColor: '#F9F9F8', padding: 24 }}>
      <Text style={{ 
        fontFamily: 'PlayfairDisplay-BoldItalic', 
        fontSize: 48, 
        color: '#121212', 
        lineHeight: 52,
        marginTop: 40,
        marginBottom: 24 
      }}>
        The Digital{'\n'}Magazine
      </Text>
      
      <View style={{ height: 1, backgroundColor: '#121212', marginBottom: 24 }} />
      
      <View style={{ flexDirection: 'row' }}>
        <Text style={{ 
          fontFamily: 'PlayfairDisplay-Bold', 
          fontSize: 72, 
          color: '#8B0000',
          lineHeight: 80,
          marginTop: -10, // Adjust alignment
          marginRight: 8
        }}>
          I
        </Text>
        <Text style={{ 
          flex: 1, 
          fontFamily: 'Lato-Regular', 
          fontSize: 16, 
          lineHeight: 26, 
          color: '#333' 
        }}>
          n an era of sterile, flat interfaces, the return to elegant typography feels like a breath of fresh air. The interplay of serif and sans-serif brings humanity.
        </Text>
      </View>
      
      {/* Pull Quote */}
      <View style={{ 
        borderTopWidth: 2, borderBottomWidth: 2, borderColor: '#121212', 
        marginTop: 48, paddingVertical: 32 
      }}>
        <Text style={{ 
          fontFamily: 'PlayfairDisplay-Italic', 
          fontSize: 28, 
          textAlign: 'center', 
          color: '#121212' 
        }}>
          “Sophistication is in the spacing.”
        </Text>
      </View>
    </ScrollView>
  );
};
```
- Line heights and fonts are everything. You must have custom fonts linked in your React Native project for this style to work.
- Use `borderTopWidth` and `borderBottomWidth` on a container `View` to create the pull quote styling.

### Jetpack Compose
```kotlin
@Composable
fun EditorialScreen() {
    // Assuming Playfair and Lato are defined in FontFamily
    val playfair = FontFamily.Serif 
    val lato = FontFamily.SansSerif

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(Color(0xFFF9F9F8))
            .verticalScroll(rememberScrollState())
            .padding(24.dp)
    ) {
        Spacer(Modifier.height(40.dp))
        
        Text(
            text = "The Digital\nMagazine",
            fontFamily = playfair,
            fontSize = 48.sp,
            fontWeight = FontWeight.Bold,
            fontStyle = FontStyle.Italic,
            lineHeight = 52.sp,
            color = Color(0xFF121212)
        )
        
        Spacer(Modifier.height(24.dp))
        Divider(color = Color(0xFF121212), thickness = 1.dp)
        Spacer(Modifier.height(24.dp))
        
        Row(verticalAlignment = Alignment.Top) {
            Text(
                text = "I",
                fontFamily = playfair,
                fontSize = 72.sp,
                color = Color(0xFF8B0000),
                modifier = Modifier.offset(y = (-10).dp).padding(end = 8.dp)
            )
            Text(
                text = "n an era of sterile, flat interfaces, the return to elegant typography feels like a breath of fresh air. The interplay of serif and sans-serif.",
                fontFamily = lato,
                fontSize = 16.sp,
                lineHeight = 26.sp,
                color = Color(0xFF333333)
            )
        }
        
        Spacer(Modifier.height(48.dp))
        
        // Pull Quote
        Divider(color = Color(0xFF121212), thickness = 2.dp)
        Text(
            text = "“Sophistication is in the spacing.”",
            fontFamily = playfair,
            fontSize = 28.sp,
            fontStyle = FontStyle.Italic,
            textAlign = TextAlign.Center,
            modifier = Modifier.fillMaxWidth().padding(vertical = 32.dp)
        )
        Divider(color = Color(0xFF121212), thickness = 2.dp)
    }
}
```
- Compose handles custom fonts and line heights (`26.sp`) very elegantly.
- Use `Divider()` for the hairlines. Adjust thickness as needed for headers vs pull quotes.

## Do's and Don'ts
- **DO**: Treat the interface like a printed page. Margins should be generous.
- **DON'T**: Clutter the UI with typical app components like floating action buttons or heavy navigation bars. Keep it clean.
