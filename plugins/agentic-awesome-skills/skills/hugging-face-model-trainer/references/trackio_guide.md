# Optional Trackio monitoring

Tracking is a separate disclosure and resource decision. The bundled examples
use `report_to=[]` and create no Trackio Space. If the user requests tracking,
confirm which metrics and metadata will leave the process, where they are stored,
Space owner/privacy, credential scope and any hosting cost before enabling it.
Never send raw datasets, prompts, completions, environment variables or tokens.

Read the installed Trackio and TRL integration documentation for exact init,
project/run and endpoint configuration. A string project name is not an access
control boundary. Do not infer that a tracking Space is private or that `$HF_TOKEN`
will be expanded by every job API. Configure secrets through the actual host's
documented binding and avoid an unrelated persistent login mutation.

End tracking in a finally block, inspect persistence, and separately verify that
training artifacts were saved. Metrics are not checkpoints; a tracking UI is not
proof of training quality or successful durable publication. If tracking fails,
report the failure without silently claiming the run was fully monitored.
