"""
Scraper JUCER — Junta Comercial do Estado de Rondonia
URL: https://rondonia.ro.gov.br/jucer/lista-de-leiloeiros-oficiais/
Metodo: httpx + BeautifulSoup com parser DL/DT/DD
Estrutura descoberta em 2026-02-25:
  WordPress CMS com estrutura DL/DT/DD aninada e malformada:
  <dt><strong>NOME</strong></dt>
  <dd><em>Matricula: <i>007/1995</i></em></dd>
  <dd><em>Data da posse: <i>19/05/1995</i></em></dd>
  <dd><em>Cidade: <i>Porto Velho</i></em></dd>
  <dd><em>Endereco: <i>...</i></em></dd>
  <dd><em>Telefone: <i>...</i></em></dd>
  <dd><em>E-mail: <a href="mailto:...">...</a></em></dd>
  <dd><em>Situacao:<strong>REGULAR</strong></em></dd>
  <hr />
Total: ~47 leiloeiros separados por <hr>
Situacoes: Regular, Irregular, Afastado judicial
"""
from __future__ import annotations

import logging
import re
from typing import List

from .base_scraper import AbstractJuntaScraper, Leiloeiro

logger = logging.getLogger(__name__)

RE_MATRICULA_RO = re.compile(r"[Mm]atr[íi]cula:?\s*(.+)")
RE_POSSE_RO = re.compile(r"[Dd]ata\s+da\s+[Pp]osse:?\s*(.+)")
RE_CIDADE_RO = re.compile(r"[Cc]idade:?\s*(.+)")
RE_ENDERECO_RO = re.compile(r"[Ee]ndere[çc]o:?\s*(.+)")
RE_TELEFONE_RO = re.compile(r"[Tt]elefone:?\s*(.+)")
RE_EMAIL_RO = re.compile(r"[Ee]-?[Mm]ail:?\s*(.+)")
RE_SITUACAO_RO = re.compile(r"[Ss]itua[çc][aã]o:?\s*(.+)")


class JucerScraper(AbstractJuntaScraper):
    estado = "RO"
    junta = "JUCER"
    url = "https://rondonia.ro.gov.br/jucer/lista-de-leiloeiros-oficiais/"

    def _parse_dl_structure(self, soup) -> List[dict]:
        """
        Parseia estrutura DL/DT/DD do WordPress com anotacao malformada.
        Estrategia: encontrar todos <dt><strong>NOME</strong></dt>
        e coletar os <dd> subsequentes ate o proximo <dt> ou <hr>.
        """
        records = []

        # Encontrar area de conteudo
        content = soup.select_one(
            ".entry-content, .post-content, article .content, .conteudo, "
            "#conteudo, main article, .page-content"
        )
        if not content:
            content = soup.body or soup

        # Abordagem 1: dt/dd estruturado
        dts = content.find_all("dt")
        for dt in dts:
            strong = dt.find("strong")
            if not strong:
                continue
            nome = self.clean(strong.get_text())
            if not nome or len(nome) < 3:
                continue

            record = {"nome": nome, "municipio": "Porto Velho"}

            # Coletar dd's subsequentes
            sibling = dt.next_sibling
            for _ in range(15):
                if sibling is None:
                    break
                if hasattr(sibling, "name"):
                    if sibling.name == "dt":
                        break
                    if sibling.name == "hr":
                        break
                    if sibling.name == "dd":
                        text = self.clean(sibling.get_text())
                        if text:
                            self._extract_dd_field(text, record)
                sibling = sibling.next_sibling

            records.append(record)

        if records:
            return records

        # Abordagem 2: Segmentar por <hr> e parsear cada bloco
        # Obter HTML como string e dividir por <hr>
        full_text = content.get_text("\n")
        # Usa separadores de linha longa como delimitadores de entrada
        segments = re.split(r"\n\s*[-_]{5,}\s*\n|\n(?=\d+\.\s+[A-Z])", full_text)

        for seg in segments:
            lines = [l.strip() for l in seg.strip().split("\n") if l.strip()]
            if len(lines) < 2:
                continue

            # Primeira linha substancial e o nome
            nome = None
            remaining = []
            for i, line in enumerate(lines):
                if (len(line) > 3 and
                        re.search(r"[A-ZÁÉÍÓÚÀÃÕÇ]", line) and
                        not re.match(r"[Mm]atr|[Dd]ata|[Cc]idad|[Ee]ndere|[Tt]ele|[Ee]-?mail|[Ss]itua", line)):
                    nome = line
                    remaining = lines[i+1:]
                    break

            if not nome:
                continue

            record = {"nome": nome, "municipio": "Porto Velho"}
            for line in remaining:
                self._extract_dd_field(line, record)
            records.append(record)

        return records

    def _extract_dd_field(self, text: str, record: dict) -> None:
        """Extrai campos de uma linha de texto e popula o record."""
        m = RE_MATRICULA_RO.match(text)
        if m:
            record["matricula"] = self.clean(m.group(1))
            return
        m = RE_POSSE_RO.match(text)
        if m:
            record["data_registro"] = self.clean(m.group(1))
            return
        m = RE_CIDADE_RO.match(text)
        if m:
            record["municipio"] = self.clean(m.group(1))
            return
        m = RE_ENDERECO_RO.match(text)
        if m:
            record["endereco"] = self.clean(m.group(1))
            return
        m = RE_TELEFONE_RO.match(text)
        if m:
            record["telefone"] = self.clean(m.group(1))
            return
        m = RE_EMAIL_RO.match(text)
        if m:
            record["email"] = self.clean(m.group(1))
            return
        m = RE_SITUACAO_RO.match(text)
        if m:
            record["situacao"] = self.clean(m.group(1))
            return

    def _parse_hr_blocks(self, soup) -> List[dict]:
        """
        Estrategia alternativa: coleta conteudo entre tags <hr>.
        Cada bloco entre <hr> e uma entrada de leiloeiro.
        """
        records = []
        content = soup.select_one(".entry-content, .post-content, article .content, main, body")
        if not content:
            return []

        # Coletar todos os elementos ate os <hr>
        current_block = []
        blocks = []

        for el in content.descendants:
            if not hasattr(el, "name"):
                continue
            if el.name == "hr":
                if current_block:
                    blocks.append(current_block)
                    current_block = []
            elif el.name in ("dt", "dd", "strong", "i", "em", "a", "p"):
                text = self.clean(el.get_text())
                if text:
                    current_block.append((el.name, text))

        if current_block:
            blocks.append(current_block)

        for block in blocks:
            if not block:
                continue

            record = {"municipio": "Porto Velho"}
            nome_found = False

            for tag, text in block:
                if not nome_found and tag in ("dt", "strong"):
                    if len(text) > 3 and re.search(r"[A-ZÁÉÍÓÚÀÃÕÇ]", text):
                        # Verificar se nao e um campo de dado
                        if not re.match(r"[Mm]atr|[Dd]ata|[Cc]idad|[Ee]ndere|[Tt]ele|[Ee]-?mail|[Ss]itua", text):
                            record["nome"] = text
                            nome_found = True
                            continue
                self._extract_dd_field(text, record)

            if record.get("nome"):
                records.append(record)

        return records

    async def parse_leiloeiros(self) -> List[Leiloeiro]:
        soup = await self.fetch_page()
        if not soup:
            soup = await self.fetch_page_js(wait_ms=3000)
        if not soup:
            return []

        # Estrategia 1: Parser DL/DT/DD estruturado
        records = self._parse_dl_structure(soup)

        if not records:
            # Estrategia 2: Parser por blocos HR
            records = self._parse_hr_blocks(soup)

        if not records:
            # Estrategia 3: Tabela generica (fallback)
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
                    records.append({
                        "nome": nome,
                        "matricula": gcol(cells, ["matr", "registro"]),
                        "situacao": gcol(cells, ["situ", "status"]),
                        "municipio": gcol(cells, ["munic", "cidade"]) or "Porto Velho",
                        "telefone": gcol(cells, ["tel", "fone"]),
                        "email": gcol(cells, ["email"]),
                        "endereco": gcol(cells, ["ender", "logr"]),
                        "data_registro": gcol(cells, ["data", "posse"]),
                    })
                if records:
                    break

        logger.info("[RO] Total: %d registros encontrados", len(records))
        return [self.make_leiloeiro(**r) for r in records if r.get("nome")]
