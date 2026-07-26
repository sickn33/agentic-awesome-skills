# 🏔️ hyprfedora

> An intelligent, safety-first **Antigravity CLI Agent Skill** that installs, configures, repairs, and manages Hyprland on Fedora Linux — without breaking your existing desktop setup.

---

## 🎯 Why This Project Exists

Setting up Hyprland on Fedora can be tedious. You have to configure Wayland portals, sort out PipeWire audio, select launcher/terminal defaults, and configure GPU flags—especially if you're running NVIDIA or hybrid graphics.

This skill allows you to open Google Antigravity CLI (`agy`) and simply say:

> **"Install Hyprland on my Fedora system."**

The agent inspects your system hardware, creates timestamped backups of any existing settings, installs missing Fedora packages via `dnf`, configures your graphics drivers, and sets up a clean desktop session ready for your login screen.

---

## ✨ Key Features

- 🛡️ **Safety First & Mandatory Backups**: Never overwrites your existing `~/.config/hypr/` without creating a timestamped backup in `~/.local/state/fedora-hyprland-installer/backups/`.
- 🐧 **Fedora-Native**: Built specifically for Fedora. Uses `dnf`, `systemctl`, and standard Fedora package repositories.
- ⚡ **GPU Aware**: Automatically detects NVIDIA, AMD Radeon, Intel, and Hybrid laptop setups, setting the right environment flags (like `WLR_NO_HARDWARE_CURSORS` for NVIDIA).
- 🤝 **Desktop Coexistence**: Never removes GNOME, KDE, or Xfce. Hyprland is added as a session option at your GDM/SDDM login screen.
- 🛠️ **Automated Repair**: Diagnoses screen sharing, broken portals, or PipeWire audio issues without reinstalling everything.
- 🧼 **Clean Removal**: Completely uninstallable while preserving your base desktop and backups.

---

## 📦 What Gets Installed

When installing, the skill provisions a minimal, fast, and modern desktop stack:

| Component | Package / Tool | Purpose |
| :--- | :--- | :--- |
| **Compositor** | `hyprland` | Dynamic tiling Wayland compositor |
| **Terminal** | `kitty` | Fast, GPU-accelerated terminal |
| **Launcher** | `wofi` | Application launcher menu |
| **Status Bar** | `waybar` | Desktop panel & bar |
| **Portals** | `xdg-desktop-portal-hyprland`, `xdg-desktop-portal-gtk` | Screen sharing & file dialogs |
| **Audio** | `pipewire`, `wireplumber` | Low-latency audio & stream routing |
| **Notifications** | `dunst` | Desktop notification daemon |
| **Screenshots** | `grim`, `slurp`, `wl-clipboard` | Screen capture & clipboard support |

---

## 🚀 Quick Start & Usage

### 1. Installation

Place this skill directory inside your project's `.agents/skills/` directory:

```bash
mkdir -p .agents/skills/
cp -r fedora-hyprland-installer .agents/skills/
```

Or install it globally for all your terminal projects:

```bash
mkdir -p ~/.gemini/antigravity-cli/skills/
cp -r fedora-hyprland-installer ~/.gemini/antigravity-cli/skills/
```

### 2. Using with `agy` (Antigravity CLI)

Simply talk to `agy` in natural language:

```bash
agy
```

- **Fresh Install**: `"Install Hyprland on my Fedora machine."`
- **Health Check**: `"Verify my Hyprland installation."`
- **Troubleshoot & Fix**: `"Fix my screen sharing on Hyprland"` or `"Hyprland won't start."`
- **Update Setup**: `"Update my Hyprland packages."`
- **Uninstall**: `"Uninstall Hyprland."`

---

## 🛠️ Direct Terminal Utilities

If you prefer running standalone bash scripts without `agy`, you can use the built-in utilities in `scripts/`:

```bash
# Detect hardware, OS, and session information
./scripts/detect-system.sh

# Detect GPU hardware (NVIDIA / AMD / Intel)
./scripts/detect-gpu.sh

# Run preflight system verification
./scripts/preflight.sh

# Verify health of your current Hyprland installation
./scripts/verify.sh

# Run automated non-destructive test suite
./tests/test-scripts.sh
```

---

## 📁 Repository Structure

```text
fedora-hyprland-installer/
├── SKILL.md                 # Antigravity Agent Skill definition & workflow rules
├── README.md                # Project documentation
├── LICENSE                  # MIT License
├── scripts/                 # Modular, safe shell scripts
│   ├── detect-system.sh
│   ├── detect-gpu.sh
│   ├── preflight.sh
│   ├── install.sh
│   ├── configure.sh
│   ├── verify.sh
│   ├── backup.sh
│   ├── repair.sh
│   └── uninstall.sh
├── references/              # Detailed knowledge base for Fedora, GPUs & Wayland
│   ├── fedora.md
│   ├── hyprland.md
│   ├── nvidia.md
│   ├── amd.md
│   ├── intel.md
│   ├── wayland.md
│   ├── portals.md
│   └── troubleshooting.md
└── tests/                   # Safe, non-destructive test suite
    ├── test-detection.sh
    └── test-scripts.sh
```

---

## 🤝 Contributing

Contributions, bug reports, and improvements are welcome! Feel free to open an issue or submit a pull request on GitHub.

---

## 📜 License

Distributed under the [MIT License](file:///home/supersusi/myprojects/hyperlandfedora/LICENSE).
