# Features and graphs

Select features, normalize, reduce with PCA and build the neighbourhood graph as an explicit
chain of artifacts, then branch or subcluster it safely. Docs: <https://scarf.readthedocs.io/en/latest/tutorials/feature_selection.html>,
<https://scarf.readthedocs.io/en/latest/tutorials/graph_construction.html>, <https://scarf.readthedocs.io/en/latest/tutorials/dimensionality_reduction.html> and
<https://scarf.readthedocs.io/en/latest/reference/api/graph_construction.html>.

## When to use

- A pipeline default (`hvg_count=1000`, `pca_dims=21`, `neighbors_k=11`) needs to change, or two
  settings need comparing side by side.
- Building a graph on a custom cell selection (QC variant, subset) or feature list.
- Subclustering one lineage of a coarse partition with its own HVGs, PCA and graph.
- Diagnosing a graph before clustering or embedding.

## Key concepts

- RNA chain, each step returning an `ArtifactRef` that the next step consumes:
  cell selection + `select_hvgs` (`feature_selection`) -> `run_normalization` (`normalized`) ->
  `run_pca` (`reduction`) -> optional `run_harmony` -> `build_ann_index` (`ann_index`) ->
  `query_neighbors` (`neighbors`) -> `build_connectivity_map` (`connectivity_map`).
  `build_embedding_initialization(pca)` is a side branch that seeds UMAP and t-SNE only.
- Identity is operation + scientific parameters + exact inputs. An identical call returns the
  existing ref without recomputing; a changed `k` reuses normalization, PCA and the ANN index.
  Changing cells or features invalidates every downstream stage.
- `ds.pipeline.run(hvg_count=, pca_dims=, neighbors_k=)` forwards to `select_hvgs(top_n=)`,
  `run_pca(dims=)` and `query_neighbors(k=)`. Explicit calls with the same arguments return the
  very refs in `run[...]`. `pca_dims=0` skips PCA and builds the graph on normalized HVG values.
- RNA normalization: counts scaled to 1000 over the selected features, then `log1p`. PCA
  standardizes features. HVGs are an artifact, not a feature column; the chain writes no metadata.
- Count passes: a new cell selection costs one pass for the feature summary (`select_hvgs`,
  `select_detected_features`) and one per `run_normalization`; later stages read local artifacts.

## Recipes

### Rebuild the chain explicitly from a run

Start from any frozen cell selection: `run["analysis_cell_selection"]`, a QC ref, or
`ds.snapshot_cell_selection("I")`.

```python
import numpy as np
import pandas as pd
import scarf
import scarf.plotting as splt

ds = scarf.DataStore("analysis.zarr", min_features_per_cell=-1)  # reopen; see data-access.md
run = ds.pipeline.open(label="baseline")
cells = run["analysis_cell_selection"]

hvg = ds.select_hvgs(cells, top_n=1000, show_plot=False)
normalized = ds.run_normalization(cells, hvg)
pca = ds.run_pca(normalized, dims=21)
ann = ds.build_ann_index(pca)
neighbors = ds.query_neighbors(ann, k=11)
graph = ds.build_connectivity_map(neighbors)
init = ds.build_embedding_initialization(pca)
print({key: ref == run[key] for key, ref in {
    "highly_variable_features": hvg, "normalized": normalized, "pca": pca, "ann_index": ann,
    "neighbors": neighbors, "connectivity_map": graph, "embedding_initialization": init}.items()})
```

### Feature-selection diagnostics

The HVG artifact stores `values` (selected mask) and `corrected_variance` for every feature.

```python
from scarf.features.gene_families import GENE_FAMILY_PATTERNS

hvg_group = ds.load_artifact(hvg)
selected = np.asarray(hvg_group["values"][:], dtype=bool)
corrected = np.asarray(hvg_group["corrected_variance"][:])
names = ds.RNA.feats.fetch_all("names").astype(str)
print(int(selected.sum()), pd.Series(corrected[selected], index=names[selected]).nlargest(15).round(1).to_dict())
panel = ["CD3D", "MS4A1", "LYZ", "NKG7", "PPBP", "JCHAIN"]
print({gene: bool(selected[names == gene].any()) for gene in panel})
print({family: len(ds.RNA.feats.grep(p)) for family, p in GENE_FAMILY_PATTERNS.items()})

# Headless mean-variance plot. show_plot=True only displays, then closes, its figure.
summary = ds.load_artifact(ds.inspect_artifact(hvg).input_ref("feature_summary"))
n_cells = np.asarray(summary["normed_n"][:], dtype=float)
total = np.asarray(summary["normed_tot"][:], dtype=float)
splt.highly_variable_features(
    mean_nonzero=np.divide(total, n_cells, out=np.zeros_like(total), where=n_cells > 0),
    corrected_variance=corrected, n_cells=n_cells, selected=selected, show=False,
).save("hvg_mean_variance.png")
```

(10x 5K PBMC docs dataset) The top HVGs were platelet (`PPBP`, `NRGN`), light-chain (`IGLC2`,
`IGKC`) and `IGHM` genes, which the default blacklist keeps. What to exclude: `gene-blacklists.md`.

### Alternative feature sets and a custom blacklist

`blacklist` is one regex, matched (`re.match`, ignoring case) against every feature name. It
replaces the default entirely, so pass a complete string: the default plus add-ons, or a full
string from `gene-blacklists.md`.

```python
from scarf.features.variability import DEFAULT_HVG_BLACKLIST

base = DEFAULT_HVG_BLACKLIST  # or a complete string chosen with gene-blacklists.md
extra_patterns = []  # add-on regexes chosen with gene-blacklists.md; empty adds nothing
blacklist = "|".join([base, *extra_patterns])
new, old = set(ds.RNA.feats.grep(blacklist)), set(ds.RNA.feats.grep(DEFAULT_HVG_BLACKLIST))
print("added:", sorted(new - old)[:20], "released:", sorted(old - new)[:20])  # check both
hvg_2k = ds.select_hvgs(cells, top_n=2000, show_plot=False, blacklist=blacklist)
detected = ds.select_detected_features(cells, min_cells=20)  # inclusive detection threshold
everything = ds.select_all_features(from_assay="RNA")  # canonical all-true universe
custom = ds.set_feature_selection(from_assay="RNA", mask=np.isin(names, panel))  # or feature_indexes=
shared = np.asarray(ds.load_artifact(hvg_2k)["values"][:], dtype=bool) & selected
print(int(shared.sum()), "of the 1000 baseline HVGs kept")
```

`blacklist=""` disables the name filter; `max_cells=np.inf` disables the ubiquitous-gene filter.
The blacklist affects HVG selection only; marker search still tests every gene.

### Choose PCA dimensions

```python
pca_30 = ds.run_pca(normalized, dims=30)  # more PCs than needed; local, no count pass
scores = np.asarray(ds.load_artifact(pca_30)["data"])  # cells x dims; also "loadings", "center"
share = scores.var(axis=0, ddof=1)
share = share / share.sum()
print(np.round(np.cumsum(share)[[9, 14, 20, 29]], 3))  # share of the 30-PC variance at 10/15/21/30
splt.elbow(share, show=False).save("pca_elbow.png")
```

An elbow is a hint, not a rule. Too few PCs merge populations; too many restore noise.

### Graph diagnostics and a k branch

`load_graph` returns a SciPy CSR matrix over the graph's cells, in cell-selection order. The default
is directed: each row holds exactly `k` weighted edges. Keep every returned ref; downstream calls
take one graph explicitly, so branches never overwrite each other.

```python
in_graph = np.asarray(ds.load_artifact(cells)["values"][:], dtype=bool)
G = ds.load_graph(graph)
S = ds.load_graph(graph, symmetric=True)
degree = np.asarray((S != 0).sum(axis=1)).ravel()
print(G.shape, G.nnz, "degree min/median/max", degree.min(), np.median(degree), degree.max())
qc = ds.cells.to_pandas_dataframe(["RNA_nCounts", "RNA_nFeatures"])[in_graph]
print(qc.assign(degree=degree).corr(method="spearman").round(2)["degree"])
splt.graph_qc(G, show=False).save("graph_qc.png")

graph_21 = ds.build_connectivity_map(ds.query_neighbors(ann, k=21))  # reuses the ANN index
leiden = {name: ds.run_leiden_clustering(g, resolution=1.0)
          for name, g in {"k11": graph, "k21": graph_21}.items()}
labels = {name: np.asarray(ds.load_artifact(ref)["values"][:]) for name, ref in leiden.items()}
print(pd.crosstab(labels["k11"], labels["k21"]))
```

(10x 5K PBMC docs dataset) Degree vs `RNA_nCounts` Spearman 0.10; 16 clusters at k=11 versus 15
at k=21 (ARI 0.81). A larger `k` usually absorbs small clusters; the crosstab shows which.

### Same knobs through the pipeline

`params` forwards other stage settings, including the blacklist. Giving a setting both ways (for
example `hvg_count` and `params["hvg"]["top_n"]`) raises before anything is written. A completed
label cannot be run again, even unchanged: reopen it with `ds.pipeline.open` or use a new label.

```python
run_alt = ds.pipeline.run(
    label="hvg2k_pc30_k21_blacklist", hvg_count=2000, pca_dims=30, neighbors_k=21,
    params={"hvg": {"blacklist": blacklist}, "connectivity": {"bandwidth": 1.5}},
)
print(run_alt.status, ds.inspect_artifact(run_alt["neighbors"]).parameters["k"])
print(run_alt["highly_variable_features"] == hvg_2k)  # same cells and blacklist: same artifact
```

### Subcluster one lineage

Fix a coarse lineage partition first (`clustering-and-embedding.md`, "Choose the partition"), then
rebuild HVGs, normalization, PCA and the graph inside the lineage. `ds.cells.insert` writes to the
store itself; prefix and version column names on shared stores.

```python
from itertools import combinations
from sklearn.metrics import adjusted_rand_score

def on_cell_axis(ref):
    """Spread Leiden labels over every store cell (-1 outside the ref's selection)."""
    mask = ds.load_artifact(ds.inspect_artifact(ref).input_ref("cell_selection"))["values"][:]
    full = np.full(ds.cells.N, -1)
    full[np.asarray(mask, dtype=bool)] = ds.load_artifact(ref)["values"][:]
    return full

def build_graph(cell_selection, top_n=1000, dims=21, k=11):
    hvg = ds.select_hvgs(cell_selection, top_n=top_n, show_plot=False)  # summary: one count pass
    pca = ds.run_pca(ds.run_normalization(cell_selection, hvg), dims=dims)  # one count pass
    return ds.build_connectivity_map(ds.query_neighbors(ds.build_ann_index(pca), k=k))

parent, parent_markers = run["clusters"], run["markers"]  # or your chosen Leiden ref and its table
table = ds.get_markers(marker=parent_markers, min_score=-1, min_frac_exp=-1)
cd3e = table[table["feature_name"] == "CD3E"].set_index("group_id")["frac_exp"]
lineage_ids = sorted(int(g) for g in cd3e.index[cd3e > 0.5])  # a T gate; confirm with markers
sub_cells = ds.select_cells(parent, include=lineage_ids)  # frozen, over every store cell
ds.cells.insert("t_lineage_v1", np.isin(on_cell_axis(parent), lineage_ids), overwrite=True)
alt_cells = ds.snapshot_cell_selection("t_lineage_v1")  # same cells from any boolean column
assert np.array_equal(*(ds.load_artifact(r)["values"][:] for r in (sub_cells, alt_cells)))

sub_graph, sub_leiden, rows = build_graph(sub_cells), {}, []
for resolution in (0.3, 0.5, 0.8):
    refs = [ds.run_leiden_clustering(sub_graph, resolution=resolution, random_seed=seed)
            for seed in (4444, 1, 2)]
    seeds = [np.asarray(ds.load_artifact(ref)["values"][:]) for ref in refs]
    sub_leiden[resolution] = refs[0]
    rows.append({"resolution": resolution, "n_clusters": len(np.unique(seeds[0])),
                 "min_seed_ari": min(adjusted_rand_score(a, b) for a, b in combinations(seeds, 2))})
print(pd.DataFrame(rows).round(3))

# Choose as for a global partition; then check markers, covariates, HVG count, parent overlap.
sub_resolution = 0.3  # the finest resolution that passed the seed check above
sub = sub_leiden[sub_resolution]
sub_full, parent_full = on_cell_axis(sub), on_cell_axis(parent)
in_sub = sub_full >= 0
sub_markers = ds.run_marker_search(sub, features=run["feature_universe"])  # one count pass
print(ds.get_markers(marker=sub_markers).groupby("group_id", sort=False)["feature_name"]
      .agg(n="size", top=lambda s: ", ".join(s.head(6))))  # groups missing here have 0 markers
print(pd.crosstab(sub_full[in_sub], parent_full[in_sub]))
print(pd.DataFrame({"sub": sub_full, "counts": ds.cells.fetch_all("RNA_nCounts"), "doublet":
                    run.cells.fetch_all("doublet_score")})[in_sub].groupby("sub").median().round(2))
sub_2k = ds.run_leiden_clustering(build_graph(sub_cells, top_n=2000), resolution=sub_resolution)
print("ARI vs 2000 HVGs", round(ds.metric_label_concordance(sub, sub_2k), 3))

combined = np.where(in_sub, np.char.add("T.", sub_full.astype(str)), parent_full.astype(str))
combined = np.where(parent_full < 0, "not analyzed", combined).astype(object)
ds.cells.insert("clusters_tsub_v1", combined, overwrite=True)  # new suffix for each new version
```

(10x 5K PBMC docs dataset) The T subgraph at 0.3 split naive and memory CD4, naive CD8,
cytotoxic and FOXP3/CTLA4 groups, with ARI 0.94 at 2,000 HVGs. The parent had no FOXP3 group.

## Parameters that matter

| Parameter | Default | Change when |
| --- | --- | --- |
| `select_hvgs(top_n=)` / `hvg_count` | `1000` | Weak or rare populations (raise); noisy programs dominate (lower). |
| `select_hvgs(blacklist=)` | `DEFAULT_HVG_BLACKLIST` | A family dominates the HVGs or is the question; what to add: `gene-blacklists.md`. |
| `select_hvgs(min_cells=, max_cells=)` | `20`, `None` (= selected cells - 20) | Tiny subsets; `max_cells=np.inf` keeps ubiquitous genes. |
| `run_pca(dims=)` / `pca_dims` | `21` | After a variance and stability check; `0` in the pipeline means no PCA. |
| `run_pca(pca_cell_selection=)` | `None` | Fit on a subset (for example one batch) and project all cells. |
| `query_neighbors(k=)` / `neighbors_k` | `11` (clamped to cells - 1) | Larger data or smoother graphs (15 to 30); smaller to resolve rare groups. |
| `load_graph(symmetric=, use_k=)` | `False`, all `k` | `True` for degree and connectivity checks; `use_k` to thin edges. |

## Check before moving on

- HVGs: count equals `top_n`; expected lineage markers are selected; the top of the list is not
  one contaminant or technical program. If canonical lineage genes are missing, or one family
  (Ig, haemoglobin, platelet) leads the list, branch with more HVGs and an explicit blacklist
  (`gene-blacklists.md`) and compare partitions.
- PCA and `k`: a second setting gives a similar partition, or the differences are explained by
  markers. Boundaries that move with `k` or `dims` are provisional.
- Graph: symmetric degree min is at least `k`; degree barely tracks counts. A strong correlation
  means depth is shaping the graph.
- Subclusters: keep one only when it is seed-stable, has its own named markers, is not explained
  by counts or doublet score, and survives the HVG change. Merge the rest into the parent label.
  Write labels to a versioned column and keep the parent labels.

## Pitfalls

- Reading in-degree from the directed graph as isolation. `(G != 0).sum(axis=0)` is zero for 85
  cells (10x 5K PBMC docs dataset), yet every cell has `k` out-edges; use `symmetric=True`.
- Passing a feature selection to UMAP, clustering or markers on a graph: graph consumers take the
  graph ref. `query_neighbors(coordinates=)` only checks equality; it cannot retarget an index.
- `show_elbow_plot=True` draws only on a new PCA fit. More than 4096 features or several narrow
  blocks switch PCA to IncrementalPCA, and `batch_size` then joins the artifact identity.
- Subclustering on the parent graph, or carrying subcluster IDs across artifacts. Rebuild inside
  the subset, join on the cell axis, and keep the parent labels. `select_cells(include=[])`
  raises; integer cluster artifacts need integer `include` values.
- `select_hvgs` is RNA only. ATAC uses `select_prevalent_peaks` then `run_lsi`.

## See also

- `gene-blacklists.md`: which gene families to pass as `blacklist=`, and why.
- `quality-control.md`: building the cell selection this chain starts from.
- `clustering-and-embedding.md`: Leiden, Paris, UMAP and t-SNE on the graph; choosing a partition.
- `integration-and-comparisons.md`: `run_harmony` between PCA and the ANN index.
- `pipeline-runs-and-artifacts.md`: `inspect_artifact`, lineage and reuse.
