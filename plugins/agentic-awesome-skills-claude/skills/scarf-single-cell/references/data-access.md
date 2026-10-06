# Data access

Open, inspect, import, and connect to Scarf DataStores, including Cytebase remote and mounted
stores. Docs: <https://scarf.readthedocs.io/en/latest/tutorials/data_organization.html>,
<https://scarf.readthedocs.io/en/latest/tutorials/import_and_export.html>, <https://scarf.readthedocs.io/en/latest/tutorials/cytebase.html>,
<https://scarf.readthedocs.io/en/latest/tutorials/remote_stores.html>, <https://scarf.readthedocs.io/en/latest/reference/api/datastore.html>, `import_export.html`, `cytebase.html` (same folder).

## When to use

- First contact with any dataset: choose read-only or writable, then inspect before computing.
- Converting 10x, Matrix Market, H5AD, or Seurat RDS input into a Scarf Zarr store.
- Finding a Cytebase dataset, exploring it remotely, or mounting it for analysis that saves results.
- Reopening a store or a mount from an earlier session.

## Key concepts

- A store is one Zarr directory: `cellData` (shared cell table, `ds.cells`), one group per assay
  (`ds.RNA`; feature table `ds.RNA.feats`; counts; assay artifacts), datastore-scoped artifacts,
  and `pipeline/runs`. Cell QC columns are assay-prefixed: `RNA_nCounts`, `RNA_nFeatures`,
  `RNA_percentMito`, `RNA_percentRibo`. Tables are `MetaData` objects, not DataFrames.
- `I` is the live Boolean cell key (feature tables have one too). `fetch(col)` returns rows where
  `I` is true; `fetch_all(col)` returns every row. Analytical filtering returns a cell-selection
  artifact and never edits `I`.
- `zarr_mode="r+"` is the default. A writable open WRITES: first-open preparation of a freshly
  written store (QC columns, feature `nCells`/`dropOuts`), the `min_features_per_cell` filter
  applied to `I`, and the `defaultAssay`/`assayTypes` attributes. `zarr_mode="r"` writes nothing;
  producers return a matching existing artifact but raise `PermissionError` instead of computing.
- RNA assays hold cell-major `counts` plus gene-major `countsT`; other assays hold `counts` only.
  Stores from older releases (Zarr v2, no `countsT`, an `{assay}/state` group) fail to open:
  re-import the source.
- A mount is a local writable target whose counts resolve from a separate source recorded in the
  root `matrixSource` attribute (absolute path or URI). Metadata is copied once at mount time; new
  artifacts are written only to the target.
- Cytebase has three layers: `Catalog` (verified local DuckDB copy of the catalog, no counts),
  `open_datastore` (read-only, everything remote), `mount_datastore` (local writable target,
  counts remote, plus a `<target>.cytebase.json` receipt beside it).
- `workspace` names a group inside one Zarr with its own `cellData`, assays, and artifacts (counts
  under `matrices/`). Writers default to `None` (root layout); keep `None` unless the store was
  written with a workspace. A mount records one source workspace and rejects another.

## Recipes

### Open and inspect a store

Design and annotation inference starts with `scripts/inspect_store.py STORE.zarr`, which ships with
the maintained copy of this skill in the Scarf repository (this catalogue copy does not include
it). Read-only, it flags annotation-like columns (values hidden unless
`--show-annotation-values`), design-like, author-derived and unflagged columns, and checks
whether counts look raw, corrected or pre-filtered. Flags are name-based hints: review every
column. By hand, open read-only until you need to write; `summary()` is metadata-only.

```python
import scarf

scarf.configure_output(level="WARNING", progress=False)
ds = scarf.DataStore("analysis.zarr", zarr_mode="r")
print(ds)                                    # "N_active (N_total) cells", assays, column names
snap = ds.summary().to_dict()                # JSON-safe
print(snap["default_assay"], snap["total_cells"], snap["active_cells"], snap["resources"])
print(snap["pipeline_run_counts"], snap["labeled_pipeline_runs"])
print([(a["name"], a["assay_type"], a["total_features"], len(a["artifacts"])) for a in snap["assays"]])
print(ds.pipeline.list_runs())                                   # newest first
print(ds.list_artifacts(complete_only=True))                     # default-assay artifacts
print(ds.list_artifacts(scope="datastore", complete_only=True))  # cell selections, snapshots
ds.show_zarr_tree(start="RNA", depth=1)

# Metadata: request only the columns you need
meta = ds.cells.to_pandas_dataframe(["ids", "RNA_nCounts", "RNA_nFeatures"], key="I").set_index("ids")
active_ids = ds.cells.fetch("ids")        # rows where I is True
all_ids = ds.cells.fetch_all("ids")       # every row
genes = ds.RNA.feats.to_pandas_dataframe(["ids", "names", "nCells"])
by_upper = {str(n).upper(): str(n) for n in ds.RNA.feats.fetch_all("names")}  # case-safe lookup
```

### Convert inputs to Zarr

Every writer follows reader then `*ToZarr(...).dump()`. Open each new store writable once.

```python
# 10x HDF5: assays inferred from feature types (RNA, ADT, ATAC)
reader = scarf.CrH5Reader("filtered_feature_bc_matrix.h5")
print(reader.assayFeats)                  # assays and feature ranges that will be written
scarf.CrToZarr(reader, zarr_loc="pbmc.zarr", mem_budget="4G").dump()
# A default count layout that does not fit mem_budget raises MemoryError before writing and
# names a smaller policy=CountMatrixPolicy(...) (scarf.storage.count_matrix); raise
# mem_budget or pass that policy.
ds = scarf.DataStore("pbmc.zarr", default_assay="RNA")   # required when there are 2+ assays

# 10x directory (matrix.mtx, genes/features.tsv, barcodes.tsv; .gz accepted)
scarf.CrToZarr(scarf.CrDirReader("filtered_feature_bc_matrix"), zarr_loc="dir.zarr").dump()

# Matrix Market: inspect, then pick one candidate explicitly
candidates = scarf.inspect_mtx("mtx_dir")
reader = scarf.MtxReader(candidates[0])
print(reader.assayFeats)
scarf.MtxToZarr(reader, zarr_loc="mtx.zarr").dump()

# H5AD: inspect first; selected obsm/obs values become artifacts, not live columns
import h5py

insp = scarf.inspect_h5ad("data.h5ad")
print(insp.matrixKey, insp.matrixCandidates, insp.integerLike, insp.layers, insp.suggestedAssays)
with h5py.File("data.h5ad", "r") as h5:  # pass only keys the file has; a missing one is a KeyError
    obsm = set(h5["obsm"]) if "obsm" in h5 else set()
    obs = h5["obs"]
    obs_cols = set(obs) if isinstance(obs, h5py.Group) else set(obs.dtype.names)  # old files
print(sorted(obsm), sorted(obs_cols))
roles = {k: r for k, r in {"X_umap": "umap", "X_tsne": "tsne"}.items() if k in obsm}
kw = dict(embedding_roles=roles, cluster_keys=tuple(c for c in ("clusters",) if c in obs_cols))
reader = scarf.H5adReader.from_inspect(insp, **kw)
res = scarf.H5adToZarr(reader, zarr_loc="h5ad.zarr").dump()
print(dict(res.embeddingArtifacts), dict(res.clusterArtifacts))

# Seurat RDS (an on-disk .rds; .h5seurat is not read)
si = scarf.inspect_seurat("pbmc.rds")
reductions = [r.name for r in si.reductions if r.importable]
with scarf.SeuratReader("pbmc.rds", assays=[si.activeAssay], reductions=reductions) as sr:
    out = scarf.SeuratToZarr(sr, zarr_loc="seurat.zarr").dump()
print(out.defaultAssay, dict(out.reductionArtifacts), out.activeIdentity, len(out.notices))

for path in ("dir.zarr", "mtx.zarr", "h5ad.zarr", "seurat.zarr"):
    scarf.DataStore(path)                 # writable first open prepares the store
```

`CSVReader`/`CSVtoZarr` (small dense CSV) and `SparseToZarr` (SciPy CSR plus IDs) also exist.

Every converter refuses this way from 1.0.0rc18 on (1.0.0rc17 shrinks the layout to fit). The
error is a `MemoryError`; releases after 1.0.0rc19 raise its subclass `CountLayoutMemoryError`, so
catch `MemoryError`. Prefer a larger `mem_budget` when the host has
the memory. Otherwise copy the policy numbers from the message exactly and record that choice:
smaller layouts make every later gene-major read slower.

```python
from scarf.storage.count_matrix import CountMatrixPolicy

policy = CountMatrixPolicy(unitBytes=3906250, chunkBytes=390625)   # copied from the message
scarf.CrToZarr(reader, zarr_loc="pbmc.zarr", mem_budget="128M", policy=policy).dump()
```

The need follows genes per cell relative to the gene count, not the number of cells. The 1K PBMC
CITE-seq file refuses at `512M` and imports at `1G`.

### Find a Cytebase dataset

```python
from scarf import cytebase

catalog = cytebase.Catalog()              # public Nygen/cytebase, no credentials
hits = catalog.search("bladder immune", limit=5)      # every word, case-insensitive
ids = [row["cytebase_id"] for row in hits]            # take IDs from rows, not printed tables
blood = catalog.find_datasets(tissue="blood", organism="Homo sapiens")  # exact labels
assay_labels = [row["label"] for row in catalog.list_terms("assay")]    # exact facet labels
small = catalog.query(
    "SELECT cytebase_id, cell_count FROM datasets "
    "WHERE status = ? AND cell_count < ? ORDER BY cell_count LIMIT 3",
    parameters=["ready", 5000],
)
entry = catalog.dataset(ids[0])
print(entry.describe())                   # Markdown summary; does not open the store
print(entry.cell_count, entry.source_embeddings())    # source obsm keys, imported or not
```

### Explore a Cytebase dataset read-only

```python
ds = catalog.open_datastore(entry.id)     # zarr_mode="r", min_features_per_cell=-1
print(cytebase.embeddings(ds))            # {"X_umap": ArtifactRef}: keys actually imported
umap_ref = cytebase.embedding(ds, "X_umap")
coords = cytebase.embedding_coordinates(ds, umap_ref)  # DataFrame indexed by cell id
meta = ds.cells.to_pandas_dataframe(["ids", "donor_id"], key="I").set_index("ids")  # a design column
frame = coords.join(meta)                 # join on ids, never on row order
```

### Mount a Cytebase dataset for writable analysis

The target must be a new local path. Mounting copies metadata and verifies the source; expect a
few minutes for a few thousand cells.

```python
analysis = catalog.mount_datastore(entry.id, at="work/analysis.zarr")
# Writes work/analysis.zarr (copied metadata, future artifacts) and work/analysis.zarr.cytebase.json
print(analysis.zarr_mode, int(analysis.cells.fetch_all("I").sum()), analysis.cells.N)
print(cytebase.embeddings(analysis))      # {}: source artifacts are not copied into a mount
```

### Reopen a mount, or mount any store that owns its counts

```python
# Verify against the current published build (needs the .cytebase.json sidecar beside it)
analysis = catalog.mount_datastore(entry.id, at="work/analysis.zarr")
# Or open it like any store: counts resolve from matrixSource; no catalog or sidecar needed
analysis = scarf.DataStore("work/analysis.zarr", min_features_per_cell=-1)
# Generic mount; for s3:// or gs:// sources also pass storage_options (not executed here)
mounted = scarf.mount_datastore("shared/data.zarr", at="my_analysis.zarr", default_assay="RNA")
```

### Download a documentation dataset

```python
repo = scarf.cytebase.connect("scarf_docs")
print(repo.list_datasets())
path = repo.download_dataset("tenx_5K_pbmc_rnaseq", destination="scarf_datasets", zarr=True)
ds = scarf.DataStore(f"{path}/data.zarr", zarr_mode="r")  # prepared; run label "docs_default"
raw = repo.download_dataset("xin_1K_pancreas_rnaseq", destination="scarf_datasets")  # source files
```

## Parameters that matter

| Parameter | Default | Change when |
|---|---|---|
| `zarr_mode` | `"r+"` | `"r"` to inspect, share, or protect a store; a fresh store needs one `"r+"` open |
| `default_assay` | stored value, or the only assay | first open of a multi-assay store (otherwise `ValueError`) |
| `min_features_per_cell` | `10` | `-1` to leave `I` untouched on writable opens |
| `mito_pattern` / `ribo_pattern` | `None` (`^MT-`, `^RPS\|^RPL\|^MRPS\|^MRPL`) | non-human genes (`^mt-`), only on the FIRST writable open |
| `assay_types` | inferred from assay names | custom names, e.g. `{"GEX": "RNA"}` |
| `nthreads`, `mem_budget` | env `SCARF_WORKERS`, `SCARF_MEM_BUDGET`, else detected | see `performance-and-export.md` |
| `workspace` | `None` | store written into a named workspace |
| `storage_options` | `None` | object-store credentials or endpoints (read from env vars) |
| `zarrProfile` | from location (`fast_local`/`cloud`) | affects newly written arrays only |
| `Catalog(bucket=, token=)` | `Nygen/cytebase`, `None` (HF login if present) | private bucket; `token=False` forces anonymous |
| `search(limit=)`, `ready_only=` | `50`, `True` | `limit=None` for all; `ready_only=False` for unfinished |

## Check before moving on

- `print(ds)`: active versus total cells, expected assays, QC columns present.
- `snap["default_assay"]` is the assay you intend; `snap["labeled_pipeline_runs"]` and
  `list_artifacts` show existing work to reuse (see `pipeline-runs-and-artifacts.md`).
- Imports: `reader.assayFeats` lists the assays to be written; afterwards check
  `ds.RNA.rawData.shape` and dtype. For H5AD, `insp.integerLike` should be `True` for raw counts,
  but SCT-corrected counts are integers too: run "Check the matrix first" in `quality-control.md`.
- Cytebase: `entry.row["status"] == "ready"`; check `cytebase.embeddings(ds)` before plotting an
  imported layout.
- Mounts: `<target>.cytebase.json` exists beside the target; `ds.RNA.rawData.shape` resolves.

## Pitfalls

- A writable open with `min_features_per_cell=k` silently removes cells with at most `k` features
  from `I` and persists it. Reopening with a lower value does not restore cells;
  `ds.cells.reset_key("I")` does.
- Stores just written by a writer or `SubsetZarr` raise `Assay 'RNA' is not prepared. Rebuild ...`
  when opened with `zarr_mode="r"`. Open once with `"r+"`; no rebuild is needed.
- Percent patterns are fixed at first preparation; a different pattern later raises `ValueError`.
  Use `run_feature_percentage` (see `quality-control.md`) for another gene set.
- `open_datastore` rejects writes and any `min_features_per_cell` other than `-1`. Both mount
  functions reject `zarr_mode="r"`; `scarf.mount_datastore` refuses an existing target, while
  `catalog.mount_datastore` reopens one only when its matching sidecar is present.
- Catalog reopen needs the sidecar: copying a mount without `<name>.cytebase.json` makes
  `catalog.mount_datastore` raise `FileExistsError`; plain `scarf.DataStore` still opens it.
- The mount source must stay at its recorded path or URI. Mounting a mount raises; repack first.
  A changed Cytebase build requires a new mount directory.
- Printed `CatalogResults` tables HTML-escape text (`_` as `&#95;`, `'` as `&#39;`). Read IDs and
  facet labels from the row dicts (`row["cytebase_id"]`, `row["label"]`), never from the table.
- A fresh mount has no imported source embeddings. Plot them from the read-only `ds` and join by id.
- `to_pandas_dataframe(columns)` defaults to `key=None` (all rows); pass `key="I"` for active cells.
- `to_mtx(..., compress=True)` writes the feature `feature_type` column as the 10x feature type.
  CELLxGENE stores keep gene biotypes there, so re-import split one assay into thousands. Inspect
  `reader.assayFeats` before `dump()` or export with `compress=False`.
- Source column names containing `/` or `\` are stored with `_`. Reserved columns `ids`, `names`,
  `I` from a source are skipped. H5AD multi-assay import needs `assay_split_key` on `H5adToZarr`.
- `download_dataset(..., zarr=True)` keeps `data.zarr.tar.gz` beside `data.zarr` (double disk).
- Public atlas matrices (CELLxGENE, Seurat submissions) can hold SCT-corrected counts in `raw.X`,
  with genes such as rRNA removed and cells already filtered. Check before QC or count models.

## See also

- `performance-and-export.md`: budgets, remote I/O cost, repacking a mount, exports.
- `pipeline-runs-and-artifacts.md`: runs, artifact inspection, lineage.
- `quality-control.md`: filtering cells without editing `I`.
- `plotting.md`: `ds.plots.embedding(layout=umap_ref, ...)` for imported layouts.
