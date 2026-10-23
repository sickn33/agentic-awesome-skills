---
name: scikit-learn
description: Machine learning in Python with scikit-learn. Use for classification, regression, clustering, model evaluation, and ML pipelines.
license: BSD-3-Clause license
metadata:
    skill-author: K-Dense Inc.
risk: critical
source: community
date_added: "2026-03-06"
---

# Scikit-learn

## Detailed Guide

Read [the detailed guide](references/detailed-guide.md) before executing this skill. It retains the complete procedure and reference material. Treat its safety, prerequisites, and validation requirements as mandatory. For focused work, load the relevant sections; for end-to-end work, read the guide completely.

## When to Use This Skill

Use the scikit-learn skill when:

- Building classification or regression models
- Performing clustering or dimensionality reduction
- Preprocessing and transforming data for machine learning
- Evaluating model performance with cross-validation
- Tuning hyperparameters with grid or random search
- Creating ML pipelines for production workflows
- Comparing different algorithms for a task
- Working with both structured (tabular) and text data
- Need interpretable, classical machine learning approaches

## Example Workflows

The named classification/clustering scripts and expanded per-topic reference files are not bundled in this catalog tree. Do not run those paths or claim their results. Use the inline examples in the detailed guide, or request/review the actual upstream assets before depending on them. Example snippets assume user-provided feature/target data and are not production certifications.

### Classification Pipeline

Run a complete classification workflow with preprocessing, model comparison, hyperparameter tuning, and evaluation:

```bash
# Not bundled: obtain and review classification_pipeline.py before execution.
```

This script demonstrates:
- Handling mixed data types (numeric and categorical)
- Model comparison using cross-validation
- Hyperparameter tuning with GridSearchCV
- Comprehensive evaluation with multiple metrics
- Feature importance analysis

### Clustering Analysis

Perform clustering analysis with algorithm comparison and visualization:

```bash
# Not bundled: obtain and review clustering_analysis.py before execution.
```

This script demonstrates:
- Finding optimal number of clusters (elbow method, silhouette analysis)
- Comparing multiple clustering algorithms (K-Means, DBSCAN, Agglomerative, Gaussian Mixture)
- Evaluating clustering quality without ground truth
- Visualizing results with PCA projection

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.
