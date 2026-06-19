# /// script
# requires-python = ">=3.12"
# dependencies = [
#     "polars>=1.31.0",
#     "huggingface-hub",
#     "datasets",
#     "ascii-graph",
# ]
# ///
"""
Analyze educational quality trends across CommonCrawl dumps using Polars streaming.

Answers: "Is the web getting more educational over time?"

Demonstrates Polars HF Hub integration - process 50M+ docs without downloading 300GB+.

Example usage:
    # Analyze English PDFs (default)
    uv run finepdfs-stats.py

    # Analyze all 70+ languages
    uv run finepdfs-stats.py --all-languages

    # Quick test
    uv run finepdfs-stats.py --limit 10000 --show-plan

    # Save results to HF Hub
    uv run finepdfs-stats.py --output-repo username/finepdfs-temporal-stats

    # Run on HF Jobs
    hf jobs uv run \\
        -s HF_TOKEN \\
        -e HF_XET_HIGH_PERFORMANCE=1 \\
        https://huggingface.co/datasets/uv-scripts/dataset-stats/raw/main/finepdfs-stats.py \\
        -- --output-repo username/stats
"""

import argparse
import logging
import os
import sys
import time
from pathlib import Path

import polars as pl
from ascii_graph import Pyasciigraph
from datasets import Dataset
from huggingface_hub import HfApi, create_repo, list_repo_tree, login

logging.basicConfig(
    level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)

# Common language+script codes for finepdfs-edu
COMMON_LANGUAGES = {
    "eng_Latn": "English (Latin script)",
    "fra_Latn": "French (Latin script)",
    "deu_Latn": "German (Latin script)",
    "spa_Latn": "Spanish (Latin script)",
    "por_Latn": "Portuguese (Latin script)",
    "ita_Latn": "Italian (Latin script)",
    "nld_Latn": "Dutch (Latin script)",
    "pol_Latn": "Polish (Latin script)",
    "rus_Cyrl": "Russian (Cyrillic script)",
    "zho_Hans": "Chinese (Simplified)",
    "zho_Hant": "Chinese (Traditional)",
    "jpn_Jpan": "Japanese",
    "kor_Hang": "Korean",
    "ara_Arab": "Arabic",
    "hin_Deva": "Hindi (Devanagari)",
}


def list_available_languages(dataset_id: str) -> list[str]:
    """List available language subsets in the dataset."""
    try:
        tree = list_repo_tree(dataset_id, path_in_repo="data", repo_type="dataset")
        languages = [
            item.path.replace("data/", "")
            for item in tree
            if item.path.startswith("data/")
            and "/" not in item.path.replace("data/", "")
        ]
        return sorted(languages)
    except Exception as e:
        logger.warning(f"Could not list languages: {e}")
        return list(COMMON_LANGUAGES.keys())


def compute_temporal_stats(df: pl.LazyFrame, output_path: Path) -> pl.DataFrame:
    """Single scan: compute stats grouped by dump for temporal analysis."""
    query = df.group_by("dump").agg(
        pl.len().alias("doc_count"),
        pl.col("token_count").sum().alias("total_tokens"),
        pl.col("fw_edu_scores").list.mean().mean().alias("avg_edu_score"),
        (pl.col("fw_edu_scores").list.mean() >= 3).sum().alias("high_edu_count"),
    )
    query.sink_parquet(output_path, engine="streaming")
    return pl.read_parquet(output_path)


def compute_global_stats(temporal: pl.DataFrame) -> pl.DataFrame:
    """Compute global stats from temporal breakdown."""
    total = temporal["doc_count"].sum()
    return pl.DataFrame(
        {
            "total_docs": [total],
            "total_tokens": [temporal["total_tokens"].sum()],
            "avg_edu_score": [
                (temporal["avg_edu_score"] * temporal["doc_count"]).sum() / total
            ],
            "high_edu_rate": [temporal["high_edu_count"].sum() / total],
            "num_dumps": [len(temporal)],
        }
    )


def format_temporal_stats(temporal: pl.DataFrame) -> pl.DataFrame:
    """Format temporal stats with high_edu_rate, sorted chronologically."""
    return (
        temporal.with_columns(
            (pl.col("high_edu_count") / pl.col("doc_count")).alias("high_edu_rate")
        )
        .select(["dump", "doc_count", "avg_edu_score", "high_edu_rate"])
        .sort(
            "dump"
        )  # Chronological order (CC-MAIN-2017-xx comes before CC-MAIN-2024-xx)
    )


def create_ascii_charts(temporal_stats: pl.DataFrame) -> str:
    """Create ASCII bar charts showing temporal trends."""
    # Extract year from dump name (CC-MAIN-2024-42 -> 2024)
    # Group by year and average the values for cleaner display
    yearly = (
        temporal_stats.with_columns(
            pl.col("dump").str.extract(r"CC-MAIN-(\d{4})", 1).alias("year")
        )
        .group_by("year")
        .agg(
            pl.col("doc_count").sum(),
            pl.col("avg_edu_score").mean(),
            pl.col("high_edu_rate").mean(),
        )
        .sort("year")
    )

    lines = []

    # High edu rate chart (more dramatic differences)
    data_rate = [
        (row["year"], row["high_edu_rate"] * 100)
        for row in yearly.iter_rows(named=True)
    ]
    graph = Pyasciigraph(line_length=60, float_format="{0:.1f}%")
    lines.extend(graph.graph("High Educational Content (edu >= 3)", data_rate))

    lines.append("")

    # Avg edu score chart
    data_score = [
        (row["year"], row["avg_edu_score"]) for row in yearly.iter_rows(named=True)
    ]
    graph2 = Pyasciigraph(line_length=60, float_format="{0:.2f}")
    lines.extend(graph2.graph("Average Educational Score", data_score))

    return "\n".join(lines)


def create_readme(
    args,
    global_stats: pl.DataFrame,
    temporal_stats: pl.DataFrame,
    scan_time: float,
    ascii_charts: str,
) -> str:
    """Create README content for the stats dataset."""
    stats = global_stats.to_dicts()[0]
    total_docs = stats.get("total_docs", 0)
    docs_per_sec = total_docs / scan_time if scan_time > 0 else 0

    # Get first and last year averages for trend (more representative than single dumps)
    yearly = (
        temporal_stats.with_columns(
            pl.col("dump").str.extract(r"CC-MAIN-(\d{4})", 1).alias("year")
        )
        .group_by("year")
        .agg(
            pl.col("doc_count").sum(),
            pl.col("avg_edu_score").mean(),
            pl.col("high_edu_rate").mean(),
        )
        .sort("year")
    )
    first_year = yearly.head(1).to_dicts()[0]
    last_year = yearly.tail(1).to_dicts()[0]

    scope = (
        "all languages"
        if args.all_languages
        else COMMON_LANGUAGES.get(args.lang, args.lang)
    )

    return f"""---
tags:
  - uv-script
  - statistics
  - polars
  - finepdfs-edu
  - temporal-analysis
license: odc-by
configs:
  - config_name: global_stats
    data_files: global_stats/train-*.parquet
  - config_name: temporal_stats
    data_files: temporal_stats/train-*.parquet
default_viewer_config: temporal_stats
---

# Is the Web Getting More Educational?

Temporal analysis of educational quality in **{scope}** across {stats.get("num_dumps", 0)} CommonCrawl dumps.

## Trend

```
{ascii_charts}
```

## Key Finding

| Year | Avg Edu Score | High Edu Rate |
|------|---------------|---------------|
| {first_year["year"]} | {first_year["avg_edu_score"]:.2f} | {first_year["high_edu_rate"] * 100:.1f}% |
| {last_year["year"]} | {last_year["avg_edu_score"]:.2f} | {last_year["high_edu_rate"] * 100:.1f}% |

## Performance

- **{total_docs:,} documents** processed in **{scan_time:.0f} seconds**
- **{docs_per_sec:,.0f} docs/sec** using Polars streaming
- Single scan, no full dataset download required

## Summary

| Metric | Value |
|--------|-------|
| Scope | {scope} |
| Total Documents | {total_docs:,} |
| Total Tokens | {stats.get("total_tokens", 0):,} |
| Avg Edu Score | {stats.get("avg_edu_score", 0):.3f} |
| High Edu Rate | {stats.get("high_edu_rate", 0) * 100:.1f}% |
| CommonCrawl Dumps | {stats.get("num_dumps", 0)} |

## Files

- `global_stats` - Overall summary
- `temporal_stats` - Per-dump breakdown (sorted chronologically)

## Reproduce

```bash
uv run https://huggingface.co/datasets/uv-scripts/dataset-stats/raw/main/finepdfs-stats.py \\
    {"--all-languages" if args.all_languages else f"--lang {args.lang}"} --output-repo your-username/stats
```

## Source

- **Dataset**: [{args.source_dataset}](https://huggingface.co/datasets/{args.source_dataset})
- **Script**: [uv-scripts/dataset-stats](https://huggingface.co/datasets/uv-scripts/dataset-stats)
"""


def main():
    parser = argparse.ArgumentParser(
        description="Analyze educational quality trends across CommonCrawl dumps",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=__doc__,
    )

    parser.add_argument(
        "--source-dataset",
        type=str,
        default="HuggingFaceFW/finepdfs-edu",
        help="Source dataset (default: HuggingFaceFW/finepdfs-edu)",
    )

    parser.add_argument(
        "--lang",
        type=str,
        default="eng_Latn",
        help="Language+script code (default: eng_Latn)",
    )

    parser.add_argument(
        "--all-languages",
        action="store_true",
        help="Analyze all languages (70+) instead of single language",
    )

    parser.add_argument(
        "--show-plan",
        action="store_true",
        help="Show Polars query plan (demonstrates optimization)",
    )

    parser.add_argument(
        "--list-languages",
        action="store_true",
        help="List available languages and exit",
    )

    parser.add_argument(
        "--limit",
        type=int,
        help="Limit to first N rows (for testing)",
    )

    parser.add_argument(
        "--output-repo",
        type=str,
        help="HuggingFace dataset repository to upload results",
    )

    parser.add_argument(
        "--output-dir",
        type=str,
        default="./stats_output",
        help="Local directory for output files",
    )

    parser.add_argument(
        "--hf-token",
        type=str,
        help="HuggingFace API token (or set HF_TOKEN env var)",
    )

    parser.add_argument(
        "--private",
        action="store_true",
        help="Make the output dataset private",
    )

    args = parser.parse_args()

    # Check for high-performance mode
    if os.environ.get("HF_XET_HIGH_PERFORMANCE"):
        logger.info("High-performance mode enabled (HF_XET_HIGH_PERFORMANCE=1)")

    # List languages mode
    if args.list_languages:
        print(f"Available language+script codes for {args.source_dataset}:\n")
        print("Common languages:")
        for code, name in COMMON_LANGUAGES.items():
            print(f"  {code:12} - {name}")
        print("\nFetching full list from HF Hub...")
        all_langs = list_available_languages(args.source_dataset)
        print(f"\nAll available ({len(all_langs)} total):")
        for lang in all_langs[:30]:  # Show first 30
            name = COMMON_LANGUAGES.get(lang, "")
            print(f"  {lang:12} {name}")
        if len(all_langs) > 30:
            print(f"  ... and {len(all_langs) - 30} more")
        sys.exit(0)

    # Build the parquet path
    if args.all_languages:
        source_path = f"hf://datasets/{args.source_dataset}/data/*/train/*.parquet"
        scope_desc = "all languages"
    else:
        source_path = (
            f"hf://datasets/{args.source_dataset}/data/{args.lang}/train/*.parquet"
        )
        scope_desc = f"{args.lang} ({COMMON_LANGUAGES.get(args.lang, 'unknown')})"

    logger.info(f"Scanning: {source_path}")
    logger.info(f"Scope: {scope_desc}")

    # Create lazy frame - this doesn't load any data yet!
    logger.info("Creating lazy query plan...")
    df = pl.scan_parquet(source_path)

    # Apply limit if specified
    if args.limit:
        logger.info(f"Limiting to first {args.limit:,} rows")
        df = df.head(args.limit)

    # Show query plan if requested
    if args.show_plan:
        # Build a sample query to show the plan
        sample_query = df.select(
            pl.len(),
            pl.col("token_count").sum(),
            pl.col("language").n_unique(),
        )
        print("\nQuery Plan (showing Polars optimization):")
        print("=" * 60)
        print(sample_query.explain())
        print("=" * 60)
        print("\nNote: Polars uses projection pushdown - only reads columns needed!")
        print("The 'text' column is never loaded, making this very fast.\n")

    # Create output directory
    output_dir = Path(args.output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)

    # Single scan: compute temporal stats
    logger.info("Computing temporal stats (single scan)...")
    start = time.perf_counter()
    temporal_path = output_dir / "temporal_stats.parquet"
    temporal_raw = compute_temporal_stats(df, temporal_path)
    scan_time = time.perf_counter() - start
    logger.info(f"Scan complete in {scan_time:.2f}s - {len(temporal_raw)} dumps")

    # Compute stats
    global_stats = compute_global_stats(temporal_raw)
    temporal_stats = format_temporal_stats(temporal_raw)

    # Save
    global_stats.write_parquet(output_dir / "global_stats.parquet")
    temporal_stats.write_parquet(output_dir / "temporal_stats.parquet")

    # Print results
    total_docs = global_stats["total_docs"][0]
    docs_per_sec = total_docs / scan_time if scan_time > 0 else 0

    print("\n" + "=" * 70)
    print("IS THE WEB GETTING MORE EDUCATIONAL?")
    print("=" * 70)

    print(f"\nScope: {scope_desc}")
    print(f"Dataset: {args.source_dataset}")

    print("\n" + "-" * 70)
    print("GLOBAL STATS")
    print("-" * 70)
    print(global_stats)

    print("\n" + "-" * 70)
    print(f"TEMPORAL TREND ({len(temporal_stats)} CommonCrawl dumps)")
    print("-" * 70)
    # Show first 5 and last 5
    if len(temporal_stats) > 10:
        print("Earliest dumps:")
        print(temporal_stats.head(5))
        print("\n...")
        print("\nLatest dumps:")
        print(temporal_stats.tail(5))
    else:
        print(temporal_stats)

    # Create ASCII charts
    ascii_charts = create_ascii_charts(temporal_stats)
    print("\n" + "-" * 70)
    print("TREND VISUALIZATION")
    print("-" * 70)
    print(ascii_charts)

    print("\n" + "-" * 70)
    print("PERFORMANCE")
    print("-" * 70)
    print(f"Scan time: {scan_time:.2f}s")
    print(f"Documents: {total_docs:,}")
    print(f"Throughput: {docs_per_sec:,.0f} docs/sec")

    logger.info(f"Results saved to: {output_dir}")

    # Upload to HF Hub if requested
    if args.output_repo:
        hf_token = args.hf_token or os.environ.get("HF_TOKEN")
        if hf_token:
            login(token=hf_token)

        api = HfApi(token=hf_token)

        logger.info(f"Creating/updating dataset repository: {args.output_repo}")
        create_repo(
            args.output_repo,
            repo_type="dataset",
            private=args.private,
            token=hf_token,
            exist_ok=True,
        )

        # Upload each as a dataset config
        configs = [
            ("global_stats", global_stats),
            ("temporal_stats", temporal_stats),
        ]

        for config_name, stats_df in configs:
            logger.info(f"Uploading {config_name}...")
            ds = Dataset.from_polars(stats_df)
            ds.push_to_hub(
                args.output_repo,
                config_name=config_name,
                token=hf_token,
                private=args.private,
            )
            time.sleep(1)  # Avoid 409 conflicts

        # Upload README
        readme_content = create_readme(
            args, global_stats, temporal_stats, scan_time, ascii_charts
        )
        api.upload_file(
            path_or_fileobj=readme_content.encode(),
            path_in_repo="README.md",
            repo_id=args.output_repo,
            repo_type="dataset",
            token=hf_token,
        )

        dataset_url = f"https://huggingface.co/datasets/{args.output_repo}"
        logger.info(f"Dataset uploaded: {dataset_url}")
        print(f"\nResults uploaded to: {dataset_url}")


if __name__ == "__main__":
    if len(sys.argv) == 1:
        print("Is the Web Getting More Educational?")
        print("=" * 40)
        print("\nAnalyze educational quality trends across CommonCrawl dumps")
        print("using Polars streaming - no download needed!\n")
        print("Example commands:\n")
        print("# Quick test:")
        print("uv run finepdfs-stats.py --limit 10000\n")
        print("# Analyze English PDFs:")
        print("uv run finepdfs-stats.py\n")
        print("# Analyze ALL 70+ languages:")
        print("uv run finepdfs-stats.py --all-languages\n")
        print("# Show query plan (see Polars optimization):")
        print("uv run finepdfs-stats.py --show-plan --limit 1000\n")
        print("# Save results to HF Hub:")
        print("uv run finepdfs-stats.py --output-repo username/temporal-stats\n")
        print("# Run on HF Jobs:")
        print("hf jobs uv run \\")
        print("    -s HF_TOKEN \\")
        print("    -e HF_XET_HIGH_PERFORMANCE=1 \\")
        print(
            "    https://huggingface.co/datasets/uv-scripts/dataset-stats/raw/main/finepdfs-stats.py \\"
        )
        print("    -- --output-repo username/stats")
        sys.exit(0)

    main()
