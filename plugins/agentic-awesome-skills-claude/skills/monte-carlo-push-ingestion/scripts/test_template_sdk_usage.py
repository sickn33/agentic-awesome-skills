#!/usr/bin/env python3
"""
Smoke test that every pycarlo model construction used by the templates
actually works with the real SDK. A wrong parameter name raises TypeError.

Run:
    pip install pycarlo
    python test_template_sdk_usage.py
"""

from datetime import datetime, timezone

from pycarlo.features.ingestion.models import (
    AssetField,
    AssetFreshness,
    AssetMetadata,
    AssetVolume,
    ColumnLineageField,
    ColumnLineageSourceField,
    LineageAssetRef,
    LineageEvent,
    QueryLogEntry,
    RelationalAsset,
    Tag,
    build_lineage_payload,
    build_metadata_payload,
    build_query_log_payload,
)

PASSED = 0
FAILED = 0


def check(label: str, fn):
    global PASSED, FAILED
    try:
        obj = fn()
        # Also verify serialization works
        if hasattr(obj, "to_dict"):
            obj.to_dict()
        PASSED += 1
        print(f"  PASS  {label}")
    except Exception as exc:
        FAILED += 1
        print(f"  FAIL  {label}: {exc}")


def test_metadata_models():
    print("\n== Metadata models ==")

    check("AssetField(name, type)", lambda: AssetField(name="id", type="INTEGER"))

    check(
        "AssetField(name, type, description)",
        lambda: AssetField(name="id", type="INTEGER", description="Primary key"),
    )

    check(
        "AssetMetadata(name, database, schema)",
        lambda: AssetMetadata(name="orders", database="analytics", schema="public"),
    )

    check(
        "AssetMetadata(name, database, schema, description, view_query, created_on)",
        lambda: AssetMetadata(
            name="orders_view",
            database="analytics",
            schema="public",
            description="A view",
            view_query="SELECT * FROM orders",
            created_on="2026-01-01T00:00:00Z",
        ),
    )

    check("AssetVolume(row_count)", lambda: AssetVolume(row_count=1000))
    check(
        "AssetVolume(row_count, byte_count)",
        lambda: AssetVolume(row_count=1000, byte_count=50000),
    )

    check(
        "AssetFreshness(last_update_time)",
        lambda: AssetFreshness(last_update_time="2026-03-12T14:30:00Z"),
    )

    check("Tag(key, value)", lambda: Tag(key="env", value="prod"))
    check("Tag(key only)", lambda: Tag(key="pii"))

    check(
        "RelationalAsset — full nested structure",
        lambda: RelationalAsset(
            type="TABLE",
            metadata=AssetMetadata(
                name="orders",
                database="analytics",
                schema="public",
                description="Orders table",
            ),
            fields=[
                AssetField(name="id", type="INTEGER"),
                AssetField(name="amount", type="DECIMAL(10,2)", description="Order total"),
            ],
            volume=AssetVolume(row_count=1000000, byte_count=111111111),
            freshness=AssetFreshness(last_update_time="2026-03-12T14:30:00Z"),
            tags=[Tag(key="env", value="prod")],
        ),
    )

    check(
        "RelationalAsset — minimal (no volume, freshness, tags)",
        lambda: RelationalAsset(
            type="VIEW",
            metadata=AssetMetadata(name="v_orders", database="db", schema="sch"),
        ),
    )


def test_lineage_models():
    print("\n== Lineage models ==")

    check(
        "LineageAssetRef(type, name, database, schema)",
        lambda: LineageAssetRef(
            type="TABLE", name="orders", database="analytics", schema="public"
        ),
    )

    check(
        "LineageAssetRef(type, name, database, schema, asset_id)",
        lambda: LineageAssetRef(
            type="TABLE",
            name="orders",
            database="analytics",
            schema="public",
            asset_id="analytics:public.orders",
        ),
    )

    check(
        "LineageEvent — table lineage",
        lambda: LineageEvent(
            destination=LineageAssetRef(
                type="TABLE", name="curated", database="db", schema="sch"
            ),
            sources=[
                LineageAssetRef(type="TABLE", name="raw", database="db", schema="sch"),
            ],
        ),
    )

    check(
        "ColumnLineageSourceField(asset_id, field_name)",
        lambda: ColumnLineageSourceField(
            asset_id="db:sch.raw", field_name="amount"
        ),
    )

    check(
        "ColumnLineageField(name, source_fields)",
        lambda: ColumnLineageField(
            name="total_amount",
            source_fields=[
                ColumnLineageSourceField(asset_id="db:sch.raw", field_name="amount"),
            ],
        ),
    )

    check(
        "LineageEvent — column lineage",
        lambda: LineageEvent(
            destination=LineageAssetRef(
                type="TABLE",
                name="curated",
                database="db",
                schema="sch",
                asset_id="db:sch.curated",
            ),
            sources=[
                LineageAssetRef(
                    type="TABLE",
                    name="raw",
                    database="db",
                    schema="sch",
                    asset_id="db:sch.raw",
                ),
            ],
            fields=[
                ColumnLineageField(
                    name="total_amount",
                    source_fields=[
                        ColumnLineageSourceField(
                            asset_id="db:sch.raw", field_name="amount"
                        ),
                    ],
                ),
            ],
        ),
    )


def test_query_log_models():
    print("\n== Query log models ==")

    now = datetime.now(tz=timezone.utc)

    check(
        "QueryLogEntry — minimal",
        lambda: QueryLogEntry(
            start_time=now,
            end_time=now,
            query_text="SELECT 1",
        ),
    )

    check(
        "QueryLogEntry — full with extra",
        lambda: QueryLogEntry(
            start_time=now,
            end_time=now,
            query_text="SELECT * FROM orders",
            query_id="query-123",
            user="analyst@company.com",
            returned_rows=100,
            error_code=None,
            error_text=None,
            extra={
                "warehouse_name": "COMPUTE_WH",
                "bytes_scanned": 12345,
            },
        ),
    )

    check(
        "QueryLogEntry — Snowflake extra fields",
        lambda: QueryLogEntry(
            start_time=now,
            end_time=now,
            query_text="SELECT 1",
            extra={"warehouse_name": "WH", "bytes_scanned": 100},
        ),
    )

    check(
        "QueryLogEntry — BigQuery extra fields",
        lambda: QueryLogEntry(
            start_time=now,
            end_time=now,
            query_text="SELECT 1",
            extra={"total_bytes_billed": 999, "statement_type": "SELECT"},
        ),
    )

    check(
        "QueryLogEntry — Databricks extra fields",
        lambda: QueryLogEntry(
            start_time=now,
            end_time=now,
            query_text="SELECT 1",
            extra={"total_task_duration_ms": 500, "read_rows": 10, "read_bytes": 200},
        ),
    )

    check(
        "QueryLogEntry — Redshift extra fields",
        lambda: QueryLogEntry(
            start_time=now,
            end_time=now,
            query_text="SELECT 1",
            extra={"database_name": "dev", "elapsed_time_us": 123456},
        ),
    )


def test_payload_builders():
    print("\n== Payload builders ==")

    now = datetime.now(tz=timezone.utc)

    check(
        "build_metadata_payload",
        lambda: build_metadata_payload(
            resource_uuid="uuid-123",
            resource_type="snowflake",
            events=[
                RelationalAsset(
                    type="TABLE",
                    metadata=AssetMetadata(name="t", database="d", schema="s"),
                )
            ],
        ),
    )

    check(
        "build_lineage_payload — table",
        lambda: build_lineage_payload(
            resource_uuid="uuid-123",
            resource_type="snowflake",
            events=[
                LineageEvent(
                    destination=LineageAssetRef(
                        type="TABLE", name="dst", database="d", schema="s"
                    ),
                    sources=[
                        LineageAssetRef(
                            type="TABLE", name="src", database="d", schema="s"
                        )
                    ],
                )
            ],
        ),
    )

    check(
        "build_query_log_payload",
        lambda: build_query_log_payload(
            resource_uuid="uuid-123",
            log_type="snowflake",
            events=[
                QueryLogEntry(
                    start_time=now,
                    end_time=now,
                    query_text="SELECT 1",
                )
            ],
        ),
    )


if __name__ == "__main__":
    test_metadata_models()
    test_lineage_models()
    test_query_log_models()
    test_payload_builders()
    print(f"\n{'='*40}")
    print(f"Results: {PASSED} passed, {FAILED} failed")
    if FAILED:
        print("SOME TESTS FAILED — templates use wrong parameter names!")
        raise SystemExit(1)
    else:
        print("All tests passed — all model constructions are valid.")
