"""
Scraper JUCEB — Junta Comercial do Estado da Bahia
URL: https://www.ba.gov.br/juceb/home/matriculas-e-carteira-profissional/leiloeiros
Método: httpx + BeautifulSoup
Nota: Site migrou de juceb.ba.gov.br para ba.gov.br/juceb
      Lista inclui: nome, matrícula, portaria, nomeação, contatos, situação (Regular/Irregular)
"""
from __future__ import annotations

from typing import List

from .base_scraper import AbstractJuntaScraper, Leiloeiro


class JucebScraper(AbstractJuntaScraper):
    estado = "BA"
    junta = "JUCEB"
    url = "https://www.ba.gov.br/juceb/home/matriculas-e-carteira-profissional/leiloeiros"

    async def parse_leiloeiros(self) -> List[Leiloeiro]:
        soup = await self.fetch_page()
        if not soup:
            soup = await self.fetch_page_js(wait_ms=3000)
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
                    situacao=gcol(cells, ["situ", "status", "regular", "irregular"]),
                    municipio=gcol(cells, ["munic", "cidade"]) or "Salvador",
                    telefone=gcol(cells, ["tel", "fone", "contato"]),
                    email=gcol(cells, ["email"]),
                    endereco=gcol(cells, ["ender", "logr"]),
                    data_registro=gcol(cells, ["portaria", "nomea", "data", "posse"]),
                ))
            if results:
                break

        if not results:
            for li in soup.select("li, p, .item-leiloeiro, article"):
                text = self.clean(li.get_text(" | "))
                if text and len(text) > 10:
                    results.append(self.make_leiloeiro(nome=text, municipio="Salvador"))

        return results
