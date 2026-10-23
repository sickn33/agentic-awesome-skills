---
name: mobile-design
description: "Design and review iOS, Android, React Native or Flutter interfaces for touch, accessibility, navigation, offline behavior and measured performance. Use for mobile app UI work; not a mobile compliance certification."
risk: critical
source: community
date_added: "2026-02-27"
---
# Mobile Design System

**(Mobile-First · Touch-First · Platform-Respectful)**

> **Philosophy:** Touch-first. Battery-conscious. Platform-respectful. Offline-capable.
> **Core Law:** Mobile is NOT a small desktop.
> **Operating Rule:** Think constraints first, aesthetics second.

This skill exists to **prevent desktop-thinking, AI-defaults, and unsafe assumptions** when designing or building mobile applications.

---

## 1. Scope and risk

Use the existing project/platform requirements and preserve its conventions.
Ask only for missing information that changes the implementation. Do not require
an interview or framework switch for a targeted fix. The former MFRI score was an
unvalidated heuristic with inconsistent dimensions/range; it is not a safety or
release gate. Record concrete interaction, data, accessibility and performance
risks instead.

## 2. Choose the relevant checks

For a new app, establish platform, framework, audience, device classes, navigation,
offline needs and actual output. For existing work, reuse that context. Read only
the reference material needed for the changed behavior. User scope and repository
instructions take precedence over this skill's suggested ceremony.

## 3. Mandatory Reference Reading (Enforced)

### Reference map (read what the task needs)

| File                          | Purpose                            | Status            |
| ----------------------------- | ---------------------------------- | ----------------- |
| **mobile-design-thinking.md** | Anti-memorization, context-forcing | Context reference |
| **touch-psychology.md**       | Fitts’ Law, thumb zones, gestures  | Task-dependent       |
| **mobile-performance.md**     | 60fps, memory, battery             | Task-dependent       |
| **mobile-backend.md**         | Offline sync, push, APIs           | Task-dependent       |
| **mobile-testing.md**         | Device & E2E testing               | Task-dependent       |
| **mobile-debugging.md**       | Native vs JS debugging             | Task-dependent       |

### Platform-Specific (Conditional)

| Platform       | File                |
| -------------- | ------------------- |
| iOS            | platform-ios.md     |
| Android        | platform-android.md |
| Cross-platform | BOTH above          |

Read the relevant platform guidance before changing platform-specific behavior.

---

## 4. AI Mobile Anti-Patterns (Hard Bans)

### 🚫 Performance Sins (Non-Negotiable)

| ❌ Never                   | Why                  | ✅ Always                                |
| ------------------------- | -------------------- | --------------------------------------- |
| ScrollView for long lists | Memory explosion     | FlatList / FlashList / ListView.builder |
| Unmeasured row churn | May cause avoidable work | Profile identity/state updates; memoize only where useful |
| Index as key              | Reorder bugs         | Stable ID                               |
| JS-thread animations      | Jank                 | Native driver / GPU                     |
| console.log in prod       | JS thread block      | Strip logs                              |
| Blanket memoization claims | Can add complexity without benefit | Profile and apply targeted optimization |

---

### 🚫 Touch & UX Sins

| ❌ Never               | Why                  | ✅ Always          |
| --------------------- | -------------------- | ----------------- |
| Undersized hit area | Miss taps | Use platform logical units: typically 44pt iOS / 48dp Android |
| Gesture-only action   | Excludes users       | Button fallback   |
| No loading state      | Feels broken         | Explicit feedback |
| No error recovery     | Dead end             | Retry + message   |
| Ignore platform norms | Muscle memory broken | iOS ≠ Android     |

---

### 🚫 Security Sins

| ❌ Never                | Why                | ✅ Always               |
| ---------------------- | ------------------ | ---------------------- |
| Tokens in AsyncStorage | Easily stolen      | SecureStore / Keychain |
| Embedded app secrets | Can be extracted | Keep server secrets on server; secure per-user credentials |
| Disabled TLS verification | MITM risk | Valid platform TLS; pinning only for a justified managed threat model |
| Log sensitive data     | PII leakage        | Never log secrets      |

---

## 5. Platform Unification vs Divergence Matrix

```
UNIFY                          DIVERGE
──────────────────────────     ─────────────────────────
Business logic                Navigation behavior
Data models                    Gestures
API contracts                  Icons
Validation                     Typography
Error semantics                Pickers / dialogs
```

### Platform Defaults

| Element   | iOS          | Android        |
| --------- | ------------ | -------------- |
| Font      | SF Pro       | Roboto         |
| Min touch | 44pt         | 48dp           |
| Back      | Edge swipe   | System back    |
| Sheets    | Bottom sheet | Dialog / sheet |
| Icons     | SF Symbols   | Material Icons |

---

## 6. Mobile UX Psychology (Non-Optional)

### Fitts’ Law (Touch Reality)

* Finger ≠ cursor
* Accuracy is low
* Reach matters more than precision

**Rules:**

* Primary CTAs live in **thumb zone**
* Destructive actions pushed away
* No hover assumptions

---

## 7. Performance Doctrine

### React Native (fixed-height illustrative pattern)

```ts
const Row = React.memo(({ item }) => (
  <View><Text>{item.title}</Text></View>
));

const renderItem = useCallback(
  ({ item }) => <Row item={item} />,
  []
);

<FlatList
  data={items}
  renderItem={renderItem}
  keyExtractor={(i) => i.id}
  getItemLayout={(_, i) => ({
    length: ITEM_HEIGHT,
    offset: ITEM_HEIGHT * i,
    index: i,
  })}
/>
```

### Flutter (illustrative static widget)

```dart
class Item extends StatelessWidget {
  const Item({super.key});

  @override
  Widget build(BuildContext context) {
    return const Text('Static');
  }
}
```

* `const` everywhere possible
* Targeted rebuilds only

---

## 8. Implementation evidence

State the target platform, changed behavior and checks actually performed. Profile
representative devices/data; a static pattern scan cannot measure touch targets,
contrast, frame rate, battery, platform navigation or secure storage behavior.

## 9. Framework choice

Preserve an existing stack unless a change is requested. For new work compare
team experience, native integrations, accessibility, deployment policies and
measured workload constraints. Expo OTA is bounded by runtime compatibility and
store policies; it does not authorize bypassing review or delivering arbitrary
native code. No framework is universally fastest or smallest.

## 10. Release Readiness Checklist

### Before Shipping

* [ ] Platform hit targets checked in logical units
* [ ] Offline handled
* [ ] Secure storage used
* [ ] Lists optimized
* [ ] Logs stripped
* [ ] Tested on low-end devices
* [ ] Accessibility labels present
* [ ] Concrete risks and any unavailable checks documented

---

## 11. Related Skills

* **frontend-design** – Visual systems & components
* **frontend-dev-guidelines** – RN/TS architecture
* **backend-dev-guidelines** – Mobile-safe APIs
* **error-tracking** – Crash & performance telemetry

---

> **Final Law:**
> Mobile users are distracted, interrupted, and impatient—often using one hand on a bad network with low battery.
> **Design for that reality, or your app will fail quietly.**

---

## When to Use
This skill is applicable to execute the workflow or actions described in the overview.

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.

## Audit helper and limits

Run `python scripts/mobile_audit.py . --json` from the intended project directory.
The helper is read-only, bounded and advisory. It never imports project code and
never declares compliance; `compliant` is null. Exit 2 means incomplete inspection
or no detected mobile source. Source-pattern hints can match comments or miss
behavior spread across files. Validate findings before editing. No simulator,
real-device, screen-reader or GPU run was performed in this catalog review.

Use [touch guidance](touch-psychology.md), [typography](mobile-typography.md),
[color](mobile-color-system.md), [navigation](mobile-navigation.md) and
[decisions](decision-trees.md) for focused checks. Code blocks are version-sensitive
fragments, not certified complete apps; verify current APIs before execution.
