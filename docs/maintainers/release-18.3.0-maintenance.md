# v18.3.0 Maintainer Batch

This record accompanies the v18.3.0 changelog entry and records the source PR repairs and protected merges that form this release batch.

| PR | Exact reviewed head | Merged commit | Result |
| --- | --- | --- | --- |
| #1558 | `8e5a340b8d43cbb7b2c43e02cecd4e9ccdeb617a` | `136c6827601cd193758de243afdaf07766100762` | Added `chatexport-need-miner`; added explicit limitations and community credit. |
| #1559 | `98d485b5e901506153851e4a65dd52bf01ce17b2` | `c25f7030d72db14615b3bf99040814136dacbcec` | Added `dali-short-address-commissioner`; added explicit limitations and community credit. |
| #1560 | `85cb40d74b27697d274dbff34727d3cdfbff486a` | `2f66662ca7e33ed08d0db4b830d29b1da59f9cb2` | Added `eol-resistor-calculator`; added explicit limitations and community credit. |
| #1561 | `7449b71190b0b1d880218d6817473b77520ffb81` | `21891df7d30a290707bef5084ce32cd030c96e85` | Added `esl-price-sync`; added explicit limitations and community credit. |
| #1562 | `963baea9710cb7fa260dc4bc8f2c808995cd7498` | `f21c7c09ddf4a096d996928154f7a92eb308d9ff` | Added `marlin-bed-leveling`; added explicit limitations and community credit. |
| #1563 | `d371512b764a87b8847477d11938fdcf13c0a953` | `022056ca7791a149a90f9313a6fbf2bcf2fe769a` | Added `oneroster-csv-validator`; added explicit limitations and community credit. |
| #1564 | `890add0da6dc8f3c2b8130ae1694c65e9627f90d` | `32f608f398cd376f1416e965b276e210eea6f57a` | Expanded Telegram Mini App ads guidance with consent, privacy, callback trust, and server-side validation limits. |

The six new skills were reviewed against their complete changed skill trees. For #1558–#1563, the exact-head evidence reported no blocking findings, and the maintainer review attestation was supplied because Tessl review did not pass. #1564 changed the existing Telegram Mini App reference guide; its evidence had no blocking findings, and the guidance was checked against the publisher documentation.

Every source PR passed the protected `pr-policy`, `pr-evidence`, `source-validation`, and `artifact-preview` checks for the reviewed head before `npm run merge:batch` merged it. Canonical registries, plugin mirrors, and contributor credit are handled by the protected canonical-sync PR lane.
