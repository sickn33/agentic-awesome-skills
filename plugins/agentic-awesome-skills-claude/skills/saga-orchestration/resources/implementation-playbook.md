# Saga Orchestration Playbook

## When to choose orchestration vs choreography

- Choose orchestration when business flow visibility and centralized control are required.
- Choose choreography when autonomy is high and coupling is low.

## Saga design checklist

- Define explicit saga state machine.
- Define timeout policy per step.
- Define compensation action for each irreversible step.
- Use idempotency keys for command handling.
- Store correlation IDs across all events and logs.

## Failure handling

- Retry transient failures with bounded exponential backoff.
- Escalate non-recoverable failures to compensation state.
- Capture operator-visible failure reason and current step.

## Verification

- Simulate failure at every step and confirm compensation path.
- Validate duplicate message handling.
- Validate recovery from orchestrator restart.
