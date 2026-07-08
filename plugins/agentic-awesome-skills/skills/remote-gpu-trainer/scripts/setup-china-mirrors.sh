#!/usr/bin/env bash
# One-shot China-network setup for a rented GPU box behind the GFW.
# scp this to the instance, then `source` it (it exports env vars into the CURRENT shell):
#   scp scripts/setup-china-mirrors.sh <alias>:/root/ && ssh <alias> 'source /root/setup-china-mirrors.sh'
# Full rationale + the no_proxy trap + the resumable-download ladder: references/china-network.md
set -u

# 1. HuggingFace -> hf-mirror (drop-in; identical repo IDs). MUST be set BEFORE importing
#    huggingface_hub / transformers / datasets — they read HF_ENDPOINT at import time.
export HF_ENDPOINT="${HF_ENDPOINT:-https://hf-mirror.com}"
# Keep hf_transfer OFF on flaky CN links — documented hang-with-no-error in exactly these conditions.
export HF_HUB_ENABLE_HF_TRANSFER=0

# 2. Redirect model caches off the small system disk onto the data disk (override DATA_DIR per profile).
DATA_DIR="${DATA_DIR:-/root/autodl-tmp}"
export HF_HOME="${HF_HOME:-$DATA_DIR/huggingface}"
export HF_HUB_CACHE="${HF_HUB_CACHE:-$HF_HOME/hub}"
export MODELSCOPE_CACHE="${MODELSCOPE_CACHE:-$DATA_DIR/modelscope}"
mkdir -p "$HF_HOME" "$MODELSCOPE_CACHE"

# 3. pip index -> Tsinghua TUNA (Aliyun / USTC are alternates).
pip config set global.index-url https://pypi.tuna.tsinghua.edu.cn/simple 2>/dev/null \
  || export PIP_INDEX_URL=https://pypi.tuna.tsinghua.edu.cn/simple

# 4. no_proxy hygiene — ONLY when an overseas proxy is exported in THIS shell. A proxy that fixes
#    huggingface.co will route every domestic mirror overseas and break it unless exempted here.
#    Use leading-dot domains, set BOTH spellings, include loopback.
if [ -n "${http_proxy:-}${https_proxy:-}" ]; then
  export no_proxy="127.0.0.1,localhost,.tuna.tsinghua.edu.cn,.aliyuncs.com,.modelscope.cn,.hf-mirror.com"
  export NO_PROXY="$no_proxy"
  echo "[setup-china-mirrors] proxy detected -> exempted domestic mirrors via no_proxy"
fi

echo "[setup-china-mirrors] HF_ENDPOINT=$HF_ENDPOINT  HF_HOME=$HF_HOME"
echo "[setup-china-mirrors] done. conda: edit ~/.condarc per references/china-network.md (NEVER mirror pytorch-nightly)."
