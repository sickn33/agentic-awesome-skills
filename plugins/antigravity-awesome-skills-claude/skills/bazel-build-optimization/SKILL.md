---
name: bazel-build-optimization
description: "Optimize Bazel builds for large-scale monorepos. Use when configuring Bazel, implementing remote execution, or optimizing build performance for enterprise codebases."
risk: unknown
source: community
date_added: "2026-02-27"
---

# Bazel Build Optimization

Production patterns for Bazel in large-scale monorepos.

## Do not use this skill when

- The task is unrelated to bazel build optimization
- You need a different domain or tool outside this scope

## Instructions

- Clarify goals, constraints, and required inputs.
- Apply relevant best practices and validate outcomes.
- Provide actionable steps and verification.
- If detailed examples are required, open `resources/implementation-playbook.md`.

## Use this skill when

- Setting up Bazel for monorepos
- Configuring remote caching/execution
- Optimizing build times
- Writing custom Bazel rules
- Debugging build issues
- Migrating to Bazel

## Core Concepts

### 1. Bazel Architecture

```
workspace/
├── WORKSPACE.bazel       # External dependencies
├── .bazelrc              # Build configurations
├── .bazelversion         # Bazel version
├── BUILD.bazel           # Root build file
├── apps/
│   └── web/
│       └── BUILD.bazel
├── libs/
│   └── utils/
│       └── BUILD.bazel
└── tools/
    └── bazel/
        └── rules/
```

### 2. Key Concepts

| Concept | Description |
|---------|-------------|
| **Target** | Buildable unit (library, binary, test) |
| **Package** | Directory with BUILD file |
| **Label** | Target identifier `//path/to:target` |
| **Rule** | Defines how to build a target |
| **Aspect** | Cross-cutting build behavior |

## Templates

### Template 1: WORKSPACE Configuration

```python
# WORKSPACE.bazel
workspace(name = "myproject")

load("@bazel_tools//tools/build_defs/repo:http.bzl", "http_archive")

# Rules for JavaScript/TypeScript
http_archive(
    name = "aspect_rules_js",
    sha256 = "...",
    strip_prefix = "rules_js-1.34.0",
    url = "https://github.com/aspect-build/rules_js/releases/download/v1.34.0/rules_js-v1.34.0.tar.gz",
)

load("@aspect_rules_js//js:repositories.bzl", "rules_js_dependencies")
rules_js_dependencies()

load("@rules_nodejs//nodejs:repositories.bzl", "nodejs_register_toolchains")
nodejs_register_toolchains(
    name = "nodejs",
    node_version = "20.9.0",
)

load("@aspect_rules_js//npm:repositories.bzl", "npm_translate_lock")
npm_translate_lock(
    name = "npm",
    pnpm_lock = "//:pnpm-lock.yaml",
    verify_node_modules_ignored = "//:.bazelignore",
)

load("@npm//:repositories.bzl", "npm_repositories")
npm_repositories()

# Rules for Python
http_archive(
    name = "rules_python",
    sha256 = "...",
    strip_prefix = "rules_python-0.27.0",
    url = "https://github.com/bazelbuild/rules_python/releases/download/0.27.0/rules_python-0.27.0.tar.gz",
)

load("@rules_python//python:repositories.bzl", "py_repositories")
py_repositories()
```

### Template 2: .bazelrc Configuration

```bash
# .bazelrc

# Build settings
build --enable_platform_specific_config
build --incompatible_enable_cc_toolchain_resolution
build --experimental_strict_conflict_checks

# Performance
build --jobs=auto
build --local_cpu_resources=HOST_CPUS*.75
build --local_ram_resources=HOST_RAM*.75

# Caching
build --disk_cache=~/.cache/bazel-disk
build --repository_cache=~/.cache/bazel-repo

# Remote caching (optional)
build:remote-cache --remote_cache=grpcs://cache.example.com
build:remote-cache --remote_upload_local_results=true
build:remote-cache --remote_timeout=3600

# Remote execution (optional)
build:remote-exec --remote_executor=grpcs://remote.example.com
build:remote-exec --remote_instance_name=projects/myproject/instances/default
build:remote-exec --jobs=500

# Platform configurations
build:linux --platforms=//platforms:linux_x86_64
build:macos --platforms=//platforms:macos_arm64

# CI configuration
build:ci --config=remote-cache
build:ci --build_metadata=ROLE=CI
build:ci --bes_results_url=https://results.example.com/invocation/
build:ci --bes_backend=grpcs://bes.example.com

# Test settings
test --test_output=errors
test --test_summary=detailed

# Coverage
coverage --combined_report=lcov
coverage --instrumentation_filter="//..."

# Convenience aliases
build:opt --compilation_mode=opt
build:dbg --compilation_mode=dbg

# Import user settings
try-import %workspace%/user.bazelrc
```

### Template 3: TypeScript Library BUILD

```python
# libs/utils/BUILD.bazel
load("@aspect_rules_ts//ts:defs.bzl", "ts_project")
load("@aspect_rules_js//js:defs.bzl", "js_library")
load("@npm//:defs.bzl", "npm_link_all_packages")

npm_link_all_packages(name = "node_modules")

ts_project(
    name = "utils_ts",
    srcs = glob(["src/**/*.ts"]),
    declaration = True,
    source_map = True,
    tsconfig = "//:tsconfig.json",
    deps = [
        ":node_modules/@types/node",
    ],
)

js_library(
    name = "utils",
    srcs = [":utils_ts"],
    visibility = ["//visibility:public"],
)

# Tests
load("@aspect_rules_jest//jest:defs.bzl", "jest_test")

jest_test(
    name = "utils_test",
    config = "//:jest.config.js",
    data = [
        ":utils",
        "//:node_modules/jest",
    ],
    node_modules = "//:node_modules",
)
```

### Template 4: Python Library BUILD

```python
# libs/ml/BUILD.bazel
load("@rules_python//python:defs.bzl", "py_library", "py_test", "py_binary")
load("@pip//:requirements.bzl", "requirement")

py_library(
    name = "ml",
    srcs = glob(["src/**/*.py"]),
    deps = [
        requirement("numpy"),
        requirement("pandas"),
        requirement("scikit-learn"),
        "//libs/utils:utils_py",
    ],
    visibility = ["//visibility:public"],
)

py_test(
    name = "ml_test",
    srcs = glob(["tests/**/*.py"]),
    deps = [
        ":ml",
        requirement("pytest"),
    ],
    size = "medium",
    timeout = "moderate",
)

py_binary(
    name = "train",
    srcs = ["train.py"],
    deps = [":ml"],
    data = ["//data:training_data"],
)
```

### Template 5: Custom Rule for Docker

```python
# tools/bazel/rules/docker.bzl
def _docker_image_impl(ctx):
    dockerfile = ctx.file.dockerfile
    base_image = ctx.attr.base_image
    layers = ctx.files.layers

    # Build the image
    output = ctx.actions.declare_file(ctx.attr.name + ".tar")

    args = ctx.actions.args()
    args.add("--dockerfile", dockerfile)
    args.add("--output", output)
    args.add("--base", base_image)
    args.add_all("--layer", layers)

    ctx.actions.run(
        inputs = [dockerfile] + layers,
        outputs = [output],
        executable = ctx.executable._builder,
        arguments = [args],
        mnemonic = "DockerBuild",
        progress_message = "Building Docker image %s" % ctx.label,
    )

    return [DefaultInfo(files = depset([output]))]

docker_image = rule(
    implementation = _docker_image_impl,
    attrs = {
        "dockerfile": attr.label(
            allow_single_file = [".dockerfile", "Dockerfile"],
            mandatory = True,
        ),
        "base_image": attr.string(mandatory = True),
        "layers": attr.label_list(allow_files = True),
        "_builder": attr.label(
            default = "//tools/docker:builder",
            executable = True,
            cfg = "exec",
        ),
    },
)
```

### Template 6: Query and Dependency Analysis

```bash
# Find all dependencies of a target
bazel query "deps(//apps/web:web)"

# Find reverse dependencies (what depends on this)
bazel query "rdeps(//..., //libs/utils:utils)"

# Find all targets in a package
bazel query "//libs/..."

# Find changed targets since commit
bazel query "rdeps(//..., set($(git diff --name-only HEAD~1 | sed 's/.*/"&"/' | tr '\n' ' ')))"

# Generate dependency graph
bazel query "deps(//apps/web:web)" --output=graph | dot -Tpng > deps.png

# Find all test targets
bazel query "kind('.*_test', //...)"

# Find targets with specific tag
bazel query "attr(tags, 'integration', //...)"

# Compute build graph size
bazel query "deps(//...)" --output=package | wc -l
```

### Template 7: Remote Execution Setup

```python
# platforms/BUILD.bazel
platform(
    name = "linux_x86_64",
    constraint_values = [
        "@platforms//os:linux",
        "@platforms//cpu:x86_64",
    ],
    exec_properties = {
        "container-image": "docker://gcr.io/myproject/bazel-worker:latest",
        "OSFamily": "Linux",
    },
)

platform(
    name = "remote_linux",
    parents = [":linux_x86_64"],
    exec_properties = {
        "Pool": "default",
        "dockerNetwork": "standard",
    },
)

# toolchains/BUILD.bazel
toolchain(
    name = "cc_toolchain_linux",
    exec_compatible_with = [
        "@platforms//os:linux",
        "@platforms//cpu:x86_64",
    ],
    target_compatible_with = [
        "@platforms//os:linux",
        "@platforms//cpu:x86_64",
    ],
    toolchain = "@remotejdk11_linux//:jdk",
    toolchain_type = "@bazel_tools//tools/jdk:runtime_toolchain_type",
)
```

## Performance Optimization

```bash
# Profile build
bazel build //... --profile=profile.json
bazel analyze-profile profile.json

# Identify slow actions
bazel build //... --execution_log_json_file=exec_log.json

# Memory profiling
bazel build //... --memory_profile=memory.json

# Skip analysis cache
bazel build //... --notrack_incremental_state
```

## Best Practices

### Do's
- **Use fine-grained targets** - Better caching
- **Pin dependencies** - Reproducible builds
- **Enable remote caching** - Share build artifacts
- **Use visibility wisely** - Enforce architecture
- **Write BUILD files per directory** - Standard convention

### Don'ts
- **Don't use glob for deps** - Explicit is better
- **Don't commit bazel-* dirs** - Add to .gitignore
- **Don't skip WORKSPACE setup** - Foundation of build
- **Don't ignore build warnings** - Technical debt

## Resources

- [Bazel Documentation](https://bazel.build/docs)
- [Bazel Remote Execution](https://bazel.build/docs/remote-execution)
- [rules_js](https://github.com/aspect-build/rules_js)

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.
