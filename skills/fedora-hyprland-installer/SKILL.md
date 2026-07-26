---
name: fedora-hyprland-installer
description: Install, configure, verify, repair, update, and uninstall Hyprland on Fedora Linux with GPU-aware detection (NVIDIA/AMD/Intel).
date_added: "2026-07-26"
risk: safe
---

# Fedora Hyprland Installer Skill

This skill provides an automated, safety-first workflow for managing Hyprland on Fedora Linux.

## Script Path Resolution Directive

When `agy` is launched from a user's working directory, bundled scripts do NOT reside in `./scripts/`. 
The agent MUST first locate the base directory of the `fedora-hyprland-installer` skill (e.g., `<workspace>/.agents/skills/fedora-hyprland-installer`, `~/.gemini/antigravity-cli/skills/fedora-hyprland-installer`, or the skill repository root) and define it as `SKILL_DIR`.

All bundled scripts MUST be executed using their full path relative to `SKILL_DIR`: `<SKILL_DIR>/scripts/<script-name>.sh`.

---

## Core Directives & Safety Rules

1. **Fedora-First**: Always use Fedora tools (`dnf`, `systemctl`, `loginctl`). Never use `apt`, `pacman`, or `yay`.
2. **Never Blindly Execute**: Inspect the system prior to any installation or modification.
3. **Preserve Existing Desktop**: Do not uninstall GNOME, KDE, or any existing desktop environment. Hyprland should be added as a session choice in the display manager (GDM/SDDM/LightDM).
4. **Mandatory Backup**: Always create a timestamped backup in `~/.local/state/fedora-hyprland-installer/backups/` before writing or altering configurations in `~/.config/hypr/`, `~/.config/waybar/`, etc.
5. **GPU Awareness**: Check whether the system uses NVIDIA, AMD, Intel, or Hybrid graphics before configuring environment variables or graphics drivers. Never use arbitrary `.run` installers for NVIDIA; rely on Fedora/RPM Fusion repositories.
6. **Privileged Operations**: Sudo commands must be clearly identified and communicated to the user. Do not hardcode passwords.
7. **Idempotency**: Running actions multiple times must be safe and avoid duplicate config lines.

---

## Workflow Guide

### 1. Installation Workflow
When the user asks to **"Install Hyprland"** or **"Setup Hyprland on Fedora"**:
1. Execute `<SKILL_DIR>/scripts/detect-system.sh` and `<SKILL_DIR>/scripts/detect-gpu.sh`.
2. Execute `<SKILL_DIR>/scripts/preflight.sh` to verify Fedora release, network, package manager, and sudo access.
3. Execute `<SKILL_DIR>/scripts/backup.sh` to preserve any pre-existing configurations.
4. Execute `<SKILL_DIR>/scripts/install.sh` to install Hyprland, Wayland portal packages (`xdg-desktop-portal-hyprland`, `xdg-desktop-portal-gtk`), PipeWire/WirePlumber, terminal, launcher, status bar, and authentication agent.
5. Execute `<SKILL_DIR>/scripts/configure.sh` to write a clean, functional initial Hyprland config (`~/.config/hypr/hyprland.conf`) tailored to detected terminal/launcher and GPU environment variables.
6. Execute `<SKILL_DIR>/scripts/verify.sh` to ensure binaries, portal services, PipeWire, and login desktop entries (`/usr/share/wayland-sessions/hyprland.desktop`) exist and validate.
7. Present a summary report detailing installed packages, backup paths, and login instructions.

### 2. Repair Workflow
When the user asks to **"Fix Hyprland"**, **"Hyprland won't start"**, **"No audio"**, **"Screen sharing broken"**:
1. Run `<SKILL_DIR>/scripts/detect-system.sh` and inspect system logs (`journalctl -xe`, `journalctl --user -u xdg-desktop-portal`).
2. Execute `<SKILL_DIR>/scripts/repair.sh` to identify missing portals, PipeWire states, broken symlinks, or GPU driver mismatches.
3. Apply minimal, targeted repairs without re-installing unchanged packages.
4. Execute `<SKILL_DIR>/scripts/verify.sh`.

### 3. Update Workflow
When the user asks to **"Update Hyprland"**:
1. Run `<SKILL_DIR>/scripts/backup.sh`.
2. Refresh Fedora package metadata (`sudo dnf check-update hyprland`).
3. Update Hyprland and related Wayland packages via `<SKILL_DIR>/scripts/install.sh --update`.
4. Validate configuration syntax and verify system integrity via `<SKILL_DIR>/scripts/verify.sh`.

### 4. Uninstall Workflow
When the user asks to **"Uninstall Hyprland"**:
1. Explain to the user which packages will be removed.
2. Run `<SKILL_DIR>/scripts/backup.sh`.
3. Execute `<SKILL_DIR>/scripts/uninstall.sh` to cleanly remove Hyprland packages while preserving base desktop environments (GNOME/KDE) and user backup files.

---

## Reference Manuals

- [Fedora Details](references/fedora.md)
- [Hyprland Config Guide](references/hyprland.md)
- [NVIDIA Setup & Wayland](references/nvidia.md)
- [AMD Mesa Stack](references/amd.md)
- [Intel Mesa Stack](references/intel.md)
- [Wayland & Environment](references/wayland.md)
- [Portals & PipeWire](references/portals.md)
- [Troubleshooting Matrix](references/troubleshooting.md)
