# Error budget arithmetic

## Inputs

Let target be a fraction strictly between zero and one, total be eligible events, and bad be failed eligible events in the same window.

## Procedure and verification

Budget events = total × (1 − target). Consumed fraction = bad / budget events. Remaining fraction = 1 − consumed fraction. Burn rate = (bad / total) / (1 − target). Example: total 100000, target 0.999 and bad 50 gives budget 100, remaining 50% and burn 0.5. No traffic has no measured burn; do not divide by zero.

## Limitations

For a fixed-rate projection, days remaining = remaining fraction × window days / burn rate. Mark zero burn as no finite exhaustion estimate and negative remaining budget as already exhausted. This projection is not a forecast when traffic or failures change.
