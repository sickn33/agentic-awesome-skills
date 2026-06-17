---
name: dashboard-design
description: Web and App implementation guide for Dashboard Design. Trigger when user wants analytics-focused layouts, data visualization, and modular overview screens.
date_added: "2026-06-17"
---

# Dashboard Design

> "Data at a glance. Organized, scannable, and highly functional."

## Core Principles
1. **Modular Grid**: The screen is broken down into functional "widgets" or cards. Usually a sidebar on the left and a top nav.
2. **Data Hierarchy**: The most important numbers (KPIs) are large and usually at the top. Charts take up the middle, and lists/tables are at the bottom.
3. **Muted Backgrounds**: A soft grey or off-white background so the white data cards stand out clearly.

## Visual DNA
- **Colors**: **Minimalist Slate** or **Earth-Grounded Elegance**. Avoid too many colors. Use red/green strictly for positive/negative trends.
- **Typography**: Clean, tabular sans-serifs (`Inter`, `Roboto Mono` for numbers).
- **Styling**: Very subtle shadows or 1px borders to separate cards.

## Web Implementation
- Use CSS Grid for the macro layout (Sidebar, Header, Main).
- **CSS Example**:
```css
body {
  background-color: #F8F9FA;
  color: #212529;
  font-family: 'Inter', sans-serif;
  margin: 0;
}

.dashboard-layout {
  display: grid;
  grid-template-columns: 250px 1fr;
  grid-template-rows: 70px 1fr;
  height: 100vh;
}

.sidebar {
  grid-row: 1 / 3;
  background-color: #ffffff;
  border-right: 1px solid #e9ecef;
  padding: 20px;
}

.header {
  background-color: #ffffff;
  border-bottom: 1px solid #e9ecef;
  padding: 0 30px;
  display: flex;
  align-items: center;
}

.main-content {
  padding: 30px;
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 20px;
  overflow-y: auto;
}

/* KPI Card */
.kpi-card {
  background: #fff;
  border-radius: 8px;
  padding: 24px;
  border: 1px solid #e9ecef;
  box-shadow: 0 2px 4px rgba(0,0,0,0.02);
}

.kpi-title { font-size: 0.9rem; color: #6c757d; }
.kpi-value { font-size: 2rem; font-weight: 700; margin-top: 8px; }
.kpi-trend.positive { color: #28a745; }
```

## App Implementation

### SwiftUI
```swift
struct DashboardView: View {
    // For iPad/Mac, NavigationSplitView is ideal.
    // For iPhone, we use a scrolling VGrid.
    let columns = [
        GridItem(.adaptive(minimum: 150), spacing: 16)
    ]
    
    var body: some View {
        NavigationView {
            ScrollView {
                LazyVGrid(columns: columns, spacing: 16) {
                    KPICard(title: "Revenue", value: "$45,231", trend: "+12.5%", isPositive: true)
                    KPICard(title: "Active Users", value: "2,405", trend: "+4.1%", isPositive: true)
                    KPICard(title: "Churn Rate", value: "1.2%", trend: "-0.4%", isPositive: false)
                    KPICard(title: "Avg. Session", value: "4m 12s", trend: "+0.1%", isPositive: true)
                }
                .padding()
                
                // Placeholder for Chart
                RoundedRectangle(cornerRadius: 12)
                    .fill(Color.white)
                    .frame(height: 250)
                    .overlay(Text("Chart Area").foregroundColor(.gray))
                    .padding(.horizontal)
            }
            .background(Color(UIColor.systemGroupedBackground))
            .navigationTitle("Overview")
        }
    }
}

struct KPICard: View {
    let title: String
    let value: String
    let trend: String
    let isPositive: Bool
    
    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(title).font(.subheadline).foregroundColor(.secondary)
            Text(value).font(.title2).fontWeight(.bold)
            Text(trend)
                .font(.caption)
                .fontWeight(.semibold)
                .foregroundColor(isPositive ? .green : .red)
        }
        .padding()
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Color.white)
        .cornerRadius(12)
        .shadow(color: Color.black.opacity(0.02), radius: 4, y: 2)
    }
}
```
- Dashboards require `.adaptive` grids. `LazyVGrid` handles rearranging 4 cards in a row on iPad down to 2 cards on iPhone automatically.
- Use `Color(UIColor.systemGroupedBackground)` to provide that subtle off-white contrast against stark white cards.

### Flutter
```dart
class DashboardScreen extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF8F9FA),
      appBar: AppBar(
        title: const Text('Overview', style: TextStyle(color: Colors.black)),
        backgroundColor: Colors.white,
        elevation: 1,
      ),
      // On tablets, use a Row with NavigationRail. On mobile, use Drawer.
      drawer: const Drawer(), 
      body: CustomScrollView(
        slivers: [
          SliverPadding(
            padding: const EdgeInsets.all(16),
            sliver: SliverGrid.extent(
              maxCrossAxisExtent: 200, // Adapts layout based on width
              mainAxisSpacing: 16,
              crossAxisSpacing: 16,
              childAspectRatio: 1.5,
              children: [
                _buildKPI('Revenue', '\$45,231', '+12.5%', true),
                _buildKPI('Active Users', '2,405', '+4.1%', true),
                _buildKPI('Churn Rate', '1.2%', '-0.4%', false),
                _buildKPI('Avg. Session', '4m 12s', '+0.1%', true),
              ],
            ),
          ),
          SliverPadding(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            sliver: SliverToBoxAdapter(
              child: Container(
                height: 250,
                decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(12)),
                child: const Center(child: Text('Chart Area', style: TextStyle(color: Colors.grey))),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildKPI(String title, String value, String trend, bool isPositive) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: Colors.grey[200]!),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Text(title, style: const TextStyle(color: Colors.grey, fontSize: 14)),
          const SizedBox(height: 8),
          Text(value, style: const TextStyle(fontSize: 24, fontWeight: FontWeight.bold)),
          Text(trend, style: TextStyle(color: isPositive ? Colors.green : Colors.red, fontWeight: FontWeight.w600)),
        ],
      ),
    );
  }
}
```
- `SliverGrid.extent` with a `maxCrossAxisExtent` is the responsive magic bullet for Flutter dashboards. It handles varying screen widths flawlessly.
- For charts, the `fl_chart` package is the gold standard in Flutter.

### React Native
```jsx
const DashboardScreen = () => {
  return (
    <ScrollView style={{ flex: 1, backgroundColor: '#F8F9FA' }}>
      <View style={{ padding: 16, flexDirection: 'row', flexWrap: 'wrap', gap: 16 }}>
        <KPICard title="Revenue" value="$45,231" trend="+12.5%" isPositive={true} />
        <KPICard title="Users" value="2,405" trend="+4.1%" isPositive={true} />
        <KPICard title="Churn" value="1.2%" trend="-0.4%" isPositive={false} />
        <KPICard title="Session" value="4m 12s" trend="+0.1%" isPositive={true} />
      </View>
      
      <View style={{ paddingHorizontal: 16, paddingBottom: 32 }}>
        <View style={{ height: 250, backgroundColor: '#FFF', borderRadius: 12, justifyContent: 'center', alignItems: 'center' }}>
          <Text style={{ color: '#999' }}>Chart Area</Text>
        </View>
      </View>
    </ScrollView>
  );
};

const KPICard = ({ title, value, trend, isPositive }) => (
  <View style={{
    backgroundColor: '#FFF',
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E9ECEF',
    flexBasis: '47%', // roughly half width minus gap
    minWidth: 150
  }}>
    <Text style={{ color: '#6C757D', fontSize: 14, marginBottom: 4 }}>{title}</Text>
    <Text style={{ fontSize: 22, fontWeight: '700', marginBottom: 4 }}>{value}</Text>
    <Text style={{ color: isPositive ? '#28A745' : '#DC3545', fontWeight: '600', fontSize: 12 }}>{trend}</Text>
  </View>
);
```
- To make responsive flex grids in React Native, use `flexDirection: 'row'`, `flexWrap: 'wrap'`, and set the children to `flexBasis: '47%'`.
- For heavy data visualization, look into `victory-native` or `@shopify/react-native-skia`.

### Jetpack Compose
```kotlin
@Composable
fun DashboardScreen() {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(Color(0xFFF8F9FA))
            .verticalScroll(rememberScrollState())
    ) {
        // Top App Bar substitute
        Text(
            text = "Overview",
            style = MaterialTheme.typography.headlineSmall,
            fontWeight = FontWeight.Bold,
            modifier = Modifier.padding(16.dp)
        )

        // KPI Grid
        LazyVerticalGrid(
            columns = GridCells.Adaptive(minSize = 150.dp),
            contentPadding = PaddingValues(horizontal = 16.dp),
            horizontalArrangement = Arrangement.spacedBy(16.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp),
            modifier = Modifier.heightIn(max = 400.dp) // Bound the grid height in scrollview
        ) {
            item { KPICard("Revenue", "$45,231", "+12.5%", true) }
            item { KPICard("Active Users", "2,405", "+4.1%", true) }
            item { KPICard("Churn Rate", "1.2%", "-0.4%", false) }
            item { KPICard("Avg. Session", "4m 12s", "+0.1%", true) }
        }

        Spacer(Modifier.height(16.dp))

        // Chart Area
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 16.dp)
                .height(250.dp)
                .background(Color.White, RoundedCornerShape(12.dp))
                .border(1.dp, Color(0xFFE9ECEF), RoundedCornerShape(12.dp)),
            contentAlignment = Alignment.Center
        ) {
            Text("Chart Area", color = Color.Gray)
        }
        
        Spacer(Modifier.height(32.dp))
    }
}

@Composable
fun KPICard(title: String, value: String, trend: String, isPositive: Boolean) {
    Column(
        modifier = Modifier
            .background(Color.White, RoundedCornerShape(8.dp))
            .border(1.dp, Color(0xFFE9ECEF), RoundedCornerShape(8.dp))
            .padding(16.dp)
    ) {
        Text(title, color = Color.Gray, fontSize = 14.sp)
        Spacer(Modifier.height(4.dp))
        Text(value, fontSize = 22.sp, fontWeight = FontWeight.Bold)
        Spacer(Modifier.height(4.dp))
        Text(trend, color = if (isPositive) Color(0xFF28A745) else Color(0xFFDC3545), fontWeight = FontWeight.SemiBold, fontSize = 12.sp)
    }
}
```
- `GridCells.Adaptive(minSize = 150.dp)` creates the responsive card layout automatically.
- Warning: Nesting `LazyVerticalGrid` inside a `Column` with `.verticalScroll` can cause height calculation issues. You must use `.heightIn(max=...)` on the grid, or completely convert the entire layout to a single `LazyVerticalGrid` where the chart is just a `GridItemSpan(maxLineSpan)` element.

## Do's and Don'ts
- **DO**: Right-align numbers in tables so they are easier to scan and compare.
- **DON'T**: Clutter cards with unnecessary decorative images. The data is the decoration.
