#!/usr/bin/env python3
"""
Claude Monitor — Benchmark de Conectividade API

Testa latência e conectividade com a API do Claude.
Não faz chamadas à API (não precisa de API key).
Apenas verifica se a rede está funcionando e se o endpoint responde.

Uso:
    python api_bench.py              # 5 testes de latência
    python api_bench.py --samples 10 # 10 testes
    python api_bench.py --json       # Output JSON
"""

import json
import socket
import ssl
import subprocess
import sys
import time
from datetime import datetime

try:
    import psutil
except ImportError:
    subprocess.check_call([sys.executable, "-m", "pip", "install", "psutil", "--quiet"])
    import psutil


ENDPOINTS = [
    {"name": "Claude API", "host": "api.anthropic.com", "port": 443},
    {"name": "Anthropic CDN", "host": "cdn.anthropic.com", "port": 443},
    {"name": "Google DNS", "host": "8.8.8.8", "port": 53},
]


def create_tls_context():
    """Cria contexto TLS restringindo conexoes a TLS 1.2+."""
    context = ssl.create_default_context()
    if hasattr(ssl, "TLSVersion"):
        context.minimum_version = ssl.TLSVersion.TLSv1_2
    else:
        context.options |= getattr(ssl, "OP_NO_TLSv1", 0)
        context.options |= getattr(ssl, "OP_NO_TLSv1_1", 0)
    return context


def test_tcp_latency(host, port, timeout=5):
    """Testa latência TCP para um host:port."""
    try:
        start = time.time()
        sock = socket.create_connection((host, port), timeout=timeout)
        latency = (time.time() - start) * 1000  # ms
        sock.close()
        return {"reachable": True, "latency_ms": round(latency, 1)}
    except (socket.timeout, socket.error, OSError) as e:
        return {"reachable": False, "latency_ms": None, "error": str(e)}


def test_tls_handshake(host, port=443, timeout=5):
    """Testa tempo do handshake TLS."""
    try:
        context = create_tls_context()
        start = time.time()
        with socket.create_connection((host, port), timeout=timeout) as sock:
            with context.wrap_socket(sock, server_hostname=host) as ssock:
                handshake_time = (time.time() - start) * 1000
                return {
                    "success": True,
                    "handshake_ms": round(handshake_time, 1),
                    "tls_version": ssock.version(),
                }
    except Exception as e:
        return {"success": False, "error": str(e)}


def test_dns(hostname):
    """Testa resolução DNS."""
    try:
        start = time.time()
        ip = socket.gethostbyname(hostname)
        dns_time = (time.time() - start) * 1000
        return {"resolved": True, "ip": ip, "dns_ms": round(dns_time, 1)}
    except socket.gaierror as e:
        return {"resolved": False, "error": str(e)}


def check_network_interfaces():
    """Verifica interfaces de rede ativas."""
    stats = psutil.net_if_stats()
    active = []
    for name, info in stats.items():
        if info.isup and info.speed > 0:
            active.append({
                "name": name,
                "speed_mbps": info.speed,
                "mtu": info.mtu,
            })
    return active


def run_benchmark(samples=5):
    """Roda o benchmark completo."""
    results = {
        "timestamp": datetime.now().isoformat(),
        "samples": samples,
        "endpoints": [],
        "dns": None,
        "tls": None,
        "network_interfaces": check_network_interfaces(),
    }

    # DNS
    results["dns"] = test_dns("api.anthropic.com")

    # TLS handshake
    results["tls"] = test_tls_handshake("api.anthropic.com")

    # Latência por endpoint
    for ep in ENDPOINTS:
        latencies = []
        for _ in range(samples):
            result = test_tcp_latency(ep["host"], ep["port"])
            latencies.append(result)
            time.sleep(0.2)

        valid = [r["latency_ms"] for r in latencies if r["reachable"] and r["latency_ms"]]

        ep_result = {
            "name": ep["name"],
            "host": ep["host"],
            "port": ep["port"],
            "tests": latencies,
        }

        if valid:
            ep_result["avg_ms"] = round(sum(valid) / len(valid), 1)
            ep_result["min_ms"] = round(min(valid), 1)
            ep_result["max_ms"] = round(max(valid), 1)
            ep_result["success_rate"] = round(len(valid) / samples * 100, 0)
        else:
            ep_result["avg_ms"] = None
            ep_result["success_rate"] = 0

        results["endpoints"].append(ep_result)

    # Diagnóstico
    api_ep = results["endpoints"][0]
    if api_ep.get("avg_ms") is None:
        results["diagnosis"] = {
            "status": "critical",
            "message": "API do Claude INACESSIVEL. Verifique sua conexao de internet.",
        }
    elif api_ep["avg_ms"] > 500:
        results["diagnosis"] = {
            "status": "warning",
            "message": (
                f"Latencia alta para API ({api_ep['avg_ms']}ms). "
                f"Conexao lenta pode causar atrasos no Claude Code."
            ),
        }
    elif api_ep["avg_ms"] > 200:
        results["diagnosis"] = {
            "status": "ok",
            "message": (
                f"Latencia moderada ({api_ep['avg_ms']}ms). "
                f"Dentro do aceitavel mas pode ser melhor."
            ),
        }
    else:
        results["diagnosis"] = {
            "status": "ok",
            "message": (
                f"Conexao excelente ({api_ep['avg_ms']}ms). "
                f"A rede NAO e o gargalo."
            ),
        }

    return results


def format_results(results):
    """Formata resultados para exibição."""
    lines = ["## Benchmark de Conectividade\n"]

    # DNS
    dns = results["dns"]
    if dns.get("resolved"):
        lines.append(f"- DNS: api.anthropic.com -> {dns['ip']} ({dns['dns_ms']}ms)")
    else:
        lines.append(f"- DNS: FALHOU ({dns.get('error', 'desconhecido')})")

    # TLS
    tls = results["tls"]
    if tls.get("success"):
        lines.append(f"- TLS: {tls['tls_version']} handshake em {tls['handshake_ms']}ms")
    else:
        lines.append(f"- TLS: FALHOU ({tls.get('error', 'desconhecido')})")

    lines.append("")

    # Endpoints
    lines.append("### Latencia por Endpoint")
    for ep in results["endpoints"]:
        if ep.get("avg_ms"):
            lines.append(
                f"- **{ep['name']}**: {ep['avg_ms']}ms avg "
                f"(min {ep['min_ms']}ms, max {ep['max_ms']}ms) "
                f"[{ep['success_rate']:.0f}% sucesso]"
            )
        else:
            lines.append(f"- **{ep['name']}**: INACESSIVEL")

    # Interfaces
    lines.append("\n### Interfaces de Rede")
    for iface in results["network_interfaces"]:
        speed = iface["speed_mbps"]
        if speed >= 1000:
            speed_str = f"{speed/1000:.0f} Gbps"
        else:
            speed_str = f"{speed} Mbps"
        lines.append(f"- {iface['name']}: {speed_str}")

    # Diagnóstico
    lines.append(f"\n### Diagnostico")
    diag = results["diagnosis"]
    status_map = {"critical": "[!!!]", "warning": "[!]", "ok": "[OK]"}
    lines.append(f"{status_map[diag['status']]} {diag['message']}")

    return "\n".join(lines)


def main():
    import argparse

    parser = argparse.ArgumentParser(description="Claude Monitor - Benchmark de Conectividade")
    parser.add_argument("--samples", type=int, default=5, help="Numero de testes por endpoint")
    parser.add_argument("--json", action="store_true", help="Output JSON")
    args = parser.parse_args()

    print(f"Testando conectividade ({args.samples} amostras por endpoint)...\n")
    results = run_benchmark(args.samples)

    if args.json:
        print(json.dumps(results, indent=2, ensure_ascii=False))
    else:
        print(format_results(results))


if __name__ == "__main__":
    main()
