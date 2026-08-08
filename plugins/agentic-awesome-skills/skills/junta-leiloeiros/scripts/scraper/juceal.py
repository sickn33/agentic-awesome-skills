"""
Scraper JUCEAL — Junta Comercial do Estado de Alagoas
URL: http://www.juceal.al.gov.br/servicos/leiloeiros
Método: httpx + BeautifulSoup
Nota: URL /leiloeiros retornava 404 — URL correta é /servicos/leiloeiros.
      Lista 28 leiloeiros com matrícula, data de posse, situação, contatos e redes sociais.
      Registros atualizados até 2025.
"""
from __future__ import annotations

from typing import List

from .base_scraper import AbstractJuntaScraper, Leiloeiro


class JucealScraper(AbstractJuntaScraper):
    estado = "AL"
    junta = "JUCEAL"
    url = "http://www.juceal.al.gov.br/servicos/leiloeiros"

    async def parse_leiloeiros(self) -> List[Leiloeiro]:
        soup = await self.fetch_page()
        if not soup:
            # Tenta HTTPS também
            soup = await self.fetch_page(url="https://www.juceal.al.gov.br/servicos/leiloeiros")
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
                    situacao=gcol(cells, ["situ", "status"]),
                    municipio=gcol(cells, ["munic", "cidade"]) or "Maceió",
                    telefone=gcol(cells, ["tel", "fone"]),
                    email=gcol(cells, ["email"]),
                    endereco=gcol(cells, ["ender", "logr"]),
                    data_registro=gcol(cells, ["data", "posse"]),
                ))
            if results:
                break

        if not results:
            for el in soup.select("li, p, .leiloeiro, article"):
                text = self.clean(el.get_text(" | "))
                if text and len(text) > 10:
                    results.append(self.make_leiloeiro(nome=text, municipio="Maceió"))

        return results
