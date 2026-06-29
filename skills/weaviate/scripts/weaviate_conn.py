"""
Shared Weaviate connection utilities.

This module handles:
- Environment variable validation
- API key to header mapping for all supported providers
- Client connection with automatic header configuration

Usage in scripts:
    import sys
    from pathlib import Path
    sys.path.insert(0, str(Path(__file__).parent.parent.parent / "lib"))
    from weaviate_conn import get_client, get_headers, validate_env
"""

import os
import sys
from contextlib import contextmanager
from typing import Generator

import weaviate
from weaviate.classes.init import Auth
from weaviate.client import WeaviateClient
from weaviate.classes.init import AdditionalConfig, Timeout

# Canonical environment variable to Weaviate header mapping
API_KEY_MAP = {
    "ANTHROPIC_API_KEY": "X-Anthropic-Api-Key",
    "ANYSCALE_API_KEY": "X-Anyscale-Api-Key",
    "AWS_ACCESS_KEY": "X-Aws-Access-Key",
    "AWS_SECRET_KEY": "X-Aws-Secret-Key",
    "COHERE_API_KEY": "X-Cohere-Api-Key",
    "DATABRICKS_TOKEN": "X-Databricks-Token",
    "FRIENDLI_TOKEN": "X-Friendli-Api-Key",
    "VERTEX_API_KEY": "X-Goog-Vertex-Api-Key",
    "STUDIO_API_KEY": "X-Goog-Studio-Api-Key",
    "HUGGINGFACE_API_KEY": "X-HuggingFace-Api-Key",
    "JINAAI_API_KEY": "X-JinaAI-Api-Key",
    "MISTRAL_API_KEY": "X-Mistral-Api-Key",
    "NVIDIA_API_KEY": "X-Nvidia-Api-Key",
    "OPENAI_API_KEY": "X-OpenAI-Api-Key",
    "AZURE_API_KEY": "X-Azure-Api-Key",
    "VOYAGE_API_KEY": "X-Voyage-Api-Key",
    "XAI_API_KEY": "X-Xai-Api-Key",
}


def _collect_headers_and_providers() -> tuple[dict[str, str], list[str]]:
    """
    Scan env once to build Weaviate headers and detected key names.

    Returns:
        Tuple of (headers, detected_env_var_names)
    """
    headers: dict[str, str] = {}
    detected_providers: list[str] = []

    for env_var, header_name in API_KEY_MAP.items():
        value = os.environ.get(env_var, "").strip()
        if not value:
            continue

        detected_providers.append(env_var)
        headers[header_name] = value

    return headers, detected_providers


def validate_env(require_weaviate: bool = True) -> tuple[str, str]:
    """
    Validate required Weaviate environment variables.

    Args:
        require_weaviate: If True, exit with error if WEAVIATE_URL/API_KEY not set

    Returns:
        Tuple of (weaviate_url, weaviate_api_key)

    Raises:
        SystemExit: If required variables are missing
    """
    url = os.environ.get("WEAVIATE_URL", "").strip()
    api_key = os.environ.get("WEAVIATE_API_KEY", "").strip()

    if require_weaviate:
        if not url:
            print("Error: WEAVIATE_URL environment variable not set", file=sys.stderr)
            sys.exit(1)
        if not api_key:
            print(
                "Error: WEAVIATE_API_KEY environment variable not set", file=sys.stderr
            )
            sys.exit(1)

    return url, api_key


def get_headers() -> dict[str, str] | None:
    """
    Build headers dict from all available API keys in environment.

    Scans environment for all known API key variables and builds
    the appropriate headers dict for Weaviate client connection.

    Returns:
        Dict of headers if any API keys found, None otherwise
    """
    headers, _ = _collect_headers_and_providers()
    return headers if headers else None


def get_detected_providers() -> list[str]:
    """
    Get list of detected API key environment variable names.

    Returns:
        List of env var names (e.g., ["OPENAI_API_KEY", "COHERE_API_KEY"])
    """
    _, detected_providers = _collect_headers_and_providers()
    return sorted(detected_providers)


@contextmanager
def get_client(
    url: str | None = None,
    api_key: str | None = None,
    headers: dict[str, str] | None = None,
    verbose: bool = True,
) -> Generator[WeaviateClient, None, None]:
    """
    Context manager for Weaviate client connection.

    Auto-detects credentials from environment if not provided.
    Auto-builds headers from all available API keys if not provided.

    Args:
        url: Weaviate cluster URL (default: from WEAVIATE_URL env var)
        api_key: Weaviate API key (default: from WEAVIATE_API_KEY env var)
        headers: Custom headers dict (default: auto-detected from env vars)
        verbose: Print connection status to stderr

    Yields:
        Connected WeaviateClient instance

    Example:
        with get_client() as client:
            collections = client.collections.list_all()
    """
    # Get credentials from env if not provided
    if url is None or api_key is None:
        env_url, env_api_key = validate_env()
        url = url or env_url
        api_key = api_key or env_api_key

    # Auto-detect headers if not provided
    if headers is None:
        headers, detected_providers = _collect_headers_and_providers()
        headers = headers or None
    else:
        detected_providers = None

    if verbose:
        detected = sorted(detected_providers) if detected_providers is not None else []
        if detected:
            print(f"Detected providers: {', '.join(detected)}", file=sys.stderr)
        print("Connecting to Weaviate...", file=sys.stderr)

    client = weaviate.connect_to_weaviate_cloud(
        cluster_url=url,
        auth_credentials=Auth.api_key(api_key),
        headers=headers,
        additional_config=AdditionalConfig(
            timeout=Timeout(init=30, query=60, insert=120)
        ),
    )

    try:
        if verbose:
            print("Connected.", file=sys.stderr)
        yield client
    finally:
        client.close()


def connect_client(
    url: str | None = None,
    api_key: str | None = None,
    headers: dict[str, str] | None = None,
    verbose: bool = True,
) -> WeaviateClient:
    """
    Get a Weaviate client connection (non-context manager version).

    IMPORTANT: Caller is responsible for calling client.close()

    Args:
        url: Weaviate cluster URL (default: from WEAVIATE_URL env var)
        api_key: Weaviate API key (default: from WEAVIATE_API_KEY env var)
        headers: Custom headers dict (default: auto-detected from env vars)
        verbose: Print connection status to stderr

    Returns:
        Connected WeaviateClient instance
    """
    if url is None or api_key is None:
        env_url, env_api_key = validate_env()
        url = url or env_url
        api_key = api_key or env_api_key

    if headers is None:
        headers, detected_providers = _collect_headers_and_providers()
        headers = headers or None
    else:
        detected_providers = None

    if verbose:
        detected = sorted(detected_providers) if detected_providers is not None else []
        if detected:
            print(f"Detected providers: {', '.join(detected)}", file=sys.stderr)
        print("Connecting to Weaviate...", file=sys.stderr)

    client = weaviate.connect_to_weaviate_cloud(
        cluster_url=url,
        auth_credentials=Auth.api_key(api_key),
        headers=headers,
    )

    if verbose:
        print("Connected.", file=sys.stderr)

    return client
