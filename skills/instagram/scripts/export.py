"""
Exportação de dados do Instagram para diferentes formatos.

Uso:
    python scripts/export.py --type insights --format csv
    python scripts/export.py --type comments --format json
    python scripts/export.py --type posts --format jsonl
    python scripts/export.py --type all --format csv
    python scripts/export.py --type actions --format json --output /caminho/
"""
from __future__ import annotations

import argparse
import csv
import json
import sys
from datetime import datetime, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

_db = None


def get_db():
    global _db
    if _db is None:
        from db import Database
        _db = Database()
        _db.init()
    return _db


def safe_output_dir(output: str | Path) -> Path:
    output_dir = Path(output).expanduser().resolve()
    skill_dir = Path(__file__).resolve().parents[1]
    try:
        output_dir.relative_to(skill_dir)
    except ValueError:
        return output_dir
    raise ValueError("Refusing to export inside the skill source directory")


def self_test() -> None:
    skill_dir = Path(__file__).resolve().parents[1]
    safe_output_dir(skill_dir.parent / "instagram-exports")
    try:
        safe_output_dir(skill_dir / "scripts" / "exports")
    except ValueError:
        return
    raise AssertionError("accepted export directory inside skill source")


def export_json(records: list, output_dir: Path, name: str) -> Path:
    output_dir.mkdir(parents=True, exist_ok=True)
    ts = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
    path = output_dir / f"instagram_{name}_{ts}.json"
    with open(path, "w", encoding="utf-8") as f:
        json.dump(
            {"exported_at": datetime.now(timezone.utc).isoformat(), "total": len(records), "data": records},
            f, ensure_ascii=False, indent=2,
        )
    print(f"[JSON] {len(records)} registros ->{path}")
    return path


def export_jsonl(records: list, output_dir: Path, name: str) -> Path:
    output_dir.mkdir(parents=True, exist_ok=True)
    ts = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
    path = output_dir / f"instagram_{name}_{ts}.jsonl"
    with open(path, "w", encoding="utf-8") as f:
        for rec in records:
            f.write(json.dumps(rec, ensure_ascii=False) + "\n")
    print(f"[JSONL] {len(records)} registros ->{path}")
    return path


def export_csv_file(records: list, output_dir: Path, name: str) -> Path:
    if not records:
        print("[CSV] Nenhum registro para exportar.")
        return None
    output_dir.mkdir(parents=True, exist_ok=True)
    ts = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
    path = output_dir / f"instagram_{name}_{ts}.csv"
    with open(path, "w", newline="", encoding="utf-8-sig") as f:
        writer = csv.DictWriter(f, fieldnames=list(records[0].keys()), extrasaction="ignore")
        writer.writeheader()
        writer.writerows(records)
    print(f"[CSV] {len(records)} registros ->{path}")
    return path


def get_data(data_type: str) -> tuple:
    """Retorna (records, name) para o tipo de dados."""
    conn = get_db()._connect()

    if data_type == "posts":
        rows = conn.execute("SELECT * FROM posts ORDER BY created_at DESC").fetchall()
        return [dict(r) for r in rows], "posts"
    elif data_type == "comments":
        rows = conn.execute("SELECT * FROM comments ORDER BY timestamp DESC").fetchall()
        return [dict(r) for r in rows], "comments"
    elif data_type == "insights":
        rows = conn.execute("""
            SELECT i.*, p.caption, p.permalink
            FROM insights i
            LEFT JOIN posts p ON p.ig_media_id = i.ig_media_id
            ORDER BY i.fetched_at DESC
        """).fetchall()
        return [dict(r) for r in rows], "insights"
    elif data_type == "user_insights":
        rows = conn.execute("SELECT * FROM user_insights ORDER BY end_time DESC").fetchall()
        return [dict(r) for r in rows], "user_insights"
    elif data_type == "templates":
        rows = conn.execute("SELECT * FROM templates ORDER BY name").fetchall()
        return [dict(r) for r in rows], "templates"
    elif data_type == "actions":
        rows = conn.execute("SELECT * FROM action_log ORDER BY created_at DESC").fetchall()
        return [dict(r) for r in rows], "actions"
    elif data_type == "all":
        return None, "all"
    else:
        return [], data_type


def do_export(records: list, name: str, fmt: str, output_dir: Path) -> None:
    if fmt in ("json", "all"):
        export_json(records, output_dir, name)
    if fmt in ("jsonl", "all"):
        export_jsonl(records, output_dir, name)
    if fmt in ("csv", "all"):
        export_csv_file(records, output_dir, name)


def main():
    parser = argparse.ArgumentParser(description="Exportar dados do Instagram")
    parser.add_argument("--type", required=False,
                        choices=["posts", "comments", "insights", "user_insights", "templates", "actions", "all"],
                        help="Tipo de dados")
    parser.add_argument("--format", default="csv", choices=["json", "jsonl", "csv", "all"],
                        help="Formato (default: csv)")
    default_exports_dir = Path(__file__).resolve().parents[1] / "data" / "exports"
    parser.add_argument("--output", default=str(default_exports_dir), help=f"Diretório (default: {default_exports_dir})")
    parser.add_argument("--self-test", action="store_true", help="Run safety self-checks")
    args = parser.parse_args()

    if args.self_test:
        self_test()
        return
    if not args.type:
        parser.error("--type is required unless --self-test is used")

    output_dir = safe_output_dir(args.output)

    if args.type == "all":
        for dtype in ["posts", "comments", "insights", "user_insights", "templates", "actions"]:
            records, name = get_data(dtype)
            if records:
                do_export(records, name, args.format, output_dir)
            else:
                print(f"[{dtype}] Sem dados.")
    else:
        records, name = get_data(args.type)
        if not records:
            print("Sem dados para exportar.")
            return
        do_export(records, name, args.format, output_dir)


if __name__ == "__main__":
    main()
