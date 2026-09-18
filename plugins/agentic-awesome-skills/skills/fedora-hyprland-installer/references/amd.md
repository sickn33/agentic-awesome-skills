# AMD Radeon Support

## Driver Architecture
AMD GPUs use open-source kernel drivers (`amdgpu`) and the Mesa graphics stack included in Fedora by default.

## Verification
- Verify Mesa openGL driver: `glxinfo | grep "OpenGL vendor"`
- Verify RADV Vulkan driver: `vulkaninfo | grep driverName`

No proprietary driver installation is required for Hyprland on AMD GPUs.
