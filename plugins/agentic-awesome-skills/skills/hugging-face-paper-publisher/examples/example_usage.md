# Example Usage: HF Paper Publisher Skill

This document demonstrates common workflows for publishing research papers on Hugging Face Hub.

## Example 1: Index an Existing arXiv Paper

If you've already published a paper on arXiv and want to make it discoverable on Hugging Face:

```bash
# Check if paper exists
uv run scripts/paper_manager.py check --arxiv-id "2301.12345"

# Index the paper
uv run scripts/paper_manager.py index --arxiv-id "2301.12345"

# Get paper information
uv run scripts/paper_manager.py info --arxiv-id "2301.12345"
```

Expected output:
```json
{
  "exists": true,
  "url": "https://huggingface.co/papers/2301.12345",
  "arxiv_id": "2301.12345",
  "arxiv_url": "https://arxiv.org/abs/2301.12345"
}
```

## Example 2: Link Paper to Your Model

After indexing a paper, link it to your model repository:

```bash
# Link single paper
uv run scripts/paper_manager.py link \
  --repo-id "username/my-awesome-model" \
  --repo-type "model" \
  --arxiv-id "2301.12345"

# Link multiple papers
uv run scripts/paper_manager.py link \
  --repo-id "username/my-awesome-model" \
  --repo-type "model" \
  --arxiv-ids "2301.12345,2302.67890"
```

This will:
1. Download the model's README.md
2. Add or update YAML frontmatter
3. Insert paper references with links
4. Upload the updated README
5. Hub automatically creates `arxiv:2301.12345` tags

## Example 3: Link Paper to Dataset

Same process for datasets:

```bash
uv run scripts/paper_manager.py link \
  --repo-id "username/my-dataset" \
  --repo-type "dataset" \
  --arxiv-id "2301.12345" \
  --citation "$(cat citation.bib)"
```

## Example 4: Create a New Research Article

Generate a research paper from template:

```bash
# Create with standard template
uv run scripts/paper_manager.py create \
  --template "standard" \
  --title "Efficient Fine-Tuning of Large Language Models" \
  --authors "Jane Doe, John Smith" \
  --abstract "We propose a novel approach to fine-tuning..." \
  --output "paper.md"

# Create with modern template
uv run scripts/paper_manager.py create \
  --template "modern" \
  --title "Vision Transformers for Medical Imaging" \
  --output "medical_vit_paper.md"

# Create ML experiment report
uv run scripts/paper_manager.py create \
  --template "ml-report" \
  --title "BERT Fine-tuning Experiment Results" \
  --output "bert_experiment_report.md"
```

## Example 5: Generate Citations

Get formatted citations for papers:

```bash
# BibTeX format
uv run scripts/paper_manager.py citation \
  --arxiv-id "2301.12345" \
  --format "bibtex"
```

Output:
```bibtex
@article{arxiv2301_12345,
  title={Efficient Fine-Tuning of Large Language Models},
  author={Doe, Jane and Smith, John},
  journal={arXiv preprint arXiv:2301.12345},
  year={2023}
}
```

## Example 6: Complete Workflow - New Paper

Full workflow from paper creation to publication:

```bash
# Step 1: Create research article
uv run scripts/paper_manager.py create \
  --template "modern" \
  --title "Novel Architecture for Multimodal Learning" \
  --authors "Alice Chen, Bob Kumar" \
  --output "multimodal_paper.md"

# Step 2: Edit the paper (use your favorite editor)
# vim multimodal_paper.md

# Step 3: Submit to arXiv (external process)
# Upload to arxiv.org, receive arXiv ID: 2312.99999

# Step 4: Index on Hugging Face
uv run scripts/paper_manager.py index --arxiv-id "2312.99999"

# Step 5: Link to your models/datasets
uv run scripts/paper_manager.py link \
  --repo-id "alice/multimodal-model-v1" \
  --repo-type "model" \
  --arxiv-id "2312.99999"

uv run scripts/paper_manager.py link \
  --repo-id "alice/multimodal-dataset" \
  --repo-type "dataset" \
  --arxiv-id "2312.99999"

# Step 6: Generate citation for README
uv run scripts/paper_manager.py citation \
  --arxiv-id "2312.99999" \
  --format "bibtex" > citation.bib
```

## Example 7: Batch Link Papers

Link multiple papers to multiple repositories:

```bash
#!/bin/bash

# List of papers
PAPERS=("2301.12345" "2302.67890" "2303.11111")

# List of models
MODELS=("username/model-a" "username/model-b" "username/model-c")

# Link each paper to each model
for paper in "${PAPERS[@]}"; do
  for model in "${MODELS[@]}"; do
    echo "Linking $paper to $model..."
    uv run scripts/paper_manager.py link \
      --repo-id "$model" \
      --repo-type "model" \
      --arxiv-id "$paper"
  done
done
```

## Example 8: Update Model Card with Paper Info

Get paper info and manually update model card:

```bash
# Get paper information
uv run scripts/paper_manager.py info \
  --arxiv-id "2301.12345" \
  --format "text" > paper_info.txt

# View the information
cat paper_info.txt

# Manually incorporate into your model card or use the link command
```

## Example 9: Search and Discover Papers

```bash
# Search for papers (opens browser)
uv run scripts/paper_manager.py search \
  --query "transformer attention mechanism"
```

## Example 10: Working with tfrere's Template

This skill complements [tfrere's research article template](https://huggingface.co/spaces/tfrere/research-article-template):

```bash
# 1. Use tfrere's Space to create a beautiful web-based paper
# Visit: https://huggingface.co/spaces/tfrere/research-article-template

# 2. Export your paper content to markdown

# 3. Submit to arXiv

# 4. Use this skill to index and link
uv run scripts/paper_manager.py index --arxiv-id "YOUR_ARXIV_ID"
uv run scripts/paper_manager.py link \
  --repo-id "your-username/your-model" \
  --arxiv-id "YOUR_ARXIV_ID"
```

## Example 11: Error Handling

```bash
# Check if paper exists before linking
if uv run scripts/paper_manager.py check --arxiv-id "2301.12345" | grep -q '"exists": true'; then
  echo "Paper exists, proceeding with link..."
  uv run scripts/paper_manager.py link \
    --repo-id "username/model" \
    --arxiv-id "2301.12345"
else
  echo "Paper doesn't exist, indexing first..."
  uv run scripts/paper_manager.py index --arxiv-id "2301.12345"
  uv run scripts/paper_manager.py link \
    --repo-id "username/model" \
    --arxiv-id "2301.12345"
fi
```

## Example 12: CI/CD Integration

Add to your `.github/workflows/update-paper.yml`:

```yaml
name: Update Paper Links

on:
  push:
    branches: [main]
  workflow_dispatch:

jobs:
  update:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Set up uv
        uses: astral-sh/setup-uv@v5

      - name: Set up Python
        uses: actions/setup-python@v5
        with:
          python-version: '3.10'

      - name: Link paper to model
        env:
          HF_TOKEN: ${{ secrets.HF_TOKEN }}
        run: |
          uv run scripts/paper_manager.py link \
            --repo-id "${{ github.repository_owner }}/model-name" \
            --repo-type "model" \
            --arxiv-id "2301.12345"
```

## Tips and Best Practices

1. **Always check if paper exists** before indexing to avoid unnecessary operations
2. **Use meaningful commit messages** when linking papers to repositories
3. **Include full citations** in model cards for proper attribution
4. **Link papers to all relevant artifacts** (models, datasets, spaces)
5. **Generate BibTeX citations** for easy reference by others
6. **Keep paper visibility updated** in your HF profile settings
7. **Use templates consistently** within your research group
8. **Version control your papers** alongside code

## Troubleshooting

### Paper not found after indexing

```bash
# Visit the URL directly to trigger indexing
open "https://huggingface.co/papers/2301.12345"

# Wait a few seconds, then check again
uv run scripts/paper_manager.py check --arxiv-id "2301.12345"
```

### Permission denied when linking

```bash
# Verify your token has write access
echo $HF_TOKEN

# Set token if missing
export HF_TOKEN="your_token_here"

# Or use .env file
echo "HF_TOKEN=your_token_here" > .env
```

### arXiv ID format issues

```bash
# The script handles various formats:
uv run scripts/paper_manager.py check --arxiv-id "2301.12345"
uv run scripts/paper_manager.py check --arxiv-id "arxiv:2301.12345"
uv run scripts/paper_manager.py check --arxiv-id "https://arxiv.org/abs/2301.12345"

# All are equivalent and will be normalized
```

## Next Steps

- Explore the [Paper Pages documentation](https://huggingface.co/docs/hub/en/paper-pages)
- Check out [tfrere's research template](https://huggingface.co/spaces/tfrere/research-article-template)
- Browse [papers on HF](https://huggingface.co/papers)
- Learn about [model cards](https://huggingface.co/docs/hub/en/model-cards)
