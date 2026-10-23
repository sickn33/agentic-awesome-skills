# Training reliability

Validate model/data revisions, access and licenses before allocating compute.
Inspect actual row types, required fields, role/content structure, sequence length
and chat templates throughout the bounded training subset. Do not skip checks just
because a dataset came from TRL or has familiar column names. The inspector only
suggests column mappings; it does not establish training readiness.

Use a small step-bounded pilot. Check loss, labels, memory, checkpoint saving and
restore behavior. Check evaluation data does not overlap the training set. Reject
all-masked labels, empty datasets, identical preference pairs and invalid rewards.
GRPO requires a reward function; a toy string-match reward is not a mathematical
verifier and must never execute generated code to determine its score.

Set an approved job timeout and durable checkpoint plan. A timeout can discard
unsaved state; inspect saved checkpoints before starting over. Record job IDs and
query uncertain submissions before retrying to avoid duplicate billing. Sanitize
logs and avoid data/token leakage. Track concrete failures rather than inventing
failure percentages or success guarantees. No measured success rate is established
by the source review.
