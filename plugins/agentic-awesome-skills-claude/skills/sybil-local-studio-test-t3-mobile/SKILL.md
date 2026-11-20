---
name: "sybil-local-studio-test-t3-mobile"
description: "Verify the native T3 Code client through its Device panel, an isolated backend and the returned target-specific controls."
category: "development"
risk: "critical"
source: "https://github.com/sybil-solutions/local-studio/tree/f65c8af78582f741b62546c93d7c66439f0cd5b1/.agents/skills/test-t3-mobile"
source_repo: "sybil-solutions/local-studio"
source_type: "community"
license: "MIT"
license_source: "https://github.com/sybil-solutions/local-studio/blob/f65c8af78582f741b62546c93d7c66439f0cd5b1/LICENSE"
author: "T3 Tools Inc."
date_added: "2026-11-19"
---

# Test T3 Code on Mobile

## When to Use

Use when the changed behavior must be verified on the native iOS or Android client in a T3 Code-derived checkout.

## Workflow

1. List test devices in the Device panel, choose the authorized target and retain its returned command and target arguments. Open the device and record the actual OS and build.
2. Start the matching dev backend with isolated state and synthetic projects. Read ports from dev output. Use the checkout's native-client helper to reuse or build its approved development client, then attach it to the same checkout's Metro instance.
3. Pair the app using the provided helper and a backend address reachable from the device. A host address depends on the emulator and platform. Keep the fresh pairing token within the fixture and out of recorded evidence.
4. Confirm fixture projects load, exercise the changed flow and capture observed state. If asked to clean up, remove only the disposable connection and stop only the backend, device or Metro sessions owned by this test.

## Example

“Verify a thread opens on the Android development client.” Pair the exact test backend and use the Device panel to open a synthetic thread and capture its state.

## Limitations

Requires a compatible dev client and Device panel. A browser pass does not establish native behavior. Do not use real user state or expose the fixture endpoint beyond the approved target.

## Bundled resources

Resolve `SKILL_DIR` to the directory of this installed skill, independent of the project working directory.

Use the [bundled SQLite fixture guide](references/sqlite-fixtures.md) for synthetic data. From the target T3 Code checkout, invoke the installed helper with the currently approved fixture and the Device panel's returned command and arguments:

```sh
bash "$SKILL_DIR/scripts/pair-client.sh" "$server_port" "$base_dir" "$mobile_origin" "$agent_device_command" "${agent_device_target_args[@]}"
```

It mints a short-lived pairing credential and opens the test client's pairing route. Use the target checkout's native-client helper to build the app. The bundled `agents/openai.yaml` describes the skill in the client.

## Source

Adapted from the [pinned skill tree](https://github.com/sybil-solutions/local-studio/tree/f65c8af78582f741b62546c93d7c66439f0cd5b1/.agents/skills/test-t3-mobile). See the [MIT license](LICENSE).

Local Studio carries these workflows from its [T3 Code base](https://github.com/pingdotgg/t3code).
