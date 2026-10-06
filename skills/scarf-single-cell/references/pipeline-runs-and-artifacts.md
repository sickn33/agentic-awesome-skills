# Pipeline runs and artifacts

Run the standard RNA recipe, reopen and audit runs, inspect and trace immutable artifacts, branch
from a run with exact refs, and record the analysis for handoff. Docs:
<https://scarf.readthedocs.io/en/latest/reference/api/pipeline.html>, <https://scarf.readthedocs.io/en/latest/reference/api/artifacts.html>,
<https://scarf.readthedocs.io/en/latest/concepts/provenance.html>, <https://scarf.readthedocs.io/en/latest/tutorials/reuse_and_tracing.html>,
<https://scarf.readthedocs.io/en/latest/analysis_with_agents.html>.

## When to use

- First pass on any RNA store: one `ds.pipeline.run(label=...)` gives QC filtering, HVGs, PCA,
  graph, UMAP, Leiden candidates, Paris, doublet scores and markers as one durable record.
- Resuming work: open a run by label or id; inspect any result before consuming it.
- Alternatives outside the fixed recipe: take refs from a completed run and pass them on.

## Key concepts

- Every result is an immutable artifact addressed by an `ArtifactRef` (frozen dataclass):
  `scope` (`"assay"` or `"datastore"`), `kind`, `artifact_id` (64 hex chars; there is no `.id`),
  `assay` (`None` for datastore scope). Cell selections and metadata snapshots are datastore-scoped.
- Reuse is content-addressed: same operation, parameters and exact input refs returns the existing
  complete artifact. Changing anything creates a new artifact; upstream ones are reused.
  `invalidate_cache=True` on a granular method forces a fresh one.
- `ds.pipeline.run` writes artifacts plus a run record only. It never edits live `I` or adds
  metadata columns, and needs `zarr_mode="r+"` (the default); a read-only store raises
  `PermissionError`, though `open`, reports and plots still work.
- `PipelineRun` is a read-only `Mapping[str, ArtifactRef]` (`keys`, `items`, `values`, `get`,
  `run["pca"]`) plus `run_id`, `label`, `status`, `recipe` (`"basic_rna_analysis"`), `assay`,
  `started_at_ns`, `finished_at_ns`, `report()`, `cells`, `features`. Outputs and views work only
  on `status == "completed"`; otherwise they raise `RuntimeError`.
- Labels are immutable. Only a completed run acquires its label. A completed label cannot be
  reused (`ValueError` before any work). Failed and interrupted runs reserve nothing.
- There is no resume. A new run reuses every complete artifact from earlier attempts.
- `run.cells` and `run.features` are frozen views of captured fields only. Live columns such as
  author labels are absent unless listed in `snapshot_columns` on the run.

## Recipes

### Run the baseline

Default outputs and their kinds: `input_cell_selection`, `analysis_cell_selection`
(`cell_selection`), `feature_universe`, `highly_variable_features` (`feature_selection`),
`cell_cycle`, `normalized`, `pca` (`reduction`), `ann_index`, `neighbors`, `connectivity_map`,
`embedding_initialization`, `umap` (`embedding`), `leiden_0.5` ... `leiden_1.25`
(`cluster_labels`), `paris` (`cluster_cut`), `cluster_selection`, `clusters` (the selected Leiden
ref itself, not a copy), `doublets` (`doublet_score`), `markers` (`marker_table`). Harmony adds
`harmony` after `pca`; disabled stages omit their keys. A fresh baseline took 22 s on local
counts, 10 s of it one-time compilation in the graph stage; a second run in the same process took
11 s (10x 5K PBMC docs dataset). On remote counts expect about a minute for a few thousand cells.

```python
import scarf

scarf.configure_output(level="WARNING", progress=False)
ds = scarf.DataStore("analysis.zarr", nthreads=4, min_features_per_cell=-1)
run = ds.pipeline.run(label="baseline")
list(run.keys())
run["clusters"] == run["leiden_0.5"]  # True on the 10x 5K PBMC docs dataset
```

### Reopen, list and report runs

`open` needs exactly one of `label` or `run_id`; an unknown label raises `KeyError`. `list_runs`
is newest first, all statuses unless filtered, `limit=20` by default.

```python
run = ds.pipeline.open(label="baseline")
same = ds.pipeline.open(run_id=run.run_id)
ds.pipeline.list_runs(status="completed", limit=5)
report = run.report(format="dict")  # keys: run, stages, summary
[(s["stage"], s["status"], s["metrics"]["wallSeconds"]) for s in report["stages"]]
report["run"]["config"]  # resolved settings, including filtering method and params
len(report["summary"]["createdArtifacts"]), len(report["summary"]["reusedArtifacts"])
print(run.report(format="markdown"))  # config, stage table, outputs, failure or interruption
```

### Read frozen fields

`run.cells.columns` here: `I, ids, names, s_score, g2m_score, cell_cycle_phase, umap_1, umap_2,
leiden_*, paris, clusters, doublet_score`, then any `snapshot_columns`; filter and Harmony columns
are not exposed. `run.features.columns`: `I, ids, names, highly_variable_features`. `fetch` returns
analysed rows; `fetch_all` aligns to every stored cell (3,847 and 5,025 on the 10x 5K PBMC docs
dataset, whose live `I` holds 3,948).

```python
df = run.cells.to_pandas_dataframe(["umap_1", "umap_2", "clusters"])
clusters = run.cells.fetch("clusters")  # int labels starting at 1
analysed = run.cells.fetch_all("I")  # boolean mask over every stored cell
n_hvgs = int(run.features.fetch_all("highly_variable_features").sum())
mito = ds.cells.fetch_all("RNA_percentMito")[analysed]  # a filter column, aligned to run cells
```

### Configure a run

Shortcuts and `params` sections are mutually exclusive for the same setting. Validation errors
(unknown section, column collision, reused label, `leiden={}`) raise before any run record exists.
`leiden.selected` replaces the silhouette choice and skips `cluster_selection`.

```python
custom = ds.pipeline.run(label="leiden_custom", leiden={"partitions": [0.4, 0.8]})
pinned = ds.pipeline.run(
    label="leiden_pinned",
    params={"leiden": {"partitions": [0.5, 1.0], "selected": 1.0}},
    umap=False, doublets=False, markers=False, cell_cycle=False, paris=False,
)
pinned["clusters"] == pinned["leiden_1.0"]  # True; no cluster_selection key
labelled = ds.pipeline.run(label="with_labels", snapshot_columns=["cell_type"])  # full recompute
"cell_type" in labelled.cells.columns  # True
```

`cell_type` stands for a label column you own; never snapshot held-out author labels.

### Handle failures and interruptions

A stage error raises `PipelineExecutionError` (`run_id`, `stage`, cause in `__cause__`). SIGTERM,
SIGINT, SIGHUP or `KeyboardInterrupt` stop at the next safe checkpoint (in testing, the running
stage finished and kept its artifact) and record `status="interrupted"`. Rerun with the same
label; completed artifacts are reused (interrupted during UMAP: rerun 10 s, 16 reused; 10x 5K
PBMC docs dataset). Run it as `timeout 1800 python job.py`; behind a wrapper such as `uv run`, put
`timeout` inside it (`uv run timeout 1800 python job.py`), because `timeout 1800 uv run ...` killed the run without the handler (performance-and-export.md).

```python
from scarf import PipelineExecutionError

try:
    ds.pipeline.run(label="bad", params={"paris": {"min_cluster_size": -5}})
except PipelineExecutionError as error:
    failed = ds.pipeline.open(run_id=error.run_id)
    error.stage, failed.status, failed.report(format="dict")["run"]["error"]
interrupted = ds.pipeline.list_runs(status="interrupted")
```

A process killed mid-stage (SIGKILL, OOM, or a `timeout` outside a `uv run` wrapper) leaves a record
stuck at `status="running"` with `summary["uncleanIncomplete"]` true; it claimed no label, so a
rerun with the label works. Check the process, not the status. Not executed (needs a hard-killed
finalizer): if a process died after claiming its label, the label stays blocked. After confirming
the process is gone, call `ds.pipeline.abandon_label_claim(label=..., run_id=..., reason=...)`,
then rerun. It refuses completed owners and has no timeout heuristic.

### Inspect, load and find artifacts

```python
status = ds.inspect_artifact(run["pca"])
status.exists, status.complete, status.path, status.operation  # ..., "run_pca"
status.parameters  # {'dims': 21, 'feat_scaling': True}
status.inputs  # serialized refs: normalized, feature_scaling, pca_cell_selection
status.input_ref("normalized") == run["normalized"]  # True
status.execution_options, status.created_at_ns, status.scarf_version
group = ds.load_artifact(run["pca"])  # zarr group: data, loadings, center
group["data"].shape  # (analysed cells, 21)

ds.list_artifacts(complete_only=True)  # assay scope, default assay
ds.list_artifacts(kind="cell_selection", scope="datastore")
on_graph = ds.list_artifacts(
    kind="cluster_labels",
    operation="run_leiden_clustering",
    inputs={"graph": run["connectivity_map"]},
)
[ds.inspect_artifact(ref).parameters["resolution"] for ref in on_graph]

decision = ds.load_artifact(run["cluster_selection"])
decision.attrs["selectedKey"], decision.attrs["candidateKeys"], decision["scores"][:]
```

### Branch from a completed run and trace lineage

Pass exact run refs to granular methods. Same inputs return the run's own artifacts; new
parameters create a branch. Explicit normalization/PCA/graph chains: features-and-graphs.md.
Clustering choices: clustering-and-embedding.md.

```python
graph = run["connectivity_map"]
ds.run_leiden_clustering(graph, resolution=0.5) == run["leiden_0.5"]  # reused, no recompute
fine_clusters = ds.run_leiden_clustering(graph, resolution=2.0)  # new cluster_labels ref
fine_markers = ds.run_marker_search(fine_clusters, features=run["feature_universe"])

cells = run["analysis_cell_selection"]
hvgs = run["highly_variable_features"]
ds.run_normalization(cells, hvgs) == run["normalized"]  # True: reused
ds.plots.embedding(layout=run["umap"], color_by=fine_clusters, show=False).close()

lineage = ds.lineage({"selected": run["clusters"], "fine": fine_clusters})
markdown = lineage.to_markdown()  # Mermaid graph (shared upstream once) plus details
mermaid = lineage.to_mermaid()
snapshot = ds.summary().to_dict()  # columns, artifact inventory, run counts, labels
```

### Record the analysis for handoff

Write the prospective record (question, unit of inference, input refs, planned writes,
alternatives, decision criteria) before the first mutating call, then extend it into the handoff:
add metadata roles and confounding, evidence per alternative, unsupported claims, required
validation and exported files. Refs round-trip with `to_dict()` and `ArtifactRef.from_dict()`.

```python
import json
from pathlib import Path

out = Path("handoff")
out.mkdir(exist_ok=True)
refs = {"cellSelection": "analysis_cell_selection", "featureSelection": "highly_variable_features",
        "graph": "connectivity_map", "selectedClusters": "clusters"}
record = {
    "question": "Which broad populations are present?",
    "unitOfInference": "cells from one sample; no replicate-level claims",
    "pipelineRun": {"runId": run.run_id, "label": run.label, "status": run.status},
    "refs": {name: run[key].to_dict() for name, key in refs.items()}
    | {"fineClusters": fine_clusters.to_dict()},
    "alternatives": "Leiden 0.5 (pipeline choice) vs 2.0",
    "decision": "provisional", "openQuestions": ["Does MAD filtering remove a real population?"],
}
(out / "handoff.json").write_text(json.dumps(record, indent=2))
(out / "run_report.md").write_text(run.report(format="markdown"))
(out / "lineage.md").write_text(lineage.to_markdown())
saved = json.loads((out / "handoff.json").read_text())
scarf.ArtifactRef.from_dict(saved["refs"]["fineClusters"]) == fine_clusters  # True
```

## Parameters that matter

| Parameter | Default | Change when |
| --- | --- | --- |
| `label` | `None` | Always name runs you will reopen; pick a new name per variant. |
| `cell_key` | `"I"` | A boolean column already defines the cohort. |
| `filtering` | `True` (pooled MAD, 3 MADs, over `RNA_nCounts/nFeatures/percentMito/percentRibo`) | Data already filtered (`False`) or per-sample or manual bounds needed (mapping; see quality-control.md). |
| `harmony_batch_columns` | `None` | Real batch columns exist; see integration-and-comparisons.md. |
| `hvg_count` / `pca_dims` / `neighbors_k` | `1000` / `21` / `11` | A representation choice is under test. `pca_dims=0` skips PCA (output key `reduction`). |
| `umap` | `True` | `False` skips `embedding_initialization` and `umap`. |
| `leiden` | `True` = `[0.5, 0.75, 1.0, 1.25]` | Other candidates: `{"partitions": [...]}`; pin with `params["leiden"]["selected"]`. |
| `cell_cycle`, `paris` | `True` | Skip to save time (cell cycle is the slowest stage on remote counts). |
| `doublets`, `markers` | `True` | `False` to skip; both are required off when `leiden=False`. |
| `snapshot_columns` | `()` | Run-mode plots or `run.cells` need live columns. Choose on the first run (see Pitfalls). |
| `params` | `None` | Stage settings (`hvg`, `pca`, `umap`, `leiden`, `tsne`, `membership_strength`, ...). |
| `callback` | `None` | Progress events: `event.kind`, `event.stage`, `event.error`. |

## Check before moving on

- `run.status == "completed"` and the expected keys are present.
- `run.report(format="markdown")`: stage statuses, wall seconds, created versus reused counts,
  resolved `filtering` config, and any failure or interruption section.
- Kept cells: `run.cells.fetch_all("I").sum()` versus the store total. Audit removed cells (by
  your own clusters or a marker panel, not held-out labels) before trusting clusters.
- `decision["scores"]` from `cluster_selection`: silhouette is a provisional baseline, not ground
  truth.
- For any ref you consume: `ds.inspect_artifact(ref).complete` is `True`, and `operation`,
  `parameters` and `inputs` match what you intend.

## Pitfalls

- `snapshot_columns` (and Harmony columns) enter the cell snapshot that feeds filtering, so adding
  one changes `analysis_cell_selection` and recomputes everything downstream. Same parameters under
  a new label reused all 26 artifacts in 2 s; adding `["cell_type"]` created 24 of 27 again
  (10x 5K PBMC docs dataset).
- `ds.list_artifacts(kind="cell_selection")` silently returns `[]`; pass `scope="datastore"`.
- Compare cell selections from different routes by mask, not by ref: equal values can have
  different ids.
- A `PipelineRun` is bound to the `DataStore` object that opened it. After reopening the store,
  reopen the run, or plotting raises `ValueError`.
- `run.get(key)` returns `None` for a disabled stage, but raises `RuntimeError` on a run that did
  not complete.
- `run.cells.fetch("clusters")` is integer, while `get_markers(...)["group_id"]` is a string.
- In a backgrounded non-interactive shell, SIGINT is ignored; use SIGTERM to stop a run cleanly.
  `SIGKILL` or OOM leaves an incomplete run with no cleanup.
- Never read private Zarr paths or mutate `ds.z`, `ds.zw` or run records; use the methods above.

## See also

- quality-control.md: filtering policies behind `analysis_cell_selection`.
- features-and-graphs.md: explicit normalization, PCA, ANN, neighbours and graph chains.
- clustering-and-embedding.md: re-clustering, UMAP/t-SNE branches, partition comparison.
- markers-and-annotation.md: `get_markers`, marker tables and labels.
- plotting.md: `ds.plots.*(run=run, ...)` versus explicit refs.
- performance-and-export.md: `ds.to_anndata(run=run)` and resource settings.
