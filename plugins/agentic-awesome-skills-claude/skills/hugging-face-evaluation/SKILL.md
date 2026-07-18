---
name: hugging-face-evaluation
description: Add reproducible evaluation results to Hugging Face model cards using documented Hub, LightEval, and Jobs workflows.
risk: unknown
source: community
---

# Hugging Face Evaluation

Use this skill to run a documented evaluation workflow, review its outputs, and
record reproducible results in a Hugging Face model card. It does not include or
assume repository-local helper scripts.

## When to Use

- You need to evaluate a Hugging Face model with LightEval.
- You need to run an evaluation on Hugging Face Jobs.
- You need to add reviewed evaluation metadata to a model card.
- You are preparing a model release and need an auditable result record.

## Safety and Approval Gate

Before any evaluation, obtain explicit approval for all of the following:

1. Exact model repository and immutable model revision.
2. Tasks, dataset revisions, sample limits, and whether remote dataset code is allowed.
3. Local or Hugging Face Jobs execution, hardware flavor, timeout, and maximum cost.
4. Destination repository and branch for any result update.
5. Whether the final action is a local draft, push, or pull request.

Default to a local draft. Do not start paid compute, upload results, push a
branch, or open a pull request until the corresponding target and action have
been approved. Reconfirm before retrying a failed paid job.

## Supported Compatibility

This workflow targets the latest stable LightEval command family documented for
`lighteval==0.13.0`:

```bash
python -m pip install "lighteval[vllm]==0.13.0"
lighteval tasks list
lighteval tasks inspect ifeval
lighteval vllm "model_name=HuggingFaceH4/zephyr-7b-beta,revision=<MODEL_COMMIT_SHA>" ifeval
```

The LightEval `main` documentation may require installation from source and can
change independently of the stable release. Do not mix examples from `main`
with a stable installation. For a different version, read that version's
documentation and update the command only after a compatibility check.

Never infer task identifiers from an old list. Discover them with `lighteval
tasks list`, inspect the selected task, and record the installed LightEval
version with the result.

## Reproducible Local Evaluation

Before running, freeze the inputs:

- model repository and commit SHA;
- dataset repository and revision when configurable;
- LightEval and backend versions;
- task names and task configuration;
- generation parameters, seed, batch size, and sample limit;
- hardware and precision.

Use the stable backend syntax:

```bash
lighteval vllm \
  "model_name=<OWNER/MODEL>,revision=<MODEL_COMMIT_SHA>,dtype=bfloat16" \
  <TASK_NAME>
```

Treat the command as a template: validate model arguments against the installed
version before execution. Capture the command, environment versions, logs, raw
result artifact, and artifact hash. Do not publish a score without the task,
revision, and metric name needed to reproduce it.

## Remote Code

Keep remote code disabled by default. Enable `trust_remote_code` only when all
of these conditions are satisfied:

1. The model cannot be evaluated without its custom code.
2. The exact model revision is pinned to a commit SHA.
3. A maintainer has inspected the code at that revision, including imports,
   network access, subprocesses, filesystem writes, and deserialization.
4. The execution environment is isolated and contains no unrelated secrets.
5. The user explicitly approves that exact revision and execution target.

If approved and supported by the installed LightEval/backend version, add the
documented model argument:

```text
trust_remote_code=true
```

Do not use a moving branch or tag as the revision.

## Hugging Face Jobs

Hugging Face Jobs consume credits. Confirm namespace, hardware flavor, timeout,
and cost ceiling immediately before submission. Use a reviewed local script or
an immutable remote script URL; never run unreviewed code from a moving branch.

The official CLI accepts hardware, timeout, and encrypted job secrets:

```bash
hf jobs uv run \
  --flavor <APPROVED_HARDWARE> \
  --timeout <APPROVED_TIMEOUT> \
  --secrets HF_TOKEN \
  <REVIEWED_LOCAL_SCRIPT_OR_IMMUTABLE_URL> \
  --model <OWNER/MODEL> \
  --revision <MODEL_COMMIT_SHA>
```

`--secrets HF_TOKEN` reads the secret from the local environment or configured
Hugging Face credential store and injects it as a Job secret. Do not place token
values in command arguments, source files, logs, `.env` files, or result
artifacts. Give the token only the minimum repository permissions required.

After submission, record the Job ID. Inspect status and logs, cancel unexpected
work, and verify that the job completed successfully before accepting results:

```bash
hf jobs inspect <JOB_ID>
hf jobs logs <JOB_ID>
hf jobs wait <JOB_ID>
```

Do not interpret a submitted or still-running Job as a successful evaluation.

## Recording Results in a Model Card

A model card is the repository `README.md` with YAML metadata followed by a
human-readable explanation. Prefer the Hub metadata editor for small updates or
edit a local clone. Preserve existing metadata and add only reviewed results.

For `model-index` metadata, include enough context to identify the model, task,
dataset, metric, and value:

```yaml
model-index:
  - name: <MODEL_NAME>
    results:
      - task:
          type: <TASK_TYPE>
          name: <TASK_NAME>
        dataset:
          type: <DATASET_ID>
          name: <DATASET_NAME>
        metrics:
          - type: <METRIC_ID>
            name: <METRIC_NAME>
            value: <REVIEWED_VALUE>
```

Also document in prose:

- model and dataset commit SHAs;
- LightEval/backend versions and command;
- hardware, precision, seed, and sample limits;
- date, raw artifact location, and artifact hash;
- known limitations or deviations from the standard task.

Validate the YAML and review the complete diff locally. A score copied from a
table or third-party service is not equivalent to a reproduced evaluation;
label imported results with their source and retrieval date.

## Push and Pull Request Gate

Before writing to the Hub:

1. Confirm the exact repository, branch, and diff.
2. Confirm the actor has permission to publish the result.
3. Check the repository's open pull requests for an equivalent update.
4. Redact tokens, local paths, private dataset details, and sensitive logs.
5. Obtain separate explicit approval for a direct push or for opening a pull
   request; approval for running the evaluation is not publication approval.

If an equivalent pull request exists, update or comment on that work only with
authorization. Do not create a duplicate pull request automatically.

## Validation Checklist

- [ ] Model and dataset revisions are immutable.
- [ ] Task identifiers were inspected with the installed LightEval version.
- [ ] Cost, hardware, namespace, and timeout were approved.
- [ ] Secrets were injected with `--secrets`, never embedded or logged.
- [ ] Remote code remained disabled, or inspection and revision-pin evidence is recorded.
- [ ] The job or local process exited successfully.
- [ ] Raw results and hashes are retained.
- [ ] Model-card YAML parses and the rendered metadata is correct.
- [ ] Repository, branch, push, and PR actions have their own approval.

## Official References

- [Hugging Face model cards](https://huggingface.co/docs/hub/en/model-cards)
- [Hugging Face Jobs CLI](https://huggingface.co/docs/huggingface_hub/en/guides/cli)
- [Hugging Face Jobs guide](https://huggingface.co/docs/huggingface_hub/en/guides/jobs)
- [LightEval installation](https://huggingface.co/docs/lighteval/en/installation)
- [LightEval available tasks](https://huggingface.co/docs/lighteval/main/en/available-tasks)
- [LightEval vLLM backend](https://huggingface.co/docs/lighteval/main/en/use-vllm-as-backend)

## Limitations

- CLI syntax and available hardware can change; verify the selected installed
  versions before execution.
- Evaluation scores depend on task revisions, prompts, backend behavior, and
  sampling configuration.
- This skill does not authorize paid compute or publication.
- This skill does not provide bundled evaluation scripts or automatic imports.
