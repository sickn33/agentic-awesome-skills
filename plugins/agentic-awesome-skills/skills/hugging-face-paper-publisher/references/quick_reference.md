# Quick Reference Guide

## Essential Commands

### Paper Indexing
```bash
# Index from arXiv
uv run scripts/paper_manager.py index --arxiv-id "2301.12345"

# Check if exists
uv run scripts/paper_manager.py check --arxiv-id "2301.12345"
```

### Linking Papers
```bash
# Link to model
uv run scripts/paper_manager.py link \
  --repo-id "username/model" \
  --repo-type "model" \
  --arxiv-id "2301.12345"

# Link to dataset
uv run scripts/paper_manager.py link \
  --repo-id "username/dataset" \
  --repo-type "dataset" \
  --arxiv-id "2301.12345"

# Link multiple papers
uv run scripts/paper_manager.py link \
  --repo-id "username/model" \
  --repo-type "model" \
  --arxiv-ids "2301.12345,2302.67890"
```

### Creating Papers
```bash
# Standard template
uv run scripts/paper_manager.py create \
  --template "standard" \
  --title "Paper Title" \
  --output "paper.md"

# Modern template
uv run scripts/paper_manager.py create \
  --template "modern" \
  --title "Paper Title" \
  --authors "Author1, Author2" \
  --abstract "Abstract text" \
  --output "paper.md"

# ML Report
uv run scripts/paper_manager.py create \
  --template "ml-report" \
  --title "Experiment Report" \
  --output "report.md"

# arXiv style
uv run scripts/paper_manager.py create \
  --template "arxiv" \
  --title "Paper Title" \
  --output "paper.md"
```

### Citations
```bash
# Generate BibTeX
uv run scripts/paper_manager.py citation \
  --arxiv-id "2301.12345" \
  --format "bibtex"
```

### Paper Info
```bash
# JSON format
uv run scripts/paper_manager.py info \
  --arxiv-id "2301.12345" \
  --format "json"

# Text format
uv run scripts/paper_manager.py info \
  --arxiv-id "2301.12345" \
  --format "text"
```

## URL Formats

### Hugging Face Paper Pages
- View paper: `https://huggingface.co/papers/{arxiv-id}`
- Example: `https://huggingface.co/papers/2301.12345`

### arXiv
- Abstract: `https://arxiv.org/abs/{arxiv-id}`
- PDF: `https://arxiv.org/pdf/{arxiv-id}.pdf`
- Example: `https://arxiv.org/abs/2301.12345`

## YAML Metadata Format

### Model Card
```yaml
---
language:
  - en
license: apache-2.0
tags:
  - text-generation
  - transformers
library_name: transformers
---
```

### Dataset Card
```yaml
---
language:
  - en
license: cc-by-4.0
task_categories:
  - text-generation
size_categories:
  - 10K<n<100K
---
```

## arXiv ID Formats

All these formats work:
- `2301.12345`
- `arxiv:2301.12345`
- `https://arxiv.org/abs/2301.12345`
- `https://arxiv.org/pdf/2301.12345.pdf`

## Environment Setup

### Set Token
```bash
export HF_TOKEN="your_token"
```

### Or use .env file
```bash
echo "HF_TOKEN=your_token" > .env
```

## Common Workflows

### 1. Index & Link
```bash
uv run scripts/paper_manager.py index --arxiv-id "2301.12345"
uv run scripts/paper_manager.py link --repo-id "user/model" --arxiv-id "2301.12345"
```

### 2. Create & Publish
```bash
uv run scripts/paper_manager.py create --template "modern" --title "Title" --output "paper.md"
# Edit paper.md
# Submit to arXiv → get ID
uv run scripts/paper_manager.py index --arxiv-id "NEW_ID"
uv run scripts/paper_manager.py link --repo-id "user/model" --arxiv-id "NEW_ID"
```

### 3. Batch Link
```bash
for id in "2301.12345" "2302.67890"; do
  uv run scripts/paper_manager.py link --repo-id "user/model" --arxiv-id "$id"
done
```

## Troubleshooting

### Paper not found
Visit `https://huggingface.co/papers/{arxiv-id}` to trigger indexing

### Permission denied
Check `HF_TOKEN` is set and has write access

### arXiv API errors
Wait a moment and retry - arXiv has rate limits

## Tips

1. Always check paper exists before linking
2. Use templates for consistency
3. Include full citations in model cards
4. Link papers to all relevant artifacts
5. Keep citations up to date

## Templates Available

- `standard` - Traditional academic paper
- `modern` - Web-friendly format (Distill-style)
- `arxiv` - arXiv journal format
- `ml-report` - ML experiment documentation

## File Locations

- Scripts: `scripts/paper_manager.py`
- Templates: `templates/*.md`
- Examples: `examples/example_usage.md`
- This guide: `references/quick_reference.md`

## Getting Help

```bash
# Command help
uv run scripts/paper_manager.py --help

# Subcommand help
uv run scripts/paper_manager.py link --help
```

## Additional Resources

- [Full documentation](../SKILL.md)
- [Usage examples](../examples/example_usage.md)
- [HF Paper Pages](https://huggingface.co/papers)
- [tfrere's template](https://huggingface.co/spaces/tfrere/research-article-template)
