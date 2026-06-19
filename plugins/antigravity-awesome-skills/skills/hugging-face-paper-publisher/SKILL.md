---
source: "https://github.com/huggingface/skills/tree/main/skills/huggingface-paper-publisher"
name: hugging-face-paper-publisher
description: Publish and manage research papers on Hugging Face Hub. Supports creating paper pages, linking papers to models/datasets, claiming authorship, and generating professional markdown-based research articles.
risk: unknown
---

# Overview

## When to Use
Use this skill when a user wants to publish, link, index, or manage research papers on the Hugging Face Hub.
This skill provides comprehensive tools for AI engineers and researchers to publish, manage, and link research papers on the Hugging Face Hub. It streamlines the workflow from paper creation to publication, including integration with arXiv, model/dataset linking, and authorship management.

## Integration with HF Ecosystem
- **Paper Pages**: Index and discover papers on Hugging Face Hub
- **arXiv Integration**: Automatic paper indexing from arXiv IDs
- **Model/Dataset Linking**: Connect papers to relevant artifacts through metadata
- **Authorship Verification**: Claim and verify paper authorship
- **Research Article Template**: Generate professional, modern scientific papers

# Version
1.0.0

# Dependencies
The included script uses PEP 723 inline dependencies. Prefer `uv run` over
manual environment setup.

- huggingface_hub>=0.26.0
- pyyaml>=6.0.3
- requests>=2.32.5
- markdown>=3.5.0
- python-dotenv>=1.2.1

# Core Capabilities

## 1. Paper Page Management
- **Index Papers**: Add papers to Hugging Face from arXiv
- **Claim Authorship**: Verify and claim authorship on published papers
- **Manage Visibility**: Control which papers appear on your profile
- **Paper Discovery**: Find and explore papers in the HF ecosystem

## 2. Link Papers to Artifacts
- **Model Cards**: Add paper citations to model metadata
- **Dataset Cards**: Link papers to datasets via README
- **Automatic Tagging**: Hub auto-generates arxiv:<PAPER_ID> tags
- **Citation Management**: Maintain proper attribution and references

## 3. Research Article Creation
- **Markdown Templates**: Generate professional paper formatting
- **Modern Design**: Clean, readable research article layouts
- **Dynamic TOC**: Automatic table of contents generation
- **Section Structure**: Standard scientific paper organization
- **LaTeX Math**: Support for equations and technical notation

## 4. Metadata Management
- **YAML Frontmatter**: Proper model/dataset card metadata
- **Citation Tracking**: Maintain paper references across repositories
- **Version Control**: Track paper updates and revisions
- **Multi-Paper Support**: Link multiple papers to single artifacts

# Usage Instructions

The skill includes Python scripts in `scripts/` for paper publishing operations.

### Prerequisites
- Run scripts with `uv run` (dependencies are resolved from the script header)
- Set `HF_TOKEN` environment variable with Write-access token

> **All paths are relative to the directory containing this SKILL.md
file.**
> Before running any script, first `cd` to that directory or use the full
path.


### Method 1: Index Paper from arXiv

Add a paper to Hugging Face Paper Pages from arXiv.

**Basic Usage:**
```bash
uv run scripts/paper_manager.py index \
  --arxiv-id "2301.12345"
```

**Check If Paper Exists:**
```bash
uv run scripts/paper_manager.py check \
  --arxiv-id "2301.12345"
```

**Direct URL Access:**
You can also visit `https://huggingface.co/papers/{arxiv-id}` directly to index a paper.

### Method 2: Link Paper to Model/Dataset

Add paper references to model or dataset README with proper YAML metadata.

**Add to Model Card:**
```bash
uv run scripts/paper_manager.py link \
  --repo-id "username/model-name" \
  --repo-type "model" \
  --arxiv-id "2301.12345"
```

**Add to Dataset Card:**
```bash
uv run scripts/paper_manager.py link \
  --repo-id "username/dataset-name" \
  --repo-type "dataset" \
  --arxiv-id "2301.12345"
```

**Add Multiple Papers:**
```bash
uv run scripts/paper_manager.py link \
  --repo-id "username/model-name" \
  --repo-type "model" \
  --arxiv-ids "2301.12345,2302.67890,2303.11111"
```

**With Custom Citation:**
```bash
uv run scripts/paper_manager.py link \
  --repo-id "username/model-name" \
  --repo-type "model" \
  --arxiv-id "2301.12345" \
  --citation "$(cat citation.txt)"
```

#### How Linking Works

When you add an arXiv paper link to a model or dataset README:
1. The Hub extracts the arXiv ID from the link
2. A tag `arxiv:<PAPER_ID>` is automatically added to the repository
3. Users can click the tag to view the Paper Page
4. The Paper Page shows all models/datasets citing this paper
5. Papers are discoverable through filters and search

### Method 3: Claim Authorship

Verify your authorship on papers published on Hugging Face.

**Start Claim Process:**
```bash
uv run scripts/paper_manager.py claim \
  --arxiv-id "2301.12345" \
  --email "your.email@institution.edu"
```

**Manual Process:**
1. Navigate to your paper's page: `https://huggingface.co/papers/{arxiv-id}`
2. Find your name in the author list
3. Click your name and select "Claim authorship"
4. Wait for admin team verification

**Check Authorship Status:**
```bash
uv run scripts/paper_manager.py check-authorship \
  --arxiv-id "2301.12345"
```

### Method 4: Manage Paper Visibility

Control which verified papers appear on your public profile.

**List Your Papers:**
```bash
uv run scripts/paper_manager.py list-my-papers
```

**Toggle Visibility:**
```bash
uv run scripts/paper_manager.py toggle-visibility \
  --arxiv-id "2301.12345" \
  --show true
```

**Manage in Settings:**
Navigate to your account settings → Papers section to toggle "Show on profile" for each paper.

### Method 5: Create Research Article

Generate a professional markdown-based research paper using modern templates.

**Create from Template:**
```bash
uv run scripts/paper_manager.py create \
  --template "standard" \
  --title "Your Paper Title" \
  --output "paper.md"
```

**Available Templates:**
- `standard` - Traditional scientific paper structure
- `modern` - Clean, web-friendly format inspired by Distill
- `arxiv` - arXiv-style formatting
- `ml-report` - Machine learning experiment report

**Generate Complete Paper:**
```bash
uv run scripts/paper_manager.py create \
  --template "modern" \
  --title "Fine-Tuning Large Language Models with LoRA" \
  --authors "Jane Doe, John Smith" \
  --abstract "$(cat abstract.txt)" \
  --output "paper.md"
```

**Convert to HTML:**
```bash
uv run scripts/paper_manager.py convert \
  --input "paper.md" \
  --output "paper.html" \
  --style "modern"
```

### Paper Template Structure

**Standard Research Paper Sections:**
```markdown
---
title: Your Paper Title
authors: Jane Doe, John Smith
affiliations: University X, Lab Y
date: 2025-01-15
arxiv: 2301.12345
tags: [machine-learning, nlp, fine-tuning]
---

# Abstract
Brief summary of the paper...

# 1. Introduction
Background and motivation...

# 2. Related Work
Previous research and context...

# 3. Methodology
Approach and implementation...

# 4. Experiments
Setup, datasets, and procedures...

# 5. Results
Findings and analysis...

# 6. Discussion
Interpretation and implications...

# 7. Conclusion
Summary and future work...

# References
```

**Modern Template Features:**
- Dynamic table of contents
- Responsive design for web viewing
- Code syntax highlighting
- Interactive figures and charts
- Math equation rendering (LaTeX)
- Citation management
- Author affiliation linking

### Commands Reference

**Index Paper:**
```bash
uv run scripts/paper_manager.py index --arxiv-id "2301.12345"
```

**Link to Repository:**
```bash
uv run scripts/paper_manager.py link \
  --repo-id "username/repo-name" \
  --repo-type "model|dataset|space" \
  --arxiv-id "2301.12345" \
  [--citation "Full citation text"] \
  [--create-pr]
```

**Claim Authorship:**
```bash
uv run scripts/paper_manager.py claim \
  --arxiv-id "2301.12345" \
  --email "your.email@edu"
```

**Manage Visibility:**
```bash
uv run scripts/paper_manager.py toggle-visibility \
  --arxiv-id "2301.12345" \
  --show true|false
```

**Create Research Article:**
```bash
uv run scripts/paper_manager.py create \
  --template "standard|modern|arxiv|ml-report" \
  --title "Paper Title" \
  [--authors "Author1, Author2"] \
  [--abstract "Abstract text"] \
  [--output "filename.md"]
```

**Convert Markdown to HTML:**
```bash
uv run scripts/paper_manager.py convert \
  --input "paper.md" \
  --output "paper.html" \
  [--style "modern|classic"]
```

**Check Paper Status:**
```bash
uv run scripts/paper_manager.py check --arxiv-id "2301.12345"
```

**List Your Papers:**
```bash
uv run scripts/paper_manager.py list-my-papers
```

**Search Papers:**
```bash
uv run scripts/paper_manager.py search --query "transformer attention"
```

### YAML Metadata Format

When linking papers to models or datasets, proper YAML frontmatter is required:

**Model Card Example:**
```yaml
---
language:
  - en
license: apache-2.0
tags:
  - text-generation
  - transformers
  - llm
library_name: transformers
---

# Model Name

This model is based on the approach described in [Our Paper](https://arxiv.org/abs/2301.12345).

## Citation

```bibtex
@article{doe2023paper,
  title={Your Paper Title},
  author={Doe, Jane and Smith, John},
  journal={arXiv preprint arXiv:2301.12345},
  year={2023}
}
```
```

**Dataset Card Example:**
```yaml
---
language:
  - en
license: cc-by-4.0
task_categories:
  - text-generation
  - question-answering
size_categories:
  - 10K<n<100K
---

# Dataset Name

Dataset introduced in [Our Paper](https://arxiv.org/abs/2301.12345).

For more details, see the [paper page](https://huggingface.co/papers/2301.12345).
```

The Hub automatically extracts arXiv IDs from these links and creates `arxiv:2301.12345` tags.

### Integration Examples

**Workflow 1: Publish New Research**
```bash
# 1. Create research article
uv run scripts/paper_manager.py create \
  --template "modern" \
  --title "Novel Fine-Tuning Approach" \
  --output "paper.md"

# 2. Edit paper.md with your content

# 3. Submit to arXiv (external process)
# Upload to arxiv.org, get arXiv ID

# 4. Index on Hugging Face
uv run scripts/paper_manager.py index --arxiv-id "2301.12345"

# 5. Link to your model
uv run scripts/paper_manager.py link \
  --repo-id "your-username/your-model" \
  --repo-type "model" \
  --arxiv-id "2301.12345"

# 6. Claim authorship
uv run scripts/paper_manager.py claim \
  --arxiv-id "2301.12345" \
  --email "your.email@edu"
```

**Workflow 2: Link Existing Paper**
```bash
# 1. Check if paper exists
uv run scripts/paper_manager.py check --arxiv-id "2301.12345"

# 2. Index if needed
uv run scripts/paper_manager.py index --arxiv-id "2301.12345"

# 3. Link to multiple repositories
uv run scripts/paper_manager.py link \
  --repo-id "username/model-v1" \
  --repo-type "model" \
  --arxiv-id "2301.12345"

uv run scripts/paper_manager.py link \
  --repo-id "username/training-data" \
  --repo-type "dataset" \
  --arxiv-id "2301.12345"

uv run scripts/paper_manager.py link \
  --repo-id "username/demo-space" \
  --repo-type "space" \
  --arxiv-id "2301.12345"
```

**Workflow 3: Update Model with Paper Reference**
```bash
# 1. Get current README
hf download username/model-name README.md

# 2. Add paper link
uv run scripts/paper_manager.py link \
  --repo-id "username/model-name" \
  --repo-type "model" \
  --arxiv-id "2301.12345" \
  --citation "Full citation for the paper"

# The script will:
# - Add YAML metadata if missing
# - Insert arXiv link in README
# - Add formatted citation
# - Preserve existing content
```

### Best Practices

1. **Paper Indexing**
   - Index papers as soon as they're published on arXiv
   - Include full citation information in model/dataset cards
   - Use consistent paper references across related repositories

2. **Metadata Management**
   - Add YAML frontmatter to all model/dataset cards
   - Include proper licensing information
   - Tag with relevant task categories and domains

3. **Authorship**
   - Claim authorship on papers where you're listed as author
   - Use institutional email addresses for verification
   - Keep paper visibility settings updated

4. **Repository Linking**
   - Link papers to all relevant models, datasets, and Spaces
   - Include paper context in README descriptions
   - Add BibTeX citations for easy reference

5. **Research Articles**
   - Use templates consistently within projects
   - Include code and data links in papers
   - Generate web-friendly HTML versions for sharing

### Advanced Usage

**Batch Link Papers:**
```bash
# Link multiple papers to one repository
for arxiv_id in "2301.12345" "2302.67890" "2303.11111"; do
  uv run scripts/paper_manager.py link \
    --repo-id "username/model-name" \
    --repo-type "model" \
    --arxiv-id "$arxiv_id"
done
```

**Extract Paper Info:**
```bash
# Get paper metadata from arXiv
uv run scripts/paper_manager.py info \
  --arxiv-id "2301.12345" \
  --format "json"
```

**Generate Citation:**
```bash
# Create BibTeX citation
uv run scripts/paper_manager.py citation \
  --arxiv-id "2301.12345" \
  --format "bibtex"
```

**Validate Links:**
```bash
# Check all paper links in a repository
uv run scripts/paper_manager.py validate \
  --repo-id "username/model-name" \
  --repo-type "model"
```

### Error Handling

- **Paper Not Found**: arXiv ID doesn't exist or isn't indexed yet
- **Permission Denied**: HF_TOKEN lacks write access to repository
- **Invalid YAML**: Malformed metadata in README frontmatter
- **Authorship Failed**: Email doesn't match paper author records
- **Already Claimed**: Another user has claimed authorship
- **Rate Limiting**: Too many API requests in short time

### Troubleshooting

**Issue**: "Paper not found on Hugging Face"
- **Solution**: Visit `hf.co/papers/{arxiv-id}` to trigger indexing

**Issue**: "Authorship claim not verified"
- **Solution**: Wait for admin review or contact HF support with proof

**Issue**: "arXiv tag not appearing"
- **Solution**: Ensure README includes proper arXiv URL format

**Issue**: "Cannot link to repository"
- **Solution**: Verify HF_TOKEN has write permissions

**Issue**: "Template rendering errors"
- **Solution**: Check markdown syntax and YAML frontmatter format

### Resources and References

- **Hugging Face Paper Pages**: [hf.co/papers](https://huggingface.co/papers)
- **Model Cards Guide**: [hf.co/docs/hub/model-cards](https://huggingface.co/docs/hub/en/model-cards)
- **Dataset Cards Guide**: [hf.co/docs/hub/datasets-cards](https://huggingface.co/docs/hub/en/datasets-cards)
- **Research Article Template**: [tfrere/research-article-template](https://huggingface.co/spaces/tfrere/research-article-template)
- **arXiv Format Guide**: [arxiv.org/help/submit](https://arxiv.org/help/submit)

### Integration with tfrere's Research Template

This skill complements [tfrere's research article template](https://huggingface.co/spaces/tfrere/research-article-template) by providing:

- Automated paper indexing workflows
- Repository linking capabilities
- Metadata management tools
- Citation generation utilities

You can use tfrere's template for writing, then use this skill to publish and link the paper on Hugging Face Hub.

### Common Patterns

**Pattern 1: New Paper Publication**
```bash
# Write → Publish → Index → Link
uv run scripts/paper_manager.py create --template modern --output paper.md
# (Submit to arXiv)
uv run scripts/paper_manager.py index --arxiv-id "2301.12345"
uv run scripts/paper_manager.py link --repo-id "user/model" --arxiv-id "2301.12345"
```

**Pattern 2: Existing Paper Discovery**
```bash
# Search → Check → Link
uv run scripts/paper_manager.py search --query "transformers"
uv run scripts/paper_manager.py check --arxiv-id "2301.12345"
uv run scripts/paper_manager.py link --repo-id "user/model" --arxiv-id "2301.12345"
```

**Pattern 3: Author Portfolio Management**
```bash
# Claim → Verify → Organize
uv run scripts/paper_manager.py claim --arxiv-id "2301.12345"
uv run scripts/paper_manager.py list-my-papers
uv run scripts/paper_manager.py toggle-visibility --arxiv-id "2301.12345" --show true
```

### API Integration

**Python Script Example:**
```python
from scripts.paper_manager import PaperManager

pm = PaperManager(hf_token="your_token")

# Index paper
pm.index_paper("2301.12345")

# Link to model
pm.link_paper(
    repo_id="username/model",
    repo_type="model",
    arxiv_id="2301.12345",
    citation="Full citation text"
)

# Check status
status = pm.check_paper("2301.12345")
print(status)
```

### Future Enhancements

Planned features for future versions:
- Support for non-arXiv papers (conference proceedings, journals)
- Automatic citation formatting from DOI
- Paper comparison and versioning tools
- Collaborative paper writing features
- Integration with LaTeX workflows
- Automated figure and table extraction
- Paper metrics and impact tracking

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.
