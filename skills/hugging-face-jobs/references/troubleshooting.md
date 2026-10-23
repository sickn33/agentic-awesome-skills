# Troubleshooting Jobs

_Modified in the local catalog review: removed credential disclosure, uncontrolled retries and automatic paid escalation._

Record the exact job ID, namespace, script/image/model/data revisions and sanitized terminal status. Keep exception details in protected logs; do not print tokens, environment dumps or private input rows.

- **401/403**: distinguish missing/expired credentials, target permissions, gated-model terms, account credits and organization scope. Public reads need no universal token. Use the documented secret mechanism and least privilege; never broaden a token or ask for its value in chat.
- **Script not found**: the installed CLI and Python `run_uv_job` support local scripts; a connector wrapper may require inline text or an approved pinned URL. Inspect its schema. Do not blindly execute a remote `main` script.
- **Dependency/import failure**: inspect the pinned compatible package/image set. Test only reviewed code in an isolated local fixture before cloud submission. Do not run arbitrary scripts merely because a log suggests it.
- **OOM**: measure weights, activation/KV cache, CPU RAM and GPU allocation. Bound batch/context/resolution or use a verified compatible smaller/quantized/sharded recipe. More GPUs do not pool automatically. A new paid flavor/retry needs to fit existing authorization.
- **Timeout**: inspect persisted checkpoints and terminal state before a new attempt. Increasing timeout changes budget; do not do it reflexively. Reruns create a new job and may reuse prior secrets/configuration.
- **No saved results**: distinguish missing persistence, partial upload, wrong repository/config, private visibility and failure swallowed by code. Verify exact objects/counts/commit rather than matching a success log string.
- **Poor generated data**: parsing failures, skipped rows and self-consistency are not correctness proof. RIP scoring is unavailable in the bundled candidate generator; never label response length as a reward-model judgment.
- **Unexpected cost**: inspect actual billed states, hardware, concurrent/scheduled jobs and attempts. Cancel only the intended authorized job when necessary; preserve checkpoints. Do not assume a timeout precisely caps all-in cost.

If asked to finish the workload, monitor with a bounded deadline/backoff through a terminal outcome and artifact verification. If asked only to submit, report submitted/running status and its URL without claiming completion. Recurring execution requires explicit schedule/timezone, spend scope, expiry and cancellation ownership. See the current [Jobs management guide](https://huggingface.co/docs/hub/jobs-manage).
