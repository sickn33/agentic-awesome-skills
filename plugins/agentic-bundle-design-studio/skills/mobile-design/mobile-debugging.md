# Mobile Debugging Guide

> **Stop console.log() debugging!**
> Mobile apps have complex native layers. Text logs are not enough.
> **This file teaches effective mobile debugging strategies.**

---

## 🧠 MOBILE DEBUGGING MINDSET

```
Web Debugging:      Mobile Debugging:
┌──────────────┐    ┌──────────────┐
│  Browser     │    │  JS Bridge   │
│  DevTools    │    │  Native UI   │
│  Network Tab │    │  GPU/Memory  │
└──────────────┘    │  Threads     │
                    └──────────────┘
```

**Key Differences:**
1.  **Native Layer:** JS code works, but app crashes? It's likely native (Java/Obj-C).
2.  **Deployment:** You can't just "refresh". State gets lost or stuck.
3.  **Network:** SSL Pinning, proxy settings are harder.
4.  **Device Logs:** `adb logcat` and `Console.app` are your truth.

---

## 🚫 AI DEBUGGING ANTI-PATTERNS

| ❌ Default | ✅ Mobile-Correct |
|------------|-------------------|
| "Log everything" | Use sanitized targeted diagnostics and current React Native DevTools/native profilers |
| "Check network tab" | Use Charles Proxy / Proxyman |
| "It works on simulator" | **Test on Real Device** (HW specific bugs) |
| "Reinstall node_modules" | **Clean Native Build** (Gradle/Pod cache) |
| Ignored native logs | Read `logcat` / Xcode logs |

---

## 1. The Toolset

### ⚡ React Native & Expo

| Tool | Purpose | Best For |
|------|---------|----------|
| **Reactotron** | State/API/Redux | JS side debugging |
| **React Native DevTools** | Supported JS/Hermes diagnostics | Use with a compatible RN version; legacy Flipper setup is not universal |
| **Expo Tools** | Element inspector | Quick UI checks |

### 🛠️ Native Layer (The Deep Dive)

| Tool | Platform | Command | Why Use? |
|------|----------|---------|----------|
| **Logcat** | Android | `adb logcat` | Native crashes, ANRs |
| **Console** | iOS | via Xcode | Native exceptions, memory |
| **Layout Insp.** | Android | Android Studio | UI hierarchy bugs |
| **View Insp.** | iOS | Xcode | UI hierarchy bugs |

---

## 2. Common Debugging Workflows

### 🕵️ "The App Just Crashed" (Red Screen vs Crash to Home)

**Scenario A: Red Screen (JS Error)**
- **Cause:** Undefined is not an object, import error.
- **Fix:** Read the stack trace on screen. It's usually clear.

**Scenario B: Crash to Home Screen (Native Crash)**
- **Cause:** Native module failure, memory OOM, permission usage without declaration.
- **Tools:**
    - **Android:** `adb logcat '*:E'` (Filter for Errors)
    - **iOS:** Open Xcode → Window → Devices → View Device Logs

> **💡 Pro Tip:** If app crashes immediately on launch, it's possibly configuration, startup JS, resources, signing or native code; inspect the actual crash evidence (Info.plist, AndroidManifest.xml).

### 🌐 "API Request Failed" (Network)

**Web:** Open Chrome DevTools → Network.
**Mobile:** *You usually can't see this easily.*

**Solution 1: Reactotron/Flipper**
- View network requests in the monitoring app.

**Solution 2: Proxy (Charles/Proxyman)**
- **Hard but powerful.** See ALL traffic even from native SDKs.
- Use only an authorized isolated debug device/build; scope and remove a test certificate afterward. Never disable production TLS/pinning or inspect unrelated traffic.

### 🐢 "The UI is Laggy" (Performance)

**Don't guess.** measure.
- **React Native:** Performance Monitor (Shake menu).
- **Android:** "Profile GPU Rendering" in Developer Options.
- **Issues:**
    - **JS FPS drop:** Heavy calculation in JS thread.
    - **UI FPS drop:** Too many views, intricate hierarchy, heavy images.

---

## 3. Platform-Specific Nightmares

### Android
- **Gradle Sync Fail:** Usually Java version mismatch or duplicate classes.
- **Emulator Network:** Android Emulator reaches the host loopback through `10.0.2.2`; the emulator's own `localhost` is still `127.0.0.1`. Other emulators/devices differ.
- **Cached Builds:** Inspect the exact build failure first; clean only the relevant rebuildable output when justified.

### iOS
- **Pod Issues:** Inspect Pod/Xcode errors and the lockfile first; use a targeted repair, preserving local changes and dependency versions.
- **Signing Errors:** Check Team ID and Bundle Identifier.
- **Cache:** Xcode → Product → Clean Build Folder.

---

## 📝 DEBUGGING CHECKLIST

- [ ] **Is it a JS or Native crash?** (Red screen or home screen?)
- [ ] **Did you clean build?** (Native caches are aggressive)
- [ ] **Are you on a real device?** (Simulators hide concurrency bugs)
- [ ] **Did you check the native logs?** (Not just terminal output)

> **Remember:** If JavaScript looks perfect but the app fails, look closer at the Native side.

A red screen/home-screen distinction is a clue, not a definitive JS/native
diagnosis. Preserve and inspect sanitized stack/crash evidence. React Native
DevTools replaces many legacy Flipper/remote-debugging assumptions; use tools
supported by the installed runtime. A successful simulator run is useful evidence
with hardware limits, not a reason to discard simulator testing entirely.
