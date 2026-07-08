---
name: makepad-platform
description: |
  CRITICAL: Use for Makepad cross-platform support. Triggers on:
  makepad platform, makepad os, makepad macos, makepad windows, makepad linux,
  makepad android, makepad ios, makepad web, makepad wasm, makepad metal,
  makepad d3d11, makepad opengl, makepad webgl, OsType, CxOs,
  makepad 跨平台, makepad 平台支持
risk: unknown
source: community
---

# Makepad Platform Skill

> **Version:** makepad-widgets (dev branch) | **Last Updated:** 2026-01-19
>
> Check for updates: https://crates.io/crates/makepad-widgets

You are an expert at Makepad cross-platform development. Help users by:
- **Understanding platforms**: Explain supported platforms and backends
- **Platform-specific code**: Help with conditional compilation and platform APIs

## When to Use
- You need to understand or target specific platforms and graphics backends in Makepad.
- The task involves platform compatibility, conditional compilation, or OS-specific behavior across desktop, mobile, or web.
- You need guidance on backend differences such as Metal, D3D11, OpenGL, WebGL, or platform modules.

## Documentation

Refer to the local files for detailed documentation:
- `./references/platform-support.md` - Platform details and OsType

## IMPORTANT: Documentation Completeness Check

**Before answering questions, Claude MUST:**

1. Read the relevant reference file(s) listed above
2. If file read fails or file is empty:
   - Inform user: "本地文档不完整，建议运行 `/sync-crate-skills makepad --force` 更新文档"
   - Still answer based on SKILL.md patterns + built-in knowledge
3. If reference file exists, incorporate its content into the answer

## Supported Platforms

| Platform | Graphics Backend | OS Module |
|----------|------------------|-----------|
| macOS | Metal | `apple/metal_*.rs`, `apple/cocoa_*.rs` |
| iOS | Metal | `apple/metal_*.rs`, `apple/ios_*.rs` |
| Windows | D3D11 | `mswindows/d3d11_*.rs`, `mswindows/win32_*.rs` |
| Linux | OpenGL | `linux/opengl_*.rs`, `linux/x11*.rs`, `linux/wayland*.rs` |
| Web | WebGL2 | `web/*.rs`, `web_browser/*.rs` |
| Android | OpenGL ES | `android/*.rs` |
| OpenHarmony | OHOS | `open_harmony/*.rs` |
| OpenXR | VR/AR | `open_xr/*.rs` |

## OsType Enum

```rust
pub enum OsType {
    Unknown,
    Windows,
    Macos,
    Linux { custom_window_chrome: bool },
    Ios,
    Android(AndroidParams),
    OpenHarmony,
    Web(WebParams),
    OpenXR,
}

// Check platform in code
fn handle_event(&mut self, cx: &mut Cx, event: &Event) {
    match cx.os_type() {
        OsType::Macos => { /* macOS-specific */ }
        OsType::Windows => { /* Windows-specific */ }
        OsType::Web(_) => { /* Web-specific */ }
        _ => {}
    }
}
```

## Platform Detection

```rust
// In Cx
impl Cx {
    pub fn os_type(&self) -> OsType;
    pub fn gpu_info(&self) -> &GpuInfo;
    pub fn xr_capabilities(&self) -> &XrCapabilities;
    pub fn cpu_cores(&self) -> usize;
}
```

## Conditional Compilation

```rust
// Compile-time platform detection
#[cfg(target_os = "macos")]
fn macos_only() { }

#[cfg(target_os = "windows")]
fn windows_only() { }

#[cfg(target_os = "linux")]
fn linux_only() { }

#[cfg(target_arch = "wasm32")]
fn web_only() { }

#[cfg(target_os = "android")]
fn android_only() { }

#[cfg(target_os = "ios")]
fn ios_only() { }
```

## Platform-Specific Features

### Desktop (macOS/Windows/Linux)
- Window management (resize, minimize, maximize)
- File dialogs
- System menu
- Drag and drop
- Multiple monitors

### Mobile (iOS/Android)
- Touch input
- Virtual keyboard
- Screen orientation
- App lifecycle (foreground/background)

### Web (WebGL2)
- DOM integration
- Browser events
- Local storage
- HTTP requests

## Entry Point

```rust
// App entry macro
app_main!(App);

pub struct App {
    ui: WidgetRef,
}

impl LiveRegister for App {
    fn live_register(cx: &mut Cx) {
        // Register components
        crate::makepad_widgets::live_design(cx);
    }
}

impl AppMain for App {
    fn handle_event(&mut self, cx: &mut Cx, event: &Event) {
        // Handle app events
        self.ui.handle_event(cx, event, &mut Scope::empty());
    }
}
```

## When Answering Questions

1. Makepad compiles to native code for each platform (no runtime interpreter)
2. Shaders are compiled at build time for each graphics backend
3. Platform-specific code is in `platform/src/os/` directory
4. Use `cx.os_type()` for runtime platform detection
5. Use `#[cfg(target_os = "...")]` for compile-time platform detection

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.
