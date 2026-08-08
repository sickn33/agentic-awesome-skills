"""
Scraper JUCERJA — Junta Comercial do Estado do Rio de Janeiro
URL: https://www.jucerja.rj.gov.br/AuxiliaresComercio/Leiloeiros
Metodo: httpx com paginacao AJAX
Endpoints reais descobertos em 2026-02-25:
  - Lista paginada (5/pg): GET /AuxiliaresComercio/FiltrarLeiloeiros?pagina=N&ordenacao=matricula&SituacaoFuncionalId=
  - SituacaoFuncionalId vazio = todos os status
Estrutura HTML: <ul class="ats-listaLnks ats-container--estrutura">
  com <li class="ats-listaLnks-item"> contendo pares <h5>label</h5><h6>valor</h6>
Total: ~334 leiloeiros (108 Regular + 132 Cancelados + 94 outros)
67 paginas x 5 registros/pagina com SituacaoFuncionalId em branco
"""
from __future__ import annotations

import asyncio
import logging
from typing import List

from .base_scraper import AbstractJuntaScraper, Leiloeiro

logger = logging.getLogger(__name__)


class JucerjaScraper(AbstractJuntaScraper):
    estado = "RJ"
    junta = "JUCERJA"
    url = "https://www.jucerja.rj.gov.br/AuxiliaresComercio/Leiloeiros"

    # Endpoint AJAX real da paginacao (descoberto em 2026-02-25)
    _PAGINAR_URL = "https://www.jucerja.rj.gov.br/AuxiliaresComercio/FiltrarLeiloeiros"

    def _parse_lista(self, soup) -> List[dict]:
        """
        Extrai leiloeiros da lista HTML.
        Estrutura: <ul class="ats-listaLnks"> com <li> contendo <h5> (label) e <h6> (valor).
        """
        records = []

        # Seletor primario: li dentro da lista de leiloeiros
        items = soup.select("ul.ats-listaLnks li, ul.ats-container--estrutura li, #listaLeiloeiros li, .listagemLeiloeiros li")
        if not items:
            # Fallback: qualquer li com h5 e h6
            items = [li for li in soup.find_all("li") if li.find("h5") and li.find("h6")]

        for li in items:
            labels = [self.clean(h.get_text()) for h in li.find_all("h5")]
            values = [self.clean(h.get_text()) for h in li.find_all("h6")]
            if not labels or not values:
                continue

            # Mapa label.lower() -> valor
            data = {}
            for label, val in zip(labels, values):
                if label:
                    data[label.lower().rstrip(":")] = val

            def get_val(*frags):
                for k, v in data.items():
                    if any(f in k for f in frags) and v:
                        return v
                return None

            # Nome: pode ser "leiloeiro", "nome" ou o primeiro valor
            nome = get_val("leiloeiro", "nome") or (values[0] if values else None)
            if not nome or len(nome) < 3:
                continue

            records.append({
                "nome": nome,
                "matricula": get_val("matr", "registro", "nº matr", "n° matr"),
                "situacao": get_val("situ", "funcional", "status"),
                "municipio": get_val("munic", "cidade"),
                "telefone": get_val("tel", "fone"),
                "email": get_val("email", "e-mail"),
                "endereco": get_val("ender", "logr", "rua", "endere"),
                "data_registro": get_val("data matrícula", "posse", "data"),
            })

        return records

    async def parse_leiloeiros(self) -> List[Leiloeiro]:
        """
        Coleta todos os leiloeiros via endpoint AJAX de paginacao.
        GET /AuxiliaresComercio/FiltrarLeiloeiros?pagina=N&ordenacao=matricula&SituacaoFuncionalId=
        Pagina 5 registros por vez; SituacaoFuncionalId em branco = todos os status.
        """
        import httpx
        results: List[Leiloeiro] = []
        pagina = 1
        seen_names: set = set()

        headers = {
            **self.HEADERS,
            "X-Requested-With": "XMLHttpRequest",
            "Referer": self.url,
        }

        try:
            async with httpx.AsyncClient(
                headers=headers,
                verify=True,
                follow_redirects=True,
                timeout=60.0,
            ) as client:
                # Primeiro GET na pagina principal para obter cookies
                await client.get(self.url)

                while True:
                    url_pagina = (
                        f"{self._PAGINAR_URL}"
                        f"?pagina={pagina}&ordenacao=matricula&Nome=&SituacaoFuncionalId="
                    )
                    try:
                        resp = await client.get(url_pagina)
                        if resp.status_code >= 400:
                            logger.warning("[RJ] Pagina %d retornou HTTP %d", pagina, resp.status_code)
                            break
                    except Exception as exc:
                        logger.error("[RJ] Erro na pagina %d: %s", pagina, exc)
                        break

                    from bs4 import BeautifulSoup
                    soup = BeautifulSoup(resp.text, "lxml")
                    page_records = self._parse_lista(soup)

                    if not page_records:
                        logger.debug("[RJ] Pagina %d sem registros — fim da paginacao", pagina)
                        break

                    # Evita duplicatas (mesmo nome ja visto)
                    novos = 0
                    for r in page_records:
                        key = r["nome"].upper()
                        if key not in seen_names:
                            seen_names.add(key)
                            if not r.get("municipio"):
                                r["municipio"] = "Rio de Janeiro"
                            results.append(self.make_leiloeiro(**r))
                            novos += 1

                    logger.debug("[RJ] Pagina %d: %d novos (total=%d)", pagina, novos, len(results))

                    if novos == 0:
                        break  # Pagina repetiu dados — parar

                    pagina += 1
                    if pagina > 100:  # Limite de seguranca
                        logger.warning("[RJ] Limite de paginas atingido")
                        break

                    await asyncio.sleep(0.3)  # Evita sobrecarga

        except Exception as exc:
            logger.error("[RJ] Erro geral na coleta: %s", exc)

        if not results:
            # Fallback: Playwright para pagina estatica com qualquer registro
            logger.info("[RJ] Tentando Playwright como fallback")
            soup = await self.fetch_page_js(
                url=self.url,
                wait_selector="li",
                wait_ms=5000,
            )
            if soup:
                for r in self._parse_lista(soup):
                    if not r.get("municipio"):
                        r["municipio"] = "Rio de Janeiro"
                    results.append(self.make_leiloeiro(**r))

        return results
