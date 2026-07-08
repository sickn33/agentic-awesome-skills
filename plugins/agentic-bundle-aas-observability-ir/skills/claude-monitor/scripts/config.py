"""
Configurações e thresholds para o Claude Monitor.
"""

# Thresholds de alerta
THRESHOLDS = {
    "cpu": {
        "ok": 60,
        "warning": 85,
        # acima de warning = critical
    },
    "ram_percent": {
        "ok": 70,
        "warning": 85,
    },
    "browsers_ram_gb": {
        "ok": 3.0,
        "warning": 6.0,
    },
    "browsers_processes": {
        "ok": 30,
        "warning": 60,
    },
    "disk_free_percent": {
        "critical_below": 10,
        "warning_below": 15,
    },
    "network_latency_ms": {
        "ok": 200,
        "warning": 500,
    },
}

# Nomes de processos de browser conhecidos
BROWSER_NAMES = ["chrome", "msedge", "firefox", "brave", "opera", "vivaldi"]

# Nomes de processos do Claude Code
CLAUDE_NAMES = ["claude"]

# Endpoint para teste de latência
API_ENDPOINT = "api.anthropic.com"

# Monitor defaults
MONITOR_DEFAULTS = {
    "interval": 30,
    "duration": 300,
    "alert_cpu": 80,
    "alert_ram": 85,
}


def classify(value, metric_name):
    """Classifica um valor como 'ok', 'warning' ou 'critical'."""
    t = THRESHOLDS.get(metric_name, {})

    # Métricas onde "abaixo" é ruim (disco livre)
    if "critical_below" in t:
        if value < t["critical_below"]:
            return "critical"
        elif value < t["warning_below"]:
            return "warning"
        return "ok"

    # Métricas onde "acima" é ruim (CPU, RAM, latência)
    if value <= t.get("ok", 999999):
        return "ok"
    elif value <= t.get("warning", 999999):
        return "warning"
    return "critical"
