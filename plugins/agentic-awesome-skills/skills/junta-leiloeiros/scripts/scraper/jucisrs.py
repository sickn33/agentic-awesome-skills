"""
Scraper JUCISRS — Junta Comercial, Industrial e Servicos do Rio Grande do Sul
URL: https://sistemas.jucisrs.rs.gov.br/leiloeiros/
Metodo: httpx POST com TLS verificavel por padrao
Mecanismo real descoberto em 2026-02-25:
  - GET  https://sistemas.jucisrs.rs.gov.br/leiloeiros/
         -> retorna formulario de busca PHP/Bootstrap
  - POST https://sistemas.jucisrs.rs.gov.br/leiloeiros/busca/listar
         com Nome=Todos (retorna todos os 376 registros)
Estrutura HTML: <b><font color="#A01A14">MATRICULA</font> - NOME<br>
  separados por <hr> entre entradas
Total: 376 leiloeiros (261 ativos + 111 cancelados)
Nota: Antigo dominio jucers.rs.gov.br foi aposentado. Junta renomeada para JUCISRS.
"""
from __future__ import annotations

import logging
import re
from typing import List

from .base_scraper import AbstractJuntaScraper, Leiloeiro, should_verify_tls

logger = logging.getLogger(__name__)

# Regex para extrair dados do formato plano JUCISRS
RE_MATRICULA_NOME = re.compile(r"(\d+)\s*-\s*(.+)")
RE_POSSE = re.compile(r"[Pp]osse\s*:\s*(\d{2}/\d{2}/\d{4})")
RE_TELEFONE = re.compile(r"[Tt]elefone\s*:\s*(.+)")
RE_EMAIL = re.compile(r"[Ee]-[Mm]ail\s*:\s*(.+)")
RE_PREPOSTO = re.compile(r"[Pp]reposto\s*:\s*(.+)")
RE_CEP = re.compile(r"CEP\s+([\d.]+)")
RE_CANCELADO = re.compile(r"CANCELAD|CANCELAMENTO|canc\.", re.IGNORECASE)
RE_CIDADE_UF = re.compile(r"^([A-ZÁÉÍÓÚÀÃÕÇ][A-ZÁÉÍÓÚÀÃÕÇ\s]+)\s+-\s+RS$")


class JucisrsScraper(AbstractJuntaScraper):
    estado = "RS"
    junta = "JUCISRS"
    url = "https://sistemas.jucisrs.rs.gov.br/leiloeiros/"
    url_fallback = "https://jucisrs.rs.gov.br/leiloeiro"

    _POST_URL = "https://sistemas.jucisrs.rs.gov.br/leiloeiros/busca/listar"

    def _parse_plain_html(self, html: str) -> List[dict]:
        """
        Parseia o formato plano HTML da JUCISRS.
        Toda a lista esta dentro de um unico grande <b> com <hr> como separadores.
        Estrutura por entrada (separada por <hr/>):
          <font color="#A01A14">173</font> - NOME<br/>
          [www.site.com.br<br/>]
          <b>Posse : </b>DD/MM/AAAA<br/>
          ENDERECO<br/>
          CIDADE - RS<br/>
          CEP XXXXX-XXX<br/>
          Telefone : XXXXX<br/>
          e-Mail : xxx@yyy<br/>
          Preposto : NOME<hr/>
        """
        from bs4 import BeautifulSoup

        records = []

        # Dividir o HTML bruto pelo separador <hr> ou <hr/>
        # Isso e mais confiavel que navegar o DOM pois o <b> gigante contem tudo
        blocks = re.split(r"<hr\s*/?>", html, flags=re.IGNORECASE)
        logger.debug("[RS] Total de blocos (separados por <hr>): %d", len(blocks))

        for block in blocks:
            if not block.strip():
                continue

            # Parsear o bloco como HTML para extrair texto estruturado
            block_soup = BeautifulSoup(block, "lxml")
            lines_raw = block_soup.get_text("\n").splitlines()
            lines = [l.strip() for l in lines_raw if l.strip()]

            if not lines:
                continue

            # Primeira linha com matricula e nome: "NNN - NOME SOBRENOME"
            # NOTA: O <font> de cor separa matricula e nome em linhas distintas:
            #   lines[0] = "365"  (matricula dentro do <font>)
            #   lines[1] = "- ADAIR ABRAAO..."  (nome apos o <font>)
            # Precisamos reconhecer e juntar esses dois fragmentos.
            nome = None
            matricula = None
            situacao = None
            remaining = []

            for i, line in enumerate(lines):
                # Padrao 1: matricula e nome na mesma linha "365 - NOME"
                m = RE_MATRICULA_NOME.match(line)
                if m:
                    matricula = m.group(1)
                    nome_raw = m.group(2).strip()
                    if RE_CANCELADO.search(nome_raw):
                        situacao = "CANCELADO"
                        nome_raw = RE_CANCELADO.sub("", nome_raw).strip(" ")
                    nome = self.clean(nome_raw)
                    remaining = lines[i+1:]
                    break
                # Padrao 2: so matricula (numero puro), proximo e "- NOME"
                if line.isdigit() and i + 1 < len(lines):
                    next_line = lines[i+1]
                    if next_line.startswith("- ") or next_line.startswith("– "):
                        matricula = line
                        nome_raw = next_line[2:].strip()
                        if RE_CANCELADO.search(nome_raw):
                            situacao = "CANCELADO"
                            nome_raw = RE_CANCELADO.sub("", nome_raw).strip(" ")
                        nome = self.clean(nome_raw)
                        remaining = lines[i+2:]
                        break

            if not nome or len(nome) < 3:
                continue

            record = {
                "nome": nome,
                "matricula": matricula,
                "situacao": situacao,
                "municipio": "Porto Alegre",
                "data_registro": None,
                "telefone": None,
                "email": None,
                "endereco": None,
            }

            for line in remaining:
                if not line:
                    continue
                # Cancelado inline (linha separada como "(Cancelado)")
                if RE_CANCELADO.search(line) and not record["situacao"]:
                    record["situacao"] = "CANCELADO"
                    continue
                m = RE_POSSE.search(line)
                if m:
                    record["data_registro"] = m.group(1)
                    continue
                m = RE_TELEFONE.search(line)
                if m:
                    record["telefone"] = self.clean(m.group(1))
                    continue
                m = RE_EMAIL.search(line)
                if m:
                    record["email"] = self.clean(m.group(1))
                    continue
                m = RE_PREPOSTO.match(line)
                if m:
                    continue  # ignorar preposto
                # Cidade/UF: "CANELA - RS" ou "PORTO ALEGRE - RS"
                m = RE_CIDADE_UF.search(line)
                if m:
                    record["municipio"] = m.group(1).strip()
                    continue
                if RE_CEP.search(line):
                    continue  # linha de CEP
                # Linha de url (site)
                if line.startswith("www.") or line.startswith("http"):
                    continue
                # Linha de endereco
                if (not record["endereco"] and len(line) > 5 and
                        re.search(r"[A-ZÁÉÍÓÚÀÃÕÇ]", line)):
                    record["endereco"] = line

            records.append(record)

        return records

    async def _fetch_post(self) -> List[dict]:
        """
        POST para /leiloeiros/busca/listar com Nome=Todos.
        Retorna todos os 376 registros em resposta unica.
        """
        import httpx

        try:
            async with httpx.AsyncClient(
                headers=self.HEADERS,
                verify=should_verify_tls(),
                follow_redirects=True,
                timeout=60.0,
            ) as client:
                # GET primeiro para obter cookies/CSRF se necessario
                try:
                    await client.get(self.url)
                except Exception:
                    pass

                resp = await client.post(
                    self._POST_URL,
                    data={
                        "Nome": "",
                        "CodMunicipio": "0",  # 0 = Todas as cidades
                        "Situacao": "TODOS",
                        "Funcao": "LEILOEIRO",
                    },
                    headers={
                        "Content-Type": "application/x-www-form-urlencoded",
                        "Referer": self.url,
                        "Origin": "https://sistemas.jucisrs.rs.gov.br",
                    },
                )
                if resp.status_code >= 400:
                    logger.warning("[RS] POST retornou HTTP %d", resp.status_code)
                    return []

                logger.info("[RS] POST OK - tamanho resposta: %d bytes", len(resp.content))
                return self._parse_plain_html(resp.text)

        except Exception as exc:
            logger.error("[RS] Erro no POST: %s", exc)
            return []

    async def _fetch_get_all(self) -> List[dict]:
        """
        Fallback: GET simples na URL principal com verificacao TLS configuravel.
        Pode retornar formulario ou lista parcial.
        """
        import httpx
        from bs4 import BeautifulSoup

        try:
            async with httpx.AsyncClient(
                headers=self.HEADERS,
                verify=should_verify_tls(),
                follow_redirects=True,
                timeout=30.0,
            ) as client:
                resp = await client.get(self.url)
                if resp.status_code >= 400:
                    return []
                soup = BeautifulSoup(resp.text, "lxml")
                return self._parse_plain_html(resp.text)
        except Exception as exc:
            logger.error("[RS] Erro no GET: %s", exc)
            return []

    async def _playwright_ssl_bypass(self, url: str):
        """Playwright com verificacao TLS alinhada ao helper compartilhado."""
        try:
            from playwright.async_api import async_playwright
            from bs4 import BeautifulSoup
            async with async_playwright() as pw:
                browser = await pw.chromium.launch(
                    headless=True,
                    args=[
                        "--ignore-certificate-errors",
                        "--ignore-ssl-errors",
                        "--disable-web-security",
                        "--allow-insecure-localhost",
                    ],
                )
                ctx = await browser.new_context(
                    user_agent=self.HEADERS["User-Agent"],
                    ignore_https_errors=not should_verify_tls(),
                )
                page = await ctx.new_page()
                try:
                    await page.goto(url, timeout=60000, wait_until="networkidle")
                    # Submeter o formulario com "Todos"
                    try:
                        await page.fill("input[name='Nome']", "Todos")
                        await page.click("button[type='submit'], input[type='submit']")
                        await page.wait_for_load_state("networkidle", timeout=30000)
                    except Exception:
                        pass
                except Exception:
                    pass
                html = await page.content()
                await browser.close()
                return self._parse_plain_html(html)
        except Exception as exc:
            logger.error("[RS] Playwright SSL bypass falhou: %s", exc)
            return []

    async def parse_leiloeiros(self) -> List[Leiloeiro]:
        # Estrategia 1: POST direto (mais eficiente, retorna todos de uma vez)
        records = await self._fetch_post()

        if not records:
            # Estrategia 2: GET simples
            logger.info("[RS] POST falhou, tentando GET simples")
            records = await self._fetch_get_all()

        if not records:
            # Estrategia 3: Playwright com SSL bypass e submissao de formulario
            logger.info("[RS] GET falhou, tentando Playwright com SSL bypass")
            records = await self._playwright_ssl_bypass(self.url)

        if not records:
            # Estrategia 4: Pagina informativa (pode ter lista estatica)
            logger.info("[RS] Tentando pagina informativa: %s", self.url_fallback)
            soup = await self.fetch_page(url=self.url_fallback)
            if soup:
                records = self._parse_plain_html(str(soup))

        logger.info("[RS] Total de registros encontrados: %d", len(records))
        return [self.make_leiloeiro(**r) for r in records if r.get("nome")]
