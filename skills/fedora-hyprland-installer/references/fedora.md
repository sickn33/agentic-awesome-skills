# Fedora Linux System Conventions

## Package Management
Fedora utilizes `dnf` as its primary package manager.

```bash
sudo dnf install <package>
sudo dnf remove <package>
sudo dnf check-update
```

## Desktop Sessions & Wayland
Fedora Workstation uses Wayland by default with GDM (GNOME Display Manager) or SDDM (KDE).
Session files are stored in:
- `/usr/share/wayland-sessions/hyprland.desktop`
- `/usr/share/xsessions/` (for X11 fallback sessions)

## System Services
User-level services are managed via systemd:
```bash
systemctl --user status pipewire
systemctl --user status wireplumber
systemctl --user status xdg-desktop-portal
```
