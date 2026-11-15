# Workflow implementation playbook

## Inputs

Existing workflow files, supported runtime matrix, repository scripts, branch protection and deployment policy.

## Procedure

1. Choose separate jobs for untrusted source validation and privileged publication. Keep validation credentials absent and permissions minimal.
2. Use reviewed immutable action revisions. Match commands to scripts that actually exist; bind artifacts to the tested commit and review any downloaded artifact before privileged use.
3. Test a source-only change and a failing test on a topic branch. Confirm failure blocks downstream publication and required check names remain stable.

## Worked example

A pull request changes application code. Its test job runs without production credentials; deployment consumes only an accepted, tested artifact through the project's protected release path.

## Verification and handoff

Report the actual files or configuration changed, checks performed, observed results and any untested environment. Keep the original inputs and evidence sufficient to reproduce the conclusion.

## Limitations

A workflow file cannot configure required reviewers by itself. Never execute pull-request code in a privileged target-triggered job.
