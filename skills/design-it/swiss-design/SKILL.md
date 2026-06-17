---
name: swiss-design
description: Web and App implementation guide for Swiss Design (International Typographic Style). Trigger when user wants strict grid systems, strong typography, and clean, asymmetrical alignment.
date_added: "2026-06-17"
---

# Swiss Design (International Typographic Style)

> "Form follows function. The grid is absolute. Typography is the primary visual element."

## Core Principles
1. **Mathematical Grids**: Everything aligns to a strict underlying grid. Asymmetry is preferred over centered text.
2. **Sans-Serif Typography**: Helvetica is the king, but any clean, neutral sans-serif works. Flush left, ragged right text alignment.
3. **Objective Photography**: If images are used, they should be objective, documentary-style photos, not stylized illustrations.

## Visual DNA
- **Colors**: Very limited. Usually just black, white, and ONE highly saturated accent color (often primary red, blue, or yellow). The **Industrial Chic** palette works perfectly.
- **Typography**: `Helvetica Neue`, `Inter`, or `Roboto`. Huge contrast in font sizes (e.g., massive 6rem headers paired with 1rem body text).
- **Layout**: Do NOT center text. Ever.

## Web Implementation
- Use CSS Grid extensively. Let columns dictate the layout.
- **CSS Example**:
```css
body {
  background-color: #f4f4f4;
  color: #111;
  font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
  line-height: 1.4;
}

.swiss-grid {
  display: grid;
  grid-template-columns: repeat(12, 1fr);
  gap: 20px;
  padding: 40px;
}

.swiss-header {
  grid-column: 1 / 11; /* spans across multiple columns, leaving right side empty */
  font-size: 6vw;
  font-weight: 700;
  text-transform: lowercase; /* Optional, but common in brutalist/swiss */
  margin-bottom: 2rem;
  line-height: 0.9;
  letter-spacing: -0.04em;
}

.swiss-content {
  grid-column: 4 / 9; /* Indented alignment */
  font-size: 1.25rem;
  text-align: left; /* Flush left, ragged right */
}

.swiss-accent {
  color: #E2001A; /* Classic Swiss Red */
}
```

## App Implementation

### SwiftUI
```swift
struct SwissDesignView: View {
    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 0) {
                // Header Block
                VStack(alignment: .leading, spacing: 8) {
                    Text("the grid")
                        .font(.custom("Helvetica Neue", size: 60))
                        .fontWeight(.heavy)
                        .tracking(-2) // Tight letter spacing
                    Text("is absolute.")
                        .font(.custom("Helvetica Neue", size: 60))
                        .fontWeight(.heavy)
                        .tracking(-2)
                        .foregroundColor(Color(hex: "E2001A")) // Swiss Red
                }
                .padding(.horizontal, 24)
                .padding(.top, 60)
                .padding(.bottom, 40)
                
                Divider().background(Color.black)
                
                // Asymmetrical Content Block
                HStack(alignment: .top, spacing: 20) {
                    // Empty left column (negative space is structural)
                    Spacer().frame(width: 40)
                    
                    VStack(alignment: .leading, spacing: 16) {
                        Text("Form follows function.")
                            .font(.custom("Helvetica Neue", size: 24))
                            .fontWeight(.bold)
                        
                        Text("Typography is the primary visual element. Everything aligns to a strict underlying grid. Asymmetry is preferred over centered text.")
                            .font(.custom("Helvetica Neue", size: 16))
                            .lineSpacing(6)
                    }
                    .padding(.vertical, 40)
                    .padding(.trailing, 24)
                }
                
                Divider().background(Color.black)
            }
            .frame(maxWidth: .infinity, alignment: .leading)
        }
        .background(Color(white: 0.96))
        .foregroundColor(.black)
    }
}
```
- Strict `alignment: .leading` everywhere. Never use `.center`.
- Use `Spacer().frame(width: X)` in `HStack`s to intentionally push content off the left margin, creating the classic Swiss indented asymmetrical grid.

### Flutter
```dart
class SwissDesignScreen extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF4F4F4),
      body: SingleChildScrollView(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const SizedBox(height: 80),
            // Header
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 24.0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: const [
                  Text('the grid', style: TextStyle(fontFamily: 'Helvetica', fontSize: 60, fontWeight: FontWeight.w900, height: 0.9, letterSpacing: -2)),
                  Text('is absolute.', style: TextStyle(fontFamily: 'Helvetica', fontSize: 60, fontWeight: FontWeight.w900, height: 0.9, letterSpacing: -2, color: Color(0xFFE2001A))),
                ],
              ),
            ),
            const SizedBox(height: 40),
            const Divider(color: Colors.black, thickness: 1, height: 1),
            
            // Asymmetrical Content
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Structural empty column
                const SizedBox(width: 64),
                // Content column
                Expanded(
                  child: Padding(
                    padding: const EdgeInsets.only(top: 40.0, bottom: 40.0, right: 24.0),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: const [
                        Text('Form follows function.', style: TextStyle(fontFamily: 'Helvetica', fontSize: 24, fontWeight: FontWeight.bold)),
                        SizedBox(height: 16),
                        Text('Typography is the primary visual element. Everything aligns to a strict underlying grid.', style: TextStyle(fontFamily: 'Helvetica', fontSize: 16, height: 1.4)),
                      ],
                    ),
                  ),
                ),
              ],
            ),
            const Divider(color: Colors.black, thickness: 1, height: 1),
          ],
        ),
      ),
    );
  }
}
```
- `CrossAxisAlignment.start` is mandatory on all Columns.
- Use a `Row` with a fixed `SizedBox` width on the left and an `Expanded` widget on the right to enforce the asymmetrical grid column.

### React Native
```jsx
const SwissDesignScreen = () => {
  return (
    <ScrollView style={{ flex: 1, backgroundColor: '#F4F4F4' }}>
      
      {/* Header */}
      <View style={{ paddingHorizontal: 24, paddingTop: 80, paddingBottom: 40 }}>
        <Text style={{ fontFamily: 'HelveticaNeue-CondensedBlack', fontSize: 60, lineHeight: 60, letterSpacing: -2, color: '#111' }}>
          the grid
        </Text>
        <Text style={{ fontFamily: 'HelveticaNeue-CondensedBlack', fontSize: 60, lineHeight: 60, letterSpacing: -2, color: '#E2001A' }}>
          is absolute.
        </Text>
      </View>

      <View style={{ height: 1, backgroundColor: '#111' }} />

      {/* Asymmetrical Layout */}
      <View style={{ flexDirection: 'row', paddingVertical: 40 }}>
        {/* Empty left column */}
        <View style={{ width: 64 }} />
        
        {/* Content */}
        <View style={{ flex: 1, paddingRight: 24 }}>
          <Text style={{ fontFamily: 'HelveticaNeue-Bold', fontSize: 24, color: '#111', marginBottom: 16 }}>
            Form follows function.
          </Text>
          <Text style={{ fontFamily: 'HelveticaNeue-Regular', fontSize: 16, lineHeight: 24, color: '#111' }}>
            Typography is the primary visual element. Everything aligns to a strict underlying grid.
          </Text>
        </View>
      </View>

      <View style={{ height: 1, backgroundColor: '#111' }} />

    </ScrollView>
  );
};
```
- Link the Helvetica Neue font family. The contrast between `HelveticaNeue-CondensedBlack` for headers and `HelveticaNeue-Regular` for body copy defines this style.
- Use `flexDirection: 'row'` to build the strict column structure.

### Jetpack Compose
```kotlin
@Composable
fun SwissDesignScreen() {
    Column(
        modifier = Modifier.fillMaxSize().background(Color(0xFFF4F4F4)).verticalScroll(rememberScrollState())
    ) {
        Spacer(Modifier.height(80.dp))
        
        // Header
        Column(modifier = Modifier.padding(horizontal = 24.dp, vertical = 40.dp)) {
            Text(
                text = "the grid",
                fontFamily = FontFamily.SansSerif, // Replace with Helvetica
                fontSize = 60.sp,
                fontWeight = FontWeight.Black,
                letterSpacing = (-2).sp,
                lineHeight = 60.sp,
                color = Color.Black
            )
            Text(
                text = "is absolute.",
                fontFamily = FontFamily.SansSerif,
                fontSize = 60.sp,
                fontWeight = FontWeight.Black,
                letterSpacing = (-2).sp,
                lineHeight = 60.sp,
                color = Color(0xFFE2001A)
            )
        }
        
        Divider(color = Color.Black, thickness = 1.dp)
        
        // Asymmetrical Grid Row
        Row(modifier = Modifier.fillMaxWidth().padding(vertical = 40.dp)) {
            // Empty grid column
            Spacer(modifier = Modifier.width(64.dp))
            
            // Content
            Column(modifier = Modifier.weight(1f).padding(right = 24.dp)) {
                Text(
                    text = "Form follows function.",
                    fontSize = 24.sp,
                    fontWeight = FontWeight.Bold,
                    color = Color.Black
                )
                Spacer(Modifier.height(16.dp))
                Text(
                    text = "Typography is the primary visual element. Everything aligns to a strict underlying grid.",
                    fontSize = 16.sp,
                    color = Color.Black
                )
            }
        }
        
        Divider(color = Color.Black, thickness = 1.dp)
    }
}
```
- Use `Divider(color = Color.Black, thickness = 1.dp)` to create the harsh horizontal structural rules.
- Combine `Row`, a fixed `Spacer` width, and a `Column` with `Modifier.weight(1f)` to enforce the asymmetrical design.

## Do's and Don'ts
- **DO**: Use negative space as a structural element. Empty columns are just as important as filled ones.
- **DON'T**: Center align text. Do not use serif fonts. Do not use drop shadows.
