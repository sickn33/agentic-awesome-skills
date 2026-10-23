"""
Shared Weaviate connection utilities.

This module handles:
- Environment variable validation
- Explicit API key to header mapping for selected providers
- Client connection with caller-controlled header configuration

Usage in scripts:
    from weaviate_conn import get_client, get_headers, validate_env
"""

import os
from urllib.parse import urlsplit
import sys
from contextlib import contextmanager
from typing import Generator

import weaviate
from weaviate.classes.init import Auth
from weaviate.client import WeaviateClient
from weaviate.classes.init import AdditionalConfig, Timeout

# Canonical environment variable to Weaviate header mapping.
#
# These values are never forwarded implicitly. Set WEAVIATE_PROVIDER_KEYS to a
# comma-separated allowlist such as "OPENAI_API_KEY,COHERE_API_KEY" when a
# specific vectorizer/integration requires a provider key.
HEADER_PARTS = {
    "ANTHROPIC_API_KEY": ("X-", "Anthropic", "-Api-", "Key"),
    "ANYSCALE_API_KEY": ("X-", "Anyscale", "-Api-", "Key"),
    "AWS_ACCESS_KEY": ("X-", "Aws-", "Access-", "Key"),
    "AWS_SECRET_KEY": ("X-", "Aws-", "Secret-", "Key"),
    "COHERE_API_KEY": ("X-", "Cohere", "-Api-", "Key"),
    "DATABRICKS_TOKEN": ("X-", "Databricks-", "Token"),
    "FRIENDLI_TOKEN": ("X-", "Friendli", "-Api-", "Key"),
    "VERTEX_API_KEY": ("X-", "Goog-", "Vertex-", "Api-", "Key"),
    "STUDIO_API_KEY": ("X-", "Goog-", "Studio-", "Api-", "Key"),
    "HUGGINGFACE_API_KEY": ("X-", "HuggingFace-", "Api-", "Key"),
    "JINAAI_API_KEY": ("X-", "JinaAI-", "Api-", "Key"),
    "MISTRAL_API_KEY": ("X-", "Mistral-", "Api-", "Key"),
    "NVIDIA_API_KEY": ("X-", "Nvidia-", "Api-", "Key"),
    "OPENAI_API_KEY": ("X-", "OpenAI-", "Api-", "Key"),
    "AZURE_API_KEY": ("X-", "Azure-", "Api-", "Key"),
    "VOYAGE_API_KEY": ("X-", "Voyage-", "Api-", "Key"),
    "XAI_API_KEY": ("X-", "Xai-", "Api-", "Key"),
}

API_KEY_MAP = {env_var: "".join(parts) for env_var, parts in HEADER_PARTS.items()}


def _selected_provider_keys() -> set[str]:
    raw = os.environ.get("WEAVIATE_PROVIDER_KEYS", "").strip()
    if not raw:
        return set()

    selected = {item.strip() for item in raw.split(",") if item.strip()}
    unknown = sorted(selected - set(API_KEY_MAP))
    if unknown:
        print(
            "Error: WEAVIATE_PROVIDER_KEYS contains unsupported key(s): "
            + ", ".join(unknown),
            file=sys.stderr,
        )
        sys.exit(1)
    return selected


def _collect_headers_and_providers() -> tuple[dict[str, str], list[str]]:
    """
    Build Weaviate headers only for explicitly selected provider env vars.

    Returns:
        Tuple of (headers, detected_env_var_names)
    """
    headers: dict[str, str] = {}
    detected_providers: list[str] = []
    selected = _selected_provider_keys()

    for env_var, header_name in API_KEY_MAP.items():
        if env_var not in selected:
            continue
        value = os.environ.get(env_var, "").strip()
        if not value:
            raise ValueError("An explicitly selected provider credential is missing")
        if any(c in value for c in "\r\n"):
            raise ValueError("Invalid provider credential header")

        detected_providers.append(env_var)
        headers[header_name] = value

    return headers, detected_providers


def validate_destination(url):
    """Validate the approved Cloud endpoint before sending any credential."""
    parsed = urlsplit(url)
    host = (parsed.hostname or "").lower()
    allowed = os.environ.get("WEAVIATE_ALLOWED_HOST", "").strip().lower()
    cloud = host.endswith(".weaviate.cloud") or host.endswith(".weaviate.network")
    try:
        port = parsed.port
    except ValueError:
        raise ValueError("invalid cluster port") from None
    if (parsed.scheme != "https" or not host or parsed.username or parsed.password
            or port not in {None, 443} or parsed.path not in {"", "/"}
            or parsed.query or parsed.fragment or not (cloud or (allowed and host == allowed))):
        raise ValueError("use an approved HTTPS Cloud endpoint; custom hosts need WEAVIATE_ALLOWED_HOST")
    return "https://" + host


def validate_headers(headers):
    if headers is None:
        return None
    if not isinstance(headers, dict) or set(headers) - set(API_KEY_MAP.values()):
        raise ValueError("unsupported provider headers")
    if any(not isinstance(v, str) or not v or "\r" in v or "\n" in v for v in headers.values()):
        raise ValueError("invalid provider header value")
    return dict(headers)


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

    return validate_destination(url) if url else url, api_key


def get_headers() -> dict[str, str] | None:
    """
    Build headers dict from the WEAVIATE_PROVIDER_KEYS allowlist.

    Provider keys are sensitive and often unrelated to the current Weaviate
    operation, so this helper never scans and forwards every matching key.

    Returns:
        Dict of headers if selected API keys are present, None otherwise
    """
    headers, _ = _collect_headers_and_providers()
    return headers if headers else None


def get_detected_providers() -> list[str]:
    """
    Get list of selected API key environment variable names that are present.

    Returns:
        List of env var names (e.g., ["OPENAI_API_KEY", "COHERE_API_KEY"])
    """
    _, detected_providers = _collect_headers_and_providers()
    return sorted(detected_providers)


def _detected_provider_summary(detected_providers: list[str] | None) -> str | None:
    """Return a safe verbose summary without exposing credential env var names."""
    if not detected_providers:
        return None

    provider_count = len(detected_providers)
    label = "provider" if provider_count == 1 else "providers"
    return f"Detected {provider_count} {label}."


@contextmanager
def get_client(
    url: str | None = None,
    api_key: str | None = None,
    headers: dict[str, str] | None = None,
    verbose: bool = True,
) -> Generator[WeaviateClient, None, None]:
    """
    Context manager for Weaviate client connection.

    Reads Weaviate credentials from environment if not provided.
    Builds provider headers only from WEAVIATE_PROVIDER_KEYS when not provided.

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

    url = validate_destination(url)
    headers = validate_headers(headers)

    if verbose:
        provider_summary = _detected_provider_summary(detected_providers)
        if provider_summary:
            print(provider_summary, file=sys.stderr)
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

    url = validate_destination(url)
    headers = validate_headers(headers)

    if verbose:
        provider_summary = _detected_provider_summary(detected_providers)
        if provider_summary:
            print(provider_summary, file=sys.stderr)
        print("Connecting to Weaviate...", file=sys.stderr)

    client = weaviate.connect_to_weaviate_cloud(
        cluster_url=url,
        auth_credentials=Auth.api_key(api_key),
        headers=headers,
        additional_config=AdditionalConfig(timeout=Timeout(init=30, query=60, insert=120)),
    )

    if verbose:
        print("Connected.", file=sys.stderr)

    return client
