"""
Base abstrata para scrapers de leiloeiros das Juntas Comerciais do Brasil.
Cada estado herda desta classe e implementa parse_leiloeiros().
Suporta httpx (sites estáticos) e Playwright (sites com JavaScript).
"""
from __future__ import annotations

import asyncio
import logging
import os
import re
import time
from urllib.parse import urlsplit
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any, List, Optional

logger = logging.getLogger(__name__)


def should_verify_tls() -> bool:
    return True  # Certificate verification is never disabled by a catalog helper.


@dataclass
class Leiloeiro:
    estado: str
    junta: str
    nome: str
    matricula: Optional[str] = None
    cpf_cnpj: Optional[str] = None
    situacao: Optional[str] = None
    endereco: Optional[str] = None
    municipio: Optional[str] = None
    telefone: Optional[str] = None
    email: Optional[str] = None
    data_registro: Optional[str] = None
    data_atualizacao: Optional[str] = None
    url_fonte: Optional[str] = None
    scraped_at: str = field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

    def to_dict(self) -> dict:
        return {
            "estado": self.estado,
            "junta": self.junta,
            "matricula": self.matricula,
            "nome": self.nome,
            "cpf_cnpj": self.cpf_cnpj,
            "situacao": self.situacao,
            "endereco": self.endereco,
            "municipio": self.municipio,
            "telefone": self.telefone,
            "email": self.email,
            "data_registro": self.data_registro,
            "data_atualizacao": self.data_atualizacao,
            "url_fonte": self.url_fonte,
            "scraped_at": self.scraped_at,
        }


class AbstractJuntaScraper(ABC):
    """Classe base para todos os scrapers de Juntas Comerciais."""

    estado: str        # UF ex: "SP"
    junta: str         # nome da junta ex: "JUCESP"
    url: str           # URL da página de leiloeiros
    rate_limit: float = 2.0   # segundos entre requests
    max_retries: int = 3
    timeout: float = 30.0

    _host_locks = {}
    _host_last = {}
    _had_request_failure = False

    @staticmethod
    def checked_url(url):
        parsed = urlsplit(str(url))
        host = (parsed.hostname or "").lower()
        if parsed.username or parsed.password or not host.endswith(".gov.br"):
            raise ValueError("only approved public government host URLs are supported")
        if parsed.scheme != "https":
            allowed = set(os.getenv("JUNTA_ALLOW_HTTP_HOSTS", "").split(","))
            if parsed.scheme != "http" or host not in allowed:
                raise ValueError("plain HTTP requires an explicit exact-host diagnostic exception")
        if parsed.port not in {None, 80, 443}:
            raise ValueError("unexpected government endpoint port")
        return str(url)

    async def before_request(self, request):
        if getattr(self, "_request_pending", False):
            self._had_request_failure = True
        self._request_pending = True
        self.checked_url(str(request.url))
        host = request.url.host
        lock = self._host_locks.setdefault((id(asyncio.get_running_loop()), host), asyncio.Lock())
        async with lock:
            delay = self.rate_limit - (time.monotonic() - self._host_last.get(host, 0))
            if delay > 0: await asyncio.sleep(delay)
            self._host_last[host] = time.monotonic()

    async def bounded_response(self, response):
        chunks, count = [], 0
        async for chunk in response.aiter_bytes():
            count += len(chunk)
            if count > 10 * 1024 * 1024:
                await response.aclose()
                raise ValueError("government response exceeds 10 MiB")
            chunks.append(chunk)
        response._content = b"".join(chunks)
        self._request_pending = False
        if response.status_code >= 300:
            self._had_request_failure = True

    def request_hooks(self):
        return {"request": [self.before_request], "response": [self.bounded_response]}

    HEADERS = {
        "User-Agent": "JuntaPublicRegistryReview/1.0 (bounded public-directory client)",
        "Accept-Language": "pt-BR,pt;q=0.9",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    }

    async def fetch_page(
        self,
        url: Optional[str] = None,
        params: Optional[dict] = None,
        data: Optional[dict] = None,
        method: str = "GET",
    ) -> Optional[Any]:
        """Faz o request HTTP com retry e retorna BeautifulSoup ou None."""
        import httpx
        from bs4 import BeautifulSoup

        target = self.checked_url(url or self.url)
        verify_tls = should_verify_tls()
        for attempt in range(1, self.max_retries + 1):
            try:
                async with httpx.AsyncClient(
                    headers=self.HEADERS,
                    timeout=self.timeout,
                    follow_redirects=False,
                    event_hooks=self.request_hooks(),
                    verify=verify_tls,
                ) as client:
                    if method.upper() == "POST":
                        resp = await client.post(target, data=data, params=params)
                    else:
                        resp = await client.get(target, params=params)

                    resp.raise_for_status()
                    return BeautifulSoup(resp.text, "lxml")

            except httpx.HTTPStatusError as exc:
                self._had_request_failure = True
                logger.warning(
                    "[%s] HTTP %s em %s (tentativa %d/%d)",
                    self.estado, exc.response.status_code, target, attempt, self.max_retries,
                )
            except (httpx.RequestError, httpx.TimeoutException) as exc:
                self._had_request_failure = True
                logger.warning(
                    "[%s] Erro de request em %s: %s (tentativa %d/%d)",
                    self.estado, target, exc, attempt, self.max_retries,
                )

            if attempt < self.max_retries:
                await asyncio.sleep(2 ** attempt)  # exponential backoff

        logger.error("[%s] Falha após %d tentativas em %s", self.estado, self.max_retries, target)
        return None

    @abstractmethod
    async def parse_leiloeiros(self) -> List[Leiloeiro]:
        """Coleta e retorna a lista de leiloeiros do estado."""
        ...

    async def scrape(self) -> List[Leiloeiro]:
        """Ponto de entrada principal — respeita rate limit e loga resultado."""
        logger.info("[%s] Iniciando scraping de %s", self.estado, self.url)
        await asyncio.sleep(self.rate_limit)
        try:
            results = await self.parse_leiloeiros()
            if len(results) > 20000:
                raise ValueError("state result exceeds 20000 records")
            # Broad fallbacks may yield headings/paragraphs. Do not persist them as
            # registered professionals without a source registration identifier.
            candidates = [record for record in results if not record.matricula]
            self.unverified_candidates = len(candidates)
            results = [record for record in results if record.matricula]
            logger.info("[%s] %d identified records; %d unverified candidates omitted", self.estado, len(results), len(candidates))
            return results
        except Exception as exc:
            logger.error("[%s] Scraping failed; records not verified", self.estado)
            raise

    # ── helpers comuns ──────────────────────────────────────────────────────

    @staticmethod
    def clean(text: Optional[str]) -> Optional[str]:
        """Remove espaços extras e retorna None se vazio."""
        if text is None:
            return None
        s = " ".join(text.split()).strip()
        return s if s else None

    @staticmethod
    def normalize_situacao(raw: Optional[str]) -> Optional[str]:
        """Normaliza status para ATIVO / CANCELADO / SUSPENSO / IRREGULAR."""
        if raw is None:
            return None
        r = raw.upper().strip()
        if "IRREG" in r or "INATIV" in r or "NÃO REGULAR" in r or "NAO REGULAR" in r:
            return "IRREGULAR" if "IRREG" in r else raw.strip()
        if any(x in r for x in ("CANCEL", "BAIXAD", "EXTINT")):
            return "CANCELADO"
        if "SUSPEN" in r:
            return "SUSPENSO"
        if re.fullmatch(r"(?:ATIVO|ATIVA|REGULAR|REGULARIZADO|REGULARIZADA|HABILITADO|HABILITADA|ATUANTE REGULAR)", r):
            return "ATIVO"
        return raw.strip()

    def make_leiloeiro(self, **kwargs) -> Leiloeiro:
        """Factory que preenche estado/junta/url_fonte automaticamente."""
        if os.getenv("JUNTA_INCLUDE_CONTACTS") != "1":
            for field_name in ("cpf_cnpj", "endereco", "telefone", "email"):
                kwargs[field_name] = None
        kwargs.setdefault("estado", self.estado)
        kwargs.setdefault("junta", self.junta)
        kwargs.setdefault("url_fonte", self.url)
        if "situacao" in kwargs:
            kwargs["situacao"] = self.normalize_situacao(kwargs["situacao"])
        return Leiloeiro(**kwargs)

    async def browser_route(self, route):
        try:
            self.checked_url(route.request.url)
        except ValueError:
            await route.abort()
            return
        await route.continue_()

    async def fetch_page_js(
        self,
        url: Optional[str] = None,
        wait_selector: Optional[str] = None,
        wait_ms: int = 3000,
    ) -> Optional[Any]:
        """Renderiza página com JavaScript usando Playwright. Retorna BeautifulSoup ou None."""
        from bs4 import BeautifulSoup

        target = self.checked_url(url or self.url)
        verify_tls = should_verify_tls()
        try:
            from playwright.async_api import async_playwright
        except ImportError:
            logger.error("[%s] Playwright não instalado. Execute: playwright install chromium", self.estado)
            return None

        try:
            async with async_playwright() as pw:
                browser = await pw.chromium.launch(headless=True)
                ctx = await browser.new_context(
                    user_agent=self.HEADERS["User-Agent"],
                    locale="pt-BR",
                    ignore_https_errors=not verify_tls,
                )
                await ctx.route("**/*", self.browser_route)
                page = await ctx.new_page()
                await page.goto(target, timeout=60000, wait_until="networkidle")

                if wait_selector:
                    try:
                        await page.wait_for_selector(wait_selector, timeout=15000)
                    except Exception:
                        pass  # Continua mesmo sem o seletor
                else:
                    await page.wait_for_timeout(wait_ms)

                html = await page.content()
                if len(html.encode()) > 10 * 1024 * 1024:
                    raise ValueError("rendered page exceeds 10 MiB")
                await browser.close()
                return BeautifulSoup(html, "lxml")
        except Exception as exc:
            self._had_request_failure = True
            logger.error("[%s] Playwright failed; no certificate bypass attempted", self.estado)
            return None
