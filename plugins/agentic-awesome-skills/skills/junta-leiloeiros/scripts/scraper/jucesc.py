"""
Scraper JUCESC — Junta Comercial do Estado de Santa Catarina
URL: https://leiloeiros.jucesc.sc.gov.br/site/
     https://leiloeiros.jucesc.sc.gov.br/site/porcidade.php (por cidade)
Método: httpx + BeautifulSoup (sistema dedicado com tabela HTML)
Nota: Sistema migrou para subdomínio dedicado leiloeiros.jucesc.sc.gov.br
"""
from __future__ import annotations

from typing import List

from .base_scraper import AbstractJuntaScraper, Leiloeiro


class JucescScraper(AbstractJuntaScraper):
    estado = "SC"
    junta = "JUCESC"
    url = "https://leiloeiros.jucesc.sc.gov.br/site/"

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
            if not headers:
                continue

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
                    matricula=gcol(cells, ["matr", "registro", "nº", "numero", "antiguidade"]),
                    cpf_cnpj=gcol(cells, ["cpf", "cnpj"]),
                    situacao=gcol(cells, ["situ", "status"]),
                    municipio=gcol(cells, ["munic", "cidade"]) or "Florianópolis",
                    telefone=gcol(cells, ["tel", "fone"]),
                    email=gcol(cells, ["email"]),
                    endereco=gcol(cells, ["ender", "logr", "rua"]),
                    data_registro=gcol(cells, ["data", "posse", "registro"]),
                ))
            if results:
                break

        # Se não achou tabela, tenta página por cidade para pegar todos
        if not results:
            soup2 = await self.fetch_page(url="https://leiloeiros.jucesc.sc.gov.br/site/porcidade.php")
            if soup2:
                for table in soup2.find_all("table"):
                    rows = table.find_all("tr")
                    if len(rows) < 2:
                        continue
                    for row in rows[1:]:
                        cells = row.find_all(["td", "th"])
                        if not cells:
                            continue
                        nome = self.clean(cells[0].get_text())
                        if not nome or len(nome) < 3:
                            continue
                        results.append(self.make_leiloeiro(
                            nome=nome,
                            matricula=self.clean(cells[1].get_text()) if len(cells) > 1 else None,
                            municipio=self.clean(cells[2].get_text()) if len(cells) > 2 else "Florianópolis",
                        ))
                    if results:
                        break

        return results
