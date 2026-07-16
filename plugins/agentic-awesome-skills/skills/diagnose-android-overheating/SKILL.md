---
name: diagnose-android-overheating
description: "Diagnose Android overheating, idle heat, thermal throttling, charging or radio heat, and abnormal battery drain with read-only ADB evidence and approval gates before device changes."
category: debugging
risk: critical
source: self
source_type: self
date_added: "2026-07-16"
author: Antigravity Awesome Skills maintainers
tags: [android, adb, overheating, thermal, battery, diagnostics]
tools: [claude, cursor, gemini, antigravity, codex]
---

# Diagnose Android Overheating

## Overview

Find the most likely source of Android device heat by correlating thermal state, battery conditions, CPU activity, wakeups, radios, sensors, charging, and the user's timeline. Keep diagnosis read-only by default, distinguish evidence from inference, and propose only the smallest reversible intervention after the user approves it.

## When to Use This Skill

- Use when an Android phone is hot, warm while idle, thermally throttled, shutting down from heat, or draining its battery unusually fast.
- Use when heat appears during charging, weak cellular signal, 5G use, navigation, camera use, gaming, media playback, tethering, or background activity.
- Use when the user wants to identify an offending app, service, wakelock, sensor, modem condition, or charging condition through ADB.
- Use when a previous Android optimization or debloat attempt may have left settings that changed power or thermal behavior.
- Use for physical phones and tablets. For profiling the energy use of an app under development, use an app-performance skill instead.

## Safety Stop

Stop software diagnosis when the device shows battery swelling, smoke, hissing, leaking, a sharp chemical odor, repeated thermal shutdowns, or heat severe enough that it cannot be handled safely. Tell the user to disconnect power if this can be done safely, power the device off, keep it away from flammable material, and seek manufacturer or qualified repair support. Do not suggest cooling the device in a refrigerator or freezer, puncturing it, continuing to charge it, or running stress tests.

## Diagnostic Contract

Before collecting data:

1. Confirm the user owns or is authorized to inspect the device.
2. Ask what “hot” means: location on the handset, activity, charging state, network type, onset, duration, and whether the heat also occurs while idle.
3. Record the device model, Android version, recent OS/app changes, charger and cable, ambient conditions, and visible thermal warnings.
4. Explain that an attached USB cable can charge and warm the device. Use wireless ADB or short capture windows when possible, and compare with the cable disconnected.
5. Select a specific device serial when more than one ADB target is present. Never assume the first listed device is the intended phone.

## Workflow

### 1. Capture an Untouched Baseline

Do not reset Batterystats, force-stop apps, clear caches, change network modes, alter AppOps, enable battery saver, or change developer settings before preserving the initial state.

Start with read-only commands:

```bash
adb devices -l
adb -s <serial> shell getprop ro.product.manufacturer
adb -s <serial> shell getprop ro.product.model
adb -s <serial> shell getprop ro.build.version.release
adb -s <serial> shell getprop ro.build.version.sdk
adb -s <serial> shell uptime
adb -s <serial> shell dumpsys battery
adb -s <serial> shell dumpsys thermalservice
adb -s <serial> shell dumpsys cpuinfo
adb -s <serial> shell top -n 1
```

If a service or option is unavailable, record that limitation. Do not turn missing output into a healthy verdict. Android and OEM builds expose different services, fields, permissions, and `top` syntax.

### 2. Choose the Evidence Branch

Read [evidence-and-interpretation.md](references/evidence-and-interpretation.md), then collect only the branches that match the symptom:

- heat while idle: battery history, power state, alarms, jobs, sensors, location, and radios;
- heat while charging: battery/USB state and a controlled unplugged comparison;
- heat under one app: process CPU, package memory, jobs, wakelocks, network, camera, and location;
- heat in weak signal or mobile data: telephony, connectivity, signal changes, and mobile-radio activity;
- heat during camera, navigation, gaming, or playback: CPU/GPU-adjacent state, display, camera/media, sensors, location, and network activity;
- heat after a setting change: capture current values and compare them with the known previous state before proposing rollback.

Do not collect a full bugreport unless narrow evidence is insufficient. Bugreports can contain account identifiers, app activity, network details, notifications, and other sensitive data.

### 3. Reproduce with a Controlled Comparison

Define one pass/fail comparison before changing anything. Examples:

- idle with airplane mode versus idle on weak cellular signal;
- same workload on Wi-Fi versus mobile data;
- charging versus unplugged after the battery level is stable;
- suspect app active versus closed by the user;
- screen on at fixed brightness versus screen off;
- before versus after the recent OS or app update, when a real reference exists.

Keep workload, duration, brightness, case, charger, ambient conditions, and starting battery level as constant as practical. Timestamp each observation. Avoid benchmarks or synthetic load unless the user explicitly asks and the device is not already thermally stressed.

### 4. Correlate, Do Not Guess

Require at least two independent signals before attributing the heat:

- thermal severity or rising battery temperature plus sustained process CPU;
- thermal change plus mobile-radio activity and poor signal;
- heat while idle plus persistent partial wakelock, alarm, job, sensor, or location activity;
- heat during charging plus charging state/current evidence and a cooler unplugged comparison;
- thermal throttling plus a workload-specific subsystem such as camera, GPU-heavy rendering, navigation, tethering, or media processing.

A hot battery does not identify the cause. A high CPU snapshot does not prove sustained load. A wakelock name does not prove meaningful energy use without duration and timeline correlation. Batterystats estimates are device-dependent and may be absent or incomplete.

### 5. Classify the Finding

Use one primary class and list plausible contributors separately:

- app or process CPU load;
- modem/radio and weak-signal loop;
- Wi-Fi, Bluetooth, tethering, or continuous transfer;
- screen, camera, video, GPU, or media processing;
- GPS, sensors, navigation, or location polling;
- charging equipment, charging mode, or simultaneous charge-and-load;
- OS/OEM service, post-update optimization, or configuration residue;
- battery aging or hardware fault;
- normal workload heat within the device's reported thermal state;
- insufficient evidence.

State confidence as `confirmed`, `strongly supported`, `possible`, or `unknown`. Reserve `confirmed` for a controlled comparison or direct timeline evidence that changes with the suspected cause.

### 6. Gate Every Intervention

Present the evidence and proposed experiment before changing the device.

- Read-only inspection may proceed within the user's authorized device scope.
- Interruptive actions, such as stopping an app or temporarily changing connectivity, require the user's awareness and must not disrupt calls, authentication, navigation, alarms, or accessibility services.
- Persistent settings, network-mode changes, AppOps, package disabling, debloating, or developer-option changes require explicit approval, an exact pre-change value, a rollback command, and post-change verification.
- Never disable thermal protection, spoof a thermal status, edit thermal thresholds, clear app data, reset the device, or remove packages as a generic overheating fix.
- Do not treat animation scale, background-process limits, forced GPU rendering, cache trimming, or forced Doze as root-cause fixes.

Change one variable at a time. After the test, restore the old value unless the user explicitly chooses to keep the verified change.

## Output Format

```text
Symptom and context:
Safety status:
Evidence collected:
Controlled comparison:
Most likely cause:
Confidence:
Contributors or alternatives:
Proposed next test or smallest fix:
Approval required:
Rollback:
Remaining uncertainty:
```

## Examples

### Idle Heat on Mobile Data

Correlate thermal and battery trends with signal state, mobile-radio activity, process CPU, and wakeups. A weak signal alone is not enough; show that the heat or radio activity falls during a comparable Wi-Fi or airplane-mode window before calling the modem loop the cause.

### Heat After Installing an App

Compare the package's sustained CPU, jobs, alarms, network, location, and wakelock time with the symptom window. Do not force-stop or restrict it until the baseline is saved and the user approves an interruption.

### Heat While Charging

Record charger/cable context, battery state, temperature trend, plugged source, and simultaneous workload. Compare against a safe unplugged window. Do not infer battery failure from temperature alone.

## Best Practices

- Preserve raw output before filtering it; OEM labels and field layouts vary.
- Prefer trends and before/after windows over single snapshots.
- Separate surface warmth, battery temperature, and framework thermal severity.
- Keep a record of every mutation and its original value.
- Redact serials, phone numbers, SSIDs, account identifiers, notifications, and personal app activity before sharing logs.
- Escalate persistent unexplained idle heat or abnormal charging heat to hardware support when software evidence is weak.

## Limitations

- ADB cannot prove battery internal resistance, physical damage, charger quality, or exact internal component temperature on every device.
- Thermal sensor values and thresholds are OEM-specific; some devices hide sensors or report status incompletely.
- Battery attribution is historical and model-dependent, not a laboratory power measurement.
- USB-connected observation can alter charging, radio, and thermal behavior.
- Root-only files and vendor services may be unavailable; do not bypass device security to obtain them.

## Security & Safety Notes

- Operate only on a device the user owns or is authorized to inspect.
- Treat bugreports and raw system dumps as sensitive local artifacts.
- Never upload logs, install diagnostic APKs, enable network ADB, or expose the ADB daemon without explicit informed approval.
- Keep the workflow read-only until evidence supports a narrow experiment and the user approves it.

## Common Pitfalls

- **Filtering `thermalservice` down to one word:** Preserve the complete output; status, sensor type, throttling severity, and vendor omissions all matter.
- **Calling the top CPU process the cause from one sample:** Sample across the heat window and correlate with thermal change.
- **Resetting Batterystats immediately:** Save the pre-existing history first; reset only for an explicitly approved controlled capture.
- **Applying several “optimizations” together:** Test one reversible hypothesis at a time and verify the symptom, not just the setting.
- **Treating missing OEM data as evidence of no problem:** Report the blind spot and use an independent comparison or escalate.

## Related Skills

- `@android-cli` - Use for Android SDK, emulator, deployment, screenshots, and general device interaction.
- `@android-dev` - Use when the root cause is in Android application source code and the user wants an implementation fix.
- `@mobile-developer` - Use for broader mobile application development rather than handset-level diagnosis.
