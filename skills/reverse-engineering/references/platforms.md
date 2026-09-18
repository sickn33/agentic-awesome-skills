# CTF Reverse - Platform-Specific Reversing

macOS/iOS, embedded/IoT firmware, kernel driver, and automotive reverse engineering.

## Table of Contents
- [macOS / iOS Reversing](#macos--ios-reversing)
  - [Mach-O Binary Format](#mach-o-binary-format)
  - [Code Signing & Entitlements](#code-signing--entitlements)
  - [Objective-C Runtime RE](#objective-c-runtime-re)
  - [Swift Binary Reversing](#swift-binary-reversing)
  - [iOS App Analysis](#ios-app-analysis)
  - [dyld / Dynamic Linking](#dyld--dynamic-linking)
- [Embedded / IoT Firmware RE](#embedded--iot-firmware-re)
  - [Firmware Extraction](#firmware-extraction)
  - [Firmware Unpacking](#firmware-unpacking)
  - [Architecture-Specific Notes](#architecture-specific-notes)
  - [RTOS Analysis](#rtos-analysis)
- [Kernel Driver Reversing](#kernel-driver-reversing)
  - [Linux Kernel Modules](#linux-kernel-modules)
  - [eBPF Programs](#ebpf-programs)
  - [Windows Kernel Drivers](#windows-kernel-drivers)
- [Automotive / CAN Bus RE](#automotive--can-bus-re)

---

## macOS / iOS Reversing

### Mach-O Binary Format

```bash
# File identification
file binary                    # "Mach-O 64-bit executable arm64" or "x86_64"
otool -l binary               # Load commands (segments, dylibs, entry point)
otool -L binary               # Linked dynamic libraries

# Universal (fat) binaries — multiple architectures in one file
lipo -info universal_binary    # List architectures
lipo universal_binary -thin arm64 -output binary_arm64  # Extract one arch

# Segments and sections
otool -l binary | grep -A5 "segment\|section"
# Key segments: __TEXT (code), __DATA (globals), __LINKEDIT (symbols)
# Key sections: __text (instructions), __cstring (C strings), __objc_methname
```

**Key Mach-O concepts:**
- Load commands drive the dynamic linker (`dyld`)
- `LC_MAIN` → entry point (replaces `LC_UNIXTHREAD`)
- `LC_LOAD_DYLIB` → shared library dependencies
- `LC_CODE_SIGNATURE` → code signing blob
- `__DATA_CONST.__got` → Global Offset Table
- `__DATA.__la_symbol_ptr` → Lazy symbol pointers (like PLT)

### Code Signing & Entitlements

```bash
# Check code signature
codesign -dvvv binary
codesign --verify binary

# Extract entitlements (capability permissions)
codesign -d --entitlements - binary
# Key entitlements: com.apple.security.app-sandbox, com.apple.security.network.client

# Remove code signature (for patching)
codesign --remove-signature binary

# Re-sign (ad-hoc, for testing)
codesign -f -s - binary
```

**CTF relevance:** Patched binaries need re-signing to run on macOS. Ad-hoc signing (`-s -`) works for local testing.

### Objective-C Runtime RE

```bash
# Dump Objective-C class info
class-dump binary > classes.h
# Shows: @interface, @protocol, method signatures with types

# Runtime inspection with lldb
(lldb) expression -l objc -O -- [NSClassFromString(@"ClassName") new]
(lldb) expression -l objc -O -- [[ClassName alloc] init]

# Method swizzling detection (anti-tamper)
# Look for: method_exchangeImplementations, class_replaceMethod
```

**Objective-C in disassembly:**
```text
# objc_msgSend(receiver, selector, ...) is THE dispatch mechanism
# RDI = self (receiver), RSI = selector (char* method name)

# In Ghidra/IDA, look for:
objc_msgSend(obj, "checkPassword:", input)
# Selector strings are in __objc_methname section
# Cross-reference selectors to find implementations
```

**class-dump alternatives:**
- `dsdump` — faster, supports Swift + Objective-C
- `otool -oV binary` — dump Objective-C segments
- Ghidra: Enable "Objective-C" analyzer in Analysis Options

### Swift Binary Reversing

```bash
# Detect Swift
strings binary | grep "swift"
otool -l binary | grep "swift"   # __swift5_* sections

# Swift demangling
swift demangle 's14MyApp0A8ClassC10checkInput6resultSbSS_tF'
# → MyApp.MyAppClass.checkInput(result: String) -> Bool

# xcrun swift-demangle < mangled_names.txt
```

**Swift in disassembly:**
```text
# Swift uses value witness tables (VWT) for type operations
# Protocol witness tables (PWT) for dynamic dispatch (like vtables)

# Key runtime functions to watch:
swift_allocObject          → heap allocation
swift_release             → reference count decrement
swift_bridgeObjectRetain  → bridged (ObjC ↔ Swift) retain
swift_once                → lazy initialization (like dispatch_once)

# String layout:
# Small strings (≤15 bytes): inline in 16-byte buffer, tagged pointer
# Large strings: heap-allocated, pointer + length + flags

# Array<T>: pointer to ContiguousArrayStorage (header + elements)
# Dictionary<K,V>: hash table with open addressing
```

**Ghidra for Swift:** Enable "Swift" language module. Swift metadata sections (`__swift5_types`, `__swift5_proto`) contain type descriptors that Ghidra can parse.

### iOS App Analysis

```bash
# Extract IPA (iOS app package)
unzip app.ipa -d extracted/
ls extracted/Payload/*.app/

# Check if encrypted (App Store encryption / FairPlay DRM)
otool -l extracted/Payload/*.app/binary | grep -A4 "LC_ENCRYPTION_INFO"
# cryptid = 1 means encrypted, 0 means decrypted

# Decrypt with frida-ios-dump (requires jailbroken device)
# Or use Clutch / bfdecrypt on device
frida-ios-dump -H jailbroken_ip -p 22 "App Name"

# Analyze decrypted binary
class-dump decrypted_binary > headers.h
```

**Jailbreak detection and bypass:**
```javascript
// Common jailbreak checks:
// 1. Check for Cydia/Sileo
// 2. Check /private/var/lib/apt
// 3. fork() succeeds (sandboxed apps can't fork)
// 4. Open /etc/apt, /bin/sh with write
// 5. Check for substrate/substitute libraries

// Frida bypass:
var paths = ["/Applications/Cydia.app", "/bin/sh", "/etc/apt",
             "/private/var/lib/apt", "/usr/bin/ssh"];
Interceptor.attach(Module.findExportByName(null, "access"), {
    onEnter(args) {
        this.path = Memory.readUtf8String(args[0]);
    },
    onLeave(retval) {
        if (paths.some(p => this.path && this.path.includes(p))) {
            retval.replace(-1);  // File not found
        }
    }
});
```

### dyld / Dynamic Linking

```bash
# DYLD environment variables (for analysis, blocked in hardened runtime)
DYLD_PRINT_LIBRARIES=1 ./binary       # Print loaded dylibs
DYLD_INSERT_LIBRARIES=hook.dylib ./binary  # Inject dylib (like LD_PRELOAD)
# Note: SIP (System Integrity Protection) blocks this for system binaries

# Inspect dyld shared cache (contains all system frameworks)
dyld_shared_cache_util -list /System/Cryptexes/OS/System/Library/dyld/dyld_shared_cache_arm64e
```

---

## Embedded / IoT Firmware RE

### Firmware Extraction

```bash
# binwalk — firmware analysis and extraction
binwalk firmware.bin                        # Identify embedded filesystems, compressed data
binwalk -e firmware.bin                     # Extract all identified components
binwalk -Me firmware.bin                    # Recursive extraction (matryoshka)
binwalk --dd='.*' firmware.bin              # Extract everything raw

# Manual extraction by signature
strings firmware.bin | head -50             # Look for version strings, filesystem markers
hexdump -C firmware.bin | grep "hsqs"       # SquashFS magic
hexdump -C firmware.bin | grep "UBI#"       # UBI magic
```

**Hardware extraction methods (physical access):**
```text
UART:  Serial console — often gives root shell or bootloader access
       Tools: USB-UART adapter, baudrate detection (usually 115200)
       Identify: 4 pins (GND, TX, RX, VCC), use multimeter

JTAG:  Direct CPU debug — read/write flash, halt CPU, set breakpoints
       Tools: OpenOCD, J-Link, Bus Pirate
       Identify: 10/14/20-pin header, use JTAGulator for auto-detection

SPI Flash: Direct chip read — dump entire firmware
           Tools: flashrom, CH341A programmer
           Identify: 8-pin SOIC chip (Winbond, Macronix, etc.)

eMMC:  Embedded MMC — common in routers, phones
       Tools: eMMC reader, direct solder to test pads
```

### Firmware Unpacking

```bash
# SquashFS (most common in routers)
unsquashfs -d output/ squashfs-root.sqfs
# If custom compression: try different compressors (-comp xz|lzma|lzo|gzip)

# JFFS2
jefferson -d output/ jffs2.img

# UBI/UBIFS
ubireader_extract_images firmware.ubi
ubireader_extract_files ubifs.img

# CPIO (initramfs)
cpio -idv < initramfs.cpio

# Device tree blob
dtc -I dtb -O dts -o output.dts device_tree.dtb

# Kernel extraction
binwalk -e firmware.bin
# Look for: zImage, uImage, vmlinux
# Extract vmlinux from compressed: vmlinux-to-elf tool
```

### Architecture-Specific Notes

**ARM (most common in IoT):**
```bash
# Cross-toolchain
apt install gcc-arm-linux-gnueabihf gdb-multiarch

# QEMU emulation
qemu-arm -L /usr/arm-linux-gnueabihf/ ./arm_binary
qemu-arm -g 1234 ./arm_binary    # Start GDB server on port 1234
gdb-multiarch -ex 'target remote :1234' ./arm_binary

# ARM vs Thumb: ARM instructions are 4 bytes, Thumb are 2 bytes
# LSB of function pointer indicates mode: 0=ARM, 1=Thumb
# Ghidra: Right-click → Processor Options → ARM/Thumb mode
```

**ARM64/AArch64:** See [platforms-hardware.md](platforms-hardware.md#arm64aarch64-reversing-and-exploitation) for AArch64 calling convention, ROP gadgets, and qemu-aarch64-static emulation.

**MIPS (routers, embedded):**
```bash
# Big-endian vs little-endian — check ELF header or file command
file binary    # "MIPS, MIPS32 rel2 (MIPS-II), big-endian" or "little-endian"

# Emulation
qemu-mips -L /usr/mips-linux-gnu/ ./mips_binary         # Big-endian
qemu-mipsel -L /usr/mipsel-linux-gnu/ ./mipsel_binary   # Little-endian

# Key MIPS patterns:
# Branch delay slots — instruction AFTER branch always executes
# $gp (global pointer) — used for PIC, points to .got
# lui + addiu pair — loads 32-bit constant (upper 16 + lower 16)
```

**RISC-V:** See main [tools.md](tools.md#risc-v-binary-analysis-ehax-2026) for Capstone disassembly and [platforms-hardware.md](platforms-hardware.md#risc-v-advanced) for advanced extensions and debugging.

### RTOS Analysis

```text
FreeRTOS:
  - Tasks (like threads): xTaskCreate → function pointer + stack
  - Strings: "IDLE", "Tmr Svc", task names
  - xQueueSend/xQueueReceive → inter-task communication
  - Look for vTaskDelay() for timing, xSemaphoreTake() for sync

Zephyr:
  - k_thread_create → kernel thread creation
  - k_msgq_put/k_msgq_get → message queues
  - CONFIG_* symbols reveal kernel configuration

Bare metal (no OS):
  - Interrupt vector table at address 0x0 or 0x08000000 (STM32)
  - main loop pattern: while(1) { read_input(); process(); output(); }
  - Peripheral registers at memory-mapped addresses (check datasheet)
```

---

## Kernel Driver Reversing

### Linux Kernel Modules

```bash
# Identify kernel module
file module.ko                      # "ELF 64-bit LSB relocatable"
modinfo module.ko                   # Module info (description, author, license)

# List module symbols
nm module.ko | grep -v " U "       # Exported symbols

# Strings for quick recon
strings module.ko | grep -i "flag\|secret\|ioctl\|device"

# Find ioctl handler
# Key pattern: .unlocked_ioctl = my_ioctl_handler in file_operations struct
# In Ghidra: find struct with function pointers, identify by position

# Load in Ghidra
# Language: x86:LE:64:default
# Base address: doesn't matter for .ko (relocatable)
# Look for init_module / cleanup_module entry points
```

**Common kernel module CTF patterns:**
```c
// Device creation (creates /dev/challenge)
alloc_chrdev_region(&dev, 0, 1, "challenge");
cdev_init(&cdev, &fops);

// ioctl handler (main interface)
long my_ioctl(struct file *f, unsigned int cmd, unsigned long arg) {
    switch (cmd) {
        case CUSTOM_CMD_1: /* operation */ break;
        case CUSTOM_CMD_2: /* operation */ break;
    }
}

// copy_from_user / copy_to_user — data transfer with userspace
copy_from_user(kernel_buf, (void __user *)arg, size);
copy_to_user((void __user *)arg, kernel_buf, size);
```

**Debugging kernel modules:**
```bash
# QEMU + GDB for kernel debugging
qemu-system-x86_64 -kernel bzImage -initrd initrd.cpio -s -S \
  -append "console=ttyS0 nokaslr" -nographic

# In another terminal
gdb vmlinux
(gdb) target remote :1234
(gdb) lx-symbols           # Load module symbols (requires scripts)
(gdb) add-symbol-file module.ko 0x<loaded_address>
```

### eBPF Programs

```bash
# Dump eBPF programs from running system
bpftool prog list
bpftool prog dump xlated id <N>    # Disassemble
bpftool prog dump jited id <N>     # JIT'd machine code

# eBPF bytecode analysis
# eBPF has 11 registers (r0-r10), 64-bit
# r0 = return value, r1-r5 = arguments, r10 = frame pointer
# Instructions are 8 bytes each

# Disassemble .o file containing eBPF
llvm-objdump -d ebpf_prog.o

# Key eBPF patterns:
# bpf_map_lookup_elem → read from map
# bpf_map_update_elem → write to map
# bpf_probe_read → read kernel memory
# bpf_trace_printk → debug output
```

### Windows Kernel Drivers

```bash
# .sys files are PE format — load in IDA/Ghidra as normal PE
# Entry point: DriverEntry(PDRIVER_OBJECT, PUNICODE_STRING)

# Key patterns:
# IoCreateDevice → creates device object
# IRP_MJ_DEVICE_CONTROL → ioctl handler
# MmMapIoSpace → memory-mapped I/O
# ObReferenceObjectByHandle → get kernel object from handle
# ZwCreateFile/ZwReadFile → kernel-mode file operations
```

---

## Automotive / CAN Bus RE

```bash
# CAN bus interface setup
sudo ip link set can0 type can bitrate 500000
sudo ip link set up can0

# Capture CAN traffic
candump can0                               # Live capture
candump -l can0                            # Log to file
cansniffer can0                            # Filter/highlight changes

# Replay CAN messages
canplayer -I logfile.log can0
cansend can0 7DF#0201000000000000          # Send single frame (OBD-II request)

# UDS (Unified Diagnostic Services) — common in automotive CTF
# Service 0x27: Security Access (seed-key authentication)
# Service 0x2E: Write Data By Identifier
# Service 0x31: Routine Control

# Decode CAN frames
# ID: 11-bit or 29-bit identifier
# DLC: Data Length Code (0-8 bytes)
# Data: up to 8 bytes payload
```

**CTF automotive patterns:**
- Seed-key bypass: Reverse the key derivation algorithm from ECU firmware
- CAN message replay: Capture legitimate command, replay to unlock feature
- Firmware extraction from ECU via UDS/KWP2000
