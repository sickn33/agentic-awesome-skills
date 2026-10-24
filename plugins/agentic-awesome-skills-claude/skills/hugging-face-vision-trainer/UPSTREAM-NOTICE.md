# Upstream attribution and AAS modifications

Original skill and training patterns: Hugging Face, https://github.com/huggingface/skills. Apache-2.0 license retained from upstream commit `fabc634a893f62ad5c2039830397efa35fa62715`; this records the license source, not an assertion that original imported scripts equal that commit.

AAS individually reviewed every original file. Changes: bounded explicit local execution; fixed revisions, safetensors and output guards; bounded streaming subsets; no persistent login, telemetry or automatic publication; explicit annotation conventions and valid negative images; mask preprocessing through the pinned SAM processor; measured budget arithmetic; advisory metadata preview; focused offline tests and corrected reference guidance. No GPU training, cloud Job, dataset/model download or Hub publication was performed.
