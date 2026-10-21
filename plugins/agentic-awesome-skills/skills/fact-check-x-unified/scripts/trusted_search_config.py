#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import os
import ssl
import stat
import subprocess
import sys
import urllib.error
import urllib.request
from urllib.parse import urlsplit
from pathlib import Path


PROVIDER_URL = "https://platform.dknowc.cn/auth/#/login"
DEFAULT_ENDPOINT = "https://open.dknowc.cn/dependable/search"


class ConfigurationError(RuntimeError):
    pass


class InvalidCredentialError(ConfigurationError):
    pass


class ServiceUnavailableError(ConfigurationError):
    pass


def trusted_search_ssl_context() -> ssl.SSLContext:
    candidates: list[str] = []
    try:
        import certifi

        candidates.append(certifi.where())
    except ImportError:
        pass
    defaults = ssl.get_default_verify_paths()
    candidates.extend(
        path
        for path in (
            defaults.cafile,
            "/etc/ssl/cert.pem",
            "/opt/homebrew/etc/openssl@3/cert.pem",
            "/usr/local/etc/openssl@3/cert.pem",
        )
        if path
    )
    for candidate in dict.fromkeys(candidates):
        if Path(candidate).is_file():
            return ssl.create_default_context(cafile=candidate)
    return ssl.create_default_context()


def credential_path() -> Path:
    override = os.getenv("FACT_CHECK_X_TRUSTED_SEARCH_KEY_FILE", "").strip()
    if override:
        return Path(override).expanduser()
    return Path.home() / ".fact-check-x" / "credentials" / "trusted-search-key"


def _validate_key_shape(key: str) -> str:
    normalized = key.strip()
    if (
        len(normalized) < 16
        or len(normalized) > 1024
        or any(character.isspace() for character in normalized)
        or "*" in normalized
    ):
        raise ConfigurationError("可信搜索 Key 格式不正确。")
    return normalized


def _shared_trusted_search_key() -> str:
    path = credential_path()
    if not path.exists() and not path.is_symlink():
        return ""
    if path.is_symlink():
        raise ConfigurationError("本机可信搜索配置必须是普通文件，不能是链接。")
    descriptor = os.open(path, os.O_RDONLY | getattr(os, "O_NOFOLLOW", 0) | getattr(os, "O_NONBLOCK", 0))
    try:
        information = os.fstat(descriptor)
        if not stat.S_ISREG(information.st_mode):
            raise ConfigurationError("本机可信搜索配置必须是普通文件。")
        if os.name != "nt" and information.st_mode & 0o077:
            raise ConfigurationError("本机可信搜索配置权限不安全，请重新执行自动配置。")
        with os.fdopen(descriptor, "rb", closefd=False) as handle:
            data = handle.read(4097)
        if len(data) > 4096:
            raise ConfigurationError("本机可信搜索配置超过大小限制。")
        return _validate_key_shape(data.decode("utf-8"))
    finally:
        os.close(descriptor)


def trusted_search_key_candidates() -> list[tuple[str, str]]:
    candidates = []
    shared_key = _shared_trusted_search_key()
    if shared_key:
        candidates.append(("shared_local_credential", shared_key))
    environment_key = os.getenv("TRUSTED_SEARCH_KEY", "").strip()
    if environment_key:
        normalized = _validate_key_shape(environment_key)
        if all(normalized != key for _, key in candidates):
            candidates.append(("environment", normalized))
    return candidates


def load_trusted_search_key() -> str:
    candidates = trusted_search_key_candidates()
    return candidates[0][1] if candidates else ""


def key_source() -> str:
    candidates = trusted_search_key_candidates()
    return candidates[0][0] if candidates else "missing"


def is_trusted_search_configured() -> bool:
    return key_source() != "missing"


def trusted_search_config_status() -> tuple[str, str]:
    """Return (source, validation) without exposing secret key material."""
    transient: tuple[str, str] | None = None
    for source, key in trusted_search_key_candidates():
        try:
            validate_trusted_search_key(key)
        except ServiceUnavailableError:
            if transient is None:
                transient = (source, "service_unavailable")
            continue
        except ConfigurationError:
            continue
        return source, "valid"
    if transient is not None:
        return transient
    return "missing", "missing"


_SENSITIVE_JSON_KEYS = frozenset({
    "authorization",
    "token",
    "access_token",
    "api_key",
    "api-key",
    "apikey",
    "secret",
    "password",
    "trusted_search_key",
})


def redact_sensitive_json(value, path=()):
    """Recursively redact secret-bearing keys before writing JSON to stdout."""
    if isinstance(value, dict):
        redacted = {}
        for key, item in value.items():
            if str(key).lower() in _SENSITIVE_JSON_KEYS and not (path == ("checkpoint", "acknowledgement") and key == "token" and isinstance(item, str) and item.startswith("fcx_")):
                redacted[key] = "***redacted***"
            else:
                redacted[key] = redact_sensitive_json(item, path + (str(key),))
        return redacted
    if isinstance(value, list):
        return [redact_sensitive_json(item, path + ("[]",)) for item in value]
    return value


def emit_public_json(payload) -> None:
    print(json.dumps(redact_sensitive_json(payload), ensure_ascii=False))


def clear_trusted_search_key() -> bool:
    path = credential_path()
    existed = path.exists()
    path.unlink(missing_ok=True)
    return existed


class RejectCredentialRedirects(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, request, response, code, message, headers, new_url):
        raise ServiceUnavailableError("可信搜索重定向已拒绝，Key 不会发送到其他地址。")


def open_trusted_search(request, *, timeout, context):
    opener = urllib.request.build_opener(
        urllib.request.HTTPSHandler(context=context), RejectCredentialRedirects()
    )
    return opener.open(request, timeout=timeout)


def validate_trusted_search_key(key: str) -> None:
    normalized = _validate_key_shape(key)
    endpoint = os.getenv("FACTCHECK_TRUSTED_SEARCH_URL", DEFAULT_ENDPOINT).strip()
    parsed = urlsplit(endpoint)
    loopback_fixture = parsed.scheme == "http" and parsed.hostname in {"127.0.0.1", "::1"}
    if (parsed.scheme != "https" and not loopback_fixture) or not parsed.hostname or parsed.username or parsed.password or parsed.fragment:
        raise ConfigurationError("可信搜索地址必须是无用户凭据的 HTTPS 地址；HTTP 仅供本机测试。")
    payload = {
        "query": "住房公积金管理条例",
        "segmentCount": 1,
        "simplified": True,
        "return_full_content": False,
    }
    request = urllib.request.Request(
        endpoint,
        data=json.dumps(payload, ensure_ascii=False).encode("utf-8"),
        method="POST",
        headers={"Content-Type": "application/json", "api-key": normalized},
    )
    try:
        with open_trusted_search(
            request,
            timeout=20,
            context=trusted_search_ssl_context(),
        ) as response:
            raw_bytes = response.read(1024 * 1024 + 1)
            if len(raw_bytes) > 1024 * 1024:
                raise ServiceUnavailableError("可信搜索响应超过大小限制。")
            raw = raw_bytes.decode("utf-8")
            status = response.status
    except urllib.error.HTTPError as exc:
        if exc.code in {401, 403}:
            raise InvalidCredentialError("MaaS 返回的 Key 无效或无可信搜索权限。") from None
        raise ServiceUnavailableError(f"可信搜索服务暂时不可用（HTTP {exc.code}）。") from None
    except (urllib.error.URLError, TimeoutError, OSError, UnicodeError):
        raise ServiceUnavailableError("暂时无法连接可信搜索服务，请检查网络后重试。") from None
    try:
        data = json.loads(raw)
    except json.JSONDecodeError:
        raise ServiceUnavailableError("可信搜索服务返回异常，请稍后重试。") from None
    code = data.get("code") if isinstance(data, dict) else None
    if status != 200 or not isinstance(data, dict):
        raise ServiceUnavailableError("可信搜索服务返回异常，请稍后重试。")
    if code not in (None, 0, 200):
        if code in (401, 403):
            raise InvalidCredentialError("MaaS 返回的 Key 无效或无可信搜索权限。")
        raise ServiceUnavailableError("可信搜索服务返回异常，请稍后重试。")


def validated_trusted_search_key() -> tuple[str, str]:
    for source, key in trusted_search_key_candidates():
        try:
            validate_trusted_search_key(key)
        except ConfigurationError:
            continue
        return key, source
    return "", "missing"


def trusted_search_key_for_execution() -> tuple[str, str, str]:
    transient_candidate: tuple[str, str] | None = None
    for source, key in trusted_search_key_candidates():
        try:
            validate_trusted_search_key(key)
        except ServiceUnavailableError:
            if transient_candidate is None:
                transient_candidate = (source, key)
            continue
        except ConfigurationError:
            continue
        return key, source, "valid"
    if transient_candidate is not None:
        source, key = transient_candidate
        return key, source, "service_unavailable"
    return "", "missing", "missing"


def onboarding_script_candidates() -> list[Path]:
    script_root = Path(__file__).resolve().parent
    skill_root = script_root.parent
    candidates = [
        skill_root
        / "modules"
        / "llm-answer-reference-compare"
        / "assets"
        / "tool"
        / "dist"
        / "trusted-search-onboarding.js",
        skill_root.parent
        / "llm-answer-reference-compare"
        / "assets"
        / "tool"
        / "dist"
        / "trusted-search-onboarding.js",
    ]
    selected_root = os.getenv("FACTCHECK_SKILLS_DIR", "").strip()
    if selected_root:
        candidates.insert(0, Path(selected_root).expanduser() / "llm-answer-reference-compare" / "assets" / "tool" / "dist" / "trusted-search-onboarding.js")
    output = []
    for candidate in candidates:
        resolved = candidate.resolve()
        if resolved not in output:
            output.append(resolved)
    return output


def locate_onboarding_script() -> Path:
    for candidate in onboarding_script_candidates():
        if candidate.is_file():
            return candidate
    searched = "、".join(str(path) for path in onboarding_script_candidates())
    raise ConfigurationError(f"未找到可信搜索自动配置组件；已检查：{searched}")


def run_onboarding(*, force: bool = False) -> dict:
    script = locate_onboarding_script()
    command = [
        "node",
        str(script),
        "--credential-file",
        str(credential_path()),
        "--provider-url",
        PROVIDER_URL,
    ]
    if force:
        command.append("--force")
    process = subprocess.run(
        command,
        text=True,
        capture_output=True,
        check=False,
        env=os.environ.copy(),
    )
    lines = [line for line in process.stdout.splitlines() if line.strip()]
    result = {}
    if lines:
        try:
            result = json.loads(lines[-1])
        except json.JSONDecodeError:
            result = {}
    if process.returncode or result.get("status") not in {
        "configured",
        "already_configured",
    }:
        message = str(result.get("error") or "").strip()
        if not message:
            message = "可信搜索自动配置未完成，请保持浏览器打开并完成登录。"
        raise ConfigurationError(message)
    key = load_trusted_search_key()
    if not key:
        raise ConfigurationError("自动配置未保存有效 Key。")
    validate_trusted_search_key(key)
    return {
        "status": result["status"],
        "providerUrl": PROVIDER_URL,
        "validated": True,
        "source": str(result.get("source") or "maas_console"),
        "created": bool(result.get("created")),
        "message": (
            "检测到已有有效配置，已跳过 MaaS 登录。"
            if result["status"] == "already_configured"
            else "MaaS 登录与可信搜索配置已完成，流水线可以自动继续。"
        ),
    }


def configure() -> dict:
    source, validation = trusted_search_config_status()
    if source != "missing":
        return {
            "status": "already_configured",
            "providerUrl": PROVIDER_URL,
            "validated": validation == "valid",
            "validation": validation,
            "source": source,
            "created": False,
            "message": (
                "检测到已有有效可信搜索配置，已跳过 MaaS 登录。"
                if validation == "valid"
                else "检测到已有可信搜索配置；服务暂时不可达，已保留配置且不会要求重复登录。"
            ),
        }
    return run_onboarding(force=True)


def parser() -> argparse.ArgumentParser:
    root = argparse.ArgumentParser(description="Fact-Check-X 可信搜索跨载体自动配置。")
    commands = root.add_subparsers(dest="command", required=True)
    commands.add_parser("configure", help="登录 MaaS 后自动获取或创建 Key 并完成配置")
    commands.add_parser("status", help="检查共享配置，不显示 Key")
    commands.add_parser("clear", help="清除本机共享的可信搜索 Key")
    return root


def main() -> int:
    args = parser().parse_args()
    try:
        if args.command == "configure":
            emit_public_json(configure())
            return 0
        if args.command == "clear":
            emit_public_json({
                "status": "cleared",
                "removed": clear_trusted_search_key(),
            })
            return 0
        configured = is_trusted_search_configured()
        emit_public_json({
            "status": "configured" if configured else "configuration_required",
            "configured": configured,
            "source": key_source(),
            "providerUrl": PROVIDER_URL,
        })
        return 0 if configured else 3
    except (ConfigurationError, OSError) as exc:
        emit_public_json({
            "status": "failed",
            "error": str(exc),
            "providerUrl": PROVIDER_URL,
        })
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
