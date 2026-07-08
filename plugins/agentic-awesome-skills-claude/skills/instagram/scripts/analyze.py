"""
Análise inteligente de dados do Instagram (SQL puro, sem dependências externas).

Uso:
    python scripts/analyze.py --best-times          # Melhores horários para postar
    python scripts/analyze.py --top-posts --limit 10 # Top posts por engajamento
    python scripts/analyze.py --growth --period 30   # Tendência de crescimento
    python scripts/analyze.py --summary              # Resumo geral
"""
from __future__ import annotations

import argparse
import json
import sqlite3
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

from config import DB_PATH
from db import Database

db = Database()
db.init()


def _connect() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def best_times() -> None:
    """Analisa melhores horários para postar baseado em engajamento."""
    conn = _connect()

    # Agregar engajamento por hora do dia e dia da semana
    sql = """
    SELECT
        strftime('%H', p.published_at) as hour,
        strftime('%w', p.published_at) as weekday,
        COUNT(DISTINCT p.id) as post_count,
        AVG(i.metric_value) as avg_engagement,
        MAX(i.metric_value) as max_engagement
    FROM posts p
    JOIN insights i ON i.ig_media_id = p.ig_media_id
    WHERE p.status = 'published'
      AND p.published_at IS NOT NULL
      AND i.metric_name IN ('engagement', 'reach', 'impressions')
    GROUP BY hour, weekday
    HAVING post_count >= 1
    ORDER BY avg_engagement DESC
    """
    rows = conn.execute(sql).fetchall()
    conn.close()

    if not rows:
        # Tentar com dados de user_insights se não houver dados granulares
        print(json.dumps({
            "message": "Dados insuficientes para análise. Publique mais posts e busque insights primeiro.",
            "tip": "Execute: python scripts/insights.py --fetch-all --limit 50",
        }, indent=2, ensure_ascii=False))
        return

    weekday_names = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"]
    results = []
    for r in rows:
        results.append({
            "hour": f"{r['hour']}:00",
            "weekday": weekday_names[int(r["weekday"])] if r["weekday"] else "?",
            "posts_analyzed": r["post_count"],
            "avg_engagement": round(r["avg_engagement"], 1),
            "max_engagement": round(r["max_engagement"], 1),
        })

    # Top 5 melhores combinações hora/dia
    print(json.dumps({
        "analysis": "best_times",
        "top_5": results[:5],
        "all_data": results,
    }, indent=2, ensure_ascii=False))


def top_posts(limit: int = 10) -> None:
    """Lista top posts por engajamento."""
    conn = _connect()
    sql = """
    SELECT
        p.id, p.ig_media_id, p.media_type, p.permalink, p.published_at,
        SUBSTR(p.caption, 1, 80) as caption_preview,
        SUM(CASE WHEN i.metric_name = 'engagement' THEN i.metric_value ELSE 0 END) as engagement,
        SUM(CASE WHEN i.metric_name = 'impressions' THEN i.metric_value ELSE 0 END) as impressions,
        SUM(CASE WHEN i.metric_name = 'reach' THEN i.metric_value ELSE 0 END) as reach,
        SUM(CASE WHEN i.metric_name = 'saved' THEN i.metric_value ELSE 0 END) as saves
    FROM posts p
    LEFT JOIN insights i ON i.ig_media_id = p.ig_media_id
    WHERE p.status = 'published'
    GROUP BY p.id
    ORDER BY engagement DESC
    LIMIT ?
    """
    rows = conn.execute(sql, [limit]).fetchall()
    conn.close()

    results = [dict(r) for r in rows]
    print(json.dumps({"analysis": "top_posts", "total": len(results), "posts": results}, indent=2, ensure_ascii=False))


def growth_trend(period_days: int = 30) -> None:
    """Analisa tendência de crescimento."""
    conn = _connect()
    sql = """
    SELECT
        DATE(end_time) as date,
        metric_name,
        metric_value
    FROM user_insights
    WHERE end_time >= date('now', ?)
      AND metric_name IN ('follower_count', 'reach', 'impressions', 'profile_views')
    ORDER BY end_time ASC
    """
    rows = conn.execute(sql, [f"-{period_days} days"]).fetchall()
    conn.close()

    if not rows:
        print(json.dumps({
            "message": "Sem dados de crescimento. Busque insights da conta primeiro.",
            "tip": "Execute: python scripts/insights.py --user --period day --since 30",
        }, indent=2, ensure_ascii=False))
        return

    # Agrupar por métrica
    metrics = {}
    for r in rows:
        name = r["metric_name"]
        if name not in metrics:
            metrics[name] = []
        metrics[name].append({"date": r["date"], "value": r["metric_value"]})

    # Calcular variação
    summary = {}
    for name, data in metrics.items():
        if len(data) >= 2:
            first = data[0]["value"]
            last = data[-1]["value"]
            change = last - first
            pct = (change / first * 100) if first > 0 else 0
            summary[name] = {
                "first_value": first,
                "last_value": last,
                "change": change,
                "change_pct": round(pct, 1),
                "data_points": len(data),
            }

    print(json.dumps({
        "analysis": "growth",
        "period_days": period_days,
        "summary": summary,
        "details": metrics,
    }, indent=2, ensure_ascii=False))


def overall_summary() -> None:
    """Resumo geral da conta."""
    stats = db.get_stats()
    conn = _connect()

    # Engajamento médio
    avg_engagement = conn.execute("""
        SELECT AVG(metric_value) as avg_val
        FROM insights WHERE metric_name = 'engagement'
    """).fetchone()

    # Posts esta semana
    posts_this_week = conn.execute("""
        SELECT COUNT(*) FROM posts
        WHERE status = 'published' AND published_at >= date('now', '-7 days')
    """).fetchone()[0]

    # Último post
    last_post = conn.execute("""
        SELECT published_at, SUBSTR(caption, 1, 60) as caption
        FROM posts WHERE status = 'published'
        ORDER BY published_at DESC LIMIT 1
    """).fetchone()

    conn.close()

    result = {
        "database_stats": stats,
        "avg_engagement": round(avg_engagement["avg_val"], 1) if avg_engagement and avg_engagement["avg_val"] else 0,
        "posts_this_week": posts_this_week,
        "last_post": dict(last_post) if last_post else None,
    }
    print(json.dumps(result, indent=2, ensure_ascii=False))


def main():
    parser = argparse.ArgumentParser(description="Análise de dados Instagram")
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument("--best-times", action="store_true", help="Melhores horários para postar")
    group.add_argument("--top-posts", action="store_true", help="Top posts por engajamento")
    group.add_argument("--growth", action="store_true", help="Tendência de crescimento")
    group.add_argument("--summary", action="store_true", help="Resumo geral")
    parser.add_argument("--limit", type=int, default=10, help="Limite (para --top-posts)")
    parser.add_argument("--period", type=int, default=30, help="Dias (para --growth)")
    args = parser.parse_args()

    if args.best_times:
        best_times()
    elif args.top_posts:
        top_posts(args.limit)
    elif args.growth:
        growth_trend(args.period)
    elif args.summary:
        overall_summary()


if __name__ == "__main__":
    main()
