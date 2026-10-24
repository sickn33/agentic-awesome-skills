## Hardware Acceleration

### Apple Silicon (Metal)

```bash
cmake -B build-metal -DGGML_METAL=ON -DCMAKE_BUILD_TYPE=Release
cmake --build build-metal --config Release -j 4
llama-cli -m model.gguf -ngl 99 -p "Hello"
```

### NVIDIA (CUDA)

```bash
cmake -B build-cuda -DGGML_CUDA=ON -DCMAKE_BUILD_TYPE=Release
cmake --build build-cuda --config Release -j 4
llama-cli -m model.gguf -ngl 35 -p "Hello"

# Hybrid for large models
llama-cli -m llama-70b.Q4_K_M.gguf -ngl 20

# Multi-GPU split
llama-cli -m large-model.gguf --tensor-split 0.5,0.5 -ngl 60
```

### AMD (ROCm)

```bash
cmake -B build-hip -DGGML_HIP=ON -DCMAKE_BUILD_TYPE=Release
cmake --build build-hip --config Release -j 4
llama-cli -m model.gguf -ngl 999
```

### CPU

```bash
# Match physical cores, not logical threads
llama-cli -m model.gguf -t 8 -p "Hello"

# BLAS acceleration
cmake -B build-blas -DGGML_BLAS=ON -DGGML_BLAS_VENDOR=OpenBLAS -DCMAKE_BUILD_TYPE=Release
cmake --build build-blas --config Release -j 4
```
Use a reviewed source revision and installed backend toolchains; inspect that revision’s documented CMake options and generated binary paths. Replace llama-cli with the corresponding build/bin executable or reviewed installed binary. Layer-offload/thread values are tuning candidates, not fit or speed guarantees; include KV cache/context and shared memory pressure.
