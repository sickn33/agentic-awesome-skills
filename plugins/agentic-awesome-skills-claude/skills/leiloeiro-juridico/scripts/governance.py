"""
Modulo de governanca para leiloeiro-ia.

Implementa action_log, rate_limit, confirmation_request e warning_threshold
para skills baseadas em conhecimento (knowledge-only).
"""
from __future__ import annotations

import json
import os
from datetime import datetime
from pathlib import Path

# Diretorio de dados
DATA_DIR = Path(__file__).parent.parent / "data"
DATA_DIR.mkdir(exist_ok=True)

LOG_FILE = DATA_DIR / "action_log.jsonl"
RATE_LIMIT_WINDOW = 60  # segundos
RATE_LIMIT_MAX = 30  # max acoes por janela
WARNING_THRESHOLD = 0.8  # 80% do limite


def log_action(action: str, details: dict | None = None) -> dict:
    """Registra acao no action_log para auditoria."""
    entry = {
        "timestamp": datetime.utcnow().isoformat(),
        "action": action,
        "details": details or {},
    }
    with open(LOG_FILE, "a", encoding="utf-8") as f:
        f.write(json.dumps(entry, ensure_ascii=False) + "\n")
    return entry


def check_rate(action: str = "query") -> bool:
    """Verifica rate_limit — retorna True se dentro do limite."""
    if not LOG_FILE.exists():
        return True
    now = datetime.utcnow()
    count = 0
    with open(LOG_FILE, "r", encoding="utf-8") as f:
        for line in f:
            try:
                entry = json.loads(line)
                ts = datetime.fromisoformat(entry["timestamp"])
                if (now - ts).total_seconds() <= RATE_LIMIT_WINDOW:
                    count += 1
            except (json.JSONDecodeError, KeyError, ValueError):
                continue
    if count >= RATE_LIMIT_MAX:
        raise RateLimitExceeded(f"Rate limit excedido: {count}/{RATE_LIMIT_MAX} em {RATE_LIMIT_WINDOW}s")
    return True


def requires_confirmation(action: str, risk_level: str = "alto") -> dict:
    """Gera confirmation_request para acoes de alto risco."""
    return {
        "type": "confirmation_request",
        "action": action,
        "risk_level": risk_level,
        "message": f"Acao '{action}' requer confirmacao do usuario (risco: {risk_level})",
        "confirmed": False,
    }


def check_warning_threshold(current_value: float, threshold: float = WARNING_THRESHOLD) -> list:
    """Verifica warning_threshold e retorna warnings se ultrapassado."""
    warnings = []
    if current_value >= threshold:
        warnings.append({
            "type": "RATE_LIMIT_WARNING",
            "message": f"warning_threshold atingido: {current_value:.0%} do limite",
            "threshold": threshold,
            "current": current_value,
        })
    return warnings


def get_recent_actions(limit: int = 20) -> list:
    """Retorna acoes recentes do audit_log."""
    if not LOG_FILE.exists():
        return []
    actions = []
    with open(LOG_FILE, "r", encoding="utf-8") as f:
        for line in f:
            try:
                actions.append(json.loads(line))
            except json.JSONDecodeError:
                continue
    return actions[-limit:]


class RateLimitExceeded(Exception):
    """Excecao quando rate limit e excedido."""
    pass


if __name__ == "__main__":
    import sys
    recent = get_recent_actions(20)
    if recent:
        for a in recent:
            print(f"[{a['timestamp']}] {a['action']}: {a.get('details', {})}")
    else:
        print("Nenhuma acao registrada.")
