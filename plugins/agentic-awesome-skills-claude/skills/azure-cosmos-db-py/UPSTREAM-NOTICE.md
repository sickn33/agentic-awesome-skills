# Upstream helpers for azure-cosmos-db-py

The files listed below were recovered from [microsoft/skills](https://github.com/microsoft/skills) at commit `fc164ba1d7a0c10377dbcc1c9ac07253b9329fdb`. The repository ID is `1135891523`.

They retain the upstream **MIT** license reproduced in [UPSTREAM-LICENSE.txt](UPSTREAM-LICENSE.txt). This notice applies to the listed support files; it does not replace the license metadata of other catalog files. Preserve the upstream license and this attribution when redistributing them.

License wording is unchanged; text-only trailing whitespace and EOF blank lines are normalized. Original license: https://github.com/microsoft/skills/blob/fc164ba1d7a0c10377dbcc1c9ac07253b9329fdb/LICENSE

| Local file | Original upstream path | Original Git blob SHA | Import changes |
| --- | --- | --- | --- |
| `references/client-setup.md` | `.github/plugins/azure-sdk-python/skills/azure-cosmos-db-py/references/client-setup.md` | `c81c4c803cb119d46baa69a622b14323cca479a2` | text-only trailing whitespace and EOF blank lines normalized |
| `references/service-layer.md` | `.github/plugins/azure-sdk-python/skills/azure-cosmos-db-py/references/service-layer.md` | `f32dc6773d273279c19702b1e52b4f68150f014c` | text-only trailing whitespace and EOF blank lines normalized |
| `references/testing.md` | `.github/plugins/azure-sdk-python/skills/azure-cosmos-db-py/references/testing.md` | `b7bd21901bf348525b3992ab64d36fff73818cbf` | text-only trailing whitespace and EOF blank lines normalized |
| `references/partitioning.md` | `.github/plugins/azure-sdk-python/skills/azure-cosmos-db-py/references/partitioning.md` | `a98e1758815b42fd6f1287ed6edcca735b6ec533` | text-only trailing whitespace and EOF blank lines normalized |
| `references/error-handling.md` | `.github/plugins/azure-sdk-python/skills/azure-cosmos-db-py/references/error-handling.md` | `d9001341f2584db73eeb33d4d8929aadb6ce5c8a` | text-only trailing whitespace and EOF blank lines normalized |
| `assets/cosmos_client_template.py` | `.github/plugins/azure-sdk-python/skills/azure-cosmos-db-py/assets/cosmos_client_template.py` | `7af70bae994cbddf64c94a3ade5464559987a124` | content unchanged |
| `assets/service_template.py` | `.github/plugins/azure-sdk-python/skills/azure-cosmos-db-py/assets/service_template.py` | `2efff3e0a13eac98ed6cbfb834e243d6a7600598` | content unchanged |
| `assets/conftest_template.py` | `.github/plugins/azure-sdk-python/skills/azure-cosmos-db-py/assets/conftest_template.py` | `996c3025b3c83e756bc7e070777cb4550a4480dd` | content unchanged |

The integration fixture in `assets/conftest_template.py` connects to the configured Cosmos endpoint; `cleanup_test_docs` deletes only IDs explicitly added to its tracking list. Copying the template does not connect to Cosmos. Use an isolated disposable test container and test-only records; never point it at production data. No live account was used during restoration.

2026-10-23 adaptations: exact emulator URL detection, partition/document validation, async offload, unavailable-state distinction, mutable-field allowlist, disposable-test opt-in, cleanup visibility, and corrected starter/concurrency/transaction documentation. MIT attribution/license preserved; AST parsing only, no live integration executed.
