---
name: makepad-deployment
description: |
  CRITICAL: Use for Makepad packaging and deployment. Triggers on:
  deploy, package, APK, IPA, 打包, 部署,
  cargo-packager, cargo-makepad, WASM, Android, iOS,
  distribution, installer, .deb, .dmg, .nsis,
  GitHub Actions, CI, action, marketplace
risk: critical
source: community
---

# Makepad Packaging & Deployment

This skill covers packaging Makepad applications for all supported platforms.

## When to Use
- You need to package, distribute, or automate deployment of a Makepad application.
- The task involves desktop installers, APK/IPA builds, WebAssembly output, or CI-based release artifacts.
- You need guidance on `cargo-packager`, `cargo-makepad`, or GitHub Actions packaging flows for Makepad.

## Quick Navigation

| Platform | Tool | Output |
|----------|------|--------|
| [Desktop](#desktop-packaging) | `cargo-packager` | .deb, .nsis, .dmg |
| [Android](#android) | `cargo-makepad` | .apk |
| [iOS](#ios) | `cargo-makepad` | .app, .ipa |
| [Web](#wasm-packaging) | `cargo-makepad` | Wasm + HTML/JS |
| [CI/CD](#github-actions-packaging) | `makepad-packaging-action` | GitHub Release assets |

---

## GitHub Actions Packaging

Use `makepad-packaging-action` to package Makepad apps in CI. It wraps
`cargo-packager` (desktop) and `cargo-makepad` (mobile), and can upload artifacts
to GitHub Releases.

```yaml
jobs:
  package:
    runs-on: ubuntu-22.04
    steps:
      - uses: actions/checkout@v4
      - uses: Project-Robius-China/makepad-packaging-action@v1
        with:
          args: --target x86_64-unknown-linux-gnu --release
```

Notes:
- Desktop packages must run on matching OS runners (Linux/Windows/macOS).
- iOS builds require macOS runners.
- Android builds can run on any OS runner.

Full inputs/env/outputs and release workflows live in
`references/makepad-packaging-action.md`.

## Desktop Packaging

Desktop packaging uses `cargo-packager` with `robius-packaging-commands` for resource handling.

### Install Tools

```bash
# Install cargo-packager
cargo install cargo-packager --locked

# Install robius-packaging-commands (v0.2.1)
cargo install --version 0.2.1 --locked \
    --git https://github.com/project-robius/robius-packaging-commands.git \
    robius-packaging-commands
```

### Configure Cargo.toml

Add packaging configuration to your `Cargo.toml`:

```toml
[package.metadata.packager]
product_name = "YourAppName"
identifier = "com.yourcompany.yourapp"
authors = ["Your Name or Team"]
description = "A brief description of your Makepad application"
# Note: long_description has 80 character max per line
long_description = """
Your detailed description here.
Keep each line under 80 characters.
"""
icons = ["./assets/icon.png"]
out_dir = "./dist"

# Pre-packaging command to collect resources
before-packaging-command = """
robius-packaging-commands before-packaging \
    --force-makepad \
    --binary-name your-app \
    --path-to-binary ./target/release/your-app
"""

# Resources to include in package
resources = [
    # Makepad built-in resources (required)
    { src = "./dist/resources/makepad_widgets", target = "makepad_widgets" },
    { src = "./dist/resources/makepad_fonts_chinese_bold", target = "makepad_fonts_chinese_bold" },
    { src = "./dist/resources/makepad_fonts_chinese_bold_2", target = "makepad_fonts_chinese_bold_2" },
    { src = "./dist/resources/makepad_fonts_chinese_regular", target = "makepad_fonts_chinese_regular" },
    { src = "./dist/resources/makepad_fonts_chinese_regular_2", target = "makepad_fonts_chinese_regular_2" },
    { src = "./dist/resources/makepad_fonts_emoji", target = "makepad_fonts_emoji" },

    # Your app resources
    { src = "./dist/resources/your_app_resource", target = "your_app_resource" },
]

before-each-package-command = """
robius-packaging-commands before-each-package \
    --force-makepad \
    --binary-name your-app \
    --path-to-binary ./target/release/your-app
"""
```

### Linux (Debian/Ubuntu)

```bash
# Install dependencies
sudo apt-get update
sudo apt-get install libssl-dev libsqlite3-dev pkg-config \
    binfmt-support libxcursor-dev libx11-dev libasound2-dev libpulse-dev

# Build package
cargo packager --release
```

Output: `.deb` file in `./dist/`

### Windows

```bash
# Build NSIS installer
cargo packager --release --formats nsis
```

Output: `.exe` installer in `./dist/`

### macOS

```bash
# Build package
cargo packager --release
```

Output: `.dmg` file in `./dist/`

### Platform-Specific Configuration

```toml
# Linux (Debian)
[package.metadata.packager.deb]
depends = "./dist/depends_deb.txt"
desktop_template = "./packaging/your-app.desktop"
section = "utils"

# macOS
[package.metadata.packager.macos]
minimum_system_version = "11.0"
frameworks = []
info_plist_path = "./packaging/Info.plist"
entitlements = "./packaging/Entitlements.plist"
# Optional: signing identity for distribution
signing_identity = "Developer ID Application: Your Name (XXXXXXXXXX)"

# macOS DMG
[package.metadata.packager.dmg]
background = "./packaging/dmg_background.png"
window_size = { width = 960, height = 540 }
app_position = { x = 200, y = 250 }
application_folder_position = { x = 760, y = 250 }

# Windows NSIS
[package.metadata.packager.nsis]
appdata_paths = [
    "$APPDATA/$PUBLISHER/$PRODUCTNAME",
    "$LOCALAPPDATA/$PRODUCTNAME",
]
```

---

## Mobile Packaging

Mobile platforms use `cargo-makepad` for building and packaging.

### Install cargo-makepad

```bash
cargo install --force --git https://github.com/makepad/makepad.git \
    --branch dev cargo-makepad
```

### Android

```bash
# Install Android toolchain
cargo makepad android install-toolchain

# Full NDK (recommended for complete support)
cargo makepad android install-toolchain --full-ndk

# Build APK
cargo makepad android build -p your-app --release
```

Output: `.apk` in `./target/makepad-android-app/`

**Run on device/emulator:**
```bash
cargo makepad android run -p your-app --release
```

### iOS

```bash
# Install iOS toolchain
cargo makepad apple ios install-toolchain
```

**iOS Simulator:**
```bash
cargo makepad apple ios \
    --org=com.yourcompany \
    --app=YourApp \
    run-sim -p your-app --release
```

Output: `.app` in `./target/makepad-apple-app/aarch64-apple-ios-sim/release/`

**iOS Device (requires provisioning):**

First, create an empty app in Xcode with matching org/app names to generate provisioning profile.

```bash
cargo makepad apple ios \
    --org=com.yourcompany \
    --app=YourApp \
    --profile=$YOUR_PROFILE_PATH \
    --cert=$YOUR_CERT_FINGERPRINT \
    --device=iPhone \
    run-device -p your-app --release
```

Output: `.app` in `./target/makepad-apple-app/aarch64-apple-ios/release/`

**Create IPA for distribution:**
```bash
cd ./target/makepad-apple-app/aarch64-apple-ios/release
mkdir Payload
cp -r your-app.app Payload/
zip -r your-app-ios.ipa Payload
```

---

## Wasm Packaging

Build your Makepad app for web browsers.

```bash
# Install Wasm toolchain
cargo makepad wasm install-toolchain

# Build and run
cargo makepad wasm run -p your-app --release
```

Output in `./target/makepad-wasm-app/release/your-app/`:
- `index.html` - Entry point
- `*.wasm` - WebAssembly module
- `*.js` - JavaScript bridge
- `resources/` - Static assets

**Serve locally:**
```bash
cd ./target/makepad-wasm-app/release/your-app
python3 -m http.server 8080
# Open http://localhost:8080
```

---

## Complete Example Cargo.toml

```toml
[package]
name = "my-makepad-app"
version = "1.0.0"
edition = "2024"

[dependencies]
makepad-widgets = { git = "https://github.com/makepad/makepad", branch = "dev" }

[profile.release]
opt-level = 3

[profile.release-lto]
inherits = "release"
lto = "thin"

[profile.distribution]
inherits = "release"
codegen-units = 1
lto = "fat"

[package.metadata.packager]
product_name = "My Makepad App"
identifier = "com.example.mymakepadapp"
authors = ["Your Name <you@example.com>"]
description = "A cross-platform Makepad application"
long_description = """
My Makepad App is a cross-platform application
built with the Makepad UI framework in Rust.
It runs on desktop, mobile, and web platforms.
"""
icons = ["./packaging/icon.png"]
out_dir = "./dist"

before-packaging-command = """
robius-packaging-commands before-packaging \
    --force-makepad \
    --binary-name my-makepad-app \
    --path-to-binary ./target/release/my-makepad-app
"""

resources = [
    { src = "./dist/resources/makepad_widgets", target = "makepad_widgets" },
    { src = "./dist/resources/makepad_fonts_chinese_bold", target = "makepad_fonts_chinese_bold" },
    { src = "./dist/resources/makepad_fonts_chinese_bold_2", target = "makepad_fonts_chinese_bold_2" },
    { src = "./dist/resources/makepad_fonts_chinese_regular", target = "makepad_fonts_chinese_regular" },
    { src = "./dist/resources/makepad_fonts_chinese_regular_2", target = "makepad_fonts_chinese_regular_2" },
    { src = "./dist/resources/makepad_fonts_emoji", target = "makepad_fonts_emoji" },
    { src = "./dist/resources/my-makepad-app", target = "my-makepad-app" },
]

before-each-package-command = """
robius-packaging-commands before-each-package \
    --force-makepad \
    --binary-name my-makepad-app \
    --path-to-binary ./target/release/my-makepad-app
"""

[package.metadata.packager.deb]
depends = "./dist/depends_deb.txt"
section = "utils"

[package.metadata.packager.macos]
minimum_system_version = "11.0"

[package.metadata.packager.nsis]
appdata_paths = ["$LOCALAPPDATA/$PRODUCTNAME"]
```

---

## Quick Reference

| Task | Command |
|------|---------|
| Install desktop packager | `cargo install cargo-packager --locked` |
| Install resource helper | `cargo install --version 0.2.1 --locked --git https://github.com/project-robius/robius-packaging-commands.git robius-packaging-commands` |
| Install mobile packager | `cargo install --force --git https://github.com/makepad/makepad.git --branch dev cargo-makepad` |
| GitHub Actions packaging | `uses: Project-Robius-China/makepad-packaging-action@v1` |
| Package for Linux | `cargo packager --release` |
| Package for Windows | `cargo packager --release --formats nsis` |
| Package for macOS | `cargo packager --release` |
| Build Android APK | `cargo makepad android build -p app --release` |
| Build iOS (Simulator) | `cargo makepad apple ios --org=x --app=y run-sim -p app --release` |
| Build iOS (Device) | `cargo makepad apple ios --org=x --app=y --profile=... --cert=... run-device -p app --release` |
| Build Wasm | `cargo makepad wasm run -p app --release` |

---

## Troubleshooting

### Missing Resources

If app crashes with missing resources:
1. Check `resources` array in Cargo.toml includes all Makepad resources
2. Verify `before-packaging-command` runs successfully
3. Check `./dist/resources/` contains expected files

### iOS Provisioning

For iOS device deployment:
1. Create empty app in Xcode with same org/app identifiers
2. Run on physical device once to generate provisioning profile
3. Note the profile path, certificate fingerprint
4. Use `--profile`, `--cert`, `--device` flags

### Android SDK Issues

```bash
# Reinstall toolchain with full NDK
cargo makepad android install-toolchain --full-ndk
```

## Reference Files

- `references/platform-troubleshooting.md` - Platform-specific deployment issues
- `references/makepad-packaging-action.md` - GitHub Actions packaging reference
- `community/dora-studio-package-workflow.md` - Dora Studio CI packaging example

## External References

- [cargo-packager docs](https://docs.crabnebula.dev/packager/)
- [robius-packaging-commands](https://github.com/project-robius/robius-packaging-commands)
- [cargo-makepad](https://github.com/makepad/makepad)
- [makepad-packaging-action](https://github.com/marketplace/actions/makepad-packaging-action)

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.
