#!/usr/bin/env python3
"""
Generate AI voice narration for slides using the 2slides API.
Supports single and multi-speaker modes with 30 voice options.
"""

import os
import sys
import json
import argparse
import requests
from typing import Optional, Dict, Any, List


API_BASE_URL = "https://2slides.com/api/v1"

# Available voice options (30 voices)
AVAILABLE_VOICES = [
    "Puck", "Aoede", "Charon", "Kore", "Fenrir", "Phoebe", "Asteria",
    "Luna", "Stella", "Theia", "Helios", "Atlas", "Clio", "Melpomene",
    "Calliope", "Erato", "Euterpe", "Polyhymnia", "Terpsichore", "Thalia",
    "Urania", "Zeus", "Hera", "Poseidon", "Athena", "Apollo", "Artemis",
    "Ares", "Aphrodite", "Hephaestus"
]


def get_api_key() -> str:
    """Get API key from environment variable."""
    api_key = os.environ.get("SLIDES_2SLIDES_API_KEY")
    if not api_key:
        raise ValueError(
            "API key not found. Set SLIDES_2SLIDES_API_KEY environment variable.\n"
            "Get your API key from: https://2slides.com/api"
        )
    return api_key


def generate_narration(
    job_id: str,
    language: str = "Auto",
    voice: str = "Puck",
    multi_speaker: bool = False,
    api_key: Optional[str] = None
) -> Dict[str, Any]:
    """
    Generate AI voice narration for slides.

    Args:
        job_id: Job ID from slide generation (must be UUID format for Nano Banana)
        language: Language for narration (default: "Auto")
            Options: Auto, English, Simplified Chinese, Traditional Chinese, Spanish,
            Arabic, Portuguese, Indonesian, Japanese, Russian, Hindi, French, German,
            Vietnamese, Turkish, Polish, Italian, Korean
        voice: Voice name (default: "Puck")
            Options: Puck, Aoede, Charon, Kore, Fenrir, Phoebe, Asteria, Luna, Stella,
            Theia, Helios, Atlas, Clio, Melpomene, Calliope, Erato, Euterpe, Polyhymnia,
            Terpsichore, Thalia, Urania, Zeus, Hera, Poseidon, Athena, Apollo, Artemis,
            Ares, Aphrodite, Hephaestus
        multi_speaker: Enable multi-speaker mode (default: False)
        api_key: API key (uses env var if not provided)

    Returns:
        Dict with narration generation result

    Notes:
        - Job must be completed before adding narration
        - Cost: 210 credits per page (10 for text, 200 for audio)
        - Processing time: Varies by slide count
    """
    if api_key is None:
        api_key = get_api_key()

    if voice not in AVAILABLE_VOICES:
        print(f"Warning: Voice '{voice}' not in known voices list", file=sys.stderr)
        print(f"Available voices: {', '.join(AVAILABLE_VOICES)}", file=sys.stderr)

    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json"
    }

    payload = {
        "jobId": job_id,
        "language": language,
        "voice": voice,
        "multiSpeaker": multi_speaker
    }

    url = f"{API_BASE_URL}/slides/generate-narration"

    print("Generating voice narration...", file=sys.stderr)
    print(f"Voice: {voice}, Multi-speaker: {multi_speaker}", file=sys.stderr)

    # Set reasonable timeout for narration generation
    timeout = 120

    response = requests.post(url, headers=headers, json=payload, timeout=timeout)
    response.raise_for_status()

    result = response.json()

    # Check API response structure
    if not result.get("success"):
        # Common error example:
        # {"error":"Job is not completed","code":"JOB_NOT_COMPLETED",...}
        error_msg = result.get("error", "Unknown error")
        code = result.get("code")
        details = result.get("details")
        extra = f" (code={code})" if code else ""
        raise ValueError(f"API error: {error_msg}{extra}{f' details={details}' if details else ''}")

    # API may return either:
    # - { success:true, data:{...} }
    # - { success:true, jobId:"...", message:"..." }  (no data field)
    data = result.get("data")
    if not data:
        data = {
            "jobId": result.get("jobId") or job_id,
            "status": result.get("status") or "pending",
            "message": result.get("message") or "Narration generation started"
        }

    print("✓ Narration generation started!", file=sys.stderr)
    print(f"  Job ID: {data.get('jobId')}", file=sys.stderr)
    print("Use get_job_status.py to check progress", file=sys.stderr)

    return data


def list_voices():
    """Print available voices."""
    print("Available voices (30 total):")
    print("-" * 40)
    for i, voice in enumerate(AVAILABLE_VOICES, 1):
        print(f"{i:2d}. {voice}")
    print("-" * 40)
    print("\nPopular choices: Puck, Aoede, Charon")


def main():
    parser = argparse.ArgumentParser(
        description="Generate AI voice narration for 2slides presentations",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # List available voices
  %(prog)s --list-voices

  # Generate narration with default voice
  %(prog)s --job-id "abc-123-def-456"

  # Generate with specific voice
  %(prog)s --job-id "abc-123-def-456" --voice "Aoede"

  # Generate with multi-speaker mode
  %(prog)s --job-id "abc-123-def-456" --multi-speaker

  # Generate in Spanish
  %(prog)s --job-id "abc-123-def-456" --language "Spanish" --voice "Charon"

Credit Cost: 210 credits per page (10 for text, 200 for audio)
        """
    )

    parser.add_argument("--job-id", help="Job ID from slide generation (UUID format)")
    parser.add_argument("--language", default="Auto", help="Narration language (default: Auto)")
    parser.add_argument("--voice", default="Puck", help="Voice name (default: Puck)")
    parser.add_argument("--multi-speaker", action="store_true", help="Enable multi-speaker mode")
    parser.add_argument("--list-voices", action="store_true", help="List available voices and exit")

    args = parser.parse_args()

    if args.list_voices:
        list_voices()
        return

    if not args.job_id:
        print("Error: --job-id is required (or use --list-voices)", file=sys.stderr)
        sys.exit(1)

    try:
        result = generate_narration(
            job_id=args.job_id,
            language=args.language,
            voice=args.voice,
            multi_speaker=args.multi_speaker
        )

        print(json.dumps(result, indent=2))

    except Exception as e:
        print(f"Error: {e}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
