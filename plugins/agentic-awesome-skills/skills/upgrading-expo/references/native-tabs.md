# Native Tabs Migration (SDK 55)

In SDK 55, `Label`, `Icon`, `Badge`, and `VectorIcon` are now accessed as static properties on `NativeTabs.Trigger` rather than separate imports.

## Import Changes

```tsx
// SDK 53/54
import {
  NativeTabs,
  Icon,
  Label,
  Badge,
  VectorIcon,
} from "expo-router/unstable-native-tabs";

// SDK 55+
import { NativeTabs } from "expo-router/unstable-native-tabs";
```

## Component Changes

| SDK 53/54        | SDK 55+                             |
| ---------------- | ----------------------------------- |
| `<Icon />`       | `<NativeTabs.Trigger.Icon />`       |
| `<Label />`      | `<NativeTabs.Trigger.Label />`      |
| `<Badge />`      | `<NativeTabs.Trigger.Badge />`      |
| `<VectorIcon />` | `<NativeTabs.Trigger.VectorIcon />` |
| (n/a)            | `<NativeTabs.BottomAccessory />`    |

## New in SDK 55

### BottomAccessory

New component for Apple Music-style mini players on iOS +26 that float above the tab bar:

```tsx
<NativeTabs>
  <NativeTabs.BottomAccessory>
    {/* Content above tabs */}
  </NativeTabs.BottomAccessory>
  <NativeTabs.Trigger name="(index)">
    <NativeTabs.Trigger.Label>Home</NativeTabs.Trigger.Label>
  </NativeTabs.Trigger>
</NativeTabs>
```

On Android and web, this component will render as a no-op. Position a view absolutely above the tab bar instead.

### Icon `md` Prop

New `md` prop for Material icon glyphs on Android (alongside existing `drawable`):

```tsx
<NativeTabs.Trigger.Icon sf="house" md="home" />
```

## Full Migration Example

### Before (SDK 53/54)

```tsx
import {
  NativeTabs,
  Icon,
  Label,
  Badge,
} from "expo-router/unstable-native-tabs";

export default function TabLayout() {
  return (
    <NativeTabs minimizeBehavior="onScrollDown">
      <NativeTabs.Trigger name="(index)">
        <Label>Home</Label>
        <Icon sf="house.fill" />
        <Badge>3</Badge>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="(settings)">
        <Label>Settings</Label>
        <Icon sf="gear" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="(search)" role="search">
        <Label>Search</Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
```

### After (SDK 55+)

```tsx
import { NativeTabs } from "expo-router/unstable-native-tabs";

export default function TabLayout() {
  return (
    <NativeTabs minimizeBehavior="onScrollDown">
      <NativeTabs.Trigger name="(index)">
        <NativeTabs.Trigger.Label>Home</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="house.fill" md="home" />
        <NativeTabs.Trigger.Badge>3</NativeTabs.Trigger.Badge>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="(settings)">
        <NativeTabs.Trigger.Label>Settings</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="gear" md="settings" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="(search)" role="search">
        <NativeTabs.Trigger.Label>Search</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
```

## Migration Checklist

1. Remove `Icon`, `Label`, `Badge`, `VectorIcon` from imports
2. Keep only `NativeTabs` import from `expo-router/unstable-native-tabs`
3. Replace `<Icon />` with `<NativeTabs.Trigger.Icon />`
4. Replace `<Label />` with `<NativeTabs.Trigger.Label />`
5. Replace `<Badge />` with `<NativeTabs.Trigger.Badge />`
6. Replace `<VectorIcon />` with `<NativeTabs.Trigger.VectorIcon />`

- Read docs for more info https://docs.expo.dev/versions/v55.0.0/sdk/router-native-tabs/
