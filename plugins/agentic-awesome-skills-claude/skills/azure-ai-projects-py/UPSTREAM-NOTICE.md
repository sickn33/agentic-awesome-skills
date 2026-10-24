# Upstream helpers for azure-ai-projects-py

The files listed below were recovered from [microsoft/skills](https://github.com/microsoft/skills) at commit `fc164ba1d7a0c10377dbcc1c9ac07253b9329fdb`. The repository ID is `1135891523`.

They retain the upstream **MIT** license reproduced in [UPSTREAM-LICENSE.txt](UPSTREAM-LICENSE.txt). This notice applies to the listed support files; it does not replace the license metadata of other catalog files. Preserve the upstream license and this attribution when redistributing them.

License wording is unchanged; text-only trailing whitespace and EOF blank lines are normalized. Original license: https://github.com/microsoft/skills/blob/fc164ba1d7a0c10377dbcc1c9ac07253b9329fdb/LICENSE

| Local file | Original upstream path | Original Git blob SHA | Import changes |
| --- | --- | --- | --- |
| `references/agents.md` | `.github/plugins/azure-sdk-python/skills/azure-ai-projects-py/references/agents.md` | `1cf374aafd3f08a3c534a97a4b4e6cc51a13a59c` | text-only trailing whitespace and EOF blank lines normalized |
| `references/tools.md` | `.github/plugins/azure-sdk-python/skills/azure-ai-projects-py/references/tools.md` | `f8af17a59a8ff1109d0b5c9e0197b3b67df8fb5d` | text-only trailing whitespace and EOF blank lines normalized |
| `references/connections.md` | `.github/plugins/azure-sdk-python/skills/azure-ai-projects-py/references/connections.md` | `01324af775ebcaa16704ca9279881739d45f5227` | text-only trailing whitespace and EOF blank lines normalized |
| `references/deployments.md` | `.github/plugins/azure-sdk-python/skills/azure-ai-projects-py/references/deployments.md` | `8c1f72b864596bcb9d69c1ca57f37b8a8f771fe3` | text-only trailing whitespace and EOF blank lines normalized |
| `references/datasets-indexes.md` | `.github/plugins/azure-sdk-python/skills/azure-ai-projects-py/references/datasets-indexes.md` | `989f484ca98ab295e8c17acace658693acc0570e` | text-only trailing whitespace and EOF blank lines normalized |
| `references/evaluation.md` | `.github/plugins/azure-sdk-python/skills/azure-ai-projects-py/references/evaluation.md` | `89003b93e20e73a4b47898d50efb86a902607402` | text-only trailing whitespace and EOF blank lines normalized |
| `references/async-patterns.md` | `.github/plugins/azure-sdk-python/skills/azure-ai-projects-py/references/async-patterns.md` | `67501ef236e7fa1de892c1ca3b6faa8585c7762c` | text-only trailing whitespace and EOF blank lines normalized |
| `references/built-in-evaluators.md` | `.github/plugins/azure-sdk-python/skills/azure-ai-projects-py/references/built-in-evaluators.md` | `a8158fe44d6ce84e380639d9c7b12e5d7e35e0b3` | text-only trailing whitespace and EOF blank lines normalized |
| `references/custom-evaluators.md` | `.github/plugins/azure-sdk-python/skills/azure-ai-projects-py/references/custom-evaluators.md` | `03957c10c2ca2eb29e1b5b5041486c75cae107b2` | text-only trailing whitespace and EOF blank lines normalized |
| `references/api-reference.md` | `.github/plugins/azure-sdk-python/skills/azure-ai-projects-py/references/api-reference.md` | `5e126d6122440b0d2274c57e5d85a2833f565ffd` | text-only trailing whitespace and EOF blank lines normalized |
| `scripts/run_batch_evaluation.py` | `.github/plugins/azure-sdk-python/skills/azure-ai-projects-py/scripts/run_batch_evaluation.py` | `98bc430b7f6ad125c1d072d91e9d18c5b278fb76` | content unchanged |

`scripts/run_batch_evaluation.py` uploads the selected JSONL dataset to the configured Azure AI project, creates a remote evaluation and run, polls for results, and may incur model or cloud charges. Before invoking it, review the data classification and confirm the exact file, endpoint, deployment, evaluators, and expected cost with the user. No live account or dataset was used during restoration.

## Catalog review changes

Local changes are not byte-identical upstream: clarified classic/v2 boundaries, credential/privacy/cost/tool restrictions, corrected async iteration and bounded polling/concurrency, and replaced the inaccurate exhaustive API guide with an actual 2.0.0b4 wheel export snapshot. The helper now requires explicit cloud opt-in, validates bounded JSONL and evaluator mappings without input mutation, preserves schema types, bounds polling, and writes a new private result file. Original blob IDs above identify imported inputs, not current corrected content. No live Azure operation was performed.
