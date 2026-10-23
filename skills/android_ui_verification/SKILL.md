---
name: android_ui_verification
description: Automated end-to-end UI testing and verification on an Android Emulator using ADB.
risk: safe
source: community
date_added: "2026-02-28"
---

# Android UI Verification Skill

This skill provides a systematic approach to testing React Native applications on an Android emulator using ADB commands. It allows for autonomous interaction, state verification, and visual regression checking.

## When to Use
- Verifying UI changes in React Native or Native Android apps.
- Autonomous debugging of layout issues or interaction bugs.
- Ensuring feature functionality when manual testing is too slow.
- Capturing automated screenshots for PR documentation.

## 🛠 Prerequisites
- Android Emulator running.
- `adb` installed and in PATH.
- Application in debug mode for logcat access.

## 🚀 Workflow

### 1. Device Calibration
Select the authorized emulator serial with `adb devices -l`; pass `-s SERIAL` to every command when multiple devices exist. Before interacting, inspect current display geometry and UI bounds to ensure tap coordinates are accurate.
```bash
adb shell wm size
```
*Note: Size overrides, density, rotation and insets affect input coordinates. Prefer fresh UI bounds on the actual selected display rather than deriving coordinates solely from physical size.*

### 2. UI Inspection (State Discovery)
Use the `uiautomator` dump to find the exact bounds of UI elements (buttons, inputs).
```bash
adb shell uiautomator dump /sdcard/view.xml && adb pull /sdcard/view.xml ./artifacts/view.xml
```
Search the `view.xml` for `text`, `content-desc`, or `resource-id`. The `bounds` attribute `[x1,y1][x2,y2]` defines the clickable area.

### 3. Interaction Commands
- **Tap**: `adb shell input tap <x> <y>` (Use the center of the element bounds).
- **Swipe**: `adb shell input swipe <x1> <y1> <x2> <y2> <duration_ms>` (Used for scrolling).
- **Text Input**: `adb shell input text "<message>"` (Note: Limited support for special characters).
- **Key Events**: `adb shell input keyevent <code_id>` (e.g., 66 for Enter).

### 4. Verification & Reporting
#### Visual Verification
Capture a screenshot after interaction to confirm UI changes.
```bash
adb shell screencap -p /sdcard/screen.png && adb pull /sdcard/screen.png ./artifacts/test_result.png
```

#### Analytical Verification
Monitor the JS console logs in real-time to detect errors or log successes.
```bash
adb logcat -d | grep "ReactNativeJS" | tail -n 20
```

#### Cleanup
Always store generated files in the `artifacts/` folder to satisfy project organization rules.

## 💡 Best Practices
- **Wait for State**: Poll for the expected UI state with a bounded timeout; a fixed delay alone is not verification.
- **Center Taps**: Calculate the arithmetic mean of `[x1,y1][x2,y2]` for the most reliable tap target.
- **Log Markers**: Use distinct log messages in the code (e.g., `✅ Action Successful`) to make `grep` verification easy.
- **Fail Fast**: If a `uiautomator dump` fails or doesn't find the expected text, stop and troubleshoot rather than blind-tapping.

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.

## Bundled helper example

From this skill’s directory, after selecting the authorized emulator, run `ANDROID_SERIAL=emulator-5554 bash scripts/verify_ui.sh login-screen`. Replace the example serial with the verified device. The inert, non-executable helper captures `artifacts/view.xml`, `artifacts/login-screen.png` and recent JS logs; it does not assert that the login flow passed. Inspect the captured state against the expected UI and keep artifacts private when they contain personal data.
