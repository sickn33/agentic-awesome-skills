"""
Templates reutilizáveis de conteúdo para Instagram.

Uso:
    python scripts/templates.py --create --name "promo" --caption "Oferta: {produto}! {desconto}% OFF" --hashtags "#oferta,#promo"
    python scripts/templates.py --list
    python scripts/templates.py --show --name promo
    python scripts/templates.py --delete --name promo
    python scripts/templates.py --preview --name promo --vars produto=Tênis desconto=30
"""
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

from db import Database

db = Database()
db.init()


def create_template(name: str, caption: str, hashtags: str = None, schedule_time: str = None) -> None:
    """Cria ou atualiza um template."""
    hashtag_list = None
    if hashtags:
        hashtag_list = json.dumps([h.strip() for h in hashtags.split(",")])

    template_id = db.upsert_template({
        "name": name,
        "caption_template": caption,
        "hashtag_set": hashtag_list,
        "default_schedule_time": schedule_time,
    })
    print(json.dumps({
        "status": "created",
        "id": template_id,
        "name": name,
        "caption_template": caption,
        "hashtags": json.loads(hashtag_list) if hashtag_list else [],
    }, indent=2, ensure_ascii=False))


def list_templates() -> None:
    """Lista todos os templates."""
    templates = db.get_templates()
    for t in templates:
        if t.get("hashtag_set") and isinstance(t["hashtag_set"], str):
            try:
                t["hashtag_set"] = json.loads(t["hashtag_set"])
            except json.JSONDecodeError:
                pass
    print(json.dumps({"total": len(templates), "templates": templates}, indent=2, ensure_ascii=False))


def show_template(name: str) -> None:
    """Mostra detalhes de um template."""
    t = db.get_template_by_name(name)
    if not t:
        print(json.dumps({"error": f"Template '{name}' não encontrado"}, indent=2))
        return
    if t.get("hashtag_set") and isinstance(t["hashtag_set"], str):
        try:
            t["hashtag_set"] = json.loads(t["hashtag_set"])
        except json.JSONDecodeError:
            pass
    print(json.dumps(t, indent=2, ensure_ascii=False))


def delete_template(name: str) -> None:
    """Deleta um template."""
    if db.delete_template(name):
        print(json.dumps({"status": "deleted", "name": name}, indent=2))
    else:
        print(json.dumps({"error": f"Template '{name}' não encontrado"}, indent=2))


def preview_template(name: str, variables: list) -> None:
    """Preview de um template com variáveis aplicadas."""
    t = db.get_template_by_name(name)
    if not t:
        print(json.dumps({"error": f"Template '{name}' não encontrado"}, indent=2))
        return

    caption = t["caption_template"] or ""
    var_dict = {}
    for v in variables:
        if "=" in v:
            key, val = v.split("=", 1)
            var_dict[key.strip()] = val.strip()

    try:
        rendered = caption.format(**var_dict)
    except KeyError as e:
        print(json.dumps({"error": f"Variável faltando: {e}"}, indent=2))
        return

    hashtags = []
    if t.get("hashtag_set"):
        try:
            hashtags = json.loads(t["hashtag_set"]) if isinstance(t["hashtag_set"], str) else t["hashtag_set"]
        except json.JSONDecodeError:
            pass

    full_caption = rendered
    if hashtags:
        full_caption = f"{rendered}\n\n{' '.join(hashtags)}"

    print(json.dumps({
        "template": name,
        "variables": var_dict,
        "rendered_caption": full_caption,
    }, indent=2, ensure_ascii=False))


def main():
    parser = argparse.ArgumentParser(description="Templates de conteúdo Instagram")
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument("--create", action="store_true", help="Criar template")
    group.add_argument("--list", action="store_true", help="Listar templates")
    group.add_argument("--show", action="store_true", help="Ver template")
    group.add_argument("--delete", action="store_true", help="Deletar template")
    group.add_argument("--preview", action="store_true", help="Preview com variáveis")
    parser.add_argument("--name", help="Nome do template")
    parser.add_argument("--caption", help="Template de caption (use {var} para variáveis)")
    parser.add_argument("--hashtags", help="Hashtags separadas por vírgula")
    parser.add_argument("--schedule-time", help="Horário padrão (HH:MM)")
    parser.add_argument("--vars", nargs="+", help="Variáveis (key=value)")
    args = parser.parse_args()

    if args.create:
        if not args.name or not args.caption:
            parser.error("--name e --caption são obrigatórios com --create")
        create_template(args.name, args.caption, args.hashtags, args.schedule_time)
    elif args.list:
        list_templates()
    elif args.show:
        if not args.name:
            parser.error("--name é obrigatório com --show")
        show_template(args.name)
    elif args.delete:
        if not args.name:
            parser.error("--name é obrigatório com --delete")
        delete_template(args.name)
    elif args.preview:
        if not args.name:
            parser.error("--name é obrigatório com --preview")
        preview_template(args.name, args.vars or [])


if __name__ == "__main__":
    main()
