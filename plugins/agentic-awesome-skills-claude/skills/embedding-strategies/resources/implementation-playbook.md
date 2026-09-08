# Embedding selection and migration

## Inputs

Representative documents, query/relevance pairs, data-sharing permission, installed provider SDK and latency/cost constraints.

## Procedure

1. Choose candidate models from their actual supported languages, token limits, dimensions and query/document instructions. Record model revision and preprocessing together.
2. Validate chunk-size and overlap bounds; test empty input and an overlong document. Preserve identifiers and source offsets. Batch only within provider limits and keep original text intact.
3. Compare retrieval on the same labeled queries, including no-answer and cross-tenant cases. Use a separate index for each model and dimension; verify rollback before switching readers.

## Worked example

Evaluate two models against twenty labeled support queries. Report recall at a fixed k, latency and failures; do not describe this small sample as general superiority.

## Verification and handoff

Report the actual files or configuration changed, checks performed, observed results and any untested environment. Keep the original inputs and evidence sufficient to reproduce the conclusion.

## Limitations

Embeddings may expose private source information. Do not send documents to a provider without authorization, or mix vectors from different model revisions.
