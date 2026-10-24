# Mobile Testing Patterns

> **Mobile testing is NOT web testing. Different constraints, different strategies.**
> This file teaches WHEN to use each testing approach and WHY.
> **Code examples are minimal - focus on decision-making.**

---

## 🧠 MOBILE TESTING MINDSET

```
Mobile testing differs from web:
├── Real devices matter (emulators hide bugs)
├── Platform differences (iOS vs Android behavior)
├── Network conditions vary wildly
├── Battery/performance under test
├── App lifecycle (background, killed, restored)
├── Permissions and system dialogs
└── Touch interactions vs clicks
```

---

## 🚫 AI MOBILE TESTING ANTI-PATTERNS

| ❌ AI Default | Why It's Wrong | ✅ Mobile-Correct |
|---------------|----------------|-------------------|
| Jest-only testing | Misses native layer | Jest + E2E on device |
| Enzyme patterns | Deprecated, web-focused | React Native Testing Library |
| Browser-based E2E (Cypress) | Can't test native features | Detox / Maestro |
| Mock everything | Misses integration bugs | Real device testing |
| Ignore platform tests | iOS/Android differ | Platform-specific cases |
| Skip performance tests | Mobile perf is critical | Profile on low-end device |
| Test only happy path | Mobile has more edge cases | Offline, permissions, interrupts |
| 100% unit test coverage | False security | Pyramid balance |
| Copy web testing patterns | Different environment | Mobile-specific tools |

---

## 1. Testing Tool Selection

### Decision Tree

```
WHAT ARE YOU TESTING?
        │
        ├── Pure functions, utilities, helpers
        │   └── Jest (unit tests)
        │       └── No special mobile setup needed
        │
        ├── Individual components (isolated)
        │   ├── React Native → React Native Testing Library
        │   └── Flutter → flutter_test (widget tests)
        │
        ├── Components with hooks, context, navigation
        │   ├── React Native → RNTL + mocked providers
        │   └── Flutter → integration_test package
        │
        ├── Full user flows (login, checkout, etc.)
        │   ├── Detox (React Native, fast, reliable)
        │   ├── Maestro (Cross-platform, YAML-based)
        │   └── Appium when its driver/device coverage fits the project
        │
        └── Performance, memory, battery
            ├── Flashlight (RN performance)
            ├── Flutter DevTools
            └── Real device profiling (Xcode/Android Studio)
```

### Tool Comparison

| Tool | Platform | Speed | Reliability | Use When |
|------|----------|-------|-------------|----------|
| **Jest** | RN | ⚡⚡⚡ | ⚡⚡⚡ | Unit tests, logic |
| **RNTL** | RN | ⚡⚡⚡ | ⚡⚡ | Component tests |
| **flutter_test** | Flutter | ⚡⚡⚡ | ⚡⚡⚡ | Widget tests |
| **Detox** | RN | ⚡⚡ | ⚡⚡⚡ | E2E, critical flows |
| **Maestro** | Both | ⚡⚡ | ⚡⚡ | E2E, cross-platform |
| **Appium** | Both | ⚡ | ⚡ | Driver/device coverage dependent |

---

## 2. Testing Pyramid for Mobile

```
                    ┌───────────────┐
                    │    E2E Tests  │  10%
                    │  (Real device) │  Slow, expensive, essential
                    ├───────────────┤
                    │  Integration  │  20%
                    │    Tests      │  Component + context
                    ├───────────────┤
                    │  Component    │  30%
                    │    Tests      │  Isolated UI
                    ├───────────────┤
                    │   Unit Tests  │  40%
                    │    (Jest)     │  Pure logic
                    └───────────────┘
```

### Why This Distribution?

| Level | Why This % |
|-------|------------|
| **E2E 10%** | Slow, flaky, but catches integration bugs |
| **Integration 20%** | Tests real user flows without full app |
| **Component 30%** | Fast feedback on UI changes |
| **Unit 40%** | Fastest, most stable, logic coverage |

> 🔴 **If you have 90% unit tests and 0% E2E, you're testing the wrong things.**

---

## 3. What to Test at Each Level

### Unit Tests (Jest)

```
✅ TEST:
├── Utility functions (formatDate, calculatePrice)
├── State reducers (Redux, Zustand stores)
├── API response transformers
├── Validation logic
└── Business rules

❌ DON'T TEST:
├── Component rendering (use component tests)
├── Navigation (use integration tests)
├── Native modules (mock them)
└── Third-party libraries
```

### Component Tests (RNTL / flutter_test)

```
✅ TEST:
├── Component renders correctly
├── User interactions (tap, type, swipe)
├── Loading/error/empty states
├── Accessibility labels exist
└── Props change behavior

❌ DON'T TEST:
├── Internal implementation details
├── Snapshot everything (only key components)
├── Styling specifics (brittle)
└── Third-party component internals
```

### Integration Tests

```
✅ TEST:
├── Form submission flows
├── Navigation between screens
├── State persistence across screens
├── API integration (with mocked server)
└── Context/provider interactions

❌ DON'T TEST:
├── Every possible path (use unit tests)
├── Third-party services (mock them)
└── Backend logic (backend tests)
```

### E2E Tests

```
✅ TEST:
├── Critical user journeys (login, purchase, signup)
├── Offline → online transitions
├── Deep link handling
├── Push notification navigation
├── Permission flows
└── Payment flows

❌ DON'T TEST:
├── Every edge case (too slow)
├── Visual regression (use snapshot tests)
├── Non-critical features
└── Backend-only logic
```

---

## 4. Platform-Specific Testing

### What Differs Between iOS and Android?

| Area | iOS Behavior | Android Behavior | Test Both? |
|------|--------------|------------------|------------|
| **Back navigation** | Edge swipe | System back button | ✅ YES |
| **Permissions** | OS/version-specific prompts and settings | Permission/version-specific prompts, denial and settings | ✅ YES |
| **Keyboard** | Different appearance | Different behavior | ✅ YES |
| **Date picker** | Wheel/modal | Material dialog | ⚠️ If custom UI |
| **Push format** | APNs payload | FCM payload | ✅ YES |
| **Deep links** | Universal Links | App Links | ✅ YES |
| **Gestures** | Some unique | Material gestures | ⚠️ If custom |

### Platform Testing Strategy

```
FOR EACH PLATFORM:
├── Run unit tests (same on both)
├── Run component tests (same on both)
├── Run E2E on REAL DEVICE
│   ├── iOS: iPhone (not just simulator)
│   └── Android: Mid-range device (not flagship)
└── Test platform-specific features separately
```

---

## 5. Offline & Network Testing

### Offline Scenarios to Test

| Scenario | What to Verify |
|----------|----------------|
| Start app offline | Shows cached data or offline message |
| Go offline mid-action | Action queued, not lost |
| Come back online | Queue synced, no duplicates |
| Slow network (2G) | Loading states, timeouts work |
| Flaky network | Retry logic, error recovery |

### How to Test Network Conditions

```
APPROACH:
├── Unit tests: Mock NetInfo, test logic
├── Integration: Mock API responses, test UI
├── E2E (Detox): Use device.setURLBlacklist()
├── E2E (Maestro): Use network conditions
└── Manual: Use Charles Proxy / Network Link Conditioner
```

---

## 6. Performance Testing

### What to Measure

| Metric | Target | How to Measure |
|--------|--------|----------------|
| **App startup** | < 2 seconds | Profiler, Flashlight |
| **Screen transition** | < 300ms | React DevTools |
| **List scroll** | 60 FPS | Profiler, feel |
| **Memory** | Stable, no leaks | Instruments / Android Profiler |
| **Bundle size** | Minimize | Metro bundler analysis |

### When to Performance Test

```
PERFORMANCE TEST:
├── Before release (required)
├── After adding heavy features
├── After upgrading dependencies
├── When users report slowness
└── On CI (optional, automated benchmarks)

WHERE TO TEST:
├── Real device (REQUIRED)
├── Low-end device (Galaxy A series, old iPhone)
├── NOT on emulator (lies about performance)
└── With production-like data (not 3 items)
```

---

## 7. Accessibility Testing

### What to Verify

| Element | Check |
|---------|-------|
| Interactive elements | Have accessibilityLabel |
| Images | Have alt text or decorative flag |
| Forms | Labels linked to inputs |
| Buttons | Role = button |
| Touch targets | ≥ 44x44 (iOS) / 48x48 (Android) |
| Color contrast | WCAG AA minimum |

### How to Test

```
AUTOMATED:
├── React Native: native accessibility tooling (jest-axe targets DOM and does not validate a native view tree)
├── Flutter: Accessibility checker in tests
└── Lint rules for missing labels

MANUAL:
├── Enable VoiceOver (iOS) / TalkBack (Android)
├── Navigate entire app with screen reader
├── Test with increased text size
└── Test with reduced motion
```

---

## 8. CI/CD Integration

### What to Run Where

| Stage | Tests | Devices |
|-------|-------|---------|
| **PR** | Unit + Component | None (fast) |
| **Merge to main** | + Integration | Simulator/Emulator |
| **Pre-release** | + E2E | Real devices (farm) |
| **Nightly** | Full suite | Device farm |

### Device Farm Options

| Service | Pros | Cons |
|---------|------|------|
| **Firebase Test Lab** | Free tier, Google devices | Android focus |
| **AWS Device Farm** | Wide selection | Expensive |
| **BrowserStack** | Good UX | Expensive |
| **Local devices** | Free, reliable | Limited variety |

---

## 📝 MOBILE TESTING CHECKLIST

### Before PR
- [ ] Unit tests for new logic
- [ ] Component tests for new UI
- [ ] No console.logs in tests
- [ ] Tests pass on CI

### Before Release
- [ ] E2E on real iOS device
- [ ] E2E on real Android device
- [ ] Tested on low-end device
- [ ] Offline scenarios verified
- [ ] Performance acceptable
- [ ] Accessibility verified

### What to Skip (Consciously)
- [ ] 100% coverage (aim for meaningful coverage)
- [ ] Every visual permutation (use snapshots sparingly)
- [ ] Third-party library internals
- [ ] Backend logic (separate tests)

---

## 🎯 Testing Questions to Ask

Before writing tests, answer:

1. **What could break?** → Test that
2. **What's critical for users?** → E2E test that
3. **What's complex logic?** → Unit test that
4. **What's platform-specific?** → Test on both platforms
5. **What happens offline?** → Test that scenario

> **Remember:** Good mobile testing is about testing the RIGHT things, not EVERYTHING. A flaky E2E test is worse than no test. A failing unit test that catches a bug is worth 100 passing trivial tests.

## Evidence interpretation

The pyramid percentages and startup/transition thresholds above are illustrative
planning examples, not validated universal requirements. Choose by user risk and
measured baseline. Component snapshots are not rendered visual/accessibility tests.
A testID is not an accessibility label, and inherited text may already provide a
correct native accessible name. Test real semantics and focus order with native
tools/screen readers. A flaky critical E2E test should be repaired or replaced,
not silently removed. Device farms/cert installation/telemetry can incur costs or
expose data and require explicit scope. No native device test was run in this review.
