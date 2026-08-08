"""
Camada de persistencia SQLite para a skill Sentinel.

Armazena auditorias, findings, snapshots de skills, recomendacoes
e historico de scores para analise de tendencias.

Uso:
    from db import Database
    db = Database()
    db.init()
    run_id = db.create_audit_run()
    db.insert_skill_snapshot(run_id, {...})
    db.insert_finding(run_id, {...})
"""
from __future__ import annotations

import json
import sqlite3
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional

from config import DB_PATH

DDL = """
-- Execucoes de auditoria
CREATE TABLE IF NOT EXISTS audit_runs (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    started_at      TEXT    NOT NULL,
    completed_at    TEXT,
    skills_scanned  INTEGER DEFAULT 0,
    total_findings  INTEGER DEFAULT 0,
    overall_score   REAL,
    report_path     TEXT,
    status          TEXT    DEFAULT 'running'
);

-- Snapshot de cada skill por auditoria
CREATE TABLE IF NOT EXISTS skill_snapshots (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    audit_run_id    INTEGER REFERENCES audit_runs(id),
    skill_name      TEXT    NOT NULL,
    skill_path      TEXT    NOT NULL,
    version         TEXT,
    file_count      INTEGER,
    line_count      INTEGER,
    overall_score   REAL,
    code_quality    REAL,
    security        REAL,
    performance     REAL,
    governance      REAL,
    documentation   REAL,
    dependencies    REAL,
    raw_metrics     TEXT,
    created_at      TEXT    DEFAULT (datetime('now'))
);

-- Findings individuais (problemas e recomendacoes)
CREATE TABLE IF NOT EXISTS findings (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    audit_run_id    INTEGER REFERENCES audit_runs(id),
    skill_name      TEXT    NOT NULL,
    dimension       TEXT    NOT NULL,
    severity        TEXT    NOT NULL,
    category        TEXT,
    title           TEXT    NOT NULL,
    description     TEXT,
    file_path       TEXT,
    line_number     INTEGER,
    recommendation  TEXT,
    effort          TEXT,
    impact          TEXT,
    created_at      TEXT    DEFAULT (datetime('now'))
);

-- Recomendacoes de novas skills
CREATE TABLE IF NOT EXISTS skill_recommendations (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    audit_run_id    INTEGER REFERENCES audit_runs(id),
    suggested_name  TEXT    NOT NULL,
    rationale       TEXT,
    capabilities    TEXT,
    priority        TEXT,
    skill_md_draft  TEXT,
    created_at      TEXT    DEFAULT (datetime('now'))
);

-- Historico de scores para tendencias
CREATE TABLE IF NOT EXISTS score_history (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    audit_run_id    INTEGER REFERENCES audit_runs(id),
    skill_name      TEXT    NOT NULL,
    dimension       TEXT    NOT NULL,
    score           REAL,
    recorded_at     TEXT    DEFAULT (datetime('now'))
);

-- Action log (auto-governanca do sentinel)
CREATE TABLE IF NOT EXISTS action_log (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    action          TEXT    NOT NULL,
    params          TEXT,
    result          TEXT,
    created_at      TEXT    DEFAULT (datetime('now'))
);

-- Indices
CREATE INDEX IF NOT EXISTS idx_snapshots_run     ON skill_snapshots (audit_run_id);
CREATE INDEX IF NOT EXISTS idx_snapshots_skill   ON skill_snapshots (skill_name);
CREATE INDEX IF NOT EXISTS idx_findings_run      ON findings (audit_run_id);
CREATE INDEX IF NOT EXISTS idx_findings_skill    ON findings (skill_name);
CREATE INDEX IF NOT EXISTS idx_findings_severity ON findings (severity);
CREATE INDEX IF NOT EXISTS idx_findings_dim      ON findings (dimension);
CREATE INDEX IF NOT EXISTS idx_history_skill     ON score_history (skill_name);
CREATE INDEX IF NOT EXISTS idx_history_time      ON score_history (recorded_at);
CREATE INDEX IF NOT EXISTS idx_action_log_time   ON action_log (created_at);
"""

_SKILL_SNAPSHOT_COLUMNS = frozenset({
    "audit_run_id", "skill_name", "skill_path", "version", "file_count",
    "line_count", "overall_score", "code_quality", "security", "performance",
    "governance", "documentation", "dependencies", "raw_metrics", "created_at",
})
_FINDING_COLUMNS = frozenset({
    "audit_run_id", "skill_name", "dimension", "severity", "category", "title",
    "description", "file_path", "line_number", "recommendation", "effort",
    "impact", "created_at",
})
_RECOMMENDATION_COLUMNS = frozenset({
    "audit_run_id", "suggested_name", "rationale", "capabilities", "priority",
    "skill_md_draft", "created_at",
})
_SKILL_SNAPSHOT_INSERT_COLUMNS = (
    "audit_run_id", "skill_name", "skill_path", "version", "file_count",
    "line_count", "overall_score", "code_quality", "security", "performance",
    "governance", "documentation", "dependencies", "raw_metrics",
)
_FINDING_INSERT_COLUMNS = (
    "audit_run_id", "skill_name", "dimension", "severity", "category", "title",
    "description", "file_path", "line_number", "recommendation", "effort",
    "impact",
)
_RECOMMENDATION_INSERT_COLUMNS = (
    "audit_run_id", "suggested_name", "rationale", "capabilities", "priority",
    "skill_md_draft",
)
_INSERT_SKILL_SNAPSHOT_SQL = """
INSERT INTO skill_snapshots (
    audit_run_id, skill_name, skill_path, version, file_count, line_count,
    overall_score, code_quality, security, performance, governance,
    documentation, dependencies, raw_metrics
) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
"""
_INSERT_FINDING_SQL = """
INSERT INTO findings (
    audit_run_id, skill_name, dimension, severity, category, title,
    description, file_path, line_number, recommendation, effort, impact
) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
"""
_INSERT_RECOMMENDATION_SQL = """
INSERT INTO skill_recommendations (
    audit_run_id, suggested_name, rationale, capabilities, priority, skill_md_draft
) VALUES (?, ?, ?, ?, ?, ?)
"""


def _quote_identifier(name: str, allowed: frozenset[str]) -> str:
    if name not in allowed:
        raise ValueError(f"Invalid column name: {name}")
    return '"' + name.replace('"', '""') + '"'


def _filter_allowed_columns(data: Dict[str, Any], allowed: frozenset[str]) -> Dict[str, Any]:
    filtered = {k: v for k, v in data.items() if k in allowed}
    if not filtered:
        raise ValueError("No valid columns provided")
    return filtered


class Database:
    def __init__(self, db_path: Path = DB_PATH):
        self.db_path = Path(db_path)
        self.db_path.parent.mkdir(parents=True, exist_ok=True)

    def _connect(self) -> sqlite3.Connection:
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        conn.execute("PRAGMA journal_mode=WAL")
        conn.execute("PRAGMA synchronous=NORMAL")
        conn.execute("PRAGMA foreign_keys=ON")
        return conn

    def init(self) -> None:
        """Cria tabelas e indices se nao existirem."""
        with self._connect() as conn:
            conn.executescript(DDL)

    # -- Audit Runs ------------------------------------------------------------

    def create_audit_run(self) -> int:
        """Cria uma nova execucao de auditoria. Retorna o id."""
        now = datetime.now(timezone.utc).isoformat()
        with self._connect() as conn:
            cursor = conn.execute(
                "INSERT INTO audit_runs (started_at) VALUES (?)", [now]
            )
            return cursor.lastrowid

    def complete_audit_run(
        self, run_id: int, skills_scanned: int, total_findings: int,
        overall_score: float, report_path: str
    ) -> None:
        """Marca uma auditoria como completa."""
        now = datetime.now(timezone.utc).isoformat()
        with self._connect() as conn:
            conn.execute(
                """UPDATE audit_runs SET
                    completed_at = ?, skills_scanned = ?, total_findings = ?,
                    overall_score = ?, report_path = ?, status = 'completed'
                WHERE id = ?""",
                [now, skills_scanned, total_findings, overall_score, report_path, run_id],
            )

    def get_audit_runs(self, limit: int = 10) -> List[Dict[str, Any]]:
        """Retorna ultimas auditorias."""
        with self._connect() as conn:
            rows = conn.execute(
                "SELECT * FROM audit_runs ORDER BY started_at DESC LIMIT ?", [limit]
            ).fetchall()
        return [dict(r) for r in rows]

    def get_latest_completed_run(self) -> Optional[Dict[str, Any]]:
        """Retorna a ultima auditoria completa."""
        with self._connect() as conn:
            row = conn.execute(
                "SELECT * FROM audit_runs WHERE status = 'completed' "
                "ORDER BY completed_at DESC LIMIT 1"
            ).fetchone()
        return dict(row) if row else None

    # -- Skill Snapshots -------------------------------------------------------

    def insert_skill_snapshot(self, run_id: int, data: Dict[str, Any]) -> int:
        """Insere snapshot de uma skill. Retorna o id."""
        data["audit_run_id"] = run_id
        if "raw_metrics" in data and isinstance(data["raw_metrics"], dict):
            data["raw_metrics"] = json.dumps(data["raw_metrics"], ensure_ascii=False)
        data = _filter_allowed_columns(data, _SKILL_SNAPSHOT_COLUMNS)
        values = [data.get(column) for column in _SKILL_SNAPSHOT_INSERT_COLUMNS]
        with self._connect() as conn:
            cursor = conn.execute(_INSERT_SKILL_SNAPSHOT_SQL, values)
            return cursor.lastrowid

    def get_snapshots_for_run(self, run_id: int) -> List[Dict[str, Any]]:
        with self._connect() as conn:
            rows = conn.execute(
                "SELECT * FROM skill_snapshots WHERE audit_run_id = ? ORDER BY skill_name",
                [run_id],
            ).fetchall()
        return [dict(r) for r in rows]

    def get_latest_snapshot(self, skill_name: str) -> Optional[Dict[str, Any]]:
        """Retorna o snapshot mais recente de uma skill."""
        with self._connect() as conn:
            row = conn.execute(
                "SELECT * FROM skill_snapshots WHERE skill_name = ? "
                "ORDER BY created_at DESC LIMIT 1",
                [skill_name],
            ).fetchone()
        return dict(row) if row else None

    # -- Findings --------------------------------------------------------------

    def insert_finding(self, run_id: int, data: Dict[str, Any]) -> int:
        """Insere um finding. Retorna o id."""
        data["audit_run_id"] = run_id
        data = _filter_allowed_columns(data, _FINDING_COLUMNS)
        values = [data.get(column) for column in _FINDING_INSERT_COLUMNS]
        with self._connect() as conn:
            cursor = conn.execute(_INSERT_FINDING_SQL, values)
            return cursor.lastrowid

    def insert_findings_batch(self, run_id: int, findings: List[Dict[str, Any]]) -> int:
        """Insere multiplos findings de uma vez."""
        count = 0
        for f in findings:
            self.insert_finding(run_id, f)
            count += 1
        return count

    def get_findings_for_run(
        self, run_id: int, skill_name: Optional[str] = None,
        severity: Optional[str] = None, dimension: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        conditions = ["audit_run_id = ?"]
        params: list = [run_id]
        if skill_name:
            conditions.append("skill_name = ?")
            params.append(skill_name)
        if severity:
            conditions.append("severity = ?")
            params.append(severity)
        if dimension:
            conditions.append("dimension = ?")
            params.append(dimension)
        where = " AND ".join(conditions)
        sql = f"SELECT * FROM findings WHERE {where} ORDER BY severity, dimension"
        with self._connect() as conn:
            rows = conn.execute(sql, params).fetchall()
        return [dict(r) for r in rows]

    def count_findings_by_severity(self, run_id: int) -> Dict[str, int]:
        """Conta findings por severidade."""
        with self._connect() as conn:
            rows = conn.execute(
                "SELECT severity, COUNT(*) as cnt FROM findings "
                "WHERE audit_run_id = ? GROUP BY severity",
                [run_id],
            ).fetchall()
        return {r["severity"]: r["cnt"] for r in rows}

    # -- Skill Recommendations -------------------------------------------------

    def insert_recommendation(self, run_id: int, data: Dict[str, Any]) -> int:
        data["audit_run_id"] = run_id
        if "capabilities" in data and isinstance(data["capabilities"], list):
            data["capabilities"] = json.dumps(data["capabilities"], ensure_ascii=False)
        data = _filter_allowed_columns(data, _RECOMMENDATION_COLUMNS)
        values = [data.get(column) for column in _RECOMMENDATION_INSERT_COLUMNS]
        with self._connect() as conn:
            cursor = conn.execute(_INSERT_RECOMMENDATION_SQL, values)
            return cursor.lastrowid

    def get_recommendations_for_run(self, run_id: int) -> List[Dict[str, Any]]:
        with self._connect() as conn:
            rows = conn.execute(
                "SELECT * FROM skill_recommendations WHERE audit_run_id = ? ORDER BY priority",
                [run_id],
            ).fetchall()
        return [dict(r) for r in rows]

    # -- Score History ---------------------------------------------------------

    def insert_score_history(self, run_id: int, skill_name: str, dimension: str, score: float) -> None:
        with self._connect() as conn:
            conn.execute(
                "INSERT INTO score_history (audit_run_id, skill_name, dimension, score) "
                "VALUES (?, ?, ?, ?)",
                [run_id, skill_name, dimension, score],
            )

    def get_score_trend(self, skill_name: str, dimension: str, limit: int = 10) -> List[Dict[str, Any]]:
        """Retorna historico de scores para uma skill/dimensao."""
        with self._connect() as conn:
            rows = conn.execute(
                "SELECT * FROM score_history WHERE skill_name = ? AND dimension = ? "
                "ORDER BY recorded_at DESC LIMIT ?",
                [skill_name, dimension, limit],
            ).fetchall()
        return [dict(r) for r in rows]

    # -- Action Log (Auto-Governanca) ------------------------------------------

    def log_action(self, action: str, params: Optional[Dict] = None, result: Optional[Dict] = None) -> None:
        with self._connect() as conn:
            conn.execute(
                "INSERT INTO action_log (action, params, result) VALUES (?, ?, ?)",
                [
                    action,
                    json.dumps(params, ensure_ascii=False) if params else None,
                    json.dumps(result, ensure_ascii=False) if result else None,
                ],
            )

    def get_recent_actions(self, limit: int = 20) -> List[Dict[str, Any]]:
        with self._connect() as conn:
            rows = conn.execute(
                "SELECT * FROM action_log ORDER BY created_at DESC LIMIT ?", [limit]
            ).fetchall()
        return [dict(r) for r in rows]

    # -- Stats -----------------------------------------------------------------

    def get_stats(self) -> Dict[str, Any]:
        """Retorna estatisticas gerais do sentinel."""
        with self._connect() as conn:
            total_runs = conn.execute("SELECT COUNT(*) FROM audit_runs").fetchone()[0]
            completed = conn.execute(
                "SELECT COUNT(*) FROM audit_runs WHERE status = 'completed'"
            ).fetchone()[0]
            total_findings = conn.execute("SELECT COUNT(*) FROM findings").fetchone()[0]
            total_recs = conn.execute("SELECT COUNT(*) FROM skill_recommendations").fetchone()[0]
        return {
            "audit_runs": {"total": total_runs, "completed": completed},
            "total_findings": total_findings,
            "total_recommendations": total_recs,
        }


# -- CLI rapido para verificacao -----------------------------------------------
if __name__ == "__main__":
    db = Database()
    db.init()
    stats = db.get_stats()
    print(json.dumps(stats, indent=2, ensure_ascii=False))
    print("\nUltimas auditorias:")
    for r in db.get_audit_runs(5):
        print(f"  [{r['started_at']}] {r['status']} - score: {r['overall_score']}")
