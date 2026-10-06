# Clustering and embedding

Partition a cell graph with Leiden or Paris, choose a partition with evidence, build UMAP or t-SNE
layouts, and extract labels and coordinates as cell-aligned arrays. Docs:
<https://scarf.readthedocs.io/en/latest/tutorials/clustering.html>, <https://scarf.readthedocs.io/en/latest/tutorials/dimensionality_reduction.html>,
<https://scarf.readthedocs.io/en/latest/reference/api/datastore.html>, <https://scarf.readthedocs.io/en/latest/reference/api/integration.html>.

## When to use

- A completed run or an explicit graph exists, and you need other resolutions, a hierarchy or a
  new layout on that same graph.
- You must justify a partition (resolution, seed, representation) before naming clusters.
- You need cluster labels or layout coordinates as a NumPy array or a DataFrame indexed by cell ID.

## Key concepts

- Every producer takes an exact graph `ArtifactRef` (`run["connectivity_map"]` or an integrated
  graph) and returns a new immutable `ArtifactRef`. None of them writes to `ds.cells`. Repeating a
  call reuses the stored artifact; `invalidate_cache=True` creates another one.
- Payloads: Leiden `kind="cluster_labels"` stores `values` (int, numbered from 1); Paris
  `kind="cluster_cut"` stores `labels`; UMAP and t-SNE `kind="embedding"` store `values` with shape
  `(n_cells, dims)`.
- Payload rows follow the graph's frozen cell selection in stored-axis order, not every cell in
  the store (3,847 of 5,025 cells in the 10x 5K PBMC docs dataset baseline). Recover that
  selection with `ds.inspect_artifact(ref).input_ref("cell_selection")`.
- The default pipeline stores `leiden_0.5`, `leiden_0.75`, `leiden_1.0`, `leiden_1.25` and `paris`.
  `run["clusters"]` is the Leiden candidate with the best PCA silhouette, recorded in
  `run["cluster_selection"]`. Silhouette favours few compact clusters and can merge distinct
  lineages or states. Treat that pick as a reproducible baseline only.
- Leiden is seeded (`random_seed=4444`), so a single run says nothing about stability. Agreement
  across seeds, nested resolutions, markers and representations is the evidence.
- Leiden, Paris, layouts, membership strength and separability use only the graph or PCA and take
  seconds. Marker search is the only step on this page that reads counts.

## Recipes

### Open the graph and baseline refs

```python
import numpy as np
import pandas as pd
import scarf

scarf.configure_output(level="WARNING", progress=False)
ds = scarf.DataStore("analysis.zarr", nthreads=4, min_features_per_cell=-1)  # writable
run = ds.pipeline.open(label="baseline")
graph = run["connectivity_map"]
print([key for key in run if key.startswith(("leiden", "paris", "cluster"))])

def labels_of(ref):
    """Return a cluster payload as an array aligned to the ref's cell selection."""
    key = "labels" if ref.kind == "cluster_cut" else "values"
    return np.asarray(ds.load_artifact(ref)[key][:])
```

### Build the partition evidence table

One row per candidate: stability over seeds, nesting in the next coarser candidate, separability,
graph support and marker support. Each marker search streams counts once.

```python
from itertools import combinations
from sklearn.metrics import adjusted_rand_score

leiden, values, rows = {}, {}, []
for resolution in (0.5, 1.0, 1.5):
    refs = [ds.run_leiden_clustering(graph, resolution=resolution, random_seed=seed)
            for seed in (4444, 1, 2)]
    name = f"leiden_{resolution}"
    leiden[name], values[name] = refs[0], labels_of(refs[0])  # seed 4444 = the pipeline's
    seeds = [labels_of(ref) for ref in refs]
    rows.append({"candidate": name, "n_clusters": len(np.unique(seeds[0])),
                 "smallest": pd.Series(seeds[0]).value_counts().min(),
                 "min_seed_ari": min(adjusted_rand_score(a, b) for a, b in combinations(seeds, 2))})
evidence = pd.DataFrame(rows).set_index("candidate")
names = list(leiden)
evidence["nested_frac"] = [np.nan] + [  # share of cells inside one cluster of the coarser one
    pd.crosstab(values[fine], values[coarse]).max(axis=1).sum() / len(values[fine])
    for coarse, fine in zip(names, names[1:])]
sep = ds.metric_cluster_separability(run["pca"], leiden)  # coordinates the graph was built on
evidence = evidence.join(sep.clustering_scores.set_index("clustering")[
    ["macro_f1_mean", "silhouette_score"]])
for name, ref in leiden.items():
    strength = np.asarray(ds.load_artifact(ds.calc_membership_strength(ref, graph))["values"][:])
    evidence.loc[name, "weak_cells"] = (strength < 0.5).mean()
    per_cluster_strength = pd.Series(strength).groupby(values[name]).mean()
    evidence.loc[name, "min_cluster_strength"] = per_cluster_strength.min()
    found = ds.get_markers(marker=ds.run_marker_search(ref, features=run["feature_universe"]))
    n_markers = found["group_id"].value_counts().reindex(
        [str(g) for g in np.unique(values[name])], fill_value=0)
    evidence.loc[name, "clusters_lt3_markers"] = int((n_markers < 3).sum())
print(evidence.round(3).to_string())
print(sep.cluster_scores.sort_values("f1_score").head(5))  # weakest individual clusters
nesting = ds.smart_label(leiden["leiden_1.0"], leiden["leiden_0.5"])  # "2a", "2b": splits of 2
print(pd.Series(labels_of(nesting)).value_counts().head(10))
selection = ds.load_artifact(run["cluster_selection"])  # the pipeline's silhouette choice
print(dict(zip(selection.attrs["candidateKeys"], np.asarray(selection["scores"][:]).round(3))))
print("selected:", selection.attrs["selectedKey"], "invalid:", selection.attrs["invalidReasons"])
```

Membership strength is the fraction of a cell's graph neighbours sharing its most common label.
Pass the Harmony ref instead of `run["pca"]` when the graph was built on Harmony coordinates.

### QC and doublet covariates per cluster

```python
in_run = run.cells.fetch_all("I").astype(bool)
per_cell = pd.DataFrame({c: ds.cells.fetch_all(c)[in_run]
                         for c in ("RNA_nCounts", "RNA_nFeatures", "RNA_percentMito")})
per_cell["doublet_score"] = run.cells.fetch("doublet_score")
per_cluster = per_cell.groupby(values["leiden_1.0"]).median()
print(per_cluster.round(2), per_cell.median().round(2), sep="\n")  # each cluster vs all cells
```

A cluster that stands out only on counts, mito or doublet score is technical until markers say
otherwise. Doublet scores run high in high-RNA types (plasma cells), so compare within a lineage.

### Representation sensitivity

Repeat the evidence on one branch (more HVGs, other PCs or `k`; `features-and-graphs.md`). The
cells must match, so labels compare directly.

```python
alt = ds.pipeline.run(label="hvg2k_pc30_k21", hvg_count=2000, pca_dims=30, neighbors_k=21)
assert alt["analysis_cell_selection"] == run["analysis_cell_selection"]
alt_refs = [ds.run_leiden_clustering(alt["connectivity_map"], resolution=resolution)
            for resolution in (0.5, 1.0, 1.5)]
for name, ref in leiden.items():  # best match over branch resolutions; k shifts the scale
    evidence.loc[name, "ari_vs_branch"] = max(ds.metric_label_concordance(ref, other)
                                              for other in alt_refs)
print(evidence.round(3).to_string())
```

### Choose the partition

`run["clusters"]` (the silhouette pick) is a baseline candidate, never the answer by itself.
Combine the evidence; no single score decides.

1. Stability: keep candidates whose `min_seed_ari` stays near the coarsest one (about 0.9 or
   more is a rule of thumb). Below that, the optimizer moves boundaries between seeds.
2. Nesting: prefer a candidate that refines the coarser one (`nested_frac` near 1, `smart_label`
   shows "2a", "2b"). A non-nested jump, where many cells change parent, is a reason to reject it.
3. Markers: every cluster a finer candidate adds needs its own specific markers (about 3 or more
   at default `get_markers` filters, named genes, not only ribosomal, mitochondrial or ambient).
4. Graph support: added clusters keep high mean membership strength and few weak cells.
5. QC and doublets: a split explained by counts, mito or doublet score is not a cell type. Keep it
   as `unresolved` (`markers-and-annotation.md`) instead of naming it.
6. Representation: boundaries that survive an HVG, PC or `k` branch are robust; those that move
   are provisional and need markers to stand.

Choose the finest candidate whose added splits all pass 1 to 5, and report 6. If the silhouette
pick merges populations that markers separate, a finer candidate that passes wins. Prefer a coarser
global partition plus targeted subclustering (`features-and-graphs.md`, "Subcluster one lineage")
when the lineage split is stable at a low resolution but finer global resolutions lose seed
stability, break nesting, or split only one lineage. The usual case is T and NK subsets in blood:
global HVGs are dominated by between-lineage genes, so a within-lineage graph resolves states
(naive, memory, regulatory, cytotoxic) that a finer global cut either misses or splits unstably.

(10x 5K PBMC docs dataset) Minimum seed ARI was 0.97, 0.82 and 0.60 at 0.5, 1.0 and 1.5; at 1.0,
four clusters had fewer than 3 markers; ARI with the branch fell from 0.86 to 0.61. The evidence
kept 0.5. A T-cell subgraph then gave a FOXP3/CTLA4 group (FOXP3 in 0.43 of cells); no global
cluster up to resolution 2.0 exceeded 0.22.

### Build a Paris hierarchy

```python
from dataclasses import asdict

paris = ds.run_paris_clustering(graph)  # n_clusters="auto"; reuses run["paris"] when identical
result = ds.load_paris_clustering(paris)
diag = pd.DataFrame([asdict(item) for item in result.diagnostics])
print(result.n_clusters, diag[["label", "size", "persistence", "decision_margin", "forced"]])
paris_8 = ds.run_paris_clustering(graph, n_clusters=8)
print(ds.metric_label_concordance(paris, leiden["leiden_0.5"]))
```

High `persistence` means a branch survives over a wide range of the hierarchy. `forced=True` groups
satisfy a structural constraint and are not, by themselves, biological evidence.

### Build UMAP and t-SNE layouts

```python
init = run["embedding_initialization"]  # K-means initialization built on run["pca"]
umap_tight = ds.run_umap(graph, init, min_dist=0.5)
tsne = ds.run_tsne(graph, init, verbose=False)
# For new coordinates, build a matching init first:
# init = ds.build_embedding_initialization(new_pca_ref)
print(ds.load_artifact(umap_tight)["values"].shape, ds.load_artifact(tsne)["values"].shape)
```

### Get labels and coordinates from a pipeline run

```python
cells = run.cells.to_pandas_dataframe(
    ["ids", "clusters", "leiden_1.0", "paris", "umap_1", "umap_2", "doublet_score"])
print(cells.head())  # one row per run cell, in stored-axis order
full = run.cells.fetch_all("clusters")  # length ds.cells.N; -1 for cells outside the run
print(len(full), (full == -1).sum())
```

`run.cells.columns` lists the frozen fields. `fetch(...)` returns run cells only. `fetch_all(...)`
fills cells outside the run with -1 (integers), NaN (floats) or "" (strings).

### Get labels and coordinates from explicit artifacts

```python
def cell_ids_of(ref):
    selection = ds.inspect_artifact(ref).input_ref("cell_selection")
    mask = np.asarray(ds.load_artifact(selection)["values"][:], dtype=bool)
    return ds.cells.fetch_all("ids")[mask]

ids = cell_ids_of(umap_tight)
assert np.array_equal(ids, cell_ids_of(leiden["leiden_1.5"]))  # same frozen selection
xy = np.asarray(ds.load_artifact(umap_tight)["values"][:])
frame = pd.DataFrame({"leiden_1.5": labels_of(leiden["leiden_1.5"]),
                      "x": xy[:, 0], "y": xy[:, 1]},
                     index=pd.Index(ids, name="cell_id"))
print(frame.head())
```

The same helper works for membership strength, doublet scores, cell cycle and enrichment scores.

## Parameters that matter

| Parameter | Default | Change when |
|---|---|---|
| `resolution` (Leiden) | `1.0` (pipeline: 0.5, 0.75, 1.0, 1.25) | Raise for finer splits, lower to merge; always compare several |
| `random_seed` (Leiden) | `4444` | Rerun with 2 or more other seeds to test stability |
| `backend` (Leiden) | `"igraph"` | `"leidenalg"` only to match an external result |
| `n_clusters` (Paris) | `"auto"` | An integer to match another partition; it must be cuttable at one height, else `ValueError` |
| `min_cluster_size` (Paris) | `None` (resolved automatically) | Raise to suppress tiny branches in the auto cut |
| `min_dist` / `spread` (UMAP) | `1.0` / `2.0` | Lower `min_dist` (0.1 to 0.5) for tighter packing; appearance only |
| `use_density_map` (UMAP) | `False` | `True` for densMAP when relative density matters |
| `parallel` (UMAP, t-SNE) | `False` | `True` is faster but not reproducible |

## Check before moving on

- The evidence table exists for at least three candidates, and the chosen one is justified by
  the six criteria above, not by silhouette alone. Record why coarser and finer were rejected.
- Every cluster under about 20 cells, or with mean membership strength well below the rest, has
  been reviewed: doublet group, transition, contaminant or over-split.
- No cluster is named whose only distinction is a QC metric or doublet score.
- Lineages that need finer structure are listed for targeted subclustering, with the parent
  partition kept for audit.

## Pitfalls

- Paris stores `labels`, not `values`. `ds.load_artifact(paris)["values"]` raises `KeyError`.
- Payload length is the selection size, not `ds.cells.N`. Align through the cell selection before
  inserting into `ds.cells` or joining with other metadata.
- Cluster IDs are arbitrary per artifact. Never carry annotations from one partition to another by
  ID; join on cell IDs or use `smart_label`.
- `metric_label_concordance` requires both artifacts to share the exact cell-selection ref. For
  labels from different selections or from metadata, use sklearn on aligned arrays.
- Comparing branches at the same resolution only: `k` and HVG count shift the resolution scale.
- UMAP and t-SNE distances, empty space and island size are not biological measurements. Never
  choose a resolution from a layout alone.
- A read-only store (`zarr_mode="r"`) raises `PermissionError` unless an identical artifact exists.
- `run_tsne` uses an `sgtsne` executable on `PATH` when present, otherwise the `sgtsnepi` Python
  package. The docs state that t-SNE is unsupported on macOS and Windows.

## See also

- `features-and-graphs.md`: building graphs, HVG and `k` branches, subclustering one lineage.
- `markers-and-annotation.md`: marker tables and labels for the chosen partition.
- `quality-control.md`: doublet scores and QC covariates behind technical clusters.
- `plotting.md`: `ds.plots.embedding(layout=umap_ref, color_by=cluster_ref)`,
  `cluster_connectivity(graph=, groups=, layout=)` and `cluster_tree(graph=, clusters=paris_ref)`.
- `pipeline-runs-and-artifacts.md`: run keys, `leiden=` pipeline settings, lineage.
- `integration-and-comparisons.md`: clustering on integrated graphs and batch metrics.
