# Schema do Banco de Dados - Sentinel

Banco: `data/sentinel.db` (SQLite, WAL mode)

## Tabelas

### audit_runs
Cada execucao de auditoria.

| Coluna | Tipo | Descricao |
|--------|------|-----------|
| id | INTEGER PK | Auto-increment |
| started_at | TEXT | Timestamp ISO 8601 |
| completed_at | TEXT | Timestamp conclusao |
| skills_scanned | INTEGER | Quantidade de skills |
| total_findings | INTEGER | Total de findings |
| overall_score | REAL | Score medio do ecossistema |
| report_path | TEXT | Path do relatorio .md |
| status | TEXT | running / completed / failed |

### skill_snapshots
Estado de cada skill em cada auditoria.

| Coluna | Tipo | Descricao |
|--------|------|-----------|
| id | INTEGER PK | Auto-increment |
| audit_run_id | INTEGER FK | Ref audit_runs |
| skill_name | TEXT | Nome da skill |
| skill_path | TEXT | Path no filesystem |
| version | TEXT | Versao do SKILL.md |
| file_count | INTEGER | Arquivos Python |
| line_count | INTEGER | Total de linhas |
| overall_score | REAL | Score composto |
| code_quality | REAL | Score qualidade |
| security | REAL | Score seguranca |
| performance | REAL | Score performance |
| governance | REAL | Score governanca |
| documentation | REAL | Score documentacao |
| dependencies | REAL | Score dependencias |
| raw_metrics | TEXT | JSON com metricas detalhadas |

### findings
Problemas e recomendacoes individuais.

| Coluna | Tipo | Descricao |
|--------|------|-----------|
| id | INTEGER PK | Auto-increment |
| audit_run_id | INTEGER FK | Ref audit_runs |
| skill_name | TEXT | Skill afetada |
| dimension | TEXT | code_quality/security/etc |
| severity | TEXT | critical/high/medium/low/info |
| category | TEXT | Categoria especifica |
| title | TEXT | Titulo curto |
| description | TEXT | Descricao detalhada |
| file_path | TEXT | Arquivo afetado |
| line_number | INTEGER | Linha afetada |
| recommendation | TEXT | Sugestao de correcao |
| effort | TEXT | low/medium/high |
| impact | TEXT | low/medium/high |

### skill_recommendations
Sugestoes de novas skills.

| Coluna | Tipo | Descricao |
|--------|------|-----------|
| id | INTEGER PK | Auto-increment |
| audit_run_id | INTEGER FK | Ref audit_runs |
| suggested_name | TEXT | Nome sugerido |
| rationale | TEXT | Justificativa |
| capabilities | TEXT | JSON array de capacidades |
| priority | TEXT | critical/high/medium/low |
| skill_md_draft | TEXT | Rascunho de SKILL.md |

### score_history
Historico de scores para analise de tendencias.

| Coluna | Tipo | Descricao |
|--------|------|-----------|
| id | INTEGER PK | Auto-increment |
| audit_run_id | INTEGER FK | Ref audit_runs |
| skill_name | TEXT | Nome da skill |
| dimension | TEXT | Dimensao |
| score | REAL | Score registrado |
| recorded_at | TEXT | Timestamp |

### action_log
Auto-governanca do sentinel.

| Coluna | Tipo | Descricao |
|--------|------|-----------|
| id | INTEGER PK | Auto-increment |
| action | TEXT | Tipo de acao |
| params | TEXT | JSON com parametros |
| result | TEXT | JSON com resultado |
| created_at | TEXT | Timestamp |

## Indices

- `idx_snapshots_run` - skill_snapshots(audit_run_id)
- `idx_snapshots_skill` - skill_snapshots(skill_name)
- `idx_findings_run` - findings(audit_run_id)
- `idx_findings_skill` - findings(skill_name)
- `idx_findings_severity` - findings(severity)
- `idx_findings_dim` - findings(dimension)
- `idx_history_skill` - score_history(skill_name)
- `idx_history_time` - score_history(recorded_at)
- `idx_action_log_time` - action_log(created_at)
