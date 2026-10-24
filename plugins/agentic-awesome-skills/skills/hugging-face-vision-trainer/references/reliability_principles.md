# Reliability and truthful evidence

AAS-reviewed adaptation of the upstream reliability notes. No quantified success-rate, hardware-fit or speedup claim is established by this catalog review.

- Verify exact model/data revisions, rights and schema. Existence on the Hub is not evidence of trust, compatibility or permission to redistribute.
- Use a reviewed locked environment; dependency lower bounds and a current download URL do not pin executable code. The guard must run before heavy imports; help/syntax checks need no GPU.
- Validate annotations explicitly. Box convention cannot be inferred reliably from four numbers. Reject invalid geometry or mismatched categories; preserve legitimate negative images rather than dropping them. Any deliberate clipping or relabeling requires a documented transformation and counts.
- Keep train, validation and independent test roles distinct. Prevent group/time leakage, log the actual bounded sample/exposure and seed, and do not call fallback validation a held-out test.
- Establish measured pilot throughput and memory use before scaling. Disable untested optimizations until demonstrated with the actual dependency/hardware combination; no optimizer or mixed precision setting always works.
- Set external time/CPU/GPU/memory/disk/network limits. Row and step caps are useful but not a resource sandbox. A timeout or OOM can leave partial artifacts; preserve their incomplete status rather than reporting success.
- Keep metrics local and secrets out of arguments/config dumps. Log minimal sanitized error categories and private diagnostic references, not complete stdout/stderr, sample images or tokens.
- Validate model/processor/label mapping reload and approved durable persistence. Upload, publication and account creation are separate authorized actions.
- Report exactly what was tested: offline helper tests, syntax/import checks, actual smoke training and held-out evaluation are different levels of evidence. No automatic package installation, cloud run or dataset download was performed for this review.
