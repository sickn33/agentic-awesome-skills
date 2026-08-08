"""
Publicação de conteúdo no Instagram.

Suporta: foto, vídeo, reel, story, carrossel.
Upload local automático via Imgur.
Pipeline de conteúdo: draft → approved → published.

Uso:
    python scripts/publish.py --type photo --image foto.jpg --caption "Texto"
    python scripts/publish.py --type video --video video.mp4 --caption "Vídeo"
    python scripts/publish.py --type reel --video reel.mp4 --caption "Reel!"
    python scripts/publish.py --type story --image story.jpg
    python scripts/publish.py --type carousel --images img1.jpg img2.jpg --caption "Carrossel"
    python scripts/publish.py --type photo --image foto.jpg --caption "Texto" --draft
    python scripts/publish.py --approve --id 5
    python scripts/publish.py --template promo --vars produto=Tênis desconto=30 --type photo --image foto.jpg
    python scripts/publish.py --confirm yes --action-id abc123
"""
from __future__ import annotations

import argparse
import asyncio
import json
import os
import sys
from pathlib import Path
from typing import Optional

sys.path.insert(0, str(Path(__file__).parent))

from api_client import InstagramAPI
from auth import auto_refresh_if_needed
from db import Database, normalize_media_type
from governance import GovernanceManager

db = Database()
db.init()
gov = GovernanceManager(db)


def _is_local_file(path: str) -> bool:
    """Verifica se é um arquivo local (não URL)."""
    return not path.startswith(("http://", "https://")) and os.path.exists(path)


def _convert_to_jpeg(path: str) -> str:
    """Converte imagem para JPEG se necessário."""
    if path.lower().endswith((".jpg", ".jpeg")):
        return path
    try:
        from PIL import Image
        img = Image.open(path)
        if img.mode in ("RGBA", "P"):
            img = img.convert("RGB")
        jpeg_path = Path(path).with_suffix(".jpg")
        img.save(str(jpeg_path), "JPEG", quality=95)
        print(f"Convertido para JPEG: {jpeg_path}")
        return str(jpeg_path)
    except ImportError:
        print("AVISO: Pillow não instalado. Não foi possível converter a imagem.")
        return path


async def upload_if_local(api: InstagramAPI, path: str) -> str:
    """Se for arquivo local, faz upload no Imgur e retorna URL pública."""
    if _is_local_file(path):
        path = _convert_to_jpeg(path)
        print(f"Fazendo upload de {path} para Imgur...")
        url = await api.upload_to_imgur(path)
        print(f"Upload concluído: {url}")
        return url
    return path


async def publish_photo(
    api: InstagramAPI,
    image: str,
    caption: Optional[str] = None,
    location_id: Optional[str] = None,
    as_draft: bool = False,
) -> dict:
    """Publica uma foto."""
    image_url = await upload_if_local(api, image)

    if as_draft:
        post_id = db.insert_post({
            "account_id": api.account_id,
            "media_type": "PHOTO",
            "media_url": image_url,
            "local_path": image if _is_local_file(image) else None,
            "caption": caption,
            "status": "draft",
        })
        return {"status": "draft", "post_id": post_id, "message": "Rascunho criado"}

    # Confirmação
    if gov.requires_confirmation("publish_photo"):
        confirmation = gov.create_confirmation_request(
            "publish_photo",
            {"caption": caption, "image": image, "image_url": image_url},
            api.account_id,
        )
        return confirmation

    return await _do_publish_photo(api, image_url, caption, location_id, image)


async def _do_publish_photo(
    api: InstagramAPI,
    image_url: str,
    caption: Optional[str],
    location_id: Optional[str],
    local_path: Optional[str] = None,
) -> dict:
    """Executa a publicação de foto (2-step)."""
    # Step 1: Criar container
    container = await api.create_media_container(
        media_type="IMAGE",
        image_url=image_url,
        caption=caption,
        location_id=location_id,
    )
    container_id = container["id"]

    # Salvar no banco com status container_created (para recovery)
    post_id = db.insert_post({
        "account_id": api.account_id,
        "media_type": "PHOTO",
        "media_url": image_url,
        "local_path": local_path,
        "caption": caption,
        "status": "container_created",
        "ig_container_id": container_id,
    })

    # Step 2: Publicar
    result = await api.publish_media(container_id)
    ig_media_id = result.get("id")

    # Buscar permalink
    details = await api.get_media_details(ig_media_id)
    permalink = details.get("permalink", "")

    # Atualizar banco
    db.update_post_status(
        post_id, "published",
        ig_media_id=ig_media_id,
        permalink=permalink,
        published_at=details.get("timestamp", ""),
    )

    gov.log_action(
        "publish_photo",
        params={"caption": caption, "image_url": image_url},
        result={"ig_media_id": ig_media_id, "permalink": permalink},
        account_id=api.account_id,
    )

    return {
        "status": "published",
        "ig_media_id": ig_media_id,
        "permalink": permalink,
        "post_id": post_id,
    }


async def publish_video(
    api: InstagramAPI,
    video: str,
    caption: Optional[str] = None,
    media_type: str = "VIDEO",
    cover_url: Optional[str] = None,
    as_draft: bool = False,
) -> dict:
    """Publica vídeo, reel ou story de vídeo."""
    media_type = normalize_media_type(media_type)
    video_url = await upload_if_local(api, video)

    if as_draft:
        post_id = db.insert_post({
            "account_id": api.account_id,
            "media_type": media_type,
            "media_url": video_url,
            "local_path": video if _is_local_file(video) else None,
            "caption": caption,
            "status": "draft",
        })
        return {"status": "draft", "post_id": post_id}

    action_name = f"publish_{media_type.lower()}"
    if gov.requires_confirmation(action_name):
        return gov.create_confirmation_request(
            action_name,
            {"caption": caption, "video": video, "type": media_type},
            api.account_id,
        )

    # Step 1: Container
    ig_type = {"VIDEO": "VIDEO", "REEL": "REELS", "STORY": "STORIES"}[media_type]
    container = await api.create_media_container(
        media_type=ig_type,
        video_url=video_url,
        caption=caption,
        cover_url=cover_url,
    )
    container_id = container["id"]

    post_id = db.insert_post({
            "account_id": api.account_id,
            "media_type": media_type,
        "media_url": video_url,
        "caption": caption,
        "status": "container_created",
        "ig_container_id": container_id,
    })

    # Aguardar processamento do vídeo
    print("Aguardando processamento do vídeo...")
    for _ in range(60):  # max 5 min (60 * 5s)
        status = await api.check_container_status(container_id)
        code = status.get("status_code", "")
        if code == "FINISHED":
            break
        if code == "ERROR":
            error_msg = status.get("status", "Erro desconhecido")
            db.update_post_status(post_id, "failed", error_msg=error_msg)
            return {"status": "failed", "error": error_msg}
        await asyncio.sleep(5)

    # Step 2: Publicar
    result = await api.publish_media(container_id)
    ig_media_id = result.get("id")
    details = await api.get_media_details(ig_media_id)
    permalink = details.get("permalink", "")

    db.update_post_status(
        post_id, "published",
        ig_media_id=ig_media_id,
        permalink=permalink,
        published_at=details.get("timestamp", ""),
    )

    gov.log_action(
        action_name,
        params={"caption": caption, "type": media_type},
        result={"ig_media_id": ig_media_id, "permalink": permalink},
        account_id=api.account_id,
    )

    return {"status": "published", "ig_media_id": ig_media_id, "permalink": permalink}


async def publish_carousel(
    api: InstagramAPI,
    images: list,
    caption: Optional[str] = None,
    as_draft: bool = False,
) -> dict:
    """Publica carrossel de imagens."""
    if len(images) < 2 or len(images) > 10:
        return {"status": "error", "message": "Carrossel precisa de 2-10 imagens"}

    if as_draft:
        post_id = db.insert_post({
            "account_id": api.account_id,
            "media_type": "CAROUSEL",
            "caption": caption,
            "status": "draft",
        })
        return {"status": "draft", "post_id": post_id}

    if gov.requires_confirmation("publish_carousel"):
        return gov.create_confirmation_request(
            "publish_carousel",
            {"caption": caption, "images": images, "count": len(images)},
            api.account_id,
        )

    # Upload cada imagem e criar containers filhos
    children_ids = []
    for img in images:
        img_url = await upload_if_local(api, img)
        child = await api.create_media_container(
            media_type="IMAGE", image_url=img_url, is_carousel_item=True,
        )
        children_ids.append(child["id"])

    # Container do carrossel
    container = await api.create_media_container(
        media_type="CAROUSEL", caption=caption, children=children_ids,
    )
    container_id = container["id"]

    post_id = db.insert_post({
        "account_id": api.account_id,
        "media_type": "CAROUSEL",
        "caption": caption,
        "status": "container_created",
        "ig_container_id": container_id,
    })

    # Publicar
    result = await api.publish_media(container_id)
    ig_media_id = result.get("id")
    details = await api.get_media_details(ig_media_id)
    permalink = details.get("permalink", "")

    db.update_post_status(
        post_id, "published",
        ig_media_id=ig_media_id, permalink=permalink,
        published_at=details.get("timestamp", ""),
    )

    gov.log_action(
        "publish_carousel",
        params={"caption": caption, "images_count": len(images)},
        result={"ig_media_id": ig_media_id, "permalink": permalink},
        account_id=api.account_id,
    )

    return {"status": "published", "ig_media_id": ig_media_id, "permalink": permalink}


async def approve_post(post_id: int) -> dict:
    """Aprova um rascunho para publicação."""
    post = db.get_post_by_id(post_id)
    if not post:
        return {"status": "error", "message": f"Post {post_id} não encontrado"}
    if post["status"] != "draft":
        return {"status": "error", "message": f"Post {post_id} não é rascunho (status: {post['status']})"}
    db.update_post_status(post_id, "approved")
    return {"status": "approved", "post_id": post_id, "message": "Post aprovado. Use schedule.py --process para publicar."}


async def do_confirmed_publish(
    action: str, details: dict,
) -> dict:
    """Executa publicação após confirmação do usuário."""
    await auto_refresh_if_needed()
    api = InstagramAPI()

    try:
        if action == "publish_photo":
            result = await _do_publish_photo(
                api,
                details.get("image_url", ""),
                details.get("caption"),
                details.get("location_id"),
                details.get("local_path"),
            )
        else:
            result = {"status": "error", "message": f"Ação confirmada não reconhecida: {action}"}
    finally:
        await api.close()

    return result


def _apply_template(caption: str, variables: dict) -> str:
    """Aplica variáveis a um template de caption."""
    try:
        return caption.format(**variables)
    except KeyError as e:
        print(f"AVISO: Variável {e} não fornecida no template")
        return caption


async def run(args) -> None:
    await auto_refresh_if_needed()

    # Aprovar post
    if args.approve:
        result = await approve_post(args.id)
        print(json.dumps(result, indent=2, ensure_ascii=False))
        return

    # Publicação confirmada
    if args.confirm:
        result = await do_confirmed_publish(args.confirm_action or "", args.__dict__)
        print(json.dumps(result, indent=2, ensure_ascii=False))
        return

    api = InstagramAPI()

    try:
        caption = args.caption

        # Aplicar template se especificado
        if args.template:
            tpl = Database().get_template_by_name(args.template)
            if tpl:
                caption = tpl["caption_template"]
                if tpl.get("hashtag_set"):
                    hashtags = json.loads(tpl["hashtag_set"]) if isinstance(tpl["hashtag_set"], str) else tpl["hashtag_set"]
                    caption = f"{caption}\n\n{' '.join(hashtags)}"
            if args.vars:
                variables = dict(v.split("=", 1) for v in args.vars)
                caption = _apply_template(caption, variables)

        media_type = normalize_media_type(args.type)

        if media_type == "PHOTO":
            result = await publish_photo(api, args.image, caption, as_draft=args.draft)
        elif media_type in ("VIDEO", "REEL", "STORY"):
            media = args.video or args.image
            if not media:
                print("ERRO: --video ou --image é obrigatório")
                return
            result = await publish_video(api, media, caption, media_type=media_type, as_draft=args.draft)
        elif media_type == "CAROUSEL":
            if not args.images or len(args.images) < 2:
                print("ERRO: --images precisa de 2-10 arquivos")
                return
            result = await publish_carousel(api, args.images, caption, as_draft=args.draft)
        else:
            result = {"status": "error", "message": f"Tipo desconhecido: {args.type}"}

        print(json.dumps(result, indent=2, ensure_ascii=False))

    finally:
        await api.close()


def main():
    parser = argparse.ArgumentParser(description="Publicar no Instagram")
    parser.add_argument("--type", choices=["photo", "video", "reel", "story", "carousel"],
                        help="Tipo de conteúdo")
    parser.add_argument("--image", help="Caminho da imagem ou URL")
    parser.add_argument("--video", help="Caminho do vídeo ou URL")
    parser.add_argument("--images", nargs="+", help="Imagens do carrossel")
    parser.add_argument("--caption", help="Legenda do post")
    parser.add_argument("--draft", action="store_true", help="Criar como rascunho")
    parser.add_argument("--approve", action="store_true", help="Aprovar rascunho")
    parser.add_argument("--id", type=int, help="ID do post (para --approve)")
    parser.add_argument("--template", help="Nome do template a usar")
    parser.add_argument("--vars", nargs="+", help="Variáveis do template (key=value)")
    parser.add_argument("--confirm", help="Confirmar ação (yes/no)")
    parser.add_argument("--confirm-action", dest="confirm_action", help="Ação a confirmar")
    parser.add_argument("--action-id", help="ID da ação a confirmar")
    args = parser.parse_args()

    if not args.approve and not args.confirm and not args.type:
        parser.error("--type é obrigatório para publicação")

    asyncio.run(run(args))


if __name__ == "__main__":
    main()
