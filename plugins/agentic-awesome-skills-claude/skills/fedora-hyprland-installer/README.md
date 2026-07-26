# 🏔️ hyprfedora

> A safety-first agent skill that installs, configures, verifies, repairs, and removes Hyprland on Fedora Linux while preserving existing desktop packages and user backups.

---

## 🎯 Why This Project Exists

Setting up Hyprland on Fedora can be tedious. You have to configure Wayland portals, sort out PipeWire audio, select launcher/terminal defaults, and configure GPU flags—especially if you're running NVIDIA or hybrid graphics.

After installing this skill through your agent's supported skill mechanism, ask:

> **"Install Hyprland on my Fedora system."**

The agent inspects your system hardware, creates timestamped backups of existing settings, proposes Fedora package changes, and can create a minimal Hyprland configuration after you approve mutating steps. It detects GPU vendors but does not install or configure graphics drivers.

---

## ✨ Key Features

- 🛡️ **Safety First & Mandatory Backups**: Never overwrites your existing `~/.config/hypr/` without creating a timestamped backup in `~/.local/state/fedora-hyprland-installer/backups/`.
- 🐧 **Fedora-Native**: Built specifically for Fedora. Uses `dnf`, `systemctl`, and standard Fedora package repositories.
- ⚡ **GPU Aware**: Detects NVIDIA, AMD Radeon, Intel, and hybrid setups and adds a conservative Hyprland-native cursor workaround for detected NVIDIA hardware.
- 🤝 **Desktop Coexistence**: Never removes GNOME, KDE, or Xfce. Hyprland is added as a session option at your GDM/SDDM login screen.
- 🛠️ **Scoped Repair**: Reports a missing config or portal package and inactive PipeWire/WirePlumber services; approved fixes can be applied with `repair.sh --apply`.
- 🧼 **Scoped Removal**: Removes the listed Hyprland-specific packages while preserving your base desktop and backups.

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

### Agent usage

Use the installation method documented by your agent or by the repository catalog, then invoke the skill in natural language. The skill does not assume a particular global directory or CLI executable.

- **Fresh Install**: `"Install Hyprland on my Fedora machine."`
- **Health Check**: `"Verify my Hyprland installation."`
- **Troubleshoot & Fix**: `"Fix my screen sharing on Hyprland"` or `"Hyprland won't start."`
- **Update Setup**: `"Update my Hyprland packages."`
- **Uninstall**: `"Uninstall Hyprland."`

---

## 🛠️ Direct Terminal Utilities

You can also run the built-in utilities in `scripts/` directly:

```bash
# Detect hardware, OS, and session information
bash ./scripts/detect-system.sh

# Detect GPU hardware (NVIDIA / AMD / Intel)
bash ./scripts/detect-gpu.sh

# Run preflight system verification
bash ./scripts/preflight.sh

# Verify health of your current Hyprland installation
bash ./scripts/verify.sh

# Run the isolated non-destructive test suite
bash ./tests/test-scripts.sh
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

Distributed under the MIT License included in `LICENSE`.
