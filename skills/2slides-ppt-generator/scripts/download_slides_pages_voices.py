#!/usr/bin/env python3
"""
Download slides pages as PNG files and voice narrations as WAV files.
Exports everything as a ZIP archive (completely free).
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


def download_slides_pages_voices(
    job_id: str,
    output_path: Optional[str] = None,
    api_key: Optional[str] = None
) -> str:
    """
    Download slides pages and voice narrations as a ZIP archive.

    Args:
        job_id: Job ID from slide generation
        output_path: Optional path to save the ZIP file (default: <job_id>.zip)
        api_key: API key (uses env var if not provided)

    Returns:
        Path to the downloaded ZIP file

    Notes:
        - Exports pages as PNG files
        - Exports voices as WAV files
        - Includes transcripts
        - Completely free (no credit cost)
        - Download URL valid for 1 hour
    """
    if api_key is None:
        api_key = get_api_key()

    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json"
    }

    payload = {
        "jobId": job_id
    }

    url = f"{API_BASE_URL}/slides/download-slides-pages-voices"

    print(f"Requesting download for job: {job_id}...", file=sys.stderr)

    response = requests.post(url, headers=headers, json=payload, timeout=30)
    response.raise_for_status()

    result = response.json()

    # Check API response structure
    if not result.get("success"):
        error_msg = result.get("error", "Unknown error")
        raise ValueError(f"API error: {error_msg}")

    # Get download URL from data field
    data = result.get("data")
    if not data:
        raise ValueError("No data in API response")

    download_url = data.get("downloadUrl")
    if not download_url:
        raise ValueError("No download URL in response")

    # Optional: log additional info
    file_name = data.get("fileName", "unknown.zip")
    expires_in = data.get("expiresIn", 3600)
    print(f"  Filename: {file_name}", file=sys.stderr)
    print(f"  Expires in: {expires_in} seconds", file=sys.stderr)

    # Download the ZIP file
    if output_path is None:
        output_path = f"{job_id}.zip"

    print(f"Downloading ZIP archive to: {output_path}...", file=sys.stderr)

    zip_response = requests.get(download_url, stream=True, timeout=120)
    zip_response.raise_for_status()

    # Save to file
    with open(output_path, 'wb') as f:
        for chunk in zip_response.iter_content(chunk_size=8192):
            f.write(chunk)

    file_size = os.path.getsize(output_path)
    print(f"✓ Downloaded successfully!", file=sys.stderr)
    print(f"  File: {output_path}", file=sys.stderr)
    print(f"  Size: {file_size:,} bytes", file=sys.stderr)

    return output_path


def main():
    parser = argparse.ArgumentParser(
        description="Download 2slides pages and voices as ZIP archive (FREE)",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Download with default filename
  %(prog)s --job-id "abc-123-def-456"

  # Download to specific path
  %(prog)s --job-id "abc-123-def-456" --output slides.zip

Archive Contents:
  - Pages as PNG files
  - Voice files as WAV
  - Transcripts

Note: Download URLs are valid for 1 hour only
Cost: Completely FREE (no credits used)
        """
    )

    parser.add_argument("--job-id", required=True, help="Job ID from slide generation")
    parser.add_argument("--output", help="Output ZIP file path (default: <job_id>.zip)")

    args = parser.parse_args()

    try:
        output_path = download_slides_pages_voices(
            job_id=args.job_id,
            output_path=args.output
        )

        # Output path for easy parsing
        print(json.dumps({"success": True, "output": output_path}, indent=2))

    except Exception as e:
        print(f"Error: {e}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
