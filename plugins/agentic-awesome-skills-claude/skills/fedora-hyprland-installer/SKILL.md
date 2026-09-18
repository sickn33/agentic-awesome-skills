---
name: fedora-hyprland-installer
description: Install, configure, verify, repair, update, and uninstall Hyprland on Fedora Linux with GPU-aware detection (NVIDIA/AMD/Intel).
category: devops
risk: critical
source: community
source_repo: maleksaadi0109/hyprfedora
source_type: community
date_added: "2026-07-26"
author: maleksaadi0109
tags: [fedora, hyprland, wayland, linux]
tools: [claude, cursor, gemini]
license: MIT
license_source: https://github.com/maleksaadi0109/hyprfedora/blob/3ec6d4fc5eecdb188613dd841dce9926ae5c8319/LICENSE
---

# Fedora Hyprland Installer Skill

This skill provides an automated, safety-first workflow for managing Hyprland on Fedora Linux.

## Resolve the Skill Directory

Before running a bundled script, resolve `SKILL_DIR` to the directory that
contains this `SKILL.md`. Do not assume the user's current working directory or
guess a global installation path. If the agent cannot resolve the installed
skill directory from its runtime context, stop and ask the user to provide it.
Invoke bundled shell files explicitly with `bash` and a quoted path, for
example `bash "$SKILL_DIR/scripts/detect-system.sh"`.

## When to Use

- Use when installing or updating a Fedora-packaged Hyprland desktop stack.
- Use when verifying a Hyprland session, portals, PipeWire, or WirePlumber on Fedora.
- Use when diagnosing the limited repair cases documented below or removing the Hyprland-specific packages installed by this workflow.

## Core Directives & Safety Rules

1. **Fedora-First**: Always use Fedora tools (`dnf`, `systemctl`, `loginctl`). Never use `apt`, `pacman`, or `yay`.
2. **Never Blindly Execute**: Inspect the system prior to any installation or modification.
3. **Preserve Existing Desktop**: Do not uninstall GNOME, KDE, or any existing desktop environment. Hyprland should be added as a session choice in the display manager (GDM/SDDM/LightDM).
4. **Mandatory Backup**: Always create a timestamped backup in `~/.local/state/fedora-hyprland-installer/backups/` before writing or altering configurations in `~/.config/hypr/`, `~/.config/waybar/`, etc.
5. **GPU Awareness**: Check whether the system uses NVIDIA, AMD, Intel, or Hybrid graphics before configuring environment variables or graphics drivers. Never use arbitrary `.run` installers for NVIDIA; rely on Fedora/RPM Fusion repositories.
6. **Privileged Operations**: Sudo commands must be clearly identified and communicated to the user. Do not hardcode passwords.
7. **Idempotency**: Running actions multiple times must be safe and avoid duplicate config lines.
8. **Explicit Consent**: Show the exact package or service changes first. Run scripts that mutate packages or services only after the user confirms; use `repair.sh` without `--apply` for diagnosis.

---

## Workflow Guide

### 1. Installation Workflow
When the user asks to **"Install Hyprland"** or **"Setup Hyprland on Fedora"**:
1. Execute `bash "$SKILL_DIR/scripts/detect-system.sh"` and `bash "$SKILL_DIR/scripts/detect-gpu.sh"`.
2. Execute `bash "$SKILL_DIR/scripts/preflight.sh"` to verify Fedora release, network, package manager, and sudo access.
3. Execute `bash "$SKILL_DIR/scripts/backup.sh"` to preserve any pre-existing configurations.
4. Show the package plan with `bash "$SKILL_DIR/scripts/install.sh" --dry-run`; after explicit approval, execute `bash "$SKILL_DIR/scripts/install.sh"` to install Hyprland, Wayland portal packages (`xdg-desktop-portal-hyprland`, `xdg-desktop-portal-gtk`), PipeWire/WirePlumber, terminal, launcher, status bar, and authentication agent.
5. Execute `bash "$SKILL_DIR/scripts/configure.sh"` to write a clean, functional initial Hyprland config (`~/.config/hypr/hyprland.conf`) tailored to detected terminal/launcher and GPU environment variables.
6. Execute `bash "$SKILL_DIR/scripts/verify.sh"` to ensure binaries, portal services, PipeWire, and login desktop entries (`/usr/share/wayland-sessions/hyprland.desktop`) exist and validate.
7. Present a summary report detailing installed packages, backup paths, and login instructions.

### 2. Repair Workflow
When the user asks to **"Fix Hyprland"**, **"Hyprland won't start"**, **"No audio"**, **"Screen sharing broken"**:
1. Run `bash "$SKILL_DIR/scripts/detect-system.sh"` and inspect system logs (`journalctl -xe`, `journalctl --user -u xdg-desktop-portal`).
2. Execute `bash "$SKILL_DIR/scripts/repair.sh"` to report a missing Hyprland config, missing portal package, and inactive PipeWire/WirePlumber services.
3. Review the proposed changes with the user, then execute `bash "$SKILL_DIR/scripts/repair.sh" --apply` only after approval. The script can create a missing config, install missing portal packages, and enable or restart the checked user services; investigate other faults manually.
4. Execute `bash "$SKILL_DIR/scripts/verify.sh"`.

### 3. Update Workflow
When the user asks to **"Update Hyprland"**:
1. Run `bash "$SKILL_DIR/scripts/backup.sh"`.
2. Show the package plan with `bash "$SKILL_DIR/scripts/install.sh" --dry-run --update` and obtain approval.
3. Update Hyprland and related Wayland packages via `bash "$SKILL_DIR/scripts/install.sh" --update`.
4. Validate configuration syntax and verify system integrity via `bash "$SKILL_DIR/scripts/verify.sh"`.

### 4. Uninstall Workflow
When the user asks to **"Uninstall Hyprland"**:
1. Explain to the user which packages will be removed.
2. Run `bash "$SKILL_DIR/scripts/backup.sh"`.
3. Show the removal list and obtain approval, then execute `bash "$SKILL_DIR/scripts/uninstall.sh" --yes` to remove the listed Hyprland-specific packages while preserving base desktop environments (GNOME/KDE) and user backup files.

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

## Examples

Inspect the system and preview the package plan without changing it:

```bash
bash "$SKILL_DIR/scripts/detect-system.sh"
bash "$SKILL_DIR/scripts/detect-gpu.sh"
bash "$SKILL_DIR/scripts/install.sh" --dry-run
```

## Limitations

- Bundled shell files are intentionally non-executable under the repository
  safety policy and must be invoked explicitly with `bash` as shown above.
- Fedora package availability varies by Fedora release and enabled repositories. This skill does not enable RPM Fusion or install GPU drivers.
- GPU detection identifies vendors, not whether a proposed configuration is correct for a particular driver version, hybrid-graphics routing, monitor, or laptop.
- The repair script covers only the checks it reports; it does not diagnose broken symlinks, kernel parameters, GPU driver mismatches, or every portal/audio failure.
- Generated configuration is a minimal starting point and is not merged into an existing `hyprland.conf`.
- Commands that install or remove packages, change services, or regenerate initramfs require review, explicit consent, and suitable privileges.
