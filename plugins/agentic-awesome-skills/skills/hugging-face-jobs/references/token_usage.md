# Credential handling for Jobs

_Modified in the local catalog review: removed token-prefix logging, hardcoded-token fallback advice and universal MCP substitution claims._

Authenticate the submitter with an approved existing login or secret facility. Separately decide whether the remote workload needs a Hub secret at all: public reads often do not; private/gated reads need permission; publication needs scoped write permission to the approved target. Organization membership and fine-grained access matter. Diagnose 401/403 without automatically broadening permissions.

## Python API

```python
from huggingface_hub import HfApi, get_token
secret = get_token()
if not secret:
    raise RuntimeError("Configure an approved local Hugging Face credential outside chat")
# Only for a reviewed workload authorized to receive this credential:
job = HfApi().run_uv_job(
    "reviewed_script.py", flavor="cpu-basic", timeout="10m",
    secrets={"HF_TOKEN": secret},
)
print(job.id, job.url)
```

A literal `$HF_TOKEN` is not expanded by this Python mapping. For a CLI version supporting `-s HF_TOKEN`, the name refers to a locally configured secret; confirm with its help. An MCP connector may implement placeholders, but use only its documented schema and actual secret mechanism. Do not assume a placeholder works in every tool.

Inside reviewed job code, access `os.environ.get("HF_TOKEN")` or the library's normal credential discovery. Check presence without displaying any bytes. Do not pass tokens in command-line arguments, print prefixes, write them to data/cards/logs, put them in ordinary `env` configuration, or ask the user to paste them into chat. A secret is hidden configuration, not isolation from running code: the workload and dependencies can read it. Use minimal target-specific grants and revoke/rotate exposed credentials through the owner's approved process.

Do not call `login()` inside generic helpers merely to make an upload work; that mutates the local authentication cache. Pass a scoped credential or environment secret. Do not print full `whoami()` token metadata; a minimal account identifier is enough for namespace confirmation.
