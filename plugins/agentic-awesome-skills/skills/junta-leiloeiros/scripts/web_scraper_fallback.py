"""
Integração com a skill web-scraper para extração inteligente de fallback.

Quando um scraper nativo retorna 0 registros, este módulo aciona o web-scraper
para tentativa adicional de extração estruturada dos dados de leiloeiros.

Uso direto:
    python web_scraper_fallback.py --estado MA RN AP
    python web_scraper_fallback.py --todos-vazios   # usa log da última coleta

O web-scraper é mais robusto para sites com layouts não convencionais,
paginação, e estruturas não previstas pelo scraper nativo.
"""
from __future__ import annotations

import argparse
import asyncio
import json
import logging
import subprocess
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

from db import Database
from scraper.base_scraper import should_verify_tls
from scraper.states import SCRAPERS

logger = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")

DATA_DIR = Path(__file__).parent.parent / "data"
LOG_FILE = DATA_DIR / "scraping_log.json"
SKILL_WEB_SCRAPER = Path(r"C:\Users\renat\skills\web-scraper")

# Mapeamento de estado para informações de extração
EXTRACTION_SCHEMA = {
    "fields": ["nome", "matricula", "situacao", "municipio", "telefone", "email", "endereco", "data_registro"],
    "instructions": (
        "Extraia a lista completa de leiloeiros oficiais cadastrados nesta junta comercial. "
        "Para cada leiloeiro, capture: nome completo, número de matrícula/registro, "
        "situação (ativo/regular/irregular/cancelado/suspenso), município, telefone, "
        "e-mail, endereço e data de registro/posse. "
        "Se a página tiver paginação, colete todas as páginas."
    ),
}


def get_estados_vazios_do_log() -> list[str]:
    """Retorna lista de estados com status VAZIO na última coleta."""
    if not LOG_FILE.exists():
        logger.warning("Log não encontrado: %s", LOG_FILE)
        return []
    with open(LOG_FILE, encoding="utf-8") as f:
        data = json.load(f)
    return [
        e["estado"]
        for e in data.get("estados", [])
        if e.get("status") in ("VAZIO", "ERRO") and e.get("count", 0) == 0
    ]


async def run_web_scraper_for_state(estado: str, url: str) -> list[dict]:
    """
    Aciona o web-scraper via subprocess (skill web-scraper) para um estado específico.
    Retorna lista de dicionários com dados dos leiloeiros.
    """
    logger.info("[%s] Acionando web-scraper para: %s", estado, url)

    # Constrói o prompt para o web-scraper
    prompt = (
        f"Acesse a URL: {url}\n\n"
        f"{EXTRACTION_SCHEMA['instructions']}\n\n"
        f"Retorne APENAS um JSON com a estrutura:\n"
        f'{{"leiloeiros": [{{"nome": "...", "matricula": "...", "situacao": "...", '
        f'"municipio": "...", "telefone": "...", "email": "...", "endereco": "...", '
        f'"data_registro": "..."}}]}}\n\n'
        f"Se não encontrar dados, retorne: {{\"leiloeiros\": []}}"
    )

    # Tenta usar web-scraper como módulo Python se disponível
    web_scraper_script = SKILL_WEB_SCRAPER / "scripts" / "scrape.py"
    if web_scraper_script.exists():
        try:
            result = subprocess.run(
                [sys.executable, str(web_scraper_script), "--url", url, "--json"],
                capture_output=True, text=True, timeout=120,
                cwd=str(SKILL_WEB_SCRAPER / "scripts"),
            )
            if result.returncode == 0 and result.stdout:
                data = json.loads(result.stdout)
                if isinstance(data, list):
                    return data
                if isinstance(data, dict) and "leiloeiros" in data:
                    return data["leiloeiros"]
        except (subprocess.TimeoutExpired, json.JSONDecodeError, Exception) as exc:
            logger.warning("[%s] web-scraper script falhou: %s", estado, exc)

    # Fallback: usa httpx direto com estratégia multi-tentativa
    logger.info("[%s] Tentando extração direta com httpx+BS4 fallback", estado)
    return await _direct_extract(estado, url)


async def _direct_extract(estado: str, url: str) -> list[dict]:
    """Extração direta como fallback quando web-scraper não está disponível."""
    import httpx
    from bs4 import BeautifulSoup

    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Accept-Language": "pt-BR,pt;q=0.9",
    }

    results = []
    try:
        async with httpx.AsyncClient(
            headers=headers,
            timeout=30.0,
            follow_redirects=True,
            verify=should_verify_tls(),
        ) as client:
            resp = await client.get(url)
            if resp.status_code >= 400:
                return []
            soup = BeautifulSoup(resp.text, "lxml")

        # Extração genérica agressiva
        for table in soup.find_all("table"):
            rows = table.find_all("tr")
            if len(rows) < 2:
                continue
            headers_cells = [th.get_text(strip=True) for th in rows[0].find_all(["th", "td"])]
            for row in rows[1:]:
                cells = row.find_all(["td", "th"])
                if not cells:
                    continue
                nome = cells[0].get_text(strip=True) if cells else ""
                if len(nome) < 3:
                    continue
                entry = {"nome": nome, "estado": estado}
                for i, h in enumerate(headers_cells[1:], 1):
                    if i < len(cells):
                        entry[h.lower()[:20]] = cells[i].get_text(strip=True)
                results.append(entry)
            if results:
                break

    except Exception as exc:
        logger.error("[%s] _direct_extract erro: %s", estado, exc)

    return results


async def run_fallback(estados: list[str]) -> dict[str, int]:
    """
    Executa o fallback de web-scraper para os estados indicados.
    Salva resultados no banco e retorna contagem por estado.
    """
    db = Database()
    db.init()

    counts: dict[str, int] = {}

    for estado in estados:
        scraper_cls = SCRAPERS.get(estado.upper())
        if not scraper_cls:
            logger.warning("[%s] Estado não reconhecido, pulando", estado)
            continue

        scraper = scraper_cls()
        url = scraper.url

        raw_results = await run_web_scraper_for_state(estado, url)

        if not raw_results:
            logger.warning("[%s] web-scraper também não encontrou dados", estado)
            counts[estado] = 0
            continue

        # Converte para objetos Leiloeiro e salva
        from scraper.base_scraper import Leiloeiro
        leiloeiros = []
        for item in raw_results:
            if isinstance(item, dict) and item.get("nome"):
                l = Leiloeiro(
                    estado=estado,
                    junta=scraper.junta,
                    nome=str(item.get("nome", "")).strip(),
                    matricula=str(item.get("matricula", "") or "").strip() or None,
                    situacao=scraper.normalize_situacao(item.get("situacao")),
                    municipio=str(item.get("municipio", "") or "").strip() or None,
                    telefone=str(item.get("telefone", "") or "").strip() or None,
                    email=str(item.get("email", "") or "").strip() or None,
                    endereco=str(item.get("endereco", "") or "").strip() or None,
                    data_registro=str(item.get("data_registro", "") or "").strip() or None,
                    url_fonte=url,
                )
                leiloeiros.append(l)

        saved = db.save_many([l.to_dict() for l in leiloeiros])
        counts[estado] = saved
        logger.info("[%s] web-scraper fallback: %d leiloeiros salvos", estado, saved)

    return counts


def main():
    parser = argparse.ArgumentParser(description="Fallback web-scraper para estados sem dados")
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument("--estado", nargs="+", metavar="UF", help="Estados específicos (ex: MA RN AP)")
    group.add_argument("--todos-vazios", action="store_true", help="Reexecutar todos os estados com 0 registros no último log")
    args = parser.parse_args()

    if args.todos_vazios:
        estados = get_estados_vazios_do_log()
        if not estados:
            print("Nenhum estado vazio encontrado no log.")
            return
        print(f"Estados vazios no log: {', '.join(estados)}")
    else:
        estados = [e.upper() for e in args.estado]

    print(f"\nIniciando web-scraper fallback para: {', '.join(estados)}\n")
    counts = asyncio.run(run_fallback(estados))

    print("\n=== RESULTADO DO FALLBACK ===")
    total = 0
    for estado, count in counts.items():
        status = "OK" if count > 0 else "VAZIO"
        print(f"  {estado}: {count} leiloeiros [{status}]")
        total += count
    print(f"\nTotal adicional coletado: {total}")


if __name__ == "__main__":
    main()
