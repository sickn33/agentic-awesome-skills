"""Bounded local fallback parser; no external skill or model execution.

Only source-identified records can be persisted. Network collection requires
operator authorization. A zero result is not proof of an empty official registry.
"""
import argparse
import asyncio
import json
from pathlib import Path
from db import Database
from private_state import state_dir
from scraper.generic_scraper import GenericJuntaScraper
from scraper.states import SCRAPERS


def get_estados_vazios_do_log():
    paths = sorted(state_dir().glob("leiloeiros_*.json"), key=lambda p:p.stat().st_mtime)
    if not paths: return []
    path = paths[-1]
    if path.is_symlink() or path.stat().st_size > 1024*1024:
        raise ValueError("invalid collection log")
    data = json.loads(path.read_text())
    return [item["estado"] for item in data.get("estados",[])
            if item.get("status") in {"VAZIO","ERRO","PARTIAL"} and item.get("count",0)==0]


async def run_fallback(estados):
    selected = list(dict.fromkeys(uf.upper() for uf in estados))
    if not selected or any(uf not in SCRAPERS for uf in selected):
        raise ValueError("recognized state identifiers required")
    db = Database()
    counts = {}
    for uf in selected:
        primary = SCRAPERS[uf]()
        fallback_class = type("LocalFallback", (GenericJuntaScraper,),
                              dict(estado=uf,junta=primary.junta,url=primary.url))
        scraper = fallback_class()
        records = await asyncio.wait_for(scraper.scrape(),timeout=120)
        if records:
            db.init()
            counts[uf] = db.upsert_many([record.to_dict() for record in records])
        else: counts[uf] = 0
    return counts


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument("--estado",nargs="+")
    group.add_argument("--todos-vazios",action="store_true")
    parser.add_argument("--allow-collect",action="store_true")
    args=parser.parse_args()
    if not args.allow_collect: parser.error("collection/persistence requires --allow-collect")
    states = get_estados_vazios_do_log() if args.todos_vazios else args.estado
    if not states:
        print("No failed/empty recorded states; no collection performed.")
        return
    print(json.dumps(asyncio.run(run_fallback(states))))


if __name__=="__main__": main()
