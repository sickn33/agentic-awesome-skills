#!/usr/bin/env python3
"""
Claude Monitor — Monitor Contínuo de Performance

Coleta snapshots periódicos de CPU, RAM e browsers.
Gera relatório com tendências e alertas ao final.

Uso:
    python monitor.py                          # 5 min, amostras a cada 30s
    python monitor.py --interval 10 --duration 120  # 2 min, amostras a cada 10s
    python monitor.py --output meu_log.json    # Salvar em arquivo específico
"""

import json
import os
import signal
import subprocess
import sys
import time
from datetime import datetime
from pathlib import Path

try:
    import psutil
except ImportError:
    subprocess.check_call([sys.executable, "-m", "pip", "install", "psutil", "--quiet"])
    import psutil

sys.path.insert(0, str(Path(__file__).parent))
from config import BROWSER_NAMES, CLAUDE_NAMES, MONITOR_DEFAULTS


def take_snapshot():
    """Coleta um snapshot rápido do sistema."""
    cpu = psutil.cpu_percent(interval=0.5)
    ram = psutil.virtual_memory()

    # Browser totals
    browser_ram = 0
    browser_count = 0
    for proc in psutil.process_iter(["name", "memory_info"]):
        try:
            name = proc.info["name"].lower()
            for bname in BROWSER_NAMES:
                if bname in name:
                    browser_ram += proc.info["memory_info"].rss
                    browser_count += 1
                    break
        except (psutil.NoSuchProcess, psutil.AccessDenied):
            pass

    # Claude totals
    claude_ram = 0
    claude_count = 0
    for proc in psutil.process_iter(["name", "memory_info"]):
        try:
            name = proc.info["name"].lower()
            for cname in CLAUDE_NAMES:
                if cname in name:
                    claude_ram += proc.info["memory_info"].rss
                    claude_count += 1
                    break
        except (psutil.NoSuchProcess, psutil.AccessDenied):
            pass

    return {
        "timestamp": datetime.now().isoformat(),
        "cpu_percent": cpu,
        "ram_percent": ram.percent,
        "ram_used_gb": round(ram.used / 1024**3, 2),
        "ram_available_gb": round(ram.available / 1024**3, 2),
        "browser_ram_gb": round(browser_ram / 1024**3, 2),
        "browser_processes": browser_count,
        "claude_ram_gb": round(claude_ram / 1024**3, 2),
        "claude_processes": claude_count,
    }


def analyze_snapshots(snapshots, alert_cpu, alert_ram):
    """Analisa os snapshots coletados e gera relatório."""
    if not snapshots:
        return {"error": "Nenhum snapshot coletado"}

    n = len(snapshots)
    cpu_values = [s["cpu_percent"] for s in snapshots]
    ram_values = [s["ram_percent"] for s in snapshots]
    browser_ram_values = [s["browser_ram_gb"] for s in snapshots]

    # Alertas
    alerts = []
    for s in snapshots:
        if s["cpu_percent"] >= alert_cpu:
            alerts.append({
                "time": s["timestamp"],
                "type": "cpu",
                "value": s["cpu_percent"],
                "threshold": alert_cpu,
            })
        if s["ram_percent"] >= alert_ram:
            alerts.append({
                "time": s["timestamp"],
                "type": "ram",
                "value": s["ram_percent"],
                "threshold": alert_ram,
            })

    # Tendência (compara primeira metade com segunda metade)
    mid = n // 2
    if mid > 0:
        cpu_first = sum(cpu_values[:mid]) / mid
        cpu_second = sum(cpu_values[mid:]) / (n - mid)
        ram_first = sum(ram_values[:mid]) / mid
        ram_second = sum(ram_values[mid:]) / (n - mid)

        cpu_diff = cpu_second - cpu_first
        ram_diff = ram_second - ram_first

        if abs(cpu_diff) < 5 and abs(ram_diff) < 3:
            trend = "estavel"
        elif cpu_diff > 5 or ram_diff > 3:
            trend = "piorando"
        else:
            trend = "melhorando"
    else:
        trend = "insuficiente"
        cpu_diff = 0
        ram_diff = 0

    # Resumo
    report = {
        "samples": n,
        "duration_seconds": round(
            (datetime.fromisoformat(snapshots[-1]["timestamp"]) -
             datetime.fromisoformat(snapshots[0]["timestamp"])).total_seconds(), 0
        ) if n > 1 else 0,
        "cpu": {
            "avg": round(sum(cpu_values) / n, 1),
            "max": round(max(cpu_values), 1),
            "min": round(min(cpu_values), 1),
        },
        "ram": {
            "avg_percent": round(sum(ram_values) / n, 1),
            "max_percent": round(max(ram_values), 1),
            "avg_used_gb": round(sum(s["ram_used_gb"] for s in snapshots) / n, 1),
        },
        "browsers": {
            "avg_ram_gb": round(sum(browser_ram_values) / n, 1),
            "max_ram_gb": round(max(browser_ram_values), 1),
            "avg_processes": round(sum(s["browser_processes"] for s in snapshots) / n, 0),
        },
        "trend": trend,
        "trend_detail": {
            "cpu_change": round(cpu_diff, 1),
            "ram_change": round(ram_diff, 1),
        },
        "alerts_count": len(alerts),
        "alerts": alerts[:20],  # Máximo 20 alertas no relatório
    }

    # Recomendação final
    if report["cpu"]["avg"] > alert_cpu:
        report["recommendation"] = (
            f"CPU consistentemente alta (media {report['cpu']['avg']}%). "
            f"Fechar aplicativos pesados e abas de browser desnecessarias."
        )
    elif len(alerts) > n * 0.3:
        report["recommendation"] = (
            f"Alertas frequentes ({len(alerts)} de {n} amostras). "
            f"Sistema sob pressao intermitente. Reduzir carga."
        )
    elif trend == "piorando":
        report["recommendation"] = (
            f"Tendencia de piora detectada (CPU {'+' if cpu_diff > 0 else ''}{cpu_diff:.0f}%, "
            f"RAM {'+' if ram_diff > 0 else ''}{ram_diff:.0f}%). Monitorar."
        )
    else:
        report["recommendation"] = "Sistema estavel durante o monitoramento."

    return report


def format_report(report):
    """Formata o relatório para exibição."""
    lines = ["## Relatorio de Monitoramento\n"]
    lines.append(f"- **Amostras**: {report['samples']} em {report['duration_seconds']}s")
    lines.append(f"- **Tendencia**: {report['trend'].upper()}")
    lines.append(f"- **Alertas**: {report['alerts_count']}\n")

    lines.append("### CPU")
    lines.append(f"- Media: {report['cpu']['avg']}%")
    lines.append(f"- Max: {report['cpu']['max']}% | Min: {report['cpu']['min']}%\n")

    lines.append("### RAM")
    lines.append(f"- Media: {report['ram']['avg_percent']}% ({report['ram']['avg_used_gb']} GB)")
    lines.append(f"- Pico: {report['ram']['max_percent']}%\n")

    lines.append("### Browsers")
    lines.append(f"- Media RAM: {report['browsers']['avg_ram_gb']} GB")
    lines.append(f"- Pico RAM: {report['browsers']['max_ram_gb']} GB")
    lines.append(f"- Media processos: {report['browsers']['avg_processes']}\n")

    lines.append(f"### Recomendacao")
    lines.append(f"{report['recommendation']}")

    return "\n".join(lines)


def main():
    import argparse

    parser = argparse.ArgumentParser(description="Claude Monitor - Monitor Continuo")
    parser.add_argument("--interval", type=int, default=MONITOR_DEFAULTS["interval"],
                        help=f"Segundos entre amostras (default: {MONITOR_DEFAULTS['interval']})")
    parser.add_argument("--duration", type=int, default=MONITOR_DEFAULTS["duration"],
                        help=f"Duracao total em segundos (default: {MONITOR_DEFAULTS['duration']})")
    parser.add_argument("--output", type=str, default=None,
                        help="Arquivo de saida JSON")
    parser.add_argument("--alert-cpu", type=int, default=MONITOR_DEFAULTS["alert_cpu"],
                        help=f"Threshold CPU para alerta (default: {MONITOR_DEFAULTS['alert_cpu']})")
    parser.add_argument("--alert-ram", type=int, default=MONITOR_DEFAULTS["alert_ram"],
                        help=f"Threshold RAM para alerta (default: {MONITOR_DEFAULTS['alert_ram']})")
    parser.add_argument("--json", action="store_true", help="Output em JSON")
    args = parser.parse_args()

    snapshots = []
    start_time = time.time()
    sample_count = 0
    expected_samples = args.duration // args.interval

    print(f"Monitorando por {args.duration}s (amostra a cada {args.interval}s)...")
    print(f"Esperando {expected_samples} amostras. Ctrl+C para parar.\n")

    # Permite interromper com Ctrl+C
    interrupted = False

    def handle_interrupt(sig, frame):
        nonlocal interrupted
        interrupted = True
        print("\nInterrompido pelo usuario. Gerando relatorio...\n")

    signal.signal(signal.SIGINT, handle_interrupt)

    while not interrupted and (time.time() - start_time) < args.duration:
        snapshot = take_snapshot()
        snapshots.append(snapshot)
        sample_count += 1

        # Print inline progress
        print(
            f"[{sample_count}/{expected_samples}] "
            f"CPU: {snapshot['cpu_percent']:5.1f}% | "
            f"RAM: {snapshot['ram_percent']:5.1f}% | "
            f"Browsers: {snapshot['browser_ram_gb']:.1f}GB ({snapshot['browser_processes']} proc) | "
            f"Claude: {snapshot['claude_ram_gb']:.1f}GB ({snapshot['claude_processes']} proc)"
        )

        # Espera até a próxima amostra
        elapsed = time.time() - start_time
        next_sample_at = sample_count * args.interval
        sleep_time = max(0, next_sample_at - elapsed)
        if sleep_time > 0 and not interrupted:
            time.sleep(sleep_time)

    # Analisa
    report = analyze_snapshots(snapshots, args.alert_cpu, args.alert_ram)

    # Salva log
    output_data = {
        "config": {
            "interval": args.interval,
            "duration": args.duration,
            "alert_cpu": args.alert_cpu,
            "alert_ram": args.alert_ram,
        },
        "snapshots": snapshots,
        "report": report,
    }

    if args.output:
        output_path = args.output
    else:
        output_path = f"monitor_log_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"

    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(output_data, f, indent=2, ensure_ascii=False)

    print(f"\nLog salvo em: {output_path}\n")

    if args.json:
        print(json.dumps(report, indent=2, ensure_ascii=False))
    else:
        print(format_report(report))


if __name__ == "__main__":
    main()
