"""
Scraper JUCEPA — Junta Comercial do Estado do Pará
URL: https://www.jucepa.pa.gov.br/node/171
Método: httpx + BeautifulSoup (Drupal CMS, node ID fixo)
Nota: URL /index.php/leiloeiros retornava 404. Node 171 = Leiloeiros Ativos.
      Lista inclui registros desde 1985 até 2026.
"""
from __future__ import annotations

import re
from typing import List

from .base_scraper import AbstractJuntaScraper, Leiloeiro


class JucepaScraper(AbstractJuntaScraper):
    estado = "PA"
    junta = "JUCEPA"
    url = "https://www.jucepa.pa.gov.br/node/171"

    async def parse_leiloeiros(self) -> List[Leiloeiro]:
        soup = await self.fetch_page()
        if not soup:
            soup = await self.fetch_page_js(wait_ms=3000)
        if not soup:
            return []

        results: List[Leiloeiro] = []

        # Tabela HTML (formato Drupal)
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
                    matricula=gcol(cells, ["matr", "registro", "nº", "numero"]),
                    cpf_cnpj=gcol(cells, ["cpf", "cnpj"]),
                    situacao=gcol(cells, ["situ", "status"]),
                    municipio=gcol(cells, ["munic", "cidade"]) or "Belém",
                    telefone=gcol(cells, ["tel", "fone"]),
                    email=gcol(cells, ["email"]),
                    endereco=gcol(cells, ["ender", "logr"]),
                    data_registro=gcol(cells, ["data", "posse", "registro"]),
                ))
            if results:
                break

        # Fallback: conteúdo em texto com padrão nome + matrícula
        if not results:
            body = soup.select_one(".field-body, .node-content, article, main")
            if body:
                for el in body.find_all(["p", "li", "div", "tr"]):
                    text = self.clean(el.get_text())
                    if text and len(text) > 5 and re.search(r"[A-ZÁÉÍÓÚÀÃÕÇ]{3,}", text):
                        results.append(self.make_leiloeiro(nome=text, municipio="Belém"))

        return results
