"""
Scraper JUCEMA — Junta Comercial do Estado do Maranhao
URL: https://portal.jucema.ma.gov.br/ (React SPA - dados via REST API)
Metodo: httpx GET para API REST do CMS
Mecanismo real descoberto em 2026-02-25:
  - Portal e React SPA (Create React App), sem conteudo server-side
  - API base: https://api.jucema.ma.gov.br/api/public/
  - Leiloeiros estao em: GET /api/public/posts/11
    (post_id 11 = "Leiloeiro" no menu /api/public/menus?with=menus.menus)
  - Conteudo e HTML dentro do campo data.content
  - Ultima atualizacao: 2025-10-20 18:29:59
Total: 53 leiloeiros (39 Regular + 12 Irregular + 2 Cancelada)
"""
from __future__ import annotations

import logging
import re
from typing import List

import httpx
from bs4 import BeautifulSoup

from .base_scraper import AbstractJuntaScraper, Leiloeiro, should_verify_tls

logger = logging.getLogger(__name__)

RE_MATRICULA = re.compile(r"[Mm]atr[íi]cula\s+N[º°o]?\s*(\d+(?:/\d+)?)\s*[–\-]\s*[Ee]m:\s*(\d{2}/\d{2}/\d{4})")
RE_SITUACAO = re.compile(r"SITUA[ÇC][ÃA]O:\s*(.+)", re.IGNORECASE)
RE_CONTATO = re.compile(r"[Cc]ontato:\s*(.+)")
RE_EMAIL = re.compile(r"[Ee]-?[Mm]ail:\s*(.+)")
RE_ENDERECO = re.compile(r"[Ee]ndere[çc]o:\s*(.+)")


class JucemaScraper(AbstractJuntaScraper):
    estado = "MA"
    junta = "JUCEMA"
    url = "https://portal.jucema.ma.gov.br/"
    _API_URL = "https://api.jucema.ma.gov.br/api/public/posts/11"

    async def _fetch_api(self) -> List[dict]:
        """
        Busca dados do post de leiloeiros via API REST do CMS.
        GET /api/public/posts/11 retorna JSON com campo 'content' em HTML.
        """
        try:
            async with httpx.AsyncClient(
                headers={**self.HEADERS, "Accept": "application/json"},
                verify=True,
                follow_redirects=True,
                timeout=30.0,
            ) as client:
                resp = await client.get(self._API_URL)
                if resp.status_code >= 400:
                    logger.warning("[MA] API post/11 retornou HTTP %d", resp.status_code)
                    return []

                data = resp.json()
                # O campo pode estar em data.content ou diretamente em content
                # API retorna { success: true, data: { content: "..." }, message: "..." }
                inner = data.get("data") or {}
                content_html = (
                    inner.get("content") or
                    data.get("content") or
                    ""
                )
                if not content_html:
                    logger.warning("[MA] Campo 'content' vazio na API")
                    return []

                logger.info("[MA] API retornou %d bytes de HTML", len(content_html))
                soup = BeautifulSoup(content_html, "lxml")
                return self._parse_cms_content(soup)

        except Exception as exc:
            logger.error("[MA] Erro na API: %s", exc)
            return []

    def _parse_cms_content(self, soup) -> List[dict]:
        """
        Parseia conteudo HTML do CMS da JUCEMA.
        Formato dos paragrafos:
          <p>NOME COMPLETO</p>
          <p>SITUACAO: REGULAR</p>
          <p>Matricula No 010/1993 - Em: 29/04/1993</p>
          <p>Endereco: ...</p>
          <p>Contato: ...</p>
          <p>E-mail: ...</p>
        """
        records = []
        paragraphs = [self.clean(p.get_text()) for p in soup.find_all("p") if self.clean(p.get_text())]

        # Tambem tentar com outros elementos se nao houver <p>
        if len(paragraphs) < 3:
            paragraphs = [
                self.clean(el.get_text())
                for el in soup.find_all(["p", "li", "div", "span"])
                if self.clean(el.get_text()) and len(self.clean(el.get_text())) > 3
            ]

        current: dict | None = None

        for text in paragraphs:
            if not text:
                continue

            m_matr = RE_MATRICULA.search(text)
            m_sit = RE_SITUACAO.search(text)
            m_cont = RE_CONTATO.search(text)
            m_email = RE_EMAIL.search(text)
            m_end = RE_ENDERECO.search(text)

            if m_matr:
                if current:
                    current["matricula"] = m_matr.group(1)
                    current["data_registro"] = m_matr.group(2)
                continue
            if m_sit:
                if current:
                    current["situacao"] = self.clean(m_sit.group(1))
                continue
            if m_cont:
                if current:
                    current.setdefault("telefone", self.clean(m_cont.group(1)))
                continue
            if m_email:
                if current:
                    current["email"] = self.clean(m_email.group(1))
                continue
            if m_end:
                if current:
                    current["endereco"] = self.clean(m_end.group(1))
                    m_cidade = re.search(r"([A-ZÁÉÍÓÚÀÃÕÇ][A-Za-záéíóúàãõç\s]+)/MA", text)
                    if m_cidade:
                        current["municipio"] = m_cidade.group(1).strip()
                continue

            # Detectar inicio de nova entrada: nome em maiusculas
            # Excluir titulos de secao como "RELACAO DOS LEILOEIROS", "CEP:", linhas curtas
            is_nome = (
                len(text) > 8 and
                not re.match(r"(SITUA|Matr|MATR|[Ee]ndere|[Cc]ontato|[Ee]-?mail|www\.|http|^\d|Site:|CEP:|RELA[ÇC])", text) and
                not re.search(r"^(RELA[ÇC][ÃA]O|LISTA|CADASTRO|JUNTA|COMERCIAL|LEILOEIROS\s*$)", text, re.IGNORECASE) and
                sum(1 for c in text if c.isupper()) > len(text) * 0.3 and
                " " in text and
                len(text.split()) >= 2 and
                len(text) < 120
            )

            if is_nome:
                if current and current.get("nome"):
                    records.append(current)
                current = {"nome": text, "municipio": "Sao Luis"}
            elif current and text and re.search(r"\(\d{2}\)", text):
                current.setdefault("telefone", text)

        if current and current.get("nome"):
            records.append(current)

        return records

    async def fetch_insecure(self, url: str):
        """Fetch com verificacao TLS configuravel para sites com SSL problematico."""
        try:
            async with httpx.AsyncClient(
                headers=self.HEADERS,
                timeout=30.0,
                follow_redirects=True,
                verify=should_verify_tls(),
            ) as client:
                resp = await client.get(url)
                if resp.status_code < 400:
                    return BeautifulSoup(resp.text, "lxml")
        except Exception:
            pass
        return None

    async def parse_leiloeiros(self) -> List[Leiloeiro]:
        # Estrategia 1: API REST (direto ao dado, sem renderizacao JS)
        records = await self._fetch_api()

        if not records:
            # Estrategia 2: Playwright para renderizar o SPA React
            logger.info("[MA] API falhou, tentando Playwright no SPA")
            for spa_url in [
                "https://portal.jucema.ma.gov.br/leiloeiro",
                "https://portal.jucema.ma.gov.br/leiloeiros",
            ]:
                soup = await self.fetch_page_js(url=spa_url, wait_ms=5000)
                if soup:
                    records = self._parse_cms_content(soup)
                    if records:
                        break

        if not records:
            # Estrategia 3: URLs alternativas com httpx
            logger.info("[MA] Tentando URLs alternativas")
            for url in [
                "http://www.jucema.ma.gov.br/leiloeiros",
                "https://www.jucema.ma.gov.br/leiloeiros",
                "http://portal.jucema.ma.gov.br/pagina/11",
            ]:
                soup = await self.fetch_insecure(url)
                if soup:
                    text = soup.get_text()
                    if any(kw in text.lower() for kw in ["leiloeiro", "matr", "nome"]):
                        records = self._parse_cms_content(soup)
                        if records:
                            break

        logger.info("[MA] Total de registros encontrados: %d", len(records))
        return [self.make_leiloeiro(**r) for r in records if r.get("nome")]
