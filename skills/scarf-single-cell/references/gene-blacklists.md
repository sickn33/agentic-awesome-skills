# Gene blacklists for HVG selection

What `select_hvgs(blacklist=...)` removes, how to check it on your store, the corrected strings to
pass today, and when to add the clonotype or haemoglobin add-ons. Docs:
<https://scarf.readthedocs.io/en/latest/tutorials/feature_selection.html>, <https://scarf.readthedocs.io/en/latest/reference/api/pipeline.html>.

## When to use

- Before the baseline run on any new store, to see what the default blacklist matches there.
- The store uses current HGNC or MGI histone symbols (`H2AC*`, `H3C*`, `H4C*`, `H1-*`), as Cytebase
  datasets do. The default `^HIST` then matches nothing; only older `HIST1H*` references match.
- Fibroblast, smooth-muscle, endothelial or tumour data, where `CCN1`/`CCN2` (CYR61/CTGF) or
  `CCND1`/`CCND2` carry biology that the default `^CCN` hides.
- Plasma-cell-rich or B-cell-rich samples, mouse data, or haemoglobin genes among the top HVGs.

## Key concepts

- The blacklist is one regular expression, matched case-insensitively with `re.match` against
  feature `names` (never `ids`). Each `|` alternative is anchored at the start of the name.
- It only removes HVG candidates. Markers, plots, gene scores and QC still see every gene.
- The string and the matched-gene fingerprint are part of the HVG artifact identity. Changing the
  string creates new HVG, normalization, PCA and graph artifacts; the same string reuses them.
- HVG selection also drops ubiquitous genes (`max_cells` = selected cells - 20), so most `MT-` and
  cytosolic ribosomal genes never compete. On the 10x 5K PBMC docs dataset, unblocking either
  family added no gene to the top 1000.
- `RNA_percentMito` and `RNA_percentRibo` were fixed at first open from the `^MT-` and
  `^RPS|^RPL|^MRPS|^MRPL` patterns; `blacklist=` never changes them. The RPS6K kinases and other
  off-targets added under 1% of `percentRibo` counts in testing, so the column needs no correction.
- Names that are Ensembl IDs match nothing: no blacklist effect, no error, and no
  `percentMito`/`percentRibo` columns (only a warning at first open). Build the string from the
  family genes' IDs instead (`^ENSG00000198888$|...`), and percentages with `run_feature_percentage`.
- Default families and verdicts:

| Family | Default | Problem | Recommended |
| --- | --- | --- | --- |
| mitochondrial | `^MT-` | none; mouse `mt-` matches | keep |
| ribosomal | `^RPS\|^RPL\|^MRPS\|^MRPL` | also RPS6KA/B kinases, `RPS19BP1`, `L` paralogs, -AS1/-DT RNAs | exact protein symbols |
| cellCycleCcn | `^CCN` | hits CCN1-6 (CTGF, CYR61, NOV, WISP), CCND1-3, CCNT/K/H/L; misses MKI67, TOP2A | drop; score the cell cycle instead |
| hla / h2 | `^HLA-` / `^H2-` | whole MHC I and II; removal did not create donor clusters in testing | keep |
| histone | `^HIST` | matches only pre-2020 symbols | old and current replication-dependent names |
| sexLinked | 10 human names | mouse `Eif2s3y`, `Zfy1/2` missed | add mouse genes |

## Recipes

### Recommended strings

```python
import re

import numpy as np
import pandas as pd
import scarf
from scarf.features.gene_families import GENE_FAMILY_PATTERNS
from scarf.features.variability import DEFAULT_HVG_BLACKLIST

MITO = r"^MT-"
RIBO = r"^RP[SL]\d+[AXY]?\d*$|^RPLP[0-2]$|^RPSA$|^MRP[SL]\d+[A-C]?$"
HISTONE = (r"^HIST[1-4]H|^H1-[1-6]$|^H1F[1-6]$|^H2AC\d+$|^H2BC\d+$|^H3C\d+$|^H4C\d+$"
           r"|^H2AW$|^H3-4$|^H4-16$")  # replication-dependent; replacement histones kept
HUMAN_BLACKLIST = "|".join([MITO, RIBO, r"^HLA-", HISTONE,
    r"^XIST$|^DDX3Y$|^USP9Y$|^EIF1AY$|^KDM5D$|^SRY$|^ZFY$|^UTY$|^TMSB4Y$|^NLGN4Y$"])
MOUSE_BLACKLIST = "|".join([MITO, RIBO, r"^H2-", HISTONE,
    r"^XIST$|^TSIX$|^DDX3Y$|^EIF2S3Y$|^KDM5D$|^UTY$|^ZFY[12]$|^SRY$"])
CLONOTYPE_ADDON = r"^IG[HKL]V|^IG[HKL]J\d|^IGHD\d"  # V, J, D segments; not IGHD or IGKC/IGLC
HAEMOGLOBIN_ADDON = r"^HB[ABDEGMQZ]\d*$|^HB[AB]-"  # spares HBEGF, HBP1, HBS1L
```

Add-ons are appended: `HUMAN_BLACKLIST + "|" + CLONOTYPE_ADDON`. Patterns are case-insensitive,
so the human string also works on title-case names; prefer the species string anyway.

### Inspect what the default removes on this store

```python
scarf.configure_output(level="WARNING", progress=False)
ds = scarf.DataStore("analysis.zarr", min_features_per_cell=-1)  # reopen; see data-access.md
names = ds.RNA.feats.fetch_all("names").astype(str)
print("Ensembl-like names:", int(pd.Series(names).str.match(r"ENS[A-Z]*G\d").sum()), "of", len(names))
for family, pattern in GENE_FAMILY_PATTERNS.items():
    hits = ds.RNA.feats.grep(pattern)  # upper-cased names
    print(f"{family:13s} {len(hits):4d}", hits[:6])
print("current histone symbols the default misses:",
      len(ds.RNA.feats.grep(r"^H2AC\d|^H2BC\d|^H3C\d|^H4C\d|^H1-[1-6]$")))
print("default-only matches:",
      sorted(set(ds.RNA.feats.grep(DEFAULT_HVG_BLACKLIST)) - set(ds.RNA.feats.grep(HUMAN_BLACKLIST))))

run = ds.pipeline.open(label="baseline")
cells = run["analysis_cell_selection"]


def selected(ref):
    return set(names[np.asarray(ds.load_artifact(ref)["values"][:], dtype=bool)])


hvg_default = run["highly_variable_features"]  # same as select_hvgs(cells, top_n=1000)
hvg_open = ds.select_hvgs(cells, top_n=1000, blacklist="", show_plot=False)  # no name filter
print("removed by the default:", sorted(selected(hvg_open) - selected(hvg_default)))
```

The last line is what the default actually costs. 10x 5K PBMC docs dataset: 17 genes, namely 9
MHC class II, 6 histones, `CCND3` and `CCNL1`.

### Apply a string and check the HVGs

```python
hvg_fixed = ds.select_hvgs(cells, top_n=1000, blacklist=HUMAN_BLACKLIST, show_plot=False)
print("entered:", sorted(selected(hvg_fixed) - selected(hvg_default)))
print("left:", sorted(selected(hvg_default) - selected(hvg_fixed)))
blocked = re.compile(HUMAN_BLACKLIST, re.IGNORECASE)
assert not any(blocked.match(gene) for gene in selected(hvg_fixed))

run_fixed = ds.pipeline.run(label="baseline_blacklist_fixed",
                            params={"hvg": {"blacklist": HUMAN_BLACKLIST}})
print(run_fixed["highly_variable_features"] == hvg_fixed,
      ds.inspect_artifact(run_fixed["highly_variable_features"]).parameters["blacklist"]
      == HUMAN_BLACKLIST)
```

The pipeline returns the very ref of the explicit call when its cells match. Compare the two
runs' partitions with `clustering-and-embedding.md`. 10x 5K PBMC docs dataset: `CCND3` and `CCNL1`
entered, and the Leiden 1.0 partitions agreed (ARI 0.82) about as well as two Leiden seeds of the
baseline (0.85).

### Decide on the add-ons with marker evidence

```python
top = ds.get_markers(marker=run_fixed["markers"]).groupby("group_id", sort=False).head(10)
clonal = top[top["feature_name"].str.match(CLONOTYPE_ADDON, case=False)]
print("V/J genes among HVGs:", sum(bool(re.match(CLONOTYPE_ADDON, g, re.I)) for g in selected(hvg_fixed)))
print(clonal.groupby("group_id")["feature_name"].agg(", ".join))  # clusters led by V genes
panel = ["JCHAIN", "MZB1", "IGKC", "IGLC2", "IGHA1", "IGHG1", "IGHM", "MKI67",
         "HBB", "HBA1", "ALAS2", "CA1", "AHSP", "SLC4A1"]
markers = ds.get_markers(marker=run_fixed["markers"], min_score=-1, min_frac_exp=-1)
frac = markers[markers["feature_name"].isin(panel)].pivot_table(
    index="group_id", columns="feature_name", values="frac_exp")
print(frac.round(2).to_string())
```

- Clonotype add-on: use it when two or more clusters share plasma or B markers (`JCHAIN`, `MZB1`,
  `CD79A`) and differ mainly by `IGKC` versus `IGLC*` or by V genes in their top markers. Rerun
  with `HUMAN_BLACKLIST + "|" + CLONOTYPE_ADDON` under a new label and confirm that the plasma
  clusters now differ by isotype (`IGHA1`, `IGHG1`, `IGHM`) or state (`MKI67`), not light chain.
  Skip it when expanded clones are the question; use VDJ data then.
- Haemoglobin add-on: use it when `HBB`/`HBA1` are among the HVGs and are detected at low
  fractions across clusters that lack `ALAS2`, `CA1`, `AHSP` and `SLC4A1` (ambient RNA). Do not
  use it when a cluster expresses those erythroid markers; remove contaminating red cells at QC.

## Parameters that matter

| Parameter | Default | Change when |
| --- | --- | --- |
| `select_hvgs(blacklist=)` | `DEFAULT_HVG_BLACKLIST` | Always pass a species string on current-symbol stores. |
| `params={"hvg": {"blacklist": ...}}` | default regex | Same string through `ds.pipeline.run`; new label per string. |
| `blacklist=""` | | Diagnostics only: shows what the name filter removes. |
| `select_hvgs(max_cells=)` | selected cells - 20 | `np.inf` lets ubiquitous genes compete; the blacklist then matters more. |

## Check before moving on

- The store has symbol names; every family you rely on matches the genes you expect.
- `inspect_artifact(hvg).parameters["blacklist"]` equals the string you recorded in the log.
- No HVG matches the string; the entered and left genes are listed in the analysis log.
- With the clonotype add-on, no cluster's top markers are V genes and plasma clusters are not
  split by `IGKC` versus `IGLC*`.

## Pitfalls

- Trusting the default on current symbols: replication-dependent histones become HVGs unnoticed.
- Writing `^IGHD` for D segments: it also removes the IgD constant gene. Use `^IGHD\d`.
- `^TR[ABDG]D` also matches `TRADD`; TCR V genes such as `TRDV2`, `TRGV9` and `TRAV1-2` mark
  gamma-delta and MAIT cells. T-cell clusters did not follow TRBV usage in testing, so no TCR
  add-on is recommended; consider `^TR[AB]V` only when a cluster is led by one TRAV/TRBV pair.
- `^HB` also removes `HBEGF`. Small clusters (under about 50 cells) move with any HVG change;
  compare across Leiden seeds before attributing a change to the blacklist.
- Run `groupby(...).head` on default-filtered marker tables; on a full table (`min_score=-1`) it
  crashed pandas 3.0 with a segmentation fault in testing.
- A blacklist never fixes QC: high `percentMito` cells or red-cell contamination need filtering.

## See also

- `features-and-graphs.md`: HVG diagnostics and branching the graph.
- `quality-control.md`: `percentMito`, `percentRibo` and `run_feature_percentage`.
- `markers-and-annotation.md`: marker tables and panels used for the add-on decisions.
- `pipeline-runs-and-artifacts.md`: `params`, labels and artifact identity.
