# Padrões Históricos de Tempo por Tipo de Tarefa

Baseado em execuções reais do ecossistema.

## Criação de Skills

| Tarefa | Tempo Real | Observações |
|--------|-----------|-------------|
| Skill simples (só SKILL.md, sem scripts) | 5-10 min | ~200-400 linhas |
| Skill moderada (SKILL.md + 1-2 scripts) | 15-25 min | Ex: telegram, whatsapp |
| Skill complexa (múltiplos scripts + refs) | 30-60 min | Ex: instagram (29 arquivos) |
| Evolução de skill (v1→v2) | 20-40 min | Reescrever seções inteiras |
| Ecossistema de skills relacionadas (5-6) | 2-4h | Ex: leiloeiro-ia + 5 módulos |

## Instalação e Infraestrutura

| Tarefa | Tempo Real | Observações |
|--------|-----------|-------------|
| skill-installer (1 skill) | 1-3 min | Inclui 10 validações |
| Gerar ZIP de 1 skill | 30s | Sem compressão máxima |
| Gerar ecosystem-completo.zip (31 skills) | 1-2 min | 342 arquivos, ~1 MB |
| Auditoria do ecossistema completo | 10-20 min | scan + validate + fix |
| Atualizar registry manualmente | 2-5 min | Quando scan_registry tem bugs |

## APIs e Integrações

| Tarefa | Tempo Real | Observações |
|--------|-----------|-------------|
| Setup inicial de API (auth + teste) | 10-20 min | Com API key válida |
| Implementar webhook com HMAC | 15-25 min | Incluindo testes |
| OAuth flow completo | 30-60 min | Depende da plataforma |
| Debug de API (token expirado, 403) | 5-30 min | Alta variância |

## Agentes de IA (Personas)

| Tarefa | Tempo Real | Observações |
|--------|-----------|-------------|
| Criar persona v1 (500-700 linhas) | 15-25 min | Com subagente |
| Evoluir persona para v2 (1200+ linhas) | 20-35 min | Expansão de 80-180% |
| Criar 6 personas em paralelo (v1) | 25-45 min total | Subagentes paralelos |
| Evoluir 5 personas em paralelo (v2) | 30-60 min total | Alta qualidade |

## Análise e Pesquisa

| Tarefa | Tempo Real | Observações |
|--------|-----------|-------------|
| Análise de código (1 arquivo) | 2-5 min | |
| Auditoria de segurança completa | 15-30 min | Com 007 |
| Pesquisa web (5-10 fontes) | 5-10 min | Com subagente Explore |
| Debug de bug complexo | 15-45 min | Alta variância |

## Multiplicadores de Tempo

| Fator | Multiplicador |
|-------|--------------|
| API de terceiro instável | ×1.5 a ×2.0 |
| Dependências não documentadas | ×1.3 a ×1.8 |
| Ambiente Windows vs Linux path issues | ×1.2 |
| Subagentes em paralelo (4+) | ÷2 a ÷3 |
| Primeira vez no domínio | ×1.5 a ×2.5 |
| Task já feita antes (memória ativa) | ×0.5 a ×0.7 |
