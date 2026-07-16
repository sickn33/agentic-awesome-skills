"""
Exportação de dados de leiloeiros para diferentes formatos.

Uso:
    python scripts/export.py --format json
    python scripts/export.py --format csv
    python scripts/export.py --format jsonl
    python scripts/export.py --format parquet   # requer pandas + pyarrow
    python scripts/export.py --format all       # exporta todos os formatos
    python scripts/export.py --format csv --estado SP
    python scripts/export.py --output /caminho/personalizado/
"""
from __future__ import annotations

import argparse
import csv
import json
import sys
from datetime import datetime, timezone
from pathlib import Path


def safe_user_path(path_value, base_dir="."):
    """Resolve a CLI path under the current workspace."""
    if base_dir != ".":
        raise ValueError("Custom base directories are not supported for CLI paths")
    base_path = Path.cwd().resolve()
    resolved_path = Path(path_value).expanduser().resolve()
    try:
        resolved_path.relative_to(base_path)
    except ValueError as exc:
        raise ValueError(f"Path escapes allowed directory: {path_value}") from exc
    return resolved_path
from typing import List, Optional

sys.path.insert(0, str(Path(__file__).parent))

from db import Database

OUTPUT_DIR = Path(__file__).parent.parent / "data" / "exports"


def export_json(records: list, output_dir: Path, suffix: str = "") -> Path:
    output_dir.mkdir(parents=True, exist_ok=True)
    ts = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
    path = output_dir / f"leiloeiros{suffix}_{ts}.json"
    payload = {"exported_at": datetime.now(timezone.utc).isoformat(), "total": len(records), "data": records}
    with safe_user_path(path).open("w", encoding="utf-8") as f:
        f.write(json.dumps(payload, ensure_ascii=False, indent=2))
    print(f"[JSON] {len(records)} registros → {path}")
    return path


def export_jsonl(records: list, output_dir: Path, suffix: str = "") -> Path:
    output_dir.mkdir(parents=True, exist_ok=True)
    ts = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
    path = output_dir / f"leiloeiros{suffix}_{ts}.jsonl"
    with safe_user_path(path).open("w", encoding="utf-8") as f:
        for rec in records:
            f.write(json.dumps(rec, ensure_ascii=False) + "\n")
    print(f"[JSONL] {len(records)} registros → {path}")
    return path


def export_csv(records: list, output_dir: Path, suffix: str = "") -> Path:
    if not records:
        print("[CSV] Nenhum registro para exportar.")
        return None

    output_dir.mkdir(parents=True, exist_ok=True)
    ts = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
    path = output_dir / f"leiloeiros{suffix}_{ts}.csv"

    with safe_user_path(path).open("w", newline="", encoding="utf-8-sig") as f:
        writer = csv.DictWriter(f, fieldnames=list(records[0].keys()), extrasaction="ignore")
        writer.writeheader()
        writer.writerows(records)
    print(f"[CSV] {len(records)} registros → {path}")
    return path


def export_parquet(records: list, output_dir: Path, suffix: str = "") -> Optional[Path]:
    try:
        import pandas as pd
    except ImportError:
        print("[PARQUET] pandas não instalado. Execute: pip install pandas pyarrow")
        return None

    output_dir.mkdir(parents=True, exist_ok=True)
    ts = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
    path = output_dir / f"leiloeiros{suffix}_{ts}.parquet"

    df = pd.DataFrame(records)
    df.to_parquet(path, index=False, engine="pyarrow")
    print(f"[PARQUET] {len(records)} registros → {path}")
    return path


def main():
    parser = argparse.ArgumentParser(description="Exporta dados de leiloeiros")
    parser.add_argument(
        "--format", choices=["json", "jsonl", "csv", "parquet", "all"],
        default="csv", help="Formato de exportação (default: csv)"
    )
    parser.add_argument(
        "--estado", nargs="*", metavar="UF",
        help="Filtrar por estado(s) (ex: SP RJ)"
    )
    parser.add_argument(
        "--output", default=str(OUTPUT_DIR),
        help=f"Diretório de saída (default: {OUTPUT_DIR})"
    )
    args = parser.parse_args()

    db = Database()
    db.init()

    output_dir = safe_user_path(args.output)
    estados = [e.upper() for e in args.estado] if args.estado else None

    if estados:
        all_records = []
        for uf in estados:
            all_records.extend(db.get_by_estado(uf))
        suffix = "_" + "_".join(estados)
    else:
        all_records = db.get_all()
        suffix = ""

    if not all_records:
        print("Banco vazio. Execute run_all.py primeiro.")
        sys.exit(0)

    fmt = args.format
    if fmt in ("json", "all"):
        export_json(all_records, output_dir, suffix)
    if fmt in ("jsonl", "all"):
        export_jsonl(all_records, output_dir, suffix)
    if fmt in ("csv", "all"):
        export_csv(all_records, output_dir, suffix)
    if fmt in ("parquet", "all"):
        export_parquet(all_records, output_dir, suffix)


if __name__ == "__main__":
    main()
