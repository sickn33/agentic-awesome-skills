# Selecting a training method

SFT learns from approved target text or reviewed chat conversations. The bundled
SFT example intentionally accepts a nonempty `text` field only; format chat data
with the model's exact template first. Decide whether prompt/user tokens should
be trained or masked. Inspect tokenized labels rather than assuming a template
sets correct loss masks.

DPO uses prompt/chosen/rejected preferences without an online reward model. The
bundled example accepts nonempty strings and rejects identical chosen/rejected
pairs. Review preference quality, formatting and the model baseline. Chat-structured
preferences require a supported chat template and a version-appropriate adapter.

GRPO samples multiple completions per prompt and needs an explicit reward model
or function. The bundled example requires `prompt` and `answer`, with a toy
whitespace-stripped exact-match reward. This is not a semantic/math verifier.
Check generation count divides the effective batch as required by pinned TRL;
the example uses two generations with batch two. Never execute untrusted generated
code as a reward shortcut. Bound prompt/completion lengths and compute.

Reward modeling needs labeled comparisons and an appropriate scoring head; there
is no bundled reward-training implementation certified here. None of these methods
requires public publication or telemetry. Evaluate held-out behavior against a
baseline; loss alone does not establish useful improvement.
