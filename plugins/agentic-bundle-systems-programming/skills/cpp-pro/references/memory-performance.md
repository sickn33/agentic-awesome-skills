# Memory Management & Performance

## Smart Pointers

```cpp
#include <memory>

// unique_ptr - exclusive ownership
auto create_resource() {
    return std::make_unique<Resource>("data");
}

// shared_ptr - reference counting
std::shared_ptr<Data> shared = std::make_shared<Data>(42);
std::weak_ptr<Data> weak = shared;  // Non-owning reference

// Custom deleters
auto file_deleter = [](FILE* fp) { if (fp) fclose(fp); };
std::unique_ptr<FILE, decltype(file_deleter)> file(
    fopen("data.txt", "r"),
    file_deleter
);

// enable_shared_from_this
class Node : public std::enable_shared_from_this<Node> {
public:
    std::shared_ptr<Node> get_shared() {
        return shared_from_this();
    }
};
```

## Custom Allocators

```cpp
#include <memory>
#include <vector>

// Pool allocator for fixed-size objects
template<typename T, size_t PoolSize = 1024>
class PoolAllocator {
    struct Block {
        alignas(T) std::byte data[sizeof(T)];
        Block* next;
    };

    Block pool_[PoolSize];
    Block* free_list_ = nullptr;

public:
    using value_type = T;

    PoolAllocator() {
        // Initialize free list
        for (size_t i = 0; i < PoolSize - 1; ++i) {
            pool_[i].next = &pool_[i + 1];
        }
        pool_[PoolSize - 1].next = nullptr;
        free_list_ = &pool_[0];
    }

    T* allocate(size_t n) {
        if (n != 1 || !free_list_) {
            throw std::bad_alloc();
        }
        Block* block = free_list_;
        free_list_ = free_list_->next;
        return reinterpret_cast<T*>(block->data);
    }

    void deallocate(T* p, size_t n) {
        if (n != 1) return;
        Block* block = reinterpret_cast<Block*>(p);
        block->next = free_list_;
        free_list_ = block;
    }
};

// Usage
std::vector<int, PoolAllocator<int>> vec;

// Arena allocator - bump allocator
class Arena {
    std::byte* buffer_;
    size_t size_;
    size_t offset_ = 0;

public:
    Arena(size_t size) : size_(size) {
        buffer_ = new std::byte[size];
    }

    ~Arena() {
        delete[] buffer_;
    }

    template<typename T>
    T* allocate(size_t n = 1) {
        size_t alignment = alignof(T);
        size_t space = size_ - offset_;
        void* ptr = buffer_ + offset_;

        if (std::align(alignment, sizeof(T) * n, ptr, space)) {
            offset_ = size_ - space + sizeof(T) * n;
            return static_cast<T*>(ptr);
        }

        throw std::bad_alloc();
    }

    void reset() {
        offset_ = 0;
    }
};
```

## Move Semantics

```cpp
#include <utility>
#include <algorithm>

class Buffer {
    size_t size_;
    char* data_;

public:
    // Constructor
    Buffer(size_t size) : size_(size), data_(new char[size]) {}

    // Destructor
    ~Buffer() { delete[] data_; }

    // Copy constructor
    Buffer(const Buffer& other) : size_(other.size_), data_(new char[size_]) {
        std::copy(other.data_, other.data_ + size_, data_);
    }

    // Copy assignment
    Buffer& operator=(const Buffer& other) {
        if (this != &other) {
            delete[] data_;
            size_ = other.size_;
            data_ = new char[size_];
            std::copy(other.data_, other.data_ + size_, data_);
        }
        return *this;
    }

    // Move constructor
    Buffer(Buffer&& other) noexcept
        : size_(other.size_), data_(other.data_) {
        other.size_ = 0;
        other.data_ = nullptr;
    }

    // Move assignment
    Buffer& operator=(Buffer&& other) noexcept {
        if (this != &other) {
            delete[] data_;
            size_ = other.size_;
            data_ = other.data_;
            other.size_ = 0;
            other.data_ = nullptr;
        }
        return *this;
    }
};

// Perfect forwarding
template<typename T>
void wrapper(T&& arg) {
    process(std::forward<T>(arg));  // Preserves lvalue/rvalue
}
```

## SIMD Optimization

```cpp
#include <immintrin.h>  // AVX/AVX2
#include <cstring>

// Vectorized sum using AVX2
float simd_sum(const float* data, size_t size) {
    __m256 sum_vec = _mm256_setzero_ps();

    size_t i = 0;
    // Process 8 floats at a time
    for (; i + 8 <= size; i += 8) {
        __m256 vec = _mm256_loadu_ps(&data[i]);
        sum_vec = _mm256_add_ps(sum_vec, vec);
    }

    // Horizontal sum
    alignas(32) float temp[8];
    _mm256_store_ps(temp, sum_vec);
    float result = 0.0f;
    for (int j = 0; j < 8; ++j) {
        result += temp[j];
    }

    // Handle remaining elements
    for (; i < size; ++i) {
        result += data[i];
    }

    return result;
}

// Vectorized multiply-add
void fma_operation(float* result, const float* a, const float* b,
                   const float* c, size_t size) {
    for (size_t i = 0; i + 8 <= size; i += 8) {
        __m256 va = _mm256_loadu_ps(&a[i]);
        __m256 vb = _mm256_loadu_ps(&b[i]);
        __m256 vc = _mm256_loadu_ps(&c[i]);

        // result[i] = a[i] * b[i] + c[i]
        __m256 vr = _mm256_fmadd_ps(va, vb, vc);
        _mm256_storeu_ps(&result[i], vr);
    }
}
```

## Cache-Friendly Design

```cpp
// Structure of Arrays (SoA) - better cache locality
struct ParticlesAoS {
    struct Particle {
        float x, y, z;
        float vx, vy, vz;
    };
    std::vector<Particle> particles;
};

struct ParticlesSoA {
    std::vector<float> x, y, z;
    std::vector<float> vx, vy, vz;

    void update_positions(float dt) {
        // All x coordinates are contiguous - better cache usage
        for (size_t i = 0; i < x.size(); ++i) {
            x[i] += vx[i] * dt;
            y[i] += vy[i] * dt;
            z[i] += vz[i] * dt;
        }
    }
};

// Cache line padding to avoid false sharing
struct alignas(64) CacheLinePadded {
    std::atomic<int> counter;
    char padding[64 - sizeof(std::atomic<int>)];
};

// Prefetching
void process_with_prefetch(const int* data, size_t size) {
    for (size_t i = 0; i < size; ++i) {
        // Prefetch data for next iteration
        if (i + 8 < size) {
            __builtin_prefetch(&data[i + 8], 0, 1);
        }
        // Process current data
        process(data[i]);
    }
}
```

## Memory Pool

```cpp
#include <vector>
#include <memory>

template<typename T, size_t ChunkSize = 256>
class MemoryPool {
    struct Chunk {
        alignas(T) std::byte data[sizeof(T) * ChunkSize];
    };

    std::vector<std::unique_ptr<Chunk>> chunks_;
    std::vector<T*> free_list_;
    size_t current_chunk_offset_ = ChunkSize;

public:
    T* allocate() {
        if (!free_list_.empty()) {
            T* ptr = free_list_.back();
            free_list_.pop_back();
            return ptr;
        }

        if (current_chunk_offset_ >= ChunkSize) {
            chunks_.push_back(std::make_unique<Chunk>());
            current_chunk_offset_ = 0;
        }

        Chunk* chunk = chunks_.back().get();
        T* ptr = reinterpret_cast<T*>(
            &chunk->data[sizeof(T) * current_chunk_offset_++]
        );
        return ptr;
    }

    void deallocate(T* ptr) {
        free_list_.push_back(ptr);
    }

    template<typename... Args>
    T* construct(Args&&... args) {
        T* ptr = allocate();
        new (ptr) T(std::forward<Args>(args)...);
        return ptr;
    }

    void destroy(T* ptr) {
        ptr->~T();
        deallocate(ptr);
    }
};
```

## Copy Elision and RVO

```cpp
// Return Value Optimization (RVO)
std::vector<int> create_vector() {
    std::vector<int> vec{1, 2, 3, 4, 5};
    return vec;  // RVO applies, no copy/move
}

// Named Return Value Optimization (NRVO)
std::string build_string(bool condition) {
    std::string result;
    if (condition) {
        result = "condition true";
    } else {
        result = "condition false";
    }
    return result;  // NRVO may apply
}

// Guaranteed copy elision (C++17)
struct NonMovable {
    NonMovable() = default;
    NonMovable(const NonMovable&) = delete;
    NonMovable(NonMovable&&) = delete;
};

NonMovable create() {
    return NonMovable{};  // Guaranteed no copy/move in C++17
}

auto obj = create();  // OK in C++17
```

## Alignment and Memory Layout

```cpp
#include <cstddef>

// Control alignment
struct alignas(64) CacheAligned {
    int data[16];
};

// Check alignment
static_assert(alignof(CacheAligned) == 64);

// Aligned allocation
void* aligned_alloc_wrapper(size_t alignment, size_t size) {
    void* ptr = nullptr;
    if (posix_memalign(&ptr, alignment, size) != 0) {
        throw std::bad_alloc();
    }
    return ptr;
}

// Placement new with alignment
alignas(32) std::byte buffer[sizeof(Data)];
Data* obj = new (buffer) Data();
obj->~Data();  // Manual destruction needed
```

## Quick Reference

| Technique | Use Case | Benefit |
|-----------|----------|---------|
| Smart Pointers | Ownership management | Memory safety |
| Move Semantics | Avoid copies | Performance |
| Custom Allocators | Specialized allocation | Speed + control |
| SIMD | Parallel computation | 4-8x speedup |
| SoA Layout | Sequential access | Cache efficiency |
| Memory Pools | Frequent alloc/dealloc | Reduced fragmentation |
| Alignment | SIMD/cache optimization | Performance |
| RVO/NRVO | Return objects | Zero-copy |
