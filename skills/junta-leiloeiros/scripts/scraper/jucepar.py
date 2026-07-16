"""
Scraper JUCEPAR — Junta Comercial do Paraná
URL: https://www.juntacomercial.pr.gov.br/Pagina/LEILOEIROS-OFICIAIS
Método: httpx + BeautifulSoup (tabela HTML ou PDF link)
Nota: Site migrou de jucepar.pr.gov.br para juntacomercial.pr.gov.br
"""
from __future__ import annotations

import re
from typing import List

from .base_scraper import AbstractJuntaScraper, Leiloeiro


class JuceparScraper(AbstractJuntaScraper):
    estado = "PR"
    junta = "JUCEPAR"
    url = "https://www.juntacomercial.pr.gov.br/Pagina/LEILOEIROS-OFICIAIS"

    async def parse_leiloeiros(self) -> List[Leiloeiro]:
        soup = await self.fetch_page()
        if not soup:
            # Tenta Playwright se httpx falhar
            soup = await self.fetch_page_js(wait_ms=3000)
        if not soup:
            return []

        results: List[Leiloeiro] = []

        # Tentativa 1: tabela HTML
        for table in soup.find_all("table"):
            rows = table.find_all("tr")
            if len(rows) < 2:
                continue
            headers = [self.clean(th.get_text()) for th in rows[0].find_all(["th", "td"])]
            col = {(h or "").lower(): i for i, h in enumerate(headers)}

            has_relevant = any(
                any(f in (h or "").lower() for f in ["nome", "leiloeiro", "matr"])
                for h in headers
            )
            if not has_relevant:
                continue

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
                    municipio=gcol(cells, ["munic", "cidade"]) or "Curitiba",
                    telefone=gcol(cells, ["tel", "fone"]),
                    email=gcol(cells, ["email"]),
                    endereco=gcol(cells, ["ender", "logr"]),
                    data_registro=gcol(cells, ["data", "posse", "portaria"]),
                ))
            if results:
                break

        # Tentativa 2: conteúdo textual com nomes em maiúsculas
        if not results:
            content = soup.select_one("main, article, .conteudo, .page-content, #content")
            if content:
                for p in content.find_all(["p", "li", "div"]):
                    text = self.clean(p.get_text())
                    if text and len(text) > 5 and re.search(r"[A-ZÁÉÍÓÚÀÃÕÇ]{3,}", text):
                        results.append(self.make_leiloeiro(nome=text, municipio="Curitiba"))

        return results
