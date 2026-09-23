---
name: marlin-bed-leveling
description: "Calibrates Marlin 2.x 3D printer firmware bed leveling: Unified Bed Leveling (UBL), Bilinear ABL, M420 S1 post-homing, Z-probe offsets, G26 mesh prints, and EEPROM slots. Trigger phrases: marlin bed leveling, ubl calibration, m420 s1, z probe offset, g29 bed level, first layer adhesion."
category: development
risk: safe
source: community
source_repo: wwewtech/marlin-bed-leveling
source_type: community
date_added: "2026-09-22"
author: wwewtech
tags: [3d-printing, marlin-firmware, gcode, hardware-calibration, fdm, additive-manufacturing]
tools: [claude, cursor, gemini, windsurf]
license: "MIT"
---

# Marlin Bed Leveling: Deterministic Calibration & First-Layer Mesh Engineering

Master Marlin 2.x bed leveling architectures (Unified Bed Leveling UBL, Bilinear ABL, Manual Mesh MBL) to guarantee flawless first-layer adhesion through rigorous G-code phase workflows, probe offset math, and persistent EEPROM compensation.

## When to Use This Skill

Activate this skill when:
- Calibrating, tuning, or troubleshooting automatic bed leveling on Marlin 2.x 3D printers (Ender 3, CR-10, Prusa clones, custom CoreXY / Cartesian machines).
- The user asks: "How do I set up UBL in Marlin?", "My printer homes with G28 and ignores the mesh", "Calculate BLTouch Z-probe offset", "Generate G26 validation print G-code", or "Edit warped mesh points with M421".
- Diagnosing first-layer defects: nozzle dragging across PEI sheets, corner detachment, uneven squish, or compensation disabling after homing.
- Sizing slicer start G-code sequences (Cura, PrusaSlicer, OrcaSlicer, Bambu Studio) with thermal soaking and mesh restoration.

Do NOT use this skill when:
- Calibrating Klipper or RepRapFirmware printers (different firmware syntax and mesh compensation systems).
- Fixing gross mechanical skew: loose V-slot rollers, bent Z leadscrews, or wobbly gantry arms (hardware faults cannot be solved by software leveling).
- Delta printer kinematics setup requiring radius and tower endstop adjustments before mesh probing.

## Core Mental Models & Non-Negotiable Rules

1. **The Post-Homing Enable Mandate (`G28` Disables Leveling)**:
   - In Marlin firmware, executing `G28` (Home All Axes) automatically **DISABLES bed leveling compensation by default** (`RESTORE_LEVELING_AFTER_G28` is often disabled in vendor firmware).
   - In every print start G-code, the leveling restoration command MUST be issued **strictly AFTER `G28`**:
     ```gcode
     G28      ; Home all axes (silently turns leveling OFF)
     M420 S1  ; Re-enable bed leveling compensation from EEPROM mesh
     ```
   - Failing to include `M420 S1` (or `G29 A` for UBL) after `G28` causes the printer to execute the entire print with zero leveling compensation.

2. **The 5-Phase UBL Calibration Loop**:
   Unified Bed Leveling (UBL) is a state machine requiring five sequential phases:
   - **Phase 1 (Probe Reachable Grid)**: `G29 P1` probes all coordinates physically reachable by the probe offset.
   - **Phase 2 (Manual Edge Probing)**: `G29 P2` uses a paper feeler gauge for points the BLTouch cannot reach due to gantry geometry.
   - **Phase 3 (Mathematical Extrapolation)**: `G29 P3 T0.0` fills unprobed edge coordinates by extrapolating slopes from adjacent measured points.
   - **Phase 4 (Validation & Micro-Tuning)**: `G26 B60 H210 F1.75` prints a single-layer validation test pattern; inspect and edit coordinates with `M421 I... J... Q...`.
   - **Phase 5 (Storage & Activation)**: `G29 S1` saves to EEPROM mesh slot 1; `G29 A` activates UBL; `M500` commits to permanent EEPROM storage.

3. **Thermal Equilibrium Pre-Flight Invariant**:
   - Aluminum build plates, magnetic stickers, and spring-steel PEI sheets expand and warp non-linearly under thermal expansion.
   - Probing a bed at room temperature (20°C) and then printing at 60°C or 100°C bakes a $0.08\text{--}0.20\text{mm}$ error into every mesh point.
   - **Mandatory Pre-Flight**: Beds MUST be heated to target operating temperature and soaked for $\ge 5\text{ minutes}$ prior to running `G29` probing.

4. **Z-Probe Offset Sign Convention (`M851 Z...`)**:
   - For downward-deploying probes (BLTouch, CRTouch, inductive sensors) where the probe trigger point triggers *below* the nozzle tip:
     $$\mathbf{Z\text{-}Offset\ is\ strictly\ NEGATIVE}\ (e.g.,\ \text{M851 Z-1.85})$$
   - A *positive* Z-offset on a downward-deploying probe instructs the firmware that the nozzle is lower than the probe trigger, driving the nozzle directly into the bed on the first move.
   - Adjusting Z-offset with paper gauge:
     - More resistance / tighter squish $\implies$ more negative (e.g., `-1.80` $\to$ `-1.85`).
     - Less resistance / looser gap $\implies$ less negative (e.g., `-1.80` $\to$ `-1.75`).

5. **Mesh Fade Height Geometry (`M420 Z...`)**:
   - Leveling compensation must gradually fade out as Z-height increases so top surface layers print geometrically flat rather than conforming to the bed warp.
   - Set fade height to `M420 Z10.0` (fades compensation smoothly over the first 10mm of print height). Setting `Z0` disables fade (perpetuating bed ripples to the top of the model); setting `Z > 25` is unnecessary ballast.

## Named Sins & Anti-Patterns (Что категорически ЗАПРЕЩЕНО)

| Anti-Pattern | Manifestation in Code/Workflow | Mandatory Production Counter-Rule |
| :--- | :--- | :--- |
| **The Forgotten `M420 S1`** | `G28` followed immediately by print moves. | Always place `M420 S1` (or `G29 A`) immediately after `G28`. |
| **Cold Bed Mesh Probing** | Running `G29 P1` with bed heater at 20°C. | Heat bed to printing temperature and soak for $\ge 5$ minutes first. |
| **Positive Z-Probe Offset** | Setting `M851 Z+1.5` on a BLTouch probe. | Downward-deploying probes MUST have a negative Z-offset (`M851 Z-...`). |
| **Unsaved Mesh Discard** | Probing a 7x7 mesh without running `M500`. | Always commit mesh to EEPROM via `G29 S1` followed by `M500`. |
| **Software-Fixing Physical Tilt** | Compensating for a 2.5mm physical gantry tilt with UBL. | Physically tram bed corners (`G35` or thumb screws) before probing. |
| **Blind Unchecked Extrapolation** | Running `G29 P3` without verifying boundary values. | Inspect extrapolated border points with `M420 V` or `G29 T`. |
| **Cold Extruder G26 Validation** | Running G26 test without nozzle heating. | Heat nozzle to printing temperature (`G26 B60 H210 F1.75`). |
| **Loose Probe Mount Blindness** | Probing while BLTouch bracket has physical wobble. | Check physical probe mount rigidity; probe repeatability requires $s \le 0.005\text{mm}$ (`M48`). |
| **Excessive Fade Height** | Setting `M420 Z0` or `M420 Z50`. | Use `M420 Z10.0` to smoothly transition from warped bed to true flat geometry. |
| **Blind Point Over-Editing** | Manually offsetting a single mesh point by 0.5mm via `M421`. | Clean the build plate or check for debris under PEI sheet before altering matrix. |

## Concrete Archetypes / Presets

### Archetype 1: End-to-End Unified Bed Leveling (UBL) Calibration Macro
```gcode
; ==============================================================================
; MARLIN 2.x UBL FULL CALIBRATION SEQUENCE
; ==============================================================================
M140 S60         ; Start heating bed to 60°C
M190 S60         ; Wait for bed to reach 60°C
G4 S300          ; Thermal soak for 300 seconds (5 minutes)

G28              ; Home all axes
M117 Probing Reachable Points...
G29 P1           ; Phase 1: Automated probe of reachable grid points

M117 Extrapolating Mesh Edges...
G29 P3 T0.0      ; Phase 3: Mathematically extrapolate unprobed perimeter points
G29 P3 T0.0      ; Second pass to ensure corner fill

G29 T            ; Print ASCII topology matrix to terminal for verification
G29 S1           ; Save calibrated mesh to EEPROM slot 1
G29 A            ; Activate UBL leveling system
M500             ; Save EEPROM permanently to board flash
M117 UBL Mesh 1 Saved and Activated!
```

### Archetype 2: Production Slicer Start G-Code (Cura / PrusaSlicer / Orca)
```gcode
; ==============================================================================
; PRODUCTION SLICER START G-CODE (MARLIN UBL / BILINEAR)
; ==============================================================================
M140 S[first_layer_bed_temperature]    ; Start heating bed
M104 S150                              ; Pre-heat nozzle to 150°C (prevent oozing)
M190 S[first_layer_bed_temperature]    ; Wait for bed to stabilize

G28                                    ; Home all axes (turns leveling OFF)
M420 S1 Z10.0                          ; Restore mesh from EEPROM & set 10mm fade
; (OR for UBL: G29 A followed by G29 L1)

G1 Z50 F3000                           ; Move nozzle up to safe clearance
M109 S[first_layer_temperature]        ; Heat nozzle to final printing temp

; Priming Purge Line on bed edge
G92 E0                                 ; Reset extruder
G1 X0.1 Y20 Z0.28 F5000.0              ; Move to start position
G1 X0.1 Y200.0 Z0.28 F1500.0 E15       ; Draw first purge line
G1 X0.4 Y200.0 Z0.28 F5000.0           ; Move to side
G1 X0.4 Y20 Z0.28 F1500.0 E30          ; Draw second purge line
G92 E0                                 ; Reset extruder
G1 Z2.0 F3000                          ; Z-hop before moving to print
```

### Archetype 3: Probe Repeatability & Offset Verification (`M48` & `M851`)
```gcode
; ==============================================================================
; PROBE REPEATABILITY & Z-OFFSET CALIBRATION
; ==============================================================================
G28                     ; Home axes
G1 X117.5 Y117.5 Z10 F5000 ; Move to center of 235x235 bed
M48 P10 X117.5 Y117.5 V2 E L2 ; Run 10-point repeatability test
; Standard deviation must be <= 0.005 mm. If > 0.010 mm, tighten probe mount!

; Manual Z-Offset adjustment with paper feeler gauge:
; 1. Move to Z=0: G1 Z0 F1000
; 2. Baby-step Z until paper drags with slight friction
; 3. If nozzle moved down 0.15mm: M851 Z-1.85 (subtract 0.15 from current -1.70)
; 4. Commit: M500
```

## The Pre-Emit Quality Gate Checklist

Before emitting any Marlin leveling advice, macro, or slicer start code:
- [ ] **Post-Homing Verification**: `M420 S1` (or `G29 A`) placed strictly after `G28` in the execution flow.
- [ ] **Thermal Soak Pre-Flight**: Bed heating and 5-minute soak mandated prior to `G29` probing.
- [ ] **Negative Offset Math**: Downward-deploying probes have verified negative `M851 Z-...` values.
- [ ] **EEPROM Commit**: `G29 S1` followed immediately by `M500` to preserve the mesh.
- [ ] **Fade Height Limit**: `M420 Z10.0` configured for smooth transition to flat geometry.
- [ ] **Physical Tramming Precedence**: Confirmed that manual corner leveling is performed before software compensation.
- [ ] **Probe Repeatability**: Confirmed that `M48` probe standard deviation is $\le 0.005\text{mm}$.

## Self-Correction & Verification Loop

### Bad (Vibe-Coded AI Slop Output):
> "Put `G29` before `G28` in your start G-code. If your BLTouch is scraping, set `M851 Z1.5`. You don't need to heat the bed during leveling because Marlin compensates for it automatically."
*Problems: Fatal G28 homing wipes out the preceding G29 mesh, positive Z-offset crashes nozzle into bed, dangerous cold probing advice.*

### Good (Production Marlin Bed Leveling Output):
> 1. Tram the four bed corners manually using `G35` or thumb screws to get mechanical variance under $\pm 0.1\text{mm}$.
> 2. Heat bed to 60°C and nozzle to 150°C; let soak for 5 minutes so thermal expansion stabilizes.
> 3. Verify probe repeatability using `M48 P10` (standard deviation must be $\le 0.005\text{mm}$).
> 4. Probe grid with `G29 P1`, extrapolate unprobed corners with `G29 P3 T0.0`, save to slot 1 with `G29 S1`, and commit to flash with `M500`.
> 5. In your slicer start G-code, place `M420 S1 Z10.0` immediately after `G28` to restore the active mesh with a 10mm fade height.

## Limitations

- Marlin commands and mesh behavior vary with firmware version, configuration, probe, bed geometry, and slicer. Check the exact firmware build and printer documentation before applying a macro or offset.
- G-code can move a hot toolhead and damage equipment or cause burns. Supervise calibration, keep hands clear, use the printer's emergency stop when motion is unsafe, and verify travel limits before running generated sequences.
- Example coordinates, temperatures, tolerances, and fade values are illustrative; measure the actual printer and follow the manufacturer’s limits.
