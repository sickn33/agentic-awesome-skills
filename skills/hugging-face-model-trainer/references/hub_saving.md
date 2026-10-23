# Durable checkpoints and optional Hub publication

Ephemeral job storage may disappear at termination. Before starting, select an
approved persistent volume, private object store or private Hub destination.
Hub upload is one durability option, not an unconditional requirement.

Local teaching examples set `push_to_hub=False` and save in a new private output
directory. For an ephemeral job, copy complete checkpoints to the approved durable
destination during the run. Verify actual persisted bytes and restore a small
checkpoint before relying on recovery. A model export or LoRA adapter alone does
not contain the optimizer, scheduler, random state and trainer state needed for
an exact continuation.

If Hub writes are authorized, confirm the exact owner/repository, privacy,
license and overwrite policy before training. Prefer a newly created private
repository; existing repositories need separate overwrite approval. Grant only
necessary scoped write permission. Use the host's actual secret binding, never a
literal `$HF_TOKEN` unless that interface documents expansion. Do not print,
commit or cache credentials by calling login as a hidden setup step.

Review trainer checkpoint upload behavior against the pinned TRL/Transformers
versions. Verify each upload result; a partial or failed upload is not completion.
Retain local artifacts until a verified durable copy exists. Do not fabricate a
model card license, training method, dataset provenance, performance or file size.
Publishing weights, metadata and logs are distinct disclosure decisions.
