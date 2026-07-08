#!/usr/bin/env python3
"""
Context Guardian — Snapshot Manager.

Cria, lista e le snapshots de contexto para preservacao
pre-compactacao. Os snapshots sao arquivos .md estruturados
com todas as informacoes criticas de uma sessao.

Uso:
    python context_snapshot.py save --project "nome" --phase "fase" --summary "resumo"
    python context_snapshot.py list
    python context_snapshot.py latest
    python context_snapshot.py read <snapshot-file>
    python context_snapshot.py prune --keep 10
"""

import json
import sys
import os
from datetime import datetime
from pathlib import Path

# ── Paths ──────────────────────────────────────────────────────────────────
SCRIPT_DIR = Path(__file__).resolve().parent
SKILL_DIR = SCRIPT_DIR.parent
DATA_DIR = SKILL_DIR / "data"

# ── Functions ──────────────────────────────────────────────────────────────

def ensure_data_dir():
    """Create data directory if it doesn't exist."""
    DATA_DIR.mkdir(parents=True, exist_ok=True)


def save_snapshot(project: str = "", phase: str = "", summary: str = "") -> str:
    """
    Create a new snapshot file with metadata header.
    Returns the path to the created file.

    The Claude agent is expected to APPEND the actual content
    (extracted from the conversation) after this header is created.
    """
    ensure_data_dir()

    timestamp = datetime.now().strftime("%Y%m%d-%H%M%S")
    filename = f"snapshot-{timestamp}.md"
    filepath = DATA_DIR / filename

    header = f"""# Context Guardian Snapshot — {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}
**Projeto**: {project or 'nao especificado'}
**Fase**: {phase or 'nao especificada'}
**Resumo**: {summary or 'snapshot pre-compactacao'}
**Modelo**: claude-opus-4-6

---

<!-- O Claude deve preencher as secoes abaixo seguindo references/extraction-protocol.md -->

## Arquivos Tocados
| Arquivo | Acao | Detalhes |
|---------|------|----------|
| | | |

## Decisoes
- (preencher)

## Correcoes
- (preencher)

## Progresso
- Total de tarefas:
- Concluidas:
- Pendentes:

## Trechos Criticos
- (preencher)

## Padroes Observados
- (preencher)

## Dependencias
- (preencher)

## Contexto do Usuario
- Objetivo:
- Proxima acao esperada:

---
*Snapshot gerado por context-guardian v1.0.0*
*Para restaurar: leia este arquivo + MEMORY.md + context_manager.py load*
"""

    filepath.write_text(header, encoding="utf-8")
    return str(filepath)


def list_snapshots() -> list[dict]:
    """List all snapshots with metadata."""
    ensure_data_dir()
    snapshots = []

    for f in sorted(DATA_DIR.glob("snapshot-*.md"), reverse=True):
        stat = f.stat()
        snapshots.append({
            "file": f.name,
            "path": str(f),
            "size_kb": round(stat.st_size / 1024, 1),
            "modified": datetime.fromtimestamp(stat.st_mtime).strftime("%Y-%m-%d %H:%M:%S"),
        })

    return snapshots


def read_latest() -> dict:
    """Read the most recent snapshot."""
    snapshots = list_snapshots()
    if not snapshots:
        return {"error": "Nenhum snapshot encontrado."}

    latest = snapshots[0]
    path = Path(latest["path"])
    content = path.read_text(encoding="utf-8")

    return {
        "file": latest["file"],
        "path": latest["path"],
        "size_kb": latest["size_kb"],
        "content": content,
    }


def read_snapshot(filename: str) -> dict:
    """Read a specific snapshot by filename."""
    filepath = DATA_DIR / filename
    if not filepath.exists():
        return {"error": f"Arquivo nao encontrado: {filename}"}

    content = filepath.read_text(encoding="utf-8")
    return {
        "file": filename,
        "path": str(filepath),
        "content": content,
    }


def prune_snapshots(keep: int = 10) -> dict:
    """Remove old snapshots, keeping the N most recent."""
    snapshots = list_snapshots()
    if len(snapshots) <= keep:
        return {"pruned": 0, "remaining": len(snapshots)}

    to_remove = snapshots[keep:]
    for s in to_remove:
        Path(s["path"]).unlink()

    return {"pruned": len(to_remove), "remaining": keep}


# ── CLI ────────────────────────────────────────────────────────────────────

def main():
    args = sys.argv[1:]

    if not args:
        print(json.dumps({
            "error": "Comando necessario: save, list, latest, read, prune",
            "usage": "python context_snapshot.py <command> [options]",
        }, indent=2, ensure_ascii=False))
        sys.exit(1)

    cmd = args[0]

    if cmd == "save":
        project = ""
        phase = ""
        summary = ""
        i = 1
        while i < len(args):
            if args[i] == "--project" and i + 1 < len(args):
                project = args[i + 1]
                i += 2
            elif args[i] == "--phase" and i + 1 < len(args):
                phase = args[i + 1]
                i += 2
            elif args[i] == "--summary" and i + 1 < len(args):
                summary = args[i + 1]
                i += 2
            else:
                i += 1

        path = save_snapshot(project, phase, summary)
        print(json.dumps({
            "status": "ok",
            "action": "snapshot_created",
            "path": path,
            "next_step": "Preencher o snapshot com dados extraidos da conversa",
        }, indent=2, ensure_ascii=False))

    elif cmd == "list":
        snapshots = list_snapshots()
        print(json.dumps({
            "total": len(snapshots),
            "snapshots": snapshots,
        }, indent=2, ensure_ascii=False))

    elif cmd == "latest":
        result = read_latest()
        print(json.dumps(result, indent=2, ensure_ascii=False))

    elif cmd == "read" and len(args) > 1:
        result = read_snapshot(args[1])
        print(json.dumps(result, indent=2, ensure_ascii=False))

    elif cmd == "prune":
        keep = 10
        if "--keep" in args:
            idx = args.index("--keep")
            if idx + 1 < len(args):
                keep = int(args[idx + 1])
        result = prune_snapshots(keep)
        print(json.dumps(result, indent=2, ensure_ascii=False))

    else:
        print(json.dumps({"error": f"Comando desconhecido: {cmd}"}, indent=2))
        sys.exit(1)


if __name__ == "__main__":
    main()
