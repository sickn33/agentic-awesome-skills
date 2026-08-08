"""
Scraper JUCAP — Junta Comercial do Amapa
URL: https://jucap.portal.ap.gov.br/pagina/informacoes/leiloleiros
     (ATENCAO: typo oficial — "leiloleiros" com L extra, URL exata do site)
Metodo: httpx + BeautifulSoup
Estrutura: h4/h5 com nome + paragrafos com detalhes (Laravel/Livewire SSR)
Registros: ~12 leiloeiros
Nota: www.jucap.ap.gov.br falha por DNS — usar jucap.portal.ap.gov.br
"""
from __future__ import annotations

import re
from typing import List

from .base_scraper import AbstractJuntaScraper, Leiloeiro


class JucapScraper(AbstractJuntaScraper):
    estado = "AP"
    junta = "JUCAP"
    url = "https://jucap.portal.ap.gov.br/pagina/informacoes/leiloleiros"

    async def parse_leiloeiros(self) -> List[Leiloeiro]:
        soup = await self.fetch_page()
        if not soup:
            soup = await self.fetch_page(url="https://jucap.portal.ap.gov.br/pagina/informacoes/leiloeiros")
        if not soup:
            soup = await self.fetch_page_js(url=self.url, wait_ms=3000)
        if not soup:
            return []

        results: List[Leiloeiro] = []

        # Tenta tabela primeiro
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
                    matricula=gcol(cells, ["matr", "registro"]),
                    situacao=gcol(cells, ["situ", "status"]),
                    municipio=gcol(cells, ["munic", "cidade"]) or "Macapa",
                    telefone=gcol(cells, ["tel", "fone"]),
                    email=gcol(cells, ["email"]),
                    endereco=gcol(cells, ["ender", "logr"]),
                    data_registro=gcol(cells, ["data", "posse"]),
                ))
            if results:
                return results

        # Estrutura Laravel: h4/h5 como nome + p como detalhes
        content = soup.select_one("main, .content, article, #content, .page-content")
        if not content:
            content = soup.body

        if content:
            current: dict = {}
            for el in content.find_all(["h3", "h4", "h5", "p", "li", "strong"]):
                tag = el.name
                text = self.clean(el.get_text())
                if not text:
                    continue

                if tag in ("h3", "h4", "h5"):
                    if current.get("nome"):
                        results.append(self.make_leiloeiro(**current))
                    current = {"nome": text, "municipio": "Macapa"}
                elif current.get("nome"):
                    text_lower = text.lower()
                    if "matrícula" in text_lower or "matricula" in text_lower:
                        m = re.search(r"\d+", text)
                        if m:
                            current["matricula"] = m.group()
                    elif re.search(r"\d{4,5}[-\s]\d{4}", text):
                        current.setdefault("telefone", text)
                    elif "@" in text:
                        current["email"] = text
                    elif any(uf in text for uf in ["/AP", "Macapa", "Macapá", "Santana"]):
                        current["endereco"] = text
                    elif re.search(r"ativ|regular|cancel|suspen", text_lower):
                        current["situacao"] = text

            if current.get("nome"):
                results.append(self.make_leiloeiro(**current))

        # Fallback texto plano
        if not results:
            for line in soup.get_text("\n").split("\n"):
                line = self.clean(line)
                if line and len(line) > 5 and re.match(r"^[A-ZÁÉÍÓÚÀÃÕÇ][A-ZÁÉÍÓÚÀÃÕÇ\s]{4,}$", line):
                    results.append(self.make_leiloeiro(nome=line, municipio="Macapa"))

        return results
