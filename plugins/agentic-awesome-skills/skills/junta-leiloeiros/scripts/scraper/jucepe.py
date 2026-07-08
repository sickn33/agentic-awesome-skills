"""
Scraper JUCEPE — Junta Comercial do Estado de Pernambuco
URL: https://portal.jucepe.pe.gov.br/leiloeiros (SPA em JS)
PDF: https://portal.jucepe.pe.gov.br/storage/content/leiloeiros.pdf
Método: Playwright (SPA) com fallback para PDF via httpx
Nota: Migrou de www.jucepe.pe.gov.br para portal.jucepe.pe.gov.br
"""
from __future__ import annotations

import re
from typing import List

from .base_scraper import AbstractJuntaScraper, Leiloeiro


class JucepeScraper(AbstractJuntaScraper):
    estado = "PE"
    junta = "JUCEPE"
    url = "https://portal.jucepe.pe.gov.br/leiloeiros"
    url_pdf = "https://portal.jucepe.pe.gov.br/storage/content/leiloeiros.pdf"

    async def parse_leiloeiros(self) -> List[Leiloeiro]:
        # Tenta SPA via Playwright primeiro
        soup = await self.fetch_page_js(
            wait_selector="table, tr td, .leiloeiro",
            wait_ms=6000,
        )
        if not soup:
            # Fallback: página legada (pode ter dados em HTML estático)
            soup = await self.fetch_page(url="https://portal.jucepe.pe.gov.br/leiloeiros")
        if not soup:
            return []

        results: List[Leiloeiro] = []

        for table in soup.find_all("table"):
            rows = table.find_all("tr")
            if len(rows) < 2:
                continue
            headers = [self.clean(th.get_text()) for th in rows[0].find_all(["th", "td"])]
            col = {(h or "").lower(): i for i, h in enumerate(headers)}

            def gcol(cells, frags):
                for k, i in col.items():
                    if any(f in k for f in frags) and i < len(cells):
                        return self.clean(cells[i].get_text())
                return None

            for row in rows[1:]:
                cells = row.find_all(["td", "th"])
                if not cells:
                    continue
                nome = gcol(cells, ["nome", "leiloeiro"]) or self.clean(cells[0].get_text())
                if not nome or len(nome) < 3:
                    continue
                results.append(self.make_leiloeiro(
                    nome=nome,
                    matricula=gcol(cells, ["matr", "registro", "nº"]),
                    cpf_cnpj=gcol(cells, ["cpf", "cnpj"]),
                    situacao=gcol(cells, ["situ", "status"]),
                    municipio=gcol(cells, ["munic", "cidade"]) or "Recife",
                    telefone=gcol(cells, ["tel", "fone"]),
                    email=gcol(cells, ["email"]),
                    endereco=gcol(cells, ["ender", "logr"]),
                    data_registro=gcol(cells, ["data", "posse"]),
                ))
            if results:
                break

        if not results:
            content = soup.select_one("main, #app, #root, .content, article")
            if content:
                for el in content.find_all(["li", "p", "div"]):
                    text = self.clean(el.get_text())
                    if text and len(text) > 10 and re.search(r"[A-ZÁÉÍÓÚ]{3,}", text):
                        results.append(self.make_leiloeiro(nome=text, municipio="Recife"))

        return results
