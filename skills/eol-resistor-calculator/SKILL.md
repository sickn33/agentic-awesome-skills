---
name: eol-resistor-calculator
description: "Calculates and validates end-of-line (EOL, SEOL, DEOL, TEOL) resistor loops for intrusion alarm panels (Honeywell, DSC, Paradox, Bosch) with wire gauge drop and state tables. Trigger phrases: eol resistor, deol wiring, alarm zone resistor, calculate end of line, double eol tamper."
category: architecture
risk: safe
source: community
source_repo: wwewtech/eol-resistor-calculator
source_type: community
date_added: "2026-09-22"
author: wwewtech
tags: [security-systems, hardware, electronics, alarm-panel, circuit-design, electrical-engineering]
tools: [claude, cursor, gemini, windsurf]
license: "MIT"
---

# EOL Resistor Calculator: Precision Intrusion Loop Supervision & State Solver

Accurately size, configure, and troubleshoot Single (SEOL), Double (DEOL), and Triple (TEOL) end-of-line resistor loops across major security panel architectures with copper wire drop compensation and tamper state discrimination.

## When to Use This Skill

Activate this skill when:
- Sizing, retrofitting, or diagnosing hardwired security loops on alarm panels (DSC PowerSeries/Neo, Honeywell Ademco Vista, Paradox EVO/Spectra, Bosch B/G Series, Texecom Premier Elite).
- The user asks: "How do I wire double EOL on a DSC panel?", "Calculate zone loop resistance for a 200m cable run", "Troubleshoot a constant zone tamper fault", or "What resistor values does Honeywell Vista use?".
- Differentiating between Normal, Alarm, Tamper (Short), and Cut (Open) circuit states across varying panel threshold windows.
- Sizing copper loop resistance drops on long perimeter runs (e.g. 22 AWG over 150+ meters) to prevent phantom false alarms.

Do NOT use this skill when:
- Designing wireless sensors or addressable polling loop multiplexers (polling loops use digital transponders, not passive EOL resistors).
- Bypassing safety or life-safety supervision circuits (never advise strapping out resistors or bypassing line supervision).
- Working on 2-wire smoke detector loops without consulting panel-specific smoke circuit polarity and current-limiting specs.

## Core Mental Models & Non-Negotiable Rules

1. **The Far-End Placement Axiom (Strict Anti-Panel Stacking)**:
   - Resistors MUST be installed **inside the sensor housing at the farthest physical end of the cable run**.
   - Placing resistors across screw terminals inside the alarm panel enclosure protects only the metal cabinet itself; the entire 50-meter cable run to the sensor is left vulnerable to undetected wire cuts or staple shorts.
   - Use the exact listed installation and grading rules; this guide cannot certify Grade2/Grade3 compliance.

2. **The 4-State Double-EOL (DEOL) Truth Table**:
   - Double EOL uses two resistors: an End-of-Line resistor ($R_{EOL}$) and an Alarm contact resistor ($R_{ALARM}$).
   - Standard series-parallel configuration (e.g., DSC standard 5.6k / 5.6k):
     $$\text{Loop State} = \begin{cases} 
     0\ \Omega\ (\text{Short Circuit}) & \implies \mathbf{Fault\ (Short)} \\
     R_{EOL}\ (5.6\text{k}\ \Omega) & \implies \mathbf{Normal\ (Secure)} \\
     R_{EOL} + R_{ALARM}\ (11.2\text{k}\ \Omega) & \implies \mathbf{Alarm\ (Tripped)} \\
     \infty\ \Omega\ (\text{Open Circuit}) & \implies \mathbf{Tamper\ (Cut\ Wire)}
     \end{cases}$$
   - These electrical states aid supervision; they do not prove the cause or rule out sabotage.

3. **Copper Wire Resistance Compensation Formula**:
   - Long field cable runs add series loop resistance across both conductors:
     $$R_{loop} = 2 \times D \times \rho_{gauge}$$
     where $D$ is one-way distance in meters, and $\rho_{gauge}$ is resistance per meter:
     - **22 AWG (0.326 mm²)**: $0.053\ \Omega/\text{meter}$ ($16.14\ \Omega/1000\text{ft}$)
     - **20 AWG (0.518 mm²)**: $0.033\ \Omega/\text{meter}$ ($10.15\ \Omega/1000\text{ft}$)
     - **18 AWG (0.823 mm²)**: $0.021\ \Omega/\text{meter}$ ($6.38\ \Omega/1000\text{ft}$)
   - A 150m run of 22 AWG adds $2 \times 150 \times 0.053 \approx 15.9\ \Omega$. Ensure total loop resistance does not push readings beyond the panel's documented resistance windows, allowing for resistor/cable/temperature tolerances.

4. **Model-specific reference values**:
   - The cited PowerSeries Neo manual shows5600Ω secure,11200Ω violated,0Ω fault and open-circuit tamper for its DEOL configuration.
   - Do not generalize values across Honeywell, Paradox, Bosch, Texecom or even different zones/configurations of the same model. Obtain the exact installation manual and zone programming first.

5. **ADC Voltage Divider Acceptance Windows**:
   - Security panels measure zone voltage through an internal pull-up resistor ($R_{pullup}$, typically $1\text{k}$ to $3.3\text{k}\ \Omega$) connected to a reference voltage ($V_{ref}$, typically $5.0\text{V}$ or $13.8\text{V}$).
   - Terminal voltage is given by:
     $$V_{zone} = V_{ref} \times \frac{R_{loop\_total}}{R_{pullup} + R_{loop\_total}}$$
   - Always confirm whether a measured terminal voltage falls inside the manufacturer's specified ADC threshold window before replacing field hardware.

## Named Sins & Anti-Patterns (Что категорически ЗАПРЕЩЕНО)

| Anti-Pattern | Manifestation in Code/Workflow | Mandatory Production Counter-Rule |
| :--- | :--- | :--- |
| **Panel-Terminal Resistor Stacking** | Crimping EOL resistors into the screw terminals on the panel PCB. | Install resistors exclusively inside the remote sensor housing. |
| **Vendor Value Cross-Contamination** | Using another panel’s resistor value without checking the exact zone manual. | Verify panel model and enforce manufacturer-specific resistance ratings. |
| **DEOL Series/Parallel Inversion** | Swapping series and parallel resistors on an alarm PIR contact. | Wire $R_{ALARM}$ in parallel with NC alarm switch; wire $R_{EOL}$ in series with loop. |
| **Neglecting Wire Drop on Long Runs** | Ignoring 40+ $\Omega$ wire resistance on a 300-meter warehouse fence zone. | Calculate loop resistance $2 \times D \times \rho$ and verify against panel budget. |
| **Twist-and-Tape Resistor Splices** | Twisting resistor leads by hand and wrapping with electrical tape. | Use soldered heat-shrink sleeves or grease-filled B-connectors/crimps. |
| **Fire/Burg Supervised Mix-up** | Applying burglar DEOL tamper logic to 2-wire latching fire zones. | Use the exact listed fire-zone wiring and detector manual; burglary DEOL logic is not a generic fire-loop design. |
| **Unshielded AC Parallel Run** | Running 22/4 unshielded alarm cable in parallel with 230V mains. | Follow local separation/wiring rules and the panel manual; shielding does not make unsafe proximity to mains acceptable. |
| **Strapping Out Trouble Zones** | Advising a user to twist zone wires together to clear a trouble condition. | Diagnose root cause (open wire, bad contact, corroded resistor) methodically. |
| **Confusing NO and NC Contacts** | Treating a magnetic reed switch (NC) like an exit request button (NO). | Verify sensor contact behavior in quiescent, non-alarm states. |
| **Unrecorded Commissioning Values** | Leaving an install without recording measured DC resistance values. | Deliver an audit log of measured loop ohms across Normal, Alarm, and Tamper. |

## Concrete Archetypes / Presets

### Archetype 1: Double-EOL (DEOL) Sensor Wiring Schematic (DSC 5.6k)
```
ZONE -- [NC tamper] -- [R_EOL 5.6k] --+-- [NC alarm] --+-- COM
                                        |                |
                                        +-- [R_ALARM] ---+
                                            5.6k
All resistors and contacts above are at the approved remote detector end.

State Resistance:
• Secure:  5.6k Ω
• Alarm:  11.2k Ω (Alarm contact opens, forcing current through R_ALARM)
• Fault: near0 Ω (short circuit, plus cable resistance to the fault)
• Tamper: ∞ Ω (cut wire or tamper contact opens)
```

### Archetype 2: Loop Resistance & Tolerance Calculator (Python 3.10+)
```python
def calculate_loop_parameters(
    panel_eol_nominal: float,
    panel_tolerance_pct: float,
    one_way_distance_m: float,
    wire_gauge_awg: int = 22,
    deol_mode: bool = True
) -> dict:
    # Ohms per meter for solid annealed copper conductors
    RESISTANCE_PER_M = {18: 0.0209, 20: 0.0333, 22: 0.0530, 24: 0.0842}
    import math
    if not all(math.isfinite(v) for v in (panel_eol_nominal, panel_tolerance_pct, one_way_distance_m)):
        raise ValueError("Finite inputs required")
    if panel_eol_nominal <= 0 or not 0 <= panel_tolerance_pct < 100 or one_way_distance_m < 0:
        raise ValueError("Invalid resistance, tolerance or distance")
    if wire_gauge_awg not in RESISTANCE_PER_M:
        raise ValueError("Unsupported wire gauge; supply measured manufacturer data")
    rho = RESISTANCE_PER_M[wire_gauge_awg]
    
    wire_loop_ohms = 2.0 * one_way_distance_m * rho
    normal_resistance = panel_eol_nominal + wire_loop_ohms
    alarm_resistance = (panel_eol_nominal * 2.0 if deol_mode else float('inf')) + wire_loop_ohms
    
    tol_window = panel_eol_nominal * (panel_tolerance_pct / 100.0)
    normal_min = panel_eol_nominal - tol_window
    normal_max = panel_eol_nominal + tol_window
    
    is_normal_acceptable = (normal_min <= normal_resistance <= normal_max)
    
    return {
        "wire_loop_resistance_ohms": round(wire_loop_ohms, 2),
        "measured_normal_expected": round(normal_resistance, 2),
        "measured_alarm_expected": round(alarm_resistance, 2),
        "panel_acceptance_window": (round(normal_min, 2), round(normal_max, 2)),
        "normal_within_assumed_window": is_normal_acceptable,
        "recommendation": "OK" if is_normal_acceptable else "Wire resistance exceeds panel tolerance! Upsize to 20 AWG or 18 AWG."
    }
```

The calculator assumes equal DEOL resistors and checks only nominal normal-state resistance against a user-supplied symmetric window. It does not validate alarm/tamper windows, component tolerance, power or certification.

### Archetype 3: Multimeter Field Diagnostic Workflow
```markdown
1. Obtain owner/monitoring-centre authorization and use the manufacturer service/isolation procedure; avoid unintended dispatch and restore protection afterward.
2. Isolate the loop and verify it is de-energized before resistance measurement; never use ohms mode on an energized circuit. Disconnect only the documented zone terminals.
2. Set digital multimeter to 20k Ω DC resistance range.
3. Clip probes to black and red loop wires.
4. Read resistance:
   - Reading = 0 Ω: Direct short on cable or tamper circuit pinched.
   - Reading = ~5.6k Ω: Loop is secure and healthy.
   - Reading = ~11.2k Ω: Sensor is currently tripped (door open, motion active).
   - Reading = O.L (∞ Ω): Broken conductor, disconnected terminal, or open tamper switch.
5. Restore wiring and verify all programmed states using the exact model manual. Use voltage mode only for approved energized measurements; no universal5V pullup acceptance windows are assumed.
```

## The Pre-Emit Quality Gate Checklist

Before emitting any alarm wiring advice, schematic, or resistor calculation:
- [ ] **Placement Verification**: Explicitly mandate resistor placement at the remote detector, strictly barring panel-terminal stacking.
- [ ] **Manufacturer Compliance**: Verified nominal EOL values match the exact panel model, zone module and programmed supervision mode; no vendor-wide defaults.
- [ ] **Wire Gauge Compensation**: Calculated two-conductor wire loop resistance for distances $> 50$ meters.
- [ ] **DEOL State Coverage**: Documented all 4 states (Normal, Alarm, Tamper Short, Tamper Open).
- [ ] **Fire Circuit Distinction**: Confirmed burglary DEOL logic is never recommended for latching fire loops.
- [ ] **Physical Connection Standards**: Specified soldered heat-shrink or B-connector crimps over raw tape twists.
- [ ] **Zero Supervision Bypass**: Zero instructions provided to defeat or bypass loop supervision resistors.

## Self-Correction & Verification Loop

### Bad (Vibe-Coded AI Slop Output):
> "To wire an alarm sensor, just twist the resistor onto the zone screw terminals on the panel board. A 1k resistor usually works for all panels. If you get a zone fault, just bypass the zone or short the wires together."
*Problems: Fatal panel-terminal stacking, generic wrong resistor value, advises bypassing safety supervision, ignores tamper discrimination.*

### Good (Production EOL Resistor Calculator Output):
> For a **DSC PowerSeries Neo** panel using a **Double-EOL (DEOL)** PIR detector over an **80m run of 22 AWG** cable:
> 1. **Resistor Placement**: Install two 5.6k $\Omega$ resistors (5% tolerance, 0.25W) strictly inside the PIR housing at the far end of the run.
> 2. **Wiring Topology**:
>    - Connect Tamper switch in series with the loop.
>    - Connect first 5.6k $\Omega$ resistor ($R_{EOL}$) in series with the loop.
>    - Connect second 5.6k $\Omega$ resistor ($R_{ALARM}$) in parallel across the NC Alarm relay contacts.
> 3. **Wire Resistance Drop**: 80m of 22 AWG adds $2 \times 80 \times 0.053 = 8.48\ \Omega$. Total secure loop resistance will be $5,608.5\ \Omega$, Compare that estimate with the exact model's documented cable and state limits; no universal±10% acceptance window is asserted.
> 4. **Multimeter Diagnostic Verification**:
>    - Secure: $5.61\text{k}\ \Omega$.
>    - Walk-test (Alarm): $11.21\text{k}\ \Omega$.
>    - Sensor cover removed (Tamper): $\infty\ \Omega$ (Open).
>    - Crushed wire (Short): $8.5\ \Omega$ (interpret using the model-specific fault state).

## Limitations

- EOL values, wiring topologies, and zone states are panel- and detector-specific. Use the installation manual and approved wiring diagram for the exact model; the examples are not universal specifications.
- Work on alarm systems only with owner authorization and qualified personnel. Do not bypass supervision, disable an active alarm, or leave a protected site without a verified restored state.
- Cable resistance and resistor tolerances are estimates. Measure the installed loop and confirm the panel's published acceptance ranges before changing configuration.
