#!/usr/bin/env python3
"""
Monte Carlo Push Ingestion — Verification Helper

Queries the Monte Carlo GraphQL API to verify that pushed metadata, lineage, and
query logs are visible in the platform.

Prerequisites:
    pip install requests

    Set environment variables:
        MCD_ID      — GraphQL API key ID   (from getmontecarlo.com/settings/api)
        MCD_TOKEN   — GraphQL API key secret
        MCD_RESOURCE_UUID   — Your MC warehouse/resource UUID

Usage:
    python sample_verify.py \
        --full-table-id "analytics:public.orders" \
        --check-schema \
        --check-metrics \
        --check-detectors \
        --check-lineage \
        --expected-sources "analytics:public.customers" "analytics:public.raw_orders"
"""

import argparse
import json
import os
import sys
from datetime import datetime, timedelta, timezone

import requests

GRAPHQL_URL = "https://api.getmontecarlo.com/graphql"


def graphql(query: str, variables: dict, key_id: str, key_token: str) -> dict:
    """Execute a GraphQL query/mutation and return the data payload."""
    resp = requests.post(
        GRAPHQL_URL,
        json={"query": query, "variables": variables},
        headers={
            "x-mcd-id": key_id,
            "x-mcd-token": key_token,
            "Content-Type": "application/json",
        },
        timeout=30,
    )
    resp.raise_for_status()
    body = resp.json()
    if "errors" in body:
        raise RuntimeError(json.dumps(body["errors"], indent=2))
    return body["data"]


# ---------------------------------------------------------------------------
# Step 1: Resolve MCON from fullTableId
# ---------------------------------------------------------------------------

def get_table_mcon(full_table_id: str, dw_id: str, key_id: str, key_token: str) -> str:
    """Resolve a fullTableId + warehouse UUID to an MCON."""
    data = graphql(
        """query GetTable($fullTableId: String!, $dwId: UUID!) {
             getTable(fullTableId: $fullTableId, dwId: $dwId) {
               mcon fullTableId displayName
             }
           }""",
        {"fullTableId": full_table_id, "dwId": dw_id},
        key_id, key_token,
    )
    table = data.get("getTable")
    if not table:
        raise ValueError(f"Table not found: {full_table_id} in resource {dw_id}")
    print(f"  Resolved: {table['fullTableId']} → MCON: {table['mcon']}")
    return table["mcon"]


# ---------------------------------------------------------------------------
# Step 2: Verify schema (columns)
# ---------------------------------------------------------------------------

def verify_schema(mcon: str, expected_fields: list[str], key_id: str, key_token: str) -> bool:
    """Check that the table's column names match expected_fields."""
    data = graphql(
        """query GetSchema($mcon: String!) {
             getTable(mcon: $mcon) {
               versions {
                 edges {
                   node {
                     fields { name fieldType }
                   }
                 }
               }
             }
           }""",
        {"mcon": mcon},
        key_id, key_token,
    )
    edges = (data.get("getTable") or {}).get("versions", {}).get("edges", [])
    if not edges:
        print("  WARN: no schema versions found")
        return False
    fields = edges[0]["node"]["fields"]
    got_names = {f["name"].lower() for f in fields}
    print(f"  Schema: {len(fields)} column(s) — {', '.join(f['name'] for f in fields[:8])}{'...' if len(fields) > 8 else ''}")
    if expected_fields:
        missing = [e for e in expected_fields if e.lower() not in got_names]
        if missing:
            print(f"  FAIL: missing columns: {missing}")
            return False
        print(f"  PASS: all expected columns present")
    return True


# ---------------------------------------------------------------------------
# Step 3: Verify volume/freshness metrics
# ---------------------------------------------------------------------------

def verify_metrics(mcon: str, key_id: str, key_token: str) -> None:
    """Fetch and display the latest row_count and freshness metrics."""
    end = datetime.now(tz=timezone.utc)
    start = end - timedelta(days=7)
    for metric_name in ("total_row_count", "total_row_count_last_changed_on"):
        data = graphql(
            """query GetMetrics($mcon: String!, $metricName: String!, $start: DateTime!, $end: DateTime!) {
                 getMetricsV4(dwId: null, mcon: $mcon, metricName: $metricName,
                              startTime: $start, endTime: $end) {
                   metricsJson
                 }
               }""",
            {"mcon": mcon, "metricName": metric_name,
             "start": start.isoformat(), "end": end.isoformat()},
            key_id, key_token,
        )
        metrics_json = (data.get("getMetricsV4") or {}).get("metricsJson")
        if not metrics_json:
            print(f"  {metric_name}: no data")
            continue
        points = json.loads(metrics_json)
        if not points:
            print(f"  {metric_name}: no data points")
            continue
        latest = max(points, key=lambda p: p.get("measurementTimestamp") or "")
        val = latest.get("value")
        ts = latest.get("measurementTimestamp")
        if metric_name == "total_row_count_last_changed_on" and val:
            ts_fmt = datetime.fromtimestamp(float(val), tz=timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
            print(f"  {metric_name}: {ts_fmt}")
        else:
            print(f"  {metric_name}: {val} (at {ts})")


# ---------------------------------------------------------------------------
# Step 3b: Verify detector status (freshness + volume)
# ---------------------------------------------------------------------------

def verify_detectors(mcon: str, key_id: str, key_token: str) -> None:
    """Check the status of freshness and volume anomaly detectors."""
    data = graphql(
        """query GetDetectors($mcon: String!) {
             getTable(mcon: $mcon) {
               thresholds {
                 freshness { status }
                 size { status }
               }
             }
           }""",
        {"mcon": mcon},
        key_id, key_token,
    )
    thresholds = (data.get("getTable") or {}).get("thresholds") or {}
    freshness = thresholds.get("freshness") or {}
    size = thresholds.get("size") or {}
    freshness_status = freshness.get("status", "not available")
    size_status = size.get("status", "not available")
    print(f"  Freshness detector: {freshness_status}")
    print(f"  Volume detector:    {size_status}")
    if freshness_status in ("no data", "training"):
        print("  ↳ Freshness needs 7+ pushes with changed last_update_time over ~2 weeks")
    if size_status in ("no data", "training"):
        print("  ↳ Volume needs 10-48 samples over ~42 days (push hourly, consistently)")


# ---------------------------------------------------------------------------
# Step 4: Verify table lineage (upstream)
# ---------------------------------------------------------------------------

def verify_table_lineage(
    mcon: str,
    expected_source_mcons: list[str],
    key_id: str,
    key_token: str,
) -> bool:
    """Check that expected source MCONs appear in the upstream lineage."""
    data = graphql(
        """query GetLineage($mcon: String!) {
             getTableLineage(mcon: $mcon, direction: "upstream", hops: 1) {
               connectedNodes { mcon displayName objectType }
               flattenedEdges { directlyConnectedMcons }
             }
           }""",
        {"mcon": mcon},
        key_id, key_token,
    )
    lineage = data.get("getTableLineage") or {}
    connected = {n["mcon"] for n in lineage.get("connectedNodes", [])}
    flat = {m for e in lineage.get("flattenedEdges", []) for m in e.get("directlyConnectedMcons", [])}
    all_found = connected | flat
    print(f"  Upstream nodes: {len(connected)}")
    if not expected_source_mcons:
        return True
    missing = [s for s in expected_source_mcons if s not in all_found]
    if missing:
        print(f"  FAIL: missing sources: {missing}")
        return False
    print("  PASS: all expected sources present")
    return True


# ---------------------------------------------------------------------------
# Step 5: Verify column lineage
# ---------------------------------------------------------------------------

def verify_column_lineage(
    source_mcon: str,
    source_column: str,
    expected_dest_mcon: str,
    expected_dest_column: str,
    key_id: str,
    key_token: str,
) -> bool:
    """Check that source_column flows to expected_dest_column on expected_dest_mcon."""
    data = graphql(
        """query GetColLineage($mcon: String!, $column: String!) {
             getDerivedTablesPartialLineage(mcon: $mcon, column: $column, pageSize: 1000) {
               destinations {
                 table { mcon displayName }
                 columns { columnName }
               }
             }
           }""",
        {"mcon": source_mcon, "column": source_column},
        key_id, key_token,
    )
    destinations = (data.get("getDerivedTablesPartialLineage") or {}).get("destinations", [])
    for dest in destinations:
        if dest["table"]["mcon"] == expected_dest_mcon:
            cols = {c["columnName"] for c in dest.get("columns", [])}
            if expected_dest_column in cols:
                print(f"  PASS: {source_column} → {dest['table']['displayName']}.{expected_dest_column}")
                return True
    print(f"  FAIL: {source_column} → {expected_dest_mcon}.{expected_dest_column} not found")
    return False


# ---------------------------------------------------------------------------
# Step 6: Verify query logs
# ---------------------------------------------------------------------------

def verify_query_logs(
    mcon: str,
    start_time: datetime,
    end_time: datetime,
    key_id: str,
    key_token: str,
) -> None:
    """Report read/write query counts for a table within the given time window."""
    for query_type in ("read", "write"):
        cursor = None
        total = 0
        while True:
            data = graphql(
                """query GetQueries($mcon: String!, $type: String!, $start: DateTime!, $end: DateTime!, $after: String) {
                     getAggregatedQueries(mcon: $mcon, queryType: $type,
                                         startTime: $start, endTime: $end,
                                         first: 200, after: $after) {
                       edges { node { queryHash queryCount lastSeen } }
                       pageInfo { hasNextPage endCursor }
                     }
                   }""",
                {"mcon": mcon, "type": query_type,
                 "start": start_time.isoformat(), "end": end_time.isoformat(),
                 "after": cursor},
                key_id, key_token,
            )
            result = data.get("getAggregatedQueries") or {}
            total += sum(e["node"]["queryCount"] for e in result.get("edges", []))
            page = result.get("pageInfo", {})
            if not page.get("hasNextPage"):
                break
            cursor = page["endCursor"]
        print(f"  {query_type} queries: {total}")


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------

def main() -> None:
    parser = argparse.ArgumentParser(description="Verify Monte Carlo push-ingested data via GraphQL")
    parser.add_argument("--key-id",    default=os.environ.get("MCD_ID"))
    parser.add_argument("--key-token", default=os.environ.get("MCD_TOKEN"))
    parser.add_argument("--resource-uuid", default=os.environ.get("MCD_RESOURCE_UUID"), required=False)
    parser.add_argument("--full-table-id", required=True, help="e.g. analytics:public.orders")
    parser.add_argument("--mcon", help="Use MCON directly instead of resolving from fullTableId")
    parser.add_argument("--check-schema",  action="store_true")
    parser.add_argument("--check-metrics", action="store_true")
    parser.add_argument("--check-detectors", action="store_true", help="Check freshness/volume detector status")
    parser.add_argument("--check-lineage", action="store_true")
    parser.add_argument("--check-query-logs", action="store_true")
    parser.add_argument("--expected-fields", nargs="*", default=[])
    parser.add_argument("--expected-sources", nargs="*", default=[], help="Source MCONs for lineage check")
    parser.add_argument("--lookback-hours", type=int, default=24, help="For query log check (default: 24)")
    args = parser.parse_args()

    if not args.key_id or not args.key_token:
        print("ERROR: Provide --key-id/--key-token or set MCD_ID/MCD_TOKEN", file=sys.stderr)
        sys.exit(1)

    print(f"\n{'='*60}")
    print(f"Verifying: {args.full_table_id}")
    print(f"{'='*60}")

    mcon = args.mcon
    if not mcon:
        if not args.resource_uuid:
            print("ERROR: --resource-uuid required when --mcon is not provided", file=sys.stderr)
            sys.exit(1)
        mcon = get_table_mcon(args.full_table_id, args.resource_uuid, args.key_id, args.key_token)

    if args.check_schema:
        print("\n[Schema]")
        verify_schema(mcon, args.expected_fields, args.key_id, args.key_token)

    if args.check_metrics:
        print("\n[Metrics]")
        verify_metrics(mcon, args.key_id, args.key_token)

    if args.check_detectors:
        print("\n[Detectors]")
        verify_detectors(mcon, args.key_id, args.key_token)

    if args.check_lineage:
        print("\n[Table Lineage]")
        verify_table_lineage(mcon, args.expected_sources, args.key_id, args.key_token)

    if args.check_query_logs:
        print("\n[Query Logs]")
        end = datetime.now(tz=timezone.utc)
        start = end - timedelta(hours=args.lookback_hours)
        verify_query_logs(mcon, start, end, args.key_id, args.key_token)

    print("\nDone.")


if __name__ == "__main__":
    main()
