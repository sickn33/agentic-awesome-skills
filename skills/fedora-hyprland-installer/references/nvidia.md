# NVIDIA Support on Fedora Wayland / Hyprland

## Recommended Environment Variables
Some NVIDIA setups may require Wayland environment flags in `~/.config/hypr/hyprland.conf`; confirm them against the installed driver and Hyprland versions:

```text
env = LIBVA_DRIVER_NAME,nvidia
env = GBM_BACKEND,nvidia-drm
env = __GLX_VENDOR_LIBRARY_NAME,nvidia
env = NVD_BACKEND,direct
```

For cursor rendering issues, use the Hyprland-native config option (Hyprland v0.36+):
```text
cursor {
    no_hardware_cursors = true
}
```

> **Note**: The old `WLR_NO_HARDWARE_CURSORS=1` environment variable is **deprecated** since Hyprland v0.36+. Use the `cursor` config block above instead.

## Drivers on Fedora
If proprietary drivers are required, use packages maintained for Fedora, such as RPM Fusion's `akmod-nvidia`, after reviewing that repository's setup guidance. This skill does not enable RPM Fusion or install GPU drivers.
Never use raw `.run` installers from NVIDIA's website as they break Fedora kernel updates.

## Hybrid Graphics (Intel + NVIDIA / AMD + NVIDIA)
Laptops with dual GPUs may need additional configuration:
- Check active GPU: `supergfxctl` or `prime-run`
- Verify render offloading: `__NV_PRIME_RENDER_OFFLOAD=1 glxinfo | grep vendor`
