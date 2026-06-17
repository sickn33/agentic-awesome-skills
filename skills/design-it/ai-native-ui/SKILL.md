---
name: ai-native-ui
description: Web and App implementation guide for AI Native UI. Trigger when user wants conversational interfaces, adaptive layouts, and generative AI aesthetics.
---

# AI Native UI

> "Fluid, adaptive, and conversational. The interface morphs to serve the content."

## Core Principles
1. **Conversational First**: The chat input or voice prompt is the primary navigation method, not a sidebar of links.
2. **Generative States**: Loading states aren't spinners; they are shimmering text, morphing gradients, or skeletal layouts that resolve smoothly into content.
3. **Adaptive Components**: Cards and blocks size themselves dynamically based on the generated content length.

## Visual DNA
- **Colors**: **Minimalist Slate** combined with **Electric Indigo** or **Neon Pulse** gradients for the AI elements. The background is clean (white or dark grey), while the AI "presence" is represented by a shifting, iridescent gradient.
- **Typography**: Highly readable system fonts (`Inter`, `SF Pro`).
- **Styling**: Subtle glowing borders to indicate AI generation in progress.

## Web Implementation
- **CSS Example**:
```css
body {
  background-color: #FAFAFA;
  color: #1A1A1A;
  font-family: 'Inter', sans-serif;
}

/* The AI Chat Input */
.ai-prompt-box {
  background: #ffffff;
  border-radius: 24px;
  padding: 16px 24px;
  box-shadow: 0 8px 30px rgba(0,0,0,0.05);
  border: 1px solid transparent;
  
  /* AI Glow Border */
  background-clip: padding-box, border-box;
  background-origin: padding-box, border-box;
  background-image: 
    linear-gradient(#ffffff, #ffffff), 
    linear-gradient(90deg, #8A2387, #E94057, #F27121);
    
  transition: all 0.3s ease;
}

.ai-prompt-box:focus-within {
  box-shadow: 0 12px 40px rgba(233, 64, 87, 0.15);
}

/* Generative Shimmer Text */
.ai-generating-text {
  background: linear-gradient(90deg, #aaa 0%, #333 50%, #aaa 100%);
  background-size: 200% auto;
  color: transparent;
  -webkit-background-clip: text;
  animation: shine 1.5s linear infinite;
}

@keyframes shine {
  to { background-position: 200% center; }
}
```

## App Implementation

### SwiftUI
```swift
struct AINativeInput: View {
    @State private var isGenerating = true
    @State private var gradientOffset = 0.0
    
    var body: some View {
        VStack {
            // Generative Text Shimmer
            if isGenerating {
                Text("Synthesizing response...")
                    .font(.headline)
                    .foregroundStyle(
                        LinearGradient(
                            colors: [.gray.opacity(0.3), .gray, .gray.opacity(0.3)],
                            startPoint: UnitPoint(x: gradientOffset - 1, y: 0),
                            endPoint: UnitPoint(x: gradientOffset + 1, y: 0)
                        )
                    )
                    .onAppear {
                        withAnimation(.linear(duration: 1.5).repeatForever(autoreverses: false)) {
                            gradientOffset = 1.0
                        }
                    }
            }
            
            // AI Input Box
            HStack {
                TextField("Ask anything...", text: .constant(""))
                Image(systemName: "sparkles")
                    .foregroundColor(.purple)
            }
            .padding()
            .background(Color.white)
            .cornerRadius(24)
            .overlay(
                RoundedRectangle(cornerRadius: 24)
                    .stroke(
                        LinearGradient(colors: [.purple, .pink, .orange], startPoint: .topLeading, endPoint: .bottomTrailing),
                        lineWidth: 2
                    )
            )
            .shadow(color: .pink.opacity(0.15), radius: 20)
        }
        .padding()
    }
}
```
- A shifting `LinearGradient` mask over text creates a beautiful "thinking" state.
- Use a gradient `.stroke` on a `RoundedRectangle` overlay to create the signature AI glowing border around input fields.

### Flutter
```dart
import 'package:shimmer/shimmer.dart';

class AINativeInput extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.all(16.0),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          // Generative Shimmer
          Shimmer.fromColors(
            baseColor: Colors.grey[300]!,
            highlightColor: Colors.grey[600]!,
            child: const Text('Synthesizing response...',
                style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
          ),
          const SizedBox(height: 16),
          // AI Input Box
          Container(
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(24),
              boxShadow: [
                BoxShadow(color: Colors.pink.withOpacity(0.15), blurRadius: 20),
              ],
            ),
            child: Container(
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(24),
                // Gradient border simulation
                gradient: const LinearGradient(
                  colors: [Colors.purple, Colors.pink, Colors.orange],
                ),
              ),
              padding: const EdgeInsets.all(2), // Border width
              child: Container(
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(22),
                ),
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
                child: Row(
                  children: const [
                    Expanded(
                      child: TextField(
                        decoration: InputDecoration(
                          hintText: 'Ask anything...',
                          border: InputBorder.none,
                        ),
                      ),
                    ),
                    Icon(Icons.auto_awesome, color: Colors.purple),
                  ],
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
```
- The `shimmer` package is the absolute standard for AI loading states in Flutter.
- Gradient borders natively don't exist on `BoxDecoration`; simulate them by nesting containers with a gradient background and a solid white inner container.

### React Native
```jsx
// Requires react-native-linear-gradient and react-native-shimmer-placeholder
import LinearGradient from 'react-native-linear-gradient';
import { createShimmerPlaceholder } from 'react-native-shimmer-placeholder';

const ShimmerPlaceHolder = createShimmerPlaceholder(LinearGradient);

const AINativeInput = () => {
  return (
    <View style={{ padding: 16 }}>
      {/* Generative Shimmer */}
      <ShimmerPlaceHolder 
        style={{ width: 200, height: 20, borderRadius: 10, marginBottom: 16 }}
        shimmerColors={['#ebebeb', '#c5c5c5', '#ebebeb']}
      />
      
      {/* AI Input Box with Gradient Border */}
      <LinearGradient
        colors={['#8A2387', '#E94057', '#F27121']}
        style={{ borderRadius: 24, padding: 2, shadowColor: '#E94057', shadowRadius: 20, shadowOpacity: 0.2 }}
      >
        <View style={{ 
          backgroundColor: '#FFF', 
          borderRadius: 22, 
          flexDirection: 'row', 
          alignItems: 'center',
          paddingHorizontal: 16,
          height: 50
        }}>
          <TextInput 
            placeholder="Ask anything..." 
            style={{ flex: 1, fontSize: 16 }} 
          />
          <Text style={{ fontSize: 20 }}>✨</Text>
        </View>
      </LinearGradient>
    </View>
  );
};
```
- `react-native-shimmer-placeholder` is the best way to handle the morphing skeleton states.
- Like Flutter, React Native doesn't have native gradient borders. Wrap the input in a `LinearGradient` view with `padding: 2` to create the stroke.

### Jetpack Compose
```kotlin
@Composable
fun AINativeInput() {
    val infiniteTransition = rememberInfiniteTransition()
    val gradientOffset by infiniteTransition.animateFloat(
        initialValue = 0f,
        targetValue = 1000f,
        animationSpec = infiniteRepeatable(
            animation = tween(1500, easing = LinearEasing),
            repeatMode = RepeatMode.Restart
        )
    )

    Column(modifier = Modifier.padding(16.dp)) {
        // Generative Shimmer Text
        val shimmerBrush = Brush.linearGradient(
            colors = listOf(Color.LightGray, Color.Gray, Color.LightGray),
            start = Offset(gradientOffset - 500f, 0f),
            end = Offset(gradientOffset, 0f)
        )
        Text("Synthesizing response...", style = TextStyle(brush = shimmerBrush, fontWeight = FontWeight.Bold))
        
        Spacer(Modifier.height(16.dp))
        
        // AI Input Box
        val borderBrush = Brush.linearGradient(listOf(Color(0xFF8A2387), Color(0xFFE94057), Color(0xFFF27121)))
        
        Row(
            modifier = Modifier
                .shadow(20.dp, RoundedCornerShape(24.dp), ambientColor = Color(0xFFE94057), spotColor = Color(0xFFE94057))
                .background(Color.White, RoundedCornerShape(24.dp))
                .border(2.dp, borderBrush, RoundedCornerShape(24.dp))
                .padding(horizontal = 16.dp, vertical = 12.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            BasicTextField(
                value = "",
                onValueChange = {},
                modifier = Modifier.weight(1f),
                decorationBox = { innerTextField -> Text("Ask anything...", color = Color.Gray) }
            )
            Icon(Icons.Default.Star, contentDescription = null, tint = Color(0xFF8A2387))
        }
    }
}
```
- Compose allows passing a `Brush` directly into the `TextStyle`, making shimmering text incredibly easy without third-party libraries.
- Compose's `Modifier.border()` natively accepts a `Brush`, making gradient borders a one-liner.

## Do's and Don'ts
- **DO**: Use a distinct, vibrant gradient to represent the AI "agent", contrasting with a very plain, clean background.
- **DON'T**: Use complex navigation headers. The user should navigate by asking the AI, not by clicking deep menus.
