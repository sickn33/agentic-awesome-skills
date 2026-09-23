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
   - Any wiring diagram showing EOL resistors at the panel board for field sensors is flagged as a Grade 2/Grade 3 compliance violation.

2. **The 4-State Double-EOL (DEOL) Truth Table**:
   - Double EOL uses two resistors: an End-of-Line resistor ($R_{EOL}$) and an Alarm contact resistor ($R_{ALARM}$).
   - Standard series-parallel configuration (e.g., DSC standard 5.6k / 5.6k):
     $$\text{Loop State} = \begin{cases} 
     0\ \Omega\ (\text{Short Circuit}) & \implies \mathbf{Tamper\ (Short)} \\
     R_{EOL}\ (5.6\text{k}\ \Omega) & \implies \mathbf{Normal\ (Secure)} \\
     R_{EOL} + R_{ALARM}\ (11.2\text{k}\ \Omega) & \implies \mathbf{Alarm\ (Tripped)} \\
     \infty\ \Omega\ (\text{Open Circuit}) & \implies \mathbf{Tamper\ (Cut\ Wire)}
     \end{cases}$$
   - This provides complete supervised discrimination between intruder activation and physical sabotage.

3. **Copper Wire Resistance Compensation Formula**:
   - Long field cable runs add series loop resistance across both conductors:
     $$R_{loop} = 2 \times D \times \rho_{gauge}$$
     where $D$ is one-way distance in meters, and $\rho_{gauge}$ is resistance per meter:
     - **22 AWG (0.326 mm²)**: $0.053\ \Omega/\text{meter}$ ($16.14\ \Omega/1000\text{ft}$)
     - **20 AWG (0.518 mm²)**: $0.033\ \Omega/\text{meter}$ ($10.15\ \Omega/1000\text{ft}$)
     - **18 AWG (0.823 mm²)**: $0.021\ \Omega/\text{meter}$ ($6.38\ \Omega/1000\text{ft}$)
   - A 150m run of 22 AWG adds $2 \times 150 \times 0.053 \approx 15.9\ \Omega$. Ensure total loop resistance does not push readings beyond the panel's $\pm 15\%$ ADC tolerance window.

4. **Panel Reference Resistor Standards Matrix**:
   - **DSC PowerSeries / Neo**: $5.6\text{k}\ \Omega$ SEOL / $5.6\text{k} + 5.6\text{k}$ DEOL.
   - **Honeywell Ademco Vista**: $2.0\text{k}\ \Omega$ SEOL (Standard zones), $1.0\text{k}$ (Zone 1 on some models).
   - **Paradox EVO / Spectra**: $1.0\text{k}\ \Omega$ SEOL / $1.0\text{k} + 1.0\text{k}$ DEOL (or ATZ mode with $1.0\text{k} / 2.2\text{k}$).
   - **Bosch B / G Series**: Dual supervision with $1.0\text{k} / 2.0\text{k}$ or panel-selectable windows.
   - **Texecom Premier Elite**: $2.2\text{k} / 4.7\text{k}$ or selectable Grade 3 Triple-EOL ($4.7\text{k} / 4.7\text{k} / 2.2\text{k}$ anti-mask).

5. **ADC Voltage Divider Acceptance Windows**:
   - Security panels measure zone voltage through an internal pull-up resistor ($R_{pullup}$, typically $1\text{k}$ to $3.3\text{k}\ \Omega$) connected to a reference voltage ($V_{ref}$, typically $5.0\text{V}$ or $13.8\text{V}$).
   - Terminal voltage is given by:
     $$V_{zone} = V_{ref} \times \frac{R_{loop\_total}}{R_{pullup} + R_{loop\_total}}$$
   - Always confirm whether a measured terminal voltage falls inside the manufacturer's specified ADC threshold window before replacing field hardware.

## Named Sins & Anti-Patterns (Что категорически ЗАПРЕЩЕНО)

| Anti-Pattern | Manifestation in Code/Workflow | Mandatory Production Counter-Rule |
| :--- | :--- | :--- |
| **Panel-Terminal Resistor Stacking** | Crimping EOL resistors into the screw terminals on the panel PCB. | Install resistors exclusively inside the remote sensor housing. |
| **Vendor Value Cross-Contamination** | Putting 2.0k Honeywell resistors onto a DSC panel requiring 5.6k. | Verify panel model and enforce manufacturer-specific resistance ratings. |
| **DEOL Series/Parallel Inversion** | Swapping series and parallel resistors on an alarm PIR contact. | Wire $R_{ALARM}$ in parallel with NC alarm switch; wire $R_{EOL}$ in series with loop. |
| **Neglecting Wire Drop on Long Runs** | Ignoring 40+ $\Omega$ wire resistance on a 300-meter warehouse fence zone. | Calculate loop resistance $2 \times D \times \rho$ and verify against panel budget. |
| **Twist-and-Tape Resistor Splices** | Twisting resistor leads by hand and wrapping with electrical tape. | Use soldered heat-shrink sleeves or grease-filled B-connectors/crimps. |
| **Fire/Burg Supervised Mix-up** | Applying burglar DEOL tamper logic to 2-wire latching fire zones. | Fire loops strictly require Normally Open (NO) contacts with SEOL supervision. |
| **Unshielded AC Parallel Run** | Running 22/4 unshielded alarm cable in parallel with 230V mains. | Maintain 300mm physical separation or use twisted shielded pair (STP). |
| **Strapping Out Trouble Zones** | Advising a user to twist zone wires together to clear a trouble condition. | Diagnose root cause (open wire, bad contact, corroded resistor) methodically. |
| **Confusing NO and NC Contacts** | Treating a magnetic reed switch (NC) like an exit request button (NO). | Verify sensor contact behavior in quiescent, non-alarm states. |
| **Unrecorded Commissioning Values** | Leaving an install without recording measured DC resistance values. | Deliver an audit log of measured loop ohms across Normal, Alarm, and Tamper. |

## Concrete Archetypes / Presets

### Archetype 1: Double-EOL (DEOL) Sensor Wiring Schematic (DSC 5.6k)
```
       (+) ZONE TERMINAL (Panel)
               │
               ▼  [Core 1: Field Wire]
       ┌───────┴────────────────────────┐
       │ SENSOR HOUSING (Far End)       │
       │                                │
       │    TAMPER SWITCH (NC)          │
       │     ┌────[ / ]────┐            │
       │     │             │            │
       │     ▼             ▼            │
       │    ( )           ( )           │
       │     │             │            │
       │     │        ALARM RELAY (NC)  │
       │     │     ┌────[ / ]────┐      │
       │     │     │             │      │
       │     │     │   R_ALARM   │      │
       │     │     └───[5.6k]────┘      │
       │     │             │            │
       │     ▼             ▼            │
       │   R_EOL [5.6k]    │            │
       │     │             │            │
       └─────┼─────────────┼────────────┘
             │             │
             └─────────────┘
               ▲
               │  [Core 2: Field Wire]
       (─) COMMON TERMINAL (Panel)

State Resistance:
• Secure:  5.6k Ω
• Alarm:  11.2k Ω (Alarm contact opens, forcing current through R_ALARM)
• Tamper: 0 Ω (Short circuit) or ∞ Ω (Cut wire or Tamper contact opens)
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
    rho = RESISTANCE_PER_M.get(wire_gauge_awg, 0.0530)
    
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
        "is_acceptable": is_normal_acceptable,
        "recommendation": "OK" if is_normal_acceptable else "Wire resistance exceeds panel tolerance! Upsize to 20 AWG or 18 AWG."
    }
```

### Archetype 3: Multimeter Field Diagnostic Workflow
```markdown
1. Disconnect zone loop wires from panel terminal Z1 and COM.
2. Set digital multimeter to 20k Ω DC resistance range.
3. Clip probes to black and red loop wires.
4. Read resistance:
   - Reading = 0 Ω: Direct short on cable or tamper circuit pinched.
   - Reading = ~5.6k Ω: Loop is secure and healthy.
   - Reading = ~11.2k Ω: Sensor is currently tripped (door open, motion active).
   - Reading = O.L (∞ Ω): Broken conductor, disconnected terminal, or open tamper switch.
5. Reconnect to panel and verify terminal voltage across Z1 and COM:
   - Normal secure: 2.2V - 2.8V DC (on 5V pullup).
   - Alarm: 3.5V - 4.1V DC.
   - Tamper/Short: 0.0V DC.
   - Cut/Open: 5.0V DC.
```

## The Pre-Emit Quality Gate Checklist

Before emitting any alarm wiring advice, schematic, or resistor calculation:
- [ ] **Placement Verification**: Explicitly mandate resistor placement at the remote detector, strictly barring panel-terminal stacking.
- [ ] **Manufacturer Compliance**: Verified nominal EOL values match the specific panel model (Honeywell 2.0k, DSC 5.6k, Paradox 1.0k, etc.).
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
> 3. **Wire Resistance Drop**: 80m of 22 AWG adds $2 \times 80 \times 0.053 = 8.48\ \Omega$. Total secure loop resistance will be $5,608.5\ \Omega$, well within DSC's $\pm 10\%$ acceptance window ($5,040\ \Omega$ to $6,160\ \Omega$).
> 4. **Multimeter Diagnostic Verification**:
>    - Secure: $5.61\text{k}\ \Omega$.
>    - Walk-test (Alarm): $11.21\text{k}\ \Omega$.
>    - Sensor cover removed (Tamper): $\infty\ \Omega$ (Open).
>    - Crushed wire (Short): $8.5\ \Omega$ (Panel registers Tamper Short).

## Limitations

- EOL values, wiring topologies, and zone states are panel- and detector-specific. Use the installation manual and approved wiring diagram for the exact model; the examples are not universal specifications.
- Work on alarm systems only with owner authorization and qualified personnel. Do not bypass supervision, disable an active alarm, or leave a protected site without a verified restored state.
- Cable resistance and resistor tolerances are estimates. Measure the installed loop and confirm the panel's published acceptance ranges before changing configuration.
