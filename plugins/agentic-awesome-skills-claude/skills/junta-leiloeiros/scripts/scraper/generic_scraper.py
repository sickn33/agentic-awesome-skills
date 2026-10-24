"""
Scraper genérico para juntas que usam formato padrão de tabela HTML.
Estados sem scraper customizado herdam deste.
"""
from __future__ import annotations

from typing import List, Optional

from .base_scraper import AbstractJuntaScraper, Leiloeiro


class GenericJuntaScraper(AbstractJuntaScraper):
    """
    Scraper genérico para juntas com tabela HTML padrão.
    Subclasses definem apenas estado, junta e url.
    """

    estado: str
    junta: str
    url: str
    municipio_default: Optional[str] = None  # para estados com capital única dominante

    async def parse_leiloeiros(self) -> List[Leiloeiro]:
        soup = await self.fetch_page()
        if not soup:
            return []

        results: List[Leiloeiro] = []

        # Tentativa 1: tabela HTML
        tables = soup.find_all("table")
        for table in tables:
            rows = table.find_all("tr")
            if len(rows) < 2:
                continue

            headers = [self.clean(th.get_text()) for th in rows[0].find_all(["th", "td"])]
            if not headers:
                continue

            col = {(h or "").lower(): i for i, h in enumerate(headers)}

            # Verificar se parece uma tabela de leiloeiros
            has_name_col = any(
                "nome" in k or "leiloeiro" in k or "auxiliar" in k
                for k in col.keys()
            )
            if not has_name_col:
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
                    matricula=gcol(cells, ["matr", "registro", "núm", "numero", "nº"]),
                    cpf_cnpj=gcol(cells, ["cpf", "cnpj", "documento"]),
                    situacao=gcol(cells, ["situ", "status"]),
                    municipio=gcol(cells, ["munic", "cidade"]) or self.municipio_default,
                    telefone=gcol(cells, ["tel", "fone", "contato"]),
                    email=gcol(cells, ["email", "e-mail"]),
                    endereco=gcol(cells, ["ender", "logr", "rua"]),
                    data_registro=gcol(cells, ["data", "cadastr"]),
                ))

            if results:
                break  # Parar na primeira tabela com resultados

        # Unstructured headings, menus and prose are not verified registry rows.
        # Retain a truthful empty/candidate result for manual inspection instead.
        return results
