# Native iOS implementation

## Inputs

Xcode/Swift versions, deployment target, project scheme, feature brief and available simulator/device.

## Procedure

1. Reuse the project's state and navigation architecture. Check API availability against the deployment target before adding platform features.
2. Implement loading, success, failure and cancellation paths. Keep UI state changes on the appropriate actor and credentials in the project's secure storage abstraction.
3. Build the actual scheme and test navigation, Dynamic Type, VoiceOver labels and interrupted network requests. State separately which checks used a simulator and which used hardware.

## Worked example

Add a document list with retry. Leaving the screen during loading must not update a disposed view; large text must keep the retry action reachable.

## Verification and handoff

Report the actual files or configuration changed, checks performed, observed results and any untested environment. Keep the original inputs and evidence sufficient to reproduce the conclusion.

## Limitations

Simulator success does not verify signing, push delivery, biometrics or App Store acceptance. Do not upload or distribute without authorization.
