#!/usr/bin/env python3
"""
Generate slides using the 2slides API.
Supports both content-based and reference image-based generation.
"""

import os
import sys
import json
import time
import argparse
import requests
from typing import Optional, Dict, Any


API_BASE_URL = "https://2slides.com/api/v1"


def get_api_key() -> str:
    """Get API key from environment variable."""
    api_key = os.environ.get("SLIDES_2SLIDES_API_KEY")
    if not api_key:
        raise ValueError(
            "API key not found. Set SLIDES_2SLIDES_API_KEY environment variable.\n"
            "Get your API key from: https://2slides.com/api"
        )
    return api_key


def generate_slides(
    user_input: str,
    theme_id: str,
    response_language: str = "Auto",
    mode: str = "sync",
    api_key: Optional[str] = None
) -> Dict[str, Any]:
    """
    Generate slides from user input.

    Args:
        user_input: Content to convert into slides
        theme_id: Theme ID (required, use search_themes.py to find themes)
        response_language: Language (default: "Auto")
            Options: Auto, English, Simplified Chinese, Traditional Chinese, Spanish,
            Arabic, Portuguese, Indonesian, Japanese, Russian, Hindi, French, German,
            Vietnamese, Turkish, Polish, Italian, Korean
        mode: "sync" or "async" (default: "sync")
        api_key: API key (uses env var if not provided)

    Returns:
        Dict with generation result or job ID
    """
    if api_key is None:
        api_key = get_api_key()

    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json"
    }

    payload = {
        "userInput": user_input,
        "themeId": theme_id,
        "responseLanguage": response_language,
        "mode": mode
    }

    url = f"{API_BASE_URL}/slides/generate"

    # Set timeout: 90s for sync (waits for completion), 30s for async (just creates job)
    timeout = 90 if mode == "sync" else 30

    print(f"Generating slides in {mode} mode...", file=sys.stderr)
    response = requests.post(url, headers=headers, json=payload, timeout=timeout)
    response.raise_for_status()

    result = response.json()

    # Check API response structure
    if not result.get("success"):
        error_msg = result.get("error", "Unknown error")
        raise ValueError(f"API error: {error_msg}")

    # Extract data from response
    data = result.get("data")
    if not data:
        raise ValueError("No data in API response")

    if mode == "sync":
        print("✓ Slides generated successfully!", file=sys.stderr)
        print(f"  Pages: {data.get('slidePageCount', 'N/A')}", file=sys.stderr)
        if data.get("downloadUrl"):
            print(f"  Download URL: {data.get('downloadUrl')}", file=sys.stderr)
    else:
        print(f"✓ Job created: {data.get('jobId')}", file=sys.stderr)
        print("Use get_job_status.py to check status", file=sys.stderr)

    return data


def create_like_this(
    user_input: str,
    reference_image_url: str,
    response_language: str = "Auto",
    aspect_ratio: str = "16:9",
    resolution: str = "2K",
    page: int = 1,
    content_detail: str = "concise",
    api_key: Optional[str] = None
) -> Dict[str, Any]:
    """
    Generate slides matching a reference image style (Nano Banana Pro).

    Args:
        user_input: Content to convert into slides
        reference_image_url: URL or base64 of reference image to match style
        response_language: Language (default: "Auto")
            Options: Auto, English, Simplified Chinese, Traditional Chinese, Spanish,
            Arabic, Portuguese, Indonesian, Japanese, Russian, Hindi, French, German,
            Vietnamese, Turkish, Polish, Italian, Korean
        aspect_ratio: Aspect ratio in width:height format (default: "16:9")
        resolution: Output quality - "1K", "2K", or "4K" (default: "2K")
        page: Number of slides, 0 for auto-detection, max 100 (default: 1)
        content_detail: "concise" (brief, keyword-focused) or "standard" (comprehensive) (default: "concise")
        api_key: API key (uses env var if not provided)

    Returns:
        Dict with generation result
    """
    if api_key is None:
        api_key = get_api_key()

    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json"
    }

    payload = {
        "userInput": user_input,
        "referenceImageUrl": reference_image_url,
        "responseLanguage": response_language,
        "aspectRatio": aspect_ratio,
        "resolution": resolution,
        "page": page,
        "contentDetail": content_detail
    }

    url = f"{API_BASE_URL}/slides/create-like-this"

    # Calculate dynamic timeout: ~30s per page, minimum 120s
    timeout = max(120, page * 40)

    print("Generating slides from reference image...", file=sys.stderr)
    print(f"(Timeout set to {timeout}s for {page} page(s))", file=sys.stderr)
    response = requests.post(url, headers=headers, json=payload, timeout=timeout)
    response.raise_for_status()

    result = response.json()

    # Handle the actual API response structure
    if result.get("success") and "data" in result:
        data = result["data"]
        # Transform to expected format for consistency
        normalized_result = {
            "slideUrl": data.get("jobUrl"),
            "pdfUrl": data.get("downloadUrl"),
            "status": "completed" if data.get("status") == "success" else data.get("status"),
            "message": data.get("message"),
            "slidePageCount": data.get("slidePageCount"),
            "jobId": data.get("jobId")
        }
        print("✓ Slides generated successfully!", file=sys.stderr)
        print(f"  Pages: {data.get('slidePageCount')}", file=sys.stderr)
        return normalized_result
    else:
        # Fallback to raw result if structure is unexpected
        print("✓ Request completed!", file=sys.stderr)
        return result


def main():
    parser = argparse.ArgumentParser(
        description="Generate slides using 2slides API",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Generate slides from content
  %(prog)s --content "Intro to AI: ML, Deep Learning, Neural Networks"

  # Generate with specific theme
  %(prog)s --content "Business Plan" --theme-id "theme123"

  # Generate in async mode
  %(prog)s --content "Long presentation" --mode async

  # Generate from reference image
  %(prog)s --content "Sales Report" --reference-image "https://example.com/image.jpg"
        """
    )

    parser.add_argument("--content", required=True, help="Content for slides")
    parser.add_argument("--theme-id", help="Theme ID (required for standard generation)")
    parser.add_argument("--reference-image", help="Reference image URL (use this OR theme-id)")
    parser.add_argument("--language", default="Auto", help="Response language (default: Auto)")
    parser.add_argument("--mode", choices=["sync", "async"], default="sync",
                       help="Generation mode (default: sync)")
    parser.add_argument("--aspect-ratio", default="16:9", help="Aspect ratio in width:height format (default: 16:9)")
    parser.add_argument("--resolution", choices=["1K", "2K", "4K"], default="2K",
                       help="Output quality (default: 2K)")
    parser.add_argument("--page", type=int, default=1, help="Number of slides, 0 for auto (default: 1, max: 100)")
    parser.add_argument("--content-detail", choices=["concise", "standard"], default="concise",
                       help="Content detail level (default: concise)")

    args = parser.parse_args()

    try:
        if args.reference_image:
            result = create_like_this(
                user_input=args.content,
                reference_image_url=args.reference_image,
                response_language=args.language,
                aspect_ratio=args.aspect_ratio,
                resolution=args.resolution,
                page=args.page,
                content_detail=args.content_detail
            )
        else:
            if not args.theme_id:
                print("Error: --theme-id is required for standard generation", file=sys.stderr)
                print("Use --reference-image for style-based generation instead", file=sys.stderr)
                sys.exit(1)
            result = generate_slides(
                user_input=args.content,
                theme_id=args.theme_id,
                response_language=args.language,
                mode=args.mode
            )

        print(json.dumps(result, indent=2))

    except Exception as e:
        print(f"Error: {e}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
