"""
Scraper JUCEC — Junta Comercial do Estado do Ceará
URL: https://www.jucec.ce.gov.br/leiloeiros/
Método: httpx + BeautifulSoup
"""
from __future__ import annotations

from typing import List

from .base_scraper import AbstractJuntaScraper, Leiloeiro


class JucecScraper(AbstractJuntaScraper):
    estado = "CE"
    junta = "JUCEC"
    url = "https://www.jucec.ce.gov.br/leiloeiros/"

    async def parse_leiloeiros(self) -> List[Leiloeiro]:
        soup = await self.fetch_page()
        if not soup:
            return []

        results: List[Leiloeiro] = []

        tables = soup.find_all("table")
        for table in tables:
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
                nome = gcol(cells, ["nome"]) or self.clean(cells[0].get_text())
                if not nome or len(nome) < 3:
                    continue
                results.append(self.make_leiloeiro(
                    nome=nome,
                    matricula=gcol(cells, ["matr", "registro", "núm"]),
                    cpf_cnpj=gcol(cells, ["cpf", "cnpj"]),
                    situacao=gcol(cells, ["situ", "status"]),
                    municipio=gcol(cells, ["munic", "cidade", "fortaleza"]),
                    telefone=gcol(cells, ["tel", "fone"]),
                    email=gcol(cells, ["email"]),
                    endereco=gcol(cells, ["ender", "logr"]),
                ))

        if not results:
            for el in soup.select("ul li, ol li, .leiloeiro"):
                text = self.clean(el.get_text(" | "))
                if text and len(text) > 5:
                    results.append(self.make_leiloeiro(nome=text))

        return results
