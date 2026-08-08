"""
Scraper JUCESP — Junta Comercial do Estado de São Paulo

MECANISMO REAL (descoberto em 2025-02-25):
  A URL https://www.institucional.jucesp.sp.gov.br/tradutores-leiloeiros.html
  é apenas uma página institucional com links para downloads e um accordeon.
  O accordion "Localizar Leiloeiro e Tradutor" aponta para:
    https://www.institucional.jucesp.sp.gov.br/consultaLeilao.html
  Essa página contém um <iframe> carregando o sistema real:
    https://www.institucional.jucesp.sp.gov.br/relatorio/ConsultasLeiloeiroTradutor

  O sistema real é um app ASP.NET MVC com:
    - GET  /relatorio/ConsultasLeiloeiroTradutor
          -> retorna formulário de busca com token CSRF anti-forgery
    - POST /relatorio/ConsultasLeiloeiroTradutor/ListaLeiloeirosTradutores
          -> retorna HTML com tabela id="example" contendo TODOS os registros
             (sem paginação — 2.3 MB com 1152 leiloeiros na resposta completa)

  Campos do POST:
    __RequestVerificationToken  (obrigatório, obtido no GET)
    AgeTipo                     1 = Leiloeiro | 2 = Tradutor
    AgeMatricula                filtro opcional
    AgeNome                     filtro opcional
    AgeSituacao                 -1 = todos | 1=Atuante | 14=Atuante Regular |
                                 13=Atuante Irregular | 2=Destituído | 3=Exonerado |
                                 4=Falecido | 9=Licenciado | 10=Matrícula Cancelada |
                                 12=Registro Cassado | 11=Registro Suspenso |
                                 8=Regular | 7=Suspenso | 6=Suspenso Por Ordem Judicial |
                                 5=Transferido
    AgeDataPosseDe / AgeDataPosseAte  filtro de data (dd/mm/aaaa)
    AgeEndeComeLogradouro / AgeEndeComeBairro / AgeEndeComeMunicipio  filtro de endereço
    MatriculaCancelada          true/false
    MatriculaCancelada120       true/false

  Colunas da tabela retornada (id="example"):
    Nome | Matricula | PosseYMD | Posse | Logradouro | Bairro | Cidade |
    CEP | Telefones | E-Mail | Web Site | Situação | Preposto |
    Férias/Licença | Data do D.O.E. | Prazo para Publicação - 120 dias |
    Data do Cancelamento | PDF

  Total coletável: 1152 leiloeiros (todos os status)
  Atuante Regular: 577 | Exonerado: 273 | Destituído: 214 | Falecido: 47 | ...

Método: httpx com sessão (GET para CSRF, POST para dados)
"""
from __future__ import annotations

import re
from html import unescape
from typing import List, Optional

import httpx
from bs4 import BeautifulSoup

from .base_scraper import AbstractJuntaScraper, Leiloeiro, should_verify_tls


class JucespScraper(AbstractJuntaScraper):
    estado = "SP"
    junta = "JUCESP"
    url = "https://www.institucional.jucesp.sp.gov.br/tradutores-leiloeiros.html"

    # Endpoint real do sistema de consulta
    _FORM_URL = "https://www.institucional.jucesp.sp.gov.br/relatorio/ConsultasLeiloeiroTradutor"
    _POST_URL = (
        "https://www.institucional.jucesp.sp.gov.br"
        "/relatorio/ConsultasLeiloeiroTradutor/ListaLeiloeirosTradutores"
    )

    # Busca todos os status (-1).  Para coletar apenas ativos use "14" (Atuante Regular).
    _AGE_SITUACAO = "-1"

    async def parse_leiloeiros(self) -> List[Leiloeiro]:
        """
        Fluxo:
        1. GET /relatorio/ConsultasLeiloeiroTradutor  -> extrai token CSRF
           (o servidor emite um cookie de sessão junto com o token)
        2. POST /relatorio/ConsultasLeiloeiroTradutor/ListaLeiloeirosTradutores
               com AgeTipo=1 e AgeSituacao=-1 (todos)
           IMPORTANTE: GET e POST devem usar o MESMO AsyncClient para que os
           cookies de sessão sejam enviados. Sem isso o servidor retorna 500.
        3. Parseia a tabela id="example" do HTML retornado
        """
        import asyncio as _aio
        import logging as _log
        logger = _log.getLogger(__name__)

        for attempt in range(1, self.max_retries + 1):
            try:
                soup = await self._fetch_with_session()
                if soup:
                    return self._parse_table(soup)
            except Exception as exc:
                # Mask any CSRF tokens that might appear in error messages
                safe_exc = str(exc)
                if hasattr(self, '_last_csrf') and self._last_csrf and self._last_csrf in safe_exc:
                    safe_exc = safe_exc.replace(self._last_csrf, "***csrf-masked***")
                logger.warning("[SP] Tentativa %d/%d falhou: %s", attempt, self.max_retries, safe_exc)
                if attempt < self.max_retries:
                    await _aio.sleep(2 ** attempt)

        return []

    # ── helpers privados ─────────────────────────────────────────────────────

    async def _fetch_with_session(self) -> Optional[BeautifulSoup]:
        """
        GET + POST dentro do mesmo AsyncClient.
        O servidor ASP.NET emite um cookie de sessão no GET que deve ser
        reenviado no POST — sem ele o servidor retorna HTTP 500.
        """
        import logging
        logger = logging.getLogger(__name__)

        async with httpx.AsyncClient(
            headers=self.HEADERS,
            verify=should_verify_tls(),
            http2=False,          # servidor rejeita HTTP/2
            follow_redirects=True,
            timeout=120.0,        # resposta do POST é ~2.3 MB
        ) as client:
            # 1. GET — obtém CSRF token e cookie de sessão
            r_get = await client.get(self._FORM_URL)
            r_get.raise_for_status()

            csrf_match = re.search(
                r'name="__RequestVerificationToken"[^>]*value="([^"]+)"',
                r_get.text,
            )
            if not csrf_match:
                logger.warning("[SP] CSRF token não encontrado")
                return None
            csrf = csrf_match.group(1)
            self._last_csrf = csrf  # Store for safe error masking

            # 2. POST — mesmo client envia os cookies de sessão automaticamente
            r_post = await client.post(
                self._POST_URL,
                data={
                    "__RequestVerificationToken": csrf,
                    "AgeTipo": "1",                 # Leiloeiro
                    "AgeMatricula": "",
                    "AgeNome": "",
                    "AgeSituacao": self._AGE_SITUACAO,
                    "AgeDataPosseDe": "",
                    "AgeDataPosseAte": "",
                    "AgeEndeComeLogradouro": "",
                    "AgeEndeComeBairro": "",
                    "AgeEndeComeMunicipio": "",
                    "MatriculaCancelada": "false",
                    "MatriculaCancelada120": "false",
                },
                headers={
                    "Content-Type": "application/x-www-form-urlencoded",
                    "Referer": self._FORM_URL,
                    "Origin": "https://www.institucional.jucesp.sp.gov.br",
                },
            )
            r_post.raise_for_status()
            return BeautifulSoup(r_post.text, "lxml")

    def _parse_table(self, soup: BeautifulSoup) -> List[Leiloeiro]:
        """
        Parseia a tabela id="example" retornada pelo POST.

        Colunas (índice 0-based):
          0  Nome
          1  Matricula
          2  PosseYMD   (hidden, usado para ordenação)
          3  Posse      (dd/mm/aaaa)
          4  Logradouro
          5  Bairro
          6  Cidade
          7  CEP
          8  Telefones
          9  E-Mail
         10  Web Site
         11  Situação
         12  Preposto
         13  Férias/Licença
         14  Data do D.O.E.
         15  Prazo para Publicação - 120 dias
         16  Data do Cancelamento
         17  PDF
        """
        results: List[Leiloeiro] = []

        table = soup.find("table", {"id": "example"})
        if not table:
            # Fallback: procurar a maior tabela da página
            tables = soup.find_all("table")
            if not tables:
                return []
            table = max(tables, key=lambda t: len(t.find_all("tr")))

        rows = table.find_all("tr")
        if not rows:
            return []

        for row in rows[1:]:   # pula o cabeçalho
            cells = row.find_all("td")
            if len(cells) < 12:
                continue

            def cell(idx: int) -> Optional[str]:
                if idx < len(cells):
                    return self.clean(unescape(cells[idx].get_text()))
                return None

            nome = cell(0)
            if not nome:
                continue

            # Monta endereço completo
            logradouro = cell(4)
            bairro = cell(5)
            cidade = cell(6)
            cep = cell(7)
            partes = [p for p in [logradouro, bairro, cidade, cep] if p]
            endereco = ", ".join(partes) if partes else None

            results.append(self.make_leiloeiro(
                nome=nome,
                matricula=cell(1),
                data_registro=cell(3),   # data de posse
                endereco=endereco,
                municipio=cidade,
                telefone=cell(8),
                email=cell(9),
                situacao=cell(11),
            ))

        return results
