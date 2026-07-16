"""
API REST para consulta de leiloeiros das Juntas Comerciais do Brasil.

Uso:
    python scripts/serve_api.py
    python scripts/serve_api.py --port 8080 --host 0.0.0.0

Endpoints:
    GET /                       → info da API
    GET /leiloeiros             → lista todos (filtros: estado, situacao, nome, limit, offset)
    GET /leiloeiros/{estado}    → por UF
    GET /busca?q=texto          → busca por nome/matrícula/município
    GET /stats                  → contagem por estado
    GET /export/json            → dump completo em JSON
    GET /export/csv             → dump completo em CSV
"""
from __future__ import annotations

import argparse
import csv
import io
import json
import sys
from pathlib import Path
from typing import List, Optional

sys.path.insert(0, str(Path(__file__).parent))

from db import Database

try:
    from fastapi import FastAPI, HTTPException, Query
    from fastapi.responses import JSONResponse, PlainTextResponse, StreamingResponse
    import uvicorn
except ImportError:
    print("FastAPI não instalado. Execute: pip install fastapi uvicorn")
    sys.exit(1)

app = FastAPI(
    title="Leiloeiros Juntas Comerciais Brasil",
    description="API de dados de leiloeiros oficiais de todas as 27 Juntas Comerciais do Brasil",
    version="1.0.0",
)

db = Database()
db.init()


@app.get("/", summary="Informações da API")
def root():
    total = db.get_total()
    return {
        "name": "Leiloeiros Juntas Comerciais Brasil",
        "version": "1.0.0",
        "total_registros": total,
        "endpoints": {
            "lista": "/leiloeiros",
            "por_estado": "/leiloeiros/{estado}",
            "busca": "/busca?q=texto",
            "stats": "/stats",
            "export_json": "/export/json",
            "export_csv": "/export/csv",
        },
    }


@app.get("/leiloeiros", summary="Lista leiloeiros com filtros")
def list_leiloeiros(
    estado: Optional[str] = Query(None, description="UF ex: SP, RJ, MG"),
    situacao: Optional[str] = Query(None, description="ATIVO, CANCELADO, SUSPENSO"),
    nome: Optional[str] = Query(None, description="Busca parcial por nome"),
    limit: int = Query(100, ge=1, le=5000),
    offset: int = Query(0, ge=0),
):
    records = db.get_all(
        estado=estado,
        situacao=situacao,
        nome_like=nome,
        limit=limit,
        offset=offset,
    )
    return {"total": len(records), "offset": offset, "data": records}


@app.get("/leiloeiros/{estado}", summary="Leiloeiros de um estado específico")
def leiloeiros_por_estado(estado: str):
    estado = estado.upper()
    if len(estado) != 2:
        raise HTTPException(status_code=400, detail="Estado deve ser a UF com 2 letras (ex: SP)")
    records = db.get_by_estado(estado)
    return {"estado": estado, "total": len(records), "data": records}


@app.get("/busca", summary="Busca por nome, matrícula ou município")
def busca(
    q: str = Query(..., description="Texto para buscar"),
    limit: int = Query(50, ge=1, le=500),
):
    if len(q) < 2:
        raise HTTPException(status_code=400, detail="Query deve ter pelo menos 2 caracteres")
    records = db.search(q, limit=limit)
    return {"query": q, "total": len(records), "data": records}


@app.get("/stats", summary="Estatísticas por estado")
def stats():
    data = db.get_stats()
    total = sum(r["total"] for r in data)
    return {"total_geral": total, "por_estado": data}


@app.get("/export/json", summary="Exporta todos os dados em JSON")
def export_json():
    records = db.get_all()
    return JSONResponse(
        content={"total": len(records), "data": records},
        headers={"Content-Disposition": "attachment; filename=leiloeiros.json"},
    )


@app.get("/export/csv", summary="Exporta todos os dados em CSV")
def export_csv():
    records = db.get_all()
    if not records:
        return PlainTextResponse("Nenhum dado encontrado.")

    output = io.StringIO()
    writer = csv.DictWriter(
        output,
        fieldnames=list(records[0].keys()),
        extrasaction="ignore",
    )
    writer.writeheader()
    writer.writerows(records)
    output.seek(0)

    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=leiloeiros.csv"},
    )


def main():
    parser = argparse.ArgumentParser(description="Servidor API de leiloeiros")
    parser.add_argument("--host", default="127.0.0.1")
    parser.add_argument("--port", type=int, default=8000)
    parser.add_argument("--reload", action="store_true")
    args = parser.parse_args()

    print(f"\nAPI disponível em: http://{args.host}:{args.port}")
    print(f"Docs interativos: http://{args.host}:{args.port}/docs\n")

    uvicorn.run(
        "serve_api:app",
        host=args.host,
        port=args.port,
        reload=args.reload,
        app_dir=str(Path(__file__).parent),
    )


if __name__ == "__main__":
    main()
