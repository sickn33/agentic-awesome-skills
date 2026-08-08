# Template para Novas Skills

Use este template ao criar skills recomendadas pelo Sentinel.

## Estrutura de Diretorio

```
nome-da-skill/
├── SKILL.md                    # Metadata + documentacao
├── scripts/
│   ├── requirements.txt        # Dependencias Python
│   ├── config.py               # Paths, constantes, thresholds
│   ├── db.py                   # SQLite persistence (WAL mode)
│   ├── governance.py           # Rate limits, audit log, confirmacoes
│   └── [feature_modules].py    # Modulos de funcionalidade
├── references/
│   ├── api-reference.md        # Documentacao de APIs
│   ├── schema.md               # Schema do banco de dados
│   └── [domain].md             # Docs especificos do dominio
└── data/
    ├── nome-da-skill.db        # SQLite (WAL mode)
    └── exports/                # Arquivos exportados
```

## Template SKILL.md

```yaml
---
name: nome-da-skill
description: >-
  Descricao completa com trigger keywords em PT-BR e EN.
  Use quando o usuario mencionar: keyword1, keyword2, keyword3.
  Triggers: trigger1, trigger2, trigger3.
version: 1.0.0
---

# Skill: Nome da Skill

Descricao breve do que a skill faz.

## Resumo Rapido

| Area | Script | O que faz |
|------|--------|-----------|
| Core | config.py | Configuracao central |
| Core | db.py | Persistencia SQLite |
| Core | governance.py | Governanca |
| Feature | feature.py | Funcionalidade principal |

## Localizacao

[arvore de diretorios]

## Instalacao

[comando pip install]

## Comandos Principais

[exemplos de uso CLI]

## Governanca

[descricao de rate limits, audit log, confirmacoes]

## Referencias

[links para docs em references/]
```

## Template config.py

```python
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parent.parent
SCRIPTS_DIR = ROOT_DIR / "scripts"
DATA_DIR = ROOT_DIR / "data"
DB_PATH = DATA_DIR / "nome-da-skill.db"

DATA_DIR.mkdir(parents=True, exist_ok=True)
```

## Template db.py

```python
import sqlite3
from config import DB_PATH

class Database:
    def __init__(self, db_path=DB_PATH):
        self.db_path = db_path

    def _connect(self):
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        conn.execute("PRAGMA journal_mode=WAL")
        conn.execute("PRAGMA synchronous=NORMAL")
        conn.execute("PRAGMA foreign_keys=ON")
        return conn

    def init(self):
        with self._connect() as conn:
            conn.executescript(DDL)
```

## Checklist de Qualidade

- [ ] SKILL.md com frontmatter (name, description, version)
- [ ] Description com triggers bilingues (PT-BR + EN)
- [ ] requirements.txt com versoes pinadas
- [ ] config.py com paths padrao
- [ ] db.py com WAL mode e row_factory
- [ ] governance.py com action log
- [ ] Pelo menos 1 reference doc
- [ ] Sem secrets hardcoded
- [ ] Queries SQL parametrizadas
- [ ] Error handling especifico (sem bare except)
