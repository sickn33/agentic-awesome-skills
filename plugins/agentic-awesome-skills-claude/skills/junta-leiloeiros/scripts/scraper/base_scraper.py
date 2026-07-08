"""
Base abstrata para scrapers de leiloeiros das Juntas Comerciais do Brasil.
Cada estado herda desta classe e implementa parse_leiloeiros().
Suporta httpx (sites estáticos) e Playwright (sites com JavaScript).
"""
from __future__ import annotations

import asyncio
import logging
import os
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any, List, Optional

logger = logging.getLogger(__name__)


def should_verify_tls() -> bool:
    return os.getenv("JUNTA_INSECURE_TLS", "").lower() not in {"1", "true", "yes", "on"}


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

    HEADERS = {
        "User-Agent": (
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
            "AppleWebKit/537.36 (KHTML, like Gecko) "
            "Chrome/121.0.0.0 Safari/537.36"
        ),
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

        target = url or self.url
        verify_tls = should_verify_tls()
        for attempt in range(1, self.max_retries + 1):
            try:
                async with httpx.AsyncClient(
                    headers=self.HEADERS,
                    timeout=self.timeout,
                    follow_redirects=True,
                    verify=verify_tls,
                ) as client:
                    if method.upper() == "POST":
                        resp = await client.post(target, data=data, params=params)
                    else:
                        resp = await client.get(target, params=params)

                    resp.raise_for_status()
                    return BeautifulSoup(resp.text, "lxml")

            except httpx.HTTPStatusError as exc:
                logger.warning(
                    "[%s] HTTP %s em %s (tentativa %d/%d)",
                    self.estado, exc.response.status_code, target, attempt, self.max_retries,
                )
            except (httpx.RequestError, httpx.TimeoutException) as exc:
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
            logger.info("[%s] %d leiloeiros coletados", self.estado, len(results))
            return results
        except Exception as exc:
            logger.exception("[%s] Erro inesperado: %s", self.estado, exc)
            return []

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
        if any(x in r for x in ("ATIV", "REGULAR", "HABILITAD")):
            return "ATIVO"
        if any(x in r for x in ("CANCEL", "BAIXAD", "EXTINT")):
            return "CANCELADO"
        if "SUSPEND" in r:
            return "SUSPENSO"
        if "IRREG" in r:
            return "IRREGULAR"
        return raw.strip()

    def make_leiloeiro(self, **kwargs) -> Leiloeiro:
        """Factory que preenche estado/junta/url_fonte automaticamente."""
        kwargs.setdefault("estado", self.estado)
        kwargs.setdefault("junta", self.junta)
        kwargs.setdefault("url_fonte", self.url)
        if "situacao" in kwargs:
            kwargs["situacao"] = self.normalize_situacao(kwargs["situacao"])
        return Leiloeiro(**kwargs)

    async def fetch_page_js(
        self,
        url: Optional[str] = None,
        wait_selector: Optional[str] = None,
        wait_ms: int = 3000,
    ) -> Optional[Any]:
        """Renderiza página com JavaScript usando Playwright. Retorna BeautifulSoup ou None."""
        from bs4 import BeautifulSoup

        target = url or self.url
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
                await browser.close()
                return BeautifulSoup(html, "lxml")
        except Exception as exc:
            logger.error("[%s] Erro Playwright em %s: %s", self.estado, target, exc)
            return None
