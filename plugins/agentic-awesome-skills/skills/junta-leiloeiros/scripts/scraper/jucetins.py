"""
Scraper JUCETINS — Junta Comercial do Estado do Tocantins
URL: https://www.to.gov.br/jucetins/leiloeiros/152aezl6blm0
Metodo: httpx + BeautifulSoup com parser regex para texto numerado plano
Estrutura: Texto numerado plano sem tabela, padrao:
  N. Nome Completo
  Matricula no X, de DD/MM/AAAA
  Endereco: ... CEP: XXXXX-XXX, Cidade/TO
  Telefone: (XX) XXXXX-XXXX
  E-mail: email@exemplo.com
Registros: ~55, todos em pagina unica. Ultima atualizacao: 24/02/2026.
"""
from __future__ import annotations

import re
from typing import List, Optional

from .base_scraper import AbstractJuntaScraper, Leiloeiro

RE_ENTRY_START = re.compile(r"^\d+\.\s+(.+)$")
RE_MATRICULA = re.compile(r"[Mm]atr[íi]cula\s+n[oº]?\s*[\.\s]*(\d+).*?de\s+(\d{2}/\d{2}/\d{4})", re.IGNORECASE)
RE_ENDERECO = re.compile(r"[Ee]ndere[çc]o:\s+(.+)", re.IGNORECASE)
RE_TELEFONE = re.compile(r"[Tt]elefone:\s+(.+)", re.IGNORECASE)
RE_EMAIL = re.compile(r"[Ee]-?mail:\s+(.+)", re.IGNORECASE)
RE_CANCELADO = re.compile(r"CANCELAMENTO\s+DE\s+MATR[ÍI]CULA", re.IGNORECASE)


class JucetinsScraper(AbstractJuntaScraper):
    estado = "TO"
    junta = "JUCETINS"
    url = "https://www.to.gov.br/jucetins/leiloeiros/152aezl6blm0"

    def _parse_text_block(self, text: str) -> List[dict]:
        records = []
        current: Optional[dict] = None
        for raw_line in text.split("\n"):
            line = (raw_line or "").strip()
            if not line:
                continue
            m_start = RE_ENTRY_START.match(line)
            if m_start:
                if current and current.get("nome"):
                    records.append(current)
                nome_raw = m_start.group(1).strip()
                is_cancelado = bool(RE_CANCELADO.search(nome_raw))
                nome = RE_CANCELADO.sub("", nome_raw).strip(" -")
                current = {"nome": nome, "municipio": "Palmas", "situacao": "CANCELADO" if is_cancelado else None}
                continue
            if current is None:
                continue
            m = RE_MATRICULA.search(line)
            if m:
                current["matricula"] = m.group(1)
                current.setdefault("data_registro", m.group(2))
                continue
            m = RE_ENDERECO.search(line)
            if m:
                current["endereco"] = m.group(1).strip()
                m_city = re.search(r"([A-Za-záéíóúàãõçÁÉÍÓÚÀÃÕÇ\s]+)/TO", m.group(1))
                if m_city:
                    current["municipio"] = m_city.group(1).strip()
                continue
            m = RE_TELEFONE.search(line)
            if m:
                current["telefone"] = m.group(1).strip()
                continue
            m = RE_EMAIL.search(line)
            if m:
                current["email"] = m.group(1).strip()
                continue
        if current and current.get("nome"):
            records.append(current)
        return records

    async def parse_leiloeiros(self) -> List[Leiloeiro]:
        soup = await self.fetch_page()
        if not soup:
            soup = await self.fetch_page_js(url=self.url, wait_ms=4000)
        if not soup:
            return []

        results: List[Leiloeiro] = []

        # Encontra container principal do CMS
        content = soup.select_one(
            ".field--name-body, article .content, .node__content, main article, .conteudo, #content .field"
        )
        if not content:
            candidates = sorted(soup.find_all(["div", "article", "section"]),
                                 key=lambda el: len(el.get_text()), reverse=True)
            content = candidates[0] if candidates else soup.body

        if content:
            records = self._parse_text_block(content.get_text("\n"))
            if records:
                for r in records:
                    results.append(self.make_leiloeiro(**r))
                return results

        # Fallback tabela
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
                    municipio=gcol(cells, ["munic", "cidade"]) or "Palmas",
                    telefone=gcol(cells, ["tel", "fone"]),
                    email=gcol(cells, ["email"]),
                    endereco=gcol(cells, ["ender", "logr"]),
                    data_registro=gcol(cells, ["data", "posse"]),
                ))
            if results:
                break

        return results
