# Information theory for code and systems

## Entropy and evidence

Shannon entropy H(X)=-sum p(x) log2 p(x) requires a defined random variable and normalized probabilities. For the hypothetical state frequencies .70,.15,.05,.05,.04,.01, H=1.455132 bits; the uniform six-state maximum is log2(6). Low state entropy does not establish good architecture, low test complexity or correct error handling. Rare failures may matter more than frequent idle states.

Mutual information I(X;Y)=H(Y)-H(Y|X) measures dependence for a specified distribution; determinism conditional on a complete input is not the same as reliability or controllability. Include device/environment state in the model rather than treating an input address as the whole cause.

Kolmogorov complexity is uncomputable in general. Compression ratio is codec/input-size dependent and is only a heuristic, not its measured value or proof that refactoring is needed. Compare with a baseline, account for common syntax, and inspect semantic duplication. Halstead volume is a separate token-count metric, not Shannon entropy.

## Communication and throughput

Shannon-Hartley C=B log2(1+S/N) assumes a band-limited additive white Gaussian noise channel and uses bandwidth in Hz, not audio sample rate. PCM16 mono at16k samples/s has256k bit/s raw; comparing it with a64k codec does not mean75% of audio quality is lost. Bluetooth codecs, security and device capabilities need actual version-specific evidence.

Normalize pipeline rates to the same job and duration before finding a bottleneck.3tokens/s is180tokens/minute; conversion to words depends on language/tokenizer and does not equal a universal15words/minute. Network latency and model speed figures require recorded measurements, dataset and hardware. No recommendation to a paid provider follows from an unsupported toy table.

## Retries and context

Idempotency keys can deduplicate requests only when the server binds the key to a payload and atomically records the effect/result within the appropriate lifetime. They do not alone guarantee exactly-once external processing. Retry backoff and budget bounds are operational controls, not an error-correcting code with a universal rate1/attempts.

LLM context capacity, token costs and retention are model/account dependent. Use actual tokenization and reserve space for outputs/tools. Summarization costs tokens, can lose facts, and must preserve provenance and trust boundaries; a fixed5–10turn window is a possible policy, not a proven optimum.

## Bayesian diagnosis and confidence

Bayes rule P(H_i|E)=P(E|H_i)P(H_i)/sum_j P(E|H_j)P(H_j) requires mutually exclusive/exhaustive hypotheses or an appropriately defined model. Missing likelihoods for some hypotheses make a normalized numerical posterior unavailable. Label hypothetical priors/likelihoods; do not present intuitive percentages as calibrated confidence. Prefer observed evidence, alternatives and a falsifiable next test.

MDL selects models using an explicit encoding and data-fit criterion. It does not prove that an MVVM split is optimal at CC30, or that a class count determines comprehension. Likewise, fixed log entropy/compression thresholds are uncalibrated heuristics until validated on a baseline with false-positive rates and stationarity/window assumptions. Redact personal data and secrets before authorized log analysis.
