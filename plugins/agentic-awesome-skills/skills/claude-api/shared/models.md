# Model selection and versioning

> AAS-reviewed adaptation of the upstream Anthropic skill; see the root SKILL.md for authorization and resource boundaries. SDK/model feature claims below are version-sensitive examples; verify the selected model and pinned SDK before running. No live API or agent execution was performed during this catalog review.

Resolve exact model IDs from the account's [Models API](https://platform.claude.com/docs/en/api/models) and [official overview](https://platform.claude.com/docs/en/models/overview). Access, pricing, capabilities and retirement vary by model/platform/date; do not infer them from a family name or this catalog snapshot.

At review on 2026-10-24, the overview lists Claude API IDs `claude-fable-5-1`, `claude-opus-5-5`, `claude-sonnet-5-5` and `claude-haiku-5-5`. These are dated examples, not guaranteed account access or permanent aliases. Confirm current availability and pricing before spending. Preserve a user-requested model when supported; otherwise explain the incompatibility before changing it.

Do not invent version/date suffixes. Use each provider's exact identifier for Claude API, Bedrock, Google Cloud or Foundry. Verify context/output limits and supported thinking types, effort, structured output, batches and server tools for the chosen account and SDK. Use evaluations and budget constraints to choose quality/latency/cost; never force Opus for every request.

Legacy identifiers in examples are feature illustrations and must be checked against current deprecation and model documentation. Record the exact model/SDK/request options used in a real test; syntactic validation is not an API compatibility test.
