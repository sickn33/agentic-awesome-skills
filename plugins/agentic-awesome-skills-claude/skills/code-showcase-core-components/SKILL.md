---
name: code-showcase-core-components
description: "Apply the ChrisWiles code-showcase component and token conventions when the target project actually uses that API; examples require local adaptation."
risk: none
source: https://github.com/ChrisWiles/claude-code-showcase/tree/main/.claude/skills/core-components
source_repo: ChrisWiles/claude-code-showcase
source_type: community
date_added: 2026-07-01
license: MIT
license_source: https://github.com/ChrisWiles/claude-code-showcase/blob/main/README.md#license
---

# Core Components
## When to Use

Use when maintaining a project that follows the ChrisWiles showcase component conventions. For a different or unknown library, start with `core-components` and map its examples to the actual project API; do not install both expecting additional components.


This entry describes the upstream project's component API/token names, not a bundled component library or universal React Native API. Verify actual exports, tokens and props in the target repository before using snippets. CardProps/variantStyles, handlers and imported components are illustrative dependencies; token use alone does not prove contrast, labeling or behavior.

## Design System Overview

Reuse verified project primitives when they provide the required semantics and behavior. Native components remain appropriate when no equivalent primitive exists; token use alone does not establish accessibility.

## Design Tokens

Prefer the project's existing semantic tokens. If no token expresses the requirement, document the exception or propose a scoped token addition; do not invent token names or change the whole design system.

### Spacing Tokens

```tsx
// CORRECT - Use tokens
<Box padding="$4" marginBottom="$2" />

// WRONG - Hard-coded values
<Box padding={16} marginBottom={8} />
```

| Token | Value |
|-------|-------|
| `$1` | 4px |
| `$2` | 8px |
| `$3` | 12px |
| `$4` | 16px |
| `$6` | 24px |
| `$8` | 32px |

### Color Tokens

```tsx
// CORRECT - Semantic tokens
<Text color="$textPrimary" />
<Box backgroundColor="$backgroundSecondary" />

// WRONG - Hard-coded colors
<Text color="#333333" />
<Box backgroundColor="rgb(245, 245, 245)" />
```

| Semantic Token | Use For |
|----------------|---------|
| `$textPrimary` | Main text |
| `$textSecondary` | Supporting text |
| `$textTertiary` | Disabled/hint text |
| `$primary500` | Brand/accent color |
| `$statusError` | Error states |
| `$statusSuccess` | Success states |

### Typography Tokens

```tsx
<Text fontSize="$lg" fontWeight="$semibold" />
```

| Token | Size |
|-------|------|
| `$xs` | 12px |
| `$sm` | 14px |
| `$md` | 16px |
| `$lg` | 18px |
| `$xl` | 20px |
| `$2xl` | 24px |

## Core Components

### Box

Base layout component with token support:

```tsx
<Box
  padding="$4"
  backgroundColor="$backgroundPrimary"
  borderRadius="$lg"
>
  {children}
</Box>
```

### HStack / VStack

Horizontal and vertical flex layouts:

```tsx
<HStack gap="$3" alignItems="center">
  <Icon name="user" />
  <Text>Username</Text>
</HStack>

<VStack gap="$4" padding="$4">
  <Heading>Title</Heading>
  <Text>Content</Text>
</VStack>
```

### Text

Typography with token support:

```tsx
<Text
  fontSize="$lg"
  fontWeight="$semibold"
  color="$textPrimary"
>
  Hello World
</Text>
```

### Button

Interactive button with variants:

```tsx
<Button
  onPress={handlePress}
  variant="solid"
  size="md"
  isLoading={loading}
  isDisabled={disabled}
>
  Click Me
</Button>
```

| Variant | Use For |
|---------|---------|
| `solid` | Primary actions |
| `outline` | Secondary actions |
| `ghost` | Tertiary/subtle actions |
| `link` | Inline actions |

### Input

Form input with validation:

```tsx
<Input
  value={value}
  onChangeText={setValue}
  placeholder="Enter text"
  error={touched ? errors.field : undefined}
  label="Field Name"
/>
```

### Card

Content container:

```tsx
<Card padding="$4" gap="$3">
  <CardHeader>
    <Heading size="sm">Card Title</Heading>
  </CardHeader>
  <CardBody>
    <Text>Card content</Text>
  </CardBody>
</Card>
```

## Layout Patterns

### Screen Layout

```tsx
const MyScreen = () => (
  <Screen>
    <ScreenHeader title="Page Title" />
    <ScreenContent padding="$4">
      {/* Content */}
    </ScreenContent>
  </Screen>
);
```

### Form Layout

```tsx
<VStack gap="$4" padding="$4">
  <Input label="Name" {...nameProps} />
  <Input label="Email" {...emailProps} />
  <Button isLoading={loading}>Submit</Button>
</VStack>
```

### List Item Layout

```tsx
<HStack
  padding="$4"
  gap="$3"
  alignItems="center"
  borderBottomWidth={1}
  borderColor="$borderLight"
>
  <Avatar source={{ uri: imageUrl }} size="md" />
  <VStack flex={1}>
    <Text fontWeight="$semibold">{title}</Text>
    <Text color="$textSecondary" fontSize="$sm">{subtitle}</Text>
  </VStack>
  <Icon name="chevron-right" color="$textTertiary" />
</HStack>
```

## Anti-Patterns

```tsx
// WRONG - Hard-coded values
<View style={{ padding: 16, backgroundColor: '#fff' }}>

// CORRECT - Design tokens
<Box padding="$4" backgroundColor="$backgroundPrimary">


// Native components: valid when the project has no equivalent primitive
import { View, Text } from 'react-native';

// Project primitives: use only if these exports exist and preserve behavior
import { Box, Text } from 'components/core';


// WRONG - Inline styles
<Text style={{ fontSize: 18, fontWeight: '600' }}>

// CORRECT - Token props
<Text fontSize="$lg" fontWeight="$semibold">
```

## Component Props Pattern

When creating components, use token-based props:

```tsx
interface CardProps {
  padding?: '$2' | '$4' | '$6';
  variant?: 'elevated' | 'outlined' | 'filled';
  children: React.ReactNode;
}

const Card = ({ padding = '$4', variant = 'elevated', children }: CardProps) => (
  <Box
    padding={padding}
    backgroundColor="$backgroundPrimary"
    borderRadius="$lg"
    {...variantStyles[variant]}
  >
    {children}
  </Box>
);
```

## Integration with Other Skills

- **react-ui-patterns**: Use core components for UI states
- **testing-patterns**: Mock core components in tests
- Existing project Storybook, if configured: document component variants; no `storybook` skill or setup is bundled here.

## Worked example: adapt a settings form

Given a request to add an email field to an existing settings screen:

1. Inspect the screen, component exports, token definitions and an existing validated field.
2. Reuse the actual input API and semantic spacing/color tokens. The `onChangeText` and `$4` examples above apply only if the project defines them.
3. Preserve the visible label, error association, keyboard focus and submit behavior. Check light/dark contrast using the rendered result.
4. Return the changed file paths, the existing components reused and the checks actually run. If the project has no such library, state that prerequisite instead of fabricating `components/core` imports.

## Limitations

- Use this skill only when the task clearly matches its upstream source and local project context.
- Verify commands, generated code, dependencies, credentials, and external service behavior before applying changes.
- Do not treat examples as a substitute for environment-specific tests, security review, or user approval for destructive or costly actions.
