"""
Registro de todos os 27 scrapers das Juntas Comerciais do Brasil.
Cada entrada define estado, junta, URL e scraper a ser usado.

URLs verificadas e atualizadas em 2026-02-25.
Scrapers customizados têm lógica específica para cada site.
"""
from __future__ import annotations

from typing import Type

from .base_scraper import AbstractJuntaScraper
from .generic_scraper import GenericJuntaScraper

# Scrapers customizados — lógica específica por estado
from .jucesp import JucespScraper       # SP
from .jucerja import JucerjaScraper     # RJ (Playwright)
from .jucemg import JucemgScraper       # MG
from .jucec import JucecScraper         # CE
from .jucis_df import JucisDfScraper    # DF
from .jucisrs import JucisrsScraper     # RS (Playwright - JUCISRS, domínio antigo aposentado)
from .jucepar import JuceparScraper     # PR (URL migrou para juntacomercial.pr.gov.br)
from .jucesc import JucescScraper       # SC (sistema dedicado leiloeiros.jucesc.sc.gov.br)
from .juceb import JucebScraper         # BA (URL migrou para ba.gov.br/juceb)
from .jucepe import JucepeScraper       # PE (Playwright - portal.jucepe.pe.gov.br)
from .jucepa import JucepaScraper       # PA (Drupal node/171)
from .jucema import JucemaScraper       # MA (múltiplas tentativas de URL)
from .jucepi import JucepiScraper       # PI (URL migrou para portal.pi.gov.br/jucepi)
from .jucern import JucernScraper       # RN (HTTP com query string)
from .jucep import JucepScraper         # PB (JUCEP - domínio migrou para jucep.pb.gov.br)
from .juceal import JucealScraper       # AL (URL correta: /servicos/leiloeiros)
from .jucer import JucerScraper         # RO (URL migrou para rondonia.ro.gov.br/jucer)
from .jucap import JucapScraper         # AP (HTTP - cert TLS inválido)
from .juceac import JuceacScraper       # AC (URL correta: /leiloeiro/ singular)
from .jucetins import JucetinsScraper   # TO (JUCETINS - URL migrou para to.gov.br/jucetins)


def _make(estado: str, junta: str, url: str, municipio_default: str = None) -> Type[AbstractJuntaScraper]:
    """Cria dinamicamente uma classe de scraper genérico para o estado."""
    attrs = {
        "estado": estado,
        "junta": junta,
        "url": url,
        "municipio_default": municipio_default,
    }
    return type(f"{junta}Scraper", (GenericJuntaScraper,), attrs)


# Mapeamento completo: UF -> Classe de Scraper
# Todos os 27 estados com URLs verificadas e atualizadas em 2026-02-25
SCRAPERS: dict[str, Type[AbstractJuntaScraper]] = {
    # Região Sudeste
    "SP": JucespScraper,    # JUCESP - https://www.institucional.jucesp.sp.gov.br/tradutores-leiloeiros.html
    "RJ": JucerjaScraper,   # JUCERJA - https://www.jucerja.rj.gov.br/AuxiliaresComercio/Leiloeiros (JS)
    "MG": JucemgScraper,    # JUCEMG - https://jucemg.mg.gov.br/pagina/139/leiloeiros-oficiais
    "ES": _make("ES", "JUCEES", "https://jucees.es.gov.br/leiloeiros", "Vitória"),

    # Região Sul
    "RS": JucisrsScraper,   # JUCISRS - https://sistemas.jucisrs.rs.gov.br/leiloeiros/ (JS)
    "PR": JuceparScraper,   # JUCEPAR - https://www.juntacomercial.pr.gov.br/Pagina/LEILOEIROS-OFICIAIS
    "SC": JucescScraper,    # JUCESC - https://leiloeiros.jucesc.sc.gov.br/site/

    # Região Nordeste
    "BA": JucebScraper,     # JUCEB - https://www.ba.gov.br/juceb/home/matriculas-e-carteira-profissional/leiloeiros
    "PE": JucepeScraper,    # JUCEPE - https://portal.jucepe.pe.gov.br/leiloeiros (JS)
    "CE": JucecScraper,     # JUCEC - https://www.jucec.ce.gov.br/leiloeiros/
    "MA": JucemaScraper,    # JUCEMA - múltiplas URLs tentadas
    "PI": JucepiScraper,    # JUCEPI - https://portal.pi.gov.br/jucepi/leiloeiro-oficial/
    "RN": JucernScraper,    # JUCERN - http://www.jucern.rn.gov.br/Conteudo.asp?TRAN=ITEM&TARG=8695...
    "PB": JucepScraper,     # JUCEP - https://jucep.pb.gov.br/contatos/leiloeiros
    "AL": JucealScraper,    # JUCEAL - http://www.juceal.al.gov.br/servicos/leiloeiros
    "SE": _make("SE", "JUCESE", "https://jucese.se.gov.br/leiloeiros/", "Aracaju"),

    # Região Centro-Oeste
    "DF": JucisDfScraper,   # JUCIS-DF - https://jucis.df.gov.br/leiloeiros/
    "GO": _make("GO", "JUCEG", "https://goias.gov.br/juceg/", "Goiânia"),
    "MT": _make("MT", "JUCEMAT", "https://www.jucemat.mt.gov.br/leiloeiros", "Cuiabá"),
    "MS": _make("MS", "JUCEMS", "https://www.jucems.ms.gov.br/empresas/controles-especiais/agentes-auxiliares/leiloeiros/", "Campo Grande"),

    # Região Norte
    "PA": JucepaScraper,    # JUCEPA - https://www.jucepa.pa.gov.br/node/171
    "AM": _make("AM", "JUCEA", "https://www.jucea.am.gov.br/leiloeiros/", "Manaus"),
    "RO": JucerScraper,     # JUCER - https://rondonia.ro.gov.br/jucer/lista-de-leiloeiros-oficiais/
    "RR": _make("RR", "JUCERR", "https://jucerr.rr.gov.br/leiloeiros/", "Boa Vista"),
    "AP": JucapScraper,     # JUCAP - http://www.jucap.ap.gov.br/leiloeiros (HTTP - TLS inválido)
    "AC": JuceacScraper,    # JUCEAC - https://juceac.ac.gov.br/leiloeiro/
    "TO": JucetinsScraper,  # JUCETINS - https://www.to.gov.br/jucetins/leiloeiros/152aezl6blm0
}


def get_all_scrapers() -> list[AbstractJuntaScraper]:
    """Retorna instâncias de todos os scrapers."""
    return [cls() for cls in SCRAPERS.values()]


def get_scraper(estado: str) -> AbstractJuntaScraper | None:
    """Retorna o scraper para um estado específico (UF)."""
    cls = SCRAPERS.get(estado.upper())
    return cls() if cls else None
