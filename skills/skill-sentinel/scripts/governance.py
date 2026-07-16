"""
Auto-governanca do Sentinel.

Registra todas as acoes do sentinel em audit log proprio.
Padrao leve — sem rate limiting (operacoes locais apenas).
"""
from __future__ import annotations

import json
from datetime import datetime, timezone
from typing import Any, Dict, Optional

from db import Database


class SentinelGovernance:
    """Registra acoes do sentinel para auditabilidade."""

    def __init__(self, db: Optional[Database] = None):
        self.db = db or Database()
        self.db.init()

    def log_action(self, action: str, params: Optional[Dict] = None, result: Optional[Dict] = None) -> None:
        """Registra uma acao no audit log."""
        self.db.log_action(action, params, result)

    def log_audit_start(self, skills: list) -> None:
        self.log_action("audit_start", {"skills": skills})

    def log_audit_complete(self, run_id: int, score: float, findings_count: int) -> None:
        self.log_action("audit_complete", {
            "run_id": run_id,
            "overall_score": score,
            "findings_count": findings_count,
        })

    def log_recommendation(self, suggested_name: str, priority: str) -> None:
        self.log_action("recommendation", {
            "suggested_name": suggested_name,
            "priority": priority,
        })

    def get_recent_actions(self, limit: int = 20) -> list:
        return self.db.get_recent_actions(limit)


# -- CLI -----------------------------------------------------------------------
if __name__ == "__main__":
    gov = SentinelGovernance()
    actions = gov.get_recent_actions(10)
    if not actions:
        print("Nenhuma acao registrada.")
    else:
        print("Ultimas acoes do Sentinel:")
        for a in actions:
            print(f"  [{a['created_at']}] {a['action']}")
            if a.get("params"):
                print(f"    Params: {a['params']}")
