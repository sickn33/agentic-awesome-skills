# Upstream helpers for azure-eventhub-py

The files listed below were recovered from [microsoft/skills](https://github.com/microsoft/skills) at commit `fc164ba1d7a0c10377dbcc1c9ac07253b9329fdb`. The repository ID is `1135891523`.

They retain the upstream **MIT** license reproduced in [UPSTREAM-LICENSE.txt](UPSTREAM-LICENSE.txt). This notice applies to the listed support files; it does not replace the license metadata of other catalog files. Preserve the upstream license and this attribution when redistributing them.

License wording is unchanged; text-only trailing whitespace and EOF blank lines are normalized. Original license: https://github.com/microsoft/skills/blob/fc164ba1d7a0c10377dbcc1c9ac07253b9329fdb/LICENSE

| Local file | Original upstream path | Original Git blob SHA | Import changes |
| --- | --- | --- | --- |
| `references/checkpointing.md` | `.github/plugins/azure-sdk-python/skills/azure-eventhub-py/references/checkpointing.md` | `39fabba6e3aefa0531b5e208cf85dcd3c24208a2` | text-only trailing whitespace and EOF blank lines normalized |
| `references/partitions.md` | `.github/plugins/azure-sdk-python/skills/azure-eventhub-py/references/partitions.md` | `1e64c82d620bae578c124253f81407b7f82aed25` | text-only trailing whitespace and EOF blank lines normalized |
| `scripts/setup_consumer.py` | `.github/plugins/azure-sdk-python/skills/azure-eventhub-py/scripts/setup_consumer.py` | `73b925deb18c3b6da0760b3225cc8e3ea69db1e7` | text-only trailing whitespace normalized |

`scripts/setup_consumer.py` authenticates to the configured Event Hub. `send` publishes event data; `receive` prints event bodies and properties and, when configured, writes/advances a Blob checkpoint. Confirm the exact namespace, hub, payload/count, starting position, data handling, and checkpoint destination before live use. No cloud calls were made during restoration.

Catalog review modifications: corrected sync/async imports, checkpoint failure semantics, partition/property guidance and helper receive termination/credential cleanup. Original source blob identifiers above describe the import, not the modified local bytes. No Azure operation was performed.
