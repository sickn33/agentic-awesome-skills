#!/usr/bin/env python3
"""
Check the status of an async slide generation job.
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


def get_job_status(
    job_id: str,
    api_key: Optional[str] = None
) -> Dict[str, Any]:
    """
    Get the status of a slide generation job.

    Args:
        job_id: Job ID from async generation
        api_key: API key (uses env var if not provided)

    Returns:
        Dict with job status and result
    """
    if api_key is None:
        api_key = get_api_key()

    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json"
    }

    url = f"{API_BASE_URL}/jobs/{job_id}"

    print(f"Checking job status: {job_id}...", file=sys.stderr)
    response = requests.get(url, headers=headers)
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

    status = data.get("status", "unknown")

    print(f"✓ Job status: {status}", file=sys.stderr)
    if data.get("message"):
        print(f"  Message: {data.get('message')}", file=sys.stderr)
    if data.get("slidePageCount"):
        print(f"  Pages: {data.get('slidePageCount')}", file=sys.stderr)
    if data.get("downloadUrl"):
        print(f"  Download URL: {data.get('downloadUrl')}", file=sys.stderr)

    return data


def main():
    parser = argparse.ArgumentParser(
        description="Check 2slides job status",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Check job status
  %(prog)s --job-id abc123
        """
    )

    parser.add_argument("--job-id", required=True, help="Job ID to check")

    args = parser.parse_args()

    try:
        result = get_job_status(job_id=args.job_id)
        print(json.dumps(result, indent=2))

    except Exception as e:
        print(f"Error: {e}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
