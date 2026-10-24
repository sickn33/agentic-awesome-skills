#!/usr/bin/env python3
"""
Imagen - Google Gemini Image Generation Script

Cross-platform image generation using Google Gemini API.
Works on Windows, macOS, and Linux.

Usage:
    python generate_image.py "prompt" [output_path]

Environment variables:
    GEMINI_API_KEY (required) - Your Google Gemini API key
    IMAGE_SIZE (optional) - Image size: "1K" (default), "2K", or "4K"
    GEMINI_MODEL (required unless --model) - Reviewed supported generateContent model ID
"""

import argparse
import base64
import json
import os
import re
import sys
import urllib.request
import urllib.error
from pathlib import Path


# Configuration
DEFAULT_MODEL_ID = None  # Explicit reviewed supported model required
API_BASE_URL = "https://generativelanguage.googleapis.com/v1beta/models"
DEFAULT_IMAGE_SIZE = "1K"
VALID_SIZES = {"1K", "2K", "4K"}


def get_api_endpoint(model_id: str) -> str:
    """Build the API endpoint URL for the given model."""
    # Use the non-streaming generateContent schema for supported models
    if not isinstance(model_id, str) or not re.fullmatch(r"[A-Za-z0-9][A-Za-z0-9_.-]{0,127}", model_id):
        raise ValueError("An explicit valid reviewed model ID is required")
    return f"{API_BASE_URL}/{model_id}:generateContent"


def get_api_key() -> str:
    """Get the Gemini API key from environment variable."""
    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        print("Error: GEMINI_API_KEY environment variable not set", file=sys.stderr)
        print("\nTo set it:", file=sys.stderr)
        print("  Load the key through the approved private credential mechanism; do not paste it into shell history.", file=sys.stderr)
        print("Configure an existing authorized private provider key", file=sys.stderr)
        sys.exit(1)
    return api_key


def validate_image_size(size: str) -> str:
    """Validate and return the image size."""
    if size not in VALID_SIZES:
        raise ValueError("Invalid image size")
    return size


def build_request_body(prompt: str, image_size: str) -> bytes:
    """Build the JSON request body for the API."""
    request_data = {
        "contents": [
            {
                "role": "user",
                "parts": [
                    {"text": prompt}
                ]
            }
        ],
        "generationConfig": {
            "responseModalities": ["IMAGE", "TEXT"],
            "imageConfig": {
                "imageSize": image_size
            }
        }
    }
    if image_size not in VALID_SIZES:
        raise ValueError("Unsupported image size")
    return json.dumps(request_data).encode("utf-8")


def make_api_request(api_key: str, model_id: str, request_body: bytes) -> dict:
    """Make the API request and return the response."""
    endpoint = get_api_endpoint(model_id)
    if not isinstance(api_key, str) or not api_key or any(c in api_key for c in "\r\n"):
        raise ValueError("Invalid private API key")
    class RejectRedirects(urllib.request.HTTPRedirectHandler):
        def redirect_request(self, req, fp, code, msg, headers, newurl):
            return None
    req = urllib.request.Request(endpoint, data=request_body, headers={
        "Content-Type": "application/json", "x-goog-api-key": api_key,
    }, method="POST")
    try:
        with urllib.request.build_opener(RejectRedirects()).open(req, timeout=120) as response:
            body = response.read(64 * 1024 * 1024 + 1)
            if len(body) > 64 * 1024 * 1024:
                raise ValueError("Provider response exceeds size limit")
            return json.loads(body.decode("utf-8"))
    except urllib.error.HTTPError as error:
        raise RuntimeError(f"Provider request rejected (HTTP {error.code}); inspect private account state before retry") from None
    except (urllib.error.URLError, TimeoutError, OSError):
        raise RuntimeError("Provider transport failed; reconcile billing/task state before retry") from None


def extract_image_data(response: dict) -> str:
    """Extract base64 image data from the API response."""
    chunks = response if isinstance(response, list) else [response]
    for chunk in chunks:
        if not isinstance(chunk, dict):
            raise ValueError("Invalid response envelope")
        candidates = chunk.get("candidates", [])
        if not isinstance(candidates, list):
            raise ValueError("Invalid candidates")
        for candidate in candidates:
            if not isinstance(candidate, dict):
                raise ValueError("Invalid candidate")
            content = candidate.get("content", {})
            if not isinstance(content, dict) or not isinstance(content.get("parts", []), list):
                raise ValueError("Invalid image content")
            for part in content.get("parts", []):
                inline = part.get("inlineData") if isinstance(part, dict) else None
                if inline:
                    if not isinstance(inline, dict):
                        raise ValueError("Invalid inline image")
                    if inline.get("mimeType") != "image/png":
                        raise ValueError("Expected PNG output; do not silently mislabel a different format")
                    data = inline.get("data")
                    if not isinstance(data, str) or not data:
                        raise ValueError("Empty image output")
                    return data
    raise ValueError("No image produced; blocked/text-only results are not success")


def save_image(image_data: str, output_path: Path) -> None:
    """Decode and save the base64 image data."""
    if len(image_data) > 48 * 1024 * 1024:
        raise ValueError("Encoded image exceeds size limit")
    image_bytes = base64.b64decode(image_data, validate=True)
    if not image_bytes.startswith(b"\x89PNG\r\n\x1a\n") or len(image_bytes) > 32 * 1024 * 1024:
        raise ValueError("Invalid or oversized PNG")
    if output_path.suffix.lower() != ".png":
        raise ValueError("Output requires a .png suffix")
    flags = os.O_WRONLY | os.O_CREAT | os.O_EXCL | getattr(os, "O_NOFOLLOW", 0)
    fd = os.open(output_path, flags, 0o600)
    with os.fdopen(fd, "wb") as target:
        target.write(image_bytes)


def get_file_size(path: Path) -> str:
    """Get human-readable file size."""
    size = path.stat().st_size
    for unit in ["B", "KB", "MB", "GB"]:
        if size < 1024:
            return f"{size:.1f} {unit}"
        size /= 1024
    return f"{size:.1f} TB"


def main():
    parser = argparse.ArgumentParser(
        description="Generate images using Google Gemini AI",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python generate_image.py "A sunset over mountains"
  python generate_image.py "An app icon" ./icons/app.png
  python generate_image.py --size 2K "High-res landscape" ./wallpaper.png
  python generate_image.py --model REVIEWED_SUPPORTED_MODEL "A logo" ./logo.png

Environment Variables:
  GEMINI_API_KEY    Your Google Gemini API key (required)
  IMAGE_SIZE        Image size: 1K (default), 2K or 4K
  GEMINI_MODEL      Model ID for image generation
        """
    )
    parser.add_argument("prompt", help="Text description of the image to generate")
    parser.add_argument("output", nargs="?", default="./generated-image.png",
                        help="Output file path (default: ./generated-image.png)")
    parser.add_argument("--size", choices=["1K", "2K", "4K"],
                        help="Image size (overrides IMAGE_SIZE env var)")
    parser.add_argument("--model", "-m",
                        help="Reviewed supported model ID; required unless GEMINI_MODEL is set")

    args = parser.parse_args()

    # Get configuration
    api_key = get_api_key()
    model_id = args.model or os.environ.get("GEMINI_MODEL", DEFAULT_MODEL_ID)
    image_size = args.size or os.environ.get("IMAGE_SIZE", DEFAULT_IMAGE_SIZE)
    image_size = validate_image_size(image_size)
    output_path = Path(args.output)

    if not args.prompt.strip() or len(args.prompt.encode("utf-8")) > 32768:
        raise ValueError("Provide a nonempty prompt no larger than 32KiB")
    get_api_endpoint(model_id)
    if output_path.exists() or output_path.is_symlink():
        raise ValueError("Output exists; choose a new authorized path")
    if not output_path.parent.is_dir():
        raise ValueError("Choose an existing authorized output directory")

    # Display info
    print("Generating one approved image; prompt omitted from logs")
    print(f"Model: {model_id}")
    print(f"Image size: {image_size}")
    print(f"Output path: {output_path}")
    print()

    # Build and send request
    request_body = build_request_body(args.prompt, image_size)
    response = make_api_request(api_key, model_id, request_body)

    # Extract and save image
    image_data = extract_image_data(response)
    if not image_data:
        print("Error: No image data received from API", file=sys.stderr)
        sys.exit(1)

    save_image(image_data, output_path)

    # Verify and report success
    if output_path.exists() and output_path.stat().st_size > 0:
        file_size = get_file_size(output_path)
        print("Success! Image generated and saved.")
        print(f"File: {output_path}")
        print(f"Size: {file_size}")
    else:
        print(f"Error: Failed to save image to {output_path}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    try:
        main()
    except (ValueError, RuntimeError, OSError) as error:
        print(f"Image generation failed: {type(error).__name__}; no successful output claimed", file=sys.stderr)
        sys.exit(1)
