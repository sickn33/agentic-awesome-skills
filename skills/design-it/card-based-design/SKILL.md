---
name: card-based-design
description: Web and App implementation guide for Card-Based Design. Trigger when user wants information cards, Pinterest-style layouts, and bite-sized content containers.
date_added: "2026-06-17"
risk: safe
source: self
source_type: self
---

# Card-Based Design

> "Bite-sized consumption. Encapsulating discrete pieces of information into distinct visual containers."


## When to Use
Use this sub-style when the user's request matches the aesthetic described above. This is a child reference of the `design-it` skill and is not meant to be triggered directly.

## Core Principles
1. **Encapsulation**: Every card is self-contained. It has an image, a title, a short description, and usually an action (like a button or a 'like' icon).
2. **Responsive Flow**: Cards easily reflow on different screen sizes (from a 4-column grid on desktop to a single column on mobile).
3. **Clear Boundaries**: Cards must visually pop off the background.

## Visual DNA
- **Colors**: Very flexible. The background should be slightly darker or distinct from the card color. **Sophisticated Neutral** works well for a premium feel.
- **Typography**: Clear hierarchy within the card (Header, Subheader, Body).
- **Styling**: Standard `border-radius: 8px` and a medium drop shadow.

## Web Implementation
- CSS Grid with `auto-fit` or a Masonry layout.
- **CSS Example**:
```css
body {
  background-color: #f0f2f5; /* Standard app background */
  padding: 40px;
}

.card-grid {
  display: grid;
  /* Auto-responsive magic */
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 24px;
}

.card {
  background: #ffffff;
  border-radius: 12px;
  overflow: hidden; /* Keep images inside the rounded corners */
  box-shadow: 0 4px 12px rgba(0,0,0,0.08);
  transition: transform 0.2s, box-shadow 0.2s;
  display: flex;
  flex-direction: column;
}

.card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 24px rgba(0,0,0,0.12);
}

.card-image {
  width: 100%;
  height: 200px;
  object-fit: cover;
  border-bottom: 1px solid #eee;
}

.card-content {
  padding: 20px;
  flex-grow: 1; /* Pushes footer to the bottom */
}

.card-footer {
  padding: 16px 20px;
  border-top: 1px solid #eee;
  display: flex;
  justify-content: space-between;
}
```

## App Implementation

### SwiftUI
```swift
struct ContentCard: View {
    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            // Image Area
            Rectangle()
                .fill(Color.gray.opacity(0.2))
                .frame(height: 160)
            
            // Content Area
            VStack(alignment: .leading, spacing: 8) {
                Text("Card Title")
                    .font(.headline)
                Text("A brief description of the content inside this discrete card container.")
                    .font(.subheadline)
                    .foregroundColor(.secondary)
                    .lineLimit(2)
            }
            .padding(16)
        }
        .background(Color.white)
        .cornerRadius(12)
        // Clean, subtle drop shadow
        .shadow(color: Color.black.opacity(0.08), radius: 12, x: 0, y: 4)
    }
}

// In your view:
// LazyVGrid(columns: [GridItem(.adaptive(minimum: 160), spacing: 16)]) { ... }
```
- `VStack` inside a background with `.cornerRadius` and `.shadow` is the standard.
- Use `LazyVGrid` with `.adaptive(minimum: 160)` to automatically create a multi-column card grid that flows perfectly on iPad or iPhone.

### Flutter
```dart
class ContentCard extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Card(
      elevation: 4, // Handles shadow natively
      shadowColor: Colors.black.withOpacity(0.4),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      clipBehavior: Clip.antiAlias, // Critical: stops images from bleeding over corners
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisSize: MainAxisSize.min,
        children: [
          // Image Area
          Container(
            height: 160,
            color: Colors.grey[300],
            width: double.infinity,
          ),
          // Content Area
          Padding(
            padding: const EdgeInsets.all(16.0),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: const [
                Text('Card Title', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 18)),
                SizedBox(height: 8),
                Text(
                  'A brief description of the content inside this discrete card container.',
                  style: TextStyle(color: Colors.black54),
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
// In your view: Use GridView.builder for the layout
```
- The native `Card` widget does almost all the heavy lifting.
- **Critical fix**: You must set `clipBehavior: Clip.antiAlias` on the `Card`, otherwise the top corners of your images will peek outside the border radius.

### React Native
```jsx
const ContentCard = () => {
  return (
    <View style={styles.card}>
      <View style={styles.imageArea} />
      <View style={styles.contentArea}>
        <Text style={styles.title}>Card Title</Text>
        <Text style={styles.description} numberOfLines={2}>
          A brief description of the content inside this discrete card container.
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
    margin: 8,
    overflow: 'hidden', // Keeps image inside borders
  },
  imageArea: {
    height: 160,
    backgroundColor: '#E0E0E0',
  },
  contentArea: {
    padding: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  description: {
    color: '#666',
  }
});
// In your view: <FlatList numColumns={2} data={data} renderItem={...} />
```
- Wrap everything in a View with `borderRadius` and `overflow: 'hidden'`.
- `elevation: 4` provides the drop shadow on Android, while the `shadow*` props handle iOS.
- For a Pinterest/Masonry style (columns of different heights), you must use a third-party library like `react-native-masonry-list`, as `FlatList` cannot do varying row heights in columns.

### Jetpack Compose
```kotlin
@Composable
fun ContentCard() {
    // ElevatedCard provides the shadow and shape natively
    ElevatedCard(
        elevation = CardDefaults.elevatedCardElevation(defaultElevation = 4.dp),
        shape = RoundedCornerShape(12.dp),
        colors = CardDefaults.elevatedCardColors(containerColor = Color.White),
        modifier = Modifier.fillMaxWidth().padding(8.dp)
    ) {
        Column {
            // Image Area
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(160.dp)
                    .background(Color.LightGray)
            )
            
            // Content Area
            Column(modifier = Modifier.padding(16.dp)) {
                Text(
                    text = "Card Title",
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Bold
                )
                Spacer(Modifier.height(8.dp))
                Text(
                    text = "A brief description of the content inside this discrete card container.",
                    style = MaterialTheme.typography.bodyMedium,
                    color = Color.Gray,
                    maxLines = 2,
                    overflow = TextOverflow.Ellipsis
                )
            }
        }
    }
}
// In your view: LazyVerticalGrid(columns = GridCells.Adaptive(minSize = 160.dp)) { ... }
```
- `ElevatedCard` is the perfect Material 3 component for this. It handles clipping and shadows automatically.
- Use `GridCells.Adaptive(minSize = 160.dp)` in a `LazyVerticalGrid` to achieve an auto-flowing grid identical to CSS Grid `auto-fit`.

## Do's and Don'ts
- **DO**: Make the entire card clickable, not just the title or image.
- **DON'T**: Put too much text in a card. If the user has to scroll *within* a card, the card is too big.
