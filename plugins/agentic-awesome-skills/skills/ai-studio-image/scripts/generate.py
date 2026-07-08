"""
AI Studio Image — Gerador de Imagens (v2 — Enhanced)

Script principal que conecta com Google AI Studio (Gemini/Imagen)
para gerar imagens humanizadas. Suporta todos os modelos oficiais,
fallback automatico de API keys, e metadados completos.
"""

import argparse
import base64
import json
import re
import sys
import time
from datetime import datetime
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from config import (
    MODELS,
    DEFAULT_MODEL,
    DEFAULT_FORMAT,
    DEFAULT_HUMANIZATION,
    DEFAULT_MODE,
    DEFAULT_RESOLUTION,
    DEFAULT_PERSON_GENERATION,
    IMAGE_FORMATS,
    FORMAT_ALIASES,
    OUTPUTS_DIR,
    OUTPUT_SETTINGS,
    get_api_key,
    get_all_api_keys,
    safety_check_model,
    safety_check_daily_limit,
)
from prompt_engine import humanize_prompt, analyze_prompt, resolve_format


def _check_dependencies():
    """Verifica dependencias necessarias."""
    try:
        import google.genai  # noqa: F401
    except ImportError:
        print("=" * 60)
        print("  DEPENDENCIA FALTANDO: google-genai")
        print("=" * 60)
        print()
        print("  Instale com:")
        print("    pip install google-genai Pillow python-dotenv")
        print()
        print("  Ou use o requirements.txt:")
        scripts_dir = Path(__file__).parent
        print(f"    pip install -r {scripts_dir / 'requirements.txt'}")
        print()
        sys.exit(1)


def _get_client(api_key: str):
    """Cria cliente Google GenAI."""
    from google import genai
    return genai.Client(api_key=api_key)


# =============================================================================
# GERACAO VIA IMAGEN (imagen-4, imagen-4-ultra, imagen-4-fast)
# =============================================================================

def generate_with_imagen(
    prompt: str,
    model_id: str,
    aspect_ratio: str,
    num_images: int,
    api_key: str,
    resolution: str = "1K",
    person_generation: str = DEFAULT_PERSON_GENERATION,
) -> list[dict]:
    """Gera imagens usando Imagen 4."""
    from google.genai import types

    client = _get_client(api_key)

    config_params = {
        "number_of_images": num_images,
        "aspect_ratio": aspect_ratio,
        "output_mime_type": OUTPUT_SETTINGS["default_mime_type"],
        "person_generation": person_generation,
    }

    # Resolucao (apenas Standard e Ultra suportam 2K)
    if resolution in ("2K",) and "fast" not in model_id:
        config_params["image_size"] = resolution

    config = types.GenerateImagesConfig(**config_params)

    response = client.models.generate_images(
        model=model_id,
        prompt=prompt,
        config=config,
    )

    results = []
    if response.generated_images:
        for img in response.generated_images:
            img_bytes = img.image.image_bytes
            if isinstance(img_bytes, str):
                img_bytes = base64.b64decode(img_bytes)
            results.append({
                "image_bytes": img_bytes,
                "mime_type": OUTPUT_SETTINGS["default_mime_type"],
            })

    return results


# =============================================================================
# GERACAO VIA GEMINI (gemini-flash-image, gemini-pro-image)
# =============================================================================

def generate_with_gemini(
    prompt: str,
    model_id: str,
    aspect_ratio: str,
    api_key: str,
    resolution: str = "1K",
    reference_images: list[Path] | None = None,
) -> list[dict]:
    """Gera imagens usando Gemini (generateContent com modalidade IMAGE)."""
    from google.genai import types
    from PIL import Image

    client = _get_client(api_key)

    # Construir contents
    contents = []

    # Adicionar imagens de referencia (se Gemini Pro Image)
    if reference_images:
        for ref_path in reference_images:
            if Path(ref_path).exists():
                contents.append(Image.open(str(ref_path)))

    contents.append(prompt)

    # Alguns modelos (ex: gemini-2.0-flash-exp) nao suportam aspect_ratio/ImageConfig
    # Verificar via config ou fallback por ID
    supports_ar = True
    for _mk, _mc in MODELS.items():
        if _mc["id"] == model_id:
            supports_ar = _mc.get("supports_aspect_ratio", True)
            break

    if not supports_ar:
        config = types.GenerateContentConfig(
            response_modalities=["TEXT", "IMAGE"],
        )
    else:
        # Config com modalidades e aspect ratio
        image_config = types.ImageConfig(aspect_ratio=aspect_ratio)

        # Resolucao (Pro suporta ate 4K)
        if resolution in ("2K", "4K") and "pro" in model_id.lower():
            image_config = types.ImageConfig(
                aspect_ratio=aspect_ratio,
                image_size=resolution,
            )

        config = types.GenerateContentConfig(
            response_modalities=["TEXT", "IMAGE"],
            image_config=image_config,
        )

    response = client.models.generate_content(
        model=model_id,
        contents=contents,
        config=config,
    )

    results = []
    if response.candidates:
        for candidate in response.candidates:
            if candidate.content and candidate.content.parts:
                for part in candidate.content.parts:
                    if hasattr(part, 'inline_data') and part.inline_data:
                        img_bytes = part.inline_data.data
                        if isinstance(img_bytes, str):
                            img_bytes = base64.b64decode(img_bytes)
                        results.append({
                            "image_bytes": img_bytes,
                            "mime_type": part.inline_data.mime_type or "image/png",
                        })

    return results


# =============================================================================
# SALVAR IMAGEM + METADADOS
# =============================================================================

def save_image(
    image_data: dict,
    output_dir: Path,
    mode: str,
    template: str,
    index: int,
    metadata: dict,
) -> Path:
    """Salva imagem e metadados no disco."""
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    mime = image_data.get("mime_type", "image/png")
    ext = "png" if "png" in mime else "jpg"

    # Nome descritivo
    template_clean = template.replace(" ", "-")[:20]
    filename = f"{mode}_{template_clean}_{timestamp}_{index}.{ext}"
    filepath = output_dir / filename

    # Salvar imagem
    filepath.write_bytes(image_data["image_bytes"])

    # Salvar metadados
    if OUTPUT_SETTINGS["save_metadata"]:
        meta_path = output_dir / f"{filename}.meta.json"
        meta_path.write_text(
            json.dumps(metadata, indent=2, ensure_ascii=False, default=str),
            encoding="utf-8",
        )

    return filepath


# =============================================================================
# FUNCAO PRINCIPAL — COM FALLBACK DE API KEYS
# =============================================================================

def generate(
    prompt: str,
    mode: str = DEFAULT_MODE,
    format_name: str = DEFAULT_FORMAT,
    humanization: str = DEFAULT_HUMANIZATION,
    lighting: str | None = None,
    model_name: str = DEFAULT_MODEL,
    num_images: int = 1,
    template: str = "custom",
    template_context: str | None = None,
    output_dir: Path | None = None,
    skip_humanization: bool = False,
    resolution: str = DEFAULT_RESOLUTION,
    person_generation: str = DEFAULT_PERSON_GENERATION,
    reference_images: list[Path] | None = None,
    shot_type: str | None = None,
    force_paid: bool = False,
) -> list[Path]:
    """
    Funcao principal de geracao de imagens.

    Fluxo:
    1. Valida e tenta API keys com fallback
    2. Humaniza o prompt (se nao skip)
    3. Chama a API apropriada (Imagen ou Gemini)
    4. Salva imagens + metadados completos
    5. Retorna paths dos arquivos gerados
    """
    # 0. CONTROLADOR DE SEGURANCA — verifica modelo e limite diario
    allowed, msg = safety_check_model(model_name, force=force_paid)
    if not allowed:
        raise SystemExit(f"[SAFETY] {msg}")
    print(f"[SAFETY] {msg}")

    allowed, msg = safety_check_daily_limit(num_images)
    if not allowed:
        raise SystemExit(f"[SAFETY] {msg}")
    print(f"[SAFETY] {msg}")

    # 1. Obter API keys
    api_keys = get_all_api_keys()
    if not api_keys:
        print("=" * 60)
        print("  ERRO: Nenhuma GEMINI_API_KEY encontrada!")
        print("=" * 60)
        print()
        print("  Configure de uma dessas formas:")
        print("  1. Variavel de ambiente: set GEMINI_API_KEY=sua-key")
        print("  2. Arquivo .env em: C:\\Users\\renat\\skills\\ai-studio-image\\")
        print()
        print("  Obtenha sua key em: https://aistudio.google.com/apikey")
        sys.exit(1)

    # 2. Resolver formato (suporta aliases)
    format_name = resolve_format(format_name)
    if format_name not in IMAGE_FORMATS:
        format_name = DEFAULT_FORMAT

    # 3. Humanizar prompt
    if skip_humanization:
        final_prompt = prompt
    else:
        final_prompt = humanize_prompt(
            user_prompt=prompt,
            mode=mode,
            humanization=humanization,
            lighting=lighting,
            template_context=template_context,
            shot_type=shot_type,
            resolution=resolution,
        )

    # 4. Configuracoes do modelo
    model_config = MODELS.get(model_name, MODELS[DEFAULT_MODEL])
    format_config = IMAGE_FORMATS[format_name]
    aspect_ratio = format_config["aspect_ratio"]

    if output_dir is None:
        output_dir = OUTPUTS_DIR
    output_dir.mkdir(parents=True, exist_ok=True)

    num_images = min(num_images, model_config["max_images"])

    print("=" * 60)
    print("  AI STUDIO IMAGE — Gerando Imagem Humanizada")
    print("=" * 60)
    print(f"  Modelo:         {model_config['id']}")
    print(f"  Tipo:           {model_config['type']}")
    print(f"  Modo:           {mode}")
    print(f"  Formato:        {format_name} ({aspect_ratio})")
    print(f"  Humanizacao:    {humanization}")
    print(f"  Resolucao:      {resolution}")
    print(f"  Imagens:        {num_images}")
    if lighting:
        print(f"  Iluminacao:     {lighting}")
    if reference_images:
        print(f"  Referencias:    {len(reference_images)} imagem(ns)")
    print(f"  Output:         {output_dir}")
    print("=" * 60)
    print()

    # 5. Gerar com fallback de API keys
    images = []
    used_key_index = 0
    start_time = time.time()

    max_retries = 3
    retry_delay = 15  # seconds

    for attempt in range(max_retries):
        for i, api_key in enumerate(api_keys):
            try:
                if model_config["type"] == "imagen":
                    images = generate_with_imagen(
                        prompt=final_prompt,
                        model_id=model_config["id"],
                        aspect_ratio=aspect_ratio,
                        num_images=num_images,
                        api_key=api_key,
                        resolution=resolution,
                        person_generation=person_generation,
                    )
                else:
                    images = generate_with_gemini(
                        prompt=final_prompt,
                        model_id=model_config["id"],
                        aspect_ratio=aspect_ratio,
                        api_key=api_key,
                        resolution=resolution,
                        reference_images=reference_images,
                    )

                if images:
                    used_key_index = i
                    break

            except Exception as e:
                error_msg = str(e)
                is_rate_limit = "429" in error_msg or "RESOURCE_EXHAUSTED" in error_msg
                is_last_key = i >= len(api_keys) - 1

                if not is_last_key:
                    print(f"  Key {i+1} falhou ({error_msg[:60]}...), tentando backup...")
                    continue
                elif is_rate_limit and attempt < max_retries - 1:
                    # Extrair delay sugerido da resposta se possivel
                    delay_match = re.search(r'retryDelay.*?(\d+)', error_msg)
                    wait_time = int(delay_match.group(1)) if delay_match else retry_delay
                    wait_time = min(wait_time + 5, 60)  # cap at 60s
                    print(f"  Rate limit atingido. Aguardando {wait_time}s (tentativa {attempt+1}/{max_retries})...")
                    time.sleep(wait_time)
                    break  # Break inner loop to retry all keys
                else:
                    print(f"\n  ERRO: Todas as tentativas falharam.")
                    print(f"  Ultimo erro: {error_msg[:200]}")
                    print()
                    if is_rate_limit:
                        print("  Rate limit esgotado. Sugestoes:")
                        print("  - Aguarde alguns minutos e tente novamente")
                        print("  - Habilite billing no Google Cloud para limites maiores")
                        print("  - Use um modelo diferente (--model imagen-4-fast)")
                    else:
                        print("  Dicas:")
                        print("  - Verifique se a API key e valida")
                        print("  - O prompt pode conter conteudo restrito")
                        print("  - Tente simplificar o prompt")
                    print("  - Verifique: https://aistudio.google.com/")
                    return []

        if images:
            break

    elapsed = time.time() - start_time

    if not images:
        print("\n  Nenhuma imagem gerada. Verifique o prompt e tente novamente.")
        return []

    # 6. Salvar imagens e metadados
    metadata = {
        "original_prompt": prompt,
        "humanized_prompt": final_prompt,
        "mode": mode,
        "format": format_name,
        "aspect_ratio": aspect_ratio,
        "humanization": humanization,
        "lighting": lighting,
        "shot_type": shot_type,
        "model": model_config["id"],
        "model_name": model_name,
        "model_type": model_config["type"],
        "resolution": resolution,
        "person_generation": person_generation,
        "template": template,
        "num_images_requested": num_images,
        "num_images_generated": len(images),
        "generation_time_seconds": round(elapsed, 2),
        "api_key_index": used_key_index,
        "generated_at": datetime.now().isoformat(),
        "reference_images": [str(p) for p in (reference_images or [])],
    }

    saved_paths = []
    for idx, img_data in enumerate(images):
        filepath = save_image(
            image_data=img_data,
            output_dir=output_dir,
            mode=mode,
            template=template,
            index=idx,
            metadata=metadata,
        )
        saved_paths.append(filepath)
        print(f"  Salvo: {filepath}")

    print(f"\n  {len(saved_paths)} imagem(ns) gerada(s) em {elapsed:.1f}s")

    # Salvar prompt humanizado para referencia
    if OUTPUT_SETTINGS["save_prompt"]:
        prompt_file = output_dir / f"last_prompt_{datetime.now().strftime('%Y%m%d_%H%M%S')}.txt"
        content = f"ORIGINAL:\n{prompt}\n\nHUMANIZED:\n{final_prompt}"
        prompt_file.write_text(content, encoding="utf-8")

    return saved_paths


# =============================================================================
# CLI
# =============================================================================

def main():
    parser = argparse.ArgumentParser(
        description="Gerar imagens humanizadas via Google AI Studio",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Exemplos:
  python generate.py --prompt "mulher tomando cafe" --mode influencer
  python generate.py --prompt "professor explicando" --mode educacional --format widescreen
  python generate.py --template cafe-lifestyle --custom "ruiva, 25 anos"
  python generate.py --prompt "produto na mesa" --model imagen-4-ultra --resolution 2K
  python generate.py --prompt "paisagem" --format ultrawide --lighting golden-hour
        """,
    )

    # Prompt ou Template
    parser.add_argument("--prompt", help="Descricao da imagem desejada")
    parser.add_argument("--template", help="Nome do template pre-configurado")
    parser.add_argument("--custom", help="Personalizacao sobre o template")

    # Configuracoes principais
    parser.add_argument("--mode", default=DEFAULT_MODE,
                       choices=["influencer", "educacional"])
    parser.add_argument("--format", default=DEFAULT_FORMAT,
                       help="Formato (square, portrait, landscape, stories, widescreen, ultrawide, "
                            "ou aspect ratio como 4:5, 16:9, etc)")
    parser.add_argument("--humanization", default=DEFAULT_HUMANIZATION,
                       choices=["ultra", "natural", "polished", "editorial"])
    parser.add_argument("--lighting",
                       choices=["morning", "golden-hour", "midday", "overcast",
                               "night", "indoor", "blue-hour", "shade"])
    parser.add_argument("--shot-type",
                       help="Tipo de enquadramento (close-up, medium, wide, etc)")

    # Modelo e qualidade
    parser.add_argument("--model", default=DEFAULT_MODEL,
                       choices=list(MODELS.keys()),
                       help=f"Modelo (default: {DEFAULT_MODEL})")
    parser.add_argument("--resolution", default=DEFAULT_RESOLUTION,
                       choices=["1K", "2K", "4K"])
    parser.add_argument("--variations", type=int, default=1,
                       help="Numero de variacoes (1-4)")

    # Avancado
    parser.add_argument("--reference-images", nargs="+", type=Path,
                       help="Imagens de referencia (apenas Gemini Pro Image)")
    parser.add_argument("--person-generation", default=DEFAULT_PERSON_GENERATION,
                       choices=["dont_allow", "allow_adult", "allow_all"])
    parser.add_argument("--skip-humanization", action="store_true",
                       help="Enviar prompt diretamente sem humanizacao")
    parser.add_argument("--force-paid", action="store_true",
                       help="Permite usar modelos com custo (imagen-4, etc). USE COM CUIDADO.")

    # Output
    parser.add_argument("--output", type=Path, help="Diretorio de saida customizado")

    # Utilidades
    parser.add_argument("--analyze", action="store_true",
                       help="Apenas analisa o prompt e sugere configuracoes")
    parser.add_argument("--list-models", action="store_true",
                       help="Lista todos os modelos disponiveis")
    parser.add_argument("--list-formats", action="store_true",
                       help="Lista todos os formatos disponiveis")
    parser.add_argument("--json", action="store_true")

    args = parser.parse_args()

    # Listar modelos
    if args.list_models:
        print("\nModelos disponiveis:\n")
        for name, cfg in MODELS.items():
            print(f"  {name:25s} {cfg['description']}")
            print(f"  {'':25s} ID: {cfg['id']}")
            print(f"  {'':25s} Max imagens: {cfg['max_images']} | "
                  f"Max res: {cfg.get('max_resolution', 'N/A')}")
            print()
        return

    # Listar formatos
    if args.list_formats:
        print("\nFormatos disponiveis:\n")
        for name, cfg in IMAGE_FORMATS.items():
            print(f"  {name:20s} {cfg['aspect_ratio']:8s} {cfg['description']}")
        print("\nAliases aceitos:\n")
        for alias, target in sorted(FORMAT_ALIASES.items()):
            if alias != target:
                print(f"  {alias:25s} -> {target}")
        return

    # Modo analise
    if args.analyze:
        if not args.prompt:
            print("ERRO: --prompt obrigatorio com --analyze")
            sys.exit(1)
        analysis = analyze_prompt(args.prompt)
        if args.json:
            print(json.dumps(analysis, indent=2, ensure_ascii=False))
        else:
            print("\nAnalise do prompt:\n")
            for k, v in analysis.items():
                if k != "analysis":
                    print(f"  {k:20s} {v or 'auto'}")
        return

    # Template ou prompt
    template_context = None
    if args.template:
        from templates import get_template
        tmpl = get_template(args.template)
        if not tmpl:
            print(f"ERRO: Template '{args.template}' nao encontrado")
            print("Use: python templates.py --list")
            sys.exit(1)

        prompt = tmpl["prompt"]
        if args.custom:
            prompt = f"{prompt}. Additional specific details: {args.custom}"
        template_context = tmpl.get("context", "")

        if args.mode == DEFAULT_MODE and "mode" in tmpl:
            args.mode = tmpl["mode"]
        if args.format == DEFAULT_FORMAT and "suggested_format" in tmpl:
            args.format = tmpl["suggested_format"]
        if not args.lighting and "suggested_lighting" in tmpl:
            args.lighting = tmpl["suggested_lighting"]
        if args.humanization == DEFAULT_HUMANIZATION and "suggested_humanization" in tmpl:
            args.humanization = tmpl["suggested_humanization"]
    elif args.prompt:
        prompt = args.prompt
    else:
        print("ERRO: Forneca --prompt ou --template")
        print("Use --help para ver todas as opcoes")
        sys.exit(1)

    _check_dependencies()

    # Gerar
    paths = generate(
        prompt=prompt,
        mode=args.mode,
        format_name=args.format,
        humanization=args.humanization,
        lighting=args.lighting,
        model_name=args.model,
        num_images=args.variations,
        template=args.template or "custom",
        template_context=template_context,
        output_dir=args.output,
        skip_humanization=args.skip_humanization,
        resolution=args.resolution,
        person_generation=args.person_generation,
        reference_images=args.reference_images,
        shot_type=args.shot_type,
        force_paid=args.force_paid,
    )

    if args.json and paths:
        result = {
            "generated": [str(p) for p in paths],
            "count": len(paths),
            "output_dir": str(paths[0].parent) if paths else None,
        }
        print(json.dumps(result, indent=2, ensure_ascii=False))


if __name__ == "__main__":
    main()
