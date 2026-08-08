#!/usr/bin/env python3
"""
Search for available themes in the 2slides catalog.
"""

import os
import sys
import json
import argparse
import requests
from typing import Optional, List, Dict, Any


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


def search_themes(
    query: str,
    limit: int = 20,
    api_key: Optional[str] = None
) -> List[Dict[str, Any]]:
    """
    Search for themes.

    Args:
        query: Search query (required keyword)
        limit: Maximum number of results (max 100, default 20)
        api_key: API key (uses env var if not provided)

    Returns:
        List of theme objects
    """
    if api_key is None:
        api_key = get_api_key()

    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json"
    }

    params = {
        "query": query,
        "limit": min(limit, 100)
    }

    url = f"{API_BASE_URL}/themes/search"

    print(f"Searching themes{f': {query}' if query else ''}...", file=sys.stderr)
    response = requests.get(url, headers=headers, params=params)
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

    themes = data.get("themes", [])

    print(f"✓ Found {len(themes)} theme(s)", file=sys.stderr)

    return themes


def format_theme(theme: Dict[str, Any]) -> str:
    """Format a theme object for display."""
    theme_id = theme.get("id", "N/A")
    name = theme.get("name", "Unnamed")
    description = theme.get("description", "No description")

    return f"ID: {theme_id}\nName: {name}\nDescription: {description}\n"


def main():
    parser = argparse.ArgumentParser(
        description="Search for 2slides themes",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Search for business themes
  %(prog)s --query "business"

  # Search for creative themes
  %(prog)s --query "creative"

  # Get more results
  %(prog)s --query "professional" --limit 50
        """
    )

    parser.add_argument("--query", required=True, help="Search query (required keyword)")
    parser.add_argument("--limit", type=int, default=20,
                       help="Maximum results (max 100, default 20)")
    parser.add_argument("--json", action="store_true",
                       help="Output raw JSON")

    args = parser.parse_args()

    try:
        themes = search_themes(
            query=args.query,
            limit=args.limit
        )

        if args.json:
            print(json.dumps(themes, indent=2))
        else:
            print()
            for i, theme in enumerate(themes, 1):
                print(f"Theme {i}:")
                print(format_theme(theme))
                print("-" * 60)

    except Exception as e:
        print(f"Error: {e}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
