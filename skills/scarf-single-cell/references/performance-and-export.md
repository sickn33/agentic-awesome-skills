# Performance and export

Resource budgets, out-of-core rules, remote I/O on mounts, and exporting counts, metadata,
markers, and pipeline-run results. Docs: <https://scarf.readthedocs.io/en/latest/concepts/memory_and_execution.html>,
<https://scarf.readthedocs.io/en/latest/tutorials/remote_stores.html>, <https://scarf.readthedocs.io/en/latest/tutorials/import_and_export.html>,
<https://scarf.readthedocs.io/en/latest/tutorials/custom_analyses.html>, <https://scarf.readthedocs.io/en/latest/concepts/benchmarks.html>.

## When to use

- Before a large run, on a shared host, or in a batch job.
- When analysis on a mount is slow or will make many passes over counts.
- When handing results to Scanpy, Seurat, R, a count model, or a colleague.
- When a step may outlast the agent shell's foreground limit.

## Key concepts

- `mem_budget` is a planning budget (block size, write concurrency, feature batch size), not an
  RSS cap. Graphs, marker batches, and allocator overhead come on top: in the benchmarks a 5M-cell
  run peaked at 51.6 GiB on a 48 GiB budget, and marker search alone added about 32 GiB.
- Resolution order: explicit `mem_budget`/`nthreads` argument, then env `SCARF_MEM_BUDGET` /
  `SCARF_WORKERS`, then detection (cgroup and CPU-affinity aware). Specs: bytes (int), `"8G"`,
  `"512M"` (binary units, G = 1024^3 bytes), or a fraction of detected memory such as `"0.6"`.
  A bare `"8"` is rejected as ambiguous.
- More workers mean more concurrent buffers and remote requests; pair them with a `mem_budget`.
- Converters need a `mem_budget` that fits the default count layout and refuse before writing
  when it does not (`references/data-access.md`). Prefer more memory over the smaller layout the
  refusal names: smaller layouts slow every later gene-major read.
- A `DataStore` is not thread-safe: call it from one thread at a time. Use separate stores or
  separate mount targets for independent parallel analyses.
- Opt-in parallel UMAP, tSNE, and ANN builds record the resolved worker count in provenance.
  Pass `nthreads` explicitly when such results must stay reusable across machines.
- Counts stream in blocks. `ds.RNA.rawData` is a lazy `ChunkedArray`; `.compute()` on a large
  slice materializes it. `ds.to_anndata(...)` always builds `X` in memory; ordinary
  `scarf.to_h5ad(assay, path)` and `scarf.to_mtx` stream.
- On a mount, every pass over counts is a network read; artifacts (normalized, PCA, graph) live
  in the local target. `local_cache` (PCA) stages normalized data only when the datastore
  location itself is remote, so it is skipped for a local mount target.

## Recipes

### Set budgets and batch-friendly output

```python
import scarf

scarf.configure_output(progress=False, timestamps=True)
scarf.set_verbosity(level="INFO", filepath="scarf-run.log")   # logs go to this file, not stdout
ds = scarf.DataStore("analysis.zarr", mem_budget="16G", nthreads=8, min_features_per_cell=-1)
print(ds.summary().to_dict()["resources"])   # {'memory_bytes': ..., 'workers': 8, ...}
```

Environment equivalent: `SCARF_MEM_BUDGET=16G SCARF_WORKERS=8 python job.py`.
`configure_output(level=...)` does not hide progress bars; pass `progress=False` explicitly.

### Stream counts instead of materializing

Slice lazily, then iterate ordered row blocks; never `.compute()` the whole matrix.

```python
import numpy as np

run = ds.pipeline.open(label="baseline")
cell_index = np.flatnonzero(run.cells.fetch_all("I"))
hvg = np.flatnonzero(np.asarray(run.features.fetch_all("highly_variable_features"), dtype=bool))
selected = ds.RNA.rawData[:, hvg][cell_index, :]
detected = np.concatenate(
    [np.count_nonzero(block, axis=1) for block in selected.stream_blocks(nthreads=4, msg="HVGs")]
)
print(ds.RNA.rawData[:3, :5].compute())      # tiny slices only
```

### Make repeated passes over a mount cheap

Repack copies the remote counts once into a self-contained local store, keeping artifacts and
pipeline runs. It needs disk for the full counts plus `countsT`.

```bash
python -m scarf.tools.repack_zarr work/pbmc.zarr work/pbmc_local.zarr --mem-budget 4G
```

For a mount of a few thousand cells, repack takes tens of seconds and reopening drops from 10 to
20 s to under 1 s. The output has no `matrixSource`, and `ds.pipeline.open(label=...)` still
works. `--data-only` drops analyses; `--nthreads`, `--profile {fast_local,cloud}` and
`--storage-options` (JSON, e.g. `'{"skip_signature": true}'` for public S3) also exist.

### Run long steps from an agent shell

Some agent shells stop a foreground command after about 10 minutes, and an unbounded wait loop can
hang for as long. Write the step as a script that logs to a file and ends with `DONE` or `FAILED`:

```python
# step_baseline.py
import sys
import traceback

import scarf

scarf.configure_output(level="WARNING", progress=False)
try:
    ds = scarf.DataStore("analysis.zarr", min_features_per_cell=-1)
    run = ds.pipeline.run(label="baseline")
    print("run", run.run_id, run.status, flush=True)
except Exception:
    traceback.print_exc()
    print("FAILED", flush=True)
    sys.exit(1)
print("DONE", flush=True)
```

Start it detached with a timeout and keep the PID in a file (shell variables do not survive between
agent tool calls). Make sure `timeout`'s SIGTERM reaches Python. Behind a wrapper such as `uv run`, put `timeout` inside it: Scarf then recorded
the run as `interrupted` in 6 of 7 tests; `timeout 1800 uv run ...` left it `running` both times.

```bash
mkdir -p logs
nohup timeout 1800 python step_baseline.py > logs/baseline.log 2>&1 &
echo $! > logs/baseline.pid
```

Wait in bounded slices that stay under the shell limit and fail fast:

```bash
LOG=logs/baseline.log; PID=$(cat logs/baseline.pid); state=running
for i in $(seq 1 50); do                        # 50 x 10 s, under a 10-minute limit
  alive=1; kill -0 "$PID" 2>/dev/null || alive=0   # check first: a dead process wrote its last line
  if grep -qx DONE "$LOG"; then state=done; break; fi
  if grep -qx FAILED "$LOG" || grep -q Traceback "$LOG"; then state=failed; break; fi
  if [ "$alive" = 0 ]; then state=died; break; fi
  sleep 10
done
echo "state=$state"; tail -n 5 "$LOG"
```

`running`: call the loop again. `failed`: read the traceback. `died`: the process ended without a
final line (timeout, out of memory, kill); `ds.pipeline.list_runs()` shows what was recorded. The
variable is `state` because zsh reserves `status`.
Check the saved PID with `kill -0`: `pgrep -f step_baseline.py` also matches the launching shell,
so it never reports the job as gone. On macOS, `timeout` is `gtimeout` from GNU coreutils.

### Export a completed run to AnnData or H5AD

Run export uses the frozen cells and feature universe and holds `X` in memory. `cell_type` below
and in later recipes is a placeholder for your own label column, not held-out author labels.

```python
adata = ds.to_anndata(run=run)               # obs: frozen fields; obsm: X_umap; X: raw counts
live = ds.cells.to_pandas_dataframe(["ids", "cell_type", "RNA_nCounts"]).set_index("ids")
adata.obs = adata.obs.join(live)             # live labels are not in the run: join on cell ids
adata.obsm["X_pca"] = np.asarray(ds.load_artifact(run["pca"])["data"][:])  # run analysis cells
graph = ds.load_graph(graph=run["connectivity_map"], symmetric=True, upper_only=False)
assert graph.shape[0] == adata.n_obs
adata.obsp["connectivities"] = graph
adata.write_h5ad("baseline_run.h5ad")

scarf.to_h5ad(ds.RNA, "baseline_run_plain.h5ad", run=run)   # one call, no extras
```

`adata.var_names` are feature IDs; symbols are in `adata.var["names"]`. Pass
`snapshot_columns=["cell_type"]` to `ds.pipeline.run` to freeze live labels into future run
exports (see `pipeline-runs-and-artifacts.md`).

### Export a complete assay (streaming)

```python
scarf.to_h5ad(ds.RNA, "full_assay.h5ad")              # every cell, including I False; live metadata
scarf.to_mtx(ds.RNA, "full_assay_mtx")                # matrix.mtx, genes.tsv, barcodes.tsv
scarf.to_mtx(ds.RNA, "full_assay_mtx_gz", compress=True)   # Cell Ranger 3 names, .gz
```

### Export a gene panel or normalized values

```python
panel = ds.to_anndata(from_assay="RNA", feature_names=["CD3E", "MS4A1", "LYZ", "NKG7"])
normed = ds.to_anndata(run=run, matrix="normed")      # library size scaled to 1000 per cell, no log
```

`feature_names` (exact, unique, ordered) and `feature_indexes` are mutually exclusive and are
rejected together with `run=`. Without `run`, `cell_key` (default `"I"`) selects cells, and
`obs_names` are the cell `ids`: a panel export is the cheapest per-cell marker table.

### Export markers and metadata tables

```python
ds.export_markers_to_csv(marker=run["markers"], csv_filename="markers_wide.csv")  # names only
ds.get_markers(marker=run["markers"]).to_csv("markers_long.csv", index=False)     # with stats
run.cells.to_pandas_dataframe(["ids", "clusters", "doublet_score"]).to_csv("run_cells.csv", index=False)
ds.cells.to_pandas_dataframe(["ids", "cell_type"], key="I").to_csv("cells.csv", index=False)
```

### Export pseudobulk counts

Raw counts per population x sample plus a design table, for DESeq2, edgeR or another count model.

```python
bulk = ds.make_bulk(
    "cell_type", secondary_groups="sample_id",        # one column per population x sample
    cell_selection=run["analysis_cell_selection"],
    aggr_type="sum", feature_label="id",              # raw counts; Ensembl ids are unique
)
cells = ds.cells.to_pandas_dataframe(["cell_type", "sample_id", "donor_id", "condition"])
cells = cells[np.asarray(run.cells.fetch_all("I"), dtype=bool)]
assert cells.groupby("sample_id")[["donor_id", "condition"]].nunique().eq(1).all().all()
cells["column"] = cells["cell_type"].astype(str) + "_" + cells["sample_id"].astype(str)
by_column = cells.groupby("column")
design = by_column.first().assign(n_cells=by_column.size()).reindex(bulk.columns)  # empty -> NaN
design["n_cells"] = design["n_cells"].fillna(0).astype(int)
keep = design["n_cells"] >= 10                        # choose a floor and report what you drop
assert np.allclose(bulk.to_numpy(), np.round(bulk.to_numpy()))
bulk.loc[:, keep].round().astype("int64").to_csv("pseudobulk_counts.csv")
design.loc[keep].to_csv("pseudobulk_design.csv")
print(design[keep].groupby(["cell_type", "condition"])["donor_id"].nunique().unstack(fill_value=0))
```

`make_bulk` emits every group x subgroup pair (all-zero when empty), named `f"{group}_{subgroup}"`;
a name collision raises. Sums keep the count dtype (often float32). Model one population at a time
with donor-level terms; with repeated samples per donor, include the donor (paired) or sum its
samples first, and avoid rank-deficient designs (integration-and-comparisons.md).

### Write a self-contained subset store

```python
keep = np.flatnonzero(run.cells.fetch_all("I"))      # or cell_key="my_bool_column"
scarf.SubsetZarr("run_cells.zarr", assays=[ds.RNA], cell_idx=keep).dump()
sub = scarf.DataStore("run_cells.zarr")              # first open must be writable
```

The subset copies counts locally (no `matrixSource`), keeps every feature and cell column, and
contains no artifacts or pipeline runs. Use it to hand off, or before `to_mtx` of run cells.

## What a run export contains

| Item | `to_anndata(run=run)` / `to_h5ad(assay, path, run=run)` | Otherwise |
|---|---|---|
| Cells | the run's analysis selection | `to_h5ad(ds.RNA, path)` exports all rows |
| Features | the full feature universe; HVG flag in `var["highly_variable_features"]` | `feature_names=` without `run` |
| `X` | raw counts; `matrix="normed"` (to_anndata only) for scaled values | |
| `obs` | frozen fields: cell-cycle, `leiden_*`, `paris`, `clusters`, `doublet_score`, `snapshot_columns` | join `ds.cells` by `ids` |
| `obsm` | `X_umap` | PCA: `ds.load_artifact(run["pca"])["data"]` |
| `obsp`, markers, run report | not exported | `ds.load_graph`, `get_markers`, `run.report(format="markdown")` |
| MTX | `to_mtx` has no `run=` | `SubsetZarr` with run cells, then `to_mtx` |

## Parameters that matter

| Parameter | Default | Change when |
|---|---|---|
| `mem_budget` / `SCARF_MEM_BUDGET` | detected system or cgroup memory | shared host or batch job; leave headroom for graphs and markers |
| `nthreads` / `SCARF_WORKERS` | detected CPUs | shared host, remote stores, reproducible parallel UMAP/ANN |
| `configure_output(progress=)` | `True` | `False` in logs and batch jobs |
| `run_pca(local_cache=)` | `"auto"` | path string to keep scratch for a remote store; plan `cells x features x 4` bytes |
| `to_anndata(matrix=)` | `"raw"` | `"normed"` for scaled values |
| `to_h5ad(embeddings_cols=)` | `["UMAP", "tSNE"]` live column prefixes | legacy stores only; rejected with `run=` |
| `to_mtx(compress=)` | `False` | `True` for Cell Ranger 3 file names |
| `get_markers` / `export_markers_to_csv` `min_score`, `min_frac_exp` | `0.25`, `0.2` | widen or narrow the exported marker list |
| `make_bulk(aggr_type=, feature_label=, pseudo_reps=)` | `"mean"`, `"index"`, `1` | `"sum"` and `"id"` for count models; never `pseudo_reps` above 1 for inference |
| `SubsetZarr(reset_cell_filter=)` | `True` (new `I` all true) | `False` to carry `I` over |

## Check before moving on

- `ds.summary().to_dict()["resources"]` shows the budget actually in effect.
- At `INFO`, lines such as `execution countsTCellBand: ... fetch=...s` show remote fetch time per
  stage; the run report records stage timing and sampled RSS.
- After an export: reload, compare shape to `run.cells.fetch("ids").shape` and feature count,
  confirm `obsm["X_umap"]`, and check joined labels have no unexpected missing values.
- Pseudobulk: integer counts, `design` aligned to `bulk.columns`, empty and tiny columns dropped,
  enough donors per condition in each population you model.
- A background step ended with `DONE`, and its run report says `completed`.

## Pitfalls

- Every `to_anndata` call (panel, run, or full) materializes `X`; size it before exporting a
  large atlas. Ordinary `to_h5ad` streams but writes every cell, inactive ones included.
- Run export rejects `from_assay`, `cell_key`, `feature_names`, and `feature_indexes`.
  `to_h5ad(run=)` also rejects `embeddings_cols`, `skip_recalc_nfeats=False`, and `nthreads`.
- Run `obs` lacks live columns (author labels, QC) unless captured with `snapshot_columns`.
- `export_markers_to_csv` writes names only, filtered by `min_score`/`min_frac_exp`; use
  `get_markers(marker=ref)` for statistics. Pass the exact marker ref, never a guess.
- Remote costs for a few thousand cells on a Hugging Face mount: open 10 to 20 s, a new mount a
  few minutes, the pipeline about a minute (cell cycle, HVG, normalization and markers each
  re-read `countsT`), exports seconds to tens of seconds. A 4-gene panel export still reads every
  cell's count rows.
- `SubsetZarr` keeps all features, drops artifacts and runs, refuses an existing destination
  unless `overwrite_existing_file=True`, and refuses a destination overlapping the source.
- `to_mtx(compress=True)` on CELLxGENE stores writes gene biotypes as feature types; see
  `data-access.md` before re-importing.

## See also

- `data-access.md`: opening stores, mounts, Cytebase, imports.
- `pipeline-runs-and-artifacts.md`: run reports, `snapshot_columns`, artifact loading.
- `markers-and-annotation.md`: marker statistics and thresholds.
- `integration-and-comparisons.md`: donors, two-arm donors and tests behind a pseudobulk design.
