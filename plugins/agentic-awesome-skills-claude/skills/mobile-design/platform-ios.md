# iOS Platform Guidelines

> Human Interface Guidelines (HIG) essentials, iOS design conventions, SF Pro typography, and native patterns.
> **Read this file when building for iPhone/iPad.**

---

## 1. Human Interface Guidelines Philosophy

### Core Apple Design Principles

```
CLARITY:
├── Text is legible at every size
├── Icons are precise and lucid
├── Adornments are subtle and appropriate
└── Focus on functionality drives design

DEFERENCE:
├── UI helps people understand and interact
├── Content fills the screen
├── UI never competes with content
└── Translucency hints at more content

DEPTH:
├── Distinct visual layers convey hierarchy
├── Transitions provide sense of depth
├── Touch reveals functionality
└── Content is elevated over UI
```

### iOS Design Values

| Value | Implementation |
|-------|----------------|
| **Aesthetic Integrity** | Design matches function (game ≠ productivity) |
| **Consistency** | Use system controls, familiar patterns |
| **Direct Manipulation** | Touch directly affects content |
| **Feedback** | Actions are acknowledged |
| **Metaphors** | Real-world comparisons aid understanding |
| **User Control** | User initiates actions, can cancel |

---

## 2. iOS Typography

### SF Pro Font Family

```
iOS System Fonts:
├── SF Pro Text: Body text (< 20pt)
├── SF Pro Display: Large titles (≥ 20pt)
├── SF Pro Rounded: Friendly contexts
├── SF Mono: Code, tabular data
└── SF Compact: Apple Watch, smaller screens
```

### iOS Type Scale (Dynamic Type)

| Style | Default Size | Weight | Usage |
|-------|--------------|--------|-------|
| **Large Title** | 34pt | Bold | Navigation bar (scroll collapse) |
| **Title 1** | 28pt | Bold | Page titles |
| **Title 2** | 22pt | Bold | Section headers |
| **Title 3** | 20pt | Semibold | Subsection headers |
| **Headline** | 17pt | Semibold | Emphasized body |
| **Body** | 17pt | Regular | Primary content |
| **Callout** | 16pt | Regular | Secondary content |
| **Subhead** | 15pt | Regular | Tertiary content |
| **Footnote** | 13pt | Regular | Caption, timestamps |
| **Caption 1** | 12pt | Regular | Annotations |
| **Caption 2** | 11pt | Regular | Fine print |

### Dynamic Type Support (MANDATORY)

```swift
// ❌ WRONG: Fixed font size
Text("Hello")
    .font(.system(size: 17))

// ✅ CORRECT: Dynamic Type
Text("Hello")
    .font(.body) // Scales with user settings

// React Native equivalent
<Text style={{ fontSize: 17 }}> // RN allowFontScaling is true by default; test layout at large sizes
<Text style={styles.body}> // Use a dynamic scale system
```

### Font Weight Usage

| Weight | iOS Constant | Use Case |
|--------|--------------|----------|
| Regular (400) | `.regular` | Body text |
| Medium (500) | `.medium` | Buttons, emphasis |
| Semibold (600) | `.semibold` | Subheadings |
| Bold (700) | `.bold` | Titles, key info |
| Heavy (800) | `.heavy` | Rarely, marketing |

---

## 3. iOS Color System

### System Colors (Semantic)

```
Use semantic colors for automatic dark mode:

Primary:
├── .label → Primary text
├── .secondaryLabel → Secondary text
├── .tertiaryLabel → Tertiary text
├── .quaternaryLabel → Watermarks

Backgrounds:
├── .systemBackground → Main background
├── .secondarySystemBackground → Grouped content
├── .tertiarySystemBackground → Elevated content

Fills:
├── .systemFill → Large shapes
├── .secondarySystemFill → Medium shapes
├── .tertiarySystemFill → Small shapes
├── .quaternarySystemFill → Subtle shapes
```

### System Accent Colors

| Color | Light Mode | Dark Mode | Usage |
|-------|------------|-----------|-------|
| Blue | #007AFF | #0A84FF | Links, highlights, default tint |
| Green | #34C759 | #30D158 | Success, positive |
| Red | #FF3B30 | #FF453A | Errors, destructive |
| Orange | #FF9500 | #FF9F0A | Warnings |
| Yellow | #FFCC00 | #FFD60A | Attention |
| Purple | #AF52DE | #BF5AF2 | Special features |
| Pink | #FF2D55 | #FF375F | Affection, favorites |
| Teal | #5AC8FA | #64D2FF | Information |

### Dark Mode Considerations

```
iOS Dark Mode is not inverted light mode:

LIGHT MODE:              DARK MODE:
├── White backgrounds    ├── True black (#000) or near-black
├── High saturation      ├── Desaturated colors
├── Black text           ├── White/light gray text
└── Drop shadows         └── Glows or no shadows

RULE: Always use semantic colors for automatic adaptation.
```

---

## 4. iOS Layout & Spacing

### Safe Areas

```
┌─────────────────────────────────────┐
│░░░░░░░░░░░ Status Bar ░░░░░░░░░░░░░│ ← Top safe area inset
├─────────────────────────────────────┤
│                                     │
│                                     │
│         Safe Content Area           │
│                                     │
│                                     │
├─────────────────────────────────────┤
│░░░░░░░░░ Home Indicator ░░░░░░░░░░░│ ← Bottom safe area inset
└─────────────────────────────────────┘

RULE: Never place interactive content in unsafe areas.
```

### Standard Margins & Padding

| Element | Margin | Notes |
|---------|--------|-------|
| Screen edge → content | 16pt | Standard horizontal margin |
| Grouped table sections | 16pt top/bottom | Breathing room |
| List item padding | 16pt horizontal | Standard cell padding |
| Card internal padding | 16pt | Content within cards |
| Button internal padding | 12pt vertical, 16pt horizontal | Minimum |

### iOS Grid System

```
iPhone Grid (Standard):
├── 16pt margins (left/right)
├── 8pt minimum spacing
├── Content in 8pt multiples

iPhone Grid (Compact):
├── 8pt margins (when needed)
├── 4pt minimum spacing

iPad Grid:
├── 20pt margins (or more)
├── Consider multi-column layouts
```

---

## 5. iOS Navigation Patterns

### Navigation Types

| Pattern | Use Case | Implementation |
|---------|----------|----------------|
| **Tab Bar** | 3-5 top-level sections | Bottom, always visible |
| **Navigation Controller** | Hierarchical drill-down | Stack-based, back button |
| **Modal** | Focused task, interruption | Sheet or full-screen |
| **Sidebar** | iPad, multi-column | Left sidebar (iPad) |

### Tab Bar Guidelines

```
┌─────────────────────────────────────┐
│                                     │
│         Content Area                │
│                                     │
├─────────────────────────────────────┤
│  🏠     🔍     ➕     ❤️     👤    │ ← Tab bar (49pt height)
│ Home   Search  New   Saved  Profile │
└─────────────────────────────────────┘

Rules:
├── 3-5 items maximum
├── Icons: SF Symbols or custom (25×25pt)
├── Labels: Always include (accessibility)
├── Active state: Filled icon + tint color
└── Tab bar always visible (don't hide on scroll)
```

### Navigation Bar Guidelines

```
┌─────────────────────────────────────┐
│ < Back     Page Title      Edit    │ ← Navigation bar (44pt)
├─────────────────────────────────────┤
│                                     │
│         Content Area                │
│                                     │
└─────────────────────────────────────┘

Rules:
├── Back button: System chevron + previous title (or "Back")
├── Title: Centered, dynamic font
├── Right actions: Max 2 items
├── Large title: Collapses on scroll (optional)
└── Prefer text buttons over icons (clarity)
```

### Modal Presentations

| Style | Use Case | Appearance |
|-------|----------|------------|
| **Sheet (default)** | Secondary tasks | Card slides up, parent visible |
| **Full Screen** | Immersive tasks | Covers entire screen |
| **Popover** | iPad, quick info | Arrow-pointed bubble |
| **Alert** | Critical interruption | Centered dialog |
| **Action Sheet** | Choices from context | Bottom sheet with options |

### Gestures

| Gesture | iOS Convention |
|---------|----------------|
| **Edge swipe (left)** | Navigate back |
| **Pull down (sheet)** | Dismiss modal |
| **Long press** | Context menu |
| **Deep press** | Peek/Pop (legacy) |
| **Two-finger swipe** | Scroll in nested scroll |

---

## 6. iOS Components

### Buttons

```
Button Styles (UIKit/SwiftUI):

┌──────────────────────────────┐
│     Bordered prominent       │ ← Prominent SwiftUI action (style depends on OS)
├──────────────────────────────┤
│         Bordered             │ ← Secondary action (outline)
├──────────────────────────────┤
│         Plain                │ ← Tertiary action (text only)
└──────────────────────────────┘

Sizes:
├── Mini: Tight spaces
├── Small: Compact UI
├── Medium: Inline actions
├── Large: Primary CTAs (44pt minimum height)
```

### Lists & Tables

```
List Styles:

.plain         → Plain list; separators are configurable
.insetGrouped  → Rounded cards (default iOS 14+)
.grouped       → Full-width sections
.sidebar       → iPad sidebar navigation

Cell Accessories:
├── Disclosure indicator (>) → Navigates to detail
├── Detail button (i) → Shows info without navigation
├── Checkmark (✓) → Selection
├── Reorder (≡) → Drag to reorder
└── Delete (-) → Swipe/edit mode delete
```

### Text Fields

```
iOS Text Field Anatomy:

┌─────────────────────────────────────┐
│ 🔍 Search...                    ✕  │
└─────────────────────────────────────┘
  ↑                               ↑
  Leading icon                   Clear button

Borders: Rounded rectangle
Height: 36pt minimum
Placeholder: Secondary text color
Clear button: Appears when has text
```

### Segmented Controls

```
When to Use:
├── 2-5 related options
├── Filter content
├── Switch views

┌───────┬───────┬───────┐
│  All  │ Active│ Done  │
└───────┴───────┴───────┘

Rules:
├── Equal width segments
├── Text or icons (not both mixed)
├── Max 5 segments
└── Consider tabs if more complex
```

---

## 7. iOS Specific Patterns

### Pull to Refresh

```
Native UIRefreshControl behavior:
├── Pull beyond threshold → Spinner appears
├── Release → Refresh action triggered
├── Loading state → Spinner spins
├── Complete → Spinner disappears

RULE: Always use native UIRefreshControl (don't custom build).
```

### Swipe Actions

```
iOS swipe actions:

← Swipe Left (Destructive)      Swipe Right (Constructive) →
┌─────────────────────────────────────────────────────────────┐
│                    List Item Content                        │
└─────────────────────────────────────────────────────────────┘

Left swipe reveals: Archive, Delete, Flag
Right swipe reveals: Pin, Star, Mark as Read

Full swipe: Triggers first action
```

### Context Menus

```
Long press → Context menu appears

┌─────────────────────────────┐
│       Preview Card          │
├─────────────────────────────┤
│  📋 Copy                    │
│  📤 Share                   │
│  ➕ Add to...               │
├─────────────────────────────┤
│  🗑️ Delete          (Red)   │
└─────────────────────────────┘

Rules:
├── Preview: Show enlarged content
├── Actions: Related to content
├── Destructive: Last, in red
└── Max ~8 actions (scrollable if more)
```

### Sheets & Half-Sheets

```
iOS 15+ Sheets:

┌─────────────────────────────────────┐
│                                     │
│        Parent View (dimmed)          │
│                                     │
├─────────────────────────────────────┤
│  ═══  (Grabber)                     │ ← Drag to resize
│                                     │
│        Sheet Content                │
│                                     │
│                                     │
└─────────────────────────────────────┘

Detents:
├── .medium → Half screen
├── .large → Full screen (with safe area)
├── Custom → Specific height
```

---

## 8. SF Symbols

### Usage Guidelines

```
SF Symbols: Apple's icon library (5000+ icons)

Weights: Match text weight
├── Ultralight / Thin / Light
├── Regular / Medium / Semibold
├── Bold / Heavy / Black

Scales:
├── .small → Inline with small text
├── .medium → Standard UI
├── .large → Emphasis, standalone
```

### Symbol Configurations

```swift
// SwiftUI
Image(systemName: "star.fill")
    .font(.title2)
    .foregroundStyle(.yellow)

// With rendering mode
Image(systemName: "heart.fill")
    .symbolRenderingMode(.multicolor)

// Animated (iOS 17+)
Image(systemName: "checkmark.circle")
    .symbolEffect(.bounce)
```

### Symbol Best Practices

| Guideline | Implementation |
|-----------|----------------|
| Match text weight | Symbol weight = font weight |
| Use standard symbols | Users recognize them |
| Multicolor when meaningful | Not just decoration |
| Fallback for older iOS | Check availability |

---

## 9. iOS Accessibility

### VoiceOver Requirements

```
Every interactive element needs:
├── Accessibility label (what it is)
├── Accessibility hint (what it does) - optional
├── Accessibility traits (button, link, etc.)
└── Accessibility value (current state)

SwiftUI:
.accessibilityLabel("Play")
.accessibilityHint("Plays the selected track")

React Native:
accessibilityLabel="Play"
accessibilityHint="Plays the selected track"
accessibilityRole="button"
```

### Dynamic Type Scaling

```
MANDATORY: Support Dynamic Type

Users can set text size from:
├── xSmall → 14pt body
├── Small → 15pt body
├── Medium → 16pt body
├── Large (Default) → 17pt body
├── xLarge → 19pt body
├── xxLarge → 21pt body
├── xxxLarge → 23pt body
├── Accessibility sizes → up to 53pt

Your app MUST scale gracefully at all sizes.
```

### Reduce Motion

```
Respect motion preferences:

@Environment(\.accessibilityReduceMotion) var reduceMotion

if reduceMotion {
    // Use instant transitions
} else {
    // Use animations
}

React Native:
import { AccessibilityInfo } from 'react-native';
AccessibilityInfo.isReduceMotionEnabled()
```

---

## 10. iOS Checklist

### Before Every iOS Screen

- [ ] Using SF Pro or SF Symbols
- [ ] Dynamic Type supported
- [ ] Safe areas respected
- [ ] Navigation follows HIG (back gesture works)
- [ ] Tab bar items ≤ 5
- [ ] Touch targets ≥ 44pt

### Before iOS Release

- [ ] Dark mode tested
- [ ] All text sizes tested (Accessibility Inspector)
- [ ] VoiceOver tested
- [ ] Edge swipe back works everywhere
- [ ] Keyboard avoidance implemented
- [ ] Notch/Dynamic Island handled
- [ ] Home indicator area respected
- [ ] Native components used where possible

---

> **Remember:** iOS users have strong expectations from other iOS apps. Deviating from HIG patterns feels "broken" to them. When in doubt, use the native component.

## Version and adaptive-layout boundaries

Bar heights, icon counts, margins and font tables are illustrative legacy defaults,
not fixed HIG dimensions for every OS, Dynamic Type setting or device. Query safe
areas and use system/adaptive controls. SwiftUI presentationDetents needs iOS 16+;
UIKit sheet detents arrived earlier. Custom SF font/Symbol use has Apple licensing
and platform limits; do not redistribute those assets to other platforms blindly.
Two-finger scrolling is a screen-reader interaction, not a universal nested-scroll
gesture. Standard back behavior should be preserved without obstructing legitimate
unsaved-work protection and accessibility alternatives.
