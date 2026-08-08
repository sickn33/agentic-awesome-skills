# Linter Templates

Go linter patterns for mechanical architecture enforcement.

## Dependency Direction Linter

Validates that package imports respect the layer hierarchy.

```go
// scripts/lint-deps.go
//
// Validates that package dependencies follow the layer hierarchy.
// Each layer can only import from lower layers.
//
// Usage: go run scripts/lint-deps.go
package main

import (
	"fmt"
	"go/parser"
	"go/token"
	"os"
	"path/filepath"
	"strings"
)

// CUSTOMIZE: Set your module path
const modulePath = "your-module-path"

// CUSTOMIZE: Define your layer hierarchy (lower index = lower layer)
var layers = [][]string{
	// Layer 0: No internal dependencies
	{"core/types"},
	// Layer 1: Depends on Layer 0
	{"core/utils"},
	// Layer 2: Depends on Layers 0-1
	{"core/config", "core/logging"},
	// Layer 3: Depends on Layers 0-2
	{"core/business"},
	// Layer 4: Depends on core/ but NOT each other
	{"ui", "sdk", "integrations"},
	// Layer 5: Can depend on everything
	{"cmd"},
}

// CUSTOMIZE: Packages that must not import each other
var mutuallyExclusive = [][]string{
	{"ui", "sdk", "integrations"},
}

type Violation struct {
	File    string
	Package string
	Imports string
	Message string
}

func main() {
	violations := checkDependencies()

	if len(violations) == 0 {
		fmt.Println("✓ All package dependencies follow the layer hierarchy")
		os.Exit(0)
	}

	fmt.Printf("✗ Found %d dependency violations:\n\n", len(violations))
	for _, v := range violations {
		fmt.Printf("%s:\n  Package: %s\n  Imports: %s\n  Error: %s\n\n",
			v.File, v.Package, v.Imports, v.Message)
	}
	os.Exit(1)
}

func checkDependencies() []Violation {
	var violations []Violation
	layerMap := buildLayerMap()

	filepath.Walk(".", func(path string, info os.FileInfo, err error) error {
		if err != nil || info.IsDir() {
			if info != nil && info.IsDir() {
				name := info.Name()
				if strings.HasPrefix(name, ".") || name == "vendor" || name == "dist" {
					return filepath.SkipDir
				}
			}
			return nil
		}

		if !strings.HasSuffix(path, ".go") || strings.HasSuffix(path, "_test.go") {
			return nil
		}

		violations = append(violations, checkFile(path, layerMap)...)
		return nil
	})

	return violations
}

func buildLayerMap() map[string]int {
	m := make(map[string]int)
	for idx, pkgs := range layers {
		for _, pkg := range pkgs {
			m[pkg] = idx
		}
	}
	return m
}

func checkFile(path string, layerMap map[string]int) []Violation {
	var violations []Violation

	fset := token.NewFileSet()
	node, err := parser.ParseFile(fset, path, nil, parser.ImportsOnly)
	if err != nil {
		return violations
	}

	dir := filepath.ToSlash(filepath.Dir(path))
	dir = strings.TrimPrefix(dir, "./")
	pkgLayer := findLayer(dir, layerMap)
	if pkgLayer < 0 {
		return violations
	}

	for _, imp := range node.Imports {
		importPath := strings.Trim(imp.Path.Value, `"`)
		if !strings.HasPrefix(importPath, modulePath) {
			continue
		}

		relImport := strings.TrimPrefix(importPath, modulePath+"/")
		importLayer := findLayer(relImport, layerMap)
		if importLayer < 0 {
			continue
		}

		if importLayer >= pkgLayer {
			// Check if same base package (allowed)
			if getBase(dir) == getBase(relImport) {
				continue
			}
			violations = append(violations, Violation{
				File: path, Package: dir, Imports: relImport,
				Message: fmt.Sprintf("Layer %d cannot import layer %d", pkgLayer, importLayer),
			})
		}
	}

	return violations
}

func findLayer(pkg string, layerMap map[string]int) int {
	if layer, ok := layerMap[pkg]; ok {
		return layer
	}
	for key, layer := range layerMap {
		if strings.HasPrefix(pkg, key+"/") {
			return layer
		}
	}
	return -1
}

func getBase(pkg string) string {
	parts := strings.SplitN(pkg, "/", 3)
	if len(parts) >= 2 {
		return parts[0] + "/" + parts[1]
	}
	return parts[0]
}
```

## Quality Linter

Validates golden principles like structured logging, file sizes, and naming.

```go
// scripts/lint-quality.go
//
// Validates golden principles:
// - No raw log.Printf (use structured logging)
// - File size limits (max 1000 lines)
// - No hardcoded brand strings
//
// Usage: go run scripts/lint-quality.go
package main

import (
	"bufio"
	"fmt"
	"os"
	"path/filepath"
	"regexp"
	"strings"
)

const maxFileLines = 1000

// CUSTOMIZE: Patterns to flag
var rawLogPatterns = []*regexp.Regexp{
	regexp.MustCompile(`\blog\.Printf\b`),
	regexp.MustCompile(`\blog\.Println\b`),
	regexp.MustCompile(`\blog\.Fatalf\b`),
}

// CUSTOMIZE: Directories to skip
var skipDirs = map[string]bool{
	".git": true, "dist": true, "vendor": true,
}

type Violation struct {
	File    string
	Line    int
	Rule    string
	Message string
}

func main() {
	var violations []Violation

	walkGoFiles(func(path string, content []byte) {
		if strings.HasSuffix(path, "_test.go") {
			return
		}

		// Check structured logging
		lines := strings.Split(string(content), "\n")
		for lineNum, line := range lines {
			trimmed := strings.TrimSpace(line)
			if strings.HasPrefix(trimmed, "//") {
				continue
			}
			for _, pattern := range rawLogPatterns {
				if pattern.MatchString(line) {
					violations = append(violations, Violation{
						File: path, Line: lineNum + 1,
						Rule:    "structured-logging",
						Message: "Use structured logging instead of raw log calls",
					})
				}
			}
		}

		// Check file size
		scanner := bufio.NewScanner(strings.NewReader(string(content)))
		lineCount := 0
		for scanner.Scan() {
			lineCount++
		}
		if lineCount > maxFileLines {
			violations = append(violations, Violation{
				File: path, Rule: "file-size",
				Message: fmt.Sprintf("File has %d lines (max %d)", lineCount, maxFileLines),
			})
		}
	})

	if len(violations) == 0 {
		fmt.Println("✓ All quality checks passed")
		os.Exit(0)
	}

	fmt.Printf("✗ Found %d quality violations:\n\n", len(violations))
	for _, v := range violations {
		fmt.Printf("%s:%d [%s]: %s\n", v.File, v.Line, v.Rule, v.Message)
	}
	os.Exit(1)
}

func walkGoFiles(fn func(path string, content []byte)) {
	filepath.Walk(".", func(path string, info os.FileInfo, err error) error {
		if err != nil || info.IsDir() {
			if info != nil && info.IsDir() && skipDirs[filepath.Base(path)] {
				return filepath.SkipDir
			}
			return nil
		}
		if !strings.HasSuffix(path, ".go") {
			return nil
		}
		content, err := os.ReadFile(path)
		if err != nil {
			return nil
		}
		fn(path, content)
		return nil
	})
}
```

## Template Linter

Validates template files (.tpl) are valid and referenced.

```go
// scripts/lint-prompts.go
//
// Validates template files: parseable, referenced, no orphans.
//
// Usage: go run scripts/lint-prompts.go
package main

import (
	"fmt"
	"os"
	"path/filepath"
	"regexp"
	"strings"
	"text/template"
)

// CUSTOMIZE: Directories containing template files
var templateDirs = []string{"templates", "prompts"}

func main() {
	var violations int

	for _, dir := range templateDirs {
		filepath.Walk(dir, func(path string, info os.FileInfo, err error) error {
			if err != nil || info == nil || info.IsDir() || !strings.HasSuffix(path, ".tpl") {
				return nil
			}

			content, err := os.ReadFile(path)
			if err != nil {
				fmt.Printf("%s: cannot read: %v\n", path, err)
				violations++
				return nil
			}

			_, err = template.New(filepath.Base(path)).
				Option("missingkey=zero").
				Parse(string(content))
			if err != nil {
				fmt.Printf("%s: invalid template: %v\n", path, err)
				violations++
			}

			return nil
		})
	}

	// Check for orphan templates
	embedPattern := regexp.MustCompile(`//go:embed\s+(\S+\.tpl)`)
	tplFiles := make(map[string]bool)

	for _, dir := range templateDirs {
		filepath.Walk(dir, func(path string, info os.FileInfo, err error) error {
			if err != nil || info == nil {
				return nil
			}
			if !info.IsDir() && strings.HasSuffix(path, ".tpl") {
				tplFiles[filepath.Base(path)] = false
			}
			return nil
		})
	}

	filepath.Walk(".", func(path string, info os.FileInfo, err error) error {
		if err != nil || info.IsDir() || !strings.HasSuffix(path, ".go") {
			return nil
		}
		content, _ := os.ReadFile(path)
		for _, match := range embedPattern.FindAllSubmatch(content, -1) {
			tplFiles[string(match[1])] = true
		}
		return nil
	})

	for name, referenced := range tplFiles {
		if !referenced {
			fmt.Printf("WARNING: %s may be orphaned\n", name)
		}
	}

	if violations == 0 {
		fmt.Printf("✓ All template files are valid\n")
		os.Exit(0)
	}
	os.Exit(1)
}
```

## Makefile Integration

```makefile
# Architecture checks
.PHONY: lint-arch
lint-arch:
	@echo "Checking architecture constraints..."
	@go run scripts/lint-deps.go
	@go run scripts/lint-prompts.go
	@go run scripts/lint-quality.go
	@echo "✓ Architecture checks passed"

# Combined lint
.PHONY: lint
lint: lint-arch
	@if command -v golangci-lint >/dev/null 2>&1; then \
		golangci-lint run; \
	fi
```

## Adaptation Notes

### For TypeScript Projects

Read `references/adapters/typescript.md` before creating files. Prefer package-manager scripts and
Node-native harness linters over Go examples:

- Create `scripts/lint-deps.mjs` or an equivalent Node script for layer/import checks.
- Create `scripts/lint-quality.mjs` for project-specific quality checks.
- Add npm/pnpm/yarn/bun scripts such as `lint:deps`, `lint:quality`, `lint:arch`, and `lint:harness`.
- Keep CI strict: include existing `lint`, `typecheck`, `test`, and `build` gates when available.
- Do not weaken CI because baseline commands are red; report those as pre-existing project debt.

For small projects, ESLint import restrictions may be enough:
```js
// .eslintrc.js - import restrictions
module.exports = {
  rules: {
    'no-restricted-imports': ['error', {
      patterns: [
        { group: ['../ui/*'], message: 'Core cannot import UI' },
        { group: ['../cmd/*'], message: 'Core cannot import CLI' },
      ]
    }]
  }
};
```

### For Python Projects

Use custom pylint checkers or ruff rules:
```python
# scripts/lint_deps.py
import ast, sys, pathlib

LAYER_ORDER = {
    'models': 0,
    'utils': 1,
    'services': 2,
    'api': 3,
    'cli': 4,
}
# ... validate imports against layer order
```
