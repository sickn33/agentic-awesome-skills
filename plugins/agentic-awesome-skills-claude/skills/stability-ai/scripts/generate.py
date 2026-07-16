"""
Script principal de geracao de imagens via Stability AI API.

Suporta: text-to-image (SD3.5, Ultra, Core), img2img, upscale, inpaint,
remove-background, search-and-replace, erase.

Uso:
    python generate.py --prompt "a mountain sunset" --mode generate
    python generate.py --prompt "watercolor style" --mode img2img --image foto.jpg
    python generate.py --mode upscale --image foto.jpg
    python generate.py --mode remove-bg --image produto.jpg
    python generate.py --list-models
    python generate.py --prompt "retrato fantasy" --analyze --json

Versao: 2.0.0
"""
from __future__ import annotations

import argparse
import base64
import io
import json
import re
import sys
import time
from datetime import datetime
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

sys.path.insert(0, str(Path(__file__).parent))

from config import (
    API_BASE,
    ENDPOINTS,
    MIME_MAP,
    MODELS,
    DEFAULT_MODEL,
    OUTPUT_DIR,
    OUTPUT_SETTINGS,
    USER_AGENT,
    get_api_key,
    get_all_api_keys,
    get_mime_type,
    resolve_aspect_ratio,
    safety_check_daily_limit,
    increment_daily_counter,
    validate_image_file,
)
from styles import apply_style, list_styles


# ── Exceptions ───────────────────────────────────────────────────────────────


class APIError(Exception):
    """Erro generico da API Stability AI."""

    def __init__(self, message: str, status_code: int = 0):
        super().__init__(message)
        self.status_code = status_code


class RateLimitError(APIError):
    """Rate limit (429) atingido."""
    pass


class ContentFilteredError(APIError):
    """Conteudo filtrado pela moderacao."""
    pass


class AuthenticationError(APIError):
    """API key invalida ou ausente (401)."""
    pass


class InsufficientCreditsError(APIError):
    """Creditos insuficientes (402)."""
    pass


# ── API Call ─────────────────────────────────────────────────────────────────


def api_call(
    endpoint: str,
    api_key: str,
    fields: dict,
    files: dict | None = None,
    accept: str = "image/*",
    timeout: int = 180,
) -> tuple[bytes | dict, str, dict]:
    """
    Faz chamada multipart/form-data para a Stability AI API.

    Retorna (data, content_type, response_headers):
    - Se accept="image/*": data = bytes da imagem
    - Se accept="application/json": data = dict parseado
    """
    url = f"{API_BASE}{endpoint}"
    boundary = f"----StabilityBoundary{int(time.time() * 1000)}"

    body = io.BytesIO()

    # Campos de texto
    for key, value in fields.items():
        if value is None:
            continue
        body.write(f"--{boundary}\r\n".encode())
        body.write(f'Content-Disposition: form-data; name="{key}"\r\n\r\n'.encode())
        body.write(f"{value}\r\n".encode())

    # Arquivos (imagens)
    if files:
        for key, filepath in files.items():
            if filepath is None:
                continue
            filepath = Path(filepath)
            validated = validate_image_file(filepath)
            mime = get_mime_type(validated)

            body.write(f"--{boundary}\r\n".encode())
            body.write(
                f'Content-Disposition: form-data; name="{key}"; '
                f'filename="{validated.name}"\r\n'.encode()
            )
            body.write(f"Content-Type: {mime}\r\n\r\n".encode())
            body.write(validated.read_bytes())
            body.write(b"\r\n")

    body.write(f"--{boundary}--\r\n".encode())
    body_bytes = body.getvalue()

    req = Request(
        url,
        data=body_bytes,
        headers={
            "Authorization": f"Bearer {api_key}",
            "Content-Type": f"multipart/form-data; boundary={boundary}",
            "Accept": accept,
            "User-Agent": USER_AGENT,
        },
        method="POST",
    )

    try:
        with urlopen(req, timeout=timeout) as resp:
            content_type = resp.headers.get("Content-Type", "")
            headers = dict(resp.headers)
            data = resp.read()

            if "application/json" in content_type:
                return json.loads(data.decode("utf-8")), "application/json", headers
            return data, content_type, headers

    except HTTPError as e:
        error_body = e.read().decode("utf-8", errors="replace")
        # Mask API key in error output to prevent credential leakage
        if api_key and api_key in error_body:
            masked_key = f"{api_key[:6]}...masked" if len(api_key) >= 6 else "***masked***"
            error_body = error_body.replace(api_key, masked_key)
        try:
            error_json = json.loads(error_body)
            error_msg = json.dumps(error_json, indent=2, ensure_ascii=False)
        except json.JSONDecodeError:
            error_msg = error_body[:500]

        if e.code == 401:
            raise AuthenticationError(f"API key invalida ou ausente.\n{error_msg}", e.code)
        if e.code == 402:
            raise InsufficientCreditsError(f"Creditos insuficientes.\n{error_msg}", e.code)
        if e.code == 403:
            raise ContentFilteredError(f"Conteudo filtrado pela moderacao.\n{error_msg}", e.code)
        if e.code == 429:
            raise RateLimitError(f"Rate limit atingido.\n{error_msg}", e.code)
        raise APIError(f"HTTP {e.code}: {error_msg}", e.code)

    except URLError as e:
        raise APIError(f"Erro de conexao: {e.reason}")
    except TimeoutError:
        raise APIError(f"Timeout ({timeout}s) na chamada para {url}")


# ── Geracao ──────────────────────────────────────────────────────────────────


def generate_image(
    prompt: str,
    mode: str = "generate",
    model: str = DEFAULT_MODEL,
    aspect_ratio: str = "1:1",
    style: str | None = None,
    negative_prompt: str | None = None,
    image_path: str | None = None,
    mask_path: str | None = None,
    search_prompt: str | None = None,
    strength: float | None = None,
    seed: int | None = None,
    raw: bool = False,
    output_dir: Path | None = None,
    api_key: str | None = None,
) -> list[dict]:
    """
    Gera imagem(ns) e salva no disco.

    Retorna lista de dicts com info de cada imagem:
    [{"path": Path, "size_kb": float, "time_s": float, "seed": int|None}]
    """
    output_dir = output_dir or OUTPUT_DIR
    output_dir.mkdir(parents=True, exist_ok=True)

    # Safety check
    allowed, msg = safety_check_daily_limit(1)
    if not allowed:
        print(f"BLOQUEADO: {msg}", file=sys.stderr)
        return []

    # Aplicar estilo
    final_prompt = prompt or ""
    style_negative = None
    if not raw and style:
        final_prompt, style_negative = apply_style(final_prompt, style)
    if not negative_prompt and style_negative:
        negative_prompt = style_negative

    # Obter API keys
    keys = [api_key] if api_key else get_all_api_keys()
    if not keys:
        print(
            "\nERRO: Nenhuma STABILITY_API_KEY encontrada!\n"
            "Configure em .env ou variavel de ambiente.\n"
            "Obtenha sua key gratuita em: https://platform.stability.ai\n",
            file=sys.stderr,
        )
        return []

    # Determinar endpoint
    endpoint = _resolve_endpoint(mode, model)

    # Montar campos e arquivos
    fields, files = _build_request(
        mode=mode, model=model, prompt=final_prompt,
        aspect_ratio=aspect_ratio, negative_prompt=negative_prompt,
        image_path=image_path, mask_path=mask_path,
        search_prompt=search_prompt, strength=strength, seed=seed,
    )

    # Retry loop com fallback de keys
    max_retries = 3
    image_data = None
    resp_headers: dict = {}
    elapsed = 0.0
    used_key_index = 0

    for attempt in range(max_retries):
        for i, key in enumerate(keys):
            try:
                start_time = time.time()
                data, content_type, resp_headers = api_call(
                    endpoint=endpoint, api_key=key,
                    fields=fields, files=files, accept="image/*",
                )
                elapsed = time.time() - start_time

                if isinstance(data, bytes) and len(data) > 100:
                    image_data = data
                    used_key_index = i
                    break

                if isinstance(data, dict) and "image" in data:
                    image_data = base64.b64decode(data["image"])
                    used_key_index = i
                    break

                print(f"Resposta inesperada (tipo: {content_type}, tamanho: {len(data) if isinstance(data, bytes) else 'dict'})",
                      file=sys.stderr)

            except AuthenticationError as e:
                print(f"Key {i+1} invalida: {e}", file=sys.stderr)
                continue  # Tentar proxima key

            except InsufficientCreditsError as e:
                print(f"ERRO: {e}", file=sys.stderr)
                return []  # Nao adianta retry

            except ContentFilteredError as e:
                print(f"BLOQUEADO: Conteudo filtrado pela moderacao.\n{e}", file=sys.stderr)
                return []  # Nao adianta retry

            except RateLimitError:
                wait = 15 * (attempt + 1)
                print(f"Rate limit. Aguardando {wait}s...", file=sys.stderr)
                time.sleep(wait)
                break  # Retry com todas as keys

            except APIError as e:
                is_last_key = i >= len(keys) - 1
                if not is_last_key:
                    print(f"Key {i+1} falhou, tentando backup...", file=sys.stderr)
                    continue
                if attempt < max_retries - 1:
                    wait = 5 * (attempt + 1)
                    print(f"Erro. Retry em {wait}s...", file=sys.stderr)
                    time.sleep(wait)
                    break
                print(f"ERRO: {e}", file=sys.stderr)
                return []

            except Exception as e:
                print(f"ERRO inesperado: {type(e).__name__}: {e}", file=sys.stderr)
                if attempt >= max_retries - 1:
                    return []
                time.sleep(5)
                break

        if image_data:
            break

    if not image_data:
        print("ERRO: Nenhuma imagem gerada apos todas as tentativas.", file=sys.stderr)
        return []

    # Salvar imagem
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    style_tag = style or ("raw" if raw else "default")
    filename = f"{mode}_{style_tag}_{timestamp}_0.png"
    filepath = output_dir / filename

    filepath.write_bytes(image_data)
    increment_daily_counter(1)

    size_kb = len(image_data) / 1024
    resp_seed = resp_headers.get("seed") or resp_headers.get("Seed")

    # Salvar metadados
    if OUTPUT_SETTINGS["save_metadata"]:
        metadata = {
            "original_prompt": prompt,
            "final_prompt": final_prompt,
            "mode": mode,
            "model": model,
            "style": style,
            "aspect_ratio": aspect_ratio,
            "negative_prompt": negative_prompt,
            "seed": resp_seed or seed,
            "strength": strength,
            "image_path": str(image_path) if image_path else None,
            "mask_path": str(mask_path) if mask_path else None,
            "search_prompt": search_prompt,
            "raw": raw,
            "generation_time_seconds": round(elapsed, 2),
            "file_size_bytes": len(image_data),
            "file_size_kb": round(size_kb, 1),
            "generated_at": datetime.now().isoformat(),
            "api_key_index": used_key_index,
            "finish_reason": resp_headers.get("finish-reason", "SUCCESS"),
            "skill_version": "2.0.0",
        }
        meta_path = output_dir / f"{filename}.meta.json"
        meta_path.write_text(
            json.dumps(metadata, indent=2, ensure_ascii=False, default=str),
            encoding="utf-8",
        )

    print(f"Imagem salva: {filepath}")
    print(f"Tamanho: {size_kb:.1f} KB")
    print(f"Tempo: {elapsed:.1f}s")

    return [{"path": filepath, "size_kb": round(size_kb, 1), "time_s": round(elapsed, 1), "seed": resp_seed}]


# ── Helpers ──────────────────────────────────────────────────────────────────


def _resolve_endpoint(mode: str, model: str) -> str:
    """Determina o endpoint da API com base no modo e modelo."""
    mode_map = {
        "generate": MODELS.get(model, {}).get("endpoint", "generate_sd3"),
        "ultra": "generate_ultra",
        "core": "generate_core",
        "img2img": "generate_sd3",
        "upscale": "upscale_conservative",
        "upscale-creative": "upscale_creative",
        "remove-bg": "remove_bg",
        "inpaint": "inpaint",
        "search-replace": "search_replace",
        "erase": "erase",
    }
    endpoint_key = mode_map.get(mode, "generate_sd3")
    return ENDPOINTS.get(endpoint_key, ENDPOINTS["generate_sd3"])


def _build_request(
    mode: str,
    model: str,
    prompt: str,
    aspect_ratio: str,
    negative_prompt: str | None,
    image_path: str | None,
    mask_path: str | None,
    search_prompt: str | None,
    strength: float | None,
    seed: int | None,
) -> tuple[dict, dict | None]:
    """Monta campos e arquivos para a request multipart."""
    fields: dict = {}
    files: dict | None = None

    # Campos comuns de texto
    common_text_fields = {}
    if negative_prompt:
        common_text_fields["negative_prompt"] = negative_prompt
    if seed is not None:
        common_text_fields["seed"] = str(seed)
    common_text_fields["output_format"] = "png"

    if mode in ("generate", "img2img"):
        fields["prompt"] = prompt
        fields.update(common_text_fields)
        if mode == "generate":
            fields["aspect_ratio"] = aspect_ratio
            model_config = MODELS.get(model, MODELS[DEFAULT_MODEL])
            if model_config["endpoint"] == "generate_sd3":
                fields["model"] = model_config["id"]
        if mode == "img2img" and image_path:
            fields["mode"] = "image-to-image"
            if strength is not None:
                fields["strength"] = str(min(max(strength, 0.0), 1.0))
            files = {"image": image_path}

    elif mode in ("ultra", "core"):
        fields["prompt"] = prompt
        fields["aspect_ratio"] = aspect_ratio
        fields.update(common_text_fields)

    elif mode in ("upscale", "upscale-creative"):
        fields.update(common_text_fields)
        if prompt:
            fields["prompt"] = prompt
        files = {"image": image_path}

    elif mode == "remove-bg":
        fields["output_format"] = "png"
        files = {"image": image_path}

    elif mode == "inpaint":
        fields["prompt"] = prompt
        fields.update(common_text_fields)
        files = {"image": image_path}
        if mask_path:
            files["mask"] = mask_path

    elif mode == "search-replace":
        fields["prompt"] = prompt
        fields.update(common_text_fields)
        if search_prompt:
            fields["search_prompt"] = search_prompt
        files = {"image": image_path}

    elif mode == "erase":
        fields["output_format"] = "png"
        files = {"image": image_path}
        if mask_path:
            files["mask"] = mask_path

    return fields, files


def analyze_prompt(prompt: str) -> dict:
    """Analisa prompt e sugere configuracoes ideais."""
    prompt_lower = prompt.lower()

    # Detectar estilo
    style = None
    style_hints = {
        "photorealistic": ["foto", "photo", "realistic", "camera", "portrait", "dslr"],
        "anime": ["anime", "manga", "ghibli", "kawaii", "chibi", "otaku"],
        "digital-art": ["digital", "artstation", "deviantart", "digital art"],
        "oil-painting": ["oil", "oleo", "canvas", "pintura classica"],
        "watercolor": ["watercolor", "aquarela", "wash", "aguada"],
        "pixel-art": ["pixel", "8-bit", "16-bit", "retro game", "sprite"],
        "3d-render": ["3d", "render", "blender", "unreal", "octane", "cinema4d"],
        "concept-art": ["concept", "concept art", "game art", "matte painting"],
        "comic": ["comic", "hq", "quadrinho", "manga style", "graphic novel"],
        "fantasy": ["fantasy", "magic", "dragon", "elf", "medieval", "enchanted"],
        "sci-fi": ["sci-fi", "cyberpunk", "futuristic", "space", "neon", "cyber"],
        "sketch": ["sketch", "pencil", "drawing", "charcoal", "lapis", "rascunho"],
        "noir": ["noir", "black and white", "detective", "moody", "shadows"],
        "pop-art": ["pop art", "warhol", "bold colors", "vibrante"],
        "minimalist": ["minimalist", "clean", "simple", "flat design"],
    }
    for style_name, keywords in style_hints.items():
        if any(kw in prompt_lower for kw in keywords):
            style = style_name
            break

    # Detectar aspect ratio
    ratio = "1:1"
    ratio_hints = {
        "16:9": ["landscape", "paisagem", "wide", "panorama", "cinema", "wallpaper", "widescreen"],
        "9:16": ["portrait", "retrato", "vertical", "stories", "mobile", "phone", "tiktok", "reels"],
        "2:3": ["poster", "book", "cover", "pinterest", "cartaz"],
        "3:2": ["photo", "foto", "horizontal", "banner"],
        "4:5": ["instagram", "ig", "feed"],
    }
    for r, keywords in ratio_hints.items():
        if any(kw in prompt_lower for kw in keywords):
            ratio = r
            break

    # Detectar modelo
    suggested_model = "sd3.5-large"
    if any(kw in prompt_lower for kw in ["ultra", "premium", "best quality", "8k", "4k", "maximum"]):
        suggested_model = "ultra"
    elif any(kw in prompt_lower for kw in ["quick", "fast", "rapido", "draft", "rascunho"]):
        suggested_model = "sd3.5-large-turbo"
    elif any(kw in prompt_lower for kw in ["core", "simple", "simples", "basico"]):
        suggested_model = "core"

    # Detectar modo
    suggested_mode = "generate"
    if any(kw in prompt_lower for kw in ["upscale", "increase resolution", "melhorar resolucao", "aumentar"]):
        suggested_mode = "upscale"
    elif any(kw in prompt_lower for kw in ["remove background", "remover fundo", "sem fundo", "transparente"]):
        suggested_mode = "remove-bg"
    elif any(kw in prompt_lower for kw in ["inpaint", "editar parte", "modificar area"]):
        suggested_mode = "inpaint"
    elif any(kw in prompt_lower for kw in ["replace", "substituir", "trocar"]):
        suggested_mode = "search-replace"
    elif any(kw in prompt_lower for kw in ["erase", "apagar", "remover objeto"]):
        suggested_mode = "erase"

    return {
        "suggested_style": style,
        "suggested_aspect_ratio": ratio,
        "suggested_model": suggested_model,
        "suggested_mode": suggested_mode,
        "prompt": prompt,
    }


# ── CLI ──────────────────────────────────────────────────────────────────────


def main():
    parser = argparse.ArgumentParser(
        description="Gerar imagens via Stability AI (Stable Diffusion 3.5, Ultra, Core)",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=(
            "Exemplos:\n"
            '  python generate.py --prompt "mountain sunset" --mode generate\n'
            '  python generate.py --prompt "watercolor cat" --style watercolor\n'
            '  python generate.py --prompt "epic portrait" --mode ultra --aspect-ratio wide\n'
            '  python generate.py --mode upscale --image foto.jpg\n'
            '  python generate.py --mode remove-bg --image produto.jpg\n'
            "  python generate.py --list-models\n"
            "  python generate.py --list-styles\n"
        ),
    )

    # Principal
    parser.add_argument("--prompt", type=str, help="Prompt de texto para geracao")
    parser.add_argument(
        "--mode", type=str, default="generate",
        choices=["generate", "ultra", "core", "img2img", "upscale", "upscale-creative",
                 "remove-bg", "inpaint", "search-replace", "erase"],
        help="Modo de geracao (default: generate)",
    )

    # Modelo e estilo
    parser.add_argument("--model", type=str, default=DEFAULT_MODEL, help=f"Modelo (default: {DEFAULT_MODEL})")
    parser.add_argument("--style", type=str, default=None, help="Estilo pre-configurado")
    parser.add_argument("--aspect-ratio", type=str, default="1:1", help="Aspect ratio (ex: 16:9, square, ig)")
    parser.add_argument("--negative-prompt", type=str, default=None, help="O que evitar na imagem")
    parser.add_argument("--seed", type=int, default=None, help="Seed para reprodutibilidade")
    parser.add_argument("--strength", type=float, default=None, help="Forca para img2img (0.0-1.0)")
    parser.add_argument("--raw", action="store_true", help="Nao aplicar estilo, usar prompt como esta")

    # Imagens de entrada
    parser.add_argument("--image", type=str, default=None, help="Imagem de entrada")
    parser.add_argument("--mask", type=str, default=None, help="Mascara para inpainting/erase")
    parser.add_argument("--search", type=str, default=None, help="Texto para search-and-replace")

    # Output
    parser.add_argument("--output", type=Path, default=None, help="Diretorio de saida")

    # Utilidades
    parser.add_argument("--analyze", action="store_true", help="Analisar prompt e sugerir config")
    parser.add_argument("--list-models", action="store_true", help="Listar modelos disponiveis")
    parser.add_argument("--list-styles", action="store_true", help="Listar estilos disponiveis")
    parser.add_argument("--json", action="store_true", help="Saida em JSON")

    args = parser.parse_args()

    # --- Utilidades ---
    if args.list_models:
        if args.json:
            print(json.dumps(MODELS, indent=2, ensure_ascii=False))
        else:
            print("\n  Modelos Disponiveis:\n")
            for key, m in MODELS.items():
                print(f"  {key:25s} {m['name']}")
                print(f"  {'':25s} {m['description']}")
                print(f"  {'':25s} Custo: {m['cost']}\n")
        return

    if args.list_styles:
        styles = list_styles()
        if args.json:
            print(json.dumps(styles, indent=2, ensure_ascii=False))
        else:
            print("\n  Estilos Disponiveis:\n")
            for key, s in styles.items():
                print(f"  {key:20s} {s['name']}")
        return

    if args.analyze:
        if not args.prompt:
            print("ERRO: --analyze requer --prompt", file=sys.stderr)
            sys.exit(1)
        result = analyze_prompt(args.prompt)
        if args.json:
            print(json.dumps(result, indent=2, ensure_ascii=False))
        else:
            print("\n  Analise do Prompt:\n")
            for k, v in result.items():
                print(f"  {k:30s} {v}")
        return

    # --- Validacao ---
    needs_prompt = args.mode in ("generate", "ultra", "core", "img2img", "inpaint", "search-replace")
    needs_image = args.mode in ("img2img", "upscale", "upscale-creative", "remove-bg", "inpaint", "search-replace", "erase")

    if needs_prompt and not args.prompt:
        print(f"ERRO: modo '{args.mode}' requer --prompt", file=sys.stderr)
        sys.exit(1)
    if needs_image and not args.image:
        print(f"ERRO: modo '{args.mode}' requer --image", file=sys.stderr)
        sys.exit(1)

    # --- Execucao ---
    aspect = resolve_aspect_ratio(args.aspect_ratio)

    print("=" * 60)
    print("  STABILITY AI - Gerando Imagem")
    print("=" * 60)
    print(f"  Modo:           {args.mode}")
    print(f"  Modelo:         {args.model}")
    if args.style:
        print(f"  Estilo:         {args.style}")
    print(f"  Aspect Ratio:   {aspect}")
    if args.image:
        print(f"  Imagem input:   {args.image}")
    print("=" * 60)
    print()

    results = generate_image(
        prompt=args.prompt or "",
        mode=args.mode, model=args.model, aspect_ratio=aspect,
        style=args.style, negative_prompt=args.negative_prompt,
        image_path=args.image, mask_path=args.mask,
        search_prompt=args.search, strength=args.strength,
        seed=args.seed, raw=args.raw, output_dir=args.output,
    )

    if args.json:
        output = {
            "generated": [str(r["path"]) for r in results],
            "count": len(results),
            "output_dir": str(results[0]["path"].parent) if results else None,
            "details": [{
                "path": str(r["path"]),
                "size_kb": r["size_kb"],
                "time_s": r["time_s"],
                "seed": r.get("seed"),
            } for r in results],
        }
        print(json.dumps(output, indent=2, ensure_ascii=False))

    if not results:
        sys.exit(1)


if __name__ == "__main__":
    main()
