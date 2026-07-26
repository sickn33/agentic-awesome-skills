# Hyprland Troubleshooting Matrix

## Symptom 1: Black Screen on Boot (NVIDIA)
- **Cause**: Missing Wayland environment variables or modeset issue.
- **Investigation**: Check the installed NVIDIA driver documentation and whether `nvidia_drm.modeset=1` is active. If the symptom is specifically cursor-related, test `cursor { no_hardware_cursors = true }` in `hyprland.conf`.

## Symptom 2: Screen Sharing Not Working (OBS / Browser)
- **Cause**: Inactive portal or pipewire environment variable missing.
- **Fix**: Run:
  ```bash
  systemctl --user restart xdg-desktop-portal-hyprland
  systemctl --user restart xdg-desktop-portal
  ```

## Symptom 3: No Sound Output
- **Cause**: PipeWire or WirePlumber service failed.
- **Fix**: Run:
  ```bash
  systemctl --user restart pipewire wireplumber
  ```

## Symptom 4: Cursor Missing or Invisible (NVIDIA)
- **Cause**: Hardware cursor rendering not supported by GPU driver.
- **Fix**: Add to `hyprland.conf`:
  ```text
  cursor {
      no_hardware_cursors = true
  }
  ```

## Symptom 5: Apps Blurry or Wrong Scale (XWayland)
- **Cause**: XWayland apps not using native Wayland rendering.
- **Fix**: Set environment variables in `hyprland.conf`:
  ```text
  env = GDK_BACKEND,wayland,x11
  env = QT_QPA_PLATFORM,wayland;xcb
  env = MOZ_ENABLE_WAYLAND,1
  ```

## Symptom 6: Multi-Monitor Not Working
- **Cause**: Incorrect or missing monitor config.
- **Fix**: Check connected monitors with `hyprctl monitors` and configure in `hyprland.conf`:
  ```text
  monitor=,preferred,auto,1
  ```

## Symptom 7: Flickering / Tearing (NVIDIA)
- **Cause**: Missing DRM kernel module setting.
- **Investigation**: Confirm the installed driver's recommended DRM settings before changing boot configuration. If its documentation requires these options, review and add them to `/etc/modprobe.d/nvidia.conf`:
  ```text
  options nvidia_drm modeset=1 fbdev=1
  ```
  Regenerating initramfs with `sudo dracut --force` is a privileged, boot-critical change. Back up the current configuration and obtain explicit approval before running it.
