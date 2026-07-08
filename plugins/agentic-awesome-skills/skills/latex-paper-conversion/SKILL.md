---
name: latex-paper-conversion
description: "This skill should be used when the user asks to convert an academic paper in LaTeX from one format (e.g., Springer, IPOL) to another format (e.g., MDPI, IEEE, Nature). It automates extraction, injection, fixing formatting, and compiling."
risk: safe
source: community
date_added: "2026-03-14"
---

# LaTeX Paper Conversion

## Overview

This skill automates the tedious and recurring process of converting an academic paper written in LaTeX from one publisher's template to another. Different journals (e.g., Springer, MDPI, IEEE) have vastly different structural requirements, document classes, margin settings, and bibliography styles. This skill streamlines these conversions by executing a structured multi-stage workflow, extracting content, mapping it to a new template, and resolving common compilation errors.

## When to Use This Skill

- Use when the user requests to port an existing LaTeX paper to a new journal's format.
- Use when the user provides an existing `.tex` file and a new template directory.
- Use when the user mentions converting from format A (e.g., IPOL/Neural Processing) to format B (e.g., MDPI).

## How It Works

### Step 1: Pre-requisites & Assessment
Identify the **Source LaTeX file** and asking the user for the **Target Template Directory**. Understand the core layout mapping (single-column vs. double-column, bibliography style).

### Step 2: Extraction & Injection Script Generation
Create a Python script (e.g., `convert_format.py`) to parse the source LaTeX file. Use Regular Expressions to extract core text blocks. Merge the new template's `preamble`, the extracted `body`, and the `backmatter`. Write this to a new file in an output directory.

### Step 3: Systematic Fixing
Perform generic fixes on the extracted body text before writing the final file, or in subsequent calls:
- Convert math environment cases (e.g., `\begin{theorem}` to `\begin{Theorem}`).
- Adjust aggressive float placements (e.g., `[!t]` or `[h!]`) to template-supported options. Avoid forcing `[H]` unless the `float` package is explicitly loaded.
- Ensure `\includegraphics` paths are relative to the new `.tex` file location.
- Convert `\begin{tabular}` to `\begin{tabularx}{\textwidth}` or use `\resizebox` if moving to a double-column layout.

### Step 4: Compilation & Debugging
Run a build cycle (`pdflatex` -> `bibtex` -> `pdflatex`). Check the `.log` file using `grep` or `rg` to systematically fix any packages conflicts, undefined commands, or compilation halts.

## Examples

### Example 1: Converting IPOL to MDPI
\```
USER: "I need to convert my paper 'SAHQR_Paper.tex' to the MDPI format located in the 'MDPI_template_ACS' folder."
AGENT: *Triggers latex-paper-conversion skill*
1. Analyzes source `.tex` and target `template.tex`.
2. Creates Python script to extract Introduction through Conclusion.
3. Injects content into MDPI template.
4. Updates image paths and table float parameters `[h!]` to `[H]`.
5. Compiles via pdflatex and bibtex to confirm zero errors.
\```

## Best Practices

- ✅ Always write a Python extraction script; DO NOT manually copy-paste thousands of lines of LaTeX.
- ✅ Always run `pdflatex` and verify the `.log` to ensure the final output compiles.
- ✅ Explicitly ask the user for the structural mapping if the source and target differ drastically (e.g., merging abstract and keywords).
- ❌ Don't assume all math packages automatically exist in the new template (e.g., add `\usepackage{amsmath}` if missing).

## Common Pitfalls

- **Problem:** Overfull hboxes in tables when moving from single to double column.
  **Solution:** Detect `\begin{tabular}` and automatically wrap in `\resizebox{\columnwidth}{!}{...}` or suggest a format change.
- **Problem:** Undefined control sequence errors during compilation.
  **Solution:** Search the `Paper.log` and include the missing `\usepackage{}` in the converted template.

## Additional Resources

- [Overleaf LaTeX Documentation](https://www.overleaf.com/learn)

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.
