# Quality control

Check what the count matrix holds, inspect per-cell QC metrics, build immutable filtered cell
selections, audit removals without author labels, and score doublets. Docs:
<https://scarf.readthedocs.io/en/latest/tutorials/quality_control.html>, <https://scarf.readthedocs.io/en/latest/reference/api/datastore.html>,
<https://scarf.readthedocs.io/en/latest/reference/api/pipeline.html>.

## When to use

- Before the first graph on a new store, or whenever the analysed cell population changes.
- When the store comes from a public atlas, CELLxGENE or a Seurat submission: counts may be
  corrected, genes removed, or cells already filtered.
- When a run kept fewer cells than expected, and after a first clustering (doublets, QC clusters).

## Key concepts

- QC columns are written once, at the first writable open: `RNA_nCounts`, `RNA_nFeatures`,
  `RNA_percentMito` (`^MT-`, any case) and `RNA_percentRibo` (`^RPS|^RPL|^MRPS|^MRPL`) on feature
  `names`. For any other gene set use `run_feature_percentage` (an artifact, not a column).
- Filters never edit `I` (the live cell key): each returns a new immutable `ArtifactRef`
  (`kind="cell_selection"`). Omit `cell_selection=` to snapshot `I`; pass a selection to compose.
- `auto_filter_cells` defaults to pooled MAD (`n_mads=3`, scaled MAD = 1.4826 * MAD), chosen by
  column-name suffix: `nCounts`/`nFeatures` are filtered on log1p values with two-sided bounds;
  `percentMito`/`percentRibo` on raw values with an upper bound only; other names raw and
  two-sided. A metric with zero MAD is skipped with a warning. Bounds are exclusive.
- `parameters["resolved_bounds"]` are reported back on the raw scale: `low` and `high` are counts,
  genes or percent; never apply `expm1`. Example (10x 5K PBMC docs dataset): `RNA_nCounts` low
  3377.1 and high 18389.9 mean 3,377 to 18,390 counts.
- Every bound assumes raw UMI counts from unfiltered cell calls. Corrected (for example
  SCTransform) or pre-filtered matrices change what each bound means: check the matrix first.
- Pooled MAD erases real populations: platelets, erythrocytes and neutrophils fall under lower
  bounds (floors near 200 to 650 genes); plasma, cycling and progenitor cells cross upper bounds;
  myeloid cells carry more mito, so a pooled mito bound trims them first. Example (10x 5K PBMC
  docs dataset): even on cells filtered once before, pooled 3-MAD kept 6 of 15 platelet-like cells.

## Recipes

### Check the matrix first

`scripts/inspect_store.py STORE.zarr` (in the maintained copy of this skill in the Scarf
repository; this catalogue copy does not include it) runs these checks with hints.
By hand, read-only; the count read is the first 300 cells only (one small read on a mount):

```python
import numpy as np
import pandas as pd
import scarf

ds = scarf.DataStore("analysis.zarr", zarr_mode="r")
sample = ds.RNA.rawData[:300].compute()
nonzero = sample[sample != 0]
print("integer-like", bool(np.all(nonzero == np.round(nonzero))), "negative", bool((sample < 0).any()))
author = [c for c in ds.cells.columns if c.startswith(("nCount_", "nFeature_"))]  # adapt names
qc = ds.cells.to_pandas_dataframe(["RNA_nCounts", "RNA_nFeatures"] + author, key="I")
print(qc.describe(percentiles=[0.01, 0.05, 0.5, 0.95, 0.99]).round(1))
print("share within 5% of min:", {c: round(float((qc[c] <= qc[c].min() * 1.05).mean()), 4) for c in qc})
spread = {c: np.subtract(*np.percentile(np.log1p(qc[c]), [95, 5])) for c in ("RNA_nCounts", "RNA_nFeatures")}
print("spread ratio nFeatures/nCounts:", round(spread["RNA_nFeatures"] / spread["RNA_nCounts"], 2))
if author:
    print(qc.corr(method="spearman").loc[["RNA_nCounts", "RNA_nFeatures"], author].round(3))
```

| Signal | Reading |
| --- | --- |
| Nonzero values not integers, or negatives | Normalized, scaled or log values, not counts. Re-import a raw layer (`data-access.md`). |
| Spread ratio above 1: genes vary more than totals | Depth-equalized counts, for example SCTransform. Raw UMIs are usually below 1. |
| Store `nFeatures` matches author `nFeature_SCT` (Spearman about 1) | SCT-corrected counts. Integer values do not prove raw UMIs. |
| Store totals below author raw `nCount_RNA`, Spearman well below 1 | Corrected counts, removed genes (for example rRNA) or another layer. |
| 0.5% or more of cells within 5% of the minimum; a minimum or maximum just inside a round number (1,000 counts, 200 genes, 20% mito) | A hard cutoff before import: cells were already filtered. |
| Fewer active than total cells | An earlier filter edited `I`; active ranges are truncated. |

Example (10x 5K PBMC docs dataset): integer `uint32` counts and a spread ratio of 0.78 (raw UMIs),
but `I` keeps 3,948 of 5,025 cells, and active cells sit just inside 1,000 to 15,000 counts, 500 to
4,000 genes and 15% mito: an earlier filter edited `I`.

With corrected or pre-filtered counts, QC bounds lose their meaning: depth bounds on SCT totals
measure the correction, and refiltering filtered cells mostly trims real populations. Skip
`nCounts` bounds; use flag-only QC (a status column, nothing removed) or a gentle, audited filter
(per-sample 5-MAD on `RNA_nFeatures` and `RNA_percentMito`). The report states what the matrix
holds, any visible prior bounds, and why QC was gentle. Count models need raw UMIs.

### Distributions, default filter and candidate policies

Distributions are metadata-only; group them by sample or capture, never by held-out labels. Then
build several policies, including gentle ones that keep high-RNA and low-complexity populations.

```python
from scarf.plotting import CellField

ds = scarf.DataStore("analysis.zarr", min_features_per_cell=-1)  # writable reopen
qc_cols = [c for c in ("RNA_nCounts", "RNA_nFeatures", "RNA_percentMito", "RNA_percentRibo")
           if c in ds.cells.columns]
cells = ds.snapshot_cell_selection("I")  # ArtifactRef(kind="cell_selection")
ds.plots.distribution(keys=qc_cols, cell_selection=cells, kind="violin", max_points=2000)
ds.plots.distribution(keys=["RNA_nCounts", "RNA_nFeatures"], grouping=CellField("sample_id"),
                      cell_selection=cells, max_points=0)  # "sample_id" is your column name

def mask(ref):
    return np.asarray(ds.load_artifact(ref)["values"][:], dtype=bool)

auto = ds.auto_filter_cells(cell_selection=cells)  # pooled MAD over the default columns
params = ds.inspect_artifact(auto).parameters
print(pd.DataFrame(params["resolved_bounds"]["all"]).T[["low", "high", "skip_reason"]])  # raw scale
mito = ds.auto_filter_cells(["RNA_percentMito"], cell_selection=cells)  # upper MAD bound only
floors = ds.filter_cells(["RNA_nFeatures", "RNA_nCounts"], lows=[200, 500], highs=[None, None],
                         cell_selection=mito)  # composes with the mito selection
loose = ds.auto_filter_cells(cell_selection=cells, n_mads=5)
manual = ds.filter_cells(["RNA_nFeatures", "RNA_percentMito"], lows=[200, None], highs=[None, 20],
                         cell_selection=cells)
candidates = {"mad3": auto, "mad5": loose, "mito+floors": floors, "manual": manual}
print({name: int(mask(ref).sum()) for name, ref in candidates.items()})
```

### Audit what was removed, without labels

Do not read author labels. Run an unfiltered scaffold clustering, name its clusters by markers,
and report each candidate's retention per scaffold cluster and per marker-positive group. Costs
one pipeline run plus one small count pass (the panel export).

```python
scaffold = ds.pipeline.run(label="qc_scaffold", filtering=False, cell_cycle=False, paris=False)
in_run = mask(scaffold["analysis_cell_selection"])
clusters = np.asarray(scaffold.cells.fetch("clusters"))
kept = pd.DataFrame({name: mask(ref)[in_run] for name, ref in candidates.items()})
top = ds.get_markers(marker=scaffold["markers"]).groupby("group_id", sort=False).head(5)
markers = top.groupby("group_id")["feature_name"].agg(", ".join)
by_cluster = kept.groupby(clusters).mean().round(2).assign(n=kept.groupby(clusters).size())
by_cluster["markers"] = markers.reindex(by_cluster.index.astype(str)).to_numpy()
print(by_cluster.to_string())

panel = ["PPBP", "PF4", "JCHAIN", "MZB1", "HBB", "CSF3R", "FCGR3B", "MKI67", "TOP2A", "CD34",
         "CD3E", "MS4A1", "LYZ", "CD14", "MALAT1"]  # human blood; adapt genes and rules to tissue
names = set(ds.RNA.feats.fetch_all("names"))  # mouse symbols differ (Ppbp, Hbb-bs); map Ensembl IDs
print("panel genes not in this store:", [g for g in panel if g not in names])
panel = [g for g in panel if g in names]  # an absent name raises KeyError in to_anndata
ad = ds.to_anndata(feature_names=panel)  # raw counts of active cells, rows named by cell ids
counts = pd.DataFrame(ad.X.toarray(), index=ad.obs_names, columns=panel)
counts = counts.reindex(scaffold.cells.fetch("ids"))
rules = {"platelet PPBP+PF4+": {"PPBP": 1, "PF4": 1},  # minimum raw count of every gene
         "plasma MZB1>=3 JCHAIN>=3": {"MZB1": 3, "JCHAIN": 3},
         "erythroid HBB>=10": {"HBB": 10},
         "neutrophil CSF3R+FCGR3B+": {"CSF3R": 1, "FCGR3B": 1},
         "cycling MKI67+TOP2A+": {"MKI67": 1, "TOP2A": 1},
         "progenitor CD34+": {"CD34": 1}}
groups = {g: (counts[list(r)] >= pd.Series(r)).all(axis=1)
          for g, r in rules.items() if set(r) <= set(panel)}  # a group missing a gene is skipped
by_group = pd.DataFrame({g: kept[m.to_numpy()].mean() for g, m in groups.items()}).T
print(by_group.assign(n=[int(m.sum()) for m in groups.values()]).round(2))

debris = pd.DataFrame({"nFeatures": ds.cells.fetch_all("RNA_nFeatures")[in_run],
                       "percentMito": ds.cells.fetch_all("RNA_percentMito")[in_run],
                       "marker_positive": pd.DataFrame(groups, index=counts.index)
                       .any(axis=1).to_numpy()})
if "MALAT1" in panel:
    debris["MALAT1"] = counts["MALAT1"].to_numpy() > 0
for name in candidates:  # rows: False = removed, True = kept
    print(name, debris.groupby(kept[name].to_numpy()).agg(["median", "mean"]).round(2), sep="\n")
```

- A scaffold cluster or marker group losing more than about a third of its cells is biology being
  removed: pick a gentler policy or exempt that population explicitly.
- Debris shows low `nFeatures`, no `MALAT1` (a nuclear lncRNA), high mito and no lineage marker.
  Platelets and erythrocytes also lack `MALAT1` (no nucleus) but carry `PPBP`/`PF4` or `HBB`.
- Marker gates are starting points on raw counts. Ambient RNA (`JCHAIN`, `HBB`, `PPBP`) is
  detected at low levels in many cells, hence two markers or a higher count per gate.

Optional post-hoc audit, only after your own labels are frozen or when labels are not held out:

```python
labels = ds.cells.fetch_all("author_cell_type")[in_run]  # post hoc only; your column name
print(kept.groupby(labels).mean().round(2))
```

### Per-sample (capture-aware) MAD

Bounds are estimated within each sample of a real sample or capture column. Groups below
`min_cells_per_sample` are kept unfiltered with a warning. Missing labels among active cells raise.
For hashtag data pass `sample_artifact=NamedCellArtifact("hto", hto_ref)` (`kind="hto_identity"`).

```python
per_sample = ds.auto_filter_cells(cell_selection=cells, sample_column="sample_id", n_mads=3.0,
                                  min_cells_per_sample=20)  # "sample_id" is your column name
bounds = ds.inspect_artifact(per_sample).parameters["resolved_bounds"]  # {sample: {metric: {...}}}
for side in ("low", "high"):  # raw scale; a low near zero means no floor in that sample
    print(side, pd.DataFrame({s: {m: b[side] for m, b in d.items()} for s, d in bounds.items()}).T)
```

### Pipeline filtering and feeding a custom selection

`filtering=True` (default) is pooled MAD on the four default columns, stored as its own artifact
(`run["analysis_cell_selection"]`; compare masks, not refs). Other accepted values:
`False`; `{"method": "mad", "n_mads": 5, "sample_column": "sample_id", "min_cells_per_sample": 20}`;
`{"method": "gaussian", "min_p": 0.01, "max_p": 0.99}`; and
`{"method": "manual", "attrs": [...], "lows": [...], "highs": [...], "keep_bounds": False}`.
Unknown keys raise early. To run on a granular selection, insert it as a boolean column and
disable pipeline filtering:

```python
run_manual = ds.pipeline.run(label="qc_manual", filtering={
    "method": "manual", "attrs": ["RNA_nFeatures", "RNA_percentMito"], "lows": [200, None],
    "highs": [None, 20]}, snapshot_columns=("RNA_nCounts", "RNA_percentMito"))
ds.cells.insert("qc_pass", mask(floors), overwrite=True)
run_custom = ds.pipeline.run(label="qc_custom", cell_key="qc_pass", filtering=False)
assert np.array_equal(mask(run_custom["analysis_cell_selection"]), mask(floors))
```

### Custom feature-percentage metric

```python
from scarf.metadata.selection import NamedCellArtifact

names = ds.RNA.feats.fetch_all("names").astype(str)
hb = ds.set_feature_selection(from_assay="RNA", mask=np.isin(names, ["HBA1", "HBA2", "HBB"]))
pct_hb = ds.run_feature_percentage(cells, hb)  # kind="quality_metric"; one count pass; no column
no_rbc = ds.select_cells(pct_hb, high=5.0, cell_selection=floors)  # fixed bound, composed
mad_hb = ds.auto_filter_cells(["RNA_percentMito"], cell_selection=cells,
                              artifact_metrics=[NamedCellArtifact("percentHb", pct_hb)])
# A mostly-zero metric (percentHb in PBMC) has zero MAD and is skipped: use a fixed bound.
```

### Doublet scores

The pipeline scores doublets by default (it needs a graph and a clustering). High-RNA types such as
plasma cells score high as a whole, so never threshold globally: rank cells within their cluster
and require co-expressed markers of two lineages.

```python
scores = pd.Series(np.asarray(scaffold.cells.fetch("doublet_score")))
print(scores.groupby(clusters).median().round(2))  # compare clusters within a lineage
spread = scores.groupby(clusters).transform(lambda s: 1.4826 * (s - s.median()).abs().median())
relative = (scores - scores.groupby(clusters).transform("median")) / (spread + 1e-6)
two_lineage = (((counts.CD3E > 0) & (counts.LYZ >= 5)) | ((counts.MS4A1 > 0) & (counts.LYZ >= 5))
               | ((counts.MZB1 >= 3) & (counts.CD14 > 0))).to_numpy()
suspect = (relative.to_numpy() > 3) & two_lineage
singlet = in_run.copy()
singlet[np.flatnonzero(in_run)[suspect]] = False
ds.cells.insert("qc_singlet", singlet, overwrite=True)  # then cell_key="qc_singlet"
doublets = ds.run_doublet_detection(scaffold["clusters"], scaffold["connectivity_map"])  # explicit
```

## Parameters that matter

| Parameter | Default | Change when |
| --- | --- | --- |
| `auto_filter_cells(n_mads=)` | `3.0` | Raise (for example 5) when real populations sit in the tails. |
| `auto_filter_cells(attrs=)` | the four `RNA_*` QC columns | Drop count bounds on corrected counts or when they remove high-RNA types. |
| `sample_column=` / `sample_artifact=` | `None` (pooled) | Several samples, captures or depths. MAD only. |
| `min_cells_per_sample=` | `20` | Small samples; groups below it are kept unfiltered. |
| `method=` (`min_p`, `max_p`) | `"mad"` | `"gaussian"` only to reproduce the old policy; `min_p`/`max_p` with MAD raise. |
| `pipeline.run(filtering=False, cell_cycle=False, paris=False)` | filtering on | Scaffold run for the label-free audit. |
| `run_doublet_detection(random_seed=)` | `4444` | Keep fixed; change only to test score stability. |

## Check before moving on

- The report states what the matrix holds: raw UMIs, corrected counts, removed genes, pre-filtered.
- Retention per sample, per scaffold cluster and per marker-positive group. A population losing
  more than about a third of its cells needs a reason, not a default.
- `resolved_bounds` (raw scale) sit in distribution tails, not inside a mode. Per sample, a low near
  zero means no floor there. Negative lows (Gaussian on skewed counts) mean no lower filtering.
- Removed cells look like debris, not platelets, plasma, erythroid, neutrophil, cycling or CD34+.
- After clustering, QC metrics by cluster (`ds.plots.distribution(keys=qc_cols,
  grouping=run["clusters"])`): a cluster defined only by low counts or high mito is a QC suspect.
- Doublet suspects are high within their own cluster and co-express markers of two lineages.

## Pitfalls

- Accepting pipeline defaults without the audit above.
- Applying `expm1` to `resolved_bounds` (already raw scale), or taking integer values as raw UMIs
  (SCT-corrected counts are integers too). On corrected or pre-filtered counts, filter gently.
- Pooling samples with different depths under one bound; use `sample_column`.
- Per-sample MAD on a bimodal sample, for example one dominated by erythrocytes: the wide MAD can
  put the lower bound near zero (no floor), or the dominant mode pushes the other population out.
  Read per-sample lows and marker-group retention in that sample.
- Upper `nCounts`/`nFeatures` bounds or a global doublet-score threshold as a doublet filter: both
  remove plasma and other large cells. Compare scores within a lineage and check markers.
- Calling CD34+ progenitors multiplets. Progenitors show a coherent program (`CD34`, `PRSS57`,
  `SPINK2`, `SOX4`, often `GATA2`, `CYTL1`) and no second lineage, even with high counts and
  doublet scores. Multiplets co-express full marker sets of two lineages (`CD3E` with `LYZ` or
  `CD14`; `MZB1` with `CD14`), exceed both parents in counts and sit between their clusters.
- Expecting `I` to shrink after filtering. Pass the returned ref, or use a column with `cell_key=`.
- `run.cells` exposes `names`, run results and `snapshot_columns`, not filter columns. QC columns
  need `snapshot_columns=(...)` or `ds.cells.fetch_all(col)[mask]`.

## See also

- `data-access.md`: raw layers on import; a read-only first look at a store.
- `features-and-graphs.md`: feature selection and graph construction on the filtered selection.
- `pipeline-runs-and-artifacts.md`: run records, lineage and artifact inspection.
- `plotting.md`: distribution, dotplot and embedding options.
- `integration-and-comparisons.md`: per-sample reporting for condition comparisons.
