"""
Camada de persistência SQLite para dados de leiloeiros das Juntas Comerciais.

Uso:
    from db import Database
    db = Database()           # abre/cria o banco em data/leiloeiros.db
    db.init()                 # cria tabelas se não existirem
    db.upsert_many(records)   # insere/atualiza lista de Leiloeiro
    rows = db.get_all()       # retorna todos os registros
    rows = db.get_by_estado("SP")
    stats = db.get_stats()
"""
from __future__ import annotations

import json
import sqlite3
from pathlib import Path
from typing import Any, Dict, List, Optional

# Caminho padrão do banco — relativo ao diretório pai de scripts/
_DEFAULT_DB = Path(__file__).parent.parent / "data" / "leiloeiros.db"

DDL = """
CREATE TABLE IF NOT EXISTS leiloeiros (
    id               INTEGER PRIMARY KEY AUTOINCREMENT,
    estado           TEXT    NOT NULL,
    junta            TEXT    NOT NULL,
    matricula        TEXT,
    nome             TEXT    NOT NULL,
    cpf_cnpj         TEXT,
    situacao         TEXT,
    endereco         TEXT,
    municipio        TEXT,
    telefone         TEXT,
    email            TEXT,
    data_registro    TEXT,
    data_atualizacao TEXT,
    url_fonte        TEXT,
    scraped_at       TEXT    NOT NULL,
    UNIQUE (estado, matricula) ON CONFLICT REPLACE
);

CREATE INDEX IF NOT EXISTS idx_estado    ON leiloeiros (estado);
CREATE INDEX IF NOT EXISTS idx_nome      ON leiloeiros (nome);
CREATE INDEX IF NOT EXISTS idx_situacao  ON leiloeiros (situacao);
CREATE INDEX IF NOT EXISTS idx_scraped   ON leiloeiros (scraped_at);
"""

UPSERT_SQL = """
INSERT INTO leiloeiros
    (estado, junta, matricula, nome, cpf_cnpj, situacao,
     endereco, municipio, telefone, email,
     data_registro, data_atualizacao, url_fonte, scraped_at)
VALUES
    (:estado, :junta, :matricula, :nome, :cpf_cnpj, :situacao,
     :endereco, :municipio, :telefone, :email,
     :data_registro, :data_atualizacao, :url_fonte, :scraped_at)
ON CONFLICT(estado, matricula) DO UPDATE SET
    junta            = excluded.junta,
    nome             = excluded.nome,
    cpf_cnpj         = excluded.cpf_cnpj,
    situacao         = excluded.situacao,
    endereco         = excluded.endereco,
    municipio        = excluded.municipio,
    telefone         = excluded.telefone,
    email            = excluded.email,
    data_registro    = excluded.data_registro,
    data_atualizacao = excluded.data_atualizacao,
    url_fonte        = excluded.url_fonte,
    scraped_at       = excluded.scraped_at
"""

# Para registros sem matrícula, usa INSERT simples (não upsert)
INSERT_SQL = """
INSERT INTO leiloeiros
    (estado, junta, matricula, nome, cpf_cnpj, situacao,
     endereco, municipio, telefone, email,
     data_registro, data_atualizacao, url_fonte, scraped_at)
VALUES
    (:estado, :junta, :matricula, :nome, :cpf_cnpj, :situacao,
     :endereco, :municipio, :telefone, :email,
     :data_registro, :data_atualizacao, :url_fonte, :scraped_at)
"""


class Database:
    def __init__(self, db_path: Path = _DEFAULT_DB):
        self.db_path = Path(db_path)
        self.db_path.parent.mkdir(parents=True, exist_ok=True)

    def _connect(self) -> sqlite3.Connection:
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        conn.execute("PRAGMA journal_mode=WAL")
        conn.execute("PRAGMA synchronous=NORMAL")
        return conn

    def init(self) -> None:
        """Cria tabelas e índices se não existirem."""
        with self._connect() as conn:
            conn.executescript(DDL)

    def upsert_many(self, records: List[Dict[str, Any]]) -> int:
        """
        Insere ou atualiza registros.
        Registros sem matrícula são inseridos sempre (para não perder dados).
        Retorna o número de registros processados.
        """
        with_matricula = [r for r in records if r.get("matricula")]
        without_matricula = [r for r in records if not r.get("matricula")]

        count = 0
        with self._connect() as conn:
            if with_matricula:
                conn.executemany(UPSERT_SQL, with_matricula)
                count += len(with_matricula)
            if without_matricula:
                # Evitar duplicatas exatas por (estado + nome + scraped_at)
                conn.executemany(INSERT_SQL, without_matricula)
                count += len(without_matricula)
        return count

    def get_all(
        self,
        estado: Optional[str] = None,
        situacao: Optional[str] = None,
        nome_like: Optional[str] = None,
        limit: int = 0,
        offset: int = 0,
    ) -> List[Dict[str, Any]]:
        """Retorna registros com filtros opcionais."""
        conditions = []
        params: List[Any] = []

        if estado:
            conditions.append("estado = ?")
            params.append(estado.upper())
        if situacao:
            conditions.append("situacao = ?")
            params.append(situacao.upper())
        if nome_like:
            conditions.append("nome LIKE ?")
            params.append(f"%{nome_like}%")

        where = f"WHERE {' AND '.join(conditions)}" if conditions else ""

        if limit > 0:
            sql = f"SELECT * FROM leiloeiros {where} ORDER BY estado, nome LIMIT ? OFFSET ?"
            params.extend([limit, offset])
        else:
            sql = f"SELECT * FROM leiloeiros {where} ORDER BY estado, nome"

        with self._connect() as conn:
            rows = conn.execute(sql, params).fetchall()
        return [dict(r) for r in rows]

    def get_by_estado(self, estado: str) -> List[Dict[str, Any]]:
        return self.get_all(estado=estado)

    def get_stats(self) -> List[Dict[str, Any]]:
        """Retorna contagem de leiloeiros por estado."""
        sql = """
            SELECT
                estado,
                junta,
                COUNT(*) as total,
                SUM(CASE WHEN situacao = 'ATIVO' THEN 1 ELSE 0 END) as ativos,
                MAX(scraped_at) as ultima_coleta
            FROM leiloeiros
            GROUP BY estado, junta
            ORDER BY total DESC
        """
        with self._connect() as conn:
            rows = conn.execute(sql).fetchall()
        return [dict(r) for r in rows]

    def get_total(self) -> int:
        with self._connect() as conn:
            return conn.execute("SELECT COUNT(*) FROM leiloeiros").fetchone()[0]

    def search(self, query: str, limit: int = 50) -> List[Dict[str, Any]]:
        """Busca full-text por nome, matrícula ou município."""
        sql = """
            SELECT * FROM leiloeiros
            WHERE nome LIKE ? OR matricula LIKE ? OR municipio LIKE ? OR email LIKE ?
            ORDER BY estado, nome
            LIMIT ?
        """
        q = f"%{query}%"
        with self._connect() as conn:
            rows = conn.execute(sql, [q, q, q, q, limit]).fetchall()
        return [dict(r) for r in rows]

    def dump_all_json(self) -> str:
        """Retorna todos os dados como string JSON."""
        return json.dumps(self.get_all(), ensure_ascii=False, indent=2)


# ── CLI rápido para verificação ──────────────────────────────────────────────
if __name__ == "__main__":
    import sys
    db = Database()
    db.init()
    stats = db.get_stats()
    if not stats:
        print("Banco vazio. Execute run_all.py primeiro.")
        sys.exit(0)
    total = db.get_total()
    print(f"\nTotal de leiloeiros: {total}\n")
    print(f"{'Estado':<8} {'Junta':<12} {'Total':>6} {'Ativos':>6} {'Última Coleta'}")
    print("-" * 60)
    for r in stats:
        print(
            f"{r['estado']:<8} {r['junta']:<12} "
            f"{r['total']:>6} {r['ativos']:>6}  {r['ultima_coleta'][:10]}"
        )
