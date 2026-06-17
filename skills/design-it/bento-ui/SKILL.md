---
name: bento-ui
description: Web and App implementation guide for Bento UI. Trigger when user wants modular grid cards, Apple-like dashboard style, or sections arranged like a bento box.
---

# Bento UI

> "Everything in its right place. A highly structured, modular grid of distinct compartments."

## Core Principles
1. **Strict Grid Structure**: The entire UI is built on a responsive, multi-column grid (usually 3x3, 4x4, or irregular masonry).
2. **Rounded Compartments**: Every distinct piece of content lives inside a card (compartment) with consistent, usually large, border-radius.
3. **Equal Spacing**: The gap between compartments must be perfectly consistent everywhere.

## Visual DNA
- **Colors**: Highly adaptable, but looks incredibly premium with **Minimalist Slate** or **Yacht Club**. Often uses a slightly off-white or light gray background to make the white compartments pop.
- **Typography**: Apple-esque (e.g., `SF Pro`, `Inter`). Headlines are usually bold and placed at the top-left or bottom-left of each compartment.
- **Visuals**: Often relies on high-quality, edge-to-edge images or single, large 3D icons inside specific grid cells to break up text-heavy cards.

## Web Implementation
- CSS Grid is mandatory. Flexbox is too difficult to maintain the strict 2D structure.
- **CSS Example**:
```css
.bento-container {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  grid-auto-rows: 200px;
  gap: 24px;
  padding: 24px;
  background-color: var(--bg-primary); /* Slightly darker than cards */
}

.bento-card {
  background-color: #fff;
  border-radius: 32px; /* Very large border radius */
  padding: 32px;
  box-shadow: 0 4px 24px rgba(0,0,0,0.04);
  /* Optional: subtle 1px border for crispness */
  border: 1px solid rgba(0,0,0,0.05);
  
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}

/* Creating spans for different bento sizes */
.bento-span-2 { grid-column: span 2; }
.bento-span-2-row { grid-row: span 2; }
.bento-large { grid-column: span 2; grid-row: span 2; }
```

## App Implementation

### SwiftUI
```swift
struct BentoGrid: View {
    let columns = [
        GridItem(.flexible(), spacing: 16),
        GridItem(.flexible(), spacing: 16)
    ]
    
    var body: some View {
        ScrollView {
            LazyVGrid(columns: columns, spacing: 16) {
                // 2x1 Span (Full width)
                BentoCard(title: "Hero", color: .blue)
                    .frame(height: 180)
                
                // 1x1 Spans
                BentoCard(title: "Stats", color: .green)
                    .frame(height: 180)
                BentoCard(title: "Graph", color: .purple)
                    .frame(height: 180)
                
                // 1x2 Span (Tall)
                BentoCard(title: "Activity", color: .orange)
                    .frame(height: 376) // (180 * 2) + 16 spacing
                
                // 1x1 Spans next to the tall one
                VStack(spacing: 16) {
                    BentoCard(title: "A", color: .pink).frame(height: 180)
                    BentoCard(title: "B", color: .cyan).frame(height: 180)
                }
            }
            .padding(16)
        }
        .background(Color(.systemGroupedBackground))
    }
}

struct BentoCard: View {
    let title: String
    let color: Color
    var body: some View {
        RoundedRectangle(cornerRadius: 24)
            .fill(Color(.secondarySystemGroupedBackground))
            .overlay(
                Text(title).font(.headline).foregroundColor(color),
                alignment: .topLeading
            )
            .padding(16)
            // Soft bento shadow
            .shadow(color: .black.opacity(0.04), radius: 12, x: 0, y: 4)
    }
}
```
- Use `LazyVGrid` for uniform grids.
- For complex irregular bento layouts (like 1x2 spans), you often have to mix `VStack` and `HStack` inside the grid cells to fake the spans.
- Maintain absolute consistency with `cornerRadius` (usually 24-32pt) and `spacing` (usually 16pt).

### Flutter
```dart
import 'package:flutter_staggered_grid_view/flutter_staggered_grid_view.dart';

class BentoScreen extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.grey[100],
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: StaggeredGrid.count(
          crossAxisCount: 4, // 4 columns total
          mainAxisSpacing: 16,
          crossAxisSpacing: 16,
          children: const [
            // 2x1 (Full width in a 2-col layout, spans 4)
            StaggeredGridTile.count(
              crossAxisCellCount: 4,
              mainAxisCellCount: 2,
              child: BentoCard(title: 'Hero'),
            ),
            // 1x1
            StaggeredGridTile.count(
              crossAxisCellCount: 2,
              mainAxisCellCount: 2,
              child: BentoCard(title: 'Stats'),
            ),
            // 1x1
            StaggeredGridTile.count(
              crossAxisCellCount: 2,
              mainAxisCellCount: 2,
              child: BentoCard(title: 'Graph'),
            ),
            // 1x2 (Tall)
            StaggeredGridTile.count(
              crossAxisCellCount: 2,
              mainAxisCellCount: 4,
              child: BentoCard(title: 'Activity'),
            ),
          ],
        ),
      ),
    );
  }
}

class BentoCard extends StatelessWidget {
  final String title;
  const BentoCard({required this.title});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(24),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.04),
            blurRadius: 12,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      alignment: Alignment.topLeft,
      child: Text(title, style: const TextStyle(fontWeight: FontWeight.bold)),
    );
  }
}
```
- The `flutter_staggered_grid_view` package is practically mandatory for complex Bento grids in Flutter.
- Use `StaggeredGridTile.count` to explicitly declare the `crossAxis` and `mainAxis` span of each compartment.

### React Native
```jsx
const BentoScreen = () => {
  return (
    <ScrollView 
      style={{ flex: 1, backgroundColor: '#F2F2F7' }}
      contentContainerStyle={{ padding: 16 }}
    >
      {/* 2x1 Span */}
      <View style={[styles.bentoCard, { height: 180, marginBottom: 16 }]}>
        <Text style={styles.title}>Hero</Text>
      </View>

      <View style={{ flexDirection: 'row', gap: 16, marginBottom: 16 }}>
        {/* 1x1 Spans */}
        <View style={[styles.bentoCard, { flex: 1, height: 180 }]}>
          <Text style={styles.title}>Stats</Text>
        </View>
        <View style={[styles.bentoCard, { flex: 1, height: 180 }]}>
          <Text style={styles.title}>Graph</Text>
        </View>
      </View>

      <View style={{ flexDirection: 'row', gap: 16 }}>
        {/* 1x2 Span (Tall) */}
        <View style={[styles.bentoCard, { flex: 1, height: 376 }]}>
          <Text style={styles.title}>Activity</Text>
        </View>
        
        <View style={{ flex: 1, gap: 16 }}>
          {/* Stacked 1x1s */}
          <View style={[styles.bentoCard, { height: 180 }]}>
            <Text style={styles.title}>A</Text>
          </View>
          <View style={[styles.bentoCard, { height: 180 }]}>
            <Text style={styles.title}>B</Text>
          </View>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  bentoCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 2,
  },
  title: {
    fontWeight: '700',
    fontSize: 18,
  }
});
```
- React Native lacks CSS Grid. You must manually compose the grid using `flexDirection: 'row'` and vertical stacks.
- The `gap` property in React Native flexbox makes this significantly easier than using margins.

### Jetpack Compose
```kotlin
@Composable
fun BentoGrid() {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(Color(0xFFF2F2F7))
            .verticalScroll(rememberScrollState())
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        // Full width
        BentoCard(title = "Hero", modifier = Modifier.fillMaxWidth().height(180.dp))
        
        // Two columns
        Row(horizontalArrangement = Arrangement.spacedBy(16.dp)) {
            BentoCard(title = "Stats", modifier = Modifier.weight(1f).height(180.dp))
            BentoCard(title = "Graph", modifier = Modifier.weight(1f).height(180.dp))
        }
        
        // Complex span: 1x2 left, two 1x1s right
        Row(horizontalArrangement = Arrangement.spacedBy(16.dp)) {
            BentoCard(title = "Activity", modifier = Modifier.weight(1f).height(376.dp))
            
            Column(
                modifier = Modifier.weight(1f),
                verticalArrangement = Arrangement.spacedBy(16.dp)
            ) {
                BentoCard(title = "A", modifier = Modifier.fillMaxWidth().height(180.dp))
                BentoCard(title = "B", modifier = Modifier.fillMaxWidth().height(180.dp))
            }
        }
    }
}

@Composable
fun BentoCard(title: String, modifier: Modifier = Modifier) {
    Card(
        modifier = modifier,
        shape = RoundedCornerShape(24.dp),
        colors = CardDefaults.cardColors(containerColor = Color.White),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
    ) {
        Text(title, fontWeight = FontWeight.Bold, modifier = Modifier.padding(24.dp))
    }
}
```
- While `LazyVerticalGrid` exists, for highly specific irregular bento layouts, manually building rows and columns with `weight(1f)` is often much more reliable.
- Use `Arrangement.spacedBy(16.dp)` on both Columns and Rows to ensure mathematically perfect gutters.

## Do's and Don'ts
- **DO**: Mix sizes! A bento box is boring if every cell is 1x1. Use 2x1, 1x2, and 2x2 cells to create visual interest.
- **DON'T**: Clutter the inside of a bento card. If it needs a lot of elements, break it into multiple cards.
