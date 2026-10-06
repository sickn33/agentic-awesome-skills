# Markers and annotation

Find cluster markers, turn marker evidence into cautious cell-type labels, separate progenitors
from multiplets, score gene sets and the cell cycle, and run a final comparison with existing
labels. Docs: <https://scarf.readthedocs.io/en/latest/tutorials/annotation.html>, <https://scarf.readthedocs.io/en/latest/tutorials/gene_set_scoring.html>,
<https://scarf.readthedocs.io/en/latest/tutorials/cell_cycle.html>, <https://scarf.readthedocs.io/en/latest/reference/api/datastore.html>.

## When to use

- A partition is chosen (`clustering-and-embedding.md`) and its clusters need names.
- You need marker tables, panel checks, multiplet checks, signature scores or cell-cycle phases.
- Labels are final and a held-out reference exists for a post-hoc evaluation.

## Key concepts

- `run_marker_search(clusters, features=...)` takes an exact `cluster_labels` or `cluster_cut` ref
  and a feature-selection ref, streams counts once (remote for mounted stores) and returns
  `ArtifactRef(kind="marker_table")`. `run["markers"]` is the table for `run["clusters"]`.
- Columns: `score` (Scarf specificity, 0 to 1, summing to 1 across groups for each gene; near
  1/n_groups means ubiquitous), `mean`/`mean_rest`, `frac_exp`/`frac_exp_rest`, `fold_change`,
  `auc`, two-sided Mann-Whitney `p_value` and `p_value_adjusted` (BH within each group). They are
  one-versus-rest statistics over cells, not replicate-aware differential expression.
- `get_markers` returns a DataFrame with a string `group_id`, rows sorted by `score` within each
  group and groups in natural order (`"2"` before `"10"`). Defaults `min_score=0.25`,
  `min_frac_exp=0.2` hide most genes; pass `-1` for both to get every gene for every group.
- A label is a hypothesis. It needs named positive markers, low lineage-negative markers and a
  plausible QC and doublet profile. Keep an explicit `unresolved` label instead of forcing a name.
- Doublet scores rise with RNA content, so plasma cells and other high-RNA types score high as
  whole clusters. Judge doublets within a lineage and per cell, not by a global cut.
- No public API saves user-assigned labels as an artifact. Store them as a live column with
  `ds.cells.insert` (mutable, unversioned, written into the store).
- AUCell and WAGGR return `kind="enrichment_scores"` (activity scores, not p-values); cell-cycle
  scoring returns `kind="cell_cycle"` (`phase`, `s_score`, `g2m_score`). Rows follow the selection.

## Recipes

### Get and read marker tables

```python
import numpy as np
import pandas as pd
import scarf

scarf.configure_output(level="WARNING", progress=False)
ds = scarf.DataStore("analysis.zarr", nthreads=4, min_features_per_cell=-1)
run = ds.pipeline.open(label="baseline")
clusters, markers = run["clusters"], run["markers"]
# Another partition needs its own table (one pass over counts):
markers_res1 = ds.run_marker_search(run["leiden_1.0"], features=run["feature_universe"])

top = ds.get_markers(marker=markers)  # min_score=0.25, min_frac_exp=0.2
print(top.groupby("group_id", sort=False).head(8)
      .groupby("group_id", sort=False)["feature_name"].agg(", ".join))
one = ds.get_markers(marker=markers, group_id=3)  # an int matches the label "3"
print(one[["feature_name", "score", "frac_exp", "frac_exp_rest", "auc", "p_value_adjusted"]].head())
everything = ds.get_markers(marker=markers, min_score=-1, min_frac_exp=-1)  # all genes x groups
# ds.export_markers_to_csv(markers, "markers.csv") writes marker names per group, wide format
```

### Tabulate a canonical marker panel

```python
panel = ["CD3E", "IL7R", "CD8A", "NKG7", "GNLY", "MS4A1", "CD79A", "MZB1", "JCHAIN", "CD14",
         "LYZ", "FCGR3A", "FCER1A", "LILRA4", "PPBP", "HBB", "CD34", "MKI67"]
order = list(dict.fromkeys(everything["group_id"]))  # pivot would sort "10" before "2"
hits = everything[everything["feature_name"].isin(panel)]
frac = (hits.pivot(index="group_id", columns="feature_name", values="frac_exp")
        .reindex(index=order, columns=[g for g in panel if g in set(hits["feature_name"])]))
score = hits.pivot(index="group_id", columns="feature_name", values="score").reindex_like(frac)
print(frac.round(2), score.round(2), sep="\n\n")  # detection versus exclusivity
```

### Flag clusters for review: QC, doublets, multiplets and progenitors

Per cell, count lineages whose two specific genes are both detected, and the progenitor program
genes detected, from one raw-count panel export. Ambient genes (LYZ, HBB, JCHAIN, Ig) are left out
because they are detected almost everywhere.

```python
in_run = run.cells.fetch_all("I").astype(bool)
review = run.cells.to_pandas_dataframe(["ids", "clusters", "doublet_score"]).set_index("ids")
review = review.assign(**{c: ds.cells.fetch_all(c)[in_run]
                          for c in ("RNA_nCounts", "RNA_percentMito")})
lineages = {"T": ["CD3D", "CD3E"], "B": ["MS4A1", "CD79B"], "myeloid": ["CD14", "FCN1"],
            "plasma": ["MZB1", "TNFRSF17"]}
program = ["CD34", "PRSS57", "SPINK2", "CYTL1", "SOX4"]  # SOX4 alone is broadly detected
wanted = list(dict.fromkeys(sum(lineages.values(), []) + program))
present = [g for g in wanted if g in set(ds.RNA.feats.fetch_all("names"))]
counts = ds.to_anndata(from_assay="RNA", feature_names=present)  # obs_names are cell ids
hit = (pd.DataFrame(counts.X.toarray() > 0, index=counts.obs_names, columns=present)
       .reindex(index=review.index, columns=wanted, fill_value=False))
review["n_lineages"] = sum(hit[genes].all(axis=1).astype(int) for genes in lineages.values())
review["progenitor"] = hit["CD34"] & (hit[program[1:]].sum(axis=1) >= 2)  # coherent program
review["doublet_rank"] = review.groupby("clusters")["doublet_score"].rank(pct=True)
summary = review.groupby("clusters").agg(
    n=("doublet_score", "size"), doublet=("doublet_score", "median"),
    counts=("RNA_nCounts", "median"), mito=("RNA_percentMito", "median"),
    two_lineages=("n_lineages", lambda s: (s >= 2).mean()), progenitor=("progenitor", "mean"))
summary["n_markers"] = (top["group_id"].value_counts()
                        .reindex(summary.index.astype(str), fill_value=0).to_numpy())
print(summary.round(2))
suspects = review[(review["n_lineages"] >= 2) & (review["doublet_rank"] >= 0.9)]
print(len(suspects), "cells co-detect two lineages and sit in their cluster's top doublet decile")
```

Read the flags together, per cluster and per cell:

- Progenitor (HSPC): a coherent program in the same cells (CD34 with PRSS57, SPINK2, CYTL1; SOX4
  supports) and few two-lineage cells. Primed progenitors add early genes of one lineage
  (GATA2, KLF1, CPA3) that vary between cells, not mature markers of two lineages per cell.
- Multiplet: mature markers of two lineages in the same cells (T with myeloid, B or plasma with
  T or myeloid), counts or features above both parent lineages, few markers of its own and a
  high doublet rank. Single multiplets inside large clusters show up only in `suspects`.
- Doublet scores: compare a cluster with clusters of the same lineage, not the global median. A
  whole plasma cluster scoring high is expected; a plasma subset co-detecting T genes is not.
- Ambiguous (a program plus two-lineage cells, or high counts without co-detection): keep
  `unresolved` and record both readings.

### Assign labels and store them

Write the evidence next to each label. The map below is a template with placeholder IDs: never
copy a map from another dataset. Clusters not named stay `unresolved`.

```python
cluster_values = run.cells.fetch("clusters").astype(str)
labels = {  # TEMPLATE: replace "<id>" and every gene with this dataset's own evidence
    # "<id>": "CD14 monocyte",  # + CD14, LYZ, FCN1 | - CD3E, MS4A1 | confidence high
    # "<id>": "CD4 T",          # + CD3E, IL7R, CD40LG | - CD8A, NKG7 | medium: CD4 sparse
    # "<id>": "HSPC",           # + CD34, PRSS57, SPINK2 | - no two-lineage cells | medium
    # "<id>": "unresolved",     # + CD3E with CD14 in the same cells, high counts | low
}
per_cell = pd.Series(cluster_values).map(labels).fillna("unresolved").to_numpy()
print(pd.Series(per_cell).value_counts())
annotation = np.full(ds.cells.N, "not analyzed", dtype=object)
annotation[in_run] = per_cell
ds.cells.insert("annotation_v1", annotation, overwrite=True)  # live column, full cell axis
ds.cells.insert("annotation_v1_cells", in_run, overwrite=True)
named = sorted(int(c) for c, name in labels.items() if name != "unresolved")
keep = ds.select_cells(clusters, include=named) if named else run["analysis_cell_selection"]
```

`select_cells(include=[])` raises, hence the guard; `keep` can seed a graph without unresolved
clusters. Plot evidence with `ds.plots.dotplot(features=..., group_by="annotation_v1",
cell_key="annotation_v1_cells")` and `ds.plots.marker_heatmap(marker=markers, topn=3)`.

### Score gene sets with AUCell and WAGGR

```python
net = pd.DataFrame({  # or scarf.read_gmt("sets.gmt"): one source-target row per gene
    "source": ["T_cell"] * 4 + ["B_cell"] * 3 + ["Monocyte"] * 4 + ["NK"] * 4,
    "target": ["CD3D", "CD3E", "TRAC", "IL7R", "MS4A1", "CD79A", "CD79B",
               "CD14", "LYZ", "S100A8", "FCN1", "NKG7", "GNLY", "KLRD1", "PRF1"]})
cells = run["analysis_cell_selection"]
universe = ds.select_all_features(from_assay="RNA")
aucell = ds.run_aucell(net, cells, features=universe, tmin=3)  # one pass over counts
waggr = ds.run_waggr(net.assign(weight=1.0), cells, features=universe, tmin=3)
result = ds.get_enrichment(aucell)  # lazy; sources=[...] loads a subset
assert result.cell_selection == cells
scores = pd.DataFrame(result.data.compute(), columns=list(result.source_names))
print(scores.groupby(run.cells.fetch("clusters")).mean().round(2))
```

AUCell ranks raw counts within each cell (0 to 1, `n_up` defaults to 5% of the universe). WAGGR
averages library-size-normalized expression with edge weights (unbounded, signed weights allowed).

### Read or compute cell-cycle phase

```python
phase = run.cells.to_pandas_dataframe(["clusters", "cell_cycle_phase", "s_score", "g2m_score"])
print(pd.crosstab(phase["clusters"], phase["cell_cycle_phase"], normalize="index").round(2))
cycle = ds.run_cell_cycle_scoring(keep)  # new artifact; one pass over counts
print(pd.Series(np.asarray(ds.load_artifact(cycle)["phase"][:]).astype(str)).value_counts())
```

### Compare with existing labels (final post-hoc evaluation only)

Run once, after labels are frozen. Read the reference column here first, write the map from its
vocabulary before any crosstab, and never tune labels or parameters on the result.

```python
import hashlib
from sklearn.metrics import adjusted_rand_score, classification_report

ds.cells.to_pandas_dataframe(["ids", "annotation_v1"]).to_csv("labels_v1_frozen.csv", index=False)
print("sha256", hashlib.sha256(open("labels_v1_frozen.csv", "rb").read()).hexdigest())
reference = pd.Series(ds.cells.fetch_all("author_cell_type")[in_run]).astype(str)  # held out
print(sorted(reference.unique()))  # the vocabulary only; now write the map below
to_reference = {  # TEMPLATE: our label -> reference label, fixed before seeing any agreement
    # "CD4 T": "<reference label>",
}
ours = pd.Series(ds.cells.fetch_all("annotation_v1")[in_run]).astype(str)
pred = ours.map(to_reference).fillna("unmatched")
print(pd.crosstab(pred, reference))
shared = sorted(set(to_reference.values()))
both = (pred != "unmatched") & reference.isin(shared)  # drops unresolved and unmapped classes
print("ARI all cells", round(adjusted_rand_score(reference, pred), 3))
if both.any():
    print("ARI mapped only", round(adjusted_rand_score(reference[both], pred[both]), 3))
    print(classification_report(reference, pred, labels=shared, zero_division=0))
```

Report precision and recall per class, ARI with and without ambiguous classes, and reference
classes with no counterpart. Disagreement is evidence: inspect large off-diagonal cells.

## Canonical markers

Confirm with dataset markers and use two or more genes. Human symbols; mouse symbols are title
case (`Cd3e`, `Ptprc`, `Mki67`), and panel lookups are exact, so convert the panel.

| Population | Positive markers | Notes and negatives |
|---|---|---|
| T cell | CD3D, CD3E, TRAC | MS4A1, CD14 low |
| CD4 T | IL7R, CD40LG, CD4 (often poorly detected) | CD8A, CD8B low; CCR7, SELL, LEF1 mark naive T |
| CD8 T | CD8A, CD8B | effector GZMK, GZMH, NKG7 |
| Treg | FOXP3, IL2RA, CTLA4 | within CD4 T |
| MAIT, gamma-delta T | SLC4A10, KLRB1 (MAIT); TRDC, TRGC1 (gamma-delta) | often within CD8 or effector T |
| NK | NKG7, GNLY, KLRD1, KLRF1, NCAM1 | CD3E low; NKG7, GNLY also in CD8 effector T |
| B cell | MS4A1, CD79A, CD19 | naive IGHD, TCL1A |
| Plasma cell, plasmablast | MZB1, JCHAIN, XBP1, TNFRSF17 | MS4A1 low; plasmablasts express MKI67 |
| CD14 monocyte | CD14, LYZ, S100A8, S100A9, FCN1 | |
| CD16 monocyte | FCGR3A, MS4A7, CDKN1C | FCGR3A also on NK |
| Conventional DC | FCER1A, CD1C, CLEC10A; CLEC9A (cDC1) | FCER1A also on basophils |
| Plasmacytoid DC | LILRA4, IL3RA, CLEC4C | GZMB shared with NK; MZB1 also high |
| Basophil, mast cell | CPA3, HDC, MS4A2; TPSAB1, KIT (mast) | |
| Neutrophil | CSF3R, FCGR3B, CXCR2 | low counts; rare after density gradients |
| Platelet, megakaryocyte | PPBP, PF4 | often attached to monocytes |
| Erythroid | HBB, HBA1 | frequent ambient contamination |
| HSPC | CD34, PRSS57, SPINK2, CYTL1, SOX4 | rare in blood; primed subsets add GATA2, KLF1 or CPA3 |
| Cycling (a state) | MKI67, TOP2A | label as a state, not a type |
| Immune, macrophage | PTPRC; C1QA, CD68 (macrophage) | |
| Epithelium, gut | EPCAM, KRT8, KRT18; LGR5, OLFM4 (stem) | goblet MUC2; colonocyte CA1 |
| Fibroblast | PDGFRA, COL1A1, DCN | subtypes vary by tissue, e.g. APOD or CCN2 (CTGF) high; `^CCN` is in the default HVG blacklist, markers still test it |
| Endothelium | PECAM1, VWF, CDH5 | |
| Smooth muscle, pericyte | ACTA2, MYH11, DES; RGS5 (pericyte) | ACTA2 also on myofibroblasts |
| Keratinocyte, melanocyte | KRT5, KRT14 (basal), KRT10 (suprabasal); PMEL, MLANA (melanocyte) | |
| Neuron | RBFOX3, SNAP25; SLC17A7 (excitatory); GAD1, GAD2 (inhibitory) | |
| Astrocyte, oligodendrocyte | GFAP, AQP4; MBP, PLP1, MOG (oligodendrocyte) | |
| OPC, microglia | PDGFRA, CSPG4 (OPC); CSF1R, P2RY12 (microglia) | CSF1R also on macrophages |

## Parameters that matter

| Parameter | Default | Change when |
|---|---|---|
| `min_score` (`get_markers`) | `0.25` | `-1` to see negatives and weak genes; raise for a short list |
| `min_frac_exp` (`get_markers`) | `0.2` | `-1` with `min_score=-1` for complete panel tables |
| `features` (`run_marker_search`) | required | `run["feature_universe"]` tests every gene; an HVG ref limits the search |
| `tmin` (AUCell, WAGGR) | `5` | Lower for short sets; sources with fewer matched targets are dropped |
| `n_up` (AUCell) | `None` (5% of universe) | Fix it when comparing runs; changes the score scale |
| `s_genes` / `g2m_genes` | built-in human and mouse lists | Other species or naming schemes |

## Check before moving on

- Every named cluster has at least two positive markers with high `frac_exp` and `score` well above
  1/n_groups, and lineage negatives with low `frac_exp`. The evidence is written next to the label.
  Few markers usually means a split within one lineage: merge, or name a state only with evidence.
- Clusters with two lineages' markers in the same cells, counts above both parents or a high
  within-lineage doublet rank are `unresolved`. A CD34 program without co-detection is HSPC.
- Rare types hide in big clusters; check finer resolutions or subcluster the lineage.
- The label map, marker ref and run ID are recorded. Held-out labels were not read before this.

## Pitfalls

- Default `get_markers` filters hide negative markers. `group_id` is a string while Leiden labels
  are integers; convert before joining.
- Direct calls do not reuse pipeline outputs: `run_marker_search(run["clusters"], ...)` and
  `run_cell_cycle_scoring(...)` write new artifacts and reread counts. Read the run's refs instead.
- Ambient genes (HBB, LYZ, S100A8, JCHAIN, immunoglobulins) show nonzero `frac_exp` in most
  clusters. Use `score` and `auc`, not detection alone, and leave them out of co-detection checks.
- Small groups inflate `fold_change` and can pass `min_score` with odd genes; check group size.
- `ds.cells.insert(..., overwrite=True)` silently replaces a column; use versioned names.
- `select_cells(include=...)` needs integers for integer cluster artifacts (`TypeError` otherwise).
- Scores from different feature universes, `n_up` or WAGGR `mode`/`log_transform` are not comparable.

## See also

- `clustering-and-embedding.md`: choosing the partition and aligning artifacts to cell IDs.
- `features-and-graphs.md`: subclustering one lineage before naming its states.
- `quality-control.md`: doublet scores and QC covariates behind unresolved clusters.
- `plotting.md` (`dotplot`, `marker_heatmap`); `integration-and-comparisons.md` (label transfer,
  condition comparisons); `pipeline-runs-and-artifacts.md` (run fields, lineage).
