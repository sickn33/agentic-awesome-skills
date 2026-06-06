#!/usr/bin/env python3
"""
Generate custom-designed slides from text using the 2slides API.
Similar to create-like-this but without needing a reference image.
"""

import os
import sys
import json
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


def create_pdf_slides(
    user_input: str,
    response_language: str = "Auto",
    aspect_ratio: str = "16:9",
    resolution: str = "2K",
    page: int = 1,
    content_detail: str = "concise",
    design_spec: Optional[str] = None,
    api_key: Optional[str] = None
) -> Dict[str, Any]:
    """
    Generate custom-designed slides from text with optional design specifications.

    Args:
        user_input: Content to convert into slides
        response_language: Language (default: "Auto")
            Options: Auto, English, Simplified Chinese, Traditional Chinese, Spanish,
            Arabic, Portuguese, Indonesian, Japanese, Russian, Hindi, French, German,
            Vietnamese, Turkish, Polish, Italian, Korean
        aspect_ratio: Aspect ratio in width:height format (default: "16:9")
        resolution: Output quality - "1K", "2K", or "4K" (default: "2K")
        page: Number of slides, 0 for auto-detection, max 100 (default: 1)
        content_detail: "concise" (brief) or "standard" (detailed) (default: "concise")
        design_spec: Optional design specifications (e.g., "modern minimalist", "corporate blue")
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
        "responseLanguage": response_language,
        "aspectRatio": aspect_ratio,
        "resolution": resolution,
        "page": page,
        "contentDetail": content_detail
    }

    if design_spec:
        payload["designSpec"] = design_spec

    url = f"{API_BASE_URL}/slides/create-pdf-slides"

    # Calculate dynamic timeout: ~30s per page, minimum 120s
    timeout = max(120, page * 40)

    print("Generating custom-designed slides...", file=sys.stderr)
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
        description="Generate custom-designed slides using 2slides API",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Generate slides with auto design
  %(prog)s --content "Sales Report Q4 2025"

  # Generate with specific design
  %(prog)s --content "Marketing Plan" --design-spec "modern minimalist, blue color scheme"

  # Generate in 4K resolution
  %(prog)s --content "Product Launch" --resolution 4K --page 5
        """
    )

    parser.add_argument("--content", required=True, help="Content for slides")
    parser.add_argument("--design-spec", help="Optional design specifications")
    parser.add_argument("--language", default="Auto", help="Response language (default: Auto)")
    parser.add_argument("--aspect-ratio", default="16:9", help="Aspect ratio in width:height format (default: 16:9)")
    parser.add_argument("--resolution", choices=["1K", "2K", "4K"], default="2K",
                       help="Output quality (default: 2K)")
    parser.add_argument("--page", type=int, default=1, help="Number of slides, 0 for auto (default: 1, max: 100)")
    parser.add_argument("--content-detail", choices=["concise", "standard"], default="concise",
                       help="Content detail level (default: concise)")

    args = parser.parse_args()

    try:
        result = create_pdf_slides(
            user_input=args.content,
            response_language=args.language,
            aspect_ratio=args.aspect_ratio,
            resolution=args.resolution,
            page=args.page,
            content_detail=args.content_detail,
            design_spec=args.design_spec
        )

        print(json.dumps(result, indent=2))

    except Exception as e:
        print(f"Error: {e}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
