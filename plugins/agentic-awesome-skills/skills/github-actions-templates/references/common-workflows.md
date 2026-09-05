# Choosing a workflow boundary

## Inputs

Inspect the target repository scripts, runtime support, protected branches and artifact publication policy.

## Procedure and verification

Use unprivileged pull-request jobs for tests and builds. Put publication in a separate trusted path with its own credentials and explicit protected environment where required. Bind the artifact to the tested commit and reject missing or mismatched provenance. Check that a failing test prevents the publishing job from running.

## Limitations

A template must be adapted to actual commands. Do not give fork code production secrets, persistent runner access or a write token. See the inline workflow patterns in the skill for the starting structure.
