"""
Scraper JUCEMG — Junta Comercial do Estado de Minas Gerais
URLs descobertas em 2026-02-25:
  - /pagina/139 = menu principal (links para sub-paginas)
  - /pagina/140 = lista alfabetica com contatos completos (USAR ESTA)
  - /pagina/141 = lista por antiguidade com tabela (apenas nome + matricula)
  - /pagina/142 = matriculas canceladas
Metodo: httpx + BeautifulSoup
Pagina /pagina/140 contem paragrafos com nome + matricula + endereco + telefone + email
Total: 218 leiloeiros ativos (alguns com status inline: Suspenso, Licenciado)
"""
from __future__ import annotations

import logging
import re
from typing import List

from .base_scraper import AbstractJuntaScraper, Leiloeiro

logger = logging.getLogger(__name__)

RE_MATRICULA_MG = re.compile(r"[Mm]atr[íi]cula:?\s*(\d+)\s+de\s+(\d{2}/\d{2}/\d{4})|[Mm]atr[íi]cula:?\s*n[º°]?\s*(\d+)", re.IGNORECASE)
RE_PREPOSTO = re.compile(r"[Pp]reposto:?\s*(.+)")
RE_TELEFONE = re.compile(r"[Tt]elefones?:?\s*(.+)")
RE_EMAIL = re.compile(r"(?:e-mail|email):?\s*(.+)", re.IGNORECASE)
RE_SITE = re.compile(r"(?:site|www\.)(.+)", re.IGNORECASE)
RE_STATUS_INLINE = re.compile(r"\((Suspen|Licencia|Cancel|Irregular)[^)]*\)", re.IGNORECASE)


class JucemgScraper(AbstractJuntaScraper):
    estado = "MG"
    junta = "JUCEMG"
    url = "https://jucemg.mg.gov.br/pagina/139/leiloeiros-oficiais"
    # URL da lista alfabetica com contatos completos
    _URL_ALFA = "https://jucemg.mg.gov.br/pagina/140/leiloeiros-ordem-alfabetica"
    # URL da lista por antiguidade com tabela (nome + matricula)
    _URL_ANT = "https://jucemg.mg.gov.br/pagina/141/leiloeiros-antiguidade"

    def _parse_alfabetica(self, soup) -> List[dict]:
        """
        Parseia a pagina /pagina/140 (ordem alfabetica).
        Cada leiloeiro e um bloco <p>:
          <p><strong>NOME COMPLETO</strong><br>
          Matricula: N de DD/MM/AAAA<br>
          Preposto: ...<br>
          Endereco, Bairro, Cidade - MG, CEP<br>
          Telefones: ...<br>
          email<br>
          site</p>
        """
        records = []
        content = soup.select_one(
            ".conteudo-pagina, .page-content, .conteudo, article .content, main .content, "
            ".entry-content, #conteudo, .corpo-pagina"
        )
        if not content:
            content = soup.body or soup

        for p in content.find_all("p"):
            strong = p.find("strong")
            if not strong:
                continue
            nome_raw = self.clean(strong.get_text())
            if not nome_raw or len(nome_raw) < 3:
                continue

            # Verificar status inline no nome (ex: "NOME (Suspenso)")
            status_match = RE_STATUS_INLINE.search(nome_raw)
            situacao = None
            if status_match:
                situacao = status_match.group(0).strip("()")
                nome_raw = RE_STATUS_INLINE.sub("", nome_raw).strip()

            # Coletar linhas do paragrafo (apos o <strong>)
            lines = []
            for el in p.children:
                if el == strong:
                    continue
                if hasattr(el, "get_text"):
                    line = self.clean(el.get_text())
                elif isinstance(el, str):
                    line = self.clean(str(el))
                else:
                    continue
                if line and line != nome_raw:
                    lines.append(line)

            record = {
                "nome": nome_raw,
                "municipio": "Belo Horizonte",
                "situacao": situacao,
            }

            for line in lines:
                m = RE_MATRICULA_MG.search(line)
                if m:
                    record["matricula"] = m.group(1) or m.group(3)
                    if m.group(2):
                        record["data_registro"] = m.group(2)
                    continue
                m = RE_TELEFONE.search(line)
                if m:
                    record["telefone"] = self.clean(m.group(1))
                    continue
                m = RE_EMAIL.search(line)
                if m:
                    record["email"] = self.clean(m.group(1))
                    continue
                # Linha de endereco: contem cidade/MG ou CEP
                if (re.search(r"/\s*MG\b|\bMG\s*,?\s*CEP|CEP\s*\d", line) or
                        (len(line) > 10 and not RE_PREPOSTO.match(line) and
                         not RE_SITE.match(line) and
                         not record.get("endereco"))):
                    m_cidade = re.search(r"([A-ZÁÉÍÓÚÀÃÕÇ][A-Za-záéíóúàãõç\s]+)\s*-?\s*MG", line)
                    if m_cidade:
                        record["municipio"] = m_cidade.group(1).strip()
                    if not record.get("endereco"):
                        record["endereco"] = line

            records.append(record)

        return records

    def _parse_antiguidade(self, soup) -> List[dict]:
        """
        Parseia tabela /pagina/141 (antiguidade).
        Tabela com 2 colunas: "Ordem de antiguidade e nome" + "No de matricula"
        Alguns nomes tem notas de status inline.
        """
        records = []
        for table in soup.find_all("table"):
            rows = table.find_all("tr")
            if len(rows) < 2:
                continue
            for row in rows[1:]:
                cells = row.find_all(["td", "th"])
                if len(cells) < 2:
                    continue
                nome_raw = self.clean(cells[0].get_text())
                matricula = self.clean(cells[1].get_text()) if len(cells) > 1 else None
                if not nome_raw or len(nome_raw) < 3:
                    continue

                # Extrair status inline
                status_match = RE_STATUS_INLINE.search(nome_raw)
                situacao = None
                if status_match:
                    situacao = status_match.group(0).strip("()")
                    nome_raw = RE_STATUS_INLINE.sub("", nome_raw).strip()

                records.append({
                    "nome": nome_raw,
                    "matricula": matricula,
                    "situacao": situacao,
                    "municipio": "Belo Horizonte",
                })
            if records:
                break
        return records

    async def parse_leiloeiros(self) -> List[Leiloeiro]:
        # Estrategia 1: Pagina alfabetica (tem contatos completos)
        soup = await self.fetch_page(url=self._URL_ALFA)
        if soup:
            records = self._parse_alfabetica(soup)
            if records:
                logger.info("[MG] Pagina alfabetica: %d registros", len(records))
                return [self.make_leiloeiro(**r) for r in records]

        # Estrategia 2: Tabela de antiguidade (pelo menos nome + matricula)
        soup = await self.fetch_page(url=self._URL_ANT)
        if soup:
            records = self._parse_antiguidade(soup)
            if records:
                logger.info("[MG] Tabela antiguidade: %d registros", len(records))
                return [self.make_leiloeiro(**r) for r in records]

        # Estrategia 3: Pagina principal de leiloeiros
        soup = await self.fetch_page(url=self.url)
        if not soup:
            soup = await self.fetch_page_js(url=self.url, wait_ms=3000)
        if not soup:
            return []

        results: List[Leiloeiro] = []

        # Tenta tabela
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
                nome = gcol(cells, ["nome"]) or self.clean(cells[0].get_text())
                if not nome or len(nome) < 3:
                    continue
                results.append(self.make_leiloeiro(
                    nome=nome,
                    matricula=gcol(cells, ["matr", "registro"]),
                    situacao=gcol(cells, ["situ", "status"]),
                    municipio="Belo Horizonte",
                    telefone=gcol(cells, ["tel", "fone"]),
                    email=gcol(cells, ["email"]),
                ))

        logger.info("[MG] Total: %d registros", len(results))
        return results
