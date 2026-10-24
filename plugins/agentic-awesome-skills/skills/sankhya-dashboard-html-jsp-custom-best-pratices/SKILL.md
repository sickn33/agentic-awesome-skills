---
name: sankhya-dashboard-html-jsp-custom-best-pratices
description: "This skill should be used when the user asks for patterns, best practices, creation, or fixing of Sankhya dashboards using HTML, JSP, Java, and SQL."
category: code
risk: safe
source: community
tags: [sankhya, dashboard, jsp, html, sql, best-practices]
date_added: "2026-03-10"
---

# sankhya-dashboard-html-jsp-custom-best-pratices

## Purpose

To provide a consolidated guide of patterns and best practices for creating and maintaining dashboards, SQL queries, BI parameterization, and UI/UX within the Sankhya ecosystem (JSP/HTML/Java).

## When to Use This Skill

This skill should be used when:
- The user asks about "boas praticas do sankhya" or "Sankhya best practices".
- The user mentions "dashboard sankhya" or is working on a Sankhya BI dashboard.
- The request specifically concerns Sankhya dashboard/JSP/BI implementation or review.
- The user wants to create or modify code files for Sankhya dashboards.

## Core Capabilities

1. **Code Generation & Review**: Apply JSP/JSTL patterns and server-side organization to reduce compilation errors and rendering failures.
2. **Visual Consistency**: Standardize visual identity in BI components using predefined CSS tokens.
3. **Database Exploration**: Structure data exploration queries for performance and correct mapping of Sankhya entities.
4. **BI Construction Guide**: Use the HTML5 component flow in BI to ensure correct rendering, reactivity, and navigation.

## Patterns

### Contrato de versão, dados e autorização

Os trechos são exemplos independentes, não um componente compilado ou uma API certificada. Confirme versão Sankhya/JSTL, taglibs disponíveis, banco, esquema, binds e eventos do container na documentação/instância autorizada. snk:query, executeQuery, openLevel, CODUSU_LOG e STP_GET_CODUSULOGADO precisam do contrato real; uma variável JSP não é automaticamente bind SQL. Não execute consultas amplas, DBExplorer, uploads/publicação ou alterações transacionais sem escopo e orçamento autorizados. Use dados sintéticos, limites/paginação e identidade de sessão derivada no servidor.

### Melhores Práticas de Código
Aplicar padrões de JSP/JSTL e organização server-side para reduzir erros de compilação, falhas de renderização e regressões em dashboards/telas.

**Diretrizes de implementação**
- Declarar diretivas JSP e taglibs obrigatórias no topo do arquivo.
- Forçar `isELIgnored="false"` para habilitar `${...}` em tempo de renderização.
- Preferir `core_rt` para JSTL core no ecossistema Sankhya.
- Evitar scriptlets Java em JSP; usar JSTL (`c:if`, `c:choose`, `c:forEach`).
- Modularizar lógica de negócio (camadas/serviços), evitando acoplamento em arquivo único.
- Evitar hardcode de credenciais, URLs sensíveis e tokens.
- Modelar estado global da UI (dados, filtros, ordenação, aba ativa) e resetar estado antes de novo carregamento.
- Persistir preferências de visualização no `localStorage` (ordem de colunas e ordenação).
- Implementar carregamento sob demanda para abas/modais pesados (lazy-load) para reduzir tempo inicial.
- **Blindagem de Parâmetros**: Sempre definir um valor padrão (fallback) para parâmetros de URL via `c:set` para evitar Erro 500 no servidor Java do Sankhya.
- **Separação de Camadas (JSP vs JS)**: Evitar injetar tags JSP diretamente dentro de blocos `<script>`. Utilizar containers HTML ocultos para passar dados ao JavaScript, mantendo a saúde do editor de código (IDE Linting).

> Os nomes de tabelas e campos abaixo são representativos e podem variar conforme a implementação da instância.

```jsp
<%@ page language="java" contentType="text/html; charset=UTF-8" pageEncoding="UTF-8" isELIgnored="false" %>
<%@ taglib prefix="snk" uri="/WEB-INF/tld/sankhyaUtil.tld" %>
<%@ taglib uri="http://java.sun.com/jstl/core_rt" prefix="c" %>
<%@ taglib uri="http://java.sun.com/jsp/jstl/functions" prefix="fn" %>
<snk:load />
```

**Carregamento de assets em dashboard/gadget**
- Referenciar arquivos com `contextPath` + `BASE_FOLDER`.
- Em níveis secundários (`openLevel`), manter caminho absoluto para evitar quebra de resolução.

```html
<script src="${pageContext.request.contextPath}/${BASE_FOLDER}/js/app.js"></script>
<link rel="stylesheet" href="${pageContext.request.contextPath}/${BASE_FOLDER}/css/style.css" />
```

**Consumo seguro de `snk:query`**
- Iterar em `query.rows` (não no objeto raiz).
- Testar vazio com `empty query.rows`.

```jsp
<snk:query var="qDados">
    SELECT CAB.NUNOTA, CAB.CODPARC
      FROM TGFCAB CAB
</snk:query>

<c:choose>
    <c:when test="${empty qDados.rows}">
        <span>Sem resultados</span>
    </c:when>
    <c:otherwise>
        <c:forEach var="linha" items="${qDados.rows}">
            <c:out value="${linha.NUNOTA}" />
        </c:forEach>
    </c:otherwise>
</c:choose>
```

**Validação de tipo e autorização antes da SQL**
- Normalizar valor de entrada.
- Não remover aspas como defesa SQL: rejeite entradas fora do tipo/faixa e use binds reais; nomes de tabelas/colunas exigem allowlist estática.
- Ausência de parâmetro crítico deve bloquear a operação; um fallback0 não é autorização nem garantia contra erro500.

```jsp
<%-- Pseudocódigo: validar identificador inteiro no controlador e verificar
     autorização; fornecer bind tipado pela API real da versão instalada.
     Não usar param.P_CODUSU como identidade do usuário autenticado. --%>
<snk:query var="qAcessos">
    SELECT CODUSU, NOMEUSU
      FROM TSIUSU
     WHERE CODUSU = :CODUSU_AUTORIZADO
</snk:query>
<%-- :CODUSU_AUTORIZADO precisa de binding real, não fornecido neste trecho. --%>
```

**Estado de tela e lazy-load em dashboard único**
- Definir listas globais para reutilização em KPI, gráfico, tabela e modais.
- Guardar flag de carregamento por aba para evitar reconsultas desnecessárias.
- Recarregar dados e reabrir o contexto (produto/aba) após atualização transacional.

```js
var dadosGlobais = [];
var produtoAtual = null;
var abaCarregada = {};

function abrirDetalhe(dado) {
  produtoAtual = dado;
  abaCarregada = {};
  trocarAba("estoque");
}

function trocarAba(aba) {
  if (aba === "estoque" && !abaCarregada.estoque) carregarAbaEstoque(produtoAtual.CODPROD);
  if (aba === "pedidos" && !abaCarregada.pedidos) carregarAbaPedidos(produtoAtual.CODPROD);
  if (aba === "parceiros" && !abaCarregada.parceiros) carregarAbaParceiros(produtoAtual.CODPROD);
}
```
**Exemplo de Blindagem e Separação de Camadas**

```jsp
<%-- O controlador cria payloadJson com um serializador JSON real e dados
     autorizados. c:out escapa HTML na textarea; JS lê .value. --%>
<textarea id="data-container" hidden><c:out value="${payloadJson}" /></textarea>
<script>
  const element = document.getElementById("data-container");
  let myData = [];
  try {
    const parsed = JSON.parse(element?.value || "[]");
    if (!Array.isArray(parsed)) throw new Error("Expected array");
    myData = parsed; // validar esquema/tamanho antes de renderizar com textContent
  } catch {
    // Mostrar erro controlado; não logar payload nem dados pessoais.
  }
</script>
```

### Identidade Visual (Colors)
Padronizar identidade visual em componentes BI para consistência entre gadgets HTML5, tabelas e indicadores.

**Diretrizes de UI/UX**
- Definir paleta via tokens (`--color-*`) para evitar valores espalhados.
- Priorizar contraste mínimo entre texto/fundo (legibilidade operacional).
- Manter semântica visual consistente: sucesso, alerta, erro, neutro.
- Mapear status de dados para classes/cores de allowlist; não injetar CSS arbitrário vindo do SQL.
- Usar cabeçalho sticky e colunas fixas para tabelas largas com alto volume de leitura.
- Diferenciar status de linha via classes CSS (aprovado, parcial, histórico, crítico) para leitura operacional rápida.

> Os nomes de tabelas e campos abaixo são representativos e podem variar conforme a implementação da instância.

```html
<style>
  :root {
    --color-bg: #F5F7FA;
    --color-surface: #FFFFFF;
    --color-text: #1F2937;
    --color-success: #1A7F37;
    --color-warning: #B26A00;
    --color-danger: #B42318;
    --color-accent: #0E5A8A;
  }

  .card {
    background: var(--color-surface);
    color: var(--color-text);
    border-radius: 8px;
    padding: 12px;
  }
</style>
```

```sql
SELECT
    V.CODMETA,
    V.VALOR_ATUAL,
    V.VALOR_META,
    CASE WHEN V.VALOR_ATUAL >= V.VALOR_META THEN '#1A7F37' ELSE '#B42318' END AS BKCOLOR,
    '#FFFFFF' AS FGCOLOR
FROM AD_DADOS_VENDA V
```

```html
<style>
  #tblDados thead th { position: sticky; top: 0; z-index: 4; }
  #tblDados .col-fixa-1 { position: sticky; left: 0; z-index: 3; }
  #tblDados .col-fixa-2 { position: sticky; left: var(--fix-col-1-width); z-index: 2; }
  .row-aprovacao td { background: #ffe8cc; color: #7a3a00; }
  .row-parcial td { background: #fff4c4; color: #5e4c00; }
</style>
```

### Consultas e Exploração de Banco
Estruturar exploração de dados com foco em performance, legibilidade e mapeamento correto de entidades Sankhya.

**Boas práticas de exploração (DBExplorer)**
- Usar DBExplorer para inspeção de tabelas, campos, índices, views e procedures.
- Respeitar limite de retorno configurado (ex.: `DBEXPMAXROW`) para evitar carga excessiva.
- Evitar `SELECT *` em tabelas com campos volumosos (BLOB/CLOB).

**Mapas essenciais do ecossistema**
- Dicionário: `TDDTAB`, `TDDCAM`, `TDDOPC`, `TDDINS`, `TDDLIG`.
- Comercial/financeiro: `TGFCAB`, `TGFITE`, `TGFTOP`, `TGFPAR`, `TGFPRO`, `TGFEST`, `TGFVAR`.
- Segurança/acesso: `TSIUSU`, `TSIGRU`, `TSIACI`, `TSIIMP`.

**Padrões de SQL recomendados**
- Em TOP versionada, relacionar `CODTIPOPER` + data de alteração (`DHTIPOPER`/`DHALTER`).
- Em filtros opcionais, usar padrão `(... = :P_PARAM OR :P_PARAM IS NULL)`.
- Parametrizar sempre (evitar literals de usuário).

> Os nomes de tabelas e campos abaixo são representativos e podem variar conforme a implementação da instância.

```sql
SELECT
    CAB.NUNOTA,
    CAB.CODPARC,
    CAB.DTNEG,
    ITE.SEQUENCIA,
    ITE.CODPROD,
    (ITE.VLRTOT - ITE.VLRDESC) AS VLR_LIQUIDO
FROM TGFCAB CAB
JOIN TGFITE ITE
  ON ITE.NUNOTA = CAB.NUNOTA
JOIN TGFTOP TOP
  ON TOP.CODTIPOPER = CAB.CODTIPOPER
 AND TOP.DHALTER   = CAB.DHTIPOPER
WHERE (CAB.CODPARC = :P_CODPARC OR :P_CODPARC IS NULL)
  AND (CAB.CODVEND = :P_CODVEND OR :P_CODVEND IS NULL)
```

```sql
SELECT
    U.CODUSU,
    U.NOMEUSU,
    G.NOMEGRUPO,
    A.CODREL,
    I.NOME AS DESCRICAO_RECURSO,
    A.CONS,
    A.ALTERA
FROM TSIUSU U
JOIN TSIGRU G ON G.CODGRUPO = U.CODGRUPO
JOIN TSIACI A ON A.CODGRUPO = U.CODGRUPO
JOIN TSIIMP I ON I.CODREL = A.CODREL
WHERE U.CODUSU = :P_CODUSU
ORDER BY I.NOME
```

### Guia do Construtor de BI
Aplicar fluxo de desenvolvimento de componentes HTML5 no BI para garantir renderização, reatividade e navegação entre níveis.

**Estrutura e publicação**
- Empacotar componente em `.zip` com `index.html` como entrada principal.
- Organizar recursos estáticos em `assets/` (CSS, JS, libs, imagens).
- Usar XML/design conforme necessidade; considerar JSP de entrada quando houver pré-processamento server-side.

**Fluxo de dados e parâmetros**
- Definir variáveis SQL ou BeanShell conforme complexidade.
- Usar prefixos de tradução de parâmetro:
  - `:` para bind padrão.
  - Substituição literal depende da versão e não é bind seguro. Não usar entradas de usuário em :#/:@; projetar alternativas tipadas e verificar API oficial.
- Em parâmetros multi-list extensos, usar `/*inCollection*/`.

> Os nomes de tabelas e campos abaixo são representativos e podem variar conforme a implementação da instância.

```sql
SELECT
    C.CODCID,
    C.NOMECID,
    C.UF
FROM AD_TABELA_EXEMPLO C
WHERE /*inCollection*/ C.CODCID IN :P_CODCID /*inCollection*/
```

**Reatividade e ciclo de vida**
- Programar re-render quando filtros globais mudarem.
- Evitar dependência exclusiva de `DOMContentLoaded` em conteúdo injetado.
- Aplicar inicialização assíncrona para garantir elementos disponíveis.

```html
<script>
  function renderizarComponente(dados) {
    // Atualizar DOM, gráficos e KPIs com os dados recebidos
  }

  function iniciar() {
    const dadosIniciais = window.snkBIData || []; // placeholder, não API garantida
    renderizarComponente(dadosIniciais);
  }

  // Invocar no evento real de montagem/dados do container; atraso fixo não
  // garante DOM/dados prontos. Cancelar tarefas e listeners no descarte.
</script>
```

**Drill-down e eventos**
- Modelar níveis independentes (macro → micro) com argumentos explícitos.
- Evitar contêiner vazio em níveis subsequentes.
- Usar herança de contexto entre níveis para preservar filtros e navegação.
- Implementar ações de clique para atualizar detalhes e abrir telas nativas com chave de contexto.

**Navegação multi-nível (openLevel e contrato de contexto)**
- Definir constantes de nível em configuração (`NIVEL_RESUMO`, `NIVEL_DETALHE`, `NIVEL_ITEM`) para evitar acoplamento em string solta.
- Encapsular `openLevel` em funções dedicadas por rota de navegação (ex.: abrir detalhe por vendedor, abrir itens por parceiro).
- Repassar parâmetros de contexto entre níveis com contrato explícito (`ARG_*` para chaves e `P_*` para filtros/período).
- Validar disponibilidade de `openLevel` e parâmetros obrigatórios antes de navegar.
- Aplicar fallback de erro no console/UI quando o contexto não permitir abertura de nível.

```js
var cfg = window.DASH_CONFIG || {};
var NIVEL_DETALHE = cfg.NIVEL_DETALHE || "NIVEL_B";
var NIVEL_ITEM = cfg.NIVEL_ITEM || "NIVEL_C";

function abrirNivelDetalhe(codigoEntidade) {
  const codigo = Number(codigoEntidade);
  if (!Number.isSafeInteger(codigo) || codigo <= 0 || typeof openLevel !== "function") return;
  openLevel(NIVEL_DETALHE, {
    ARG_CODENT: codigo,
    P_PERIODO_INI: cfg.P_PERIODO_INI || "",
    P_PERIODO_FIN: cfg.P_PERIODO_FIN || "",
    P_CODMETA: cfg.P_CODMETA || ""
  });
}

function abrirNivelItem(codigoEntidadeFilha) {
  const codigo = Number(codigoEntidadeFilha);
  if (!Number.isSafeInteger(codigo) || codigo <= 0 || typeof openLevel !== "function") return;
  openLevel(NIVEL_ITEM, {
    ARG_CODENT_FILHA: codigo,
    P_PERIODO_INI: cfg.P_PERIODO_INI || "",
    P_PERIODO_FIN: cfg.P_PERIODO_FIN || "",
    P_CODMETA: cfg.P_CODMETA || ""
  });
}
```

**Segurança e bloqueio de acesso por escopo**
- Restringir qualquer consulta de nível pela relação usuário-meta/escopo antes de agregar dados.
- Centralizar o predicado de segurança em função de montagem de `WHERE` para reaproveitamento em KPIs, grids e gráficos.
- Preferir variáveis de sessão (`CODUSU_LOG` ou função equivalente de usuário logado) para evitar spoof de parâmetro de usuário.
- Bloquear carga quando parâmetros críticos estiverem ausentes (ex.: período, meta, entidade de drill-down).

> Os nomes de tabelas e campos abaixo são representativos e podem variar conforme a implementação da instância.

```sql
SELECT
    M.CODMETA,
    M.CODENTIDADE,
    SUM(M.VLRPREV) AS VLR_PREV,
    SUM(M.VLRREAL) AS VLR_REAL
FROM AD_DADOS_META M
WHERE M.CODMETA = :P_CODMETA
  AND M.DTREF BETWEEN TO_DATE(:P_PERIODO_INI, 'DD/MM/YYYY')
                  AND TO_DATE(:P_PERIODO_FIN, 'DD/MM/YYYY')
  AND EXISTS (
      SELECT 1
      FROM AD_META_USUARIO_LIB L
      WHERE L.CODMETA = M.CODMETA
        AND L.CODUSU = STP_GET_CODUSULOGADO
  )
GROUP BY M.CODMETA, M.CODENTIDADE
```

**Grid hierárquica com expansão/colapso**
- Estruturar mapa `filhosPorPai` e estado `nosExpandidos` para renderização incremental da árvore.
- Inicializar nós não analíticos de níveis superiores como expandidos para melhorar leitura inicial.
- Em nós colapsados, exibir agregados de descendentes analíticos para manter contexto sem abrir toda árvore.
- Fornecer ações rápidas de “Expandir tudo” e “Recolher tudo” no cabeçalho.
- Em filtros de texto, incluir ancestrais dos nós encontrados para preservar rastreabilidade hierárquica.

```js
var filhosPorPai = Object.create(null);
var nosExpandidos = Object.create(null);

function alternarNo(codNo) {
  var id = String(codNo);
  nosExpandidos[id] = !nosExpandidos[id];
  renderizarGrid();
}

function obterVisiveis(raiz) {
  var lista = [];
  var vistos = new Set(); // também impor tamanho/profundidade máximos na fonte
  function visitar(pai) {
    if (vistos.has(pai)) return;
    vistos.add(pai);
    (filhosPorPai[pai] || []).forEach(function (no) {
      lista.push(no);
      if (nosExpandidos[String(no.CODNO)]) visitar(String(no.CODNO));
    });
  }
  visitar(String(raiz || ""));
  return lista;
}
```

Ao alternar produto/aba, use cancelamento ou token de geração para rejeitar respostas antigas; marcar abaCarregada só após sucesso, limpar flags de carregamento em finally e permitir retry. O exemplo inicial de estado não implementa esses controles.

**Resiliência de carregamento**
- Separar a carga principal da carga complementar (ex.: realizado mensal) e não bloquear a visualização principal por falha secundária.
- Tratar ausência de dados por componente (`vazio`) sem derrubar o layout inteiro.
- Destruir instâncias de gráfico antes de recriar para evitar vazamento e sobreposição visual.
- Carregar painéis secundários somente ao abrir aba/visão correspondente (on-demand).

**Navegação intra-nível (single JSP)**
- Tratar o JSP único como shell de navegação: tabela principal + modal de detalhe + abas internas + modais auxiliares.
- Encadear cliques sem trocar de nível Sankhya: KPI → lista modal, gráfico → filtro de tabela, linha da tabela → detalhe.
- Aplicar atalhos de ação no detalhe para abrir cadastro nativo no contexto da chave primária.
- Modal precisa de nome acessível, foco/retorno de foco, teclado/Escape e proteção de alterações não salvas; overlay é opção adicional.

```js
function abrirTelaNativa(resourceIdBase64, pkObj) {
  // Esboço apenas: validar resourceId por allowlist; usar codificação UTF-8
  // e contrato oficial de navegação. btoa direto falha com texto Unicode.
  var pk = encodeApprovedPrimaryKey(pkObj); // adapter real não fornecido
  // Não mudar top.location sem autorização do container/usuário.
  navigateApprovedResource(resourceIdBase64, pk); // adapter real não fornecido
}

function onKpiClick(lista) {
  abrirModalLista("Itens selecionados", "Navegação por atalho", lista);
}

function onGraficoClick(grupo) {
  filtrarTabelaPorGrupo(grupo);
}
```

**Feedback operacional de interface**
- Exibir estados explícitos de carregamento, vazio e erro em cada painel.
- Em ações de atualização, desabilitar botão de confirmação até o retorno do `executeQuery`.
- Após sucesso, recarregar dados e restaurar contexto anterior (produto e aba ativa).

**Variáveis internas de segurança**
- Aproveitar variáveis de sessão para segurança em nível de linha (`CODUSU_LOG`, `CODGRU_LOG`, `CODVEN_LOG`).
- Restringir dados por contexto do usuário antes de montar visualizações.

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.
