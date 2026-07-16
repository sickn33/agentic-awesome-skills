# Juntas Comerciais do Brasil — URLs e Status de Scraping

Tabela de referência atualizada com todas as 27 Juntas Comerciais e seus sites de leiloeiros.
**Última verificação:** 2026-02-25

| UF | Junta | URL Leiloeiros | Método | Status |
|----|-------|---------------|--------|--------|
| SP | JUCESP | https://www.institucional.jucesp.sp.gov.br/tradutores-leiloeiros.html | httpx+BS4 | CUSTOMIZADO |
| RJ | JUCERJA | https://www.jucerja.rj.gov.br/AuxiliaresComercio/Leiloeiros | PLAYWRIGHT | CUSTOMIZADO |
| MG | JUCEMG | https://jucemg.mg.gov.br/pagina/139/leiloeiros-oficiais | httpx+BS4 | CUSTOMIZADO |
| ES | JUCEES | https://jucees.es.gov.br/leiloeiros | httpx+BS4 | GENÉRICO |
| RS | JUCISRS | https://sistemas.jucisrs.rs.gov.br/leiloeiros/ | PLAYWRIGHT | CUSTOMIZADO (domínio antigo: jucers.rs.gov.br APOSENTADO) |
| PR | JUCEPAR | https://www.juntacomercial.pr.gov.br/Pagina/LEILOEIROS-OFICIAIS | httpx+BS4 | CUSTOMIZADO (migrou de jucepar.pr.gov.br) |
| SC | JUCESC | https://leiloeiros.jucesc.sc.gov.br/site/ | httpx+BS4 | CUSTOMIZADO (subdomínio dedicado) |
| BA | JUCEB | https://www.ba.gov.br/juceb/home/matriculas-e-carteira-profissional/leiloeiros | httpx+BS4 | CUSTOMIZADO (migrou de juceb.ba.gov.br) |
| PE | JUCEPE | https://portal.jucepe.pe.gov.br/leiloeiros | PLAYWRIGHT | CUSTOMIZADO (SPA - migrou de jucepe.pe.gov.br) |
| CE | JUCEC | https://www.jucec.ce.gov.br/leiloeiros/ | httpx+BS4 | CUSTOMIZADO |
| MA | JUCEMA | http://www.jucema.ma.gov.br/leiloeiros | httpx+multi-URL | CUSTOMIZADO (múltiplas URLs tentadas) |
| PI | JUCEPI | https://portal.pi.gov.br/jucepi/leiloeiro-oficial/ | httpx+BS4 | CUSTOMIZADO (migrou para portal estadual) |
| RN | JUCERN | http://www.jucern.rn.gov.br/Conteudo.asp?TRAN=ITEM&TARG=8695&ACT=&PAGE=0&PARM=&LBL=Leiloeiros | httpx+BS4 | CUSTOMIZADO (HTTP, query string) |
| PB | JUCEP | https://jucep.pb.gov.br/contatos/leiloeiros | httpx+BS4 | CUSTOMIZADO (domínio migrou para jucep.pb.gov.br) |
| AL | JUCEAL | http://www.juceal.al.gov.br/servicos/leiloeiros | httpx+BS4 | CUSTOMIZADO (URL: /servicos/leiloeiros) |
| SE | JUCESE | https://jucese.se.gov.br/leiloeiros/ | httpx+BS4 | GENÉRICO |
| DF | JUCIS-DF | https://jucis.df.gov.br/leiloeiros/ | httpx+BS4 | CUSTOMIZADO |
| GO | JUCEG | https://goias.gov.br/juceg/ | httpx+BS4 | GENÉRICO |
| MT | JUCEMAT | https://www.jucemat.mt.gov.br/leiloeiros | httpx+BS4 | GENÉRICO |
| MS | JUCEMS | https://www.jucems.ms.gov.br/empresas/controles-especiais/agentes-auxiliares/leiloeiros/ | httpx+BS4 | GENÉRICO (URL com path completo) |
| PA | JUCEPA | https://www.jucepa.pa.gov.br/node/171 | httpx+BS4 | CUSTOMIZADO (Drupal node ID) |
| AM | JUCEA | https://www.jucea.am.gov.br/leiloeiros/ | httpx+BS4 | GENÉRICO |
| RO | JUCER | https://rondonia.ro.gov.br/jucer/lista-de-leiloeiros-oficiais/ | httpx+BS4 | CUSTOMIZADO (migrou para portal estadual) |
| RR | JUCERR | https://jucerr.rr.gov.br/leiloeiros/ | httpx+BS4 | GENÉRICO |
| AP | JUCAP | http://www.jucap.ap.gov.br/leiloeiros | httpx+BS4 | CUSTOMIZADO (TLS inseguro somente via `JUNTA_INSECURE_TLS=1`) |
| AC | JUCEAC | https://juceac.ac.gov.br/leiloeiro/ | httpx+BS4 | CUSTOMIZADO (URL: /leiloeiro/ singular) |
| TO | JUCETINS | https://www.to.gov.br/jucetins/leiloeiros/152aezl6blm0 | httpx+BS4 | CUSTOMIZADO (domínio antigo: juceto.to.gov.br APOSENTADO) |

## Legenda de Status

- **CUSTOMIZADO**: Scraper dedicado com lógica específica para o formato da página
- **GENÉRICO**: Usa `GenericJuntaScraper` com detecção automática de tabela/lista
- **PLAYWRIGHT**: Requer renderização JS (browser headless)
- **INDISPONÍVEL**: Site fora do ar ou sem página de leiloeiros (registrado no log)

## Migrações Confirmadas (2025-2026)

| Antigo | Novo | Junta |
|--------|------|-------|
| jucers.rs.gov.br | jucisrs.rs.gov.br + sistemas.jucisrs.rs.gov.br | JUCISRS (renomeada) |
| jucepar.pr.gov.br | juntacomercial.pr.gov.br | JUCEPAR |
| jucesc.sc.gov.br/index.php | leiloeiros.jucesc.sc.gov.br/site/ | JUCESC |
| juceb.ba.gov.br | ba.gov.br/juceb | JUCEB |
| jucepe.pe.gov.br | portal.jucepe.pe.gov.br | JUCEPE |
| jucepa.pa.gov.br/index.php | jucepa.pa.gov.br/node/171 | JUCEPA |
| jucepi.pi.gov.br | portal.pi.gov.br/jucepi | JUCEPI |
| jucepb.pb.gov.br | jucep.pb.gov.br | JUCEP (renomeada) |
| juceal.al.gov.br/leiloeiros | juceal.al.gov.br/servicos/leiloeiros | JUCEAL |
| jucer.ro.gov.br | rondonia.ro.gov.br/jucer | JUCER |
| juceac.ac.gov.br/leiloeiros | juceac.ac.gov.br/leiloeiro/ | JUCEAC |
| juceto.to.gov.br | to.gov.br/jucetins | JUCETINS (renomeada) |
| jucers.ms.gov.br/leiloeiros | jucems.ms.gov.br/empresas/controles-especiais/agentes-auxiliares/leiloeiros/ | JUCEMS |

## Fontes Alternativas (fallback)

Caso um site esteja indisponível, verificar:
- **DREI**: https://www.gov.br/empresas-e-negocios/pt-br/drei/tradutores-e-leiloeiros
- **BomValor**: https://osleiloeiros.bomvalor.com.br/
- **InnLei**: https://innlei.org.br/juntas-comerciais
- **FENAJU**: https://www.fenaju.org.br/federados

## Integração com Web-Scraper (skill)

Para estados com baixa coleta ou sites problemáticos, o `web_scraper_fallback.py` aciona
automaticamente a skill web-scraper para extração inteligente adicional.

Execute: `python scripts/web_scraper_fallback.py --estado MA RN AP`

## Como Atualizar Este Arquivo

Após cada scraping, verificar no `data/scraping_log.json`:
- Estados com `status: VAZIO` → investigar se URL mudou
- Estados com `status: ERRO` → possível necessidade de Playwright
- Atualizar colunas `Método` e `URL` se necessário
