"""
API REST e dashboard para dados do Instagram.

Uso:
    python scripts/serve_api.py
    python scripts/serve_api.py --port 8080 --host 0.0.0.0

Endpoints:
    GET /                           → info da API
    GET /api/posts                  → posts com filtros
    GET /api/comments               → comentários
    GET /api/insights/summary       → resumo de insights
    GET /api/insights/best-times    → melhores horários
    GET /api/stats                  → estatísticas gerais
    GET /api/export/{format}        → exportação
    GET /api/templates              → templates
    GET /api/actions                → audit log
    GET /dashboard                  → dashboard HTML
    GET /webhook                    → stub para v2
"""
from __future__ import annotations

import argparse
import csv
import io
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

from config import STATIC_DIR
from db import Database

try:
    from fastapi import FastAPI, Query
    from fastapi.responses import FileResponse, HTMLResponse, JSONResponse, PlainTextResponse, StreamingResponse
    import uvicorn
except ImportError:
    print("FastAPI não instalado. Execute: pip install fastapi uvicorn")
    sys.exit(1)

app = FastAPI(
    title="Instagram Dashboard API",
    description="API REST para dados e analytics do Instagram",
    version="1.0.0",
)

db = Database()
db.init()


@app.get("/", summary="Info da API")
def root():
    stats = db.get_stats()
    return {
        "name": "Instagram Dashboard API",
        "version": "1.0.0",
        "stats": stats,
        "endpoints": {
            "posts": "/api/posts",
            "comments": "/api/comments",
            "insights_summary": "/api/insights/summary",
            "insights_best_times": "/api/insights/best-times",
            "stats": "/api/stats",
            "templates": "/api/templates",
            "actions": "/api/actions",
            "dashboard": "/dashboard",
        },
    }


@app.get("/api/posts", summary="Lista posts")
def list_posts(
    status: str = Query(None, description="Filtrar por status"),
    limit: int = Query(50, ge=1, le=500),
    offset: int = Query(0, ge=0),
):
    account = db.get_active_account()
    account_id = account["id"] if account else None
    posts = db.get_posts(account_id=account_id, status=status, limit=limit, offset=offset)
    return {"total": len(posts), "data": posts}


@app.get("/api/comments", summary="Lista comentários")
def list_comments(
    media_id: str = Query(None),
    unreplied: bool = Query(False),
    limit: int = Query(50, ge=1, le=500),
):
    account = db.get_active_account()
    account_id = account["id"] if account else None
    comments = db.get_comments(
        ig_media_id=media_id,
        account_id=account_id,
        unreplied_only=unreplied,
        limit=limit,
    )
    return {"total": len(comments), "data": comments}


@app.get("/api/insights/summary", summary="Resumo de insights")
def insights_summary():
    conn = db._connect()
    # Engajamento médio por tipo de conteúdo
    rows = conn.execute("""
        SELECT p.media_type,
               COUNT(DISTINCT p.id) as post_count,
               AVG(CASE WHEN i.metric_name='engagement' THEN i.metric_value END) as avg_engagement,
               AVG(CASE WHEN i.metric_name='reach' THEN i.metric_value END) as avg_reach,
               AVG(CASE WHEN i.metric_name='impressions' THEN i.metric_value END) as avg_impressions
        FROM posts p
        LEFT JOIN insights i ON i.ig_media_id = p.ig_media_id
        WHERE p.status = 'published'
        GROUP BY p.media_type
    """).fetchall()

    return {"by_media_type": [dict(r) for r in rows]}


@app.get("/api/insights/best-times", summary="Melhores horários para postar")
def best_times():
    conn = db._connect()
    rows = conn.execute("""
        SELECT
            strftime('%H', p.published_at) as hour,
            strftime('%w', p.published_at) as weekday,
            COUNT(DISTINCT p.id) as post_count,
            AVG(i.metric_value) as avg_engagement
        FROM posts p
        JOIN insights i ON i.ig_media_id = p.ig_media_id
        WHERE p.status = 'published' AND p.published_at IS NOT NULL
          AND i.metric_name IN ('engagement', 'reach')
        GROUP BY hour, weekday
        ORDER BY avg_engagement DESC
    """).fetchall()

    weekday_names = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"]
    data = []
    for r in rows:
        data.append({
            "hour": f"{r['hour']}:00" if r["hour"] else "?",
            "weekday": weekday_names[int(r["weekday"])] if r["weekday"] else "?",
            "posts": r["post_count"],
            "avg_engagement": round(r["avg_engagement"], 1) if r["avg_engagement"] else 0,
        })
    return {"data": data}


@app.get("/api/stats", summary="Estatísticas gerais")
def stats():
    return db.get_stats()


@app.get("/api/templates", summary="Templates de conteúdo")
def list_templates():
    templates = db.get_templates()
    return {"total": len(templates), "data": templates}


@app.get("/api/actions", summary="Audit log recente")
def recent_actions(limit: int = Query(50, ge=1, le=500)):
    actions = db.get_recent_actions(limit=limit)
    return {"total": len(actions), "data": actions}


@app.get("/api/export/json", summary="Exportar posts em JSON")
def export_json():
    account = db.get_active_account()
    posts = db.get_posts(account_id=account["id"] if account else None, limit=5000)
    return JSONResponse(
        content={"total": len(posts), "data": posts},
        headers={"Content-Disposition": "attachment; filename=instagram_posts.json"},
    )


@app.get("/api/export/csv", summary="Exportar posts em CSV")
def export_csv():
    account = db.get_active_account()
    posts = db.get_posts(account_id=account["id"] if account else None, limit=5000)
    if not posts:
        return PlainTextResponse("Sem dados.")
    output = io.StringIO()
    writer = csv.DictWriter(output, fieldnames=list(posts[0].keys()), extrasaction="ignore")
    writer.writeheader()
    writer.writerows(posts)
    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=instagram_posts.csv"},
    )


@app.get("/dashboard", summary="Dashboard visual")
def dashboard():
    dashboard_path = STATIC_DIR / "dashboard.html"
    if dashboard_path.exists():
        return FileResponse(dashboard_path, media_type="text/html")
    return HTMLResponse("<h1>Dashboard não encontrado</h1><p>Crie static/dashboard.html</p>")


@app.get("/webhook", summary="Webhook stub (v2)")
def webhook_stub():
    return {"status": "ok", "message": "Webhook endpoint ready (v2)"}


@app.post("/webhook", summary="Webhook receiver (v2)")
def webhook_receive():
    return {"status": "ok"}


def main():
    parser = argparse.ArgumentParser(description="API Instagram Dashboard")
    parser.add_argument("--host", default="127.0.0.1")
    parser.add_argument("--port", type=int, default=8000)
    parser.add_argument("--reload", action="store_true")
    args = parser.parse_args()

    print(f"\nAPI: http://{args.host}:{args.port}")
    print(f"Dashboard: http://{args.host}:{args.port}/dashboard")
    print(f"Docs: http://{args.host}:{args.port}/docs\n")

    uvicorn.run(
        "serve_api:app",
        host=args.host,
        port=args.port,
        reload=args.reload,
        app_dir=str(Path(__file__).parent),
    )


if __name__ == "__main__":
    main()
