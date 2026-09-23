---
name: dali-short-address-commissioner
description: "Commissions DALI and DALI-2 (IEC 62386) lighting buses: short-address assignment (0-63), 24-bit binary search collision resolution, groups, and DT8 color control. Trigger phrases: commission dali, dali short address, dali collision resolution, dali bus addressing, dali-2 setup."
category: architecture
risk: safe
source: community
source_repo: wwewtech/dali-short-address-commissioner
source_type: community
date_added: "2026-09-22"
author: wwewtech
tags: [dali, dali-2, lighting-control, iec-62386, building-automation, iot]
tools: [claude, cursor, gemini, windsurf]
license: "MIT"
---

# DALI Short-Address Commissioner: Deterministic IEC 62386 Bus Provisioning

Systematically discover, resolve address collisions, assign short addresses (0–63), program groups and scenes, configure DT8 color gear, and schedule emergency battery duration tests on DALI and DALI-2 networks per IEC 62386.

## When to Use This Skill

Activate this skill when:
- Bringing up, commissioning, or expanding DALI or DALI-2 lighting installations (KNX/DALI gateways, Tridonic, Philips Dynalite, Helvar, Osram, Lunatone).
- The user asks: "How do I commission this DALI bus?", "Fix duplicate DALI short addresses", "Assign DALI addresses without erasing existing fixtures", or "Program DALI groups and DT8 tunable white".
- Resolving address clash loops where multiple ballasts respond simultaneously to broadcast queries.
- Designing or scheduling DALI-2 Part 202 emergency lighting duration and function tests across staggered floor circuits.

Do NOT use this skill when:
- Commissioning DMX512/RDM stage lighting, 0–10V analog dimming, or proprietary wireless RF networks (Zigbee, Bluetooth Mesh, Casambi).
- Diagnosing dead ballasts or physical wiring faults before basic DALI bus voltage (12V–20.5V DC) and current limits (<= 250mA) are confirmed.
- Programming building-wide KNX logic (this skill covers the DALI protocol domain strictly).

## Core Mental Models & Non-Negotiable Rules

1. **The 64-Address Bus Capacity Law**:
   - A single DALI subnet supports strictly **0 to 63 short addresses** (64 control gear units maximum).
   - Groups are strictly bounded to **0 to 15** (16 groups).
   - Scenes are strictly bounded to **0 to 15** (16 scenes).
   - If an installation has 65+ ballasts, the physical bus MUST be segmented into multiple DALI subnets with separate line masters or gateways.

2. **The Double-Command 100ms Transmission Invariant**:
   - Configuration and addressing commands (INITIALISE [cmd 258], RANDOMISE [259], SET SHORT ADDRESS [267], ENABLE WRITE [cmd 32], etc.) MUST be transmitted **twice within 100ms** to be executed by control gear.
   - Sending an addressing command only once will result in silent ignored execution by all IEC 62386 compliant gear.

3. **The 15-Minute Hardware Commissioning Timer**:
   - Transmitting `INITIALISE` (cmd 258) starts a mandatory 15-minute countdown timer inside every ballast's micro-controller.
   - All discovery, random address binary searching, and short address assignment MUST complete within 15 minutes, or the bus must receive a periodic keep-alive `INITIALISE` refresh.
   - Upon completion, the master MUST transmit `TERMINATE` (cmd 257) to lock operational memory and exit programming state.

4. **24-Bit Random Address Binary Search ($2^{24} = 16,777,216$ Space)**:
   - When gear enters randomizing state (`RANDOMISE`), each unit generates a pseudo-random 24-bit integer (`0x000000` to `0xFFFFFF`).
   - The master searches the 24-bit space using `SEARCHADDRH`, `SEARCHADDRM`, `SEARCHADDRL` and `COMPARE` (cmd 265).
   - If multiple ballasts match, the master performs binary search down to a single device.
   - Once isolated, assign short address via `PROGRAM SHORT ADDRESS` (cmd 267) and immediately transmit `WITHDRAW` (cmd 266) so the addressed fixture drops out of remaining search iterations.

5. **Physical Identify & Non-Destructive Extension Invariant**:
   - Every assigned short address MUST be verified visually using `IDENTIFY` or toggling `RECALL MAX LEVEL` / `OFF` before committing to lighting schedules.
   - When adding fixtures to an existing operational line, NEVER broadcast a global `INITIALISE (all)`; use `INITIALISE (without short address)` so already-commissioned ballasts (0–63) preserve their programming.

## Named Sins & Anti-Patterns (Что категорически ЗАПРЕЩЕНО)

| Anti-Pattern | Manifestation in Code/Workflow | Mandatory Production Counter-Rule |
| :--- | :--- | :--- |
| **Single-Shot Addressing Commands** | Sending cmd 258 or cmd 267 once without repetition. | Always repeat configuration commands within a strict 100ms window. |
| **Exceeding 64 Short Addresses** | Attempting to assign address 64 or 65 on one loop. | Partition into Subnet A and Subnet B; enforce 0–63 maximum. |
| **Timer Starvation** | Letting the 15-minute `INITIALISE` window expire mid-search. | Issue keep-alive refresh or optimize binary search loop to < 3 minutes. |
| **Ghost Address Overwrite** | Assigning address 0 without scanning if address 0 is in use. | Run non-destructive `QUERY STATUS` (cmd 144) across 0–63 before reassigning. |
| **Bus Overcurrent Overload** | Connecting 64 ballasts (2mA each) + sensors to a 100mA PSU. | Verify total quiescent load $\le$ PSU rating (250mA max per IEC 62386). |
| **DT8 / DT6 Type Mismatch** | Controlling tunable white gear with single-channel DT6 arc power. | Issue `SELECT DIMMING CURVE / COLOUR` (Part 209) and send DT8 color coordinates. |
| **Simultaneous Emergency Discharge** | Triggering 3-hour duration tests on all emergency lights at once. | Stagger tests across alternating weeks/groups to ensure safety illumination. |
| **Missing WITHDRAW Command** | Forgetting cmd 266 after addressing a found ballast. | Send `WITHDRAW` immediately after `PROGRAM SHORT ADDRESS` to exclude from search. |
| **DALI Polarity Panic** | Halting installation claiming standard DALI requires polarity. | Note DALI uses an integrated bridge rectifier; polarity is non-critical (though consistent coloring is advised). |
| **Energizing Unverified Mains** | Commissioning ballasts while 230V live mains work is ongoing. | Enforce physical lockout/tagout (LOTO) prior to terminal connection. |

## Concrete Archetypes / Presets

### Archetype 1: Greenfield DALI Discovery & Binary Search (Python/C Pseudo-code)
```python
import time

def send_dali_double_cmd(cmd_byte1: int, cmd_byte2: int):
    transmit_dali_frame(cmd_byte1, cmd_byte2)
    time.sleep(0.015)  # 15ms spacing
    transmit_dali_frame(cmd_byte1, cmd_byte2)

def commission_greenfield_bus() -> dict:
    assigned = {}
    # 1. Start 15-min commissioning session
    send_dali_double_cmd(0xA5, 0x00)  # INITIALISE (all gear)
    send_dali_double_cmd(0xA7, 0x00)  # RANDOMISE
    time.sleep(0.100)                  # Wait 100ms for random address generation

    next_short_addr = 0
    while next_short_addr < 64:
        low, high = 0x000000, 0xFFFFFF
        found_random_addr = None

        # Binary search 24-bit space
        while low <= high:
            mid = (low + high) // 2
            set_search_address(mid)
            if query_compare():  # cmd 265: does any gear have random_addr <= mid?
                found_random_addr = mid
                high = mid - 1
            else:
                low = mid + 1

        if found_random_addr is None:
            break  # No more unaddressed fixtures on the bus

        # Isolate and assign
        set_search_address(found_random_addr)
        short_addr_payload = (next_short_addr << 1) | 0x01
        send_dali_double_cmd(0xB7, short_addr_payload)  # PROGRAM SHORT ADDRESS
        send_dali_cmd(0xAB, 0x00)                       # WITHDRAW (cmd 266)

        # Physical verify
        flash_fixture(next_short_addr)
        assigned[next_short_addr] = hex(found_random_addr)
        next_short_addr += 1

    send_dali_cmd(0xA1, 0x00)  # TERMINATE (cmd 257)
    return assigned
```

### Archetype 2: Surgical Replacement of a Failed Ballast
```python
def replace_single_failed_ballast(expected_short_addr: int):
    # Do NOT wipe existing 63 ballasts:
    send_dali_double_cmd(0xA5, 0xFF)  # INITIALISE (ONLY gear without short address)
    send_dali_double_cmd(0xA7, 0x00)  # RANDOMISE
    time.sleep(0.100)

    # Perform binary search for the single new replacement unit
    random_addr = search_single_unit()
    set_search_address(random_addr)

    # Program directly into the missing slot
    payload = (expected_short_addr << 1) | 0x01
    send_dali_double_cmd(0xB7, payload)
    send_dali_cmd(0xAB, 0x00)  # WITHDRAW
    send_dali_cmd(0xA1, 0x00)  # TERMINATE
```

### Archetype 3: Group & DT8 Tunable White Configuration
```python
def configure_dt8_tunable_white(short_addr: int, mirek: int, group_id: int):
    # Mirek = 1,000,000 / Kelvin (e.g. 2700K = 370 mirek, 6500K = 153 mirek)
    send_dali_cmd(0x01, 0x00)  # DTR0: low byte of mirek
    send_dali_cmd(0x03, 0x00)  # DTR1: high byte of mirek
    send_dali_double_cmd(0xE7, 0x20)  # SET TEMP COLOUR (DT8 Part 209)
    # Add to group (0-15)
    group_payload = 0x60 | (group_id & 0x0F)
    send_dali_double_cmd(0x01 | (short_addr << 1), group_payload)
```

## The Pre-Emit Quality Gate Checklist

Before finalizing any DALI commissioning plan or script, check:
- [ ] **Address Ceiling**: Total short addresses $\le 64$ (addresses 0–63).
- [ ] **Double Transmission Timing**: Configuration commands repeat twice within 100ms.
- [ ] **Commissioning Window**: 15-minute timer monitored with `TERMINATE` sent at conclusion.
- [ ] **Withdrawal Discipline**: `WITHDRAW` (cmd 266) sent immediately after each address assignment.
- [ ] **Bus Current Check**: Total quiescent load calculated ($\le 250\text{mA}$ power supply capacity).
- [ ] **Emergency Test Staggering**: Emergency battery duration tests scheduled in alternating groups.
- [ ] **Physical Verification**: `IDENTIFY` / `WINK` toggle step included for human visual signoff.

## Self-Correction & Verification Loop

### Bad (Vibe-Coded AI Slop Output):
> "To assign addresses on DALI, loop from 1 to 100 and send cmd 267 to each light. If lights don't respond, change the positive and negative wires because DALI needs polarity."
*Problems: Exceeds 64 addresses, addresses start at 1 instead of 0, misses double-command transmission, forgets random search, wrongly asserts DALI polarity dependence.*

### Good (Production DALI Commissioner Output):
> 1. Verify bus PSU delivers 16V DC with total load under 250mA (e.g., 42 ballasts $\times$ 2mA = 84mA).
> 2. Send `INITIALISE (all)` [cmd 258] twice within 100ms, starting the 15-minute commissioning watchdog.
> 3. Transmit `RANDOMISE` [cmd 259] twice within 100ms.
> 4. Execute 24-bit binary search across `SEARCHADDR` space. For each isolated unit, transmit `PROGRAM SHORT ADDRESS` (slot 0–41) twice within 100ms, immediately followed by `WITHDRAW` [cmd 266].
> 5. Issue `TERMINATE` [cmd 257] to exit programming mode and physically pulse each luminaire to verify mapping.

## Limitations

- DALI command support, timing, gear limits, and DT8 behavior vary by control gear, device type, and IEC 62386 edition. Confirm commands against the exact gear and gateway manuals before transmission.
- Commissioning can disrupt occupied lighting and emergency systems. Coordinate an approved outage and have a qualified lighting professional verify any live bus operation; never treat these examples as a substitute for site procedures.
- Pseudo-code is illustrative and is not a tested gateway driver. Verify address mapping and every fixture physically before saving configuration.
