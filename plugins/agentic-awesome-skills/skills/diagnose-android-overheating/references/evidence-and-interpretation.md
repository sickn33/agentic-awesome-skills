# Evidence and Interpretation

Use this reference after the core skill has established device authorization, symptom context, and a safety screen. Commands are read-only unless a section explicitly says otherwise.

## Contents

1. Evidence quality
2. Thermal and battery baseline
3. Symptom branches
4. Correlation guide
5. Controlled Batterystats capture
6. Bugreport privacy
7. Official references

## Evidence Quality

Prefer evidence in this order:

1. a controlled comparison that changes only one plausible cause;
2. a timestamped trend spanning cool-to-hot or hot-to-cool behavior;
3. two independent system signals from the same window;
4. a single system snapshot;
5. user recollection without device evidence.

Do not elevate a lower-quality signal merely because it names an app or subsystem.

## Thermal and Battery Baseline

Capture the full service outputs before extracting fields:

```bash
adb -s <serial> shell dumpsys battery
adb -s <serial> shell dumpsys thermalservice
adb -s <serial> shell dumpsys cpuinfo
adb -s <serial> shell top -n 1
adb -s <serial> shell dumpsys power
```

Interpretation rules:

- `dumpsys battery` describes battery and charging state. Its temperature field is commonly expressed in tenths of a degree Celsius, but verify the device's representation instead of blindly dividing.
- `dumpsys thermalservice` is most useful on Android 10 and later. Some OEMs omit detailed sensors, expose only severity, or restrict output.
- Framework thermal status ranges from `0` (none) through `6` (shutdown) on implementations that expose the standard service. `2` means moderate, `3` severe, `4` critical, and `5` emergency thermal stress.
- Sensor readings are not interchangeable. Battery, skin, CPU, GPU, modem, and USB sensors describe different locations and policies.
- OEM thresholds differ. Never declare a universal safe temperature from one raw value.
- Thermal throttling is a response to heat, not automatically its cause.

If `top -n 1` is rejected, inspect `adb -s <serial> shell top --help` and use only a syntax supported by that device. Do not install BusyBox or request root as a fallback.

## Symptom Branches

### Idle or Screen-Off Heat

```bash
adb -s <serial> shell dumpsys batterystats
adb -s <serial> shell dumpsys batterystats --history
adb -s <serial> shell dumpsys power
adb -s <serial> shell dumpsys alarm
adb -s <serial> shell dumpsys jobscheduler
adb -s <serial> shell dumpsys sensorservice
adb -s <serial> shell dumpsys location
adb -s <serial> shell dumpsys deviceidle
```

Look for duration and recurrence, not merely presence. A scheduled alarm, registered sensor, or listed job can be normal. Correlate it with screen-off time, wakeups, process activity, network traffic, and the heat window.

### App-Specific Heat

First identify the exact package without guessing from the display name. Then inspect it:

```bash
adb -s <serial> shell dumpsys cpuinfo
adb -s <serial> shell dumpsys meminfo <package>
adb -s <serial> shell dumpsys package <package>
adb -s <serial> shell dumpsys jobscheduler <package>
adb -s <serial> shell dumpsys gfxinfo <package>
```

Package memory is not a heat measurement. High memory can contribute to pressure or churn, but sustained CPU/GPU, radios, camera, sensors, or charging usually provide a stronger causal path.

### Cellular, Weak-Signal, or 5G Heat

```bash
adb -s <serial> shell dumpsys telephony.registry
adb -s <serial> shell dumpsys connectivity
adb -s <serial> shell dumpsys wifi
adb -s <serial> shell dumpsys batterystats
adb -s <serial> shell getprop | grep -iE 'radio|baseband'
```

Redact phone numbers, subscriber identifiers, network names, and addresses. Look for a repeated association among poor signal, handovers or radio activity, higher battery drain, and the heat timeline. Confirm with a same-workload Wi-Fi or airplane-mode window when safe and acceptable to the user.

Do not change preferred network type from a copied bitmask. Slot IDs, carrier policy, radio capabilities, and command availability vary by device and Android build.

### Charging Heat

```bash
adb -s <serial> shell dumpsys battery
adb -s <serial> shell dumpsys usb
adb -s <serial> shell dumpsys thermalservice
```

Record plugged source, charging status, battery level, workload, charger, cable, case, and ambient conditions. A USB debugging cable can itself change the result. Do not simulate unplugging with `dumpsys battery set`; that changes framework state without reproducing the physical charging condition.

### Camera, Navigation, Gaming, Video, or Tethering

Collect the thermal baseline plus only the relevant services:

```bash
adb -s <serial> shell dumpsys media.camera
adb -s <serial> shell dumpsys media.metrics
adb -s <serial> shell dumpsys location
adb -s <serial> shell dumpsys sensorservice
adb -s <serial> shell dumpsys connectivity
adb -s <serial> shell dumpsys wifi
adb -s <serial> shell dumpsys display
adb -s <serial> shell dumpsys SurfaceFlinger
```

Service names and permissions vary. Record unsupported services rather than replacing them with root-only commands.

## Correlation Guide

| Observation | Stronger interpretation | Required counter-check |
| --- | --- | --- |
| Rising thermal severity and sustained package CPU | App/process workload may drive heat | Repeat sample; compare with app inactive |
| Heat plus poor signal and mobile-radio activity | Modem/radio loop may contribute | Same workload on stable Wi-Fi or airplane mode |
| Heat while idle plus long partial wakelock | Background work may prevent sleep | Match wakelock duration to screen-off heat window |
| Heat only while physically charging | Charging path or charge-plus-load may contribute | Safe unplugged comparison with workload controlled |
| Severe thermal state but low visible app CPU | GPU, modem, camera, charging, kernel, or hardware remains plausible | Inspect matching subsystem and OEM blind spots |
| Battery drain without thermal escalation | Energy use may be real but insufficient to cause thermal stress | Compare temperature trend and workload duration |
| High temperature with no exposed activity | Hardware fault or inaccessible vendor activity remains possible | Safe mode/OEM diagnostics or qualified service |

## Controlled Batterystats Capture

Resetting Batterystats erases the existing collection window. Do it only after preserving the original output and obtaining approval for a fresh experiment.

Official Android guidance uses this sequence:

1. save current Batterystats or a bugreport if needed;
2. reset Batterystats;
3. disconnect the USB cable so the device runs on battery;
4. reproduce a defined workload for a defined duration;
5. reconnect and export Batterystats or a bugreport;
6. compare the captured window with a control window.

Do not run the reset merely to make output shorter. Record that the reset occurred because it changes the evidence base.

## Bugreport Privacy

`adb bugreport <local-path>.zip` creates a broad diagnostic archive. Before running it:

- explain that it may include identifiers, accounts, app usage, notifications, networks, logs, and recent system activity;
- choose a private local path with the user;
- do not upload or transmit the archive without separate approval;
- extract only the evidence needed for the diagnosis;
- redact sensitive fields before sharing excerpts;
- follow the user's retention or deletion preference.

## Official References

- [Android dumpsys documentation](https://developer.android.com/tools/dumpsys)
- [Profile battery usage with Batterystats and Battery Historian](https://developer.android.com/topic/performance/power/setup-battery-historian)
- [Analyze power use with Battery Historian](https://developer.android.com/topic/performance/power/battery-historian)
- [AOSP thermal mitigation](https://source.android.com/docs/core/power/thermal-mitigation)
- [Android Thermal API](https://developer.android.com/games/optimize/adpf/thermal)
- [System restrictions on background tasks](https://developer.android.com/develop/background-work/background-tasks/bg-work-restrictions)
- [Android developer options](https://developer.android.com/studio/debug/dev-options)
