# Cross-platform parity playbook

## Inputs

Requested platforms, shared API contract, existing stacks, feature acceptance criteria and available tools.

## Procedure

1. Define behavior as observable scenarios, not a percentage of shared code. Record intentional platform differences before implementation.
2. Implement shared contracts first, then platform adapters. Use available tools directly; agent role names in the main guide describe responsibilities and do not guarantee a delegation API exists.
3. Maintain a matrix of scenario, platform, observed result and evidence. Check offline conflict handling, permission denial and accessible navigation separately for each target.

## Worked example

A saved item must appear on web and mobile after synchronization. Test add, delete, retry and a conflicting edit on both platforms; identify any platform not exercised.

## Verification and handoff

Report the actual files or configuration changed, checks performed, observed results and any untested environment. Keep the original inputs and evidence sufficient to reproduce the conclusion.

## Limitations

Do not install every framework or manufacture parallel agents. Packaging, store upload and production deployment require the relevant authorization.
