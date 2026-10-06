# Study design, integration, and condition comparisons

Identify donors, samples, batches and conditions, correct a technical batch with Harmony and score
it, then compare composition and expression at the donor level. Docs: <https://scarf.readthedocs.io/en/latest/tutorials/batch_correction.html>, and in the same folder
`pseudobulk_and_differential_expression.html`, `condition_comparisons.html`,
`dataset_merging.html`, `mapping_and_label_transfer.html`, `downsampling.html`.

## When to use

- The store has several donors, samples, batches or conditions (most CELLxGENE atlases), or a
  layout separates by donor or batch and you must decide whether to correct it.
- The question compares conditions (abundance of a population, or expression within one), or you
  need to combine stores, map a query onto a fixed reference, or work on fewer cells.

## Key concepts

- **Units.** A donor is the biological replicate; a sample is one specimen from one donor; a
  library is one capture; a batch is a processing group. Cells are never replicates: the n of a
  condition comparison is the number of donors. Sample, library and batch columns may be absent.
- **Nesting.** Donors nested in conditions need between-donor tests. A donor sampled at several
  timepoints is repeated measures: pair on the donor. A donor in both arms needs the rules below.
- **Denominators.** A share of all cells moves when any other population moves. A state's share of
  its lineage parent (an activated state as a share of CD14 monocytes) does not depend on the
  parent's abundance. Excluding contaminants (erythrocytes, platelets) or unresolved cells raises
  every remaining share by `1 / (1 - excluded share)`, a factor that differs between samples.
- **Harmony corrects coordinates only.** `run_harmony` returns a `batch_correction` ref that
  replaces PCA for ANN, neighbours, graph, UMAP and clustering; counts are untouched. A batch
  holding one condition loses that condition's signal; Scarf ran silently with `condition`.
- **Metrics are evidence, not a verdict.** `metric_*` take exact neighbour or graph refs and a live
  column and return a float. iLISI (mixing) should rise while cLISI and connectivity hold.
- **What Scarf tests.** `run_statistical_testing` runs donor-level rank tests (a
  `statistical_tests` artifact; several keys share one BH pass). No count GLM (DESeq2, edgeR) or
  compositional model (scCODA, propeller): export pseudobulk counts ("Export pseudobulk counts" in
  `performance-and-export.md`) and model one population at a time with donor-level terms.

## Recipes

### Audit the study design

Later recipes reuse these imports and `ds`. All column names are placeholders; `cell_type` stands
for your own annotation column, never for author labels that are held out.

```python
import re

import numpy as np
import pandas as pd
import scarf
from scarf.plotting import CellField

ds = scarf.DataStore("analysis.zarr", min_features_per_cell=-1)  # reopen; see data-access.md
hits = re.compile(r"donor|individual|patient|subject|sample|library|batch|"
                  r"condition|disease|treatment|time|day|assay|sex", re.I)
print([c for c in ds.cells.columns if hits.search(c)])

meta = ds.cells.to_pandas_dataframe(["donor_id", "condition", "timepoint", "batch"], key="I")
print(meta.isna().sum())                     # resolve missing labels first
print(meta.groupby("donor_id").agg(
    cells=("condition", "size"), conditions=("condition", "nunique"),
    timepoints=("timepoint", "nunique"), batches=("batch", "nunique"),
))
print(meta.drop_duplicates(["donor_id", "condition"])["condition"].value_counts())  # donors per arm
units = meta.drop_duplicates(["donor_id", "batch", "condition"])
print(pd.crosstab(units["batch"], units["condition"]))  # donors per batch x condition
```

`conditions == 1` for every donor means nested; `timepoints > 1` means repeated measures;
`conditions > 1` puts a donor in two arms. A batch row with donors in one condition only is
confounded with it. No sample column: join donor and timepoint strings (every row, none missing)
and `ds.cells.insert("sample_id", values, overwrite=True)`; `insert` writes to the store at once.

### Harmony through the pipeline, with a matched baseline

```python
design_cols = ("batch", "donor_id", "sample_id", "condition")   # Harmony columns first
native = ds.pipeline.run(label="native", snapshot_columns=design_cols)
corrected = ds.pipeline.run(
    label="harmony_batch", harmony_batch_columns=["batch"], snapshot_columns=design_cols,
)
assert native["pca"] == corrected["pca"]   # same frozen cells and PCA; only the graph differs
print(corrected["harmony"])                # ArtifactRef(kind='batch_correction')
```

The run's input snapshot is `names`, filter columns, Harmony columns, then `snapshot_columns`, in
order; another list or order gives a new analysis selection and recomputes everything (24
artifacts created, then 16 reused by the Harmony run; 10x 5K PBMC docs dataset). `run.cells`
exposes only `snapshot_columns`: read a filter or Harmony column with
`ds.cells.fetch_all(col)[run.cells.fetch_all("I")]`. Doublet scores still use plain PCA.

As a branch of a run, `harmony = ds.run_harmony(run["pca"], ["batch"])` returns a ref to pass to
`build_ann_index` in place of PCA (chain in `features-and-graphs.md`; keep the run's `k`). Score it
below with the run's `neighbors` and `connectivity_map` versus the new pair.

### Score native versus corrected

A shuffled batch column gives the iLISI of perfect mixing for the same graph and `k`. Label
concordance (ARI) needs two clustering refs on the same frozen cell selection.

```python
rng = np.random.default_rng(0)
ds.cells.insert("batch_shuffled", rng.permutation(ds.cells.fetch_all("batch")), overwrite=True)

def scores(neighbors, graph):
    return {
        "iLISI batch": ds.metric_ilisi("batch", neighbors),
        "iLISI ceiling": ds.metric_ilisi("batch_shuffled", neighbors),
        "batch mixing": ds.metric_proportional_batch_mixing("batch", neighbors),
        "cLISI cell_type": ds.metric_clisi("cell_type", neighbors),
        "connectivity cell_type": ds.metric_graph_connectivity("cell_type", graph),
    }

print(pd.DataFrame({
    "native": scores(native["neighbors"], native["connectivity_map"]),
    "harmony": scores(corrected["neighbors"], corrected["connectivity_map"]),
}).T.round(3))
print(ds.metric_label_concordance(native["clusters"], corrected["clusters"], metric="ari"))
for r in (native, corrected):   # a condition-only cluster that vanishes signals overcorrection
    print(pd.crosstab(r.cells.fetch("clusters"), r.cells.fetch("condition")))
```

### A donor sampled in two arms

Example: a donor's first sample is in arm A and a later one in arm B (ventilation status changed
between timepoints). Decide per comparison and write the rule down before testing:

- **Pool to one value per donor** when all of its samples fall in one group of this comparison
  (patients versus healthy donors). Pool donors with several samples in one arm the same way.
- **Drop it from the between-group test** of the arms it spans (A versus B). Its samples share
  genotype and history: counting it twice makes the groups dependent and invents a donor.
- **Describe it within the donor only.** Its B minus A change is one pair (n = 1): report the two
  values, never a p-value. An exact Wilcoxon needs 6 such pairs to reach 0.03125.
- If dropping leaves 3 versus 3 donors (minimum exact two-sided p 0.1), report n, medians and
  effect sizes without a test. Add a sensitivity run that excludes the donor everywhere.
- `sample_by="donor_id"` makes Scarf refuse such a donor ("Each sample must belong to exactly one
  group"); `sample_by="sample_id"` silently counts it in both arms.

### Composition per donor with exact tests

Per-unit proportions (a donor's samples pooled), two-sided Mann-Whitney between independent donor
groups, BH across populations, and the n = 1 rows of two-arm donors.

```python
from math import comb

from scipy.stats import PermutationMethod, false_discovery_control, mannwhitneyu

run = ds.pipeline.open(label="baseline")
in_run = np.asarray(run.cells.fetch_all("I"), dtype=bool)
cells = ds.cells.to_pandas_dataframe(["donor_id", "sample_id", "condition", "cell_type",
                                      "cell_state"])[in_run]
excluded = ["Erythrocyte", "Platelet", "Unresolved"]      # your contaminant and unresolved labels
drop = cells["cell_type"].isin(excluded)
print(drop.groupby(cells["sample_id"]).mean().round(3))   # report the removed share per sample
kept = cells[~drop]
arms = kept.groupby("donor_id")["condition"].nunique()
two_arm = arms.index[arms > 1].tolist()                   # donors sampled in both arms

per_sample = pd.crosstab(kept["sample_id"], kept["cell_type"], normalize="index")
independent = kept[~kept["donor_id"].isin(two_arm)]       # two-arm donors leave the tests
per_donor = pd.crosstab(independent["donor_id"], independent["cell_type"], normalize="index")
arm = independent.groupby("donor_id")["condition"].first()

def exact_tests(props, arm, g1, g2):
    rows = []
    for pop in props.columns:
        x = props[pop].reindex(arm.index[arm == g1]).dropna()   # units without a value drop out
        y = props[pop].reindex(arm.index[arm == g2]).dropna()
        row = {"population": pop, "n_1": len(x), "n_2": len(y), "median_1": x.median(),
               "median_2": y.median(), "auc": np.nan, "p_exact": np.nan}
        if min(len(x), len(y)) >= 2:   # as in Scarf: fewer than 2 units in a group is not tested
            exact = comb(len(x) + len(y), len(x)) <= 100_000    # Scarf's switch to asymptotic
            method = PermutationMethod(n_resamples=np.inf) if exact else "asymptotic"
            u = mannwhitneyu(x, y, method=method)               # the exact null counts ties
            row.update(auc=u.statistic / (len(x) * len(y)), p_exact=u.pvalue)
        rows.append(row)
    table = pd.DataFrame(rows)
    tested = table["p_exact"].notna()   # untested rows keep NaN and stay out of the correction
    table["p_bh"] = np.nan
    table.loc[tested, "p_bh"] = false_discovery_control(table.loc[tested, "p_exact"], method="bh")
    return table

print(exact_tests(per_donor, arm, "ctrl", "case").round(4))
parent = kept[kept["cell_type"] == "CD14 monocyte"]       # lineage parent as denominator
state = (parent["cell_state"] == "CD14 monocyte (state 1)").groupby(parent["donor_id"]).mean()
print(exact_tests(state.to_frame("state 1 of CD14 monocytes"), arm, "ctrl", "case").round(4))
sample_info = kept.groupby("sample_id")[["donor_id", "condition"]].first()
print(per_sample.join(sample_info)[lambda t: t["donor_id"].isin(two_arm)].round(3))  # n = 1
```

The same test in Scarf (a saved artifact): a 0/1 column averaged per donor is the donor's share,
and the cell selection is the denominator (snapshot the parent's cells for a parent share).

```python
labels, donors = ds.cells.fetch_all("cell_type"), ds.cells.fetch_all("donor_id")
keys = []
for pop in per_donor.columns:
    keys.append("is_" + re.sub(r"\W+", "_", pop))
    ds.cells.insert(keys[-1], (labels == pop).astype(np.float64), overwrite=True)
counted = in_run & ~np.isin(labels, excluded) & ~np.isin(donors, two_arm)
ds.cells.insert("in_composition", counted, overwrite=True)
result = ds.run_statistical_testing(
    keys, CellField("condition"), cell_selection=ds.snapshot_cell_selection("in_composition"),
    groups=["ctrl", "case"], test="mann_whitney", sample_by="donor_id",
)
print(result.p_value_method, pd.concat([result.tables[k].assign(key=k) for k in keys]))
```

Both routes gave identical exact and BH p-values on a synthetic design. Report n per group,
medians, AUC (`U / (n_1 n_2)`; 0.5 is no shift) and BH values, then repeat with all cells as the
denominator. `ds.plots.composition(..., kind="per_sample", study_design=...)` draws a strip of
sample proportions per category (its intervals count samples, so a two-sample donor counts twice);
`kind="stacked", sample_by=...` draws one stacked bar per sample.

### Donor-level expression tests

```python
is_b = in_run & (labels == "B cell")
ds.cells.insert("is_b_cell", is_b, overwrite=True)
ds.cells.insert("one_arm_donor", ~np.isin(donors, two_arm), overwrite=True)
b_cells = ds.snapshot_cell_selection("is_b_cell")                  # frozen cell_selection ref
between = ds.run_statistical_testing(                              # donors nested in condition
    ["CD79A", "MS4A1"], CellField("condition"), cell_selection=b_cells, subset_by="one_arm_donor",
    groups=["ctrl", "case"], test="mann_whitney", sample_by="donor_id",
)
within = ds.run_statistical_testing(                               # same donor, two timepoints
    ["CD79A", "MS4A1"], CellField("timepoint"), cell_selection=b_cells,
    groups=["t0", "t1"], test="wilcoxon", sample_by="sample_id", pair_by="donor_id",
)
print(between.tables["CD79A"], within.tables["CD79A"], between.artifact, sep="\n")
```

Expression is averaged per sample, then ranked; `groups` fixes the order (`mean_difference =
mean_1 - mean_2`). Mann-Whitney is exact up to 100,000 group splits (`result.p_value_method`);
Wilcoxon keeps donors seen at both levels (`n_pairs`). Reload: `ds.get_statistical_tests(ref)`.

### Merge, map, downsample

`scarf.DataStoreMerge(datasets=[ds_a, ds_b], zarr_path=..., names=[...], assays=["RNA"],
prepend_text="orig", source_column="dataset", overwrite=True).dump()` gives an uncorrected joint
store; drop `is_primary_data == False` cells first and score iLISI before Harmony (not executed:
`MemoryError` under a 3 GB budget). Mapping keeps a reference fixed; the query is another store.

```python
reference = ds.get_mapping_reference(ds.build_mapping_reference(native["neighbors"]))
query = scarf.DataStore("query.zarr", default_assay="RNA")
mapping_ref = query.run_mapping(reference, query.snapshot_cell_selection("I"), save_k=5)
print(query.get_mapping_result(mapping_ref, reference=reference).diagnostics)
labels = query.get_target_classes(mapping_ref, "cell_type", reference=reference,
                                  threshold_fraction=0.6)
query.cells.insert("transferred_cell_type", labels.to_numpy(), overwrite=True)  # "NA" = abstained
```

`ds.run_topacedo_sampler(graph, paris, max_sampling_rate=0.1)` keeps graph coverage, not
proportions (`sampled` is in graph-row order); to balance donors, snapshot a seeded mask instead.

## Parameters that matter

| Parameter | Default | Change when |
| --- | --- | --- |
| `harmony_batch_columns` / `batch_columns` | `None` (off) / required | Technical columns only |
| `neighbors_k` / `query_neighbors(k=)` | 11 | 21 or more when LISI metrics decide |
| metric `perplexity` | `None` = `floor(k/3)` | Keep fixed across graphs; capped at `k/3` |
| `sample_by` / `pair_by` | `None` | Always `sample_by`; `pair_by` only if repeated |
| `sample_stat` | `"mean"` | `"fraction"` + `expression_cutoff` for detection |
| `subset_by` | `None` | A boolean column, e.g. to drop two-arm donors |

## Check before moving on

- Every sample maps to one donor and one condition; donors per arm is the n; read confounding from
  donors (`units`), not cells.
- Each donor counts once per test: `n_1` and `n_2` are donors, two-arm donors are pooled or
  dropped as decided, and the denominator and the excluded share per sample are reported.
- After Harmony: iLISI moves toward the shuffled ceiling, cLISI and connectivity do not drop, no
  condition-only cluster vanishes, and the ARI against native is explainable.

## Pitfalls

- `insert` stores `None` as `""` (Harmony silently treats it as a level; metrics raise) and `pd.NA`
  as the literal `"<NA>"` (a real group everywhere). `to_pandas_dataframe` shows missingness.
- Correcting on `donor_id` or `sample_id` with a donor-level condition aligns donors and can absorb
  the condition. Prefer library or batch; otherwise recheck condition-specific clusters.
- iLISI depends on `k`: a random synthetic batch scored 0.34, 0.67 and 0.76 at `k` 11, 21 and 31
  (10x 5K PBMC docs dataset). CELLxGENE `cell_type` may come from the authors' own integration,
  biasing cLISI toward it.
- `pair_by` on donors nested in conditions raises "Duplicate (pair, group) rows"; use `sample_by`.
- `scipy.stats.mannwhitneyu(method="exact")` ignores ties (donors at 0 tie), so it disagrees with
  Scarf; `PermutationMethod(n_resamples=np.inf)` matches it but is exhaustive (12 versus 12: 20 s).
- Without `cell_selection`, a `CellField` grouping covers every stored cell, `I` False included.
- Marker search, Welch and ANOVA treat cells as observations; never use them for condition claims.
- A Symphony-style mapping correction (`query_batches`) needs a technical batch, never a condition.

## See also

- `quality-control.md`, `features-and-graphs.md`, `markers-and-annotation.md`, `plotting.md`
  (`composition`), `pipeline-runs-and-artifacts.md`, `performance-and-export.md` (pseudobulk).
