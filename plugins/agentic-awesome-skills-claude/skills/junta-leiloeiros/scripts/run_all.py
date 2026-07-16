"""
Orquestrador de scraping — coleta dados de todas as 27 Juntas Comerciais do Brasil.

Uso:
    python scripts/run_all.py                      # todos os estados
    python scripts/run_all.py --estado SP RJ MG    # estados específicos
    python scripts/run_all.py --concurrency 5      # paralelismo (default: 5)
    python scripts/run_all.py --dry-run            # mostra o que seria coletado
"""
from __future__ import annotations

import argparse
import asyncio
import json
import logging
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import List, Optional

# Ajusta PYTHONPATH para imports relativos funcionarem
sys.path.insert(0, str(Path(__file__).parent))

from scraper.states import SCRAPERS, get_all_scrapers, get_scraper
from db import Database

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%H:%M:%S",
)
logger = logging.getLogger(__name__)

LOG_FILE = Path(__file__).parent.parent / "data" / "scraping_log.json"


async def scrape_state(estado: str, semaphore: asyncio.Semaphore) -> dict:
    """Scrapa um estado e retorna resultado com metadados."""
    async with semaphore:
        scraper = get_scraper(estado)
        if not scraper:
            return {
                "estado": estado,
                "status": "SCRAPER_NAO_ENCONTRADO",
                "count": 0,
                "records": [],
                "error": None,
                "scraped_at": datetime.now(timezone.utc).isoformat(),
            }

        try:
            records = await scraper.scrape()
            return {
                "estado": estado,
                "junta": scraper.junta,
                "url": scraper.url,
                "status": "OK" if records else "VAZIO",
                "count": len(records),
                "records": [r.to_dict() for r in records],
                "error": None,
                "scraped_at": datetime.now(timezone.utc).isoformat(),
            }
        except Exception as exc:
            logger.exception("[%s] Erro no scraping: %s", estado, exc)
            return {
                "estado": estado,
                "status": "ERRO",
                "count": 0,
                "records": [],
                "error": str(exc),
                "scraped_at": datetime.now(timezone.utc).isoformat(),
            }


async def run(estados: Optional[List[str]], concurrency: int, dry_run: bool) -> None:
    estados_alvo = [e.upper() for e in estados] if estados else list(SCRAPERS.keys())

    if dry_run:
        print(f"\n[DRY-RUN] Estados que seriam coletados ({len(estados_alvo)}):")
        for uf in estados_alvo:
            s = get_scraper(uf)
            if s:
                print(f"  {uf}: {s.junta} -> {s.url}")
            else:
                print(f"  {uf}: scraper nao encontrado")
        return

    logger.info("Iniciando coleta de %d estados (concurrency=%d)", len(estados_alvo), concurrency)

    semaphore = asyncio.Semaphore(concurrency)
    tasks = [scrape_state(uf, semaphore) for uf in estados_alvo]
    results = await asyncio.gather(*tasks)

    # Persistir no banco
    db = Database()
    db.init()

    total_coletados = 0
    total_salvos = 0
    log_entries = []

    for res in results:
        estado = res["estado"]
        status = res["status"]
        count = res["count"]
        total_coletados += count

        if res["records"]:
            saved = db.upsert_many(res["records"])
            total_salvos += saved
            logger.info("[%s] %d leiloeiros coletados, %d salvos", estado, count, saved)
        else:
            if status == "OK":
                status = "VAZIO"
            logger.warning("[%s] STATUS=%s error=%s", estado, status, res.get("error"))

        log_entries.append({
            "estado": estado,
            "junta": res.get("junta", "?"),
            "url": res.get("url", "?"),
            "status": status,
            "count": count,
            "error": res.get("error"),
            "scraped_at": res["scraped_at"],
        })

    # Salvar log
    LOG_FILE.parent.mkdir(parents=True, exist_ok=True)
    with open(LOG_FILE, "w", encoding="utf-8") as f:
        json.dump(
            {
                "run_at": datetime.now(timezone.utc).isoformat(),
                "total_estados": len(estados_alvo),
                "total_coletados": total_coletados,
                "total_salvos": total_salvos,
                "estados": log_entries,
            },
            f,
            ensure_ascii=False,
            indent=2,
        )

    # Resumo final
    print("\n" + "=" * 60)
    print(f"RESUMO DA COLETA")
    print("=" * 60)
    ok = [e for e in log_entries if e["status"] == "OK"]
    vazios = [e for e in log_entries if e["status"] == "VAZIO"]
    erros = [e for e in log_entries if e["status"] not in ("OK", "VAZIO")]

    print(f"  OK:     {len(ok)} estados | {total_coletados} leiloeiros coletados")
    print(f"  VAZIO:  {len(vazios)} estados | {[e['estado'] for e in vazios]}")
    print(f"  ERRO:   {len(erros)} estados | {[e['estado'] for e in erros]}")
    print(f"  TOTAL SALVO NO BANCO: {total_salvos}")
    print(f"  LOG: {LOG_FILE}")
    print("=" * 60)

    # Estatísticas do banco
    stats = db.get_stats()
    if stats:
        print("\nESTATÍSTICAS POR ESTADO:")
        print(f"{'UF':<5} {'Junta':<12} {'Total':>6} {'Ativos':>7}")
        print("-" * 35)
        for s in stats:
            print(f"{s['estado']:<5} {s['junta']:<12} {s['total']:>6} {s['ativos']:>7}")


def main():
    parser = argparse.ArgumentParser(
        description="Coleta dados de leiloeiros de todas as Juntas Comerciais do Brasil"
    )
    parser.add_argument(
        "--estado", nargs="*", metavar="UF",
        help="Estados específicos (ex: SP RJ MG). Padrão: todos os 27."
    )
    parser.add_argument(
        "--concurrency", type=int, default=5,
        help="Número de scrapers em paralelo (default: 5)"
    )
    parser.add_argument(
        "--dry-run", action="store_true",
        help="Mostra o que seria coletado sem executar"
    )
    args = parser.parse_args()

    asyncio.run(run(args.estado, args.concurrency, args.dry_run))


if __name__ == "__main__":
    main()
