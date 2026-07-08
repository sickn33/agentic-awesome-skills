# Visual Effects

## Backdrop Blur

Use `expo-blur` for blur effects. Prefer systemMaterial tints as they adapt to dark mode.

```tsx
import { BlurView } from "expo-blur";

<BlurView tint="systemMaterial" intensity={100} />;
```

### Tint Options

```tsx
// System materials (adapt to dark mode)
<BlurView tint="systemMaterial" />
<BlurView tint="systemThinMaterial" />
<BlurView tint="systemUltraThinMaterial" />
<BlurView tint="systemThickMaterial" />
<BlurView tint="systemChromeMaterial" />

// Basic tints
<BlurView tint="light" />
<BlurView tint="dark" />
<BlurView tint="default" />

// Prominent (more visible)
<BlurView tint="prominent" />

// Extra light/dark
<BlurView tint="extraLight" />
```

### Intensity

Control blur strength with `intensity` (0-100):

```tsx
<BlurView tint="systemMaterial" intensity={50} />  // Subtle
<BlurView tint="systemMaterial" intensity={100} /> // Full
```

### Rounded Corners

BlurView requires `overflow: 'hidden'` to clip rounded corners:

```tsx
<BlurView
  tint="systemMaterial"
  intensity={100}
  style={{
    borderRadius: 16,
    overflow: 'hidden',
  }}
/>
```

### Overlay Pattern

Common pattern for overlaying blur on content:

```tsx
<View style={{ position: 'relative' }}>
  <Image source={{ uri: '...' }} style={{ width: '100%', height: 200 }} />
  <BlurView
    tint="systemUltraThinMaterial"
    intensity={80}
    style={{
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      padding: 16,
    }}
  >
    <Text style={{ color: 'white' }}>Caption</Text>
  </BlurView>
</View>
```

## Glass Effects (iOS 26+)

Use `expo-glass-effect` for liquid glass backdrops on iOS 26+.

```tsx
import { GlassView } from "expo-glass-effect";

<GlassView style={{ borderRadius: 16, padding: 16 }}>
  <Text>Content inside glass</Text>
</GlassView>
```

### Interactive Glass

Add `isInteractive` for buttons and pressable glass:

```tsx
import { GlassView } from "expo-glass-effect";
import { SymbolView } from "expo-symbols";
import { colors } from "@/theme/colors";

<GlassView isInteractive style={{ borderRadius: 50 }}>
  <Pressable style={{ padding: 12 }} onPress={handlePress}>
    <SymbolView name="plus" tintColor={colors.label} size={36} />
  </Pressable>
</GlassView>
```

### Glass Buttons

Create liquid glass buttons:

```tsx
function GlassButton({ icon, onPress }) {
  return (
    <GlassView isInteractive style={{ borderRadius: 50 }}>
      <Pressable style={{ padding: 12 }} onPress={onPress}>
        <SymbolView name={icon} tintColor={colors.label} size={24} />
      </Pressable>
    </GlassView>
  );
}

// Usage
<GlassButton icon="plus" onPress={handleAdd} />
<GlassButton icon="gear" onPress={handleSettings} />
```

### Glass Card

```tsx
<GlassView style={{ borderRadius: 20, padding: 20 }}>
  <Text style={{ fontSize: 18, fontWeight: '600', color: colors.label }}>
    Card Title
  </Text>
  <Text style={{ color: colors.secondaryLabel, marginTop: 8 }}>
    Card content goes here
  </Text>
</GlassView>
```

### Checking Availability

```tsx
import { isLiquidGlassAvailable } from "expo-glass-effect";

if (isLiquidGlassAvailable()) {
  // Use GlassView
} else {
  // Fallback to BlurView or solid background
}
```

### Fallback Pattern

```tsx
import { GlassView, isLiquidGlassAvailable } from "expo-glass-effect";
import { BlurView } from "expo-blur";

function AdaptiveGlass({ children, style }) {
  if (isLiquidGlassAvailable()) {
    return <GlassView style={style}>{children}</GlassView>;
  }

  return (
    <BlurView tint="systemMaterial" intensity={80} style={style}>
      {children}
    </BlurView>
  );
}
```

## Sheet with Glass Background

Make sheet backgrounds liquid glass on iOS 26+:

```tsx
<Stack.Screen
  name="sheet"
  options={{
    presentation: "formSheet",
    sheetGrabberVisible: true,
    sheetAllowedDetents: [0.5, 1.0],
    contentStyle: { backgroundColor: "transparent" },
  }}
/>
```

## Best Practices

- Use `systemMaterial` tints for automatic dark mode support
- Always set `overflow: 'hidden'` on BlurView for rounded corners
- Use `isInteractive` on GlassView for buttons and pressables
- Check `isLiquidGlassAvailable()` and provide fallbacks
- Avoid nesting blur views (performance impact)
- Keep blur intensity reasonable (50-100) for readability
