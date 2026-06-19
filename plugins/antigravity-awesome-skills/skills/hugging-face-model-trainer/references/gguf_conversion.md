# GGUF Conversion Guide

After training models with TRL on Hugging Face Jobs, convert them to **GGUF format** for use with llama.cpp, Ollama, LM Studio, and other local inference tools.

**This guide provides production-ready, tested code based on successful conversions.** All critical dependencies and build steps are included.

## What is GGUF?

**GGUF** (GPT-Generated Unified Format):
- Optimized format for CPU/GPU inference with llama.cpp
- Supports quantization (4-bit, 5-bit, 8-bit) to reduce model size
- Compatible with: Ollama, LM Studio, Jan, GPT4All, llama.cpp
- Typically 2-8GB for 7B models (vs 14GB unquantized)

## When to Convert to GGUF

**Convert when:**
- Running models locally with Ollama or LM Studio
- Using CPU-optimized inference
- Reducing model size with quantization
- Deploying to edge devices
- Sharing models for local-first use

## Critical Success Factors

Based on production testing, these are **essential** for reliable conversion:

### 1. ✅ Install Build Tools FIRST
**Before cloning llama.cpp**, install build dependencies:
```python
subprocess.run(["apt-get", "update", "-qq"], check=True, capture_output=True)
subprocess.run(["apt-get", "install", "-y", "-qq", "build-essential", "cmake"], check=True, capture_output=True)
```

**Why:** The quantization tool requires gcc and cmake. Installing after cloning doesn't help.

### 2. ✅ Use CMake (Not Make)
**Build the quantize tool with CMake:**
```python
# Create build directory
os.makedirs("/tmp/llama.cpp/build", exist_ok=True)

# Configure
subprocess.run([
    "cmake", "-B", "/tmp/llama.cpp/build", "-S", "/tmp/llama.cpp",
    "-DGGML_CUDA=OFF"  # Faster build, CUDA not needed for quantization
], check=True, capture_output=True, text=True)

# Build
subprocess.run([
    "cmake", "--build", "/tmp/llama.cpp/build",
    "--target", "llama-quantize", "-j", "4"
], check=True, capture_output=True, text=True)

# Binary path
quantize_bin = "/tmp/llama.cpp/build/bin/llama-quantize"
```

**Why:** CMake is more reliable than `make` and produces consistent binary paths.

### 3. ✅ Include All Dependencies
**PEP 723 header must include:**
```python
# /// script
# dependencies = [
#     "transformers>=4.36.0",
#     "peft>=0.7.0",
#     "torch>=2.0.0",
#     "accelerate>=0.24.0",
#     "huggingface_hub>=0.20.0",
#     "sentencepiece>=0.1.99",  # Required for tokenizer
#     "protobuf>=3.20.0",        # Required for tokenizer
#     "numpy",
#     "gguf",
# ]
# ///
```

**Why:** `sentencepiece` and `protobuf` are critical for tokenizer conversion. Missing them causes silent failures.

### 4. ✅ Verify Names Before Use
**Always verify repos exist:**
```python
# Before submitting job, verify:
hub_repo_details([ADAPTER_MODEL], repo_type="model")
hub_repo_details([BASE_MODEL], repo_type="model")
```

**Why:** Non-existent dataset/model names cause job failures that could be caught in seconds.

## Complete Conversion Script

See `scripts/convert_to_gguf.py` for the complete, production-ready script.

**Key features:**
- ✅ All dependencies in PEP 723 header
- ✅ Build tools installed automatically
- ✅ CMake build process (reliable)
- ✅ Comprehensive error handling
- ✅ Environment variable configuration
- ✅ Automatic README generation

## Quick Conversion Job

```python
# Before submitting: VERIFY MODELS EXIST
hub_repo_details(["username/my-finetuned-model"], repo_type="model")
hub_repo_details(["Qwen/Qwen2.5-0.5B"], repo_type="model")

# Submit conversion job
hf_jobs("uv", {
    "script": open("trl/scripts/convert_to_gguf.py").read(),  # Or inline the script
    "flavor": "a10g-large",
    "timeout": "45m",
    "secrets": {"HF_TOKEN": "$HF_TOKEN"},
    "env": {
        "ADAPTER_MODEL": "username/my-finetuned-model",
        "BASE_MODEL": "Qwen/Qwen2.5-0.5B",
        "OUTPUT_REPO": "username/my-model-gguf",
        "HF_USERNAME": "username"  # Optional, for README
    }
})
```

## Conversion Process

The script performs these steps:

1. **Load and Merge** - Load base model and LoRA adapter, merge them
2. **Install Build Tools** - Install gcc, cmake (CRITICAL: before cloning llama.cpp)
3. **Setup llama.cpp** - Clone repo, install Python dependencies
4. **Convert to GGUF** - Create FP16 GGUF using llama.cpp converter
5. **Build Quantize Tool** - Use CMake to build `llama-quantize`
6. **Quantize** - Create Q4_K_M, Q5_K_M, Q8_0 versions
7. **Upload** - Upload all versions + README to Hub

## Quantization Options

Common quantization formats (from smallest to largest):

| Format | Size | Quality | Use Case |
|--------|------|---------|----------|
| **Q4_K_M** | ~300MB | Good | **Recommended** - best balance of size/quality |
| **Q5_K_M** | ~350MB | Better | Higher quality, slightly larger |
| **Q8_0** | ~500MB | Very High | Near-original quality |
| **F16** | ~1GB | Original | Full precision, largest file |

**Recommendation:** Create Q4_K_M, Q5_K_M, and Q8_0 versions to give users options.

## Hardware Requirements

**For conversion:**
- Small models (<1B): CPU-basic works, but slow
- Medium models (1-7B): a10g-large recommended
- Large models (7B+): a10g-large or a100-large

**Time estimates:**
- 0.5B model: ~15-25 minutes on A10G
- 3B model: ~30-45 minutes on A10G
- 7B model: ~45-60 minutes on A10G

## Using GGUF Models

**GGUF models work on both CPU and GPU.** They're optimized for CPU inference but can also leverage GPU acceleration when available.

### With Ollama (auto-detects GPU)
```bash
# Download GGUF
hf download username/my-model-gguf model-q4_k_m.gguf

# Create Modelfile
echo "FROM ./model-q4_k_m.gguf" > Modelfile

# Create and run (uses GPU automatically if available)
ollama create my-model -f Modelfile
ollama run my-model
```

### With llama.cpp
```bash
# CPU only
./llama-cli -m model-q4_k_m.gguf -p "Your prompt"

# With GPU acceleration (offload 32 layers to GPU)
./llama-cli -m model-q4_k_m.gguf -ngl 32 -p "Your prompt"
```

### With LM Studio
1. Download the `.gguf` file
2. Import into LM Studio
3. Start chatting

## Best Practices

### ✅ DO:
1. **Verify repos exist** before submitting jobs (use `hub_repo_details`)
2. **Install build tools FIRST** before cloning llama.cpp
3. **Use CMake** for building quantize tool (not make)
4. **Include all dependencies** in PEP 723 header (especially sentencepiece, protobuf)
5. **Create multiple quantizations** - Give users choice
6. **Test on known models** before production use
7. **Use A10G GPU** for faster conversion

### ❌ DON'T:
1. **Assume repos exist** - Always verify with hub tools
2. **Use make** instead of CMake - Less reliable
3. **Remove dependencies** to "simplify" - They're all needed
4. **Skip build tools** - Quantization will fail silently
5. **Use default paths** - CMake puts binaries in build/bin/

## Common Issues

### Out of memory during merge
**Fix:**
- Use larger GPU (a10g-large or a100-large)
- Ensure `device_map="auto"` for automatic placement
- Use `dtype=torch.float16` or `torch.bfloat16`

### Conversion fails with architecture error
**Fix:**
- Ensure llama.cpp supports the model architecture
- Check for standard architecture (Qwen, Llama, Mistral, etc.)
- Update llama.cpp to latest: `git clone --depth 1 https://github.com/ggerganov/llama.cpp.git`
- Check llama.cpp documentation for model support

### Quantization fails
**Fix:**
- Verify build tools installed: `apt-get install build-essential cmake`
- Use CMake (not make) to build quantize tool
- Check binary path: `/tmp/llama.cpp/build/bin/llama-quantize`
- Verify FP16 GGUF exists before quantizing

### Missing sentencepiece error
**Fix:**
- Add to PEP 723 header: `"sentencepiece>=0.1.99", "protobuf>=3.20.0"`
- Don't remove dependencies to "simplify" - all are required

### Upload fails or times out
**Fix:**
- Large models (>2GB) need longer timeout: `"timeout": "1h"`
- Upload quantized versions separately if needed
- Check network/Hub status

## Lessons Learned

These are from production testing and real failures:

### 1. Always Verify Before Use
**Lesson:** Don't assume repos/datasets exist. Check first.
```python
# BEFORE submitting job
hub_repo_details(["trl-lib/argilla-dpo-mix-7k"], repo_type="dataset")  # Would catch error
```
**Prevented failures:** Non-existent dataset names, typos in model names

### 2. Prioritize Reliability Over Performance
**Lesson:** Default to what's most likely to succeed.
- Use CMake (not make) - more reliable
- Disable CUDA in build - faster, not needed
- Include all dependencies - don't "simplify"

**Prevented failures:** Build failures, missing binaries

### 3. Create Atomic, Self-Contained Scripts
**Lesson:** Don't remove dependencies or steps. Scripts should work as a unit.
- All dependencies in PEP 723 header
- All build steps included
- Clear error messages

**Prevented failures:** Missing tokenizer libraries, build tool failures

## References

**In this skill:**
- `scripts/convert_to_gguf.py` - Complete, production-ready script

**External:**
- [llama.cpp Repository](https://github.com/ggerganov/llama.cpp)
- [GGUF Specification](https://github.com/ggerganov/ggml/blob/master/docs/gguf.md)
- [Ollama Documentation](https://ollama.ai)
- [LM Studio](https://lmstudio.ai)

## Summary

**Critical checklist for GGUF conversion:**
- [ ] Verify adapter and base models exist on Hub
- [ ] Use production script from `scripts/convert_to_gguf.py`
- [ ] All dependencies in PEP 723 header (including sentencepiece, protobuf)
- [ ] Build tools installed before cloning llama.cpp
- [ ] CMake used for building quantize tool (not make)
- [ ] Correct binary path: `/tmp/llama.cpp/build/bin/llama-quantize`
- [ ] A10G GPU selected for reasonable conversion time
- [ ] Timeout set to 45m minimum
- [ ] HF_TOKEN in secrets for Hub upload

**The script in `scripts/convert_to_gguf.py` incorporates all these lessons and has been tested successfully in production.**
