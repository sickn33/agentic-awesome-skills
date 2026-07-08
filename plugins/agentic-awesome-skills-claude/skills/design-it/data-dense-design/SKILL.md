---
name: data-dense-design
description: Web and App implementation guide for Data-Dense Design. Trigger when user wants professional tools, maximum information density, and expert interfaces (like Bloomberg terminals or IDEs).
date_added: "2026-06-17"
risk: safe
source: self
source_type: self
---

# Data-Dense Design

> "Density is a feature. For expert users, reducing clicks is more important than whitespace."


## When to Use
Use this sub-style when the user's request matches the aesthetic described above. This is a child reference of the `design-it` skill and is not meant to be triggered directly.

## Core Principles
1. **Compact Layouts**: Extremely tight margins and padding (often 2px to 4px).
2. **Monospace & Tabular Data**: Numbers must align vertically perfectly. 
3. **High Utility**: Every pixel serves a functional purpose. Minimal purely decorative elements.

## Visual DNA
- **Colors**: **Industrial Chic** (high contrast) or **Minimalist Slate**. Avoid bright backgrounds. Dark themes are heavily preferred to reduce eye strain over 8-hour sessions.
- **Typography**: Small base sizes (`11px` - `13px`). Strict use of monospace fonts (`Fira Code`, `JetBrains Mono`) for data.
- **Borders**: Thin `1px` borders (`#333` or `#e0e0e0`) are used extensively to separate tiny cells of data.

## Web Implementation
- Tables, CSS Grid, and Flexbox with zero gap.
- **CSS Example**:
```css
body {
  background-color: #1e1e1e; /* IDE Dark */
  color: #cccccc;
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  font-size: 12px; /* Very small */
  margin: 0;
}

.dense-toolbar {
  display: flex;
  background-color: #2d2d2d;
  border-bottom: 1px solid #3c3c3c;
  padding: 2px 4px;
}

.dense-btn {
  background: transparent;
  color: #ccc;
  border: 1px solid transparent;
  padding: 2px 8px;
  border-radius: 2px;
  cursor: pointer;
}
.dense-btn:hover {
  background-color: #3c3c3c;
  border-color: #555;
}

/* Dense Data Table */
.data-table {
  width: 100%;
  border-collapse: collapse;
  font-family: 'JetBrains Mono', monospace;
}

.data-table th, .data-table td {
  padding: 4px 8px;
  border: 1px solid #3c3c3c;
  text-align: right; /* Numbers align right */
}

.data-table tr:nth-child(even) { background-color: #252526; }
.data-table tr:hover { background-color: #094771; color: #fff; } /* Selection highlight */
```

## App Implementation

### SwiftUI
```swift
struct DataDenseView: View {
    var body: some View {
        ScrollView([.horizontal, .vertical]) {
            Grid(horizontalSpacing: 0, verticalSpacing: 0) {
                // Header Row
                GridRow {
                    HeaderCell("SYM")
                    HeaderCell("BID")
                    HeaderCell("ASK")
                    HeaderCell("CHG")
                }
                
                // Data Rows
                DataRow(sym: "AAPL", bid: "173.40", ask: "173.45", chg: "+0.12", isPos: true)
                DataRow(sym: "MSFT", bid: "320.10", ask: "320.15", chg: "-0.45", isPos: false)
                DataRow(sym: "GOOG", bid: "135.20", ask: "135.30", chg: "+0.02", isPos: true)
            }
            .border(Color.gray.opacity(0.3), width: 1)
        }
        .background(Color(white: 0.12)) // Dark IDE background
    }
}

struct HeaderCell: View {
    let text: String
    init(_ text: String) { self.text = text }
    var body: some View {
        Text(text)
            .font(.system(size: 11, weight: .bold, design: .monospaced))
            .foregroundColor(.gray)
            .padding(4)
            .frame(minWidth: 60, alignment: .leading)
            .border(Color.gray.opacity(0.3), width: 0.5)
            .background(Color(white: 0.18))
    }
}

struct DataRow: View {
    let sym, bid, ask, chg: String
    let isPos: Bool
    var body: some View {
        GridRow {
            Cell(sym, color: .white)
            Cell(bid, color: .white, align: .trailing)
            Cell(ask, color: .white, align: .trailing)
            Cell(chg, color: isPos ? .green : .red, align: .trailing)
        }
    }
}

struct Cell: View {
    let text: String
    let color: Color
    let align: Alignment
    init(_ text: String, color: Color, align: Alignment = .leading) {
        self.text = text; self.color = color; self.align = align
    }
    var body: some View {
        Text(text)
            .font(.system(size: 12, design: .monospaced))
            .foregroundColor(color)
            .padding(4)
            .frame(minWidth: 60, alignment: align)
            .border(Color.gray.opacity(0.3), width: 0.5)
    }
}
```
- Use `Grid` with `0` spacing.
- Font must be `.system(..., design: .monospaced)`.
- Use a `.border()` with `0.5` width on every single cell to recreate the dense spreadsheet look.

### Flutter
```dart
class DataDenseScreen extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF1E1E1E),
      body: SingleChildScrollView(
        scrollDirection: Axis.vertical,
        child: SingleChildScrollView(
          scrollDirection: Axis.horizontal,
          child: Theme(
            // Override theme specifically to make the table hyper-dense
            data: Theme.of(context).copyWith(
              dividerColor: Colors.grey[800],
            ),
            child: DataTable(
              headingRowHeight: 28, // Extremely dense
              dataRowMinHeight: 24,
              dataRowMaxHeight: 24, // Extremely dense
              columnSpacing: 16,
              border: TableBorder.all(color: Colors.grey[800]!, width: 1),
              columns: const [
                DataColumn(label: Text('SYM', style: TextStyle(color: Colors.grey, fontSize: 11, fontFamily: 'RobotoMono'))),
                DataColumn(label: Text('BID', style: TextStyle(color: Colors.grey, fontSize: 11, fontFamily: 'RobotoMono')), numeric: true),
                DataColumn(label: Text('ASK', style: TextStyle(color: Colors.grey, fontSize: 11, fontFamily: 'RobotoMono')), numeric: true),
              ],
              rows: [
                _buildRow('AAPL', '173.40', '173.45'),
                _buildRow('MSFT', '320.10', '320.15'),
                _buildRow('GOOG', '135.20', '135.30'),
              ],
            ),
          ),
        ),
      ),
    );
  }

  DataRow _buildRow(String sym, String bid, String ask) {
    const style = TextStyle(color: Colors.white, fontSize: 12, fontFamily: 'RobotoMono');
    return DataRow(
      cells: [
        DataCell(Text(sym, style: style)),
        DataCell(Text(bid, style: style)),
        DataCell(Text(ask, style: style)),
      ],
    );
  }
}
```
- Flutter's `DataTable` is perfect, but you must manually crush the `headingRowHeight` and `dataRowHeight` down from their Material defaults (which are huge).
- Wrap in dual `SingleChildScrollView` to allow panning around large data sets.

### React Native
```jsx
const DataDenseScreen = () => {
  return (
    <ScrollView style={{ backgroundColor: '#1E1E1E', flex: 1 }}>
      <ScrollView horizontal>
        <View style={{ borderWidth: 1, borderColor: '#333' }}>
          {/* Header */}
          <View style={{ flexDirection: 'row', backgroundColor: '#2D2D2D' }}>
            <HeaderCell text="SYM" width={60} />
            <HeaderCell text="BID" width={80} align="right" />
            <HeaderCell text="ASK" width={80} align="right" />
            <HeaderCell text="CHG" width={60} align="right" />
          </View>
          
          {/* Rows */}
          <DataRow sym="AAPL" bid="173.40" ask="173.45" chg="+0.12" isPos={true} />
          <DataRow sym="MSFT" bid="320.10" ask="320.15" chg="-0.45" isPos={false} />
        </View>
      </ScrollView>
    </ScrollView>
  );
};

const HeaderCell = ({ text, width, align = 'left' }) => (
  <View style={{ width, padding: 4, borderWidth: 0.5, borderColor: '#333' }}>
    <Text style={{ color: '#999', fontSize: 11, fontFamily: 'monospace', textAlign: align, fontWeight: 'bold' }}>
      {text}
    </Text>
  </View>
);

const DataRow = ({ sym, bid, ask, chg, isPos }) => (
  <View style={{ flexDirection: 'row' }}>
    <Cell text={sym} width={60} />
    <Cell text={bid} width={80} align="right" />
    <Cell text={ask} width={80} align="right" />
    <Cell text={chg} width={60} align="right" color={isPos ? '#4CAF50' : '#F44336'} />
  </View>
);

const Cell = ({ text, width, align = 'left', color = '#CCC' }) => (
  <View style={{ width, padding: 4, borderWidth: 0.5, borderColor: '#333' }}>
    <Text style={{ color, fontSize: 12, fontFamily: 'monospace', textAlign: align }}>
      {text}
    </Text>
  </View>
);
```
- React Native doesn't have a native Table component, so you must construct a grid using `flexDirection: 'row'` and strict `width` properties on cells.
- Double scroll views (one vertical, one horizontal inside it) are standard for mobile data tables.

### Jetpack Compose
```kotlin
@Composable
fun DataDenseScreen() {
    val scrollStateHorizontal = rememberScrollState()
    val scrollStateVertical = rememberScrollState()

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(Color(0xFF1E1E1E))
            .verticalScroll(scrollStateVertical)
            .horizontalScroll(scrollStateHorizontal)
            .padding(8.dp)
    ) {
        Column(modifier = Modifier.border(1.dp, Color(0xFF333333))) {
            // Header
            Row(modifier = Modifier.background(Color(0xFF2D2D2D))) {
                Cell("SYM", 60.dp, Color.Gray, true)
                Cell("BID", 80.dp, Color.Gray, true, TextAlign.End)
                Cell("ASK", 80.dp, Color.Gray, true, TextAlign.End)
            }
            
            // Rows
            DataRow("AAPL", "173.40", "173.45")
            DataRow("MSFT", "320.10", "320.15")
        }
    }
}

@Composable
fun DataRow(sym: String, bid: String, ask: String) {
    Row {
        Cell(sym, 60.dp, Color.White, false)
        Cell(bid, 80.dp, Color.White, false, TextAlign.End)
        Cell(ask, 80.dp, Color.White, false, TextAlign.End)
    }
}

@Composable
fun Cell(text: String, width: Dp, color: Color, isHeader: Boolean, align: TextAlign = TextAlign.Start) {
    Text(
        text = text,
        color = color,
        fontSize = if (isHeader) 11.sp else 12.sp,
        fontWeight = if (isHeader) FontWeight.Bold else FontWeight.Normal,
        fontFamily = FontFamily.Monospace,
        textAlign = align,
        modifier = Modifier
            .width(width)
            .border(0.5.dp, Color(0xFF333333))
            .padding(4.dp)
    )
}
```
- Chain `.verticalScroll()` and `.horizontalScroll()` on the root `Box`.
- Compose allows `.border()` directly on `Text` modifiers, making spreadsheet grids very clean to implement without wrapping everything in `Box`es.

## Do's and Don'ts
- **DO**: Use color coding (red/green) for data deltas, but keep the saturation muted to prevent eye fatigue.
- **DON'T**: Use large padding or giant H1 headers. Expert users already know what screen they are on.

## Limitations
- This is a styling reference and does not replace environment-specific validation, accessibility testing, or expert review.
- Ensure appropriate contrast ratios and responsive behaviors are verified separately.
