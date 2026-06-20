#!/usr/bin/env python3
"""
Claude Monitor — Diagnóstico Rápido de Performance

Analisa CPU, RAM, browsers, disco e rede em ~3 segundos.
Identifica o gargalo principal e sugere ações corretivas.

Uso:
    python health_check.py                  # Diagnóstico completo
    python health_check.py --browsers-detail  # Detalhe de browsers
    python health_check.py --json            # Output JSON puro
    python health_check.py --quick           # Só resumo (sem teste de rede)
"""

import json
import os
import socket
import subprocess
import sys
import time
from datetime import datetime
from pathlib import Path

# Garante que psutil está disponível
try:
    import psutil
except ImportError:
    print("Instalando psutil...")
    subprocess.check_call([sys.executable, "-m", "pip", "install", "psutil", "--quiet"])
    import psutil

# Importa config do mesmo diretório
sys.path.insert(0, str(Path(__file__).parent))
from config import (
    BROWSER_NAMES, CLAUDE_NAMES, API_ENDPOINT,
    THRESHOLDS, classify
)


def check_cpu():
    """Verifica uso de CPU."""
    cpu_percent = psutil.cpu_percent(interval=1)
    cpu_count = psutil.cpu_count()
    per_cpu = psutil.cpu_percent(interval=0, percpu=True)

    return {
        "percent": cpu_percent,
        "cores": cpu_count,
        "per_core": per_cpu,
        "status": classify(cpu_percent, "cpu"),
    }


def check_ram():
    """Verifica uso de RAM."""
    ram = psutil.virtual_memory()
    swap = psutil.swap_memory()

    return {
        "total_gb": round(ram.total / 1024**3, 1),
        "used_gb": round(ram.used / 1024**3, 1),
        "available_gb": round(ram.available / 1024**3, 1),
        "percent": ram.percent,
        "swap_used_gb": round(swap.used / 1024**3, 1),
        "swap_percent": swap.percent,
        "status": classify(ram.percent, "ram_percent"),
    }


def check_browsers(detail=False):
    """Verifica processos de browser e consumo de RAM."""
    browsers = {}
    all_procs = []

    for proc in psutil.process_iter(["pid", "name", "memory_info"]):
        try:
            info = proc.info
            name_lower = info["name"].lower()
            ram_mb = info["memory_info"].rss / 1024**2

            for bname in BROWSER_NAMES:
                if bname in name_lower:
                    if bname not in browsers:
                        browsers[bname] = {"count": 0, "ram_mb": 0, "pids": []}
                    browsers[bname]["count"] += 1
                    browsers[bname]["ram_mb"] += ram_mb
                    if detail:
                        browsers[bname]["pids"].append({
                            "pid": info["pid"],
                            "ram_mb": round(ram_mb, 0)
                        })
                    break
        except (psutil.NoSuchProcess, psutil.AccessDenied):
            pass

    total_ram_gb = sum(b["ram_mb"] for b in browsers.values()) / 1024
    total_procs = sum(b["count"] for b in browsers.values())

    # Formata para output
    for bname in browsers:
        browsers[bname]["ram_mb"] = round(browsers[bname]["ram_mb"], 0)

    return {
        "browsers": browsers,
        "total_ram_gb": round(total_ram_gb, 1),
        "total_processes": total_procs,
        "ram_status": classify(total_ram_gb, "browsers_ram_gb"),
        "process_status": classify(total_procs, "browsers_processes"),
    }


def check_claude_processes():
    """Verifica processos do Claude Code."""
    claude_procs = []
    total_ram = 0

    for proc in psutil.process_iter(["pid", "name", "memory_info", "cpu_percent"]):
        try:
            info = proc.info
            name_lower = info["name"].lower()

            for cname in CLAUDE_NAMES:
                if cname in name_lower:
                    ram_mb = info["memory_info"].rss / 1024**2
                    claude_procs.append({
                        "pid": info["pid"],
                        "name": info["name"],
                        "ram_mb": round(ram_mb, 0),
                    })
                    total_ram += ram_mb
                    break
        except (psutil.NoSuchProcess, psutil.AccessDenied):
            pass

    claude_procs.sort(key=lambda x: x["ram_mb"], reverse=True)

    return {
        "count": len(claude_procs),
        "total_ram_gb": round(total_ram / 1024, 1),
        "processes": claude_procs[:10],  # Top 10
    }


def check_disk():
    """Verifica espaço em disco."""
    disk = psutil.disk_usage("C:/")
    free_percent = 100 - disk.percent

    return {
        "total_gb": round(disk.total / 1024**3, 0),
        "used_gb": round(disk.used / 1024**3, 0),
        "free_gb": round(disk.free / 1024**3, 0),
        "used_percent": disk.percent,
        "free_percent": round(free_percent, 1),
        "status": classify(free_percent, "disk_free_percent"),
    }


def check_network():
    """Testa latência até a API do Claude."""
    try:
        start = time.time()
        sock = socket.create_connection((API_ENDPOINT, 443), timeout=5)
        latency_ms = round((time.time() - start) * 1000, 0)
        sock.close()

        return {
            "latency_ms": latency_ms,
            "endpoint": API_ENDPOINT,
            "reachable": True,
            "status": classify(latency_ms, "network_latency_ms"),
        }
    except (socket.timeout, socket.error, OSError) as e:
        return {
            "latency_ms": None,
            "endpoint": API_ENDPOINT,
            "reachable": False,
            "status": "critical",
            "error": str(e),
        }


def check_top_processes(n=10):
    """Lista os N processos que mais consomem RAM."""
    procs = []
    for proc in psutil.process_iter(["pid", "name", "memory_info"]):
        try:
            info = proc.info
            procs.append({
                "name": info["name"],
                "ram_mb": round(info["memory_info"].rss / 1024**2, 0),
                "pid": info["pid"],
            })
        except (psutil.NoSuchProcess, psutil.AccessDenied):
            pass

    procs.sort(key=lambda x: x["ram_mb"], reverse=True)
    return procs[:n]


def diagnose(results):
    """Analisa os resultados e gera diagnóstico."""
    issues = []
    suggestions = []
    bottleneck = "ok"
    severity = "ok"

    cpu = results["cpu"]
    ram = results["ram"]
    browsers = results["browsers"]
    disk = results["disk"]
    network = results.get("network", {})
    claude = results["claude"]

    # CPU
    if cpu["status"] == "critical":
        issues.append(f"CPU a {cpu['percent']}% (CRITICO)")
        suggestions.append("Fechar aplicativos pesados ou abas de browser desnecessarias")
        suggestions.append("Verificar se Windows Update ou antivirus esta rodando em background")
        bottleneck = "cpu"
        severity = "critical"
    elif cpu["status"] == "warning":
        issues.append(f"CPU a {cpu['percent']}% (elevada)")
        suggestions.append("Considerar fechar algumas abas de browser")
        if severity != "critical":
            bottleneck = "cpu"
            severity = "warning"

    # RAM
    if ram["status"] == "critical":
        issues.append(f"RAM a {ram['percent']}% ({ram['used_gb']} de {ram['total_gb']} GB)")
        suggestions.append("Fechar browsers ou aplicativos para liberar memoria")
        if severity != "critical":
            bottleneck = "ram"
            severity = "critical"
    elif ram["status"] == "warning":
        issues.append(f"RAM a {ram['percent']}% (monitorar)")

    # Browsers
    if browsers["ram_status"] == "critical":
        issues.append(f"Browsers consumindo {browsers['total_ram_gb']} GB ({browsers['total_processes']} processos)")
        suggestions.append("Fechar abas desnecessarias nos browsers")
        browser_detail = []
        for bname, info in browsers["browsers"].items():
            browser_detail.append(f"  - {bname}: {info['count']} processos, {info['ram_mb']:.0f} MB")
        suggestions.append("Detalhamento:\n" + "\n".join(browser_detail))
        if bottleneck == "ok":
            bottleneck = "browsers"
            if severity == "ok":
                severity = "warning"
    elif browsers["ram_status"] == "warning":
        issues.append(f"Browsers usando {browsers['total_ram_gb']} GB (moderado)")

    # Disco
    if disk["status"] == "critical":
        issues.append(f"Disco quase cheio: apenas {disk['free_gb']:.0f} GB livres ({disk['free_percent']}%)")
        suggestions.append("Limpar arquivos temporarios, cache e lixeira")
        suggestions.append("Verificar pasta Downloads e Temp por arquivos grandes")
        if bottleneck == "ok":
            bottleneck = "disk"
            severity = "warning"
    elif disk["status"] == "warning":
        issues.append(f"Disco com {disk['free_gb']:.0f} GB livres ({disk['free_percent']}%)")

    # Rede
    if network.get("status") == "critical":
        if not network.get("reachable"):
            issues.append("API do Claude INACESSIVEL")
            suggestions.append("Verificar conexao com internet")
            suggestions.append("Verificar se VPN ou proxy esta bloqueando")
            bottleneck = "network"
            severity = "critical"
        else:
            issues.append(f"Latencia alta para API: {network['latency_ms']}ms")
            suggestions.append("Verificar qualidade da conexao WiFi/cabo")
            if bottleneck == "ok":
                bottleneck = "network"
                severity = "warning"

    # Claude Code RAM
    if claude["total_ram_gb"] > 8:
        issues.append(f"Claude Code usando {claude['total_ram_gb']} GB ({claude['count']} processos)")
        suggestions.append("Considerar fechar sessoes de conversa antigas no Claude Code")

    # Tudo ok
    if not issues:
        issues.append("Sistema saudavel, sem gargalos detectados")
        suggestions.append("A lentidao pode ser temporaria (pico na API do Claude)")
        suggestions.append("Tente trocar de sessao novamente em alguns segundos")

    # Gerar resumo em PT-BR
    summary_lines = ["## Diagnostico de Performance\n"]

    status_emoji = {"critical": "[!!!]", "warning": "[!]", "ok": "[OK]"}
    summary_lines.append(f"**Status geral: {status_emoji[severity]} {severity.upper()}**\n")

    if bottleneck != "ok":
        summary_lines.append(f"**Gargalo principal: {bottleneck.upper()}**\n")

    summary_lines.append("### Problemas detectados:")
    for issue in issues:
        summary_lines.append(f"- {issue}")

    summary_lines.append("\n### Acoes recomendadas:")
    for i, sug in enumerate(suggestions, 1):
        if "\n" in sug:
            summary_lines.append(f"{i}. {sug}")
        else:
            summary_lines.append(f"{i}. {sug}")

    summary_lines.append(f"\n### Numeros-chave:")
    summary_lines.append(f"- CPU: {cpu['percent']}% | RAM: {ram['percent']}% ({ram['used_gb']}/{ram['total_gb']} GB)")
    summary_lines.append(f"- Browsers: {browsers['total_processes']} processos, {browsers['total_ram_gb']} GB")
    summary_lines.append(f"- Claude Code: {claude['count']} processos, {claude['total_ram_gb']} GB")
    summary_lines.append(f"- Disco C: {disk['free_gb']:.0f} GB livres ({disk['free_percent']}%)")
    if network.get("latency_ms"):
        summary_lines.append(f"- Latencia API: {network['latency_ms']}ms")

    return {
        "bottleneck": bottleneck,
        "severity": severity,
        "issues": issues,
        "suggestions": suggestions,
        "summary": "\n".join(summary_lines),
    }


def main():
    import argparse

    parser = argparse.ArgumentParser(description="Claude Monitor - Diagnostico Rapido")
    parser.add_argument("--browsers-detail", action="store_true", help="Mostra detalhes por browser")
    parser.add_argument("--json", action="store_true", help="Output em JSON puro")
    parser.add_argument("--quick", action="store_true", help="Pula teste de rede")
    args = parser.parse_args()

    results = {}

    # Coleta dados
    results["timestamp"] = datetime.now().isoformat()
    results["cpu"] = check_cpu()
    results["ram"] = check_ram()
    results["browsers"] = check_browsers(detail=args.browsers_detail)
    results["claude"] = check_claude_processes()
    results["disk"] = check_disk()
    results["top_processes"] = check_top_processes(15)

    if not args.quick:
        results["network"] = check_network()

    # Diagnóstico
    results["diagnosis"] = diagnose(results)

    if args.json:
        print(json.dumps(results, indent=2, ensure_ascii=False))
    else:
        print(results["diagnosis"]["summary"])
        print(f"\n(Para output completo em JSON, use: python health_check.py --json)")


if __name__ == "__main__":
    main()
