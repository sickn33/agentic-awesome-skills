# Plotting

Draw, inspect and save Scarf figures headlessly, from a completed pipeline run or from explicit
artifact refs. Docs: <https://scarf.readthedocs.io/en/latest/tutorials/plotting.html>,
<https://scarf.readthedocs.io/en/latest/reference/api/plotting.html>, <https://scarf.readthedocs.io/en/latest/reference/api/datastore.html>.

## When to use

- Visual checks after QC, graph, clustering, doublet and marker steps.
- Figures for a report or handoff. Agents run headless: always save to files and close.

## Key concepts

- `ds.plots.<name>(...)` is `scarf.plotting.<name>(ds, ...)` with the store bound. Accessor methods:
  `embedding`, `embedding_raster`, `distribution`, `dotplot`, `matrixplot`, `composition`,
  `marker_heatmap`, `cluster_connectivity`, `cluster_tree`, `modality_weights`,
  `pseudotime_heatmap`, `mapping_score`, `mapping_evidence`, `mapping_confusion`,
  `mapping_calibration`, `run_recipe`. Standalone only in `scarf.plotting`: `graph_qc` (sparse
  graph), `elbow` and `highly_variable_features` (arrays), `qc` (DataFrame), plus
  `compose_results`, `label_panels`, `theme_context`.
- Every plot returns a `PlotResult`: `figure`, `axes` (dict keyed by panel), `tables` (dict of
  DataFrames with the plotted values), `legends`, `scales`, `provenance`, `owns_figure`, and
  `save()`, `save_provenance()`, `show()`, `close()`. Plots never add metadata columns; on a
  writable store `cluster_tree` caches `dendrogram` and `coalesced_tree` artifacts.
- `show=True` is the default. In a script it draws nothing on Agg and closes a Scarf-owned figure.
  Pass `show=False`, save, then `close()`.
- Run mode, embedding and embedding_raster only: `run=run`, `layout="umap"` (default), and
  `color_by` set to one string from `run.cells.columns`. No genes, live columns, lists, `CellField`,
  `facet_by`, `subset_by`, `normalization` or `Highlight(by=...)`.
- Ref mode, everything else: `layout=run["umap"]`, `color_by=` an `ArtifactRef`, a live metadata
  column, a gene name, `FeatureRef`, `CellField`, or a list of these (one panel each). Cells come
  from the layout artifact's selection; live columns are aligned to it.
- Helpers in `scarf.plotting`: `CellField(key, kind="auto"|"categorical"|"continuous", label=)`,
  `FeatureRef(value, assay=None, by="name"|"id"|"index", label=, reduction=)`,
  `NormalizationSpec(source="assay"|"raw", transform="none"|"log1p")`,
  `ColorScale(cmap, vmin, vmax, vcenter, quantiles, missing_color, scope, scale)`,
  `CategoricalScale(order, palette, labels, missing_color, missing_label, palette_name)`,
  `Highlight(by, groups, indices, color, dim_alpha, ...)`, `DensityOverlay`, `SizeScale`,
  `StudyDesign`.
- Plots are display. `max_points` thins only the overlaid points in `distribution`; violins use
  every cell and `provenance.notes` gains `"subsampled_display"`. Take numbers from
  `result.tables` or artifacts, never from pixels or UMAP distances.

## Recipes

`cell_type`, `sample_id` and `B cell` below are placeholders for your own annotation and design
columns. When author labels are held out, plot only labels you assigned.

### Save headlessly

Run scripts as `MPLBACKEND=Agg python script.py`, or call `matplotlib.use("Agg")` before
importing pyplot. `save` infers the format (png, pdf, svg, tif) from the suffix, keeps the exact
inch size, and uses a white background. The exact size can clip a legend outside the axes
(`legend_loc="right"`, many categories): save those with `exact_size=False`, a tight crop.

```python
import matplotlib.pyplot as plt
import scarf
import scarf.plotting as splt

scarf.configure_output(level="WARNING", progress=False)
ds = scarf.DataStore("analysis.zarr", nthreads=4, min_features_per_cell=-1)
run = ds.pipeline.open(label="baseline")

result = ds.plots.embedding(run=run, layout="umap", color_by="clusters", show=False)
result.save("figures/umap_clusters.png", dpi=150, provenance_sidecar=True)  # + .png.json
result.figure.savefig("figures/umap_clusters_tight.png", dpi=150, bbox_inches="tight")
result.close()
assert plt.get_fignums() == []  # nothing left open
```

### Plot frozen run fields

```python
for field in ("clusters", "leiden_1.0", "doublet_score", "cell_cycle_phase"):
    r = ds.plots.embedding(run=run, color_by=field, show=False)
    r.save(f"figures/run_{field}.png", dpi=120)
    r.close()
r = ds.plots.embedding_raster(run=run, color_by="doublet_score", show=False)
r.close()
```

### Color by cluster artifacts, metadata and genes

Gene panels read counts and normalize on the fly; several genes in one call share one matrix
read (seconds on remote counts).

```python
umap = run["umap"]
r = ds.plots.embedding(
    layout=umap,
    color_by=[run["clusters"], "CD3D", "MS4A1", "LYZ"],
    normalization=splt.NormalizationSpec(transform="log1p"),
    color_scale=splt.ColorScale(cmap="viridis", quantiles=(0.0, 0.99)),
    sort_values=True,
    show=False,
)
r.axes["cluster_labels"].set_title("Leiden (selected)")  # ref panels are keyed by kind
r.save("figures/umap_genes.png", dpi=150)
r.close()

r = ds.plots.embedding(
    layout=umap,
    color_by=splt.CellField("cell_type", kind="categorical", label="Cell type"),
    categorical_scale=splt.CategoricalScale(palette_name="colorblind"),  # or "default" only
    legend_loc="right",
    show=False,
)
r.save("figures/umap_cell_type.png", dpi=150, exact_size=False)  # keeps the outside legend
r.close()
ds.plots.embedding(layout=umap, color_by=run["leiden_1.0"], show=False).close()
ds.plots.embedding(
    layout=umap,
    color_by=None,
    default_color="#bdbdbd",
    highlight=splt.Highlight(by="cell_type", groups=("B cell",)),
    show=False,
).close()
ds.plots.embedding(
    layout=umap, color_by=splt.FeatureRef("NKG7", label="NKG7"), show=False
).close()
```

### Distributions

`grouping` must be an `ArtifactRef` or a `CellField`; a plain string raises `TypeError`. `keys`
are metadata columns, genes, or a `cell_cycle` artifact: every other `ArtifactRef` (doublets,
membership strength, enrichment) raises `ValueError`. Insert a frozen field as a live column first.

```python
r = ds.plots.distribution(
    ["RNA_nCounts", "RNA_percentMito"],
    grouping=run["clusters"],
    kind="violin",
    max_points=2000,
    show=False,
)
r.tables["RNA_nCounts"].head()  # value, group, display_value; one row per analysed cell
r.provenance.notes  # ('distribution', 'violin', 'subsampled_display')
r.close()
ds.plots.distribution(
    "RNA_nCounts",
    grouping=splt.CellField("cell_type", kind="categorical"),
    cell_selection=run["analysis_cell_selection"],
    max_points=0,
    show=False,
).close()
ds.plots.distribution(run["cell_cycle"], grouping=run["clusters"], show=False).close()
ds.cells.insert("baseline_doublet_score", run.cells.fetch_all("doublet_score"), overwrite=True)
ds.plots.distribution("baseline_doublet_score", grouping=run["clusters"], show=False).close()
```

### Dot plots, matrix plots and marker heatmaps

Here `groups=` is the cluster `ArtifactRef`; `group_by=` names a live column instead and groups
the cells of `cell_key` (default `"I"`, not the run's cells). The aggregate table's group column is
`groups` for `groups=`, and the column's own name for `group_by=` (one column per name in a tuple).

```python
panel = {"T": ["CD3D", "IL7R"], "B": ["MS4A1", "CD79A"], "NK": ["NKG7", "GNLY"]}
r = ds.plots.dotplot(features=panel, groups=run["clusters"], standardize="feature", show=False)
r.tables["aggregate"].head()  # groups, feature, feature_group, mean, fraction, n_cells, variance
r.save("figures/dotplot.png", dpi=150)
r.close()
r = ds.plots.dotplot(features=panel, group_by="cell_type", show=False)
agg = r.tables["aggregate"]  # cell_type, feature, feature_group, mean, fraction, n_cells, variance
fraction = agg.pivot(index="cell_type", columns="feature", values="fraction")  # not "groups"
r.close()
ds.plots.matrixplot(
    features=["CD3D", "MS4A1", "LYZ"], groups=run["clusters"], cluster_groups=True, show=False
).close()
r = ds.plots.marker_heatmap(marker=run["markers"], topn=3, show=False)
r.tables["markers"].head()  # group, rank, feature_index, score, feature
r.close()
```

### Graph and cluster structure

```python
graph = run["connectivity_map"]
r = ds.plots.cluster_connectivity(
    graph=graph, groups=run["clusters"], layout=run["umap"], show_cells=True, show=False
)
r.tables["edges"]  # source, target, rawWeight, normalizedWeight
r.close()
ds.plots.cluster_tree(graph=graph, clusters=run["paris"], show=False).close()
splt.graph_qc(ds.load_graph(graph=graph), show=False).close()
ds.plots.composition(categories=run["clusters"], show=False).close()  # one stacked bar
r = ds.plots.composition(category_by="cell_type", sample_by="sample_id", kind="stacked", show=False)
r.tables["per_sample"].head()  # one stacked bar per sample
r.close()
```

`kind="per_sample"` with a `StudyDesign` draws a strip of per-sample proportions per category
instead; see integration-and-comparisons.md.

### Compose panels in a figure you own

With `target=` the caller owns the figure: child `close()` does nothing, so close the figure. A
ref-mode embedding with many long category labels and `legend_loc="right"` shrinks its axes to a
thumbnail; draw it on a wide figure you own instead.

```python
fig, axes = plt.subplots(1, 2, figsize=(9, 4), layout="constrained")
ds.plots.embedding(run=run, color_by="clusters", target=axes[0], show=False)
ds.plots.embedding(run=run, color_by="doublet_score", target=axes[1], show=False)
fig.savefig("figures/panels.png", dpi=150, bbox_inches="tight")
plt.close(fig)

fig, ax = plt.subplots(figsize=(11, 6), layout="constrained")  # room for long labels
ds.plots.embedding(layout=run["umap"], color_by=splt.CellField("cell_type"), legend_loc="right",
                   target=ax, show=False)
fig.savefig("figures/umap_cell_type_wide.png", dpi=150, bbox_inches="tight")
plt.close(fig)
```

## Parameters that matter

| Parameter | Default | Change when |
| --- | --- | --- |
| `show` | `True` | Always `False` in scripts; then `save` and `close`. |
| `layout` / `layout_key` | none; exactly one required (run mode: `"umap"`) | `layout_key` only for coordinates you inserted as metadata columns. |
| `normalization` | `NormalizationSpec()` (assay normalization, no transform) | `transform="log1p"` for gene panels. |
| `color_scale` | auto per feature | `quantiles=(0.0, 0.99)` to stop outliers washing out a gene. |
| `categorical_scale` | default palette | Fix `order` or `palette` (dict) to keep colors identical; `palette_name` is only `"default"` or `"colorblind"`. |
| `sort_values` | `False` | `True` draws high values last for expression panels. |
| `legend_loc` | `"auto"` | `"right"`, `"on_data"` or `"none"` to force placement. |
| `max_points` (distribution) | `10000` | `0` for no points; `None` gives no points for stacked violins. |
| `rasterize_threshold` | `50000` | Lower for smaller vector files. |
| `save(dpi=, exact_size=)` | figure dpi (300 for TIFF), `True` | `exact_size=False` for a tight crop and for legends outside the axes. |

## Check before moving on

- Open one or two saved PNGs and confirm panels, legends and colorbars rendered.
- Legend categories equal the cluster count; `tables` row counts equal analysed cells.
- `plt.get_fignums()` is empty after a batch of figures.
- `result.provenance.n_cells` and `notes` match the intended selection and subsampling.

## Pitfalls

- Run mode rejects anything but one frozen field: a gene or live column raises `KeyError`, a list
  or `CellField` raises `TypeError`, `facet_by`/`subset_by`/`normalization` raise `ValueError`.
  Switch to `layout=run["umap"]`.
- `layout="umap"` without `run=` raises `TypeError`. The pipeline writes no `RNA_UMAP*` columns,
  so `layout_key="RNA_UMAP"` fails on pipeline-only stores.
- `groups` filters categories in `embedding` and `distribution` but is the cluster ref in
  `dotplot`, `matrixplot` and `cluster_connectivity`. Pivoting a `group_by=` aggregate on
  `"groups"` raises `KeyError: 'groups'`.
- `CategoricalScale(palette_name="tab20")` raises `ValueError`; pass `palette={label: color}`.
- The same clusters get different colors in run mode and ref mode; pass a `CategoricalScale`
  when figures must match.
- A run opened from another `DataStore` object raises `ValueError` in plots.
- Unclosed `show=False` figures accumulate in long loops.

## See also

- pipeline-runs-and-artifacts.md: which run keys and frozen fields exist.
- quality-control.md, features-and-graphs.md, clustering-and-embedding.md,
  markers-and-annotation.md: the diagnostic plot for each step.
- integration-and-comparisons.md: `modality_weights`, mapping plots, `StudyDesign` composition.
