# Anti-Reversing Techniques Implementation Playbook

This file contains detailed patterns, checklists, and code samples referenced by the skill.

# Anti-Reversing Techniques

Understanding protection mechanisms encountered during authorized software analysis, security research, and malware analysis. This knowledge helps analysts bypass protections to complete legitimate analysis tasks.

## Anti-Debugging Techniques

### Windows Anti-Debugging

#### API-Based Detection

```c
// IsDebuggerPresent
if (IsDebuggerPresent()) {
    exit(1);
}

// CheckRemoteDebuggerPresent
BOOL debugged = FALSE;
CheckRemoteDebuggerPresent(GetCurrentProcess(), &debugged);
if (debugged) exit(1);

// NtQueryInformationProcess
typedef NTSTATUS (NTAPI *pNtQueryInformationProcess)(
    HANDLE, PROCESSINFOCLASS, PVOID, ULONG, PULONG);

DWORD debugPort = 0;
NtQueryInformationProcess(
    GetCurrentProcess(),
    ProcessDebugPort,        // 7
    &debugPort,
    sizeof(debugPort),
    NULL
);
if (debugPort != 0) exit(1);

// Debug flags
DWORD debugFlags = 0;
NtQueryInformationProcess(
    GetCurrentProcess(),
    ProcessDebugFlags,       // 0x1F
    &debugFlags,
    sizeof(debugFlags),
    NULL
);
if (debugFlags == 0) exit(1);  // 0 means being debugged
```

**Bypass Approaches:**
```python
# x64dbg: ScyllaHide plugin
# Patches common anti-debug checks

# Manual patching in debugger:
# - Set IsDebuggerPresent return to 0
# - Patch PEB.BeingDebugged to 0
# - Hook NtQueryInformationProcess

# IDAPython: Patch checks
ida_bytes.patch_byte(check_addr, 0x90)  # NOP
```

#### PEB-Based Detection

```c
// Direct PEB access
#ifdef _WIN64
    PPEB peb = (PPEB)__readgsqword(0x60);
#else
    PPEB peb = (PPEB)__readfsdword(0x30);
#endif

// BeingDebugged flag
if (peb->BeingDebugged) exit(1);

// NtGlobalFlag
// Debugged: 0x70 (FLG_HEAP_ENABLE_TAIL_CHECK |
//                 FLG_HEAP_ENABLE_FREE_CHECK |
//                 FLG_HEAP_VALIDATE_PARAMETERS)
if (peb->NtGlobalFlag & 0x70) exit(1);

// Heap flags
PDWORD heapFlags = (PDWORD)((PBYTE)peb->ProcessHeap + 0x70);
if (*heapFlags & 0x50000062) exit(1);
```

**Bypass Approaches:**
```assembly
; In debugger, modify PEB directly
; x64dbg: dump at gs:[60] (x64) or fs:[30] (x86)
; Set BeingDebugged (offset 2) to 0
; Clear NtGlobalFlag (offset 0xBC for x64)
```

#### Timing-Based Detection

```c
// RDTSC timing
uint64_t start = __rdtsc();
// ... some code ...
uint64_t end = __rdtsc();
if ((end - start) > THRESHOLD) exit(1);

// QueryPerformanceCounter
LARGE_INTEGER start, end, freq;
QueryPerformanceFrequency(&freq);
QueryPerformanceCounter(&start);
// ... code ...
QueryPerformanceCounter(&end);
double elapsed = (double)(end.QuadPart - start.QuadPart) / freq.QuadPart;
if (elapsed > 0.1) exit(1);  // Too slow = debugger

// GetTickCount
DWORD start = GetTickCount();
// ... code ...
if (GetTickCount() - start > 1000) exit(1);
```

**Bypass Approaches:**
```
- Use hardware breakpoints instead of software
- Patch timing checks
- Use VM with controlled time
- Hook timing APIs to return consistent values
```

#### Exception-Based Detection

```c
// SEH-based detection
__try {
    __asm { int 3 }  // Software breakpoint
}
__except(EXCEPTION_EXECUTE_HANDLER) {
    // Normal execution: exception caught
    return;
}
// Debugger ate the exception
exit(1);

// VEH-based detection
LONG CALLBACK VectoredHandler(PEXCEPTION_POINTERS ep) {
    if (ep->ExceptionRecord->ExceptionCode == EXCEPTION_BREAKPOINT) {
        ep->ContextRecord->Rip++;  // Skip INT3
        return EXCEPTION_CONTINUE_EXECUTION;
    }
    return EXCEPTION_CONTINUE_SEARCH;
}
```

### Linux Anti-Debugging

```c
// ptrace self-trace
if (ptrace(PTRACE_TRACEME, 0, NULL, NULL) == -1) {
    // Already being traced
    exit(1);
}

// /proc/self/status
FILE *f = fopen("/proc/self/status", "r");
char line[256];
while (fgets(line, sizeof(line), f)) {
    if (strncmp(line, "TracerPid:", 10) == 0) {
        int tracer_pid = atoi(line + 10);
        if (tracer_pid != 0) exit(1);
    }
}

// Parent process check
if (getppid() != 1 && strcmp(get_process_name(getppid()), "bash") != 0) {
    // Unusual parent (might be debugger)
}
```

**Bypass Approaches:**
```bash
# LD_PRELOAD to hook ptrace
# Compile: gcc -shared -fPIC -o hook.so hook.c
long ptrace(int request, ...) {
    return 0;  // Always succeed
}

# Usage
LD_PRELOAD=./hook.so ./target
```

## Anti-VM Detection

### Hardware Fingerprinting

```c
// CPUID-based detection
int cpuid_info[4];
__cpuid(cpuid_info, 1);
// Check hypervisor bit (bit 31 of ECX)
if (cpuid_info[2] & (1 << 31)) {
    // Running in hypervisor
}

// CPUID brand string
__cpuid(cpuid_info, 0x40000000);
char vendor[13] = {0};
memcpy(vendor, &cpuid_info[1], 12);
// "VMwareVMware", "Microsoft Hv", "KVMKVMKVM", "VBoxVBoxVBox"

// MAC address prefix
// VMware: 00:0C:29, 00:50:56
// VirtualBox: 08:00:27
// Hyper-V: 00:15:5D
```

### Registry/File Detection

```c
// Windows registry keys
// HKLM\SOFTWARE\VMware, Inc.\VMware Tools
// HKLM\SOFTWARE\Oracle\VirtualBox Guest Additions
// HKLM\HARDWARE\ACPI\DSDT\VBOX__

// Files
// C:\Windows\System32\drivers\vmmouse.sys
// C:\Windows\System32\drivers\vmhgfs.sys
// C:\Windows\System32\drivers\VBoxMouse.sys

// Processes
// vmtoolsd.exe, vmwaretray.exe
// VBoxService.exe, VBoxTray.exe
```

### Timing-Based VM Detection

```c
// VM exits cause timing anomalies
uint64_t start = __rdtsc();
__cpuid(cpuid_info, 0);  // Causes VM exit
uint64_t end = __rdtsc();
if ((end - start) > 500) {
    // Likely in VM (CPUID takes longer)
}
```

**Bypass Approaches:**
```
- Use bare-metal analysis environment
- Harden VM (remove guest tools, change MAC)
- Patch detection code
- Use specialized analysis VMs (FLARE-VM)
```

## Code Obfuscation

### Control Flow Obfuscation

#### Control Flow Flattening

```c
// Original
if (cond) {
    func_a();
} else {
    func_b();
}
func_c();

// Flattened
int state = 0;
while (1) {
    switch (state) {
        case 0:
            state = cond ? 1 : 2;
            break;
        case 1:
            func_a();
            state = 3;
            break;
        case 2:
            func_b();
            state = 3;
            break;
        case 3:
            func_c();
            return;
    }
}
```

**Analysis Approach:**
- Identify state variable
- Map state transitions
- Reconstruct original flow
- Tools: D-810 (IDA), SATURN

#### Opaque Predicates

```c
// Always true, but complex to analyze
int x = rand();
if ((x * x) >= 0) {  // Always true
    real_code();
} else {
    junk_code();  // Dead code
}

// Always false
if ((x * (x + 1)) % 2 == 1) {  // Product of consecutive = even
    junk_code();
}
```

**Analysis Approach:**
- Identify constant expressions
- Symbolic execution to prove predicates
- Pattern matching for known opaque predicates

### Data Obfuscation

#### String Encryption

```c
// XOR encryption
char decrypt_string(char *enc, int len, char key) {
    char *dec = malloc(len + 1);
    for (int i = 0; i < len; i++) {
        dec[i] = enc[i] ^ key;
    }
    dec[len] = 0;
    return dec;
}

// Stack strings
char url[20];
url[0] = 'h'; url[1] = 't'; url[2] = 't'; url[3] = 'p';
url[4] = ':'; url[5] = '/'; url[6] = '/';
// ...
```

**Analysis Approach:**
```python
# FLOSS for automatic string deobfuscation
floss malware.exe

# IDAPython string decryption
def decrypt_xor(ea, length, key):
    result = ""
    for i in range(length):
        byte = ida_bytes.get_byte(ea + i)
        result += chr(byte ^ key)
    return result
```

#### API Obfuscation

```c
// Dynamic API resolution
typedef HANDLE (WINAPI *pCreateFileW)(LPCWSTR, DWORD, DWORD,
    LPSECURITY_ATTRIBUTES, DWORD, DWORD, HANDLE);

HMODULE kernel32 = LoadLibraryA("kernel32.dll");
pCreateFileW myCreateFile = (pCreateFileW)GetProcAddress(
    kernel32, "CreateFileW");

// API hashing
DWORD hash_api(char *name) {
    DWORD hash = 0;
    while (*name) {
        hash = ((hash >> 13) | (hash << 19)) + *name++;
    }
    return hash;
}
// Resolve by hash comparison instead of string
```

**Analysis Approach:**
- Identify hash algorithm
- Build hash database of known APIs
- Use HashDB plugin for IDA
- Dynamic analysis to resolve at runtime

### Instruction-Level Obfuscation

#### Dead Code Insertion

```asm
; Original
mov eax, 1

; With dead code
push ebx           ; Dead
mov eax, 1
pop ebx            ; Dead
xor ecx, ecx       ; Dead
add ecx, ecx       ; Dead
```

#### Instruction Substitution

```asm
; Original: xor eax, eax (set to 0)
; Substitutions:
sub eax, eax
mov eax, 0
and eax, 0
lea eax, [0]

; Original: mov eax, 1
; Substitutions:
xor eax, eax
inc eax

push 1
pop eax
```

## Packing and Encryption

### Common Packers

```
UPX          - Open source, easy to unpack
Themida      - Commercial, VM-based protection
VMProtect    - Commercial, code virtualization
ASPack       - Compression packer
PECompact    - Compression packer
Enigma       - Commercial protector
```

### Unpacking Methodology

```
1. Identify packer (DIE, Exeinfo PE, PEiD)

2. Static unpacking (if known packer):
   - UPX: upx -d packed.exe
   - Use existing unpackers

3. Dynamic unpacking:
   a. Find Original Entry Point (OEP)
   b. Set breakpoint on OEP
   c. Dump memory when OEP reached
   d. Fix import table (Scylla, ImpREC)

4. OEP finding techniques:
   - Hardware breakpoint on stack (ESP trick)
   - Break on common API calls (GetCommandLineA)
   - Trace and look for typical entry patterns
```

### Manual Unpacking Example

```
1. Load packed binary in x64dbg
2. Note entry point (packer stub)
3. Use ESP trick:
   - Run to entry
   - Set hardware breakpoint on [ESP]
   - Run until breakpoint hits (after PUSHAD/POPAD)
4. Look for JMP to OEP
5. At OEP, use Scylla to:
   - Dump process
   - Find imports (IAT autosearch)
   - Fix dump
```

## Virtualization-Based Protection

### Code Virtualization

```
Original x86 code is converted to custom bytecode
interpreted by embedded VM at runtime.

Original:     VM Protected:
mov eax, 1    push vm_context
add eax, 2    call vm_entry
              ; VM interprets bytecode
              ; equivalent to original
```

### Analysis Approaches

```
1. Identify VM components:
   - VM entry (dispatcher)
   - Handler table
   - Bytecode location
   - Virtual registers/stack

2. Trace execution:
   - Log handler calls
   - Map bytecode to operations
   - Understand instruction set

3. Lifting/devirtualization:
   - Map VM instructions back to native
   - Tools: VMAttack, SATURN, NoVmp

4. Symbolic execution:
   - Analyze VM semantically
   - angr, Triton
```

## Bypass Strategies Summary

### General Principles

1. **Understand the protection**: Identify what technique is used
2. **Find the check**: Locate protection code in binary
3. **Patch or hook**: Modify check to always pass
4. **Use appropriate tools**: ScyllaHide, x64dbg plugins
5. **Document findings**: Keep notes on bypassed protections

### Tool Recommendations

```
Anti-debug bypass:    ScyllaHide, TitanHide
Unpacking:           x64dbg + Scylla, OllyDumpEx
Deobfuscation:       D-810, SATURN, miasm
VM analysis:         VMAttack, NoVmp, manual tracing
String decryption:   FLOSS, custom scripts
Symbolic execution:  angr, Triton
```

### Ethical Considerations

This knowledge should only be used for:
- Authorized security research
- Malware analysis (defensive)
- CTF competitions
- Understanding protections for legitimate purposes
- Educational purposes

Never use to bypass protections for:
- Software piracy
- Unauthorized access
- Malicious purposes
