# Go/Rust 提示

Go：先找 `runtime.main` / `main.main`，用 pclntab 恢复。  
Rust：先收集 `src/` 路径字符串与 `Option`/`Result` 处理块。  
两者均：优先字符串驱动，避免在运行时库中迷路。